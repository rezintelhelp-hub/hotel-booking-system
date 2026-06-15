<?php
// Enqueue parent + child styles
// Enable full-width block alignments
add_action('after_setup_theme', function() {
    add_theme_support('align-wide');
    add_theme_support('custom-logo');
});

add_action('wp_enqueue_scripts', function() {
    wp_enqueue_style('gas-burger-style', get_stylesheet_directory_uri() . '/style.css', array(), @filemtime(get_stylesheet_directory() . '/style.css') ?: '3.1');
    wp_enqueue_style('google-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap', array(), null);

    // Enqueue WordPress block styles for cover, columns, buttons, etc.
    wp_enqueue_style('wp-block-cover');
    wp_enqueue_style('wp-block-columns');
    wp_enqueue_style('wp-block-column');
    wp_enqueue_style('wp-block-buttons');
    wp_enqueue_style('wp-block-button');
    wp_enqueue_style('wp-block-group');
    wp_enqueue_style('wp-block-image');
    wp_enqueue_style('wp-block-heading');
    wp_enqueue_style('wp-block-paragraph');
    wp_enqueue_style('wp-block-shortcode');

    // Pro Builder card images — full bleed within card, text padded
    wp_add_inline_style("wp-block-group", "
        .pb-card, .pb-card > .wp-block-group__inner-container { padding: 0 !important; }
        .pb-card .wp-block-image { margin: 0 !important; }
        .pb-card .wp-block-image img { width: 100% !important; display: block; }
        .pb-card .wp-block-group__inner-container .wp-block-heading { padding-left: 20px !important; padding-right: 20px !important; margin-top: 16px !important; }
        .pb-card > .wp-block-group__inner-container > p,
        .pb-card > .wp-block-group__inner-container > .wp-block-buttons { margin-left: 20px !important; margin-right: 20px !important; margin-bottom: 20px !important; }
    ");

    // GAS custom CSS (pushed from Pro Builder settings)
    $custom_css_file = get_stylesheet_directory() . '/gas-custom.css';
    if (file_exists($custom_css_file)) {
        wp_enqueue_style('gas-custom', get_stylesheet_directory_uri() . '/gas-custom.css', array('gas-burger-style'), filemtime($custom_css_file));
    }
});

// Custom slide menu
add_action('wp_footer', function() {
    $menu_items = wp_get_nav_menu_items('Primary Menu') ?: wp_get_nav_menu_items('Main Menu');
    if (!$menu_items) return;

    // Build parent/child structure
    $parents = [];
    $children = [];
    foreach ($menu_items as $item) {
        if ($item->menu_item_parent == 0) {
            $parents[] = $item;
        } else {
            $children[$item->menu_item_parent][] = $item;
        }
    }
    ?>
    <div id="gas-menu-overlay" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:99998;background:rgba(0,0,0,0.4);" onclick="document.getElementById('gas-menu-overlay').style.display='none';document.getElementById('gas-slide-menu').classList.remove('open');"></div>
    <nav id="gas-slide-menu">
        <a href="/" style="position:absolute;top:15px;left:20px;"><img src="https://hebdenbridgehostel.custom.gas.travel/wp-content/uploads/2026/02/1731403230mobile_logo.webp" alt="Logo" style="width:80px;"></a>
        <button id="gas-menu-close" onclick="document.getElementById('gas-menu-overlay').style.display='none';document.getElementById('gas-slide-menu').classList.remove('open');">&times;</button>
        <ul>
        <?php foreach ($parents as $item): ?>
            <li class="<?php echo isset($children[$item->ID]) ? 'has-children' : ''; ?>">
                <a href="<?php echo esc_url($item->url); ?>"><?php echo esc_html($item->title); ?></a>
                <?php if (isset($children[$item->ID])): ?>
                <button class="sub-toggle" onclick="this.parentElement.classList.toggle('open');return false;">&#9662;</button>
                <ul class="sub-menu">
                    <?php foreach ($children[$item->ID] as $child): ?>
                    <li><a href="<?php echo esc_url($child->url); ?>"><?php echo esc_html($child->title); ?></a></li>
                    <?php endforeach; ?>
                </ul>
                <?php endif; ?>
            </li>
        <?php endforeach; ?>
        </ul>
    </nav>
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // Hijack the WP burger button
        var wpBurger = document.querySelector('.wp-block-navigation__responsive-container-open');
        if (wpBurger) {
            wpBurger.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('gas-slide-menu').classList.add('open');
                document.getElementById('gas-menu-overlay').style.display = 'block';
                return false;
            }, true);
        }
    });
    </script>
    <?php
});

/**
 * Register Block Patterns — IOU Section Layouts
 */
add_action('init', function() {

    register_block_pattern_category('iou-sections', [
        'label' => 'IOU Sections',
    ]);

    // Pattern 1: Image Left / Text Right
    register_block_pattern('gas-hebden/image-left-text-right', [
        'title'       => 'IOU — Image Left / Text Right',
        'description' => 'Full-width section with image on the left (40%) and dark text panel on the right (60%)',
        'categories'  => ['iou-sections'],
        'content'     => '<!-- wp:columns {"align":"full","style":{"spacing":{"padding":{"top":"0","bottom":"0","left":"0","right":"0"},"blockGap":{"left":"0"}}}} -->
<div class="wp-block-columns alignfull" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0"><!-- wp:column {"width":"40%"} -->
<div class="wp-block-column" style="flex-basis:40%"><!-- wp:cover {"url":"https://hebdenbridgehostel.custom.gas.travel/wp-content/uploads/2026/02/HH-101.webp","dimRatio":0,"minHeight":450,"style":{"border":{"radius":"0px"}}} -->
<div class="wp-block-cover" style="border-radius:0px;min-height:450px"><img class="wp-block-cover__image-background" src="https://hebdenbridgehostel.custom.gas.travel/wp-content/uploads/2026/02/HH-101.webp" data-object-fit="cover"/><span aria-hidden="true" class="wp-block-cover__background has-background-dim-0 has-background-dim"></span><div class="wp-block-cover__inner-container"><!-- wp:paragraph -->
<p></p>
<!-- /wp:paragraph --></div></div>
<!-- /wp:cover --></div>
<!-- /wp:column --><!-- wp:column {"width":"60%","style":{"color":{"background":"#1b374c"},"spacing":{"padding":{"top":"60px","bottom":"60px","left":"60px","right":"60px"}}}} -->
<div class="wp-block-column has-background" style="background-color:#1b374c;padding-top:60px;padding-right:60px;padding-bottom:60px;padding-left:60px;flex-basis:60%"><!-- wp:heading {"style":{"color":{"text":"#ffffff"}}} -->
<h2 class="wp-block-heading has-text-color" style="color:#ffffff">Section Title</h2>
<!-- /wp:heading --><!-- wp:paragraph {"style":{"color":{"text":"#ffffff"}}} -->
<p class="has-text-color" style="color:#ffffff">Add your description here.</p>
<!-- /wp:paragraph --><!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"style":{"color":{"background":"#E8621A"},"border":{"radius":"0px"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-background wp-element-button" style="border-radius:0px;background-color:#E8621A">Learn More</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->',
    ]);

    // Pattern 2: Text Left / Image Right
    register_block_pattern('gas-hebden/text-left-image-right', [
        'title'       => 'IOU — Text Left / Image Right',
        'description' => 'Full-width section with dark text panel on the left (60%) and image on the right (40%)',
        'categories'  => ['iou-sections'],
        'content'     => '<!-- wp:columns {"align":"full","style":{"spacing":{"padding":{"top":"0","bottom":"0","left":"0","right":"0"},"blockGap":{"left":"0"}}}} -->
<div class="wp-block-columns alignfull" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0"><!-- wp:column {"width":"60%","style":{"color":{"background":"#1b374c"},"spacing":{"padding":{"top":"60px","bottom":"60px","left":"60px","right":"60px"}}}} -->
<div class="wp-block-column has-background" style="background-color:#1b374c;padding-top:60px;padding-right:60px;padding-bottom:60px;padding-left:60px;flex-basis:60%"><!-- wp:heading {"style":{"color":{"text":"#ffffff"}}} -->
<h2 class="wp-block-heading has-text-color" style="color:#ffffff">Section Title</h2>
<!-- /wp:heading --><!-- wp:paragraph {"style":{"color":{"text":"#ffffff"}}} -->
<p class="has-text-color" style="color:#ffffff">Add your description here.</p>
<!-- /wp:paragraph --><!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"style":{"color":{"background":"#E8621A"},"border":{"radius":"0px"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-background wp-element-button" style="border-radius:0px;background-color:#E8621A">Learn More</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column --><!-- wp:column {"width":"40%"} -->
<div class="wp-block-column" style="flex-basis:40%"><!-- wp:cover {"url":"https://hebdenbridgehostel.custom.gas.travel/wp-content/uploads/2026/02/HH-101.webp","dimRatio":0,"minHeight":450,"style":{"border":{"radius":"0px"}}} -->
<div class="wp-block-cover" style="border-radius:0px;min-height:450px"><img class="wp-block-cover__image-background" src="https://hebdenbridgehostel.custom.gas.travel/wp-content/uploads/2026/02/HH-101.webp" data-object-fit="cover"/><span aria-hidden="true" class="wp-block-cover__background has-background-dim-0 has-background-dim"></span><div class="wp-block-cover__inner-container"><!-- wp:paragraph -->
<p></p>
<!-- /wp:paragraph --></div></div>
<!-- /wp:cover --></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->',
    ]);

    // Pattern 3: Full Width / Text Centre
    register_block_pattern('gas-hebden/fullwidth-text-centre', [
        'title'       => 'IOU — Full Width / Text Centre',
        'description' => 'Full-width image with centred text overlay',
        'categories'  => ['iou-sections'],
        'content'     => '<!-- wp:cover {"url":"https://hebdenbridgehostel.custom.gas.travel/wp-content/uploads/2026/02/HH-101.webp","dimRatio":50,"minHeight":450,"align":"full","style":{"border":{"radius":"0px"}}} -->
<div class="wp-block-cover alignfull" style="border-radius:0px;min-height:450px"><img class="wp-block-cover__image-background" src="https://hebdenbridgehostel.custom.gas.travel/wp-content/uploads/2026/02/HH-101.webp" data-object-fit="cover"/><span aria-hidden="true" class="wp-block-cover__background has-background-dim-50 has-background-dim"></span><div class="wp-block-cover__inner-container"><!-- wp:heading {"textAlign":"center","style":{"color":{"text":"#ffffff"}}} -->
<h2 class="wp-block-heading has-text-align-center has-text-color" style="color:#ffffff">Section Title</h2>
<!-- /wp:heading --><!-- wp:paragraph {"align":"center","style":{"color":{"text":"#ffffff"}}} -->
<p class="has-text-align-center has-text-color" style="color:#ffffff">Add your description here.</p>
<!-- /wp:paragraph --><!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons"><!-- wp:button {"style":{"color":{"background":"#E8621A"},"border":{"radius":"0px"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-background wp-element-button" style="border-radius:0px;background-color:#E8621A">Learn More</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div></div>
<!-- /wp:cover -->',
    ]);

    // Pattern 4: Full Width / Text Left
    register_block_pattern('gas-hebden/fullwidth-text-left', [
        'title'       => 'IOU — Full Width / Text Left',
        'description' => 'Full-width image with left-aligned text overlay',
        'categories'  => ['iou-sections'],
        'content'     => '<!-- wp:cover {"url":"https://hebdenbridgehostel.custom.gas.travel/wp-content/uploads/2026/02/HH-101.webp","dimRatio":0,"minHeight":450,"align":"full","style":{"border":{"radius":"0px"}}} -->
<div class="wp-block-cover alignfull" style="border-radius:0px;min-height:450px"><img class="wp-block-cover__image-background" src="https://hebdenbridgehostel.custom.gas.travel/wp-content/uploads/2026/02/HH-101.webp" data-object-fit="cover"/><span aria-hidden="true" class="wp-block-cover__background has-background-dim-0 has-background-dim"></span><div class="wp-block-cover__inner-container"><!-- wp:group {"style":{"color":{"background":"rgba(0,0,0,0.5)"},"spacing":{"padding":{"top":"60px","bottom":"60px","left":"60px","right":"60px"}}}} -->
<div class="wp-block-group has-background" style="background-color:rgba(0,0,0,0.5);padding-top:60px;padding-right:60px;padding-bottom:60px;padding-left:60px"><!-- wp:heading {"style":{"color":{"text":"#ffffff"}}} -->
<h2 class="wp-block-heading has-text-color" style="color:#ffffff">Section Title</h2>
<!-- /wp:heading --><!-- wp:paragraph {"style":{"color":{"text":"#ffffff"}}} -->
<p class="has-text-color" style="color:#ffffff">Add your description here.</p>
<!-- /wp:paragraph --><!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"style":{"color":{"background":"#E8621A"},"border":{"radius":"0px"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-background wp-element-button" style="border-radius:0px;background-color:#E8621A">Learn More</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:group --></div></div>
<!-- /wp:cover -->',
    ]);

    // Pattern 5: Slider Left / Text Right
    register_block_pattern('gas-hebden/slider-left-text-right', [
        'title'       => 'IOU — Slider Left / Text Right',
        'description' => 'Smart Slider on the left (40%) and dark text panel on the right (60%). Replace slider ID.',
        'categories'  => ['iou-sections'],
        'content'     => '<!-- wp:columns {"align":"full","style":{"spacing":{"padding":{"top":"0","bottom":"0","left":"0","right":"0"},"blockGap":{"left":"0"}}}} -->
<div class="wp-block-columns alignfull" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0"><!-- wp:column {"width":"40%"} -->
<div class="wp-block-column" style="flex-basis:40%"><!-- wp:shortcode -->
[smartslider3 slider="1"]
<!-- /wp:shortcode --></div>
<!-- /wp:column --><!-- wp:column {"width":"60%","style":{"color":{"background":"#1b374c"},"spacing":{"padding":{"top":"60px","bottom":"60px","left":"60px","right":"60px"}}}} -->
<div class="wp-block-column has-background" style="background-color:#1b374c;padding-top:60px;padding-right:60px;padding-bottom:60px;padding-left:60px;flex-basis:60%"><!-- wp:heading {"style":{"color":{"text":"#ffffff"}}} -->
<h2 class="wp-block-heading has-text-color" style="color:#ffffff">Section Title</h2>
<!-- /wp:heading --><!-- wp:paragraph {"style":{"color":{"text":"#ffffff"}}} -->
<p class="has-text-color" style="color:#ffffff">Add your description here.</p>
<!-- /wp:paragraph --><!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"style":{"color":{"background":"#E8621A"},"border":{"radius":"0px"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-background wp-element-button" style="border-radius:0px;background-color:#E8621A">Learn More</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->',
    ]);

    // Pattern 6: Text Left / Slider Right
    register_block_pattern('gas-hebden/text-left-slider-right', [
        'title'       => 'IOU — Text Left / Slider Right',
        'description' => 'Dark text panel on the left (60%) and Smart Slider on the right (40%). Replace slider ID.',
        'categories'  => ['iou-sections'],
        'content'     => '<!-- wp:columns {"align":"full","style":{"spacing":{"padding":{"top":"0","bottom":"0","left":"0","right":"0"},"blockGap":{"left":"0"}}}} -->
<div class="wp-block-columns alignfull" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0"><!-- wp:column {"width":"60%","style":{"color":{"background":"#1b374c"},"spacing":{"padding":{"top":"60px","bottom":"60px","left":"60px","right":"60px"}}}} -->
<div class="wp-block-column has-background" style="background-color:#1b374c;padding-top:60px;padding-right:60px;padding-bottom:60px;padding-left:60px;flex-basis:60%"><!-- wp:heading {"style":{"color":{"text":"#ffffff"}}} -->
<h2 class="wp-block-heading has-text-color" style="color:#ffffff">Section Title</h2>
<!-- /wp:heading --><!-- wp:paragraph {"style":{"color":{"text":"#ffffff"}}} -->
<p class="has-text-color" style="color:#ffffff">Add your description here.</p>
<!-- /wp:paragraph --><!-- wp:buttons -->
<div class="wp-block-buttons"><!-- wp:button {"style":{"color":{"background":"#E8621A"},"border":{"radius":"0px"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-background wp-element-button" style="border-radius:0px;background-color:#E8621A">Learn More</a></div>
<!-- /wp:button --></div>
<!-- /wp:buttons --></div>
<!-- /wp:column --><!-- wp:column {"width":"40%"} -->
<div class="wp-block-column" style="flex-basis:40%"><!-- wp:shortcode -->
[smartslider3 slider="1"]
<!-- /wp:shortcode --></div>
<!-- /wp:column --></div>
<!-- /wp:columns -->',
    ]);

});

/**
 * gas_burger_get_api_settings()
 *
 * Burger-theme-only API caller. Replaces the call to
 * developer_get_api_settings() that footer.php/header.php used to make
 * (that function only exists on developer-light/dark themes — burger
 * had no API caller until this).
 *
 * UNIQUELY NAMED so it cannot collide with developer_get_api_settings()
 * or any other theme's helpers. Loads ONLY when burger theme is active
 * (i.e. only on the one site running it — Hebden today).
 *
 * Fetches the GAS Web Builder config from admin.gas.travel and returns
 * a flattened array with the keys footer.php expects.
 *
 * Cached in a transient (5 min TTL). The GAS Admin save endpoint
 * already flushes 'gas_api_settings_<blog_id>' on each save so the
 * cache invalidates immediately on a settings change.
 */
function gas_burger_get_api_settings() {
    $client_id = get_option('gas_client_id', '');
    if (empty($client_id)) return array();

    $cache_key = 'gas_api_settings_' . get_current_blog_id();
    $cached = get_transient($cache_key);
    if ($cached !== false && is_array($cached)) return $cached;

    $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
    $site_url = home_url('/');
    $request_url = rtrim($api_url, '/') . '/api/public/client/' . urlencode($client_id) . '/site-config?site_url=' . urlencode($site_url);
    $response = wp_remote_get($request_url, array('timeout' => 8, 'sslverify' => true));
    if (is_wp_error($response)) return array();

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    if (!is_array($data) || empty($data['success'])) return array();

    $cfg = isset($data['config']) && is_array($data['config']) ? $data['config'] : array();
    $website = isset($cfg['website']) && is_array($cfg['website']) ? $cfg['website'] : array();
    $footer = isset($website['footer']) && is_array($website['footer']) ? $website['footer'] : array();
    $contact = isset($website['page-contact']) && is_array($website['page-contact']) ? $website['page-contact'] : array();
    $branding = isset($cfg['branding']) && is_array($cfg['branding']) ? $cfg['branding'] : array();
    $lang = isset($cfg['website']['languages']['primary']) ? $cfg['website']['languages']['primary'] : 'en';

    // Helper — resolve a multilingual value with kebab-case key. Stored
    // shape can be either `{key}-{lang}` flat keys or `{key_ml}` nested
    // dict. Falls back through both before returning the plain key.
    $ml = function($arr, $key, $lang) {
        if (!is_array($arr)) return '';
        $ml_key = str_replace('-', '_', $key) . '_ml';
        if (isset($arr[$ml_key]) && is_array($arr[$ml_key])) {
            return isset($arr[$ml_key][$lang]) ? $arr[$ml_key][$lang]
                 : (isset($arr[$ml_key]['en']) ? $arr[$ml_key]['en'] : '');
        }
        $flat = $key . '-' . $lang;
        if (isset($arr[$flat]) && $arr[$flat] !== '') return $arr[$flat];
        $flat_en = $key . '-en';
        if (isset($arr[$flat_en]) && $arr[$flat_en] !== '') return $arr[$flat_en];
        return isset($arr[$key]) ? $arr[$key] : '';
    };

    // CRITICAL — do NOT set 'site_name', 'cta_text', 'cta_link', or
    // 'header_logo_image' here. The burger header.php reads those four
    // keys with its own `??` fallback chain (get_bloginfo / 'Book Now' /
    // '/book-now/' / WP custom_logo). Leaving them undefined here
    // preserves the header behaviour exactly as it was before this
    // function existed. The header is Steve's hand-tuned work — DO NOT
    // touch it.
    $result = array(
        // Footer styling + layout
        'footer_bg'    => isset($footer['bg']) ? $footer['bg'] : (isset($footer['bg-color']) ? $footer['bg-color'] : '#292929'),
        'footer_text'  => isset($footer['text']) ? $footer['text'] : (isset($footer['text-color']) ? $footer['text-color'] : '#ffffff'),
        'footer_layout' => isset($footer['layout']) ? $footer['layout'] : 'default',
        'footer_show_powered_by' => isset($footer['show-powered-by']) ? !!$footer['show-powered-by'] : true,

        // Footer multilingual
        'footer_heading_quicklinks' => $ml($footer, 'heading-quicklinks', $lang),
        'footer_heading_legal' => $ml($footer, 'heading-legal', $lang),
        'footer_copyright' => $ml($footer, 'copyright', $lang),
        'footer_company_number' => $ml($footer, 'company-number', $lang),
        'footer_company_number_label' => $ml($footer, 'company-number-label', $lang),
        'footer_tax_number' => $ml($footer, 'tax-number', $lang),
        'footer_tax_number_label' => $ml($footer, 'tax-number-label', $lang),

        // Band 1: CTA
        'footer_cta_enabled' => !empty($footer['cta-enabled']),
        'footer_cta_heading' => isset($footer['cta-heading']) ? $footer['cta-heading'] : '',
        'footer_cta_text' => isset($footer['cta-text']) ? $footer['cta-text'] : '',
        'footer_cta_btn_text' => isset($footer['cta-btn-text']) ? $footer['cta-btn-text'] : '',
        'footer_cta_btn_link' => isset($footer['cta-btn-link']) ? $footer['cta-btn-link'] : '',
        'footer_cta_btn_bg' => isset($footer['cta-btn-bg']) ? $footer['cta-btn-bg'] : '#ffffff',
        'footer_cta_btn_style' => isset($footer['cta-btn-style']) ? $footer['cta-btn-style'] : 'outline',
        'footer_cta_bg' => isset($footer['cta-bg']) ? $footer['cta-bg'] : '#1e293b',
        'footer_cta_text_color' => isset($footer['cta-text-color']) ? $footer['cta-text-color'] : '#ffffff',

        // Band 2: Info / Partners
        'footer_info_heading' => isset($footer['info-heading']) ? $footer['info-heading'] : '',
        'footer_info_bg' => isset($footer['info-bg']) ? $footer['info-bg'] : (isset($branding['primary_color']) ? $branding['primary_color'] : '#F97224'),
        'footer_info_text_color' => isset($footer['info-text-color']) ? $footer['info-text-color'] : '#1a1a1a',
        'footer_partner_logo_1' => isset($footer['partner-logo-1-image-url']) ? $footer['partner-logo-1-image-url'] : '',
        'footer_partner_logo_2' => isset($footer['partner-logo-2-image-url']) ? $footer['partner-logo-2-image-url'] : '',
        'footer_partner_logo_3' => isset($footer['partner-logo-3-image-url']) ? $footer['partner-logo-3-image-url'] : '',
        'footer_partner_logo_4' => isset($footer['partner-logo-4-image-url']) ? $footer['partner-logo-4-image-url'] : '',
        'footer_partner_logo_5' => isset($footer['partner-logo-5-image-url']) ? $footer['partner-logo-5-image-url'] : '',
        'footer_partner_logo_6' => isset($footer['partner-logo-6-image-url']) ? $footer['partner-logo-6-image-url'] : '',
        'footer_partner_logo_7' => isset($footer['partner-logo-7-image-url']) ? $footer['partner-logo-7-image-url'] : '',
        'footer_partner_logo_8' => isset($footer['partner-logo-8-image-url']) ? $footer['partner-logo-8-image-url'] : '',

        // 3-col Brand + Contact + Newsletter (new layout)
        'footer_brand_image_url' => isset($footer['brand-image-url']) ? $footer['brand-image-url'] : '',
        'footer_brand_text' => $ml($footer, 'brand-text', $lang),
        'footer_brand_link' => isset($footer['brand-link']) ? $footer['brand-link'] : '',
        'footer_show_newsletter' => !empty($footer['show-newsletter']),
        'footer_newsletter_heading' => $ml($footer, 'newsletter-heading', $lang),

        // Social
        'footer_social_facebook' => isset($footer['social-facebook']) ? $footer['social-facebook'] : '',
        'footer_social_instagram' => isset($footer['social-instagram']) ? $footer['social-instagram'] : '',
        'footer_social_twitter' => isset($footer['social-twitter']) ? $footer['social-twitter'] : '',
        'footer_social_youtube' => isset($footer['social-youtube']) ? $footer['social-youtube'] : '',
        'footer_social_linkedin' => isset($footer['social-linkedin']) ? $footer['social-linkedin'] : '',
        'footer_social_tiktok' => isset($footer['social-tiktok']) ? $footer['social-tiktok'] : '',
        'footer_social_pinterest' => isset($footer['social-pinterest']) ? $footer['social-pinterest'] : '',
        'footer_social_tripadvisor' => isset($footer['social-tripadvisor']) ? $footer['social-tripadvisor'] : '',

        // Contact (middle column for 3-col layout). Uses !empty rather than
        // isset because the page-contact section can have an EMPTY-string
        // address while the operator's real value lives in the footer
        // section. isset('') = true so the empty wins; !empty falls through.
        'contact_address' => !empty($contact['address']) ? $contact['address'] : (!empty($footer['address']) ? $footer['address'] : ''),
        'contact_phone'   => !empty($contact['phone'])   ? $contact['phone']   : (!empty($footer['phone'])   ? $footer['phone']   : ''),
        'contact_email'   => !empty($contact['email'])   ? $contact['email']   : (!empty($footer['email'])   ? $footer['email']   : ''),

        // Legal page flags
        'page_impressum_enabled' => !empty($website['page-impressum']['enabled']),

        // Branding
        'primary_color' => isset($branding['primary_color']) ? $branding['primary_color'] : '#F97224',

        // Newsletter signup endpoint context
        'gas_api_url' => $api_url,
        'gas_client_id' => $client_id,
    );

    set_transient($cache_key, $result, 5 * MINUTE_IN_SECONDS);
    return $result;
}
