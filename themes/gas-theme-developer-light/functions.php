<?php
/**
 * Copyright (c) 2026 GAS - Global Accommodation System (gas.travel)
 * All rights reserved.
 *
 * This software is proprietary and licensed exclusively for use on
 * GAS-hosted infrastructure. Copying, redistribution, modification,
 * reverse-engineering, or deployment on non-GAS servers is strictly
 * prohibited without prior written consent from GAS.
 *
 * Unauthorized use may result in legal action under applicable
 * intellectual property and copyright laws.
 *
 * Contact: steve@gas.travel | https://gas.travel
 */

/**
 * GAS Developer Theme Functions
 *
 * @package GAS_Developer
 */

if (!defined('ABSPATH')) exit;

define('GAS_DEVELOPER_VERSION', '1.0.2');

/**
 * Theme Activation - Auto Setup Pages & Menu
 */
function developer_theme_activation() {
    // Only run once
    if (get_option('developer_theme_setup_complete')) {
        return;
    }
    
    // Pages to create
    $pages = array(
        'home' => array(
            'title'    => 'Home',
            'content'  => '',
            'template' => '',
        ),
        'book-now' => array(
            'title'    => 'Book Now',
            'content'  => '',
            'template' => 'template-book-now.php',
        ),
        'room' => array(
            'title'    => 'Room',
            'content'  => '',
            'template' => 'template-room.php',
        ),
        'checkout' => array(
            'title'    => 'Checkout',
            'content'  => '[gas_checkout]',
            'template' => '',
        ),
        'contact' => array(
            'title'    => 'Contact',
            'content'  => '',
            'template' => 'template-contact.php',
        ),
        'terms' => array(
            'title'    => 'Terms & Conditions',
            'content'  => '',
            'template' => 'template-terms.php',
        ),
        'privacy' => array(
            'title'    => 'Privacy Policy',
            'content'  => '',
            'template' => 'template-privacy.php',
        ),
        'reviews' => array(
            'title'    => 'Reviews',
            'content'  => '',
            'template' => 'template-reviews.php',
        ),
        'blog' => array(
            'title'    => 'Blog',
            'content'  => '',
            'template' => '',
        ),
    );
    
    $created_pages = array();
    
    foreach ($pages as $slug => $page_data) {
        // Check if page already exists
        $existing = get_page_by_path($slug);
        
        if (!$existing) {
            $page_id = wp_insert_post(array(
                'post_title'     => $page_data['title'],
                'post_content'   => $page_data['content'],
                'post_status'    => 'publish',
                'post_type'      => 'page',
                'post_name'      => $slug,
                'comment_status' => 'closed',
            ));
            
            if ($page_id && !is_wp_error($page_id)) {
                // Set template if specified
                if (!empty($page_data['template'])) {
                    update_post_meta($page_id, '_wp_page_template', $page_data['template']);
                }
                $created_pages[$slug] = $page_id;
            }
        } else {
            $created_pages[$slug] = $existing->ID;
        }
    }
    
    // Set Homepage and Blog page
    if (isset($created_pages['home'])) {
        update_option('show_on_front', 'page');
        update_option('page_on_front', $created_pages['home']);
    }
    if (isset($created_pages['blog'])) {
        update_option('page_for_posts', $created_pages['blog']);
    }
    
    // Create Primary Menu
    $menu_name = 'Primary Menu';
    $menu_exists = wp_get_nav_menu_object($menu_name);
    
    if (!$menu_exists) {
        $menu_id = wp_create_nav_menu($menu_name);
        
        if (!is_wp_error($menu_id)) {
            // Add menu items - Rooms links to book-now page
            $menu_items = array(
                'home'       => array('title' => 'Home', 'order' => 1, 'page' => 'home'),
                'rooms'      => array('title' => 'Rooms', 'order' => 2, 'page' => 'book-now'),
                'contact'    => array('title' => 'Contact', 'order' => 3, 'page' => 'contact'),
                'book-now'   => array('title' => 'Book Now', 'order' => 4, 'page' => 'book-now'),
            );
            
            foreach ($menu_items as $slug => $item_data) {
                $page_slug = $item_data['page'];
                if (isset($created_pages[$page_slug])) {
                    wp_update_nav_menu_item($menu_id, 0, array(
                        'menu-item-title'     => $item_data['title'],
                        'menu-item-object'    => 'page',
                        'menu-item-object-id' => $created_pages[$page_slug],
                        'menu-item-type'      => 'post_type',
                        'menu-item-status'    => 'publish',
                        'menu-item-position'  => $item_data['order'],
                    ));
                }
            }
            
            // Assign menu to primary location
            $locations = get_theme_mod('nav_menu_locations');
            $locations['primary'] = $menu_id;
            set_theme_mod('nav_menu_locations', $locations);
        }
    }
    
    // Auto-configure GAS Booking plugin settings if active
    if (function_exists('is_plugin_active') || defined('GAS_BOOKING_VERSION')) {
        update_option('gas_checkout_url', '/checkout/');
        update_option('gas_offers_url', '/offers/');
        update_option('gas_room_url_base', '/room/');
        update_option('gas_search_results_url', '/book-now/');
    }
    
    // Mark setup as complete
    update_option('developer_theme_setup_complete', true);
    
    // Store created pages for reference
    update_option('developer_created_pages', $created_pages);
}
add_action('after_switch_theme', 'developer_theme_activation');

/**
 * Admin Notice after theme activation
 */
function developer_activation_notice() {
    if (get_transient('developer_activation_notice')) {
        ?>
        <div class="notice notice-success is-dismissible">
            <p><strong>🎉 GAS Developer Theme Activated!</strong></p>
            <p>The following pages have been created automatically:</p>
            <ul style="list-style: disc; margin-left: 20px;">
                <li><strong>Home</strong> - Set as your homepage</li>
                <li><strong>Book Now</strong> - Property listings with search</li>
                <li><strong>Room</strong> - Individual room/property details</li>
                <li><strong>Checkout</strong> - Booking checkout page</li>
                <li><strong>Special Offers</strong> - Offers & promo codes showcase</li>
                <li><strong>Accommodation</strong> - Alternative listings page</li>
                <li><strong>About</strong> - About your property</li>
                <li><strong>Contact</strong> - Contact form page</li>
                <li><strong>Blog</strong> - Your blog posts</li>
            </ul>
            <p>A <strong>Primary Menu</strong> has also been created and assigned.</p>
            <p><a href="<?php echo admin_url('customize.php'); ?>" class="button button-primary">Customize Your Site</a> <a href="<?php echo admin_url('edit.php?post_type=page'); ?>" class="button">View Pages</a></p>
        </div>
        <?php
        delete_transient('developer_activation_notice');
    }
}
add_action('admin_notices', 'developer_activation_notice');

/**
 * Set transient on theme switch
 */
function developer_set_activation_notice() {
    set_transient('developer_activation_notice', true, 60);
}
add_action('after_switch_theme', 'developer_set_activation_notice');

/**
 * Add "Re-run Setup" option in Customizer
 */
function developer_add_setup_reset_option($wp_customize) {
    $wp_customize->add_section('developer_theme_setup', array(
        'title'    => __('🔧 Theme Setup', 'developer-developer'),
        'priority' => 1,
    ));
    
    $wp_customize->add_setting('developer_rerun_setup', array(
        'default'           => '',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_rerun_setup', array(
        'label'       => __('Theme Auto-Setup', 'developer-developer'),
        'description' => __('Pages and menu were created automatically when the theme was activated. To re-run setup (create missing pages), switch to another theme and back to this one.', 'developer-developer'),
        'section'     => 'developer_theme_setup',
        'type'        => 'hidden',
    ));
}
add_action('customize_register', 'developer_add_setup_reset_option', 5);

/**
 * Theme Setup
 */
function developer_developer_setup() {
    // Add theme support
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo', array(
        'height'      => 80,
        'width'       => 200,
        'flex-height' => true,
        'flex-width'  => true,
    ));
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
    ));
    add_theme_support('customize-selective-refresh-widgets');
    
    // Register menus
    register_nav_menus(array(
        'primary' => __('Primary Menu', 'developer-developer'),
        'footer'  => __('Footer Menu', 'developer-developer'),
    ));
    
    // Set thumbnail sizes
    set_post_thumbnail_size(800, 600, true);
    add_image_size('developer-hero', 1920, 1080, true);
    add_image_size('developer-card', 600, 400, true);
    add_image_size('developer-attraction', 400, 400, true);
}
add_action('after_setup_theme', 'developer_developer_setup');

/**
 * Enqueue Scripts & Styles
 */
function developer_developer_scripts() {
    // Get API settings first (overrides theme_mod)
    $api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();
    
    // Get selected fonts - API overrides theme_mod
    $heading_font = $api['heading_font'] ?? get_theme_mod('developer_heading_font', 'playfair');
    $subheading_font = $api['subheading_font'] ?? get_theme_mod('developer_subheading_font', 'inter');
    $body_font = $api['body_font'] ?? get_theme_mod('developer_body_font', 'inter');

    // Font name mappings for Google Fonts
    $font_names = array(
        'inter'             => 'Inter:wght@400;500;600;700',
        'poppins'           => 'Poppins:wght@400;500;600;700',
        'montserrat'        => 'Montserrat:wght@400;500;600;700',
        'raleway'           => 'Raleway:wght@400;500;600;700',
        'nunito'            => 'Nunito:wght@400;500;600;700',
        'lato'              => 'Lato:wght@400;700',
        'dm-sans'           => 'DM+Sans:wght@400;500;600;700',
        'outfit'            => 'Outfit:wght@400;500;600;700',
        'plus-jakarta-sans' => 'Plus+Jakarta+Sans:wght@400;500;600;700',
        'josefin-sans'      => 'Josefin+Sans:wght@400;500;600;700',
        'open-sans'         => 'Open+Sans:wght@400;500;600;700',
        'source-sans'       => 'Source+Sans+3:wght@400;600;700',
        'merriweather'      => 'Merriweather:wght@400;700',
        'playfair'          => 'Playfair+Display:wght@400;600;700',
        'lora'              => 'Lora:wght@400;500;600;700',
        'cormorant'         => 'Cormorant+Garamond:wght@400;500;600;700',
        'libre-baskerville' => 'Libre+Baskerville:wght@400;700',
        'eb-garamond'       => 'EB+Garamond:wght@400;500;600;700',
        'crimson-text'      => 'Crimson+Text:wght@400;600;700',
        'cinzel'            => 'Cinzel:wght@400;600;700',
        'tenor-sans'        => 'Tenor+Sans',
        'spectral'          => 'Spectral:wght@400;500;600;700',
        'oswald'            => 'Oswald:wght@400;500;600;700',
        'roboto'            => 'Roboto:wght@400;500;700',
    );
    
    // Build Google Fonts URL
    $fonts = array();
    if (isset($font_names[$heading_font])) {
        $fonts[] = $font_names[$heading_font];
    }
    if (isset($font_names[$subheading_font]) && $subheading_font !== $heading_font) {
        $fonts[] = $font_names[$subheading_font];
    }
    if (isset($font_names[$body_font]) && $body_font !== $heading_font && $body_font !== $subheading_font) {
        $fonts[] = $font_names[$body_font];
    }
    
    if (!empty($fonts)) {
        wp_enqueue_style(
            'developer-fonts',
            'https://fonts.googleapis.com/css2?family=' . implode('&family=', $fonts) . '&display=swap',
            array(),
            null
        );
    }
    
    // Theme styles
    wp_enqueue_style(
        'developer-style',
        get_stylesheet_uri(),
        array(),
        GAS_DEVELOPER_VERSION
    );
    
    // Theme scripts
    wp_enqueue_script(
        'developer-script',
        get_template_directory_uri() . '/assets/js/main.js',
        array('jquery'),
        GAS_DEVELOPER_VERSION,
        true
    );
    
    // Pass settings to JS
    wp_localize_script('developer-script', 'developerSettings', array(
        'headerSticky' => get_theme_mod('developer_header_sticky', true),
        'menuLayout'   => get_theme_mod('developer_menu_layout', 'logo-left'),
    ));
}
add_action('wp_enqueue_scripts', 'developer_developer_scripts');

/**
 * Custom Room Selector Control for Customizer
 */
if (class_exists('WP_Customize_Control')) {
    class Developer_Room_Selector_Control extends WP_Customize_Control {
        public $type = 'room_selector';
        
        public function render_content() {
            // Get rooms from API
            $rooms = $this->get_rooms();
            $selected = explode(',', $this->value());
            ?>
            <label>
                <span class="customize-control-title"><?php echo esc_html($this->label); ?></span>
                <?php if ($this->description) : ?>
                    <span class="description customize-control-description"><?php echo esc_html($this->description); ?></span>
                <?php endif; ?>
            </label>
            
            <?php if (empty($rooms)) : ?>
                <p style="color: #666; font-style: italic; padding: 10px; background: #f5f5f5; border-radius: 4px;">
                    No rooms found. Make sure GAS Booking plugin is configured with your Client ID.
                </p>
            <?php else : ?>
                <div class="developer-room-selector" style="max-height: 250px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; background: #fff; margin-top: 8px;">
                    <?php foreach ($rooms as $room) : 
                        $checked = in_array($room['id'], $selected) ? 'checked' : '';
                    ?>
                        <label style="display: flex; align-items: center; padding: 10px 12px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;" 
                               onmouseover="this.style.background='#f8fafc'" 
                               onmouseout="this.style.background='transparent'">
                            <input type="checkbox" 
                                   value="<?php echo esc_attr($room['id']); ?>" 
                                   <?php echo $checked; ?>
                                   style="margin-right: 10px;">
                            <span style="flex: 1;">
                                <strong style="display: block; color: #1e293b;"><?php echo esc_html($room['name']); ?></strong>
                                <small style="color: #64748b;"><?php echo esc_html($room['property_name'] ?? 'Property'); ?> • $<?php echo esc_html(number_format($room['base_price'] ?? 0)); ?>/night</small>
                            </span>
                            <span style="background: #2563eb; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">ID: <?php echo esc_html($room['id']); ?></span>
                        </label>
                    <?php endforeach; ?>
                </div>
                <input type="hidden" <?php $this->link(); ?> value="<?php echo esc_attr($this->value()); ?>" class="developer-room-ids-value">
                <script>
                    (function() {
                        var container = document.querySelector('.developer-room-selector');
                        var hiddenInput = container.parentElement.querySelector('.developer-room-ids-value');
                        
                        container.addEventListener('change', function(e) {
                            if (e.target.type === 'checkbox') {
                                var checked = container.querySelectorAll('input[type="checkbox"]:checked');
                                var ids = Array.from(checked).map(function(cb) { return cb.value; });
                                hiddenInput.value = ids.join(',');
                                hiddenInput.dispatchEvent(new Event('change'));
                            }
                        });
                    })();
                </script>
            <?php endif; ?>
            <?php
        }
        
        private function get_rooms() {
            $client_id = get_option('gas_client_id', '');
            if (empty($client_id)) {
                return array();
            }
            
            // Try to get cached rooms first
            $cache_key = 'developer_rooms_cache_' . $client_id;
            $rooms = get_transient($cache_key);
            
            if ($rooms === false) {
                $api_url = get_option('gas_api_url', 'https://gas-booking-production.up.railway.app');
                $response = wp_remote_get("{$api_url}/api/public/client/{$client_id}/rooms", array(
                    'timeout' => 15,
                    'sslverify' => false
                ));
                
                if (!is_wp_error($response)) {
                    $body = json_decode(wp_remote_retrieve_body($response), true);
                    $rooms = $body['rooms'] ?? array();
                    // Cache for 5 minutes
                    set_transient($cache_key, $rooms, 5 * MINUTE_IN_SECONDS);
                } else {
                    $rooms = array();
                }
            }
            
            return $rooms;
        }
    }
}

/**
 * Customizer Settings
 */
function developer_developer_customizer($wp_customize) {
    
    // ===========================================
    // GLOBAL STYLES SECTION
    // ===========================================
    $wp_customize->add_section('developer_global_styles', array(
        'title'       => __('🎨 Global Styles', 'developer-developer'),
        'description' => __('These styles apply across all pages. Use CSS for page-specific overrides.', 'developer-developer'),
        'priority'    => 24,
    ));
    
    // Primary Button Background
    $wp_customize->add_setting('developer_btn_primary_bg', array(
        'default'           => '#2563eb',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_btn_primary_bg', array(
        'label'   => __('Primary Button Background', 'developer-developer'),
        'section' => 'developer_global_styles',
    )));
    
    // Primary Button Text
    $wp_customize->add_setting('developer_btn_primary_text', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_btn_primary_text', array(
        'label'   => __('Primary Button Text', 'developer-developer'),
        'section' => 'developer_global_styles',
    )));
    
    // Secondary Button Background
    $wp_customize->add_setting('developer_btn_secondary_bg', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_btn_secondary_bg', array(
        'label'   => __('Secondary Button Background', 'developer-developer'),
        'section' => 'developer_global_styles',
    )));
    
    // Secondary Button Text
    $wp_customize->add_setting('developer_btn_secondary_text', array(
        'default'           => '#2563eb',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_btn_secondary_text', array(
        'label'   => __('Secondary Button Text', 'developer-developer'),
        'section' => 'developer_global_styles',
    )));
    
    // Page Title Size
    $wp_customize->add_setting('developer_page_title_size', array(
        'default'           => '42',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_page_title_size', array(
        'label'       => __('Page Title Size (px)', 'developer-developer'),
        'section'     => 'developer_global_styles',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 28,
            'max'  => 72,
            'step' => 2,
        ),
    ));
    
    // Body Text Size
    $wp_customize->add_setting('developer_body_text_size', array(
        'default'           => '16',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_body_text_size', array(
        'label'       => __('Body Text Size (px)', 'developer-developer'),
        'section'     => 'developer_global_styles',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 14,
            'max'  => 20,
            'step' => 1,
        ),
    ));
    
    // Button Border Radius
    $wp_customize->add_setting('developer_btn_radius', array(
        'default'           => '8',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_btn_radius', array(
        'label'       => __('Button Border Radius (px)', 'developer-developer'),
        'description' => __('0 = square, 50 = very rounded', 'developer-developer'),
        'section'     => 'developer_global_styles',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 0,
            'max'  => 50,
            'step' => 2,
        ),
    ));
    
    // Link Color
    $wp_customize->add_setting('developer_link_color', array(
        'default'           => '#2563eb',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_link_color', array(
        'label'   => __('Link Color', 'developer-developer'),
        'section' => 'developer_global_styles',
    )));
    
    // Custom CSS
    $wp_customize->add_setting('developer_custom_css', array(
        'default'           => '',
        'sanitize_callback' => 'wp_strip_all_tags',
    ));
    $wp_customize->add_control('developer_custom_css', array(
        'label'       => __('Custom CSS', 'developer-developer'),
        'description' => __('Add custom CSS for specific overrides', 'developer-developer'),
        'section'     => 'developer_global_styles',
        'type'        => 'textarea',
    ));
    
    // ===========================================
    // GLOBAL COLORS SECTION
    // ===========================================
    $wp_customize->add_section('developer_colors', array(
        'title'    => __('🎨 Colors & Branding', 'developer-developer'),
        'priority' => 25,
    ));
    
    // Primary Color
    $wp_customize->add_setting('developer_primary_color', array(
        'default'           => '#2563eb',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_primary_color', array(
        'label'   => __('Primary Color (Buttons, Links)', 'developer-developer'),
        'section' => 'developer_colors',
    )));
    
    // Secondary Color
    $wp_customize->add_setting('developer_secondary_color', array(
        'default'           => '#0f172a',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_secondary_color', array(
        'label'   => __('Secondary Color (Headers, Footer)', 'developer-developer'),
        'section' => 'developer_colors',
    )));
    
    // Accent Color
    $wp_customize->add_setting('developer_accent_color', array(
        'default'           => '#f59e0b',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_accent_color', array(
        'label'   => __('Accent Color (Stars, Highlights)', 'developer-developer'),
        'section' => 'developer_colors',
    )));
    
    // ===========================================
    // TYPOGRAPHY SECTION
    // ===========================================
    $wp_customize->add_section('developer_typography', array(
        'title'    => __('✏️ Typography', 'developer-developer'),
        'priority' => 26,
    ));
    
    // Heading Font
    $wp_customize->add_setting('developer_heading_font', array(
        'default'           => 'playfair',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_heading_font', array(
        'label'   => __('Heading Font', 'developer-developer'),
        'section' => 'developer_typography',
        'type'    => 'select',
        'choices' => array(
            'playfair'   => 'Playfair Display (Elegant)',
            'montserrat' => 'Montserrat (Modern)',
            'lora'       => 'Lora (Classic)',
            'poppins'    => 'Poppins (Clean)',
            'merriweather' => 'Merriweather (Traditional)',
            'raleway'    => 'Raleway (Light)',
            'oswald'     => 'Oswald (Bold)',
        ),
    ));
    
    // Body Font
    $wp_customize->add_setting('developer_body_font', array(
        'default'           => 'inter',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_body_font', array(
        'label'   => __('Body Font', 'developer-developer'),
        'section' => 'developer_typography',
        'type'    => 'select',
        'choices' => array(
            'inter'      => 'Inter (Modern)',
            'roboto'     => 'Roboto (Clean)',
            'opensans'   => 'Open Sans (Friendly)',
            'lato'       => 'Lato (Professional)',
            'sourcesans' => 'Source Sans Pro (Readable)',
            'nunito'     => 'Nunito (Rounded)',
        ),
    ));
    
    // ===========================================
    // HEADER & MENU SECTION
    // ===========================================
    $wp_customize->add_section('developer_header', array(
        'title'    => __('📌 Header & Menu', 'developer-developer'),
        'priority' => 27,
    ));
    
    // Menu Layout
    $wp_customize->add_setting('developer_menu_layout', array(
        'default'           => 'logo-left',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_menu_layout', array(
        'label'   => __('Menu Layout', 'developer-developer'),
        'section' => 'developer_header',
        'type'    => 'select',
        'choices' => array(
            'logo-left'   => 'Logo Left, Menu Right',
            'logo-center' => 'Logo Center, Menu Split',
            'logo-right'  => 'Logo Right, Menu Left',
            'stacked'     => 'Logo Top, Menu Below (Centered)',
        ),
    ));
    
    // Header Background Color
    $wp_customize->add_setting('developer_header_bg_color', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_header_bg_color', array(
        'label'   => __('Header Background Color', 'developer-developer'),
        'section' => 'developer_header',
    )));
    
    // Header Text/Link Color
    $wp_customize->add_setting('developer_header_text_color', array(
        'default'           => '#1e293b',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_header_text_color', array(
        'label'   => __('Menu Link Color', 'developer-developer'),
        'section' => 'developer_header',
    )));
    
    // Header Logo/Site Title Color
    $wp_customize->add_setting('developer_header_logo_color', array(
        'default'           => '#0f172a',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_header_logo_color', array(
        'label'   => __('Logo/Site Title Color', 'developer-developer'),
        'section' => 'developer_header',
    )));
    
    // Header CTA Button Color
    $wp_customize->add_setting('developer_header_cta_bg', array(
        'default'           => '#2563eb',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_header_cta_bg', array(
        'label'   => __('CTA Button Background', 'developer-developer'),
        'section' => 'developer_header',
    )));
    
    // Header CTA Button Text Color
    $wp_customize->add_setting('developer_header_cta_text', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_header_cta_text', array(
        'label'   => __('CTA Button Text Color', 'developer-developer'),
        'section' => 'developer_header',
    )));
    
    // Header Font
    $wp_customize->add_setting('developer_header_font', array(
        'default'           => 'inter',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_header_font', array(
        'label'   => __('Menu Font', 'developer-developer'),
        'section' => 'developer_header',
        'type'    => 'select',
        'choices' => array(
            'inter'       => 'Inter (Modern)',
            'roboto'      => 'Roboto (Clean)',
            'opensans'    => 'Open Sans (Friendly)',
            'lato'        => 'Lato (Professional)',
            'montserrat'  => 'Montserrat (Bold)',
            'poppins'     => 'Poppins (Rounded)',
            'raleway'     => 'Raleway (Elegant)',
        ),
    ));
    
    // Menu Font Size
    $wp_customize->add_setting('developer_header_font_size', array(
        'default'           => '15',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_header_font_size', array(
        'label'       => __('Menu Font Size (px)', 'developer-developer'),
        'section'     => 'developer_header',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 12,
            'max'  => 20,
            'step' => 1,
        ),
    ));
    
    // Menu Font Weight
    $wp_customize->add_setting('developer_header_font_weight', array(
        'default'           => '500',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_header_font_weight', array(
        'label'   => __('Menu Font Weight', 'developer-developer'),
        'section' => 'developer_header',
        'type'    => 'select',
        'choices' => array(
            '400' => 'Normal (400)',
            '500' => 'Medium (500)',
            '600' => 'Semi-Bold (600)',
            '700' => 'Bold (700)',
        ),
    ));
    
    // Menu Text Transform
    $wp_customize->add_setting('developer_header_text_transform', array(
        'default'           => 'none',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_header_text_transform', array(
        'label'   => __('Menu Text Style', 'developer-developer'),
        'section' => 'developer_header',
        'type'    => 'select',
        'choices' => array(
            'none'       => 'Normal',
            'uppercase'  => 'UPPERCASE',
            'capitalize' => 'Capitalize',
        ),
    ));
    
    // Header Border
    $wp_customize->add_setting('developer_header_border', array(
        'default'           => false,
        'sanitize_callback' => 'wp_validate_boolean',
    ));
    $wp_customize->add_control('developer_header_border', array(
        'label'   => __('Show Bottom Border', 'developer-developer'),
        'section' => 'developer_header',
        'type'    => 'checkbox',
    ));
    
    // Header Border Color
    $wp_customize->add_setting('developer_header_border_color', array(
        'default'           => '#e2e8f0',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_header_border_color', array(
        'label'   => __('Border Color', 'developer-developer'),
        'section' => 'developer_header',
    )));
    
    // Header Transparency
    $wp_customize->add_setting('developer_header_transparent', array(
        'default'           => false,
        'sanitize_callback' => 'wp_validate_boolean',
    ));
    $wp_customize->add_control('developer_header_transparent', array(
        'label'       => __('Transparent on Hero', 'developer-developer'),
        'description' => __('Header becomes transparent over hero image', 'developer-developer'),
        'section'     => 'developer_header',
        'type'        => 'checkbox',
    ));
    
    // Sticky Header
    $wp_customize->add_setting('developer_header_sticky', array(
        'default'           => true,
        'sanitize_callback' => 'wp_validate_boolean',
    ));
    $wp_customize->add_control('developer_header_sticky', array(
        'label'   => __('Sticky Header on Scroll', 'developer-developer'),
        'section' => 'developer_header',
        'type'    => 'checkbox',
    ));
    
    // ===========================================
    // HERO SECTION
    // ===========================================
    $wp_customize->add_section('developer_hero', array(
        'title'    => __('🖼️ Hero Section', 'developer-developer'),
        'priority' => 30,
    ));
    
    // Hero Background Image
    $wp_customize->add_setting('developer_hero_bg', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
    ));
    $wp_customize->add_control(new WP_Customize_Image_Control($wp_customize, 'developer_hero_bg', array(
        'label'    => __('Hero Background Image', 'developer-developer'),
        'section'  => 'developer_hero',
    )));
    
    // Hero Background Video URL
    $wp_customize->add_setting('developer_hero_video_url', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
    ));
    $wp_customize->add_control('developer_hero_video_url', array(
        'label'       => __('Hero Video URL (MP4)', 'developer-developer'),
        'description' => __('Enter MP4 video URL for hero background. Leave empty to use image only.', 'developer-developer'),
        'section'     => 'developer_hero',
        'type'        => 'url',
    ));
    
    // Hero Overlay Color
    $wp_customize->add_setting('developer_hero_overlay_color', array(
        'default'           => '#0f172a',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_hero_overlay_color', array(
        'label'   => __('Overlay Color', 'developer-developer'),
        'section' => 'developer_hero',
    )));
    
    // Hero Overlay Opacity
    $wp_customize->add_setting('developer_hero_opacity', array(
        'default'           => 30,
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_hero_opacity', array(
        'label'       => __('Overlay Darkness (%)', 'developer-developer'),
        'description' => __('0 = No overlay, 100 = Full dark', 'developer-developer'),
        'section'     => 'developer_hero',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 0,
            'max'  => 100,
            'step' => 5,
        ),
    ));
    
    // Hero Height
    $wp_customize->add_setting('developer_hero_height', array(
        'default'           => '90',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_hero_height', array(
        'label'       => __('Hero Height (vh)', 'developer-developer'),
        'description' => __('Percentage of screen height', 'developer-developer'),
        'section'     => 'developer_hero',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 50,
            'max'  => 100,
            'step' => 5,
        ),
    ));
    
    // Hero Badge Text
    $wp_customize->add_setting('developer_hero_badge', array(
        'default'           => 'Welcome to Paradise',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_hero_badge', array(
        'label'   => __('Hero Badge Text', 'developer-developer'),
        'section' => 'developer_hero',
        'type'    => 'text',
    ));
    
    // Hero Badge Link
    $wp_customize->add_setting('developer_hero_badge_link', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
    ));
    $wp_customize->add_control('developer_hero_badge_link', array(
        'label'       => __('Badge Link URL', 'developer-developer'),
        'description' => __('Optional - make badge clickable', 'developer-developer'),
        'section'     => 'developer_hero',
        'type'        => 'url',
    ));
    
    // Hero Badge Background Color
    $wp_customize->add_setting('developer_hero_badge_bg', array(
        'default'           => 'rgba(255,255,255,0.15)',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_hero_badge_bg', array(
        'label'       => __('Badge Background', 'developer-developer'),
        'description' => __('Use rgba for transparency, e.g. rgba(255,255,255,0.2)', 'developer-developer'),
        'section'     => 'developer_hero',
        'type'        => 'text',
    ));
    
    // Hero Badge Text Color
    $wp_customize->add_setting('developer_hero_badge_text', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_hero_badge_text', array(
        'label'   => __('Badge Text Color', 'developer-developer'),
        'section' => 'developer_hero',
    )));
    
    // Hero Badge Border Color
    $wp_customize->add_setting('developer_hero_badge_border', array(
        'default'           => 'rgba(255,255,255,0.3)',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_hero_badge_border', array(
        'label'       => __('Badge Border Color', 'developer-developer'),
        'description' => __('Use rgba for transparency', 'developer-developer'),
        'section'     => 'developer_hero',
        'type'        => 'text',
    ));
    
    // Hero Title
    $wp_customize->add_setting('developer_hero_title', array(
        'default'           => 'Find Your Perfect Vacation Rental',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_hero_title', array(
        'label'   => __('Hero Title', 'developer-developer'),
        'section' => 'developer_hero',
        'type'    => 'text',
    ));
    
    // Hero Subtitle
    $wp_customize->add_setting('developer_hero_subtitle', array(
        'default'           => 'Discover stunning vacation rentals with luxury amenities, prime locations, and unforgettable experiences.',
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    $wp_customize->add_control('developer_hero_subtitle', array(
        'label'   => __('Hero Subtitle', 'developer-developer'),
        'section' => 'developer_hero',
        'type'    => 'textarea',
    ));
    
    // Hero Trust Badge 1
    $wp_customize->add_setting('developer_hero_trust_1', array(
        'default'           => 'Instant Booking',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_hero_trust_1', array(
        'label'       => __('Trust Badge 1', 'developer-developer'),
        'description' => __('Leave empty to hide', 'developer-developer'),
        'section'     => 'developer_hero',
        'type'        => 'text',
    ));
    
    // Hero Trust Badge 2
    $wp_customize->add_setting('developer_hero_trust_2', array(
        'default'           => 'Best Price Guarantee',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_hero_trust_2', array(
        'label'   => __('Trust Badge 2', 'developer-developer'),
        'section' => 'developer_hero',
        'type'    => 'text',
    ));
    
    // Hero Trust Badge 3
    $wp_customize->add_setting('developer_hero_trust_3', array(
        'default'           => '24/7 Support',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_hero_trust_3', array(
        'label'   => __('Trust Badge 3', 'developer-developer'),
        'section' => 'developer_hero',
        'type'    => 'text',
    ));
    
    // ===========================================
    // SEARCH WIDGET SECTION
    // ===========================================
    $wp_customize->add_section('developer_search_widget', array(
        'title'    => __('🔍 Search Widget', 'developer-developer'),
        'priority' => 30,
    ));
    
    // Search Widget Background Color
    $wp_customize->add_setting('developer_search_bg', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_search_bg', array(
        'label'   => __('Widget Background Color', 'developer-developer'),
        'section' => 'developer_search_widget',
    )));
    
    // Search Widget Background Opacity
    $wp_customize->add_setting('developer_search_opacity', array(
        'default'           => 100,
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_search_opacity', array(
        'label'       => __('Background Opacity (%)', 'developer-developer'),
        'description' => __('0 = Fully transparent, 100 = Solid', 'developer-developer'),
        'section'     => 'developer_search_widget',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 0,
            'max'  => 100,
            'step' => 5,
        ),
    ));
    
    // Search Widget Border Radius
    $wp_customize->add_setting('developer_search_radius', array(
        'default'           => '16',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_search_radius', array(
        'label'       => __('Corner Radius (px)', 'developer-developer'),
        'section'     => 'developer_search_widget',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 0,
            'max'  => 30,
            'step' => 2,
        ),
    ));
    
    // Search Button Color
    $wp_customize->add_setting('developer_search_btn_bg', array(
        'default'           => '#2563eb',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_search_btn_bg', array(
        'label'   => __('Search Button Color', 'developer-developer'),
        'section' => 'developer_search_widget',
    )));
    
    // Search Button Text Color
    $wp_customize->add_setting('developer_search_btn_text', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_search_btn_text', array(
        'label'   => __('Search Button Text Color', 'developer-developer'),
        'section' => 'developer_search_widget',
    )));
    
    // Text Below Search Widget
    $wp_customize->add_setting('developer_search_below_text', array(
        'default'           => '',
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    $wp_customize->add_control('developer_search_below_text', array(
        'label'       => __('Text Below Search', 'developer-developer'),
        'description' => __('Additional message shown below the search widget', 'developer-developer'),
        'section'     => 'developer_search_widget',
        'type'        => 'textarea',
    ));
    
    // Search Widget Max Width
    $wp_customize->add_setting('developer_search_max_width', array(
        'default'           => '900',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_search_max_width', array(
        'label'       => __('Max Width (px)', 'developer-developer'),
        'description' => __('Maximum width of the search widget', 'developer-developer'),
        'section'     => 'developer_search_widget',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 500,
            'max'  => 1200,
            'step' => 50,
        ),
    ));
    
    // Search Widget Scale
    $wp_customize->add_setting('developer_search_scale', array(
        'default'           => '100',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_search_scale', array(
        'label'       => __('Size Scale (%)', 'developer-developer'),
        'description' => __('Scale the search widget size (100 = normal)', 'developer-developer'),
        'section'     => 'developer_search_widget',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 70,
            'max'  => 120,
            'step' => 5,
        ),
    ));
    
    // ===========================================
    // INTRO SECTION (between hero and featured)
    // ===========================================
    $wp_customize->add_section('developer_intro', array(
        'title'       => __('📝 Intro Section', 'developer-developer'),
        'description' => __('Optional section between hero and featured properties', 'developer-developer'),
        'priority'    => 30,
    ));
    
    // Enable Intro Section
    $wp_customize->add_setting('developer_intro_enabled', array(
        'default'           => true,
        'sanitize_callback' => 'wp_validate_boolean',
        'transport'         => 'refresh',
    ));
    $wp_customize->add_control('developer_intro_enabled', array(
        'label'   => __('Enable Intro Section', 'developer-developer'),
        'section' => 'developer_intro',
        'type'    => 'checkbox',
    ));
    
    // Intro Background Color
    $wp_customize->add_setting('developer_intro_bg', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_intro_bg', array(
        'label'   => __('Background Color', 'developer-developer'),
        'section' => 'developer_intro',
    )));
    
    // Intro Text Color
    $wp_customize->add_setting('developer_intro_text_color', array(
        'default'           => '#1e293b',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_intro_text_color', array(
        'label'   => __('Text Color', 'developer-developer'),
        'section' => 'developer_intro',
    )));
    
    // Intro Title
    $wp_customize->add_setting('developer_intro_title', array(
        'default'           => 'Welcome to Our Property',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_intro_title', array(
        'label'   => __('Title', 'developer-developer'),
        'section' => 'developer_intro',
        'type'    => 'text',
    ));
    
    // Intro Title Font Size
    $wp_customize->add_setting('developer_intro_title_size', array(
        'default'           => '36',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_intro_title_size', array(
        'label'       => __('Title Font Size (px)', 'developer-developer'),
        'section'     => 'developer_intro',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 20,
            'max'  => 60,
            'step' => 2,
        ),
    ));
    
    // Intro Text
    $wp_customize->add_setting('developer_intro_text', array(
        'default'           => 'We are delighted to have you here. Explore our beautiful accommodations and find your perfect stay.',
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    $wp_customize->add_control('developer_intro_text', array(
        'label'   => __('Text', 'developer-developer'),
        'section' => 'developer_intro',
        'type'    => 'textarea',
    ));
    
    // Intro Text Font Size
    $wp_customize->add_setting('developer_intro_text_size', array(
        'default'           => '18',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_intro_text_size', array(
        'label'       => __('Text Font Size (px)', 'developer-developer'),
        'section'     => 'developer_intro',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 14,
            'max'  => 24,
            'step' => 1,
        ),
    ));
    
    // Intro Max Width
    $wp_customize->add_setting('developer_intro_max_width', array(
        'default'           => '800',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_intro_max_width', array(
        'label'       => __('Content Max Width (px)', 'developer-developer'),
        'description' => __('Controls how wide the text spreads', 'developer-developer'),
        'section'     => 'developer_intro',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 600,
            'max'  => 1200,
            'step' => 50,
        ),
    ));
    
    // Intro Button Text
    $wp_customize->add_setting('developer_intro_btn_text', array(
        'default'           => '',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_intro_btn_text', array(
        'label'       => __('Button Text', 'developer-developer'),
        'description' => __('Leave empty to hide button', 'developer-developer'),
        'section'     => 'developer_intro',
        'type'        => 'text',
    ));
    
    // Intro Button URL
    $wp_customize->add_setting('developer_intro_btn_url', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
    ));
    $wp_customize->add_control('developer_intro_btn_url', array(
        'label'   => __('Button URL', 'developer-developer'),
        'section' => 'developer_intro',
        'type'    => 'url',
    ));
    
    // Intro Button Background Color
    $wp_customize->add_setting('developer_intro_btn_bg', array(
        'default'           => '#2563eb',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_intro_btn_bg', array(
        'label'   => __('Button Background Color', 'developer-developer'),
        'section' => 'developer_intro',
    )));
    
    // Intro Button Text Color
    $wp_customize->add_setting('developer_intro_btn_text_color', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_intro_btn_text_color', array(
        'label'   => __('Button Text Color', 'developer-developer'),
        'section' => 'developer_intro',
    )));
    
    // ===========================================
    // FEATURED PROPERTIES SECTION
    // ===========================================
    $wp_customize->add_section('developer_featured_props', array(
        'title'       => __('🏠 Featured Properties', 'developer-developer'),
        'priority'    => 31,
    ));
    
    // Featured Display Mode
    $wp_customize->add_setting('developer_featured_mode', array(
        'default'           => 'all',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_featured_mode', array(
        'label'   => __('Display Mode', 'developer-developer'),
        'section' => 'developer_featured_props',
        'type'    => 'select',
        'choices' => array(
            'all'      => 'Show All Properties',
            'random'   => 'Random Selection',
            'specific' => 'Specific Rooms (select below)',
        ),
    ));
    
    // Number of Featured Properties (for random)
    $wp_customize->add_setting('developer_featured_count', array(
        'default'           => 3,
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_featured_count', array(
        'label'       => __('Number to Show', 'developer-developer'),
        'description' => __('For "Random" or "All" mode', 'developer-developer'),
        'section'     => 'developer_featured_props',
        'type'        => 'number',
        'input_attrs' => array(
            'min' => 1,
            'max' => 12,
        ),
    ));
    
    // Room Selector (custom control)
    $wp_customize->add_setting('developer_featured_ids', array(
        'default'           => '',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control(new Developer_Room_Selector_Control($wp_customize, 'developer_featured_ids', array(
        'label'       => __('Select Rooms to Feature', 'developer-developer'),
        'description' => __('Check the rooms you want to display (for "Specific Rooms" mode)', 'developer-developer'),
        'section'     => 'developer_featured_props',
    )));
    
    // Featured Section Title
    $wp_customize->add_setting('developer_featured_title', array(
        'default'           => 'Featured Properties',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_featured_title', array(
        'label'   => __('Section Title', 'developer-developer'),
        'section' => 'developer_featured_props',
        'type'    => 'text',
    ));
    
    // Featured Section Subtitle
    $wp_customize->add_setting('developer_featured_subtitle', array(
        'default'           => 'Discover our handpicked selection of stunning vacation rentals, each offering unique experiences and exceptional comfort.',
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    $wp_customize->add_control('developer_featured_subtitle', array(
        'label'   => __('Section Subtitle', 'developer-developer'),
        'section' => 'developer_featured_props',
        'type'    => 'textarea',
    ));
    
    // Featured Button Text
    $wp_customize->add_setting('developer_featured_btn_text', array(
        'default'           => 'View All Properties',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_featured_btn_text', array(
        'label'       => __('Button Text', 'developer-developer'),
        'description' => __('Leave empty to hide button', 'developer-developer'),
        'section'     => 'developer_featured_props',
        'type'        => 'text',
    ));
    
    // Featured Button URL
    $wp_customize->add_setting('developer_featured_btn_url', array(
        'default'           => '/book-now/',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_featured_btn_url', array(
        'label'   => __('Button URL', 'developer-developer'),
        'section' => 'developer_featured_props',
        'type'    => 'text',
    ));
    
    // Featured Button Background Color
    $wp_customize->add_setting('developer_featured_btn_bg', array(
        'default'           => '#2563eb',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_featured_btn_bg', array(
        'label'   => __('Button Background Color', 'developer-developer'),
        'section' => 'developer_featured_props',
    )));
    
    // Featured Button Text Color
    $wp_customize->add_setting('developer_featured_btn_text_color', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_featured_btn_text_color', array(
        'label'   => __('Button Text Color', 'developer-developer'),
        'section' => 'developer_featured_props',
    )));
    
    // ===========================================
    // SECTIONS BACKGROUNDS
    // ===========================================
    $wp_customize->add_section('developer_sections', array(
        'title'    => __('📦 Section Backgrounds', 'developer-developer'),
        'priority' => 32,
    ));
    
    // Featured Section Background
    $wp_customize->add_setting('developer_featured_bg', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_featured_bg', array(
        'label'   => __('Featured Properties Background', 'developer-developer'),
        'section' => 'developer_sections',
    )));
    
    // About Section Background
    $wp_customize->add_setting('developer_about_bg', array(
        'default'           => '#f8fafc',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_about_bg', array(
        'label'   => __('About Section Background', 'developer-developer'),
        'section' => 'developer_sections',
    )));
    
    // Testimonials Background
    $wp_customize->add_setting('developer_testimonials_bg', array(
        'default'           => '#0f172a',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_testimonials_bg', array(
        'label'   => __('Testimonials Background', 'developer-developer'),
        'section' => 'developer_sections',
    )));
    
    // CTA Background (keeping for backwards compatibility)
    $wp_customize->add_setting('developer_cta_bg', array(
        'default'           => '#2563eb',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_cta_bg', array(
        'label'   => __('CTA Section Background', 'developer-developer'),
        'section' => 'developer_sections',
    )));
    
    // ===========================================
    // CTA SECTION
    // ===========================================
    $wp_customize->add_section('developer_cta', array(
        'title'       => __('📢 CTA Section', 'developer-developer'),
        'description' => __('Call-to-action banner above the footer', 'developer-developer'),
        'priority'    => 36,
    ));
    
    // Enable CTA Section
    $wp_customize->add_setting('developer_cta_enabled', array(
        'default'           => true,
        'sanitize_callback' => 'wp_validate_boolean',
    ));
    $wp_customize->add_control('developer_cta_enabled', array(
        'label'   => __('Enable CTA Section', 'developer-developer'),
        'section' => 'developer_cta',
        'type'    => 'checkbox',
    ));
    
    // CTA Title
    $wp_customize->add_setting('developer_cta_title', array(
        'default'           => 'Ready to Book Your Stay?',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_cta_title', array(
        'label'   => __('Title', 'developer-developer'),
        'section' => 'developer_cta',
        'type'    => 'text',
    ));
    
    // CTA Title Font Size
    $wp_customize->add_setting('developer_cta_title_size', array(
        'default'           => '36',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_cta_title_size', array(
        'label'       => __('Title Font Size (px)', 'developer-developer'),
        'section'     => 'developer_cta',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 24,
            'max'  => 60,
            'step' => 2,
        ),
    ));
    
    // CTA Text
    $wp_customize->add_setting('developer_cta_text', array(
        'default'           => 'Find your perfect vacation rental today and create memories that last a lifetime.',
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    $wp_customize->add_control('developer_cta_text', array(
        'label'   => __('Text', 'developer-developer'),
        'section' => 'developer_cta',
        'type'    => 'textarea',
    ));
    
    // CTA Text Font Size
    $wp_customize->add_setting('developer_cta_text_size', array(
        'default'           => '18',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_cta_text_size', array(
        'label'       => __('Text Font Size (px)', 'developer-developer'),
        'section'     => 'developer_cta',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 14,
            'max'  => 24,
            'step' => 1,
        ),
    ));
    
    // CTA Background Color
    $wp_customize->add_setting('developer_cta_background', array(
        'default'           => '#2563eb',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_cta_background', array(
        'label'   => __('Background Color', 'developer-developer'),
        'section' => 'developer_cta',
    )));
    
    // CTA Text Color
    $wp_customize->add_setting('developer_cta_text_color', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_cta_text_color', array(
        'label'   => __('Text Color', 'developer-developer'),
        'section' => 'developer_cta',
    )));
    
    // CTA Button Text
    $wp_customize->add_setting('developer_cta_btn_text', array(
        'default'           => 'Browse Properties',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_cta_btn_text', array(
        'label'       => __('Button Text', 'developer-developer'),
        'description' => __('Leave empty to hide button', 'developer-developer'),
        'section'     => 'developer_cta',
        'type'        => 'text',
    ));
    
    // CTA Button URL
    $wp_customize->add_setting('developer_cta_btn_url', array(
        'default'           => '/book-now/',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_cta_btn_url', array(
        'label'   => __('Button URL', 'developer-developer'),
        'section' => 'developer_cta',
        'type'    => 'text',
    ));
    
    // CTA Button Background Color
    $wp_customize->add_setting('developer_cta_btn_bg', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_cta_btn_bg', array(
        'label'   => __('Button Background Color', 'developer-developer'),
        'section' => 'developer_cta',
    )));
    
    // CTA Button Text Color
    $wp_customize->add_setting('developer_cta_btn_text_color', array(
        'default'           => '#2563eb',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_cta_btn_text_color', array(
        'label'   => __('Button Text Color', 'developer-developer'),
        'section' => 'developer_cta',
    )));
    
    // ===========================================
    // REVIEWS SECTION
    // ===========================================
    $wp_customize->add_section('developer_reviews', array(
        'title'       => __('⭐ Reviews Section', 'developer-developer'),
        'description' => __('Display reviews from TripAdvisor, Booking.com, Google and more', 'developer-developer'),
        'priority'    => 34,
    ));
    
    // Enable Reviews Section
    $wp_customize->add_setting('developer_reviews_enabled', array(
        'default'           => false,
        'sanitize_callback' => 'wp_validate_boolean',
    ));
    $wp_customize->add_control('developer_reviews_enabled', array(
        'label'   => __('Enable Reviews Section', 'developer-developer'),
        'section' => 'developer_reviews',
        'type'    => 'checkbox',
    ));
    
    // Reviews Section Title
    $wp_customize->add_setting('developer_reviews_title', array(
        'default'           => 'What Our Guests Say',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_reviews_title', array(
        'label'   => __('Section Title', 'developer-developer'),
        'section' => 'developer_reviews',
        'type'    => 'text',
    ));
    
    // Reviews Section Subtitle
    $wp_customize->add_setting('developer_reviews_subtitle', array(
        'default'           => 'Real reviews from real guests across all platforms',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_reviews_subtitle', array(
        'label'   => __('Section Subtitle', 'developer-developer'),
        'section' => 'developer_reviews',
        'type'    => 'text',
    ));
    
    // Reviews Background Color
    $wp_customize->add_setting('developer_reviews_bg', array(
        'default'           => '#0f172a',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_reviews_bg', array(
        'label'   => __('Background Color', 'developer-developer'),
        'section' => 'developer_reviews',
    )));
    
    // Reviews Text Color
    $wp_customize->add_setting('developer_reviews_text_color', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_reviews_text_color', array(
        'label'   => __('Text Color', 'developer-developer'),
        'section' => 'developer_reviews',
    )));
    
    // Reviews Display Style
    $wp_customize->add_setting('developer_reviews_style', array(
        'default'           => 'slider',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_reviews_style', array(
        'label'   => __('Display Style', 'developer-developer'),
        'section' => 'developer_reviews',
        'type'    => 'select',
        'choices' => array(
            'slider'  => __('Slider (Auto-scrolling testimonials)', 'developer-developer'),
            'grid'    => __('Grid (Review cards)', 'developer-developer'),
            'badges'  => __('Badges Only (Rating scores)', 'developer-developer'),
            'summary' => __('Summary (Overall rating)', 'developer-developer'),
        ),
    ));
    
    // Number of Reviews (for grid)
    $wp_customize->add_setting('developer_reviews_limit', array(
        'default'           => '6',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_reviews_limit', array(
        'label'       => __('Number of Reviews', 'developer-developer'),
        'description' => __('For Grid style only', 'developer-developer'),
        'section'     => 'developer_reviews',
        'type'        => 'select',
        'choices'     => array(
            '3' => '3',
            '6' => '6',
            '9' => '9',
            '12' => '12',
        ),
    ));
    
    // ===========================================
    // ABOUT SECTION
    // ===========================================
    $wp_customize->add_section('developer_about', array(
        'title'    => __('ℹ️ About Section', 'developer-developer'),
        'priority' => 35,
    ));
    
    // About Image
    $wp_customize->add_setting('developer_about_image', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
    ));
    $wp_customize->add_control(new WP_Customize_Image_Control($wp_customize, 'developer_about_image', array(
        'label'   => __('About Image', 'developer-developer'),
        'section' => 'developer_about',
    )));
    
    // About Title
    $wp_customize->add_setting('developer_about_title', array(
        'default'           => 'Experience Luxury & Comfort',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_about_title', array(
        'label'   => __('About Title', 'developer-developer'),
        'section' => 'developer_about',
        'type'    => 'text',
    ));
    
    // About Text
    $wp_customize->add_setting('developer_about_text', array(
        'default'           => 'Our carefully curated collection of vacation rentals offers the perfect blend of luxury, comfort, and convenience. Whether you\'re planning a family reunion, a getaway with friends, or a romantic escape, we have the ideal property for you.',
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    $wp_customize->add_control('developer_about_text', array(
        'label'   => __('About Text', 'developer-developer'),
        'section' => 'developer_about',
        'type'    => 'textarea',
    ));
    
    // About Layout
    $wp_customize->add_setting('developer_about_layout', array(
        'default'           => 'image-left',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_about_layout', array(
        'label'   => __('About Layout', 'developer-developer'),
        'section' => 'developer_about',
        'type'    => 'select',
        'choices' => array(
            'image-left'  => 'Image Left, Text Right',
            'image-right' => 'Image Right, Text Left',
            'image-top'   => 'Image Top, Text Below',
        ),
    ));
    
    // About Button Text
    $wp_customize->add_setting('developer_about_btn_text', array(
        'default'           => 'Learn More',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_about_btn_text', array(
        'label'       => __('Button Text', 'developer-developer'),
        'description' => __('Leave empty to hide button', 'developer-developer'),
        'section'     => 'developer_about',
        'type'        => 'text',
    ));
    
    // About Button URL
    $wp_customize->add_setting('developer_about_btn_url', array(
        'default'           => '/about/',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_about_btn_url', array(
        'label'   => __('Button URL', 'developer-developer'),
        'section' => 'developer_about',
        'type'    => 'text',
    ));
    
    // About Button Background Color
    $wp_customize->add_setting('developer_about_btn_bg', array(
        'default'           => '#2563eb',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_about_btn_bg', array(
        'label'   => __('Button Background Color', 'developer-developer'),
        'section' => 'developer_about',
    )));
    
    // About Button Text Color
    $wp_customize->add_setting('developer_about_btn_text_color', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_about_btn_text_color', array(
        'label'   => __('Button Text Color', 'developer-developer'),
        'section' => 'developer_about',
    )));
    
    // About Title Font Size
    $wp_customize->add_setting('developer_about_title_size', array(
        'default'           => '36',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_about_title_size', array(
        'label'       => __('Title Font Size (px)', 'developer-developer'),
        'section'     => 'developer_about',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 24,
            'max'  => 60,
            'step' => 2,
        ),
    ));
    
    // About Text Font Size
    $wp_customize->add_setting('developer_about_text_size', array(
        'default'           => '16',
        'sanitize_callback' => 'absint',
    ));
    $wp_customize->add_control('developer_about_text_size', array(
        'label'       => __('Text Font Size (px)', 'developer-developer'),
        'section'     => 'developer_about',
        'type'        => 'range',
        'input_attrs' => array(
            'min'  => 14,
            'max'  => 22,
            'step' => 1,
        ),
    ));
    
    // About Feature 1
    $wp_customize->add_setting('developer_about_feature_1', array(
        'default'           => 'Spacious Bedrooms',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_about_feature_1', array(
        'label'       => __('Feature 1', 'developer-developer'),
        'description' => __('Leave empty to hide', 'developer-developer'),
        'section'     => 'developer_about',
        'type'        => 'text',
    ));
    
    // About Feature 2
    $wp_customize->add_setting('developer_about_feature_2', array(
        'default'           => 'Luxury Bathrooms',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_about_feature_2', array(
        'label'   => __('Feature 2', 'developer-developer'),
        'section' => 'developer_about',
        'type'    => 'text',
    ));
    
    // About Feature 3
    $wp_customize->add_setting('developer_about_feature_3', array(
        'default'           => 'Prime Locations',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_about_feature_3', array(
        'label'   => __('Feature 3', 'developer-developer'),
        'section' => 'developer_about',
        'type'    => 'text',
    ));
    
    // About Feature 4
    $wp_customize->add_setting('developer_about_feature_4', array(
        'default'           => 'Full Amenities',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_about_feature_4', array(
        'label'   => __('Feature 4', 'developer-developer'),
        'section' => 'developer_about',
        'type'    => 'text',
    ));
    
    // About Feature 5
    $wp_customize->add_setting('developer_about_feature_5', array(
        'default'           => 'Entertainment Areas',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_about_feature_5', array(
        'label'   => __('Feature 5', 'developer-developer'),
        'section' => 'developer_about',
        'type'    => 'text',
    ));
    
    // About Feature 6
    $wp_customize->add_setting('developer_about_feature_6', array(
        'default'           => 'Private Parking',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_about_feature_6', array(
        'label'   => __('Feature 6', 'developer-developer'),
        'section' => 'developer_about',
        'type'    => 'text',
    ));
    
    // ===========================================
    // FOOTER SECTION
    // ===========================================
    $wp_customize->add_section('developer_footer', array(
        'title'    => __('👣 Footer', 'developer-developer'),
        'priority' => 38,
    ));
    
    // Footer Background
    $wp_customize->add_setting('developer_footer_bg', array(
        'default'           => '#0f172a',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_footer_bg', array(
        'label'   => __('Footer Background', 'developer-developer'),
        'section' => 'developer_footer',
    )));
    
    // Footer Text Color
    $wp_customize->add_setting('developer_footer_text', array(
        'default'           => '#ffffff',
        'sanitize_callback' => 'sanitize_hex_color',
    ));
    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'developer_footer_text', array(
        'label'   => __('Footer Text Color', 'developer-developer'),
        'section' => 'developer_footer',
    )));
    
    // Footer Layout
    $wp_customize->add_setting('developer_footer_layout', array(
        'default'           => '4-columns',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_footer_layout', array(
        'label'   => __('Footer Layout', 'developer-developer'),
        'section' => 'developer_footer',
        'type'    => 'select',
        'choices' => array(
            '4-columns' => '4 Columns',
            '3-columns' => '3 Columns',
            '2-columns' => '2 Columns',
            'centered'  => 'Centered Simple',
        ),
    ));
    
    // ===========================================
    // CONTACT INFO SECTION
    // ===========================================
    $wp_customize->add_section('developer_contact', array(
        'title'    => __('📞 Contact Info', 'developer-developer'),
        'priority' => 40,
    ));
    
    // Email
    $wp_customize->add_setting('developer_email', array(
        'default'           => 'hello@example.com',
        'sanitize_callback' => 'sanitize_email',
    ));
    $wp_customize->add_control('developer_email', array(
        'label'   => __('Email Address', 'developer-developer'),
        'section' => 'developer_contact',
        'type'    => 'email',
    ));
    
    // Phone
    $wp_customize->add_setting('developer_phone', array(
        'default'           => '+1 (555) 123-4567',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_phone', array(
        'label'   => __('Phone Number', 'developer-developer'),
        'section' => 'developer_contact',
        'type'    => 'text',
    ));
    
    // Address
    $wp_customize->add_setting('developer_address', array(
        'default'           => '123 Main Street, City, State 12345',
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    $wp_customize->add_control('developer_address', array(
        'label'   => __('Address', 'developer-developer'),
        'section' => 'developer_contact',
        'type'    => 'textarea',
    ));
    
    // ===========================================
    // ABOUT PAGE SECTION (Full Page Content)
    // ===========================================
    $wp_customize->add_section('developer_about_page', array(
        'title'       => __('📄 About Page', 'developer-developer'),
        'description' => __('Content for the About Us page. Create a page with slug "about" to use this.', 'developer-developer'),
        'priority'    => 41,
    ));
    
    // Our Story
    $wp_customize->add_setting('developer_about_page_story', array(
        'default'           => '',
        'sanitize_callback' => 'wp_kses_post',
    ));
    $wp_customize->add_control('developer_about_page_story', array(
        'label'       => __('Our Story', 'developer-developer'),
        'description' => __('Tell your story - why you started, what makes you special', 'developer-developer'),
        'section'     => 'developer_about_page',
        'type'        => 'textarea',
    ));
    
    // History
    $wp_customize->add_setting('developer_about_page_history', array(
        'default'           => '',
        'sanitize_callback' => 'wp_kses_post',
    ));
    $wp_customize->add_control('developer_about_page_history', array(
        'label'       => __('History', 'developer-developer'),
        'description' => __('Building history, renovations, significance', 'developer-developer'),
        'section'     => 'developer_about_page',
        'type'        => 'textarea',
    ));
    
    // Host Name
    $wp_customize->add_setting('developer_about_page_host_name', array(
        'default'           => '',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_about_page_host_name', array(
        'label'   => __('Host/Owner Name', 'developer-developer'),
        'section' => 'developer_about_page',
        'type'    => 'text',
    ));
    
    // Host Title
    $wp_customize->add_setting('developer_about_page_host_title', array(
        'default'           => 'Owner & Host',
        'sanitize_callback' => 'sanitize_text_field',
    ));
    $wp_customize->add_control('developer_about_page_host_title', array(
        'label'   => __('Host Title', 'developer-developer'),
        'section' => 'developer_about_page',
        'type'    => 'text',
    ));
    
    // Host Bio
    $wp_customize->add_setting('developer_about_page_host_bio', array(
        'default'           => '',
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    $wp_customize->add_control('developer_about_page_host_bio', array(
        'label'   => __('Host Bio', 'developer-developer'),
        'section' => 'developer_about_page',
        'type'    => 'textarea',
    ));
    
    // Host Image
    $wp_customize->add_setting('developer_about_page_host_image', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
    ));
    $wp_customize->add_control(new WP_Customize_Image_Control($wp_customize, 'developer_about_page_host_image', array(
        'label'   => __('Host Photo', 'developer-developer'),
        'section' => 'developer_about_page',
    )));
    
    // Values (one per line: emoji|title|description)
    $wp_customize->add_setting('developer_about_page_values', array(
        'default'           => "🏠|Warm Hospitality|We treat every guest like family\n🌟|Attention to Detail|Every corner is thoughtfully designed\n🍳|Gourmet Breakfast|Start your day with a homemade feast\n📍|Perfect Location|Steps away from the best attractions",
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    $wp_customize->add_control('developer_about_page_values', array(
        'label'       => __('Values/Features', 'developer-developer'),
        'description' => __('One per line: emoji|title|description', 'developer-developer'),
        'section'     => 'developer_about_page',
        'type'        => 'textarea',
    ));
    
    // Amenities (one per line)
    $wp_customize->add_setting('developer_about_page_amenities', array(
        'default'           => "Free WiFi\nFree Parking\nGourmet Breakfast\nAir Conditioning\nPrivate Bathrooms\nGarden Access",
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    $wp_customize->add_control('developer_about_page_amenities', array(
        'label'       => __('Amenities List', 'developer-developer'),
        'description' => __('One amenity per line', 'developer-developer'),
        'section'     => 'developer_about_page',
        'type'        => 'textarea',
    ));
    
    // ===========================================
    // CONTACT PAGE SECTION (Full Page Content)
    // ===========================================
    $wp_customize->add_section('developer_contact_page', array(
        'title'       => __('📄 Contact Page', 'developer-developer'),
        'description' => __('Content for the Contact page. Create a page with slug "contact" to use this.', 'developer-developer'),
        'priority'    => 42,
    ));
    
    // Google Maps Embed
    $wp_customize->add_setting('developer_contact_page_map', array(
        'default'           => '',
        'sanitize_callback' => 'developer_sanitize_html',
    ));
    $wp_customize->add_control('developer_contact_page_map', array(
        'label'       => __('Google Maps Embed Code', 'developer-developer'),
        'description' => __('Paste iframe from Google Maps > Share > Embed', 'developer-developer'),
        'section'     => 'developer_contact_page',
        'type'        => 'textarea',
    ));
    
    // Google Maps Link
    $wp_customize->add_setting('developer_contact_page_map_link', array(
        'default'           => '',
        'sanitize_callback' => 'esc_url_raw',
    ));
    $wp_customize->add_control('developer_contact_page_map_link', array(
        'label'       => __('Google Maps Link', 'developer-developer'),
        'description' => __('Direct link to your location', 'developer-developer'),
        'section'     => 'developer_contact_page',
        'type'        => 'url',
    ));
    
    // Business Hours
    $wp_customize->add_setting('developer_contact_page_hours', array(
        'default'           => "Check-in: 3:00 PM - 8:00 PM\nCheck-out: by 11:00 AM\nOffice: 8:00 AM - 10:00 PM",
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    $wp_customize->add_control('developer_contact_page_hours', array(
        'label'   => __('Business Hours', 'developer-developer'),
        'section' => 'developer_contact_page',
        'type'    => 'textarea',
    ));
    
    // Contact Form Intro
    $wp_customize->add_setting('developer_contact_page_form_intro', array(
        'default'           => "Have a question or want to make a reservation? We'd love to hear from you!",
        'sanitize_callback' => 'sanitize_textarea_field',
    ));
    $wp_customize->add_control('developer_contact_page_form_intro', array(
        'label'   => __('Form Intro Text', 'developer-developer'),
        'section' => 'developer_contact_page',
        'type'    => 'textarea',
    ));
    
    // ===========================================
    // TERMS PAGE SECTION
    // ===========================================
    $wp_customize->add_section('developer_terms_page', array(
        'title'       => __('📄 Terms & Conditions', 'developer-developer'),
        'description' => __('Content for Terms page. Create a page with slug "terms" to use this.', 'developer-developer'),
        'priority'    => 43,
    ));
    
    // Terms Content
    $wp_customize->add_setting('developer_terms_content', array(
        'default'           => '',
        'sanitize_callback' => 'wp_kses_post',
    ));
    $wp_customize->add_control('developer_terms_content', array(
        'label'       => __('Terms & Conditions', 'developer-developer'),
        'description' => __('Your full terms and conditions text', 'developer-developer'),
        'section'     => 'developer_terms_page',
        'type'        => 'textarea',
    ));
    
    // ===========================================
    // PRIVACY PAGE SECTION
    // ===========================================
    $wp_customize->add_section('developer_privacy_page', array(
        'title'       => __('📄 Privacy Policy', 'developer-developer'),
        'description' => __('Content for Privacy page. Create a page with slug "privacy" to use this.', 'developer-developer'),
        'priority'    => 44,
    ));
    
    // Privacy Content
    $wp_customize->add_setting('developer_privacy_content', array(
        'default'           => '',
        'sanitize_callback' => 'wp_kses_post',
    ));
    $wp_customize->add_control('developer_privacy_content', array(
        'label'       => __('Privacy Policy', 'developer-developer'),
        'description' => __('Your full privacy policy text', 'developer-developer'),
        'section'     => 'developer_privacy_page',
        'type'        => 'textarea',
    ));
    
    // ===========================================
    // SOCIAL LINKS SECTION
    // ===========================================
    $wp_customize->add_section('developer_social', array(
        'title'    => __('🔗 Social Media', 'developer-developer'),
        'priority' => 45,
    ));
    
    $social_networks = array('facebook', 'instagram', 'twitter', 'youtube', 'tiktok', 'linkedin');
    foreach ($social_networks as $network) {
        $wp_customize->add_setting('developer_social_' . $network, array(
            'default'           => '',
            'sanitize_callback' => 'esc_url_raw',
        ));
        $wp_customize->add_control('developer_social_' . $network, array(
            'label'   => ucfirst($network) . ' URL',
            'section' => 'developer_social',
            'type'    => 'url',
        ));
    }
}
add_action('customize_register', 'developer_developer_customizer');

/**
 * Sanitize HTML for widget embed codes
 * Only admins can access customizer, so we allow unfiltered HTML
 */
function developer_sanitize_html($input) {
    // Allow unfiltered HTML for widget embed codes (admin only)
    if (current_user_can('unfiltered_html')) {
        return $input;
    }
    return wp_kses_post($input);
}

/**
 * Get header settings from GAS API site-config
 * Caches the result for 5 minutes to avoid repeated API calls
 */
/**
 * Get current language for multilingual content
 * Priority: 1) URL parameter (?lang=xx) 2) Cookie 3) Browser Accept-Language 4) Default (en)
 */
function developer_get_current_language() {
    // Check URL parameter first
    if (isset($_GET['lang']) && preg_match('/^[a-z]{2}$/', $_GET['lang'])) {
        $lang = sanitize_text_field($_GET['lang']);
        // Set cookie for subsequent requests
        setcookie('gas_lang', $lang, time() + (86400 * 30), '/');
        return $lang;
    }
    
    // Check cookie
    if (isset($_COOKIE['gas_lang']) && preg_match('/^[a-z]{2}$/', $_COOKIE['gas_lang'])) {
        return sanitize_text_field($_COOKIE['gas_lang']);
    }
    
    // Default to site's primary language from account settings
    $primary = 'en';
    $client_id = get_option('gas_client_id', '');
    if ($client_id) {
        $cache_key = 'gas_site_config_' . $client_id;
        $site_config = get_transient($cache_key);
        if ($site_config && isset($site_config['languages']['primary'])) {
            $primary = $site_config['languages']['primary'];
        }
    }
    return $primary;
}

/**
 * Output language switcher HTML
 * Shows flags for available languages based on account settings
 */
function developer_language_switcher() {
    // Get API settings to find supported languages
    $api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();
    $current_lang = developer_get_current_language();
    
    // Language info with flags (using emoji flags for simplicity)
    $lang_info = array(
        'en' => array('flag' => '🇬🇧', 'name' => 'English', 'code' => 'EN'),
        'fr' => array('flag' => '🇫🇷', 'name' => 'Français', 'code' => 'FR'),
        'es' => array('flag' => '🇪🇸', 'name' => 'Español', 'code' => 'ES'),
        'de' => array('flag' => '🇩🇪', 'name' => 'Deutsch', 'code' => 'DE'),
        'nl' => array('flag' => '🇳🇱', 'name' => 'Nederlands', 'code' => 'NL'),
        'it' => array('flag' => '🇮🇹', 'name' => 'Italiano', 'code' => 'IT'),
        'pt' => array('flag' => '🇵🇹', 'name' => 'Português', 'code' => 'PT'),
        'ru' => array('flag' => '🇷🇺', 'name' => 'Русский', 'code' => 'RU'),
        'zh' => array('flag' => '🇨🇳', 'name' => '中文', 'code' => 'ZH'),
        'ja' => array('flag' => '🇯🇵', 'name' => '日本語', 'code' => 'JA'),
    );
    
    // Get supported languages from API settings (account-specific)
    $supported = isset($api['supported_languages']) && is_array($api['supported_languages']) 
        ? $api['supported_languages'] 
        : array('en');
    
    // Get current URL and build language links
    $current_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
    $current_url = remove_query_arg('lang', $current_url);
    
    // Only show switcher if there are multiple languages
    if (count($supported) <= 1) {
        return '';
    }
    
    $output = '<div class="developer-lang-switcher">';
    $output .= '<button class="developer-lang-current" aria-label="Select language">';
    $output .= isset($lang_info[$current_lang]) ? '<span class="developer-lang-flag">' . $lang_info[$current_lang]['flag'] . '</span> ' . $lang_info[$current_lang]['code'] : '🌐';
    $output .= ' <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    $output .= '</button>';
    $output .= '<div class="developer-lang-dropdown">';
    
    foreach ($supported as $lang) {
        if (!isset($lang_info[$lang])) continue;
        $info = $lang_info[$lang];
        $is_active = $lang === $current_lang ? ' active' : '';
        $lang_url = add_query_arg('lang', $lang, $current_url);
        $output .= '<a href="' . esc_url($lang_url) . '" class="developer-lang-option' . $is_active . '" data-lang="' . esc_attr($lang) . '">';
        $output .= '<span class="developer-lang-flag">' . $info['flag'] . '</span> ' . $info['name'];
        $output .= '</a>';
    }
    
    $output .= '</div></div>';
    
    return $output;
}

/**
 * Get multilingual value from settings
 * Checks for _ml suffix field first, falls back to base field
 * @param array $settings The settings array
 * @param string $key The base key (without _ml suffix)
 * @param string $lang Optional language code, defaults to current language
 * @return string|null The value in the requested language
 */
function developer_get_ml_value($settings, $key, $lang = null) {
    if ($lang === null) {
        $lang = developer_get_current_language();
    }
    
    $ml_key = $key . '_ml';
    
    // Check if multilingual version exists (underscore format: key_ml = {en: ..., fr: ...})
    if (isset($settings[$ml_key]) && is_array($settings[$ml_key])) {
        $ml_data = $settings[$ml_key];
        
        // Try requested language first
        if (isset($ml_data[$lang]) && !empty($ml_data[$lang])) {
            return $ml_data[$lang];
        }
        
        // Fall back to English
        if (isset($ml_data['en']) && !empty($ml_data['en'])) {
            return $ml_data['en'];
        }
        
        // Fall back to any available language
        foreach ($ml_data as $l => $val) {
            if (!empty($val) && strpos($l, '_') !== 0) {
                return $val;
            }
        }
    }
    
    // Check for dash-separated language keys (GAS Admin format: key-en, key-fr, etc.)
    $key_variants = [
        $key,                              // menu_title
        str_replace('_', '-', $key),       // menu-title
    ];
    
    foreach ($key_variants as $key_var) {
        // Try requested language first
        $lang_key = $key_var . '-' . $lang;
        if (isset($settings[$lang_key]) && !empty($settings[$lang_key])) {
            return $settings[$lang_key];
        }
        
        // Fall back to English
        $en_key = $key_var . '-en';
        if (isset($settings[$en_key]) && !empty($settings[$en_key])) {
            return $settings[$en_key];
        }
    }
    
    // Fall back to non-multilingual value
    return $settings[$key] ?? ($settings[str_replace('_', '-', $key)] ?? null);
}

function developer_get_api_settings() {
    $client_id = get_option('gas_client_id', '');
    if (empty($client_id)) {
        return array();
    }
    
    // Check transient cache first (5 min TTL, cleared on Web Builder save)
    $cache_key = 'gas_api_settings_' . get_current_blog_id() . '_' . developer_get_current_language();
    $cached = get_transient($cache_key);
    if ($cached !== false) {
        return $cached;
    }
    
    $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
    $site_url = home_url('/');
    $request_url = "{$api_url}/api/public/client/{$client_id}/site-config?site_url=" . urlencode($site_url);
    $response = wp_remote_get($request_url, array(
        'timeout' => 10,
        'sslverify' => true,
    ));
    
    if (is_wp_error($response)) {
        return array();
    }
    
    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    
    if (!$data || !isset($data['success']) || !$data['success']) {
        return array();
    }
    
    $config = $data['config'] ?? array();

    // Populate site-config transient so developer_get_current_language() can read languages.primary
    set_transient('gas_site_config_' . $client_id, $config, 30);

    // Read from website settings (where GAS Admin saves to)
    $website = $config['website'] ?? array();
    $website_header = $website['header'] ?? array();
    $website_hero = $website['hero'] ?? array();
    $website_about = $website['about'] ?? array();
    $website_intro = $website['intro'] ?? array();
    $website_cta = $website['cta'] ?? array();
    $website_featured = $website['featured'] ?? array();
    $website_usp = $website['usp'] ?? array();
    $website_services = $website['services'] ?? array();
    $website_rooms = $website['page-rooms'] ?? array();
    $website_styles = $website['styles'] ?? array();
    $website_page_about = $website['page-about'] ?? array();
    $website_page_contact = $website['page-contact'] ?? array();
    $website_page_gallery = $website['page-gallery'] ?? array();
    $website_page_blog = $website['page-blog'] ?? array();
    $website_page_attractions = $website['page-attractions'] ?? array();
    $website_page_dining = $website['page-dining'] ?? array();
    $website_page_offers = $website['page-offers'] ?? array();
    $website_page_properties = $website['page-properties'] ?? array();
    $website_reviews = $website['reviews'] ?? array();
    $website_page_reviews = $website['page-reviews'] ?? array();
    $website_page_terms = $website['page-terms'] ?? array();
    $website_page_privacy = $website['page-privacy'] ?? array();
    $website_page_impressum = $website['page-impressum'] ?? array();
    $website_footer = $website['footer'] ?? array();
    $website_currency = $website['currency'] ?? array();

    // Get current language for multilingual content
    $lang = developer_get_current_language();
    
    $result = array(
        // DEBUG: Raw hero settings for troubleshooting
        '_debug_hero' => $website_hero,
        '_debug_page_rooms' => $website_rooms,
        '_debug_lang' => $lang,
        
        // Current language (for templates to use)
        'current_language' => $lang,
        
        // Global Typography & Styles (from Styles section)
        'heading_font' => $website_styles['heading-font'] ?? null,
        'subheading_font' => $website_styles['subheading-font'] ?? null,
        'subheading_size' => $website_styles['subheading-size'] ?? null,
        'body_font' => $website_styles['body-font'] ?? null,
        'title_size' => $website_styles['title-size'] ?? null,
        'body_size' => $website_styles['body-size'] ?? null,
        'primary_color' => $website_styles['primary-color'] ?? null,
        'secondary_color' => $website_styles['secondary-color'] ?? null,
        'accent_color' => $website_styles['accent-color'] ?? null,
        'link_color' => $website_styles['link-color'] ?? null,
        'btn_primary_bg' => $website_styles['btn-primary-bg'] ?? null,
        'btn_primary_text' => $website_styles['btn-primary-text'] ?? null,
        'btn_secondary_bg' => $website_styles['btn-secondary-bg'] ?? null,
        'btn_secondary_text' => $website_styles['btn-secondary-text'] ?? null,
        'btn_radius' => $website_styles['btn-radius'] ?? null,
        'card_radius' => (intval($website_styles['btn-radius'] ?? 8) > 0) ? intval($website_styles['btn-radius'] ?? 8) + 4 : 0,
        'lg_radius' => (intval($website_styles['btn-radius'] ?? 8) > 0) ? intval($website_styles['btn-radius'] ?? 8) * 2 : 0,
        'section_spacing' => $website_styles['section-spacing'] ?? null,
        'spinner_style' => $website_styles['spinner-style'] ?? 'circles',
        'custom_css' => $website_styles['custom-css'] ?? null,

        // Currency
        'currency_mode' => $website_currency['currency-mode'] ?? 'property',
        'site_currency' => $website_currency['site-currency'] ?? '',

        // About Page (standalone page, not homepage section) - MULTILINGUAL
        'page_about_title' => developer_get_ml_value($website_page_about, 'title', $lang),
        'page_about_subtitle' => developer_get_ml_value($website_page_about, 'subtitle', $lang),
        'page_about_content' => developer_get_ml_value($website_page_about, 'content', $lang),
        'page_about_content_title' => developer_get_ml_value($website_page_about, 'content_title', $lang),
        'page_about_menu_title' => developer_get_ml_value($website_page_about, 'menu_title', $lang),
        'page_about_enabled' => $website_page_about['enabled'] ?? false,
        'page_about_menu_order' => $website_page_about['menu-order'] ?? 2,
        'page_about_transparent_header' => $website_page_about['transparent-header'] ?? false,
        'page_about_hero_enabled' => $website_page_about['hero-enabled'] ?? true,
        'page_about_hero_image' => $website_page_about['hero-image'] ?? null,
        'page_about_content_image' => $website_page_about['content-image'] ?? null,
        'page_about_image_position' => $website_page_about['image-position'] ?? null,
        'page_about_content_image_2' => $website_page_about['content-image-2'] ?? null,
        'page_about_image_2_position' => $website_page_about['image-2-position'] ?? null,
        'page_about_bg' => $website_page_about['bg'] ?? null,
        'page_about_header_bg' => $website_page_about['header-bg'] ?? null,
        'page_about_header_text' => $website_page_about['header-text'] ?? null,
        'page_about_hero_height' => $website_page_about['hero-height'] ?? null,
        'page_about_hero_padding' => $website_page_about['hero-padding'] ?? null,
        'page_about_title_color' => $website_page_about['title-color'] ?? null,
        'page_about_text_color' => $website_page_about['text-color'] ?? null,
        'page_about_meta_title' => $website_page_about['meta-title'] ?? '',
        'page_about_meta_description' => $website_page_about['meta-description'] ?? '',

        // Home Page Menu Title
        'page_home_meta_title' => $website_hero['meta-title'] ?? '',
        'page_home_meta_description' => $website_hero['meta-description'] ?? '',
        'page_home_menu_title' => developer_get_ml_value($website_hero, 'menu_title', $lang) ?: 'Home',
        
        // Rooms Page - MULTILINGUAL
        'page_rooms_menu_title' => developer_get_ml_value($website_rooms, 'menu_title', $lang) ?: 'Rooms',
        'page_rooms_title' => developer_get_ml_value($website_rooms, 'title', $lang) ?: 'Book Your Stay',
        'page_rooms_subtitle' => developer_get_ml_value($website_rooms, 'subtitle', $lang),
        'page_rooms_enabled' => $website_rooms['enabled'] ?? true,
        'page_rooms_menu_order' => $website_rooms['menu-order'] ?? 1,
        'page_rooms_transparent_header' => $website_rooms['transparent-header'] ?? false,
        'page_rooms_search_btn_bg' => ($website['pro-settings'] ?? [])['search-btn-bg'] ?: ($website_rooms['search-btn-bg'] ?? ''),
        'page_rooms_search_btn_text' => ($website['pro-settings'] ?? [])['search-btn-text'] ?: ($website_rooms['search-btn-text'] ?? ''),
        'page_rooms_btn_radius' => ($website['pro-settings'] ?? [])['btn-radius'] ?: ($website_rooms['btn-radius'] ?? null),
        'page_rooms_meta_title' => $website_rooms['meta-title'] ?? '',
        'page_rooms_meta_description' => $website_rooms['meta-description'] ?? '',

        // Contact Page - MULTILINGUAL
        'page_contact_menu_title' => developer_get_ml_value($website_page_contact, 'menu_title', $lang) ?: 'Contact',
        'page_contact_title' => developer_get_ml_value($website_page_contact, 'title', $lang),
        'page_contact_subtitle' => developer_get_ml_value($website_page_contact, 'subtitle', $lang),
        'page_contact_enabled' => $website_page_contact['enabled'] ?? true,
        'page_contact_menu_order' => $website_page_contact['menu-order'] ?? 8,
        'page_contact_transparent_header' => $website_page_contact['transparent-header'] ?? false,
        'page_contact_hero_enabled' => $website_page_contact['hero-enabled'] ?? true,
        'page_rooms_hero_enabled' => $website_rooms['hero-enabled'] ?? true,
        'page_rooms_hero_image' => $website_rooms['hero-image-url'] ?? '',
        'page_rooms_header_bg' => $website_rooms['header-bg'] ?? '#1e293b',
        'page_rooms_header_text' => $website_rooms['header-text'] ?? '#ffffff',
        'page_gallery_hero_enabled' => ($website['page-gallery'] ?? [])['hero-enabled'] ?? true,
        'page_gallery_hero_image' => ($website['page-gallery'] ?? [])['hero-image-url'] ?? '',
        'page_gallery_header_bg' => ($website['page-gallery'] ?? [])['header-bg'] ?? '#1e293b',
        'page_gallery_header_text' => ($website['page-gallery'] ?? [])['header-text'] ?? '#ffffff',
        'page_blog_hero_enabled' => ($website['page-blog'] ?? [])['hero-enabled'] ?? true,
        'page_blog_hero_image' => ($website['page-blog'] ?? [])['hero-image-url'] ?? '',
        'page_blog_header_bg' => ($website['page-blog'] ?? [])['header-bg'] ?? '#1e293b',
        'page_blog_header_text' => ($website['page-blog'] ?? [])['header-text'] ?? '#ffffff',
        'page_attractions_hero_enabled' => ($website['page-attractions'] ?? [])['hero-enabled'] ?? true,
        'page_attractions_hero_image' => ($website['page-attractions'] ?? [])['hero-image-url'] ?? '',
        'page_attractions_header_bg' => ($website['page-attractions'] ?? [])['header-bg'] ?? '#1e293b',
        'page_attractions_header_text' => ($website['page-attractions'] ?? [])['header-text'] ?? '#ffffff',
        'page_dining_hero_enabled' => ($website['page-dining'] ?? [])['hero-enabled'] ?? true,
        'page_dining_hero_image' => ($website['page-dining'] ?? [])['hero-image-url'] ?? '',
        'page_dining_header_bg' => ($website['page-dining'] ?? [])['header-bg'] ?? '#1e293b',
        'page_dining_header_text' => ($website['page-dining'] ?? [])['header-text'] ?? '#ffffff',
        'page_offers_hero_enabled' => ($website['page-offers'] ?? [])['hero-enabled'] ?? true,
        'page_offers_hero_image' => ($website['page-offers'] ?? [])['hero-image-url'] ?? '',
        'page_offers_header_bg' => ($website['page-offers'] ?? [])['header-bg'] ?? '#1e293b',
        'page_offers_header_text' => ($website['page-offers'] ?? [])['header-text'] ?? '#ffffff',
        'page_reviews_hero_enabled' => ($website['page-reviews'] ?? [])['hero-enabled'] ?? true,
        'page_reviews_hero_image' => ($website['page-reviews'] ?? [])['hero-image-url'] ?? '',
        'page_reviews_header_bg' => ($website['page-reviews'] ?? [])['header-bg'] ?? '#1e293b',
        'page_reviews_header_text' => ($website['page-reviews'] ?? [])['header-text'] ?? '#ffffff',
        'page_properties_hero_enabled' => $website_page_properties['hero-enabled'] ?? true,
        'page_properties_hero_image' => $website_page_properties['hero-image-url'] ?? '',
        'page_properties_header_bg' => $website_page_properties['header-bg'] ?? '#1e293b',
        'page_properties_header_text' => $website_page_properties['header-text'] ?? '#ffffff',
        'page_contact_hero_image' => $website_page_contact['hero-image'] ?? null,
        'page_contact_header_bg' => $website_page_contact['header-bg'] ?? null,
        'page_contact_header_text' => $website_page_contact['header-text'] ?? null,
        'page_contact_business_name' => $website_page_contact['business-name'] ?? '',
        'page_contact_email' => $website_page_contact['email'] ?? '',
        'page_contact_phone' => $website_page_contact['phone'] ?? '',
        'page_contact_address' => $website_page_contact['address'] ?? '',
        'page_contact_city' => $website_page_contact['city'] ?? '',
        'page_contact_state' => $website_page_contact['state'] ?? '',
        'page_contact_zip' => $website_page_contact['zip'] ?? '',
        'page_contact_country' => $website_page_contact['country'] ?? '',
        'page_contact_latitude' => $website_page_contact['latitude'] ?? '',
        'page_contact_longitude' => $website_page_contact['longitude'] ?? '',
        'page_contact_map_zoom' => $website_page_contact['map-zoom'] ?? '14',
        'page_contact_map_height' => $website_page_contact['map-height'] ?? '300',
        'page_contact_show_details' => $website_page_contact['show-details'] ?? true,
        'page_contact_show_directions' => $website_page_contact['show-directions'] ?? true,
        'page_contact_show_map' => $website_page_contact['show-map'] ?? true,
        'page_contact_show_form' => $website_page_contact['show-form'] ?? true,
        'page_contact_show_email' => $website_page_contact['show-email'] ?? true,
        'page_contact_show_phone' => $website_page_contact['show-phone'] ?? true,
        'page_contact_show_address' => $website_page_contact['show-address'] ?? true,
        'page_contact_details_title' => developer_get_ml_value($website_page_contact, 'details_title', $lang) ?: 'Company Details',
        'page_contact_directions_text' => developer_get_ml_value($website_page_contact, 'directions_text', $lang) ?: 'Get Directions',
        'page_contact_map_title' => developer_get_ml_value($website_page_contact, 'map_title', $lang) ?: 'Find Us',
        'page_contact_form_title' => developer_get_ml_value($website_page_contact, 'form_title', $lang) ?: 'Contact Us',
        'page_contact_button_color' => $website_page_contact['button-color'] ?? '',
        'page_contact_show_opening_hours' => $website_page_contact['show-opening-hours'] ?? false,
        'page_contact_hours_monday' => $website_page_contact['hours-monday'] ?? '',
        'page_contact_hours_tuesday' => $website_page_contact['hours-tuesday'] ?? '',
        'page_contact_hours_wednesday' => $website_page_contact['hours-wednesday'] ?? '',
        'page_contact_hours_thursday' => $website_page_contact['hours-thursday'] ?? '',
        'page_contact_hours_friday' => $website_page_contact['hours-friday'] ?? '',
        'page_contact_hours_saturday' => $website_page_contact['hours-saturday'] ?? '',
        'page_contact_hours_sunday' => $website_page_contact['hours-sunday'] ?? '',
        'page_contact_meta_title' => $website_page_contact['meta-title'] ?? '',
        'page_contact_meta_description' => $website_page_contact['meta-description'] ?? '',

        // Gallery Page - MULTILINGUAL
        'page_gallery_menu_title' => developer_get_ml_value($website_page_gallery, 'menu_title', $lang) ?: 'Gallery',
        'page_gallery_enabled' => $website_page_gallery['enabled'] ?? false,
        'page_gallery_menu_order' => $website_page_gallery['menu-order'] ?? 3,
        'page_gallery_meta_title' => $website_page_gallery['meta-title'] ?? '',
        'page_gallery_meta_description' => $website_page_gallery['meta-description'] ?? '',

        // Blog Page - MULTILINGUAL
        'page_blog_menu_title' => developer_get_ml_value($website_page_blog, 'menu_title', $lang) ?: 'Blog',
        'page_blog_title' => developer_get_ml_value($website_page_blog, 'title', $lang),
        'page_blog_subtitle' => developer_get_ml_value($website_page_blog, 'subtitle', $lang),
        'page_blog_enabled' => $website_page_blog['enabled'] ?? false,
        'page_blog_menu_order' => $website_page_blog['menu-order'] ?? 4,
        'page_blog_meta_title' => $website_page_blog['meta-title'] ?? '',
        'page_blog_meta_description' => $website_page_blog['meta-description'] ?? '',

        // Attractions Page - MULTILINGUAL
        'page_attractions_menu_title' => developer_get_ml_value($website_page_attractions, 'menu_title', $lang) ?: 'Attractions',
        'page_attractions_title' => developer_get_ml_value($website_page_attractions, 'title', $lang),
        'page_attractions_subtitle' => developer_get_ml_value($website_page_attractions, 'subtitle', $lang),
        'page_attractions_enabled' => $website_page_attractions['enabled'] ?? false,
        'page_attractions_menu_order' => $website_page_attractions['menu-order'] ?? 5,
        'page_attractions_meta_title' => $website_page_attractions['meta-title'] ?? '',
        'page_attractions_meta_description' => $website_page_attractions['meta-description'] ?? '',

        // Dining Page - MULTILINGUAL
        'page_dining_menu_title' => developer_get_ml_value($website_page_dining, 'menu_title', $lang) ?: 'Dining',
        'page_dining_enabled' => $website_page_dining['enabled'] ?? false,
        'page_dining_menu_order' => $website_page_dining['menu-order'] ?? 4,
        
        // Offers Page - MULTILINGUAL
        'page_offers_menu_title' => developer_get_ml_value($website_page_offers, 'menu_title', $lang) ?: 'Offers',
        'page_offers_enabled' => $website_page_offers['enabled'] ?? false,
        'page_offers_menu_order' => $website_page_offers['menu-order'] ?? 5,
        
        // Properties Page - MULTILINGUAL
        'page_properties_menu_title' => developer_get_ml_value($website_page_properties, 'menu_title', $lang) ?: 'Properties',
        'page_properties_enabled' => $website_page_properties['enabled'] ?? false,
        'page_properties_menu_order' => $website_page_properties['menu-order'] ?? 6,
        'page_properties_btn_bg' => $website_page_properties['btn-bg'] ?? null,
        'page_properties_btn_text_color' => $website_page_properties['btn-text-color'] ?? null,
        'page_properties_btn_label' => $website_page_properties['btn-text-label'] ?? 'View Rooms',
        
        // Reviews Page - MULTILINGUAL
        'page_reviews_menu_title' => developer_get_ml_value($website_page_reviews, 'menu_title', $lang) ?: 'Reviews',
        'page_reviews_enabled' => $website_page_reviews['enabled'] ?? false,
        'page_reviews_menu_order' => $website_page_reviews['menu-order'] ?? 7,
        
        // Terms Page - MULTILINGUAL
        'page_terms_menu_title' => developer_get_ml_value($website_page_terms, 'menu_title', $lang) ?: 'Terms',
        'page_terms_enabled' => true, // Always in footer
        'page_terms_use_external' => $website_page_terms['use-external'] ?? false,
        'page_terms_external_url' => $website_page_terms['external-url'] ?? '',

        // Privacy Page - MULTILINGUAL
        'page_privacy_menu_title' => developer_get_ml_value($website_page_privacy, 'menu_title', $lang) ?: 'Privacy',
        'page_impressum_menu_title' => developer_get_ml_value($website_page_impressum, 'menu_title', $lang) ?: 'Impressum',
        'page_impressum_enabled' => $website_page_impressum['enabled'] ?? false,
        'page_impressum_source' => $website_page_impressum['source'] ?? 'structured',
        'page_impressum_content' => developer_get_ml_value($website_page_impressum, 'content', $lang) ?: '',
        'page_impressum_company_name' => $website_page_impressum['company-name'] ?? '',
        'page_impressum_legal_entity' => $website_page_impressum['legal-entity'] ?? '',
        'page_impressum_address' => $website_page_impressum['address'] ?? '',
        'page_impressum_represented_by' => $website_page_impressum['represented-by'] ?? '',
        'page_impressum_phone' => $website_page_impressum['phone'] ?? '',
        'page_impressum_email' => $website_page_impressum['email'] ?? '',
        'page_impressum_tax_number' => $website_page_impressum['tax-number'] ?? '',
        'page_impressum_vat_id' => $website_page_impressum['vat-id'] ?? '',
        'page_impressum_register' => $website_page_impressum['register'] ?? '',
        'page_impressum_authority' => $website_page_impressum['authority'] ?? '',
        'page_impressum_content_responsible' => $website_page_impressum['content-responsible'] ?? '',
        'page_impressum_credits' => $website_page_impressum['credits'] ?? '',
        'page_impressum_website_credits' => $website_page_impressum['website-credits'] ?? '',
        'page_impressum_disclaimer_content' => $website_page_impressum['disclaimer-content'] ?? true,
        'page_impressum_disclaimer_links' => $website_page_impressum['disclaimer-links'] ?? true,
        'page_impressum_disclaimer_copyright' => $website_page_impressum['disclaimer-copyright'] ?? true,
        'page_privacy_enabled' => true, // Always in footer
        'page_privacy_use_external' => $website_page_privacy['use-external'] ?? false,
        'page_privacy_external_url' => $website_page_privacy['external-url'] ?? '',
        
        // Custom Pages (from Web Builder)
        'custom_pages' => ($website['custom-pages'] ?? array())['pages'] ?? array(),
        // Custom page settings keyed by slug (for hero-enabled, etc.)
        'custom_page_settings' => (function() use ($website) {
            $settings = array();
            $pages = ($website['custom-pages'] ?? array())['pages'] ?? array();
            foreach ($pages as $cp) {
                $slug = $cp['slug'] ?? '';
                if ($slug) {
                    $settings[$slug] = $website['page-custom-' . $slug] ?? array();
                }
            }
            return $settings;
        })(),

        // CTA Button (Header) - use multilingual lookup for text
        'cta_text' => developer_get_ml_value($website_header, 'cta-button-text', $lang) ?: ($website_header['cta-button-text'] ?? null),
        'cta_link' => $website_header['cta-link'] ?? '/book-now/',
        'cta_bg' => $website_header['cta-bg'] ?? null,
        'cta_text_color' => $website_header['cta-text-color'] ?? null,
        // Header colors
        'header_bg' => $website_header['bg'] ?? $website_header['bg-color'] ?? null,
        'header_text' => $website_header['text-color'] ?? null,
        'header_logo' => $website_header['logo-color'] ?? null,
        'header_logo_image' => $website_header['logo-image-url'] ?? null,
        'header_logo_light_image' => $website_header['logo-light-image-url'] ?? null,
        'header_favicon' => $website_header['favicon-image-url'] ?? null,
        'header_apple_icon' => $website_header['apple-icon-image-url'] ?? null,
        'header_logo_size' => $website_header['logo-size'] ?? null,
        'header_underline_color' => $website_header['underline-color'] ?? null,
        'header_border_color' => $website_header['border-color'] ?? null,
        // Header options
        'header_sticky' => $website_header['sticky'] ?? null,
        'header_transparent' => $website_header['transparent'] ?? null,
        'header_transparent_opacity' => $website_header['transparent-opacity'] ?? null,
        'header_layout' => $website_header['layout'] ?? null,
        'header_border' => $website_header['border'] ?? null,
        'header_border_style_color' => $website_header['border-style-color'] ?? null,
        'header_border_width' => $website_header['border-width'] ?? null,
        'header_border_style_type' => $website_header['border-style-type'] ?? null,
        'header_lang_color' => $website_header['lang-color'] ?? null,
        'header_lang_dropdown_color' => $website_header['lang-dropdown-color'] ?? null,
        'header_lang_dropdown_bg' => $website_header['lang-dropdown-bg'] ?? null,
        // Header typography
        'header_font' => $website_header['font'] ?? null,
        'header_font_size' => $website_header['font-size'] ?? null,
        'header_font_weight' => $website_header['font-weight'] ?? null,
        'header_text_transform' => $website_header['text-transform'] ?? null,
        // Site name/tagline - MULTILINGUAL
        'site_name' => developer_get_ml_value($website_header, 'site_name', $lang),
        'tagline' => developer_get_ml_value($website_header, 'tagline', $lang),
        
        // Hero Section - MULTILINGUAL text fields
        'hero_title' => developer_get_ml_value($website_hero, 'headline', $lang),
        'hero_subtitle' => developer_get_ml_value($website_hero, 'subheadline', $lang),
        'hero_image' => $website_hero['image-url'] ?? null,
        'hero_video_url' => $website_hero['video-url'] ?? null,
        'hero_mobile_image' => $website_hero['mobile-image-url'] ?? null,
        'hero_overlay_color' => $website_hero['overlay-color'] ?? null,
        'hero_overlay_opacity' => $website_hero['overlay'] ?? $website_hero['opacity'] ?? null,
        'hero_height' => $website_hero['height'] ?? null,
        'hero_title_color' => $website_hero['title-color'] ?? null,
        'hero_subtitle_color' => $website_hero['subtitle-color'] ?? null,
        'hero_badge' => developer_get_ml_value($website_hero, 'button_text', $lang),
        'hero_show_badge' => $website_hero['show-badge'] ?? true,
        'hero_show_search' => $website_hero['show-search'] ?? true,
        'hero_badge_link' => $website_hero['button-link'] ?? $website_hero['badge-link'] ?? null,
        'hero_badge_bg' => $website_hero['badge-bg'] ?? null,
        'hero_badge_text' => $website_hero['badge-text'] ?? null,
        'hero_badge_border' => $website_hero['badge-border'] ?? null,
        'hero_trust_1' => developer_get_ml_value($website_hero, 'trust-1', $lang),
        'hero_trust_2' => developer_get_ml_value($website_hero, 'trust-2', $lang),
        'hero_trust_3' => developer_get_ml_value($website_hero, 'trust-3', $lang),
        'hero_search_btn_bg' => $website_hero['search-btn-bg'] ?? ($website_hero['search']['btn_bg'] ?? null),
        'hero_search_btn_text' => $website_hero['search-btn-text'] ?? ($website_hero['search']['btn_text'] ?? null),
        'hero_search_label_color' => $website_hero['search-label-color'] ?? ($website_hero['search']['label_color'] ?? null),
        'hero_search_bg' => $website_hero['search-bg'] ?? ($website_hero['search']['bg'] ?? null),
        'hero_search_opacity' => $website_hero['search-opacity'] ?? ($website_hero['search']['opacity'] ?? null),
        'hero_search_radius' => $website_hero['search-radius'] ?? ($website_hero['search']['radius'] ?? null),
        'hero_search_padding' => $website_hero['search-padding'] ?? ($website_hero['search']['padding'] ?? null),
        'hero_search_max_width' => $website_hero['search-max-width'] ?? ($website_hero['search']['max_width'] ?? null),
        'hero_search_scale' => $website_hero['search-scale'] ?? ($website_hero['search']['scale'] ?? null),
        'hero_search_below_text' => $website_hero['search-below-text'] ?? ($website_hero['search']['below_text'] ?? null),
        'hero_search_checkin_label' => developer_get_ml_value($website_hero, 'search-checkin-label', $lang),
        'hero_search_checkout_label' => developer_get_ml_value($website_hero, 'search-checkout-label', $lang),
        'hero_search_guests_label' => developer_get_ml_value($website_hero, 'search-guests-label', $lang),
        'hero_search_btn_label' => developer_get_ml_value($website_hero, 'search-btn-label', $lang),
        'hero_search_date_placeholder' => developer_get_ml_value($website_hero, 'search-date-placeholder', $lang),
        'hero_search_guest_singular' => developer_get_ml_value($website_hero, 'search-guest-singular', $lang),
        'hero_trust_text_color' => $website_hero['trust-text-color'] ?? null,
        'hero_background_type' => $website_hero['background-type'] ?? null,
        'hero_slide_1' => $website_hero['slide-1-url'] ?? null,
        'hero_slide_2' => $website_hero['slide-2-url'] ?? null,
        'hero_slide_3' => $website_hero['slide-3-url'] ?? null,
        'hero_slide_4' => $website_hero['slide-4-url'] ?? null,
        'hero_slider_duration' => $website_hero['slider-duration'] ?? null,
        'hero_slider_transition' => $website_hero['slider-transition'] ?? null,
        
        // About Section - MULTILINGUAL
        'about_enabled' => $website_about['enabled'] ?? null,
        'about_image' => $website_about['image-url'] ?? null,
        'about_image_2' => $website_about['image-2-url'] ?? null,
        'about_image_3' => $website_about['image-3-url'] ?? null,
        'about_image_4' => $website_about['image-4-url'] ?? null,
        'about_title' => developer_get_ml_value($website_about, 'title', $lang),
        'about_text' => developer_get_ml_value($website_about, 'text', $lang),
        'about_layout' => $website_about['layout'] ?? null,
        'about_bg' => $website_about['bg'] ?? $website_about['bg-color'] ?? null,
        'about_title_color' => $website_about['title-color'] ?? null,
        'about_text_color' => $website_about['text-color'] ?? null,
        'about_btn_text' => developer_get_ml_value($website_about, 'btn-text', $lang),
        'about_btn_url' => $website_about['btn-url'] ?? null,
        'about_btn_bg' => $website_about['btn-bg'] ?? null,
        'about_btn_text_color' => $website_about['btn-text-color'] ?? null,
        'about_show_btn' => $website_about['show-btn'] ?? true,
        'about_features_enabled' => $website_about['features-enabled'] ?? true,
        'about_tick_color' => $website_about['tick-color'] ?? '#10b981',
        'about_feature_1' => developer_get_ml_value($website_about, 'feature-1', $lang),
        'about_feature_2' => developer_get_ml_value($website_about, 'feature-2', $lang),
        'about_feature_3' => developer_get_ml_value($website_about, 'feature-3', $lang),
        'about_feature_4' => developer_get_ml_value($website_about, 'feature-4', $lang),
        'about_feature_5' => developer_get_ml_value($website_about, 'feature-5', $lang),
        'about_feature_6' => developer_get_ml_value($website_about, 'feature-6', $lang),
        
        // Services Section - MULTILINGUAL
        'services_enabled' => $website_services['enabled'] ?? false,
        'services_title' => developer_get_ml_value($website_services, 'title', $lang),
        'services_bg' => $website_services['bg'] ?? $website_services['bg-color'] ?? '#ffffff',
        'services_title_color' => $website_services['title-color'] ?? '#1e293b',
        'services_card_bg' => $website_services['card-bg'] ?? '#e8e4dd',
        'services_card_hover_bg' => $website_services['card-hover-bg'] ?? '#d4cfc7',
        'services_card_text_color' => $website_services['card-text-color'] ?? '#1e293b',
        'services_bg_image' => $website_services['bg-image-url'] ?? '',
        'services_overlay_opacity' => $website_services['overlay-opacity'] ?? '0.5',
        'services_overlay_bg' => $website_services['overlay-bg'] ?? '#ffffff',
        'services_item_1_icon' => $website_services['item-1-icon'] ?? '',
        'services_item_1_image' => $website_services['item-1-image-url'] ?? '',
        'services_item_1_title' => developer_get_ml_value($website_services, 'item_1_title', $lang),
        'services_item_1_text' => developer_get_ml_value($website_services, 'item_1_text', $lang),
        'services_item_2_icon' => $website_services['item-2-icon'] ?? '',
        'services_item_2_image' => $website_services['item-2-image-url'] ?? '',
        'services_item_2_title' => developer_get_ml_value($website_services, 'item_2_title', $lang),
        'services_item_2_text' => developer_get_ml_value($website_services, 'item_2_text', $lang),
        'services_item_3_icon' => $website_services['item-3-icon'] ?? '',
        'services_item_3_image' => $website_services['item-3-image-url'] ?? '',
        'services_item_3_title' => developer_get_ml_value($website_services, 'item_3_title', $lang),
        'services_item_3_text' => developer_get_ml_value($website_services, 'item_3_text', $lang),
        'services_item_4_icon' => $website_services['item-4-icon'] ?? '',
        'services_item_4_image' => $website_services['item-4-image-url'] ?? '',
        'services_item_4_title' => developer_get_ml_value($website_services, 'item_4_title', $lang),
        'services_item_4_text' => developer_get_ml_value($website_services, 'item_4_text', $lang),
        'services_item_5_icon' => $website_services['item-5-icon'] ?? '',
        'services_item_5_image' => $website_services['item-5-image-url'] ?? '',
        'services_item_5_title' => developer_get_ml_value($website_services, 'item_5_title', $lang),
        'services_item_5_text' => developer_get_ml_value($website_services, 'item_5_text', $lang),
        'services_item_6_icon' => $website_services['item-6-icon'] ?? '',
        'services_item_6_image' => $website_services['item-6-image-url'] ?? '',
        'services_item_6_title' => developer_get_ml_value($website_services, 'item_6_title', $lang),
        'services_item_6_text' => developer_get_ml_value($website_services, 'item_6_text', $lang),
        'services_item_7_icon' => $website_services['item-7-icon'] ?? '',
        'services_item_7_image' => $website_services['item-7-image-url'] ?? '',
        'services_item_7_title' => developer_get_ml_value($website_services, 'item_7_title', $lang),
        'services_item_7_text' => developer_get_ml_value($website_services, 'item_7_text', $lang),
        'services_item_8_icon' => $website_services['item-8-icon'] ?? '',
        'services_item_8_image' => $website_services['item-8-image-url'] ?? '',
        'services_item_8_title' => developer_get_ml_value($website_services, 'item_8_title', $lang),
        'services_item_8_text' => developer_get_ml_value($website_services, 'item_8_text', $lang),
        
        // Intro Section - MULTILINGUAL
        'intro_enabled' => $website_intro['enabled'] ?? null,
        'intro_title' => developer_get_ml_value($website_intro, 'title', $lang),
        'intro_text' => developer_get_ml_value($website_intro, 'text', $lang),
        'intro_btn_text' => developer_get_ml_value($website_intro, 'btn_text', $lang),
        'intro_btn_url' => $website_intro['btn-url'] ?? null,
        'intro_btn_bg' => $website_intro['btn-bg'] ?? null,
        'intro_btn_text_color' => $website_intro['btn-text-color'] ?? null,
        'intro_show_btn' => $website_intro['show-btn'] ?? null,
        'intro_bg' => $website_intro['bg'] ?? $website_intro['bg-color'] ?? null,
        'intro_title_color' => $website_intro['title-color'] ?? null,
        'intro_text_color' => $website_intro['text-color'] ?? null,
        'intro_title_size' => $website_intro['title-size'] ?? null,
        'intro_text_size' => $website_intro['text-size'] ?? null,
        'intro_max_width' => $website_intro['max-width'] ?? null,
        
        // Reviews Section - MULTILINGUAL
        'reviews_enabled' => $website_reviews['enabled'] ?? false,
        'reviews_use_app' => $website_reviews['use-app'] ?? '',
        'reviews_app_code' => $website_reviews['app-code'] ?? '',
        'reviews_hostaway_id' => $website_reviews['hostaway-id'] ?? '',
        'reviews_title' => developer_get_ml_value($website_reviews, 'title', $lang) ?: 'What Our Guests Say',
        'reviews_subtitle' => developer_get_ml_value($website_reviews, 'subtitle', $lang) ?: 'Real reviews from real guests',
        'reviews_bg' => $website_reviews['bg'] ?? '#0f172a',
        'reviews_text_color' => $website_reviews['text-color'] ?? '#ffffff',
        'reviews_card_bg' => $website_reviews['card-bg'] ?? '#1e293b',
        'reviews_star_color' => $website_reviews['star-color'] ?? '#fbbf24',
        'reviews_show_btn' => $website_reviews['show-btn'] ?? true,
        'reviews_btn_color' => $website_reviews['btn-color'] ?? ($website_reviews['star-color'] ?? '#fbbf24'),
        'reviews_btn_text_color' => $website_reviews['btn-text-color'] ?? '#ffffff',
        'reviews_btn_text' => developer_get_ml_value($website_reviews, 'btn-text', $lang) ?: 'View All Reviews',
        'reviews_btn_link' => $website_reviews['btn-link'] ?? '/reviews/',
        'review1_name' => $website_reviews['review1-name'] ?? '',
        'review1_source' => $website_reviews['review1-source'] ?? '',
        'review1_text' => $website_reviews['review1-text'] ?? '',
        'review2_name' => $website_reviews['review2-name'] ?? '',
        'review2_source' => $website_reviews['review2-source'] ?? '',
        'review2_text' => $website_reviews['review2-text'] ?? '',
        'review3_name' => $website_reviews['review3-name'] ?? '',
        'review3_source' => $website_reviews['review3-source'] ?? '',
        'review3_text' => $website_reviews['review3-text'] ?? '',

        // CTA Section - MULTILINGUAL
        'cta_section_enabled' => $website_cta['enabled'] ?? null,
        'cta_section_title' => developer_get_ml_value($website_cta, 'title', $lang),
        'cta_section_text' => developer_get_ml_value($website_cta, 'text', $lang),
        'cta_section_btn_text' => developer_get_ml_value($website_cta, 'btn_text', $lang),
        'cta_section_btn_url' => $website_cta['btn-url'] ?? null,
        'cta_section_bg' => $website_cta['background'] ?? $website_cta['bg'] ?? $website_cta['bg-color'] ?? null,
        'cta_section_text_color' => $website_cta['text-color'] ?? null,
        'cta_section_title_size' => $website_cta['title-size'] ?? null,
        'cta_section_text_size' => $website_cta['text-size'] ?? null,
        'cta_section_btn_bg' => $website_cta['btn-bg'] ?? null,
        'cta_section_btn_text_color' => $website_cta['btn-text-color'] ?? null,
        
        // Featured Section - MULTILINGUAL
        'featured_enabled' => $website_featured['enabled'] ?? true,
        'featured_title' => developer_get_ml_value($website_featured, 'title', $lang),
        'featured_subtitle' => developer_get_ml_value($website_featured, 'subtitle', $lang),
        'featured_mode' => $website_featured['mode'] ?? 'all',
        'featured_count' => $website_featured['count'] ?? '3',
        'featured_ids' => $website_featured['ids'] ?? '',
        'featured_columns' => $website_featured['columns'] ?? '3',
        'featured_layout_style' => $website_featured['layout-style'] ?? 'grid',
        'featured_btn_enabled' => $website_featured['btn-enabled'] ?? true,
        'featured_btn_text' => developer_get_ml_value($website_featured, 'btn_text', $lang),
        'featured_btn_url' => $website_featured['btn-url'] ?? null,
        'featured_btn_bg' => $website_featured['btn-bg'] ?? null,
        'featured_btn_text_color' => $website_featured['btn-text-color'] ?? null,
        'featured_bg' => $website_featured['bg'] ?? null,
        'featured_title_color' => $website_featured['title-color'] ?? null,
        'featured_subtitle_color' => $website_featured['subtitle-color'] ?? null,
        
        // USP "What We Offer" Section - MULTILINGUAL
        'usp_enabled' => $website_usp['enabled'] ?? false,
        'usp_title' => developer_get_ml_value($website_usp, 'title', $lang),
        'usp_subtitle' => developer_get_ml_value($website_usp, 'subtitle', $lang),
        'usp_bg' => $website_usp['bg'] ?? $website_usp['bg-color'] ?? '#f1f0eb',
        'usp_title_color' => $website_usp['title-color'] ?? '#1e293b',
        'usp_text_color' => $website_usp['text-color'] ?? '#64748b',
        'usp_card_bg' => $website_usp['card-bg'] ?? '#ffffff',
        'usp_bottom_bg' => $website_usp['bottom-bg'] ?? '#ffffff',
        'usp_card_title_size' => $website_usp['card-title-size'] ?? '18',
        'usp_item_1_icon' => $website_usp['item-1-icon'] ?? '',
        'usp_item_1_image' => $website_usp['item-1-image-url'] ?? '',
        'usp_item_1_title' => developer_get_ml_value($website_usp, 'item_1_title', $lang),
        'usp_item_1_text' => developer_get_ml_value($website_usp, 'item_1_text', $lang),
        'usp_item_2_icon' => $website_usp['item-2-icon'] ?? '',
        'usp_item_2_image' => $website_usp['item-2-image-url'] ?? '',
        'usp_item_2_title' => developer_get_ml_value($website_usp, 'item_2_title', $lang),
        'usp_item_2_text' => developer_get_ml_value($website_usp, 'item_2_text', $lang),
        'usp_item_3_icon' => $website_usp['item-3-icon'] ?? '',
        'usp_item_3_image' => $website_usp['item-3-image-url'] ?? '',
        'usp_item_3_title' => developer_get_ml_value($website_usp, 'item_3_title', $lang),
        'usp_item_3_text' => developer_get_ml_value($website_usp, 'item_3_text', $lang),
        'usp_item_4_icon' => $website_usp['item-4-icon'] ?? '',
        'usp_item_4_image' => $website_usp['item-4-image-url'] ?? '',
        'usp_item_4_title' => developer_get_ml_value($website_usp, 'item_4_title', $lang),
        'usp_item_4_text' => developer_get_ml_value($website_usp, 'item_4_text', $lang),
        'usp_item_5_icon' => $website_usp['item-5-icon'] ?? '',
        'usp_item_5_image' => $website_usp['item-5-image-url'] ?? '',
        'usp_item_5_title' => developer_get_ml_value($website_usp, 'item_5_title', $lang),
        'usp_item_5_text' => developer_get_ml_value($website_usp, 'item_5_text', $lang),
        'usp_item_6_icon' => $website_usp['item-6-icon'] ?? '',
        'usp_item_6_image' => $website_usp['item-6-image-url'] ?? '',
        'usp_item_6_title' => developer_get_ml_value($website_usp, 'item_6_title', $lang),
        'usp_item_6_text' => developer_get_ml_value($website_usp, 'item_6_text', $lang),
        
        // Rooms Page Settings (page-rooms) - MULTILINGUAL
        'rooms_title' => developer_get_ml_value($website_rooms, 'title', $lang),
        'rooms_subtitle' => developer_get_ml_value($website_rooms, 'subtitle', $lang),
        'rooms_columns' => $website_rooms['columns'] ?? '3',
        'rooms_layout_style' => $website_rooms['layout-style'] ?? 'auto',
        'rooms_show_map' => $website_rooms['show-map'] ?? false,
        'rooms_map_zoom' => intval($website_rooms['map-zoom'] ?? 14),
        'rooms_show_search' => $website_rooms['show-search'] ?? true,
        'rooms_show_amenity_filter' => $website_rooms['show-amenity-filter'] ?? true,
        'rooms_show_location_filter' => $website_rooms['show-location-filter'] ?? true,
        'rooms_show_filters' => $website_rooms['show-filters'] ?? true,
        'rooms_show_property_filter' => $website_rooms['show-property-filter'] ?? true,
        'rooms_show_date_filters' => $website_rooms['show-date-filters'] ?? true,
        'rooms_show_guest_filter' => $website_rooms['show-guest-filter'] ?? true,
        'rooms_filter_bg' => ($website['pro-settings'] ?? [])['filter-bg'] ?: ($website_rooms['filter-bg'] ?? null),
        'rooms_filter_text' => $website_rooms['filter-text'] ?? null,
        'rooms_bg_color' => $website_rooms['bg'] ?? $website_rooms['bg-color'] ?? null,
        'rooms_text_color' => $website_rooms['text-color'] ?? null,
        'rooms_card_radius' => ($website['pro-settings'] ?? [])['card-radius'] ?? null,
        'rooms_show_map' => ($website['pro-settings'] ?? [])['show-map'] ?? 'true',
        'rooms_book_btn_bg' => ($website['pro-settings'] ?? [])['book-btn-bg'] ?? null,
        'rooms_book_btn_text' => ($website['pro-settings'] ?? [])['book-btn-text'] ?? null,
        
        // Footer - MULTILINGUAL
        'footer_heading_quicklinks' => developer_get_ml_value($website_footer, 'heading-quicklinks', $lang),
        'footer_heading_legal' => developer_get_ml_value($website_footer, 'heading-legal', $lang),
        'footer_copyright' => developer_get_ml_value($website_footer, 'copyright', $lang),
        'footer_company_number_label' => developer_get_ml_value($website_footer, 'company-number-label', $lang),
        'footer_company_number' => developer_get_ml_value($website_footer, 'company-number', $lang),
        'footer_tax_number_label' => developer_get_ml_value($website_footer, 'tax-number-label', $lang),
        'footer_tax_number' => developer_get_ml_value($website_footer, 'tax-number', $lang),
        'footer_email' => $website_footer['email'] ?? '',
        'footer_phone' => $website_footer['phone'] ?? '',
        'footer_address' => $website_footer['address'] ?? '',
        'footer_bg' => $website_footer['bg'] ?? $website_footer['bg-color'] ?? null,
        'footer_text' => $website_footer['text'] ?? $website_footer['text-color'] ?? null,
        'footer_layout' => $website_footer['layout'] ?? 'default',
        'footer_show_powered_by' => $website_footer['show-powered-by'] ?? true,

        // Footer Band 1: CTA
        'footer_cta_enabled' => $website_footer['cta-enabled'] ?? false,
        'footer_cta_heading' => $website_footer['cta-heading'] ?? '',
        'footer_cta_text' => $website_footer['cta-text'] ?? '',
        'footer_cta_btn_text' => $website_footer['cta-btn-text'] ?? '',
        'footer_cta_btn_link' => $website_footer['cta-btn-link'] ?? '',
        'footer_cta_btn_bg' => $website_footer['cta-btn-bg'] ?? '#ffffff',
        'footer_cta_btn_style' => $website_footer['cta-btn-style'] ?? 'outline',
        'footer_cta_bg' => $website_footer['cta-bg'] ?? '#1e293b',
        'footer_cta_text_color' => $website_footer['cta-text-color'] ?? '#ffffff',

        // Footer Band 2: Info / Partners
        'footer_info_heading' => $website_footer['info-heading'] ?? '',
        'footer_info_bg' => $website_footer['info-bg'] ?? '',
        'footer_info_text_color' => $website_footer['info-text-color'] ?? '#1a1a1a',
        'footer_partner_logo_1' => $website_footer['partner-logo-1-image-url'] ?? '',
        'footer_partner_logo_2' => $website_footer['partner-logo-2-image-url'] ?? '',
        'footer_partner_logo_3' => $website_footer['partner-logo-3-image-url'] ?? '',
        'footer_partner_logo_4' => $website_footer['partner-logo-4-image-url'] ?? '',
        'footer_partner_logo_5' => $website_footer['partner-logo-5-image-url'] ?? '',
        'footer_partner_logo_6' => $website_footer['partner-logo-6-image-url'] ?? '',
        'footer_partner_logo_7' => $website_footer['partner-logo-7-image-url'] ?? '',
        'footer_partner_logo_8' => $website_footer['partner-logo-8-image-url'] ?? '',

        // Footer Social (also used by burger theme)
        'footer_social_facebook' => $website_footer['social-facebook'] ?? '',
        'footer_social_instagram' => $website_footer['social-instagram'] ?? '',
        'footer_social_twitter' => $website_footer['social-twitter'] ?? '',
        'footer_social_youtube' => $website_footer['social-youtube'] ?? '',
        'footer_social_linkedin' => $website_footer['social-linkedin'] ?? '',
        'footer_social_tiktok' => $website_footer['social-tiktok'] ?? '',
        'footer_social_pinterest' => $website_footer['social-pinterest'] ?? '',
        'footer_social_tripadvisor' => $website_footer['social-tripadvisor'] ?? '',

        // Aliases for burger theme compatibility
        'footer_bg_color' => $website_footer['bg'] ?? $website_footer['bg-color'] ?? '#1a1a1a',
        'footer_text_color' => $website_footer['text'] ?? $website_footer['text-color'] ?? '#ffffff',

        // Language settings from account
        'supported_languages' => $config['languages']['supported'] ?? array('en'),
        'primary_language' => $config['languages']['primary'] ?? 'en',

        // Section ordering (position number per section, odd = default, even = available for image rows)
        'section_order_intro' => $website_intro['position'] ?? null,
        'section_order_featured' => $website_featured['position'] ?? null,
        'section_order_usp' => $website_usp['position'] ?? null,
        'section_order_about' => $website_about['position'] ?? null,
        'section_order_services' => $website_services['position'] ?? null,
        'section_order_reviews' => $website_reviews['position'] ?? null,
        'section_order_cta' => $website_cta['position'] ?? null,

        // Image Row sections (1-3)
        'image_row_1_enabled' => ($website['image-row-1'] ?? array())['enabled'] ?? false,
        'image_row_1_heading' => developer_get_ml_value($website['image-row-1'] ?? array(), 'heading', $lang),
        'image_row_1_bg' => ($website['image-row-1'] ?? array())['bg'] ?? '#ffffff',
        'image_row_1_text_align' => ($website['image-row-1'] ?? array())['text-align'] ?? 'center',
        'image_row_1_description' => developer_get_ml_value($website['image-row-1'] ?? array(), 'description', $lang),
        'image_row_1_image_1' => ($website['image-row-1'] ?? array())['image-1'] ?? '',
        'image_row_1_title_1' => developer_get_ml_value($website['image-row-1'] ?? array(), 'title-1', $lang),
        'image_row_1_text_1' => developer_get_ml_value($website['image-row-1'] ?? array(), 'text-1', $lang),
        'image_row_1_btn_text_1' => developer_get_ml_value($website['image-row-1'] ?? array(), 'btn-text-1', $lang),
        'image_row_1_btn_link_1' => ($website['image-row-1'] ?? array())['btn-link-1'] ?? '',
        'image_row_1_card_bg_1' => ($website['image-row-1'] ?? array())['card-bg-1'] ?? '',
        'image_row_1_image_2' => ($website['image-row-1'] ?? array())['image-2'] ?? '',
        'image_row_1_title_2' => developer_get_ml_value($website['image-row-1'] ?? array(), 'title-2', $lang),
        'image_row_1_text_2' => developer_get_ml_value($website['image-row-1'] ?? array(), 'text-2', $lang),
        'image_row_1_btn_text_2' => developer_get_ml_value($website['image-row-1'] ?? array(), 'btn-text-2', $lang),
        'image_row_1_btn_link_2' => ($website['image-row-1'] ?? array())['btn-link-2'] ?? '',
        'image_row_1_card_bg_2' => ($website['image-row-1'] ?? array())['card-bg-2'] ?? '',
        'image_row_1_image_3' => ($website['image-row-1'] ?? array())['image-3'] ?? '',
        'image_row_1_title_3' => developer_get_ml_value($website['image-row-1'] ?? array(), 'title-3', $lang),
        'image_row_1_text_3' => developer_get_ml_value($website['image-row-1'] ?? array(), 'text-3', $lang),
        'image_row_1_btn_text_3' => developer_get_ml_value($website['image-row-1'] ?? array(), 'btn-text-3', $lang),
        'image_row_1_btn_link_3' => ($website['image-row-1'] ?? array())['btn-link-3'] ?? '',
        'image_row_1_card_bg_3' => ($website['image-row-1'] ?? array())['card-bg-3'] ?? '',
        'image_row_1_row_btn_text' => developer_get_ml_value($website['image-row-1'] ?? array(), 'row-btn-text', $lang),
        'image_row_1_row_btn_link' => ($website['image-row-1'] ?? array())['row-btn-link'] ?? '',
        'section_order_image_row_1' => ($website['image-row-1'] ?? array())['position'] ?? null,

        'image_row_2_enabled' => ($website['image-row-2'] ?? array())['enabled'] ?? false,
        'image_row_2_heading' => developer_get_ml_value($website['image-row-2'] ?? array(), 'heading', $lang),
        'image_row_2_bg' => ($website['image-row-2'] ?? array())['bg'] ?? '#ffffff',
        'image_row_2_text_align' => ($website['image-row-2'] ?? array())['text-align'] ?? 'center',
        'image_row_2_description' => developer_get_ml_value($website['image-row-2'] ?? array(), 'description', $lang),
        'image_row_2_image_1' => ($website['image-row-2'] ?? array())['image-1'] ?? '',
        'image_row_2_title_1' => developer_get_ml_value($website['image-row-2'] ?? array(), 'title-1', $lang),
        'image_row_2_text_1' => developer_get_ml_value($website['image-row-2'] ?? array(), 'text-1', $lang),
        'image_row_2_btn_text_1' => developer_get_ml_value($website['image-row-2'] ?? array(), 'btn-text-1', $lang),
        'image_row_2_btn_link_1' => ($website['image-row-2'] ?? array())['btn-link-1'] ?? '',
        'image_row_2_card_bg_1' => ($website['image-row-2'] ?? array())['card-bg-1'] ?? '',
        'image_row_2_image_2' => ($website['image-row-2'] ?? array())['image-2'] ?? '',
        'image_row_2_title_2' => developer_get_ml_value($website['image-row-2'] ?? array(), 'title-2', $lang),
        'image_row_2_text_2' => developer_get_ml_value($website['image-row-2'] ?? array(), 'text-2', $lang),
        'image_row_2_btn_text_2' => developer_get_ml_value($website['image-row-2'] ?? array(), 'btn-text-2', $lang),
        'image_row_2_btn_link_2' => ($website['image-row-2'] ?? array())['btn-link-2'] ?? '',
        'image_row_2_card_bg_2' => ($website['image-row-2'] ?? array())['card-bg-2'] ?? '',
        'image_row_2_image_3' => ($website['image-row-2'] ?? array())['image-3'] ?? '',
        'image_row_2_title_3' => developer_get_ml_value($website['image-row-2'] ?? array(), 'title-3', $lang),
        'image_row_2_text_3' => developer_get_ml_value($website['image-row-2'] ?? array(), 'text-3', $lang),
        'image_row_2_btn_text_3' => developer_get_ml_value($website['image-row-2'] ?? array(), 'btn-text-3', $lang),
        'image_row_2_btn_link_3' => ($website['image-row-2'] ?? array())['btn-link-3'] ?? '',
        'image_row_2_card_bg_3' => ($website['image-row-2'] ?? array())['card-bg-3'] ?? '',
        'image_row_2_row_btn_text' => developer_get_ml_value($website['image-row-2'] ?? array(), 'row-btn-text', $lang),
        'image_row_2_row_btn_link' => ($website['image-row-2'] ?? array())['row-btn-link'] ?? '',
        'section_order_image_row_2' => ($website['image-row-2'] ?? array())['position'] ?? null,

        'image_row_3_enabled' => ($website['image-row-3'] ?? array())['enabled'] ?? false,
        'image_row_3_heading' => developer_get_ml_value($website['image-row-3'] ?? array(), 'heading', $lang),
        'image_row_3_bg' => ($website['image-row-3'] ?? array())['bg'] ?? '#ffffff',
        'image_row_3_text_align' => ($website['image-row-3'] ?? array())['text-align'] ?? 'center',
        'image_row_3_description' => developer_get_ml_value($website['image-row-3'] ?? array(), 'description', $lang),
        'image_row_3_image_1' => ($website['image-row-3'] ?? array())['image-1'] ?? '',
        'image_row_3_title_1' => developer_get_ml_value($website['image-row-3'] ?? array(), 'title-1', $lang),
        'image_row_3_text_1' => developer_get_ml_value($website['image-row-3'] ?? array(), 'text-1', $lang),
        'image_row_3_btn_text_1' => developer_get_ml_value($website['image-row-3'] ?? array(), 'btn-text-1', $lang),
        'image_row_3_btn_link_1' => ($website['image-row-3'] ?? array())['btn-link-1'] ?? '',
        'image_row_3_card_bg_1' => ($website['image-row-3'] ?? array())['card-bg-1'] ?? '',
        'image_row_3_image_2' => ($website['image-row-3'] ?? array())['image-2'] ?? '',
        'image_row_3_title_2' => developer_get_ml_value($website['image-row-3'] ?? array(), 'title-2', $lang),
        'image_row_3_text_2' => developer_get_ml_value($website['image-row-3'] ?? array(), 'text-2', $lang),
        'image_row_3_btn_text_2' => developer_get_ml_value($website['image-row-3'] ?? array(), 'btn-text-2', $lang),
        'image_row_3_btn_link_2' => ($website['image-row-3'] ?? array())['btn-link-2'] ?? '',
        'image_row_3_card_bg_2' => ($website['image-row-3'] ?? array())['card-bg-2'] ?? '',
        'image_row_3_image_3' => ($website['image-row-3'] ?? array())['image-3'] ?? '',
        'image_row_3_title_3' => developer_get_ml_value($website['image-row-3'] ?? array(), 'title-3', $lang),
        'image_row_3_text_3' => developer_get_ml_value($website['image-row-3'] ?? array(), 'text-3', $lang),
        'image_row_3_btn_text_3' => developer_get_ml_value($website['image-row-3'] ?? array(), 'btn-text-3', $lang),
        'image_row_3_btn_link_3' => ($website['image-row-3'] ?? array())['btn-link-3'] ?? '',
        'image_row_3_card_bg_3' => ($website['image-row-3'] ?? array())['card-bg-3'] ?? '',
        'image_row_3_row_btn_text' => developer_get_ml_value($website['image-row-3'] ?? array(), 'row-btn-text', $lang),
        'image_row_3_row_btn_link' => ($website['image-row-3'] ?? array())['row-btn-link'] ?? '',
        'section_order_image_row_3' => ($website['image-row-3'] ?? array())['position'] ?? null,

        // Image Row 4
        'image_row_4_enabled' => ($website['image-row-4'] ?? array())['enabled'] ?? false,
        'image_row_4_heading' => developer_get_ml_value($website['image-row-4'] ?? array(), 'heading', $lang),
        'image_row_4_description' => developer_get_ml_value($website['image-row-4'] ?? array(), 'description', $lang),
        'image_row_4_bg' => ($website['image-row-4'] ?? array())['bg'] ?? '#ffffff',
        'image_row_4_text_align' => ($website['image-row-4'] ?? array())['text-align'] ?? 'center',
        'image_row_4_image_1' => ($website['image-row-4'] ?? array())['image-1'] ?? '',
        'image_row_4_title_1' => developer_get_ml_value($website['image-row-4'] ?? array(), 'title-1', $lang),
        'image_row_4_text_1' => developer_get_ml_value($website['image-row-4'] ?? array(), 'text-1', $lang),
        'image_row_4_btn_text_1' => developer_get_ml_value($website['image-row-4'] ?? array(), 'btn-text-1', $lang),
        'image_row_4_btn_link_1' => ($website['image-row-4'] ?? array())['btn-link-1'] ?? '',
        'image_row_4_card_bg_1' => ($website['image-row-4'] ?? array())['card-bg-1'] ?? '',
        'image_row_4_image_2' => ($website['image-row-4'] ?? array())['image-2'] ?? '',
        'image_row_4_title_2' => developer_get_ml_value($website['image-row-4'] ?? array(), 'title-2', $lang),
        'image_row_4_text_2' => developer_get_ml_value($website['image-row-4'] ?? array(), 'text-2', $lang),
        'image_row_4_btn_text_2' => developer_get_ml_value($website['image-row-4'] ?? array(), 'btn-text-2', $lang),
        'image_row_4_btn_link_2' => ($website['image-row-4'] ?? array())['btn-link-2'] ?? '',
        'image_row_4_card_bg_2' => ($website['image-row-4'] ?? array())['card-bg-2'] ?? '',
        'image_row_4_image_3' => ($website['image-row-4'] ?? array())['image-3'] ?? '',
        'image_row_4_title_3' => developer_get_ml_value($website['image-row-4'] ?? array(), 'title-3', $lang),
        'image_row_4_text_3' => developer_get_ml_value($website['image-row-4'] ?? array(), 'text-3', $lang),
        'image_row_4_btn_text_3' => developer_get_ml_value($website['image-row-4'] ?? array(), 'btn-text-3', $lang),
        'image_row_4_btn_link_3' => ($website['image-row-4'] ?? array())['btn-link-3'] ?? '',
        'image_row_4_card_bg_3' => ($website['image-row-4'] ?? array())['card-bg-3'] ?? '',
        'image_row_4_row_btn_text' => developer_get_ml_value($website['image-row-4'] ?? array(), 'row-btn-text', $lang),
        'image_row_4_row_btn_link' => ($website['image-row-4'] ?? array())['row-btn-link'] ?? '',
        'section_order_image_row_4' => ($website['image-row-4'] ?? array())['position'] ?? null,

        // Badge Row (partner logos, trust badges)
        'badge_row_enabled' => ($website['badge-row'] ?? array())['enabled'] ?? false,
        'badge_row_heading' => developer_get_ml_value($website['badge-row'] ?? array(), 'heading', $lang),
        'badge_row_bg' => ($website['badge-row'] ?? array())['bg'] ?? '#f8fafc',
        'badge_row_image_1' => ($website['badge-row'] ?? array())['image-1'] ?? '',
        'badge_row_image_2' => ($website['badge-row'] ?? array())['image-2'] ?? '',
        'badge_row_image_3' => ($website['badge-row'] ?? array())['image-3'] ?? '',
        'badge_row_image_4' => ($website['badge-row'] ?? array())['image-4'] ?? '',
        'badge_row_image_5' => ($website['badge-row'] ?? array())['image-5'] ?? '',
        'section_order_badge_row' => ($website['badge-row'] ?? array())['position'] ?? null,
    );
    
    // Cache for 5 minutes — cleared by GAS API on Web Builder save
    set_transient($cache_key, $result, 5 * MINUTE_IN_SECONDS);
    
    return $result;
}

/**
 * Output Custom CSS from Customizer
 */
function developer_developer_custom_css() {
    // Get API settings first (overrides theme_mod)
    $api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();
    
    // Colors - API overrides theme_mod
    $primary = $api['primary_color'] ?? get_theme_mod('developer_primary_color', '#2563eb');
    $secondary = $api['secondary_color'] ?? get_theme_mod('developer_secondary_color', '#0f172a');
    $accent = $api['accent_color'] ?? get_theme_mod('developer_accent_color', '#f59e0b');
    
    // Global Styles - API overrides theme_mod
    $btn_primary_bg = $api['btn_primary_bg'] ?? get_theme_mod('developer_btn_primary_bg', '#2563eb');
    $btn_primary_text = $api['btn_primary_text'] ?? get_theme_mod('developer_btn_primary_text', '#ffffff');
    $btn_secondary_bg = $api['btn_secondary_bg'] ?? get_theme_mod('developer_btn_secondary_bg', '#ffffff');
    $btn_secondary_text = $api['btn_secondary_text'] ?? get_theme_mod('developer_btn_secondary_text', '#2563eb');
    $page_title_size = $api['title_size'] ?? get_theme_mod('developer_page_title_size', '42');
    $subheading_size = $api['subheading_size'] ?? get_theme_mod('developer_subheading_size', '32');
    $body_text_size = $api['body_size'] ?? get_theme_mod('developer_body_text_size', '16');
    $btn_radius = $api['btn_radius'] ?? get_theme_mod('developer_btn_radius', '8');
    $card_radius = $api['card_radius'] ?? (intval($btn_radius) > 0 ? intval($btn_radius) + 4 : 0);
    $lg_radius = $api['lg_radius'] ?? (intval($btn_radius) > 0 ? intval($btn_radius) * 2 : 0);
    $link_color = $api['link_color'] ?? get_theme_mod('developer_link_color', '#2563eb');
    $section_spacing = !empty($api['section_spacing']) ? intval($api['section_spacing']) : 20;
    $custom_css = $api['custom_css'] ?? get_theme_mod('developer_custom_css', '');
    
    // Header - API overrides theme_mod
    $header_bg = $api['header_bg'] ?? get_theme_mod('developer_header_bg_color', '#ffffff');
    $header_text = $api['header_text'] ?? get_theme_mod('developer_header_text_color', '#1e293b');
    $header_logo = $api['header_logo'] ?? get_theme_mod('developer_header_logo_color', '#0f172a');
    $header_cta_bg = $api['cta_bg'] ?? get_theme_mod('developer_header_cta_bg', '#2563eb');
    $header_cta_text = $api['cta_text_color'] ?? get_theme_mod('developer_header_cta_text', '#ffffff');
    $header_font = $api['header_font'] ?? get_theme_mod('developer_header_font', 'inter');
    $header_font_size = $api['header_font_size'] ?? get_theme_mod('developer_header_font_size', '15');
    $header_font_weight = $api['header_font_weight'] ?? get_theme_mod('developer_header_font_weight', '500');
    $header_text_transform = $api['header_text_transform'] ?? get_theme_mod('developer_header_text_transform', 'none');
    $header_transparent = $api['header_transparent'] ?? get_theme_mod('developer_header_transparent', false);
    $header_logo_size = $api['header_logo_size'] ?? '40';
    
    // When transparent mode is on, auto-detect contrasting text for scrolled/inner pages
    // This prevents white-on-white when user sets text white for the hero overlay
    $header_solid_text = $header_text;
    $header_solid_logo = $header_logo;
    if ($header_transparent) {
        // Check if header bg is light - if so, ensure text is dark
        $bg_hex = ltrim($header_bg, '#');
        if (strlen($bg_hex) === 3) {
            $bg_hex = $bg_hex[0].$bg_hex[0].$bg_hex[1].$bg_hex[1].$bg_hex[2].$bg_hex[2];
        }
        $bg_r = hexdec(substr($bg_hex, 0, 2));
        $bg_g = hexdec(substr($bg_hex, 2, 2));
        $bg_b = hexdec(substr($bg_hex, 4, 2));
        $bg_luminance = (0.299 * $bg_r + 0.587 * $bg_g + 0.114 * $bg_b) / 255;
        
        // Check if configured text is too close to bg
        $txt_hex = ltrim($header_text, '#');
        if (strlen($txt_hex) === 3) {
            $txt_hex = $txt_hex[0].$txt_hex[0].$txt_hex[1].$txt_hex[1].$txt_hex[2].$txt_hex[2];
        }
        $txt_r = hexdec(substr($txt_hex, 0, 2));
        $txt_g = hexdec(substr($txt_hex, 2, 2));
        $txt_b = hexdec(substr($txt_hex, 4, 2));
        $txt_luminance = (0.299 * $txt_r + 0.587 * $txt_g + 0.114 * $txt_b) / 255;
        
        $contrast = abs($bg_luminance - $txt_luminance);
        if ($contrast < 0.3) {
            // Not enough contrast - auto-pick
            $header_solid_text = $bg_luminance > 0.5 ? '#1e293b' : '#ffffff';
            $header_solid_logo = $bg_luminance > 0.5 ? '#0f172a' : '#ffffff';
        }
    }
    
    // Section backgrounds - API overrides theme_mod
    $featured_bg = $api['featured_bg'] ?? get_theme_mod('developer_featured_bg', '#ffffff');
    $about_bg = $api['about_bg'] ?? get_theme_mod('developer_about_bg', '#f8fafc');
    $testimonials_bg = $api['testimonials_bg'] ?? get_theme_mod('developer_testimonials_bg', '#0f172a');
    $cta_bg = $api['cta_bg'] ?? get_theme_mod('developer_cta_bg', '#2563eb');

    // Footer - API overrides theme_mod
    $footer_bg = $api['footer_bg'] ?? get_theme_mod('developer_footer_bg', '#0f172a');
    $footer_text = $api['footer_text'] ?? get_theme_mod('developer_footer_text', '#ffffff');
    
    // Fonts - API overrides theme_mod for site-wide consistency
    $heading_font = $api['heading_font'] ?? get_theme_mod('developer_heading_font', 'playfair');
    $subheading_font = $api['subheading_font'] ?? get_theme_mod('developer_subheading_font', 'inter');
    $body_font = $api['body_font'] ?? get_theme_mod('developer_body_font', 'inter');
    
    // Global typography sizes from API
    $page_title_size = $api['title_size'] ?? get_theme_mod('developer_page_title_size', '42');
    $subheading_size = $api['subheading_size'] ?? get_theme_mod('developer_subheading_size', '32');
    $body_text_size = $api['body_size'] ?? get_theme_mod('developer_body_text_size', '16');
    
    // Hero
    $hero_height = $api['hero_height'] ?? get_theme_mod('developer_hero_height', '90');
    
    // Font mappings
    $font_families = array(
        'inter'             => "'Inter', sans-serif",
        'poppins'           => "'Poppins', sans-serif",
        'montserrat'        => "'Montserrat', sans-serif",
        'raleway'           => "'Raleway', sans-serif",
        'nunito'            => "'Nunito', sans-serif",
        'lato'              => "'Lato', sans-serif",
        'dm-sans'           => "'DM Sans', sans-serif",
        'outfit'            => "'Outfit', sans-serif",
        'plus-jakarta-sans' => "'Plus Jakarta Sans', sans-serif",
        'josefin-sans'      => "'Josefin Sans', sans-serif",
        'open-sans'         => "'Open Sans', sans-serif",
        'source-sans'       => "'Source Sans 3', sans-serif",
        'merriweather'      => "'Merriweather', Georgia, serif",
        'playfair'          => "'Playfair Display', Georgia, serif",
        'lora'              => "'Lora', Georgia, serif",
        'cormorant'         => "'Cormorant Garamond', Georgia, serif",
        'libre-baskerville' => "'Libre Baskerville', Georgia, serif",
        'eb-garamond'       => "'EB Garamond', Georgia, serif",
        'crimson-text'      => "'Crimson Text', Georgia, serif",
        'cinzel'            => "'Cinzel', Georgia, serif",
        'tenor-sans'        => "'Tenor Sans', sans-serif",
        'spectral'          => "'Spectral', Georgia, serif",
        'oswald'            => "'Oswald', sans-serif",
        'roboto'            => "'Roboto', sans-serif",
    );
    
    $heading_family = isset($font_families[$heading_font]) ? $font_families[$heading_font] : $font_families['playfair'];
    $subheading_family = isset($font_families[$subheading_font]) ? $font_families[$subheading_font] : $font_families['inter'];
    $body_family = isset($font_families[$body_font]) ? $font_families[$body_font] : $font_families['inter'];
    $header_family = isset($font_families[$header_font]) ? $font_families[$header_font] : $font_families['inter'];
    
    echo '<style id="developer-custom-css">
        :root {
            --developer-primary: ' . esc_attr($primary) . ';
            --developer-primary-dark: ' . esc_attr(developer_adjust_brightness($primary, -20)) . ';
            --developer-secondary: ' . esc_attr($secondary) . ';
            --developer-accent: ' . esc_attr($accent) . ';
            --developer-font-display: ' . $heading_family . ';
            --developer-subheading-font: ' . $subheading_family . ';
            --developer-font: ' . $body_family . ';
            --developer-btn-primary-bg: ' . esc_attr($btn_primary_bg) . ';
            --developer-btn-primary-text: ' . esc_attr($btn_primary_text) . ';
            --developer-btn-secondary-bg: ' . esc_attr($btn_secondary_bg) . ';
            --developer-btn-secondary-text: ' . esc_attr($btn_secondary_text) . ';
            --developer-btn-radius: ' . esc_attr($btn_radius) . 'px;
            --developer-radius: ' . esc_attr($btn_radius) . 'px;
            --developer-radius-lg: ' . esc_attr($lg_radius) . 'px;
            --developer-link-color: ' . esc_attr($link_color) . ';
            --developer-section-spacing: ' . esc_attr($section_spacing) . 'px;
        }
        
        /* Global Button Styles */
        .developer-btn {
            border-radius: ' . esc_attr($btn_radius) . 'px;
        }
        
        .developer-btn-primary,
        .developer-btn:not(.developer-btn-secondary):not(.developer-btn-white),
        .gas-view-btn {
            background: ' . esc_attr($btn_primary_bg) . ' !important;
            color: ' . esc_attr($btn_primary_text) . ' !important;
        }

        .developer-btn-primary:hover,
        .developer-btn:not(.developer-btn-secondary):not(.developer-btn-white):hover,
        .gas-view-btn:hover {
            background: ' . esc_attr(developer_adjust_brightness($btn_primary_bg, -20)) . ' !important;
        }
        
        .developer-btn-secondary {
            background: ' . esc_attr($btn_secondary_bg) . ';
            color: ' . esc_attr($btn_secondary_text) . ';
            border: 2px solid ' . esc_attr($btn_secondary_text) . ';
        }
        
        .developer-btn-secondary:hover {
            background: ' . esc_attr($btn_secondary_text) . ';
            color: ' . esc_attr($btn_secondary_bg) . ';
        }
        
        .developer-btn-white {
            background: ' . esc_attr($btn_secondary_bg) . ';
            color: ' . esc_attr($btn_secondary_text) . ';
        }
        
        .developer-btn-white:hover {
            background: ' . esc_attr(developer_adjust_brightness($btn_secondary_bg, -10)) . ';
        }
        
        /* Global Typography */
        body {
            font-size: ' . esc_attr($body_text_size) . 'px;
        }
        
        .developer-page-header h1,
        .developer-page-hero h1,
        .developer-hero h1,
        .developer-hero h2,
        .gas-contact-header h1 {
            font-family: var(--developer-font-display) !important;
            font-size: ' . esc_attr($page_title_size) . 'px;
        }

        .developer-section h2,
        .developer-hero h2,
        .developer-usp h2,
        .developer-featured h2,
        .developer-about h2,
        .developer-services h2,
        .developer-cta h2 {
            font-family: var(--developer-subheading-font) !important;
            font-size: ' . esc_attr($subheading_size) . 'px !important;
        }

        a {
            color: ' . esc_attr($link_color) . ';
        }
        
        a:hover {
            color: ' . esc_attr(developer_adjust_brightness($link_color, -30)) . ';
        }
        
        /* Header Styles */
        .developer-header {
            background: ' . esc_attr($header_bg) . ';
        }
        
        .developer-logo {
            color: ' . esc_attr($header_solid_logo) . ';
        }
        
        .developer-logo img {
            height: ' . esc_attr($header_logo_size) . 'px;
            width: auto;
        }
        
        .developer-nav a {
            color: ' . esc_attr($header_solid_text) . ';
            font-family: ' . $header_family . ';
            font-size: ' . esc_attr($header_font_size) . 'px;
            font-weight: ' . esc_attr($header_font_weight) . ';
            text-transform: ' . esc_attr($header_text_transform) . ';
        }
        
        .developer-nav-cta {
            background: ' . esc_attr($header_cta_bg) . ' !important;
            color: ' . esc_attr($header_cta_text) . ' !important;
        }
        
        .developer-nav-cta:hover {
            background: ' . esc_attr(developer_adjust_brightness($header_cta_bg, -20)) . ' !important;
        }
        
        .developer-menu-toggle span {
            background-color: ' . esc_attr($header_solid_text) . ';
        }';

    // Lang switcher colours - API override
    $header_lang_color = $api['header_lang_color'] ?? '';
    $header_lang_dd_color = $api['header_lang_dropdown_color'] ?? '';
    $header_lang_dd_bg = $api['header_lang_dropdown_bg'] ?? '';
    if (!empty($header_lang_color)) {
        echo '
        .developer-lang-current {
            color: ' . esc_attr($header_lang_color) . ';
        }';
    }
    if (!empty($header_lang_dd_color) || !empty($header_lang_dd_bg)) {
        echo '
        .developer-lang-dropdown {' .
            (!empty($header_lang_dd_bg) ? '
            background: ' . esc_attr($header_lang_dd_bg) . ';' : '') . '
        }
        .developer-lang-dropdown .developer-lang-option,
        .developer-lang-dropdown .developer-lang-option:visited {' .
            (!empty($header_lang_dd_color) ? '
            color: ' . esc_attr($header_lang_dd_color) . ';' : '') . '
        }
        .developer-lang-dropdown .developer-lang-option:hover {
            background: rgba(0,0,0,0.05);
        }
        .developer-lang-dropdown .developer-lang-option.active {' .
            (!empty($header_lang_dd_color) ? '
            color: ' . esc_attr($header_lang_dd_color) . ';' : '') . '
            background: rgba(0,0,0,0.08);
        }';
    }

    // Header border - read from API first, fallback to theme_mod
    $header_border = $api['header_border'] ?? get_theme_mod('developer_header_border', false);
    $header_border_color = $api['header_border_style_color'] ?? $api['header_border_color'] ?? get_theme_mod('developer_header_border_color', '#e2e8f0');
    $header_border_width = $api['header_border_width'] ?? '1';
    $header_border_style = $api['header_border_style_type'] ?? 'solid';
    if ($header_border) {
        echo '
        .developer-header {
            border-bottom: ' . esc_attr($header_border_width) . 'px ' . esc_attr($header_border_style) . ' ' . esc_attr($header_border_color) . ';
        }';
    }
    
    // Menu active underline color
    $underline_color = $api['header_underline_color'] ?? get_theme_mod('developer_header_underline_color', '');
    if ($underline_color) {
        echo '
        .developer-nav a::after {
            background: ' . esc_attr($underline_color) . ' !important;
        }';
    }
        
    // Transparent header on homepage and sub-pages with hero sections
    if ($header_transparent) {
        $trans_opacity = $api['header_transparent_opacity'] ?? '35';
        $trans_decimal = intval($trans_opacity) / 100;
        $trans_mid = $trans_decimal * 0.43; // ~60% point
        echo '
        /* Transparent header with gradient for readability */
        .home .developer-header,
        .developer-page-hero ~ .developer-header,
        body:has(.developer-page-hero) .developer-header {
            background: linear-gradient(to bottom, rgba(0,0,0,' . $trans_decimal . ') 0%, rgba(0,0,0,' . round($trans_mid, 2) . ') 60%, transparent 100%);
            backdrop-filter: none;' . ($header_border ? '' : '
            border-bottom: none;') . '
        }
        
        .home .developer-header .developer-logo,
        .home .developer-header .developer-nav a,
        body:has(.developer-page-hero) .developer-header .developer-logo,
        body:has(.developer-page-hero) .developer-header .developer-nav a {
            color: white;
            text-shadow: 0 1px 3px rgba(0,0,0,0.4);
        }
        
        .home .developer-header .developer-menu-toggle span,
        body:has(.developer-page-hero) .developer-header .developer-menu-toggle span {
            background-color: white;
            box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        
        .home .developer-header .developer-nav-cta,
        body:has(.developer-page-hero) .developer-header .developer-nav-cta {
            text-shadow: none;
        }

        .home .developer-header.scrolled,
        body:has(.developer-page-hero) .developer-header.scrolled {
            background: ' . esc_attr($header_bg) . ';
            box-shadow: 0 2px 20px rgba(0,0,0,0.08);
        }
        
        .home .developer-header.scrolled .developer-logo,
        body:has(.developer-page-hero) .developer-header.scrolled .developer-logo {
            color: ' . esc_attr($header_solid_logo) . ';
            text-shadow: none;
        }
        
        .home .developer-header.scrolled .developer-nav a,
        body:has(.developer-page-hero) .developer-header.scrolled .developer-nav a {
            color: ' . esc_attr($header_solid_text) . ';
            text-shadow: none;
        }
        
        .home .developer-header.scrolled .developer-menu-toggle span,
        body:has(.developer-page-hero) .developer-header.scrolled .developer-menu-toggle span {
            background-color: ' . esc_attr($header_solid_text) . ';
            box-shadow: none;
        }

        /* Logo variant swap: light logo over hero, default when scrolled */
        .developer-logo-light {
            display: none;
        }
        .home .developer-header .developer-logo-default.has-light-variant,
        body:has(.developer-page-hero) .developer-header .developer-logo-default.has-light-variant {
            display: none;
        }
        .home .developer-header .developer-logo-light,
        body:has(.developer-page-hero) .developer-header .developer-logo-light {
            display: inline-block;
        }
        .home .developer-header.scrolled .developer-logo-default.has-light-variant,
        body:has(.developer-page-hero) .developer-header.scrolled .developer-logo-default.has-light-variant {
            display: inline-block;
        }
        .home .developer-header.scrolled .developer-logo-light,
        body:has(.developer-page-hero) .developer-header.scrolled .developer-logo-light {
            display: none;
        }';
    }
    
    echo '
        .developer-hero {
            min-height: ' . esc_attr($hero_height) . 'vh;
        }
        
        .developer-featured {
            background-color: ' . esc_attr($featured_bg) . ';
        }
        
        .developer-section-alt {
            background-color: ' . esc_attr($about_bg) . ';
        }
        
        .developer-testimonials {
            background-color: ' . esc_attr($testimonials_bg) . ';
        }
        
        .developer-cta {
            background: linear-gradient(135deg, ' . esc_attr($cta_bg) . ' 0%, ' . esc_attr(developer_adjust_brightness($cta_bg, -30)) . ' 100%);
        }
        
        .developer-footer {
            background-color: ' . esc_attr($footer_bg) . ';
            color: ' . esc_attr($footer_text) . ';
        }
        
        .developer-footer h4,
        .developer-footer-brand h3 {
            color: ' . esc_attr($footer_text) . ';
        }
        
        .developer-footer-links a {
            color: ' . esc_attr($footer_text) . ';
            opacity: 0.7;
        }
        
        .developer-footer-links a:hover {
            opacity: 1;
        }
        
        ' . ($custom_css ? '/* Custom CSS */ ' . $custom_css : '') . '
    </style>';
}
add_action('wp_head', 'developer_developer_custom_css', 100);

function developer_favicon_meta_tags() {
    $api_settings = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();
    $favicon = $api_settings['header_favicon'] ?? '';
    $apple_icon = $api_settings['header_apple_icon'] ?? '';
    if ($favicon) {
        echo '<link rel="icon" href="' . esc_url($favicon) . '" type="image/png">' . "\n";
    }
    if ($apple_icon) {
        echo '<link rel="apple-touch-icon" href="' . esc_url($apple_icon) . '">' . "\n";
    }
}
add_action('wp_head', 'developer_favicon_meta_tags', 5);

/**
 * SEO: Override <title> with page-specific meta_title from API
 */
function developer_seo_title_parts($title_parts) {
    $api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();
    $page_key = developer_get_current_page_key();
    if ($page_key) {
        $meta_title = $api['page_' . $page_key . '_meta_title'] ?? '';
        if (!empty($meta_title)) {
            $title_parts['title'] = $meta_title;
        }
    }
    return $title_parts;
}
add_filter('document_title_parts', 'developer_seo_title_parts');

/**
 * SEO: Output <meta name="description"> from page-specific meta_description
 */
function developer_seo_meta_description() {
    $api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();
    $page_key = developer_get_current_page_key();
    if ($page_key) {
        $meta_desc = $api['page_' . $page_key . '_meta_description'] ?? '';
        if (!empty($meta_desc)) {
            echo '<meta name="description" content="' . esc_attr($meta_desc) . '">' . "\n";
        }
    }
}
add_action('wp_head', 'developer_seo_meta_description', 6);

/**
 * Helper: detect current page key from template
 */
function developer_get_current_page_key() {
    if (is_front_page()) return 'home';
    if (is_page_template('template-contact.php')) return 'contact';
    if (is_page_template('template-about.php')) return 'about';
    if (is_page_template('template-terms.php')) return 'terms';
    if (is_page_template('template-privacy.php')) return 'privacy';
    if (is_page_template('template-reviews.php')) return 'reviews';
    $slug = get_post_field('post_name', get_queried_object_id());
    $slug_map = array(
        'book-now' => 'rooms', 'rooms' => 'rooms',
        'blog' => 'blog', 'attractions' => 'attractions',
        'gallery' => 'gallery', 'dining' => 'dining',
        'offers' => 'offers', 'properties' => 'properties',
    );
    return $slug_map[$slug] ?? null;
}

/**
 * Adjust color brightness
 */
function developer_adjust_brightness($hex, $steps) {
    $hex = ltrim($hex, '#');
    $r = hexdec(substr($hex, 0, 2));
    $g = hexdec(substr($hex, 2, 2));
    $b = hexdec(substr($hex, 4, 2));
    
    $r = max(0, min(255, $r + $steps));
    $g = max(0, min(255, $g + $steps));
    $b = max(0, min(255, $b + $steps));
    
    return '#' . sprintf('%02x%02x%02x', $r, $g, $b);
}

/**
 * Register Widget Areas
 */
function developer_developer_widgets() {
    register_sidebar(array(
        'name'          => __('Footer 1', 'developer-developer'),
        'id'            => 'footer-1',
        'description'   => __('First footer column', 'developer-developer'),
        'before_widget' => '<div class="developer-widget">',
        'after_widget'  => '</div>',
        'before_title'  => '<h4>',
        'after_title'   => '</h4>',
    ));
    
    register_sidebar(array(
        'name'          => __('Footer 2', 'developer-developer'),
        'id'            => 'footer-2',
        'description'   => __('Second footer column', 'developer-developer'),
        'before_widget' => '<div class="developer-widget">',
        'after_widget'  => '</div>',
        'before_title'  => '<h4>',
        'after_title'   => '</h4>',
    ));
}
add_action('widgets_init', 'developer_developer_widgets');

/**
 * REST API Endpoint for Menu Management
 * Allows GAS to create/update menus remotely
 */
add_action('rest_api_init', function() {
    register_rest_route('developer-theme/v1', '/create-menu', array(
        'methods'  => 'POST',
        'callback' => 'developer_create_menu_endpoint',
        'permission_callback' => function($request) {
            $api_key = $request->get_header('X-GAS-API-Key');
            return $api_key === 'GAS_SECRET_KEY_2024!';
        }
    ));
    
    register_rest_route('developer-theme/v1', '/reset-menu', array(
        'methods'  => 'POST',
        'callback' => 'developer_reset_menu_endpoint',
        'permission_callback' => function($request) {
            $api_key = $request->get_header('X-GAS-API-Key');
            return $api_key === 'GAS_SECRET_KEY_2024!';
        }
    ));

    register_rest_route('developer-theme/v1', '/upload-media', array(
        'methods'  => 'POST',
        'callback' => 'developer_upload_media_endpoint',
        'permission_callback' => function($request) {
            $api_key = $request->get_header('X-GAS-API-Key');
            return $api_key === 'GAS_SECRET_KEY_2024!';
        }
    ));
});

/**
 * Upload Media Endpoint
 * Receives base64-encoded file data, uploads to WordPress media library
 * 
 * POST /wp-json/developer-theme/v1/upload-media
 * Body: { file_data: "base64...", file_name: "image.jpg", file_type: "image/jpeg", section: "hero" }
 */
function developer_upload_media_endpoint($request) {
    $params = $request->get_json_params();
    
    $file_data = isset($params['file_data']) ? $params['file_data'] : '';
    $file_name = isset($params['file_name']) ? sanitize_file_name($params['file_name']) : '';
    $file_type = isset($params['file_type']) ? $params['file_type'] : 'image/jpeg';
    $section   = isset($params['section']) ? sanitize_text_field($params['section']) : '';
    
    if (empty($file_data)) {
        return new WP_REST_Response(array(
            'success' => false,
            'error'   => 'file_data is required (base64-encoded)'
        ), 400);
    }
    
    if (empty($file_name)) {
        return new WP_REST_Response(array(
            'success' => false,
            'error'   => 'file_name is required'
        ), 400);
    }
    
    // Decode base64 data
    $decoded = base64_decode($file_data, true);
    if ($decoded === false) {
        return new WP_REST_Response(array(
            'success' => false,
            'error'   => 'Invalid base64 data'
        ), 400);
    }
    
    // Require WordPress file handling functions
    if (!function_exists('wp_upload_bits')) {
        require_once(ABSPATH . 'wp-admin/includes/file.php');
    }
    if (!function_exists('wp_generate_attachment_metadata')) {
        require_once(ABSPATH . 'wp-admin/includes/image.php');
    }
    if (!function_exists('wp_insert_attachment')) {
        require_once(ABSPATH . 'wp-admin/includes/post.php');
    }
    
    // Upload the file to wp-content/uploads
    $upload = wp_upload_bits($file_name, null, $decoded);
    
    if (!empty($upload['error'])) {
        return new WP_REST_Response(array(
            'success' => false,
            'error'   => 'Upload failed: ' . $upload['error']
        ), 500);
    }
    
    // Create attachment post in media library
    $attachment = array(
        'post_mime_type' => $file_type,
        'post_title'     => preg_replace('/\.[^.]+$/', '', $file_name),
        'post_content'   => '',
        'post_status'    => 'inherit'
    );
    
    $attach_id = wp_insert_attachment($attachment, $upload['file']);
    
    if (is_wp_error($attach_id)) {
        return new WP_REST_Response(array(
            'success' => false,
            'error'   => 'Failed to create media attachment: ' . $attach_id->get_error_message()
        ), 500);
    }
    
    // Generate attachment metadata (thumbnails etc.)
    $attach_data = wp_generate_attachment_metadata($attach_id, $upload['file']);
    wp_update_attachment_metadata($attach_id, $attach_data);
    
    $url = $upload['url'];
    
    // If section is specified, update the corresponding theme_mod
    if (!empty($section)) {
        $section_map = array(
            'hero'  => 'developer_hero_bg',
            'about' => 'developer_about_image',
            'host'  => 'developer_about_page_host_image',
        );
        
        if (isset($section_map[$section])) {
            set_theme_mod($section_map[$section], $url);
        }
    }
    
    return new WP_REST_Response(array(
        'success'  => true,
        'url'      => $url,
        'media_id' => $attach_id,
        'section'  => $section ?: null
    ), 200);
}

function developer_create_menu_endpoint($request) {
    $params = $request->get_json_params();
    $menu_items = isset($params['menu_items']) ? $params['menu_items'] : array();
    
    $result = developer_setup_primary_menu($menu_items);
    
    return new WP_REST_Response($result, $result['success'] ? 200 : 500);
}

function developer_reset_menu_endpoint($request) {
    // Delete existing menu and recreate with defaults
    $menu_name = 'Primary Menu';
    $menu = wp_get_nav_menu_object($menu_name);
    
    if ($menu) {
        wp_delete_nav_menu($menu->term_id);
    }
    
    // Create fresh menu with defaults
    $result = developer_setup_primary_menu();
    
    return new WP_REST_Response($result, $result['success'] ? 200 : 500);
}

/**
 * Setup Primary Menu with specified or default items
 */
function developer_setup_primary_menu($custom_items = array()) {
    $menu_name = 'Primary Menu';
    
    // Get or create menu
    $menu = wp_get_nav_menu_object($menu_name);
    $menu_id = $menu ? $menu->term_id : wp_create_nav_menu($menu_name);
    
    if (is_wp_error($menu_id)) {
        return array('success' => false, 'error' => $menu_id->get_error_message());
    }
    
    // Clear existing menu items
    $existing_items = wp_get_nav_menu_items($menu_id);
    if ($existing_items) {
        foreach ($existing_items as $item) {
            wp_delete_post($item->ID, true);
        }
    }
    
    // Default menu items: Home, Rooms, Contact Us, Book Now
    $default_items = array(
        array('title' => 'Home', 'url' => '/', 'order' => 1),
        array('title' => 'Rooms', 'url' => '/book-now/', 'order' => 2),
        array('title' => 'Contact Us', 'url' => '/contact/', 'order' => 3),
        array('title' => 'Book Now', 'url' => '/book-now/', 'order' => 4, 'classes' => 'developer-nav-cta'),
    );
    
    $items_to_add = !empty($custom_items) ? $custom_items : $default_items;
    $added_items = array();
    
    foreach ($items_to_add as $item) {
        $item_id = wp_update_nav_menu_item($menu_id, 0, array(
            'menu-item-title'     => $item['title'],
            'menu-item-url'       => home_url($item['url']),
            'menu-item-type'      => 'custom',
            'menu-item-status'    => 'publish',
            'menu-item-position'  => $item['order'],
            'menu-item-classes'   => isset($item['classes']) ? $item['classes'] : '',
        ));
        
        if (!is_wp_error($item_id)) {
            $added_items[] = $item['title'];
        }
    }
    
    // Assign to primary location
    $locations = get_theme_mod('nav_menu_locations');
    if (!is_array($locations)) {
        $locations = array();
    }
    $locations['primary'] = $menu_id;
    set_theme_mod('nav_menu_locations', $locations);
    
    return array(
        'success' => true,
        'menu_id' => $menu_id,
        'items_added' => $added_items,
        'message' => 'Menu created with ' . count($added_items) . ' items'
    );
}

/**
 * Hide menu items for disabled pages based on API settings
 */
add_filter('wp_nav_menu_objects', function($items) {
    $api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();

    // Map page slugs to their enabled setting
    $disabled_slugs = array();
    if (isset($api['page_rooms_enabled']) && ($api['page_rooms_enabled'] === false || $api['page_rooms_enabled'] === 'false')) {
        $disabled_slugs[] = 'book-now';
        $disabled_slugs[] = 'rooms';
    }
    if (isset($api['page_about_enabled']) && ($api['page_about_enabled'] === false || $api['page_about_enabled'] === 'false')) {
        $disabled_slugs[] = 'about';
    }
    if (isset($api['page_contact_enabled']) && ($api['page_contact_enabled'] === false || $api['page_contact_enabled'] === 'false')) {
        $disabled_slugs[] = 'contact';
    }
    if (isset($api['page_blog_enabled']) && ($api['page_blog_enabled'] === false || $api['page_blog_enabled'] === 'false')) {
        $disabled_slugs[] = 'blog';
    }
    if (isset($api['page_gallery_enabled']) && ($api['page_gallery_enabled'] === false || $api['page_gallery_enabled'] === 'false')) {
        $disabled_slugs[] = 'gallery';
    }
    if (isset($api['page_attractions_enabled']) && ($api['page_attractions_enabled'] === false || $api['page_attractions_enabled'] === 'false')) {
        $disabled_slugs[] = 'attractions';
    }
    if (isset($api['page_dining_enabled']) && ($api['page_dining_enabled'] === false || $api['page_dining_enabled'] === 'false')) {
        $disabled_slugs[] = 'dining';
    }
    if (isset($api['page_offers_enabled']) && ($api['page_offers_enabled'] === false || $api['page_offers_enabled'] === 'false')) {
        $disabled_slugs[] = 'offers';
    }
    if (isset($api['page_reviews_enabled']) && ($api['page_reviews_enabled'] === false || $api['page_reviews_enabled'] === 'false')) {
        $disabled_slugs[] = 'reviews';
    }

    if (empty($disabled_slugs)) return $items;

    return array_filter($items, function($item) use ($disabled_slugs) {
        $url_path = trim(parse_url($item->url, PHP_URL_PATH), '/');
        return !in_array($url_path, $disabled_slugs);
    });
});

/**
 * Custom Walker for Navigation
 */
class Developer_Nav_Walker extends Walker_Nav_Menu {
    private $menu_items_count = 0;
    private $current_item_index = 0;
    private $top_level_count = 0;
    
    function walk($elements, $max_depth, ...$args) {
        $this->menu_items_count = count($elements);
        $this->current_item_index = 0;
        // Count top-level items only
        $this->top_level_count = 0;
        foreach ($elements as $el) {
            if (empty($el->menu_item_parent) || $el->menu_item_parent == 0) {
                $this->top_level_count++;
            }
        }
        return parent::walk($elements, $max_depth, ...$args);
    }
    
    function start_el(&$output, $item, $depth = 0, $args = null, $id = 0) {
        $this->current_item_index++;
        $classes = empty($item->classes) ? array() : (array) $item->classes;
        $class_names = join(' ', array_filter($classes));
        
        // Check if item has children
        $has_children = in_array('menu-item-has-children', $classes);
        
        // Auto-detect CTA button: must have CTA class OR title contains "Book"
        $is_top_level = ($depth === 0);
        $title_lower = strtolower($item->title);
        $is_cta = in_array('cta', $classes) || 
                  in_array('menu-cta', $classes) || 
                  in_array('developer-nav-cta', $classes) ||
                  ($is_top_level && (strpos($title_lower, 'book now') !== false || strpos($title_lower, 'book online') !== false));
        
        $link_class = $is_cta ? 'developer-nav-cta' : '';
        
        // For CTA button, use the theme_mod text instead of menu item title
        $title = $item->title;
        if ($is_cta) {
            $cta_text = get_theme_mod('developer_header_cta_text', '');
            if (!empty($cta_text)) {
                $title = $cta_text;
            }
        }
        
        if ($item->current) {
            $link_class .= ' active';
        }
        
        // Add depth class for styling
        if ($depth > 0) {
            $link_class .= ' developer-nav-submenu-link';
        }
        
        // Wrap in div for dropdown support
        if ($is_top_level && $has_children) {
            $output .= '<div class="developer-nav-dropdown">';
            $output .= '<a href="' . esc_url($item->url) . '" class="' . esc_attr(trim($link_class . ' developer-nav-parent')) . '">';
            $output .= esc_html($title);
            $output .= '<svg class="developer-nav-arrow" width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            $output .= '</a>';
        } else {
            $output .= '<a href="' . esc_url($item->url) . '" class="' . esc_attr(trim($link_class)) . '">';
            $output .= esc_html($title);
            $output .= '</a>';
        }
    }
    
    function end_el(&$output, $item, $depth = 0, $args = null) {
        $classes = empty($item->classes) ? array() : (array) $item->classes;
        $has_children = in_array('menu-item-has-children', $classes);
        
        // Close dropdown wrapper for top-level items with children
        if ($depth === 0 && $has_children) {
            $output .= '</div>';
        }
    }
    
    function start_lvl(&$output, $depth = 0, $args = null) {
        $output .= '<div class="developer-nav-submenu">';
    }
    
    function end_lvl(&$output, $depth = 0, $args = null) {
        $output .= '</div>';
    }
}

/**
 * Check if GAS Booking Plugin is Active
 */
function developer_has_gas_booking() {
    return class_exists('GAS_Booking');
}

/**
 * Admin Notice if GAS Booking not installed
 */
function developer_admin_notice() {
    if (!developer_has_gas_booking()) {
        echo '<div class="notice notice-warning is-dismissible">
            <p><strong>GAS Developer Theme:</strong> For full functionality, please install and activate the <a href="https://developer-admin.replit.app" target="_blank">GAS Booking Plugin</a>.</p>
        </div>';
    }
}
add_action('admin_notices', 'developer_admin_notice');
