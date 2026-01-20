# Dunkerton Sales Dashboard - Complete Project Handoff
## Master Document for Coding Agent

**Version**: 1.0  
**Date**: January 2026  
**Purpose**: Complete rebuild of Dunkerton sales data pipeline using Claude Code + Supabase + Custom Web Dashboard  

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Context & History](#project-context--history)
3. [Complete Data Model Specification](#complete-data-model-specification)
4. [Dashboard UI Specification](#dashboard-ui-specification)
5. [UI Style Guide](#ui-style-guide)
6. [Import Process Logic](#import-process-logic)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Files to Create/Update](#files-to-createupdate)

---

## Executive Summary

### Project Outcome
Build a **volume-led sales dashboard + soft CRM** for Dunkerton Cider from monthly **Inn Express** distribution reports.

### Users
- Internal telesales team
- Marketing team

### Core Use Cases
1. Monthly performance monitoring (volume-based, not revenue)
2. Customer segmentation (new, active, at-risk)
3. Product performance analysis
4. Gap analysis (identify format/brand opportunities)
5. Campaign list exports (CSV)

### Technology Stack
- **Data Pipeline**: Claude Code (Python scripts, version-controlled)
- **Database**: Supabase Postgres (proper relational DB)
- **Frontend**: Custom web dashboard (React/Next.js)
- **Style**: "Night Ops" dark theme (see UI Style Guide)

### Success Criteria
✅ Idempotent monthly imports (safe to re-run)  
✅ ≥95% product mapping coverage by volume  
✅ 6 core KPIs operational  
✅ Customer drill-downs functional  
✅ Export to CSV working  

---

## Project Context & History

### Original System (n8n → Airtable)

**What Existed Before**:
- **Pipeline**: n8n workflow processing 2 distributors (Inn Express + Craft Drinks)
- **Storage**: Airtable (3 tables: Products, Customers, Transactions)
- **Data Volume**: 2,891 transactions normalized, cleaned to 2,080 records
- **Product Matching**: 89% accuracy (1,840 of 2,080 matched)

**Product Matching Logic Built**:
1. **Primary**: Match by distributor code (Inn_Express_Name field)
2. **Fallback**: Family + Pack Type detection
3. **Results**: 28 products mapped with codes like FPCRAFT50, FPDRY50, FPVIN66

**Customer Deduplication**:
- Customer Key = `Customer Name + Postcode`
- Handled address variations for same customer

**Data Transformation**:
- Date standardization (YYYY-MM-DD)
- DUOI extraction (Description Unit of Issue like "500ml x 12")
- Category assignment (bottle500, keg, bib20, can330)
- Pack Format detection (Bottle 500ml, Keg, BIB 20L, Can 330ml)
- Family extraction (Black Fox, Craft, Premium, Vintage)

**Critical Learnings**:
- Summary rows ("Total", "Grand Total") needed filtering
- UNMATCHED products were mostly Craft Drinks items (excluded in new system)
- Inn Express data is richer (addresses, salesperson, detailed SKUs)
- Manual CSV import to Airtable required careful field mapping

### Why Rebuilding?

**Problems with n8n/Airtable**:
- ❌ n8n workflows fragile and hard to maintain
- ❌ No version control for workflow logic
- ❌ Airtable not designed for complex analytics
- ❌ Manual CSV export/import steps each month
- ❌ Limited UI customization

**New System Benefits**:
- ✅ Scripts in version control (maintainable, reviewable)
- ✅ Proper relational database (Postgres)
- ✅ Professional web UI (better UX)
- ✅ Audit trail built-in (import_runs table)
- ✅ Scalable (can add more distributors later)

### Scope Refinements

**What's IN Scope**:
- Inn Express data only (NOT Craft Drinks)
- Volume-led analytics (units sold, customer counts)
- Customer segmentation (new, active, at-risk)
- Gap analysis (format and brand variety)
- Export capabilities (CSV downloads)

**What's OUT of Scope (MVP)**:
- Revenue/profit metrics (no pricing data yet)
- Craft Drinks integration (different data structure)
- Automated email campaigns (future: integrate n8n)
- Mobile app (web-first)
- Real-time data (monthly batch imports)

**Explicitly Excluded**:
- Orchard Bliss product (was Craft Drinks only)
- Vintage product issue (was Craft Drinks only)
- Gift boxes (not in product catalog)

---

## Complete Data Model Specification

### Database: Supabase Postgres

### Design Principles
1. **Idempotency**: Re-importing same file doesn't duplicate data
2. **Separation**: Inn Express SKUs separate from Dunkerton internal SKUs
3. **Automatic Matching**: Two-tier matching (SKU code → family+pack fallback)
4. **Quality Target**: ≥95% mapping coverage by volume
5. **Audit Trail**: Every import tracked with quality metrics

---

### Core Tables

#### `fact_shipments`
**Purpose**: Line-level distribution transactions  
**Grain**: One row per product per customer per month  
**Idempotency**: `line_key` prevents duplicates  

```sql
CREATE TABLE fact_shipments (
  -- Primary Key
  line_key TEXT PRIMARY KEY,  -- MD5(report_month || del_account || source_sku || quantity || salesperson)
  
  -- Date Dimension
  report_month DATE NOT NULL,  -- Always YYYY-MM-01 (first of month)
  
  -- Customer Dimension
  del_account TEXT NOT NULL,  -- Customer identifier
  customer_name TEXT NOT NULL,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_postcode TEXT,
  
  -- Product Dimension
  source_sku TEXT NOT NULL,  -- Inn Express SKU code
  source_description TEXT NOT NULL,  -- Inn Express product description
  duoi TEXT,  -- Description Unit of Issue (e.g., "500ml x 12")
  
  -- Mapped Product (nullable until mapped)
  internal_product_code TEXT,  -- References dim_product_internal(product_code)
  
  -- Metrics
  quantity DECIMAL(10, 2) NOT NULL,
  
  -- Context
  salesperson TEXT,
  distributor TEXT DEFAULT 'Inn Express',
  
  -- Derived Fields (computed during import)
  detected_family TEXT,  -- Extracted from description (Black Fox, Craft, Premium, etc.)
  detected_format TEXT,  -- Detected pack type (bottle500, keg, bib20, can330)
  detected_category TEXT,  -- Category code derived from DUOI/format
  
  -- Mapping Quality
  mapping_method TEXT,  -- 'sku_match' | 'family_pack_fallback' | 'unmapped'
  mapping_confidence DECIMAL(3, 2),  -- 0.00 to 1.00
  
  -- Audit
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  import_run_id UUID REFERENCES import_runs(id)
);

-- Indexes
CREATE INDEX idx_fact_shipments_month ON fact_shipments(report_month);
CREATE INDEX idx_fact_shipments_customer ON fact_shipments(del_account);
CREATE INDEX idx_fact_shipments_source_sku ON fact_shipments(source_sku);
CREATE INDEX idx_fact_shipments_internal_product ON fact_shipments(internal_product_code);
CREATE INDEX idx_fact_shipments_mapping_method ON fact_shipments(mapping_method);
CREATE INDEX idx_fact_shipments_unmapped ON fact_shipments(internal_product_code) WHERE internal_product_code IS NULL;

-- Constraints
ALTER TABLE fact_shipments 
  ADD CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT chk_report_month_first_of_month CHECK (EXTRACT(DAY FROM report_month) = 1);
```

**Customer Deduplication Strategy**:
- **Option A** (preferred): Use Inn Express `del_account` field if they provide consistent IDs
- **Option B** (fallback): Generate `del_account = MD5(UPPER(TRIM(customer_name)) || UPPER(TRIM(delivery_postcode)))`
- **Decision**: Check first import file to see if Inn Express provides account IDs

---

#### `dim_customer`
**Purpose**: Canonical customer master  
**Populated**: Auto-created/updated during imports  

```sql
CREATE TABLE dim_customer (
  -- Primary Key
  del_account TEXT PRIMARY KEY,
  
  -- Core Attributes
  customer_name TEXT NOT NULL,
  delivery_address TEXT,
  delivery_city TEXT,
  delivery_postcode TEXT,
  
  -- Derived Attributes (for segmentation)
  region TEXT,  -- Derived from postcode (future)
  customer_type TEXT,  -- 'retail' | 'hospitality' | 'wholesale' (future)
  
  -- Audit
  first_seen DATE NOT NULL,
  last_seen DATE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dim_customer_postcode ON dim_customer(delivery_postcode);
CREATE INDEX idx_dim_customer_name ON dim_customer(customer_name);
```

---

#### `dim_product_internal`
**Purpose**: Dunkerton's master SKU catalog (28 products)  
**Seeded**: From existing Airtable Products table  
**Maintained**: Manual updates as new products launch  

```sql
CREATE TABLE dim_product_internal (
  -- Primary Key
  product_code TEXT PRIMARY KEY,  -- e.g., 'FPCRAFT50', 'FPDRY50'
  
  -- Core Attributes
  product_name TEXT NOT NULL,  -- e.g., 'Dunkertons CRAFT Cider 5% Bottles'
  
  -- Classification (CRITICAL for gap analysis)
  brand_family TEXT NOT NULL,  -- 'Black Fox' | 'Craft' | 'Premium' | 'Vintage' | etc.
  pack_format TEXT NOT NULL,   -- 'Bottle 500ml' | 'Keg' | 'BIB 20L' | 'Can 330ml' | 'Mini Keg'
  duoi TEXT,                    -- '500ml x 12', '30L', etc.
  category TEXT,                -- 'bottle500' | 'keg' | 'bib20' | 'can330'
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  launched_date DATE,
  discontinued_date DATE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dim_product_brand_family ON dim_product_internal(brand_family);
CREATE INDEX idx_dim_product_format ON dim_product_internal(pack_format);
CREATE INDEX idx_dim_product_category ON dim_product_internal(category);
```

**Seed Data Source**: Export 28 products from Airtable with all fields populated, especially `brand_family` and `pack_format` (required for gap analysis).

---

#### `dim_product_source`
**Purpose**: Inn Express SKU catalog  
**Populated**: Auto-populated from imports  

```sql
CREATE TABLE dim_product_source (
  -- Primary Key
  source_sku TEXT PRIMARY KEY,  -- Inn Express SKU code
  
  -- Attributes
  distributor TEXT NOT NULL DEFAULT 'Inn Express',
  source_description TEXT NOT NULL,  -- Most recent description seen
  sample_duoi TEXT,  -- Most common DUOI seen for this SKU
  
  -- Detection Results (from most recent import)
  detected_family TEXT,
  detected_format TEXT,
  
  -- Audit
  first_seen DATE NOT NULL,
  last_seen DATE NOT NULL,
  times_seen INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dim_product_source_family ON dim_product_source(detected_family);
CREATE INDEX idx_dim_product_source_format ON dim_product_source(detected_format);
```

---

#### `map_product_source_to_internal`
**Purpose**: Bridge table mapping Inn Express SKUs to Dunkerton SKUs  
**Populated**: Automatically during import  
**Quality**: Target ≥95% of volume mapped  

```sql
CREATE TABLE map_product_source_to_internal (
  -- Composite Key
  distributor TEXT NOT NULL DEFAULT 'Inn Express',
  source_sku TEXT NOT NULL,
  
  -- Mapping Target (nullable for unmapped SKUs)
  internal_product_code TEXT REFERENCES dim_product_internal(product_code),
  
  -- Mapping Quality
  mapping_method TEXT NOT NULL,  -- 'sku_code_match' | 'family_pack_fallback' | 'manual_override' | 'unmapped'
  mapping_confidence DECIMAL(3, 2) NOT NULL DEFAULT 0.00,  -- 0.00 to 1.00
  mapping_note TEXT,  -- Explanation or reason for mapping
  
  -- Audit
  mapped_at TIMESTAMPTZ DEFAULT NOW(),
  mapped_by TEXT DEFAULT 'system',  -- 'system' | 'manual' | username
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (distributor, source_sku)
);

CREATE INDEX idx_map_unmapped ON map_product_source_to_internal(source_sku) 
  WHERE internal_product_code IS NULL;
CREATE INDEX idx_map_method ON map_product_source_to_internal(mapping_method);
CREATE INDEX idx_map_confidence ON map_product_source_to_internal(mapping_confidence);
```

**Mapping Logic** (applied during import):

1. **SKU Code Match** (confidence: 1.00):
   - Join on pre-seeded mappings from Airtable (where Inn_Express_Name exists)
   - Method: `sku_code_match`

2. **Family + Pack Fallback** (confidence: 0.70-0.90):
   - Extract `detected_family` from source_description using regex
   - Extract `detected_format` from duoi and source_description using regex
   - Match to `dim_product_internal` WHERE `brand_family = detected_family AND pack_format = detected_format`
   - Confidence: exact match = 0.90, partial match = 0.70

3. **Unmapped** (confidence: 0.00):
   - No match found
   - Record with `internal_product_code = NULL`
   - Method: `unmapped`

**Seed Strategy**:
- Export Airtable Products table where Inn_Express_Name IS NOT NULL
- Insert as `manual_override` with confidence 1.00
- This gives instant perfect mapping for known products

---

#### `import_runs`
**Purpose**: Track each import with quality metrics  
**Used for**: Debugging, coverage reporting, audit trail  

```sql
CREATE TABLE import_runs (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Import Context
  report_month DATE NOT NULL,  -- Which month was imported
  source_filename TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',  -- 'running' | 'completed' | 'failed'
  
  -- Metrics
  total_lines_read INTEGER,
  lines_imported INTEGER,
  lines_skipped INTEGER,  -- Duplicates (already had same line_key)
  
  -- Mapping Coverage
  lines_mapped INTEGER,  -- Has internal_product_code
  lines_unmapped INTEGER,  -- No internal_product_code
  volume_mapped DECIMAL(10, 2),  -- Sum(quantity) where mapped
  volume_unmapped DECIMAL(10, 2),  -- Sum(quantity) where unmapped
  mapping_coverage_pct DECIMAL(5, 2),  -- volume_mapped / (volume_mapped + volume_unmapped) * 100
  
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
  imported_by TEXT DEFAULT 'system'
);

CREATE INDEX idx_import_runs_month ON import_runs(report_month);
CREATE INDEX idx_import_runs_status ON import_runs(status);
CREATE INDEX idx_import_runs_coverage ON import_runs(mapping_coverage_pct);
```

---

### Views (SQL)

#### `v_monthly_summary`
**Purpose**: High-level KPIs per month  

```sql
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
```

---

#### `v_new_customers`
**Purpose**: Customers who first appeared in each month  

```sql
CREATE OR REPLACE VIEW v_new_customers AS
SELECT
  c.del_account,
  c.customer_name,
  c.delivery_postcode,
  c.first_seen AS first_order_month,
  COALESCE(SUM(f.quantity), 0) AS first_month_units
FROM dim_customer c
LEFT JOIN fact_shipments f 
  ON c.del_account = f.del_account 
  AND c.first_seen = f.report_month
GROUP BY c.del_account, c.customer_name, c.delivery_postcode, c.first_seen
ORDER BY c.first_seen DESC;
```

---

#### `v_at_risk_customers`
**Purpose**: Customers who bought in recent N months but not most recent  
**Default N**: 3 months (configurable)  

```sql
CREATE OR REPLACE VIEW v_at_risk_customers AS
WITH recent_month AS (
  SELECT MAX(report_month) AS max_month FROM fact_shipments
),
customer_last_order AS (
  SELECT 
    del_account,
    MAX(report_month) AS last_order_month
  FROM fact_shipments
  GROUP BY del_account
)
SELECT
  c.del_account,
  c.customer_name,
  c.delivery_postcode,
  clo.last_order_month,
  rm.max_month AS current_month,
  DATE_PART('month', AGE(rm.max_month, clo.last_order_month)) AS months_since_last_order
FROM dim_customer c
JOIN customer_last_order clo ON c.del_account = clo.del_account
CROSS JOIN recent_month rm
WHERE clo.last_order_month < rm.max_month  -- Did NOT buy most recent month
  AND clo.last_order_month >= rm.max_month - INTERVAL '3 months'  -- But DID buy within last 3 months
ORDER BY months_since_last_order DESC, c.customer_name;
```

---

#### `v_top_customers`
**Purpose**: Customer volume rankings  

```sql
CREATE OR REPLACE VIEW v_top_customers AS
SELECT
  c.del_account,
  c.customer_name,
  c.delivery_city,
  c.delivery_postcode,
  COUNT(DISTINCT f.report_month) AS months_active,
  SUM(f.quantity) AS total_units,
  ROUND(AVG(f.quantity), 2) AS avg_units_per_order,
  MAX(f.report_month) AS last_order_month
FROM dim_customer c
JOIN fact_shipments f ON c.del_account = f.del_account
GROUP BY c.del_account, c.customer_name, c.delivery_city, c.delivery_postcode
ORDER BY total_units DESC;
```

---

#### `v_top_products`
**Purpose**: Product volume rankings  

```sql
CREATE OR REPLACE VIEW v_top_products AS
SELECT
  p.product_code,
  p.product_name,
  p.brand_family,
  p.pack_format,
  COUNT(DISTINCT f.del_account) AS customer_count,
  SUM(f.quantity) AS total_units
FROM dim_product_internal p
JOIN fact_shipments f ON p.product_code = f.internal_product_code
GROUP BY p.product_code, p.product_name, p.brand_family, p.pack_format
ORDER BY total_units DESC;
```

---

#### `v_unmapped_skus`
**Purpose**: Source SKUs not yet mapped (for review)  

```sql
CREATE OR REPLACE VIEW v_unmapped_skus AS
SELECT
  s.source_sku,
  s.source_description,
  s.detected_family,
  s.detected_format,
  s.times_seen,
  s.last_seen,
  SUM(f.quantity) AS total_volume_unmapped
FROM dim_product_source s
LEFT JOIN map_product_source_to_internal m 
  ON s.source_sku = m.source_sku
LEFT JOIN fact_shipments f 
  ON s.source_sku = f.source_sku
WHERE m.internal_product_code IS NULL  -- Not mapped
GROUP BY s.source_sku, s.source_description, s.detected_family, s.detected_format, s.times_seen, s.last_seen
ORDER BY total_volume_unmapped DESC NULLS LAST;
```

---

#### `v_gap_analysis_format`
**Purpose**: Customers with low format variety  

```sql
CREATE OR REPLACE VIEW v_gap_analysis_format AS
WITH customer_formats AS (
  SELECT
    f.del_account,
    c.customer_name,
    p.pack_format,
    SUM(f.quantity) AS units
  FROM fact_shipments f
  JOIN dim_customer c ON f.del_account = c.del_account
  JOIN dim_product_internal p ON f.internal_product_code = p.product_code
  WHERE f.internal_product_code IS NOT NULL
  GROUP BY f.del_account, c.customer_name, p.pack_format
),
format_counts AS (
  SELECT
    del_account,
    customer_name,
    COUNT(DISTINCT pack_format) AS formats_purchased
  FROM customer_formats
  GROUP BY del_account, customer_name
)
SELECT
  fc.del_account,
  fc.customer_name,
  fc.formats_purchased,
  STRING_AGG(cf.pack_format, ', ' ORDER BY cf.units DESC) AS formats_bought,
  SUM(cf.units) AS total_units
FROM format_counts fc
JOIN customer_formats cf ON fc.del_account = cf.del_account
WHERE fc.formats_purchased < 3  -- Buying fewer than 3 formats
GROUP BY fc.del_account, fc.customer_name, fc.formats_purchased
ORDER BY total_units DESC;
```

---

#### `v_gap_analysis_brand`
**Purpose**: Customers with low brand variety  

```sql
CREATE OR REPLACE VIEW v_gap_analysis_brand AS
WITH customer_brands AS (
  SELECT
    f.del_account,
    c.customer_name,
    p.brand_family,
    SUM(f.quantity) AS units
  FROM fact_shipments f
  JOIN dim_customer c ON f.del_account = c.del_account
  JOIN dim_product_internal p ON f.internal_product_code = p.product_code
  WHERE f.internal_product_code IS NOT NULL
  GROUP BY f.del_account, c.customer_name, p.brand_family
),
brand_counts AS (
  SELECT
    del_account,
    customer_name,
    COUNT(DISTINCT brand_family) AS brands_purchased
  FROM customer_brands
  GROUP BY del_account, customer_name
)
SELECT
  bc.del_account,
  bc.customer_name,
  bc.brands_purchased,
  STRING_AGG(cb.brand_family, ', ' ORDER BY cb.units DESC) AS brands_bought,
  SUM(cb.units) AS total_units
FROM brand_counts bc
JOIN customer_brands cb ON bc.del_account = cb.del_account
WHERE bc.brands_purchased < 2  -- Only buying 1 brand family
GROUP BY bc.del_account, bc.customer_name, bc.brands_purchased
ORDER BY total_units DESC;
```

---

### Seed Data Requirements

#### 1. `dim_product_internal` (28 Products)
**Source**: Existing Airtable Products table  
**Required Columns**: 
- product_code
- product_name
- brand_family (CRITICAL - must be populated)
- pack_format (CRITICAL - must be populated)
- duoi
- category

**Export Format**: CSV  
**Action**: Export from Airtable, import to Postgres

**Sample Data**:
```csv
product_code,product_name,brand_family,pack_format,duoi,category
FPCRAFT50,Dunkertons CRAFT Cider 5% Bottles,Craft,Bottle 500ml,500ml x 12,bottle500
FPDRY50,Dunkertons Dry Organic Cider 500ml,Premium,Bottle 500ml,500ml x 12,bottle500
FPBF050,Black Fox Organic Sparkling Cider 50cl x 12,Black Fox,Bottle 500ml,500ml x 12,bottle500
```

---

#### 2. `map_product_source_to_internal` (Existing Mappings)
**Source**: Airtable Products table (Inn_Express_Name field)  
**Logic**: WHERE Inn_Express_Name IS NOT NULL  

**Export Format**: CSV  
**Sample Data**:
```csv
distributor,source_sku,internal_product_code,mapping_method,mapping_confidence,mapping_note
Inn Express,PDDRYSPARK,FPDRY50,manual_override,1.00,Seeded from Airtable
Inn Express,PDCRAFTSP,FPCRAFT50,manual_override,1.00,Seeded from Airtable
Inn Express,PDBFSPARK,FPBF050,manual_override,1.00,Seeded from Airtable
```

---

## Dashboard UI Specification

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER                                                             │
│  Dunkerton Sales Dashboard                          [User Menu]    │
└─────────────────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────────────────────────────┐
│              │  FILTERS                                             │
│              │  ┌─────────────────────────────────────────────────┐ │
│              │  │ Month: [Dropdown]     Distributor: Inn Express │ │
│  LEFT RAIL   │  │ Customer: [Search]    Brand: [Multi-select]    │ │
│              │  │ Format: [Multi-select] SKU: [Search]            │ │
│  - Filters   │  │ Salesperson: [Multi-select]                     │ │
│  - Segments  │  └─────────────────────────────────────────────────┘ │
│  - Exports   │                                                      │
│              │  KPI DECK (6 Tiles)                                  │
│              │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐│
│              │  │Total │ │Active│ │ New  │ │At    │ │ Top  │ │Top ││
│              │  │Units │ │Cust. │ │Cust. │ │Risk  │ │Brand │ │SKU ││
│              │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └────┘│
│              │                                                      │
│              │  MAIN CHARTS                                         │
│              │  ┌─────────────────────────────────────────────────┐ │
│              │  │ Volume Trend (Line Chart by Month)             │ │
│              │  │ - Stacked by Brand Family                       │ │
│              │  └─────────────────────────────────────────────────┘ │
│              │                                                      │
│              │  DATA TABLES                                         │
│              │  ┌───────────────────┬───────────────────────────┐  │
│              │  │ Top Customers     │ Top SKUs                  │  │
│              │  │ (Volume Ranked)   │ (Volume Ranked)           │  │
│              │  └───────────────────┴───────────────────────────┘  │
│              │                                                      │
│              │  INSIGHTS PANELS                                     │
│              │  ┌─────────────────────────────────────────────────┐ │
│              │  │ New Customers This Month                        │ │
│              │  └─────────────────────────────────────────────────┘ │
│              │  ┌─────────────────────────────────────────────────┐ │
│              │  │ At-Risk Customers (Not Ordered Recently)        │ │
│              │  └─────────────────────────────────────────────────┘ │
│              │  ┌─────────────────────────────────────────────────┐ │
│              │  │ Gap Opportunities                               │ │
│              │  │ - Format Gaps  - Brand Gaps                     │ │
│              │  └─────────────────────────────────────────────────┘ │
│              │                                                      │
│              │  EXPORT PANEL                                        │
│              │  ┌─────────────────────────────────────────────────┐ │
│              │  │ Segment Builder                                 │ │
│              │  │ [Save Segment] [Export CSV]                     │ │
│              │  └─────────────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────┘
```

---

### KPI Tiles (Top Row - 6 Tiles)

#### Tile 1: Total Units
- **Metric**: `SUM(quantity)` from fact_shipments
- **Period**: Selected month filter
- **Display**: Large number with trend arrow vs previous month

#### Tile 2: Active Customers
- **Metric**: `COUNT(DISTINCT del_account)` where quantity > 0
- **Period**: Selected month filter
- **Display**: Count with trend arrow

#### Tile 3: New Customers
- **Metric**: From `v_new_customers` view
- **Definition**: Customers where `first_seen = selected_month`
- **Display**: Count with % of total

#### Tile 4: At-Risk Customers
- **Metric**: From `v_at_risk_customers` view
- **Definition**: Bought in last 3 months but NOT in most recent month
- **Display**: Count with warning icon if count > threshold

#### Tile 5: Top Brand Family
- **Metric**: Brand family with highest `SUM(quantity)` this month
- **Display**: Brand name + unit count

#### Tile 6: Top SKU
- **Metric**: Product with highest `SUM(quantity)` this month
- **Display**: Product name + unit count

---

### Main Charts

#### Volume Trend Chart
- **Type**: Line chart (or area chart)
- **X-Axis**: report_month (monthly)
- **Y-Axis**: SUM(quantity)
- **Series**: Stacked by brand_family
- **Interactivity**: Hover for details, click to filter

#### Top Customers Table
- **Columns**:
  1. Customer Name
  2. City
  3. Postcode
  4. Total Units
  5. Last Order
- **Sort**: Total Units DESC
- **Limit**: Top 20
- **Action**: Click row to drill down

#### Top SKUs Table
- **Columns**:
  1. Product Name
  2. Brand Family
  3. Pack Format
  4. Total Units
  5. Customer Count
- **Sort**: Total Units DESC
- **Limit**: Top 20

---

### Insights Panels

#### New Customers Panel
- **Data**: From `v_new_customers`
- **Display**: List with customer name, postcode, first order units
- **Action**: Export list for onboarding campaign

#### At-Risk Customers Panel
- **Data**: From `v_at_risk_customers`
- **Display**: List with customer name, last order month, months since
- **Action**: Export list for re-engagement campaign

#### Gap Opportunities Panel
- **Tabs**:
  1. **Format Gaps**: From `v_gap_analysis_format`
     - Show customers buying < 3 formats
     - Suggest formats they don't stock
  2. **Brand Gaps**: From `v_gap_analysis_brand`
     - Show customers buying only 1 brand
     - Suggest other brands to pitch

---

### Left Rail (Filters & Actions)

#### Filters
- **Month**: Dropdown (all available months from fact_shipments)
- **Distributor**: Fixed to "Inn Express" (MVP)
- **Customer**: Searchable dropdown
- **Brand Family**: Multi-select checkboxes
- **Pack Format**: Multi-select checkboxes
- **SKU**: Searchable dropdown
- **Salesperson**: Multi-select checkboxes

#### Segment Builder
- **Purpose**: Save filter combinations as named segments
- **Example**: "High Volume Pubs" (customer_type = hospitality, total_units > 100)
- **Actions**:
  - Save Segment
  - Load Segment
  - Export CSV

#### Export Panel
- **CSV Exports**:
  - Current filtered data
  - New customers list
  - At-risk customers list
  - Gap opportunities list

---

## UI Style Guide

### Design System: "Night Ops"

#### Color Palette

**Background**:
- Primary BG: `#0a0e1a` (Very dark blue-black)
- Secondary BG: `#111827` (Dark slate)
- Elevated surfaces: `#1e293b` (Slate-700)

**Text**:
- Primary: `#f1f5f9` (Slate-100)
- Secondary: `#94a3b8` (Slate-400)
- Muted: `#64748b` (Slate-500)

**Accent Colors**:
- Primary accent: `#3b82f6` (Blue-500) - for CTAs, active states
- Success: `#10b981` (Emerald-500) - positive metrics, upward trends
- Warning: `#f59e0b` (Amber-500) - at-risk customers
- Danger: `#ef4444` (Red-500) - critical alerts
- Info: `#06b6d4` (Cyan-500) - neutral highlights

**Data Visualization**:
- Brand family colors (distinguish in charts):
  - Black Fox: `#8b5cf6` (Purple-500)
  - Craft: `#3b82f6` (Blue-500)
  - Premium: `#10b981` (Emerald-500)
  - Vintage: `#f59e0b` (Amber-500)

#### Typography

**Fonts**:
- Headings: `Inter` (sans-serif, 600-700 weight)
- Body: `Inter` (sans-serif, 400-500 weight)
- Data/Numbers: `JetBrains Mono` (monospace, for consistent alignment)

**Sizes**:
- H1 (Page Title): 2.5rem (40px), font-weight 700
- H2 (Section Title): 1.875rem (30px), font-weight 600
- H3 (Card Title): 1.25rem (20px), font-weight 600
- Body: 1rem (16px), font-weight 400
- Small: 0.875rem (14px), font-weight 400
- Tiny (labels): 0.75rem (12px), font-weight 500, uppercase

#### Components

**KPI Tiles**:
- Background: `#1e293b` with subtle border `#334155`
- Padding: 1.5rem
- Border radius: 0.75rem
- Hover: Slight lift + glow effect (`box-shadow: 0 0 20px rgba(59, 130, 246, 0.3)`)
- Metric number: 3rem, font-weight 700, `JetBrains Mono`
- Label: 0.875rem, font-weight 500, uppercase, letter-spacing 0.05em, muted color
- Trend indicator: Arrow icon + percentage in small font

**Charts**:
- Background: `#111827`
- Grid lines: `#334155` (subtle)
- Axis labels: `#94a3b8`
- Tooltips: Dark background `#1e293b` with white text, shadow

**Tables**:
- Header: `#1e293b` background, uppercase labels
- Row: `#111827` background, hover state `#1e293b`
- Border: `#334155` (1px solid)
- Striped rows: Alternate with `#0f172a`

**Buttons**:
- Primary: `bg-blue-600 hover:bg-blue-500` with white text
- Secondary: `bg-slate-700 hover:bg-slate-600` with white text
- Danger: `bg-red-600 hover:bg-red-500` with white text
- Ghost: Transparent with border, hover background

**Inputs**:
- Background: `#1e293b`
- Border: `#334155`
- Focus: Border `#3b82f6`, ring `rgba(59, 130, 246, 0.5)`
- Text: `#f1f5f9`
- Placeholder: `#64748b`

**Cards/Panels**:
- Background: `#111827`
- Border: `1px solid #334155`
- Border radius: 0.75rem
- Padding: 1.5rem
- Shadow: `0 4px 6px rgba(0, 0, 0, 0.3)`

#### Layout Principles

**Spacing**:
- Consistent spacing scale: 0.5rem, 1rem, 1.5rem, 2rem, 3rem
- Generous whitespace around elements
- Vertical rhythm: 1.5rem between sections

**Grid**:
- KPI tiles: 6 columns, equal width, gap 1rem
- Charts: Full width or 2-column layout
- Tables: Full width with horizontal scroll if needed

**Responsive**:
- Desktop-first (primary use case)
- Mobile: Stack KPI tiles, collapse left rail into drawer

#### Interaction States

**Hover**:
- Subtle lift (translateY -2px)
- Slight glow or shadow increase
- Color brightening (e.g., bg-blue-600 → bg-blue-500)

**Active/Selected**:
- Border highlight in accent color
- Background slightly lighter
- Icon or indicator (checkmark, dot)

**Disabled**:
- Opacity: 0.5
- Cursor: not-allowed
- No hover effects

#### Accessibility

**Contrast**:
- Text-to-background ratio ≥ 4.5:1 (WCAG AA)
- Interactive elements clearly visible

**Focus**:
- Visible focus ring (2px solid accent color)
- Keyboard navigation support

**Semantic HTML**:
- Proper heading hierarchy
- Aria labels for charts and interactive elements

---

### UI Implementation Tech Stack

**Framework**: React + Next.js 14 (App Router)  
**Styling**: Tailwind CSS  
**Components**: shadcn/ui (Radix UI primitives)  
**Charts**: Recharts (React wrapper for D3)  
**State**: React Context + SWR (for data fetching)  
**Database Client**: Supabase JS Client  

---

## Import Process Logic

### High-Level Flow

```
1. Pre-Import Validation
2. Parse Source File (Inn Express XLS/XLSX)
3. Transform & Detect (family, format, category)
4. Product Matching (SKU → family+pack → unmapped)
5. Customer Deduplication
6. Insert Facts (idempotent via line_key)
7. Update Dimension Tables
8. Post-Import Quality Checks
9. Generate Reports
```

---

### Detailed Step-by-Step

#### Step 1: Pre-Import Validation
```python
def pre_import_validation(file_path, report_month):
    """
    Validate file and prepare import run
    """
    # Check file format
    assert file_path.endswith(('.xls', '.xlsx')), "File must be Excel format"
    
    # Parse report_month from filename or user input
    # Expected format: YYYY-MM-01
    assert report_month.day == 1, "report_month must be first of month"
    
    # Check if already imported (idempotency check)
    existing_run = query("""
        SELECT id FROM import_runs 
        WHERE report_month = %s AND status = 'completed'
    """, (report_month,))
    
    if existing_run:
        print(f"Warning: {report_month} already imported. Re-import will update existing records.")
    
    # Create import_runs record
    import_run_id = insert("""
        INSERT INTO import_runs (report_month, source_filename, status)
        VALUES (%s, %s, 'running')
        RETURNING id
    """, (report_month, os.path.basename(file_path)))
    
    return import_run_id
```

---

#### Step 2: Parse Source File
```python
def parse_inn_express_file(file_path):
    """
    Parse Inn Express XLS/XLSX file
    Skip header rows, identify column headers, extract data
    """
    import pandas as pd
    
    # Read Excel file
    df = pd.read_excel(file_path)
    
    # Skip header rows (print date, title)
    # Identify column headers row (look for "Customer Name", "SKU", etc.)
    header_row_idx = df[df.iloc[:, 0].str.contains("Customer Name", na=False)].index[0]
    
    # Re-read with correct header
    df = pd.read_excel(file_path, header=header_row_idx)
    
    # Filter out summary rows
    df = df[~df['Customer Name'].str.contains('Total|Grand Total', case=False, na=False)]
    
    # Expected columns (adjust based on actual Inn Express format):
    # - Customer Name
    # - Delivery Address
    # - City
    # - Postcode
    # - SKU (Inn Express code)
    # - Product Description
    # - DUOI
    # - Quantity
    # - Salesperson
    
    return df
```

---

#### Step 3: Transform & Detect
```python
def transform_and_detect(df, report_month):
    """
    Generate line_key, detect family/format/category, standardize
    """
    import hashlib
    
    transformed_rows = []
    
    for _, row in df.iterrows():
        # Determine del_account (use Inn Express ID if present, else generate)
        del_account = row.get('Account_ID') or generate_del_account(row['Customer Name'], row['Postcode'])
        
        # Generate line_key for idempotency
        line_key_str = f"{report_month}|{del_account}|{row['SKU']}|{row['Quantity']}|{row.get('Salesperson', '')}"
        line_key = hashlib.md5(line_key_str.encode()).hexdigest()
        
        # Detect brand family
        detected_family = detect_family(row['Product Description'])
        
        # Detect pack format
        detected_format = detect_format(row['Product Description'], row.get('DUOI'))
        
        # Derive category
        detected_category = derive_category(detected_format)
        
        transformed_rows.append({
            'line_key': line_key,
            'report_month': report_month,
            'del_account': del_account,
            'customer_name': row['Customer Name'],
            'delivery_address': row.get('Delivery Address'),
            'delivery_city': row.get('City'),
            'delivery_postcode': row['Postcode'],
            'source_sku': row['SKU'],
            'source_description': row['Product Description'],
            'duoi': row.get('DUOI'),
            'quantity': row['Quantity'],
            'salesperson': row.get('Salesperson'),
            'detected_family': detected_family,
            'detected_format': detected_format,
            'detected_category': detected_category
        })
    
    return transformed_rows

def generate_del_account(customer_name, postcode):
    """Fallback if Inn Express doesn't provide account ID"""
    import hashlib
    key = f"{customer_name.strip().upper()}|{postcode.strip().upper()}"
    return hashlib.md5(key.encode()).hexdigest()[:16]

def detect_family(description):
    """Extract brand family using regex"""
    import re
    if re.search(r'black fox', description, re.IGNORECASE):
        return 'Black Fox'
    elif re.search(r'craft', description, re.IGNORECASE):
        return 'Craft'
    elif re.search(r'premium', description, re.IGNORECASE):
        return 'Premium'
    elif re.search(r'vintage', description, re.IGNORECASE):
        return 'Vintage'
    else:
        return None

def detect_format(description, duoi):
    """Extract pack format using regex on description and DUOI"""
    import re
    text = f"{description} {duoi or ''}".lower()
    
    if re.search(r'500ml|50cl', text):
        return 'Bottle 500ml'
    elif re.search(r'660ml|66cl', text):
        return 'Bottle 660ml'
    elif re.search(r'330ml|33cl|can', text):
        return 'Can 330ml'
    elif re.search(r'keg|30l|mini keg', text):
        if re.search(r'mini', text):
            return 'Mini Keg'
        return 'Keg'
    elif re.search(r'20l|bib|bag in box', text):
        return 'BIB 20L'
    else:
        return None

def derive_category(pack_format):
    """Map pack format to category code"""
    mapping = {
        'Bottle 500ml': 'bottle500',
        'Bottle 660ml': 'bottle660',
        'Can 330ml': 'can330',
        'Keg': 'keg',
        'Mini Keg': 'minikeg',
        'BIB 20L': 'bib20'
    }
    return mapping.get(pack_format, 'unknown')
```

---

#### Step 4: Product Matching
```python
def match_products(transformed_rows):
    """
    Apply two-tier matching:
    1. SKU code match (from seeded mappings)
    2. Family + Pack fallback
    """
    # Load existing mappings
    mappings = query("""
        SELECT source_sku, internal_product_code, mapping_method, mapping_confidence
        FROM map_product_source_to_internal
    """)
    mapping_dict = {m['source_sku']: m for m in mappings}
    
    # Load internal products
    internal_products = query("""
        SELECT product_code, brand_family, pack_format
        FROM dim_product_internal
    """)
    
    for row in transformed_rows:
        source_sku = row['source_sku']
        
        # Try SKU code match first
        if source_sku in mapping_dict:
            mapping = mapping_dict[source_sku]
            row['internal_product_code'] = mapping['internal_product_code']
            row['mapping_method'] = mapping['mapping_method']
            row['mapping_confidence'] = mapping['mapping_confidence']
        else:
            # Try family + pack fallback
            matched = False
            if row['detected_family'] and row['detected_format']:
                for product in internal_products:
                    if (product['brand_family'] == row['detected_family'] and 
                        product['pack_format'] == row['detected_format']):
                        row['internal_product_code'] = product['product_code']
                        row['mapping_method'] = 'family_pack_fallback'
                        row['mapping_confidence'] = 0.85
                        matched = True
                        
                        # Insert new mapping
                        insert("""
                            INSERT INTO map_product_source_to_internal
                            (source_sku, internal_product_code, mapping_method, mapping_confidence)
                            VALUES (%s, %s, 'family_pack_fallback', 0.85)
                            ON CONFLICT (distributor, source_sku) DO UPDATE
                            SET internal_product_code = EXCLUDED.internal_product_code,
                                mapping_method = EXCLUDED.mapping_method,
                                mapping_confidence = EXCLUDED.mapping_confidence,
                                updated_at = NOW()
                        """, (source_sku, product['product_code']))
                        break
            
            if not matched:
                # Unmapped
                row['internal_product_code'] = None
                row['mapping_method'] = 'unmapped'
                row['mapping_confidence'] = 0.0
                
                # Insert unmapped record
                insert("""
                    INSERT INTO map_product_source_to_internal
                    (source_sku, internal_product_code, mapping_method, mapping_confidence)
                    VALUES (%s, NULL, 'unmapped', 0.0)
                    ON CONFLICT (distributor, source_sku) DO NOTHING
                """, (source_sku,))
    
    return transformed_rows
```

---

#### Step 5: Customer Deduplication
```python
def upsert_customers(transformed_rows):
    """
    Create or update customer records
    """
    unique_customers = {}
    for row in transformed_rows:
        del_account = row['del_account']
        if del_account not in unique_customers:
            unique_customers[del_account] = {
                'del_account': del_account,
                'customer_name': row['customer_name'],
                'delivery_address': row['delivery_address'],
                'delivery_city': row['delivery_city'],
                'delivery_postcode': row['delivery_postcode'],
                'first_seen': row['report_month'],
                'last_seen': row['report_month']
            }
    
    for customer in unique_customers.values():
        execute("""
            INSERT INTO dim_customer (del_account, customer_name, delivery_address, delivery_city, delivery_postcode, first_seen, last_seen)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (del_account) DO UPDATE
            SET last_seen = GREATEST(dim_customer.last_seen, EXCLUDED.last_seen),
                delivery_address = COALESCE(EXCLUDED.delivery_address, dim_customer.delivery_address),
                delivery_city = COALESCE(EXCLUDED.delivery_city, dim_customer.delivery_city),
                delivery_postcode = COALESCE(EXCLUDED.delivery_postcode, dim_customer.delivery_postcode),
                updated_at = NOW()
        """, (customer['del_account'], customer['customer_name'], customer['delivery_address'], 
              customer['delivery_city'], customer['delivery_postcode'], customer['first_seen'], customer['last_seen']))
```

---

#### Step 6: Insert Facts (Idempotent)
```python
def insert_fact_shipments(transformed_rows, import_run_id):
    """
    Bulk insert into fact_shipments with idempotency
    """
    inserted = 0
    skipped = 0
    
    for row in transformed_rows:
        result = execute("""
            INSERT INTO fact_shipments (
                line_key, report_month, del_account, customer_name, delivery_address, delivery_city, delivery_postcode,
                source_sku, source_description, duoi, internal_product_code, quantity, salesperson, distributor,
                detected_family, detected_format, detected_category, mapping_method, mapping_confidence, import_run_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (line_key) DO NOTHING
        """, (row['line_key'], row['report_month'], row['del_account'], row['customer_name'], 
              row['delivery_address'], row['delivery_city'], row['delivery_postcode'],
              row['source_sku'], row['source_description'], row['duoi'], row['internal_product_code'],
              row['quantity'], row['salesperson'], 'Inn Express',
              row['detected_family'], row['detected_format'], row['detected_category'],
              row['mapping_method'], row['mapping_confidence'], import_run_id))
        
        if result.rowcount > 0:
            inserted += 1
        else:
            skipped += 1
    
    return inserted, skipped
```

---

#### Step 7: Update Product Source Dimension
```python
def upsert_product_source(transformed_rows):
    """
    Update dim_product_source with new/updated SKUs
    """
    unique_skus = {}
    for row in transformed_rows:
        sku = row['source_sku']
        if sku not in unique_skus:
            unique_skus[sku] = {
                'source_sku': sku,
                'source_description': row['source_description'],
                'sample_duoi': row['duoi'],
                'detected_family': row['detected_family'],
                'detected_format': row['detected_format'],
                'first_seen': row['report_month'],
                'last_seen': row['report_month']
            }
    
    for sku_data in unique_skus.values():
        execute("""
            INSERT INTO dim_product_source (source_sku, source_description, sample_duoi, detected_family, detected_format, first_seen, last_seen, times_seen)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 1)
            ON CONFLICT (source_sku) DO UPDATE
            SET source_description = EXCLUDED.source_description,
                sample_duoi = EXCLUDED.sample_duoi,
                detected_family = EXCLUDED.detected_family,
                detected_format = EXCLUDED.detected_format,
                last_seen = GREATEST(dim_product_source.last_seen, EXCLUDED.last_seen),
                times_seen = dim_product_source.times_seen + 1,
                updated_at = NOW()
        """, (sku_data['source_sku'], sku_data['source_description'], sku_data['sample_duoi'],
              sku_data['detected_family'], sku_data['detected_format'], sku_data['first_seen'], sku_data['last_seen']))
```

---

#### Step 8: Post-Import Quality Checks
```python
def calculate_import_metrics(import_run_id, report_month):
    """
    Calculate mapping coverage and update import_runs
    """
    metrics = query_one("""
        SELECT
            COUNT(*) as lines_imported,
            COUNT(*) FILTER (WHERE internal_product_code IS NOT NULL) as lines_mapped,
            COUNT(*) FILTER (WHERE internal_product_code IS NULL) as lines_unmapped,
            SUM(quantity) FILTER (WHERE internal_product_code IS NOT NULL) as volume_mapped,
            SUM(quantity) FILTER (WHERE internal_product_code IS NULL) as volume_unmapped,
            COUNT(DISTINCT del_account) as total_customers,
            COUNT(DISTINCT source_sku) as total_skus
        FROM fact_shipments
        WHERE import_run_id = %s
    """, (import_run_id,))
    
    # Calculate coverage percentage
    total_volume = metrics['volume_mapped'] + metrics['volume_unmapped']
    coverage_pct = (metrics['volume_mapped'] / total_volume * 100) if total_volume > 0 else 0
    
    # Count new customers (first_seen = report_month)
    new_customers = query_one("""
        SELECT COUNT(*) as new_customers
        FROM dim_customer
        WHERE first_seen = %s
    """, (report_month,))['new_customers']
    
    # Update import_runs
    execute("""
        UPDATE import_runs
        SET lines_imported = %s,
            lines_mapped = %s,
            lines_unmapped = %s,
            volume_mapped = %s,
            volume_unmapped = %s,
            mapping_coverage_pct = %s,
            new_customers = %s,
            status = 'completed',
            completed_at = NOW()
        WHERE id = %s
    """, (metrics['lines_imported'], metrics['lines_mapped'], metrics['lines_unmapped'],
          metrics['volume_mapped'], metrics['volume_unmapped'], coverage_pct,
          new_customers, import_run_id))
    
    # Check coverage threshold
    if coverage_pct < 95:
        print(f"⚠️  Warning: Mapping coverage {coverage_pct:.2f}% is below 95% target")
    else:
        print(f"✅ Mapping coverage: {coverage_pct:.2f}%")
    
    return metrics, coverage_pct
```

---

#### Step 9: Generate Reports
```python
def generate_import_report(import_run_id):
    """
    Generate post-import report with unmapped SKUs
    """
    # Unmapped SKUs
    unmapped = query("""
        SELECT 
            s.source_sku,
            s.source_description,
            s.detected_family,
            s.detected_format,
            SUM(f.quantity) as volume
        FROM dim_product_source s
        LEFT JOIN map_product_source_to_internal m ON s.source_sku = m.source_sku
        LEFT JOIN fact_shipments f ON s.source_sku = f.source_sku AND f.import_run_id = %s
        WHERE m.internal_product_code IS NULL
        GROUP BY s.source_sku, s.source_description, s.detected_family, s.detected_format
        ORDER BY volume DESC
    """, (import_run_id,))
    
    if unmapped:
        print("\n📋 Unmapped SKUs Report:")
        print(f"{'SKU':<20} {'Description':<50} {'Family':<15} {'Format':<20} {'Volume':<10}")
        print("-" * 115)
        for row in unmapped:
            print(f"{row['source_sku']:<20} {row['source_description'][:50]:<50} {row['detected_family'] or 'N/A':<15} {row['detected_format'] or 'N/A':<20} {row['volume']:<10}")
    
    return unmapped
```

---

### Complete Import Script (Main)
```python
def run_import(file_path, report_month):
    """
    Main import orchestration
    """
    print(f"Starting import for {report_month}...")
    
    # Step 1: Pre-Import Validation
    import_run_id = pre_import_validation(file_path, report_month)
    
    try:
        # Step 2: Parse Source File
        df = parse_inn_express_file(file_path)
        print(f"✅ Parsed {len(df)} rows from {file_path}")
        
        # Step 3: Transform & Detect
        transformed_rows = transform_and_detect(df, report_month)
        print(f"✅ Transformed {len(transformed_rows)} rows")
        
        # Step 4: Product Matching
        transformed_rows = match_products(transformed_rows)
        print(f"✅ Product matching complete")
        
        # Step 5: Customer Deduplication
        upsert_customers(transformed_rows)
        print(f"✅ Customer records updated")
        
        # Step 6: Insert Facts
        inserted, skipped = insert_fact_shipments(transformed_rows, import_run_id)
        print(f"✅ Inserted {inserted} new rows, skipped {skipped} duplicates")
        
        # Step 7: Update Product Source
        upsert_product_source(transformed_rows)
        print(f"✅ Product source dimension updated")
        
        # Step 8: Quality Checks
        metrics, coverage_pct = calculate_import_metrics(import_run_id, report_month)
        print(f"✅ Mapping coverage: {coverage_pct:.2f}%")
        
        # Step 9: Generate Reports
        unmapped = generate_import_report(import_run_id)
        
        print(f"\n🎉 Import complete!")
        print(f"   Lines imported: {inserted}")
        print(f"   Lines skipped (duplicates): {skipped}")
        print(f"   Mapping coverage: {coverage_pct:.2f}%")
        print(f"   New customers: {metrics.get('new_customers', 0)}")
        
        return import_run_id, metrics, unmapped
    
    except Exception as e:
        # Mark import as failed
        execute("""
            UPDATE import_runs
            SET status = 'failed',
                error_message = %s,
                completed_at = NOW()
            WHERE id = %s
        """, (str(e), import_run_id))
        raise
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Tasks**:
1. ✅ Create GitHub repository
2. ✅ Set up Supabase project
3. ✅ Configure MCP connection in anti-gravity
4. ✅ Run DDL scripts (create all tables)
5. ✅ Seed `dim_product_internal` (28 products from Airtable)
6. ✅ Seed `map_product_source_to_internal` (existing mappings)

**Deliverables**:
- Supabase project with all tables created
- Seed data loaded
- Database reachable via MCP

---

### Phase 2: Import Pipeline (Week 2)

**Tasks**:
1. Build import script (`tools/import_inn_express.py`)
2. Implement detection logic (family, format, category)
3. Implement two-tier product matching
4. Test with one month of data
5. Validate mapping coverage ≥95%
6. Generate unmapped SKU report

**Deliverables**:
- Working import script
- Import report showing coverage
- Unmapped SKU list for review

---

### Phase 3: Dashboard UI (Week 3-4)

**Tasks**:
1. Set up Next.js project
2. Implement authentication (Supabase Auth)
3. Build KPI tiles (6 tiles)
4. Build volume trend chart
5. Build top customers/SKUs tables
6. Implement filters (left rail)
7. Build insights panels (new, at-risk, gaps)
8. Implement export functionality

**Deliverables**:
- Functional web dashboard
- All 6 KPIs working
- Filters and drill-downs operational
- CSV export working

---

### Phase 4: Testing & Refinement (Week 5)

**Tasks**:
1. User testing with telesales/marketing teams
2. Fix bugs and UX issues
3. Performance optimization
4. Documentation (user guide)
5. Training sessions

**Deliverables**:
- Production-ready dashboard
- User documentation
- Training materials

---

### Phase 5: Historical Data (Week 6)

**Tasks**:
1. Import 9 months of historical data
2. Validate data quality
3. Backfill any missing mappings
4. Performance testing with full dataset

**Deliverables**:
- Full 9-month history loaded
- All metrics working with historical data

---

## Files to Create/Update

### Repository Structure
```
dunkerton-sales-dashboard/
├── README.md
├── .gitignore
├── .env.example
├── architecture/
│   ├── data_model.md (✅ CREATED)
│   └── dashboard_spec.md (✅ CREATED)
├── database/
│   ├── migrations/
│   │   ├── 001_create_core_tables.sql
│   │   ├── 002_create_views.sql
│   │   └── 003_seed_products.sql
│   └── seed_data/
│       ├── products.csv (export from Airtable)
│       └── product_mappings.csv (export from Airtable)
├── tools/
│   ├── import_inn_express.py (main import script)
│   ├── detection.py (family/format/category detection logic)
│   └── utils.py (database helpers)
├── dashboard/
│   ├── app/ (Next.js app)
│   ├── components/ (React components)
│   ├── lib/ (utilities, Supabase client)
│   └── public/ (assets)
└── docs/
    ├── user_guide.md
    └── api_reference.md
```

---

### File: `database/migrations/001_create_core_tables.sql`
**Content**: Copy all CREATE TABLE statements from data model spec above

---

### File: `database/migrations/002_create_views.sql`
**Content**: Copy all CREATE VIEW statements from data model spec above

---

### File: `database/seed_data/products.csv`
**Source**: Export from Airtable Products table  
**Required Columns**: 
```
product_code,product_name,brand_family,pack_format,duoi,category,is_active
FPCRAFT50,Dunkertons CRAFT Cider 5% Bottles,Craft,Bottle 500ml,500ml x 12,bottle500,true
FPDRY50,Dunkertons Dry Organic Cider 500ml,Premium,Bottle 500ml,500ml x 12,bottle500,true
...
```

---

### File: `database/seed_data/product_mappings.csv`
**Source**: Export from Airtable Products table (where Inn_Express_Name IS NOT NULL)  
**Required Columns**:
```
distributor,source_sku,internal_product_code,mapping_method,mapping_confidence,mapping_note
Inn Express,PDDRYSPARK,FPDRY50,manual_override,1.00,Seeded from Airtable
Inn Express,PDCRAFTSP,FPCRAFT50,manual_override,1.00,Seeded from Airtable
...
```

---

### File: `tools/import_inn_express.py`
**Content**: Complete import script (see Import Process Logic section above)

---

### File: `.env.example`
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

---

### File: `README.md`
```markdown
# Dunkerton Sales Dashboard

Volume-led sales analytics and customer segmentation for Dunkerton Cider.

## Tech Stack
- **Database**: Supabase Postgres
- **Import Pipeline**: Python (Claude Code)
- **Dashboard**: Next.js + React + Tailwind + shadcn/ui
- **Charts**: Recharts

## Quick Start

### 1. Database Setup
```bash
# Run migrations
psql -h your-project.supabase.co -U postgres -d postgres -f database/migrations/001_create_core_tables.sql
psql -h your-project.supabase.co -U postgres -d postgres -f database/migrations/002_create_views.sql

# Seed data
python tools/seed_products.py
```

### 2. Import Data
```bash
python tools/import_inn_express.py --file data/inn_express_2024_07.xlsx --month 2024-07-01
```

### 3. Run Dashboard
```bash
cd dashboard
npm install
npm run dev
```

## Documentation
- [Data Model](architecture/data_model.md)
- [Dashboard Spec](architecture/dashboard_spec.md)
- [User Guide](docs/user_guide.md)
```

---

## Critical Success Factors

### Must-Haves for MVP
1. ✅ Idempotent imports (safe to re-run)
2. ✅ ≥95% mapping coverage by volume
3. ✅ All 6 KPIs functional
4. ✅ Customer and product drill-downs working
5. ✅ Export to CSV working

### Quality Metrics
- Import time: <5 minutes for ~2,000 rows
- Dashboard load time: <2 seconds
- Mapping coverage: ≥95% of volume
- Data freshness: Updated monthly within 48 hours of report arrival

---

## Next Immediate Steps for Coding Agent

### Step 1: Supabase Setup
1. Create Supabase project at https://supabase.com
2. Get project URL and anon key
3. Configure MCP connection in anti-gravity
4. Test connectivity

### Step 2: Run DDL
1. Copy CREATE TABLE statements from this document
2. Execute in Supabase SQL editor
3. Verify all tables created
4. Run CREATE VIEW statements

### Step 3: Seed Data
1. Export 28 products from Airtable to CSV
2. Format as per `products.csv` spec
3. Load into `dim_product_internal`
4. Extract Inn_Express_Name mappings
5. Load into `map_product_source_to_internal`

### Step 4: Build Import Script
1. Create `tools/import_inn_express.py`
2. Implement all functions from Import Process Logic section
3. Test with one month of data
4. Verify mapping coverage

### Step 5: Build Dashboard
1. Initialize Next.js project
2. Set up Tailwind + shadcn/ui
3. Implement layout (header, left rail, main area)
4. Build KPI tiles
5. Wire up filters
6. Build charts and tables

---

## Questions for Will (Before Starting)

1. **Supabase Project**: Do you already have a Supabase project, or should the coding agent create one?

2. **Airtable Export**: Can you export the 28 products from Airtable and provide as CSV? Or should the coding agent access Airtable directly?

3. **Test Data**: Do you have one month of Inn Express data ready for testing, or should the coding agent use dummy data first?

4. **Customer Deduplication**: Does Inn Express provide a consistent Account ID, or should we use the name+postcode fallback?

5. **Deployment**: Where will the dashboard be hosted? (Vercel, Netlify, self-hosted?)

---

**End of Master Handoff Document**

This document contains everything needed to build the Dunkerton Sales Dashboard from scratch. All specifications, code logic, and implementation steps are included. The coding agent should have no ambiguity on what to build or how to build it.
