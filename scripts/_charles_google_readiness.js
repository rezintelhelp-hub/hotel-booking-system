require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  // Property + rooms
  const prop = await p.query(`SELECT id, name, address, city, country, postal_code, latitude, longitude, description, currency FROM properties WHERE id = 1134`);
  console.log('=== Property ===');
  const pr = prop.rows[0];
  console.log(JSON.stringify(pr, null, 2));
  const rooms = await p.query(`SELECT id, name, description, max_guests, bedrooms, bathrooms, size_sqm FROM bookable_units WHERE property_id = 1134`);
  console.log(`\n=== Rooms (${rooms.rows.length}) ===`);
  for (const r of rooms.rows) console.log(JSON.stringify(r, null, 2));
  // Images
  const imgs = await p.query(`SELECT room_id, COUNT(*) AS n FROM room_images WHERE room_id = ANY($1::int[]) GROUP BY room_id ORDER BY room_id`, [rooms.rows.map(r=>r.id)]);
  console.log(`\n=== Room images ===`); for (const i of imgs.rows) console.log(`Room ${i.room_id}: ${i.n} images`);
  const propImgs = await p.query(`SELECT COUNT(*) AS n FROM property_images WHERE property_id = 1134`);
  console.log(`Property images: ${propImgs.rows[0].n}`);
  // Amenities
  const amen = await p.query(`SELECT COUNT(*) AS n FROM room_amenity_map WHERE room_id = ANY($1::int[])`, [rooms.rows.map(r=>r.id)]).catch(()=>({rows:[{n:'?'}]}));
  console.log(`\nRoom amenities mapped: ${amen.rows[0].n}`);
  // Contact + policies
  const acc = await p.query(`SELECT id, name, email, phone, website_url FROM accounts WHERE id = 273`);
  console.log(`\n=== Account contact ===`); console.log(JSON.stringify(acc.rows[0], null, 2));
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
