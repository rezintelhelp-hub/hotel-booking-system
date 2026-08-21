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
    // Mapbox public token stored as a WP option (`dwellfort_mapbox_token`).
    // Set via wp-cli — kept out of git so GitHub's secret-scanner doesn't
    // block the push. Public tokens ARE designed to appear in client-side
    // code but scanners can't tell.
    $mapbox_token = get_option('dwellfort_mapbox_token', '');
    ?>
<script>
(function () {
    function inject() {
        var grid = document.querySelector('.developer-featured .gas-rooms-grid');
        if (!grid) return false;
        // Only inject if there isn't one already. Never strip + rebuild —
        // that was cancelling <a> clicks mid-navigation via the observer.
        if (grid.querySelector('.df-featured-intro')) return true;
        var box = document.createElement('div');
        box.className = 'df-featured-intro';
        box.innerHTML =
            '<h3 class="df-featured-intro__title">Our Apartment Rooms</h3>' +
            '<p class="df-featured-intro__sub">Select your apartment and we\'ll take care of the rest</p>' +
            '<a class="df-featured-intro__cta" href="/book-now/">View all</a>';
        grid.insertBefore(box, grid.firstChild);
        return true;
    }
    if (!inject()) {
        // Room grid may render async — retry a few times.
        var tries = 0;
        var iv = setInterval(function () {
            if (inject() || ++tries > 20) clearInterval(iv);
        }, 250);
    }

    // Make each featured room card fully clickable — the visible "View
    // & Book" button is hidden by CSS, so we bind the card's data-url
    // as a click handler. Keeps native middle-click / cmd-click open-
    // in-new-tab behaviour by using window.location for left-click only.
    function bindCardClicks() {
        var cards = document.querySelectorAll('.developer-featured .gas-room-card[data-url]');
        cards.forEach(function (card) {
            if (card.dataset.dfBound) return;
            card.dataset.dfBound = '1';
            card.style.cursor = 'pointer';
            card.addEventListener('click', function (e) {
                // Let real links inside the card (if any) do their own thing
                if (e.target.closest('a, button')) return;
                var url = card.getAttribute('data-url');
                if (!url) return;
                // Middle-click / cmd+click / ctrl+click → new tab
                if (e.metaKey || e.ctrlKey || e.button === 1) {
                    window.open(url, '_blank');
                } else {
                    window.location.href = url;
                }
            });
        });
    }
    bindCardClicks();
    // Cards may render async too — poll briefly.
    var cardTries = 0;
    var cardIv = setInterval(function () {
        bindCardClicks();
        if (++cardTries > 20) clearInterval(cardIv);
    }, 250);
    // NO MutationObserver — the observer was firing on every DOM change
    // (including page-navigation teardown), stripping the injected div
    // mid-click and cancelling <a> navigations. If the room grid gets
    // re-rendered by future filter/sort features and loses the intro,
    // add back a targeted re-inject with a "not-during-click" guard.

    // ─── MAPBOX MAP OVERRIDE (Dwellfort only, Steve 2026-08-21) ───
    // Anton didn't like the raw OSM look on /book-now/ — grey tiles,
    // Czech labels, purple teardrop pins. Wire Mapbox tiles (English
    // guaranteed via language=en) + a clean black SVG pin.
    // Scoped to this mu-plugin so no other client's map changes.
    var MAPBOX_TOKEN = <?php echo json_encode($mapbox_token); ?>;
    if (!MAPBOX_TOKEN) return; // No token set → no override, plugin's OSM map stands

    // Monkey-patch L.tileLayer so any OSM URL the plugin creates gets
    // swapped for Mapbox transparently. Runs before plugin's jQuery
    // document.ready callback fires (wp_footer prio 99 runs after all
    // script tags are printed but before the ready event triggers).
    // Reliable across both propertyMap + roomsMap without needing to
    // find scoped variables.
    function patchLeaflet() {
        if (typeof L === 'undefined' || !L.tileLayer || L.tileLayer._dfPatched) return false;
        var orig = L.tileLayer;
        var patched = function (url, opts) {
            if (typeof url === 'string' && url.indexOf('tile.openstreetmap.org') !== -1) {
                url = 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=' + MAPBOX_TOKEN + '&language=en';
                opts = opts || {};
                opts.tileSize = 512;
                opts.zoomOffset = -1;
                opts.attribution = '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';
            }
            return orig.call(L, url, opts);
        };
        // Preserve any static properties like L.tileLayer.wms
        Object.keys(orig).forEach(function (k) { patched[k] = orig[k]; });
        patched._dfPatched = true;
        L.tileLayer = patched;
        return true;
    }
    // Try immediately, then poll briefly in case Leaflet loads async.
    if (!patchLeaflet()) {
        var patchTries = 0;
        var patchIv = setInterval(function () {
            if (patchLeaflet() || ++patchTries > 40) clearInterval(patchIv);
        }, 100);
    }

    // Inject cleaner black SVG pin — overrides plugin's purple teardrop.
    var css = document.createElement('style');
    css.textContent = '' +
        '.gas-marker-pin {' +
        '  width: 28px !important; height: 40px !important;' +
        '  background: transparent url("data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 28 40\\'><path d=\\'M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z\\' fill=\\'%23111111\\'/><circle cx=\\'14\\' cy=\\'14\\' r=\\'5\\' fill=\\'%23ffffff\\'/></svg>") no-repeat center/contain !important;' +
        '  border-radius: 0 !important; transform: none !important;' +
        '  box-shadow: none !important; border: none !important;' +
        '  filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));' +
        '  transition: transform 0.15s ease;' +
        '}' +
        '.gas-marker-pin::after { display: none !important; }' +
        '.gas-map-marker:hover .gas-marker-pin { transform: scale(1.12) translateY(-2px) !important; background-color: transparent !important; }';
    document.head.appendChild(css);
})();
</script>
    <?php
}, 99);
