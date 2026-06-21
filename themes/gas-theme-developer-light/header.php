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
    <?php
    // Auto-generated SVG favicon — uses site initials + primary brand colour.
    // Only emitted if no custom favicon is set in API settings (so client uploads win).
    // Initials: first letter of each word in the site name, max 2 chars.
    // Pull API settings here (the global $api_settings is set further down in this
    // file, after <head>, so we can't rely on it at this point).
    $favicon_api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();
    $custom_favicon = $favicon_api['header_favicon'] ?? '';
    if (empty($custom_favicon)) {
        $auto_site_name = trim(wp_strip_all_tags(get_bloginfo('name')));
        $auto_words = preg_split('/\s+/', $auto_site_name);
        $auto_initials = '';
        foreach ($auto_words as $w) {
            if (strlen($w) === 0) continue;
            if (in_array(strtolower($w), array('the', 'a', 'an', 'of', 'at', 'in', 'on', '&', 'and'))) continue;
            $auto_initials .= mb_strtoupper(mb_substr($w, 0, 1));
            if (mb_strlen($auto_initials) >= 2) break;
        }
        if (mb_strlen($auto_initials) < 1) {
            $auto_initials = mb_strtoupper(mb_substr($auto_site_name, 0, 2));
        }
        $auto_bg = $favicon_api['btn_primary_bg'] ?? $favicon_api['primary_color'] ?? $favicon_api['accent_color'] ?? '#2563eb';
        $auto_fg = $favicon_api['btn_primary_text'] ?? '#ffffff';
        $auto_size = mb_strlen($auto_initials) >= 2 ? 32 : 40;
        $auto_svg = sprintf(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" ry="10" fill="%s"/><text x="32" y="32" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif" font-size="%d" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="%s">%s</text></svg>',
            esc_attr($auto_bg),
            $auto_size,
            esc_attr($auto_fg),
            esc_html($auto_initials)
        );
        $auto_data_uri = 'data:image/svg+xml;base64,' . base64_encode($auto_svg);
        echo "\n    <link rel=\"icon\" type=\"image/svg+xml\" href=\"" . esc_attr($auto_data_uri) . "\">\n";
        echo "    <link rel=\"apple-touch-icon\" href=\"" . esc_attr($auto_data_uri) . "\">\n";
    }
    ?>
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
    echo "\n=== CTA DEBUG ===\n";
    echo "cta_text: " . var_export($api_settings['cta_text'] ?? 'NOT SET', true) . "\n";
    echo "cta_link: " . var_export($api_settings['cta_link'] ?? 'NOT SET', true) . "\n";
    echo "cta_bg: " . var_export($api_settings['cta_bg'] ?? 'NOT SET', true) . "\n";
    echo "\n=== RAW HERO SETTINGS ===\n";
    if (isset($api_settings['_debug_hero'])) {
        print_r($api_settings['_debug_hero']);
    } else {
        echo "(not available - add _debug_hero to developer_get_api_settings)\n";
    }
    echo '</pre>';
}

$cta_text = $api_settings['cta_text'] ?? get_theme_mod('developer_header_cta_label', 'Book Now');
$cta_link_raw = $api_settings['cta_link'] ?? get_theme_mod('developer_header_cta_link', '/book-now/');
$cta_is_external = preg_match('#^https?://#i', $cta_link_raw);
$cta_link = $cta_is_external ? $cta_link_raw : home_url($cta_link_raw);
$cta_target = $cta_is_external ? ' target="_blank" rel="noopener noreferrer"' : '';

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

// Shop
if (!empty($api_settings['page_shop_enabled'])) {
    $menu_items[] = array(
        'title' => $api_settings['page_shop_menu_title'] ?? 'Shop',
        'url' => home_url('/shop/'),
        'order' => $api_settings['page_shop_menu_order'] ?? 9,
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

// Custom pages from Web Builder
$custom_pages = $api_settings['custom_pages'] ?? array();
$custom_page_settings = $api_settings['custom_page_settings'] ?? array();
foreach ($custom_pages as $cp) {
    $cp_slug = $cp['slug'] ?? '';
    // Per-page settings (page-custom-{slug}) override the registry — the
    // registry is set at create time, the per-page settings reflect later
    // user toggles. Walnut Canyon's free-guide-landing-page was disabled
    // (visibility=hidden + enabled=false) but the registry still said
    // visibility=menu, so the menu item kept showing. (2026-05-22.)
    $cp_settings = $custom_page_settings[$cp_slug] ?? array();
    $cp_enabled_raw = $cp_settings['enabled'] ?? true;
    $cp_is_enabled = ($cp_enabled_raw === true || $cp_enabled_raw === 'true' || $cp_enabled_raw === '1' || $cp_enabled_raw === 'on');
    if (!$cp_is_enabled) continue;
    $cp_visibility = $cp_settings['visibility'] ?? $cp['visibility'] ?? 'menu';
    if ($cp_visibility === 'hidden') continue;
    // Read menu-order from per-page settings (page-custom-{slug} section)
    $cp_order = $cp_settings['menu-order'] ?? $cp['menu_order'] ?? 10;
    $cp_parent = $cp_settings['parent'] ?? $cp['parent'] ?? '';
    $cp_title = '';
    if (function_exists('developer_get_ml_value')) {
        $cp_title = developer_get_ml_value($cp_settings, 'menu_title', $lang);
    }
    if (empty($cp_title)) {
        $cp_title = $cp_settings['menu-title-en'] ?? $cp['title'] ?? ucfirst($cp_slug);
    }
    // External URL override — when the operator pastes a custom URL on
    // the page (e.g. /room/?unit_id=1220&guests=1 to point a "Tudor Room"
    // sub-page at the gas-room shortcode with the unit pre-selected),
    // use that instead of the auto-generated slug URL. Absolute URLs
    // pass through unchanged; relative paths get prefixed with home_url.
    // Without this, custom URLs were silently ignored and the menu link
    // resolved to /<slug>/ which often 404s because there's no real
    // WordPress page at that path (2026-06-21 — Talwood / Marie).
    $cp_external = trim((string)(
        $cp_settings['external-url'] ?? $cp_settings['external_url']
        ?? $cp['external_url'] ?? $cp['external-url'] ?? ''
    ));
    if ($cp_external !== '') {
        $cp_url = preg_match('#^https?://#i', $cp_external)
            ? $cp_external
            : home_url(($cp_external[0] === '/') ? $cp_external : '/' . $cp_external);
    } else {
        $cp_url = home_url('/' . $cp_slug . '/');
    }
    $menu_items[] = array(
        'title' => $cp_title,
        'url' => $cp_url,
        'order' => $cp_order,
        'enabled' => true,
        'parent' => $cp_parent,
        'is_submenu' => ($cp_visibility === 'submenu')
    );
}

// Sort menu items by order
usort($menu_items, function($a, $b) {
    return intval($a['order'] ?? 99) - intval($b['order'] ?? 99);
});

// De-duplicate menu items by URL
$seen_urls = array();
$menu_items = array_filter($menu_items, function($item) use (&$seen_urls) {
    $url = trailingslashit($item['url'] ?? '');
    if (isset($seen_urls[$url])) return false;
    $seen_urls[$url] = true;
    return true;
});

// Helper function to output menu items (with dropdown support for sub-menu items)
function developer_output_nav_items($menu_items) {
    $current_url = trailingslashit(home_url(add_query_arg(array(), $GLOBALS['wp']->request)));

    // Group children by parent slug
    $children = array();
    $top_level = array();
    foreach ($menu_items as $item) {
        if (!empty($item['is_submenu']) && !empty($item['parent'])) {
            $children[$item['parent']][] = $item;
        } else {
            $top_level[] = $item;
        }
    }

    // Map top-level items by their URL slug for parent matching
    $slug_map = array();
    // Title alias — operators set parent to the page TITLE (e.g. "rooms")
    // but the URL slug may differ (the Rooms menu item links to /book-now/
    // so its slug is "book-now"). Without this alias the child silently
    // pops to top-level — exactly Marie's 2026-06-21 ticket where Tudor
    // Room sat next to Rooms instead of under it.
    $title_to_slug = array();
    foreach ($top_level as $item) {
        $slug = trim(str_replace(home_url(), '', $item['url']), '/');
        $slug_map[$slug] = true;
        $title_to_slug[strtolower(trim($item['title'] ?? ''))] = $slug;
    }
    // Re-key children so a parent set as title resolves to the matching
    // top-level item's actual slug. Original-key children still work.
    $normalised_children = array();
    foreach ($children as $parent_key => $kids) {
        $resolved = isset($title_to_slug[strtolower($parent_key)])
            ? $title_to_slug[strtolower($parent_key)]
            : $parent_key;
        if (!isset($normalised_children[$resolved])) $normalised_children[$resolved] = array();
        $normalised_children[$resolved] = array_merge($normalised_children[$resolved], $kids);
    }
    $children = $normalised_children;

    // Output top-level items, wrapping parents in dropdowns
    foreach ($top_level as $item) {
        $slug = trim(str_replace(home_url(), '', $item['url']), '/');
        $is_active = '';
        if (!empty($item['is_home']) && is_front_page()) {
            $is_active = ' class="active"';
        } elseif (trailingslashit($item['url']) === $current_url) {
            $is_active = ' class="active"';
        }

        if (!empty($children[$slug])) {
            // Parent with children — render dropdown
            echo '<div class="developer-nav-dropdown">';
            echo '<a href="' . esc_url($item['url']) . '" class="developer-nav-parent">' . esc_html($item['title']) . ' <span class="developer-nav-arrow">▾</span></a>';
            echo '<div class="developer-nav-submenu">';
            foreach ($children[$slug] as $child) {
                $child_active = (trailingslashit($child['url']) === $current_url) ? ' class="active"' : '';
                echo '<a href="' . esc_url($child['url']) . '"' . $child_active . '>' . esc_html($child['title']) . '</a>';
            }
            echo '</div></div>';
        } else {
            // Regular item
            echo '<a href="' . esc_url($item['url']) . '"' . $is_active . '>' . esc_html($item['title']) . '</a>';
        }
    }

    // Output orphaned sub-menu items (parent doesn't exist) as flat links
    foreach ($children as $parent_slug => $kids) {
        if (empty($slug_map[$parent_slug])) {
            foreach ($kids as $child) {
                $child_active = (trailingslashit($child['url']) === $current_url) ? ' class="active"' : '';
                echo '<a href="' . esc_url($child['url']) . '"' . $child_active . '>' . esc_html($child['title']) . '</a>';
            }
        }
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
                    <a href="<?php echo esc_url($cta_link); ?>" class="developer-nav-cta"<?php echo $cta_target; ?>><?php echo esc_html($cta_text); ?></a>
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
                    <a href="<?php echo esc_url($cta_link); ?>" class="developer-nav-cta"<?php echo $cta_target; ?>><?php echo esc_html($cta_text); ?></a>
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
                    <a href="<?php echo esc_url($cta_link); ?>" class="developer-nav-cta"<?php echo $cta_target; ?>><?php echo esc_html($cta_text); ?></a>
                    <?php endif; ?>
                    <?php echo developer_language_switcher(); ?>
                </nav>
            </div>
        <?php endif; ?>
    </div>
</header>

<main id="main-content">
