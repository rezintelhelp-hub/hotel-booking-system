<?php
/**
 * Plugin Name: GAS Booking
 * Plugin URI: https://github.com/gas-booking
 * Description: Complete booking system for Guest Accommodation System. Shows room grid immediately.
 * Version: 3.3.4
 * Author: GAS
 * License: GPL v2 or later
 * Text Domain: gas-booking
 */

if (!defined('ABSPATH')) exit;

define('GAS_BOOKING_VERSION', '3.3.4');
define('GAS_BOOKING_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GAS_BOOKING_PLUGIN_URL', plugin_dir_url(__FILE__));
define('GAS_BOOKING_UPDATE_URL', 'https://admin.gas.travel/api/plugin/check-update');

// Auto-Update Checker
class GAS_Booking_Updater {
    
    private $plugin_slug;
    private $plugin_file;
    private $current_version;
    
    public function __construct() {
        $this->plugin_slug = 'gas-booking';
        $this->plugin_file = plugin_basename(__FILE__);
        $this->current_version = GAS_BOOKING_VERSION;
        
        // Check for updates
        add_filter('pre_set_site_transient_update_plugins', array($this, 'check_for_update'));
        
        // Plugin info popup
        add_filter('plugins_api', array($this, 'plugin_info'), 20, 3);
        
        // After install, clear cache
        add_action('upgrader_process_complete', array($this, 'after_update'), 10, 2);
    }
    
    public function check_for_update($transient) {
        if (empty($transient->checked)) {
            return $transient;
        }
        
        $remote = $this->get_remote_info();
        
        if ($remote && version_compare($this->current_version, $remote->version, '<')) {
            $res = new stdClass();
            $res->slug = $this->plugin_slug;
            $res->plugin = $this->plugin_file;
            $res->new_version = $remote->version;
            $res->package = $remote->download_url;
            $res->tested = $remote->tested ?? '6.4';
            $res->requires_php = $remote->requires_php ?? '7.4';
            
            $transient->response[$this->plugin_file] = $res;
        }
        
        return $transient;
    }
    
    public function plugin_info($result, $action, $args) {
        if ($action !== 'plugin_information' || $args->slug !== $this->plugin_slug) {
            return $result;
        }
        
        $remote = $this->get_remote_info();
        
        if (!$remote) {
            return $result;
        }
        
        $info = new stdClass();
        $info->name = 'GAS Booking';
        $info->slug = $this->plugin_slug;
        $info->version = $remote->version;
        $info->author = '<a href="https://gas.travel">GAS</a>';
        $info->homepage = 'https://gas.travel';
        $info->requires = $remote->requires ?? '5.8';
        $info->tested = $remote->tested ?? '6.4';
        $info->requires_php = $remote->requires_php ?? '7.4';
        $info->downloaded = 0;
        $info->last_updated = $remote->last_updated ?? date('Y-m-d');
        $info->sections = array(
            'description' => $remote->description ?? 'Complete booking system for Guest Accommodation System.',
            'changelog' => $remote->changelog ?? '<p>See GitHub releases for changelog.</p>'
        );
        $info->download_link = $remote->download_url;
        
        return $info;
    }
    
    public function after_update($upgrader, $options) {
        if ($options['action'] === 'update' && $options['type'] === 'plugin') {
            delete_transient('gas_booking_update_info');
        }
    }
    
    private function get_remote_info() {
        $cached = get_transient('gas_booking_update_info');
        
        if ($cached !== false) {
            return $cached;
        }
        
        $response = wp_remote_get(GAS_BOOKING_UPDATE_URL, array(
            'timeout' => 10,
            'sslverify' => false
        ));
        
        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            return false;
        }
        
        $body = json_decode(wp_remote_retrieve_body($response));
        
        if (empty($body) || !isset($body->version)) {
            return false;
        }
        
        // Cache for 6 hours
        set_transient('gas_booking_update_info', $body, 6 * HOUR_IN_SECONDS);
        
        return $body;
    }
}

// Initialize updater
new GAS_Booking_Updater();

class GAS_Booking {
    
    private static $instance = null;
    private $effective_button_color = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        // Customizer for font settings (standalone use)
        add_action('customize_register', array($this, 'register_customizer_settings'));
        
        // Auto-create pages on first run
        add_action('admin_init', array($this, 'maybe_create_pages'));
        
        // Sync enabled pages (create/menu) when settings saved
        add_action('admin_init', array($this, 'sync_enabled_pages'));
        
        // REST API endpoint for GAS Admin to trigger page sync
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        
        // Also allow sync via query string (for cross-origin calls)
        add_action('init', array($this, 'handle_sync_request'));
        
        // SEO injection via wp_head
        add_action('wp_head', array($this, 'inject_seo_meta'), 1);
        
        // Shortcodes
        add_shortcode('gas_search', array($this, 'search_shortcode'));
        add_shortcode('gas_rooms', array($this, 'rooms_shortcode'));
        add_shortcode('gas_room', array($this, 'room_shortcode'));
        add_shortcode('gas_booking', array($this, 'booking_shortcode'));
        add_shortcode('gas_checkout', array($this, 'checkout_shortcode'));
        add_shortcode('gas_offers', array($this, 'offers_shortcode'));
        add_shortcode('gas_about', array($this, 'about_shortcode'));
        add_shortcode('gas_contact', array($this, 'contact_shortcode'));
        add_shortcode('gas_terms', array($this, 'terms_shortcode'));
        add_shortcode('gas_privacy', array($this, 'privacy_shortcode'));
        add_shortcode('gas_gallery', array($this, 'gallery_shortcode'));
        add_shortcode('gas_dining', array($this, 'dining_shortcode'));
        if (!shortcode_exists('gas_properties')) {
            add_shortcode('gas_properties', array($this, 'properties_shortcode'));
        }
        add_shortcode('gas_blog', array($this, 'blog_shortcode'));
        add_shortcode('gas_blog_categories', array($this, 'blog_categories_shortcode'));
        add_shortcode('gas_attractions', array($this, 'attractions_shortcode'));
        add_shortcode('gas_attractions_categories', array($this, 'attractions_categories_shortcode'));
        add_shortcode('gas_footer', array($this, 'footer_shortcode'));
        
        // AJAX handlers
        add_action('wp_ajax_gas_get_availability', array($this, 'ajax_get_availability'));
        add_action('wp_ajax_nopriv_gas_get_availability', array($this, 'ajax_get_availability'));
        add_action('wp_ajax_gas_get_rooms', array($this, 'ajax_get_rooms'));
        add_action('wp_ajax_nopriv_gas_get_rooms', array($this, 'ajax_get_rooms'));
        add_action('wp_ajax_gas_calculate_price', array($this, 'ajax_calculate_price'));
        add_action('wp_ajax_nopriv_gas_calculate_price', array($this, 'ajax_calculate_price'));
        add_action('wp_ajax_gas_create_booking', array($this, 'ajax_create_booking'));
        add_action('wp_ajax_nopriv_gas_create_booking', array($this, 'ajax_create_booking'));
    }
    
    /**
     * Auto-create required pages if they don't exist
     */
    public function maybe_create_pages() {
        // Only run once
        if (get_option('gas_pages_created', '0') === '1') {
            return;
        }
        
        $pages = array(
            'book-now' => array('title' => 'Book Now', 'content' => '[gas_rooms]'),
            'room' => array('title' => 'Room Details', 'content' => '[gas_room]'),
            'checkout' => array('title' => 'Checkout', 'content' => '[gas_checkout]'),
            'offers' => array('title' => 'Special Offers', 'content' => '[gas_offers]'),
            'about' => array('title' => 'About Us', 'content' => '[gas_about]'),
            'contact' => array('title' => 'Contact', 'content' => '[gas_contact]'),
            'terms' => array('title' => 'Terms & Conditions', 'content' => '[gas_terms]'),
            'privacy' => array('title' => 'Privacy Policy', 'content' => '[gas_privacy]'),
        );
        
        foreach ($pages as $slug => $page_data) {
            // Check if page with this slug already exists
            $existing = get_page_by_path($slug);
            if (!$existing) {
                wp_insert_post(array(
                    'post_title' => $page_data['title'],
                    'post_name' => $slug,
                    'post_content' => $page_data['content'],
                    'post_status' => 'publish',
                    'post_type' => 'page',
                ));
            }
        }
        
        // Mark as done
        update_option('gas_pages_created', '1');
    }
    
    /**
     * Sync pages based on enable toggles
     * Creates pages when enabled, removes from menu when disabled
     */
    public function sync_enabled_pages() {
        // Only sync from API, not local options
        // This prevents pages from being removed on every admin load
        // Pages are synced when:
        // 1. GAS Admin triggers sync via REST or query string
        // 2. User manually clicks "Sync from GAS" in plugin settings
        
        // Check if this is a manual sync request from plugin settings
        if (isset($_POST['gas_manual_sync']) && $_POST['gas_manual_sync'] === '1') {
            $this->do_page_sync_from_api();
        }
    }
    
    /**
     * Register REST API routes for GAS Admin
     */
    public function register_rest_routes() {
        register_rest_route('gas-booking/v1', '/sync-pages', array(
            'methods' => 'POST',
            'callback' => array($this, 'rest_sync_pages'),
            'permission_callback' => '__return_true',
        ));
        
        register_rest_route('gas-booking/v1', '/sync-license', array(
            'methods' => 'POST',
            'callback' => array($this, 'rest_sync_license'),
            'permission_callback' => '__return_true',
        ));
    }
    
    /**
     * Handle sync request via query string (for cross-origin)
     */
    public function handle_sync_request() {
        if (!isset($_GET['gas_sync_pages'])) {
            return;
        }
        
        // Get page settings from GAS API
        $this->do_page_sync_from_api();
        
        // Return JSON response
        if (isset($_GET['format']) && $_GET['format'] === 'json') {
            header('Content-Type: application/json');
            header('Access-Control-Allow-Origin: *');
            echo json_encode(array('success' => true, 'message' => 'Pages synced'));
            exit;
        }
    }
    
    /**
     * REST endpoint callback for page sync
     */
    public function rest_sync_pages($request) {
        $this->do_page_sync_from_api();
        return new WP_REST_Response(array('success' => true, 'message' => 'Pages synced from GAS Admin'), 200);
    }
    
    /**
     * REST endpoint: sync license data (room_ids, display_settings) from GAS API
     * Called by GAS Admin when rooms are updated via the UI
     */
    public function rest_sync_license($request) {
        $license_key = get_option('gas_license_key', '');
        if (empty($license_key)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'No license key configured'), 200);
        }
        
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $response = wp_remote_post("{$api_url}/api/plugin/validate-license", array(
            'timeout' => 10,
            'sslverify' => false,
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode(array('license_key' => $license_key))
        ));
        
        if (is_wp_error($response)) {
            return new WP_REST_Response(array('success' => false, 'error' => $response->get_error_message()), 200);
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (!empty($body['success']) && !empty($body['account_id'])) {
            if (isset($body['room_ids'])) {
                update_option('gas_license_room_ids', $body['room_ids']);
            }
            if (isset($body['display_settings'])) {
                update_option('gas_display_settings', $body['display_settings']);
            }
            update_option('gas_client_id', $body['account_id']);
            
            $room_count = is_array($body['room_ids']) ? count($body['room_ids']) : 0;
            return new WP_REST_Response(array('success' => true, 'message' => "License synced: {$room_count} rooms"), 200);
        }
        
        return new WP_REST_Response(array('success' => false, 'error' => 'License validation failed'), 200);
    }
    
    /**
     * Sync pages from GAS API settings
     */
    private function do_page_sync_from_api() {
        $client_id = get_option('gas_client_id', '');
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        
        if (empty($client_id)) {
            error_log('GAS Booking: No client ID configured');
            return;
        }
        
        // Fetch settings from GAS API
        $response = wp_remote_get("{$api_url}/api/public/client/{$client_id}/site-config", array(
            'timeout' => 15,
            'sslverify' => true,
        ));
        
        if (is_wp_error($response)) {
            error_log('GAS Booking: API error - ' . $response->get_error_message());
            return;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data || !isset($data['success']) || !$data['success']) {
            error_log('GAS Booking: Invalid API response');
            return;
        }
        
        $website = $data['config']['website'] ?? array();
        
        error_log('GAS Booking: Syncing pages from API. Website config: ' . print_r(array_keys($website), true));
        
        // Map GAS Admin sections to page config
        // Menu order: Home(10), About(20), Gallery(21-sub), Dining(22-sub), Rooms(30), Properties(40), Offers(50), Things To Do(60), Blog(70), Contact(80), Book Online(90)
        $pages_config = array(
            'page-about' => array(
                'slug' => 'about',
                'default_title' => 'About Us',
                'shortcode' => '[gas_about]',
                'default_menu_order' => 20,
                'parent_slug' => null,
                'template' => 'template-about.php'
            ),
            'page-gallery' => array(
                'slug' => 'gallery',
                'default_title' => 'Gallery',
                'shortcode' => '[gas_gallery]',
                'default_menu_order' => 21,
                'parent_slug' => 'about',
                'template' => ''
            ),
            'page-dining' => array(
                'slug' => 'dining',
                'default_title' => 'Dining',
                'shortcode' => '[gas_dining]',
                'default_menu_order' => 22,
                'parent_slug' => 'about',
                'template' => ''
            ),
            'page-properties' => array(
                'slug' => 'properties',
                'default_title' => 'Our Properties',
                'shortcode' => '[gas_properties]',
                'default_menu_order' => 40,
                'parent_slug' => null,
                'template' => ''
            ),
            'page-offers' => array(
                'slug' => 'special-offers',
                'default_title' => 'Special Offers',
                'shortcode' => '[gas_offers]',
                'default_menu_order' => 50,
                'parent_slug' => null,
                'template' => ''
            ),
            'page-blog' => array(
                'slug' => 'blog',
                'default_title' => 'Blog',
                'shortcode' => '[gas_blog]',
                'default_menu_order' => 70,
                'parent_slug' => null,
                'template' => ''
            ),
            'page-attractions' => array(
                'slug' => 'attractions',
                'default_title' => 'Things To Do',
                'shortcode' => '[gas_attractions]',
                'default_menu_order' => 60,
                'parent_slug' => null,
                'template' => ''
            ),
            'page-contact' => array(
                'slug' => 'contact',
                'default_title' => 'Contact Us',
                'shortcode' => '[gas_contact]',
                'default_menu_order' => 80,
                'parent_slug' => null,
                'template' => 'template-contact.php'
            ),
        );
        
        // Get menu
        $menu_id = $this->get_primary_menu_id();
        
        foreach ($pages_config as $section_key => $config) {
            $section_data = $website[$section_key] ?? array();
            
            // Check if enabled - treat missing 'enabled' as "don't touch" (leave menu as-is)
            $has_enabled_field = isset($section_data['enabled']);
            $is_enabled = $has_enabled_field && 
                         ($section_data['enabled'] === true || 
                          $section_data['enabled'] === 'true' || 
                          $section_data['enabled'] === '1' ||
                          $section_data['enabled'] === 'on');
            $is_explicitly_disabled = $has_enabled_field && !$is_enabled;
            
            // Use menu-title for WordPress page/menu, fall back to default
            // Don't use 'title' as that's now used for page hero display
            $page_title = $section_data['menu-title'] ?? $config['default_title'];
            
            // Get menu order from API or use default
            $menu_order = isset($section_data['menu-order']) ? intval($section_data['menu-order']) * 10 : $config['default_menu_order'];
            
            // Get parent slug for sub-menu items
            $parent_slug = $config['parent_slug'] ?? null;
            
            error_log("GAS Booking: Processing {$section_key} - enabled: " . ($is_enabled ? 'yes' : ($is_explicitly_disabled ? 'no' : 'not set')) . ", title: {$page_title}, menu_order: {$menu_order}, parent: " . ($parent_slug ?: 'none'));
            
            // Only sync if enabled field is explicitly set
            // This prevents removing pages that weren't configured in GAS Admin yet
            if ($has_enabled_field) {
                $this->sync_single_page($config['slug'], $page_title, $config['shortcode'], $is_enabled, $menu_id, $menu_order, $parent_slug, $config['template'] ?? '');
            } else {
                error_log("GAS Booking: Skipping {$section_key} - no enabled field set, leaving as-is");
            }
        }
    }
    
    /**
     * Sync pages from local WordPress options (plugin settings)
     */
    private function do_page_sync_from_local_options() {
        $pages_config = array(
            'about' => array(
                'option_enabled' => 'gas_page_about_enabled',
                'option_title' => 'gas_about_title',
                'default_title' => 'About Us',
                'slug' => 'about',
                'shortcode' => '[gas_about]',
                'menu_order' => 20
            ),
            'gallery' => array(
                'option_enabled' => 'gas_page_gallery_enabled',
                'option_title' => 'gas_gallery_title',
                'default_title' => 'Gallery',
                'slug' => 'gallery',
                'shortcode' => '[gas_gallery]',
                'menu_order' => 25
            ),
            'dining' => array(
                'option_enabled' => 'gas_page_dining_enabled',
                'option_title' => 'gas_dining_title',
                'default_title' => 'Dining',
                'slug' => 'dining',
                'shortcode' => '[gas_dining]',
                'menu_order' => 30
            ),
            'offers' => array(
                'option_enabled' => 'gas_page_offers_enabled',
                'option_title' => 'gas_offers_title',
                'default_title' => 'Special Offers',
                'slug' => 'special-offers',
                'shortcode' => '[gas_offers]',
                'menu_order' => 35
            ),
            'properties' => array(
                'option_enabled' => 'gas_page_properties_enabled',
                'option_title' => 'gas_properties_title',
                'default_title' => 'Our Properties',
                'slug' => 'properties',
                'shortcode' => '[gas_properties]',
                'menu_order' => 40
            ),
            'contact' => array(
                'option_enabled' => 'gas_page_contact_enabled',
                'option_title' => 'gas_contact_title',
                'default_title' => 'Contact Us',
                'slug' => 'contact',
                'shortcode' => '[gas_contact]',
                'menu_order' => 80
            ),
            'terms' => array(
                'option_enabled' => 'gas_page_terms_enabled',
                'option_title' => 'gas_terms_title',
                'default_title' => 'Terms & Conditions',
                'slug' => 'terms',
                'shortcode' => '[gas_terms]',
                'menu_order' => 90
            ),
            'privacy' => array(
                'option_enabled' => 'gas_page_privacy_enabled',
                'option_title' => 'gas_privacy_title',
                'default_title' => 'Privacy Policy',
                'slug' => 'privacy',
                'shortcode' => '[gas_privacy]',
                'menu_order' => 95
            ),
        );
        
        $menu_id = $this->get_primary_menu_id();
        
        foreach ($pages_config as $key => $config) {
            $is_enabled = get_option($config['option_enabled'], '') === '1';
            $page_title = get_option($config['option_title'], $config['default_title']);
            
            $this->sync_single_page($config['slug'], $page_title, $config['shortcode'], $is_enabled, $menu_id, $config['menu_order']);
        }
    }
    
    /**
     * Get primary menu ID
     */
    private function get_primary_menu_id() {
        $menu_id = 0;
        $locations = get_nav_menu_locations();
        
        // Try common location names
        $location_names = array('primary', 'primary-menu', 'main-menu', 'main', 'header-menu', 'header');
        foreach ($location_names as $loc) {
            if (isset($locations[$loc]) && $locations[$loc] > 0) {
                $menu_id = $locations[$loc];
                break;
            }
        }
        
        // Fallback to menu by name
        if (!$menu_id) {
            $menu = wp_get_nav_menu_object('Primary Menu');
            if ($menu) {
                $menu_id = $menu->term_id;
            }
        }
        
        return $menu_id;
    }
    
    /**
     * Sync a single page - create/update and manage menu
     */
    private function sync_single_page($slug, $title, $shortcode, $is_enabled, $menu_id, $menu_order, $parent_slug = null, $template = '') {
        // Find existing page
        $existing_page = get_page_by_path($slug);
        if (!$existing_page) {
            // Try alternative slugs
            $alt_slugs = array(
                str_replace('-', '', $slug),
                str_replace('-', ' ', $slug),
            );
            foreach ($alt_slugs as $alt) {
                $existing_page = get_page_by_path($alt);
                if ($existing_page) break;
            }
        }
        
        // Also try finding by title
        if (!$existing_page) {
            $pages = get_posts(array(
                'post_type' => 'page',
                'title' => $title,
                'post_status' => 'any',
                'numberposts' => 1
            ));
            if (!empty($pages)) {
                $existing_page = $pages[0];
            }
        }
        
        if ($is_enabled) {
            // Create page if doesn't exist
            if (!$existing_page) {
                $page_id = wp_insert_post(array(
                    'post_title' => $title,
                    'post_name' => $slug,
                    'post_content' => $shortcode,
                    'post_status' => 'publish',
                    'post_type' => 'page',
                    'comment_status' => 'closed',
                ));
                if ($page_id && !is_wp_error($page_id)) {
                    $existing_page = get_post($page_id);
                    if (!empty($template)) {
                        update_post_meta($page_id, '_wp_page_template', $template);
                    }
                    error_log("GAS Booking: Created page '{$title}' with ID {$page_id}" . ($template ? " (template: {$template})" : ''));
                }
            } else {
                // Ensure page is published
                if ($existing_page->post_status !== 'publish') {
                    wp_update_post(array(
                        'ID' => $existing_page->ID,
                        'post_status' => 'publish'
                    ));
                }
                // Ensure template is assigned if not already set
                if (!empty($template)) {
                    $current_template = get_post_meta($existing_page->ID, '_wp_page_template', true);
                    if (empty($current_template) || $current_template === 'default') {
                        update_post_meta($existing_page->ID, '_wp_page_template', $template);
                        error_log("GAS Booking: Assigned template '{$template}' to existing page '{$title}'");
                    }
                }
            }
            
            // Add to menu
            if ($menu_id && $existing_page) {
                $this->add_page_to_menu($existing_page, $menu_id, $title, $menu_order, $parent_slug);
            }
        } else {
            // Remove from menu when disabled
            if ($menu_id && $existing_page) {
                $this->remove_page_from_menu($existing_page, $menu_id);
            }
        }
    }
    
    /**
     * Add page to menu if not already there
     */
    private function add_page_to_menu($page, $menu_id, $title, $menu_order, $parent_slug = null) {
        $menu_items = wp_get_nav_menu_items($menu_id);
        $in_menu = false;
        $existing_menu_item_id = 0;
        $parent_menu_item_id = 0;
        
        if ($menu_items) {
            foreach ($menu_items as $item) {
                // Check if this page is already in menu
                if ($item->object_id == $page->ID) {
                    $in_menu = true;
                    $existing_menu_item_id = $item->ID;
                }
                
                // Find parent menu item if we need to make this a sub-item
                if ($parent_slug) {
                    $parent_page = get_page_by_path($parent_slug);
                    if ($parent_page && $item->object_id == $parent_page->ID) {
                        $parent_menu_item_id = $item->ID;
                    }
                }
            }
        }
        
        if (!$in_menu) {
            $menu_item_data = array(
                'menu-item-title' => $title,
                'menu-item-object' => 'page',
                'menu-item-object-id' => $page->ID,
                'menu-item-type' => 'post_type',
                'menu-item-status' => 'publish',
                'menu-item-position' => $menu_order,
            );
            
            // Set parent if this is a sub-menu item
            if ($parent_menu_item_id > 0) {
                $menu_item_data['menu-item-parent-id'] = $parent_menu_item_id;
            }
            
            $result = wp_update_nav_menu_item($menu_id, 0, $menu_item_data);
            error_log("GAS Booking: Added '{$title}' to menu" . ($parent_menu_item_id ? " as sub-item of parent {$parent_menu_item_id}" : "") . ". Result: " . (is_wp_error($result) ? $result->get_error_message() : $result));
        } else if ($parent_slug && $parent_menu_item_id > 0 && $existing_menu_item_id > 0) {
            // Update existing menu item to be a sub-item if it should be
            $current_item = wp_setup_nav_menu_item(get_post($existing_menu_item_id));
            if ($current_item && $current_item->menu_item_parent != $parent_menu_item_id) {
                wp_update_nav_menu_item($menu_id, $existing_menu_item_id, array(
                    'menu-item-title' => $title,
                    'menu-item-object' => 'page',
                    'menu-item-object-id' => $page->ID,
                    'menu-item-type' => 'post_type',
                    'menu-item-status' => 'publish',
                    'menu-item-position' => $menu_order,
                    'menu-item-parent-id' => $parent_menu_item_id,
                ));
                error_log("GAS Booking: Updated '{$title}' to be sub-item of parent {$parent_menu_item_id}");
            }
        }
    }
    
    /**
     * Remove page from menu
     */
    private function remove_page_from_menu($page, $menu_id) {
        $menu_items = wp_get_nav_menu_items($menu_id);
        if ($menu_items) {
            foreach ($menu_items as $item) {
                if ($item->object_id == $page->ID) {
                    wp_delete_post($item->ID, true);
                    error_log("GAS Booking: Removed page ID {$page->ID} from menu");
                    break;
                }
            }
        }
    }
    
    public function add_admin_menu() {
        add_options_page(
            'GAS Booking Settings',
            'GAS Booking',
            'manage_options',
            'gas-booking',
            array($this, 'settings_page')
        );
    }
    
    /**
     * Register Customizer settings for booking widget fonts
     * These are used when NOT using a GAS theme
     */
    public function register_customizer_settings($wp_customize) {
        // Only show if not using a GAS theme
        $current_theme = wp_get_theme();
        $is_gas_theme = strpos(strtolower($current_theme->get('Name')), 'developer') !== false ||
                        strpos(strtolower($current_theme->get('Name')), 'gas') !== false;
        
        // Add section
        $wp_customize->add_section('gas_booking_fonts', array(
            'title' => __('GAS Booking Widget', 'gas-booking'),
            'description' => $is_gas_theme 
                ? __('Font settings are controlled by GAS Admin when using a GAS theme.', 'gas-booking')
                : __('Customize the fonts used in the booking widget.', 'gas-booking'),
            'priority' => 150,
        ));
        
        // Font choices
        $font_choices = array(
            'inter' => 'Inter (Modern)',
            'playfair' => 'Playfair Display (Elegant)',
            'montserrat' => 'Montserrat (Clean)',
            'lora' => 'Lora (Classic)',
            'poppins' => 'Poppins (Geometric)',
            'merriweather' => 'Merriweather (Traditional)',
            'raleway' => 'Raleway (Thin)',
            'oswald' => 'Oswald (Bold)',
            'roboto' => 'Roboto (Neutral)',
            'opensans' => 'Open Sans (Friendly)',
            'lato' => 'Lato (Warm)',
            'sourcesans' => 'Source Sans Pro (Professional)',
            'nunito' => 'Nunito (Rounded)',
        );
        
        // Heading Font setting
        $wp_customize->add_setting('gas_booking_heading_font', array(
            'default' => 'inter',
            'transport' => 'refresh',
            'sanitize_callback' => 'sanitize_text_field',
        ));
        
        $wp_customize->add_control('gas_booking_heading_font', array(
            'label' => __('Heading Font', 'gas-booking'),
            'description' => $is_gas_theme 
                ? __('Controlled by GAS Admin → Styles & Fonts', 'gas-booking')
                : __('Font for headings and titles', 'gas-booking'),
            'section' => 'gas_booking_fonts',
            'type' => 'select',
            'choices' => $font_choices,
            'input_attrs' => $is_gas_theme ? array('disabled' => 'disabled') : array(),
        ));
        
        // Body Font setting
        $wp_customize->add_setting('gas_booking_body_font', array(
            'default' => 'inter',
            'transport' => 'refresh',
            'sanitize_callback' => 'sanitize_text_field',
        ));
        
        $wp_customize->add_control('gas_booking_body_font', array(
            'label' => __('Body Font', 'gas-booking'),
            'description' => $is_gas_theme 
                ? __('Controlled by GAS Admin → Styles & Fonts', 'gas-booking')
                : __('Font for body text and paragraphs', 'gas-booking'),
            'section' => 'gas_booking_fonts',
            'type' => 'select',
            'choices' => $font_choices,
            'input_attrs' => $is_gas_theme ? array('disabled' => 'disabled') : array(),
        ));
        
        // Button Background Color
        $wp_customize->add_setting('gas_booking_btn_bg', array(
            'default' => '#2563eb',
            'transport' => 'refresh',
            'sanitize_callback' => 'sanitize_hex_color',
        ));
        
        $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'gas_booking_btn_bg', array(
            'label' => __('Button Background', 'gas-booking'),
            'description' => $is_gas_theme 
                ? __('Controlled by GAS Admin → Styles & Fonts', 'gas-booking')
                : __('Primary button background color', 'gas-booking'),
            'section' => 'gas_booking_fonts',
        )));
        
        // Button Text Color
        $wp_customize->add_setting('gas_booking_btn_text', array(
            'default' => '#ffffff',
            'transport' => 'refresh',
            'sanitize_callback' => 'sanitize_hex_color',
        ));
        
        $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'gas_booking_btn_text', array(
            'label' => __('Button Text', 'gas-booking'),
            'description' => $is_gas_theme 
                ? __('Controlled by GAS Admin → Styles & Fonts', 'gas-booking')
                : __('Primary button text color', 'gas-booking'),
            'section' => 'gas_booking_fonts',
        )));
        
        // Button Radius
        $wp_customize->add_setting('gas_booking_btn_radius', array(
            'default' => '8',
            'transport' => 'refresh',
            'sanitize_callback' => 'absint',
        ));
        
        $wp_customize->add_control('gas_booking_btn_radius', array(
            'label' => __('Button Radius (px)', 'gas-booking'),
            'description' => $is_gas_theme 
                ? __('Controlled by GAS Admin → Styles & Fonts', 'gas-booking')
                : __('Border radius for buttons', 'gas-booking'),
            'section' => 'gas_booking_fonts',
            'type' => 'number',
            'input_attrs' => array(
                'min' => 0,
                'max' => 50,
                'step' => 1,
            ),
        ));
    }
    
    public function register_settings() {
        // General settings group
        register_setting('gas_booking_general', 'gas_api_url');
        register_setting('gas_booking_general', 'gas_client_id');
        register_setting('gas_booking_general', 'gas_license_key', array($this, 'validate_license_key'));
        register_setting('gas_booking_general', 'gas_license_valid');
        register_setting('gas_booking_general', 'gas_license_account_name');
        register_setting('gas_booking_general', 'gas_room_url_base');
        register_setting('gas_booking_general', 'gas_search_results_url');
        register_setting('gas_booking_general', 'gas_checkout_url');
        register_setting('gas_booking_general', 'gas_offers_url');
        register_setting('gas_booking_general', 'gas_currency_symbol');
        register_setting('gas_booking_general', 'gas_pricing_tier');
        register_setting('gas_booking_general', 'gas_button_color');
        register_setting('gas_booking_general', 'gas_view_button_text');
        register_setting('gas_booking_general', 'gas_max_guests_dropdown');
        register_setting('gas_booking_general', 'gas_center_search');
        register_setting('gas_booking_general', 'gas_search_max_width');
        
        // Layout settings
        register_setting('gas_booking_general', 'gas_room_layout'); // auto, grid, row
        register_setting('gas_booking_general', 'gas_show_amenity_filter'); // yes/no
        register_setting('gas_booking_general', 'gas_amenities_display_count'); // number
        register_setting('gas_booking_general', 'gas_show_location_filter'); // yes/no
        register_setting('gas_booking_general', 'gas_room_button_destination'); // room or booknow
        
        // Pages settings group - Enable toggles
        register_setting('gas_booking_pages', 'gas_page_about_enabled');
        register_setting('gas_booking_pages', 'gas_page_contact_enabled');
        register_setting('gas_booking_pages', 'gas_page_gallery_enabled');
        register_setting('gas_booking_pages', 'gas_page_dining_enabled');
        register_setting('gas_booking_pages', 'gas_page_offers_enabled');
        register_setting('gas_booking_pages', 'gas_page_properties_enabled');
        register_setting('gas_booking_pages', 'gas_page_terms_enabled');
        register_setting('gas_booking_pages', 'gas_page_privacy_enabled');
        
        // Pages settings group - Content
        register_setting('gas_booking_pages', 'gas_about_title');
        register_setting('gas_booking_pages', 'gas_about_content');
        register_setting('gas_booking_pages', 'gas_contact_title');
        register_setting('gas_booking_pages', 'gas_contact_content');
        register_setting('gas_booking_pages', 'gas_contact_address');
        register_setting('gas_booking_pages', 'gas_contact_phone');
        register_setting('gas_booking_pages', 'gas_contact_email');
        register_setting('gas_booking_pages', 'gas_contact_map_embed');
        register_setting('gas_booking_pages', 'gas_gallery_title');
        register_setting('gas_booking_pages', 'gas_gallery_content');
        register_setting('gas_booking_pages', 'gas_dining_title');
        register_setting('gas_booking_pages', 'gas_dining_content');
        register_setting('gas_booking_pages', 'gas_offers_title');
        register_setting('gas_booking_pages', 'gas_offers_content');
        register_setting('gas_booking_pages', 'gas_properties_title');
        register_setting('gas_booking_pages', 'gas_properties_content');
        register_setting('gas_booking_pages', 'gas_terms_title');
        register_setting('gas_booking_pages', 'gas_terms_content');
        register_setting('gas_booking_pages', 'gas_privacy_title');
        register_setting('gas_booking_pages', 'gas_privacy_content');
        
        // Footer settings group
        register_setting('gas_booking_footer', 'gas_footer_business_name');
        register_setting('gas_booking_footer', 'gas_footer_tagline');
        register_setting('gas_booking_footer', 'gas_footer_address');
        register_setting('gas_booking_footer', 'gas_footer_phone');
        register_setting('gas_booking_footer', 'gas_footer_email');
        register_setting('gas_booking_footer', 'gas_footer_facebook');
        register_setting('gas_booking_footer', 'gas_footer_instagram');
        register_setting('gas_booking_footer', 'gas_footer_twitter');
        register_setting('gas_booking_footer', 'gas_footer_tripadvisor');
        register_setting('gas_booking_footer', 'gas_footer_youtube');
        register_setting('gas_booking_footer', 'gas_footer_whatsapp');
        register_setting('gas_booking_footer', 'gas_footer_copyright');
        
        // CSS settings group
        register_setting('gas_booking_css', 'gas_css_search_widget');
        register_setting('gas_booking_css', 'gas_css_rooms_grid');
        register_setting('gas_booking_css', 'gas_css_room_cards');
        register_setting('gas_booking_css', 'gas_css_room_detail');
        register_setting('gas_booking_css', 'gas_css_booking_form');
        register_setting('gas_booking_css', 'gas_css_calendar');
        register_setting('gas_booking_css', 'gas_css_map');
        register_setting('gas_booking_css', 'gas_css_buttons');
        register_setting('gas_booking_css', 'gas_css_global');
        
        // SEO settings group
        register_setting('gas_booking_seo', 'gas_seo_enabled');
        register_setting('gas_booking_seo', 'gas_seo_meta_title');
        register_setting('gas_booking_seo', 'gas_seo_meta_description');
        register_setting('gas_booking_seo', 'gas_seo_og_image');
        register_setting('gas_booking_seo', 'gas_seo_include_schema');
        register_setting('gas_booking_seo', 'gas_seo_include_faqs');
        register_setting('gas_booking_seo', 'gas_google_analytics_id');
        register_setting('gas_booking_seo', 'gas_google_tag_manager_id');
        register_setting('gas_booking_seo', 'gas_facebook_pixel_id');
        
        // Per-page SEO settings
        register_setting('gas_booking_seo', 'gas_seo_hero_meta_title');
        register_setting('gas_booking_seo', 'gas_seo_hero_meta_description');
        register_setting('gas_booking_seo', 'gas_seo_page_rooms_meta_title');
        register_setting('gas_booking_seo', 'gas_seo_page_rooms_meta_description');
        register_setting('gas_booking_seo', 'gas_seo_page_about_meta_title');
        register_setting('gas_booking_seo', 'gas_seo_page_about_meta_description');
        register_setting('gas_booking_seo', 'gas_seo_page_contact_meta_title');
        register_setting('gas_booking_seo', 'gas_seo_page_contact_meta_description');
        register_setting('gas_booking_seo', 'gas_seo_page_gallery_meta_title');
        register_setting('gas_booking_seo', 'gas_seo_page_gallery_meta_description');
        register_setting('gas_booking_seo', 'gas_seo_page_blog_meta_title');
        register_setting('gas_booking_seo', 'gas_seo_page_blog_meta_description');
        register_setting('gas_booking_seo', 'gas_seo_page_attractions_meta_title');
        register_setting('gas_booking_seo', 'gas_seo_page_attractions_meta_description');
        register_setting('gas_booking_seo', 'gas_seo_page_dining_meta_title');
        register_setting('gas_booking_seo', 'gas_seo_page_dining_meta_description');
        register_setting('gas_booking_seo', 'gas_seo_page_terms_meta_title');
        register_setting('gas_booking_seo', 'gas_seo_page_terms_meta_description');
        register_setting('gas_booking_seo', 'gas_seo_page_privacy_meta_title');
        register_setting('gas_booking_seo', 'gas_seo_page_privacy_meta_description');
    }
    
    /**
     * Get current language for multilingual content
     * Priority: 1) URL parameter (?lang=xx) 2) Cookie 3) Browser Accept-Language 4) Default (en)
     */
    private function get_current_language() {
        // Check URL parameter first
        if (isset($_GET['lang']) && preg_match('/^[a-z]{2}$/', $_GET['lang'])) {
            $lang = sanitize_text_field($_GET['lang']);
            // Set cookie for subsequent requests (silently fail if headers sent)
            @setcookie('gas_lang', $lang, time() + (86400 * 30), '/');
            return $lang;
        }
        
        // Check cookie
        if (isset($_COOKIE['gas_lang']) && preg_match('/^[a-z]{2}$/', $_COOKIE['gas_lang'])) {
            return sanitize_text_field($_COOKIE['gas_lang']);
        }
        
        // Check WordPress locale
        $wp_lang = substr(get_locale(), 0, 2);
        if ($wp_lang && $wp_lang !== 'en' && in_array($wp_lang, array('en', 'fr', 'es', 'de', 'nl', 'it', 'pt', 'ru', 'zh', 'ja'))) {
            return $wp_lang;
        }

        // Check browser language
        if (isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])) {
            $browser_lang = substr($_SERVER['HTTP_ACCEPT_LANGUAGE'], 0, 2);
            $supported = array('en', 'fr', 'es', 'de', 'nl', 'it', 'pt', 'ru', 'zh', 'ja');
            if (in_array($browser_lang, $supported)) {
                return $browser_lang;
            }
        }
        
        // Default to English
        return 'en';
    }
    
    /**
     * Get custom search widget labels from site config
     * Returns language-specific labels set in GAS Admin Web Builder
     */
    private function get_custom_search_labels() {
        $lang = $this->get_current_language();
        $cache_key = 'gas_search_labels_' . $lang . '_v1';
        
        // Check cache first (1 hour)
        $cached = get_transient($cache_key);
        if ($cached !== false) {
            return $cached;
        }
        
        $client_id = get_option('gas_client_id');
        if (!$client_id) {
            return array();
        }
        
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $response = wp_remote_get("{$api_url}/api/public/client/{$client_id}/site-config", array(
            'timeout' => 10,
            'sslverify' => false
        ));
        
        if (is_wp_error($response)) {
            return array();
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data || !isset($data['success']) || !$data['success']) {
            return array();
        }
        
        // Get hero settings which contain search widget labels
        $hero = $data['config']['website']['hero'] ?? array();
        
        // Extract language-specific labels (with fallback to English then default)
        $labels = array(
            'checkin_label' => $hero["search-checkin-label-{$lang}"] ?? $hero['search-checkin-label-en'] ?? '',
            'checkout_label' => $hero["search-checkout-label-{$lang}"] ?? $hero['search-checkout-label-en'] ?? '',
            'guests_label' => $hero["search-guests-label-{$lang}"] ?? $hero['search-guests-label-en'] ?? '',
            'button_text' => $hero["search-btn-label-{$lang}"] ?? $hero['search-btn-label-en'] ?? '',
            'date_placeholder' => $hero["search-date-placeholder-{$lang}"] ?? $hero['search-date-placeholder-en'] ?? '',
            'guest_singular' => $hero["search-guest-singular-{$lang}"] ?? $hero['search-guest-singular-en'] ?? '',
            'badge1' => $hero["search-badge1-{$lang}"] ?? $hero['search-badge1-en'] ?? '',
            'badge2' => $hero["search-badge2-{$lang}"] ?? $hero['search-badge2-en'] ?? '',
            'badge3' => $hero["search-badge3-{$lang}"] ?? $hero['search-badge3-en'] ?? '',
            'badges_enabled' => $hero['search-badges-enabled'] ?? true
        );
        
        // Filter out empty values
        $labels = array_filter($labels, function($v) { return $v !== ''; });
        
        // Cache for 1 hour
        set_transient($cache_key, $labels, HOUR_IN_SECONDS);
        
        return $labels;
    }
    
    /**
     * Get UI translations for current language
     * Fetches from GAS server and caches for performance
     */
    private function get_translations() {
        $lang = $this->get_current_language();
        $cache_version = '177'; // Increment this to bust cache
        $cache_key = 'gas_ui_translations_' . $lang . '_v' . $cache_version;
        
        // Check cache first (1 hour)
        $cached = get_transient($cache_key);
        if ($cached !== false) {
            return $cached;
        }
        
        // Fetch from GAS server
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $response = wp_remote_get("{$api_url}/api/public/translations/{$lang}", array(
            'timeout' => 10,
            'sslverify' => false
        ));
        
        if (is_wp_error($response)) {
            return $this->get_default_translations();
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (!$data || !isset($data['success']) || !$data['success']) {
            return $this->get_default_translations();
        }
        
        $translations = $data['translations']['strings'] ?? $this->get_default_translations();
        
        // Cache for 1 hour
        set_transient($cache_key, $translations, HOUR_IN_SECONDS);
        
        return $translations;
    }
    
    /**
     * Get a specific translation string
     */
    private function t($category, $key, $default = '') {
        static $translations = null;
        if ($translations === null) {
            $translations = $this->get_translations();
        }
        return $translations[$category][$key] ?? $default;
    }
    
    /**
     * Default English translations fallback
     */
    private function get_default_translations() {
        return array(
            'common' => array(
                'loading' => 'Loading...',
                'search' => 'Search',
                'filter' => 'Filter',
                'all' => 'All',
                'from' => 'From',
                'per' => 'per',
                'total' => 'Total Room Charge',
                'available' => 'Available',
                'unavailable' => 'Unavailable'
            ),
            'booking' => array(
                'book_now' => 'Book Now',
                'view_book' => 'View & Book',
                'check_in' => 'Check-in',
                'check_out' => 'Check-out',
                'select_dates' => 'Select Dates',
                'nights' => 'nights',
                'night' => 'night',
                'guests' => 'Guests',
                'guest' => 'Guest',
                'price_per_night' => 'per night'
            ),
            'property' => array(
                'bedrooms' => 'bedrooms',
                'bedroom' => 'bedroom',
                'bathrooms' => 'bathrooms',
                'bathroom' => 'bathroom'
            ),
            'filters' => array(
                'sort_by' => 'Sort By',
                'default' => 'Default',
                'price_low' => 'Price: Low to High',
                'price_high' => 'Price: High to Low',
                'location' => 'Location',
                'all_locations' => 'All Locations',
                'property' => 'Property',
                'all_properties' => 'All Properties',
                'amenities' => 'Amenities',
                'select_amenities' => 'Select Amenities',
                'load_more' => 'Load More Properties',
                'more' => 'more',
                'no_results' => 'No rooms match the selected filters.',
                'verify_availability' => 'Check Availability'
            )
        );
    }
    
    /**
     * Extract text from language object (e.g., {en: 'text', fr: 'texte'}) or return string as-is
     * Uses current language with fallback to English
     */
    private function extract_display_text($value) {
        if (empty($value)) return '';
        if (is_string($value)) return $value;
        
        $lang = $this->get_current_language();
        $lang_upper = strtoupper($lang);
        
        if (is_array($value)) {
            // Try requested language first (lowercase then uppercase)
            if (isset($value[$lang]) && !empty($value[$lang])) {
                return $value[$lang];
            }
            if (isset($value[$lang_upper]) && !empty($value[$lang_upper])) {
                return $value[$lang_upper];
            }
            // Fall back to English (lowercase then uppercase)
            if (isset($value['en']) && !empty($value['en'])) {
                return $value['en'];
            }
            if (isset($value['EN']) && !empty($value['EN'])) {
                return $value['EN'];
            }
            // Fall back to any available
            return reset($value) ?? '';
        }
        if (is_object($value)) {
            $value = (array)$value;
            if (isset($value[$lang]) && !empty($value[$lang])) {
                return $value[$lang];
            }
            if (isset($value[$lang_upper]) && !empty($value[$lang_upper])) {
                return $value[$lang_upper];
            }
            if (isset($value['en']) && !empty($value['en'])) {
                return $value['en'];
            }
            if (isset($value['EN']) && !empty($value['EN'])) {
                return $value['EN'];
            }
            return reset($value) ?? '';
        }
        return (string)$value;
    }
    
    /**
     * Validate license key on save
     * If valid, auto-populates gas_client_id, room_ids and display_settings
     */
    public function validate_license_key($license_key) {
        $license_key = sanitize_text_field($license_key);
        
        if (empty($license_key)) {
            update_option('gas_license_valid', '0');
            update_option('gas_license_account_name', '');
            return '';
        }
        
        // Call GAS API to validate license
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $response = wp_remote_post("{$api_url}/api/plugin/validate-license", array(
            'timeout' => 10,
            'sslverify' => false,
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode(array('license_key' => $license_key))
        ));
        
        if (is_wp_error($response)) {
            update_option('gas_license_valid', '0');
            update_option('gas_license_account_name', '');
            return $license_key;
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (!empty($body['success']) && !empty($body['account_id'])) {
            // Valid license - auto-configure
            update_option('gas_license_valid', '1');
            update_option('gas_license_account_name', $body['account_name'] ?? '');
            update_option('gas_client_id', $body['account_id']);
            
            // Store room_ids if provided
            if (!empty($body['room_ids'])) {
                update_option('gas_license_room_ids', $body['room_ids']);
            }
            
            // Store display_settings if provided
            if (!empty($body['display_settings'])) {
                update_option('gas_display_settings', $body['display_settings']);
            }
            
            return $license_key;
        } else {
            update_option('gas_license_valid', '0');
            update_option('gas_license_account_name', '');
            return $license_key;
        }
    }
    
    public function settings_page() {
        $active_tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'general';
        ?>
        <div class="wrap">
            <h1>🏨 GAS Booking Settings</h1>
            
            <nav class="nav-tab-wrapper">
                <a href="?page=gas-booking&tab=general" class="nav-tab <?php echo $active_tab === 'general' ? 'nav-tab-active' : ''; ?>">⚙️ General</a>
                <a href="?page=gas-booking&tab=pages" class="nav-tab <?php echo $active_tab === 'pages' ? 'nav-tab-active' : ''; ?>">📄 Pages</a>
                <a href="?page=gas-booking&tab=footer" class="nav-tab <?php echo $active_tab === 'footer' ? 'nav-tab-active' : ''; ?>">🦶 Footer</a>
                <a href="?page=gas-booking&tab=builder" class="nav-tab <?php echo $active_tab === 'builder' ? 'nav-tab-active' : ''; ?>">🔧 Shortcode Builder</a>
                <a href="?page=gas-booking&tab=shortcodes" class="nav-tab <?php echo $active_tab === 'shortcodes' ? 'nav-tab-active' : ''; ?>">📋 Reference</a>
                <a href="?page=gas-booking&tab=css" class="nav-tab <?php echo $active_tab === 'css' ? 'nav-tab-active' : ''; ?>">🎨 Custom CSS</a>
                <a href="?page=gas-booking&tab=ai" class="nav-tab <?php echo $active_tab === 'ai' ? 'nav-tab-active' : ''; ?>">🤖 AI Integration</a>
                <a href="?page=gas-booking&tab=seo" class="nav-tab <?php echo $active_tab === 'seo' ? 'nav-tab-active' : ''; ?>">🔍 SEO</a>
            </nav>
            
            <div class="tab-content" style="margin-top: 20px;">
            
            <?php if ($active_tab === 'general') : ?>
                <!-- GENERAL SETTINGS TAB -->
                <form method="post" action="options.php">
                    <?php settings_fields('gas_booking_general'); ?>
                    <table class="form-table">
                        <tr>
                            <th>GAS API URL</th>
                            <td>
                                <input type="url" name="gas_api_url" value="<?php echo esc_attr(get_option('gas_api_url', 'https://admin.gas.travel')); ?>" class="regular-text" />
                                <p class="description">Your GAS server URL (no trailing slash)</p>
                            </td>
                        </tr>
                        
                        <?php 
                        $license_key = get_option('gas_license_key', '');
                        $license_valid = get_option('gas_license_valid', '0');
                        $license_account_name = get_option('gas_license_account_name', '');
                        $client_id = get_option('gas_client_id', '');
                        // Only hide license field on actual multisite (*.gas.travel but NOT *.custom.gas.travel)
                        $site_url = get_site_url();
                        $is_gas_multisite = strpos($site_url, 'gas.travel') !== false && strpos($site_url, 'custom.gas.travel') === false;
                        // Check if license is effectively valid (has client_id set from validation)
                        $is_effectively_valid = !empty($license_key) && !empty($client_id);
                        ?>
                        
                        <?php if (!$is_gas_multisite) : ?>
                        <!-- License Key Section for standalone installs -->
                        <tr>
                            <th>🔑 License Key</th>
                            <td>
                                <input type="text" name="gas_license_key" value="<?php echo esc_attr($license_key); ?>" class="regular-text" placeholder="GAS-XXXXXXXXXXXX" style="font-family: monospace;" />
                                <?php if ($is_effectively_valid) : ?>
                                    <span style="color: #10b981; margin-left: 10px;">✓ <?php echo $license_account_name ? 'Licensed to: <strong>' . esc_html($license_account_name) . '</strong>' : 'Valid license'; ?></span>
                                <?php elseif ($license_key) : ?>
                                    <span style="color: #ef4444; margin-left: 10px;">✗ Invalid license key</span>
                                <?php endif; ?>
                                <p class="description">Enter your GAS license key. This will automatically configure your account.</p>
                            </td>
                        </tr>
                        <?php endif; ?>
                        
                        <tr>
                            <th>Client Account ID</th>
                            <td>
                                <?php if ($license_valid === '1' && !$is_gas_multisite) : ?>
                                    <input type="number" name="gas_client_id" value="<?php echo esc_attr($client_id); ?>" class="small-text" readonly style="background: #f1f5f9;" />
                                    <span style="color: #64748b; margin-left: 10px;">Auto-configured from license</span>
                                <?php else : ?>
                                    <input type="number" name="gas_client_id" value="<?php echo esc_attr($client_id); ?>" class="small-text" />
                                    <p class="description"><strong>Required!</strong> Find this in GAS Admin → Clients section</p>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <tr>
                            <th>Room Page URL</th>
                            <td>
                                <input type="text" name="gas_room_url_base" value="<?php echo esc_attr(get_option('gas_room_url_base', '/room/')); ?>" class="regular-text" />
                                <p class="description">URL where [gas_room] shortcode is placed (e.g., /room/)</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Search Results URL</th>
                            <td>
                                <input type="text" name="gas_search_results_url" value="<?php echo esc_attr(get_option('gas_search_results_url', '/book-now/')); ?>" class="regular-text" />
                                <p class="description">URL where [gas_rooms] shortcode is placed (e.g., /book-now/)</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Checkout URL</th>
                            <td>
                                <input type="text" name="gas_checkout_url" value="<?php echo esc_attr(get_option('gas_checkout_url', '/checkout/')); ?>" class="regular-text" />
                                <p class="description">URL where [gas_checkout] shortcode is placed (e.g., /checkout/)</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Offers Page URL</th>
                            <td>
                                <input type="text" name="gas_offers_url" value="<?php echo esc_attr(get_option('gas_offers_url', '/offers/')); ?>" class="regular-text" />
                                <p class="description">URL where [gas_offers] shortcode is placed (e.g., /offers/)</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Currency Symbol</th>
                            <td>
                                <input type="text" name="gas_currency_symbol" value="<?php echo esc_attr(get_option('gas_currency_symbol', '')); ?>" class="small-text" />
                            </td>
                        </tr>
                        <tr>
                            <th>Pricing Tier</th>
                            <td>
                                <select name="gas_pricing_tier">
                                    <?php $current_tier = get_option('gas_pricing_tier', 'standard'); ?>
                                    <option value="standard" <?php selected($current_tier, 'standard'); ?>>💵 Standard</option>
                                    <option value="corporate_1" <?php selected($current_tier, 'corporate_1'); ?>>🏢 Corporate 1</option>
                                    <option value="corporate_2" <?php selected($current_tier, 'corporate_2'); ?>>🏢 Corporate 2</option>
                                    <option value="corporate_3" <?php selected($current_tier, 'corporate_3'); ?>>🏢 Corporate 3</option>
                                    <option value="agent_1" <?php selected($current_tier, 'agent_1'); ?>>✈️ Travel Agent 1</option>
                                    <option value="agent_2" <?php selected($current_tier, 'agent_2'); ?>>✈️ Travel Agent 2</option>
                                    <option value="agent_3" <?php selected($current_tier, 'agent_3'); ?>>✈️ Travel Agent 3</option>
                                </select>
                                <p class="description">Pricing tier for this site. Corporate/Agent tiers use fixed pricing without discount badges.</p>
                            </td>
                        </tr>
                    </table>
                    
                    <h3>🎨 Styling Options</h3>
                    <table class="form-table">
                        <tr>
                            <th>Button Color</th>
                            <td>
                                <input type="color" id="gas_button_color_picker" value="<?php echo esc_attr($this->get_effective_button_color()); ?>" />
                                <input type="text" name="gas_button_color" id="gas_button_color_text" value="<?php echo esc_attr($this->get_effective_button_color()); ?>" class="small-text" style="margin-left: 8px;" />
                                <p class="description">Color for all buttons (Check Availability, Book Now, etc.)</p>
                                <script>
                                document.getElementById('gas_button_color_picker').addEventListener('input', function() {
                                    document.getElementById('gas_button_color_text').value = this.value;
                                });
                                document.getElementById('gas_button_color_text').addEventListener('input', function() {
                                    document.getElementById('gas_button_color_picker').value = this.value;
                                });
                                </script>
                            </td>
                        </tr>
                        <tr>
                            <th>Room Card Button Text</th>
                            <td>
                                <input type="text" name="gas_view_button_text" value="<?php echo esc_attr(get_option('gas_view_button_text', 'View & Book')); ?>" class="regular-text" />
                                <p class="description">Text shown on room card buttons (e.g., "View & Book", "Book Now", "View Details")</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Max Guests in Dropdown</th>
                            <td>
                                <input type="number" name="gas_max_guests_dropdown" value="<?php echo esc_attr(get_option('gas_max_guests_dropdown', '2')); ?>" min="1" max="50" class="small-text" />
                                <p class="description">Maximum number of guests shown in the dropdown selector (default: 10)</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Center Search Bar</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="gas_center_search" value="1" <?php checked(get_option('gas_center_search', '0'), '1'); ?> />
                                    Center the date/guest filter bar on the rooms page
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <th>Search Bar Max Width</th>
                            <td>
                                <input type="number" name="gas_search_max_width" value="<?php echo esc_attr(get_option('gas_search_max_width', '800')); ?>" class="small-text" /> px
                                <p class="description">Maximum width when centered (default: 800px)</p>
                            </td>
                        </tr>
                    </table>
                    
                    <h2 style="margin-top: 30px;">📐 Room Display Layout</h2>
                    <table class="form-table">
                        <tr>
                            <th>Room Layout Style</th>
                            <td>
                                <select name="gas_room_layout">
                                    <option value="auto" <?php selected(get_option('gas_room_layout', 'auto'), 'auto'); ?>>Auto (Row for 1-2 rooms, Grid for 3+)</option>
                                    <option value="grid" <?php selected(get_option('gas_room_layout', 'auto'), 'grid'); ?>>Always Grid (cards)</option>
                                    <option value="row" <?php selected(get_option('gas_room_layout', 'auto'), 'row'); ?>>Always Row (horizontal banners)</option>
                                </select>
                                <p class="description">How rooms are displayed on the Book Now page</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Show Amenity Filter</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="gas_show_amenity_filter" value="1" <?php checked(get_option('gas_show_amenity_filter', '1'), '1'); ?> />
                                    Show amenity dropdown filter in the filter bar
                                </label>
                                <p class="description">Allows guests to filter rooms by amenities (WiFi, Parking, etc.)</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Show Location Filter</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="gas_show_location_filter" value="1" <?php checked(get_option('gas_show_location_filter', '1'), '1'); ?> />
                                    Show location dropdown filter in the filter bar
                                </label>
                                <p class="description">Allows guests to filter rooms by property location (useful for multi-property accounts)</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Amenities to Display</th>
                            <td>
                                <input type="number" name="gas_amenities_display_count" value="<?php echo esc_attr(get_option('gas_amenities_display_count', '6')); ?>" min="1" max="20" class="small-text" />
                                <p class="description">Number of amenity tags shown on room cards in row layout (default: 6)</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Room Button Goes To</th>
                            <td>
                                <select name="gas_room_button_destination">
                                    <option value="room" <?php selected(get_option('gas_room_button_destination', 'room'), 'room'); ?>>Room Detail Page (direct booking)</option>
                                    <option value="booknow" <?php selected(get_option('gas_room_button_destination', 'room'), 'booknow'); ?>>Book Now Page (filtered by room)</option>
                                </select>
                                <p class="description">Where "View & Book" buttons link to. Use "Book Now Page" if you want guests to see the rooms list first.</p>
                            </td>
                        </tr>
                    </table>
                    <?php submit_button(); ?>
                </form>
                
                <hr>
                <h2>🚀 Quick Setup</h2>
                <ol>
                    <li>Enter your <strong>Client Account ID</strong> above (from GAS Admin)</li>
                    <li>Create page "Home" → Add <code>[gas_search]</code></li>
                    <li>Create page "Book Now" → Add <code>[gas_rooms]</code></li>
                    <li>Create page "Room" → Add <code>[gas_room]</code></li>
                    <li>Done! Your booking system is ready.</li>
                </ol>
                
                <hr>
                <h2>🏠 Your Room IDs</h2>
                <p>Use these IDs when you want to display specific rooms (e.g., in the theme's Featured Properties section).</p>
                <?php
                $client_id = get_option('gas_client_id', '');
                if (!empty($client_id)) {
                    $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
                    $response = wp_remote_get("{$api_url}/api/public/client/{$client_id}/rooms", array('timeout' => 15, 'sslverify' => false));
                    
                    if (!is_wp_error($response)) {
                        $body = json_decode(wp_remote_retrieve_body($response), true);
                        if (!empty($body['rooms'])) {
                            echo '<table class="widefat striped" style="max-width: 800px; margin-top: 15px;">
                                <thead>
                                    <tr>
                                        <th style="width: 60px;">ID</th>
                                        <th>Room Name</th>
                                        <th>Property</th>
                                        <th style="width: 100px;">Max Guests</th>
                                        <th style="width: 100px;">Price</th>
                                    </tr>
                                </thead>
                                <tbody>';
                            foreach ($body['rooms'] as $room) {
                                $currency = $room['currency'] ?? '';
                                echo '<tr>
                                    <td><strong style="background: #2563eb; color: white; padding: 2px 8px; border-radius: 4px;">' . esc_html($room['id']) . '</strong></td>
                                    <td>' . esc_html($room['name']) . '</td>
                                    <td>' . esc_html($room['property_name'] ?? 'N/A') . '</td>
                                    <td>' . esc_html($room['max_guests'] ?? '-') . '</td>
                                    <td>' . esc_html($currency . number_format($room['base_price'] ?? 0, 0)) . '</td>
                                </tr>';
                            }
                            echo '</tbody></table>';
                            echo '<p style="margin-top: 10px; color: #666;"><strong>Tip:</strong> To show rooms 1, 3, and 5 on your homepage, use: <code>room_ids="1,3,5"</code></p>';
                        } else {
                            echo '<p style="color: #666;">No rooms found. Make sure you have properties and rooms set up in GAS Admin.</p>';
                        }
                    } else {
                        echo '<p style="color: #dc2626;">Could not fetch rooms. Check your API URL and Client ID.</p>';
                    }
                } else {
                    echo '<p style="color: #666;">Please save your Client Account ID first, then refresh this page to see your rooms.</p>';
                }
                ?>
                
                <hr>
                <h2>🔄 Sync from GAS</h2>
                <p>Pull website settings from GAS Admin to update this site automatically.</p>
                <?php
                // Handle sync request
                if (isset($_POST['gas_sync_from_gas']) && wp_verify_nonce($_POST['gas_sync_nonce'], 'gas_sync_action')) {
                    $client_id = get_option('gas_client_id', '');
                    $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
                    
                    if (!empty($client_id)) {
                        $response = wp_remote_get("{$api_url}/api/public/client/{$client_id}/site-config", array('timeout' => 30, 'sslverify' => false));
                        
                        if (!is_wp_error($response)) {
                            $data = json_decode(wp_remote_retrieve_body($response), true);
                            $synced = array();
                            
                            // Data is inside 'config' wrapper
                            $config = isset($data['config']) ? $data['config'] : $data;
                            
                            if (!empty($config['website'])) {
                                // Sync header settings
                                if (!empty($config['website']['header'])) {
                                    $header = $config['website']['header'];
                                    // Site identity
                                    if (isset($header['site-name']) && !empty($header['site-name'])) { 
                                        update_option('blogname', $header['site-name']); 
                                        $synced[] = 'Site Title'; 
                                    }
                                    if (isset($header['tagline']) && !empty($header['tagline'])) { 
                                        update_option('blogdescription', $header['tagline']); 
                                        $synced[] = 'Tagline'; 
                                    }
                                    // Logo image
                                    if (isset($header['logo-image-url']) && !empty($header['logo-image-url'])) { 
                                        // Set custom logo - WordPress requires attachment ID, so we store URL for now
                                        update_option('gas_custom_logo_url', $header['logo-image-url']); 
                                    }
                                    // Header colors
                                    if (isset($header['bg-color'])) { set_theme_mod('developer_header_bg_color', $header['bg-color']); }
                                    if (isset($header['text-color'])) { set_theme_mod('developer_header_text_color', $header['text-color']); }
                                    if (isset($header['logo-color'])) { set_theme_mod('developer_header_logo_color', $header['logo-color']); }
                                    if (isset($header['cta-bg'])) { set_theme_mod('developer_header_cta_bg', $header['cta-bg']); }
                                    if (isset($header['cta-text'])) { set_theme_mod('developer_header_cta_text', $header['cta-text']); }
                                    if (isset($header['border-color'])) { set_theme_mod('developer_header_border_color', $header['border-color']); }
                                    // Typography
                                    if (isset($header['font'])) { set_theme_mod('developer_header_font', $header['font']); }
                                    if (isset($header['font-size'])) { set_theme_mod('developer_header_font_size', $header['font-size']); }
                                    if (isset($header['font-weight'])) { set_theme_mod('developer_header_font_weight', $header['font-weight']); }
                                    if (isset($header['text-transform'])) { set_theme_mod('developer_header_text_transform', $header['text-transform']); }
                                    // Layout & options
                                    if (isset($header['layout'])) { set_theme_mod('developer_menu_layout', $header['layout']); }
                                    if (isset($header['transparent'])) { set_theme_mod('developer_header_transparent', (bool)$header['transparent']); }
                                    if (isset($header['sticky'])) { set_theme_mod('developer_header_sticky', (bool)$header['sticky']); }
                                    if (isset($header['border'])) { set_theme_mod('developer_header_border', (bool)$header['border']); }
                                    
                                    $synced[] = 'Header';
                                }
                                
                                // Sync hero settings
                                if (!empty($config['website']['hero'])) {
                                    $hero = $config['website']['hero'];
                                    
                                    // Debug: show what we received
                                    if (isset($_GET['debug'])) {
                                        echo '<div style="background:#eff6ff;border:1px solid #3b82f6;padding:10px;margin:10px 0;border-radius:4px;">';
                                        echo '<strong>Hero data received:</strong><pre>' . print_r($hero, true) . '</pre>';
                                        echo '</div>';
                                    }
                                    
                                    // Content
                                    if (isset($hero['headline'])) { set_theme_mod('developer_hero_title', $hero['headline']); }
                                    if (isset($hero['subheadline'])) { set_theme_mod('developer_hero_subtitle', $hero['subheadline']); }
                                    if (isset($hero['button-text'])) { set_theme_mod('developer_hero_badge', $hero['button-text']); }
                                    if (isset($hero['button-link'])) { set_theme_mod('developer_hero_badge_link', $hero['button-link']); }
                                    // Background
                                    if (isset($hero['image-url']) && !empty($hero['image-url'])) { set_theme_mod('developer_hero_bg', $hero['image-url']); }
                                    if (isset($hero['overlay-color'])) { set_theme_mod('developer_hero_overlay_color', $hero['overlay-color']); }
                                    if (isset($hero['overlay'])) { set_theme_mod('developer_hero_opacity', intval($hero['overlay'])); }
                                    if (isset($hero['height'])) { set_theme_mod('developer_hero_height', intval($hero['height'])); }
                                    // Badge styling
                                    if (isset($hero['badge-bg'])) { set_theme_mod('developer_hero_badge_bg', $hero['badge-bg']); }
                                    if (isset($hero['badge-text'])) { set_theme_mod('developer_hero_badge_text', $hero['badge-text']); }
                                    if (isset($hero['badge-border'])) { set_theme_mod('developer_hero_badge_border', $hero['badge-border']); }
                                    // Trust badges
                                    if (isset($hero['trust-1'])) { set_theme_mod('developer_hero_trust_1', $hero['trust-1']); }
                                    if (isset($hero['trust-2'])) { set_theme_mod('developer_hero_trust_2', $hero['trust-2']); }
                                    if (isset($hero['trust-3'])) { set_theme_mod('developer_hero_trust_3', $hero['trust-3']); }
                                    // Search widget
                                    if (isset($hero['search-bg'])) { set_theme_mod('developer_search_bg', $hero['search-bg']); }
                                    if (isset($hero['search-opacity'])) { set_theme_mod('developer_search_opacity', intval($hero['search-opacity'])); }
                                    if (isset($hero['search-radius'])) { set_theme_mod('developer_search_radius', $hero['search-radius']); }
                                    if (isset($hero['search-padding'])) { set_theme_mod('developer_search_padding', intval($hero['search-padding'])); }
                                    if (isset($hero['search-max-width'])) { set_theme_mod('developer_search_max_width', $hero['search-max-width']); }
                                    if (isset($hero['search-scale'])) { set_theme_mod('developer_search_scale', $hero['search-scale']); }
                                    if (isset($hero['search-btn-bg'])) { 
                                        set_theme_mod('developer_search_btn_bg', $hero['search-btn-bg']); 
                                        $synced[] = 'Search Button: ' . $hero['search-btn-bg'];
                                    }
                                    if (isset($hero['search-btn-text'])) { set_theme_mod('developer_search_btn_text', $hero['search-btn-text']); }
                                    if (isset($hero['search-below-text'])) { set_theme_mod('developer_search_below_text', $hero['search-below-text']); }
                                    if (isset($hero['search-max-guests'])) { 
                                        update_option('gas_max_guests_dropdown', intval($hero['search-max-guests'])); 
                                        $synced[] = 'Max Guests: ' . $hero['search-max-guests'];
                                    }
                                    
                                    $synced[] = 'Hero';
                                }
                                
                                // Sync intro section
                                if (!empty($config['website']['intro'])) {
                                    $intro = $config['website']['intro'];
                                    if (isset($intro['enabled'])) { set_theme_mod('developer_intro_enabled', (bool)$intro['enabled']); }
                                    if (isset($intro['bg'])) { set_theme_mod('developer_intro_bg', $intro['bg']); }
                                    if (isset($intro['text-color'])) { set_theme_mod('developer_intro_text_color', $intro['text-color']); }
                                    if (isset($intro['title'])) { set_theme_mod('developer_intro_title', $intro['title']); }
                                    if (isset($intro['title-size'])) { set_theme_mod('developer_intro_title_size', $intro['title-size']); }
                                    if (isset($intro['text'])) { set_theme_mod('developer_intro_text', $intro['text']); }
                                    if (isset($intro['text-size'])) { set_theme_mod('developer_intro_text_size', $intro['text-size']); }
                                    if (isset($intro['max-width'])) { set_theme_mod('developer_intro_max_width', $intro['max-width']); }
                                    if (isset($intro['btn-text'])) { set_theme_mod('developer_intro_btn_text', $intro['btn-text']); }
                                    if (isset($intro['btn-url'])) { set_theme_mod('developer_intro_btn_url', $intro['btn-url']); }
                                    if (isset($intro['btn-bg'])) { set_theme_mod('developer_intro_btn_bg', $intro['btn-bg']); }
                                    if (isset($intro['btn-text-color'])) { set_theme_mod('developer_intro_btn_text_color', $intro['btn-text-color']); }
                                    $synced[] = 'Intro';
                                }
                                
                                // Sync featured properties section
                                if (!empty($config['website']['featured'])) {
                                    $feat = $config['website']['featured'];
                                    if (isset($feat['mode'])) { set_theme_mod('developer_featured_mode', $feat['mode']); }
                                    if (isset($feat['count'])) { set_theme_mod('developer_featured_count', intval($feat['count'])); }
                                    if (isset($feat['ids'])) { set_theme_mod('developer_featured_ids', $feat['ids']); }
                                    if (isset($feat['title'])) { set_theme_mod('developer_featured_title', $feat['title']); }
                                    if (isset($feat['subtitle'])) { set_theme_mod('developer_featured_subtitle', $feat['subtitle']); }
                                    if (isset($feat['btn-text'])) { set_theme_mod('developer_featured_btn_text', $feat['btn-text']); }
                                    if (isset($feat['btn-url'])) { set_theme_mod('developer_featured_btn_url', $feat['btn-url']); }
                                    if (isset($feat['btn-bg'])) { set_theme_mod('developer_featured_btn_bg', $feat['btn-bg']); }
                                    if (isset($feat['btn-text-color'])) { set_theme_mod('developer_featured_btn_text_color', $feat['btn-text-color']); }
                                    $synced[] = 'Featured';
                                }
                                
                                // Sync about section
                                if (!empty($config['website']['about'])) {
                                    $about = $config['website']['about'];
                                    if (isset($about['image-url']) && !empty($about['image-url'])) { set_theme_mod('developer_about_image', $about['image-url']); }
                                    if (isset($about['image-2-url']) && !empty($about['image-2-url'])) { set_theme_mod('developer_about_image_2', $about['image-2-url']); }
                                    if (isset($about['image-3-url']) && !empty($about['image-3-url'])) { set_theme_mod('developer_about_image_3', $about['image-3-url']); }
                                    if (isset($about['image-4-url']) && !empty($about['image-4-url'])) { set_theme_mod('developer_about_image_4', $about['image-4-url']); }
                                    if (isset($about['title'])) { set_theme_mod('developer_about_title', $about['title']); }
                                    if (isset($about['title-size'])) { set_theme_mod('developer_about_title_size', $about['title-size']); }
                                    if (isset($about['text'])) { set_theme_mod('developer_about_text', $about['text']); }
                                    if (isset($about['text-size'])) { set_theme_mod('developer_about_text_size', $about['text-size']); }
                                    if (isset($about['layout'])) { set_theme_mod('developer_about_layout', $about['layout']); }
                                    if (isset($about['btn-text'])) { set_theme_mod('developer_about_btn_text', $about['btn-text']); }
                                    if (isset($about['btn-url'])) { set_theme_mod('developer_about_btn_url', $about['btn-url']); }
                                    if (isset($about['btn-bg'])) { set_theme_mod('developer_about_btn_bg', $about['btn-bg']); }
                                    if (isset($about['btn-text-color'])) { set_theme_mod('developer_about_btn_text_color', $about['btn-text-color']); }
                                    // Features
                                    if (isset($about['feature-1'])) { set_theme_mod('developer_about_feature_1', $about['feature-1']); }
                                    if (isset($about['feature-2'])) { set_theme_mod('developer_about_feature_2', $about['feature-2']); }
                                    if (isset($about['feature-3'])) { set_theme_mod('developer_about_feature_3', $about['feature-3']); }
                                    if (isset($about['feature-4'])) { set_theme_mod('developer_about_feature_4', $about['feature-4']); }
                                    if (isset($about['feature-5'])) { set_theme_mod('developer_about_feature_5', $about['feature-5']); }
                                    if (isset($about['feature-6'])) { set_theme_mod('developer_about_feature_6', $about['feature-6']); }
                                    $synced[] = 'About';
                                }
                                
                                // Sync reviews section
                                if (!empty($config['website']['reviews'])) {
                                    $rev = $config['website']['reviews'];
                                    if (isset($rev['enabled'])) { set_theme_mod('developer_reviews_enabled', (bool)$rev['enabled']); }
                                    if (isset($rev['title'])) { set_theme_mod('developer_reviews_title', $rev['title']); }
                                    if (isset($rev['subtitle'])) { set_theme_mod('developer_reviews_subtitle', $rev['subtitle']); }
                                    if (isset($rev['bg'])) { set_theme_mod('developer_reviews_bg', $rev['bg']); }
                                    if (isset($rev['text-color'])) { set_theme_mod('developer_reviews_text_color', $rev['text-color']); }
                                    if (isset($rev['widget'])) { set_theme_mod('developer_reviews_widget', $rev['widget']); }
                                    // New fields for Reviews App / Manual Reviews
                                    if (isset($rev['use-app'])) { set_theme_mod('developer_reviews_use_app', (bool)$rev['use-app']); }
                                    if (isset($rev['app-code'])) { 
                                        set_theme_mod('developer_reviews_app_code', $rev['app-code']); 
                                        // Also update gas-reviews plugin option if installed
                                        update_option('gas_reviews_widget_id', $rev['app-code']);
                                    }
                                    // Manual reviews
                                    for ($i = 1; $i <= 3; $i++) {
                                        if (isset($rev["review{$i}-name"])) { set_theme_mod("developer_reviews_review{$i}_name", $rev["review{$i}-name"]); }
                                        if (isset($rev["review{$i}-text"])) { set_theme_mod("developer_reviews_review{$i}_text", $rev["review{$i}-text"]); }
                                        if (isset($rev["review{$i}-source"])) { set_theme_mod("developer_reviews_review{$i}_source", $rev["review{$i}-source"]); }
                                    }
                                    $synced[] = 'Reviews';
                                }
                                
                                // Sync CTA section
                                if (!empty($config['website']['cta'])) {
                                    $cta = $config['website']['cta'];
                                    if (isset($cta['enabled'])) { set_theme_mod('developer_cta_enabled', (bool)$cta['enabled']); }
                                    if (isset($cta['title'])) { set_theme_mod('developer_cta_title', $cta['title']); }
                                    if (isset($cta['title-size'])) { set_theme_mod('developer_cta_title_size', $cta['title-size']); }
                                    if (isset($cta['text'])) { set_theme_mod('developer_cta_text', $cta['text']); }
                                    if (isset($cta['text-size'])) { set_theme_mod('developer_cta_text_size', $cta['text-size']); }
                                    if (isset($cta['background'])) { set_theme_mod('developer_cta_background', $cta['background']); }
                                    if (isset($cta['text-color'])) { set_theme_mod('developer_cta_text_color', $cta['text-color']); }
                                    if (isset($cta['btn-text'])) { set_theme_mod('developer_cta_btn_text', $cta['btn-text']); }
                                    if (isset($cta['btn-url'])) { set_theme_mod('developer_cta_btn_url', $cta['btn-url']); }
                                    if (isset($cta['btn-bg'])) { set_theme_mod('developer_cta_btn_bg', $cta['btn-bg']); }
                                    if (isset($cta['btn-text-color'])) { set_theme_mod('developer_cta_btn_text_color', $cta['btn-text-color']); }
                                    $synced[] = 'CTA';
                                }
                                
                                // Sync footer section
                                if (!empty($config['website']['footer'])) {
                                    $footer = $config['website']['footer'];
                                    if (isset($footer['bg'])) { set_theme_mod('developer_footer_bg', $footer['bg']); }
                                    if (isset($footer['text'])) { set_theme_mod('developer_footer_text', $footer['text']); }
                                    if (isset($footer['layout'])) { set_theme_mod('developer_footer_layout', $footer['layout']); }
                                    if (isset($footer['copyright'])) { set_theme_mod('developer_footer_copyright', $footer['copyright']); }
                                    // Contact info
                                    if (isset($footer['email'])) { set_theme_mod('developer_email', $footer['email']); }
                                    if (isset($footer['phone'])) { set_theme_mod('developer_phone', $footer['phone']); }
                                    if (isset($footer['address'])) { set_theme_mod('developer_address', $footer['address']); }
                                    // Social media
                                    if (isset($footer['social-facebook'])) { set_theme_mod('developer_social_facebook', $footer['social-facebook']); }
                                    if (isset($footer['social-instagram'])) { set_theme_mod('developer_social_instagram', $footer['social-instagram']); }
                                    if (isset($footer['social-twitter'])) { set_theme_mod('developer_social_twitter', $footer['social-twitter']); }
                                    if (isset($footer['social-linkedin'])) { set_theme_mod('developer_social_linkedin', $footer['social-linkedin']); }
                                    if (isset($footer['social-youtube'])) { set_theme_mod('developer_social_youtube', $footer['social-youtube']); }
                                    if (isset($footer['social-tiktok'])) { set_theme_mod('developer_social_tiktok', $footer['social-tiktok']); }
                                    if (isset($footer['social-pinterest'])) { set_theme_mod('developer_social_pinterest', $footer['social-pinterest']); }
                                    if (isset($footer['social-tripadvisor'])) { set_theme_mod('developer_social_tripadvisor', $footer['social-tripadvisor']); }
                                    $synced[] = 'Footer';
                                }
                                
                                // Sync styles/colors
                                if (!empty($config['website']['styles'])) {
                                    $styles = $config['website']['styles'];
                                    // Colors
                                    if (isset($styles['primary-color'])) { 
                                        set_theme_mod('developer_primary_color', $styles['primary-color']);
                                        // Search button color comes from Hero section, not here
                                    }
                                    if (isset($styles['secondary-color'])) { set_theme_mod('developer_secondary_color', $styles['secondary-color']); }
                                    if (isset($styles['accent-color'])) { set_theme_mod('developer_accent_color', $styles['accent-color']); }
                                    if (isset($styles['link-color'])) { set_theme_mod('developer_link_color', $styles['link-color']); }
                                    // Typography
                                    if (isset($styles['heading-font'])) { set_theme_mod('developer_heading_font', $styles['heading-font']); }
                                    if (isset($styles['body-font'])) { set_theme_mod('developer_body_font', $styles['body-font']); }
                                    if (isset($styles['title-size'])) { set_theme_mod('developer_page_title_size', $styles['title-size']); }
                                    if (isset($styles['body-size'])) { set_theme_mod('developer_body_text_size', $styles['body-size']); }
                                    // Buttons
                                    if (isset($styles['btn-primary-bg'])) { set_theme_mod('developer_btn_primary_bg', $styles['btn-primary-bg']); }
                                    if (isset($styles['btn-primary-text'])) { set_theme_mod('developer_btn_primary_text', $styles['btn-primary-text']); }
                                    if (isset($styles['btn-secondary-bg'])) { set_theme_mod('developer_btn_secondary_bg', $styles['btn-secondary-bg']); }
                                    if (isset($styles['btn-secondary-text'])) { set_theme_mod('developer_btn_secondary_text', $styles['btn-secondary-text']); }
                                    if (isset($styles['btn-radius'])) { set_theme_mod('developer_btn_radius', $styles['btn-radius']); }
                                    // Section backgrounds
                                    if (isset($styles['featured-bg'])) { set_theme_mod('developer_featured_bg', $styles['featured-bg']); }
                                    if (isset($styles['about-bg'])) { set_theme_mod('developer_about_bg', $styles['about-bg']); }
                                    if (isset($styles['testimonials-bg'])) { set_theme_mod('developer_testimonials_bg', $styles['testimonials-bg']); }
                                    if (isset($styles['cta-bg'])) { set_theme_mod('developer_cta_bg', $styles['cta-bg']); }
                                    // Custom CSS
                                    if (isset($styles['custom-css'])) { set_theme_mod('developer_custom_css', $styles['custom-css']); }
                                    $synced[] = 'Styles';
                                }
                            }
                            
                            // Sync contact info from branding/contact (fallback)
                            if (!empty($config['contact'])) {
                                if (!empty($config['contact']['email'])) { 
                                    update_option('gas_contact_email', $config['contact']['email']); 
                                    $synced[] = 'Contact Email'; 
                                }
                                if (!empty($config['contact']['phone'])) { 
                                    update_option('gas_contact_phone', $config['contact']['phone']); 
                                    $synced[] = 'Contact Phone'; 
                                }
                                if (!empty($config['contact']['address_formatted'])) { 
                                    update_option('gas_contact_address', $config['contact']['address_formatted']); 
                                    $synced[] = 'Contact Address'; 
                                }
                            }
                            
                            // Sync SEO settings
                            if (!empty($config['seo'])) {
                                $seo = $config['seo'];
                                if (isset($seo['enabled'])) { 
                                    update_option('gas_seo_enabled', $seo['enabled'] ? '1' : '0'); 
                                }
                                if (!empty($seo['meta_title'])) { 
                                    update_option('gas_seo_meta_title', sanitize_text_field($seo['meta_title'])); 
                                }
                                if (!empty($seo['meta_description'])) { 
                                    update_option('gas_seo_meta_description', sanitize_textarea_field($seo['meta_description'])); 
                                }
                                if (!empty($seo['og_image'])) { 
                                    update_option('gas_seo_og_image', esc_url_raw($seo['og_image'])); 
                                }
                                if (isset($seo['include_schema'])) { 
                                    update_option('gas_seo_include_schema', $seo['include_schema'] ? '1' : '0'); 
                                }
                                if (isset($seo['include_faqs'])) { 
                                    update_option('gas_seo_include_faqs', $seo['include_faqs'] ? '1' : '0'); 
                                }
                                if (!empty($seo['google_analytics_id'])) { 
                                    update_option('gas_google_analytics_id', sanitize_text_field($seo['google_analytics_id'])); 
                                }
                                if (!empty($seo['google_tag_manager_id'])) { 
                                    update_option('gas_google_tag_manager_id', sanitize_text_field($seo['google_tag_manager_id'])); 
                                }
                                if (!empty($seo['facebook_pixel_id'])) {
                                    update_option('gas_facebook_pixel_id', sanitize_text_field($seo['facebook_pixel_id']));
                                }
                                if (!empty($seo['google_site_verification'])) {
                                    update_option('gas_google_site_verification', sanitize_text_field($seo['google_site_verification']));
                                }
                                $synced[] = 'SEO';
                            }
                            
                            // Sync per-page SEO from pages object
                            if (!empty($config['pages'])) {
                                $page_seo_map = array(
                                    'home' => 'hero',
                                    'rooms' => 'page_rooms',
                                    'about' => 'page_about',
                                    'contact' => 'page_contact',
                                    'gallery' => 'page_gallery',
                                    'blog' => 'page_blog',
                                    'attractions' => 'page_attractions',
                                    'dining' => 'page_dining',
                                    'terms' => 'page_terms',
                                    'privacy' => 'page_privacy'
                                );
                                
                                $page_seo_count = 0;
                                foreach ($config['pages'] as $page_type => $page_data) {
                                    $option_key = isset($page_seo_map[$page_type]) ? $page_seo_map[$page_type] : '';
                                    if (!empty($option_key)) {
                                        if (!empty($page_data['meta_title'])) {
                                            update_option('gas_seo_' . $option_key . '_meta_title', sanitize_text_field($page_data['meta_title']));
                                            $page_seo_count++;
                                        }
                                        if (!empty($page_data['meta_description'])) {
                                            update_option('gas_seo_' . $option_key . '_meta_description', sanitize_textarea_field($page_data['meta_description']));
                                            $page_seo_count++;
                                        }
                                    }
                                }
                                if ($page_seo_count > 0) {
                                    $synced[] = 'Page SEO (' . $page_seo_count . ' fields)';
                                }
                            }
                            
                            // Sync per-page SEO from website settings
                            if (!empty($config['website'])) {
                                $website = $config['website'];
                                $section_map = array(
                                    'hero' => 'hero',
                                    'page-rooms' => 'page_rooms',
                                    'page-about' => 'page_about',
                                    'page-contact' => 'page_contact',
                                    'page-gallery' => 'page_gallery',
                                    'page-blog' => 'page_blog',
                                    'page-attractions' => 'page_attractions',
                                    'page-dining' => 'page_dining',
                                    'page-terms' => 'page_terms',
                                    'page-privacy' => 'page_privacy'
                                );
                                
                                foreach ($section_map as $section_key => $option_key) {
                                    if (!empty($website[$section_key])) {
                                        $section = $website[$section_key];
                                        if (!empty($section['meta-title'])) {
                                            update_option('gas_seo_' . $option_key . '_meta_title', sanitize_text_field($section['meta-title']));
                                        }
                                        if (!empty($section['meta-description'])) {
                                            update_option('gas_seo_' . $option_key . '_meta_description', sanitize_textarea_field($section['meta-description']));
                                        }
                                    }
                                }
                            }
                            
                            if (!empty($synced)) {
                                echo '<div class="notice notice-success" style="padding: 12px; margin: 10px 0;"><strong>✅ Synced:</strong> ' . implode(', ', $synced) . '</div>';
                            } else {
                                echo '<div class="notice notice-warning" style="padding: 12px; margin: 10px 0;">No settings found to sync. Configure your site in GAS Admin → Website Builder first.</div>';
                            }
                        } else {
                            echo '<div class="notice notice-error" style="padding: 12px; margin: 10px 0;">❌ Could not connect to GAS API</div>';
                        }
                    } else {
                        echo '<div class="notice notice-error" style="padding: 12px; margin: 10px 0;">❌ Please set your Client Account ID first</div>';
                    }
                }
                ?>
                <form method="post" style="display: inline-block;">
                    <?php wp_nonce_field('gas_sync_action', 'gas_sync_nonce'); ?>
                    <button type="submit" name="gas_sync_from_gas" class="button button-secondary" style="display: inline-flex; align-items: center; gap: 6px;">
                        <span style="font-size: 18px;">🔄</span> Sync from GAS
                    </button>
                </form>
                <p class="description" style="margin-top: 8px;">This will pull settings from GAS Admin and update WordPress options.</p>
                
            <?php elseif ($active_tab === 'pages') : ?>
                <!-- PAGES TAB -->
                <form method="post" action="options.php">
                    <?php settings_fields('gas_booking_pages'); ?>
                    
                    <div style="max-width: 800px;">
                        <!-- Page Management Info -->
                        <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 16px 20px; border-radius: 8px; border: 1px solid #93c5fd; margin-bottom: 24px;">
                            <p style="margin: 0; color: #1e40af;"><strong>💡 How Pages Work:</strong> Enable a page below, add your content, and click Save. The page will be automatically created in WordPress and added to your Primary Menu.</p>
                        </div>
                        
                        <!-- About Us Page -->
                        <div style="background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h3 style="margin: 0;">📝 About Us Page</h3>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" name="gas_page_about_enabled" value="1" <?php checked(get_option('gas_page_about_enabled'), '1'); ?> style="width: 18px; height: 18px;">
                                    <span style="font-weight: 500; color: <?php echo get_option('gas_page_about_enabled') ? '#059669' : '#6b7280'; ?>;">
                                        <?php echo get_option('gas_page_about_enabled') ? '✅ Enabled' : 'Enable Page'; ?>
                                    </span>
                                </label>
                            </div>
                            <p class="description">Content for your About page. Use shortcode <code>[gas_about]</code></p>
                            <table class="form-table">
                                <tr>
                                    <th>Page Title</th>
                                    <td><input type="text" name="gas_about_title" value="<?php echo esc_attr(get_option('gas_about_title', 'About Us')); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th>Content</th>
                                    <td>
                                        <?php 
                                        wp_editor(
                                            get_option('gas_about_content', '<p>Welcome to our property. We look forward to hosting you!</p>'),
                                            'gas_about_content',
                                            array('textarea_name' => 'gas_about_content', 'textarea_rows' => 10, 'media_buttons' => true)
                                        );
                                        ?>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Gallery Page -->
                        <div style="background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h3 style="margin: 0;">🖼️ Gallery Page</h3>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" name="gas_page_gallery_enabled" value="1" <?php checked(get_option('gas_page_gallery_enabled'), '1'); ?> style="width: 18px; height: 18px;">
                                    <span style="font-weight: 500; color: <?php echo get_option('gas_page_gallery_enabled') ? '#059669' : '#6b7280'; ?>;">
                                        <?php echo get_option('gas_page_gallery_enabled') ? '✅ Enabled' : 'Enable Page'; ?>
                                    </span>
                                </label>
                            </div>
                            <p class="description">Photo gallery page. Use shortcode <code>[gas_gallery]</code></p>
                            <table class="form-table">
                                <tr>
                                    <th>Page Title</th>
                                    <td><input type="text" name="gas_gallery_title" value="<?php echo esc_attr(get_option('gas_gallery_title', 'Gallery')); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th>Introduction</th>
                                    <td>
                                        <?php 
                                        wp_editor(
                                            get_option('gas_gallery_content', '<p>Browse photos of our beautiful property and accommodations.</p>'),
                                            'gas_gallery_content',
                                            array('textarea_name' => 'gas_gallery_content', 'textarea_rows' => 5, 'media_buttons' => true)
                                        );
                                        ?>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Dining Page -->
                        <div style="background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h3 style="margin: 0;">🍽️ Dining Page</h3>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" name="gas_page_dining_enabled" value="1" <?php checked(get_option('gas_page_dining_enabled'), '1'); ?> style="width: 18px; height: 18px;">
                                    <span style="font-weight: 500; color: <?php echo get_option('gas_page_dining_enabled') ? '#059669' : '#6b7280'; ?>;">
                                        <?php echo get_option('gas_page_dining_enabled') ? '✅ Enabled' : 'Enable Page'; ?>
                                    </span>
                                </label>
                            </div>
                            <p class="description">Restaurant and dining information. Use shortcode <code>[gas_dining]</code></p>
                            <table class="form-table">
                                <tr>
                                    <th>Page Title</th>
                                    <td><input type="text" name="gas_dining_title" value="<?php echo esc_attr(get_option('gas_dining_title', 'Dining')); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th>Content</th>
                                    <td>
                                        <?php 
                                        wp_editor(
                                            get_option('gas_dining_content', '<p>Experience exceptional dining at our restaurant.</p>'),
                                            'gas_dining_content',
                                            array('textarea_name' => 'gas_dining_content', 'textarea_rows' => 10, 'media_buttons' => true)
                                        );
                                        ?>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Special Offers Page -->
                        <div style="background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h3 style="margin: 0;">🏷️ Special Offers Page</h3>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" name="gas_page_offers_enabled" value="1" <?php checked(get_option('gas_page_offers_enabled'), '1'); ?> style="width: 18px; height: 18px;">
                                    <span style="font-weight: 500; color: <?php echo get_option('gas_page_offers_enabled') ? '#059669' : '#6b7280'; ?>;">
                                        <?php echo get_option('gas_page_offers_enabled') ? '✅ Enabled' : 'Enable Page'; ?>
                                    </span>
                                </label>
                            </div>
                            <p class="description">Display your special offers. Use shortcode <code>[gas_offers]</code></p>
                            <table class="form-table">
                                <tr>
                                    <th>Page Title</th>
                                    <td><input type="text" name="gas_offers_title" value="<?php echo esc_attr(get_option('gas_offers_title', 'Special Offers')); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th>Introduction</th>
                                    <td>
                                        <?php 
                                        wp_editor(
                                            get_option('gas_offers_content', '<p>Take advantage of our exclusive special offers and packages.</p>'),
                                            'gas_offers_content',
                                            array('textarea_name' => 'gas_offers_content', 'textarea_rows' => 5, 'media_buttons' => true)
                                        );
                                        ?>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Properties Page -->
                        <div style="background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h3 style="margin: 0;">🏠 Properties Page</h3>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" name="gas_page_properties_enabled" value="1" <?php checked(get_option('gas_page_properties_enabled'), '1'); ?> style="width: 18px; height: 18px;">
                                    <span style="font-weight: 500; color: <?php echo get_option('gas_page_properties_enabled') ? '#059669' : '#6b7280'; ?>;">
                                        <?php echo get_option('gas_page_properties_enabled') ? '✅ Enabled' : 'Enable Page'; ?>
                                    </span>
                                </label>
                            </div>
                            <p class="description" style="background: #fef3c7; padding: 10px; border-radius: 6px; border-left: 3px solid #f59e0b;">
                                <strong>⚠️ Note:</strong> This shortcode is for accounts with multiple properties (hotels/B&Bs). Most accounts should use <code>[gas_rooms]</code> instead to display bookable rooms.<br>
                                Shortcode: <code>[gas_properties]</code>
                            </p>
                            <table class="form-table">
                                <tr>
                                    <th>Page Title</th>
                                    <td><input type="text" name="gas_properties_title" value="<?php echo esc_attr(get_option('gas_properties_title', 'Our Properties')); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th>Introduction</th>
                                    <td>
                                        <?php 
                                        wp_editor(
                                            get_option('gas_properties_content', '<p>Explore our collection of properties.</p>'),
                                            'gas_properties_content',
                                            array('textarea_name' => 'gas_properties_content', 'textarea_rows' => 5, 'media_buttons' => true)
                                        );
                                        ?>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Contact Page -->
                        <div style="background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h3 style="margin: 0;">📞 Contact Page</h3>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" name="gas_page_contact_enabled" value="1" <?php checked(get_option('gas_page_contact_enabled', '1'), '1'); ?> style="width: 18px; height: 18px;">
                                    <span style="font-weight: 500; color: <?php echo get_option('gas_page_contact_enabled', '1') ? '#059669' : '#6b7280'; ?>;">
                                        <?php echo get_option('gas_page_contact_enabled', '1') ? '✅ Enabled' : 'Enable Page'; ?>
                                    </span>
                                </label>
                            </div>
                            <p class="description">Content for your Contact page. Use shortcode <code>[gas_contact]</code></p>
                            <table class="form-table">
                                <tr>
                                    <th>Page Title</th>
                                    <td><input type="text" name="gas_contact_title" value="<?php echo esc_attr(get_option('gas_contact_title', 'Contact Us')); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th>Introduction Text</th>
                                    <td>
                                        <?php 
                                        wp_editor(
                                            get_option('gas_contact_content', '<p>We would love to hear from you. Get in touch using the details below.</p>'),
                                            'gas_contact_content',
                                            array('textarea_name' => 'gas_contact_content', 'textarea_rows' => 5, 'media_buttons' => false)
                                        );
                                        ?>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Address</th>
                                    <td><textarea name="gas_contact_address" rows="3" class="large-text"><?php echo esc_textarea(get_option('gas_contact_address', '')); ?></textarea></td>
                                </tr>
                                <tr>
                                    <th>Phone</th>
                                    <td><input type="text" name="gas_contact_phone" value="<?php echo esc_attr(get_option('gas_contact_phone', '')); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th>Email</th>
                                    <td><input type="email" name="gas_contact_email" value="<?php echo esc_attr(get_option('gas_contact_email', '')); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th>Google Map Embed</th>
                                    <td>
                                        <textarea name="gas_contact_map_embed" rows="3" class="large-text" placeholder="Paste Google Maps embed iframe code here"><?php echo esc_textarea(get_option('gas_contact_map_embed', '')); ?></textarea>
                                        <p class="description">Go to Google Maps → Share → Embed a map → Copy the iframe code</p>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Terms & Conditions -->
                        <div style="background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h3 style="margin: 0;">📋 Terms & Conditions</h3>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" name="gas_page_terms_enabled" value="1" <?php checked(get_option('gas_page_terms_enabled'), '1'); ?> style="width: 18px; height: 18px;">
                                    <span style="font-weight: 500; color: <?php echo get_option('gas_page_terms_enabled') ? '#059669' : '#6b7280'; ?>;">
                                        <?php echo get_option('gas_page_terms_enabled') ? '✅ Enabled' : 'Enable Page'; ?>
                                    </span>
                                </label>
                            </div>
                            <p class="description">Your booking terms. Use shortcode <code>[gas_terms]</code></p>
                            <table class="form-table">
                                <tr>
                                    <th>Page Title</th>
                                    <td><input type="text" name="gas_terms_title" value="<?php echo esc_attr(get_option('gas_terms_title', 'Terms & Conditions')); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th>Content</th>
                                    <td>
                                        <?php 
                                        wp_editor(
                                            get_option('gas_terms_content', '<h3>Booking Terms</h3><p>Please read these terms carefully before making a booking.</p>'),
                                            'gas_terms_content',
                                            array('textarea_name' => 'gas_terms_content', 'textarea_rows' => 15, 'media_buttons' => false)
                                        );
                                        ?>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Privacy Policy -->
                        <div style="background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                                <h3 style="margin: 0;">🔒 Privacy Policy</h3>
                                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                    <input type="checkbox" name="gas_page_privacy_enabled" value="1" <?php checked(get_option('gas_page_privacy_enabled'), '1'); ?> style="width: 18px; height: 18px;">
                                    <span style="font-weight: 500; color: <?php echo get_option('gas_page_privacy_enabled') ? '#059669' : '#6b7280'; ?>;">
                                        <?php echo get_option('gas_page_privacy_enabled') ? '✅ Enabled' : 'Enable Page'; ?>
                                    </span>
                                </label>
                            </div>
                            <p class="description">Your privacy policy. Use shortcode <code>[gas_privacy]</code></p>
                            <table class="form-table">
                                <tr>
                                    <th>Page Title</th>
                                    <td><input type="text" name="gas_privacy_title" value="<?php echo esc_attr(get_option('gas_privacy_title', 'Privacy Policy')); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th>Content</th>
                                    <td>
                                        <?php 
                                        wp_editor(
                                            get_option('gas_privacy_content', '<h3>Privacy Policy</h3><p>This policy explains how we collect, use, and protect your personal information.</p>'),
                                            'gas_privacy_content',
                                            array('textarea_name' => 'gas_privacy_content', 'textarea_rows' => 15, 'media_buttons' => false)
                                        );
                                        ?>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    
                    <?php submit_button('Save Pages'); ?>
                </form>
                
            <?php elseif ($active_tab === 'footer') : ?>
                <!-- FOOTER TAB -->
                <form method="post" action="options.php">
                    <?php settings_fields('gas_booking_footer'); ?>
                    
                    <div style="max-width: 800px;">
                        <div style="background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 24px;">
                            <h3 style="margin-top: 0;">🏠 Business Information</h3>
                            <p class="description">This information appears in your footer. Use shortcode <code>[gas_footer]</code></p>
                            <table class="form-table">
                                <tr>
                                    <th>Business Name</th>
                                    <td><input type="text" name="gas_footer_business_name" value="<?php echo esc_attr(get_option('gas_footer_business_name', get_bloginfo('name'))); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th>Tagline</th>
                                    <td><input type="text" name="gas_footer_tagline" value="<?php echo esc_attr(get_option('gas_footer_tagline', '')); ?>" class="regular-text" placeholder="Your perfect getaway awaits" /></td>
                                </tr>
                                <tr>
                                    <th>Address</th>
                                    <td><textarea name="gas_footer_address" rows="2" class="large-text"><?php echo esc_textarea(get_option('gas_footer_address', '')); ?></textarea></td>
                                </tr>
                                <tr>
                                    <th>Phone</th>
                                    <td><input type="text" name="gas_footer_phone" value="<?php echo esc_attr(get_option('gas_footer_phone', '')); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th>Email</th>
                                    <td><input type="email" name="gas_footer_email" value="<?php echo esc_attr(get_option('gas_footer_email', '')); ?>" class="regular-text" /></td>
                                </tr>
                                <tr>
                                    <th>Copyright Text</th>
                                    <td>
                                        <input type="text" name="gas_footer_copyright" value="<?php echo esc_attr(get_option('gas_footer_copyright', '© ' . date('Y') . ' ' . get_bloginfo('name') . '. All rights reserved.')); ?>" class="large-text" />
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #ddd; margin-bottom: 24px;">
                            <h3 style="margin-top: 0;">🔗 Social Media Links</h3>
                            <p class="description">Leave blank to hide. Icons will appear in your footer.</p>
                            <table class="form-table">
                                <tr>
                                    <th>Facebook</th>
                                    <td><input type="url" name="gas_footer_facebook" value="<?php echo esc_attr(get_option('gas_footer_facebook', '')); ?>" class="regular-text" placeholder="https://facebook.com/yourpage" /></td>
                                </tr>
                                <tr>
                                    <th>Instagram</th>
                                    <td><input type="url" name="gas_footer_instagram" value="<?php echo esc_attr(get_option('gas_footer_instagram', '')); ?>" class="regular-text" placeholder="https://instagram.com/yourpage" /></td>
                                </tr>
                                <tr>
                                    <th>Twitter / X</th>
                                    <td><input type="url" name="gas_footer_twitter" value="<?php echo esc_attr(get_option('gas_footer_twitter', '')); ?>" class="regular-text" placeholder="https://twitter.com/yourpage" /></td>
                                </tr>
                                <tr>
                                    <th>TripAdvisor</th>
                                    <td><input type="url" name="gas_footer_tripadvisor" value="<?php echo esc_attr(get_option('gas_footer_tripadvisor', '')); ?>" class="regular-text" placeholder="https://tripadvisor.com/yourproperty" /></td>
                                </tr>
                                <tr>
                                    <th>YouTube</th>
                                    <td><input type="url" name="gas_footer_youtube" value="<?php echo esc_attr(get_option('gas_footer_youtube', '')); ?>" class="regular-text" placeholder="https://youtube.com/yourchannel" /></td>
                                </tr>
                                <tr>
                                    <th>WhatsApp</th>
                                    <td><input type="text" name="gas_footer_whatsapp" value="<?php echo esc_attr(get_option('gas_footer_whatsapp', '')); ?>" class="regular-text" placeholder="+1234567890 (include country code)" /></td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background: #e7f3ff; padding: 16px; border-radius: 8px; border-left: 4px solid #2196F3;">
                            <strong>📌 Quick Links in Footer</strong><br>
                            The footer automatically includes links to: Home, Rooms, About, Contact, Terms & Privacy.<br>
                            Make sure you've set up those pages with the respective shortcodes.
                        </div>
                    </div>
                    
                    <?php submit_button('Save Footer Settings'); ?>
                </form>

            <?php elseif ($active_tab === 'builder') : ?>
                <!-- SHORTCODE BUILDER TAB -->
                <style>
                    .gas-builder-container {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 30px;
                        max-width: 1400px;
                    }
                    @media (max-width: 1200px) {
                        .gas-builder-container { grid-template-columns: 1fr; }
                    }
                    .gas-builder-options {
                        background: #fff;
                        padding: 24px;
                        border-radius: 12px;
                        border: 1px solid #ddd;
                    }
                    .gas-builder-preview {
                        background: #f8fafc;
                        padding: 24px;
                        border-radius: 12px;
                        border: 1px solid #ddd;
                    }
                    .gas-builder-section {
                        margin-bottom: 24px;
                        padding-bottom: 24px;
                        border-bottom: 1px solid #eee;
                    }
                    .gas-builder-section:last-child {
                        border-bottom: none;
                        margin-bottom: 0;
                        padding-bottom: 0;
                    }
                    .gas-builder-section h4 {
                        margin: 0 0 12px 0;
                        color: #1e293b;
                        font-size: 14px;
                    }
                    .gas-builder-row {
                        display: flex;
                        align-items: center;
                        margin-bottom: 12px;
                        gap: 12px;
                    }
                    .gas-builder-row label {
                        min-width: 120px;
                        font-size: 13px;
                        color: #64748b;
                    }
                    .gas-builder-row select,
                    .gas-builder-row input[type="text"],
                    .gas-builder-row input[type="number"] {
                        flex: 1;
                        padding: 8px 12px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        font-size: 13px;
                        max-width: 200px;
                    }
                    .gas-builder-row input[type="color"] {
                        width: 50px;
                        height: 36px;
                        padding: 2px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        cursor: pointer;
                    }
                    .gas-builder-row input[type="checkbox"] {
                        width: 18px;
                        height: 18px;
                    }
                    .gas-shortcode-output {
                        background: #1e293b;
                        color: #e2e8f0;
                        padding: 16px 20px;
                        border-radius: 8px;
                        font-family: monospace;
                        font-size: 14px;
                        margin: 20px 0;
                        word-break: break-all;
                        position: relative;
                    }
                    .gas-copy-btn {
                        position: absolute;
                        top: 8px;
                        right: 8px;
                        background: #3b82f6;
                        color: white;
                        border: none;
                        padding: 6px 12px;
                        border-radius: 4px;
                        font-size: 12px;
                        cursor: pointer;
                    }
                    .gas-copy-btn:hover {
                        background: #2563eb;
                    }
                    .gas-copy-btn.copied {
                        background: #10b981;
                    }
                    .gas-widget-selector {
                        display: flex;
                        gap: 12px;
                        margin-bottom: 24px;
                    }
                    .gas-widget-btn {
                        flex: 1;
                        padding: 16px;
                        border: 2px solid #ddd;
                        border-radius: 8px;
                        background: #fff;
                        cursor: pointer;
                        text-align: center;
                        transition: all 0.2s;
                    }
                    .gas-widget-btn:hover {
                        border-color: #3b82f6;
                    }
                    .gas-widget-btn.active {
                        border-color: #3b82f6;
                        background: #eff6ff;
                    }
                    .gas-widget-btn .icon {
                        font-size: 24px;
                        display: block;
                        margin-bottom: 8px;
                    }
                    .gas-widget-btn .label {
                        font-weight: 600;
                        font-size: 13px;
                        color: #1e293b;
                    }
                    .gas-preview-frame {
                        background: #fff;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        padding: 30px;
                        min-height: 200px;
                        margin-top: 16px;
                    }
                    /* Preview widget styles */
                    .gas-preview-widget {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    }
                    .gas-preview-widget.vertical .fields { display: flex; flex-direction: column; gap: 12px; }
                    .gas-preview-widget.horizontal .fields { display: flex; flex-direction: row; gap: 12px; align-items: flex-end; }
                    .gas-preview-widget.inline .fields { display: flex; flex-direction: row; gap: 8px; align-items: center; }
                    .gas-preview-widget .field { flex: 1; }
                    .gas-preview-widget .field label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 6px; }
                    .gas-preview-widget.inline .field label { display: none; }
                    .gas-preview-widget .field input,
                    .gas-preview-widget .field select { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
                    .gas-preview-widget .submit-field { flex: 0 0 auto; }
                    .gas-preview-widget.vertical .submit-field { margin-top: 8px; }
                    .gas-preview-widget .preview-btn { padding: 10px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; color: white; }
                </style>
                
                <h2>🔧 Shortcode Builder</h2>
                <p>Select options below to build your shortcode, then copy and paste it into any page.</p>
                
                <div class="gas-builder-container">
                    <div class="gas-builder-options">
                        <!-- Widget Type Selector -->
                        <div class="gas-widget-selector">
                            <button type="button" class="gas-widget-btn active" data-widget="search" onclick="selectWidget('search')">
                                <span class="icon">🔍</span>
                                <span class="label">Search Widget</span>
                            </button>
                            <button type="button" class="gas-widget-btn" data-widget="rooms" onclick="selectWidget('rooms')">
                                <span class="icon">🏠</span>
                                <span class="label">Rooms Grid</span>
                            </button>
                            <button type="button" class="gas-widget-btn" data-widget="room" onclick="selectWidget('room')">
                                <span class="icon">🛏️</span>
                                <span class="label">Room Detail</span>
                            </button>
                        </div>
                        
                        <!-- Search Widget Options -->
                        <div id="options-search" class="gas-options-panel">
                            <div class="gas-builder-section">
                                <h4>📐 Layout</h4>
                                <div class="gas-builder-row">
                                    <label>Layout Style</label>
                                    <select id="search-layout" onchange="updateShortcode()">
                                        <option value="vertical">Vertical (stacked)</option>
                                        <option value="horizontal">Horizontal (row)</option>
                                        <option value="inline">Inline (compact)</option>
                                    </select>
                                </div>
                                <div class="gas-builder-row">
                                    <label>Max Width</label>
                                    <input type="text" id="search-max-width" value="600px" onchange="updateShortcode()" />
                                </div>
                            </div>
                            
                            <div class="gas-builder-section">
                                <h4>📝 Fields</h4>
                                <div class="gas-builder-row">
                                    <label>Show Location</label>
                                    <input type="checkbox" id="search-location" onchange="updateShortcode()" />
                                </div>
                                <div class="gas-builder-row">
                                    <label>Location Placeholder</label>
                                    <input type="text" id="search-location-placeholder" value="Where are you going?" onchange="updateShortcode()" />
                                </div>
                                <div class="gas-builder-row">
                                    <label>Max Guests</label>
                                    <input type="number" id="search-max-guests" value="10" min="1" max="50" onchange="updateShortcode()" />
                                </div>
                            </div>
                            
                            <div class="gas-builder-section">
                                <h4>🔘 Button</h4>
                                <div class="gas-builder-row">
                                    <label>Button Text</label>
                                    <input type="text" id="search-button-text" value="Search" onchange="updateShortcode()" />
                                </div>
                                <div class="gas-builder-row">
                                    <label>Full Width Button</label>
                                    <input type="checkbox" id="search-button-full" onchange="updateShortcode()" />
                                </div>
                            </div>
                            
                            <div class="gas-builder-section">
                                <h4>🎨 Colors</h4>
                                <div class="gas-builder-row">
                                    <label>Button Color</label>
                                    <input type="color" id="search-primary-color" value="#2563eb" onchange="updateShortcode()" />
                                    <input type="text" id="search-primary-color-text" value="#2563eb" style="width: 80px;" onchange="document.getElementById('search-primary-color').value = this.value; updateShortcode();" />
                                </div>
                                <div class="gas-builder-row">
                                    <label>Background</label>
                                    <input type="color" id="search-bg-color" value="#ffffff" onchange="updateShortcode()" />
                                    <input type="text" id="search-bg-color-text" value="#ffffff" style="width: 80px;" onchange="document.getElementById('search-bg-color').value = this.value; updateShortcode();" />
                                </div>
                                <div class="gas-builder-row">
                                    <label>Border Radius</label>
                                    <input type="text" id="search-border-radius" value="12px" onchange="updateShortcode()" />
                                </div>
                            </div>
                            
                            <div class="gas-builder-section">
                                <h4>🏷️ Custom Class</h4>
                                <div class="gas-builder-row">
                                    <label>CSS Class</label>
                                    <input type="text" id="search-class" placeholder="my-custom-class" onchange="updateShortcode()" />
                                </div>
                            </div>
                        </div>
                        
                        <!-- Rooms Grid Options -->
                        <div id="options-rooms" class="gas-options-panel" style="display: none;">
                            <div class="gas-builder-section">
                                <h4>📐 Layout</h4>
                                <div class="gas-builder-row">
                                    <label>Columns</label>
                                    <select id="rooms-columns" onchange="updateShortcode()">
                                        <option value="2">2 Columns</option>
                                        <option value="3" selected>3 Columns</option>
                                        <option value="4">4 Columns</option>
                                    </select>
                                </div>
                                <div class="gas-builder-row">
                                    <label>Show Map</label>
                                    <input type="checkbox" id="rooms-show-map" checked onchange="updateShortcode()" />
                                </div>
                            </div>
                            
                            <div class="gas-builder-section">
                                <h4>🔍 Filter</h4>
                                <div class="gas-builder-row">
                                    <label>Property ID</label>
                                    <input type="number" id="rooms-property-id" placeholder="All properties" onchange="updateShortcode()" />
                                    <span style="font-size: 11px; color: #64748b;">Leave empty for all</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Room Detail Options -->
                        <div id="options-room" class="gas-options-panel" style="display: none;">
                            <div class="gas-builder-section">
                                <h4>🛏️ Room Settings</h4>
                                <div class="gas-builder-row">
                                    <label>Unit ID</label>
                                    <input type="number" id="room-unit-id" placeholder="From URL parameter" onchange="updateShortcode()" />
                                    <span style="font-size: 11px; color: #64748b;">Optional - uses ?unit_id from URL</span>
                                </div>
                                <div class="gas-builder-row">
                                    <label>Show Map</label>
                                    <input type="checkbox" id="room-show-map" checked onchange="updateShortcode()" />
                                </div>
                            </div>
                            <p style="color: #64748b; font-size: 13px; margin-top: 16px;">
                                💡 <strong>Tip:</strong> This shortcode is typically placed on a single page template. 
                                The room ID comes from the URL (e.g., /room/?unit_id=123).
                            </p>
                        </div>
                    </div>
                    
                    <div class="gas-builder-preview">
                        <h3 style="margin-top: 0;">Generated Shortcode</h3>
                        <div class="gas-shortcode-output" id="shortcode-output">
                            [gas_search]
                            <button type="button" class="gas-copy-btn" onclick="copyShortcode()">📋 Copy</button>
                        </div>
                        
                        <h3>Live Preview</h3>
                        <div class="gas-preview-frame" id="preview-frame">
                            <!-- Preview will be rendered here -->
                        </div>
                    </div>
                </div>
                
                <script>
                    var currentWidget = 'search';
                    
                    function selectWidget(type) {
                        currentWidget = type;
                        
                        // Update button states
                        document.querySelectorAll('.gas-widget-btn').forEach(btn => {
                            btn.classList.toggle('active', btn.dataset.widget === type);
                        });
                        
                        // Show/hide option panels
                        document.querySelectorAll('.gas-options-panel').forEach(panel => {
                            panel.style.display = 'none';
                        });
                        document.getElementById('options-' + type).style.display = 'block';
                        
                        updateShortcode();
                    }
                    
                    function updateShortcode() {
                        var shortcode = '';
                        var previewHtml = '';
                        
                        if (currentWidget === 'search') {
                            shortcode = buildSearchShortcode();
                            previewHtml = buildSearchPreview();
                        } else if (currentWidget === 'rooms') {
                            shortcode = buildRoomsShortcode();
                            previewHtml = '<div style="text-align: center; padding: 40px; color: #64748b;"><span style="font-size: 48px;">🏠</span><br><br>Rooms grid with ' + document.getElementById('rooms-columns').value + ' columns' + (document.getElementById('rooms-show-map').checked ? ' + map' : '') + '</div>';
                        } else if (currentWidget === 'room') {
                            shortcode = buildRoomShortcode();
                            previewHtml = '<div style="text-align: center; padding: 40px; color: #64748b;"><span style="font-size: 48px;">🛏️</span><br><br>Room detail page with gallery, booking form' + (document.getElementById('room-show-map').checked ? ', and map' : '') + '</div>';
                        }
                        
                        document.getElementById('shortcode-output').innerHTML = shortcode + '<button type="button" class="gas-copy-btn" onclick="copyShortcode()">📋 Copy</button>';
                        document.getElementById('preview-frame').innerHTML = previewHtml;
                    }
                    
                    function buildSearchShortcode() {
                        var parts = ['[gas_search'];
                        
                        var layout = document.getElementById('search-layout').value;
                        if (layout !== 'vertical') parts.push('layout="' + layout + '"');
                        
                        var maxWidth = document.getElementById('search-max-width').value;
                        if (maxWidth !== '600px') parts.push('max_width="' + maxWidth + '"');
                        
                        if (document.getElementById('search-location').checked) {
                            parts.push('show_location="true"');
                            var placeholder = document.getElementById('search-location-placeholder').value;
                            if (placeholder !== 'Where are you going?') parts.push('location_placeholder="' + placeholder + '"');
                        }
                        
                        var maxGuests = document.getElementById('search-max-guests').value;
                        if (maxGuests !== '10') parts.push('max_guests="' + maxGuests + '"');
                        
                        var buttonText = document.getElementById('search-button-text').value;
                        if (buttonText !== 'Search') parts.push('button_text="' + buttonText + '"');
                        
                        if (document.getElementById('search-button-full').checked) parts.push('button_full_width="true"');
                        
                        var primaryColor = document.getElementById('search-primary-color').value;
                        if (primaryColor !== '#2563eb') parts.push('primary_color="' + primaryColor + '"');
                        
                        var bgColor = document.getElementById('search-bg-color').value;
                        if (bgColor !== '#ffffff') parts.push('background_color="' + bgColor + '"');
                        
                        var borderRadius = document.getElementById('search-border-radius').value;
                        if (borderRadius !== '12px') parts.push('border_radius="' + borderRadius + '"');
                        
                        var customClass = document.getElementById('search-class').value;
                        if (customClass) parts.push('class="' + customClass + '"');
                        
                        return parts.join(' ') + ']';
                    }
                    
                    function buildSearchPreview() {
                        var layout = document.getElementById('search-layout').value;
                        var showLocation = document.getElementById('search-location').checked;
                        var locationPlaceholder = document.getElementById('search-location-placeholder').value;
                        var buttonText = document.getElementById('search-button-text').value;
                        var primaryColor = document.getElementById('search-primary-color').value;
                        var bgColor = document.getElementById('search-bg-color').value;
                        var borderRadius = document.getElementById('search-border-radius').value;
                        var buttonFull = document.getElementById('search-button-full').checked;
                        var maxWidth = document.getElementById('search-max-width').value;
                        
                        var html = '<div class="gas-preview-widget ' + layout + '" style="background: ' + bgColor + '; padding: 20px; border-radius: ' + borderRadius + '; max-width: ' + maxWidth + '; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">';
                        html += '<div class="fields">';
                        
                        if (showLocation) {
                            html += '<div class="field"><label style="color: #1e293b;">Location</label><input type="text" placeholder="' + locationPlaceholder + '" /></div>';
                        }
                        
                        html += '<div class="field"><label style="color: #1e293b;">Check-in</label><input type="text" placeholder="Select date" /></div>';
                        html += '<div class="field"><label style="color: #1e293b;">Check-out</label><input type="text" placeholder="Select date" /></div>';
                        html += '<div class="field"><label style="color: #1e293b;">Guests</label><select><option>1 Guest</option><option>2 Guests</option></select></div>';
                        
                        var btnStyle = 'background: ' + primaryColor + ';';
                        if (buttonFull) if (layout === 'vertical') btnStyle += ' width: 100%;';
                        html += '<div class="field submit-field"><button class="preview-btn" style="' + btnStyle + '">' + buttonText + '</button></div>';
                        
                        html += '</div></div>';
                        return html;
                    }
                    
                    function buildRoomsShortcode() {
                        var parts = ['[gas_rooms'];
                        
                        var columns = document.getElementById('rooms-columns').value;
                        if (columns !== '3') parts.push('columns="' + columns + '"');
                        
                        if (!document.getElementById('rooms-show-map').checked) parts.push('show_map="false"');
                        
                        var propertyId = document.getElementById('rooms-property-id').value;
                        if (propertyId) parts.push('property_id="' + propertyId + '"');
                        
                        return parts.join(' ') + ']';
                    }
                    
                    function buildRoomShortcode() {
                        var parts = ['[gas_room'];
                        
                        var unitId = document.getElementById('room-unit-id').value;
                        if (unitId) parts.push('unit_id="' + unitId + '"');
                        
                        if (!document.getElementById('room-show-map').checked) parts.push('show_map="false"');
                        
                        return parts.join(' ') + ']';
                    }
                    
                    function copyShortcode() {
                        var output = document.getElementById('shortcode-output');
                        var text = output.innerText.replace('📋 Copy', '').trim();
                        
                        navigator.clipboard.writeText(text).then(function() {
                            var btn = output.querySelector('.gas-copy-btn');
                            btn.innerText = '✓ Copied!';
                            btn.classList.add('copied');
                            setTimeout(function() {
                                btn.innerText = '📋 Copy';
                                btn.classList.remove('copied');
                            }, 2000);
                        });
                    }
                    
                    // Sync color inputs
                    document.getElementById('search-primary-color').addEventListener('input', function() {
                        document.getElementById('search-primary-color-text').value = this.value;
                        updateShortcode();
                    });
                    document.getElementById('search-bg-color').addEventListener('input', function() {
                        document.getElementById('search-bg-color-text').value = this.value;
                        updateShortcode();
                    });
                    
                    // Initialize
                    updateShortcode();
                </script>
                
            <?php elseif ($active_tab === 'shortcodes') : ?>
                <!-- SHORTCODES TAB -->
                <h2>📋 Available Shortcodes</h2>
                <table class="widefat" style="max-width: 900px;">
                    <thead>
                        <tr><th>Shortcode</th><th>Description</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>[gas_search]</code></td>
                            <td><strong>Search Widget</strong> - Date/guest selector for your homepage</td>
                        </tr>
                        <tr style="background: #fef3c7;">
                            <td><code>[gas_rooms limit="3" columns="3" show_map="false" show_filters="false"]</code></td>
                            <td><strong>⭐ Featured Rooms</strong> - Clean grid for homepage (no map/filters)</td>
                        </tr>
                        <tr>
                            <td><code>[gas_rooms]</code></td>
                            <td><strong>Rooms Grid</strong> - Shows all rooms with map <em>(for Book Now page)</em></td>
                        </tr>
                        <tr>
                            <td><code>[gas_room]</code></td>
                            <td><strong>Room Detail</strong> - Single room page with booking form (auto-detects from URL)</td>
                        </tr>
                        <tr>
                            <td><code>[gas_checkout]</code></td>
                            <td><strong>Checkout</strong> - Payment page (page slug should be "checkout")</td>
                        </tr>
                    </tbody>
                </table>
                
                <hr>
                <h2>🎨 Search Widget Options</h2>
                <p>Example: <code>[gas_search layout="horizontal" show_location="true" primary_color="#ff6600"]</code></p>
                <table class="widefat" style="max-width: 900px;">
                    <thead>
                        <tr><th>Option</th><th>Values</th><th>Default</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><code>layout</code></td><td>vertical, horizontal, inline</td><td>vertical</td></tr>
                        <tr><td><code>show_location</code></td><td>true, false</td><td>false</td></tr>
                        <tr><td><code>width</code></td><td>Any CSS width</td><td>100%</td></tr>
                        <tr><td><code>max_width</code></td><td>Any CSS width</td><td>600px</td></tr>
                        <tr><td><code>button_text</code></td><td>Any text</td><td>Search</td></tr>
                        <tr><td><code>button_full_width</code></td><td>true, false</td><td>false</td></tr>
                        <tr><td><code>primary_color</code></td><td>Any color</td><td>#2563eb</td></tr>
                        <tr><td><code>background_color</code></td><td>Any color</td><td>white</td></tr>
                        <tr><td><code>border_radius</code></td><td>Any CSS radius</td><td>12px</td></tr>
                        <tr><td><code>class</code></td><td>Custom CSS class</td><td>-</td></tr>
                    </tbody>
                </table>
                
                <hr>
                <h2>🗺️ Rooms Grid Options</h2>
                <p>Example: <code>[gas_rooms columns="3" show_map="true"]</code></p>
                <p style="background: #dbeafe; padding: 10px; border-radius: 6px;"><strong>💡 Featured Rooms Tip:</strong> Use <code>[gas_rooms limit="3" columns="3" show_map="false" show_filters="false"]</code> for a clean homepage section.</p>
                <table class="widefat" style="max-width: 900px;">
                    <thead>
                        <tr><th>Option</th><th>Values</th><th>Default</th></tr>
                    </thead>
                    <tbody>
                        <tr><td><code>columns</code></td><td>1, 2, 3, 4</td><td>3</td></tr>
                        <tr><td><code>limit</code></td><td>Number of rooms to show</td><td>all</td></tr>
                        <tr><td><code>show_map</code></td><td>true, false</td><td>true</td></tr>
                        <tr><td><code>show_filters</code></td><td>true, false</td><td>true</td></tr>
                        <tr><td><code>random</code></td><td>true, false</td><td>false</td></tr>
                        <tr><td><code>room_ids</code></td><td>Comma-separated IDs (e.g. "1,2,3")</td><td>all</td></tr>
                        <tr><td><code>property_id</code></td><td>Property ID number</td><td>all</td></tr>
                    </tbody>
                </table>
                
            <?php elseif ($active_tab === 'css') : ?>
                <!-- CUSTOM CSS TAB -->
                <form method="post" action="options.php">
                    <?php settings_fields('gas_booking_css'); ?>
                    
                    <p style="background: #e7f3ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
                        💡 <strong>Tip:</strong> Add custom CSS to style any component. Use the CSS selectors shown below each box. Changes apply site-wide.
                    </p>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 20px; margin-top: 20px;">
                        
                        <!-- Global CSS -->
                        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                            <h3 style="margin-top: 0;">🌐 Global / Variables</h3>
                            <p class="description">Override CSS variables and global styles</p>
                            <textarea name="gas_css_global" rows="8" style="width: 100%; font-family: monospace; font-size: 13px;"><?php echo esc_textarea(get_option('gas_css_global', '')); ?></textarea>
                            <details style="margin-top: 10px;">
                                <summary style="cursor: pointer; color: #2563eb;">View CSS Variables</summary>
                                <pre style="background: #f5f5f5; padding: 10px; font-size: 11px; overflow-x: auto;">:root {
  --gas-primary: #2563eb;
  --gas-primary-dark: #1d4ed8;
  --gas-text: #1e293b;
  --gas-text-light: #64748b;
  --gas-border: #e2e8f0;
  --gas-bg: #f8fafc;
  --gas-radius: 8px;
  --gas-radius-lg: 12px;
}</pre>
                            </details>
                        </div>
                        
                        <!-- Search Widget CSS -->
                        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                            <h3 style="margin-top: 0;">🔍 Search Widget</h3>
                            <p class="description">Style the search/booking widget on homepage</p>
                            <textarea name="gas_css_search_widget" rows="8" style="width: 100%; font-family: monospace; font-size: 13px;"><?php echo esc_textarea(get_option('gas_css_search_widget', '')); ?></textarea>
                            <details style="margin-top: 10px;">
                                <summary style="cursor: pointer; color: #2563eb;">View Selectors</summary>
                                <pre style="background: #f5f5f5; padding: 10px; font-size: 11px;">.gas-search-widget { }
.gas-search-vertical { }
.gas-search-horizontal { }
.gas-search-inline { }
.gas-search-field { }
.gas-search-field label { }
.gas-search-field input { }
.gas-search-field select { }
.gas-search-button { }</pre>
                            </details>
                        </div>
                        
                        <!-- Room Cards CSS -->
                        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                            <h3 style="margin-top: 0;">🏠 Room Cards</h3>
                            <p class="description">Style the room cards in the grid</p>
                            <textarea name="gas_css_room_cards" rows="8" style="width: 100%; font-family: monospace; font-size: 13px;"><?php echo esc_textarea(get_option('gas_css_room_cards', '')); ?></textarea>
                            <details style="margin-top: 10px;">
                                <summary style="cursor: pointer; color: #2563eb;">View Selectors</summary>
                                <pre style="background: #f5f5f5; padding: 10px; font-size: 11px;">.gas-rooms-grid { }
.gas-room-card { }
.gas-room-card:hover { }
.gas-room-image { }
.gas-room-details { }
.gas-room-details h3 { }
.gas-room-property { }
.gas-room-meta { }
.gas-room-price { }
.gas-view-btn { }</pre>
                            </details>
                        </div>
                        
                        <!-- Rooms Grid/Filter CSS -->
                        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                            <h3 style="margin-top: 0;">📋 Rooms Page Layout</h3>
                            <p class="description">Style the rooms page filter and layout</p>
                            <textarea name="gas_css_rooms_grid" rows="8" style="width: 100%; font-family: monospace; font-size: 13px;"><?php echo esc_textarea(get_option('gas_css_rooms_grid', '')); ?></textarea>
                            <details style="margin-top: 10px;">
                                <summary style="cursor: pointer; color: #2563eb;">View Selectors</summary>
                                <pre style="background: #f5f5f5; padding: 10px; font-size: 11px;">.gas-rooms-page-wrapper { }
.gas-rooms-wrapper { }
.gas-rooms-list { }
.gas-date-filter { }
.gas-filter-field { }
.gas-filter-btn { }</pre>
                            </details>
                        </div>
                        
                        <!-- Room Detail CSS -->
                        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                            <h3 style="margin-top: 0;">🛏️ Room Detail Page</h3>
                            <p class="description">Style the single room detail page</p>
                            <textarea name="gas_css_room_detail" rows="8" style="width: 100%; font-family: monospace; font-size: 13px;"><?php echo esc_textarea(get_option('gas_css_room_detail', '')); ?></textarea>
                            <details style="margin-top: 10px;">
                                <summary style="cursor: pointer; color: #2563eb;">View Selectors</summary>
                                <pre style="background: #f5f5f5; padding: 10px; font-size: 11px;">.gas-room-widget { }
.gas-room-layout { }
.gas-room-main { }
.gas-room-sidebar { }
.gas-room-header { }
.gas-room-title { }
.gas-gallery { }
.gas-tabs { }
.gas-tab-btn { }
.gas-description { }</pre>
                            </details>
                        </div>
                        
                        <!-- Booking Form CSS -->
                        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                            <h3 style="margin-top: 0;">📝 Booking Form</h3>
                            <p class="description">Style the booking card and form</p>
                            <textarea name="gas_css_booking_form" rows="8" style="width: 100%; font-family: monospace; font-size: 13px;"><?php echo esc_textarea(get_option('gas_css_booking_form', '')); ?></textarea>
                            <details style="margin-top: 10px;">
                                <summary style="cursor: pointer; color: #2563eb;">View Selectors</summary>
                                <pre style="background: #f5f5f5; padding: 10px; font-size: 11px;">.gas-booking-card { }
.gas-booking-card-header { }
.gas-price-display { }
.gas-date-inputs { }
.gas-date-field { }
.gas-guest-field { }
.gas-price-breakdown { }
.gas-book-btn { }
.gas-booking-form { }
.gas-submit-btn { }</pre>
                            </details>
                        </div>
                        
                        <!-- Calendar CSS -->
                        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                            <h3 style="margin-top: 0;">📅 Availability Calendar</h3>
                            <p class="description">Style the availability calendar</p>
                            <textarea name="gas_css_calendar" rows="8" style="width: 100%; font-family: monospace; font-size: 13px;"><?php echo esc_textarea(get_option('gas_css_calendar', '')); ?></textarea>
                            <details style="margin-top: 10px;">
                                <summary style="cursor: pointer; color: #2563eb;">View Selectors</summary>
                                <pre style="background: #f5f5f5; padding: 10px; font-size: 11px;">.gas-calendar-container { }
.gas-calendar { }
.gas-calendar-header { }
.gas-calendar-grid { }
.gas-cal-day { }
.gas-cal-day.available { }
.gas-cal-day.unavailable { }
.gas-calendar-legend { }</pre>
                            </details>
                        </div>
                        
                        <!-- Map CSS -->
                        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                            <h3 style="margin-top: 0;">🗺️ Map</h3>
                            <p class="description">Style the map and markers</p>
                            <textarea name="gas_css_map" rows="8" style="width: 100%; font-family: monospace; font-size: 13px;"><?php echo esc_textarea(get_option('gas_css_map', '')); ?></textarea>
                            <details style="margin-top: 10px;">
                                <summary style="cursor: pointer; color: #2563eb;">View Selectors</summary>
                                <pre style="background: #f5f5f5; padding: 10px; font-size: 11px;">.gas-rooms-map-panel { }
.gas-rooms-map { }
.gas-map-container { }
.gas-map { }
.gas-marker-pin { }
.gas-map-popup { }
.gas-map-popup-title { }
.gas-map-popup-link { }</pre>
                            </details>
                        </div>
                        
                        <!-- Buttons CSS -->
                        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                            <h3 style="margin-top: 0;">🔘 Buttons</h3>
                            <p class="description">Style all buttons globally</p>
                            <textarea name="gas_css_buttons" rows="8" style="width: 100%; font-family: monospace; font-size: 13px;"><?php echo esc_textarea(get_option('gas_css_buttons', '')); ?></textarea>
                            <details style="margin-top: 10px;">
                                <summary style="cursor: pointer; color: #2563eb;">View Selectors</summary>
                                <pre style="background: #f5f5f5; padding: 10px; font-size: 11px;">.gas-search-button { }
.gas-filter-btn { }
.gas-view-btn { }
.gas-book-btn { }
.gas-submit-btn { }
.gas-tab-btn { }
.gas-tab-btn.active { }</pre>
                            </details>
                        </div>
                        
                    </div>
                    
                    <?php submit_button('Save Custom CSS'); ?>
                </form>
                
            <?php elseif ($active_tab === 'ai') : ?>
                <!-- AI INTEGRATION TAB -->
                <h2>🤖 AI Builder Integration</h2>
                <p>This plugin is designed to work seamlessly with AI website builders. Here's how AI tools can customize the booking system:</p>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-top: 20px;">
                    
                    <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                        <h3 style="margin-top: 0;">📝 Shortcode Customization</h3>
                        <p>AI can generate shortcodes with inline styling:</p>
                        <pre style="background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 12px;">[gas_search 
    layout="horizontal"
    primary_color="#your-brand-color"
    background_color="#f5f5f5"
    border_radius="20px"
    class="ai-custom-search"
]</pre>
                    </div>
                    
                    <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                        <h3 style="margin-top: 0;">🎨 CSS Class Hooks</h3>
                        <p>All components have semantic CSS classes for targeting:</p>
                        <pre style="background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 12px;">/* AI can add to theme CSS */
.gas-search-widget {
    /* Search widget styles */
}
.gas-room-card {
    /* Room card styles */
}
.gas-booking-card {
    /* Booking form styles */
}</pre>
                    </div>
                    
                    <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                        <h3 style="margin-top: 0;">🔧 CSS Variables</h3>
                        <p>Override theme colors using CSS variables:</p>
                        <pre style="background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 12px;">:root {
    --gas-primary: #ff6600;
    --gas-primary-dark: #cc5200;
    --gas-radius: 16px;
    --gas-radius-lg: 24px;
}</pre>
                    </div>
                    
                    <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                        <h3 style="margin-top: 0;">📋 Complete Class Reference</h3>
                        <p>Full list of CSS classes available:</p>
                        <div style="max-height: 200px; overflow-y: auto; background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 11px; font-family: monospace;">
                            <strong>Search:</strong> .gas-search-widget, .gas-search-vertical, .gas-search-horizontal, .gas-search-inline, .gas-search-field, .gas-search-button<br><br>
                            <strong>Rooms Grid:</strong> .gas-rooms-page-wrapper, .gas-rooms-wrapper, .gas-rooms-list, .gas-rooms-grid, .gas-rooms-map-panel, .gas-date-filter<br><br>
                            <strong>Room Cards:</strong> .gas-room-card, .gas-room-image, .gas-room-details, .gas-room-property, .gas-room-meta, .gas-room-price, .gas-view-btn<br><br>
                            <strong>Room Detail:</strong> .gas-room-widget, .gas-room-layout, .gas-room-main, .gas-room-sidebar, .gas-room-header, .gas-room-title, .gas-gallery, .gas-lightbox<br><br>
                            <strong>Tabs:</strong> .gas-tabs, .gas-tabs-nav, .gas-tab-btn, .gas-tab-content<br><br>
                            <strong>Booking:</strong> .gas-booking-card, .gas-price-display, .gas-date-inputs, .gas-book-btn, .gas-booking-form, .gas-submit-btn<br><br>
                            <strong>Calendar:</strong> .gas-calendar-container, .gas-calendar, .gas-calendar-header, .gas-calendar-grid, .gas-cal-day<br><br>
                            <strong>Map:</strong> .gas-rooms-map, .gas-map-container, .gas-map, .gas-marker-pin, .gas-map-popup
                        </div>
                    </div>
                    
                </div>
                
                <hr>
                <h3>🚀 AI Prompt Example</h3>
                <p>Here's a prompt AI builders can use:</p>
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border: 1px solid #f59e0b;">
                    <em>"Create a hotel booking page using the GAS Booking plugin. Use [gas_search layout="horizontal"] on the homepage hero section with a dark background overlay. On the /book-now/ page, use [gas_rooms] to show available rooms. Style the .gas-room-card with rounded corners and subtle shadows. Use brand color #2563eb for all .gas-search-button and .gas-book-btn elements."</em>
                </div>
                
            <?php elseif ($active_tab === 'seo') : ?>
                <!-- SEO SETTINGS TAB -->
                <form method="post" action="options.php">
                    <?php settings_fields('gas_booking_seo'); ?>
                    
                    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                        <h2 style="margin: 0 0 10px 0; color: white;">🔍 SEO & Analytics</h2>
                        <p style="margin: 0; opacity: 0.9;">Improve your search engine visibility and track visitor behavior. These settings inject meta tags, schema markup, and analytics scripts into your site's &lt;head&gt; section.</p>
                    </div>
                    
                    <h3>📊 Analytics & Tracking</h3>
                    <table class="form-table">
                        <tr>
                            <th>Google Analytics ID</th>
                            <td>
                                <input type="text" name="gas_google_analytics_id" value="<?php echo esc_attr(get_option('gas_google_analytics_id', '')); ?>" class="regular-text" placeholder="G-XXXXXXXXXX" />
                                <p class="description">Your GA4 Measurement ID (starts with G-). Leave empty to disable.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Google Tag Manager ID</th>
                            <td>
                                <input type="text" name="gas_google_tag_manager_id" value="<?php echo esc_attr(get_option('gas_google_tag_manager_id', '')); ?>" class="regular-text" placeholder="GTM-XXXXXXX" />
                                <p class="description">Your GTM Container ID. Leave empty to disable.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Facebook Pixel ID</th>
                            <td>
                                <input type="text" name="gas_facebook_pixel_id" value="<?php echo esc_attr(get_option('gas_facebook_pixel_id', '')); ?>" class="regular-text" placeholder="1234567890" />
                                <p class="description">Your Facebook Pixel ID for conversion tracking. Leave empty to disable.</p>
                            </td>
                        </tr>
                    </table>
                    
                    <hr>
                    
                    <h3>🏷️ Meta Tags</h3>
                    <table class="form-table">
                        <tr>
                            <th>Enable SEO Meta Tags</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="gas_seo_enabled" value="1" <?php checked(get_option('gas_seo_enabled', '1'), '1'); ?> />
                                    Inject meta description, Open Graph, and Twitter Card tags
                                </label>
                                <p class="description">Disable if you're using another SEO plugin like Yoast or RankMath.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Default Meta Title</th>
                            <td>
                                <input type="text" name="gas_seo_meta_title" value="<?php echo esc_attr(get_option('gas_seo_meta_title', '')); ?>" class="large-text" placeholder="e.g., Book Direct | Your Property Name" />
                                <p class="description">Used on pages without their own title. Leave empty to use WordPress site title. <strong>Tip:</strong> Sync from GAS Admin for automatic property-specific titles.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Default Meta Description</th>
                            <td>
                                <textarea name="gas_seo_meta_description" rows="3" class="large-text" placeholder="e.g., Book your stay at our beautiful property. Best rates guaranteed when you book direct."><?php echo esc_textarea(get_option('gas_seo_meta_description', '')); ?></textarea>
                                <p class="description">150-160 characters recommended. Used for search results and social sharing.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Default OG Image URL</th>
                            <td>
                                <input type="url" name="gas_seo_og_image" value="<?php echo esc_attr(get_option('gas_seo_og_image', '')); ?>" class="large-text" placeholder="https://yoursite.com/images/og-image.jpg" />
                                <p class="description">Image shown when sharing on Facebook/LinkedIn. Recommended: 1200x630px.</p>
                            </td>
                        </tr>
                    </table>
                    
                    <hr>
                    
                    <h3>📋 Schema.org Markup</h3>
                    <table class="form-table">
                        <tr>
                            <th>Include LodgingBusiness Schema</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="gas_seo_include_schema" value="1" <?php checked(get_option('gas_seo_include_schema', '1'), '1'); ?> />
                                    Add structured data for Google rich results
                                </label>
                                <p class="description">Helps your property appear in Google's hotel/accommodation search features.</p>
                            </td>
                        </tr>
                        <tr>
                            <th>Include FAQ Schema</th>
                            <td>
                                <label>
                                    <input type="checkbox" name="gas_seo_include_faqs" value="1" <?php checked(get_option('gas_seo_include_faqs', '1'), '1'); ?> />
                                    Fetch and inject FAQPage schema from GAS
                                </label>
                                <p class="description">Displays your FAQs in Google search results. Requires FAQs to be set up in GAS Admin.</p>
                            </td>
                        </tr>
                    </table>
                    
                    <?php submit_button('Save SEO Settings'); ?>
                </form>
                
                <hr>
                
                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #86efac;">
                    <h3 style="margin-top: 0;">✅ What Gets Injected</h3>
                    <p>When enabled, this plugin adds to your site's <code>&lt;head&gt;</code>:</p>
                    <ul style="margin-left: 20px;">
                        <li><strong>Meta Description</strong> - Helps search engines understand your page</li>
                        <li><strong>Open Graph Tags</strong> - Controls how your site looks when shared on Facebook/LinkedIn</li>
                        <li><strong>Twitter Cards</strong> - Controls appearance when shared on Twitter/X</li>
                        <li><strong>LodgingBusiness Schema</strong> - Structured data for Google hotel search</li>
                        <li><strong>FAQPage Schema</strong> - Makes your FAQs appear in search results</li>
                        <li><strong>Analytics Scripts</strong> - Google Analytics, GTM, Facebook Pixel</li>
                    </ul>
                    <p style="margin-bottom: 0;"><strong>Tip:</strong> Use the "Sync from GAS" button on the General tab to pull SEO settings from GAS Admin.</p>
                </div>
                
            <?php endif; ?>
            
            </div>
        </div>
        <?php
    }
    
    public function enqueue_scripts() {
        // Load Google Fonts based on API settings or Customizer
        $this->enqueue_booking_fonts();
        
        // Get current language
        $current_lang = $this->get_current_language();
        
        // Flatpickr date picker
        wp_enqueue_style('flatpickr', 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css', array(), '4.6.13');
        wp_enqueue_script('flatpickr', 'https://cdn.jsdelivr.net/npm/flatpickr', array(), '4.6.13', true);
        
        // Load flatpickr locale if not English
        $flatpickr_locales = array('fr', 'es', 'de', 'nl', 'it', 'pt', 'ru', 'pl', 'cs', 'el', 'tr', 'sv', 'da', 'no', 'fi', 'hu', 'ro', 'hr', 'zh', 'ja', 'ko', 'th', 'vi', 'ar', 'he');
        if (in_array($current_lang, $flatpickr_locales)) {
            wp_enqueue_script('flatpickr-locale', 'https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/' . $current_lang . '.js', array('flatpickr'), '4.6.13', true);
        }
        
        // Flatpickr custom overrides - today vs selected styling
        $flatpickr_overrides = "
            /* Today - subtle underline instead of circle */
            .flatpickr-day.today:not(.selected) {
                border-color: transparent !important;
                background: transparent !important;
                color: inherit;
                text-decoration: underline;
                text-underline-offset: 3px;
            }
            .flatpickr-day.today:not(.selected):hover {
                background: #e6e6e6 !important;
            }
            /* Selected date - gold circle */
            .flatpickr-day.selected,
            .flatpickr-day.startRange,
            .flatpickr-day.endRange {
                background: #d4a84b !important;
                border-color: #d4a84b !important;
                color: #1a1a2e !important;
            }
            /* Range between dates */
            .flatpickr-day.inRange {
                background: rgba(212, 168, 75, 0.2) !important;
                border-color: transparent !important;
            }
            /* Disabled/past dates */
            .flatpickr-day.flatpickr-disabled,
            .flatpickr-day.flatpickr-disabled:hover,
            .flatpickr-day.prevMonthDay,
            .flatpickr-day.nextMonthDay {
                color: #999 !important;
                cursor: not-allowed;
            }
        ";
        wp_add_inline_style('flatpickr', $flatpickr_overrides);
        
        // Leaflet map library
        wp_enqueue_style('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', array(), '1.9.4');
        wp_enqueue_script('leaflet', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', array(), '1.9.4', true);
        
        // Stripe JS for payments
        wp_enqueue_script('stripe-js', 'https://js.stripe.com/v3/', array(), null, true);
        
        wp_enqueue_style('gas-booking', GAS_BOOKING_PLUGIN_URL . 'assets/css/gas-booking.css', array('flatpickr', 'leaflet'), GAS_BOOKING_VERSION);
        wp_enqueue_script('gas-booking', GAS_BOOKING_PLUGIN_URL . 'assets/js/gas-booking.js', array('jquery', 'flatpickr', 'leaflet', 'stripe-js'), time(), true);
        
        wp_localize_script('gas-booking', 'gasBooking', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'apiUrl' => get_option('gas_api_url', 'https://admin.gas.travel'),
            'clientId' => get_option('gas_client_id', ''),
            'licenseKey' => get_option('gas_license_key', ''),
            'roomUrlBase' => get_option('gas_room_url_base', '/room/'),
            'searchResultsUrl' => get_option('gas_search_results_url', '/book-now/'),
            'checkoutUrl' => get_option('gas_checkout_url', '/checkout/'),
            'currency' => get_option('gas_currency_symbol', ''),
            'pricingTier' => get_option('gas_pricing_tier', 'standard'),
            'currentLanguage' => $current_lang,
            'nonce' => wp_create_nonce('gas_booking_nonce')
        ));
        
        // Output custom CSS from settings - add to footer so it overrides inline styles
        add_action('wp_footer', array($this, 'output_custom_css'));
        add_action('wp_footer', array($this, 'fix_flatpickr_mobile'), 99);
    }
    
    /**
     * Output custom CSS in footer to override inline styles
     */
    public function output_custom_css() {
        $custom_css = '';
        
        $css_sections = array(
            'gas_css_global',
            'gas_css_search_widget',
            'gas_css_room_cards',
            'gas_css_rooms_grid',
            'gas_css_room_detail',
            'gas_css_booking_form',
            'gas_css_calendar',
            'gas_css_map',
            'gas_css_buttons'
        );
        
        foreach ($css_sections as $section) {
            $css = get_option($section, '');
            if (!empty(trim($css))) {
                $custom_css .= "/* " . str_replace('gas_css_', '', $section) . " */\n" . $css . "\n\n";
            }
        }
        
        if (!empty($custom_css)) {
            echo "\n<style id=\"gas-custom-css\">\n" . $custom_css . "</style>\n";
        }
        
        // Output font CSS variables
        $this->output_font_css();
    }
    
    /**
     * Fix flatpickr-mobile native date inputs on iOS
     * iOS creates type="date" inputs that ignore CSS border/radius styles
     * This JS fix applies inline styles after flatpickr initializes
     */
    public function fix_flatpickr_mobile() {
        ?>
        <script>
        (function() {
            function fixFlatpickrMobile() {
                document.querySelectorAll('input.flatpickr-mobile').forEach(function(el) {
                    var field = el.closest('.gas-search-field') || el.closest('.gas-date-field');
                    if (!field) return;
                    var siblingInput = field.querySelector('select') || field.querySelector('input:not(.flatpickr-mobile):not(.flatpickr-input):not([type="hidden"])');
                    if (siblingInput) {
                        var computed = window.getComputedStyle(siblingInput);
                        el.style.cssText = 'border: ' + computed.border + ' !important; border-radius: ' + computed.borderRadius + ' !important; -webkit-appearance: none !important; appearance: none !important; padding: ' + computed.padding + ' !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; background: ' + computed.backgroundColor + ' !important; color: ' + computed.color + ' !important; height: ' + computed.height + ' !important; font-size: 16px !important;';
                    } else {
                        el.style.cssText = 'border: 1px solid rgba(255,255,255,0.3) !important; border-radius: 8px !important; -webkit-appearance: none !important; appearance: none !important; padding: 12px 14px !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; height: 46px !important; font-size: 16px !important;';
                    }
                });
            }
            if (document.readyState === 'complete') {
                setTimeout(fixFlatpickrMobile, 500);
            } else {
                window.addEventListener('load', function() { setTimeout(fixFlatpickrMobile, 500); });
            }
            var observer = new MutationObserver(fixFlatpickrMobile);
            observer.observe(document.body, { childList: true, subtree: true });
        })();
        </script>
        <?php
    }
    
    /**
     * Get font settings from API or Customizer
     */
    private function get_font_settings() {
        // Font code to CSS font-family mapping
        $font_family_map = array(
            'playfair' => "'Playfair Display', serif",
            'montserrat' => "'Montserrat', sans-serif",
            'lora' => "'Lora', serif",
            'poppins' => "'Poppins', sans-serif",
            'merriweather' => "'Merriweather', serif",
            'raleway' => "'Raleway', sans-serif",
            'oswald' => "'Oswald', sans-serif",
            'inter' => "'Inter', sans-serif",
            'roboto' => "'Roboto', sans-serif",
            'opensans' => "'Open Sans', sans-serif",
            'lato' => "'Lato', sans-serif",
            'sourcesans' => "'Source Sans Pro', sans-serif",
            'nunito' => "'Nunito', sans-serif",
        );
        
        $heading_font = 'inter';
        $body_font = 'inter';
        
        // Check if this is a GAS-connected site - fonts come from API
        $client_id = get_option('gas_client_id', '');
        $current_theme = wp_get_theme();
        $is_gas_theme = strpos(strtolower($current_theme->get('Name')), 'developer') !== false ||
                        strpos(strtolower($current_theme->get('Name')), 'gas') !== false ||
                        !empty($client_id); // Any site with a GAS client ID should use API fonts
        
        if ($is_gas_theme && !empty($client_id)) {
            // Try to get from cached API settings first (short cache for responsiveness)
            $cache_key = 'gas_booking_api_config_' . $client_id;
            $api_cache = get_transient($cache_key);
            
            if (!$api_cache) {
                // Fetch from API
                $client_id = get_option('gas_client_id', '');
                if ($client_id) {
                    $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
                    $response = wp_remote_get("{$api_url}/api/public/client/{$client_id}/site-config", array(
                        'timeout' => 5,
                        'headers' => array(
                            'Cache-Control' => 'no-cache',
                        ),
                    ));
                    
                    if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                        $data = json_decode(wp_remote_retrieve_body($response), true);
                        if (!empty($data['config'])) {
                            $api_cache = $data['config'];
                            set_transient($cache_key, $api_cache, 60); // Cache for 1 minute only
                        }
                    }
                }
            }
            
            // Get fonts from API config
            if (!empty($api_cache['website']['styles']['heading-font'])) {
                $heading_font = $api_cache['website']['styles']['heading-font'];
            }
            if (!empty($api_cache['website']['styles']['body-font'])) {
                $body_font = $api_cache['website']['styles']['body-font'];
            }
        } else {
            // Get from Customizer settings (for standalone use)
            $heading_font = get_theme_mod('gas_booking_heading_font', 'inter');
            $body_font = get_theme_mod('gas_booking_body_font', 'inter');
        }
        
        // Normalize font codes (handle variations)
        $heading_font = $this->normalize_font_code($heading_font);
        $body_font = $this->normalize_font_code($body_font);
        
        // Convert to CSS font-family
        $heading_family = isset($font_family_map[$heading_font]) ? $font_family_map[$heading_font] : "'Inter', sans-serif";
        $body_family = isset($font_family_map[$body_font]) ? $font_family_map[$body_font] : "'Inter', sans-serif";
        
        return array(
            'heading_code' => $heading_font,
            'body_code' => $body_font,
            'heading_family' => $heading_family,
            'body_family' => $body_family,
        );
    }
    
    /**
     * Normalize font code to standard format
     */
    private function normalize_font_code($font) {
        $font = strtolower(trim($font));
        
        // Map common variations to standard codes
        $normalize_map = array(
            'playfair display' => 'playfair',
            'playfairdisplay' => 'playfair',
            'open sans' => 'opensans',
            'source sans pro' => 'sourcesans',
            'sourcesanspro' => 'sourcesans',
        );
        
        if (isset($normalize_map[$font])) {
            return $normalize_map[$font];
        }
        
        // Remove spaces for matching
        $font_no_spaces = str_replace(' ', '', $font);
        if (isset($normalize_map[$font_no_spaces])) {
            return $normalize_map[$font_no_spaces];
        }
        
        return $font;
    }
    
    /**
     * Enqueue Google Fonts for booking widget
     */
    private function enqueue_booking_fonts() {
        $fonts = $this->get_font_settings();
        
        // Font code to Google Fonts URL mapping
        $google_font_map = array(
            'playfair' => 'Playfair+Display:wght@400;600;700',
            'montserrat' => 'Montserrat:wght@400;500;600;700',
            'lora' => 'Lora:wght@400;500;600;700',
            'poppins' => 'Poppins:wght@400;500;600;700',
            'merriweather' => 'Merriweather:wght@400;700',
            'raleway' => 'Raleway:wght@400;500;600;700',
            'oswald' => 'Oswald:wght@400;500;600;700',
            'inter' => 'Inter:wght@400;500;600;700',
            'roboto' => 'Roboto:wght@400;500;700',
            'opensans' => 'Open+Sans:wght@400;500;600;700',
            'lato' => 'Lato:wght@400;700',
            'sourcesans' => 'Source+Sans+Pro:wght@400;600;700',
            'nunito' => 'Nunito:wght@400;500;600;700',
        );
        
        $font_families = array();
        
        // Normalize codes (handle full names)
        $heading_code = strtolower(str_replace(' ', '', $fonts['heading_code']));
        $body_code = strtolower(str_replace(' ', '', $fonts['body_code']));
        
        // Map common full name variations to codes
        $code_normalize = array(
            'playfairdisplay' => 'playfair',
            'opensans' => 'opensans',
            'sourcesanspro' => 'sourcesans',
        );
        
        if (isset($code_normalize[$heading_code])) {
            $heading_code = $code_normalize[$heading_code];
        }
        if (isset($code_normalize[$body_code])) {
            $body_code = $code_normalize[$body_code];
        }
        
        if (isset($google_font_map[$heading_code])) {
            $font_families[] = $google_font_map[$heading_code];
        }
        if (isset($google_font_map[$body_code]) && $body_code !== $heading_code) {
            $font_families[] = $google_font_map[$body_code];
        }
        
        if (!empty($font_families)) {
            $font_url = 'https://fonts.googleapis.com/css2?family=' . implode('&family=', $font_families) . '&display=swap';
            wp_enqueue_style('gas-booking-fonts', $font_url, array(), null);
        }
    }
    
    /**
     * Output font CSS variables for booking widget
     */
    private function output_font_css() {
        $fonts = $this->get_font_settings();
        $buttons = $this->get_button_settings();
        
        $font_css = "
<style id=\"gas-booking-fonts\">
:root {
    --gas-heading-font: {$fonts['heading_family']};
    --gas-body-font: {$fonts['body_family']};
    --gas-btn-bg: {$buttons['btn_bg']};
    --gas-btn-text: {$buttons['btn_text']};
    --gas-btn-radius: {$buttons['btn_radius']}px;
    --gas-primary: {$buttons['btn_bg']};
    --gas-primary-dark: {$buttons['btn_bg']};
}
/* Apply fonts to booking widget elements */
.gas-search-widget,
.gas-rooms-grid,
.gas-room-detail,
.gas-booking-form,
.gas-checkout-page,
.gas-offers-page,
[class*=\"gas-\"] {
    font-family: var(--gas-body-font);
}
.gas-search-widget h1, .gas-search-widget h2, .gas-search-widget h3, .gas-search-widget h4,
.gas-rooms-grid h1, .gas-rooms-grid h2, .gas-rooms-grid h3, .gas-rooms-grid h4,
.gas-room-detail h1, .gas-room-detail h2, .gas-room-detail h3, .gas-room-detail h4,
.gas-booking-form h1, .gas-booking-form h2, .gas-booking-form h3, .gas-booking-form h4,
.gas-checkout-page h1, .gas-checkout-page h2, .gas-checkout-page h3, .gas-checkout-page h4,
.gas-offers-page h1, .gas-offers-page h2, .gas-offers-page h3, .gas-offers-page h4,
.gas-room-card-title,
.gas-section-title,
[class*=\"gas-\"] h1, [class*=\"gas-\"] h2, [class*=\"gas-\"] h3, [class*=\"gas-\"] h4 {
    font-family: var(--gas-heading-font);
}
/* Global Button Styles */
.gas-btn,
.gas-search-widget button,
.gas-rooms-grid button,
.gas-room-detail button,
.gas-booking-form button[type=\"submit\"],
.gas-checkout-page button[type=\"submit\"],
[class*=\"gas-\"] .btn-primary,
[class*=\"gas-\"] button.primary {
    background: var(--gas-btn-bg);
    color: var(--gas-btn-text);
    border-radius: var(--gas-btn-radius);
    border: none;
    transition: all 0.2s ease;
}
.gas-btn:hover,
.gas-search-widget button:hover,
.gas-rooms-grid button:hover,
.gas-room-detail button:hover,
.gas-booking-form button[type=\"submit\"]:hover,
.gas-checkout-page button[type=\"submit\"]:hover,
[class*=\"gas-\"] .btn-primary:hover,
[class*=\"gas-\"] button.primary:hover {
    filter: brightness(0.9);
}
</style>";
        
        echo $font_css;
    }
    
    /**
     * Get button settings from API or Customizer
     */
    private function get_button_settings() {
        $btn_bg = '#2563eb';
        $btn_text = '#ffffff';
        $btn_radius = '8';
        
        // Check if GAS theme is active
        $current_theme = wp_get_theme();
        $is_gas_theme = strpos(strtolower($current_theme->get('Name')), 'developer') !== false ||
                        strpos(strtolower($current_theme->get('Name')), 'gas') !== false;
        
        if ($is_gas_theme) {
            // Get from API cache
            $client_id = get_option('gas_client_id', '');
            $cache_key = 'gas_booking_api_config_' . $client_id;
            $api_cache = get_transient($cache_key);
            
            if (!$api_cache) {
                // Fetch fresh
                if ($client_id) {
                    $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
                    $response = wp_remote_get("{$api_url}/api/public/client/{$client_id}/site-config", array(
                        'timeout' => 5,
                    ));
                    
                    if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                        $data = json_decode(wp_remote_retrieve_body($response), true);
                        if (!empty($data['config'])) {
                            $api_cache = $data['config'];
                            set_transient($cache_key, $api_cache, 60);
                        }
                    }
                }
            }
            
            if (!empty($api_cache['website']['styles']['btn-primary-bg'])) {
                $btn_bg = $api_cache['website']['styles']['btn-primary-bg'];
            }
            if (!empty($api_cache['website']['styles']['btn-primary-text'])) {
                $btn_text = $api_cache['website']['styles']['btn-primary-text'];
            }
            if (!empty($api_cache['website']['styles']['btn-radius'])) {
                $btn_radius = $api_cache['website']['styles']['btn-radius'];
            }
        } else {
            // Get from Customizer
            $btn_bg = get_theme_mod('gas_booking_btn_bg', '#2563eb');
            $btn_text = get_theme_mod('gas_booking_btn_text', '#ffffff');
            $btn_radius = get_theme_mod('gas_booking_btn_radius', '8');
        }
        
        return array(
            'btn_bg' => $btn_bg,
            'btn_text' => $btn_text,
            'btn_radius' => $btn_radius,
        );
    }
    
    /**
     * Get the effective button color - from API for GAS theme, or from WordPress option
     * This is used throughout the plugin for consistent button styling
     */
    public function get_effective_button_color() {
        // Return cached value if available
        if ($this->effective_button_color !== null) {
            return $this->effective_button_color;
        }
        
        // Default from WordPress option
        $button_color = get_option('gas_button_color', '#667eea');
        
        // Check if GAS theme is active - if so, use API color
        $current_theme = wp_get_theme();
        $is_gas_theme = strpos(strtolower($current_theme->get('Name')), 'developer') !== false ||
                        strpos(strtolower($current_theme->get('Name')), 'gas') !== false;
        
        if ($is_gas_theme) {
            $client_id = get_option('gas_client_id', '');
            if ($client_id) {
                $cache_key = 'gas_booking_api_config_' . $client_id;
                $api_cache = get_transient($cache_key);
                
                if (!$api_cache) {
                    // Fetch fresh
                    $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
                    $response = wp_remote_get("{$api_url}/api/public/client/{$client_id}/site-config", array(
                        'timeout' => 5,
                    ));
                    
                    if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                        $data = json_decode(wp_remote_retrieve_body($response), true);
                        if (!empty($data['config'])) {
                            $api_cache = $data['config'];
                            set_transient($cache_key, $api_cache, 60);
                        }
                    }
                }
                
                if (!empty($api_cache['website']['styles']['btn-primary-bg'])) {
                    $button_color = $api_cache['website']['styles']['btn-primary-bg'];
                } elseif (!empty($api_cache['website']['featured']['btn-bg'])) {
                    $button_color = $api_cache['website']['featured']['btn-bg'];
                }
            }
        }
        
        // Cache and return
        $this->effective_button_color = $button_color;
        return $button_color;
    }
    
    /**
     * Inject SEO Meta Tags, Schema, and Analytics
     * This runs early in wp_head to ensure meta tags are near the top
     */
    public function inject_seo_meta() {
        // Check if SEO is enabled
        if (!get_option('gas_seo_enabled', '1')) {
            // Even if meta disabled, still inject analytics if configured
            $this->inject_analytics();
            return;
        }
        
        $client_id = get_option('gas_client_id', '');
        $site_name = get_bloginfo('name');
        $site_url = home_url();
        $current_url = home_url($_SERVER['REQUEST_URI']);
        
        // Detect current page type
        $page_type = $this->detect_page_type();
        
        // Get page-specific SEO (falls back to default)
        $page_seo = $this->get_page_seo($page_type);
        $meta_title = $page_seo['title'];
        $meta_description = $page_seo['description'];
        $og_image = get_option('gas_seo_og_image', '');
        
        // Use site title as fallback
        if (empty($meta_title)) {
            $meta_title = $site_name;
        }
        
        // Only inject if we have a description
        if (!empty($meta_description)) {
            echo '<meta name="description" content="' . esc_attr($meta_description) . '">' . "\n";
        }

        // Google Search Console verification
        $google_verification = get_option('gas_google_site_verification', '');
        if (!empty($google_verification)) {
            echo '<meta name="google-site-verification" content="' . esc_attr($google_verification) . '">' . "\n";
        }

        // Open Graph tags
        echo '<!-- GAS Booking SEO - Page: ' . esc_attr($page_type) . ' -->' . "\n";
        echo '<meta property="og:type" content="website">' . "\n";
        echo '<meta property="og:site_name" content="' . esc_attr($site_name) . '">' . "\n";
        echo '<meta property="og:title" content="' . esc_attr($meta_title) . '">' . "\n";
        if (!empty($meta_description)) {
            echo '<meta property="og:description" content="' . esc_attr($meta_description) . '">' . "\n";
        }
        echo '<meta property="og:url" content="' . esc_url($current_url) . '">' . "\n";
        if (!empty($og_image)) {
            echo '<meta property="og:image" content="' . esc_url($og_image) . '">' . "\n";
        }
        
        // Twitter Card tags
        echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
        echo '<meta name="twitter:title" content="' . esc_attr($meta_title) . '">' . "\n";
        if (!empty($meta_description)) {
            echo '<meta name="twitter:description" content="' . esc_attr($meta_description) . '">' . "\n";
        }
        if (!empty($og_image)) {
            echo '<meta name="twitter:image" content="' . esc_url($og_image) . '">' . "\n";
        }
        
        // Schema.org LodgingBusiness markup
        if (get_option('gas_seo_include_schema', '1')) {
            $this->inject_schema($client_id, $site_name, $site_url);
        }
        
        // FAQ Schema (fetched from GAS API)
        if (get_option('gas_seo_include_faqs', '1') && !empty($client_id)) {
            $this->inject_faq_schema($client_id);
        }
        
        // Analytics scripts
        $this->inject_analytics();
    }
    
    /**
     * Inject LodgingBusiness Schema
     */
    private function inject_schema($client_id, $site_name, $site_url) {
        $business_name = get_option('gas_footer_business_name', $site_name);
        $address = get_option('gas_footer_address', '');
        $phone = get_option('gas_footer_phone', '');
        $email = get_option('gas_footer_email', '');
        
        $schema = array(
            '@context' => 'https://schema.org',
            '@type' => 'LodgingBusiness',
            'name' => $business_name,
            'url' => $site_url,
        );
        
        if (!empty($phone)) {
            $schema['telephone'] = $phone;
        }
        
        if (!empty($email)) {
            $schema['email'] = $email;
        }
        
        if (!empty($address)) {
            $schema['address'] = array(
                '@type' => 'PostalAddress',
                'streetAddress' => $address,
            );
        }
        
        $og_image = get_option('gas_seo_og_image', '');
        if (!empty($og_image)) {
            $schema['image'] = $og_image;
        }
        
        echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . '</script>' . "\n";
    }
    
    /**
     * Inject FAQ Schema from GAS API
     */
    private function inject_faq_schema($client_id) {
        // Try to get cached FAQ schema
        $cache_key = 'gas_faq_schema_' . $client_id;
        $cached = get_transient($cache_key);
        
        if ($cached !== false) {
            if (!empty($cached)) {
                echo $cached;
            }
            return;
        }
        
        // Fetch from GAS API
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $response = wp_remote_get("{$api_url}/api/public/faqs/{$client_id}/schema", array(
            'timeout' => 5,
            'sslverify' => false
        ));
        
        if (!is_wp_error($response)) {
            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);
            
            if (!empty($data) && isset($data['@context'])) {
                $schema_output = '<script type="application/ld+json">' . wp_json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . '</script>' . "\n";
                // Cache for 1 hour
                set_transient($cache_key, $schema_output, HOUR_IN_SECONDS);
                echo $schema_output;
            } else {
                // Cache empty result for 1 hour
                set_transient($cache_key, '', HOUR_IN_SECONDS);
            }
        }
    }
    
    /**
     * Detect current page type based on URL/shortcode
     */
    /**
     * Convert currency code to symbol
     */
    private function get_currency_symbol($code) {
        $symbols = array(
            'USD' => '$', 'GBP' => '£', 'EUR' => '€', 'AUD' => 'A$', 'CAD' => 'C$',
            'JPY' => '¥', 'CNY' => '¥', 'INR' => '₹', 'CHF' => 'CHF ', 'SEK' => 'kr',
            'NOK' => 'kr', 'DKK' => 'kr', 'NZD' => 'NZ$', 'SGD' => 'S$', 'HKD' => 'HK$',
            'MXN' => 'MX$', 'BRL' => 'R$', 'ZAR' => 'R', 'THB' => '฿', 'MYR' => 'RM',
            'IDR' => 'Rp', 'PHP' => '₱', 'VND' => '₫', 'KRW' => '₩', 'TWD' => 'NT$',
            'AED' => 'د.إ', 'SAR' => '﷼', 'TRY' => '₺', 'PLN' => 'zł', 'CZK' => 'Kč',
            'HUF' => 'Ft', 'ILS' => '₪', 'RUB' => '₽', 'COP' => 'COL$', 'ARS' => 'AR$'
        );
        // If it's already a symbol or short code, return as-is
        if (strlen($code) <= 3 && !ctype_alpha($code)) {
            return $code;
        }
        return isset($symbols[$code]) ? $symbols[$code] : $code;
    }
    
    private function get_max_guests_setting() {
        // First check local WordPress option
        $local_setting = get_option('gas_max_guests_dropdown', '');
        if (!empty($local_setting) && intval($local_setting) > 4) {
            return $local_setting;
        }
        
        // Try to get from GAS API
        $client_id = get_option('gas_client_id');
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $license_key = get_option('gas_license_key', '');
        
        if ($client_id) {
            // Use transient to cache the result for 5 minutes
            $cache_key = 'gas_max_guests_' . $client_id;
            $cached = get_transient($cache_key);
            if ($cached !== false) {
                return $cached;
            }
            
            // First try site-config for manual override
            $response = wp_remote_get("{$api_url}/api/public/client/{$client_id}/site-config", array('timeout' => 5, 'sslverify' => false));
            if (!is_wp_error($response)) {
                $data = json_decode(wp_remote_retrieve_body($response), true);
                if (!empty($data['website']['hero']['search-max-guests'])) {
                    $max_guests = intval($data['website']['hero']['search-max-guests']);
                    set_transient($cache_key, $max_guests, 300);
                    return $max_guests;
                }
            }
            
            // Auto-detect from rooms - get the maximum guests from all properties
            $rooms_response = wp_remote_get("{$api_url}/api/public/client/{$client_id}/rooms", array(
                'timeout' => 10,
                'sslverify' => false,
                'headers' => array('X-License-Key' => $license_key)
            ));
            if (!is_wp_error($rooms_response)) {
                $rooms_data = json_decode(wp_remote_retrieve_body($rooms_response), true);
                $rooms = $rooms_data['rooms'] ?? $rooms_data['data'] ?? $rooms_data;
                if (is_array($rooms) && !empty($rooms)) {
                    $max_from_rooms = 2;
                    foreach ($rooms as $room) {
                        $room_max = intval($room['max_guests'] ?? $room['max_adults'] ?? 2);
                        if ($room_max > $max_from_rooms) {
                            $max_from_rooms = $room_max;
                        }
                    }
                    if ($max_from_rooms > 2) {
                        set_transient($cache_key, $max_from_rooms, 300);
                        return $max_from_rooms;
                    }
                }
            }
        }
        
        // Default fallback
        return '10';
    }
    
    private function detect_page_type() {
        global $post;
        
        // Check if we're on the front page
        if (is_front_page() || is_home()) {
            return 'home';
        }
        
        // Get current URL path
        $path = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
        
        // Map common paths to page types
        $path_map = array(
            'book-now' => 'rooms',
            'rooms' => 'rooms',
            'room' => 'room',
            'about' => 'about',
            'about-us' => 'about',
            'contact' => 'contact',
            'contact-us' => 'contact',
            'blog' => 'blog',
            'news' => 'blog',
            'attractions' => 'attractions',
            'things-to-do' => 'attractions',
            'gallery' => 'gallery',
            'photos' => 'gallery',
            'dining' => 'dining',
            'restaurant' => 'dining',
            'terms' => 'terms',
            'terms-and-conditions' => 'terms',
            'privacy' => 'privacy',
            'privacy-policy' => 'privacy',
            'checkout' => 'checkout',
            'faq' => 'faq',
            'faqs' => 'faq'
        );
        
        // Check for exact match first
        if (isset($path_map[$path])) {
            return $path_map[$path];
        }
        
        // Check if path starts with any of our mapped paths
        foreach ($path_map as $key => $type) {
            if (strpos($path, $key) === 0) {
                return $type;
            }
        }
        
        // Check post content for shortcodes
        if ($post && has_shortcode($post->post_content, 'gas_rooms')) {
            return 'rooms';
        }
        if ($post && has_shortcode($post->post_content, 'gas_room')) {
            return 'room';
        }
        if ($post && has_shortcode($post->post_content, 'gas_checkout')) {
            return 'checkout';
        }
        
        // Default
        return 'page';
    }
    
    /**
     * Get SEO settings for a specific page type
     * Falls back to default SEO if no page-specific settings
     */
    private function get_page_seo($page_type) {
        // Map page types to option keys
        $option_map = array(
            'home' => 'hero',
            'rooms' => 'page-rooms',
            'about' => 'page-about',
            'contact' => 'page-contact',
            'gallery' => 'page-gallery',
            'blog' => 'page-blog',
            'attractions' => 'page-attractions',
            'dining' => 'page-dining',
            'terms' => 'page-terms',
            'privacy' => 'page-privacy'
        );
        
        $option_key = isset($option_map[$page_type]) ? $option_map[$page_type] : '';
        
        // Try to get page-specific SEO
        $title = '';
        $description = '';
        
        if (!empty($option_key)) {
            $title = get_option('gas_seo_' . str_replace('-', '_', $option_key) . '_meta_title', '');
            $description = get_option('gas_seo_' . str_replace('-', '_', $option_key) . '_meta_description', '');
        }
        
        // Fall back to default if no page-specific
        if (empty($title)) {
            $title = get_option('gas_seo_meta_title', '');
        }
        if (empty($description)) {
            $description = get_option('gas_seo_meta_description', '');
        }
        
        return array(
            'title' => $title,
            'description' => $description
        );
    }
    
    /**
     * Inject Analytics Scripts (GA4, GTM, Facebook Pixel)
     */
    private function inject_analytics() {
        // Google Analytics 4
        $ga_id = get_option('gas_google_analytics_id', '');
        if (!empty($ga_id)) {
            echo "<!-- Google Analytics -->\n";
            echo '<script async src="https://www.googletagmanager.com/gtag/js?id=' . esc_attr($ga_id) . '"></script>' . "\n";
            echo '<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());
gtag("config", "' . esc_js($ga_id) . '");
</script>' . "\n";
        }
        
        // Google Tag Manager
        $gtm_id = get_option('gas_google_tag_manager_id', '');
        if (!empty($gtm_id)) {
            echo "<!-- Google Tag Manager -->\n";
            echo '<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":
new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src=
"https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,"script","dataLayer","' . esc_js($gtm_id) . '");</script>' . "\n";
        }
        
        // Facebook Pixel
        $fb_pixel = get_option('gas_facebook_pixel_id', '');
        if (!empty($fb_pixel)) {
            echo "<!-- Facebook Pixel -->\n";
            echo '<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,"script",
"https://connect.facebook.net/en_US/fbevents.js");
fbq("init", "' . esc_js($fb_pixel) . '");
fbq("track", "PageView");
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=' . esc_attr($fb_pixel) . '&ev=PageView&noscript=1"
/></noscript>' . "\n";
        }
    }
    
    /**
     * Search Bar Shortcode
     */
    public function search_shortcode($atts) {
        // Get translations for search widget
        $t = $this->get_translations();
        $t_booking = $t['booking'] ?? array();
        $t_common = $t['common'] ?? array();
        
        // Get custom labels from GAS Admin (override default translations)
        $custom = $this->get_custom_search_labels();
        
        $atts = shortcode_atts(array(
            // Layout options
            'layout' => 'vertical',          // vertical, horizontal, inline
            'width' => '100%',               // Any CSS width value
            'max_width' => '600px',          // Max width for widget
            
            // Field options
            'show_location' => 'false',      // Show location/destination field
            'location_label' => $t_booking['location'] ?? 'Location',
            'location_placeholder' => $t_booking['where_going'] ?? 'Where are you going?',
            'checkin_label' => !empty($custom['checkin_label']) ? $custom['checkin_label'] : ($t_booking['check_in'] ?? 'Check-in'),
            'checkout_label' => !empty($custom['checkout_label']) ? $custom['checkout_label'] : ($t_booking['check_out'] ?? 'Check-out'),
            'guests_label' => !empty($custom['guests_label']) ? $custom['guests_label'] : ($t_booking['guests'] ?? 'Guests'),
            'max_guests' => $this->get_max_guests_setting(),
            'date_placeholder' => !empty($custom['date_placeholder']) ? $custom['date_placeholder'] : ($t_booking['select_dates'] ?? 'Select date'),
            'guest_singular' => !empty($custom['guest_singular']) ? $custom['guest_singular'] : ($t_booking['guest'] ?? 'Guest'),
            
            // Button options  
            'button_text' => !empty($custom['button_text']) ? $custom['button_text'] : ($t_common['search'] ?? 'Search'),
            'button_full_width' => 'false',  // Button spans full width (for vertical)
            
            // Color customization
            'primary_color' => '',           // Button background color
            'text_color' => '',              // Button text color
            'background_color' => '',        // Widget background
            'border_color' => '',            // Input border color
            'label_color' => '',             // Label text color
            'border_radius' => '',           // Border radius for widget
            
            // Custom CSS class
            'class' => '',                   // Additional CSS class for AI builders
            'css' => ''                      // Inline custom CSS
        ), $atts);
        
        // Generate unique ID for this widget instance
        $widget_id = 'gas-search-' . wp_rand(1000, 9999);
        
        // Determine layout class
        $layout_class = 'gas-search-' . $atts['layout'];
        $custom_class = !empty($atts['class']) ? ' ' . esc_attr($atts['class']) : '';
        $show_location = $atts['show_location'] === 'true';
        $button_full = $atts['button_full_width'] === 'true';
        
        // Build inline styles
        $widget_styles = array();
        if (!empty($atts['width'])) $widget_styles[] = 'width: ' . esc_attr($atts['width']);
        if (!empty($atts['max_width'])) $widget_styles[] = 'max-width: ' . esc_attr($atts['max_width']);
        if (!empty($atts['background_color'])) $widget_styles[] = 'background-color: ' . esc_attr($atts['background_color']);
        if (!empty($atts['border_radius'])) $widget_styles[] = 'border-radius: ' . esc_attr($atts['border_radius']);
        
        $widget_style_attr = !empty($widget_styles) ? ' style="' . implode('; ', $widget_styles) . '"' : '';
        
        ob_start();
        ?>
        <?php if (!empty($atts['primary_color']) || !empty($atts['text_color']) || !empty($atts['border_color']) || !empty($atts['label_color']) || !empty($atts['css'])) : ?>
        <style>
            <?php if (!empty($atts['primary_color'])) : ?>
            #<?php echo $widget_id; ?> .gas-search-button { background: <?php echo esc_attr($atts['primary_color']); ?> !important; }
            #<?php echo $widget_id; ?> .gas-search-button:hover { background: <?php echo esc_attr($atts['primary_color']); ?> !important; filter: brightness(0.9); }
            <?php endif; ?>
            <?php if (!empty($atts['text_color'])) : ?>
            #<?php echo $widget_id; ?> .gas-search-button { color: <?php echo esc_attr($atts['text_color']); ?>; }
            <?php endif; ?>
            <?php if (!empty($atts['border_color'])) : ?>
            #<?php echo $widget_id; ?> .gas-search-field input,
            #<?php echo $widget_id; ?> .gas-search-field select { border-color: <?php echo esc_attr($atts['border_color']); ?>; }
            <?php endif; ?>
            <?php if (!empty($atts['label_color'])) : ?>
            #<?php echo $widget_id; ?> .gas-search-field label { color: <?php echo esc_attr($atts['label_color']); ?>; }
            <?php endif; ?>
            <?php if (!empty($atts['css'])) : ?>
            #<?php echo $widget_id; ?> { <?php echo wp_strip_all_tags($atts['css']); ?> }
            <?php endif; ?>
        </style>
        <?php endif; ?>
        
        <div id="<?php echo $widget_id; ?>" class="gas-search-widget <?php echo $layout_class . $custom_class; ?>"<?php echo $widget_style_attr; ?>>
            <div class="gas-search-fields">
                <?php if ($show_location) : ?>
                <div class="gas-search-field gas-search-location">
                    <label><?php echo esc_html($atts['location_label']); ?></label>
                    <input type="text" class="gas-location-input" placeholder="<?php echo esc_attr($atts['location_placeholder']); ?>" />
                </div>
                <?php endif; ?>
                
                <div class="gas-search-field gas-search-checkin">
                    <label><?php echo esc_html($atts['checkin_label']); ?></label>
                    <input type="text" class="gas-checkin-date" placeholder="<?php echo esc_attr($atts['date_placeholder']); ?>" readonly />
                </div>
                
                <div class="gas-search-field gas-search-checkout">
                    <label><?php echo esc_html($atts['checkout_label']); ?></label>
                    <input type="text" class="gas-checkout-date" placeholder="<?php echo esc_attr($atts['date_placeholder']); ?>" readonly />
                </div>
                
                <div class="gas-search-field gas-search-guests">
                    <label><?php echo esc_html($atts['guests_label']); ?></label>
                    <select class="gas-guests-select">
                        <?php 
                        $guest_singular = $atts['guest_singular'];
                        $guest_plural = $atts['guests_label'];
                        for ($i = 1; $i <= intval($atts['max_guests']); $i++) : ?>
                            <option value="<?php echo $i; ?>"><?php echo $i; ?> <?php echo $i > 1 ? $guest_plural : $guest_singular; ?></option>
                        <?php endfor; ?>
                    </select>
                </div>
                
                <div class="gas-search-field gas-search-submit<?php echo $button_full ? ' gas-button-full' : ''; ?>">
                    <button type="button" class="gas-search-button"><?php echo esc_html($atts['button_text']); ?></button>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Room Listing Shortcode - Shows rooms with availability check
     */
    public function rooms_shortcode($atts) {
        // Get license-based display settings
        $license_display = get_option('gas_display_settings', array());
        if (is_string($license_display)) {
            $license_display = json_decode($license_display, true) ?: array();
        }
        
        $atts = shortcode_atts(array(
            'client_id' => get_option('gas_client_id', ''),
            'property_id' => '',
            'columns' => !empty($license_display['columns']) ? $license_display['columns'] : 3,
            'show_map' => isset($license_display['show_map']) ? ($license_display['show_map'] ? 'true' : 'false') : 'true',
            'limit' => !empty($license_display['limit']) ? $license_display['limit'] : 0,
            'random' => isset($license_display['random']) ? ($license_display['random'] ? 'true' : 'false') : 'false',
            'room_ids' => '',       // Comma-separated room IDs to show
            'layout' => !empty($license_display['layout']) ? $license_display['layout'] : get_option('gas_room_layout', 'auto'),
            'show_filters' => isset($license_display['show_filters']) ? ($license_display['show_filters'] ? 'true' : 'false') : 'true',
            'show_amenity_filter' => get_option('gas_show_amenity_filter', '1') === '1' ? 'true' : 'false',
            'show_location_filter' => get_option('gas_show_location_filter', '1') === '1' ? 'true' : 'false',
            'background' => !empty($license_display['background']) ? $license_display['background'] : '',
            'background_custom' => !empty($license_display['background_custom']) ? $license_display['background_custom'] : '#0f172a',
            'primary_color' => !empty($license_display['primary_color']) ? $license_display['primary_color'] : '#2563eb',
            'card_style' => !empty($license_display['card_style']) ? $license_display['card_style'] : 'default',
        ), $atts);
        
        // Override with theme API settings if available
        // Only apply page-rooms settings when show_map uses default (true)
        // Featured section passes show_map="false" explicitly, so it keeps its own settings
        if (function_exists('developer_get_api_settings') && $atts['show_map'] === 'true') {
            $api_settings = developer_get_api_settings();
            if (!empty($api_settings['rooms_columns'])) {
                $atts['columns'] = intval($api_settings['rooms_columns']);
            }
            if (!empty($api_settings['rooms_layout_style'])) {
                $atts['layout'] = $api_settings['rooms_layout_style'];
            }
            if (isset($api_settings['rooms_show_map'])) {
                $atts['show_map'] = $api_settings['rooms_show_map'] ? 'true' : 'false';
            }
            if (isset($api_settings['rooms_show_amenity_filter'])) {
                $atts['show_amenity_filter'] = $api_settings['rooms_show_amenity_filter'] ? 'true' : 'false';
            }
            if (isset($api_settings['rooms_show_location_filter'])) {
                $atts['show_location_filter'] = $api_settings['rooms_show_location_filter'] ? 'true' : 'false';
            }
            if (isset($api_settings['rooms_show_filters'])) {
                $atts['show_filters'] = $api_settings['rooms_show_filters'] ? 'true' : 'false';
            }
            if (isset($api_settings['rooms_show_property_filter'])) {
                $atts['show_property_filter'] = $api_settings['rooms_show_property_filter'] ? 'true' : 'false';
            }
            if (isset($api_settings['rooms_show_date_filters'])) {
                $atts['show_date_filters'] = $api_settings['rooms_show_date_filters'] ? 'true' : 'false';
            }
            if (isset($api_settings['rooms_show_guest_filter'])) {
                $atts['show_guest_filter'] = $api_settings['rooms_show_guest_filter'] ? 'true' : 'false';
            }
            if (!empty($api_settings['rooms_filter_bg'])) {
                $atts['filter_bg'] = $api_settings['rooms_filter_bg'];
            }
            if (!empty($api_settings['rooms_filter_text'])) {
                $atts['filter_text'] = $api_settings['rooms_filter_text'];
            }
        }
        
        $client_id = $atts['client_id'];
        $show_map = $atts['show_map'] === 'true';
        $limit = intval($atts['limit']);
        $random = $atts['random'] === 'true';
        $layout_mode = $atts['layout'];
        $show_filters = $atts['show_filters'] === 'true';
        $show_amenity_filter = $atts['show_amenity_filter'] === 'true';
        $show_location_filter = $atts['show_location_filter'] === 'true';
        $show_property_filter = isset($atts['show_property_filter']) ? $atts['show_property_filter'] === 'true' : true;
        $show_date_filters = isset($atts['show_date_filters']) ? $atts['show_date_filters'] === 'true' : true;
        $show_guest_filter = isset($atts['show_guest_filter']) ? $atts['show_guest_filter'] === 'true' : true;
        $filter_bg = $atts['filter_bg'] ?? '';
        $filter_text = $atts['filter_text'] ?? '';
        
        // Get room IDs - from shortcode attribute, license, or from deployed site config
        $room_ids = array();
        if (!empty($atts['room_ids'])) {
            $room_ids = array_map('intval', explode(',', $atts['room_ids']));
        } else {
            // Check for license room IDs first
            $license_room_ids = get_option('gas_license_room_ids', '');
            if (!empty($license_room_ids)) {
                if (is_array($license_room_ids)) {
                    $room_ids = array_map('intval', $license_room_ids);
                } else {
                    $decoded = json_decode($license_room_ids, true);
                    if (is_array($decoded) && !empty($decoded)) {
                        $room_ids = array_map('intval', $decoded);
                    }
                }
            }
            
            // Fallback to deployed room IDs (set during auto-deploy)
            if (empty($room_ids)) {
                $deployed_room_ids = get_option('gas_room_ids', '');
                if (!empty($deployed_room_ids)) {
                    $decoded = json_decode($deployed_room_ids, true);
                    if (is_array($decoded) && !empty($decoded)) {
                        $room_ids = array_map('intval', $decoded);
                    }
                }
            }
        }
        
        if (empty($client_id)) {
            return '<div style="padding: 40px; text-align: center; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px;">
                <h3 style="margin: 0 0 10px;">⚠️ Setup Required</h3>
                <p>Please set your <strong>Client Account ID</strong> in WordPress Admin → Settings → GAS Booking</p>
            </div>';
        }
        
        // Get dates from URL if passed from search
        $checkin = isset($_GET['checkin']) ? sanitize_text_field($_GET['checkin']) : '';
        $checkout = isset($_GET['checkout']) ? sanitize_text_field($_GET['checkout']) : '';
        $guests = isset($_GET['guests']) ? intval($_GET['guests']) : 1;
        
        // Fetch rooms from API
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $lang = $this->get_current_language();
        $endpoint = "{$api_url}/api/public/client/{$client_id}/rooms?lang={$lang}";

        if (!empty($atts['property_id'])) {
            $endpoint .= "&property_id=" . intval($atts['property_id']);
        }
        
        $response = wp_remote_get($endpoint, array(
            'timeout' => 30,
            'sslverify' => false
        ));
        
        if (is_wp_error($response)) {
            return '<div style="padding: 20px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; color: #721c24;">
                <strong>Connection Error:</strong> ' . esc_html($response->get_error_message()) . '
            </div>';
        }
        
        $http_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($http_code !== 200 || !isset($data['success']) || !$data['success']) {
            $error_msg = $data['error'] ?? 'API returned status ' . $http_code;
            return '<div style="padding: 20px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; color: #721c24;">
                <strong>API Error:</strong> ' . esc_html($error_msg) . '<br>
                <small>Endpoint: ' . esc_html($endpoint) . '</small>
            </div>';
        }
        
        $rooms = $data['rooms'] ?? array();
        
        if (empty($rooms)) {
            return '<div style="padding: 40px; text-align: center; background: #e7f3ff; border: 1px solid #b6d4fe; border-radius: 8px;">
                <h3 style="margin: 0 0 10px;">No Rooms Found</h3>
                <p>No rooms are currently available. Check that properties are assigned to Client ID ' . esc_html($client_id) . '</p>
            </div>';
        }
        
        // Filter by specific room IDs if provided
        if (!empty($room_ids)) {
            $rooms = array_filter($rooms, function($room) use ($room_ids) {
                return in_array($room['id'], $room_ids);
            });
            $rooms = array_values($rooms); // Re-index array
        }
        
        // Randomize if requested
        if ($random) {
            shuffle($rooms);
        }
        
        // Sort rooms: available (has price) first, then price-on-request
        usort($rooms, function($a, $b) {
            $price_a = floatval($a['price'] ?? $a['base_price'] ?? 0);
            $price_b = floatval($b['price'] ?? $b['base_price'] ?? 0);
            $has_price_a = $price_a > 0 ? 0 : 1;
            $has_price_b = $price_b > 0 ? 0 : 1;
            if ($has_price_a !== $has_price_b) {
                return $has_price_a - $has_price_b;
            }
            // Within same group, sort by price ascending
            return $price_a - $price_b;
        });
        
        // Limit number of rooms if specified
        // Skip limit on booking/accommodation pages - always show all rooms
        $current_slug = get_post_field('post_name', get_the_ID());
        $show_all_pages = array('book-now', 'accommodation', 'properties', 'rooms');
        $skip_limit = in_array($current_slug, $show_all_pages);
        if ($limit > 0 && count($rooms) > $limit && !$skip_limit) {
            $rooms = array_slice($rooms, 0, $limit);
        }
        
        // Check if any rooms have coordinates for the map
        $has_coordinates = false;
        foreach ($rooms as $room) {
            if (!empty($room['latitude']) && !empty($room['longitude'])) {
                $has_coordinates = true;
                break;
            }
        }
        
        // Collect all unique amenities from rooms for the filter dropdown
        $all_amenities = array();
        foreach ($rooms as $room) {
            if (!empty($room['amenities']) && is_array($room['amenities'])) {
                foreach ($room['amenities'] as $amenity) {
                    $code = $amenity['code'] ?? '';
                    if ($code && !isset($all_amenities[$code])) {
                        // Extract multilingual amenity name
                        $amenity_name = $this->extract_display_text($amenity['name'] ?? $code);
                        $all_amenities[$code] = array(
                            'code' => $code,
                            'name' => $amenity_name,
                            'icon' => $amenity['icon'] ?? '✓',
                            'category' => $amenity['category'] ?? 'General'
                        );
                    }
                }
            }
        }
        // Sort amenities by name
        uasort($all_amenities, function($a, $b) {
            return strcmp($a['name'], $b['name']);
        });
        
        // Collect all unique locations (cities/districts) from rooms for the location filter
        $all_locations = array();
        $all_properties = array();
        foreach ($rooms as $room) {
            // Location = geographic area (city or district)
            $city = $room['city'] ?? '';
            $district = $room['district'] ?? '';
            $location = !empty($city) ? $city : (!empty($district) ? $district : '');
            if (!empty($location) && !in_array($location, $all_locations)) {
                $all_locations[] = $location;
            }
            // Property = individual property name (for separate filter)
            $prop_name = $room['property_name'] ?? '';
            if (!empty($prop_name) && !in_array($prop_name, $all_properties)) {
                $all_properties[] = $prop_name;
            }
        }
        sort($all_locations);
        sort($all_properties);
        
        // Determine layout based on room count
        // On the homepage (featured section), always use grid layout
        $room_count = count($rooms);
        $use_row_layout = false;
        $is_homepage = is_front_page();
        if ($layout_mode === 'row' && !$is_homepage) {
            $use_row_layout = true;
        } elseif ($layout_mode === 'auto' && $room_count <= 2 && !$is_homepage) {
            $use_row_layout = true;
        }
        
        $currency = get_option('gas_currency_symbol', '');
        $room_url_base = get_option('gas_room_url_base', '/room/');
        $view_button_text = get_option('gas_view_button_text', 'View & Book');
        $columns = intval($atts['columns']);
        
        // Determine where room buttons should link
        $button_destination = get_option('gas_room_button_destination', 'room');
        $room_url_base = ($button_destination === 'booknow') 
            ? get_option('gas_search_results_url', '/book-now/') 
            : get_option('gas_room_url_base', '/room/');
        
        // If showing map, use 3 columns for the grid
        $grid_columns = $columns; // Respect API settings - removed map override
        
        ob_start();
        ?>
        <style>
        /* Force full width - override theme */
        .gas-rooms-page-wrapper,
        .gas-rooms-page-wrapper * {
            box-sizing: border-box !important;
        }
        .gas-rooms-page-wrapper {
            width: 100vw !important;
            max-width: 100vw !important;
            margin-left: calc(-50vw + 50%) !important;
            padding: 20px 40px !important;
            padding-top: 20px !important;
        }
        .gas-rooms-wrapper {
            display: flex !important;
            gap: 24px !important;
            align-items: flex-start !important;
            width: 100% !important;
            max-width: none !important;
        }
        .gas-rooms-list {
            flex: 1 1 65% !important;
            min-width: 0 !important;
        }
        .gas-rooms-map-panel {
            flex: 0 0 35% !important;
            max-width: none !important;
            position: sticky !important;
            top: 80px !important;
            align-self: flex-start !important;
        }
        .gas-rooms-map {
            height: calc(100vh - 150px) !important;
            min-height: 500px !important;
            max-height: none !important;
            width: 100% !important;
            border-radius: 12px !important;
            overflow: hidden !important;
            border: 1px solid #e0e0e0 !important;
            background: #f0f0f0 !important;
        }
        .gas-date-filter {
            background: <?php echo !empty($filter_bg) ? esc_attr($filter_bg) : '#f8f9fa'; ?> !important;
            padding: 12px 20px !important;
            margin: 0 0 24px 0 !important;
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 12px !important;
            align-items: flex-end !important;
            justify-content: center !important;
            border-bottom: 1px solid #e5e7eb !important;
            position: relative !important;
            z-index: 10 !important;
        }
        /* Only add top margin on dedicated rooms page, not embedded sections */
        .gas-rooms-page-wrapper > .gas-date-filter:first-child {
            margin-top: 60px !important;
        }
        /* No top margin when in featured/developer sections */
        .developer-section .gas-date-filter,
        .developer-featured .gas-date-filter {
            display: none !important;
        }
        .gas-date-filter .gas-filter-field {
            flex: 0 1 auto !important;
            min-width: 120px !important;
            max-width: 180px !important;
        }
        .gas-date-filter .gas-filter-field:last-of-type {
            max-width: 120px !important;
        }
        .gas-date-filter label {
            display: block !important;
            font-weight: 600 !important;
            margin-bottom: 4px !important;
            color: <?php echo !empty($filter_text) ? esc_attr($filter_text) : '#333'; ?> !important;
            font-size: 10px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
        }
        .gas-date-filter input,
        .gas-date-filter select {
            width: 100% !important;
            padding: 8px 10px !important;
            border: 1px solid #ddd !important;
            border-radius: 6px !important;
            font-size: 13px !important;
            box-sizing: border-box !important;
            height: 38px !important;
        }
        .gas-date-filter .gas-filter-btn {
            background: <?php echo esc_attr($this->get_effective_button_color()); ?> !important;
            color: white !important;
            border: none !important;
            padding: 0 16px !important;
            border-radius: 6px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            font-size: 13px !important;
            white-space: nowrap !important;
            height: 38px !important;
            line-height: 38px !important;
        }
        @media (max-width: 768px) {
            .gas-date-filter {
                padding: 15px !important;
                gap: 10px !important;
                flex-direction: column !important;
                align-items: stretch !important;
            }
            .gas-date-filter .gas-filter-field,
            .gas-date-filter .gas-filter-field:last-of-type {
                flex: 1 1 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .gas-date-filter .gas-filter-btn {
                width: 100% !important;
                margin-top: 4px !important;
                box-sizing: border-box !important;
            }
            .gas-date-filter input,
            .gas-date-filter select {
                font-size: 16px !important;
                width: 100% !important;
                box-sizing: border-box !important;
                display: block !important;
            }
        }
        
        /* When embedded in a section (like Featured Rooms on homepage) */
        .developer-section .gas-rooms-page-wrapper,
        .developer-featured .gas-rooms-page-wrapper {
            padding-top: 0;
            width: 100%;
            left: auto;
            right: auto;
            margin-left: auto;
            margin-right: auto;
            position: static;
        }
        
        .developer-section .gas-date-filter,
        .developer-featured .gas-date-filter {
            display: none; /* Hide search bar in featured section */
        }
        
        .developer-section .gas-rooms-grid,
        .developer-featured .gas-rooms-grid {
            justify-content: center;
        }
        
        .gas-rooms-map .leaflet-popup-content-wrapper {
            border-radius: 8px;
        }
        .gas-rooms-map .leaflet-popup-content {
            margin: 12px 16px;
        }
        .gas-map-popup {
            min-width: 200px;
        }
        .gas-map-popup-image {
            width: 100%;
            height: 100px;
            object-fit: cover;
            border-radius: 6px;
            margin-bottom: 8px;
        }
        .gas-map-popup-title {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
            color: #333;
        }
        .gas-map-popup-property {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
        }
        .gas-map-popup-price {
            font-weight: 700;
            font-size: 16px;
            color: #333;
        }
        .gas-map-popup-link {
            display: inline-block;
            margin-top: 8px;
            background: <?php echo esc_attr($this->get_effective_button_color()); ?>;
            color: white !important;
            padding: 6px 12px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 12px;
            font-weight: 600;
        }
        .gas-map-popup-link:hover {
            filter: brightness(0.9);
            color: white !important;
        }
        /* Tablet and below - stack vertically */
        @media (max-width: 1100px) {
            .gas-rooms-wrapper {
                flex-direction: column;
            }
            .gas-rooms-list {
                flex: 1 1 100%;
                max-width: 100%;
                order: 1;
            }
            .gas-rooms-map-panel {
                flex: 1 1 100%;
                width: 100%;
                position: relative;
                top: 0;
                order: 2;
                margin-top: 24px;
            }
            .gas-rooms-map {
                height: 350px;
                min-height: 300px;
            }
        }
        /* Mobile - hide map completely, fix date picker */
        @media (max-width: 768px) {
            .gas-rooms-map-panel {
                display: none !important;
            }
        }
        .gas-rooms-grid {
            display: grid;
            grid-template-columns: repeat(<?php echo $grid_columns; ?>, 1fr);
            gap: 20px;
            margin: 0;
        }
        @media (max-width: 1200px) {
            .gas-rooms-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
            .gas-rooms-page-wrapper {
                padding: 10px !important;
                width: 100% !important;
                max-width: 100% !important;
                margin-left: 0 !important;
            }
            .gas-rooms-wrapper {
                flex-direction: column !important;
                padding: 0 !important;
            }
            .gas-rooms-list {
                width: 100% !important;
                flex: 1 1 100% !important;
                padding: 0 !important;
            }
            #gas-rooms-container {
                width: 100% !important;
                padding: 0 !important;
            }
            .gas-rooms-grid { 
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 20px !important;
                padding: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
            }
            .gas-room-card {
                width: 95% !important;
                max-width: 95% !important;
                margin: 0 auto !important;
            }
            .gas-rooms-row-layout {
                padding: 0 !important;
                width: 100% !important;
            }
            .gas-room-row {
                width: 95% !important;
                max-width: 95% !important;
                margin: 0 auto !important;
            }
        }
        .gas-room-card {
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transition: all 0.2s ease;
            cursor: pointer;
        }
        .gas-room-card:hover,
        .gas-room-card.highlighted {
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            transform: translateY(-4px);
            border-color: <?php echo esc_attr($this->get_effective_button_color()); ?>;
        }
        .gas-room-card.unavailable {
            opacity: 0.7;
        }
        .gas-room-card.unavailable .gas-room-image {
            background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
        }
        .gas-room-card.guest-exceeded {
            opacity: 0.6;
            order: 999;
        }
        .gas-room-card.guest-exceeded .gas-view-btn {
            background: #9ca3af;
            pointer-events: none;
        }
        .gas-too-small {
            color: #ef4444;
            font-size: 13px;
            font-weight: 500;
        }
        .gas-room-image {
            aspect-ratio: 16/9;
            background: linear-gradient(135deg, <?php echo esc_attr($this->get_effective_button_color()); ?> 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 48px;
        }
        .gas-room-details {
            padding: 20px;
        }
        .gas-room-details h3 {
            margin: 0 0 8px;
            font-size: 18px;
            color: #333;
        }
        .gas-room-property {
            color: #666;
            font-size: 13px;
            margin-bottom: 12px;
        }
        .gas-room-meta {
            display: flex;
            gap: 12px;
            color: #666;
            font-size: 13px;
            margin-bottom: 16px;
        }
        .gas-room-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 16px;
            border-top: 1px solid #eee;
        }
        .gas-room-price {
            font-size: 22px;
            font-weight: 700;
            color: #333;
        }
        .gas-room-price span {
            font-size: 13px;
            font-weight: 400;
            color: #666;
        }
        .gas-room-price.unavailable-price {
            font-size: 14px;
            color: #dc3545;
            font-weight: 600;
        }
        .gas-not-available {
            color: #dc2626;
            font-weight: 600;
            font-size: 14px;
        }
        .gas-too-small {
            color: #9ca3af;
            font-size: 13px;
        }
        .gas-checking {
            color: #6366f1;
            font-size: 13px;
        }
        .gas-rooms-divider {
            width: 100%;
            text-align: center;
            padding: 1rem 0;
            margin: 1rem 0;
            border-top: 1px solid #e2e8f0;
            color: #94a3b8;
            font-size: 14px;
            font-style: italic;
        }
        .gas-sort-select:focus {
            outline: none;
            border-color: <?php echo esc_attr($button_color); ?>;
            box-shadow: 0 0 0 2px <?php echo esc_attr($button_color); ?>20;
        }
        /* Offers badge styling */
        .gas-offers-badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 600;
            color: #059669;
            background: #d1fae5;
            padding: 3px 8px;
            border-radius: 4px;
            margin-top: 4px;
        }
        .gas-terms-apply {
            font-size: 10px;
            color: #999;
            margin-top: 2px;
        }
        .gas-room-card.has-offers .gas-room-price {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
        }
        .gas-view-btn {
            background: <?php echo esc_attr($this->get_effective_button_color()); ?>;
            color: white !important;
            padding: 10px 20px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: background 0.2s;
        }
        .gas-view-btn:hover {
            filter: brightness(0.9);
            color: white !important;
        }
        .gas-view-btn.unavailable-btn {
            background: #6c757d;
        }
        .gas-view-btn.unavailable-btn:hover {
            background: #5a6268;
        }
        .gas-section-title {
            font-size: 18px;
            font-weight: 600;
            color: #333;
            margin: 32px 0 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid <?php echo esc_attr($this->get_effective_button_color()); ?>;
        }
        .gas-section-title.unavailable-title {
            border-bottom-color: #6c757d;
            color: #666;
        }
        
        /* Amenity Filter Dropdown */
        .gas-amenity-filter {
            position: relative;
        }
        .gas-amenity-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-height: 280px;
            overflow-y: auto;
            overflow-x: hidden;
            z-index: 100;
            display: none;
            min-width: 200px;
            -webkit-overflow-scrolling: touch;
        }
        .gas-amenity-dropdown.show {
            display: block;
        }
        .gas-amenity-option {
            padding: 8px 12px;
            cursor: pointer;
            display: flex !important;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid #f0f0f0;
            font-size: 13px;
            white-space: nowrap;
            color: #333;
        }
        .gas-amenity-option span {
            display: inline !important;
            color: #333;
        }
        .gas-amenity-option:last-child {
            border-bottom: none;
        }
        .gas-amenity-option:hover {
            background: #f8f9fa;
        }
        .gas-amenity-dropdown input[type="checkbox"],
        .gas-amenity-option input[type="checkbox"] {
            -webkit-appearance: checkbox !important;
            -moz-appearance: checkbox !important;
            appearance: checkbox !important;
            width: 16px !important;
            height: 16px !important;
            min-width: 16px !important;
            max-width: 16px !important;
            min-height: 16px !important;
            max-height: 16px !important;
            margin: 0 !important;
            padding: 0 !important;
            flex-shrink: 0 !important;
            border: 1px solid #999 !important;
            border-radius: 3px !important;
            background: white !important;
            cursor: pointer !important;
            position: relative !important;
            display: inline-block !important;
            vertical-align: middle !important;
        }
        .gas-amenity-dropdown input[type="checkbox"]:checked {
            background: <?php echo esc_attr($this->get_effective_button_color()); ?> !important;
            border-color: <?php echo esc_attr($this->get_effective_button_color()); ?> !important;
        }
        .gas-amenity-trigger {
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 13px;
            height: 38px;
            box-sizing: border-box;
        }
        .gas-amenity-trigger:after {
            content: '▼';
            font-size: 10px;
            color: #666;
        }
        
        /* Row Layout Styles */
        .gas-rooms-row-layout {
            display: flex;
            flex-direction: column;
            gap: 24px;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        .gas-room-row {
            display: flex;
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transition: all 0.2s ease;
        }
        .gas-room-row:hover {
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
            border-color: <?php echo esc_attr($this->get_effective_button_color()); ?>;
        }
        .gas-room-row-image {
            flex: 0 0 40%;
            max-width: 450px;
            min-height: 320px;
            background-size: cover;
            background-position: center;
            background-color: #f0f0f0;
        }
        .gas-room-row-image-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 64px;
            background: linear-gradient(135deg, <?php echo esc_attr($this->get_effective_button_color()); ?> 0%, #764ba2 100%);
            color: white;
        }
        .gas-room-row-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 24px;
        }
        .gas-room-row-header h3 {
            margin: 0 0 6px;
            font-size: 22px;
            color: #1e293b;
            font-weight: 700;
        }
        .gas-room-row-location {
            color: #64748b;
            font-size: 14px;
            margin-bottom: 16px;
        }
        .gas-room-row-meta {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
            color: #64748b;
            font-size: 14px;
        }
        .gas-room-row-amenities {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 16px;
        }
        .gas-room-row-amenity {
            background: #f1f5f9;
            padding: 4px 10px;
            border-radius: 16px;
            font-size: 12px;
            color: #475569;
        }
        .gas-more-amenities {
            cursor: pointer;
            background: <?php echo esc_attr($this->get_effective_button_color()); ?>;
            color: white !important;
        }
        .gas-more-amenities:hover {
            opacity: 0.9;
        }
        .gas-amenities-popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .gas-amenities-popup {
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .gas-amenities-popup h4 {
            margin: 0 0 16px;
            font-size: 18px;
            color: #1e293b;
        }
        .gas-amenities-popup-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .gas-amenities-popup-item {
            background: #f1f5f9;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 13px;
            color: #475569;
        }
        .gas-amenities-popup-close {
            position: absolute;
            top: 12px;
            right: 12px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #64748b;
        }
        .gas-amenities-popup-close:hover {
            color: #1e293b;
        }
        .gas-room-row-bottom {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: auto;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
        }
        .gas-room-row-price {
            font-size: 28px;
            font-weight: 700;
            color: #1e293b;
        }
        .gas-room-row-price span {
            font-size: 14px;
            font-weight: 400;
            color: #64748b;
        }
        .gas-row-view-btn {
            background: <?php echo esc_attr($this->get_effective_button_color()); ?>;
            color: white !important;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.2s;
        }
        .gas-row-view-btn:hover {
            filter: brightness(0.9);
            color: white !important;
        }
        
        @media (max-width: 768px) {
            .gas-room-row {
                flex-direction: column;
            }
            .gas-room-row-image {
                flex: none;
                max-width: 100%;
                min-height: 220px;
            }
            .gas-room-row-bottom {
                flex-direction: column;
                gap: 12px;
            }
            .gas-row-view-btn {
                width: 100%;
                text-align: center;
            }
        }
        </style>
        
        <div class="gas-rooms-page-wrapper">
        <?php if ($show_filters) : 
            // Get translations for current language
            $t_filters = $this->get_translations()['filters'] ?? array();
            $t_booking = $this->get_translations()['booking'] ?? array();
            $t_common = $this->get_translations()['common'] ?? array();
        ?>
        <!-- Date Filter -->
        <div class="gas-date-filter">
            <?php if ($show_location_filter && count($all_locations) > 1) : ?>
            <div class="gas-filter-field">
                <label><?php echo esc_html($t_filters['location'] ?? 'Location'); ?></label>
                <select class="gas-filter-location" onchange="gasApplyFilters()">
                    <option value=""><?php echo esc_html($t_filters['all_locations'] ?? 'All Locations'); ?></option>
                    <?php foreach ($all_locations as $location) : ?>
                    <option value="<?php echo esc_attr($location); ?>"><?php echo esc_html($location); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <?php endif; ?>
            <?php if ($show_property_filter && count($all_properties) > 1) : ?>
            <div class="gas-filter-field">
                <label><?php echo esc_html($t_filters['property'] ?? 'Property'); ?></label>
                <select class="gas-filter-property" onchange="gasApplyFilters()">
                    <option value=""><?php echo esc_html($t_filters['all_properties'] ?? 'All Properties'); ?></option>
                    <?php foreach ($all_properties as $prop_name) : ?>
                    <option value="<?php echo esc_attr($prop_name); ?>"><?php echo esc_html($prop_name); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <?php endif; ?>
            <?php if ($show_date_filters) : ?>
            <div class="gas-filter-field">
                <label><?php echo esc_html($t_booking['check_in'] ?? 'Check-in'); ?></label>
                <input type="text" class="gas-filter-checkin" value="<?php echo esc_attr($checkin); ?>" placeholder="<?php echo esc_attr($t_booking['select_dates'] ?? 'Select date'); ?>" />
            </div>
            <div class="gas-filter-field">
                <label><?php echo esc_html($t_booking['check_out'] ?? 'Check-out'); ?></label>
                <input type="text" class="gas-filter-checkout" value="<?php echo esc_attr($checkout); ?>" placeholder="<?php echo esc_attr($t_booking['select_dates'] ?? 'Select date'); ?>" />
            </div>
            <?php endif; ?>
            <?php if ($show_guest_filter) : ?>
            <div class="gas-filter-field">
                <label><?php echo esc_html($t_booking['guests'] ?? 'Guests'); ?></label>
                <select class="gas-filter-guests">
                    <?php 
                    $max_guests_dropdown = intval($this->get_max_guests_setting());
                    $guest_singular = $t_booking['guest'] ?? 'Guest';
                    $guest_plural = $t_booking['guests'] ?? 'Guests';
                    for ($i = 1; $i <= $max_guests_dropdown; $i++) : ?>
                        <option value="<?php echo $i; ?>" <?php selected($guests, $i); ?>><?php echo $i; ?> <?php echo $i > 1 ? $guest_plural : $guest_singular; ?></option>
                    <?php endfor; ?>
                </select>
            </div>
            <?php endif; ?>
            <?php if ($show_amenity_filter && !empty($all_amenities)) : ?>
            <div class="gas-filter-field gas-amenity-filter">
                <label><?php echo esc_html($t_filters['amenities'] ?? 'Amenities'); ?></label>
                <div class="gas-amenity-trigger" onclick="gasToggleAmenityDropdown(this)">
                    <span class="gas-amenity-label"><?php echo esc_html($t_filters['select_amenities'] ?? 'All Amenities'); ?></span>
                </div>
                <div class="gas-amenity-dropdown">
                    <?php foreach ($all_amenities as $code => $amenity) : ?>
                    <label class="gas-amenity-option">
                        <input type="checkbox" value="<?php echo esc_attr($code); ?>" onchange="gasFilterByAmenities()">
                        <span><?php echo esc_html($amenity['icon']); ?></span>
                        <span><?php echo esc_html($amenity['name']); ?></span>
                    </label>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endif; ?>
            <?php if (count($rooms) > 1) : ?>
            <div class="gas-filter-field">
                <label><?php echo esc_html($t_filters['sort_by'] ?? 'Sort By'); ?></label>
                <select class="gas-sort-select">
                    <option value="default"><?php echo esc_html($t_filters['default'] ?? 'Default'); ?></option>
                    <option value="price-low"><?php echo esc_html($t_filters['price_low'] ?? 'Price: Low to High'); ?></option>
                    <option value="price-high"><?php echo esc_html($t_filters['price_high'] ?? 'Price: High to Low'); ?></option>
                </select>
            </div>
            <?php endif; ?>
            <button type="button" class="gas-filter-btn" onclick="gasFilterRooms()"><?php echo esc_html($t_booking['check_availability'] ?? 'Check Availability'); ?></button>
        </div>
        <?php endif; ?>
        
        <?php 
        // Get translations for room cards
        $t_property = $this->get_translations()['property'] ?? array();
        $t_booking = $this->get_translations()['booking'] ?? array();
        $t_filters = $this->get_translations()['filters'] ?? array();
        $guest_word = $t_booking['guest'] ?? 'guest';
        $guests_word = $t_booking['guests'] ?? 'guests';
        $bedroom_word = $t_property['bedroom'] ?? 'bedroom';
        $bedrooms_word = $t_property['bedrooms'] ?? 'bedrooms';
        $bathroom_word = $t_property['bathroom'] ?? 'bath';
        $bathrooms_word = $t_property['bathrooms'] ?? 'baths';
        $per_night_text = $t_booking['price_per_night'] ?? '/ night';
        $view_book_text = $t_booking['view_book'] ?? $view_button_text;
        $checking_text = $t_booking['checking_availability'] ?? 'Checking availability...';
        $has_dates = !empty($checkin) && !empty($checkout);
        ?>
        
        <div class="gas-rooms-wrapper">
            <div class="gas-rooms-list">
                <div id="gas-rooms-container">
                    <?php if ($use_row_layout) : ?>
                    <!-- Row Layout for 1-2 rooms -->
                    <div class="gas-rooms-row-layout">
                        <?php foreach ($rooms as $room) : 
                            $url_separator = (strpos($room_url_base, '?') !== false) ? '&' : '?';
                            $room_url = $room_url_base . $url_separator . 'unit_id=' . $room['id'];
                            if ($checkin) $room_url .= '&checkin=' . urlencode($checkin);
                            if ($checkout) $room_url .= '&checkout=' . urlencode($checkout);
                            if ($guests) $room_url .= '&guests=' . intval($guests);
                            
                            $price = floatval($room['price'] ?? 0);
                            $max_guests = intval($room['max_guests'] ?? $room['max_adults'] ?? 2);
                            $bedrooms = intval($room['num_bedrooms'] ?? $room['bedroom_count'] ?? 0);
                            $bathrooms = floatval($room['num_bathrooms'] ?? $room['bathroom_count'] ?? 0);
                            $bathrooms_display = ($bathrooms == floor($bathrooms)) ? intval($bathrooms) : number_format($bathrooms, 1);
                            $image_url = $room['image_url'] ?? '';
                            $room_currency = $this->get_currency_symbol($room['currency'] ?? $currency);
                            $room_amenities = $room['amenities'] ?? array();
                            $room_location = $room['city'] ?? $room['district'] ?? '';
                            $room_property_name = $room['property_name'] ?? '';
                        ?>
                        <div class="gas-room-row<?php echo $has_dates ? ' checking' : ''; ?>" 
                             data-room-id="<?php echo esc_attr($room['id']); ?>"
                             data-property-id="<?php echo esc_attr($room['property_id'] ?? ''); ?>"
                             data-payment-account-id="<?php echo esc_attr($room['payment_account_id'] ?? ''); ?>"
                             data-location="<?php echo esc_attr($room_location); ?>"
                             data-property-name="<?php echo esc_attr($room_property_name); ?>"
                             data-amenities="<?php echo esc_attr(json_encode(array_column($room_amenities, 'code'))); ?>"><?php if (!empty($image_url)) : ?>
                            <div class="gas-room-row-image" style="background-image: url('<?php echo esc_url($image_url); ?>');"></div>
                            <?php else : ?>
                            <div class="gas-room-row-image gas-room-row-image-placeholder">🏠</div>
                            <?php endif; ?>
                            <div class="gas-room-row-content">
                                <div class="gas-room-row-header">
                                    <?php $room_display_name = $this->extract_display_text($room['display_name'] ?? '') ?: $room['name']; ?>
                                    <h3><?php echo esc_html($room_display_name); ?></h3>
                                    <?php $room_subtitle = $this->extract_display_text($room['short_description'] ?? '') ?: ($room['property_name'] ?? ''); ?>
                                    <?php if (!empty($room_subtitle)) : ?>
                                    <div class="gas-room-row-location">📍 <?php echo esc_html($room_subtitle); ?><?php if (!empty($room['city'])) echo ', ' . esc_html($room['city']); ?></div>
                                    <?php endif; ?>
                                </div>
                                
                                <div class="gas-room-row-meta">
                                    <span>👥 <?php echo $max_guests; ?> <?php echo $max_guests > 1 ? $guests_word : $guest_word; ?></span>
                                    <?php if ($bedrooms > 0) : ?>
                                    <span>🛏️ <?php echo $bedrooms; ?> <?php echo $bedrooms > 1 ? $bedrooms_word : $bedroom_word; ?></span>
                                    <?php endif; ?>
                                    <?php if ($bathrooms > 0) : ?>
                                    <span>🚿 <?php echo $bathrooms_display; ?> <?php echo $bathrooms > 1 ? $bathrooms_word : $bathroom_word; ?></span>
                                    <?php endif; ?>
                                </div>
                                
                                <?php if (!empty($room_amenities)) : 
                                    $max_amenities = intval(get_option('gas_amenities_display_count', 6));
                                ?>
                                <div class="gas-room-row-amenities">
                                    <?php 
                                    $shown = 0;
                                    foreach ($room_amenities as $amenity) : 
                                        if ($shown >= $max_amenities) break;
                                        $shown++;
                                        $amenity_display_name = $this->extract_display_text($amenity['name'] ?? $amenity['code']);
                                    ?>
                                    <span class="gas-room-row-amenity"><?php echo esc_html($amenity['icon'] ?? '✓'); ?> <?php echo esc_html($amenity_display_name); ?></span>
                                    <?php endforeach; ?>
                                    <?php if (count($room_amenities) > $max_amenities) : 
                                        $remaining_amenities = array_slice($room_amenities, $max_amenities);
                                    ?>
                                    <span class="gas-room-row-amenity gas-more-amenities" onclick="gasShowAllAmenities(this)" data-all-amenities="<?php echo esc_attr(json_encode($room_amenities)); ?>">+<?php echo count($room_amenities) - $max_amenities; ?> more</span>
                                    <?php endif; ?>
                                </div>
                                <?php endif; ?>
                                
                                <div class="gas-room-row-bottom">
                                    <div class="gas-room-row-price">
                                        <?php if ($has_dates) : ?>
                                            <span class="gas-checking">⏳ <?php echo esc_html($checking_text); ?></span>
                                        <?php elseif ($is_homepage && $price > 0) : ?>
                                            <span class="gas-price-amount"><?php echo esc_html($room_currency . number_format($price, 0)); ?></span>
                                            <span class="gas-price-period"><?php echo esc_html($per_night_text); ?></span>
                                        <?php elseif (!$is_homepage) : ?>
                                            <span><?php echo esc_html($t_booking['select_dates'] ?? 'Select dates'); ?></span>
                                        <?php endif; ?>
                                    </div>
                                    <a href="<?php echo esc_url($room_url); ?>" class="gas-row-view-btn" <?php if ($has_dates) : ?>style="background: #6366f1; pointer-events: none;"<?php endif; ?>><?php echo $has_dates ? esc_html($checking_text) : esc_html($view_book_text); ?></a>
                                </div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                    <?php else : ?>
                    <!-- Grid Layout -->
                    <div class="gas-rooms-grid">
                        <?php 
                        $room_index = 0;
                        // Count rooms with prices to ensure all available rooms show
                        $priced_count = 0;
                        foreach ($rooms as $r) {
                            if (floatval($r['price'] ?? $r['base_price'] ?? 0) > 0) $priced_count++;
                        }
                        // Show all priced rooms, but at least 9 total
                        $initial_load = max(9, $priced_count);
                        foreach ($rooms as $room) : 
                            $url_separator = (strpos($room_url_base, '?') !== false) ? '&' : '?';
                            $room_url = $room_url_base . $url_separator . 'unit_id=' . $room['id'];
                            if ($checkin) $room_url .= '&checkin=' . urlencode($checkin);
                            if ($checkout) $room_url .= '&checkout=' . urlencode($checkout);
                            if ($guests) $room_url .= '&guests=' . intval($guests);
                            
                            $price = floatval($room['price'] ?? 0);
                            $max_guests = intval($room['max_guests'] ?? $room['max_adults'] ?? 2);
                            $bedrooms = intval($room['num_bedrooms'] ?? $room['bedroom_count'] ?? 0);
                            $bathrooms = floatval($room['num_bathrooms'] ?? $room['bathroom_count'] ?? 0);
                            // Format bathrooms - show as integer if whole number
                            $bathrooms_display = ($bathrooms == floor($bathrooms)) ? intval($bathrooms) : number_format($bathrooms, 1);
                            $image_url = $room['image_url'] ?? '';
                            $lat = $room['latitude'] ?? '';
                            $lng = $room['longitude'] ?? '';
                            $room_currency = $this->get_currency_symbol($room['currency'] ?? $currency);
                            $room_amenities = $room['amenities'] ?? array();
                            $room_location = $room['city'] ?? $room['district'] ?? '';
                            $room_property_name = $room['property_name'] ?? '';
                            $card_display_name = $this->extract_display_text($room['display_name'] ?? '') ?: $room['name'];
                            $card_subtitle = $this->extract_display_text($room['short_description'] ?? '') ?: ($room['property_name'] ?? '');
                            
                            // Hide rooms beyond initial load
                            // Show all rooms - no pagination
                            $is_hidden = false;
                            $room_index++;
                        ?>
                        <div class="gas-room-card <?php echo $is_hidden ? 'gas-room-hidden' : ''; ?><?php echo $has_dates ? ' checking' : ''; ?>" 
                             data-room-id="<?php echo esc_attr($room['id']); ?>"
                             data-property-id="<?php echo esc_attr($room['property_id'] ?? ''); ?>"
                             data-payment-account-id="<?php echo esc_attr($room['payment_account_id'] ?? ''); ?>"
                             data-max-guests="<?php echo $max_guests; ?>"
                             data-price="0"
                             data-base-price-raw="<?php echo $price; ?>"
                             data-lat="<?php echo esc_attr($lat); ?>"
                             data-lng="<?php echo esc_attr($lng); ?>"
                             data-url="<?php echo esc_url($room_url); ?>"
                             data-location="<?php echo esc_attr($room_location); ?>"
                             data-property-name="<?php echo esc_attr($room_property_name); ?>"
                             data-amenities="<?php echo esc_attr(json_encode(array_column($room_amenities, 'code'))); ?>"
                             <?php echo $is_hidden ? 'style="display:none;"' : ''; ?>><?php if (!empty($image_url)) : ?>
                            <div class="gas-room-image" <?php echo $room_index <= 6 ? 'style="background: url(\'' . esc_url($image_url) . '\') center/cover;"' : 'data-bg="' . esc_url($image_url) . '" style="background: #f0f0f0;"'; ?>></div>
                            <?php else : ?>
                            <div class="gas-room-image">🏠</div>
                            <?php endif; ?>
                            <div class="gas-room-details">
                                <h3><?php echo esc_html($card_display_name); ?></h3>
                                <?php if (!empty($card_subtitle)) : ?>
                                <div class="gas-room-property">📍 <?php echo esc_html($card_subtitle); ?><?php if (!empty($room['city'])) echo ', ' . esc_html($room['city']); ?></div>
                                <?php endif; ?>
                                
                                <div class="gas-room-meta">
                                    <span>👥 <?php echo $max_guests; ?> <?php echo $max_guests > 1 ? $guests_word : $guest_word; ?></span>
                                    <?php if ($bedrooms > 0) : ?>
                                    <span>🛏️ <?php echo $bedrooms; ?> <?php echo $bedrooms > 1 ? $bedrooms_word : $bedroom_word; ?></span>
                                    <?php endif; ?>
                                    <?php if ($bathrooms > 0) : ?>
                                    <span>🚿 <?php echo $bathrooms_display; ?> <?php echo $bathrooms > 1 ? $bathrooms_word : $bathroom_word; ?></span>
                                    <?php endif; ?>
                                </div>
                                
                                <div class="gas-room-footer">
                                    <div class="gas-room-price">
                                        <?php if ($has_dates) : ?>
                                            <span class="gas-checking">⏳ <?php echo esc_html($checking_text); ?></span>
                                        <?php elseif ($is_homepage && $price > 0) : ?>
                                            <span class="gas-price-amount"><?php echo esc_html($room_currency . number_format($price, 0)); ?></span>
                                            <span class="gas-price-period"><?php echo esc_html($per_night_text); ?></span>
                                        <?php elseif (!$is_homepage) : ?>
                                            <span><?php echo esc_html($t_booking['select_dates'] ?? 'Select dates'); ?></span>
                                        <?php endif; ?>
                                    </div>
                                    <a href="<?php echo esc_url($room_url); ?>" class="gas-view-btn" <?php if ($has_dates) : ?>style="background: #6366f1; pointer-events: none;"<?php endif; ?>><?php echo $has_dates ? esc_html($checking_text) : esc_html($view_book_text); ?></a>
                                </div>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
            
            <?php if ($show_map && $has_coordinates) : ?>
            <div class="gas-rooms-map-panel">
                <div id="gas-rooms-map" class="gas-rooms-map"></div>
            </div>
            <?php endif; ?>
        </div>
        </div><!-- .gas-rooms-page-wrapper -->
        
        <script type="text/javascript">
        var gasRoomsConfig = <?php echo wp_json_encode(array(
            'checkin' => $checkin,
            'checkout' => $checkout,
            'guests' => intval($guests),
            'apiUrl' => $api_url,
            'currency' => $currency,
            'roomUrlBase' => $room_url_base,
            'showMap' => $show_map && $has_coordinates
        )); ?>;
        
        <?php if ($show_map && $has_coordinates) : ?>
        // Build rooms data for map
        var gasRoomsMapData = <?php 
            $map_rooms = array();
            foreach ($rooms as $room) {
                if (!empty($room['latitude']) && !empty($room['longitude'])) {
                    $url_separator = (strpos($room_url_base, '?') !== false) ? '&' : '?';
                    $room_url = $room_url_base . $url_separator . 'unit_id=' . $room['id'];
                    if ($checkin) $room_url .= '&checkin=' . urlencode($checkin);
                    if ($checkout) $room_url .= '&checkout=' . urlencode($checkout);
                    if ($guests) $room_url .= '&guests=' . intval($guests);
                    
                    $map_rooms[] = array(
                        'id' => $room['id'],
                        'name' => $room['name'],
                        'display_name' => $room['display_name'] ?? null,
                        'property_name' => $room['property_name'] ?? '',
                        'price' => floatval($room['price'] ?? 0),
                        'image_url' => $room['image_url'] ?? '',
                        'lat' => floatval($room['latitude']),
                        'lng' => floatval($room['longitude']),
                        'url' => $room_url,
                        'property_id' => $room['property_id'] ?? '',
                        'currency' => $room['currency'] ?? ''
                    );
                }
            }
            echo wp_json_encode($map_rooms);
        ?>;
        <?php endif; ?>
        
        // Load More functionality
        var gasLoadMoreBatch = 20;
        function gasLoadMoreRooms() {
            var hiddenRooms = document.querySelectorAll('.gas-room-card.gas-room-hidden');
            var toShow = Math.min(gasLoadMoreBatch, hiddenRooms.length);
            
            for (var i = 0; i < toShow; i++) {
                var room = hiddenRooms[i];
                room.classList.remove('gas-room-hidden');
                room.style.display = '';
                
                // Load lazy background image
                var imageDiv = room.querySelector('.gas-room-image[data-bg]');
                if (imageDiv) {
                    imageDiv.style.background = "url('" + imageDiv.dataset.bg + "') center/cover";
                    imageDiv.removeAttribute('data-bg');
                }
            }
            
            // Update remaining count or hide button
            var remaining = document.querySelectorAll('.gas-room-card.gas-room-hidden').length;
            var btn = document.querySelector('.gas-load-more-btn');
            if (remaining === 0) {
                document.querySelector('.gas-load-more-container').style.display = 'none';
            } else {
                btn.querySelector('.gas-load-more-count').textContent = '(' + remaining + ' more)';
            }
        }
        
        // Lazy load images on scroll using Intersection Observer
        if ('IntersectionObserver' in window) {
            var lazyImageObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        var imageDiv = entry.target;
                        if (imageDiv.dataset.bg) {
                            imageDiv.style.background = "url('" + imageDiv.dataset.bg + "') center/cover";
                            imageDiv.removeAttribute('data-bg');
                        }
                        lazyImageObserver.unobserve(imageDiv);
                    }
                });
            }, {
                rootMargin: '200px 0px' // Start loading 200px before visible
            });
            
            // Observe all lazy images
            document.querySelectorAll('.gas-room-image[data-bg]').forEach(function(img) {
                lazyImageObserver.observe(img);
            });
        }
        
        // Amenity filter functions
        function gasToggleAmenityDropdown(trigger) {
            var dropdown = trigger.parentElement.querySelector('.gas-amenity-dropdown');
            dropdown.classList.toggle('show');
            
            document.addEventListener('click', function closeDropdown(e) {
                if (!trigger.parentElement.contains(e.target)) {
                    dropdown.classList.remove('show');
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }
        
        function gasFilterByAmenities() {
            var checkboxes = document.querySelectorAll('.gas-amenity-dropdown input[type="checkbox"]:checked');
            var selectedAmenities = Array.from(checkboxes).map(function(cb) { return cb.value; });
            
            var trigger = document.querySelector('.gas-amenity-trigger');
            if (trigger) {
                var label = trigger.querySelector('.gas-amenity-label');
                label.textContent = selectedAmenities.length === 0 ? 'All Amenities' : selectedAmenities.length + ' selected';
            }
            
            // Apply combined location + amenity filter
            gasApplyFilters();
        }
        
        function gasFilterByLocation(location) {
            // Apply combined location + property + amenity filter
            gasApplyFilters();
        }
        
        function gasApplyFilters() {
            // Get selected location (city/district)
            var locationSelect = document.querySelector('.gas-filter-location');
            var selectedLocation = locationSelect ? locationSelect.value : '';
            
            // Get selected property
            var propertySelect = document.querySelector('.gas-filter-property');
            var selectedProperty = propertySelect ? propertySelect.value : '';
            
            // Get selected amenities
            var checkboxes = document.querySelectorAll('.gas-amenity-dropdown input[type="checkbox"]:checked');
            var selectedAmenities = Array.from(checkboxes).map(function(cb) { return cb.value; });
            
            var roomCards = document.querySelectorAll('.gas-room-card, .gas-room-row');
            var visibleCount = 0;
            
            // Collect visible properties for cascading property filter
            var visibleProperties = {};
            
            roomCards.forEach(function(card) {
                var cardLocation = card.dataset.location || '';
                var cardPropertyName = card.dataset.propertyName || '';
                var cardAmenities = [];
                try { cardAmenities = JSON.parse(card.dataset.amenities || '[]'); } catch(e) {}
                
                var matchesLocation = selectedLocation === '' || cardLocation === selectedLocation;
                var matchesProperty = selectedProperty === '' || cardPropertyName === selectedProperty;
                var matchesAmenities = selectedAmenities.length === 0 || selectedAmenities.every(function(a) { return cardAmenities.includes(a); });
                
                if (matchesLocation && matchesProperty && matchesAmenities) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
                
                // Track which properties are in the selected location (for cascading filter)
                if (matchesLocation && cardPropertyName) {
                    visibleProperties[cardPropertyName] = true;
                }
            });
            
            // Update property dropdown to only show properties in the selected location
            if (propertySelect) {
                var options = propertySelect.querySelectorAll('option');
                options.forEach(function(opt) {
                    if (opt.value === '') {
                        opt.style.display = ''; // Always show "All Properties"
                    } else if (selectedLocation === '') {
                        opt.style.display = ''; // No location filter, show all
                    } else {
                        opt.style.display = visibleProperties[opt.value] ? '' : 'none';
                    }
                });
                // Reset property if current selection is hidden
                if (selectedProperty && !visibleProperties[selectedProperty] && selectedLocation !== '') {
                    propertySelect.value = '';
                    gasApplyFilters(); // Re-run with reset property
                    return;
                }
            }
            
            // Show/hide no results message
            var container = document.getElementById('gas-rooms-container');
            var noResults = container.querySelector('.gas-no-results');
            if (visibleCount === 0) {
                if (!noResults) {
                    noResults = document.createElement('div');
                    noResults.className = 'gas-no-results';
                    noResults.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No rooms match the selected filters. Please adjust your criteria.</p>';
                    container.appendChild(noResults);
                }
                noResults.style.display = 'block';
            } else if (noResults) {
                noResults.style.display = 'none';
            }
        }
        
        function gasShowAllAmenities(element) {
            var amenities = [];
            try {
                amenities = JSON.parse(element.dataset.allAmenities || '[]');
            } catch(e) {
                console.error('Error parsing amenities', e);
                return;
            }
            
            var overlay = document.createElement('div');
            overlay.className = 'gas-amenities-popup-overlay';
            overlay.onclick = function(e) {
                if (e.target === overlay) {
                    overlay.remove();
                }
            };
            
            var popup = document.createElement('div');
            popup.className = 'gas-amenities-popup';
            popup.style.position = 'relative';
            
            var closeBtn = document.createElement('button');
            closeBtn.className = 'gas-amenities-popup-close';
            closeBtn.innerHTML = '×';
            closeBtn.onclick = function() { overlay.remove(); };
            
            var title = document.createElement('h4');
            title.textContent = 'All Amenities (' + amenities.length + ')';
            
            var list = document.createElement('div');
            list.className = 'gas-amenities-popup-list';
            
            amenities.forEach(function(amenity) {
                var item = document.createElement('span');
                item.className = 'gas-amenities-popup-item';
                item.textContent = (amenity.icon || '✓') + ' ' + (amenity.name || amenity.code);
                list.appendChild(item);
            });
            
            popup.appendChild(closeBtn);
            popup.appendChild(title);
            popup.appendChild(list);
            overlay.appendChild(popup);
            document.body.appendChild(overlay);
        }
        </script>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Single Room Detail Shortcode
     */
    public function room_shortcode($atts) {
        $atts = shortcode_atts(array(
            'unit_id' => '',
            'show_map' => 'true'
        ), $atts);
        
        $unit_id = !empty($atts['unit_id']) ? $atts['unit_id'] : (isset($_GET['unit_id']) ? intval($_GET['unit_id']) : '');
        $show_map = $atts['show_map'] === 'true';
        
        if (empty($unit_id)) {
            return '<p class="gas-error">Room ID not specified. Use: <code>[gas_room unit_id="123"]</code> or add <code>?unit_id=123</code> to the URL.</p>';
        }
        
        // Get translations for room page
        $t = $this->get_translations();
        $t_property = $t['property'] ?? array();
        $t_booking = $t['booking'] ?? array();
        $t_common = $t['common'] ?? array();
        
        // Get dates from URL if passed
        $checkin = isset($_GET['checkin']) ? sanitize_text_field($_GET['checkin']) : '';
        $checkout = isset($_GET['checkout']) ? sanitize_text_field($_GET['checkout']) : '';
        $guests = isset($_GET['guests']) ? intval($_GET['guests']) : 1;
        
        $currency = get_option('gas_currency_symbol', '');
        $button_color = $this->get_effective_button_color();
        
        ob_start();
        ?>
        <style>
        /* Dynamic button color from settings */
        :root {
            --gas-primary: <?php echo esc_attr($button_color); ?>;
            --gas-primary-dark: <?php echo esc_attr($button_color); ?>;
        }
        .gas-book-btn {
            background: <?php echo esc_attr($button_color); ?> !important;
        }
        .gas-book-btn:hover:not(:disabled) {
            background: <?php echo esc_attr($button_color); ?> !important;
            filter: brightness(0.9);
        }
        .gas-tab-btn.active {
            background: <?php echo esc_attr($button_color); ?> !important;
            color: white !important;
        }
        .gas-submit-btn {
            background: <?php echo esc_attr($button_color); ?> !important;
        }
        .gas-submit-btn:hover {
            filter: brightness(0.9);
        }
        </style>
        <div class="gas-room-widget" data-unit-id="<?php echo esc_attr($unit_id); ?>" data-checkin="<?php echo esc_attr($checkin); ?>" data-checkout="<?php echo esc_attr($checkout); ?>" data-guests="<?php echo esc_attr($guests); ?>" data-show-map="<?php echo $show_map ? 'true' : 'false'; ?>">
            <div class="gas-room-loading">
                <div class="gas-spinner"></div>
                <p style="margin-top: 16px;">Loading room details...</p>
            </div>
            
            <div class="gas-room-content" style="display:none;">
                <!-- Image Gallery - Dwellfort Style -->
                <div class="gas-gallery"></div>
                
                <!-- Lightbox for gallery -->
                <div class="gas-lightbox">
                    <button class="gas-lightbox-close">&times;</button>
                    <button class="gas-lightbox-nav gas-lightbox-prev">&#8249;</button>
                    <div class="gas-lightbox-content">
                        <img src="" alt="Gallery image">
                    </div>
                    <button class="gas-lightbox-nav gas-lightbox-next">&#8250;</button>
                    <div class="gas-lightbox-counter"></div>
                </div>
                
                <div class="gas-room-layout">
                    <!-- Left Column: Details with Tabs -->
                    <div class="gas-room-main">
                        <!-- Room Header with Icons -->
                        <div class="gas-room-header">
                            <h1 class="gas-room-title"></h1>
                            <p class="gas-room-location"></p>
                            <div class="gas-room-meta"></div>
                        </div>
                        
                        <!-- Tabs Navigation -->
                        <div class="gas-tabs">
                            <div class="gas-tabs-nav">
                                <button class="gas-tab-btn active" data-tab="description"><?php echo esc_html($t_property['description'] ?? 'Description'); ?></button>
                                <button class="gas-tab-btn" data-tab="availability"><?php echo esc_html($t_property['availability'] ?? 'Availability'); ?></button>
                                <button class="gas-tab-btn" data-tab="features"><?php echo esc_html($t_property['features'] ?? 'Features'); ?></button>
                                <button class="gas-tab-btn" data-tab="reviews"><?php echo esc_html($t_property['reviews'] ?? 'Reviews'); ?></button>
                                <button class="gas-tab-btn" data-tab="terms"><?php echo esc_html($t_property['terms'] ?? 'Terms'); ?></button>
                            </div>
                            
                            <!-- Description Tab -->
                            <div class="gas-tab-content active" data-tab="description">
                                <div class="gas-description">
                                    <div class="gas-description-short"></div>
                                    <button type="button" class="gas-more-info-toggle" style="display:none;">
                                        <span>More Information</span>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                    </button>
                                    <div class="gas-description-full"></div>
                                </div>
                            </div>
                            
                            <!-- Availability Tab -->
                            <div class="gas-tab-content" data-tab="availability">
                                <div class="gas-calendar-container">
                                    <!-- Month 1 -->
                                    <div class="gas-calendar" data-month="current">
                                        <div class="gas-calendar-header">
                                            <div class="gas-calendar-title"></div>
                                            <div class="gas-calendar-nav">
                                                <button class="gas-cal-prev">&#8249;</button>
                                            </div>
                                        </div>
                                        <div class="gas-calendar-grid"></div>
                                    </div>
                                    <!-- Month 2 -->
                                    <div class="gas-calendar" data-month="next">
                                        <div class="gas-calendar-header">
                                            <div class="gas-calendar-title"></div>
                                            <div class="gas-calendar-nav">
                                                <button class="gas-cal-next">&#8250;</button>
                                            </div>
                                        </div>
                                        <div class="gas-calendar-grid"></div>
                                    </div>
                                    <!-- Legend -->
                                    <div class="gas-calendar-legend">
                                        <div class="gas-legend-item">
                                            <div class="gas-legend-dot available"></div>
                                            <span><?php echo esc_html($t_common['available'] ?? 'Available'); ?></span>
                                        </div>
                                        <div class="gas-legend-item">
                                            <div class="gas-legend-dot unavailable"></div>
                                            <span><?php echo esc_html($t_common['unavailable'] ?? 'Unavailable'); ?></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Features Tab -->
                            <div class="gas-tab-content" data-tab="features">
                                <div class="gas-amenities-container"></div>
                            </div>
                            
                            <!-- Reviews Tab -->
                            <div class="gas-tab-content" data-tab="reviews">
                                <div class="gas-reviews-container">
                                    <div class="gas-reviews-loading" style="text-align: center; padding: 40px;">
                                        <div class="gas-spinner"></div>
                                        <p style="margin-top: 16px; color: #64748b;">Loading reviews...</p>
                                    </div>
                                    <div class="gas-reviews-content" style="display: none;">
                                        <div class="gas-reviews-summary" style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, #667eea, #8b5cf6); border-radius: 12px; color: white;">
                                            <div style="text-align: center;">
                                                <div class="gas-reviews-avg" style="font-size: 48px; font-weight: 700; line-height: 1;">-</div>
                                                <div class="gas-reviews-stars" style="color: #fbbf24; font-size: 20px; margin: 4px 0;">★★★★★</div>
                                            </div>
                                            <div>
                                                <div class="gas-reviews-count" style="font-size: 16px; opacity: 0.9;">0 reviews</div>
                                                <div style="font-size: 13px; opacity: 0.7; margin-top: 4px;">Guest ratings</div>
                                            </div>
                                        </div>
                                        <div class="gas-reviews-list" style="display: flex; flex-direction: column; gap: 16px;"></div>
                                        <div class="gas-reviews-empty" style="display: none; text-align: center; padding: 40px; color: #64748b;">
                                            <div style="font-size: 48px; margin-bottom: 12px;">⭐</div>
                                            <p>No reviews yet for this room.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Terms Tab -->
                            <div class="gas-tab-content" data-tab="terms">
                                <div class="gas-accordion">
                                    <div class="gas-accordion-item" data-accordion="general">
                                        <button class="gas-accordion-header">
                                            <span><?php echo esc_html($t_property['general_terms'] ?? 'General Terms'); ?></span>
                                            <span class="gas-accordion-icon">+</span>
                                        </button>
                                        <div class="gas-accordion-content gas-general-terms">
                                            <p><?php echo esc_html($t_property['no_terms'] ?? 'No general terms provided.'); ?></p>
                                        </div>
                                    </div>
                                    <div class="gas-accordion-item" data-accordion="rules">
                                        <button class="gas-accordion-header">
                                            <span><?php echo esc_html($t_property['house_rules'] ?? 'House Rules'); ?></span>
                                            <span class="gas-accordion-icon">+</span>
                                        </button>
                                        <div class="gas-accordion-content gas-house-rules">
                                            <p><?php echo esc_html($t_property['no_rules'] ?? 'No house rules provided.'); ?></p>
                                        </div>
                                    </div>
                                    <div class="gas-accordion-item" data-accordion="cancellation">
                                        <button class="gas-accordion-header">
                                            <span><?php echo esc_html($t_property['cancellation_policy'] ?? 'Cancellation Policy'); ?></span>
                                            <span class="gas-accordion-icon">+</span>
                                        </button>
                                        <div class="gas-accordion-content gas-cancellation-policy">
                                            <p><?php echo esc_html($t_property['no_cancellation'] ?? 'No cancellation policy provided.'); ?></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Map Section (optional) -->
                        <div class="gas-map-container" style="display:none;">
                            <h3 class="gas-map-title"><?php echo esc_html($t_property['location'] ?? 'Location'); ?></h3>
                            <div class="gas-map"></div>
                        </div>
                    </div>
                    
                    <!-- Right Column: Booking Card -->
                    <div class="gas-room-sidebar">
                        <!-- Offers Banner (generic teaser) -->
                        <div class="gas-offers-banner" style="display: none;">
                            <div class="gas-offer-badge">🎉 <?php echo esc_html($t_booking['special_offer'] ?? 'Special Offer'); ?></div>
                            <div class="gas-offer-teaser"><?php echo esc_html($t_booking['special_rates_available'] ?? 'We have special rates available for your dates!'); ?></div>
                            <div class="gas-offer-hint"><?php echo esc_html($t_booking['see_rates_below'] ?? 'See rate options below ↓'); ?></div>
                        </div>
                        
                        <div class="gas-booking-card">
                            <div class="gas-booking-card-header">
                                <div class="gas-price-display">
                                    <span class="gas-price-amount"></span>
                                    <span class="gas-price-period"><?php echo esc_html($t_booking['price_per_night'] ?? '/ night'); ?></span>
                                </div>
                            </div>
                            
                            <div class="gas-booking-card-body">
                                <div class="gas-date-inputs">
                                    <div class="gas-date-field">
                                        <label><?php echo esc_html(strtoupper($t_booking['check_in'] ?? 'Check-in')); ?></label>
                                        <input type="date" class="gas-checkin" value="<?php echo esc_attr($checkin); ?>" min="<?php echo date('Y-m-d'); ?>" />
                                    </div>
                                    <div class="gas-date-field">
                                        <label><?php echo esc_html(strtoupper($t_booking['check_out'] ?? 'Check-out')); ?></label>
                                        <input type="date" class="gas-checkout" value="<?php echo esc_attr($checkout); ?>" min="<?php echo date('Y-m-d', strtotime('+1 day')); ?>" />
                                    </div>
                                </div>
                                
                                <div class="gas-guest-fields">
                                    <div class="gas-adults-field">
                                        <label><?php echo esc_html(strtoupper($t_booking['adults'] ?? 'Adults')); ?></label>
                                        <select class="gas-adults"></select>
                                    </div>
                                    <div class="gas-children-field">
                                        <label><?php echo esc_html(strtoupper($t_booking['children'] ?? 'Children')); ?> <span class="gas-child-age-label">(<?php echo esc_html($t_common['under'] ?? 'under'); ?> 12)</span></label>
                                        <select class="gas-children"></select>
                                    </div>
                                </div>
                                
                                <div class="gas-occupancy-adjustment" style="display: none; margin-bottom: 12px; padding: 8px 12px; background: #fef3c7; border-radius: 6px; font-size: 13px; color: #92400e;">
                                    <span class="gas-adjustment-text"></span>
                                </div>
                                
                                <div class="gas-price-breakdown" style="display: none;">
                                    <div class="gas-price-row">
                                        <span class="gas-nights-text"></span>
                                        <span class="gas-nights-price"></span>
                                    </div>
                                    <div class="gas-price-row gas-occupancy-row" style="display: none;">
                                        <span class="gas-occupancy-label"><?php echo esc_html($t_booking['guest_adjustment'] ?? 'Guest adjustment'); ?></span>
                                        <span class="gas-occupancy-amount"></span>
                                    </div>
                                    <div class="gas-price-row gas-upsells-row" style="display: none;">
                                        <span>Extras</span>
                                        <span class="gas-upsells-total"></span>
                                    </div>
                                    <div class="gas-price-row gas-offer-row" style="display: none;">
                                        <span class="gas-offer-label"><?php echo esc_html($t_booking['offer_discount'] ?? 'Offer discount'); ?></span>
                                        <span class="gas-offer-amount"></span>
                                    </div>
                                    <div class="gas-price-row gas-total-row">
                                        <span><?php echo esc_html($t_booking['total'] ?? 'Total Room Charge'); ?></span>
                                        <span class="gas-total-price"></span>
                                    </div>
                                </div>
                                
                                <button type="button" class="gas-book-btn" disabled>
                                    <?php echo esc_html($t_booking['select_dates_to_check'] ?? 'Select dates to check availability'); ?>
                                </button>
                                <button type="button" class="gas-add-to-cart-btn" disabled>
                                    + <?php echo esc_html($t_booking['add_to_cart'] ?? 'Add to Cart'); ?>
                                </button>
                                <div class="gas-cart-status" style="display:none; margin-top: 12px; padding: 15px; background: #f0f9ff; border-radius: 8px; text-align: center;">
                                    <div style="font-size: 14px; color: #0369a1; margin-bottom: 10px;">
                                        ✓ <span class="gas-cart-count">0</span> <?php echo esc_html($t_booking['rooms_in_cart'] ?? 'room(s) in cart'); ?>
                                    </div>
                                    <a href="#" class="gas-view-cart-link" style="display: block; background: #0ea5e9; color: white; padding: 12px 20px; border-radius: 6px; font-weight: 600; text-decoration: none; margin-bottom: 8px;"><?php echo esc_html($t_booking['go_to_cart'] ?? 'Go to Cart'); ?></a>
                                    <div style="font-size: 13px; color: #64748b;">
                                        <a href="#" class="gas-add-another-link" style="color: #0369a1; text-decoration: none;">+ <?php echo esc_html($t_booking['add_another_room'] ?? 'Add another room'); ?></a>
                                        <span style="margin: 0 8px;">|</span>
                                        <a href="#" class="gas-clear-cart-link" style="color: #dc2626; text-decoration: none;"><?php echo esc_html($t_booking['clear_cart'] ?? 'Clear cart'); ?></a>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Booking Form -->
                            <div class="gas-booking-form-section" style="display: none;">
                                <h3 class="gas-form-title"><?php echo esc_html($t_booking['complete_booking'] ?? 'Complete your booking'); ?></h3>
                                <form class="gas-booking-form">
                                    <div class="gas-form-grid">
                                        <div class="gas-form-field">
                                            <label><?php echo esc_html($t_booking['first_name'] ?? 'First Name'); ?> *</label>
                                            <input type="text" name="first_name" required />
                                        </div>
                                        <div class="gas-form-field">
                                            <label><?php echo esc_html($t_booking['last_name'] ?? 'Last Name'); ?> *</label>
                                            <input type="text" name="last_name" required />
                                        </div>
                                        <div class="gas-form-field">
                                            <label><?php echo esc_html($t_booking['email'] ?? 'Email'); ?> *</label>
                                            <input type="email" name="email" required />
                                        </div>
                                        <div class="gas-form-field">
                                            <label><?php echo esc_html($t_booking['phone'] ?? 'Phone'); ?></label>
                                            <input type="tel" name="phone" />
                                        </div>
                                        <div class="gas-form-field full-width">
                                            <label><?php echo esc_html($t_booking['special_requests'] ?? 'Special Requests'); ?></label>
                                            <textarea name="notes" rows="3"></textarea>
                                        </div>
                                    </div>
                                    <button type="submit" class="gas-submit-btn">
                                        <?php echo esc_html($t_booking['confirm_booking'] ?? 'Confirm Booking'); ?>
                                    </button>
                                </form>
                            </div>
                            
                            <!-- Confirmation -->
                            <div class="gas-booking-confirmation" style="display: none;">
                                <div class="gas-confirmation-icon">✓</div>
                                <h3 class="gas-confirmation-title"><?php echo esc_html($t_booking['booking_confirmed'] ?? 'Booking Confirmed!'); ?></h3>
                                <p class="gas-confirmation-text"></p>
                                <div class="gas-booking-id"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Compact Booking Widget
     */
    public function booking_shortcode($atts) {
        return $this->room_shortcode($atts);
    }
    
    /**
     * Checkout Page Shortcode
     * Usage: [gas_checkout]
     * Displays full checkout form with booking summary, upsells, guest details
     */
    public function checkout_shortcode($atts) {
        $atts = shortcode_atts(array(), $atts);
        
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $client_id = get_option('gas_client_id', '');
        $currency = get_option('gas_currency_symbol', '');
        $button_color = $this->get_effective_button_color();
        
        // Get translations for checkout
        $t = $this->get_translations();
        $t_checkout = $t['checkout'] ?? array();
        $t_booking = $t['booking'] ?? array();
        $t_guest = $t['guest_details'] ?? array();
        $t_payment = $t['payment'] ?? array();
        $t_common = $t['common'] ?? array();
        
        // Check if group booking
        $is_group = isset($_GET['group']) && $_GET['group'] == '1';
        
        // Get booking details from URL params
        $unit_id = isset($_GET['room']) ? intval($_GET['room']) : 0;
        $checkin = isset($_GET['checkin']) ? sanitize_text_field($_GET['checkin']) : '';
        $checkout = isset($_GET['checkout']) ? sanitize_text_field($_GET['checkout']) : '';
        $guests = isset($_GET['guests']) ? intval($_GET['guests']) : 1;
        $adults = isset($_GET['adults']) ? intval($_GET['adults']) : $guests;
        $children = isset($_GET['children']) ? intval($_GET['children']) : 0;
        $rate_type = isset($_GET['rate']) ? sanitize_text_field($_GET['rate']) : 'standard';
        $property_id = isset($_GET['property']) ? intval($_GET['property']) : 0;
        $currency_param = isset($_GET['currency']) ? sanitize_text_field($_GET['currency']) : '';
        
        // For group bookings, data comes from localStorage via JS
        if (!$is_group && (!$unit_id || !$checkin || !$checkout)) {
            return '<div class="gas-checkout-error">
                <h2>Missing Booking Details</h2>
                <p>Please select a room and dates first.</p>
                <a href="' . esc_url(get_option('gas_search_results_url', '/book-now/')) . '" class="gas-btn-back">Browse Rooms</a>
            </div>';
        }
        
        ob_start();
        ?>
        <div class="gas-checkout-page" 
             data-unit-id="<?php echo esc_attr($unit_id); ?>"
             data-property-id="<?php echo esc_attr($property_id); ?>"
             data-checkin="<?php echo esc_attr($checkin); ?>"
             data-checkout="<?php echo esc_attr($checkout); ?>"
             data-guests="<?php echo esc_attr($guests); ?>"
             data-adults="<?php echo esc_attr($adults); ?>"
             data-children="<?php echo esc_attr($children); ?>"
             data-rate-type="<?php echo esc_attr($rate_type); ?>"
             data-api-url="<?php echo esc_attr($api_url); ?>"
             data-client-id="<?php echo esc_attr($client_id); ?>"
             data-currency="<?php echo esc_attr($currency_param); ?>"
             data-is-group="<?php echo $is_group ? '1' : '0'; ?>">
            
            <h1 class="gas-checkout-title"><?php echo esc_html($t_checkout['your_booking'] ?? 'Your Booking'); ?></h1>
            
            <div class="gas-checkout-container">
                <!-- LEFT COLUMN: Booking Summary (50%) -->
                <div class="gas-checkout-summary-col">
                    <div class="gas-booking-summary">
                        <h2 class="gas-summary-title"><?php echo $is_group ? esc_html($t_checkout['your_rooms'] ?? 'Your Rooms') : esc_html($t_checkout['your_booking'] ?? 'Your Booking'); ?></h2>
                        
                        <?php if ($is_group): ?>
                        <!-- Group rooms loaded from cart via JS -->
                        <div class="gas-group-rooms-list">
                            <p>Loading rooms from cart...</p>
                        </div>
                        <div class="gas-add-room-link" style="text-align: center; padding: 10px 0; border-top: 1px solid #e2e8f0; margin-top: 10px;">
                            <a href="#" class="gas-add-another-link" style="color: #0369a1; text-decoration: none; font-size: 14px;">+ Add another room</a>
                        </div>
                        <?php else: ?>
                        <!-- Room Info -->
                        <div class="gas-summary-room">
                            <div class="gas-summary-image">
                                <img src="" alt="Room" class="gas-room-thumb" />
                            </div>
                            <div class="gas-summary-room-info">
                                <h3 class="gas-summary-room-name">Loading...</h3>
                                <p class="gas-summary-property"></p>
                            </div>
                        </div>
                        <?php endif; ?>
                        
                        <!-- Dates & Guests -->
                        <div class="gas-summary-details">
                            <div class="gas-summary-row">
                                <div class="gas-summary-date-block">
                                    <span class="gas-date-label"><?php echo esc_html(strtoupper($t_booking['check_in'] ?? 'Check-in')); ?></span>
                                    <span class="gas-date-value gas-checkin-display"><?php echo $checkin ? esc_html(date('D, M j, Y', strtotime($checkin))) : 'Loading...'; ?></span>
                                    <span class="gas-date-time"><?php echo esc_html($t_booking['from_time'] ?? 'From'); ?> 3:00 PM</span>
                                </div>
                                <div class="gas-summary-date-block">
                                    <span class="gas-date-label"><?php echo esc_html(strtoupper($t_booking['check_out'] ?? 'Check-out')); ?></span>
                                    <span class="gas-date-value gas-checkout-display"><?php echo $checkout ? esc_html(date('D, M j, Y', strtotime($checkout))) : 'Loading...'; ?></span>
                                    <span class="gas-date-time"><?php echo esc_html($t_booking['by_time'] ?? 'By'); ?> 11:00 AM</span>
                                </div>
                            </div>
                            
                            <div class="gas-summary-info-row">
                                <span class="gas-guests-display">
                                    👤 <?php 
                                    $adult_word = $t_booking['adult'] ?? 'Adult';
                                    $adults_word = $t_booking['adults'] ?? 'Adults';
                                    $child_word = $t_booking['child'] ?? 'Child';
                                    $children_word = $t_booking['children'] ?? 'Children';
                                    if ($children > 0) {
                                        echo esc_html($adults) . ' ' . ($adults > 1 ? $adults_word : $adult_word) . ', ' . esc_html($children) . ' ' . ($children > 1 ? $children_word : $child_word);
                                    } else {
                                        echo esc_html($adults) . ' ' . ($adults > 1 ? $adults_word : $adult_word);
                                    }
                                    ?>
                                </span>
                                <span class="gas-rate-badge <?php echo $rate_type === 'offer' ? 'offer' : ''; ?>">
                                    <?php echo $rate_type === 'offer' ? '🎉 ' . esc_html($t_checkout['special_offer'] ?? 'Special Offer') : esc_html($t_checkout['standard_rate'] ?? 'Standard Rate'); ?>
                                </span>
                            </div>
                        </div>
                        
                        <div class="gas-summary-divider"></div>
                        
                        <!-- Price Breakdown -->
                        <div class="gas-price-breakdown">
                            <h4><?php echo esc_html($t_checkout['price_details'] ?? 'Price Details'); ?></h4>
                            
                            <div class="gas-price-line">
                                <span class="gas-nights-label">Loading...</span>
                                <span class="gas-nights-total"></span>
                            </div>
                            
                            <div class="gas-price-line gas-discount-line" style="display:none;">
                                <span><?php echo esc_html($t_checkout['offer_discount'] ?? 'Offer Discount'); ?></span>
                                <span class="gas-discount-amount"></span>
                            </div>
                            
                            <!-- Selected Extras -->
                            <div class="gas-selected-extras" style="display:none;">
                                <div class="gas-extras-header"><?php echo esc_html($t_checkout['your_extras'] ?? 'Your Extras'); ?></div>
                                <div class="gas-extras-list"></div>
                            </div>
                            
                            <div class="gas-price-line gas-voucher-line" style="display:none;">
                                <span class="gas-voucher-label"><?php echo esc_html($t_checkout['promo_code'] ?? 'Promo Code'); ?></span>
                                <span class="gas-voucher-discount"></span>
                            </div>
                            
                            <!-- Taxes -->
                            <div class="gas-taxes-section" style="display:none;">
                                <div class="gas-taxes-header"><?php echo esc_html($t_checkout['taxes_fees'] ?? 'Taxes & Fees'); ?></div>
                                <div class="gas-taxes-list"></div>
                            </div>
                        </div>
                        
                        <div class="gas-summary-divider"></div>
                        
                        <!-- Total -->
                        <div class="gas-summary-total">
                            <span><?php echo esc_html($t_checkout['total'] ?? 'Total'); ?></span>
                            <span class="gas-grand-total">--</span>
                        </div>
                        <p class="gas-tax-note"><?php echo esc_html($t_checkout['includes_taxes'] ?? 'Includes all taxes and fees'); ?></p>
                        
                        <!-- Cancellation Policy -->
                        <div class="gas-cancellation-box">
                            <div class="gas-policy-header">📋 <?php echo esc_html($t_checkout['cancellation_policy'] ?? 'Cancellation Policy'); ?></div>
                            <p class="gas-policy-standard" style="display:none;">
                                <strong><?php echo esc_html($t_checkout['free_cancellation'] ?? 'Free cancellation'); ?></strong> <?php echo esc_html($t_checkout['until_48h'] ?? 'until 48 hours before check-in.'); ?>
                            </p>
                            <p class="gas-policy-nonrefund" style="display:none;">
                                <strong><?php echo esc_html($t_checkout['non_refundable'] ?? 'Non-refundable.'); ?></strong> <?php echo esc_html($t_checkout['cannot_cancel'] ?? 'This rate cannot be cancelled or modified.'); ?>
                            </p>
                        </div>
                        
                        <!-- Trust Badges -->
                        <div class="gas-trust-badges">
                            <div class="gas-trust-badge">🔒 <?php echo esc_html($t_checkout['secure_booking'] ?? 'Secure Booking'); ?></div>
                            <div class="gas-trust-badge">✓ <?php echo esc_html($t_checkout['instant_confirmation'] ?? 'Instant Confirmation'); ?></div>
                            <div class="gas-trust-badge">💬 <?php echo esc_html($t_checkout['support_24_7'] ?? '24/7 Support'); ?></div>
                        </div>
                    </div>
                </div>
                
                <!-- RIGHT COLUMN: Booking Steps (50%) -->
                <div class="gas-checkout-steps-col">
                    <!-- Progress Indicator -->
                    <div class="gas-checkout-steps">
                        <div class="gas-step active" data-step="1">
                            <span class="gas-step-number">1</span>
                            <span class="gas-step-label"><?php echo esc_html($t_checkout['your_details'] ?? 'Your Details'); ?></span>
                        </div>
                        <div class="gas-step" data-step="2">
                            <span class="gas-step-number">2</span>
                            <span class="gas-step-label"><?php echo esc_html($t_checkout['extras'] ?? 'Extras'); ?></span>
                        </div>
                        <div class="gas-step" data-step="3">
                            <span class="gas-step-number">3</span>
                            <span class="gas-step-label"><?php echo esc_html($t_checkout['payment'] ?? $t_payment['payment'] ?? 'Payment'); ?></span>
                        </div>
                    </div>
                    
                    <!-- Step 1: Guest Details -->
                    <div class="gas-checkout-step-content" data-step="1">
                        <div class="gas-checkout-section">
                            <h2 class="gas-section-title"><?php echo esc_html($t_checkout['guest_details'] ?? $t_guest['guest_details'] ?? 'Guest Details'); ?></h2>
                            <p class="gas-section-subtitle"><?php echo esc_html($t_checkout['please_enter_details'] ?? "Please enter your details. We'll send the booking confirmation to your email."); ?></p>
                            
                            <form class="gas-checkout-form" id="gas-guest-form">
                                <div class="gas-form-row">
                                    <div class="gas-form-field">
                                        <label><?php echo esc_html($t_checkout['first_name'] ?? $t_guest['first_name'] ?? 'First Name'); ?> <span class="required">*</span></label>
                                        <input type="text" name="first_name" required placeholder="John" />
                                    </div>
                                    <div class="gas-form-field">
                                        <label><?php echo esc_html($t_checkout['last_name'] ?? $t_guest['last_name'] ?? 'Last Name'); ?> <span class="required">*</span></label>
                                        <input type="text" name="last_name" required placeholder="Smith" />
                                    </div>
                                </div>
                                
                                <div class="gas-form-row">
                                    <div class="gas-form-field">
                                        <label><?php echo esc_html($t_checkout['email_address'] ?? $t_guest['email'] ?? 'Email Address'); ?> <span class="required">*</span></label>
                                        <input type="email" name="email" id="gas-email" required placeholder="john@example.com" />
                                    </div>
                                    <div class="gas-form-field">
                                        <label><?php echo esc_html($t_checkout['confirm_email'] ?? 'Confirm Email'); ?> <span class="required">*</span></label>
                                        <input type="email" name="email_confirm" id="gas-email-confirm" required placeholder="john@example.com" />
                                        <span class="gas-email-match" style="display:none;">✓ Emails match</span>
                                        <span class="gas-email-mismatch" style="display:none;">✗ Emails don't match</span>
                                    </div>
                                </div>
                                
                                <div class="gas-form-row">
                                    <div class="gas-form-field">
                                        <label><?php echo esc_html($t_checkout['phone_number'] ?? $t_guest['phone'] ?? 'Phone Number'); ?> <span class="required">*</span></label>
                                        <input type="tel" name="phone" required placeholder="+44 7700 900000" />
                                    </div>
                                    <div class="gas-form-field gas-country-search-wrap">
                                        <label><?php echo esc_html($t_checkout['country'] ?? $t_guest['country'] ?? 'Country'); ?></label>
                                        <input type="hidden" name="country" value="" />
                                        <input type="text" class="gas-country-search" autocomplete="off" placeholder="<?php echo esc_attr($t_checkout['search_country'] ?? 'Start typing a country...'); ?>" />
                                        <div class="gas-country-dropdown"></div>
                                    </div>
                                </div>
                                
                                <div class="gas-form-row">
                                    <div class="gas-form-field full-width">
                                        <label><?php echo esc_html($t_checkout['address'] ?? $t_guest['address'] ?? 'Address'); ?> <span class="optional">(<?php echo esc_html($t_checkout['optional'] ?? 'optional'); ?>)</span></label>
                                        <input type="text" name="address" placeholder="123 Main Street" />
                                    </div>
                                </div>
                                
                                <div class="gas-form-row">
                                    <div class="gas-form-field">
                                        <label><?php echo esc_html($t_checkout['city'] ?? $t_guest['city'] ?? 'City'); ?> <span class="optional">(<?php echo esc_html($t_checkout['optional'] ?? 'optional'); ?>)</span></label>
                                        <input type="text" name="city" placeholder="London" />
                                    </div>
                                    <div class="gas-form-field">
                                        <label><?php echo esc_html($t_checkout['postcode'] ?? $t_guest['postcode'] ?? 'Postcode'); ?> <span class="optional">(<?php echo esc_html($t_checkout['optional'] ?? 'optional'); ?>)</span></label>
                                        <input type="text" name="postcode" placeholder="SW1A 1AA" />
                                    </div>
                                </div>
                                
                                <div class="gas-form-row">
                                    <div class="gas-form-field full-width">
                                        <label><?php echo esc_html($t_guest['special_requests'] ?? 'Special Requests'); ?> <span class="optional">(<?php echo esc_html($t_checkout['optional'] ?? 'optional'); ?>)</span></label>
                                        <textarea name="notes" rows="3" placeholder="<?php echo esc_attr($t_checkout['special_requests_placeholder'] ?? 'E.g., late check-in, dietary requirements, special occasion...'); ?>"></textarea>
                                        <p class="gas-field-hint"><?php echo esc_html($t_checkout['special_requests_hint'] ?? 'Special requests are subject to availability and cannot be guaranteed.'); ?></p>
                                    </div>
                                </div>
                                
                                <div class="gas-form-row">
                                    <div class="gas-form-field full-width">
                                        <label class="gas-checkbox-label">
                                            <input type="checkbox" name="marketing" value="1" />
                                            <span><?php echo esc_html($t_checkout['marketing_opt_in'] ?? 'Send me special offers and updates (you can unsubscribe anytime)'); ?></span>
                                        </label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div class="gas-checkout-nav">
                            <a href="#" class="gas-add-another-link gas-btn-secondary">← <?php echo esc_html($t_checkout['back_to_room'] ?? 'Back to Room'); ?></a>
                            <button type="button" class="gas-btn-primary gas-next-step" data-next="2" style="background:<?php echo esc_attr($button_color); ?>">
                                <?php echo esc_html($t_checkout['continue_extras'] ?? 'Continue to Extras'); ?> →
                            </button>
                        </div>
                    </div>
                    
                    <!-- Step 2: Upsells -->
                    <div class="gas-checkout-step-content" data-step="2" style="display:none;">
                        <div class="gas-checkout-section">
                            <h2 class="gas-section-title">✨ <?php echo esc_html($t_checkout['enhance_stay'] ?? 'Enhance Your Stay'); ?></h2>
                            <p class="gas-section-subtitle"><?php echo esc_html($t_checkout['add_extras_text'] ?? 'Add extras to make your stay even more special.'); ?></p>
                            
                            <div class="gas-upsells-loading"><?php echo esc_html($t_common['loading'] ?? 'Loading...'); ?></div>
                            <div class="gas-checkout-upsells"></div>
                            <div class="gas-no-upsells" style="display:none;">
                                <p><?php echo esc_html($t_checkout['no_extras'] ?? 'No extras available for this booking.'); ?></p>
                            </div>
                        </div>
                        
                        <!-- Voucher Code -->
                        <div class="gas-checkout-section">
                            <h2 class="gas-section-title">🎟️ <?php echo esc_html($t_checkout['promo_code'] ?? 'Promo Code'); ?></h2>
                            <div class="gas-voucher-row">
                                <input type="text" name="voucher_code" class="gas-voucher-input" placeholder="<?php echo esc_attr($t_checkout['enter_promo'] ?? 'Enter promo code'); ?>" />
                                <button type="button" class="gas-btn-apply"><?php echo esc_html($t_common['apply'] ?? 'Apply'); ?></button>
                            </div>
                            <div class="gas-voucher-result"></div>
                        </div>
                        
                        <div class="gas-checkout-nav">
                            <button type="button" class="gas-btn-secondary gas-prev-step" data-prev="1">← <?php echo esc_html($t_common['back'] ?? 'Back'); ?></button>
                            <button type="button" class="gas-btn-primary gas-next-step" data-next="3" style="background:<?php echo esc_attr($button_color); ?>">
                                <?php echo esc_html($t_checkout['continue_payment'] ?? 'Continue to Payment'); ?> →
                            </button>
                        </div>
                    </div>
                    
                    <!-- Step 3: Payment -->
                    <div class="gas-checkout-step-content" data-step="3" style="display:none;">
                        <div class="gas-checkout-section">
                            <h2 class="gas-section-title">💳 <?php echo esc_html($t_payment['payment'] ?? 'Payment'); ?></h2>
                            
                            <div class="gas-payment-options">
                                <label class="gas-payment-option selected">
                                    <input type="radio" name="payment_method" value="pay_at_property" checked />
                                    <div class="gas-payment-option-content">
                                        <div class="gas-payment-icon">🏠</div>
                                        <div class="gas-payment-details">
                                            <strong class="gas-pay-property-label"><?php echo esc_html($t_payment['pay_at_property'] ?? 'Pay at Property'); ?></strong>
                                            <span class="gas-pay-property-desc"><?php echo esc_html($t_payment['pay_at_property_desc'] ?? 'Pay when you arrive - no payment needed now'); ?></span>
                                        </div>
                                    </div>
                                </label>
                                
                                <label class="gas-payment-option gas-payment-card-option disabled" data-requires-stripe="true">
                                    <input type="radio" name="payment_method" value="card" disabled />
                                    <div class="gas-payment-option-content">
                                        <div class="gas-payment-icon">💳</div>
                                        <div class="gas-payment-details">
                                            <strong><?php echo esc_html($t_payment['pay_by_card'] ?? 'Pay by Card'); ?></strong>
                                            <span class="gas-card-status"><?php echo esc_html($t_common['loading'] ?? 'Loading...'); ?></span>
                                        </div>
                                    </div>
                                </label>
                                
                                <label class="gas-payment-option gas-payment-card-guarantee-option" style="display:none;">
                                    <input type="radio" name="payment_method" value="card_guarantee" />
                                    <div class="gas-payment-option-content">
                                        <div class="gas-payment-icon">&#x1F6E1;</div>
                                        <div class="gas-payment-details">
                                            <strong class="gas-card-guarantee-label"><?php echo esc_html($t_payment['card_guarantee'] ?? 'Card Guarantee'); ?></strong>
                                            <span class="gas-card-guarantee-desc"><?php echo esc_html($t_payment['card_guarantee_desc'] ?? 'Your card will be securely stored as a booking guarantee'); ?></span>
                                        </div>
                                    </div>
                                </label>
                            </div>
                            
                            <!-- Enigma Card Guarantee Form (hidden until card guarantee selected) -->
                            <div class="gas-card-guarantee-form" style="display:none;">
                                <div class="gas-card-guarantee-container" style="border: 2px solid #e9e0f7; border-radius: 12px; padding: 0; background: #faf8ff; overflow: hidden;">
                                    <div style="display: flex; align-items: center; gap: 8px; padding: 14px 16px; background: linear-gradient(135deg, #f5f0ff 0%, #ede5ff 100%); border-bottom: 1px solid #e9e0f7;">
                                        <span>&#x1F512;</span>
                                        <span style="font-size: 14px; font-weight: 600; color: #6d28d9;">Secure Card Capture</span>
                                        <span style="font-size: 11px; background: #8b5cf6; color: white; padding: 2px 8px; border-radius: 10px; margin-left: auto;">PCI Secured</span>
                                    </div>
                                    <div id="gas-enigma-iframe-container" style="min-height: 560px; background: white; overflow: hidden; padding-top: 20px;">
                                        <div class="gas-enigma-loading" style="text-align: center; padding: 40px; color: #64748b;">Loading secure form...</div>
                                    </div>
                                    <div style="padding: 10px 16px; background: #f8f6fd; border-top: 1px solid #e9e0f7; text-align: center;">
                                        <p style="font-size: 12px; color: #64748b; margin: 0;">Your card details are encrypted and stored securely. No payment will be taken now.</p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Bank Transfer Details (hidden until pay_at_property selected with bank mode) -->
                            <div class="gas-bank-transfer-panel" style="display:none; margin-top: 16px; margin-bottom: 16px;">
                                <div style="border: 2px solid #fde68a; border-radius: 12px; padding: 0; background: #fffdf5; overflow: hidden;">
                                    <div style="display: flex; align-items: center; gap: 8px; padding: 14px 16px; background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%); border-bottom: 1px solid #fde68a;">
                                        <span>&#x1F3E6;</span>
                                        <span style="font-size: 14px; font-weight: 600; color: #92400e;"><?php echo esc_html($t_payment['bank_transfer_details'] ?? 'Bank Transfer Details'); ?></span>
                                    </div>
                                    <div id="gas-bank-details-content" style="padding: 16px;">
                                        <div class="gas-bank-loading" style="text-align: center; padding: 20px; color: #64748b;">Loading bank details...</div>
                                    </div>
                                    <div id="gas-bank-instructions" style="display:none; padding: 12px 16px; background: #fefce8; border-top: 1px solid #fde68a;">
                                        <p style="font-size: 12px; color: #92400e; margin: 0;"></p>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Stripe Card Form (hidden until card payment selected) -->
                            <div class="gas-stripe-form" style="display:none;">
                                <div class="gas-stripe-card-element-container">
                                    <label><?php echo esc_html($t_payment['card_details'] ?? 'Card Details'); ?></label>
                                    <div id="gas-card-element" class="gas-card-element"></div>
                                    <div id="gas-card-errors" class="gas-card-errors" role="alert"></div>
                                </div>
                                
                                <div class="gas-payment-summary">
                                    <div class="gas-payment-row">
                                        <span><?php echo esc_html($t_payment['deposit_amount'] ?? 'Deposit Amount'); ?></span>
                                        <strong class="gas-deposit-amount-display">£0.00</strong>
                                    </div>
                                    <div class="gas-payment-row gas-balance-row" style="display:none;">
                                        <span><?php echo esc_html($t_payment['balance_due'] ?? 'Balance due at check-in'); ?></span>
                                        <strong class="gas-balance-amount-display">£0.00</strong>
                                    </div>
                                    <p class="gas-secure-note">🔒 <?php echo esc_html($t_payment['payment_secure'] ?? 'Your payment is secured by Stripe'); ?></p>
                                </div>
                            </div>
                            
                            <!-- Deposit Option (future) -->
                            <div class="gas-deposit-info" style="display:none;">
                                <p><?php echo esc_html($t_payment['deposit_info'] ?? 'A deposit will be charged now. The remaining balance is due at check-in.'); ?></p>
                            </div>
                        </div>
                        
                        <!-- Send Enquiry Option -->
                        <div class="gas-enquiry-option" style="text-align: center; padding: 12px 0;">
                            <a href="#" class="gas-send-enquiry-link" onclick="window.gasSendEnquiry(); return false;" style="color: #6366f1; font-size: 0.85rem; text-decoration: none;">
                                💬 <?php echo esc_html($t_payment['trouble_paying'] ?? 'Having trouble paying? Send an enquiry instead'); ?>
                            </a>
                        </div>
                        
                        <!-- Terms & Conditions -->
                        <div class="gas-checkout-section">
                            <div class="gas-terms-box">
                                <label class="gas-checkbox-label">
                                    <input type="checkbox" name="terms" id="gas-terms" required />
                                    <span><?php echo esc_html($t_guest['terms_agree'] ?? 'I agree to the'); ?> <a href="#" class="gas-terms-link"><?php echo esc_html($t_guest['terms_conditions'] ?? 'Terms & Conditions'); ?></a> <?php echo esc_html($t_common['and'] ?? 'and'); ?> <a href="#" class="gas-privacy-link"><?php echo esc_html($t_guest['privacy_policy'] ?? 'Privacy Policy'); ?></a>.</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="gas-checkout-nav">
                            <button type="button" class="gas-btn-secondary gas-prev-step" data-prev="2">← <?php echo esc_html($t_common['back'] ?? 'Back'); ?></button>
                            <button type="button" class="gas-btn-confirm" id="gas-confirm-booking" style="background:<?php echo esc_attr($button_color); ?>">
                                <span class="gas-btn-text"><?php echo esc_html($t_booking['confirm_booking'] ?? 'Confirm Booking'); ?></span>
                                <span class="gas-btn-loading" style="display:none;"><?php echo esc_html($t_common['processing'] ?? 'Processing...'); ?></span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Confirmation (shown after booking) -->
                    <div class="gas-checkout-confirmation" style="display:none;">
                        <div class="gas-confirmation-overlay">
                            <div class="gas-confirmation-page">
                                <div class="gas-confirmation-header">
                                    <div class="gas-confirmation-icon">✓</div>
                                    <h2 class="gas-confirmation-title">Booking Confirmed!</h2>
                                    <p class="gas-confirmation-subtitle">Thank you for your reservation</p>
                                </div>
                                
                                <div class="gas-confirmation-card">
                                    <div class="gas-confirmation-ref-box">
                                        <span class="gas-ref-label">Booking Reference</span>
                                        <span class="gas-booking-ref"></span>
                                    </div>
                                    
                                    <div class="gas-confirmation-property">
                                        <h3 class="gas-conf-property-name"></h3>
                                        <p class="gas-conf-room-name"></p>
                                    </div>
                                    
                                    <!-- Rooms list for group bookings -->
                                    <div class="gas-conf-rooms-list" style="display:none;"></div>
                                    
                                    <!-- Extras/Upsells -->
                                    <div class="gas-conf-extras-list" style="display:none;"></div>
                                    
                                    <div class="gas-confirmation-dates">
                                        <div class="gas-date-block">
                                            <span class="gas-date-label"><?php echo esc_html($t_booking['check_in'] ?? 'Check-in'); ?></span>
                                            <span class="gas-date-value gas-conf-checkin"></span>
                                            <span class="gas-date-time"><?php echo esc_html($t_booking['from_time'] ?? 'From'); ?> 3:00 PM</span>
                                        </div>
                                        <div class="gas-date-divider">→</div>
                                        <div class="gas-date-block">
                                            <span class="gas-date-label"><?php echo esc_html($t_booking['check_out'] ?? 'Check-out'); ?></span>
                                            <span class="gas-date-value gas-conf-checkout"></span>
                                            <span class="gas-date-time"><?php echo esc_html($t_booking['by_time'] ?? 'By'); ?> 11:00 AM</span>
                                        </div>
                                    </div>
                                    
                                    <div class="gas-confirmation-guests">
                                        <span class="gas-guests-icon">👤</span>
                                        <span class="gas-conf-guests"></span>
                                    </div>
                                    
                                    <div class="gas-confirmation-divider"></div>
                                    
                                    <div class="gas-confirmation-pricing">
                                        <div class="gas-price-row gas-price-total">
                                            <span><?php echo esc_html($t_checkout['total'] ?? 'Total'); ?></span>
                                            <span class="gas-conf-total"></span>
                                        </div>
                                        <div class="gas-price-row gas-price-paid" style="display:none;">
                                            <span><?php echo esc_html($t_payment['deposit_amount'] ?? 'Deposit Paid'); ?></span>
                                            <span class="gas-conf-deposit"></span>
                                        </div>
                                        <div class="gas-price-row gas-price-balance" style="display:none;">
                                            <span><?php echo esc_html($t_payment['balance_due'] ?? 'Balance Due at Check-in'); ?></span>
                                            <span class="gas-conf-balance"></span>
                                        </div>
                                        <div class="gas-price-row gas-price-property" style="display:none;">
                                            <span><?php echo esc_html($t_payment['payment'] ?? 'Payment'); ?></span>
                                            <span><?php echo esc_html($t_payment['pay_at_property'] ?? 'Pay at Property'); ?></span>
                                        </div>
                                    </div>
                                    
                                    <div class="gas-confirmation-divider"></div>
                                    
                                    <div class="gas-confirmation-contact">
                                        <p class="gas-confirmation-email-text">
                                            📧 Confirmation sent to: <strong class="gas-guest-email"></strong>
                                        </p>
                                    </div>
                                </div>
                                
                                <div class="gas-confirmation-actions">
                                    <a href="/" class="gas-btn-secondary">Return Home</a>
                                    <button type="button" class="gas-btn-primary" onclick="window.print()" style="background:<?php echo esc_attr($button_color); ?>">Print Confirmation</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="gas-confirmation-details" style="display:none;"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
        /* Hide page hero/title when checkout is displayed */
        .gas-checkout-page ~ .page-hero,
        .gas-checkout-page ~ .entry-header,
        body:has(.gas-checkout-page) .page-hero,
        body:has(.gas-checkout-page) .entry-header,
        body:has(.gas-checkout-page) .page-title-section,
        body:has(.gas-checkout-page) .hero-section,
        body:has(.gas-checkout-page) article > header,
        body:has(.gas-checkout-page) .wp-block-post-title { display: none !important; }
        
        /* Checkout page - 50/50 split layout */
        .gas-checkout-page { width: 100%; max-width: 1600px; margin: 0 auto; padding: 30px 40px; font-family: var(--gas-body-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif); box-sizing: border-box; }
        .gas-checkout-title { font-size: 32px; font-weight: 700; margin-bottom: 32px; color: #1e293b; text-align: center; }
        .gas-checkout-container { display: flex; gap: 40px; justify-content: center; }
        
        /* Left Column: Summary */
        .gas-checkout-summary-col { flex: 0 0 480px; position: sticky; top: 20px; height: fit-content; }
        .gas-booking-summary { background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
        
        /* Right Column: Steps */
        .gas-checkout-steps-col { flex: 0 0 580px; }
        .gas-summary-title { font-size: 22px; font-weight: 700; margin-bottom: 24px; color: #1e293b; }
        
        .gas-summary-room { display: flex; gap: 20px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; }
        .gas-summary-image { width: 140px; height: 100px; border-radius: 12px; overflow: hidden; background: #f1f5f9; flex-shrink: 0; }
        .gas-summary-image img { width: 100%; height: 100%; object-fit: cover; }
        .gas-summary-room-name { font-size: 18px; font-weight: 600; color: #1e293b; margin: 0 0 8px 0; }
        .gas-summary-property { font-size: 14px; color: #64748b; margin: 0; }
        
        .gas-summary-details { margin-bottom: 20px; }
        .gas-summary-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .gas-summary-date-block { background: #f8fafc; padding: 16px; border-radius: 12px; }
        .gas-date-label { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 6px; letter-spacing: 0.5px; }
        .gas-date-value { display: block; font-weight: 600; color: #1e293b; font-size: 16px; }
        .gas-date-time { font-size: 13px; color: #94a3b8; margin-top: 4px; }
        
        .gas-summary-info-row { display: flex; justify-content: space-between; align-items: center; }
        .gas-summary-info-row > span { font-size: 15px; color: #475569; }
        .gas-rate-badge { font-size: 13px; padding: 6px 12px; border-radius: 20px; background: #f1f5f9; color: #475569; }
        .gas-rate-badge.offer { background: #fef3c7; color: #92400e; }
        
        .gas-summary-divider { height: 1px; background: #e2e8f0; margin: 24px 0; }
        
        .gas-price-breakdown h4 { font-size: 14px; font-weight: 600; color: #64748b; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .gas-price-line { display: flex; justify-content: space-between; font-size: 16px; color: #475569; margin-bottom: 12px; }
        .gas-discount-line span { color: #10b981; }
        .gas-voucher-line span { color: #10b981; }
        
        .gas-selected-extras { margin: 20px 0; padding: 16px; background: #f8fafc; border-radius: 10px; }
        .gas-extras-header, .gas-taxes-header { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 10px; }
        .gas-extras-list .gas-extra-item, .gas-taxes-list .gas-tax-item { display: flex; justify-content: space-between; font-size: 15px; color: #475569; margin-bottom: 8px; }
        
        .gas-taxes-section { margin: 20px 0; padding: 16px; background: #f8fafc; border-radius: 10px; }
        
        .gas-summary-total { display: flex; justify-content: space-between; align-items: center; }
        .gas-summary-total span:first-child { font-size: 18px; font-weight: 600; color: #1e293b; }
        .gas-grand-total { font-size: 28px; font-weight: 700; color: <?php echo esc_attr($button_color); ?>; }
        .gas-tax-note { font-size: 12px; color: #94a3b8; margin: 8px 0 0 0; text-align: right; }
        
        .gas-cancellation-box { margin-top: 20px; padding: 16px; background: #fefce8; border-radius: 10px; border: 1px solid #fef08a; }
        .gas-policy-header { font-size: 14px; font-weight: 600; color: #854d0e; margin-bottom: 8px; }
        .gas-cancellation-box p { font-size: 13px; color: #713f12; margin: 0; line-height: 1.5; }
        
        .gas-trust-badges { display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
        .gas-trust-badge { font-size: 12px; padding: 6px 12px; background: #f1f5f9; border-radius: 20px; color: #475569; }
        
        /* Right Column: Steps */
        .gas-checkout-steps-col { }
        .gas-checkout-steps { display: flex; gap: 12px; margin-bottom: 32px; }
        .gas-step { display: flex; align-items: center; gap: 10px; padding: 14px 20px; background: #f1f5f9; border-radius: 10px; flex: 1; }
        .gas-step.active { background: <?php echo esc_attr($button_color); ?>; color: white; }
        .gas-step.completed { background: #10b981; color: white; }
        .gas-step-number { width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; }
        .gas-step.active .gas-step-number, .gas-step.completed .gas-step-number { background: rgba(255,255,255,0.3); }
        .gas-step-label { font-size: 14px; font-weight: 500; }
        
        /* Form styles */
        .gas-checkout-section { background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 28px; margin-bottom: 24px; }
        .gas-section-title { font-size: 20px; font-weight: 600; margin-bottom: 10px; color: #1e293b; }
        .gas-section-subtitle { color: #64748b; font-size: 15px; margin-bottom: 24px; }
        .gas-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .gas-form-field { display: flex; flex-direction: column; gap: 8px; }
        .gas-form-field.full-width { grid-column: 1 / -1; }
        .gas-form-field label { font-weight: 500; font-size: 15px; color: #374151; }
        .gas-form-field label .required { color: #ef4444; }
        .gas-form-field label .optional { color: #9ca3af; font-weight: 400; }
        .gas-form-field input, .gas-form-field select, .gas-form-field textarea { padding: 14px 16px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 16px; transition: border-color 0.2s, box-shadow 0.2s; }
        .gas-form-field input:focus, .gas-form-field select:focus, .gas-form-field textarea:focus { outline: none; border-color: <?php echo esc_attr($button_color); ?>; box-shadow: 0 0 0 3px <?php echo esc_attr($button_color); ?>20; }
        .gas-field-hint { font-size: 13px; color: #9ca3af; margin-top: 4px; }
        .gas-email-match { color: #10b981; font-size: 13px; }
        .gas-email-mismatch { color: #ef4444; font-size: 13px; }
        
        /* Checkbox */
        .gas-checkbox-label { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; font-size: 15px; color: #4b5563; }
        .gas-checkbox-label input { width: 20px; height: 20px; margin-top: 2px; }
        
        /* Navigation */
        .gas-checkout-nav { display: flex; justify-content: space-between; gap: 20px; margin-top: 28px; }
        .gas-btn-primary, .gas-btn-secondary, .gas-btn-confirm { padding: 16px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; }
        .gas-btn-primary, .gas-btn-confirm { background: <?php echo esc_attr($button_color); ?>; color: white; }
        .gas-btn-primary:hover, .gas-btn-confirm:hover { filter: brightness(0.9); }
        .gas-btn-secondary { background: white; border: 1px solid #d1d5db; color: #374151; }
        .gas-btn-secondary:hover { background: #f9fafb; }
        .gas-btn-confirm { width: 100%; padding: 18px; font-size: 17px; }
        
        /* Payment Options */
        .gas-payment-options { display: flex; flex-direction: column; gap: 12px; }
        .gas-payment-option { display: block; cursor: pointer; }
        .gas-payment-option input { display: none; }
        .gas-payment-option-content { display: flex; align-items: center; gap: 16px; padding: 16px; border: 2px solid #e2e8f0; border-radius: 10px; transition: all 0.2s; }
        .gas-payment-option.selected .gas-payment-option-content { border-color: <?php echo esc_attr($button_color); ?>; background: <?php echo esc_attr($button_color); ?>08; }
        .gas-payment-option.disabled { opacity: 0.5; cursor: not-allowed; }
        .gas-payment-option.stripe-enabled { opacity: 1; cursor: pointer; }
        .gas-payment-option.stripe-enabled .gas-payment-option-content { border-color: #e2e8f0; }
        .gas-payment-option.stripe-enabled.selected .gas-payment-option-content { border-color: <?php echo esc_attr($button_color); ?>; background: <?php echo esc_attr($button_color); ?>08; }
        
        /* Stripe Card Form */
        .gas-stripe-form { margin-top: 20px; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
        .gas-stripe-card-element-container { margin-bottom: 16px; }
        .gas-stripe-card-element-container label { display: block; font-weight: 600; margin-bottom: 8px; color: #374151; }
        .gas-card-element { padding: 12px 14px; background: white; border: 2px solid #e2e8f0; border-radius: 8px; transition: border-color 0.2s; }
        .gas-card-element.StripeElement--focus { border-color: <?php echo esc_attr($button_color); ?>; }
        .gas-card-element.StripeElement--invalid { border-color: #ef4444; }
        .gas-card-errors { color: #ef4444; font-size: 13px; margin-top: 8px; min-height: 20px; }
        .gas-payment-summary { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
        .gas-payment-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .gas-payment-row strong { font-size: 18px; color: <?php echo esc_attr($button_color); ?>; }
        .gas-secure-note { font-size: 12px; color: #64748b; margin-top: 12px; display: flex; align-items: center; gap: 6px; }
        .gas-payment-icon { font-size: 24px; }
        .gas-payment-details strong { display: block; font-size: 15px; color: #1e293b; }
        .gas-payment-details span { font-size: 13px; color: #64748b; }
        
        /* Upsells */
        .gas-checkout-upsells { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .gas-upsell-card { display: flex; flex-direction: column; padding: 20px; border: 2px solid #e2e8f0; border-radius: 12px; cursor: pointer; transition: all 0.2s; position: relative; text-align: center; }
        .gas-upsell-card:hover { border-color: #cbd5e1; background: #f8fafc; }
        .gas-upsell-card.selected { border-color: <?php echo esc_attr($button_color); ?>; background: <?php echo esc_attr($button_color); ?>08; }
        .gas-upsell-check { position: absolute; top: 10px; right: 10px; width: 24px; height: 24px; border: 2px solid #d1d5db; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; font-size: 12px; color: transparent; }
        .gas-upsell-card.selected .gas-upsell-check { background: <?php echo esc_attr($button_color); ?>; border-color: <?php echo esc_attr($button_color); ?>; color: white; }
        .gas-upsell-image { width: 80px; height: 80px; margin: 0 auto 12px; border-radius: 8px; overflow: hidden; }
        .gas-upsell-image img { width: 100%; height: 100%; object-fit: cover; }
        .gas-upsell-icon { width: 60px; height: 60px; margin: 0 auto 12px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; }
        .gas-upsell-info { flex: 1; }
        .gas-upsell-name { font-weight: 600; font-size: 15px; color: #1e293b; margin-bottom: 4px; }
        .gas-upsell-desc { font-size: 12px; color: #64748b; margin-bottom: 8px; line-height: 1.4; }
        .gas-upsell-price { font-weight: 700; font-size: 16px; color: <?php echo esc_attr($button_color); ?>; }
        .gas-upsell-price small { font-weight: 400; font-size: 12px; color: #94a3b8; }
        
        /* Voucher */
        .gas-voucher-row { display: flex; gap: 8px; }
        .gas-voucher-input { flex: 1; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; text-transform: uppercase; }
        .gas-btn-apply { padding: 12px 20px; background: #f1f5f9; border: 1px solid #d1d5db; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .gas-voucher-result { margin-top: 8px; font-size: 14px; }
        .gas-voucher-success { color: #10b981; }
        .gas-voucher-error { color: #ef4444; }
        
        /* Confirmation */
        .gas-checkout-confirmation { }
        .gas-confirmation-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #d1fae5 100%); z-index: 9999; overflow-y: auto; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .gas-confirmation-page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; box-sizing: border-box; }
        .gas-confirmation-header { text-align: center; margin-bottom: 32px; }
        .gas-confirmation-icon { width: 80px; height: 80px; background: #10b981; color: white; font-size: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); animation: scaleIn 0.4s ease 0.2s both; }
        @keyframes scaleIn { from { transform: scale(0); } to { transform: scale(1); } }
        .gas-confirmation-title { font-size: 32px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; }
        .gas-confirmation-subtitle { font-size: 18px; color: #64748b; margin: 0; }
        .gas-confirmation-card { background: #ffffff; border-radius: 20px; padding: 32px; width: 100%; max-width: 480px; text-align: left; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
        .gas-confirmation-ref-box { background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 2px solid #10b981; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
        .gas-ref-label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #059669; margin-bottom: 4px; }
        .gas-booking-ref { font-size: 28px; font-weight: 700; color: #047857; word-break: break-all; }
        .gas-booking-ref.gas-ref-small { font-size: 18px; }
        .gas-confirmation-property { margin-bottom: 24px; text-align: center; }
        .gas-conf-property-name { font-size: 20px; font-weight: 600; color: #1e293b; margin: 0 0 4px 0; }
        .gas-conf-room-name { font-size: 15px; color: #64748b; margin: 0; }
        
        /* Rooms list for group bookings */
        .gas-conf-rooms-list { margin-bottom: 24px; }
        .gas-conf-room-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .gas-conf-room-box:last-child { margin-bottom: 0; }
        .gas-conf-room-box .room-name { font-weight: 600; color: #1e293b; font-size: 14px; }
        .gas-conf-room-box .room-guests { font-size: 13px; color: #64748b; }
        .gas-conf-room-box .room-price { font-weight: 600; color: #047857; font-size: 14px; }
        
        /* Extras/Upsells list */
        .gas-conf-extras-list { margin-bottom: 24px; }
        .gas-conf-extras-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 10px; text-align: center; }
        .gas-conf-extra-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 10px; padding: 12px 16px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
        .gas-conf-extra-box:last-child { margin-bottom: 0; }
        .gas-conf-extra-box .extra-name { font-weight: 500; color: #92400e; font-size: 14px; }
        .gas-conf-extra-box .extra-price { font-weight: 600; color: #b45309; font-size: 14px; }
        
        .gas-confirmation-dates { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 20px; }
        .gas-date-block { text-align: center; flex: 1; background: #f8fafc; padding: 16px 12px; border-radius: 12px; }
        .gas-date-label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 6px; }
        .gas-date-value { display: block; font-size: 15px; font-weight: 600; color: #1e293b; }
        .gas-date-time { display: block; font-size: 12px; color: #64748b; margin-top: 4px; }
        .gas-date-divider { font-size: 24px; color: #cbd5e1; }
        .gas-confirmation-guests { text-align: center; font-size: 15px; color: #475569; margin-bottom: 20px; }
        .gas-guests-icon { margin-right: 6px; }
        .gas-confirmation-divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
        .gas-confirmation-pricing { }
        .gas-price-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px; color: #475569; }
        .gas-price-row.gas-price-total { font-weight: 600; font-size: 18px; color: #1e293b; border-bottom: 1px dashed #e2e8f0; padding-bottom: 14px; margin-bottom: 10px; }
        .gas-price-row.gas-price-paid span:last-child { color: #10b981; font-weight: 600; }
        .gas-price-row.gas-price-balance span:last-child { color: #f59e0b; font-weight: 600; }
        .gas-confirmation-contact { text-align: center; }
        .gas-confirmation-email-text { font-size: 14px; color: #64748b; margin: 0; }
        .gas-confirmation-email-text strong { color: #1e293b; }
        .gas-confirmation-actions { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; margin-top: 32px; }
        .gas-confirmation-actions .gas-btn-secondary { background: white; border: 2px solid #e2e8f0; color: #475569; padding: 14px 28px; border-radius: 10px; font-weight: 600; text-decoration: none; transition: all 0.2s; }
        .gas-confirmation-actions .gas-btn-secondary:hover { border-color: #cbd5e1; background: #f8fafc; }
        .gas-confirmation-actions .gas-btn-primary { padding: 14px 28px; border-radius: 10px; font-weight: 600; border: none; color: white; cursor: pointer; transition: all 0.2s; }
        .gas-confirmation-actions .gas-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
        @media print { .gas-confirmation-overlay { position: static; background: white; } .gas-confirmation-actions { display: none; } }
        
        /* Error */
        .gas-checkout-error { text-align: center; padding: 60px 20px; }
        .gas-checkout-error h2 { color: #ef4444; margin-bottom: 16px; }
        .gas-btn-back { display: inline-block; margin-top: 20px; padding: 12px 24px; background: <?php echo esc_attr($button_color); ?>; color: white; text-decoration: none; border-radius: 8px; }
        
        /* Responsive */
        @media (max-width: 1200px) {
            .gas-checkout-page { padding: 20px 30px; }
            .gas-checkout-summary-col { flex: 0 0 420px; }
            .gas-checkout-steps-col { flex: 0 0 500px; }
        }
        @media (max-width: 1000px) {
            .gas-checkout-container { flex-direction: column; align-items: center; }
            .gas-checkout-summary-col { flex: none; width: 100%; max-width: 600px; position: static; }
            .gas-checkout-steps-col { flex: none; width: 100%; max-width: 600px; }
            .gas-checkout-upsells { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
            .gas-checkout-page { padding: 15px; }
            .gas-form-row { grid-template-columns: 1fr; }
            .gas-checkout-steps { flex-direction: column; }
            .gas-checkout-upsells { grid-template-columns: 1fr; }
            .gas-summary-row { grid-template-columns: 1fr; }
        }
        </style>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Offers Showcase Page Shortcode
     * Usage: [gas_offers]
     * Displays all active offers and public voucher codes
     */
    public function offers_shortcode($atts) {
        $atts = shortcode_atts(array(
            'show_vouchers' => 'yes',
        ), $atts);
        
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $client_id = get_option('gas_client_id', '');
        $currency = get_option('gas_currency_symbol', '');
        $button_color = $this->get_effective_button_color();
        $book_now_url = get_option('gas_search_results_url', '/book-now/');
        
        if (empty($client_id)) {
            return '<p>Please configure your GAS Client ID in Settings.</p>';
        }
        
        ob_start();
        ?>
        <div class="gas-offers-page" data-api-url="<?php echo esc_attr($api_url); ?>" data-client-id="<?php echo esc_attr($client_id); ?>">
            
            <!-- Hero Section -->
            <div class="gas-offers-hero">
                <h1 class="gas-offers-title">🎉 Special Offers & Deals</h1>
                <p class="gas-offers-subtitle">Take advantage of our exclusive rates and promotions for your perfect stay.</p>
            </div>
            
            <!-- Offers Section -->
            <div class="gas-offers-section">
                <h2 class="gas-section-heading">Current Offers</h2>
                <div class="gas-offers-loading">Loading offers...</div>
                <div class="gas-offers-grid"></div>
                <div class="gas-no-offers" style="display:none;">
                    <p>No special offers available at the moment. Check back soon!</p>
                </div>
            </div>
            
            <?php if ($atts['show_vouchers'] === 'yes') : ?>
            <!-- Vouchers Section -->
            <div class="gas-vouchers-section">
                <h2 class="gas-section-heading">🎟️ Promo Codes</h2>
                <p class="gas-vouchers-intro">Use these codes at checkout to save on your booking!</p>
                <div class="gas-vouchers-loading">Loading promo codes...</div>
                <div class="gas-vouchers-grid"></div>
                <div class="gas-no-vouchers" style="display:none;">
                    <p>No promo codes available at the moment.</p>
                </div>
            </div>
            <?php endif; ?>
            
            <!-- CTA Section -->
            <div class="gas-offers-cta">
                <h3>Ready to Book?</h3>
                <p>Browse our rooms and apply these offers at checkout.</p>
                <a href="<?php echo esc_url($book_now_url); ?>" class="gas-offers-cta-btn" style="background:<?php echo esc_attr($button_color); ?>">
                    View Available Rooms →
                </a>
            </div>
        </div>
        
        <style>
        .gas-offers-page { max-width: 1000px; margin: 0 auto; padding: 20px; font-family: var(--gas-body-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif); }
        
        /* Hero */
        .gas-offers-hero { text-align: center; padding: 40px 20px; margin-bottom: 40px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 16px; }
        .gas-offers-title { font-size: 32px; font-weight: 700; color: #92400e; margin: 0 0 12px 0; }
        .gas-offers-subtitle { font-size: 16px; color: #a16207; margin: 0; }
        
        /* Sections */
        .gas-offers-section, .gas-vouchers-section { margin-bottom: 48px; }
        .gas-section-heading { font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
        .gas-vouchers-intro { color: #64748b; margin-bottom: 20px; }
        
        /* Offers Grid */
        .gas-offers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
        .gas-offer-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; transition: all 0.2s; position: relative; overflow: hidden; }
        .gas-offer-card:hover { box-shadow: 0 10px 40px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .gas-offer-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: <?php echo esc_attr($button_color); ?>; }
        .gas-offer-card-badge { display: inline-block; background: #f59e0b; color: white; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-bottom: 12px; }
        .gas-offer-card-name { font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
        .gas-offer-card-description { font-size: 14px; color: #64748b; margin-bottom: 16px; line-height: 1.5; }
        .gas-offer-card-discount { font-size: 28px; font-weight: 700; color: <?php echo esc_attr($button_color); ?>; margin-bottom: 16px; }
        .gas-offer-card-conditions { font-size: 12px; color: #94a3b8; }
        .gas-offer-card-conditions ul { margin: 8px 0 0 0; padding-left: 18px; }
        .gas-offer-card-conditions li { margin-bottom: 4px; }
        
        /* Vouchers Grid */
        .gas-vouchers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .gas-voucher-card { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px dashed #22c55e; border-radius: 12px; padding: 20px; text-align: center; position: relative; }
        .gas-voucher-code-label { font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .gas-voucher-code { font-size: 24px; font-weight: 700; color: #166534; font-family: monospace; background: white; padding: 10px 20px; border-radius: 8px; display: inline-block; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
        .gas-voucher-code:hover { background: #f0fdf4; }
        .gas-voucher-code.copied { background: #166534; color: white; }
        .gas-voucher-name { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
        .gas-voucher-discount { font-size: 14px; color: #16a34a; font-weight: 600; margin-bottom: 8px; }
        .gas-voucher-conditions { font-size: 12px; color: #64748b; }
        .gas-voucher-validity { font-size: 11px; color: #94a3b8; margin-top: 12px; }
        .gas-click-to-copy { font-size: 11px; color: #94a3b8; margin-top: 4px; }
        
        /* CTA */
        .gas-offers-cta { text-align: center; padding: 48px 24px; background: #f8fafc; border-radius: 16px; margin-top: 48px; }
        .gas-offers-cta h3 { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; }
        .gas-offers-cta p { color: #64748b; margin: 0 0 24px 0; }
        .gas-offers-cta-btn { display: inline-block; padding: 14px 32px; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: all 0.2s; }
        .gas-offers-cta-btn:hover { filter: brightness(0.9); color: white; }
        
        /* Loading */
        .gas-offers-loading, .gas-vouchers-loading { text-align: center; padding: 40px; color: #64748b; }
        .gas-no-offers, .gas-no-vouchers { text-align: center; padding: 40px; color: #94a3b8; background: #f8fafc; border-radius: 12px; }
        
        /* Mobile */
        @media (max-width: 640px) {
            .gas-offers-title { font-size: 24px; }
            .gas-offers-grid, .gas-vouchers-grid { grid-template-columns: 1fr; }
        }
        </style>
        
        <script>
        jQuery(document).ready(function($) {
            var apiUrl = $('.gas-offers-page').data('api-url');
            var clientId = $('.gas-offers-page').data('client-id');
            var currency = '<?php echo esc_js($currency); ?>';
            
            // Load offers
            $.ajax({
                url: apiUrl + '/api/public/client/' + clientId + '/offers',
                method: 'GET',
                success: function(response) {
                    $('.gas-offers-loading').hide();
                    if (response.success) if (response.offers) if (response.offers.length > 0) {
                        var html = '';
                        response.offers.forEach(function(offer) {
                            html += '<div class="gas-offer-card">';
                            html += '<span class="gas-offer-card-badge">Special Offer</span>';
                            html += '<div class="gas-offer-card-name">' + offer.name + '</div>';
                            if (offer.description) {
                                html += '<div class="gas-offer-card-description">' + offer.description + '</div>';
                            }
                            
                            // Discount display
                            if (offer.discount_type === 'percentage') {
                                html += '<div class="gas-offer-card-discount">Save ' + offer.discount_value + '%</div>';
                            } else {
                                html += '<div class="gas-offer-card-discount">Save ' + currency + offer.discount_value + '</div>';
                            }
                            
                            // Conditions
                            html += '<div class="gas-offer-card-conditions">';
                            html += '<strong>Conditions:</strong><ul>';
                            if (offer.min_nights) html += '<li>Minimum ' + offer.min_nights + ' nights</li>';
                            if (offer.max_nights) html += '<li>Maximum ' + offer.max_nights + ' nights</li>';
                            if (offer.min_guests) html += '<li>Minimum ' + offer.min_guests + ' guests</li>';
                            if (offer.valid_from) html += '<li>Valid from ' + offer.valid_from + '</li>';
                            if (offer.valid_until) html += '<li>Valid until ' + offer.valid_until + '</li>';
                            if (!offer.min_nights) if (!offer.max_nights) if (!offer.min_guests) if (!offer.valid_from) if (!offer.valid_until) {
                                html += '<li>Available for all bookings</li>';
                            }
                            html += '</ul></div>';
                            html += '</div>';
                        });
                        $('.gas-offers-grid').html(html);
                    } else {
                        $('.gas-no-offers').show();
                    }
                },
                error: function() {
                    $('.gas-offers-loading').hide();
                    $('.gas-no-offers').show();
                }
            });
            
            // Load vouchers (public ones)
            $.ajax({
                url: apiUrl + '/api/public/client/' + clientId + '/vouchers',
                method: 'GET',
                success: function(response) {
                    $('.gas-vouchers-loading').hide();
                    if (response.success) if (response.vouchers) if (response.vouchers.length > 0) {
                        var html = '';
                        response.vouchers.forEach(function(voucher) {
                            html += '<div class="gas-voucher-card">';
                            html += '<div class="gas-voucher-code-label">Promo Code</div>';
                            html += '<div class="gas-voucher-code" data-code="' + voucher.code + '">' + voucher.code + '</div>';
                            html += '<div class="gas-click-to-copy">Click to copy</div>';
                            html += '<div class="gas-voucher-name">' + voucher.name + '</div>';
                            
                            if (voucher.discount_type === 'percentage') {
                                html += '<div class="gas-voucher-discount">' + voucher.discount_value + '% off</div>';
                            } else {
                                html += '<div class="gas-voucher-discount">' + currency + voucher.discount_value + ' off</div>';
                            }
                            
                            var conditions = [];
                            if (voucher.min_nights) conditions.push('Min ' + voucher.min_nights + ' nights');
                            if (voucher.min_booking_value) conditions.push('Min spend ' + currency + voucher.min_booking_value);
                            if (conditions.length > 0) {
                                html += '<div class="gas-voucher-conditions">' + conditions.join(' • ') + '</div>';
                            }
                            
                            if (voucher.valid_until) {
                                html += '<div class="gas-voucher-validity">Expires: ' + voucher.valid_until + '</div>';
                            }
                            
                            html += '</div>';
                        });
                        $('.gas-vouchers-grid').html(html);
                    } else {
                        $('.gas-no-vouchers').show();
                    }
                },
                error: function() {
                    $('.gas-vouchers-loading').hide();
                    $('.gas-no-vouchers').show();
                }
            });
            
            // Copy voucher code
            $(document).on('click', '.gas-voucher-code', function() {
                var code = $(this).data('code');
                var $el = $(this);
                
                navigator.clipboard.writeText(code).then(function() {
                    $el.addClass('copied').text('Copied!');
                    setTimeout(function() {
                        $el.removeClass('copied').text(code);
                    }, 2000);
                });
            });
        });
        </script>
        <?php
        return ob_get_clean();
    }
    
    // AJAX Handlers
    public function ajax_get_availability() {
        check_ajax_referer('gas_booking_nonce', 'nonce');
        
        $unit_id = intval($_POST['unit_id']);
        $from = sanitize_text_field($_POST['from']);
        $to = sanitize_text_field($_POST['to']);
        
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $response = wp_remote_get("{$api_url}/api/public/availability/{$unit_id}?from={$from}&to={$to}", array(
            'timeout' => 30,
            'sslverify' => false
        ));
        
        if (is_wp_error($response)) {
            wp_send_json(array('success' => false, 'error' => $response->get_error_message()));
            return;
        }
        
        wp_send_json(json_decode(wp_remote_retrieve_body($response), true));
    }
    
    public function ajax_get_rooms() {
        check_ajax_referer('gas_booking_nonce', 'nonce');
        
        $client_id = intval($_POST['client_id'] ?? get_option('gas_client_id', ''));
        
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $response = wp_remote_get("{$api_url}/api/public/client/{$client_id}/rooms", array(
            'timeout' => 30,
            'sslverify' => false
        ));
        
        if (is_wp_error($response)) {
            wp_send_json(array('success' => false, 'error' => $response->get_error_message()));
            return;
        }
        
        $data = json_decode(wp_remote_retrieve_body($response), true);
        
        // Filter by deployed room IDs if set
        $deployed_room_ids = get_option('gas_room_ids', '');
        if (!empty($deployed_room_ids) && isset($data['rooms'])) {
            $decoded = json_decode($deployed_room_ids, true);
            if (is_array($decoded) && !empty($decoded)) {
                $allowed_ids = array_map('intval', $decoded);
                $data['rooms'] = array_values(array_filter($data['rooms'], function($room) use ($allowed_ids) {
                    return in_array($room['id'], $allowed_ids);
                }));
            }
        }
        
        wp_send_json($data);
    }
    
    public function ajax_calculate_price() {
        check_ajax_referer('gas_booking_nonce', 'nonce');
        
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        
        $data = array(
            'unit_id' => intval($_POST['unit_id']),
            'check_in' => sanitize_text_field($_POST['check_in']),
            'check_out' => sanitize_text_field($_POST['check_out']),
            'guests' => intval($_POST['guests'])
        );
        
        $response = wp_remote_post("{$api_url}/api/public/calculate-price", array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode($data),
            'timeout' => 30,
            'sslverify' => false
        ));
        
        if (is_wp_error($response)) {
            wp_send_json(array('success' => false, 'error' => $response->get_error_message()));
            return;
        }
        
        wp_send_json(json_decode(wp_remote_retrieve_body($response), true));
    }
    
    public function ajax_create_booking() {
        check_ajax_referer('gas_booking_nonce', 'nonce');
        
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        
        $data = array(
            'unit_id' => intval($_POST['unit_id']),
            'check_in' => sanitize_text_field($_POST['check_in']),
            'check_out' => sanitize_text_field($_POST['check_out']),
            'guests' => intval($_POST['guests']),
            'guest_first_name' => sanitize_text_field($_POST['first_name']),
            'guest_last_name' => sanitize_text_field($_POST['last_name']),
            'guest_email' => sanitize_email($_POST['email']),
            'guest_phone' => sanitize_text_field($_POST['phone'] ?? ''),
            'notes' => sanitize_textarea_field($_POST['notes'] ?? ''),
            'total_price' => floatval($_POST['total_price'] ?? 0)
        );
        
        $response = wp_remote_post("{$api_url}/api/public/book", array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode($data),
            'timeout' => 30,
            'sslverify' => false
        ));
        
        if (is_wp_error($response)) {
            wp_send_json(array('success' => false, 'error' => $response->get_error_message()));
            return;
        }
        
        wp_send_json(json_decode(wp_remote_retrieve_body($response), true));
    }
    
    // =========================================================================
    // PAGE SHORTCODES
    // =========================================================================
    
    public function about_shortcode($atts) {
        $title = get_option('gas_about_title', 'About Us');
        $content = get_option('gas_about_content', '<p>Welcome to our property. We look forward to hosting you!</p>');
        $button_color = $this->get_effective_button_color();
        
        ob_start();
        ?>
        <div class="gas-page gas-about-page">
            <style>
                .gas-page { max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: var(--gas-body-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif); }
                .gas-page-title { font-size: 2.5rem; font-weight: 700; color: #1e293b; margin-bottom: 24px; font-family: var(--gas-heading-font, inherit); }
                .gas-page-content { font-size: 1.1rem; line-height: 1.8; color: #475569; }
                .gas-page-content h2, .gas-page-content h3 { color: #1e293b; margin-top: 32px; margin-bottom: 16px; }
                .gas-page-content p { margin-bottom: 16px; }
                .gas-page-content ul, .gas-page-content ol { margin-bottom: 16px; padding-left: 24px; }
                .gas-page-content li { margin-bottom: 8px; }
            </style>
            <h1 class="gas-page-title"><?php echo esc_html($title); ?></h1>
            <div class="gas-page-content"><?php echo wp_kses_post($content); ?></div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function contact_shortcode($atts) {
        $title = get_option('gas_contact_title', 'Contact Us');
        $content = get_option('gas_contact_content', '<p>We would love to hear from you.</p>');
        $address = get_option('gas_contact_address', '');
        $phone = get_option('gas_contact_phone', '');
        $email = get_option('gas_contact_email', '');
        $map_embed = get_option('gas_contact_map_embed', '');
        $button_color = $this->get_effective_button_color();
        
        ob_start();
        ?>
        <div class="gas-page gas-contact-page">
            <style>
                .gas-page { max-width: 900px; margin: 0 auto; padding: 40px 20px; font-family: var(--gas-body-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif); }
                .gas-page-title { font-size: 2.5rem; font-weight: 700; color: #1e293b; margin-bottom: 24px; font-family: var(--gas-heading-font, inherit); }
                .gas-page-content { font-size: 1.1rem; line-height: 1.8; color: #475569; margin-bottom: 32px; }
                .gas-contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
                @media (max-width: 768px) { .gas-contact-grid { grid-template-columns: 1fr; } }
                .gas-contact-info { background: #f8fafc; padding: 32px; border-radius: 16px; }
                .gas-contact-item { margin-bottom: 24px; }
                .gas-contact-item:last-child { margin-bottom: 0; }
                .gas-contact-label { font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: <?php echo esc_attr($button_color); ?>; margin-bottom: 8px; }
                .gas-contact-value { font-size: 1.1rem; color: #1e293b; }
                .gas-contact-value a { color: <?php echo esc_attr($button_color); ?>; text-decoration: none; }
                .gas-contact-value a:hover { text-decoration: underline; }
                .gas-contact-map { border-radius: 16px; overflow: hidden; }
                .gas-contact-map iframe { width: 100%; height: 350px; border: none; }
            </style>
            <h1 class="gas-page-title"><?php echo esc_html($title); ?></h1>
            <div class="gas-page-content"><?php echo wp_kses_post($content); ?></div>
            
            <div class="gas-contact-grid">
                <div class="gas-contact-info">
                    <?php if ($address) : ?>
                    <div class="gas-contact-item">
                        <div class="gas-contact-label">📍 Address</div>
                        <div class="gas-contact-value"><?php echo nl2br(esc_html($address)); ?></div>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($phone) : ?>
                    <div class="gas-contact-item">
                        <div class="gas-contact-label">📞 Phone</div>
                        <div class="gas-contact-value"><a href="tel:<?php echo esc_attr(preg_replace('/[^0-9+]/', '', $phone)); ?>"><?php echo esc_html($phone); ?></a></div>
                    </div>
                    <?php endif; ?>
                    
                    <?php if ($email) : ?>
                    <div class="gas-contact-item">
                        <div class="gas-contact-label">✉️ Email</div>
                        <div class="gas-contact-value"><a href="mailto:<?php echo esc_attr($email); ?>"><?php echo esc_html($email); ?></a></div>
                    </div>
                    <?php endif; ?>
                </div>
                
                <?php if ($map_embed) : ?>
                <div class="gas-contact-map">
                    <?php echo $map_embed; ?>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function terms_shortcode($atts) {
        $title = get_option('gas_terms_title', 'Terms & Conditions');
        $content = get_option('gas_terms_content', '<p>Please read these terms carefully.</p>');
        
        ob_start();
        ?>
        <div class="gas-page gas-terms-page">
            <style>
                .gas-page { max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: var(--gas-body-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif); }
                .gas-page-title { font-size: 2.5rem; font-weight: 700; color: #1e293b; margin-bottom: 24px; font-family: var(--gas-heading-font, inherit); }
                .gas-page-content { font-size: 1rem; line-height: 1.8; color: #475569; }
                .gas-page-content h2, .gas-page-content h3 { color: #1e293b; margin-top: 32px; margin-bottom: 16px; }
                .gas-page-content p { margin-bottom: 16px; }
                .gas-page-content ul, .gas-page-content ol { margin-bottom: 16px; padding-left: 24px; }
                .gas-page-content li { margin-bottom: 8px; }
            </style>
            <h1 class="gas-page-title"><?php echo esc_html($title); ?></h1>
            <div class="gas-page-content"><?php echo wp_kses_post($content); ?></div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function privacy_shortcode($atts) {
        $title = get_option('gas_privacy_title', 'Privacy Policy');
        $content = get_option('gas_privacy_content', '<p>This policy explains how we handle your data.</p>');
        
        ob_start();
        ?>
        <div class="gas-page gas-privacy-page">
            <style>
                .gas-page { max-width: 800px; margin: 0 auto; padding: 40px 20px; font-family: var(--gas-body-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif); }
                .gas-page-title { font-size: 2.5rem; font-weight: 700; color: #1e293b; margin-bottom: 24px; font-family: var(--gas-heading-font, inherit); }
                .gas-page-content { font-size: 1rem; line-height: 1.8; color: #475569; }
                .gas-page-content h2, .gas-page-content h3 { color: #1e293b; margin-top: 32px; margin-bottom: 16px; }
                .gas-page-content p { margin-bottom: 16px; }
                .gas-page-content ul, .gas-page-content ol { margin-bottom: 16px; padding-left: 24px; }
                .gas-page-content li { margin-bottom: 8px; }
            </style>
            <h1 class="gas-page-title"><?php echo esc_html($title); ?></h1>
            <div class="gas-page-content"><?php echo wp_kses_post($content); ?></div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function gallery_shortcode($atts) {
        $title = get_option('gas_gallery_title', 'Gallery');
        $content = get_option('gas_gallery_content', '<p>Browse photos of our beautiful property.</p>');
        $button_color = $this->get_effective_button_color();
        
        ob_start();
        ?>
        <div class="gas-page gas-gallery-page">
            <style>
                .gas-page { max-width: 1200px; margin: 0 auto; padding: 40px 20px; font-family: var(--gas-body-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif); }
                .gas-page-title { font-size: 2.5rem; font-weight: 700; color: #1e293b; margin-bottom: 24px; font-family: var(--gas-heading-font, inherit); }
                .gas-page-content { font-size: 1.1rem; line-height: 1.8; color: #475569; margin-bottom: 32px; }
                .gas-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
                .gas-gallery-item img { width: 100%; height: 250px; object-fit: cover; border-radius: 12px; cursor: pointer; transition: transform 0.2s; }
                .gas-gallery-item img:hover { transform: scale(1.02); }
            </style>
            <h1 class="gas-page-title"><?php echo esc_html($title); ?></h1>
            <div class="gas-page-content"><?php echo wp_kses_post($content); ?></div>
            <div class="gas-gallery-grid">
                <!-- Gallery images will be loaded from API or can be added via content -->
                <p style="color: #64748b; grid-column: 1 / -1; text-align: center; padding: 40px;">Add images to your gallery using the Media section above, or they will be pulled from your property images.</p>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function dining_shortcode($atts) {
        $title = get_option('gas_dining_title', 'Dining');
        $content = get_option('gas_dining_content', '<p>Experience exceptional dining at our restaurant.</p>');
        $button_color = $this->get_effective_button_color();
        
        ob_start();
        ?>
        <div class="gas-page gas-dining-page">
            <style>
                .gas-page { max-width: 900px; margin: 0 auto; padding: 40px 20px; font-family: var(--gas-body-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif); }
                .gas-page-title { font-size: 2.5rem; font-weight: 700; color: #1e293b; margin-bottom: 24px; font-family: var(--gas-heading-font, inherit); }
                .gas-page-content { font-size: 1.1rem; line-height: 1.8; color: #475569; }
                .gas-page-content h2, .gas-page-content h3 { color: #1e293b; margin-top: 32px; margin-bottom: 16px; }
                .gas-page-content p { margin-bottom: 16px; }
                .gas-page-content img { max-width: 100%; height: auto; border-radius: 12px; margin: 24px 0; }
            </style>
            <h1 class="gas-page-title"><?php echo esc_html($title); ?></h1>
            <div class="gas-page-content"><?php echo wp_kses_post($content); ?></div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function properties_shortcode($atts) {
        $title = get_option('gas_properties_title', 'Our Properties');
        $content = get_option('gas_properties_content', '<p>Explore our collection of properties.</p>');
        $button_color = $this->get_effective_button_color();
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $client_id = get_option('gas_client_id', '');
        
        ob_start();
        ?>
        <div class="gas-page gas-properties-page">
            <style>
                .gas-page { max-width: 1200px; margin: 0 auto; padding: 40px 20px; font-family: var(--gas-body-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif); }
                .gas-page-title { font-size: 2.5rem; font-weight: 700; color: #1e293b; margin-bottom: 24px; font-family: var(--gas-heading-font, inherit); }
                .gas-page-content { font-size: 1.1rem; line-height: 1.8; color: #475569; margin-bottom: 32px; }
                .gas-properties-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px; }
                .gas-property-card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s; }
                .gas-property-card:hover { transform: translateY(-4px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); }
                .gas-property-image { width: 100%; height: 200px; object-fit: cover; }
                .gas-property-info { padding: 20px; }
                .gas-property-name { font-size: 1.25rem; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
                .gas-property-location { font-size: 0.9rem; color: #64748b; }
            </style>
            <h1 class="gas-page-title"><?php echo esc_html($title); ?></h1>
            <div class="gas-page-content"><?php echo wp_kses_post($content); ?></div>
            <div class="gas-properties-grid" id="gas-properties-list">
                <p style="color: #64748b; text-align: center; padding: 40px;">Loading properties...</p>
            </div>
        </div>
        <script>
        (function() {
            fetch('<?php echo esc_url($api_url); ?>/api/public/client/<?php echo esc_attr($client_id); ?>/properties')
                .then(r => r.json())
                .then(data => {
                    const container = document.getElementById('gas-properties-list');
                    if (data.properties) if (data.properties.length > 0) {
                        container.innerHTML = data.properties.map(p => `
                            <div class="gas-property-card">
                                <img src="${(p.images ? (p.images[0] ? p.images[0].url : '') : '')}" alt="${p.name}" class="gas-property-image">
                                <div class="gas-property-info">
                                    <div class="gas-property-name">${p.name}</div>
                                    <div class="gas-property-location">${p.city || ''}, ${p.country || ''}</div>
                                </div>
                            </div>
                        `).join('');
                    } else {
                        container.innerHTML = '<p style="color: #64748b; grid-column: 1 / -1; text-align: center;">No properties found.</p>';
                    }
                })
                .catch(e => {
                    document.getElementById('gas-properties-list').innerHTML = '<p style="color: #ef4444;">Error loading properties.</p>';
                });
        })();
        </script>
        <?php
        return ob_get_clean();
    }
    
    public function blog_categories_shortcode($atts) {
        ob_start();
        ?>
        <div id="gas-blog-category-tabs" class="gas-category-tabs"></div>
        <?php
        return ob_get_clean();
    }

    public function blog_shortcode($atts) {
        $atts = shortcode_atts(array('limit' => 12), $atts, 'gas_blog');
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $client_id = get_option('gas_client_id', '');
        $lang = $this->get_current_language();
        $limit = intval($atts['limit']);
        $button_color = $this->get_effective_button_color();

        ob_start();
        ?>
        <style>
            .gas-category-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
            .gas-category-tab { padding: 8px 18px; border-radius: 24px; border: 1px solid #e2e8f0; background: #fff; color: #475569; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; font-family: var(--gas-body-font, inherit); }
            .gas-category-tab:hover { border-color: <?php echo esc_attr($button_color); ?>; color: <?php echo esc_attr($button_color); ?>; }
            .gas-category-tab.active { background: <?php echo esc_attr($button_color); ?>; color: #fff; border-color: <?php echo esc_attr($button_color); ?>; }
            .gas-blog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
            .gas-blog-card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; color: inherit; display: flex; flex-direction: column; }
            .gas-blog-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
            .gas-blog-card img { width: 100%; height: 200px; object-fit: cover; }
            .gas-blog-card-body { padding: 20px; flex: 1; display: flex; flex-direction: column; }
            .gas-blog-card-category { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: <?php echo esc_attr($button_color); ?>; font-weight: 600; margin-bottom: 8px; }
            .gas-blog-card-title { font-size: 1.15rem; font-weight: 600; color: #1e293b; margin-bottom: 8px; font-family: var(--gas-heading-font, inherit); line-height: 1.4; }
            .gas-blog-card-excerpt { font-size: 0.9rem; color: #64748b; line-height: 1.6; flex: 1; }
            .gas-blog-card-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9; font-size: 0.8rem; color: #94a3b8; }
            @media (max-width: 640px) { .gas-blog-grid { grid-template-columns: 1fr; } }
        </style>
        <div class="gas-blog-grid" id="gas-blog-list">
            <p style="color: #64748b; text-align: center; padding: 40px; grid-column: 1 / -1;">Loading blog posts...</p>
        </div>
        <script>
        (function() {
            var apiUrl = <?php echo json_encode(esc_url($api_url)); ?>;
            var clientId = <?php echo json_encode(esc_attr($client_id)); ?>;
            var lang = <?php echo json_encode(esc_attr($lang)); ?>;
            var limit = <?php echo $limit; ?>;
            var allPosts = [];

            function renderPosts(posts) {
                var container = document.getElementById('gas-blog-list');
                if (!posts.length) {
                    container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 40px; grid-column: 1/-1;">No blog posts found.</p>';
                    return;
                }
                container.innerHTML = posts.map(function(p) {
                    var date = p.published_at ? new Date(p.published_at).toLocaleDateString(lang, {year:'numeric',month:'long',day:'numeric'}) : '';
                    var img = p.featured_image_url ? '<img src="' + p.featured_image_url + '" alt="' + (p.title||'').replace(/"/g,'&quot;') + '">' : '';
                    return '<a href="?p=' + p.slug + '&lang=' + lang + '" class="gas-blog-card">'
                        + img
                        + '<div class="gas-blog-card-body">'
                        + (p.category ? '<div class="gas-blog-card-category">' + (p.category_label || p.category) + '</div>' : '')
                        + '<div class="gas-blog-card-title">' + (p.title||'') + '</div>'
                        + '<div class="gas-blog-card-excerpt">' + (p.excerpt||'').substring(0,150) + (p.excerpt && p.excerpt.length > 150 ? '...' : '') + '</div>'
                        + '<div class="gas-blog-card-meta"><span>' + date + '</span>' + (p.read_time_minutes ? '<span>' + p.read_time_minutes + ' min read</span>' : '') + '</div>'
                        + '</div></a>';
                }).join('');
            }

            var allLabels = {en:'All',es:'Todos',fr:'Tous',de:'Alle',nl:'Alle'};

            function renderCategoryTabs(posts) {
                var tabsContainer = document.getElementById('gas-blog-category-tabs');
                if (!tabsContainer) return;
                var cats = [], catMap = {};
                posts.forEach(function(p) { if (p.category && cats.indexOf(p.category) === -1) { cats.push(p.category); catMap[p.category] = p.category_label || p.category; } });
                if (cats.length < 2) return;
                var html = '<button class="gas-category-tab active" data-cat="all">' + (allLabels[lang] || 'All') + '</button>';
                cats.forEach(function(c) { html += '<button class="gas-category-tab" data-cat="' + c.replace(/"/g,'&quot;') + '">' + (catMap[c] || c) + '</button>'; });
                tabsContainer.innerHTML = html;
                tabsContainer.addEventListener('click', function(e) {
                    var btn = e.target.closest('.gas-category-tab');
                    if (!btn) return;
                    tabsContainer.querySelectorAll('.gas-category-tab').forEach(function(b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    var cat = btn.getAttribute('data-cat');
                    renderPosts(cat === 'all' ? allPosts : allPosts.filter(function(p) { return p.category === cat; }));
                });
            }

            fetch(apiUrl + '/api/public/client/' + clientId + '/blog?lang=' + lang + '&limit=' + limit)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.success && data.posts) {
                        allPosts = data.posts;
                        renderCategoryTabs(allPosts);
                        renderPosts(allPosts);
                    } else {
                        document.getElementById('gas-blog-list').innerHTML = '<p style="color: #64748b; text-align: center; padding: 40px; grid-column: 1/-1;">No blog posts found.</p>';
                    }
                })
                .catch(function() {
                    document.getElementById('gas-blog-list').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 40px;">Error loading blog posts.</p>';
                });
        })();
        </script>
        <?php
        return ob_get_clean();
    }

    public function attractions_categories_shortcode($atts) {
        ob_start();
        ?>
        <div id="gas-attractions-category-tabs" class="gas-category-tabs"></div>
        <?php
        return ob_get_clean();
    }

    public function attractions_shortcode($atts) {
        $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
        $client_id = get_option('gas_client_id', '');
        $lang = $this->get_current_language();
        $button_color = $this->get_effective_button_color();

        ob_start();
        ?>
        <style>
            .gas-attractions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
            .gas-attraction-card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; color: inherit; display: flex; flex-direction: column; }
            .gas-attraction-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
            .gas-attraction-card img { width: 100%; height: 200px; object-fit: cover; }
            .gas-attraction-card-body { padding: 20px; flex: 1; display: flex; flex-direction: column; }
            .gas-attraction-card-category { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: <?php echo esc_attr($button_color); ?>; font-weight: 600; margin-bottom: 8px; }
            .gas-attraction-card-title { font-size: 1.15rem; font-weight: 600; color: #1e293b; margin-bottom: 8px; font-family: var(--gas-heading-font, inherit); line-height: 1.4; }
            .gas-attraction-card-desc { font-size: 0.9rem; color: #64748b; line-height: 1.6; flex: 1; }
            .gas-attraction-card-meta { display: flex; gap: 12px; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9; font-size: 0.8rem; color: #94a3b8; }
            .gas-attraction-card-meta span { display: flex; align-items: center; gap: 4px; }
            @media (max-width: 640px) { .gas-attractions-grid { grid-template-columns: 1fr; } }
        </style>
        <div class="gas-attractions-grid" id="gas-attractions-list">
            <p style="color: #64748b; text-align: center; padding: 40px; grid-column: 1 / -1;">Loading attractions...</p>
        </div>
        <script>
        (function() {
            var apiUrl = <?php echo json_encode(esc_url($api_url)); ?>;
            var clientId = <?php echo json_encode(esc_attr($client_id)); ?>;
            var lang = <?php echo json_encode(esc_attr($lang)); ?>;
            var allAttractions = [];

            function renderAttractions(items) {
                var container = document.getElementById('gas-attractions-list');
                if (!items.length) {
                    container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 40px; grid-column: 1/-1;">No attractions found.</p>';
                    return;
                }
                container.innerHTML = items.map(function(a) {
                    var img = a.featured_image_url ? '<img src="' + a.featured_image_url + '" alt="' + (a.name||'').replace(/"/g,'&quot;') + '">' : '';
                    var desc = a.short_description || '';
                    if (desc.length > 150) desc = desc.substring(0,150) + '...';
                    var meta = '';
                    if (a.distance_text) meta += '<span>📍 ' + a.distance_text + '</span>';
                    if (a.rating) meta += '<span>⭐ ' + a.rating + '</span>';
                    if (a.price_range) meta += '<span>' + a.price_range + '</span>';
                    return '<a href="?a=' + a.slug + '&lang=' + lang + '" class="gas-attraction-card">'
                        + img
                        + '<div class="gas-attraction-card-body">'
                        + (a.category ? '<div class="gas-attraction-card-category">' + (a.category_label || a.category) + '</div>' : '')
                        + '<div class="gas-attraction-card-title">' + (a.name||'') + '</div>'
                        + '<div class="gas-attraction-card-desc">' + desc + '</div>'
                        + (meta ? '<div class="gas-attraction-card-meta">' + meta + '</div>' : '')
                        + '</div></a>';
                }).join('');
            }

            var allLabels = {en:'All',es:'Todos',fr:'Tous',de:'Alle',nl:'Alle'};

            function renderCategoryTabs(items) {
                var tabsContainer = document.getElementById('gas-attractions-category-tabs');
                if (!tabsContainer) return;
                var cats = [], catMap = {};
                items.forEach(function(a) { if (a.category && cats.indexOf(a.category) === -1) { cats.push(a.category); catMap[a.category] = a.category_label || a.category; } });
                if (cats.length < 2) return;
                var html = '<button class="gas-category-tab active" data-cat="all">' + (allLabels[lang] || 'All') + '</button>';
                cats.forEach(function(c) { html += '<button class="gas-category-tab" data-cat="' + c.replace(/"/g,'&quot;') + '">' + (catMap[c] || c) + '</button>'; });
                tabsContainer.innerHTML = html;
                tabsContainer.addEventListener('click', function(e) {
                    var btn = e.target.closest('.gas-category-tab');
                    if (!btn) return;
                    tabsContainer.querySelectorAll('.gas-category-tab').forEach(function(b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    var cat = btn.getAttribute('data-cat');
                    renderAttractions(cat === 'all' ? allAttractions : allAttractions.filter(function(a) { return a.category === cat; }));
                });
            }

            fetch(apiUrl + '/api/public/client/' + clientId + '/attractions?lang=' + lang)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.success && data.attractions) {
                        allAttractions = data.attractions;
                        renderCategoryTabs(allAttractions);
                        renderAttractions(allAttractions);
                    } else {
                        document.getElementById('gas-attractions-list').innerHTML = '<p style="color: #64748b; text-align: center; padding: 40px; grid-column: 1/-1;">No attractions found.</p>';
                    }
                })
                .catch(function() {
                    document.getElementById('gas-attractions-list').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 40px;">Error loading attractions.</p>';
                });
        })();
        </script>
        <?php
        return ob_get_clean();
    }

    public function footer_shortcode($atts) {
        $business_name = get_option('gas_footer_business_name', get_bloginfo('name'));
        $tagline = get_option('gas_footer_tagline', '');
        $address = get_option('gas_footer_address', '');
        $phone = get_option('gas_footer_phone', '');
        $email = get_option('gas_footer_email', '');
        $copyright = get_option('gas_footer_copyright', '© ' . date('Y') . ' ' . get_bloginfo('name'));
        
        // Social links
        $facebook = get_option('gas_footer_facebook', '');
        $instagram = get_option('gas_footer_instagram', '');
        $twitter = get_option('gas_footer_twitter', '');
        $tripadvisor = get_option('gas_footer_tripadvisor', '');
        $youtube = get_option('gas_footer_youtube', '');
        $whatsapp = get_option('gas_footer_whatsapp', '');
        
        // Page URLs
        $rooms_url = get_option('gas_search_results_url', '/book-now/');
        $button_color = $this->get_effective_button_color();
        
        ob_start();
        ?>
        <footer class="gas-footer">
            <style>
                .gas-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 60px 20px 30px; font-family: var(--gas-body-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif); }
                .gas-footer-container { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; }
                @media (max-width: 900px) { .gas-footer-container { grid-template-columns: 1fr 1fr; } }
                @media (max-width: 600px) { .gas-footer-container { grid-template-columns: 1fr; text-align: center; } }
                .gas-footer-brand h3 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
                .gas-footer-brand p { color: #64748b; font-size: 0.95rem; margin-bottom: 20px; }
                .gas-footer-social { display: flex; gap: 12px; }
                @media (max-width: 600px) { .gas-footer-social { justify-content: center; } }
                .gas-footer-social a { width: 40px; height: 40px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #64748b; text-decoration: none; transition: all 0.2s; font-size: 1.1rem; }
                .gas-footer-social a:hover { background: <?php echo esc_attr($button_color); ?>; color: white; }
                .gas-footer-section h4 { font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #1e293b; margin-bottom: 16px; }
                .gas-footer-section ul { list-style: none; padding: 0; margin: 0; }
                .gas-footer-section li { margin-bottom: 10px; }
                .gas-footer-section a { color: #64748b; text-decoration: none; font-size: 0.95rem; transition: color 0.2s; }
                .gas-footer-section a:hover { color: <?php echo esc_attr($button_color); ?>; }
                .gas-footer-contact p { color: #64748b; font-size: 0.95rem; margin-bottom: 8px; }
                .gas-footer-contact a { color: <?php echo esc_attr($button_color); ?>; text-decoration: none; }
                .gas-footer-bottom { max-width: 1200px; margin: 40px auto 0; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
                @media (max-width: 600px) { .gas-footer-bottom { justify-content: center; text-align: center; } }
                .gas-footer-copyright { color: #94a3b8; font-size: 0.85rem; }
                .gas-footer-legal { display: flex; gap: 20px; }
                .gas-footer-legal a { color: #94a3b8; text-decoration: none; font-size: 0.85rem; }
                .gas-footer-legal a:hover { color: <?php echo esc_attr($button_color); ?>; }
            </style>
            
            <div class="gas-footer-container">
                <div class="gas-footer-brand">
                    <h3><?php echo esc_html($business_name); ?></h3>
                    <?php if ($tagline) : ?>
                    <p><?php echo esc_html($tagline); ?></p>
                    <?php endif; ?>
                    
                    <?php if ($facebook || $instagram || $twitter || $tripadvisor || $youtube || $whatsapp) : ?>
                    <div class="gas-footer-social">
                        <?php if ($facebook) : ?><a href="<?php echo esc_url($facebook); ?>" target="_blank" rel="noopener" title="Facebook">📘</a><?php endif; ?>
                        <?php if ($instagram) : ?><a href="<?php echo esc_url($instagram); ?>" target="_blank" rel="noopener" title="Instagram">📷</a><?php endif; ?>
                        <?php if ($twitter) : ?><a href="<?php echo esc_url($twitter); ?>" target="_blank" rel="noopener" title="Twitter">🐦</a><?php endif; ?>
                        <?php if ($tripadvisor) : ?><a href="<?php echo esc_url($tripadvisor); ?>" target="_blank" rel="noopener" title="TripAdvisor">🦉</a><?php endif; ?>
                        <?php if ($youtube) : ?><a href="<?php echo esc_url($youtube); ?>" target="_blank" rel="noopener" title="YouTube">▶️</a><?php endif; ?>
                        <?php if ($whatsapp) : ?><a href="https://wa.me/<?php echo esc_attr(preg_replace('/[^0-9]/', '', $whatsapp)); ?>" target="_blank" rel="noopener" title="WhatsApp">💬</a><?php endif; ?>
                    </div>
                    <?php endif; ?>
                </div>
                
                <div class="gas-footer-section">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="/">Home</a></li>
                        <li><a href="<?php echo esc_url($rooms_url); ?>">Rooms</a></li>
                        <li><a href="/about/">About Us</a></li>
                        <li><a href="/contact/">Contact</a></li>
                    </ul>
                </div>
                
                <div class="gas-footer-section">
                    <h4>Legal</h4>
                    <ul>
                        <li><a href="/terms/">Terms & Conditions</a></li>
                        <li><a href="/privacy/">Privacy Policy</a></li>
                    </ul>
                </div>
                
                <div class="gas-footer-section gas-footer-contact">
                    <h4>Contact</h4>
                    <?php if ($address) : ?><p>📍 <?php echo nl2br(esc_html($address)); ?></p><?php endif; ?>
                    <?php if ($phone) : ?><p>📞 <a href="tel:<?php echo esc_attr(preg_replace('/[^0-9+]/', '', $phone)); ?>"><?php echo esc_html($phone); ?></a></p><?php endif; ?>
                    <?php if ($email) : ?><p>✉️ <a href="mailto:<?php echo esc_attr($email); ?>"><?php echo esc_html($email); ?></a></p><?php endif; ?>
                </div>
            </div>
            
            <div class="gas-footer-bottom">
                <div class="gas-footer-copyright"><?php echo esc_html($copyright); ?></div>
                <div class="gas-footer-legal">
                    <a href="/terms/">Terms</a>
                    <a href="/privacy/">Privacy</a>
                </div>
            </div>
        </footer>
        <?php
        return ob_get_clean();
    }
}

// Initialize
GAS_Booking::get_instance();
