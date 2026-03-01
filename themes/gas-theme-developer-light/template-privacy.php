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
                        <?php echo wpautop(esc_html($section['content'])); ?>
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
</style>

<?php get_footer(); ?>
