<?php
/**
 * Copyright (c) 2026 GAS - Global Accommodation System (gas.travel)
 * All rights reserved.
 *
 * This software is proprietary and licensed exclusively for use on
 * GAS-hosted infrastructure. Copying, redistribution, modification,
 * reverse-engineering, or deployment on non-GAS servers is strictly
 * prohibited without prior written consent from GAS.
 *
 * Unauthorized use may result in legal action under applicable
 * intellectual property and copyright laws.
 *
 * Contact: steve@gas.travel | https://gas.travel
 */

/**
 * Template Name: Reviews
 * Template for the Reviews page — shows all reviews in a grid
 *
 * @package GAS_Developer
 */

get_header();

// Get API settings
$api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();
$gas_api_url = get_option('gas_api_url', 'https://admin.gas.travel');

// Reviews settings
$reviews_source   = $api['reviews_use_app'] ?? '';
$reviews_app_code = $api['reviews_app_code'] ?? '';
$hostaway_id      = $api['reviews_hostaway_id'] ?? '';
$page_title       = $api['reviews_title'] ?? 'What Our Guests Say';
$page_subtitle    = $api['reviews_subtitle'] ?? 'Real reviews from real guests';
$bg_color         = $api['reviews_bg'] ?? '#0f172a';
$text_color       = $api['reviews_text_color'] ?? '#ffffff';
$card_bg          = $api['reviews_card_bg'] ?? '#1e293b';
$star_color       = $api['reviews_star_color'] ?? '#fbbf24';
$btn_color        = $api['reviews_btn_color'] ?? $star_color;
$btn_text_color   = $api['reviews_btn_text_color'] ?? '#ffffff';
$primary_color    = $api['primary_color'] ?? '#2563eb';

// Border radius settings
$btn_radius  = $api['btn_radius'] ?? '8';
$card_radius = $api['card_radius'] ?? 12;
$lg_radius   = $api['lg_radius'] ?? 16;

// Legacy boolean compat
if ($reviews_source === true || $reviews_source === '1' || $reviews_source === 'true') {
    $reviews_source = 'gas_reviews';
}

// Fetch reviews based on source
$reviews = array();
$per_page = 24;

if ($reviews_source === 'repuso' && $reviews_app_code) {
    $resp = wp_remote_get($gas_api_url . '/api/public/repuso-reviews?widget_id=' . urlencode($reviews_app_code) . '&limit=' . $per_page, array('timeout' => 10, 'sslverify' => false));
    if (!is_wp_error($resp)) {
        $body = json_decode(wp_remote_retrieve_body($resp), true);
        if (!empty($body['reviews'])) $reviews = $body['reviews'];
    }
} elseif ($reviews_source === 'hostaway' && $hostaway_id) {
    $resp = wp_remote_get($gas_api_url . '/api/public/hostaway-reviews?property_id=' . urlencode($hostaway_id) . '&limit=' . $per_page, array('timeout' => 10, 'sslverify' => false));
    if (!is_wp_error($resp)) {
        $body = json_decode(wp_remote_retrieve_body($resp), true);
        if (!empty($body['reviews'])) $reviews = $body['reviews'];
    }
} elseif ($reviews_source === 'gas_reviews') {
    $client_id = get_option('gas_client_id', '');
    if ($client_id) {
        $resp = wp_remote_get($gas_api_url . '/api/public/client/' . urlencode($client_id) . '/reviews?limit=' . $per_page, array('timeout' => 10, 'sslverify' => false));
        if (!is_wp_error($resp)) {
            $body = json_decode(wp_remote_retrieve_body($resp), true);
            if (!empty($body['reviews'])) {
                foreach ($body['reviews'] as $r) {
                    $reviews[] = array(
                        'id' => $r['id'] ?? 0,
                        'reviewer_name' => $r['guest_name'] ?? 'Guest',
                        'rating' => $r['rating'] ?? 5,
                        'text' => $r['comment'] ?? '',
                        'date' => $r['review_date'] ?? '',
                        'source' => $r['channel_name'] ?? ''
                    );
                }
            }
        }
    }
} else {
    // Manual reviews
    for ($i = 1; $i <= 3; $i++) {
        $text = $api["review{$i}_text"] ?? '';
        if ($text) {
            $reviews[] = array(
                'reviewer_name' => $api["review{$i}_name"] ?? 'Guest',
                'rating' => 5,
                'text' => $text,
                'date' => '',
                'source' => $api["review{$i}_source"] ?? ''
            );
        }
    }
}

// Build the data-endpoint for JS load-more
$data_endpoint = '';
if ($reviews_source === 'repuso' && $reviews_app_code) {
    $data_endpoint = $gas_api_url . '/api/public/repuso-reviews?widget_id=' . urlencode($reviews_app_code);
} elseif ($reviews_source === 'hostaway' && $hostaway_id) {
    $data_endpoint = $gas_api_url . '/api/public/hostaway-reviews?property_id=' . urlencode($hostaway_id);
} elseif ($reviews_source === 'gas_reviews') {
    $client_id = get_option('gas_client_id', '');
    if ($client_id) $data_endpoint = $gas_api_url . '/api/public/client/' . urlencode($client_id) . '/reviews';
}
?>

<!-- Reviews Page -->
<section class="developer-section" style="background: <?php echo esc_attr($bg_color); ?>; padding: 140px 0 80px;">
    <div class="developer-container">
        <div style="text-align: center; margin-bottom: 3rem;">
            <h2 style="color: <?php echo esc_attr($text_color); ?>; font-size: 2.5rem; margin: 0 0 0.75rem;"><?php echo esc_html($page_title); ?></h2>
            <p style="color: <?php echo esc_attr($text_color); ?>; opacity: 0.8; margin: 0; font-size: 1.1rem;"><?php echo esc_html($page_subtitle); ?></p>
        </div>
        <?php if (!empty($reviews)) : ?>
        <div id="gas-reviews-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
            <?php foreach ($reviews as $rev) :
                $rating = round(floatval($rev['rating'] ?? 5));
                $scale = floatval($rev['rating_scale'] ?? 5);
                if ($scale > 5) $rating = round($rating / 2);
                $stars = str_repeat('★', min(max($rating, 0), 5));
                $empty = str_repeat('☆', 5 - min(max($rating, 0), 5));
                $name = $rev['reviewer_name'] ?? 'Guest';
                $text = $rev['text'] ?? '';
                $source = $rev['source'] ?? '';
                $date = !empty($rev['date']) ? date('M Y', strtotime($rev['date'])) : '';
                $meta = $date . ($source ? ($date ? ' · ' : '') . $source : '');
            ?>
            <div class="gas-review-card" style="background: <?php echo esc_attr($card_bg); ?>; border-radius: <?php echo esc_attr($card_radius); ?>px; padding: 24px; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.08);">
                <div style="color: <?php echo esc_attr($star_color); ?>; font-size: 18px; letter-spacing: 1px; margin-bottom: 12px;"><?php echo $stars . $empty; ?></div>
                <p style="color: <?php echo esc_attr($text_color); ?>; font-size: 14px; line-height: 1.6; flex: 1; margin: 0 0 16px 0; opacity: 0.9;">"<?php echo esc_html($text); ?>"</p>
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; margin-top: auto;">
                    <div style="font-weight: 600; color: <?php echo esc_attr($text_color); ?>; font-size: 14px;"><?php echo esc_html($name); ?></div>
                    <?php if ($meta) : ?><div style="font-size: 12px; color: <?php echo esc_attr($text_color); ?>; opacity: 0.6; margin-top: 2px;"><?php echo esc_html($meta); ?></div><?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <?php if ($data_endpoint && count($reviews) >= $per_page) : ?>
        <div id="gas-load-more-wrap" style="text-align: center; margin-top: 2.5rem;">
            <button id="gas-load-more-btn" onclick="gasLoadMoreReviews()"
                style="display: inline-block; padding: 14px 36px; background: <?php echo esc_attr($btn_color); ?>; color: <?php echo esc_attr($btn_text_color); ?>; border: 2px solid <?php echo esc_attr($btn_color); ?>; border-radius: <?php echo esc_attr($btn_radius); ?>px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.3s ease;">
                Load More Reviews
            </button>
        </div>
        <script>
        (function() {
            var offset = <?php echo count($reviews); ?>;
            var perPage = <?php echo $per_page; ?>;
            var endpoint = <?php echo json_encode($data_endpoint); ?>;
            var cardBg = <?php echo json_encode($card_bg); ?>;
            var textColor = <?php echo json_encode($text_color); ?>;
            var starColor = <?php echo json_encode($star_color); ?>;
            var grid = document.getElementById('gas-reviews-grid');
            var btn = document.getElementById('gas-load-more-btn');
            var wrap = document.getElementById('gas-load-more-wrap');

            window.gasLoadMoreReviews = function() {
                btn.textContent = 'Loading...';
                btn.disabled = true;
                var sep = endpoint.indexOf('?') !== -1 ? '&' : '?';
                var url = endpoint + sep + 'limit=' + perPage + '&offset=' + offset;
                fetch(url)
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        var items = data.reviews || [];
                        if (items.length === 0) { wrap.style.display = 'none'; return; }
                        items.forEach(function(rev) {
                            var rating = Math.round(parseFloat(rev.rating) || 5);
                            var scale = parseFloat(rev.rating_scale) || 5;
                            if (scale > 5) rating = Math.round(rating / 2);
                            rating = Math.min(Math.max(rating, 0), 5);
                            var stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
                            var name = rev.reviewer_name || rev.guest_name || 'Guest';
                            var text = rev.text || rev.comment || '';
                            var source = rev.source || rev.channel_name || '';
                            var dateStr = rev.date || rev.review_date || '';
                            if (dateStr) { var d = new Date(dateStr); dateStr = d.toLocaleDateString('en-GB', {year:'numeric',month:'short'}); }
                            var meta = dateStr + (source ? (dateStr ? ' · ' : '') + source : '');

                            var card = document.createElement('div');
                            card.className = 'gas-review-card';
                            card.style.cssText = 'background:' + cardBg + ';border-radius:<?php echo esc_attr($card_radius); ?>px;padding:24px;display:flex;flex-direction:column;border:1px solid rgba(255,255,255,0.08);opacity:0;transform:translateY(12px);transition:all 0.4s ease;';
                            card.innerHTML = '<div style="color:' + starColor + ';font-size:18px;letter-spacing:1px;margin-bottom:12px;">' + stars + '</div>'
                                + '<p style="color:' + textColor + ';font-size:14px;line-height:1.6;flex:1;margin:0 0 16px 0;opacity:0.9;">"' + text.replace(/</g,'&lt;') + '"</p>'
                                + '<div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;margin-top:auto;">'
                                + '<div style="font-weight:600;color:' + textColor + ';font-size:14px;">' + name.replace(/</g,'&lt;') + '</div>'
                                + (meta ? '<div style="font-size:12px;color:' + textColor + ';opacity:0.6;margin-top:2px;">' + meta + '</div>' : '')
                                + '</div>';
                            grid.appendChild(card);
                            setTimeout(function() { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }, 50);
                        });
                        offset += items.length;
                        btn.textContent = 'Load More Reviews';
                        btn.disabled = false;
                        if (items.length < perPage) wrap.style.display = 'none';
                    })
                    .catch(function() {
                        btn.textContent = 'Load More Reviews';
                        btn.disabled = false;
                    });
            };
        })();
        </script>
        <?php endif; ?>

        <?php else : ?>
        <p style="text-align: center; color: <?php echo esc_attr($text_color); ?>; opacity: 0.7; font-size: 1.1rem;">No reviews available yet.</p>
        <?php endif; ?>
    </div>
</section>

<style>
@media (max-width: 1024px) {
    #gas-reviews-grid { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 640px) {
    #gas-reviews-grid { grid-template-columns: 1fr !important; }
}
</style>

<?php get_footer(); ?>
