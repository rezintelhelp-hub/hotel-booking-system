<?php
/**
 * Plugin Name: GAS Hostvana
 * Plugin URI: https://gas.travel
 * Description: Guest messaging chat widget powered by Beds24. Floating chat bubble for website visitors to message property staff.
 * Version: 1.0.0
 * Author: GAS - Guest Accommodation System
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) exit;
define('GAS_HOSTVANA_DEFAULT_API_URL', 'https://admin.gas.travel');
define('GAS_HOSTVANA_VERSION', '1.0.0');

class GAS_Hostvana {
    private static $instance = null;

    public static function get_instance() { if (null === self::$instance) self::$instance = new self(); return self::$instance; }

    private function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_footer', array($this, 'inject_widget'));
        add_action('wp_ajax_nopriv_gas_hostvana_chat', array($this, 'ajax_chat'));
        add_action('wp_ajax_gas_hostvana_chat', array($this, 'ajax_chat'));
    }

    private function get_api_url() { return get_option('gas_hostvana_api_url', '') ?: GAS_HOSTVANA_DEFAULT_API_URL; }

    public function add_admin_menu() { add_options_page('GAS Hostvana', 'GAS Hostvana', 'manage_options', 'gas-hostvana', array($this, 'settings_page')); }

    public function register_settings() {
        foreach (array('api_url','client_id','license_key','widget_position','widget_color','welcome_message','enabled') as $s) {
            register_setting('gas_hostvana_settings', 'gas_hostvana_' . $s);
        }
    }

    public function settings_page() {
        $enabled = get_option('gas_hostvana_enabled', '1');
        $position = get_option('gas_hostvana_widget_position', 'bottom-right');
        $color = get_option('gas_hostvana_widget_color', '#2563eb');
        ?>
        <div class="wrap">
            <h1>💬 GAS Hostvana</h1>
            <?php $this->test_connection(); ?>
            <form method="post" action="options.php">
                <?php settings_fields('gas_hostvana_settings'); ?>
                <h2>API Settings</h2>
                <table class="form-table">
                    <tr><th>API URL</th><td><input type="url" name="gas_hostvana_api_url" value="<?php echo esc_attr(get_option('gas_hostvana_api_url', '')); ?>" class="regular-text" placeholder="<?php echo GAS_HOSTVANA_DEFAULT_API_URL; ?>"/></td></tr>
                    <tr><th>Client ID</th><td><input type="text" name="gas_hostvana_client_id" value="<?php echo esc_attr(get_option('gas_hostvana_client_id', '')); ?>" class="regular-text"/><p class="description">Your GAS account client ID</p></td></tr>
                    <tr><th>License Key / API Key</th><td><input type="text" name="gas_hostvana_license_key" value="<?php echo esc_attr(get_option('gas_hostvana_license_key', '')); ?>" class="regular-text"/><p class="description">From GAS Admin → Plugins & Themes or your account API key</p></td></tr>
                </table>
                <h2>Widget Settings</h2>
                <table class="form-table">
                    <tr><th>Enabled</th><td><label><input type="checkbox" name="gas_hostvana_enabled" value="1" <?php checked($enabled, '1'); ?>/> Show chat widget on frontend</label></td></tr>
                    <tr><th>Position</th><td>
                        <select name="gas_hostvana_widget_position">
                            <option value="bottom-right" <?php selected($position, 'bottom-right'); ?>>Bottom Right</option>
                            <option value="bottom-left" <?php selected($position, 'bottom-left'); ?>>Bottom Left</option>
                        </select>
                    </td></tr>
                    <tr><th>Widget Color</th><td><input type="color" name="gas_hostvana_widget_color" value="<?php echo esc_attr($color); ?>"/></td></tr>
                    <tr><th>Welcome Message</th><td><input type="text" name="gas_hostvana_welcome_message" value="<?php echo esc_attr(get_option('gas_hostvana_welcome_message', 'Hi! How can we help you?')); ?>" class="large-text"/></td></tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    private function test_connection() {
        $key = get_option('gas_hostvana_license_key', '');
        if (!$key) { echo '<div class="notice notice-warning"><p>Enter a License Key or API Key to connect.</p></div>'; return; }
        $url = trailingslashit($this->get_api_url()) . 'api/plugin/validate-license';
        $response = wp_remote_post($url, array(
            'timeout' => 10,
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode(array('license_key' => $key))
        ));
        if (is_wp_error($response)) { echo '<div class="notice notice-error"><p>Connection failed</p></div>'; return; }
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!empty($body['success'])) {
            echo '<div class="notice notice-success"><p>Connected to ' . esc_html($body['account_name'] ?? 'GAS') . '</p></div>';
        } else {
            echo '<div class="notice notice-error"><p>Invalid license key</p></div>';
        }
    }

    /**
     * AJAX proxy — forwards chat requests to GAS server
     */
    public function ajax_chat() {
        $api_url = $this->get_api_url();
        $license_key = get_option('gas_hostvana_license_key', '');

        if (!$license_key) {
            wp_send_json(array('success' => false, 'error' => 'Plugin not configured'));
            return;
        }

        $action = isset($_POST['chat_action']) ? sanitize_text_field($_POST['chat_action']) : '';
        $booking_id = isset($_POST['bookingId']) ? intval($_POST['bookingId']) : 0;
        $room_id = isset($_POST['roomId']) ? intval($_POST['roomId']) : 0;
        $message = isset($_POST['message']) ? sanitize_textarea_field($_POST['message']) : '';

        $body = array('action' => $action);
        if ($booking_id) $body['bookingId'] = $booking_id;
        if ($room_id) $body['roomId'] = $room_id;
        if ($message) $body['message'] = $message;

        $response = wp_remote_post(trailingslashit($api_url) . 'api/hostvana/chat', array(
            'timeout' => 15,
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-License-Key' => $license_key
            ),
            'body' => json_encode($body)
        ));

        if (is_wp_error($response)) {
            wp_send_json(array('success' => false, 'error' => $response->get_error_message()));
            return;
        }

        $result = json_decode(wp_remote_retrieve_body($response), true);
        wp_send_json($result);
    }

    /**
     * Inject floating chat widget into wp_footer
     */
    public function inject_widget() {
        if (!get_option('gas_hostvana_enabled', '1')) return;
        if (!get_option('gas_hostvana_license_key', '')) return;
        if (is_admin()) return;

        $position = get_option('gas_hostvana_widget_position', 'bottom-right');
        $color = esc_attr(get_option('gas_hostvana_widget_color', '#2563eb'));
        $welcome = esc_js(get_option('gas_hostvana_welcome_message', 'Hi! How can we help you?'));
        $ajax_url = esc_url(admin_url('admin-ajax.php'));

        $pos_right = ($position === 'bottom-right') ? 'right: 24px;' : 'left: 24px;';
        $panel_right = ($position === 'bottom-right') ? 'right: 24px;' : 'left: 24px;';

        ?>
        <!-- GAS Hostvana Chat Widget v<?php echo GAS_HOSTVANA_VERSION; ?> -->
        <style>
        .gas-hostvana-bubble {
            position: fixed;
            bottom: 24px;
            <?php echo $pos_right; ?>
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: <?php echo $color; ?>;
            color: #fff;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            z-index: 99999;
            display: none;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease;
        }
        .gas-hostvana-bubble:hover { transform: scale(1.1); }
        .gas-hostvana-bubble svg { width: 28px; height: 28px; fill: #fff; }

        .gas-hostvana-panel {
            position: fixed;
            bottom: 96px;
            <?php echo $panel_right; ?>
            width: 350px;
            height: 500px;
            background: #fff;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            z-index: 99999;
            display: none;
            flex-direction: column;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .gas-hostvana-panel.open { display: flex; }

        .gas-hostvana-header {
            background: <?php echo $color; ?>;
            color: #fff;
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        }
        .gas-hostvana-header-title { font-size: 16px; font-weight: 600; }
        .gas-hostvana-close {
            background: none;
            border: none;
            color: #fff;
            cursor: pointer;
            font-size: 20px;
            padding: 0;
            line-height: 1;
            opacity: 0.8;
        }
        .gas-hostvana-close:hover { opacity: 1; }

        .gas-hostvana-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .gas-hostvana-msg {
            max-width: 80%;
            padding: 10px 14px;
            border-radius: 16px;
            font-size: 14px;
            line-height: 1.4;
            word-wrap: break-word;
        }
        .gas-hostvana-msg-sent {
            align-self: flex-end;
            background: <?php echo $color; ?>;
            color: #fff;
            border-bottom-right-radius: 4px;
        }
        .gas-hostvana-msg-received {
            align-self: flex-start;
            background: #f0f0f0;
            color: #333;
            border-bottom-left-radius: 4px;
        }
        .gas-hostvana-msg-system {
            align-self: center;
            background: none;
            color: #999;
            font-size: 12px;
            font-style: italic;
            text-align: center;
        }

        .gas-hostvana-input-row {
            display: flex;
            padding: 12px;
            border-top: 1px solid #eee;
            gap: 8px;
            flex-shrink: 0;
        }
        .gas-hostvana-input-row input {
            flex: 1;
            border: 1px solid #ddd;
            border-radius: 24px;
            padding: 10px 16px;
            font-size: 14px;
            outline: none;
        }
        .gas-hostvana-input-row input:focus { border-color: <?php echo $color; ?>; }
        .gas-hostvana-send {
            background: <?php echo $color; ?>;
            color: #fff;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .gas-hostvana-send:hover { opacity: 0.9; }
        .gas-hostvana-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .gas-hostvana-send svg { width: 18px; height: 18px; fill: #fff; }

        .gas-hostvana-typing {
            align-self: flex-start;
            background: #f0f0f0;
            padding: 10px 14px;
            border-radius: 16px;
            border-bottom-left-radius: 4px;
            font-size: 14px;
            color: #999;
            display: none;
        }
        .gas-hostvana-typing.show { display: block; }

        @media (max-width: 480px) {
            .gas-hostvana-panel {
                width: calc(100vw - 16px);
                height: calc(100vh - 120px);
                bottom: 88px;
                left: 8px;
                right: 8px;
                border-radius: 12px;
            }
        }
        </style>

        <!-- Chat Bubble -->
        <button class="gas-hostvana-bubble" id="gasHostvanaBubble" aria-label="Open chat">
            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>
        </button>

        <!-- Chat Panel -->
        <div class="gas-hostvana-panel" id="gasHostvanaPanel">
            <div class="gas-hostvana-header">
                <span class="gas-hostvana-header-title">Chat with us</span>
                <button class="gas-hostvana-close" id="gasHostvanaClose">&times;</button>
            </div>
            <div class="gas-hostvana-messages" id="gasHostvanaMessages"></div>
            <div class="gas-hostvana-input-row">
                <input type="text" id="gasHostvanaInput" placeholder="Type a message..." autocomplete="off"/>
                <button class="gas-hostvana-send" id="gasHostvanaSend">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
        </div>

        <script>
        (function() {
            var ajaxUrl = '<?php echo $ajax_url; ?>';
            var welcomeMessage = '<?php echo $welcome; ?>';

            var bubble = document.getElementById('gasHostvanaBubble');
            var panel = document.getElementById('gasHostvanaPanel');
            var closeBtn = document.getElementById('gasHostvanaClose');
            var messagesDiv = document.getElementById('gasHostvanaMessages');
            var input = document.getElementById('gasHostvanaInput');
            var sendBtn = document.getElementById('gasHostvanaSend');

            var bookingId = localStorage.getItem('gas_hostvana_bookingId');
            var pollTimer = null;
            var pollCount = 0;
            var maxPolls = 20;
            var sending = false;
            var knownMessageCount = 0;

            function getPropertyId() {
                // 1. Meta tag
                var meta = document.querySelector('meta[name="gas-property-id"]');
                if (meta && meta.content) return parseInt(meta.content);
                // 3. URL param
                var params = new URLSearchParams(window.location.search);
                if (params.get('property_id')) return parseInt(params.get('property_id'));
                // 4. gasBooking object
                if (typeof gasBooking !== 'undefined' && gasBooking.currentPropertyId) return parseInt(gasBooking.currentPropertyId);
                return null;
            }

            // Show bubble only if property ID is available on this page
            if (getPropertyId()) {
                bubble.style.display = 'flex';
            }

            function addMessage(text, type) {
                var div = document.createElement('div');
                div.className = 'gas-hostvana-msg gas-hostvana-msg-' + type;
                div.textContent = text;
                messagesDiv.appendChild(div);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }

            function showWelcome() {
                if (messagesDiv.children.length === 0) {
                    addMessage(welcomeMessage, 'received');
                }
            }

            // Toggle panel
            bubble.addEventListener('click', function() {
                panel.classList.toggle('open');
                if (panel.classList.contains('open')) {
                    showWelcome();
                    input.focus();
                    if (bookingId) {
                        startPolling();
                    }
                } else {
                    stopPolling();
                }
            });

            closeBtn.addEventListener('click', function() {
                panel.classList.remove('open');
                stopPolling();
            });

            // Send message
            function sendMessage() {
                var text = input.value.trim();
                if (!text || sending) return;

                sending = true;
                sendBtn.disabled = true;
                input.value = '';
                addMessage(text, 'sent');

                if (!bookingId) {
                    // First message — create booking
                    var propId = getPropertyId();
                    if (!propId) {
                        addMessage('Chat is not available on this page. No property configured.', 'system');
                        sending = false;
                        sendBtn.disabled = false;
                        return;
                    }

                    var formData = new FormData();
                    formData.append('action', 'gas_hostvana_chat');
                    formData.append('chat_action', 'createBooking');
                    formData.append('roomId', propId);
                    formData.append('message', text);

                    fetch(ajaxUrl, { method: 'POST', body: formData })
                        .then(function(r) { return r.json(); })
                        .then(function(data) {
                            if (data.success && data.bookingId) {
                                bookingId = data.bookingId;
                                localStorage.setItem('gas_hostvana_bookingId', bookingId);
                                knownMessageCount = 1;
                                startPolling();
                            } else {
                                addMessage('Unable to connect. Please try again later.', 'system');
                            }
                            sending = false;
                            sendBtn.disabled = false;
                        })
                        .catch(function() {
                            addMessage('Connection error. Please try again.', 'system');
                            sending = false;
                            sendBtn.disabled = false;
                        });
                } else {
                    // Subsequent message
                    var formData = new FormData();
                    formData.append('action', 'gas_hostvana_chat');
                    formData.append('chat_action', 'sendMessage');
                    formData.append('bookingId', bookingId);
                    formData.append('message', text);

                    fetch(ajaxUrl, { method: 'POST', body: formData })
                        .then(function(r) { return r.json(); })
                        .then(function(data) {
                            if (!data.success) {
                                addMessage('Failed to send. Please try again.', 'system');
                            } else {
                                knownMessageCount++;
                                // Reset polling on new message
                                pollCount = 0;
                                startPolling();
                            }
                            sending = false;
                            sendBtn.disabled = false;
                        })
                        .catch(function() {
                            addMessage('Connection error. Please try again.', 'system');
                            sending = false;
                            sendBtn.disabled = false;
                        });
                }
            }

            sendBtn.addEventListener('click', sendMessage);
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') sendMessage();
            });

            // Polling for new messages
            function startPolling() {
                stopPolling();
                pollCount = 0;
                pollTimer = setInterval(function() {
                    pollCount++;
                    if (pollCount > maxPolls) {
                        stopPolling();
                        addMessage("We'll get back to you shortly.", 'system');
                        return;
                    }
                    fetchMessages();
                }, 3000);
            }

            function stopPolling() {
                if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
            }

            function fetchMessages() {
                if (!bookingId) return;

                var formData = new FormData();
                formData.append('action', 'gas_hostvana_chat');
                formData.append('chat_action', 'getMessages');
                formData.append('bookingId', bookingId);

                fetch(ajaxUrl, { method: 'POST', body: formData })
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data.success && data.messages && data.messages.length > knownMessageCount) {
                            // New messages received — render only the new ones
                            var newMsgs = data.messages.slice(knownMessageCount);
                            for (var i = 0; i < newMsgs.length; i++) {
                                var m = newMsgs[i];
                                addMessage(m.text, m.sender === 'guest' ? 'sent' : 'received');
                            }
                            knownMessageCount = data.messages.length;
                            // Reset poll count since we got new messages
                            pollCount = 0;
                        }
                    })
                    .catch(function() {});
            }

            // Restore session from localStorage
            if (bookingId && panel.classList.contains('open')) {
                showWelcome();
                fetchMessages();
                startPolling();
            }
        })();
        </script>
        <!-- /GAS Hostvana Chat Widget -->
        <?php
    }
}

// Boot
GAS_Hostvana::get_instance();
