<?php
/**
 * Plugin Name: GAS Shop
 * Plugin URI: https://gas.travel
 * Description: Online shop for GAS clients — services and digital products with Stripe checkout.
 * Version: 1.0.0
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
define('GAS_SHOP_DEFAULT_API_URL', 'https://admin.gas.travel');

add_action('init', function() {
    add_shortcode('gas_shop', array(GAS_Shop::get_instance(), 'shop_shortcode'));
}, 1);

class GAS_Shop {
    private static $instance = null;
    private $colors_cache = null;

    public static function get_instance() { if (null === self::$instance) self::$instance = new self(); return self::$instance; }

    private function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('init', array($this, 'add_rewrite_rules'));
        add_filter('query_vars', array($this, 'add_query_vars'));
        add_action('template_redirect', array($this, 'handle_shop_page'), 1);
        add_action('template_redirect', array($this, 'handle_single_product'), 2);
        add_action('template_redirect', array($this, 'handle_cart'), 3);
        add_action('template_redirect', array($this, 'handle_checkout'), 4);
        add_action('template_redirect', array($this, 'handle_thank_you'), 5);
        add_action('wp_ajax_gas_shop_clear_colors', array($this, 'clear_colors_cache'));
    }

    private function get_api_url() { return get_option('gas_shop_api_url', '') ?: GAS_SHOP_DEFAULT_API_URL; }

    private function get_colors() {
        if ($this->colors_cache !== null) return $this->colors_cache;
        $cached = get_transient('gas_shop_colors');
        if ($cached !== false) { $this->colors_cache = $cached; return $cached; }

        $defaults = array('accent'=>'#10b981','bg'=>'#ffffff','card_bg'=>'#ffffff','text'=>'#1a1a1a','text_secondary'=>'#666666','category_bg'=>'#d1fae5','category_text'=>'#065f46','card_radius'=>'12','btn_radius'=>'24','placeholder_bg'=>'#f1f5f9','placeholder_fg'=>'#94a3b8');
        $client_id = get_option('gas_shop_client_id') ?: get_option('gas_client_id', '');
        if ($client_id) {
            $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/app-settings/shop';
            $response = wp_remote_get($url, array('timeout'=>10));
            if (!is_wp_error($response)) {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                if ($body && $body['success'] && !empty($body['colors'])) {
                    $colors = wp_parse_args($body['colors'], $defaults);
                    set_transient('gas_shop_colors', $colors, 5 * MINUTE_IN_SECONDS);
                    $this->colors_cache = $colors;
                    return $colors;
                }
            }
        }
        $this->colors_cache = $defaults;
        return $defaults;
    }

    public function clear_colors_cache() { delete_transient('gas_shop_colors'); delete_transient('gas_shop_fonts'); wp_send_json_success(); }

    private function get_fonts() {
        $cached = get_transient('gas_shop_fonts');
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

        $client_id = get_option('gas_shop_client_id') ?: get_option('gas_client_id', '');
        if ($client_id) {
            $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/app-settings/shop';
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
                    set_transient('gas_shop_fonts', $fonts, 5 * MINUTE_IN_SECONDS);
                    return $fonts;
                }
            }
        }

        set_transient('gas_shop_fonts', $defaults, HOUR_IN_SECONDS);
        return $defaults;
    }

    private function font_css($font) {
        return ($font && $font !== 'inherit') ? 'font-family:'.$font.' !important;' : '';
    }

    private function get_current_language() {
        if (isset($_GET['lang']) && preg_match('/^[a-z]{2}$/', $_GET['lang'])) return sanitize_text_field($_GET['lang']);
        if (isset($_COOKIE['gas_lang']) && preg_match('/^[a-z]{2}$/', $_COOKIE['gas_lang'])) return sanitize_text_field($_COOKIE['gas_lang']);
        return 'en';
    }

    // ── Admin settings page ──
    public function add_admin_menu() { add_options_page('GAS Shop', 'GAS Shop', 'manage_options', 'gas-shop', array($this, 'settings_page')); }
    public function register_settings() { foreach (array('api_url','client_id','page_url') as $s) register_setting('gas_shop_settings', 'gas_shop_'.$s); }

    public function settings_page() {
        $c = $this->get_colors(); ?>
        <div class="wrap">
            <h1>🛒 GAS Shop</h1>
            <?php $this->test_connection(); ?>
            <form method="post" action="options.php">
                <?php settings_fields('gas_shop_settings'); ?>
                <table class="form-table">
                    <tr><th>API URL</th><td><input type="url" name="gas_shop_api_url" value="<?php echo esc_attr(get_option('gas_shop_api_url','')); ?>" class="regular-text" placeholder="<?php echo GAS_SHOP_DEFAULT_API_URL; ?>"/></td></tr>
                    <tr><th>Client ID</th><td><input type="text" name="gas_shop_client_id" value="<?php echo esc_attr(get_option('gas_shop_client_id')); ?>" class="regular-text"/></td></tr>
                    <tr><th>Shop Page URL</th><td><input type="text" name="gas_shop_page_url" value="<?php echo esc_attr(get_option('gas_shop_page_url','/shop/')); ?>" class="regular-text"/></td></tr>
                </table>
                <h2>Colors (from GAS Admin)</h2>
                <p class="description">Manage colors in GAS Admin. <a href="<?php echo admin_url('admin-ajax.php?action=gas_shop_clear_colors'); ?>" onclick="event.preventDefault();fetch(this.href).then(()=>location.reload());">Refresh colors</a></p>
                <table class="form-table">
                    <tr><th>Accent</th><td><span style="display:inline-block;width:24px;height:24px;background:<?php echo esc_attr($c['accent']); ?>;border-radius:4px;vertical-align:middle;margin-right:8px;border:1px solid #ccc;"></span><?php echo esc_html($c['accent']); ?></td></tr>
                    <tr><th>Background</th><td><span style="display:inline-block;width:24px;height:24px;background:<?php echo esc_attr($c['bg']); ?>;border-radius:4px;vertical-align:middle;margin-right:8px;border:1px solid #ccc;"></span><?php echo esc_html($c['bg']); ?></td></tr>
                    <tr><th>Text</th><td><span style="display:inline-block;width:24px;height:24px;background:<?php echo esc_attr($c['text']); ?>;border-radius:4px;vertical-align:middle;margin-right:8px;border:1px solid #ccc;"></span><?php echo esc_html($c['text']); ?></td></tr>
                </table>
                <h2>Shortcodes</h2>
                <p><code>[gas_shop limit="6" columns="3"]</code></p>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    private function test_connection() {
        $id = get_option('gas_shop_client_id') ?: get_option('gas_client_id', '');
        if (!$id) { echo '<div class="notice notice-warning"><p>Enter Client ID</p></div>'; return; }
        $products = $this->fetch_products();
        echo is_wp_error($products) ? '<div class="notice notice-error"><p>Connection failed</p></div>' : '<div class="notice notice-success"><p>Connected ('.count($products).' products)</p></div>';
    }

    // ── API calls ──
    public function fetch_products($args = array()) {
        $client_id = get_option('gas_shop_client_id') ?: get_option('gas_client_id', '');
        if (!$client_id) return new WP_Error('no_config', 'No client ID');
        $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/shop/products';
        $response = wp_remote_get($url, array('timeout'=>15));
        if (is_wp_error($response)) return $response;
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!$body || !$body['success']) return new WP_Error('api_error', 'Shop not available');
        return $body['products'] ?? array();
    }

    public function fetch_single($slug) {
        $client_id = get_option('gas_shop_client_id') ?: get_option('gas_client_id', '');
        if (!$client_id) return null;
        $url = trailingslashit($this->get_api_url()).'api/public/client/'.$client_id.'/shop/products/'.urlencode($slug);
        $r = wp_remote_get($url, array('timeout'=>15));
        if (is_wp_error($r)) return null;
        $body = json_decode(wp_remote_retrieve_body($r), true);
        return ($body && $body['success']) ? ($body['product'] ?? null) : null;
    }

    // ── Rewrite rules ──
    public function add_rewrite_rules() {
        add_rewrite_rule('^shop/cart/?$', 'index.php?gas_shop_action=cart', 'top');
        add_rewrite_rule('^shop/checkout/?$', 'index.php?gas_shop_action=checkout', 'top');
        add_rewrite_rule('^shop/thank-you/?$', 'index.php?gas_shop_action=thank_you', 'top');
        add_rewrite_rule('^shop/([^/]+)/?$', 'index.php?gas_shop_product=$matches[1]', 'top');
    }
    public function add_query_vars($v) { $v[] = 'gas_shop_product'; $v[] = 'gas_shop_action'; return $v; }

    // ── Route handlers ──
    public function handle_shop_page() {
        $page = '/'.trim(get_option('gas_shop_page_url', '/shop/'), '/').'/';
        $path = '/'.trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/').'/';
        if ($path === $page && !get_query_var('gas_shop_product') && !get_query_var('gas_shop_action')) {
            $this->render_listing();
            exit;
        }
    }

    public function handle_single_product() {
        $slug = get_query_var('gas_shop_product');
        if (!$slug) return;
        // Skip cart/checkout/thank-you — those are actions, not product slugs
        if (in_array($slug, array('cart', 'checkout', 'thank-you'))) return;
        $product = $this->fetch_single($slug);
        if (!$product) { global $wp_query; $wp_query->set_404(); status_header(404); return; }
        $this->render_single($product);
        exit;
    }

    public function handle_cart() {
        if (get_query_var('gas_shop_action') !== 'cart') return;
        $this->render_cart();
        exit;
    }

    public function handle_checkout() {
        if (get_query_var('gas_shop_action') !== 'checkout') return;
        $this->render_checkout();
        exit;
    }

    public function handle_thank_you() {
        if (get_query_var('gas_shop_action') !== 'thank_you') return;
        $this->render_thank_you();
        exit;
    }

    // ── Shared CSS ──
    private function base_css() {
        $c = $this->get_colors();
        $f = $this->get_fonts();
        $hf = $this->font_css($f['heading']);
        $bf = $this->font_css($f['body']);
        $cr = intval($c['card_radius'] ?? 12).'px';
        $br = intval($c['btn_radius'] ?? 24).'px';
        return '<style>
.gas-shop-wrap{max-width:1200px;margin:0 auto;padding:120px 20px 40px;background:'.$c['bg'].';min-height:60vh;'.$bf.'}
.gas-shop-title{font-size:2.5rem;margin:0 0 10px;color:'.$c['text'].';'.$hf.'}
.gas-shop-sub{color:'.$c['text_secondary'].';margin:0 0 30px}
.gas-shop-grid{display:grid;gap:30px;grid-template-columns:repeat(3,1fr)}
.gas-shop-card{background:'.$c['card_bg'].';border-radius:'.$cr.';overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:all .2s}
.gas-shop-card:hover{transform:translateY(-4px);box-shadow:0 8px 25px rgba(0,0,0,0.12)}
.gas-shop-card a{text-decoration:none;color:inherit;display:block}
.gas-shop-img{width:100%;height:220px;object-fit:cover;border-radius:'.$cr.' '.$cr.' 0 0}
.gas-shop-card-body{padding:20px}
.gas-shop-card-name{margin:0 0 8px;font-size:1.15rem;color:'.$c['text'].';'.$hf.'}
.gas-shop-card-desc{color:'.$c['text_secondary'].';font-size:.9rem;margin:0 0 12px;line-height:1.5}
.gas-shop-card-price{font-size:1.25rem;font-weight:700;color:'.$c['accent'].'}
.gas-shop-cat{background:'.$c['category_bg'].';color:'.$c['category_text'].';padding:2px 10px;border-radius:'.$br.';font-size:.8rem;margin-right:8px}
.gas-shop-btn{display:inline-block;padding:10px 24px;background:'.$c['accent'].';color:#fff;border:none;border-radius:'.$br.';font-size:1rem;cursor:pointer;text-decoration:none;transition:opacity .2s;'.$bf.'}
.gas-shop-btn:hover{opacity:.85}
.gas-shop-filter{padding:8px 16px;border-radius:'.$br.';text-decoration:none;cursor:pointer;transition:all .2s}
.gas-shop-filter.active{background:'.$c['accent'].';color:#fff}
.gas-shop-filter:not(.active){background:'.$c['category_bg'].';color:'.$c['category_text'].'}
.gas-shop-back{display:inline-block;margin-bottom:20px;color:'.$c['text_secondary'].';text-decoration:none}
@media(max-width:900px){.gas-shop-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.gas-shop-grid{grid-template-columns:1fr}}
</style>';
    }

    // ── Product listing ──
    private function render_listing() {
        $c = $this->get_colors();
        $products = $this->fetch_products();
        if (is_wp_error($products)) $products = array();
        $lang = $this->get_current_language();

        get_header();
        echo $this->base_css();
        echo '<div class="gas-shop-wrap">';
        echo '<h1 class="gas-shop-title">Shop</h1>';
        echo '<p class="gas-shop-sub">Browse our products and services</p>';

        if (empty($products)) {
            echo '<p style="text-align:center;padding:60px;color:'.$c['text_secondary'].'">No products available.</p>';
        } else {
            // Category filter
            $cats = array();
            foreach ($products as $p) { if (!empty($p['category']) && !in_array($p['category'], $cats)) $cats[] = $p['category']; }
            if ($cats) {
                echo '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">';
                echo '<a href="#" class="gas-shop-filter active" data-cat="">All</a>';
                foreach ($cats as $ct) {
                    echo '<a href="#" class="gas-shop-filter" data-cat="'.esc_attr($ct).'">'.esc_html($ct).'</a>';
                }
                echo '</div>';
            }

            echo '<div class="gas-shop-grid" id="gas-shop-grid">';
            foreach ($products as $p) {
                $name = $this->ml_text($p, 'name', $lang);
                $desc = $this->ml_text($p, 'description', $lang);
                $price = number_format((float)$p['price'], 2);
                $curr = $p['currency'] ?? 'EUR';
                $cat_attr = !empty($p['category']) ? esc_attr($p['category']) : '';
                echo '<article class="gas-shop-card" data-category="'.$cat_attr.'">';
                echo '<a href="'.esc_url(home_url('/shop/'.$p['slug'])).'">';
                if (!empty($p['image_url'])) echo '<img src="'.esc_url($p['image_thumbnail_url'] ?: $p['image_url']).'" class="gas-shop-img" loading="lazy" alt="'.esc_attr($name).'">';
                else { $phBg = $c['placeholder_bg'] ?? '#f1f5f9'; $phFg = $c['placeholder_fg'] ?? '#94a3b8'; echo '<div class="gas-shop-img" style="background:'.$phBg.';display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="'.$phFg.'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><span style="color:'.$phFg.';font-size:0.95rem;font-weight:500">'.esc_html($p['category'] ?? 'Product').'</span></div>'; }
                echo '<div class="gas-shop-card-body">';
                if (!empty($p['category'])) echo '<span class="gas-shop-cat">'.esc_html($p['category']).'</span>';
                echo '<h3 class="gas-shop-card-name">'.esc_html($name).'</h3>';
                if ($desc) echo '<p class="gas-shop-card-desc">'.esc_html(wp_trim_words($desc, 15)).'</p>';
                echo '<div class="gas-shop-card-price">'.$curr.' '.$price.'</div>';
                echo '</div></a></article>';
            }
            echo '</div>';
        }

        // Cart link
        echo '<div style="text-align:center;margin-top:40px">';
        echo '<a href="'.esc_url(home_url('/shop/cart/')).'" class="gas-shop-btn" id="gas-shop-cart-link" style="display:none">View Cart (<span id="gas-shop-cart-count">0</span>)</a>';
        echo '</div>';

        // Category filter + cart count JS
        echo '<script>
(function(){
  var filters = document.querySelectorAll(".gas-shop-filter");
  var cards = document.querySelectorAll(".gas-shop-card");
  var accent = '.wp_json_encode($c['accent']).';
  var catBg = '.wp_json_encode($c['category_bg']).';
  var catText = '.wp_json_encode($c['category_text']).';
  filters.forEach(function(f){
    f.addEventListener("click", function(e){
      e.preventDefault();
      var cat = this.getAttribute("data-cat");
      filters.forEach(function(ff){ ff.style.background=catBg; ff.style.color=catText; ff.classList.remove("active"); });
      this.style.background=accent; this.style.color="#fff"; this.classList.add("active");
      cards.forEach(function(c){
        c.style.display = (!cat || c.getAttribute("data-category") === cat) ? "" : "none";
      });
    });
  });
  // Cart badge
  try {
    var cart = JSON.parse(localStorage.getItem("gas_shop_cart") || "[]");
    if (cart.length) {
      var total = cart.reduce(function(s,i){ return s + (i.quantity||1); }, 0);
      document.getElementById("gas-shop-cart-count").textContent = total;
      document.getElementById("gas-shop-cart-link").style.display = "inline-block";
    }
  } catch(e){}
})();
</script>';
        echo '</div>';
        get_footer();
    }

    // ── Single product ──
    private function render_single($p) {
        $c = $this->get_colors();
        $lang = $this->get_current_language();
        $name = $this->ml_text($p, 'name', $lang);
        $desc = $this->ml_text($p, 'description', $lang);
        $price = number_format((float)$p['price'], 2);
        $curr = $p['currency'] ?? 'EUR';

        get_header();
        echo $this->base_css();
        echo '<style>.gas-shop-single{max-width:900px;margin:0 auto;padding:120px 20px 40px}.gas-shop-single-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start}@media(max-width:768px){.gas-shop-single-grid{grid-template-columns:1fr}}</style>';
        echo '<div class="gas-shop-single">';
        echo '<a href="'.esc_url(home_url('/shop/')).'" class="gas-shop-back">&larr; Back to Shop</a>';
        echo '<div class="gas-shop-single-grid">';

        // Image
        echo '<div>';
        if (!empty($p['image_url'])) {
            $cr = intval($c['card_radius'] ?? 12).'px';
            echo '<img src="'.esc_url($p['image_url']).'" style="width:100%;border-radius:'.$cr.'" alt="'.esc_attr($name).'">';
        }
        // Gallery
        $gallery = $p['gallery_urls'] ?? array();
        if (is_string($gallery)) $gallery = json_decode($gallery, true) ?: array();
        if (!empty($gallery)) {
            echo '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px">';
            foreach ($gallery as $img) {
                echo '<img src="'.esc_url($img).'" style="width:100%;height:80px;object-fit:cover;border-radius:6px;cursor:pointer" onclick="this.parentElement.previousElementSibling.src=this.src">';
            }
            echo '</div>';
        }
        echo '</div>';

        // Details
        echo '<div>';
        if (!empty($p['category'])) echo '<span class="gas-shop-cat">'.esc_html($p['category']).'</span><br><br>';
        echo '<h1 style="margin:0 0 16px;color:'.$c['text'].'">'.esc_html($name).'</h1>';
        echo '<div class="gas-shop-card-price" style="font-size:1.5rem;margin-bottom:20px">'.$curr.' '.$price.'</div>';
        if ($desc) echo '<div style="color:'.$c['text_secondary'].';line-height:1.8;margin-bottom:24px">'.wp_kses_post(nl2br($desc)).'</div>';

        // Stock indicator
        if ($p['stock_tracking']) {
            $qty = intval($p['stock_quantity'] ?? 0);
            if ($qty > 0) echo '<p style="color:#10b981;margin-bottom:16px">In stock ('.$qty.' available)</p>';
            else echo '<p style="color:#ef4444;margin-bottom:16px">Out of stock</p>';
        }

        // Add to cart button
        $product_json = wp_json_encode(array(
            'id' => $p['id'],
            'slug' => $p['slug'],
            'name' => $name,
            'price' => (float)$p['price'],
            'currency' => $curr,
            'image_url' => $p['image_thumbnail_url'] ?? $p['image_url'] ?? '',
            'stock_tracking' => !empty($p['stock_tracking']),
            'max_qty' => $p['stock_tracking'] ? intval($p['stock_quantity'] ?? 0) : 0,
        ), JSON_HEX_APOS | JSON_HEX_QUOT);
        $disabled = ($p['stock_tracking'] && intval($p['stock_quantity'] ?? 0) <= 0) ? ' disabled style="opacity:.5;cursor:not-allowed"' : '';
        echo '<button class="gas-shop-btn" id="gas-add-to-cart"'.$disabled.' onclick=\'gasShopAddToCart('.$product_json.')\'>Add to Cart</button>';
        echo '<a href="'.esc_url(home_url('/shop/cart/')).'" class="gas-shop-btn" style="background:transparent;color:'.$c['accent'].';border:2px solid '.$c['accent'].';margin-left:12px" id="gas-shop-go-cart">View Cart</a>';
        echo '</div></div></div>';

        echo '<script>
function gasShopAddToCart(product) {
  var cart = JSON.parse(localStorage.getItem("gas_shop_cart") || "[]");
  var found = false;
  var maxQty = product.stock_tracking ? product.max_qty : 0;
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].id === product.id) {
      var newQty = (cart[i].quantity||1) + 1;
      if (maxQty > 0 && newQty > maxQty) {
        var btn = document.getElementById("gas-add-to-cart");
        btn.textContent = "Max " + maxQty + " allowed";
        setTimeout(function(){ btn.textContent = "Add to Cart"; }, 2000);
        return;
      }
      cart[i].quantity = newQty;
      cart[i].max_qty = maxQty;
      cart[i].stock_tracking = product.stock_tracking;
      found = true;
      break;
    }
  }
  if (!found) {
    if (maxQty > 0 && 1 > maxQty) return;
    product.quantity = 1;
    cart.push(product);
  }
  localStorage.setItem("gas_shop_cart", JSON.stringify(cart));
  var btn = document.getElementById("gas-add-to-cart");
  btn.textContent = "Added!";
  setTimeout(function(){ btn.textContent = "Add to Cart"; }, 1500);
}
</script>';
        get_footer();
    }

    // ── Cart page ──
    private function render_cart() {
        $c = $this->get_colors();
        get_header();
        echo $this->base_css();
        echo '<style>
.gas-cart-wrap{max-width:800px;margin:0 auto;padding:120px 20px 40px}
.gas-cart-item{display:flex;gap:16px;align-items:center;padding:16px 0;border-bottom:1px solid #e5e7eb}
.gas-cart-item img{width:80px;height:80px;object-fit:cover;border-radius:8px}
.gas-cart-qty{display:flex;align-items:center;gap:8px}
.gas-cart-qty button{width:32px;height:32px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:1.1rem}
.gas-cart-total{font-size:1.5rem;font-weight:700;color:'.$c['text'].';text-align:right;margin-top:24px}
</style>';
        echo '<div class="gas-cart-wrap">';
        echo '<a href="'.esc_url(home_url('/shop/')).'" class="gas-shop-back">&larr; Continue Shopping</a>';
        echo '<h1 class="gas-shop-title">Your Cart</h1>';
        echo '<div id="gas-cart-items"></div>';
        echo '<div class="gas-cart-total" id="gas-cart-total"></div>';
        echo '<div style="text-align:right;margin-top:16px">';
        echo '<a href="'.esc_url(home_url('/shop/checkout/')).'" class="gas-shop-btn" id="gas-checkout-btn" style="display:none">Proceed to Checkout</a>';
        echo '</div>';

        $shop_url = esc_url(home_url('/shop/'));
        echo '<script>
(function(){
  var cart = JSON.parse(localStorage.getItem("gas_shop_cart") || "[]");
  var container = document.getElementById("gas-cart-items");
  var totalEl = document.getElementById("gas-cart-total");
  var checkoutBtn = document.getElementById("gas-checkout-btn");

  function render() {
    cart = JSON.parse(localStorage.getItem("gas_shop_cart") || "[]");
    if (!cart.length) {
      container.innerHTML = \'<div style="text-align:center;padding:60px;color:#64748b"><div style="font-size:3rem;margin-bottom:12px">🛒</div><p>Your cart is empty</p><a href="'.$shop_url.'" style="color:'.esc_attr($c['accent']).'">Browse products</a></div>\';
      totalEl.textContent = "";
      checkoutBtn.style.display = "none";
      return;
    }
    var html = "";
    var total = 0;
    var curr = cart[0].currency || "EUR";
    cart.forEach(function(item, idx){
      var lineTotal = item.price * (item.quantity || 1);
      total += lineTotal;
      var img = item.image_url ? \'<img src="\'+item.image_url+\'" alt="">\' : \'<div style="width:80px;height:80px;background:#f3f4f6;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1.5rem">🛍</div>\';
      html += \'<div class="gas-cart-item">\'+img+\'<div style="flex:1"><strong>\'+item.name+\'</strong><div style="color:#64748b;font-size:0.9rem">\'+curr+\' \'+item.price.toFixed(2)+\'</div></div><div class="gas-cart-qty"><button onclick="gasCartQty(\'+idx+\',-1)">-</button><span>\'+( item.quantity||1)+\'</span><button onclick="gasCartQty(\'+idx+\',1)">+</button></div><div style="min-width:80px;text-align:right;font-weight:600">\'+curr+\' \'+lineTotal.toFixed(2)+\'</div><button onclick="gasCartRemove(\'+idx+\')" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:#ef4444" title="Remove">&times;</button></div>\';
    });
    container.innerHTML = html;
    totalEl.textContent = "Total: " + curr + " " + total.toFixed(2);
    checkoutBtn.style.display = "inline-block";
  }

  window.gasCartQty = function(idx, delta) {
    var newQty = Math.max(1, (cart[idx].quantity||1) + delta);
    var maxQty = cart[idx].stock_tracking ? (cart[idx].max_qty || 0) : 0;
    if (maxQty > 0 && newQty > maxQty) newQty = maxQty;
    cart[idx].quantity = newQty;
    localStorage.setItem("gas_shop_cart", JSON.stringify(cart));
    render();
  };
  window.gasCartRemove = function(idx) {
    cart.splice(idx, 1);
    localStorage.setItem("gas_shop_cart", JSON.stringify(cart));
    render();
  };
  render();
})();
</script>';
        echo '</div>';
        get_footer();
    }

    // ── Checkout page ──
    private function render_checkout() {
        $c = $this->get_colors();
        $api_url = esc_url(trailingslashit($this->get_api_url()));
        $client_id = esc_attr(get_option('gas_shop_client_id') ?: get_option('gas_client_id', ''));
        $thank_you_url = esc_url(home_url('/shop/thank-you/'));

        get_header();
        echo $this->base_css();
        echo '<style>
.gas-checkout-wrap{max-width:600px;margin:0 auto;padding:120px 20px 40px}
.gas-checkout-field{margin-bottom:1rem}
.gas-checkout-field label{display:block;font-weight:600;margin-bottom:4px;color:'.$c['text'].'}
.gas-checkout-field input{width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:1rem}
.gas-checkout-field input:focus{border-color:'.$c['accent'].';outline:none;box-shadow:0 0 0 2px '.$c['accent'].'33}
.gas-checkout-summary{background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px}
</style>';
        echo '<div class="gas-checkout-wrap">';
        echo '<a href="'.esc_url(home_url('/shop/cart/')).'" class="gas-shop-back">&larr; Back to Cart</a>';
        echo '<h1 class="gas-shop-title">Checkout</h1>';

        // Order summary
        echo '<div class="gas-checkout-summary" id="gas-checkout-summary"></div>';

        // Customer form
        echo '<div class="gas-checkout-field"><label>Full Name *</label><input type="text" id="gas-co-name" required></div>';
        echo '<div class="gas-checkout-field"><label>Email *</label><input type="email" id="gas-co-email" required></div>';
        echo '<div class="gas-checkout-field"><label>Phone</label><input type="tel" id="gas-co-phone"></div>';

        echo '<div style="margin-top:24px">';
        echo '<button class="gas-shop-btn" id="gas-co-pay" style="width:100%;text-align:center" onclick="gasShopCheckout()">Pay Now</button>';
        echo '<p id="gas-co-error" style="color:#ef4444;margin-top:8px;display:none"></p>';
        echo '</div>';

        echo '<script>
(function(){
  var cart = JSON.parse(localStorage.getItem("gas_shop_cart") || "[]");
  var summary = document.getElementById("gas-checkout-summary");
  if (!cart.length) { window.location.href = "'.esc_url(home_url('/shop/cart/')).'"; return; }
  var curr = cart[0].currency || "EUR";
  var total = 0;
  var html = "<h3 style=\"margin:0 0 12px\">Order Summary</h3>";
  cart.forEach(function(item){
    var lt = item.price * (item.quantity||1);
    total += lt;
    html += "<div style=\"display:flex;justify-content:space-between;padding:4px 0\"><span>"+item.name+" x"+(item.quantity||1)+"</span><span>"+curr+" "+lt.toFixed(2)+"</span></div>";
  });
  html += "<hr style=\"margin:12px 0\"><div style=\"display:flex;justify-content:space-between;font-weight:700;font-size:1.1rem\"><span>Total</span><span>"+curr+" "+total.toFixed(2)+"</span></div>";
  summary.innerHTML = html;
})();

function gasShopCheckout() {
  var name = document.getElementById("gas-co-name").value.trim();
  var email = document.getElementById("gas-co-email").value.trim();
  var phone = document.getElementById("gas-co-phone").value.trim();
  var errEl = document.getElementById("gas-co-error");
  var btn = document.getElementById("gas-co-pay");

  if (!name || !email) { errEl.textContent = "Name and email are required"; errEl.style.display = "block"; return; }
  errEl.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Processing...";

  var cart = JSON.parse(localStorage.getItem("gas_shop_cart") || "[]");
  var items = cart.map(function(i){ return { product_id: i.id, quantity: i.quantity || 1 }; });

  fetch("'.$api_url.'api/public/shop/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: "'.$client_id.'",
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      items: items,
      success_url: "'.$thank_you_url.'?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: window.location.href
    })
  })
  .then(function(r){ return r.json(); })
  .then(function(data){
    if (data.success && data.checkout_url) {
      localStorage.removeItem("gas_shop_cart");
      window.location.href = data.checkout_url;
    } else {
      errEl.textContent = data.error || "Payment failed. Please try again.";
      errEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Pay Now";
    }
  })
  .catch(function(err){
    errEl.textContent = "Connection error. Please try again.";
    errEl.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Pay Now";
  });
}
</script>';
        echo '</div>';
        get_footer();
    }

    // ── Thank you page ──
    private function render_thank_you() {
        $c = $this->get_colors();
        get_header();
        echo $this->base_css();
        echo '<div class="gas-shop-wrap" style="text-align:center;padding-top:160px">';
        echo '<div style="font-size:4rem;margin-bottom:16px">✅</div>';
        echo '<h1 class="gas-shop-title">Thank You!</h1>';
        echo '<p style="color:'.$c['text_secondary'].';font-size:1.1rem;margin-bottom:32px">Your order has been placed successfully. You will receive a confirmation email shortly.</p>';
        echo '<a href="'.esc_url(home_url('/shop/')).'" class="gas-shop-btn">Continue Shopping</a>';
        echo '</div>';

        // Clear cart just in case
        echo '<script>localStorage.removeItem("gas_shop_cart");</script>';
        get_footer();
    }

    // ── Shortcode ──
    public function shop_shortcode($atts) {
        $atts = shortcode_atts(array('limit'=>'6','columns'=>'3'), $atts);
        $c = $this->get_colors();
        $lang = $this->get_current_language();
        $products = $this->fetch_products();
        if (is_wp_error($products) || empty($products)) return '<p>No products available.</p>';

        $cr = intval($c['card_radius'] ?? 12).'px';
        $h = '<style>.gas-sc-shop:hover{transform:translateY(-4px)!important}@media(max-width:900px){.gas-sc-shop-grid{grid-template-columns:repeat(2,1fr)!important}}@media(max-width:600px){.gas-sc-shop-grid{grid-template-columns:1fr!important}}</style>';
        $h .= '<div class="gas-sc-shop-grid" style="display:grid;gap:30px;grid-template-columns:repeat('.$atts['columns'].',1fr)">';
        $count = 0;
        foreach ($products as $p) {
            if ($count >= intval($atts['limit'])) break;
            $name = $this->ml_text($p, 'name', $lang);
            $price = number_format((float)$p['price'], 2);
            $curr = $p['currency'] ?? 'EUR';
            $h .= '<article class="gas-sc-shop" style="background:'.$c['card_bg'].';border-radius:'.$cr.';overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:all .2s">';
            $h .= '<a href="'.esc_url(home_url('/shop/'.$p['slug'])).'" style="text-decoration:none;color:inherit;display:block">';
            if (!empty($p['image_url'])) $h .= '<img src="'.esc_url($p['image_thumbnail_url'] ?: $p['image_url']).'" style="width:100%;height:200px;object-fit:cover" loading="lazy">';
            $h .= '<div style="padding:16px"><h3 style="margin:0 0 8px;font-size:1.1rem;color:'.$c['text'].'">'.esc_html($name).'</h3>';
            $h .= '<div style="font-weight:700;color:'.$c['accent'].'">'.$curr.' '.$price.'</div>';
            $h .= '</div></a></article>';
            $count++;
        }
        return $h.'</div>';
    }

    // ── Helper: multilingual text extraction ──
    private function ml_text($item, $field, $lang = 'en') {
        $ml_field = $field . '_ml';
        if (!empty($item[$ml_field])) {
            $ml = is_string($item[$ml_field]) ? json_decode($item[$ml_field], true) : $item[$ml_field];
            if (is_array($ml) && !empty($ml[$lang])) return $ml[$lang];
            if (is_array($ml) && !empty($ml['en'])) return $ml['en'];
        }
        return $item[$field] ?? '';
    }
}

GAS_Shop::get_instance();
register_activation_hook(__FILE__, function() { GAS_Shop::get_instance()->add_rewrite_rules(); flush_rewrite_rules(); });
register_deactivation_hook(__FILE__, 'flush_rewrite_rules');
