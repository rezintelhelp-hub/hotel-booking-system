<?php
/**
 * Plugin Name: GAS Redirects
 * Plugin URI: https://gas.travel
 * Description: 301 redirects for legacy URL patterns from pre-GAS migrations
 *              (SetSeed room / attractions / blog URLs that Google still has
 *              indexed). Configured per-host so a single mini-plugin can
 *              cover every migrated client without cross-site collisions.
 * Version: 1.0.0
 * Author: GAS - Guest Accommodation System
 * License: Proprietary - All Rights Reserved
 */

/*
 * Copyright (c) 2024-2026 Steve Driver / Global Accommodation Systems.
 * All rights reserved. Proprietary software.
 */

if (!defined('ABSPATH')) exit;

add_action('template_redirect', 'gas_redirects_handle', 1);

/**
 * Entry point. Reads the current host + path, looks up rules for that host,
 * and 301s on the first match. Non-matching hosts / paths fall through so
 * WP handles them normally.
 */
function gas_redirects_handle() {
    if (is_admin()) return;
    if (!isset($_SERVER['REQUEST_URI'])) return;

    $host = isset($_SERVER['HTTP_HOST']) ? strtolower($_SERVER['HTTP_HOST']) : '';
    $host = preg_replace('/^www\./', '', $host); // normalise www prefix
    if (!$host) return;

    $rules = gas_redirects_rules_for_host($host);
    if (empty($rules)) return;

    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (!$path) return;

    foreach ($rules as $rule) {
        if (isset($rule['exact']) && $rule['exact'] === $path) {
            gas_redirects_send($rule['to']);
            return;
        }
        if (isset($rule['regex']) && preg_match($rule['regex'], $path, $m)) {
            $to = $rule['to'];
            if (isset($m[1])) $to = str_replace('$1', $m[1], $to);
            gas_redirects_send($to);
            return;
        }
    }
}

/**
 * 301-redirect to $to. Absolute-path targets are prefixed with home_url so
 * we stay on the current site. No-op if target == current path (loop guard).
 */
function gas_redirects_send($to) {
    if (strlen($to) && $to[0] === '/') $to = home_url($to);
    $current = (isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'https') . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
    if ($to === $current) return;
    wp_redirect($to, 301);
    exit;
}

/**
 * Return the redirect ruleset for a given host. Rules are evaluated top to
 * bottom; first match wins.
 *
 * Rule shape:
 *   ['exact' => '/old/path',   'to' => '/new/path']
 *   ['regex' => '#^/old/(.+)$#','to' => '/new/$1/']
 */
function gas_redirects_rules_for_host($host) {
    if ($host === 'lehmannhouse.com') return gas_redirects_lehmann_rules();
    return array();
}

/**
 * Lehmann House (migrated from SetSeed).
 *   - 8 room slugs mapped to /room/?unit_id=<gas_id>
 *   - Bare /attractions and /blog get their trailing slash back
 *   - /local-attractions/<slug>[/] → /attractions/<slug>/
 *   - Old SetSeed cart junk sent to home
 */
function gas_redirects_lehmann_rules() {
    // From bookable_units on property_id=529 — see server DB, GA4 top-bouncing
    // list 2026-07-02. Keys are the SetSeed URL slug (uses -- as room-type /
    // room-name separator); values are the current GAS unit_id.
    $rooms = array(
        'king-room--noras-room'              => 1286,
        'king-room--the-presidents-room'     => 1285,
        'king-room--the-john-stark-room'     => 1292,
        'king-room--fredericks-room'         => 1289,
        'king-room--the-map-room'            => 1293,
        'queen-room--the-judge-sears-room'   => 1290,
        'queen-room--the-worlds-fair-room'   => 1287,
        'queen-room--the-maids-room'         => 1288,
    );

    $rules = array();
    foreach ($rooms as $slug => $unit_id) {
        $base = '/properties/lehmann-house-bed--breakfast-' . $slug;
        $target = '/room/?unit_id=' . $unit_id;
        $rules[] = array('exact' => $base,        'to' => $target);
        $rules[] = array('exact' => $base . '/',  'to' => $target);
    }

    // Bare-slug pages that need a trailing slash
    $rules[] = array('exact' => '/attractions', 'to' => '/attractions/');
    $rules[] = array('exact' => '/blog',        'to' => '/blog/');

    // SetSeed used /local-attractions/<slug> for what GAS calls /attractions/<slug>/.
    // Single-segment only — leave nested SetSeed paths (which rarely map cleanly)
    // to WP's normal 404 handling.
    $rules[] = array('regex' => '#^/local-attractions/([^/]+)/?$#', 'to' => '/attractions/$1/');

    // SetSeed cart-action junk. Send to home so the visitor lands somewhere
    // useful instead of on a 404.
    $rules[] = array('exact' => '/actions/AddToBasket',  'to' => '/');
    $rules[] = array('exact' => '/actions/AddToBasket/', 'to' => '/');

    return $rules;
}
