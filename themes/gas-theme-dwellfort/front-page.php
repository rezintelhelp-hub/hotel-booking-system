<?php
/**
 * Dwellfort homepage — hero + intro + property grid + city guide + services.
 *
 * Mirrors the section rhythm of the live www.dwellfort.com homepage:
 *   1. Full-width hero: DWELLFORT / Quality Accommodation in Prague
 *   2. Property grid (Our Apartments Rooms) — populated by [gas_room_grid]
 *   3. What We Offer — 3-6 icon feature callouts
 *   4. Explore Prague — 3 city guide cards
 *   5. Activities & Services — icon grid
 *   6. Book Direct CTA banner
 *
 * All copy + images live in Customizer / theme mods so Anton can edit
 * without touching PHP. Data-heavy sections (rooms) use GAS shortcodes
 * so the booking plugin owns the data.
 *
 * @package GAS_Dwellfort
 */
if (!defined('ABSPATH')) exit;

get_header();

$hero_title    = get_theme_mod('df_hero_title',    'DWELLFORT');
$hero_subtitle = get_theme_mod('df_hero_subtitle', 'Quality Accommodation in Prague');
$hero_image    = get_theme_mod('df_hero_image',    get_template_directory_uri() . '/assets/hero-placeholder.jpg');
$hero_cta      = get_theme_mod('df_hero_cta_label', 'Book now');
$hero_cta_url  = get_theme_mod('df_hero_cta_url',   home_url('/book-now/'));
?>

<section class="df-hero" style="background-image: linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.5)), url('<?php echo esc_url($hero_image); ?>');">
    <div class="df-container df-hero__inner">
        <h1 class="df-hero__title"><?php echo esc_html($hero_title); ?></h1>
        <p class="df-hero__subtitle"><?php echo esc_html($hero_subtitle); ?></p>
        <?php if ($hero_cta && $hero_cta_url) : ?>
            <a class="df-btn df-btn--hero" href="<?php echo esc_url($hero_cta_url); ?>"><?php echo esc_html($hero_cta); ?></a>
        <?php endif; ?>
    </div>
</section>

<section class="df-section df-section--rooms">
    <div class="df-container">
        <h1 class="df-section__title df-section__title--left">Our Apartments</h1>
        <div class="df-section__intro">
            <?php echo wp_kses_post(get_theme_mod('df_rooms_intro', 'Boutique apartments in the heart of Prague — each individually designed for quality and comfort.')); ?>
        </div>
        <?php
        // Dwellfort has multiple boutique residences (Encore, Hidden Art,
        // Prague Tales, etc.) — each a property with its own rooms. The
        // properties grid is the right shortcode for the "Our Apartments"
        // section on the homepage. Rooms live INSIDE each property.
        if (shortcode_exists('gas_properties')) {
            echo do_shortcode('[gas_properties columns="3"]');
        } elseif (shortcode_exists('gas_rooms')) {
            echo do_shortcode('[gas_rooms columns="3"]');
        } else {
            echo '<p class="df-placeholder">Activate the GAS Booking plugin — [gas_properties] shortcode renders the residences here.</p>';
        }
        ?>
    </div>
</section>

<section class="df-section df-section--offer df-section--panel">
    <div class="df-container">
        <h1 class="df-section__title df-section__title--center">What We Offer</h1>
        <div class="df-features">
            <?php
            // Six feature callouts — copy driven by theme mods so Anton can
            // edit each one in the Customizer without touching code.
            $features = array(
                array('mod' => 'df_feature_1', 'default_title' => 'Quality Apartments', 'default_icon' => 'house'),
                array('mod' => 'df_feature_2', 'default_title' => 'Central Location',   'default_icon' => 'map'),
                array('mod' => 'df_feature_3', 'default_title' => 'Restful Nights',     'default_icon' => 'moon'),
                array('mod' => 'df_feature_4', 'default_title' => 'Book Direct',        'default_icon' => 'calendar'),
                array('mod' => 'df_feature_5', 'default_title' => 'Restaurants & Cafes','default_icon' => 'resto'),
                array('mod' => 'df_feature_6', 'default_title' => 'Comfort',            'default_icon' => 'building'),
            );
            foreach ($features as $f) {
                $title = get_theme_mod($f['mod'] . '_title', $f['default_title']);
                $body  = get_theme_mod($f['mod'] . '_body', '');
                ?>
                <div class="df-feature">
                    <div class="df-feature__icon" aria-hidden="true"></div>
                    <h3 class="df-feature__title"><?php echo esc_html($title); ?></h3>
                    <?php if ($body) : ?>
                        <p class="df-feature__body"><?php echo esc_html($body); ?></p>
                    <?php endif; ?>
                </div>
            <?php } ?>
        </div>
    </div>
</section>

<section class="df-section df-section--explore df-section--dark">
    <div class="df-container">
        <h2 class="df-section__title df-section__title--center">Explore Prague</h2>
        <div class="df-explore-grid">
            <?php
            $cards = array(
                array('title' => get_theme_mod('df_explore_1_title', 'Your home in Prague'),
                      'body'  => get_theme_mod('df_explore_1_body',  'Boutique residences in the historic centre.')),
                array('title' => get_theme_mod('df_explore_2_title', 'Magical Nights'),
                      'body'  => get_theme_mod('df_explore_2_body',  'Rooftop views and cobbled streets after dark.')),
                array('title' => get_theme_mod('df_explore_3_title', 'City of a Hundred Spires'),
                      'body'  => get_theme_mod('df_explore_3_body',  'Centuries of architecture on your doorstep.')),
            );
            foreach ($cards as $c) : ?>
                <article class="df-explore-card">
                    <h3><?php echo esc_html($c['title']); ?></h3>
                    <p><?php echo esc_html($c['body']); ?></p>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<section class="df-section df-section--cta">
    <div class="df-container df-cta">
        <h2 class="df-cta__title"><?php echo esc_html(get_theme_mod('df_cta_title', 'Book Direct')); ?></h2>
        <p class="df-cta__body"><?php echo esc_html(get_theme_mod('df_cta_body', 'The best rates guaranteed — book directly with us.')); ?></p>
        <a class="df-btn" href="<?php echo esc_url(get_theme_mod('df_cta_url', home_url('/book-now/'))); ?>">
            <?php echo esc_html(get_theme_mod('df_cta_label', 'Reserve your stay')); ?>
        </a>
    </div>
</section>

<?php get_footer();
