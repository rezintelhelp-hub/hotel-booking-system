<?php
/**
 * Homepage Template
 *
 * @package GAS_Developer
 */

get_header();

// Get API settings (overrides theme_mod values)
$api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();

// Hero settings (with API override)
$hero_bg = $api['hero_image'] ?? get_theme_mod('developer_hero_bg', '');
$hero_video_url = $api['hero_video_url'] ?? get_theme_mod('developer_hero_video_url', '');
$hero_background_type = $api['hero_background_type'] ?? get_theme_mod('developer_hero_background_type', 'image');
$hero_slide_1 = $api['hero_slide_1'] ?? get_theme_mod('developer_hero_slide_1', '');
$hero_slide_2 = $api['hero_slide_2'] ?? get_theme_mod('developer_hero_slide_2', '');
$hero_slide_3 = $api['hero_slide_3'] ?? get_theme_mod('developer_hero_slide_3', '');
$hero_slide_4 = $api['hero_slide_4'] ?? get_theme_mod('developer_hero_slide_4', '');
$hero_slider_duration = $api['hero_slider_duration'] ?? get_theme_mod('developer_hero_slider_duration', '5000');
$hero_slider_transition = $api['hero_slider_transition'] ?? get_theme_mod('developer_hero_slider_transition', 'fade');
$hero_badge = $api['hero_badge'] ?? get_theme_mod('developer_hero_badge', 'Welcome to Paradise');
$hero_show_badge = $api['hero_show_badge'] ?? true;
if (!$hero_show_badge || $hero_show_badge === 'false' || $hero_show_badge === false) {
    $hero_badge = '';
}
$hero_badge_link = $api['hero_badge_link'] ?? get_theme_mod('developer_hero_badge_link', '');
$hero_badge_bg = $api['hero_badge_bg'] ?? get_theme_mod('developer_hero_badge_bg', 'rgba(255,255,255,0.15)');
$hero_badge_text = $api['hero_badge_text'] ?? get_theme_mod('developer_hero_badge_text', '#ffffff');
$hero_badge_border = $api['hero_badge_border'] ?? get_theme_mod('developer_hero_badge_border', 'rgba(255,255,255,0.3)');
$hero_title = $api['hero_title'] ?? get_theme_mod('developer_hero_title', 'Find Your Perfect Vacation Rental');
$hero_subtitle = $api['hero_subtitle'] ?? get_theme_mod('developer_hero_subtitle', 'Discover stunning vacation rentals with luxury amenities, prime locations, and unforgettable experiences.');
$hero_opacity = $api['hero_overlay_opacity'] ?? get_theme_mod('developer_hero_opacity', 30);
$hero_overlay_color = $api['hero_overlay_color'] ?? get_theme_mod('developer_hero_overlay_color', '#0f172a');
$hero_title_color = $api['hero_title_color'] ?? '#ffffff';
$hero_subtitle_color = $api['hero_subtitle_color'] ?? 'rgba(255,255,255,0.9)';

// Search widget settings (with API override)
$search_bg = $api['hero_search_bg'] ?? get_theme_mod('developer_search_bg', '#ffffff');
$search_opacity = $api['hero_search_opacity'] ?? get_theme_mod('developer_search_opacity', 100);
$search_radius = $api['hero_search_radius'] ?? get_theme_mod('developer_search_radius', '16');
$search_btn_bg = $api['hero_search_btn_bg'] ?? get_theme_mod('developer_hero_search_btn_bg', '#2563eb');
$search_btn_text = $api['hero_search_btn_text'] ?? get_theme_mod('developer_hero_search_btn_text', '#ffffff');
$search_label_color = $api['hero_search_label_color'] ?? get_theme_mod('developer_hero_search_label_color', '#374151');
$search_below_text = $api['hero_search_below_text'] ?? get_theme_mod('developer_search_below_text', '');
$search_max_width = $api['hero_search_max_width'] ?? get_theme_mod('developer_search_max_width', '900');
$search_padding = $api['hero_search_padding'] ?? get_theme_mod('developer_search_padding', '24');
$search_scale = $api['hero_search_scale'] ?? get_theme_mod('developer_search_scale', '100');

// Search label translations (with API override)
$search_checkin_label = $api['hero_search_checkin_label'] ?? '';
$search_checkout_label = $api['hero_search_checkout_label'] ?? '';
$search_guests_label = $api['hero_search_guests_label'] ?? '';
$search_btn_label = $api['hero_search_btn_label'] ?? '';
$search_date_placeholder = $api['hero_search_date_placeholder'] ?? '';
$search_guest_singular = $api['hero_search_guest_singular'] ?? '';

// Hero trust badges (with API override)
$hero_badge_1 = $api['hero_trust_1'] ?? get_theme_mod('developer_hero_trust_1', 'Instant Booking');
$hero_badge_2 = $api['hero_trust_2'] ?? get_theme_mod('developer_hero_trust_2', 'Best Price Guarantee');
$hero_badge_3 = $api['hero_trust_3'] ?? get_theme_mod('developer_hero_trust_3', '24/7 Support');
$hero_trust_text_color = get_theme_mod('developer_hero_trust_text_color', '#ffffff');

// Intro section settings (with API override)
$intro_enabled = $api['intro_enabled'] ?? get_theme_mod('developer_intro_enabled', true);
$intro_bg = $api['intro_bg'] ?? get_theme_mod('developer_intro_bg', '#ffffff');
$intro_text_color = $api['intro_text_color'] ?? get_theme_mod('developer_intro_text_color', '#1e293b');
$intro_title = $api['intro_title'] ?? get_theme_mod('developer_intro_title', 'Welcome to Our Property');
$intro_title_size = get_theme_mod('developer_intro_title_size', '36');
$intro_text = $api['intro_text'] ?? get_theme_mod('developer_intro_text', 'We are delighted to have you here. Explore our beautiful accommodations and find your perfect stay.');
$intro_text_size = get_theme_mod('developer_intro_text_size', '18');
$intro_max_width = get_theme_mod('developer_intro_max_width', '800');
$intro_btn_text = $api['intro_btn_text'] ?? get_theme_mod('developer_intro_btn_text', '');
$intro_btn_url = $api['intro_btn_url'] ?? get_theme_mod('developer_intro_btn_url', '');
$intro_btn_bg = $api['intro_btn_bg'] ?? get_theme_mod('developer_intro_btn_bg', '#2563eb');
$intro_btn_text_color = $api['intro_btn_text_color'] ?? get_theme_mod('developer_intro_btn_text_color', '#ffffff');

// Featured properties settings (with API override)
$featured_enabled = $api['featured_enabled'] ?? get_theme_mod('developer_featured_enabled', true);
$featured_mode = $api['featured_mode'] ?? get_theme_mod('developer_featured_mode', 'all');
$featured_count = $api['featured_count'] ?? get_theme_mod('developer_featured_count', '3');
$featured_ids = $api['featured_ids'] ?? get_theme_mod('developer_featured_ids', '');
$featured_columns = $api['featured_columns'] ?? get_theme_mod('developer_featured_columns', '3');
$featured_layout_style = $api['featured_layout_style'] ?? get_theme_mod('developer_featured_layout_style', 'auto');
$featured_title = $api['featured_title'] ?? get_theme_mod('developer_featured_title', 'Featured Properties');
$featured_subtitle = $api['featured_subtitle'] ?? get_theme_mod('developer_featured_subtitle', 'Discover our handpicked selection of stunning vacation rentals, each offering unique experiences and exceptional comfort.');
$featured_btn_enabled = $api['featured_btn_enabled'] ?? get_theme_mod('developer_featured_btn_enabled', true);
$featured_btn_text = $api['featured_btn_text'] ?? get_theme_mod('developer_featured_btn_text', 'View All Properties');
$featured_btn_url = $api['featured_btn_url'] ?? get_theme_mod('developer_featured_btn_url', '/book-now/');
$featured_btn_bg = $api['featured_btn_bg'] ?? $api['btn_primary_bg'] ?? get_theme_mod('developer_featured_btn_bg', '#2563eb');
$featured_btn_text_color = $api['featured_btn_text_color'] ?? $api['btn_primary_text'] ?? get_theme_mod('developer_featured_btn_text_color', '#ffffff');
$featured_bg = $api['featured_bg'] ?? get_theme_mod('developer_featured_bg', '#ffffff');
$featured_title_color = $api['featured_title_color'] ?? get_theme_mod('developer_featured_title_color', '#1e293b');
$featured_subtitle_color = $api['featured_subtitle_color'] ?? get_theme_mod('developer_featured_subtitle_color', '#64748b');

// USP "What We Offer" section settings (with API override)
$usp_enabled = $api['usp_enabled'] ?? false;
$usp_title = $api['usp_title'] ?? '';
$usp_subtitle = $api['usp_subtitle'] ?? '';
$usp_bg = $api['usp_bg'] ?? '#f1f0eb';
$usp_title_color = $api['usp_title_color'] ?? '#1e293b';
$usp_text_color = $api['usp_text_color'] ?? '#64748b';
$usp_card_bg = $api['usp_card_bg'] ?? '#ffffff';
$usp_card_title_size = $api['usp_card_title_size'] ?? '18';
$usp_items = array();
for ($i = 1; $i <= 6; $i++) {
    $icon = $api["usp_item_{$i}_icon"] ?? '';
    $image = $api["usp_item_{$i}_image"] ?? '';
    $title = $api["usp_item_{$i}_title"] ?? '';
    $text = $api["usp_item_{$i}_text"] ?? '';
    if ($text || $title || $icon || $image) {
        $usp_items[] = array('icon' => $icon, 'image' => $image, 'title' => $title, 'text' => $text);
    }
}

// About settings (with API override)
$about_enabled = $api['about_enabled'] ?? get_theme_mod('developer_about_enabled', true);
$about_image = $api['about_image'] ?? get_theme_mod('developer_about_image', '');
$about_image_2 = $api['about_image_2'] ?? get_theme_mod('developer_about_image_2', '');
$about_image_3 = $api['about_image_3'] ?? get_theme_mod('developer_about_image_3', '');
$about_image_4 = $api['about_image_4'] ?? get_theme_mod('developer_about_image_4', '');
$about_images = array_filter(array($about_image, $about_image_2, $about_image_3, $about_image_4));
$about_title = $api['about_title'] ?? get_theme_mod('developer_about_title', 'Experience Luxury & Comfort');
$about_title_size = get_theme_mod('developer_about_title_size', '36');
$about_text = $api['about_text'] ?? get_theme_mod('developer_about_text', 'Our carefully curated collection of vacation rentals offers the perfect blend of luxury, comfort, and convenience. Whether you\'re planning a family reunion, a getaway with friends, or a romantic escape, we have the ideal property for you.');
$about_text_size = get_theme_mod('developer_about_text_size', '16');
$about_layout = $api['about_layout'] ?? get_theme_mod('developer_about_layout', 'image-left');
$about_btn_text = $api['about_btn_text'] ?? get_theme_mod('developer_about_btn_text', 'Learn More');
$about_btn_url = $api['about_btn_url'] ?? get_theme_mod('developer_about_btn_url', '/about/');
$about_btn_bg = $api['about_btn_bg'] ?? get_theme_mod('developer_about_btn_bg', '#2563eb');
$about_btn_text_color = $api['about_btn_text_color'] ?? get_theme_mod('developer_about_btn_text_color', '#ffffff');
$about_bg = $api['about_bg'] ?? get_theme_mod('developer_about_bg', '#f8fafc');
$about_title_color = $api['about_title_color'] ?? get_theme_mod('developer_about_title_color', '#1e293b');
$about_text_color = $api['about_text_color'] ?? get_theme_mod('developer_about_text_color', '#475569');

// About features (editable) - with API multilingual override
$about_feature_1 = $api['about_feature_1'] ?? get_theme_mod('developer_about_feature_1', 'Spacious Bedrooms');
$about_feature_2 = $api['about_feature_2'] ?? get_theme_mod('developer_about_feature_2', 'Luxury Bathrooms');
$about_feature_3 = $api['about_feature_3'] ?? get_theme_mod('developer_about_feature_3', 'Prime Locations');
$about_feature_4 = $api['about_feature_4'] ?? get_theme_mod('developer_about_feature_4', 'Full Amenities');
$about_feature_5 = $api['about_feature_5'] ?? get_theme_mod('developer_about_feature_5', 'Entertainment Areas');
$about_feature_6 = $api['about_feature_6'] ?? get_theme_mod('developer_about_feature_6', 'Private Parking');

// Calculate overlay opacity (convert percentage to decimal)
$overlay_opacity = $hero_opacity / 100;

// Convert hex to RGB for rgba
$hex = ltrim($hero_overlay_color, '#');
$r = hexdec(substr($hex, 0, 2));
$g = hexdec(substr($hex, 2, 2));
$b = hexdec(substr($hex, 4, 2));

// Convert search bg hex to RGB for opacity
$search_hex = ltrim($search_bg, '#');
$sr = hexdec(substr($search_hex, 0, 2));
$sg = hexdec(substr($search_hex, 2, 2));
$sb = hexdec(substr($search_hex, 4, 2));
$search_bg_rgba = "rgba($sr, $sg, $sb, " . ($search_opacity / 100) . ")";
?>

<!-- Hero Section -->
<section class="developer-hero" <?php if ($hero_background_type === 'slider') : ?>data-slider-duration="<?php echo esc_attr($hero_slider_duration); ?>" data-slider-transition="<?php echo esc_attr($hero_slider_transition); ?>"<?php endif; ?>>
    <?php if ($hero_video_url && $hero_background_type === 'video') : ?>
        <!-- Video Background -->
        <video class="developer-hero-video" autoplay muted loop playsinline>
            <source src="<?php echo esc_url($hero_video_url); ?>" type="video/mp4">
        </video>
        <?php if ($hero_bg) : ?>
            <!-- Fallback image for mobile/slow connections -->
            <div class="developer-hero-bg developer-hero-bg-fallback" style="background-image: url('<?php echo esc_url($hero_bg); ?>');"></div>
        <?php endif; ?>
    <?php elseif ($hero_background_type === 'slider') : ?>
        <!-- Image Slider Background -->
        <?php 
        $slides = array_filter([$hero_slide_1, $hero_slide_2, $hero_slide_3, $hero_slide_4]);
        if (!empty($slides)) : ?>
            <div class="developer-hero-slider">
                <?php foreach ($slides as $index => $slide_url) : ?>
                    <div class="developer-hero-slide <?php echo $index === 0 ? 'active' : ''; ?>" style="background-image: url('<?php echo esc_url($slide_url); ?>');"></div>
                <?php endforeach; ?>
            </div>
        <?php elseif ($hero_bg) : ?>
            <div class="developer-hero-bg" style="background-image: url('<?php echo esc_url($hero_bg); ?>');"></div>
        <?php endif; ?>
    <?php elseif ($hero_bg) : ?>
        <div class="developer-hero-bg" style="background-image: url('<?php echo esc_url($hero_bg); ?>');"></div>
    <?php endif; ?>
    <div class="developer-hero-overlay" style="background: rgba(<?php echo "$r, $g, $b"; ?>, <?php echo esc_attr($overlay_opacity); ?>);"></div>
    
    <div class="developer-hero-content">
        <?php if ($hero_badge) : ?>
            <?php if ($hero_badge_link) : ?>
                <a href="<?php echo esc_url($hero_badge_link); ?>" class="developer-hero-badge" style="background: <?php echo esc_attr($hero_badge_bg); ?>; color: <?php echo esc_attr($hero_badge_text); ?>; border-color: <?php echo esc_attr($hero_badge_border); ?>; text-decoration: none;"><?php echo esc_html($hero_badge); ?></a>
            <?php else : ?>
                <span class="developer-hero-badge" style="background: <?php echo esc_attr($hero_badge_bg); ?>; color: <?php echo esc_attr($hero_badge_text); ?>; border-color: <?php echo esc_attr($hero_badge_border); ?>;"><?php echo esc_html($hero_badge); ?></span>
            <?php endif; ?>
        <?php endif; ?>
        
        <h1 style="color: <?php echo esc_attr($hero_title_color); ?>;"><?php echo esc_html($hero_title); ?></h1>
        <p class="developer-hero-subtitle" style="color: <?php echo esc_attr($hero_subtitle_color); ?>;"><?php echo esc_html($hero_subtitle); ?></p>
        
        <!-- GAS Search Widget with custom styling -->
        <div class="developer-search-wrapper" style="background: <?php echo esc_attr($search_bg_rgba); ?>; border-radius: <?php echo esc_attr($search_radius); ?>px; max-width: <?php echo esc_attr($search_max_width); ?>px; transform: scale(<?php echo esc_attr($search_scale / 100); ?>); transform-origin: center top;">
            <?php if (shortcode_exists('gas_search')) : ?>
                <?php 
                $sc_attrs = 'layout="horizontal" max_width="100%" primary_color="' . esc_attr($search_btn_bg) . '" text_color="' . esc_attr($search_btn_text) . '" label_color="' . esc_attr($search_label_color) . '" background_color="transparent"';
                if (!empty($search_checkin_label)) $sc_attrs .= ' checkin_label="' . esc_attr($search_checkin_label) . '"';
                if (!empty($search_checkout_label)) $sc_attrs .= ' checkout_label="' . esc_attr($search_checkout_label) . '"';
                if (!empty($search_guests_label)) $sc_attrs .= ' guests_label="' . esc_attr($search_guests_label) . '"';
                if (!empty($search_btn_label)) $sc_attrs .= ' button_text="' . esc_attr($search_btn_label) . '"';
                if (!empty($search_date_placeholder)) $sc_attrs .= ' date_placeholder="' . esc_attr($search_date_placeholder) . '"';
                if (!empty($search_guest_singular)) $sc_attrs .= ' guest_singular="' . esc_attr($search_guest_singular) . '"';
                echo do_shortcode('[gas_search ' . $sc_attrs . ']'); 
                ?>
            <?php else : ?>
                <div style="padding: 24px 32px; text-align: center;">
                    <p style="margin: 0; color: #64748b;">Search widget will appear here when GAS Booking plugin is activated.</p>
                </div>
            <?php endif; ?>
        </div>
        
        <?php if ($search_below_text) : ?>
            <p class="developer-search-below-text"><?php echo esc_html($search_below_text); ?></p>
        <?php endif; ?>
        
        <?php if ($hero_badge_1 || $hero_badge_2 || $hero_badge_3) : ?>
        <div class="developer-hero-features" style="color: <?php echo esc_attr($hero_trust_text_color); ?>;">
            <?php if ($hero_badge_1) : ?>
            <div class="developer-hero-feature">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span><?php echo esc_html($hero_badge_1); ?></span>
            </div>
            <?php endif; ?>
            <?php if ($hero_badge_2) : ?>
            <div class="developer-hero-feature">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span><?php echo esc_html($hero_badge_2); ?></span>
            </div>
            <?php endif; ?>
            <?php if ($hero_badge_3) : ?>
            <div class="developer-hero-feature">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                <span><?php echo esc_html($hero_badge_3); ?></span>
            </div>
            <?php endif; ?>
        </div>
        <?php endif; ?>
    </div>
</section>

<?php if ($intro_enabled && ($intro_title || $intro_text)) : ?>
<!-- Intro Section -->
<section class="developer-section developer-intro" style="background: <?php echo esc_attr($intro_bg); ?>; color: <?php echo esc_attr($intro_text_color); ?>;">
    <div class="developer-container">
        <div class="developer-intro-content" style="max-width: <?php echo esc_attr($intro_max_width); ?>px;">
            <?php if ($intro_title) : ?>
                <h2 style="color: <?php echo esc_attr($intro_text_color); ?>; font-size: <?php echo esc_attr($intro_title_size); ?>px;"><?php echo esc_html($intro_title); ?></h2>
            <?php endif; ?>
            <?php if ($intro_text) : ?>
                <p style="font-size: <?php echo esc_attr($intro_text_size); ?>px;"><?php echo nl2br(esc_html($intro_text)); ?></p>
            <?php endif; ?>
            <?php 
            $intro_show_btn = $api['intro_show_btn'] ?? null;
            if ($intro_show_btn && $intro_show_btn !== 'false' && $intro_btn_text && $intro_btn_url) : ?>
                <a href="<?php echo esc_url($intro_btn_url); ?>" class="developer-btn" style="background: <?php echo esc_attr($intro_btn_bg); ?>; color: <?php echo esc_attr($intro_btn_text_color); ?>;"><?php echo esc_html($intro_btn_text); ?></a>
            <?php endif; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php if ($featured_enabled) : ?>
<!-- Featured Properties -->
<section class="developer-section developer-featured" style="background-color: <?php echo esc_attr($featured_bg); ?>;">
    <div class="developer-container">
        <div class="developer-section-header">
            <h2 style="color: <?php echo esc_attr($featured_title_color); ?>;"><?php echo esc_html($featured_title); ?></h2>
            <p style="color: <?php echo esc_attr($featured_subtitle_color); ?>;"><?php echo esc_html($featured_subtitle); ?></p>
        </div>
        
        <?php 
        // Build shortcode based on display mode
        if (shortcode_exists('gas_rooms')) :
            // Let plugin handle layout based on actual room count (auto mode)
            // Plugin will use row for 1-2 rooms, grid for 3+
            $shortcode = '[gas_rooms columns="' . esc_attr($featured_columns) . '" show_map="false" layout="auto"';
            
            if ($featured_mode === 'specific' && !empty($featured_ids)) {
                $shortcode .= ' room_ids="' . esc_attr($featured_ids) . '"';
            } elseif ($featured_mode === 'random') {
                $shortcode .= ' limit="' . esc_attr($featured_count) . '" random="true"';
            } else {
                $shortcode .= ' limit="' . esc_attr($featured_count) . '"';
            }
            
            $shortcode .= ']';
            echo do_shortcode($shortcode);
        else : ?>
            <div style="text-align: center; padding: 60px; background: #f8fafc; border-radius: 12px;">
                <p style="color: #64748b; margin: 0;">Property listings will appear here when GAS Booking plugin is activated.</p>
            </div>
        <?php endif; ?>
        
        <?php if ($featured_btn_enabled && $featured_btn_text) : ?>
        <div class="text-center mt-5">
            <a href="<?php echo esc_url(home_url($featured_btn_url)); ?>" class="developer-btn" style="background: <?php echo esc_attr($featured_btn_bg); ?> !important; color: <?php echo esc_attr($featured_btn_text_color); ?> !important;"><?php echo esc_html($featured_btn_text); ?></a>
        </div>
        <?php endif; ?>
    </div>
</section>
<?php endif; ?>

<?php if ($usp_enabled && count($usp_items) > 0) : ?>
<!-- USP / What We Offer Section -->
<section class="developer-section developer-usp" style="background: <?php echo esc_attr($usp_bg); ?>; --usp-card-title-size: <?php echo esc_attr($usp_card_title_size); ?>px;">
    <div class="developer-container">
        <?php if ($usp_title) : ?>
            <h2 class="developer-section-title" style="color: <?php echo esc_attr($usp_title_color); ?>;"><?php echo esc_html($usp_title); ?></h2>
        <?php endif; ?>
        <?php if ($usp_subtitle) : ?>
            <p class="developer-section-subtitle" style="color: <?php echo esc_attr($usp_text_color); ?>;"><?php echo esc_html($usp_subtitle); ?></p>
        <?php endif; ?>

        <div class="developer-usp-grid" style="grid-template-columns: repeat(<?php echo min(count($usp_items), 3); ?>, 1fr);">
            <?php foreach ($usp_items as $item) : ?>
                <div class="developer-usp-card" style="background: <?php echo esc_attr($usp_card_bg); ?>;">
                    <?php if (!empty($item['image'])) : ?>
                        <div class="developer-usp-icon">
                            <img src="<?php echo esc_url($item['image']); ?>" alt="">
                        </div>
                    <?php elseif (!empty($item['icon'])) : ?>
                        <div class="developer-usp-icon">
                            <span style="font-size: 3rem;"><?php echo $item['icon']; ?></span>
                        </div>
                    <?php endif; ?>
                    <?php if (!empty($item['title'])) : ?>
                        <p class="usp-card-title" style="color: <?php echo esc_attr($usp_title_color); ?>;"><?php echo esc_html($item['title']); ?></p>
                    <?php endif; ?>
                    <?php if (!empty($item['text'])) : ?>
                        <p class="usp-card-desc" style="color: <?php echo esc_attr($usp_text_color); ?>;"><?php echo nl2br(esc_html($item['text'])); ?></p>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php if ($about_enabled) : ?>
<!-- About Section -->
<section class="developer-section developer-section-alt" style="background-color: <?php echo esc_attr($about_bg); ?>;">
    <div class="developer-container">
        <div class="developer-about <?php echo esc_attr('developer-about-' . $about_layout); ?>">
            <div class="developer-about-image">
                <?php if (count($about_images) > 1) : ?>
                    <div class="developer-about-slides">
                        <?php foreach (array_values($about_images) as $idx => $img) : ?>
                            <div class="developer-about-slide<?php echo $idx === 0 ? ' active' : ''; ?>">
                                <img src="<?php echo esc_url($img); ?>" alt="<?php echo esc_attr($about_title); ?>">
                            </div>
                        <?php endforeach; ?>
                    </div>
                    <div class="developer-about-dots">
                        <?php foreach (array_values($about_images) as $idx => $img) : ?>
                            <button class="developer-about-dot<?php echo $idx === 0 ? ' active' : ''; ?>" type="button"></button>
                        <?php endforeach; ?>
                    </div>
                <?php elseif ($about_image) : ?>
                    <img src="<?php echo esc_url($about_image); ?>" alt="<?php echo esc_attr($about_title); ?>">
                <?php else : ?>
                    <div style="width: 100%; height: 500px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px; border-radius: 16px;">🏠</div>
                <?php endif; ?>
            </div>
            
            <div class="developer-about-content">
                <h2 style="font-size: <?php echo esc_attr($about_title_size); ?>px; color: <?php echo esc_attr($about_title_color); ?>;"><?php echo esc_html($about_title); ?></h2>
                <p style="font-size: <?php echo esc_attr($about_text_size); ?>px; color: <?php echo esc_attr($about_text_color); ?>;"><?php echo nl2br(esc_html($about_text)); ?></p>
                
                <div class="developer-features-list">
                    <?php 
                    $features = array($about_feature_1, $about_feature_2, $about_feature_3, $about_feature_4, $about_feature_5, $about_feature_6);
                    foreach ($features as $feature) :
                        if (!empty($feature)) :
                    ?>
                    <div class="developer-feature-item">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                        <span><?php echo esc_html($feature); ?></span>
                    </div>
                    <?php 
                        endif;
                    endforeach; 
                    ?>
                </div>
                
                <?php 
                $about_show_btn = $api['about_show_btn'] ?? true;
                if ($about_show_btn && $about_show_btn !== 'false' && $about_btn_text) : ?>
                <div class="mt-4">
                    <a href="<?php echo esc_url(home_url($about_btn_url)); ?>" class="developer-btn" style="background: <?php echo esc_attr($about_btn_bg); ?>; color: <?php echo esc_attr($about_btn_text_color); ?>;"><?php echo esc_html($about_btn_text); ?></a>
                </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
<?php if (count($about_images) > 1) : ?>
<script>
(function() {
    var slides = document.querySelectorAll('.developer-about-slide');
    var dots = document.querySelectorAll('.developer-about-dot');
    if (!slides.length) return;
    var current = 0;
    function goTo(n) {
        slides[current].classList.remove('active');
        dots[current].classList.remove('active');
        current = n;
        slides[current].classList.add('active');
        dots[current].classList.add('active');
    }
    dots.forEach(function(dot, i) { dot.addEventListener('click', function() { goTo(i); }); });
    setInterval(function() { goTo((current + 1) % slides.length); }, 4000);
})();
</script>
<?php endif; ?>
</section>
<?php endif; ?>

<?php
// Services Section settings (with API override)
$services_enabled = $api['services_enabled'] ?? false;
$services_title = $api['services_title'] ?? '';
$services_bg = $api['services_bg'] ?? '#ffffff';
$services_title_color = $api['services_title_color'] ?? '#1e293b';
$services_card_bg = $api['services_card_bg'] ?? '#e8e4dd';
$services_card_hover_bg = $api['services_card_hover_bg'] ?? '#d4cfc7';
$services_card_text_color = $api['services_card_text_color'] ?? '#1e293b';
$services_items = array();
for ($i = 1; $i <= 8; $i++) {
    $icon = $api["services_item_{$i}_icon"] ?? '';
    $image = $api["services_item_{$i}_image"] ?? '';
    $title = $api["services_item_{$i}_title"] ?? '';
    $text = $api["services_item_{$i}_text"] ?? '';
    if ($title || $text || $icon || $image) {
        $services_items[] = array('icon' => $icon, 'image' => $image, 'title' => $title, 'text' => $text);
    }
}
?>

<?php if ($services_enabled && count($services_items) > 0) : ?>
<!-- Services Section -->
<?php
    $services_overlay_opacity = $api['services_overlay_opacity'] ?? '0.5';
    $services_overlay_bg = $api['services_overlay_bg'] ?? $services_bg;
?>
<section class="developer-section developer-services" style="background-color: <?php echo esc_attr($services_bg); ?>; --services-overlay-opacity: <?php echo esc_attr($services_overlay_opacity); ?>; --services-overlay-bg: <?php echo esc_attr($services_overlay_bg); ?>; <?php
    $services_bg_image = $api['services_bg_image'] ?? '';
    if ($services_bg_image) echo 'background-image: url(' . esc_url($services_bg_image) . '); background-size: cover; background-position: center;';
?>">
    <div class="developer-container">
        <div class="developer-services-grid">
            <?php if ($services_title) : ?>
                <div class="developer-services-title-cell">
                    <h2 style="color: <?php echo esc_attr($services_title_color); ?>;"><?php echo esc_html($services_title); ?></h2>
                </div>
            <?php endif; ?>
            <?php foreach ($services_items as $item) : ?>
                <div class="developer-services-card" style="background: <?php echo esc_attr($services_card_bg); ?>; --card-hover-bg: <?php echo esc_attr($services_card_hover_bg); ?>;">
                    <?php if (!empty($item['image'])) : ?>
                        <img src="<?php echo esc_url($item['image']); ?>" alt="" class="developer-services-icon-img">
                    <?php elseif (!empty($item['icon'])) : ?>
                        <span class="developer-services-icon"><?php echo $item['icon']; ?></span>
                    <?php endif; ?>
                    <?php if (!empty($item['title'])) : ?>
                        <h3 style="color: <?php echo esc_attr($services_card_text_color); ?>;"><?php echo esc_html($item['title']); ?></h3>
                    <?php endif; ?>
                    <?php if (!empty($item['text'])) : ?>
                        <p style="color: <?php echo esc_attr($services_card_text_color); ?>; opacity: 0.8;"><?php echo nl2br(esc_html($item['text'])); ?></p>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php
// Reviews Section (API override → theme_mod fallback)
$reviews_enabled = $api['reviews_enabled'] ?? get_theme_mod('developer_reviews_enabled', false);
$reviews_use_app = $api['reviews_use_app'] ?? get_theme_mod('developer_reviews_use_app', '');
$reviews_app_code = $api['reviews_app_code'] ?? '';
$reviews_hostaway_id = $api['reviews_hostaway_id'] ?? '';
$reviews_title = $api['reviews_title'] ?? get_theme_mod('developer_reviews_title', 'What Our Guests Say');
$reviews_subtitle = $api['reviews_subtitle'] ?? get_theme_mod('developer_reviews_subtitle', 'Real reviews from real guests');
$reviews_bg = $api['reviews_bg'] ?? get_theme_mod('developer_reviews_bg', '#0f172a');
$reviews_text_color = $api['reviews_text_color'] ?? get_theme_mod('developer_reviews_text_color', '#ffffff');
$reviews_card_bg = $api['reviews_card_bg'] ?? get_theme_mod('developer_reviews_card_bg', '#1e293b');
$reviews_star_color = $api['reviews_star_color'] ?? get_theme_mod('developer_reviews_star_color', '#fbbf24');

// Manual reviews
$review1_name = $api['review1_name'] ?? '';
$review1_source = $api['review1_source'] ?? '';
$review1_text = $api['review1_text'] ?? '';
$review2_name = $api['review2_name'] ?? '';
$review2_source = $api['review2_source'] ?? '';
$review2_text = $api['review2_text'] ?? '';
$review3_name = $api['review3_name'] ?? '';
$review3_source = $api['review3_source'] ?? '';
$review3_text = $api['review3_text'] ?? '';
$has_manual_reviews = $review1_text || $review2_text || $review3_text;

// Legacy: treat boolean true as 'gas_reviews' for backwards compat
if ($reviews_use_app === true || $reviews_use_app === '1' || $reviews_use_app === 'true') {
    $reviews_use_app = 'gas_reviews';
}

if ($reviews_enabled && $reviews_use_app === 'gas_reviews' && shortcode_exists('gas_reviews')) :
?>
<!-- Reviews Section (GAS Reviews App) -->
<section class="developer-section developer-reviews" style="background: <?php echo esc_attr($reviews_bg); ?>; color: <?php echo esc_attr($reviews_text_color); ?>;">
    <div class="developer-container">
        <div class="developer-section-header">
            <h2 style="color: <?php echo esc_attr($reviews_text_color); ?>;"><?php echo esc_html($reviews_title); ?></h2>
            <p style="color: <?php echo esc_attr($reviews_text_color); ?>; opacity: 0.8;"><?php echo esc_html($reviews_subtitle); ?></p>
        </div>
        <div class="developer-reviews-widget">
            <?php echo do_shortcode('[gas_reviews_slider]'); ?>
        </div>
    </div>
</section>

<?php elseif ($reviews_enabled && $reviews_use_app === 'repuso' && $reviews_app_code) : ?>
<!-- Reviews Section (Repuso Slider) -->
<?php
$gas_api_url = get_option('gas_api_url', 'https://admin.gas.travel');
$repuso_response = wp_remote_get($gas_api_url . '/api/public/repuso-reviews?widget_id=' . urlencode($reviews_app_code) . '&limit=12', array('timeout' => 10, 'sslverify' => false));
$repuso_reviews = array();
if (!is_wp_error($repuso_response)) {
    $repuso_body = json_decode(wp_remote_retrieve_body($repuso_response), true);
    if (!empty($repuso_body['reviews'])) $repuso_reviews = $repuso_body['reviews'];
}
?>
<style>
.gas-review-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 50%; background: <?php echo esc_attr($reviews_star_color); ?>; border: 2px solid <?php echo esc_attr($reviews_star_color); ?>; cursor: pointer; font-size: 20px; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10; transition: all 0.3s ease; }
.gas-review-nav:hover { background: <?php echo esc_attr($reviews_card_bg); ?>; color: <?php echo esc_attr($reviews_star_color); ?>; }
.gas-review-nav.prev { left: 0; }
.gas-review-nav.next { right: 0; }
</style>
<section class="developer-section developer-reviews" style="background: <?php echo esc_attr($reviews_bg); ?>; color: <?php echo esc_attr($reviews_text_color); ?>;">
    <div class="developer-container">
        <div class="developer-section-header">
            <h2 style="color: <?php echo esc_attr($reviews_text_color); ?>;"><?php echo esc_html($reviews_title); ?></h2>
            <p style="color: <?php echo esc_attr($reviews_text_color); ?>; opacity: 0.8;"><?php echo esc_html($reviews_subtitle); ?></p>
        </div>
        <?php if (!empty($repuso_reviews)) : ?>
        <div style="position: relative; overflow: hidden; padding: 0 60px;">
            <div id="gas-repuso-slider" style="display: flex; transition: transform 0.5s ease;">
                <?php foreach ($repuso_reviews as $rev) :
                    $r_rating = floatval($rev['rating'] ?? 5);
                    $r_scale = floatval($rev['rating_scale'] ?? 5);
                    $r_stars_count = ($r_scale > 5) ? round($r_rating / 2) : round($r_rating);
                    $r_stars = str_repeat('★', min($r_stars_count, 5));
                    $r_name = $rev['reviewer_name'] ?? 'Guest';
                    $r_text = $rev['text'] ?? '';
                    if (strlen($r_text) > 160) $r_text = substr($r_text, 0, 160) . '...';
                    $r_source = $rev['source'] ?? '';
                ?>
                <div style="flex: 0 0 25%; min-width: 260px; padding: 0 8px; box-sizing: border-box;">
                    <div style="background: <?php echo esc_attr($reviews_card_bg); ?>; border-radius: 12px; padding: 20px; height: 260px; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.08);">
                        <div style="color: <?php echo esc_attr($reviews_star_color); ?>; font-size: 18px; letter-spacing: 1px; margin-bottom: 10px;"><?php echo $r_stars; ?></div>
                        <p style="color: <?php echo esc_attr($reviews_text_color); ?>; font-size: 14px; line-height: 1.5; flex: 1; margin: 0 0 12px 0; overflow: hidden; opacity: 0.9;">"<?php echo esc_html($r_text); ?>"</p>
                        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; margin-top: auto;">
                            <div style="font-weight: 600; color: <?php echo esc_attr($reviews_text_color); ?>; font-size: 14px;"><?php echo esc_html($r_name); ?></div>
                            <?php if ($r_source) : ?><div style="font-size: 12px; color: <?php echo esc_attr($reviews_text_color); ?>; opacity: 0.6; margin-top: 2px;"><?php echo esc_html($r_source); ?></div><?php endif; ?>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            <button class="gas-review-nav prev" onclick="slideRepuso(-1)">‹</button>
            <button class="gas-review-nav next" onclick="slideRepuso(1)">›</button>
        </div>
        <script>
        (function() {
            var slider = document.getElementById('gas-repuso-slider');
            var pos = 0;
            var total = <?php echo count($repuso_reviews); ?>;
            var visible = window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : window.innerWidth < 1280 ? 3 : 4;
            var max = Math.max(0, total - visible);
            window.slideRepuso = function(dir) {
                pos = Math.max(0, Math.min(max, pos + dir));
                slider.style.transform = 'translateX(-' + (pos * (100 / total)) + '%)';
            };
            setInterval(function() { pos = pos >= max ? 0 : pos + 1; slider.style.transform = 'translateX(-' + (pos * (100 / total)) + '%)'; }, 5000);
        })();
        </script>
        <?php else : ?>
        <p style="text-align: center; opacity: 0.7;">No reviews available yet.</p>
        <?php endif; ?>
        <?php
        $reviews_show_btn = $api['reviews_show_btn'] ?? true;
        if ($reviews_show_btn && $reviews_show_btn !== 'false' && $reviews_show_btn !== false) :
            $btn_color = $api['reviews_btn_color'] ?? $reviews_star_color;
            $btn_text_color = $api['reviews_btn_text_color'] ?? '#ffffff';
            $btn_text = $api['reviews_btn_text'] ?? 'View All Reviews';
        ?>
        <div style="text-align: center; margin-top: 2rem;">
            <a href="/reviews/" style="display: inline-block; padding: 12px 32px; background: <?php echo esc_attr($btn_color); ?>; color: <?php echo esc_attr($btn_text_color); ?>; text-decoration: none; border-radius: 6px; font-weight: 500; border: 2px solid <?php echo esc_attr($btn_color); ?>; transition: all 0.3s ease;"><?php echo esc_html($btn_text); ?></a>
        </div>
        <?php endif; ?>
    </div>
</section>

<?php elseif ($reviews_enabled && $reviews_use_app === 'hostaway' && $reviews_hostaway_id) : ?>
<!-- Reviews Section (Hostaway Slider) -->
<?php
$gas_api_url = isset($gas_api_url) ? $gas_api_url : get_option('gas_api_url', 'https://admin.gas.travel');
$hostaway_response = wp_remote_get($gas_api_url . '/api/public/hostaway-reviews?property_id=' . urlencode($reviews_hostaway_id) . '&limit=12', array('timeout' => 10, 'sslverify' => false));
$hostaway_reviews = array();
if (!is_wp_error($hostaway_response)) {
    $hostaway_body = json_decode(wp_remote_retrieve_body($hostaway_response), true);
    if (!empty($hostaway_body['reviews'])) $hostaway_reviews = $hostaway_body['reviews'];
}
?>
<?php if (!isset($gas_review_nav_css_output)) : $gas_review_nav_css_output = true; ?>
<style>
.gas-review-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; border-radius: 50%; background: <?php echo esc_attr($reviews_star_color); ?>; border: 2px solid <?php echo esc_attr($reviews_star_color); ?>; cursor: pointer; font-size: 20px; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10; transition: all 0.3s ease; }
.gas-review-nav:hover { background: <?php echo esc_attr($reviews_card_bg); ?>; color: <?php echo esc_attr($reviews_star_color); ?>; }
.gas-review-nav.prev { left: 0; }
.gas-review-nav.next { right: 0; }
</style>
<?php endif; ?>
<section class="developer-section developer-reviews" style="background: <?php echo esc_attr($reviews_bg); ?>; color: <?php echo esc_attr($reviews_text_color); ?>;">
    <div class="developer-container">
        <div class="developer-section-header">
            <h2 style="color: <?php echo esc_attr($reviews_text_color); ?>;"><?php echo esc_html($reviews_title); ?></h2>
            <p style="color: <?php echo esc_attr($reviews_text_color); ?>; opacity: 0.8;"><?php echo esc_html($reviews_subtitle); ?></p>
        </div>
        <?php if (!empty($hostaway_reviews)) : ?>
        <div style="position: relative; overflow: hidden; padding: 0 60px;">
            <div id="gas-hostaway-slider" style="display: flex; transition: transform 0.5s ease;">
                <?php foreach ($hostaway_reviews as $rev) :
                    $h_rating = round(floatval($rev['rating'] ?? 5));
                    $h_stars = str_repeat('★', min($h_rating, 5));
                    $h_name = $rev['reviewer_name'] ?? 'Guest';
                    $h_text = $rev['text'] ?? '';
                    if (strlen($h_text) > 160) $h_text = substr($h_text, 0, 160) . '...';
                    $h_source = $rev['source'] ?? '';
                    $h_date = !empty($rev['date']) ? date('M Y', strtotime($rev['date'])) : '';
                    $h_meta = $h_date . ($h_source ? ' · ' . $h_source : '');
                ?>
                <div style="flex: 0 0 25%; min-width: 260px; padding: 0 8px; box-sizing: border-box;">
                    <div style="background: <?php echo esc_attr($reviews_card_bg); ?>; border-radius: 12px; padding: 20px; height: 260px; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.08);">
                        <div style="color: <?php echo esc_attr($reviews_star_color); ?>; font-size: 18px; letter-spacing: 1px; margin-bottom: 10px;"><?php echo $h_stars; ?></div>
                        <p style="color: <?php echo esc_attr($reviews_text_color); ?>; font-size: 14px; line-height: 1.5; flex: 1; margin: 0 0 12px 0; overflow: hidden; opacity: 0.9;">"<?php echo esc_html($h_text); ?>"</p>
                        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; margin-top: auto;">
                            <div style="font-weight: 600; color: <?php echo esc_attr($reviews_text_color); ?>; font-size: 14px;"><?php echo esc_html($h_name); ?></div>
                            <?php if ($h_meta) : ?><div style="font-size: 12px; color: <?php echo esc_attr($reviews_text_color); ?>; opacity: 0.6; margin-top: 2px;"><?php echo esc_html($h_meta); ?></div><?php endif; ?>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
            <button class="gas-review-nav prev" onclick="slideHostaway(-1)">‹</button>
            <button class="gas-review-nav next" onclick="slideHostaway(1)">›</button>
        </div>
        <script>
        (function() {
            var slider = document.getElementById('gas-hostaway-slider');
            var pos = 0;
            var total = <?php echo count($hostaway_reviews); ?>;
            var visible = window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : window.innerWidth < 1280 ? 3 : 4;
            var max = Math.max(0, total - visible);
            window.slideHostaway = function(dir) {
                pos = Math.max(0, Math.min(max, pos + dir));
                slider.style.transform = 'translateX(-' + (pos * (100 / total)) + '%)';
            };
            setInterval(function() { pos = pos >= max ? 0 : pos + 1; slider.style.transform = 'translateX(-' + (pos * (100 / total)) + '%)'; }, 5000);
        })();
        </script>
        <?php else : ?>
        <p style="text-align: center; opacity: 0.7;">No reviews available yet.</p>
        <?php endif; ?>
        <?php
        $reviews_show_btn = $api['reviews_show_btn'] ?? true;
        if ($reviews_show_btn && $reviews_show_btn !== 'false' && $reviews_show_btn !== false) :
            $btn_color = $api['reviews_btn_color'] ?? $reviews_star_color;
            $btn_text_color = $api['reviews_btn_text_color'] ?? '#ffffff';
            $btn_text = $api['reviews_btn_text'] ?? 'View All Reviews';
        ?>
        <div style="text-align: center; margin-top: 2rem;">
            <a href="/reviews/" style="display: inline-block; padding: 12px 32px; background: <?php echo esc_attr($btn_color); ?>; color: <?php echo esc_attr($btn_text_color); ?>; text-decoration: none; border-radius: 6px; font-weight: 500; border: 2px solid <?php echo esc_attr($btn_color); ?>; transition: all 0.3s ease;"><?php echo esc_html($btn_text); ?></a>
        </div>
        <?php endif; ?>
    </div>
</section>

<?php elseif ($reviews_enabled && $has_manual_reviews) : ?>
<!-- Manual Reviews Section -->
<section class="developer-section developer-testimonials" style="background: <?php echo esc_attr($reviews_bg); ?>;">
    <div class="developer-container">
        <div class="developer-section-header">
            <h2 style="color: <?php echo esc_attr($reviews_text_color); ?>;"><?php echo esc_html($reviews_title); ?></h2>
            <p style="color: <?php echo esc_attr($reviews_text_color); ?>; opacity: 0.8;"><?php echo esc_html($reviews_subtitle); ?></p>
        </div>
        <div class="developer-testimonials-grid">
            <?php if ($review1_text) : ?>
            <div class="developer-testimonial-card" style="background: <?php echo esc_attr($reviews_card_bg); ?>;">
                <div class="developer-testimonial-stars" style="color: <?php echo esc_attr($reviews_star_color); ?>;">★★★★★</div>
                <p style="color: <?php echo esc_attr($reviews_text_color); ?>;">"<?php echo esc_html($review1_text); ?>"</p>
                <div class="developer-testimonial-author">
                    <strong style="color: <?php echo esc_attr($reviews_text_color); ?>;"><?php echo esc_html($review1_name ?: 'Guest'); ?></strong>
                    <span style="color: <?php echo esc_attr($reviews_text_color); ?>; opacity: 0.7;"><?php echo esc_html($review1_source); ?></span>
                </div>
            </div>
            <?php endif; ?>
            <?php if ($review2_text) : ?>
            <div class="developer-testimonial-card" style="background: <?php echo esc_attr($reviews_card_bg); ?>;">
                <div class="developer-testimonial-stars" style="color: <?php echo esc_attr($reviews_star_color); ?>;">★★★★★</div>
                <p style="color: <?php echo esc_attr($reviews_text_color); ?>;">"<?php echo esc_html($review2_text); ?>"</p>
                <div class="developer-testimonial-author">
                    <strong style="color: <?php echo esc_attr($reviews_text_color); ?>;"><?php echo esc_html($review2_name ?: 'Guest'); ?></strong>
                    <span style="color: <?php echo esc_attr($reviews_text_color); ?>; opacity: 0.7;"><?php echo esc_html($review2_source); ?></span>
                </div>
            </div>
            <?php endif; ?>
            <?php if ($review3_text) : ?>
            <div class="developer-testimonial-card" style="background: <?php echo esc_attr($reviews_card_bg); ?>;">
                <div class="developer-testimonial-stars" style="color: <?php echo esc_attr($reviews_star_color); ?>;">★★★★★</div>
                <p style="color: <?php echo esc_attr($reviews_text_color); ?>;">"<?php echo esc_html($review3_text); ?>"</p>
                <div class="developer-testimonial-author">
                    <strong style="color: <?php echo esc_attr($reviews_text_color); ?>;"><?php echo esc_html($review3_name ?: 'Guest'); ?></strong>
                    <span style="color: <?php echo esc_attr($reviews_text_color); ?>; opacity: 0.7;"><?php echo esc_html($review3_source); ?></span>
                </div>
            </div>
            <?php endif; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php 
// CTA Section settings (with API override)
$cta_enabled = $api['cta_section_enabled'] ?? get_theme_mod('developer_cta_enabled', true);
$cta_title = $api['cta_section_title'] ?? get_theme_mod('developer_cta_title', 'Ready to Book Your Stay?');
$cta_title_size = $api['cta_section_title_size'] ?? get_theme_mod('developer_cta_title_size', '36');
$cta_text = $api['cta_section_text'] ?? get_theme_mod('developer_cta_text', 'Find your perfect vacation rental today and create memories that last a lifetime.');
$cta_text_size = $api['cta_section_text_size'] ?? get_theme_mod('developer_cta_text_size', '18');
$cta_background = $api['cta_section_bg'] ?? get_theme_mod('developer_cta_background', '#2563eb');
$cta_text_color = $api['cta_section_text_color'] ?? get_theme_mod('developer_cta_text_color', '#ffffff');
$cta_btn_text = $api['cta_section_btn_text'] ?? get_theme_mod('developer_cta_btn_text', 'Browse Properties');
$cta_btn_url = $api['cta_section_btn_url'] ?? get_theme_mod('developer_cta_btn_url', '/book-now/');
$cta_btn_bg = $api['cta_section_btn_bg'] ?? get_theme_mod('developer_cta_btn_bg', '#ffffff');
$cta_btn_text_color = $api['cta_section_btn_text_color'] ?? get_theme_mod('developer_cta_btn_text_color', '#2563eb');

if ($cta_enabled) : 
?>
<!-- CTA Section -->
<section class="developer-section developer-cta" style="background: <?php echo esc_attr($cta_background); ?>;">
    <div class="developer-container">
        <div class="developer-cta-content">
            <h2 style="color: <?php echo esc_attr($cta_text_color); ?>; font-size: <?php echo esc_attr($cta_title_size); ?>px;"><?php echo esc_html($cta_title); ?></h2>
            <p style="color: <?php echo esc_attr($cta_text_color); ?>; opacity: 0.9; font-size: <?php echo esc_attr($cta_text_size); ?>px;"><?php echo esc_html($cta_text); ?></p>
            <?php if ($cta_btn_text) : ?>
                <a href="<?php echo esc_url(home_url($cta_btn_url)); ?>" class="developer-btn" style="background: <?php echo esc_attr($cta_btn_bg); ?>; color: <?php echo esc_attr($cta_btn_text_color); ?>;"><?php echo esc_html($cta_btn_text); ?></a>
            <?php endif; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<?php get_footer(); ?>
