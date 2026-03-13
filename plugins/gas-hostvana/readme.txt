=== GAS Hostvana ===
Contributors: gasguest
Tags: chat, messaging, beds24, hotel, guest communication
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 1.0.0
License: GPLv2 or later

Guest messaging chat widget powered by Beds24. Adds a floating chat bubble to your website so visitors can message property staff directly.

== Description ==

GAS Hostvana adds a floating chat widget to your WordPress site that connects to your Beds24 account via the GAS platform. Website visitors can send messages which appear as inquiry bookings in your Beds24 dashboard.

Features:

* Floating chat bubble with customizable color and position
* No registration required for guests — zero friction
* Messages stored as Beds24 booking inquiries
* Automatic polling for replies (3-second intervals)
* Session persistence via localStorage
* Responsive design (full-width on mobile)
* Auto-detects property from page context

== Installation ==

1. Upload the `gas-hostvana` folder to `/wp-content/plugins/`
2. Activate the plugin through the Plugins menu
3. Go to Settings > GAS Hostvana
4. Enter your Client ID and License Key / API Key
5. Set your default Beds24 Property ID
6. Configure widget color, position, and welcome message

== Changelog ==

= 1.0.0 =
* Initial release
* Floating chat widget with Beds24 messaging
* WordPress AJAX proxy for secure API communication
* Settings page with connection test
