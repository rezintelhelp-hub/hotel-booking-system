<?php
/**
 * Dwellfort header — logo left, primary nav right, mobile hamburger.
 * Ports the SetSeed global_elegant top bar + logo module pattern.
 *
 * @package GAS_Dwellfort
 */
if (!defined('ABSPATH')) exit;
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="profile" href="https://gmpg.org/xfn/11">
    <?php wp_head(); ?>
</head>
<body <?php body_class('df-body'); ?>>
<?php wp_body_open(); ?>

<header class="df-header" role="banner">
    <div class="df-container df-header__inner">
        <a class="df-logo" href="<?php echo esc_url(home_url('/')); ?>" aria-label="<?php echo esc_attr(get_bloginfo('name')); ?>">
            <?php if (has_custom_logo()) {
                the_custom_logo();
            } else { ?>
                <span class="df-logo__text"><?php bloginfo('name'); ?></span>
            <?php } ?>
        </a>

        <button class="df-burger" aria-label="Open menu" aria-expanded="false" aria-controls="df-primary-menu" type="button">
            <span></span><span></span><span></span>
        </button>

        <nav class="df-nav" id="df-primary-menu" role="navigation" aria-label="Primary">
            <?php
            wp_nav_menu(array(
                'theme_location' => 'primary',
                'container'      => false,
                'menu_class'     => 'df-nav__list',
                'fallback_cb'    => function() {
                    // Fallback list matches Anton's live site nav.
                    echo '<ul class="df-nav__list">';
                    foreach (array(
                        '/'           => 'Home',
                        '/properties/' => 'Apartments',
                        '/about-us/'  => 'About',
                        '/faq/'       => 'FAQ',
                        '/contact-us/' => 'Contact',
                        '/book-now/'  => 'Book now',
                    ) as $url => $label) {
                        echo '<li class="df-nav__item"><a href="' . esc_url(home_url($url)) . '">' . esc_html($label) . '</a></li>';
                    }
                    echo '</ul>';
                }
            ));
            ?>
        </nav>
    </div>
</header>

<main id="main" class="df-main" tabindex="-1">
