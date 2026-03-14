<?php
/**
 * Plugin Name: GAS Template Push
 * Description: Receives Elementor and Gutenberg templates from GAS Admin and injects them into pages.
 * Version: 1.1.0
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

        $format = $this->get_format($params);
        if (!$format) {
            return new WP_REST_Response(array(
                'success' => false,
                'error'   => 'template_json or block_markup is required'
            ), 400);
        }

        $mode = isset($params['mode']) ? $params['mode'] : 'push_to_existing';

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

        $result = wp_update_post(array(
            'ID'           => $page->ID,
            'post_content' => $new_content,
        ), true);

        if (is_wp_error($result)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error'   => $result->get_error_message()
            ), 500);
        }

        return new WP_REST_Response(array(
            'success'  => true,
            'format'   => 'blocks',
            'page_id'  => $page->ID,
            'page_url' => get_permalink($page->ID),
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

        $page_id = wp_insert_post($post_args);

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

    private function add_page_to_menu($page_id, $page_title) {
        $locations = get_nav_menu_locations();
        $menu_id = 0;

        foreach (array('primary', 'main', 'header') as $loc) {
            if (!empty($locations[$loc])) {
                $menu_id = $locations[$loc];
                break;
            }
        }

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
}

new GAS_Template_Push();
