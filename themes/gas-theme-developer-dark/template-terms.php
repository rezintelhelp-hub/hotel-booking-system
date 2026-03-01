<?php
/**
 * Template Name: Terms & Conditions
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
$wt = !empty($site_config['website']['page-terms']) ? $site_config['website']['page-terms'] : array();

// Also check legacy nested path as fallback
$legacy = !empty($site_config['pages']['terms']) ? $site_config['pages']['terms'] : null;
$legacy_sections = $legacy ? ($legacy['sections'] ?? []) : [];

$use_api = !empty($wt) || !empty($legacy_sections);

// Get current language for multilingual content
$lang = function_exists('developer_get_current_language') ? developer_get_current_language() : 'en';

// Page settings - try website builder path first, then legacy
$page_title = '';
if (!empty($wt)) {
    $page_title = function_exists('developer_get_ml_value') ? developer_get_ml_value($wt, 'title', $lang) : ($wt['title'] ?? '');
}
if (empty($page_title) && $legacy) {
    $page_title = $legacy['title'] ?? '';
}
if (empty($page_title)) {
    $page_title = get_the_title() ?: 'Terms & Conditions';
}

$updated_date = $wt['updated'] ?? ($legacy['updated_date'] ?? '');

// Helper to get ml value or fall back to legacy
$ml = function_exists('developer_get_ml_value') ? 'developer_get_ml_value' : null;

// Build displayable sections array
$all_sections = [];

// Booking section
$booking_enabled = $wt['booking-enabled'] ?? true;
if ($booking_enabled !== false && $booking_enabled !== 'false') {
    $content = $ml ? $ml($wt, 'booking', $lang) : ($wt['booking'] ?? '');
    if (empty($content) && !empty($legacy_sections['booking']['content'])) {
        $content = $legacy_sections['booking']['content'];
    }
    if (!empty($content)) {
        $title = $ml ? $ml($wt, 'booking-title', $lang) : ($wt['booking-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['booking']['title'] ?? 'Booking & Reservations';
        $all_sections[] = ['title' => $title, 'content' => $content];
    }
}

// Cancellation section
$cancel_enabled = $wt['cancellation-enabled'] ?? true;
if ($cancel_enabled !== false && $cancel_enabled !== 'false') {
    $content = $ml ? $ml($wt, 'cancellation', $lang) : ($wt['cancellation'] ?? '');
    if (empty($content) && !empty($legacy_sections['cancellation']['content'])) {
        $content = $legacy_sections['cancellation']['content'];
    }
    if (empty($content)) {
        // Auto-generate from period/fee
        $period = $wt['cancellation-period'] ?? ($legacy_sections['cancellation']['cancel_period'] ?? '48');
        $fee = $wt['cancellation-fee'] ?? ($legacy_sections['cancellation']['cancel_fee'] ?? 'first-night');
        $period_text = '';
        switch ($period) {
            case '24': $period_text = '24 hours before check-in'; break;
            case '48': $period_text = '48 hours before check-in'; break;
            case '72': $period_text = '72 hours before check-in'; break;
            case '7days': $period_text = '7 days before check-in'; break;
            case '14days': $period_text = '14 days before check-in'; break;
        }
        $fee_text = '';
        switch ($fee) {
            case 'first-night': $fee_text = 'first night will be charged'; break;
            case '50': $fee_text = '50% of the booking total will be charged'; break;
            case '100': $fee_text = '100% of the booking total will be charged'; break;
        }
        if ($period_text) {
            $content = "Free cancellation is available up to {$period_text}.";
            if ($fee_text) $content .= " For cancellations after this period, {$fee_text}.";
        }
    }
    if (!empty($content)) {
        $title = $ml ? $ml($wt, 'cancellation-title', $lang) : ($wt['cancellation-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['cancellation']['title'] ?? 'Cancellation Policy';
        $all_sections[] = ['title' => $title, 'content' => $content];
    }
}

// Check-in section
$checkin_enabled = $wt['checkin-enabled'] ?? true;
if ($checkin_enabled !== false && $checkin_enabled !== 'false') {
    $checkin_time = $wt['checkin-time'] ?? ($legacy_sections['checkin']['checkin_time'] ?? '');
    $checkout_time = $wt['checkout-time'] ?? ($legacy_sections['checkin']['checkout_time'] ?? '');
    $details = $ml ? $ml($wt, 'checkin-details', $lang) : ($wt['checkin-details'] ?? '');
    if (empty($details) && !empty($legacy_sections['checkin']['details'])) {
        $details = $legacy_sections['checkin']['details'];
    }
    if ($checkin_time || $checkout_time || $details) {
        $checkin_content = '';
        if ($checkin_time) $checkin_content .= "Check-in: {$checkin_time}\n";
        if ($checkout_time) $checkin_content .= "Check-out: {$checkout_time}\n";
        if ($details) $checkin_content .= "\n{$details}";
        $title = $ml ? $ml($wt, 'checkin-title', $lang) : ($wt['checkin-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['checkin']['title'] ?? 'Check-in & Check-out';
        $all_sections[] = ['title' => $title, 'content' => trim($checkin_content)];
    }
}

// House Rules section
$rules_enabled = $wt['house-rules-enabled'] ?? true;
if ($rules_enabled !== false && $rules_enabled !== 'false') {
    $content = $ml ? $ml($wt, 'house-rules', $lang) : ($wt['house-rules'] ?? '');
    if (empty($content) && !empty($legacy_sections['house_rules']['content'])) {
        $content = $legacy_sections['house_rules']['content'];
    }
    if (!empty($content)) {
        $title = $ml ? $ml($wt, 'house-rules-title', $lang) : ($wt['house-rules-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['house_rules']['title'] ?? 'House Rules';
        $all_sections[] = ['title' => $title, 'content' => $content];
    }
}

// Payment section
$payment_enabled = $wt['payment-enabled'] ?? true;
if ($payment_enabled !== false && $payment_enabled !== 'false') {
    $content = $ml ? $ml($wt, 'payment', $lang) : ($wt['payment'] ?? '');
    if (empty($content) && !empty($legacy_sections['payment']['content'])) {
        $content = $legacy_sections['payment']['content'];
    }
    if (!empty($content)) {
        $title = $ml ? $ml($wt, 'payment-title', $lang) : ($wt['payment-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['payment']['title'] ?? 'Payment Terms';
        $all_sections[] = ['title' => $title, 'content' => $content];
    }
}

// Liability section
$liability_enabled = $wt['liability-enabled'] ?? true;
if ($liability_enabled !== false && $liability_enabled !== 'false') {
    $content = $ml ? $ml($wt, 'liability', $lang) : ($wt['liability'] ?? '');
    if (empty($content) && !empty($legacy_sections['liability']['content'])) {
        $content = $legacy_sections['liability']['content'];
    }
    if (!empty($content)) {
        $title = $ml ? $ml($wt, 'liability-title', $lang) : ($wt['liability-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['liability']['title'] ?? 'Liability & Damages';
        $all_sections[] = ['title' => $title, 'content' => $content];
    }
}

// Additional section
$additional_enabled = $wt['additional-enabled'] ?? true;
if ($additional_enabled !== false && $additional_enabled !== 'false') {
    $content = $ml ? $ml($wt, 'additional', $lang) : ($wt['additional'] ?? '');
    if (empty($content) && !empty($legacy_sections['additional']['content'])) {
        $content = $legacy_sections['additional']['content'];
    }
    if (!empty($content)) {
        $title = $ml ? $ml($wt, 'additional-title', $lang) : ($wt['additional-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['additional']['title'] ?? 'Additional Terms';
        $all_sections[] = ['title' => $title, 'content' => $content];
    }
}
?>

<main id="primary" class="site-main">
    
    <!-- Page Header -->
    <section class="developer-section" style="background: #f8fafc; padding: 120px 0 50px;">
        <div class="developer-container" style="text-align: center;">
            <h1 style="margin-bottom: 0.5rem;"><?php echo esc_html($page_title); ?></h1>
            <?php if ($updated_date) : ?>
            <p style="color: #64748b; font-size: 0.95rem; margin: 0;">Last updated: <?php echo esc_html(date('F j, Y', strtotime($updated_date))); ?></p>
            <?php endif; ?>
        </div>
    </section>

    <?php if ($use_api && count($all_sections) > 0) : ?>
        <?php foreach ($all_sections as $index => $section) : 
            $bg_color = ($index % 2 === 0) ? '#ffffff' : '#f8fafc';
        ?>
        <section class="developer-section developer-terms-section" style="background: <?php echo $bg_color; ?>; padding: 50px 0;">
            <div class="developer-container">
                <div class="developer-terms-content">
                    <h2><?php echo esc_html($section['title']); ?></h2>
                    <div class="developer-terms-text">
                        <?php echo wpautop(esc_html($section['content'])); ?>
                    </div>
                </div>
            </div>
        </section>
        <?php endforeach; ?>
    <?php else : ?>
        <!-- Fallback message -->
        <section class="developer-section" style="background: #ffffff; padding: 50px 0;">
            <div class="developer-container">
                <div class="developer-terms-content">
                    <p style="text-align: center; color: #64748b;">No terms & conditions content has been configured yet. Please add content in GAS Admin → Website Builder → Terms & Conditions.</p>
                </div>
            </div>
        </section>
    <?php endif; ?>

</main>

<?php
// Output FAQ Schema if enabled and FAQs exist
$faq_enabled = $wt['faq-enabled'] ?? ($legacy['faq_enabled'] ?? true);
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
.developer-terms-content {
    max-width: 800px;
    margin: 0 auto;
}
.developer-terms-content h2 {
    font-size: 1.75rem;
    color: #1e293b;
    margin-bottom: 1.5rem;
    font-weight: 600;
}
.developer-terms-text p {
    line-height: 1.8;
    color: #475569;
    margin-bottom: 1rem;
    font-size: 1rem;
}
.developer-terms-text p:last-child {
    margin-bottom: 0;
}
</style>

<?php get_footer(); ?>
