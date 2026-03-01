</main>

<?php
// Get site configuration from GAS API
$site_config = null;
$gas_api_url = get_option('gas_api_url', '');
$gas_client_id = get_option('gas_client_id', '');

if ($gas_api_url && $gas_client_id) {
    $cache_key = 'gas_site_config_' . $gas_client_id;
    $site_config = get_transient($cache_key);
    
    if ($site_config === false) {
        $response = wp_remote_get($gas_api_url . '/api/public/client/' . $gas_client_id . '/site-config', array(
            'timeout' => 10,
            'sslverify' => false
        ));
        
        if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
            $body = json_decode(wp_remote_retrieve_body($response), true);
            if ($body && $body['success']) {
                $site_config = $body['config'];
                // Cache for 5 minutes
                set_transient($cache_key, $site_config, 30);
            }
        }
    }
}

// Fallback to theme customizer if API not configured
$use_api = !empty($site_config);

// Get footer data from API or theme settings
$business_name = $use_api ? ($site_config['contact']['business_name'] ?? get_bloginfo('name')) : get_bloginfo('name');
$footer_bg = $use_api ? ($site_config['branding']['footer']['bg_color'] ?? '#0f172a') : get_theme_mod('developer_footer_bg', '#0f172a');
$footer_text = $use_api ? ($site_config['branding']['footer']['text_color'] ?? '#ffffff') : get_theme_mod('developer_footer_text', '#ffffff');
$copyright = $use_api ? ($site_config['branding']['footer']['copyright'] ?? '') : '';

// Contact info
$phone = $use_api ? ($site_config['contact']['phone'] ?? '') : get_theme_mod('developer_phone', '');
$email = $use_api ? ($site_config['contact']['email'] ?? '') : get_theme_mod('developer_email', '');
$address = $use_api ? ($site_config['contact']['address'] ?? $site_config['contact']['address_formatted'] ?? '') : get_theme_mod('developer_address', '');

// Social links
$facebook = $use_api ? ($site_config['contact']['social']['facebook'] ?? '') : get_theme_mod('developer_social_facebook', '');
$instagram = $use_api ? ($site_config['contact']['social']['instagram'] ?? '') : get_theme_mod('developer_social_instagram', '');
$twitter = $use_api ? ($site_config['contact']['social']['twitter'] ?? '') : get_theme_mod('developer_social_twitter', '');
$youtube = $use_api ? ($site_config['contact']['social']['youtube'] ?? '') : get_theme_mod('developer_social_youtube', '');
$linkedin = $use_api ? ($site_config['contact']['social']['linkedin'] ?? '') : '';
$tiktok = $use_api ? ($site_config['contact']['social']['tiktok'] ?? '') : '';
$pinterest = $use_api ? ($site_config['contact']['social']['pinterest'] ?? '') : '';
$tripadvisor = $use_api ? ($site_config['contact']['social']['tripadvisor'] ?? '') : '';

// Navigation - build from page settings using menu titles
$quick_links = array();
$legal_links = array();

$api_settings = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();

// Build quick links from enabled pages with their menu titles
$quick_links[] = array('label' => $api_settings['page_home_menu_title'] ?? 'Home', 'url' => '/');

// Rooms page
$rooms_enabled = $api_settings['page_rooms_enabled'] ?? true;
if ($rooms_enabled && $rooms_enabled !== 'false' && $rooms_enabled !== false) {
    $rooms_label = $api_settings['page_rooms_menu_title'] ?? 'Rooms';
    $quick_links[] = array('label' => $rooms_label, 'url' => '/book-now/');
}

// About page
$about_enabled = $api_settings['page_about_enabled'] ?? false;
if ($about_enabled && $about_enabled !== 'false' && $about_enabled !== false) {
    $about_label = $api_settings['page_about_menu_title'] ?? 'About Us';
    $quick_links[] = array('label' => $about_label, 'url' => '/about/');
}

// Contact page
$contact_enabled = $api_settings['page_contact_enabled'] ?? true;
if ($contact_enabled && $contact_enabled !== 'false' && $contact_enabled !== false) {
    $contact_label = $api_settings['page_contact_menu_title'] ?? 'Contact';
    $quick_links[] = array('label' => $contact_label, 'url' => '/contact/');
}

// Blog page
$blog_enabled = $api_settings['page_blog_enabled'] ?? false;
if ($blog_enabled && $blog_enabled !== 'false' && $blog_enabled !== false) {
    $blog_label = $api_settings['page_blog_menu_title'] ?? 'Blog';
    $quick_links[] = array('label' => $blog_label, 'url' => '/blog/');
}

// Legal links (with API multilingual override)
$legal_links = array(
    array('label' => $api_settings['page_terms_menu_title'] ?? 'Terms & Conditions', 'url' => '/terms/'),
    array('label' => $api_settings['page_privacy_menu_title'] ?? 'Privacy Policy', 'url' => '/privacy/')
);

// Check if attractions exist
$has_attractions = $use_api ? ($site_config['features']['has_attractions'] ?? false) : false;
?>

<footer class="developer-footer" style="background: <?php echo esc_attr($footer_bg); ?>; color: <?php echo esc_attr($footer_text); ?>;">
    <div class="developer-container">
        <div class="developer-footer-grid">
            <!-- Brand Column -->
            <div class="developer-footer-brand">
                <?php if (has_custom_logo()) : ?>
                    <?php the_custom_logo(); ?>
                <?php else : ?>
                    <h3 style="color: <?php echo esc_attr($footer_text); ?>; margin-bottom: 0;"><?php echo esc_html($business_name); ?></h3>
                <?php endif; ?>
                <p style="color: <?php echo esc_attr($footer_text); ?>; opacity: 0.8;"><?php bloginfo('description'); ?></p>
                
                <?php if ($facebook || $instagram || $twitter || $youtube || $linkedin || $tiktok || $pinterest || $tripadvisor) : ?>
                <div class="developer-footer-social">
                    <?php if ($facebook) : ?>
                        <a href="<?php echo esc_url($facebook); ?>" target="_blank" aria-label="Facebook" style="color: <?php echo esc_attr($footer_text); ?>;">
                            <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20"><path d="M18.77,7.46H14.5v-1.9c0-.9.6-1.1,1-1.1h3V.5h-4.33C10.24.5,9.5,3.44,9.5,5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4Z"/></svg>
                        </a>
                    <?php endif; ?>
                    <?php if ($instagram) : ?>
                        <a href="<?php echo esc_url($instagram); ?>" target="_blank" aria-label="Instagram" style="color: <?php echo esc_attr($footer_text); ?>;">
                            <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20"><path d="M12,2.16c3.2,0,3.58,0,4.85.07,3.25.15,4.77,1.69,4.92,4.92.06,1.27.07,1.65.07,4.85s0,3.58-.07,4.85c-.15,3.23-1.66,4.77-4.92,4.92-1.27.06-1.65.07-4.85.07s-3.58,0-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s0-3.58.07-4.85C2.38,3.92,3.9,2.38,7.15,2.23,8.42,2.18,8.8,2.16,12,2.16ZM12,0C8.74,0,8.33,0,7.05.07c-4.35.2-6.78,2.62-7,7C0,8.33,0,8.74,0,12s0,3.67.07,4.95c.2,4.36,2.62,6.78,7,7C8.33,24,8.74,24,12,24s3.67,0,4.95-.07c4.35-.2,6.78-2.62,7-7C24,15.67,24,15.26,24,12s0-3.67-.07-4.95c-.2-4.35-2.62-6.78-7-7C15.67,0,15.26,0,12,0Zm0,5.84A6.16,6.16,0,1,0,18.16,12,6.16,6.16,0,0,0,12,5.84ZM12,16a4,4,0,1,1,4-4A4,4,0,0,1,12,16ZM18.41,4.15a1.44,1.44,0,1,0,1.44,1.44A1.44,1.44,0,0,0,18.41,4.15Z"/></svg>
                        </a>
                    <?php endif; ?>
                    <?php if ($twitter) : ?>
                        <a href="<?php echo esc_url($twitter); ?>" target="_blank" aria-label="Twitter/X" style="color: <?php echo esc_attr($footer_text); ?>;">
                            <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                    <?php endif; ?>
                    <?php if ($youtube) : ?>
                        <a href="<?php echo esc_url($youtube); ?>" target="_blank" aria-label="YouTube" style="color: <?php echo esc_attr($footer_text); ?>;">
                            <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20"><path d="M23.5,6.19a3.02,3.02,0,0,0-2.12-2.14C19.5,3.5,12,3.5,12,3.5s-7.5,0-9.38.55A3.02,3.02,0,0,0,.5,6.19,31.64,31.64,0,0,0,0,12a31.64,31.64,0,0,0,.5,5.81,3.02,3.02,0,0,0,2.12,2.14c1.88.55,9.38.55,9.38.55s7.5,0,9.38-.55a3.02,3.02,0,0,0,2.12-2.14A31.64,31.64,0,0,0,24,12,31.64,31.64,0,0,0,23.5,6.19ZM9.55,15.57V8.43L15.82,12Z"/></svg>
                        </a>
                    <?php endif; ?>
                    <?php if ($linkedin) : ?>
                        <a href="<?php echo esc_url($linkedin); ?>" target="_blank" aria-label="LinkedIn" style="color: <?php echo esc_attr($footer_text); ?>;">
                            <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        </a>
                    <?php endif; ?>
                    <?php if ($tiktok) : ?>
                        <a href="<?php echo esc_url($tiktok); ?>" target="_blank" aria-label="TikTok" style="color: <?php echo esc_attr($footer_text); ?>;">
                            <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                        </a>
                    <?php endif; ?>
                    <?php if ($pinterest) : ?>
                        <a href="<?php echo esc_url($pinterest); ?>" target="_blank" aria-label="Pinterest" style="color: <?php echo esc_attr($footer_text); ?>;">
                            <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>
                        </a>
                    <?php endif; ?>
                    <?php if ($tripadvisor) : ?>
                        <a href="<?php echo esc_url($tripadvisor); ?>" target="_blank" aria-label="TripAdvisor" style="color: <?php echo esc_attr($footer_text); ?>;">
                            <svg fill="currentColor" viewBox="0 0 24 24" width="20" height="20"><path d="M12.006 4.295c-2.67 0-5.338.784-7.645 2.353H0l1.963 2.135a5.997 5.997 0 0 0 4.04 10.43 5.976 5.976 0 0 0 4.075-1.6L12 19.705l1.922-2.09a5.972 5.972 0 0 0 4.072 1.598 5.997 5.997 0 0 0 4.04-10.43L24 6.647h-4.35a13.573 13.573 0 0 0-7.644-2.352zM12 6.255c1.531 0 3.063.303 4.504.903C13.943 8.138 12 10.43 12 13.1c0-2.67-1.943-4.962-4.504-5.942A11.72 11.72 0 0 1 12 6.256zM6.002 9.157a4.059 4.059 0 1 1 0 8.118 4.059 4.059 0 0 1 0-8.118zm11.992 0a4.059 4.059 0 1 1 .002 8.118 4.059 4.059 0 0 1-.002-8.118zM6.002 11.11a2.107 2.107 0 1 0 0 4.212 2.107 2.107 0 0 0 0-4.212zm11.992 0a2.107 2.107 0 1 0 0 4.212 2.107 2.107 0 0 0 0-4.212z"/></svg>
                        </a>
                    <?php endif; ?>
                </div>
                <?php endif; ?>
            </div>
            
            <!-- Quick Links Column -->
            <div>
                <h4 style="color: <?php echo esc_attr($footer_text); ?>;"><?php echo esc_html($api_settings['footer_heading_quicklinks'] ?? 'Quick Links'); ?></h4>
                <ul class="developer-footer-links">
                    <?php foreach ($quick_links as $link) : ?>
                        <li><a href="<?php echo esc_url(home_url($link['url'])); ?>" style="color: <?php echo esc_attr($footer_text); ?>; opacity: 0.8;"><?php echo esc_html($link['label']); ?></a></li>
                    <?php endforeach; ?>
                </ul>
            </div>
            
            <!-- Legal/Explore Column -->
            <div>
                <h4 style="color: <?php echo esc_attr($footer_text); ?>;"><?php echo esc_html($api_settings['footer_heading_legal'] ?? 'Legal'); ?></h4>
                <ul class="developer-footer-links">
                    <?php foreach ($legal_links as $link) : ?>
                        <li><a href="<?php echo esc_url(home_url($link['url'])); ?>" style="color: <?php echo esc_attr($footer_text); ?>; opacity: 0.8;"><?php echo esc_html($link['label']); ?></a></li>
                    <?php endforeach; ?>
                </ul>
            </div>
            
            <!-- Contact Column -->
            <?php if ($phone || $email) : ?>
            <div>
                <h4 style="color: <?php echo esc_attr($footer_text); ?>;"><?php echo esc_html($api_settings['page_contact_menu_title'] ?? 'Contact'); ?></h4>
                <ul class="developer-footer-links">
                    <?php if ($phone) : ?>
                        <li><a href="tel:<?php echo esc_attr(preg_replace('/[^0-9+]/', '', $phone)); ?>" style="color: <?php echo esc_attr($footer_text); ?>; opacity: 0.8;"><?php echo esc_html($phone); ?></a></li>
                    <?php endif; ?>
                    <?php if ($email) : ?>
                        <li><a href="mailto:<?php echo esc_attr($email); ?>" style="color: <?php echo esc_attr($footer_text); ?>; opacity: 0.8;"><?php echo esc_html($email); ?></a></li>
                    <?php endif; ?>
                    <?php if ($address) : ?>
                        <li style="color: <?php echo esc_attr($footer_text); ?>; opacity: 0.8;"><?php echo esc_html($address); ?></li>
                    <?php endif; ?>
                </ul>
            </div>
            <?php endif; ?>
        </div>
        
        <div class="developer-footer-bottom" style="border-color: <?php echo esc_attr($footer_text); ?>33;">
            <p style="color: <?php echo esc_attr($footer_text); ?>; opacity: 0.7;">
                <?php if (!empty($api_settings['footer_copyright'])) : ?>
                    <?php echo esc_html($api_settings['footer_copyright']); ?>
                <?php else : ?>
                    &copy; <?php echo date('Y'); ?> <?php echo esc_html($business_name); ?>. All rights reserved.
                <?php endif; ?>
                Powered by <a href="https://developer-admin.replit.app" target="_blank" style="color: <?php echo esc_attr($footer_text); ?>; text-decoration: underline;">GAS Booking</a>
            </p>
        </div>
    </div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
