-- Migration: 003_security_audits.sql
-- Description: Scalable ISO/IEC 27001 & Multi-Location Cybersecurity Audit History Table.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS security_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_code VARCHAR(30) UNIQUE NOT NULL,
    audit_type VARCHAR(50) NOT NULL DEFAULT 'FULL_ISO_27001',
    executed_by VARCHAR(255) NOT NULL,
    overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('COMPLIANT', 'OBSERVATIONS', 'NON_COMPLIANT')),
    score_percent DECIMAL(5,2) NOT NULL,
    summary JSONB NOT NULL,
    findings JSONB NOT NULL,
    location_matrix JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audits_created_at ON security_audits (created_at DESC);
