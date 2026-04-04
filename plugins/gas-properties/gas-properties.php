<?php
/**
 * Plugin Name: GAS Properties
 * Plugin URI: https://gas.travel
 * Description: Display multi-property portfolio from GAS with LodgingBusiness schema markup. Colors controlled via GAS Admin.
 * Version: 1.0.2
 * Author: GAS - Guest Accommodation System
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) exit;
define('GAS_PROPERTIES_DEFAULT_API_URL', 'https://admin.gas.travel');

add_action('init', function() {
    add_shortcode('gas_properties', array(GAS_Properties::get_instance(), 'properties_shortcode'));
}, 1);

class GAS_Properties {
    private static $instance = null;
    private $colors_cache = null;

    public static function get_instance() { if (null === self::$instance) self::$instance = new self(); return self::$instance; }

    private function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_ajax_gas_properties_clear_colors', array($this, 'clear_colors_cache'));
    }

    private function get_api_url() { return get_option('gas_properties_api_url', '') ?: GAS_PROPERTIES_DEFAULT_API_URL; }

    private function get_client_id() { return get_option('gas_properties_client_id') ?: get_option('gas_client_id', ''); }

    private function get_lang() {
        if (!empty($_GET['lang'])) return sanitize_text_field($_GET['lang']);
        if (!empty($_COOKIE['gas_lang'])) return sanitize_text_field($_COOKIE['gas_lang']);
        return 'en';
    }

    private function get_colors() {
        if ($this->colors_cache !== null) return $this->colors_cache;
        $cached = get_transient('gas_properties_colors');
        if ($cached !== false) { $this->colors_cache = $cached; return $cached; }

        $defaults = array('accent'=>'#667eea','bg'=>'#ffffff','card_bg'=>'#ffffff','text'=>'#1e293b','text_secondary'=>'#64748b');
        $client_id = $this->get_client_id();
        if ($client_id) {
            $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/app-settings/properties';
            $response = wp_remote_get($url, array('timeout'=>10));
            if (!is_wp_error($response)) {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                if ($body && $body['success'] && !empty($body['colors'])) {
                    $colors = wp_parse_args($body['colors'], $defaults);
                    set_transient('gas_properties_colors', $colors, HOUR_IN_SECONDS);
                    $this->colors_cache = $colors;
                    return $colors;
                }
            }
        }
        $this->colors_cache = $defaults;
        return $defaults;
    }

    private function get_fonts() {
        $cached = get_transient('gas_properties_fonts');
        if ($cached !== false) return $cached;

        $defaults = array('heading' => 'inherit', 'body' => 'inherit');
        $font_map = array(
            'playfair' => "'Playfair Display', serif", 'montserrat' => "'Montserrat', sans-serif",
            'lora' => "'Lora', serif", 'poppins' => "'Poppins', sans-serif",
            'merriweather' => "'Merriweather', serif", 'raleway' => "'Raleway', sans-serif",
            'oswald' => "'Oswald', sans-serif", 'inter' => "'Inter', sans-serif",
            'roboto' => "'Roboto', sans-serif", 'opensans' => "'Open Sans', sans-serif",
            'lato' => "'Lato', sans-serif", 'nunito' => "'Nunito', sans-serif",
        );

        $client_id = $this->get_client_id();
        if ($client_id) {
            $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/app-settings/properties';
            $response = wp_remote_get($url, array('timeout'=>10));
            if (!is_wp_error($response)) {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                if ($body && $body['success'] && !empty($body['fonts'])) {
                    $h = strtolower($body['fonts']['heading'] ?? 'inherit');
                    $b = strtolower($body['fonts']['body'] ?? 'inherit');
                    $fonts = array(
                        'heading' => isset($font_map[$h]) ? $font_map[$h] : 'inherit',
                        'body' => isset($font_map[$b]) ? $font_map[$b] : 'inherit'
                    );
                    set_transient('gas_properties_fonts', $fonts, HOUR_IN_SECONDS);
                    return $fonts;
                }
            }
        }
        return $defaults;
    }

    public function clear_colors_cache() { delete_transient('gas_properties_colors'); delete_transient('gas_properties_fonts'); wp_send_json_success(); }

    // ── Admin menu ──
    public function add_admin_menu() {
        add_options_page('GAS Properties', 'GAS Properties', 'manage_options', 'gas-properties', array($this, 'settings_page'));
    }

    public function register_settings() {
        register_setting('gas_properties_settings', 'gas_properties_api_url');
        register_setting('gas_properties_settings', 'gas_properties_client_id');
    }

    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>GAS Properties Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('gas_properties_settings'); ?>
                <table class="form-table">
                    <tr><th>API URL</th><td><input type="text" name="gas_properties_api_url" value="<?php echo esc_attr(get_option('gas_properties_api_url', '')); ?>" class="regular-text" placeholder="https://admin.gas.travel"></td></tr>
                    <tr><th>Client ID</th><td><input type="text" name="gas_properties_client_id" value="<?php echo esc_attr(get_option('gas_properties_client_id', '')); ?>" class="regular-text" placeholder="Falls back to gas_client_id"></td></tr>
                </table>
                <?php submit_button(); ?>
            </form>
            <hr>
            <button class="button" onclick="jQuery.post(ajaxurl,{action:'gas_properties_clear_colors'},function(){alert('Cache cleared!')});">Clear Color Cache</button>
        </div>
        <?php
    }

    // ── Shortcode ──
    public function properties_shortcode($atts) {
        $atts = shortcode_atts(array('limit' => 50, 'columns' => 3), $atts, 'gas_properties');
        $colors = $this->get_colors();
        $fonts = $this->get_fonts();
        $api_url = $this->get_api_url();
        $client_id = $this->get_client_id();
        $lang = $this->get_lang();

        if (empty($client_id)) {
            return '<p style="text-align:center;color:#64748b;padding:40px;">GAS Properties: No client ID configured.</p>';
        }

        // Override button colours from Web Builder (page-properties settings) if available
        $api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();
        $wb_btn_bg = !empty($api['page_properties_btn_bg']) ? $api['page_properties_btn_bg'] : null;
        $wb_btn_text = !empty($api['page_properties_btn_text_color']) ? $api['page_properties_btn_text_color'] : null;
        $wb_btn_label = !empty($api['page_properties_btn_label']) ? $api['page_properties_btn_label'] : 'View Rooms';

        $accent = esc_attr($colors['accent']);
        $bg = esc_attr($colors['bg']);
        $card_bg = esc_attr($colors['card_bg']);
        $text = esc_attr($colors['text']);
        $text2 = esc_attr($colors['text_secondary']);
        $button_bg = esc_attr($wb_btn_bg ?? $colors['button_bg'] ?? $accent);
        $button_text = esc_attr($wb_btn_text ?? $colors['button_text'] ?? '#ffffff');
        $btn_label = esc_html($wb_btn_label);
        $heading_font = esc_attr($fonts['heading']);
        $body_font = esc_attr($fonts['body']);
        $cols = intval($atts['columns']);
        $limit = intval($atts['limit']);

        ob_start();
        ?>
        <div class="gas-properties-wrap" translate="no" style="background:<?php echo $bg; ?>; font-family:<?php echo $body_font; ?>;">
            <style>
                .gas-properties-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:24px; max-width:1200px; margin:0 auto; padding:0 20px; }
                .gas-prop-card { background:<?php echo $card_bg; ?>; border-radius:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08); transition:transform 0.2s, box-shadow 0.2s; text-decoration:none; color:inherit; display:block; }
                .gas-prop-card:hover { transform:translateY(-4px); box-shadow:0 10px 25px rgba(0,0,0,0.12); }
                .gas-prop-img { width:100%; height:220px; object-fit:cover; }
                .gas-prop-body { padding:20px; }
                .gas-prop-cta { display:inline-block; padding:10px 24px; border-radius:8px; font-size:0.9rem; font-weight:600; text-decoration:none; text-align:center; transition:opacity 0.2s; background:<?php echo $button_bg; ?>; color:<?php echo $button_text; ?>; margin-top:4px; }
                .gas-prop-cta:hover { opacity:0.85; color:<?php echo $button_text; ?>; }
                .gas-prop-name { font-size:1.25rem; font-weight:700; color:<?php echo $text; ?>; margin:0 0 6px; font-family:<?php echo $heading_font; ?>; }
                .gas-prop-location { font-size:0.9rem; color:<?php echo $text2; ?>; margin:0 0 12px; }
                .gas-prop-price { font-size:0.95rem; font-weight:600; color:<?php echo $accent; ?>; }
                .gas-prop-loading { text-align:center; padding:60px 20px; color:<?php echo $text2; ?>; }
                @media (max-width:768px) { .gas-properties-grid { grid-template-columns:1fr; } }
            </style>
            <div class="gas-properties-grid" id="gas-properties-list">
                <div class="gas-prop-loading" style="grid-column:1/-1;">Loading properties...</div>
            </div>
        </div>
        <script>
        (function(){
            var apiUrl = <?php echo json_encode(esc_url($api_url)); ?>;
            var clientId = <?php echo json_encode($client_id); ?>;
            var lang = <?php echo json_encode($lang); ?>;
            var limit = <?php echo $limit; ?>;
            var blogId = <?php echo json_encode(get_current_blog_id()); ?>;
            var translations = {
                en: { from: 'From', night: '/night', viewDetails: '<?php echo esc_js($btn_label !== "View Rooms" ? $btn_label : "View Details"); ?>' },
                de: { from: 'Ab', night: '/Nacht', viewDetails: 'Details ansehen' },
                fr: { from: 'À partir de', night: '/nuit', viewDetails: 'Voir les détails' },
                es: { from: 'Desde', night: '/noche', viewDetails: 'Ver detalles' },
                nl: { from: 'Vanaf', night: '/nacht', viewDetails: 'Details bekijken' },
                ja: { from: '', night: '/泊', viewDetails: '詳細を見る' },
                it: { from: 'Da', night: '/notte', viewDetails: 'Vedi dettagli' },
                pt: { from: 'A partir de', night: '/noite', viewDetails: 'Ver detalhes' }
            };
            var t = translations[lang] || translations['en'];

            fetch(apiUrl + '/api/public/client/' + clientId + '/properties?limit=' + limit + '&lang=' + lang + '&blog_id=' + blogId)
                .then(function(r){ return r.json(); })
                .then(function(data){
                    var container = document.getElementById('gas-properties-list');
                    var props = data.properties || [];
                    if (props.length === 0) {
                        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:40px;">No properties found.</p>';
                        return;
                    }
                    var html = '';
                    props.forEach(function(p){
                        var img = (p.primary_image || (p.images && p.images[0] ? p.images[0].url : '')) || '';
                        var type = p.property_type || '';
                        var city = p.city || '';
                        var country = p.country || '';
                        var location = city + (city && country ? ', ' : '') + country;
                        var currency = p.currency || 'EUR';
                        var minPrice = p.min_price ? parseFloat(p.min_price) : 0;
                        var link = "/book-now/?property_id=" + p.id;

                        html += '<a class="gas-prop-card" href="' + link + '" itemscope itemtype="https://schema.org/LodgingBusiness">';
                        if (img) html += '<img class="gas-prop-img" src="' + img + '" alt="' + (p.name || '') + '" itemprop="image">';
                        html += '<div class="gas-prop-body">';
                        html += '<h3 class="gas-prop-name" itemprop="name">' + (p.name || '') + '</h3>';
                        if (location) html += '<p class="gas-prop-location" itemprop="address">' + location + '</p>';
                        if (minPrice > 0) {
                            var sym = {EUR:'€',GBP:'£',USD:'$',CHF:'CHF'}[currency] || currency + ' ';
                            html += '<p class="gas-prop-price">' + t.from + ' ' + sym + minPrice.toFixed(0) + t.night + '</p>';
                        }
                        html += '<span class="gas-prop-cta">' + t.viewDetails + '</span>';
                        html += '</div></a>';
                    });
                    container.innerHTML = html;
                })
                .catch(function(e){
                    document.getElementById('gas-properties-list').innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#ef4444;padding:40px;">Error loading properties.</p>';
                });
        })();
        </script>
        <?php
        return ob_get_clean();
    }
}
