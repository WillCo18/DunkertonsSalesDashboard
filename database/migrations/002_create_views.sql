-- Dunkerton Sales Dashboard - Views Migration
-- Version: 1.0
-- Description: Creates 8 analytical views for dashboard and reporting

-- ============================================================================
-- View: v_monthly_summary
-- Purpose: High-level KPIs per month
-- ============================================================================
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
  report_month,
  COUNT(DISTINCT del_account) AS active_customers,
  COUNT(DISTINCT source_sku) AS unique_skus,
  COUNT(DISTINCT internal_product_code) AS unique_internal_products,
  SUM(quantity) AS total_units,
  SUM(CASE WHEN internal_product_code IS NOT NULL THEN quantity ELSE 0 END) AS mapped_units,
  ROUND(
    100.0 * SUM(CASE WHEN internal_product_code IS NOT NULL THEN quantity ELSE 0 END)
    / NULLIF(SUM(quantity), 0),
    2
  ) AS mapping_coverage_pct
FROM fact_shipments
GROUP BY report_month
ORDER BY report_month DESC;

-- ============================================================================
-- View: v_new_customers
-- Purpose: Customers who first appeared in each month
-- ============================================================================
CREATE OR REPLACE VIEW v_new_customers AS
SELECT
  c.del_account,
  c.customer_name,
  c.delivery_city,
  c.delivery_postcode,
  c.first_seen AS first_order_month,
  COALESCE(SUM(f.quantity), 0) AS first_month_units
FROM dim_customer c
LEFT JOIN fact_shipments f
  ON c.del_account = f.del_account
  AND c.first_seen = f.report_month
GROUP BY c.del_account, c.customer_name, c.delivery_city, c.delivery_postcode, c.first_seen
ORDER BY c.first_seen DESC;

-- ============================================================================
-- View: v_at_risk_customers
-- Purpose: Customers who bought in recent 3 months but not most recent
-- ============================================================================
CREATE OR REPLACE VIEW v_at_risk_customers AS
WITH recent_month AS (
  SELECT MAX(report_month) AS max_month FROM fact_shipments
),
customer_last_order AS (
  SELECT
    del_account,
    MAX(report_month) AS last_order_month,
    SUM(quantity) AS total_units_all_time
  FROM fact_shipments
  GROUP BY del_account
)
SELECT
  c.del_account,
  c.customer_name,
  c.delivery_city,
  c.delivery_postcode,
  clo.last_order_month,
  rm.max_month AS current_month,
  EXTRACT(MONTH FROM AGE(rm.max_month, clo.last_order_month))::INTEGER AS months_since_last_order,
  clo.total_units_all_time
FROM dim_customer c
JOIN customer_last_order clo ON c.del_account = clo.del_account
CROSS JOIN recent_month rm
WHERE clo.last_order_month < rm.max_month  -- Did NOT buy most recent month
  AND clo.last_order_month >= rm.max_month - INTERVAL '3 months'  -- But DID buy within last 3 months
ORDER BY months_since_last_order DESC, clo.total_units_all_time DESC;

-- ============================================================================
-- View: v_top_customers
-- Purpose: Customer volume rankings (all time)
-- ============================================================================
CREATE OR REPLACE VIEW v_top_customers AS
SELECT
  c.del_account,
  c.customer_name,
  c.delivery_city,
  c.delivery_postcode,
  COUNT(DISTINCT f.report_month) AS months_active,
  SUM(f.quantity) AS total_units,
  ROUND(AVG(f.quantity), 2) AS avg_units_per_order,
  MAX(f.report_month) AS last_order_month,
  MIN(f.report_month) AS first_order_month
FROM dim_customer c
JOIN fact_shipments f ON c.del_account = f.del_account
GROUP BY c.del_account, c.customer_name, c.delivery_city, c.delivery_postcode
ORDER BY total_units DESC;

-- ============================================================================
-- View: v_top_products
-- Purpose: Product volume rankings
-- ============================================================================
CREATE OR REPLACE VIEW v_top_products AS
SELECT
  p.product_code,
  p.product_name,
  p.brand_family,
  p.pack_format,
  p.category,
  COUNT(DISTINCT f.del_account) AS customer_count,
  COUNT(DISTINCT f.report_month) AS months_with_sales,
  SUM(f.quantity) AS total_units
FROM dim_product_internal p
JOIN fact_shipments f ON p.product_code = f.internal_product_code
GROUP BY p.product_code, p.product_name, p.brand_family, p.pack_format, p.category
ORDER BY total_units DESC;

-- ============================================================================
-- View: v_unmapped_skus
-- Purpose: Source SKUs not yet mapped (for review)
-- ============================================================================
CREATE OR REPLACE VIEW v_unmapped_skus AS
SELECT
  s.source_sku,
  s.source_description,
  s.detected_family,
  s.detected_format,
  s.times_seen,
  s.first_seen,
  s.last_seen,
  COALESCE(SUM(f.quantity), 0) AS total_volume_unmapped
FROM dim_product_source s
LEFT JOIN map_product_source_to_internal m
  ON s.source_sku = m.source_sku AND m.distributor = s.distributor
LEFT JOIN fact_shipments f
  ON s.source_sku = f.source_sku AND f.internal_product_code IS NULL
WHERE m.internal_product_code IS NULL OR m.source_sku IS NULL
GROUP BY s.source_sku, s.source_description, s.detected_family, s.detected_format, s.times_seen, s.first_seen, s.last_seen
ORDER BY total_volume_unmapped DESC NULLS LAST;

-- ============================================================================
-- View: v_gap_analysis_format
-- Purpose: Customers with low format variety (buying fewer than 3 formats)
-- ============================================================================
CREATE OR REPLACE VIEW v_gap_analysis_format AS
WITH customer_formats AS (
  SELECT
    f.del_account,
    c.customer_name,
    c.delivery_city,
    p.pack_format,
    SUM(f.quantity) AS units
  FROM fact_shipments f
  JOIN dim_customer c ON f.del_account = c.del_account
  JOIN dim_product_internal p ON f.internal_product_code = p.product_code
  WHERE f.internal_product_code IS NOT NULL
  GROUP BY f.del_account, c.customer_name, c.delivery_city, p.pack_format
),
format_counts AS (
  SELECT
    del_account,
    customer_name,
    delivery_city,
    COUNT(DISTINCT pack_format) AS formats_purchased,
    SUM(units) AS total_units
  FROM customer_formats
  GROUP BY del_account, customer_name, delivery_city
),
all_formats AS (
  SELECT DISTINCT pack_format FROM dim_product_internal WHERE is_active = TRUE
)
SELECT
  fc.del_account,
  fc.customer_name,
  fc.delivery_city,
  fc.formats_purchased,
  fc.total_units,
  STRING_AGG(DISTINCT cf.pack_format, ', ' ORDER BY cf.pack_format) AS formats_bought,
  STRING_AGG(DISTINCT af.pack_format, ', ' ORDER BY af.pack_format) FILTER (
    WHERE af.pack_format NOT IN (SELECT pack_format FROM customer_formats WHERE del_account = fc.del_account)
  ) AS formats_missing
FROM format_counts fc
JOIN customer_formats cf ON fc.del_account = cf.del_account
CROSS JOIN all_formats af
WHERE fc.formats_purchased < 3
GROUP BY fc.del_account, fc.customer_name, fc.delivery_city, fc.formats_purchased, fc.total_units
ORDER BY fc.total_units DESC;

-- ============================================================================
-- View: v_gap_analysis_brand
-- Purpose: Customers with low brand variety (buying only 1 brand family)
-- ============================================================================
CREATE OR REPLACE VIEW v_gap_analysis_brand AS
WITH customer_brands AS (
  SELECT
    f.del_account,
    c.customer_name,
    c.delivery_city,
    p.brand_family,
    SUM(f.quantity) AS units
  FROM fact_shipments f
  JOIN dim_customer c ON f.del_account = c.del_account
  JOIN dim_product_internal p ON f.internal_product_code = p.product_code
  WHERE f.internal_product_code IS NOT NULL
  GROUP BY f.del_account, c.customer_name, c.delivery_city, p.brand_family
),
brand_counts AS (
  SELECT
    del_account,
    customer_name,
    delivery_city,
    COUNT(DISTINCT brand_family) AS brands_purchased,
    SUM(units) AS total_units
  FROM customer_brands
  GROUP BY del_account, customer_name, delivery_city
),
all_brands AS (
  SELECT DISTINCT brand_family FROM dim_product_internal WHERE is_active = TRUE
)
SELECT
  bc.del_account,
  bc.customer_name,
  bc.delivery_city,
  bc.brands_purchased,
  bc.total_units,
  STRING_AGG(DISTINCT cb.brand_family, ', ' ORDER BY cb.brand_family) AS brands_bought,
  STRING_AGG(DISTINCT ab.brand_family, ', ' ORDER BY ab.brand_family) FILTER (
    WHERE ab.brand_family NOT IN (SELECT brand_family FROM customer_brands WHERE del_account = bc.del_account)
  ) AS brands_missing
FROM brand_counts bc
JOIN customer_brands cb ON bc.del_account = cb.del_account
CROSS JOIN all_brands ab
WHERE bc.brands_purchased < 2
GROUP BY bc.del_account, bc.customer_name, bc.delivery_city, bc.brands_purchased, bc.total_units
ORDER BY bc.total_units DESC;

-- ============================================================================
-- View: v_customer_monthly_detail
-- Purpose: Monthly breakdown per customer (for drill-down)
-- ============================================================================
CREATE OR REPLACE VIEW v_customer_monthly_detail AS
SELECT
  f.report_month,
  f.del_account,
  c.customer_name,
  c.delivery_city,
  c.delivery_postcode,
  COUNT(DISTINCT f.internal_product_code) AS products_ordered,
  COUNT(DISTINCT p.brand_family) AS brand_families,
  SUM(f.quantity) AS total_units,
  f.salesperson
FROM fact_shipments f
JOIN dim_customer c ON f.del_account = c.del_account
LEFT JOIN dim_product_internal p ON f.internal_product_code = p.product_code
GROUP BY f.report_month, f.del_account, c.customer_name, c.delivery_city, c.delivery_postcode, f.salesperson
ORDER BY f.report_month DESC, total_units DESC;

-- ============================================================================
-- View: v_brand_family_trend
-- Purpose: Monthly volume by brand family (for trend chart)
-- ============================================================================
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

-- ============================================================================
-- View: v_salesperson_performance
-- Purpose: Sales performance by salesperson
-- ============================================================================
CREATE OR REPLACE VIEW v_salesperson_performance AS
SELECT
  f.salesperson,
  f.report_month,
  COUNT(DISTINCT f.del_account) AS customers_served,
  COUNT(DISTINCT f.internal_product_code) AS products_sold,
  SUM(f.quantity) AS total_units
FROM fact_shipments f
WHERE f.salesperson IS NOT NULL
GROUP BY f.salesperson, f.report_month
ORDER BY f.report_month DESC, total_units DESC;
