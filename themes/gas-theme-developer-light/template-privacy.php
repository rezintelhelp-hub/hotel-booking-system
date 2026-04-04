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
 * Template Name: Privacy Policy
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
$wp = !empty($site_config['website']['page-privacy']) ? $site_config['website']['page-privacy'] : array();

// Also check legacy nested path as fallback
$legacy = !empty($site_config['pages']['privacy']) ? $site_config['pages']['privacy'] : null;
$legacy_sections = $legacy ? ($legacy['sections'] ?? []) : [];

$use_api = !empty($wp) || !empty($legacy_sections);

// Get current language for multilingual content
$lang = function_exists('developer_get_current_language') ? developer_get_current_language() : 'en';
$ml = function_exists('developer_get_ml_value') ? 'developer_get_ml_value' : null;

// Page settings
$page_title = '';
if (!empty($wp)) {
    $page_title = $ml ? $ml($wp, 'title', $lang) : ($wp['title'] ?? '');
}
if (empty($page_title) && $legacy) {
    $page_title = $legacy['title'] ?? '';
}
if (empty($page_title)) {
    $page_title = get_the_title() ?: 'Privacy Policy';
}

$updated_date = $wp['updated'] ?? ($legacy['updated_date'] ?? '');
$effective_date = $wp['effective'] ?? ($legacy['effective_date'] ?? '');

// Build displayable sections array — always auto-generate
$all_sections = [];

// Read dedicated privacy fields, falling back to contact info
$contact = $site_config['contact'] ?? [];
$seo = $site_config['seo'] ?? [];
$business_name = !empty($wp['business-name']) ? esc_html($wp['business-name'])
    : (!empty($contact['business_name']) ? esc_html($contact['business_name']) : '');
$email = !empty($wp['contact-email']) ? esc_html($wp['contact-email'])
    : (!empty($contact['email']) ? esc_html($contact['email']) : '');
$address = !empty($wp['business-address']) ? esc_html($wp['business-address'])
    : (!empty($contact['address_formatted']) ? esc_html($contact['address_formatted']) : '');
$ga_id = !empty($seo['google_analytics_id']) ? $seo['google_analytics_id'] : '';

// If no updated_date set, use today
if (empty($updated_date)) {
    $updated_date = date('Y-m-d');
}

// Translated strings per language
$t = [
    'en' => [
        'our_business'     => 'Our Business',
        'intro_title'      => 'Introduction',
        'intro_p1'         => '%s ("we", "us", or "our") is committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you visit our website, make a booking, or interact with our services.',
        'intro_p2'         => 'We are committed to complying with the General Data Protection Regulation (GDPR) and other applicable data protection laws. By using our website or services, you acknowledge that you have read and understood this Privacy Policy.',
        'collect_title'    => 'Information We Collect',
        'collect_intro'    => 'We may collect and process the following categories of personal data:',
        'collect_personal' => 'Personal Information:',
        'collect_personal_d'=> 'Name, email address, telephone number, postal address, and other contact details you provide when making a booking or enquiry.',
        'collect_booking'  => 'Booking Details:',
        'collect_booking_d'=> 'Check-in and check-out dates, room preferences, number of guests, and any special requests or requirements.',
        'collect_payment'  => 'Payment Information:',
        'collect_payment_d'=> 'Payment card details are processed securely by our third-party payment processor and are never stored on our servers.',
        'collect_tech'     => 'Technical Data:',
        'collect_tech_d'   => 'IP address, browser type and version, device information, operating system, time zone setting, and browsing actions on our website.',
        'usage_title'      => 'How We Use Your Information',
        'usage_intro'      => 'We use the personal information we collect for the following purposes:',
        'usage_1'          => 'To process and manage your bookings and payments',
        'usage_2'          => 'To send booking confirmations, reminders, and pre-arrival information',
        'usage_3'          => 'To communicate with you about your stay, including responding to enquiries and requests',
        'usage_4'          => 'To comply with legal and regulatory obligations, including tax and accounting requirements',
        'usage_5'          => 'To improve our website, services, and guest experience',
        'usage_6'          => 'To send marketing communications where you have given consent (you may opt out at any time)',
        'payment_title'    => 'Payment Processing',
        'payment_p1'       => 'All payment transactions are processed through Stripe, our trusted third-party payment processor. Stripe handles your card data in compliance with PCI DSS (Payment Card Industry Data Security Standard) requirements.',
        'payment_p2'       => 'We never store, process, or have access to your full credit or debit card numbers. Payment information is transmitted directly to Stripe using industry-standard encryption.',
        'cookies_title'    => 'Cookies & Analytics',
        'cookies_essential' => 'Our website uses essential cookies that are necessary for the site to function correctly, such as maintaining your session and remembering your preferences.',
        'cookies_ga'       => 'We use Google Analytics to understand how visitors interact with our website. Google Analytics uses cookies to collect anonymised information about page visits, traffic sources, and user behaviour. This helps us improve our website and the services we offer.',
        'cookies_ga_optout'=> 'Google Analytics Opt-out Browser Add-on',
        'cookies_generic'  => 'We may use analytics tools to understand how visitors interact with our website. These tools use cookies to collect anonymised information about page visits and user behaviour, helping us improve our website and services.',
        'cookies_manage'   => 'You can control and manage cookies through your browser settings. Please note that disabling certain cookies may affect the functionality of our website.',
        'third_title'      => 'Third Party Services',
        'third_intro'      => 'We work with trusted third-party service providers to deliver our services. These may include:',
        'third_stripe'     => 'Payment Processor (Stripe):',
        'third_stripe_d'   => 'To securely process payments for bookings',
        'third_channel'    => 'Channel Managers:',
        'third_channel_d'  => 'To distribute availability across booking platforms',
        'third_hosting'    => 'Hosting Provider:',
        'third_hosting_d'  => 'To host and maintain our website infrastructure',
        'third_outro'      => 'We only share personal data with third parties to the extent necessary for them to provide their services. All third-party providers are contractually required to protect your data and use it only for the purposes we specify.',
        'retention_title'  => 'Data Retention',
        'retention_intro'  => 'We retain personal data only for as long as necessary to fulfil the purposes for which it was collected:',
        'retention_booking'=> 'Booking and financial records:',
        'retention_booking_d'=> 'Retained for the period required by applicable tax and accounting regulations (typically 7 years)',
        'retention_market' => 'Marketing data:',
        'retention_market_d'=> 'Retained until you withdraw your consent or unsubscribe',
        'retention_logs'   => 'Technical logs:',
        'retention_logs_d' => 'Retained for up to 90 days for security and performance monitoring',
        'retention_outro'  => 'After the applicable retention period, personal data is securely deleted or anonymised.',
        'rights_title'     => 'Your Rights (GDPR)',
        'rights_intro'     => 'Under the General Data Protection Regulation (GDPR), you have the following rights regarding your personal data:',
        'rights_access'    => 'Right of Access:',
        'rights_access_d'  => 'You may request a copy of the personal data we hold about you',
        'rights_rectify'   => 'Right to Rectification:',
        'rights_rectify_d' => 'You may request that we correct any inaccurate or incomplete data',
        'rights_erase'     => 'Right to Erasure:',
        'rights_erase_d'   => 'You may request that we delete your personal data, subject to legal obligations',
        'rights_port'      => 'Right to Data Portability:',
        'rights_port_d'    => 'You may request your data in a structured, commonly used, machine-readable format',
        'rights_restrict'  => 'Right to Restrict Processing:',
        'rights_restrict_d'=> 'You may request that we limit how we use your data',
        'rights_object'    => 'Right to Object:',
        'rights_object_d'  => 'You may object to the processing of your personal data for certain purposes',
        'rights_complaint' => 'Right to Lodge a Complaint:',
        'rights_complaint_d'=> 'You have the right to lodge a complaint with a supervisory authority if you believe your data protection rights have been violated',
        'rights_contact'   => 'To exercise any of these rights, please contact us at %s. We will respond to your request within 30 days.',
        'rights_contact_generic' => 'To exercise any of these rights, please contact us using the details provided below. We will respond to your request within 30 days.',
        'google_title'     => 'Google API Services Disclosure',
        'google_body'      => 'Our use and transfer of information received from Google APIs to any other app will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.',
        'contact_title'    => 'Contact Us',
        'contact_intro'    => 'If you have any questions about this Privacy Policy or how we handle your personal data, please contact us:',
        'contact_email'    => 'Email:',
        'contact_address'  => 'Address:',
        'effective_label'  => 'Effective:',
        'updated_label'    => 'Last updated:',
    ],
    'fr' => [
        'our_business'     => 'Notre Entreprise',
        'intro_title'      => 'Introduction',
        'intro_p1'         => '%s (« nous », « notre » ou « nos ») s\'engage à protéger et à respecter votre vie privée. Cette Politique de Confidentialité explique comment nous collectons, utilisons, stockons et protégeons vos informations personnelles lorsque vous visitez notre site web, effectuez une réservation ou interagissez avec nos services.',
        'intro_p2'         => 'Nous nous engageons à respecter le Règlement Général sur la Protection des Données (RGPD) et les autres lois applicables en matière de protection des données. En utilisant notre site web ou nos services, vous reconnaissez avoir lu et compris cette Politique de Confidentialité.',
        'collect_title'    => 'Informations que nous collectons',
        'collect_intro'    => 'Nous pouvons collecter et traiter les catégories suivantes de données personnelles :',
        'collect_personal' => 'Informations personnelles :',
        'collect_personal_d'=> 'Nom, adresse e-mail, numéro de téléphone, adresse postale et autres coordonnées que vous fournissez lors d\'une réservation ou d\'une demande.',
        'collect_booking'  => 'Détails de réservation :',
        'collect_booking_d'=> 'Dates d\'arrivée et de départ, préférences de chambre, nombre de voyageurs et toute demande ou exigence particulière.',
        'collect_payment'  => 'Informations de paiement :',
        'collect_payment_d'=> 'Les données de carte de paiement sont traitées de manière sécurisée par notre prestataire de paiement tiers et ne sont jamais stockées sur nos serveurs.',
        'collect_tech'     => 'Données techniques :',
        'collect_tech_d'   => 'Adresse IP, type et version du navigateur, informations sur l\'appareil, système d\'exploitation, fuseau horaire et actions de navigation sur notre site web.',
        'usage_title'      => 'Comment nous utilisons vos informations',
        'usage_intro'      => 'Nous utilisons les informations personnelles collectées aux fins suivantes :',
        'usage_1'          => 'Traiter et gérer vos réservations et paiements',
        'usage_2'          => 'Envoyer des confirmations de réservation, des rappels et des informations pré-arrivée',
        'usage_3'          => 'Communiquer avec vous au sujet de votre séjour, y compris répondre aux demandes et requêtes',
        'usage_4'          => 'Respecter les obligations légales et réglementaires, y compris les exigences fiscales et comptables',
        'usage_5'          => 'Améliorer notre site web, nos services et l\'expérience de nos clients',
        'usage_6'          => 'Envoyer des communications marketing lorsque vous avez donné votre consentement (vous pouvez vous désinscrire à tout moment)',
        'payment_title'    => 'Traitement des paiements',
        'payment_p1'       => 'Toutes les transactions de paiement sont traitées par Stripe, notre prestataire de paiement tiers de confiance. Stripe traite vos données de carte conformément aux exigences PCI DSS (Payment Card Industry Data Security Standard).',
        'payment_p2'       => 'Nous ne stockons, traitons ni n\'avons accès à vos numéros complets de carte de crédit ou de débit. Les informations de paiement sont transmises directement à Stripe à l\'aide d\'un chiffrement conforme aux normes du secteur.',
        'cookies_title'    => 'Cookies et analyse',
        'cookies_essential' => 'Notre site web utilise des cookies essentiels nécessaires au bon fonctionnement du site, tels que le maintien de votre session et la mémorisation de vos préférences.',
        'cookies_ga'       => 'Nous utilisons Google Analytics pour comprendre comment les visiteurs interagissent avec notre site web. Google Analytics utilise des cookies pour collecter des informations anonymisées sur les visites de pages, les sources de trafic et le comportement des utilisateurs. Cela nous aide à améliorer notre site web et les services que nous proposons.',
        'cookies_ga_optout'=> 'Module complémentaire de désactivation de Google Analytics',
        'cookies_generic'  => 'Nous pouvons utiliser des outils d\'analyse pour comprendre comment les visiteurs interagissent avec notre site web. Ces outils utilisent des cookies pour collecter des informations anonymisées sur les visites de pages et le comportement des utilisateurs, nous aidant à améliorer notre site web et nos services.',
        'cookies_manage'   => 'Vous pouvez contrôler et gérer les cookies via les paramètres de votre navigateur. Veuillez noter que la désactivation de certains cookies peut affecter le fonctionnement de notre site web.',
        'third_title'      => 'Services tiers',
        'third_intro'      => 'Nous travaillons avec des prestataires de services tiers de confiance pour fournir nos services. Ceux-ci peuvent inclure :',
        'third_stripe'     => 'Processeur de paiement (Stripe) :',
        'third_stripe_d'   => 'Pour traiter de manière sécurisée les paiements des réservations',
        'third_channel'    => 'Gestionnaires de canaux :',
        'third_channel_d'  => 'Pour distribuer la disponibilité sur les plateformes de réservation',
        'third_hosting'    => 'Fournisseur d\'hébergement :',
        'third_hosting_d'  => 'Pour héberger et maintenir l\'infrastructure de notre site web',
        'third_outro'      => 'Nous ne partageons les données personnelles avec des tiers que dans la mesure nécessaire à la fourniture de leurs services. Tous les prestataires tiers sont contractuellement tenus de protéger vos données et de les utiliser uniquement aux fins que nous spécifions.',
        'retention_title'  => 'Conservation des données',
        'retention_intro'  => 'Nous conservons les données personnelles uniquement pendant la durée nécessaire à la réalisation des finalités pour lesquelles elles ont été collectées :',
        'retention_booking'=> 'Dossiers de réservation et financiers :',
        'retention_booking_d'=> 'Conservés pendant la durée requise par les réglementations fiscales et comptables applicables (généralement 7 ans)',
        'retention_market' => 'Données marketing :',
        'retention_market_d'=> 'Conservées jusqu\'au retrait de votre consentement ou à votre désinscription',
        'retention_logs'   => 'Journaux techniques :',
        'retention_logs_d' => 'Conservés jusqu\'à 90 jours pour la surveillance de la sécurité et des performances',
        'retention_outro'  => 'Après la période de conservation applicable, les données personnelles sont supprimées de manière sécurisée ou anonymisées.',
        'rights_title'     => 'Vos droits (RGPD)',
        'rights_intro'     => 'En vertu du Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants concernant vos données personnelles :',
        'rights_access'    => 'Droit d\'accès :',
        'rights_access_d'  => 'Vous pouvez demander une copie des données personnelles que nous détenons à votre sujet',
        'rights_rectify'   => 'Droit de rectification :',
        'rights_rectify_d' => 'Vous pouvez demander la correction de toute donnée inexacte ou incomplète',
        'rights_erase'     => 'Droit à l\'effacement :',
        'rights_erase_d'   => 'Vous pouvez demander la suppression de vos données personnelles, sous réserve des obligations légales',
        'rights_port'      => 'Droit à la portabilité :',
        'rights_port_d'    => 'Vous pouvez demander vos données dans un format structuré, couramment utilisé et lisible par machine',
        'rights_restrict'  => 'Droit à la limitation du traitement :',
        'rights_restrict_d'=> 'Vous pouvez demander la limitation de l\'utilisation de vos données',
        'rights_object'    => 'Droit d\'opposition :',
        'rights_object_d'  => 'Vous pouvez vous opposer au traitement de vos données personnelles à certaines fins',
        'rights_complaint' => 'Droit de réclamation :',
        'rights_complaint_d'=> 'Vous avez le droit de déposer une réclamation auprès d\'une autorité de contrôle si vous estimez que vos droits en matière de protection des données ont été violés',
        'rights_contact'   => 'Pour exercer l\'un de ces droits, veuillez nous contacter à %s. Nous répondrons à votre demande dans un délai de 30 jours.',
        'rights_contact_generic' => 'Pour exercer l\'un de ces droits, veuillez nous contacter en utilisant les coordonnées ci-dessous. Nous répondrons à votre demande dans un délai de 30 jours.',
        'google_title'     => 'Divulgation relative aux services API Google',
        'google_body'      => 'Notre utilisation et notre transfert d\'informations reçues des API Google vers toute autre application respecteront la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Politique relative aux données utilisateur des services API Google</a>, y compris les exigences d\'utilisation limitée.',
        'contact_title'    => 'Nous contacter',
        'contact_intro'    => 'Si vous avez des questions concernant cette Politique de Confidentialité ou la manière dont nous traitons vos données personnelles, veuillez nous contacter :',
        'contact_email'    => 'E-mail :',
        'contact_address'  => 'Adresse :',
        'effective_label'  => 'En vigueur :',
        'updated_label'    => 'Dernière mise à jour :',
    ],
    'es' => [
        'our_business'     => 'Nuestra Empresa',
        'intro_title'      => 'Introducción',
        'intro_p1'         => '%s ("nosotros", "nuestro" o "nos") se compromete a proteger y respetar su privacidad. Esta Política de Privacidad explica cómo recopilamos, utilizamos, almacenamos y protegemos su información personal cuando visita nuestro sitio web, realiza una reserva o interactúa con nuestros servicios.',
        'intro_p2'         => 'Nos comprometemos a cumplir con el Reglamento General de Protección de Datos (RGPD) y otras leyes de protección de datos aplicables. Al utilizar nuestro sitio web o servicios, usted reconoce haber leído y comprendido esta Política de Privacidad.',
        'collect_title'    => 'Información que recopilamos',
        'collect_intro'    => 'Podemos recopilar y procesar las siguientes categorías de datos personales:',
        'collect_personal' => 'Información personal:',
        'collect_personal_d'=> 'Nombre, dirección de correo electrónico, número de teléfono, dirección postal y otros datos de contacto que proporcione al realizar una reserva o consulta.',
        'collect_booking'  => 'Detalles de reserva:',
        'collect_booking_d'=> 'Fechas de entrada y salida, preferencias de habitación, número de huéspedes y cualquier solicitud o requisito especial.',
        'collect_payment'  => 'Información de pago:',
        'collect_payment_d'=> 'Los datos de la tarjeta de pago son procesados de forma segura por nuestro procesador de pagos externo y nunca se almacenan en nuestros servidores.',
        'collect_tech'     => 'Datos técnicos:',
        'collect_tech_d'   => 'Dirección IP, tipo y versión del navegador, información del dispositivo, sistema operativo, zona horaria y acciones de navegación en nuestro sitio web.',
        'usage_title'      => 'Cómo utilizamos su información',
        'usage_intro'      => 'Utilizamos la información personal recopilada para los siguientes fines:',
        'usage_1'          => 'Procesar y gestionar sus reservas y pagos',
        'usage_2'          => 'Enviar confirmaciones de reserva, recordatorios e información previa a la llegada',
        'usage_3'          => 'Comunicarnos con usted sobre su estancia, incluyendo responder a consultas y solicitudes',
        'usage_4'          => 'Cumplir con las obligaciones legales y reglamentarias, incluidos los requisitos fiscales y contables',
        'usage_5'          => 'Mejorar nuestro sitio web, servicios y experiencia del huésped',
        'usage_6'          => 'Enviar comunicaciones de marketing cuando haya dado su consentimiento (puede darse de baja en cualquier momento)',
        'payment_title'    => 'Procesamiento de pagos',
        'payment_p1'       => 'Todas las transacciones de pago se procesan a través de Stripe, nuestro procesador de pagos externo de confianza. Stripe gestiona los datos de su tarjeta en cumplimiento con los requisitos PCI DSS (Estándar de Seguridad de Datos de la Industria de Tarjetas de Pago).',
        'payment_p2'       => 'Nunca almacenamos, procesamos ni tenemos acceso a sus números completos de tarjeta de crédito o débito. La información de pago se transmite directamente a Stripe utilizando cifrado estándar de la industria.',
        'cookies_title'    => 'Cookies y análisis',
        'cookies_essential' => 'Nuestro sitio web utiliza cookies esenciales necesarias para el correcto funcionamiento del sitio, como mantener su sesión y recordar sus preferencias.',
        'cookies_ga'       => 'Utilizamos Google Analytics para comprender cómo los visitantes interactúan con nuestro sitio web. Google Analytics utiliza cookies para recopilar información anonimizada sobre visitas a páginas, fuentes de tráfico y comportamiento del usuario. Esto nos ayuda a mejorar nuestro sitio web y los servicios que ofrecemos.',
        'cookies_ga_optout'=> 'Complemento de inhabilitación de Google Analytics',
        'cookies_generic'  => 'Podemos utilizar herramientas de análisis para comprender cómo los visitantes interactúan con nuestro sitio web. Estas herramientas utilizan cookies para recopilar información anonimizada sobre visitas a páginas y comportamiento del usuario, ayudándonos a mejorar nuestro sitio web y servicios.',
        'cookies_manage'   => 'Puede controlar y gestionar las cookies a través de la configuración de su navegador. Tenga en cuenta que desactivar ciertas cookies puede afectar al funcionamiento de nuestro sitio web.',
        'third_title'      => 'Servicios de terceros',
        'third_intro'      => 'Trabajamos con proveedores de servicios externos de confianza para prestar nuestros servicios. Estos pueden incluir:',
        'third_stripe'     => 'Procesador de pagos (Stripe):',
        'third_stripe_d'   => 'Para procesar de forma segura los pagos de las reservas',
        'third_channel'    => 'Gestores de canales:',
        'third_channel_d'  => 'Para distribuir la disponibilidad en las plataformas de reserva',
        'third_hosting'    => 'Proveedor de alojamiento:',
        'third_hosting_d'  => 'Para alojar y mantener la infraestructura de nuestro sitio web',
        'third_outro'      => 'Solo compartimos datos personales con terceros en la medida necesaria para que presten sus servicios. Todos los proveedores externos están contractualmente obligados a proteger sus datos y utilizarlos únicamente para los fines que especificamos.',
        'retention_title'  => 'Conservación de datos',
        'retention_intro'  => 'Conservamos los datos personales únicamente durante el tiempo necesario para cumplir los fines para los que fueron recopilados:',
        'retention_booking'=> 'Registros de reservas y financieros:',
        'retention_booking_d'=> 'Conservados durante el período requerido por las regulaciones fiscales y contables aplicables (normalmente 7 años)',
        'retention_market' => 'Datos de marketing:',
        'retention_market_d'=> 'Conservados hasta que retire su consentimiento o se dé de baja',
        'retention_logs'   => 'Registros técnicos:',
        'retention_logs_d' => 'Conservados hasta 90 días para la supervisión de seguridad y rendimiento',
        'retention_outro'  => 'Tras el período de conservación aplicable, los datos personales se eliminan de forma segura o se anonimizan.',
        'rights_title'     => 'Sus derechos (RGPD)',
        'rights_intro'     => 'En virtud del Reglamento General de Protección de Datos (RGPD), usted tiene los siguientes derechos respecto a sus datos personales:',
        'rights_access'    => 'Derecho de acceso:',
        'rights_access_d'  => 'Puede solicitar una copia de los datos personales que tenemos sobre usted',
        'rights_rectify'   => 'Derecho de rectificación:',
        'rights_rectify_d' => 'Puede solicitar la corrección de cualquier dato inexacto o incompleto',
        'rights_erase'     => 'Derecho de supresión:',
        'rights_erase_d'   => 'Puede solicitar la eliminación de sus datos personales, sujeto a obligaciones legales',
        'rights_port'      => 'Derecho a la portabilidad:',
        'rights_port_d'    => 'Puede solicitar sus datos en un formato estructurado, de uso común y lectura mecánica',
        'rights_restrict'  => 'Derecho a la limitación del tratamiento:',
        'rights_restrict_d'=> 'Puede solicitar que limitemos el uso de sus datos',
        'rights_object'    => 'Derecho de oposición:',
        'rights_object_d'  => 'Puede oponerse al tratamiento de sus datos personales para determinados fines',
        'rights_complaint' => 'Derecho a presentar una reclamación:',
        'rights_complaint_d'=> 'Tiene derecho a presentar una reclamación ante una autoridad de control si considera que se han vulnerado sus derechos de protección de datos',
        'rights_contact'   => 'Para ejercer cualquiera de estos derechos, contáctenos en %s. Responderemos a su solicitud en un plazo de 30 días.',
        'rights_contact_generic' => 'Para ejercer cualquiera de estos derechos, contáctenos utilizando los datos proporcionados a continuación. Responderemos a su solicitud en un plazo de 30 días.',
        'google_title'     => 'Divulgación de servicios de API de Google',
        'google_body'      => 'Nuestro uso y transferencia de información recibida de las API de Google a cualquier otra aplicación cumplirá con la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Política de Datos de Usuario de los Servicios de API de Google</a>, incluidos los requisitos de uso limitado.',
        'contact_title'    => 'Contáctenos',
        'contact_intro'    => 'Si tiene alguna pregunta sobre esta Política de Privacidad o sobre cómo tratamos sus datos personales, contáctenos:',
        'contact_email'    => 'Correo electrónico:',
        'contact_address'  => 'Dirección:',
        'effective_label'  => 'Vigente desde:',
        'updated_label'    => 'Última actualización:',
    ],
    'nl' => [
        'our_business'     => 'Ons Bedrijf',
        'intro_title'      => 'Inleiding',
        'intro_p1'         => '%s ("wij", "ons" of "onze") zet zich in voor de bescherming en eerbiediging van uw privacy. Dit Privacybeleid legt uit hoe wij uw persoonlijke gegevens verzamelen, gebruiken, opslaan en beschermen wanneer u onze website bezoekt, een boeking maakt of met onze diensten communiceert.',
        'intro_p2'         => 'Wij zetten ons in voor naleving van de Algemene Verordening Gegevensbescherming (AVG) en andere toepasselijke wetgeving inzake gegevensbescherming. Door gebruik te maken van onze website of diensten erkent u dit Privacybeleid te hebben gelezen en begrepen.',
        'collect_title'    => 'Informatie die wij verzamelen',
        'collect_intro'    => 'Wij kunnen de volgende categorieën persoonsgegevens verzamelen en verwerken:',
        'collect_personal' => 'Persoonlijke informatie:',
        'collect_personal_d'=> 'Naam, e-mailadres, telefoonnummer, postadres en andere contactgegevens die u verstrekt bij het maken van een boeking of het indienen van een vraag.',
        'collect_booking'  => 'Boekingsgegevens:',
        'collect_booking_d'=> 'In- en uitcheckdatums, kamervoorkeuren, aantal gasten en eventuele speciale verzoeken of vereisten.',
        'collect_payment'  => 'Betalingsgegevens:',
        'collect_payment_d'=> 'Betaalkaartgegevens worden veilig verwerkt door onze externe betalingsverwerker en worden nooit op onze servers opgeslagen.',
        'collect_tech'     => 'Technische gegevens:',
        'collect_tech_d'   => 'IP-adres, browsertype en -versie, apparaatinformatie, besturingssysteem, tijdzone-instelling en browseactiviteiten op onze website.',
        'usage_title'      => 'Hoe wij uw informatie gebruiken',
        'usage_intro'      => 'Wij gebruiken de verzamelde persoonlijke informatie voor de volgende doeleinden:',
        'usage_1'          => 'Het verwerken en beheren van uw boekingen en betalingen',
        'usage_2'          => 'Het verzenden van boekingsbevestigingen, herinneringen en pre-arrival informatie',
        'usage_3'          => 'Communiceren met u over uw verblijf, inclusief het beantwoorden van vragen en verzoeken',
        'usage_4'          => 'Voldoen aan wettelijke en regelgevende verplichtingen, waaronder fiscale en boekhoudkundige vereisten',
        'usage_5'          => 'Het verbeteren van onze website, diensten en gastervaring',
        'usage_6'          => 'Het verzenden van marketingcommunicatie wanneer u toestemming heeft gegeven (u kunt zich op elk moment afmelden)',
        'payment_title'    => 'Betalingsverwerking',
        'payment_p1'       => 'Alle betalingstransacties worden verwerkt via Stripe, onze vertrouwde externe betalingsverwerker. Stripe verwerkt uw kaartgegevens in overeenstemming met de PCI DSS-vereisten (Payment Card Industry Data Security Standard).',
        'payment_p2'       => 'Wij slaan nooit uw volledige creditcard- of debetkaanummers op, verwerken deze niet en hebben er geen toegang toe. Betalingsinformatie wordt rechtstreeks naar Stripe verzonden met behulp van industriestandaard versleuteling.',
        'cookies_title'    => 'Cookies en analyse',
        'cookies_essential' => 'Onze website maakt gebruik van essentiële cookies die noodzakelijk zijn voor het correct functioneren van de site, zoals het onderhouden van uw sessie en het onthouden van uw voorkeuren.',
        'cookies_ga'       => 'Wij gebruiken Google Analytics om te begrijpen hoe bezoekers met onze website omgaan. Google Analytics maakt gebruik van cookies om geanonimiseerde informatie te verzamelen over paginabezoeken, verkeersbronnen en gebruikersgedrag. Dit helpt ons onze website en de diensten die wij aanbieden te verbeteren.',
        'cookies_ga_optout'=> 'Google Analytics Opt-out Browser Add-on',
        'cookies_generic'  => 'Wij kunnen analysetools gebruiken om te begrijpen hoe bezoekers met onze website omgaan. Deze tools maken gebruik van cookies om geanonimiseerde informatie te verzamelen over paginabezoeken en gebruikersgedrag, waardoor wij onze website en diensten kunnen verbeteren.',
        'cookies_manage'   => 'U kunt cookies beheren via de instellingen van uw browser. Houd er rekening mee dat het uitschakelen van bepaalde cookies de functionaliteit van onze website kan beïnvloeden.',
        'third_title'      => 'Diensten van derden',
        'third_intro'      => 'Wij werken samen met vertrouwde externe dienstverleners om onze diensten te leveren. Deze kunnen zijn:',
        'third_stripe'     => 'Betalingsverwerker (Stripe):',
        'third_stripe_d'   => 'Voor het veilig verwerken van betalingen voor boekingen',
        'third_channel'    => 'Channelmanagers:',
        'third_channel_d'  => 'Voor het distribueren van beschikbaarheid op boekingsplatformen',
        'third_hosting'    => 'Hostingprovider:',
        'third_hosting_d'  => 'Voor het hosten en onderhouden van onze website-infrastructuur',
        'third_outro'      => 'Wij delen persoonsgegevens alleen met derden voor zover dit noodzakelijk is om hun diensten te verlenen. Alle externe dienstverleners zijn contractueel verplicht uw gegevens te beschermen en uitsluitend te gebruiken voor de doeleinden die wij specificeren.',
        'retention_title'  => 'Bewaring van gegevens',
        'retention_intro'  => 'Wij bewaren persoonsgegevens alleen zo lang als nodig is om de doeleinden te vervullen waarvoor ze zijn verzameld:',
        'retention_booking'=> 'Boekings- en financiële gegevens:',
        'retention_booking_d'=> 'Bewaard gedurende de periode vereist door toepasselijke belasting- en boekhoudregelgeving (doorgaans 7 jaar)',
        'retention_market' => 'Marketinggegevens:',
        'retention_market_d'=> 'Bewaard totdat u uw toestemming intrekt of zich afmeldt',
        'retention_logs'   => 'Technische logs:',
        'retention_logs_d' => 'Bewaard tot 90 dagen voor beveiligings- en prestatiemonitoring',
        'retention_outro'  => 'Na de toepasselijke bewaartermijn worden persoonsgegevens veilig verwijderd of geanonimiseerd.',
        'rights_title'     => 'Uw rechten (AVG)',
        'rights_intro'     => 'Op grond van de Algemene Verordening Gegevensbescherming (AVG) heeft u de volgende rechten met betrekking tot uw persoonsgegevens:',
        'rights_access'    => 'Recht op inzage:',
        'rights_access_d'  => 'U kunt een kopie opvragen van de persoonsgegevens die wij over u bewaren',
        'rights_rectify'   => 'Recht op rectificatie:',
        'rights_rectify_d' => 'U kunt verzoeken om correctie van onjuiste of onvolledige gegevens',
        'rights_erase'     => 'Recht op wissing:',
        'rights_erase_d'   => 'U kunt verzoeken om verwijdering van uw persoonsgegevens, onder voorbehoud van wettelijke verplichtingen',
        'rights_port'      => 'Recht op overdraagbaarheid:',
        'rights_port_d'    => 'U kunt uw gegevens opvragen in een gestructureerd, gangbaar en machineleesbaar formaat',
        'rights_restrict'  => 'Recht op beperking van verwerking:',
        'rights_restrict_d'=> 'U kunt verzoeken dat wij het gebruik van uw gegevens beperken',
        'rights_object'    => 'Recht van bezwaar:',
        'rights_object_d'  => 'U kunt bezwaar maken tegen de verwerking van uw persoonsgegevens voor bepaalde doeleinden',
        'rights_complaint' => 'Recht om een klacht in te dienen:',
        'rights_complaint_d'=> 'U heeft het recht een klacht in te dienen bij een toezichthoudende autoriteit als u van mening bent dat uw gegevensbeschermingsrechten zijn geschonden',
        'rights_contact'   => 'Om een van deze rechten uit te oefenen, neem contact met ons op via %s. Wij zullen binnen 30 dagen op uw verzoek reageren.',
        'rights_contact_generic' => 'Om een van deze rechten uit te oefenen, neem contact met ons op via de onderstaande gegevens. Wij zullen binnen 30 dagen op uw verzoek reageren.',
        'google_title'     => 'Google API Services Openbaarmaking',
        'google_body'      => 'Ons gebruik en overdracht van informatie ontvangen van Google API\'s naar elke andere app zal voldoen aan het <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services Gebruikersgegevensbeleid</a>, inclusief de vereisten voor beperkt gebruik.',
        'contact_title'    => 'Contact',
        'contact_intro'    => 'Als u vragen heeft over dit Privacybeleid of over de manier waarop wij uw persoonsgegevens verwerken, neem dan contact met ons op:',
        'contact_email'    => 'E-mail:',
        'contact_address'  => 'Adres:',
        'effective_label'  => 'Geldig vanaf:',
        'updated_label'    => 'Laatst bijgewerkt:',
    ],
    'de' => [
        'our_business'     => 'Unser Unternehmen',
        'intro_title'      => 'Einleitung',
        'intro_p1'         => '%s („wir", „uns" oder „unser") verpflichtet sich, Ihre Privatsphäre zu schützen und zu respektieren. Diese Datenschutzerklärung erläutert, wie wir Ihre personenbezogenen Daten erfassen, verwenden, speichern und schützen, wenn Sie unsere Website besuchen, eine Buchung vornehmen oder mit unseren Diensten interagieren.',
        'intro_p2'         => 'Wir verpflichten uns zur Einhaltung der Datenschutz-Grundverordnung (DSGVO) und anderer geltender Datenschutzgesetze. Durch die Nutzung unserer Website oder Dienste bestätigen Sie, dass Sie diese Datenschutzerklärung gelesen und verstanden haben.',
        'collect_title'    => 'Informationen, die wir erheben',
        'collect_intro'    => 'Wir können die folgenden Kategorien personenbezogener Daten erheben und verarbeiten:',
        'collect_personal' => 'Persönliche Daten:',
        'collect_personal_d'=> 'Name, E-Mail-Adresse, Telefonnummer, Postanschrift und andere Kontaktdaten, die Sie bei einer Buchung oder Anfrage angeben.',
        'collect_booking'  => 'Buchungsdetails:',
        'collect_booking_d'=> 'An- und Abreisedaten, Zimmerpräferenzen, Anzahl der Gäste sowie besondere Wünsche oder Anforderungen.',
        'collect_payment'  => 'Zahlungsinformationen:',
        'collect_payment_d'=> 'Zahlungskartendaten werden sicher von unserem externen Zahlungsdienstleister verarbeitet und niemals auf unseren Servern gespeichert.',
        'collect_tech'     => 'Technische Daten:',
        'collect_tech_d'   => 'IP-Adresse, Browsertyp und -version, Geräteinformationen, Betriebssystem, Zeitzoneneinstellung und Browsing-Aktivitäten auf unserer Website.',
        'usage_title'      => 'Wie wir Ihre Daten verwenden',
        'usage_intro'      => 'Wir verwenden die erhobenen personenbezogenen Daten für folgende Zwecke:',
        'usage_1'          => 'Verarbeitung und Verwaltung Ihrer Buchungen und Zahlungen',
        'usage_2'          => 'Versand von Buchungsbestätigungen, Erinnerungen und Vorab-Informationen',
        'usage_3'          => 'Kommunikation mit Ihnen über Ihren Aufenthalt, einschließlich der Beantwortung von Anfragen und Wünschen',
        'usage_4'          => 'Erfüllung gesetzlicher und regulatorischer Pflichten, einschließlich steuer- und buchhaltungsrechtlicher Anforderungen',
        'usage_5'          => 'Verbesserung unserer Website, Dienste und des Gästeerlebnisses',
        'usage_6'          => 'Versand von Marketingmitteilungen, sofern Sie Ihre Einwilligung erteilt haben (Sie können sich jederzeit abmelden)',
        'payment_title'    => 'Zahlungsabwicklung',
        'payment_p1'       => 'Alle Zahlungstransaktionen werden über Stripe, unseren vertrauenswürdigen externen Zahlungsdienstleister, abgewickelt. Stripe verarbeitet Ihre Kartendaten in Übereinstimmung mit den Anforderungen des PCI DSS (Payment Card Industry Data Security Standard).',
        'payment_p2'       => 'Wir speichern, verarbeiten oder haben zu keinem Zeitpunkt Zugriff auf Ihre vollständigen Kredit- oder Debitkartennummern. Zahlungsinformationen werden direkt mit branchenüblicher Verschlüsselung an Stripe übermittelt.',
        'cookies_title'    => 'Cookies und Analyse',
        'cookies_essential' => 'Unsere Website verwendet essenzielle Cookies, die für die ordnungsgemäße Funktion der Website erforderlich sind, wie z. B. die Aufrechterhaltung Ihrer Sitzung und das Speichern Ihrer Einstellungen.',
        'cookies_ga'       => 'Wir verwenden Google Analytics, um zu verstehen, wie Besucher mit unserer Website interagieren. Google Analytics verwendet Cookies, um anonymisierte Informationen über Seitenbesuche, Verkehrsquellen und Nutzerverhalten zu sammeln. Dies hilft uns, unsere Website und die von uns angebotenen Dienste zu verbessern.',
        'cookies_ga_optout'=> 'Google Analytics Opt-out Browser Add-on',
        'cookies_generic'  => 'Wir können Analysetools verwenden, um zu verstehen, wie Besucher mit unserer Website interagieren. Diese Tools verwenden Cookies, um anonymisierte Informationen über Seitenbesuche und Nutzerverhalten zu sammeln und uns bei der Verbesserung unserer Website und Dienste zu unterstützen.',
        'cookies_manage'   => 'Sie können Cookies über die Einstellungen Ihres Browsers verwalten. Bitte beachten Sie, dass die Deaktivierung bestimmter Cookies die Funktionalität unserer Website beeinträchtigen kann.',
        'third_title'      => 'Dienste Dritter',
        'third_intro'      => 'Wir arbeiten mit vertrauenswürdigen externen Dienstleistern zusammen, um unsere Dienste zu erbringen. Dazu können gehören:',
        'third_stripe'     => 'Zahlungsdienstleister (Stripe):',
        'third_stripe_d'   => 'Für die sichere Abwicklung von Buchungszahlungen',
        'third_channel'    => 'Channel-Manager:',
        'third_channel_d'  => 'Für die Verteilung der Verfügbarkeit auf Buchungsplattformen',
        'third_hosting'    => 'Hosting-Anbieter:',
        'third_hosting_d'  => 'Für das Hosting und die Wartung unserer Website-Infrastruktur',
        'third_outro'      => 'Wir geben personenbezogene Daten nur in dem Umfang an Dritte weiter, der für die Erbringung ihrer Dienste erforderlich ist. Alle externen Dienstleister sind vertraglich verpflichtet, Ihre Daten zu schützen und nur für die von uns festgelegten Zwecke zu verwenden.',
        'retention_title'  => 'Datenspeicherung',
        'retention_intro'  => 'Wir speichern personenbezogene Daten nur so lange, wie es zur Erfüllung der Zwecke erforderlich ist, für die sie erhoben wurden:',
        'retention_booking'=> 'Buchungs- und Finanzunterlagen:',
        'retention_booking_d'=> 'Aufbewahrt für den Zeitraum, der durch die geltenden Steuer- und Buchhaltungsvorschriften vorgeschrieben ist (in der Regel 7 Jahre)',
        'retention_market' => 'Marketingdaten:',
        'retention_market_d'=> 'Aufbewahrt bis zum Widerruf Ihrer Einwilligung oder Abmeldung',
        'retention_logs'   => 'Technische Protokolle:',
        'retention_logs_d' => 'Aufbewahrt bis zu 90 Tage für die Sicherheits- und Leistungsüberwachung',
        'retention_outro'  => 'Nach Ablauf der geltenden Aufbewahrungsfrist werden personenbezogene Daten sicher gelöscht oder anonymisiert.',
        'rights_title'     => 'Ihre Rechte (DSGVO)',
        'rights_intro'     => 'Gemäß der Datenschutz-Grundverordnung (DSGVO) haben Sie folgende Rechte in Bezug auf Ihre personenbezogenen Daten:',
        'rights_access'    => 'Auskunftsrecht:',
        'rights_access_d'  => 'Sie können eine Kopie der personenbezogenen Daten anfordern, die wir über Sie gespeichert haben',
        'rights_rectify'   => 'Recht auf Berichtigung:',
        'rights_rectify_d' => 'Sie können die Korrektur unrichtiger oder unvollständiger Daten verlangen',
        'rights_erase'     => 'Recht auf Löschung:',
        'rights_erase_d'   => 'Sie können die Löschung Ihrer personenbezogenen Daten verlangen, vorbehaltlich gesetzlicher Pflichten',
        'rights_port'      => 'Recht auf Datenübertragbarkeit:',
        'rights_port_d'    => 'Sie können Ihre Daten in einem strukturierten, gängigen und maschinenlesbaren Format anfordern',
        'rights_restrict'  => 'Recht auf Einschränkung der Verarbeitung:',
        'rights_restrict_d'=> 'Sie können verlangen, dass wir die Nutzung Ihrer Daten einschränken',
        'rights_object'    => 'Widerspruchsrecht:',
        'rights_object_d'  => 'Sie können der Verarbeitung Ihrer personenbezogenen Daten für bestimmte Zwecke widersprechen',
        'rights_complaint' => 'Beschwerderecht:',
        'rights_complaint_d'=> 'Sie haben das Recht, eine Beschwerde bei einer Aufsichtsbehörde einzureichen, wenn Sie der Ansicht sind, dass Ihre Datenschutzrechte verletzt wurden',
        'rights_contact'   => 'Um eines dieser Rechte auszuüben, kontaktieren Sie uns bitte unter %s. Wir werden Ihre Anfrage innerhalb von 30 Tagen beantworten.',
        'rights_contact_generic' => 'Um eines dieser Rechte auszuüben, kontaktieren Sie uns bitte über die unten angegebenen Kontaktdaten. Wir werden Ihre Anfrage innerhalb von 30 Tagen beantworten.',
        'google_title'     => 'Offenlegung zu Google-API-Diensten',
        'google_body'      => 'Unsere Nutzung und Übertragung von Informationen, die von Google-APIs empfangen werden, an andere Anwendungen erfolgt in Übereinstimmung mit der <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, einschließlich der Anforderungen zur eingeschränkten Nutzung.',
        'contact_title'    => 'Kontakt',
        'contact_intro'    => 'Wenn Sie Fragen zu dieser Datenschutzerklärung oder zur Verarbeitung Ihrer personenbezogenen Daten haben, kontaktieren Sie uns bitte:',
        'contact_email'    => 'E-Mail:',
        'contact_address'  => 'Adresse:',
        'effective_label'  => 'Gültig ab:',
        'updated_label'    => 'Zuletzt aktualisiert:',
    ],
    'ja' => [
        'our_business'     => '当社',
        'intro_title'      => 'はじめに',
        'intro_p1'         => '%s（以下「当社」）は、お客様のプライバシーの保護と尊重に努めています。本プライバシーポリシーは、お客様が当社のウェブサイトをご利用になる際、ご予約をされる際、または当社のサービスをご利用になる際に、当社がお客様の個人情報をどのように収集、使用、保管、保護するかについて説明するものです。',
        'intro_p2'         => '当社は、EU一般データ保護規則（GDPR）およびその他の適用されるデータ保護法の遵守に努めています。当社のウェブサイトまたはサービスをご利用になることにより、お客様は本プライバシーポリシーを読み、理解したことを認めるものとします。',
        'collect_title'    => '収集する情報',
        'collect_intro'    => '当社は、以下のカテゴリーの個人データを収集・処理する場合があります：',
        'collect_personal' => '個人情報：',
        'collect_personal_d'=> 'ご予約やお問い合わせの際にご提供いただく、氏名、メールアドレス、電話番号、住所、その他の連絡先情報。',
        'collect_booking'  => '予約情報：',
        'collect_booking_d'=> 'チェックイン・チェックアウト日、客室のご希望、ご宿泊人数、特別なご要望やご要件。',
        'collect_payment'  => '決済情報：',
        'collect_payment_d'=> 'お支払いカード情報は、当社の第三者決済サービスプロバイダーにより安全に処理され、当社のサーバーに保存されることはありません。',
        'collect_tech'     => '技術データ：',
        'collect_tech_d'   => 'IPアドレス、ブラウザの種類とバージョン、デバイス情報、オペレーティングシステム、タイムゾーン設定、および当社ウェブサイトでの閲覧行動。',
        'usage_title'      => '情報の利用方法',
        'usage_intro'      => '当社は、収集した個人情報を以下の目的で使用します：',
        'usage_1'          => 'ご予約およびお支払いの処理・管理',
        'usage_2'          => '予約確認、リマインダー、到着前情報の送信',
        'usage_3'          => 'ご滞在に関するお客様とのコミュニケーション（お問い合わせやご要望への対応を含む）',
        'usage_4'          => '税務・会計上の要件を含む法的・規制上の義務の遵守',
        'usage_5'          => '当社ウェブサイト、サービス、およびお客様体験の向上',
        'usage_6'          => 'お客様の同意を得た場合のマーケティングコミュニケーションの送信（いつでも配信停止が可能です）',
        'payment_title'    => '決済処理',
        'payment_p1'       => 'すべての決済取引は、当社の信頼できる第三者決済サービスプロバイダーであるStripeを通じて処理されます。Stripeは、PCI DSS（Payment Card Industry Data Security Standard）の要件に準拠してお客様のカードデータを処理します。',
        'payment_p2'       => '当社は、お客様のクレジットカードまたはデビットカードの完全な番号を保存、処理、またはアクセスすることは一切ありません。決済情報は、業界標準の暗号化技術を使用してStripeに直接送信されます。',
        'cookies_title'    => 'Cookieおよびアクセス解析',
        'cookies_essential' => '当社のウェブサイトでは、セッションの維持やお客様の設定の記憶など、サイトの正常な動作に必要な必須Cookieを使用しています。',
        'cookies_ga'       => '当社は、訪問者が当社のウェブサイトとどのようにやり取りするかを理解するためにGoogle Analyticsを使用しています。Google Analyticsは、Cookieを使用してページ訪問、トラフィックソース、ユーザー行動に関する匿名化された情報を収集します。これにより、当社のウェブサイトおよび提供するサービスの改善に役立てています。',
        'cookies_ga_optout'=> 'Google Analyticsオプトアウトブラウザアドオン',
        'cookies_generic'  => '当社は、訪問者が当社のウェブサイトとどのようにやり取りするかを理解するためにアクセス解析ツールを使用する場合があります。これらのツールはCookieを使用してページ訪問やユーザー行動に関する匿名化された情報を収集し、当社のウェブサイトおよびサービスの改善に役立てています。',
        'cookies_manage'   => 'ブラウザの設定からCookieを管理することができます。特定のCookieを無効にすると、当社ウェブサイトの機能に影響を与える場合がありますのでご注意ください。',
        'third_title'      => '第三者サービス',
        'third_intro'      => '当社は、サービスを提供するために、信頼できる第三者のサービスプロバイダーと連携しています。これには以下が含まれる場合があります：',
        'third_stripe'     => '決済処理業者（Stripe）：',
        'third_stripe_d'   => 'ご予約の決済を安全に処理するため',
        'third_channel'    => 'チャネルマネージャー：',
        'third_channel_d'  => '予約プラットフォーム全体で空室状況を配信するため',
        'third_hosting'    => 'ホスティングプロバイダー：',
        'third_hosting_d'  => '当社ウェブサイトのインフラストラクチャをホスティングおよび維持するため',
        'third_outro'      => '当社は、第三者がサービスを提供するために必要な範囲でのみ個人データを共有します。すべての外部プロバイダーは、お客様のデータを保護し、当社が指定する目的にのみ使用することが契約上義務付けられています。',
        'retention_title'  => 'データの保持',
        'retention_intro'  => '当社は、収集した目的を達成するために必要な期間のみ個人データを保持します：',
        'retention_booking'=> '予約および財務記録：',
        'retention_booking_d'=> '適用される税務・会計規制で要求される期間（通常7年間）保持',
        'retention_market' => 'マーケティングデータ：',
        'retention_market_d'=> 'お客様が同意を撤回するか配信停止するまで保持',
        'retention_logs'   => '技術ログ：',
        'retention_logs_d' => 'セキュリティおよびパフォーマンス監視のため最大90日間保持',
        'retention_outro'  => '該当する保持期間の終了後、個人データは安全に削除または匿名化されます。',
        'rights_title'     => 'お客様の権利（GDPR）',
        'rights_intro'     => 'EU一般データ保護規則（GDPR）に基づき、お客様は個人データに関して以下の権利を有します：',
        'rights_access'    => 'アクセス権：',
        'rights_access_d'  => '当社が保有するお客様の個人データの写しを請求することができます',
        'rights_rectify'   => '訂正権：',
        'rights_rectify_d' => '不正確または不完全なデータの訂正を請求することができます',
        'rights_erase'     => '消去権：',
        'rights_erase_d'   => '法的義務に従い、お客様の個人データの削除を請求することができます',
        'rights_port'      => 'データポータビリティ権：',
        'rights_port_d'    => '構造化された、一般的に使用される機械可読形式でデータを請求することができます',
        'rights_restrict'  => '処理制限権：',
        'rights_restrict_d'=> '当社によるお客様のデータの使用の制限を請求することができます',
        'rights_object'    => '異議申立権：',
        'rights_object_d'  => '特定の目的のためのお客様の個人データの処理に異議を申し立てることができます',
        'rights_complaint' => '苦情申立権：',
        'rights_complaint_d'=> 'データ保護に関する権利が侵害されたと考える場合、監督機関に苦情を申し立てる権利があります',
        'rights_contact'   => 'これらの権利を行使するには、%s までご連絡ください。30日以内にご回答いたします。',
        'rights_contact_generic' => 'これらの権利を行使するには、以下の連絡先までご連絡ください。30日以内にご回答いたします。',
        'google_title'     => 'Google APIサービスに関する開示',
        'google_body'      => '当社によるGoogle APIから受信した情報の使用および他のアプリへの転送は、限定使用の要件を含む<a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google APIサービスユーザーデータポリシー</a>に準拠します。',
        'contact_title'    => 'お問い合わせ',
        'contact_intro'    => '本プライバシーポリシーまたは当社による個人データの取り扱いについてご質問がある場合は、以下までお問い合わせください：',
        'contact_email'    => 'メール：',
        'contact_address'  => '住所：',
        'effective_label'  => '発効日：',
        'updated_label'    => '最終更新日：',
    ],
];

// Pick current language strings, fallback to English
$s = $t[$lang] ?? $t['en'];
$display_name = !empty($business_name) ? $business_name : $s['our_business'];

// 1. Introduction
$all_sections[] = [
    'title' => $s['intro_title'],
    'content' => '<p>' . sprintf($s['intro_p1'], $display_name) . '</p><p>' . $s['intro_p2'] . '</p>',
    'html' => true
];

// 2. Information We Collect
$all_sections[] = [
    'title' => $s['collect_title'],
    'content' => '<p>' . $s['collect_intro'] . '</p>'
        . '<p><strong>' . $s['collect_personal'] . '</strong> ' . $s['collect_personal_d'] . '</p>'
        . '<p><strong>' . $s['collect_booking'] . '</strong> ' . $s['collect_booking_d'] . '</p>'
        . '<p><strong>' . $s['collect_payment'] . '</strong> ' . $s['collect_payment_d'] . '</p>'
        . '<p><strong>' . $s['collect_tech'] . '</strong> ' . $s['collect_tech_d'] . '</p>',
    'html' => true
];

// 3. How We Use Your Information
$all_sections[] = [
    'title' => $s['usage_title'],
    'content' => '<p>' . $s['usage_intro'] . '</p><ul>'
        . '<li>' . $s['usage_1'] . '</li>'
        . '<li>' . $s['usage_2'] . '</li>'
        . '<li>' . $s['usage_3'] . '</li>'
        . '<li>' . $s['usage_4'] . '</li>'
        . '<li>' . $s['usage_5'] . '</li>'
        . '<li>' . $s['usage_6'] . '</li></ul>',
    'html' => true
];

// 4. Payment Processing
$all_sections[] = [
    'title' => $s['payment_title'],
    'content' => '<p>' . $s['payment_p1'] . '</p><p>' . $s['payment_p2'] . '</p>',
    'html' => true
];

// 5. Cookies & Analytics
$cookies_content = '<p>' . $s['cookies_essential'] . '</p>';
if (!empty($ga_id)) {
    $cookies_content .= '<p>' . $s['cookies_ga'] . ' <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">' . $s['cookies_ga_optout'] . '</a>.</p>';
} else {
    $cookies_content .= '<p>' . $s['cookies_generic'] . '</p>';
}
$cookies_content .= '<p>' . $s['cookies_manage'] . '</p>';
$all_sections[] = [
    'title' => $s['cookies_title'],
    'content' => $cookies_content,
    'html' => true
];

// 6. Third Party Services
$all_sections[] = [
    'title' => $s['third_title'],
    'content' => '<p>' . $s['third_intro'] . '</p><ul>'
        . '<li><strong>' . $s['third_stripe'] . '</strong> ' . $s['third_stripe_d'] . '</li>'
        . '<li><strong>' . $s['third_channel'] . '</strong> ' . $s['third_channel_d'] . '</li>'
        . '<li><strong>' . $s['third_hosting'] . '</strong> ' . $s['third_hosting_d'] . '</li>'
        . '</ul><p>' . $s['third_outro'] . '</p>',
    'html' => true
];

// 7. Data Retention
$all_sections[] = [
    'title' => $s['retention_title'],
    'content' => '<p>' . $s['retention_intro'] . '</p><ul>'
        . '<li><strong>' . $s['retention_booking'] . '</strong> ' . $s['retention_booking_d'] . '</li>'
        . '<li><strong>' . $s['retention_market'] . '</strong> ' . $s['retention_market_d'] . '</li>'
        . '<li><strong>' . $s['retention_logs'] . '</strong> ' . $s['retention_logs_d'] . '</li>'
        . '</ul><p>' . $s['retention_outro'] . '</p>',
    'html' => true
];

// 8. Your Rights (GDPR)
$rights_content = '<p>' . $s['rights_intro'] . '</p><ul>'
    . '<li><strong>' . $s['rights_access'] . '</strong> ' . $s['rights_access_d'] . '</li>'
    . '<li><strong>' . $s['rights_rectify'] . '</strong> ' . $s['rights_rectify_d'] . '</li>'
    . '<li><strong>' . $s['rights_erase'] . '</strong> ' . $s['rights_erase_d'] . '</li>'
    . '<li><strong>' . $s['rights_port'] . '</strong> ' . $s['rights_port_d'] . '</li>'
    . '<li><strong>' . $s['rights_restrict'] . '</strong> ' . $s['rights_restrict_d'] . '</li>'
    . '<li><strong>' . $s['rights_object'] . '</strong> ' . $s['rights_object_d'] . '</li>'
    . '<li><strong>' . $s['rights_complaint'] . '</strong> ' . $s['rights_complaint_d'] . '</li></ul>';
if (!empty($email)) {
    $email_link = '<a href="mailto:' . $email . '">' . $email . '</a>';
    $rights_content .= '<p>' . sprintf($s['rights_contact'], $email_link) . '</p>';
} else {
    $rights_content .= '<p>' . $s['rights_contact_generic'] . '</p>';
}
$all_sections[] = [
    'title' => $s['rights_title'],
    'content' => $rights_content,
    'html' => true
];

// 9. Google API Services Disclosure
$all_sections[] = [
    'title' => $s['google_title'],
    'content' => '<p>' . $s['google_body'] . '</p>',
    'html' => true
];

// 10. Contact Us
$contact_parts = [];
if (!empty($business_name)) {
    $contact_parts[] = '<p><strong>' . $business_name . '</strong></p>';
}
if (!empty($email)) {
    $contact_parts[] = '<p>' . $s['contact_email'] . ' <a href="mailto:' . $email . '">' . $email . '</a></p>';
}
if (!empty($address)) {
    $contact_parts[] = '<p>' . $s['contact_address'] . ' ' . $address . '</p>';
}
$contact_content = '<p>' . $s['contact_intro'] . '</p>' . implode('', $contact_parts);
$all_sections[] = [
    'title' => $s['contact_title'],
    'content' => $contact_content,
    'html' => true
];

$use_api = true;
?>

<main id="primary" class="site-main">

    <!-- Page Header -->
    <section class="developer-section" style="background: #f8fafc; padding: 120px 0 50px;">
        <div class="developer-container" style="text-align: center;">
            <h1 style="margin-bottom: 0.5rem;"><?php echo esc_html($page_title); ?></h1>
            <?php if ($updated_date || $effective_date) : ?>
            <p style="color: #64748b; font-size: 0.95rem; margin: 0;">
                <?php if ($effective_date) : ?><?php echo esc_html($s['effective_label']); ?> <?php echo esc_html(date('F j, Y', strtotime($effective_date))); ?><?php endif; ?>
                <?php if ($updated_date && $effective_date) : ?> · <?php endif; ?>
                <?php if ($updated_date) : ?><?php echo esc_html($s['updated_label']); ?> <?php echo esc_html(date('F j, Y', strtotime($updated_date))); ?><?php endif; ?>
            </p>
            <?php endif; ?>
        </div>
    </section>

    <?php if ($use_api && count($all_sections) > 0) : ?>
        <?php foreach ($all_sections as $index => $section) :
            $bg_color = ($index % 2 === 0) ? '#ffffff' : '#f8fafc';
        ?>
        <section class="developer-section developer-privacy-section" style="background: <?php echo $bg_color; ?>; padding: 50px 0;">
            <div class="developer-container">
                <div class="developer-privacy-content">
                    <h2><?php echo esc_html($section['title']); ?></h2>

                    <?php if (!empty($section['content'])) : ?>
                    <div class="developer-privacy-text">
                        <?php if (!empty($section['html'])) {
                            echo $section['content'];
                        } else {
                            echo wpautop(esc_html($section['content']));
                        } ?>
                    </div>
                    <?php endif; ?>

                    <?php if (!empty($section['sub_items'])) : ?>
                        <?php foreach ($section['sub_items'] as $sub_item) : ?>
                        <div class="developer-privacy-sub-section" style="margin-top: 1.5rem;">
                            <?php if (!empty($sub_item['heading'])) : ?>
                            <h3 style="font-size: 1.25rem; color: #334155; margin-bottom: 0.75rem; font-weight: 600;"><?php echo esc_html($sub_item['heading']); ?></h3>
                            <?php endif; ?>
                            <div class="developer-privacy-text">
                                <?php echo wpautop(esc_html($sub_item['content'])); ?>
                            </div>
                        </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </section>
        <?php endforeach; ?>
    <?php else : ?>
        <!-- Fallback message -->
        <section class="developer-section" style="background: #ffffff; padding: 50px 0;">
            <div class="developer-container">
                <div class="developer-privacy-content">
                    <p style="text-align: center; color: #64748b;">No privacy policy content has been configured yet. Please add content in GAS Admin → Website Builder → Privacy Policy.</p>
                </div>
            </div>
        </section>
    <?php endif; ?>

</main>

<?php
// Output FAQ Schema if enabled and FAQs exist
$faq_enabled = $wp['faq-enabled'] ?? ($legacy['faq_enabled'] ?? true);
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
.developer-privacy-content {
    max-width: 800px;
    margin: 0 auto;
}
.developer-privacy-content h2 {
    font-size: 1.75rem;
    color: #1e293b;
    margin-bottom: 1.5rem;
    font-weight: 600;
}
.developer-privacy-text p {
    line-height: 1.8;
    color: #475569;
    margin-bottom: 1rem;
    font-size: 1rem;
}
.developer-privacy-text p:last-child {
    margin-bottom: 0;
}
.developer-privacy-text ul {
    line-height: 1.8;
    color: #475569;
    margin-bottom: 1rem;
    font-size: 1rem;
    padding-left: 1.5rem;
}
.developer-privacy-text li {
    margin-bottom: 0.5rem;
}
.developer-privacy-text a {
    color: var(--color-primary, #2563eb);
    text-decoration: underline;
}
</style>

<?php get_footer(); ?>
