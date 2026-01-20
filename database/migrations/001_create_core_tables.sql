-- Dunkerton Sales Dashboard - Core Tables Migration
-- Version: 1.0
-- Description: Creates 6 core tables for the sales data warehouse

-- ============================================================================
-- Table: import_runs
-- Purpose: Track each import with quality metrics for debugging and audit
-- ============================================================================
CREATE TABLE IF NOT EXISTS import_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Import Context
  report_month DATE NOT NULL,
  source_filename TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'completed' | 'failed'

  -- Metrics
  total_lines_read INTEGER,
  lines_imported INTEGER,
  lines_skipped INTEGER,  -- Duplicates (already had same line_key)

  -- Mapping Coverage
  lines_mapped INTEGER,
  lines_unmapped INTEGER,
  volume_mapped DECIMAL(10, 2),
  volume_unmapped DECIMAL(10, 2),
  mapping_coverage_pct DECIMAL(5, 2),

  -- Customer Stats
  new_customers INTEGER,
  existing_customers INTEGER,

  -- Product Stats
  new_source_skus INTEGER,
  existing_source_skus INTEGER,

  -- Errors
  error_message TEXT,
  error_details JSONB,

  -- Audit
  imported_by TEXT DEFAULT 'system',

  -- Constraints
  CONSTRAINT chk_import_status CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_import_runs_month ON import_runs(report_month);
CREATE INDEX IF NOT EXISTS idx_import_runs_status ON import_runs(status);
CREATE INDEX IF NOT EXISTS idx_import_runs_coverage ON import_runs(mapping_coverage_pct);

-- ============================================================================
-- Table: dim_product_internal
-- Purpose: Dunkerton's master SKU catalog (28 products)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dim_product_internal (
  product_code TEXT PRIMARY KEY,

  -- Core Attributes
  product_name TEXT NOT NULL,

  -- Classification (CRITICAL for gap analysis)
  brand_family TEXT NOT NULL,
  pack_format TEXT NOT NULL,
  duoi TEXT,
  category TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  launched_date DATE,
  discontinued_date DATE,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dim_product_brand_family ON dim_product_internal(brand_family);
CREATE INDEX IF NOT EXISTS idx_dim_product_format ON dim_product_internal(pack_format);
CREATE INDEX IF NOT EXISTS idx_dim_product_category ON dim_product_internal(category);

-- ============================================================================
-- Table: dim_product_source
-- Purpose: Inn Express SKU catalog (auto-populated from imports)
-- ============================================================================
CREATE TABLE IF NOT EXISTS dim_product_source (
  source_sku TEXT PRIMARY KEY,

  -- Attributes
  distributor TEXT NOT NULL DEFAULT 'Inn Express',
  source_description TEXT NOT NULL,
  sample_duoi TEXT,

  -- Detection Results
  detected_family TEXT,
  detected_format TEXT,

  -- Audit
  first_seen DATE NOT NULL,
  last_seen DATE NOT NULL,
  times_seen INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dim_product_source_family ON dim_product_source(detected_family);
CREATE INDEX IF NOT EXISTS idx_dim_product_source_format ON dim_product_source(detected_format);

-- ============================================================================
-- Table: map_product_source_to_internal
-- Purpose: Bridge table mapping Inn Express SKUs to Dunkerton SKUs
-- ============================================================================
CREATE TABLE IF NOT EXISTS map_product_source_to_internal (
  distributor TEXT NOT NULL DEFAULT 'Inn Express',
  source_sku TEXT NOT NULL,

  -- Mapping Target (nullable for unmapped SKUs)
  internal_product_code TEXT REFERENCES dim_product_internal(product_code),

  -- Mapping Quality
  mapping_method TEXT NOT NULL,  -- 'sku_code_match' | 'family_pack_fallback' | 'manual_override' | 'unmapped'
  mapping_confidence DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
  mapping_note TEXT,

  -- Audit
  mapped_at TIMESTAMPTZ DEFAULT NOW(),
  mapped_by TEXT DEFAULT 'system',
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (distributor, source_sku),
  CONSTRAINT chk_mapping_method CHECK (mapping_method IN ('sku_code_match', 'family_pack_fallback', 'manual_override', 'unmapped')),
  CONSTRAINT chk_mapping_confidence CHECK (mapping_confidence >= 0.00 AND mapping_confidence <= 1.00)
);

CREATE INDEX IF NOT EXISTS idx_map_unmapped ON map_product_source_to_internal(source_sku)
  WHERE internal_product_code IS NULL;
CREATE INDEX IF NOT EXISTS idx_map_method ON map_product_source_to_internal(mapping_method);
CREATE INDEX IF NOT EXISTS idx_map_confidence ON map_product_source_to_internal(mapping_confidence);

-- ============================================================================
-- Table: dim_customer
-- Purpose: Canonical customer master
-- ============================================================================
CREATE TABLE IF NOT EXISTS dim_customer (
  del_account TEXT PRIMARY KEY,

  -- Core Attributes
  customer_name TEXT NOT NULL,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_postcode TEXT,

  -- Derived Attributes (for segmentation)
  region TEXT,
  customer_type TEXT,  -- 'retail' | 'hospitality' | 'wholesale'

  -- Audit
  first_seen DATE NOT NULL,
  last_seen DATE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dim_customer_postcode ON dim_customer(delivery_postcode);
CREATE INDEX IF NOT EXISTS idx_dim_customer_name ON dim_customer(customer_name);
CREATE INDEX IF NOT EXISTS idx_dim_customer_first_seen ON dim_customer(first_seen);
CREATE INDEX IF NOT EXISTS idx_dim_customer_last_seen ON dim_customer(last_seen);

-- ============================================================================
-- Table: fact_shipments
-- Purpose: Line-level distribution transactions (grain: one row per product per customer per month)
-- ============================================================================
CREATE TABLE IF NOT EXISTS fact_shipments (
  line_key TEXT PRIMARY KEY,

  -- Date Dimension
  report_month DATE NOT NULL,

  -- Customer Dimension
  del_account TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_postcode TEXT,

  -- Product Dimension
  source_sku TEXT NOT NULL,
  source_description TEXT NOT NULL,
  duoi TEXT,

  -- Mapped Product (nullable until mapped)
  internal_product_code TEXT,

  -- Metrics
  quantity DECIMAL(10, 2) NOT NULL,

  -- Context
  salesperson TEXT,
  distributor TEXT DEFAULT 'Inn Express',

  -- Derived Fields (computed during import)
  detected_family TEXT,
  detected_format TEXT,
  detected_category TEXT,

  -- Mapping Quality
  mapping_method TEXT,
  mapping_confidence DECIMAL(3, 2),

  -- Audit
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  import_run_id UUID REFERENCES import_runs(id),

  -- Constraints
  CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_report_month_first_of_month CHECK (EXTRACT(DAY FROM report_month) = 1)
);

CREATE INDEX IF NOT EXISTS idx_fact_shipments_month ON fact_shipments(report_month);
CREATE INDEX IF NOT EXISTS idx_fact_shipments_customer ON fact_shipments(del_account);
CREATE INDEX IF NOT EXISTS idx_fact_shipments_source_sku ON fact_shipments(source_sku);
CREATE INDEX IF NOT EXISTS idx_fact_shipments_internal_product ON fact_shipments(internal_product_code);
CREATE INDEX IF NOT EXISTS idx_fact_shipments_mapping_method ON fact_shipments(mapping_method);
CREATE INDEX IF NOT EXISTS idx_fact_shipments_unmapped ON fact_shipments(internal_product_code) WHERE internal_product_code IS NULL;
CREATE INDEX IF NOT EXISTS idx_fact_shipments_salesperson ON fact_shipments(salesperson);
CREATE INDEX IF NOT EXISTS idx_fact_shipments_import_run ON fact_shipments(import_run_id);

-- ============================================================================
-- Enable Row Level Security (optional, for Supabase)
-- ============================================================================
-- ALTER TABLE import_runs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dim_product_internal ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dim_product_source ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE map_product_source_to_internal ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dim_customer ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fact_shipments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Trigger function for updated_at timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_dim_product_internal_updated_at ON dim_product_internal;
CREATE TRIGGER update_dim_product_internal_updated_at
    BEFORE UPDATE ON dim_product_internal
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dim_product_source_updated_at ON dim_product_source;
CREATE TRIGGER update_dim_product_source_updated_at
    BEFORE UPDATE ON dim_product_source
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_map_product_updated_at ON map_product_source_to_internal;
CREATE TRIGGER update_map_product_updated_at
    BEFORE UPDATE ON map_product_source_to_internal
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dim_customer_updated_at ON dim_customer;
CREATE TRIGGER update_dim_customer_updated_at
    BEFORE UPDATE ON dim_customer
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
