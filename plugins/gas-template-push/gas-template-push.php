<?php
/**
 * Plugin Name: GAS Template Push
 * Description: Receives Elementor and Gutenberg templates from GAS Admin and injects them into pages.
 * Version: 1.4.1
 * Author: GAS
 * License: Proprietary - All Rights Reserved
 * License URI: https://gas.travel/license
 * Text Domain: gas-template-push
 */

/*
 * Copyright © 2024–2026 Steve Driver / Global Accommodation Systems.
 * All rights reserved. Proprietary software.
 * See LICENSE at the repository root.
 */

if (!defined('ABSPATH')) exit;

class GAS_Template_Push {

    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes() {
        register_rest_route('gas/v1', '/push-template', array(
            'methods'  => 'POST',
            'callback' => array($this, 'handle_push'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route('gas/v1', '/page-content/(?P<page_id>\d+)', array(
            'methods'  => 'GET',
            'callback' => array($this, 'get_page_content'),
            'permission_callback' => '__return_true',
        ));

        register_rest_route('gas/v1', '/manage-page', array(
            'methods'  => 'POST',
            'callback' => array($this, 'handle_manage_page'),
            'permission_callback' => '__return_true',
        ));
    }

    public function get_page_content($request) {
        $api_key = isset($_GET['api_key']) ? sanitize_text_field($_GET['api_key']) : '';
        $stored_key = get_option('gas_license_key', '');

        if (empty($api_key) || empty($stored_key) || $api_key !== $stored_key) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Invalid API key'), 403);
        }

        $page_id = intval($request['page_id']);
        $page = get_post($page_id);

        if (!$page || $page->post_type !== 'page') {
            return new WP_REST_Response(array('success' => false, 'error' => 'Page not found'), 404);
        }

        return new WP_REST_Response(array(
            'success'      => true,
            'page_id'      => $page_id,
            'title'        => $page->post_title,
            'slug'         => $page->post_name,
            'raw_content'  => $page->post_content,
        ), 200);
    }

    /**
     * Determine which format to use:
     * - Both present + Elementor active → elementor
     * - Only template_json → elementor
     * - Only block_markup → blocks
     * - Both present + no Elementor → blocks
     */
    private function get_format($params) {
        $has_elementor_json = !empty($params['template_json']);
        $has_block_markup   = !empty($params['block_markup']);
        $elementor_active   = class_exists('\Elementor\Plugin');

        if ($has_elementor_json && $has_block_markup) {
            return $elementor_active ? 'elementor' : 'blocks';
        }
        if ($has_elementor_json) return 'elementor';
        if ($has_block_markup)   return 'blocks';
        return null;
    }

    public function handle_push($request) {
        $params = $request->get_json_params();

        // Validate API key against stored GAS license key
        $api_key = isset($params['api_key']) ? sanitize_text_field($params['api_key']) : '';
        $stored_key = get_option('gas_license_key', '');

        if (empty($api_key) || empty($stored_key) || $api_key !== $stored_key) {
            return new WP_REST_Response(array(
                'success' => false,
                'error'   => 'Invalid or missing API key'
            ), 403);
        }

        $mode = isset($params['mode']) ? $params['mode'] : 'push_to_existing';

        // replace_all_content bypasses format detection — uses block_markup directly
        if ($mode === 'replace_all_content') {
            return $this->replace_all_content($params);
        }

        $format = $this->get_format($params);
        if (!$format) {
            return new WP_REST_Response(array(
                'success' => false,
                'error'   => 'template_json or block_markup is required'
            ), 400);
        }

        if ($mode === 'create_new_page') {
            return $this->create_new_page($params, $format);
        } else {
            return $this->push_to_existing($params, $format);
        }
    }

    private function push_to_existing($params, $format) {
        $page_id  = isset($params['page_id']) ? intval($params['page_id']) : 0;
        $position = isset($params['position']) ? $params['position'] : 'bottom';

        if (!$page_id) {
            return new WP_REST_Response(array(
                'success' => false,
                'error'   => 'page_id is required'
            ), 400);
        }

        $page = get_post($page_id);
        if (!$page || $page->post_type !== 'page') {
            return new WP_REST_Response(array(
                'success' => false,
                'error'   => 'Page not found'
            ), 404);
        }

        if ($format === 'blocks') {
            return $this->push_blocks_to_existing($page, $params);
        }

        // Elementor format
        $template_json = $params['template_json'];
        $json_string = is_string($template_json) ? $template_json : wp_json_encode($template_json);

        // Get existing Elementor data
        $existing_data = get_post_meta($page_id, '_elementor_data', true);
        $existing = array();
        if (!empty($existing_data)) {
            $decoded = json_decode($existing_data, true);
            if (is_array($decoded)) {
                $existing = $decoded;
            }
        }

        // Parse incoming template sections
        $new_sections = json_decode($json_string, true);
        if (!is_array($new_sections)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error'   => 'Invalid template JSON'
            ), 400);
        }

        // Insert at position
        if ($position === 'top') {
            $existing = array_merge($new_sections, $existing);
        } elseif (is_numeric($position)) {
            array_splice($existing, intval($position), 0, $new_sections);
        } else {
            $existing = array_merge($existing, $new_sections);
        }

        // Save Elementor data
        update_post_meta($page_id, '_elementor_data', wp_slash(wp_json_encode($existing)));
        update_post_meta($page_id, '_elementor_edit_mode', 'builder');

        if (class_exists('\Elementor\Plugin')) {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
        }

        $this->flush_page_cache($page_id);

        return new WP_REST_Response(array(
            'success'        => true,
            'format'         => 'elementor',
            'page_id'        => $page_id,
            'page_url'       => get_permalink($page_id),
            'sections_count' => count($existing)
        ), 200);
    }

    private function push_blocks_to_existing($page, $params) {
        $block_markup = $params['block_markup'];
        $position     = isset($params['position']) ? $params['position'] : 'bottom';

        $existing_content = $page->post_content;

        if ($position === 'top') {
            $new_content = $block_markup . "\n\n" . $existing_content;
        } else {
            // bottom (default) — also handles numeric positions as bottom for blocks
            $new_content = $existing_content . "\n\n" . $block_markup;
        }

        // Bypass kses filtering — API key validates authorization, and block markup
        // contains CSS properties (background-color rgba, background-image url, box-shadow)
        // that wp_kses_post strips when no authenticated WP user is present
        kses_remove_filters();
        $result = wp_update_post(array(
            'ID'           => $page->ID,
            'post_content' => $new_content,
        ), true);
        kses_init_filters();

        if (is_wp_error($result)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error'   => $result->get_error_message()
            ), 500);
        }

        $this->flush_page_cache($page->ID);

        return new WP_REST_Response(array(
            'success'  => true,
            'format'   => 'blocks',
            'page_id'  => $page->ID,
            'page_url' => get_permalink($page->ID),
        ), 200);
    }

    private function replace_all_content($params) {
        $page_id = isset($params['page_id']) ? intval($params['page_id']) : 0;
        $block_markup = isset($params['block_markup']) ? $params['block_markup'] : '';

        if (!$page_id) {
            return new WP_REST_Response(array('success' => false, 'error' => 'page_id is required'), 400);
        }

        $page = get_post($page_id);
        if (!$page || $page->post_type !== 'page') {
            return new WP_REST_Response(array('success' => false, 'error' => 'Page not found'), 404);
        }

        kses_remove_filters();
        $result = wp_update_post(array(
            'ID'           => $page_id,
            'post_content' => $block_markup,
        ), true);
        kses_init_filters();

        if (is_wp_error($result)) {
            return new WP_REST_Response(array('success' => false, 'error' => $result->get_error_message()), 500);
        }

        $this->flush_page_cache($page_id);

        return new WP_REST_Response(array(
            'success'  => true,
            'format'   => 'blocks',
            'page_id'  => $page_id,
            'page_url' => get_permalink($page_id),
        ), 200);
    }

    private function create_new_page($params, $format) {
        $page_title  = isset($params['page_title']) ? sanitize_text_field($params['page_title']) : '';
        $page_slug   = isset($params['page_slug']) ? sanitize_title($params['page_slug']) : '';
        $add_to_menu = !empty($params['add_to_menu']);

        if (empty($page_title)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error'   => 'page_title is required'
            ), 400);
        }

        if (empty($page_slug)) {
            $page_slug = sanitize_title($page_title);
        }

        $post_args = array(
            'post_title'  => $page_title,
            'post_name'   => $page_slug,
            'post_status' => 'publish',
            'post_type'   => 'page',
        );

        if ($format === 'blocks') {
            // Gutenberg: content goes in post_content
            $post_args['post_content'] = $params['block_markup'];
        }

        kses_remove_filters();
        $page_id = wp_insert_post($post_args);
        kses_init_filters();

        if (is_wp_error($page_id)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error'   => $page_id->get_error_message()
            ), 500);
        }

        if ($format === 'elementor') {
            // Elementor: content goes in post meta
            $template_json = $params['template_json'];
            $json_string = is_string($template_json) ? $template_json : wp_json_encode($template_json);

            update_post_meta($page_id, '_wp_page_template', 'elementor_header_footer');
            update_post_meta($page_id, '_elementor_edit_mode', 'builder');
            update_post_meta($page_id, '_elementor_data', wp_slash($json_string));

            if (class_exists('\Elementor\Plugin')) {
                \Elementor\Plugin::$instance->files_manager->clear_cache();
            }
        }

        // Add to primary nav menu if requested
        if ($add_to_menu) {
            $this->add_page_to_menu($page_id, $page_title);
        }

        return new WP_REST_Response(array(
            'success'  => true,
            'format'   => $format,
            'page_id'  => $page_id,
            'page_url' => get_permalink($page_id),
        ), 200);
    }

    /**
     * Flush any page cache after content updates so changes appear immediately.
     */
    private function flush_page_cache($page_id) {
        // WP Super Cache
        if (function_exists('wp_cache_post_change')) {
            wp_cache_post_change($page_id);
        }
        // WP Super Cache — clear by URL
        if (function_exists('wpsc_delete_post_cache')) {
            wpsc_delete_post_cache($page_id);
        }
        // W3 Total Cache
        if (function_exists('w3tc_flush_post')) {
            w3tc_flush_post($page_id);
        }
        // LiteSpeed Cache
        if (method_exists('LiteSpeed_Cache_API', 'purge_post')) {
            LiteSpeed_Cache_API::purge_post($page_id);
        }
        // Generic object cache
        clean_post_cache($page_id);
    }

    private function add_page_to_menu($page_id, $page_title) {
        $menu_id = $this->get_primary_menu_id();
        if ($menu_id) {
            wp_update_nav_menu_item($menu_id, 0, array(
                'menu-item-title'     => $page_title,
                'menu-item-object'    => 'page',
                'menu-item-object-id' => $page_id,
                'menu-item-type'      => 'post_type',
                'menu-item-status'    => 'publish',
            ));
        }
    }

    private function get_primary_menu_id() {
        $locations = get_nav_menu_locations();
        foreach (array('primary', 'main', 'header') as $loc) {
            if (!empty($locations[$loc])) {
                return $locations[$loc];
            }
        }
        $menus = wp_get_nav_menus();
        if (!empty($menus)) {
            return $menus[0]->term_id;
        }
        return 0;
    }

    public function handle_manage_page($request) {
        $params = $request->get_json_params();

        // Validate API key
        $api_key = isset($params['api_key']) ? sanitize_text_field($params['api_key']) : '';
        $stored_key = get_option('gas_license_key', '');
        if (empty($api_key) || empty($stored_key) || $api_key !== $stored_key) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Invalid or missing API key'), 403);
        }

        $action = isset($params['action']) ? $params['action'] : '';

        switch ($action) {
            case 'create':
                return $this->manage_page_create($params);
            case 'rename':
                return $this->manage_page_rename($params);
            case 'delete':
                return $this->manage_page_delete($params);
            case 'reorder':
                return $this->manage_page_reorder($params);
            case 'get_menu':
                return $this->manage_page_get_menu();
            case 'update_menu':
                return $this->manage_page_update_menu($params);
            default:
                return new WP_REST_Response(array('success' => false, 'error' => 'Invalid action: ' . $action), 400);
        }
    }

    private function manage_page_create($params) {
        $page_title = isset($params['page_title']) ? sanitize_text_field($params['page_title']) : '';
        $page_slug = isset($params['page_slug']) ? sanitize_title($params['page_slug']) : '';
        $add_to_menu = !empty($params['add_to_menu']);

        if (empty($page_title)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'page_title is required'), 400);
        }
        if (empty($page_slug)) {
            $page_slug = sanitize_title($page_title);
        }

        $page_id = wp_insert_post(array(
            'post_title'   => $page_title,
            'post_name'    => $page_slug,
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_content' => '',
        ));

        if (is_wp_error($page_id)) {
            return new WP_REST_Response(array('success' => false, 'error' => $page_id->get_error_message()), 500);
        }

        if ($add_to_menu) {
            $this->add_page_to_menu($page_id, $page_title);
        }

        return new WP_REST_Response(array(
            'success'  => true,
            'page_id'  => $page_id,
            'page_url' => get_permalink($page_id),
            'slug'     => get_post_field('post_name', $page_id),
        ), 200);
    }

    private function manage_page_rename($params) {
        $page_id = isset($params['page_id']) ? intval($params['page_id']) : 0;
        $new_title = isset($params['new_title']) ? sanitize_text_field($params['new_title']) : '';

        if (!$page_id || empty($new_title)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'page_id and new_title are required'), 400);
        }

        $page = get_post($page_id);
        if (!$page || $page->post_type !== 'page') {
            return new WP_REST_Response(array('success' => false, 'error' => 'Page not found'), 404);
        }

        $new_slug = sanitize_title($new_title);
        wp_update_post(array(
            'ID'         => $page_id,
            'post_title' => $new_title,
            'post_name'  => $new_slug,
        ));

        // Update matching nav menu item title
        $menu_id = $this->get_primary_menu_id();
        if ($menu_id) {
            $items = wp_get_nav_menu_items($menu_id);
            if ($items) {
                foreach ($items as $item) {
                    if ($item->object === 'page' && intval($item->object_id) === $page_id) {
                        wp_update_nav_menu_item($menu_id, $item->ID, array(
                            'menu-item-title'     => $new_title,
                            'menu-item-object'    => 'page',
                            'menu-item-object-id' => $page_id,
                            'menu-item-type'      => 'post_type',
                            'menu-item-status'    => 'publish',
                            'menu-item-parent-id' => $item->menu_item_parent,
                            'menu-item-position'  => $item->menu_order,
                        ));
                        break;
                    }
                }
            }
        }

        return new WP_REST_Response(array(
            'success'   => true,
            'page_id'   => $page_id,
            'new_title' => $new_title,
            'new_slug'  => $new_slug,
        ), 200);
    }

    private function manage_page_delete($params) {
        $page_id = isset($params['page_id']) ? intval($params['page_id']) : 0;
        if (!$page_id) {
            return new WP_REST_Response(array('success' => false, 'error' => 'page_id is required'), 400);
        }

        // Protect front page
        $front_page_id = intval(get_option('page_on_front'));
        if ($front_page_id && $front_page_id === $page_id) {
            return new WP_REST_Response(array('success' => false, 'error' => 'Cannot delete the front page'), 400);
        }

        $page = get_post($page_id);
        if (!$page || $page->post_type !== 'page') {
            return new WP_REST_Response(array('success' => false, 'error' => 'Page not found'), 404);
        }

        // Remove from nav menu
        $menu_id = $this->get_primary_menu_id();
        if ($menu_id) {
            $items = wp_get_nav_menu_items($menu_id);
            if ($items) {
                foreach ($items as $item) {
                    if ($item->object === 'page' && intval($item->object_id) === $page_id) {
                        wp_delete_post($item->ID, true);
                    }
                }
            }
        }

        wp_trash_post($page_id);

        return new WP_REST_Response(array('success' => true, 'page_id' => $page_id), 200);
    }

    private function manage_page_reorder($params) {
        $pages = isset($params['pages']) ? $params['pages'] : array();
        if (empty($pages) || !is_array($pages)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'pages array is required'), 400);
        }

        // Update page menu_order
        foreach ($pages as $item) {
            $pid = isset($item['page_id']) ? intval($item['page_id']) : 0;
            $order = isset($item['menu_order']) ? intval($item['menu_order']) : 0;
            if ($pid) {
                wp_update_post(array('ID' => $pid, 'menu_order' => $order));
            }
        }

        // Also reorder nav menu items to match page order
        $menu_id = $this->get_primary_menu_id();
        if ($menu_id) {
            $menu_items = wp_get_nav_menu_items($menu_id);
            if ($menu_items) {
                // Build page_id → new position map
                $order_map = array();
                foreach ($pages as $item) {
                    $pid = isset($item['page_id']) ? intval($item['page_id']) : 0;
                    $order = isset($item['menu_order']) ? intval($item['menu_order']) : 0;
                    if ($pid) $order_map[$pid] = $order;
                }
                // Update each nav menu item's position to match its page's new order
                foreach ($menu_items as $mi) {
                    if ($mi->object === 'page' && isset($order_map[intval($mi->object_id)])) {
                        wp_update_nav_menu_item($menu_id, $mi->ID, array(
                            'menu-item-title'     => $mi->title,
                            'menu-item-object'    => 'page',
                            'menu-item-object-id' => $mi->object_id,
                            'menu-item-type'      => 'post_type',
                            'menu-item-status'    => 'publish',
                            'menu-item-parent-id' => $mi->menu_item_parent,
                            'menu-item-position'  => $order_map[intval($mi->object_id)],
                        ));
                    }
                }
            }
        }

        return new WP_REST_Response(array('success' => true), 200);
    }

    private function manage_page_get_menu() {
        $menu_id = $this->get_primary_menu_id();
        if (!$menu_id) {
            return new WP_REST_Response(array('success' => true, 'items' => array(), 'menu_id' => 0), 200);
        }

        $items = wp_get_nav_menu_items($menu_id);
        $result = array();
        if ($items) {
            foreach ($items as $item) {
                $result[] = array(
                    'menu_item_id'      => $item->ID,
                    'object_id'         => intval($item->object_id),
                    'title'             => $item->title,
                    'url'               => $item->url,
                    'position'          => $item->menu_order,
                    'parent'            => intval($item->menu_item_parent),
                    'object_type'       => $item->object,
                );
            }
        }

        return new WP_REST_Response(array('success' => true, 'items' => $result, 'menu_id' => $menu_id), 200);
    }

    private function manage_page_update_menu($params) {
        $items = isset($params['items']) ? $params['items'] : array();
        if (!is_array($items)) {
            return new WP_REST_Response(array('success' => false, 'error' => 'items array is required'), 400);
        }

        $menu_id = $this->get_primary_menu_id();

        // Create menu if none exists
        if (!$menu_id) {
            $menu_id = wp_create_nav_menu('Primary Menu');
            if (is_wp_error($menu_id)) {
                return new WP_REST_Response(array('success' => false, 'error' => $menu_id->get_error_message()), 500);
            }
            $locations = get_theme_mod('nav_menu_locations', array());
            $locations['primary'] = $menu_id;
            set_theme_mod('nav_menu_locations', $locations);
        }

        // Delete all existing menu items
        $existing = wp_get_nav_menu_items($menu_id);
        if ($existing) {
            foreach ($existing as $item) {
                wp_delete_post($item->ID, true);
            }
        }

        // Two-pass insert: first top-level, then children
        $page_id_to_menu_item_id = array();

        // Pass 1: top-level items (parent_page_id = 0 or not set)
        foreach ($items as $item) {
            $parent_page_id = isset($item['parent_page_id']) ? intval($item['parent_page_id']) : 0;
            if ($parent_page_id !== 0) continue;

            $page_id = intval($item['page_id']);
            $title = isset($item['title']) ? sanitize_text_field($item['title']) : get_the_title($page_id);
            $position = isset($item['position']) ? intval($item['position']) : 0;

            $menu_item_id = wp_update_nav_menu_item($menu_id, 0, array(
                'menu-item-title'     => $title,
                'menu-item-object'    => 'page',
                'menu-item-object-id' => $page_id,
                'menu-item-type'      => 'post_type',
                'menu-item-status'    => 'publish',
                'menu-item-position'  => $position,
            ));

            if (!is_wp_error($menu_item_id)) {
                $page_id_to_menu_item_id[$page_id] = $menu_item_id;
            }
        }

        // Pass 2: child items
        foreach ($items as $item) {
            $parent_page_id = isset($item['parent_page_id']) ? intval($item['parent_page_id']) : 0;
            if ($parent_page_id === 0) continue;

            $page_id = intval($item['page_id']);
            $title = isset($item['title']) ? sanitize_text_field($item['title']) : get_the_title($page_id);
            $position = isset($item['position']) ? intval($item['position']) : 0;
            $parent_menu_id = isset($page_id_to_menu_item_id[$parent_page_id]) ? $page_id_to_menu_item_id[$parent_page_id] : 0;

            $menu_item_id = wp_update_nav_menu_item($menu_id, 0, array(
                'menu-item-title'     => $title,
                'menu-item-object'    => 'page',
                'menu-item-object-id' => $page_id,
                'menu-item-type'      => 'post_type',
                'menu-item-status'    => 'publish',
                'menu-item-position'  => $position,
                'menu-item-parent-id' => $parent_menu_id,
            ));

            if (!is_wp_error($menu_item_id)) {
                $page_id_to_menu_item_id[$page_id] = $menu_item_id;
            }
        }

        return new WP_REST_Response(array('success' => true, 'items_count' => count($page_id_to_menu_item_id)), 200);
    }
}

new GAS_Template_Push();
