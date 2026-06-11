/**
 * GAS Booking — checkout JS
 * Version: 4.0.0
 *
 * Copyright (c) 2026 GAS - Global Accommodation System (gas.travel)
 * All rights reserved. Proprietary software — licensed for GAS platform use only.
 * Unauthorized copying, redistribution, or deployment prohibited.
 * Contact: steve@gas.travel | https://gas.travel
 */

/**
 * GAS Booking Plugin JavaScript - Dwellfort-Inspired Design
 * @version 3.8.00
 */
jQuery(document).ready(function($) {

    // ─── GAS Cart ────────────────────────────────────────────────────────
    // Cross-page mini cart. Used by the bike-storage standalone widget
    // (and any future "add to cart from another page" flows) so the guest
    // can see what's in their cart from any page on the site, with a
    // fixed top-right button that navigates to /book-now/ to complete the
    // purchase. Cart state lives in localStorage with a 24h expiry; clears
    // automatically after a successful booking on /book-now/.
    var GAS_CART_KEY = 'gas_cart_v1';
    var GAS_CART_TTL_MS = 24 * 60 * 60 * 1000; // 24h
    function gasCartRead() {
        try {
            var raw = localStorage.getItem(GAS_CART_KEY);
            if (!raw) return null;
            var c = JSON.parse(raw);
            if (!c || !c.expires_at || c.expires_at < Date.now()) {
                localStorage.removeItem(GAS_CART_KEY);
                return null;
            }
            return c;
        } catch (e) { return null; }
    }
    function gasCartWrite(cart) {
        try {
            cart.expires_at = Date.now() + GAS_CART_TTL_MS;
            localStorage.setItem(GAS_CART_KEY, JSON.stringify(cart));
            gasCartRenderButton();
        } catch (e) { /* localStorage disabled — fail silent */ }
    }
    function gasCartClear() {
        try {
            localStorage.removeItem(GAS_CART_KEY);
            var btn = document.getElementById('gas-cart-button');
            if (btn) btn.remove();
        } catch (e) {}
    }
    // Build the URL that opens /checkout/?cart_only=1 — the SAME checkout
    // surface the room flow uses, just in cart-only mode (rooms picker
    // skipped, inline Stripe Elements payment). PHP gas_checkout_shortcode
    // recognises cart_only=1 and bypasses the room-required gate; the JS
    // below populates the summary from localStorage.
    function gasCartCheckoutUrl(cart) {
        var base = '/checkout/';
        var sep = '?';
        var params = ['cart_only=1'];
        if (cart.checkin)  params.push('checkin='  + encodeURIComponent(cart.checkin));
        if (cart.checkout) params.push('checkout=' + encodeURIComponent(cart.checkout));
        if (cart.property_id) params.push('property=' + encodeURIComponent(cart.property_id));
        if (cart.upsells && cart.upsells.length) {
            var ids = cart.upsells.map(function(u) { return u.id; }).join(',');
            params.push('prefill_upsells=' + encodeURIComponent(ids));
            if (cart.upsells.length === 1) {
                params.push('prefill_quantity=' + encodeURIComponent(cart.upsells[0].qty || 1));
                if (cart.upsells[0].label) params.push('prefill_label=' + encodeURIComponent(cart.upsells[0].label));
            }
        }
        return base + sep + params.join('&');
    }
    function gasCartItemCount(cart) {
        if (!cart || !cart.upsells) return 0;
        return cart.upsells.reduce(function(s, u) { return s + (u.qty || 1); }, 0);
    }
    function gasCartTotal(cart) {
        if (!cart || !cart.upsells) return 0;
        return cart.upsells.reduce(function(s, u) { return s + ((u.price || 0) * (u.qty || 1)); }, 0);
    }
    // Inject the cart button. First choice: drop it INTO the theme header
    // right next to the existing "Book Now" CTA so it visually lines up
    // (developer-light/dark have .developer-nav-cta in <header>; burger
    // theme nav varies). Fallback: position:fixed top-right pill if no
    // header CTA found. Single click always navigates to /book-now/ —
    // no dropdown, no inline clear button.
    function gasCartRenderButton() {
        var existing = document.getElementById('gas-cart-button');
        if (existing) existing.remove();
        var cart = gasCartRead();
        if (!cart || gasCartItemCount(cart) === 0) return;

        var symbol = (cart.currency === 'GBP') ? '£' : (cart.currency === 'EUR' ? '€' : (cart.currency === 'USD' ? '$' : ''));
        var total = gasCartTotal(cart);
        var count = gasCartItemCount(cart);
        var url = gasCartCheckoutUrl(cart);
        var label = '🛒 ' + count + (total > 0 ? ' · ' + symbol + total : '');

        var btn = document.createElement('a');
        btn.id = 'gas-cart-button';
        btn.href = url;
        btn.textContent = label;
        // Defensive: WP block navigation's interactivity API delegates
        // clicks at the document level and can swallow ours when the cart
        // is inside the same .wp-block-group as the nav. Hook click on
        // CAPTURE phase so we run before any other handler, force a hard
        // navigation. Also log the URL — turn this into a no-op once
        // we've confirmed it works.
        btn.addEventListener('click', function(e) {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            e.preventDefault();
            try { console.log('[gas-cart] navigating →', url); } catch (_) {}
            // Absolute URL avoids any relative-path resolution surprises
            // when the cart is on a deeper path like /bike-storage/.
            var absUrl = url;
            if (url && url.charAt(0) === '/') absUrl = window.location.origin + url;
            window.location.assign(absUrl);
        }, true);

        // Find the Book Now CTA (for vertical centering) and the hero/main
        // image element (for right-edge alignment). Both measured live.
        var ctaSelectors = [
            'header .developer-nav-cta',
            'header nav a[href*="/book-now"]:not(.developer-logo)',
            'header nav a[href*="/book/"]:not(.developer-logo)',
            'header a[href*="/book-now"]:not(.developer-logo)',
            'header a[href*="/book/"]:not(.developer-logo)',
            'nav a[href*="/book-now"]:not(.developer-logo)'
        ];
        var cta = null;
        for (var i = 0; i < ctaSelectors.length; i++) {
            cta = document.querySelector(ctaSelectors[i]);
            if (cta) break;
        }
        var heroSelectors = [
            '.wp-block-cover.alignfull',          // Hebden / WP block themes
            '.developer-hero',                    // developer-light/dark
            'main .wp-block-cover',
            'main section:first-of-type',
            'main > *:first-child'
        ];
        var hero = null;
        for (var j = 0; j < heroSelectors.length; j++) {
            hero = document.querySelector(heroSelectors[j]);
            if (hero) break;
        }
        var header = document.querySelector('header.developer-header, header.wp-block-template-part, header.gas-header, header');

        // Decide: if the Book Now CTA already sits on the right side of the
        // viewport (right edge in the right half), insert the cart as a
        // sibling next to it — the nav's flex layout handles alignment.
        // If Book Now is on the LEFT (Hebden burger theme has logo + CTA
        // all left-clustered), absolutely position the cart inside the
        // header, anchored to the hero's right edge.
        var ctaRect = cta ? cta.getBoundingClientRect() : null;
        var ctaIsOnRight = ctaRect && (ctaRect.right > window.innerWidth * 0.5);

        if (cta && ctaIsOnRight) {
            // Inherit the CTA's className verbatim so the cart picks up
            // the theme's exact button styling — including the colour.
            // Matches the orange Book Now exactly.
            btn.className = cta.className;
            btn.style.cssText = 'margin-left:8px;color:#fff !important;text-decoration:none;';
            cta.insertAdjacentElement('afterend', btn);
        } else if (header) {
            // CTA is on the left (Hebden burger theme) or no CTA found.
            // Append the cart to the header's main flex row with
            // margin-left:auto so the header's flexbox pushes it to the
            // right edge of that row — no fixed pixel positioning, no
            // measure-and-resize.
            var flexRow = header.querySelector('.wp-block-group.alignfull:has(.wp-block-navigation)') ||
                          header.querySelector('.wp-block-group.alignfull') ||
                          header.querySelector('.developer-header-inner') ||
                          header.querySelector('nav') ||
                          header;
            btn.style.cssText = 'margin-left:auto;align-self:center;padding:10px 18px;background:var(--developer-btn-primary-bg, var(--button_color, #ff931e));color:#fff;font:600 0.85rem/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;text-decoration:none;cursor:pointer;position:relative;z-index:50;';
            flexRow.appendChild(btn);
        } else {
            // Last-resort fallback when no <header> at all is in the DOM.
            btn.style.cssText = [
                'position:fixed', 'top:18px', 'right:24px', 'z-index:9998',
                'padding:10px 18px',
                'background:var(--developer-btn-primary-bg, var(--button_color, #ff931e))',
                'color:#fff',
                'font:600 0.85rem/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
                'text-decoration:none', 'box-shadow:0 2px 8px rgba(0,0,0,0.15)'
            ].join(';');
            document.body.appendChild(btn);
        }
    }
    // Cart layer disabled — the bike-storage flow now uses URL params
    // (?prefill_upsells=ID&prefill_quantity=N) end-to-end, the same
    // mechanism the room checkout already uses. The floating pill +
    // localStorage cart were duplicating the upsell system. Sweep up any
    // stale cart from a prior session, expose a no-op window.gasCart so
    // legacy `.clear()` calls don't throw, and don't render the pill.
    try { gasCartClear(); } catch (e) {}
    window.gasCart = {
        read:        function() { return null; },
        write:       function() {},
        clear:       gasCartClear,
        checkoutUrl: gasCartCheckoutUrl
    };

    // When the guest is on /book-now/?prefill_upsells=... (came from "+ Add
    // a room" on the cart-only checkout), forward those params into every
    // room "View & Book" link so the upsell survives the room pick and
    // lands ticked on the room /checkout/?unit_id=R&prefill_upsells=… page.
    // Same single mechanism as the room flow already uses — no localStorage.
    function gasForwardUpsellParams() {
        try {
            var sp = new URLSearchParams(window.location.search);
            var upsells = sp.get('prefill_upsells');
            if (!upsells) return;
            var qty = sp.get('prefill_quantity');
            document.querySelectorAll('a.gas-view-btn, a.gas-row-view-btn, .gas-property-card a, a.gas-property-cta').forEach(function(a) {
                if (!a.href || a.target === '_blank') return;
                try {
                    var u = new URL(a.href, window.location.origin);
                    if (u.searchParams.has('prefill_upsells')) return; // already carried
                    u.searchParams.set('prefill_upsells', upsells);
                    if (qty) u.searchParams.set('prefill_quantity', qty);
                    a.href = u.toString();
                } catch (e) {}
            });
        } catch (e) {}
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', gasForwardUpsellParams);
    } else {
        gasForwardUpsellParams();
    }

    // Get current language from URL parameter, cookie, or default to 'en'.
    // Browser navigator.language auto-detection was REMOVED 2026-05-21 — it
    // was making English-only properties (e.g. Atlantis Realty) show Japanese
    // dates whenever a visitor's browser locale was Japanese. Multilingual
    // properties opt in via ?lang= links or a language picker that sets the
    // gas_lang cookie.
    function getCurrentLanguage() {
        // Check URL parameter first — explicit opt-in.
        var urlParams = new URLSearchParams(window.location.search);
        var langParam = urlParams.get('lang');
        if (langParam && /^[a-z]{2}$/.test(langParam)) {
            return langParam;
        }

        // Check cookie — set by a previous ?lang= or by a language-picker UI.
        var cookieMatch = document.cookie.match(/gas_lang=([a-z]{2})/);
        if (cookieMatch) {
            return cookieMatch[1];
        }

        return 'en';
    }
    
    var currentLanguage = getCurrentLanguage();
    var dateLocale = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', nl: 'nl-NL', ja: 'ja-JP', it: 'it-IT', pt: 'pt-PT' }[currentLanguage] || 'en-GB';

    // Shop event entry-point — when the user lands here from a shop event's
    // "Book Now" button (?event=<slug>), fetch the event details and prepend a
    // small banner above the rooms grid / room widget so they know what they're
    // booking. Dates pre-fill from the same URL via existing check_in/check_out
    // params; we don't lock them — guests can still extend/shorten their stay.
    (function showEventBanner() {
        var eventSlug = new URLSearchParams(window.location.search).get('event');
        if (!eventSlug) return;
        // Only run on pages that host the rooms grid (book-now style). On the
        // checkout page the booking summary already shows event details, so a
        // floating banner above the header would be confusing.
        if (!document.querySelector('.gas-rooms-page-wrapper, .gas-rooms-grid, .gas-rooms-wrapper, .gas-room-widget')) return;
        if (document.querySelector('.gas-checkout-page, .gas-booking-summary, .gas-checkout-container')) return;
        // Pull event details + held rooms in parallel. The /rooms endpoint
        // drives the locked event-flow rooms grid below; the banner uses the
        // event details from the existing endpoint.
        var palAccent = (typeof gasBooking !== 'undefined' && gasBooking.shopPalette && gasBooking.shopPalette.accent) || '#1d4ed8';
        var palCardBg = (typeof gasBooking !== 'undefined' && gasBooking.shopPalette && gasBooking.shopPalette.card_bg) || '#ffffff';
        var palRadius = (typeof gasBooking !== 'undefined' && gasBooking.shopPalette && gasBooking.shopPalette.card_radius != null) ? parseInt(gasBooking.shopPalette.card_radius) : 12;

        // Lock the date inputs visually + functionally as soon as the param
        // hits the URL so the user can't fight with the picker before our
        // grid renders. Per-room "Select date" widgets get a different fix
        // below (we hide the standard rooms grid altogether).
        function lockEventDates(checkin, checkout) {
            document.querySelectorAll('.gas-checkin, .gas-checkout, .gas-checkin-date, .gas-checkout-date, .gas-search-checkin, .gas-search-checkout').forEach(function(el){
                if (el._flatpickr) {
                    if ((el.classList.contains('gas-checkin') || el.classList.contains('gas-checkin-date') || el.classList.contains('gas-search-checkin')) && checkin) el._flatpickr.setDate(checkin, true);
                    if ((el.classList.contains('gas-checkout') || el.classList.contains('gas-checkout-date') || el.classList.contains('gas-search-checkout')) && checkout) el._flatpickr.setDate(checkout, true);
                }
                if (el.tagName === 'INPUT') { el.readOnly = true; el.style.cursor = 'not-allowed'; el.style.opacity = '0.7'; }
            });
        }

        // Build the locked event-flow rooms grid + replace the standard rooms
        // grid with it. Bypasses room_availability rules — inventory comes from
        // the count of active event_hold rows the server returned.
        function renderEventRoomsGrid(data) {
            var checkout_url = (gasBooking.checkoutUrl || '/checkout/');
            var rooms = data.rooms || [];
            var ev = data.event;
            var ci = data.checkin;
            var co = data.checkout;
            var ticketPrice = parseFloat(ev.price) || 0;
            var currency = ev.currency || '';

            var $target = $('.gas-rooms-grid, .gas-rooms-wrapper, .gas-rooms-list').first();
            // Hide any existing rooms grid markup — we replace it with our own.
            $target.find('.gas-room-card').remove();
            var html = '';
            if (data.sold_out) {
                html = '<div style="padding:32px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;text-align:center;color:#991b1b;font-weight:600;">⚠ Event sold out — all rooms have been booked.</div>';
            } else {
                html = '<div class="gas-event-rooms-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:16px;">';
                rooms.forEach(function(r) {
                    var total = r.total_rate + ticketPrice;
                    var img = r.image_url ? ('<img src="' + r.image_url + '" alt="' + r.name + '" style="width:100%;height:180px;object-fit:cover;display:block;">') : '<div style="width:100%;height:180px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:0.9rem;">No image</div>';
                    var url = checkout_url + '?room=' + r.id + '&checkin=' + ci + '&checkout=' + co + '&guests=' + r.max_guests + '&adults=' + r.max_guests + '&children=0&currency=' + r.currency + '&event=' + encodeURIComponent(eventSlug);
                    // Inventory badge — drives visibility into "almost gone".
                    var qty = r.available_qty || 0;
                    var qtyBadge = '';
                    if (qty <= 0) qtyBadge = '<span style="position:absolute;top:10px;right:10px;background:#ef4444;color:#fff;font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px;">Sold out</span>';
                    else if (qty === 1) qtyBadge = '<span style="position:absolute;top:10px;right:10px;background:#f59e0b;color:#fff;font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px;">Last one!</span>';
                    else qtyBadge = '<span style="position:absolute;top:10px;right:10px;background:rgba(0,0,0,0.65);color:#fff;font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px;">' + qty + ' left</span>';

                    html += '<a href="' + url + '" class="gas-event-room-card" style="display:block;background:' + palCardBg + ';border:1px solid #e2e8f0;border-radius:' + palRadius + 'px;overflow:hidden;text-decoration:none;color:inherit;transition:transform 0.15s, box-shadow 0.15s;box-shadow:0 1px 3px rgba(0,0,0,0.05);position:relative;' + (qty <= 0 ? 'pointer-events:none;opacity:0.6;' : '') + '">';
                    html += '<div style="position:relative;">' + img + qtyBadge + '</div>';
                    html += '<div style="padding:14px 16px;">';
                    html += '<h3 style="margin:0 0 6px;font-size:16px;color:#1e293b;">' + r.name + '</h3>';
                    html += '<p style="margin:0 0 8px;color:#64748b;font-size:13px;">👥 Up to ' + r.max_guests + ' guests · ' + data.nights + ' night' + (data.nights > 1 ? 's' : '') + '</p>';
                    html += '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e2e8f0;padding-top:10px;">';
                    html += '<span style="font-size:13px;color:#64748b;">Room: ' + r.currency + ' ' + r.total_rate.toFixed(2) + (ticketPrice > 0 ? ' + Event: ' + r.currency + ' ' + ticketPrice.toFixed(2) : '') + '</span>';
                    html += '<span style="font-size:18px;font-weight:700;color:' + palAccent + ';">' + r.currency + ' ' + total.toFixed(2) + '</span>';
                    html += '</div>';
                    html += '<button style="width:100%;margin-top:10px;padding:10px;background:' + (qty <= 0 ? '#94a3b8' : palAccent) + ';color:#fff;border:none;border-radius:' + Math.min(palRadius, 10) + 'px;font-weight:600;cursor:' + (qty <= 0 ? 'not-allowed' : 'pointer') + ';">' + (qty <= 0 ? 'Sold Out' : 'Book This Room') + '</button>';
                    html += '</div></a>';
                });
                html += '</div>';
            }

            // Hide the entire standard rooms-page-wrapper (rooms grid AND its
            // map panel + date filter) and inject our event rooms grid as its
            // sibling. Hiding only .gas-rooms-grid left the map panel rendering
            // beside the event cards and squashing the layout.
            $('.gas-event-rooms-wrap').remove();  // idempotent re-renders
            var wrapHtml = '<div class="gas-event-rooms-wrap" style="max-width:1200px;width:100%;margin:24px auto;padding:0 16px;box-sizing:border-box;">' + html + '</div>';
            var $hideTarget = $('.gas-rooms-page-wrapper').first();
            if (!$hideTarget.length) $hideTarget = $target;
            if ($hideTarget.length) {
                $hideTarget.css('display','none');
                // Also hide siblings the theme may render alongside (map, filter).
                $('.gas-rooms-map-panel, .gas-date-filter').css('display','none');
                $hideTarget.after(wrapHtml);
            } else {
                $('body').append(wrapHtml);
            }
        }

        // Fetch event-rooms (the inventory ledger) — source of truth for
        // what's available in event flow.
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/event/' + encodeURIComponent(eventSlug) + '/rooms',
            method: 'GET',
            success: function(resp) {
                if (!resp.success) return;
                var ev = resp.event;
                if (!ev) return;
                lockEventDates(resp.checkin, resp.checkout);
                renderEventRoomsGrid(resp);
            }
        });

        // Banner fetch (kept separate for the date-rules / banner UI). Race
        // with the rooms fetch is fine — they update independent DOM regions.
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/event/' + encodeURIComponent(eventSlug),
            method: 'GET',
            success: function(resp) {
                if (!resp.success || !resp.event) return;
                var ev = resp.event;
                var fmt = function(d) { return new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }); };

                // Build event date rules — pushed to flatpickr so the user can't pick
                // dates the event isn't available on (was discovering the mismatch
                // only at the extras step which is too late).
                var rules = { name: ev.name };
                if (ev.available_days_of_week) {
                    rules.allowedDays = String(ev.available_days_of_week).split(',').map(function(s){ return parseInt(s, 10); }).filter(function(n){ return !isNaN(n); });
                }
                // valid_from/until are sent as ISO; strip to date-only and parse as local midnight to avoid TZ shift.
                var toLocalDate = function(s) { if (!s) return null; var iso = String(s).split('T')[0]; var p = iso.split('-'); return new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2])); };
                rules.validFrom = toLocalDate(ev.valid_from || ev.event_start_date);
                rules.validUntil = toLocalDate(ev.valid_until || ev.event_end_date);
                if (ev.min_notice_hours && ev.min_notice_hours > 0) {
                    rules.minDate = new Date(Date.now() + parseInt(ev.min_notice_hours) * 3600 * 1000);
                }
                // Stay-overlap window: a check-in is valid if AT LEAST ONE night of
                // the stay falls on an allowed day. e.g. event runs Fri/Sat/Sun
                // with 2-night min — Thursday check-in is fine because the stay is
                // Thu+Fri and Fri is an event day. Defaults to 1 if no event
                // duration is set (backwards-compatible — previous strict behaviour).
                rules.minNights = parseInt(ev.event_duration_nights) > 0 ? parseInt(ev.event_duration_nights) : 1;
                window._gasEventDateRules = rules;

                // Apply rules to any flatpickr already-initialised. New ones pick
                // them up from window._gasEventDateRules via the disable callback below.
                applyEventRulesToPickers();

                // Friendly summary line for the banner.
                var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
                var ruleLines = [];
                if (rules.allowedDays && rules.allowedDays.length && rules.allowedDays.length < 7) {
                    ruleLines.push('Available ' + rules.allowedDays.map(function(d){ return dayNames[d]; }).join(', '));
                }
                if (rules.validFrom && rules.validUntil) {
                    ruleLines.push(fmt(rules.validFrom) + ' – ' + fmt(rules.validUntil));
                }
                if (ev.min_notice_hours && ev.min_notice_hours > 0) {
                    ruleLines.push('book at least ' + ev.min_notice_hours + 'h ahead');
                }

                var ticketAmt = parseFloat(ev.price) || 0;
                var img = ev.image_thumbnail_url || ev.image_url;
                // Pull brand colours from the shop palette so the banner matches
                // the property's accent rather than hardcoded blue.
                var pal2 = (typeof gasBooking !== 'undefined' && gasBooking.shopPalette) ? gasBooking.shopPalette : {};
                var accent2 = pal2.accent || '#1d4ed8';
                var cardBg2 = pal2.card_bg || '#ffffff';
                var radius2 = (pal2.card_radius != null) ? parseInt(pal2.card_radius) : 12;
                var banner = '<div class="gas-event-banner" style="background:' + cardBg2 + ';border:1px solid ' + accent2 + ';border-radius:' + radius2 + 'px;padding:16px 20px;margin:16px auto;max-width:1200px;display:flex;gap:16px;align-items:center">';
                if (img) banner += '<img src="' + img + '" style="width:80px;height:80px;object-fit:cover;border-radius:' + Math.min(radius2, 8) + 'px;flex-shrink:0">';
                banner += '<div style="flex:1;min-width:0"><p style="margin:0 0 4px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:' + accent2 + ';font-weight:600">You\'re booking</p>';
                banner += '<h3 style="margin:0 0 6px;color:' + accent2 + ';font-size:18px">' + (ev.name || 'Event') + '</h3>';
                // Skip the "$0 event ticket" line entirely — when there's no
                // extra event fee just show the date/rule constraints.
                var infoBits = [];
                if (ticketAmt > 0) infoBits.push((ev.currency || '') + ' ' + ticketAmt.toFixed(2) + ' event ticket');
                if (ruleLines.length) infoBits = infoBits.concat(ruleLines);
                if (infoBits.length) banner += '<p style="margin:0;color:#475569;font-size:14px">' + infoBits.join(' · ') + '</p>';
                banner += '<p class="gas-event-stay-default" style="margin:6px 0 0;color:#64748b;font-size:12px">Pick eligible dates and a room — event ticket will be added at checkout.</p>';
                banner += '<p class="gas-event-stay-warning" style="display:none;margin:6px 0 0;color:#b91c1c;font-size:13px;font-weight:600;"></p>';
                banner += '</div></div>';
                $('.gas-event-banner').remove();  // idempotent
                // Insert OUTSIDE the rooms-page wrapper — we hide that wrapper
                // when rendering the event grid, and a banner inside the
                // wrapper would disappear with it.
                var $bannerAnchor = $('.gas-rooms-page-wrapper').first();
                if (!$bannerAnchor.length) $bannerAnchor = $('.gas-rooms-grid, .gas-rooms-wrapper, .gas-room-widget').first();
                if ($bannerAnchor.length) $bannerAnchor.before(banner);
                else $('body').prepend(banner);
            }
        });
    })();

    // Disable callback for flatpickr instances. We DON'T filter by day-of-week
    // on the picker itself — the event runs on certain nights but the
    // accommodation min stay is a separate property-level setting we can't
    // know in advance. Instead the picker enforces the valid window + min
    // notice, and gasValidateEventStay() runs after both dates are picked to
    // catch stays that don't overlap any event day.
    window._gasEventDateDisable = function(date) {
        var r = window._gasEventDateRules;
        if (!r) return false;
        if (r.validFrom && date < r.validFrom) return true;
        if (r.validUntil && date > r.validUntil) return true;
        return false;
    };

    // After both dates are picked, check that at least one night of the stay
    // falls on an event day. Returns null if no event in URL or no allowedDays
    // restriction; otherwise { ok, message }. Caller decides what to do (toast,
    // inline error, block search).
    window.gasValidateEventStay = function(checkinStr, checkoutStr) {
        var r = window._gasEventDateRules;
        if (!r || !r.allowedDays || !r.allowedDays.length) return null;
        if (!checkinStr || !checkoutStr) return null;
        var p1 = checkinStr.split('-'), p2 = checkoutStr.split('-');
        var ci = new Date(parseInt(p1[0]), parseInt(p1[1])-1, parseInt(p1[2]));
        var co = new Date(parseInt(p2[0]), parseInt(p2[1])-1, parseInt(p2[2]));
        for (var d = new Date(ci); d < co; d.setDate(d.getDate()+1)) {
            if (r.allowedDays.indexOf(d.getDay()) !== -1) return { ok: true };
        }
        var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        var allowed = r.allowedDays.map(function(d){ return dayNames[d]; }).join(', ');
        return { ok: false, message: 'Your stay must include at least one ' + allowed + ' night to attend ' + (r.name || 'this event') + '.' };
    };

    // Reads currently-selected check-in/check-out from any of the visible
    // pickers and updates the banner's warning line. Called from each picker's
    // onChange so the warning toggles as the user adjusts dates.
    window.gasUpdateEventStayWarning = function() {
        var $banner = $('.gas-event-banner');
        if (!$banner.length) return;
        var $warn = $banner.find('.gas-event-stay-warning');
        var $defaultLine = $banner.find('.gas-event-stay-default');
        if (!$warn.length) return;
        // Pull whichever date inputs are populated. Room widget + search widget
        // + filter all share the same Y-m-d format internally.
        var pickEl = function(sel) { var el = document.querySelector(sel); return el && el._flatpickr && el._flatpickr.input.value ? el._flatpickr.input.value : null; };
        var ci = pickEl('.gas-checkin') || pickEl('.gas-checkin-date') || pickEl('.gas-filter-checkin');
        var co = pickEl('.gas-checkout') || pickEl('.gas-checkout-date') || pickEl('.gas-filter-checkout');
        if (!ci || !co) { $warn.hide(); $defaultLine.show(); return; }
        var result = window.gasValidateEventStay(ci, co);
        if (result && !result.ok) {
            $warn.text('⚠ ' + result.message).show();
            $defaultLine.hide();
        } else {
            $warn.hide();
            $defaultLine.show();
        }
    };

    // Pushes the rules onto every already-active flatpickr instance — sets
    // disable + tightens minDate when min_notice_hours is in effect.
    function applyEventRulesToPickers() {
        var r = window._gasEventDateRules;
        if (!r) return;
        document.querySelectorAll('.gas-checkin, .gas-checkout, .gas-checkin-date, .gas-checkout-date, .gas-filter-checkin, .gas-filter-checkout').forEach(function(el) {
            if (!el._flatpickr) return;
            el._flatpickr.set('disable', [window._gasEventDateDisable]);
            if (r.minDate) {
                var current = el._flatpickr.config.minDate;
                if (!current || new Date(current) < r.minDate) el._flatpickr.set('minDate', r.minDate);
            }
            if (r.validUntil) el._flatpickr.set('maxDate', r.validUntil);
        });
    }
    
    // Override with PHP-provided language if available
    if (typeof gasBooking !== 'undefined' && gasBooking.currentLanguage) {
        currentLanguage = gasBooking.currentLanguage;
    }
    
    // Spinner builder — circles or none
    function buildSpinnerHtml() {
        var style = (typeof gasBooking !== 'undefined' && gasBooking.spinnerStyle) ? gasBooking.spinnerStyle : 'circles';
        if (style === 'none') return '';
        return '<div class="gas-loading-spinner"><div class="gas-circles-spin"><div></div><div></div><div></div></div><p>Checking<br>availability...</p></div>';
    }

    // Global translations object
    var gasTranslations = {
        common: { loading: 'Loading...', more_info: 'More Information', less_info: 'Less Information', apply: 'Apply', error: 'Error', connection_error: 'Connection error. Please try again.', under: 'under', confirmed: 'Confirmed' },
        booking: {
            book_now: 'Book Now',
            view_book: 'View & Book',
            check_in: 'Check-in',
            check_out: 'Check-out',
            select_dates: 'Select dates',
            nights: 'nights',
            night: 'night',
            guests: 'Guests',
            guest: 'guest',
            adults: 'Adults',
            adult: 'Adult',
            children: 'Children',
            child: 'Child',
            price_per_night: 'per night',
            check_availability: 'Check Availability',
            select_dates_to_check: 'Select dates to check availability',
            add_to_cart: 'Add to Cart',
            total_price: 'Total Room Charge',
            checking_availability: 'Checking availability...',
            not_available: 'Not available',
            not_available_dates: 'Not available on selected dates',
            not_available_property: 'Not available for this property',
            not_available_selected: 'Not available for selected dates',
            error_checking: 'Error checking availability',
            view_calendar: 'View Calendar',
            check_other_dates: 'Check other dates',
            max_guests: 'Max %s guests',
            checking: 'Checking...',
            processing: 'Processing...',
            confirming: 'Confirming booking...',
            processing_payment: 'Processing payment...',
            booking_reference: 'Booking reference',
            check_email: 'Check your email for confirmation details.',
            confirmation_sent: 'Confirmation sent to',
            cart_empty: 'Your cart is empty.',
            browse_rooms: 'Browse rooms',
            rooms_not_available_divider: 'Rooms below are not available for selected dates',
            error_validating_voucher: 'Error validating voucher',
            where_going: 'Where are you going?',
            location: 'Location'
        },
        property: {
            description: 'Description',
            availability: 'Availability',
            features: 'Features',
            terms: 'Terms',
            reviews: 'Reviews',
            bedrooms: 'Bedrooms',
            bedroom: 'Bedroom',
            beds: 'Beds',
            bed: 'Bed',
            bathrooms: 'Bathrooms',
            bathroom: 'Bathroom',
            guests_label: 'Guests',
            no_description: 'No description available.',
            contact_cancellation: 'Please contact the property for cancellation policy details.',
            unable_to_load: 'Unable to load room details'
        },
        guest_details: {
            first_name: 'First Name',
            last_name: 'Last Name',
            email: 'Email',
            phone: 'Phone',
            country: 'Country',
            special_requests: 'Special Requests',
            terms_agree: 'I agree to the',
            terms_conditions: 'Terms and Conditions',
            privacy_policy: 'Privacy Policy'
        },
        payment: {
            payment: 'Payment',
            pay_now: 'Pay Now',
            card_number: 'Card Number',
            expiry_date: 'Expiry Date',
            cardholder_name: 'Cardholder Name',
            card_guarantee: 'Card Guarantee',
            card_guarantee_desc: 'Your card will be securely stored as a booking guarantee',
            securing_card: 'Securing card...',
            card_secured: 'Thank you! Your card is secured. Please now confirm your booking below.',
            card_guarantee_note: 'No charge — your card will be securely held as a guarantee only.',
            bank_transfer_details: 'Bank Transfer Details',
            loading_card_form: 'Loading secure card form...',
            card_form_not_loaded: 'Card form not loaded. Please re-select Card Guarantee.',
            confirm_booking: 'Confirm Booking'
        },
        filters: {
            load_more: 'Load More Properties',
            more: 'more',
            no_results: 'No rooms match the selected filters. Please adjust your criteria.'
        },
        calendar: {
            mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun'
        }
    };
    
    // Merge with PHP-provided translations (higher priority)
    if (typeof gasBooking !== 'undefined' && gasBooking.translations) {
        var phpT = gasBooking.translations;
        for (var cat in phpT) {
            if (!gasTranslations[cat]) gasTranslations[cat] = {};
            for (var key in phpT[cat]) {
                gasTranslations[cat][key] = phpT[cat][key];
            }
        }
    }
    
    // Fetch translations from server
    function loadTranslations(callback) {
        var apiUrl = (typeof gasBooking !== 'undefined' && gasBooking.apiUrl) ? gasBooking.apiUrl : 'https://admin.gas.travel';
        window.gasApiUrl = apiUrl;
        $.ajax({
            url: apiUrl + '/api/public/translations/' + currentLanguage,
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.translations && response.translations.strings) {
                    gasTranslations = response.translations.strings;
                }
                if (callback) callback();
            },
            error: function() {
                // Use defaults
                if (callback) callback();
            }
        });
    }
    
    // Helper to get translation
    function t(category, key, defaultVal) {
        if (gasTranslations[category] && gasTranslations[category][key]) {
            return gasTranslations[category][key];
        }
        return defaultVal || key;
    }
    
    // Load translations immediately
    loadTranslations(function() {
        // Update any static UI elements after translations load
        updateStaticTranslations();
    });
    
    // Update static UI elements with translations
    function updateStaticTranslations() {
        // Set CSS variable for NOT AVAILABLE badge
        document.documentElement.style.setProperty('--gas-not-available-text', '"' + t('booking', 'not_available', 'Not available').toUpperCase() + '"');
        
        // Tab buttons
        $('.gas-tab-btn[data-tab="description"]').text(t('property', 'description', 'Description'));
        $('.gas-tab-btn[data-tab="availability"]').text(t('property', 'availability', 'Availability'));
        $('.gas-tab-btn[data-tab="features"]').text(t('property', 'features', 'Features'));
        $('.gas-tab-btn[data-tab="reviews"]').text(t('property', 'reviews', 'Reviews'));
        $('.gas-tab-btn[data-tab="terms"]').text(t('property', 'terms', 'Terms'));
        
        // Booking panel - Select dates header
        $('.gas-booking-card-header span, .gas-select-dates-label').text(t('booking', 'select_dates', 'Select dates'));
        
        // Booking panel date labels
        $('.gas-date-field label').each(function() {
            var text = $(this).text().trim().toUpperCase();
            if (text === 'CHECK-IN') {
                $(this).text(t('booking', 'check_in', 'Check-in').toUpperCase());
            } else if (text === 'CHECK-OUT') {
                $(this).text(t('booking', 'check_out', 'Check-out').toUpperCase());
            }
        });
        $('.gas-date-label').each(function() {
            var text = $(this).text().trim().toUpperCase();
            if (text === 'CHECK-IN') {
                $(this).text(t('booking', 'check_in', 'Check-in').toUpperCase());
            } else if (text === 'CHECK-OUT') {
                $(this).text(t('booking', 'check_out', 'Check-out').toUpperCase());
            }
        });
        
        // Adults/Children labels
        $('.gas-adults-field > label').contents().filter(function() {
            return this.nodeType === 3; // Text nodes only
        }).first().replaceWith(t('booking', 'adults', 'Adults').toUpperCase());
        
        $('.gas-children-field > label').contents().filter(function() {
            return this.nodeType === 3;
        }).first().replaceWith(t('booking', 'children', 'Children').toUpperCase() + ' ');
        
        // Price per night
        $('.gas-price-period').text(t('booking', 'price_per_night', '/ night'));
        
        // Book button initial state
        $('.gas-book-btn:disabled').text(t('booking', 'select_dates_to_check', 'Select dates to check availability'));
        
        // Add to cart button
        $('.gas-add-to-cart-btn').text('+ ' + t('booking', 'add_to_cart', 'Add to Cart'));
        
        // More info toggle
        $('.gas-more-info-toggle span').text(t('common', 'more_info', 'More Information'));
        
        // Price breakdown labels
        $('.gas-total-row span:first').text(t('booking', 'total_price', 'Total'));
        
        // Calendar legend
        $('.gas-legend-item').each(function() {
            var $span = $(this).find('span');
            var text = $span.text().trim().toLowerCase();
            if (text === 'available') {
                $span.text(t('common', 'available', 'Available'));
            } else if (text === 'unavailable') {
                $span.text(t('common', 'unavailable', 'Unavailable'));
            }
        });
        
        // Calendar day headers
        var dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        $('.gas-calendar-grid .gas-day-header, .gas-weekday').each(function() {
            var text = $(this).text().trim().toLowerCase();
            var dayKey = dayNames.find(function(d) { return text.indexOf(d) === 0; });
            if (dayKey) {
                $(this).text(t('calendar', dayKey, $(this).text()));
            }
        });
    }
    
    // Resolve currency: when site override is active, always use gasBooking.currency
    function resolveCurrency(roomCurrency) {
        if (gasBooking.currencyOverride) return gasBooking.currency;
        return roomCurrency || gasBooking.currency || '';
    }

    // Currency formatting function
    // Converts currency code to symbol and formats price
    function formatPrice(amount, currencyCode) {
        // Always use the WordPress currency setting over channel manager currency
        currencyCode = currencyCode || gasBooking.currency;
        var symbols = {
            'USD': '$', 'GBP': '£', 'EUR': '€', 'AUD': 'A$', 'CAD': 'C$',
            'JPY': '¥', 'CNY': '¥', 'INR': '₹', 'CHF': 'CHF ', 'SEK': 'kr',
            'NOK': 'kr', 'DKK': 'kr', 'NZD': 'NZ$', 'SGD': 'S$', 'HKD': 'HK$',
            'MXN': 'MX$', 'BRL': 'R$', 'ZAR': 'R', 'THB': '฿', 'MYR': 'RM',
            'IDR': 'Rp', 'PHP': '₱', 'VND': '₫', 'KRW': '₩', 'TWD': 'NT$',
            'AED': 'د.إ', 'SAR': '﷼', 'TRY': '₺', 'PLN': 'zł', 'CZK': 'Kč',
            'HUF': 'Ft', 'ILS': '₪', 'RUB': '₽', 'COP': 'COL$', 'ARS': 'AR$',
            '$': '$', '£': '£', '€': '€', 'Rp': 'Rp'
        };
        var symbol = symbols[currencyCode] || (currencyCode && currencyCode.length <= 4 ? currencyCode + ' ' : '') || '';
        var num = parseFloat(amount) || 0;
        // Zero-decimal currencies (per Stripe) — yen has no fractional
        // unit so showing "¥9810.00" is wrong + has caused Mountain
        // Holidays' Stripe to charge 100x the actual amount. Format
        // without decimals for these.
        var ZERO_DEC = ['JPY','KRW','VND','CLP','XPF','XOF','XAF','BIF','DJF','GNF','KMF','MGA','PYG','RWF','UGX','VUV'];
        var code = (currencyCode || '').toUpperCase();
        var formatted = ZERO_DEC.indexOf(code) >= 0
            ? Math.round(num).toString()
            : num.toFixed(2);
        return symbol + formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    // HTML escape function for security
    function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // =========================================================
    // SHOPPING CART FOR GROUP BOOKINGS
    // =========================================================
    var GASCart = {
        items: [],
        
        load: function() {
            try {
                var saved = localStorage.getItem('gas_cart');
                this.items = saved ? JSON.parse(saved) : [];
            } catch(e) {
                this.items = [];
            }
        },
        
        save: function() {
            try {
                localStorage.setItem('gas_cart', JSON.stringify(this.items));
            } catch(e) {}
            this.updateDisplay();
        },
        
        add: function(room) {
            // Check if same room already in cart
            var exists = this.items.find(function(item) {
                return item.roomId === room.roomId;
            });
            if (exists) {
                alert('This room is already in your cart.');
                return false;
            }
            
            // All rooms must have same dates
            if (this.items.length > 0) {
                var first = this.items[0];
                if (first.checkin !== room.checkin || first.checkout !== room.checkout) {
                    alert('All rooms must have the same dates.\n\nCart dates: ' + first.checkin + ' to ' + first.checkout);
                    return false;
                }
            }
            
            this.items.push(room);
            this.save();
            return true;
        },
        
        remove: function(index) {
            this.items.splice(index, 1);
            this.save();
        },
        
        clear: function() {
            this.items = [];
            this.save();
        },
        
        getTotal: function() {
            return this.items.reduce(function(sum, item) {
                return sum + (parseFloat(item.totalPrice) || 0);
            }, 0);
        },
        
        updateDisplay: function() {
            var count = this.items.length;
            $('.gas-cart-count').text(count);
            if (count > 0) {
                $('.gas-cart-status').show();
            } else {
                $('.gas-cart-status').hide();
            }
        }
    };
    
    // Initialize cart
    GASCart.load();
    GASCart.updateDisplay();
    window.GASCart = GASCart;
    
    // Short format (no decimals) for compact displays
    function formatPriceShort(amount, currencyCode) {
        // Always use the WordPress currency setting over channel manager currency
        currencyCode = currencyCode || gasBooking.currency;
        var symbols = {
            'USD': '$', 'GBP': '£', 'EUR': '€', 'AUD': 'A$', 'CAD': 'C$',
            'JPY': '¥', 'CNY': '¥', 'INR': '₹', 'CHF': 'CHF ', 'SEK': 'kr',
            'NOK': 'kr', 'DKK': 'kr', 'NZD': 'NZ$', 'SGD': 'S$', 'HKD': 'HK$',
            'MXN': 'MX$', 'BRL': 'R$', 'ZAR': 'R', 'THB': '฿', 'MYR': 'RM',
            'IDR': 'Rp', 'PHP': '₱', 'VND': '₫', 'KRW': '₩', 'TWD': 'NT$',
            'AED': 'د.إ', 'SAR': '﷼', 'TRY': '₺', 'PLN': 'zł', 'CZK': 'Kč',
            'HUF': 'Ft', 'ILS': '₪', 'RUB': '₽', 'COP': 'COL$', 'ARS': 'AR$',
            '$': '$', '£': '£', '€': '€', 'Rp': 'Rp'
        };
        var symbol = symbols[currencyCode] || (currencyCode && currencyCode.length <= 4 ? currencyCode + ' ' : '') || '';
        var num = parseFloat(amount) || 0;
        return symbol + Math.round(num).toLocaleString();
    }
    
    // For a date-bound upsell (e.g. a tour mirrored from a shop product), compute the
    // list of valid dates inside the guest's stay. Intersection of:
    //   - stay nights (check_in inclusive, check_out exclusive — guests don't book
    //     the checkout night),
    //   - available_days_of_week (CSV of 0=Sun..6=Sat; empty = any day),
    //   - valid_from..valid_until window (any null = unbounded that side),
    //   - min_notice_hours (drops dates closer than now+N hours).
    // Returns array of "YYYY-MM-DD". Empty array means no valid date — caller hides
    // the upsell entirely.
    function computeValidUpsellDates(upsell, checkin, checkout) {
        if (!upsell || !checkin || !checkout) return [];
        var allowedDays = (upsell.available_days_of_week || '').split(',').map(function(s){return s.trim();}).filter(Boolean);
        var validFrom = upsell.valid_from ? new Date(upsell.valid_from) : null;
        var validUntil = upsell.valid_until ? new Date(upsell.valid_until) : null;
        var noticeHours = parseInt(upsell.min_notice_hours);
        var earliestAllowed = isNaN(noticeHours) || noticeHours <= 0 ? null : new Date(Date.now() + noticeHours * 3600 * 1000);
        var start = new Date(checkin);
        var end = new Date(checkout); // exclusive
        var dates = [];
        for (var d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
            if (allowedDays.length && allowedDays.indexOf(String(d.getDay())) === -1) continue;
            if (validFrom && d < validFrom) continue;
            if (validUntil && d > validUntil) continue;
            if (earliestAllowed && d < earliestAllowed) continue;
            // YYYY-MM-DD using local components — avoids the off-by-one from .toISOString()
            // when the user's TZ is west of UTC.
            var y = d.getFullYear();
            var m = String(d.getMonth() + 1).padStart(2, '0');
            var dd = String(d.getDate()).padStart(2, '0');
            dates.push(y + '-' + m + '-' + dd);
        }
        return dates;
    }

    // Format a YYYY-MM-DD for display in the date dropdown — short month + weekday.
    function formatUpsellDate(yyyymmdd) {
        var parts = yyyymmdd.split('-');
        var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    }

    // Calculate the total cost of one upsell instance (multiplied by guests/nights as
    // dictated by charge_type). Mirrors the server math in /api/public/calculate-price
    // including tiered pricing (first_night_price / subsequent_night_price). Use this
    // everywhere the JS does upsell math so the UI total matches the server.
    function calculateUpsellLineTotal(upsell, nights, guests) {
        var n = nights || 1;
        var g = guests || 1;
        var basePrice = parseFloat(upsell.price) || 0;
        var fnp = (upsell.first_night_price !== undefined && upsell.first_night_price !== null && upsell.first_night_price !== '') ? parseFloat(upsell.first_night_price) : null;
        var snp = (upsell.subsequent_night_price !== undefined && upsell.subsequent_night_price !== null && upsell.subsequent_night_price !== '') ? parseFloat(upsell.subsequent_night_price) : null;
        var isPerNight = (upsell.charge_type === 'per_night' || upsell.charge_type === 'per_guest_per_night');
        if (isPerNight && (fnp !== null || snp !== null)) {
            var firstNight = fnp !== null ? fnp : basePrice;
            var otherNight = snp !== null ? snp : basePrice;
            var total = firstNight + (otherNight * Math.max(0, n - 1));
            if (upsell.charge_type === 'per_guest_per_night') total = total * g;
            return total;
        }
        if (upsell.charge_type === 'per_night') return basePrice * n;
        if (upsell.charge_type === 'per_guest') return basePrice * g;
        if (upsell.charge_type === 'per_guest_per_night') return basePrice * n * g;
        return basePrice;
    }

    // Build the price snippet for an upsell card. Single source of truth for
    // every place we render "€45/night" style labels. When tiered pricing is
    // set (first_night_price and/or subsequent_night_price), shows
    //   €75 first night
    //   then €45/night
    // so the host's tiered policy is visible to the guest before they tick
    // the box. Without this every card just showed `upsell.price` and the
    // tiered structure was invisible — the cart math was already correct,
    // only the label was lying. Used by 3 selection sites + 2 confirmation
    // sites (confirmation calls upsellLineTotalHtml below for the actual
    // amount the guest paid).
    function upsellPriceCardHtml(upsell, currency, formatFn) {
        formatFn = formatFn || formatPriceShort;
        var basePrice = parseFloat(upsell.price) || 0;
        var fnp = (upsell.first_night_price !== undefined && upsell.first_night_price !== null && upsell.first_night_price !== '') ? parseFloat(upsell.first_night_price) : null;
        var snp = (upsell.subsequent_night_price !== undefined && upsell.subsequent_night_price !== null && upsell.subsequent_night_price !== '') ? parseFloat(upsell.subsequent_night_price) : null;
        var perNight = '/' + t('booking', 'night', 'night');
        var perGuest = '/' + t('booking', 'guest', 'guest');
        var isPerNight = (upsell.charge_type === 'per_night' || upsell.charge_type === 'per_guest_per_night');
        var afterSuffix = upsell.charge_type === 'per_guest_per_night' ? perGuest + perNight : perNight;

        if (isPerNight && (fnp !== null || snp !== null)) {
            var firstNight = fnp !== null ? fnp : basePrice;
            var otherNight = snp !== null ? snp : basePrice;
            if (firstNight !== otherNight) {
                return formatFn(firstNight, currency)
                    + '<small> ' + t('booking', 'first_night_short', 'first night') + '</small>'
                    + '<br><small style="opacity:0.85">' + t('booking', 'then', 'then') + ' '
                    + formatFn(otherNight, currency) + afterSuffix + '</small>';
            }
        }

        var label = '';
        switch (upsell.charge_type) {
            case 'per_night': label = perNight; break;
            case 'per_guest': label = perGuest; break;
            case 'per_guest_per_night': label = perGuest + perNight; break;
        }
        return formatFn(basePrice, currency) + (label ? '<small>' + label + '</small>' : '');
    }

    // Initialize Flatpickr date pickers
    function initDatePickers() {
        if (typeof flatpickr === 'undefined') return;
        
        var today = new Date();
        var tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Set flatpickr locale based on current language
        var flatpickrLocale = null;
        if (currentLanguage !== 'en' && typeof flatpickr.l10ns !== 'undefined' && flatpickr.l10ns[currentLanguage]) {
            flatpickrLocale = currentLanguage;
        }
        
        // Room page date pickers
        var isMobileDevice = window.innerWidth <= 768;
        
        if ($('.gas-checkin').length) {
            flatpickr('.gas-checkin', {
                dateFormat: 'Y-m-d',
                minDate: 'today',
                altInput: true,
                altFormat: 'd M Y',
                disableMobile: true,
                locale: flatpickrLocale,
                // When ?event=<slug> is in the URL, this delegates to the rules
                // fetched in showEventBanner so non-matching weekdays/dates grey out.
                disable: [function(date) { return window._gasEventDateDisable ? window._gasEventDateDisable(date) : false; }],
                onOpen: function() {
                    var availTab = document.querySelector('.gas-tab-btn[data-tab="availability"]');
                    if (availTab && !availTab.classList.contains('active')) availTab.click();
                },
                onChange: function(selectedDates, dateStr, instance) {
                    // Update checkout min date and auto-open
                    var checkoutInput = instance.element.closest('.gas-room-widget, .gas-booking-card')?.querySelector('.gas-checkout');
                    if (!checkoutInput) checkoutInput = document.querySelector('.gas-checkout');

                    if (checkoutInput && checkoutInput._flatpickr) {
                        var nextDay = new Date(selectedDates[0]);
                        nextDay.setDate(nextDay.getDate() + 1);
                        checkoutInput._flatpickr.set('minDate', nextDay);
                        // Jump to check-in month and auto-open
                        checkoutInput._flatpickr.jumpToDate(nextDay);
                        setTimeout(function() {
                            checkoutInput._flatpickr.open();
                        }, isMobileDevice ? 300 : 100);
                    }
                    // Sync the left-hand availability calendar so it lands on
                    // the same month the user just picked. Without this the
                    // operator can pick Nov 14 while the availability panel
                    // sits on June.
                    if (selectedDates && selectedDates[0] && typeof loadAvailabilityCalendar === 'function') {
                        var picked = selectedDates[0];
                        calendarMonth = new Date(picked.getFullYear(), picked.getMonth(), 1);
                        var unitId = $roomWidget && $roomWidget.data ? $roomWidget.data('unit-id') : null;
                        if (unitId) loadAvailabilityCalendar(unitId, calendarMonth);
                    }
                },
                onMonthChange: function(_, __, instance) {
                    // Refresh availability shading inside the picker for the
                    // newly displayed month.
                    if (typeof refreshFlatpickrAvailability === 'function') {
                        refreshFlatpickrAvailability(instance);
                    }
                },
                onReady: function(_, __, instance) {
                    if (typeof refreshFlatpickrAvailability === 'function') {
                        refreshFlatpickrAvailability(instance);
                    }
                },
                onOpen: function(_, __, instance) {
                    // onReady fires only on init; onOpen fires every reopen.
                    // Without this, picking a check-in date jumps the checkout
                    // picker to the right month but the cells are unshaded.
                    if (typeof refreshFlatpickrAvailability === 'function') {
                        setTimeout(function(){ refreshFlatpickrAvailability(instance); }, 30);
                    }
                }
            });
        }

        if ($('.gas-checkout').length) {
            flatpickr('.gas-checkout', {
                dateFormat: 'Y-m-d',
                minDate: tomorrow,
                altInput: true,
                altFormat: 'd M Y',
                disableMobile: true,
                locale: flatpickrLocale,
                disable: [function(date) { return window._gasEventDateDisable ? window._gasEventDateDisable(date) : false; }],
                onChange: function(selectedDates, dateStr, instance) {
                    // When checkout date is selected on room detail page, switch to availability tab
                    var checkinInput = instance.element.closest('.gas-room-widget, .gas-booking-card')?.querySelector('.gas-checkin');
                    if (!checkinInput) checkinInput = document.querySelector('.gas-checkin');
                    if (checkinInput && checkinInput.value && dateStr) {
                        var availTab = document.querySelector('.gas-tab-btn[data-tab="availability"]');
                        if (availTab) availTab.click();
                    }
                    if (typeof window.gasUpdateEventStayWarning === 'function') window.gasUpdateEventStayWarning();
                },
                onMonthChange: function(_, __, instance) {
                    if (typeof refreshFlatpickrAvailability === 'function') refreshFlatpickrAvailability(instance);
                },
                onReady: function(_, __, instance) {
                    if (typeof refreshFlatpickrAvailability === 'function') refreshFlatpickrAvailability(instance);
                },
                onOpen: function(_, __, instance) {
                    if (typeof refreshFlatpickrAvailability === 'function') {
                        setTimeout(function(){ refreshFlatpickrAvailability(instance); }, 30);
                    }
                }
            });
        }

        // Pre-fill dates and property from URL params (e.g. from offers page links,
        // and from the bike-storage "add a room" Flow D redirect which uses the
        // no-underscore checkin/checkout convention).
        setTimeout(function() {
            var pageUrlParams = new URLSearchParams(window.location.search);
            var urlCheckIn  = pageUrlParams.get('check_in')  || pageUrlParams.get('checkin');
            var urlCheckOut = pageUrlParams.get('check_out') || pageUrlParams.get('checkout');
            var urlPropertyId = pageUrlParams.get('property_id');

            if (urlCheckIn) {
                // Try all checkin pickers (room page + search widget)
                document.querySelectorAll('.gas-checkin, .gas-search-checkin').forEach(function(el) {
                    if (el._flatpickr) {
                        el._flatpickr.setDate(urlCheckIn, true);
                    }
                });
            }
            if (urlCheckOut) {
                document.querySelectorAll('.gas-checkout, .gas-search-checkout').forEach(function(el) {
                    if (el._flatpickr) {
                        el._flatpickr.setDate(urlCheckOut, true);
                    }
                });
            }

            // Pre-filter property dropdown from URL
            if (urlPropertyId) {
                var propSelect = document.querySelector('.gas-property-filter, #gas-property-filter, [name="property_id"], .gas-search-property');
                if (propSelect) {
                    propSelect.value = urlPropertyId;
                    propSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // Show offer popup if offer_id is in URL — only on first visit (no dates selected yet)
            var urlOfferId = pageUrlParams.get('offer_id');
            var hasCheckin = pageUrlParams.get('checkin');
            if (urlOfferId && !hasCheckin && gasBooking.apiUrl && gasBooking.clientId) {
                $.ajax({
                    url: gasBooking.apiUrl + '/api/public/client/' + gasBooking.clientId + '/offers?include_future=1',
                    method: 'GET',
                    dataType: 'json',
                    success: function(response) {
                        var offers = response.offers || response.data || [];
                        var offer = offers.find(function(o) { return String(o.id) === String(urlOfferId); });
                        if (!offer) return;

                        var discountText = '';
                        if (offer.discount_type === 'percentage') discountText = Math.round(offer.discount_value) + '% OFF';
                        else if (offer.discount_type === 'fixed') discountText = offer.discount_value + ' OFF';

                        var dateText = '';
                        if (offer.valid_from || offer.valid_until) {
                            var fromStr = offer.valid_from ? new Date(offer.valid_from).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
                            var untilStr = offer.valid_until ? new Date(offer.valid_until).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
                            if (fromStr && untilStr) dateText = fromStr + ' — ' + untilStr;
                            else if (untilStr) dateText = 'Until ' + untilStr;
                        }

                        var propertyText = offer.property_name ? offer.property_name : '';

                        // Overlay backdrop + centred card
                        var overlayHtml = '<div id="gas-offer-overlay" onclick="if(event.target===this)this.remove()" style="' +
                            'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 99999; ' +
                            'background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; ' +
                            'padding: 20px; cursor: pointer;">' +
                            '<div style="background: white; border-radius: 16px; padding: 2rem; max-width: 500px; width: 100%; ' +
                                'box-shadow: 0 20px 60px rgba(0,0,0,0.3); cursor: default; text-align: center; position: relative;">' +
                                '<button onclick="document.getElementById(\'gas-offer-overlay\').remove()" style="' +
                                    'position: absolute; top: 12px; right: 16px; background: none; border: none; ' +
                                    'font-size: 1.5rem; cursor: pointer; color: #94a3b8; line-height: 1;">&times;</button>' +
                                '<div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🏷</div>' +
                                '<h2 style="font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0 0 0.5rem;">' + (offer.name || 'Special Offer') + '</h2>' +
                                (discountText ? '<div style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: white; padding: 6px 20px; border-radius: 24px; font-weight: 700; font-size: 1.1rem; margin-bottom: 0.75rem;">' + discountText + '</div>' : '') +
                                (offer.description ? '<p style="color: #64748b; margin: 0.5rem 0; font-size: 0.95rem;">' + offer.description + '</p>' : '') +
                                (dateText ? '<p style="color: #1e293b; font-weight: 600; margin: 1rem 0 0.25rem; font-size: 1rem;">Available: ' + dateText + '</p>' : '') +
                                (propertyText ? '<p style="color: #64748b; margin: 0 0 0.75rem; font-size: 0.9rem;">' + propertyText + '</p>' : '') +
                                '<button onclick="document.getElementById(\'gas-offer-overlay\').remove()" style="' +
                                    'margin-top: 1.25rem; background: linear-gradient(135deg, #059669, #047857); color: white; ' +
                                    'border: none; padding: 12px 32px; border-radius: 10px; font-weight: 600; font-size: 1rem; cursor: pointer;">' +
                                    'Select your dates within this period to view the discount</button>' +
                            '</div>' +
                        '</div>';

                        document.body.insertAdjacentHTML('beforeend', overlayHtml);
                    }
                });
            }
        }, 500);

        // Search widget date pickers - initialize each widget separately
        var isMobile = window.innerWidth <= 768;
        
        $('.gas-search-widget').each(function() {
            var $widget = $(this);
            var $checkin = $widget.find('.gas-checkin-date');
            var $checkout = $widget.find('.gas-checkout-date');
            
            if ($checkin.length) {
                flatpickr($checkin[0], {
                    dateFormat: 'Y-m-d',
                    minDate: 'today',
                    altInput: true,
                    altFormat: 'd M Y',
                    disableMobile: true,
                    disable: [function(date) { return window._gasEventDateDisable ? window._gasEventDateDisable(date) : false; }],
                    onChange: function(selectedDates, dateStr, instance) {
                        if (selectedDates.length && $checkout.length) {
                            var nextDay = new Date(selectedDates[0]);
                            nextDay.setDate(nextDay.getDate() + 1);

                            if ($checkout[0]._flatpickr) {
                                $checkout[0]._flatpickr.set('minDate', nextDay);
                                // Jump to check-in month and auto-open
                                $checkout[0]._flatpickr.jumpToDate(nextDay);
                                setTimeout(function() {
                                    $checkout[0]._flatpickr.open();
                                }, isMobile ? 300 : 100);
                            }
                        }
                    }
                });
            }

            if ($checkout.length) {
                flatpickr($checkout[0], {
                    dateFormat: 'Y-m-d',
                    minDate: tomorrow,
                    altInput: true,
                    altFormat: 'd M Y',
                    disableMobile: true,
                    disable: [function(date) { return window._gasEventDateDisable ? window._gasEventDateDisable(date) : false; }],
                    onChange: function() { if (typeof window.gasUpdateEventStayWarning === 'function') window.gasUpdateEventStayWarning(); }
                });
            }
        });

        // Filter date pickers (on rooms page) - same logic
        $('.gas-date-filter').each(function() {
            var $filter = $(this);
            var $checkin = $filter.find('.gas-filter-checkin');
            var $checkout = $filter.find('.gas-filter-checkout');
            var isMobile = window.innerWidth <= 768;

            if ($checkin.length) {
                flatpickr($checkin[0], {
                    dateFormat: 'Y-m-d',
                    minDate: 'today',
                    altInput: true,
                    altFormat: 'd M Y',
                    disableMobile: true, // Use native picker on mobile for better UX
                    disable: [function(date) { return window._gasEventDateDisable ? window._gasEventDateDisable(date) : false; }],
                    onChange: function(selectedDates, dateStr, instance) {
                        if (selectedDates.length && $checkout.length) {
                            var nextDay = new Date(selectedDates[0]);
                            nextDay.setDate(nextDay.getDate() + 1);

                            if ($checkout[0]._flatpickr) {
                                $checkout[0]._flatpickr.set('minDate', nextDay);
                                // Jump to check-in month and auto-open
                                $checkout[0]._flatpickr.jumpToDate(nextDay);
                                setTimeout(function() {
                                    $checkout[0]._flatpickr.open();
                                }, isMobile ? 300 : 100);
                            }
                        }
                    }
                });
            }

            if ($checkout.length) {
                flatpickr($checkout[0], {
                    dateFormat: 'Y-m-d',
                    minDate: tomorrow,
                    altInput: true,
                    altFormat: 'd M Y',
                    disableMobile: true, // Use native picker on mobile for better UX
                    disable: [function(date) { return window._gasEventDateDisable ? window._gasEventDateDisable(date) : false; }]
                });
            }
        });
    }
    
    // Initialize date pickers after a small delay to ensure DOM is ready
    setTimeout(initDatePickers, 100);
    
    // Pre-fill dates from cart if items exist (for "Add another room" flow)
    setTimeout(function() {
        if (window.GASCart && window.GASCart.items.length > 0) {
            var cartDates = window.GASCart.items[0];
            if (cartDates.checkin && cartDates.checkout) {
                // Pre-fill room page date pickers
                var $checkin = $('.gas-checkin');
                var $checkout = $('.gas-checkout');
                
                // Use false to NOT trigger onChange (prevents calendar auto-open)
                if ($checkin.length && $checkin[0]._flatpickr) {
                    $checkin[0]._flatpickr.setDate(cartDates.checkin, false);
                }
                if ($checkout.length && $checkout[0]._flatpickr) {
                    $checkout[0]._flatpickr.setDate(cartDates.checkout, false);
                }
                
                // Pre-fill search widget date pickers
                var $searchCheckin = $('.gas-checkin-date');
                var $searchCheckout = $('.gas-checkout-date');
                
                if ($searchCheckin.length && $searchCheckin[0]._flatpickr) {
                    $searchCheckin[0]._flatpickr.setDate(cartDates.checkin, false);
                }
                if ($searchCheckout.length && $searchCheckout[0]._flatpickr) {
                    $searchCheckout[0]._flatpickr.setDate(cartDates.checkout, false);
                }
                
                console.log('GAS: Pre-filled dates from cart:', cartDates.checkin, 'to', cartDates.checkout);
                
                // Ensure any calendars that opened are closed
                setTimeout(function() {
                    if ($checkin.length && $checkin[0]._flatpickr) $checkin[0]._flatpickr.close();
                    if ($checkout.length && $checkout[0]._flatpickr) $checkout[0]._flatpickr.close();
                    if ($searchCheckin.length && $searchCheckin[0]._flatpickr) $searchCheckin[0]._flatpickr.close();
                    if ($searchCheckout.length && $searchCheckout[0]._flatpickr) $searchCheckout[0]._flatpickr.close();
                }, 50);
            }
        }
    }, 200);
    
    // SVG Icons
    var icons = {
        users: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
        bed: '<svg viewBox="0 0 24 24"><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>',
        bath: '<svg viewBox="0 0 24 24"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"></path><line x1="10" x2="8" y1="5" y2="7"></line><line x1="2" x2="22" y1="12" y2="12"></line><line x1="7" x2="7" y1="19" y2="21"></line><line x1="17" x2="17" y1="19" y2="21"></line></svg>',
        home: '<svg viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
        wifi: '<svg viewBox="0 0 24 24"><path d="M5 13a10 10 0 0 1 14 0"></path><path d="M8.5 16.5a5 5 0 0 1 7 0"></path><line x1="12" x2="12.01" y1="20" y2="20"></line></svg>',
        tv: '<svg viewBox="0 0 24 24"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>',
        coffee: '<svg viewBox="0 0 24 24"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" x2="6" y1="2" y2="4"></line><line x1="10" x2="10" y1="2" y2="4"></line><line x1="14" x2="14" y1="2" y2="4"></line></svg>',
        car: '<svg viewBox="0 0 24 24"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle></svg>',
        aircon: '<svg viewBox="0 0 24 24"><path d="M8 16a4 4 0 1 1 8 0"></path><path d="M12 4v8"></path><path d="m4.93 10.93 1.41 1.41"></path><path d="M2 18h2"></path><path d="M20 18h2"></path><path d="m19.07 10.93-1.41 1.41"></path><path d="M22 22H2"></path></svg>',
        kitchen: '<svg viewBox="0 0 24 24"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>',
        check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>'
    };
    
    // Amenity icon mapping
    var amenityIcons = {
        'wifi': icons.wifi,
        'tv': icons.tv,
        'television': icons.tv,
        'air conditioning': icons.aircon,
        'air-conditioning': icons.aircon,
        'ac': icons.aircon,
        'heating': icons.aircon,
        'kitchen': icons.kitchen,
        'parking': icons.car,
        'coffee': icons.coffee,
        'breakfast': icons.coffee
    };
    
    function getAmenityIcon(name) {
        var lowerName = name.toLowerCase();
        for (var key in amenityIcons) {
            if (lowerName.includes(key)) {
                return amenityIcons[key];
            }
        }
        return icons.check;
    }
    
    // Search button click handler
    $(document).on('click', '.gas-search-button', function(e) {
        e.preventDefault();

        // Show spinner immediately on click
        $('.gas-loading-spinner').remove();
        var spinHtml = buildSpinnerHtml();
        if (spinHtml) $('body').append(spinHtml);

        // Find the parent widget to get values from the correct form
        var $widget = $(this).closest('.gas-search-widget');

        var checkin = $widget.find('.gas-checkin-date').val();
        var checkout = $widget.find('.gas-checkout-date').val();
        var guests = $widget.find('.gas-guests-select').val();
        var location = $widget.find('.gas-location-input').val();

        var baseUrl = gasBooking.searchResultsUrl || '/book-now/';
        var params = [];

        if (location) params.push('location=' + encodeURIComponent(location));
        if (checkin) params.push('checkin=' + checkin);
        if (checkout) params.push('checkout=' + checkout);
        if (guests) params.push('guests=' + guests);

        // Preserve offer/property context from current URL
        var curParams = new URLSearchParams(window.location.search);
        if (curParams.get('offer_id')) params.push('offer_id=' + curParams.get('offer_id'));
        if (curParams.get('property_id')) params.push('property_id=' + curParams.get('property_id'));

        var url = baseUrl;
        if (params.length > 0) {
            url += (baseUrl.indexOf('?') > -1 ? '&' : '?') + params.join('&');
        }

        window.location.href = url;
    });
    
    // Rooms grid - check availability on page load if dates provided
    if (typeof gasRoomsConfig !== 'undefined' && gasRoomsConfig.checkin && gasRoomsConfig.checkout) {
        checkAllAvailability(gasRoomsConfig.checkin, gasRoomsConfig.checkout, gasRoomsConfig.guests);
    }
    
    // Room detail widget
    var $roomWidget = $('.gas-room-widget');
    if ($roomWidget.length) {
        var unitId = $roomWidget.data('unit-id');
        var checkin = $roomWidget.data('checkin') || '';
        var checkout = $roomWidget.data('checkout') || '';
        var guests = $roomWidget.data('guests') || 1;
        
        loadRoomDetails(unitId, checkin, checkout, guests);
    }
    
    function loadRoomDetails(unitId, checkin, checkout, guests) {
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/unit/' + unitId,
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.unit) {
                    // Also fetch occupancy settings
                    loadOccupancySettings(unitId, function(occSettings) {
                        renderRoomDetails(response.unit, response.images || [], response.amenities || [], checkin, checkout, guests, occSettings);
                        // Store property_id and payment_account_id for checkout
                        if (response.unit.property_id) {
                            $('.gas-room-widget').data('property-id', response.unit.property_id);
                            loadPropertyTerms(response.unit.property_id);
                        }
                        if (response.unit.payment_account_id) {
                            $('.gas-room-widget').data('payment-account-id', response.unit.payment_account_id);
                        }
                        // Pre-load reviews to determine if tab should be shown
                        preloadReviewsCheck(unitId);
                    });
                } else {
                    $('.gas-room-loading').html('<p class="gas-error">' + t('property', 'unable_to_load', 'Unable to load room details') + ': ' + (response.error || 'Unknown error') + '</p>');
                }
            },
            error: function() {
                $('.gas-room-loading').html('<p class="gas-error">' + t('common', 'connection_error', 'Connection error. Please try again.') + '</p>');
            }
        });
    }
    
    // Load occupancy settings for a room
    function loadOccupancySettings(unitId, callback) {
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/rooms/' + unitId + '/occupancy-settings',
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.data) {
                    callback(response.data);
                } else {
                    // Default settings
                    callback({
                        pricing_mode: 'per_room',
                        base_occupancy: 2,
                        max_guests: 4,
                        max_adults: 4,
                        max_children: 3,
                        children_allowed: true,
                        child_max_age: 12,
                        extra_adult_type: 'fixed',
                        extra_adult_charge: 0,
                        single_discount_type: 'fixed',
                        single_discount_value: 0,
                        child_charge_type: 'free',
                        child_charge: 0
                    });
                }
            },
            error: function() {
                // Default settings on error
                callback({
                    pricing_mode: 'per_room',
                    base_occupancy: 2,
                    max_guests: 4,
                    max_adults: 4,
                    max_children: 3,
                    children_allowed: true,
                    child_max_age: 12
                });
            }
        });
    }
    
    function loadPropertyTerms(propertyId) {
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/property/' + propertyId + '/terms',
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.data) {
                    var terms = response.data;
                    
                    // Get terms translations
                    var tTerms = gasTranslations.terms || {};
                    
                    // Build General Terms content
                    var generalHtml = '<ul class="gas-terms-list">';
                    generalHtml += '<li><strong>' + (tTerms.check_in || 'Check-in') + ':</strong> ' + (terms.check_in.from || '15:00') + ' - ' + (terms.check_in.until || '22:00');
                    if (terms.check_in.self_checkin) generalHtml += ' (' + (tTerms.self_checkin || 'Self check-in available') + ')';
                    if (terms.check_in.is_24hr) generalHtml += ' (' + (tTerms.checkin_24hr || '24-hour check-in') + ')';
                    generalHtml += '</li>';
                    generalHtml += '<li><strong>' + (tTerms.check_out || 'Check-out') + ':</strong> ' + (tTerms.by || 'By') + ' ' + (terms.check_out.by || '11:00') + '</li>';
                    if (terms.check_out.late_fee) {
                        generalHtml += '<li><strong>' + (tTerms.late_checkout_fee || 'Late check-out fee') + ':</strong> ' + terms.check_out.late_fee + '</li>';
                    }
                    
                    // Children policy
                    var childrenText = terms.children.policy === 'all' ? (tTerms.children_all_ages || 'Children of all ages welcome') : 
                                      terms.children.policy === 'no' ? (tTerms.no_children || 'No children allowed') : 
                                      (tTerms.children_policy || 'Children policy') + ': ' + terms.children.policy;
                    generalHtml += '<li><strong>' + (tTerms.children || 'Children') + ':</strong> ' + childrenText;
                    if (terms.children.cots_available) generalHtml += ' • ' + (tTerms.cots_available || 'Cots available');
                    if (terms.children.highchairs_available) generalHtml += ' • ' + (tTerms.highchairs_available || 'Highchairs available');
                    generalHtml += '</li>';
                    
                    // Events policy
                    var eventsText = terms.events.policy === 'no' ? (tTerms.no_events || 'No events or parties') : 
                                    terms.events.policy === 'request' ? (tTerms.events_on_request || 'Events on request') : (tTerms.events_allowed || 'Events allowed');
                    generalHtml += '<li><strong>' + (tTerms.events || 'Events') + ':</strong> ' + eventsText + '</li>';
                    generalHtml += '</ul>';

                    // Append Beds24 free-text generalPolicy if present
                    if (terms.general_terms_text && String(terms.general_terms_text).trim()) {
                        generalHtml += '<div class="gas-terms-text">' + String(terms.general_terms_text).replace(/\n/g, '<br>') + '</div>';
                    }

                    $('.gas-general-terms').html(generalHtml);
                    
                    // Build House Rules content
                    var rulesHtml = '<ul class="gas-terms-list">';
                    
                    // Smoking
                    var smokingText = terms.smoking.policy === 'no' ? (tTerms.no_smoking || 'No smoking') : 
                                     terms.smoking.policy === 'designated' ? (tTerms.smoking_designated || 'Smoking in designated areas only') : 
                                     (tTerms.smoking_allowed || 'Smoking allowed');
                    rulesHtml += '<li><strong>' + (tTerms.smoking || 'Smoking') + ':</strong> ' + smokingText;
                    if (terms.smoking.fine) rulesHtml += ' (' + (tTerms.fine || 'Fine') + ': ' + terms.smoking.fine + ')';
                    rulesHtml += '</li>';
                    
                    // Pets
                    var petsText = terms.pets.policy === 'no' ? (tTerms.no_pets || 'No pets allowed') : 
                                  terms.pets.policy === 'request' ? (tTerms.pets_on_request || 'Pets on request') : (tTerms.pets_allowed || 'Pets allowed');
                    rulesHtml += '<li><strong>' + (tTerms.pets || 'Pets') + ':</strong> ' + petsText;
                    if (terms.pets.policy !== 'no') {
                        if (terms.pets.dogs_allowed) rulesHtml += ' • ' + (tTerms.dogs_welcome || 'Dogs welcome');
                        if (terms.pets.cats_allowed) rulesHtml += ' • ' + (tTerms.cats_welcome || 'Cats welcome');
                        if (terms.pets.deposit) rulesHtml += ' (' + (tTerms.deposit || 'Deposit') + ': ' + terms.pets.deposit + ')';
                        if (terms.pets.fee_per_night) rulesHtml += ' (' + (tTerms.fee || 'Fee') + ': ' + terms.pets.fee_per_night + '/' + (tTerms.night || 'night') + ')';
                    }
                    rulesHtml += '</li>';
                    
                    // Quiet hours
                    if (terms.house_rules.quiet_hours_from && terms.house_rules.quiet_hours_until) {
                        rulesHtml += '<li><strong>' + (tTerms.quiet_hours || 'Quiet hours') + ':</strong> ' + terms.house_rules.quiet_hours_from + ' - ' + terms.house_rules.quiet_hours_until + '</li>';
                    }
                    
                    // ID required
                    if (terms.house_rules.id_required) {
                        rulesHtml += '<li><strong>' + (tTerms.id_required || 'ID required') + ':</strong> ' + (tTerms.valid_id_required || 'Valid ID required at check-in') + '</li>';
                    }
                    
                    // No outside guests
                    if (terms.house_rules.no_outside_guests) {
                        rulesHtml += '<li><strong>' + (tTerms.guests || 'Guests') + ':</strong> ' + (tTerms.no_unregistered || 'No unregistered visitors allowed') + '</li>';
                    }
                    
                    // Additional rules
                    if (terms.house_rules.additional_rules) {
                        rulesHtml += '<li>' + terms.house_rules.additional_rules + '</li>';
                    }
                    
                    // Accessibility
                    var accessFeatures = [];
                    if (terms.accessibility.wheelchair) accessFeatures.push(tTerms.wheelchair || 'Wheelchair accessible');
                    if (terms.accessibility.step_free) accessFeatures.push(tTerms.step_free || 'Step-free access');
                    if (terms.accessibility.accessible_bathroom) accessFeatures.push(tTerms.accessible_bathroom || 'Accessible bathroom');
                    if (terms.accessibility.elevator) accessFeatures.push(tTerms.elevator || 'Elevator access');
                    if (terms.accessibility.ground_floor) accessFeatures.push(tTerms.ground_floor || 'Ground floor available');
                    if (accessFeatures.length > 0) {
                        rulesHtml += '<li><strong>' + (tTerms.accessibility || 'Accessibility') + ':</strong> ' + accessFeatures.join(', ') + '</li>';
                    }
                    
                    rulesHtml += '</ul>';

                    // Append Beds24 free-text houseRules if present
                    if (terms.house_rules_text && String(terms.house_rules_text).trim()) {
                        rulesHtml += '<div class="gas-terms-text">' + String(terms.house_rules_text).replace(/\n/g, '<br>') + '</div>';
                    }

                    $('.gas-house-rules').html(rulesHtml);
                    
                    // Cancellation policy
                    if (terms.cancellation_policy) {
                        $('.gas-cancellation-policy').html('<p>' + terms.cancellation_policy + '</p>');
                    } else {
                        $('.gas-cancellation-policy').html('<p>' + t('property', 'contact_cancellation', 'Please contact the property for cancellation policy details.') + '</p>');
                    }
                }
            }
        });
    }
    
    // Helper function to extract text from language objects (e.g., {en: 'text'})
    function extractText(value) {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
            // Try current language first, then English, then any available
            return value[currentLanguage] || value.en || value.EN || value['en-US'] || Object.values(value)[0] || '';
        }
        return String(value);
    }
    
    function renderRoomDetails(room, images, amenities, checkin, checkout, guests, occSettings) {
        var currency = resolveCurrency(room.currency);
        occSettings = occSettings || {};
        
        // Set title and location - prefer display_name over internal name
        var roomTitle = extractText(room.display_name) || room.name;
        $('.gas-room-title').text(roomTitle);
        // Operator-typed reference code, rendered as small "Ref: {code}"
        // under the title when show_reference is true. Per-unit reference
        // wins over property-level. Off by default. EasyLandlord 2026-06-08:
        // operators put their Beds24 room id (459155 etc.) here so they can
        // find the right unit when guests reference it in support emails.
        var $titleEl = $('.gas-room-title');
        $titleEl.next('.gas-room-reference').remove();
        var refCode = (room.show_reference && room.reference_code)
            ? room.reference_code
            : ((room.property_show_reference && room.property_reference_code) ? room.property_reference_code : null);
        if (refCode) {
            var escRef = String(refCode).replace(/[<>&"]/g, function(ch){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[ch];});
            $titleEl.after('<div class="gas-room-reference" style="font-size:0.8rem;color:#94a3b8;margin-top:-0.15rem;margin-bottom:0.5rem;letter-spacing:0.02em;">Ref: ' + escRef + '</div>');
        }
        var locCity = (room.city || '').trim();
        var locState = (room.state || '').trim();
        var locLine = locCity && locState ? locCity + ', ' + locState : (locCity || locState || '');
        $('.gas-room-location').text(locLine).toggle(!!locLine);
        
        // Set meta with icons - use translations
        var metaHtml = '';
        if (room.max_guests) {
            metaHtml += '<div class="gas-meta-item"><span class="gas-meta-icon">' + icons.users + '</span><span>' + t('property', 'guests_label', 'Guests') + ': ' + room.max_guests + '</span></div>';
        }
        // Bedrooms row — hidden entirely when count is 0 (Studio); a separate
        // beds row below conveys sleeping capacity.
        var bedroomsRaw = (room.num_bedrooms !== undefined && room.num_bedrooms !== null) ? room.num_bedrooms : room.bedroom_count;
        var bedroomCount = (bedroomsRaw !== undefined && bedroomsRaw !== null) ? parseInt(bedroomsRaw) : null;
        if (bedroomCount !== null && bedroomCount > 0) {
            var bedroomLabel = bedroomCount > 1 ? t('property', 'bedrooms', 'Bedrooms') : t('property', 'bedroom', 'Bedroom');
            metaHtml += '<div class="gas-meta-item"><span class="gas-meta-icon">' + icons.bed + '</span><span>' + bedroomLabel + ': ' + bedroomCount + '</span></div>';
        }
        // Beds row — always shown when we have a count. For studios this is
        // the only sleeping-related indicator (no bedroom row).
        var bedsRaw = (room.num_beds !== undefined && room.num_beds !== null) ? room.num_beds : room.beds;
        if (bedsRaw !== undefined && bedsRaw !== null) {
            var bedsCount = parseInt(bedsRaw);
            if (bedsCount > 0) {
                var bedsLabel = bedsCount > 1 ? t('property', 'beds', 'Beds') : t('property', 'bed', 'Bed');
                metaHtml += '<div class="gas-meta-item"><span class="gas-meta-icon">' + icons.bed + '</span><span>' + bedsLabel + ': ' + bedsCount + '</span></div>';
            }
        }
        var bathrooms = room.num_bathrooms || room.bathroom_count;
        if (bathrooms) {
            var bathroomsDisplay = parseFloat(bathrooms) % 1 === 0 ? parseInt(bathrooms) : parseFloat(bathrooms).toFixed(1);
            var bathroomLabel = parseFloat(bathrooms) > 1 ? t('property', 'bathrooms', 'Bathrooms') : t('property', 'bathroom', 'Bathroom');
            metaHtml += '<div class="gas-meta-item"><span class="gas-meta-icon">' + icons.bath + '</span><span>' + bathroomLabel + ': ' + bathroomsDisplay + '</span></div>';
        }
        if (room.unit_type && room.unit_type !== 'double') {
            var unitTypeDisplay = room.unit_type.charAt(0).toUpperCase() + room.unit_type.slice(1);
            metaHtml += '<div class="gas-meta-item"><span class="gas-meta-icon">' + icons.home + '</span><span>' + unitTypeDisplay + '</span></div>';
        }
        $('.gas-room-meta').html(metaHtml);
        
        // No price without dates — actual price comes from calendar pricing only
        $('.gas-price-amount').text('—');
        $('.gas-price-period').text(t('booking', 'select_dates', 'Select dates'));
        
        // Render gallery
        renderGallery(images);
        
        // Set descriptions - use short_description and full_description fields
        var shortDesc = parseDescription(room.short_description) || parseDescription(room.description) || '';
        var fullDesc = parseDescription(room.full_description) || '';
        
        if (shortDesc) {
            var shortHtml = /<[a-z][\s\S]*>/i.test(shortDesc) ? shortDesc.replace(/<div[^>]*>/gi, '<p>').replace(/<\/div>/gi, '</p>') : shortDesc.split(/\n\s*\n/).filter(function(p) { return p.trim(); }).map(function(p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
            $('.gas-description-short').html(DOMPurify.sanitize(shortHtml, { ALLOWED_TAGS: ['strong','em','b','i','u','p','h2','h3','ul','li','br','a'], ALLOWED_ATTR: ['href','target','rel'] }));
        } else {
            $('.gas-description-short').html('<p style="color: #64748b; font-style: italic;">' + t('property', 'no_description', 'No description available.') + '</p>');
        }
        
        // Show More Info toggle only if there's a full description different from short
        if (fullDesc && fullDesc !== shortDesc) {
            var fullHtml = /<[a-z][\s\S]*>/i.test(fullDesc) ? fullDesc.replace(/<div[^>]*>/gi, '<p>').replace(/<\/div>/gi, '</p>') : fullDesc.split(/\n\s*\n/).filter(function(p) { return p.trim(); }).map(function(p) { return '<p>' + p.replace(/\n/g, '<br>') + '</p>'; }).join('');
            $('.gas-description-full').html(DOMPurify.sanitize(fullHtml, { ALLOWED_TAGS: ['strong','em','b','i','u','p','h2','h3','ul','li','br','a'], ALLOWED_ATTR: ['href','target','rel'] }));
            $('.gas-more-info-toggle').show();
        } else {
            $('.gas-more-info-toggle').hide();
            $('.gas-description-full').hide();
        }
        
        // Render amenities grouped by category
        renderAmenities(amenities);

        // Per-bedroom + per-bathroom layout. Reads the actual property_bedrooms
        // / property_bathrooms rows from the server. The amenities "Beds"
        // category only carries a generic icon; this block surfaces the real
        // sleeping arrangement (Bedroom 1: King, Bedroom 2: Double, etc.).
        if (typeof renderLayoutBlock === 'function') {
            renderLayoutBlock(room.bedroom_details, room.bathroom_details, amenities);
        }
        
        // Build adults and children dropdowns based on occupancy settings
        var maxGuests = room.max_guests || occSettings.max_guests || 4;
        var maxAdults = occSettings.max_adults || maxGuests;
        var childrenAllowed = occSettings.children_allowed !== false;
        var childMaxAge = occSettings.child_max_age || 12;
        var baseOccupancy = occSettings.base_occupancy || 2;
        
        // Default to base occupancy for better UX (price matches listing page)
        var initialAdults = parseInt(guests) || baseOccupancy;
        // Clamp to valid range
        if (initialAdults > maxAdults) initialAdults = maxAdults;
        if (initialAdults < 1) initialAdults = 1;
        var initialChildren = 0;
        
        // Store limits for later use
        $roomWidget.data('max-guests', maxGuests);
        $roomWidget.data('children-allowed', childrenAllowed);
        $roomWidget.data('child-max-age', childMaxAge);
        
        // Adults dropdown
        var $adultsSelect = $('.gas-adults');
        $adultsSelect.empty();
        var adultSingular = t('booking', 'adult', 'Adult');
        var adultPlural = t('booking', 'adults', 'Adults');
        for (var i = 1; i <= maxAdults; i++) {
            $adultsSelect.append('<option value="' + i + '"' + (i == initialAdults ? ' selected' : '') + '>' + i + ' ' + (i > 1 ? adultPlural : adultSingular) + '</option>');
        }
        
        // Children dropdown — capped by BOTH the room's max_children setting
        // (GAS Controls) AND remaining capacity (maxGuests - adults).
        // Previously only used maxGuests - adults, so a room with
        // max_children=0 still showed a children selector — confusing for
        // adults-only rooms. Now max_children is the hard ceiling.
        var $childrenSelect = $('.gas-children');
        var $childrenField = $('.gas-children-field');
        var maxChildrenSetting = parseInt(occSettings.max_children) || 0;

        if (childrenAllowed && maxChildrenSetting > 0) {
            var remainingCapacity = Math.max(0, maxGuests - initialAdults);
            var maxChildrenNow = Math.min(maxChildrenSetting, remainingCapacity);
            if (maxChildrenNow > 0) {
                $childrenField.removeClass('hidden').show();
                $childrenSelect.empty();
                for (var c = 0; c <= maxChildrenNow; c++) {
                    $childrenSelect.append('<option value="' + c + '"' + (c == initialChildren ? ' selected' : '') + '>' + c + '</option>');
                }
                // Update child age label
                $('.gas-child-age-label').text('(' + t('common', 'under', 'under') + ' ' + childMaxAge + ')');
            } else {
                // No room for children when all adults selected
                $childrenField.addClass('hidden').hide();
            }
        } else {
            // Either children_allowed is false OR max_children is 0 — hide selector
            $childrenField.addClass('hidden').hide();
        }
        
        // Also keep legacy .gas-guests for backward compatibility
        var guestSingular = t('booking', 'guest', 'Guest');
        var guestPlural = t('booking', 'guests', 'Guests');
        var $guestsSelect = $('.gas-guests');
        if ($guestsSelect.length) {
            $guestsSelect.empty();
            for (var g = 1; g <= maxGuests; g++) {
                $guestsSelect.append('<option value="' + g + '"' + (g == guests ? ' selected' : '') + '>' + g + ' ' + (g > 1 ? guestPlural : guestSingular) + '</option>');
            }
        }
        
        // Store room data and occupancy settings
        $roomWidget.data('room', room);
        $roomWidget.data('currency', currency);
        $roomWidget.data('occupancy-settings', occSettings);
        
        // Load initial calendar — open at the selected arrival month if the
        // guest came in from search with a ?checkin=YYYY-MM-DD param, so
        // they see availability for the dates they care about, not today.
        var calStart = new Date();
        try {
            var urlCheckin = new URLSearchParams(window.location.search).get('checkin');
            if (urlCheckin && /^\d{4}-\d{2}-\d{2}$/.test(urlCheckin)) {
                calStart = new Date(urlCheckin + 'T00:00:00');
            }
        } catch (e) {}
        calendarMonth = new Date(calStart.getFullYear(), calStart.getMonth(), 1);
        loadAvailabilityCalendar(room.id || $roomWidget.data('unit-id'), calendarMonth);
        
        // Show map if coordinates available
        var mapTitle = room.property_name || extractText(room.display_name) || room.name;
        if (room.latitude && room.longitude) {
            renderMap(room.latitude, room.longitude, mapTitle);
        } else if (room.city || room.country) {
            // Use city/country for a general location map
            renderMapByAddress((room.city || '') + ', ' + (room.country || ''));
        }
        
        // Show content
        $('.gas-room-loading').hide();
        $('.gas-room-content').show();
        
        // Update translations after content is loaded
        updateStaticTranslations();
        
        // Load offers (upsells are shown on checkout page only)
        var unitId = room.id || $roomWidget.data('unit-id');
        loadOffers(unitId, checkin, checkout, guests);
        
        // If dates were passed, auto-calculate price
        if (checkin && checkout) {
            calculatePrice(unitId, checkin, checkout, guests);
        }
    }
    
    function renderGallery(images) {
        var $gallery = $('.gas-gallery');

        if (!images || images.length === 0) {
            $gallery.html('<div class="gas-gallery-placeholder">🏠</div>');
            return;
        }

        // Prefer landscape images for gallery tiles (width >= height)
        // Portraits still appear in lightbox via "View all"
        var landscapes = [], portraits = [];
        for (var idx = 0; idx < images.length; idx++) {
            var img = images[idx];
            var w = parseInt(img.width) || 0;
            var h = parseInt(img.height) || 0;
            // Treat unknown dimensions as landscape (don't exclude)
            if (w === 0 && h === 0 || w >= h) {
                landscapes.push({ img: img, origIndex: idx });
            } else {
                portraits.push({ img: img, origIndex: idx });
            }
        }
        // Take up to 5 landscapes, fill remaining slots with portraits
        var galleryTiles = landscapes.slice(0, 5);
        if (galleryTiles.length < 5) {
            var needed = 5 - galleryTiles.length;
            for (var p = 0; p < Math.min(needed, portraits.length); p++) {
                galleryTiles.push(portraits[p]);
            }
        }
        // Cap at available images
        if (galleryTiles.length > images.length) {
            galleryTiles = galleryTiles.slice(0, images.length);
        }

        var html = '';
        var mainUrl = galleryTiles[0].img.url || galleryTiles[0].img.image_url || '';

        // Main large image — data-index points to original position for lightbox
        html += '<img class="gas-gallery-main" src="' + mainUrl + '" alt="Room image" data-index="' + galleryTiles[0].origIndex + '">';

        // Grid of up to 4 smaller images
        if (galleryTiles.length > 1) {
            html += '<div class="gas-gallery-grid">';
            for (var i = 1; i < galleryTiles.length; i++) {
                var url = galleryTiles[i].img.url || galleryTiles[i].img.image_url || '';
                var origIdx = galleryTiles[i].origIndex;
                if (i === 4 && images.length > 5) {
                    html += '<div class="gas-gallery-more" data-index="' + origIdx + '">';
                    html += '<img class="gas-gallery-thumb" src="' + url + '" alt="Thumbnail">';
                    html += '<div class="gas-gallery-more-overlay">View all ' + images.length + ' images</div>';
                    html += '</div>';
                } else {
                    html += '<img class="gas-gallery-thumb" src="' + url + '" alt="Thumbnail" data-index="' + origIdx + '">';
                }
            }
            html += '</div>';
        }

        $gallery.html(html);

        // Store ALL images for lightbox (original order, including portraits)
        $roomWidget.data('images', images);
    }
    
    // Amenity category labels per language. Categories come from master_amenities.category
    // as raw snake_case codes (e.g. 'bathrooms', 'room_features'). Without this map
    // the property page renders the raw English code as the section heading even on
    // Japanese sites — Nozawa flagged this 2026-05-25.
    var AMENITY_CATEGORY_LABELS = {
        en: { bathrooms:'Bathrooms', beds:'Beds', bedroom_and_laundry:'Bedroom and Laundry', entertainment:'Entertainment', essentials:'Essentials', family:'Family', kitchen:'Kitchen', laundry:'Laundry', location:'Location', meals:'Meals', other:'Other', outdoor:'Outdoor', parking:'Parking', policies:'Policies', room_features:'Room Features', safety:'Safety', services:'Services', transport:'Transport', wellness:'Wellness', work:'Work', accessibility:'Accessibility', activities:'Activities', general:'General' },
        ja: { bathrooms:'バスルーム', beds:'寝具', bedroom_and_laundry:'ベッドルームとランドリー', entertainment:'エンターテインメント', essentials:'アメニティ', family:'お子様用アメニティ', kitchen:'キッチン', laundry:'ランドリー', location:'ロケーション', meals:'お食事', other:'その他', outdoor:'屋外', parking:'駐車場', policies:'ポリシー', room_features:'お部屋の設備', safety:'安全面', services:'サービス', transport:'交通', wellness:'リラクゼーション', work:'ワーク', accessibility:'バリアフリー', activities:'アクティビティ', general:'一般' },
        fr: { bathrooms:'Salles de bain', beds:'Lits', entertainment:'Divertissement', essentials:'Essentiels', family:'Famille', kitchen:'Cuisine', laundry:'Buanderie', location:'Emplacement', other:'Autres', outdoor:'Extérieur', parking:'Parking', room_features:'Caractéristiques', safety:'Sécurité', wellness:'Bien-être' },
        es: { bathrooms:'Baños', beds:'Camas', entertainment:'Entretenimiento', essentials:'Esenciales', family:'Familia', kitchen:'Cocina', laundry:'Lavandería', location:'Ubicación', other:'Otros', outdoor:'Exterior', parking:'Aparcamiento', room_features:'Características', safety:'Seguridad', wellness:'Bienestar' },
        de: { bathrooms:'Badezimmer', beds:'Betten', entertainment:'Unterhaltung', essentials:'Grundausstattung', family:'Familie', kitchen:'Küche', laundry:'Wäsche', location:'Lage', other:'Sonstiges', outdoor:'Außenbereich', parking:'Parken', room_features:'Zimmerausstattung', safety:'Sicherheit', wellness:'Wellness' },
        nl: { bathrooms:'Badkamers', beds:'Bedden', entertainment:'Entertainment', essentials:'Essentials', family:'Familie', kitchen:'Keuken', laundry:'Wasruimte', location:'Locatie', other:'Overige', outdoor:'Buiten', parking:'Parkeren', room_features:'Kamerkenmerken', safety:'Veiligheid', wellness:'Wellness' }
    };
    function _amenityCategoryLabel(cat) {
        var lang = (window.gasBookingLang || window.currentLanguage || 'en').slice(0,2);
        var key = String(cat || 'general').toLowerCase().replace(/[\s-]+/g,'_');
        var langMap = AMENITY_CATEGORY_LABELS[lang] || AMENITY_CATEGORY_LABELS.en;
        // Fall back: lang label → en label → raw key prettified
        return langMap[key] || AMENITY_CATEGORY_LABELS.en[key] || key.replace(/_/g,' ').replace(/\b\w/g, function(c){return c.toUpperCase();});
    }

    // Render the actual sleeping + bathroom layout from
    // property_bedrooms / property_bathrooms. Prepended to the
    // amenities grid so it reads as part of the Features tab.
    function renderLayoutBlock(bedrooms, bathrooms, amenities) {
        var $container = $('.gas-amenities-container');
        if (!$container.length) return;
        $container.find('.gas-layout-block').remove();
        var bedTypeIcons = {
            BED_KING: '🛏️', BED_QUEEN: '🛏️', BED_DOUBLE: '🛏️',
            BED_SINGLE: '🛌', BED_TWIN: '🛌', BED_BUNK: '🪜', BED_BUNKBED: '🪜',
            BED_SOFA: '🛋️', BED_SOFABED: '🛋️',
            BED_FUTON: '🛏️', BED_MURPHY: '🛏️', BED_FAMILY: '🛏️',
            BED_COT: '🍼', BED_CRIB: '🍼'
        };
        function bedTag(bed) {
            var qty  = parseInt(bed.quantity || bed.qty || 1) || 1;
            var name = bed.name || '';
            var type = (bed.type || '').toUpperCase();
            if (type && !type.startsWith('BED_')) type = 'BED_' + type;
            var icon = bedTypeIcons[type] || '🛏️';
            var label = name || (type.replace(/^BED_/, '').toLowerCase().replace(/\b\w/g, function(c){return c.toUpperCase();}) + ' Bed');
            return '<div class="gas-amenity-tag"><span class="gas-amenity-icon">' + icon + '</span>' + (qty > 1 ? qty + '× ' : '') + label + '</div>';
        }
        function featTag(icon, label) {
            return '<div class="gas-amenity-tag"><span class="gas-amenity-icon">' + icon + '</span>' + label + '</div>';
        }
        // Sub-heading for each bedroom/bathroom — matches the existing
        // category-title weight but smaller so it nests visually under
        // "Sleeping arrangements" / "Bathrooms".
        function subHeading(label, ensuite) {
            return '<div style="width:100%; font-size:14px; font-weight:600; color:var(--gas-text, #1f2937); margin:8px 0 4px 0;">' + label
                 + (ensuite ? ' <span style="font-size:11px; font-weight:500; color:#059669;">✓ Ensuite</span>' : '')
                 + '</div>';
        }
        var html = '';
        if (Array.isArray(bedrooms) && bedrooms.length > 0) {
            html += '<div class="gas-amenities-category gas-layout-block">';
            html += '<h4 class="gas-amenities-category-title">' + t('property', 'sleeping_arrangements', 'Sleeping arrangements') + '</h4>';
            html += '<div class="gas-amenities-list">';
            bedrooms.forEach(function(br) {
                var beds = Array.isArray(br.bed_config) ? br.bed_config
                  : (br.bed_config && Array.isArray(br.bed_config.beds) ? br.bed_config.beds : []);
                html += subHeading(br.name || 'Bedroom', br.has_ensuite);
                beds.forEach(function(b) { html += bedTag(b); });
            });
            html += '</div></div>';
        }
        if (Array.isArray(bathrooms) && bathrooms.length > 0) {
            html += '<div class="gas-amenities-category gas-layout-block">';
            html += '<h4 class="gas-amenities-category-title">' + t('property', 'bathrooms_heading', 'Bathrooms') + '</h4>';
            html += '<div class="gas-amenities-list">';
            bathrooms.forEach(function(ba) {
                var feats = ba.features || {};
                html += subHeading(ba.name || (ba.is_ensuite ? 'Ensuite' : 'Bathroom'), ba.is_ensuite);
                if (feats.shower)            html += featTag('🚿', 'Shower');
                if (feats.bathtub)           html += featTag('🛁', 'Bathtub');
                if (feats.walkin)            html += featTag('🚶', 'Walk-in');
                if (feats.rainfall)          html += featTag('🌧️', 'Rainfall');
                if (feats.jacuzzi)           html += featTag('🛁', 'Jacuzzi');
                if (feats.bidet)             html += featTag('🚽', 'Bidet');
                if (feats.accessible)        html += featTag('♿', 'Accessible');
                if (feats['heated-floor'])   html += featTag('♨️', 'Heated floor');
                if (feats['double-vanity'])  html += featTag('🪞', 'Double vanity');
                if (feats.toilet)            html += featTag('🚽', 'Toilet');
            });
            // Pull legacy "Bathrooms" category amenities (Toiletries, Towels,
            // Hair Dryer etc) into this same section so they don't render as
            // a duplicate heading further down the Features tab.
            if (Array.isArray(amenities)) {
                amenities.forEach(function(a) {
                    var cat = (a.category || '').toLowerCase();
                    if (cat === 'bathrooms' || cat === 'bathroom') {
                        var nm = (typeof parseDescription === 'function' ? parseDescription(a.name) : null) || a.name;
                        var ic = a.icon || (typeof getAmenityIcon === 'function' ? getAmenityIcon(nm) : '');
                        html += featTag(ic, nm);
                    }
                });
            }
            html += '</div></div>';
        }
        if (html) $container.prepend(html);
    }

    function renderAmenities(amenities) {
        if (!amenities || amenities.length === 0) {
            $('.gas-tab-btn[data-tab="features"]').hide();
            return;
        }

        // Group by category. "Beds" and "Bathrooms" categories are
        // intentionally skipped — Sleeping arrangements + structured
        // Bathrooms above already cover them, and re-rendering here
        // produced duplicate sections on the Features tab.
        var categories = {};
        amenities.forEach(function(amenity) {
            var cat = amenity.category || 'General';
            var catLc = cat.toLowerCase();
            if (catLc === 'beds' || catLc === 'bed' || catLc === 'bathrooms' || catLc === 'bathroom') return;
            if (!categories[cat]) {
                categories[cat] = [];
            }
            categories[cat].push({
                name: amenity.name,
                icon: amenity.icon,
                quantity: amenity.quantity || 1
            });
        });

        var html = '';
        for (var cat in categories) {
            html += '<div class="gas-amenities-category">';
            html += '<h4 class="gas-amenities-category-title">' + _amenityCategoryLabel(cat) + '</h4>';
            html += '<div class="gas-amenities-list">';
            categories[cat].forEach(function(item) {
                var displayName = parseDescription(item.name) || item.name;
                var icon = item.icon || getAmenityIcon(displayName);
                var quantityPrefix = item.quantity > 1 ? item.quantity + 'x ' : '';
                html += '<div class="gas-amenity-tag"><span class="gas-amenity-icon">' + icon + '</span>' + quantityPrefix + displayName + '</div>';
            });
            html += '</div></div>';
        }
        
        $('.gas-amenities-container').html(html);
    }
    
    // Gallery click - open lightbox
    $(document).on('click', '.gas-gallery-main, .gas-gallery-thumb, .gas-gallery-more', function() {
        var index = parseInt($(this).data('index')) || 0;
        openLightbox(index);
    });
    
    function openLightbox(index) {
        var images = $roomWidget.data('images');
        if (!images || images.length === 0) return;

        var $lightbox = $('.gas-lightbox');
        $lightbox.data('current', index);
        $lightbox.data('images', images);
        updateLightboxImage(index);
        $lightbox.addClass('active');
        $('body').css('overflow', 'hidden');
    }

    function updateLightboxImage(index) {
        var images = $('.gas-lightbox').data('images');
        if (!images || !images[index]) return;
        var url = images[index].url || images[index].image_url || '';
        $('.gas-lightbox img').attr('src', url);
        $('.gas-lightbox-counter').text((index + 1) + ' / ' + images.length);
    }
    
    $(document).on('click', '.gas-lightbox-close', function() {
        $('.gas-lightbox').removeClass('active');
        $('body').css('overflow', '');
    });
    
    // Click on lightbox image — do nothing (use X button or background to close)
    
    $(document).on('click', '.gas-lightbox-prev', function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var $lightbox = $('.gas-lightbox');
        var images = $lightbox.data('images');
        if (!images) return;
        var current = $lightbox.data('current') || 0;
        var newIndex = (current - 1 + images.length) % images.length;
        $lightbox.data('current', newIndex);
        updateLightboxImage(newIndex);
    });

    $(document).on('click', '.gas-lightbox-next', function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var $lightbox = $('.gas-lightbox');
        var images = $lightbox.data('images');
        if (!images) return;
        var current = $lightbox.data('current') || 0;
        var newIndex = (current + 1) % images.length;
        $lightbox.data('current', newIndex);
        updateLightboxImage(newIndex);
    });

    // Close lightbox on background click only
    $(document).on('click', '.gas-lightbox', function(e) {
        if (e.target === this) {
            $('.gas-lightbox').removeClass('active');
            $('body').css('overflow', '');
        }
    });
    
    // More Info toggle
    $(document).on('click', '.gas-more-info-toggle', function() {
        $(this).toggleClass('active');
        $('.gas-description-full').toggleClass('active');
        
        // Update button text
        var $span = $(this).find('span');
        if ($(this).hasClass('active')) {
            $span.text(t('common', 'less_info', 'Less Information'));
        } else {
            $span.text(t('common', 'more_info', 'More Information'));
        }
    });
    
    // Keyboard navigation for lightbox
    $(document).on('keydown', function(e) {
        if (!$('.gas-lightbox').hasClass('active')) return;
        if (e.key === 'Escape') $('.gas-lightbox-close').click();
        if (e.key === 'ArrowLeft') $('.gas-lightbox-prev').click();
        if (e.key === 'ArrowRight') $('.gas-lightbox-next').click();
    });
    
    // Tabs
    $(document).on('click', '.gas-tab-btn', function() {
        var tab = $(this).data('tab');

        $('.gas-tab-btn').removeClass('active');
        $(this).addClass('active');

        $('.gas-tab-content').removeClass('active');
        $('.gas-tab-content[data-tab="' + tab + '"]').addClass('active');

        // Load reviews when Reviews tab is clicked
        if (tab === 'reviews' && !window.gasReviewsLoaded) {
            var unitId = $('.gas-room-widget').data('unit-id');
            loadRoomReviews(unitId);
        }
    });

    // Initial-tab policy: every room-page first view MUST land on
    // Description. Even if the listing-page link carries
    // ?tab=availability (which it did when checkin+checkout were
    // pre-filled), force-activate Description so guests always see
    // the property pitch first. The user can click Availability
    // themselves; the inline flatpickr onOpen still flips to it
    // when they tap the date input.
    (function() {
        $('.gas-tab-btn').removeClass('active');
        $('.gas-tab-content').removeClass('active');
        $('.gas-tab-btn[data-tab="description"]').addClass('active');
        $('.gas-tab-content[data-tab="description"]').addClass('active');
    })();
    
    // Pre-load reviews check to hide/show tab before user interaction
    function preloadReviewsCheck(unitId) {
        var licenseKey = gasBooking.licenseKey || '';
        $.ajax({
            url: gasBooking.apiUrl + '/api/plugin/reviews?room_id=' + unitId + '&limit=1&license_key=' + encodeURIComponent(licenseKey),
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.reviews && response.reviews.length > 0) {
                    // Has reviews - show the tab
                    $('.gas-tab-btn[data-tab="reviews"]').show();
                } else {
                    // No reviews - hide the tab
                    $('.gas-tab-btn[data-tab="reviews"]').hide();
                }
            },
            error: function() {
                // On error, hide reviews tab
                $('.gas-tab-btn[data-tab="reviews"]').hide();
            }
        });
    }
    
    // Load reviews for a room
    var gasReviewsLoaded = false;
    var gasReviewColors = null;
    
    function loadReviewColors(callback) {
        if (gasReviewColors) {
            callback(gasReviewColors);
            return;
        }
        var clientId = gasBooking.clientId || '';
        if (!clientId) {
            // Default colors
            gasReviewColors = {
                accent: '#667eea', bg: '#ffffff', card_bg: '#ffffff',
                text: '#1e293b', text_secondary: '#64748b', star: '#fbbf24'
            };
            callback(gasReviewColors);
            return;
        }
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/client/' + clientId + '/app-settings/reviews',
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.colors) {
                    gasReviewColors = response.colors;
                } else {
                    gasReviewColors = {
                        accent: '#667eea', bg: '#ffffff', card_bg: '#ffffff',
                        text: '#1e293b', text_secondary: '#64748b', star: '#fbbf24'
                    };
                }
                callback(gasReviewColors);
            },
            error: function() {
                gasReviewColors = {
                    accent: '#667eea', bg: '#ffffff', card_bg: '#ffffff',
                    text: '#1e293b', text_secondary: '#64748b', star: '#fbbf24'
                };
                callback(gasReviewColors);
            }
        });
    }
    
    function loadRoomReviews(unitId) {
        var licenseKey = gasBooking.licenseKey || '';
        
        // First load colors, then load reviews
        loadReviewColors(function(colors) {
            $.ajax({
                url: gasBooking.apiUrl + '/api/plugin/reviews?room_id=' + unitId + '&limit=50&license_key=' + encodeURIComponent(licenseKey),
                method: 'GET',
                dataType: 'json',
                success: function(response) {
                    gasReviewsLoaded = true;
                    $('.gas-reviews-loading').hide();
                    $('.gas-reviews-content').show();
                    
                    if (response.success && response.reviews && response.reviews.length > 0) {
                        var reviews = response.reviews;
                        var total = 0;
                        reviews.forEach(function(r) { total += parseFloat(r.rating || 0); });
                        var avg = (total / reviews.length).toFixed(1);
                        var stars5 = avg > 5 ? avg / 2 : avg;
                        var starsHtml = '';
                        for (var i = 1; i <= 5; i++) {
                            starsHtml += i <= Math.round(stars5) ? '★' : '☆';
                        }
                        
                        // Update summary with colors
                        $('.gas-reviews-summary').css({
                            'background': 'linear-gradient(135deg, ' + colors.accent + ', #8b5cf6)'
                        });
                        $('.gas-reviews-avg').text(avg);
                        $('.gas-reviews-stars').css('color', colors.star).html(starsHtml);
                        $('.gas-reviews-count').text(reviews.length + ' review' + (reviews.length !== 1 ? 's' : ''));
                        
                        var listHtml = '';
                        reviews.forEach(function(r) {
                            var rating = parseFloat(r.rating || 10);
                            var stars5r = rating > 5 ? rating / 2 : rating;
                            var starsR = '';
                            for (var i = 1; i <= 5; i++) {
                                starsR += i <= Math.round(stars5r) ? '★' : '☆';
                            }
                            var initial = (r.guest_name || 'G').charAt(0).toUpperCase();
                            var date = r.review_date ? new Date(r.review_date).toLocaleDateString(dateLocale, {month: 'short', year: 'numeric'}) : '';
                            var sourceColor = getSourceColor(r.channel_name || '');
                            
                            listHtml += '<div class="gas-review-card" style="background: ' + colors.card_bg + '; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">';
                            listHtml += '<div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">';
                            listHtml += '<div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, ' + colors.accent + ', #8b5cf6); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 18px;">' + initial + '</div>';
                            listHtml += '<div style="flex: 1;"><div style="font-weight: 600; color: ' + colors.text + ';">' + (r.guest_name || 'Guest') + '</div>';
                            if (r.guest_country || date) {
                                listHtml += '<div style="font-size: 13px; color: ' + colors.text_secondary + ';">' + (r.guest_country || '') + (r.guest_country && date ? ' • ' : '') + date + '</div>';
                            }
                            listHtml += '</div>';
                            listHtml += '<div style="text-align: right;"><div style="color: ' + colors.star + '; font-size: 16px;">' + starsR + '</div>';
                            if (r.channel_name) {
                                listHtml += '<div style="font-size: 11px; color: ' + sourceColor + '; font-weight: 600;">' + r.channel_name + '</div>';
                            }
                            listHtml += '</div></div>';
                            listHtml += '<p style="color: ' + colors.text_secondary + '; line-height: 1.6; margin: 0;">"' + (r.comment || '') + '"</p>';
                            listHtml += '</div>';
                        });
                        
                        $('.gas-reviews-list').html(listHtml);
                        // Show reviews tab since we have reviews
                        $('.gas-tab-btn[data-tab="reviews"]').show();
                    } else {
                        $('.gas-reviews-summary').hide();
                        $('.gas-reviews-empty').show();
                        // Hide reviews tab if no reviews
                        $('.gas-tab-btn[data-tab="reviews"]').hide();
                        $('.gas-tab-content[data-tab="reviews"]').hide();
                    }
                },
                error: function() {
                    gasReviewsLoaded = true;
                    $('.gas-reviews-loading').hide();
                    $('.gas-reviews-content').show();
                    $('.gas-reviews-summary').hide();
                    $('.gas-reviews-empty').show();
                    // Hide reviews tab on error
                    $('.gas-tab-btn[data-tab="reviews"]').hide();
                    $('.gas-tab-content[data-tab="reviews"]').hide();
                }
            });
        });
    }
    
    function getSourceColor(source) {
        var s = (source || '').toLowerCase();
        if (s.indexOf('airbnb') >= 0) return '#FF5A5F';
        if (s.indexOf('booking') >= 0) return '#003580';
        if (s.indexOf('vrbo') >= 0) return '#3D74C7';
        if (s.indexOf('google') >= 0) return '#4285F4';
        if (s.indexOf('tripadvisor') >= 0) return '#00AF87';
        return '#6B7280';
    }
    
    // Accordion
    $(document).on('click', '.gas-accordion-header', function() {
        var $item = $(this).closest('.gas-accordion-item');
        $item.toggleClass('active');
    });
    
    // Shade unavailable days inside the flatpickr check-in/check-out
    // popup so guests see availability without switching to the
    // Availability tab. Fetches once per displayed month, caches the
    // result, and adds the `gas-fp-unavailable` class to matching
    // day cells.
    var _flatpickrAvailCache = {};
    function refreshFlatpickrAvailability(instance) {
        try {
            var unitId = ($roomWidget && $roomWidget.data && $roomWidget.data('unit-id'))
              || (document.querySelector('.gas-room-widget') && document.querySelector('.gas-room-widget').dataset.unitId);
            if (!unitId || !instance || !instance.currentYear) return;
            var year = instance.currentYear;
            var month = instance.currentMonth;
            // Pull 2 months so the next-month cell row stays accurate.
            var from = year + '-' + String(month + 1).padStart(2, '0') + '-01';
            var endDate = new Date(year, month + 2, 0);
            var to = endDate.getFullYear() + '-' + String(endDate.getMonth() + 1).padStart(2, '0') + '-' + String(endDate.getDate()).padStart(2, '0');
            var key = unitId + ':' + from + ':' + to;
            function shade(unavail) {
                var cells = instance.calendarContainer.querySelectorAll('.flatpickr-day');
                cells.forEach(function(cell) {
                    if (!cell.dateObj) return;
                    var d = cell.dateObj;
                    var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                    var isUnavail = unavail.indexOf(iso) >= 0;
                    // Skip cells that are disabled by flatpickr (past, min/max
                    // bounds, event-date rules) so the green doesn't override
                    // their faded look.
                    var isDisabled = cell.classList.contains('flatpickr-disabled');
                    if (isUnavail) {
                        cell.classList.add('gas-fp-unavailable');
                        cell.classList.remove('gas-fp-available');
                    } else {
                        cell.classList.remove('gas-fp-unavailable');
                        if (isDisabled) cell.classList.remove('gas-fp-available');
                        else            cell.classList.add('gas-fp-available');
                    }
                });
            }
            if (_flatpickrAvailCache[key]) {
                shade(_flatpickrAvailCache[key]);
                return;
            }
            $.ajax({
                url: gasBooking.apiUrl + '/api/availability/' + unitId + '?from=' + from + '&to=' + to + '&_ts=' + Date.now(),
                method: 'GET', cache: false,
                success: function(resp) {
                    var unavail = [];
                    (resp && resp.availability || []).forEach(function(row) {
                        if (row.is_available === false || row.is_blocked === true || row.has_booking === true) {
                            unavail.push(row.date);
                        }
                    });
                    _flatpickrAvailCache[key] = unavail;
                    shade(unavail);
                }
            });
        } catch (e) { /* non-fatal */ }
    }

    // Availability Calendar - 2 month view
    var calendarMonth = new Date();
    
    function loadAvailabilityCalendar(unitId, date) {
        var year = date.getFullYear();
        var month = date.getMonth();
        
        // Get data for 2 months - add 1 day to include last day (API uses date < to)
        var firstDay = new Date(year, month, 1);
        var lastDayMonth2 = new Date(year, month + 2, 1); // First day of month after, so < catches last day
        
        var from = firstDay.toISOString().split('T')[0];
        var to = lastDayMonth2.toISOString().split('T')[0];
        
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/availability/' + unitId + '?from=' + from + '&to=' + to,
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                var availability = response.calendar || [];
                renderCalendar(date, availability, 'current');
                
                var nextMonth = new Date(year, month + 1, 1);
                renderCalendar(nextMonth, availability, 'next');
            }
        });
    }
    
    function renderCalendar(date, availability, which) {
        var year = date.getFullYear();
        var month = date.getMonth();
        var firstDay = new Date(year, month, 1);
        var lastDay = new Date(year, month + 1, 0);
        var startDay = firstDay.getDay(); // 0 = Sunday
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Update title - use translated month names
        var monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        var monthNamesFallback = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        var $calendar = $('.gas-calendar[data-month="' + which + '"]');
        var monthName = t('calendar', monthKeys[month], monthNamesFallback[month]);
        $calendar.find('.gas-calendar-title').text(monthName + ' ' + year);
        
        // Create availability lookup
        var availLookup = {};
        availability.forEach(function(day) {
            availLookup[day.date] = day.available;
        });
        
        var html = '';
        
        // Day names - use translated day names
        var dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        var dayNamesFallback = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayKeys.forEach(function(key, i) {
            var dayName = t('calendar', key, dayNamesFallback[i]);
            html += '<div class="gas-calendar-day-name">' + dayName + '</div>';
        });
        
        // Empty cells before first day
        for (var i = 0; i < startDay; i++) {
            html += '<div class="gas-calendar-day empty"></div>';
        }
        
        // Days of month
        for (var d = 1; d <= lastDay.getDate(); d++) {
            var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            var thisDate = new Date(year, month, d);
            var isPast = thisDate < today;
            var isAvailable = availLookup[dateStr];
            
            var classes = 'gas-calendar-day';
            if (isPast) {
                classes += ' past';
            } else if (isAvailable === false) {
                classes += ' unavailable';
            } else if (isAvailable === true) {
                classes += ' available';
            } else {
                // No data - assume unavailable (no availability record means not bookable)
                classes += ' unavailable';
            }
            
            html += '<div class="' + classes + '">' + d + '</div>';
        }
        
        $calendar.find('.gas-calendar-grid').html(html);
    }
    
    $(document).on('click', '.gas-cal-prev', function() {
        calendarMonth.setMonth(calendarMonth.getMonth() - 1);
        var unitId = $roomWidget.data('unit-id');
        loadAvailabilityCalendar(unitId, calendarMonth);
    });
    
    $(document).on('click', '.gas-cal-next', function() {
        calendarMonth.setMonth(calendarMonth.getMonth() + 1);
        var unitId = $roomWidget.data('unit-id');
        loadAvailabilityCalendar(unitId, calendarMonth);
    });
    
    function parseDescription(desc) {
        if (!desc) return '';
        if (typeof desc === 'object') {
            return desc[currentLanguage] || desc.en || desc[Object.keys(desc)[0]] || '';
        }
        // Some legacy rows in bookable_units.full_description were JSON.stringify'd
        // twice on write, so JSON.parse(desc) returns a STRING that still needs
        // parsing. Without the second parse, the old code did Object.keys on a
        // string and returned its first character — rendering "More Info" as "{".
        try {
            var parsed = JSON.parse(desc);
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch(_) { return parsed; }
            }
            if (parsed && typeof parsed === 'object') {
                return parsed[currentLanguage] || parsed.en || parsed[Object.keys(parsed)[0]] || desc;
            }
            return parsed || desc;
        } catch(e) {
            return desc;
        }
    }
    
    // Map functions - using Leaflet for interactive maps
    var propertyMap = null;
    var propertyMarker = null;
    
    function renderMap(lat, lng, title) {
        var $mapContainer = $('.gas-map-container');
        var $map = $('.gas-map');
        
        // Parse coordinates
        lat = parseFloat(lat);
        lng = parseFloat(lng);
        
        if (isNaN(lat) || isNaN(lng)) {
            console.log('Invalid coordinates for map');
            return;
        }
        
        // Show the container
        $mapContainer.show();
        
        // Give DOM time to render, then initialize map
        setTimeout(function() {
            // Destroy existing map if any
            if (propertyMap) {
                propertyMap.remove();
                propertyMap = null;
            }
            
            // Create the Leaflet map
            propertyMap = L.map($map[0], {
                scrollWheelZoom: false,
                dragging: !L.Browser.mobile
            }).setView([lat, lng], 15);
            
            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19
            }).addTo(propertyMap);
            
            // Add marker
            propertyMarker = L.marker([lat, lng]).addTo(propertyMap);
            
            if (title) {
                propertyMarker.bindPopup('<strong>' + title + '</strong>').openPopup();
            }
            
            // Fix map size after container is visible
            propertyMap.invalidateSize();
        }, 100);
    }
    
    function renderMapByAddress(address) {
        if (!address || address.trim() === ',' || address.trim() === '') return;
        
        var $mapContainer = $('.gas-map-container');
        var $map = $('.gas-map');
        
        // Use Nominatim geocoding API to get coordinates
        var encodedAddress = encodeURIComponent(address.trim());
        
        $.ajax({
            url: 'https://nominatim.openstreetmap.org/search?format=json&q=' + encodedAddress,
            method: 'GET',
            headers: {
                'User-Agent': 'GAS-Booking-Plugin/1.0'
            },
            success: function(results) {
                if (results && results.length > 0) {
                    var lat = parseFloat(results[0].lat);
                    var lng = parseFloat(results[0].lon);
                    renderMap(lat, lng, address);
                } else {
                    console.log('Address not found:', address);
                }
            },
            error: function(err) {
                console.log('Geocoding error:', err);
            }
        });
    }
    
    // Date change handler
    $(document).on('change', '.gas-checkin, .gas-checkout', function() {
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        var guests = $('.gas-guests').val();
        var unitId = $roomWidget.data('unit-id');
        
        if (checkin && checkout && new Date(checkout) > new Date(checkin)) {
            calculatePrice(unitId, checkin, checkout, guests);
        } else {
            // Reset to select dates state
            $('.gas-price-breakdown').hide();
            $('.gas-occupancy-adjustment').hide();
            $('.gas-book-btn').prop('disabled', true).text(t('booking', 'select_dates_to_check', 'Select dates to check availability'));
        }
    });
    
    // Adults/Children change handler - recalculate price when guests change
    $(document).on('change', '.gas-adults', function() {
        var adults = parseInt($(this).val()) || 1;
        var maxGuests = $roomWidget.data('max-guests') || 4;
        var childrenAllowed = $roomWidget.data('children-allowed') !== false;
        var childMaxAge = $roomWidget.data('child-max-age') || 12;
        
        // Recalculate max children based on selected adults
        var maxChildrenNow = Math.max(0, maxGuests - adults);
        var $childrenSelect = $('.gas-children');
        var $childrenField = $('.gas-children-field');
        var currentChildren = parseInt($childrenSelect.val()) || 0;
        
        if (childrenAllowed && maxChildrenNow > 0) {
            $childrenField.removeClass('hidden').show();
            $childrenSelect.empty();
            for (var c = 0; c <= maxChildrenNow; c++) {
                $childrenSelect.append('<option value="' + c + '">' + c + '</option>');
            }
            // Keep current selection if still valid, otherwise set to max available
            if (currentChildren <= maxChildrenNow) {
                $childrenSelect.val(currentChildren);
            } else {
                $childrenSelect.val(maxChildrenNow);
            }
        } else {
            $childrenField.addClass('hidden').hide();
            $childrenSelect.val(0);
        }
        
        // Now trigger price recalculation
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        var children = parseInt($childrenSelect.val()) || 0;
        var unitId = $roomWidget.data('unit-id');
        var totalGuests = adults + children;
        
        // Update legacy guests dropdown if exists
        if ($('.gas-guests').length) {
            $('.gas-guests').val(totalGuests);
        }
        
        if (checkin && checkout && new Date(checkout) > new Date(checkin)) {
            calculatePrice(unitId, checkin, checkout, totalGuests, adults, children);
        }
    });
    
    // Children change handler - just recalculate price
    $(document).on('change', '.gas-children', function() {
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        var adults = parseInt($('.gas-adults').val()) || 1;
        var children = parseInt($(this).val()) || 0;
        var unitId = $roomWidget.data('unit-id');
        var totalGuests = adults + children;
        
        // Update legacy guests dropdown if exists
        if ($('.gas-guests').length) {
            $('.gas-guests').val(totalGuests);
        }
        
        if (checkin && checkout && new Date(checkout) > new Date(checkin)) {
            calculatePrice(unitId, checkin, checkout, totalGuests, adults, children);
        }
    });
    
    // Legacy guests dropdown change handler
    $(document).on('change', '.gas-guests', function() {
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        var guests = $(this).val();
        var unitId = $roomWidget.data('unit-id');
        
        if (checkin && checkout && new Date(checkout) > new Date(checkin)) {
            calculatePrice(unitId, checkin, checkout, guests);
        }
    });
    
    function calculatePrice(unitId, checkin, checkout, guests, adults, children) {
        var $btn = $('.gas-book-btn');
        $btn.prop('disabled', true).text(t('booking', 'checking_availability', 'Checking availability...'));
        
        // Get selected upsells
        var selectedUpsells = [];
        $('.gas-upsell-item.selected').each(function() {
            selectedUpsells.push({
                id: $(this).data('upsell-id'),
                quantity: parseInt($(this).find('.gas-upsell-qty-value').text()) || 1
            });
        });
        
        // Get voucher code if applied
        var voucherCode = $roomWidget.data('voucher-code') || '';
        
        // Get selected rate type (standard or offer)
        var selectedRate = $roomWidget.data('selected-rate') || 'standard';
        
        // Parse adults and children - fallback to guests for backwards compatibility
        var numAdults = parseInt(adults) || parseInt($('.gas-adults').val()) || parseInt(guests) || 2;
        var numChildren = parseInt(children) || parseInt($('.gas-children').val()) || 0;
        var totalGuests = numAdults + numChildren;
        
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/calculate-price',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                unit_id: unitId,
                check_in: checkin,
                check_out: checkout,
                guests: totalGuests,
                adults: numAdults,
                children: numChildren,
                upsells: selectedUpsells,
                voucher_code: voucherCode,
                rate_type: selectedRate,
                pricing_tier: gasBooking.pricingTier || 'standard',
                lang: currentLanguage
            }),
            success: function(response) {
                var currency = resolveCurrency($roomWidget.data('currency'));
                var occSettings = $roomWidget.data('occupancy-settings') || {};
                
                console.log('Calculate price response:', response);
                console.log('Offer from API:', response.offer_applied);
                console.log('Offer from banner:', $roomWidget.data('active-offer'));
                
                if (response.success && response.available) {
                    // Clear any min stay warnings
                    $('.gas-min-stay-warning').remove();
                    
                    var nights = response.nights;
                    var accommodationTotal = response.accommodation_total || 0;
                    var upsellsTotal = response.upsells_total || 0;
                    var offerDiscount = response.offer_discount || 0;
                    var voucherDiscount = response.voucher_discount || 0;
                    var grandTotal = response.grand_total || 0;
                    
                    // Calculate occupancy adjustment for display
                    var occupancyAdjustment = 0;
                    var occupancyLabel = '';
                    if (response.occupancy_adjustment) {
                        occupancyAdjustment = response.occupancy_adjustment;
                        occupancyLabel = response.occupancy_label || 'Guest adjustment';
                    }
                    
                    // Header = pure accommodation (matches the Pricing Grid
                    // standard rate × nights). Cleaning fee + extras are
                    // shown as separate line items in the breakdown.
                    $('.gas-price-amount').text(formatPriceShort(accommodationTotal, currency));
                    $('.gas-price-period').text(nights + ' ' + (nights > 1 ? t('booking', 'nights', 'nights') : t('booking', 'night', 'night')));
                    
                    // Show occupancy adjustment note if applicable
                    if (occupancyAdjustment !== 0) {
                        var adjText = occupancyAdjustment > 0 
                            ? '+' + formatPrice(occupancyAdjustment, currency) + ' for ' + numAdults + ' adult' + (numAdults > 1 ? 's' : '') + (numChildren > 0 ? ' + ' + numChildren + ' child' + (numChildren > 1 ? 'ren' : '') : '')
                            : formatPrice(Math.abs(occupancyAdjustment), currency) + ' single occupancy discount';
                        $('.gas-adjustment-text').text(adjText);
                        $('.gas-occupancy-adjustment').show();
                    } else {
                        $('.gas-occupancy-adjustment').hide();
                    }
                    
                    // Use offer from API response OR from the banner (already loaded)
                    var activeOffer = response.offer_applied || $roomWidget.data('active-offer');
                    
                    // Store pricing data
                    $roomWidget.data('pricing', {
                        nights: nights,
                        accommodationTotal: accommodationTotal,
                        currency: currency,
                        offer: activeOffer,
                        adults: numAdults,
                        children: numChildren,
                        occupancyAdjustment: occupancyAdjustment
                    });
                    
                    // Build rate options if offer exists AND it's not a non-standard tier (corporate/agent)
                    // For non-standard tiers, the adjusted price IS the price - no rate options needed
                    var hideDiscountBadge = activeOffer && activeOffer.hide_discount_badge;
                    
                    var allOffers = response.all_offers || [];
                    var cmTotal = response.cm_total || accommodationTotal;
                    // Standard Rate extras (rate-plan-derived, applied to
                    // the Standard card so guests over base_occupancy pay
                    // the surcharge even without picking an offer).
                    var stdExtras = parseFloat(response.standard_rate_extras_total) || 0;
                    if (stdExtras > 0) accommodationTotal = accommodationTotal + stdExtras;
                    // Operator-customised Standard Rate labels (property-level).
                    // Plugin renders these on the Standard Rate card; falls
                    // back to "Standard Rate" + "✓ Free cancellation" when unset.
                    var stdRateLabels = {
                        name: response.standard_rate_name || null,
                        description: response.standard_rate_description || null,
                        features: Array.isArray(response.standard_rate_features) ? response.standard_rate_features : null
                    };
                    if (allOffers.length > 0 && !hideDiscountBadge) {
                        renderRateOptions(nights, accommodationTotal, allOffers, currency, cmTotal, stdRateLabels);
                    } else if (activeOffer && !hideDiscountBadge) {
                        renderRateOptions(nights, accommodationTotal, [activeOffer], currency, cmTotal, stdRateLabels);
                    } else {
                        // No offer OR non-standard tier - hide rate options, show simple breakdown
                        $('.gas-rate-options').hide();
                        showSimplePricing(nights, accommodationTotal, upsellsTotal, voucherDiscount, grandTotal, currency, occupancyAdjustment, occupancyLabel);
                    }
                    
                    // Update button based on selected rate
                    updateBookingButton(currency);
                    
                    $roomWidget.data('price-details', response);
                } else if (response.min_stay_required) {
                    // MIN STAY NOT MET — instead of a dead-end warning, offer
                    // the guest a way to enquire about a shorter stay. Many
                    // operators (hostel buyouts, big lodges) will still take a
                    // 1-nighter when there's a gap because the setup cost is
                    // the same; the rate plan just defaults to a higher minimum.
                    $('.gas-price-breakdown').hide();
                    $('.gas-rate-options').hide();
                    $('.gas-occupancy-adjustment').hide();

                    var nightsWord = response.min_stay_required > 1 ? t('booking', 'nights', 'nights') : t('booking', 'night', 'night');
                    var selectedWord = response.nights_selected > 1 ? t('booking', 'nights', 'nights') : t('booking', 'night', 'night');
                    var minStayHtml = '<div class="gas-min-stay-warning" style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; text-align: center;">';
                    minStayHtml += '<div style="font-weight: 600; color: #92400e; margin-bottom: 0.25rem;">⚠️ ' + t('booking', 'minimum', 'Minimum') + ' ' + response.min_stay_required + ' ' + nightsWord + ' ' + t('booking', 'required', 'required') + '</div>';
                    minStayHtml += '<div style="font-size: 0.85rem; color: #78350f; margin-bottom: 0.75rem;">' + t('booking', 'you_selected', 'You selected') + ' ' + response.nights_selected + ' ' + selectedWord + '. ' + t('booking', 'short_stay_enquire_lede', 'We can ask the host whether they\'ll accept a shorter stay.') + '</div>';
                    minStayHtml += '<button type="button" class="gas-short-stay-enquire-btn" style="background:#f59e0b; color:#fff; border:none; padding:0.6rem 1.2rem; border-radius:6px; cursor:pointer; font-weight:600;">' + t('booking', 'short_stay_enquire_cta', 'Enquire about a ' + response.nights_selected + '-' + selectedWord + ' stay') + '</button>';
                    minStayHtml += '</div>';

                    if ($('.gas-min-stay-warning').length) {
                        $('.gas-min-stay-warning').replaceWith(minStayHtml);
                    } else {
                        $('.gas-price-breakdown').before(minStayHtml);
                    }

                    $btn.prop('disabled', true).text(t('booking', 'minimum', 'Minimum') + ' ' + response.min_stay_required + ' ' + nightsWord + ' ' + t('booking', 'required', 'required'));
                } else {
                    // NOT AVAILABLE - Switch to Availability tab and show unavailable price
                    $('.gas-min-stay-warning').remove();
                    $('.gas-tab-btn').removeClass('active');
                    $('.gas-tab-btn[data-tab="availability"]').addClass('active');
                    $('.gas-tab-content').removeClass('active');
                    $('.gas-tab-content[data-tab="availability"]').addClass('active');
                    
                    // Not available — show dash, hide pricing, disable button
                    $('.gas-price-amount').text('—');
                    $('.gas-price-period').text(t('booking', 'price_per_night', '/ night'));

                    $('.gas-price-breakdown').hide();
                    $('.gas-rate-options').hide();
                    $('.gas-occupancy-adjustment').hide();
                    $btn.prop('disabled', true).text(t('booking', 'select_dates_to_check', 'Select dates to check availability'));
                }
            },
            error: function() {
                $btn.prop('disabled', true).text(t('booking', 'error_checking', 'Error checking availability'));
            }
        });
    }
    
    // Render rate options (Standard vs Offer)
    // stdRateLabels (optional): { name, description, features[] } — operator
    // overrides for the Standard Rate card. Falls back to defaults when unset.
    function renderRateOptions(nights, standardTotal, offers, currency, cmTotal, stdRateLabels) {
        var perNightStandard = Math.round(standardTotal / nights);

        // Ensure offers is an array
        if (!Array.isArray(offers)) offers = [offers];

        // Check if any offer replaces standard rate
        var anyReplacesStandard = offers.some(function(o) { return o.replaces_standard; });

        // Resolve Standard Rate labels — operator values win.
        // Name falls back to "Standard Rate" (generic, safe). Features have
        // NO default — the previous hardcoded "✓ Free cancellation" was
        // misleading for any operator who doesn't actually offer free
        // cancellation, so we now render nothing unless the operator sets
        // features explicitly in admin.
        var stdName = (stdRateLabels && stdRateLabels.name) || 'Standard Rate';
        var stdDesc = (stdRateLabels && stdRateLabels.description) || '';
        var stdFeatures = (stdRateLabels && Array.isArray(stdRateLabels.features) && stdRateLabels.features.length)
            ? stdRateLabels.features
            : [];

        var html = '<div class="gas-rate-options">';
        html += '<div class="gas-rate-options-title">' + t('booking', 'choose_rate', 'Choose your rate') + ':</div>';

        // Standard Rate — hide if any offer replaces it
        if (!anyReplacesStandard) {
            html += '<div class="gas-rate-option selected" data-rate="standard" data-offer-id="">';
            html += '<div class="gas-rate-radio"><div class="gas-rate-radio-inner"></div></div>';
            html += '<div class="gas-rate-details">';
            html += '<div class="gas-rate-name">' + escapeHtml(stdName) + '</div>';
            if (stdFeatures.length) {
                html += '<div class="gas-rate-features">';
                stdFeatures.forEach(function(f) {
                    html += '<span class="gas-rate-feature">' + escapeHtml(f) + '</span>';
                });
                html += '</div>';
            }
            if (stdDesc) {
                html += '<div class="gas-rate-features" style="margin-top:0.25rem;"><span class="gas-rate-feature" style="color:#64748b;font-size:0.8rem;">' + escapeHtml(stdDesc) + '</span></div>';
            }
            html += '</div>';
            html += '<div class="gas-rate-price">';
            html += '<div class="gas-rate-total">' + formatPrice(standardTotal, currency) + '</div>';
            html += '<div class="gas-rate-per-night">' + formatPriceShort(perNightStandard, currency) + '/night</div>';
            html += '</div>';
            html += '</div>';
        }

        // Each offer as a selectable rate
        var firstOffer = true;
        var autoSelectedOfferTotal = null;
        var autoSelectedOfferIdx = null;
        offers.forEach(function(offer, idx) {
            var discountAmount = 0;
            var baseTotal = (offer.replaces_standard && cmTotal) ? cmTotal : standardTotal;
            if (offer.discount_type === 'percentage') {
                discountAmount = baseTotal * (parseFloat(offer.discount_value) / 100);
            } else {
                discountAmount = parseFloat(offer.discount_value) || 0;
            }
            var offerTotal = baseTotal - discountAmount;
            // Beds24 V2 priceRules carry their adjustment as
            // offset_multiplier (e.g. 0.93 = -7%, 1.12 = +12%). When the
            // offer has no daily_prices map and no explicit discount_value,
            // apply the offset so length-of-stay rate plans (7+ days,
            // 28+ days, 3+ Months) actually show different prices.
            var offMult = parseFloat(offer.offset_multiplier);
            if (!isNaN(offMult) && offMult > 0 && offMult !== 1 && parseFloat(offer.discount_value) === 0) {
                offerTotal = baseTotal * offMult;
                discountAmount = baseTotal - offerTotal;
            }
            // R5b: if the server attached a rate_plan_total (CM-imported
            // per-rate-plan price for the selected dates), use THAT — it's
            // the authoritative Beds24 per-slot price, not a derived %.
            if (offer.rate_plan_total != null) {
                offerTotal = parseFloat(offer.rate_plan_total);
            }
            // Extras surcharge (extra adult / child × nights). Server
            // computes against base_occupancy and emits this alongside
            // the offer; we add it on top of the discounted accommodation.
            var extraSurcharge = parseFloat(offer.rate_plan_extra_person_total);
            if (!isNaN(extraSurcharge) && extraSurcharge > 0) {
                offerTotal = offerTotal + extraSurcharge;
            }
            var perNightOffer = Math.round(offerTotal / nights);
            var savingsPercent = Math.round((discountAmount / standardTotal) * 100);
            var showBadge = !offer.replaces_standard && !offer.hide_discount_badge && savingsPercent > 0;

            // If standard is hidden, auto-select first offer
            var isSelected = anyReplacesStandard && firstOffer;
            if (isSelected) {
                firstOffer = false;
                autoSelectedOfferTotal = offerTotal;
                autoSelectedOfferIdx = idx;
            }

            html += '<div class="gas-rate-option' + (isSelected ? ' selected' : '') + '" data-rate="offer-' + idx + '" data-offer-id="' + (offer.id || '') + '" data-offer-name="' + (offer.name || '').replace(/"/g, '&quot;') + '" data-offer-discount-type="' + (offer.discount_type || '') + '" data-offer-discount-value="' + (offer.discount_value || '') + '" data-offer-total="' + offerTotal + '" data-offer-is-cm-import="' + (offer.source === 'cm-import') + '">';
            html += '<div class="gas-rate-radio"><div class="gas-rate-radio-inner"></div></div>';
            html += '<div class="gas-rate-details">';
            html += '<div class="gas-rate-name">' + (offer.name || 'Special Offer');
            if (showBadge) html += ' <span class="gas-rate-badge">Save ' + savingsPercent + '%</span>';
            html += '</div>';
            html += '<div class="gas-rate-features">';
            if (offer.description) html += '<span class="gas-rate-feature" style="color:#64748b;font-size:0.8rem;">' + offer.description + '</span>';
            html += '</div>';
            html += '</div>';
            html += '<div class="gas-rate-price">';
            // R5b: hide the per-night number for any CM-imported rate plan —
            // they pull from PriceLabs / daily Beds24 rates so a single
            // /night figure is misleading. Total for the stay is enough.
            var hidePerNight = offer.source === 'cm-import';
            html += '<div class="gas-rate-total">' + formatPrice(offerTotal, currency) + '</div>';
            if (!hidePerNight) {
                if (showBadge) {
                    html += '<div class="gas-rate-per-night"><s>' + formatPriceShort(perNightStandard, currency) + '</s> ' + formatPriceShort(perNightOffer, currency) + '/night</div>';
                } else {
                    html += '<div class="gas-rate-per-night">' + formatPriceShort(perNightOffer, currency) + '/night</div>';
                }
            }
            html += '</div>';
            html += '</div>';
        });

        html += '</div>';

        // Replace or insert rate options
        if ($('.gas-rate-options').length) {
            $('.gas-rate-options').replaceWith(html);
        } else {
            $('.gas-guest-fields').after(html);
        }

        // Store totals for later — default to standard
        $roomWidget.data('standard-total', standardTotal);
        $roomWidget.data('all-offers', offers);

        // When a CM offer auto-replaces the standard rate card, the first
        // offer is rendered with the .selected class — keep the data
        // attributes + header price in sync so the user sees the same
        // figure that the visibly-selected card shows.
        if (autoSelectedOfferTotal != null) {
            $roomWidget.data('offer-total', autoSelectedOfferTotal);
            $roomWidget.data('selected-rate', 'offer-' + autoSelectedOfferIdx);
            $roomWidget.data('total-price', autoSelectedOfferTotal);
            $('.gas-total-price').text(formatPrice(autoSelectedOfferTotal, currency));
        } else {
            $roomWidget.data('offer-total', standardTotal); // Will update when offer selected
            $roomWidget.data('selected-rate', 'standard'); // Default to standard rate
        }

        // Hide old price breakdown when showing rate options
        $('.gas-price-breakdown').hide();
    }
    
    // Show simple pricing (no offer)
    function showSimplePricing(nights, accommodationTotal, upsellsTotal, voucherDiscount, grandTotal, currency, occupancyAdjustment, occupancyLabel) {
        var nightWord = nights > 1 ? t('booking', 'nights', 'nights') : t('booking', 'night', 'night');

        // accommodationTotal from server already INCLUDES the occupancy
        // adjustment (e.g. £205 base + £15 extra-guest = £220). For the
        // breakdown display we strip it back out so the user sees:
        //   Accommodation £205
        //   Extra guest    +£15
        //   Total          £220
        // — the math visibly adds up instead of looking like a missing total.
        var baseAccommodation = accommodationTotal - (occupancyAdjustment || 0);

        $('.gas-nights-text').text(t('booking', 'accommodation', 'Accommodation') + ' (' + nights + ' ' + nightWord + ')');
        $('.gas-nights-price').text(formatPrice(baseAccommodation, currency));

        // Show occupancy adjustment row if applicable
        if (occupancyAdjustment && occupancyAdjustment !== 0) {
            $('.gas-occupancy-row').show();
            $('.gas-occupancy-label').text(occupancyLabel || t('booking', 'guest_adjustment', 'Guest adjustment'));
            if (occupancyAdjustment > 0) {
                $('.gas-occupancy-amount').text('+' + formatPrice(occupancyAdjustment, currency));
            } else {
                $('.gas-occupancy-amount').text('-' + formatPrice(Math.abs(occupancyAdjustment), currency));
            }
        } else {
            $('.gas-occupancy-row').hide();
        }
        
        // Don't show extras on the room widget. Pricing grid is the
        // source of truth for what the headline price represents —
        // accommodation only. Cleaning Fee + optional extras are added
        // as separate line items at checkout step 2.
        $('.gas-upsells-row').hide();
        
        $('.gas-offer-row').hide();
        
        if (voucherDiscount > 0) {
            $('.gas-voucher-row').show();
            $('.gas-voucher-amount').text('-' + formatPrice(voucherDiscount, currency));
        } else {
            $('.gas-voucher-row').hide();
        }
        
        // Widget total = accommodation only (matches the pricing grid).
        // Cleaning fee + optional extras + tax are added at checkout
        // step 2 where the guest sees the full breakdown.
        var widgetTotal = accommodationTotal - voucherDiscount;
        $('.gas-total-price').text(formatPrice(widgetTotal, currency));
        $('.gas-price-breakdown').show();

        $roomWidget.data('total-price', widgetTotal);
        $roomWidget.data('standard-total', widgetTotal); // Also set standard-total for button
    }
    
    // Update booking button based on selected rate
    function updateBookingButton(currency) {
        var $btn = $('.gas-book-btn');
        var selectedRate = $roomWidget.data('selected-rate') || 'standard';
        var total;

        if (selectedRate === 'standard') {
            total = $roomWidget.data('standard-total');
        } else {
            // Get total from the selected offer option's data attribute
            var $selectedOption = $('.gas-rate-option.selected');
            var offerTotal = $selectedOption.data('offer-total');
            total = offerTotal || $roomWidget.data('standard-total');
        }
        
        // Add upsells
        var upsellsTotal = 0;
        $('.gas-upsell-item.selected').each(function() {
            // Would need to recalculate based on upsell data
        });
        
        $roomWidget.data('total-price', total);
        $btn.prop('disabled', false).text(t('booking', 'book_now', 'Book Now') + ' - ' + formatPrice(total, currency));
        $('.gas-add-to-cart-btn').prop('disabled', false);
    }
    
    // Short-stay enquiry — opens a modal so the guest can ask the host
    // whether they'll accept the under-min stay. Submits to a server
    // endpoint that emails the operator + master.
    $(document).on('click', '.gas-short-stay-enquire-btn', function() {
        var unitId = $roomWidget.data('unit-id');
        var checkin = $('.gas-checkin').val() || ($('.gas-checkin')[0] && $('.gas-checkin')[0]._flatpickr && $('.gas-checkin')[0]._flatpickr.input.value) || '';
        var checkout = $('.gas-checkout').val() || ($('.gas-checkout')[0] && $('.gas-checkout')[0]._flatpickr && $('.gas-checkout')[0]._flatpickr.input.value) || '';
        var adults = parseInt($('.gas-adults').val()) || 1;
        var children = parseInt($('.gas-children').val()) || 0;
        var modalHtml = '<div class="gas-short-stay-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;">'
          + '  <div style="background:#fff;border-radius:12px;max-width:480px;width:100%;padding:1.75rem;box-shadow:0 20px 50px rgba(0,0,0,0.3);">'
          + '    <h3 style="margin:0 0 0.5rem 0;color:#111827;">Enquire about a shorter stay</h3>'
          + '    <p style="margin:0 0 1rem 0;color:#4b5563;font-size:0.9rem;">We\'ll forward your request to the host. They\'ll get back to you within 24 hours.</p>'
          + '    <div style="margin-bottom:0.75rem;"><label style="display:block;font-size:0.85rem;color:#374151;margin-bottom:0.25rem;">Your name</label><input type="text" class="gas-ss-name" style="width:100%;padding:0.55rem;border:1px solid #d1d5db;border-radius:6px;"></div>'
          + '    <div style="margin-bottom:0.75rem;"><label style="display:block;font-size:0.85rem;color:#374151;margin-bottom:0.25rem;">Email</label><input type="email" class="gas-ss-email" style="width:100%;padding:0.55rem;border:1px solid #d1d5db;border-radius:6px;"></div>'
          + '    <div style="margin-bottom:0.75rem;"><label style="display:block;font-size:0.85rem;color:#374151;margin-bottom:0.25rem;">Phone (optional)</label><input type="tel" class="gas-ss-phone" style="width:100%;padding:0.55rem;border:1px solid #d1d5db;border-radius:6px;"></div>'
          + '    <div style="margin-bottom:1rem;"><label style="display:block;font-size:0.85rem;color:#374151;margin-bottom:0.25rem;">Message (optional)</label><textarea class="gas-ss-message" rows="3" style="width:100%;padding:0.55rem;border:1px solid #d1d5db;border-radius:6px;resize:vertical;" placeholder="Anything the host should know about your trip?"></textarea></div>'
          + '    <div style="display:flex;gap:0.75rem;justify-content:flex-end;">'
          + '      <button type="button" class="gas-ss-cancel" style="background:#e5e7eb;color:#374151;border:none;padding:0.6rem 1.1rem;border-radius:6px;cursor:pointer;font-weight:600;">Cancel</button>'
          + '      <button type="button" class="gas-ss-submit" style="background:#f59e0b;color:#fff;border:none;padding:0.6rem 1.1rem;border-radius:6px;cursor:pointer;font-weight:600;">Send enquiry</button>'
          + '    </div>'
          + '  </div>'
          + '</div>';
        $('body').append(modalHtml);
        var $modal = $('.gas-short-stay-modal');
        // Prefill email if guest is logged in to GAS (rare on public widget)
        $modal.on('click', '.gas-ss-cancel', function(){ $modal.remove(); });
        $modal.on('click', '.gas-ss-submit', function(){
            var $sub = $modal.find('.gas-ss-submit');
            var name = $modal.find('.gas-ss-name').val().trim();
            var email = $modal.find('.gas-ss-email').val().trim();
            var phone = $modal.find('.gas-ss-phone').val().trim();
            var msg = $modal.find('.gas-ss-message').val().trim();
            if (!name || !email) { alert('Name and email required'); return; }
            $sub.prop('disabled', true).text('Sending…');
            $.ajax({
                url: gasBooking.apiUrl + '/api/public/short-stay-enquiry',
                method: 'POST', contentType: 'application/json',
                data: JSON.stringify({
                    client_id: gasBooking.clientId, unit_id: unitId,
                    check_in: checkin, check_out: checkout,
                    adults: adults, children: children,
                    guest_name: name, guest_email: email, guest_phone: phone, message: msg
                }),
                success: function(r) {
                    if (r && r.success) {
                        $modal.find('div[style*="background:#fff"]').html('<h3 style="margin:0 0 0.5rem 0;color:#065f46;">✓ Enquiry sent</h3><p style="margin:0 0 1rem 0;color:#4b5563;">Thanks — we\'ve forwarded your request to the host. They\'ll be in touch within 24 hours.</p><div style="text-align:right;"><button type="button" class="gas-ss-cancel" style="background:#10b981;color:#fff;border:none;padding:0.6rem 1.1rem;border-radius:6px;cursor:pointer;font-weight:600;">Close</button></div>');
                    } else {
                        alert((r && r.error) || 'Unable to send right now — please email the host directly.');
                        $sub.prop('disabled', false).text('Send enquiry');
                    }
                },
                error: function() {
                    alert('Network error — please try again.');
                    $sub.prop('disabled', false).text('Send enquiry');
                }
            });
        });
    });

    // Rate option click handler
    $(document).on('click', '.gas-rate-option', function() {
        $('.gas-rate-option').removeClass('selected');
        $(this).addClass('selected');

        var rate = $(this).data('rate');
        $roomWidget.data('selected-rate', rate);

        // Store selected offer details for checkout
        var offerId = $(this).data('offer-id');
        var offerName = $(this).data('offer-name');
        var offerTotal = $(this).data('offer-total');
        var offerIsCmImport = $(this).data('offer-is-cm-import') === true || $(this).data('offer-is-cm-import') === 'true';
        if (offerId) {
            $roomWidget.data('active-offer', {
                id: offerId,
                name: offerName,
                discount_type: $(this).data('offer-discount-type'),
                discount_value: $(this).data('offer-discount-value')
            });
            $roomWidget.data('offer-total', offerTotal);
        } else {
            $roomWidget.data('active-offer', null);
            $roomWidget.data('offer-total', $roomWidget.data('standard-total'));
        }

        // R5b: for CM-imported rate plans, the offer's total IS the room's
        // total (no separate discount line). Sync the big header price so
        // it reflects the picked rate. Manual offers stay on the old
        // behaviour where the header shows the base accommodation and
        // the discount appears as a separate row.
        var currency = resolveCurrency($roomWidget.data('currency'));
        if (offerIsCmImport && offerTotal) {
            $('.gas-total-price').text(formatPrice(parseFloat(offerTotal), currency));
            $roomWidget.data('total-price', parseFloat(offerTotal));
        } else if (!offerId) {
            // Standard picked — restore the base accommodation total.
            var stdTotal = $roomWidget.data('standard-total');
            if (stdTotal != null) {
                $('.gas-total-price').text(formatPrice(parseFloat(stdTotal), currency));
                $roomWidget.data('total-price', parseFloat(stdTotal));
            }
        }
        updateBookingButton(currency);
    });
    
    // Load and display offers
    function loadOffers(unitId, checkin, checkout, guests) {
        if (!gasBooking.clientId) return;

        var params = '?unit_id=' + unitId;
        if (checkin) params += '&check_in=' + checkin;
        if (checkout) params += '&check_out=' + checkout;
        if (guests) params += '&guests=' + guests;
        // Bust any browser/edge cache so operator visibility toggles
        // surface on the very next page load. Pairs with no-store
        // headers on /api/public/client/:id/offers.
        params += '&_ts=' + Date.now();

        $.ajax({
            url: gasBooking.apiUrl + '/api/public/client/' + gasBooking.clientId + '/offers' + params,
            method: 'GET',
            cache: false,
            dataType: 'json',
            success: function(response) {
                if (response.success && response.offers && response.offers.length > 0) {
                    // Show generic banner (specific offer shown in rate options)
                    $('.gas-offers-banner').show();

                    // Store offers for rate selection
                    $roomWidget.data('available-offers', response.offers);
                    // Do NOT auto-select the first offer. Standard rate is the
                    // page-load default (rate card has .selected class). The
                    // user explicitly picks an offer by clicking its card.
                    // Cotswolds 2026-06-08: auto-selecting offers[0] meant
                    // bookings inherited "Non Cancellable" silently when the
                    // user thought they had Standard. URL carried offer_id,
                    // checkout applied it, refund_policy wrong.
                    $roomWidget.data('active-offer', null);
                } else {
                    $('.gas-offers-banner').hide();
                    $roomWidget.data('available-offers', []);
                    $roomWidget.data('active-offer', null);
                }
            }
        });
    }
    
    // Load and display upsells
    function loadUpsells(unitId) {
        if (!gasBooking.clientId) return;
        
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/client/' + gasBooking.clientId + '/upsells?unit_id=' + unitId + '&lang=' + currentLanguage,
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.upsells && response.upsells.length > 0) {
                    renderUpsells(response.upsells_by_category || {}, response.upsells);
                    $('.gas-upsells-section').show();
                } else {
                    $('.gas-upsells-section').hide();
                }
            }
        });
    }
    
    // Render upsells list
    function renderUpsells(byCategory, allUpsells) {
        var currency = resolveCurrency($roomWidget.data('currency'));
        var html = '';
        
        // If we have categories, group them
        if (Object.keys(byCategory).length > 0) {
            for (var category in byCategory) {
                html += '<div class="gas-upsell-category">' + category + '</div>';
                byCategory[category].forEach(function(upsell) {
                    html += renderUpsellItem(upsell, currency);
                });
            }
        } else {
            // No categories, just list all
            allUpsells.forEach(function(upsell) {
                html += renderUpsellItem(upsell, currency);
            });
        }
        
        $('.gas-upsells-list').html(html);
    }
    
    function renderUpsellItem(upsell, currency) {
        var priceCardHtml = upsellPriceCardHtml(upsell, currency, formatPriceShort);

        // Multi-quantity items (e.g. Pet fee, Extra bed) render a stepper:
        // tap card → +1 (cap at max_quantity); small "–" corner button → -1.
        // Single-quantity items keep the existing checkbox toggle.
        var maxQty = parseInt(upsell.max_quantity, 10) || 1;
        var qtyAware = maxQty > 1;

        var qtyControls = '';
        if (qtyAware) {
            qtyControls =
                '<button type="button" class="gas-upsell-qty-minus" aria-label="Remove one" title="Remove one">−</button>' +
                '<span class="gas-upsell-qty-badge">×&nbsp;<span class="gas-upsell-qty-value">0</span></span>';
        } else {
            // Hidden qty value so calculatePrice still reads "1" when selected.
            qtyControls = '<span class="gas-upsell-qty-value" style="display:none;">0</span>';
        }

        return '<div class="gas-upsell-item' + (qtyAware ? ' gas-upsell-qty-aware' : '') + '" data-upsell-id="' + upsell.id + '" data-max-quantity="' + maxQty + '">' +
            '<div class="gas-upsell-checkbox"></div>' +
            '<div class="gas-upsell-info">' +
                '<div class="gas-upsell-name">' + upsell.name + (qtyAware ? ' <small style="color:#64748b;font-weight:400;">(up to ' + maxQty + ')</small>' : '') + '</div>' +
                (upsell.description ? '<div class="gas-upsell-description">' + upsell.description + '</div>' : '') +
            '</div>' +
            '<div class="gas-upsell-price">' + priceCardHtml + '</div>' +
            qtyControls +
        '</div>';
    }

    // Helper: read/write qty on a card and trigger price recalc.
    function _gasSetUpsellQty($card, newQty) {
        var maxQty = parseInt($card.attr('data-max-quantity'), 10) || 1;
        if (newQty < 0) newQty = 0;
        if (newQty > maxQty) newQty = maxQty;
        $card.find('.gas-upsell-qty-value').text(newQty);
        $card.toggleClass('selected', newQty > 0);
        $card.toggleClass('gas-upsell-qty-max', newQty >= maxQty && maxQty > 1);

        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        var unitId = $roomWidget.data('unit-id');
        if (checkin && checkout && unitId) {
            var adults = $('.gas-adults').val() || $('.gas-guests').val();
            var children = $('.gas-children').val() || 0;
            calculatePrice(unitId, checkin, checkout, null, adults, children);
        }
    }

    // Upsell card click — increments qty (qty-aware) or toggles (single-qty).
    // Skip when the click originated on the minus button (handled separately).
    $(document).on('click', '.gas-upsell-item', function(e) {
        if ($(e.target).closest('.gas-upsell-qty-minus').length) return;
        var $card = $(this);
        var current = parseInt($card.find('.gas-upsell-qty-value').text(), 10) || 0;
        var maxQty = parseInt($card.attr('data-max-quantity'), 10) || 1;
        if (maxQty > 1) {
            // Stepper: +1 each tap, capped at max
            _gasSetUpsellQty($card, current + 1);
        } else {
            // Toggle: 0 ↔ 1
            _gasSetUpsellQty($card, current ? 0 : 1);
        }
    });

    // Minus button — decrement by 1.
    $(document).on('click', '.gas-upsell-qty-minus', function(e) {
        e.stopPropagation();
        var $card = $(this).closest('.gas-upsell-item');
        var current = parseInt($card.find('.gas-upsell-qty-value').text(), 10) || 0;
        _gasSetUpsellQty($card, current - 1);
    });
    
    // Voucher toggle
    $(document).on('click', '.gas-voucher-toggle', function() {
        $('.gas-voucher-input').slideToggle();
    });
    
    // Voucher apply
    $(document).on('click', '.gas-voucher-apply', function() {
        var code = $('.gas-voucher-code').val().trim().toUpperCase();
        if (!code) return;
        
        var $btn = $(this);
        $btn.prop('disabled', true).text(t('booking', 'checking', 'Checking...'));
        
        $.ajax({
            url: gasBooking.apiUrl + '/api/public/validate-voucher',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                code: code,
                unit_id: $roomWidget.data('unit-id'),
                check_in: $('.gas-checkin').val(),
                check_out: $('.gas-checkout').val(),
                lang: currentLanguage
            }),
            success: function(response) {
                $btn.prop('disabled', false).text(t('common', 'apply', 'Apply'));
                
                if (response.success && response.valid) {
                    // Store voucher
                    $roomWidget.data('voucher-code', code);

                    // Show applied state. Gift certs surface their balance so the guest
                    // sees what's in the wallet before the price recalc lands.
                    $('.gas-voucher-input').hide();
                    $('.gas-voucher-toggle').hide();
                    var label = '✓ ' + response.voucher.name + ' (' + code + ')';
                    if (response.voucher.voucher_type === 'gift_certificate' && response.voucher.current_balance != null) {
                        var balCurr = response.voucher.currency || (typeof currency !== 'undefined' ? currency : '');
                        label += ' — balance ' + (balCurr ? balCurr + ' ' : '') + parseFloat(response.voucher.current_balance).toFixed(2);
                    }
                    $('.gas-voucher-name').text(label);
                    $('.gas-voucher-applied').show();

                    // Recalculate price
                    var checkin = $('.gas-checkin').val();
                    var checkout = $('.gas-checkout').val();
                    if (checkin && checkout) {
                        var adults = $('.gas-adults').val() || $('.gas-guests').val();
                        var children = $('.gas-children').val() || 0;
                        calculatePrice($roomWidget.data('unit-id'), checkin, checkout, null, adults, children);
                    }
                } else {
                    alert(response.error || 'Invalid voucher code');
                }
            },
            error: function() {
                $btn.prop('disabled', false).text(t('common', 'apply', 'Apply'));
                alert(t('booking', 'error_validating_voucher', 'Error validating voucher'));
            }
        });
    });
    
    // Voucher remove
    $(document).on('click', '.gas-voucher-remove', function() {
        $roomWidget.data('voucher-code', '');
        $('.gas-voucher-applied').hide();
        $('.gas-voucher-toggle').show();
        $('.gas-voucher-code').val('');
        
        // Recalculate price
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        if (checkin && checkout) {
            var adults = $('.gas-adults').val() || $('.gas-guests').val();
            var children = $('.gas-children').val() || 0;
            calculatePrice($roomWidget.data('unit-id'), checkin, checkout, null, adults, children);
        }
    });
    
    function calculateNights(checkin, checkout) {
        var start = new Date(checkin);
        var end = new Date(checkout);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    
    // Book button click - redirect to checkout page
    $(document).on('click', '.gas-book-btn:not(:disabled)', function() {
        var unitId = $roomWidget.data('unit-id');
        var propertyId = $roomWidget.data('property-id');
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        var rateType = $roomWidget.data('selected-rate') || 'standard';
        var activeOffer = $roomWidget.data('active-offer'); // {id, name, ...} when an offer is selected

        // Get adults and children from new dropdowns
        var numAdults = parseInt($('.gas-adults').val()) || parseInt($('.gas-guests').val()) || 2;
        var numChildren = parseInt($('.gas-children').val()) || 0;
        var totalGuests = numAdults + numChildren;

        // Build checkout URL - check if URL already has query params
        var checkoutUrl = gasBooking.checkoutUrl || '/checkout/';
        var separator = checkoutUrl.indexOf('?') === -1 ? '?' : '&';
        checkoutUrl += separator + 'room=' + unitId;
        checkoutUrl += '&checkin=' + checkin;
        checkoutUrl += '&checkout=' + checkout;
        checkoutUrl += '&guests=' + totalGuests;
        checkoutUrl += '&adults=' + numAdults;
        checkoutUrl += '&children=' + numChildren;
        checkoutUrl += '&rate=' + rateType;
        // Pass the actual offer ID so checkout can show the right name + refund policy.
        // The positional rate=offer-N alone is fragile (depends on offer list ordering).
        if (activeOffer && activeOffer.id) {
            checkoutUrl += '&offer_id=' + encodeURIComponent(activeOffer.id);
        }
        var roomCurrency = $roomWidget.data('currency') || '';
        if (roomCurrency) {
            checkoutUrl += '&currency=' + encodeURIComponent(roomCurrency);
        }
        if (propertyId) {
            checkoutUrl += '&property=' + propertyId;
        }

        // Redirect to checkout
        window.location.href = checkoutUrl;
    });
    
    // Add to Cart button click
    $(document).on('click', '.gas-add-to-cart-btn:not(:disabled)', function() {
        var checkin = $('.gas-checkin').val();
        var checkout = $('.gas-checkout').val();
        
        // Get adults and children from new dropdowns, fall back to legacy guests
        var numAdults = parseInt($('.gas-adults').val()) || parseInt($('.gas-guests').val()) || 2;
        var numChildren = parseInt($('.gas-children').val()) || 0;
        var totalGuests = numAdults + numChildren;
        
        if (!checkin || !checkout) {
            alert('Please select dates first.');
            return;
        }
        
        var checkinDate = new Date(checkin);
        var checkoutDate = new Date(checkout);
        var nights = Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
        
        var roomData = {
            roomId: $roomWidget.data('unit-id'),
            propertyId: $roomWidget.data('property-id'),
            paymentAccountId: $roomWidget.data('payment-account-id') || null,
            name: $('.gas-room-title').text() || 'Room',
            checkin: checkin,
            checkout: checkout,
            nights: nights,
            guests: totalGuests,
            adults: numAdults,
            children: numChildren,
            totalPrice: $roomWidget.data('total-price') || 0,
            currency: resolveCurrency($roomWidget.data('currency'))
        };
        
        if (window.GASCart && window.GASCart.add(roomData)) {
            alert('Room added to cart!\n\nYou have ' + window.GASCart.items.length + ' room(s) in your cart.');
        }
    });
    
    // View Cart link click
    // View Cart link click - go straight to checkout
    $(document).on('click', '.gas-view-cart-link', function(e) {
        e.preventDefault();
        if (window.GASCart && window.GASCart.items.length > 0) {
            var checkoutUrl = (typeof gasBooking !== 'undefined' && gasBooking.checkoutUrl) ? gasBooking.checkoutUrl : '/checkout/';
            var separator = checkoutUrl.indexOf('?') === -1 ? '?' : '&';
            checkoutUrl += separator + 'group=1';
            window.location.href = checkoutUrl;
        } else {
            alert(t('booking', 'cart_empty', 'Your cart is empty.'));
        }
    });
    
    // Back link on the single-room page — returns guests to the search
    // results page they came from (typically Book Now with their dates).
    // Uses browser history when the referrer is same-origin; falls back to
    // the configured Book Now URL with cart/URL dates appended so guests
    // don't lose their search context.
    $(document).on('click', '.gas-room-back-link', function(e) {
        e.preventDefault();
        var sameOriginReferrer = false;
        try {
            sameOriginReferrer = document.referrer && (new URL(document.referrer)).host === window.location.host;
        } catch (_) { /* malformed referrer */ }
        if (sameOriginReferrer && window.history.length > 1) {
            window.history.back();
            return;
        }
        var bookNowUrl = (typeof gasBooking !== 'undefined' && gasBooking.searchResultsUrl) ? gasBooking.searchResultsUrl : '/book-now/';
        // Reuse dates from the room widget's data-* attributes if present
        var $w = $('.gas-room-widget').first();
        var checkin = $w.attr('data-checkin');
        var checkout = $w.attr('data-checkout');
        var guests = $w.attr('data-guests');
        if (checkin && checkout) {
            bookNowUrl += '?checkin=' + encodeURIComponent(checkin) + '&checkout=' + encodeURIComponent(checkout);
            if (guests) bookNowUrl += '&guests=' + encodeURIComponent(guests);
        }
        window.location.href = bookNowUrl;
    });

    // Back link click — return to the previous page the guest was on
    // (typically the specific room page they were looking at). Falls back to
    // the configured Book Now / search results URL when there's no usable
    // history (e.g. guest landed on checkout from an external link).
    $(document).on('click', '.gas-add-another-link', function(e) {
        e.preventDefault();
        var sameOriginReferrer = false;
        try {
            sameOriginReferrer = document.referrer && (new URL(document.referrer)).host === window.location.host;
        } catch (_) { /* malformed referrer */ }
        if (sameOriginReferrer && window.history.length > 1) {
            window.history.back();
            return;
        }
        // Fallback: send them to Book Now / search results with the cart dates.
        var bookNowUrl = (typeof gasBooking !== 'undefined' && gasBooking.searchResultsUrl) ? gasBooking.searchResultsUrl : '/book-now/';
        if (window.GASCart && window.GASCart.items.length > 0) {
            var cartDates = window.GASCart.items[0];
            if (cartDates.checkin && cartDates.checkout) {
                bookNowUrl += '?checkin=' + cartDates.checkin + '&checkout=' + cartDates.checkout;
                if (cartDates.guests) {
                    bookNowUrl += '&guests=' + cartDates.guests;
                }
            }
        }
        window.location.href = bookNowUrl;
    });
    
    // Clear Cart link click
    $(document).on('click', '.gas-clear-cart-link', function(e) {
        e.preventDefault();
        if (window.GASCart) {
            window.GASCart.clear();
            alert('Cart cleared.');
        }
    });
    
    // Remove individual room from cart (on checkout page)
    $(document).on('click', '.gas-remove-room-btn', function(e) {
        e.preventDefault();
        var index = parseInt($(this).data('index'));
        
        if (window.GASCart && window.GASCart.items.length > 0) {
            var roomName = window.GASCart.items[index]?.name || 'this room';
            
            if (confirm('Remove ' + roomName + ' from cart?')) {
                window.GASCart.remove(index);
                
                // If cart is now empty, redirect to book now page
                if (window.GASCart.items.length === 0) {
                    var bookNowUrl = (typeof gasBooking !== 'undefined' && gasBooking.searchResultsUrl) ? gasBooking.searchResultsUrl : '/book-now/';
                    window.location.href = bookNowUrl;
                } else {
                    // Reload page to recalculate totals
                    window.location.reload();
                }
            }
        }
    });
    
    // Booking form submit
    $(document).on('submit', '.gas-booking-form', function(e) {
        e.preventDefault();
        
        var $form = $(this);
        var $btn = $form.find('.gas-submit-btn');
        var originalText = $btn.text();
        
        $btn.prop('disabled', true).text(t('booking', 'processing', 'Processing...'));
        
        // Get adults and children from new dropdowns, fall back to legacy guests
        var numAdults = parseInt($('.gas-adults').val()) || parseInt($('.gas-guests').val()) || 2;
        var numChildren = parseInt($('.gas-children').val()) || 0;
        var totalGuests = numAdults + numChildren;
        
        var formData = {
            action: 'gas_create_booking',
            nonce: gasBooking.nonce,
            unit_id: $roomWidget.data('unit-id'),
            checkin: $('.gas-checkin').val(),
            checkout: $('.gas-checkout').val(),
            guests: totalGuests,
            adults: numAdults,
            children: numChildren,
            total_price: $roomWidget.data('total-price'),
            first_name: $form.find('[name="first_name"]').val(),
            last_name: $form.find('[name="last_name"]').val(),
            email: $form.find('[name="email"]').val(),
            phone: $form.find('[name="phone"]').val(),
            notes: $form.find('[name="notes"]').val(),
            hostvana_booking_id: localStorage.getItem('gas_hostvana_bookingId') || ''
        };

        $.ajax({
            url: gasBooking.ajaxUrl,
            method: 'POST',
            data: formData,
            success: function(response) {
                if (response.success) {
                    $('.gas-booking-card-header, .gas-booking-card-body, .gas-booking-form-section').hide();
                    $('.gas-confirmation-text').text(t('booking', 'booking_reference', 'Booking reference') + ': ' + (response.booking_id || t('common', 'confirmed', 'Confirmed')));
                    $('.gas-booking-id').text(t('booking', 'check_email', 'Check your email for confirmation details.'));
                    $('.gas-booking-confirmation').show();
                } else {
                    alert('Booking failed: ' + (response.error || 'Unknown error'));
                    $btn.prop('disabled', false).text(originalText);
                }
            },
            error: function() {
                alert(t('common', 'connection_error', 'Connection error. Please try again.'));
                $btn.prop('disabled', false).text(originalText);
            }
        });
    });
    
    // ========================================
    // Rooms Grid Functions (for Book Now page)
    // ========================================
    
    function checkAllAvailability(checkin, checkout, guests) {
        var $rooms = $('.gas-room-card, .gas-room-row');
        
        // Show fixed spinner at top of page
        $('.gas-loading-spinner').remove();
        var spinHtml2 = buildSpinnerHtml();
        if (spinHtml2) $('body').append(spinHtml2);
        var selectedGuests = parseInt(guests) || 1;
        
        $rooms.each(function() {
            var $room = $(this);
            var unitId = $room.data('room-id');
            var maxGuests = parseInt($room.data('max-guests')) || 2;
            
            // First check if room can accommodate the guests
            if (selectedGuests > maxGuests) {
                $room.removeClass('available').addClass('unavailable guest-exceeded');
                $room.find('.gas-room-price, .gas-room-row-price').html('<span class="gas-too-small">' + t('booking', 'max_guests', 'Max %s guests').replace('%s', maxGuests) + '</span>');
                $room.find('.gas-view-btn, .gas-row-view-btn').css({'background': '#9ca3af', 'pointer-events': 'none'}).text(t('booking', 'not_available', 'Not Available'));
                return; // Skip availability check
            }
            
            // Remove guest-exceeded class if previously set
            $room.removeClass('guest-exceeded');
            
            // Check date availability
            if (checkin && checkout) {
                // Show loading state - remove unavailable overlay during check
                $room.removeClass('unavailable available dates-blocked').addClass('checking');
                $room.find('.gas-room-price, .gas-room-row-price').html('<span class="gas-checking">⏳ Checking...</span>');
                $room.find('.gas-view-btn, .gas-row-view-btn').css({'background': '#6366f1', 'pointer-events': 'none'}).text(t('booking', 'checking_availability', 'Checking availability...'));
                
                // Use calculate-price for accurate pricing with tier support
                $.ajax({
                    url: gasBooking.apiUrl + '/api/public/calculate-price',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        unit_id: unitId,
                        check_in: checkin,
                        check_out: checkout,
                        guests: parseInt($('.gas-guests').val()) || 2,
                        pricing_tier: gasBooking.pricingTier || 'standard',
                        lang: currentLanguage
                    }),
                    success: function(response) {
                        console.log('Price for room ' + unitId + ':', response);
                        
                        if (response.success && response.available) {
                            $room.removeClass('unavailable checking').addClass('available');
                            // Show subtotal on the listing card: post-offer / post-voucher
                            // but PRE-TAX. Offers still reduce the displayed price (e.g. a
                            // 30% Last-Min offer drops £320 → £224), but a Canadian property's
                            // 13% HST + Municipal Accommodation Tax stop adding ~$80 to every
                            // card. Taxes get revealed in the booking detail / checkout view.
                            // Listing-card headline = ACCOMMODATION ONLY (matches
                            // the room widget header + the pricing grid).
                            // response.subtotal includes mandatory upsells
                            // (Cleaning Fee etc.) which would put the card
                            // at e.g. $411 while the widget says $277.
                            var standardTotal = response.accommodation_total || 0;

                            // Pick the lowest "from" price across every eligible
                            // offer in all_offers (excluding agent-tier rates).
                            // Before the 2026-05-31 offer-default removal, the
                            // server returned the priority-best-offer baked into
                            // accommodation_total — so the card got it for free.
                            // Now the server returns the standard rate (correct,
                            // by design) and we compute the marketing "from" here.
                            var lowestPrice = standardTotal;
                            var pricingTier = gasBooking.pricingTier || 'standard';
                            var nights = parseInt(response.nights, 10) || 1;
                            var accommodationTotal = parseFloat(response.accommodation_total) || standardTotal;
                            var cmTotal = parseFloat(response.cm_total) || accommodationTotal;
                            if (Array.isArray(response.all_offers)) {
                                response.all_offers.forEach(function(offer) {
                                    // Skip agent/corporate tiers unless that's what we asked for.
                                    if (offer.pricing_tier && offer.pricing_tier !== 'standard' && offer.pricing_tier !== pricingTier) return;
                                    var baseTotal = offer.replaces_standard ? cmTotal : accommodationTotal;
                                    var offerTotal;
                                    if (offer.price_per_night) {
                                        offerTotal = parseFloat(offer.price_per_night) * nights;
                                    } else if (offer.discount_type === 'percentage') {
                                        offerTotal = baseTotal * (1 - parseFloat(offer.discount_value) / 100);
                                    } else {
                                        offerTotal = baseTotal - (parseFloat(offer.discount_value) || 0);
                                    }
                                    if (isFinite(offerTotal) && offerTotal < lowestPrice) {
                                        lowestPrice = offerTotal;
                                    }
                                });
                            }
                            var totalPrice = lowestPrice;
                            var roomCurrency = resolveCurrency(response.currency);

                            // Update data-price for sort to work
                            $room.data('price', totalPrice);

                            // Check if room has offers (only show badge for standard tier)
                            // Card shows the subtotal (post-offer, pre-tax). No suffix label —
                            // "total" was misleading after we switched from grand_total. The
                            // full breakdown appears on the room detail / checkout.
                            var priceHtml = formatPriceShort(totalPrice, roomCurrency);
                            if ($room.hasClass('has-offers') && pricingTier === 'standard') {
                                priceHtml += '<div class="gas-offers-badge">🏷️ Offers available*</div>';
                            }
                            
                            $room.find('.gas-room-price, .gas-room-row-price').html(priceHtml);
                            $room.find('.gas-view-btn, .gas-row-view-btn').css({'background': '', 'pointer-events': ''}).text(t('booking', 'view_book', 'View & Book'));
                        } else if (response.min_stay_required) {
                            // Min stay not met — show price but with warning, not "unavailable"
                            $room.removeClass('unavailable checking available dates-blocked').addClass('min-stay-warning');
                            var nightsWord = response.min_stay_required > 1 ? t('booking', 'nights', 'nights') : t('booking', 'night', 'night');
                            $room.find('.gas-room-price, .gas-room-row-price').html('<span class="gas-min-stay-label" style="color:#b45309;font-weight:600;">Min ' + response.min_stay_required + ' ' + nightsWord + '</span>');
                            $room.find('.gas-view-btn, .gas-row-view-btn').css({'background': '#f59e0b', 'pointer-events': ''}).text(t('booking', 'view_book', 'View & Book'));
                        } else {
                            $room.removeClass('available').addClass('unavailable dates-blocked');
                            $room.find('.gas-room-price, .gas-room-row-price').html('—');
                            $room.find('.gas-view-btn, .gas-row-view-btn').css({'background': '#9ca3af', 'pointer-events': ''}).text(t('booking', 'view_calendar', 'View Calendar')).attr('title', t('booking', 'check_other_dates', 'Check other dates'));
                        }
                    },
                    error: function() {
                        // On error, show dash — no fallback to base price
                        $room.find('.gas-room-price, .gas-room-row-price').html('—');
                    }
                });
            }
        });
        
        // Reorder after all availability checks complete
        var totalRooms = $rooms.length;
        var checkedCount = 0;
        var reorderTimer = null;
        
        function tryReorder() {
            var $checking = $('.gas-room-card.checking, .gas-room-row.checking');
            if ($checking.length === 0) {
                // All done
                clearInterval(reorderTimer);
                reorderRooms();
                // Remove spinner and scroll to first available
                $('.gas-loading-spinner').remove();
                var $firstAvailable = $('.gas-room-card.available, .gas-room-row.available').first();
                if ($firstAvailable.length) {
                    $('html, body').animate({
                        scrollTop: $firstAvailable.offset().top - 80
                    }, 500);
                }
            }
        }
        
        // Poll every 500ms until all rooms are checked, max 10 seconds
        reorderTimer = setInterval(tryReorder, 500);
        setTimeout(function() {
            clearInterval(reorderTimer);
            reorderRooms(); // Force reorder after 10s regardless
            $('.gas-loading-spinner').remove();
        }, 10000);
    }
    
    // Reorder rooms - unavailable at bottom, always show ALL available rooms
    function reorderRooms() {
        var $container = $('.gas-rooms-grid, .gas-rooms-row-layout');
        if (!$container.length) return;

        // Unhide any available rooms that are behind Load More
        $container.find('.gas-room-card.gas-room-hidden.available, .gas-room-row.gas-room-hidden.available').each(function() {
            $(this).removeClass('gas-room-hidden').css('display', '');
            var imageDiv = this.querySelector('.gas-room-image[data-bg]');
            if (imageDiv) {
                imageDiv.style.background = "url('" + imageDiv.dataset.bg + "') center/cover";
                imageDiv.removeAttribute('data-bg');
            }
        });

        // Use sortRooms with current dropdown value to reorder
        var currentSort = $('.gas-sort-select').val() || 'default';
        sortRooms(currentSort);

        // Update Load More count
        var hiddenRemaining = $container.find('.gas-room-card.gas-room-hidden').length;
        var $loadMoreContainer = $('.gas-load-more-container');
        if (hiddenRemaining === 0) {
            $loadMoreContainer.hide();
        } else {
            $loadMoreContainer.show();
            var $countSpan = $loadMoreContainer.find('.gas-load-more-count');
            if ($countSpan.length) {
                $countSpan.text('(' + hiddenRemaining + ' more)');
            }
        }
    }
    
    // Also filter on page load if guests param is present
    function filterByGuests() {
        var urlParams = new URLSearchParams(window.location.search);
        var guests = parseInt(urlParams.get('guests')) || 0;
        
        console.log('Filter by guests:', guests);
        
        if (guests > 0) {
            $('.gas-room-card').each(function() {
                var $room = $(this);
                var maxGuestsAttr = $room.attr('data-max-guests');
                var maxGuests = parseInt(maxGuestsAttr) || 2;
                
                console.log('Room max guests:', maxGuests, 'Selected:', guests, 'Attr:', maxGuestsAttr);
                
                if (guests > maxGuests) {
                    $room.addClass('unavailable guest-exceeded');
                    $room.find('.gas-room-price').html('<span class="gas-too-small">' + t('booking', 'max_guests', 'Max %s guests').replace('%s', maxGuests) + '</span>');
                    $room.find('.gas-view-btn').css({'background': '#9ca3af', 'pointer-events': 'none'});
                }
            });
            
            // Reorder rooms after short delay
            setTimeout(function() {
                reorderRoomsByGuests();
            }, 300);
        }
    }
    
    // Reorder rooms - guests exceeded at bottom
    function reorderRoomsByGuests() {
        var $container = $('.gas-rooms-grid');
        if (!$container.length) return;
        
        var $ok = $container.find('.gas-room-card:not(.guest-exceeded)');
        var $exceeded = $container.find('.gas-room-card.guest-exceeded');
        
        if ($exceeded.length > 0 && $ok.length > 0) {
            // Add divider and move exceeded rooms to end
            $container.append('<div class="gas-rooms-divider" style="grid-column: 1/-1; padding: 20px 0; text-align: center; color: #9ca3af; font-size: 14px; border-top: 1px solid #e5e7eb; margin-top: 20px;">Rooms below cannot accommodate ' + (parseInt(new URLSearchParams(window.location.search).get('guests')) || 0) + ' guests</div>');
            $exceeded.appendTo($container);
        }
    }
    
    // Run guest filter on page load
    $(document).ready(function() {
        setTimeout(filterByGuests, 100); // Small delay to ensure DOM is ready

        // Load offers and update room card prices
        loadOffersForRoomCards();

        // Apply per-account default sort (e.g. Hebden = price-high). The
        // server writes it onto #gas-rooms-container; we mirror it to the
        // dropdown and run sortRooms() after the price fetch settles so
        // cards have their real data-price values.
        var $cont = $('#gas-rooms-container');
        var defaultSort = $cont.data('default-sort');
        if (defaultSort && defaultSort !== 'default') {
            $('.gas-sort-select').val(defaultSort);
            setTimeout(function() { sortRooms(defaultSort); }, 1500);
        }
    });
    
    // Load offers for all room cards and update display
    function loadOffersForRoomCards() {
        if (!gasBooking.clientId) return;
        
        // Skip loading offers badges for non-standard pricing tiers
        var pricingTier = gasBooking.pricingTier || 'standard';
        if (pricingTier !== 'standard') {
            return; // Don't show "Save X%" badges for corporate/agent sites
        }
        
        var $rooms = $('.gas-room-card');
        if ($rooms.length === 0) return;
        
        // Pass check_in from URL so future offers show when date is pre-filled
        var offersUrl = gasBooking.apiUrl + '/api/public/client/' + gasBooking.clientId + '/offers';
        var offersParams = new URLSearchParams(window.location.search);
        var offerCheckIn = offersParams.get('check_in');
        if (offerCheckIn) offersUrl += '?check_in=' + offerCheckIn + '&include_future=1';

        $.ajax({
            url: offersUrl,
            method: 'GET',
            dataType: 'json',
            success: function(response) {
                if (response.success && response.offers && response.offers.length > 0) {
                    var offers = response.offers;
                    
                    $rooms.each(function() {
                        var $room = $(this);
                        var unitId = $room.data('room-id');
                        
                        // Find applicable offers for this room
                        var applicableOffers = offers.filter(function(offer) {
                            // Check if offer applies to this room (all rooms if room_id is null, or specific room)
                            if (offer.room_id) {
                                return offer.room_id == unitId;
                            }
                            return true; // Applies to all rooms (room_id is null)
                        });
                        
                        if (applicableOffers.length > 0) {
                            // Find the best discount percentage to display
                            var bestDiscount = 0;
                            applicableOffers.forEach(function(offer) {
                                if (offer.discount_type === 'percentage' && offer.discount_value > bestDiscount) {
                                    bestDiscount = offer.discount_value;
                                }
                            });
                            
                            // Add offers badge to existing price
                            var $priceEl = $room.find('.gas-room-price');
                            var currentPrice = $priceEl.html();
                            
                            // Only add badge if not already added
                            if (currentPrice.indexOf('gas-offers-badge') === -1) {
                                var badgeText = bestDiscount > 0 ? 
                                    '🏷️ Save up to ' + Math.round(bestDiscount) + '%*' : 
                                    '🏷️ Offers available*';
                                    
                                $priceEl.html(currentPrice + 
                                    '<div class="gas-offers-badge">' + badgeText + '</div>' +
                                    '<div class="gas-terms-apply">*terms apply</div>');
                                $room.addClass('has-offers');
                            }
                        }
                    });
                }
            }
        });
    }
    
    // Sort rooms - available first, then by price.
    // Cards marked data-pin-to-end="true" (whole-property listings like
    // Exclusive Hire) are pushed to the end of their availability group
    // regardless of price sort, so they don't dominate "Price: High to Low".
    function sortRooms(sortBy) {
        var $container = $('.gas-rooms-grid, .gas-rooms-row-layout');
        if (!$container.length) return;

        var $rooms = $container.find('.gas-room-card, .gas-room-row');
        var roomsArray = $rooms.toArray();

        roomsArray.sort(function(a, b) {
            var $a = $(a);
            var $b = $(b);

            // Group: available first, then min-stay, then unavailable
            var aGroup = $a.hasClass('unavailable') ? 2 : ($a.hasClass('min-stay-warning') ? 1 : 0);
            var bGroup = $b.hasClass('unavailable') ? 2 : ($b.hasClass('min-stay-warning') ? 1 : 0);
            if (aGroup !== bGroup) return aGroup - bGroup;

            // Pin-to-end cards always last inside their group.
            var aPin = $a.data('pin-to-end') === true || $a.data('pin-to-end') === 'true';
            var bPin = $b.data('pin-to-end') === true || $b.data('pin-to-end') === 'true';
            if (aPin !== bPin) return aPin ? 1 : -1;

            // Within same group, sort by price
            var aPrice = parseFloat($a.data('price')) || 0;
            var bPrice = parseFloat($b.data('price')) || 0;

            // Rooms with no price (0) go after priced rooms
            if (aPrice > 0 && bPrice === 0) return -1;
            if (aPrice === 0 && bPrice > 0) return 1;
            if (aPrice === 0 && bPrice === 0) return 0;

            switch (sortBy) {
                case 'price-low':
                    return aPrice - bPrice;
                case 'price-high':
                    return bPrice - aPrice;
                default:
                    return 0;
            }
        });

        // Re-append in sorted order
        $container.find('.gas-rooms-divider').remove();
        roomsArray.forEach(function(room) {
            $container.append(room);
        });

        // Add divider between available and unavailable
        var $firstUnavail = $container.find('.gas-room-card.unavailable, .gas-room-row.unavailable, .gas-room-card.min-stay-warning, .gas-room-row.min-stay-warning').first();
        var $available = $container.find('.gas-room-card.available, .gas-room-row.available');
        if ($available.length > 0 && $firstUnavail.length > 0) {
            $firstUnavail.before('<div class="gas-rooms-divider">' + t('booking', 'rooms_not_available_divider', 'Rooms below are not available for selected dates') + '</div>');
        }
    }
    
    // Sort dropdown handler
    $(document).on('change', '.gas-sort-select', function() {
        sortRooms($(this).val());
    });

    // Filter button — preserve offer/property context from URL
    $(document).on('click', '.gas-filter-btn', function() {
        var checkin = $('.gas-filter-checkin').val();
        var checkout = $('.gas-filter-checkout').val();
        var guests = $('.gas-filter-guests').val();

        var params = [];
        if (checkin) params.push('checkin=' + checkin);
        if (checkout) params.push('checkout=' + checkout);
        if (guests) params.push('guests=' + guests);

        // Preserve offer and property context from original URL
        var currentParams = new URLSearchParams(window.location.search);
        var offerId = currentParams.get('offer_id');
        var propertyId = currentParams.get('property_id');
        var unitId = currentParams.get('unit_id');
        if (offerId) params.push('offer_id=' + offerId);
        if (propertyId) params.push('property_id=' + propertyId);
        if (unitId) params.push('unit_id=' + unitId);

        var url = window.location.pathname;
        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        window.location.href = url;
    });
    
    // Also expose as global function for inline onclick
    window.gasFilterRooms = function() {
        $('.gas-filter-btn').click();
    };
    
    // ========================================
    // Rooms Grid Map
    // ========================================
    var roomsMap = null;
    var roomMarkers = {};
    var markerClusterGroup = null;
    
    function initRoomsMap() {
        if (!$('#gas-rooms-map').length || typeof gasRoomsMapData === 'undefined' || !gasRoomsMapData.length) {
            return;
        }
        
        // Calculate bounds from all rooms
        var bounds = [];
        gasRoomsMapData.forEach(function(room) {
            if (room.lat && room.lng) {
                bounds.push([room.lat, room.lng]);
            }
        });
        
        if (bounds.length === 0) return;
        
        // Create map
        roomsMap = L.map('gas-rooms-map', {
            scrollWheelZoom: true
        });
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(roomsMap);
        
        // Group rooms by property (same coordinates)
        var propertyGroups = {};
        gasRoomsMapData.forEach(function(room) {
            var key = room.lat + ',' + room.lng;
            if (!propertyGroups[key]) {
                propertyGroups[key] = [];
            }
            propertyGroups[key].push(room);
        });
        
        // Custom icon
        var defaultIcon = L.divIcon({
            className: 'gas-map-marker',
            html: '<div class="gas-marker-pin"></div>',
            iconSize: [30, 40],
            iconAnchor: [15, 40],
            popupAnchor: [0, -40]
        });
        
        // Add markers for each property group
        Object.keys(propertyGroups).forEach(function(key) {
            var rooms = propertyGroups[key];
            var lat = rooms[0].lat;
            var lng = rooms[0].lng;
            
            // Create marker
            var marker = L.marker([lat, lng], {
                icon: defaultIcon
            }).addTo(roomsMap);
            
            // Build popup content
            var popupHtml = '<div class="gas-map-popup">';
            
            if (rooms.length === 1) {
                // Single room popup
                var room = rooms[0];
                var roomDisplayName = extractText(room.display_name) || room.name;
                if (room.image_url) {
                    popupHtml += '<img src="' + room.image_url + '" class="gas-map-popup-image" alt="' + roomDisplayName + '">';
                }
                popupHtml += '<div class="gas-map-popup-title">' + roomDisplayName + '</div>';
                if (room.property_name) {
                    popupHtml += '<div class="gas-map-popup-property">' + room.property_name + '</div>';
                }
                if (room.price > 0) {
                    var mapCurrency = resolveCurrency(room.currency);
                    popupHtml += '<div class="gas-map-popup-price">' + formatPriceShort(room.price, mapCurrency) + ' <small>/ night</small></div>';
                }
                popupHtml += '<a href="' + room.url + '" class="gas-map-popup-link">' + t('booking', 'view_book', 'View &amp; Book') + '</a>';
            } else {
                // Multiple rooms at same location
                popupHtml += '<div class="gas-map-popup-title">' + rooms[0].property_name + '</div>';
                popupHtml += '<div class="gas-map-popup-property">' + rooms.length + ' rooms available</div>';
                popupHtml += '<div style="max-height: 150px; overflow-y: auto; margin-top: 8px;">';
                rooms.forEach(function(room) {
                    var multiRoomName = extractText(room.display_name) || room.name;
                    popupHtml += '<div style="padding: 6px 0; border-bottom: 1px solid #eee;">';
                    popupHtml += '<div style="font-weight: 500; font-size: 13px;">' + multiRoomName + '</div>';
                    if (room.price > 0) {
                        var roomMapCurrency = resolveCurrency(room.currency);
                        popupHtml += '<div style="font-size: 12px; color: #666;">' + formatPriceShort(room.price, roomMapCurrency) + '/night</div>';
                    }
                    popupHtml += '<a href="' + room.url + '" style="font-size: 11px; color: #667eea;">' + t('booking', 'view_book', 'View') + ' →</a>';
                    popupHtml += '</div>';
                });
                popupHtml += '</div>';
            }
            
            popupHtml += '</div>';
            
            marker.bindPopup(popupHtml, {
                maxWidth: 280,
                minWidth: 200
            });
            
            // Store marker reference for each room
            rooms.forEach(function(room) {
                roomMarkers[room.id] = marker;
            });
        });
        
        // Fit map to bounds
        var mapZoom = (typeof gasRoomsConfig !== 'undefined' && gasRoomsConfig.mapZoom) ? gasRoomsConfig.mapZoom : 14;
        if (bounds.length === 1) {
            roomsMap.setView(bounds[0], mapZoom);
        } else {
            roomsMap.fitBounds(bounds, { padding: [30, 30], maxZoom: mapZoom });
        }
        
        // Card hover interaction
        $(document).on('mouseenter', '.gas-room-card', function() {
            var roomId = $(this).data('room-id');
            if (roomMarkers[roomId]) {
                roomMarkers[roomId].openPopup();
            }
        });
        
        $(document).on('mouseleave', '.gas-room-card', function() {
            var roomId = $(this).data('room-id');
            if (roomMarkers[roomId]) {
                roomMarkers[roomId].closePopup();
            }
        });
        
        // Card click to navigate
        $(document).on('click', '.gas-room-card', function(e) {
            // Don't navigate if clicking the View & Book button
            if ($(e.target).hasClass('gas-view-btn') || $(e.target).closest('.gas-view-btn').length) {
                return;
            }
            var url = $(this).data('url');
            if (url) {
                window.location.href = url;
            }
        });
    }
    
    // Initialize rooms map if present
    if ($('#gas-rooms-map').length && typeof L !== 'undefined') {
        initRoomsMap();
    }

    // Sync map markers with filtered room cards — called by gasApplyFilters()
    window.gasUpdateMapMarkers = function() {
        if (!roomsMap) return;

        // Build set of visible room IDs from currently shown cards
        var visibleRoomIds = {};
        document.querySelectorAll('.gas-room-card, .gas-room-row').forEach(function(card) {
            if (card.style.display !== 'none') {
                var roomId = card.dataset.roomId;
                if (roomId) visibleRoomIds[roomId] = true;
            }
        });

        // Track which markers have at least one visible room and collect visible bounds
        var markerVisible = new Map();
        var visibleBounds = [];

        Object.keys(roomMarkers).forEach(function(roomId) {
            var marker = roomMarkers[roomId];
            if (!markerVisible.has(marker)) {
                markerVisible.set(marker, false);
            }
            if (visibleRoomIds[roomId]) {
                markerVisible.set(marker, true);
                var ll = marker.getLatLng();
                visibleBounds.push([ll.lat, ll.lng]);
            }
        });

        // Show/hide markers
        markerVisible.forEach(function(visible, marker) {
            if (visible) {
                if (!roomsMap.hasLayer(marker)) roomsMap.addLayer(marker);
            } else {
                if (roomsMap.hasLayer(marker)) roomsMap.removeLayer(marker);
            }
        });

        // Re-fit bounds to visible markers
        if (visibleBounds.length > 0) {
            var mapZoom = (typeof gasRoomsConfig !== 'undefined' && gasRoomsConfig.mapZoom) ? gasRoomsConfig.mapZoom : 14;
            if (visibleBounds.length === 1) {
                roomsMap.setView(visibleBounds[0], mapZoom);
            } else {
                roomsMap.fitBounds(visibleBounds, { padding: [30, 30], maxZoom: mapZoom });
            }
        }
    };

    // If URL filters were applied before map init, sync markers now
    if (roomsMap && new URLSearchParams(window.location.search).has('location')) {
        setTimeout(gasUpdateMapMarkers, 100);
    }

    // ========================================
    // Mobile Calendar Swipe Navigation
    // ========================================
    (function() {
        var $container = $('.gas-calendar-container');
        if (!$container.length) return;
        
        var touchStartX = 0;
        var touchEndX = 0;
        
        $container.on('touchstart', function(e) {
            touchStartX = e.originalEvent.touches[0].clientX;
        });
        
        $container.on('touchend', function(e) {
            touchEndX = e.originalEvent.changedTouches[0].clientX;
            handleSwipe();
        });
        
        function handleSwipe() {
            var swipeThreshold = 50;
            var diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) < swipeThreshold) return;
            
            if (diff > 0) {
                // Swipe left - show next month
                $container.addClass('show-next');
                $('.gas-cal-next').trigger('click');
            } else {
                // Swipe right - show previous month
                $container.removeClass('show-next');
                $('.gas-cal-prev').trigger('click');
            }
        }
        
        // Also handle navigation button clicks on mobile
        $(document).on('click', '.gas-cal-next', function() {
            if (window.innerWidth <= 500) {
                $container.addClass('show-next');
            }
        });
        
        $(document).on('click', '.gas-cal-prev', function() {
            if (window.innerWidth <= 500) {
                $container.removeClass('show-next');
            }
        });
    })();
    
    // =========================================================
    // CHECKOUT PAGE
    // =========================================================
    var $checkoutPage = $('.gas-checkout-page');
    if ($checkoutPage.length) {
        // Hide page hero/title elements (theme-agnostic)
        var heroSelectors = [
            '.page-hero', '.entry-header', '.page-title-section', '.hero-section',
            '.wp-block-post-title', '.page-header', '.page-title', '.entry-title',
            'article > header', '.hentry > header', '.ast-archive-description',
            '.developer-entry-title', '.developer-page-header', '.developer-hero'
        ];
        heroSelectors.forEach(function(selector) {
            $(selector).not('.gas-checkout-page *').hide();
        });
        // Also try to find and hide any dark header sections before our content
        $checkoutPage.prevAll('section, header, div').each(function() {
            var $el = $(this);
            var bg = $el.css('background-color');
            // Hide dark backgrounds (likely hero sections)
            if (bg && (bg.indexOf('rgb(0') === 0 || bg.indexOf('rgb(30') === 0 || bg.indexOf('rgb(31') === 0 || bg.indexOf('#1') === 0 || bg.indexOf('#2') === 0)) {
                $el.hide();
            }
        });
        
        // ========================================
        // CART-ONLY CHECKOUT (bike storage etc.)
        // ========================================
        // When the guest arrives via the floating cart pill carrying just
        // an upsell (no room), reuse this checkout page's guest form +
        // Stripe Elements, but skip every room-related fetch + render.
        // Submit goes to /api/public/bike-storage/checkout with the
        // payment_method_id inline branch added on the server today.
        var isCartOnly = $checkoutPage.data('cart-only') == '1';
        if (isCartOnly) {
            (function initCartOnlyCheckout() {
                console.log('[GAS Cart Checkout] init (URL-driven)');
                // URL is the single source of truth. The bike-storage widget
                // (or any upsell entry point) redirects with these params,
                // and they round-trip through /book-now/ when the guest
                // takes the "Add a room" detour.
                var apiUrl = $checkoutPage.data('api-url') || 'https://admin.gas.travel';
                var sp = new URLSearchParams(window.location.search);
                var propertyId   = parseInt(sp.get('property')) || 0;
                var checkin      = sp.get('checkin') || '';
                var checkoutDate = sp.get('checkout') || '';
                var upsellId     = sp.get('prefill_upsells') || '';
                var qty          = parseInt(sp.get('prefill_quantity')) || 1;
                var label        = sp.get('prefill_label') || ('Item ' + upsellId);
                var unitPrice    = parseFloat(sp.get('prefill_price')) || 0;
                var currency     = (sp.get('prefill_currency') || 'GBP').toUpperCase();
                var bookingUrl   = sp.get('booking_url') || '/';
                var symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency + ' ';
                if (!upsellId || !propertyId) {
                    $checkoutPage.html('<div style="padding:2rem;text-align:center;"><h2>Nothing to check out</h2><p>Open the bike-storage widget to start a booking.</p></div>');
                    return;
                }
                var lineTotal = unitPrice * qty;

                // Render the upsell as a standard price-breakdown line —
                // same DOM the room checkout already uses for mandatory
                // extras. No separate "Your Cart" panel.
                $checkoutPage.find('.gas-summary-room').hide();
                $checkoutPage.find('.gas-summary-info-row, .gas-summary-divider').first().hide();
                if (checkin)      $checkoutPage.find('.gas-checkin-display').text(new Date(checkin).toDateString());
                if (checkoutDate) $checkoutPage.find('.gas-checkout-display').text(new Date(checkoutDate).toDateString());
                var extraHtml = '<div class="gas-price-line"><span>' + label + '</span><span>' + symbol + lineTotal.toFixed(2) + '</span></div>';
                var addRoomUrl = bookingUrl + (bookingUrl.indexOf('?') === -1 ? '?' : '&') +
                    'checkin=' + encodeURIComponent(checkin) +
                    '&checkout=' + encodeURIComponent(checkoutDate) +
                    '&prefill_upsells=' + encodeURIComponent(upsellId) +
                    '&prefill_quantity=' + encodeURIComponent(qty);
                extraHtml += '<a href="' + addRoomUrl + '" class="gas-cart-add-room" style="display:block;margin-top:10px;padding:8px 12px;border:1px dashed #cbd5e1;border-radius:6px;text-align:center;color:#2563eb;text-decoration:none;font-size:0.9rem;font-weight:600;">+ Add a room to this booking</a>';
                $checkoutPage.find('.gas-mandatory-extras').html(extraHtml).show();
                $checkoutPage.find('.gas-price-breakdown .gas-nights-label').text('Subtotal');
                $checkoutPage.find('.gas-price-breakdown .gas-nights-total').text(symbol + lineTotal.toFixed(2));
                $checkoutPage.find('.gas-grand-total, .gas-total-amount').text(symbol + lineTotal.toFixed(2));

                // Stripe init — pull publishable key for this property.
                var stripeInstance = null, cardElement = null;
                $.ajax({
                    url: apiUrl + '/api/public/property/' + propertyId + '/stripe-info',
                    method: 'GET',
                    success: function(resp) {
                        if (!resp || !resp.success || !resp.stripe_enabled || !resp.stripe_publishable_key) {
                            $('#gas-card-errors, .gas-card-errors').text('Card payments not available — contact the host.').show();
                            return;
                        }
                        stripeInstance = Stripe(resp.stripe_publishable_key, resp.stripe_account_id ? { stripeAccount: resp.stripe_account_id } : undefined);
                        var elements = stripeInstance.elements();
                        cardElement = elements.create('card', { style: { base: { fontSize: '16px', color: '#0f172a' } } });
                        // Find any card element mount point the existing checkout uses.
                        var mount = document.getElementById('gas-card-element') || $checkoutPage.find('.gas-card-element')[0];
                        if (mount) cardElement.mount(mount);
                    },
                    error: function() {
                        $('#gas-card-errors, .gas-card-errors').text('Could not load payment setup.').show();
                    }
                });

                // Wire submit. The existing checkout page form has a submit
                // button; we intercept it for cart-only mode.
                $checkoutPage.on('submit', 'form, .gas-guest-form, #gas-guest-form', function(e) {
                    e.preventDefault();
                    if (!stripeInstance || !cardElement) {
                        $('#gas-card-errors, .gas-card-errors').text('Payment not ready — try again in a moment.').show();
                        return;
                    }
                    var $form = $(this);
                    var firstName = ($form.find('[name=first_name]').val() || '').trim();
                    var lastName  = ($form.find('[name=last_name]').val() || '').trim();
                    var email     = ($form.find('[name=email]').val() || '').trim();
                    var phone     = ($form.find('[name=phone]').val() || '').trim();
                    if (!firstName || !lastName || !email) {
                        $('#gas-card-errors, .gas-card-errors').text('Please fill in name and email.').show();
                        return;
                    }
                    var $payBtn = $form.find('button[type=submit], .gas-pay-btn').first();
                    var origText = $payBtn.text();
                    $payBtn.prop('disabled', true).text('Processing…');
                    stripeInstance.createPaymentMethod({
                        type: 'card',
                        card: cardElement,
                        billing_details: { name: firstName + ' ' + lastName, email: email }
                    }).then(function(result) {
                        if (result.error) {
                            $('#gas-card-errors, .gas-card-errors').text(result.error.message).show();
                            $payBtn.prop('disabled', false).text(origText);
                            return;
                        }
                        $.ajax({
                            url: apiUrl + '/api/public/bike-storage/checkout',
                            method: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                property_id: propertyId,
                                check_in: checkin,
                                check_out: checkoutDate,
                                guest_first_name: firstName,
                                guest_last_name: lastName,
                                guest_email: email,
                                guest_phone: phone,
                                quantity: qty || 1,
                                payment_method_id: result.paymentMethod.id,
                                source_site_url: window.location.origin + window.location.pathname
                            }),
                            success: function(r) {
                                if (r && r.requires_action && r.client_secret) {
                                    stripeInstance.handleCardAction(r.client_secret).then(function(stripeRes) {
                                        if (stripeRes.error) {
                                            $('#gas-card-errors, .gas-card-errors').text(stripeRes.error.message).show();
                                            $payBtn.prop('disabled', false).text(origText);
                                        } else {
                                            // 3DS passed — server webhook will finish.
                                            if (window.gasCart) window.gasCart.clear();
                                            window.location.href = '/checkout/?paid=1';
                                        }
                                    });
                                } else if (r && r.paid) {
                                    if (window.gasCart) window.gasCart.clear();
                                    window.location.href = '/checkout/?paid=1';
                                } else {
                                    $('#gas-card-errors, .gas-card-errors').text((r && r.error) || 'Payment failed.').show();
                                    $payBtn.prop('disabled', false).text(origText);
                                }
                            },
                            error: function(x) {
                                var msg = (x.responseJSON && x.responseJSON.error) || 'Network error.';
                                $('#gas-card-errors, .gas-card-errors').text(msg).show();
                                $payBtn.prop('disabled', false).text(origText);
                            }
                        });
                    });
                });
            })();
            return; // Skip room-based checkout init
        }

        // ========================================
        // GROUP BOOKING CHECKOUT
        // ========================================
        var isGroupBooking = $checkoutPage.data('is-group') == '1';
        
        if (isGroupBooking) {
            console.log('GAS: Group checkout detected');
            
            // Load cart from localStorage
            var cart = [];
            try {
                var saved = localStorage.getItem('gas_cart');
                cart = saved ? JSON.parse(saved) : [];
            } catch(e) {
                console.error('Error loading cart:', e);
            }
            
            if (!cart || cart.length === 0) {
                $('.gas-group-rooms-list').html('<p>' + t('booking', 'cart_empty', 'Your cart is empty.') + ' <a href="/book-now/">' + t('booking', 'browse_rooms', 'Browse rooms') + '</a></p>');
                return;
            }
            
            // Build currency-aware payment groups
            var apiUrl = $checkoutPage.data('api-url');
            var clientId = $checkoutPage.data('client-id');

            var paymentGroups = {};
            cart.forEach(function(item) {
                var groupKey = (item.currency || '') + '_' + (item.paymentAccountId || item.propertyId || 'default');
                if (!paymentGroups[groupKey]) {
                    paymentGroups[groupKey] = {
                        items: [],
                        currency: item.currency || '',
                        propertyId: item.propertyId,
                        accountId: item.paymentAccountId || null,
                        subtotal: 0,
                        taxTotal: 0,
                        taxes: [],
                        depositRule: null,
                        depositAmount: 0,
                        balanceAmount: 0,
                        stripe: null,
                        cardElement: null,
                        stripeEnabled: false,
                        selectedUpsells: []
                    };
                }
                paymentGroups[groupKey].items.push(item);
                paymentGroups[groupKey].subtotal += parseFloat(item.totalPrice) || 0;
            });

            var paymentGroupKeys = Object.keys(paymentGroups);
            var hasMultiplePaymentGroups = paymentGroupKeys.length > 1;
            var currentPaymentGroupIndex = 0;
            console.log('GAS: Payment groups:', paymentGroupKeys.length, 'multi:', hasMultiplePaymentGroups);

            function getCurrentGroup() {
                return paymentGroups[paymentGroupKeys[currentPaymentGroupIndex]];
            }

            function recalcGroupDeposit(group) {
                var grandTotal = group.subtotal + (group.taxTotal || 0);
                var upsellsTotal = (group.selectedUpsells || []).reduce(function(sum, u) { return sum + u.price; }, 0);
                grandTotal += upsellsTotal;

                var depositAmt = grandTotal;
                var balanceAmt = 0;

                if (group.depositRule) {
                    var rule = group.depositRule;

                    // Multi-tier payment schedule (schedule mode)
                    if (rule.schedule_mode === 'schedule' && rule.payment_schedule && Array.isArray(rule.payment_schedule)) {
                        var checkIn = group.checkIn || group.items?.[0]?.checkIn;
                        var today = new Date();
                        var arrival = checkIn ? new Date(checkIn) : today;
                        var msPerDay = 86400000;
                        var daysUntil = Math.floor((arrival - today) / msPerDay);

                        var chargeNowPct = 0;
                        var scheduledTiers = [];
                        rule.payment_schedule.forEach(function(tier) {
                            var isAtBooking = tier.days_before === null || tier.days_before === undefined;
                            var hasPassed = !isAtBooking && daysUntil <= tier.days_before;
                            if (isAtBooking || hasPassed) {
                                chargeNowPct += parseFloat(tier.percentage) || 0;
                            } else {
                                scheduledTiers.push(tier);
                            }
                        });

                        depositAmt = grandTotal * (chargeNowPct / 100);
                        balanceAmt = grandTotal - depositAmt;

                        // Store schedule info for checkout display
                        group.paymentSchedule = rule.payment_schedule;
                        group.paymentScheduleChargeNowPct = chargeNowPct;
                        group.paymentScheduleScheduledTiers = scheduledTiers;

                    } else if (rule.deposit_type === 'percentage') {
                        depositAmt = grandTotal * (rule.deposit_percentage / 100);
                        balanceAmt = grandTotal - depositAmt;
                    } else if (rule.deposit_type === 'fixed') {
                        depositAmt = parseFloat(rule.deposit_fixed_amount) || grandTotal;
                        balanceAmt = grandTotal - depositAmt;
                    }
                }

                group.depositAmount = depositAmt;
                group.balanceAmount = balanceAmt;

                $('.gas-deposit-amount-display').text(formatPrice(depositAmt, group.currency));
                if (balanceAmt > 0) {
                    $('.gas-balance-row').show();
                    $('.gas-balance-amount-display').text(formatPrice(balanceAmt, group.currency));

                    // Show schedule breakdown if multi-tier
                    if (group.paymentScheduleScheduledTiers && group.paymentScheduleScheduledTiers.length > 0) {
                        var schedHtml = '';
                        group.paymentScheduleScheduledTiers.forEach(function(tier) {
                            var tierAmt = grandTotal * (parseFloat(tier.percentage) / 100);
                            schedHtml += '<div style="font-size:0.85em;color:#6b7280;margin-top:4px;">📅 ' + tier.percentage + '% (' + formatPrice(tierAmt, group.currency) + ') due ' + tier.days_before + ' days before check-in</div>';
                        });
                        $('.gas-balance-row').after('<div class="gas-schedule-breakdown">' + schedHtml + '</div>');
                    }
                } else {
                    $('.gas-balance-row').hide();
                }
                // Remove old schedule breakdown before re-rendering
                $('.gas-schedule-breakdown').remove();
                if (group.paymentScheduleScheduledTiers && group.paymentScheduleScheduledTiers.length > 0 && balanceAmt > 0) {
                    var schedHtml2 = '';
                    group.paymentScheduleScheduledTiers.forEach(function(tier) {
                        var tierAmt2 = grandTotal * (parseFloat(tier.percentage) / 100);
                        schedHtml2 += '<div style="font-size:0.85em;color:#6b7280;margin-top:4px;">📅 ' + tier.percentage + '% (' + formatPrice(tierAmt2, group.currency) + ') due ' + tier.days_before + ' days before check-in</div>';
                    });
                    $('.gas-balance-row').after('<div class="gas-schedule-breakdown">' + schedHtml2 + '</div>');
                }
            }

            // Populate rooms list
            var roomsHtml = '';
            var totalPrice = 0;
            var taxTotal = 0;
            
            cart.forEach(function(item, index) {
                totalPrice += parseFloat(item.totalPrice) || 0;
                
                // Format guests display with adults and children
                var guestsDisplay = '';
                if (item.adults && item.children) {
                    guestsDisplay = item.adults + ' adult' + (item.adults > 1 ? 's' : '') + ', ' + item.children + ' child' + (item.children > 1 ? 'ren' : '');
                } else if (item.adults) {
                    guestsDisplay = item.adults + ' adult' + (item.adults > 1 ? 's' : '');
                } else {
                    guestsDisplay = item.guests + ' guest' + (item.guests > 1 ? 's' : '');
                }
                
                roomsHtml += '<div class="gas-group-room-item" data-index="' + index + '" style="display:flex;align-items:center;gap:12px;padding:12px;background:#f9fafb;border-radius:8px;margin-bottom:10px;">';
                roomsHtml += '<div style="flex:1;">';
                roomsHtml += '<div style="font-weight:600;">' + item.name + '</div>';
                roomsHtml += '<div style="font-size:13px;color:#666;">👤 ' + guestsDisplay + '</div>';
                roomsHtml += '</div>';
                roomsHtml += '<div style="font-weight:600;color:#2563eb;">' + formatPrice(item.totalPrice, item.currency) + '</div>';
                roomsHtml += '<button type="button" class="gas-remove-room-btn" data-index="' + index + '" style="background:none;border:none;color:#dc2626;cursor:pointer;padding:4px 8px;font-size:18px;" title="Remove room">×</button>';
                roomsHtml += '</div>';
            });
            
            $('.gas-group-rooms-list').html(roomsHtml);
            
            // Fetch taxes for each payment group
            paymentGroupKeys.forEach(function(groupKey, gIndex) {
                var group = paymentGroups[groupKey];
                var firstItem = group.items[0];
                console.log('GAS: Fetching taxes for group', gIndex, groupKey);
                $.ajax({
                    url: apiUrl + '/api/public/calculate-price',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        unit_id: firstItem.roomId,
                        check_in: firstItem.checkin,
                        check_out: firstItem.checkout,
                        guests: firstItem.guests,
                        pricing_tier: gasBooking.pricingTier || 'standard',
                        lang: currentLanguage
                    }),
                    success: function(response) {
                        console.log('GAS: Price response for group', gIndex, response);
                        if (response.success && response.taxes && response.taxes.length > 0) {
                            group.taxTotal = 0;
                            group.taxes = [];
                            response.taxes.forEach(function(tax) {
                                var taxAmt = 0;
                                var taxLabel = '';

                                var taxName = tax.name;
                                if (tax.type === 'fixed' || tax.amount) {
                                    taxAmt = (parseFloat(tax.amount) || parseFloat(tax.rate) || 0) * group.items.length;
                                    taxLabel = taxName;
                                } else {
                                    taxAmt = group.subtotal * (parseFloat(tax.rate) / 100);
                                    taxLabel = taxName + ' (' + tax.rate + '%)';
                                }

                                group.taxTotal += taxAmt;
                                group.taxes.push({ label: taxLabel, amount: taxAmt });
                            });

                            // Only update DOM for the current group
                            if (gIndex === currentPaymentGroupIndex) {
                                var taxesHtml = '';
                                group.taxes.forEach(function(t) {
                                    taxesHtml += '<div class="gas-tax-item" style="display:flex;justify-content:space-between;font-size:14px;color:#666;margin-bottom:4px;">';
                                    taxesHtml += '<span>' + t.label + '</span>';
                                    taxesHtml += '<span>' + formatPrice(t.amount, group.currency) + '</span>';
                                    taxesHtml += '</div>';
                                });
                                $('.gas-taxes-list').html(taxesHtml);
                                $('.gas-taxes-section').show();

                                var grandTotal = group.subtotal + group.taxTotal;
                                $('.gas-grand-total').text(formatPrice(grandTotal, group.currency));
                                console.log('GAS: Taxes applied for group', gIndex, 'total:', grandTotal);
                            }
                        } else {
                            console.log('GAS: No taxes for group', gIndex);
                            // Tax-free properties still need a final deposit recalc here —
                            // the initial recalc after stripe-info ran before group.subtotal
                            // was set. Without this, Hotel Balduin showed Deposit Amount €0
                            // on checkout despite a 100% deposit rule.
                            group.taxTotal = group.taxTotal || 0;
                        }
                        // Recalculate deposit AFTER prices are known, regardless of
                        // whether the property has taxes. Moved out of the taxes
                        // branch so tax-free properties don't get stuck at €0.
                        recalcGroupDeposit(group);
                    },
                    error: function(xhr, status, error) {
                        console.log('GAS: Tax fetch error for group', gIndex, error);
                    }
                });
            });
            
            // Update dates
            if (cart[0].checkin) {
                var checkinDate = new Date(cart[0].checkin + 'T12:00:00');
                $('.gas-checkin-display').text(checkinDate.toLocaleDateString(dateLocale, {weekday:'short', month:'short', day:'numeric', year:'numeric'}));
            }
            if (cart[0].checkout) {
                var checkoutDate = new Date(cart[0].checkout + 'T12:00:00');
                $('.gas-checkout-display').text(checkoutDate.toLocaleDateString(dateLocale, {weekday:'short', month:'short', day:'numeric', year:'numeric'}));
            }
            
            // Update total (before taxes - will be updated after tax fetch)
            var currentGroup = getCurrentGroup();
            $('.gas-grand-total').text(formatPrice(currentGroup.subtotal, currentGroup.currency));
            $('.gas-nights-label').text(currentGroup.items.length + ' room(s) × ' + (currentGroup.items[0].nights || 1) + ' night(s)');
            $('.gas-nights-total').text(formatPrice(currentGroup.subtotal, currentGroup.currency));
            
            // Alias for downstream compatibility
            var hasMultiplePaymentAccounts = hasMultiplePaymentGroups;
            
            // Store for submission
            window.groupCheckoutData = {
                items: cart,
                checkin: cart[0].checkin,
                checkout: cart[0].checkout,
                apiUrl: apiUrl,
                hasMultiplePaymentAccounts: hasMultiplePaymentAccounts,
                hasMultiplePaymentGroups: hasMultiplePaymentGroups,
                paymentGroups: paymentGroups,
                paymentGroupKeys: paymentGroupKeys,
                currentPaymentGroupIndex: currentPaymentGroupIndex
            };

            // Hide price breakdown and total for multi-group (dates/guests still visible)
            if (hasMultiplePaymentGroups) {
                $('.gas-price-breakdown, .gas-summary-total, .gas-tax-note').hide();
            }

            // Multi-group stepper state
            var multiGroupInitialized = false;
            var originalStep3Html = '';
            var completedGroups = {}; // keyed by groupKey
            var selectedGroupIndex = -1; // -1 = none selected

            function showMultiGroupStepper() {
                // Capture original step 3 HTML on first call
                if (!multiGroupInitialized) {
                    originalStep3Html = $('.gas-checkout-step-content[data-step="3"]').html();
                    multiGroupInitialized = true;
                }

                var totalGroups = paymentGroupKeys.length;
                var completedCount = Object.keys(completedGroups).length;
                var html = '<div class="gas-multi-group-stepper">';
                html += '<div class="gas-checkout-section">';
                html += '<h2 class="gas-section-title" style="margin-bottom:4px;">Payments</h2>';
                html += '<p class="gas-section-subtitle" style="margin-bottom:20px;">';
                if (completedCount > 0 && completedCount < totalGroups) {
                    html += completedCount + ' of ' + totalGroups + ' payments complete. Select the next payment to continue.';
                } else {
                    html += 'Your rooms require ' + totalGroups + ' separate payments. Select a payment group to begin.';
                }
                html += '</p>';
                html += '</div>';

                // Render all group cards as selectable
                paymentGroupKeys.forEach(function(gKey, idx) {
                    var group = paymentGroups[gKey];
                    var isCompleted = !!completedGroups[gKey];
                    var isSelected = idx === selectedGroupIndex;
                    var groupTotal = group.subtotal + (group.taxTotal || 0);

                    if (isCompleted) {
                        // Completed — green, not clickable
                        html += '<div class="gas-group-card gas-group-completed" style="border:2px solid #22c55e;border-radius:12px;margin-bottom:12px;overflow:hidden;">';
                        html += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:#f0fdf4;">';
                        html += '<div style="width:28px;height:28px;border-radius:50%;background:#22c55e;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">&#10003;</div>';
                        html += '<div style="flex:1;">';
                        html += '<div style="font-weight:600;color:#15803d;">Payment ' + (idx + 1) + ' — Paid</div>';
                        html += '<div style="font-size:13px;color:#166534;margin-top:2px;">';
                        group.items.forEach(function(item, i) {
                            if (i > 0) html += ', ';
                            html += escapeHtml(item.name);
                        });
                        html += '</div>';
                        html += '</div>';
                        html += '<div style="font-weight:700;color:#15803d;">' + formatPrice(groupTotal, group.currency) + '</div>';
                        html += '</div></div>';
                    } else if (isSelected) {
                        // Selected — blue highlight, not clickable (already selected)
                        html += '<div class="gas-group-card gas-group-selected" data-group-idx="' + idx + '" style="border:2px solid #2563eb;border-radius:12px;margin-bottom:12px;overflow:hidden;background:#eff6ff;">';
                        html += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;">';
                        html += '<div style="width:28px;height:28px;border-radius:50%;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">' + (idx + 1) + '</div>';
                        html += '<div style="flex:1;">';
                        html += '<div style="font-weight:600;color:#1d4ed8;">Payment ' + (idx + 1) + ' — Selected</div>';
                        html += '<div style="font-size:13px;color:#3b82f6;margin-top:2px;">';
                        group.items.forEach(function(item, i) {
                            if (i > 0) html += ', ';
                            html += escapeHtml(item.name);
                        });
                        html += '</div>';
                        html += '</div>';
                        html += '<div style="font-weight:700;color:#1d4ed8;">' + formatPrice(groupTotal, group.currency) + '</div>';
                        html += '</div></div>';
                    } else {
                        // Unselected — clickable card
                        html += '<div class="gas-group-card gas-group-selectable" data-group-idx="' + idx + '" style="border:2px solid #e5e7eb;border-radius:12px;margin-bottom:12px;overflow:hidden;cursor:pointer;transition:border-color 0.15s,box-shadow 0.15s;"';
                        html += ' onmouseenter="this.style.borderColor=\'#93c5fd\';this.style.boxShadow=\'0 0 0 3px rgba(59,130,246,0.1)\'"';
                        html += ' onmouseleave="this.style.borderColor=\'#e5e7eb\';this.style.boxShadow=\'none\'">';
                        html += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:#fff;">';
                        html += '<div style="width:28px;height:28px;border-radius:50%;border:2px solid #d1d5db;color:#9ca3af;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">' + (idx + 1) + '</div>';
                        html += '<div style="flex:1;">';
                        html += '<div style="font-weight:600;color:#374151;">Payment ' + (idx + 1) + '</div>';
                        html += '<div style="font-size:13px;color:#6b7280;margin-top:2px;">';
                        group.items.forEach(function(item, i) {
                            if (i > 0) html += ', ';
                            html += escapeHtml(item.name);
                        });
                        html += '</div>';
                        html += '</div>';
                        html += '<div style="font-weight:600;color:#374151;">' + formatPrice(groupTotal, group.currency) + '</div>';
                        html += '<div style="color:#9ca3af;font-size:18px;margin-left:4px;">&#8250;</div>';
                        html += '</div></div>';
                    }
                });

                // Detail + payment area (only if a group is selected)
                if (selectedGroupIndex >= 0 && !completedGroups[paymentGroupKeys[selectedGroupIndex]]) {
                    var sg = paymentGroups[paymentGroupKeys[selectedGroupIndex]];
                    var sgTotal = sg.subtotal + (sg.taxTotal || 0);

                    html += '<div class="gas-group-detail" style="border:2px solid #2563eb;border-radius:12px;margin-top:8px;overflow:hidden;">';

                    // Price summary header
                    html += '<div style="padding:16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">';
                    html += '<div style="font-weight:700;font-size:15px;color:#1e293b;margin-bottom:12px;">Payment ' + (selectedGroupIndex + 1) + ' Summary</div>';

                    // Room lines
                    sg.items.forEach(function(item) {
                        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;">';
                        html += '<span style="color:#374151;">' + escapeHtml(item.name) + '</span>';
                        html += '<span style="font-weight:600;color:#374151;">' + formatPrice(item.totalPrice, item.currency) + '</span>';
                        html += '</div>';
                    });

                    // Taxes
                    if (sg.taxes && sg.taxes.length > 0) {
                        sg.taxes.forEach(function(tax) {
                            html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#6b7280;">';
                            html += '<span>' + tax.label + '</span>';
                            html += '<span>' + formatPrice(tax.amount, sg.currency) + '</span>';
                            html += '</div>';
                        });
                    }

                    // Total line
                    html += '<div style="display:flex;justify-content:space-between;padding:12px 0 0;margin-top:8px;border-top:2px solid #e2e8f0;font-weight:700;font-size:16px;color:#1e293b;">';
                    html += '<span>Total</span>';
                    html += '<span>' + formatPrice(sgTotal, sg.currency) + '</span>';
                    html += '</div>';

                    // Deposit info
                    if (sg.depositRule && sg.balanceAmount > 0) {
                        if (sg.depositAmount > 0) {
                            html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#2563eb;">';
                            html += '<span>Deposit due now</span>';
                            html += '<span>' + formatPrice(sg.depositAmount, sg.currency) + '</span>';
                            html += '</div>';
                        }
                        html += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#6b7280;">';
                        if (sg.depositAmount === 0) {
                            html += '<span>Balance — card charged before arrival</span>';
                        } else {
                            html += '<span>Balance at check-in</span>';
                        }
                        html += '<span>' + formatPrice(sg.balanceAmount, sg.currency) + '</span>';
                        html += '</div>';
                    }

                    html += '</div>'; // close price summary

                    // Payment form
                    html += '<div class="gas-group-payment-form" style="padding:16px;">';
                    html += originalStep3Html;
                    html += '</div>';

                    html += '</div>'; // close detail
                } else if (Object.keys(completedGroups).length < totalGroups) {
                    // Prompt to select
                    html += '<div style="text-align:center;padding:32px 16px;color:#9ca3af;font-size:14px;">';
                    html += '<div style="font-size:24px;margin-bottom:8px;">&#9757;</div>';
                    html += 'Select a payment group above to view details and pay.';
                    html += '</div>';
                }

                html += '</div>'; // close stepper

                // Replace step 3 content
                $('.gas-checkout-step-content[data-step="3"]').html(html);

                // Show step 3
                $('.gas-checkout-step-content').hide();
                $('.gas-checkout-step-content[data-step="3"]').show();

                // Update step indicators
                $('.gas-step').removeClass('active completed');
                $('.gas-step[data-step="1"]').addClass('completed');
                $('.gas-step[data-step="2"]').addClass('completed');
                $('.gas-step[data-step="3"]').addClass('active');

                // Load payment setup if a group is selected
                if (selectedGroupIndex >= 0 && !completedGroups[paymentGroupKeys[selectedGroupIndex]]) {
                    currentPaymentGroupIndex = selectedGroupIndex;
                    window.groupCheckoutData.currentPaymentGroupIndex = currentPaymentGroupIndex;
                    loadGroupPaymentSetup();
                }
            }

            // Click handler for selectable group cards (delegated)
            $(document).on('click', '.gas-group-selectable', function() {
                var idx = parseInt($(this).data('group-idx'));
                if (isNaN(idx)) return;
                selectedGroupIndex = idx;
                showMultiGroupStepper();
            });

            function loadGroupPaymentSetup() {
                var cg = getCurrentGroup();
                if (!cg || !cg.propertyId) return;

                // Reset payment form state for new group
                $('.gas-payment-option').removeClass('selected disabled');
                $('.gas-payment-option input').prop('checked', false).prop('disabled', false);
                $('.gas-payment-card-option').addClass('disabled').find('input').prop('disabled', true);
                $('.gas-payment-card-option .gas-card-status').text('Loading...');
                $('.gas-payment-card-guarantee-option').hide();
                $('.gas-stripe-form').hide();
                $('.gas-card-guarantee-form').hide();
                $('.gas-bank-transfer-panel').hide();
                // Select pay_at_property by default
                var $pap = $('.gas-payment-option').filter(function() { return $(this).find('input[value="pay_at_property"]').length > 0; });
                $pap.addClass('selected').find('input').prop('checked', true);

                // Card guarantee check
                $.ajax({
                    url: apiUrl + '/api/public/property/' + cg.propertyId + '/card-guarantee-info?lang=' + currentLanguage,
                    method: 'GET',
                    success: function(response) {
                        if (response.success && response.card_guarantee_enabled) {
                            window.groupCheckoutData.cardGuaranteeEnabled = true;
                            window.gasCardGuaranteeProvider = response.provider || 'enigma';
                            var $cgOption = $('.gas-payment-card-guarantee-option');
                            $cgOption.show().find('input').prop('disabled', false);
                            if (response.label) $cgOption.find('.gas-card-guarantee-label').text(response.label);
                            if (response.description) $cgOption.find('.gas-card-guarantee-desc').text(response.description);
                            if (response.success_message) window.gasEnigmaSuccessMessage = response.success_message;
                        }
                    }
                });

                // Stripe info
                $.ajax({
                    url: apiUrl + '/api/public/property/' + cg.propertyId + '/stripe-info',
                    method: 'GET',
                    success: function(response) {
                        var group = getCurrentGroup();

                        // Payment methods and bank details
                        if (response.payment_methods) {
                            var methods = response.payment_methods;
                            var $payAtProp = $('.gas-payment-option').filter(function() { return $(this).find('input[value="pay_at_property"]').length > 0; });
                            if (methods.pay_at_property === false) $payAtProp.hide();
                            if (methods.card === false) $('.gas-payment-card-option').hide();
                        }
                        if (response.pay_property_mode) window.gasPayPropertyMode = response.pay_property_mode;
                        if (response.bank_details) window.gasBankDetails = response.bank_details;

                        if (response.pay_property_mode === 'bank_required') {
                            var $bp = $('.gas-payment-option').filter(function() { return $(this).find('input[value="pay_at_property"]').length > 0; });
                            $bp.find('.gas-payment-details span').text('Bank transfer required — booking held until payment received');
                        } else if (response.pay_property_mode === 'bank_optional' && response.bank_details) {
                            var $bp2 = $('.gas-payment-option').filter(function() { return $(this).find('input[value="pay_at_property"]').length > 0; });
                            $bp2.find('.gas-payment-details span').text('Pay by bank transfer or cash on arrival');
                        }

                        // Auto-select pay at property if card not available
                        if (!response.stripe_enabled && response.payment_methods && response.payment_methods.pay_at_property !== false) {
                            var $pap3 = $('.gas-payment-option').filter(function() { return $(this).find('input[value="pay_at_property"]').length > 0; });
                            $pap3.addClass('selected').find('input').prop('checked', true).prop('disabled', false).trigger('change');
                            var mode = window.gasPayPropertyMode || 'no_payment';
                            if ((mode === 'bank_optional' || mode === 'bank_required') && window.gasBankDetails) {
                                window.gasRenderBankDetails(window.gasBankDetails);
                                $('.gas-bank-transfer-panel').slideDown(200);
                            }
                        }

                        if (response.success && response.stripe_enabled) {
                            group.stripeEnabled = true;

                            if (response.deposit_rule) {
                                group.depositRule = response.deposit_rule;
                                recalcGroupDeposit(group);
                            }

                            var $cardOption = $('.gas-payment-card-option');
                            $cardOption.removeClass('disabled').addClass('stripe-enabled');
                            $cardOption.find('input').prop('disabled', false);
                            $cardOption.find('.gas-card-status').text('Secure payment via Stripe');

                            if (response.payment_methods) {
                                var m = response.payment_methods;
                                var $pp = $('.gas-payment-option').filter(function() { return $(this).find('input[value="pay_at_property"]').length > 0; });
                                var $paypal = $('.gas-payment-option').filter(function() { return $(this).find('input[value="paypal"]').length > 0; });
                                if (m.pay_at_property === false) $pp.hide();
                                if (m.paypal === false) $paypal.hide();
                                if (m.card === false) $cardOption.hide();
                                if (response.pay_property_mode) window.gasPayPropertyMode = response.pay_property_mode;
                                if (response.bank_details) window.gasBankDetails = response.bank_details;
                                if (response.pay_property_mode === 'bank_required') {
                                    $pp.find('.gas-payment-details span').text('Bank transfer required — booking held until payment received');
                                } else if (response.pay_property_mode === 'bank_optional' && response.bank_details) {
                                    $pp.find('.gas-payment-details span').text('Pay by bank transfer or cash on arrival');
                                }
                                var visibleOptions = $('.gas-payment-option:visible');
                                if (visibleOptions.length === 1) {
                                    visibleOptions.addClass('selected').find('input').prop('checked', true).prop('disabled', false).trigger('change');
                                } else if (m.pay_at_property === false && m.card !== false) {
                                    $cardOption.addClass('selected').find('input').prop('checked', true).trigger('change');
                                    $pp.removeClass('selected');
                                }
                            }

                            if (typeof Stripe !== 'undefined') {
                                group.stripe = Stripe(response.stripe_publishable_key, {
                                    stripeAccount: response.stripe_account_id
                                });
                                var elements = group.stripe.elements();
                                group.cardElement = elements.create('card', {
                                    style: {
                                        base: {
                                            fontSize: '16px', color: '#374151',
                                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                            '::placeholder': { color: '#9ca3af' }
                                        },
                                        invalid: { color: '#ef4444' }
                                    }
                                });
                                group.cardElement.mount('#gas-card-element');
                            }
                        }
                    }
                });
            }

            // Override confirm booking for group
            $(document).off('click', '#gas-confirm-booking').on('click', '#gas-confirm-booking', function(e) {
                e.preventDefault();

                var $btn = $(this);
                var $form = $('#gas-guest-form');

                // For multi-group, form is on step 1 (already validated). Skip re-validation.
                if (!hasMultiplePaymentGroups) {
                    if (!$form[0].checkValidity()) {
                        $form[0].reportValidity();
                        return;
                    }
                }

                if (!$('#gas-terms').is(':checked')) {
                    alert('Please accept the Terms & Conditions');
                    return;
                }
                
                $btn.find('.gas-btn-text').hide();
                $btn.find('.gas-btn-loading').show();
                $btn.prop('disabled', true);
                
                var paymentMethod = window.groupCheckoutData.paymentMethod || 'property';

                // Get current payment group
                var curGroup = getCurrentGroup();
                var currentItems = curGroup.items;

                // If card payment, process Stripe first
                if (paymentMethod === 'card' && curGroup.stripe && curGroup.cardElement) {
                    // Payment amount from current group's deposit or full total
                    var paymentAmount = curGroup.depositAmount || (curGroup.subtotal + (curGroup.taxTotal || 0));
                    var currencyCode = (curGroup.currency || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 3);

                    // If deposit is 0 (deferred payment), create SetupIntent to save card
                    if (curGroup.depositAmount === 0 && curGroup.balanceAmount > 0) {
                        console.log('[Deferred Payment] Group: 0% deposit — creating SetupIntent');
                        $btn.find('.gas-btn-loading').text(t('payment', 'securing_card', 'Securing card...')).show();
                        $.ajax({
                            url: window.groupCheckoutData.apiUrl + '/api/public/create-setup-intent',
                            method: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({
                                property_id: curGroup.propertyId,
                                booking_data: {
                                    email: $form.find('[name="email"]').val(),
                                    check_in: window.groupCheckoutData.checkin,
                                    check_out: window.groupCheckoutData.checkout
                                }
                            }),
                            success: function(response) {
                                if (response.success && (response.client_secret || response.setup_intent_client_secret)) {
                                    var clientSecret = response.client_secret || response.setup_intent_client_secret;
                                    curGroup.stripe.confirmCardSetup(clientSecret, {
                                        payment_method: {
                                            card: curGroup.cardElement,
                                            billing_details: {
                                                name: $form.find('[name="first_name"]').val() + ' ' + $form.find('[name="last_name"]').val(),
                                                email: $form.find('[name="email"]').val()
                                            }
                                        }
                                    }).then(function(result) {
                                        if (result.error) {
                                            $('#gas-card-errors').text(result.error.message);
                                            $btn.prop('disabled', false);
                                            $btn.find('.gas-btn-text').show();
                                            $btn.find('.gas-btn-loading').hide();
                                        } else {
                                            window.gasStripeSetupIntentId = result.setupIntent.id;
                                            window.gasStripePaymentMethodId = result.setupIntent.payment_method;
                                            submitGroupBooking($btn, $form, null);
                                        }
                                    });
                                } else {
                                    alert('Failed to initialize card setup: ' + (response.error || 'Please try again'));
                                    $btn.prop('disabled', false);
                                    $btn.find('.gas-btn-text').show();
                                    $btn.find('.gas-btn-loading').hide();
                                }
                            },
                            error: function() {
                                alert('Payment service unavailable. Please try again.');
                                $btn.prop('disabled', false);
                                $btn.find('.gas-btn-text').show();
                                $btn.find('.gas-btn-loading').hide();
                            }
                        });
                        return;
                    }

                    // Create payment intent - use current group's property
                    $.ajax({
                        url: window.groupCheckoutData.apiUrl + '/api/public/create-payment-intent',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            property_id: curGroup.propertyId,
                            amount: paymentAmount,
                            currency: currencyCode,
                            booking_data: {
                                email: $form.find('[name="email"]').val(),
                                check_in: window.groupCheckoutData.checkin,
                                check_out: window.groupCheckoutData.checkout
                            }
                        }),
                        success: function(response) {
                            if (response.success && response.client_secret) {
                                // Store customer ID for booking creation
                                if (response.stripe_customer_id) {
                                    window.groupCheckoutData.stripeCustomerId = response.stripe_customer_id;
                                }
                                // Confirm card payment with current group's Stripe
                                curGroup.stripe.confirmCardPayment(response.client_secret, {
                                    payment_method: {
                                        card: curGroup.cardElement,
                                        billing_details: {
                                            name: $form.find('[name="first_name"]').val() + ' ' + $form.find('[name="last_name"]').val(),
                                            email: $form.find('[name="email"]').val()
                                        }
                                    }
                                }).then(function(result) {
                                    if (result.error) {
                                        $('#gas-card-errors').text(result.error.message);
                                        $btn.prop('disabled', false);
                                        $btn.find('.gas-btn-text').show();
                                        $btn.find('.gas-btn-loading').hide();
                                        window.gasNotifyPaymentFailed('card', result.error.message);
                                    } else if (result.paymentIntent.status === 'succeeded') {
                                        submitGroupBooking($btn, $form, result.paymentIntent.id);
                                    } else if (result.paymentIntent.status === 'processing') {
                                        submitGroupBooking($btn, $form, result.paymentIntent.id);
                                    } else if (result.paymentIntent.status === 'requires_action') {
                                        $('#gas-card-errors').text('Your card requires additional verification. Please try again or use a different card.');
                                        $btn.prop('disabled', false);
                                        $btn.find('.gas-btn-text').show();
                                        $btn.find('.gas-btn-loading').hide();
                                        window.gasNotifyPaymentFailed('card', '3DS authentication incomplete');
                                    } else {
                                        $('#gas-card-errors').text('Payment could not be completed. Please try again or use a different card.');
                                        $btn.prop('disabled', false);
                                        $btn.find('.gas-btn-text').show();
                                        $btn.find('.gas-btn-loading').hide();
                                        window.gasNotifyPaymentFailed('card', 'Unexpected payment status: ' + result.paymentIntent.status);
                                    }
                                });
                            } else {
                                alert('Failed to initialize payment: ' + (response.error || 'Please try again'));
                                $btn.prop('disabled', false);
                                $btn.find('.gas-btn-text').show();
                                $btn.find('.gas-btn-loading').hide();
                                window.gasNotifyPaymentFailed('card', 'Payment initialization failed: ' + (response.error || 'Unknown'));
                            }
                        },
                        error: function() {
                            alert('Payment service unavailable. Please try again.');
                            $btn.prop('disabled', false);
                            $btn.find('.gas-btn-text').show();
                            $btn.find('.gas-btn-loading').hide();
                        }
                    });
                } else if (paymentMethod === 'card_guarantee') {
                    if (window.gasCardGuaranteeProvider === 'stripe' && curGroup.stripe && curGroup.cardElement) {
                        // Stripe SetupIntent card guarantee
                        var doConfirm = function(clientSecret) {
                            curGroup.stripe.confirmCardSetup(clientSecret, {
                                payment_method: {
                                    card: curGroup.cardElement,
                                    billing_details: {
                                        name: $form.find('[name="first_name"]').val() + ' ' + $form.find('[name="last_name"]').val(),
                                        email: $form.find('[name="email"]').val()
                                    }
                                }
                            }).then(function(result) {
                                if (result.error) {
                                    $('#gas-card-errors').text(result.error.message);
                                    $btn.prop('disabled', false);
                                    $btn.find('.gas-btn-text').show();
                                    $btn.find('.gas-btn-loading').hide();
                                } else {
                                    window.gasStripeSetupIntentId = result.setupIntent.id;
                                    window.gasStripePaymentMethodId = result.setupIntent.payment_method;
                                    submitGroupBooking($btn, $form, null);
                                }
                            });
                        };
                        if (curGroup.cardGuaranteeClientSecret) {
                            doConfirm(curGroup.cardGuaranteeClientSecret);
                        } else {
                            $.ajax({
                                url: window.groupCheckoutData.apiUrl + '/api/public/create-setup-intent',
                                method: 'POST',
                                contentType: 'application/json',
                                data: JSON.stringify({
                                    property_id: curGroup.propertyId,
                                    booking_data: {
                                        email: $form.find('[name="email"]').val(),
                                        check_in: window.groupCheckoutData.checkin,
                                        check_out: window.groupCheckoutData.checkout
                                    }
                                }),
                                success: function(response) {
                                    if (response.success && response.client_secret) {
                                        doConfirm(response.client_secret);
                                    } else {
                                        alert('Failed to initialize card guarantee: ' + (response.error || 'Please try again'));
                                        $btn.prop('disabled', false);
                                        $btn.find('.gas-btn-text').show();
                                        $btn.find('.gas-btn-loading').hide();
                                    }
                                },
                                error: function() {
                                    alert('Card guarantee service unavailable. Please try again.');
                                    $btn.prop('disabled', false);
                                    $btn.find('.gas-btn-text').show();
                                    $btn.find('.gas-btn-loading').hide();
                                }
                            });
                        }
                    } else if (window.gasCardGuaranteeProvider === 'stripe') {
                        alert(t('payment', 'card_form_not_loaded', 'Card form not loaded. Please re-select Card Guarantee.'));
                        $btn.prop('disabled', false);
                        $btn.find('.gas-btn-text').show();
                        $btn.find('.gas-btn-loading').hide();
                        return;
                    } else {
                        // Enigma card guarantee
                        if (!window.gasEnigmaCardCaptured) {
                            alert('Please complete the secure card form before confirming your booking.');
                            $btn.prop('disabled', false);
                            $btn.find('.gas-btn-text').show();
                            $btn.find('.gas-btn-loading').hide();
                            return;
                        }
                        submitGroupBooking($btn, $form, null);
                    }
                } else {
                    // Pay at property - submit directly
                    submitGroupBooking($btn, $form, null);
                }
            });
            
            function submitGroupBooking($btn, $form, paymentIntentId) {
                $btn.find('.gas-btn-loading').text(t('booking', 'confirming', 'Confirming booking...'));
                
                // Save email to groupCheckoutData for confirmation page
                window.groupCheckoutData.guestEmail = $form.find('[name="email"]').val();
                
                // Submit current payment group
                var submitGroup = getCurrentGroup();
                var itemsToSubmit = submitGroup.items;

                var postData = {
                    rooms: itemsToSubmit.map(function(item) {
                        return {
                            roomId: item.roomId,
                            propertyId: item.propertyId,
                            totalPrice: item.totalPrice,
                            guests: item.guests,
                            name: item.name,
                            currency: item.currency
                        };
                    }),
                    currency: submitGroup.currency,
                    checkin: window.groupCheckoutData.checkin,
                    checkout: window.groupCheckoutData.checkout,
                    guest_first_name: $form.find('[name="first_name"]').val(),
                    guest_last_name: $form.find('[name="last_name"]').val(),
                    guest_email: $form.find('[name="email"]').val(),
                    guest_phone: $form.find('[name="phone"]').val(),
                    guest_address: $form.find('[name="address"]').val() || '',
                    guest_city: $form.find('[name="city"]').val() || '',
                    guest_country: $form.find('[name="country"]').val() || '',
                    guest_postcode: $form.find('[name="postcode"]').val() || '',
                    notes: $form.find('[name="notes"]').val() || '',
                    payment_method: window.groupCheckoutData.paymentMethod || 'property',
                    stripe_payment_intent_id: paymentIntentId || null,
                    stripe_customer_id: window.groupCheckoutData.stripeCustomerId || null,
                    deposit_amount: submitGroup.depositAmount || null,
                    upsells: submitGroup.selectedUpsells || [],
                    enigma_reference_id: window.gasEnigmaReferenceId || null,
                    stripe_setup_intent_id: window.gasStripeSetupIntentId || null,
                    stripe_payment_method_id: window.gasStripePaymentMethodId || null,
                    source_site_url: window.location.origin + window.location.pathname,
                    total_amount: submitGroup.subtotal + (submitGroup.taxTotal || 0)
                };

                console.log('GAS: Submitting group booking', postData);

                $.ajax({
                    url: window.groupCheckoutData.apiUrl + '/api/public/create-group-booking',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(postData),
                    success: function(response) {
                        if (response.success) {
                            // Handle multi-group: mark group paid, re-render stepper
                            if (hasMultiplePaymentGroups) {
                                var completedKey = paymentGroupKeys[currentPaymentGroupIndex];
                                completedGroups[completedKey] = {
                                    bookingRef: response.group_booking_id || 'Confirmed'
                                };
                                selectedGroupIndex = -1; // deselect

                                // Check if all groups are now paid
                                if (Object.keys(completedGroups).length < paymentGroupKeys.length) {
                                    // More groups to pay — re-render stepper
                                    showMultiGroupStepper();
                                    $('html, body').animate({scrollTop: 0}, 300);
                                    return;
                                }
                                // else fall through to show final confirmation
                            }

                            // All payments complete - clear cart and show final confirmation
                            localStorage.removeItem('gas_cart');
                            
                            // Show confirmation
                            $('.gas-checkout-step-content').hide();
                            $('.gas-checkout-confirmation').show();
                            
                            // Reset confirmation elements
                            $('.gas-conf-rooms-list').empty().hide();
                            $('.gas-conf-extras-list').empty().hide();
                            $('.gas-conf-room-name').show();
                            $('.gas-booking-ref').removeClass('gas-ref-small');
                            
                            $('.gas-booking-ref').text(response.group_booking_id || 'Confirmed').addClass('gas-ref-small');
                            
                            // Show property name
                            $('.gas-conf-property-name').text('Group Booking - ' + window.groupCheckoutData.items.length + ' room(s)');
                            $('.gas-conf-room-name').hide();

                            // Build individual room boxes — per-item currency from ALL groups
                            var roomsHtml = '';
                            window.groupCheckoutData.items.forEach(function(item) {
                                var guests = parseInt(item.guests) || 1;
                                roomsHtml += '<div class="gas-conf-room-box">';
                                roomsHtml += '<div><span class="room-name">' + escapeHtml(item.name) + '</span>';
                                roomsHtml += '<div class="room-guests">' + guests + ' guest' + (guests > 1 ? 's' : '') + '</div></div>';
                                roomsHtml += '<span class="room-price">' + formatPrice(item.price || item.totalPrice, item.currency) + '</span>';
                                roomsHtml += '</div>';
                            });
                            $('.gas-conf-rooms-list').html(roomsHtml).show();

                            // Fill in dates
                            $('.gas-conf-checkin').text(window.groupCheckoutData.checkin);
                            $('.gas-conf-checkout').text(window.groupCheckoutData.checkout);

                            // Fill in guests
                            var totalGuests = 0;
                            window.groupCheckoutData.items.forEach(function(item) {
                                totalGuests += parseInt(item.guests) || 1;
                            });
                            $('.gas-conf-guests').text(totalGuests + ' guest(s)');

                            // Fill in pricing — per-group totals for multi-currency
                            if (hasMultiplePaymentGroups) {
                                var totalsHtml = '';
                                paymentGroupKeys.forEach(function(gKey) {
                                    var g = paymentGroups[gKey];
                                    var gTotal = g.subtotal + (g.taxTotal || 0);
                                    totalsHtml += formatPrice(gTotal, g.currency);
                                    if (gKey !== paymentGroupKeys[paymentGroupKeys.length - 1]) totalsHtml += ' + ';
                                });
                                $('.gas-conf-total').text(totalsHtml);
                            } else {
                                var confGroup = getCurrentGroup();
                                var confTotal = confGroup.subtotal + (confGroup.taxTotal || 0);
                                $('.gas-conf-total').text(formatPrice(confTotal, confGroup.currency));
                                if (confGroup.depositAmount) {
                                    $('.gas-conf-deposit').text(formatPrice(confGroup.depositAmount, confGroup.currency));
                                }
                                if (confGroup.balanceAmount > 0) {
                                    $('.gas-conf-balance').text(formatPrice(confGroup.balanceAmount, confGroup.currency));
                                }
                            }
                            
                            // Fill in email - use saved value from groupCheckoutData
                            var guestEmail = window.groupCheckoutData.guestEmail || $form.find('[name="email"]').val() || '';
                            $('.gas-confirmation-email-text').html('📧 ' + t('booking', 'confirmation_sent', 'Confirmation sent to') + ': <strong>' + guestEmail + '</strong>');
                            
                            // Show bank details on confirmation only for pay_at_property with bank transfer
                            if (window.groupCheckoutData.paymentMethod === 'pay_at_property' && window.gasBankDetails && window.gasBankDetails.accounts && window.gasBankDetails.accounts.length > 0) {
                                var bankHtml = '<div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-top: 16px; text-align: left;">';
                                bankHtml += '<h4 style="margin: 0 0 12px 0; color: #92400e; font-size: 14px;">' + t('payment', 'bank_transfer_details', 'Bank Transfer Details') + '</h4>';
                                window.gasBankDetails.accounts.forEach(function(account) {
                                    bankHtml += '<div style="background: white; border-radius: 8px; padding: 12px; margin-bottom: 8px; border: 1px solid #fde68a;">';
                                    if (account.bank_name) bankHtml += '<div style="font-weight: 600; color: #92400e; margin-bottom: 6px;">' + account.bank_name + '</div>';
                                    bankHtml += '<table style="width: 100%; font-size: 13px; border-collapse: collapse;">';
                                    if (account.account_name) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c; width: 40%;">Account Name</td><td style="padding: 3px 0; font-weight: 500;">' + account.account_name + '</td></tr>';
                                    if (account.account_number) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">Account No.</td><td style="padding: 3px 0; font-family: monospace;">' + account.account_number + '</td></tr>';
                                    if (account.sort_code) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">Sort Code</td><td style="padding: 3px 0; font-family: monospace;">' + account.sort_code + '</td></tr>';
                                    if (account.iban) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">IBAN</td><td style="padding: 3px 0; font-family: monospace;">' + account.iban + '</td></tr>';
                                    if (account.swift_bic) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">SWIFT/BIC</td><td style="padding: 3px 0; font-family: monospace;">' + account.swift_bic + '</td></tr>';
                                    bankHtml += '</table></div>';
                                });
                                if (window.gasBankDetails.instructions) bankHtml += '<p style="margin: 8px 0 0 0; font-size: 12px; color: #b45309; font-style: italic;">' + window.gasBankDetails.instructions + '</p>';
                                if (window.gasBankDetails.deadline_hours > 0) { var dt = window.gasBankDetails.deadline_hours >= 24 ? Math.floor(window.gasBankDetails.deadline_hours/24) + ' day(s)' : window.gasBankDetails.deadline_hours + ' hours'; bankHtml += '<p style="margin: 8px 0 0; font-size: 12px; color: #b45309; text-align: center;">⏰ Please transfer within ' + dt + '</p>'; }
                                bankHtml += '</div>';
                                $('.gas-confirmation-email-text').after(bankHtml);
                            }
                            
                            $('html, body').animate({scrollTop: 0}, 300);
                        } else {
                            alert('Booking failed: ' + (response.error || 'Please try again'));
                            $btn.find('.gas-btn-text').show();
                            $btn.find('.gas-btn-loading').hide();
                            $btn.prop('disabled', false);
                        }
                    },
                    error: function(xhr) {
                        var errorMsg = t('common', 'connection_error', 'Connection error');
                        try {
                            var resp = JSON.parse(xhr.responseText);
                            if (resp.error) errorMsg = resp.error;
                        } catch(e) {}
                        console.log('GAS: Group booking error', xhr.status, xhr.responseText);
                        alert('Booking error: ' + errorMsg);
                        $btn.find('.gas-btn-text').show();
                        $btn.find('.gas-btn-loading').hide();
                        $btn.prop('disabled', false);
                    }
                });
            }
            
            // Load upsells for single-group only (multi-group loads per-group via stepper)
            if (hasMultiplePaymentGroups) {
                // Hide upsell step label for multi-group — upsells skipped
                $('.gas-step[data-step="2"] .gas-step-label').text('Payments');
            }
            var upsellGroup = getCurrentGroup();
            if (!hasMultiplePaymentGroups && clientId && upsellGroup.items[0] && upsellGroup.items[0].roomId) {
                $('.gas-upsells-loading').show();
                // Pass dates so the server can gate companion-linked upsells
                // (e.g. Bike Storage) on the companion unit's availability.
                var upsellCi = upsellGroup.checkin || document.querySelector('.gas-checkin')?.value || '';
                var upsellCo = upsellGroup.checkout || document.querySelector('.gas-checkout')?.value || '';
                var upsellDateParams = (upsellCi && upsellCo) ? ('&check_in=' + upsellCi + '&check_out=' + upsellCo) : '';
                $.ajax({
                    url: apiUrl + '/api/public/client/' + clientId + '/upsells?unit_id=' + upsellGroup.items[0].roomId + '&lang=' + currentLanguage + upsellDateParams,
                    method: 'GET',
                    success: function(response) {
                        $('.gas-upsells-loading').hide();
                        var ug = getCurrentGroup();
                        if (response.success && response.upsells && response.upsells.length > 0) {
                            // Cache full upsell records by ID for the click handler.
                            window._gasUpsellMap = window._gasUpsellMap || {};
                            response.upsells.forEach(function(u) { window._gasUpsellMap[String(u.id)] = u; });
                            var html = '';
                            var perNight = '/' + t('booking', 'night', 'night');
                            var perGuest = '/' + t('booking', 'guest', 'guest');
                            // Calculate nights for night-range filtering
                            var bookingNights = 0;
                            var ci = ug?.checkin || document.querySelector('.gas-checkin')?.value;
                            var co = ug?.checkout || document.querySelector('.gas-checkout')?.value;
                            if (ci && co) {
                                bookingNights = Math.round((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
                            }
                            response.upsells.forEach(function(upsell) {
                                // Filter by night range if set
                                if (bookingNights > 0) {
                                    if (upsell.min_nights && bookingNights < upsell.min_nights) return;
                                    if (upsell.max_nights && bookingNights > upsell.max_nights) return;
                                }
                                // Date-bound upsell — compute the valid dates within the guest's
                                // stay and skip the card entirely when nothing intersects.
                                var validDates = null;
                                if (upsell.requires_date) {
                                    validDates = computeValidUpsellDates(upsell, ci, co);
                                    if (!validDates.length) return;
                                }
                                var priceLabel = '';
                                switch(upsell.charge_type) {
                                    case 'per_night': priceLabel = perNight; break;
                                    case 'per_guest': priceLabel = perGuest; break;
                                    case 'per_guest_per_night': priceLabel = perGuest + perNight; break;
                                    default: priceLabel = '';
                                }

                                var isMandatory = upsell.mandatory === true || upsell.mandatory === 'true';
                                var fnpAttr = (upsell.first_night_price !== undefined && upsell.first_night_price !== null) ? upsell.first_night_price : '';
                                var snpAttr = (upsell.subsequent_night_price !== undefined && upsell.subsequent_night_price !== null) ? upsell.subsequent_night_price : '';
                                var inclAttr = (upsell.included_nights_per_unit !== undefined && upsell.included_nights_per_unit !== null) ? upsell.included_nights_per_unit : '';
                                var nameAttr = (upsell.name || '').replace(/"/g, '&quot;');
                                html += '<div class="gas-upsell-card' + (isMandatory ? ' selected mandatory' : '') + '" data-upsell-id="' + upsell.id + '" data-upsell-name="' + nameAttr + '" data-price="' + upsell.price + '" data-charge-type="' + (upsell.charge_type || 'per_booking') + '" data-first-night-price="' + fnpAttr + '" data-subsequent-night-price="' + snpAttr + '" data-included-nights-per-unit="' + inclAttr + '" data-mandatory="' + isMandatory + '">';

                                // Icon based on name
                                var icon = '✨';
                                var nameLower = (upsell.name || '').toLowerCase();
                                if (nameLower.includes('parking')) icon = '🚗';
                                else if (nameLower.includes('breakfast')) icon = '🍳';
                                else if (nameLower.includes('dog') || nameLower.includes('pet')) icon = '🐕';
                                else if (nameLower.includes('towel')) icon = '🛁';
                                else if (nameLower.includes('wine') || nameLower.includes('champagne')) icon = '🍾';
                                else if (nameLower.includes('flower') || nameLower.includes('roses')) icon = '💐';
                                else if (nameLower.includes('spa') || nameLower.includes('massage')) icon = '💆';
                                else if (nameLower.includes('airport') || nameLower.includes('transfer')) icon = '🚐';
                                else if (nameLower.includes('late') || nameLower.includes('early')) icon = '🕐';
                                else if (nameLower.includes('cot') || nameLower.includes('baby') || nameLower.includes('crib')) icon = '👶';
                                html += '<div class="gas-upsell-icon">' + icon + '</div>';

                                html += '<div class="gas-upsell-info">';
                                html += '<div class="gas-upsell-name">' + upsell.name + '</div>';
                                if (upsell.description) {
                                    html += '<div class="gas-upsell-desc gas-upsell-desc-clamp">' + upsell.description + '</div>';
                                    html += '<a class="gas-upsell-desc-more" onclick="event.stopPropagation()">more</a>';
                                }
                                html += '<div class="gas-upsell-price">' + upsellPriceCardHtml(upsell, ug.currency, formatPrice) + '</div>';
                                // Date-bound upsell — single dropdown to pick the date for all tickets.
                                // (Earlier per-date stepper UX got noisy on long stays.)
                                if (validDates && validDates.length) {
                                    var optsHtml = validDates.map(function(d){ return '<option value="' + d + '">' + formatUpsellDate(d) + '</option>'; }).join('');
                                    html += '<div class="gas-upsell-date-row" style="margin-top:6px;">';
                                    html += '<label style="font-size:0.78rem;color:#64748b;display:block;margin-bottom:2px;">Pick date:</label>';
                                    html += '<select class="gas-upsell-date" onclick="event.stopPropagation()" style="padding:4px 8px;font-size:0.85rem;border:1px solid #cbd5e1;border-radius:4px;background:#fff;">' + optsHtml + '</select>';
                                    html += '</div>';
                                }
                                html += '</div>';

                                html += '<div class="gas-upsell-check">✓</div>';
                                html += '</div>';
                            });
                            $('.gas-checkout-upsells').html(html);
                            $(document).trigger('gas:upsells-rendered');

                            // Auto-add mandatory upsells to ug.selectedUpsells. Multi-group
                            // convention: store TOTAL (after charge_type multiplication),
                            // matching the click handler at the .gas-upsell-card listener.
                            if (!Array.isArray(ug.selectedUpsells)) ug.selectedUpsells = [];
                            var ugNights = (ug.items && ug.items[0] && ug.items[0].nights) || 1;
                            var ugGuests = (ug.items || []).reduce(function(sum, item) { return sum + (item.guests || 1); }, 0) || 1;
                            response.upsells.forEach(function(upsell) {
                                var isMandatory = upsell.mandatory === true || upsell.mandatory === 'true';
                                if (!isMandatory) return;
                                if (bookingNights > 0) {
                                    if (upsell.min_nights && bookingNights < upsell.min_nights) return;
                                    if (upsell.max_nights && bookingNights > upsell.max_nights) return;
                                }
                                var alreadyAdded = ug.selectedUpsells.some(function(u) { return String(u.id) === String(upsell.id); });
                                if (alreadyAdded) return;
                                var actualPrice = calculateUpsellLineTotal(upsell, ugNights, ugGuests);
                                ug.selectedUpsells.push({
                                    id: upsell.id,
                                    name: upsell.name,
                                    price: actualPrice,
                                    charge_type: upsell.charge_type,
                                    mandatory: true
                                });
                            });

                            // Pre-tick any upsells listed in ?prefill_upsells.
                            // This is the single mechanism — bike-storage or
                            // any add-on landing here arrives with the ID(s)
                            // in the URL (set by the widget) and the existing
                            // upsell click handler updates the price details.
                            try {
                                var sp = new URLSearchParams(window.location.search);
                                var prefillRaw = sp.get('prefill_upsells');
                                var prefillQty = parseInt(sp.get('prefill_quantity')) || 1;
                                if (prefillRaw) {
                                    var prefillIds = prefillRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
                                    prefillIds.forEach(function(id) {
                                        var $card = $('.gas-upsell-card[data-upsell-id="' + id + '"]').not('.selected');
                                        if ($card.length) {
                                            $card.trigger('click');
                                            var maxQty = parseInt($card.attr('data-max-quantity')) || 1;
                                            var extra = Math.min(prefillQty, maxQty) - 1;
                                            for (var k = 0; k < extra; k++) $card.trigger('click');
                                        }
                                    });
                                }
                            } catch (e) { /* non-fatal */ }
                            // Render mandatory items in PRICE DETAILS + update total
                            var groupMand = ug.selectedUpsells.filter(function(u) { return u.mandatory === true || u.mandatory === 'true'; });
                            if (groupMand.length > 0) {
                                var mandHtml = '';
                                groupMand.forEach(function(u) {
                                    mandHtml += '<div class="gas-price-line"><span>' + u.name + '</span><span>' + formatPrice(u.price, ug.currency) + '</span></div>';
                                });
                                $('.gas-mandatory-extras').html(mandHtml).show();
                                var ugUpsellsTotal = ug.selectedUpsells.reduce(function(sum, u) { return sum + u.price; }, 0);
                                var ugNewTotal = (ug.subtotal || 0) + (ug.taxTotal || 0) + ugUpsellsTotal;
                                $('.gas-grand-total').text(formatPrice(ugNewTotal, ug.currency));
                                if (typeof recalcGroupDeposit === 'function') recalcGroupDeposit(ug);
                            }
                        } else {
                            $('.gas-no-upsells').show();
                        }
                    },
                    error: function() {
                        $('.gas-upsells-loading').hide();
                        $('.gas-no-upsells').show();
                    }
                });
            } else {
                $('.gas-upsells-loading').hide();
                $('.gas-no-upsells').show();
            }
            
            // Load Stripe info for single-group only (multi-group loads via loadGroupPaymentSetup)
            var stripeGroup = getCurrentGroup();
            if (!hasMultiplePaymentGroups && stripeGroup.propertyId) {
                // Check card guarantee availability
                $.ajax({
                    url: apiUrl + '/api/public/property/' + stripeGroup.propertyId + '/card-guarantee-info?lang=' + currentLanguage,
                    method: 'GET',
                    success: function(response) {
                        if (response.success && response.card_guarantee_enabled) {
                            window.groupCheckoutData.cardGuaranteeEnabled = true;
                            window.gasCardGuaranteeProvider = response.provider || 'enigma';
                            var $cgOption = $('.gas-payment-card-guarantee-option');
                            $cgOption.show();
                            $cgOption.find('input').prop('disabled', false);
                            if (response.label) $cgOption.find('.gas-card-guarantee-label').text(response.label);
                            if (response.description) $cgOption.find('.gas-card-guarantee-desc').text(response.description);
                            if (response.success_message) window.gasEnigmaSuccessMessage = response.success_message;
                        }
                    }
                });
                $.ajax({
                    url: apiUrl + '/api/public/property/' + stripeGroup.propertyId + '/stripe-info',
                    method: 'GET',
                    success: function(response) {
                        console.log('GAS: Stripe info response', response);
                        var cg = getCurrentGroup();

                        // Always load payment methods and bank details regardless of Stripe
                        if (response.payment_methods) {
                            var methods = response.payment_methods;
                            var $payAtProperty = $('.gas-payment-option').filter(function() {
                                return $(this).find('input[value="pay_at_property"]').length > 0;
                            });
                            if (methods.pay_at_property === false) $payAtProperty.hide();
                            if (methods.card === false) $('.gas-payment-card-option').hide();
                        }
                        if (response.pay_property_mode) window.gasPayPropertyMode = response.pay_property_mode;
                        if (response.bank_details) window.gasBankDetails = response.bank_details;

                        if (response.pay_property_mode === 'bank_required') {
                            var $pap = $('.gas-payment-option').filter(function() { return $(this).find('input[value="pay_at_property"]').length > 0; });
                            $pap.find('.gas-payment-details span').text('Bank transfer required — booking held until payment received');
                        } else if (response.pay_property_mode === 'bank_optional' && response.bank_details) {
                            var $pap2 = $('.gas-payment-option').filter(function() { return $(this).find('input[value="pay_at_property"]').length > 0; });
                            $pap2.find('.gas-payment-details span').text('Pay by bank transfer or cash on arrival');
                        }

                        // Auto-select pay at property if card not available
                        if (!response.stripe_enabled && response.payment_methods && response.payment_methods.pay_at_property !== false) {
                            var $pap3 = $('.gas-payment-option').filter(function() { return $(this).find('input[value="pay_at_property"]').length > 0; });
                            $pap3.addClass('selected').find('input').prop('checked', true).prop('disabled', false).trigger('change');
                            var mode = window.gasPayPropertyMode || 'no_payment';
                            if ((mode === 'bank_optional' || mode === 'bank_required') && window.gasBankDetails) {
                                window.gasRenderBankDetails(window.gasBankDetails);
                                $('.gas-bank-transfer-panel').slideDown(200);
                            }
                        }

                        if (response.success && response.stripe_enabled) {
                            cg.stripeEnabled = true;

                            // Store deposit rule on current group
                            if (response.deposit_rule) {
                                console.log('GAS: Deposit rule', response.deposit_rule);
                                cg.depositRule = response.deposit_rule;
                                recalcGroupDeposit(cg);
                            }

                            var $cardOption = $('.gas-payment-card-option');
                            $cardOption.removeClass('disabled').addClass('stripe-enabled');
                            $cardOption.find('input').prop('disabled', false);
                            $cardOption.find('.gas-card-status').text('Secure payment via Stripe');

                            // Handle payment method visibility based on account settings
                            if (response.payment_methods) {
                                var methods = response.payment_methods;
                                var $payAtProperty = $('.gas-payment-option').filter(function() {
                                    return $(this).find('input[value="pay_at_property"]').length > 0;
                                });
                                var $paypal = $('.gas-payment-option').filter(function() {
                                    return $(this).find('input[value="paypal"]').length > 0;
                                });

                                if (methods.pay_at_property === false) {
                                    $payAtProperty.hide();
                                }
                                if (methods.paypal === false) {
                                    $paypal.hide();
                                }
                                if (methods.card === false) {
                                    $cardOption.hide();
                                }

                                // Store bank details and pay property mode
                                if (response.pay_property_mode) {
                                    window.gasPayPropertyMode = response.pay_property_mode;
                                }
                                if (response.bank_details) {
                                    window.gasBankDetails = response.bank_details;
                                }

                                // Update Pay at Property description based on mode
                                if (response.pay_property_mode === 'bank_required') {
                                    $payAtProperty.find('.gas-payment-details span').text('Bank transfer required — booking held until payment received');
                                } else if (response.pay_property_mode === 'bank_optional' && response.bank_details) {
                                    $payAtProperty.find('.gas-payment-details span').text('Pay by bank transfer or cash on arrival');
                                }

                                // Auto-select card if it's the only visible option
                                var visibleOptions = $('.gas-payment-option:visible');
                                if (visibleOptions.length === 1) {
                                    visibleOptions.addClass('selected').find('input').prop('checked', true).prop('disabled', false).trigger('change');
                                } else if (methods.pay_at_property === false && methods.card !== false) {
                                    $cardOption.addClass('selected').find('input').prop('checked', true).trigger('change');
                                    $payAtProperty.removeClass('selected');
                                }
                            }

                            if (typeof Stripe !== 'undefined') {
                                cg.stripe = Stripe(response.stripe_publishable_key, {
                                    stripeAccount: response.stripe_account_id
                                });

                                var elements = cg.stripe.elements();
                                cg.cardElement = elements.create('card', {
                                    style: {
                                        base: {
                                            fontSize: '16px',
                                            color: '#374151',
                                            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                            '::placeholder': { color: '#9ca3af' }
                                        },
                                        invalid: { color: '#ef4444' }
                                    }
                                });
                                cg.cardElement.mount('#gas-card-element');
                            }
                        }
                    }
                });
            }
            
            // Step navigation for group bookings
            $(document).on('click', '.gas-next-step', function() {
                var nextStep = $(this).data('next');
                var currentStep = nextStep - 1;

                if (currentStep === 1) {
                    var $form = $('#gas-guest-form');
                    if (!$form[0].checkValidity()) {
                        $form[0].reportValidity();
                        return;
                    }
                    var email = $('#gas-email').val();
                    var confirm = $('#gas-email-confirm').val();
                    if (email !== confirm) {
                        alert('Email addresses do not match.');
                        return;
                    }

                    // Save guest email for later use
                    window.groupCheckoutData.guestEmail = email;

                    // Multi-group: skip extras, go to multi-group stepper
                    if (hasMultiplePaymentGroups) {
                        showMultiGroupStepper();
                        return;
                    }
                }

                $('.gas-checkout-step-content').hide();
                $('.gas-checkout-step-content[data-step="' + nextStep + '"]').show();
                $('.gas-step').removeClass('active completed');
                $('.gas-step').each(function() {
                    var step = $(this).data('step');
                    if (step < nextStep) $(this).addClass('completed');
                    if (step == nextStep) $(this).addClass('active');
                });
                $('html, body').animate({scrollTop: 0}, 300);
            });
            
            $(document).on('click', '.gas-prev-step', function() {
                var prevStep = $(this).data('prev');
                $('.gas-checkout-step-content').hide();
                $('.gas-checkout-step-content[data-step="' + prevStep + '"]').show();
                $('.gas-step').removeClass('active completed');
                $('.gas-step[data-step="' + prevStep + '"]').addClass('active');
            });
            
            // Upsell selection for group bookings — per-group
            $(document).on('click', '.gas-upsell-card', function() {
                var $card = $(this);
                // Mandatory upsells can't be deselected
                if ($card.data('mandatory') === true || $card.data('mandatory') === 'true') return;
                $card.toggleClass('selected');
                var upsellGroup = getCurrentGroup();

                var upsellId = $card.data('upsell-id');
                var upsellName = $card.attr('data-upsell-name') || $card.find('.gas-upsell-name').text();

                // Look up the full upsell record from the cache populated at render
                // time. This carries first_night_price / subsequent_night_price /
                // charge_type as their original API values, sidestepping the
                // data-attribute round-trip that has historically dropped tier
                // fields in some render paths. Falls back to data attributes if
                // cache is empty (e.g. legacy code paths without the cache).
                var fullUpsell = (window._gasUpsellMap || {})[String(upsellId)];
                var upsellForCalc = fullUpsell || {
                    price: parseFloat($card.data('price')) || 0,
                    charge_type: $card.data('charge-type'),
                    first_night_price: $card.data('first-night-price'),
                    subsequent_night_price: $card.data('subsequent-night-price')
                };

                var nights = upsellGroup.items[0].nights || 1;
                var guests = upsellGroup.items.reduce(function(sum, item) { return sum + (item.guests || 1); }, 0);
                var actualPrice = calculateUpsellLineTotal(upsellForCalc, nights, guests);

                if ($card.hasClass('selected')) {
                    var pickedDate = $card.find('.gas-upsell-date').val() || null;
                    var inclPerUnit = parseInt($card.attr('data-included-nights-per-unit')) || null;
                    // selectedUpsells.price is the line total. Don't include
                    // charge_type / tier fields here — calculateUpsellsTotal
                    // recomputes via calculateUpsellLineTotal and would
                    // over-multiply (treat the stored line total as a base
                    // and multiply by nights again). The price field already
                    // carries the correct total.
                    upsellGroup.selectedUpsells.push({
                        id: upsellId,
                        price: actualPrice,
                        name: upsellName,
                        upsell_date: pickedDate,
                        included_nights_per_unit: inclPerUnit
                    });
                } else {
                    upsellGroup.selectedUpsells = upsellGroup.selectedUpsells.filter(function(u) {
                        return u.id !== upsellId;
                    });
                }

                // Update total using current group's values
                var upsellsTotal = upsellGroup.selectedUpsells.reduce(function(sum, u) {
                    return sum + u.price;
                }, 0);
                var newTotal = upsellGroup.subtotal + (upsellGroup.taxTotal || 0) + upsellsTotal;
                $('.gas-grand-total').text(formatPrice(newTotal, upsellGroup.currency));

                // Recalculate deposit using shared helper
                recalcGroupDeposit(upsellGroup);

                // Update upsells display in summary — split mandatory (peers of Accommodation)
                // from optional ("Your Extras"), matching the single-checkout pattern.
                var groupMandatory = upsellGroup.selectedUpsells.filter(function(u) { return u.mandatory === true || u.mandatory === 'true'; });
                var groupOptional  = upsellGroup.selectedUpsells.filter(function(u) { return !(u.mandatory === true || u.mandatory === 'true'); });

                if (groupMandatory.length > 0) {
                    var mandHtml = '';
                    groupMandatory.forEach(function(u) {
                        mandHtml += '<div class="gas-price-line"><span>' + u.name + '</span><span>' + formatPrice(u.price, upsellGroup.currency) + '</span></div>';
                    });
                    $('.gas-mandatory-extras').html(mandHtml).show();
                } else {
                    $('.gas-mandatory-extras').empty().hide();
                }

                if (groupOptional.length > 0) {
                    var extrasHtml = '';
                    groupOptional.forEach(function(u) {
                        extrasHtml += '<div class="gas-price-line"><span>' + u.name + '</span><span>' + formatPrice(u.price, upsellGroup.currency) + '</span></div>';
                    });
                    $('.gas-selected-extras .gas-extras-list').html(extrasHtml);
                    $('.gas-selected-extras').show();
                } else {
                    $('.gas-selected-extras').hide();
                }
            });
            
            // Payment method selection for group bookings
            $(document).on('click', '.gas-payment-option:not(.disabled)', function() {
                $('.gas-payment-option').removeClass('selected');
                $(this).addClass('selected');
                $(this).find('input[type="radio"]').prop('checked', true);
                
                var method = $(this).find('input').val();
                window.groupCheckoutData.paymentMethod = method;
                
                if (method === 'card') {
                    $('.gas-stripe-form').slideDown(200);
                    $('.gas-card-guarantee-form').slideUp(200);
                    $('.gas-bank-transfer-panel').slideUp(200);
                    $('.gas-payment-summary').show();
                    $('.gas-card-guarantee-note').remove();
                } else if (method === 'card_guarantee') {
                    $('.gas-bank-transfer-panel').slideUp(200);
                    if (window.gasCardGuaranteeProvider === 'stripe') {
                        $('.gas-card-guarantee-form').slideUp(200);
                        $('.gas-stripe-form').slideDown(200);
                        var cgGroup = getCurrentGroup();
                        if (cgGroup.stripe && cgGroup.cardElement) {
                            $('#gas-card-errors').text('');
                        } else {
                            $('#gas-card-errors').text('');
                            $('#gas-card-element').html('<div style="text-align:center;padding:12px;color:#64748b;">' + t('payment', 'loading_card_form', 'Loading secure card form...') + '</div>');
                            $.ajax({
                                url: window.groupCheckoutData.apiUrl + '/api/public/create-setup-intent',
                                method: 'POST',
                                contentType: 'application/json',
                                data: JSON.stringify({ property_id: cgGroup.propertyId, booking_data: {} }),
                                success: function(siResp) {
                                    if (siResp.success && siResp.client_secret && siResp.publishable_key) {
                                        cgGroup.cardGuaranteeClientSecret = siResp.client_secret;
                                        cgGroup.cardGuaranteeSetupIntentId = siResp.setup_intent_id;
                                        cgGroup.stripe = Stripe(siResp.publishable_key);
                                        var els = cgGroup.stripe.elements();
                                        cgGroup.cardElement = els.create('card', { style: { base: { fontSize: '16px', color: '#374151', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', '::placeholder': { color: '#9ca3af' } }, invalid: { color: '#ef4444' } } });
                                        cgGroup.cardElement.mount('#gas-card-element');
                                    } else {
                                        $('#gas-card-errors').text(siResp.error || 'Stripe keys not configured for this property.');
                                    }
                                },
                                error: function() {
                                    $('#gas-card-errors').text('Card guarantee service unavailable. Please try again.');
                                }
                            });
                        }
                    } else {
                        $('.gas-stripe-form').slideUp(200);
                        $('.gas-card-guarantee-form').slideDown(200);
                        window.gasLoadEnigmaForm(getCurrentGroup().propertyId);
                    }
                    // Hide deposit info for card guarantee — no charge at booking
                    $('.gas-payment-summary').hide();
                    $('.gas-card-guarantee-note').remove();
                    $('.gas-payment-summary').after('<p class="gas-card-guarantee-note" style="text-align:center;color:#64748b;font-size:0.85rem;margin-top:12px;">' + t('payment', 'card_guarantee_note', 'No charge — your card will be securely held as a guarantee only.') + '</p>');
                } else if (method === 'pay_at_property') {
                    $('.gas-stripe-form').slideUp(200);
                    $('.gas-card-guarantee-form').slideUp(200);
                    var mode = window.gasPayPropertyMode || 'no_payment';
                    if ((mode === 'bank_optional' || mode === 'bank_required') && window.gasBankDetails) {
                        window.gasRenderBankDetails(window.gasBankDetails);
                        $('.gas-bank-transfer-panel').slideDown(200);
                    } else {
                        $('.gas-bank-transfer-panel').slideUp(200);
                    }
                } else {
                    $('.gas-stripe-form').slideUp(200);
                    $('.gas-card-guarantee-form').slideUp(200);
                    $('.gas-bank-transfer-panel').slideUp(200);
                    $('.gas-card-guarantee-note').remove();
                }
            });

            console.log('GAS: Group checkout ready with ' + cart.length + ' rooms');
            return; // Skip single-room checkout code
        }
        // ========================================
        // END GROUP BOOKING
        // ========================================
        
        var checkoutData = {
            unitId: $checkoutPage.data('unit-id'),
            checkin: $checkoutPage.data('checkin'),
            checkout: $checkoutPage.data('checkout'),
            guests: $checkoutPage.data('guests'),
            adults: $checkoutPage.data('adults') || $checkoutPage.data('guests'),
            children: $checkoutPage.data('children') || 0,
            rateType: $checkoutPage.data('rate-type'),
            offerId: parseInt($checkoutPage.data('offer-id')) || null,
            apiUrl: $checkoutPage.data('api-url'),
            clientId: $checkoutPage.data('client-id'),
            propertyId: $checkoutPage.data('property-id'),
            currency: $checkoutPage.data('currency') || '',
            selectedUpsells: [],
            voucherCode: '',
            pricing: {},
            stripeEnabled: false,
            stripe: null,
            cardElement: null,
            depositRule: null,
            selectedOffer: null  // populated by loadSelectedOffer when offerId is present
        };

        // Map a refund_policy code to the human-readable line shown on checkout.
        // Used for both the offer's per-offer policy and the property's deposit_rule fallback.
        function refundPolicyText(code) {
            switch (code) {
                case 'flexible': return 'Full refund up to 24 hours before check-in';
                case 'moderate': return 'Full refund up to 5 days before arrival';
                case 'strict': return '50% refund up to 7 days before arrival';
                case 'refund_90_14': return '90% refund up to 14 days before arrival';
                case 'refund_90_30': return '90% refund up to 30 days before arrival';
                case 'refund_90_60': return '90% refund up to 60 days before arrival';
                case 'refund_60': return '100% refund up to 60 days before arrival';
                case 'refund_30': return '100% refund up to 30 days before arrival';
                case 'refund_14': return '100% refund up to 14 days before arrival';
                case 'non_refundable': return 'Non-refundable';
                default: return '';
            }
        }

        // Pick the policy that should drive the checkout banner. Priority:
        //   1. Offer's refund_policy if it's set AND not 'inherit'
        //   2. Property deposit_rule.refund_policy
        //   3. Empty (caller falls back to the static "Free cancellation" copy)
        function effectiveRefundPolicy() {
            var offerPolicy = checkoutData.selectedOffer && checkoutData.selectedOffer.refund_policy;
            if (offerPolicy && offerPolicy !== 'inherit') return offerPolicy;
            return (checkoutData.depositRule && checkoutData.depositRule.refund_policy) || '';
        }

        function applyCancellationPolicy() {
            var code = effectiveRefundPolicy();
            var text = refundPolicyText(code);
            if (text) {
                $('.gas-policy-standard').html('<p style="font-size: 0.85em; color: #64748b; margin: 0;">📋 ' + text + '</p>').show();
                $('.gas-policy-nonrefund').hide();
            } else {
                // No policy resolved — fall back to the static "Free cancellation" copy.
                $('.gas-policy-standard').show();
                $('.gas-policy-nonrefund').hide();
            }
        }
        
        // Load room details and pricing
        loadCheckoutData();

        // If a specific offer was selected on the room page, fetch its details so the rate
        // badge shows the actual offer name and the cancellation banner reflects the offer's
        // refund_policy (rather than the generic "Special Offer" / non-refundable fallback).
        function loadSelectedOffer() {
            if (!checkoutData.offerId || !checkoutData.clientId) return;
            $.ajax({
                url: checkoutData.apiUrl + '/api/public/client/' + checkoutData.clientId + '/offers?include_future=1&unit_id=' + checkoutData.unitId,
                method: 'GET',
                success: function(response) {
                    if (!response || !response.success || !Array.isArray(response.offers)) return;
                    var match = response.offers.find(function(o) { return parseInt(o.id) === parseInt(checkoutData.offerId); });
                    if (!match) return;
                    checkoutData.selectedOffer = match;
                    // Replace the placeholder "Special Offer" badge with the actual offer name.
                    var name = (match.name && typeof match.name === 'object') ? (match.name.en || Object.values(match.name)[0]) : match.name;
                    if (name) {
                        $('.gas-rate-badge').addClass('offer').text('🎉 ' + name);
                    }
                    // Re-apply cancellation now that we know the offer's refund_policy.
                    applyCancellationPolicy();
                }
            });
        }
        loadSelectedOffer();
        
        // Check Stripe availability (only if property ID already available)
        if (checkoutData.propertyId) {
            loadStripeInfo();
            // Check card guarantee
            $.ajax({
                url: checkoutData.apiUrl + '/api/public/property/' + checkoutData.propertyId + '/card-guarantee-info?lang=' + currentLanguage,
                method: 'GET',
                success: function(response) {
                    if (response.success && response.card_guarantee_enabled) {
                        window.gasCardGuaranteeProvider = response.provider || 'enigma';
                        var $cgOption = $('.gas-payment-card-guarantee-option');
                        $cgOption.show();
                        $cgOption.find('input').prop('disabled', false);
                        if (response.label) $cgOption.find('.gas-card-guarantee-label').text(response.label);
                        if (response.description) $cgOption.find('.gas-card-guarantee-desc').text(response.description);
                        if (response.success_message) window.gasEnigmaSuccessMessage = response.success_message;
                    }
                }
            });
        }
        
        function loadStripeInfo() {
            if (!checkoutData.propertyId) return;

            $.ajax({
                url: checkoutData.apiUrl + '/api/public/property/' + checkoutData.propertyId + '/stripe-info',
                method: 'GET',
                success: function(response) {
                    if (response.success && response.stripe_enabled) {
                        checkoutData.stripeEnabled = true;
                        checkoutData.stripePublishableKey = response.stripe_publishable_key;
                        checkoutData.stripeAccountId = response.stripe_account_id;
                        checkoutData.depositRule = response.deposit_rule;
                        
                        // Enable card payment option
                        var $cardOption = $('.gas-payment-card-option');
                        $cardOption.removeClass('disabled').addClass('stripe-enabled');
                        $cardOption.find('input').prop('disabled', false);
                        $cardOption.find('.gas-card-status').text('Secure payment via Stripe');
                        
                        // Handle payment method visibility based on account settings
                        if (response.payment_methods) {
                            var methods = response.payment_methods;
                            var $payAtProperty = $('.gas-payment-option').filter(function() {
                                return $(this).find('input[value="pay_at_property"]').length > 0;
                            });
                            var $paypal = $('.gas-payment-option').filter(function() {
                                return $(this).find('input[value="paypal"]').length > 0;
                            });
                            
                            if (methods.pay_at_property === false) {
                                $payAtProperty.hide();
                            }
                            if (methods.paypal === false) {
                                $paypal.hide();
                            }
                            if (methods.card === false) {
                                $cardOption.hide();
                            }
                            
                            // Store bank details and pay property mode
                            if (response.pay_property_mode) {
                                window.gasPayPropertyMode = response.pay_property_mode;
                            }
                            if (response.bank_details) {
                                window.gasBankDetails = response.bank_details;
                            }
                            
                            // Update Pay at Property description based on mode
                            if (response.pay_property_mode === 'bank_required') {
                                $payAtProperty.find('.gas-pay-property-desc').text('Bank transfer required — booking held until payment received');
                            } else if (response.pay_property_mode === 'bank_optional' && response.bank_details) {
                                $payAtProperty.find('.gas-pay-property-desc').text('Pay by bank transfer or cash on arrival');
                            }
                            
                            // Override with custom label/description if set
                            if (response.pay_property_label) {
                                $payAtProperty.find('.gas-pay-property-label').text(response.pay_property_label);
                            }
                            if (response.pay_property_description) {
                                $payAtProperty.find('.gas-pay-property-desc').text(response.pay_property_description);
                            }
                            
                            // Auto-select card if it's the only visible option.
                            var visibleOptions = $('.gas-payment-option:visible');
                            if (visibleOptions.length === 1) {
                                visibleOptions.find('input').prop('disabled', false);
                                visibleOptions.trigger('click');
                            } else if (methods.pay_at_property === false && methods.card !== false) {
                                $payAtProperty.removeClass('selected');
                                $cardOption.trigger('click');
                            }
                        }
                        if (typeof Stripe !== 'undefined') {
                            checkoutData.stripe = Stripe(response.stripe_publishable_key, {
                                stripeAccount: response.stripe_account_id
                            });
                            
                            var elements = checkoutData.stripe.elements();
                            checkoutData.cardElement = elements.create('card', {
                                style: {
                                    base: {
                                        fontSize: '16px',
                                        color: '#374151',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                                        '::placeholder': { color: '#9ca3af' }
                                    },
                                    invalid: { color: '#ef4444' }
                                }
                            });
                            checkoutData.cardElement.mount('#gas-card-element');
                            
                            // Handle card errors
                            checkoutData.cardElement.on('change', function(event) {
                                var displayError = document.getElementById('gas-card-errors');
                                if (event.error) {
                                    displayError.textContent = event.error.message;
                                } else {
                                    displayError.textContent = '';
                                }
                            });
                        }
                    } else {
                        $('.gas-card-status').text(t('booking', 'not_available_property', 'Not available for this property'));
                        
                        // Still load payment methods and bank details even without Stripe
                        if (response.payment_methods) {
                            var methods = response.payment_methods;
                            var $cardOption = $('.gas-payment-card-option');
                            var $payAtProperty = $('.gas-payment-option').filter(function() {
                                return $(this).find('input[value="pay_at_property"]').length > 0;
                            });
                            
                            if (methods.card === false) $cardOption.hide();
                            if (methods.pay_at_property === false) $payAtProperty.hide();
                            
                            if (response.pay_property_mode) window.gasPayPropertyMode = response.pay_property_mode;
                            if (response.bank_details) window.gasBankDetails = response.bank_details;
                            
                            if (response.pay_property_mode === 'bank_required') {
                                $payAtProperty.find('.gas-pay-property-desc').text('Bank transfer required — booking held until payment received');
                            } else if (response.pay_property_mode === 'bank_optional' && response.bank_details) {
                                $payAtProperty.find('.gas-pay-property-desc').text('Pay by bank transfer or cash on arrival');
                            }
                            
                            // Override with custom label/description if set
                            if (response.pay_property_label) {
                                $payAtProperty.find('.gas-pay-property-label').text(response.pay_property_label);
                            }
                            if (response.pay_property_description) {
                                $payAtProperty.find('.gas-pay-property-desc').text(response.pay_property_description);
                            }
                            
                            // Auto-select pay at property if card is disabled
                            if (methods.card === false && methods.pay_at_property !== false) {
                                $payAtProperty.addClass('selected').find('input').prop('checked', true).prop('disabled', false).trigger('change');
                                // Also show bank details panel
                                var mode = window.gasPayPropertyMode || 'no_payment';
                                if ((mode === 'bank_optional' || mode === 'bank_required') && window.gasBankDetails) {
                                    window.gasRenderBankDetails(window.gasBankDetails);
                                    $('.gas-bank-transfer-panel').slideDown(200);
                                }
                            }
                        }
                    }

                    // Cancellation policy is driven by deposit_rule which the server
                    // returns regardless of Stripe state (server fix d6c12d4).
                    // The Stripe-enabled branch above already stored it; for non-Stripe
                    // properties the rule is still in the response — store it here so
                    // the policy text renders correctly. Then trigger pricing re-render
                    // so updateCheckoutPricing's cancellation switch picks it up
                    // (the first render fired before this AJAX completed).
                    if (!checkoutData.depositRule && response.deposit_rule) {
                        checkoutData.depositRule = response.deposit_rule;
                    }
                    if (typeof updateCheckoutPricing === 'function') {
                        try { updateCheckoutPricing(); } catch (e) { /* may run before pricing data loads */ }
                    }
                },
                error: function() {
                    $('.gas-card-status').text(t('booking', 'not_available', 'Not available'));
                }
            });
        }

        function loadCheckoutData() {
            // Load room info
            $.ajax({
                url: checkoutData.apiUrl + '/api/public/unit/' + checkoutData.unitId,
                method: 'GET',
                success: function(response) {
                    if (response.success && response.unit) {
                        var room = response.unit;
                        // Use display_name for guest-facing title, fall back to name
                        var roomDisplayName = extractText(room.display_name) || room.name;
                        $('.gas-summary-room-name').text(roomDisplayName);
                        // Strip HTML tags from short_description for clean display
                        var shortDesc = extractText(room.short_description) || room.property_name || '';
                        shortDesc = shortDesc.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                        // Truncate if too long
                        if (shortDesc.length > 200) {
                            shortDesc = shortDesc.substring(0, 200) + '...';
                        }
                        $('.gas-summary-property').text(shortDesc);
                        
                        // Set property ID if not already set
                        if (!checkoutData.propertyId && room.property_id) {
                            checkoutData.propertyId = room.property_id;
                            // Now load Stripe info since we have property ID
                            loadStripeInfo();
                        }
                        
                        if (response.images && response.images.length > 0) {
                            var imgUrl = response.images[0].url || response.images[0].image_url;
                            if (imgUrl) {
                                $('.gas-room-thumb').attr('src', imgUrl);
                            }
                        } else {
                            // Use placeholder if no images
                            $('.gas-room-thumb').attr('src', 'https://via.placeholder.com/200x150?text=Room');
                        }
                        
                        checkoutData.room = room;
                        checkoutData.currency = resolveCurrency(room.currency);
                    }
                }
            });
            
            // Load pricing — pass event slug through so the server bypasses
            // min_stay enforcement (event holds intentionally use a window
            // that may be shorter than the property's general min_stay rule).
            console.log('GAS DEBUG currentLanguage:', currentLanguage);
            var checkoutEventSlug = new URLSearchParams(window.location.search).get('event');
            $.ajax({
                url: checkoutData.apiUrl + '/api/public/calculate-price',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    unit_id: checkoutData.unitId,
                    check_in: checkoutData.checkin,
                    check_out: checkoutData.checkout,
                    guests: checkoutData.guests,
                adults: (checkoutData.adults != null ? parseInt(checkoutData.adults) : parseInt(checkoutData.guests)) || 1,
                children: parseInt(checkoutData.children) || 0,
                    adults: checkoutData.adults,
                    children: checkoutData.children,
                    // Carry the rate the guest chose on the rooms page so the
                    // server applies THAT offer, not the highest-priority one.
                    offer_id: checkoutData.offerId || undefined,
                    event_slug: checkoutEventSlug || undefined,
                    lang: currentLanguage
                }),
                success: function(response) {
                    if (response.success) {
                        if (response.taxes && response.taxes.length > 0) {
                            console.log('GAS DEBUG tax[0] raw:', JSON.stringify(response.taxes[0], null, 2));
                            console.log('GAS DEBUG tax[0].name:', response.taxes[0].name, 'name_ml:', response.taxes[0].name_ml);
                        }
                        checkoutData.pricing = response;
                        checkoutData.gasBreakdown = response;
                        // calculate-price returns the deposit_rule matching the
                        // chosen offer's refund_policy (non_refundable → 100%
                        // rule, refundable → default rule). This always beats
                        // the property-default rule served by stripe-info.
                        if (response.deposit_rule) {
                            checkoutData.depositRule = response.deposit_rule;
                        }
                        updateCheckoutPricing();
                        // Sync the rate badge with what the server actually applied.
                        // When the guest picked Standard (no offer_id), offer_applied
                        // is null — explicitly reset the badge to the Standard label
                        // rather than leaving stale text from a previous render.
                        if (response.offer_applied && response.offer_applied.name) {
                            var serverOfferName = response.offer_applied.name;
                            if (typeof serverOfferName === 'object') {
                                serverOfferName = serverOfferName.en || Object.values(serverOfferName)[0];
                            }
                            if (serverOfferName) {
                                $('.gas-rate-badge').addClass('offer').text('🎉 ' + serverOfferName);
                            }
                        } else {
                            $('.gas-rate-badge').removeClass('offer').text('Standard Rate');
                        }
                    }
                }
            });

            // Load upsells
            if (checkoutData.clientId) {
                $.ajax({
                    url: checkoutData.apiUrl + '/api/public/client/' + checkoutData.clientId + '/upsells?unit_id=' + checkoutData.unitId + '&lang=' + currentLanguage,
                    method: 'GET',
                    success: function(response) {
                        $('.gas-upsells-loading').hide();
                        if (response.success && response.upsells && response.upsells.length > 0) {
                            console.log('GAS DEBUG upsell[0] raw:', JSON.stringify(response.upsells[0], null, 2));
                            console.log('GAS DEBUG upsell[0].name:', response.upsells[0].name, 'name_ml:', response.upsells[0].name_ml);
                            // Cache full upsell records — same reason as renderCheckoutUpsells.
                            window._gasUpsellMap = window._gasUpsellMap || {};
                            response.upsells.forEach(function(u) { window._gasUpsellMap[String(u.id)] = u; });
                            renderCheckoutUpsells(response.upsells);
                        } else {
                            $('.gas-no-upsells').show();
                        }
                    },
                    error: function() {
                        $('.gas-upsells-loading').hide();
                        $('.gas-no-upsells').show();
                    }
                });
            } else {
                $('.gas-upsells-loading').hide();
                $('.gas-no-upsells').show();
            }
        }
        
        function updateCheckoutPricing() {
            var p = checkoutData.pricing || {};
            var currency = resolveCurrency(checkoutData.currency) || '';
            var nights = p.nights || 1;
            var accommodationTotal = parseFloat(p.accommodation_total) || 0;
            checkoutData.accommodationTotal = accommodationTotal;
            var upsellsTotal = calculateUpsellsTotal();
            var discount = parseFloat(p.offer_discount) || 0;
            var voucherDiscount = parseFloat(checkoutData.voucherDiscount) || 0;
            var taxes = p.taxes || [];
            var taxTotal = 0;
            
            console.log('Checkout pricing update:', {
                nights: nights,
                accommodationTotal: accommodationTotal,
                discount: discount,
                taxes: taxes,
                cmQuote: checkoutData.cmQuote
            });
            
            // CM quote override removed — calculate-price is the single source of truth
            // (includes booking_page_multiplier, offers, vouchers, taxes consistently)
            if (false) {
                // Dead code — CM quote block disabled
                if (checkoutData.selectedUpsells && checkoutData.selectedUpsells.length > 0) {
                    checkoutData.selectedUpsells.forEach(function(upsell) {
                        var itemTotal = calculateUpsellItemTotal(upsell);
                        extrasHtml += '<div class="gas-extra-item">';
                        extrasHtml += '<span>' + upsell.name + '</span>';
                        extrasHtml += '<span>' + formatPrice(itemTotal, qCurrency) + '</span>';
                        extrasHtml += '</div>';
                    });
                    $('.gas-extras-list').html(extrasHtml);
                    $('.gas-selected-extras').show();
                } else {
                    $('.gas-selected-extras').hide();
                }
                
                // Grand total (CM total + upsells - discounts)
                var grandTotal = q.total + upsellsTotal - discount - voucherDiscount;
                if (isNaN(grandTotal)) grandTotal = q.total;
                $('.gas-grand-total').text(formatPrice(grandTotal, qCurrency));
                
                // Damage deposit (shown separately)
                if (q.damageDeposit && q.damageDeposit > 0) {
                    if ($('.gas-damage-deposit-line').length === 0) {
                        // Add damage deposit line after total
                        $('.gas-grand-total').closest('.gas-total-row, .gas-summary-total').after(
                            '<div class="gas-damage-deposit-line" style="padding: 0.5rem 0; font-size: 0.9em; color: #64748b; border-top: 1px dashed #e2e8f0; margin-top: 0.5rem;">' +
                            '<div style="display: flex; justify-content: space-between;">' +
                            '<span>Refundable Damage Deposit</span>' +
                            '<span class="gas-deposit-amount">' + formatPrice(q.damageDeposit, qCurrency) + '</span>' +
                            '</div>' +
                            '<div style="font-size: 0.8em; color: #94a3b8; margin-top: 0.25rem;">Collected at property, fully refundable</div>' +
                            '</div>'
                        );
                    } else {
                        $('.gas-deposit-amount').text(formatPrice(q.damageDeposit, qCurrency));
                        $('.gas-damage-deposit-line').show();
                    }
                }
                
                checkoutData.grandTotal = grandTotal;
                checkoutData.total = q.total;
                
                // Store breakdown for Hostaway push
                checkoutData.priceBreakdown = q.breakdown;
                checkoutData.damageDeposit = q.damageDeposit;
                
                // Cancellation policy: offer's refund_policy wins if set and not 'inherit',
                // otherwise the property's deposit_rule.refund_policy. See applyCancellationPolicy.
                applyCancellationPolicy();

                return;
            }
            
            // Accommodation line — just show total with night count, no misleading per-night average
            var nightWord = nights > 1 ? t('booking', 'nights', 'nights') : t('booking', 'night', 'night');
            $('.gas-nights-label').text(t('booking', 'accommodation', 'Accommodation') + ' (' + nights + ' ' + nightWord + ')');
            $('.gas-nights-total').text(formatPrice(accommodationTotal, currency));
            
            // Discount line
            if (discount > 0) {
                $('.gas-discount-line').show().find('.gas-discount-amount').text('-' + formatPrice(discount, currency));
            } else {
                $('.gas-discount-line').hide();
            }
            
            // Split selected upsells into mandatory (rendered as standalone PRICE DETAILS lines,
            // peers of Accommodation) and optional (grouped under "Your Extras"). Same
            // calculateUpsellItemTotal for both → no risk of mandatory vs optional drifting
            // in price for the same charge_type.
            var allSelected = Array.isArray(checkoutData.selectedUpsells) ? checkoutData.selectedUpsells : [];
            var mandatoryItems = allSelected.filter(function(u) { return u.mandatory === true || u.mandatory === 'true'; });
            var optionalItems  = allSelected.filter(function(u) { return !(u.mandatory === true || u.mandatory === 'true'); });

            // Mandatory: each as its own price-line, sibling of Accommodation
            if (mandatoryItems.length > 0) {
                var mandatoryHtml = '';
                mandatoryItems.forEach(function(upsell) {
                    var itemTotal = calculateUpsellItemTotal(upsell);
                    mandatoryHtml += '<div class="gas-price-line">';
                    mandatoryHtml += '<span>' + (extractText(upsell.name_ml) || upsell.name) + '</span>';
                    mandatoryHtml += '<span>' + formatPrice(itemTotal, currency) + '</span>';
                    mandatoryHtml += '</div>';
                });
                $('.gas-mandatory-extras').html(mandatoryHtml).show();
            } else {
                $('.gas-mandatory-extras').empty().hide();
            }
            // Event ticket — when this booking arrived via ?event=<slug>, the
            // server returns event_ticket: {amount, name, currency} on the
            // calc-price response. Render it as a sibling of Accommodation
            // (it's already in subtotal/grand_total — this is the breakdown row).
            var evt = checkoutData.pricing && checkoutData.pricing.event_ticket;
            if (evt && parseFloat(evt.amount) > 0) {
                var evtHtml = '<div class="gas-price-line"><span>🎟 ' + (evt.name || 'Event ticket') + '</span><span>' + formatPrice(parseFloat(evt.amount), currency) + '</span></div>';
                $('.gas-mandatory-extras').append(evtHtml).show();
            }

            // Optional: under "Your Extras" header. Tour upsells render with the
            // ticket count and the chosen date — "4 × Tour on Sat 9 May" — so the
            // receipt reads like a ticket stub.
            if (optionalItems.length > 0) {
                var extrasHtml = '';
                optionalItems.forEach(function(upsell) {
                    var itemTotal = calculateUpsellItemTotal(upsell);
                    var name = extractText(upsell.name_ml) || upsell.name;
                    var qty = upsell.quantity || 1;
                    var label = name;
                    if (qty > 1) label = qty + ' × ' + name;
                    if (upsell.upsell_date) label += ' on ' + formatUpsellDate(upsell.upsell_date);
                    extrasHtml += '<div class="gas-extra-item">';
                    extrasHtml += '<span>' + label + '</span>';
                    extrasHtml += '<span>' + formatPrice(itemTotal, currency) + '</span>';
                    extrasHtml += '</div>';
                });
                $('.gas-extras-list').html(extrasHtml);
                $('.gas-selected-extras').show();
            } else {
                $('.gas-selected-extras').hide();
            }
            
            // Voucher discount
            if (voucherDiscount > 0) {
                $('.gas-voucher-line').show().find('.gas-voucher-discount').text('-' + formatPrice(voucherDiscount, currency));
            } else {
                $('.gas-voucher-line').hide();
            }

            // Bundle / package deduction — computed locally from selected upsells'
            // included_nights_per_unit. The initial calculate-price call has no
            // upsells in the request so the server returns 0 there; we mirror the
            // server math here so the breakdown updates as the guest toggles tours.
            var bundleNightsRequested = 0;
            (checkoutData.selectedUpsells || []).forEach(function(u) {
                var inpu = parseInt(u.included_nights_per_unit);
                var qty = parseInt(u.quantity) || 1;
                if (inpu > 0) bundleNightsRequested += qty * inpu;
            });
            var bundleNights = Math.min(bundleNightsRequested, nights);
            var bundleDeduction = (bundleNights > 0 && nights > 0)
                ? Math.min(bundleNights * (accommodationTotal / nights), accommodationTotal)
                : 0;
            if (bundleDeduction > 0) {
                var nightWord2 = bundleNights > 1 ? 'nights' : 'night';
                $('.gas-bundle-label').text('Package includes ' + bundleNights + ' ' + nightWord2);
                $('.gas-bundle-amount').text('-' + formatPrice(bundleDeduction, currency));
                $('.gas-bundle-line').show();
            } else {
                $('.gas-bundle-line').hide();
            }

            // Taxes breakdown. The server returns its computed values, but Total
            // Tax has to recalc on the client when the cart changes (mandatory
            // upsells get added AFTER the initial calculate-price fires, and the
            // server doesn't re-run on cart edits). For type='total_tax' rows
            // we rebuild the amount from the live cart so VAT compounds onto
            // non-exempt upsells correctly.
            if (taxes && taxes.length > 0) {
                var taxesHtml = '';
                var nonExemptUpsells = 0;
                var nonExemptOtherTaxes = 0;
                (checkoutData.selectedUpsells || []).forEach(function(u) {
                    if (u.total_tax_exempt !== true) nonExemptUpsells += calculateUpsellItemTotal(u);
                });
                taxes.forEach(function(tax) {
                    if (tax.type !== 'total_tax' && tax.total_tax_exempt === false) {
                        nonExemptOtherTaxes += parseFloat(tax.amount) || 0;
                    }
                });
                taxes.forEach(function(tax) {
                    var taxAmt = parseFloat(tax.amount) || 0;
                    if (tax.type === 'total_tax' && tax.rate) {
                        var base = accommodationTotal - discount - voucherDiscount - bundleDeduction + nonExemptUpsells + nonExemptOtherTaxes;
                        if (base < 0) base = 0;
                        taxAmt = tax.inclusive
                            ? base - (base / (1 + tax.rate / 100))
                            : base * (tax.rate / 100);
                        taxAmt = Math.round(taxAmt * 100) / 100;
                    }
                    taxesHtml += '<div class="gas-tax-item">';
                    taxesHtml += '<span>' + (extractText(tax.name_ml) || tax.name) + '</span>';
                    taxesHtml += '<span>' + formatPrice(taxAmt, currency) + '</span>';
                    taxesHtml += '</div>';
                    // Inclusive Total Tax is already in the prices — don't add again to grandTotal.
                    if (!(tax.type === 'total_tax' && tax.inclusive)) taxTotal += taxAmt;
                });
                $('.gas-taxes-list').html(taxesHtml);
                $('.gas-taxes-section').show();
            } else {
                $('.gas-taxes-section').hide();
            }
            
            // Cancellation policy: offer's refund_policy wins when set and not 'inherit',
            // otherwise property deposit_rule.refund_policy. See applyCancellationPolicy.
            applyCancellationPolicy();

            // Grand total — bundle deduction reduces the room subtotal at the guest's
            // selected rate; mirrors the server math in /api/public/calculate-price.
            // Event ticket flows in when the booking entered via ?event=<slug>.
            var eventTicketAmt = (evt && parseFloat(evt.amount) > 0) ? parseFloat(evt.amount) : 0;
            var grandTotal = accommodationTotal + upsellsTotal - discount - voucherDiscount - bundleDeduction + taxTotal + eventTicketAmt;
            if (isNaN(grandTotal)) grandTotal = 0;
            $('.gas-grand-total').text(formatPrice(grandTotal, currency));

            checkoutData.grandTotal = grandTotal;

            // If card is already selected (e.g. auto-selected on load before
            // pricing landed), refresh the deposit row from the new total.
            if (typeof window._gasRecalcCheckoutDeposit === 'function') {
                window._gasRecalcCheckoutDeposit();
            }
        }

        function calculateUpsellItemTotal(upsell) {
            var nights = checkoutData.pricing.nights || 1;
            var guests = checkoutData.guests || 1;
            return calculateUpsellLineTotal(upsell, nights, guests) * (upsell.quantity || 1);
        }

        function calculateUpsellsTotal() {
            var total = 0;
            var nights = checkoutData.pricing.nights || 1;
            var guests = checkoutData.guests || 1;
            checkoutData.selectedUpsells.forEach(function(upsell) {
                total += calculateUpsellLineTotal(upsell, nights, guests) * (upsell.quantity || 1);
            });
            return total;
        }
        
        // Bucket legacy/granular categories into the top-level set used at checkout.
        // Normalises older data (airport_transport, private_chef etc.) to the simplified
        // grouping the admin dropdown now exposes.
        function normaliseUpsellCategory(raw) {
            if (!raw) return 'Other';
            var v = String(raw).trim();
            var canonical = ['Activities','Comfort','Events','Food & Drink','Products','Spa & Wellness','Tours','Transfers','Other'];
            if (canonical.indexOf(v) !== -1) return v;
            var key = v.toLowerCase().replace(/\s+/g,'_');
            var map = {
                airport_transport: 'Transfers', car_rental: 'Transfers', motorcycle: 'Transfers',
                private_chef: 'Food & Drink', food_and_drink: 'Food & Drink',
                spa: 'Spa & Wellness',
                activity: 'Activities', experience: 'Activities',
                late_checkout: 'Comfort', early_checkin: 'Comfort',
                mid_stay_cleaning: 'Comfort', office_equipment: 'Comfort', baby: 'Comfort',
                protection_program: 'Other', miscellaneous: 'Other'
            };
            return map[key] || 'Other';
        }

        function renderCheckoutUpsells(upsells) {
            var currency = checkoutData.currency || '';
            console.log('Rendering upsells:', upsells);

            // Cache full upsell records by ID. The click handler looks up the
            // complete record here instead of relying on data-attribute round-
            // tripping (which has historically dropped tiered fields when the
            // attribute string was empty / parsed-to-undefined by jQuery).
            // No-op if anyone else has already populated it; we just merge.
            window._gasUpsellMap = window._gasUpsellMap || {};
            upsells.forEach(function(u) { window._gasUpsellMap[String(u.id)] = u; });

            var perNight = '/' + t('booking', 'night', 'night');
            var perGuest = '/' + t('booking', 'guest', 'guest');
            // Stay range for date-bound upsells.
            var coCi = checkoutData.checkin || (checkoutData.pricing && checkoutData.pricing.check_in);
            var coCo = checkoutData.checkout || (checkoutData.pricing && checkoutData.pricing.check_out);

            // Mandatory upsells render in price details (peers of Accommodation), not
            // in the optional list. We still auto-add them to selectedUpsells below
            // so they hit the booking record + grand total.
            var visible = [];
            upsells.forEach(function(upsell) {
                var isMandatory = upsell.mandatory === true || upsell.mandatory === 'true';
                if (isMandatory) return;
                if (upsell.requires_date) {
                    var vd = computeValidUpsellDates(upsell, coCi, coCo);
                    if (!vd.length) return;
                    upsell._validDates = vd;
                }
                visible.push(upsell);
            });

            // Bucket by category — section order matches the admin dropdown.
            var sectionOrder = ['Tours','Activities','Events','Food & Drink','Spa & Wellness','Transfers','Comfort','Products','Other'];
            var grouped = {};
            visible.forEach(function(u) {
                var cat = normaliseUpsellCategory(u.category);
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(u);
            });

            function renderRow(upsell) {
                var priceLabel = '';
                switch (upsell.charge_type) {
                    case 'per_night': priceLabel = perNight; break;
                    case 'per_guest': priceLabel = perGuest; break;
                    case 'per_guest_per_night': priceLabel = perGuest + perNight; break;
                    default: priceLabel = '';
                }
                var maxQty = parseInt(upsell.max_quantity, 10) || 1;
                var qtyAware = maxQty > 1;
                var fnpAttr2 = (upsell.first_night_price !== undefined && upsell.first_night_price !== null) ? upsell.first_night_price : '';
                var snpAttr2 = (upsell.subsequent_night_price !== undefined && upsell.subsequent_night_price !== null) ? upsell.subsequent_night_price : '';
                var inclAttr2 = (upsell.included_nights_per_unit !== undefined && upsell.included_nights_per_unit !== null) ? upsell.included_nights_per_unit : '';
                var nameAttr2 = (upsell.name || '').replace(/"/g, '&quot;');
                var validDates = upsell._validDates;

                var row = '<div class="gas-upsell-card gas-upsell-row' + (qtyAware ? ' gas-upsell-qty-aware' : '') + '" data-upsell-id="' + upsell.id + '" data-upsell-name="' + nameAttr2 + '" data-price="' + upsell.price + '" data-charge-type="' + (upsell.charge_type || 'per_booking') + '" data-first-night-price="' + fnpAttr2 + '" data-subsequent-night-price="' + snpAttr2 + '" data-included-nights-per-unit="' + inclAttr2 + '" data-mandatory="false" data-max-quantity="' + maxQty + '">';

                if (upsell.image_url) {
                    row += '<div class="gas-upsell-image"><img src="' + upsell.image_url + '" alt="' + nameAttr2 + '" /></div>';
                } else {
                    var icon = '✨';
                    var nameLower = (upsell.name || '').toLowerCase();
                    if (nameLower.includes('parking')) icon = '🚗';
                    else if (nameLower.includes('breakfast')) icon = '🍳';
                    else if (nameLower.includes('dog') || nameLower.includes('pet')) icon = '🐕';
                    else if (nameLower.includes('towel')) icon = '🛁';
                    else if (nameLower.includes('wine') || nameLower.includes('champagne')) icon = '🍾';
                    else if (nameLower.includes('flower') || nameLower.includes('roses')) icon = '💐';
                    else if (nameLower.includes('spa') || nameLower.includes('massage')) icon = '💆';
                    else if (nameLower.includes('airport') || nameLower.includes('transfer')) icon = '🚐';
                    else if (nameLower.includes('late') || nameLower.includes('early')) icon = '🕐';
                    else if (nameLower.includes('cot') || nameLower.includes('baby') || nameLower.includes('crib')) icon = '👶';
                    row += '<div class="gas-upsell-icon">' + icon + '</div>';
                }

                row += '<div class="gas-upsell-info">';
                row += '<div class="gas-upsell-name">' + upsell.name + '</div>';
                if (upsell.description) {
                    row += '<div class="gas-upsell-desc gas-upsell-desc-clamp">' + upsell.description + '</div>';
                    row += '<a class="gas-upsell-desc-more" onclick="event.stopPropagation()">more</a>';
                }
                if (validDates && validDates.length) {
                    var optsHtml2 = validDates.map(function(d){ return '<option value="' + d + '">' + formatUpsellDate(d) + '</option>'; }).join('');
                    row += '<div class="gas-upsell-date-row">';
                    row += '<label>Pick date:</label>';
                    row += '<select class="gas-upsell-date" onclick="event.stopPropagation()">' + optsHtml2 + '</select>';
                    row += '</div>';
                }
                row += '</div>';

                row += '<div class="gas-upsell-meta">';
                row += '<div class="gas-upsell-price">' + upsellPriceCardHtml(upsell, currency, formatPriceShort) + '</div>';
                if (qtyAware) {
                    row += '<div class="gas-upsell-stepper">';
                    row += '<button type="button" class="gas-upsell-qty-minus" aria-label="Remove one" title="Remove one">−</button>';
                    row += '<span class="gas-upsell-qty-badge">×&nbsp;<span class="gas-upsell-qty-value">0</span></span>';
                    row += '</div>';
                } else {
                    row += '<span class="gas-upsell-qty-value" style="display:none;">0</span>';
                    row += '<div class="gas-upsell-check">✓</div>';
                }
                row += '</div>';
                row += '</div>';
                return row;
            }

            var html = '';
            sectionOrder.forEach(function(cat) {
                var items = grouped[cat];
                if (!items || !items.length) return;
                html += '<div class="gas-upsell-section">';
                html += '<h4 class="gas-upsell-section-title">' + cat + '</h4>';
                html += '<div class="gas-upsell-section-list">';
                items.forEach(function(u) { html += renderRow(u); });
                html += '</div></div>';
            });

            if (html === '') {
                $('.gas-no-upsells').show();
                $('.gas-checkout-upsells').empty();
            } else {
                $('.gas-no-upsells').hide();
                $('.gas-checkout-upsells').html(html);
                $(document).trigger('gas:upsells-rendered');
            }

            // Auto-add mandatory upsells to selectedUpsells so they appear in PRICE DETAILS
            // and are included in the grand total + booking submission. The click handler
            // refuses to deselect mandatory cards (data-mandatory check), so once added
            // they persist for the session. Idempotent — won't re-push on re-render.
            if (!Array.isArray(checkoutData.selectedUpsells)) checkoutData.selectedUpsells = [];
            upsells.forEach(function(upsell) {
                var isMandatory = upsell.mandatory === true || upsell.mandatory === 'true';
                if (!isMandatory) return;
                var alreadyAdded = checkoutData.selectedUpsells.some(function(u) {
                    return String(u.id) === String(upsell.id);
                });
                if (alreadyAdded) return;
                checkoutData.selectedUpsells.push({
                    id: upsell.id,
                    name: upsell.name,
                    name_ml: upsell.name_ml,
                    price: upsell.price,
                    charge_type: upsell.charge_type || 'per_booking',
                    mandatory: true,
                    quantity: 1
                });
            });
            updateCheckoutPricing();
        }

        // "more"/"less" toggle for upsell descriptions. The link sits under a clamped
        // .gas-upsell-desc; clicking it removes the clamp class and swaps the label.
        // We also auto-hide the link if the description fits within 2 lines (no clamp
        // happened), so single-line upsells like "Pet fee" don't show a useless toggle.
        function gasInitUpsellMoreLinks($scope) {
            var $links = $scope ? $scope.find('.gas-upsell-desc-more') : $('.gas-upsell-desc-more');
            $links.each(function() {
                var $more = $(this);
                if ($more.data('gas-init')) return;
                $more.data('gas-init', '1');
                var $desc = $more.prev('.gas-upsell-desc');
                if (!$desc.length) return;
                // Hide when content fits within the clamp (no overflow → toggle pointless).
                if ($desc[0].scrollHeight <= $desc[0].clientHeight + 1) { $more.hide(); return; }
                $more.on('click', function(e) {
                    e.stopPropagation();
                    var clamped = $desc.toggleClass('gas-upsell-desc-clamp').hasClass('gas-upsell-desc-clamp');
                    $more.text(clamped ? 'more' : 'less');
                });
            });
        }
        // Run once after render and again after any upsell list refresh — listeners are
        // delegated for click but the visibility test needs DOM to be settled.
        $(document).on('gas:upsells-rendered', function() { setTimeout(function() { gasInitUpsellMoreLinks(); }, 30); });

        // Date-bound upsell — the dropdown picks the *target date for the next +*.
        // Existing cart entries keep whichever date they were added with so a guest
        // can buy "2 on May 9 + 2 on May 10" as two distinct receipt lines. No
        // listener needed: the click handlers below read the dropdown each time.

        // Upsell click handler — single-property checkout flow.
        // Skips when click came from the qty-minus button (handled separately).
        $(document).on('click', '.gas-upsell-card', function(e) {
            if ($(e.target).closest('.gas-upsell-qty-minus').length) return;
            var $card = $(this);
            if ($card.data('mandatory') === true || $card.data('mandatory') === 'true') return;
            var upsellId = $card.data('upsell-id');
            var name = $card.attr('data-upsell-name') || $card.find('.gas-upsell-name').text();
            var maxQty = parseInt($card.attr('data-max-quantity'), 10) || 1;

            // Look up the full upsell record from cache populated at render time.
            // This carries first_night_price / subsequent_night_price as their
            // original API values, so tiered upsells (e.g. €75 first night /
            // €45 thereafter) compute correctly. Falls back to data attributes
            // if cache is missing.
            var fullUpsell = (window._gasUpsellMap || {})[String(upsellId)];
            var basePrice = fullUpsell ? (parseFloat(fullUpsell.price) || 0) : (parseFloat($card.data('price')) || 0);
            var chargeType = fullUpsell ? fullUpsell.charge_type : $card.data('charge-type');

            // Capture the chosen date for date-bound upsells so the booking record
            // carries which day the property should schedule the tour for.
            var pickedDate = $card.find('.gas-upsell-date').val() || null;
            var inclPerUnit = parseInt($card.attr('data-included-nights-per-unit')) || null;

            // Compute the line total NOW using the full upsell record, not at
            // calculateUpsellsTotal time. We then store basePrice + tier fields
            // separately so calculateUpsellsTotal can recompute consistently
            // (it uses calculateUpsellLineTotal which applies the same tiered
            // logic from these stored fields).
            var nightsForCalc = (checkoutData && checkoutData.pricing && checkoutData.pricing.nights) || 1;
            var guestsForCalc = (checkoutData && checkoutData.guests) || 1;
            var calcInput = fullUpsell || {
                price: basePrice, charge_type: chargeType,
                first_night_price: $card.data('first-night-price'),
                subsequent_night_price: $card.data('subsequent-night-price')
            };

            if (maxQty > 1) {
                if (typeof checkoutData === 'undefined' || !checkoutData.selectedUpsells) return;
                var sumQty = checkoutData.selectedUpsells
                    .filter(function(u){ return u.id === upsellId; })
                    .reduce(function(s, u){ return s + (parseInt(u.quantity)||0); }, 0);
                if (sumQty >= maxQty) return;

                var existing = checkoutData.selectedUpsells.find(function(u) {
                    return u.id === upsellId && (u.upsell_date || null) === (pickedDate || null);
                });
                if (existing) {
                    existing.quantity = (parseInt(existing.quantity)||0) + 1;
                } else {
                    // Store basePrice (per-unit) + tier fields. calculateUpsellsTotal
                    // re-runs calculateUpsellLineTotal which applies the tiered logic.
                    checkoutData.selectedUpsells.push({
                        id: upsellId, name: name, price: basePrice,
                        charge_type: chargeType,
                        first_night_price: calcInput.first_night_price,
                        subsequent_night_price: calcInput.subsequent_night_price,
                        quantity: 1,
                        upsell_date: pickedDate,
                        included_nights_per_unit: inclPerUnit
                    });
                }
                var newSum = sumQty + 1;
                $card.find('.gas-upsell-qty-value').text(newSum);
                $card.toggleClass('selected', newSum > 0);
            } else {
                if ($card.hasClass('selected')) {
                    $card.removeClass('selected');
                    if (typeof checkoutData !== 'undefined' && checkoutData.selectedUpsells) {
                        checkoutData.selectedUpsells = checkoutData.selectedUpsells.filter(function(u) {
                            return u.id !== upsellId;
                        });
                    }
                } else {
                    $card.addClass('selected');
                    if (typeof checkoutData !== 'undefined' && checkoutData.selectedUpsells) {
                        checkoutData.selectedUpsells.push({
                            id: upsellId, name: name, price: basePrice,
                            charge_type: chargeType,
                            first_night_price: calcInput.first_night_price,
                            subsequent_night_price: calcInput.subsequent_night_price,
                            quantity: 1,
                            upsell_date: pickedDate,
                            included_nights_per_unit: inclPerUnit
                        });
                    }
                }
            }

            updateCheckoutPricing();
        });

        // Minus button on .gas-upsell-card — single-property checkout decrement.
        // (.gas-upsell-item minus, room widget, has its own handler higher up.)
        $(document).on('click', '.gas-upsell-card .gas-upsell-qty-minus', function(e) {
            e.stopPropagation();
            var $card = $(this).closest('.gas-upsell-card');
            if (!$card.length) return;
            var upsellId = $card.data('upsell-id');
            if (typeof checkoutData === 'undefined' || !checkoutData.selectedUpsells) return;

            // Decrement the entry for the currently-selected date if present,
            // otherwise drop from the most recently added entry for this upsell.
            var pickedDate = $card.find('.gas-upsell-date').val() || null;
            var target = checkoutData.selectedUpsells.find(function(u) {
                return u.id === upsellId && (u.upsell_date || null) === (pickedDate || null);
            });
            if (!target) {
                for (var i = checkoutData.selectedUpsells.length - 1; i >= 0; i--) {
                    if (checkoutData.selectedUpsells[i].id === upsellId) { target = checkoutData.selectedUpsells[i]; break; }
                }
            }
            if (!target) return;

            target.quantity = (parseInt(target.quantity)||0) - 1;
            if (target.quantity <= 0) {
                checkoutData.selectedUpsells = checkoutData.selectedUpsells.filter(function(u){ return u !== target; });
            }

            var newSum = checkoutData.selectedUpsells
                .filter(function(u){ return u.id === upsellId; })
                .reduce(function(s, u){ return s + (parseInt(u.quantity)||0); }, 0);
            $card.find('.gas-upsell-qty-value').text(newSum);
            $card.toggleClass('selected', newSum > 0);

            updateCheckoutPricing();
        });
        
        // Email confirmation match
        $(document).on('input', '#gas-email, #gas-email-confirm', function() {
            var email = $('#gas-email').val();
            var confirm = $('#gas-email-confirm').val();
            
            if (confirm.length > 0) {
                if (email === confirm) {
                    $('.gas-email-match').show();
                    $('.gas-email-mismatch').hide();
                } else {
                    $('.gas-email-match').hide();
                    $('.gas-email-mismatch').show();
                }
            } else {
                $('.gas-email-match, .gas-email-mismatch').hide();
            }
        });
        
        // Step navigation
        $(document).on('click', '.gas-next-step', function() {
            var nextStep = $(this).data('next');
            var currentStep = nextStep - 1;
            
            // Validate current step
            if (currentStep === 1) {
                var $form = $('#gas-guest-form');
                var isValid = $form[0].checkValidity();
                
                // Check email match
                var email = $('#gas-email').val();
                var confirm = $('#gas-email-confirm').val();
                if (email !== confirm) {
                    alert('Email addresses do not match. Please check and try again.');
                    return;
                }
                
                if (!isValid) {
                    $form[0].reportValidity();
                    return;
                }
            }
            
            // Hide current, show next
            $('.gas-checkout-step-content').hide();
            $('.gas-checkout-step-content[data-step="' + nextStep + '"]').show();

            // Update step indicators
            $('.gas-step').removeClass('active');
            $('.gas-step[data-step="' + nextStep + '"]').addClass('active');
            $('.gas-step').each(function() {
                if ($(this).data('step') < nextStep) {
                    $(this).addClass('completed');
                }
            });

            // Reaching step 3 (Payment): ensure the Stripe form is visible if card
            // is the (auto-)selected payment method, and recalc the deposit so the
            // row reflects the latest grandTotal. The auto-select click on page load
            // ran slideDown while step 3 was still hidden — its display state may
            // not have stuck. Force-show here.
            if (parseInt(nextStep, 10) === 3) {
                if (checkoutData.stripeEnabled && $('.gas-payment-card-option').hasClass('selected')) {
                    $('.gas-stripe-form').show();
                    $('.gas-payment-summary').show();
                }
                if (typeof window._gasRecalcCheckoutDeposit === 'function') {
                    window._gasRecalcCheckoutDeposit();
                }
            }

            // Scroll to top
            $('html, body').animate({ scrollTop: $checkoutPage.offset().top - 20 }, 300);
        });
        
        $(document).on('click', '.gas-prev-step', function() {
            var prevStep = $(this).data('prev');
            
            $('.gas-checkout-step-content').hide();
            $('.gas-checkout-step-content[data-step="' + prevStep + '"]').show();
            
            $('.gas-step').removeClass('active completed');
            $('.gas-step[data-step="' + prevStep + '"]').addClass('active');
            $('.gas-step').each(function() {
                if ($(this).data('step') < prevStep) {
                    $(this).addClass('completed');
                }
            });
        });
        
        // Build the right-hand label for the Balance row from the deposit rule.
        // Picks the most specific case that matches the rule's fields:
        //   schedule_mode='schedule'   → "Final payment N days before arrival"
        //   auto_charge_balance=true   → "Balance — auto-charged N days before arrival"
        //   balance_due_type='days_before' → "Balance due N days before arrival"
        //   else                       → "Balance due at check-in" (legacy fallback)
        function _gasBalanceDueLabel(rule) {
            if (!rule) return t('payment', 'balance_due', 'Balance due at check-in');
            if (rule.schedule_mode === 'schedule' && Array.isArray(rule.payment_schedule)) {
                var futureTiers = rule.payment_schedule
                    .filter(function(tt) { return tt.days_before !== null && tt.days_before !== undefined; })
                    .map(function(tt) { return parseInt(tt.days_before, 10); })
                    .filter(function(d) { return !isNaN(d); })
                    .sort(function(a, b) { return a - b; });
                if (futureTiers.length > 0) {
                    return t('payment', 'balance_final_days', 'Final payment {days} days before arrival').replace('{days}', futureTiers[0]);
                }
            }
            if (rule.auto_charge_balance) {
                // Prefer balance_due_days (the field the UI saves and the
                // cron actually uses). auto_charge_days_before is a legacy
                // column that defaulted to 14 and rarely tracks the UI value
                // — using it directly meant the label said "14 days" even
                // when the operator had configured "30 days" on the rule.
                var d = parseInt(rule.balance_due_days, 10);
                if (isNaN(d)) d = parseInt(rule.auto_charge_days_before, 10);
                if (!isNaN(d) && d > 0) return t('payment', 'balance_auto_days', 'Balance — auto-charged {days} days before arrival').replace('{days}', d);
                if (d === 0) return t('payment', 'balance_auto_on_arrival', 'Balance — auto-charged on arrival');
            }
            if (rule.balance_due_type === 'days_before' && rule.balance_due_days) {
                var d2 = parseInt(rule.balance_due_days, 10);
                if (d2 > 0) return t('payment', 'balance_due_days', 'Balance due {days} days before arrival').replace('{days}', d2);
            }
            return t('payment', 'balance_due', 'Balance due at check-in');
        }

        // Helper: trigger the deposit recalc on the card option.
        // Called from updateCheckoutPricing when pricing data lands. Removed the
        // 'selected' gate: when Stripe is the only/auto-selected option the class
        // isn't added until the user actually clicks, so the recalc was never
        // firing and the deposit row stayed at €0 (e.g. Hotel Balduin, 100%
        // deposit rule, no taxes — the auto-load path never updated the display).
        window._gasRecalcCheckoutDeposit = function() {
            if (!checkoutData.stripeEnabled) return;
            // $card isn't in this scope (it was a local var in click handlers
            // further down). Select the card payment option directly.
            $('.gas-payment-card-option').trigger('_gasRecalcDeposit');
        };

        // Payment option selection. Also listens for synthetic _gasRecalcDeposit
        // event so updateCheckoutPricing can refresh the deposit row without
        // re-running the click toggle.
        $(document).on('click _gasRecalcDeposit', '.gas-payment-option:not(.disabled)', function(e) {
            if (e.type === 'click') {
                $('.gas-payment-option').removeClass('selected');
                $(this).addClass('selected');
                $(this).find('input').prop('checked', true);
            }

            // Show/hide Stripe form based on selection
            var paymentMethod = $(this).find('input').val();
            if (paymentMethod === 'card' && checkoutData.stripeEnabled) {
                if (e.type === 'click') {
                    $('.gas-stripe-form').slideDown(200);
                    $('.gas-payment-summary').show();
                    $('.gas-card-guarantee-note').remove();
                }

                // Calculate deposit amount.
                // Voucher is a payment instrument, not a rate discount — it
                // reduces what the guest still owes, not the deposit. Compute
                // deposit on the PRE-voucher base; voucher comes off the
                // balance. If deposit > guest's actual total (e.g. 100%
                // non-refundable + voucher), cap so we never charge more
                // than the post-voucher total.
                var total = checkoutData.grandTotal || 0;
                var voucherDiscount = parseFloat(checkoutData.voucherDiscount) || 0;
                var depositBase = total + voucherDiscount;
                var depositAmount = total;
                var balanceAmount = 0;

                if (checkoutData.depositRule) {
                    var rule = checkoutData.depositRule;
                    if (rule.schedule_mode === 'schedule' && rule.payment_schedule && Array.isArray(rule.payment_schedule)) {
                        var checkIn = checkoutData.checkIn || checkoutData.items?.[0]?.checkIn;
                        var today = new Date();
                        var arrival = checkIn ? new Date(checkIn) : today;
                        var daysUntil = Math.floor((arrival - today) / 86400000);
                        var chargeNowPct = 0;
                        rule.payment_schedule.forEach(function(tier) {
                            var isAtBooking = tier.days_before === null || tier.days_before === undefined;
                            var hasPassed = !isAtBooking && daysUntil <= tier.days_before;
                            if (isAtBooking || hasPassed) chargeNowPct += parseFloat(tier.percentage) || 0;
                        });
                        depositAmount = depositBase * (chargeNowPct / 100);
                    } else if (rule.deposit_type === 'percentage') {
                        depositAmount = depositBase * (rule.deposit_percentage / 100);
                    } else if (rule.deposit_type === 'fixed') {
                        depositAmount = parseFloat(rule.deposit_fixed_amount) || depositBase;
                    } else if (rule.deposit_type === 'first_night') {
                        depositAmount = checkoutData.pricing?.base_rate || depositBase;
                    }
                    if (depositAmount > total) depositAmount = total;
                    balanceAmount = total - depositAmount;
                }

                checkoutData.depositAmount = depositAmount;
                checkoutData.balanceAmount = balanceAmount;

                var currency = checkoutData.currency || '';
                var balanceLabel = _gasBalanceDueLabel(checkoutData.depositRule);

                if (depositAmount === 0 && balanceAmount > 0) {
                    // Deferred payment — hide deposit row, update balance label
                    $('.gas-deposit-amount-display').closest('.gas-payment-row').hide();
                    $('.gas-balance-row').show();
                    $('.gas-balance-row span').first().text(balanceLabel);
                    $('.gas-balance-amount-display').text(formatPrice(balanceAmount, currency));
                } else {
                    $('.gas-deposit-amount-display').closest('.gas-payment-row').show();
                    $('.gas-deposit-amount-display').text(formatPrice(depositAmount, currency));
                    if (balanceAmount > 0) {
                        $('.gas-balance-row').show();
                        $('.gas-balance-row span').first().text(balanceLabel);
                        $('.gas-balance-amount-display').text(formatPrice(balanceAmount, currency));
                    } else {
                        $('.gas-balance-row').hide();
                    }
                }
            } else if (paymentMethod === 'card_guarantee') {
                $('.gas-bank-transfer-panel').slideUp(200);
                if (window.gasCardGuaranteeProvider === 'stripe') {
                    $('.gas-card-guarantee-form').slideUp(200);
                    $('.gas-stripe-form').slideDown(200);
                    if (checkoutData.stripe && checkoutData.cardElement) {
                        $('#gas-card-errors').text('');
                    } else {
                        $('#gas-card-errors').text('');
                        $('#gas-card-element').html('<div style="text-align:center;padding:12px;color:#64748b;">' + t('payment', 'loading_card_form', 'Loading secure card form...') + '</div>');
                        $.ajax({
                            url: checkoutData.apiUrl + '/api/public/create-setup-intent',
                            method: 'POST',
                            contentType: 'application/json',
                            data: JSON.stringify({ property_id: checkoutData.propertyId, booking_data: {} }),
                            success: function(siResp) {
                                if (siResp.success && siResp.client_secret && siResp.publishable_key) {
                                    checkoutData.cardGuaranteeClientSecret = siResp.client_secret;
                                    checkoutData.cardGuaranteeSetupIntentId = siResp.setup_intent_id;
                                    checkoutData.stripe = Stripe(siResp.publishable_key);
                                    var els = checkoutData.stripe.elements();
                                    checkoutData.cardElement = els.create('card', { style: { base: { fontSize: '16px', color: '#374151', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', '::placeholder': { color: '#9ca3af' } }, invalid: { color: '#ef4444' } } });
                                    checkoutData.cardElement.mount('#gas-card-element');
                                } else {
                                    $('#gas-card-errors').text(siResp.error || 'Stripe keys not configured for this property.');
                                }
                            },
                            error: function() {
                                $('#gas-card-errors').text('Card guarantee service unavailable. Please try again.');
                            }
                        });
                    }
                } else {
                    $('.gas-stripe-form').slideUp(200);
                    $('.gas-card-guarantee-form').slideDown(200);
                    window.gasLoadEnigmaForm(checkoutData.propertyId);
                }
                // Hide deposit info for card guarantee — no charge at booking
                $('.gas-payment-summary').hide();
                $('.gas-card-guarantee-note').remove();
                $('.gas-payment-summary').after('<p class="gas-card-guarantee-note" style="text-align:center;color:#64748b;font-size:0.85rem;margin-top:12px;">' + t('payment', 'card_guarantee_note', 'No charge — your card will be securely held as a guarantee only.') + '</p>');
            } else if (paymentMethod === 'pay_at_property') {
                $('.gas-stripe-form').slideUp(200);
                $('.gas-card-guarantee-form').slideUp(200);
                var mode = window.gasPayPropertyMode || 'no_payment';
                if ((mode === 'bank_optional' || mode === 'bank_required') && window.gasBankDetails) {
                    window.gasRenderBankDetails(window.gasBankDetails);
                    $('.gas-bank-transfer-panel').slideDown(200);
                } else {
                    $('.gas-bank-transfer-panel').slideUp(200);
                }
            } else {
                $('.gas-stripe-form').slideUp(200);
                $('.gas-card-guarantee-form').slideUp(200);
                $('.gas-bank-transfer-panel').slideUp(200);
                $('.gas-card-guarantee-note').remove();
            }
        });

        // Voucher apply
        $(document).on('click', '.gas-btn-apply', function() {
            var code = $('.gas-voucher-input').val().trim().toUpperCase();
            if (!code) return;
            
            var $btn = $(this);
            $btn.prop('disabled', true).text(t('booking', 'checking', 'Checking...'));
            
            $.ajax({
                url: checkoutData.apiUrl + '/api/public/validate-voucher',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    code: code,
                    unit_id: checkoutData.unitId,
                    check_in: checkoutData.checkin,
                    check_out: checkoutData.checkout,
                    lang: currentLanguage
                }),
                success: function(response) {
                    $btn.prop('disabled', false).text(t('common', 'apply', 'Apply'));
                    
                    if (response.success && response.valid) {
                        checkoutData.voucherCode = code;
                        checkoutData.voucher = response.voucher;

                        // Gift cert: applied = min(balance, accommodationTotal); show
                        // remaining-after balance so the guest knows what's left for next time.
                        var isGiftCert = response.voucher.voucher_type === 'gift_certificate';
                        var discount = 0;
                        if (isGiftCert) {
                            var bal = parseFloat(response.voucher.current_balance) || 0;
                            var accomTotal = parseFloat(checkoutData.pricing && checkoutData.pricing.accommodation_total) || checkoutData.grandTotal;
                            discount = Math.min(bal, accomTotal);
                            var remaining = Math.max(0, bal - discount);
                            var balCurr = response.voucher.currency || checkoutData.currency || '';
                            var msg = '✓ Gift certificate applied — ' + (balCurr ? balCurr + ' ' : '') + discount.toFixed(2) + ' of ' + (balCurr ? balCurr + ' ' : '') + bal.toFixed(2);
                            if (remaining > 0) msg += ' (' + (balCurr ? balCurr + ' ' : '') + remaining.toFixed(2) + ' remaining for next time)';
                            $('.gas-voucher-result').html('<span class="gas-voucher-success">' + msg + '</span>');
                            $('.gas-voucher-label').text('Gift certificate: ' + code);
                        } else {
                            $('.gas-voucher-result').html('<span class="gas-voucher-success">✓ ' + response.voucher.name + ' applied!</span>');
                            // Discount the BASE accommodation only (nightly rate × nights),
                            // not the tax-inclusive grand total. Tax then recalculates on
                            // the discounted base inside updateCheckoutPricing() below.
                            var accomBase = parseFloat(checkoutData.pricing && checkoutData.pricing.accommodation_total) || 0;
                            if (response.voucher.discount_type === 'percentage') {
                                discount = accomBase * (response.voucher.discount_value / 100);
                            } else {
                                discount = parseFloat(response.voucher.discount_value);
                                // Cap fixed-amount discounts at the accommodation base.
                                if (discount > accomBase) discount = accomBase;
                            }
                            $('.gas-voucher-label').text('Promo: ' + code);
                        }

                        $('.gas-voucher-line').show();
                        $('.gas-voucher-discount').text('-' + formatPrice(discount, checkoutData.currency));

                        checkoutData.voucherDiscount = discount;
                        // Re-run the full pricing calc so taxes drop with the discounted base
                        // and the grand total reflects the new (lower) tax line.
                        if (typeof updateCheckoutPricing === 'function') {
                            updateCheckoutPricing();
                        } else {
                            checkoutData.grandTotal = checkoutData.grandTotal - discount;
                            $('.gas-grand-total').text(formatPrice(checkoutData.grandTotal, checkoutData.currency));
                        }
                    } else {
                        $('.gas-voucher-result').html('<span class="gas-voucher-error">' + (response.error || 'Invalid voucher code') + '</span>');
                    }
                },
                error: function() {
                    $btn.prop('disabled', false).text(t('common', 'apply', 'Apply'));
                    $('.gas-voucher-result').html('<span class="gas-voucher-error">Error checking voucher</span>');
                }
            });
        });
        
        // Confirm booking
        $(document).on('click', '#gas-confirm-booking', function() {
            var $btn = $(this);
            
            // Check terms
            if (!$('#gas-terms').is(':checked')) {
                alert('Please agree to the Terms & Conditions to continue.');
                return;
            }
            
            var paymentMethod = $('input[name="payment_method"]:checked').val();
            
            // If card payment selected, process with Stripe first
            if (paymentMethod === 'card' && checkoutData.stripeEnabled) {
                processCardPayment($btn);
                return;
            }
            
            // If card guarantee with Stripe, process SetupIntent
            if (paymentMethod === 'card_guarantee' && window.gasCardGuaranteeProvider === 'stripe') {
                if (!checkoutData.stripe || !checkoutData.cardElement) {
                    alert(t('payment', 'card_form_not_loaded', 'Card form not loaded. Please re-select Card Guarantee.'));
                    return;
                }
                $btn.prop('disabled', true);
                $btn.find('.gas-btn-text').hide();
                $btn.find('.gas-btn-loading').text(t('payment', 'securing_card', 'Securing card...')).show();
                var $form = $('#gas-guest-form');
                var doConfirmSingle = function(clientSecret) {
                    checkoutData.stripe.confirmCardSetup(clientSecret, {
                        payment_method: {
                            card: checkoutData.cardElement,
                            billing_details: {
                                name: $form.find('[name="first_name"]').val() + ' ' + $form.find('[name="last_name"]').val(),
                                email: $form.find('[name="email"]').val()
                            }
                        }
                    }).then(function(result) {
                        if (result.error) {
                            $('#gas-card-errors').text(result.error.message);
                            $btn.prop('disabled', false);
                            $btn.find('.gas-btn-text').show();
                            $btn.find('.gas-btn-loading').hide();
                        } else {
                            window.gasStripeSetupIntentId = result.setupIntent.id;
                            window.gasStripePaymentMethodId = result.setupIntent.payment_method;
                            submitBooking($btn, null);
                        }
                    });
                };
                if (checkoutData.cardGuaranteeClientSecret) {
                    doConfirmSingle(checkoutData.cardGuaranteeClientSecret);
                } else {
                    $.ajax({
                        url: checkoutData.apiUrl + '/api/public/create-setup-intent',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            property_id: checkoutData.propertyId,
                            booking_data: {
                                email: $form.find('[name="email"]').val(),
                                check_in: checkoutData.checkin,
                                check_out: checkoutData.checkout
                            }
                        }),
                        success: function(response) {
                            if (response.success && response.client_secret) {
                                doConfirmSingle(response.client_secret);
                            } else {
                                alert('Failed to initialize card guarantee: ' + (response.error || 'Please try again'));
                                $btn.prop('disabled', false);
                                $btn.find('.gas-btn-text').show();
                                $btn.find('.gas-btn-loading').hide();
                            }
                        },
                        error: function() {
                            alert('Card guarantee service unavailable. Please try again.');
                            $btn.prop('disabled', false);
                            $btn.find('.gas-btn-text').show();
                            $btn.find('.gas-btn-loading').hide();
                        }
                    });
                }
                return;
            }

            // If card guarantee with Enigma, validate card was captured
            if (paymentMethod === 'card_guarantee') {
                if (!window.gasEnigmaCardCaptured) {
                    alert('Please complete the secure card form before confirming your booking.');
                    return;
                }
            }

            // Otherwise, proceed with pay at property / card guarantee
            submitBooking($btn, null);
        });
        
        function processCardPayment($btn) {
            $btn.prop('disabled', true);
            $btn.find('.gas-btn-text').hide();
            $btn.find('.gas-btn-loading').text(t('booking', 'processing_payment', 'Processing payment...')).show();

            var $form = $('#gas-guest-form');

            // Always recompute deposit from the live grandTotal at submit
            // time. The previous "if (!checkoutData.depositAmount)" short-
            // circuit meant any earlier computation (e.g. card option
            // selected before mandatory upsells were auto-added in
            // renderCheckoutUpsells) locked the deposit at the stale value
            // and Stripe charged it. Cotswolds GAS-179271 / Beds24
            // 87822641 (2026-06-04) collected £554 instead of £653
            // because of that. Server-side enforcement in
            // /api/public/calculate-price now backstops this too.
            if (checkoutData.grandTotal) {
                var total = checkoutData.grandTotal;
                var depositAmount = total;
                var balanceAmount = 0;

                if (checkoutData.depositRule) {
                    var rule = checkoutData.depositRule;
                    if (rule.schedule_mode === 'schedule' && rule.payment_schedule && Array.isArray(rule.payment_schedule)) {
                        var checkIn = checkoutData.checkin;
                        var today = new Date();
                        var arrival = checkIn ? new Date(checkIn) : today;
                        var daysUntil = Math.floor((arrival - today) / 86400000);
                        var chargeNowPct = 0;
                        rule.payment_schedule.forEach(function(tier) {
                            var isAtBooking = tier.days_before === null || tier.days_before === undefined;
                            var hasPassed = !isAtBooking && daysUntil <= tier.days_before;
                            if (isAtBooking || hasPassed) chargeNowPct += parseFloat(tier.percentage) || 0;
                        });
                        depositAmount = total * (chargeNowPct / 100);
                        balanceAmount = total - depositAmount;
                    } else if (rule.deposit_type === 'percentage') {
                        depositAmount = total * (rule.deposit_percentage / 100);
                        balanceAmount = total - depositAmount;
                    } else if (rule.deposit_type === 'fixed') {
                        depositAmount = parseFloat(rule.deposit_fixed_amount) || total;
                        balanceAmount = total - depositAmount;
                    } else if (rule.deposit_type === 'first_night') {
                        depositAmount = checkoutData.pricing?.base_rate || total;
                        balanceAmount = total - depositAmount;
                    }
                }

                checkoutData.depositAmount = depositAmount;
                checkoutData.balanceAmount = balanceAmount;
                console.log('Recalculated deposit at submit:', depositAmount, 'balance:', balanceAmount, '(grandTotal:', total + ')');
            }

            // If deposit is 0 (deferred payment), create SetupIntent to save card for later charge
            if (checkoutData.depositAmount === 0 && checkoutData.balanceAmount > 0) {
                console.log('[Deferred Payment] 0% deposit — creating SetupIntent to save card for later charge');
                $btn.find('.gas-btn-loading').text(t('payment', 'securing_card', 'Securing card...')).show();
                $.ajax({
                    url: checkoutData.apiUrl + '/api/public/create-setup-intent',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        property_id: checkoutData.propertyId,
                        booking_data: {
                            email: $form.find('[name="email"]').val(),
                            check_in: checkoutData.checkin,
                            check_out: checkoutData.checkout
                        }
                    }),
                    success: function(response) {
                        if (response.success && (response.client_secret || response.setup_intent_client_secret)) {
                            var clientSecret = response.client_secret || response.setup_intent_client_secret;
                            checkoutData.stripe.confirmCardSetup(clientSecret, {
                                payment_method: {
                                    card: checkoutData.cardElement,
                                    billing_details: {
                                        name: $form.find('[name="first_name"]').val() + ' ' + $form.find('[name="last_name"]').val(),
                                        email: $form.find('[name="email"]').val()
                                    }
                                }
                            }).then(function(result) {
                                if (result.error) {
                                    $('#gas-card-errors').text(result.error.message);
                                    $btn.prop('disabled', false);
                                    $btn.find('.gas-btn-text').show();
                                    $btn.find('.gas-btn-loading').hide();
                                } else {
                                    window.gasStripeSetupIntentId = result.setupIntent.id;
                                    window.gasStripePaymentMethodId = result.setupIntent.payment_method;
                                    submitBooking($btn, null);
                                }
                            });
                        } else {
                            alert('Failed to initialize card setup: ' + (response.error || 'Please try again'));
                            $btn.prop('disabled', false);
                            $btn.find('.gas-btn-text').show();
                            $btn.find('.gas-btn-loading').hide();
                        }
                    },
                    error: function() {
                        alert('Payment service unavailable. Please try again.');
                        $btn.prop('disabled', false);
                        $btn.find('.gas-btn-text').show();
                        $btn.find('.gas-btn-loading').hide();
                    }
                });
                return;
            }

            // SERVER-SIDE PAYMENT: tokenise card without charging, send to server
            // Server checks availability THEN charges — no orphan payments
            checkoutData.stripe.createPaymentMethod({
                type: 'card',
                card: checkoutData.cardElement,
                billing_details: {
                    name: $form.find('[name="first_name"]').val() + ' ' + $form.find('[name="last_name"]').val(),
                    email: $form.find('[name="email"]').val()
                }
            }).then(function(result) {
                if (result.error) {
                    $('#gas-card-errors').text(result.error.message);
                    $btn.prop('disabled', false);
                    $btn.find('.gas-btn-text').show();
                    $btn.find('.gas-btn-loading').hide();
                    return;
                }

                // Card tokenised — now submit booking with payment_method_id
                // Server will: check availability → charge card → create booking
                var pmId = result.paymentMethod.id;
                console.log('[Server-side payment] PaymentMethod created:', pmId);
                submitBookingServerPayment($btn, pmId);
            });
        }

        // Submit booking with server-side payment (payment_method_id, not payment_intent_id)
        function submitBookingServerPayment($btn, paymentMethodId) {
            $btn.find('.gas-btn-loading').text(t('booking', 'confirming', 'Confirming booking...')).show();

            var $form = $('#gas-guest-form');
            var formData = {
                unit_id: checkoutData.unitId,
                check_in: checkoutData.checkin,
                check_out: checkoutData.checkout,
                guests: checkoutData.guests,
                adults: (checkoutData.adults != null ? parseInt(checkoutData.adults) : parseInt(checkoutData.guests)) || 1,
                children: parseInt(checkoutData.children) || 0,
                guest_first_name: $form.find('[name="first_name"]').val(),
                guest_last_name: $form.find('[name="last_name"]').val(),
                guest_email: $form.find('[name="email"]').val(),
                guest_phone: $form.find('[name="phone"]').val(),
                guest_address: $form.find('[name="address"]').val(),
                guest_city: $form.find('[name="city"]').val(),
                guest_postcode: $form.find('[name="postcode"]').val(),
                guest_country: $form.find('[name="country"]').val(),
                notes: $form.find('[name="notes"]').val(),
                marketing: $form.find('[name="marketing"]').is(':checked'),
                sms_consent: $form.find('[name="sms_consent"]').is(':checked'),
                payment_method: 'card',
                payment_method_id: paymentMethodId,
                total_price: checkoutData.grandTotal,
                rate_type: checkoutData.rateType,
                upsells: checkoutData.selectedUpsells,
                voucher_code: checkoutData.voucherCode,
                source_site_url: window.location.origin + window.location.pathname,
                deposit_amount: checkoutData.depositAmount,
                balance_amount: checkoutData.balanceAmount,
                // Forward event slug so the booking endpoint can find the
                // matching event_hold and convert it instead of inserting
                // a fresh booking + skip the real-time Beds24 availability
                // check (which would see our own hold as unavailable).
                event_slug: new URLSearchParams(window.location.search).get('event') || undefined,
                price_breakdown: (function() {
                    var bd = checkoutData.gasBreakdown;
                    if (!bd) return null;
                    var upsellsBreakdown = [];
                    var upsellsTotal = 0;
                    (checkoutData.selectedUpsells || []).forEach(function(u) {
                        var total = calculateUpsellItemTotal(u);
                        upsellsTotal += total;
                        // Include id + unit_price so the server can persist a
                        // proper booking_extras row (source_id, unit_price)
                        // and Beds24 receives the per-unit amount instead of
                        // multiplying the line total by qty.
                        upsellsBreakdown.push({
                            id: u.id,
                            name: u.name,
                            quantity: u.quantity || 1,
                            unit_price: parseFloat(u.price) || 0,
                            total: total
                        });
                    });
                    bd.upsells_breakdown = upsellsBreakdown;
                    bd.upsells_total = upsellsTotal;
                    // Voucher discount + voucher metadata. Without these the
                    // server's Beds24 invoiceItems push (server.js:80693)
                    // never emits a negative voucher line, so Beds24 shows
                    // a total that's higher than what the guest was charged
                    // (Cotswolds 2026-06-06: TWINS 15% £81 not landing on
                    // the invoice). voucher_discount is the £ amount the
                    // checkout already deducted; voucher_applied carries
                    // the code + name for the line description.
                    bd.voucher_discount = parseFloat(checkoutData.voucherDiscount) || 0;
                    if (checkoutData.voucher) {
                        bd.voucher_applied = {
                            code: checkoutData.voucherCode || (checkoutData.voucher && checkoutData.voucher.code) || '',
                            name: (checkoutData.voucher && checkoutData.voucher.name) || '',
                            voucher_type: (checkoutData.voucher && checkoutData.voucher.voucher_type) || 'discount',
                            discount_type: (checkoutData.voucher && checkoutData.voucher.discount_type) || 'percentage',
                            discount_value: (checkoutData.voucher && checkoutData.voucher.discount_value) || 0
                        };
                    }
                    return bd;
                })()
            };

            $.ajax({
                url: checkoutData.apiUrl + '/api/public/book',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(formData),
                success: function(response) {
                    if (response.requires_action && response.client_secret) {
                        // 3DS required — handle authentication
                        console.log('[3DS] Authentication required');
                        $btn.find('.gas-btn-loading').text(t('payment', 'authenticating', 'Authenticating card...')).show();

                        checkoutData.stripe.handleNextAction({
                            clientSecret: response.client_secret
                        }).then(function(result) {
                            if (result.error) {
                                $('#gas-card-errors').text(result.error.message);
                                $btn.prop('disabled', false);
                                $btn.find('.gas-btn-text').show();
                                $btn.find('.gas-btn-loading').hide();
                                return;
                            }

                            if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
                                // 3DS passed — resubmit with confirmed payment_intent_id
                                console.log('[3DS] Authentication passed, completing booking');
                                formData.stripe_payment_intent_id = result.paymentIntent.id;
                                formData.stripe_customer_id = response.stripe_customer_id;
                                formData.payment_method_id = null;

                                $.ajax({
                                    url: checkoutData.apiUrl + '/api/public/book',
                                    method: 'POST',
                                    contentType: 'application/json',
                                    data: JSON.stringify(formData),
                                    success: function(bookResponse) {
                                        if (bookResponse.success) {
                                            showBookingConfirmation(bookResponse, $btn);
                                        } else {
                                            $('#gas-card-errors').text(bookResponse.error || 'Booking failed after payment.');
                                            $btn.prop('disabled', false);
                                            $btn.find('.gas-btn-text').show();
                                            $btn.find('.gas-btn-loading').hide();
                                        }
                                    },
                                    error: function() {
                                        $('#gas-card-errors').text('Connection error. Your payment was taken — please contact us.');
                                        $btn.prop('disabled', false);
                                        $btn.find('.gas-btn-text').show();
                                        $btn.find('.gas-btn-loading').hide();
                                    }
                                });
                            } else {
                                $('#gas-card-errors').text('Card authentication was not completed. Please try again.');
                                $btn.prop('disabled', false);
                                $btn.find('.gas-btn-text').show();
                                $btn.find('.gas-btn-loading').hide();
                            }
                        });
                    } else if (response.success) {
                        showBookingConfirmation(response, $btn);
                    } else {
                        $('#gas-card-errors').text(response.error || 'Booking could not be completed.');
                        $btn.prop('disabled', false);
                        $btn.find('.gas-btn-text').show();
                        $btn.find('.gas-btn-loading').hide();
                    }
                },
                error: function() {
                    alert('Connection error. Please try again.');
                    $btn.prop('disabled', false);
                    $btn.find('.gas-btn-text').show();
                    $btn.find('.gas-btn-loading').hide();
                }
            });
        }

        // Show booking confirmation — shared by both payment flows
        function showBookingConfirmation(response, $btn) {
            localStorage.removeItem('gas_hostvana_bookingId');
            // Cart's done — clear it so the floating header button vanishes
            // and the next visit starts fresh. Handles bike-storage standalone
            // (Flow A → /book-now/) and any future cart-driven flows.
            try { if (window.gasCart) window.gasCart.clear(); } catch (e) {}

            // Fire conversion events to whichever analytics platforms the site
            // has loaded. The gtag/fbq scripts are injected by gas-booking.php's
            // inject_analytics() when the site has a GA4 measurement ID and/or
            // FB Pixel ID resolved from site-config. Both checks are no-ops when
            // analytics isn't configured, so this is safe to run unconditionally.
            try {
                var txnId = String(response.booking?.id || response.booking_id || '');
                var value = parseFloat(checkoutData.grandTotal || 0);
                var currency = (checkoutData.currency || 'USD').toUpperCase();
                var roomName = extractText(checkoutData.room?.display_name) || checkoutData.room?.name || 'Room';
                var roomId = String(checkoutData.room?.id || checkoutData.room?.unit_id || '');

                if (typeof gtag === 'function' && txnId && value > 0) {
                    gtag('event', 'purchase', {
                        transaction_id: txnId,
                        value: value,
                        currency: currency,
                        items: [{
                            item_id: roomId,
                            item_name: roomName,
                            quantity: 1,
                            price: value
                        }]
                    });
                }
                if (typeof fbq === 'function' && value > 0) {
                    fbq('track', 'Purchase', {
                        value: value,
                        currency: currency,
                        content_ids: roomId ? [roomId] : undefined,
                        content_type: 'product'
                    });
                }
            } catch (e) {
                // Analytics must never break the confirmation flow.
                console.warn('Conversion event failed:', e);
            }

            $('.gas-checkout-main > *').hide();
            $('.gas-checkout-confirmation').show();
            $('.gas-conf-rooms-list').empty().hide();
            $('.gas-conf-extras-list').empty().hide();
            $('.gas-conf-room-name').show();
            $('.gas-booking-ref').removeClass('gas-ref-small');

            // Booking reference
            var ref = response.booking?.id || response.booking_id || 'Confirmed';
            $('.gas-booking-ref').text(ref);

            // Email
            var guestEmail = $('#gas-guest-form [name="email"]').val() || response.booking?.guest_email || '';
            $('.gas-guest-email').text(guestEmail);

            // Property name
            $('.gas-conf-property-name').text(checkoutData.room?.property_name || '');

            // Room box
            var currency = checkoutData.currency || '';
            var roomHtml = '<div class="gas-conf-room-box">';
            roomHtml += '<div><span class="room-name">' + escapeHtml(extractText(checkoutData.room?.display_name) || checkoutData.room?.name || 'Room') + '</span>';
            roomHtml += '<div class="room-guests">' + (checkoutData.guests || 1) + ' guest' + ((checkoutData.guests || 1) > 1 ? 's' : '') + '</div></div>';
            roomHtml += '<span class="room-price">' + formatPrice(checkoutData.accommodationTotal || checkoutData.grandTotal, currency) + '</span>';
            roomHtml += '</div>';
            $('.gas-conf-rooms-list').html(roomHtml).show();
            $('.gas-conf-room-name').hide();

            // Extras (room upsells + event ticket when booking entered via ?event=<slug>)
            // Per-line total uses calculateUpsellLineTotal so tiered upsells
            // (first_night_price / subsequent_night_price) show the actual
            // amount the guest paid, not the misleading per-unit price.
            var extrasParts = [];
            if (checkoutData.selectedUpsells && checkoutData.selectedUpsells.length > 0) {
                var confNights = (checkoutData.pricing && checkoutData.pricing.nights) || 1;
                var confGuests = checkoutData.guests || 1;
                checkoutData.selectedUpsells.forEach(function(upsell) {
                    var lineTotal = calculateUpsellLineTotal(upsell, confNights, confGuests);
                    extrasParts.push('<div class="gas-conf-extra-box"><span class="extra-name">' + escapeHtml(upsell.name) + '</span><span class="extra-price">' + formatPrice(lineTotal, currency) + '</span></div>');
                });
            }
            var evtConf = checkoutData.pricing && checkoutData.pricing.event_ticket;
            if (evtConf && parseFloat(evtConf.amount) > 0) {
                extrasParts.push('<div class="gas-conf-extra-box"><span class="extra-name">🎟 ' + escapeHtml(evtConf.name || 'Event ticket') + '</span><span class="extra-price">' + formatPrice(parseFloat(evtConf.amount), currency) + '</span></div>');
            }
            // Offer + voucher discounts so the guest sees why Total < Accommodation
            // + Extras. Mirrors the breakdown the email and admin booking view
            // both show. Without these the receipt looked like the discounts
            // had been silently dropped (Tracey, Cotswolds 2026-06-06).
            var bdConf = checkoutData.gasBreakdown || {};
            var offerDisc = parseFloat(bdConf.offer_discount) || 0;
            var voucherDisc = parseFloat(checkoutData.voucherDiscount) || 0;
            if (offerDisc > 0) {
                var offerName = (bdConf.offer_applied && bdConf.offer_applied.name) ? bdConf.offer_applied.name : '';
                var offerLabel = offerName ? ('Offer: ' + offerName) : 'Offer Discount';
                extrasParts.push('<div class="gas-conf-extra-box gas-conf-discount-line"><span class="extra-name" style="color:#16a34a;">' + escapeHtml(offerLabel) + '</span><span class="extra-price" style="color:#16a34a;">-' + formatPrice(offerDisc, currency) + '</span></div>');
            }
            if (voucherDisc > 0) {
                var voucherCode = checkoutData.voucherCode || (checkoutData.voucher && checkoutData.voucher.code) || '';
                var voucherLabel = voucherCode ? ('Voucher: ' + voucherCode) : 'Voucher Discount';
                extrasParts.push('<div class="gas-conf-extra-box gas-conf-discount-line"><span class="extra-name" style="color:#16a34a;">' + escapeHtml(voucherLabel) + '</span><span class="extra-price" style="color:#16a34a;">-' + formatPrice(voucherDisc, currency) + '</span></div>');
            }
            if (extrasParts.length > 0) {
                $('.gas-conf-extras-list').html('<div class="gas-conf-extras-title">Extras</div>' + extrasParts.join('')).show();
            }

            // Dates
            var fmtDate = function(dateStr) {
                var d = new Date(dateStr + 'T12:00:00');
                return d.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
            };
            $('.gas-conf-checkin').text(fmtDate(checkoutData.checkin));
            $('.gas-conf-checkout').text(fmtDate(checkoutData.checkout));

            // Guests
            var guestCount = checkoutData.guests || 1;
            $('.gas-conf-guests').text(guestCount + ' ' + (guestCount === 1 ? 'Guest' : 'Guests'));

            // Total
            $('.gas-conf-total').text(formatPrice(checkoutData.grandTotal, currency));

            // Payment info
            if (checkoutData.depositAmount) {
                $('.gas-price-paid').show();
                $('.gas-conf-deposit').text('✓ ' + formatPrice(checkoutData.depositAmount, currency));
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function submitBooking($btn, paymentIntentId) {
            $btn.prop('disabled', true);
            $btn.find('.gas-btn-text').hide();
            $btn.find('.gas-btn-loading').text(t('booking', 'confirming', 'Confirming booking...')).show();
            
            // Gather form data
            var $form = $('#gas-guest-form');
            var paymentMethod = $('input[name="payment_method"]:checked').val();
            
            console.log('submitBooking called with paymentIntentId:', paymentIntentId);
            console.log('checkoutData.depositAmount:', checkoutData.depositAmount);
            console.log('checkoutData.balanceAmount:', checkoutData.balanceAmount);
            console.log('paymentMethod:', paymentMethod);
            
            var formData = {
                unit_id: checkoutData.unitId,
                check_in: checkoutData.checkin,
                check_out: checkoutData.checkout,
                guests: checkoutData.guests,
                adults: (checkoutData.adults != null ? parseInt(checkoutData.adults) : parseInt(checkoutData.guests)) || 1,
                children: parseInt(checkoutData.children) || 0,
                guest_first_name: $form.find('[name="first_name"]').val(),
                guest_last_name: $form.find('[name="last_name"]').val(),
                guest_email: $form.find('[name="email"]').val(),
                guest_phone: $form.find('[name="phone"]').val(),
                guest_address: $form.find('[name="address"]').val(),
                guest_city: $form.find('[name="city"]').val(),
                guest_postcode: $form.find('[name="postcode"]').val(),
                guest_country: $form.find('[name="country"]').val(),
                notes: $form.find('[name="notes"]').val(),
                marketing: $form.find('[name="marketing"]').is(':checked'),
                sms_consent: $form.find('[name="sms_consent"]').is(':checked'),
                payment_method: paymentMethod,
                total_price: checkoutData.grandTotal,
                rate_type: checkoutData.rateType,
                upsells: checkoutData.selectedUpsells,
                voucher_code: checkoutData.voucherCode,
                event_slug: new URLSearchParams(window.location.search).get('event') || undefined,
                stripe_payment_intent_id: paymentIntentId,
                enigma_reference_id: window.gasEnigmaReferenceId || null,
                stripe_setup_intent_id: window.gasStripeSetupIntentId || null,
                stripe_payment_method_id: window.gasStripePaymentMethodId || null,
                source_site_url: window.location.origin + window.location.pathname,
                deposit_amount: (paymentMethod === 'card' || paymentMethod === 'card_guarantee') ? checkoutData.depositAmount : null,
                balance_amount: (paymentMethod === 'card' || paymentMethod === 'card_guarantee') ? checkoutData.balanceAmount : null,
                price_breakdown: (function() {
                    var bd = checkoutData.gasBreakdown;
                    if (!bd) return null;
                    var upsellsBreakdown = [];
                    var upsellsTotal = 0;
                    (checkoutData.selectedUpsells || []).forEach(function(u) {
                        var total = calculateUpsellItemTotal(u);
                        upsellsTotal += total;
                        // Include id + unit_price so the server can persist a
                        // proper booking_extras row (source_id, unit_price)
                        // and Beds24 receives the per-unit amount instead of
                        // multiplying the line total by qty.
                        upsellsBreakdown.push({
                            id: u.id,
                            name: u.name,
                            quantity: u.quantity || 1,
                            unit_price: parseFloat(u.price) || 0,
                            total: total
                        });
                    });
                    bd.upsells_breakdown = upsellsBreakdown;
                    bd.upsells_total = upsellsTotal;
                    // Voucher discount + voucher metadata. Without these the
                    // server's Beds24 invoiceItems push (server.js:80693)
                    // never emits a negative voucher line, so Beds24 shows
                    // a total that's higher than what the guest was charged
                    // (Cotswolds 2026-06-06: TWINS 15% £81 not landing on
                    // the invoice). voucher_discount is the £ amount the
                    // checkout already deducted; voucher_applied carries
                    // the code + name for the line description.
                    bd.voucher_discount = parseFloat(checkoutData.voucherDiscount) || 0;
                    if (checkoutData.voucher) {
                        bd.voucher_applied = {
                            code: checkoutData.voucherCode || (checkoutData.voucher && checkoutData.voucher.code) || '',
                            name: (checkoutData.voucher && checkoutData.voucher.name) || '',
                            voucher_type: (checkoutData.voucher && checkoutData.voucher.voucher_type) || 'discount',
                            discount_type: (checkoutData.voucher && checkoutData.voucher.discount_type) || 'percentage',
                            discount_value: (checkoutData.voucher && checkoutData.voucher.discount_value) || 0
                        };
                    }
                    return bd;
                })(),
                damage_deposit: checkoutData.damageDeposit || null,
                cm_quote_source: checkoutData.cmQuoteSource || null,
                hostvana_booking_id: localStorage.getItem('gas_hostvana_bookingId') || null
            };
            
            $.ajax({
                url: checkoutData.apiUrl + '/api/public/book',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(formData),
                success: function(response) {
                    if (response.success) {
                        // Clear Hostvana inquiry booking ID — it's now confirmed
                        localStorage.removeItem('gas_hostvana_bookingId');

                        // Show confirmation
                        $('.gas-checkout-main > *').hide();
                        $('.gas-checkout-confirmation').show();
                        
                        // Reset confirmation elements
                        $('.gas-conf-rooms-list').empty().hide();
                        $('.gas-conf-extras-list').empty().hide();
                        $('.gas-conf-room-name').show();
                        $('.gas-booking-ref').removeClass('gas-ref-small');
                        
                        // Populate booking reference
                        $('.gas-booking-ref').text(response.booking_id || response.booking?.id || 'Confirmed');
                        $('.gas-guest-email').text(formData.guest_email);
                        
                        // Populate property
                        $('.gas-conf-property-name').text(checkoutData.room?.property_name || 'Property');
                        
                        // Build room box for single booking
                        var currency = checkoutData.currency || '';
                        var roomHtml = '<div class="gas-conf-room-box">';
                        roomHtml += '<div><span class="room-name">' + escapeHtml(checkoutData.room?.name || 'Room') + '</span>';
                        roomHtml += '<div class="room-guests">' + checkoutData.guests + ' guest' + (checkoutData.guests > 1 ? 's' : '') + '</div></div>';
                        roomHtml += '<span class="room-price">' + formatPrice(checkoutData.accommodationTotal, currency) + '</span>';
                        roomHtml += '</div>';
                        $('.gas-conf-rooms-list').html(roomHtml).show();
                        $('.gas-conf-room-name').hide(); // Hide the simple text
                        
                        // Show extras/upsells + event ticket if any.
                        // Per-line uses calculateUpsellLineTotal so tiered upsells
                        // (75 first night / 45 thereafter) show the actual paid amount.
                        var extrasParts2 = [];
                        if (checkoutData.selectedUpsells && checkoutData.selectedUpsells.length > 0) {
                            var conf2Nights = (checkoutData.pricing && checkoutData.pricing.nights) || 1;
                            var conf2Guests = checkoutData.guests || 1;
                            checkoutData.selectedUpsells.forEach(function(upsell) {
                                var lineTotal = calculateUpsellLineTotal(upsell, conf2Nights, conf2Guests);
                                extrasParts2.push('<div class="gas-conf-extra-box"><span class="extra-name">' + escapeHtml(upsell.name) + '</span><span class="extra-price">' + formatPrice(lineTotal, currency) + '</span></div>');
                            });
                        }
                        var evtConf2 = checkoutData.pricing && checkoutData.pricing.event_ticket;
                        if (evtConf2 && parseFloat(evtConf2.amount) > 0) {
                            extrasParts2.push('<div class="gas-conf-extra-box"><span class="extra-name">🎟 ' + escapeHtml(evtConf2.name || 'Event ticket') + '</span><span class="extra-price">' + formatPrice(parseFloat(evtConf2.amount), currency) + '</span></div>');
                        }
                        // Offer + voucher discounts — mirrors the receipt + email.
                        var bdConf2 = checkoutData.gasBreakdown || {};
                        var offerDisc2 = parseFloat(bdConf2.offer_discount) || 0;
                        var voucherDisc2 = parseFloat(checkoutData.voucherDiscount) || 0;
                        if (offerDisc2 > 0) {
                            var offerName2 = (bdConf2.offer_applied && bdConf2.offer_applied.name) ? bdConf2.offer_applied.name : '';
                            var offerLabel2 = offerName2 ? ('Offer: ' + offerName2) : 'Offer Discount';
                            extrasParts2.push('<div class="gas-conf-extra-box gas-conf-discount-line"><span class="extra-name" style="color:#16a34a;">' + escapeHtml(offerLabel2) + '</span><span class="extra-price" style="color:#16a34a;">-' + formatPrice(offerDisc2, currency) + '</span></div>');
                        }
                        if (voucherDisc2 > 0) {
                            var voucherCode2 = checkoutData.voucherCode || (checkoutData.voucher && checkoutData.voucher.code) || '';
                            var voucherLabel2 = voucherCode2 ? ('Voucher: ' + voucherCode2) : 'Voucher Discount';
                            extrasParts2.push('<div class="gas-conf-extra-box gas-conf-discount-line"><span class="extra-name" style="color:#16a34a;">' + escapeHtml(voucherLabel2) + '</span><span class="extra-price" style="color:#16a34a;">-' + formatPrice(voucherDisc2, currency) + '</span></div>');
                        }
                        if (extrasParts2.length > 0) {
                            $('.gas-conf-extras-list').html('<div class="gas-conf-extras-title">Extras</div>' + extrasParts2.join('')).show();
                        }
                        
                        // Format and display dates
                        var formatDate = function(dateStr) {
                            var d = new Date(dateStr + 'T12:00:00');
                            var options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
                            return d.toLocaleDateString(dateLocale, options);
                        };
                        $('.gas-conf-checkin').text(formatDate(checkoutData.checkin));
                        $('.gas-conf-checkout').text(formatDate(checkoutData.checkout));
                        
                        // Guests
                        var guestText = checkoutData.guests + ' ' + (checkoutData.guests === 1 ? 'Guest' : 'Guests');
                        $('.gas-conf-guests').text(guestText);
                        
                        // Pricing
                        $('.gas-conf-total').text(formatPrice(checkoutData.grandTotal, checkoutData.currency));
                        
                        if (paymentMethod === 'card' && paymentIntentId) {
                            // Card payment with deposit taken
                            $('.gas-price-paid').show();
                            $('.gas-conf-deposit').text('✓ ' + formatPrice(checkoutData.depositAmount, checkoutData.currency));

                            if (checkoutData.balanceAmount > 0) {
                                $('.gas-price-balance').show();
                                $('.gas-conf-balance').text(formatPrice(checkoutData.balanceAmount, checkoutData.currency));
                            }
                        } else if (paymentMethod === 'card' && window.gasStripeSetupIntentId) {
                            // Deferred card payment (0% deposit, card saved for later)
                            if (checkoutData.balanceAmount > 0) {
                                $('.gas-price-balance').show();
                                $('.gas-price-balance span').first().text('Balance \u2014 card charged before arrival');
                                $('.gas-conf-balance').text(formatPrice(checkoutData.balanceAmount, checkoutData.currency));
                            }
                            $('.gas-price-property span').last().text('Card on file');
                            $('.gas-price-property').show();
                        } else {
                            $('.gas-price-property').show();
                        }
                        
                        // Show bank details on confirmation
                        if (paymentMethod === 'pay_at_property' && window.gasBankDetails && window.gasBankDetails.accounts && window.gasBankDetails.accounts.length > 0) {
                            var bankHtml = '<div style="background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-top: 16px; text-align: left;">';
                            bankHtml += '<h4 style="margin: 0 0 12px 0; color: #92400e; font-size: 14px;">' + t('payment', 'bank_transfer_details', 'Bank Transfer Details') + '</h4>';
                            window.gasBankDetails.accounts.forEach(function(account) {
                                bankHtml += '<div style="background: white; border-radius: 8px; padding: 12px; margin-bottom: 8px; border: 1px solid #fde68a;">';
                                if (account.bank_name) bankHtml += '<div style="font-weight: 600; color: #92400e; margin-bottom: 6px;">' + account.bank_name + '</div>';
                                bankHtml += '<table style="width: 100%; font-size: 13px; border-collapse: collapse;">';
                                if (account.account_name) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c; width: 40%;">Account Name</td><td style="padding: 3px 0; font-weight: 500;">' + account.account_name + '</td></tr>';
                                if (account.account_number) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">Account No.</td><td style="padding: 3px 0; font-family: monospace;">' + account.account_number + '</td></tr>';
                                if (account.sort_code) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">Sort Code</td><td style="padding: 3px 0; font-family: monospace;">' + account.sort_code + '</td></tr>';
                                if (account.iban) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">IBAN</td><td style="padding: 3px 0; font-family: monospace;">' + account.iban + '</td></tr>';
                                if (account.swift_bic) bankHtml += '<tr><td style="padding: 3px 0; color: #78716c;">SWIFT/BIC</td><td style="padding: 3px 0; font-family: monospace;">' + account.swift_bic + '</td></tr>';
                                bankHtml += '</table></div>';
                            });
                            if (window.gasBankDetails.instructions) bankHtml += '<p style="margin: 8px 0 0 0; font-size: 12px; color: #b45309; font-style: italic;">' + window.gasBankDetails.instructions + '</p>';
                            if (window.gasBankDetails.deadline_hours > 0) { var dt = window.gasBankDetails.deadline_hours >= 24 ? Math.floor(window.gasBankDetails.deadline_hours/24) + ' day(s)' : window.gasBankDetails.deadline_hours + ' hours'; bankHtml += '<p style="margin: 8px 0 0; font-size: 12px; color: #b45309; text-align: center;">⏰ Please transfer within ' + dt + '</p>'; }
                            bankHtml += '</div>';
                            $('.gas-confirmation-contact').after(bankHtml);
                        }
                        
                        // Scroll to top
                        window.scrollTo({ top: 0, behavior: 'instant' });
                        document.body.style.overflow = 'hidden'; // Prevent background scroll
                    } else {
                        // Handle specific error types
                        if (response.unavailable_date) {
                            // Dates no longer available - offer to select new dates
                            if (confirm(response.error + '\n\nWould you like to select different dates?')) {
                                // Go back to Book Now page
                                var bookNowUrl = (typeof gasBooking !== 'undefined' && gasBooking.searchResultsUrl) ? gasBooking.searchResultsUrl : '/book-now/';
                                window.location.href = bookNowUrl;
                            }
                        } else {
                            alert('Booking failed: ' + (response.error || 'Please try again'));
                        }
                        $btn.prop('disabled', false);
                        $btn.find('.gas-btn-text').show();
                        $btn.find('.gas-btn-loading').hide();
                    }
                },
                error: function() {
                    alert(t('common', 'connection_error', 'Connection error. Please try again.'));
                    $btn.prop('disabled', false);
                    $btn.find('.gas-btn-text').show();
                    $btn.find('.gas-btn-loading').hide();
                }
            });
        }
    }

    // ========================================
    // ENIGMA CARD GUARANTEE - Global Functions
    // ========================================
    
    window.gasLoadEnigmaForm = function(propertyId) {
        // Reset capture state for new booking
        window.gasEnigmaCardCaptured = false;
        window.gasEnigmaReferenceId = null;
        window.gasEnigmaPendingRef = null;
        if (window.groupCheckoutData) {
            window.groupCheckoutData.enigmaCardCaptured = false;
            window.groupCheckoutData.enigmaReferenceId = null;
        }
        
        var baseUrl = window.gasApiUrl || 'https://admin.gas.travel';
        $.ajax({
            url: baseUrl + '/api/public/enigma/form-url',
            method: 'GET',
            data: {
                property_id: propertyId,
                booking_ref: 'pending',
                embed: 'false'
            },
            success: function(response) {
                if (response.success && response.form_url) {
                    var container = document.getElementById('gas-enigma-iframe-container');
                    if (container) {
                        container.innerHTML = '<iframe src="' + response.form_url + '" style="width:100%; min-height:560px; border:none;" id="gas-enigma-iframe" allow="payment"></iframe>';
                    }
                    if (response.reference_id) {
                        window.gasEnigmaPendingRef = response.reference_id;
                        window.gasStartEnigmaPolling(response.reference_id);
                    }
                } else {
                    $('#gas-enigma-iframe-container').html('<p style="text-align:center; color:#ef4444; padding:20px;">Unable to load secure form. Please try again.</p>');
                }
            },
            error: function() {
                $('#gas-enigma-iframe-container').html('<p style="text-align:center; color:#ef4444; padding:20px;">Unable to load secure form. Please try again.</p>');
            }
        });
    };

    window.gasStartEnigmaPolling = function(refId) {
        var baseUrl = window.gasApiUrl || 'https://admin.gas.travel';
        console.log('GAS: Starting Enigma capture polling for ref:', refId);
        var pollInterval = setInterval(function() {
            $.ajax({
                url: baseUrl + '/api/public/enigma/capture-status/' + encodeURIComponent(refId),
                method: 'GET',
                success: function(response) {
                    if (response.captured) {
                        console.log('GAS: Enigma capture confirmed by server poll');
                        clearInterval(pollInterval);
                        window.gasMarkEnigmaCaptured(refId);
                    }
                }
            });
        }, 2000);
        setTimeout(function() { clearInterval(pollInterval); }, 600000);
    };

    window.gasMarkEnigmaCaptured = function(refId) {
        if (window.gasEnigmaCardCaptured) return;
        console.log('GAS: Card captured, ref:', refId);
        window.gasEnigmaReferenceId = refId;
        window.gasEnigmaCardCaptured = true;
        if (window.groupCheckoutData) {
            window.groupCheckoutData.enigmaReferenceId = refId;
            window.groupCheckoutData.enigmaCardCaptured = true;
        }
        var successMsg = window.gasEnigmaSuccessMessage || t('payment', 'card_secured', 'Thank you! Your card is secured. Please now confirm your booking below.');
        $('#gas-enigma-iframe-container').html(
            '<div style="text-align:center; padding:30px;">' +
            '<div style="font-size:2.5rem; margin-bottom:10px;">&#x2705;</div>' +
            '<strong style="color:#059669; font-size:1.1rem;">Card secured successfully</strong>' +
            '<p style="color:#374151; font-size:14px; margin:12px 0 0 0; line-height:1.5;">' + successMsg + '</p>' +
            '</div>'
        );
    };

    // Listen for Enigma postMessage (fallback)
    window.addEventListener('message', function(event) {
        if (event.data && event.data.source === 'enigma-vault') {
            console.log('GAS: Enigma postMessage received', event.data);
            if (event.data.status === 'success' && event.data.referenceId) {
                window.gasMarkEnigmaCaptured(event.data.referenceId);
            }
        }
    });

    // Bank Transfer Details Renderer
    window.gasRenderBankDetails = function(bankDetails) {
        var $content = $('#gas-bank-details-content');
        if (!bankDetails || !bankDetails.accounts || bankDetails.accounts.length === 0) {
            $content.html('<p style="text-align:center; color: #92400e; padding: 16px;">Bank details not yet configured by property owner.</p>');
            return;
        }
        var html = '';
        bankDetails.accounts.forEach(function(account, i) {
            html += '<div style="background: white; border-radius: 8px; padding: 14px; margin-bottom: ' + (i < bankDetails.accounts.length - 1 ? '10px' : '0') + '; border: 1px solid #fde68a;">';
            if (account.account_name) html += '<div style="margin-bottom: 8px;"><strong style="color: #92400e; font-size: 14px;">' + account.account_name + '</strong></div>';
            html += '<table style="width: 100%; font-size: 13px; border-collapse: collapse;">';
            if (account.iban) html += '<tr><td style="padding: 4px 0; color: #78716c; width: 40%;">IBAN</td><td style="padding: 4px 0; font-weight: 500; font-family: monospace;">' + account.iban + '</td></tr>';
            if (account.swift_bic) html += '<tr><td style="padding: 4px 0; color: #78716c;">SWIFT/BIC</td><td style="padding: 4px 0; font-weight: 500; font-family: monospace;">' + account.swift_bic + '</td></tr>';
            if (account.account_number) html += '<tr><td style="padding: 4px 0; color: #78716c;">Account No.</td><td style="padding: 4px 0; font-weight: 500; font-family: monospace;">' + account.account_number + '</td></tr>';
            if (account.bank_name) html += '<tr><td style="padding: 4px 0; color: #78716c;">Bank</td><td style="padding: 4px 0;">' + account.bank_name + '</td></tr>';
            html += '</table></div>';
        });
        $content.html(html);
        
        // Show instructions if available
        var $instructions = $('#gas-bank-instructions');
        if (bankDetails.instructions) {
            $instructions.find('p').text(bankDetails.instructions);
            $instructions.show();
        } else {
            $instructions.hide();
        }
        
        // Show deadline if set
        if (bankDetails.deadline_hours && bankDetails.deadline_hours > 0) {
            var deadlineText = bankDetails.deadline_hours >= 24 
                ? Math.floor(bankDetails.deadline_hours / 24) + ' day' + (Math.floor(bankDetails.deadline_hours / 24) > 1 ? 's' : '')
                : bankDetails.deadline_hours + ' hours';
            $content.append('<p style="margin: 10px 0 0 0; font-size: 12px; color: #b45309; text-align: center;">⏰ Please complete transfer within ' + deadlineText + '</p>');
        }
    };

    // Send Enquiry - guest sends their details to property owner when having payment trouble
    window.gasSendEnquiry = function() {
        var $form = $('#gas-guest-form');
        var firstName = $form.find('[name="first_name"]').val() || '';
        var lastName = $form.find('[name="last_name"]').val() || '';
        var email = $form.find('[name="email"]').val() || '';
        
        if (!firstName || !email) {
            alert(t('booking', 'fill_details_first', 'Please fill in your name and email first (Step 2).'));
            return;
        }
        
        var apiUrl = gasBooking.apiUrl || (typeof checkoutData !== 'undefined' ? checkoutData.apiUrl : '') || (typeof window.groupCheckoutData !== 'undefined' ? window.groupCheckoutData.apiUrl : '');
        if (!apiUrl) return;
        
        var unitId = null, checkin = null, checkout = null, guests = null, totalPrice = null;
        
        if (typeof checkoutData !== 'undefined' && checkoutData.unitId) {
            unitId = checkoutData.unitId;
            checkin = checkoutData.checkin;
            checkout = checkoutData.checkout;
            guests = checkoutData.guests;
            totalPrice = checkoutData.grandTotal;
        } else if (typeof window.groupCheckoutData !== 'undefined') {
            var eqGroup = window.groupCheckoutData.paymentGroups[window.groupCheckoutData.paymentGroupKeys[window.groupCheckoutData.currentPaymentGroupIndex]];
            unitId = eqGroup ? eqGroup.items[0]?.unitId : window.groupCheckoutData.items?.[0]?.unitId;
            checkin = window.groupCheckoutData.checkin;
            checkout = window.groupCheckoutData.checkout;
            guests = eqGroup ? eqGroup.items.reduce(function(s, i) { return s + (i.guests || 1); }, 0) : null;
            totalPrice = eqGroup ? (eqGroup.subtotal + (eqGroup.taxTotal || 0)) : null;
        }

        // Confirm with guest
        if (!confirm(t('booking', 'send_enquiry_confirm', 'Send your booking enquiry to the property owner? They will contact you to arrange payment.'))) {
            return;
        }
        
        var $link = $('.gas-send-enquiry-link');
        $link.text('⏳ Sending...');
        
        $.ajax({
            url: apiUrl + '/api/public/payment-failed',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                unit_id: unitId,
                check_in: checkin,
                check_out: checkout,
                guests: guests,
                guest_first_name: firstName,
                guest_last_name: lastName,
                guest_email: email,
                guest_phone: $form.find('[name="phone"]').val() || '',
                guest_address: $form.find('[name="address"]').val() || '',
                guest_city: $form.find('[name="city"]').val() || '',
                guest_postcode: $form.find('[name="postcode"]').val() || '',
                guest_country: $form.find('[name="country"]').val() || '',
                total_price: totalPrice,
                payment_type: 'enquiry',
                error_message: 'Guest sent enquiry — requested alternative payment',
                source_site_url: window.location.origin + window.location.pathname
            }),
            success: function() {
                // Replace the enquiry link with confirmation
                $('.gas-enquiry-option').html(
                    '<div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px; text-align: center;">' +
                    '<div style="font-size: 1.5rem; margin-bottom: 8px;">✅</div>' +
                    '<strong style="color: #065f46;">' + t('booking', 'enquiry_sent', 'Enquiry Sent!') + '</strong>' +
                    '<p style="margin: 8px 0 0; color: #047857; font-size: 0.85rem;">' + t('booking', 'enquiry_sent_desc', 'The property owner has received your enquiry and will contact you shortly to arrange payment.') + '</p>' +
                    '</div>'
                );
            },
            error: function() {
                $link.text('💬 ' + t('payment', 'trouble_paying', 'Having trouble paying? Send an enquiry instead'));
                alert(t('common', 'connection_error', 'Connection error. Please try again.'));
            }
        });
    };

    // Payment Failed Notification - sends guest details to server for owner notification + CM inquiry
    window.gasNotifyPaymentFailed = function(paymentType, errorMessage) {
        try {
            var apiUrl = gasBooking.apiUrl || (typeof checkoutData !== 'undefined' ? checkoutData.apiUrl : '') || (typeof window.groupCheckoutData !== 'undefined' ? window.groupCheckoutData.apiUrl : '');
            if (!apiUrl) return;
            
            var $form = $('#gas-guest-form');
            var unitId = null;
            var checkin = null;
            var checkout = null;
            var guests = null;
            var totalPrice = null;
            
            // Get data from whichever checkout context is active
            if (typeof checkoutData !== 'undefined' && checkoutData.unitId) {
                unitId = checkoutData.unitId;
                checkin = checkoutData.checkin;
                checkout = checkoutData.checkout;
                guests = checkoutData.guests;
                totalPrice = checkoutData.grandTotal;
            } else if (typeof window.groupCheckoutData !== 'undefined') {
                var pfGroup = window.groupCheckoutData.paymentGroups[window.groupCheckoutData.paymentGroupKeys[window.groupCheckoutData.currentPaymentGroupIndex]];
                unitId = pfGroup ? pfGroup.items[0]?.unitId : window.groupCheckoutData.items?.[0]?.unitId;
                checkin = window.groupCheckoutData.checkin;
                checkout = window.groupCheckoutData.checkout;
                guests = pfGroup ? pfGroup.items.reduce(function(s, i) { return s + (i.guests || 1); }, 0) : null;
                totalPrice = pfGroup ? (pfGroup.subtotal + (pfGroup.taxTotal || 0)) : null;
            }

            var payload = {
                unit_id: unitId,
                check_in: checkin,
                check_out: checkout,
                guests: guests,
                guest_first_name: $form.find('[name="first_name"]').val() || '',
                guest_last_name: $form.find('[name="last_name"]').val() || '',
                guest_email: $form.find('[name="email"]').val() || '',
                guest_phone: $form.find('[name="phone"]').val() || '',
                guest_address: $form.find('[name="address"]').val() || '',
                guest_city: $form.find('[name="city"]').val() || '',
                guest_postcode: $form.find('[name="postcode"]').val() || '',
                guest_country: $form.find('[name="country"]').val() || '',
                total_price: totalPrice,
                payment_type: paymentType,
                error_message: errorMessage,
                source_site_url: window.location.origin + window.location.pathname
            };
            
            // Fire and forget - don't block the user
            $.ajax({
                url: apiUrl + '/api/public/payment-failed',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(payload)
            });
            
            console.log('GAS: Payment failure notification sent', paymentType, errorMessage);
        } catch (e) {
            console.error('GAS: Failed to send payment failure notification', e);
        }
    };

    // ========== COUNTRY SEARCH ==========
    var gasCountries = [
        {c:"AF",n:"Afghanistan"},{c:"AL",n:"Albania"},{c:"DZ",n:"Algeria"},{c:"AD",n:"Andorra"},{c:"AO",n:"Angola"},{c:"AG",n:"Antigua and Barbuda"},{c:"AR",n:"Argentina"},{c:"AM",n:"Armenia"},{c:"AU",n:"Australia"},{c:"AT",n:"Austria"},
        {c:"AZ",n:"Azerbaijan"},{c:"BS",n:"Bahamas"},{c:"BH",n:"Bahrain"},{c:"BD",n:"Bangladesh"},{c:"BB",n:"Barbados"},{c:"BY",n:"Belarus"},{c:"BE",n:"Belgium"},{c:"BZ",n:"Belize"},{c:"BJ",n:"Benin"},{c:"BT",n:"Bhutan"},
        {c:"BO",n:"Bolivia"},{c:"BA",n:"Bosnia and Herzegovina"},{c:"BW",n:"Botswana"},{c:"BR",n:"Brazil"},{c:"BN",n:"Brunei"},{c:"BG",n:"Bulgaria"},{c:"BF",n:"Burkina Faso"},{c:"BI",n:"Burundi"},{c:"CV",n:"Cabo Verde"},{c:"KH",n:"Cambodia"},
        {c:"CM",n:"Cameroon"},{c:"CA",n:"Canada"},{c:"CF",n:"Central African Republic"},{c:"TD",n:"Chad"},{c:"CL",n:"Chile"},{c:"CN",n:"China"},{c:"CO",n:"Colombia"},{c:"KM",n:"Comoros"},{c:"CG",n:"Congo"},{c:"CD",n:"Congo (DRC)"},
        {c:"CR",n:"Costa Rica"},{c:"CI",n:"Côte d'Ivoire"},{c:"HR",n:"Croatia"},{c:"CU",n:"Cuba"},{c:"CY",n:"Cyprus"},{c:"CZ",n:"Czech Republic"},{c:"DK",n:"Denmark"},{c:"DJ",n:"Djibouti"},{c:"DM",n:"Dominica"},{c:"DO",n:"Dominican Republic"},
        {c:"EC",n:"Ecuador"},{c:"EG",n:"Egypt"},{c:"SV",n:"El Salvador"},{c:"GQ",n:"Equatorial Guinea"},{c:"ER",n:"Eritrea"},{c:"EE",n:"Estonia"},{c:"SZ",n:"Eswatini"},{c:"ET",n:"Ethiopia"},{c:"FJ",n:"Fiji"},{c:"FI",n:"Finland"},
        {c:"FR",n:"France"},{c:"GA",n:"Gabon"},{c:"GM",n:"Gambia"},{c:"GE",n:"Georgia"},{c:"DE",n:"Germany"},{c:"GH",n:"Ghana"},{c:"GR",n:"Greece"},{c:"GD",n:"Grenada"},{c:"GT",n:"Guatemala"},{c:"GN",n:"Guinea"},
        {c:"GW",n:"Guinea-Bissau"},{c:"GY",n:"Guyana"},{c:"HT",n:"Haiti"},{c:"HN",n:"Honduras"},{c:"HK",n:"Hong Kong"},{c:"HU",n:"Hungary"},{c:"IS",n:"Iceland"},{c:"IN",n:"India"},{c:"ID",n:"Indonesia"},{c:"IR",n:"Iran"},
        {c:"IQ",n:"Iraq"},{c:"IE",n:"Ireland"},{c:"IL",n:"Israel"},{c:"IT",n:"Italy"},{c:"JM",n:"Jamaica"},{c:"JP",n:"Japan"},{c:"JO",n:"Jordan"},{c:"KZ",n:"Kazakhstan"},{c:"KE",n:"Kenya"},{c:"KI",n:"Kiribati"},
        {c:"KW",n:"Kuwait"},{c:"KG",n:"Kyrgyzstan"},{c:"LA",n:"Laos"},{c:"LV",n:"Latvia"},{c:"LB",n:"Lebanon"},{c:"LS",n:"Lesotho"},{c:"LR",n:"Liberia"},{c:"LY",n:"Libya"},{c:"LI",n:"Liechtenstein"},{c:"LT",n:"Lithuania"},
        {c:"LU",n:"Luxembourg"},{c:"MO",n:"Macao"},{c:"MG",n:"Madagascar"},{c:"MW",n:"Malawi"},{c:"MY",n:"Malaysia"},{c:"MV",n:"Maldives"},{c:"ML",n:"Mali"},{c:"MT",n:"Malta"},{c:"MH",n:"Marshall Islands"},{c:"MR",n:"Mauritania"},
        {c:"MU",n:"Mauritius"},{c:"MX",n:"Mexico"},{c:"FM",n:"Micronesia"},{c:"MD",n:"Moldova"},{c:"MC",n:"Monaco"},{c:"MN",n:"Mongolia"},{c:"ME",n:"Montenegro"},{c:"MA",n:"Morocco"},{c:"MZ",n:"Mozambique"},{c:"MM",n:"Myanmar"},
        {c:"NA",n:"Namibia"},{c:"NR",n:"Nauru"},{c:"NP",n:"Nepal"},{c:"NL",n:"Netherlands"},{c:"NZ",n:"New Zealand"},{c:"NI",n:"Nicaragua"},{c:"NE",n:"Niger"},{c:"NG",n:"Nigeria"},{c:"KP",n:"North Korea"},{c:"MK",n:"North Macedonia"},
        {c:"NO",n:"Norway"},{c:"OM",n:"Oman"},{c:"PK",n:"Pakistan"},{c:"PW",n:"Palau"},{c:"PS",n:"Palestine"},{c:"PA",n:"Panama"},{c:"PG",n:"Papua New Guinea"},{c:"PY",n:"Paraguay"},{c:"PE",n:"Peru"},{c:"PH",n:"Philippines"},
        {c:"PL",n:"Poland"},{c:"PT",n:"Portugal"},{c:"PR",n:"Puerto Rico"},{c:"QA",n:"Qatar"},{c:"RO",n:"Romania"},{c:"RU",n:"Russia"},{c:"RW",n:"Rwanda"},{c:"KN",n:"Saint Kitts and Nevis"},{c:"LC",n:"Saint Lucia"},{c:"VC",n:"Saint Vincent and the Grenadines"},
        {c:"WS",n:"Samoa"},{c:"SM",n:"San Marino"},{c:"ST",n:"São Tomé and Príncipe"},{c:"SA",n:"Saudi Arabia"},{c:"SN",n:"Senegal"},{c:"RS",n:"Serbia"},{c:"SC",n:"Seychelles"},{c:"SL",n:"Sierra Leone"},{c:"SG",n:"Singapore"},{c:"SK",n:"Slovakia"},
        {c:"SI",n:"Slovenia"},{c:"SB",n:"Solomon Islands"},{c:"SO",n:"Somalia"},{c:"ZA",n:"South Africa"},{c:"KR",n:"South Korea"},{c:"SS",n:"South Sudan"},{c:"ES",n:"Spain"},{c:"LK",n:"Sri Lanka"},{c:"SD",n:"Sudan"},{c:"SR",n:"Suriname"},
        {c:"SE",n:"Sweden"},{c:"CH",n:"Switzerland"},{c:"SY",n:"Syria"},{c:"TW",n:"Taiwan"},{c:"TJ",n:"Tajikistan"},{c:"TZ",n:"Tanzania"},{c:"TH",n:"Thailand"},{c:"TL",n:"Timor-Leste"},{c:"TG",n:"Togo"},{c:"TO",n:"Tonga"},
        {c:"TT",n:"Trinidad and Tobago"},{c:"TN",n:"Tunisia"},{c:"TR",n:"Turkey"},{c:"TM",n:"Turkmenistan"},{c:"TV",n:"Tuvalu"},{c:"UG",n:"Uganda"},{c:"UA",n:"Ukraine"},{c:"AE",n:"United Arab Emirates"},{c:"GB",n:"United Kingdom"},{c:"US",n:"United States"},
        {c:"UY",n:"Uruguay"},{c:"UZ",n:"Uzbekistan"},{c:"VU",n:"Vanuatu"},{c:"VA",n:"Vatican City"},{c:"VE",n:"Venezuela"},{c:"VN",n:"Vietnam"},{c:"YE",n:"Yemen"},{c:"ZM",n:"Zambia"},{c:"ZW",n:"Zimbabwe"}
    ];

    $(document).on('input', '.gas-country-search', function() {
        var $input = $(this);
        var $wrap = $input.closest('.gas-country-search-wrap');
        var $dropdown = $wrap.find('.gas-country-dropdown');
        var $hidden = $wrap.find('input[name="country"]');
        var query = $input.val().toLowerCase().trim();
        
        if (query.length < 1) {
            $dropdown.hide().empty();
            $hidden.val('');
            return;
        }
        
        // Starts-with matches first, then contains matches
        var startsWith = gasCountries.filter(function(c) {
            return c.n.toLowerCase().indexOf(query) === 0;
        });
        var contains = gasCountries.filter(function(c) {
            return c.n.toLowerCase().indexOf(query) > 0;
        });
        var matches = startsWith.concat(contains).slice(0, 8);
        
        if (matches.length === 0) {
            $dropdown.hide().empty();
            return;
        }
        
        var html = '';
        matches.forEach(function(c) {
            html += '<div class="gas-country-option" data-code="' + c.c + '">' + c.n + '</div>';
        });
        $dropdown.html(html).show();
    });

    $(document).on('click', '.gas-country-option', function() {
        var $opt = $(this);
        var $wrap = $opt.closest('.gas-country-search-wrap');
        $wrap.find('.gas-country-search').val($opt.text());
        $wrap.find('input[name="country"]').val($opt.data('code'));
        $wrap.find('.gas-country-dropdown').hide().empty();
    });

    $(document).on('blur', '.gas-country-search', function() {
        var $wrap = $(this).closest('.gas-country-search-wrap');
        setTimeout(function() { $wrap.find('.gas-country-dropdown').hide(); }, 200);
    });

    $(document).on('focus', '.gas-country-search', function() {
        var val = $(this).val();
        if (val.length >= 1) $(this).trigger('input');
    });
    // ========== END COUNTRY SEARCH ==========

    // ========== BIKE STORAGE WIDGET ==========
    // Pro Builder block "Bike Storage Booking" renders
    //   <div class="gas-bike-storage" data-property-id="523"></div>
    // We replace each one with a self-contained booking flow:
    //   step 1 — pick arrival + departure dates, click Check availability
    //   step 2 — see summary + fill guest details, click Book and pay
    //   step 3 — redirect to Stripe Checkout
    //   step 4 — Stripe returns ?paid=1, show confirmation
    //
    // Same pattern as gas-search-widget but trimmed to the rental case
    // (no room picker, no guest counter — one cabinet allocated server-side).
    (function initBikeStorageWidgets() {
        var $widgets = $('.gas-bike-storage[data-property-id]');
        if (!$widgets.length) return;

        // Inject scoped styles once. Kept inline so it ships with the plugin
        // and doesn't depend on the theme's CSS. Picks up the burger theme
        // accent colour via CSS variable when present.
        if (!document.getElementById('gas-bike-storage-styles')) {
            var css = [
                '.gas-bike-storage-widget{font-family:inherit;max-width:560px;margin:1rem 0;padding:1.25rem;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.06)}',
                '.gas-bs-tagline{color:#64748b;font-size:0.9rem;margin-bottom:1rem}',
                '.gas-bs-date-row{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1rem}',
                '.gas-bs-date-row label{display:flex;flex-direction:column;font-size:0.85rem;color:#475569;gap:0.25rem}',
                '.gas-bs-date-row input{padding:0.6rem 0.75rem;border:1px solid #cbd5e1;border-radius:8px;font-size:1rem;background:#fff}',
                '.gas-bs-check-btn,.gas-bs-book-btn{display:block;width:100%;padding:0.75rem 1rem;border:none;border-radius:8px;background:var(--button_color,#F97224);color:#fff;font-size:1rem;font-weight:600;cursor:pointer;transition:opacity 0.15s}',
                '.gas-bs-check-btn:hover,.gas-bs-book-btn:hover{opacity:0.92}',
                '.gas-bs-check-btn:disabled,.gas-bs-book-btn:disabled{opacity:0.5;cursor:wait}',
                '.gas-bs-back-btn{background:none;border:none;color:#64748b;font-size:0.85rem;cursor:pointer;margin-top:0.75rem;padding:0.25rem 0;text-decoration:underline}',
                '.gas-bs-message,.gas-bs-form-error{margin-top:0.75rem;font-size:0.9rem;min-height:1.25rem}',
                '.gas-bs-summary{padding:0.85rem 1rem;background:#f8fafc;border-radius:8px;margin-bottom:1rem}',
                '.gas-bs-form-row{display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem}',
                '.gas-bs-guest-form input{width:100%;padding:0.6rem 0.75rem;border:1px solid #cbd5e1;border-radius:8px;font-size:0.95rem;margin-bottom:0.5rem;box-sizing:border-box}',
                '.gas-bs-step-success{text-align:center;padding:1rem 0}',
                '.gas-bs-step-success h3{color:#10b981;margin:0 0 0.5rem}',
                '.gas-bs-linked-toggle{margin-bottom:0.75rem}',
                '.gas-bs-show-linked{font-size:0.85rem;color:var(--button_color,#F97224);text-decoration:underline}',
                '.gas-bs-linked-panel{padding:0.85rem;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;margin-bottom:1rem}',
                '.gas-bs-linked-row{display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.5rem}',
                '.gas-bs-linked-row input{padding:0.5rem 0.65rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.9rem}',
                '.gas-bs-linked-find{padding:0.45rem 0.85rem;border:none;border-radius:6px;background:#64748b;color:#fff;font-size:0.85rem;cursor:pointer;margin-right:0.5rem}',
                '.gas-bs-linked-cancel{font-size:0.8rem;color:#64748b;text-decoration:underline}',
                '.gas-bs-linked-msg{margin-top:0.5rem;font-size:0.85rem}',
                '.gas-bs-linked-banner{padding:0.6rem 0.85rem;background:#dcfce7;color:#166534;border-radius:6px;font-size:0.9rem;margin-bottom:0.85rem}',
                '.gas-bs-book-room-btn{display:block;width:100%;padding:0.65rem 1rem;margin-top:0.6rem;border:1px solid var(--button_color,#F97224);border-radius:8px;background:#fff;color:var(--button_color,#F97224);font-size:0.95rem;font-weight:600;cursor:pointer;transition:all 0.15s}',
                '.gas-bs-book-room-btn:hover{background:var(--button_color,#F97224);color:#fff}',
                '.gas-bs-qty-row{display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;padding:0.55rem 0.85rem;background:#fff;border:1px solid #e2e8f0;border-radius:8px}',
                '.gas-bs-qty-label{font-size:0.9rem;color:#475569;font-weight:600}',
                '.gas-bs-qty-controls{display:inline-flex;align-items:center;gap:0;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden}',
                '.gas-bs-qty-btn{width:32px;height:32px;border:none;background:#f8fafc;color:#0f172a;font-size:1.1rem;font-weight:700;cursor:pointer;line-height:1}',
                '.gas-bs-qty-btn:hover:not(:disabled){background:#e2e8f0}',
                '.gas-bs-qty-btn:disabled{opacity:0.4;cursor:not-allowed}',
                '.gas-bs-qty-display{min-width:36px;text-align:center;font-weight:700;font-size:1rem;color:#0f172a}',
                '.gas-bs-qty-hint{font-size:0.75rem;color:#94a3b8;margin-left:auto}',
                '@media(max-width:520px){.gas-bs-date-row,.gas-bs-form-row,.gas-bs-linked-row{grid-template-columns:1fr}}'
            ].join('');
            var styleEl = document.createElement('style');
            styleEl.id = 'gas-bike-storage-styles';
            styleEl.textContent = css;
            document.head.appendChild(styleEl);
        }

        $widgets.each(function() {
            var $container = $(this);
            // Avoid double-init if the page re-runs document.ready (rare,
            // but cheap insurance for SPA-style Pro Builder previews).
            if ($container.data('gasBsInited')) return;
            $container.data('gasBsInited', true);

            var propertyId = $container.data('property-id');
            var bookingUrl = $container.data('booking-url') || '/';
            var apiUrl = (typeof gasBooking !== 'undefined' && gasBooking.apiUrl) ? gasBooking.apiUrl : 'https://admin.gas.travel';

            $container.html(
                '<div class="gas-bike-storage-widget">' +
                '  <div class="gas-bs-step gas-bs-step-dates">' +
                '    <div class="gas-bs-tagline">£10 per cabinet per day · Secure · Individual code lock · CCTV-monitored</div>' +
                '    <div class="gas-bs-linked-toggle"><a href="#" class="gas-bs-show-linked">Already booked a room? Add storage to your booking →</a></div>' +
                '    <div class="gas-bs-linked-panel" style="display:none">' +
                '      <div class="gas-bs-linked-row">' +
                '        <input class="gas-bs-linked-ref" placeholder="Booking ref (e.g. GAS-123)">' +
                '        <input class="gas-bs-linked-name" placeholder="Last name">' +
                '      </div>' +
                '      <button type="button" class="gas-bs-linked-find">Find my booking</button>' +
                '      <a href="#" class="gas-bs-linked-cancel">← Cancel, book without a room</a>' +
                '      <div class="gas-bs-linked-msg"></div>' +
                '    </div>' +
                '    <div class="gas-bs-date-row">' +
                '      <label>Arrival<input type="text" class="gas-bs-checkin" placeholder="Pick a date" readonly></label>' +
                '      <label>Departure<input type="text" class="gas-bs-checkout" placeholder="Pick a date" readonly></label>' +
                '    </div>' +
                '    <button type="button" class="gas-bs-check-btn">Check availability</button>' +
                '    <div class="gas-bs-message"></div>' +
                '  </div>' +
                '  <div class="gas-bs-step gas-bs-step-confirm" style="display:none">' +
                '    <div class="gas-bs-linked-banner" style="display:none"></div>' +
                '    <div class="gas-bs-summary"></div>' +
                '    <div class="gas-bs-qty-row">' +
                '      <span class="gas-bs-qty-label">Number of cabinets</span>' +
                '      <div class="gas-bs-qty-controls">' +
                '        <button type="button" class="gas-bs-qty-btn gas-bs-qty-minus" aria-label="Decrease">−</button>' +
                '        <span class="gas-bs-qty-display">1</span>' +
                '        <button type="button" class="gas-bs-qty-btn gas-bs-qty-plus" aria-label="Increase">+</button>' +
                '      </div>' +
                '      <span class="gas-bs-qty-hint"></span>' +
                '    </div>' +
                '    <form class="gas-bs-guest-form">' +
                '      <div class="gas-bs-form-row">' +
                '        <input name="first_name" placeholder="First name *">' +
                '        <input name="last_name" placeholder="Last name *">' +
                '      </div>' +
                '      <input name="email" type="email" placeholder="Email *">' +
                '      <input name="phone" type="tel" placeholder="Phone (optional)">' +
                '      <button type="submit" class="gas-bs-book-btn">Continue to checkout →</button>' +
                '      <div class="gas-bs-form-error"></div>' +
                '    </form>' +
                '    <button type="button" class="gas-bs-back-btn">← Change dates</button>' +
                '  </div>' +
                '  <div class="gas-bs-step gas-bs-step-success" style="display:none">' +
                '    <h3>✓ Booking confirmed</h3>' +
                '    <p>Check your email — your individual access code is on the way.</p>' +
                '  </div>' +
                '</div>'
            );

            // Date pickers. Reuse flatpickr that the plugin already loads.
            var $checkin = $container.find('.gas-bs-checkin');
            var $checkout = $container.find('.gas-bs-checkout');
            if (typeof flatpickr !== 'undefined') {
                flatpickr($checkin[0], {
                    dateFormat: 'Y-m-d', minDate: 'today', disableMobile: true,
                    onChange: function(dates) {
                        if (dates.length && $checkout[0]._flatpickr) {
                            var next = new Date(dates[0]); next.setDate(next.getDate() + 1);
                            $checkout[0]._flatpickr.set('minDate', next);
                            setTimeout(function() { $checkout[0]._flatpickr.open(); }, 100);
                        }
                    }
                });
                flatpickr($checkout[0], { dateFormat: 'Y-m-d', minDate: 'today', disableMobile: true });
            }

            // Stripe success / cancel return handling. The session_id arrives
            // in the URL; we don't need to read it — the server webhook is
            // the source of truth for "booking is paid". This is just the UX.
            var qparams = new URLSearchParams(window.location.search);
            if (qparams.get('paid') === '1') {
                $container.find('.gas-bs-step').hide();
                $container.find('.gas-bs-step-success').show();
            } else if (qparams.get('cancelled') === '1') {
                $container.find('.gas-bs-message').html('<div style="color:#b91c1c">Payment cancelled — pick your dates again any time.</div>');
            }

            var lastQuote = null;
            // Linked-booking state: when the guest verifies an existing
            // accommodation booking, we lock dates + guest details to it
            // and the checkout call carries parent_booking_id.
            var linkedParent = null; // { id, reference, arrival_date, departure_date, guest_first_name, guest_last_name }
            // Multi-cabinet quantity. Clamped against q.available_count at
            // step-2 render time; the +/- buttons update both state and the
            // summary line.
            var quantity = 1;
            function fmtSymbol(c) { return c === 'GBP' ? '£' : c === 'EUR' ? '€' : c === 'USD' ? '$' : (c + ' '); }
            function renderSummary() {
                if (!lastQuote) return;
                var symbol = fmtSymbol(lastQuote.currency);
                var lineTotal = lastQuote.total_price * quantity;
                $container.find('.gas-bs-summary').html(
                    '<div style="font-size:1rem;line-height:1.5">' +
                    '<strong>' + lastQuote.nights + ' day' + (lastQuote.nights === 1 ? '' : 's') + '</strong>' +
                    ' · <strong>' + quantity + '</strong> cabinet' + (quantity === 1 ? '' : 's') +
                    ' · <strong>' + symbol + lineTotal + '</strong> total<br>' +
                    '<span style="color:#64748b;font-size:0.85rem">' +
                    lastQuote.available_count + ' of ' + lastQuote.total_units + ' cabinets free · ' +
                    'Pickup ' + lastQuote.pickup_time + ', return ' + lastQuote.return_time +
                    '</span></div>'
                );
                $container.find('.gas-bs-book-btn').text('Book and pay ' + symbol + lineTotal);
                // Update the +/- enabled state + hint
                $container.find('.gas-bs-qty-display').text(quantity);
                $container.find('.gas-bs-qty-minus').prop('disabled', quantity <= 1);
                $container.find('.gas-bs-qty-plus').prop('disabled', quantity >= lastQuote.available_count);
                $container.find('.gas-bs-qty-hint').text('Up to ' + lastQuote.available_count + ' available');
            }
            $container.on('click', '.gas-bs-qty-minus', function() {
                if (quantity > 1) { quantity -= 1; renderSummary(); }
            });
            $container.on('click', '.gas-bs-qty-plus', function() {
                if (lastQuote && quantity < lastQuote.available_count) { quantity += 1; renderSummary(); }
            });

            // Toggle the "I already have a booking" panel.
            $container.on('click', '.gas-bs-show-linked', function(e) {
                e.preventDefault();
                $container.find('.gas-bs-linked-toggle').hide();
                $container.find('.gas-bs-linked-panel').show();
            });
            $container.on('click', '.gas-bs-linked-cancel', function(e) {
                e.preventDefault();
                $container.find('.gas-bs-linked-panel').hide();
                $container.find('.gas-bs-linked-toggle').show();
                $container.find('.gas-bs-linked-msg').html('');
                $container.find('.gas-bs-date-row').show();
                $container.find('.gas-bs-check-btn').text('Check availability').show();
                // Release the parent-range constraints on the date pickers
                // — otherwise the user is stuck with old min/maxDate.
                if ($checkin[0]?._flatpickr) {
                    $checkin[0]._flatpickr.set('minDate', 'today');
                    $checkin[0]._flatpickr.set('maxDate', null);
                    $checkin[0]._flatpickr.clear();
                }
                if ($checkout[0]?._flatpickr) {
                    $checkout[0]._flatpickr.set('minDate', 'today');
                    $checkout[0]._flatpickr.set('maxDate', null);
                    $checkout[0]._flatpickr.clear();
                }
                linkedParent = null;
            });

            // Find-my-booking → server verifies ref + last name.
            $container.on('click', '.gas-bs-linked-find', function() {
                var ref = $container.find('.gas-bs-linked-ref').val().trim();
                var ln  = $container.find('.gas-bs-linked-name').val().trim();
                var $msg = $container.find('.gas-bs-linked-msg');
                if (!ref || !ln) {
                    $msg.html('<div style="color:#b91c1c">Booking reference and last name required.</div>');
                    return;
                }
                $msg.html('<div style="color:#64748b">Looking up your booking…</div>');
                $.ajax({
                    url: apiUrl + '/api/public/bike-storage/find-booking',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ property_id: propertyId, booking_reference: ref, last_name: ln }),
                    success: function(r) {
                        if (!r.success) {
                            $msg.html('<div style="color:#b91c1c">' + (r.error || 'Booking not found') + '</div>');
                            return;
                        }
                        // Lock to parent's dates + guest. Skip the date picker
                        // entirely — bike storage runs for the same window as
                        // the parent accommodation booking.
                        linkedParent = r.booking;
                        $msg.html(
                            '<div style="color:#16a34a">✓ Found ' + linkedParent.reference + ' — ' +
                            linkedParent.guest_first_name + ' ' + linkedParent.guest_last_name + '.<br>' +
                            'Your room: ' + linkedParent.arrival_date + ' to ' + linkedParent.departure_date + '.<br>' +
                            '<span style="color:#64748b;font-size:0.85rem">Storage can match your room dates or be shorter — adjust below.</span></div>'
                        );
                        // Pre-fill dates to match the parent room booking but
                        // KEEP the date row visible so the guest can shorten
                        // the storage window (e.g. only need storage night 2
                        // of a 3-night stay). Constrain the flatpickr range
                        // to within the parent's nights — server re-validates
                        // anyway but the picker prevents most mistakes.
                        if ($checkin[0]._flatpickr) {
                            $checkin[0]._flatpickr.set('minDate', linkedParent.arrival_date);
                            $checkin[0]._flatpickr.set('maxDate', linkedParent.departure_date);
                            $checkin[0]._flatpickr.setDate(linkedParent.arrival_date, true);
                        } else {
                            $checkin.val(linkedParent.arrival_date);
                        }
                        if ($checkout[0]._flatpickr) {
                            $checkout[0]._flatpickr.set('minDate', linkedParent.arrival_date);
                            $checkout[0]._flatpickr.set('maxDate', linkedParent.departure_date);
                            $checkout[0]._flatpickr.setDate(linkedParent.departure_date, true);
                        } else {
                            $checkout.val(linkedParent.departure_date);
                        }
                        $container.find('.gas-bs-date-row').show();
                        $container.find('.gas-bs-check-btn').text('Check availability for these dates').show();
                    },
                    error: function(x) {
                        var em = (x.responseJSON && x.responseJSON.error) ? x.responseJSON.error : 'Network error';
                        $msg.html('<div style="color:#b91c1c">' + em + '</div>');
                    }
                });
            });

            $container.on('click', '.gas-bs-check-btn', function() {
                var checkin = $checkin.val();
                var checkout = $checkout.val();
                var $msg = $container.find('.gas-bs-message');
                if (!checkin || !checkout) {
                    $msg.html('<div style="color:#b91c1c">Pick both dates first.</div>');
                    return;
                }
                $msg.html('<div style="color:#64748b">Checking availability…</div>');
                $.ajax({
                    url: apiUrl + '/api/public/bike-storage/availability',
                    data: { property_id: propertyId, check_in: checkin, check_out: checkout },
                    dataType: 'json',
                    success: function(r) {
                        if (!r.success) { $msg.html('<div style="color:#b91c1c">' + (r.error || 'Could not check') + '</div>'); return; }
                        if (r.available_count === 0) {
                            $msg.html('<div style="color:#b91c1c">All ' + r.total_units + ' cabinets are booked for those dates. Try different dates.</div>');
                            return;
                        }
                        lastQuote = r;
                        // Stash dates on the quote so the checkout payload
                        // always has them even if the picker is hidden.
                        lastQuote.check_in = $checkin.val();
                        lastQuote.check_out = $checkout.val();
                        // Clamp quantity if the user already adjusted it on
                        // a previous quote that had more cabinets free.
                        if (quantity > r.available_count) quantity = r.available_count;
                        if (quantity < 1) quantity = 1;
                        $msg.html('');
                        $container.find('.gas-bs-step-dates').hide();
                        $container.find('.gas-bs-step-confirm').show();
                        // Linked mode: hide the guest form (we have the
                        // guest's details on the parent booking) and show
                        // a banner so they know what they're attaching to.
                        if (linkedParent) {
                            $container.find('.gas-bs-linked-banner').html(
                                'Adding to <strong>' + linkedParent.reference + '</strong> · ' +
                                linkedParent.guest_first_name + ' ' + linkedParent.guest_last_name
                            ).show();
                            $container.find('.gas-bs-guest-form input[name]').prop('required', false);
                            $container.find('.gas-bs-guest-form .gas-bs-form-row, .gas-bs-guest-form input[name=email], .gas-bs-guest-form input[name=phone]').hide();
                            $container.find('.gas-bs-book-room-btn').hide();
                        } else {
                            // Standalone path: hide the guest form too —
                            // /book-now/ collects guest details + payment
                            // inline. The widget's only job here is to
                            // confirm dates + quantity + jump into checkout.
                            $container.find('.gas-bs-linked-banner').hide();
                            $container.find('.gas-bs-guest-form input[name]').prop('required', false);
                            $container.find('.gas-bs-guest-form .gas-bs-form-row, .gas-bs-guest-form input[name=email], .gas-bs-guest-form input[name=phone]').hide();
                            $container.find('.gas-bs-book-room-btn').hide();
                        }
                        renderSummary();
                    },
                    error: function() { $msg.html('<div style="color:#b91c1c">Network error — please try again.</div>'); }
                });
            });

            $container.on('click', '.gas-bs-back-btn', function() {
                $container.find('.gas-bs-step-confirm').hide();
                $container.find('.gas-bs-step-dates').show();
                lastQuote = null;
            });

            // Flow D: redirect into the main booking widget with the bike-
            // storage upsell pre-ticked. Dates are pre-filled via ?checkin /
            // ?checkout (existing widget params). prefill_upsells carries the
            // upsell ID — the main widget's upsell-render code picks it up
            // and auto-selects matching cards after upsells render. We also
            // pass the label + total so the rooms page can render a sticky
            // "bike storage in cart" banner immediately, no API call needed.
            $container.on('click', '.gas-bs-book-room-btn', function() {
                if (!lastQuote || !lastQuote.upsell_id) return;
                var ci = $checkin.val();
                var co = $checkout.val();
                var sep = bookingUrl.indexOf('?') === -1 ? '?' : '&';
                var symbolOut = (lastQuote.currency === 'GBP') ? '£' : (lastQuote.currency === 'EUR' ? '€' : (lastQuote.currency === 'USD' ? '$' : lastQuote.currency + ' '));
                var label = 'Bike storage · ' + symbolOut + lastQuote.total_price + ' for ' + lastQuote.nights + ' day' + (lastQuote.nights === 1 ? '' : 's');
                var url = bookingUrl + sep + 'checkin=' + encodeURIComponent(ci) +
                                       '&checkout=' + encodeURIComponent(co) +
                                       '&prefill_upsells=' + encodeURIComponent(lastQuote.upsell_id) +
                                       '&prefill_label=' + encodeURIComponent(label);
                window.location.href = url;
            });

            $container.on('submit', '.gas-bs-guest-form', function(e) {
                e.preventDefault();
                if (!lastQuote) return;
                var $form = $(this);
                var $err = $container.find('.gas-bs-form-error');
                var $btn = $container.find('.gas-bs-book-btn');
                var origLabel = $btn.text();
                $err.html('');
                $btn.prop('disabled', true).text('Creating booking…');
                var ci = lastQuote.check_in || $checkin.val();
                var co = lastQuote.check_out || $checkout.val();

                // STANDALONE PATH — route to the standard /book-now/ checkout
                // page with bike storage pre-ticked as an upsell. Lets the
                // guest also add a room if they want, and keeps payment on
                // the same site (inline Stripe Elements) instead of bouncing
                // out to checkout.stripe.com. Replaces the old POST-to-
                // /checkout that created a hosted Stripe Checkout session.
                if (!linkedParent) {
                    if (!lastQuote.upsell_id) {
                        $err.html('<div style="color:#b91c1c">No bike-storage upsell configured for this property — contact the host.</div>');
                        $btn.prop('disabled', false).text(origLabel);
                        return;
                    }
                    var symbolOut = (lastQuote.currency === 'GBP') ? '£' : (lastQuote.currency === 'EUR' ? '€' : (lastQuote.currency === 'USD' ? '$' : lastQuote.currency + ' '));
                    var totalAll = lastQuote.total_price * quantity;
                    var label = 'Bike storage × ' + quantity + ' · ' + symbolOut + totalAll + ' for ' + lastQuote.nights + ' day' + (lastQuote.nights === 1 ? '' : 's');
                    // Single source of truth: URL params. No localStorage
                    // cart layer — the bike storage upsell already exists
                    // in the DB and prefill_upsells/quantity is the same
                    // mechanism the room flow uses. cart_only=1 only
                    // bypasses the "select a room" gate on the checkout
                    // page; everything else routes through the standard
                    // upsell rendering.
                    var params = [
                        'cart_only=1',
                        'checkin=' + encodeURIComponent(ci),
                        'checkout=' + encodeURIComponent(co),
                        'property=' + encodeURIComponent(propertyId),
                        'prefill_upsells=' + encodeURIComponent(lastQuote.upsell_id),
                        'prefill_quantity=' + encodeURIComponent(quantity),
                        'prefill_label=' + encodeURIComponent(label),
                        'prefill_price=' + encodeURIComponent(lastQuote.total_price),
                        'prefill_currency=' + encodeURIComponent(lastQuote.currency || 'GBP'),
                        // booking_url lets the cart-only checkout render an
                        // "Add a room" link that round-trips back to /book-now/
                        // with these same upsell params attached.
                        'booking_url=' + encodeURIComponent(bookingUrl)
                    ];
                    window.location.href = '/checkout/?' + params.join('&');
                    return;
                }

                // LINKED-TO-EXISTING-BOOKING PATH (Flow C) — still uses the
                // server's /checkout endpoint + Stripe Checkout. The guest's
                // already paid their room and just wants to attach storage;
                // they don't need to re-enter card details for the same trip.
                // Future cleanup: charge their card-on-file via Stripe API
                // directly so this also stays on-site.
                var payload = {
                    property_id: propertyId,
                    parent_booking_id: linkedParent.id,
                    parent_last_name: linkedParent.guest_last_name,
                    check_in: ci,
                    check_out: co,
                    quantity: quantity,
                    source_site_url: window.location.origin + window.location.pathname
                };
                $.ajax({
                    url: apiUrl + '/api/public/bike-storage/checkout',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify(payload),
                    success: function(r) {
                        if (!r.success || !r.checkout_url) {
                            $err.html('<div style="color:#b91c1c">' + (r.error || 'Could not create booking') + '</div>');
                            $btn.prop('disabled', false).text(origLabel);
                            return;
                        }
                        window.location.href = r.checkout_url;
                    },
                    error: function(x) {
                        var msg = (x.responseJSON && x.responseJSON.error) ? x.responseJSON.error : 'Network error';
                        $err.html('<div style="color:#b91c1c">' + msg + '</div>');
                        $btn.prop('disabled', false).text(origLabel);
                    }
                });
            });
        });
    })();
    // ========== END BIKE STORAGE WIDGET ==========

});
