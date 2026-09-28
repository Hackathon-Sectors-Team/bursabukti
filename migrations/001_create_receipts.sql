-- Migration 001: Create Receipts Table for Permanent Shareable Receipts
-- BursaBukti - Track 01 Sectors Hackathon 2026

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY,
    claim TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    interpreted JSONB NOT NULL,
    calculation JSONB NULL,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
    rules_version VARCHAR(50) NOT NULL,
    disclaimer TEXT NOT NULL,
    extractor_source VARCHAR(50) NULL,
    model_used VARCHAR(100) NULL,
    model_requested VARCHAR(100) NULL,
    fallback_reason TEXT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeks untuk pencarian cepat dan pengurutan
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts (status);
