---
name: data-import
description: Guides the import of Inn Express distribution data into Supabase. Use when importing monthly sales data, debugging import issues, or managing product mappings.
---

# Data Import Skill

## Goal
Successfully import Inn Express distribution data into the Supabase database with high mapping coverage and data quality.

## When to use
Use this skill when the user asks to:
- Import a new month's Inn Express data
- Debug import errors or low mapping coverage
- Add new product mappings
- Review unmapped SKUs
- Check import run history

## Import Pipeline Overview

### File Location
- Import script: `tools/import_inn_express.py`
- Configuration: `tools/config.py`
- Detection logic: `tools/detection.py`
- Database helpers: `tools/db.py`

### Prerequisites
1. Supabase project configured with migrations applied
2. `.env` file with Supabase credentials
3. Python dependencies installed: `pip install -r requirements.txt`

### Running an Import

```bash
# Basic import
python tools/import_inn_express.py --file data/raw/filename.xlsx --month 2024-07-01

# Dry run (parse only, no database writes)
python tools/import_inn_express.py --file data/raw/filename.xlsx --month 2024-07-01 --dry-run
```

### Import Process
1. **Parse**: Read Excel file, identify headers, filter summary rows
2. **Transform**: Standardize fields, generate line_key for idempotency
3. **Detect**: Extract brand family, pack format, category from descriptions
4. **Match Products**:
   - Tier 1: SKU code match from `map_product_source_to_internal`
   - Tier 2: Family + Pack fallback match
5. **Upsert Customers**: Create or update `dim_customer`
6. **Insert Facts**: Add to `fact_shipments` (idempotent via line_key)
7. **Calculate Metrics**: Update `import_runs` with coverage stats

### Target Metrics
- Mapping coverage: >= 95% by volume
- No duplicate records (idempotent)
- All customers deduplicated

## Troubleshooting

### Low Mapping Coverage
1. Run `SELECT * FROM v_unmapped_skus ORDER BY total_volume_unmapped DESC` to find unmapped SKUs
2. Check if detection is working: review `detected_family` and `detected_format`
3. Add manual mappings to `map_product_source_to_internal`:
   ```sql
   INSERT INTO map_product_source_to_internal
   (distributor, source_sku, internal_product_code, mapping_method, mapping_confidence)
   VALUES ('Inn Express', 'NEWSKU123', 'FPCRAFT50', 'manual_override', 1.00);
   ```

### Import Failed
1. Check `import_runs` table for error message:
   ```sql
   SELECT * FROM import_runs WHERE status = 'failed' ORDER BY started_at DESC;
   ```
2. Common issues:
   - File format changed (column names)
   - Missing required columns
   - Invalid date format

### Duplicate Data
- Re-running an import is safe - `line_key` prevents duplicates
- To force re-import, delete existing records:
  ```sql
  DELETE FROM fact_shipments WHERE report_month = '2024-07-01';
  ```

## Database Tables Reference

| Table | Purpose |
|-------|---------|
| `fact_shipments` | Line-level transactions |
| `dim_customer` | Customer master |
| `dim_product_internal` | Dunkerton SKU catalog |
| `dim_product_source` | Inn Express SKU catalog |
| `map_product_source_to_internal` | SKU mapping bridge |
| `import_runs` | Import audit trail |

## Quality Checks

After import, verify:
```sql
-- Check mapping coverage
SELECT * FROM v_monthly_summary WHERE report_month = '2024-07-01';

-- List unmapped SKUs
SELECT * FROM v_unmapped_skus LIMIT 20;

-- Verify customer count
SELECT COUNT(*) FROM dim_customer;

-- Check import run
SELECT * FROM import_runs ORDER BY started_at DESC LIMIT 1;
```
