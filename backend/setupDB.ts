import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Neon!');

    // 1. Extensions
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // 2. Orders Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        external_order_id VARCHAR(255) UNIQUE NOT NULL,
        channel VARCHAR(50) CHECK (channel IN ('Shopify', 'Amazon')) NOT NULL,
        status VARCHAR(50) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        sync_latency_ms INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Orders table ready.');

    // 3. Customers Table (PII encrypted BYTEA)
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        encrypted_full_name BYTEA NOT NULL,
        encrypted_shipping_address BYTEA NOT NULL,
        encrypted_phone BYTEA
      );
    `);
    console.log('Customers table ready.');

    // 4. Order Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        sku VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL
      );
    `);
    console.log('Order items table ready.');

    // 5. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Users table ready.');

    // 6. Admin user
    await client.query(`
      INSERT INTO users (email, password)
      VALUES ('admin@ordersync.app', crypt('password123', gen_salt('bf')))
      ON CONFLICT (email) DO NOTHING;
    `);
    console.log('Admin user verified: admin@ordersync.app / password123');

    // 7. Inventory Table (RFS-03: Unified Inventory Management)
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sku VARCHAR(100) UNIQUE NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Inventory table ready.');

    // Seed initial inventory items
    await client.query(`
      INSERT INTO inventory (sku, product_name, stock_quantity)
      VALUES 
        ('SKU-4821', 'Premium Widget', 100),
        ('SKU-1001', 'Ergonomic Keyboard', 50),
        ('SKU-1002', 'Wireless Mouse Pro', 75)
      ON CONFLICT (sku) DO NOTHING;
    `);
    console.log('Seeded initial inventory stock.');

  } catch (err) {
    console.error('Error setting up DB:', err);
  } finally {
    await client.end();
  }
};

run();
