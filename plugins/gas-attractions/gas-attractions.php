<?php
/**
 * Plugin Name: GAS Attractions
 * Plugin URI: https://gas.travel
 * Description: Display local attractions from GAS with TouristAttraction schema markup. Colors controlled via GAS Admin.
 * Version: 2.7.0
 * Author: GAS - Guest Accommodation System
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) exit;
define('GAS_ATTRACTIONS_DEFAULT_API_URL', 'https://admin.gas.travel');

add_action('init', function() {
    add_shortcode('gas_attractions', array(GAS_Attractions::get_instance(), 'attractions_shortcode'));
    add_shortcode('gas_attractions_categories', array(GAS_Attractions::get_instance(), 'categories_shortcode'));
}, 1);

class GAS_Attractions {
    private static $instance = null;
    private $colors_cache = null;
    
    public static function get_instance() { if (null === self::$instance) self::$instance = new self(); return self::$instance; }
    
    private function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('init', array($this, 'add_rewrite_rules'));
        add_filter('query_vars', array($this, 'add_query_vars'));
        add_action('template_redirect', array($this, 'handle_attractions_page'), 1);
        add_action('template_redirect', array($this, 'handle_single_attraction'), 2);
        add_action('wp_ajax_gas_attractions_clear_colors', array($this, 'clear_colors_cache'));
    }
    
    private function get_api_url() { return get_option('gas_attractions_api_url', '') ?: GAS_ATTRACTIONS_DEFAULT_API_URL; }
    
    private function get_page_url() { return '/'.trim(get_option('gas_attractions_page_url', '/attractions/'), '/').'/'; }
    
    private function get_page_base() { return trim(get_option('gas_attractions_page_url', '/attractions/'), '/'); }
    
    private function get_colors() {
        if ($this->colors_cache !== null) return $this->colors_cache;
        $cached = get_transient('gas_attractions_colors');
        if ($cached !== false) { $this->colors_cache = $cached; return $cached; }
        
        $defaults = array('accent'=>'#f59e0b','bg'=>'#ffffff','card_bg'=>'#ffffff','text'=>'#1a1a1a','text_secondary'=>'#666666','category_bg'=>'#fef3c7','category_text'=>'#92400e');
        $client_id = get_option('gas_attractions_client_id') ?: get_option('gas_client_id', '');
        if ($client_id) {
            $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/app-settings/attractions';
            $response = wp_remote_get($url, array('timeout'=>10));
            if (!is_wp_error($response)) {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                if ($body && $body['success'] && !empty($body['colors'])) {
                    $colors = wp_parse_args($body['colors'], $defaults);
                    set_transient('gas_attractions_colors', $colors, HOUR_IN_SECONDS);
                    $this->colors_cache = $colors;
                    return $colors;
                }
            }
        }
        $this->colors_cache = $defaults;
        return $defaults;
    }
    
    public function clear_colors_cache() { delete_transient('gas_attractions_colors'); delete_transient('gas_attractions_fonts'); wp_send_json_success(); }
    
    private function get_fonts() {
        $cached = get_transient('gas_attractions_fonts');
        if ($cached !== false) return $cached;
        
        $defaults = array('heading' => 'inherit', 'body' => 'inherit');
        $font_map = array(
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
        
        $client_id = get_option('gas_attractions_client_id') ?: get_option('gas_client_id', '');
        if ($client_id) {
            $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/app-settings/attractions';
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
                    set_transient('gas_attractions_fonts', $fonts, HOUR_IN_SECONDS);
                    return $fonts;
                }
            }
        }
        
        set_transient('gas_attractions_fonts', $defaults, HOUR_IN_SECONDS);
        return $defaults;
    }
    
    private function font_css($font) {
        return ($font && $font !== 'inherit') ? 'font-family:'.$font.' !important;' : '';
    }

    private function get_page_title_subtitle() {
        $lang = $this->get_current_language();
        $client_id = get_option('gas_attractions_client_id') ?: get_option('gas_client_id', '');
        if (!$client_id) return array('title' => '', 'subtitle' => '');
        $cache_key = 'gas_attr_page_ts_' . $client_id;
        $page_data = get_transient($cache_key);
        if ($page_data === false) {
            $url = trailingslashit($this->get_api_url()) . 'api/public/client/' . $client_id . '/site-config';
            $response = wp_remote_get($url, array('timeout' => 10));
            if (!is_wp_error($response)) {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                $ws = $body['config']['website'] ?? array();
                $page_data = $ws['page-attractions'] ?? array();
            } else {
                $page_data = array();
            }
            set_transient($cache_key, $page_data, HOUR_IN_SECONDS);
        }
        $title = $page_data['title-' . $lang] ?? $page_data['title-en'] ?? '';
        $subtitle = $page_data['subtitle-' . $lang] ?? $page_data['subtitle-en'] ?? '';
        return array('title' => $title, 'subtitle' => $subtitle);
    }

    public function add_admin_menu() { add_options_page('GAS Attractions', 'GAS Attractions', 'manage_options', 'gas-attractions', array($this, 'settings_page')); }
    public function register_settings() { foreach(array('api_url','client_id','property_id','property_name','page_url') as $s) register_setting('gas_attractions_settings','gas_attractions_'.$s); }
    
    public function settings_page() {
        $c = $this->get_colors(); ?>
        <div class="wrap">
            <h1>🎯 GAS Attractions</h1>
            <?php $this->test_connection(); ?>
            <form method="post" action="options.php">
                <?php settings_fields('gas_attractions_settings'); ?>
                <h2>API Settings</h2>
                <table class="form-table">
                    <tr><th>API URL</th><td><input type="url" name="gas_attractions_api_url" value="<?php echo esc_attr(get_option('gas_attractions_api_url','')); ?>" class="regular-text" placeholder="<?php echo GAS_ATTRACTIONS_DEFAULT_API_URL; ?>"/></td></tr>
                    <tr><th>Client ID</th><td><input type="text" name="gas_attractions_client_id" value="<?php echo esc_attr(get_option('gas_attractions_client_id')); ?>" class="regular-text"/></td></tr>
                    <tr><th>Property ID</th><td><input type="text" name="gas_attractions_property_id" value="<?php echo esc_attr(get_option('gas_attractions_property_id')); ?>" class="regular-text"/><p class="description">Optional filter</p></td></tr>
                    <tr><th>Property Name</th><td><input type="text" name="gas_attractions_property_name" value="<?php echo esc_attr(get_option('gas_attractions_property_name', get_bloginfo('name'))); ?>" class="regular-text"/></td></tr>
                    <tr><th>Page URL</th><td><input type="text" name="gas_attractions_page_url" value="<?php echo esc_attr(get_option('gas_attractions_page_url','/attractions/')); ?>" class="regular-text"/><p class="description">Used for listing page and back links (e.g. /things-to-do/ or /attractions/)</p></td></tr>
                </table>
                <h2>🎨 Colors (from GAS Admin)</h2>
                <p class="description">Manage colors in GAS Admin → Attractions → Settings. <a href="<?php echo admin_url('admin-ajax.php?action=gas_attractions_clear_colors'); ?>" onclick="event.preventDefault();fetch(this.href).then(()=>location.reload());">Refresh colors</a></p>
                <table class="form-table">
                    <tr><th>Accent</th><td><span style="display:inline-block;width:24px;height:24px;background:<?php echo esc_attr($c['accent']); ?>;border-radius:4px;vertical-align:middle;margin-right:8px;border:1px solid #ccc;"></span><?php echo esc_html($c['accent']); ?></td></tr>
                    <tr><th>Background</th><td><span style="display:inline-block;width:24px;height:24px;background:<?php echo esc_attr($c['bg']); ?>;border-radius:4px;vertical-align:middle;margin-right:8px;border:1px solid #ccc;"></span><?php echo esc_html($c['bg']); ?></td></tr>
                    <tr><th>Text</th><td><span style="display:inline-block;width:24px;height:24px;background:<?php echo esc_attr($c['text']); ?>;border-radius:4px;vertical-align:middle;margin-right:8px;border:1px solid #ccc;"></span><?php echo esc_html($c['text']); ?></td></tr>
                    <tr><th>Category Badge</th><td><span style="background:<?php echo esc_attr($c['category_bg']); ?>;color:<?php echo esc_attr($c['category_text']); ?>;padding:4px 12px;border-radius:12px;">Restaurants</span></td></tr>
                </table>
                <h2>Shortcodes</h2>
                <p><code>[gas_attractions limit="12" columns="3"]</code> | <code>[gas_attractions_categories]</code></p>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
    
    private function test_connection() {
        $id = get_option('gas_attractions_client_id') ?: get_option('gas_client_id', '');
        if (!$id) { echo '<div class="notice notice-warning"><p>Enter Client ID</p></div>'; return; }
        $r = $this->fetch_attractions(array('limit'=>1));
        echo is_wp_error($r) ? '<div class="notice notice-error"><p>❌ Connection failed</p></div>' : '<div class="notice notice-success"><p>✅ Connected</p></div>';
    }
    
    private function get_current_language() {
        // Check URL parameter first
        if (isset($_GET['lang']) && preg_match('/^[a-z]{2}$/', $_GET['lang'])) {
            return sanitize_text_field($_GET['lang']);
        }
        // Check cookie
        if (isset($_COOKIE['gas_lang']) && preg_match('/^[a-z]{2}$/', $_COOKIE['gas_lang'])) {
            return sanitize_text_field($_COOKIE['gas_lang']);
        }
        return 'en';
    }
    
    public function fetch_attractions($args = array()) {
        $client_id = get_option('gas_attractions_client_id') ?: get_option('gas_client_id', '');
        if (!$client_id) return new WP_Error('no_config','No client ID');
        $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/attractions';
        $params = array('lang' => $this->get_current_language());
        if ($pid = get_option('gas_attractions_property_id')) $params['property_id'] = $pid;
        if (!empty($args['limit'])) $params['limit'] = $args['limit'];
        if (!empty($args['category'])) $params['category'] = $args['category'];
        if ($params) $url .= '?'.http_build_query($params);
        $response = wp_remote_get($url, array('timeout'=>15));
        if (is_wp_error($response)) return $response;
        $body = json_decode(wp_remote_retrieve_body($response), true);
        return $body['attractions'] ?? array();
    }
    
    public function fetch_single($slug) {
        $client_id = get_option('gas_attractions_client_id') ?: get_option('gas_client_id', '');
        if (!$client_id) return null;
        $lang = $this->get_current_language();
        $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/attractions/'.$slug.'?lang='.$lang;
        $r = wp_remote_get($url, array('timeout'=>15));
        if (is_wp_error($r)) return null;
        $body = json_decode(wp_remote_retrieve_body($r), true);
        return ($body && $body['success']) ? ($body['attraction'] ?? null) : null;
    }
    
    public function add_rewrite_rules() {
        $base = $this->get_page_base();
        add_rewrite_rule('^'.$base.'/([^/]+)/?$','index.php?gas_attraction_slug=$matches[1]','top');
    }
    public function add_query_vars($v) { $v[] = 'gas_attraction_slug'; return $v; }
    
    public function handle_attractions_page() {
        $page = $this->get_page_url();
        $path = '/'.trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH),'/').'/';
        if ($path === $page && !get_query_var('gas_attraction_slug')) { $this->render_listing(); exit; }
    }
    
    private function render_listing() {
        $c = $this->get_colors();
        $f = $this->get_fonts();
        $hf = $this->font_css($f['heading']);
        $bf = $this->font_css($f['body']);
        $base = $this->get_page_base();
        $prop = get_option('gas_attractions_property_name', get_bloginfo('name'));
        $cat = isset($_GET['attraction_cat']) ? sanitize_text_field($_GET['attraction_cat']) : '';
        $items = $this->fetch_attractions(array('limit'=>50,'category'=>$cat));
        $all = $this->fetch_attractions(array('limit'=>100));
        $cats = array(); $cat_labels = array(); if (!is_wp_error($all)) foreach ($all as $a) { if (!empty($a['category']) && !in_array($a['category'],$cats)) { $cats[] = $a['category']; $cat_labels[$a['category']] = $a['category_label'] ?? $a['category']; } }
        $lang = $this->get_current_language();
        $all_label = array('en'=>'All','es'=>'Todos','fr'=>'Tous','de'=>'Alle','nl'=>'Alle')[$lang] ?? 'All';
        get_header();
        echo '<style>.gas-ap{max-width:1200px;margin:0 auto;padding:120px 20px 40px;background:'.$c['bg'].';min-height:60vh;'.$bf.'}.gas-at{font-size:2.5rem;margin:0 0 10px;color:'.$c['text'].';'.$hf.'}.gas-as{color:'.$c['text_secondary'].';margin:0 0 30px}.gas-ag{display:grid;gap:25px;grid-template-columns:repeat(3,1fr)}.gas-ac{background:'.$c['card_bg'].';border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:all .2s}.gas-ac:hover{transform:translateY(-4px);box-shadow:0 8px 25px rgba(0,0,0,0.12)}.gas-ac a{text-decoration:none;color:inherit;display:block}.gas-ai{width:100%;height:180px;object-fit:cover}.gas-ao{padding:15px}.gas-an{margin:8px 0;font-size:1.1rem;color:'.$c['text'].';'.$hf.'}.gas-ad{color:'.$c['text_secondary'].';font-size:.9rem;margin:0}.gas-ab{background:'.$c['category_bg'].';color:'.$c['category_text'].';padding:2px 10px;border-radius:12px;font-size:.8rem}.gas-af{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:30px}.gas-al{padding:8px 16px;border-radius:20px;text-decoration:none}.gas-al.active{background:'.$c['accent'].';color:#fff}.gas-al:not(.active){background:#f3f4f6;color:#374151}@media(max-width:900px){.gas-ag{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.gas-ag{grid-template-columns:1fr}}</style>';
        $ps = $this->get_page_title_subtitle();
        $page_title = $ps['title'] ?: 'Things To Do';
        $page_sub = $ps['subtitle'] ?: 'Discover attractions near '.esc_html($prop);
        echo '<div class="gas-ap"><h1 class="gas-at">'.esc_html($page_title).'</h1><p class="gas-as">'.esc_html($page_sub).'</p>';
        if ($cats) { echo '<div class="gas-af"><a href="'.esc_url(remove_query_arg('attraction_cat')).'" class="gas-al '.(empty($cat)?'active':'').'">'.$all_label.'</a>'; foreach ($cats as $ct) echo '<a href="'.esc_url(add_query_arg('attraction_cat',sanitize_title($ct))).'" class="gas-al '.($cat===sanitize_title($ct)?'active':'').'">'.esc_html($cat_labels[$ct] ?? $ct).'</a>'; echo '</div>'; }
        if (is_wp_error($items) || empty($items)) { echo '<p style="text-align:center;padding:60px;color:'.$c['text_secondary'].'">No attractions found.</p>'; }
        else { echo '<div class="gas-ag">'; foreach ($items as $a) { echo '<div class="gas-ac"><a href="'.esc_url(home_url('/'.$base.'/'.$a['slug'])).'">'; if (!empty($a['featured_image_url'])) echo '<img src="'.esc_url($a['featured_image_url']).'" class="gas-ai">'; echo '<div class="gas-ao">'; if (!empty($a['category'])) echo '<span class="gas-ab">'.esc_html($a['category_label'] ?? $a['category']).'</span>'; echo '<h3 class="gas-an">'.esc_html($a['name']).'</h3>'; if (!empty($a['short_description'])) echo '<p class="gas-ad">'.esc_html(wp_trim_words($a['short_description'],12)).'</p>'; echo '</div></a></div>'; } echo '</div>'; }
        echo '</div>'; get_footer();
    }
    
    public function handle_single_attraction() {
        $slug = get_query_var('gas_attraction_slug'); if (!$slug) return;
        $a = $this->fetch_single($slug);
        if (!$a) { global $wp_query; $wp_query->set_404(); status_header(404); return; }
        $this->render_single($a); exit;
    }
    
    private function render_single($a) {
        $c = $this->get_colors();
        $f = $this->get_fonts();
        $hf = $this->font_css($f['heading']);
        $bf = $this->font_css($f['body']);
        $base = $this->get_page_base();
        get_header();
        echo '<style>.gas-sp{max-width:800px;margin:0 auto;padding:120px 20px 40px;background:'.$c['bg'].';'.$bf.'}.gas-st{font-size:2.5rem;margin:0 0 15px;color:'.$c['text'].';'.$hf.'}.gas-si{width:100%;border-radius:12px;margin-bottom:30px}.gas-sc{font-size:1.1rem;line-height:1.8;color:'.$c['text'].'}.gas-sb{display:inline-block;margin-bottom:20px;color:'.$c['text_secondary'].';text-decoration:none}.gas-sn{display:inline-block;padding:12px 24px;background:'.$c['accent'].';color:#fff;text-decoration:none;border-radius:8px;margin:20px 10px 0 0}</style>';
        echo '<script type="application/ld+json">'.wp_json_encode(array('@context'=>'https://schema.org','@type'=>'TouristAttraction','name'=>$a['name'],'description'=>$a['short_description']??'','image'=>$a['featured_image_url']??''),JSON_UNESCAPED_SLASHES).'</script>';
        echo '<article class="gas-sp"><a href="'.esc_url(home_url('/'.$base.'/')).'" class="gas-sb">← Back</a>';
        if (!empty($a['category'])) echo ' <span style="background:'.$c['category_bg'].';color:'.$c['category_text'].';padding:4px 12px;border-radius:20px;font-size:.85rem">'.esc_html($a['category']).'</span>';
        echo '<h1 class="gas-st">'.esc_html($a['name']).'</h1>';
        if (!empty($a['featured_image_url'])) echo '<img src="'.esc_url($a['featured_image_url']).'" class="gas-si">';
        echo '<div class="gas-sc">'.wp_kses_post($a['description'] ?? $a['short_description'] ?? '').'</div>';
        if (!empty($a['website_url'])) echo '<a href="'.esc_url($a['website_url']).'" target="_blank" class="gas-sn">Visit Website</a>';
        if (!empty($a['google_maps_url'])) echo '<a href="'.esc_url($a['google_maps_url']).'" target="_blank" class="gas-sn" style="background:#6b7280">Directions</a>';
        echo '</article>'; get_footer();
    }
    
    public function attractions_shortcode($atts) {
        $atts = shortcode_atts(array('limit'=>'12','columns'=>'3','category'=>''),$atts);
        $c = $this->get_colors();
        $base = $this->get_page_base();
        if (empty($atts['category']) && isset($_GET['attraction_cat'])) $atts['category'] = sanitize_text_field($_GET['attraction_cat']);
        $items = $this->fetch_attractions(array('limit'=>$atts['limit'],'category'=>$atts['category']));
        if (is_wp_error($items) || empty($items)) return '<p>No attractions found.</p>';
        $h = '<style>.gas-sc-c:hover{transform:translateY(-4px)!important}@media(max-width:900px){.gas-sc-g{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:600px){.gas-sc-g{grid-template-columns:1fr!important}}</style><div class="gas-sc-g" style="display:grid;gap:25px;grid-template-columns:repeat('.$atts['columns'].',1fr)">';
        foreach ($items as $a) { $h .= '<div class="gas-sc-c" style="background:'.$c['card_bg'].';border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:all .2s"><a href="'.esc_url(home_url('/'.$base.'/'.$a['slug'])).'" style="text-decoration:none;color:inherit;display:block">'; if (!empty($a['featured_image_url'])) $h .= '<img src="'.esc_url($a['featured_image_url']).'" style="width:100%;height:180px;object-fit:cover">'; $h .= '<div style="padding:15px">'; if (!empty($a['category'])) $h .= '<span style="background:'.$c['category_bg'].';color:'.$c['category_text'].';padding:2px 10px;border-radius:12px;font-size:.8rem">'.esc_html($a['category']).'</span>'; $h .= '<h3 style="margin:8px 0;font-size:1.1rem;color:'.$c['text'].'">'.esc_html($a['name']).'</h3>'; if (!empty($a['short_description'])) $h .= '<p style="color:'.$c['text_secondary'].';font-size:.9rem;margin:0">'.esc_html(wp_trim_words($a['short_description'],12)).'</p>'; $h .= '</div></a></div>'; }
        return $h.'</div>';
    }
    
    public function categories_shortcode($atts) {
        $c = $this->get_colors();
        $items = $this->fetch_attractions(array('limit'=>100));
        if (is_wp_error($items) || empty($items)) return '';
        $cats = array(); foreach ($items as $a) if (!empty($a['category']) && !in_array($a['category'],$cats)) $cats[] = $a['category'];
        if (!$cats) return '';
        $cur = isset($_GET['attraction_cat']) ? sanitize_text_field($_GET['attraction_cat']) : '';
        $h = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:30px"><a href="'.esc_url(remove_query_arg('attraction_cat')).'" style="padding:8px 16px;background:'.(empty($cur)?$c['accent'].';color:#fff':'#f3f4f6;color:#374151').';border-radius:20px;text-decoration:none">All</a>';
        foreach ($cats as $ct) $h .= '<a href="'.esc_url(add_query_arg('attraction_cat',sanitize_title($ct))).'" style="padding:8px 16px;background:'.($cur===sanitize_title($ct)?$c['accent'].';color:#fff':'#f3f4f6;color:#374151').';border-radius:20px;text-decoration:none">'.esc_html($ct).'</a>';
        return $h.'</div>';
    }
}

GAS_Attractions::get_instance();
register_activation_hook(__FILE__, function() { GAS_Attractions::get_instance()->add_rewrite_rules(); flush_rewrite_rules(); });
register_deactivation_hook(__FILE__, 'flush_rewrite_rules');
