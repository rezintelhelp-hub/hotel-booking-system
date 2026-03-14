<?php
/**
 * Plugin Name: GAS Template Push
 * Description: Receives Elementor templates from GAS Admin and injects them into pages.
 * Version: 1.0.0
 * Author: GAS
 * License: GPL v2 or later
 * Text Domain: gas-template-push
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

        $mode          = isset($params['mode']) ? $params['mode'] : 'push_to_existing';
        $template_json = isset($params['template_json']) ? $params['template_json'] : null;

        if (empty($template_json)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error'   => 'template_json is required'
            ), 400);
        }

        // Ensure template_json is a string for storage
        $json_string = is_string($template_json) ? $template_json : wp_json_encode($template_json);

        if ($mode === 'create_new_page') {
            return $this->create_new_page($params, $json_string);
        } else {
            return $this->push_to_existing($params, $json_string);
        }
    }

    private function push_to_existing($params, $json_string) {
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
            // bottom (default)
            $existing = array_merge($existing, $new_sections);
        }

        // Save Elementor data
        update_post_meta($page_id, '_elementor_data', wp_slash(wp_json_encode($existing)));
        update_post_meta($page_id, '_elementor_edit_mode', 'builder');

        // Clear Elementor CSS cache for this post
        if (class_exists('\Elementor\Plugin')) {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
        }

        return new WP_REST_Response(array(
            'success'        => true,
            'page_id'        => $page_id,
            'page_url'       => get_permalink($page_id),
            'sections_count' => count($existing)
        ), 200);
    }

    private function create_new_page($params, $json_string) {
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

        // Create the page
        $page_id = wp_insert_post(array(
            'post_title'  => $page_title,
            'post_name'   => $page_slug,
            'post_status' => 'publish',
            'post_type'   => 'page',
        ));

        if (is_wp_error($page_id)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error'   => $page_id->get_error_message()
            ), 500);
        }

        // Set Elementor template
        update_post_meta($page_id, '_wp_page_template', 'elementor_header_footer');
        update_post_meta($page_id, '_elementor_edit_mode', 'builder');
        update_post_meta($page_id, '_elementor_data', wp_slash($json_string));

        // Clear Elementor CSS cache
        if (class_exists('\Elementor\Plugin')) {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
        }

        // Add to primary nav menu if requested
        if ($add_to_menu) {
            $locations = get_nav_menu_locations();
            $menu_id = 0;

            // Try 'primary', 'main', or first available
            foreach (array('primary', 'main', 'header') as $loc) {
                if (!empty($locations[$loc])) {
                    $menu_id = $locations[$loc];
                    break;
                }
            }

            // Fallback: first registered menu
            if (!$menu_id) {
                $menus = wp_get_nav_menus();
                if (!empty($menus)) {
                    $menu_id = $menus[0]->term_id;
                }
            }

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

        return new WP_REST_Response(array(
            'success'  => true,
            'page_id'  => $page_id,
            'page_url' => get_permalink($page_id),
        ), 200);
    }
}

new GAS_Template_Push();
