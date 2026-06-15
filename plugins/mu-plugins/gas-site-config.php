<?php
/**
 * Plugin Name: GAS Site Config
 * Description: Provides gas_get_site_config() and developer_get_api_settings() for any theme that needs to read Web Builder settings from admin.gas.travel. Used by gas-theme-burger (which has no functions.php API caller) and as a shared fallback for the developer themes. Drop in wp-content/mu-plugins/ to load on every site.
 * Version: 0.1.0
 */

if (!defined('ABSPATH')) exit;

/**
 * Fetch the Web Builder config for the current site.
 *
 * Reads `gas_client_id` + `gas_api_url` site options (set during site
 * provisioning). Returns the full `config` object the GAS public API
 * provides — properties, themes, website, languages, etc.
 *
 * Cached in a transient keyed by blog_id + language for 5 minutes; the
 * GAS Admin Web Builder save path flushes the matching transient.
 *
 * @param  string|null $lang Optional language code. Defaults to the
 *                          primary language for this site.
 * @return array              Empty array on any failure — callers should
 *                          handle missing keys with ?? defaults so the
 *                          page still renders.
 */
function gas_get_site_config($lang = null) {
    $client_id = get_option('gas_client_id', '');
    if (empty($client_id)) return array();

    if ($lang === null) {
        // Honour transient written by previous fetch (developer themes also
        // use 'gas_site_config_<client_id>' for the same purpose).
        $cached_cfg = get_transient('gas_site_config_' . $client_id);
        $lang = $cached_cfg['website']['languages']['primary'] ?? 'en';
    }

    $cache_key = 'gas_api_settings_' . get_current_blog_id() . '_' . $lang;
    $cached = get_transient($cache_key);
    if ($cached !== false) return $cached;

    $api_url = get_option('gas_api_url', 'https://admin.gas.travel');
    $site_url = home_url('/');
    $request_url = $api_url . '/api/public/client/' . urlencode($client_id) . '/site-config?site_url=' . urlencode($site_url);
    $response = wp_remote_get($request_url, array(
        'timeout' => 10,
        'sslverify' => true,
    ));
    if (is_wp_error($response)) return array();

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    if (!$data || !isset($data['success']) || !$data['success']) return array();

    $config = $data['config'] ?? array();
    set_transient('gas_site_config_' . $client_id, $config, 30);

    // Cache for 5 minutes — flushed on Web Builder save via
    // gas-api.php?action=flush_transient (see CLAUDE.md "Performance & Caching").
    set_transient($cache_key, $config, 5 * MINUTE_IN_SECONDS);
    return $config;
}

/**
 * Extract a multilingual value from a Web Builder settings array.
 *
 * Stored shape: `{key}_ml: { en: "...", fr: "..." }` plus a plain
 * `{key}: "..."` fallback for English / legacy keys.
 *
 * @param array       $settings The footer/header/etc array
 * @param string      $key      Field key as stored (e.g. 'newsletter-heading')
 * @param string|null $lang     Two-letter lang code; defaults to en
 * @return string               Resolved string or '' if not found
 */
function gas_get_ml_value($settings, $key, $lang = null) {
    if (!is_array($settings)) return '';
    if ($lang === null) $lang = 'en';
    $ml_key = str_replace('-', '_', $key) . '_ml';
    if (isset($settings[$ml_key]) && is_array($settings[$ml_key])) {
        $val = $settings[$ml_key][$lang] ?? $settings[$ml_key]['en'] ?? '';
        if (!empty($val)) return $val;
    }
    return $settings[$key] ?? '';
}

/**
 * Compatibility shim — themes calling developer_get_api_settings() get
 * the same shape they expected from gas-theme-developer-light's
 * functions.php, but without the 200-line field mapping. Returns the
 * raw config so theme footer.php / header.php can read the nested
 * arrays directly with array access.
 *
 * The developer themes' own functions.php still defines its own version
 * (which adds extra `footer_*` / `hero_*` / etc. derived keys). That
 * one wins via function_exists() guards — the mu-plugin only fires when
 * the active theme didn't already provide one.
 */
if (!function_exists('developer_get_api_settings')) {
    function developer_get_api_settings() {
        $cfg = gas_get_site_config();
        $website = $cfg['website'] ?? array();
        $footer = $website['footer'] ?? array();
        $header = $website['header'] ?? array();
        $contact = $website['page-contact'] ?? array();
        $branding = $cfg['branding'] ?? array();

        $lang = $cfg['website']['languages']['primary'] ?? 'en';

        // Flatten the slice of fields the burger theme footer.php and
        // header.php read. Add more keys here as other themes adopt the
        // mu-plugin pattern.
        //
        // DELIBERATELY NOT setting site_name / cta_text / cta_link /
        // header_logo_image. The burger header.php reads those four keys
        // and falls back to get_bloginfo('name') / 'Book Now' /
        // '/book-now/' / WP custom_logo respectively. Leaving them
        // undefined here preserves the pre-mu-plugin header behaviour
        // exactly — the header was working before, don't touch it.
        return array(
            'primary_color' => $branding['primary_color'] ?? '#FF931E',
            'currency' => $cfg['currency'] ?? 'GBP',
            'language' => $lang,

            // Raw nested arrays — themes that already access $cfg['website']['footer']
            // shape can fall back to these.
            '_footer' => $footer,
            '_header' => $header,
            '_contact' => $contact,
            '_branding' => $branding,

            // Footer styling / layout
            'footer_bg' => $footer['bg'] ?? $footer['bg-color'] ?? '#0f172a',
            'footer_text' => $footer['text'] ?? $footer['text-color'] ?? '#ffffff',
            'footer_layout' => $footer['layout'] ?? 'default',
            'footer_show_powered_by' => isset($footer['show-powered-by']) ? !!$footer['show-powered-by'] : true,

            // Footer multilingual
            'footer_heading_quicklinks' => gas_get_ml_value($footer, 'heading-quicklinks', $lang) ?: 'Quick Links',
            'footer_heading_legal' => gas_get_ml_value($footer, 'heading-legal', $lang) ?: 'Legal',
            'footer_copyright' => gas_get_ml_value($footer, 'copyright', $lang),
            'footer_company_number_label' => gas_get_ml_value($footer, 'company-number-label', $lang),
            'footer_company_number' => gas_get_ml_value($footer, 'company-number', $lang),
            'footer_tax_number_label' => gas_get_ml_value($footer, 'tax-number-label', $lang),
            'footer_tax_number' => gas_get_ml_value($footer, 'tax-number', $lang),

            // Footer Band 1: CTA
            'footer_cta_enabled' => !empty($footer['cta-enabled']),
            'footer_cta_heading' => $footer['cta-heading'] ?? '',
            'footer_cta_text' => $footer['cta-text'] ?? '',
            'footer_cta_btn_text' => $footer['cta-btn-text'] ?? '',
            'footer_cta_btn_link' => $footer['cta-btn-link'] ?? '',
            'footer_cta_btn_bg' => $footer['cta-btn-bg'] ?? '#ffffff',
            'footer_cta_btn_style' => $footer['cta-btn-style'] ?? 'outline',
            'footer_cta_bg' => $footer['cta-bg'] ?? '#1e293b',
            'footer_cta_text_color' => $footer['cta-text-color'] ?? '#ffffff',

            // Footer Band 2: Info / Partners
            'footer_info_heading' => $footer['info-heading'] ?? '',
            'footer_info_bg' => $footer['info-bg'] ?? ($branding['primary_color'] ?? '#FF931E'),
            'footer_info_text_color' => $footer['info-text-color'] ?? '#1a1a1a',
            'footer_partner_logo_1' => $footer['partner-logo-1-image-url'] ?? '',
            'footer_partner_logo_2' => $footer['partner-logo-2-image-url'] ?? '',
            'footer_partner_logo_3' => $footer['partner-logo-3-image-url'] ?? '',
            'footer_partner_logo_4' => $footer['partner-logo-4-image-url'] ?? '',
            'footer_partner_logo_5' => $footer['partner-logo-5-image-url'] ?? '',
            'footer_partner_logo_6' => $footer['partner-logo-6-image-url'] ?? '',
            'footer_partner_logo_7' => $footer['partner-logo-7-image-url'] ?? '',
            'footer_partner_logo_8' => $footer['partner-logo-8-image-url'] ?? '',

            // Footer 3-col Brand + Contact + Newsletter (new layout)
            'footer_brand_image_url' => $footer['brand-image-url'] ?? '',
            'footer_brand_text' => gas_get_ml_value($footer, 'brand-text', $lang),
            'footer_brand_link' => $footer['brand-link'] ?? '',
            'footer_show_newsletter' => !empty($footer['show-newsletter']),
            'footer_newsletter_heading' => gas_get_ml_value($footer, 'newsletter-heading', $lang) ?: 'Sign up to our Newsletter',

            // Footer social (also used by burger theme)
            'footer_social_facebook' => $footer['social-facebook'] ?? '',
            'footer_social_instagram' => $footer['social-instagram'] ?? '',
            'footer_social_twitter' => $footer['social-twitter'] ?? '',
            'footer_social_youtube' => $footer['social-youtube'] ?? '',
            'footer_social_linkedin' => $footer['social-linkedin'] ?? '',
            'footer_social_tiktok' => $footer['social-tiktok'] ?? '',
            'footer_social_pinterest' => $footer['social-pinterest'] ?? '',
            'footer_social_tripadvisor' => $footer['social-tripadvisor'] ?? '',

            // Contact (middle column for 3-col layout)
            'contact_address' => gas_get_ml_value($contact, 'address', $lang) ?: ($footer['address'] ?? ''),
            'contact_phone' => $contact['phone'] ?? ($footer['phone'] ?? ''),
            'contact_email' => $contact['email'] ?? ($footer['email'] ?? ''),

            // Optional legal page flags read by footer.php
            'page_impressum_enabled' => !empty(($website['page-impressum'] ?? [])['enabled']),

            // GAS Newsletter API endpoint — for client-side POST from
            // the newsletter form. account_id needed so the row lands on
            // the right inbox.
            'gas_api_url' => get_option('gas_api_url', 'https://admin.gas.travel'),
            'gas_client_id' => get_option('gas_client_id', ''),
        );
    }
}
