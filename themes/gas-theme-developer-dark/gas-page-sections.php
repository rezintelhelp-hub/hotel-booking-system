<?php
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

    // Only render the page title hero if sections don't already contain a hero
    $has_hero_section = in_array('hero', array_column($sections, 'type'));
    if (!$has_hero_section) {
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
                        <?php if ($body) : ?><div style="font-size: 1.1rem; color: #fff; opacity: 0.9; margin: 0 0 24px; line-height: 1.8;"><?php echo wp_kses_post(wpautop($body)); ?></div><?php endif; ?>
                        <?php if ($cta_text && $cta_link) : ?><a href="<?php echo esc_url($cta_link); ?>" style="display: inline-block; background: <?php echo esc_attr($primary_color); ?>; color: #fff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600;"><?php echo esc_html($cta_text); ?></a><?php endif; ?>
                    </div>
                </section>
                <?php break;

            case 'text':
                ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-text" style="padding: 60px 24px; background: #fff;">
                    <div style="max-width: 800px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 20px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <?php if ($body) : ?><div style="font-size: 1.1rem; line-height: 1.9; color: #475569;"><?php echo wp_kses_post(wpautop($body)); ?></div><?php endif; ?>
                    </div>
                </section>
                <?php break;

            case 'image_text':
            case 'text-image':
                $image = $section['image'] ?? '';
                $image_position = $section['image_position'] ?? 'left';
                $img_order = ($image_position === 'right') ? 'order: 2;' : 'order: 1;';
                $txt_order = ($image_position === 'right') ? 'order: 1;' : 'order: 2;';
                ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-imgtext" style="padding: 60px 24px; background: #fff;">
                    <div class="gas-ps-imgtext-grid" style="max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center;">
                        <?php if ($image) : ?><div style="<?php echo $img_order; ?>"><img src="<?php echo esc_url($image); ?>" alt="" style="width: 100%; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);"></div><?php endif; ?>
                        <div style="<?php echo $txt_order; ?>">
                            <?php if ($heading) : ?><h2 style="font-size: 1.8rem; font-weight: 700; color: #1e293b; margin: 0 0 16px;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                            <?php if ($body) : ?><div style="font-size: 1.05rem; line-height: 1.8; color: #475569;"><?php echo wp_kses_post(wpautop($body)); ?></div><?php endif; ?>
                        </div>
                    </div>
                </section>
                <?php break;

            case 'gallery':
                $images = $section['images'] ?? array();
                if (!empty($images)) : ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-gallery" style="padding: 60px 24px; background: #f8fafc;">
                    <div style="max-width: 1200px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 32px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
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
                $cards = $section['cards'] ?? array();
                if (!empty($cards)) : ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-cards" style="padding: 60px 24px; background: #f8fafc;">
                    <div style="max-width: 1200px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 32px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <div class="gas-ps-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
                            <?php foreach ($cards as $card) : ?>
                                <div style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
                                    <?php if (!empty($card['image'])) : ?><img src="<?php echo esc_url($card['image']); ?>" alt="" style="width: 100%; height: 200px; object-fit: cover;"><?php endif; ?>
                                    <div style="padding: 24px;">
                                        <?php if (!empty(gas_ps_field($card, 'title', $lang))) : ?><h3 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0 0 8px;"><?php echo esc_html(gas_ps_field($card, 'title', $lang)); ?></h3><?php endif; ?>
                                        <?php if (!empty(gas_ps_field($card, 'body', $lang))) : ?><p style="color: #64748b; margin: 0; line-height: 1.6;"><?php echo esc_html(gas_ps_field($card, 'body', $lang)); ?></p><?php endif; ?>
                                        <?php if (!empty($card['link'])) : ?><a href="<?php echo esc_url($card['link']); ?>" style="display: inline-block; margin-top: 12px; color: <?php echo esc_attr($primary_color); ?>; font-weight: 600; text-decoration: none;"><?php echo esc_html(gas_ps_field($card, 'link_text', $lang, 'Learn more')); ?> &rarr;</a><?php endif; ?>
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
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-cta" style="padding: 80px 24px; background: <?php echo esc_attr($bg_color); ?>; text-align: center;">
                    <div style="max-width: 700px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2.2rem; font-weight: 700; color: #fff; margin: 0 0 16px;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <?php if ($body) : ?><p style="font-size: 1.15rem; color: rgba(255,255,255,0.9); margin: 0 0 28px; line-height: 1.7;"><?php echo esc_html($body); ?></p><?php endif; ?>
                        <?php if ($cta_text && $cta_link) : ?><a href="<?php echo esc_url($cta_link); ?>" style="display: inline-block; background: #fff; color: <?php echo esc_attr($bg_color); ?>; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 1.1rem;"><?php echo esc_html($cta_text); ?></a><?php endif; ?>
                    </div>
                </section>
                <?php break;

            case 'faq':
                $items = $section['items'] ?? array();
                if (!empty($items)) : ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-faq" style="padding: 60px 24px; background: #fff;">
                    <div style="max-width: 800px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 32px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <?php foreach ($items as $i => $item) :
                            $q = gas_ps_field($item, 'q', $lang);
                            if (empty($q)) $q = $item['question'] ?? '';
                            $a = gas_ps_field($item, 'a', $lang);
                            if (empty($a)) $a = $item['answer'] ?? '';
                            $uid = 'faq_' . md5($q . $i);
                        ?>
                            <details style="border-bottom: 1px solid #e5e7eb; padding: 20px 0;">
                                <summary style="font-size: 1.1rem; font-weight: 600; color: #1e293b; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center;"><?php echo esc_html($q); ?><span style="font-size: 1.5rem; color: #94a3b8; transition: transform 0.2s;">+</span></summary>
                                <div style="padding-top: 12px; font-size: 1rem; line-height: 1.7; color: #475569;"><?php echo wp_kses_post(wpautop($a)); ?></div>
                            </details>
                        <?php endforeach; ?>
                    </div>
                </section>
                <?php endif; break;

            case 'testimonials':
                $items = $section['items'] ?? array();
                if (!empty($items)) : ?>
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-testimonials" style="padding: 60px 24px; background: #f8fafc;">
                    <div style="max-width: 1100px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 32px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
                        <div class="gas-ps-testimonials-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
                            <?php foreach ($items as $item) : ?>
                                <div style="background: #fff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
                                    <?php $t_text = gas_ps_field($item, 'text', $lang); if (!empty($t_text)) : ?><p style="font-size: 1.05rem; line-height: 1.7; color: #475569; font-style: italic; margin: 0 0 16px;">"<?php echo esc_html($t_text); ?>"</p><?php endif; ?>
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
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-map" style="padding: 60px 24px; background: #fff;">
                    <div style="max-width: 1100px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 24px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
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
                <section<?php echo $id_attr; ?> class="gas-ps-section gas-ps-video" style="padding: 60px 24px; background: #f8fafc;">
                    <div style="max-width: 900px; margin: 0 auto;">
                        <?php if ($heading) : ?><h2 style="font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 24px; text-align: center;"><?php echo esc_html($heading); ?></h2><?php endif; ?>
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
