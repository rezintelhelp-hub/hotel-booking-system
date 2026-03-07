<?php
/**
 * Template Name: Terms & Conditions
 */

get_header();

// Get site configuration from GAS API
$site_config = null;
$gas_api_url = get_option('gas_api_url', '');
$gas_client_id = get_option('gas_client_id', '');

if ($gas_api_url && $gas_client_id) {
    $cache_key = 'gas_site_config_' . $gas_client_id;
    $site_config = get_transient($cache_key);
    
    if ($site_config === false) {
        $response = wp_remote_get($gas_api_url . '/api/public/client/' . $gas_client_id . '/site-config', array(
            'timeout' => 10,
            'sslverify' => false
        ));
        
        if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
            $body = json_decode(wp_remote_retrieve_body($response), true);
            if ($body && $body['success']) {
                $site_config = $body['config'];
                set_transient($cache_key, $site_config, 30);
            }
        }
    }
}

// Read from website builder flat keys (where GAS Admin saves)
$wt = !empty($site_config['website']['page-terms']) ? $site_config['website']['page-terms'] : array();

// Also check legacy nested path as fallback
$legacy = !empty($site_config['pages']['terms']) ? $site_config['pages']['terms'] : null;
$legacy_sections = $legacy ? ($legacy['sections'] ?? []) : [];

$use_api = !empty($wt) || !empty($legacy_sections);
$terms_source = $wt['source'] ?? 'custom';

// Get current language for multilingual content
$lang = function_exists('developer_get_current_language') ? developer_get_current_language() : 'en';

// Page settings - try website builder path first, then legacy
$page_title = '';
if (!empty($wt)) {
    $page_title = function_exists('developer_get_ml_value') ? developer_get_ml_value($wt, 'title', $lang) : ($wt['title'] ?? '');
}
if (empty($page_title) && $legacy) {
    $page_title = $legacy['title'] ?? '';
}
if (empty($page_title)) {
    $page_title = get_the_title() ?: 'Terms & Conditions';
}

$updated_date = $wt['updated'] ?? ($legacy['updated_date'] ?? '');

// Helper to get ml value or fall back to legacy
$ml = function_exists('developer_get_ml_value') ? 'developer_get_ml_value' : null;

// Build displayable sections array
$all_sections = [];

// Helper: normalize newlines (handles literal \n from JSON double-encoding) then wpautop+esc_html
function gas_format_text($text) {
    $text = str_replace(array("\\n", "\r\n", "\r"), array("\n", "\n", "\n"), $text);
    return wpautop(esc_html(trim($text)));
}

if ($terms_source === 'gas-account') {
    // Translations for auto-generated terms sections
    $tt_all = [
        'en' => ['checkin_checkout' => 'Check-in & Check-out', 'checkin' => 'Check-in', 'checkout' => 'Check-out', 'from' => 'from', 'until' => 'until', 'by' => 'by', 'late_fee' => 'late check-out fee', 'self_checkin' => 'Self check-in available.', 'cancellation' => 'Cancellation Policy', 'house_rules' => 'House Rules', 'no_smoking' => 'No smoking.', 'designated_smoking' => 'Smoking in designated areas only.', 'no_pets' => 'No pets allowed.', 'pets_request' => 'Pets on request.', 'pets_allowed' => 'Pets allowed.', 'quiet_hours' => 'Quiet hours', 'terms' => 'Terms & Conditions', 'liability' => 'Liability & Damages', 'directions' => 'Directions', 'area_info' => 'Area Information'],
        'de' => ['checkin_checkout' => 'An- & Abreise', 'checkin' => 'Check-in', 'checkout' => 'Check-out', 'from' => 'ab', 'until' => 'bis', 'by' => 'bis', 'late_fee' => 'Gebühr für späten Check-out', 'self_checkin' => 'Selbst-Check-in verfügbar.', 'cancellation' => 'Stornierungsbedingungen', 'house_rules' => 'Hausregeln', 'no_smoking' => 'Rauchen nicht gestattet.', 'designated_smoking' => 'Rauchen nur in ausgewiesenen Bereichen.', 'no_pets' => 'Keine Haustiere erlaubt.', 'pets_request' => 'Haustiere auf Anfrage.', 'pets_allowed' => 'Haustiere erlaubt.', 'quiet_hours' => 'Ruhezeiten', 'terms' => 'Allgemeine Geschäftsbedingungen', 'liability' => 'Haftung & Schäden', 'directions' => 'Anfahrt', 'area_info' => 'Umgebungsinformationen'],
        'fr' => ['checkin_checkout' => 'Arrivée & Départ', 'checkin' => 'Arrivée', 'checkout' => 'Départ', 'from' => 'à partir de', 'until' => "jusqu'à", 'by' => 'avant', 'late_fee' => 'frais de départ tardif', 'self_checkin' => 'Arrivée autonome disponible.', 'cancellation' => "Conditions d'annulation", 'house_rules' => 'Règlement intérieur', 'no_smoking' => 'Non-fumeur.', 'designated_smoking' => 'Fumeur dans les zones désignées uniquement.', 'no_pets' => 'Animaux non admis.', 'pets_request' => 'Animaux sur demande.', 'pets_allowed' => 'Animaux admis.', 'quiet_hours' => 'Heures de silence', 'terms' => 'Conditions générales', 'liability' => 'Responsabilité & Dommages', 'directions' => 'Itinéraire', 'area_info' => 'Informations sur la région'],
        'es' => ['checkin_checkout' => 'Entrada y Salida', 'checkin' => 'Entrada', 'checkout' => 'Salida', 'from' => 'desde', 'until' => 'hasta', 'by' => 'antes de', 'late_fee' => 'cargo por salida tardía', 'self_checkin' => 'Auto check-in disponible.', 'cancellation' => 'Política de cancelación', 'house_rules' => 'Normas de la casa', 'no_smoking' => 'No fumar.', 'designated_smoking' => 'Fumar solo en áreas designadas.', 'no_pets' => 'No se admiten mascotas.', 'pets_request' => 'Mascotas bajo petición.', 'pets_allowed' => 'Se admiten mascotas.', 'quiet_hours' => 'Horas de silencio', 'terms' => 'Términos y condiciones', 'liability' => 'Responsabilidad y daños', 'directions' => 'Cómo llegar', 'area_info' => 'Información de la zona'],
        'nl' => ['checkin_checkout' => 'In- & Uitchecken', 'checkin' => 'Inchecken', 'checkout' => 'Uitchecken', 'from' => 'vanaf', 'until' => 'tot', 'by' => 'voor', 'late_fee' => 'toeslag voor laat uitchecken', 'self_checkin' => 'Zelf inchecken beschikbaar.', 'cancellation' => 'Annuleringsvoorwaarden', 'house_rules' => 'Huisregels', 'no_smoking' => 'Niet roken.', 'designated_smoking' => 'Roken alleen in aangewezen ruimtes.', 'no_pets' => 'Geen huisdieren toegestaan.', 'pets_request' => 'Huisdieren op aanvraag.', 'pets_allowed' => 'Huisdieren toegestaan.', 'quiet_hours' => 'Stiltetijden', 'terms' => 'Algemene voorwaarden', 'liability' => 'Aansprakelijkheid & Schade', 'directions' => 'Routebeschrijving', 'area_info' => 'Omgevingsinformatie'],
        'it' => ['checkin_checkout' => 'Check-in e Check-out', 'checkin' => 'Check-in', 'checkout' => 'Check-out', 'from' => 'dalle', 'until' => 'alle', 'by' => 'entro le', 'late_fee' => 'supplemento check-out tardivo', 'self_checkin' => 'Self check-in disponibile.', 'cancellation' => 'Politica di cancellazione', 'house_rules' => 'Regole della casa', 'no_smoking' => 'Vietato fumare.', 'designated_smoking' => 'Si fuma solo nelle aree designate.', 'no_pets' => 'Animali non ammessi.', 'pets_request' => 'Animali su richiesta.', 'pets_allowed' => 'Animali ammessi.', 'quiet_hours' => 'Ore di silenzio', 'terms' => 'Termini e condizioni', 'liability' => 'Responsabilità e danni', 'directions' => 'Indicazioni', 'area_info' => 'Informazioni sulla zona'],
        'pt' => ['checkin_checkout' => 'Check-in e Check-out', 'checkin' => 'Check-in', 'checkout' => 'Check-out', 'from' => 'a partir das', 'until' => 'até às', 'by' => 'até às', 'late_fee' => 'taxa de check-out tardio', 'self_checkin' => 'Self check-in disponível.', 'cancellation' => 'Política de cancelamento', 'house_rules' => 'Regras da casa', 'no_smoking' => 'Proibido fumar.', 'designated_smoking' => 'Fumar apenas em áreas designadas.', 'no_pets' => 'Animais não permitidos.', 'pets_request' => 'Animais sob consulta.', 'pets_allowed' => 'Animais permitidos.', 'quiet_hours' => 'Horas de silêncio', 'terms' => 'Termos e condições', 'liability' => 'Responsabilidade e danos', 'directions' => 'Direções', 'area_info' => 'Informações da área'],
        'ja' => ['checkin_checkout' => 'チェックイン・チェックアウト', 'checkin' => 'チェックイン', 'checkout' => 'チェックアウト', 'from' => '', 'until' => 'まで', 'by' => 'まで', 'late_fee' => 'レイトチェックアウト料金', 'self_checkin' => 'セルフチェックイン可能。', 'cancellation' => 'キャンセルポリシー', 'house_rules' => 'ハウスルール', 'no_smoking' => '禁煙。', 'designated_smoking' => '指定エリアのみ喫煙可。', 'no_pets' => 'ペット不可。', 'pets_request' => 'ペットは要相談。', 'pets_allowed' => 'ペット可。', 'quiet_hours' => '静粛時間', 'terms' => '利用規約', 'liability' => '責任と損害', 'directions' => 'アクセス', 'area_info' => '周辺情報'],
    ];
    $tt = $tt_all[$lang] ?? $tt_all['en'];

    // Auto-generate from property_terms data — pre-render as HTML
    $pt = $site_config['pages']['terms']['property_terms']
       ?? $site_config['website']['page-terms']['property_terms'] ?? [];

    // Check-in & Check-out
    if (!empty($pt['checkin_from']) || !empty($pt['checkout_by'])) {
        $ci = '';
        if (!empty($pt['checkin_from'])) {
            $ci .= '<p><strong>' . esc_html($tt['checkin']) . ':</strong> ' . esc_html($tt['from']) . ' ' . esc_html($pt['checkin_from']);
            if (!empty($pt['checkin_until'])) $ci .= ' ' . esc_html($tt['until']) . ' ' . esc_html($pt['checkin_until']);
            $ci .= '</p>';
        }
        if (!empty($pt['checkout_by'])) {
            $ci .= '<p><strong>' . esc_html($tt['checkout']) . ':</strong> ' . esc_html($tt['by']) . ' ' . esc_html($pt['checkout_by']);
            if (!empty($pt['late_checkout_fee'])) $ci .= ' (' . esc_html($tt['late_fee']) . ': ' . esc_html($pt['late_checkout_fee']) . ')';
            $ci .= '</p>';
        }
        if (!empty($pt['self_checkin'])) $ci .= '<p>' . esc_html($tt['self_checkin']) . '</p>';
        if (!empty($pt['check_in_instructions'])) $ci .= gas_format_text($pt['check_in_instructions']);
        if (!empty($pt['check_out_instructions'])) $ci .= gas_format_text($pt['check_out_instructions']);
        $all_sections[] = ['title' => $tt['checkin_checkout'], 'content' => $ci, 'html' => true];
    }

    // Cancellation Policy
    if (!empty($pt['cancellation_policy'])) {
        $all_sections[] = ['title' => $tt['cancellation'], 'content' => gas_format_text($pt['cancellation_policy']), 'html' => true];
    }

    // House Rules (each rule as its own paragraph)
    $hr = '';
    if (!empty($pt['smoking_policy']) && $pt['smoking_policy'] !== 'yes') {
        $hr .= $pt['smoking_policy'] === 'no' ? '<p>' . esc_html($tt['no_smoking']) . '</p>' : '<p>' . esc_html($tt['designated_smoking']) . '</p>';
    }
    if (!empty($pt['pet_policy'])) {
        $ptext = $pt['pet_policy'] === 'no' ? $tt['no_pets'] : ($pt['pet_policy'] === 'request' ? $tt['pets_request'] : $tt['pets_allowed']);
        $hr .= '<p>' . esc_html($ptext) . '</p>';
    }
    if (!empty($pt['quiet_hours_from']) && !empty($pt['quiet_hours_until'])) {
        $hr .= '<p>' . esc_html($tt['quiet_hours']) . ': ' . esc_html($pt['quiet_hours_from']) . ' &ndash; ' . esc_html($pt['quiet_hours_until']) . '</p>';
    }
    if (!empty($pt['additional_rules'])) $hr .= gas_format_text($pt['additional_rules']);
    if (!empty($hr)) {
        $all_sections[] = ['title' => $tt['house_rules'], 'content' => $hr, 'html' => true];
    }

    if (!empty($pt['terms_conditions'])) {
        $all_sections[] = ['title' => $tt['terms'], 'content' => gas_format_text($pt['terms_conditions']), 'html' => true];
    }
    if (!empty($pt['damage_policy'])) {
        $all_sections[] = ['title' => $tt['liability'], 'content' => gas_format_text($pt['damage_policy']), 'html' => true];
    }
    if (!empty($pt['directions'])) {
        $all_sections[] = ['title' => $tt['directions'], 'content' => gas_format_text($pt['directions']), 'html' => true];
    }
    if (!empty($pt['area_info'])) {
        $all_sections[] = ['title' => $tt['area_info'], 'content' => gas_format_text($pt['area_info']), 'html' => true];
    }

    $use_api = true;

} else {

// Booking section
$booking_enabled = $wt['booking-enabled'] ?? true;
if ($booking_enabled !== false && $booking_enabled !== 'false') {
    $content = $ml ? $ml($wt, 'booking', $lang) : ($wt['booking'] ?? '');
    if (empty($content) && !empty($legacy_sections['booking']['content'])) {
        $content = $legacy_sections['booking']['content'];
    }
    if (!empty($content)) {
        $title = $ml ? $ml($wt, 'booking-title', $lang) : ($wt['booking-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['booking']['title'] ?? 'Booking & Reservations';
        $all_sections[] = ['title' => $title, 'content' => $content];
    }
}

// Cancellation section
$cancel_enabled = $wt['cancellation-enabled'] ?? true;
if ($cancel_enabled !== false && $cancel_enabled !== 'false') {
    $content = $ml ? $ml($wt, 'cancellation', $lang) : ($wt['cancellation'] ?? '');
    if (empty($content) && !empty($legacy_sections['cancellation']['content'])) {
        $content = $legacy_sections['cancellation']['content'];
    }
    if (empty($content)) {
        // Auto-generate from period/fee
        $period = $wt['cancellation-period'] ?? ($legacy_sections['cancellation']['cancel_period'] ?? '48');
        $fee = $wt['cancellation-fee'] ?? ($legacy_sections['cancellation']['cancel_fee'] ?? 'first-night');
        $period_text = '';
        switch ($period) {
            case '24': $period_text = '24 hours before check-in'; break;
            case '48': $period_text = '48 hours before check-in'; break;
            case '72': $period_text = '72 hours before check-in'; break;
            case '7days': $period_text = '7 days before check-in'; break;
            case '14days': $period_text = '14 days before check-in'; break;
        }
        $fee_text = '';
        switch ($fee) {
            case 'first-night': $fee_text = 'first night will be charged'; break;
            case '50': $fee_text = '50% of the booking total will be charged'; break;
            case '100': $fee_text = '100% of the booking total will be charged'; break;
        }
        if ($period_text) {
            $content = "Free cancellation is available up to {$period_text}.";
            if ($fee_text) $content .= " For cancellations after this period, {$fee_text}.";
        }
    }
    if (!empty($content)) {
        $title = $ml ? $ml($wt, 'cancellation-title', $lang) : ($wt['cancellation-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['cancellation']['title'] ?? 'Cancellation Policy';
        $all_sections[] = ['title' => $title, 'content' => $content];
    }
}

// Check-in section
$checkin_enabled = $wt['checkin-enabled'] ?? true;
if ($checkin_enabled !== false && $checkin_enabled !== 'false') {
    $checkin_time = $wt['checkin-time'] ?? ($legacy_sections['checkin']['checkin_time'] ?? '');
    $checkout_time = $wt['checkout-time'] ?? ($legacy_sections['checkin']['checkout_time'] ?? '');
    $details = $ml ? $ml($wt, 'checkin-details', $lang) : ($wt['checkin-details'] ?? '');
    if (empty($details) && !empty($legacy_sections['checkin']['details'])) {
        $details = $legacy_sections['checkin']['details'];
    }
    if ($checkin_time || $checkout_time || $details) {
        $checkin_content = '';
        if ($checkin_time) $checkin_content .= "Check-in: {$checkin_time}\n";
        if ($checkout_time) $checkin_content .= "Check-out: {$checkout_time}\n";
        if ($details) $checkin_content .= "\n{$details}";
        $title = $ml ? $ml($wt, 'checkin-title', $lang) : ($wt['checkin-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['checkin']['title'] ?? 'Check-in & Check-out';
        $all_sections[] = ['title' => $title, 'content' => trim($checkin_content)];
    }
}

// House Rules section
$rules_enabled = $wt['house-rules-enabled'] ?? true;
if ($rules_enabled !== false && $rules_enabled !== 'false') {
    $content = $ml ? $ml($wt, 'house-rules', $lang) : ($wt['house-rules'] ?? '');
    if (empty($content) && !empty($legacy_sections['house_rules']['content'])) {
        $content = $legacy_sections['house_rules']['content'];
    }
    if (!empty($content)) {
        $title = $ml ? $ml($wt, 'house-rules-title', $lang) : ($wt['house-rules-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['house_rules']['title'] ?? 'House Rules';
        $all_sections[] = ['title' => $title, 'content' => $content];
    }
}

// Payment section
$payment_enabled = $wt['payment-enabled'] ?? true;
if ($payment_enabled !== false && $payment_enabled !== 'false') {
    $content = $ml ? $ml($wt, 'payment', $lang) : ($wt['payment'] ?? '');
    if (empty($content) && !empty($legacy_sections['payment']['content'])) {
        $content = $legacy_sections['payment']['content'];
    }
    if (!empty($content)) {
        $title = $ml ? $ml($wt, 'payment-title', $lang) : ($wt['payment-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['payment']['title'] ?? 'Payment Terms';
        $all_sections[] = ['title' => $title, 'content' => $content];
    }
}

// Liability section
$liability_enabled = $wt['liability-enabled'] ?? true;
if ($liability_enabled !== false && $liability_enabled !== 'false') {
    $content = $ml ? $ml($wt, 'liability', $lang) : ($wt['liability'] ?? '');
    if (empty($content) && !empty($legacy_sections['liability']['content'])) {
        $content = $legacy_sections['liability']['content'];
    }
    if (!empty($content)) {
        $title = $ml ? $ml($wt, 'liability-title', $lang) : ($wt['liability-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['liability']['title'] ?? 'Liability & Damages';
        $all_sections[] = ['title' => $title, 'content' => $content];
    }
}

// Additional section
$additional_enabled = $wt['additional-enabled'] ?? true;
if ($additional_enabled !== false && $additional_enabled !== 'false') {
    $content = $ml ? $ml($wt, 'additional', $lang) : ($wt['additional'] ?? '');
    if (empty($content) && !empty($legacy_sections['additional']['content'])) {
        $content = $legacy_sections['additional']['content'];
    }
    if (!empty($content)) {
        $title = $ml ? $ml($wt, 'additional-title', $lang) : ($wt['additional-title'] ?? '');
        if (empty($title)) $title = $legacy_sections['additional']['title'] ?? 'Additional Terms';
        $all_sections[] = ['title' => $title, 'content' => $content];
    }
}

} // end terms_source else (custom)
?>

<main id="primary" class="site-main">
    
    <!-- Page Header -->
    <section class="developer-section" style="background: #f8fafc; padding: 120px 0 50px;">
        <div class="developer-container" style="text-align: center;">
            <h1 style="margin-bottom: 0.5rem;"><?php echo esc_html($page_title); ?></h1>
            <?php if ($updated_date) : ?>
            <p style="color: #64748b; font-size: 0.95rem; margin: 0;">Last updated: <?php echo esc_html(date('F j, Y', strtotime($updated_date))); ?></p>
            <?php endif; ?>
        </div>
    </section>

    <?php if ($use_api && count($all_sections) > 0) : ?>
        <?php foreach ($all_sections as $index => $section) : 
            $bg_color = ($index % 2 === 0) ? '#ffffff' : '#f8fafc';
        ?>
        <section class="developer-section developer-terms-section" style="background: <?php echo $bg_color; ?>; padding: 50px 0;">
            <div class="developer-container">
                <div class="developer-terms-content">
                    <h2><?php echo esc_html($section['title']); ?></h2>
                    <div class="developer-terms-text">
                        <?php if (!empty($section['html'])) {
                            echo $section['content'];
                        } else {
                            echo gas_format_text($section['content']);
                        } ?>
                    </div>
                </div>
            </div>
        </section>
        <?php endforeach; ?>
    <?php else : ?>
        <!-- Fallback message -->
        <section class="developer-section" style="background: #ffffff; padding: 50px 0;">
            <div class="developer-container">
                <div class="developer-terms-content">
                    <p style="text-align: center; color: #64748b;">No terms & conditions content has been configured yet. Please add content in GAS Admin → Website Builder → Terms & Conditions.</p>
                </div>
            </div>
        </section>
    <?php endif; ?>

</main>

<?php
// Output FAQ Schema if enabled and FAQs exist
$faq_enabled = $wt['faq-enabled'] ?? ($legacy['faq_enabled'] ?? true);
$faqs = $legacy['faqs'] ?? [];

if ($faq_enabled && $faq_enabled !== 'false' && !empty($faqs) && is_array($faqs)) :
    $faq_schema = [
        '@context' => 'https://schema.org',
        '@type' => 'FAQPage',
        'mainEntity' => []
    ];
    
    foreach ($faqs as $faq) {
        if (!empty($faq['question']) && !empty($faq['answer'])) {
            $faq_schema['mainEntity'][] = [
                '@type' => 'Question',
                'name' => $faq['question'],
                'acceptedAnswer' => [
                    '@type' => 'Answer',
                    'text' => $faq['answer']
                ]
            ];
        }
    }
    
    if (!empty($faq_schema['mainEntity'])) :
?>
<script type="application/ld+json">
<?php echo json_encode($faq_schema, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT); ?>
</script>
<?php 
    endif;
endif; 
?>

<style>
.developer-terms-content {
    max-width: 800px;
    margin: 0 auto;
}
.developer-terms-content h2 {
    font-size: 1.75rem;
    color: #1e293b;
    margin-bottom: 1.5rem;
    font-weight: 600;
}
.developer-terms-text p {
    line-height: 1.8;
    color: #475569;
    margin-bottom: 1rem;
    font-size: 1rem;
}
.developer-terms-text p:last-child {
    margin-bottom: 0;
}
</style>

<?php get_footer(); ?>
