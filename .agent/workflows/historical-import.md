---
description: Import historical Inn Express data in batches
---

# Historical Data Import Workflow

This workflow guides you through importing historical sales data (2024-2025) in batches to ensure data quality and catch issues early.

## Prerequisites

1. Historical data files available in `data/raw/` directory
2. Supabase database configured with all migrations applied
3. Python environment set up: `pip install -r requirements.txt`
4. `.env` file configured with Supabase credentials

## Batch Import Strategy

Import data **one month at a time** in chronological order, validating each batch before proceeding.

### Month Order (Recommended)
1. January 2024
2. February 2024
3. March 2024
... continue through December 2025

## Step-by-Step Process

### Step 1: Prepare First Batch

```bash
# List available data files
ls -lh data/raw/

# Identify the earliest month file
# Example: InnExpress_Jan2024.xlsx
```

### Step 2: Dry Run (No Database Changes)

// turbo
```bash
python tools/import_inn_express.py \
  --file data/raw/InnExpress_Jan2024.xlsx \
  --month 2024-01-01 \
  --dry-run
```

**Review the output for:**
- Total lines read
- Detected brand families and formats
- Any parsing errors
- Expected mapping coverage

### Step 3: Import First Month

// turbo
```bash
python tools/import_inn_express.py \
  --file data/raw/InnExpress_Jan2024.xlsx \
  --month 2024-01-01
```

### Step 4: Validate Import

Check the import run results:

```sql
-- Get latest import run
SELECT * FROM import_runs 
ORDER BY started_at DESC 
LIMIT 1;

-- Check mapping coverage (should be >= 95%)
SELECT 
  report_month,
  mapping_coverage_pct,
  total_units,
  mapped_units
FROM v_monthly_summary 
WHERE report_month = '2024-01-01';

-- Review unmapped SKUs (if coverage < 95%)
SELECT * FROM v_unmapped_skus 
ORDER BY total_volume_unmapped DESC 
LIMIT 20;
```

### Step 5: Fix Unmapped SKUs (If Needed)

If mapping coverage is below 95%:

1. Review unmapped SKUs from query above
2. Add manual mappings:

```sql
-- Example: Map a new SKU
INSERT INTO map_product_source_to_internal
(distributor, source_sku, internal_product_code, mapping_method, mapping_confidence, mapping_note)
VALUES 
('Inn Express', 'NEWSKU123', 'FPCRAFT50', 'manual_override', 1.00, 'Added during historical import');
```

3. Re-run the import (safe due to idempotency):

```bash
python tools/import_inn_express.py \
  --file data/raw/InnExpress_Jan2024.xlsx \
  --month 2024-01-01
```

### Step 6: Verify Dashboard

1. Open dashboard: http://localhost:3000
2. Select the imported month from filter
3. Verify:
   - Total units matches expectation
   - Top customers appear correctly
   - Brand family breakdown looks reasonable
   - No obvious data anomalies

### Step 7: Repeat for Next Month

Once validated, proceed to next month:

```bash
python tools/import_inn_express.py \
  --file data/raw/InnExpress_Feb2024.xlsx \
  --month 2024-02-01
```

## Troubleshooting

### Import Fails

1. Check error in `import_runs` table
2. Common issues:
   - File format changed (column names different)
   - Invalid date format
   - Missing required columns

### Low Mapping Coverage

1. Run unmapped SKUs query
2. Check if detection logic needs updating in `tools/detection.py`
3. Add manual mappings for high-volume unmapped SKUs

### Duplicate Data

- Safe to re-run imports - `line_key` prevents duplicates
- To start fresh for a month:

```sql
DELETE FROM fact_shipments WHERE report_month = '2024-01-01';
DELETE FROM import_runs WHERE report_month = '2024-01-01';
```

## Batch Checklist

For each month:
- [ ] Dry run completed successfully
- [ ] Import completed successfully
- [ ] Mapping coverage >= 95%
- [ ] Dashboard shows reasonable data
- [ ] No errors in import_runs table
- [ ] Customer count increased appropriately

## Automation (After Manual Validation)

Once you've successfully imported 2-3 months and validated the process, you can batch import remaining months:

```bash
# Example: Import multiple months
for month in 2024-03-01 2024-04-01 2024-05-01; do
  python tools/import_inn_express.py \
    --file data/raw/InnExpress_${month}.xlsx \
    --month ${month}
  
  # Brief pause between imports
  sleep 2
done
```

**Note:** Only use automation after you're confident the process is working correctly!
