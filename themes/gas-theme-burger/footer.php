</main>

<?php
$api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();
$site_name = $api['site_name'] ?? get_bloginfo('name');

// CTA Band
$cta_enabled = !empty($api['footer_cta_enabled']);
$cta_heading = $api['footer_cta_heading'] ?? '';
$cta_text = $api['footer_cta_text'] ?? '';
$cta_btn_text = $api['footer_cta_btn_text'] ?? '';
$cta_btn_link = $api['footer_cta_btn_link'] ?? '';
$cta_btn_bg = $api['footer_cta_btn_bg'] ?? '#ffffff';
$cta_btn_style = $api['footer_cta_btn_style'] ?? 'outline';
$cta_bg = $api['footer_cta_bg'] ?? '#1e293b';
$cta_text_color = $api['footer_cta_text_color'] ?? '#ffffff';

// Info Band
$info_heading = $api['footer_info_heading'] ?? '';
$info_bg = $api['footer_info_bg'] ?? ($api['primary_color'] ?? '#F97224');
$info_text_color = $api['footer_info_text_color'] ?? '#1a1a1a';

// Partner logos
$logos = array();
for ($i = 1; $i <= 8; $i++) {
    $url = $api['footer_partner_logo_' . $i] ?? '';
    if (!empty($url)) $logos[] = $url;
}

// Social
$social = array(
    'facebook'    => array('url' => $api['footer_social_facebook'] ?? '', 'icon' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'),
    'instagram'   => array('url' => $api['footer_social_instagram'] ?? '', 'icon' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>'),
    'twitter'     => array('url' => $api['footer_social_twitter'] ?? '', 'icon' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'),
    'youtube'     => array('url' => $api['footer_social_youtube'] ?? '', 'icon' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'),
    'linkedin'    => array('url' => $api['footer_social_linkedin'] ?? '', 'icon' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>'),
    'tiktok'      => array('url' => $api['footer_social_tiktok'] ?? '', 'icon' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>'),
    'pinterest'   => array('url' => $api['footer_social_pinterest'] ?? '', 'icon' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg>'),
    'tripadvisor' => array('url' => $api['footer_social_tripadvisor'] ?? '', 'icon' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.006 4.295c-2.67 0-5.338.784-7.645 2.353H0l1.963 2.135a5.997 5.997 0 004.04 10.43 5.976 5.976 0 004.075-1.6L12.006 20l1.928-2.387a5.976 5.976 0 004.075 1.6 5.997 5.997 0 004.04-10.43L24 6.648h-4.36a13.573 13.573 0 00-7.634-2.353zM12 6.75c1.665 0 3.258.31 4.723.87a5.98 5.98 0 00-3.727 1.776A5.98 5.98 0 009.27 7.62 12.08 12.08 0 0112 6.75zM6.004 9.095a3.75 3.75 0 110 7.5 3.75 3.75 0 010-7.5zm11.992 0a3.75 3.75 0 110 7.5 3.75 3.75 0 010-7.5zM6.004 11.25a1.594 1.594 0 100 3.188 1.594 1.594 0 000-3.188zm11.992 0a1.594 1.594 0 100 3.188 1.594 1.594 0 000-3.188z"/></svg>'),
);

// Copyright
$copyright = $api['footer_copyright'] ?? '';
if (empty($copyright)) $copyright = '&copy; ' . date('Y') . ' ' . esc_html($site_name) . '. All rights reserved.';
$show_powered_by = $api['footer_show_powered_by'] ?? true;
$company_number = $api['footer_company_number'] ?? '';
$company_label = $api['footer_company_number_label'] ?? '';
$tax_number = $api['footer_tax_number'] ?? '';
$tax_label = $api['footer_tax_number_label'] ?? '';

// Legal pages — Terms and Privacy always shown, Impressum only if enabled
$legal_links = array();
$legal_links[] = array('url' => home_url('/terms/'), 'label' => 'Terms & Conditions');
$legal_links[] = array('url' => home_url('/privacy-policy/'), 'label' => 'Privacy Policy');
if (!empty($api['page_impressum_enabled'])) $legal_links[] = array('url' => home_url('/impressum/'), 'label' => 'Impressum');
?>

<footer class="gas-burger-footer">

<?php if ($cta_enabled && ($cta_heading || $cta_text || $cta_btn_text)) : ?>
<!-- Band 1: CTA -->
<div class="gas-footer-cta" style="background: <?php echo esc_attr($cta_bg); ?>; color: <?php echo esc_attr($cta_text_color); ?>;">
    <div class="gas-footer-cta-inner">
        <div class="gas-footer-cta-content">
            <?php if ($cta_heading) : ?><h3 style="margin: 0 0 0.25rem; font-size: 1.3rem; color: <?php echo esc_attr($cta_text_color); ?>;"><?php echo esc_html($cta_heading); ?></h3><?php endif; ?>
            <?php if ($cta_text) : ?><p style="margin: 0; opacity: 0.85; font-size: 0.95rem;"><?php echo esc_html($cta_text); ?></p><?php endif; ?>
        </div>
        <?php if ($cta_btn_text && $cta_btn_link) : ?>
        <a href="<?php echo esc_url($cta_btn_link); ?>" target="_blank" rel="noopener" class="gas-footer-cta-btn" style="
            <?php if ($cta_btn_style === 'filled') : ?>
                background: <?php echo esc_attr($cta_btn_bg); ?>; color: <?php echo esc_attr($cta_bg); ?>; border: 2px solid <?php echo esc_attr($cta_btn_bg); ?>;
            <?php else : ?>
                background: transparent; color: <?php echo esc_attr($cta_btn_bg); ?>; border: 2px solid <?php echo esc_attr($cta_btn_bg); ?>;
            <?php endif; ?>
        "><?php echo esc_html($cta_btn_text); ?></a>
        <?php endif; ?>
    </div>
</div>
<?php endif; ?>

<!-- Band 2: Info / Partners -->
<div class="gas-footer-info" style="background: <?php echo esc_attr($info_bg); ?>; color: <?php echo esc_attr($info_text_color); ?>;">
    <div class="gas-footer-info-inner">

        <?php if ($info_heading || !empty($logos)) : ?>
        <div class="gas-footer-partners">
            <?php if ($info_heading) : ?><h4 style="margin: 0 0 1.25rem; font-size: 1.1rem; color: <?php echo esc_attr($info_text_color); ?>;"><?php echo esc_html($info_heading); ?></h4><?php endif; ?>
            <?php if (!empty($logos)) : ?>
            <div class="gas-footer-logos">
                <?php foreach ($logos as $logo_url) : ?>
                <img src="<?php echo esc_url($logo_url); ?>" alt="" style="height: 60px; width: auto; object-fit: contain; background: rgba(255,255,255,0.9); border-radius: 50%; padding: 8px;">
                <?php endforeach; ?>
            </div>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <div class="gas-footer-bottom">
            <div class="gas-footer-legal">
                <?php foreach ($legal_links as $link) : ?>
                <a href="<?php echo esc_url($link['url']); ?>" style="color: <?php echo esc_attr($info_text_color); ?>; text-decoration: none; opacity: 0.8;"><?php echo esc_html($link['label']); ?></a>
                <?php endforeach; ?>
                <?php if ($copyright) : ?>
                <span style="opacity: 0.7; font-size: 0.85rem;"><?php echo wp_kses_post($copyright); ?></span>
                <?php endif; ?>
                <?php if ($show_powered_by) : ?>
                <span style="opacity: 0.5; font-size: 0.8rem;">Powered by <a href="https://gas.travel" target="_blank" style="color: <?php echo esc_attr($info_text_color); ?>; text-decoration: underline;">GAS</a></span>
                <?php endif; ?>
            </div>
            <div class="gas-footer-social">
                <?php foreach ($social as $platform => $data) :
                    if (!empty($data['url'])) : ?>
                    <a href="<?php echo esc_url($data['url']); ?>" target="_blank" rel="noopener" aria-label="<?php echo esc_attr(ucfirst($platform)); ?>" style="color: <?php echo esc_attr($info_text_color); ?>; opacity: 0.7;">
                        <?php echo $data['icon']; ?>
                    </a>
                <?php endif; endforeach; ?>
            </div>
        </div>

        <?php if ($company_number || $tax_number) : ?>
        <div style="text-align: center; margin-top: 0.75rem; font-size: 0.8rem; opacity: 0.6;">
            <?php if ($company_number) { if ($company_label) echo esc_html($company_label) . ': '; echo esc_html($company_number); } ?>
            <?php if ($company_number && $tax_number) echo ' | '; ?>
            <?php if ($tax_number) { if ($tax_label) echo esc_html($tax_label) . ': '; echo esc_html($tax_number); } ?>
        </div>
        <?php endif; ?>

    </div>
</div>

</footer>

<?php wp_footer(); ?>
</body>
</html>
