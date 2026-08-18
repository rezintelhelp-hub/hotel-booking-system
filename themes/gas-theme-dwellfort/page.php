<?php
/**
 * Generic page template — About, FAQ, Contact and any custom pages.
 * Renders the_content inside a narrow container so long-form copy is
 * readable. Anton's original theme uses centred narrow columns for these.
 *
 * @package GAS_Dwellfort
 */
if (!defined('ABSPATH')) exit;

get_header();
?>

<article class="df-section df-page">
    <div class="df-container df-container--narrow">
        <?php while (have_posts()) : the_post(); ?>
            <header class="df-page__header">
                <h1 class="df-page__title"><?php the_title(); ?></h1>
            </header>
            <div class="df-page__content df-prose">
                <?php the_content(); ?>
            </div>
        <?php endwhile; ?>
    </div>
</article>

<?php get_footer();
