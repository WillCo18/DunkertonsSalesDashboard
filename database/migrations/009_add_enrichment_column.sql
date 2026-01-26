-- Migration: Add Soft CRM Columns
-- Description: Adds enrichment (JSONB) for flexible fields and parent_account_id for hierarchy.
-- Version: 1.0

-- 1. Enrichment Column (JSONB)
-- Stores contacts, social handles, tags, and notes.
ALTER TABLE dim_customer 
ADD COLUMN IF NOT EXISTS enrichment JSONB DEFAULT '{}'::jsonb;

-- 2. Hierarchy Column (Self-Referential FK)
-- Links a child account to a parent account.
ALTER TABLE dim_customer
ADD COLUMN IF NOT EXISTS parent_account_id TEXT REFERENCES dim_customer(del_account);

-- Index for faster hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_dim_customer_parent ON dim_customer(parent_account_id);
