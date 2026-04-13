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

    // Section builder pages: no automatic hero. If the client wants a hero, they add
    // a Hero section in the builder. No toggle needed, no caching issues.
    $section_types = array_column($sections, 'type');
    $has_hero_section = in_array('hero', $section_types) || in_array('hero_slider', $section_types);
    if (!$has_hero_section) {
        // Just add spacing for the fixed header
        echo '<div style="padding-top: 100px;"></div>';
    }

    // Render each section
    foreach ($sections as $section) {
        $type = $section['type'] ?? '';
        $heading = gas_ps_field($section, 'heading', $lang);
        $body = gas_ps_field($section, 'body', $lang);
        $id_attr = !empty($section['id']) ? ' id="' . esc_attr($section['id']) . '"' : '';
        $bg_col = !empty($section['background_color']) ? $section['background_color'] : '';

        switch ($type) {

            case 'hero':
                $image = $section['image'] ?? '';
                $subheading = gas_ps_field($section, 'subheading', $lang);
                $cta_text = gas_ps_field($section, 'cta_text', $lang);
                $cta_link = $section['cta_link'] ?? '';
                $has_img = !empty($image);
                $hero_min_h = $section['min_height'] ?? ($has_img ? '60vh' : '40vh');
                $hero_pad_top = intval($section['header_top_padding'] ?? 40);
                ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-hero-section" style="position: relative; min-height: <?php echo esc_attr($hero_min_h); ?>; display: flex; align-items: center; justify-content: center; overflow: hidden; <?php echo $has_img ? '' : 'background: #1e293b;'; ?>">
                    <?php if ($has_img) : ?>
                        <div style="position: absolute; inset: 0; background-image: url('<?php echo esc_url($image); ?>'); background-size: cover; background-position: center;"></div>
                        <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.45);"></div>
                    <?php endif; ?>
                    <div style="position: relative; z-index: 2; text-align: center; padding: <?php echo $hero_pad_top; ?>px 24px 40px; max-width: 900px;">
                        <?php if ($heading) : ?><h1 style="font-family: var(--developer-font-display, 'Playfair Display', serif); font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 700; color: #fff; margin: 0 0 16px; text-shadow: 0 2px 15px rgba(0,0,0,0.3);"><?php echo esc_html($heading); ?></h1><?php endif; ?>
                        <?php if ($subheading) : ?><p style="font-size: 1.25rem; color: #fff; opacity: 0.9; margin: 0 0 24px;"><?php echo esc_html($subheading); ?></p><?php endif; ?>
                        <?php if ($body) : ?><div class="gas-ps-body" style="color: #fff; opacity: 0.9;"><?php echo wp_kses_post($body); ?></div><?php endif; ?>
                        <?php if ($cta_text && $cta_link) : ?><a href="<?php echo esc_url($cta_link); ?>" style="display: inline-block; background: <?php echo esc_attr($primary_color); ?>; color: #fff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600;"><?php echo esc_html($cta_text); ?></a><?php endif; ?>
                    </div>
                </section>
                <?php break;

            case 'hero_slider':
                $slides = $section['images'] ?? array();
                $subheading = gas_ps_field($section, 'subheading', $lang);
                $cta_text = gas_ps_field($section, 'cta_text', $lang);
                $cta_link = $section['cta_link'] ?? '';
                $slide_duration = intval($section['slide_duration'] ?? 5) * 1000;
                $hero_min_h = $section['min_height'] ?? '60vh';
                $hero_pad_top = intval($section['header_top_padding'] ?? 80);
                $slider_id = 'gas-hero-slider-' . ($section['id'] ?? rand(1000,9999));
                if (!empty($slides)) :
                ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-hero-section" style="position: relative; min-height: <?php echo esc_attr($hero_min_h); ?>; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                    <!-- Slider backgrounds -->
                    <?php foreach ($slides as $si => $slide_url) :
                        $slide_src = is_array($slide_url) ? ($slide_url['url'] ?? $slide_url['src'] ?? '') : $slide_url;
                        if (!$slide_src) continue;
                    ?>
                    <div class="<?php echo $slider_id; ?>-slide" style="position: absolute; inset: 0; background-image: url('<?php echo esc_url($slide_src); ?>'); background-size: cover; background-position: center; opacity: <?php echo $si === 0 ? '1' : '0'; ?>; transition: opacity 1s ease;"></div>
                    <?php endforeach; ?>
                    <div style="position: absolute; inset: 0; background: rgba(0,0,0,0.4);"></div>
                    <div style="position: relative; z-index: 2; text-align: center; padding: <?php echo $hero_pad_top; ?>px 24px 40px; max-width: 900px;">
                        <?php if ($heading) : ?><h1 style="font-family: var(--developer-font-display, 'Playfair Display', serif); font-size: clamp(2rem, 4vw, 3.5rem); font-weight: 700; color: #fff; margin: 0 0 16px; text-shadow: 0 2px 15px rgba(0,0,0,0.3);"><?php echo esc_html($heading); ?></h1><?php endif; ?>
                        <?php if ($subheading) : ?><p style="font-size: 1.25rem; color: #fff; opacity: 0.9; margin: 0 0 24px;"><?php echo esc_html($subheading); ?></p><?php endif; ?>
                        <?php if ($cta_text && $cta_link) : ?><a href="<?php echo esc_url($cta_link); ?>" style="display: inline-block; background: <?php echo esc_attr($primary_color); ?>; color: #fff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600;"><?php echo esc_html($cta_text); ?></a><?php endif; ?>
                    </div>
                </section>
                <script>
                (function() {
                    var slides = document.querySelectorAll('.<?php echo $slider_id; ?>-slide');
                    if (slides.length < 2) return;
                    var current = 0;
                    setInterval(function() {
                        slides[current].style.opacity = '0';
                        current = (current + 1) % slides.length;
                        slides[current].style.opacity = '1';
                    }, <?php echo $slide_duration; ?>);
                })();
                </script>
                <?php endif; break;

            case 'text':
                $text_align = $section['text_align'] ?? 'center';
                $content_width = $section['content_width'] ?? 'normal';
                $max_w = $content_width === 'wide' ? '1100px' : ($content_width === 'full' ? '100%' : '800px');
                ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-text" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#fff'; ?>;">
                    <div style="max-width: <?php echo $max_w; ?>; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 16px; text-align: <?php echo esc_attr($text_align); ?>;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
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
                        <?php if ($image) : ?><div style="<?php echo $img_order; ?>"><img src="<?php echo esc_url($image); ?>" alt="" style="width: 100%; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);"></div><?php endif; ?>
                        <div style="<?php echo $txt_order; ?>">
                            <?php if ($heading) : ?><h2 style="font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0 0 16px;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                            <?php if ($body) : ?><div class="gas-ps-body" style="line-height: 1.6;"><?php echo wp_kses_post($body); ?></div><?php endif; ?>
                            <?php
                            $cta_text = gas_ps_field($section, 'cta_text', $lang);
                            $cta_link = $section['cta_link'] ?? '';
                            if ($cta_text && $cta_link) :
                                $cta_external = preg_match('#^https?://#i', $cta_link);
                                $cta_href = $cta_external ? $cta_link : home_url($cta_link);
                                $cta_target = $cta_external ? ' target="_blank" rel="noopener noreferrer"' : '';
                            ?>
                            <a href="<?php echo esc_url($cta_href); ?>"<?php echo $cta_target; ?> style="display: inline-block; margin-top: 16px; background: <?php echo esc_attr($primary_color); ?>; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;"><?php echo esc_html($cta_text); ?></a>
                            <?php endif; ?>
                        </div>
                    </div>
                </section>
                <?php break;

            case 'videos':
                $videos = $section['videos'] ?? array();
                // Filter out empties — support both string and object formats
                $videos = array_filter($videos, function($v) {
                    return is_string($v) ? !empty($v) : !empty($v['url']);
                });
                if (!empty($videos)) :
                    $vid_count = count($videos);
                    $vid_cols = $vid_count >= 3 ? 3 : $vid_count;
                ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-videos" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#fff'; ?>;">
                    <div style="max-width: 1200px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 16px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <div style="display: grid; grid-template-columns: repeat(<?php echo $vid_cols; ?>, 1fr); gap: 24px;">
                            <?php foreach ($videos as $vid) :
                                // Support both old string format and new {url, title} object
                                $vid_url = is_string($vid) ? $vid : ($vid['url'] ?? '');
                                $vid_title = is_string($vid) ? '' : (gas_ps_field($vid, 'title', $lang));
                                // Extract embed URL from various formats
                                $embed_url = '';
                                if (preg_match('/src=["\']([^"\']+)["\']/', $vid_url, $m)) {
                                    $embed_url = $m[1];
                                } elseif (preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $vid_url, $m)) {
                                    $embed_url = 'https://www.youtube.com/embed/' . $m[1];
                                } elseif (preg_match('/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/', $vid_url, $m)) {
                                    $embed_url = 'https://www.youtube.com/embed/' . $m[1];
                                } elseif (preg_match('/vimeo\.com\/(\d+)/', $vid_url, $m)) {
                                    $embed_url = 'https://player.vimeo.com/video/' . $m[1];
                                }
                                if ($embed_url) :
                            ?>
                            <div>
                                <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                                    <iframe src="<?php echo esc_url($embed_url); ?>" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 12px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                                </div>
                                <?php if ($vid_title) : ?>
                                <h3 style="font-size: 1.2rem; font-weight: 600; color: #1e293b; margin: 12px 0 0; text-align: center;"><?php echo esc_html($vid_title); ?></h3>
                                <?php endif; ?>
                            </div>
                            <?php endif; endforeach; ?>
                        </div>
                    </div>
                </section>
                <?php endif; break;

            case 'gallery':
                $images = $section['images'] ?? array();
                if (!empty($images)) : ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-gallery" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#f8fafc'; ?>;">
                    <div style="max-width: 1200px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 16px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <div class="gas-ps-gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
                            <?php foreach ($images as $img) :
                                $src = is_array($img) ? ($img['url'] ?? $img['src'] ?? '') : $img;
                                $alt = is_array($img) ? ($img['alt'] ?? '') : '';
                            ?>
                                <img src="<?php echo esc_url($src); ?>" alt="<?php echo esc_attr($alt); ?>" style="width: 100%; height: 250px; object-fit: cover; border-radius: 12px;">
                            <?php endforeach; ?>
                        </div>
                    </div>
                </section>
                <?php endif; break;

            case 'cards':
                $cards = $section['items'] ?? $section['cards'] ?? array();
                if (!empty($cards)) : ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-cards" style="padding: 40px 24px; background: <?php echo $bg_col ? esc_attr($bg_col) : '#f8fafc'; ?>;">
                    <div style="max-width: 1200px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 8px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <?php $cards_subtitle = gas_ps_field($section, 'subheading', $lang) ?: gas_ps_field($section, 'subtitle', $lang); if ($cards_subtitle) : ?>
                            <p style="color: #64748b; text-align: center; margin: 0 0 24px; font-size: 1rem; line-height: 1.6; max-width: 700px; margin-left: auto; margin-right: auto;"><?php echo esc_html($cards_subtitle); ?></p>
                        <?php endif; ?>
                        <?php $card_count = count($cards); $card_cols = $card_count <= 2 ? $card_count : 3; ?>
                        <div class="gas-ps-cards-grid" style="display: grid; grid-template-columns: repeat(<?php echo $card_cols; ?>, 1fr); gap: 24px;">
                            <?php foreach ($cards as $card) : ?>
                                <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
                                    <?php if (!empty($card['image'])) : ?><img src="<?php echo esc_url($card['image']); ?>" alt="" style="width: 100%; height: 200px; object-fit: cover;"><?php endif; ?>
                                    <div style="padding: 24px;">
                                        <?php if (!empty(gas_ps_field($card, 'title', $lang))) : ?><h3 style="font-size: 1.2rem; font-weight: 600; color: #1e293b; margin: 0 0 8px;"><?php echo esc_html(gas_ps_field($card, 'title', $lang)); ?></h3><?php endif; ?>
                                        <?php $card_body = gas_ps_field($card, 'description', $lang) ?: gas_ps_field($card, 'body', $lang); if (!empty($card_body)) : ?><div style="color: #475569; margin: 0; line-height: 1.6; font-size: 0.95rem;"><?php echo wp_kses_post($card_body); ?></div><?php endif; ?>
                                        <?php
                                        $cta_link = $card['cta_link'] ?? $card['link'] ?? '';
                                        $cta_text = gas_ps_field($card, 'cta_text', $lang);
                                        if (empty($cta_text)) {
                                            foreach (array('en','fr','de','es','nl','ja') as $fl) {
                                                if (!empty($card['cta_text_' . $fl])) { $cta_text = $card['cta_text_' . $fl]; break; }
                                            }
                                        }
                                        if (empty($cta_text)) $cta_text = gas_ps_field($card, 'link_text', $lang, '');
                                        if (!empty($cta_link) && !empty($cta_text)) : ?><a href="<?php echo esc_url($cta_link); ?>" style="display: inline-block; margin-top: 16px; padding: 12px 32px; background: <?php echo esc_attr($primary_color); ?>; color: #fff; font-weight: 600; text-decoration: none; border-radius: 8px; transition: opacity 0.2s;"><?php echo esc_html($cta_text); ?></a><?php endif; ?>
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
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #fff; margin: 0 0 16px;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <?php if ($body) : ?><p style="font-size: 1.05rem; color: rgba(255,255,255,0.9); margin: 0 0 20px; line-height: 1.6;"><?php echo esc_html($body); ?></p><?php endif; ?>
                        <?php if ($cta_text && $cta_link) : ?><a href="<?php echo esc_url($cta_link); ?>" style="display: inline-block; background: #fff; color: <?php echo esc_attr($bg_color); ?>; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 1rem;"><?php echo esc_html($cta_text); ?></a><?php endif; ?>
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
                            <details style="border-bottom: 1px solid #e5e7eb; padding: 16px 0;">
                                <summary style="font-size: 1rem; font-weight: 600; color: #1e293b; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center;"><?php echo esc_html($q); ?><span style="font-size: 1.5rem; color: #94a3b8; transition: transform 0.2s;">+</span></summary>
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
                        <?php if ($image) : ?><div style="<?php echo $img_order; ?>"><img src="<?php echo esc_url($image); ?>" alt="" style="width: 100%; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);"></div><?php endif; ?>
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
                                <div style="background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                                    <?php $t_text = gas_ps_field($item, 'text', $lang); if (!empty($t_text)) : ?><p style="font-size: 1rem; line-height: 1.6; color: #475569; font-style: italic; margin: 0 0 16px;">"<?php echo esc_html($t_text); ?>"</p><?php endif; ?>
                                    <div style="font-weight: 600; color: #1e293b;"><?php echo esc_html(gas_ps_field($item, 'name', $lang)); ?></div>
                                    <?php $t_role = gas_ps_field($item, 'role', $lang); if (!empty($t_role)) : ?><div style="font-size: 0.9rem; color: #94a3b8;"><?php echo esc_html($t_role); ?></div><?php endif; ?>
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
                        <div style="border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
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
                        <div style="position: relative; padding-bottom: 56.25%; height: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
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
        font-size: 1rem !important;
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
