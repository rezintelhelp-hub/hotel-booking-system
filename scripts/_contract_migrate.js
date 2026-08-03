const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await p.query(`
    CREATE TABLE IF NOT EXISTS contract_templates (
      id SERIAL PRIMARY KEY,
      account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      language VARCHAR(10) DEFAULT 'en',
      html_body TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);
  await p.query(`CREATE INDEX IF NOT EXISTS idx_ct_account ON contract_templates(account_id) WHERE is_active = true`);
  await p.query(`
    CREATE TABLE IF NOT EXISTS contract_instances (
      id SERIAL PRIMARY KEY,
      template_id INTEGER REFERENCES contract_templates(id) ON DELETE SET NULL,
      booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
      account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
      sign_token VARCHAR(64) UNIQUE NOT NULL,
      filled_html TEXT NOT NULL,
      status VARCHAR(30) DEFAULT 'sent',
      guest_email VARCHAR(255),
      signature_data_url TEXT,
      signature_typed_name VARCHAR(255),
      signature_ip VARCHAR(50),
      signature_ua TEXT,
      sent_at TIMESTAMP DEFAULT NOW(),
      opened_at TIMESTAMP,
      signed_at TIMESTAMP,
      deposit_payment_intent_id VARCHAR(255),
      deposit_paid_at TIMESTAMP,
      pdf_r2_key TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);
  await p.query(`CREATE INDEX IF NOT EXISTS idx_ci_booking ON contract_instances(booking_id)`);
  await p.query(`CREATE INDEX IF NOT EXISTS idx_ci_account_status ON contract_instances(account_id, status)`);
  await p.query(`CREATE INDEX IF NOT EXISTS idx_ci_token ON contract_instances(sign_token)`);
  await p.query(`
    CREATE TABLE IF NOT EXISTS account_contract_settings (
      account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
      landlord_name TEXT, landlord_company TEXT, landlord_address TEXT,
      landlord_postcode TEXT, landlord_city TEXT, landlord_country TEXT,
      landlord_phone TEXT, landlord_email TEXT,
      landlord_siret TEXT, tourist_let_reg TEXT,
      iban TEXT, bic TEXT, bank_account_name TEXT,
      default_security_deposit NUMERIC(10,2),
      default_cleaning_fee NUMERIC(10,2),
      default_tourist_tax_per_person_per_night NUMERIC(10,2),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);
  console.log('Contract tables created.');
  await p.end();
})().catch(e => { console.error(e.message); process.exit(1); });
