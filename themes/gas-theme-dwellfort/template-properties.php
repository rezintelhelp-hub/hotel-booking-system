<?php
/**
 * Template Name: Properties (Dwellfort)
 *
 * All residences on one page. Anton's live site currently lists them at
 * /properties/ — this template covers that.
 *
 * @package GAS_Dwellfort
 */
if (!defined('ABSPATH')) exit;

get_header();
?>

<section class="df-hero df-hero--short" style="background-image: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.55)), url('<?php echo esc_url(get_theme_mod('df_properties_hero', get_theme_mod('df_hero_image', ''))); ?>');">
    <div class="df-container df-hero__inner">
        <h1 class="df-hero__title"><?php echo esc_html(get_theme_mod('df_properties_title', 'Our Residences')); ?></h1>
        <p class="df-hero__subtitle"><?php echo esc_html(get_theme_mod('df_properties_subtitle', 'Boutique apartments across Prague')); ?></p>
    </div>
</section>

<section class="df-section">
    <div class="df-container">
        <?php
        if (shortcode_exists('gas_properties')) {
            echo do_shortcode('[gas_properties columns="3"]');
        } else {
            echo '<p class="df-placeholder">Activate the GAS Booking plugin to render properties here.</p>';
        }
        ?>
    </div>
</section>

<?php
// Fall through to the_content for any editorial copy Anton adds beneath.
while (have_posts()) : the_post();
    if (trim(strip_tags(get_the_content()))) : ?>
        <section class="df-section df-section--panel">
            <div class="df-container df-container--narrow df-prose">
                <?php the_content(); ?>
            </div>
        </section>
    <?php endif;
endwhile;

get_footer();
