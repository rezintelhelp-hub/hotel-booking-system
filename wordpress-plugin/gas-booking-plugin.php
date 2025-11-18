<?php
/**
 * Plugin Name: GAS Booking System
 * Plugin URI: https://gas.com
 * Description: Display accommodation listings from Global Accommodation System on your WordPress site
 * Version: 1.0.0
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
define('GAS_PLUGIN_VERSION', '1.0.0');
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
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>GAS Booking System Settings</h1>
            
            <?php if (isset($_GET['settings-updated'])): ?>
                <div class="notice notice-success is-dismissible">
                    <p>Settings saved!</p>
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
                                   value="<?php echo esc_attr(get_option('gas_api_url', 'https://hotel-booking-system-production-d6db.up.railway.app')); ?>" 
                                   class="regular-text" />
                            <p class="description">Your GAS API endpoint URL</p>
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
                                   value="<?php echo esc_attr(get_option('gas_api_key')); ?>" 
                                   class="regular-text" />
                            <p class="description">Get your API key from <a href="https://hotel-booking-system-production-d6db.up.railway.app/gas.html" target="_blank">GAS Dashboard</a></p>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
            
            <hr />
            
            <h2>Property Selection</h2>
            <p>Select which properties to display on your website:</p>
            
            <div id="gas-properties-selector">
                <p><button type="button" class="button" onclick="gasLoadProperties()">Load Properties</button></p>
                <div id="gas-properties-list"></div>
            </div>
            
            <hr />
            
            <h2>How to Use</h2>
            <div class="card">
                <h3>Shortcodes:</h3>
                <p><code>[gas_search]</code> - Full search interface with all properties</p>
                <p><code>[gas_properties]</code> - Display selected properties as grid</p>
                <p><code>[gas_property id="1"]</code> - Display single property</p>
            </div>
        </div>
        
        <script>
        function gasLoadProperties() {
            const apiUrl = document.getElementById('gas_api_url').value;
            const apiKey = document.getElementById('gas_api_key').value;
            
            if (!apiKey) {
                alert('Please enter your API key first');
                return;
            }
            
            fetch(apiUrl + '/api/db/properties')
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const listEl = document.getElementById('gas-properties-list');
                        listEl.innerHTML = '<h4>Available Properties:</h4>';
                        
                        data.data.forEach(prop => {
                            listEl.innerHTML += `
                                <label style="display: block; padding: 10px; border: 1px solid #ddd; margin: 5px 0;">
                                    <input type="checkbox" name="gas_properties[]" value="${prop.id}">
                                    <strong>${prop.name}</strong> - ${prop.city}, ${prop.country}
                                </label>
                            `;
                        });
                    }
                })
                .catch(err => alert('Error loading properties: ' + err));
        }
        </script>
        
        <style>
        .card { background: white; padding: 20px; border: 1px solid #ccd0d4; box-shadow: 0 1px 1px rgba(0,0,0,.04); margin-top: 20px; }
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
            'ajaxUrl' => admin_url('admin-ajax.php')
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
                            </select>
                        </div>
                    </div>
                    <button type="submit" class="gas-btn-primary">Search</button>
                </form>
            </div>
            <div id="gas-search-results"></div>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function properties_shortcode($atts) {
        $api_url = get_option('gas_api_url');
        
        $response = wp_remote_get($api_url . '/api/db/properties');
        
        if (is_wp_error($response)) {
            return '<p>Error loading properties</p>';
        }
        
        $data = json_decode(wp_remote_retrieve_body($response), true);
        
        if (!$data['success']) {
            return '<p>No properties available</p>';
        }
        
        ob_start();
        ?>
        <div class="gas-properties-grid">
            <?php foreach ($data['data'] as $property): ?>
                <div class="gas-property-card">
                    <div class="gas-property-image">
                        <img src="<?php echo esc_url($property['hero_image_url'] ?: 'https://via.placeholder.com/400x300?text=Property'); ?>" alt="<?php echo esc_attr($property['name']); ?>">
                    </div>
                    <div class="gas-property-content">
                        <h3><?php echo esc_html($property['name']); ?></h3>
                        <p><?php echo esc_html($property['city']); ?>, <?php echo esc_html($property['country']); ?></p>
                        <p><?php echo esc_html(substr($property['description'], 0, 100)); ?>...</p>
                        <a href="#" class="gas-btn-primary" onclick="gasViewProperty(<?php echo $property['id']; ?>); return false;">View Details</a>
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
            return '<p>Property ID required</p>';
        }
        
        // Single property display would go here
        return '<div class="gas-single-property">Property #' . esc_html($atts['id']) . '</div>';
    }
}

// Initialize plugin
GAS_Booking_Plugin::get_instance();
