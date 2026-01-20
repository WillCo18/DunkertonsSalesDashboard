---
name: supabase-db
description: Manages the Supabase Postgres database for the Dunkerton Sales Dashboard. Use for schema changes, migrations, seeding data, and database queries.
---

# Supabase Database Skill

## Goal
Maintain and query the Supabase Postgres database that powers the Dunkerton Sales Dashboard.

## When to use
Use this skill when the user asks to:
- Run database migrations
- Query or modify data
- Create new views or indexes
- Seed or update product data
- Debug database issues

## Database Setup

### Migrations
Located in `database/migrations/`:
- `001_create_core_tables.sql` - 6 core tables
- `002_create_views.sql` - 8 analytical views
- `003_seed_products.sql` - Product and mapping seed data

### Running Migrations
Via Supabase SQL Editor or psql:
```bash
psql -h db.your-project.supabase.co -U postgres -d postgres -f database/migrations/001_create_core_tables.sql
```

Or via Supabase MCP if configured.

## Schema Overview

### Fact Table
**`fact_shipments`** - Line-level distribution transactions
- Primary key: `line_key` (MD5 hash for idempotency)
- Grain: One row per product per customer per month
- Key columns: `report_month`, `del_account`, `source_sku`, `internal_product_code`, `quantity`

### Dimension Tables
**`dim_customer`** - Customer master
- Primary key: `del_account`
- Tracks `first_seen`, `last_seen` dates

**`dim_product_internal`** - Dunkerton SKU catalog (28 products)
- Primary key: `product_code`
- Critical fields: `brand_family`, `pack_format`

**`dim_product_source`** - Inn Express SKU catalog
- Primary key: `source_sku`
- Auto-populated during imports

### Mapping Table
**`map_product_source_to_internal`** - SKU mapping bridge
- Composite key: `(distributor, source_sku)`
- Maps source SKUs to internal product codes
- Tracks mapping method and confidence

### Audit Table
**`import_runs`** - Import tracking
- Tracks each import's metrics and status
- Key metrics: `mapping_coverage_pct`, `lines_imported`

## Views Reference

| View | Purpose |
|------|---------|
| `v_monthly_summary` | KPIs per month |
| `v_new_customers` | First-time customers |
| `v_at_risk_customers` | Customers not ordering recently |
| `v_top_customers` | Customer volume rankings |
| `v_top_products` | Product volume rankings |
| `v_unmapped_skus` | SKUs needing mapping |
| `v_gap_analysis_format` | Format variety opportunities |
| `v_gap_analysis_brand` | Brand variety opportunities |
| `v_brand_family_trend` | Volume by brand over time |
| `v_customer_monthly_detail` | Customer drill-down |
| `v_salesperson_performance` | Sales rep metrics |

## Common Queries

### Check data health
```sql
-- Overall stats
SELECT
  COUNT(*) as total_shipments,
  COUNT(DISTINCT del_account) as customers,
  COUNT(DISTINCT internal_product_code) as mapped_products,
  SUM(quantity) as total_units
FROM fact_shipments;

-- Monthly breakdown
SELECT * FROM v_monthly_summary ORDER BY report_month DESC;
```

### Product mapping
```sql
-- Check mapping coverage
SELECT
  mapping_method,
  COUNT(*) as count,
  ROUND(AVG(mapping_confidence), 2) as avg_confidence
FROM map_product_source_to_internal
GROUP BY mapping_method;

-- Find unmapped SKUs
SELECT * FROM v_unmapped_skus ORDER BY total_volume_unmapped DESC LIMIT 20;

-- Add manual mapping
INSERT INTO map_product_source_to_internal
(distributor, source_sku, internal_product_code, mapping_method, mapping_confidence, mapping_note)
VALUES ('Inn Express', 'NEWSKU', 'FPCRAFT50', 'manual_override', 1.00, 'Added manually');
```

### Customer analysis
```sql
-- New customers this month
SELECT * FROM v_new_customers
WHERE first_order_month = '2024-07-01'
ORDER BY first_month_units DESC;

-- At-risk customers
SELECT * FROM v_at_risk_customers
ORDER BY total_units_all_time DESC LIMIT 20;
```

## Seed Data

### Products CSV
Location: `data/seed/products.csv`
Columns: `product_code, product_name, brand_family, pack_format, duoi, category, is_active`

### Mappings CSV
Location: `data/seed/product_mappings.csv`
Columns: `distributor, source_sku, internal_product_code, mapping_method, mapping_confidence, mapping_note`

### Loading seed data
```sql
-- Load from SQL file
\i database/migrations/003_seed_products.sql

-- Or COPY from CSV (requires superuser)
COPY dim_product_internal FROM '/path/to/products.csv' CSV HEADER;
```

## Environment Variables

Required in `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

## Troubleshooting

### Connection issues
- Verify SUPABASE_URL and keys in `.env`
- Check project is active in Supabase dashboard
- Verify IP allowlist if using direct connection

### Migration errors
- Run migrations in order (001, 002, 003)
- Check for existing objects before CREATE
- Use `IF NOT EXISTS` for idempotent DDL

### Data quality issues
- Check `import_runs` for failed imports
- Review constraint violations in error messages
- Verify source data format matches expectations
