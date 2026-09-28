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
    console.log('Connected to Neon PostgreSQL for Users Migration...');

    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Operator';
    `);

    await client.query(`
      UPDATE users 
      SET role = 'Admin' 
      WHERE email = 'admin@ordersync.app';
    `);

    const res = await client.query(`SELECT id, email, role, created_at FROM users;`);
    console.log('Current users in system:', res.rows);
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await client.end();
  }
};

run();
