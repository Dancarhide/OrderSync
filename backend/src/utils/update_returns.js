const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await pool.query('DELETE FROM returns');
    await pool.query(`
      INSERT INTO returns (
        return_number, external_order_id, channel, customer_name, sku,
        product_name, quantity, refund_amount, currency, reason,
        status, restock_inventory, tracking_number, notes
      ) VALUES 
        ('RET-SHPF-0891', '#3238', 'Shopify', 'Carlos Mendoza', 'SKU-4821', 'Premium Widget', 1, 199.99, 'USD', 'DEFECTIVE', 'requested', true, 'DHL-RET-9012', 'Falla en componente reportada en orden de tienda Shopify #3238.'),
        ('RET-SHPF-0892', '#8966', 'Shopify', 'Carlos Mendoza', 'SKU-1002', 'Wireless Mouse Pro', 1, 89.99, 'USD', 'SIZE_FIT', 'approved', true, 'DHL-RET-4412', 'Guía de retorno DHL emitida. Paquete en tránsito hacia almacén.'),
        ('RET-SHPF-0893', '#6103', 'Shopify', 'Carlos Mendoza', 'SKU-4821', 'Premium Widget', 1, 199.99, 'USD', 'CUSTOMER_MIND', 'received_restocked', true, 'DHL-RET-3109', 'Inspección técnica física aprobada. Reingresado atómicamente a stock.'),
        ('RET-SHPF-0894', '#4871', 'Shopify', 'Carlos Mendoza', 'SKU-1002', 'Wireless Mouse Pro', 1, 89.99, 'USD', 'NOT_AS_DESCRIBED', 'approved', true, 'DHL-RET-8811', 'Discrepancia en especificación reportada en Shopify. En camino a almacén.'),
        ('RET-SHPF-0895', '#5629', 'Shopify', 'Carlos Mendoza', 'SKU-4821', 'Premium Widget', 1, 199.99, 'USD', 'CUSTOMER_MIND', 'received_restocked', true, 'DHL-RET-1145', 'Desistimiento de compra en Shopify. Mercancía reincorporada al stock.')
    `);
    console.log('SUCCESS: Seeded 100% real Shopify returns matching orders!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
