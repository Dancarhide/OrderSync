import { Pool } from 'pg';
import dotenv from 'dotenv';
import { EncryptionService } from '../services/encryption.service';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('[Encryption Migration] Starting full database encryption check...');

  // 1. Suppliers
  const supRes = await pool.query('SELECT id, contact_name, email, phone FROM suppliers');
  for (const row of supRes.rows) {
    const encContact = EncryptionService.encryptString(row.contact_name);
    const encEmail = EncryptionService.encryptString(row.email);
    const encPhone = EncryptionService.encryptString(row.phone);

    await pool.query(
      `UPDATE suppliers 
       SET contact_name = $1, email = $2, phone = $3 
       WHERE id = $4`,
      [encContact, encEmail, encPhone, row.id]
    );
  }
  console.log(`[Encryption Migration] Updated ${supRes.rows.length} suppliers to encrypted format.`);

  // 2. Shipments
  const shipRes = await pool.query('SELECT id, destination, tracking_number FROM shipments');
  for (const row of shipRes.rows) {
    const encDest = EncryptionService.encryptString(row.destination);
    const encTrack = EncryptionService.encryptString(row.tracking_number);

    await pool.query(
      `UPDATE shipments 
       SET destination = $1, tracking_number = $2 
       WHERE id = $3`,
      [encDest, encTrack, row.id]
    );
  }
  console.log(`[Encryption Migration] Updated ${shipRes.rows.length} shipments to encrypted format.`);

  // 3. Returns (if any)
  const retRes = await pool.query('SELECT id, customer_name, product_name, notes, tracking_number FROM returns');
  for (const row of retRes.rows) {
    const encCust = EncryptionService.encryptString(row.customer_name);
    const encProd = EncryptionService.encryptString(row.product_name);
    const encNotes = EncryptionService.encryptString(row.notes);
    const encTrack = EncryptionService.encryptString(row.tracking_number);

    await pool.query(
      `UPDATE returns 
       SET customer_name = $1, product_name = $2, notes = $3, tracking_number = $4 
       WHERE id = $5`,
      [encCust, encProd, encNotes, encTrack, row.id]
    );
  }
  console.log(`[Encryption Migration] Checked and updated ${retRes.rows.length} returns to encrypted format.`);

  // 4. Order items (if any)
  const oiRes = await pool.query('SELECT id, product_name FROM order_items');
  for (const row of oiRes.rows) {
    const encProd = EncryptionService.encryptString(row.product_name);
    await pool.query('UPDATE order_items SET product_name = $1 WHERE id = $2', [encProd, row.id]);
  }
  console.log(`[Encryption Migration] Checked and updated ${oiRes.rows.length} order items to encrypted format.`);

  console.log('[Encryption Migration] Complete! All tables and records in the database are encrypted.');
  await pool.end();
}

main().catch(err => {
  console.error('[Encryption Migration Error]:', err);
  process.exit(1);
});
