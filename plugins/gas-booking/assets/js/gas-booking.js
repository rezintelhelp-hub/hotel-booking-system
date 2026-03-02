/**
 * GAS Booking Plugin JavaScript - Dwellfort-Inspired Design
 */
jQuery(document).ready(function($) {
    
    // Get current language from URL parameter, cookie, or default to 'en'
    function getCurrentLanguage() {
        // Check URL parameter first
        var urlParams = new URLSearchParams(window.location.search);
        var langParam = urlParams.get('lang');
        if (langParam && /^[a-z]{2}$/.test(langParam)) {
            return langParam;
        }
        
        // Check cookie
        var cookieMatch = document.cookie.match(/gas_lang=([a-z]{2})/);
        if (cookieMatch) {
            return cookieMatch[1];
        }
        
        // Check browser language
        var browserLang = (navigator.language || navigator.userLanguage || 'en').substring(0, 2).toLowerCase();
        var supported = ['en', 'fr', 'es', 'de', 'nl', 'it', 'pt', 'ru', 'zh', 'ja'];
        if (supported.indexOf(browserLang) !== -1) {
            return browserLang;
        }
        
        return 'en';
    }
    
    var currentLanguage = getCurrentLanguage();
    
    // Override with PHP-provided language if available
    if (typeof gasBooking !== 'undefined' && gasBooking.currentLanguage) {
        currentLanguage = gasBooking.currentLanguage;
    }
    
    // Global translations object
    var gasTranslations = {
        common: { loading: 'Loading...', more_info: 'More Information', less_info: 'Less Information', apply: 'Apply', error: 'Error', connection_error: 'Connection error. Please try again.', under: 'under', confirmed: 'Confirmed' },
        booking: {
            book_now: 'Book Now',
            view_book: 'View & Book',
            check_in: 'Check-in',
            check_out: 'Check-out',
            select_dates: 'Select dates',
            nights: 'nights',
            night: 'night',
            guests: 'Guests',
            guest: 'guest',
            adults: 'Adults',
            adult: 'Adult',
            children: 'Children',
            child: 'Child',
            price_per_night: 'per night',
            check_availability: 'Check Availability',
            select_dates_to_check: 'Select dates to check availability',
            add_to_cart: 'Add to Cart',
            total_price: 'Total Price',
            checking_availability: 'Checking availability...',
            not_available: 'Not available',
            not_available_dates: 'Not available on selected dates',
            not_available_property: 'Not available for this property',
            not_available_selected: 'Not available for selected dates',
            error_checking: 'Error checking availability',
            view_calendar: 'View Calendar',
            check_other_dates: 'Check other dates',
            max_guests: 'Max %s guests',
            checking: 'Checking...',
            processing: 'Processing...',
            confirming: 'Confirming booking...',
            processing_payment: 'Processing payment...',
            booking_reference: 'Booking reference',
            check_email: 'Check your email for confirmation details.',
            confirmation_sent: 'Confirmation sent to',
            cart_empty: 'Your cart is empty.',
            browse_rooms: 'Browse rooms',
            rooms_not_available_divider: 'Rooms below are not available for selected dates',
            error_validating_voucher: 'Error validating voucher',
            where_going: 'Where are you going?',
            location: 'Location'
        },
        property: {
            description: 'Description',
            availability: 'Availability',
            features: 'Features',
            terms: 'Terms',
            reviews: 'Reviews',
            bedrooms: 'Bedrooms',
            bedroom: 'Bedroom',
            bathrooms: 'Bathrooms',
            bathroom: 'Bathroom',
            guests_label: 'Guests',
            no_description: 'No description available.',
            contact_cancellation: 'Please contact the property for cancellation policy details.',
            unable_to_load: 'Unable to load room details'
        },
        guest_details: {
            first_name: 'First Name',
            last_name: 'Last Name',
            email: 'Email',
            phone: 'Phone',
            country: 'Country',
            special_requests: 'Special Requests',
            terms_agree: 'I agree to the',
            terms_conditions: 'Terms and Conditions',
            privacy_policy: 'Privacy Policy'
        },
        payment: {
            payment: 'Payment',
            pay_now: 'Pay Now',
            card_number: 'Card Number',
            expiry_date: 'Expiry Date',
            cardholder_name: 'Cardholder Name'
        },
        filters: {
            load_more: 'Load More Properties',
            more: 'more',
            no_results: 'No rooms match the selected filters. Please adjust your criteria.'
        },
        calendar: {
            mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun'
        }
    };
    
    // Merge with PHP-provided translations (higher priority)
    if (typeof gasBooking !== 'undefined' && gasBooking.translations) {
        var phpT = gasBooking.translations;
        for (var cat in phpT) {
            if (!gasTranslations[cat]) gasTranslations[cat] = {};
            for (var key in phpT[cat]) {
                gasTranslations[cat][key] = phpT[cat][key];
            }
        }
    }
    
    // Fetch translations from server
    function loadTranslations(callback) {
        var apiUrl = (typeof gasBooking !== 'undefined' && gasBooking.apiUrl) ? gasBooking.apiUrl : 'https://admin.gas.travel';
        window.gasApiUrl = apiUrl;
        $.ajax({
            url: apiUrl + '/api/public/translations/' + currentLanguage,
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.translations && response.translations.strings) {
                    gasTranslations = response.translations.strings;
                }
                if (callback) callback();
            },
            error: function() {
                // Use defaults
                if (callback) callback();
            }
        });
    }
    
    // Helper to get translation
    function t(category, key, defaultVal) {
        if (gasTranslations[category] && gasTranslations[category][key]) {
            return gasTranslations[category][key];
        }
        return defaultVal || key;
    }
    
    // Load translations immediately
    loadTranslations(function() {
        // Update any static UI elements after translations load
        updateStaticTranslations();
    });
    
    // Update static UI elements with translations
    function updateStaticTranslations() {
        // Set CSS variable for NOT AVAILABLE badge
        document.documentElement.style.setProperty('--gas-not-available-text', '"' + t('booking', 'not_available', 'Not available').toUpperCase() + '"');
        
        // Tab buttons
        $('.gas-tab-btn[data-tab="description"]').text(t('property', 'description', 'Description'));
        $('.gas-tab-btn[data-tab="availability"]').text(t('property', 'availability', 'Availability'));
        $('.gas-tab-btn[data-tab="features"]').text(t('property', 'features', 'Features'));
        $('.gas-tab-btn[data-tab="reviews"]').text(t('property', 'reviews', 'Reviews'));
        $('.gas-tab-btn[data-tab="terms"]').text(t('property', 'terms', 'Terms'));
        
        // Booking panel - Select dates header
        $('.gas-booking-card-header span, .gas-select-dates-label').text(t('booking', 'select_dates', 'Select dates'));
        
        // Booking panel date labels
        $('.gas-date-field label').each(function() {
            var text = $(this).text().trim().toUpperCase();
            if (text === 'CHECK-IN') {
                $(this).text(t('booking', 'check_in', 'Check-in').toUpperCase());
            } else if (text === 'CHECK-OUT') {
                $(this).text(t('booking', 'check_out', 'Check-out').toUpperCase());
            }
        });
        $('.gas-date-label').each(function() {
            var text = $(this).text().trim().toUpperCase();
            if (text === 'CHECK-IN') {
                $(this).text(t('booking', 'check_in', 'Check-in').toUpperCase());
            } else if (text === 'CHECK-OUT') {
                $(this).text(t('booking', 'check_out', 'Check-out').toUpperCase());
            }
        });
        
        // Adults/Children labels
        $('.gas-adults-field > label').contents().filter(function() {
            return this.nodeType === 3; // Text nodes only
        }).first().replaceWith(t('booking', 'adults', 'Adults').toUpperCase());
        
        $('.gas-children-field > label').contents().filter(function() {
            return this.nodeType === 3;
        }).first().replaceWith(t('booking', 'children', 'Children').toUpperCase() + ' ');
        
        // Price per night
        $('.gas-price-period').text(t('booking', 'price_per_night', '/ night'));
        
        // Book button initial state
        $('.gas-book-btn:disabled').text(t('booking', 'select_dates_to_check', 'Select dates to check availability'));
        
        // Add to cart button
        $('.gas-add-to-cart-btn').text('+ ' + t('booking', 'add_to_cart', 'Add to Cart'));
        
        // More info toggle
        $('.gas-more-info-toggle span').text(t('common', 'more_info', 'More Information'));
        
        // Price breakdown labels
        $('.gas-total-row span:first').text(t('booking', 'total_price', 'Total'));
        
        // Calendar legend
        $('.gas-legend-item').each(function() {
            var $span = $(this).find('span');
            var text = $span.text().trim().toLowerCase();
            if (text === 'available') {
                $span.text(t('common', 'available', 'Available'));
            } else if (text === 'unavailable') {
                $span.text(t('common', 'unavailable', 'Unavailable'));
            }
        });
        
        // Calendar day headers
        var dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        $('.gas-calendar-grid .gas-day-header, .gas-weekday').each(function() {
            var text = $(this).text().trim().toLowerCase();
            var dayKey = dayNames.find(function(d) { return text.indexOf(d) === 0; });
            if (dayKey) {
                $(this).text(t('calendar', dayKey, $(this).text()));
            }
        });
    }
    
    // Currency formatting function
    // Converts currency code to symbol and formats price
    function formatPrice(amount, currencyCode) {
        // Always use the WordPress currency setting over channel manager currency
        currencyCode = currencyCode || gasBooking.currency;
        var symbols = {
            'USD': '$', 'GBP': '£', 'EUR': '€', 'AUD': 'A$', 'CAD': 'C$',
            'JPY': '¥', 'CNY': '¥', 'INR': '₹', 'CHF': 'CHF ', 'SEK': 'kr',
            'NOK': 'kr', 'DKK': 'kr', 'NZD': 'NZ$', 'SGD': 'S$', 'HKD': 'HK$',
            'MXN': 'MX$', 'BRL': 'R$', 'ZAR': 'R', 'THB': '฿', 'MYR': 'RM',
            'IDR': 'Rp', 'PHP': '₱', 'VND': '₫', 'KRW': '₩', 'TWD': 'NT$',
            'AED': 'د.إ', 'SAR': '﷼', 'TRY': '₺', 'PLN': 'zł', 'CZK': 'Kč',
            'HUF': 'Ft', 'ILS': '₪', 'RUB': '₽', 'COP': 'COL$', 'ARS': 'AR$',
            '$': '$', '£': '£', '€': '€', 'Rp': 'Rp'
        };
        var symbol = symbols[currencyCode] || (currencyCode && currencyCode.length <= 4 ? currencyCode + ' ' : '') || '';
        var num = parseFloat(amount) || 0;
        // Format with 2 decimal places
        return symbol + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    // HTML escape function for security
    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // =========================================================
    // SHOPPING CART FOR GROUP BOOKINGS
    // =========================================================
    var GASCart = {
        items: [],
        
        load: function() {
            try {
                var saved = localStorage.getItem('gas_cart');
                this.items = saved ? JSON.parse(saved) : [];
            } catch(e) {
                this.items = [];
            }
        },
        
        save: function() {
            try {
                localStorage.setItem('gas_cart', JSON.stringify(this.items));
            } catch(e) {}
            this.updateDisplay();
        },
        
        add: function(room) {
            // Check if same room already in cart
            var exists = this.items.find(function(item) {
                return item.roomId === room.roomId;
            });
            if (exists) {
                alert('This room is already in your cart.');
                return false;
            }
            
            // All rooms must have same dates
            if (this.items.length > 0) {
                var first = this.items[0];
                if (first.checkin !== room.checkin || first.checkout !== room.checkout) {
                    alert('All rooms must have the same dates.\n\nCart dates: ' + first.checkin + ' to ' + first.checkout);
                    return false;
                }
            }
            
            this.items.push(room);
            this.save();
            return true;
        },
        
        remove: function(index) {
            this.items.splice(index, 1);
            this.save();
        },
        
        clear: function() {
            this.items = [];
            this.save();
        },
        
        getTotal: function() {
            return this.items.reduce(function(sum, item) {
                return sum + (parseFloat(item.totalPrice) || 0);
            }, 0);
        },
        
        updateDisplay: function() {
            var count = this.items.length;
            $('.gas-cart-count').text(count);
            if (count > 0) {
                $('.gas-cart-status').show();
            } else {
                $('.gas-cart-status').hide();
            }
        }
    };
    
    // Initialize cart
    GASCart.load();
    GASCart.updateDisplay();
    window.GASCart = GASCart;
    
    // Short format (no decimals) for compact displays
    function formatPriceShort(amount, currencyCode) {
        // Always use the WordPress currency setting over channel manager currency
        currencyCode = currencyCode || gasBooking.currency;
        var symbols = {
            'USD': '$', 'GBP': '£', 'EUR': '€', 'AUD': 'A$', 'CAD': 'C$',
            'JPY': '¥', 'CNY': '¥', 'INR': '₹', 'CHF': 'CHF ', 'SEK': 'kr',
            'NOK': 'kr', 'DKK': 'kr', 'NZD': 'NZ$', 'SGD': 'S$', 'HKD': 'HK$',
            'MXN': 'MX$', 'BRL': 'R$', 'ZAR': 'R', 'THB': '฿', 'MYR': 'RM',
            'IDR': 'Rp', 'PHP': '₱', 'VND': '₫', 'KRW': '₩', 'TWD': 'NT$',
            'AED': 'د.إ', 'SAR': '﷼', 'TRY': '₺', 'PLN': 'zł', 'CZK': 'Kč',
            'HUF': 'Ft', 'ILS': '₪', 'RUB': '₽', 'COP': 'COL$', 'ARS': 'AR$',
            '$': '$', '£': '£', '€': '€', 'Rp': 'Rp'
        };
        var symbol = symbols[currencyCode] || (currencyCode && currencyCode.length <= 4 ? currencyCode + ' ' : '') || '';
        var num = parseFloat(amount) || 0;
        return symbol + Math.round(num).toLocaleString();
    }
    
    // Initialize Flatpickr date pickers
    function initDatePickers() {
        if (typeof flatpickr === 'undefined') return;
        
        var today = new Date();
        var tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Set flatpickr locale based on current language
        var flatpickrLocale = null;
        if (currentLanguage !== 'en' && typeof flatpickr.l10ns !== 'undefined' && flatpickr.l10ns[currentLanguage]) {
            flatpickrLocale = currentLanguage;
        }
        
        // Room page date pickers
        var isMobileDevice = window.innerWidth <= 768;
        
        if ($('.gas-checkin').length) {
            flatpickr('.gas-checkin', {
                dateFormat: 'Y-m-d',
                minDate: 'today',
                altInput: true,
                altFormat: 'd M Y',
                disableMobile: false,
                locale: flatpickrLocale,
                onChange: function(selectedDates, dateStr, instance) {
                    // Update checkout min date and auto-open
                    var checkoutInput = instance.element.closest('.gas-room-widget, .gas-booking-card')?.querySelector('.gas-checkout');
                    if (!checkoutInput) checkoutInput = document.querySelector('.gas-checkout');
                    
                    if (checkoutInput && checkoutInput._flatpickr) {
                        var nextDay = new Date(selectedDates[0]);
                        nextDay.setDate(nextDay.getDate() + 1);
                        checkoutInput._flatpickr.set('minDate', nextDay);
                        // Jump to check-in month and auto-open
                        checkoutInput._flatpickr.jumpToDate(nextDay);
                        setTimeout(function() {
                            checkoutInput._flatpickr.open();
                        }, isMobileDevice ? 300 : 100);
                    }
                }
            });
        }
        
        if ($('.gas-checkout').length) {
            flatpickr('.gas-checkout', {
                dateFormat: 'Y-m-d',
                minDate: tomorrow,
                altInput: true,
                altFormat: 'd M Y',
                disableMobile: false,
                locale: flatpickrLocale
            });
        }
        
        // Search widget date pickers - initialize each widget separately
        var isMobile = window.innerWidth <= 768;
        
        $('.gas-search-widget').each(function() {
            var $widget = $(this);
            var $checkin = $widget.find('.gas-checkin-date');
            var $checkout = $widget.find('.gas-checkout-date');
            
            if ($checkin.length) {
                flatpickr($checkin[0], {
                    dateFormat: 'Y-m-d',
                    minDate: 'today',
                    altInput: true,
                    altFormat: 'd M Y',
                    disableMobile: false,
                    onChange: function(selectedDates, dateStr, instance) {
                        if (selectedDates.length && $checkout.length) {
                            var nextDay = new Date(selectedDates[0]);
                            nextDay.setDate(nextDay.getDate() + 1);
                            
                            if ($checkout[0]._flatpickr) {
                                $checkout[0]._flatpickr.set('minDate', nextDay);
                                // Jump to check-in month and auto-open
                                $checkout[0]._flatpickr.jumpToDate(nextDay);
                                setTimeout(function() {
                                    $checkout[0]._flatpickr.open();
                                }, isMobile ? 300 : 100);
                            }
                        }
                    }
                });
            }
            
            if ($checkout.length) {
                flatpickr($checkout[0], {
                    dateFormat: 'Y-m-d',
                    minDate: tomorrow,
                    altInput: true,
                    altFormat: 'd M Y',
                    disableMobile: false
                });
            }
        });
        
        // Filter date pickers (on rooms page) - same logic
        $('.gas-date-filter').each(function() {
            var $filter = $(this);
            var $checkin = $filter.find('.gas-filter-checkin');
            var $checkout = $filter.find('.gas-filter-checkout');
            var isMobile = window.innerWidth <= 768;
            
            if ($checkin.length) {
                flatpickr($checkin[0], {
                    dateFormat: 'Y-m-d',
                    minDate: 'today',
                    altInput: true,
                    altFormat: 'd M Y',
                    disableMobile: false, // Use native picker on mobile for better UX
                    onChange: function(selectedDates, dateStr, instance) {
                        if (selectedDates.length && $checkout.length) {
                            var nextDay = new Date(selectedDates[0]);
                            nextDay.setDate(nextDay.getDate() + 1);
                            
                            if ($checkout[0]._flatpickr) {
                                $checkout[0]._flatpickr.set('minDate', nextDay);
                                // Jump to check-in month and auto-open
                                $checkout[0]._flatpickr.jumpToDate(nextDay);
                                setTimeout(function() {
                                    $checkout[0]._flatpickr.open();
                                }, isMobile ? 300 : 100);
                            }
                        }
                    }
                });
            }
            
            if ($checkout.length) {
                flatpickr($checkout[0], {
                    dateFormat: 'Y-m-d',
                    minDate: tomorrow,
                    altInput: true,
                    altFormat: 'd M Y',
                    disableMobile: false // Use native picker on mobile for better UX
                });
            }
        });
    }
    
    // Initialize date pickers after a small delay to ensure DOM is ready
    setTimeout(initDatePickers, 100);
    
    // Pre-fill dates from cart if items exist (for "Add another room" flow)
    setTimeout(function() {
        if (window.GASCart && window.GASCart.items.length > 0) {
            var cartDates = window.GASCart.items[0];
            if (cartDates.checkin && cartDates.checkout) {
                // Pre-fill room page date pickers
                var $checkin = $('.gas-checkin');
                var $checkout = $('.gas-checkout');
                
                // Use false to NOT trigger onChange (prevents calendar auto-open)
                if ($checkin.length && $checkin[0]._flatpickr) {
                    $checkin[0]._flatpickr.setDate(cartDates.checkin, false);
                }
                if ($checkout.length && $checkout[0]._flatpickr) {
                    $checkout[0]._flatpickr.setDate(cartDates.checkout, false);
                }
                
                // Pre-fill search widget date pickers
                var $searchCheckin = $('.gas-checkin-date');
                var $searchCheckout = $('.gas-checkout-date');
                
                if ($searchCheckin.length && $searchCheckin[0]._flatpickr) {
                    $searchCheckin[0]._flatpickr.setDate(cartDates.checkin, false);
                }
                if ($searchCheckout.length && $searchCheckout[0]._flatpickr) {
                    $searchCheckout[0]._flatpickr.setDate(cartDates.checkout, false);
                }
                
                console.log('GAS: Pre-filled dates from cart:', cartDates.checkin, 'to', cartDates.checkout);
                
                // Ensure any calendars that opened are closed
                setTimeout(function() {
                    if ($checkin.length && $checkin[0]._flatpickr) $checkin[0]._flatpickr.close();
                    if ($checkout.length && $checkout[0]._flatpickr) $checkout[0]._flatpickr.close();
                    if ($searchCheckin.length && $searchCheckin[0]._flatpickr) $searchCheckin[0]._flatpickr.close();
                    if ($searchCheckout.length && $searchCheckout[0]._flatpickr) $searchCheckout[0]._flatpickr.close();
                }, 50);
            }
        }
    }, 200);
    
    // SVG Icons
    var icons = {
        users: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
        bed: '<svg viewBox="0 0 24 24"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>',
        bath: '<svg viewBox="0 0 24 24"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"></path><line x1="10" x2="8" y1="5" y2="7"></line><line x1="2" x2="22" y1="12" y2="12"></line><line x1="7" x2="7" y1="19" y2="21"></line><line x1="17" x2="17" y1="19" y2="21"></line></svg>',
        home: '<svg viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
        wifi: '<svg viewBox="0 0 24 24"><path d="M5 13a10 10 0 0 1 14 0"></path><path d="M8.5 16.5a5 5 0 0 1 7 0"></path><line x1="12" x2="12.01" y1="20" y2="20"></line></svg>',
        tv: '<svg viewBox="0 0 24 24"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>',
        coffee: '<svg viewBox="0 0 24 24"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" x2="6" y1="2" y2="4"></line><line x1="10" x2="10" y1="2" y2="4"></line><line x1="14" x2="14" y1="2" y2="4"></line></svg>',
        car: '<svg viewBox="0 0 24 24"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle></svg>',
        aircon: '<svg viewBox="0 0 24 24"><path d="M8 16a4 4 0 1 1 8 0"></path><path d="M12 4v8"></path><path d="m4.93 10.93 1.41 1.41"></path><path d="M2 18h2"></path><path d="M20 18h2"></path><path d="m19.07 10.93-1.41 1.41"></path><path d="M22 22H2"></path></svg>',
        kitchen: '<svg viewBox="0 0 24 24"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>',
        check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    };
    
    // Amenity icon mapping
    var amenityIcons = {
        'wifi': icons.wifi,
        'tv': icons.tv,
        'television': icons.tv,
        'air conditioning': icons.aircon,
        'air-conditioning': icons.aircon,
        'ac': icons.aircon,
        'heating': icons.aircon,
        'kitchen': icons.kitchen,
        'parking': icons.car,
        'coffee': icons.coffee,
        'breakfast': icons.coffee
    };
    
    function getAmenityIcon(name) {
        var lowerName = name.toLowerCase();
        for (var key in amenityIcons) {
            if (lowerName.includes(key)) {
                return amenityIcons[key];
            }
        }
        return icons.check;
    }
    
    // Search button click handler
    $(document).on('click', '.gas-search-button', function(e) {
        e.preventDefault();
        
        // Find the parent widget to get values from the correct form
        var $widget = $(this).closest('.gas-search-widget');
        
        var checkin = $widget.find('.gas-checkin-date').val();
        var checkout = $widget.find('.gas-checkout-date').val();
        var guests = $widget.find('.gas-guests-select').val();
        var location = $widget.find('.gas-location-input').val();
        
        var baseUrl = gasBooking.searchResultsUrl || '/book-now/';
        var params = [];
        
        if (location) params.push('location=' + encodeURIComponent(location));
        if (checkin) params.push('checkin=' + checkin);
        if (checkout) params.push('checkout=' + checkout);
        if (guests) params.push('guests=' + guests);
        
        var url = baseUrl;
        if (params.length > 0) {
            url += (baseUrl.indexOf('?') > -1 ? '&' : '?') + params.join('&');
        }
        
        window.location.href = url;
    });
    
    // Rooms grid - check availability on page load if dates provided
    if (typeof gasRoomsConfig !== 'undefined' && gasRoomsConfig.checkin && gasRoomsConfig.checkout) {
        checkAllAvailability(gasRoomsConfig.checkin, gasRoomsConfig.checkout, gasRoomsConfig.guests);
    }
    
    // Room detail widget
    var $roomWidget = $('.gas-room-widget');
    if ($roomWidget.length) {
        var unitId = $roomWidget.data('unit-id');
        var checkin = $roomWidget.data('checkin') || '';
        var checkout = $roomWidget.data('checkout') || '';
        var guests = $roomWidget.data('guests') || 1;
        
        loadRoomDetails(unitId, checkin, checkout, guests);
    }
    
    function loadRoomDetails(unitId, checkin, checkout, guests) {
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/unit/' + unitId,
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.unit) {
                    // Also fetch occupancy settings
                    loadOccupancySettings(unitId, function(occSettings) {
                        renderRoomDetails(response.unit, response.images || [], response.amenities || [], checkin, checkout, guests, occSettings);
                        // Store property_id and payment_account_id for checkout
                        if (response.unit.property_id) {
                            $('.gas-room-widget').data('property-id', response.unit.property_id);
                            loadPropertyTerms(response.unit.property_id);
                        }
                        if (response.unit.payment_account_id) {
                            $('.gas-room-widget').data('payment-account-id', response.unit.payment_account_id);
                        }
                        // Pre-load reviews to determine if tab should be shown
                        preloadReviewsCheck(unitId);
                    });
                } else {
                    $('.gas-room-loading').html('<p class="gas-error">' + t('property', 'unable_to_load', 'Unable to load room details') + ': ' + (response.error || 'Unknown error') + '</p>');
                }
            },
            error: function() {
                $('.gas-room-loading').html('<p class="gas-error">' + t('common', 'connection_error', 'Connection error. Please try again.') + '</p>');
            }
        });
    }
    
    // Load occupancy settings for a room
    function loadOccupancySettings(unitId, callback) {
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/rooms/' + unitId + '/occupancy-settings',
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.data) {
                    callback(response.data);
                } else {
                    // Default settings
                    callback({
                        pricing_mode: 'per_room',
                        base_occupancy: 2,
                        max_guests: 4,
                        max_adults: 4,
                        max_children: 3,
                        children_allowed: true,
                        child_max_age: 12,
                        extra_adult_type: 'fixed',
                        extra_adult_charge: 0,
                        single_discount_type: 'fixed',
                        single_discount_value: 0,
                        child_charge_type: 'free',
                        child_charge: 0
                    });
                }
            },
            error: function() {
                // Default settings on error
                callback({
                    pricing_mode: 'per_room',
                    base_occupancy: 2,
                    max_guests: 4,
                    max_adults: 4,
                    max_children: 3,
                    children_allowed: true,
                    child_max_age: 12
                });
            }
        });
    }
    
    function loadPropertyTerms(propertyId) {
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/property/' + propertyId + '/terms',
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.data) {
                    var terms = response.data;
                    
                    // Get terms translations
                    var tTerms = gasTranslations.terms || {};
                    
                    // Build General Terms content
                    var generalHtml = '<ul class="gas-terms-list">';
                    generalHtml += '<li><strong>' + (tTerms.check_in || 'Check-in') + ':</strong> ' + (terms.check_in.from || '15:00') + ' - ' + (terms.check_in.until || '22:00');
                    if (terms.check_in.self_checkin) generalHtml += ' (' + (tTerms.self_checkin || 'Self check-in available') + ')';
                    if (terms.check_in.is_24hr) generalHtml += ' (' + (tTerms.checkin_24hr || '24-hour check-in') + ')';
                    generalHtml += '</li>';
                    generalHtml += '<li><strong>' + (tTerms.check_out || 'Check-out') + ':</strong> ' + (tTerms.by || 'By') + ' ' + (terms.check_out.by || '11:00') + '</li>';
                    if (terms.check_out.late_fee) {
                        generalHtml += '<li><strong>' + (tTerms.late_checkout_fee || 'Late check-out fee') + ':</strong> ' + terms.check_out.late_fee + '</li>';
                    }
                    
                    // Children policy
                    var childrenText = terms.children.policy === 'all' ? (tTerms.children_all_ages || 'Children of all ages welcome') : 
                                      terms.children.policy === 'no' ? (tTerms.no_children || 'No children allowed') : 
                                      (tTerms.children_policy || 'Children policy') + ': ' + terms.children.policy;
                    generalHtml += '<li><strong>' + (tTerms.children || 'Children') + ':</strong> ' + childrenText;
                    if (terms.children.cots_available) generalHtml += ' • ' + (tTerms.cots_available || 'Cots available');
                    if (terms.children.highchairs_available) generalHtml += ' • ' + (tTerms.highchairs_available || 'Highchairs available');
                    generalHtml += '</li>';
                    
                    // Events policy
                    var eventsText = terms.events.policy === 'no' ? (tTerms.no_events || 'No events or parties') : 
                                    terms.events.policy === 'request' ? (tTerms.events_on_request || 'Events on request') : (tTerms.events_allowed || 'Events allowed');
                    generalHtml += '<li><strong>' + (tTerms.events || 'Events') + ':</strong> ' + eventsText + '</li>';
                    generalHtml += '</ul>';
                    
                    $('.gas-general-terms').html(generalHtml);
                    
                    // Build House Rules content
                    var rulesHtml = '<ul class="gas-terms-list">';
                    
                    // Smoking
                    var smokingText = terms.smoking.policy === 'no' ? (tTerms.no_smoking || 'No smoking') : 
                                     terms.smoking.policy === 'designated' ? (tTerms.smoking_designated || 'Smoking in designated areas only') : 
                                     (tTerms.smoking_allowed || 'Smoking allowed');
                    rulesHtml += '<li><strong>' + (tTerms.smoking || 'Smoking') + ':</strong> ' + smokingText;
                    if (terms.smoking.fine) rulesHtml += ' (' + (tTerms.fine || 'Fine') + ': ' + terms.smoking.fine + ')';
                    rulesHtml += '</li>';
                    
                    // Pets
                    var petsText = terms.pets.policy === 'no' ? (tTerms.no_pets || 'No pets allowed') : 
                                  terms.pets.policy === 'request' ? (tTerms.pets_on_request || 'Pets on request') : (tTerms.pets_allowed || 'Pets allowed');
                    rulesHtml += '<li><strong>' + (tTerms.pets || 'Pets') + ':</strong> ' + petsText;
                    if (terms.pets.policy !== 'no') {
                        if (terms.pets.dogs_allowed) rulesHtml += ' • ' + (tTerms.dogs_welcome || 'Dogs welcome');
                        if (terms.pets.cats_allowed) rulesHtml += ' • ' + (tTerms.cats_welcome || 'Cats welcome');
                        if (terms.pets.deposit) rulesHtml += ' (' + (tTerms.deposit || 'Deposit') + ': ' + terms.pets.deposit + ')';
                        if (terms.pets.fee_per_night) rulesHtml += ' (' + (tTerms.fee || 'Fee') + ': ' + terms.pets.fee_per_night + '/' + (tTerms.night || 'night') + ')';
                    }
                    rulesHtml += '</li>';
                    
                    // Quiet hours
                    if (terms.house_rules.quiet_hours_from && terms.house_rules.quiet_hours_until) {
                        rulesHtml += '<li><strong>' + (tTerms.quiet_hours || 'Quiet hours') + ':</strong> ' + terms.house_rules.quiet_hours_from + ' - ' + terms.house_rules.quiet_hours_until + '</li>';
                    }
                    
                    // ID required
                    if (terms.house_rules.id_required) {
                        rulesHtml += '<li><strong>' + (tTerms.id_required || 'ID required') + ':</strong> ' + (tTerms.valid_id_required || 'Valid ID required at check-in') + '</li>';
                    }
                    
                    // No outside guests
                    if (terms.house_rules.no_outside_guests) {
                        rulesHtml += '<li><strong>' + (tTerms.guests || 'Guests') + ':</strong> ' + (tTerms.no_unregistered || 'No unregistered visitors allowed') + '</li>';
                    }
                    
                    // Additional rules
                    if (terms.house_rules.additional_rules) {
                        rulesHtml += '<li>' + terms.house_rules.additional_rules + '</li>';
                    }
                    
                    // Accessibility
                    var accessFeatures = [];
                    if (terms.accessibility.wheelchair) accessFeatures.push(tTerms.wheelchair || 'Wheelchair accessible');
                    if (terms.accessibility.step_free) accessFeatures.push(tTerms.step_free || 'Step-free access');
                    if (terms.accessibility.accessible_bathroom) accessFeatures.push(tTerms.accessible_bathroom || 'Accessible bathroom');
                    if (terms.accessibility.elevator) accessFeatures.push(tTerms.elevator || 'Elevator access');
                    if (terms.accessibility.ground_floor) accessFeatures.push(tTerms.ground_floor || 'Ground floor available');
                    if (accessFeatures.length > 0) {
                        rulesHtml += '<li><strong>' + (tTerms.accessibility || 'Accessibility') + ':</strong> ' + accessFeatures.join(', ') + '</li>';
                    }
                    
                    rulesHtml += '</ul>';
                    $('.gas-house-rules').html(rulesHtml);
                    
                    // Cancellation policy
                    if (terms.cancellation_policy) {
                        $('.gas-cancellation-policy').html('<p>' + terms.cancellation_policy + '</p>');
                    } else {
                        $('.gas-cancellation-policy').html('<p>' + t('property', 'contact_cancellation', 'Please contact the property for cancellation policy details.') + '</p>');
                    }
                }
            }
        });
    }
    
    // Helper function to extract text from language objects (e.g., {en: 'text'})
    function extractText(value) {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
            // Try current language first, then English, then any available
            return value[currentLanguage] || value.en || value.EN || value['en-US'] || Object.values(value)[0] || '';
        }
        return String(value);
    }
    
    function renderRoomDetails(room, images, amenities, checkin, checkout, guests, occSettings) {
        var currency = room.currency || gasBooking.currency || '';
        occSettings = occSettings || {};
        
        // Set title and location - prefer display_name over internal name
        var roomTitle = extractText(room.display_name) || room.name;
        $('.gas-room-title').text(roomTitle);
        $('.gas-room-location').text(room.property_name || room.location || '');
        
        // Set meta with icons - use translations
        var metaHtml = '';
        if (room.max_guests) {
            metaHtml += '<div class="gas-meta-item"><span class="gas-meta-icon">' + icons.users + '</span><span>' + t('property', 'guests_label', 'Guests') + ': ' + room.max_guests + '</span></div>';
        }
        var bedrooms = room.num_bedrooms || room.bedroom_count;
        if (bedrooms) {
            var bedroomLabel = parseInt(bedrooms) > 1 ? t('property', 'bedrooms', 'Bedrooms') : t('property', 'bedroom', 'Bedroom');
            metaHtml += '<div class="gas-meta-item"><span class="gas-meta-icon">' + icons.bed + '</span><span>' + bedroomLabel + ': ' + parseInt(bedrooms) + '</span></div>';
        }
        var bathrooms = room.num_bathrooms || room.bathroom_count;
        if (bathrooms) {
            var bathroomsDisplay = parseFloat(bathrooms) % 1 === 0 ? parseInt(bathrooms) : parseFloat(bathrooms).toFixed(1);
            var bathroomLabel = parseFloat(bathrooms) > 1 ? t('property', 'bathrooms', 'Bathrooms') : t('property', 'bathroom', 'Bathroom');
            metaHtml += '<div class="gas-meta-item"><span class="gas-meta-icon">' + icons.bath + '</span><span>' + bathroomLabel + ': ' + bathroomsDisplay + '</span></div>';
        }
        if (room.unit_type && room.unit_type !== 'double') {
            var unitTypeDisplay = room.unit_type.charAt(0).toUpperCase() + room.unit_type.slice(1);
            metaHtml += '<div class="gas-meta-item"><span class="gas-meta-icon">' + icons.home + '</span><span>' + unitTypeDisplay + '</span></div>';
        }
        $('.gas-room-meta').html(metaHtml);
        
        // Set base price - use todays_rate as fallback if base_price is 0
        var basePrice = parseFloat(room.base_price) || parseFloat(room.todays_rate) || parseFloat(room.price) || 0;
        if (basePrice > 0) {
            $('.gas-price-amount').text(formatPriceShort(basePrice, currency));
        } else {
            $('.gas-price-amount').text('—');
            $('.gas-price-period').text(t('booking', 'select_dates', 'Select dates'));
        }
        // Store base price for later reference
        $roomWidget.data('base-price', basePrice);
        
        // Render gallery
        renderGallery(images);
        
        // Set descriptions - use short_description and full_description fields
        var shortDesc = parseDescription(room.short_description) || parseDescription(room.description) || '';
        var fullDesc = parseDescription(room.full_description) || '';
        
        if (shortDesc) {
            $('.gas-description-short').html('<p>' + shortDesc.replace(/\n/g, '</p><p>') + '</p>');
        } else {
            $('.gas-description-short').html('<p style="color: #64748b; font-style: italic;">' + t('property', 'no_description', 'No description available.') + '</p>');
        }
        
        // Show More Info toggle only if there's a full description different from short
        if (fullDesc && fullDesc !== shortDesc) {
            $('.gas-description-full').html('<p>' + fullDesc.replace(/\n/g, '</p><p>') + '</p>');
            $('.gas-more-info-toggle').show();
        } else {
            $('.gas-more-info-toggle').hide();
            $('.gas-description-full').hide();
        }
        
        // Render amenities grouped by category
        renderAmenities(amenities);
        
        // Build adults and children dropdowns based on occupancy settings
        var maxGuests = room.max_guests || occSettings.max_guests || 4;
        var maxAdults = occSettings.max_adults || maxGuests;
        var childrenAllowed = occSettings.children_allowed !== false;
        var childMaxAge = occSettings.child_max_age || 12;
        var baseOccupancy = occSettings.base_occupancy || 2;
        
        // Default to base occupancy for better UX (price matches listing page)
        var initialAdults = parseInt(guests) || baseOccupancy;
        // Clamp to valid range
        if (initialAdults > maxAdults) initialAdults = maxAdults;
        if (initialAdults < 1) initialAdults = 1;
        var initialChildren = 0;
        
        // Store limits for later use
        $roomWidget.data('max-guests', maxGuests);
        $roomWidget.data('children-allowed', childrenAllowed);
        $roomWidget.data('child-max-age', childMaxAge);
        
        // Adults dropdown
        var $adultsSelect = $('.gas-adults');
        $adultsSelect.empty();
        var adultSingular = t('booking', 'adult', 'Adult');
        var adultPlural = t('booking', 'adults', 'Adults');
        for (var i = 1; i <= maxAdults; i++) {
            $adultsSelect.append('<option value="' + i + '"' + (i == initialAdults ? ' selected' : '') + '>' + i + ' ' + (i > 1 ? adultPlural : adultSingular) + '</option>');
        }
        
        // Children dropdown - max children = maxGuests - adults
        var $childrenSelect = $('.gas-children');
        var $childrenField = $('.gas-children-field');
        
        if (childrenAllowed) {
            var maxChildrenNow = Math.max(0, maxGuests - initialAdults);
            if (maxChildrenNow > 0) {
                $childrenField.removeClass('hidden').show();
                $childrenSelect.empty();
                for (var c = 0; c <= maxChildrenNow; c++) {
                    $childrenSelect.append('<option value="' + c + '"' + (c == initialChildren ? ' selected' : '') + '>' + c + '</option>');
                }
                // Update child age label
                $('.gas-child-age-label').text('(' + t('common', 'under', 'under') + ' ' + childMaxAge + ')');
            } else {
                // No room for children when all adults selected
                $childrenField.addClass('hidden').hide();
            }
        } else {
            $childrenField.addClass('hidden').hide();
        }
        
        // Also keep legacy .gas-guests for backward compatibility
        var guestSingular = t('booking', 'guest', 'Guest');
        var guestPlural = t('booking', 'guests', 'Guests');
        var $guestsSelect = $('.gas-guests');
        if ($guestsSelect.length) {
            $guestsSelect.empty();
            for (var g = 1; g <= maxGuests; g++) {
                $guestsSelect.append('<option value="' + g + '"' + (g == guests ? ' selected' : '') + '>' + g + ' ' + (g > 1 ? guestPlural : guestSingular) + '</option>');
            }
        }
        
        // Store room data and occupancy settings
        $roomWidget.data('room', room);
        $roomWidget.data('currency', currency);
        $roomWidget.data('occupancy-settings', occSettings);
        
        // Load initial calendar
        loadAvailabilityCalendar(room.id || $roomWidget.data('unit-id'), new Date());
        
        // Show map if coordinates available
        var mapTitle = room.property_name || extractText(room.display_name) || room.name;
        if (room.latitude && room.longitude) {
            renderMap(room.latitude, room.longitude, mapTitle);
        } else if (room.city || room.country) {
            // Use city/country for a general location map
            renderMapByAddress((room.city || '') + ', ' + (room.country || ''));
        }
        
        // Show content
        $('.gas-room-loading').hide();
        $('.gas-room-content').show();
        
        // Update translations after content is loaded
        updateStaticTranslations();
        
        // Load offers (upsells are shown on checkout page only)
        var unitId = room.id || $roomWidget.data('unit-id');
        loadOffers(unitId, checkin, checkout, guests);
        
        // If dates were passed, auto-calculate price
        if (checkin && checkout) {
            calculatePrice(unitId, checkin, checkout, guests);
        }
    }
    
    function renderGallery(images) {
        var $gallery = $('.gas-gallery');
        
        if (!images || images.length === 0) {
            $gallery.html('<div class="gas-gallery-placeholder">🏠</div>');
            return;
        }
        
        var html = '';
        var mainUrl = images[0].url || images[0].image_url || '';
        
        // Main large image
        html += '<img class="gas-gallery-main" src="' + mainUrl + '" alt="Room image" data-index="0">';
        
        // Grid of 4 smaller images
        if (images.length > 1) {
            html += '<div class="gas-gallery-grid">';
            for (var i = 1; i < Math.min(5, images.length); i++) {
                var url = images[i].url || images[i].image_url || '';
                if (i === 4 && images.length > 5) {
                    // Show "View all" overlay on last thumbnail
                    html += '<div class="gas-gallery-more" data-index="' + i + '">';
                    html += '<img class="gas-gallery-thumb" src="' + url + '" alt="Thumbnail">';
                    html += '<div class="gas-gallery-more-overlay">View all ' + images.length + ' images</div>';
                    html += '</div>';
                } else {
                    html += '<img class="gas-gallery-thumb" src="' + url + '" alt="Thumbnail" data-index="' + i + '">';
                }
            }
            html += '</div>';
        }
        
        $gallery.html(html);
        
        // Store images for lightbox
        $roomWidget.data('images', images);
    }
    
    function renderAmenities(amenities) {
        if (!amenities || amenities.length === 0) {
            $('.gas-tab-btn[data-tab="features"]').hide();
            return;
        }
        
        // Group by category
        var categories = {};
        amenities.forEach(function(amenity) {
            var cat = amenity.category || 'General';
            if (!categories[cat]) {
                categories[cat] = [];
            }
            categories[cat].push({
                name: amenity.name,
                icon: amenity.icon,
                quantity: amenity.quantity || 1
            });
        });
        
        var html = '';
        for (var cat in categories) {
            html += '<div class="gas-amenities-category">';
            html += '<h4 class="gas-amenities-category-title">' + cat + '</h4>';
            html += '<div class="gas-amenities-list">';
            categories[cat].forEach(function(item) {
                var displayName = parseDescription(item.name) || item.name;
                var icon = item.icon || getAmenityIcon(displayName);
                var quantityPrefix = item.quantity > 1 ? item.quantity + 'x ' : '';
                html += '<div class="gas-amenity-tag"><span class="gas-amenity-icon">' + icon + '</span>' + quantityPrefix + displayName + '</div>';
            });
            html += '</div></div>';
        }
        
        $('.gas-amenities-container').html(html);
    }
    
    // Gallery click - open lightbox
    $(document).on('click', '.gas-gallery-main, .gas-gallery-thumb, .gas-gallery-more', function() {
        var index = parseInt($(this).data('index')) || 0;
        openLightbox(index);
    });
    
    function openLightbox(index) {
        var images = $roomWidget.data('images');
        if (!images || images.length === 0) return;
        
        var $lightbox = $('.gas-lightbox');
        $lightbox.data('current', index);
        updateLightboxImage(index);
        $lightbox.addClass('active');
        $('body').css('overflow', 'hidden');
    }
    
    function updateLightboxImage(index) {
        var images = $roomWidget.data('images');
        var url = images[index].url || images[index].image_url || '';
        $('.gas-lightbox img').attr('src', url);
        $('.gas-lightbox-counter').text((index + 1) + ' / ' + images.length);
    }
    
    $(document).on('click', '.gas-lightbox-close', function() {
        $('.gas-lightbox').removeClass('active');
        $('body').css('overflow', '');
    });
    
    // Click on lightbox image to close
    $(document).on('click', '.gas-lightbox img', function() {
        $('.gas-lightbox').removeClass('active');
        $('body').css('overflow', '');
    });
    
    $(document).on('click', '.gas-lightbox-prev', function(e) {
        e.stopPropagation();
        var images = $roomWidget.data('images');
        var current = $('.gas-lightbox').data('current');
        var newIndex = (current - 1 + images.length) % images.length;
        $('.gas-lightbox').data('current', newIndex);
        updateLightboxImage(newIndex);
    });
    
    $(document).on('click', '.gas-lightbox-next', function(e) {
        e.stopPropagation();
        var images = $roomWidget.data('images');
        var current = $('.gas-lightbox').data('current');
        var newIndex = (current + 1) % images.length;
        $('.gas-lightbox').data('current', newIndex);
        updateLightboxImage(newIndex);
    });
    
    // Close lightbox on background click
    $(document).on('click', '.gas-lightbox', function(e) {
        if ($(e.target).hasClass('gas-lightbox')) {
            $('.gas-lightbox').removeClass('active');
            $('body').css('overflow', '');
        }
    });
    
    // More Info toggle
    $(document).on('click', '.gas-more-info-toggle', function() {
        $(this).toggleClass('active');
        $('.gas-description-full').toggleClass('active');
        
        // Update button text
        var $span = $(this).find('span');
        if ($(this).hasClass('active')) {
            $span.text(t('common', 'less_info', 'Less Information'));
        } else {
            $span.text(t('common', 'more_info', 'More Information'));
        }
    });
    
    // Keyboard navigation for lightbox
    $(document).on('keydown', function(e) {
        if (!$('.gas-lightbox').hasClass('active')) return;
        if (e.key === 'Escape') $('.gas-lightbox-close').click();
        if (e.key === 'ArrowLeft') $('.gas-lightbox-prev').click();
        if (e.key === 'ArrowRight') $('.gas-lightbox-next').click();
    });
    
    // Tabs
    $(document).on('click', '.gas-tab-btn', function() {
        var tab = $(this).data('tab');
        
        $('.gas-tab-btn').removeClass('active');
        $(this).addClass('active');
        
        $('.gas-tab-content').removeClass('active');
        $('.gas-tab-content[data-tab="' + tab + '"]').addClass('active');
        
        // Load reviews when Reviews tab is clicked
        if (tab === 'reviews' && !window.gasReviewsLoaded) {
            var unitId = $('.gas-room-widget').data('unit-id');
            loadRoomReviews(unitId);
        }
    });
    
    // Pre-load reviews check to hide/show tab before user interaction
    function preloadReviewsCheck(unitId) {
        var licenseKey = gasBooking.licenseKey || '';
        $.ajax({
            url: gasBooking.apiUrl + '/api/plugin/reviews?room_id=' + unitId + '&limit=1&license_key=' + encodeURIComponent(licenseKey),
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.reviews && response.reviews.length > 0) {
                    // Has reviews - show the tab
                    $('.gas-tab-btn[data-tab="reviews"]').show();
                } else {
                    // No reviews - hide the tab
                    $('.gas-tab-btn[data-tab="reviews"]').hide();
                }
            },
            error: function() {
                // On error, hide reviews tab
                $('.gas-tab-btn[data-tab="reviews"]').hide();
            }
        });
    }
    
    // Load reviews for a room
    var gasReviewsLoaded = false;
    var gasReviewColors = null;
    
    function loadReviewColors(callback) {
        if (gasReviewColors) {
            callback(gasReviewColors);
            return;
        }
        var clientId = gasBooking.clientId || '';
        if (!clientId) {
            // Default colors
            gasReviewColors = {
                accent: '#667eea', bg: '#ffffff', card_bg: '#ffffff',
                text: '#1e293b', text_secondary: '#64748b', star: '#fbbf24'
            };
            callback(gasReviewColors);
            return;
        }
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/client/' + clientId + '/app-settings/reviews',
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.colors) {
                    gasReviewColors = response.colors;
                } else {
                    gasReviewColors = {
                        accent: '#667eea', bg: '#ffffff', card_bg: '#ffffff',
                        text: '#1e293b', text_secondary: '#64748b', star: '#fbbf24'
                    };
                }
                callback(gasReviewColors);
            },
            error: function() {
                gasReviewColors = {
                    accent: '#667eea', bg: '#ffffff', card_bg: '#ffffff',
                    text: '#1e293b', text_secondary: '#64748b', star: '#fbbf24'
                };
                callback(gasReviewColors);
            }
        });
    }
    
    function loadRoomReviews(unitId) {
        var licenseKey = gasBooking.licenseKey || '';
        
        // First load colors, then load reviews
        loadReviewColors(function(colors) {
            $.ajax({
                url: gasBooking.apiUrl + '/api/plugin/reviews?room_id=' + unitId + '&limit=50&license_key=' + encodeURIComponent(licenseKey),
                method: 'GET',
                dataType: 'json',
                success: function(response) {
                    gasReviewsLoaded = true;
                    $('.gas-reviews-loading').hide();
                    $('.gas-reviews-content').show();
                    
                    if (response.success && response.reviews && response.reviews.length > 0) {
                        var reviews = response.reviews;
                        var total = 0;
                        reviews.forEach(function(r) { total += parseFloat(r.rating || 0); });
                        var avg = (total / reviews.length).toFixed(1);
                        var stars5 = avg > 5 ? avg / 2 : avg;
                        var starsHtml = '';
                        for (var i = 1; i <= 5; i++) {
                            starsHtml += i <= Math.round(stars5) ? '★' : '☆';
                        }
                        
                        // Update summary with colors
                        $('.gas-reviews-summary').css({
                            'background': 'linear-gradient(135deg, ' + colors.accent + ', #8b5cf6)'
                        });
                        $('.gas-reviews-avg').text(avg);
                        $('.gas-reviews-stars').css('color', colors.star).html(starsHtml);
                        $('.gas-reviews-count').text(reviews.length + ' review' + (reviews.length !== 1 ? 's' : ''));
                        
                        var listHtml = '';
                        reviews.forEach(function(r) {
                            var rating = parseFloat(r.rating || 10);
                            var stars5r = rating > 5 ? rating / 2 : rating;
                            var starsR = '';
                            for (var i = 1; i <= 5; i++) {
                                starsR += i <= Math.round(stars5r) ? '★' : '☆';
                            }
                            var initial = (r.guest_name || 'G').charAt(0).toUpperCase();
                            var date = r.review_date ? new Date(r.review_date).toLocaleDateString('en-US', {month: 'short', year: 'numeric'}) : '';
                            var sourceColor = getSourceColor(r.channel_name || '');
                            
                            listHtml += '<div class="gas-review-card" style="background: ' + colors.card_bg + '; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">';
                            listHtml += '<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">';
                            listHtml += '<div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, ' + colors.accent + ', #8b5cf6); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 18px;">' + initial + '</div>';
                            listHtml += '<div style="flex: 1;"><div style="font-weight: 600; color: ' + colors.text + ';">' + (r.guest_name || 'Guest') + '</div>';
                            if (r.guest_country || date) {
                                listHtml += '<div style="font-size: 13px; color: ' + colors.text_secondary + ';">' + (r.guest_country || '') + (r.guest_country && date ? ' • ' : '') + date + '</div>';
                            }
                            listHtml += '</div>';
                            listHtml += '<div style="text-align: right;"><div style="color: ' + colors.star + '; font-size: 16px;">' + starsR + '</div>';
                            if (r.channel_name) {
                                listHtml += '<div style="font-size: 11px; color: ' + sourceColor + '; font-weight: 600;">' + r.channel_name + '</div>';
                            }
                            listHtml += '</div></div>';
                            listHtml += '<p style="color: ' + colors.text_secondary + '; line-height: 1.6; margin: 0;">"' + (r.comment || '') + '"</p>';
                            listHtml += '</div>';
                        });
                        
                        $('.gas-reviews-list').html(listHtml);
                        // Show reviews tab since we have reviews
                        $('.gas-tab-btn[data-tab="reviews"]').show();
                    } else {
                        $('.gas-reviews-summary').hide();
                        $('.gas-reviews-empty').show();
                        // Hide reviews tab if no reviews
                        $('.gas-tab-btn[data-tab="reviews"]').hide();
                        $('.gas-tab-content[data-tab="reviews"]').hide();
                    }
                },
                error: function() {
                    gasReviewsLoaded = true;
                    $('.gas-reviews-loading').hide();
                    $('.gas-reviews-content').show();
                    $('.gas-reviews-summary').hide();
                    $('.gas-reviews-empty').show();
                    // Hide reviews tab on error
                    $('.gas-tab-btn[data-tab="reviews"]').hide();
                    $('.gas-tab-content[data-tab="reviews"]').hide();
                }
            });
        });
    }
    
    function getSourceColor(source) {
        var s = (source || '').toLowerCase();
        if (s.indexOf('airbnb') >= 0) return '#FF5A5F';
        if (s.indexOf('booking') >= 0) return '#003580';
        if (s.indexOf('vrbo') >= 0) return '#3D74C7';
        if (s.indexOf('google') >= 0) return '#4285F4';
        if (s.indexOf('tripadvisor') >= 0) return '#00AF87';
        return '#6B7280';
    }
    
    // Accordion
    $(document).on('click', '.gas-accordion-header', function() {
        var $item = $(this).closest('.gas-accordion-item');
        $item.toggleClass('active');
    });
    
    // Availability Calendar - 2 month view
    var calendarMonth = new Date();
    
    function loadAvailabilityCalendar(unitId, date) {
        var year = date.getFullYear();
        var month = date.getMonth();
        
        // Get data for 2 months - add 1 day to include last day (API uses date < to)
        var firstDay = new Date(year, month, 1);
        var lastDayMonth2 = new Date(year, month + 2, 1); // First day of month after, so < catches last day
        
        var from = firstDay.toISOString().split('T')[0];
        var to = lastDayMonth2.toISOString().split('T')[0];
        
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/availability/' + unitId + '?from=' + from + '&to=' + to,
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                var availability = response.calendar || [];
                renderCalendar(date, availability, 'current');
                
                var nextMonth = new Date(year, month + 1, 1);
                renderCalendar(nextMonth, availability, 'next');
            }
        });
    }
    
    function renderCalendar(date, availability, which) {
        var year = date.getFullYear();
        var month = date.getMonth();
        var firstDay = new Date(year, month, 1);
        var lastDay = new Date(year, month + 1, 0);
        var startDay = firstDay.getDay(); // 0 = Sunday
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Update title - use translated month names
        var monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        var monthNamesFallback = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        var $calendar = $('.gas-calendar[data-month="' + which + '"]');
        var monthName = t('calendar', monthKeys[month], monthNamesFallback[month]);
        $calendar.find('.gas-calendar-title').text(monthName + ' ' + year);
        
        // Create availability lookup
        var availLookup = {};
        availability.forEach(function(day) {
            availLookup[day.date] = day.available;
        });
        
        var html = '';
        
        // Day names - use translated day names
        var dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        var dayNamesFallback = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayKeys.forEach(function(key, i) {
            var dayName = t('calendar', key, dayNamesFallback[i]);
            html += '<div class="gas-calendar-day-name">' + dayName + '</div>';
        });
        
        // Empty cells before first day
        for (var i = 0; i < startDay; i++) {
            html += '<div class="gas-calendar-day empty"></div>';
        }
        
        // Days of month
        for (var d = 1; d <= lastDay.getDate(); d++) {
            var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            var thisDate = new Date(year, month, d);
            var isPast = thisDate < today;
            var isAvailable = availLookup[dateStr];
            
            var classes = 'gas-calendar-day';
            if (isPast) {
                classes += ' past';
            } else if (isAvailable === false) {
                classes += ' unavailable';
            } else if (isAvailable === true) {
                classes += ' available';
            } else {
                // No data - assume unavailable (no availability record means not bookable)
                classes += ' unavailable';
            }
            
            html += '<div class="' + classes + '">' + d + '</div>';
        }
        
        $calendar.find('.gas-calendar-grid').html(html);
    }
    
    $(document).on('click', '.gas-cal-prev', function() {
        calendarMonth.setMonth(calendarMonth.getMonth() - 1);
        var unitId = $roomWidget.data('unit-id');
        loadAvailabilityCalendar(unitId, calendarMonth);
    });
    
    $(document).on('click', '.gas-cal-next', function() {
        calendarMonth.setMonth(calendarMonth.getMonth() + 1);
        var unitId = $roomWidget.data('unit-id');
        loadAvailabilityCalendar(unitId, calendarMonth);
    });
    
    function parseDescription(desc) {
        if (!desc) return '';
        if (typeof desc === 'object') {
            // Try current language first, then English, then any available
            return desc[currentLanguage] || desc.en || desc[Object.keys(desc)[0]] || '';
        }
        try {
            var parsed = JSON.parse(desc);
            return parsed[currentLanguage] || parsed.en || parsed[Object.keys(parsed)[0]] || desc;
        } catch(e) {
            return desc;
        }
    }
    
    // Map functions - using Leaflet for interactive maps
    var propertyMap = null;
    var propertyMarker = null;
    
    function renderMap(lat, lng, title) {
        var $mapContainer = $('.gas-map-container');
        var $map = $('.gas-map');
        
        // Parse coordinates
        lat = parseFloat(lat);
        lng = parseFloat(lng);
        
        if (isNaN(lat) || isNaN(lng)) {
            console.log('Invalid coordinates for map');
            return;
        }
        
        // Show the container
        $mapContainer.show();
        
        // Give DOM time to render, then initialize map
        setTimeout(function() {
            // Destroy existing map if any
            if (propertyMap) {
                propertyMap.remove();
                propertyMap = null;
            }
            
            // Create the Leaflet map
            propertyMap = L.map($map[0], {
                scrollWheelZoom: false,
                dragging: !L.Browser.mobile
            }).setView([lat, lng], 15);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19
            }).addTo(propertyMap);
            
            // Add marker
            propertyMarker = L.marker([lat, lng]).addTo(propertyMap);
            
            if (title) {
                propertyMarker.bindPopup('<strong>' + title + '</strong>').openPopup();
            }
            
            // Fix map size after container is visible
            propertyMap.invalidateSize();
        }, 100);
    }
    
    function renderMapByAddress(address) {
        if (!address || address.trim() === ',' || address.trim() === '') return;
        
        var $mapContainer = $('.gas-map-container');
        var $map = $('.gas-map');
        
        // Use Nominatim geocoding API to get coordinates
        var encodedAddress = encodeURIComponent(address.trim());
        
        $.ajax({
            url: 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodedAddress,
            method: 'GET',
            headers: {
                'User-Agent': 'GAS-Booking-Plugin/1.0'
            },
            success: function(results) {
                if (results && results.length > 0) {
                    var lat = parseFloat(results[0].lat);
                    var lng = parseFloat(results[0].lon);
                    renderMap(lat, lng, address);
                } else {
                    console.log('Address not found:', address);
                }
            },
            error: function(err) {
                console.log('Geocoding error:', err);
            }
        });
    }
    
    // Date change handler
    $(document).on('change', '.gas-checkin, .gas-checkout', function() {
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        var guests = $('.gas-guests').val();
        var unitId = $roomWidget.data('unit-id');
        
        if (checkin && checkout && new Date(checkout) > new Date(checkin)) {
            calculatePrice(unitId, checkin, checkout, guests);
        } else {
            // Reset to select dates state
            $('.gas-price-breakdown').hide();
            $('.gas-occupancy-adjustment').hide();
            $('.gas-book-btn').prop('disabled', true).text(t('booking', 'select_dates_to_check', 'Select dates to check availability'));
        }
    });
    
    // Adults/Children change handler - recalculate price when guests change
    $(document).on('change', '.gas-adults', function() {
        var adults = parseInt($(this).val()) || 1;
        var maxGuests = $roomWidget.data('max-guests') || 4;
        var childrenAllowed = $roomWidget.data('children-allowed') !== false;
        var childMaxAge = $roomWidget.data('child-max-age') || 12;
        
        // Recalculate max children based on selected adults
        var maxChildrenNow = Math.max(0, maxGuests - adults);
        var $childrenSelect = $('.gas-children');
        var $childrenField = $('.gas-children-field');
        var currentChildren = parseInt($childrenSelect.val()) || 0;
        
        if (childrenAllowed && maxChildrenNow > 0) {
            $childrenField.removeClass('hidden').show();
            $childrenSelect.empty();
            for (var c = 0; c <= maxChildrenNow; c++) {
                $childrenSelect.append('<option value="' + c + '">' + c + '</option>');
            }
            // Keep current selection if still valid, otherwise set to max available
            if (currentChildren <= maxChildrenNow) {
                $childrenSelect.val(currentChildren);
            } else {
                $childrenSelect.val(maxChildrenNow);
            }
        } else {
            $childrenField.addClass('hidden').hide();
            $childrenSelect.val(0);
        }
        
        // Now trigger price recalculation
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        var children = parseInt($childrenSelect.val()) || 0;
        var unitId = $roomWidget.data('unit-id');
        var totalGuests = adults + children;
        
        // Update legacy guests dropdown if exists
        if ($('.gas-guests').length) {
            $('.gas-guests').val(totalGuests);
        }
        
        if (checkin && checkout && new Date(checkout) > new Date(checkin)) {
            calculatePrice(unitId, checkin, checkout, totalGuests, adults, children);
        }
    });
    
    // Children change handler - just recalculate price
    $(document).on('change', '.gas-children', function() {
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        var adults = parseInt($('.gas-adults').val()) || 1;
        var children = parseInt($(this).val()) || 0;
        var unitId = $roomWidget.data('unit-id');
        var totalGuests = adults + children;
        
        // Update legacy guests dropdown if exists
        if ($('.gas-guests').length) {
            $('.gas-guests').val(totalGuests);
        }
        
        if (checkin && checkout && new Date(checkout) > new Date(checkin)) {
            calculatePrice(unitId, checkin, checkout, totalGuests, adults, children);
        }
    });
    
    // Legacy guests dropdown change handler
    $(document).on('change', '.gas-guests', function() {
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        var guests = $(this).val();
        var unitId = $roomWidget.data('unit-id');
        
        if (checkin && checkout && new Date(checkout) > new Date(checkin)) {
            calculatePrice(unitId, checkin, checkout, guests);
        }
    });
    
    function calculatePrice(unitId, checkin, checkout, guests, adults, children) {
        var $btn = $('.gas-book-btn');
        $btn.prop('disabled', true).text(t('booking', 'checking_availability', 'Checking availability...'));
        
        // Get selected upsells
        var selectedUpsells = [];
        $('.gas-upsell-item.selected').each(function() {
            selectedUpsells.push({
                id: $(this).data('upsell-id'),
                quantity: parseInt($(this).find('.gas-upsell-qty-value').text()) || 1
            });
        });
        
        // Get voucher code if applied
        var voucherCode = $roomWidget.data('voucher-code') || '';
        
        // Get selected rate type (standard or offer)
        var selectedRate = $roomWidget.data('selected-rate') || 'standard';
        
        // Parse adults and children - fallback to guests for backwards compatibility
        var numAdults = parseInt(adults) || parseInt($('.gas-adults').val()) || parseInt(guests) || 2;
        var numChildren = parseInt(children) || parseInt($('.gas-children').val()) || 0;
        var totalGuests = numAdults + numChildren;
        
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/calculate-price',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                unit_id: unitId,
                check_in: checkin,
                check_out: checkout,
                guests: totalGuests,
                adults: numAdults,
                children: numChildren,
                upsells: selectedUpsells,
                voucher_code: voucherCode,
                rate_type: selectedRate,
                pricing_tier: gasBooking.pricingTier || 'standard'
            }),
            success: function(response) {
                var currency = $roomWidget.data('currency') || gasBooking.currency || '';
                var occSettings = $roomWidget.data('occupancy-settings') || {};
                
                console.log('Calculate price response:', response);
                console.log('Offer from API:', response.offer_applied);
                console.log('Offer from banner:', $roomWidget.data('active-offer'));
                
                if (response.success && response.available) {
                    // Clear any min stay warnings
                    $('.gas-min-stay-warning').remove();
                    
                    var nights = response.nights;
                    var accommodationTotal = response.accommodation_total || 0;
                    var upsellsTotal = response.upsells_total || 0;
                    var offerDiscount = response.offer_discount || 0;
                    var voucherDiscount = response.voucher_discount || 0;
                    var grandTotal = response.grand_total || 0;
                    
                    // Calculate occupancy adjustment for display
                    var occupancyAdjustment = 0;
                    var occupancyLabel = '';
                    if (response.occupancy_adjustment) {
                        occupancyAdjustment = response.occupancy_adjustment;
                        occupancyLabel = response.occupancy_label || 'Guest adjustment';
                    }
                    
                    // Update the top price display with calculated per-night rate
                    var calculatedPerNight = nights > 0 ? Math.round(accommodationTotal / nights) : 0;
                    $('.gas-price-amount').text(formatPriceShort(calculatedPerNight, currency));
                    
                    // Show occupancy adjustment note if applicable
                    if (occupancyAdjustment !== 0) {
                        var adjText = occupancyAdjustment > 0 
                            ? '+' + formatPrice(occupancyAdjustment, currency) + ' for ' + numAdults + ' adult' + (numAdults > 1 ? 's' : '') + (numChildren > 0 ? ' + ' + numChildren + ' child' + (numChildren > 1 ? 'ren' : '') : '')
                            : formatPrice(Math.abs(occupancyAdjustment), currency) + ' single occupancy discount';
                        $('.gas-adjustment-text').text(adjText);
                        $('.gas-occupancy-adjustment').show();
                    } else {
                        $('.gas-occupancy-adjustment').hide();
                    }
                    
                    // Use offer from API response OR from the banner (already loaded)
                    var activeOffer = response.offer_applied || $roomWidget.data('active-offer');
                    
                    // Store pricing data
                    $roomWidget.data('pricing', {
                        nights: nights,
                        accommodationTotal: accommodationTotal,
                        currency: currency,
                        offer: activeOffer,
                        adults: numAdults,
                        children: numChildren,
                        occupancyAdjustment: occupancyAdjustment
                    });
                    
                    // Build rate options if offer exists AND it's not a non-standard tier (corporate/agent)
                    // For non-standard tiers, the adjusted price IS the price - no rate options needed
                    var hideDiscountBadge = activeOffer && activeOffer.hide_discount_badge;
                    
                    if (activeOffer && !hideDiscountBadge) {
                        renderRateOptions(nights, accommodationTotal, activeOffer, currency);
                    } else {
                        // No offer OR non-standard tier - hide rate options, show simple breakdown
                        $('.gas-rate-options').hide();
                        showSimplePricing(nights, accommodationTotal, upsellsTotal, voucherDiscount, grandTotal, currency, occupancyAdjustment, occupancyLabel);
                    }
                    
                    // Update button based on selected rate
                    updateBookingButton(currency);
                    
                    $roomWidget.data('price-details', response);
                } else if (response.min_stay_required) {
                    // MIN STAY NOT MET
                    $('.gas-price-breakdown').hide();
                    $('.gas-rate-options').hide();
                    $('.gas-occupancy-adjustment').hide();
                    
                    // Show min stay warning
                    var nightsWord = response.min_stay_required > 1 ? t('booking', 'nights', 'nights') : t('booking', 'night', 'night');
                    var selectedWord = response.nights_selected > 1 ? t('booking', 'nights', 'nights') : t('booking', 'night', 'night');
                    var minStayHtml = '<div class="gas-min-stay-warning" style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; text-align: center;">';
                    minStayHtml += '<div style="font-weight: 600; color: #92400e; margin-bottom: 0.25rem;">⚠️ ' + t('booking', 'minimum', 'Minimum') + ' ' + response.min_stay_required + ' ' + nightsWord + ' ' + t('booking', 'required', 'required') + '</div>';
                    minStayHtml += '<div style="font-size: 0.85rem; color: #78350f;">' + t('booking', 'you_selected', 'You selected') + ' ' + response.nights_selected + ' ' + selectedWord + '. ' + t('booking', 'choose_longer', 'Please choose a longer stay.') + '</div>';
                    minStayHtml += '</div>';
                    
                    if ($('.gas-min-stay-warning').length) {
                        $('.gas-min-stay-warning').replaceWith(minStayHtml);
                    } else {
                        $('.gas-price-breakdown').before(minStayHtml);
                    }
                    
                    $btn.prop('disabled', true).text(t('booking', 'minimum', 'Minimum') + ' ' + response.min_stay_required + ' ' + nightsWord + ' ' + t('booking', 'required', 'required'));
                } else {
                    // NOT AVAILABLE - Switch to Availability tab and show unavailable price
                    $('.gas-min-stay-warning').remove();
                    $('.gas-tab-btn').removeClass('active');
                    $('.gas-tab-btn[data-tab="availability"]').addClass('active');
                    $('.gas-tab-content').removeClass('active');
                    $('.gas-tab-content[data-tab="availability"]').addClass('active');
                    
                    // Show "Not available" in price area but keep base price for reference
                    var basePrice = parseFloat($roomWidget.data('base-price')) || 0;
                    var currency = $roomWidget.data('currency') || gasBooking.currency || '';
                    if (basePrice > 0) {
                        $('.gas-price-amount').html('<span style="text-decoration: line-through; opacity: 0.5;">' + formatPriceShort(basePrice, currency) + '</span>');
                        $('.gas-price-period').html('<span style="color: #dc2626; font-weight: 600;">' + t('booking', 'not_available', 'Not available') + '</span>');
                    } else {
                        $('.gas-price-amount').text('—');
                        $('.gas-price-period').html('<span style="color: #dc2626; font-weight: 600;">' + t('booking', 'not_available', 'Not available') + '</span>');
                    }
                    
                    $('.gas-price-breakdown').hide();
                    $('.gas-rate-options').hide();
                    $('.gas-occupancy-adjustment').hide();
                    $btn.prop('disabled', true).text(t('booking', 'not_available_selected', 'Not available for selected dates'));
                }
            },
            error: function() {
                $btn.prop('disabled', true).text(t('booking', 'error_checking', 'Error checking availability'));
            }
        });
    }
    
    // Render rate options (Standard vs Offer)
    function renderRateOptions(nights, standardTotal, offer, currency) {
        var perNightStandard = Math.round(standardTotal / nights);
        var discountAmount = 0;
        
        if (offer.discount_type === 'percentage') {
            discountAmount = standardTotal * (offer.discount_value / 100);
        } else {
            discountAmount = parseFloat(offer.discount_value);
        }
        
        var offerTotal = standardTotal - discountAmount;
        var perNightOffer = Math.round(offerTotal / nights);
        var savingsPercent = Math.round((discountAmount / standardTotal) * 100);
        
        var html = '<div class="gas-rate-options">';
        html += '<div class="gas-rate-options-title">Choose your rate:</div>';
        
        // Standard Rate
        html += '<div class="gas-rate-option" data-rate="standard">';
        html += '<div class="gas-rate-radio"><div class="gas-rate-radio-inner"></div></div>';
        html += '<div class="gas-rate-details">';
        html += '<div class="gas-rate-name">Standard Rate</div>';
        html += '<div class="gas-rate-features"><span class="gas-rate-feature">✓ Free cancellation</span></div>';
        html += '</div>';
        html += '<div class="gas-rate-price">';
        html += '<div class="gas-rate-total">' + formatPrice(standardTotal, currency) + '</div>';
        html += '<div class="gas-rate-per-night">' + formatPriceShort(perNightStandard, currency) + '/night</div>';
        html += '</div>';
        html += '</div>';
        
        // Offer Rate
        html += '<div class="gas-rate-option selected" data-rate="offer">';
        html += '<div class="gas-rate-radio"><div class="gas-rate-radio-inner"></div></div>';
        html += '<div class="gas-rate-details">';
        html += '<div class="gas-rate-name">' + offer.name + ' <span class="gas-rate-badge">Save ' + savingsPercent + '%</span></div>';
        html += '<div class="gas-rate-features"><span class="gas-rate-feature warning">✗ Non-refundable</span></div>';
        html += '</div>';
        html += '<div class="gas-rate-price">';
        html += '<div class="gas-rate-total">' + formatPrice(offerTotal, currency) + '</div>';
        html += '<div class="gas-rate-per-night"><s>' + formatPriceShort(perNightStandard, currency) + '</s> ' + formatPriceShort(perNightOffer, currency) + '/night</div>';
        html += '</div>';
        html += '</div>';
        
        html += '</div>';
        
        // Replace or insert rate options
        if ($('.gas-rate-options').length) {
            $('.gas-rate-options').replaceWith(html);
        } else {
            $('.gas-guest-fields').after(html);
        }
        
        // Store totals for later
        $roomWidget.data('standard-total', standardTotal);
        $roomWidget.data('offer-total', offerTotal);
        $roomWidget.data('selected-rate', 'offer'); // Default to offer
        
        // Hide old price breakdown when showing rate options
        $('.gas-price-breakdown').hide();
    }
    
    // Show simple pricing (no offer)
    function showSimplePricing(nights, accommodationTotal, upsellsTotal, voucherDiscount, grandTotal, currency, occupancyAdjustment, occupancyLabel) {
        var perNight = Math.round(accommodationTotal / nights);
        var nightWord = nights > 1 ? t('booking', 'nights', 'nights') : t('booking', 'night', 'night');
        
        $('.gas-nights-text').text(formatPriceShort(perNight, currency) + ' x ' + nights + ' ' + nightWord);
        $('.gas-nights-price').text(formatPrice(accommodationTotal, currency));
        
        // Show occupancy adjustment row if applicable
        if (occupancyAdjustment && occupancyAdjustment !== 0) {
            $('.gas-occupancy-row').show();
            $('.gas-occupancy-label').text(occupancyLabel || t('booking', 'guest_adjustment', 'Guest adjustment'));
            if (occupancyAdjustment > 0) {
                $('.gas-occupancy-amount').text('+' + formatPrice(occupancyAdjustment, currency));
            } else {
                $('.gas-occupancy-amount').text('-' + formatPrice(Math.abs(occupancyAdjustment), currency));
            }
        } else {
            $('.gas-occupancy-row').hide();
        }
        
        if (upsellsTotal > 0) {
            $('.gas-upsells-row').show();
            $('.gas-upsells-total').text('+' + formatPrice(upsellsTotal, currency));
        } else {
            $('.gas-upsells-row').hide();
        }
        
        $('.gas-offer-row').hide();
        
        if (voucherDiscount > 0) {
            $('.gas-voucher-row').show();
            $('.gas-voucher-amount').text('-' + formatPrice(voucherDiscount, currency));
        } else {
            $('.gas-voucher-row').hide();
        }
        
        // Use accommodationTotal for widget display - tax is added at checkout
        var widgetTotal = accommodationTotal + upsellsTotal - voucherDiscount;
        $('.gas-total-price').text(formatPrice(widgetTotal, currency));
        $('.gas-price-breakdown').show();
        
        $roomWidget.data('total-price', widgetTotal);
        $roomWidget.data('standard-total', widgetTotal); // Also set standard-total for button
    }
    
    // Update booking button based on selected rate
    function updateBookingButton(currency) {
        var $btn = $('.gas-book-btn');
        var selectedRate = $roomWidget.data('selected-rate') || 'standard';
        var total;
        
        if (selectedRate === 'offer') {
            total = $roomWidget.data('offer-total') || $roomWidget.data('standard-total');
        } else {
            total = $roomWidget.data('standard-total');
        }
        
        // Add upsells
        var upsellsTotal = 0;
        $('.gas-upsell-item.selected').each(function() {
            // Would need to recalculate based on upsell data
        });
        
        $roomWidget.data('total-price', total);
        $btn.prop('disabled', false).text(t('booking', 'book_now', 'Book Now') + ' - ' + formatPrice(total, currency));
        $('.gas-add-to-cart-btn').prop('disabled', false);
    }
    
    // Rate option click handler
    $(document).on('click', '.gas-rate-option', function() {
        $('.gas-rate-option').removeClass('selected');
        $(this).addClass('selected');
        
        var rate = $(this).data('rate');
        $roomWidget.data('selected-rate', rate);
        
        var currency = $roomWidget.data('currency') || gasBooking.currency || '';
        updateBookingButton(currency);
    });
    
    // Load and display offers
    function loadOffers(unitId, checkin, checkout, guests) {
        if (!gasBooking.clientId) return;
        
        var params = '?unit_id=' + unitId;
        if (checkin) params += '&check_in=' + checkin;
        if (checkout) params += '&check_out=' + checkout;
        if (guests) params += '&guests=' + guests;
        
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/client/' + gasBooking.clientId + '/offers' + params,
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.offers && response.offers.length > 0) {
                    // Show generic banner (specific offer shown in rate options)
                    $('.gas-offers-banner').show();
                    
                    // Store offers for rate selection
                    $roomWidget.data('available-offers', response.offers);
                    $roomWidget.data('active-offer', response.offers[0]);
                } else {
                    $('.gas-offers-banner').hide();
                    $roomWidget.data('available-offers', []);
                    $roomWidget.data('active-offer', null);
                }
            }
        });
    }
    
    // Load and display upsells
    function loadUpsells(unitId) {
        if (!gasBooking.clientId) return;
        
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/client/' + gasBooking.clientId + '/upsells?unit_id=' + unitId,
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.upsells && response.upsells.length > 0) {
                    renderUpsells(response.upsells_by_category || {}, response.upsells);
                    $('.gas-upsells-section').show();
                } else {
                    $('.gas-upsells-section').hide();
                }
            }
        });
    }
    
    // Render upsells list
    function renderUpsells(byCategory, allUpsells) {
        var currency = $roomWidget.data('currency') || gasBooking.currency || '';
        var html = '';
        
        // If we have categories, group them
        if (Object.keys(byCategory).length > 0) {
            for (var category in byCategory) {
                html += '<div class="gas-upsell-category">' + category + '</div>';
                byCategory[category].forEach(function(upsell) {
                    html += renderUpsellItem(upsell, currency);
                });
            }
        } else {
            // No categories, just list all
            allUpsells.forEach(function(upsell) {
                html += renderUpsellItem(upsell, currency);
            });
        }
        
        $('.gas-upsells-list').html(html);
    }
    
    function renderUpsellItem(upsell, currency) {
        var priceText = formatPriceShort(upsell.price, currency);
        var priceLabel = '';
        var perNight = '/' + t('booking', 'night', 'night');
        var perGuest = '/' + t('booking', 'guest', 'guest');
        
        switch (upsell.charge_type) {
            case 'per_night':
                priceLabel = perNight;
                break;
            case 'per_guest':
                priceLabel = perGuest;
                break;
            case 'per_guest_per_night':
                priceLabel = perGuest + perNight;
                break;
            default:
                priceLabel = '';
        }
        
        return '<div class="gas-upsell-item" data-upsell-id="' + upsell.id + '">' +
            '<div class="gas-upsell-checkbox"></div>' +
            '<div class="gas-upsell-info">' +
                '<div class="gas-upsell-name">' + upsell.name + '</div>' +
                (upsell.description ? '<div class="gas-upsell-description">' + upsell.description + '</div>' : '') +
            '</div>' +
            '<div class="gas-upsell-price">' + priceText + '<small>' + priceLabel + '</small></div>' +
        '</div>';
    }
    
    // Upsell item click handler
    $(document).on('click', '.gas-upsell-item', function() {
        $(this).toggleClass('selected');
        
        // Recalculate price if dates are selected
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        var unitId = $roomWidget.data('unit-id');
        
        if (checkin && checkout && unitId) {
            var adults = $('.gas-adults').val() || $('.gas-guests').val();
            var children = $('.gas-children').val() || 0;
            calculatePrice(unitId, checkin, checkout, null, adults, children);
        }
    });
    
    // Voucher toggle
    $(document).on('click', '.gas-voucher-toggle', function() {
        $('.gas-voucher-input').slideToggle();
    });
    
    // Voucher apply
    $(document).on('click', '.gas-voucher-apply', function() {
        var code = $('.gas-voucher-code').val().trim().toUpperCase();
        if (!code) return;
        
        var $btn = $(this);
        $btn.prop('disabled', true).text(t('booking', 'checking', 'Checking...'));
        
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/validate-voucher',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                code: code,
                unit_id: $roomWidget.data('unit-id'),
                check_in: $('.gas-checkin').val(),
                check_out: $('.gas-checkout').val()
            }),
            success: function(response) {
                $btn.prop('disabled', false).text(t('common', 'apply', 'Apply'));
                
                if (response.success && response.valid) {
                    // Store voucher
                    $roomWidget.data('voucher-code', code);
                    
                    // Show applied state
                    $('.gas-voucher-input').hide();
                    $('.gas-voucher-toggle').hide();
                    $('.gas-voucher-name').text('✓ ' + response.voucher.name + ' (' + code + ')');
                    $('.gas-voucher-applied').show();
                    
                    // Recalculate price
                    var checkin = $('.gas-checkin').val();
                    var checkout = $('.gas-checkout').val();
                    if (checkin && checkout) {
                        var adults = $('.gas-adults').val() || $('.gas-guests').val();
                        var children = $('.gas-children').val() || 0;
                        calculatePrice($roomWidget.data('unit-id'), checkin, checkout, null, adults, children);
                    }
                } else {
                    alert(response.error || 'Invalid voucher code');
                }
            },
            error: function() {
                $btn.prop('disabled', false).text(t('common', 'apply', 'Apply'));
                alert(t('booking', 'error_validating_voucher', 'Error validating voucher'));
            }
        });
    });
    
    // Voucher remove
    $(document).on('click', '.gas-voucher-remove', function() {
        $roomWidget.data('voucher-code', '');
        $('.gas-voucher-applied').hide();
        $('.gas-voucher-toggle').show();
        $('.gas-voucher-code').val('');
        
        // Recalculate price
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        if (checkin && checkout) {
            var adults = $('.gas-adults').val() || $('.gas-guests').val();
            var children = $('.gas-children').val() || 0;
            calculatePrice($roomWidget.data('unit-id'), checkin, checkout, null, adults, children);
        }
    });
    
    function calculateNights(checkin, checkout) {
        var start = new Date(checkin);
        var end = new Date(checkout);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    
    // Book button click - redirect to checkout page
    $(document).on('click', '.gas-book-btn:not(:disabled)', function() {
        var unitId = $roomWidget.data('unit-id');
        var propertyId = $roomWidget.data('property-id');
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        var rateType = $roomWidget.data('selected-rate') || 'standard';
        
        // Get adults and children from new dropdowns
        var numAdults = parseInt($('.gas-adults').val()) || parseInt($('.gas-guests').val()) || 2;
        var numChildren = parseInt($('.gas-children').val()) || 0;
        var totalGuests = numAdults + numChildren;
        
        // Build checkout URL - check if URL already has query params
        var checkoutUrl = gasBooking.checkoutUrl || '/checkout/';
        var separator = checkoutUrl.indexOf('?') === -1 ? '?' : '&';
        checkoutUrl += separator + 'room=' + unitId;
        checkoutUrl += '&checkin=' + checkin;
        checkoutUrl += '&checkout=' + checkout;
        checkoutUrl += '&guests=' + totalGuests;
        checkoutUrl += '&adults=' + numAdults;
        checkoutUrl += '&children=' + numChildren;
        checkoutUrl += '&rate=' + rateType;
        var roomCurrency = $roomWidget.data('currency') || '';
        if (roomCurrency) {
            checkoutUrl += '&currency=' + encodeURIComponent(roomCurrency);
        }
        if (propertyId) {
            checkoutUrl += '&property=' + propertyId;
        }
        
        // Redirect to checkout
        window.location.href = checkoutUrl;
    });
    
    // Add to Cart button click
    $(document).on('click', '.gas-add-to-cart-btn:not(:disabled)', function() {
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        
        // Get adults and children from new dropdowns, fall back to legacy guests
        var numAdults = parseInt($('.gas-adults').val()) || parseInt($('.gas-guests').val()) || 2;
        var numChildren = parseInt($('.gas-children').val()) || 0;
        var totalGuests = numAdults + numChildren;
        
        if (!checkin || !checkout) {
            alert('Please select dates first.');
            return;
        }
        
        var checkinDate = new Date(checkin);
        var checkoutDate = new Date(checkout);
        var nights = Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
        
        var roomData = {
            roomId: $roomWidget.data('unit-id'),
            propertyId: $roomWidget.data('property-id'),
            paymentAccountId: $roomWidget.data('payment-account-id') || null,
            name: $('.gas-room-title').text() || 'Room',
            checkin: checkin,
            checkout: checkout,
            nights: nights,
            guests: totalGuests,
            adults: numAdults,
            children: numChildren,
            totalPrice: $roomWidget.data('total-price') || 0,
            currency: $roomWidget.data('currency') || gasBooking.currency || ''
        };
        
        if (window.GASCart && window.GASCart.add(roomData)) {
            alert('Room added to cart!\n\nYou have ' + window.GASCart.items.length + ' room(s) in your cart.');
        }
    });
    
    // View Cart link click
    // View Cart link click - go straight to checkout
    $(document).on('click', '.gas-view-cart-link', function(e) {
        e.preventDefault();
        if (window.GASCart && window.GASCart.items.length > 0) {
            var checkoutUrl = (typeof gasBooking !== 'undefined' && gasBooking.checkoutUrl) ? gasBooking.checkoutUrl : '/checkout/';
            var separator = checkoutUrl.indexOf('?') === -1 ? '?' : '&';
            checkoutUrl += separator + 'group=1';
            window.location.href = checkoutUrl;
        } else {
            alert(t('booking', 'cart_empty', 'Your cart is empty.'));
        }
    });
    
    // Add another room link click - go back to browse other rooms
    $(document).on('click', '.gas-add-another-link', function(e) {
        e.preventDefault();
        // Go to Book Now / rooms listing page with cart dates
        var bookNowUrl = (typeof gasBooking !== 'undefined' && gasBooking.searchResultsUrl) ? gasBooking.searchResultsUrl : '/book-now/';
        
        // Add dates from cart to URL if available
        if (window.GASCart && window.GASCart.items.length > 0) {
            var cartDates = window.GASCart.items[0];
            if (cartDates.checkin && cartDates.checkout) {
                bookNowUrl += '?checkin=' + cartDates.checkin + '&checkout=' + cartDates.checkout;
                if (cartDates.guests) {
                    bookNowUrl += '&guests=' + cartDates.guests;
                }
            }
        }
        
        window.location.href = bookNowUrl;
    });
    
    // Clear Cart link click
    $(document).on('click', '.gas-clear-cart-link', function(e) {
        e.preventDefault();
        if (window.GASCart) {
            window.GASCart.clear();
            alert('Cart cleared.');
        }
    });
    
    // Remove individual room from cart (on checkout page)
    $(document).on('click', '.gas-remove-room-btn', function(e) {
        e.preventDefault();
        var index = parseInt($(this).data('index'));
        
        if (window.GASCart && window.GASCart.items.length > 0) {
            var roomName = window.GASCart.items[index]?.name || 'this room';
            
            if (confirm('Remove ' + roomName + ' from cart?')) {
                window.GASCart.remove(index);
                
                // If cart is now empty, redirect to book now page
                if (window.GASCart.items.length === 0) {
                    var bookNowUrl = (typeof gasBooking !== 'undefined' && gasBooking.searchResultsUrl) ? gasBooking.searchResultsUrl : '/book-now/';
                    window.location.href = bookNowUrl;
                } else {
                    // Reload page to recalculate totals
                    window.location.reload();
                }
            }
        }
    });
    
    // Booking form submit
    $(document).on('submit', '.gas-booking-form', function(e) {
        e.preventDefault();
        
        var $form = $(this);
        var $btn = $form.find('.gas-submit-btn');
        var originalText = $btn.text();
        
        $btn.prop('disabled', true).text(t('booking', 'processing', 'Processing...'));
        
        // Get adults and children from new dropdowns, fall back to legacy guests
        var numAdults = parseInt($('.gas-adults').val()) || parseInt($('.gas-guests').val()) || 2;
        var numChildren = parseInt($('.gas-children').val()) || 0;
        var totalGuests = numAdults + numChildren;
        
        var formData = {
            action: 'gas_create_booking',
            nonce: gasBooking.nonce,
            unit_id: $roomWidget.data('unit-id'),
            checkin: $('.gas-checkin').val(),
            checkout: $('.gas-checkout').val(),
            guests: totalGuests,
            adults: numAdults,
            children: numChildren,
            total_price: $roomWidget.data('total-price'),
            first_name: $form.find('[name="first_name"]').val(),
            last_name: $form.find('[name="last_name"]').val(),
            email: $form.find('[name="email"]').val(),
            phone: $form.find('[name="phone"]').val(),
            notes: $form.find('[name="notes"]').val()
        };
        
        $.ajax({
            url: gasBooking.ajaxUrl,
            method: 'POST',
            data: formData,
            success: function(response) {
                if (response.success) {
                    $('.gas-booking-card-header, .gas-booking-card-body, .gas-booking-form-section').hide();
                    $('.gas-confirmation-text').text(t('booking', 'booking_reference', 'Booking reference') + ': ' + (response.booking_id || t('common', 'confirmed', 'Confirmed')));
                    $('.gas-booking-id').text(t('booking', 'check_email', 'Check your email for confirmation details.'));
                    $('.gas-booking-confirmation').show();
                } else {
                    alert('Booking failed: ' + (response.error || 'Unknown error'));
                    $btn.prop('disabled', false).text(originalText);
                }
            },
            error: function() {
                alert(t('common', 'connection_error', 'Connection error. Please try again.'));
                $btn.prop('disabled', false).text(originalText);
            }
        });
    });
    
    // ========================================
    // Rooms Grid Functions (for Book Now page)
    // ========================================
    
    function checkAllAvailability(checkin, checkout, guests) {
        var $rooms = $('.gas-room-card, .gas-room-row');
        var selectedGuests = parseInt(guests) || 1;
        
        $rooms.each(function() {
            var $room = $(this);
            var unitId = $room.data('room-id');
            var maxGuests = parseInt($room.data('max-guests')) || 2;
            
            // First check if room can accommodate the guests
            if (selectedGuests > maxGuests) {
                $room.removeClass('available').addClass('unavailable guest-exceeded');
                $room.find('.gas-room-price, .gas-room-row-price').html('<span class="gas-too-small">' + t('booking', 'max_guests', 'Max %s guests').replace('%s', maxGuests) + '</span>');
                $room.find('.gas-view-btn, .gas-row-view-btn').css({'background': '#9ca3af', 'pointer-events': 'none'}).text(t('booking', 'not_available', 'Not Available'));
                return; // Skip availability check
            }
            
            // Remove guest-exceeded class if previously set
            $room.removeClass('guest-exceeded');
            
            // Check date availability
            if (checkin && checkout) {
                // Show loading state - remove unavailable overlay during check
                $room.removeClass('unavailable available dates-blocked').addClass('checking');
                $room.find('.gas-room-price, .gas-room-row-price').html('<span class="gas-checking">⏳ Checking...</span>');
                $room.find('.gas-view-btn, .gas-row-view-btn').css({'background': '#6366f1', 'pointer-events': 'none'}).text(t('booking', 'checking_availability', 'Checking availability...'));
                
                // Use calculate-price for accurate pricing with tier support
                $.ajax({
                    url: gasBooking.apiUrl + '/api/public/calculate-price',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        unit_id: unitId,
                        check_in: checkin,
                        check_out: checkout,
                        guests: parseInt($('.gas-guests').val()) || 2,
                        pricing_tier: gasBooking.pricingTier || 'standard'
                    }),
                    success: function(response) {
                        console.log('Price for room ' + unitId + ':', response);
                        
                        if (response.success && response.available) {
                            $room.removeClass('unavailable checking').addClass('available');
                            var totalPrice = response.grand_total || 0;
                            var roomCurrency = response.currency || gasBooking.currency || '';
                            var pricingTier = gasBooking.pricingTier || 'standard';
                            
                            // Check if room has offers (only show badge for standard tier)
                            var priceHtml = formatPriceShort(totalPrice, roomCurrency) + ' <span>total</span>';
                            if ($room.hasClass('has-offers') && pricingTier === 'standard') {
                                priceHtml += '<div class="gas-offers-badge">🏷️ Offers available*</div>';
                            }
                            
                            $room.find('.gas-room-price, .gas-room-row-price').html(priceHtml);
                            $room.find('.gas-view-btn, .gas-row-view-btn').css({'background': '', 'pointer-events': ''}).text(t('booking', 'view_book', 'View & Book'));
                        } else {
                            $room.removeClass('available').addClass('unavailable dates-blocked');
                            $room.find('.gas-room-price, .gas-room-row-price').html('<span class="gas-not-available">' + t('booking', 'not_available_dates', 'Not available on selected dates') + '</span>');
                            $room.find('.gas-view-btn, .gas-row-view-btn').css({'background': '#9ca3af', 'pointer-events': ''}).text(t('booking', 'view_calendar', 'View Calendar')).attr('title', t('booking', 'check_other_dates', 'Check other dates'));
                        }
                    },
                    error: function() {
                        // On error, don't mark as unavailable - just show base price
                        $room.find('.gas-room-price, .gas-room-row-price').html($room.data('base-price') || '');
                    }
                });
            }
        });
        
        // Reorder after all availability checks complete
        var totalRooms = $rooms.length;
        var checkedCount = 0;
        var reorderTimer = null;
        
        function tryReorder() {
            var $checking = $('.gas-room-card.checking, .gas-room-row.checking');
            if ($checking.length === 0) {
                // All done
                clearInterval(reorderTimer);
                reorderRooms();
            }
        }
        
        // Poll every 500ms until all rooms are checked, max 10 seconds
        reorderTimer = setInterval(tryReorder, 500);
        setTimeout(function() {
            clearInterval(reorderTimer);
            reorderRooms(); // Force reorder after 10s regardless
        }, 10000);
    }
    
    // Reorder rooms - unavailable at bottom, always show ALL available rooms
    function reorderRooms() {
        var $container = $('.gas-rooms-grid, .gas-rooms-row-layout');
        if (!$container.length) return;
        
        // Unhide any available rooms that are behind Load More
        $container.find('.gas-room-card.gas-room-hidden.available, .gas-room-row.gas-room-hidden.available').each(function() {
            $(this).removeClass('gas-room-hidden').css('display', '');
            // Load lazy background image
            var imageDiv = this.querySelector('.gas-room-image[data-bg]');
            if (imageDiv) {
                imageDiv.style.background = "url('" + imageDiv.dataset.bg + "') center/cover";
                imageDiv.removeAttribute('data-bg');
            }
        });
        
        var $available = $container.find('.gas-room-card.available, .gas-room-row.available');
        var $unavailable = $container.find('.gas-room-card.unavailable:not(.gas-room-hidden), .gas-room-row.unavailable:not(.gas-room-hidden)');
        var $hiddenUnavailable = $container.find('.gas-room-card.unavailable.gas-room-hidden, .gas-room-row.unavailable.gas-room-hidden');
        
        if ($unavailable.length > 0 && $available.length > 0) {
            // Remove existing divider if any
            $container.find('.gas-rooms-divider').remove();
            
            // Move available rooms first
            $available.prependTo($container);
            
            // Add divider
            $container.append('<div class="gas-rooms-divider">' + t('booking', 'rooms_not_available_divider', 'Rooms below are not available for selected dates') + '</div>');
            
            // Move visible unavailable rooms after divider
            $unavailable.appendTo($container);
            
            // Keep hidden unavailable at the end
            $hiddenUnavailable.appendTo($container);
        }
        
        // Update Load More count to only reflect hidden unavailable rooms
        var hiddenRemaining = $container.find('.gas-room-card.gas-room-hidden').length;
        var $loadMoreContainer = $('.gas-load-more-container');
        if (hiddenRemaining === 0) {
            $loadMoreContainer.hide();
        } else {
            $loadMoreContainer.show();
            var $countSpan = $loadMoreContainer.find('.gas-load-more-count');
            if ($countSpan.length) {
                $countSpan.text('(' + hiddenRemaining + ' more)');
            }
        }
    }
    
    // Also filter on page load if guests param is present
    function filterByGuests() {
        var urlParams = new URLSearchParams(window.location.search);
        var guests = parseInt(urlParams.get('guests')) || 0;
        
        console.log('Filter by guests:', guests);
        
        if (guests > 0) {
            $('.gas-room-card').each(function() {
                var $room = $(this);
                var maxGuestsAttr = $room.attr('data-max-guests');
                var maxGuests = parseInt(maxGuestsAttr) || 2;
                
                console.log('Room max guests:', maxGuests, 'Selected:', guests, 'Attr:', maxGuestsAttr);
                
                if (guests > maxGuests) {
                    $room.addClass('unavailable guest-exceeded');
                    $room.find('.gas-room-price').html('<span class="gas-too-small">' + t('booking', 'max_guests', 'Max %s guests').replace('%s', maxGuests) + '</span>');
                    $room.find('.gas-view-btn').css({'background': '#9ca3af', 'pointer-events': 'none'});
                }
            });
            
            // Reorder rooms after short delay
            setTimeout(function() {
                reorderRoomsByGuests();
            }, 300);
        }
    }
    
    // Reorder rooms - guests exceeded at bottom
    function reorderRoomsByGuests() {
        var $container = $('.gas-rooms-grid');
        if (!$container.length) return;
        
        var $ok = $container.find('.gas-room-card:not(.guest-exceeded)');
        var $exceeded = $container.find('.gas-room-card.guest-exceeded');
        
        if ($exceeded.length > 0 && $ok.length > 0) {
            // Add divider and move exceeded rooms to end
            $container.append('<div class="gas-rooms-divider" style="grid-column: 1/-1; padding: 20px 0; text-align: center; color: #9ca3af; font-size: 14px; border-top: 1px solid #e5e7eb; margin-top: 20px;">Rooms below cannot accommodate ' + (parseInt(new URLSearchParams(window.location.search).get('guests')) || 0) + ' guests</div>');
            $exceeded.appendTo($container);
        }
    }
    
    // Run guest filter on page load
    $(document).ready(function() {
        setTimeout(filterByGuests, 100); // Small delay to ensure DOM is ready
        
        // Load offers and update room card prices
        loadOffersForRoomCards();
    });
    
    // Load offers for all room cards and update display
    function loadOffersForRoomCards() {
        if (!gasBooking.clientId) return;
        
        // Skip loading offers badges for non-standard pricing tiers
        var pricingTier = gasBooking.pricingTier || 'standard';
        if (pricingTier !== 'standard') {
            return; // Don't show "Save X%" badges for corporate/agent sites
        }
        
        var $rooms = $('.gas-room-card');
        if ($rooms.length === 0) return;
        
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/client/' + gasBooking.clientId + '/offers',
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.offers && response.offers.length > 0) {
                    var offers = response.offers;
                    
                    $rooms.each(function() {
                        var $room = $(this);
                        var unitId = $room.data('room-id');
                        
                        // Find applicable offers for this room
                        var applicableOffers = offers.filter(function(offer) {
                            // Check if offer applies to this room (all rooms if room_id is null, or specific room)
                            if (offer.room_id) {
                                return offer.room_id == unitId;
                            }
                            return true; // Applies to all rooms (room_id is null)
                        });
                        
                        if (applicableOffers.length > 0) {
                            // Find the best discount percentage to display
                            var bestDiscount = 0;
                            applicableOffers.forEach(function(offer) {
                                if (offer.discount_type === 'percentage' && offer.discount_value > bestDiscount) {
                                    bestDiscount = offer.discount_value;
                                }
                            });
                            
                            // Add offers badge to existing price
                            var $priceEl = $room.find('.gas-room-price');
                            var currentPrice = $priceEl.html();
                            
                            // Only add badge if not already added
                            if (currentPrice.indexOf('gas-offers-badge') === -1) {
                                var badgeText = bestDiscount > 0 ? 
                                    '🏷️ Save up to ' + Math.round(bestDiscount) + '%*' : 
                                    '🏷️ Offers available*';
                                    
                                $priceEl.html(currentPrice + 
                                    '<div class="gas-offers-badge">' + badgeText + '</div>' +
                                    '<div class="gas-terms-apply">*terms apply</div>');
                                $room.addClass('has-offers');
                            }
                        }
                    });
                }
            }
        });
    }
    
    // Sort rooms - available first, then by price
    function sortRooms(sortBy) {
        var $container = $('.gas-rooms-grid, .gas-rooms-row-layout');
        if (!$container.length) return;
        
        var $rooms = $container.find('.gas-room-card, .gas-room-row');
        var roomsArray = $rooms.toArray();
        
        // Sort function
        roomsArray.sort(function(a, b) {
            var $a = $(a);
            var $b = $(b);
            
            // Always put unavailable at bottom
            var aUnavail = $a.hasClass('unavailable') ? 1 : 0;
            var bUnavail = $b.hasClass('unavailable') ? 1 : 0;
            if (aUnavail !== bUnavail) return aUnavail - bUnavail;
            
            // Then sort by selected criteria
            var aPrice = parseFloat($a.data('price')) || 0;
            var bPrice = parseFloat($b.data('price')) || 0;
            
            switch (sortBy) {
                case 'price-low':
                    return aPrice - bPrice;
                case 'price-high':
                    return bPrice - aPrice;
                case 'random':
                    return Math.random() - 0.5;
                default:
                    return 0; // Keep original order
            }
        });
        
        // Re-append in sorted order
        $container.find('.gas-rooms-divider').remove();
        roomsArray.forEach(function(room) {
            $container.append(room);
        });
        
        // Add divider between available and unavailable
        var $available = $container.find('.gas-room-card.available, .gas-room-row.available');
        var $unavailable = $container.find('.gas-room-card.unavailable, .gas-room-row.unavailable');
        if ($available.length > 0 && $unavailable.length > 0) {
            $unavailable.first().before('<div class="gas-rooms-divider">' + t('booking', 'rooms_not_available_divider', 'Rooms below are not available for selected dates') + '</div>');
        }
    }
    
    // Sort dropdown handler
    $(document).on('change', '.gas-sort-select', function() {
        sortRooms($(this).val());
    });

    // Filter button
    $(document).on('click', '.gas-filter-btn', function() {
        var checkin = $('.gas-filter-checkin').val();
        var checkout = $('.gas-filter-checkout').val();
        var guests = $('.gas-filter-guests').val();
        
        var params = [];
        if (checkin) params.push('checkin=' + checkin);
        if (checkout) params.push('checkout=' + checkout);
        if (guests) params.push('guests=' + guests);
        
        var url = window.location.pathname;
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        window.location.href = url;
    });
    
    // Also expose as global function for inline onclick
    window.gasFilterRooms = function() {
        $('.gas-filter-btn').click();
    };
    
    // ========================================
    // Rooms Grid Map
    // ========================================
    var roomsMap = null;
    var roomMarkers = {};
    var markerClusterGroup = null;
    
    function initRoomsMap() {
        if (!$('#gas-rooms-map').length || typeof gasRoomsMapData === 'undefined' || !gasRoomsMapData.length) {
            return;
        }
        
        // Calculate bounds from all rooms
        var bounds = [];
        gasRoomsMapData.forEach(function(room) {
            if (room.lat && room.lng) {
                bounds.push([room.lat, room.lng]);
            }
        });
        
        if (bounds.length === 0) return;
        
        // Create map
        roomsMap = L.map('gas-rooms-map', {
            scrollWheelZoom: true
        });
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(roomsMap);
        
        // Group rooms by property (same coordinates)
        var propertyGroups = {};
        gasRoomsMapData.forEach(function(room) {
            var key = room.lat + ',' + room.lng;
            if (!propertyGroups[key]) {
                propertyGroups[key] = [];
            }
            propertyGroups[key].push(room);
        });
        
        // Custom icon
        var defaultIcon = L.divIcon({
            className: 'gas-map-marker',
            html: '<div class="gas-marker-pin"></div>',
            iconSize: [30, 40],
            iconAnchor: [15, 40],
            popupAnchor: [0, -40]
        });
        
        // Add markers for each property group
        Object.keys(propertyGroups).forEach(function(key) {
            var rooms = propertyGroups[key];
            var lat = rooms[0].lat;
            var lng = rooms[0].lng;
            
            // Create marker
            var marker = L.marker([lat, lng], {
                icon: defaultIcon
            }).addTo(roomsMap);
            
            // Build popup content
            var popupHtml = '<div class="gas-map-popup">';
            
            if (rooms.length === 1) {
                // Single room popup
                var room = rooms[0];
                var roomDisplayName = extractText(room.display_name) || room.name;
                if (room.image_url) {
                    popupHtml += '<img src="' + room.image_url + '" class="gas-map-popup-image" alt="' + roomDisplayName + '">';
                }
                popupHtml += '<div class="gas-map-popup-title">' + roomDisplayName + '</div>';
                if (room.property_name) {
                    popupHtml += '<div class="gas-map-popup-property">' + room.property_name + '</div>';
                }
                if (room.price > 0) {
                    var mapCurrency = room.currency || gasBooking.currency || '';
                    popupHtml += '<div class="gas-map-popup-price">' + formatPriceShort(room.price, mapCurrency) + ' <small>/ night</small></div>';
                }
                popupHtml += '<a href="' + room.url + '" class="gas-map-popup-link">' + t('booking', 'view_book', 'View &amp; Book') + '</a>';
            } else {
                // Multiple rooms at same location
                popupHtml += '<div class="gas-map-popup-title">' + rooms[0].property_name + '</div>';
                popupHtml += '<div class="gas-map-popup-property">' + rooms.length + ' rooms available</div>';
                popupHtml += '<div style="max-height: 150px; overflow-y: auto; margin-top: 8px;">';
                rooms.forEach(function(room) {
                    var multiRoomName = extractText(room.display_name) || room.name;
                    popupHtml += '<div style="padding: 6px 0; border-bottom: 1px solid #eee;">';
                    popupHtml += '<div style="font-weight: 500; font-size: 13px;">' + multiRoomName + '</div>';
                    if (room.price > 0) {
                        var roomMapCurrency = room.currency || gasBooking.currency || '';
                        popupHtml += '<div style="font-size: 12px; color: #666;">' + formatPriceShort(room.price, roomMapCurrency) + '/night</div>';
                    }
                    popupHtml += '<a href="' + room.url + '" style="font-size: 11px; color: #667eea;">' + t('booking', 'view_book', 'View') + ' →</a>';
                    popupHtml += '</div>';
                });
                popupHtml += '</div>';
            }
            
            popupHtml += '</div>';
            
            marker.bindPopup(popupHtml, {
                maxWidth: 280,
                minWidth: 200
            });
            
            // Store marker reference for each room
            rooms.forEach(function(room) {
                roomMarkers[room.id] = marker;
            });
        });
        
        // Fit map to bounds
        if (bounds.length === 1) {
            roomsMap.setView(bounds[0], 15);
        } else {
            roomsMap.fitBounds(bounds, { padding: [30, 30] });
        }
        
        // Card hover interaction
        $(document).on('mouseenter', '.gas-room-card', function() {
            var roomId = $(this).data('room-id');
            if (roomMarkers[roomId]) {
                roomMarkers[roomId].openPopup();
            }
        });
        
        $(document).on('mouseleave', '.gas-room-card', function() {
            var roomId = $(this).data('room-id');
            if (roomMarkers[roomId]) {
                roomMarkers[roomId].closePopup();
            }
        });
        
        // Card click to navigate
        $(document).on('click', '.gas-room-card', function(e) {
            // Don't navigate if clicking the View & Book button
            if ($(e.target).hasClass('gas-view-btn') || $(e.target).closest('.gas-view-btn').length) {
                return;
            }
            var url = $(this).data('url');
            if (url) {
                window.location.href = url;
            }
        });
    }
    
    // Initialize rooms map if present
    if ($('#gas-rooms-map').length && typeof L !== 'undefined') {
        initRoomsMap();
    }
    
    // ========================================
    // Mobile Calendar Swipe Navigation
    // ========================================
    (function() {
        var $container = $('.gas-calendar-container');
        if (!$container.length) return;
        
        var touchStartX = 0;
        var touchEndX = 0;
        
        $container.on('touchstart', function(e) {
            touchStartX = e.originalEvent.touches[0].clientX;
        });
        
        $container.on('touchend', function(e) {
            touchEndX = e.originalEvent.changedTouches[0].clientX;
            handleSwipe();
        });
        
        function handleSwipe() {
            var swipeThreshold = 50;
            var diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) < swipeThreshold) return;
            
            if (diff > 0) {
                // Swipe left - show next month
                $container.addClass('show-next');
                $('.gas-cal-next').trigger('click');
            } else {
                // Swipe right - show previous month
                $container.removeClass('show-next');
                $('.gas-cal-prev').trigger('click');
            }
        }
        
        // Also handle navigation button clicks on mobile
        $(document).on('click', '.gas-cal-next', function() {
            if (window.innerWidth <= 500) {
                $container.addClass('show-next');
            }
        });
        
        $(document).on('click', '.gas-cal-prev', function() {
            if (window.innerWidth <= 500) {
                $container.removeClass('show-next');
            }
        });
    })();
    
    // =========================================================
    // CHECKOUT PAGE
    // =========================================================
    var $checkoutPage = $('.gas-checkout-page');
    if ($checkoutPage.length) {
        // Hide page hero/title elements (theme-agnostic)
        var heroSelectors = [
            '.page-hero', '.entry-header', '.page-title-section', '.hero-section',
            '.wp-block-post-title', '.page-header', '.page-title', '.entry-title',
            'article > header', '.hentry > header', '.ast-archive-description',
            '.developer-entry-title', '.developer-page-header', '.developer-hero'
        ];
        heroSelectors.forEach(function(selector) {
            $(selector).not('.gas-checkout-page *').hide();
        });
        // Also try to find and hide any dark header sections before our content
        $checkoutPage.prevAll('section, header, div').each(function() {
            var $el = $(this);
            var bg = $el.css('background-color');
            // Hide dark backgrounds (likely hero sections)
            if (bg && (bg.indexOf('rgb(0') === 0 || bg.indexOf('rgb(30') === 0 || bg.indexOf('rgb(31') === 0 || bg.indexOf('#1') === 0 || bg.indexOf('#2') === 0)) {
                $el.hide();
            }
        });
        
        // ========================================
        // GROUP BOOKING CHECKOUT
        // ========================================
        var isGroupBooking = $checkoutPage.data('is-group') == '1';
        
        if (isGroupBooking) {
            console.log('GAS: Group checkout detected');
            
            // Load cart from localStorage
            var cart = [];
            try {
                var saved = localStorage.getItem('gas_cart');
                cart = saved ? JSON.parse(saved) : [];
            } catch(e) {
                console.error('Error loading cart:', e);
            }
            
            if (!cart || cart.length === 0) {
                $('.gas-group-rooms-list').html('<p>' + t('booking', 'cart_empty', 'Your cart is empty.') + ' <a href="/book-now/">' + t('booking', 'browse_rooms', 'Browse rooms') + '</a></p>');
                return;
            }
            
            // Build currency-aware payment groups
            var apiUrl = $checkoutPage.data('api-url');
            var clientId = $checkoutPage.data('client-id');

            var paymentGroups = {};
            cart.forEach(function(item) {
                var groupKey = (item.currency || '') + '_' + (item.paymentAccountId || item.propertyId || 'default');
                if (!paymentGroups[groupKey]) {
                    paymentGroups[groupKey] = {
                        items: [],
                        currency: item.currency || '',
                        propertyId: item.propertyId,
                        accountId: item.paymentAccountId || null,
                        subtotal: 0,
                        taxTotal: 0,
                        taxes: [],
                        depositRule: null,
                        depositAmount: 0,
                        balanceAmount: 0,
                        stripe: null,
                        cardElement: null,
                        stripeEnabled: false,
                        selectedUpsells: []
                    };
                }
                paymentGroups[groupKey].items.push(item);
                paymentGroups[groupKey].subtotal += parseFloat(item.totalPrice) || 0;
            });

            var paymentGroupKeys = Object.keys(paymentGroups);
            var hasMultiplePaymentGroups = paymentGroupKeys.length > 1;
            var currentPaymentGroupIndex = 0;

            function getCurrentGroup() {
                return paymentGroups[paymentGroupKeys[currentPaymentGroupIndex]];
            }

            function recalcGroupDeposit(group) {
                var grandTotal = group.subtotal + (group.taxTotal || 0);
                var upsellsTotal = (group.selectedUpsells || []).reduce(function(sum, u) { return sum + u.price; }, 0);
                grandTotal += upsellsTotal;

                var depositAmt = grandTotal;
                var balanceAmt = 0;

                if (group.depositRule) {
                    var rule = group.depositRule;
                    if (rule.deposit_type === 'percentage') {
                        depositAmt = grandTotal * (rule.deposit_percentage / 100);
                        balanceAmt = grandTotal - depositAmt;
                    } else if (rule.deposit_type === 'fixed') {
                        depositAmt = parseFloat(rule.deposit_fixed_amount) || grandTotal;
                        balanceAmt = grandTotal - depositAmt;
                    }
                }

                group.depositAmount = depositAmt;
                group.balanceAmount = balanceAmt;

                $('.gas-deposit-amount-display').text(formatPrice(depositAmt, group.currency));
                if (balanceAmt > 0) {
                    $('.gas-balance-row').show();
                    $('.gas-balance-amount-display').text(formatPrice(balanceAmt, group.currency));
                }
            }

            // Populate rooms list
            var roomsHtml = '';
            var totalPrice = 0;
            var taxTotal = 0;
            
            cart.forEach(function(item, index) {
                totalPrice += parseFloat(item.totalPrice) || 0;
                
                // Format guests display with adults and children
                var guestsDisplay = '';
                if (item.adults && item.children) {
                    guestsDisplay = item.adults + ' adult' + (item.adults > 1 ? 's' : '') + ', ' + item.children + ' child' + (item.children > 1 ? 'ren' : '');
                } else if (item.adults) {
                    guestsDisplay = item.adults + ' adult' + (item.adults > 1 ? 's' : '');
                } else {
                    guestsDisplay = item.guests + ' guest' + (item.guests > 1 ? 's' : '');
                }
                
                roomsHtml += '<div class="gas-group-room-item" data-index="' + index + '" style="display:flex;align-items:center;gap:12px;padding:12px;background:#f9fafb;border-radius:8px;margin-bottom:10px;">';
                roomsHtml += '<div style="flex:1;">';
                roomsHtml += '<div style="font-weight:600;">' + item.name + '</div>';
                roomsHtml += '<div style="font-size:13px;color:#666;">👤 ' + guestsDisplay + '</div>';
                roomsHtml += '</div>';
                roomsHtml += '<div style="font-weight:600;color:#2563eb;">' + formatPrice(item.totalPrice, item.currency) + '</div>';
                roomsHtml += '<button type="button" class="gas-remove-room-btn" data-index="' + index + '" style="background:none;border:none;color:#dc2626;cursor:pointer;padding:4px 8px;font-size:18px;" title="Remove room">×</button>';
                roomsHtml += '</div>';
            });
            
            $('.gas-group-rooms-list').html(roomsHtml);
            
            // Fetch taxes for each payment group
            paymentGroupKeys.forEach(function(groupKey, gIndex) {
                var group = paymentGroups[groupKey];
                var firstItem = group.items[0];
                console.log('GAS: Fetching taxes for group', gIndex, groupKey);
                $.ajax({
                    url: apiUrl + '/api/public/calculate-price',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        unit_id: firstItem.roomId,
                        check_in: firstItem.checkin,
                        check_out: firstItem.checkout,
                        guests: firstItem.guests,
                        pricing_tier: gasBooking.pricingTier || 'standard'
                    }),
                    success: function(response) {
                        console.log('GAS: Price response for group', gIndex, response);
                        if (response.success && response.taxes && response.taxes.length > 0) {
                            group.taxTotal = 0;
                            group.taxes = [];
                            response.taxes.forEach(function(tax) {
                                var taxAmt = 0;
                                var taxLabel = '';

                                if (tax.type === 'fixed' || tax.amount) {
                                    taxAmt = (parseFloat(tax.amount) || parseFloat(tax.rate) || 0) * group.items.length;
                                    taxLabel = tax.name;
                                } else {
                                    taxAmt = group.subtotal * (parseFloat(tax.rate) / 100);
                                    taxLabel = tax.name + ' (' + tax.rate + '%)';
                                }

                                group.taxTotal += taxAmt;
                                group.taxes.push({ label: taxLabel, amount: taxAmt });
                            });

                            // Only update DOM for the current group
                            if (gIndex === currentPaymentGroupIndex) {
                                var taxesHtml = '';
                                group.taxes.forEach(function(t) {
                                    taxesHtml += '<div class="gas-tax-item" style="display:flex;justify-content:space-between;font-size:14px;color:#666;margin-bottom:4px;">';
                                    taxesHtml += '<span>' + t.label + '</span>';
                                    taxesHtml += '<span>' + formatPrice(t.amount, group.currency) + '</span>';
                                    taxesHtml += '</div>';
                                });
                                $('.gas-taxes-list').html(taxesHtml);
                                $('.gas-taxes-section').show();

                                var grandTotal = group.subtotal + group.taxTotal;
                                $('.gas-grand-total').text(formatPrice(grandTotal, group.currency));
                                console.log('GAS: Taxes applied for group', gIndex, 'total:', grandTotal);
                            }

                            // Recalculate deposit if rule already loaded
                            recalcGroupDeposit(group);
                        } else {
                            console.log('GAS: No taxes for group', gIndex);
                        }
                    },
                    error: function(xhr, status, error) {
                        console.log('GAS: Tax fetch error for group', gIndex, error);
                    }
                });
            });
            
            // Update dates
            if (cart[0].checkin) {
                var checkinDate = new Date(cart[0].checkin + 'T12:00:00');
                $('.gas-checkin-display').text(checkinDate.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric', year:'numeric'}));
            }
            if (cart[0].checkout) {
                var checkoutDate = new Date(cart[0].checkout + 'T12:00:00');
                $('.gas-checkout-display').text(checkoutDate.toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric', year:'numeric'}));
            }
            
            // Update total (before taxes - will be updated after tax fetch)
            var currentGroup = getCurrentGroup();
            $('.gas-grand-total').text(formatPrice(currentGroup.subtotal, currentGroup.currency));
            $('.gas-nights-label').text(currentGroup.items.length + ' room(s) × ' + (currentGroup.items[0].nights || 1) + ' night(s)');
            $('.gas-nights-total').text(formatPrice(currentGroup.subtotal, currentGroup.currency));
            
            // Alias for downstream compatibility
            var hasMultiplePaymentAccounts = hasMultiplePaymentGroups;
            
            // Store for submission
            window.groupCheckoutData = {
                items: cart,
                checkin: cart[0].checkin,
                checkout: cart[0].checkout,
                apiUrl: apiUrl,
                hasMultiplePaymentAccounts: hasMultiplePaymentAccounts,
                hasMultiplePaymentGroups: hasMultiplePaymentGroups,
                paymentGroups: paymentGroups,
                paymentGroupKeys: paymentGroupKeys,
                currentPaymentGroupIndex: currentPaymentGroupIndex
            };
            
            // Show split payment notice if multiple payment groups
            if (hasMultiplePaymentGroups) {
                var groupCount = paymentGroupKeys.length;
                var noticeHtml = '<div class="gas-split-payment-notice" style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">' +
                    '<div style="display: flex; align-items: flex-start; gap: 12px;">' +
                    '<span style="font-size: 24px;">ℹ️</span>' +
                    '<div>' +
                    '<strong style="color: #92400e;">Multiple Payment Groups</strong><br>' +
                    '<span style="color: #78350f;">Your selected rooms use ' + groupCount + ' different payment groups. ' +
                    'You\'ll complete ' + groupCount + ' separate payments, one for each group.</span>' +
                    '</div>' +
                    '</div>' +
                    '</div>';

                // Insert notice at top of checkout
                if ($('.gas-split-payment-notice').length === 0) {
                    $('.gas-checkout-summary, .gas-group-checkout-summary').before(noticeHtml);
                }

                // Show payment groups breakdown
                var groupsHtml = '<div class="gas-payment-groups" style="margin-bottom: 20px;">';
                var groupIndex = 1;
                paymentGroupKeys.forEach(function(gKey) {
                    var group = paymentGroups[gKey];
                    var groupLabel = groupIndex === 1 ? '(Current)' : '';

                    groupsHtml += '<div class="gas-payment-group" data-group-key="' + gKey + '" style="background: ' + (groupIndex === 1 ? '#f0fdf4' : '#f8fafc') + '; border: 1px solid ' + (groupIndex === 1 ? '#22c55e' : '#e2e8f0') + '; border-radius: 8px; padding: 12px; margin-bottom: 8px;">' +
                        '<div style="font-weight: 600; margin-bottom: 8px;">Payment ' + groupIndex + ' of ' + groupCount + ' ' + groupLabel + '</div>' +
                        '<ul style="margin: 0; padding-left: 20px;">';

                    group.items.forEach(function(item) {
                        groupsHtml += '<li>' + item.name + ' - ' + formatPrice(item.totalPrice || 0, group.currency) + '</li>';
                    });

                    groupsHtml += '</ul>' +
                        '<div style="text-align: right; font-weight: 600; margin-top: 8px;">Subtotal: ' + formatPrice(group.subtotal, group.currency) + '</div>' +
                        '</div>';

                    groupIndex++;
                });
                groupsHtml += '</div>';

                // Insert groups after notice
                if ($('.gas-payment-groups').length === 0) {
                    $('.gas-split-payment-notice').after(groupsHtml);
                }
            }
            
            // Override confirm booking for group
            $(document).off('click', '#gas-confirm-booking').on('click', '#gas-confirm-booking', function(e) {
                e.preventDefault();
                
                var $btn = $(this);
                var $form = $('#gas-guest-form');
                
                if (!$form[0].checkValidity()) {
                    $form[0].reportValidity();
                    return;
                }
                
                if (!$('#gas-terms').is(':checked')) {
                    alert('Please accept the Terms & Conditions');
                    return;
                }
                
                $btn.find('.gas-btn-text').hide();
                $btn.find('.gas-btn-loading').show();
                $btn.prop('disabled', true);
                
                var paymentMethod = window.groupCheckoutData.paymentMethod || 'property';

                // Get current payment group
                var curGroup = getCurrentGroup();
                var currentItems = curGroup.items;

                // If card payment, process Stripe first
                if (paymentMethod === 'card' && curGroup.stripe && curGroup.cardElement) {
                    // Payment amount from current group's deposit or full total
                    var paymentAmount = curGroup.depositAmount || (curGroup.subtotal + (curGroup.taxTotal || 0));
                    var currencyCode = (curGroup.currency || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);

                    // Create payment intent - use current group's property
                    $.ajax({
                        url: window.groupCheckoutData.apiUrl + '/api/public/create-payment-intent',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            property_id: curGroup.propertyId,
                            amount: paymentAmount,
                            currency: currencyCode,
                            booking_data: {
                                email: $form.find('[name="email"]').val(),
                                check_in: window.groupCheckoutData.checkin,
                                check_out: window.groupCheckoutData.checkout
                            }
                        }),
                        success: function(response) {
                            if (response.success && response.client_secret) {
                                // Confirm card payment with current group's Stripe
                                curGroup.stripe.confirmCardPayment(response.client_secret, {
                                    payment_method: {
                                        card: curGroup.cardElement,
                                        billing_details: {
                                            name: $form.find('[name="first_name"]').val() + ' ' + $form.find('[name="last_name"]').val(),
                                            email: $form.find('[name="email"]').val()
                                        }
                                    }
                                }).then(function(result) {
                                    if (result.error) {
                                        $('#gas-card-errors').text(result.error.message);
                                        $btn.prop('disabled', false);
                                        $btn.find('.gas-btn-text').show();
                                        $btn.find('.gas-btn-loading').hide();
                                        window.gasNotifyPaymentFailed('card', result.error.message);
                                    } else if (result.paymentIntent.status === 'succeeded') {
                                        // Payment successful, submit booking with payment intent ID
                                        submitGroupBooking($btn, $form, result.paymentIntent.id);
                                    }
                                });
                            } else {
                                alert('Failed to initialize payment: ' + (response.error || 'Please try again'));
                                $btn.prop('disabled', false);
                                $btn.find('.gas-btn-text').show();
                                $btn.find('.gas-btn-loading').hide();
                                window.gasNotifyPaymentFailed('card', 'Payment initialization failed: ' + (response.error || 'Unknown'));
                            }
                        },
                        error: function() {
                            alert('Payment service unavailable. Please try again.');
                            $btn.prop('disabled', false);
                            $btn.find('.gas-btn-text').show();
                            $btn.find('.gas-btn-loading').hide();
                        }
                    });
                } else if (paymentMethod === 'card_guarantee') {
                    if (!window.gasEnigmaCardCaptured) {
                        alert('Please complete the secure card form before confirming your booking.');
                        $btn.prop('disabled', false);
                        $btn.find('.gas-btn-text').show();
                        $btn.find('.gas-btn-loading').hide();
                        return;
                    }
                    submitGroupBooking($btn, $form, null);
                } else {
                    // Pay at property - submit directly
                    submitGroupBooking($btn, $form, null);
                }
            });
            
            function submitGroupBooking($btn, $form, paymentIntentId) {
                $btn.find('.gas-btn-loading').text(t('booking', 'confirming', 'Confirming booking...'));
                
                // Save email to groupCheckoutData for confirmation page
                window.groupCheckoutData.guestEmail = $form.find('[name="email"]').val();
                
                // Submit current payment group
                var submitGroup = getCurrentGroup();
                var itemsToSubmit = submitGroup.items;

                var postData = {
                    rooms: itemsToSubmit.map(function(item) {
                        return {
                            roomId: item.roomId,
                            propertyId: item.propertyId,
                            totalPrice: item.totalPrice,
                            guests: item.guests,
                            name: item.name,
                            currency: item.currency
                        };
                    }),
                    currency: submitGroup.currency,
                    checkin: window.groupCheckoutData.checkin,
                    checkout: window.groupCheckoutData.checkout,
                    guest_first_name: $form.find('[name="first_name"]').val(),
                    guest_last_name: $form.find('[name="last_name"]').val(),
                    guest_email: $form.find('[name="email"]').val(),
                    guest_phone: $form.find('[name="phone"]').val(),
                    guest_address: $form.find('[name="address"]').val() || '',
                    guest_city: $form.find('[name="city"]').val() || '',
                    guest_country: $form.find('[name="country"]').val() || '',
                    guest_postcode: $form.find('[name="postcode"]').val() || '',
                    notes: $form.find('[name="notes"]').val() || '',
                    payment_method: window.groupCheckoutData.paymentMethod || 'property',
                    stripe_payment_intent_id: paymentIntentId || null,
                    deposit_amount: submitGroup.depositAmount || null,
                    upsells: submitGroup.selectedUpsells || [],
                    enigma_reference_id: window.gasEnigmaReferenceId || null,
                    source_site_url: window.location.origin + window.location.pathname,
                    total_amount: submitGroup.subtotal + (submitGroup.taxTotal || 0)
                };
                
                console.log('GAS: Submitting group booking', postData);
                
                $.ajax({
                    url: window.groupCheckoutData.apiUrl + '/api/public/create-group-booking',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(postData),
                    success: function(response) {
                        if (response.success) {
                            // Handle split payments - check if more groups remain
                            if (window.groupCheckoutData.hasMultiplePaymentAccounts) {
                                var completedRoomIds = itemsToSubmit.map(function(item) { return item.roomId; });
                                var remainingItems = window.groupCheckoutData.items.filter(function(item) {
                                    return completedRoomIds.indexOf(item.roomId) === -1;
                                });
                                
                                if (remainingItems.length > 0) {
                                    // Update cart with remaining items
                                    localStorage.setItem('gas_cart', JSON.stringify(remainingItems));
                                    
                                    // Show success for this group and prompt for next
                                    var completedCount = window.groupCheckoutData.currentPaymentGroupIndex + 1;
                                    var totalGroups = Object.keys(window.groupCheckoutData.paymentGroups).length;
                                    
                                    var successHtml = '<div class="gas-split-success" style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">' +
                                        '<div style="font-size: 48px; margin-bottom: 10px;">✅</div>' +
                                        '<h3 style="color: #15803d; margin: 0 0 10px 0;">Payment ' + completedCount + ' of ' + totalGroups + ' Complete!</h3>' +
                                        '<p style="margin: 0 0 15px 0;">Booking Reference: <strong>' + (response.group_booking_id || 'Confirmed') + '</strong></p>' +
                                        '<p style="color: #166534;">You have ' + remainingItems.length + ' more room(s) to book.</p>' +
                                        '<button class="gas-continue-booking-btn" style="background: #22c55e; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 10px;">Continue to Next Payment →</button>' +
                                        '</div>';
                                    
                                    $('.gas-checkout-step-content').html(successHtml);
                                    
                                    // Handle continue button
                                    $('.gas-continue-booking-btn').on('click', function() {
                                        window.location.reload();
                                    });
                                    
                                    return;
                                }
                            }
                            
                            // All payments complete - clear cart and show final confirmation
                            localStorage.removeItem('gas_cart');
                            
                            // Show confirmation
                            $('.gas-checkout-step-content').hide();
                            $('.gas-checkout-confirmation').show();
                            
                            // Reset confirmation elements
                            $('.gas-conf-rooms-list').empty().hide();
                            $('.gas-conf-extras-list').empty().hide();
                            $('.gas-conf-room-name').show();
                            $('.gas-booking-ref').removeClass('gas-ref-small');
                            
                            $('.gas-booking-ref').text(response.group_booking_id || 'Confirmed').addClass('gas-ref-small');
                            
                            // Show property name
                            $('.gas-conf-property-name').text('Group Booking - ' + window.groupCheckoutData.items.length + ' room(s)');
                            $('.gas-conf-room-name').hide(); // Hide the simple room name, we'll use boxes
                            
                            // Build individual room boxes — per-item currency
                            var confGroup = getCurrentGroup();
                            var roomsHtml = '';
                            window.groupCheckoutData.items.forEach(function(item) {
                                var guests = parseInt(item.guests) || 1;
                                roomsHtml += '<div class="gas-conf-room-box">';
                                roomsHtml += '<div><span class="room-name">' + escapeHtml(item.name) + '</span>';
                                roomsHtml += '<div class="room-guests">' + guests + ' guest' + (guests > 1 ? 's' : '') + '</div></div>';
                                roomsHtml += '<span class="room-price">' + formatPrice(item.price || item.totalPrice, item.currency) + '</span>';
                                roomsHtml += '</div>';
                            });
                            $('.gas-conf-rooms-list').html(roomsHtml).show();

                            // Show extras/upsells if any
                            if (confGroup.selectedUpsells && confGroup.selectedUpsells.length > 0) {
                                var extrasHtml = '<div class="gas-conf-extras-title">Extras</div>';
                                confGroup.selectedUpsells.forEach(function(upsell) {
                                    extrasHtml += '<div class="gas-conf-extra-box">';
                                    extrasHtml += '<span class="extra-name">' + escapeHtml(upsell.name) + '</span>';
                                    extrasHtml += '<span class="extra-price">' + formatPrice(upsell.price, confGroup.currency) + '</span>';
                                    extrasHtml += '</div>';
                                });
                                $('.gas-conf-extras-list').html(extrasHtml).show();
                            }

                            // Fill in dates
                            $('.gas-conf-checkin').text(window.groupCheckoutData.checkin);
                            $('.gas-conf-checkout').text(window.groupCheckoutData.checkout);

                            // Fill in guests
                            var totalGuests = 0;
                            window.groupCheckoutData.items.forEach(function(item) {
                                totalGuests += parseInt(item.guests) || 1;
                            });
                            $('.gas-conf-guests').text(totalGuests + ' guest(s)');

                            // Fill in pricing using current group
                            var confTotal = confGroup.subtotal + (confGroup.taxTotal || 0);
                            $('.gas-conf-total').text(formatPrice(confTotal, confGroup.currency));
                            if (confGroup.depositAmount) {
                                $('.gas-conf-deposit').text(formatPrice(confGroup.depositAmount, confGroup.currency));
                            }
                            if (confGroup.balanceAmount > 0) {
                                $('.gas-conf-balance').text(formatPrice(confGroup.balanceAmount, confGroup.currency));
                            }
                            
                            // Fill in email - use saved value from groupCheckoutData
                            var guestEmail = window.groupCheckoutData.guestEmail || $form.find('[name="email"]').val() || '';
                            $('.gas-confirmation-email-text').html('📧 ' + t('booking', 'confirmation_sent', 'Confirmation sent to') + ': <strong>' + guestEmail + '</strong>');
                            
                            // Show bank details on confirmation if pay at property with bank transfer
                            if (window.gasBankDetails && window.gasBankDetails.accounts && window.gasBankDetails.accounts.length > 0) {
                                var bankHtml = '<div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-top: 16px; text-align: left;">';
                                bankHtml += '<h4 style="margin: 0 0 12px 0; color: #92400e; font-size: 14px;">🏦 Bank Transfer Details</h4>';
                                window.gasBankDetails.accounts.forEach(function(account) {
                                    bankHtml += '<div style="background: white; border-radius: 8px; padding: 12px; margin-bottom: 8px; border: 1px solid #fde68a;">';
                                    if (account.bank_name) bankHtml += '<div style="font-weight: 600; color: #92400e; margin-bottom: 6px;">' + account.bank_name + '</div>';
                                    bankHtml += '<table style="width: 100%; font-size: 13px; border-collapse: collapse;">';
                                    if (account.account_name) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c; width: 40%;">Account Name</td><td style="padding: 3px 0; font-weight: 500;">' + account.account_name + '</td></tr>';
                                    if (account.account_number) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">Account No.</td><td style="padding: 3px 0; font-family: monospace;">' + account.account_number + '</td></tr>';
                                    if (account.sort_code) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">Sort Code</td><td style="padding: 3px 0; font-family: monospace;">' + account.sort_code + '</td></tr>';
                                    if (account.iban) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">IBAN</td><td style="padding: 3px 0; font-family: monospace;">' + account.iban + '</td></tr>';
                                    if (account.swift_bic) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">SWIFT/BIC</td><td style="padding: 3px 0; font-family: monospace;">' + account.swift_bic + '</td></tr>';
                                    bankHtml += '</table></div>';
                                });
                                if (window.gasBankDetails.instructions) bankHtml += '<p style="margin: 8px 0 0 0; font-size: 12px; color: #b45309; font-style: italic;">' + window.gasBankDetails.instructions + '</p>';
                                if (window.gasBankDetails.deadline_hours > 0) { var dt = window.gasBankDetails.deadline_hours >= 24 ? Math.floor(window.gasBankDetails.deadline_hours/24) + ' day(s)' : window.gasBankDetails.deadline_hours + ' hours'; bankHtml += '<p style="margin: 8px 0 0; font-size: 12px; color: #b45309; text-align: center;">⏰ Please transfer within ' + dt + '</p>'; }
                                bankHtml += '</div>';
                                $('.gas-confirmation-email-text').after(bankHtml);
                            }
                            
                            $('html, body').animate({scrollTop: 0}, 300);
                        } else {
                            alert('Booking failed: ' + (response.error || 'Please try again'));
                            $btn.find('.gas-btn-text').show();
                            $btn.find('.gas-btn-loading').hide();
                            $btn.prop('disabled', false);
                        }
                    },
                    error: function(xhr) {
                        var errorMsg = t('common', 'connection_error', 'Connection error');
                        try {
                            var resp = JSON.parse(xhr.responseText);
                            if (resp.error) errorMsg = resp.error;
                        } catch(e) {}
                        console.log('GAS: Group booking error', xhr.status, xhr.responseText);
                        alert('Booking error: ' + errorMsg);
                        $btn.find('.gas-btn-text').show();
                        $btn.find('.gas-btn-loading').hide();
                        $btn.prop('disabled', false);
                    }
                });
            }
            
            // Load upsells for current payment group
            var upsellGroup = getCurrentGroup();
            if (clientId && upsellGroup.items[0] && upsellGroup.items[0].roomId) {
                $('.gas-upsells-loading').show();
                $.ajax({
                    url: apiUrl + '/api/public/client/' + clientId + '/upsells?unit_id=' + upsellGroup.items[0].roomId,
                    method: 'GET',
                    success: function(response) {
                        $('.gas-upsells-loading').hide();
                        var ug = getCurrentGroup();
                        if (response.success && response.upsells && response.upsells.length > 0) {
                            var html = '';
                            var perNight = '/' + t('booking', 'night', 'night');
                            var perGuest = '/' + t('booking', 'guest', 'guest');
                            response.upsells.forEach(function(upsell) {
                                var priceLabel = '';
                                switch(upsell.charge_type) {
                                    case 'per_night': priceLabel = perNight; break;
                                    case 'per_guest': priceLabel = perGuest; break;
                                    case 'per_guest_per_night': priceLabel = perGuest + perNight; break;
                                    default: priceLabel = '';
                                }

                                html += '<div class="gas-upsell-card" data-upsell-id="' + upsell.id + '" data-price="' + upsell.price + '" data-charge-type="' + (upsell.charge_type || 'per_booking') + '">';

                                // Icon based on name
                                var icon = '✨';
                                var nameLower = upsell.name.toLowerCase();
                                if (nameLower.includes('parking')) icon = '🚗';
                                else if (nameLower.includes('breakfast')) icon = '🍳';
                                else if (nameLower.includes('dog') || nameLower.includes('pet')) icon = '🐕';
                                else if (nameLower.includes('towel')) icon = '🛁';
                                else if (nameLower.includes('wine') || nameLower.includes('champagne')) icon = '🍾';
                                else if (nameLower.includes('flower') || nameLower.includes('roses')) icon = '💐';
                                else if (nameLower.includes('spa') || nameLower.includes('massage')) icon = '💆';
                                else if (nameLower.includes('airport') || nameLower.includes('transfer')) icon = '🚐';
                                else if (nameLower.includes('late') || nameLower.includes('early')) icon = '🕐';
                                else if (nameLower.includes('cot') || nameLower.includes('baby') || nameLower.includes('crib')) icon = '👶';
                                html += '<div class="gas-upsell-icon">' + icon + '</div>';

                                html += '<div class="gas-upsell-info">';
                                html += '<div class="gas-upsell-name">' + upsell.name + '</div>';
                                if (upsell.description) {
                                    html += '<div class="gas-upsell-desc">' + upsell.description + '</div>';
                                }
                                html += '<div class="gas-upsell-price">' + formatPrice(upsell.price, ug.currency) + '<small>' + priceLabel + '</small></div>';
                                html += '</div>';

                                html += '<div class="gas-upsell-check">✓</div>';
                                html += '</div>';
                            });
                            $('.gas-checkout-upsells').html(html);
                        } else {
                            $('.gas-no-upsells').show();
                        }
                    },
                    error: function() {
                        $('.gas-upsells-loading').hide();
                        $('.gas-no-upsells').show();
                    }
                });
            } else {
                $('.gas-upsells-loading').hide();
                $('.gas-no-upsells').show();
            }
            
            // Load Stripe info for current payment group
            var stripeGroup = getCurrentGroup();
            if (stripeGroup.propertyId) {
                // Check card guarantee availability
                $.ajax({
                    url: apiUrl + '/api/public/property/' + stripeGroup.propertyId + '/card-guarantee-info',
                    method: 'GET',
                    success: function(response) {
                        if (response.success && response.card_guarantee_enabled) {
                            window.groupCheckoutData.cardGuaranteeEnabled = true;
                            var $cgOption = $('.gas-payment-card-guarantee-option');
                            $cgOption.show();
                            $cgOption.find('input').prop('disabled', false);
                            if (response.label) $cgOption.find('.gas-card-guarantee-label').text(response.label);
                            if (response.description) $cgOption.find('.gas-card-guarantee-desc').text(response.description);
                            if (response.success_message) window.gasEnigmaSuccessMessage = response.success_message;
                        }
                    }
                });
                $.ajax({
                    url: apiUrl + '/api/public/property/' + stripeGroup.propertyId + '/stripe-info',
                    method: 'GET',
                    success: function(response) {
                        console.log('GAS: Stripe info response', response);
                        var cg = getCurrentGroup();

                        // Always load payment methods and bank details regardless of Stripe
                        if (response.payment_methods) {
                            var methods = response.payment_methods;
                            var $payAtProperty = $('.gas-payment-option').filter(function() {
                                return $(this).find('input[value="pay_at_property"]').length > 0;
                            });
                            if (methods.pay_at_property === false) $payAtProperty.hide();
                            if (methods.card === false) $('.gas-payment-card-option').hide();
                        }
                        if (response.pay_property_mode) window.gasPayPropertyMode = response.pay_property_mode;
                        if (response.bank_details) window.gasBankDetails = response.bank_details;

                        if (response.pay_property_mode === 'bank_required') {
                            var $pap = $('.gas-payment-option').filter(function() { return $(this).find('input[value="pay_at_property"]').length > 0; });
                            $pap.find('.gas-payment-details span').text('Bank transfer required — booking held until payment received');
                        } else if (response.pay_property_mode === 'bank_optional' && response.bank_details) {
                            var $pap2 = $('.gas-payment-option').filter(function() { return $(this).find('input[value="pay_at_property"]').length > 0; });
                            $pap2.find('.gas-payment-details span').text('Pay by bank transfer or cash on arrival');
                        }

                        // Auto-select pay at property if card not available
                        if (!response.stripe_enabled && response.payment_methods && response.payment_methods.pay_at_property !== false) {
                            var $pap3 = $('.gas-payment-option').filter(function() { return $(this).find('input[value="pay_at_property"]').length > 0; });
                            $pap3.addClass('selected').find('input').prop('checked', true).prop('disabled', false).trigger('change');
                            var mode = window.gasPayPropertyMode || 'no_payment';
                            if ((mode === 'bank_optional' || mode === 'bank_required') && window.gasBankDetails) {
                                window.gasRenderBankDetails(window.gasBankDetails);
                                $('.gas-bank-transfer-panel').slideDown(200);
                            }
                        }

                        if (response.success && response.stripe_enabled) {
                            cg.stripeEnabled = true;

                            // Store deposit rule on current group
                            if (response.deposit_rule) {
                                console.log('GAS: Deposit rule', response.deposit_rule);
                                cg.depositRule = response.deposit_rule;
                                recalcGroupDeposit(cg);
                            }

                            var $cardOption = $('.gas-payment-card-option');
                            $cardOption.removeClass('disabled').addClass('stripe-enabled');
                            $cardOption.find('input').prop('disabled', false);
                            $cardOption.find('.gas-card-status').text('Secure payment via Stripe');

                            // Handle payment method visibility based on account settings
                            if (response.payment_methods) {
                                var methods = response.payment_methods;
                                var $payAtProperty = $('.gas-payment-option').filter(function() {
                                    return $(this).find('input[value="pay_at_property"]').length > 0;
                                });
                                var $paypal = $('.gas-payment-option').filter(function() {
                                    return $(this).find('input[value="paypal"]').length > 0;
                                });

                                if (methods.pay_at_property === false) {
                                    $payAtProperty.hide();
                                }
                                if (methods.paypal === false) {
                                    $paypal.hide();
                                }
                                if (methods.card === false) {
                                    $cardOption.hide();
                                }

                                // Store bank details and pay property mode
                                if (response.pay_property_mode) {
                                    window.gasPayPropertyMode = response.pay_property_mode;
                                }
                                if (response.bank_details) {
                                    window.gasBankDetails = response.bank_details;
                                }

                                // Update Pay at Property description based on mode
                                if (response.pay_property_mode === 'bank_required') {
                                    $payAtProperty.find('.gas-payment-details span').text('Bank transfer required — booking held until payment received');
                                } else if (response.pay_property_mode === 'bank_optional' && response.bank_details) {
                                    $payAtProperty.find('.gas-payment-details span').text('Pay by bank transfer or cash on arrival');
                                }

                                // Auto-select card if it's the only visible option
                                var visibleOptions = $('.gas-payment-option:visible');
                                if (visibleOptions.length === 1) {
                                    visibleOptions.addClass('selected').find('input').prop('checked', true).prop('disabled', false).trigger('change');
                                } else if (methods.pay_at_property === false && methods.card !== false) {
                                    $cardOption.addClass('selected').find('input').prop('checked', true).trigger('change');
                                    $payAtProperty.removeClass('selected');
                                }
                            }

                            if (typeof Stripe !== 'undefined') {
                                cg.stripe = Stripe(response.stripe_publishable_key, {
                                    stripeAccount: response.stripe_account_id
                                });

                                var elements = cg.stripe.elements();
                                cg.cardElement = elements.create('card', {
                                    style: {
                                        base: {
                                            fontSize: '16px',
                                            color: '#374151',
                                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                            '::placeholder': { color: '#9ca3af' }
                                        },
                                        invalid: { color: '#ef4444' }
                                    }
                                });
                                cg.cardElement.mount('#gas-card-element');
                            }
                        }
                    }
                });
            }
            
            // Step navigation for group bookings
            $(document).on('click', '.gas-next-step', function() {
                var nextStep = $(this).data('next');
                var currentStep = nextStep - 1;
                
                if (currentStep === 1) {
                    var $form = $('#gas-guest-form');
                    if (!$form[0].checkValidity()) {
                        $form[0].reportValidity();
                        return;
                    }
                    var email = $('#gas-email').val();
                    var confirm = $('#gas-email-confirm').val();
                    if (email !== confirm) {
                        alert('Email addresses do not match.');
                        return;
                    }
                }
                
                $('.gas-checkout-step-content').hide();
                $('.gas-checkout-step-content[data-step="' + nextStep + '"]').show();
                $('.gas-step').removeClass('active completed');
                $('.gas-step').each(function() {
                    var step = $(this).data('step');
                    if (step < nextStep) $(this).addClass('completed');
                    if (step == nextStep) $(this).addClass('active');
                });
                $('html, body').animate({scrollTop: 0}, 300);
            });
            
            $(document).on('click', '.gas-prev-step', function() {
                var prevStep = $(this).data('prev');
                $('.gas-checkout-step-content').hide();
                $('.gas-checkout-step-content[data-step="' + prevStep + '"]').show();
                $('.gas-step').removeClass('active completed');
                $('.gas-step[data-step="' + prevStep + '"]').addClass('active');
            });
            
            // Upsell selection for group bookings — per-group
            $(document).on('click', '.gas-upsell-card', function() {
                var $card = $(this);
                $card.toggleClass('selected');
                var upsellGroup = getCurrentGroup();

                var upsellId = $card.data('upsell-id');
                var upsellPrice = parseFloat($card.data('price')) || 0;
                var upsellName = $card.find('.gas-upsell-name').text();
                var chargeType = $card.data('charge-type');

                // Calculate actual price based on charge type using current group's items
                var nights = upsellGroup.items[0].nights || 1;
                var guests = upsellGroup.items.reduce(function(sum, item) { return sum + (item.guests || 1); }, 0);
                var actualPrice = upsellPrice;

                if (chargeType === 'per_night') {
                    actualPrice = upsellPrice * nights;
                } else if (chargeType === 'per_guest') {
                    actualPrice = upsellPrice * guests;
                } else if (chargeType === 'per_guest_per_night') {
                    actualPrice = upsellPrice * nights * guests;
                }

                if ($card.hasClass('selected')) {
                    upsellGroup.selectedUpsells.push({
                        id: upsellId,
                        price: actualPrice,
                        name: upsellName
                    });
                } else {
                    upsellGroup.selectedUpsells = upsellGroup.selectedUpsells.filter(function(u) {
                        return u.id !== upsellId;
                    });
                }

                // Update total using current group's values
                var upsellsTotal = upsellGroup.selectedUpsells.reduce(function(sum, u) {
                    return sum + u.price;
                }, 0);
                var newTotal = upsellGroup.subtotal + (upsellGroup.taxTotal || 0) + upsellsTotal;
                $('.gas-grand-total').text(formatPrice(newTotal, upsellGroup.currency));

                // Recalculate deposit using shared helper
                recalcGroupDeposit(upsellGroup);

                // Update upsells display in summary
                if (upsellGroup.selectedUpsells.length > 0) {
                    var extrasHtml = '';
                    upsellGroup.selectedUpsells.forEach(function(u) {
                        extrasHtml += '<div class="gas-price-line"><span>' + u.name + '</span><span>' + formatPrice(u.price, upsellGroup.currency) + '</span></div>';
                    });
                    $('.gas-selected-extras .gas-extras-list').html(extrasHtml);
                    $('.gas-selected-extras').show();
                } else {
                    $('.gas-selected-extras').hide();
                }
            });
            
            // Payment method selection for group bookings
            $(document).on('click', '.gas-payment-option:not(.disabled)', function() {
                $('.gas-payment-option').removeClass('selected');
                $(this).addClass('selected');
                $(this).find('input[type="radio"]').prop('checked', true);
                
                var method = $(this).find('input').val();
                window.groupCheckoutData.paymentMethod = method;
                
                if (method === 'card') {
                    $('.gas-stripe-form').slideDown(200);
                    $('.gas-card-guarantee-form').slideUp(200);
                    $('.gas-bank-transfer-panel').slideUp(200);
                } else if (method === 'card_guarantee') {
                    $('.gas-stripe-form').slideUp(200);
                    $('.gas-card-guarantee-form').slideDown(200);
                    $('.gas-bank-transfer-panel').slideUp(200);
                    window.gasLoadEnigmaForm(getCurrentGroup().propertyId);
                } else if (method === 'pay_at_property') {
                    $('.gas-stripe-form').slideUp(200);
                    $('.gas-card-guarantee-form').slideUp(200);
                    var mode = window.gasPayPropertyMode || 'no_payment';
                    if ((mode === 'bank_optional' || mode === 'bank_required') && window.gasBankDetails) {
                        window.gasRenderBankDetails(window.gasBankDetails);
                        $('.gas-bank-transfer-panel').slideDown(200);
                    } else {
                        $('.gas-bank-transfer-panel').slideUp(200);
                    }
                } else {
                    $('.gas-stripe-form').slideUp(200);
                    $('.gas-card-guarantee-form').slideUp(200);
                    $('.gas-bank-transfer-panel').slideUp(200);
                }
            });
            
            console.log('GAS: Group checkout ready with ' + cart.length + ' rooms');
            return; // Skip single-room checkout code
        }
        // ========================================
        // END GROUP BOOKING
        // ========================================
        
        var checkoutData = {
            unitId: $checkoutPage.data('unit-id'),
            checkin: $checkoutPage.data('checkin'),
            checkout: $checkoutPage.data('checkout'),
            guests: $checkoutPage.data('guests'),
            adults: $checkoutPage.data('adults') || $checkoutPage.data('guests'),
            children: $checkoutPage.data('children') || 0,
            rateType: $checkoutPage.data('rate-type'),
            apiUrl: $checkoutPage.data('api-url'),
            clientId: $checkoutPage.data('client-id'),
            propertyId: $checkoutPage.data('property-id'),
            currency: $checkoutPage.data('currency') || '',
            selectedUpsells: [],
            voucherCode: '',
            pricing: {},
            stripeEnabled: false,
            stripe: null,
            cardElement: null,
            depositRule: null
        };
        
        // Load room details and pricing
        loadCheckoutData();
        
        // Check Stripe availability (only if property ID already available)
        if (checkoutData.propertyId) {
            loadStripeInfo();
            // Check card guarantee
            $.ajax({
                url: checkoutData.apiUrl + '/api/public/property/' + checkoutData.propertyId + '/card-guarantee-info',
                method: 'GET',
                success: function(response) {
                    if (response.success && response.card_guarantee_enabled) {
                        var $cgOption = $('.gas-payment-card-guarantee-option');
                        $cgOption.show();
                        $cgOption.find('input').prop('disabled', false);
                        if (response.label) $cgOption.find('.gas-card-guarantee-label').text(response.label);
                        if (response.description) $cgOption.find('.gas-card-guarantee-desc').text(response.description);
                        if (response.success_message) window.gasEnigmaSuccessMessage = response.success_message;
                    }
                }
            });
        }
        
        function loadStripeInfo() {
            if (!checkoutData.propertyId) return;
            
            $.ajax({
                url: checkoutData.apiUrl + '/api/public/property/' + checkoutData.propertyId + '/stripe-info',
                method: 'GET',
                success: function(response) {
                    if (response.success && response.stripe_enabled) {
                        checkoutData.stripeEnabled = true;
                        checkoutData.stripePublishableKey = response.stripe_publishable_key;
                        checkoutData.stripeAccountId = response.stripe_account_id;
                        checkoutData.depositRule = response.deposit_rule;
                        
                        // Enable card payment option
                        var $cardOption = $('.gas-payment-card-option');
                        $cardOption.removeClass('disabled').addClass('stripe-enabled');
                        $cardOption.find('input').prop('disabled', false);
                        $cardOption.find('.gas-card-status').text('Secure payment via Stripe');
                        
                        // Handle payment method visibility based on account settings
                        if (response.payment_methods) {
                            var methods = response.payment_methods;
                            var $payAtProperty = $('.gas-payment-option').filter(function() {
                                return $(this).find('input[value="pay_at_property"]').length > 0;
                            });
                            var $paypal = $('.gas-payment-option').filter(function() {
                                return $(this).find('input[value="paypal"]').length > 0;
                            });
                            
                            if (methods.pay_at_property === false) {
                                $payAtProperty.hide();
                            }
                            if (methods.paypal === false) {
                                $paypal.hide();
                            }
                            if (methods.card === false) {
                                $cardOption.hide();
                            }
                            
                            // Store bank details and pay property mode
                            if (response.pay_property_mode) {
                                window.gasPayPropertyMode = response.pay_property_mode;
                            }
                            if (response.bank_details) {
                                window.gasBankDetails = response.bank_details;
                            }
                            
                            // Update Pay at Property description based on mode
                            if (response.pay_property_mode === 'bank_required') {
                                $payAtProperty.find('.gas-pay-property-desc').text('Bank transfer required — booking held until payment received');
                            } else if (response.pay_property_mode === 'bank_optional' && response.bank_details) {
                                $payAtProperty.find('.gas-pay-property-desc').text('Pay by bank transfer or cash on arrival');
                            }
                            
                            // Override with custom label/description if set
                            if (response.pay_property_label) {
                                $payAtProperty.find('.gas-pay-property-label').text(response.pay_property_label);
                            }
                            if (response.pay_property_description) {
                                $payAtProperty.find('.gas-pay-property-desc').text(response.pay_property_description);
                            }
                            
                            // Auto-select card if it's the only visible option
                            var visibleOptions = $('.gas-payment-option:visible');
                            if (visibleOptions.length === 1) {
                                visibleOptions.addClass('selected').find('input').prop('checked', true).prop('disabled', false).trigger('change');
                            } else if (methods.pay_at_property === false && methods.card !== false) {
                                $cardOption.addClass('selected').find('input').prop('checked', true).trigger('change');
                                $payAtProperty.removeClass('selected');
                            }
                        }
                        if (typeof Stripe !== 'undefined') {
                            checkoutData.stripe = Stripe(response.stripe_publishable_key, {
                                stripeAccount: response.stripe_account_id
                            });
                            
                            var elements = checkoutData.stripe.elements();
                            checkoutData.cardElement = elements.create('card', {
                                style: {
                                    base: {
                                        fontSize: '16px',
                                        color: '#374151',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                        '::placeholder': { color: '#9ca3af' }
                                    },
                                    invalid: { color: '#ef4444' }
                                }
                            });
                            checkoutData.cardElement.mount('#gas-card-element');
                            
                            // Handle card errors
                            checkoutData.cardElement.on('change', function(event) {
                                var displayError = document.getElementById('gas-card-errors');
                                if (event.error) {
                                    displayError.textContent = event.error.message;
                                } else {
                                    displayError.textContent = '';
                                }
                            });
                        }
                    } else {
                        $('.gas-card-status').text(t('booking', 'not_available_property', 'Not available for this property'));
                        
                        // Still load payment methods and bank details even without Stripe
                        if (response.payment_methods) {
                            var methods = response.payment_methods;
                            var $cardOption = $('.gas-payment-card-option');
                            var $payAtProperty = $('.gas-payment-option').filter(function() {
                                return $(this).find('input[value="pay_at_property"]').length > 0;
                            });
                            
                            if (methods.card === false) $cardOption.hide();
                            if (methods.pay_at_property === false) $payAtProperty.hide();
                            
                            if (response.pay_property_mode) window.gasPayPropertyMode = response.pay_property_mode;
                            if (response.bank_details) window.gasBankDetails = response.bank_details;
                            
                            if (response.pay_property_mode === 'bank_required') {
                                $payAtProperty.find('.gas-pay-property-desc').text('Bank transfer required — booking held until payment received');
                            } else if (response.pay_property_mode === 'bank_optional' && response.bank_details) {
                                $payAtProperty.find('.gas-pay-property-desc').text('Pay by bank transfer or cash on arrival');
                            }
                            
                            // Override with custom label/description if set
                            if (response.pay_property_label) {
                                $payAtProperty.find('.gas-pay-property-label').text(response.pay_property_label);
                            }
                            if (response.pay_property_description) {
                                $payAtProperty.find('.gas-pay-property-desc').text(response.pay_property_description);
                            }
                            
                            // Auto-select pay at property if card is disabled
                            if (methods.card === false && methods.pay_at_property !== false) {
                                $payAtProperty.addClass('selected').find('input').prop('checked', true).prop('disabled', false).trigger('change');
                                // Also show bank details panel
                                var mode = window.gasPayPropertyMode || 'no_payment';
                                if ((mode === 'bank_optional' || mode === 'bank_required') && window.gasBankDetails) {
                                    window.gasRenderBankDetails(window.gasBankDetails);
                                    $('.gas-bank-transfer-panel').slideDown(200);
                                }
                            }
                        }
                    }
                },
                error: function() {
                    $('.gas-card-status').text(t('booking', 'not_available', 'Not available'));
                }
            });
        }
        
        function loadCheckoutData() {
            // Load room info
            $.ajax({
                url: checkoutData.apiUrl + '/api/public/unit/' + checkoutData.unitId,
                method: 'GET',
                success: function(response) {
                    if (response.success && response.unit) {
                        var room = response.unit;
                        // Use display_name for guest-facing title, fall back to name
                        var roomDisplayName = extractText(room.display_name) || room.name;
                        $('.gas-summary-room-name').text(roomDisplayName);
                        // Strip HTML tags from short_description for clean display
                        var shortDesc = extractText(room.short_description) || room.property_name || '';
                        shortDesc = shortDesc.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                        // Truncate if too long
                        if (shortDesc.length > 200) {
                            shortDesc = shortDesc.substring(0, 200) + '...';
                        }
                        $('.gas-summary-property').text(shortDesc);
                        
                        // Set property ID if not already set
                        if (!checkoutData.propertyId && room.property_id) {
                            checkoutData.propertyId = room.property_id;
                            // Now load Stripe info since we have property ID
                            loadStripeInfo();
                        }
                        
                        if (response.images && response.images.length > 0) {
                            var imgUrl = response.images[0].url || response.images[0].image_url;
                            if (imgUrl) {
                                $('.gas-room-thumb').attr('src', imgUrl);
                            }
                        } else {
                            // Use placeholder if no images
                            $('.gas-room-thumb').attr('src', 'https://via.placeholder.com/200x150?text=Room');
                        }
                        
                        checkoutData.room = room;
                        checkoutData.currency = room.currency || gasBooking.currency || '';
                    }
                }
            });
            
            // Load pricing
            $.ajax({
                url: checkoutData.apiUrl + '/api/public/calculate-price',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    unit_id: checkoutData.unitId,
                    check_in: checkoutData.checkin,
                    check_out: checkoutData.checkout,
                    guests: checkoutData.guests,
                    adults: checkoutData.adults,
                    children: checkoutData.children
                }),
                success: function(response) {
                    if (response.success) {
                        checkoutData.pricing = response;
                        
                        // Also try to get channel manager quote for full breakdown
                        $.ajax({
                            url: checkoutData.apiUrl + '/api/public/quote/' + checkoutData.unitId + '?checkin=' + checkoutData.checkin + '&checkout=' + checkoutData.checkout + '&guests=' + (checkoutData.guests || 1),
                            method: 'GET',
                            success: function(quoteResponse) {
                                if (quoteResponse.success && quoteResponse.quote) {
                                    console.log('GAS: CM quote received', quoteResponse.source, quoteResponse.quote);
                                    checkoutData.cmQuote = quoteResponse.quote;
                                    checkoutData.cmQuoteSource = quoteResponse.source;
                                }
                                updateCheckoutPricing();
                            },
                            error: function() {
                                console.log('GAS: No CM quote available, using local pricing');
                                updateCheckoutPricing();
                            }
                        });
                    }
                }
            });
            
            // Load upsells
            if (checkoutData.clientId) {
                $.ajax({
                    url: checkoutData.apiUrl + '/api/public/client/' + checkoutData.clientId + '/upsells?unit_id=' + checkoutData.unitId,
                    method: 'GET',
                    success: function(response) {
                        $('.gas-upsells-loading').hide();
                        if (response.success && response.upsells && response.upsells.length > 0) {
                            renderCheckoutUpsells(response.upsells);
                        } else {
                            $('.gas-no-upsells').show();
                        }
                    },
                    error: function() {
                        $('.gas-upsells-loading').hide();
                        $('.gas-no-upsells').show();
                    }
                });
            } else {
                $('.gas-upsells-loading').hide();
                $('.gas-no-upsells').show();
            }
        }
        
        function updateCheckoutPricing() {
            var p = checkoutData.pricing || {};
            var currency = checkoutData.currency || '';
            var nights = p.nights || 1;
            var accommodationTotal = parseFloat(p.accommodation_total) || 0;
            checkoutData.accommodationTotal = accommodationTotal;
            var upsellsTotal = calculateUpsellsTotal();
            var discount = parseFloat(p.offer_discount) || 0;
            var voucherDiscount = parseFloat(checkoutData.voucherDiscount) || 0;
            var taxes = p.taxes || [];
            var taxTotal = 0;
            
            console.log('Checkout pricing update:', {
                nights: nights,
                accommodationTotal: accommodationTotal,
                discount: discount,
                taxes: taxes,
                cmQuote: checkoutData.cmQuote
            });
            
            // If we have a CM quote (e.g. from Hostaway), use it for clean display
            if (checkoutData.cmQuote) {
                var q = checkoutData.cmQuote;
                var qCurrency = q.currency || currency;
                
                // Show per night x nights line
                var perNight = q.pricePerNight || 0;
                var nightWord = q.nights > 1 ? t('booking', 'nights', 'nights') : t('booking', 'night', 'night');
                $('.gas-nights-label').text(formatPriceShort(Math.round(perNight), qCurrency) + ' x ' + q.nights + ' ' + nightWord);
                $('.gas-nights-total').text(formatPrice(q.breakdown.basePrice, qCurrency));
                
                // Show fees and taxes as line items
                var feeTaxHtml = '';
                if (q.breakdown && q.breakdown.fees) {
                    q.breakdown.fees.forEach(function(fee) {
                        feeTaxHtml += '<div class="gas-fee-item" style="display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.9em; color: #64748b;">';
                        feeTaxHtml += '<span>' + fee.name + '</span>';
                        feeTaxHtml += '<span>' + formatPrice(fee.amount, qCurrency) + '</span>';
                        feeTaxHtml += '</div>';
                    });
                }
                if (q.breakdown && q.breakdown.taxes) {
                    q.breakdown.taxes.forEach(function(tax) {
                        feeTaxHtml += '<div class="gas-tax-item" style="display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.9em; color: #64748b;">';
                        feeTaxHtml += '<span>' + tax.name + '</span>';
                        feeTaxHtml += '<span>' + formatPrice(tax.amount, qCurrency) + '</span>';
                        feeTaxHtml += '</div>';
                    });
                }
                if (feeTaxHtml) {
                    // Insert fee/tax lines after the nights line
                    if ($('.gas-cm-fees-taxes').length === 0) {
                        $('.gas-nights-total').closest('.gas-price-row, .gas-summary-line, div').after('<div class="gas-cm-fees-taxes">' + feeTaxHtml + '</div>');
                    } else {
                        $('.gas-cm-fees-taxes').html(feeTaxHtml);
                    }
                }
                
                // Hide the old taxes section
                $('.gas-taxes-section').hide();
                
                // Discount line
                if (discount > 0) {
                    $('.gas-discount-line').show().find('.gas-discount-amount').text('-' + formatPrice(discount, qCurrency));
                } else {
                    $('.gas-discount-line').hide();
                }
                
                // Voucher discount
                if (voucherDiscount > 0) {
                    $('.gas-voucher-line').show().find('.gas-voucher-discount').text('-' + formatPrice(voucherDiscount, qCurrency));
                } else {
                    $('.gas-voucher-line').hide();
                }
                
                // Upsells
                if (checkoutData.selectedUpsells && checkoutData.selectedUpsells.length > 0) {
                    var extrasHtml = '';
                    checkoutData.selectedUpsells.forEach(function(upsell) {
                        var itemTotal = calculateUpsellItemTotal(upsell);
                        extrasHtml += '<div class="gas-extra-item">';
                        extrasHtml += '<span>' + upsell.name + '</span>';
                        extrasHtml += '<span>' + formatPrice(itemTotal, qCurrency) + '</span>';
                        extrasHtml += '</div>';
                    });
                    $('.gas-extras-list').html(extrasHtml);
                    $('.gas-selected-extras').show();
                } else {
                    $('.gas-selected-extras').hide();
                }
                
                // Grand total (CM total + upsells - discounts)
                var grandTotal = q.total + upsellsTotal - discount - voucherDiscount;
                if (isNaN(grandTotal)) grandTotal = q.total;
                $('.gas-grand-total').text(formatPrice(grandTotal, qCurrency));
                
                // Damage deposit (shown separately)
                if (q.damageDeposit && q.damageDeposit > 0) {
                    if ($('.gas-damage-deposit-line').length === 0) {
                        // Add damage deposit line after total
                        $('.gas-grand-total').closest('.gas-total-row, .gas-summary-total').after(
                            '<div class="gas-damage-deposit-line" style="padding: 0.5rem 0; font-size: 0.9em; color: #64748b; border-top: 1px dashed #e2e8f0; margin-top: 0.5rem;">' +
                            '<div style="display: flex; justify-content: space-between;">' +
                            '<span>Refundable Damage Deposit</span>' +
                            '<span class="gas-deposit-amount">' + formatPrice(q.damageDeposit, qCurrency) + '</span>' +
                            '</div>' +
                            '<div style="font-size: 0.8em; color: #94a3b8; margin-top: 0.25rem;">Collected at property, fully refundable</div>' +
                            '</div>'
                        );
                    } else {
                        $('.gas-deposit-amount').text(formatPrice(q.damageDeposit, qCurrency));
                        $('.gas-damage-deposit-line').show();
                    }
                }
                
                checkoutData.grandTotal = grandTotal;
                checkoutData.total = q.total;
                
                // Store breakdown for Hostaway push
                checkoutData.priceBreakdown = q.breakdown;
                checkoutData.damageDeposit = q.damageDeposit;
                
                // Update cancellation policy based on deposit rule
                if (checkoutData.rateType === 'offer') {
                    $('.gas-policy-standard').hide();
                    $('.gas-policy-nonrefund').show();
                } else if (checkoutData.depositRule && checkoutData.depositRule.refund_policy) {
                    var policyText = '';
                    switch (checkoutData.depositRule.refund_policy) {
                        case 'flexible': policyText = 'Full refund up to 24 hours before check-in'; break;
                        case 'moderate': policyText = 'Full refund up to 5 days before arrival'; break;
                        case 'strict': policyText = '50% refund up to 7 days before arrival'; break;
                        case 'refund_60': policyText = '100% refund up to 60 days before arrival'; break;
                        case 'refund_30': policyText = '100% refund up to 30 days before arrival'; break;
                        case 'refund_14': policyText = '100% refund up to 14 days before arrival'; break;
                        case 'non_refundable': policyText = 'Non-refundable'; break;
                        default: policyText = '';
                    }
                    if (policyText) {
                        $('.gas-policy-standard').html('<p style="font-size: 0.85em; color: #64748b; margin: 0;">📋 ' + policyText + '</p>').show();
                        $('.gas-policy-nonrefund').hide();
                    }
                } else {
                    $('.gas-policy-standard').show();
                    $('.gas-policy-nonrefund').hide();
                }
                
                return;
            }
            
            // Fallback: original pricing display (no CM quote)
            
            // Accommodation line
            var perNight = nights > 0 ? Math.round(accommodationTotal / nights) : 0;
            var nightWord = nights > 1 ? t('booking', 'nights', 'nights') : t('booking', 'night', 'night');
            $('.gas-nights-label').text(formatPriceShort(perNight, currency) + ' x ' + nights + ' ' + nightWord);
            $('.gas-nights-total').text(formatPrice(accommodationTotal, currency));
            
            // Discount line
            if (discount > 0) {
                $('.gas-discount-line').show().find('.gas-discount-amount').text('-' + formatPrice(discount, currency));
            } else {
                $('.gas-discount-line').hide();
            }
            
            // Update selected extras in left sidebar
            if (checkoutData.selectedUpsells && checkoutData.selectedUpsells.length > 0) {
                var extrasHtml = '';
                checkoutData.selectedUpsells.forEach(function(upsell) {
                    var itemTotal = calculateUpsellItemTotal(upsell);
                    extrasHtml += '<div class="gas-extra-item">';
                    extrasHtml += '<span>' + upsell.name + '</span>';
                    extrasHtml += '<span>' + formatPrice(itemTotal, currency) + '</span>';
                    extrasHtml += '</div>';
                });
                $('.gas-extras-list').html(extrasHtml);
                $('.gas-selected-extras').show();
            } else {
                $('.gas-selected-extras').hide();
            }
            
            // Voucher discount
            if (voucherDiscount > 0) {
                $('.gas-voucher-line').show().find('.gas-voucher-discount').text('-' + formatPrice(voucherDiscount, currency));
            } else {
                $('.gas-voucher-line').hide();
            }
            
            // Taxes breakdown
            if (taxes && taxes.length > 0) {
                var taxesHtml = '';
                taxes.forEach(function(tax) {
                    var taxAmt = parseFloat(tax.amount) || 0;
                    taxesHtml += '<div class="gas-tax-item">';
                    taxesHtml += '<span>' + tax.name + '</span>';
                    taxesHtml += '<span>' + formatPrice(taxAmt, currency) + '</span>';
                    taxesHtml += '</div>';
                    taxTotal += taxAmt;
                });
                $('.gas-taxes-list').html(taxesHtml);
                $('.gas-taxes-section').show();
            } else {
                $('.gas-taxes-section').hide();
            }
            
            // Update cancellation policy based on rate type
            if (checkoutData.rateType === 'offer') {
                $('.gas-policy-standard').hide();
                $('.gas-policy-nonrefund').show();
            } else {
                $('.gas-policy-standard').show();
                $('.gas-policy-nonrefund').hide();
            }
            
            // Grand total
            var grandTotal = accommodationTotal + upsellsTotal - discount - voucherDiscount + taxTotal;
            if (isNaN(grandTotal)) grandTotal = 0;
            $('.gas-grand-total').text(formatPrice(grandTotal, currency));
            
            checkoutData.grandTotal = grandTotal;
        }
        
        function calculateUpsellItemTotal(upsell) {
            var nights = checkoutData.pricing.nights || 1;
            var guests = checkoutData.guests || 1;
            var price = parseFloat(upsell.price);
            
            if (upsell.charge_type === 'per_night') {
                price = price * nights;
            } else if (upsell.charge_type === 'per_guest') {
                price = price * guests;
            } else if (upsell.charge_type === 'per_guest_per_night') {
                price = price * nights * guests;
            }
            
            return price * (upsell.quantity || 1);
        }
        
        function calculateUpsellsTotal() {
            var total = 0;
            var nights = checkoutData.pricing.nights || 1;
            var guests = checkoutData.guests || 1;
            
            checkoutData.selectedUpsells.forEach(function(upsell) {
                var price = parseFloat(upsell.price);
                if (upsell.charge_type === 'per_night') {
                    price = price * nights;
                } else if (upsell.charge_type === 'per_guest') {
                    price = price * guests;
                } else if (upsell.charge_type === 'per_guest_per_night') {
                    price = price * nights * guests;
                }
                total += price * (upsell.quantity || 1);
            });
            
            return total;
        }
        
        function renderCheckoutUpsells(upsells) {
            var currency = checkoutData.currency || '';
            var html = '';
            
            console.log('Rendering upsells:', upsells);
            
            var perNight = '/' + t('booking', 'night', 'night');
            var perGuest = '/' + t('booking', 'guest', 'guest');
            upsells.forEach(function(upsell) {
                var priceLabel = '';
                switch (upsell.charge_type) {
                    case 'per_night': priceLabel = perNight; break;
                    case 'per_guest': priceLabel = perGuest; break;
                    case 'per_guest_per_night': priceLabel = perGuest + perNight; break;
                    default: priceLabel = '';
                }
                
                html += '<div class="gas-upsell-card" data-upsell-id="' + upsell.id + '" data-price="' + upsell.price + '" data-charge-type="' + (upsell.charge_type || 'per_booking') + '">';
                
                // Image if available
                if (upsell.image_url) {
                    html += '<div class="gas-upsell-image"><img src="' + upsell.image_url + '" alt="' + upsell.name + '" /></div>';
                } else {
                    // Default icon based on name
                    var icon = '✨';
                    var nameLower = upsell.name.toLowerCase();
                    if (nameLower.includes('parking')) icon = '🚗';
                    else if (nameLower.includes('breakfast')) icon = '🍳';
                    else if (nameLower.includes('dog') || nameLower.includes('pet')) icon = '🐕';
                    else if (nameLower.includes('towel')) icon = '🛁';
                    else if (nameLower.includes('wine') || nameLower.includes('champagne')) icon = '🍾';
                    else if (nameLower.includes('flower') || nameLower.includes('roses')) icon = '💐';
                    else if (nameLower.includes('spa') || nameLower.includes('massage')) icon = '💆';
                    else if (nameLower.includes('airport') || nameLower.includes('transfer')) icon = '🚐';
                    else if (nameLower.includes('late') || nameLower.includes('early')) icon = '🕐';
                    else if (nameLower.includes('cot') || nameLower.includes('baby') || nameLower.includes('crib')) icon = '👶';
                    html += '<div class="gas-upsell-icon">' + icon + '</div>';
                }
                
                html += '<div class="gas-upsell-info">';
                html += '<div class="gas-upsell-name">' + upsell.name + '</div>';
                if (upsell.description) {
                    html += '<div class="gas-upsell-desc">' + upsell.description + '</div>';
                }
                html += '<div class="gas-upsell-price">' + formatPriceShort(upsell.price, currency) + '<small>' + priceLabel + '</small></div>';
                html += '</div>';
                
                html += '<div class="gas-upsell-check">✓</div>';
                html += '</div>';
            });
            
            if (html === '') {
                $('.gas-no-upsells').show();
            } else {
                $('.gas-checkout-upsells').html(html);
            }
        }
        
        // Upsell click handler
        $(document).on('click', '.gas-upsell-card', function() {
            var $card = $(this);
            var upsellId = $card.data('upsell-id');
            var price = $card.data('price');
            var chargeType = $card.data('charge-type');
            var name = $card.find('.gas-upsell-name').text();
            
            if ($card.hasClass('selected')) {
                $card.removeClass('selected');
                checkoutData.selectedUpsells = checkoutData.selectedUpsells.filter(function(u) {
                    return u.id !== upsellId;
                });
            } else {
                $card.addClass('selected');
                checkoutData.selectedUpsells.push({
                    id: upsellId,
                    name: name,
                    price: price,
                    charge_type: chargeType,
                    quantity: 1
                });
            }
            
            updateCheckoutPricing();
        });
        
        // Email confirmation match
        $(document).on('input', '#gas-email, #gas-email-confirm', function() {
            var email = $('#gas-email').val();
            var confirm = $('#gas-email-confirm').val();
            
            if (confirm.length > 0) {
                if (email === confirm) {
                    $('.gas-email-match').show();
                    $('.gas-email-mismatch').hide();
                } else {
                    $('.gas-email-match').hide();
                    $('.gas-email-mismatch').show();
                }
            } else {
                $('.gas-email-match, .gas-email-mismatch').hide();
            }
        });
        
        // Step navigation
        $(document).on('click', '.gas-next-step', function() {
            var nextStep = $(this).data('next');
            var currentStep = nextStep - 1;
            
            // Validate current step
            if (currentStep === 1) {
                var $form = $('#gas-guest-form');
                var isValid = $form[0].checkValidity();
                
                // Check email match
                var email = $('#gas-email').val();
                var confirm = $('#gas-email-confirm').val();
                if (email !== confirm) {
                    alert('Email addresses do not match. Please check and try again.');
                    return;
                }
                
                if (!isValid) {
                    $form[0].reportValidity();
                    return;
                }
            }
            
            // Hide current, show next
            $('.gas-checkout-step-content').hide();
            $('.gas-checkout-step-content[data-step="' + nextStep + '"]').show();
            
            // Update step indicators
            $('.gas-step').removeClass('active');
            $('.gas-step[data-step="' + nextStep + '"]').addClass('active');
            $('.gas-step').each(function() {
                if ($(this).data('step') < nextStep) {
                    $(this).addClass('completed');
                }
            });
            
            // Scroll to top
            $('html, body').animate({ scrollTop: $checkoutPage.offset().top - 20 }, 300);
        });
        
        $(document).on('click', '.gas-prev-step', function() {
            var prevStep = $(this).data('prev');
            
            $('.gas-checkout-step-content').hide();
            $('.gas-checkout-step-content[data-step="' + prevStep + '"]').show();
            
            $('.gas-step').removeClass('active completed');
            $('.gas-step[data-step="' + prevStep + '"]').addClass('active');
            $('.gas-step').each(function() {
                if ($(this).data('step') < prevStep) {
                    $(this).addClass('completed');
                }
            });
        });
        
        // Payment option selection
        $(document).on('click', '.gas-payment-option:not(.disabled)', function() {
            $('.gas-payment-option').removeClass('selected');
            $(this).addClass('selected');
            $(this).find('input').prop('checked', true);
            
            // Show/hide Stripe form based on selection
            var paymentMethod = $(this).find('input').val();
            if (paymentMethod === 'card' && checkoutData.stripeEnabled) {
                $('.gas-stripe-form').slideDown(200);
                
                // Calculate deposit amount
                var total = checkoutData.grandTotal || 0;
                var depositAmount = total;
                var balanceAmount = 0;
                
                if (checkoutData.depositRule) {
                    var rule = checkoutData.depositRule;
                    if (rule.deposit_type === 'percentage') {
                        depositAmount = total * (rule.deposit_percentage / 100);
                        balanceAmount = total - depositAmount;
                    } else if (rule.deposit_type === 'fixed') {
                        depositAmount = parseFloat(rule.deposit_fixed_amount) || total;
                        balanceAmount = total - depositAmount;
                    } else if (rule.deposit_type === 'first_night') {
                        depositAmount = checkoutData.pricing?.base_rate || total;
                        balanceAmount = total - depositAmount;
                    }
                    // 'full' type means depositAmount = total
                }
                
                checkoutData.depositAmount = depositAmount;
                checkoutData.balanceAmount = balanceAmount;
                
                var currency = checkoutData.currency || '';
                $('.gas-deposit-amount-display').text(formatPrice(depositAmount, currency));
                
                if (balanceAmount > 0) {
                    $('.gas-balance-row').show();
                    $('.gas-balance-amount-display').text(formatPrice(balanceAmount, currency));
                } else {
                    $('.gas-balance-row').hide();
                }
            } else if (paymentMethod === 'card_guarantee') {
                $('.gas-stripe-form').slideUp(200);
                $('.gas-card-guarantee-form').slideDown(200);
                $('.gas-bank-transfer-panel').slideUp(200);
                window.gasLoadEnigmaForm(checkoutData.propertyId);
            } else if (paymentMethod === 'pay_at_property') {
                $('.gas-stripe-form').slideUp(200);
                $('.gas-card-guarantee-form').slideUp(200);
                var mode = window.gasPayPropertyMode || 'no_payment';
                if ((mode === 'bank_optional' || mode === 'bank_required') && window.gasBankDetails) {
                    window.gasRenderBankDetails(window.gasBankDetails);
                    $('.gas-bank-transfer-panel').slideDown(200);
                } else {
                    $('.gas-bank-transfer-panel').slideUp(200);
                }
            } else {
                $('.gas-stripe-form').slideUp(200);
                $('.gas-card-guarantee-form').slideUp(200);
                $('.gas-bank-transfer-panel').slideUp(200);
            }
        });
        
        // Voucher apply
        $(document).on('click', '.gas-btn-apply', function() {
            var code = $('.gas-voucher-input').val().trim().toUpperCase();
            if (!code) return;
            
            var $btn = $(this);
            $btn.prop('disabled', true).text(t('booking', 'checking', 'Checking...'));
            
            $.ajax({
                url: checkoutData.apiUrl + '/api/public/validate-voucher',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    code: code,
                    unit_id: checkoutData.unitId,
                    check_in: checkoutData.checkin,
                    check_out: checkoutData.checkout
                }),
                success: function(response) {
                    $btn.prop('disabled', false).text(t('common', 'apply', 'Apply'));
                    
                    if (response.success && response.valid) {
                        checkoutData.voucherCode = code;
                        checkoutData.voucher = response.voucher;
                        $('.gas-voucher-result').html('<span class="gas-voucher-success">✓ ' + response.voucher.name + ' applied!</span>');
                        
                        // Show voucher discount in summary
                        var discount = 0;
                        var subtotal = checkoutData.grandTotal;
                        if (response.voucher.discount_type === 'percentage') {
                            discount = subtotal * (response.voucher.discount_value / 100);
                        } else {
                            discount = parseFloat(response.voucher.discount_value);
                        }
                        
                        $('.gas-voucher-line').show();
                        $('.gas-voucher-label').text('Promo: ' + code);
                        $('.gas-voucher-discount').text('-' + formatPrice(discount, checkoutData.currency));
                        
                        checkoutData.voucherDiscount = discount;
                        checkoutData.grandTotal = checkoutData.grandTotal - discount;
                        $('.gas-grand-total').text(formatPrice(checkoutData.grandTotal, checkoutData.currency));
                    } else {
                        $('.gas-voucher-result').html('<span class="gas-voucher-error">' + (response.error || 'Invalid voucher code') + '</span>');
                    }
                },
                error: function() {
                    $btn.prop('disabled', false).text(t('common', 'apply', 'Apply'));
                    $('.gas-voucher-result').html('<span class="gas-voucher-error">Error checking voucher</span>');
                }
            });
        });
        
        // Confirm booking
        $(document).on('click', '#gas-confirm-booking', function() {
            var $btn = $(this);
            
            // Check terms
            if (!$('#gas-terms').is(':checked')) {
                alert('Please agree to the Terms & Conditions to continue.');
                return;
            }
            
            var paymentMethod = $('input[name="payment_method"]:checked').val();
            
            // If card payment selected, process with Stripe first
            if (paymentMethod === 'card' && checkoutData.stripeEnabled) {
                processCardPayment($btn);
                return;
            }
            
            // If card guarantee, validate card was captured
            if (paymentMethod === 'card_guarantee') {
                if (!window.gasEnigmaCardCaptured) {
                    alert('Please complete the secure card form before confirming your booking.');
                    return;
                }
            }
            
            // Otherwise, proceed with pay at property / card guarantee
            submitBooking($btn, null);
        });
        
        function processCardPayment($btn) {
            $btn.prop('disabled', true);
            $btn.find('.gas-btn-text').hide();
            $btn.find('.gas-btn-loading').text(t('booking', 'processing_payment', 'Processing payment...')).show();
            
            var $form = $('#gas-guest-form');
            
            // Ensure deposit amount is calculated
            if (!checkoutData.depositAmount && checkoutData.grandTotal) {
                var total = checkoutData.grandTotal;
                var depositAmount = total;
                var balanceAmount = 0;
                
                if (checkoutData.depositRule) {
                    var rule = checkoutData.depositRule;
                    if (rule.deposit_type === 'percentage') {
                        depositAmount = total * (rule.deposit_percentage / 100);
                        balanceAmount = total - depositAmount;
                    } else if (rule.deposit_type === 'fixed') {
                        depositAmount = parseFloat(rule.deposit_fixed_amount) || total;
                        balanceAmount = total - depositAmount;
                    } else if (rule.deposit_type === 'first_night') {
                        depositAmount = checkoutData.pricing?.base_rate || total;
                        balanceAmount = total - depositAmount;
                    }
                }
                
                checkoutData.depositAmount = depositAmount;
                checkoutData.balanceAmount = balanceAmount;
                console.log('Calculated deposit:', depositAmount, 'balance:', balanceAmount);
            }
            
            var paymentAmount = checkoutData.depositAmount || checkoutData.grandTotal;
            
            // Create payment intent
            $.ajax({
                url: checkoutData.apiUrl + '/api/public/create-payment-intent',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    property_id: checkoutData.propertyId,
                    amount: paymentAmount,
                    currency: (checkoutData.currency || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 3),
                    booking_data: {
                        email: $form.find('[name="email"]').val(),
                        check_in: checkoutData.checkin,
                        check_out: checkoutData.checkout
                    }
                }),
                success: function(response) {
                    if (response.success && response.client_secret) {
                        // Confirm card payment
                        checkoutData.stripe.confirmCardPayment(response.client_secret, {
                            payment_method: {
                                card: checkoutData.cardElement,
                                billing_details: {
                                    name: $form.find('[name="first_name"]').val() + ' ' + $form.find('[name="last_name"]').val(),
                                    email: $form.find('[name="email"]').val()
                                }
                            }
                        }).then(function(result) {
                            if (result.error) {
                                // Payment failed
                                $('#gas-card-errors').text(result.error.message);
                                $btn.prop('disabled', false);
                                $btn.find('.gas-btn-text').show();
                                $btn.find('.gas-btn-loading').hide();
                                window.gasNotifyPaymentFailed('card', result.error.message);
                            } else if (result.paymentIntent.status === 'succeeded') {
                                // Payment successful, submit booking
                                submitBooking($btn, result.paymentIntent.id);
                            }
                        });
                    } else {
                        alert('Failed to initialize payment: ' + (response.error || 'Please try again'));
                        $btn.prop('disabled', false);
                        $btn.find('.gas-btn-text').show();
                        $btn.find('.gas-btn-loading').hide();
                        window.gasNotifyPaymentFailed('card', 'Payment initialization failed: ' + (response.error || 'Unknown'));
                    }
                },
                error: function() {
                    alert('Payment service unavailable. Please try again.');
                    $btn.prop('disabled', false);
                    $btn.find('.gas-btn-text').show();
                    $btn.find('.gas-btn-loading').hide();
                }
            });
        }
        
        function submitBooking($btn, paymentIntentId) {
            $btn.prop('disabled', true);
            $btn.find('.gas-btn-text').hide();
            $btn.find('.gas-btn-loading').text(t('booking', 'confirming', 'Confirming booking...')).show();
            
            // Gather form data
            var $form = $('#gas-guest-form');
            var paymentMethod = $('input[name="payment_method"]:checked').val();
            
            console.log('submitBooking called with paymentIntentId:', paymentIntentId);
            console.log('checkoutData.depositAmount:', checkoutData.depositAmount);
            console.log('checkoutData.balanceAmount:', checkoutData.balanceAmount);
            console.log('paymentMethod:', paymentMethod);
            
            var formData = {
                unit_id: checkoutData.unitId,
                check_in: checkoutData.checkin,
                check_out: checkoutData.checkout,
                guests: checkoutData.guests,
                guest_first_name: $form.find('[name="first_name"]').val(),
                guest_last_name: $form.find('[name="last_name"]').val(),
                guest_email: $form.find('[name="email"]').val(),
                guest_phone: $form.find('[name="phone"]').val(),
                guest_address: $form.find('[name="address"]').val(),
                guest_city: $form.find('[name="city"]').val(),
                guest_postcode: $form.find('[name="postcode"]').val(),
                guest_country: $form.find('[name="country"]').val(),
                notes: $form.find('[name="notes"]').val(),
                marketing: $form.find('[name="marketing"]').is(':checked'),
                payment_method: paymentMethod,
                total_price: checkoutData.grandTotal,
                rate_type: checkoutData.rateType,
                upsells: checkoutData.selectedUpsells,
                voucher_code: checkoutData.voucherCode,
                stripe_payment_intent_id: paymentIntentId,
                enigma_reference_id: window.gasEnigmaReferenceId || null,
                source_site_url: window.location.origin + window.location.pathname,
                deposit_amount: paymentMethod === 'card' ? checkoutData.depositAmount : null,
                balance_amount: paymentMethod === 'card' ? checkoutData.balanceAmount : null,
                price_breakdown: checkoutData.priceBreakdown || null,
                damage_deposit: checkoutData.damageDeposit || null,
                cm_quote_source: checkoutData.cmQuoteSource || null
            };
            
            $.ajax({
                url: checkoutData.apiUrl + '/api/public/book',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(formData),
                success: function(response) {
                    if (response.success) {
                        // Show confirmation
                        $('.gas-checkout-main > *').hide();
                        $('.gas-checkout-confirmation').show();
                        
                        // Reset confirmation elements
                        $('.gas-conf-rooms-list').empty().hide();
                        $('.gas-conf-extras-list').empty().hide();
                        $('.gas-conf-room-name').show();
                        $('.gas-booking-ref').removeClass('gas-ref-small');
                        
                        // Populate booking reference
                        $('.gas-booking-ref').text(response.booking_id || response.booking?.id || 'Confirmed');
                        $('.gas-guest-email').text(formData.guest_email);
                        
                        // Populate property
                        $('.gas-conf-property-name').text(checkoutData.room?.property_name || 'Property');
                        
                        // Build room box for single booking
                        var currency = checkoutData.currency || '';
                        var roomHtml = '<div class="gas-conf-room-box">';
                        roomHtml += '<div><span class="room-name">' + escapeHtml(checkoutData.room?.name || 'Room') + '</span>';
                        roomHtml += '<div class="room-guests">' + checkoutData.guests + ' guest' + (checkoutData.guests > 1 ? 's' : '') + '</div></div>';
                        roomHtml += '<span class="room-price">' + formatPrice(checkoutData.accommodationTotal, currency) + '</span>';
                        roomHtml += '</div>';
                        $('.gas-conf-rooms-list').html(roomHtml).show();
                        $('.gas-conf-room-name').hide(); // Hide the simple text
                        
                        // Show extras/upsells if any
                        if (checkoutData.selectedUpsells && checkoutData.selectedUpsells.length > 0) {
                            var extrasHtml = '<div class="gas-conf-extras-title">Extras</div>';
                            checkoutData.selectedUpsells.forEach(function(upsell) {
                                extrasHtml += '<div class="gas-conf-extra-box">';
                                extrasHtml += '<span class="extra-name">' + escapeHtml(upsell.name) + '</span>';
                                extrasHtml += '<span class="extra-price">' + formatPrice(upsell.price, currency) + '</span>';
                                extrasHtml += '</div>';
                            });
                            $('.gas-conf-extras-list').html(extrasHtml).show();
                        }
                        
                        // Format and display dates
                        var formatDate = function(dateStr) {
                            var d = new Date(dateStr + 'T12:00:00');
                            var options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
                            return d.toLocaleDateString('en-GB', options);
                        };
                        $('.gas-conf-checkin').text(formatDate(checkoutData.checkin));
                        $('.gas-conf-checkout').text(formatDate(checkoutData.checkout));
                        
                        // Guests
                        var guestText = checkoutData.guests + ' ' + (checkoutData.guests === 1 ? 'Guest' : 'Guests');
                        $('.gas-conf-guests').text(guestText);
                        
                        // Pricing
                        $('.gas-conf-total').text(formatPrice(checkoutData.grandTotal, checkoutData.currency));
                        
                        if (paymentMethod === 'card' && paymentIntentId) {
                            $('.gas-price-paid').show();
                            $('.gas-conf-deposit').text('✓ ' + formatPrice(checkoutData.depositAmount, checkoutData.currency));
                            
                            if (checkoutData.balanceAmount > 0) {
                                $('.gas-price-balance').show();
                                $('.gas-conf-balance').text(formatPrice(checkoutData.balanceAmount, checkoutData.currency));
                            }
                        } else {
                            $('.gas-price-property').show();
                        }
                        
                        // Show bank details on confirmation
                        if (window.gasBankDetails && window.gasBankDetails.accounts && window.gasBankDetails.accounts.length > 0 && paymentMethod !== 'card') {
                            var bankHtml = '<div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-top: 16px; text-align: left;">';
                            bankHtml += '<h4 style="margin: 0 0 12px 0; color: #92400e; font-size: 14px;">🏦 Bank Transfer Details</h4>';
                            window.gasBankDetails.accounts.forEach(function(account) {
                                bankHtml += '<div style="background: white; border-radius: 8px; padding: 12px; margin-bottom: 8px; border: 1px solid #fde68a;">';
                                if (account.bank_name) bankHtml += '<div style="font-weight: 600; color: #92400e; margin-bottom: 6px;">' + account.bank_name + '</div>';
                                bankHtml += '<table style="width: 100%; font-size: 13px; border-collapse: collapse;">';
                                if (account.account_name) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c; width: 40%;">Account Name</td><td style="padding: 3px 0; font-weight: 500;">' + account.account_name + '</td></tr>';
                                if (account.account_number) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">Account No.</td><td style="padding: 3px 0; font-family: monospace;">' + account.account_number + '</td></tr>';
                                if (account.sort_code) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">Sort Code</td><td style="padding: 3px 0; font-family: monospace;">' + account.sort_code + '</td></tr>';
                                if (account.iban) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">IBAN</td><td style="padding: 3px 0; font-family: monospace;">' + account.iban + '</td></tr>';
                                if (account.swift_bic) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">SWIFT/BIC</td><td style="padding: 3px 0; font-family: monospace;">' + account.swift_bic + '</td></tr>';
                                bankHtml += '</table></div>';
                            });
                            if (window.gasBankDetails.instructions) bankHtml += '<p style="margin: 8px 0 0 0; font-size: 12px; color: #b45309; font-style: italic;">' + window.gasBankDetails.instructions + '</p>';
                            if (window.gasBankDetails.deadline_hours > 0) { var dt = window.gasBankDetails.deadline_hours >= 24 ? Math.floor(window.gasBankDetails.deadline_hours/24) + ' day(s)' : window.gasBankDetails.deadline_hours + ' hours'; bankHtml += '<p style="margin: 8px 0 0; font-size: 12px; color: #b45309; text-align: center;">⏰ Please transfer within ' + dt + '</p>'; }
                            bankHtml += '</div>';
                            $('.gas-confirmation-contact').after(bankHtml);
                        }
                        
                        // Scroll to top
                        window.scrollTo({ top: 0, behavior: 'instant' });
                        document.body.style.overflow = 'hidden'; // Prevent background scroll
                    } else {
                        // Handle specific error types
                        if (response.unavailable_date) {
                            // Dates no longer available - offer to select new dates
                            if (confirm(response.error + '\n\nWould you like to select different dates?')) {
                                // Go back to Book Now page
                                var bookNowUrl = (typeof gasBooking !== 'undefined' && gasBooking.searchResultsUrl) ? gasBooking.searchResultsUrl : '/book-now/';
                                window.location.href = bookNowUrl;
                            }
                        } else {
                            alert('Booking failed: ' + (response.error || 'Please try again'));
                        }
                        $btn.prop('disabled', false);
                        $btn.find('.gas-btn-text').show();
                        $btn.find('.gas-btn-loading').hide();
                    }
                },
                error: function() {
                    alert(t('common', 'connection_error', 'Connection error. Please try again.'));
                    $btn.prop('disabled', false);
                    $btn.find('.gas-btn-text').show();
                    $btn.find('.gas-btn-loading').hide();
                }
            });
        }
    }

    // ========================================
    // ENIGMA CARD GUARANTEE - Global Functions
    // ========================================
    
    window.gasLoadEnigmaForm = function(propertyId) {
        // Reset capture state for new booking
        window.gasEnigmaCardCaptured = false;
        window.gasEnigmaReferenceId = null;
        window.gasEnigmaPendingRef = null;
        if (window.groupCheckoutData) {
            window.groupCheckoutData.enigmaCardCaptured = false;
            window.groupCheckoutData.enigmaReferenceId = null;
        }
        
        var baseUrl = window.gasApiUrl || 'https://admin.gas.travel';
        $.ajax({
            url: baseUrl + '/api/public/enigma/form-url',
            method: 'GET',
            data: {
                property_id: propertyId,
                booking_ref: 'pending',
                embed: 'false'
            },
            success: function(response) {
                if (response.success && response.form_url) {
                    var container = document.getElementById('gas-enigma-iframe-container');
                    if (container) {
                        container.innerHTML = '<iframe src="' + response.form_url + '" style="width:100%; min-height:560px; border:none;" id="gas-enigma-iframe" allow="payment"></iframe>';
                    }
                    if (response.reference_id) {
                        window.gasEnigmaPendingRef = response.reference_id;
                        window.gasStartEnigmaPolling(response.reference_id);
                    }
                } else {
                    $('#gas-enigma-iframe-container').html('<p style="text-align:center; color:#ef4444; padding:20px;">Unable to load secure form. Please try again.</p>');
                }
            },
            error: function() {
                $('#gas-enigma-iframe-container').html('<p style="text-align:center; color:#ef4444; padding:20px;">Unable to load secure form. Please try again.</p>');
            }
        });
    };

    window.gasStartEnigmaPolling = function(refId) {
        var baseUrl = window.gasApiUrl || 'https://admin.gas.travel';
        console.log('GAS: Starting Enigma capture polling for ref:', refId);
        var pollInterval = setInterval(function() {
            $.ajax({
                url: baseUrl + '/api/public/enigma/capture-status/' + encodeURIComponent(refId),
                method: 'GET',
                success: function(response) {
                    if (response.captured) {
                        console.log('GAS: Enigma capture confirmed by server poll');
                        clearInterval(pollInterval);
                        window.gasMarkEnigmaCaptured(refId);
                    }
                }
            });
        }, 2000);
        setTimeout(function() { clearInterval(pollInterval); }, 600000);
    };

    window.gasMarkEnigmaCaptured = function(refId) {
        if (window.gasEnigmaCardCaptured) return;
        console.log('GAS: Card captured, ref:', refId);
        window.gasEnigmaReferenceId = refId;
        window.gasEnigmaCardCaptured = true;
        if (window.groupCheckoutData) {
            window.groupCheckoutData.enigmaReferenceId = refId;
            window.groupCheckoutData.enigmaCardCaptured = true;
        }
        var successMsg = window.gasEnigmaSuccessMessage || 'Thank you! Your card is secured. Please now confirm your booking below.';
        $('#gas-enigma-iframe-container').html(
            '<div style="text-align:center; padding:30px;">' +
            '<div style="font-size:2.5rem; margin-bottom:10px;">&#x2705;</div>' +
            '<strong style="color:#059669; font-size:1.1rem;">Card secured successfully</strong>' +
            '<p style="color:#374151; font-size:14px; margin:12px 0 0 0; line-height:1.5;">' + successMsg + '</p>' +
            '</div>'
        );
    };

    // Listen for Enigma postMessage (fallback)
    window.addEventListener('message', function(event) {
        if (event.data && event.data.source === 'enigma-vault') {
            console.log('GAS: Enigma postMessage received', event.data);
            if (event.data.status === 'success' && event.data.referenceId) {
                window.gasMarkEnigmaCaptured(event.data.referenceId);
            }
        }
    });

    // Bank Transfer Details Renderer
    window.gasRenderBankDetails = function(bankDetails) {
        var $content = $('#gas-bank-details-content');
        if (!bankDetails || !bankDetails.accounts || bankDetails.accounts.length === 0) {
            $content.html('<p style="text-align:center; color: #92400e; padding: 16px;">Bank details not yet configured by property owner.</p>');
            return;
        }
        var html = '';
        bankDetails.accounts.forEach(function(account, i) {
            html += '<div style="background: white; border-radius: 8px; padding: 14px; margin-bottom: ' + (i < bankDetails.accounts.length - 1 ? '10px' : '0') + '; border: 1px solid #fde68a;">';
            if (account.account_name) html += '<div style="margin-bottom: 8px;"><strong style="color: #92400e; font-size: 14px;">' + account.account_name + '</strong></div>';
            html += '<table style="width: 100%; font-size: 13px; border-collapse: collapse;">';
            if (account.iban) html += '<tr><td style="padding: 4px 0; color: #78716c; width: 40%;">IBAN</td><td style="padding: 4px 0; font-weight: 500; font-family: monospace;">' + account.iban + '</td></tr>';
            if (account.swift_bic) html += '<tr><td style="padding: 4px 0; color: #78716c;">SWIFT/BIC</td><td style="padding: 4px 0; font-weight: 500; font-family: monospace;">' + account.swift_bic + '</td></tr>';
            if (account.account_number) html += '<tr><td style="padding: 4px 0; color: #78716c;">Account No.</td><td style="padding: 4px 0; font-weight: 500; font-family: monospace;">' + account.account_number + '</td></tr>';
            if (account.bank_name) html += '<tr><td style="padding: 4px 0; color: #78716c;">Bank</td><td style="padding: 4px 0;">' + account.bank_name + '</td></tr>';
            html += '</table></div>';
        });
        $content.html(html);
        
        // Show instructions if available
        var $instructions = $('#gas-bank-instructions');
        if (bankDetails.instructions) {
            $instructions.find('p').text(bankDetails.instructions);
            $instructions.show();
        } else {
            $instructions.hide();
        }
        
        // Show deadline if set
        if (bankDetails.deadline_hours && bankDetails.deadline_hours > 0) {
            var deadlineText = bankDetails.deadline_hours >= 24 
                ? Math.floor(bankDetails.deadline_hours / 24) + ' day' + (Math.floor(bankDetails.deadline_hours / 24) > 1 ? 's' : '')
                : bankDetails.deadline_hours + ' hours';
            $content.append('<p style="margin: 10px 0 0 0; font-size: 12px; color: #b45309; text-align: center;">⏰ Please complete transfer within ' + deadlineText + '</p>');
        }
    };

    // Send Enquiry - guest sends their details to property owner when having payment trouble
    window.gasSendEnquiry = function() {
        var $form = $('#gas-guest-form');
        var firstName = $form.find('[name="first_name"]').val() || '';
        var lastName = $form.find('[name="last_name"]').val() || '';
        var email = $form.find('[name="email"]').val() || '';
        
        if (!firstName || !email) {
            alert(t('booking', 'fill_details_first', 'Please fill in your name and email first (Step 2).'));
            return;
        }
        
        var apiUrl = gasBooking.apiUrl || (typeof checkoutData !== 'undefined' ? checkoutData.apiUrl : '') || (typeof window.groupCheckoutData !== 'undefined' ? window.groupCheckoutData.apiUrl : '');
        if (!apiUrl) return;
        
        var unitId = null, checkin = null, checkout = null, guests = null, totalPrice = null;
        
        if (typeof checkoutData !== 'undefined' && checkoutData.unitId) {
            unitId = checkoutData.unitId;
            checkin = checkoutData.checkin;
            checkout = checkoutData.checkout;
            guests = checkoutData.guests;
            totalPrice = checkoutData.grandTotal;
        } else if (typeof window.groupCheckoutData !== 'undefined') {
            var eqGroup = window.groupCheckoutData.paymentGroups[window.groupCheckoutData.paymentGroupKeys[window.groupCheckoutData.currentPaymentGroupIndex]];
            unitId = eqGroup ? eqGroup.items[0]?.unitId : window.groupCheckoutData.items?.[0]?.unitId;
            checkin = window.groupCheckoutData.checkin;
            checkout = window.groupCheckoutData.checkout;
            guests = eqGroup ? eqGroup.items.reduce(function(s, i) { return s + (i.guests || 1); }, 0) : null;
            totalPrice = eqGroup ? (eqGroup.subtotal + (eqGroup.taxTotal || 0)) : null;
        }

        // Confirm with guest
        if (!confirm(t('booking', 'send_enquiry_confirm', 'Send your booking enquiry to the property owner? They will contact you to arrange payment.'))) {
            return;
        }
        
        var $link = $('.gas-send-enquiry-link');
        $link.text('⏳ Sending...');
        
        $.ajax({
            url: apiUrl + '/api/public/payment-failed',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                unit_id: unitId,
                check_in: checkin,
                check_out: checkout,
                guests: guests,
                guest_first_name: firstName,
                guest_last_name: lastName,
                guest_email: email,
                guest_phone: $form.find('[name="phone"]').val() || '',
                guest_address: $form.find('[name="address"]').val() || '',
                guest_city: $form.find('[name="city"]').val() || '',
                guest_postcode: $form.find('[name="postcode"]').val() || '',
                guest_country: $form.find('[name="country"]').val() || '',
                total_price: totalPrice,
                payment_type: 'enquiry',
                error_message: 'Guest sent enquiry — requested alternative payment',
                source_site_url: window.location.origin + window.location.pathname
            }),
            success: function() {
                // Replace the enquiry link with confirmation
                $('.gas-enquiry-option').html(
                    '<div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px; text-align: center;">' +
                    '<div style="font-size: 1.5rem; margin-bottom: 8px;">✅</div>' +
                    '<strong style="color: #065f46;">' + t('booking', 'enquiry_sent', 'Enquiry Sent!') + '</strong>' +
                    '<p style="margin: 8px 0 0; color: #047857; font-size: 0.85rem;">' + t('booking', 'enquiry_sent_desc', 'The property owner has received your enquiry and will contact you shortly to arrange payment.') + '</p>' +
                    '</div>'
                );
            },
            error: function() {
                $link.text('💬 ' + t('payment', 'trouble_paying', 'Having trouble paying? Send an enquiry instead'));
                alert(t('common', 'connection_error', 'Connection error. Please try again.'));
            }
        });
    };

    // Payment Failed Notification - sends guest details to server for owner notification + CM inquiry
    window.gasNotifyPaymentFailed = function(paymentType, errorMessage) {
        try {
            var apiUrl = gasBooking.apiUrl || (typeof checkoutData !== 'undefined' ? checkoutData.apiUrl : '') || (typeof window.groupCheckoutData !== 'undefined' ? window.groupCheckoutData.apiUrl : '');
            if (!apiUrl) return;
            
            var $form = $('#gas-guest-form');
            var unitId = null;
            var checkin = null;
            var checkout = null;
            var guests = null;
            var totalPrice = null;
            
            // Get data from whichever checkout context is active
            if (typeof checkoutData !== 'undefined' && checkoutData.unitId) {
                unitId = checkoutData.unitId;
                checkin = checkoutData.checkin;
                checkout = checkoutData.checkout;
                guests = checkoutData.guests;
                totalPrice = checkoutData.grandTotal;
            } else if (typeof window.groupCheckoutData !== 'undefined') {
                var pfGroup = window.groupCheckoutData.paymentGroups[window.groupCheckoutData.paymentGroupKeys[window.groupCheckoutData.currentPaymentGroupIndex]];
                unitId = pfGroup ? pfGroup.items[0]?.unitId : window.groupCheckoutData.items?.[0]?.unitId;
                checkin = window.groupCheckoutData.checkin;
                checkout = window.groupCheckoutData.checkout;
                guests = pfGroup ? pfGroup.items.reduce(function(s, i) { return s + (i.guests || 1); }, 0) : null;
                totalPrice = pfGroup ? (pfGroup.subtotal + (pfGroup.taxTotal || 0)) : null;
            }

            var payload = {
                unit_id: unitId,
                check_in: checkin,
                check_out: checkout,
                guests: guests,
                guest_first_name: $form.find('[name="first_name"]').val() || '',
                guest_last_name: $form.find('[name="last_name"]').val() || '',
                guest_email: $form.find('[name="email"]').val() || '',
                guest_phone: $form.find('[name="phone"]').val() || '',
                guest_address: $form.find('[name="address"]').val() || '',
                guest_city: $form.find('[name="city"]').val() || '',
                guest_postcode: $form.find('[name="postcode"]').val() || '',
                guest_country: $form.find('[name="country"]').val() || '',
                total_price: totalPrice,
                payment_type: paymentType,
                error_message: errorMessage,
                source_site_url: window.location.origin + window.location.pathname
            };
            
            // Fire and forget - don't block the user
            $.ajax({
                url: apiUrl + '/api/public/payment-failed',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(payload)
            });
            
            console.log('GAS: Payment failure notification sent', paymentType, errorMessage);
        } catch (e) {
            console.error('GAS: Failed to send payment failure notification', e);
        }
    };

    // ========== COUNTRY SEARCH ==========
    var gasCountries = [
        {c:"AF",n:"Afghanistan"},{c:"AL",n:"Albania"},{c:"DZ",n:"Algeria"},{c:"AD",n:"Andorra"},{c:"AO",n:"Angola"},{c:"AG",n:"Antigua and Barbuda"},{c:"AR",n:"Argentina"},{c:"AM",n:"Armenia"},{c:"AU",n:"Australia"},{c:"AT",n:"Austria"},
        {c:"AZ",n:"Azerbaijan"},{c:"BS",n:"Bahamas"},{c:"BH",n:"Bahrain"},{c:"BD",n:"Bangladesh"},{c:"BB",n:"Barbados"},{c:"BY",n:"Belarus"},{c:"BE",n:"Belgium"},{c:"BZ",n:"Belize"},{c:"BJ",n:"Benin"},{c:"BT",n:"Bhutan"},
        {c:"BO",n:"Bolivia"},{c:"BA",n:"Bosnia and Herzegovina"},{c:"BW",n:"Botswana"},{c:"BR",n:"Brazil"},{c:"BN",n:"Brunei"},{c:"BG",n:"Bulgaria"},{c:"BF",n:"Burkina Faso"},{c:"BI",n:"Burundi"},{c:"CV",n:"Cabo Verde"},{c:"KH",n:"Cambodia"},
        {c:"CM",n:"Cameroon"},{c:"CA",n:"Canada"},{c:"CF",n:"Central African Republic"},{c:"TD",n:"Chad"},{c:"CL",n:"Chile"},{c:"CN",n:"China"},{c:"CO",n:"Colombia"},{c:"KM",n:"Comoros"},{c:"CG",n:"Congo"},{c:"CD",n:"Congo (DRC)"},
        {c:"CR",n:"Costa Rica"},{c:"CI",n:"Côte d'Ivoire"},{c:"HR",n:"Croatia"},{c:"CU",n:"Cuba"},{c:"CY",n:"Cyprus"},{c:"CZ",n:"Czech Republic"},{c:"DK",n:"Denmark"},{c:"DJ",n:"Djibouti"},{c:"DM",n:"Dominica"},{c:"DO",n:"Dominican Republic"},
        {c:"EC",n:"Ecuador"},{c:"EG",n:"Egypt"},{c:"SV",n:"El Salvador"},{c:"GQ",n:"Equatorial Guinea"},{c:"ER",n:"Eritrea"},{c:"EE",n:"Estonia"},{c:"SZ",n:"Eswatini"},{c:"ET",n:"Ethiopia"},{c:"FJ",n:"Fiji"},{c:"FI",n:"Finland"},
        {c:"FR",n:"France"},{c:"GA",n:"Gabon"},{c:"GM",n:"Gambia"},{c:"GE",n:"Georgia"},{c:"DE",n:"Germany"},{c:"GH",n:"Ghana"},{c:"GR",n:"Greece"},{c:"GD",n:"Grenada"},{c:"GT",n:"Guatemala"},{c:"GN",n:"Guinea"},
        {c:"GW",n:"Guinea-Bissau"},{c:"GY",n:"Guyana"},{c:"HT",n:"Haiti"},{c:"HN",n:"Honduras"},{c:"HK",n:"Hong Kong"},{c:"HU",n:"Hungary"},{c:"IS",n:"Iceland"},{c:"IN",n:"India"},{c:"ID",n:"Indonesia"},{c:"IR",n:"Iran"},
        {c:"IQ",n:"Iraq"},{c:"IE",n:"Ireland"},{c:"IL",n:"Israel"},{c:"IT",n:"Italy"},{c:"JM",n:"Jamaica"},{c:"JP",n:"Japan"},{c:"JO",n:"Jordan"},{c:"KZ",n:"Kazakhstan"},{c:"KE",n:"Kenya"},{c:"KI",n:"Kiribati"},
        {c:"KW",n:"Kuwait"},{c:"KG",n:"Kyrgyzstan"},{c:"LA",n:"Laos"},{c:"LV",n:"Latvia"},{c:"LB",n:"Lebanon"},{c:"LS",n:"Lesotho"},{c:"LR",n:"Liberia"},{c:"LY",n:"Libya"},{c:"LI",n:"Liechtenstein"},{c:"LT",n:"Lithuania"},
        {c:"LU",n:"Luxembourg"},{c:"MO",n:"Macao"},{c:"MG",n:"Madagascar"},{c:"MW",n:"Malawi"},{c:"MY",n:"Malaysia"},{c:"MV",n:"Maldives"},{c:"ML",n:"Mali"},{c:"MT",n:"Malta"},{c:"MH",n:"Marshall Islands"},{c:"MR",n:"Mauritania"},
        {c:"MU",n:"Mauritius"},{c:"MX",n:"Mexico"},{c:"FM",n:"Micronesia"},{c:"MD",n:"Moldova"},{c:"MC",n:"Monaco"},{c:"MN",n:"Mongolia"},{c:"ME",n:"Montenegro"},{c:"MA",n:"Morocco"},{c:"MZ",n:"Mozambique"},{c:"MM",n:"Myanmar"},
        {c:"NA",n:"Namibia"},{c:"NR",n:"Nauru"},{c:"NP",n:"Nepal"},{c:"NL",n:"Netherlands"},{c:"NZ",n:"New Zealand"},{c:"NI",n:"Nicaragua"},{c:"NE",n:"Niger"},{c:"NG",n:"Nigeria"},{c:"KP",n:"North Korea"},{c:"MK",n:"North Macedonia"},
        {c:"NO",n:"Norway"},{c:"OM",n:"Oman"},{c:"PK",n:"Pakistan"},{c:"PW",n:"Palau"},{c:"PS",n:"Palestine"},{c:"PA",n:"Panama"},{c:"PG",n:"Papua New Guinea"},{c:"PY",n:"Paraguay"},{c:"PE",n:"Peru"},{c:"PH",n:"Philippines"},
        {c:"PL",n:"Poland"},{c:"PT",n:"Portugal"},{c:"PR",n:"Puerto Rico"},{c:"QA",n:"Qatar"},{c:"RO",n:"Romania"},{c:"RU",n:"Russia"},{c:"RW",n:"Rwanda"},{c:"KN",n:"Saint Kitts and Nevis"},{c:"LC",n:"Saint Lucia"},{c:"VC",n:"Saint Vincent and the Grenadines"},
        {c:"WS",n:"Samoa"},{c:"SM",n:"San Marino"},{c:"ST",n:"São Tomé and Príncipe"},{c:"SA",n:"Saudi Arabia"},{c:"SN",n:"Senegal"},{c:"RS",n:"Serbia"},{c:"SC",n:"Seychelles"},{c:"SL",n:"Sierra Leone"},{c:"SG",n:"Singapore"},{c:"SK",n:"Slovakia"},
        {c:"SI",n:"Slovenia"},{c:"SB",n:"Solomon Islands"},{c:"SO",n:"Somalia"},{c:"ZA",n:"South Africa"},{c:"KR",n:"South Korea"},{c:"SS",n:"South Sudan"},{c:"ES",n:"Spain"},{c:"LK",n:"Sri Lanka"},{c:"SD",n:"Sudan"},{c:"SR",n:"Suriname"},
        {c:"SE",n:"Sweden"},{c:"CH",n:"Switzerland"},{c:"SY",n:"Syria"},{c:"TW",n:"Taiwan"},{c:"TJ",n:"Tajikistan"},{c:"TZ",n:"Tanzania"},{c:"TH",n:"Thailand"},{c:"TL",n:"Timor-Leste"},{c:"TG",n:"Togo"},{c:"TO",n:"Tonga"},
        {c:"TT",n:"Trinidad and Tobago"},{c:"TN",n:"Tunisia"},{c:"TR",n:"Turkey"},{c:"TM",n:"Turkmenistan"},{c:"TV",n:"Tuvalu"},{c:"UG",n:"Uganda"},{c:"UA",n:"Ukraine"},{c:"AE",n:"United Arab Emirates"},{c:"GB",n:"United Kingdom"},{c:"US",n:"United States"},
        {c:"UY",n:"Uruguay"},{c:"UZ",n:"Uzbekistan"},{c:"VU",n:"Vanuatu"},{c:"VA",n:"Vatican City"},{c:"VE",n:"Venezuela"},{c:"VN",n:"Vietnam"},{c:"YE",n:"Yemen"},{c:"ZM",n:"Zambia"},{c:"ZW",n:"Zimbabwe"}
    ];

    $(document).on('input', '.gas-country-search', function() {
        var $input = $(this);
        var $wrap = $input.closest('.gas-country-search-wrap');
        var $dropdown = $wrap.find('.gas-country-dropdown');
        var $hidden = $wrap.find('input[name="country"]');
        var query = $input.val().toLowerCase().trim();
        
        if (query.length < 1) {
            $dropdown.hide().empty();
            $hidden.val('');
            return;
        }
        
        // Starts-with matches first, then contains matches
        var startsWith = gasCountries.filter(function(c) {
            return c.n.toLowerCase().indexOf(query) === 0;
        });
        var contains = gasCountries.filter(function(c) {
            return c.n.toLowerCase().indexOf(query) > 0;
        });
        var matches = startsWith.concat(contains).slice(0, 8);
        
        if (matches.length === 0) {
            $dropdown.hide().empty();
            return;
        }
        
        var html = '';
        matches.forEach(function(c) {
            html += '<div class="gas-country-option" data-code="' + c.c + '">' + c.n + '</div>';
        });
        $dropdown.html(html).show();
    });

    $(document).on('click', '.gas-country-option', function() {
        var $opt = $(this);
        var $wrap = $opt.closest('.gas-country-search-wrap');
        $wrap.find('.gas-country-search').val($opt.text());
        $wrap.find('input[name="country"]').val($opt.data('code'));
        $wrap.find('.gas-country-dropdown').hide().empty();
    });

    $(document).on('blur', '.gas-country-search', function() {
        var $wrap = $(this).closest('.gas-country-search-wrap');
        setTimeout(function() { $wrap.find('.gas-country-dropdown').hide(); }, 200);
    });

    $(document).on('focus', '.gas-country-search', function() {
        var val = $(this).val();
        if (val.length >= 1) $(this).trigger('input');
    });
    // ========== END COUNTRY SEARCH ==========

});
