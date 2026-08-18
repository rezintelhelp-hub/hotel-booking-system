<?php
/**
 * Copyright (c) 2026 GAS - Global Accommodation System (gas.travel)
 * All rights reserved. Bespoke build for Dwellfort — do NOT deploy to any
 * other site.
 */

/**
 * GAS Dwellfort Theme — bespoke port of the SetSeed global_elegant design
 *
 * @package GAS_Dwellfort
 */

if (!defined('ABSPATH')) exit;

define('GAS_DWELLFORT_VERSION', '0.1.0');

/**
 * Theme setup — WordPress essentials.
 */
function gas_dwellfort_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('custom-logo', array(
        'height'      => 60,
        'width'       => 240,
        'flex-height' => true,
        'flex-width'  => true,
    ));
    add_theme_support('html5', array('search-form', 'gallery', 'caption', 'style', 'script'));
    add_theme_support('align-wide');

    register_nav_menus(array(
        'primary' => __('Primary menu', 'gas-theme-dwellfort'),
        'footer'  => __('Footer menu', 'gas-theme-dwellfort'),
    ));
}
add_action('after_setup_theme', 'gas_dwellfort_setup');

/**
 * Enqueue theme assets — Lora + Muli fonts + main stylesheet.
 * Google Fonts served via preconnect for speed (Anton cares about TTFB).
 */
function gas_dwellfort_enqueue_assets() {
    // Google Fonts — Lora (serif headings) + Muli (sans body)
    wp_enqueue_style(
        'gas-dwellfort-fonts',
        'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=Muli:wght@300;400;600;700&display=swap',
        array(),
        null
    );
    // Theme stylesheet — cache-busted with theme version
    wp_enqueue_style(
        'gas-dwellfort-style',
        get_stylesheet_uri(),
        array('gas-dwellfort-fonts'),
        GAS_DWELLFORT_VERSION
    );
    wp_enqueue_script(
        'gas-dwellfort-nav',
        get_template_directory_uri() . '/assets/nav.js',
        array(),
        GAS_DWELLFORT_VERSION,
        true
    );
}
add_action('wp_enqueue_scripts', 'gas_dwellfort_enqueue_assets');

/**
 * Preconnect hints for Google Fonts — small speed win, matters to Anton.
 */
function gas_dwellfort_resource_hints($urls, $relation_type) {
    if ('preconnect' === $relation_type) {
        $urls[] = array('href' => 'https://fonts.googleapis.com');
        $urls[] = array('href' => 'https://fonts.gstatic.com', 'crossorigin' => 'anonymous');
    }
    return $urls;
}
add_filter('wp_resource_hints', 'gas_dwellfort_resource_hints', 10, 2);

/**
 * Content width — used by WP for oEmbed sizing.
 */
if (!isset($content_width)) {
    $content_width = 1200;
}
