/**
 * GAS Booking Embed — Drop-in JavaScript for Webflow & any website
 * Single page app — room listing, room detail, and checkout all stay in one embed.
 *
 * Usage (Script Tag):
 *   <script src="https://lite.gas.travel/gas-embed.js" data-account="YOUR_ACCOUNT_CODE"></script>
 *
 * Optional Attributes:
 *   data-account    (required)  Your GAS account code
 *   data-checkin    (optional)  Pre-fill check-in date (YYYY-MM-DD)
 *   data-checkout   (optional)  Pre-fill check-out date (YYYY-MM-DD)
 *   data-guests     (optional)  Pre-fill guest count (number)
 *   data-style      (optional)  "full" (default) or "compact" — compact hides map/header
 *   data-color      (optional)  Accent colour hex e.g. "#e74c3c" — overrides account default
 *   data-min-height (optional)  Minimum iframe height in px (default: 700)
 *   data-lang       (optional)  Language code e.g. "es", "de", "fr"
 *
 * Version: 1.1.0
 * https://gas.travel
 */
(function() {
  'use strict';

  // Find our script tag
  var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('gas-embed') !== -1) return scripts[i];
    }
  })();

  if (!script) {
    console.error('[GAS Embed] Could not find script element');
    return;
  }

  var account = script.getAttribute('data-account');
  if (!account) {
    console.error('[GAS Embed] Missing required data-account attribute');
    return;
  }

  // Configuration from data attributes
  var config = {
    account: account,
    checkin: script.getAttribute('data-checkin') || '',
    checkout: script.getAttribute('data-checkout') || '',
    guests: script.getAttribute('data-guests') || '',
    style: script.getAttribute('data-style') || 'full',
    color: script.getAttribute('data-color') || '',
    minHeight: parseInt(script.getAttribute('data-min-height')) || 700,
    lang: script.getAttribute('data-lang') || ''
  };

  // Determine embed server origin
  var origin = script.src.replace(/\/gas-embed\.js.*$/, '').replace(/\/embed\.js.*$/, '');
  if (!origin || origin === script.src) {
    origin = 'https://lite.gas.travel';
  }

  // Build iframe URL
  var src = origin + '/book/' + encodeURIComponent(config.account) + '?embed=1';
  if (config.checkin) src += '&checkin=' + encodeURIComponent(config.checkin);
  if (config.checkout) src += '&checkout=' + encodeURIComponent(config.checkout);
  if (config.guests) src += '&guests=' + encodeURIComponent(config.guests);
  if (config.color) src += '&color=' + encodeURIComponent(config.color);
  if (config.lang) src += '&lang=' + encodeURIComponent(config.lang);
  if (config.style === 'compact') src += '&compact=1';

  // Add spinner animation
  var style = document.createElement('style');
  style.textContent = '@keyframes gas-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);

  // Create wrapper container
  var container = document.createElement('div');
  container.className = 'gas-booking-embed';
  container.style.cssText = 'width:100%;overflow:hidden;position:relative;';

  // Create iframe — allow scrolling for room detail pages
  var iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.style.cssText = [
    'width:100%;border:none;display:block;',
    'min-height:' + config.minHeight + 'px;',
    'transition:opacity 0.3s;'
  ].join('');
  iframe.setAttribute('title', 'Book Your Stay');
  iframe.allow = 'payment';

  // Show loading state on navigation
  iframe.addEventListener('load', function() {
    iframe.style.opacity = '1';
    // Scroll to top of embed when page changes inside iframe
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  container.appendChild(iframe);
  script.parentNode.insertBefore(container, script.nextSibling);

  // Listen for messages from the iframe
  window.addEventListener('message', function(e) {
    if (!iframe.contentWindow) return;
    if (e.source !== iframe.contentWindow) return;
    var data = e.data;

    // Auto-resize iframe to match content height
    if (data && data.type === 'gas-embed-resize' && typeof data.height === 'number') {
      iframe.style.height = Math.max(data.height, config.minHeight) + 'px';
    }

    // Checkout / external links — open in parent window
    if (data && data.type === 'gas-embed-navigate' && data.url) {
      window.open(data.url, '_blank');
    }
  });

  // Expose API for Webflow interactions
  window.GASEmbed = window.GASEmbed || {};
  window.GASEmbed[config.account] = {
    iframe: iframe,
    container: container,
    setDates: function(checkin, checkout) {
      iframe.contentWindow.postMessage({
        type: 'gas-embed-set-dates',
        checkin: checkin,
        checkout: checkout
      }, '*');
    },
    setGuests: function(guests) {
      iframe.contentWindow.postMessage({
        type: 'gas-embed-set-guests',
        guests: guests
      }, '*');
    },
    reload: function() {
      iframe.src = src;
    },
    back: function() {
      iframe.src = src;
    }
  };
})();
