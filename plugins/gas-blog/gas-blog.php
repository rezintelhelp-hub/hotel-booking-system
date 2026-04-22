<?php
/**
 * Plugin Name: GAS Blog
 * Plugin URI: https://gas.travel
 * Description: Display blog posts from GAS with Article schema markup for SEO. Colors controlled via GAS Admin.
 * Version: 2.10.1
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
define('GAS_BLOG_DEFAULT_API_URL', 'https://admin.gas.travel');

add_action('init', function() {
    add_shortcode('gas_blog', array(GAS_Blog::get_instance(), 'blog_shortcode'));
    add_shortcode('gas_blog_featured', array(GAS_Blog::get_instance(), 'featured_shortcode'));
    add_shortcode('gas_blog_categories', array(GAS_Blog::get_instance(), 'categories_shortcode'));
}, 1);

class GAS_Blog {
    private static $instance = null;
    private $colors_cache = null;
    
    public static function get_instance() { if (null === self::$instance) self::$instance = new self(); return self::$instance; }
    
    private function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('init', array($this, 'add_rewrite_rules'));
        add_filter('query_vars', array($this, 'add_query_vars'));
        add_action('template_redirect', array($this, 'handle_blog_page'), 1);
        add_action('template_redirect', array($this, 'handle_single_post'), 2);
        add_action('wp_ajax_gas_blog_clear_colors', array($this, 'clear_colors_cache'));
    }
    
    private function get_api_url() { return get_option('gas_blog_api_url', '') ?: GAS_BLOG_DEFAULT_API_URL; }
    
    private function get_colors() {
        if ($this->colors_cache !== null) return $this->colors_cache;
        $cached = get_transient('gas_blog_colors');
        if ($cached !== false) { $this->colors_cache = $cached; return $cached; }
        
        $defaults = array('accent'=>'#667eea','bg'=>'#ffffff','card_bg'=>'#ffffff','text'=>'#1a1a1a','text_secondary'=>'#666666','category_bg'=>'#e0e7ff','category_text'=>'#4338ca','card_radius'=>'12');
        $client_id = get_option('gas_blog_client_id') ?: get_option('gas_client_id', '');
        if ($client_id) {
            $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/app-settings/blog';
            $response = wp_remote_get($url, array('timeout'=>10));
            if (!is_wp_error($response)) {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                if ($body && $body['success'] && !empty($body['colors'])) {
                    $colors = wp_parse_args($body['colors'], $defaults);
                    set_transient('gas_blog_colors', $colors, 5 * MINUTE_IN_SECONDS);
                    $this->colors_cache = $colors;
                    return $colors;
                }
            }
        }
        $this->colors_cache = $defaults;
        return $defaults;
    }
    
    public function clear_colors_cache() { delete_transient('gas_blog_colors'); delete_transient('gas_blog_fonts'); wp_send_json_success(); }
    
    private function get_fonts() {
        $cached = get_transient('gas_blog_fonts');
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
        
        $client_id = get_option('gas_blog_client_id') ?: get_option('gas_client_id', '');
        if ($client_id) {
            $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/app-settings/blog';
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
                    set_transient('gas_blog_fonts', $fonts, 5 * MINUTE_IN_SECONDS);
                    return $fonts;
                }
            }
        }
        
        set_transient('gas_blog_fonts', $defaults, 5 * MINUTE_IN_SECONDS);
        return $defaults;
    }
    
    private function font_css($font) {
        return ($font && $font !== 'inherit') ? 'font-family:'.$font.' !important;' : '';
    }

    private function get_page_title_subtitle() {
        $lang = $this->get_current_language();
        $client_id = get_option('gas_blog_client_id') ?: get_option('gas_client_id', '');
        if (!$client_id) return array('title' => '', 'subtitle' => '');
        $cache_key = 'gas_blog_page_ts_' . $client_id;
        $page_data = get_transient($cache_key);
        if ($page_data === false) {
            $url = trailingslashit($this->get_api_url()) . 'api/public/client/' . $client_id . '/site-config?site_url=' . urlencode(home_url('/'));
            $response = wp_remote_get($url, array('timeout' => 10));
            if (!is_wp_error($response)) {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                $ws = $body['config']['website'] ?? array();
                $page_data = $ws['page-blog'] ?? array();
            } else {
                $page_data = array();
            }
            set_transient($cache_key, $page_data, HOUR_IN_SECONDS);
        }
        $title = $page_data['title-' . $lang] ?? $page_data['title-en'] ?? '';
        $subtitle = $page_data['subtitle-' . $lang] ?? $page_data['subtitle-en'] ?? '';
        return array('title' => $title, 'subtitle' => $subtitle);
    }
    public function add_admin_menu() { add_options_page('GAS Blog', 'GAS Blog', 'manage_options', 'gas-blog', array($this, 'settings_page')); }
    public function register_settings() { foreach(array('api_url','client_id','property_name','page_url','back_url','posts_per_page') as $s) register_setting('gas_blog_settings','gas_blog_'.$s); }
    
    public function settings_page() {
        $c = $this->get_colors(); ?>
        <div class="wrap">
            <h1>📝 GAS Blog</h1>
            <?php $this->test_connection(); ?>
            <form method="post" action="options.php">
                <?php settings_fields('gas_blog_settings'); ?>
                <h2>API Settings</h2>
                <table class="form-table">
                    <tr><th>API URL</th><td><input type="url" name="gas_blog_api_url" value="<?php echo esc_attr(get_option('gas_blog_api_url','')); ?>" class="regular-text" placeholder="<?php echo GAS_BLOG_DEFAULT_API_URL; ?>"/></td></tr>
                    <tr><th>Client ID</th><td><input type="text" name="gas_blog_client_id" value="<?php echo esc_attr(get_option('gas_blog_client_id')); ?>" class="regular-text"/></td></tr>
                    <tr><th>Property Name</th><td><input type="text" name="gas_blog_property_name" value="<?php echo esc_attr(get_option('gas_blog_property_name', get_bloginfo('name'))); ?>" class="regular-text"/></td></tr>
                    <tr><th>Blog Page URL</th><td><input type="text" name="gas_blog_page_url" value="<?php echo esc_attr(get_option('gas_blog_page_url','/blog/')); ?>" class="regular-text"/></td></tr>
                    <tr><th>Back Button URL</th><td><input type="text" name="gas_blog_back_url" value="<?php echo esc_attr(get_option('gas_blog_back_url','')); ?>" class="regular-text" placeholder="Leave empty to use Blog Page URL"/><p class="description">Where the ← Back link goes on single posts (e.g. /hostel-life/)</p></td></tr>
                    <tr><th>Posts Per Page</th><td><input type="number" name="gas_blog_posts_per_page" value="<?php echo esc_attr(get_option('gas_blog_posts_per_page','9')); ?>" class="small-text"/></td></tr>
                </table>
                <h2>🎨 Colors (from GAS Admin)</h2>
                <p class="description">Manage colors in GAS Admin → Blog → Settings. <a href="<?php echo admin_url('admin-ajax.php?action=gas_blog_clear_colors'); ?>" onclick="event.preventDefault();fetch(this.href).then(()=>location.reload());">Refresh colors</a></p>
                <table class="form-table">
                    <tr><th>Accent</th><td><span style="display:inline-block;width:24px;height:24px;background:<?php echo esc_attr($c['accent']); ?>;border-radius:4px;vertical-align:middle;margin-right:8px;border:1px solid #ccc;"></span><?php echo esc_html($c['accent']); ?></td></tr>
                    <tr><th>Background</th><td><span style="display:inline-block;width:24px;height:24px;background:<?php echo esc_attr($c['bg']); ?>;border-radius:4px;vertical-align:middle;margin-right:8px;border:1px solid #ccc;"></span><?php echo esc_html($c['bg']); ?></td></tr>
                    <tr><th>Text</th><td><span style="display:inline-block;width:24px;height:24px;background:<?php echo esc_attr($c['text']); ?>;border-radius:4px;vertical-align:middle;margin-right:8px;border:1px solid #ccc;"></span><?php echo esc_html($c['text']); ?></td></tr>
                    <tr><th>Category Badge</th><td><span style="background:<?php echo esc_attr($c['category_bg']); ?>;color:<?php echo esc_attr($c['category_text']); ?>;padding:4px 12px;border-radius:12px;">Sample</span></td></tr>
                </table>
                <h2>Shortcodes</h2>
                <p><code>[gas_blog limit="6" columns="3"]</code> | <code>[gas_blog_featured]</code> | <code>[gas_blog_categories]</code></p>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
    
    private function test_connection() {
        $id = get_option('gas_blog_client_id') ?: get_option('gas_client_id', '');
        if (!$id) { echo '<div class="notice notice-warning"><p>Enter Client ID</p></div>'; return; }
        $r = $this->fetch_posts(array('limit'=>1));
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
    
    public function fetch_posts($args = array()) {
        $client_id = get_option('gas_blog_client_id') ?: get_option('gas_client_id', '');
        if (!$client_id) return new WP_Error('no_config','No client ID');
        $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/blog';
        $params = array('lang' => $this->get_current_language());
        $property_id = get_option('gas_property_id', '');
        if ($property_id) {
            $params['property_id'] = $property_id;
        }
        if (!empty($args['limit'])) $params['limit'] = $args['limit'];
        if (!empty($args['offset'])) $params['offset'] = $args['offset'];
        if (!empty($args['category'])) $params['category'] = $args['category'];
        if (!empty($args['search'])) $params['search'] = $args['search'];
        if ($params) $url .= '?'.http_build_query($params);
        $response = wp_remote_get($url, array('timeout'=>15));
        if (is_wp_error($response)) return $response;
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!empty($args['_full_response'])) return $body ?: array();
        return $body['posts'] ?? array();
    }
    
    public function fetch_single($slug) {
        $client_id = get_option('gas_blog_client_id') ?: get_option('gas_client_id', '');
        if (!$client_id) return null;
        $lang = $this->get_current_language();
        $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/blog/'.$slug.'?lang='.$lang;
        $r = wp_remote_get($url, array('timeout'=>15));
        if (is_wp_error($r)) return null;
        $body = json_decode(wp_remote_retrieve_body($r), true);
        return ($body && $body['success']) ? ($body['post'] ?? null) : null;
    }
    
    public function add_rewrite_rules() { add_rewrite_rule('^blog/([^/]+)/?$','index.php?gas_blog_post=$matches[1]','top'); }
    public function add_query_vars($v) { $v[] = 'gas_blog_post'; return $v; }
    
    public function handle_blog_page() {
        $page = '/'.trim(get_option('gas_blog_page_url','/blog/'),'/').'/';
        $path = '/'.trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH),'/').'/';
        if ($path === $page && !get_query_var('gas_blog_post')) { $this->render_listing(); exit; }
    }
    
    private function render_listing() {
        $c = $this->get_colors();
        $f = $this->get_fonts();
        $hf = $this->font_css($f['heading']);
        $bf = $this->font_css($f['body']);
        $prop = get_option('gas_blog_property_name', get_bloginfo('name'));
        $cat = isset($_GET['blog_cat']) ? sanitize_text_field($_GET['blog_cat']) : '';
        $per_page = intval(get_option('gas_blog_posts_per_page', 9));
        $result = $this->fetch_posts(array('limit' => $per_page, 'category' => $cat, '_full_response' => true));
        $posts = $result['posts'] ?? array();
        $total = $result['total'] ?? count($posts);
        $has_more = $result['has_more'] ?? false;
        $all = $this->fetch_posts(array('limit' => 100));
        $cats = array(); $cat_labels = array(); if (!is_wp_error($all)) foreach ($all as $p) { if (!empty($p['category']) && !in_array($p['category'], $cats)) { $cats[] = $p['category']; $cat_labels[$p['category']] = $p['category_label'] ?? $p['category']; } }
        $lang = $this->get_current_language();
        $all_label = array('en' => 'All', 'es' => 'Todos', 'fr' => 'Tous', 'de' => 'Alle', 'nl' => 'Alle')[$lang] ?? 'All';
        $search_label = array('en' => 'Search posts...', 'es' => 'Buscar...', 'fr' => 'Rechercher...', 'de' => 'Suchen...', 'nl' => 'Zoeken...')[$lang] ?? 'Search posts...';
        $view_more_label = array('en' => 'View More', 'es' => 'Ver más', 'fr' => 'Voir plus', 'de' => 'Mehr anzeigen', 'nl' => 'Meer laden')[$lang] ?? 'View More';
        get_header();
        $cr = intval($c['card_radius'] ?? 12) . 'px';
        $api_url = esc_url(trailingslashit($this->get_api_url()));
        $client_id = esc_attr(get_option('gas_blog_client_id') ?: get_option('gas_client_id', ''));
        $property_id = esc_attr(get_option('gas_property_id', ''));
        echo '<style>.gas-bp{max-width:1200px;margin:0 auto;padding:120px 20px 40px;background:' . $c['bg'] . ';min-height:60vh;' . $bf . '}.gas-bt{font-size:2.5rem;margin:0 0 10px;color:' . $c['text'] . ';' . $hf . '}.gas-bs{color:' . $c['text_secondary'] . ';margin:0 0 30px}.gas-bg{display:grid;gap:30px;grid-template-columns:repeat(3,1fr)}.gas-bc{background:' . $c['card_bg'] . ';border-radius:' . $cr . ';overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:all .2s}.gas-bc:hover{transform:translateY(-4px);box-shadow:0 8px 25px rgba(0,0,0,0.12)}.gas-bc a{text-decoration:none;color:inherit;display:block}.gas-bi{width:100%;height:200px;object-fit:cover}.gas-bo{padding:20px}.gas-bn{margin:0 0 10px;font-size:1.2rem;color:' . $c['text'] . ';' . $hf . '}.gas-bd{color:' . $c['text_secondary'] . ';font-size:.95rem;margin:0}.gas-bb{background:' . $c['category_bg'] . ';color:' . $c['category_text'] . ';padding:2px 10px;border-radius:12px;font-size:.8rem}.gas-bm{display:flex;gap:10px;font-size:.8rem;color:' . $c['text_secondary'] . ';margin-bottom:10px}.gas-bf{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;align-items:center}.gas-bl{padding:8px 16px;border-radius:20px;text-decoration:none;cursor:pointer}.gas-bl.active{background:' . $c['accent'] . ';color:#fff}.gas-bl:not(.active){background:#f3f4f6;color:#374151}';
        echo '.gas-search{display:flex;margin-bottom:20px}.gas-search input{flex:1;max-width:320px;padding:10px 16px;border:1px solid #d1d5db;border-radius:20px;font-size:.95rem;outline:none;' . $bf . '}.gas-search input:focus{border-color:' . $c['accent'] . ';box-shadow:0 0 0 2px ' . $c['accent'] . '33}';
        echo '.gas-vm-wrap{text-align:center;margin-top:40px}.gas-vm-btn{display:inline-block;padding:12px 32px;background:' . $c['accent'] . ';color:#fff;border:none;border-radius:24px;font-size:1rem;cursor:pointer;transition:opacity .2s;' . $bf . '}.gas-vm-btn:hover{opacity:.85}.gas-vm-btn:disabled{opacity:.5;cursor:not-allowed}';
        echo '.gas-spinner{display:inline-block;width:18px;height:18px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:gas-spin .6s linear infinite;vertical-align:middle;margin-left:8px}@keyframes gas-spin{to{transform:rotate(360deg)}}';
        echo '@media(max-width:900px){.gas-bg{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.gas-bg{grid-template-columns:1fr}}</style>';
        $ps = $this->get_page_title_subtitle();
        $page_title = $ps['title'] ?: 'Blog';
        $page_sub = $ps['subtitle'] ?: 'Latest news from ' . esc_html($prop);
        echo '<div class="gas-bp"><h1 class="gas-bt">' . esc_html($page_title) . '</h1><p class="gas-bs">' . esc_html($page_sub) . '</p>';
        // Search
        echo '<div class="gas-search"><input type="text" id="gas-blog-search" placeholder="' . esc_attr($search_label) . '"></div>';
        // Category tabs
        if ($cats) { echo '<div class="gas-bf"><a href="' . esc_url(remove_query_arg('blog_cat')) . '" class="gas-bl ' . (empty($cat) ? 'active' : '') . '">' . $all_label . '</a>'; foreach ($cats as $ct) echo '<a href="' . esc_url(add_query_arg('blog_cat', sanitize_title($ct))) . '" class="gas-bl ' . ($cat === sanitize_title($ct) ? 'active' : '') . '">' . esc_html($cat_labels[$ct] ?? $ct) . '</a>'; echo '</div>'; }
        // Post grid
        if (is_wp_error($posts) || empty($posts)) { echo '<p id="gas-blog-empty" style="text-align:center;padding:60px;color:' . $c['text_secondary'] . '">No posts found.</p>'; }
        else {
            echo '<div class="gas-bg" id="gas-blog-grid">';
            foreach ($posts as $p) {
                echo '<article class="gas-bc"><a href="' . esc_url(home_url('/blog/' . $p['slug'])) . '">';
                if (!empty($p['featured_image_url'])) echo '<img src="' . esc_url($p['featured_image_url']) . '" class="gas-bi" loading="lazy">';
                echo '<div class="gas-bo"><div class="gas-bm">';
                if (!empty($p['category'])) echo '<span class="gas-bb">' . esc_html($p['category_label'] ?? $p['category']) . '</span>';
                if (!empty($p['published_at'])) echo '<span>' . date('M j, Y', strtotime($p['published_at'])) . '</span>';
                echo '</div><h3 class="gas-bn">' . esc_html($p['title']) . '</h3>';
                if (!empty($p['excerpt'])) echo '<p class="gas-bd">' . esc_html(wp_trim_words($p['excerpt'], 20)) . '</p>';
                echo '</div></a></article>';
            }
            echo '</div>';
        }
        // View More button
        echo '<div class="gas-vm-wrap" id="gas-vm-wrap"' . ($has_more ? '' : ' style="display:none"') . '><button class="gas-vm-btn" id="gas-vm-btn">' . esc_html($view_more_label) . '</button></div>';
        // AJAX pagination + search script
        echo '<script>
(function(){
  var grid = document.getElementById("gas-blog-grid");
  var btn = document.getElementById("gas-vm-btn");
  var wrap = document.getElementById("gas-vm-wrap");
  var searchInput = document.getElementById("gas-blog-search");
  var emptyMsg = document.getElementById("gas-blog-empty");
  var apiUrl = "' . $api_url . 'api/public/client/' . $client_id . '/blog";
  var perPage = ' . $per_page . ';
  var currentOffset = perPage;
  var currentCat = "' . esc_js($cat) . '";
  var lang = "' . esc_js($lang) . '";
  var propId = "' . $property_id . '";
  var blogBase = "' . esc_url(home_url('/blog/')) . '";
  var loading = false;
  var searchTimer = null;

  function buildCard(p) {
    var img = p.featured_image_url ? \'<img src="\' + p.featured_image_url + \'" class="gas-bi" loading="lazy">\' : "";
    var catBadge = p.category ? \'<span class="gas-bb">\' + (p.category_label || p.category) + "</span>" : "";
    var date = p.published_at ? \'<span>\' + new Date(p.published_at).toLocaleDateString("en-GB",{month:"short",day:"numeric",year:"numeric"}) + "</span>" : "";
    var excerpt = p.excerpt || "";
    if (excerpt.length > 120) excerpt = excerpt.substring(0, excerpt.lastIndexOf(" ", 120)) + "...";
    return \'<article class="gas-bc"><a href="\' + blogBase + p.slug + \'">\' + img + \'<div class="gas-bo"><div class="gas-bm">\' + catBadge + date + \'</div><h3 class="gas-bn">\' + p.title + "</h3>" + (excerpt ? \'<p class="gas-bd">\' + excerpt + "</p>" : "") + "</div></a></article>";
  }

  function fetchPosts(offset, search) {
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
    fetchPosts(currentOffset, search).then(function(data){
      if (data.posts && data.posts.length) {
        var html = "";
        data.posts.forEach(function(p){ html += buildCard(p); });
        grid.insertAdjacentHTML("beforeend", html);
        currentOffset += data.posts.length;
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
      fetchPosts(0, q).then(function(data){
        if (!grid) {
          // Grid did not exist on initial load (was empty) — create it
          grid = document.createElement("div");
          grid.id = "gas-blog-grid";
          grid.className = "gas-bg";
          var vmWrap = document.getElementById("gas-vm-wrap");
          vmWrap.parentNode.insertBefore(grid, vmWrap);
        }
        grid.innerHTML = "";
        if (data.posts && data.posts.length) {
          data.posts.forEach(function(p){ grid.insertAdjacentHTML("beforeend", buildCard(p)); });
          if (emptyMsg) emptyMsg.style.display = "none";
        } else {
          if (emptyMsg) { emptyMsg.style.display = ""; emptyMsg.textContent = q ? "No posts matching \\"" + q + "\\"" : "No posts found."; }
        }
        currentOffset = data.posts ? data.posts.length : 0;
        wrap.style.display = data.has_more ? "" : "none";
      });
    }, 350);
  });
})();
</script>';
        echo '</div>'; get_footer();
    }
    
    public function handle_single_post() {
        $slug = get_query_var('gas_blog_post'); if (!$slug) return;
        $post = $this->fetch_single($slug);
        if (!$post) { global $wp_query; $wp_query->set_404(); status_header(404); return; }
        $this->render_single($post); exit;
    }
    
    private function render_single($p) {
        $c = $this->get_colors(); $f = $this->get_fonts(); $hf = $this->font_css($f['heading']); $bf = $this->font_css($f['body']); get_header();
        $cr = intval($c['card_radius'] ?? 12).'px';
        echo '<style>.gas-sp{max-width:800px;margin:0 auto;padding:40px 20px;background:'.$c['bg'].';'.$bf.'}.gas-st{font-size:2.5rem;margin:0 0 15px;color:'.$c['text'].';'.$hf.'}.gas-sm{color:'.$c['text_secondary'].';margin-bottom:30px}.gas-si{width:100%;border-radius:'.$cr.';margin-bottom:30px}.gas-sc{font-size:1.1rem;line-height:1.8;color:'.$c['text'].'}.gas-sb{display:inline-block;margin-bottom:20px;color:'.$c['text_secondary'].';text-decoration:none}</style>';
        echo '<script type="application/ld+json">'.wp_json_encode(array('@context'=>'https://schema.org','@type'=>'Article','headline'=>$p['title'],'description'=>$p['excerpt']??'','image'=>$p['featured_image_url']??''),JSON_UNESCAPED_SLASHES).'</script>';
        $back_path = get_option('gas_blog_back_url', '') ?: get_option('gas_blog_page_url', '/blog/');
        $back_url = home_url('/'.trim($back_path, '/').'/');
        echo '<article class="gas-sp"><a href="'.esc_url($back_url).'" class="gas-sb">← Back</a>';
        if (!empty($p['category'])) echo ' <span style="background:'.$c['category_bg'].';color:'.$c['category_text'].';padding:4px 12px;border-radius:20px;font-size:.85rem">'.esc_html($p['category']).'</span>';
        echo '<h1 class="gas-st">'.esc_html($p['title']).'</h1><div class="gas-sm">'; if (!empty($p['published_at'])) echo date('F j, Y',strtotime($p['published_at'])); echo '</div>';
        if (!empty($p['featured_image_url'])) echo '<img src="'.esc_url($p['featured_image_url']).'" class="gas-si">';
        echo '<div class="gas-sc">'.wp_kses_post($p['content'] ?? '').'</div>';
        // Gallery images
        $gallery = $p['gallery_images'] ?? [];
        if (is_string($gallery)) { $gallery = json_decode($gallery, true) ?: []; }
        if (!empty($gallery) && is_array($gallery)) {
            $cols = count($gallery) === 1 ? '1fr' : 'repeat(2, 1fr)';
            echo '<div style="display:grid;grid-template-columns:'.$cols.';gap:12px;margin-top:30px;">';
            foreach ($gallery as $img) { echo '<img src="'.esc_url($img).'" style="width:100%;border-radius:'.$cr.';object-fit:cover;">'; }
            echo '</div>';
        }
        echo '</article>'; get_footer();
    }
    
    public function blog_shortcode($atts) {
        $atts = shortcode_atts(array('limit'=>'6','columns'=>'3','category'=>''),$atts);
        $c = $this->get_colors();
        $posts = $this->fetch_posts(array('limit'=>$atts['limit'],'category'=>$atts['category']));
        if (is_wp_error($posts) || empty($posts)) return '<p>No posts found.</p>';
        $h = '<style>.gas-sc-bc:hover{transform:translateY(-4px)!important}@media(max-width:900px){.gas-sc-bg{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:600px){.gas-sc-bg{grid-template-columns:1fr!important}}</style><div class="gas-sc-bg" style="display:grid;gap:30px;grid-template-columns:repeat('.$atts['columns'].',1fr)">';
        $cr = intval($c['card_radius'] ?? 12).'px';
        foreach ($posts as $p) { $h .= '<article class="gas-sc-bc" style="background:'.$c['card_bg'].';border-radius:'.$cr.';overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:all .2s"><a href="'.esc_url(home_url('/blog/'.$p['slug'])).'" style="text-decoration:none;color:inherit;display:block">'; if (!empty($p['featured_image_url'])) $h .= '<img src="'.esc_url($p['featured_image_url']).'" style="width:100%;height:200px;object-fit:cover">'; $h .= '<div style="padding:14px 16px 16px"><h3 style="margin:0 0 6px;font-size:1.1rem;color:'.$c['text'].'">'.esc_html($p['title']).'</h3>'; if (!empty($p['excerpt'])) $h .= '<p style="color:'.$c['text_secondary'].';margin:0;font-size:0.9rem;line-height:1.5">'.esc_html(wp_trim_words($p['excerpt'],20)).'</p>'; $h .= '</div></a></article>'; }
        return $h.'</div>';
    }
    
    public function featured_shortcode($atts) { return $this->blog_shortcode(array('limit'=>'3','columns'=>'3')); }
    
    public function categories_shortcode($atts) {
        $c = $this->get_colors();
        $posts = $this->fetch_posts(array('limit'=>100));
        if (is_wp_error($posts) || empty($posts)) return '';
        $cats = array(); foreach ($posts as $p) if (!empty($p['category']) && !in_array($p['category'],$cats)) $cats[] = $p['category'];
        if (!$cats) return '';
        $cur = isset($_GET['blog_cat']) ? sanitize_text_field($_GET['blog_cat']) : '';
        $h = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:30px"><a href="'.esc_url(remove_query_arg('blog_cat')).'" style="padding:8px 16px;background:'.(empty($cur)?$c['accent'].';color:#fff':'#f3f4f6;color:#374151').';border-radius:20px;text-decoration:none">All</a>';
        foreach ($cats as $ct) $h .= '<a href="'.esc_url(add_query_arg('blog_cat',sanitize_title($ct))).'" style="padding:8px 16px;background:'.($cur===sanitize_title($ct)?$c['accent'].';color:#fff':'#f3f4f6;color:#374151').';border-radius:20px;text-decoration:none">'.esc_html($ct).'</a>';
        return $h.'</div>';
    }
}

GAS_Blog::get_instance();
register_activation_hook(__FILE__, function() { GAS_Blog::get_instance()->add_rewrite_rules(); flush_rewrite_rules(); });
register_deactivation_hook(__FILE__, 'flush_rewrite_rules');
