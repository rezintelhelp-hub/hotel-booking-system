<?php
/**
 * Dwellfort footer — three columns + copyright bar. Ports the SetSeed
 * mainFooter block from global_elegant.
 *
 * @package GAS_Dwellfort
 */
if (!defined('ABSPATH')) exit;
?>
</main><!-- /.df-main -->

<footer class="df-footer" role="contentinfo">
    <div class="df-container df-footer__grid">
        <div class="df-footer__col">
            <h4><?php bloginfo('name'); ?></h4>
            <p class="df-footer__blurb"><?php echo esc_html(get_bloginfo('description')); ?></p>
        </div>

        <div class="df-footer__col">
            <h4>Quick links</h4>
            <?php
            wp_nav_menu(array(
                'theme_location' => 'footer',
                'container'      => false,
                'menu_class'     => 'df-footer__nav',
                'fallback_cb'    => function() {
                    echo '<ul class="df-footer__nav">';
                    foreach (array(
                        '/properties/' => 'Apartments',
                        '/about-us/'   => 'About',
                        '/faq/'        => 'FAQ',
                        '/contact-us/' => 'Contact',
                    ) as $url => $label) {
                        echo '<li><a href="' . esc_url(home_url($url)) . '">' . esc_html($label) . '</a></li>';
                    }
                    echo '</ul>';
                }
            ));
            ?>
        </div>

        <div class="df-footer__col">
            <h4>Contact</h4>
            <p class="df-footer__contact">
                <?php
                // Placeholders — Anton can replace via Customizer once wired.
                echo esc_html(get_theme_mod('df_contact_address', ''));
                $phone = get_theme_mod('df_contact_phone', '');
                $email = get_theme_mod('df_contact_email', '');
                if ($phone) echo '<br><a href="tel:' . esc_attr(preg_replace('/[^\d+]/', '', $phone)) . '">' . esc_html($phone) . '</a>';
                if ($email) echo '<br><a href="mailto:' . esc_attr($email) . '">' . esc_html($email) . '</a>';
                ?>
            </p>
        </div>
    </div>

    <div class="df-footer__bar">
        <div class="df-container df-footer__bar-inner">
            <span>&copy; <?php echo esc_html(date('Y')); ?> <?php bloginfo('name'); ?></span>
            <span class="df-footer__powered">Powered by <a href="https://gas.travel" rel="noopener">GAS</a></span>
        </div>
    </div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
