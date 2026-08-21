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

    // MAP OVERRIDE REMOVED 2026-08-21 — now handled natively by the
    // gas-booking plugin (v4.3.39+) via WP options gas_map_provider /
    // gas_map_style / gas_map_marker_style / gas_mapbox_token. Set once
    // via wp-cli per site that opts in. Keeping the featured-intro +
    // card-click handlers above since those are Dwellfort-specific.
    return;
    // (unreachable — retained temporarily so any old inline script
    // fragments below don't produce unbound-var errors; will delete
    // after next session's Web Builder UI ships.)
    var MAPBOX_TOKEN = <?php echo json_encode($mapbox_token); ?>;
    if (!MAPBOX_TOKEN) return;

    // NOTE: tile size (/512/) must be in the URL path for the `language`
    // param to be honoured on raster tiles. Without it Mapbox ignores
    // language and serves default labels. Steve 2026-08-21.
    var MAPBOX_URL = 'https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/512/{z}/{x}/{y}?access_token=' + MAPBOX_TOKEN + '&language=en';
    var MAPBOX_ATTR = '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

    // 1. Monkey-patch L.tileLayer so any OSM URL gets swapped to Mapbox
    //    before the map is created. Fires as early as Leaflet exists.
    function patchLeaflet() {
        if (typeof L === 'undefined' || !L.tileLayer || L.tileLayer._dfPatched) return false;
        var orig = L.tileLayer;
        var patched = function (url, opts) {
            if (typeof url === 'string' && url.indexOf('tile.openstreetmap.org') !== -1) {
                console.log('[dwellfort] intercepted OSM tileLayer → Mapbox');
                url = MAPBOX_URL;
                opts = opts || {};
                opts.tileSize = 512;
                opts.zoomOffset = -1;
                opts.attribution = MAPBOX_ATTR;
            }
            return orig.call(L, url, opts);
        };
        Object.keys(orig).forEach(function (k) { patched[k] = orig[k]; });
        patched._dfPatched = true;
        L.tileLayer = patched;
        console.log('[dwellfort] L.tileLayer patched');
        return true;
    }
    if (!patchLeaflet()) {
        var patchTries = 0;
        var patchIv = setInterval(function () {
            if (patchLeaflet() || ++patchTries > 40) clearInterval(patchIv);
        }, 100);
    }

    // 2. Belt-and-braces: after 2s, scan every .leaflet-container and
    //    force-swap OSM tile URLs on their existing map instances.
    //    Handles the case where the plugin's map init ran BEFORE our
    //    patch (shouldn't happen given timing but defence-in-depth).
    function swapExistingMaps() {
        if (typeof L === 'undefined') return;
        var containers = document.querySelectorAll('.leaflet-container');
        containers.forEach(function (el) {
            if (el._dfMapboxSwapped) return;
            // Iterate keys on the element — Leaflet stores map internal
            // registry via .Layer._map. Walk each layer.
            var tileImgs = el.querySelectorAll('.leaflet-tile-pane img');
            var isOsm = false;
            tileImgs.forEach(function (img) {
                if (img.src && img.src.indexOf('tile.openstreetmap.org') !== -1) isOsm = true;
            });
            if (!isOsm) return;
            console.log('[dwellfort] found existing OSM map, force-swapping tiles');
            // Rewrite each visible tile img src to Mapbox equivalent
            tileImgs.forEach(function (img) {
                var m = img.src.match(/openstreetmap\.org\/(\d+)\/(\d+)\/(\d+)\.png/);
                if (m) {
                    img.src = MAPBOX_URL.replace('{z}', m[1]).replace('{x}', m[2]).replace('{y}', m[3]);
                }
            });
            el._dfMapboxSwapped = true;
        });
    }
    setTimeout(swapExistingMaps, 2000);
    setTimeout(swapExistingMaps, 5000);

    // Inject cleaner black SVG pin — overrides plugin's purple teardrop.
    // Using template literal + double-quoted SVG attrs to avoid JS string
    // escaping hell (previous \\' broke JS parse — Steve 2026-08-21).
    var css = document.createElement('style');
    css.textContent = [
        '.gas-marker-pin {',
        '  width: 28px !important; height: 40px !important;',
        '  background: transparent url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 28 40%22><path d=%22M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z%22 fill=%22%23111111%22/><circle cx=%2214%22 cy=%2214%22 r=%225%22 fill=%22%23ffffff%22/></svg>") no-repeat center/contain !important;',
        '  border-radius: 0 !important; transform: none !important;',
        '  box-shadow: none !important; border: none !important;',
        '  filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));',
        '  transition: transform 0.15s ease;',
        '}',
        '.gas-marker-pin::after { display: none !important; }',
        '.gas-map-marker:hover .gas-marker-pin { transform: scale(1.12) translateY(-2px) !important; background-color: transparent !important; }'
    ].join('\n');
    document.head.appendChild(css);
})();
</script>
    <?php
}, 99);
