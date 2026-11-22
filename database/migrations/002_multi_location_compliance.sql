-- Migration: 002_multi_location_compliance.sql
-- Description: Multi-location topology, regional compliance rules, order compliance tracking, and non-compliance alerts.
-- Target: PostgreSQL (Neon Serverless) with pgcrypto and native UUID support.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Locations Table
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(2) NOT NULL CHECK (country IN ('US', 'CA', 'MX')),
    state VARCHAR(50),
    city VARCHAR(50),
    timezone VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seed 10 Initial Locations (CA, US, MX)
INSERT INTO locations (code, name, country, state, city, timezone, is_active)
VALUES
    ('CA-TOR',   'Toronto Fulfillment Hub',     'CA', 'Ontario',     'Toronto',     'America/Toronto',     TRUE),
    ('CA-MTL',   'Montreal Logistics Center',   'CA', 'Quebec',      'Montreal',    'America/Toronto',     TRUE),
    ('US-NYC',   'New York Distribution Hub',   'US', 'New York',    'New York',    'America/New_York',    TRUE),
    ('US-MI',    'Michigan State Hub',          'US', 'Michigan',    'Detroit',     'America/Detroit',     TRUE),
    ('US-TX-HQ', 'Texas - Houston HQ',          'US', 'Texas',       'Houston',     'America/Chicago',     TRUE),
    ('US-CA',    'California West Hub',         'US', 'California',  'Los Angeles', 'America/Los_Angeles', TRUE),
    ('MX-FED',   'México Federal Hub',          'MX', 'Federal',     'Mexico City', 'America/Mexico_City', TRUE),
    ('MX-CHH',   'Chihuahua Border Hub',        'MX', 'Chihuahua',   'Chihuahua',   'America/Chihuahua',   TRUE),
    ('MX-MTY',   'Monterrey Industrial Hub',    'MX', 'Nuevo León',  'Monterrey',   'America/Monterrey',   TRUE),
    ('MX-CDMX',  'Mexico City Metro Hub',       'MX', 'CDMX',        'Mexico City', 'America/Mexico_City', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 3. Compliance Rules Table
CREATE TABLE IF NOT EXISTS compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    standard_name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    requires_encryption BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Location-to-Compliance Rules Mapping (Many-to-Many)
CREATE TABLE IF NOT EXISTS location_compliance_rules (
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES compliance_rules(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (location_id, rule_id)
);

-- 5. Alter Orders Table for Origin Location & Compliance Status
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS origin_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(20) NOT NULL DEFAULT 'COMPLIANT'
        CHECK (compliance_status IN ('COMPLIANT', 'WARNING', 'BREACHED')),
    ADD COLUMN IF NOT EXISTS compliance_checked_at TIMESTAMP WITH TIME ZONE;

-- 6. Compliance Alerts Table
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NULL REFERENCES orders(id) ON DELETE SET NULL,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    rule_code VARCHAR(30) NOT NULL,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM')),
    message TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_locations_country_active ON locations (country, is_active);
CREATE INDEX IF NOT EXISTS idx_location_compliance_rules_rule_id ON location_compliance_rules (rule_id);
CREATE INDEX IF NOT EXISTS idx_orders_origin_location_id ON orders (origin_location_id);
CREATE INDEX IF NOT EXISTS idx_orders_compliance_status ON orders (compliance_status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_location_unresolved ON compliance_alerts (location_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_order_id ON compliance_alerts (order_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_created_at ON compliance_alerts (created_at DESC);
