<?php
/**
 * Plugin Name: GAS Attractions
 * Plugin URI: https://gas.travel
 * Description: Display local attractions from GAS with TouristAttraction schema markup. Colors controlled via GAS Admin.
 * Version: 2.8.0
 * Author: GAS - Guest Accommodation System
 * License: Proprietary - All Rights Reserved
 * License URI: https://gas.travel/license
 */

/*
 * Copyright © 2024–2026 Steve Driver / Global Accommodation Systems.
 * All rights reserved. Proprietary software.
 * See LICENSE at the repository root.
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
        
        $defaults = array('accent'=>'#f59e0b','bg'=>'#ffffff','card_bg'=>'#ffffff','text'=>'#1a1a1a','text_secondary'=>'#666666','category_bg'=>'#fef3c7','category_text'=>'#92400e','card_radius'=>'12','btn_radius'=>'20','placeholder_bg'=>'#f1f5f9','placeholder_fg'=>'#94a3b8');
        $client_id = get_option('gas_attractions_client_id') ?: get_option('gas_client_id', '');
        if ($client_id) {
            $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/app-settings/attractions';
            $response = wp_remote_get($url, array('timeout'=>10));
            if (!is_wp_error($response)) {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                if ($body && $body['success'] && !empty($body['colors'])) {
                    $colors = wp_parse_args($body['colors'], $defaults);
                    set_transient('gas_attractions_colors', $colors, 5 * MINUTE_IN_SECONDS);
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
                    set_transient('gas_attractions_fonts', $fonts, 5 * MINUTE_IN_SECONDS);
                    return $fonts;
                }
            }
        }
        
        set_transient('gas_attractions_fonts', $defaults, 5 * MINUTE_IN_SECONDS);
        return $defaults;
    }
    
    private function font_css($font) {
        return ($font && $font !== 'inherit') ? 'font-family:'.$font.' !important;' : '';
    }

    private function is_placeholder_url($url) {
        return !$url || strpos($url, '/placeholders/') !== false;
    }

    private function render_placeholder($category, $height = '180px') {
        $c = $this->get_colors();
        $bg = $c['placeholder_bg'] ?? '#f1f5f9';
        $fg = $c['placeholder_fg'] ?? '#94a3b8';
        $label = esc_html($category ?: 'Attraction');
        // Map pin icon — clean Lucide style
        $icon = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="'.$fg.'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
        return '<div style="width:100%;height:'.$height.';background:'.$bg.';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">'.$icon.'<span style="color:'.$fg.';font-size:0.95rem;font-weight:500">'.$label.'</span></div>';
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
        $pid = get_option('gas_attractions_property_id') ?: get_option('gas_property_id', '');
        if ($pid) $params['property_id'] = $pid;
        if (!empty($args['limit'])) $params['limit'] = $args['limit'];
        if (!empty($args['offset'])) $params['offset'] = $args['offset'];
        if (!empty($args['category'])) $params['category'] = $args['category'];
        if (!empty($args['search'])) $params['search'] = $args['search'];
        if ($params) $url .= '?'.http_build_query($params);
        $response = wp_remote_get($url, array('timeout'=>15));
        if (is_wp_error($response)) return $response;
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!empty($args['_full_response'])) return $body ?: array();
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
        $per_page = 9;
        $result = $this->fetch_attractions(array('limit' => $per_page, 'category' => $cat, '_full_response' => true));
        $items = $result['attractions'] ?? array();
        $total = $result['total'] ?? count($items);
        $has_more = $result['has_more'] ?? false;
        $all = $this->fetch_attractions(array('limit' => 100));
        $cats = array(); $cat_labels = array(); if (!is_wp_error($all)) foreach ($all as $a) { if (!empty($a['category']) && !in_array($a['category'], $cats)) { $cats[] = $a['category']; $cat_labels[$a['category']] = $a['category_label'] ?? $a['category']; } }
        $lang = $this->get_current_language();
        $all_label = array('en' => 'All', 'es' => 'Todos', 'fr' => 'Tous', 'de' => 'Alle', 'nl' => 'Alle')[$lang] ?? 'All';
        $search_label = array('en' => 'Search attractions...', 'es' => 'Buscar...', 'fr' => 'Rechercher...', 'de' => 'Suchen...', 'nl' => 'Zoeken...')[$lang] ?? 'Search attractions...';
        $view_more_label = array('en' => 'View More', 'es' => 'Ver más', 'fr' => 'Voir plus', 'de' => 'Mehr anzeigen', 'nl' => 'Meer laden')[$lang] ?? 'View More';
        get_header();
        $cr = intval($c['card_radius'] ?? 12) . 'px';
        $br = intval($c['btn_radius'] ?? 20) . 'px';
        $api_url = esc_url(trailingslashit($this->get_api_url()));
        $client_id = esc_attr(get_option('gas_attractions_client_id') ?: get_option('gas_client_id', ''));
        $property_id = esc_attr(get_option('gas_attractions_property_id') ?: get_option('gas_property_id', ''));
        echo '<style>.gas-ap{max-width:1200px;margin:0 auto;padding:120px 20px 40px;background:' . $c['bg'] . ';min-height:60vh;' . $bf . '}.gas-at{font-size:2.5rem;margin:0 0 10px;color:' . $c['text'] . ';' . $hf . '}.gas-as{color:' . $c['text_secondary'] . ';margin:0 0 30px}.gas-ag{display:grid;gap:25px;grid-template-columns:repeat(3,1fr)}.gas-ac{background:' . $c['card_bg'] . ';border-radius:' . $cr . ';overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:all .2s}.gas-ac:hover{transform:translateY(-4px);box-shadow:0 8px 25px rgba(0,0,0,0.12)}.gas-ac a{text-decoration:none;color:inherit;display:block}.gas-ai{width:100%;height:180px;object-fit:cover}.gas-ao{padding:15px}.gas-an{margin:8px 0;font-size:1.1rem;color:' . $c['text'] . ';' . $hf . '}.gas-ad{color:' . $c['text_secondary'] . ';font-size:.9rem;margin:0}.gas-ab{background:' . $c['category_bg'] . ';color:' . $c['category_text'] . ';padding:2px 10px;border-radius:' . $br . ';font-size:.8rem}.gas-af{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;align-items:center}.gas-al{padding:8px 16px;border-radius:' . $br . ';text-decoration:none;cursor:pointer}.gas-al.active{background:' . $c['accent'] . ';color:#fff}.gas-al:not(.active){background:' . $c['category_bg'] . ';color:' . $c['category_text'] . '}';
        echo '.gas-search{display:flex;margin-bottom:20px}.gas-search input{flex:1;max-width:320px;padding:10px 16px;border:1px solid #d1d5db;border-radius:' . $br . ';font-size:.95rem;outline:none;' . $bf . '}.gas-search input:focus{border-color:' . $c['accent'] . ';box-shadow:0 0 0 2px ' . $c['accent'] . '33}';
        echo '.gas-vm-wrap{text-align:center;margin-top:40px}.gas-vm-btn{display:inline-block;padding:12px 32px;background:' . $c['accent'] . ';color:#fff;border:none;border-radius:' . $br . ';font-size:1rem;cursor:pointer;transition:opacity .2s;' . $bf . '}.gas-vm-btn:hover{opacity:.85}.gas-vm-btn:disabled{opacity:.5;cursor:not-allowed}';
        echo '.gas-spinner{display:inline-block;width:18px;height:18px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:gas-spin .6s linear infinite;vertical-align:middle;margin-left:8px}@keyframes gas-spin{to{transform:rotate(360deg)}}';
        echo '@media(max-width:900px){.gas-ag{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.gas-ag{grid-template-columns:1fr}}</style>';
        $ps = $this->get_page_title_subtitle();
        $page_title = $ps['title'] ?: 'Things To Do';
        $page_sub = $ps['subtitle'] ?: 'Discover attractions near ' . esc_html($prop);
        echo '<div class="gas-ap"><h1 class="gas-at">' . esc_html($page_title) . '</h1><p class="gas-as">' . esc_html($page_sub) . '</p>';
        // Search
        echo '<div class="gas-search"><input type="text" id="gas-attr-search" placeholder="' . esc_attr($search_label) . '"></div>';
        // Category tabs
        if ($cats) { echo '<div class="gas-af"><a href="' . esc_url(remove_query_arg('attraction_cat')) . '" class="gas-al ' . (empty($cat) ? 'active' : '') . '">' . $all_label . '</a>'; foreach ($cats as $ct) echo '<a href="' . esc_url(add_query_arg('attraction_cat', sanitize_title($ct))) . '" class="gas-al ' . ($cat === sanitize_title($ct) ? 'active' : '') . '">' . esc_html($cat_labels[$ct] ?? $ct) . '</a>'; echo '</div>'; }
        // Grid
        if (is_wp_error($items) || empty($items)) { echo '<p id="gas-attr-empty" style="text-align:center;padding:60px;color:' . $c['text_secondary'] . '">No attractions found.</p>'; }
        else {
            echo '<div class="gas-ag" id="gas-attr-grid">';
            foreach ($items as $a) {
                echo '<div class="gas-ac"><a href="' . esc_url(home_url('/' . $base . '/' . $a['slug'])) . '">';
                if (!empty($a['featured_image_url']) && !$this->is_placeholder_url($a['featured_image_url'])) {
                    echo '<img src="' . esc_url($a['featured_image_url']) . '" class="gas-ai" loading="lazy">';
                } else {
                    echo $this->render_placeholder($a['category_label'] ?? $a['category'] ?? '');
                }
                echo '<div class="gas-ao">';
                if (!empty($a['category'])) echo '<span class="gas-ab">' . esc_html($a['category_label'] ?? $a['category']) . '</span>';
                echo '<h3 class="gas-an">' . esc_html($a['name']) . '</h3>';
                if (!empty($a['short_description'])) echo '<p class="gas-ad">' . esc_html(wp_trim_words($a['short_description'], 12)) . '</p>';
                echo '</div></a></div>';
            }
            echo '</div>';
        }
        // View More
        echo '<div class="gas-vm-wrap" id="gas-vm-wrap"' . ($has_more ? '' : ' style="display:none"') . '><button class="gas-vm-btn" id="gas-vm-btn">' . esc_html($view_more_label) . '</button></div>';
        // AJAX
        echo '<script>
(function(){
  var grid = document.getElementById("gas-attr-grid");
  var btn = document.getElementById("gas-vm-btn");
  var wrap = document.getElementById("gas-vm-wrap");
  var searchInput = document.getElementById("gas-attr-search");
  var emptyMsg = document.getElementById("gas-attr-empty");
  var apiUrl = "' . $api_url . 'api/public/client/' . $client_id . '/attractions";
  var perPage = ' . $per_page . ';
  var currentOffset = perPage;
  var currentCat = "' . esc_js($cat) . '";
  var lang = "' . esc_js($lang) . '";
  var propId = "' . $property_id . '";
  var attrBase = "' . esc_url(home_url('/' . $base . '/')) . '";
  var loading = false;
  var searchTimer = null;

  function buildCard(a) {
    var img = a.featured_image_url ? \'<img src="\' + a.featured_image_url + \'" class="gas-ai" loading="lazy">\' : "";
    var catBadge = a.category ? \'<span class="gas-ab">\' + (a.category_label || a.category) + "</span>" : "";
    var desc = a.short_description || "";
    if (desc.length > 80) desc = desc.substring(0, desc.lastIndexOf(" ", 80)) + "...";
    return \'<div class="gas-ac"><a href="\' + attrBase + a.slug + \'">\' + img + \'<div class="gas-ao">\' + catBadge + \'<h3 class="gas-an">\' + a.name + "</h3>" + (desc ? \'<p class="gas-ad">\' + desc + "</p>" : "") + "</div></a></div>";
  }

  function fetchItems(offset, search) {
    var url = apiUrl + "?limit=" + perPage + "&offset=" + offset + "&lang=" + lang;
    if (propId) url += "&property_id=" + propId;
    if (currentCat) url += "&category=" + encodeURIComponent(currentCat);
    if (search) url += "&search=" + encodeURIComponent(search);
    return fetch(url).then(function(r){ return r.json(); });
  }

  if (btn) btn.addEventListener("click", function(){
    if (loading) return;
    loading = true;
    btn.disabled = true;
    btn.innerHTML = btn.textContent + \'<span class="gas-spinner"></span>\';
    var search = searchInput ? searchInput.value.trim() : "";
    fetchItems(currentOffset, search).then(function(data){
      if (data.attractions && data.attractions.length) {
        var html = "";
        data.attractions.forEach(function(a){ html += buildCard(a); });
        grid.insertAdjacentHTML("beforeend", html);
        currentOffset += data.attractions.length;
      }
      if (!data.has_more) wrap.style.display = "none";
      btn.disabled = false;
      btn.innerHTML = "' . esc_js($view_more_label) . '";
      loading = false;
    }).catch(function(){ btn.disabled = false; btn.innerHTML = "' . esc_js($view_more_label) . '"; loading = false; });
  });

  if (searchInput) searchInput.addEventListener("input", function(){
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function(){
      var q = searchInput.value.trim();
      fetchItems(0, q).then(function(data){
        if (!grid) {
          grid = document.createElement("div");
          grid.id = "gas-attr-grid";
          grid.className = "gas-ag";
          var vmWrap = document.getElementById("gas-vm-wrap");
          vmWrap.parentNode.insertBefore(grid, vmWrap);
        }
        grid.innerHTML = "";
        if (data.attractions && data.attractions.length) {
          data.attractions.forEach(function(a){ grid.insertAdjacentHTML("beforeend", buildCard(a)); });
          if (emptyMsg) emptyMsg.style.display = "none";
        } else {
          if (emptyMsg) { emptyMsg.style.display = ""; emptyMsg.textContent = q ? "No attractions matching \\"" + q + "\\"" : "No attractions found."; }
        }
        currentOffset = data.attractions ? data.attractions.length : 0;
        wrap.style.display = data.has_more ? "" : "none";
      });
    }, 350);
  });
})();
</script>';
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
        $cr = intval($c['card_radius'] ?? 12).'px';
        $br = intval($c['btn_radius'] ?? 20).'px';
        get_header();
        echo '<style>.gas-sp{max-width:800px;margin:0 auto;padding:120px 20px 40px;background:'.$c['bg'].';'.$bf.'}.gas-st{font-size:2.5rem;margin:0 0 15px;color:'.$c['text'].';'.$hf.'}.gas-si{width:100%;border-radius:'.$cr.';margin-bottom:30px}.gas-sc{font-size:1.1rem;line-height:1.8;color:'.$c['text'].'}.gas-sb{display:inline-block;margin-bottom:20px;color:'.$c['text_secondary'].';text-decoration:none}.gas-sn{display:inline-block;padding:12px 24px;background:'.$c['accent'].';color:#fff;text-decoration:none;border-radius:'.$br.';margin:20px 10px 0 0}</style>';
        echo '<script type="application/ld+json">'.wp_json_encode(array('@context'=>'https://schema.org','@type'=>'TouristAttraction','name'=>$a['name'],'description'=>$a['short_description']??'','image'=>$a['featured_image_url']??''),JSON_UNESCAPED_SLASHES).'</script>';
        echo '<article class="gas-sp"><a href="'.esc_url(home_url('/'.$base.'/')).'" class="gas-sb">← Back</a>';
        if (!empty($a['category'])) echo ' <span style="background:'.$c['category_bg'].';color:'.$c['category_text'].';padding:4px 12px;border-radius:'.$br.';font-size:.85rem">'.esc_html($a['category']).'</span>';
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
        $cr = intval($c['card_radius'] ?? 12).'px';
        $br = intval($c['btn_radius'] ?? 20).'px';
        $h = '<style>.gas-sc-c:hover{transform:translateY(-4px)!important}@media(max-width:900px){.gas-sc-g{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:600px){.gas-sc-g{grid-template-columns:1fr!important}}</style><div class="gas-sc-g" style="display:grid;gap:25px;grid-template-columns:repeat('.$atts['columns'].',1fr)">';
        foreach ($items as $a) { $h .= '<div class="gas-sc-c" style="background:'.$c['card_bg'].';border-radius:'.$cr.';overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:all .2s"><a href="'.esc_url(home_url('/'.$base.'/'.$a['slug'])).'" style="text-decoration:none;color:inherit;display:block">'; if (!empty($a['featured_image_url']) && !$this->is_placeholder_url($a['featured_image_url'])) { $h .= '<img src="'.esc_url($a['featured_image_url']).'" style="width:100%;height:180px;object-fit:cover">'; } else { $h .= $this->render_placeholder($a['category'] ?? '', '180px'); } $h .= '<div style="padding:15px">'; if (!empty($a['category'])) $h .= '<span style="background:'.$c['category_bg'].';color:'.$c['category_text'].';padding:2px 10px;border-radius:'.$br.';font-size:.8rem">'.esc_html($a['category']).'</span>'; $h .= '<h3 style="margin:8px 0;font-size:1.1rem;color:'.$c['text'].'">'.esc_html($a['name']).'</h3>'; if (!empty($a['short_description'])) $h .= '<p style="color:'.$c['text_secondary'].';font-size:.9rem;margin:0">'.esc_html(wp_trim_words($a['short_description'],12)).'</p>'; $h .= '</div></a></div>'; }
        return $h.'</div>';
    }
    
    public function categories_shortcode($atts) {
        $c = $this->get_colors();
        $items = $this->fetch_attractions(array('limit'=>100));
        if (is_wp_error($items) || empty($items)) return '';
        $cats = array(); foreach ($items as $a) if (!empty($a['category']) && !in_array($a['category'],$cats)) $cats[] = $a['category'];
        if (!$cats) return '';
        $cur = isset($_GET['attraction_cat']) ? sanitize_text_field($_GET['attraction_cat']) : '';
        $br = intval($c['btn_radius'] ?? 20).'px';
        $h = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:30px"><a href="'.esc_url(remove_query_arg('attraction_cat')).'" style="padding:8px 16px;background:'.(empty($cur)?$c['accent'].';color:#fff':$c['category_bg'].';color:'.$c['category_text']).';border-radius:'.$br.';text-decoration:none">All</a>';
        foreach ($cats as $ct) $h .= '<a href="'.esc_url(add_query_arg('attraction_cat',sanitize_title($ct))).'" style="padding:8px 16px;background:'.($cur===sanitize_title($ct)?$c['accent'].';color:#fff':$c['category_bg'].';color:'.$c['category_text']).';border-radius:'.$br.';text-decoration:none">'.esc_html($ct).'</a>';
        return $h.'</div>';
    }
}

GAS_Attractions::get_instance();
register_activation_hook(__FILE__, function() { GAS_Attractions::get_instance()->add_rewrite_rules(); flush_rewrite_rules(); });
register_deactivation_hook(__FILE__, 'flush_rewrite_rules');
