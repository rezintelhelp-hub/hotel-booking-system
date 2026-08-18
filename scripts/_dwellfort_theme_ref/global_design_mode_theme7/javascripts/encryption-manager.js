/**
 * EncryptionManager - Core encryption functionality for front-end
 * Provides client-side encryption/decryption using Web Crypto API
 * 
 * This is the front-end version of the encryption library used by form-encryption.js
 */
window.EncryptionManager = (function() {
    'use strict';
    
    
    // Constants
    const ALGORITHM = {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1])
    };
    
    const AES_ALGORITHM = {
        name: 'AES-GCM',
        length: 256
    };
    
    const IV_LENGTH = 16;
    const SALT_LENGTH = 32;
    const PBKDF2_ITERATIONS = 600000;
    
    /**
     * Generate a random salt for key derivation
     */
    function generateSalt() {
        const salt = new Uint8Array(SALT_LENGTH);
        crypto.getRandomValues(salt);
        return arrayBufferToBase64(salt.buffer);
    }
    
    /**
     * Derive a key from password using PBKDF2
     */
    async function deriveKeyFromPassword(password, salt) {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        const saltBuffer = base64ToArrayBuffer(salt);
        
        // Import password as key material
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );
        
        // Derive AES key from password
        return await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            AES_ALGORITHM,
            true,
            ['encrypt', 'decrypt']
        );
    }
    
    /**
     * Precompute key derivation for performance
     */
    async function precomputeKeyDerivation(password, salt) {
        try {
            const derivedKey = await deriveKeyFromPassword(password, salt);
            return derivedKey;
        } catch (error) {
            console.error('Failed to derive key:', error);
            return null;
        }
    }
    
    /**
     * Generate RSA key pair for user
     */
    async function generateMasterKeyPair() {
        try {
            const keyPair = await crypto.subtle.generateKey(
                ALGORITHM,
                true,
                ['encrypt', 'decrypt']
            );
            
            // Export keys to PEM format
            const publicKey = await exportPublicKey(keyPair.publicKey);
            const privateKey = await exportPrivateKey(keyPair.privateKey);
            
            return {
                publicKey: publicKey,
                privateKey: privateKey
            };
        } catch (error) {
            console.error('Failed to generate key pair:', error);
            return null;
        }
    }
    
    /**
     * Encrypt private key with user's password
     */
    async function encryptMasterPrivateKey(privateKeyPem, password, salt) {
        try {
            const derivedKey = await deriveKeyFromPassword(password, salt);
            const encoder = new TextEncoder();
            const privateKeyData = encoder.encode(privateKeyPem);
            
            // Generate IV
            const iv = new Uint8Array(IV_LENGTH);
            crypto.getRandomValues(iv);
            
            // Encrypt
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                derivedKey,
                privateKeyData
            );
            
            // Combine IV and encrypted data
            const combined = new Uint8Array(IV_LENGTH + encrypted.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encrypted), IV_LENGTH);
            
            return arrayBufferToBase64(combined.buffer);
        } catch (error) {
            console.error('Failed to encrypt private key:', error);
            return null;
        }
    }
    
    /**
     * Decrypt data with symmetric key
     */
    async function decryptWithSymmetricKey(encryptedData, key) {
        try {
            const combined = new Uint8Array(base64ToArrayBuffer(encryptedData));
            const iv = combined.slice(0, IV_LENGTH);
            const encrypted = combined.slice(IV_LENGTH);
            
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );
            
            const decoder = new TextDecoder();
            return decoder.decode(decrypted);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw error;
        }
    }
    
    /**
     * Import a public key from PEM format
     */
    async function importPublicKey(publicKeyPem) {
        try {
            // Clean up the PEM string - handle different line ending formats
            let cleanedPem = publicKeyPem.replace(/\\r\\n/g, '\n').replace(/\\r/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            
            // Clean the PEM key - handle multiple formats (same as admin side)
            const keyData = cleanedPem
                .replace(/-----BEGIN (RSA )?(PRIVATE|PUBLIC) KEY-----/, '')
                .replace(/-----END (RSA )?(PRIVATE|PUBLIC) KEY-----/, '')
                .replace(/\s/g, '');
            
            // Validate base64 data
            if (!keyData || keyData.length === 0) {
                throw new Error('Invalid PEM key: no data after cleaning');
            }
            
            // Check if the base64 string is valid
            try {
                atob(keyData);
            } catch (e) {
                throw new Error('Invalid PEM key: contains invalid base64 characters');
            }
            
            const keyBuffer = base64ToArrayBuffer(keyData);
            
            // Import as SPKI format (works for both RSA PUBLIC KEY and PUBLIC KEY after header removal)
            return await crypto.subtle.importKey(
                'spki',
                keyBuffer,
                ALGORITHM,
                false,
                ['encrypt']
            );
        } catch (error) {
            console.error('importPublicKey error:', error);
            throw error;
        }
    }
    
    /**
     * Encrypt data for user using proper hybrid encryption (RSA + AES)
     */
    async function encryptForUser(plaintext, userPublicKeyPem = null) {
        try {
            // Use provided key or fallback to cached key
            const publicKeyPem = userPublicKeyPem || getCachedUserPublicKey();
            if (!publicKeyPem) {
                console.error('User public key not available');
                throw new Error('User public key not available');
            }
            
            // Generate random AES key
            const aesKey = await crypto.subtle.generateKey(
                AES_ALGORITHM,
                true,
                ['encrypt', 'decrypt']
            );
            
            // Encrypt data with AES
            const encoder = new TextEncoder();
            const data = encoder.encode(plaintext);
            
            const iv = new Uint8Array(IV_LENGTH);
            crypto.getRandomValues(iv);
            
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                aesKey,
                data
            );
            
            // Export the AES key for RSA encryption
            const keyData = await crypto.subtle.exportKey('raw', aesKey);
            
            // Import user's public key
            const userPublicKey = await importPublicKey(publicKeyPem);
            
            // Encrypt the AES key with user's public RSA key
            const encryptedKey = await crypto.subtle.encrypt(
                ALGORITHM,
                userPublicKey,
                keyData
            );
            
            // Combine encrypted key + IV + encrypted data
            const result = {
                key: arrayBufferToBase64(encryptedKey),
                iv: arrayBufferToBase64(iv.buffer),
                data: arrayBufferToBase64(encrypted)
            };
            
            return JSON.stringify(result);
        } catch (error) {
            console.error('Failed to encrypt for user:', error);
            throw error;
        }
    }
    
    /**
     * Decrypt data for user (using symmetric key derived from password)
     */
    async function decryptForUser(encryptedData, derivedKey) {
        try {
            // The encrypted data from the database was encrypted with the user's derived key
            return await decryptWithSymmetricKey(encryptedData, derivedKey);
        } catch (error) {
            console.error('Failed to decrypt for user:', error);
            throw error;
        }
    }
    
    /**
     * Encrypt data for admin access using proper hybrid encryption (RSA + AES)
     */
    async function encryptForAdmin(plaintext) {
        try {
            // Get cached admin/site public key
            const adminPublicKeyPem = getCachedAdminPublicKey();
            if (!adminPublicKeyPem) {
                console.error('Admin public key not available in cache');
                return null;
            }
            
            // Generate random AES key
            const aesKey = await crypto.subtle.generateKey(
                AES_ALGORITHM,
                true,
                ['encrypt', 'decrypt']
            );
            
            // Encrypt data with AES
            const encoder = new TextEncoder();
            const data = encoder.encode(plaintext);
            
            const iv = new Uint8Array(IV_LENGTH);
            crypto.getRandomValues(iv);
            
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                aesKey,
                data
            );
            
            // Export the AES key for RSA encryption
            const keyData = await crypto.subtle.exportKey('raw', aesKey);
            
            // Import admin public key
            const adminPublicKey = await importPublicKey(adminPublicKeyPem);
            
            // Encrypt the AES key with admin's public RSA key
            const encryptedKey = await crypto.subtle.encrypt(
                ALGORITHM,
                adminPublicKey,
                keyData
            );
            
            // Combine encrypted key + IV + encrypted data
            const result = {
                key: arrayBufferToBase64(encryptedKey),
                iv: arrayBufferToBase64(iv.buffer),
                data: arrayBufferToBase64(encrypted)
            };
            
            return JSON.stringify(result);
        } catch (error) {
            console.error('Failed to encrypt for admin:', error);
            return null;
        }
    }
    
    /**
     * Cached encryption keys
     */
    let cachedKeys = {
        userPublicKey: null,
        adminPublicKey: null
    };
    
    /**
     * Set cached encryption keys (called by form encryption when keys are loaded)
     */
    function setCachedKeys(userPublicKey, adminPublicKey) {
        cachedKeys.userPublicKey = userPublicKey;
        cachedKeys.adminPublicKey = adminPublicKey;
    }
    
    /**
     * Get cached admin public key
     */
    function getCachedAdminPublicKey() {
        return cachedKeys.adminPublicKey;
    }
    
    /**
     * Get cached user public key
     */
    function getCachedUserPublicKey() {
        return cachedKeys.userPublicKey;
    }
    
    /**
     * Export public key to PEM format
     */
    async function exportPublicKey(key) {
        const exported = await crypto.subtle.exportKey('spki', key);
        const b64 = arrayBufferToBase64(exported);
        return `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
    }
    
    /**
     * Export private key to PEM format
     */
    async function exportPrivateKey(key) {
        const exported = await crypto.subtle.exportKey('pkcs8', key);
        const b64 = arrayBufferToBase64(exported);
        // Note: Using PKCS#8 format (PRIVATE KEY) not RSA PRIVATE KEY format
        return `-----BEGIN PRIVATE KEY-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END PRIVATE KEY-----`;
    }
    
    /**
     * Utility: Convert ArrayBuffer to Base64
     */
    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    /**
     * Utility: Convert Base64 to ArrayBuffer
     */
    function base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    // Public API
    return {
        generateSalt,
        generateMasterKeyPair,
        encryptMasterPrivateKey,
        precomputeKeyDerivation,
        decryptWithSymmetricKey,
        encryptForUser,
        decryptForUser,
        encryptForAdmin,
        setCachedKeys,
        getCachedAdminPublicKey,
        getCachedUserPublicKey,
        
        // Expose utilities for other modules
        utils: {
            arrayBufferToBase64,
            base64ToArrayBuffer
        }
    };
})();