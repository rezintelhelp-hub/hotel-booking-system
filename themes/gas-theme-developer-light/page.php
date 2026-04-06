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
 * Default Page Template
 *
 * @package GAS_Developer
 */

// Terms page — delegate to dedicated template before get_header()
$page_slug_early = get_post_field('post_name', get_post());
if (in_array($page_slug_early, array('terms', 'terms-and-conditions', 'terms-of-service'))) {
    require get_template_directory() . '/template-terms.php';
    return;
}

// Privacy page — delegate to dedicated template before get_header()
if (in_array($page_slug_early, array('privacy', 'privacy-policy'))) {
    require get_template_directory() . '/template-privacy.php';
    return;
}

// Impressum page — delegate to dedicated template before get_header()
if (in_array($page_slug_early, array('impressum', 'legal-disclosure', 'legal-notice'))) {
    require get_template_directory() . '/template-impressum.php';
    return;
}

get_header();

// Auto-detect page type by slug
$page_slug = get_post_field('post_name', get_post());
$content = get_the_content();

// Get API settings
$api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();

// Get primary color for accents
$primary_color = $api['primary_color'] ?? get_theme_mod('developer_primary_color', '#2563eb');

// --- GAS Page Sections: check for custom sections before default rendering ---
require_once get_template_directory() . '/gas-page-sections.php';
if (gas_render_page_sections($page_slug, $primary_color)) {
    get_footer();
    return;
}
// --- End GAS Page Sections check ---

// Properties portfolio — if gas-properties plugin is active, use it instead of rooms grid
if (in_array($page_slug, array('properties', 'apartments')) && shortcode_exists('gas_properties')) {
    // Falls through to the hero + special page section below
} elseif (in_array($page_slug, array('book-now', 'properties', 'rooms', 'listings', 'accommodations'))) {
    ?>
    <div class="developer-book-now-page" style="padding-top: 100px;">
        <?php if (shortcode_exists('gas_rooms')) : ?>
            <?php echo do_shortcode('[gas_rooms]'); ?>
        <?php else : ?>
            <div style="text-align: center; padding: 80px 24px; background: #f8fafc; border-radius: 12px; margin: 20px 24px;">
                <h3>Properties Coming Soon</h3>
                <p style="color: #64748b;">Please install and activate the GAS Booking plugin to display properties.</p>
            </div>
        <?php endif; ?>
    </div>
    <?php
    get_footer();
    return;
}

// Check if this is the Checkout page - skip hero, just show content
if (in_array($page_slug, array('checkout', 'book', 'booking', 'reserve'))) {
    ?>
    <div class="developer-checkout-page" style="padding-top: 100px;">
        <div class="developer-container" style="max-width: 1200px; margin: 0 auto; padding: 0 24px 60px;">
            <?php while (have_posts()) : the_post(); ?>
                <?php the_content(); ?>
            <?php endwhile; ?>
        </div>
    </div>
    <?php
    get_footer();
    return;
}

// Check if this is the Room Detail page — needs full width for gallery + sidebar layout
if (in_array($page_slug, array('room', 'room-detail', 'property', 'unit'))) {
    ?>
    <div style="padding-top: 100px;">
        <?php while (have_posts()) : the_post(); ?>
            <?php the_content(); ?>
        <?php endwhile; ?>
    </div>
    <?php
    get_footer();
    return;
}

// Check which special page this is
$special_page = '';
if (in_array($page_slug, array('about', 'about-us', 'our-story'))) {
    $special_page = 'about';
} elseif (in_array($page_slug, array('contact', 'contact-us', 'get-in-touch'))) {
    $special_page = 'contact';
} elseif (in_array($page_slug, array('terms', 'terms-and-conditions', 'terms-of-service'))) {
    $special_page = 'terms';
} elseif (in_array($page_slug, array('privacy', 'privacy-policy'))) {
    $special_page = 'privacy';
} elseif (in_array($page_slug, array('blog', 'news', 'journal', 'posts'))) {
    $special_page = 'blog';
} elseif (in_array($page_slug, array('attractions', 'things-to-do', 'explore', 'local-area', 'area-guide'))) {
    $special_page = 'attractions';
} elseif (in_array($page_slug, array('gallery', 'photos', 'images'))) {
    $special_page = 'gallery';
} elseif (in_array($page_slug, array('properties', 'apartments'))) {
    $special_page = 'properties';
}

// Wide layout for special pages
$wide_layout = in_array($special_page, array('about', 'contact', 'blog', 'attractions', 'gallery', 'terms', 'privacy', 'properties'));
$max_width = $wide_layout ? '1100px' : '800px';

// Get page-specific settings from API
$page_settings_key = 'page_' . str_replace('-', '_', $special_page);
$page_title = $api[$page_settings_key . '_title'] ?? get_the_title();
$page_subtitle = $api[$page_settings_key . '_subtitle'] ?? '';
$page_hero_image = $api[$page_settings_key . '_hero_image'] ?? '';
$page_header_bg = $api[$page_settings_key . '_header_bg'] ?? '#1e293b';
$page_header_text = $api[$page_settings_key . '_header_text'] ?? '#ffffff';
$page_bg = $api[$page_settings_key . '_bg'] ?? '#ffffff';
$page_title_color = $api[$page_settings_key . '_title_color'] ?? '#1e293b';
$page_text_color = $api[$page_settings_key . '_text_color'] ?? '#475569';

// Fallback hero images from homepage about section if not set
if (empty($page_hero_image) && $special_page === 'about') {
    $page_hero_image = $api['about_image'] ?? get_theme_mod('developer_about_image', '');
}

// Parse overlay color for rgba
$overlay_hex = $page_header_bg;
if (strlen($overlay_hex) === 7 && $overlay_hex[0] === '#') {
    $overlay_r = hexdec(substr($overlay_hex, 1, 2));
    $overlay_g = hexdec(substr($overlay_hex, 3, 2));
    $overlay_b = hexdec(substr($overlay_hex, 5, 2));
} else {
    $overlay_r = 30; $overlay_g = 41; $overlay_b = 59;
}

// Determine hero height — use Web Builder setting if available, else defaults
$custom_hero_height = $api[$page_settings_key . '_hero_height'] ?? null;
$custom_hero_padding = $api[$page_settings_key . '_hero_padding'] ?? '0';
$hero_height = $custom_hero_height ? $custom_hero_height . 'vh' : ($page_hero_image ? '50vh' : '35vh');
$hero_min_height = $page_hero_image ? '350px' : '200px';

// Check hero enabled toggle for pages that support it — default ON when never set
$hero_enabled = true;
$hero_key = 'page_' . str_replace('-', '_', $special_page) . '_hero_enabled';
if (!empty($special_page) && isset($api[$hero_key])) {
    $hero_val = $api[$hero_key];
    $hero_enabled = !($hero_val === false || $hero_val === 'false' || $hero_val === '0' || $hero_val === 0);
}
?>

<?php if ($hero_enabled) : ?>
<!-- Page Hero Section (like homepage) -->
<section class="developer-page-hero" style="position: relative; min-height: <?php echo $hero_min_height; ?>; height: <?php echo $hero_height; ?>; display: flex; align-items: center; justify-content: center; overflow: hidden;">
    <!-- Background Image or Color -->
    <?php if ($page_hero_image) : ?>
        <div class="developer-page-hero-bg" style="position: absolute; inset: 0; background-image: url('<?php echo esc_url($page_hero_image); ?>'); background-size: cover; background-position: center;"></div>
    <?php else : ?>
        <div class="developer-page-hero-bg" style="position: absolute; inset: 0; background: <?php echo esc_attr($page_header_bg); ?>;"></div>
    <?php endif; ?>
    
    <!-- Overlay -->
    <div class="developer-page-hero-overlay" style="position: absolute; inset: 0; background: rgba(<?php echo "$overlay_r, $overlay_g, $overlay_b"; ?>, <?php echo $page_hero_image ? '0.5' : '0.1'; ?>);"></div>
    
    <!-- Top gradient for header readability -->
    <div style="position: absolute; top: 0; left: 0; right: 0; height: 150px; background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%); pointer-events: none; z-index: 1;"></div>
    
    <!-- Content -->
    <div class="developer-page-hero-content" style="position: relative; z-index: 2; text-align: center; padding: <?php echo intval($custom_hero_padding) > 0 ? intval($custom_hero_padding) : 80; ?>px 24px 0; max-width: 900px;">
        <h1 style="font-family: var(--developer-font-display, 'Playfair Display', serif); font-size: clamp(2.5rem, 5vw, 4rem); font-weight: 700; color: <?php echo esc_attr($page_header_text); ?>; margin: 0 0 16px; text-shadow: 0 2px 20px rgba(0,0,0,0.3);"><?php echo esc_html($page_title); ?></h1>
        
        <?php if ($page_subtitle) : ?>
            <p style="font-size: clamp(1.1rem, 2vw, 1.35rem); color: <?php echo esc_attr($page_header_text); ?>; opacity: 0.9; margin: 0; max-width: 600px; margin: 0 auto; text-shadow: 0 1px 10px rgba(0,0,0,0.2);"><?php echo esc_html($page_subtitle); ?></p>
        <?php endif; ?>
    </div>
</section>
<?php else : ?>
<!-- No hero — just spacing for the fixed header -->
<div style="padding-top: 100px;"></div>
<?php /* Simple header disabled — hero off means no header at all
<div style="padding-top: 120px; padding-bottom: 40px; text-align: center; background: <?php echo esc_attr($page_header_bg); ?>;">
    <h1 style="font-family: var(--developer-font-display, 'Playfair Display', serif); font-size: clamp(2rem, 4vw, 3rem); font-weight: 700; color: <?php echo esc_attr($page_header_text); ?>; margin: 0 0 8px;"><?php echo esc_html($page_title); ?></h1>
    <?php if ($page_subtitle) : ?>
        <p style="font-size: 1.15rem; color: <?php echo esc_attr($page_header_text); ?>; opacity: 0.8; margin: 0;"><?php echo esc_html($page_subtitle); ?></p>
    <?php endif; ?>
</div>
*/ ?>
<?php endif; ?>

<!-- Page Content -->
<div class="developer-page-content" style="background-color: <?php echo esc_attr($page_bg); ?>; padding: 60px 0;">
    <div class="developer-container">
        <?php while (have_posts()) : the_post(); ?>
            <div class="developer-page-body" style="max-width: <?php echo esc_attr($max_width); ?>; margin: 0 auto; padding: 0 24px;">
                
                <?php if ($special_page === 'about') : 
                    $about_content = $api['page_about_content'] ?? get_theme_mod('developer_page-about_content', '');
                    $about_image = $api['page_about_content_image'] ?? get_theme_mod('developer_page-about_content_image', '') ?: ($api['about_image'] ?? get_theme_mod('developer_about_image', ''));
                    $about_image_pos = $api['page_about_image_position'] ?? get_theme_mod('developer_page-about_image_position', 'left');
                    $about_image_2 = $api['page_about_content_image_2'] ?? get_theme_mod('developer_page-about_content_image_2', '');
                    $about_image_2_pos = $api['page_about_image_2_position'] ?? get_theme_mod('developer_page-about_image_2_position', 'right');
                    $about_content_title = $api['page_about_content_title'] ?? get_theme_mod('developer_page-about_content_title', '');
                    $story = $about_content ?: get_theme_mod('developer_about_page_story', '');
                    if (empty($story)) $story = $api['about_text'] ?? get_theme_mod('developer_about_text', '');
                    
                    // Common image styles
                    $img_style_base = 'max-width: 380px; width: 45%; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); margin-bottom: 1rem;';
                    $img_style_left = $img_style_base . ' float: left; margin-right: 2rem;';
                    $img_style_right = $img_style_base . ' float: right; margin-left: 2rem;';
                ?>
                    <div class="gas-about-page">
                        <?php if ($about_content_title) : ?>
                            <h2 style="font-size: 1.8rem; font-weight: 700; color: <?php echo esc_attr($page_title_color); ?>; margin: 0 0 1.5rem;"><?php echo esc_html($about_content_title); ?></h2>
                        <?php endif; ?>
                        
                        <?php if ($story) : 
                            // Split content into paragraphs for image insertion
                            $paragraphs_html = wpautop(esc_html($story));
                            $parts = preg_split('/(<p>.*?<\/p>)/s', $paragraphs_html, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
                            // Filter to only actual paragraph tags
                            $paras = array();
                            foreach ($parts as $part) {
                                $trimmed = trim($part);
                                if (!empty($trimmed)) $paras[] = $trimmed;
                            }
                            $total = count($paras);
                            $mid = max(1, intval($total / 2));
                        ?>
                        <div class="gas-about-content" style="font-size: 1.15rem; line-height: 1.9; color: <?php echo esc_attr($page_text_color); ?>;">
                            <?php foreach ($paras as $i => $para) : ?>
                                <?php if ($i === 0 && $about_image && $about_image_pos !== 'none') : ?>
                                    <img src="<?php echo esc_url($about_image); ?>" alt="" class="gas-about-img-1" style="<?php echo $about_image_pos === 'right' ? $img_style_right : $img_style_left; ?>">
                                <?php endif; ?>
                                <?php if ($i === $mid && $about_image_2 && $about_image_2_pos !== 'none') : ?>
                                    <div style="clear: both;"></div>
                                    <img src="<?php echo esc_url($about_image_2); ?>" alt="" class="gas-about-img-2" style="<?php echo $about_image_2_pos === 'left' ? $img_style_left : $img_style_right; ?>">
                                <?php endif; ?>
                                <?php echo $para; ?>
                            <?php endforeach; ?>
                            <div style="clear: both;"></div>
                        </div>
                        <?php endif; ?>
                    </div>
                    <style>
                    @media (max-width: 768px) {
                        .gas-about-img-1, .gas-about-img-2 {
                            float: none !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 0 1.5rem 0 !important;
                        }
                    }
                    </style>
                
                <?php elseif ($special_page === 'contact') :
                    $email = get_theme_mod('developer_email', '');
                    $phone = get_theme_mod('developer_phone', '');
                    $address = get_theme_mod('developer_address', '');
                    $contact_lang = function_exists('developer_get_current_language') ? developer_get_current_language() : 'en';
                    $contact_t = [
                        'en' => ['send_heading' => 'Send Us a Message', 'name' => 'Name', 'email' => 'Email', 'message' => 'Message', 'send' => 'Send Message', 'touch' => 'Get in Touch', 'phone' => 'Phone', 'email_label' => 'Email', 'address' => 'Address'],
                        'de' => ['send_heading' => 'Nachricht senden', 'name' => 'Ihr Name', 'email' => 'Ihre E-Mail', 'message' => 'Nachricht', 'send' => 'Nachricht senden', 'touch' => 'Kontakt', 'phone' => 'Telefon', 'email_label' => 'E-Mail', 'address' => 'Adresse'],
                        'fr' => ['send_heading' => 'Envoyez-nous un message', 'name' => 'Nom', 'email' => 'E-mail', 'message' => 'Message', 'send' => 'Envoyer', 'touch' => 'Contactez-nous', 'phone' => 'Téléphone', 'email_label' => 'E-mail', 'address' => 'Adresse'],
                        'es' => ['send_heading' => 'Envíenos un mensaje', 'name' => 'Nombre', 'email' => 'Correo electrónico', 'message' => 'Mensaje', 'send' => 'Enviar mensaje', 'touch' => 'Contacto', 'phone' => 'Teléfono', 'email_label' => 'Correo electrónico', 'address' => 'Dirección'],
                        'nl' => ['send_heading' => 'Stuur ons een bericht', 'name' => 'Naam', 'email' => 'E-mail', 'message' => 'Bericht', 'send' => 'Versturen', 'touch' => 'Contact', 'phone' => 'Telefoon', 'email_label' => 'E-mail', 'address' => 'Adres'],
                        'it' => ['send_heading' => 'Inviaci un messaggio', 'name' => 'Nome', 'email' => 'E-mail', 'message' => 'Messaggio', 'send' => 'Invia messaggio', 'touch' => 'Contattaci', 'phone' => 'Telefono', 'email_label' => 'E-mail', 'address' => 'Indirizzo'],
                        'pt' => ['send_heading' => 'Envie-nos uma mensagem', 'name' => 'Nome', 'email' => 'E-mail', 'message' => 'Mensagem', 'send' => 'Enviar mensagem', 'touch' => 'Contacto', 'phone' => 'Telefone', 'email_label' => 'E-mail', 'address' => 'Morada'],
                        'ja' => ['send_heading' => 'メッセージを送る', 'name' => 'お名前', 'email' => 'メールアドレス', 'message' => 'メッセージ', 'send' => '送信', 'touch' => 'お問い合わせ', 'phone' => '電話', 'email_label' => 'メール', 'address' => '住所'],
                    ];
                    $ct = $contact_t[$contact_lang] ?? $contact_t['en'];
                ?>
                    <div class="gas-contact-page">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px;">
                            <div>
                                <h2 style="font-size: 1.5rem; font-weight: 700; color: <?php echo esc_attr($page_title_color); ?>; margin: 0 0 24px;"><?php echo esc_html($ct['send_heading']); ?></h2>
                                <form style="display: flex; flex-direction: column; gap: 20px;">
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                        <div><label style="display: block; font-weight: 600; margin-bottom: 6px;"><?php echo esc_html($ct['name']); ?> *</label><input type="text" required style="width: 100%; padding: 14px; border: 2px solid #e5e7eb; border-radius: 10px;"></div>
                                        <div><label style="display: block; font-weight: 600; margin-bottom: 6px;"><?php echo esc_html($ct['email']); ?> *</label><input type="email" required style="width: 100%; padding: 14px; border: 2px solid #e5e7eb; border-radius: 10px;"></div>
                                    </div>
                                    <div><label style="display: block; font-weight: 600; margin-bottom: 6px;"><?php echo esc_html($ct['message']); ?> *</label><textarea rows="5" required style="width: 100%; padding: 14px; border: 2px solid #e5e7eb; border-radius: 10px;"></textarea></div>
                                    <button type="submit" style="background: <?php echo esc_attr($primary_color); ?>; color: white; border: none; padding: 16px 32px; border-radius: 10px; font-weight: 600; cursor: pointer;"><?php echo esc_html($ct['send']); ?></button>
                                </form>
                            </div>
                            <div>
                                <h2 style="font-size: 1.5rem; font-weight: 700; color: <?php echo esc_attr($page_title_color); ?>; margin: 0 0 24px;"><?php echo esc_html($ct['touch']); ?></h2>
                                <?php if ($phone) : ?><div style="display: flex; gap: 16px; margin-bottom: 20px;"><div style="width: 50px; height: 50px; background: <?php echo esc_attr($primary_color); ?>15; border-radius: 12px; display: flex; align-items: center; justify-content: center;">📞</div><div><strong><?php echo esc_html($ct['phone']); ?></strong><br><a href="tel:<?php echo preg_replace('/[^0-9+]/', '', $phone); ?>" style="color: <?php echo esc_attr($primary_color); ?>;"><?php echo esc_html($phone); ?></a></div></div><?php endif; ?>
                                <?php if ($email) : ?><div style="display: flex; gap: 16px; margin-bottom: 20px;"><div style="width: 50px; height: 50px; background: <?php echo esc_attr($primary_color); ?>15; border-radius: 12px; display: flex; align-items: center; justify-content: center;">✉️</div><div><strong><?php echo esc_html($ct['email_label']); ?></strong><br><a href="mailto:<?php echo esc_attr($email); ?>" style="color: <?php echo esc_attr($primary_color); ?>;"><?php echo esc_html($email); ?></a></div></div><?php endif; ?>
                                <?php if ($address) : ?><div style="display: flex; gap: 16px;"><div style="width: 50px; height: 50px; background: <?php echo esc_attr($primary_color); ?>15; border-radius: 12px; display: flex; align-items: center; justify-content: center;">📍</div><div><strong><?php echo esc_html($ct['address']); ?></strong><br><?php echo nl2br(esc_html($address)); ?></div></div><?php endif; ?>
                            </div>
                        </div>
                    </div>
                    <style>@media (max-width: 768px) { .gas-contact-page > div { grid-template-columns: 1fr !important; } }</style>
                
                <?php elseif ($special_page === 'blog') : ?>
                    <?php if (shortcode_exists('gas_blog_categories')) echo do_shortcode('[gas_blog_categories]'); ?>
                    <?php if (shortcode_exists('gas_blog')) echo do_shortcode('[gas_blog limit="12"]'); ?>

                <?php elseif ($special_page === 'attractions') : ?>
                    <?php if (shortcode_exists('gas_attractions_categories')) echo do_shortcode('[gas_attractions_categories]'); ?>
                    <?php if (shortcode_exists('gas_attractions')) echo do_shortcode('[gas_attractions]'); ?>

                <?php elseif ($special_page === 'properties') : ?>
                    <?php if (shortcode_exists('gas_properties')) echo do_shortcode('[gas_properties]'); ?>

                <?php else : ?>
                    <div style="font-size: 1.05rem; line-height: 1.8; color: <?php echo esc_attr($page_text_color); ?>;"><?php the_content(); ?></div>
                <?php endif; ?>
                
            </div>
        <?php endwhile; ?>
    </div>
</div>

<?php get_footer(); ?>
