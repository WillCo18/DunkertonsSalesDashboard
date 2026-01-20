-- ============================================================================
-- DUNKERTON SALES DASHBOARD - COMPLETE DATABASE SETUP
-- ============================================================================
-- Run this entire file in the Supabase SQL Editor to set up the database.
-- It combines all three migration files: tables, views, and seed data.
-- ============================================================================

-- ############################################################################
-- PART 1: CORE TABLES
-- ############################################################################

-- Table: import_runs
CREATE TABLE IF NOT EXISTS import_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_month DATE NOT NULL,
  source_filename TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  total_lines_read INTEGER,
  lines_imported INTEGER,
  lines_skipped INTEGER,
  lines_mapped INTEGER,
  lines_unmapped INTEGER,
  volume_mapped DECIMAL(10, 2),
  volume_unmapped DECIMAL(10, 2),
  mapping_coverage_pct DECIMAL(5, 2),
  new_customers INTEGER,
  existing_customers INTEGER,
  new_source_skus INTEGER,
  existing_source_skus INTEGER,
  error_message TEXT,
  error_details JSONB,
  imported_by TEXT DEFAULT 'system',
  CONSTRAINT chk_import_status CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_import_runs_month ON import_runs(report_month);
CREATE INDEX IF NOT EXISTS idx_import_runs_status ON import_runs(status);

-- Table: dim_product_internal
CREATE TABLE IF NOT EXISTS dim_product_internal (
  product_code TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  brand_family TEXT NOT NULL,
  pack_format TEXT NOT NULL,
  duoi TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  launched_date DATE,
  discontinued_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dim_product_brand_family ON dim_product_internal(brand_family);
CREATE INDEX IF NOT EXISTS idx_dim_product_format ON dim_product_internal(pack_format);
CREATE INDEX IF NOT EXISTS idx_dim_product_category ON dim_product_internal(category);

-- Table: dim_product_source
CREATE TABLE IF NOT EXISTS dim_product_source (
  source_sku TEXT PRIMARY KEY,
  distributor TEXT NOT NULL DEFAULT 'Inn Express',
  source_description TEXT NOT NULL,
  sample_duoi TEXT,
  detected_family TEXT,
  detected_format TEXT,
  first_seen DATE NOT NULL,
  last_seen DATE NOT NULL,
  times_seen INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dim_product_source_family ON dim_product_source(detected_family);
CREATE INDEX IF NOT EXISTS idx_dim_product_source_format ON dim_product_source(detected_format);

-- Table: map_product_source_to_internal
CREATE TABLE IF NOT EXISTS map_product_source_to_internal (
  distributor TEXT NOT NULL DEFAULT 'Inn Express',
  source_sku TEXT NOT NULL,
  internal_product_code TEXT REFERENCES dim_product_internal(product_code),
  mapping_method TEXT NOT NULL,
  mapping_confidence DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
  mapping_note TEXT,
  mapped_at TIMESTAMPTZ DEFAULT NOW(),
  mapped_by TEXT DEFAULT 'system',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (distributor, source_sku),
  CONSTRAINT chk_mapping_method CHECK (mapping_method IN ('sku_code_match', 'family_pack_fallback', 'manual_override', 'unmapped')),
  CONSTRAINT chk_mapping_confidence CHECK (mapping_confidence >= 0.00 AND mapping_confidence <= 1.00)
);

CREATE INDEX IF NOT EXISTS idx_map_unmapped ON map_product_source_to_internal(source_sku) WHERE internal_product_code IS NULL;
CREATE INDEX IF NOT EXISTS idx_map_method ON map_product_source_to_internal(mapping_method);

-- Table: dim_customer
CREATE TABLE IF NOT EXISTS dim_customer (
  del_account TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_postcode TEXT,
  region TEXT,
  customer_type TEXT,
  first_seen DATE NOT NULL,
  last_seen DATE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dim_customer_postcode ON dim_customer(delivery_postcode);
CREATE INDEX IF NOT EXISTS idx_dim_customer_name ON dim_customer(customer_name);
CREATE INDEX IF NOT EXISTS idx_dim_customer_first_seen ON dim_customer(first_seen);

-- Table: fact_shipments
CREATE TABLE IF NOT EXISTS fact_shipments (
  line_key TEXT PRIMARY KEY,
  report_month DATE NOT NULL,
  del_account TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_postcode TEXT,
  source_sku TEXT NOT NULL,
  source_description TEXT NOT NULL,
  duoi TEXT,
  internal_product_code TEXT,
  quantity DECIMAL(10, 2) NOT NULL,
  salesperson TEXT,
  distributor TEXT DEFAULT 'Inn Express',
  detected_family TEXT,
  detected_format TEXT,
  detected_category TEXT,
  mapping_method TEXT,
  mapping_confidence DECIMAL(3, 2),
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  import_run_id UUID REFERENCES import_runs(id),
  CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_report_month_first_of_month CHECK (EXTRACT(DAY FROM report_month) = 1)
);

CREATE INDEX IF NOT EXISTS idx_fact_shipments_month ON fact_shipments(report_month);
CREATE INDEX IF NOT EXISTS idx_fact_shipments_customer ON fact_shipments(del_account);
CREATE INDEX IF NOT EXISTS idx_fact_shipments_source_sku ON fact_shipments(source_sku);
CREATE INDEX IF NOT EXISTS idx_fact_shipments_internal_product ON fact_shipments(internal_product_code);
CREATE INDEX IF NOT EXISTS idx_fact_shipments_salesperson ON fact_shipments(salesperson);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_dim_product_internal_updated_at ON dim_product_internal;
CREATE TRIGGER update_dim_product_internal_updated_at
    BEFORE UPDATE ON dim_product_internal
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dim_customer_updated_at ON dim_customer;
CREATE TRIGGER update_dim_customer_updated_at
    BEFORE UPDATE ON dim_customer
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ############################################################################
-- PART 2: VIEWS
-- ############################################################################

CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
  report_month,
  COUNT(DISTINCT del_account) AS active_customers,
  COUNT(DISTINCT source_sku) AS unique_skus,
  COUNT(DISTINCT internal_product_code) AS unique_internal_products,
  SUM(quantity) AS total_units,
  SUM(CASE WHEN internal_product_code IS NOT NULL THEN quantity ELSE 0 END) AS mapped_units,
  ROUND(100.0 * SUM(CASE WHEN internal_product_code IS NOT NULL THEN quantity ELSE 0 END) / NULLIF(SUM(quantity), 0), 2) AS mapping_coverage_pct
FROM fact_shipments
GROUP BY report_month
ORDER BY report_month DESC;

CREATE OR REPLACE VIEW v_new_customers AS
SELECT
  c.del_account,
  c.customer_name,
  c.delivery_city,
  c.delivery_postcode,
  c.first_seen AS first_order_month,
  COALESCE(SUM(f.quantity), 0) AS first_month_units
FROM dim_customer c
LEFT JOIN fact_shipments f ON c.del_account = f.del_account AND c.first_seen = f.report_month
GROUP BY c.del_account, c.customer_name, c.delivery_city, c.delivery_postcode, c.first_seen
ORDER BY c.first_seen DESC;

CREATE OR REPLACE VIEW v_at_risk_customers AS
WITH recent_month AS (SELECT MAX(report_month) AS max_month FROM fact_shipments),
customer_last_order AS (
  SELECT del_account, MAX(report_month) AS last_order_month, SUM(quantity) AS total_units_all_time
  FROM fact_shipments GROUP BY del_account
)
SELECT
  c.del_account, c.customer_name, c.delivery_city, c.delivery_postcode,
  clo.last_order_month, rm.max_month AS current_month,
  EXTRACT(MONTH FROM AGE(rm.max_month, clo.last_order_month))::INTEGER AS months_since_last_order,
  clo.total_units_all_time
FROM dim_customer c
JOIN customer_last_order clo ON c.del_account = clo.del_account
CROSS JOIN recent_month rm
WHERE clo.last_order_month < rm.max_month AND clo.last_order_month >= rm.max_month - INTERVAL '3 months'
ORDER BY months_since_last_order DESC, clo.total_units_all_time DESC;

CREATE OR REPLACE VIEW v_top_customers AS
SELECT
  c.del_account, c.customer_name, c.delivery_city, c.delivery_postcode,
  COUNT(DISTINCT f.report_month) AS months_active,
  SUM(f.quantity) AS total_units,
  ROUND(AVG(f.quantity), 2) AS avg_units_per_order,
  MAX(f.report_month) AS last_order_month,
  MIN(f.report_month) AS first_order_month
FROM dim_customer c
JOIN fact_shipments f ON c.del_account = f.del_account
GROUP BY c.del_account, c.customer_name, c.delivery_city, c.delivery_postcode
ORDER BY total_units DESC;

CREATE OR REPLACE VIEW v_top_products AS
SELECT
  p.product_code, p.product_name, p.brand_family, p.pack_format, p.category,
  COUNT(DISTINCT f.del_account) AS customer_count,
  COUNT(DISTINCT f.report_month) AS months_with_sales,
  SUM(f.quantity) AS total_units
FROM dim_product_internal p
JOIN fact_shipments f ON p.product_code = f.internal_product_code
GROUP BY p.product_code, p.product_name, p.brand_family, p.pack_format, p.category
ORDER BY total_units DESC;

CREATE OR REPLACE VIEW v_unmapped_skus AS
SELECT
  s.source_sku, s.source_description, s.detected_family, s.detected_format,
  s.times_seen, s.first_seen, s.last_seen,
  COALESCE(SUM(f.quantity), 0) AS total_volume_unmapped
FROM dim_product_source s
LEFT JOIN map_product_source_to_internal m ON s.source_sku = m.source_sku AND m.distributor = s.distributor
LEFT JOIN fact_shipments f ON s.source_sku = f.source_sku AND f.internal_product_code IS NULL
WHERE m.internal_product_code IS NULL OR m.source_sku IS NULL
GROUP BY s.source_sku, s.source_description, s.detected_family, s.detected_format, s.times_seen, s.first_seen, s.last_seen
ORDER BY total_volume_unmapped DESC NULLS LAST;

CREATE OR REPLACE VIEW v_brand_family_trend AS
SELECT
  f.report_month,
  COALESCE(p.brand_family, f.detected_family, 'Unknown') AS brand_family,
  SUM(f.quantity) AS total_units,
  COUNT(DISTINCT f.del_account) AS customer_count
FROM fact_shipments f
LEFT JOIN dim_product_internal p ON f.internal_product_code = p.product_code
GROUP BY f.report_month, COALESCE(p.brand_family, f.detected_family, 'Unknown')
ORDER BY f.report_month, total_units DESC;

CREATE OR REPLACE VIEW v_gap_analysis_format AS
WITH customer_formats AS (
  SELECT f.del_account, c.customer_name, c.delivery_city, p.pack_format, SUM(f.quantity) AS units
  FROM fact_shipments f
  JOIN dim_customer c ON f.del_account = c.del_account
  JOIN dim_product_internal p ON f.internal_product_code = p.product_code
  WHERE f.internal_product_code IS NOT NULL
  GROUP BY f.del_account, c.customer_name, c.delivery_city, p.pack_format
),
format_counts AS (
  SELECT del_account, customer_name, delivery_city, COUNT(DISTINCT pack_format) AS formats_purchased, SUM(units) AS total_units
  FROM customer_formats GROUP BY del_account, customer_name, delivery_city
)
SELECT fc.del_account, fc.customer_name, fc.delivery_city, fc.formats_purchased, fc.total_units,
  STRING_AGG(DISTINCT cf.pack_format, ', ' ORDER BY cf.pack_format) AS formats_bought,
  NULL::TEXT AS formats_missing
FROM format_counts fc
JOIN customer_formats cf ON fc.del_account = cf.del_account
WHERE fc.formats_purchased < 3
GROUP BY fc.del_account, fc.customer_name, fc.delivery_city, fc.formats_purchased, fc.total_units
ORDER BY fc.total_units DESC;

CREATE OR REPLACE VIEW v_gap_analysis_brand AS
WITH customer_brands AS (
  SELECT f.del_account, c.customer_name, c.delivery_city, p.brand_family, SUM(f.quantity) AS units
  FROM fact_shipments f
  JOIN dim_customer c ON f.del_account = c.del_account
  JOIN dim_product_internal p ON f.internal_product_code = p.product_code
  WHERE f.internal_product_code IS NOT NULL
  GROUP BY f.del_account, c.customer_name, c.delivery_city, p.brand_family
),
brand_counts AS (
  SELECT del_account, customer_name, delivery_city, COUNT(DISTINCT brand_family) AS brands_purchased, SUM(units) AS total_units
  FROM customer_brands GROUP BY del_account, customer_name, delivery_city
)
SELECT bc.del_account, bc.customer_name, bc.delivery_city, bc.brands_purchased, bc.total_units,
  STRING_AGG(DISTINCT cb.brand_family, ', ' ORDER BY cb.brand_family) AS brands_bought,
  NULL::TEXT AS brands_missing
FROM brand_counts bc
JOIN customer_brands cb ON bc.del_account = cb.del_account
WHERE bc.brands_purchased < 2
GROUP BY bc.del_account, bc.customer_name, bc.delivery_city, bc.brands_purchased, bc.total_units
ORDER BY bc.total_units DESC;

-- ############################################################################
-- PART 3: SEED DATA (26 products + 10 mappings)
-- ############################################################################

INSERT INTO dim_product_internal (product_code, product_name, brand_family, pack_format, duoi, category, is_active)
VALUES
  ('FPKINBL050', 'Dunkertons Kingston Black', 'Kingston Black', 'Bottle 500ml', '500ml x 12', 'bottle500', TRUE),
  ('FPDAB50', 'Dunkertons DABINETT CIDER Bottles', 'Dabinett', 'Bottle 500ml', '500ml x 12', 'bottle500', TRUE),
  ('FPPER50', 'Dunkertons PERRY Cider Bottles', 'Perry', 'Bottle 500ml', '500ml x 12', 'bottle500', TRUE),
  ('FPBRO50', 'Dunkertons BROWNS CIDER Bottles', 'Browns', 'Bottle 500ml', '500ml x 12', 'bottle500', TRUE),
  ('FPMULL3L', 'Organic Mulled Cider 3 Litre', 'Mulled', 'BIB 3L', '3 Ltr BIB', 'bib3', TRUE),
  ('FPPREMCAN33', 'Dunkertons PREMIUM Cider Cans', 'Premium', 'Can 330ml', '330ml x 12', 'can330', TRUE),
  ('FPVIN66', 'Dunkertons VINTAGE CIDER Bottles', 'Vintage', 'Bottle 660ml', '660ml x 12', 'bottle660', TRUE),
  ('FPCRAFT50', 'Dunkertons CRAFT Cider 5% Bottles', 'Craft', 'Bottle 500ml', '500ml x 12', 'bottle500', TRUE),
  ('FPDRYBIB', 'Dunkertons DRY ORGANIC Cider BIB', 'Dry', 'BIB 20L', '20 Ltr BIB', 'bib20', TRUE),
  ('FPSES50', 'Organic Session Cider 50cl x 12', 'Session', 'Bottle 500ml', '500ml x 12', 'bottle500', TRUE),
  ('FPGIFT3B', 'Dunkertons 3 Bottle Gift Box', 'Gifting', 'Gift Box', '3 x 500ml Gift box', 'giftbox', TRUE),
  ('FPPREM50', 'Dunkertons PREMIUM Cider Bottles', 'Premium', 'Bottle 500ml', '500ml x 12', 'bottle500', TRUE),
  ('FPCRAFT30', 'Dunkertons CRAFT Cider 5% Cans', 'Craft', 'Can 330ml', '330ml x 12', 'can330', TRUE),
  ('FPBIBBF20L', 'Dunkertons BLACK FOX ORGANIC Cider BIB', 'Black Fox', 'BIB 20L', '20 Ltr BIB', 'bib20', TRUE),
  ('FPBWS50', 'Dunkertons BREAKWELLS Seedling CIDER', 'Breakwell', 'Bottle 500ml', '500ml x 12', 'bottle500', TRUE),
  ('FPBF050', 'Dunkertons BLACK FOX CIDER Bottles 7%', 'Black Fox', 'Bottle 500ml', '500ml x 12', 'bottle500', TRUE),
  ('FPKEG505', 'Dunkertons CRAFT Cider 50L ** Keg ** 5%', 'Craft', 'Keg 50L', '50 Ltr Keg', 'keg50', TRUE),
  ('FPMULLED', 'Organic Mulled Cider BiB 10L', 'Mulled', 'BIB 10L', '10 Ltr BIB', 'bib10', TRUE),
  ('FPMCCOOP', 'Orchard Bliss', 'Orchard Bliss', 'Bottle 500ml', '500ml x 12', 'bottle500', TRUE),
  ('FPMINICRAFT', '5L Black Fox Organic Cider Mini Keg', 'Craft', 'Mini Keg 5L', '5L x 1', 'minikeg5', TRUE),
  ('FPDRY50', 'Dunkertons DRY SPARKLING cider bottles 7%', 'Dry', 'Bottle 500ml', '500ml x 12', 'bottle500', TRUE),
  ('FPKEG50BF', 'Dunkertons BLACK FOX Cider 50L Keg 6%', 'Black Fox', 'Keg 50L', '50 Ltr Keg', 'keg50', TRUE),
  ('FPGIFT4B', 'Dunkertons 4 Bottle Gift Box', 'Gifting', 'Gift Box', '34x 500ml Gift box', 'giftbox', TRUE),
  ('FPBFCAN33', 'Dunkertons BLACK FOX Cider 7% Cans', 'Black Fox', 'Can 330ml', '330ml x 12', 'can330', TRUE),
  ('FPMINIBLACKF', '5L Black Fox Organic Cider Mini Keg', 'Black Fox', 'Mini Keg 5L', '5L x 1', 'minikeg5', TRUE),
  ('FPKEGSESS', 'Organic Session Cider keg 50L', 'Session', 'Keg 50L', '50 Ltr Keg', 'keg50', TRUE)
ON CONFLICT (product_code) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  brand_family = EXCLUDED.brand_family,
  pack_format = EXCLUDED.pack_format,
  duoi = EXCLUDED.duoi,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO map_product_source_to_internal (distributor, source_sku, internal_product_code, mapping_method, mapping_confidence, mapping_note)
VALUES
  ('Inn Express', 'PDPR500', 'FPPER50', 'manual_override', 1.00, 'Seeded from Airtable - Perry'),
  ('Inn Express', 'PDBR500', 'FPBRO50', 'manual_override', 1.00, 'Seeded from Airtable - Browns'),
  ('Inn Express', 'PDCPR330', 'FPPREMCAN33', 'manual_override', 1.00, 'Seeded from Airtable - Premium Can'),
  ('Inn Express', 'PDVN500', 'FPVIN66', 'manual_override', 1.00, 'Seeded from Airtable - Vintage'),
  ('Inn Express', 'PDDRYSPARK', 'FPCRAFT50', 'manual_override', 1.00, 'Seeded from Airtable - Craft'),
  ('Inn Express', 'CDBFBIB', 'FPBIBBF20L', 'manual_override', 1.00, 'Seeded from Airtable - Black Fox BIB'),
  ('Inn Express', 'PDUNBSD500', 'FPBWS50', 'manual_override', 1.00, 'Seeded from Airtable - Breakwells Seedling'),
  ('Inn Express', 'KDUCR50', 'FPKEG505', 'manual_override', 1.00, 'Seeded from Airtable - Craft Keg 50L'),
  ('Inn Express', 'KDUBF50', 'FPKEG50BF', 'manual_override', 1.00, 'Seeded from Airtable - Black Fox Keg 50L'),
  ('Inn Express', 'PDPC6.8500ML', 'FPPREM50', 'manual_override', 1.00, 'Seeded from Airtable - Premium Bottle')
ON CONFLICT (distributor, source_sku) DO UPDATE SET
  internal_product_code = EXCLUDED.internal_product_code,
  mapping_method = EXCLUDED.mapping_method,
  mapping_confidence = EXCLUDED.mapping_confidence,
  mapping_note = EXCLUDED.mapping_note,
  updated_at = NOW();

-- ############################################################################
-- VERIFICATION
-- ############################################################################
SELECT 'Tables created' AS status, COUNT(*) AS count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT 'Products seeded' AS status, COUNT(*) AS count FROM dim_product_internal;
SELECT 'Mappings seeded' AS status, COUNT(*) AS count FROM map_product_source_to_internal;
