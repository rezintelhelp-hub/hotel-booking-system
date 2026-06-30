// One-off: insert Channex booking 5a1c054a... (BDC-5974506956, Leroyer/Celine,
// Aug 3-8, "No 5" room on Steve's gite) into GAS bookings table.
// Treating Celine as first_name + Leroyer as surname (matches the
// lcelin.715371@guest.booking.com email + standard French naming).
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  // Dupe guard
  const dup = await p.query("SELECT id FROM bookings WHERE channex_booking_id = $1", ['5a1c054a-917f-449d-9276-2604caa3eefc']);
  if (dup.rows.length) {
    console.log('already imported as booking id', dup.rows[0].id);
    await p.end(); return;
  }
  const r = await p.query(`
    INSERT INTO bookings (
      property_id, bookable_unit_id, property_owner_id,
      channex_booking_id, api_reference, reference,
      guest_first_name, guest_last_name, guest_email, guest_country_code,
      arrival_date, departure_date,
      num_adults, num_children, num_infants,
      currency, subtotal, tax_amount, commission_amount, grand_total, total_amount,
      accommodation_price,
      status, payment_status, booking_source, api_source,
      special_requests, notes,
      created_at, updated_at, booking_time
    ) VALUES (
      535, 1310, 1,
      '5a1c054a-917f-449d-9276-2604caa3eefc', 'BDC-5974506956', 'BDC-5974506956',
      'Celine', 'Leroyer', 'lcelin.715371@guest.booking.com', 'FR',
      '2026-08-03', '2026-08-08',
      2, 0, 0,
      'EUR', 251.00, 46.52, 44.62, 297.50, 297.50,
      297.50,
      'confirmed', 'paid', 'booking', 'channex',
      'Approximate time of arrival: 15:00-16:00. Non-Smoking. Pre-paid via Booking.com Payouts.',
      'Imported one-off from Channex 2026-06-30 — first Channex inbound booking on this account; ongoing sync to be built.',
      NOW(), NOW(), '2026-06-30 13:15:57+00'
    )
    RETURNING id
  `);
  console.log('inserted booking id', r.rows[0].id);
  await p.end();
})();
