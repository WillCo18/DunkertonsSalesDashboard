-- Migration: Add Geo Columns
-- Description: Adds latitude, longitude, and geo_accuracy to dim_customer for map support.
-- Version: 1.0

ALTER TABLE dim_customer ADD COLUMN IF NOT EXISTS latitude DECIMAL(9, 6);
ALTER TABLE dim_customer ADD COLUMN IF NOT EXISTS longitude DECIMAL(9, 6);
ALTER TABLE dim_customer ADD COLUMN IF NOT EXISTS geo_accuracy TEXT; -- 'postcode_centroid', etc.
