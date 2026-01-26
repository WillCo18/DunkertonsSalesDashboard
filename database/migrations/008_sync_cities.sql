-- Migration: Sync Cities and Create Helper RPC
-- Description: Backfills fact_shipments cities from dim_customer and adds an RPC for the tool to call.
-- Version: 1.0

-- 1. Sync existing data
UPDATE fact_shipments fs
SET delivery_city = dc.delivery_city
FROM dim_customer dc
WHERE fs.del_account = dc.del_account
AND dc.delivery_city IS NOT NULL
AND (fs.delivery_city IS NULL OR fs.delivery_city <> dc.delivery_city);

-- 2. Create RPC for repetitive use by enrich_geo.py
CREATE OR REPLACE FUNCTION sync_customer_cities()
RETURNS void AS $$
BEGIN
    UPDATE fact_shipments fs
    SET delivery_city = dc.delivery_city
    FROM dim_customer dc
    WHERE fs.del_account = dc.del_account
    AND dc.delivery_city IS NOT NULL
    AND (fs.delivery_city IS NULL OR fs.delivery_city <> dc.delivery_city);
END;
$$ LANGUAGE plpgsql;
