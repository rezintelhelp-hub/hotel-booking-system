<?php
/**
 * Template Name: Book Now (Dwellfort)
 *
 * Booking search + results in the Dwellfort shell. Uses [gas_search] to
 * render the check-in/check-out/guests picker + property → room results
 * → checkout path.
 *
 * @package GAS_Dwellfort
 */
if (!defined('ABSPATH')) exit;

get_header();
?>

<section class="df-hero df-hero--short" style="background-image: linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), url('<?php echo esc_url(get_theme_mod('df_booknow_hero', get_theme_mod('df_hero_image', ''))); ?>');">
    <div class="df-container df-hero__inner">
        <h1 class="df-hero__title"><?php echo esc_html(get_theme_mod('df_booknow_title', 'Book your stay')); ?></h1>
        <p class="df-hero__subtitle"><?php echo esc_html(get_theme_mod('df_booknow_subtitle', 'Search availability across our residences')); ?></p>
    </div>
</section>

<section class="df-section df-section--book">
    <div class="df-container">
        <?php
        if (shortcode_exists('gas_search')) {
            echo do_shortcode('[gas_search]');
        } elseif (shortcode_exists('gas_booking')) {
            echo do_shortcode('[gas_booking]');
        } else {
            echo '<p class="df-placeholder">Activate the GAS Booking plugin to render the booking search here.</p>';
        }
        ?>
    </div>
</section>

<?php get_footer();
