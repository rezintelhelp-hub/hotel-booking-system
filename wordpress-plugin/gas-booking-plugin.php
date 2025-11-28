<?php
/**
 * Plugin Name: GAS Booking System
 * Plugin URI: https://gas.com
 * Description: Display accommodation listings from Global Accommodation System on your WordPress site
 * Version: 1.1.0
 * Author: GAS
 * Author URI: https://gas.com
 * License: GPL v2 or later
 * Text Domain: gas-booking
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('GAS_PLUGIN_VERSION', '1.1.0');
define('GAS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GAS_PLUGIN_URL', plugin_dir_url(__FILE__));

class GAS_Booking_Plugin {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Register settings
        add_action('admin_init', array($this, 'register_settings'));
        
        // Register shortcodes
        add_shortcode('gas_search', array($this, 'search_shortcode'));
        add_shortcode('gas_property', array($this, 'property_shortcode'));
        add_shortcode('gas_properties', array($this, 'properties_shortcode'));
        
        // Enqueue scripts
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        // AJAX handlers
        add_action('wp_ajax_gas_search_properties', array($this, 'ajax_search_properties'));
        add_action('wp_ajax_nopriv_gas_search_properties', array($this, 'ajax_search_properties'));
    }
    
    public function add_admin_menu() {
        add_menu_page(
            'GAS Booking',
            'GAS Booking',
            'manage_options',
            'gas-booking',
            array($this, 'admin_page'),
            'dashicons-palmtree',
            30
        );
    }
    
    public function register_settings() {
        register_setting('gas_booking_settings', 'gas_api_key');
        register_setting('gas_booking_settings', 'gas_api_url');
        register_setting('gas_booking_settings', 'gas_selected_properties');
    }
    
    /**
     * Make authenticated API request to GAS server
     */
    private function api_request($endpoint, $method = 'GET', $body = null) {
        $api_url = get_option('gas_api_url', 'https://hotel-booking-system-production-d6db.up.railway.app');
        $api_key = get_option('gas_api_key');
        
        if (empty($api_key)) {
            return array('success' => false, 'error' => 'API key not configured');
        }
        
        $args = array(
            'method' => $method,
            'headers' => array(
                'X-API-Key' => $api_key,
                'Content-Type' => 'application/json'
            ),
            'timeout' => 30
        );
        
        if ($body && $method !== 'GET') {
            $args['body'] = json_encode($body);
        }
        
        $response = wp_remote_request($api_url . $endpoint, $args);
        
        if (is_wp_error($response)) {
            return array('success' => false, 'error' => $response->get_error_message());
        }
        
        $data = json_decode(wp_remote_retrieve_body($response), true);
        return $data;
    }
    
    public function admin_page() {
        $api_key = get_option('gas_api_key');
        $api_url = get_option('gas_api_url', 'https://hotel-booking-system-production-d6db.up.railway.app');
        
        // Test connection if API key is set
        $connection_status = '';
        $client_info = null;
        if (!empty($api_key)) {
            $test = $this->api_request('/api/v1/properties');
            if ($test && isset($test['success']) && $test['success']) {
                $connection_status = 'connected';
                $property_count = count($test['properties'] ?? []);
            } else {
                $connection_status = 'error';
                $connection_error = $test['error'] ?? 'Unknown error';
            }
        }
        ?>
        <div class="wrap">
            <h1>🏠 GAS Booking System Settings</h1>
            
            <?php if (isset($_GET['settings-updated'])): ?>
                <div class="notice notice-success is-dismissible">
                    <p>Settings saved!</p>
                </div>
            <?php endif; ?>
            
            <?php if ($connection_status === 'connected'): ?>
                <div class="notice notice-success">
                    <p>✅ <strong>Connected!</strong> Found <?php echo $property_count; ?> properties linked to your account.</p>
                </div>
            <?php elseif ($connection_status === 'error'): ?>
                <div class="notice notice-error">
                    <p>❌ <strong>Connection Error:</strong> <?php echo esc_html($connection_error); ?></p>
                </div>
            <?php endif; ?>
            
            <form method="post" action="options.php">
                <?php settings_fields('gas_booking_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="gas_api_url">GAS API URL</label>
                        </th>
                        <td>
                            <input type="text" 
                                   id="gas_api_url" 
                                   name="gas_api_url" 
                                   value="<?php echo esc_attr($api_url); ?>" 
                                   class="regular-text" />
                            <p class="description">Your GAS API endpoint URL (usually don't need to change this)</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label for="gas_api_key">API Key</label>
                        </th>
                        <td>
                            <input type="text" 
                                   id="gas_api_key" 
                                   name="gas_api_key" 
                                   value="<?php echo esc_attr($api_key); ?>" 
                                   class="regular-text" 
                                   placeholder="gas_xxxxxxxxxxxxxxxx" />
                            <p class="description">
                                Get your API key from 
                                <a href="<?php echo esc_url($api_url); ?>/gas-admin.html" target="_blank">GAS Admin Dashboard</a> 
                                → Clients → View your client → Copy API Key
                            </p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button('Save Settings'); ?>
            </form>
            
            <?php if ($connection_status === 'connected' && $property_count > 0): ?>
            <hr />
            
            <h2>Your Properties</h2>
            <p>These properties are linked to your API key and will be displayed on your website:</p>
            
            <div id="gas-properties-list" style="margin-top: 20px;">
                <?php
                $properties = $test['properties'] ?? [];
                foreach ($properties as $prop):
                ?>
                    <div style="display: flex; align-items: center; padding: 15px; border: 1px solid #ddd; margin: 5px 0; background: #fff; border-radius: 4px;">
                        <div style="flex: 1;">
                            <strong><?php echo esc_html($prop['name']); ?></strong>
                            <br>
                            <span style="color: #666; font-size: 13px;">
                                <?php echo esc_html($prop['city'] ?? ''); ?><?php echo $prop['country'] ? ', ' . esc_html($prop['country']) : ''; ?>
                                • <?php echo intval($prop['room_count'] ?? 0); ?> rooms
                            </span>
                        </div>
                        <code style="font-size: 12px; background: #f0f0f1; padding: 3px 8px; border-radius: 3px;">ID: <?php echo intval($prop['id']); ?></code>
                    </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
            
            <hr />
            
            <h2>How to Use</h2>
            <div class="card">
                <h3>Shortcodes</h3>
                <table class="widefat" style="margin-top: 10px;">
                    <thead>
                        <tr>
                            <th>Shortcode</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>[gas_search]</code></td>
                            <td>Full search interface with date picker and guest selector</td>
                        </tr>
                        <tr>
                            <td><code>[gas_properties]</code></td>
                            <td>Display all your properties as a grid</td>
                        </tr>
                        <tr>
                            <td><code>[gas_property id="123"]</code></td>
                            <td>Display a single property by ID</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="card" style="margin-top: 20px;">
                <h3>Need Help?</h3>
                <p>
                    <strong>Step 1:</strong> Get your API key from the GAS Admin Dashboard<br>
                    <strong>Step 2:</strong> Paste it above and save<br>
                    <strong>Step 3:</strong> Add <code>[gas_properties]</code> to any page
                </p>
            </div>
        </div>
        
        <style>
        .card { background: white; padding: 20px; border: 1px solid #ccd0d4; box-shadow: 0 1px 1px rgba(0,0,0,.04); }
        .card h3 { margin-top: 0; }
        .card code { background: #f0f0f1; padding: 3px 6px; border-radius: 3px; }
        </style>
        <?php
    }
    
    public function enqueue_scripts() {
        wp_enqueue_style('gas-booking-style', GAS_PLUGIN_URL . 'assets/gas-booking.css', array(), GAS_PLUGIN_VERSION);
        wp_enqueue_script('gas-booking-script', GAS_PLUGIN_URL . 'assets/gas-booking.js', array('jquery'), GAS_PLUGIN_VERSION, true);
        
        wp_localize_script('gas-booking-script', 'gasBooking', array(
            'apiUrl' => get_option('gas_api_url', 'https://hotel-booking-system-production-d6db.up.railway.app'),
            'apiKey' => get_option('gas_api_key'),
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('gas_booking_nonce')
        ));
    }
    
    public function search_shortcode($atts) {
        ob_start();
        ?>
        <div class="gas-booking-search">
            <div class="gas-search-form">
                <h2>Find Your Perfect Stay</h2>
                <form id="gas-search-form">
                    <div class="gas-form-row">
                        <div class="gas-form-group">
                            <label>Check In</label>
                            <input type="date" name="checkIn" required />
                        </div>
                        <div class="gas-form-group">
                            <label>Check Out</label>
                            <input type="date" name="checkOut" required />
                        </div>
                        <div class="gas-form-group">
                            <label>Guests</label>
                            <select name="guests">
                                <option value="1">1 Guest</option>
                                <option value="2" selected>2 Guests</option>
                                <option value="3">3 Guests</option>
                                <option value="4">4 Guests</option>
                                <option value="5">5 Guests</option>
                                <option value="6">6+ Guests</option>
                            </select>
                        </div>
                        <button type="submit" class="gas-btn-primary">Search</button>
                    </div>
                </form>
            </div>
            <div id="gas-search-results"></div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function properties_shortcode($atts) {
        $atts = shortcode_atts(array(
            'columns' => 3,
            'limit' => 0
        ), $atts);
        
        // Use authenticated API endpoint
        $data = $this->api_request('/api/v1/properties');
        
        if (!$data || !isset($data['success']) || !$data['success']) {
            $error = $data['error'] ?? 'Could not load properties';
            return '<div class="gas-error"><p>Error: ' . esc_html($error) . '</p><p>Please check your API key in the GAS Booking settings.</p></div>';
        }
        
        $properties = $data['properties'] ?? [];
        
        if (empty($properties)) {
            return '<div class="gas-empty-state"><h3>No Properties Available</h3><p>No properties are currently assigned to your account.</p></div>';
        }
        
        // Apply limit if set
        if ($atts['limit'] > 0) {
            $properties = array_slice($properties, 0, $atts['limit']);
        }
        
        ob_start();
        ?>
        <div class="gas-properties-grid" style="--gas-columns: <?php echo intval($atts['columns']); ?>;">
            <?php foreach ($properties as $property): ?>
                <div class="gas-property-card">
                    <div class="gas-property-image">
                        <img src="<?php echo esc_url($property['hero_image_url'] ?: 'https://via.placeholder.com/400x300?text=' . urlencode($property['name'])); ?>" 
                             alt="<?php echo esc_attr($property['name']); ?>"
                             loading="lazy">
                    </div>
                    <div class="gas-property-content">
                        <h3><?php echo esc_html($property['name']); ?></h3>
                        <p class="gas-property-location"><?php echo esc_html($property['city'] ?? ''); ?><?php echo !empty($property['country']) ? ', ' . esc_html($property['country']) : ''; ?></p>
                        <?php if (!empty($property['description'])): ?>
                            <p><?php echo esc_html(substr($property['description'], 0, 120)); ?>...</p>
                        <?php endif; ?>
                        <?php if (!empty($property['room_count'])): ?>
                            <p class="gas-property-rooms"><?php echo intval($property['room_count']); ?> accommodation<?php echo $property['room_count'] > 1 ? 's' : ''; ?> available</p>
                        <?php endif; ?>
                        <a href="#" class="gas-btn-primary" data-property-id="<?php echo intval($property['id']); ?>" onclick="gasViewProperty(<?php echo intval($property['id']); ?>); return false;">View Details</a>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function property_shortcode($atts) {
        $atts = shortcode_atts(array('id' => 0), $atts);
        
        if (!$atts['id']) {
            return '<p class="gas-error">Property ID required. Usage: [gas_property id="123"]</p>';
        }
        
        // Fetch single property
        $data = $this->api_request('/api/v1/properties/' . intval($atts['id']));
        
        if (!$data || !isset($data['success']) || !$data['success']) {
            return '<p class="gas-error">Property not found or not accessible.</p>';
        }
        
        $property = $data['property'];
        
        ob_start();
        ?>
        <div class="gas-single-property">
            <div class="gas-property-hero">
                <img src="<?php echo esc_url($property['hero_image_url'] ?: 'https://via.placeholder.com/1200x600?text=' . urlencode($property['name'])); ?>" 
                     alt="<?php echo esc_attr($property['name']); ?>">
            </div>
            <div class="gas-property-details">
                <h1><?php echo esc_html($property['name']); ?></h1>
                <p class="gas-property-location"><?php echo esc_html($property['address'] ?? ''); ?> <?php echo esc_html($property['city'] ?? ''); ?>, <?php echo esc_html($property['country'] ?? ''); ?></p>
                <?php if (!empty($property['description'])): ?>
                    <div class="gas-property-description">
                        <?php echo wp_kses_post($property['description']); ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * AJAX handler for property search
     */
    public function ajax_search_properties() {
        check_ajax_referer('gas_booking_nonce', 'nonce');
        
        $check_in = sanitize_text_field($_POST['checkIn'] ?? '');
        $check_out = sanitize_text_field($_POST['checkOut'] ?? '');
        $guests = intval($_POST['guests'] ?? 2);
        
        // Search with filters
        $endpoint = '/api/v1/availability/search?' . http_build_query(array(
            'checkIn' => $check_in,
            'checkOut' => $check_out,
            'guests' => $guests
        ));
        
        $data = $this->api_request($endpoint);
        
        wp_send_json($data);
    }
}

// Initialize plugin
GAS_Booking_Plugin::get_instance();
