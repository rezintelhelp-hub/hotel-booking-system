/**
 * GAS Lites - Full Property Pages + Promotional Cards
 * 
 * Routes:
 * - /:slug - Full room page with tabs (like WordPress plugin)
 * - /:slug/card - Promotional card for social/print
 * - /:slug/qr - QR code image
 * - /:slug/print - Printable card
 */

const express = require('express');
const { Pool } = require('pg');
const QRCode = require('qrcode');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper to parse JSON text fields (display_name, short_description, etc.)
// Now supports multilingual - pass language code to get specific language
function parseJsonTextField(value, lang = 'en') {
  if (!value) return '';
  try {
    if (typeof value === 'object') {
      // Already an object (JSONB returned as object)
      // Try requested language first, then en, then any value
      return value[lang] || value[lang.toUpperCase()] || value.en || value.EN || Object.values(value)[0] || '';
    } else if (typeof value === 'string' && value.trim().startsWith('{')) {
      // JSON string
      const parsed = JSON.parse(value);
      return parsed[lang] || parsed[lang.toUpperCase()] || parsed.en || parsed.EN || Object.values(parsed)[0] || value;
    } else {
      return String(value);
    }
  } catch (e) {
    return String(value);
  }
}

// Embedded translations for GAS Lites (subset of full translations)
const LITE_TRANSLATIONS = {
  en: {
    gallery: 'Gallery',
    amenities: 'Amenities', 
    reviews: 'Reviews',
    location: 'Location',
    book: 'Book',
    check_in: 'Check-in',
    check_out: 'Check-out',
    guests: 'Guests',
    guest: 'guest',
    guests_plural: 'guests',
    per_night: 'per night',
    nights: 'nights',
    night: 'night',
    total: 'Total',
    book_now: 'Book Now',
    request_booking: 'Request Booking',
    select_dates: 'Select your dates',
    available: 'Available',
    unavailable: 'Unavailable',
    min_stay: 'Min stay',
    price_from: 'From',
    bedrooms: 'Bedrooms',
    bathrooms: 'Bathrooms',
    sleeps: 'Sleeps',
    house_rules: 'House Rules',
    policies: 'Policies',
    cancellation: 'Cancellation Policy',
    pets_allowed: 'Pets allowed',
    no_pets: 'No pets',
    smoking_allowed: 'Smoking allowed', 
    no_smoking: 'No smoking',
    children_welcome: 'Children welcome',
    view_all_photos: 'View all photos',
    contact_host: 'Contact Host',
    share: 'Share',
    save: 'Save',
    scan_to_book: 'Scan to book direct',
    powered_by: 'Powered by',
    select_language: 'Language',
    booking_details: 'Booking Details',
    your_stay: 'Your Stay',
    price_breakdown: 'Price Breakdown',
    base_price: 'Base price',
    cleaning_fee: 'Cleaning fee',
    service_fee: 'Service fee',
    taxes: 'Taxes & fees',
    discount: 'Discount',
    continue: 'Continue',
    back: 'Back',
    confirm_booking: 'Confirm Booking',
    guest_details: 'Guest Details',
    first_name: 'First Name',
    last_name: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    special_requests: 'Special Requests',
    terms_agree: 'I agree to the',
    terms_conditions: 'Terms & Conditions',
    booking_confirmed: 'Booking Confirmed!',
    confirmation_sent: 'A confirmation email has been sent.',
    booking_reference: 'Booking Reference',
    not_found: 'Page not found',
    error: 'Something went wrong',
    loading: 'Loading',
    payment: 'Payment',
    country: 'Country',
    address: 'Address',
    city: 'City',
    postcode: 'Postcode',
    optional: 'optional',
    description: 'Description',
    more_info: 'More Information',
    book_nights: 'Book {n} nights',
    promo_code: 'Have a promo code?',
    no_amenities: 'No amenities listed.',
    check_availability: 'Check Availability',
    view_book: 'View & Book',
    all_locations: 'All Locations',
    all_properties: 'All Properties',
    no_rooms: 'No rooms available',
    checking: 'Checking...',
    max_guests_msg: 'Max {n} guests'
  },
  fr: {
    gallery: 'Galerie',
    amenities: 'Équipements',
    reviews: 'Avis',
    location: 'Localisation',
    book: 'Réserver',
    check_in: 'Arrivée',
    check_out: 'Départ',
    guests: 'Voyageurs',
    guest: 'voyageur',
    guests_plural: 'voyageurs',
    per_night: 'par nuit',
    nights: 'nuits',
    night: 'nuit',
    total: 'Total',
    book_now: 'Réserver',
    request_booking: 'Demande de réservation',
    select_dates: 'Sélectionnez vos dates',
    available: 'Disponible',
    unavailable: 'Indisponible',
    min_stay: 'Séjour min.',
    price_from: 'À partir de',
    bedrooms: 'Chambres',
    bathrooms: 'Salles de bain',
    sleeps: 'Couchages',
    house_rules: 'Règlement',
    policies: 'Conditions',
    cancellation: 'Politique d\'annulation',
    pets_allowed: 'Animaux acceptés',
    no_pets: 'Animaux non acceptés',
    smoking_allowed: 'Fumeurs acceptés',
    no_smoking: 'Non-fumeur',
    children_welcome: 'Enfants bienvenus',
    view_all_photos: 'Voir toutes les photos',
    contact_host: 'Contacter l\'hôte',
    share: 'Partager',
    save: 'Sauvegarder',
    scan_to_book: 'Scannez pour réserver',
    powered_by: 'Propulsé par',
    select_language: 'Langue',
    booking_details: 'Détails de réservation',
    your_stay: 'Votre séjour',
    price_breakdown: 'Détail du prix',
    base_price: 'Prix de base',
    cleaning_fee: 'Frais de ménage',
    service_fee: 'Frais de service',
    taxes: 'Taxes',
    discount: 'Réduction',
    continue: 'Continuer',
    back: 'Retour',
    confirm_booking: 'Confirmer la réservation',
    guest_details: 'Coordonnées',
    first_name: 'Prénom',
    last_name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    special_requests: 'Demandes spéciales',
    terms_agree: 'J\'accepte les',
    terms_conditions: 'Conditions générales',
    booking_confirmed: 'Réservation confirmée !',
    confirmation_sent: 'Un email de confirmation a été envoyé.',
    booking_reference: 'Référence',
    not_found: 'Page non trouvée',
    error: 'Une erreur est survenue',
    loading: 'Chargement',
    payment: 'Paiement',
    country: 'Pays',
    address: 'Adresse',
    city: 'Ville',
    postcode: 'Code postal',
    optional: 'facultatif',
    description: 'Description',
    more_info: 'Plus d\'informations',
    book_nights: 'Réserver {n} nuits',
    promo_code: 'Avez-vous un code promo?',
    no_amenities: 'Aucun équipement listé.',
    check_availability: 'Vérifier la disponibilité',
    view_book: 'Voir & Réserver',
    all_locations: 'Toutes les villes',
    all_properties: 'Toutes les propriétés',
    no_rooms: 'Aucune chambre disponible',
    checking: 'Vérification...',
    max_guests_msg: 'Max {n} voyageurs'
  },
  es: {
    gallery: 'Galería',
    amenities: 'Servicios',
    reviews: 'Opiniones',
    location: 'Ubicación',
    book: 'Reservar',
    check_in: 'Entrada',
    check_out: 'Salida',
    guests: 'Huéspedes',
    guest: 'huésped',
    guests_plural: 'huéspedes',
    per_night: 'por noche',
    nights: 'noches',
    night: 'noche',
    total: 'Total',
    book_now: 'Reservar',
    request_booking: 'Solicitar reserva',
    select_dates: 'Selecciona tus fechas',
    available: 'Disponible',
    unavailable: 'No disponible',
    min_stay: 'Estancia mín.',
    price_from: 'Desde',
    bedrooms: 'Dormitorios',
    bathrooms: 'Baños',
    sleeps: 'Capacidad',
    house_rules: 'Normas',
    policies: 'Políticas',
    cancellation: 'Política de cancelación',
    pets_allowed: 'Mascotas permitidas',
    no_pets: 'No se admiten mascotas',
    smoking_allowed: 'Se permite fumar',
    no_smoking: 'No fumadores',
    children_welcome: 'Niños bienvenidos',
    view_all_photos: 'Ver todas las fotos',
    contact_host: 'Contactar anfitrión',
    share: 'Compartir',
    save: 'Guardar',
    scan_to_book: 'Escanea para reservar',
    powered_by: 'Powered by',
    select_language: 'Idioma',
    booking_details: 'Detalles de reserva',
    your_stay: 'Tu estancia',
    price_breakdown: 'Desglose del precio',
    base_price: 'Precio base',
    cleaning_fee: 'Limpieza',
    service_fee: 'Servicio',
    taxes: 'Impuestos',
    discount: 'Descuento',
    continue: 'Continuar',
    back: 'Atrás',
    confirm_booking: 'Confirmar reserva',
    guest_details: 'Datos del huésped',
    first_name: 'Nombre',
    last_name: 'Apellidos',
    email: 'Email',
    phone: 'Teléfono',
    special_requests: 'Peticiones especiales',
    terms_agree: 'Acepto los',
    terms_conditions: 'Términos y condiciones',
    booking_confirmed: '¡Reserva confirmada!',
    confirmation_sent: 'Se ha enviado un email de confirmación.',
    booking_reference: 'Referencia',
    not_found: 'Página no encontrada',
    error: 'Algo salió mal',
    loading: 'Cargando',
    payment: 'Pago',
    country: 'País',
    address: 'Dirección',
    city: 'Ciudad',
    postcode: 'Código postal',
    optional: 'opcional',
    description: 'Descripción',
    more_info: 'Más información',
    book_nights: 'Reservar {n} noches',
    promo_code: '¿Tienes un código promocional?',
    no_amenities: 'No hay servicios listados.',
    check_availability: 'Comprobar disponibilidad',
    view_book: 'Ver y Reservar',
    all_locations: 'Todas las ciudades',
    all_properties: 'Todas las propiedades',
    no_rooms: 'No hay habitaciones disponibles',
    checking: 'Comprobando...',
    max_guests_msg: 'Máx {n} huéspedes'
  },
  de: {
    gallery: 'Galerie',
    amenities: 'Ausstattung',
    reviews: 'Bewertungen',
    location: 'Lage',
    book: 'Buchen',
    check_in: 'Check-in',
    check_out: 'Check-out',
    guests: 'Gäste',
    guest: 'Gast',
    guests_plural: 'Gäste',
    per_night: 'pro Nacht',
    nights: 'Nächte',
    night: 'Nacht',
    total: 'Gesamt',
    book_now: 'Jetzt buchen',
    request_booking: 'Buchungsanfrage',
    select_dates: 'Datum wählen',
    available: 'Verfügbar',
    unavailable: 'Nicht verfügbar',
    min_stay: 'Min. Aufenthalt',
    price_from: 'Ab',
    bedrooms: 'Schlafzimmer',
    bathrooms: 'Badezimmer',
    sleeps: 'Schläft',
    house_rules: 'Hausordnung',
    policies: 'Richtlinien',
    cancellation: 'Stornierungsbedingungen',
    pets_allowed: 'Haustiere erlaubt',
    no_pets: 'Keine Haustiere',
    smoking_allowed: 'Rauchen erlaubt',
    no_smoking: 'Nichtraucher',
    children_welcome: 'Kinder willkommen',
    view_all_photos: 'Alle Fotos',
    contact_host: 'Gastgeber kontaktieren',
    share: 'Teilen',
    save: 'Speichern',
    scan_to_book: 'Scannen zum Buchen',
    powered_by: 'Powered by',
    select_language: 'Sprache',
    booking_details: 'Buchungsdetails',
    your_stay: 'Ihr Aufenthalt',
    price_breakdown: 'Preisdetails',
    base_price: 'Grundpreis',
    cleaning_fee: 'Reinigung',
    service_fee: 'Service',
    taxes: 'Steuern',
    discount: 'Rabatt',
    continue: 'Weiter',
    back: 'Zurück',
    confirm_booking: 'Buchung bestätigen',
    guest_details: 'Gästeinformationen',
    first_name: 'Vorname',
    last_name: 'Nachname',
    email: 'E-Mail',
    phone: 'Telefon',
    special_requests: 'Besondere Wünsche',
    terms_agree: 'Ich akzeptiere die',
    terms_conditions: 'AGB',
    booking_confirmed: 'Buchung bestätigt!',
    confirmation_sent: 'Bestätigungs-E-Mail wurde gesendet.',
    booking_reference: 'Buchungsnummer',
    not_found: 'Seite nicht gefunden',
    error: 'Etwas ist schief gelaufen',
    loading: 'Laden',
    payment: 'Zahlung',
    country: 'Land',
    address: 'Adresse',
    city: 'Stadt',
    postcode: 'Postleitzahl',
    optional: 'optional',
    description: 'Beschreibung',
    more_info: 'Mehr Informationen',
    book_nights: '{n} Nächte buchen',
    promo_code: 'Haben Sie einen Promo-Code?',
    no_amenities: 'Keine Ausstattung aufgeführt.',
    check_availability: 'Verfügbarkeit prüfen',
    view_book: 'Ansehen & Buchen',
    all_locations: 'Alle Orte',
    all_properties: 'Alle Unterkünfte',
    no_rooms: 'Keine Zimmer verfügbar',
    checking: 'Wird geprüft...',
    max_guests_msg: 'Max {n} Gäste'
  },
  nl: {
    gallery: 'Galerij',
    amenities: 'Voorzieningen',
    reviews: 'Beoordelingen',
    location: 'Locatie',
    book: 'Boek',
    check_in: 'Inchecken',
    check_out: 'Uitchecken',
    guests: 'Gasten',
    guest: 'gast',
    guests_plural: 'gasten',
    per_night: 'per nacht',
    nights: 'nachten',
    night: 'nacht',
    total: 'Totaal',
    book_now: 'Boek nu',
    request_booking: 'Boeking aanvragen',
    select_dates: 'Selecteer data',
    available: 'Beschikbaar',
    unavailable: 'Niet beschikbaar',
    min_stay: 'Min. verblijf',
    price_from: 'Vanaf',
    bedrooms: 'Slaapkamers',
    bathrooms: 'Badkamers',
    sleeps: 'Slaapt',
    house_rules: 'Huisregels',
    policies: 'Voorwaarden',
    cancellation: 'Annuleringsvoorwaarden',
    pets_allowed: 'Huisdieren toegestaan',
    no_pets: 'Geen huisdieren',
    smoking_allowed: 'Roken toegestaan',
    no_smoking: 'Niet roken',
    children_welcome: 'Kinderen welkom',
    view_all_photos: 'Alle foto\'s',
    contact_host: 'Contact gastheer',
    share: 'Delen',
    save: 'Opslaan',
    scan_to_book: 'Scan om te boeken',
    powered_by: 'Powered by',
    select_language: 'Taal',
    booking_details: 'Boekingsgegevens',
    your_stay: 'Uw verblijf',
    price_breakdown: 'Prijsspecificatie',
    base_price: 'Basisprijs',
    cleaning_fee: 'Schoonmaak',
    service_fee: 'Service',
    taxes: 'Belastingen',
    discount: 'Korting',
    continue: 'Doorgaan',
    back: 'Terug',
    confirm_booking: 'Boeking bevestigen',
    guest_details: 'Gastgegevens',
    first_name: 'Voornaam',
    last_name: 'Achternaam',
    email: 'E-mail',
    phone: 'Telefoon',
    special_requests: 'Speciale verzoeken',
    terms_agree: 'Ik ga akkoord met de',
    terms_conditions: 'Algemene voorwaarden',
    booking_confirmed: 'Boeking bevestigd!',
    confirmation_sent: 'Bevestigingsmail is verzonden.',
    booking_reference: 'Referentie',
    not_found: 'Pagina niet gevonden',
    error: 'Er ging iets mis',
    loading: 'Laden',
    payment: 'Betaling',
    country: 'Land',
    address: 'Adres',
    city: 'Stad',
    postcode: 'Postcode',
    optional: 'optioneel',
    description: 'Beschrijving',
    more_info: 'Meer informatie',
    book_nights: '{n} nachten boeken',
    promo_code: 'Heb je een promotiecode?',
    no_amenities: 'Geen voorzieningen vermeld.',
    check_availability: 'Beschikbaarheid controleren',
    view_book: 'Bekijk & Boek',
    all_locations: 'Alle locaties',
    all_properties: 'Alle accommodaties',
    no_rooms: 'Geen kamers beschikbaar',
    checking: 'Controleren...',
    max_guests_msg: 'Max {n} gasten'
  }
};

// Get translation for a key
function t(key, lang = 'en') {
  const translations = LITE_TRANSLATIONS[lang] || LITE_TRANSLATIONS.en;
  return translations[key] || LITE_TRANSLATIONS.en[key] || key;
}

// Available languages for the switcher
const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' }
];

async function ensureLitesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gas_lites (
      id SERIAL PRIMARY KEY,
      property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
      room_id INTEGER REFERENCES bookable_units(id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES accounts(id),
      slug VARCHAR(100) UNIQUE NOT NULL,
      custom_title VARCHAR(255),
      custom_tagline VARCHAR(500),
      theme VARCHAR(50) DEFAULT 'default',
      accent_color VARCHAR(7) DEFAULT '#3b82f6',
      show_pricing BOOLEAN DEFAULT true,
      show_availability BOOLEAN DEFAULT true,
      show_reviews BOOLEAN DEFAULT true,
      show_qr BOOLEAN DEFAULT true,
      active BOOLEAN DEFAULT true,
      views INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE gas_lites ADD COLUMN IF NOT EXISTS room_id INTEGER REFERENCES bookable_units(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE gas_lites ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 1`);
  console.log('✅ gas_lites table ready');
}

// ============================================
// ROOT - Handle #code URLs
// ============================================
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>GAS Lite</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #1e293b, #0f172a); color: white; }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 3rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; }
    .code { font-size: 2rem; color: #667eea; font-weight: bold; }
  </style>
  <script>
    // Check for #code in URL
    if (window.location.hash && window.location.hash.length > 1) {
      const code = window.location.hash.substring(1); // Remove #
      window.location.href = '/' + code;
    }
  </script>
</head>
<body>
  <div class="container">
    <h1>⭐ GAS Lite</h1>
    <p>Enter a code like <span class="code">#390580</span></p>
    <p style="margin-top: 2rem;"><a href="https://gas.travel" style="color: #667eea;">Create your own GAS Lite →</a></p>
  </div>
</body>
</html>`);
});

// ============================================
// EMBED SCRIPT - /embed.js
// ============================================
app.get('/embed.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`(function(){
  var script = document.currentScript || (function(){
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('/embed.js') !== -1) return scripts[i];
    }
  })();
  if (!script) return;

  var account = script.getAttribute('data-account');
  if (!account) { console.error('GAS Lites embed: missing data-account attribute'); return; }

  var origin = script.src.replace(/\\/embed\\.js.*$/, '');
  var src = origin + '/book/' + encodeURIComponent(account) + '?embed=1';

  // Pass through optional params
  var checkin = script.getAttribute('data-checkin');
  var checkout = script.getAttribute('data-checkout');
  var guests = script.getAttribute('data-guests');
  if (checkin) src += '&checkin=' + encodeURIComponent(checkin);
  if (checkout) src += '&checkout=' + encodeURIComponent(checkout);
  if (guests) src += '&guests=' + encodeURIComponent(guests);

  // Create container
  var container = document.createElement('div');
  container.id = 'gas-booking-embed';
  container.style.cssText = 'width:100%;overflow:hidden;';

  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.style.cssText = 'width:100%;border:none;display:block;min-height:600px;';
  iframe.setAttribute('scrolling', 'no');
  iframe.setAttribute('title', 'Book Your Stay');
  iframe.setAttribute('loading', 'lazy');
  iframe.allow = 'payment';

  container.appendChild(iframe);
  script.parentNode.insertBefore(container, script.nextSibling);

  // Listen for height messages from the iframe
  window.addEventListener('message', function(e) {
    if (e.source !== iframe.contentWindow) return;
    var data = e.data;
    if (data && data.type === 'gas-embed-resize' && typeof data.height === 'number') {
      iframe.style.height = data.height + 'px';
    }
  });
})();`);
});

// ============================================
// ACCOUNT BOOKING PAGE - /book/:accountSlug
// ============================================
app.get('/book/:accountSlug', async (req, res) => {
  try {
    const { accountSlug } = req.params;
    const isEmbed = req.query.embed === '1';
    const isCompact = req.query.compact === '1';
    const colorOverride = req.query.color || '';

    // Allow embedding on any domain
    if (isEmbed) {
      res.removeHeader('X-Frame-Options');
      res.setHeader('Content-Security-Policy', "frame-ancestors *");
    }

    // Look up account by account_code first, then try numeric ID
    let accountResult;
    accountResult = await pool.query(
      `SELECT id, name, business_name, logo_url, primary_color, account_code, settings
       FROM accounts WHERE account_code = $1`, [accountSlug]
    );
    if (accountResult.rows.length === 0 && /^\d+$/.test(accountSlug)) {
      accountResult = await pool.query(
        `SELECT id, name, business_name, logo_url, primary_color, account_code, settings
         FROM accounts WHERE id = $1`, [parseInt(accountSlug)]
      );
    }
    if (accountResult.rows.length === 0) {
      return res.status(404).send(renderError('Account not found'));
    }
    const account = accountResult.rows[0];

    // Language detection: query param > browser Accept-Language > primary language
    const accountSettings = account.settings || {};
    const supportedLangs = accountSettings.supported_languages || ['en'];
    const primaryLang = accountSettings.primary_language || 'en';
    let lang = primaryLang;
    if (req.query.lang && supportedLangs.includes(req.query.lang.toLowerCase().substring(0, 2))) {
      lang = req.query.lang.toLowerCase().substring(0, 2);
    } else if (!req.query.lang) {
      const acceptLang = req.headers['accept-language'] || '';
      const browserLang = acceptLang.split(',')[0]?.split('-')[0]?.toLowerCase();
      if (browserLang && supportedLangs.includes(browserLang)) {
        lang = browserLang;
      }
    }

    // Fetch all active rooms for this account with property info, images, lite slugs, and today's price
    const roomsResult = await pool.query(`
      SELECT bu.id as room_id, bu.name as room_name, bu.display_name,
             bu.short_description, bu.max_guests, bu.room_type,
             bu.num_bedrooms, bu.num_bathrooms,
             p.id as property_id, p.name as property_name, p.city, p.country, p.currency,
             p.latitude, p.longitude,
             l.slug as lite_slug,
             (SELECT image_url FROM room_images WHERE room_id = bu.id ORDER BY is_primary DESC NULLS LAST, display_order ASC NULLS LAST LIMIT 1) as room_image,
             (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC NULLS LAST, display_order ASC NULLS LAST LIMIT 1) as property_image,
             (SELECT price FROM room_availability WHERE room_id = bu.id AND date = CURRENT_DATE AND is_available = true AND price > 0 LIMIT 1) as today_price
      FROM bookable_units bu
      JOIN properties p ON bu.property_id = p.id
      LEFT JOIN gas_lites l ON l.room_id = bu.id AND l.active = true
      WHERE p.account_id = $1 AND bu.status IN ('active', 'available')
        AND COALESCE(l.sort_order, 1) > 0
      ORDER BY
        COALESCE(l.sort_order, 999) ASC,
        p.name, bu.name
    `, [account.id]);

    if (colorOverride) account.primary_color = colorOverride;
    const litesStyle = accountSettings.lites_style || {};
    res.send(renderBookingPage({ account, rooms: roomsResult.rows, embed: isEmbed, compact: isCompact, lang, supportedLangs, litesStyle }));
  } catch (error) {
    console.error('Account booking page error:', error);
    res.status(500).send(renderError('Something went wrong'));
  }
});

// ============================================
// MAIN ROOM PAGE - /:slug
// ============================================
app.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const offerCode = req.query.offer;
    const isEmbed = req.query.embed === '1';

    // Allow embedding on any domain
    if (isEmbed) {
      res.removeHeader('X-Frame-Options');
      res.setHeader('Content-Security-Policy', "frame-ancestors *");
    }

    // Get lite config with all related data
    const liteResult = await pool.query(`
      SELECT l.*, 
             p.id as property_id, p.name as property_name, p.short_description as property_short_desc,
             p.full_description as property_full_desc, p.description as property_desc,
             p.address, p.city, p.state, p.country, p.postal_code,
             p.latitude, p.longitude, p.currency,
             p.check_in_time, p.check_out_time,
             p.contact_email, p.contact_phone, p.website_url,
             p.house_rules, p.cancellation_policy,
             p.pets_allowed, p.smoking_allowed, p.children_allowed,
             bu.id as room_id, bu.name as room_name,
             bu.display_name as display_name_raw,
             bu.short_description as room_short_desc, bu.full_description as room_full_desc,
             bu.num_bedrooms as bedroom_count, bu.num_bathrooms as bathroom_count, bu.max_guests, bu.base_price,
             bu.unit_type as room_type,
             COALESCE(a.id, pa.id) as account_id,
             COALESCE(a.business_name, a.name, pa.business_name, pa.name) as business_name,
             COALESCE(a.plan, pa.plan) as plan,
             COALESCE(a.settings, pa.settings) as account_settings,
             COALESCE(a.business_name, a.name, pa.business_name, pa.name) as account_display_name
      FROM gas_lites l
      JOIN properties p ON l.property_id = p.id
      LEFT JOIN bookable_units bu ON l.room_id = bu.id
      LEFT JOIN accounts a ON l.account_id = a.id
      LEFT JOIN accounts pa ON p.account_id = pa.id
      WHERE l.slug = $1 AND l.active = true
    `, [slug.toLowerCase()]);
    
    if (liteResult.rows.length === 0) {
      return res.status(404).send(renderNotFound(slug));
    }
    
    const lite = liteResult.rows[0];
    
    // Get account's supported languages
    const accountSettings = typeof lite.account_settings === 'string' 
      ? JSON.parse(lite.account_settings) 
      : (lite.account_settings || {});
    const supportedLangs = accountSettings.languages?.supported || ['en', 'es', 'fr', 'de', 'nl'];
    const primaryLang = accountSettings.languages?.primary || 'en';
    
    // Language priority: 1) query param, 2) Accept-Language header, 3) primary language
    let lang = primaryLang;
    if (req.query.lang) {
      lang = req.query.lang.toLowerCase().substring(0, 2);
    } else {
      // Try to detect from Accept-Language header
      const acceptLang = req.headers['accept-language'] || '';
      const browserLang = acceptLang.split(',')[0]?.split('-')[0]?.toLowerCase();
      // If browser lang is supported, use it; otherwise use primary
      if (supportedLangs.includes(browserLang)) {
        lang = browserLang;
      }
    }
    
    // Debug account info
    console.log('Lite account info:', {
      slug: lite.slug,
      account_id: lite.account_id,
      account_display_name: lite.account_display_name,
      supportedLangs,
      requestedLang: lang
    });
    
    // Parse display_name from JSON
    lite.display_name = parseJsonTextField(lite.display_name_raw, lang);
    
    const propertyId = lite.property_id;
    const roomId = lite.room_id;
    const accountId = lite.account_id;
    
    // Increment view counter
    await pool.query('UPDATE gas_lites SET views = views + 1 WHERE id = $1', [lite.id]);
    
    // Check if reviews module is enabled (check plan or settings)
    let showReviews = false;
    if (lite.plan === 'enterprise' || lite.plan === 'business') {
      showReviews = true;
    }
    if (lite.account_settings?.reviews_widget || lite.account_settings?.reviews_enabled) {
      showReviews = true;
    }
    
    // Get images (room first, then property)
    let images = [];
    if (roomId) {
      const roomImgRes = await pool.query(`
        SELECT image_url as url, caption, is_primary FROM room_images
        WHERE room_id = $1
        ORDER BY is_primary DESC NULLS LAST, display_order ASC NULLS LAST, id ASC LIMIT 20
      `, [roomId]);
      images = roomImgRes.rows;
    }
    if (images.length === 0) {
      const propImgRes = await pool.query(`
        SELECT image_url as url, caption, is_primary FROM property_images
        WHERE property_id = $1
        ORDER BY is_primary DESC NULLS LAST, display_order ASC NULLS LAST, id ASC LIMIT 20
      `, [propertyId]);
      images = propImgRes.rows;
    }
    
    // Get amenities for the room
    let amenities = [];
    if (roomId) {
      const amenRes = await pool.query(`
        SELECT ma.amenity_name, ma.icon, ma.category
        FROM room_amenity_selections ras
        JOIN master_amenities ma ON ma.id = ras.amenity_id
        WHERE ras.room_id = $1
        ORDER BY ma.category, ma.amenity_name
      `, [roomId]);
      amenities = amenRes.rows;
    }
    
    // Get reviews only if module is enabled
    let reviews = [];
    if (showReviews) {
      const reviewsRes = await pool.query(`
        SELECT * FROM reviews
        WHERE property_id = $1 AND is_approved = true
        ORDER BY review_date DESC LIMIT 10
      `, [propertyId]);
      reviews = reviewsRes.rows;
    }
    
    // Get availability for next 60 days
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 60);
    
    let availability = [];
    let todayPrice = null;
    if (roomId) {
      const availRes = await pool.query(`
        SELECT ra.date, ra.is_available, ra.is_blocked,
               COALESCE(ra.direct_price, ra.cm_price, ra.standard_price) * COALESCE(p.booking_page_multiplier, 1) as price,
               ra.min_stay
        FROM room_availability ra
        JOIN bookable_units bu ON bu.id = ra.room_id
        JOIN properties p ON p.id = bu.property_id
        WHERE ra.room_id = $1 AND ra.date >= $2 AND ra.date <= $3
        ORDER BY ra.date
      `, [roomId, today.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]);
      availability = availRes.rows;
      
      // Get today's price
      const todayAvail = availability.find(a => a.date.toISOString().split('T')[0] === today.toISOString().split('T')[0]);
      todayPrice = todayAvail?.price || null;
    }
    
    const liteUrl = `https://lite.gas.travel/#${slug}`;
    const qrCode = await QRCode.toDataURL(liteUrl, { width: 150, margin: 1 });
    
    // Get property_terms for multilingual house rules and cancellation policy
    try {
      const termsRes = await pool.query(
        'SELECT additional_rules, additional_rules_ml, cancellation_policy, cancellation_policy_ml FROM property_terms WHERE property_id = $1',
        [propertyId]
      );
      if (termsRes.rows[0]) {
        const pt = termsRes.rows[0];
        // Apply multilingual house rules
        if (pt.additional_rules_ml && typeof pt.additional_rules_ml === 'object') {
          lite.house_rules = pt.additional_rules_ml[lang] || pt.additional_rules_ml.en || pt.additional_rules || lite.house_rules;
        } else if (pt.additional_rules) {
          lite.house_rules = pt.additional_rules;
        }
        // Apply multilingual cancellation policy
        if (pt.cancellation_policy_ml && typeof pt.cancellation_policy_ml === 'object') {
          lite.cancellation_policy = pt.cancellation_policy_ml[lang] || pt.cancellation_policy_ml.en || pt.cancellation_policy || lite.cancellation_policy;
        } else if (pt.cancellation_policy) {
          lite.cancellation_policy = pt.cancellation_policy;
        }
      }
    } catch (e) {
      console.log('Property terms not found, using property defaults');
    }
    
    // Check for active offer/campaign
    let activeOffer = null;
    if (offerCode) {
      // First check regular offers table (try offer_code column)
      try {
        const offerRes = await pool.query(`
          SELECT * FROM offers WHERE offer_code = $1 AND active = true
          AND (valid_from IS NULL OR valid_from <= NOW())
          AND (valid_until IS NULL OR valid_until >= NOW())
        `, [offerCode.toUpperCase()]);
        activeOffer = offerRes.rows[0];
      } catch (e) {
        // Column might not exist, continue to campaigns
      }
      
      // If not found, check turbine_campaigns (Turbines campaign offers)
      if (!activeOffer) {
        const campaignRes = await pool.query(`
          SELECT id, name, discount_type, discount_value, custom_price, 
                 start_date as valid_from, end_date as valid_until,
                 min_nights, property_id, room_id, offer_code
          FROM turbine_campaigns 
          WHERE offer_code = $1 
            AND status != 'archived'
            AND (start_date IS NULL OR start_date <= CURRENT_DATE)
            AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        `, [offerCode.toUpperCase()]);
        if (campaignRes.rows[0]) {
          activeOffer = campaignRes.rows[0];
          activeOffer.is_campaign = true;
        }
      }
    }
    
    const litesStyle = accountSettings.lites_style || {};
    res.send(renderFullPage({
      lite, images, amenities, reviews, availability,
      todayPrice, qrCode, liteUrl, showReviews,
      roomId, propertyId, accountId, activeOffer, lang, supportedLangs,
      embed: isEmbed, litesStyle
    }));
  } catch (error) {
    console.error('Lite page error:', error);
    res.status(500).send(renderError(error.message));
  }
});

// ============================================
// PROMO CARD - /:slug/card
// ============================================
app.get('/:slug/card', async (req, res) => {
  try {
    const { slug } = req.params;
    const offer = req.query.offer;
    
    const liteResult = await pool.query(`
      SELECT l.*, p.name, p.city, p.country, p.currency, p.short_description,
             p.average_rating, p.pets_allowed, p.children_allowed,
             bu.name as room_name, bu.display_name as display_name_raw,
             bu.num_bedrooms as bedroom_count, bu.num_bathrooms as bathroom_count, bu.max_guests, bu.base_price,
             COALESCE(a.business_name, a.name, pa.business_name, pa.name) as account_display_name,
             COALESCE(a.settings, pa.settings) as account_settings
      FROM gas_lites l
      JOIN properties p ON l.property_id = p.id
      LEFT JOIN bookable_units bu ON l.room_id = bu.id
      LEFT JOIN accounts a ON l.account_id = a.id
      LEFT JOIN accounts pa ON p.account_id = pa.id
      WHERE l.slug = $1 AND l.active = true
    `, [slug.toLowerCase()]);
    
    if (liteResult.rows.length === 0) {
      return res.status(404).send(renderNotFound(slug));
    }
    
    const lite = liteResult.rows[0];
    
    // Get account's supported languages
    const accountSettings = typeof lite.account_settings === 'string' 
      ? JSON.parse(lite.account_settings) 
      : (lite.account_settings || {});
    const supportedLangs = accountSettings.languages?.supported || ['en'];
    const primaryLang = accountSettings.languages?.primary || 'en';
    
    // Language priority: 1) query param, 2) Accept-Language header, 3) primary language
    let lang = primaryLang;
    if (req.query.lang) {
      lang = req.query.lang.toLowerCase().substring(0, 2);
    } else {
      const acceptLang = req.headers['accept-language'] || '';
      const browserLang = acceptLang.split(',')[0]?.split('-')[0]?.toLowerCase();
      if (supportedLangs.includes(browserLang)) {
        lang = browserLang;
      }
    }
    
    // Parse display_name from JSON
    lite.display_name = parseJsonTextField(lite.display_name_raw);
    
    // Get image (room first, then property)
    let image = null;
    if (lite.room_id) {
      const roomImgRes = await pool.query(`
        SELECT image_url as url FROM room_images
        WHERE room_id = $1
        ORDER BY is_primary DESC NULLS LAST, id ASC LIMIT 1
      `, [lite.room_id]);
      image = roomImgRes.rows[0]?.url;
    }
    if (!image) {
      const propImgRes = await pool.query(`
        SELECT image_url as url FROM property_images
        WHERE property_id = $1
        ORDER BY is_primary DESC NULLS LAST, id ASC LIMIT 1
      `, [lite.property_id]);
      image = propImgRes.rows[0]?.url;
    }
    
    // Get today's price
    const today = new Date().toISOString().split('T')[0];
    let price = null;
    if (lite.room_id) {
      const priceRes = await pool.query(`
        SELECT COALESCE(ra.direct_price, ra.cm_price, ra.standard_price) * COALESCE(p.booking_page_multiplier, 1) as price
        FROM room_availability ra
        JOIN bookable_units bu ON bu.id = ra.room_id
        JOIN properties p ON p.id = bu.property_id
        WHERE ra.room_id = $1 AND ra.date = $2
      `, [lite.room_id, today]);
      if (priceRes.rows[0]?.price) price = priceRes.rows[0].price;
    }
    
    let activeOffer = null;
    if (offer) {
      // First check regular offers table (try offer_code column)
      try {
        const offerRes = await pool.query(`
          SELECT * FROM offers WHERE offer_code = $1 AND active = true
          AND (valid_from IS NULL OR valid_from <= NOW())
          AND (valid_until IS NULL OR valid_until >= NOW())
        `, [offer.toUpperCase()]);
        activeOffer = offerRes.rows[0];
      } catch (e) {
        // Column might not exist, continue to campaigns
      }
      
      // If not found, check turbine_campaigns (Turbines campaign offers)
      if (!activeOffer) {
        const campaignRes = await pool.query(`
          SELECT id, name, discount_type, discount_value, custom_price, 
                 start_date as valid_from, end_date as valid_until,
                 min_nights, property_id, room_id
          FROM turbine_campaigns 
          WHERE offer_code = $1 
            AND status != 'archived'
            AND (start_date IS NULL OR start_date <= CURRENT_DATE)
            AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        `, [offer.toUpperCase()]);
        if (campaignRes.rows[0]) {
          activeOffer = campaignRes.rows[0];
          activeOffer.is_campaign = true;
        }
      }
    }
    
    // Check if there are ANY active offers for this property/account (for the star badge)
    const accRes = await pool.query('SELECT account_id FROM properties WHERE id = $1', [lite.property_id]);
    const accId = accRes.rows[0]?.account_id;
    let hasOffers = false;
    if (accId) {
      const offersCheck = await pool.query(`
        SELECT 1 FROM offers o
        LEFT JOIN properties p ON o.property_id = p.id
        WHERE o.active = true
          AND (o.available_website = true OR o.available_website IS NULL)
          AND (o.account_id = $1 OR p.account_id = $1 OR o.property_id = $2)
          AND (o.valid_from IS NULL OR o.valid_from <= CURRENT_DATE)
          AND (o.valid_until IS NULL OR o.valid_until >= CURRENT_DATE)
        LIMIT 1
      `, [accId, lite.property_id]);
      hasOffers = offersCheck.rows.length > 0;
    }
    
    const liteUrl = `https://lite.gas.travel/#${slug}`;
    const qrCode = await QRCode.toDataURL(liteUrl, { width: 200, margin: 1 });
    
    res.send(renderPromoCard({ lite, image, price, offer: activeOffer, qrCode, liteUrl, hasOffers, lang, supportedLangs }));
  } catch (error) {
    console.error('Card error:', error);
    res.status(500).send(renderError());
  }
});

// QR Code endpoint
app.get('/:slug/qr', async (req, res) => {
  try {
    const size = parseInt(req.query.size) || 300;
    const qrBuffer = await QRCode.toBuffer(`https://lite.gas.travel/#${req.params.slug}`, { width: size, margin: 2 });
    res.set('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (error) {
    res.status(500).send('QR generation failed');
  }
});

// Print Card
app.get('/:slug/print', async (req, res) => {
  try {
    const { slug } = req.params;
    const liteResult = await pool.query(`
      SELECT l.*, p.name, p.city, p.country, p.contact_phone, p.contact_email,
             bu.name as room_name, bu.display_name as display_name_raw
      FROM gas_lites l 
      JOIN properties p ON l.property_id = p.id
      LEFT JOIN bookable_units bu ON l.room_id = bu.id
      WHERE l.slug = $1 AND l.active = true
    `, [slug.toLowerCase()]);
    
    if (liteResult.rows.length === 0) return res.status(404).send('Not found');
    
    const lite = liteResult.rows[0];
    
    // Parse display_name from JSON
    lite.display_name = parseJsonTextField(lite.display_name_raw);
    
    const liteUrl = `https://lite.gas.travel/#${slug}`;
    const qrCode = await QRCode.toDataURL(liteUrl, { width: 400, margin: 2 });
    
    let image = null;
    if (lite.room_id) {
      const imgRes = await pool.query(`
        SELECT image_url as url FROM room_images
        WHERE room_id = $1 ORDER BY is_primary DESC NULLS LAST LIMIT 1
      `, [lite.room_id]);
      image = imgRes.rows[0]?.url;
    }
    if (!image) {
      const imgRes = await pool.query(`
        SELECT image_url as url FROM property_images
        WHERE property_id = $1 ORDER BY is_primary DESC NULLS LAST LIMIT 1
      `, [lite.property_id]);
      image = imgRes.rows[0]?.url;
    }
    
    res.send(renderPrintCard({ lite, qrCode, liteUrl, image }));
  } catch (error) {
    res.status(500).send('Error');
  }
});

// ============================================
// API ENDPOINTS
// ============================================
app.get('/api/check-slug/:slug', async (req, res) => {
  const result = await pool.query('SELECT id FROM gas_lites WHERE slug = $1', [req.params.slug.toLowerCase()]);
  res.json({ available: result.rows.length === 0 });
});

// DEBUG: View raw lite data - visit /api/debug/SLUG
app.get('/api/debug/:slug', async (req, res) => {
  try {
    const liteResult = await pool.query(`
      SELECT l.*, 
             p.short_description as property_short_desc,
             p.full_description as property_full_desc, 
             p.description as property_desc,
             bu.short_description as room_short_desc, 
             bu.full_description as room_full_desc
      FROM gas_lites l
      JOIN properties p ON l.property_id = p.id
      LEFT JOIN bookable_units bu ON l.room_id = bu.id
      WHERE l.slug = $1
    `, [req.params.slug.toLowerCase()]);
    
    if (liteResult.rows.length === 0) {
      return res.json({ error: 'Not found' });
    }
    
    const lite = liteResult.rows[0];
    res.json({
      slug: lite.slug,
      property_short_desc: lite.property_short_desc,
      property_full_desc: lite.property_full_desc,
      property_desc: lite.property_desc,
      room_short_desc: lite.room_short_desc,
      room_full_desc: lite.room_full_desc,
      parsed_short: parseDescription(lite.room_short_desc || lite.property_short_desc),
      parsed_full: parseDescription(lite.room_full_desc || lite.property_full_desc || lite.property_desc)
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// ONE-TIME MIGRATION: Convert all slugs to random 6-digit numbers
// Visit https://lite.gas.travel/api/migrate-to-numbers once, then remove this endpoint
app.get('/api/migrate-to-numbers', async (req, res) => {
  try {
    const lites = await pool.query('SELECT id, slug FROM gas_lites');
    const updated = [];
    
    for (const lite of lites.rows) {
      // Skip if already a 6-digit number
      if (/^[0-9]{6}$/.test(lite.slug)) {
        continue;
      }
      
      // Generate unique random 6-digit slug
      let newSlug;
      let attempts = 0;
      while (attempts < 20) {
        newSlug = String(Math.floor(100000 + Math.random() * 900000));
        const exists = await pool.query('SELECT id FROM gas_lites WHERE slug = $1', [newSlug]);
        if (exists.rows.length === 0) break;
        attempts++;
      }
      
      await pool.query('UPDATE gas_lites SET slug = $1 WHERE id = $2', [newSlug, lite.id]);
      updated.push({ old: lite.slug, new: newSlug });
    }
    
    res.json({ 
      success: true, 
      message: `Migrated ${updated.length} lites to random numbers`,
      updated 
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/property/:propertyId', async (req, res) => {
  const result = await pool.query('SELECT * FROM gas_lites WHERE property_id = $1', [req.params.propertyId]);
  res.json({ success: true, lites: result.rows });
});

// Get lite by room_id
app.get('/api/room/:roomId', async (req, res) => {
  const result = await pool.query('SELECT * FROM gas_lites WHERE room_id = $1', [req.params.roomId]);
  res.json({ success: true, lite: result.rows[0] || null });
});

// Get or create lite for a room (used by preview button)
app.post('/api/room/:roomId/lite', async (req, res) => {
  try {
    const roomId = req.params.roomId;
    
    // Check if lite exists
    const existing = await pool.query('SELECT * FROM gas_lites WHERE room_id = $1', [roomId]);
    if (existing.rows.length > 0) {
      return res.json({ success: true, lite: existing.rows[0], created: false });
    }
    
    // Get room and property info
    const roomResult = await pool.query(`
      SELECT bu.*, p.id as property_id, p.name as property_name, a.id as account_id
      FROM bookable_units bu
      JOIN properties p ON bu.property_id = p.id
      LEFT JOIN accounts a ON p.account_id = a.id
      WHERE bu.id = $1
    `, [roomId]);
    
    if (roomResult.rows.length === 0) {
      return res.json({ success: false, error: 'Room not found' });
    }
    
    const room = roomResult.rows[0];
    
    // Generate random 6-digit slug (like Facebook's approach)
    let slug;
    let attempts = 0;
    while (attempts < 10) {
      const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digits
      slug = String(randomNum);
      const slugCheck = await pool.query('SELECT id FROM gas_lites WHERE slug = $1', [slug]);
      if (slugCheck.rows.length === 0) break;
      attempts++;
    }
    
    if (attempts >= 10) {
      // Fallback to timestamp-based if random keeps colliding
      slug = Date.now().toString(36);
    }
    
    // Create the lite - don't set custom_title, let display_name be used from the room
    const result = await pool.query(`
      INSERT INTO gas_lites (property_id, room_id, account_id, slug)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [room.property_id, roomId, room.account_id, slug]);
    
    res.json({ success: true, lite: result.rows[0], created: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/account/:accountId', async (req, res) => {
  const result = await pool.query(`
    SELECT l.*, p.name as property_name, p.city, bu.name as room_name,
           bu.display_name as display_name_raw
    FROM gas_lites l
    JOIN properties p ON l.property_id = p.id
    LEFT JOIN bookable_units bu ON l.room_id = bu.id
    WHERE l.account_id = $1
  `, [req.params.accountId]);
  
  // Parse display_name for each lite
  const lites = result.rows.map(lite => {
    lite.display_name = parseJsonTextField(lite.display_name_raw);
    return lite;
  });
  
  res.json({ success: true, lites });
});

app.post('/api/lites', async (req, res) => {
  try {
    const { property_id, room_id, account_id, slug, custom_title, custom_tagline, theme, accent_color, sort_order } = req.body;
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const existing = await pool.query('SELECT id FROM gas_lites WHERE slug = $1', [cleanSlug]);
    if (existing.rows.length > 0) return res.json({ success: false, error: 'Slug taken' });
    const result = await pool.query(`
      INSERT INTO gas_lites (property_id, room_id, account_id, slug, custom_title, custom_tagline, theme, accent_color, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [property_id, room_id, account_id, cleanSlug, custom_title, custom_tagline, theme || 'default', accent_color || '#3b82f6', sort_order ?? 1]);
    res.json({ success: true, lite: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.put('/api/lites/:id', async (req, res) => {
  try {
    const { slug, custom_title, custom_tagline, theme, accent_color, active, sort_order } = req.body;
    const result = await pool.query(`
      UPDATE gas_lites SET slug = COALESCE($1, slug), custom_title = $2, custom_tagline = $3,
      theme = COALESCE($4, theme), accent_color = COALESCE($5, accent_color),
      active = COALESCE($6, active), sort_order = COALESCE($7, sort_order), updated_at = NOW() WHERE id = $8 RETURNING *
    `, [slug?.toLowerCase(), custom_title, custom_tagline, theme, accent_color, active, sort_order, req.params.id]);
    res.json({ success: true, lite: result.rows[0] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.delete('/api/lites/:id', async (req, res) => {
  await pool.query('DELETE FROM gas_lites WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/availability/:roomId', async (req, res) => {
  const { from, to } = req.query;
  const result = await pool.query(`
    SELECT ra.date, ra.is_available, ra.is_blocked,
           COALESCE(ra.direct_price, ra.cm_price, ra.standard_price) * COALESCE(p.booking_page_multiplier, 1) as price, ra.min_stay
    FROM room_availability ra
    JOIN bookable_units bu ON bu.id = ra.room_id
    JOIN properties p ON p.id = bu.property_id
    WHERE ra.room_id = $1 AND ra.date >= $2 AND ra.date < $3 ORDER BY ra.date
  `, [req.params.roomId, from, to]);
  res.json({ success: true, availability: result.rows });
});

// Calculate pricing for date range
app.get('/api/pricing/:roomId', async (req, res) => {
  try {
    const { checkin, checkout, adults, children } = req.query;
    const roomId = req.params.roomId;
    
    // Get room info
    const roomResult = await pool.query(
      'SELECT cleaning_fee, max_guests FROM bookable_units WHERE id = $1',
      [roomId]
    );
    if (roomResult.rows.length === 0) return res.json({ success: false, error: 'Room not found' });
    const room = roomResult.rows[0];

    // Get availability/pricing for each night — calendar data only, no fallback
    const availResult = await pool.query(`
      SELECT ra.date, ra.is_available, ra.is_blocked,
             COALESCE(ra.direct_price, ra.cm_price, ra.standard_price) * COALESCE(p.booking_page_multiplier, 1) as price, ra.min_stay
      FROM room_availability ra
      JOIN bookable_units bu ON bu.id = ra.room_id
      JOIN properties p ON p.id = bu.property_id
      WHERE ra.room_id = $1 AND ra.date >= $2 AND ra.date < $3
      ORDER BY ra.date
    `, [roomId, checkin, checkout]);

    const nights = availResult.rows;
    const numNights = nights.length;

    // If no calendar data exists, cannot price
    if (numNights === 0) {
      return res.json({ success: false, error: 'No pricing data available for selected dates' });
    }

    // Check all nights available
    const unavailable = nights.filter(n => !n.is_available || n.is_blocked);
    if (unavailable.length > 0) {
      return res.json({ success: false, error: 'Some dates are not available', unavailable });
    }

    // Check any nights missing price
    const unpriced = nights.filter(n => n.price === null || n.price === undefined);
    if (unpriced.length > 0) {
      return res.json({ success: false, error: 'Pricing not available for some dates' });
    }

    // Check min stay
    const minStay = nights[0]?.min_stay || 1;
    if (numNights < minStay) {
      return res.json({ success: false, error: `Minimum stay is ${minStay} nights`, minStay, nights: numNights });
    }

    // Calculate totals from calendar pricing only
    const nightlyTotal = nights.reduce((sum, n) => sum + parseFloat(n.price), 0);

    // Check if a cleaning upsell exists for this property — if so, suppress the Beds24 cleaning_fee
    const cleaningUpsellCheck = await pool.query(
      `SELECT id FROM upsells WHERE active = true AND property_id = (SELECT property_id FROM bookable_units WHERE id = $1) AND (LOWER(name) LIKE '%cleaning%' OR category = 'cleaning') LIMIT 1`,
      [roomId]
    );
    const cleaningFee = cleaningUpsellCheck.rows.length > 0 ? 0 : (parseFloat(room.cleaning_fee) || 0);
    const totalGuests = parseInt(adults || 1) + parseInt(children || 0);
    const extraGuestFee = 0;

    console.log('[Pricing] Room', roomId, '- nights:', numNights, ', nightlyTotal:', nightlyTotal);

    res.json({
      success: true,
      pricing: {
        nights: numNights,
        minStay: minStay,
        nightlyRates: nights.map(n => ({ date: n.date, price: parseFloat(n.price) })),
        nightlyTotal,
        cleaningFee,
        extraGuestFee,
        subtotal: nightlyTotal + cleaningFee + extraGuestFee,
        avgPerNight: nightlyTotal / numNights
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get upsells for property/room
app.get('/api/upsells/:roomId', async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const { propertyId, accountId } = req.query;
    
    // Get property_id and account_id if not provided
    let propId = propertyId;
    let accId = accountId;
    if (!propId || !accId) {
      const roomRes = await pool.query(`
        SELECT bu.property_id, p.account_id 
        FROM bookable_units bu 
        JOIN properties p ON bu.property_id = p.id 
        WHERE bu.id = $1
      `, [roomId]);
      if (roomRes.rows[0]) {
        propId = propId || roomRes.rows[0].property_id;
        accId = accId || roomRes.rows[0].account_id;
      }
    }
    
    const result = await pool.query(`
      SELECT u.id, u.name, u.description, u.price, u.charge_type, u.max_quantity,
             u.image_url, u.category, u.property_id, u.room_id, u.room_ids,
             u.mandatory, u.min_nights, u.max_nights
      FROM upsells u
      LEFT JOIN properties p ON u.property_id = p.id
      WHERE u.active = true
        AND (p.account_id = $1 OR u.property_id = $2)
        AND (
          u.room_id IS NULL 
          OR u.room_id = $3
          OR u.room_ids LIKE '%' || $3::text || '%'
        )
      ORDER BY u.category NULLS LAST, u.name
    `, [accId, propId, roomId]);
    
    // Group by category
    const grouped = {};
    result.rows.forEach(upsell => {
      const cat = upsell.category || 'Extras';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(upsell);
    });
    
    res.json({ 
      success: true, 
      upsells: result.rows,
      upsells_by_category: grouped
    });
  } catch (error) {
    console.error('Upsells error:', error);
    res.json({ success: true, upsells: [] });
  }
});

// Get taxes for property/room
app.get('/api/taxes/:roomId', async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const { nights, guests, subtotal } = req.query;
    const numNights = parseInt(nights) || 1;
    const numGuests = parseInt(guests) || 1;
    const subTotal = parseFloat(subtotal) || 0;
    
    // Get property_id from room
    const roomRes = await pool.query(`
      SELECT bu.property_id, p.account_id,
             p.tourist_tax_enabled, p.tourist_tax_type, p.tourist_tax_amount,
             p.tourist_tax_name, p.tourist_tax_max_nights, p.tourist_tax_exempt_children,
             p.tourist_tax_max_amount
      FROM bookable_units bu 
      JOIN properties p ON bu.property_id = p.id 
      WHERE bu.id = $1
    `, [roomId]);
    
    if (roomRes.rows.length === 0) {
      return res.json({ success: true, taxes: [], taxTotal: 0 });
    }
    
    const property = roomRes.rows[0];
    const taxBreakdown = [];
    let taxTotal = 0;
    let foundTaxesInTable = false;
    
    // Get taxes from taxes table (preferred source)
    // Only get taxes specifically assigned to this property
    try {
      const taxes = await pool.query(`
        SELECT * FROM taxes 
        WHERE active = true
          AND property_id = $1
          AND (room_id IS NULL OR room_id = $2)
      `, [property.property_id, roomId]);
      
      if (taxes.rows.length > 0) {
        foundTaxesInTable = true;
        
        taxes.rows.forEach(tax => {
          let taxAmount = 0;
          const taxType = tax.amount_type || tax.charge_per || 'fixed';
          const taxRate = parseFloat(tax.amount) || 0;
          const maxAmountCap = tax.max_amount ? parseFloat(tax.max_amount) : null;
          const taxableNights = tax.max_nights ? Math.min(numNights, tax.max_nights) : numNights;

          if (taxType === 'percentage') {
            const perNightRate = (subTotal / numNights) * (taxRate / 100);
            const cappedRate = maxAmountCap ? Math.min(perNightRate, maxAmountCap) : perNightRate;
            taxAmount = cappedRate * taxableNights * numGuests;
          } else if (taxType === 'per_night') {
            taxAmount = taxRate * taxableNights;
          } else if (taxType === 'per_person_per_night' || taxType === 'per_guest_per_night') {
            const cappedRate = maxAmountCap ? Math.min(taxRate, maxAmountCap) : taxRate;
            taxAmount = cappedRate * taxableNights * numGuests;
          } else if (taxType === 'per_booking' || taxType === 'fixed') {
            taxAmount = taxRate;
          } else {
            taxAmount = taxRate;
          }
          
          if (taxAmount > 0) {
            taxTotal += taxAmount;
            taxBreakdown.push({ 
              name: tax.name, 
              amount: taxAmount,
              type: taxType
            });
          }
        });
      }
    } catch (e) {
      console.log('Taxes table query failed:', e.message);
    }
    
    // Only check property-level tourist tax if NO taxes found in taxes table
    if (!foundTaxesInTable && property.tourist_tax_enabled && property.tourist_tax_amount) {
      const taxableNights = property.tourist_tax_max_nights 
        ? Math.min(numNights, property.tourist_tax_max_nights) 
        : numNights;
      let touristTaxAmount = 0;
      
      const ptMaxCap = property.tourist_tax_max_amount ? parseFloat(property.tourist_tax_max_amount) : null;
      switch (property.tourist_tax_type) {
        case 'per_guest_per_night': {
          const ptRate = parseFloat(property.tourist_tax_amount);
          const ptCapped = ptMaxCap ? Math.min(ptRate, ptMaxCap) : ptRate;
          touristTaxAmount = ptCapped * taxableNights * numGuests;
          break;
        }
        case 'per_night':
          touristTaxAmount = parseFloat(property.tourist_tax_amount) * taxableNights;
          break;
        case 'per_booking':
          touristTaxAmount = parseFloat(property.tourist_tax_amount);
          break;
        case 'percentage': {
          const ptPctRate = (subTotal / numNights) * (parseFloat(property.tourist_tax_amount) / 100);
          const ptPctCapped = ptMaxCap ? Math.min(ptPctRate, ptMaxCap) : ptPctRate;
          touristTaxAmount = ptPctCapped * taxableNights * numGuests;
          break;
        }
        default:
          touristTaxAmount = parseFloat(property.tourist_tax_amount) * taxableNights * numGuests;
      }
      
      if (touristTaxAmount > 0) {
        taxTotal += touristTaxAmount;
        taxBreakdown.push({ 
          name: property.tourist_tax_name || 'Tourist Tax', 
          amount: touristTaxAmount,
          type: 'tourist_tax'
        });
      }
    }
    
    res.json({ success: true, taxes: taxBreakdown, taxTotal });
  } catch (error) {
    console.error('Taxes error:', error);
    res.json({ success: true, taxes: [], taxTotal: 0 });
  }
});

// Get deposit rule for property
app.get('/api/deposit/:propertyId', async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    
    // Get account_id from property
    const propRes = await pool.query('SELECT account_id FROM properties WHERE id = $1', [propertyId]);
    const accountId = propRes.rows[0]?.account_id;
    
    if (!accountId) {
      return res.json({ success: true, deposit_rule: null });
    }
    
    // First try property-specific rule
    let depositRule = null;
    const ruleResult = await pool.query(`
      SELECT * FROM deposit_rules 
      WHERE property_id = $1 AND is_active = true 
      ORDER BY created_at DESC LIMIT 1
    `, [propertyId]);
    
    if (ruleResult.rows.length > 0) {
      depositRule = ruleResult.rows[0];
    } else {
      // Fall back to account-level rule
      const accountRuleResult = await pool.query(`
        SELECT * FROM deposit_rules 
        WHERE account_id = $1 AND property_id IS NULL AND is_active = true
        ORDER BY created_at DESC LIMIT 1
      `, [accountId]);
      
      if (accountRuleResult.rows.length > 0) {
        depositRule = accountRuleResult.rows[0];
      }
    }
    
    res.json({ success: true, deposit_rule: depositRule });
  } catch (error) {
    console.error('Deposit error:', error);
    res.json({ success: true, deposit_rule: null });
  }
});

// Get Stripe info for property
app.get('/api/stripe/:propertyId', async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    console.log('Checking Stripe for property:', propertyId);
    
    // Check payment_configurations table first
    let paymentConfig = { rows: [] };
    try {
      paymentConfig = await pool.query(`
        SELECT pc.*
        FROM payment_configurations pc
        WHERE pc.property_id = $1 AND pc.provider = 'stripe' AND pc.is_enabled = true
        LIMIT 1
      `, [propertyId]);
      
      // Fall back to account-level config
      if (paymentConfig.rows.length === 0) {
        paymentConfig = await pool.query(`
          SELECT pc.*
          FROM payment_configurations pc
          JOIN properties p ON pc.account_id = p.account_id
          WHERE p.id = $1 AND pc.property_id IS NULL AND pc.provider = 'stripe' AND pc.is_enabled = true
          LIMIT 1
        `, [propertyId]);
      }
    } catch (pcError) {
      console.log('payment_configurations table may not exist:', pcError.message);
    }
    
    if (paymentConfig.rows.length > 0) {
      const config = paymentConfig.rows[0];
      console.log('Found payment config:', config.id);
      return res.json({
        success: true,
        stripe_enabled: true,
        stripe_publishable_key: config.credentials?.publishable_key
      });
    }
    
    // Fall back to legacy property stripe fields
    const result = await pool.query(`
      SELECT p.stripe_publishable_key, p.stripe_secret_key, p.stripe_enabled,
             a.stripe_account_id, a.stripe_onboarding_complete
      FROM properties p
      JOIN accounts a ON p.account_id = a.id
      WHERE p.id = $1
    `, [propertyId]);
    
    if (result.rows.length === 0) {
      console.log('Property not found:', propertyId);
      return res.json({ success: true, stripe_enabled: false });
    }
    
    const data = result.rows[0];
    const hasPropertyStripe = data.stripe_enabled && data.stripe_publishable_key && data.stripe_secret_key;
    const hasAccountStripe = !!(data.stripe_account_id && data.stripe_onboarding_complete);
    
    console.log('Stripe status - property:', hasPropertyStripe, 'account:', hasAccountStripe);
    
    res.json({
      success: true,
      stripe_enabled: hasPropertyStripe || hasAccountStripe,
      stripe_publishable_key: hasPropertyStripe ? data.stripe_publishable_key : (hasAccountStripe ? process.env.STRIPE_PUBLISHABLE_KEY : null),
      stripe_account_id: hasAccountStripe ? data.stripe_account_id : null
    });
  } catch (error) {
    console.error('Stripe info error:', error);
    res.json({ success: true, stripe_enabled: false, error: error.message });
  }
});

// Create payment intent
app.post('/api/payment-intent', async (req, res) => {
  try {
    const { propertyId, amount, currency, bookingData } = req.body;
    
    // Check payment_configurations table first
    let paymentConfig = await pool.query(`
      SELECT pc.*
      FROM payment_configurations pc
      WHERE pc.property_id = $1 AND pc.provider = 'stripe' AND pc.is_enabled = true
      LIMIT 1
    `, [propertyId]);
    
    // Fall back to account-level config
    if (paymentConfig.rows.length === 0) {
      paymentConfig = await pool.query(`
        SELECT pc.*
        FROM payment_configurations pc
        JOIN properties p ON pc.account_id = p.account_id
        WHERE p.id = $1 AND pc.property_id IS NULL AND pc.provider = 'stripe' AND pc.is_enabled = true
        LIMIT 1
      `, [propertyId]);
    }
    
    let paymentIntent;
    
    // Use payment_configurations if available
    if (paymentConfig.rows.length > 0 && paymentConfig.rows[0].credentials?.secret_key) {
      const config = paymentConfig.rows[0];
      const Stripe = require('stripe');
      const configStripe = new Stripe(config.credentials.secret_key);
      
      paymentIntent = await configStripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: (currency || 'gbp').toLowerCase(),
        metadata: {
          property_id: propertyId,
          guest_email: bookingData?.email || '',
          check_in: bookingData?.checkin || '',
          check_out: bookingData?.checkout || '',
          source: 'gas_lites'
        }
      });
      
      return res.json({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id
      });
    }
    
    // Fall back to legacy property stripe fields
    const result = await pool.query(`
      SELECT p.stripe_secret_key, p.stripe_publishable_key, p.stripe_enabled,
             a.stripe_account_id
      FROM properties p
      JOIN accounts a ON p.account_id = a.id
      WHERE p.id = $1
    `, [propertyId]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Property not found' });
    }
    
    const prop = result.rows[0];
    const Stripe = require('stripe');
    
    // Use property's own Stripe keys
    if (prop.stripe_enabled && prop.stripe_secret_key) {
      const propertyStripe = new Stripe(prop.stripe_secret_key);
      
      paymentIntent = await propertyStripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: (currency || 'gbp').toLowerCase(),
        metadata: {
          property_id: propertyId,
          guest_email: bookingData?.email || '',
          check_in: bookingData?.checkin || '',
          check_out: bookingData?.checkout || '',
          source: 'gas_lites'
        }
      });
      
      return res.json({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id
      });
    }
    // Fall back to Stripe Connect
    else if (prop.stripe_account_id) {
      const platformStripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      
      paymentIntent = await platformStripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: (currency || 'gbp').toLowerCase(),
        metadata: {
          property_id: propertyId,
          guest_email: bookingData?.email || '',
          check_in: bookingData?.checkin || '',
          check_out: bookingData?.checkout || '',
          source: 'gas_lites'
        }
      }, {
        stripeAccount: prop.stripe_account_id
      });
      
      return res.json({
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        stripe_account_id: prop.stripe_account_id
      });
    }
    
    res.status(400).json({ success: false, error: 'Stripe not configured for this property' });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate voucher code
app.post('/api/voucher/validate', async (req, res) => {
  try {
    const { code, propertyId, roomId, subtotal } = req.body;
    
    // Get account_id from property
    const propRes = await pool.query('SELECT account_id FROM properties WHERE id = $1', [propertyId]);
    const accountId = propRes.rows[0]?.account_id;
    
    const result = await pool.query(`
      SELECT v.*, 
             CASE WHEN v.max_uses IS NOT NULL AND v.times_used >= v.max_uses THEN true ELSE false END as exhausted
      FROM vouchers v
      LEFT JOIN properties p ON v.property_id = p.id
      WHERE UPPER(v.code) = UPPER($1) 
        AND v.active = true
        AND (v.account_id IS NULL OR v.account_id = $2 OR p.account_id = $2 OR v.property_id = $3)
        AND (v.valid_from IS NULL OR v.valid_from <= CURRENT_DATE)
        AND (v.valid_until IS NULL OR v.valid_until >= CURRENT_DATE)
    `, [code, accountId, propertyId]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'Invalid voucher code' });
    }
    
    const voucher = result.rows[0];
    
    if (voucher.exhausted) {
      return res.json({ success: false, error: 'Voucher has been fully redeemed' });
    }
    
    if (voucher.min_spend && subtotal < voucher.min_spend) {
      return res.json({ success: false, error: `Minimum spend of ${voucher.min_spend} required` });
    }
    
    // Calculate discount
    let discount = 0;
    if (voucher.discount_type === 'percentage') {
      discount = subtotal * (voucher.discount_value / 100);
      if (voucher.max_discount) discount = Math.min(discount, voucher.max_discount);
    } else {
      discount = voucher.discount_value;
    }
    
    res.json({
      success: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        name: voucher.name || voucher.code,
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        discount_amount: discount,
        description: voucher.description
      }
    });
  } catch (error) {
    res.json({ success: false, error: 'Voucher validation failed' });
  }
});

// Get active offers for Lite with eligibility check
// Validate offer/voucher code (for top-of-page promo input)
app.get('/api/validate-code/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    // Check offers table
    const offerRes = await pool.query(`
      SELECT id, name, discount_type, discount_value, price_per_night, offer_code
      FROM offers WHERE UPPER(offer_code) = $1 AND active = true
      AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
      AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      LIMIT 1
    `, [code]);
    if (offerRes.rows.length > 0) {
      const o = offerRes.rows[0];
      return res.json({ success: true, type: 'offer', discount_type: o.discount_type, discount_value: o.discount_value, price_per_night: o.price_per_night, name: o.name, code: o.offer_code });
    }
    // Check vouchers table
    const vRes = await pool.query(`
      SELECT id, name, code, discount_type, discount_value, max_discount
      FROM vouchers WHERE UPPER(code) = $1 AND active = true
      AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
      AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      LIMIT 1
    `, [code]);
    if (vRes.rows.length > 0) {
      const v = vRes.rows[0];
      return res.json({ success: true, type: 'voucher', discount_type: v.discount_type, discount_value: v.discount_value, max_discount: v.max_discount, name: v.name, code: v.code });
    }
    // Check campaigns
    const cRes = await pool.query(`
      SELECT id, name, discount_type, discount_value, custom_price, offer_code
      FROM turbine_campaigns WHERE UPPER(offer_code) = $1 AND status != 'archived'
      AND (start_date IS NULL OR start_date <= CURRENT_DATE)
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      LIMIT 1
    `, [code]);
    if (cRes.rows.length > 0) {
      const c = cRes.rows[0];
      return res.json({ success: true, type: 'campaign', discount_type: c.discount_type, discount_value: c.discount_value, name: c.name, code: c.offer_code });
    }
    res.json({ success: false, error: 'Invalid code' });
  } catch (e) {
    console.error('Validate code error:', e.message);
    res.json({ success: false, error: 'Error validating code: ' + e.message });
  }
});

app.get('/api/offers/:propertyId', async (req, res) => {
  try {
    const { checkin, checkout, roomId, accountId } = req.query;
    const propertyId = req.params.propertyId;
    
    // Get account_id from property if not provided
    let accId = accountId;
    if (!accId) {
      const propRes = await pool.query('SELECT account_id FROM properties WHERE id = $1', [propertyId]);
      accId = propRes.rows[0]?.account_id;
    }
    
    let query = `
      SELECT o.id, o.name, o.description, o.discount_type, o.discount_value,
             o.valid_from, o.valid_until, o.min_nights, o.max_nights,
             o.min_advance_days, o.max_advance_days,
             o.allowed_checkin_days, o.allowed_checkout_days,
             o.available_website, o.property_id, o.room_id,
             o.replaces_standard, o.hide_discount_badge, o.pricing_tier
      FROM offers o
      LEFT JOIN properties p ON o.property_id = p.id
      WHERE o.active = true
        AND (o.available_website = true OR o.available_website IS NULL)
        AND (o.account_id = $1 OR p.account_id = $1 OR o.property_id = $2)
        AND (o.valid_from IS NULL OR o.valid_from <= CURRENT_DATE)
        AND (o.valid_until IS NULL OR o.valid_until >= CURRENT_DATE)
        AND ($3::integer IS NULL OR o.room_id IS NULL OR o.room_id = $3)
      ORDER BY o.priority DESC, o.discount_value DESC
    `;
    
    const result = await pool.query(query, [accId, propertyId, roomId || null]);
    
    // Filter offers by eligibility if dates provided
    let offers = result.rows;
    if (checkin && checkout) {
      const checkinDate = new Date(checkin);
      const checkoutDate = new Date(checkout);
      const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
      const today = new Date();
      const advanceDays = Math.ceil((checkinDate - today) / (1000 * 60 * 60 * 24));
      const checkinDayOfWeek = checkinDate.getDay();
      const checkoutDayOfWeek = checkoutDate.getDay();
      
      offers = offers.filter(offer => {
        // Check min/max nights
        if (offer.min_nights && nights < offer.min_nights) return false;
        if (offer.max_nights && nights > offer.max_nights) return false;
        
        // Check advance booking days
        if (offer.min_advance_days && advanceDays < offer.min_advance_days) return false;
        if (offer.max_advance_days && advanceDays > offer.max_advance_days) return false;
        
        // Check allowed check-in days
        if (offer.allowed_checkin_days) {
          const allowedDays = offer.allowed_checkin_days.split(',').map(d => parseInt(d));
          if (!allowedDays.includes(checkinDayOfWeek)) return false;
        }
        
        // Check allowed check-out days
        if (offer.allowed_checkout_days) {
          const allowedDays = offer.allowed_checkout_days.split(',').map(d => parseInt(d));
          if (!allowedDays.includes(checkoutDayOfWeek)) return false;
        }

        // Filter out agent-tier offers (Lites sites are always standard tier)
        if (offer.pricing_tier && offer.pricing_tier.startsWith('agent')) return false;

        return true;
      });
    }
    
    res.json({ success: true, offers });
  } catch (error) {
    console.error('Offers error:', error);
    res.json({ success: true, offers: [] });
  }
});

// Submit booking
app.post('/api/book', async (req, res) => {
  try {
    const {
      liteSlug, roomId, propertyId,
      checkin, checkout, adults, children,
      guestFirstName, guestLastName, guestEmail, guestPhone,
      guestAddress, guestCity, guestCountry, guestPostcode,
      notes, marketing,
      upsells, voucherCode, offerId, offerName, offerDiscount,
      rateType, paymentMethod, stripePaymentIntentId, depositAmount,
      pricing, total
    } = req.body;
    
    const guestName = (guestFirstName + ' ' + guestLastName).trim();
    
    // Validate required fields
    if (!roomId || !checkin || !checkout || !guestName || !guestEmail) {
      return res.json({ success: false, error: 'Missing required fields' });
    }
    
    // Generate confirmation code
    const confirmationCode = 'GAS' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // Determine payment status
    let paymentStatus = 'pending';
    if (paymentMethod === 'card' && stripePaymentIntentId) {
      paymentStatus = depositAmount ? 'deposit_paid' : 'paid';
    }
    
    // Create reservation
    const result = await pool.query(`
      INSERT INTO reservations (
        property_id, room_id, confirmation_code, source,
        check_in, check_out, adults, children,
        guest_name, guest_email, guest_phone,
        guest_address, guest_city, guest_country, guest_postcode,
        notes, marketing_consent,
        total_price, deposit_amount, payment_status, payment_method,
        stripe_payment_intent_id, status, created_at, 
        upsells_json, voucher_code, offer_id, offer_name, offer_discount,
        rate_type, lite_slug
      ) VALUES ($1, $2, $3, 'gas-lite', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'confirmed', NOW(), $22, $23, $24, $25, $26, $27, $28)
      RETURNING id, confirmation_code
    `, [
      propertyId, roomId, confirmationCode,
      checkin, checkout, adults || 1, children || 0,
      guestName, guestEmail, guestPhone || null,
      guestAddress || null, guestCity || null, guestCountry || null, guestPostcode || null,
      notes || null, marketing || false,
      total, depositAmount || null, paymentStatus, paymentMethod || 'property',
      stripePaymentIntentId || null,
      JSON.stringify(upsells || []), voucherCode || null, offerId || null, offerName || null, offerDiscount || null,
      rateType || 'standard', liteSlug
    ]);
    
    // TODO: Send confirmation email
    // TODO: Push to channel manager
    
    // Create/link traveller record
    try {
      // Get account_id from property
      const propRes = await pool.query('SELECT account_id FROM properties WHERE id = $1', [propertyId]);
      const accountId = propRes.rows[0]?.account_id;
      
      if (accountId && guestEmail) {
        // Insert or update traveller
        await pool.query(`
          INSERT INTO travellers (email, phone, first_name, last_name, address, city, country, postal_code, status, marketing_opt_in)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'lead', $9)
          ON CONFLICT (email) DO UPDATE SET
            phone = COALESCE(NULLIF($2, ''), travellers.phone),
            first_name = COALESCE(NULLIF($3, ''), travellers.first_name),
            last_name = COALESCE(NULLIF($4, ''), travellers.last_name),
            updated_at = NOW()
        `, [
          guestEmail.toLowerCase().trim(),
          guestPhone || null,
          guestFirstName || null,
          guestLastName || null,
          guestAddress || null,
          guestCity || null,
          guestCountry || null,
          guestPostcode || null,
          marketing || false
        ]);
        
        // Get traveller id and link to account
        const travRes = await pool.query('SELECT id FROM travellers WHERE email = $1', [guestEmail.toLowerCase().trim()]);
        if (travRes.rows.length > 0) {
          const travellerId = travRes.rows[0].id;
          await pool.query(`
            INSERT INTO traveller_property_links (traveller_id, account_id, property_id, first_booking_id, total_spent, last_stay_date, source)
            VALUES ($1, $2, $3, $4, $5, $6, 'gas-lite')
            ON CONFLICT (traveller_id, account_id) DO UPDATE SET
              total_bookings = traveller_property_links.total_bookings + 1,
              total_spent = traveller_property_links.total_spent + $5,
              last_stay_date = $6,
              updated_at = NOW()
          `, [travellerId, accountId, propertyId, result.rows[0].id, total || 0, checkin]);
          console.log(`[Lite Booking] Linked traveller ${travellerId} to account ${accountId}`);
        }
      }
    } catch (travError) {
      console.error('[Lite Booking] Traveller creation error:', travError.message);
      // Don't fail the booking if traveller creation fails
    }
    
    res.json({
      success: true,
      booking: {
        id: result.rows[0].id,
        confirmationCode: result.rows[0].confirmation_code
      }
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.json({ success: false, error: 'Booking failed. Please try again.' });
  }
});

// ============================================
// RENDER FUNCTIONS
// ============================================
// Parse description - handles JSON format {"en":"..."} and escaped newlines
function parseDescription(desc) {
  if (!desc) return '';
  let text = desc;
  
  // If it's already an object (not stringified JSON)
  if (typeof text === 'object' && text !== null) {
    text = text.en || text.EN || text.default || Object.values(text)[0] || '';
  }
  
  // Handle JSON string format like {"en":"..."}
  if (typeof text === 'string' && text.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      text = parsed.en || parsed.EN || parsed.default || Object.values(parsed)[0] || '';
    } catch (e) {
      // Not valid JSON, use as-is
    }
  }
  
  // Convert escaped newlines to actual newlines
  text = String(text)
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '  ');
  
  // Clean up: remove ALL emojis, markdown, excessive whitespace
  text = text
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove all emojis
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Remove misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Remove dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Remove variation selectors
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '') // Remove mahjong/domino
    .replace(/\*\*/g, '')                    // Remove markdown bold
    .replace(/^.*airbnb\.com.*$/gmi, '')     // Remove Airbnb links
    .replace(/^.*booking\.com.*$/gmi, '')    // Remove Booking links
    .replace(/^.*vrbo\.com.*$/gmi, '')       // Remove VRBO links
    .replace(/^\s*\(Copy\/Paste\)\s*$/gmi, '') // Remove copy/paste instructions
    .replace(/SALE!?/gi, '')                 // Remove SALE spam
    .replace(/Prices just went down[^!]*!?/gi, '') // Remove price drop spam
    .replace(/Book (now|today)!?/gi, '')     // Remove book now spam
    .replace(/^[\s•\-]*$/gm, '')             // Remove empty bullet lines
    .replace(/^\s*-\s*/gm, '• ')             // Clean up list markers
    .replace(/\n{3,}/g, '\n\n')              // Max 2 newlines
    .replace(/[ \t]+/g, ' ')                 // Collapse spaces
    .replace(/\n /g, '\n')                   // Remove leading space after newline
    .trim();
  
  return text;
}

function getCurrencySymbol(c) {
  const s = { USD:'$', EUR:'€', GBP:'£', PHP:'₱', THB:'฿', JPY:'¥', AUD:'A$', CAD:'C$', INR:'₹' };
  return s[c] || (c ? c+' ' : '$');
}

// Escape string for safe use in JavaScript string literals
function escapeForJS(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ');
}

// Escape string for safe use in HTML attributes
function escapeForHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderNotFound(slug) {
  return `<!DOCTYPE html><html><head><title>Not Found</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f1f5f9;margin:0}
  .c{text-align:center;padding:2rem}h1{color:#1e293b}p{color:#64748b}a{color:#3b82f6}</style></head>
  <body><div class="c"><h1>🔍 Not Found</h1><p>"${slug}" doesn't exist yet.</p>
  <p><a href="https://gas.travel">Create your free GAS Lite →</a></p></div></body></html>`;
}

function renderError(msg) {
  return `<!DOCTYPE html><html><head><title>Error</title></head>
  <body style="font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh">
  <div style="text-align:center"><h1>⚠️ Error</h1><p>${msg||'Please try again.'}</p></div></body></html>`;
}

// ============================================
// ACCOUNT BOOKING PAGE RENDERER
// ============================================
function renderBookingPage({ account, rooms, embed = false, compact = false, lang = 'en', supportedLangs = ['en'], litesStyle = {} }) {
  const accent = litesStyle.btn_color || account.primary_color || '#3b82f6';
  const btnTextColor = litesStyle.btn_text_color || '#ffffff';
  const btnRadius = litesStyle.btn_radius != null ? litesStyle.btn_radius : 6;
  const pageBg = litesStyle.page_bg || '#f8fafc';
  const cardBg = litesStyle.card_bg || '#ffffff';
  const textColor = litesStyle.text_color || '#1e293b';
  const headingFont = litesStyle.heading_font || 'Inter';
  const bodyFont = litesStyle.body_font || 'Inter';
  const cardRadius = litesStyle.card_radius != null ? litesStyle.card_radius : 10;
  const showMap = litesStyle.show_map !== false;
  const showBranding = litesStyle.show_branding !== false;
  const maxGuestsAcrossRooms = Math.max(10, ...rooms.map(r => parseInt(r.max_guests) || 0));
  const businessName = account.business_name || account.name || 'Book Your Stay';
  const logoHtml = account.logo_url
    ? `<img src="${account.logo_url}" alt="${escapeForHTML(businessName)}" style="height: 40px;">`
    : '';
  const defaultCurrency = getCurrencySymbol(rooms.length > 0 ? rooms[0].currency : 'USD');
  const tr = (key) => t(key, lang);
  const displayLanguages = AVAILABLE_LANGUAGES.filter(l => supportedLangs.includes(l.code));
  const langSwitcherHtml = displayLanguages.length > 1 ? `
    <select id="langSwitch" onchange="switchLang(this.value)" style="padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.8rem; cursor: pointer; background: white;">
      ${displayLanguages.map(l => `<option value="${l.code}" ${l.code === lang ? 'selected' : ''}>${l.flag} ${l.name}</option>`).join('')}
    </select>` : '';
  // Build Google Fonts URL for custom fonts
  const fontsToLoad = [...new Set([headingFont, bodyFont])].filter(f => f !== 'Inter');
  const fontLink = fontsToLoad.length > 0 ? `<link href="https://fonts.googleapis.com/css2?family=${fontsToLoad.map(f => encodeURIComponent(f) + ':wght@400;500;600;700').join('&family=')}&display=swap" rel="stylesheet">` : '';

  // Dynamic filter options from data
  const uniqueCities = [...new Set(rooms.map(r => r.city).filter(Boolean))].sort();
  const cityOptionsHtml = uniqueCities.map(c => `<option value="${escapeForHTML(c)}">${escapeForHTML(c)}</option>`).join('');
  const uniqueProps = [...new Set(rooms.map(r => r.property_name).filter(Boolean))].sort();
  const propOptionsHtml = uniqueProps.map(p => `<option value="${escapeForHTML(p)}">${escapeForHTML(p)}</option>`).join('');

  // Build property map pins (deduplicate by property_id)
  const propertyMap = {};
  rooms.forEach(r => {
    if (!r.latitude || !r.longitude) return;
    const pid = r.property_id;
    if (!propertyMap[pid]) {
      propertyMap[pid] = { id: pid, name: r.property_name, city: r.city || '', lat: parseFloat(r.latitude), lng: parseFloat(r.longitude), rooms: [] };
    }
    propertyMap[pid].rooms.push({ id: r.room_id, name: r.room_name || r.display_name });
  });
  const mapPins = Object.values(propertyMap).filter(p => p.lat && p.lng);
  const mapDataJson = JSON.stringify(mapPins);

  const roomCardsHtml = rooms.map((r, i) => {
    const image = r.room_image || r.property_image || '';
    const displayName = parseJsonTextField(r.display_name || r.room_name, lang);
    const liteUrl = r.lite_slug ? `/${r.lite_slug}?lang=${lang}` : `/${r.room_id}?lang=${lang}`;
    const bedrooms = parseInt(r.num_bedrooms) || 0;
    const bathrooms = parseFloat(r.num_bathrooms) || 0;
    const bathroomsDisplay = bathrooms === Math.floor(bathrooms) ? Math.floor(bathrooms) : bathrooms.toFixed(1);
    return `
      <div class="room-card" id="room-${r.room_id}" data-room-id="${r.room_id}" data-max-guests="${r.max_guests || 99}" data-lite-url="${liteUrl}" data-price="0" data-bedrooms="${bedrooms}" data-city="${escapeForHTML(r.city || '')}" data-property="${escapeForHTML(r.property_name || '')}" data-property-id="${r.property_id}">
        <div class="room-image" style="background-image: url('${image}');">
          ${!image ? '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:3rem;color:#cbd5e1;">🏠</div>' : ''}
          <div class="avail-badge" id="badge-${r.room_id}"></div>
        </div>
        <div class="room-info">
          <h3 class="room-name">${escapeForHTML(displayName)}</h3>
          <p class="room-property">📍 ${escapeForHTML(r.property_name)}${r.city ? ', ' + escapeForHTML(r.city) : ''}</p>
          <div class="room-meta">
            ${r.max_guests ? `<span class="meta-pill">👥 ${r.max_guests}</span>` : ''}
            ${bedrooms > 0 ? `<span class="meta-pill">🛏️ ${bedrooms}</span>` : ''}
            ${bathrooms > 0 ? `<span class="meta-pill">🚿 ${bathroomsDisplay}</span>` : ''}
          </div>
          <div class="room-bottom">
            <div class="room-price" id="price-${r.room_id}"><span class="price-on-request">${tr('select_dates')}</span></div>
            <a href="${liteUrl}" class="book-btn" id="bookbtn-${r.room_id}">${tr('book_now')}</a>
          </div>
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeForHTML(businessName)} — ${tr('book_now')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  ${fontLink}
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: '${bodyFont}', system-ui, sans-serif; background: ${embed ? 'transparent' : pageBg}; color: ${textColor}; min-height: ${embed ? 'auto' : '100vh'}; }
    h1, h2, h3, h4, .room-name { font-family: '${headingFont}', system-ui, sans-serif; }

    /* Header */
    .page-header { background: ${cardBg}; border-bottom: 1px solid #e2e8f0; padding: 0.75rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
    .header-left { display: flex; align-items: center; gap: 0.75rem; }
    .header-left h1 { font-size: 1.2rem; font-weight: 700; }
    .nav-links { display: flex; align-items: center; gap: 1.5rem; }
    .nav-links a { color: #475569; text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color 0.2s; }
    .nav-links a:hover { color: #0f172a; }
    .nav-links .nav-cta { background: ${accent}; color: ${btnTextColor}; padding: 0.5rem 1.25rem; border-radius: ${btnRadius}px; font-weight: 600; }
    .nav-links .nav-cta:hover { opacity: 0.9; color: white; }

    /* Search bar */
    .search-bar { background: ${cardBg}; border-bottom: 1px solid #e2e8f0; padding: 0.75rem 1.5rem; position: sticky; top: 0; z-index: 100; }
    .search-inner { max-width: 1400px; margin: 0 auto; display: flex; gap: 0.5rem; align-items: flex-end; flex-wrap: wrap; }
    .search-field { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 120px; }
    .search-field label { font-size: 0.65rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .search-field input, .search-field select { padding: 0.5rem 0.6rem; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.85rem; font-family: inherit; background: white; }
    .search-field input:focus, .search-field select:focus { outline: none; border-color: ${accent}; box-shadow: 0 0 0 2px ${accent}22; }
    .check-btn { padding: 0.5rem 1.25rem; background: ${accent}; color: ${btnTextColor}; border: none; border-radius: ${btnRadius}px; font-size: 0.85rem; font-weight: 600; cursor: pointer; white-space: nowrap; font-family: inherit; transition: opacity 0.2s; height: 34px; align-self: flex-end; }
    .check-btn:hover { opacity: 0.9; }
    .check-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .filter-count { font-size: 0.75rem; color: #94a3b8; padding: 0.5rem 0; white-space: nowrap; }

    /* Main layout: cards + map sidebar */
    .main-content { max-width: 1400px; margin: 0 auto; padding: 1.25rem; display: flex; gap: 1.25rem; }
    .cards-panel { flex: 3; min-width: 0; }
    .map-panel { flex: 1; min-width: 300px; position: sticky; top: ${embed ? '20px' : '80px'}; height: calc(100vh - ${embed ? '40px' : '100px'}); align-self: flex-start; }
    #property-map { height: 100%; border-radius: var(--card-radius); z-index: 0; }
    .room-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }

    /* Room cards */
    .room-card { background: ${cardBg}; border-radius: ${cardRadius}px; overflow: hidden; border: 2px solid transparent; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: all 0.3s; display: flex; flex-direction: column; }
    .room-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .room-card.available { border-color: #22c55e; }
    .room-card.unavailable { opacity: 0.55; }
    .room-card.highlighted { border-color: ${accent}; box-shadow: 0 0 0 3px ${accent}33; }
    .room-card.filter-hidden { display: none; }
    .room-image { aspect-ratio: 16/9; background-size: cover; background-position: center; background-color: #f1f5f9; position: relative; }
    .avail-badge { position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; display: none; }
    .avail-badge.show-avail { display: block; background: #dcfce7; color: #166534; }
    .avail-badge.show-unavail { display: block; background: #fee2e2; color: #991b1b; }
    .room-info { padding: 1rem; display: flex; flex-direction: column; flex: 1; }
    .room-name { font-size: 1rem; font-weight: 600; margin-bottom: 0.2rem; line-height: 1.3; }
    .room-property { font-size: 0.8rem; color: #64748b; margin-bottom: 0.6rem; }
    .room-meta { display: flex; gap: 0.75rem; margin-bottom: 0.75rem; }
    .meta-pill { color: #64748b; font-size: 0.8rem; }
    .room-bottom { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; }
    .room-price { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
    .per-night { font-size: 0.75rem; font-weight: 400; color: #64748b; }
    .price-on-request { font-size: 0.8rem; font-weight: 500; color: #94a3b8; }
    .book-btn { display: inline-block; padding: 0.4rem 1rem; background: ${accent}; color: ${btnTextColor}; text-decoration: none; border-radius: ${btnRadius}px; font-size: 0.8rem; font-weight: 600; transition: opacity 0.2s; }
    .book-btn:hover { opacity: 0.9; }
    .book-btn.disabled { background: #e2e8f0; color: #94a3b8; cursor: default; pointer-events: none; }
    .empty-state { text-align: center; padding: 4rem 2rem; color: #64748b; }
    .spinner { display: none; width: 16px; height: 16px; border: 2px solid #ffffff55; border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Mobile */
    @media (max-width: 768px) {
      .page-header { flex-direction: column; gap: 0.5rem; }
      .nav-links { gap: 1rem; }
      .search-inner { flex-direction: column; }
      .search-field { min-width: 100% !important; max-width: 100% !important; flex: 1 !important; }
      .check-btn { width: 100%; }
      .main-content { flex-direction: column; }
      .map-panel { position: relative; top: auto; height: 300px; min-width: auto; }
      .room-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  ${embed ? '' : `<div class="page-header">
    <div class="header-left">
      ${logoHtml}
      <h1>${escapeForHTML(businessName)}</h1>
    </div>
    <nav class="nav-links">
      <a href="#roomGrid">Rooms</a>
      ${showMap ? '<a href="#property-map">Map</a>' : ''}
      ${langSwitcherHtml}
      <a href="#search" class="nav-cta" onclick="document.getElementById('checkin').focus(); return false;">${tr('book_now')}</a>
    </nav>
  </div>`}

  <div class="search-bar" id="search">
    <div class="search-inner">
      <div class="search-field" style="flex: 1.5; min-width: 100px;">
        <label>${tr('location')}</label>
        <select id="filterLocation" onchange="applyFilters()">
          <option value="">${tr('all_locations')}</option>
          ${cityOptionsHtml}
        </select>
      </div>
      <div class="search-field" style="flex: 1.5; min-width: 100px;">
        <label>Property</label>
        <select id="filterProperty" onchange="applyFilters()">
          <option value="">${tr('all_properties')}</option>
          ${propOptionsHtml}
        </select>
      </div>
      <div class="search-field search-date" style="flex: 1; min-width: 120px;">
        <label>${tr('check_in')}</label>
        <input type="text" id="checkin" placeholder="${tr('select_dates')}" readonly>
      </div>
      <div class="search-field search-date" style="flex: 1; min-width: 120px;">
        <label>${tr('check_out')}</label>
        <input type="text" id="checkout" placeholder="${tr('select_dates')}" readonly>
      </div>
      <div class="search-field" style="max-width: 65px;">
        <label>${tr('guests')}</label>
        <select id="guests">
          ${Array.from({length: maxGuestsAcrossRooms}, (_, i) => i + 1).map(n => `<option value="${n}"${n === 2 ? ' selected' : ''}>${n}</option>`).join('')}
        </select>
      </div>
      <div class="search-field" style="max-width: 70px;">
        <label>Sort</label>
        <select id="sortBy" onchange="applyFilters()">
          <option value="">—</option>
          <option value="price-asc">↑</option>
          <option value="price-desc">↓</option>
        </select>
      </div>
      ${displayLanguages.length > 1 ? `<div class="search-field" style="max-width: 80px;">
        <label>${tr('select_language')}</label>
        <select id="langSwitch" onchange="switchLang(this.value)">
          ${displayLanguages.map(l => `<option value="${l.code}" ${l.code === lang ? 'selected' : ''}>${l.flag} ${l.code.toUpperCase()}</option>`).join('')}
        </select>
      </div>` : ''}
      <button class="check-btn" id="checkBtn" onclick="checkAvailability()">
        <span id="checkText">${tr('check_availability')}</span>
        <div class="spinner" id="checkSpinner"></div>
      </button>
      <span id="filterCount" class="filter-count"></span>
    </div>
    <div id="promoBar" style="display: flex; align-items: center; gap: 8px; margin-top: 8px; padding: 8px 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
      <span style="font-size: 0.85rem; color: #64748b;">🎟️ ${tr('promo_code')}</span>
      <input type="text" id="topPromoCode" placeholder="Enter code" style="padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.85rem; width: 140px; text-transform: uppercase;">
      <button onclick="applyTopPromo()" style="padding: 6px 14px; background: ${account.primary_color || '#3b82f6'}; color: white; border: none; border-radius: 6px; font-size: 0.85rem; cursor: pointer; font-weight: 600;">Apply</button>
      <span id="promoMsg" style="font-size: 0.8rem; color: #64748b;"></span>
    </div>
    <div id="promoBanner" style="display: none; margin-top: 8px; padding: 10px 16px; background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; font-size: 0.9rem; color: #166534; font-weight: 500;">
      <span id="promoBannerText"></span>
      <button onclick="clearTopPromo()" style="float: right; background: none; border: none; color: #dc2626; cursor: pointer; font-size: 0.85rem;">✕ Remove</button>
    </div>
  </div>

  <div class="main-content">
    <div class="cards-panel">
      ${rooms.length > 0 ? `<div class="room-grid" id="roomGrid">${roomCardsHtml}</div>` : `
        <div class="empty-state">
          <h2>${tr('no_rooms')}</h2>
        </div>`}
    </div>
    ${!compact && showMap && mapPins.length > 0 ? '<div class="map-panel"><div id="property-map"></div></div>' : ''}
  </div>

  <script>
    var currentLang = '${lang}';
    var TRANSLATIONS = ${JSON.stringify({
      available: tr('available'),
      unavailable: tr('unavailable'),
      check_availability: tr('check_availability'),
      select_dates: tr('select_dates'),
      book_now: tr('book_now'),
      view_book: tr('view_book'),
      nights: tr('nights'),
      total: tr('total'),
      checking: tr('checking'),
      max_guests_msg: tr('max_guests_msg')
    })};
    function switchLang(newLang) {
      var url = new URL(window.location.href);
      url.searchParams.set('lang', newLang);
      window.location.href = url.toString();
    }
    var flatpickrCheckin = flatpickr('#checkin', {
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd M Y',
      minDate: 'today',
      onChange: function(selectedDates) {
        if (selectedDates[0]) {
          var next = new Date(selectedDates[0]);
          next.setDate(next.getDate() + 1);
          flatpickrCheckout.set('minDate', next);
          if (!flatpickrCheckout.selectedDates[0] || flatpickrCheckout.selectedDates[0] <= selectedDates[0]) {
            flatpickrCheckout.setDate(next);
          }
          setTimeout(function() { flatpickrCheckout.open(); }, 100);
        }
      }
    });
    var flatpickrCheckout = flatpickr('#checkout', {
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd M Y',
      minDate: new Date().fp_incr(1)
    });

    // --- Promo/Agent Code at top of page ---
    var activePromo = null; // { type: 'voucher'|'offer', discount_type, discount_value, name, code }

    async function applyTopPromo() {
      const code = document.getElementById('topPromoCode').value.trim();
      const msg = document.getElementById('promoMsg');
      if (!code) { msg.textContent = 'Enter a code'; msg.style.color = '#dc2626'; return; }
      msg.textContent = 'Checking...'; msg.style.color = '#64748b';

      try {
        const res = await fetch('/api/validate-code/' + encodeURIComponent(code));
        const data = await res.json();
        if (data.success) {
          activePromo = {
            type: data.type, code,
            discount_type: data.discount_type || 'percentage',
            discount_value: parseFloat(data.discount_value || 0),
            price_per_night: data.price_per_night ? parseFloat(data.price_per_night) : null,
            name: data.name || code
          };
          showPromoBanner();
        } else {
          msg.textContent = 'Invalid code'; msg.style.color = '#dc2626';
          activePromo = null;
        }
      } catch (e) {
        msg.textContent = 'Error checking code'; msg.style.color = '#dc2626';
      }
    }

    function showPromoBanner() {
      const msg = document.getElementById('promoMsg');
      msg.textContent = '';
      const banner = document.getElementById('promoBanner');
      const text = document.getElementById('promoBannerText');
      if (activePromo.discount_type === 'percentage') {
        text.textContent = '✅ Code ' + activePromo.code.toUpperCase() + ' applied — ' + activePromo.discount_value + '% off all rooms';
      } else if (activePromo.price_per_night) {
        text.textContent = '✅ Code ' + activePromo.code.toUpperCase() + ' applied — Special rate active';
      } else {
        text.textContent = '✅ Code ' + activePromo.code.toUpperCase() + ' applied — ' + activePromo.name;
      }
      banner.style.display = 'block';
      applyPromoToCards();
    }

    function clearTopPromo() {
      activePromo = null;
      document.getElementById('promoBanner').style.display = 'none';
      document.getElementById('topPromoCode').value = '';
      // Remove strikethrough from all cards
      document.querySelectorAll('.room-card .promo-price').forEach(el => el.remove());
      document.querySelectorAll('.room-card .original-price').forEach(el => { el.style.textDecoration = 'none'; el.style.color = ''; });
    }

    function applyPromoToCards() {
      if (!activePromo) return;
      document.querySelectorAll('.room-card').forEach(card => {
        const priceEl = card.querySelector('.room-price span, .room-price');
        if (!priceEl) return;
        const priceText = priceEl.textContent;
        const priceMatch = priceText.match(/[\\d,.]+/);
        if (!priceMatch) return;
        const originalPrice = parseFloat(priceMatch[0].replace(',', ''));
        if (!originalPrice || originalPrice <= 0) return;

        let newPrice = originalPrice;
        if (activePromo.price_per_night) {
          newPrice = activePromo.price_per_night;
        } else if (activePromo.discount_type === 'percentage') {
          newPrice = originalPrice * (1 - activePromo.discount_value / 100);
        } else {
          newPrice = originalPrice - activePromo.discount_value;
        }
        newPrice = Math.max(0, Math.round(newPrice));

        // Don't duplicate
        if (card.querySelector('.promo-price')) return;

        // Add strikethrough + new price
        priceEl.classList.add('original-price');
        priceEl.style.textDecoration = 'line-through';
        priceEl.style.color = '#94a3b8';
        priceEl.style.fontSize = '0.85em';
        const newEl = document.createElement('span');
        newEl.className = 'promo-price';
        newEl.style.cssText = 'color: #16a34a; font-weight: 700; font-size: 1.1em; margin-left: 6px;';
        newEl.textContent = priceText.replace(priceMatch[0], newPrice);
        priceEl.parentNode.insertBefore(newEl, priceEl.nextSibling);

        // Update book button link to include promo code
        const bookBtn = card.querySelector('.book-btn');
        if (bookBtn) {
          const href = bookBtn.getAttribute('href');
          const sep = href.includes('?') ? '&' : '?';
          bookBtn.setAttribute('href', href + sep + 'offer=' + encodeURIComponent(activePromo.code));
        }
      });
    }

    // Check URL for pre-applied code
    (function() {
      var params = new URLSearchParams(window.location.search);
      var code = params.get('code') || params.get('promo') || params.get('offer');
      if (code) {
        document.getElementById('topPromoCode').value = code;
        setTimeout(applyTopPromo, 500);
      }
    })();

    function applyFilters() {
      var loc = document.getElementById('filterLocation').value;
      var prop = document.getElementById('filterProperty').value;
      var sortBy = document.getElementById('sortBy').value;
      var cards = document.querySelectorAll('.room-card');
      var grid = document.getElementById('roomGrid');
      var shown = 0;

      // Filter
      cards.forEach(function(card) {
        var show = true;
        if (loc && card.dataset.city !== loc) show = false;
        if (prop && card.dataset.property !== prop) show = false;
        card.classList.toggle('filter-hidden', !show);
        if (show) shown++;
      });

      // Sort (always respects availability grouping if checkAvailability has run)
      if (grid) {
        var arr = Array.from(grid.children);
        arr.sort(function(a, b) {
          // If availability has been checked, group by status first
          if (a.dataset.availStatus || b.dataset.availStatus) {
            var statusOrder = { available: 0, nodata: 1, unavailable: 2 };
            var sa = statusOrder[a.dataset.availStatus] !== undefined ? statusOrder[a.dataset.availStatus] : 1;
            var sb = statusOrder[b.dataset.availStatus] !== undefined ? statusOrder[b.dataset.availStatus] : 1;
            if (sa !== sb) return sa - sb;
          }
          // Within same group (or no availability check), sort by price
          var pa = parseFloat(a.dataset.price) || 99999;
          var pb = parseFloat(b.dataset.price) || 99999;
          if (sortBy === 'price-desc') return pb - pa;
          if (sortBy === 'price-asc') return pa - pb;
          return 0;
        });
        arr.forEach(function(el) { grid.appendChild(el); });
      }

      var countEl = document.getElementById('filterCount');
      if (loc || prop) {
        countEl.textContent = shown + ' of ' + cards.length;
      } else {
        countEl.textContent = '';
      }
    }

    async function checkAvailability() {
      var checkin = document.getElementById('checkin').value;
      var checkout = document.getElementById('checkout').value;
      var guests = parseInt(document.getElementById('guests').value);

      if (!checkin || !checkout) {
        alert(TRANSLATIONS.select_dates);
        return;
      }

      var btn = document.getElementById('checkBtn');
      var text = document.getElementById('checkText');
      var spinner = document.getElementById('checkSpinner');
      btn.disabled = true;
      text.style.display = 'none';
      spinner.style.display = 'block';

      var cards = document.querySelectorAll('.room-card');
      var fetches = Array.from(cards).map(async function(card) {
        var roomId = card.dataset.roomId;
        var maxGuests = parseInt(card.dataset.maxGuests) || 99;
        var liteUrl = card.dataset.liteUrl;
        var badge = document.getElementById('badge-' + roomId);
        var bookBtn = document.getElementById('bookbtn-' + roomId);
        var priceDiv = document.getElementById('price-' + roomId);

        if (guests > maxGuests) {
          card.classList.remove('available');
          card.classList.add('unavailable');
          badge.className = 'avail-badge show-unavail';
          badge.textContent = TRANSLATIONS.max_guests_msg.replace('{n}', maxGuests);
          card.dataset.availStatus = 'unavailable';
          return;
        }

        try {
          var res = await fetch('/api/availability/' + roomId + '?from=' + checkin + '&to=' + checkout);
          var data = await res.json();
          var dates = data.availability || [];
          var start = new Date(checkin);
          var end = new Date(checkout);
          var nights = Math.round((end - start) / 86400000);

          // Calculate total price and check availability
          // Rule: if a night has a price > 0, it IS available (even if is_available flag is false)
          // Only explicitly blocked nights (is_blocked = true) are unavailable
          var totalPrice = 0;
          var pricedNights = 0;
          var blockedNights = 0;
          dates.forEach(function(d) {
            var price = parseFloat(d.price) || 0;
            if (price > 0) { totalPrice += price; pricedNights++; }
            if (d.is_blocked) { blockedNights++; }
          });

          // Available if: no blocked nights AND we have data for all stay nights AND prices exist
          var isAvailable = blockedNights === 0 && dates.length >= nights && pricedNights >= nights;

          if (isAvailable && nights > 0) {
            card.classList.add('available');
            card.classList.remove('unavailable');
            badge.className = 'avail-badge show-avail';
            badge.textContent = TRANSLATIONS.available;
            card.dataset.availStatus = 'available';
            // Update price to show total
            if (totalPrice > 0 && priceDiv) {
              priceDiv.innerHTML = '${defaultCurrency}' + Math.round(totalPrice) + '<span class="per-night"> ' + TRANSLATIONS.total + ' (' + nights + ' ' + TRANSLATIONS.nights + ')</span>';
              card.dataset.price = Math.round(totalPrice / nights);
            }
            // Update View & Book link with dates
            if (bookBtn && liteUrl) {
              var sep = liteUrl.indexOf('?') >= 0 ? '&' : '?';
              bookBtn.href = liteUrl + sep + 'checkin=' + checkin + '&checkout=' + checkout + '&guests=' + guests;
            }
          } else if (dates.length === 0) {
            // No availability data at all — not necessarily unavailable, just no data
            card.classList.remove('available');
            card.classList.remove('unavailable');
            badge.className = 'avail-badge';
            badge.textContent = '';
            card.dataset.availStatus = 'nodata';
          } else {
            card.classList.remove('available');
            card.classList.add('unavailable');
            badge.className = 'avail-badge show-unavail';
            badge.textContent = TRANSLATIONS.unavailable;
            card.dataset.availStatus = 'unavailable';
          }
        } catch (err) {
          console.error('Availability check failed for room ' + roomId, err);
          card.dataset.availStatus = 'nodata';
        }
      });

      await Promise.all(fetches);

      // Re-sort: available+priced first (by price), available+no-price next, no-data, unavailable last
      var grid = document.getElementById('roomGrid');
      if (grid) {
        var sortBy = document.getElementById('sortBy').value;
        var arr = Array.from(grid.children);
        arr.sort(function(a, b) {
          var statusOrder = { available: 0, nodata: 1, unavailable: 2 };
          var sa = statusOrder[a.dataset.availStatus] !== undefined ? statusOrder[a.dataset.availStatus] : 1;
          var sb = statusOrder[b.dataset.availStatus] !== undefined ? statusOrder[b.dataset.availStatus] : 1;
          if (sa !== sb) return sa - sb;
          // Within same status group, sort by price
          var pa = parseFloat(a.dataset.price) || 99999;
          var pb = parseFloat(b.dataset.price) || 99999;
          if (sortBy === 'price-desc') return pb - pa;
          return pa - pb; // default and price-asc: low to high
        });
        arr.forEach(function(el) { grid.appendChild(el); });
      }

      btn.disabled = false;
      text.style.display = 'inline';
      spinner.style.display = 'none';
    }
${embed ? `
    // === EMBED MODE ===
    // Tell parent to use viewport height (not content height) so sticky map works
    window.parent.postMessage({ type: 'gas-embed-fullscreen', fullscreen: true }, '*');
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a');
      if (!link || !link.href) return;
      var url = link.href;
      // Room detail links — navigate inside iframe with embed=1
      if (url.indexOf(location.origin) === 0 || url.startsWith('/')) {
        e.preventDefault();
        if (url.startsWith('/')) url = location.origin + url;
        var sep = url.indexOf('?') === -1 ? '?' : '&';
        location.href = url + sep + 'embed=1';
      }
      // External links — open in parent window
      else if (url.indexOf('http') === 0) {
        e.preventDefault();
        window.parent.postMessage({ type: 'gas-embed-navigate', url: url }, '*');
      }
    });
` : ''}
${mapPins.length > 0 && !compact && showMap ? `
    // === PROPERTY MAP ===
    (function() {
      var pins = ${mapDataJson};
      var mapEl = document.getElementById('property-map');
      if (!pins.length || !mapEl) return;
      var map = L.map('property-map', { scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      var bounds = [];
      var currency = '${defaultCurrency}';
      var markers = {};
      pins.forEach(function(p) {
        var label = '<strong>' + p.name + '</strong>' + (p.city ? '<br>' + p.city : '');
        if (p.rooms.length > 1) label += '<br>' + p.rooms.length + ' rooms';
        var marker = L.marker([p.lat, p.lng]).addTo(map);
        marker.bindPopup(label);
        markers[p.id] = marker;
        bounds.push([p.lat, p.lng]);
        // Click pin → scroll to first room card for this property
        marker.on('click', function() {
          var card = document.querySelector('.room-card[data-property-id="' + p.id + '"]');
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('highlighted');
            setTimeout(function() { card.classList.remove('highlighted'); }, 2000);
          }
        });
      });
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });

      // Card hover → open marker popup
      document.querySelectorAll('.room-card').forEach(function(card) {
        card.addEventListener('mouseenter', function() {
          var pid = card.dataset.propertyId;
          if (markers[pid]) markers[pid].openPopup();
        });
      });
    })();
` : ''}
  </script>
${showBranding ? `<div style="text-align:center;padding:1.5rem;font-size:0.75rem;color:#94a3b8;">Powered by <a href="https://gas.travel" style="color:#94a3b8;text-decoration:underline;" target="_blank">GAS.travel</a></div>` : ''}
</body>
</html>`;
}

function renderFullPage({ lite, images, amenities, reviews, availability, todayPrice, qrCode, liteUrl, showReviews, roomId, propertyId, accountId, activeOffer, lang = 'en', supportedLangs = ['en', 'es', 'fr', 'de', 'nl'], embed = false, litesStyle = {} }) {
  // Validate language
  if (!LITE_TRANSLATIONS[lang]) lang = 'en';

  // Style settings from account lites_style (same as booking page)
  const accent = litesStyle.btn_color || lite.accent_color || '#3b82f6';
  const btnTextColor = litesStyle.btn_text_color || '#ffffff';
  const btnRadius = litesStyle.btn_radius != null ? litesStyle.btn_radius : 6;
  const pageBg = litesStyle.page_bg || '#f8fafc';
  const cardBg = litesStyle.card_bg || '#ffffff';
  const textColor = litesStyle.text_color || '#1e293b';
  const headingFont = litesStyle.heading_font || 'Inter';
  const bodyFont = litesStyle.body_font || 'Inter';
  const cardRadius = litesStyle.card_radius != null ? litesStyle.card_radius : 10;
  const showBranding = litesStyle.show_branding !== false;

  // Use custom_title only if it's different from room_name (i.e., truly custom)
  const effectiveCustomTitle = (lite.custom_title && lite.custom_title !== lite.room_name) ? lite.custom_title : null;
  const title = effectiveCustomTitle || lite.display_name || lite.room_name || lite.property_name;

  // Short description for intro/tagline - with language support
  const rawShortDesc = lite.room_short_desc || lite.property_short_desc || '';
  const shortDescription = parseDescription(typeof rawShortDesc === 'object' ? (rawShortDesc[lang] || rawShortDesc.en || Object.values(rawShortDesc)[0]) : rawShortDesc);

  // Full description for details tab - with language support
  const rawFullDesc = lite.room_full_desc || lite.property_full_desc || lite.property_desc || rawShortDesc || '';
  const description = parseDescription(typeof rawFullDesc === 'object' ? (rawFullDesc[lang] || rawFullDesc.en || Object.values(rawFullDesc)[0]) : rawFullDesc);

  const currency = getCurrencySymbol(lite.currency);
  const currencyCode = lite.currency || 'USD';
  let price = todayPrice;
  let originalPrice = null;
  
  // Filter AVAILABLE_LANGUAGES to only show supported ones
  const displayLanguages = AVAILABLE_LANGUAGES.filter(l => supportedLangs.includes(l.code));
  
  // Build language switcher URL helper
  const currentSlug = lite.slug;
  const langSwitcherHtml = displayLanguages.length > 1 ? `
    <div class="lang-switcher" style="position: fixed; top: 12px; right: 12px; z-index: 1000;">
      <select id="langSelect" onchange="changeLanguage(this.value)" style="padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; font-size: 14px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        ${displayLanguages.map(l => `<option value="${l.code}" ${l.code === lang ? 'selected' : ''}>${l.flag} ${l.name}</option>`).join('')}
      </select>
    </div>
    <script>
      function changeLanguage(langCode) {
        const url = new URL(window.location.href);
        url.searchParams.set('lang', langCode);
        window.location.href = url.toString();
      }
    </script>
  ` : '';
  
  // Apply offer discount if present
  let offerBannerHtml = '';
  if (activeOffer) {
    originalPrice = price;
    if (activeOffer.discount_type === 'percent' || activeOffer.discount_type === 'percentage') {
      price = Math.round(price * (1 - (activeOffer.discount_value / 100)));
    } else if (activeOffer.discount_type === 'fixed') {
      price = Math.max(0, price - activeOffer.discount_value);
    } else if (activeOffer.custom_price) {
      price = activeOffer.custom_price;
    }
    
    const discountText = activeOffer.discount_type === 'percent' || activeOffer.discount_type === 'percentage'
      ? activeOffer.discount_value + '% OFF'
      : activeOffer.discount_type === 'fixed'
        ? currency + activeOffer.discount_value + ' OFF'
        : 'SPECIAL PRICE';
    
    const validUntil = activeOffer.valid_until 
      ? new Date(activeOffer.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : null;
    
    offerBannerHtml = `
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-align: center;">
        <div style="font-size: 1.5rem; font-weight: 800; margin-bottom: 4px;">🔥 ${discountText}</div>
        <div style="font-size: 0.9rem; opacity: 0.9;">
          ${activeOffer.name || 'Special Offer'}${validUntil ? ' • Valid until ' + validUntil : ''}
          ${activeOffer.min_nights > 1 ? ' • Min ' + activeOffer.min_nights + ' nights' : ''}
        </div>
      </div>
    `;
  }
  
  // Group amenities by category and parse names
  const amenByCategory = {};
  amenities.forEach(a => {
    const cat = a.category || 'General';
    if (!amenByCategory[cat]) amenByCategory[cat] = [];
    // Parse amenity name if it's JSON - use selected language
    let name = a.amenity_name;
    if (typeof name === 'object') {
      name = name[lang] || name.en || name.EN || Object.values(name)[0] || '';
    } else if (typeof name === 'string' && name.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(name);
        name = parsed[lang] || parsed.en || parsed.EN || Object.values(parsed)[0] || name;
      } catch (e) {}
    }
    amenByCategory[cat].push({ ...a, amenity_name: name });
  });
  
  // Calculate average rating from reviews
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((s,r) => s + (r.rating||0), 0) / reviews.length).toFixed(1) 
    : null;
  
  // Build availability calendar data (next 60 days)
  const availabilityJson = JSON.stringify(availability.map(a => ({
    date: a.date,
    available: a.is_available !== false && !a.is_blocked,
    price: a.price,
    minStay: a.min_stay
  })));

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${String(title).replace(/</g, '&lt;').replace(/>/g, '&gt;')} | Book Direct</title>
  <meta name="description" content="${String(description).substring(0,160).replace(/"/g, '&quot;')}">
  <meta property="og:title" content="${String(title).replace(/"/g, '&quot;')}">
  <meta property="og:image" content="${images[0]?.url || ''}">
  <meta property="og:url" content="${liteUrl}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700${headingFont !== 'Inter' ? '&family=' + encodeURIComponent(headingFont) + ':wght@400;500;600;700' : ''}${bodyFont !== 'Inter' && bodyFont !== headingFont ? '&family=' + encodeURIComponent(bodyFont) + ':wght@400;500;600;700' : ''}&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  ${lang !== 'en' ? `<script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/${lang === 'es' ? 'es' : lang === 'fr' ? 'fr' : lang === 'de' ? 'de' : lang === 'nl' ? 'nl' : 'default'}.js"></script>` : ''}
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    :root { --accent: ${accent}; --btn-text: ${btnTextColor}; --btn-radius: ${btnRadius}px; --card-bg: ${cardBg}; --card-radius: ${cardRadius}px; --text-color: ${textColor}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: '${bodyFont}', system-ui, sans-serif; color: ${textColor}; line-height: 1.6; background: ${pageBg}; min-height: 100vh; }
    h1, h2, h3, h4 { font-family: '${headingFont}', system-ui, sans-serif; }
    .page-wrapper { background: ${pageBg}; margin: 0 auto; max-width: 1400px; min-height: 100vh; box-shadow: 0 0 60px rgba(0,0,0,0.1); }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    
    /* Language Switcher */
    .lang-switcher { position: fixed; top: 12px; right: 12px; z-index: 1000; }
    .lang-switcher select { padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; background: white; font-size: 14px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    
    /* Header */
    .header { background: white; border-bottom: 1px solid #e2e8f0; padding: 12px 40px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
    .header-brand { display: flex; align-items: center; gap: 12px; }
    .logo { font-weight: 700; font-size: 16px; color: var(--accent); text-decoration: none; }
    .header-presents { font-size: 14px; color: #64748b; }
    .header-presents strong { color: #1e293b; font-weight: 600; }
    .share-btn { background: none; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; }
    
    /* Gallery */
    .gallery { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; height: 400px; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
    .gallery.gallery-full { grid-template-columns: 1fr; }
    .gallery-main { width: 100%; height: 100%; object-fit: cover; cursor: pointer; }
    .gallery-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 4px; }
    .gallery-thumb { width: 100%; height: 100%; object-fit: cover; cursor: pointer; transition: opacity 0.2s; }
    .gallery-thumb:hover { opacity: 0.85; }
    .gallery-more { position: relative; cursor: pointer; }
    .gallery-more img { width: 100%; height: 100%; object-fit: cover; }
    .gallery-more-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; }
    
    /* Lightbox */
    .lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1000; align-items: center; justify-content: center; }
    .lightbox.active { display: flex; }
    .lightbox img { max-width: 80vw; max-height: 80vh; object-fit: contain; cursor: pointer; border-radius: var(--card-radius); }
    .lightbox-close { position: absolute; top: 20px; right: 20px; background: white; border: none; width: 40px; height: 40px; border-radius: 50%; font-size: 24px; cursor: pointer; }
    .lightbox-nav { position: absolute; top: 50%; transform: translateY(-50%); background: white; border: none; width: 50px; height: 50px; border-radius: 50%; font-size: 24px; cursor: pointer; }
    .lightbox-prev { left: 20px; }
    .lightbox-next { right: 20px; }
    
    /* Layout */
    .room-layout { display: grid; grid-template-columns: 1fr 380px; gap: 32px; }
    @media (max-width: 900px) { 
      .room-layout { grid-template-columns: 1fr; } 
      .gallery { height: 300px; grid-template-columns: 1fr; }
      .gallery-grid { display: none; }
    }
    
    /* Mobile responsive fixes */
    @media (max-width: 600px) {
      /* Calendar mobile fixes */
      .calendar-header { flex-direction: column; gap: 8px; }
      .calendar-months-wrapper { flex-direction: column; gap: 24px; overflow-x: hidden; align-items: center; }
      .calendar-month-col { min-width: 0; width: 100%; max-width: 320px; }
      .calendar-grid { gap: 2px; }
      .calendar-day { padding: 8px 2px; font-size: 12px; }
      .calendar-day .price { font-size: 8px; }
      .cal-nav-btn { margin-top: 0; }
      .calendar-container { display: flex; flex-direction: column; align-items: center; }
      .calendar-legend { justify-content: center; }
      
      /* Booking card mobile fixes */
      .booking-card { padding: 16px; position: relative; top: 0; overflow: visible; }
      .date-inputs { grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
      .guest-fields { grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
      .date-field { min-width: 0; }
      .date-field input, .guest-field select { padding: 10px 8px; font-size: 14px; width: 100%; box-sizing: border-box; }
      .price-display { text-align: center; }
      .price-amount { font-size: 24px; }
      
      /* Tabs mobile */
      .tabs-nav { gap: 4px; justify-content: center; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 8px; }
      .tab-btn { padding: 8px 14px; font-size: 13px; white-space: nowrap; flex-shrink: 0; margin-right: 4px; margin-bottom: 0; }
      
      /* Form rows mobile */
      .form-row { grid-template-columns: 1fr; }
      
      /* Room header mobile */
      .room-title { font-size: 1.4rem; }
      .room-meta { gap: 12px; justify-content: center; }
      
      /* General container padding */
      .container { padding: 0 12px; }
    }
    
    @media (max-width: 400px) {
      /* Extra small screens */
      .calendar-day { padding: 6px 1px; font-size: 11px; }
      .calendar-day .price { font-size: 7px; }
      .date-inputs { grid-template-columns: 1fr; gap: 12px; }
      .guest-fields { grid-template-columns: 1fr; gap: 12px; }
      .tab-btn { padding: 6px 10px; font-size: 12px; }
    }
    
    /* Room Header */
    .room-header { margin-bottom: 24px; }
    .room-title { font-size: 1.75rem; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .room-subtitle { color: #64748b; font-size: 0.95rem; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    .room-meta { display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 24px; }
    .meta-item { display: flex; align-items: center; gap: 8px; color: #475569; font-size: 0.9rem; }
    .meta-icon { opacity: 0.7; }
    .more-info { margin-top: 20px; }
    .more-info summary { color: var(--accent); cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .more-info summary:hover { text-decoration: underline; }
    .more-info .more-content { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
    .meta-item { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #64748b; }
    .rating-badge { background: var(--accent); color: white; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 14px; }
    
    /* Tabs */
    .tabs-nav { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 24px; }
    .tab-btn { padding: 10px 20px; border: 1px solid #e2e8f0; background: ${cardBg}; font-size: 14px; font-weight: 500; color: #64748b; cursor: pointer; border-radius: var(--btn-radius); margin-right: 8px; margin-bottom: 8px; transition: all 0.2s; }
    .tab-btn:hover { border-color: var(--accent); color: var(--accent); background: #f1f5f9; }
    .tab-btn.active { background: var(--accent); color: var(--btn-text); border-color: var(--accent); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    
    /* Description */
    .description { font-size: 15px; line-height: 1.8; }
    .description p { margin-bottom: 16px; }
    
    /* Amenities */
    .amenities-category { margin-bottom: 24px; }
    .amenities-category h4 { font-size: 14px; font-weight: 600; color: #64748b; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
    .amenities-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
    .amenity-item { display: flex; align-items: center; gap: 10px; padding: 10px; background: white; border-radius: 8px; font-size: 14px; }
    
    /* Reviews */
    .reviews-summary { display: flex; align-items: center; gap: 20px; padding: 20px; background: linear-gradient(135deg, var(--accent), #8b5cf6); border-radius: 12px; color: white; margin-bottom: 24px; }
    .reviews-avg { font-size: 48px; font-weight: 700; line-height: 1; }
    .review-card { background: var(--card-bg); border-radius: var(--card-radius); padding: 20px; margin-bottom: 16px; }
    .review-header { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .reviewer-name { font-weight: 600; }
    .review-date { color: #64748b; font-size: 13px; }
    .review-rating { color: #fbbf24; }
    
    /* Availability Calendar */
    .calendar-container { margin-top: 16px; }
    .calendar-header { display: flex; align-items: flex-start; gap: 16px; }
    .cal-nav-btn { background: white; border: 1px solid #e2e8f0; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; color: #64748b; font-size: 16px; margin-top: 24px; }
    .cal-nav-btn:hover { background: #f1f5f9; }
    .calendar-months-wrapper { display: flex; gap: 32px; flex: 1; }
    .calendar-month-col { flex: 1; }
    .calendar-month-col h3 { text-align: left; margin-bottom: 16px; font-size: 1rem; color: #1e293b; font-weight: 600; }
    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .calendar-day-header { text-align: center; font-size: 12px; color: #64748b; padding: 8px 0; font-weight: 500; }
    .calendar-day { text-align: center; padding: 10px 4px; border-radius: 8px; font-size: 13px; cursor: pointer; }
    .calendar-day.available { background: #dcfce7; color: #166534; }
    .calendar-day.unavailable { background: #ffe4e6; color: #9f1239; }
    .calendar-day.empty { background: transparent; cursor: default; color: #cbd5e1; }
    .calendar-day.today { border: 2px solid var(--accent); }
    .calendar-day:hover:not(.empty):not(.unavailable) { background: #bbf7d0; }
    .calendar-day .price { font-size: 9px; opacity: 0.8; }
    .calendar-legend { display: flex; gap: 16px; margin-top: 16px; font-size: 12px; color: #64748b; }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-dot { width: 12px; height: 12px; border-radius: 3px; }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-dot { width: 12px; height: 12px; border-radius: 3px; }
    
    /* Booking Card */
    .booking-card { background: var(--card-bg); border-radius: var(--card-radius); box-shadow: 0 4px 20px rgba(0,0,0,0.1); padding: 24px; position: sticky; top: 80px; }
    .price-display { margin-bottom: 20px; }
    .price-amount { font-size: 28px; font-weight: 700; }
    .price-period { color: #64748b; font-size: 14px; }
    .date-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .date-field label { display: block; font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
    .date-field input, .guest-field select { width: 100%; padding: 12px; border: 2px solid ${accent}4D; border-radius: var(--btn-radius); font-size: 14px; cursor: pointer; background: white; }
    .date-field input:focus, .guest-field select:focus { outline: none; border-color: var(--accent); }
    .guest-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .guest-field label { display: block; font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; text-transform: uppercase; }
    .child-age-hint { font-size: 10px; font-weight: 400; color: #94a3b8; }
    .availability-msg { padding: 12px; border-radius: 8px; margin-bottom: 12px; font-size: 14px; }
    .availability-msg.error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
    .availability-msg.warning { background: #fffbeb; border: 1px solid #fde68a; color: #b45309; }
    .availability-msg.info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }
    .book-btn { width: 100%; padding: 16px; background: var(--accent); color: var(--btn-text); border: none; border-radius: var(--btn-radius); font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; }
    .book-btn:hover { filter: brightness(0.95); }
    .book-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
    .btn-loading { display: none; }
    .book-btn.loading .btn-text { display: none; }
    .book-btn.loading .btn-loading { display: inline; }
    
    /* Special Offer Banner */
    .offer-banner { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 16px; margin-bottom: 16px; display: none; }
    .offer-banner.visible { display: block; }
    .offer-banner-badge { display: inline-block; background: #f59e0b; color: white; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; margin-bottom: 8px; }
    .offer-banner-title { font-size: 15px; font-weight: 600; color: #92400e; margin-bottom: 4px; }
    .offer-banner-hint { font-size: 13px; color: #a16207; }
    
    /* Rate Options */
    .rate-options-section { margin: 16px 0; padding: 0; }
    .rate-options-section h4 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #64748b; }
    .rate-options-list { display: flex; flex-direction: column; gap: 10px; }
    .rate-option { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; background: var(--card-bg); border: 2px solid #e2e8f0; border-radius: var(--card-radius); cursor: pointer; transition: all 0.2s; }
    .rate-option:hover { border-color: #cbd5e1; }
    .rate-option.selected { border-color: var(--accent); background: rgba(59, 130, 246, 0.02); }
    .rate-option-radio { width: 20px; height: 20px; border: 2px solid #cbd5e1; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
    .rate-option.selected .rate-option-radio { border-color: var(--accent); }
    .rate-option.selected .rate-option-radio::after { content: ''; width: 10px; height: 10px; background: var(--accent); border-radius: 50%; }
    .rate-option-info { flex: 1; }
    .rate-option-name { font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
    .rate-option-features { display: flex; flex-direction: column; gap: 2px; }
    .rate-option-feature { font-size: 13px; display: flex; align-items: center; gap: 4px; }
    .rate-option-feature.positive { color: #059669; }
    .rate-option-feature.negative { color: #dc2626; }
    .rate-option-badge { display: inline-block; background: #dcfce7; color: #166534; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; margin-left: 8px; }
    
    .price-breakdown { margin: 16px 0; padding: 16px 0; border-top: 1px solid #e2e8f0; }
    .price-breakdown h4 { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
    .breakdown-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #475569; }
    .breakdown-row.discount { color: #059669; }
    .breakdown-row.tax-row { color: #64748b; font-size: 13px; }
    .deposit-section { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0; }
    .deposit-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .deposit-row:first-child { font-weight: 600; color: var(--accent); }
    .deposit-row.balance { color: #64748b; font-size: 13px; }
    
    /* Stripe Card Element */
    .stripe-section { margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
    .stripe-section h4 { font-size: 14px; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .stripe-section h4 .lock-icon { color: #059669; }
    #card-element { padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; }
    #card-errors { color: #dc2626; font-size: 13px; margin-top: 8px; min-height: 20px; }
    .stripe-badge { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; margin-top: 12px; }
    .stripe-badge img { height: 20px; }
    .stripe-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; text-align: center; color: #dc2626; }
    .breakdown-total { display: flex; justify-content: space-between; padding-top: 12px; margin-top: 8px; border-top: 2px solid #e2e8f0; font-weight: 700; font-size: 16px; }
    .upsells-section { margin: 16px 0; padding: 16px 0; border-top: 1px solid #e2e8f0; }
    .upsells-section h4 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #1e293b; }
    .upsell-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; }
    .upsell-item:hover { background: #f1f5f9; }
    .upsell-item.selected { background: #eff6ff; border-color: var(--accent); }
    .upsell-checkbox { width: 20px; height: 20px; border: 2px solid #e2e8f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .upsell-item.selected .upsell-checkbox { background: var(--accent); border-color: var(--accent); }
    .upsell-item.selected .upsell-checkbox::after { content: '✓'; color: white; font-size: 12px; font-weight: bold; }
    .upsell-info { flex: 1; }
    .upsell-name { font-size: 14px; font-weight: 600; }
    .upsell-desc { font-size: 12px; color: #64748b; }
    .upsell-price { font-weight: 700; font-size: 14px; color: var(--accent); }
    .upsell-price small { font-weight: 400; font-size: 11px; color: #64748b; }
    .upsell-category { font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 12px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
    
    /* Voucher Section */
    .voucher-section { margin: 16px 0; padding-top: 16px; border-top: 1px solid #e2e8f0; }
    .voucher-toggle { font-size: 13px; color: var(--accent); cursor: pointer; text-align: center; }
    .voucher-toggle:hover { text-decoration: underline; }
    .voucher-row { display: flex; gap: 8px; margin-top: 10px; }
    .voucher-input { flex: 1; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; text-transform: uppercase; }
    .voucher-input:focus { outline: none; border-color: var(--accent); }
    .voucher-apply-btn { padding: 10px 16px; background: var(--accent); color: var(--btn-text); border: none; border-radius: var(--btn-radius); font-weight: 600; font-size: 13px; cursor: pointer; }
    .voucher-apply-btn:hover { filter: brightness(0.9); }
    .voucher-applied { display: flex; align-items: center; justify-content: space-between; background: #dcfce7; border: 1px solid #86efac; padding: 10px 14px; border-radius: 6px; margin-top: 10px; }
    .voucher-name { font-size: 13px; font-weight: 600; color: #166534; }
    .voucher-remove { background: none; border: none; color: #166534; cursor: pointer; font-size: 18px; padding: 0 4px; }
    .voucher-remove:hover { color: #dc2626; }
    .voucher-msg { font-size: 13px; margin-top: 8px; }
    .voucher-msg.success { color: #059669; }
    .voucher-msg.error { color: #dc2626; }
    
    /* Multi-step Checkout */
    .checkout-step { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .step-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .step-header h3 { flex: 1; font-size: 16px; margin: 0; }
    .back-btn { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 14px; padding: 0; }
    .back-btn:hover { text-decoration: underline; }
    .steps-indicator { display: flex; gap: 8px; margin-bottom: 20px; }
    .steps-indicator .step { width: 28px; height: 28px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; color: #94a3b8; }
    .steps-indicator .step.active { background: var(--accent); color: white; }
    .steps-indicator .step.completed { background: #10b981; color: white; }
    
    /* Guest Form */
    .guest-form-full { }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .form-field { }
    .form-field.full { grid-column: 1 / -1; }
    .form-field label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; }
    .form-field label .required { color: #ef4444; }
    .form-field label .optional { color: #94a3b8; font-weight: 400; font-size: 12px; }
    .form-field input, .form-field select, .form-field textarea { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; font-family: inherit; }
    .form-field input:focus, .form-field select:focus, .form-field textarea:focus { outline: none; border-color: var(--accent); }
    .form-field textarea { resize: vertical; min-height: 80px; }
    .field-hint { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .checkbox-label { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 13px; color: #64748b; }
    .checkbox-label input { width: auto; margin-top: 2px; }
    .email-match-status { font-size: 12px; margin-top: 4px; }
    .email-match-status.match { color: #10b981; }
    .email-match-status.mismatch { color: #ef4444; }
    
    /* Payment Options */
    .payment-options { margin-bottom: 16px; }
    .payment-option { display: flex; align-items: flex-start; gap: 12px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; margin-bottom: 8px; transition: all 0.2s; }
    .payment-option:hover { border-color: #cbd5e1; }
    .payment-option.selected { border-color: var(--accent); background: rgba(37, 99, 235, 0.05); }
    .payment-option.disabled { opacity: 0.5; cursor: not-allowed; }
    .payment-option input { margin-top: 4px; }
    .payment-content { flex: 1; display: flex; gap: 12px; }
    .payment-icon { font-size: 24px; }
    .payment-details { }
    .payment-details strong { display: block; font-size: 14px; }
    .payment-details span { font-size: 13px; color: #64748b; }
    .deposit-info { background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
    .deposit-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .card-element { padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; }
    
    /* Step Navigation */
    .step-nav { display: flex; justify-content: space-between; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
    .btn-secondary { padding: 12px 20px; background: white; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
    .btn-secondary:hover { background: #f8fafc; }
    .btn-primary { padding: 12px 20px; background: var(--accent); color: var(--btn-text); border: none; border-radius: var(--btn-radius); font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .btn-primary:hover { filter: brightness(0.95); }
    .btn-primary:disabled { background: #cbd5e1; cursor: not-allowed; }
    
    /* Booking Summary Mini */
    .booking-summary-mini { background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .summary-row.total { font-weight: 700; border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px; }
    
    /* Confirmation */
    .confirmation { text-align: center; padding: 20px 0; }
    .confirmation-icon { width: 64px; height: 64px; background: #10b981; color: white; font-size: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
    .confirmation h3 { font-size: 20px; margin-bottom: 8px; }
    .booking-ref { font-size: 24px; font-weight: 700; color: var(--accent); margin-bottom: 8px; }
    .confirmation-email { font-size: 14px; color: #64748b; margin-bottom: 20px; }
    .confirmation-details { text-align: left; background: #f8fafc; border-radius: 8px; padding: 16px; }
    .conf-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .conf-row:last-child { border-bottom: none; }
    .conf-row.total { font-weight: 700; }
    .confirmation-note { font-size: 13px; color: #64748b; margin-top: 16px; }
    
    /* QR Section */
    .qr-section { display: flex; align-items: center; gap: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .qr-section img { width: 60px; height: 60px; }
    .qr-text { font-size: 12px; color: #64748b; }
    
    /* Map */
    .map-section { margin-top: 24px; border-radius: 12px; overflow: hidden; height: 300px; }
    .map-section iframe { width: 100%; height: 100%; border: none; }
    
    /* Accordion */
    .accordion-item { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; overflow: hidden; }
    .accordion-header { width: 100%; padding: 16px 20px; background: white; border: none; display: flex; justify-content: space-between; cursor: pointer; font-size: 15px; font-weight: 500; text-align: left; }
    .accordion-content { padding: 0 20px; max-height: 0; overflow: hidden; transition: all 0.3s; }
    .accordion-item.open .accordion-content { padding: 0 20px 20px; max-height: 2000px; }
    .terms-list { list-style: none; padding: 0; margin: 0 0 16px 0; }
    .terms-list li { padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #475569; }
    .terms-list li:last-child { border-bottom: none; }
    .terms-list strong { color: #1e293b; }
    .house-rules-text { color: #475569; line-height: 1.7; white-space: pre-wrap; }
    .policy-type { color: #475569; text-transform: capitalize; }
    .accordion-icon { font-size: 20px; transition: transform 0.3s; }
    .accordion-item.open .accordion-icon { transform: rotate(45deg); }
    
    /* Flatpickr custom */
    .flatpickr-calendar { font-family: 'Inter', system-ui, sans-serif; }
    .flatpickr-day.selected { background: var(--accent) !important; border-color: var(--accent) !important; }
    
    /* Footer */
    .footer { text-align: center; padding: 40px 20px; color: #64748b; font-size: 13px; background: white; border-top: 1px solid #e2e8f0; }
    .footer a { color: var(--accent); text-decoration: none; }
  </style>
</head>
<body>
  <!-- Language Switcher -->
  <div class="lang-switcher">
    <select id="langSelect" onchange="changeLanguage(this.value)">
      ${displayLanguages.map(l => `<option value="${l.code}" ${l.code === lang ? 'selected' : ''}>${l.flag} ${l.name}</option>`).join('')}
    </select>
  </div>
  <script>
    function changeLanguage(langCode) {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', langCode);
      window.location.href = url.toString();
    }
  </script>
  
  <div class="page-wrapper">
  ${offerBannerHtml}
  <header class="header">
    <div class="header-brand">
      <a href="javascript:history.back()" class="back-link" style="display:flex;align-items:center;gap:6px;text-decoration:none;color:var(--accent);font-weight:600;font-size:14px;">← ${t('back', lang)}</a>
      ${(lite.account_display_name || lite.business_name) ? `<span class="header-presents" style="color:#64748b;font-size:14px;">${escapeForHTML(lite.account_display_name || lite.business_name)}</span>` : ''}
    </div>
    <button class="share-btn" onclick="shareProperty()">📤 Share</button>
  </header>
  
  <div class="container">
    <div class="gallery${images.length < 5 ? ' gallery-full' : ''}">
      ${images.length > 0 ? `
        <img src="${images[0].url}" alt="${escapeForHTML(title)}" class="gallery-main" onclick="openLightbox(0)">
        ${images.length >= 5 ? `<div class="gallery-grid">
          ${images.slice(1, 5).map((img, i) => {
            if (i === 3 && images.length > 5) {
              return `<div class="gallery-more" onclick="openLightbox(4)">
                <img src="${img.url}" alt="">
                <div class="gallery-more-overlay">+${images.length - 5} more</div>
              </div>`;
            }
            return `<img src="${img.url}" alt="" class="gallery-thumb" onclick="openLightbox(${i + 1})">`;
          }).join('')}
        </div>` : ''}
      ` : `<div style="background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:60px;grid-column:1/-1;">🏠</div>`}
    </div>
    
    <div class="lightbox" id="lightbox">
      <button class="lightbox-close" onclick="closeLightbox()">×</button>
      <button class="lightbox-nav lightbox-prev" onclick="navLightbox(-1)">‹</button>
      <img src="" id="lightbox-img" alt="" onclick="closeLightbox()">
      <button class="lightbox-nav lightbox-next" onclick="navLightbox(1)">›</button>
    </div>
    
    <div class="room-layout">
      <div class="room-main">
        <div class="room-header">
          <h1 class="room-title">${escapeForHTML(title)}</h1>
          <p class="room-subtitle">${escapeForHTML(lite.city || '')}${lite.city && lite.country ? ', ' : ''}${escapeForHTML(lite.country || '')}</p>
          <div class="room-meta">
            ${lite.max_guests ? `<span class="meta-item"><span class="meta-icon">👤</span> ${t('sleeps', lang)}: ${lite.max_guests}</span>` : ''}
            ${lite.bedroom_count ? `<span class="meta-item"><span class="meta-icon">🛏</span> ${t('bedrooms', lang)}: ${lite.bedroom_count}</span>` : ''}
            ${lite.bathroom_count ? `<span class="meta-item"><span class="meta-icon">🚿</span> ${t('bathrooms', lang)}: ${Math.floor(lite.bathroom_count)}</span>` : ''}
            ${lite.room_type ? `<span class="meta-item"><span class="meta-icon">🏠</span> ${lite.room_type}</span>` : ''}
          </div>
        </div>
        
        <div class="tabs">
          <div class="tabs-nav">
            <button class="tab-btn active" onclick="showTab('description', this)">${t('description', lang)}</button>
            <button class="tab-btn" onclick="showTab('availability', this)">${t('available', lang)}</button>
            <button class="tab-btn" onclick="showTab('features', this)">${t('amenities', lang)}</button>
            ${showReviews ? `<button class="tab-btn" onclick="showTab('reviews', this)">${t('reviews', lang)}</button>` : ''}
            <button class="tab-btn" onclick="showTab('terms', this)">${t('policies', lang)}</button>
          </div>
          
          <div class="tab-content active" id="tab-description">
            <div class="description">
              ${shortDescription ? `<p>${shortDescription.replace(/\n/g, ' ')}</p>` : ''}
              ${description && description !== shortDescription ? `
                <details class="more-info">
                  <summary>${t('more_info', lang)}</summary>
                  <div class="more-content">
                    ${description.split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}
                  </div>
                </details>
              ` : ''}
            </div>
          </div>
          
          <div class="tab-content" id="tab-features">
            ${Object.keys(amenByCategory).length > 0 ? 
              Object.entries(amenByCategory).map(([cat, items]) => `
                <div class="amenities-category">
                  <h4>${cat}</h4>
                  <div class="amenities-grid">
                    ${items.map(a => `<div class="amenity-item"><span>${a.icon || '✓'}</span><span>${a.amenity_name}</span></div>`).join('')}
                  </div>
                </div>
              `).join('')
            : '<p style="color:#64748b;">No amenities listed.</p>'}
          </div>
          
          <div class="tab-content" id="tab-availability">
            <div class="calendar-container">
              <div class="calendar-header">
                <button class="cal-nav-btn" onclick="prevMonth()">‹</button>
                <div class="calendar-months-wrapper">
                  <div class="calendar-month-col">
                    <h3 id="calendar-month-1">Loading...</h3>
                    <div class="calendar-grid" id="calendar-grid-1"></div>
                  </div>
                  <div class="calendar-month-col">
                    <h3 id="calendar-month-2">Loading...</h3>
                    <div class="calendar-grid" id="calendar-grid-2"></div>
                  </div>
                </div>
                <button class="cal-nav-btn" onclick="nextMonth()">›</button>
              </div>
              <div class="calendar-legend">
                <div class="legend-item"><div class="legend-dot" style="background:#dcfce7;"></div> ${t('available', lang)}</div>
                <div class="legend-item"><div class="legend-dot" style="background:#ffe4e6;"></div> ${t('unavailable', lang)}</div>
              </div>
            </div>
          </div>
          
          ${showReviews ? `
          <div class="tab-content" id="tab-reviews">
            ${reviews.length > 0 ? `
              <div class="reviews-summary">
                <div><div class="reviews-avg">${avgRating}</div><div style="color:#fbbf24;font-size:20px;">★★★★★</div></div>
                <div><div>${reviews.length} review${reviews.length !== 1 ? 's' : ''}</div><div style="font-size:13px;opacity:0.8;">Guest ratings</div></div>
              </div>
              ${reviews.map(r => `
                <div class="review-card">
                  <div class="review-header">
                    <div><div class="reviewer-name">${r.guest_name || 'Guest'}</div>
                    <div class="review-date">${r.review_date ? new Date(r.review_date).toLocaleDateString() : ''}</div></div>
                    <div class="review-rating">${'★'.repeat(Math.round(r.rating || 5))}</div>
                  </div>
                  <div>${r.comment || ''}</div>
                </div>
              `).join('')}
            ` : '<p style="color:#64748b;text-align:center;padding:40px;">No reviews yet.</p>'}
          </div>
          ` : ''}
          
          <div class="tab-content" id="tab-terms">
            <div class="accordion-item">
              <button class="accordion-header" onclick="toggleAccordion(this)"><span>${t('policies', lang)}</span><span class="accordion-icon">+</span></button>
              <div class="accordion-content">
                <ul class="terms-list">
                  <li><strong>${t('check_in', lang)}:</strong> ${lite.check_in_time || '3:00 PM'}</li>
                  <li><strong>${t('check_out', lang)}:</strong> ${lite.check_out_time || '11:00 AM'}</li>
                  <li><strong>${t('children', lang) || 'Children'}:</strong> ${lite.children_allowed ? t('children_welcome', lang) || 'Children of all ages welcome' : t('no_children', lang) || 'Not suitable for children'}</li>
                  <li><strong>${t('events', lang) || 'Events'}:</strong> ${lite.events_allowed ? t('events_allowed', lang) || 'Events allowed' : t('no_events', lang) || 'No events or parties'}</li>
                </ul>
              </div>
            </div>
            <div class="accordion-item">
              <button class="accordion-header" onclick="toggleAccordion(this)"><span>${t('house_rules', lang)}</span><span class="accordion-icon">+</span></button>
              <div class="accordion-content">
                <ul class="terms-list">
                  <li><strong>${t('smoking', lang) || 'Smoking'}:</strong> ${lite.smoking_allowed ? t('smoking_allowed', lang) || 'Smoking allowed' : t('no_smoking', lang) || 'No smoking'}</li>
                  <li><strong>${t('pets', lang) || 'Pets'}:</strong> ${lite.pets_allowed ? t('pets_allowed', lang) || 'Pets allowed' : t('no_pets', lang) || 'No pets allowed'}</li>
                  ${lite.quiet_hours_start ? `<li><strong>${t('quiet_hours', lang) || 'Quiet hours'}:</strong> ${lite.quiet_hours_start} - ${lite.quiet_hours_end || '08:00'}</li>` : ''}
                </ul>
                ${lite.house_rules ? `<div class="house-rules-text">${parseDescription(lite.house_rules)}</div>` : ''}
              </div>
            </div>
            <div class="accordion-item">
              <button class="accordion-header" onclick="toggleAccordion(this)"><span>${t('cancellation', lang)}</span><span class="accordion-icon">+</span></button>
              <div class="accordion-content">
                <p class="policy-type">${lite.cancellation_policy || t('contact_for_cancellation', lang) || 'Contact host for cancellation policy'}</p>
              </div>
            </div>
          </div>
          
          <div class="tab-content" id="tab-location">
            ${lite.latitude && lite.longitude ? `
              <div class="map-section">
                <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lite.longitude)-0.01},${parseFloat(lite.latitude)-0.01},${parseFloat(lite.longitude)+0.01},${parseFloat(lite.latitude)+0.01}&layer=mapnik&marker=${lite.latitude},${lite.longitude}"></iframe>
              </div>
            ` : '<p>Location not available.</p>'}
          </div>
        </div>
      </div>
      
      <div class="room-sidebar">
        <div class="booking-card">
          <!-- Step 0: Initial booking selection -->
          <div id="bookingStep0">
            <!-- Special Offer Banner (at top) -->
            <div id="offerBanner" class="offer-banner">
              <div class="offer-banner-badge">🎉 Special Offer</div>
              <div class="offer-banner-title">We have special rates available for your dates!</div>
              <div class="offer-banner-hint">See rate options below ↓</div>
            </div>
            
            <div class="price-display">
              <span class="price-amount">${t('select_dates', lang)}</span>
            </div>
            <div class="date-inputs">
              <div class="date-field"><label>${t('check_in', lang)}</label><input type="text" id="checkin" placeholder="${t('select_dates', lang)}" readonly></div>
              <div class="date-field"><label>${t('check_out', lang)}</label><input type="text" id="checkout" placeholder="${t('select_dates', lang)}" readonly></div>
            </div>
            <div class="guest-fields">
              <div class="guest-field"><label>${t('guests', lang)}</label><select id="adults">${Array.from({length: Math.min(parseInt(lite.max_guests) || 8, 20)}, (_, i) => i + 1).map(n => `<option value="${n}">${n}</option>`).join('')}</select></div>
              <div class="guest-field"><label>${lang === 'en' ? 'Children' : t('guests', lang)} <span class="child-age-hint">(${lang === 'en' ? 'under 12' : '<12'})</span></label><select id="children">${Array.from({length: Math.min((parseInt(lite.max_guests) || 8) + 1, 11)}, (_, i) => i).map(n => `<option value="${n}">${n}</option>`).join('')}</select></div>
            </div>
            
            <!-- Min stay / availability message -->
            <div id="availabilityMsg" class="availability-msg" style="display:none;"></div>
            
            <!-- Rate Options (shown when offers available) -->
            <div id="rateOptionsSection" class="rate-options-section" style="display:none;">
              <h4>Choose your rate:</h4>
              <div id="rateOptionsList" class="rate-options-list"></div>
            </div>
            
            <!-- Price breakdown -->
            <div id="priceBreakdown" class="price-breakdown" style="display:none;">
              <h4>${t('price_breakdown', lang)}</h4>
              <div class="breakdown-row" id="nightlyRow"><span></span><span></span></div>
              <div class="breakdown-row" id="cleaningRow" style="display:none;"><span>${t('cleaning_fee', lang)}</span><span></span></div>
              <div class="breakdown-row" id="upsellsRow" style="display:none;"><span>Extras</span><span></span></div>
              <div class="breakdown-row discount" id="discountRow" style="display:none;"><span></span><span></span></div>
              <div id="taxesContainer"></div>
              <div class="breakdown-total"><span>${t('total', lang)}</span><span id="totalAmount"></span></div>
              <div id="depositSection" class="deposit-section" style="display:none;">
                <div class="deposit-row"><span>Due now (deposit)</span><span id="depositAmount"></span></div>
                <div class="deposit-row balance"><span>Balance due later</span><span id="balanceAmount"></span></div>
              </div>
            </div>
            
            <!-- Upsells section -->
            <div id="upsellsSection" class="upsells-section" style="display:none;">
              <h4>✨ Enhance your stay</h4>
              <div id="upsellsList"></div>
            </div>
            
            <!-- Voucher toggle -->
            <div class="voucher-section" id="voucherSection" style="display:none;">
              <div class="voucher-toggle" onclick="toggleVoucherInput()">🎟️ ${t('promo_code', lang)}</div>
              <div class="voucher-input-wrapper" id="voucherInputWrapper" style="display:none;">
                <div class="voucher-row">
                  <input type="text" id="voucherCode" placeholder="Enter code" class="voucher-input">
                  <button type="button" id="applyVoucher" class="voucher-apply-btn">Apply</button>
                </div>
              </div>
              <div id="voucherApplied" class="voucher-applied" style="display:none;">
                <span class="voucher-name"></span>
                <button type="button" class="voucher-remove" onclick="removeVoucher()">×</button>
              </div>
              <div id="voucherMsg" class="voucher-msg"></div>
            </div>
            
            <!-- Book Button (at bottom after all options) -->
            <button class="book-btn" id="bookBtn" disabled>
              <span class="btn-text">${t('select_dates', lang)}</span>
              <span class="btn-loading" style="display:none;">${t('loading', lang) || 'Loading...'}</span>
            </button>
          </div>
          
          <!-- Step 1: Guest Details -->
          <div id="bookingStep1" class="checkout-step" style="display:none;">
            <div class="step-header">
              <button class="back-btn" onclick="goToStep(0)">← ${t('back', lang)}</button>
              <h3>👤 ${t('guest_details', lang)}</h3>
            </div>
            <div class="steps-indicator">
              <div class="step active" data-step="1">1</div>
              <div class="step" data-step="2">2</div>
              <div class="step" data-step="3">3</div>
            </div>
            
            <form id="guestForm" class="guest-form-full">
              <div class="form-row">
                <div class="form-field">
                  <label>${t('first_name', lang)} <span class="required">*</span></label>
                  <input type="text" id="firstName" name="first_name" required placeholder="John">
                </div>
                <div class="form-field">
                  <label>${t('last_name', lang)} <span class="required">*</span></label>
                  <input type="text" id="lastName" name="last_name" required placeholder="Smith">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-field full">
                  <label>${t('email', lang)} <span class="required">*</span></label>
                  <input type="email" id="guestEmail" name="email" required placeholder="john@example.com">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-field full">
                  <label>${lang === 'en' ? 'Confirm Email' : t('email', lang)} <span class="required">*</span></label>
                  <input type="email" id="confirmEmail" name="confirm_email" required placeholder="john@example.com">
                  <div class="email-match-status"></div>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-field">
                  <label>${t('phone', lang)} <span class="required">*</span></label>
                  <input type="tel" id="guestPhone" name="phone" required placeholder="+1 555 123 4567">
                </div>
                <div class="form-field">
                  <label>${lang === 'en' ? 'Country' : t('country', lang) || 'Country'}</label>
                  <select id="guestCountry" name="country">
                    <option value="GB">United Kingdom</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="ES">Spain</option>
                    <option value="IT">Italy</option>
                    <option value="NL">Netherlands</option>
                    <option value="PH">Philippines</option>
                    <option value="TH">Thailand</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-field full">
                  <label>${lang === 'en' ? 'Address' : t('address', lang) || 'Address'} <span class="optional">(${lang === 'en' ? 'optional' : t('optional', lang) || 'optional'})</span></label>
                  <input type="text" id="guestAddress" name="address" placeholder="123 Main Street">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-field">
                  <label>${lang === 'en' ? 'City' : t('city', lang) || 'City'} <span class="optional">(${lang === 'en' ? 'optional' : t('optional', lang) || 'optional'})</span></label>
                  <input type="text" id="guestCity" name="city" placeholder="London">
                </div>
                <div class="form-field">
                  <label>${lang === 'en' ? 'Postcode' : t('postcode', lang) || 'Postcode'} <span class="optional">(${lang === 'en' ? 'optional' : t('optional', lang) || 'optional'})</span></label>
                  <input type="text" id="guestPostcode" name="postcode" placeholder="SW1A 1AA">
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-field full">
                  <label>${t('special_requests', lang)} <span class="optional">(${lang === 'en' ? 'optional' : t('optional', lang) || 'optional'})</span></label>
                  <textarea id="guestNotes" name="notes" rows="3" placeholder=""></textarea>
                </div>
              </div>
              
              <div class="form-row">
                <div class="form-field full">
                  <label class="checkbox-label">
                    <input type="checkbox" id="marketingConsent" name="marketing">
                    <span>${lang === 'fr' ? 'Envoyez-moi des offres spéciales et des actualités' : lang === 'es' ? 'Envíame ofertas especiales y novedades' : lang === 'de' ? 'Senden Sie mir Sonderangebote und Updates' : lang === 'nl' ? 'Stuur mij speciale aanbiedingen en updates' : 'Send me special offers and updates'}</span>
                  </label>
                </div>
              </div>
            </form>
            
            <div class="step-nav">
              <button class="btn-secondary" onclick="goToStep(0)">← ${t('back', lang)}</button>
              <button class="btn-primary" onclick="goToStep(2)">${t('continue', lang)} →</button>
            </div>
          </div>
          
          <!-- Step 2: Payment -->
          <div id="bookingStep2" class="checkout-step" style="display:none;">
            <div class="step-header">
              <button class="back-btn" onclick="goToStep(1)">← ${t('back', lang)}</button>
              <h3>💳 ${t('payment', lang) || 'Payment'}</h3>
            </div>
            <div class="steps-indicator">
              <div class="step completed" data-step="1">✓</div>
              <div class="step active" data-step="2">2</div>
              <div class="step" data-step="3">3</div>
            </div>
            
            <div class="booking-summary-mini">
              <div class="summary-row"><span>${lang === 'fr' ? 'Dates' : lang === 'es' ? 'Fechas' : lang === 'de' ? 'Daten' : lang === 'nl' ? 'Data' : 'Dates'}:</span><span id="summaryDates"></span></div>
              <div class="summary-row"><span>${t('guests', lang)}:</span><span id="summaryGuests"></span></div>
              <div class="summary-row total"><span>${t('total', lang)}:</span><span id="summaryTotal"></span></div>
            </div>
            
            <!-- Card Payment Only for GAS Lites -->
            <div id="cardPaymentSection" class="stripe-section">
              <h4><span class="lock-icon">🔒</span> ${lang === 'fr' ? 'Paiement sécurisé' : lang === 'es' ? 'Pago seguro' : lang === 'de' ? 'Sichere Zahlung' : lang === 'nl' ? 'Veilige betaling' : 'Secure Card Payment'}</h4>
              <div id="stripeLoading" style="text-align:center;padding:20px;color:#64748b;">${t('loading', lang) || 'Loading...'}...</div>
              <div id="card-element" style="display:none;"></div>
              <div id="card-errors" role="alert"></div>
              <div class="stripe-badge">
                <span>Powered by</span>
                <span style="color:#635BFF;font-weight:700;font-size:14px;letter-spacing:-0.5px;">Stripe</span>
              </div>
            </div>
            
            <div id="stripeError" class="stripe-error" style="display:none;">
              <p>⚠️ ${lang === 'fr' ? 'Le paiement par carte n\'est pas disponible.' : lang === 'es' ? 'El pago con tarjeta no está disponible.' : lang === 'de' ? 'Kartenzahlung ist nicht verfügbar.' : lang === 'nl' ? 'Kaartbetaling is niet beschikbaar.' : 'Card payment is not available for this property.'}</p>
              <p style="font-size:13px;color:#64748b;">${lang === 'fr' ? 'Veuillez contacter la propriété directement.' : lang === 'es' ? 'Por favor contacte la propiedad directamente.' : lang === 'de' ? 'Bitte kontaktieren Sie die Unterkunft direkt.' : lang === 'nl' ? 'Neem direct contact op met het verblijf.' : 'Please contact the property directly to make a reservation.'}</p>
            </div>
            
            <div class="step-nav">
              <button class="btn-secondary" onclick="goToStep(1)">← ${t('back', lang)}</button>
              <button class="btn-primary" id="confirmBookingBtn" onclick="submitBooking()">
                <span class="btn-text">${t('confirm_booking', lang)}</span>
                <span class="btn-loading" style="display:none;">${t('loading', lang) || 'Processing'}...</span>
              </button>
            </div>
          </div>
          
          <!-- Step 3: Confirmation -->
          <div id="bookingStep3" class="checkout-step" style="display:none;">
            <div class="confirmation">
              <div class="confirmation-icon">✓</div>
              <h3>${t('booking_confirmed', lang)}</h3>
              <p class="booking-ref" id="confirmationCode"></p>
              <p class="confirmation-email">${lang === 'fr' ? 'Confirmation envoyée à' : lang === 'es' ? 'Confirmación enviada a' : lang === 'de' ? 'Bestätigung gesendet an' : lang === 'nl' ? 'Bevestiging verzonden naar' : 'Confirmation sent to'} <strong id="confirmationEmail"></strong></p>
              
              <div class="confirmation-details">
                <div class="conf-row"><span>${lang === 'fr' ? 'Propriété' : lang === 'es' ? 'Propiedad' : lang === 'de' ? 'Unterkunft' : lang === 'nl' ? 'Accommodatie' : 'Property'}:</span><span>${escapeForHTML(title)}</span></div>
                <div class="conf-row"><span>${t('check_in', lang)}:</span><span id="confCheckin"></span></div>
                <div class="conf-row"><span>${t('check_out', lang)}:</span><span id="confCheckout"></span></div>
                <div class="conf-row"><span>${t('guests', lang)}:</span><span id="confGuests"></span></div>
                <div class="conf-row total"><span>${t('total', lang)}:</span><span id="confTotal"></span></div>
              </div>
              
              <p class="confirmation-note">${lang === 'fr' ? 'La propriété vous contactera avec les détails d\'arrivée.' : lang === 'es' ? 'La propiedad le contactará con los detalles de llegada.' : lang === 'de' ? 'Die Unterkunft wird Sie mit Check-in-Details kontaktieren.' : lang === 'nl' ? 'Het verblijf neemt contact met u op met incheckgegevens.' : 'The property will contact you with check-in details.'}</p>
            </div>
          </div>
          
          <div class="qr-section" id="qrSection">
            <img src="${qrCode}" alt="QR">
            <div class="qr-text">${t('scan_to_book', lang)}<br><strong>#${lite.slug}</strong></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  ${showBranding ? `<footer class="footer">Powered by <a href="https://gas.travel">GAS.travel</a> • <a href="${liteUrl}/card">View Promo Card</a></footer>` : ''}
  </div><!-- end page-wrapper -->
  
  <script>
    const images = ${JSON.stringify(images.map(i => i.url))};
    const availability = ${availabilityJson};
    const currency = '${currency}';
    const currencyCode = '${currencyCode}';
    const roomId = ${roomId || 'null'};
    const propertyId = ${propertyId || 'null'};
    const accountId = ${accountId || 'null'};
    const liteSlug = '${lite.slug}';
    let currentImage = 0;
    let currentMonth = new Date(); currentMonth.setDate(1);
    let currentPricing = null;
    let selectedUpsells = [];
    let appliedVoucher = null;
    let currentStep = 0;
    let availableOffers = [];
    let selectedOffer = null;
    let currentTaxes = [];
    let depositRule = null;
    let stripeEnabled = false;
    let stripe = null;
    let cardElement = null;
    let stripeAccountId = null;
    
    // Initialize Flatpickr date pickers
    document.addEventListener('DOMContentLoaded', function() {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const fpLocale = '${lang}' !== 'en' && flatpickr.l10ns['${lang}'] ? '${lang}' : 'default';
      
      const checkinPicker = flatpickr('#checkin', {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'd M Y',
        minDate: 'today',
        locale: fpLocale,
        onChange: function(selectedDates, dateStr) {
          if (selectedDates[0]) {
            const nextDay = new Date(selectedDates[0]);
            nextDay.setDate(nextDay.getDate() + 1);
            checkoutPicker.set('minDate', nextDay);
            setTimeout(() => checkoutPicker.open(), 100);
          }
        }
      });
      
      const checkoutPicker = flatpickr('#checkout', {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'd M Y',
        minDate: tomorrow,
        locale: fpLocale,
        onChange: function(selectedDates, dateStr) {
          if (selectedDates[0] && document.getElementById('checkin').value) {
            fetchPricing();
          }
        }
      });
      
      // Guest field changes — cap total at max_guests
      var maxGuests = ${parseInt(lite.max_guests) || 99};
      function capGuests() {
        var adults = parseInt(document.getElementById('adults').value) || 1;
        var children = parseInt(document.getElementById('children').value) || 0;
        if (adults + children > maxGuests) {
          document.getElementById('children').value = Math.max(0, maxGuests - adults);
        }
        if (document.getElementById('checkout').value) fetchPricing();
      }
      document.getElementById('adults').addEventListener('change', capGuests);
      document.getElementById('children').addEventListener('change', capGuests);
      
      // Email match check
      document.getElementById('confirmEmail').addEventListener('input', checkEmailMatch);
      document.getElementById('guestEmail').addEventListener('input', checkEmailMatch);
      
      // Payment option selection
      document.querySelectorAll('.payment-option').forEach(opt => {
        opt.addEventListener('click', function() {
          if (this.classList.contains('disabled')) return;
          document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
          this.classList.add('selected');
          this.querySelector('input').checked = true;
        });
      });
      
      // Voucher apply button
      document.getElementById('applyVoucher').addEventListener('click', applyVoucherCode);

      // Book button
      document.getElementById('bookBtn').addEventListener('click', () => goToStep(1));

      // Auto-populate dates from URL params and fetch pricing
      (function() {
        var params = new URLSearchParams(window.location.search);
        var ci = params.get('checkin');
        var co = params.get('checkout');
        var g = params.get('guests');
        if (ci) checkinPicker.setDate(ci, true);
        if (co) {
          var minD = new Date(ci || Date.now());
          minD.setDate(minD.getDate() + 1);
          checkoutPicker.set('minDate', minD);
          checkoutPicker.setDate(co, true);
        }
        if (g) document.getElementById('adults').value = g;
        if (ci && co) setTimeout(fetchPricing, 200);
      })();

      // Load Stripe info
      loadStripeInfo();
    });
    
    // Load Stripe configuration
    async function loadStripeInfo() {
      console.log('Loading Stripe for property:', propertyId);
      try {
        const res = await fetch('/api/stripe/' + propertyId);
        const data = await res.json();
        console.log('Stripe API response:', data);
        
        if (data.success && data.stripe_enabled && data.stripe_publishable_key) {
          stripeEnabled = true;
          stripeAccountId = data.stripe_account_id || null;
          console.log('Stripe enabled, initializing...');
          
          // Initialize Stripe
          const stripeOptions = stripeAccountId ? { stripeAccount: stripeAccountId } : {};
          stripe = Stripe(data.stripe_publishable_key, stripeOptions);
          
          // Create card element
          const elements = stripe.elements();
          cardElement = elements.create('card', {
            style: {
              base: {
                fontSize: '16px',
                color: '#1e293b',
                fontFamily: 'Inter, system-ui, sans-serif',
                '::placeholder': { color: '#94a3b8' }
              },
              invalid: { color: '#dc2626' }
            }
          });
          
          // Hide loading, show card element
          document.getElementById('stripeLoading').style.display = 'none';
          document.getElementById('card-element').style.display = 'block';
          cardElement.mount('#card-element');
          console.log('Card element mounted');
          
          // Handle card errors
          cardElement.on('change', function(event) {
            const displayError = document.getElementById('card-errors');
            displayError.textContent = event.error ? event.error.message : '';
          });
        } else {
          // Stripe not configured - show error
          console.log('Stripe not enabled or missing key');
          document.getElementById('cardPaymentSection').style.display = 'none';
          document.getElementById('stripeError').style.display = 'block';
          document.getElementById('confirmBookingBtn').disabled = true;
        }
      } catch (e) {
        console.log('Stripe error:', e);
        document.getElementById('cardPaymentSection').style.display = 'none';
        document.getElementById('stripeError').style.display = 'block';
        document.getElementById('confirmBookingBtn').disabled = true;
      }
    }
    
    function checkEmailMatch() {
      const email = document.getElementById('guestEmail').value;
      const confirm = document.getElementById('confirmEmail').value;
      const statusEl = document.querySelector('.email-match-status');
      
      if (!confirm) {
        statusEl.textContent = '';
        statusEl.className = 'email-match-status';
      } else if (email === confirm) {
        statusEl.textContent = '✓ Emails match';
        statusEl.className = 'email-match-status match';
      } else {
        statusEl.textContent = '✗ Emails don\\'t match';
        statusEl.className = 'email-match-status mismatch';
      }
    }
    
    // Lightbox
    function openLightbox(i) { currentImage = i; document.getElementById('lightbox-img').src = images[i]; document.getElementById('lightbox').classList.add('active'); }
    function closeLightbox() { document.getElementById('lightbox').classList.remove('active'); }
    function navLightbox(d) { currentImage = (currentImage + d + images.length) % images.length; document.getElementById('lightbox-img').src = images[currentImage]; }
    
    // Tabs
    function showTab(id, btn) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + id).classList.add('active');
      if (id === 'availability') renderCalendar();
    }
    
    // Accordion
    function toggleAccordion(h) { h.parentElement.classList.toggle('open'); }
    
    // Share
    function shareProperty() { 
      if (navigator.share) navigator.share({ title: '${escapeForJS(title)}', url: '${liteUrl}' }); 
      else { navigator.clipboard.writeText('${liteUrl}'); alert('Link copied!'); } 
    }
    
    // Calendar
    function renderCalendar() {
      renderMonth(0, 'calendar-grid-1', 'calendar-month-1');
      renderMonth(1, 'calendar-grid-2', 'calendar-month-2');
    }
    
    function renderMonth(offset, gridId, labelId) {
      const grid = document.getElementById(gridId);
      const monthLabel = document.getElementById(labelId);
      if (!grid || !monthLabel) return;
      
      const displayMonth = new Date(currentMonth);
      displayMonth.setMonth(displayMonth.getMonth() + offset);
      
      const year = displayMonth.getFullYear();
      const month = displayMonth.getMonth();
      
      monthLabel.textContent = displayMonth.toLocaleDateString('${lang === 'es' ? 'es-ES' : lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : lang === 'nl' ? 'nl-NL' : 'en-US'}', { month: 'long', year: 'numeric' });
      
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const dayNames = {
        en: ['Su','Mo','Tu','We','Th','Fr','Sa'],
        es: ['Do','Lu','Ma','Mi','Ju','Vi','Sá'],
        fr: ['Di','Lu','Ma','Me','Je','Ve','Sa'],
        de: ['So','Mo','Di','Mi','Do','Fr','Sa'],
        nl: ['Zo','Ma','Di','Wo','Do','Vr','Za']
      };
      let html = (dayNames['${lang}'] || dayNames.en).map(d => '<div class="calendar-day-header">' + d + '</div>').join('');
      
      for (let i = 0; i < firstDay; i++) html += '<div class="calendar-day empty"></div>';
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const avail = availability.find(a => a.date && a.date.split('T')[0] === dateStr);
        const isToday = date.getTime() === today.getTime();
        const isPast = date < today;
        
        let cls = 'calendar-day';
        let priceStr = '';
        
        if (isPast) {
          cls += ' empty';
        } else if (avail) {
          cls += avail.available ? ' available' : ' unavailable';
          if (avail.price && avail.available) priceStr = '<div class="price">' + currency + Math.round(avail.price) + '</div>';
        } else {
          cls += ' available';
        }
        if (isToday) cls += ' today';
        
        html += '<div class="' + cls + '">' + day + priceStr + '</div>';
      }
      
      grid.innerHTML = html;
    }
    
    function prevMonth() {
      currentMonth.setMonth(currentMonth.getMonth() - 1);
      renderCalendar();
    }
    
    function nextMonth() {
      currentMonth.setMonth(currentMonth.getMonth() + 1);
      renderCalendar();
    }
    
    // Fetch pricing from API
    async function fetchPricing() {
      const checkin = document.getElementById('checkin').value;
      const checkout = document.getElementById('checkout').value;
      if (!checkin || !checkout) return;
      
      const bookBtn = document.getElementById('bookBtn');
      const btnText = bookBtn.querySelector('.btn-text');
      const btnLoading = bookBtn.querySelector('.btn-loading');
      
      btnText.textContent = 'Checking...';
      bookBtn.disabled = true;
      const availMsg = document.getElementById('availabilityMsg');
      availMsg.style.display = 'none';
      
      try {
        const adults = document.getElementById('adults').value;
        const children = document.getElementById('children').value;
        const res = await fetch('/api/pricing/' + roomId + '?checkin=' + checkin + '&checkout=' + checkout + '&adults=' + adults + '&children=' + children);
        const data = await res.json();
        
        if (data.success) {
          currentPricing = data.pricing;
          displayPricing();
          // Update header price to show avg nightly rate for selected dates
          var priceHeader = document.querySelector('.price-amount');
          if (priceHeader && data.pricing.avgPerNight) {
            priceHeader.textContent = currency + Math.round(data.pricing.avgPerNight);
            priceHeader.removeAttribute('style');
          }
          // Show min stay info if applicable
          if (data.pricing.minStay > 1) {
            availMsg.className = 'availability-msg info';
            availMsg.innerHTML = 'ℹ️ ${lang === 'fr' ? 'Séjour minimum' : lang === 'es' ? 'Estancia mínima' : lang === 'de' ? 'Mindestaufenthalt' : lang === 'nl' ? 'Minimaal verblijf' : 'Minimum stay'}: ' + data.pricing.minStay + ' ${t('nights', lang)}';
            availMsg.style.display = 'block';
          }
          btnText.textContent = '${t('book', lang)} ' + data.pricing.nights + ' ' + (data.pricing.nights === 1 ? '${t('night', lang)}' : '${t('nights', lang)}') + ' - ' + currency + Math.round(data.pricing.subtotal);
          bookBtn.disabled = false;
          document.getElementById('voucherSection').style.display = 'block';
          // Load offers, upsells, and taxes
          try { await loadOffers(); } catch(e) { console.log('Offers error:', e); }
          try { loadUpsells(); } catch(e) { console.log('Upsells error:', e); }
          try { await loadTaxes(); } catch(e) { console.log('Taxes error:', e); }
          try { await loadDepositRule(); } catch(e) { console.log('Deposit error:', e); }
        } else {
          document.getElementById('priceBreakdown').style.display = 'none';
          document.getElementById('rateOptionsSection').style.display = 'none';
          document.getElementById('offerBanner').classList.remove('visible');
          
          // Show specific error messages
          if (data.minStay && data.nights) {
            availMsg.className = 'availability-msg warning';
            availMsg.innerHTML = '⚠️ ${lang === 'fr' ? 'Séjour minimum' : lang === 'es' ? 'Estancia mínima' : lang === 'de' ? 'Mindestaufenthalt' : lang === 'nl' ? 'Minimaal verblijf' : 'Minimum stay'}: <strong>' + data.minStay + ' ${t('nights', lang)}</strong> (${lang === 'fr' ? 'vous avez sélectionné' : lang === 'es' ? 'ha seleccionado' : lang === 'de' ? 'Sie haben gewählt' : lang === 'nl' ? 'u heeft gekozen' : 'you selected'} ' + data.nights + ')';
            availMsg.style.display = 'block';
            btnText.textContent = '${lang === 'fr' ? 'Séjour minimum' : lang === 'es' ? 'Estancia mínima' : lang === 'de' ? 'Mindestaufenthalt' : lang === 'nl' ? 'Minimaal verblijf' : 'Minimum stay'} ' + data.minStay + ' ${t('nights', lang)}';
          } else if (data.unavailable && data.unavailable.length > 0) {
            availMsg.className = 'availability-msg error';
            availMsg.innerHTML = '❌ ${lang === 'fr' ? 'Certaines dates ne sont pas disponibles' : lang === 'es' ? 'Algunas fechas no están disponibles' : lang === 'de' ? 'Einige Daten sind nicht verfügbar' : lang === 'nl' ? 'Sommige datums zijn niet beschikbaar' : 'Some dates are not available'}';
            availMsg.style.display = 'block';
            btnText.textContent = '${t('unavailable', lang)}';
          } else {
            btnText.textContent = data.error || '${t('unavailable', lang)}';
          }
          bookBtn.disabled = true;
        }
      } catch (e) {
        console.error('Pricing error:', e);
        btnText.textContent = '${t('error', lang)}';
        bookBtn.disabled = true;
      }
    }
    
    // Load and display offers
    async function loadOffers() {
      const checkin = document.getElementById('checkin').value;
      const checkout = document.getElementById('checkout').value;
      
      try {
        const res = await fetch('/api/offers/' + propertyId + '?checkin=' + checkin + '&checkout=' + checkout + '&roomId=' + roomId + '&accountId=' + accountId);
        const data = await res.json();
        
        availableOffers = data.offers || [];
        selectedOffer = null;
        
        const section = document.getElementById('rateOptionsSection');
        const list = document.getElementById('rateOptionsList');
        const banner = document.getElementById('offerBanner');
        
        if (availableOffers.length > 0) {
          // Show offer banner
          banner.classList.add('visible');

          // Check if any offer replaces standard rate
          const anyReplacesStandard = availableOffers.some(o => o.replaces_standard);

          // Build rate options HTML
          let html = '';

          // Standard rate option — hide if any offer replaces it
          if (!anyReplacesStandard) {
            html += '<div class="rate-option selected" data-rate="standard" onclick="selectRate(this, null)">';
            html += '<div class="rate-option-radio"></div>';
            html += '<div class="rate-option-info">';
            html += '<div class="rate-option-name">Standard Rate</div>';
            html += '<div class="rate-option-features">';
            html += '</div>';
            html += '</div>';
            html += '</div>';
          }

          // Offer rate options
          let firstOffer = true;
          availableOffers.forEach((offer, idx) => {
            const discount = offer.discount_type === 'percentage'
              ? currentPricing.nightlyTotal * (offer.discount_value / 100)
              : parseFloat(offer.discount_value);
            const savingsPercent = Math.round((discount / currentPricing.nightlyTotal) * 100);
            const showBadge = !offer.replaces_standard && !offer.hide_discount_badge && savingsPercent > 0;
            const isSelected = anyReplacesStandard && firstOffer;
            if (isSelected) firstOffer = false;

            html += '<div class="rate-option' + (isSelected ? ' selected' : '') + '" data-rate="offer" data-offer-idx="' + idx + '" onclick="selectRate(this, ' + idx + ')">';
            html += '<div class="rate-option-radio"></div>';
            html += '<div class="rate-option-info">';
            html += '<div class="rate-option-name">' + (offer.name || 'Special Offer').replace(/</g, '&lt;');
            if (showBadge) html += '<span class="rate-option-badge">Save ' + savingsPercent + '%</span>';
            html += '</div>';
            html += '<div class="rate-option-features">';
            html += '</div>';
            html += '</div>';
            html += '</div>';
          });
          
          list.innerHTML = html;
          section.style.display = 'block';
        } else {
          banner.classList.remove('visible');
          section.style.display = 'none';
        }
      } catch (e) {
        console.log('No offers available');
        document.getElementById('offerBanner').classList.remove('visible');
        document.getElementById('rateOptionsSection').style.display = 'none';
      }
    }
    
    function selectRate(el, offerIdx) {
      document.querySelectorAll('.rate-option').forEach(opt => opt.classList.remove('selected'));
      el.classList.add('selected');
      
      if (offerIdx !== null && availableOffers[offerIdx]) {
        selectedOffer = availableOffers[offerIdx];
      } else {
        selectedOffer = null;
      }
      
      updateTotal();
    }
    
    // Display price breakdown
    function displayPricing() {
      if (!currentPricing) return;
      
      const p = currentPricing;
      const nightsWord = p.nights === 1 ? '${t('night', lang)}' : '${t('nights', lang)}';
      document.getElementById('nightlyRow').innerHTML = '<span>' + currency + Math.round(p.avgPerNight) + ' × ' + p.nights + ' ' + nightsWord + '</span><span>' + currency + Math.round(p.nightlyTotal) + '</span>';
      
      const cleaningRow = document.getElementById('cleaningRow');
      if (p.cleaningFee > 0) {
        cleaningRow.style.display = 'flex';
        cleaningRow.querySelector('span:last-child').textContent = currency + Math.round(p.cleaningFee);
      } else {
        cleaningRow.style.display = 'none';
      }
      
      updateTotal();
      document.getElementById('priceBreakdown').style.display = 'block';
    }
    
    // Calculate and update total
    function updateTotal() {
      if (!currentPricing) return;
      
      let total = currentPricing.subtotal;
      let offerDiscount = 0;
      
      // Apply offer discount first (before upsells)
      if (selectedOffer) {
        if (selectedOffer.discount_type === 'percentage') {
          offerDiscount = currentPricing.nightlyTotal * (selectedOffer.discount_value / 100);
        } else {
          offerDiscount = parseFloat(selectedOffer.discount_value);
        }
        total -= offerDiscount;
      }
      
      // Add upsells
      let upsellTotal = 0;
      const nights = currentPricing.nights;
      const guests = parseInt(document.getElementById('adults').value) + parseInt(document.getElementById('children').value);
      
      selectedUpsells.forEach(u => {
        let uPrice = parseFloat(u.price) || 0;
        switch (u.charge_type) {
          case 'per_night':
            uPrice *= nights;
            break;
          case 'per_guest':
            uPrice *= guests;
            break;
          case 'per_guest_per_night':
            uPrice *= nights * guests;
            break;
          // 'per_booking' or default - no multiplication
        }
        upsellTotal += uPrice;
      });
      
      const upsellsRow = document.getElementById('upsellsRow');
      if (upsellTotal > 0) {
        upsellsRow.style.display = 'flex';
        upsellsRow.querySelector('span:last-child').textContent = currency + Math.round(upsellTotal);
        total += upsellTotal;
      } else {
        upsellsRow.style.display = 'none';
      }
      
      // Show offer discount in breakdown
      const discountRow = document.getElementById('discountRow');
      if (selectedOffer && offerDiscount > 0) {
        discountRow.style.display = 'flex';
        discountRow.querySelector('span:first-child').textContent = selectedOffer.name || 'Offer discount';
        discountRow.querySelector('span:last-child').textContent = '-' + currency + Math.round(offerDiscount);
      } else if (appliedVoucher) {
        // Apply voucher discount (only if no offer, or in addition - depending on stackable setting)
        discountRow.style.display = 'flex';
        discountRow.querySelector('span:first-child').textContent = 'Discount (' + appliedVoucher.code + ')';
        discountRow.querySelector('span:last-child').textContent = '-' + currency + Math.round(appliedVoucher.discount);
        total -= appliedVoucher.discount;
      } else {
        discountRow.style.display = 'none';
      }
      
      // Display taxes
      const taxesContainer = document.getElementById('taxesContainer');
      let taxTotal = 0;
      if (currentTaxes && currentTaxes.length > 0) {
        let taxHtml = '';
        currentTaxes.forEach(tax => {
          taxTotal += tax.amount;
          taxHtml += '<div class="breakdown-row tax-row"><span>' + tax.name + '</span><span>' + currency + tax.amount.toFixed(2) + '</span></div>';
        });
        taxesContainer.innerHTML = taxHtml;
        total += taxTotal;
      } else {
        taxesContainer.innerHTML = '';
      }
      
      document.getElementById('totalAmount').textContent = currency + Math.round(total);
      
      // Display deposit info if rule exists
      const depositSection = document.getElementById('depositSection');
      if (depositRule && depositRule.deposit_type !== 'full') {
        let depositAmount = total;
        let balanceAmount = 0;
        
        if (depositRule.deposit_type === 'percentage') {
          depositAmount = total * (parseFloat(depositRule.deposit_percentage) / 100);
          balanceAmount = total - depositAmount;
        } else if (depositRule.deposit_type === 'fixed') {
          depositAmount = parseFloat(depositRule.deposit_fixed_amount) || total;
          balanceAmount = total - depositAmount;
        }
        
        document.getElementById('depositAmount').textContent = currency + Math.round(depositAmount);
        document.getElementById('balanceAmount').textContent = currency + Math.round(balanceAmount);
        depositSection.style.display = 'block';
        
        // Store for booking submission
        window.currentDepositAmount = depositAmount;
      } else {
        depositSection.style.display = 'none';
        window.currentDepositAmount = null;
      }
      
      // Update book button text
      const bookBtn = document.getElementById('bookBtn');
      if (!bookBtn.disabled && currentPricing) {
        const btnAmount = window.currentDepositAmount ? window.currentDepositAmount : total;
        const btnLabel = window.currentDepositAmount ? 'Pay deposit' : 'Book';
        bookBtn.querySelector('.btn-text').textContent = btnLabel + ' ' + currentPricing.nights + ' night' + (currentPricing.nights > 1 ? 's' : '') + ' - ' + currency + Math.round(btnAmount);
      }
    }
    
    // Load upsells
    async function loadUpsells() {
      try {
        const res = await fetch('/api/upsells/' + roomId + '?propertyId=' + propertyId + '&accountId=' + accountId);
        const data = await res.json();
        
        if (data.success && data.upsells && data.upsells.length > 0) {
          const list = document.getElementById('upsellsList');
          let html = '';

          // Filter by night range if dates are selected
          const bNights = currentPricing ? currentPricing.nights : 0;
          const filterByNights = (arr) => arr.filter(u => {
            if (bNights > 0) {
              if (u.min_nights && bNights < u.min_nights) return false;
              if (u.max_nights && bNights > u.max_nights) return false;
            }
            return true;
          });

          // If we have categories, group them
          if (data.upsells_by_category && Object.keys(data.upsells_by_category).length > 1) {
            for (const [category, upsells] of Object.entries(data.upsells_by_category)) {
              const filtered = filterByNights(upsells);
              if (filtered.length === 0) continue;
              html += '<div class="upsell-category">' + category + '</div>';
              html += filtered.map(u => renderUpsellItem(u)).join('');
            }
          } else {
            html = filterByNights(data.upsells).map(u => renderUpsellItem(u)).join('');
          }
          
          list.innerHTML = html;
          document.getElementById('upsellsSection').style.display = 'block';
        }
      } catch (e) {
        console.log('No upsells available');
      }
    }
    
    function renderUpsellItem(u) {
      let priceText = '';
      switch (u.charge_type) {
        case 'per_night': priceText = '/night'; break;
        case 'per_guest': priceText = '/guest'; break;
        case 'per_guest_per_night': priceText = '/guest/night'; break;
        default: priceText = '';
      }
      
      // Use btoa to safely encode the JSON data
      const upsellData = btoa(JSON.stringify(u));
      
      return '<div class="upsell-item" data-id="' + u.id + '" data-upsell="' + upsellData + '" onclick="toggleUpsell(this)">' +
        '<div class="upsell-checkbox"></div>' +
        '<div class="upsell-info"><div class="upsell-name">' + (u.name || '').replace(/</g, '&lt;') + '</div>' +
        (u.description ? '<div class="upsell-desc">' + u.description.replace(/</g, '&lt;') + '</div>' : '') + '</div>' +
        '<div class="upsell-price">' + currency + parseFloat(u.price).toFixed(2) + '<small>' + priceText + '</small></div>' +
      '</div>';
    }
    
    // Load and display taxes
    async function loadTaxes() {
      if (!currentPricing) return;
      
      try {
        const nights = currentPricing.nights;
        const guests = parseInt(document.getElementById('adults').value) + parseInt(document.getElementById('children').value);
        const subtotal = currentPricing.subtotal;
        
        const res = await fetch('/api/taxes/' + roomId + '?nights=' + nights + '&guests=' + guests + '&subtotal=' + subtotal);
        const data = await res.json();
        
        if (data.success && data.taxes && data.taxes.length > 0) {
          currentTaxes = data.taxes;
        } else {
          currentTaxes = [];
        }
        updateTotal();
      } catch (e) {
        console.log('No taxes available');
        currentTaxes = [];
      }
    }
    
    // Load deposit rule
    async function loadDepositRule() {
      try {
        const res = await fetch('/api/deposit/' + propertyId);
        const data = await res.json();
        
        if (data.success && data.deposit_rule) {
          depositRule = data.deposit_rule;
        } else {
          depositRule = null;
        }
        updateTotal();
      } catch (e) {
        console.log('No deposit rule');
        depositRule = null;
      }
    }
    
    function toggleUpsell(el) {
      const upsell = JSON.parse(atob(el.dataset.upsell));
      el.classList.toggle('selected');
      
      if (el.classList.contains('selected')) {
        selectedUpsells.push(upsell);
      } else {
        selectedUpsells = selectedUpsells.filter(u => u.id !== upsell.id);
      }
      updateTotal();
    }
    
    // Voucher handling
    function toggleVoucherInput() {
      const wrapper = document.getElementById('voucherInputWrapper');
      wrapper.style.display = wrapper.style.display === 'none' ? 'block' : 'none';
    }
    
    async function applyVoucherCode() {
      const code = document.getElementById('voucherCode').value.trim();
      const msgEl = document.getElementById('voucherMsg');
      
      if (!code) return;
      if (!currentPricing) {
        msgEl.textContent = 'Please select dates first';
        msgEl.className = 'voucher-msg error';
        return;
      }
      
      try {
        const res = await fetch('/api/voucher/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            code, 
            propertyId,
            roomId, 
            subtotal: currentPricing.subtotal 
          })
        });
        const data = await res.json();
        
        if (data.success) {
          appliedVoucher = data.voucher;
          appliedVoucher.discount = data.voucher.discount_amount;
          document.getElementById('voucherInputWrapper').style.display = 'none';
          document.querySelector('.voucher-toggle').style.display = 'none';
          const appliedEl = document.getElementById('voucherApplied');
          appliedEl.style.display = 'flex';
          appliedEl.querySelector('.voucher-name').textContent = '✓ ' + (data.voucher.name || data.voucher.code) + ' (-' + currency + Math.round(appliedVoucher.discount) + ')';
          msgEl.textContent = '';
          updateTotal();
        } else {
          msgEl.textContent = data.error;
          msgEl.className = 'voucher-msg error';
        }
      } catch (e) {
        msgEl.textContent = 'Error validating voucher';
        msgEl.className = 'voucher-msg error';
      }
    }
    
    function removeVoucher() {
      appliedVoucher = null;
      document.getElementById('voucherApplied').style.display = 'none';
      document.querySelector('.voucher-toggle').style.display = 'block';
      document.getElementById('voucherCode').value = '';
      updateTotal();
    }
    
    // Multi-step navigation
    function goToStep(step) {
      // Validate current step before proceeding
      if (step > currentStep) {
        if (currentStep === 0 && !currentPricing) {
          alert('Please select dates first');
          return;
        }
        if (currentStep === 1) {
          // Validate guest form
          const form = document.getElementById('guestForm');
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }
          const email = document.getElementById('guestEmail').value;
          const confirmEmail = document.getElementById('confirmEmail').value;
          if (email !== confirmEmail) {
            alert('Email addresses do not match');
            return;
          }
        }
      }
      
      currentStep = step;
      
      // Hide all steps
      document.querySelectorAll('.checkout-step, #bookingStep0').forEach(s => s.style.display = 'none');
      
      // Show current step
      document.getElementById('bookingStep' + step).style.display = 'block';
      
      // Hide QR section during checkout
      document.getElementById('qrSection').style.display = step === 0 || step === 3 ? 'flex' : 'none';
      
      // Update summary on step 2
      if (step === 2) {
        updateBookingSummary();
      }
      
      // Scroll to top of booking card
      document.querySelector('.booking-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    function updateBookingSummary() {
      const checkin = document.getElementById('checkin');
      const checkout = document.getElementById('checkout');
      const adults = document.getElementById('adults').value;
      const children = document.getElementById('children').value;
      
      // Format dates nicely
      const formatDate = (input) => {
        if (input._flatpickr && input._flatpickr.selectedDates[0]) {
          return input._flatpickr.selectedDates[0].toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        }
        return input.value;
      };
      
      document.getElementById('summaryDates').textContent = formatDate(checkin) + ' → ' + formatDate(checkout);
      
      let guestText = adults + ' Adult' + (adults > 1 ? 's' : '');
      if (parseInt(children) > 0) guestText += ', ' + children + ' Child' + (children > 1 ? 'ren' : '');
      document.getElementById('summaryGuests').textContent = guestText;
      
      document.getElementById('summaryTotal').textContent = document.getElementById('totalAmount').textContent;
    }
    
    // Submit booking
    async function submitBooking() {
      const confirmBtn = document.getElementById('confirmBookingBtn');
      const btnText = confirmBtn.querySelector('.btn-text');
      const btnLoading = confirmBtn.querySelector('.btn-loading');
      
      btnText.style.display = 'none';
      btnLoading.style.display = 'inline';
      confirmBtn.disabled = true;
      
      const total = parseFloat(document.getElementById('totalAmount').textContent.replace(/[^0-9.]/g, ''));
      
      let stripePaymentIntentId = null;
      
      try {
        // GAS Lites requires card payment
        if (!stripeEnabled || !cardElement) {
          throw new Error('Card payment is required but not available');
        }
        
        const paymentAmount = window.currentDepositAmount || total;
        
        // Create payment intent
        const intentRes = await fetch('/api/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId,
            amount: paymentAmount,
            currency: currencyCode,
            bookingData: {
              email: document.getElementById('guestEmail').value,
              checkin: document.getElementById('checkin').value,
              checkout: document.getElementById('checkout').value
            }
          })
        });
        const intentData = await intentRes.json();
        
        if (!intentData.success) {
          throw new Error(intentData.error || 'Failed to create payment');
        }
          
          // Confirm card payment
          const { error, paymentIntent } = await stripe.confirmCardPayment(intentData.client_secret, {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: document.getElementById('firstName').value + ' ' + document.getElementById('lastName').value,
                email: document.getElementById('guestEmail').value,
                phone: document.getElementById('guestPhone').value
              }
            }
          });
          
          if (error) {
            throw new Error(error.message);
          }
          
          if (paymentIntent.status === 'succeeded') {
            stripePaymentIntentId = paymentIntent.id;
          } else {
            throw new Error('Payment was not completed');
          }
        
        // Create booking
        const res = await fetch('/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            liteSlug,
            roomId,
            propertyId,
            checkin: document.getElementById('checkin').value,
            checkout: document.getElementById('checkout').value,
            adults: document.getElementById('adults').value,
            children: document.getElementById('children').value,
            guestFirstName: document.getElementById('firstName').value,
            guestLastName: document.getElementById('lastName').value,
            guestEmail: document.getElementById('guestEmail').value,
            guestPhone: document.getElementById('guestPhone').value,
            guestAddress: document.getElementById('guestAddress').value,
            guestCity: document.getElementById('guestCity').value,
            guestCountry: document.getElementById('guestCountry').value,
            guestPostcode: document.getElementById('guestPostcode').value,
            notes: document.getElementById('guestNotes').value,
            marketing: document.getElementById('marketingConsent').checked,
            upsells: selectedUpsells,
            voucherCode: appliedVoucher?.code,
            offerId: selectedOffer?.id,
            offerName: selectedOffer?.name,
            offerDiscount: selectedOffer ? (selectedOffer.discount_type === 'percentage' ? currentPricing.nightlyTotal * (selectedOffer.discount_value / 100) : parseFloat(selectedOffer.discount_value)) : 0,
            rateType: selectedOffer ? 'offer' : 'standard',
            paymentMethod: 'card',
            stripePaymentIntentId: stripePaymentIntentId,
            depositAmount: window.currentDepositAmount || null,
            pricing: currentPricing,
            total: total
          })
        });
        const data = await res.json();
        
        if (data.success) {
          // Show confirmation
          document.getElementById('confirmationCode').textContent = data.booking_id || data.booking.confirmationCode;
          document.getElementById('confirmationEmail').textContent = document.getElementById('guestEmail').value;
          
          const checkinDate = document.getElementById('checkin')._flatpickr?.selectedDates[0];
          const checkoutDate = document.getElementById('checkout')._flatpickr?.selectedDates[0];
          document.getElementById('confCheckin').textContent = checkinDate ? checkinDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : document.getElementById('checkin').value;
          document.getElementById('confCheckout').textContent = checkoutDate ? checkoutDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : document.getElementById('checkout').value;
          
          const adults = document.getElementById('adults').value;
          const children = document.getElementById('children').value;
          let guestText = adults + ' Adult' + (adults > 1 ? 's' : '');
          if (parseInt(children) > 0) guestText += ', ' + children + ' Child' + (children > 1 ? 'ren' : '');
          document.getElementById('confGuests').textContent = guestText;
          document.getElementById('confTotal').textContent = currency + Math.round(total);
          
          goToStep(3);
        } else {
          alert(data.error || 'Booking failed. Please try again.');
          btnText.style.display = 'inline';
          btnLoading.style.display = 'none';
          confirmBtn.disabled = false;
        }
      } catch (e) {
        alert(e.message || 'Error processing booking. Please try again.');
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        confirmBtn.disabled = false;
      }
    }
    
    // Keyboard nav
    document.addEventListener('keydown', e => { 
      if (e.key === 'Escape') closeLightbox(); 
      if (e.key === 'ArrowLeft') navLightbox(-1); 
      if (e.key === 'ArrowRight') navLightbox(1); 
    });
    document.getElementById('lightbox').addEventListener('click', e => { if (e.target.id === 'lightbox') closeLightbox(); });
    
    // Init calendar
    renderCalendar();
${embed ? `
    // === EMBED MODE — room detail page ===
    function reportHeight() {
      var h = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: 'gas-embed-resize', height: h }, '*');
    }
    reportHeight();
    window.addEventListener('resize', reportHeight);
    new MutationObserver(reportHeight).observe(document.body, { childList: true, subtree: true, attributes: true });
    setInterval(reportHeight, 500);

    // Intercept checkout/external links — open in parent window
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a');
      if (!link || !link.href) return;
      var url = link.href;
      // Checkout or external links open in parent
      if (url.indexOf('/checkout') !== -1 || url.indexOf('admin.gas.travel') !== -1 || (url.indexOf('http') === 0 && url.indexOf(location.origin) === -1)) {
        e.preventDefault();
        window.parent.postMessage({ type: 'gas-embed-navigate', url: url }, '*');
      }
      // Internal lite links stay in iframe (add embed=1)
      else if (url.indexOf(location.origin) === 0 && url.indexOf('embed=1') === -1) {
        e.preventDefault();
        var sep = url.indexOf('?') === -1 ? '?' : '&';
        location.href = url + sep + 'embed=1';
      }
    });
` : ''}
  </script>
</body>
</html>`;
}

function renderPromoCard({ lite, image, price, offer, qrCode, liteUrl, hasOffers, lang = 'en', supportedLangs = ['en'] }) {
  // Use custom_title only if it's different from room_name (i.e., truly custom)
  const effectiveCustomTitle = (lite.custom_title && lite.custom_title !== lite.room_name) ? lite.custom_title : null;
  const title = effectiveCustomTitle || lite.display_name || lite.room_name || lite.name;
  const currency = getCurrencySymbol(lite.currency);
  const accent = lite.accent_color || '#3b82f6';
  
  // Parse short_description if it's JSON - with language support
  let shortDesc = parseJsonTextField(lite.short_description, lang);
  if (!shortDesc) shortDesc = parseDescription(lite.short_description);
  
  // Card translations
  const cardT = {
    en: { bed: 'Bed', beds: 'Beds', bath: 'Bath', baths: 'Baths', upto: 'Up to', night: '/ night', viewRates: 'View rates', viewDetails: 'View Full Details →', scan: 'Scan to view on your phone', specialOffers: 'Special Offers', limitedOffer: 'Limited Time Offer', ends: 'Ends' },
    es: { bed: 'Dormitorio', beds: 'Dormitorios', bath: 'Baño', baths: 'Baños', upto: 'Hasta', night: '/ noche', viewRates: 'Ver tarifas', viewDetails: 'Ver detalles →', scan: 'Escanea para ver en tu móvil', specialOffers: 'Ofertas especiales', limitedOffer: 'Oferta limitada', ends: 'Termina' },
    fr: { bed: 'Chambre', beds: 'Chambres', bath: 'Salle de bain', baths: 'Salles de bain', upto: 'Jusqu\'à', night: '/ nuit', viewRates: 'Voir les tarifs', viewDetails: 'Voir les détails →', scan: 'Scannez pour voir sur votre téléphone', specialOffers: 'Offres spéciales', limitedOffer: 'Offre limitée', ends: 'Fin' },
    de: { bed: 'Schlafzimmer', beds: 'Schlafzimmer', bath: 'Bad', baths: 'Bäder', upto: 'Bis zu', night: '/ Nacht', viewRates: 'Preise ansehen', viewDetails: 'Details ansehen →', scan: 'Scannen um auf dem Handy zu sehen', specialOffers: 'Sonderangebote', limitedOffer: 'Zeitlich begrenztes Angebot', ends: 'Endet' },
    nl: { bed: 'Slaapkamer', beds: 'Slaapkamers', bath: 'Badkamer', baths: 'Badkamers', upto: 'Tot', night: '/ nacht', viewRates: 'Bekijk tarieven', viewDetails: 'Bekijk details →', scan: 'Scan om op je telefoon te bekijken', specialOffers: 'Speciale aanbiedingen', limitedOffer: 'Tijdelijke aanbieding', ends: 'Eindigt' }
  };
  const ct = cardT[lang] || cardT.en;
  
  // Calculate discounted price if offer present
  let originalPrice = price;
  let discountedPrice = price;
  let discountText = '';
  
  if (offer) {
    if (offer.discount_type === 'percent' || offer.discount_type === 'percentage') {
      discountedPrice = Math.round(price * (1 - (offer.discount_value / 100)));
      discountText = offer.discount_value + '% OFF';
    } else if (offer.discount_type === 'fixed') {
      discountedPrice = Math.max(0, price - offer.discount_value);
      discountText = currency + offer.discount_value + ' OFF';
    } else if (offer.custom_price) {
      discountedPrice = offer.custom_price;
      discountText = 'SPECIAL PRICE';
    }
  }
  
  // Add offer and lang params to liteUrl
  let finalLiteUrl = liteUrl;
  const urlParams = [];
  if (offer && offer.offer_code) urlParams.push('offer=' + offer.offer_code);
  if (lang !== 'en') urlParams.push('lang=' + lang);
  if (urlParams.length > 0) finalLiteUrl += '?' + urlParams.join('&');
  
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | GAS Lite Card</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background: linear-gradient(135deg, #1e293b, #0f172a); min-height: 100vh; padding: 20px; display: flex; justify-content: center; align-items: center; }
    .card { background: white; border-radius: 24px; overflow: hidden; max-width: 400px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .hero { position: relative; height: 240px; }
    .hero img { width: 100%; height: 100%; object-fit: cover; }
    .hero-overlay { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 40px 20px 20px; color: white; }
    .location { font-size: 14px; opacity: 0.9; margin-bottom: 4px; }
    .title { font-size: 1.5rem; font-weight: 700; }
    .offer-star { position: absolute; top: 12px; left: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 12px; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(245,158,11,0.4); }
    ${offer ? `
    .offer-banner { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 16px 20px; text-align: center; }
    .offer-banner-text { font-size: 1.75rem; font-weight: 800; letter-spacing: 1px; }
    .offer-banner-sub { font-size: 0.85rem; opacity: 0.9; margin-top: 4px; }
    ` : ''}
    .content { padding: 20px; }
    .tagline { color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
    .features { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .feature { background: #f1f5f9; padding: 8px 12px; border-radius: 8px; font-size: 13px; color: #475569; }
    .price-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .price { font-size: 24px; font-weight: 700; color: ${offer ? '#10b981' : accent}; }
    .price-original { text-decoration: line-through; color: #94a3b8; font-size: 16px; margin-right: 8px; }
    .cta { display: block; width: 100%; background: ${accent}; color: white; text-align: center; padding: 14px; border-radius: 12px; font-weight: 600; text-decoration: none; }
    .qr-section { display: flex; align-items: center; gap: 12px; padding: 16px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .qr-section img { width: 70px; height: 70px; }
    .qr-text { font-size: 12px; color: #64748b; }
    .qr-url { font-weight: 600; color: #1e293b; }
    .footer { text-align: center; padding: 12px; font-size: 12px; color: #94a3b8; background: #f1f5f9; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
    .lang-switch { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hero">
      ${image ? `<img src="${image}" alt="${escapeForHTML(title)}">` : '<div style="background:#e2e8f0;height:100%;display:flex;align-items:center;justify-content:center;font-size:60px;">🏠</div>'}
      ${hasOffers && !offer ? `<div class="offer-star">⭐ ${ct.specialOffers}</div>` : ''}
      <div class="hero-overlay">
        <div class="location">📍 ${escapeForHTML(lite.city || '')}${lite.country ? ', ' + escapeForHTML(lite.country) : ''}</div>
        <h1 class="title">${escapeForHTML(title)}</h1>
      </div>
    </div>
    ${offer ? `
    <div class="offer-banner">
      <div class="offer-banner-text">🔥 ${discountText}</div>
      <div class="offer-banner-sub">${offer.name || ct.limitedOffer}${offer.valid_until ? ' • ' + ct.ends + ' ' + new Date(offer.valid_until).toLocaleDateString(lang === 'es' ? 'es-ES' : lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : lang === 'nl' ? 'nl-NL' : 'en-GB', {day: 'numeric', month: 'short'}) : ''}</div>
    </div>
    ` : ''}
    <div class="content">
      ${shortDesc ? `<p class="tagline">${escapeForHTML(shortDesc)}</p>` : ''}
      <div class="features">
        ${lite.bedroom_count ? `<div class="feature">🛏️ ${lite.bedroom_count} ${lite.bedroom_count > 1 ? ct.beds : ct.bed}</div>` : ''}
        ${lite.bathroom_count ? `<div class="feature">🚿 ${Math.floor(lite.bathroom_count)} ${Math.floor(lite.bathroom_count) > 1 ? ct.baths : ct.bath}</div>` : ''}
        ${lite.max_guests ? `<div class="feature">👥 ${ct.upto} ${lite.max_guests}</div>` : ''}
      </div>
      <div class="price-row">
        <div>
          ${offer && originalPrice !== discountedPrice ? `<span class="price-original">${currency}${Math.round(originalPrice).toLocaleString()}</span>` : ''}
          ${price ? `<span class="price">${currency}${Math.round(discountedPrice).toLocaleString()}</span><span style="color:#64748b;font-size:14px;"> ${ct.night}</span>` : `<span class="price">${ct.viewRates}</span>`}
        </div>
        ${lite.average_rating ? `<div style="color:#fbbf24;font-size:16px;">★ ${lite.average_rating}</div>` : ''}
      </div>
      <a href="${finalLiteUrl}" target="_blank" class="cta">${ct.viewDetails}</a>
    </div>
    <div class="qr-section">
      <img src="${qrCode}" alt="QR">
      <div><div class="qr-text">${ct.scan}</div><div class="qr-url">#${lite.slug}</div></div>
    </div>
    <div class="footer">
      ${lite.account_display_name ? `<strong>${escapeForHTML(lite.account_display_name)}</strong> • ` : ''}Powered by GAS.travel
      <select class="lang-switch" onchange="switchLang(this.value)">
        ${AVAILABLE_LANGUAGES.filter(l => supportedLangs.includes(l.code)).map(l => `<option value="${l.code}" ${l.code === lang ? 'selected' : ''}>${l.flag} ${l.code.toUpperCase()}</option>`).join('')}
      </select>
    </div>
  </div>
  <script>
    function switchLang(newLang) {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', newLang);
      window.location.href = url.toString();
    }
  </script>
</body>
</html>`;
}

function renderPrintCard({ lite, qrCode, liteUrl, image }) {
  // Use custom_title only if it's different from room_name (i.e., truly custom)
  const effectiveCustomTitle = (lite.custom_title && lite.custom_title !== lite.room_name) ? lite.custom_title : null;
  const title = effectiveCustomTitle || lite.display_name || lite.room_name || lite.name;
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Print - ${title}</title>
<style>
  @page { size: A6; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; width: 105mm; height: 148mm; padding: 8mm; }
  .card { border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden; height: 100%; display: flex; flex-direction: column; }
  .image { height: 45%; background: #f1f5f9; }
  .image img { width: 100%; height: 100%; object-fit: cover; }
  .content { padding: 4mm; flex: 1; display: flex; flex-direction: column; }
  .title { font-size: 14pt; font-weight: 700; margin-bottom: 2mm; }
  .location { font-size: 9pt; color: #64748b; margin-bottom: 4mm; }
  .qr-area { display: flex; align-items: center; gap: 4mm; margin-top: auto; padding-top: 4mm; border-top: 1px solid #e2e8f0; }
  .qr-area img { width: 25mm; height: 25mm; }
  .qr-text { font-size: 8pt; color: #64748b; }
  .qr-url { font-size: 9pt; font-weight: 600; }
  @media print { body { print-color-adjust: exact; } }
</style></head>
<body>
  <div class="card">
    <div class="image">${image ? `<img src="${image}">` : ''}</div>
    <div class="content">
      <h1 class="title">${escapeForHTML(title)}</h1>
      <p class="location">📍 ${escapeForHTML(lite.city || '')}, ${escapeForHTML(lite.country || '')}</p>
      <div class="qr-area">
        <img src="${qrCode}">
        <div><div class="qr-text">Scan to book direct</div><div class="qr-url">#${lite.slug}</div></div>
      </div>
    </div>
  </div>
  <script>window.print();</script>
</body></html>`;
}

// Start server
const PORT = process.env.PORT || 3002;
async function start() {
  await ensureLitesTable();
  app.listen(PORT, () => {
    console.log(`🚀 GAS Lites server running on port ${PORT}`);
    console.log(`   Full page: /:slug`);
    console.log(`   Promo card: /:slug/card`);
    console.log(`   QR: /:slug/qr`);
    console.log(`   Print: /:slug/print`);
  });
}
start().catch(console.error);
module.exports = app;
