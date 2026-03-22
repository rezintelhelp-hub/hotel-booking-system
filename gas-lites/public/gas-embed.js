/**
 * GAS Booking Embed — Drop-in JavaScript for Webflow & any website
 *
 * Usage (Script Tag):
 *   <script src="https://lite.gas.travel/gas-embed.js" data-account="YOUR_ACCOUNT_CODE"></script>
 *
 * Usage (Webflow Embed Block):
 *   Paste the script tag above into a Webflow Embed element.
 *   The booking widget will render in place of the script tag.
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
 * Version: 1.0.0
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

  // Create wrapper container
  var container = document.createElement('div');
  container.className = 'gas-booking-embed';
  container.style.cssText = 'width:100%;overflow:hidden;position:relative;';

  // Loading indicator
  var loader = document.createElement('div');
  loader.className = 'gas-embed-loader';
  loader.style.cssText = [
    'position:absolute;top:0;left:0;right:0;bottom:0;',
    'display:flex;align-items:center;justify-content:center;',
    'background:#f8fafc;z-index:1;transition:opacity 0.3s;'
  ].join('');
  loader.innerHTML = '<div style="text-align:center;">' +
    '<div style="width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#3b82f6;' +
    'border-radius:50%;animation:gas-spin 0.8s linear infinite;margin:0 auto 12px;"></div>' +
    '<div style="color:#94a3b8;font-family:system-ui,sans-serif;font-size:14px;">Loading booking...</div>' +
    '</div>';

  // Add spinner animation
  var style = document.createElement('style');
  style.textContent = '@keyframes gas-spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);

  container.appendChild(loader);

  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.style.cssText = [
    'width:100%;border:none;display:block;',
    'min-height:' + config.minHeight + 'px;',
    'opacity:0;transition:opacity 0.3s;'
  ].join('');
  iframe.setAttribute('scrolling', 'no');
  iframe.setAttribute('title', 'Book Your Stay');
  iframe.setAttribute('loading', 'lazy');
  iframe.allow = 'payment';

  // Hide loader when iframe loads
  iframe.addEventListener('load', function() {
    iframe.style.opacity = '1';
    loader.style.opacity = '0';
    setTimeout(function() {
      loader.style.display = 'none';
    }, 300);
  });

  container.appendChild(iframe);
  script.parentNode.insertBefore(container, script.nextSibling);

  // Listen for height messages from the iframe
  window.addEventListener('message', function(e) {
    if (!iframe.contentWindow) return;
    if (e.source !== iframe.contentWindow) return;
    var data = e.data;
    if (data && data.type === 'gas-embed-resize' && typeof data.height === 'number') {
      iframe.style.height = Math.max(data.height, config.minHeight) + 'px';
    }
    // Handle booking completion — open in parent window
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
      iframe.src = iframe.src;
    }
  };
})();
