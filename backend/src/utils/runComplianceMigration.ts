import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

async function run() {
  const sqlPath = path.resolve(__dirname, '../../../database/migrations/002_multi_location_compliance.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);

  await pool.query(`
    ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS current_lat DECIMAL(9,6),
      ADD COLUMN IF NOT EXISTS current_lng DECIMAL(9,6),
      ADD COLUMN IF NOT EXISTS speed_kmh INTEGER DEFAULT 0;
  `);

  await pool.query(`
    INSERT INTO compliance_rules (code, standard_name, description, severity, requires_encryption)
    VALUES
      ('ISO-27001', 'ISO/IEC 27001', 'AES-256-GCM encryption for all customer PII in transit and at rest', 'CRITICAL', TRUE),
      ('SLA-LATENCY-5S', 'OrderSync SLA < 5s', 'Real-time order synchronization latency must remain under 5000ms', 'CRITICAL', FALSE),
      ('TDPSA', 'Texas TDPSA', 'Texas Data Privacy and Security Act consumer portability & encryption', 'HIGH', TRUE),
      ('CCPA', 'California CCPA / CPRA', 'California Consumer Privacy Act disclosure & deletion rights', 'HIGH', TRUE),
      ('NY-SHIELD', 'NY SHIELD Act', 'New York Stop Hacks and Improve Electronic Data Security Act', 'HIGH', TRUE),
      ('PIPEDA', 'Canada PIPEDA', 'Personal Information Protection and Electronic Documents Act', 'HIGH', TRUE),
      ('LOI-25', 'Quebec Loi 25 / Bill 96', 'French-first customer notifications and strict consent governance', 'HIGH', TRUE),
      ('SAT-CARTA-PORTE', 'SAT Complemento Carta Porte', 'Mandatory Mexican federal fiscal folio for logistics transit', 'HIGH', FALSE),
      ('LFPDPPP', 'México LFPDPPP', 'Ley Federal de Protección de Datos Personales en Posesión de Particulares', 'MEDIUM', TRUE)
    ON CONFLICT (code) DO NOTHING;
  `);

  const mapPairs: Array<[string, string[]]> = [
    ['US-TX-HQ', ['ISO-27001', 'SLA-LATENCY-5S', 'TDPSA']],
    ['US-CA',    ['ISO-27001', 'SLA-LATENCY-5S', 'CCPA']],
    ['US-NYC',   ['ISO-27001', 'SLA-LATENCY-5S', 'NY-SHIELD']],
    ['US-MI',    ['ISO-27001', 'SLA-LATENCY-5S']],
    ['CA-TOR',   ['ISO-27001', 'SLA-LATENCY-5S', 'PIPEDA']],
    ['CA-MTL',   ['ISO-27001', 'SLA-LATENCY-5S', 'PIPEDA', 'LOI-25']],
    ['MX-FED',   ['ISO-27001', 'SLA-LATENCY-5S', 'SAT-CARTA-PORTE', 'LFPDPPP']],
    ['MX-CHH',   ['ISO-27001', 'SLA-LATENCY-5S', 'SAT-CARTA-PORTE', 'LFPDPPP']],
    ['MX-MTY',   ['ISO-27001', 'SLA-LATENCY-5S', 'SAT-CARTA-PORTE', 'LFPDPPP']],
    ['MX-CDMX',  ['ISO-27001', 'SLA-LATENCY-5S', 'SAT-CARTA-PORTE', 'LFPDPPP']],
  ];

  for (const [locCode, ruleCodes] of mapPairs) {
    for (const ruleCode of ruleCodes) {
      await pool.query(
        `INSERT INTO location_compliance_rules (location_id, rule_id, is_mandatory)
         SELECT l.id, r.id, TRUE
         FROM locations l, compliance_rules r
         WHERE l.code = $1 AND r.code = $2
         ON CONFLICT (location_id, rule_id) DO NOTHING`,
        [locCode, ruleCode]
      );
    }
  }

  const counts = await pool.query(
    `SELECT
      (SELECT COUNT(*)::int FROM locations) AS locations,
      (SELECT COUNT(*)::int FROM compliance_rules) AS rules,
      (SELECT COUNT(*)::int FROM location_compliance_rules) AS mappings,
      (SELECT COUNT(*)::int FROM shipments) AS shipments`
  );
  console.log('MIGRATION_OK:', JSON.stringify(counts.rows[0]));
  await pool.end();
}

run().catch((err) => {
  console.error('MIGRATION_ERROR:', err);
  process.exit(1);
});
