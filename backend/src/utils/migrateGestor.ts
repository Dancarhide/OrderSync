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
    console.log('Connected to Neon PostgreSQL for Gestor Omnicanal migration...');

    // 1. Suppliers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        contact_name VARCHAR(150),
        email VARCHAR(150),
        phone VARCHAR(50),
        country VARCHAR(50) DEFAULT 'USA',
        category VARCHAR(100) DEFAULT 'Electronics',
        lead_time_days INT DEFAULT 3,
        rating NUMERIC(3, 1) DEFAULT 4.8,
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add columns to inventory table if needed
    await client.query(`
      ALTER TABLE inventory 
      ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(150) DEFAULT 'Apex Logistics & Tech Parts',
      ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10, 2) DEFAULT 45.00,
      ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10, 2) DEFAULT 89.99,
      ADD COLUMN IF NOT EXISTS min_threshold INT DEFAULT 15;
    `);

    // 3. Seed suppliers if empty
    const supplierCount = await client.query(`SELECT COUNT(*) FROM suppliers;`);
    if (parseInt(supplierCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO suppliers (name, contact_name, email, phone, country, category, lead_time_days, rating)
        VALUES 
          ('Apex Global Electronics', 'Marcus Vance', 'orders@apex-global.com', '+1 (800) 555-0192', 'USA', 'Computing & Laptops', 2, 4.9),
          ('Shenzhen Acoustic Labs', 'Lin Wei', 'b2b@shenzhen-audio.cn', '+86 755 8320 9911', 'Hong Kong / USA Hub', 'Audio & Wearables', 4, 4.7),
          ('Nordic Ergonomic Gear', 'Astrid Lind', 'supply@nordicgear.se', '+46 8 123 4567', 'Germany / USA Hub', 'Accessories & Peripherals', 3, 4.8);
      `);
      console.log('Seeded 3 primary suppliers.');
    }

    // 4. Shipments / Route tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shipments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID,
        external_order_id VARCHAR(100),
        channel VARCHAR(50) DEFAULT 'Shopify',
        carrier VARCHAR(50) DEFAULT 'DHL Express',
        tracking_number VARCHAR(100) UNIQUE NOT NULL,
        origin VARCHAR(100) DEFAULT 'Houston Fulfillment Hub (TX)',
        destination VARCHAR(150) NOT NULL,
        current_step VARCHAR(50) DEFAULT 'in_transit',
        is_delivered BOOLEAN DEFAULT false,
        delivered_at TIMESTAMP,
        estimated_delivery VARCHAR(100) DEFAULT 'Hoy antes de las 18:00',
        checkpoints JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Seed initial shipment routes if empty
    const shipmentCount = await client.query(`SELECT COUNT(*) FROM shipments;`);
    if (parseInt(shipmentCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO shipments (external_order_id, channel, carrier, tracking_number, destination, current_step, is_delivered, estimated_delivery, checkpoints)
        VALUES 
          ('SHPF-98421', 'Shopify', 'DHL Express', 'DHL-8472-1092-EXP', 'Dallas, TX (75201)', 'in_transit', false, 'Hoy antes de las 18:00', '[
            {"step": "processing", "title": "Orden Procesada y Empacada", "timestamp": "Hace 4 horas", "done": true},
            {"step": "in_transit", "title": "En Ruta hacia Centro Dallas", "timestamp": "Hace 1 hora", "done": true},
            {"step": "out_for_delivery", "title": "En Unidad de Reparto Local", "timestamp": "Pendiente", "done": false},
            {"step": "delivered", "title": "Entregado a Destinatario", "timestamp": "Pendiente", "done": false}
          ]'::jsonb),
          ('AMZ-55019', 'Amazon', 'Amazon Logistics', 'TBA-4920-8812-AMZ', 'Austin, TX (78701)', 'out_for_delivery', false, 'En reparto ahora mismo', '[
            {"step": "processing", "title": "FBA Picking & Empaque", "timestamp": "Hace 5 horas", "done": true},
            {"step": "in_transit", "title": "Despachado de Hub Austin", "timestamp": "Hace 2 horas", "done": true},
            {"step": "out_for_delivery", "title": "En Unidad de Reparto Local", "timestamp": "En camino", "done": true},
            {"step": "delivered", "title": "Entregado a Destinatario", "timestamp": "Pendiente", "done": false}
          ]'::jsonb),
          ('SHPF-98418', 'Shopify', 'FedEx Priority', 'FDX-7741-2099-USA', 'Houston, TX (77002)', 'delivered', true, 'Entregado con éxito', '[
            {"step": "processing", "title": "Orden Procesada", "timestamp": "Ayer 10:00 AM", "done": true},
            {"step": "in_transit", "title": "Despachado de Bodega", "timestamp": "Ayer 02:00 PM", "done": true},
            {"step": "out_for_delivery", "title": "En Unidad de Reparto", "timestamp": "Hoy 09:15 AM", "done": true},
            {"step": "delivered", "title": "Entregado y Firmado", "timestamp": "Hoy 11:42 AM", "done": true}
          ]'::jsonb);
      `);
      console.log('Seeded 3 initial shipment routes.');
    }

    console.log('Gestor migration completed successfully.');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await client.end();
  }
};

run();
