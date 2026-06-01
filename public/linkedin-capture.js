/* GAS LinkedIn DM Capture — bookmarklet payload, v2.
 *
 * Loaded into linkedin.com by a tiny bookmarklet that sets
 *   window.__GAS_CAPTURE_KEY = '<the user's personal capture key>'
 * before injecting this script.
 *
 * v2 (2026-06-01 PM): rewritten to be class-name-agnostic. LinkedIn rotates
 * their CSS module hashes regularly and the v1 selectors stopped matching.
 * v2 anchors on stable HTML primitives:
 *   - <time datetime="..."> elements mark every message timestamp
 *   - <a href="/in/USERNAME/"> identify the other participant
 *   - aria-label patterns like "Open the options list in your conversation
 *     with X and Y" name both participants
 * The scraper walks up from time elements to find each message's body +
 * sender, then POSTs to GAS. Far more resilient to LinkedIn redesigns.
 */
(function () {
    'use strict';
    var GAS_ENDPOINT = 'https://admin.gas.travel/api/inbox/linkedin/capture-dm';
    var key = window.__GAS_CAPTURE_KEY;

    function toast(msg, color) {
        try {
            var box = document.createElement('div');
            box.style.cssText = 'position:fixed; top:20px; right:20px; z-index:999999; padding:12px 16px; border-radius:8px; font:14px system-ui; color:#fff; background:' + (color || '#0a66c2') + '; box-shadow:0 4px 16px rgba(0,0,0,.3); max-width:380px; line-height:1.5;';
            box.textContent = msg;
            document.body.appendChild(box);
            setTimeout(function () { box.remove(); }, 6000);
        } catch (_) { alert(msg); }
    }

    if (!key) { toast('GAS capture key missing — reinstall the bookmarklet from GAS Inbox.', '#dc2626'); return; }

    // ── Identify the operator's own name + profile so we can mark which
    // messages are outbound. Look in the global nav avatar / menu button.
    var meName = '', meHref = '';
    var meAvatarBtn = document.querySelector('button[aria-label*="View profile"], a[href*="/in/"][aria-label*="Me"], img[alt="Steve Driver"]');
    var allProfileLinks = Array.from(document.querySelectorAll('a[href*="/in/"]'));
    // The operator's own avatar link usually contains "Me" or is in the nav.
    var meLink = document.querySelector('header a[href*="/in/"], nav a[href*="/in/"]') ||
                 document.querySelector('.global-nav__me a[href*="/in/"]');
    if (meLink) {
        meHref = (meLink.getAttribute('href') || '').split('?')[0];
        if (meHref.startsWith('/')) meHref = 'https://www.linkedin.com' + meHref;
        meName = (meLink.getAttribute('aria-label') || meLink.textContent || '').replace(/^Me /, '').trim();
    }

    // ── Find the OPEN conversation. Strategy: look for the message compose
    // area (only present when a conversation is open), then walk up + over
    // to find the message list. Compose area markers across layouts:
    //   - [aria-label*="Press Enter to Send"]
    //   - .msg-form, [data-test-id="messaging-form"]
    //   - any contenteditable inside an element whose label says "message"
    var composeArea = document.querySelector('[aria-label*="Press Enter to Send"], .msg-form, [data-test-id="messaging-form"]') ||
                      document.querySelector('div[contenteditable="true"][aria-label*="essage"]');
    if (!composeArea) {
        toast('No open conversation on this page. Open a DM thread (click someone in the left list) and try again.', '#dc2626');
        return;
    }

    // The message list is a sibling/ancestor of compose. Walk up until we
    // find an element that ALSO contains <time> elements (messages have
    // timestamps); that's the conversation container.
    var container = composeArea;
    while (container && container !== document.body) {
        if (container.querySelectorAll('time[datetime]').length > 0) break;
        container = container.parentElement;
    }
    if (!container || container === document.body) {
        // Fall back to whole document — risky on long conversation lists
        // but usually fine because LinkedIn only renders the open thread.
        container = document.body;
    }

    // ── Identify the other participant from the conversation header. Most
    // layouts put their name in a heading near the top of the container.
    // Falls back to the most-frequent profile-link target if no heading.
    var otherName = '', otherHref = '', otherHeadline = '';
    var heading = container.querySelector('h2, [class*="topbar"] h1, [class*="thread"] h1');
    if (heading) otherName = (heading.textContent || '').trim();

    // Profile link inside container (excluding our own).
    var containerProfileLinks = Array.from(container.querySelectorAll('a[href*="/in/"]'));
    var profileCounts = {};
    containerProfileLinks.forEach(function (a) {
        var h = (a.getAttribute('href') || '').split('?')[0];
        if (h.startsWith('/')) h = 'https://www.linkedin.com' + h;
        if (h && h !== meHref) profileCounts[h] = (profileCounts[h] || 0) + 1;
    });
    var topProfile = Object.keys(profileCounts).sort(function (a, b) { return profileCounts[b] - profileCounts[a]; })[0];
    if (topProfile) otherHref = topProfile;

    // ── Walk time elements and pair each with its message body + sender.
    var times = Array.from(container.querySelectorAll('time[datetime]'));
    if (times.length === 0) {
        // No time elements found — try generic article roles
        times = Array.from(container.querySelectorAll('time'));
    }
    if (times.length === 0) {
        toast('Could find the conversation but no message timestamps — LinkedIn layout may have changed again. Tell Steve.', '#dc2626');
        return;
    }

    var messages = [];
    var seenBodies = new Set();
    times.forEach(function (timeEl) {
        // Walk up to find the message bubble container. The bubble usually
        // contains both the time element AND a body element with text.
        var msgRoot = timeEl;
        for (var i = 0; i < 6; i++) {
            msgRoot = msgRoot.parentElement;
            if (!msgRoot) return;
            // A good message root has appreciable text content beyond the
            // timestamp itself.
            var fullText = (msgRoot.innerText || '').trim();
            if (fullText.length > timeEl.textContent.trim().length + 5) break;
        }
        if (!msgRoot) return;

        // Body = text content minus the timestamp text. Find a specific
        // body child if possible (LinkedIn often has a .msg-s-event...body)
        var bodyEl = msgRoot.querySelector('[class*="body"], [class*="message"]:not(time):not(button)') || msgRoot;
        var bodyText = (bodyEl.innerText || bodyEl.textContent || '').trim();
        // Strip the timestamp text if it leaked in
        var tsText = (timeEl.textContent || '').trim();
        if (bodyText.endsWith(tsText)) bodyText = bodyText.slice(0, -tsText.length).trim();
        if (bodyText.startsWith(tsText)) bodyText = bodyText.slice(tsText.length).trim();
        if (!bodyText || bodyText.length < 1) return;
        // Trim leading "View X's profile" / "X" decorations
        bodyText = bodyText.replace(/^View [^']+'s profile\s*/i, '').replace(/^[A-Z][\w\s\.\-]+ \d{1,2}:\d{2} (?:AM|PM)\s*/i, '').trim();
        if (!bodyText) return;
        if (seenBodies.has(bodyText)) return;
        seenBodies.add(bodyText);

        // Sender — look for the nearest preceding profile link.
        var senderName = '', senderHref = '';
        var senderProfileLink = msgRoot.querySelector('a[href*="/in/"]');
        if (!senderProfileLink) {
            // Try walking up
            var probe = msgRoot;
            for (var j = 0; j < 4 && probe; j++) {
                senderProfileLink = probe.querySelector ? probe.querySelector('a[href*="/in/"]') : null;
                if (senderProfileLink) break;
                probe = probe.previousElementSibling || probe.parentElement;
            }
        }
        if (senderProfileLink) {
            var sh = (senderProfileLink.getAttribute('href') || '').split('?')[0];
            if (sh.startsWith('/')) sh = 'https://www.linkedin.com' + sh;
            senderHref = sh;
            senderName = (senderProfileLink.getAttribute('aria-label') || senderProfileLink.textContent || '').replace(/^View /, '').replace(/'s profile.*$/, '').trim();
        }

        var isMe = !!(senderHref && meHref && senderHref === meHref);
        if (!senderName) senderName = isMe ? (meName || 'me') : (otherName || 'other');

        messages.push({
            id: timeEl.id || null,
            sender_is_me: isMe,
            sender_name: senderName,
            body: bodyText,
            sent_at: timeEl.getAttribute('datetime') || timeEl.textContent.trim()
        });
    });

    if (messages.length === 0) {
        toast('Found timestamps but couldn\'t extract any message bodies — LinkedIn layout drifted. Tell Steve.', '#dc2626');
        return;
    }

    // ── Conversation URN — try data attrs first, fall back to URL path.
    var conversationUrn = container.getAttribute('data-urn') ||
                          (location.pathname.match(/thread\/([^\/]+)/) || [])[1] ||
                          ('linkedin-conv-' + (otherHref || '').replace(/[^a-z0-9]/gi, '').slice(-20));

    toast('Sending ' + messages.length + ' messages to GAS…');

    fetch(GAS_ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', 'X-Capture-Key': key },
        body: JSON.stringify({
            conversation_urn: conversationUrn,
            other_person: { name: otherName, profile_url: otherHref, headline: otherHeadline },
            messages: messages
        })
    }).then(function (r) { return r.json().then(function (d) { return { status: r.status, body: d }; }); })
      .then(function (out) {
        if (out.status >= 200 && out.status < 300 && out.body.success) {
            toast('✓ ' + out.body.inserted + ' new, ' + out.body.skipped + ' already there' +
                  (out.body.linked_to_prospect_id ? ' · linked to Prospect #' + out.body.linked_to_prospect_id : ''),
                  '#16a34a');
        } else {
            toast('Capture failed: ' + (out.body && out.body.error ? out.body.error : 'HTTP ' + out.status), '#dc2626');
        }
      })
      .catch(function (e) { toast('Capture error: ' + e.message, '#dc2626'); });
})();
