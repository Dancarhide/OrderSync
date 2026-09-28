const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function cleanAllShopifyData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Cleaning all orders, returns, shipments, customers, order_items to start from 0...');

    // 1. Delete returns
    const delReturns = await client.query("DELETE FROM returns WHERE channel = 'Shopify' OR external_order_id LIKE '#%'");
    console.log(`Deleted ${delReturns.rowCount} returns.`);

    // 2. Delete shipments
    const delShipments = await client.query("DELETE FROM shipments WHERE channel = 'Shopify' OR external_order_id LIKE '#%'");
    console.log(`Deleted ${delShipments.rowCount} shipments.`);

    // 3. Delete order items
    const delItems = await client.query(`
      DELETE FROM order_items 
      WHERE order_id IN (SELECT id FROM orders WHERE channel = 'Shopify' OR external_order_id LIKE '#%')
    `);
    console.log(`Deleted ${delItems.rowCount} order items.`);

    // 4. Delete customers
    const delCustomers = await client.query(`
      DELETE FROM customers 
      WHERE order_id IN (SELECT id FROM orders WHERE channel = 'Shopify' OR external_order_id LIKE '#%')
    `);
    console.log(`Deleted ${delCustomers.rowCount} customers.`);

    // 5. Delete orders
    const delOrders = await client.query("DELETE FROM orders WHERE channel = 'Shopify' OR external_order_id LIKE '#%'");
    console.log(`Deleted ${delOrders.rowCount} orders.`);

    // Reset standard inventory stock to baseline (e.g. 50 u.)
    await client.query(`
      UPDATE inventory 
      SET stock_quantity = 50, updated_at = CURRENT_TIMESTAMP
    `);
    console.log('Reset inventory stock levels to baseline (50 u.).');

    await client.query('COMMIT');
    console.log('SUCCESS: All Shopify data cleaned. Ready to start from 0!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cleaning data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanAllShopifyData();
