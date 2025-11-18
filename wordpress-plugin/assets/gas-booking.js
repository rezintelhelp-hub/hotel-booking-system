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
    });
    
    function searchProperties(data) {
        $('#gas-search-results').html('<p>Searching...</p>');
        
        $.get(gasBooking.apiUrl + '/api/db/properties', function(response) {
            if (response.success) {
                displayResults(response.data);
            } else {
                $('#gas-search-results').html('<p>No properties found</p>');
            }
        }).fail(function() {
            $('#gas-search-results').html('<p>Error searching properties</p>');
        });
    }
    
    function displayResults(properties) {
        let html = '<div class="gas-properties-grid">';
        
        properties.forEach(function(property) {
            html += `
                <div class="gas-property-card">
                    <div class="gas-property-image">
                        <img src="${property.hero_image_url || 'https://via.placeholder.com/400x300?text=Property'}" alt="${property.name}">
                    </div>
                    <div class="gas-property-content">
                        <h3>${property.name}</h3>
                        <p>${property.city}, ${property.country}</p>
                        <p>${property.description ? property.description.substring(0, 100) + '...' : ''}</p>
                        <a href="#" class="gas-btn-primary" onclick="gasViewProperty(${property.id}); return false;">View Details</a>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        $('#gas-search-results').html(html);
    }
    
    window.gasViewProperty = function(id) {
        alert('Property details for ID: ' + id + '\n\nThis would open a modal or redirect to property page.');
    };
    
})(jQuery);
