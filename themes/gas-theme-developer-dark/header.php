<?php
/**
 * Copyright (c) 2026 GAS - Global Accommodation System (gas.travel)
 * All rights reserved.
 *
 * This software is proprietary and licensed exclusively for use on
 * GAS-hosted infrastructure. Copying, redistribution, modification,
 * reverse-engineering, or deployment on non-GAS servers is strictly
 * prohibited without prior written consent from GAS.
 *
 * Unauthorized use may result in legal action under applicable
 * intellectual property and copyright laws.
 *
 * Contact: steve@gas.travel | https://gas.travel
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?php wp_head(); ?>
</head>
<?php
$menu_layout = get_theme_mod('developer_menu_layout', 'logo-left');
$header_sticky = get_theme_mod('developer_header_sticky', true);
$nav_blog = get_theme_mod('developer_header_nav_blog', false);
$nav_contact = get_theme_mod('developer_header_nav_contact', true);
$nav_about = get_theme_mod('developer_header_nav_about', false);

// Get CTA text from GAS API first, fallback to theme_mod
$api_settings = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();

// DEBUG: Show menu title data if ?debug_menu=1
if (isset($_GET['debug_menu']) && $_GET['debug_menu'] == '1') {
    echo '<pre style="background:#000;color:#0f0;padding:20px;font-size:12px;position:fixed;top:0;left:0;right:0;z-index:99999;max-height:400px;overflow:auto;">';
    echo "=== MENU DEBUG ===\n\n";
    echo "page_home_menu_title: " . var_export($api_settings['page_home_menu_title'] ?? 'NOT SET', true) . "\n";
    echo "page_rooms_menu_title: " . var_export($api_settings['page_rooms_menu_title'] ?? 'NOT SET', true) . "\n";
    echo "page_about_menu_title: " . var_export($api_settings['page_about_menu_title'] ?? 'NOT SET', true) . "\n";
    echo "page_contact_menu_title: " . var_export($api_settings['page_contact_menu_title'] ?? 'NOT SET', true) . "\n";
    echo "\n=== RAW HERO SETTINGS ===\n";
    if (isset($api_settings['_debug_hero'])) {
        print_r($api_settings['_debug_hero']);
    } else {
        echo "(not available - add _debug_hero to developer_get_api_settings)\n";
    }
    echo '</pre>';
}

$cta_text = $api_settings['cta_text'] ?? get_theme_mod('developer_header_cta_label', 'Book Now');
$cta_link = $api_settings['cta_link'] ?? get_theme_mod('developer_header_cta_link', '/book-now/');

// Get logo from API, fallback to theme_mod, then WP custom logo
// If API explicitly sets empty string, respect it (logo was removed)
$api_logo_image = null;
if (isset($api_settings['header_logo_image'])) {
    $api_logo_image = $api_settings['header_logo_image'];
} else {
    $api_logo_image = get_theme_mod('developer_header_logo_image', '');
}
$api_logo_light_image = $api_settings['header_logo_light_image'] ?? '';
$site_name = $api_settings['site_name'] ?? get_bloginfo('name');

// Build dynamic menu items from GAS settings
$menu_items = array();

// Home - always first
$menu_items[] = array(
    'title' => $api_settings['page_home_menu_title'] ?? 'Home',
    'url' => home_url('/'),
    'order' => 0,
    'enabled' => true,
    'is_home' => true
);

// Rooms - can be hidden and reordered like other pages
$rooms_enabled = $api_settings['page_rooms_enabled'] ?? true;
if ($rooms_enabled && $rooms_enabled !== 'false' && $rooms_enabled !== false) {
    $menu_items[] = array(
        'title' => $api_settings['page_rooms_menu_title'] ?? 'Rooms',
        'url' => home_url('/book-now/'),
        'order' => $api_settings['page_rooms_menu_order'] ?? 1,
        'enabled' => true
    );
}

// About
if (!empty($api_settings['page_about_enabled'])) {
    $menu_items[] = array(
        'title' => $api_settings['page_about_menu_title'] ?? 'About',
        'url' => home_url('/about/'),
        'order' => $api_settings['page_about_menu_order'] ?? 2,
        'enabled' => true
    );
}

// Gallery
if (!empty($api_settings['page_gallery_enabled'])) {
    $menu_items[] = array(
        'title' => $api_settings['page_gallery_menu_title'] ?? 'Gallery',
        'url' => home_url('/gallery/'),
        'order' => $api_settings['page_gallery_menu_order'] ?? 3,
        'enabled' => true
    );
}

// Blog
if (!empty($api_settings['page_blog_enabled'])) {
    $menu_items[] = array(
        'title' => $api_settings['page_blog_menu_title'] ?? 'Blog',
        'url' => home_url('/blog/'),
        'order' => $api_settings['page_blog_menu_order'] ?? 4,
        'enabled' => true
    );
}

// Dining
if (!empty($api_settings['page_dining_enabled'])) {
    $menu_items[] = array(
        'title' => $api_settings['page_dining_menu_title'] ?? 'Dining',
        'url' => home_url('/dining/'),
        'order' => $api_settings['page_dining_menu_order'] ?? 4,
        'enabled' => true
    );
}

// Attractions
if (!empty($api_settings['page_attractions_enabled'])) {
    $menu_items[] = array(
        'title' => $api_settings['page_attractions_menu_title'] ?? 'Attractions',
        'url' => home_url('/attractions/'),
        'order' => $api_settings['page_attractions_menu_order'] ?? 5,
        'enabled' => true
    );
}

// Offers
if (!empty($api_settings['page_offers_enabled'])) {
    $menu_items[] = array(
        'title' => $api_settings['page_offers_menu_title'] ?? 'Offers',
        'url' => home_url('/offers/'),
        'order' => $api_settings['page_offers_menu_order'] ?? 5,
        'enabled' => true
    );
}

// Properties
if (!empty($api_settings['page_properties_enabled'])) {
    $menu_items[] = array(
        'title' => $api_settings['page_properties_menu_title'] ?? 'Properties',
        'url' => home_url('/properties/'),
        'order' => $api_settings['page_properties_menu_order'] ?? 6,
        'enabled' => true
    );
}

// Reviews
if (!empty($api_settings['page_reviews_enabled'])) {
    $menu_items[] = array(
        'title' => $api_settings['page_reviews_menu_title'] ?? 'Reviews',
        'url' => home_url('/reviews/'),
        'order' => $api_settings['page_reviews_menu_order'] ?? 7,
        'enabled' => true
    );
}

// Contact - enabled by default, only hidden if explicitly disabled
$contact_enabled = $api_settings['page_contact_enabled'] ?? true;
if ($contact_enabled && $contact_enabled !== 'false' && $contact_enabled !== false) {
    $menu_items[] = array(
        'title' => $api_settings['page_contact_menu_title'] ?? 'Contact',
        'url' => home_url('/contact/'),
        'order' => $api_settings['page_contact_menu_order'] ?? 8,
        'enabled' => true
    );
}

// Sort menu items by order
usort($menu_items, function($a, $b) {
    return intval($a['order'] ?? 99) - intval($b['order'] ?? 99);
});

// Helper function to output menu items
function developer_output_nav_items($menu_items) {
    foreach ($menu_items as $item) {
        $is_active = '';
        if (!empty($item['is_home']) && is_front_page()) {
            $is_active = ' class="active"';
        } elseif (!empty($item['url'])) {
            $current_url = trailingslashit(home_url(add_query_arg(array(), $GLOBALS['wp']->request)));
            if (trailingslashit($item['url']) === $current_url) {
                $is_active = ' class="active"';
            }
        }
        echo '<a href="' . esc_url($item['url']) . '"' . $is_active . '>' . esc_html($item['title']) . '</a>';
    }
}

// Check if menu already has a CTA item (to avoid duplicates on old sites)
// Only relevant when WordPress nav menu is rendered directly (not using dynamic API menu)
// Since we now always use the dynamic API menu (developer_output_nav_items), 
// we always render the CTA button from API settings
$menu_has_cta = false;

$header_classes = 'developer-header';
$header_classes .= ' developer-menu-' . $menu_layout;
if (!$header_sticky) {
    $header_classes .= ' developer-header-static';
}

// Check for transparent header mode from API
$header_transparent = $api_settings['header_transparent'] ?? get_theme_mod('developer_header_transparent', false);
if ($header_transparent) {
    // Check per-page transparent header setting
    $page_transparent = false;
    if (is_front_page()) {
        $page_transparent = true; // Home page always transparent when global is on
    } elseif (is_page_template('template-about.php')) {
        $page_transparent = !empty($api_settings['page_about_transparent_header']);
    } elseif (is_page_template('template-book-now.php')) {
        $page_transparent = !empty($api_settings['page_rooms_transparent_header']);
    } elseif (is_page_template('template-contact.php')) {
        $page_transparent = !empty($api_settings['page_contact_transparent_header']);
    }
    
    if ($page_transparent) {
        $header_classes .= ' developer-header-transparent';
    }
}

// Helper function to output logo
// $api_logo_image: null = not set by API (use WP fallback), '' = explicitly removed, 'url' = show image
function developer_output_logo($api_logo_image, $site_name, $api_logo_light_image = '') {
    if (!empty($api_logo_image)) : ?>
        <img src="<?php echo esc_url($api_logo_image); ?>" alt="<?php echo esc_attr($site_name); ?>" class="custom-logo developer-logo-default<?php echo !empty($api_logo_light_image) ? ' has-light-variant' : ''; ?>">
        <?php if (!empty($api_logo_light_image)) : ?>
            <img src="<?php echo esc_url($api_logo_light_image); ?>" alt="<?php echo esc_attr($site_name); ?>" class="custom-logo developer-logo-light">
        <?php endif; ?>
    <?php elseif ($api_logo_image === null && has_custom_logo()) :
        // Only fall back to WP custom logo if API never set a logo value
        // If API explicitly set empty string, logo was removed — show text instead
        the_custom_logo();
    else :
        echo esc_html($site_name);
    endif;
}
?>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<header class="<?php echo esc_attr($header_classes); ?>">
    <div class="developer-container">
        <?php if ($menu_layout === 'logo-center') : ?>
            <!-- Logo Center Layout -->
            <div class="developer-header-inner developer-header-center">
                <nav class="developer-nav developer-nav-left">
                    <?php
                    // Use GAS menu items (first half for left side)
                    $half = ceil(count($menu_items) / 2);
                    $left_items = array_slice($menu_items, 0, $half);
                    developer_output_nav_items($left_items);
                    ?>
                </nav>
                
                <a href="<?php echo esc_url(home_url('/')); ?>" class="developer-logo">
                    <?php developer_output_logo($api_logo_image, $site_name, $api_logo_light_image); ?>
                </a>
                
                <nav class="developer-nav developer-nav-right">
                    <?php
                    // Right side items
                    $right_items = array_slice($menu_items, $half);
                    developer_output_nav_items($right_items);
                    ?>
                    <a href="<?php echo esc_url(home_url($cta_link)); ?>" class="developer-nav-cta"><?php echo esc_html($cta_text); ?></a>
                    <?php echo developer_language_switcher(); ?>
               </nav>
                
                <button class="developer-menu-toggle" aria-label="Toggle menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
            
        <?php elseif ($menu_layout === 'stacked') : ?>
            <!-- Stacked Layout -->
            <div class="developer-header-inner developer-header-stacked">
                <a href="<?php echo esc_url(home_url('/')); ?>" class="developer-logo">
                    <?php developer_output_logo($api_logo_image, $site_name, $api_logo_light_image); ?>
                </a>
                
                <button class="developer-menu-toggle" aria-label="Toggle menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                
                <nav class="developer-nav developer-nav-stacked">
                    <?php developer_output_nav_items($menu_items); ?>
                    <?php if (!$menu_has_cta) : ?>
                    <a href="<?php echo esc_url(home_url($cta_link)); ?>" class="developer-nav-cta"><?php echo esc_html($cta_text); ?></a>
                    <?php endif; ?>
                    <?php echo developer_language_switcher(); ?>
                </nav>
            </div>

        <?php else : ?>
            <!-- Default: Logo Left or Logo Right -->
            <div class="developer-header-inner <?php echo $menu_layout === 'logo-right' ? 'developer-header-reversed' : ''; ?>">
                <a href="<?php echo esc_url(home_url('/')); ?>" class="developer-logo">
                    <?php developer_output_logo($api_logo_image, $site_name, $api_logo_light_image); ?>
                </a>
                
                <button class="developer-menu-toggle" aria-label="Toggle menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                
                <nav class="developer-nav">
                    <?php developer_output_nav_items($menu_items); ?>
                    <?php if (!$menu_has_cta) : ?>
                    <a href="<?php echo esc_url(home_url($cta_link)); ?>" class="developer-nav-cta"><?php echo esc_html($cta_text); ?></a>
                    <?php endif; ?>
                    <?php echo developer_language_switcher(); ?>
                </nav>
            </div>
        <?php endif; ?>
    </div>
</header>

<main id="main-content">
