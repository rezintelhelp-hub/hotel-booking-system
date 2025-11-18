# GAS Booking System - WordPress Plugin

Display accommodation listings from Global Accommodation System on your WordPress site.

## Installation

1. Download the `wordpress-plugin` folder
2. Zip the entire folder and rename to `gas-booking-plugin.zip`
3. In WordPress: Go to Plugins → Add New → Upload Plugin
4. Upload the zip file and click "Install Now"
5. Activate the plugin

## Setup

1. Go to **GAS Booking** in WordPress admin menu
2. Enter your API URL: `https://hotel-booking-system-production-d6db.up.railway.app`
3. Enter your API Key (get it from [GAS Dashboard](https://hotel-booking-system-production-d6db.up.railway.app/gas.html))
4. Click "Save Changes"
5. Click "Load Properties" to select which properties to display

## Usage

### Shortcodes

Add these shortcodes to any page or post:

**Full Search Interface:**
```
[gas_search]
```
Displays a search form and results grid.

**Properties Grid:**
```
[gas_properties]
```
Shows all your selected properties in a grid layout.

**Single Property:**
```
[gas_property id="1"]
```
Display a specific property by ID.

## Features

- ✅ Connect to GAS API with your API key
- ✅ Display properties in responsive grid
- ✅ Search functionality with date/guest filters
- ✅ Mobile-friendly design
- ✅ Easy shortcode system
- ✅ Customizable via CSS

## Requirements

- WordPress 5.0 or higher
- PHP 7.2 or higher
- Active GAS account with API key

## Support

For support, visit: https://gas.com/support

## Changelog

### Version 1.0.0
- Initial release
- Basic property display
- Search functionality
- Admin settings page
```

**Now create a simple installation guide:** `wordpress-plugin/INSTALL.txt`
```
GAS BOOKING PLUGIN - QUICK INSTALL GUIDE
========================================

STEP 1: Download Plugin
- Download all files in the wordpress-plugin folder
- Zip them together as "gas-booking-plugin.zip"

STEP 2: Install in WordPress
- Login to WordPress Admin
- Go to: Plugins → Add New → Upload Plugin
- Choose the gas-booking-plugin.zip file
- Click "Install Now"
- Click "Activate Plugin"

STEP 3: Configure
- Go to: GAS Booking (in left menu)
- Enter API URL: https://hotel-booking-system-production-d6db.up.railway.app
- Enter your API Key from GAS Dashboard
- Click "Save Changes"

STEP 4: Add to Pages
- Edit any page/post
- Add shortcode: [gas_search]
- Or use: [gas_properties] to show property grid
- Publish!

DONE! Your booking system is live.

Need help? Visit: https://gas.com
