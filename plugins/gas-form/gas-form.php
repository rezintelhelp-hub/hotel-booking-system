<?php
/**
 * Plugin Name: GAS Form
 * Plugin URI: https://gas.travel
 * Description: On-brand lead capture forms for GAS clients — replaces Keap/Mailchimp hosted forms with shortcode-embedded forms that push to the configured CRM via the GAS API.
 * Version: 1.0.0
 * Author: GAS - Guest Accommodation System
 * License: Proprietary - All Rights Reserved
 * License URI: https://gas.travel/license
 */

/*
 * Copyright © 2024–2026 Steve Driver / Global Accommodation Systems.
 * All rights reserved. Proprietary software.
 * See LICENSE at the repository root.
 */

if (!defined('ABSPATH')) exit;
define('GAS_FORM_DEFAULT_API_URL', 'https://admin.gas.travel');

add_action('init', function() {
    add_shortcode('gas_form', array('GAS_Form', 'render_shortcode'));
});

add_action('admin_menu', function() {
    add_options_page('GAS Form Settings', 'GAS Form', 'manage_options', 'gas-form-settings', array('GAS_Form', 'settings_page'));
});

add_action('admin_init', function() {
    register_setting('gas_form_settings', 'gas_form_api_url');
    register_setting('gas_form_settings', 'gas_form_account_id');
});

class GAS_Form {

    private static function api_url() {
        return get_option('gas_form_api_url', '') ?: GAS_FORM_DEFAULT_API_URL;
    }

    private static function account_id() {
        return get_option('gas_form_account_id', '') ?: get_option('gas_shop_client_id', '') ?: get_option('gas_client_id', '');
    }

    public static function settings_page() {
        ?>
        <div class="wrap">
            <h1>GAS Form Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('gas_form_settings'); ?>
                <table class="form-table">
                    <tr><th>API URL</th><td><input type="url" name="gas_form_api_url" value="<?php echo esc_attr(get_option('gas_form_api_url', '')); ?>" class="regular-text" placeholder="<?php echo GAS_FORM_DEFAULT_API_URL; ?>"></td></tr>
                    <tr><th>Account ID</th><td><input type="text" name="gas_form_account_id" value="<?php echo esc_attr(get_option('gas_form_account_id', '')); ?>" class="regular-text"><p class="description">Falls back to GAS Shop or GAS Booking account_id when blank.</p></td></tr>
                </table>
                <?php submit_button(); ?>
            </form>
            <h2>Usage</h2>
            <p>Embed any form by slug:</p>
            <code>[gas_form slug="free-guide"]</code>
            <p style="margin-top:8px;">You can override the account per-shortcode:</p>
            <code>[gas_form slug="free-guide" account="173"]</code>
        </div>
        <?php
    }

    public static function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'slug' => '',
            'account' => '',
            'theme' => 'auto'  // light / dark / auto
        ), $atts, 'gas_form');

        if (empty($atts['slug'])) return '<p style="color:#ef4444">[gas_form] missing slug attribute.</p>';
        $accountId = $atts['account'] ?: self::account_id();
        if (empty($accountId)) return '<p style="color:#ef4444">[gas_form] missing account ID — set one in Settings → GAS Form.</p>';

        $apiUrl = trailingslashit(self::api_url());
        $configEndpoint = $apiUrl . 'api/public/forms/' . intval($accountId) . '/' . sanitize_key($atts['slug']);
        $submitEndpoint = $configEndpoint . '/submit';

        // Unique container id so multiple forms can co-exist on the same page.
        $cid = 'gas-form-' . wp_generate_uuid4();

        ob_start();
        ?>
        <div id="<?php echo esc_attr($cid); ?>" class="gas-form-wrap" data-config="<?php echo esc_attr($configEndpoint); ?>" data-submit="<?php echo esc_attr($submitEndpoint); ?>">
            <div class="gas-form-loading" style="text-align:center; padding:32px; color:#94a3b8;">Loading…</div>
        </div>
        <style>
        .gas-form-wrap { max-width: 480px; margin: 24px auto; font-family: 'Segoe UI', Arial, sans-serif; }
        .gas-form-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
        .gas-form-card h3 { margin: 0 0 8px; font-size: 1.4rem; color: #1e293b; }
        .gas-form-card .gas-form-desc { color: #64748b; margin: 0 0 20px; line-height: 1.5; }
        .gas-form-card .gas-form-field { margin-bottom: 14px; }
        .gas-form-card .gas-form-field label { display: block; font-size: 0.9rem; font-weight: 600; color: #374151; margin-bottom: 4px; }
        .gas-form-card input[type=text],
        .gas-form-card input[type=email],
        .gas-form-card input[type=tel] {
            width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 1rem; box-sizing: border-box; font-family: inherit;
        }
        .gas-form-card input:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
        .gas-form-card .gas-form-checkbox { display: flex; align-items: flex-start; gap: 10px; font-size: 0.9rem; color: #475569; line-height: 1.4; }
        .gas-form-card .gas-form-checkbox input { margin-top: 3px; }
        .gas-form-card button[type=submit] { width: 100%; padding: 12px 20px; background: #10b981; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 8px; transition: background 0.15s; }
        .gas-form-card button[type=submit]:hover { background: #059669; }
        .gas-form-card button[type=submit]:disabled { opacity: 0.6; cursor: not-allowed; }
        .gas-form-card .gas-form-error { color: #ef4444; font-size: 0.9rem; margin-top: 8px; }
        .gas-form-card .gas-form-required { color: #ef4444; }
        .gas-form-card .gas-form-honeypot { position: absolute !important; left: -9999px !important; }
        .gas-form-success { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 28px 24px; text-align: center; }
        .gas-form-success h3 { margin: 0 0 8px; color: #047857; }
        .gas-form-success p { margin: 0 0 16px; color: #475569; }
        .gas-form-success a.gas-form-download { display: inline-block; padding: 10px 24px; background: #10b981; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
        </style>
        <script>
        (function(){
            var wrap = document.getElementById('<?php echo esc_js($cid); ?>');
            if (!wrap) return;
            var configUrl = wrap.dataset.config;
            var submitUrl = wrap.dataset.submit;

            fetch(configUrl).then(function(r){ return r.json(); }).then(function(data){
                if (!data.success || !data.form) {
                    wrap.innerHTML = '<p style="color:#ef4444; text-align:center; padding:24px;">Form not found.</p>';
                    return;
                }
                renderForm(data.form);
            }).catch(function(){
                wrap.innerHTML = '<p style="color:#ef4444; text-align:center; padding:24px;">Could not load form.</p>';
            });

            function renderForm(form) {
                var fields = Array.isArray(form.fields) ? form.fields : [];
                if (!fields.length) {
                    // Default field set when form has none configured.
                    fields = [
                        { name: 'first_name', type: 'text', label: 'First name', required: true },
                        { name: 'email', type: 'email', label: 'Email', required: true },
                        { name: 'consent', type: 'checkbox', label: 'I consent to receiving the information I requested.', required: true }
                    ];
                }

                var html = '<form class="gas-form-card" novalidate>';
                html += '<h3>' + escapeHtml(form.title || 'Sign up') + '</h3>';
                if (form.description) html += '<p class="gas-form-desc">' + escapeHtml(form.description) + '</p>';

                fields.forEach(function(f){
                    var req = f.required ? ' <span class="gas-form-required">*</span>' : '';
                    var name = escapeHtml(f.name);
                    var label = escapeHtml(f.label || f.name);
                    if (f.type === 'checkbox') {
                        html += '<div class="gas-form-field"><label class="gas-form-checkbox"><input type="checkbox" name="' + name + '"' + (f.required ? ' required' : '') + '> <span>' + label + req + '</span></label></div>';
                    } else {
                        var inputType = f.type === 'email' ? 'email' : (f.type === 'tel' ? 'tel' : 'text');
                        html += '<div class="gas-form-field"><label>' + label + req + '</label><input type="' + inputType + '" name="' + name + '"' + (f.required ? ' required' : '') + '></div>';
                    }
                });

                // Honeypot — hidden from real users, bots fill it in.
                html += '<input type="text" name="website_url" class="gas-form-honeypot" tabindex="-1" autocomplete="off">';
                html += '<button type="submit">Submit</button>';
                html += '<div class="gas-form-error" style="display:none;"></div>';
                html += '</form>';
                wrap.innerHTML = html;

                wrap.querySelector('form').addEventListener('submit', function(e){
                    e.preventDefault();
                    var btn = wrap.querySelector('button[type=submit]');
                    var errEl = wrap.querySelector('.gas-form-error');
                    errEl.style.display = 'none';
                    btn.disabled = true; var originalText = btn.textContent; btn.textContent = 'Sending…';

                    var fd = new FormData(e.target);
                    var payload = {};
                    fd.forEach(function(v, k){ payload[k] = v; });
                    // Coerce checkboxes — FormData omits unchecked, set to true when present.
                    fields.forEach(function(f){ if (f.type === 'checkbox') payload[f.name] = !!payload[f.name]; });

                    fetch(submitUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }).then(function(r){ return r.json(); }).then(function(data){
                        if (!data.success) { errEl.textContent = data.error || 'Submit failed.'; errEl.style.display = 'block'; btn.disabled = false; btn.textContent = originalText; return; }
                        renderSuccess(data, form);
                    }).catch(function(){
                        errEl.textContent = 'Connection error. Please try again.';
                        errEl.style.display = 'block';
                        btn.disabled = false; btn.textContent = originalText;
                    });
                });
            }

            function renderSuccess(data, form) {
                if (data.action === 'redirect' && data.redirect_url) {
                    window.location.href = data.redirect_url;
                    return;
                }
                var html = '<div class="gas-form-success">';
                html += '<h3>Thank you!</h3>';
                html += '<p>' + escapeHtml(data.message || form.success_message || 'We\'ll be in touch.') + '</p>';
                if (data.action === 'serve_file' && data.file_url) {
                    html += '<a class="gas-form-download" href="' + encodeURI(data.file_url) + '" target="_blank" rel="noopener">📥 Download your guide</a>';
                }
                html += '</div>';
                wrap.innerHTML = html;
            }

            function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
        })();
        </script>
        <?php
        return ob_get_clean();
    }
}
