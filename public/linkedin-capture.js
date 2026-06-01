/* GAS LinkedIn DM Capture — bookmarklet payload.
 *
 * Loaded into linkedin.com by a tiny bookmarklet that sets
 *   window.__GAS_CAPTURE_KEY = '<the user's personal capture key>'
 * before injecting this script.
 *
 * Scrapes the visible LinkedIn DM thread + participant profile, POSTs to
 * https://admin.gas.travel/api/inbox/linkedin/capture-dm, shows a toast
 * with the result. Re-runnable: server-side dedupe means clicking the
 * bookmarklet again on the same thread only inserts the new messages.
 *
 * LinkedIn rearranges DOM class names periodically — selectors below are
 * lenient with fallbacks. If they drift, this file gets updated once
 * server-side and every operator's bookmarklet picks up the change next
 * click (cache-busted by ?t= timestamp in the loader).
 */
(function () {
    'use strict';
    var GAS_ENDPOINT = 'https://admin.gas.travel/api/inbox/linkedin/capture-dm';
    var key = window.__GAS_CAPTURE_KEY;

    function toast(msg, color) {
        try {
            var box = document.createElement('div');
            box.style.cssText = 'position:fixed; top:20px; right:20px; z-index:999999; padding:12px 16px; border-radius:8px; font:14px system-ui; color:#fff; background:' + (color || '#0a66c2') + '; box-shadow:0 4px 16px rgba(0,0,0,.3); max-width:360px;';
            box.textContent = msg;
            document.body.appendChild(box);
            setTimeout(function () { box.remove(); }, 5000);
        } catch (_) { /* fallback to alert */ alert(msg); }
    }

    if (!key) { toast('GAS capture key missing — re-install the bookmarklet from GAS Inbox.', '#dc2626'); return; }

    // Try to identify the open conversation panel — multiple layouts exist
    // (full Messaging page, overlay widget, mobile). Pick the most specific
    // visible thread container.
    var thread = document.querySelector('.msg-thread, .msg-conversations-container__conversations-list + .msg-thread, [data-attr="msg-thread"]');
    if (!thread) {
        // Fallback: any visible element with a message list inside
        var lists = document.querySelectorAll('.msg-s-message-list, .msg-s-event-list');
        if (lists.length) thread = lists[lists.length - 1].closest('section, div');
    }
    if (!thread) { toast('Couldn\'t find a LinkedIn conversation on this page. Open a DM thread first.', '#dc2626'); return; }

    // Conversation URN — LinkedIn embeds it as a data-attr on the thread
    // root in most layouts. Fall back to URL hash if needed.
    var conversationUrn = thread.getAttribute('data-urn')
        || thread.getAttribute('data-msg-conversation-urn')
        || (location.pathname.match(/\/thread\/([\w\-]+)/) || [])[1]
        || ('linkedin-conv-' + Date.now());

    // Other person — from the conversation header.
    var headerName = '', headerHandle = '', headerHeadline = '';
    var headerNode = thread.querySelector('.msg-thread__topbar-name, .msg-overlay-conversation-bubble-header, h2');
    if (headerNode) headerName = (headerNode.textContent || '').trim();
    var profileLink = thread.querySelector('a[href*="/in/"]');
    if (profileLink) {
        var href = profileLink.getAttribute('href') || '';
        if (href.startsWith('/')) href = 'https://www.linkedin.com' + href.split('?')[0];
        else if (href.includes('linkedin.com/in/')) href = href.split('?')[0];
        headerHandle = href;
    }
    var headlineNode = thread.querySelector('.msg-thread__topbar-subtitle, .msg-overlay-conversation-bubble-header__sub-title');
    if (headlineNode) headerHeadline = (headlineNode.textContent || '').trim();

    // Scrape messages — events show on .msg-s-message-list__event with
    // group nodes around blocks from the same sender.
    var messages = [];
    var events = thread.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem');
    var lastSenderName = null;
    var lastSenderIsMe = false;

    events.forEach(function (ev) {
        // Sender block — appears on the FIRST message of a group.
        var senderNode = ev.querySelector('.msg-s-message-group__name, .msg-s-message-group__profile-link');
        if (senderNode) {
            lastSenderName = (senderNode.textContent || '').trim();
            // LinkedIn marks the operator's own messages with their own
            // profile link; an "outgoing" class is sometimes present.
            lastSenderIsMe = ev.querySelector('.msg-s-message-group--out, .msg-s-message-group--sent-by-me') !== null;
        }

        // Each body in the group.
        var bodies = ev.querySelectorAll('.msg-s-event-listitem__body, .msg-s-message-list__event .msg-s-event-listitem__message-bubble');
        var timeNode = ev.querySelector('time, .msg-s-message-group__timestamp, .msg-s-message-group__meta');
        var sentAt = null;
        if (timeNode) {
            sentAt = timeNode.getAttribute('datetime') || timeNode.getAttribute('data-event-time') || timeNode.textContent.trim();
        }
        bodies.forEach(function (b) {
            var text = (b.innerText || b.textContent || '').trim();
            if (!text) return;
            var msgId = b.getAttribute('data-event-urn') || b.id || null;
            messages.push({
                id: msgId,
                sender_is_me: lastSenderIsMe,
                sender_name: lastSenderName || (lastSenderIsMe ? 'me' : headerName),
                body: text,
                sent_at: sentAt
            });
        });
    });

    if (messages.length === 0) {
        toast('Couldn\'t parse any messages — LinkedIn may have changed the layout. Tell Steve.', '#dc2626');
        return;
    }

    toast('Sending ' + messages.length + ' messages to GAS…');

    fetch(GAS_ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', 'X-Capture-Key': key },
        body: JSON.stringify({
            conversation_urn: conversationUrn,
            other_person: { name: headerName, profile_url: headerHandle, headline: headerHeadline },
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
