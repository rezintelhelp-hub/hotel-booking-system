/**
 * GAS WhatsApp deep-link widget — vanilla JS, drops into any site.
 *
 * Usage:
 *   <script src="https://admin.gas.travel/whatsapp-widget.js"
 *           data-account-id="219"
 *           data-context="Property: Cotswolds · Room: Suite 3"
 *           data-position="bottom-right"
 *           data-brand-color="#25D366"
 *           async></script>
 *
 * data-account-id  (optional) — pins the widget to a specific GAS account's
 *                   own WABA. If omitted or the account has no own WABA, the
 *                   GAS platform default WhatsApp number is used.
 * data-context     (optional) — text pre-filled in the guest's WhatsApp when
 *                   they tap the button. Defaults to the current page URL.
 * data-position    (optional) — "bottom-right" (default) or "bottom-left".
 * data-brand-color (optional) — HEX for the floating button. Defaults to
 *                   WhatsApp green #25D366.
 */
(function () {
    // Guard against double-include.
    if (window.__gasWaWidgetLoaded) return;
    window.__gasWaWidgetLoaded = true;

    // Resolve our own <script> tag to read data attributes. document.currentScript
    // is null in async-loaded scripts, so scan by src as a fallback.
    var thisScript = document.currentScript;
    if (!thisScript) {
        var all = document.getElementsByTagName('script');
        for (var i = 0; i < all.length; i++) {
            if (all[i].src && all[i].src.indexOf('whatsapp-widget.js') !== -1) {
                thisScript = all[i];
                break;
            }
        }
    }
    if (!thisScript) return;

    // Derive the API origin from the script's own src so this file works
    // whether it's served from admin.gas.travel, a staging URL, or a mirror.
    var scriptUrl;
    try { scriptUrl = new URL(thisScript.src); } catch (e) { return; }
    var apiOrigin = scriptUrl.origin;

    var accountId = thisScript.getAttribute('data-account-id') || '';
    var context = thisScript.getAttribute('data-context') || '';
    var position = thisScript.getAttribute('data-position') || 'bottom-right';
    var brandColor = thisScript.getAttribute('data-brand-color') || '#25D366';

    // Default context — current page URL + title. Gives the operator enough
    // signal to know where the guest came from without adding tracking pixels.
    if (!context) {
        try {
            var title = (document.title || '').slice(0, 100);
            context = 'Hi — I found you via ' + title + ' (' + location.href + ')';
        } catch (e) {
            context = 'Hi';
        }
    }

    function buildDeepLink(digits) {
        var encoded = encodeURIComponent(context);
        return 'https://wa.me/' + digits + '?text=' + encoded;
    }

    function positionCss(pos) {
        if (pos === 'bottom-left') return 'left:20px; right:auto;';
        return 'right:20px; left:auto;';
    }

    // Fetch the phone number for this account. On failure, don't render.
    var qs = accountId ? ('?account_id=' + encodeURIComponent(accountId)) : '';
    fetch(apiOrigin + '/api/public/whatsapp-widget/config' + qs, { credentials: 'omit' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (!data || !data.success || !data.phone_number) return;
            render(data.phone_number);
        })
        .catch(function () { /* silent — better no widget than a broken one */ });

    function render(digits) {
        var btn = document.createElement('a');
        btn.href = buildDeepLink(digits);
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.setAttribute('aria-label', 'Chat with us on WhatsApp');
        btn.style.cssText = [
            'position:fixed',
            'bottom:20px',
            positionCss(position),
            'z-index:2147483000',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'width:60px',
            'height:60px',
            'border-radius:50%',
            'background:' + brandColor,
            'box-shadow:0 4px 14px rgba(0,0,0,0.25)',
            'text-decoration:none',
            'transition:transform 0.15s ease-out, box-shadow 0.15s ease-out',
            'cursor:pointer'
        ].join(';') + ';';

        // Inline the official WhatsApp glyph as SVG so the widget renders
        // with no font/emoji font dependency.
        btn.innerHTML =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" fill="white" aria-hidden="true">' +
            '<path d="M16 .396C7.164.396.008 7.552.008 16.388c0 2.923.767 5.664 2.104 8.024L0 32l7.792-2.06a15.94 15.94 0 008.208 2.256h.006c8.836 0 15.992-7.157 15.992-15.992S24.836.396 16 .396zm0 29.288a13.28 13.28 0 01-6.777-1.86l-.484-.288-4.612 1.22 1.234-4.5-.316-.5A13.28 13.28 0 012.72 16.388C2.72 8.98 8.598 3.104 16 3.104s13.28 5.876 13.28 13.284c0 7.408-5.874 13.296-13.28 13.296zm7.276-9.937c-.4-.2-2.36-1.164-2.724-1.296-.364-.132-.628-.2-.892.2s-1.024 1.296-1.256 1.564c-.232.268-.464.3-.86.1-.4-.2-1.688-.62-3.216-1.98-1.188-1.06-1.988-2.36-2.22-2.76-.232-.4-.024-.616.176-.816.18-.18.4-.464.6-.696.2-.232.264-.4.4-.664.132-.268.068-.5-.032-.696-.1-.2-.892-2.152-1.224-2.944-.324-.776-.652-.668-.892-.68l-.756-.012c-.264 0-.696.1-1.06.5-.364.4-1.388 1.356-1.388 3.308s1.42 3.836 1.62 4.104c.2.268 2.796 4.268 6.772 5.984.948.408 1.688.652 2.264.836.952.304 1.816.26 2.5.16.764-.112 2.36-.964 2.688-1.9.332-.936.332-1.74.232-1.9-.1-.164-.364-.264-.764-.464z"/>' +
            '</svg>';

        btn.addEventListener('mouseenter', function () {
            btn.style.transform = 'scale(1.08)';
            btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.32)';
        });
        btn.addEventListener('mouseleave', function () {
            btn.style.transform = '';
            btn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
        });

        document.body.appendChild(btn);
    }
})();
