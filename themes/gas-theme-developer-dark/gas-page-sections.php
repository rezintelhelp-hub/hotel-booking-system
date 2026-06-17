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

/**
 * GAS Page Sections Renderer
 *
 * Checks the GAS API for custom page sections. If found, renders them
 * and returns true. If not found, returns false so page.php falls through
 * to existing rendering.
 *
 * Supports multilingual fields: translatable fields are stored with a
 * language suffix (e.g. heading_en, heading_fr). The renderer detects
 * the current WordPress locale and reads the correct variant, falling
 * back to the unsuffixed key for legacy data.
 */

/**
 * Resolve a translatable field from a section/item array.
 * Tries field_XX first (e.g. heading_fr), falls back to unsuffixed (heading).
 */
function gas_ps_field($data, $field, $lang, $default = '') {
    return $data[$field . '_' . $lang] ?? $data[$field] ?? $default;
}

function gas_render_page_sections($page_slug, $primary_color = '#2563eb') {
    $blog_id = get_current_blog_id();
    $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
    $endpoint = "{$api_url}/api/public/website/{$blog_id}/page-sections/" . urlencode($page_slug);

    $response = wp_remote_get($endpoint, array('timeout' => 5, 'sslverify' => true));
    if (is_wp_error($response)) return false;

    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (empty($data['success']) || empty($data['sections'])) return false;

    $page_title = $data['page_title'] ?? get_the_title();
    $page_subtitle = '';
    $sections = $data['sections'];

    // Override title/subtitle from website settings (supports multilingual)
    if (function_exists('developer_get_api_settings')) {
        $ws_api = developer_get_api_settings();
        $pk = 'page_' . str_replace('-', '_', $page_slug);
        if (!empty($ws_api[$pk . '_title'])) {
            $page_title = $ws_api[$pk . '_title'];
        }
        if (!empty($ws_api[$pk . '_subtitle'])) {
            $page_subtitle = $ws_api[$pk . '_subtitle'];
        }
    }

    // Detect current language using GAS language system (URL param / cookie / site primary)
    $lang = function_exists('developer_get_current_language') ? developer_get_current_language() : substr(get_locale(), 0, 2);

    // Radius variables from API settings (fallback to sensible defaults)
    $radius_api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();
    $btn_radius = $radius_api['btn_radius'] ?? '8';
    $card_radius = $radius_api['card_radius'] ?? '12';
    $lg_radius = $radius_api['lg_radius'] ?? '16';

    // Check hero-enabled from custom page settings
    $hero_enabled_ps = true;
    if (function_exists('developer_get_api_settings')) {
        $ps_api = developer_get_api_settings();
        $cp_hero_settings = ($ps_api['custom_page_settings'] ?? array())[$page_slug] ?? array();
        if (!empty($cp_hero_settings)) {
            $hv = $cp_hero_settings['hero-enabled'] ?? true;
            $hero_enabled_ps = !($hv === false || $hv === 'false' || $hv === '0' || $hv === 0);
        }
    }

    // Only render the page title hero if sections don't already contain a hero
    $has_hero_section = in_array('hero', array_column($sections, 'type'));

    if (!$hero_enabled_ps) {
        // Hero disabled — drop hero sections, but STILL emit the fixed-header
        // spacer or content tucks under the sticky menu. Regression from
        // commit 14a08221 — every client page with hero-off had its top cut.
        $sections = array_filter($sections, function($s) { return ($s['type'] ?? '') !== 'hero'; });
        $sections = array_values($sections);
        echo '<div style="padding-top: 120px;"></div>';
    } elseif (!$has_hero_section) {
    ?>
    <section class="gas-ps-hero" style="position: relative; min-height: 250px; height: 35vh; display: flex; align-items: center; justify-content: center; background: #1e293b; overflow: hidden;">
        <div style="position: absolute; top: 0; left: 0; right: 0; height: 150px; background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%); pointer-events: none; z-index: 1;"></div>
        <div style="position: relative; z-index: 2; text-align: center; padding: 0 24px;">
            <h1 style="font-family: var(--developer-font-display, 'Playfair Display', serif); font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 700; color: #fff; text-shadow: 0 2px 20px rgba(0,0,0,0.3); margin: 0 0 12px;"><?php echo esc_html($page_title); ?></h1>
            <?php if ($page_subtitle) : ?>
                <p style="font-size: clamp(1.1rem, 2vw, 1.35rem); color: #fff; opacity: 0.9; margin: 0; max-width: 600px; margin: 0 auto; text-shadow: 0 1px 10px rgba(0,0,0,0.2);"><?php echo esc_html($page_subtitle); ?></p>
            <?php endif; ?>
        </div>
    </section>
    <?php
    }

    // Render each section
    foreach ($sections as $section) {
        $type = $section['type'] ?? '';
        $heading = gas_ps_field($section, 'heading', $lang);
        $body = gas_ps_field($section, 'body', $lang);
        $id_attr = !empty($section['id']) ? ' id="' . esc_attr($section['id']) . '"' : '';
        $bg_col = !empty($section['background_color']) ? $section['background_color'] : '';
        // Per-section content width — must be computed for EVERY section type
        // (gallery / videos / cards / text), not just inside case 'text'.
        // Stale value would leak between iterations if scoped per-case.
        $content_width = $section['content_width'] ?? 'normal';
        $max_w = $content_width === 'wide' ? '1100px' : ($content_width === 'full' ? '100%' : '800px');

        switch ($type) {

            case 'hero':
                $image = $section['image'] ?? '';
                $subheading = gas_ps_field($section, 'subheading', $lang);
                $cta_text = gas_ps_field($section, 'cta_text', $lang);
                $cta_link = $section['cta_link'] ?? '';
                $has_img = !empty($image);
                ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-hero-section" style="position: relative; min-height: <?php echo $has_img ? '60vh' : '40vh'; ?>; display: flex; align-items: center; justify-content: center; overflow: hidden; <?php echo $has_img ? '' : 'background: #1e293b;'; ?>">
                    <?php if ($has_img) : ?>
                        <div style="position: absolute; inset: 0; background-image: url('<?php echo esc_url($image); ?>'); background-size: cover; background-position: center;"></div>
                        <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.45);"></div>
                    <?php endif; ?>
                    <div style="position: relative; z-index: 2; text-align: center; padding: 40px 24px; max-width: 900px;">
                        <?php if ($heading) : ?><h1 style="font-family: var(--developer-font-display, 'Playfair Display', serif); font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 700; color: #fff; margin: 0 0 16px; text-shadow: 0 2px 15px rgba(0,0,0,0.3);"><?php echo esc_html($heading); ?></h1><?php endif; ?>
                        <?php if ($subheading) : ?><p style="font-size: 1.25rem; color: #fff; opacity: 0.9; margin: 0 0 24px;"><?php echo esc_html($subheading); ?></p><?php endif; ?>
                        <?php if ($body) : ?><div class="gas-ps-body" style="color: #fff; opacity: 0.9;"><?php echo wp_kses_post($body); ?></div><?php endif; ?>
                        <?php if ($cta_text && $cta_link) : ?><a href="<?php echo esc_url($cta_link); ?>" style="display: inline-block; background: <?php echo esc_attr($primary_color); ?>; color: #fff; padding: 14px 36px; border-radius: <?php echo esc_attr($btn_radius); ?>px; text-decoration: none; font-weight: 600;"><?php echo esc_html($cta_text); ?></a><?php endif; ?>
                    </div>
                </section>
                <?php break;

            case 'text':
                ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-text" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#fff'; ?>;">
                    <div style="max-width: 800px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 12px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <?php if ($body) : ?><div class="gas-ps-body"><?php echo wp_kses_post($body); ?></div><?php endif; ?>
                    </div>
                </section>
                <?php break;

            case 'image_text':
            case 'text-image':
                $image = $section['image'] ?? '';
                $image_position = $section['image_position'] ?? 'left';
                $image_size = $section['image_size'] ?? 'large';
                $img_order = ($image_position === 'right') ? 'order: 2;' : 'order: 1;';
                $txt_order = ($image_position === 'right') ? 'order: 1;' : 'order: 2;';
                // Set grid columns based on image size
                if ($image_size === 'small') {
                    $grid_cols = ($image_position === 'right') ? '1fr 300px' : '300px 1fr';
                } elseif ($image_size === 'medium') {
                    $grid_cols = ($image_position === 'right') ? '1fr 500px' : '500px 1fr';
                } else {
                    $grid_cols = '1fr 1fr';
                }
                ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-imgtext" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#fff'; ?>;">
                    <div class="gas-ps-imgtext-grid" style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: <?php echo $grid_cols; ?>; gap: 32px; align-items: center;">
                        <?php if ($image) : ?><div style="<?php echo $img_order; ?>"><img src="<?php echo esc_url($image); ?>" alt="" style="width: 100%; border-radius: <?php echo esc_attr($lg_radius); ?>px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);"></div><?php endif; ?>
                        <div style="<?php echo $txt_order; ?>">
                            <?php if ($heading) : ?><h2 style="font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0 0 10px;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                            <?php if ($body) : ?><div class="gas-ps-body"><?php echo wp_kses_post($body); ?></div><?php endif; ?>
                        </div>
                    </div>
                </section>
                <?php break;

            case 'media_wrap':
                // Magazine-style: text wraps around an image or YouTube/Vimeo embed
                // floated left or right. Mobile (<=768px) stacks vertically.
                $media_type = $section['media_type'] ?? 'image';
                $media_url = $section['media_url'] ?? '';
                $media_position = ($section['media_position'] ?? 'right') === 'left' ? 'left' : 'right';
                $media_width = max(20, min(60, intval($section['media_width'] ?? 40)));
                $embed_url = '';
                if ($media_type === 'video' && $media_url) {
                    if (preg_match('~(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/|v/|shorts/))([A-Za-z0-9_-]{11})~', $media_url, $m)) {
                        $embed_url = 'https://www.youtube.com/embed/' . $m[1];
                    } elseif (preg_match('~vimeo\.com/(?:video/)?(\d+)~', $media_url, $m)) {
                        $embed_url = 'https://player.vimeo.com/video/' . $m[1];
                    }
                }
                $has_media = ($media_type === 'video' && $embed_url) || ($media_type === 'image' && $media_url);
                $mw_uid = 'gas-mw-' . ($section['id'] ?? rand(1000,9999));
                ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-media-wrap <?php echo esc_attr($mw_uid); ?>" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#fff'; ?>;">
                    <div style="max-width: <?php echo $max_w; ?>; margin: 0 auto;">
                        <div class="gas-ps-media-wrap-inner" style="overflow: hidden;">
                            <?php if ($has_media) : ?>
                                <div class="gas-ps-media-wrap-media" style="float: <?php echo esc_attr($media_position); ?>; width: <?php echo $media_width; ?>%; margin: 0 <?php echo $media_position === 'right' ? '0 1.5rem 1.5rem' : '1.5rem 1.5rem 0'; ?>; max-width: 100%;">
                                    <?php if ($media_type === 'video' && $embed_url) : ?>
                                        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: <?php echo esc_attr($lg_radius); ?>px;">
                                            <iframe src="<?php echo esc_url($embed_url); ?>" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                                        </div>
                                    <?php elseif ($media_type === 'image' && $media_url) : ?>
                                        <img src="<?php echo esc_url($media_url); ?>" alt="<?php echo esc_attr($heading); ?>" style="width: 100%; height: auto; border-radius: <?php echo esc_attr($lg_radius); ?>px; display: block;">
                                    <?php endif; ?>
                                </div>
                            <?php endif; ?>
                            <?php if ($heading) : ?><h2 style="font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0 0 16px;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                            <?php if ($body) : ?><div class="gas-ps-body" style="line-height: 1.7;"><?php echo wp_kses_post($body); ?></div><?php endif; ?>
                            <div style="clear: both;"></div>
                        </div>
                    </div>
                    <style>@media (max-width: 768px) { .<?php echo esc_attr($mw_uid); ?> .gas-ps-media-wrap-media { float: none !important; width: 100% !important; margin: 0 0 1.5rem !important; } }</style>
                </section>
                <?php break;

            case 'gallery':
                $images = $section['images'] ?? array();
                if (!empty($images)) :
                    // Match videos / featured-rooms: exactly count(images)
                    // columns, capped at 3. Mobile media query collapses to
                    // 2 then 1.
                    $gal_count = count($images);
                    $gal_cols = $gal_count >= 3 ? 3 : max(1, $gal_count);
                ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-gallery" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#f8fafc'; ?>;">
                    <div style="max-width: <?php echo esc_attr($max_w); ?>; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 16px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <div class="gas-ps-gallery-grid" style="display: grid; grid-template-columns: repeat(<?php echo $gal_cols; ?>, 1fr); gap: 16px;">
                            <?php foreach ($images as $img) :
                                $src = is_array($img) ? ($img['url'] ?? $img['src'] ?? '') : $img;
                                $alt = is_array($img) ? ($img['alt'] ?? '') : '';
                            ?>
                                <img src="<?php echo esc_url($src); ?>" alt="<?php echo esc_attr($alt); ?>" style="width: 100%; height: 250px; object-fit: cover; border-radius: <?php echo esc_attr($card_radius); ?>px;">
                            <?php endforeach; ?>
                        </div>
                    </div>
                </section>
                <?php endif; break;

            case 'cards':
                $cards = $section['cards'] ?? array();
                if (!empty($cards)) : ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-cards" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#f8fafc'; ?>;">
                    <div style="max-width: <?php echo esc_attr($max_w); ?>; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 16px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <div class="gas-ps-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
                            <?php foreach ($cards as $card) : ?>
                                <div style="background: #fff; border-radius: <?php echo esc_attr($lg_radius); ?>px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
                                    <?php if (!empty($card['image'])) : ?><img src="<?php echo esc_url($card['image']); ?>" alt="" style="width: 100%; height: 200px; object-fit: cover;"><?php endif; ?>
                                    <div style="padding: 24px;">
                                        <?php if (!empty(gas_ps_field($card, 'title', $lang))) : ?><h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0 0 8px;"><?php echo esc_html(gas_ps_field($card, 'title', $lang)); ?></h3><?php endif; ?>
                                        <?php $card_body = gas_ps_field($card, 'description', $lang) ?: gas_ps_field($card, 'body', $lang); if (!empty($card_body)) : ?><div style="color: #64748b; margin: 0; line-height: 1.6; font-size: 0.95rem;"><?php echo wp_kses_post($card_body); ?></div><?php endif; ?>
                                        <?php
                                        $cta_link = $card['cta_link'] ?? $card['link'] ?? '';
                                        $cta_text = gas_ps_field($card, 'cta_text', $lang);
                                        if (empty($cta_text)) {
                                            foreach (array('en','fr','de','es','nl','ja') as $fl) {
                                                if (!empty($card['cta_text_' . $fl])) { $cta_text = $card['cta_text_' . $fl]; break; }
                                            }
                                        }
                                        if (empty($cta_text)) $cta_text = gas_ps_field($card, 'link_text', $lang, '');
                                        $cta_size = $card['cta_size'] ?? 'sm';
                                        $cta_pad = $cta_size === 'lg' ? '16px 40px' : ($cta_size === 'md' ? '12px 32px' : '8px 20px');
                                        $cta_font = $cta_size === 'lg' ? '1.05rem' : ($cta_size === 'md' ? '0.95rem' : '0.85rem');
                                        if (!empty($cta_link) && !empty($cta_text)) : ?><a href="<?php echo esc_url($cta_link); ?>" style="display: inline-block; margin-top: 16px; padding: <?php echo $cta_pad; ?>; font-size: <?php echo $cta_font; ?>; background: <?php echo esc_attr($primary_color); ?>; color: #fff; font-weight: 600; text-decoration: none; border-radius: <?php echo esc_attr($btn_radius); ?>px; transition: opacity 0.2s;"><?php echo esc_html($cta_text); ?></a><?php endif; ?>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </section>
                <?php endif; break;

            case 'cta':
                $cta_text = gas_ps_field($section, 'cta_text', $lang);
                $cta_link = $section['cta_link'] ?? '';
                $bg_color = $section['background_color'] ?? $primary_color;
                ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-cta" style="padding: 50px 24px; background: <?php echo esc_attr($bg_color); ?>; text-align: center;">
                    <div style="max-width: 700px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2.2rem; font-weight: 700; color: #fff; margin: 0 0 12px;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <?php if ($body) : ?><p style="font-size: 1.1rem; color: rgba(255,255,255,0.9); margin: 0 0 20px; line-height: 1.6;"><?php echo esc_html($body); ?></p><?php endif; ?>
                        <?php if ($cta_text && $cta_link) : ?><a href="<?php echo esc_url($cta_link); ?>" style="display: inline-block; background: #fff; color: <?php echo esc_attr($bg_color); ?>; padding: 16px 40px; border-radius: <?php echo esc_attr($btn_radius); ?>px; text-decoration: none; font-weight: 700; font-size: 1.1rem;"><?php echo esc_html($cta_text); ?></a><?php endif; ?>
                    </div>
                </section>
                <?php break;

            case 'faq':
                $items = $section['items'] ?? array();
                if (!empty($items)) : ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-faq" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#fff'; ?>;">
                    <div style="max-width: 800px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 16px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <?php foreach ($items as $i => $item) :
                            $q = gas_ps_field($item, 'q', $lang);
                            if (empty($q)) $q = $item['question'] ?? '';
                            $a = gas_ps_field($item, 'a', $lang);
                            if (empty($a)) $a = $item['answer'] ?? '';
                            $uid = 'faq_' . md5($q . $i);
                        ?>
                            <details style="border-bottom: 1px solid #e5e7eb; padding: 20px 0;">
                                <summary style="font-size: 1.1rem; font-weight: 600; color: #1e293b; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center;"><?php echo esc_html($q); ?><span style="font-size: 1.5rem; color: #94a3b8; transition: transform 0.2s;">+</span></summary>
                                <div class="gas-ps-body" style="padding-top: 12px;"><?php echo wp_kses_post($a); ?></div>
                            </details>
                        <?php endforeach; ?>
                    </div>
                </section>
                <?php endif; break;

            case 'image_faq':
                $image = $section['image'] ?? '';
                $image_position = $section['image_position'] ?? 'left';
                $items = $section['items'] ?? array();
                $img_order = ($image_position === 'right') ? 'order: 2;' : 'order: 1;';
                $faq_order = ($image_position === 'right') ? 'order: 1;' : 'order: 2;';
                if (!empty($items)) : ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-imgfaq" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#fff'; ?>;">
                    <div class="gas-ps-imgtext-grid" style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start;">
                        <?php if ($image) : ?><div style="<?php echo $img_order; ?>"><img src="<?php echo esc_url($image); ?>" alt="" style="width: 100%; border-radius: <?php echo esc_attr($lg_radius); ?>px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);"></div><?php endif; ?>
                        <div style="<?php echo $faq_order; ?>">
                            <?php if ($heading) : ?><h2 style="font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0 0 16px;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                            <?php foreach ($items as $i => $item) :
                                $q = gas_ps_field($item, 'q', $lang);
                                $a = gas_ps_field($item, 'a', $lang);
                                if (empty($q)) continue;
                            ?>
                                <details style="border-bottom: 1px solid #e5e7eb; padding: 14px 0;">
                                    <summary style="font-size: 1rem; font-weight: 600; color: #1e293b; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center;"><?php echo esc_html($q); ?><span style="font-size: 1.5rem; color: #94a3b8;">+</span></summary>
                                    <div class="gas-ps-body" style="padding-top: 10px;"><?php echo wp_kses_post($a); ?></div>
                                </details>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </section>
                <?php endif; break;

            case 'testimonials':
                $items = $section['items'] ?? array();
                if (!empty($items)) : ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-testimonials" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#f8fafc'; ?>;">
                    <div style="max-width: 1100px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 16px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <div class="gas-ps-testimonials-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
                            <?php foreach ($items as $item) : ?>
                                <div style="background: #fff; padding: 32px; border-radius: <?php echo esc_attr($lg_radius); ?>px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                                    <?php $t_text = gas_ps_field($item, 'text', $lang); if (!empty($t_text)) : ?><p style="font-size: 1.05rem; line-height: 1.7; color: #475569; font-style: italic; margin: 0 0 16px;">"<?php echo esc_html($t_text); ?>"</p><?php endif; ?>
                                    <div style="font-weight: 600; color: #1e293b;"><?php echo esc_html(gas_ps_field($item, 'name', $lang)); ?></div>
                                    <?php $t_role = gas_ps_field($item, 'role', $lang); if (!empty($t_role)) : ?><div style="font-size: 0.9rem; color: #94a3b8;"><?php echo esc_html($t_role); ?></div><?php endif; ?>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </section>
                <?php endif; break;

            case 'reviews':
                // Pro Builder Reviews section. Source can be:
                //   'app'         — defer to Web Builder's reviews.use-app
                //                   (repuso / hostaway / gas_reviews) + its app-code
                //   'gas_reviews' — pull from GAS direct reviews
                //   'repuso'      — pull via app-code stored on Web Builder
                //   'hostaway'    — pull via reviews_hostaway_id
                // Without a renderer case for 'reviews' this section silently
                // dropped to nothing — site /reviews/ rendered an empty <main>.
                $review_source = $section['review_source'] ?? 'app';
                $api_for_reviews = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();
                $resolved_source = ($review_source === 'app') ? ($api_for_reviews['reviews_use_app'] ?? '') : $review_source;
                $repuso_widget = $api_for_reviews['reviews_app_code'] ?? '';
                $hostaway_pid = $api_for_reviews['reviews_hostaway_id'] ?? '';
                $client_id_for_reviews = get_option('gas_client_id', '');
                $api_url_for_reviews = get_option('gas_api_url', 'https://admin.gas.travel');
                $rev_endpoint = '';
                if ($resolved_source === 'repuso' && $repuso_widget) {
                    $rev_endpoint = $api_url_for_reviews . '/api/public/repuso-reviews?widget_id=' . urlencode($repuso_widget) . '&limit=12';
                } elseif ($resolved_source === 'hostaway' && $hostaway_pid) {
                    $rev_endpoint = $api_url_for_reviews . '/api/public/hostaway-reviews?property_id=' . urlencode($hostaway_pid) . '&limit=12';
                } elseif ($resolved_source === 'gas_reviews' && $client_id_for_reviews) {
                    $rev_endpoint = $api_url_for_reviews . '/api/public/client/' . urlencode($client_id_for_reviews) . '/reviews?limit=12';
                }
                $reviews_data = array();
                if ($rev_endpoint) {
                    $rev_resp = wp_remote_get($rev_endpoint, array('timeout' => 10, 'sslverify' => false));
                    if (!is_wp_error($rev_resp)) {
                        $rev_body = json_decode(wp_remote_retrieve_body($rev_resp), true);
                        if (!empty($rev_body['reviews'])) {
                            foreach ($rev_body['reviews'] as $r) {
                                $reviews_data[] = array(
                                    'name'   => $r['reviewer_name'] ?? $r['guest_name'] ?? 'Guest',
                                    'text'   => $r['text'] ?? $r['comment'] ?? '',
                                    'rating' => intval($r['rating'] ?? 5),
                                    'date'   => $r['date'] ?? $r['review_date'] ?? '',
                                    'source' => $r['source'] ?? $r['channel_name'] ?? '',
                                );
                            }
                        }
                    }
                }
                if (!empty($reviews_data)) :
                    $rev_section_bg = !empty($bg_col) ? esc_attr($bg_col) : '#0f172a';
                    $rev_card_bg = !empty($section['card_bg']) ? esc_attr($section['card_bg']) : '#1e293b';
                    $rev_text_color = !empty($section['text_color']) ? esc_attr($section['text_color']) : '#ffffff';
                    $rev_card_text = !empty($section['card_text_color']) ? esc_attr($section['card_text_color']) : '#e2e8f0';
                    $rev_star_color = !empty($section['star_color']) ? esc_attr($section['star_color']) : '#fbbf24';
                    $rev_card_radius = isset($section['card_radius']) ? intval($section['card_radius']) : 12;
                    ?>
                    <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-reviews" style="padding: 60px 24px; background: <?php echo $rev_section_bg; ?>;">
                        <div style="max-width: 1200px; margin: 0 auto;">
                            <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: <?php echo $rev_text_color; ?>; margin: 0 0 32px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                            <div class="gas-ps-reviews-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
                                <?php foreach ($reviews_data as $rev) :
                                    $r_rating = max(1, min(5, $rev['rating'] ?: 5));
                                    $r_stars  = str_repeat('★', $r_rating) . str_repeat('☆', 5 - $r_rating);
                                    $r_date   = !empty($rev['date']) ? date('M Y', strtotime($rev['date'])) : '';
                                    $r_meta   = trim($rev['source'] . (($rev['source'] && $r_date) ? ' · ' : '') . $r_date);
                                    ?>
                                    <div style="background: <?php echo $rev_card_bg; ?>; padding: 24px; border-radius: <?php echo $rev_card_radius; ?>px; color: <?php echo $rev_card_text; ?>;">
                                        <div style="margin-bottom: 12px; color: <?php echo $rev_star_color; ?>; font-size: 1.1rem; letter-spacing: 2px;"><?php echo $r_stars; ?></div>
                                        <?php if (!empty($rev['text'])) : ?><p style="font-size: 0.95rem; line-height: 1.6; margin: 0 0 16px;"><?php echo esc_html(mb_strimwidth($rev['text'], 0, 280, '…')); ?></p><?php endif; ?>
                                        <div style="font-weight: 600;"><?php echo esc_html($rev['name']); ?></div>
                                        <?php if ($r_meta) : ?><div style="font-size: 0.8rem; opacity: 0.7; margin-top: 4px;"><?php echo esc_html($r_meta); ?></div><?php endif; ?>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </section>
                <?php endif; break;

            case 'map':
                $lat = $section['latitude'] ?? '';
                $lng = $section['longitude'] ?? '';
                $zoom = $section['zoom'] ?? 14;
                if ($lat && $lng) : ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-map" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#fff'; ?>;">
                    <div style="max-width: 1100px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 16px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <div style="border-radius: <?php echo esc_attr($lg_radius); ?>px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                            <iframe src="https://www.google.com/maps?q=<?php echo esc_attr($lat); ?>,<?php echo esc_attr($lng); ?>&z=<?php echo intval($zoom); ?>&output=embed" width="100%" height="450" style="border: 0; display: block;" allowfullscreen loading="lazy"></iframe>
                        </div>
                    </div>
                </section>
                <?php endif; break;

            case 'video':
                $video_url = $section['video_url'] ?? '';
                if ($video_url) :
                    // Convert YouTube/Vimeo URLs to embed
                    $embed_url = $video_url;
                    if (preg_match('/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/', $video_url, $m)) {
                        $embed_url = "https://www.youtube.com/embed/{$m[1]}";
                    } elseif (preg_match('/youtu\.be\/([a-zA-Z0-9_-]+)/', $video_url, $m)) {
                        $embed_url = "https://www.youtube.com/embed/{$m[1]}";
                    } elseif (preg_match('/vimeo\.com\/(\d+)/', $video_url, $m)) {
                        $embed_url = "https://player.vimeo.com/video/{$m[1]}";
                    }
                ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-video" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#f8fafc'; ?>;">
                    <div style="max-width: 900px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 16px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <div style="position: relative; padding-bottom: 56.25%; height: 0; border-radius: <?php echo esc_attr($lg_radius); ?>px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                            <iframe src="<?php echo esc_url($embed_url); ?>" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen loading="lazy"></iframe>
                        </div>
                    </div>
                </section>
                <?php endif; break;

            case 'divider':
                $style = $section['style'] ?? 'line';
                ?>
                <div<?php echo $id_attr; ?> class="gas-ps-section gas-ps-divider" style="padding: 20px 24px;">
                    <div style="max-width: 1100px; margin: 0 auto;">
                        <?php if ($style === 'space') : ?>
                            <div style="height: 40px;"></div>
                        <?php else : ?>
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">
                        <?php endif; ?>
                    </div>
                </div>
                <?php break;

            case 'html':
                $html = $section['html'] ?? '';
                if ($html) : ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-html" style="padding: 60px 24px;">
                    <div style="max-width: 1100px; margin: 0 auto;">
                        <?php echo $html; ?>
                    </div>
                </section>
                <?php endif; break;
        }
    }
    ?>
    <style>
    /* Inherit fonts from Styles & Fonts */
    .gas-ps-section h1,
    .gas-ps-hero h1 {
        font-family: var(--developer-font-display) !important;
    }
    .gas-ps-section h2 {
        font-family: var(--developer-subheading-font, var(--developer-font-display)) !important;
    }
    .gas-ps-section h3 {
        font-family: var(--developer-subheading-font, var(--developer-font-display)) !important;
    }
    .gas-ps-section p,
    .gas-ps-section div,
    .gas-ps-section summary,
    .gas-ps-section a {
        font-family: var(--developer-font) !important;
    }
    /* Hybrid body — baseline defaults that WYSIWYG inline styles override */
    .gas-ps-body {
        font-family: var(--developer-font) !important;
        font-size: 1.05rem !important;
        line-height: 1.6 !important;
        color: #475569;
    }
    .gas-ps-body span, .gas-ps-body div {
        font-size: inherit !important;
    }
    .gas-ps-body p { margin: 0 0 0.6em; }
    .gas-ps-body h2, .gas-ps-body h3 { margin: 0.8em 0 0.4em; }
    .gas-ps-body ul, .gas-ps-body ol { margin: 0 0 0.6em; padding-left: 1.5em; }
    .gas-ps-body img { max-width: 100%; height: auto; border-radius: 8px; }
    .gas-ps-body a { color: inherit; text-decoration: underline; }
    @media (max-width: 768px) {
        .gas-ps-imgtext-grid { grid-template-columns: 1fr !important; }
        .gas-ps-imgtext-grid > div { order: unset !important; }
        .gas-ps-cards-grid { grid-template-columns: 1fr !important; }
        .gas-ps-testimonials-grid { grid-template-columns: 1fr !important; }
        .gas-ps-gallery-grid { grid-template-columns: 1fr 1fr !important; }
    }
    </style>
    <?php
    return true;
}
