<?php
/**
 * Plugin Name: GAS Reviews
 * Plugin URI: https://gas.travel
 * Description: Display guest reviews from Repuso/The Reviews Place or GAS internal reviews with Review schema markup. Colors controlled via GAS Admin.
 * Version: 1.0.0
 * Author: GAS - Guest Accommodation System
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) exit;
define('GAS_REVIEWS_DEFAULT_API_URL', 'https://admin.gas.travel');

add_action('init', function() {
    add_shortcode('gas_reviews', array(GAS_Reviews::get_instance(), 'reviews_shortcode'));
    add_shortcode('gas_reviews_summary', array(GAS_Reviews::get_instance(), 'summary_shortcode'));
}, 1);

class GAS_Reviews {
    private static $instance = null;
    private $colors_cache = null;
    private $settings_cache = null;

    public static function get_instance() { if (null === self::$instance) self::$instance = new self(); return self::$instance; }

    private function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_ajax_gas_reviews_clear_colors', array($this, 'clear_colors_cache'));
    }

    private function get_api_url() { return get_option('gas_reviews_api_url', '') ?: GAS_REVIEWS_DEFAULT_API_URL; }

    private function get_client_id() { return get_option('gas_reviews_client_id') ?: get_option('gas_client_id', ''); }

    private function get_lang() {
        if (!empty($_GET['lang'])) return sanitize_text_field($_GET['lang']);
        if (!empty($_COOKIE['gas_lang'])) return sanitize_text_field($_COOKIE['gas_lang']);
        return 'en';
    }

    private function get_colors() {
        if ($this->colors_cache !== null) return $this->colors_cache;
        $cached = get_transient('gas_reviews_colors');
        if ($cached !== false) { $this->colors_cache = $cached; return $cached; }

        $defaults = array('accent'=>'#667eea','bg'=>'#ffffff','card_bg'=>'#ffffff','text'=>'#1e293b','text_secondary'=>'#64748b','star'=>'#fbbf24');
        $client_id = $this->get_client_id();
        if ($client_id) {
            $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/app-settings/reviews';
            $response = wp_remote_get($url, array('timeout'=>10));
            if (!is_wp_error($response)) {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                if ($body && $body['success'] && !empty($body['colors'])) {
                    $colors = wp_parse_args($body['colors'], $defaults);
                    set_transient('gas_reviews_colors', $colors, HOUR_IN_SECONDS);
                    $this->colors_cache = $colors;
                    return $colors;
                }
            }
        }
        $this->colors_cache = $defaults;
        return $defaults;
    }

    private function get_app_settings() {
        if ($this->settings_cache !== null) return $this->settings_cache;
        $cached = get_transient('gas_reviews_app_settings');
        if ($cached !== false) { $this->settings_cache = $cached; return $cached; }

        $defaults = array('repuso_widget_id' => '');
        $client_id = $this->get_client_id();
        if ($client_id) {
            $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/app-settings/reviews';
            $response = wp_remote_get($url, array('timeout'=>10));
            if (!is_wp_error($response)) {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                if ($body && $body['success']) {
                    $settings = array('repuso_widget_id' => $body['repuso_widget_id'] ?? '');
                    set_transient('gas_reviews_app_settings', $settings, HOUR_IN_SECONDS);
                    $this->settings_cache = $settings;
                    return $settings;
                }
            }
        }
        $this->settings_cache = $defaults;
        return $defaults;
    }

    private function get_fonts() {
        $cached = get_transient('gas_reviews_fonts');
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
            $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/app-settings/reviews';
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
                    set_transient('gas_reviews_fonts', $fonts, HOUR_IN_SECONDS);
                    return $fonts;
                }
            }
        }
        return $defaults;
    }

    public function clear_colors_cache() {
        delete_transient('gas_reviews_colors');
        delete_transient('gas_reviews_fonts');
        delete_transient('gas_reviews_app_settings');
        wp_send_json_success();
    }

    // ── Admin menu ──
    public function add_admin_menu() {
        add_options_page('GAS Reviews', 'GAS Reviews', 'manage_options', 'gas-reviews', array($this, 'settings_page'));
    }

    public function register_settings() {
        register_setting('gas_reviews_settings', 'gas_reviews_api_url');
        register_setting('gas_reviews_settings', 'gas_reviews_client_id');
    }

    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>GAS Reviews Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('gas_reviews_settings'); ?>
                <table class="form-table">
                    <tr><th>API URL</th><td><input type="text" name="gas_reviews_api_url" value="<?php echo esc_attr(get_option('gas_reviews_api_url', '')); ?>" class="regular-text" placeholder="https://admin.gas.travel"></td></tr>
                    <tr><th>Client ID</th><td><input type="text" name="gas_reviews_client_id" value="<?php echo esc_attr(get_option('gas_reviews_client_id', '')); ?>" class="regular-text" placeholder="Falls back to gas_client_id"></td></tr>
                </table>
                <?php submit_button(); ?>
            </form>
            <hr>
            <button class="button" onclick="jQuery.post(ajaxurl,{action:'gas_reviews_clear_colors'},function(){alert('Cache cleared!')});">Clear Color/Settings Cache</button>
        </div>
        <?php
    }

    // ── Helper: render stars ──
    private function render_stars($rating, $max = 5, $star_color = '#fbbf24') {
        $full = floor($rating);
        $half = ($rating - $full) >= 0.25 ? 1 : 0;
        $empty = $max - $full - $half;
        $html = '';
        for ($i = 0; $i < $full; $i++) $html .= '<span style="color:' . esc_attr($star_color) . ';">&#9733;</span>';
        if ($half) $html .= '<span style="color:' . esc_attr($star_color) . ';opacity:0.5;">&#9733;</span>';
        for ($i = 0; $i < $empty; $i++) $html .= '<span style="color:#d1d5db;">&#9733;</span>';
        return $html;
    }

    // ── Main reviews shortcode ──
    public function reviews_shortcode($atts) {
        $atts = shortcode_atts(array(
            'limit' => 12,
            'columns' => 3,
            'widget_id' => '',
            'room_id' => '',
            'card_bg' => '',
            'text_color' => '',
            'star_color' => '',
            'layout' => 'grid',
            'card_radius' => '12',
        ), $atts, 'gas_reviews');

        $colors = $this->get_colors();
        // Allow shortcode attribute overrides for Pro Builder integration
        if (!empty($atts['card_bg'])) $colors['card_bg'] = $atts['card_bg'];
        if (!empty($atts['text_color'])) { $colors['text'] = $atts['text_color']; $colors['text_secondary'] = $atts['text_color']; }
        if (!empty($atts['star_color'])) $colors['star'] = $atts['star_color'];
        $fonts = $this->get_fonts();
        $api_url = $this->get_api_url();
        $client_id = $this->get_client_id();
        $lang = $this->get_lang();

        if (empty($client_id)) {
            return '<p style="text-align:center;color:#64748b;padding:40px;">GAS Reviews: No client ID configured.</p>';
        }

        // Determine widget ID: shortcode attr > app settings > empty
        $widget_id = $atts['widget_id'];
        if (empty($widget_id)) {
            $settings = $this->get_app_settings();
            $widget_id = $settings['repuso_widget_id'];
        }

        $accent = esc_attr($colors['accent']);
        $bg = esc_attr($colors['bg']);
        $card_bg = esc_attr($colors['card_bg']);
        $text = esc_attr($colors['text']);
        $text2 = esc_attr($colors['text_secondary']);
        $star_color = esc_attr($colors['star']);
        $heading_font = esc_attr($fonts['heading']);
        $body_font = esc_attr($fonts['body']);
        $limit = intval($atts['limit']);
        $room_id = sanitize_text_field($atts['room_id']);
        $uid = 'gas-reviews-' . wp_rand(1000, 9999);

        $layout = sanitize_text_field($atts['layout']);
        $card_radius = intval($atts['card_radius']);

        ob_start();
        ?>
        <div class="gas-reviews-wrap" style="background:<?php echo $bg; ?>; font-family:<?php echo $body_font; ?>;">
            <style>
                .gas-reviews-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:20px; max-width:1200px; margin:0 auto; padding:0 20px; }
                .gas-reviews-slider-wrap { position:relative; overflow:hidden; padding:0 60px; max-width:1200px; margin:0 auto; }
                .gas-reviews-slider { display:flex; transition:transform 0.5s ease; }
                .gas-reviews-slider > div { flex:0 0 25%; min-width:260px; padding:0 8px; box-sizing:border-box; }
                .gas-review-nav { position:absolute; top:50%; transform:translateY(-50%); width:44px; height:44px; border-radius:50%; background:<?php echo $star_color; ?>; border:2px solid <?php echo $star_color; ?>; cursor:pointer; font-size:20px; color:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.15); z-index:10; transition:all 0.3s; }
                .gas-review-nav:hover { background:<?php echo $card_bg; ?>; color:<?php echo $star_color; ?>; }
                .gas-review-nav.prev { left:0; }
                .gas-review-nav.next { right:0; }
                .gas-review-card { background:<?php echo $card_bg; ?>; border-radius:<?php echo $card_radius; ?>px; padding:24px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid rgba(0,0,0,0.06); }
                .gas-review-slider-card { background:<?php echo $card_bg; ?>; border-radius:<?php echo $card_radius; ?>px; padding:20px; height:260px; display:flex; flex-direction:column; border:1px solid rgba(255,255,255,0.08); }
                .gas-review-header { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
                .gas-review-avatar { width:44px; height:44px; border-radius:50%; background:<?php echo $accent; ?>15; display:flex; align-items:center; justify-content:center; font-size:1.1rem; font-weight:700; color:<?php echo $accent; ?>; flex-shrink:0; }
                .gas-review-meta { flex:1; }
                .gas-review-name { font-weight:600; color:<?php echo $text; ?>; font-size:0.95rem; font-family:<?php echo $heading_font; ?>; }
                .gas-review-date { font-size:0.8rem; color:<?php echo $text2; ?>; }
                .gas-review-stars { font-size:1.1rem; letter-spacing:1px; margin-bottom:10px; }
                .gas-review-text { font-size:0.9rem; line-height:1.7; color:<?php echo $text; ?>; }
                .gas-review-source { display:inline-block; font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; padding:3px 8px; border-radius:4px; background:<?php echo $accent; ?>10; color:<?php echo $accent; ?>; margin-top:10px; }
                .gas-reviews-loading { text-align:center; padding:60px 20px; color:<?php echo $text2; ?>; }
                @media (max-width:768px) { .gas-reviews-grid { grid-template-columns:1fr; } .gas-reviews-slider > div { flex:0 0 100%; min-width:100%; } .gas-reviews-slider-wrap { padding:0 40px; } }
                @media (max-width:1024px) and (min-width:769px) { .gas-reviews-slider > div { flex:0 0 50%; } }
            </style>
            <?php if ($layout === 'slider') : ?>
            <div class="gas-reviews-slider-wrap">
                <div class="gas-reviews-slider" id="<?php echo esc_attr($uid); ?>">
                    <div class="gas-reviews-loading">Loading reviews...</div>
                </div>
                <button class="gas-review-nav prev" onclick="gasRevSlide_<?php echo esc_attr($uid); ?>(-1)">&#8249;</button>
                <button class="gas-review-nav next" onclick="gasRevSlide_<?php echo esc_attr($uid); ?>(1)">&#8250;</button>
            </div>
            <?php else : ?>
            <div class="gas-reviews-grid" id="<?php echo esc_attr($uid); ?>">
                <div class="gas-reviews-loading" style="grid-column:1/-1;">Loading reviews...</div>
            </div>
            <?php endif; ?>
        </div>
        <script>
        (function(){
            var containerId = <?php echo json_encode($uid); ?>;
            var apiUrl = <?php echo json_encode(esc_url($api_url)); ?>;
            var widgetId = <?php echo json_encode($widget_id); ?>;
            var roomId = <?php echo json_encode($room_id); ?>;
            var limit = <?php echo $limit; ?>;
            var starColor = <?php echo json_encode($star_color); ?>;
            var layout = <?php echo json_encode($layout); ?>;
            var cardRadius = <?php echo json_encode($card_radius); ?>;

            var fetchUrl = '';
            if (widgetId) {
                fetchUrl = apiUrl + '/api/public/repuso-reviews?widget_id=' + encodeURIComponent(widgetId) + '&limit=' + limit;
            } else if (roomId) {
                fetchUrl = apiUrl + '/api/public/rooms/' + encodeURIComponent(roomId) + '/reviews?limit=' + limit;
            } else {
                document.getElementById(containerId).innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#64748b;padding:40px;">No review source configured. Set a Repuso Widget ID in GAS Admin or pass widget_id/room_id attribute.</p>';
                return;
            }

            function renderStars(rating, max) {
                max = max || 5;
                var scale = (rating > 5) ? 10 : 5;
                var normalized = (rating / scale) * 5;
                var full = Math.floor(normalized);
                var half = (normalized - full) >= 0.25 ? 1 : 0;
                var empty = 5 - full - half;
                var s = '';
                for (var i=0;i<full;i++) s += '<span style="color:'+starColor+';">&#9733;</span>';
                if (half) s += '<span style="color:'+starColor+';opacity:0.5;">&#9733;</span>';
                for (var i=0;i<empty;i++) s += '<span style="color:#d1d5db;">&#9733;</span>';
                return s;
            }

            function formatDate(d) {
                if (!d) return '';
                var dt = new Date(d);
                return dt.toLocaleDateString(undefined, {year:'numeric',month:'short',day:'numeric'});
            }

            fetch(fetchUrl)
                .then(function(r){ return r.json(); })
                .then(function(data){
                    var container = document.getElementById(containerId);
                    var reviews = data.reviews || [];
                    if (reviews.length === 0) {
                        container.innerHTML = '<p style="text-align:center;color:#64748b;padding:40px;">No reviews yet.</p>';
                        return;
                    }
                    var html = '';

                    if (layout === 'slider') {
                        // Slider layout — horizontal scrolling cards
                        reviews.forEach(function(r){
                            var name = r.reviewer_name || r.guest_name || 'Guest';
                            var rating = r.rating || 5;
                            var ratingScale = r.rating_scale || 5;
                            var text = r.text || r.comment || '';
                            var source = r.source || r.channel_name || '';
                            if (text.length > 160) text = text.substring(0, 157) + '...';
                            html += '<div><div class="gas-review-slider-card">';
                            html += '<div class="gas-review-stars" style="margin-bottom:10px;">' + renderStars(rating, ratingScale) + '</div>';
                            html += '<p style="flex:1;margin:0 0 12px;overflow:hidden;opacity:0.9;font-size:0.95rem;line-height:1.6;">&ldquo;' + text + '&rdquo;</p>';
                            html += '<div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;margin-top:auto;">';
                            html += '<div style="font-weight:600;font-size:14px;">' + name + '</div>';
                            if (source) html += '<div style="font-size:12px;opacity:0.6;margin-top:2px;">' + source + '</div>';
                            html += '</div></div></div>';
                        });
                        container.innerHTML = html;
                        // Auto-slide
                        var pos = 0;
                        var total = reviews.length;
                        var visible = window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : window.innerWidth < 1280 ? 3 : 4;
                        var max = Math.max(0, total - visible);
                        window['gasRevSlide_' + containerId] = function(dir) {
                            pos = Math.max(0, Math.min(max, pos + dir));
                            container.style.transform = 'translateX(-' + (pos * (100 / total)) + '%)';
                        };
                        setInterval(function() { pos = pos >= max ? 0 : pos + 1; container.style.transform = 'translateX(-' + (pos * (100 / total)) + '%)'; }, 5000);
                    } else {
                        // Grid layout — card grid
                        reviews.forEach(function(r){
                            var name = r.reviewer_name || r.guest_name || 'Guest';
                            var initial = name.charAt(0).toUpperCase();
                            var rating = r.rating || 0;
                            var ratingScale = r.rating_scale || 5;
                            var text = r.text || r.comment || '';
                            var source = r.source || r.channel_name || '';
                            var date = r.date || r.review_date || '';
                            if (text.length > 250) text = text.substring(0, 247) + '...';
                            html += '<div class="gas-review-card" itemscope itemtype="https://schema.org/Review">';
                            html += '<div class="gas-review-header">';
                            html += '<div class="gas-review-avatar">' + initial + '</div>';
                            html += '<div class="gas-review-meta">';
                            html += '<div class="gas-review-name" itemprop="author">' + name + '</div>';
                            if (date) html += '<div class="gas-review-date">' + formatDate(date) + '</div>';
                            html += '</div></div>';
                            if (rating > 0) html += '<div class="gas-review-stars">' + renderStars(rating, ratingScale) + '</div>';
                            if (text) html += '<div class="gas-review-text" itemprop="reviewBody">' + text + '</div>';
                            if (source) html += '<span class="gas-review-source">' + source + '</span>';
                            html += '</div>';
                        });
                        container.innerHTML = html;
                    }
                })
                .catch(function(e){
                    document.getElementById(containerId).innerHTML = '<p style="text-align:center;color:#ef4444;padding:40px;">Error loading reviews.</p>';
                });
        })();
        </script>
        <?php
        return ob_get_clean();
    }

    // ── Summary shortcode (average rating + count) ──
    public function summary_shortcode($atts) {
        $atts = shortcode_atts(array('widget_id' => '', 'room_id' => ''), $atts, 'gas_reviews_summary');
        $colors = $this->get_colors();
        $api_url = $this->get_api_url();
        $client_id = $this->get_client_id();

        if (empty($client_id)) return '';

        $widget_id = $atts['widget_id'];
        if (empty($widget_id)) {
            $settings = $this->get_app_settings();
            $widget_id = $settings['repuso_widget_id'];
        }

        $accent = esc_attr($colors['accent']);
        $star_color = esc_attr($colors['star']);
        $text = esc_attr($colors['text']);
        $room_id = sanitize_text_field($atts['room_id']);
        $uid = 'gas-reviews-summary-' . wp_rand(1000, 9999);

        ob_start();
        ?>
        <div id="<?php echo esc_attr($uid); ?>" style="text-align:center;padding:20px;"></div>
        <script>
        (function(){
            var containerId = <?php echo json_encode($uid); ?>;
            var apiUrl = <?php echo json_encode(esc_url($api_url)); ?>;
            var widgetId = <?php echo json_encode($widget_id); ?>;
            var roomId = <?php echo json_encode($room_id); ?>;
            var starColor = <?php echo json_encode($star_color); ?>;
            var textColor = <?php echo json_encode($text); ?>;

            var fetchUrl = '';
            if (widgetId) {
                fetchUrl = apiUrl + '/api/public/repuso-reviews?widget_id=' + encodeURIComponent(widgetId) + '&limit=30';
            } else if (roomId) {
                fetchUrl = apiUrl + '/api/public/rooms/' + encodeURIComponent(roomId) + '/reviews?limit=100';
            } else { return; }

            fetch(fetchUrl)
                .then(function(r){ return r.json(); })
                .then(function(data){
                    var reviews = data.reviews || [];
                    if (reviews.length === 0) return;
                    var total = 0;
                    reviews.forEach(function(r){
                        var rating = r.rating || 0;
                        var scale = r.rating_scale || (rating > 5 ? 10 : 5);
                        total += (rating / scale) * 5;
                    });
                    var avg = total / reviews.length;
                    var container = document.getElementById(containerId);
                    var stars = '';
                    for (var i=1;i<=5;i++) {
                        stars += '<span style="font-size:1.5rem;color:' + (i <= Math.round(avg) ? starColor : '#d1d5db') + ';">&#9733;</span>';
                    }
                    container.innerHTML = '<div style="font-size:2.5rem;font-weight:700;color:'+textColor+';">' + avg.toFixed(1) + '</div>' + stars + '<div style="color:#64748b;font-size:0.9rem;margin-top:6px;">' + reviews.length + ' review' + (reviews.length !== 1 ? 's' : '') + '</div>';
                })
                .catch(function(){});
        })();
        </script>
        <?php
        return ob_get_clean();
    }
}
