<?php
/**
 * Template Name: About Us
 * Template for the About Us page
 *
 * @package GAS_Developer
 */

get_header();

// --- GAS Page Sections: check for custom sections before default rendering ---
require_once get_template_directory() . '/gas-page-sections.php';
$primary_color_ps = function_exists('developer_get_api_settings') ? (developer_get_api_settings()['primary_color'] ?? '#2563eb') : '#2563eb';
if (gas_render_page_sections('about', $primary_color_ps)) {
    get_footer();
    return;
}
// --- End GAS Page Sections check ---

// Get API settings
$api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();

// Page settings from GAS Admin (page-about section)
$page_title = array_key_exists('page_about_title', $api) ? $api['page_about_title'] : get_the_title();
$page_subtitle = $api['page_about_subtitle'] ?? '';
$page_content = $api['page_about_content'] ?? '';
$content_title = $api['page_about_content_title'] ?? '';
$hero_image = $api['page_about_hero_image'] ?? '';
$story_image = $api['page_about_content_image'] ?? '';
$story_title = $api['page_about_story_title'] ?? 'Our Story';
$story_text = $api['page_about_story_text'] ?? '';

// Hero toggle — default ON when never set
$hero_val = $api['page_about_hero_enabled'] ?? true;
$hero_enabled = !($hero_val === false || $hero_val === 'false' || $hero_val === '0' || $hero_val === 0);

// Colors
$header_bg = $api['page_about_header_bg'] ?? '#1e293b';
$header_text = $api['page_about_header_text'] ?? '#ffffff';
$bg_color = $api['page_about_bg'] ?? '#ffffff';
$title_color = $api['page_about_title_color'] ?? '#1e293b';
$text_color = $api['page_about_text_color'] ?? '#475569';

// If no API content, fall back to WordPress page content
if (empty($page_content)) {
    $page_content = get_the_content();
}
?>

<?php if ($hero_enabled) : ?>
<!-- Page Hero -->
<section class="developer-page-hero" style="background: <?php echo esc_attr($header_bg); ?>; <?php echo $hero_image ? 'background-image: url(' . esc_url($hero_image) . '); background-size: cover; background-position: center;' : ''; ?>">
    <div class="developer-page-hero-overlay" style="background: rgba(0,0,0,0.5);"></div>
    <div class="developer-container">
        <div class="developer-page-hero-content">
            <h1 style="color: <?php echo esc_attr($header_text); ?>;"><?php echo esc_html($page_title); ?></h1>
            <?php if ($page_subtitle) : ?>
                <p class="developer-page-subtitle" style="color: <?php echo esc_attr($header_text); ?>;"><?php echo esc_html($page_subtitle); ?></p>
            <?php endif; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<!-- Main Content -->
<section class="developer-section developer-about-page" style="background: <?php echo esc_attr($bg_color); ?>;">
    <div class="developer-container">
        
        <?php if ($story_image || $story_text) : ?>
        <!-- Our Story Section -->
        <div class="developer-about-story" style="display: grid; grid-template-columns: <?php echo $story_image ? '1fr 1fr' : '1fr'; ?>; gap: 3rem; align-items: center; margin-bottom: 3rem;">
            <?php if ($story_image) : ?>
            <div class="developer-about-story-image">
                <img src="<?php echo esc_url($story_image); ?>" alt="<?php echo esc_attr($story_title); ?>" style="width: 100%; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
            </div>
            <?php endif; ?>
            
            <div class="developer-about-story-content">
                <?php if ($story_title) : ?>
                    <h2 style="color: <?php echo esc_attr($title_color); ?>; margin-bottom: 1rem;"><?php echo esc_html($story_title); ?></h2>
                <?php endif; ?>
                <?php if ($story_text) : ?>
                    <div style="color: <?php echo esc_attr($text_color); ?>; line-height: 1.8;">
                        <?php echo wp_kses_post(nl2br($story_text)); ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        <?php endif; ?>
        
        <!-- Main Content -->
        <?php if ($content_title) : ?>
            <h2 style="color: <?php echo esc_attr($title_color); ?>; margin-bottom: 1.5rem; <?php echo ($story_image || $story_text) ? '' : 'text-align: center;'; ?>"><?php echo esc_html($content_title); ?></h2>
        <?php endif; ?>
        <?php if ($page_content) : ?>
        <div class="developer-about-content" style="color: <?php echo esc_attr($text_color); ?>; line-height: 1.8; max-width: 800px; margin: 0 auto;">
            <?php echo wp_kses_post(wpautop($page_content)); ?>
        </div>
        <?php endif; ?>
        
        <?php 
        // Show WordPress page content if exists and no API content
        if (empty($page_content) && have_posts()) : 
            while (have_posts()) : the_post();
                the_content();
            endwhile;
        endif;
        ?>
        
    </div>
</section>

<style>
.developer-page-hero {
    position: relative;
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 4rem 0;
}

.developer-page-hero-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}

.developer-page-hero-content {
    position: relative;
    z-index: 1;
}

.developer-page-hero h1 {
    font-weight: 700;
    margin: 0 0 0.5rem 0;
}

.developer-page-subtitle {
    font-size: 1.25rem;
    opacity: 0.9;
    margin: 0;
}

.developer-about-page {
    padding: 4rem 0;
}

.developer-about-content h2,
.developer-about-content h3 {
    margin-top: 2rem;
}

.developer-about-content p {
    margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
    .developer-page-hero h1 {
        font-size: clamp(1.5rem, 4vw, 2.5rem);
    }
    
    .developer-about-story {
        grid-template-columns: 1fr !important;
    }
}
</style>

<?php get_footer(); ?>
