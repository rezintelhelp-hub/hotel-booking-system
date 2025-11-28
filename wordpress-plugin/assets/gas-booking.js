// GAS Booking Plugin JavaScript
(function($) {
    'use strict';
    
    $(document).ready(function() {
        // Search form handler
        $('#gas-search-form').on('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                checkIn: $(this).find('[name="checkIn"]').val(),
                checkOut: $(this).find('[name="checkOut"]').val(),
                guests: $(this).find('[name="guests"]').val()
            };
            
            searchProperties(formData);
        });
        
        // Set minimum date to today for date inputs
        const today = new Date().toISOString().split('T')[0];
        $('input[name="checkIn"]').attr('min', today);
        $('input[name="checkOut"]').attr('min', today);
        
        // Update checkout min date when checkin changes
        $('input[name="checkIn"]').on('change', function() {
            const checkIn = $(this).val();
            if (checkIn) {
                const nextDay = new Date(checkIn);
                nextDay.setDate(nextDay.getDate() + 1);
                $('input[name="checkOut"]').attr('min', nextDay.toISOString().split('T')[0]);
            }
        });
    });
    
    function searchProperties(data) {
        const $results = $('#gas-search-results');
        $results.html('<div class="gas-loading"><p>Searching available properties...</p></div>');
        
        // Use authenticated endpoint with API key
        $.ajax({
            url: gasBooking.apiUrl + '/api/v1/properties',
            method: 'GET',
            headers: {
                'X-API-Key': gasBooking.apiKey
            },
            success: function(response) {
                if (response.success && response.properties) {
                    // Filter by availability (in future, use server-side filtering)
                    displayResults(response.properties, data);
                } else {
                    $results.html('<div class="gas-empty-state"><h3>No Results</h3><p>' + (response.error || 'No properties found') + '</p></div>');
                }
            },
            error: function(xhr, status, error) {
                console.error('GAS Search Error:', error);
                $results.html('<div class="gas-empty-state"><h3>Error</h3><p>Could not search properties. Please try again.</p></div>');
            }
        });
    }
    
    function displayResults(properties, searchData) {
        const $results = $('#gas-search-results');
        
        if (!properties || properties.length === 0) {
            $results.html('<div class="gas-empty-state"><h3>No Properties Found</h3><p>No properties match your search criteria.</p></div>');
            return;
        }
        
        let html = '<h3 class="gas-results-title">' + properties.length + ' Properties Found</h3>';
        html += '<div class="gas-properties-grid">';
        
        properties.forEach(function(property) {
            const imageUrl = property.hero_image_url || 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(property.name);
            const location = [property.city, property.country].filter(Boolean).join(', ');
            const description = property.description ? property.description.substring(0, 120) + '...' : '';
            const roomCount = property.room_count || 0;
            
            html += `
                <div class="gas-property-card">
                    <div class="gas-property-image">
                        <img src="${imageUrl}" alt="${escapeHtml(property.name)}" loading="lazy">
                    </div>
                    <div class="gas-property-content">
                        <h3>${escapeHtml(property.name)}</h3>
                        ${location ? `<p class="gas-property-location">${escapeHtml(location)}</p>` : ''}
                        ${description ? `<p>${escapeHtml(description)}</p>` : ''}
                        ${roomCount > 0 ? `<p class="gas-property-rooms">${roomCount} accommodation${roomCount > 1 ? 's' : ''} available</p>` : ''}
                        <a href="#" class="gas-btn-primary" onclick="gasViewProperty(${property.id}); return false;">View Details</a>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        $results.html(html);
    }
    
    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // View property details
    window.gasViewProperty = function(id) {
        // Show loading modal
        showModal('<div class="gas-loading"><p>Loading property details...</p></div>');
        
        $.ajax({
            url: gasBooking.apiUrl + '/api/v1/properties/' + id,
            method: 'GET',
            headers: {
                'X-API-Key': gasBooking.apiKey
            },
            success: function(response) {
                if (response.success && response.property) {
                    showPropertyModal(response.property, response.rooms || []);
                } else {
                    showModal('<div class="gas-error"><p>Could not load property details.</p></div>');
                }
            },
            error: function() {
                showModal('<div class="gas-error"><p>Error loading property. Please try again.</p></div>');
            }
        });
    };
    
    function showPropertyModal(property, rooms) {
        const imageUrl = property.hero_image_url || 'https://via.placeholder.com/800x400?text=' + encodeURIComponent(property.name);
        const location = [property.address, property.city, property.country].filter(Boolean).join(', ');
        
        let roomsHtml = '';
        if (rooms && rooms.length > 0) {
            roomsHtml = '<div class="gas-modal-rooms"><h4>Available Accommodations</h4>';
            rooms.forEach(function(room) {
                roomsHtml += `
                    <div class="gas-room-card">
                        <div class="gas-room-info">
                            <h5>${escapeHtml(room.name)}</h5>
                            <p>
                                ${room.max_occupancy ? '👥 Up to ' + room.max_occupancy + ' guests' : ''}
                                ${room.bedroom_count ? ' • 🛏️ ' + room.bedroom_count + ' bedroom' + (room.bedroom_count > 1 ? 's' : '') : ''}
                            </p>
                        </div>
                        ${room.base_price ? `<div class="gas-room-price">${room.currency || 'GBP'} ${room.base_price}<span>/night</span></div>` : ''}
                    </div>
                `;
            });
            roomsHtml += '</div>';
        }
        
        const html = `
            <div class="gas-modal-property">
                <div class="gas-modal-image">
                    <img src="${imageUrl}" alt="${escapeHtml(property.name)}">
                </div>
                <div class="gas-modal-content">
                    <h2>${escapeHtml(property.name)}</h2>
                    ${location ? `<p class="gas-modal-location">📍 ${escapeHtml(location)}</p>` : ''}
                    ${property.description ? `<div class="gas-modal-description">${escapeHtml(property.description)}</div>` : ''}
                    ${roomsHtml}
                    <div class="gas-modal-actions">
                        <button onclick="closeGasModal()" class="gas-btn-secondary">Close</button>
                        <a href="#" class="gas-btn-primary">Check Availability</a>
                    </div>
                </div>
            </div>
        `;
        
        showModal(html);
    }
    
    function showModal(content) {
        // Remove existing modal
        closeGasModal();
        
        const modal = $(`
            <div class="gas-modal-overlay" onclick="closeGasModal()">
                <div class="gas-modal" onclick="event.stopPropagation()">
                    <button class="gas-modal-close" onclick="closeGasModal()">&times;</button>
                    <div class="gas-modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(modal);
        $('body').css('overflow', 'hidden');
    }
    
    window.closeGasModal = function() {
        $('.gas-modal-overlay').remove();
        $('body').css('overflow', '');
    };
    
    // Close modal on escape key
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            closeGasModal();
        }
    });
    
})(jQuery);
