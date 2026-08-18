/**
 * FormEncryptionManager - Client-side encryption for form fields (jQuery version)
 * Integrates with existing jQuery form handling and EncryptionManager for secure user data handling
 * 
 * Security Model:
 * - Client-side only decryption for user data
 * - Dual encryption: user key + admin key
 * - Web Crypto API with non-extractable keys where possible
 * - Memory-only key storage with auto-clear
 * 
 */
window.FormEncryptionManager = (function($) {
    'use strict';
    
    
    // Private variables for secure key storage
    let userPrivateKey = null;
    let userPublicKey = null;
    let derivedUserKey = null;
    let isUserKeyLoaded = false;
    let autoLockTimer = null;
    let passwordPromptModal = null;
    let isInitialized = false;
    
    // Configuration
    const CONFIG = {
        AUTO_LOCK_MINUTES: 15,
        DEBOUNCE_DELAY_MS: 500,
        ENCRYPTION_INDICATOR: '',
        MAX_RETRY_ATTEMPTS: 3
    };
    
    // Field detection selectors
    const SELECTORS = {
        ENCRYPTED_FIELDS: '[data-encrypted="true"], .encrypted-field',
        ENCRYPTED_DISPLAY_ELEMENTS: '[data-encrypted="true"]:not(input):not(textarea):not(select)',
        FORM_CONTAINERS: '.form:not(.accessible-mode .form), .formUsedInCheckout',
        PASSWORD_PROMPT: '#encryption-password-prompt',
        LOADING_OVERLAY: '#encryption-loading'
    };
    
    /**
     * Initialize FormEncryptionManager
     */
    function init() {
        // Prevent duplicate initialization
        if (isInitialized) {
            return true;
        }
        
        if (typeof window.EncryptionManager === 'undefined') {
            console.warn('FormEncryptionManager: Base EncryptionManager not available');
            return false;
        }
        
        // Use jQuery ready for DOM initialization
        $(document).ready(function() {
            initializeFormEncryption();
        });
        
        return true;
    }
    
    /**
     * Initialize form encryption after DOM is ready
     */
    function initializeFormEncryption() {
        if (isInitialized) {
            return;
        }
        
        detectEncryptedFields();
        setupFormEventListeners();
        setupEncryptedFileClickHandlers();
        setupEncryptedFileDownloadHandlers();
        setupClearFileHandlers();
        createPasswordPromptModal();
        setupAutoLock();
        
        isInitialized = true;
    }
    
    /**
     * Detect and mark encrypted fields in forms
     */
    function detectEncryptedFields() {
        const $encryptedFields = $(SELECTORS.ENCRYPTED_FIELDS);
        const $encryptedDisplayElements = $(SELECTORS.ENCRYPTED_DISPLAY_ELEMENTS);
        
        if ($encryptedFields.length === 0 && $encryptedDisplayElements.length === 0) {
            return; // No encrypted fields found
        }
        
        // Collect fields that need decryption
        const fieldsNeedingDecryption = [];
        const displayElementsNeedingDecryption = [];
        
        $encryptedFields.each(function() {
            const field = this;
            markFieldAsEncrypted($(field));
            
            // If field has data-encrypted="true" and a value, collect it for decryption
            if (field.value && field.value.trim() !== '') {
                fieldsNeedingDecryption.push(field);
            }
        });
        
        $encryptedDisplayElements.each(function() {
            const element = this;
            markDisplayElementAsEncrypted($(element));
            
            // If element has data-encrypted="true" and encrypted value, collect it for decryption
            // Note: File elements need their metadata parsed to show file info, even though they're not "decrypted"
            if (element.dataset.encryptedValue && element.dataset.encryptedValue.trim() !== '') {
                displayElementsNeedingDecryption.push(element);
            }
        });
        
        // If we have fields or elements needing decryption, prompt for password once and decrypt all
        if (fieldsNeedingDecryption.length > 0 || displayElementsNeedingDecryption.length > 0) {
            decryptAllFieldsAndElements([...fieldsNeedingDecryption, ...displayElementsNeedingDecryption]);
        }
    }
    
    /**
     * Decrypt all fields and display elements that need decryption (prompts for password once)
     */
    async function decryptAllFieldsAndElements(items) {
        try {
            // Ensure user key is available (this will prompt for password if needed)
            if (!isUserKeyLoaded) {
                const success = await promptForUserPassword();
                if (!success) {
                    return; // User cancelled
                }
            }
            
            // Decrypt each item (field or display element)
            for (const item of items) {
                if (item.value !== undefined) {
                    // This is a form field
                    await attemptFieldDecryption(item);
                } else {
                    // This is a display element
                    await attemptDisplayElementDecryption(item);
                }
            }
            
        } catch (error) {
            console.error('FormEncryptionManager: Failed to decrypt fields:', error);
        }
    }
    
    /**
     * Decrypt all fields that need decryption (prompts for password once)
     */
    async function decryptAllFields(fields) {
        try {
            // Ensure user key is available (this will prompt for password if needed)
            if (!isUserKeyLoaded) {
                const success = await promptForUserPassword();
                if (!success) {
                    return; // User cancelled
                }
            }
            
            // Decrypt each field
            for (const field of fields) {
                await attemptFieldDecryption(field);
            }
            
        } catch (error) {
            console.error('FormEncryptionManager: Failed to decrypt fields:', error);
        }
    }
    
    /**
     * Mark a field as encrypted with visual indicators (jQuery version)
     */
    function markFieldAsEncrypted($field) {
        const field = $field[0]; // Get DOM element from jQuery object
        
        // Add CSS classes for styling
        $field.addClass('encrypted-field needs-decryption');
        
        // Add visual indicator
        const $indicator = $('<span class="encryption-indicator" title="This field is encrypted">' + CONFIG.ENCRYPTION_INDICATOR + '</span>');
        
        // Insert indicator after the field
        $field.after($indicator);
        
        // Add event listeners for encryption on change (jQuery style)
        $field.on('input', debounce(function(e) {
            handleFieldChange(e);
        }, CONFIG.DEBOUNCE_DELAY_MS));
        
        $field.on('blur', function(e) {
            handleFieldBlur(e);
        });
    }
    
    /**
     * Mark a display element as encrypted with visual indicators (jQuery version)
     */
    function markDisplayElementAsEncrypted($element) {
        // Add CSS classes for styling
        $element.addClass('encrypted-display-element needs-decryption');
        
        // Add visual indicator
        const $indicator = $('<span class="encryption-indicator" title="This content is encrypted">' + CONFIG.ENCRYPTION_INDICATOR + '</span>');
        
        // Insert indicator after the element
        $element.after($indicator);
    }
    
    /**
     * Attempt to decrypt a field's value (assumes user key is already loaded)
     */
    async function attemptFieldDecryption(field) {
        const $field = $(field);
        
        if (!field.value || field.value.trim() === '' || !isUserKeyLoaded) {
            return;
        }
        
        // Store the encrypted value before attempting decryption
        const encryptedValue = field.value;
        
        try {
            // Decrypt the field value using hybrid decryption (RSA + AES)
            const decryptedValue = await decryptHybridWithUserKey(encryptedValue, userPrivateKey);
            
            // Set the decrypted value
            field.value = decryptedValue;
            $field.removeClass('needs-decryption').addClass('decrypted');
            
            // Store the original encrypted value for potential re-encryption
            $field.data('originalEncryptedValue', encryptedValue);
            
            // Call postDecryptHook if it exists
            if (typeof window.postDecryptHook === 'function') {
                try {
                    await window.postDecryptHook(field, decryptedValue, encryptedValue);
                } catch (error) {
                    console.error('postDecryptHook error:', error);
                }
            }
            
        } catch (error) {
            console.error(`Failed to decrypt field ${field.name}:`, error);
            showFieldError($field, 'Failed to decrypt field. Please check your password.');
        }
    }
    
    /**
     * Attempt to decrypt a display element's value (assumes user key is already loaded)
     */
    async function attemptDisplayElementDecryption(element) {
        const $element = $(element);
        
        if (!element.dataset.encryptedValue || element.dataset.encryptedValue.trim() === '' || !isUserKeyLoaded) {
            return;
        }
        
        // Store the encrypted value before attempting decryption
        const encryptedValue = element.dataset.encryptedValue;
        const fieldType = element.dataset.fieldType || 'text';
        
        try {
            // Handle file fields specially - they store metadata, not encrypted content
            if (fieldType === 'file') {
                // For file fields, parse the metadata directly (it's not encrypted)
                let fileInfo;
                try {
                    // Decode HTML entities if present
                    let jsonString = encryptedValue;
                    if (jsonString.includes('&quot;') || jsonString.includes('&amp;') || jsonString.includes('&lt;') || jsonString.includes('&gt;')) {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = jsonString;
                        jsonString = tempDiv.textContent || tempDiv.innerText || '';
                    }
                    fileInfo = JSON.parse(jsonString);
                } catch (e) {
                    console.error('Failed to parse file metadata:', encryptedValue, e);
                    throw new Error('Invalid file metadata format');
                }
                
                if (fileInfo.filename || fileInfo.originalFilename) {
                    const filename = fileInfo.originalFilename || fileInfo.filename;
                    const isImage = fileInfo.isImage || false;
                    const fileIcon = isImage ? '🖼️' : '📄';
                    
                    const fieldId = $element.attr('data-field-id');
                    const userId = $element.attr('data-user-id');
                    $element.html(`<div class="file-display encrypted-file" data-field-id="${fieldId}" data-user-id="${userId}">
                        <div class="file-info">
                            <span class="file-icon">${fileIcon}</span>
                            <span class="file-name">${filename}</span>
                        </div>
                        <div class="file-actions">
                            <button type="button" class="encrypted-file-download" data-field-id="${fieldId}" data-filename="${filename}">Download</button>
                            <button type="button" class="clear-existing-file" data-field-id="${fieldId}">Remove</button>
                        </div>
                    </div>`);
                } else {
                    $element.html('Invalid file data');
                }
                
                $element.removeClass('needs-decryption').addClass('decrypted');
                $element.data('originalEncryptedValue', encryptedValue);
                
                // Call postDecryptHook if it exists
                if (typeof window.postDecryptHook === 'function') {
                    try {
                        await window.postDecryptHook(element, fileInfo, encryptedValue);
                    } catch (error) {
                        console.error('postDecryptHook error:', error);
                    }
                }
                
                return; // Exit early for file fields
            }
            
            // Decrypt the element value using hybrid decryption (RSA + AES) for non-file fields
            const decryptedValue = await decryptHybridWithUserKey(encryptedValue, userPrivateKey);
            
            // Format the decrypted value based on field type
            let displayValue = decryptedValue;
            
            if (fieldType === 'checkbox') {
                displayValue = decryptedValue ? 'Yes' : 'No';
            } else if (fieldType === 'textarea') {
                // For textarea fields, preserve line breaks
                displayValue = decryptedValue.replace(/\n/g, '<br>');
            }
            
            // Set the decrypted value as HTML content
            $element.html(displayValue || 'Not specified');
            $element.removeClass('needs-decryption').addClass('decrypted');
            
            // Store the original encrypted value for reference
            $element.data('originalEncryptedValue', encryptedValue);
            
            // Call postDecryptHook if it exists
            if (typeof window.postDecryptHook === 'function') {
                try {
                    await window.postDecryptHook(element, decryptedValue, encryptedValue);
                } catch (error) {
                    console.error('postDecryptHook error:', error);
                }
            }
            
        } catch (error) {
            console.error(`Failed to decrypt display element:`, error);
            $element.html('[Decryption Failed]').addClass('decryption-failed');
        }
    }
    
    /**
     * Handle field value changes for encryption
     */
    async function handleFieldChange(event) {
        const $field = $(event.target);
        const field = event.target;
        
        if (!$field.hasClass('encrypted-field')) {
            return;
        }
        
        // Only encrypt if the field has a value and user key is loaded
        if (field.value && isUserKeyLoaded) {
            await encryptFieldValue($field);
        }
    }
    
    /**
     * Handle field blur for final encryption
     */
    async function handleFieldBlur(event) {
        const $field = $(event.target);
        const field = event.target;
        
        if (!$field.hasClass('encrypted-field') || !field.value) {
            return;
        }
        
        // Ensure user key is available
        if (!isUserKeyLoaded) {
            await promptForUserPassword();
        }
        
        if (isUserKeyLoaded) {
            await encryptFieldValue($field);
        }
    }
    
    /**
     * Encrypt a field's value with dual encryption
     */
    async function encryptFieldValue($field) {
        const field = $field[0];
        
        if (!field.value || !isUserKeyLoaded) {
            return;
        }
        
        try {
            showFieldLoading($field, true);
            
            const plaintext = field.value;
            
            // Encrypt for user access
            const userEncrypted = await window.EncryptionManager.encryptForUser(
                plaintext,
                await exportUserPublicKey()
            );
            
            // Encrypt for admin access
            const adminEncrypted = await window.EncryptionManager.encryptForAdmin(plaintext);
            
            // Store both encrypted versions
            $field.data('userEncrypted', userEncrypted);
            $field.data('adminEncrypted', adminEncrypted);
            
            // Mark as encrypted but keep plaintext for user interaction
            $field.addClass('encrypted').removeClass('needs-encryption');
            
            showFieldLoading($field, false);
            
        } catch (error) {
            console.error('Failed to encrypt field:', error);
            showFieldError($field, 'Failed to encrypt field data.');
            showFieldLoading($field, false);
        }
    }
    
    /**
     * Setup form event listeners for submission handling (jQuery version)
     */
    function setupFormEventListeners() {
        console.log('FormEncryptionManager: Setting up form event listeners');
        
        // Note: Form encryption is now handled directly in core.js
        // This avoids conflicts with the autosave system
        console.log('FormEncryptionManager: Form encryption now handled by core.js');
    }
    
    /**
     * Setup click handlers for encrypted file elements
     */
    function setupEncryptedFileClickHandlers() {
        // Use event delegation to handle encrypted file clicks across all widgets
        $(document).on('click', '.encrypted-file, [data-field-type="file"][data-encrypted="true"]', async function(e) {
            e.preventDefault();
            
            // Find the parent element with the encrypted data
            const $encryptedContainer = $(this).closest('[data-encrypted="true"]');
            if ($encryptedContainer.length === 0) {
                console.error('Could not find encrypted data container');
                return;
            }
            
            const encryptedValue = $encryptedContainer.attr('data-encrypted-value');
            if (!encryptedValue) {
                console.error('No encrypted value found');
                return;
            }
            
            // Parse the file metadata from the JSON value first
            let fileInfo;
            try {
                // Decode HTML entities if present
                let jsonString = encryptedValue;
                if (jsonString.includes('&quot;') || jsonString.includes('&amp;') || jsonString.includes('&lt;') || jsonString.includes('&gt;')) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = jsonString;
                    jsonString = tempDiv.textContent || tempDiv.innerText || '';
                }
                fileInfo = JSON.parse(jsonString);
            } catch (e) {
                console.error('Failed to parse file metadata:', encryptedValue, e);
                alert('Error reading file information');
                return;
            }
            
            if (!fileInfo.filename) {
                console.error('No filename found in file metadata');
                alert('Invalid file data');
                return;
            }
            
            // Show loading state
            const $this = $(this);
            const originalText = $this.text();
            $this.css({'opacity': '0.6', 'pointer-events': 'none'});
            const $statusEl = $this.find('.file-status');
            if ($statusEl.length) $statusEl.text('Decrypting...');
            
            try {
                // Get required data from the container
                const fieldId = $encryptedContainer.attr('data-field-id');
                const userId = $encryptedContainer.attr('data-user-id');
                
                if (!fieldId || !userId) {
                    throw new Error(`Missing field ID or user ID for encrypted file download. Field ID: '${fieldId}', User ID: '${userId}'`);
                }
                
                // Call our frontend encrypted file download endpoint
                const response = await fetch('/actions/EncryptedFileDownload/?f=' + 
                    encodeURIComponent(fileInfo.filename) + '&field=' + fieldId + '&u=' + userId);
                
                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || 'Failed to retrieve encrypted file');
                }
                
                // Check if FormEncryptionManager is available for decryption
                if (!window.FormEncryptionManager || typeof window.FormEncryptionManager.decryptFileData !== 'function') {
                    throw new Error('File decryption system not available');
                }
                
                // Decrypt the file data using FormEncryptionManager
                const decryptedData = await window.FormEncryptionManager.decryptFileData(data.userEncrypted);
                
                // Create blob and download
                const byteCharacters = atob(decryptedData);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: data.fileType });
                
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = data.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
            } catch (error) {
                console.error('Failed to decrypt file:', error);
                alert('Failed to decrypt file. Please ensure you are logged in and try again.');
            } finally {
                // Restore original state
                $this.css({'opacity': '', 'pointer-events': ''});
                const $statusEl = $this.find('.file-status');
                if ($statusEl.length) $statusEl.text('');
            }
        });
    }
    
    /**
     * Setup click handlers for downloading encrypted files
     */
    function setupEncryptedFileDownloadHandlers() {
        // Use event delegation to handle encrypted file download buttons
        $(document).on('click', '.encrypted-file-download', function(e) {
            e.preventDefault();
            
            const $button = $(this);
            const fieldId = $button.attr('data-field-id');
            const filename = $button.attr('data-filename');
            
            if (!fieldId || !filename) {
                console.error('Missing field ID or filename for encrypted file download');
                return;
            }
            
            // Get the encrypted file display element to extract metadata
            const $displayElement = $button.closest('.existing-file-display');
            if (!$displayElement.length) {
                console.error('Could not find encrypted file display element');
                return;
            }
            
            // Trigger the encrypted file click handler to download
            $displayElement.click();
        });
    }
    
    /**
     * Setup click handlers for clearing existing files
     */
    function setupClearFileHandlers() {
        // Use event delegation to handle clear file buttons
        $(document).on('click', '.clear-existing-file', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Prevent encrypted file click handler from triggering
            
            const $button = $(this);
            const fieldId = $button.attr('data-field-id');
            
            console.log('FormEncryptionManager: Remove button clicked, fieldId:', fieldId);
            
            if (!fieldId) {
                console.error('No field ID found for clear button');
                return;
            }
            
            // Confirm with user
            if (!confirm('Are you sure you want to remove this file? This action cannot be undone.')) {
                return;
            }
            
            // Find the display container and hide it
            const $displayContainer = $button.closest('.existing-file-display');
            if ($displayContainer.length) {
                $displayContainer.hide();
            }
            
            // Find the file input - fieldId might be database ID, but file input uses UUID name
            // First try direct match
            let $fileInput = $(`input[type="file"][name="${fieldId}"]`);
            
            // If not found, look for file inputs near the display container
            if ($fileInput.length === 0) {
                const $displayContainer = $button.closest('.existing-file-display');
                const $inputWrapper = $displayContainer.closest('.input-wrapper');
                $fileInput = $inputWrapper.find('input[type="file"]');
                console.log('FormEncryptionManager: Found file input by wrapper search:', $fileInput.length);
            }
            
            console.log('FormEncryptionManager: Found file input for clearing:', $fileInput.length, 'Field ID:', fieldId);
            if ($fileInput.length > 0) {
                console.log('FormEncryptionManager: File input name attribute:', $fileInput.attr('name'));
            }
            if ($fileInput.length) {
                $fileInput.attr('data-file-cleared', 'true');
                console.log('FormEncryptionManager: Set data-file-cleared attribute to:', $fileInput.attr('data-file-cleared'));
                $fileInput.closest('.inputFile, .form-field').show();
                $fileInput.prop('disabled', false).show();
                
                // Store the actual file input name for later reference
                const actualFieldName = $fileInput.attr('name');
                
                // Trigger autosave after a short delay to let the UI update
                setTimeout(function() {
                    const $form = $button.closest('form');
                    if ($form.length) {
                        // Re-find the file input using the actual name
                        const $currentFileInput = $(`input[type="file"][name="${actualFieldName}"]`);
                        console.log('FormEncryptionManager: Triggering autosave after file removal');
                        console.log('FormEncryptionManager: File input cleared status:', $currentFileInput.attr('data-file-cleared'));
                        console.log('FormEncryptionManager: Looking for file input with name:', actualFieldName);
                        
                        // Disable success messages during this autosave
                        const $successEl = $form.find('#success');
                        if ($successEl.length) {
                            $successEl.hide();
                        }
                        
                        // Trigger autosave by simulating a field change event (same way normal autosave works)
                        console.log('FormEncryptionManager: Triggering autosave by simulating field change');
                        $currentFileInput.trigger('change');
                    }
                }, 100);
            } else {
                console.error('FormEncryptionManager: Could not find file input with name:', fieldId);
            }
        });
    }
    
    /**
     * Process encrypted fields by modifying the actual form (not formData)
     */
    async function processEncryptedFieldsForForm($fields, $form) {
        console.log('FormEncryptionManager: processEncryptedFieldsForForm called with', $fields.length, 'fields');
        
        // Track file inputs for restoration
        const clearedFields = [];
        
        for (let i = 0; i < $fields.length; i++) {
            const $field = $fields.eq(i);
            const field = $field[0];
            const fieldName = $field.attr('name');
            let plaintext = field.value;
            let fileMetadata = null;
            
            // Handle file inputs specially
            if (field.type === 'file') {
                if (!field.files || field.files.length === 0) {
                    // Check if this field was explicitly cleared by the user
                    const wasCleared = $field.attr('data-file-cleared') === 'true';
                    const isAutosave = $form.find('.autosavingFlag').length > 0;
                    
                    console.log(`FormEncryptionManager: Empty file field ${fieldName} - cleared: ${wasCleared}, autosave: ${isAutosave}`);
                    
                    if (isAutosave && !wasCleared) {
                        console.log('FormEncryptionManager: Sending preservation marker for empty file field during autosave:', fieldName);
                        // Replace the file input with hidden input containing preservation marker
                        const $hiddenPreservation = $('<input type="hidden" />').attr('name', fieldName).val('__PRESERVE_EXISTING_FILE__');
                        
                        // Store original field for restoration after autosave
                        const originalField = $field.clone(true, true);
                        $hiddenPreservation.data('originalFileField', originalField);
                        $hiddenPreservation.addClass('file-preservation-marker');
                        
                        $field.after($hiddenPreservation);
                        $field.remove();
                    } else {
                        console.log('FormEncryptionManager: Allowing empty file field (will clear existing):', fieldName, wasCleared ? '(explicitly cleared)' : '(normal submit)');
                        // For non-autosave or explicitly cleared files, let empty field go through normally (clears existing file)
                    }
                    console.log('FormEncryptionManager: CONTINUING - skipping encryption for empty field:', fieldName);
                    continue;
                }
                
                const file = field.files[0];
                console.log(`FormEncryptionManager: Processing file ${fieldName}: ${file.name}, size: ${file.size}`);
                
                // Read file as ArrayBuffer
                const fileData = await file.arrayBuffer();
                console.log(`FormEncryptionManager: File ${fieldName}: ArrayBuffer length: ${fileData.byteLength}`);
                
                // Convert to base64 for encryption
                const uint8Array = new Uint8Array(fileData);
                let binary = '';
                for (let j = 0; j < uint8Array.length; j++) {
                    binary += String.fromCharCode(uint8Array[j]);
                }
                plaintext = btoa(binary);
                console.log(`FormEncryptionManager: File ${fieldName}: Base64 length: ${plaintext.length}`);
                
                // Store file metadata
                fileMetadata = {
                    filename: file.name,
                    originalFilename: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    isImage: file.type.startsWith('image/'),
                    isEncrypted: true
                };
            } else {
                console.log('FormEncryptionManager: Processing field', fieldName, 'with value:', plaintext);
                
                if (!plaintext) {
                    console.log('FormEncryptionManager: Skipping empty field:', fieldName);
                    continue;
                }
            }
            
            // Encrypt for user access
            console.log('FormEncryptionManager: About to encrypt field:', fieldName, 'Type:', field.type);
            console.log('FormEncryptionManager: Encrypting for user...');
            const userEncrypted = await window.EncryptionManager.encryptForUser(plaintext, await exportUserPublicKey());
            
            // Encrypt for admin access
            console.log('FormEncryptionManager: Encrypting for admin...');
            const adminEncrypted = await window.EncryptionManager.encryptForAdmin(plaintext);
            
            console.log('FormEncryptionManager: Encryption complete. User:', userEncrypted.substring(0, 50) + '...', 'Admin:', adminEncrypted.substring(0, 50) + '...');
            
            // Add hidden fields to the form
            $form.append($('<input type="hidden" name="' + fieldName + '_user_encrypted" />').val(userEncrypted));
            $form.append($('<input type="hidden" name="' + fieldName + '_admin_encrypted" />').val(adminEncrypted));
            $form.append($('<input type="hidden" name="' + fieldName + '_is_encrypted" />').val('1'));
            
            console.log('FormEncryptionManager: Added encrypted hidden fields for:', fieldName);
            
            // Handle file-specific fields
            if (field.type === 'file' && fileMetadata) {
                console.log(`FormEncryptionManager: Adding file metadata for field ${fieldName}`);
                
                // Add file metadata
                $form.append($('<input type="hidden" name="' + fieldName + '_file_metadata" />').val(JSON.stringify(fileMetadata)));
                
                // Replace file input with hidden input containing JSON metadata
                const $hiddenReplacement = $('<input type="hidden" />').attr('name', fieldName).val(JSON.stringify(fileMetadata));
                
                // Clone and store original file input
                const $originalInput = $field.clone(true);
                $originalInput.hide().attr('id', ($originalInput.attr('id') || fieldName) + '_stored');
                $('body').append($originalInput);
                
                // Replace file input with hidden input
                $field.replaceWith($hiddenReplacement);
                
                console.log(`FormEncryptionManager: Replaced file input with hidden input for ${fieldName}`);
                
                clearedFields.push({ 
                    input: $hiddenReplacement, 
                    originalInput: $originalInput,
                    originalValue: '', 
                    isFileInput: true 
                });
            } else {
                // Clear the original field value and store for restoration
                const isAutosave = $form.find('.autosavingFlag').length > 0;
                console.log('FormEncryptionManager: Is autosave?', isAutosave);
                
                if (isAutosave) {
                    $field.data('originalValue', plaintext);
                    field.value = '';
                    
                    // Restore value after a short delay
                    setTimeout(function() {
                        const originalValue = $field.data('originalValue');
                        if (originalValue !== undefined) {
                            console.log('FormEncryptionManager: Restoring field value for:', fieldName);
                            $field.val(originalValue);
                            $field.removeData('originalValue');
                            $form.removeData('encryption-processed'); // Allow re-processing
                        }
                    }, 200);
                } else {
                    field.value = '';
                    field.disabled = true;
                }
            }
        }
        
        // Restore file inputs after form submission
        if (clearedFields.length > 0) {
            const isAutosave = $form.find('.autosavingFlag').length > 0;
            if (isAutosave) {
                setTimeout(function() {
                    restoreFileInputs(clearedFields);
                }, 200);
            }
        }
        
        console.log('FormEncryptionManager: processEncryptedFieldsForForm complete');
    }
    
    /**
     * Restore file inputs after encryption
     */
    function restoreFileInputs(clearedFields) {
        clearedFields.forEach(function(item) {
            if (item.isFileInput && item.originalInput) {
                try {
                    const $hiddenReplacement = item.input;
                    const $originalInput = item.originalInput;
                    
                    // Restore original file input
                    $hiddenReplacement.replaceWith($originalInput);
                    
                    // Remove from body if still there
                    if ($originalInput.parent().is('body')) {
                        $originalInput.detach();
                    }
                    
                    // Restore original styling
                    $originalInput.show();
                    const originalId = $originalInput.attr('id');
                    if (originalId && originalId.includes('_stored')) {
                        $originalInput.attr('id', originalId.replace('_stored', ''));
                    }
                    
                    console.log(`FormEncryptionManager: Restored original file input: ${$originalInput.attr('name')}`);
                } catch (restoreError) {
                    console.error(`FormEncryptionManager: Error restoring file input:`, restoreError);
                }
            }
        });
    }

    /**
     * Process encrypted fields for AJAX submission by modifying formData array
     */
    async function processEncryptedFieldsForAjax($fields, formData, $form) {
        console.log('FormEncryptionManager: processEncryptedFieldsForAjax called with', $fields.length, 'fields');
        
        for (let i = 0; i < $fields.length; i++) {
            const $field = $fields.eq(i);
            const field = $field[0];
            const fieldName = $field.attr('name');
            const plaintext = field.value;
            
            console.log('FormEncryptionManager: Processing field', fieldName, 'with value:', plaintext);
            
            if (!plaintext) {
                console.log('FormEncryptionManager: Skipping empty field:', fieldName);
                continue;
            }
            
            // Encrypt for user access
            console.log('FormEncryptionManager: Encrypting for user...');
            const userEncrypted = await window.EncryptionManager.encryptForUser(plaintext, await exportUserPublicKey());
            
            // Encrypt for admin access
            console.log('FormEncryptionManager: Encrypting for admin...');
            const adminEncrypted = await window.EncryptionManager.encryptForAdmin(plaintext);
            
            console.log('FormEncryptionManager: Encryption complete. User:', userEncrypted.substring(0, 50) + '...', 'Admin:', adminEncrypted.substring(0, 50) + '...');
            
            // Find and remove the original field data from formData
            let removedCount = 0;
            for (let j = formData.length - 1; j >= 0; j--) {
                if (formData[j].name === fieldName) {
                    console.log('FormEncryptionManager: Removing original field data for:', fieldName);
                    formData.splice(j, 1);
                    removedCount++;
                }
            }
            console.log('FormEncryptionManager: Removed', removedCount, 'original field entries');
            
            // Add encrypted data to formData
            formData.push({
                name: fieldName + '_user_encrypted',
                value: userEncrypted
            });
            
            formData.push({
                name: fieldName + '_admin_encrypted',
                value: adminEncrypted
            });
            
            formData.push({
                name: fieldName + '_is_encrypted',
                value: '1'
            });
            
            // Also add hidden fields to the actual form as backup
            // in case jQuery Form plugin re-serializes the form
            $form.append($('<input type="hidden" name="' + fieldName + '_user_encrypted" />').val(userEncrypted));
            $form.append($('<input type="hidden" name="' + fieldName + '_admin_encrypted" />').val(adminEncrypted));
            $form.append($('<input type="hidden" name="' + fieldName + '_is_encrypted" />').val('1'));
            
            console.log('FormEncryptionManager: Added encrypted data fields for:', fieldName);
            
            // Clear the field value temporarily for autosave restoration
            const isAutosave = $form.find('.autosavingFlag').length > 0;
            console.log('FormEncryptionManager: Is autosave?', isAutosave);
            
            if (isAutosave) {
                $field.data('originalValue', plaintext);
                field.value = '';
                
                // Restore value after submission
                setTimeout(function() {
                    const originalValue = $field.data('originalValue');
                    if (originalValue !== undefined) {
                        console.log('FormEncryptionManager: Restoring field value for:', fieldName);
                        $field.val(originalValue);
                        $field.removeData('originalValue');
                    }
                }, 100);
            } else {
                field.value = '';
                field.disabled = true;
            }
        }
        
        console.log('FormEncryptionManager: processEncryptedFieldsForAjax complete');
    }
    
    /**
     * Prompt user for password to unlock encryption keys (jQuery version)
     */
    async function promptForUserPassword() {
        return new Promise((resolve) => {
            if (!passwordPromptModal) {
                createPasswordPromptModal();
            }
            
            const $modal = $(passwordPromptModal);
            const $passwordInput = $modal.find('#encryption-password');
            const $submitBtn = $modal.find('#encryption-password-submit');
            const $cancelBtn = $modal.find('#encryption-password-cancel');
            const $errorDiv = $modal.find('#encryption-password-error');
            
            // Clear previous state
            $passwordInput.val('');
            $errorDiv.hide();
            
            // Show modal with flex display for centering
            $modal.css('display', 'flex');
            $passwordInput.focus();
            
            // Handle submit
            const handleSubmit = async () => {
                const password = $passwordInput.val();
                if (!password) return;
                
                try {
                    $submitBtn.prop('disabled', true).text('Unlocking...');
                    
                    const success = await loadUserKeys(password);
                    if (success) {
                        $modal.css('display', 'none');
                        resolve(true);
                    } else {
                        $errorDiv.text('Invalid password. Please try again.').show();
                        $passwordInput.select();
                    }
                } catch (error) {
                    $errorDiv.text('Failed to unlock encryption keys.').show();
                    console.error('Password unlock failed:', error);
                } finally {
                    $submitBtn.prop('disabled', false).text('Unlock');
                }
            };
            
            // Handle cancel
            const handleCancel = () => {
                $modal.css('display', 'none');
                resolve(false);
            };
            
            // Event listeners (jQuery style)
            $submitBtn.off('click').on('click', handleSubmit);
            $cancelBtn.off('click').on('click', handleCancel);
            $passwordInput.off('keypress').on('keypress', function(e) {
                if (e.which === 13) { // Enter key
                    handleSubmit();
                }
            });
        });
    }
    
    /**
     * Load user encryption keys from server
     */
    async function loadUserKeys(password) {
        try {
            // Fetch user's encrypted private key and salt from server
            const response = await fetch('/actions/getUserEncryptionKeys/', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            if (!result.success) {
                // If no keys exist, offer to generate them
                if (result.message && result.message.includes('No encryption keys found')) {
                    const shouldGenerate = confirm(
                        'You don\'t have encryption keys set up yet. Would you like to generate them now? ' +
                        'This will enable secure encryption for your form data.'
                    );
                    if (shouldGenerate) {
                        return await generateUserKeys(password);
                    }
                }
                console.error('Failed to fetch user encryption keys:', result.message);
                return false;
            }
            
            const { encrypted_private_key, public_key, symmetric_key_salt, admin_public_key } = result;
            
            // Derive key from password and decrypt private key
            derivedUserKey = await window.EncryptionManager.precomputeKeyDerivation(password, symmetric_key_salt);
            
            if (!derivedUserKey) {
                return false;
            }
            
            // Decrypt and import private key
            const privateKeyPem = await decryptWithSymmetricKey(encrypted_private_key, derivedUserKey);
            userPrivateKey = privateKeyPem;
            
            // Store the public key as-is
            userPublicKey = public_key;
            
            // Cache both keys in EncryptionManager for autosave use
            if (typeof window.EncryptionManager.setCachedKeys === 'function') {
                window.EncryptionManager.setCachedKeys(public_key, admin_public_key);
            }
            
            isUserKeyLoaded = true;
            setupAutoLock();
            
            return true;
            
        } catch (error) {
            console.error('Failed to load user keys:', error);
            return false;
        }
    }
    
    /**
     * Create password prompt modal (jQuery version)
     */
    function createPasswordPromptModal() {
        const $modal = $(`
            <div id="encryption-password-prompt" class="encryption-modal" style="display: none;">
                <div class="encryption-modal-content">
                    <h3>Unlock Encrypted Fields</h3>
                    <p>Please enter your password to decrypt your form data:</p>
                    <div class="encryption-form-group">
                        <input type="password" id="encryption-password" placeholder="Your password" />
                    </div>
                    <div id="encryption-password-error" class="encryption-error" style="display: none;"></div>
                    <div class="encryption-modal-actions">
                        <button type="button" id="encryption-password-cancel" class="encryption-btn encryption-btn-secondary">Cancel</button>
                        <button type="button" id="encryption-password-submit" class="encryption-btn encryption-btn-primary">Unlock</button>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append($modal);
        passwordPromptModal = $modal[0];
        
        // Add modal styles
        addModalStyles();
    }
    
    /**
     * Add CSS styles for encryption UI
     */
    function addModalStyles() {
        if ($('#encryption-styles').length > 0) {
            return; // Already added
        }
        
        const styles = `
            <style id="encryption-styles">
                .encryption-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                    z-index: 10000;
                    align-items: center;
                    justify-content: center;
                }
                
                .encryption-modal[style*="display: flex"], 
                .encryption-modal[style*="display:flex"] {
                    display: flex !important;
                }
                
                .encryption-modal-content {
                    background: #fff;
                    padding: 2rem;
                    border-radius: 8px;
                    min-width: 400px;
                    max-width: 500px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }
                
                .encryption-modal h3 {
                    margin: 0 0 1rem 0;
                    color: #333;
                }
                
                .encryption-modal p {
                    margin: 0 0 1.5rem 0;
                    color: #666;
                }
                
                .encryption-form-group {
                    margin-bottom: 1rem;
                }
                
                .encryption-form-group input {
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid #ddd;
                    border-radius: 4px;
                    font-size: 1rem;
                    box-sizing: border-box;
                }
                
                .encryption-form-group input:focus {
                    outline: none;
                    border-color: #007cba;
                }
                
                .encryption-error {
                    display: none;
                    color: #d63384;
                    font-size: 0.9rem;
                    margin-bottom: 1rem;
                }
                
                .encryption-modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                }
                
                .encryption-btn {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 1rem;
                }
                
                .encryption-btn-primary {
                    background-color: #007cba;
                    color: white;
                }
                
                .encryption-btn-primary:hover {
                    background-color: #005a87;
                }
                
                .encryption-btn-primary:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
                }
                
                .encryption-btn-secondary {
                    background-color: #6c757d;
                    color: white;
                }
                
                .encryption-btn-secondary:hover {
                    background-color: #545b62;
                }
                
                .encrypted-field {
                    position: relative;
                }
                
                .encryption-indicator {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #007cba;
                    font-size: 1rem;
                    pointer-events: none;
                }
                
                .encrypted-field.needs-decryption {
                    background-color: #fff3cd;
                    border-color: #ffeaa7;
                }
                
                .encrypted-field.decrypted {
                    background-color: #d4edda;
                    border-color: #c3e6cb;
                }
                
                .encrypted-field.encrypted {
                    background-color: #e2f4ff;
                    border-color: #b3d9ff;
                }
                
                .encrypted-display-element {
                    position: relative;
                    padding: 5px;
                    border-radius: 3px;
                }
                
                .encrypted-display-element.needs-decryption {
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    font-style: italic;
                }
                
                .encrypted-display-element.decrypted {
                    background-color: #d4edda;
                    border: 1px solid #c3e6cb;
                    animation: decrypt-success 0.5s ease-out;
                }
                
                .encrypted-display-element.decryption-failed {
                    background-color: #f8d7da;
                    border: 1px solid #f5c6cb;
                    color: #721c24;
                }
                
                @keyframes decrypt-success {
                    0% { background-color: #fff3cd; }
                    100% { background-color: #d4edda; }
                }
                
                .field-loading {
                    opacity: 0.6;
                    pointer-events: none;
                }
            </style>
        `;
        
        $('head').append(styles);
    }
    
    /**
     * Setup auto-lock timer for security
     */
    function setupAutoLock() {
        // Clear existing timer
        if (autoLockTimer) {
            clearTimeout(autoLockTimer);
        }
        
        // Set new timer
        autoLockTimer = setTimeout(() => {
            clearUserKeys();
        }, CONFIG.AUTO_LOCK_MINUTES * 60 * 1000);
    }
    
    /**
     * Clear user keys from memory (jQuery version)
     */
    function clearUserKeys() {
        userPrivateKey = null;
        userPublicKey = null;
        derivedUserKey = null;
        isUserKeyLoaded = false;
        
        if (autoLockTimer) {
            clearTimeout(autoLockTimer);
            autoLockTimer = null;
        }
        
        // Mark all encrypted fields as needing decryption again
        $('.encrypted-field.decrypted').removeClass('decrypted').addClass('needs-decryption');
    }
    
    /**
     * Generate user encryption keys on demand (client-side)
     */
    async function generateUserKeys(password) {
        try {
            // Check if EncryptionManager is available
            if (!window.EncryptionManager || !window.EncryptionManager.generateMasterKeyPair) {
                console.error('EncryptionManager not available for key generation');
                return false;
            }
            
            // Generate RSA key pair client-side
            const keyPair = await window.EncryptionManager.generateMasterKeyPair();
            if (!keyPair || !keyPair.publicKey || !keyPair.privateKey) {
                console.error('Failed to generate RSA key pair');
                return false;
            }
            
            // Generate salt for key derivation
            const salt = window.EncryptionManager.generateSalt();
            
            // Encrypt the private key with the user's password
            const encryptedPrivateKey = await window.EncryptionManager.encryptMasterPrivateKey(
                keyPair.privateKey, 
                password, 
                salt
            );
            
            if (!encryptedPrivateKey) {
                console.error('Failed to encrypt private key');
                return false;
            }
            
            // Send the encrypted keys to the server for storage
            const response = await fetch('/actions/storeUserEncryptionKeys/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    public_key: keyPair.publicKey,
                    encrypted_private_key: encryptedPrivateKey,
                    symmetric_key_salt: salt
                })
            });
            
            const result = await response.json();
            if (result.success) {
                // Try to load keys again after generation
                return await loadUserKeys(password);
            } else {
                console.error('Failed to store user keys:', result.message);
                return false;
            }
        } catch (error) {
            console.error('Error generating user keys:', error);
            return false;
        }
    }
    
    /**
     * Utility functions
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function showFieldLoading($field, isLoading) {
        if (isLoading) {
            $field.addClass('field-loading');
        } else {
            $field.removeClass('field-loading');
        }
    }
    
    function showFieldError($field, message) {
        // Create or update error message
        let $errorDiv = $field.parent().find('.field-encryption-error');
        if ($errorDiv.length === 0) {
            $errorDiv = $('<div class="field-encryption-error encryption-error"></div>');
            $field.parent().append($errorDiv);
        }
        
        $errorDiv.text(message).show();
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            $errorDiv.hide();
        }, 5000);
    }
    
    function showFormError($form, message) {
        // Use existing error display system from jQuery form handling
        const $errorMsg = $form.find('.cf_contains_errors');
        if ($errorMsg.length > 0) {
            $errorMsg.text(message).show();
        } else {
            console.error('Form encryption error:', message);
            alert(message); // Fallback
        }
    }
    
    async function exportUserPrivateKey() {
        return userPrivateKey;
    }
    
    async function exportUserPublicKey() {
        return userPublicKey;
    }
    
    /**
     * Decrypt hybrid encrypted data using user's private key
     * Format: "base64_encrypted_aes_key:base64_encrypted_data"
     */
    async function decryptHybridWithUserKey(hybridData, privateKeyPem) {
        // Split encrypted key and encrypted data
        const parts = hybridData.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid hybrid encrypted data format');
        }
        
        const [encryptedKeyB64, encryptedData] = parts;
        
        // Import the RSA private key
        const privateKey = await importRSAPrivateKey(privateKeyPem);
        
        // Decrypt AES key with RSA
        const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKeyB64);
        const aesKeyBytes = await crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            privateKey,
            encryptedKeyBuffer
        );
        
        // Import AES key
        const aesKey = await crypto.subtle.importKey(
            'raw',
            aesKeyBytes,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );
        
        // Decrypt data with AES
        return await decryptWithSymmetricKey(encryptedData, aesKey);
    }
    
    /**
     * Import RSA private key from PEM format
     */
    async function importRSAPrivateKey(privateKeyPem) {
        try {
            // Handle both PKCS#8 (PRIVATE KEY) and PKCS#1 (RSA PRIVATE KEY) formats
            const pemBody = privateKeyPem
                .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, '')
                .replace(/-----END (RSA )?PRIVATE KEY-----/g, '')
                .replace(/\s/g, '');
            
            const binaryDer = atob(pemBody);
            const keyBuffer = new Uint8Array(binaryDer.length);
            for (let i = 0; i < binaryDer.length; i++) {
                keyBuffer[i] = binaryDer.charCodeAt(i);
            }
            
            return await crypto.subtle.importKey(
                'pkcs8',
                keyBuffer,
                {
                    name: 'RSA-OAEP',
                    hash: 'SHA-256'
                },
                false,
                ['decrypt']
            );
        } catch (error) {
            console.error('Failed to import RSA private key:', error);
            throw error;
        }
    }
    
    async function decryptWithSymmetricKey(encryptedData, key) {
        const combined = new Uint8Array(base64ToArrayBuffer(encryptedData));
        const iv = combined.slice(0, 16); // IV_LENGTH
        const encrypted = combined.slice(16);
        
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encrypted
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }
    
    function base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    /**
     * Decrypt file data using user's private key
     * @param {string} encryptedData - The encrypted file data
     * @returns {Promise<string>} - The decrypted file data as base64
     */
    async function decryptFileData(encryptedData) {
        if (!isUserKeyLoaded || !userPrivateKey) {
            throw new Error('User encryption key not loaded');
        }
        
        return await decryptHybridWithUserKey(encryptedData, userPrivateKey);
    }
    
    // Public API
    return {
        init,
        clearUserKeys,
        isUserKeyLoaded: () => isUserKeyLoaded,
        promptForUserPassword: promptForUserPassword,
        exportUserPublicKey: exportUserPublicKey,
        processEncryptedFieldsForForm: processEncryptedFieldsForForm,
        decryptFileData: decryptFileData,
        
        // Restore file fields after autosave
        restoreFileFieldsAfterAutosave: function() {
            $('.file-preservation-marker').each(function() {
                const $marker = $(this);
                const originalField = $marker.data('originalFileField');
                
                if (originalField) {
                    console.log('FormEncryptionManager: Restoring file field after autosave');
                    $marker.after(originalField);
                    $marker.remove();
                }
            });
        },
        
        // For testing and debugging
        _internal: {
            detectEncryptedFields,
            loadUserKeys
        }
    };
})(jQuery); // Pass jQuery as parameter

// Auto-initialize when loaded (jQuery version)
$(document).ready(function() {
    window.FormEncryptionManager.init();
});