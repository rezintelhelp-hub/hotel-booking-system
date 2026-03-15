<?php
/**
 * Template Name: Contact
 * 
 * Contact page template - 4 card layout controlled from GAS Admin
 *
 * @package GAS_Developer
 */

get_header();

$api = function_exists('developer_get_api_settings') ? developer_get_api_settings() : array();

// Contact page translations
$cl = function_exists('developer_get_current_language') ? developer_get_current_language() : 'en';
$ct_all = [
    'en' => ['your_name' => 'Your Name', 'your_email' => 'Your Email', 'subject' => 'Subject', 'message' => 'Message', 'send' => 'Send Message', 'sent' => 'Message Sent!', 'address' => 'Address', 'phone' => 'Phone', 'email' => 'Email', 'details' => 'Company Details', 'directions' => 'Get Directions', 'find_us' => 'Find Us', 'contact_us' => 'Contact Us'],
    'de' => ['your_name' => 'Ihr Name', 'your_email' => 'Ihre E-Mail', 'subject' => 'Betreff', 'message' => 'Nachricht', 'send' => 'Nachricht senden', 'sent' => 'Nachricht gesendet!', 'address' => 'Adresse', 'phone' => 'Telefon', 'email' => 'E-Mail', 'details' => 'Kontaktdaten', 'directions' => 'Anfahrt', 'find_us' => 'So finden Sie uns', 'contact_us' => 'Kontakt'],
    'fr' => ['your_name' => 'Votre nom', 'your_email' => 'Votre e-mail', 'subject' => 'Objet', 'message' => 'Message', 'send' => 'Envoyer', 'sent' => 'Message envoyé !', 'address' => 'Adresse', 'phone' => 'Téléphone', 'email' => 'E-mail', 'details' => 'Coordonnées', 'directions' => 'Itinéraire', 'find_us' => 'Nous trouver', 'contact_us' => 'Contactez-nous'],
    'es' => ['your_name' => 'Su nombre', 'your_email' => 'Su correo electrónico', 'subject' => 'Asunto', 'message' => 'Mensaje', 'send' => 'Enviar mensaje', 'sent' => '¡Mensaje enviado!', 'address' => 'Dirección', 'phone' => 'Teléfono', 'email' => 'Correo electrónico', 'details' => 'Datos de contacto', 'directions' => 'Cómo llegar', 'find_us' => 'Encuéntrenos', 'contact_us' => 'Contacto'],
    'nl' => ['your_name' => 'Uw naam', 'your_email' => 'Uw e-mail', 'subject' => 'Onderwerp', 'message' => 'Bericht', 'send' => 'Versturen', 'sent' => 'Bericht verzonden!', 'address' => 'Adres', 'phone' => 'Telefoon', 'email' => 'E-mail', 'details' => 'Contactgegevens', 'directions' => 'Routebeschrijving', 'find_us' => 'Vind ons', 'contact_us' => 'Contact'],
    'it' => ['your_name' => 'Il tuo nome', 'your_email' => 'La tua e-mail', 'subject' => 'Oggetto', 'message' => 'Messaggio', 'send' => 'Invia messaggio', 'sent' => 'Messaggio inviato!', 'address' => 'Indirizzo', 'phone' => 'Telefono', 'email' => 'E-mail', 'details' => 'Recapiti', 'directions' => 'Indicazioni', 'find_us' => 'Trovaci', 'contact_us' => 'Contattaci'],
    'pt' => ['your_name' => 'O seu nome', 'your_email' => 'O seu e-mail', 'subject' => 'Assunto', 'message' => 'Mensagem', 'send' => 'Enviar mensagem', 'sent' => 'Mensagem enviada!', 'address' => 'Morada', 'phone' => 'Telefone', 'email' => 'E-mail', 'details' => 'Dados de contacto', 'directions' => 'Direções', 'find_us' => 'Encontre-nos', 'contact_us' => 'Contacto'],
    'ja' => ['your_name' => 'お名前', 'your_email' => 'メールアドレス', 'subject' => '件名', 'message' => 'メッセージ', 'send' => '送信', 'sent' => '送信完了！', 'address' => '住所', 'phone' => '電話', 'email' => 'メール', 'details' => '会社情報', 'directions' => 'アクセス', 'find_us' => '所在地', 'contact_us' => 'お問い合わせ'],
];
$ct = $ct_all[$cl] ?? $ct_all['en'];

// Page header
$page_title    = $api['page_contact_title'] ?? '';
$page_subtitle = $api['page_contact_subtitle'] ?? '';

// Hero toggle — default ON when never set
$hero_val = $api['page_contact_hero_enabled'] ?? true;
$hero_enabled = !($hero_val === false || $hero_val === 'false' || $hero_val === '0' || $hero_val === 0);
$hero_image   = $api['page_contact_hero_image'] ?? '';
$header_bg    = $api['page_contact_header_bg'] ?? '#1e293b';
$header_text  = $api['page_contact_header_text'] ?? '#ffffff';

// Company details
$business = $api['page_contact_business_name'] ?? '';
$email    = $api['page_contact_email'] ?? $api['footer_email'] ?? '';
$phone    = $api['page_contact_phone'] ?? $api['footer_phone'] ?? '';
$address  = $api['page_contact_address'] ?? $api['footer_address'] ?? '';
$city     = $api['page_contact_city'] ?? '';
$state    = $api['page_contact_state'] ?? '';
$zip      = $api['page_contact_zip'] ?? '';
$country  = $api['page_contact_country'] ?? '';

// Map
$lat  = $api['page_contact_latitude'] ?? '';
$lng  = $api['page_contact_longitude'] ?? '';
$zoom = $api['page_contact_map_zoom'] ?? '14';
$map_height = intval($api['page_contact_map_height'] ?? 300);

// 4 card toggles
$show_details    = !empty($api['page_contact_show_details']) && $api['page_contact_show_details'] !== 'false' && $api['page_contact_show_details'] !== false;
$show_directions = !empty($api['page_contact_show_directions']) && $api['page_contact_show_directions'] !== 'false' && $api['page_contact_show_directions'] !== false;
$show_map        = !empty($api['page_contact_show_map']) && $api['page_contact_show_map'] !== 'false' && $api['page_contact_show_map'] !== false;
$show_form       = !empty($api['page_contact_show_form']) && $api['page_contact_show_form'] !== 'false' && $api['page_contact_show_form'] !== false;

// Individual item toggles within the details card (default true)
$show_email   = !isset($api['page_contact_show_email']) || ($api['page_contact_show_email'] !== false && $api['page_contact_show_email'] !== 'false');
$show_phone   = !isset($api['page_contact_show_phone']) || ($api['page_contact_show_phone'] !== false && $api['page_contact_show_phone'] !== 'false');
$show_address = !isset($api['page_contact_show_address']) || ($api['page_contact_show_address'] !== false && $api['page_contact_show_address'] !== 'false');

// Card titles (multilingual)
$details_title    = $api['page_contact_details_title'] ?? $ct['details'];
$directions_text  = $api['page_contact_directions_text'] ?? $ct['directions'];
$map_title        = $api['page_contact_map_title'] ?? $ct['find_us'];
$form_title       = $api['page_contact_form_title'] ?? $ct['contact_us'];

// Build full address
$address_parts = array_filter([$address, $city, $state, $zip, $country]);
$full_address  = implode(', ', $address_parts);

// Directions URL
$directions_url = 'https://www.google.com/maps/dir/?api=1&destination=' . urlencode($full_address);
if ($lat && $lng) {
    $directions_url = 'https://www.google.com/maps/dir/?api=1&destination=' . urlencode($lat . ',' . $lng);
}

// Count active cards for grid layout
$active_cards = ($show_details ? 1 : 0) + ($show_directions ? 1 : 0) + ($show_map ? 1 : 0) + ($show_form ? 1 : 0);
$grid_cols = $active_cards >= 2 ? '1fr 1fr' : '1fr';

// Theme colors
$accent = $api['accent_color'] ?? '#10b981';
$button_color = $api['page_contact_button_color'] ?? $accent;
?>

<style>
/* Page hero — must clear the fixed header (position:fixed, ~70-80px tall) */
.developer-page-hero {
    position: relative;
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 80px 0 3rem;
}
.developer-page-hero-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
.developer-page-hero-content { position: relative; z-index: 1; }
.developer-page-hero h1 { font-weight: 700; margin: 0 0 0.5rem; }

.gas-contact-page { padding-top: 120px; padding-bottom: 80px; min-height: 70vh; }
.gas-contact-container { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; }
.gas-contact-header { text-align: center; margin-bottom: 3rem; }
.gas-contact-header h1 { font-weight: 700; color: var(--developer-text, #1e293b); margin: 0 0 0.5rem; }
.gas-contact-header p { color: var(--developer-text-light, #64748b); font-size: 1.1rem; margin: 0; }

.gas-contact-grid {
    display: grid;
    grid-template-columns: <?php echo $grid_cols; ?>;
    gap: 2rem;
    align-items: stretch;
}

/* Shared card style */
.gas-contact-card {
    background: var(--developer-card-bg, #fff);
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    border: 1px solid var(--developer-border, #e2e8f0);
}
.gas-contact-card h2 {
    font-size: 1.35rem;
    font-weight: 600;
    color: var(--developer-text, #1e293b);
    margin: 0 0 1.5rem;
}

/* Details card */
.gas-contact-item { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem; }
.gas-contact-icon { width: 40px; height: 40px; min-width: 40px; border-radius: 10px; background: <?php echo esc_attr($accent); ?>15; display: flex; align-items: center; justify-content: center; }
.gas-contact-icon svg { width: 20px; height: 20px; stroke: <?php echo esc_attr($accent); ?>; fill: none; }
.gas-contact-item-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--developer-text-light, #64748b); margin: 0 0 0.2rem; font-weight: 600; }
.gas-contact-item-value { color: var(--developer-text, #1e293b); font-size: 0.95rem; line-height: 1.5; }
.gas-contact-item-value a { color: <?php echo esc_attr($accent); ?>; text-decoration: none; }
.gas-contact-item-value a:hover { text-decoration: underline; }

/* Directions card */
.gas-contact-directions-btn {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.75rem 1.5rem; background: <?php echo esc_attr($button_color); ?>; color: #fff;
    border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 1rem;
    transition: opacity 0.2s;
}
.gas-contact-directions-btn:hover { opacity: 0.9; color: #fff; text-decoration: none; }
.gas-contact-directions-btn svg { width: 20px; height: 20px; stroke: #fff; fill: none; }
.gas-contact-directions-address { color: var(--developer-text-light, #64748b); font-size: 0.9rem; margin-top: 1rem; }

/* Map card — fills height to match neighbour */
.gas-contact-card--map { display: flex; flex-direction: column; }
.gas-contact-card--map h2 { flex-shrink: 0; }
.gas-contact-map-frame { flex: 1; border-radius: 12px; overflow: hidden; border: 1px solid var(--developer-border, #e2e8f0); }
.gas-contact-map-frame iframe { width: 100%; height: 100%; min-height: <?php echo intval($map_height); ?>px; border: 0; display: block; }

/* Form card */
.gas-contact-form .gas-form-group { margin-bottom: 1rem; }
.gas-contact-form .gas-form-group label { display: block; font-size: 0.85rem; font-weight: 500; color: var(--developer-text, #1e293b); margin-bottom: 0.35rem; }
.gas-contact-form input, .gas-contact-form textarea {
    width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--developer-border, #e2e8f0); border-radius: 10px;
    font-size: 0.95rem; font-family: inherit; background: var(--developer-bg, #fff); color: var(--developer-text, #1e293b);
    transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;
}
.gas-contact-form input:focus, .gas-contact-form textarea:focus {
    outline: none; border-color: <?php echo esc_attr($accent); ?>; box-shadow: 0 0 0 3px <?php echo esc_attr($accent); ?>20;
}
.gas-contact-form textarea { resize: vertical; min-height: 120px; }
.gas-contact-form button {
    width: 100%; padding: 0.85rem; background: <?php echo esc_attr($button_color); ?>; color: #fff; border: none;
    border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s;
}
.gas-contact-form button:hover { opacity: 0.9; }
.gas-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

/* Success message */
.gas-form-success { display: none; text-align: center; padding: 2rem; }
.gas-form-success svg { width: 48px; height: 48px; stroke: <?php echo esc_attr($accent); ?>; margin-bottom: 1rem; }
.gas-form-success h3 { margin: 0 0 0.5rem; color: var(--developer-text, #1e293b); }
.gas-form-success p { margin: 0; color: var(--developer-text-light, #64748b); }

@media (max-width: 768px) {
    .gas-contact-grid { grid-template-columns: 1fr; }
    .gas-form-row { grid-template-columns: 1fr; }
    .gas-contact-page { padding-top: 100px; padding-bottom: 60px; }
}
</style>

<?php if ($hero_enabled) : ?>
<!-- Page Hero -->
<section class="developer-page-hero" style="background: <?php echo esc_attr($header_bg); ?>; <?php echo $hero_image ? 'background-image: url(' . esc_url($hero_image) . '); background-size: cover; background-position: center;' : ''; ?>">
    <div class="developer-page-hero-overlay" style="background: rgba(0,0,0,0.5);"></div>
    <div class="developer-container">
        <div class="developer-page-hero-content">
            <h1 style="color: <?php echo esc_attr($header_text); ?>;"><?php echo $page_title ? esc_html($page_title) : the_title('', '', false); ?></h1>
            <?php if ($page_subtitle) : ?>
                <p class="developer-page-subtitle" style="color: <?php echo esc_attr($header_text); ?>;"><?php echo esc_html($page_subtitle); ?></p>
            <?php endif; ?>
        </div>
    </div>
</section>
<?php endif; ?>

<div class="gas-contact-page" <?php if ($hero_enabled) echo 'style="padding-top: 40px;"'; ?>>
    <div class="gas-contact-container">

        <?php if (!$hero_enabled) : ?>
        <div class="gas-contact-header">
            <h1><?php echo $page_title ? esc_html($page_title) : the_title('', '', false); ?></h1>
            <?php if ($page_subtitle): ?>
                <p><?php echo esc_html($page_subtitle); ?></p>
            <?php elseif ($business): ?>
                <p><?php echo esc_html($business); ?></p>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <div class="gas-contact-grid">

            <?php if ($show_details): ?>
            <!-- Card 1: Company Details -->
            <div class="gas-contact-card">
                <h2><?php echo esc_html($details_title); ?></h2>

                <?php if ($show_address && $full_address): ?>
                <div class="gas-contact-item">
                    <div class="gas-contact-icon">
                        <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <div>
                        <p class="gas-contact-item-label"><?php echo esc_html($ct['address']); ?></p>
                        <p class="gas-contact-item-value"><?php echo nl2br(esc_html(implode("\n", array_filter([$business, $address, implode(', ', array_filter([$city, $state, $zip])), $country])))); ?></p>
                    </div>
                </div>
                <?php endif; ?>

                <?php if ($show_phone && $phone): ?>
                <div class="gas-contact-item">
                    <div class="gas-contact-icon">
                        <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                    </div>
                    <div>
                        <p class="gas-contact-item-label"><?php echo esc_html($ct['phone']); ?></p>
                        <p class="gas-contact-item-value"><a href="tel:<?php echo esc_attr(preg_replace('/[^0-9+]/', '', $phone)); ?>"><?php echo esc_html($phone); ?></a></p>
                    </div>
                </div>
                <?php endif; ?>

                <?php if ($show_email && $email): ?>
                <div class="gas-contact-item">
                    <div class="gas-contact-icon">
                        <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
                    </div>
                    <div>
                        <p class="gas-contact-item-label"><?php echo esc_html($ct['email']); ?></p>
                        <p class="gas-contact-item-value"><a href="mailto:<?php echo esc_attr($email); ?>"><?php echo esc_html($email); ?></a></p>
                    </div>
                </div>
                <?php endif; ?>
            </div>
            <?php endif; ?>

            <?php if ($show_directions && $full_address): ?>
            <!-- Card 2: Directions -->
            <div class="gas-contact-card">
                <h2>🧭 <?php echo esc_html($directions_text); ?></h2>
                <a href="<?php echo esc_url($directions_url); ?>" target="_blank" rel="noopener" class="gas-contact-directions-btn">
                    <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                    <?php echo esc_html($directions_text); ?>
                </a>
                <p class="gas-contact-directions-address"><?php echo esc_html($full_address); ?></p>
            </div>
            <?php endif; ?>

            <?php if ($show_map && $lat && $lng): ?>
            <!-- Card 3: Find Us (Map) -->
            <div class="gas-contact-card gas-contact-card--map">
                <h2><?php echo esc_html($map_title); ?></h2>
                <div class="gas-contact-map-frame">
                    <iframe
                        src="https://www.google.com/maps/embed/v1/place?key=AIzaSyB4_dMKn2O_KHZOEIEEah0KpDLJRn5A25g&q=<?php echo esc_attr($lat); ?>,<?php echo esc_attr($lng); ?>&zoom=<?php echo esc_attr($zoom); ?>"
                        loading="lazy"
                        title="Location Map"
                        allowfullscreen>
                    </iframe>
                </div>
            </div>
            <?php endif; ?>

            <?php if ($show_form): ?>
            <!-- Card 4: Contact Form -->
            <div class="gas-contact-card">
                <h2><?php echo esc_html($form_title); ?></h2>
                <form class="gas-contact-form" id="gasContactForm" onsubmit="return handleGasContactForm(event)">
                    <div style="position: absolute; left: -9999px;" aria-hidden="true">
                        <input type="text" name="website_url" id="gas-contact-hp" tabindex="-1" autocomplete="off">
                    </div>
                    <div class="gas-form-row">
                        <div class="gas-form-group">
                            <label for="gas-contact-name"><?php echo esc_html($ct['your_name']); ?></label>
                            <input type="text" id="gas-contact-name" name="name" required>
                        </div>
                        <div class="gas-form-group">
                            <label for="gas-contact-email"><?php echo esc_html($ct['your_email']); ?></label>
                            <input type="email" id="gas-contact-email" name="email" required>
                        </div>
                    </div>
                    <div class="gas-form-group">
                        <label for="gas-contact-subject"><?php echo esc_html($ct['subject']); ?></label>
                        <input type="text" id="gas-contact-subject" name="subject">
                    </div>
                    <div class="gas-form-group">
                        <label for="gas-contact-message"><?php echo esc_html($ct['message']); ?></label>
                        <textarea id="gas-contact-message" name="message" required></textarea>
                    </div>
                    <button type="submit"><?php echo esc_html($ct['send']); ?></button>
                </form>
                <div class="gas-form-success" id="gasFormSuccess">
                    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <h3><?php echo esc_html($ct['sent']); ?></h3>
                    <p>Thank you for getting in touch. We'll get back to you shortly.</p>
                </div>
            </div>
            <?php endif; ?>

        </div>

    </div>
</div>

<script>
function handleGasContactForm(e) {
    e.preventDefault();
    
    // Honeypot check - bots fill this in, humans don't see it
    if (document.getElementById('gas-contact-hp').value) {
        // Fake success for bots
        document.getElementById('gasContactForm').style.display = 'none';
        document.getElementById('gasFormSuccess').style.display = 'block';
        return false;
    }
    
    var form = document.getElementById('gasContactForm');
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    
    var data = {
        name: document.getElementById('gas-contact-name').value,
        email: document.getElementById('gas-contact-email').value,
        subject: document.getElementById('gas-contact-subject').value,
        message: document.getElementById('gas-contact-message').value,
        page_url: window.location.href
    };
    
    var apiUrl = '<?php echo esc_js(get_option("gas_api_url", "https://admin.gas.travel")); ?>';
    var clientId = '<?php echo esc_js(get_option("gas_client_id", "")); ?>';
    
    fetch(apiUrl + '/api/public/client/' + clientId + '/contact-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(function() {
        form.style.display = 'none';
        document.getElementById('gasFormSuccess').style.display = 'block';
    }).catch(function() {
        form.style.display = 'none';
        document.getElementById('gasFormSuccess').style.display = 'block';
    });
    
    return false;
}
</script>

<?php get_footer(); ?>
