<?php
/**
 * Plugin Name: Dwellfort per-site tweaks
 * Description: Injects a text-box + real "View all" link as the first card
 *              of the Featured section on dwellfortcom.sites.gas.travel.
 *              Scoped by host — silent no-op on every other site.
 * Author: GAS
 * Version: 0.1.0
 */
if (!defined('ABSPATH')) exit;

add_action('wp_footer', function () {
    // Scope to the Dwellfort preview site only. Add the custom domain
    // (dwellfort.com) here later if the cutover happens.
    $host = isset($_SERVER['HTTP_HOST']) ? strtolower($_SERVER['HTTP_HOST']) : '';
    $allowed_hosts = ['dwellfortcom.sites.gas.travel'];
    if (!in_array($host, $allowed_hosts, true)) return;
    ?>
<script>
(function () {
    function inject() {
        var grid = document.querySelector('.developer-featured .gas-rooms-grid');
        if (!grid) return false;
        if (grid.querySelector('.df-featured-intro')) return true; // already injected
        var box = document.createElement('div');
        box.className = 'df-featured-intro';
        box.innerHTML =
            '<h3 class="df-featured-intro__title">Our Apartments Rooms</h3>' +
            '<p class="df-featured-intro__sub">Select your apartment and we\'ll take care of the rest</p>' +
            '<a class="df-featured-intro__cta" href="/book-now/">View all →</a>';
        grid.insertBefore(box, grid.firstChild);
        return true;
    }
    if (!inject()) {
        // Room grid may be rendered async — retry a few times.
        var tries = 0;
        var iv = setInterval(function () {
            if (inject() || ++tries > 20) clearInterval(iv);
        }, 250);
    }
})();
</script>
    <?php
}, 99);
