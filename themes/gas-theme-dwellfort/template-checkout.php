<?php
/**
 * Template Name: Checkout (Dwellfort)
 *
 * Wraps the GAS checkout shortcode in the Dwellfort shell — narrow
 * container, no hero, just a clean form area.
 *
 * @package GAS_Dwellfort
 */
if (!defined('ABSPATH')) exit;

get_header();
?>

<section class="df-section df-checkout">
    <div class="df-container df-container--narrow">
        <header class="df-page__header">
            <h1 class="df-page__title"><?php echo esc_html(get_theme_mod('df_checkout_title', 'Complete your booking')); ?></h1>
        </header>
        <?php
        if (shortcode_exists('gas_checkout')) {
            echo do_shortcode('[gas_checkout]');
        } else {
            echo '<p class="df-placeholder">Activate the GAS Booking plugin to render checkout here.</p>';
        }
        ?>
    </div>
</section>

<?php get_footer();
