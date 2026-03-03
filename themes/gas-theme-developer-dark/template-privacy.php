<?php
/**
 * Template Name: Privacy Policy
 */

get_header();

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
                set_transient($cache_key, $site_config, 30);
            }
        }
    }
}

// Read from website builder flat keys (where GAS Admin saves)
$wp = !empty($site_config['website']['page-privacy']) ? $site_config['website']['page-privacy'] : array();

// Also check legacy nested path as fallback
$legacy = !empty($site_config['pages']['privacy']) ? $site_config['pages']['privacy'] : null;
$legacy_sections = $legacy ? ($legacy['sections'] ?? []) : [];

$use_api = !empty($wp) || !empty($legacy_sections);
$privacy_source = $wp['source'] ?? 'custom';

// Get current language for multilingual content
$lang = function_exists('developer_get_current_language') ? developer_get_current_language() : 'en';
$ml = function_exists('developer_get_ml_value') ? 'developer_get_ml_value' : null;

// Page settings
$page_title = '';
if (!empty($wp)) {
    $page_title = $ml ? $ml($wp, 'title', $lang) : ($wp['title'] ?? '');
}
if (empty($page_title) && $legacy) {
    $page_title = $legacy['title'] ?? '';
}
if (empty($page_title)) {
    $page_title = get_the_title() ?: 'Privacy Policy';
}

$updated_date = $wp['updated'] ?? ($legacy['updated_date'] ?? '');
$effective_date = $wp['effective'] ?? ($legacy['effective_date'] ?? '');

// Build displayable sections array
$all_sections = [];

if ($privacy_source === 'gas-account') {
    // Auto-generate professional privacy policy from site_config contact/seo data
    $contact = $site_config['contact'] ?? [];
    $seo = $site_config['seo'] ?? [];
    $business_name = !empty($contact['business_name']) ? esc_html($contact['business_name']) : 'Our Business';
    $email = !empty($contact['email']) ? esc_html($contact['email']) : '';
    $address = !empty($contact['address_formatted']) ? esc_html($contact['address_formatted']) : '';
    $ga_id = !empty($seo['google_analytics_id']) ? $seo['google_analytics_id'] : '';

    // If no updated_date set, use today
    if (empty($updated_date)) {
        $updated_date = date('Y-m-d');
    }

    // 1. Introduction
    $all_sections[] = [
        'title' => 'Introduction',
        'content' => '<p>' . $business_name . ' ("we", "us", or "our") is committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you visit our website, make a booking, or interact with our services.</p>'
            . '<p>We are committed to complying with the General Data Protection Regulation (GDPR) and other applicable data protection laws. By using our website or services, you acknowledge that you have read and understood this Privacy Policy.</p>',
        'html' => true
    ];

    // 2. Information We Collect
    $all_sections[] = [
        'title' => 'Information We Collect',
        'content' => '<p>We may collect and process the following categories of personal data:</p>'
            . '<p><strong>Personal Information:</strong> Name, email address, telephone number, postal address, and other contact details you provide when making a booking or enquiry.</p>'
            . '<p><strong>Booking Details:</strong> Check-in and check-out dates, room preferences, number of guests, and any special requests or requirements.</p>'
            . '<p><strong>Payment Information:</strong> Payment card details are processed securely by our third-party payment processor and are never stored on our servers.</p>'
            . '<p><strong>Technical Data:</strong> IP address, browser type and version, device information, operating system, time zone setting, and browsing actions on our website.</p>',
        'html' => true
    ];

    // 3. How We Use Your Information
    $all_sections[] = [
        'title' => 'How We Use Your Information',
        'content' => '<p>We use the personal information we collect for the following purposes:</p>'
            . '<ul>'
            . '<li>To process and manage your bookings and payments</li>'
            . '<li>To send booking confirmations, reminders, and pre-arrival information</li>'
            . '<li>To communicate with you about your stay, including responding to enquiries and requests</li>'
            . '<li>To comply with legal and regulatory obligations, including tax and accounting requirements</li>'
            . '<li>To improve our website, services, and guest experience</li>'
            . '<li>To send marketing communications where you have given consent (you may opt out at any time)</li>'
            . '</ul>',
        'html' => true
    ];

    // 4. Payment Processing
    $all_sections[] = [
        'title' => 'Payment Processing',
        'content' => '<p>All payment transactions are processed through Stripe, our trusted third-party payment processor. Stripe handles your card data in compliance with PCI DSS (Payment Card Industry Data Security Standard) requirements.</p>'
            . '<p>We never store, process, or have access to your full credit or debit card numbers. Payment information is transmitted directly to Stripe using industry-standard encryption.</p>',
        'html' => true
    ];

    // 5. Cookies & Analytics
    $cookies_content = '<p>Our website uses essential cookies that are necessary for the site to function correctly, such as maintaining your session and remembering your preferences.</p>';
    if (!empty($ga_id)) {
        $cookies_content .= '<p>We use Google Analytics to understand how visitors interact with our website. Google Analytics uses cookies to collect anonymised information about page visits, traffic sources, and user behaviour. This helps us improve our website and the services we offer. You can opt out of Google Analytics by installing the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a>.</p>';
    } else {
        $cookies_content .= '<p>We may use analytics tools to understand how visitors interact with our website. These tools use cookies to collect anonymised information about page visits and user behaviour, helping us improve our website and services.</p>';
    }
    $cookies_content .= '<p>You can control and manage cookies through your browser settings. Please note that disabling certain cookies may affect the functionality of our website.</p>';
    $all_sections[] = [
        'title' => 'Cookies & Analytics',
        'content' => $cookies_content,
        'html' => true
    ];

    // 6. Third Party Services
    $all_sections[] = [
        'title' => 'Third Party Services',
        'content' => '<p>We work with trusted third-party service providers to deliver our services. These may include:</p>'
            . '<ul>'
            . '<li><strong>Payment Processor (Stripe):</strong> To securely process payments for bookings</li>'
            . '<li><strong>Channel Managers:</strong> To distribute availability across booking platforms</li>'
            . '<li><strong>Hosting Provider:</strong> To host and maintain our website infrastructure</li>'
            . '</ul>'
            . '<p>We only share personal data with third parties to the extent necessary for them to provide their services. All third-party providers are contractually required to protect your data and use it only for the purposes we specify.</p>',
        'html' => true
    ];

    // 7. Data Retention
    $all_sections[] = [
        'title' => 'Data Retention',
        'content' => '<p>We retain personal data only for as long as necessary to fulfil the purposes for which it was collected:</p>'
            . '<ul>'
            . '<li><strong>Booking and financial records:</strong> Retained for the period required by applicable tax and accounting regulations (typically 7 years)</li>'
            . '<li><strong>Marketing data:</strong> Retained until you withdraw your consent or unsubscribe</li>'
            . '<li><strong>Technical logs:</strong> Retained for up to 90 days for security and performance monitoring</li>'
            . '</ul>'
            . '<p>After the applicable retention period, personal data is securely deleted or anonymised.</p>',
        'html' => true
    ];

    // 8. Your Rights (GDPR)
    $rights_content = '<p>Under the General Data Protection Regulation (GDPR), you have the following rights regarding your personal data:</p>'
        . '<ul>'
        . '<li><strong>Right of Access:</strong> You may request a copy of the personal data we hold about you</li>'
        . '<li><strong>Right to Rectification:</strong> You may request that we correct any inaccurate or incomplete data</li>'
        . '<li><strong>Right to Erasure:</strong> You may request that we delete your personal data, subject to legal obligations</li>'
        . '<li><strong>Right to Data Portability:</strong> You may request your data in a structured, commonly used, machine-readable format</li>'
        . '<li><strong>Right to Restrict Processing:</strong> You may request that we limit how we use your data</li>'
        . '<li><strong>Right to Object:</strong> You may object to the processing of your personal data for certain purposes</li>'
        . '<li><strong>Right to Lodge a Complaint:</strong> You have the right to lodge a complaint with a supervisory authority if you believe your data protection rights have been violated</li>'
        . '</ul>';
    if (!empty($email)) {
        $rights_content .= '<p>To exercise any of these rights, please contact us at <a href="mailto:' . $email . '">' . $email . '</a>. We will respond to your request within 30 days.</p>';
    } else {
        $rights_content .= '<p>To exercise any of these rights, please contact us using the details provided below. We will respond to your request within 30 days.</p>';
    }
    $all_sections[] = [
        'title' => 'Your Rights (GDPR)',
        'content' => $rights_content,
        'html' => true
    ];

    // 9. Google API Services Disclosure
    $all_sections[] = [
        'title' => 'Google API Services Disclosure',
        'content' => '<p>Our use and transfer of information received from Google APIs to any other app will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>',
        'html' => true
    ];

    // 10. Contact Us
    $contact_parts = [];
    if (!empty($business_name) && $business_name !== 'Our Business') {
        $contact_parts[] = '<p><strong>' . $business_name . '</strong></p>';
    }
    if (!empty($email)) {
        $contact_parts[] = '<p>Email: <a href="mailto:' . $email . '">' . $email . '</a></p>';
    }
    if (!empty($address)) {
        $contact_parts[] = '<p>Address: ' . $address . '</p>';
    }
    $contact_content = '<p>If you have any questions about this Privacy Policy or how we handle your personal data, please contact us:</p>' . implode('', $contact_parts);
    $all_sections[] = [
        'title' => 'Contact Us',
        'content' => $contact_content,
        'html' => true
    ];

    $use_api = true;

} else {

// Helper: build a section with optional sub-heading
$build_section = function($key, $default_title, $sub_key = 'sub', $legacy_key = null) use ($wp, $ml, $lang, $legacy_sections) {
    $lk = $legacy_key ?: $key;
    $enabled = $wp[$key . '-enabled'] ?? true;
    if ($enabled === false || $enabled === 'false') return null;

    $content = $ml ? $ml($wp, $key, $lang) : ($wp[$key] ?? '');
    if (empty($content) && !empty($legacy_sections[$lk]['content'])) {
        $content = $legacy_sections[$lk]['content'];
    }
    if (empty($content)) return null;

    $title = $ml ? $ml($wp, $key . '-title', $lang) : ($wp[$key . '-title'] ?? '');
    if (empty($title)) $title = $legacy_sections[$lk]['title'] ?? $default_title;

    $sub_heading = $ml ? $ml($wp, $key . '-' . $sub_key, $lang) : ($wp[$key . '-' . $sub_key] ?? '');
    if (empty($sub_heading) && !empty($legacy_sections[$lk]['sub_heading'])) {
        $sub_heading = $legacy_sections[$lk]['sub_heading'];
    }

    $sub_items = [];
    if ($sub_heading) {
        $sub_items[] = ['heading' => $sub_heading, 'content' => $content];
        $content = '';
    }

    return ['title' => $title, 'content' => $content, 'sub_items' => $sub_items];
};

// Introduction
$section = $build_section('intro', 'Introduction');
if ($section) $all_sections[] = $section;

// Data Collection - has two sub-sections
$collection_enabled = $wp['collection-enabled'] ?? true;
if ($collection_enabled !== false && $collection_enabled !== 'false') {
    $content1 = $ml ? $ml($wp, 'collection', $lang) : ($wp['collection'] ?? '');
    if (empty($content1) && !empty($legacy_sections['collection']['content'])) {
        $content1 = $legacy_sections['collection']['content'];
    }
    $content2 = $ml ? $ml($wp, 'how-collect', $lang) : ($wp['how-collect'] ?? '');
    if (empty($content2) && !empty($legacy_sections['collection']['how_collect'])) {
        $content2 = $legacy_sections['collection']['how_collect'];
    }

    if ($content1 || $content2) {
        $title = $ml ? $ml($wp, 'collection-title', $lang) : ($wp['collection-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['collection']['title'] ?? 'Information We Collect';

        $sub_items = [];
        if ($content1) {
            $sub1 = $ml ? $ml($wp, 'collection-sub1', $lang) : ($wp['collection-sub1'] ?? '');
            if (empty($sub1)) $sub1 = $legacy_sections['collection']['sub_heading_1'] ?? 'What Data We Collect';
            $sub_items[] = ['heading' => $sub1, 'content' => $content1];
        }
        if ($content2) {
            $sub2 = $ml ? $ml($wp, 'how-collect-sub', $lang) : ($wp['how-collect-sub'] ?? '');
            if (empty($sub2)) $sub2 = $legacy_sections['collection']['sub_heading_2'] ?? 'How We Collect Data';
            $sub_items[] = ['heading' => $sub2, 'content' => $content2];
        }
        $all_sections[] = ['title' => $title, 'content' => '', 'sub_items' => $sub_items];
    }
}

// Data Usage
$section = $build_section('usage', 'How We Use Your Information');
if ($section) $all_sections[] = $section;

// Data Sharing
$section = $build_section('sharing', 'Information Sharing');
if ($section) $all_sections[] = $section;

// Cookies
$section = $build_section('cookies', 'Cookies');
if ($section) $all_sections[] = $section;

// Your Rights
$section = $build_section('rights', 'Your Rights');
if ($section) $all_sections[] = $section;

// Data Retention
$section = $build_section('retention', 'Data Retention');
if ($section) $all_sections[] = $section;

// Contact
$section = $build_section('contact', 'Contact Us');
if ($section) $all_sections[] = $section;

} // end privacy_source else (custom)
?>

<main id="primary" class="site-main">

    <!-- Page Header -->
    <section class="developer-section" style="background: #f8fafc; padding: 120px 0 50px;">
        <div class="developer-container" style="text-align: center;">
            <h1 style="margin-bottom: 0.5rem;"><?php echo esc_html($page_title); ?></h1>
            <?php if ($updated_date || $effective_date) : ?>
            <p style="color: #64748b; font-size: 0.95rem; margin: 0;">
                <?php if ($effective_date) : ?>Effective: <?php echo esc_html(date('F j, Y', strtotime($effective_date))); ?><?php endif; ?>
                <?php if ($updated_date && $effective_date) : ?> · <?php endif; ?>
                <?php if ($updated_date) : ?>Last updated: <?php echo esc_html(date('F j, Y', strtotime($updated_date))); ?><?php endif; ?>
            </p>
            <?php endif; ?>
        </div>
    </section>

    <?php if ($use_api && count($all_sections) > 0) : ?>
        <?php foreach ($all_sections as $index => $section) :
            $bg_color = ($index % 2 === 0) ? '#ffffff' : '#f8fafc';
        ?>
        <section class="developer-section developer-privacy-section" style="background: <?php echo $bg_color; ?>; padding: 50px 0;">
            <div class="developer-container">
                <div class="developer-privacy-content">
                    <h2><?php echo esc_html($section['title']); ?></h2>

                    <?php if (!empty($section['content'])) : ?>
                    <div class="developer-privacy-text">
                        <?php if (!empty($section['html'])) {
                            echo $section['content'];
                        } else {
                            echo wpautop(esc_html($section['content']));
                        } ?>
                    </div>
                    <?php endif; ?>

                    <?php if (!empty($section['sub_items'])) : ?>
                        <?php foreach ($section['sub_items'] as $sub_item) : ?>
                        <div class="developer-privacy-sub-section" style="margin-top: 1.5rem;">
                            <?php if (!empty($sub_item['heading'])) : ?>
                            <h3 style="font-size: 1.25rem; color: #334155; margin-bottom: 0.75rem; font-weight: 600;"><?php echo esc_html($sub_item['heading']); ?></h3>
                            <?php endif; ?>
                            <div class="developer-privacy-text">
                                <?php echo wpautop(esc_html($sub_item['content'])); ?>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </section>
        <?php endforeach; ?>
    <?php else : ?>
        <!-- Fallback message -->
        <section class="developer-section" style="background: #ffffff; padding: 50px 0;">
            <div class="developer-container">
                <div class="developer-privacy-content">
                    <p style="text-align: center; color: #64748b;">No privacy policy content has been configured yet. Please add content in GAS Admin → Website Builder → Privacy Policy.</p>
                </div>
            </div>
        </section>
    <?php endif; ?>

</main>

<?php
// Output FAQ Schema if enabled and FAQs exist
$faq_enabled = $wp['faq-enabled'] ?? ($legacy['faq_enabled'] ?? true);
$faqs = $legacy['faqs'] ?? [];

if ($faq_enabled && $faq_enabled !== 'false' && !empty($faqs) && is_array($faqs)) :
    $faq_schema = [
        '@context' => 'https://schema.org',
        '@type' => 'FAQPage',
        'mainEntity' => []
    ];

    foreach ($faqs as $faq) {
        if (!empty($faq['question']) && !empty($faq['answer'])) {
            $faq_schema['mainEntity'][] = [
                '@type' => 'Question',
                'name' => $faq['question'],
                'acceptedAnswer' => [
                    '@type' => 'Answer',
                    'text' => $faq['answer']
                ]
            ];
        }
    }

    if (!empty($faq_schema['mainEntity'])) :
?>
<script type="application/ld+json">
<?php echo json_encode($faq_schema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT); ?>
</script>
<?php
    endif;
endif;
?>

<style>
.developer-privacy-content {
    max-width: 800px;
    margin: 0 auto;
}
.developer-privacy-content h2 {
    font-size: 1.75rem;
    color: #1e293b;
    margin-bottom: 1.5rem;
    font-weight: 600;
}
.developer-privacy-text p {
    line-height: 1.8;
    color: #475569;
    margin-bottom: 1rem;
    font-size: 1rem;
}
.developer-privacy-text p:last-child {
    margin-bottom: 0;
}
.developer-privacy-text ul {
    line-height: 1.8;
    color: #475569;
    margin-bottom: 1rem;
    font-size: 1rem;
    padding-left: 1.5rem;
}
.developer-privacy-text li {
    margin-bottom: 0.5rem;
}
.developer-privacy-text a {
    color: var(--color-primary, #2563eb);
    text-decoration: underline;
}
</style>

<?php get_footer(); ?>
