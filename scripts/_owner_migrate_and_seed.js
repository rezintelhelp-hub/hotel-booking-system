// Manual migration + seed for property_owners.
// Creates the table + owner_id column, then inserts Steve Driver as the
// first owner on account 197 and links his 5 Rte des Thermes property to
// him. Idempotent.
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await p.query(`
    CREATE TABLE IF NOT EXISTS property_owners (
      id SERIAL PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      name TEXT NOT NULL, company TEXT,
      address TEXT, postcode TEXT, city TEXT, country TEXT,
      phone TEXT, email TEXT,
      siret TEXT, tourist_let_reg TEXT,
      iban TEXT, bic TEXT, bank_account_name TEXT,
      default_security_deposit NUMERIC(10,2),
      default_cleaning_fee NUMERIC(10,2),
      default_tourist_tax_per_person_per_night NUMERIC(10,2),
      notes TEXT, is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);
  await p.query(`CREATE INDEX IF NOT EXISTS idx_po_account ON property_owners(account_id) WHERE is_active = true`);
  await p.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES property_owners(id) ON DELETE SET NULL`);
  await p.query(`CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id) WHERE owner_id IS NOT NULL`);
  console.log('Schema ready.');

  // Seed Steve Driver as owner on account 197 (idempotent by name)
  const existing = await p.query(`SELECT id FROM property_owners WHERE account_id = 197 AND name = 'Stephen DRIVER' LIMIT 1`);
  let ownerId;
  if (existing.rows[0]) {
    ownerId = existing.rows[0].id;
    console.log(`Owner already exists: #${ownerId}`);
  } else {
    const ins = await p.query(`
      INSERT INTO property_owners (
        account_id, name, address, postcode, city, country,
        phone, email, iban, bic, bank_account_name,
        default_security_deposit, default_cleaning_fee,
        default_tourist_tax_per_person_per_night
      ) VALUES (197, 'Stephen DRIVER', '[address]', '[postcode]', '[city]',
        'United Kingdom', '+44 7880 541120', 'stv.driver@googlemail.com',
        'FR76 1027 8022 3200 0201 8970 175', 'CMCIFR2A', 'M S Driver ou Mlle J Baxter',
        150.00, 35.00, 0.50) RETURNING id`);
    ownerId = ins.rows[0].id;
    console.log(`Owner created: #${ownerId}`);
  }

  // Link 5 Rte des Thermes (property 535) to this owner
  await p.query(`UPDATE properties SET owner_id = $1 WHERE id = 535`, [ownerId]);
  console.log(`Property 535 (5 Rte des Thermes) linked to owner #${ownerId}`);

  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
