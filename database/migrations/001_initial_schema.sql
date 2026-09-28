-- Enable pgcrypto extension for AES-256 column-level encryption and UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_order_id VARCHAR(255) UNIQUE NOT NULL,
    channel VARCHAR(50) CHECK (channel IN ('Shopify', 'Amazon')) NOT NULL,
    status VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    sync_latency_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
-- PII fields are stored as BYTEA for application-level encryption compatibility
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    encrypted_full_name BYTEA NOT NULL,
    encrypted_shipping_address BYTEA NOT NULL,
    encrypted_phone BYTEA
);

-- Order Items Table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL
);
