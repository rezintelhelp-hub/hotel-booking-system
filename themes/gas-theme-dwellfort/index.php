<?php
/**
 * Fallback template — Phase 2 scaffold only. Real layouts land in Phase 3
 * (header.php, front-page.php, page.php, footer.php).
 *
 * @package GAS_Dwellfort
 */
if (!defined('ABSPATH')) exit;
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div class="df-container">
    <p style="padding:60px 0;color:#7d7e7d;font-family:'Muli',sans-serif;">
        GAS Dwellfort theme scaffold (v<?php echo GAS_DWELLFORT_VERSION; ?>) — templates in progress.
    </p>
</div>
<?php wp_footer(); ?>
</body>
</html>
