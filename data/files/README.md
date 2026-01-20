# Seed Data Files - Summary & Important Notes

## Files Created ✅

### 1. `data/seed/products.csv`
**Status**: ✅ Complete (26 products)  
**Source**: Airtable Products table (appJ3TPxzP1CHBkuh / tbl6JNny0e0jDXKBu)  

**What I did**:
- Extracted all 28 products from Airtable
- Normalized `Pack Format` to match new schema:
  - "Bottle" → "Bottle 500ml" or "Bottle 660ml" (based on DUOI)
  - "BiB" → "BIB 20L", "BIB 10L", or "BIB 3L" (based on DUOI)
  - "Can" → "Can 330ml" or "Mini Keg 5L"
  - "Keg" → "Keg 50L"
- Derived `category` codes:
  - bottle500, bottle660, can330, bib20, bib10, bib3, keg50, minikeg5, giftbox
- Set all products to `is_active = true`

**Missing from Airtable** (handled):
- 2 products without Product Code (excluded from seed data)
- Some products missing `Family` field (used Product Name to infer)

---

### 2. `data/seed/product_mappings.csv`
**Status**: ⚠️  Complete but with DATA QUALITY ISSUES (see below)  
**Source**: Airtable Products table (Inn_Express_Name field)  

**What I did**:
- Extracted 10 products where Inn_Express_Name is populated
- Created mappings with:
  - `mapping_method = manual_override`
  - `mapping_confidence = 1.00`
  - Added notes about duplicates

---

### 3. `data/raw/README.md`
**Status**: ✅ Complete  
**Purpose**: Instructions for what Inn Express test file is needed  

**What you need to do**:
- Obtain one month of Inn Express data (Excel format)
- Place in `data/raw/` directory
- File should have columns: Customer Name, Delivery Address, City, Postcode, SKU, Product Description, DUOI, Quantity, Salesperson

---

## ⚠️  CRITICAL DATA QUALITY ISSUES FOUND

### Issue 1: Duplicate Inn_Express_Name Codes

The following Inn Express SKU codes are mapped to **multiple** Dunkerton products:

#### `PDBR500` maps to 3 different products:
1. **FPBRO50** - Dunkertons BROWNS CIDER Bottles
2. **FPBF050** - Dunkertons BLACK FOX CIDER Bottles 7%
3. **FPBFCAN33** - Dunkertons BLACK FOX Cider 7% Cans

#### `PDDRYSPARK` maps to 2 different products:
1. **FPCRAFT50** - Dunkertons CRAFT Cider 5% Bottles
2. **FPDRY50** - Dunkertons DRY SPARKLING cider bottles 7%

**Impact on Import**:
- When the import script sees `PDBR500`, it will match to **FPBRO50** (first in the mappings CSV)
- When it sees `PDDRYSPARK`, it will match to **FPCRAFT50**
- The other products (FPBF050, FPBFCAN33, FPDRY50) will NOT be matched by SKU code
- They may still match via the family+pack fallback, but with lower confidence (0.85 vs 1.00)

**Recommended Actions**:

**Option A: Fix in Airtable** (recommended)
1. Review your Airtable Products table
2. Contact Inn Express to confirm the correct SKU codes
3. Update the `Inn_Express_Name` field with unique codes
4. Re-export the mappings CSV

**Option B: Accept and Monitor** (quick fix)
1. Accept that some products will match via family+pack fallback
2. After first import, review the unmapped SKUs report
3. Manually update mappings in Postgres if needed

**Option C: Update Seed Data Manually**
1. If you know the correct Inn Express codes, edit `product_mappings.csv` now
2. Remove duplicate entries
3. Add correct unique codes

---

## Validation Checklist

Before running the import script, verify:

### Products CSV (`data/seed/products.csv`)
- [ ] All 26 products have `product_code` populated
- [ ] All products have `brand_family` (required for gap analysis)
- [ ] All products have `pack_format` (required for gap analysis)
- [ ] Pack formats match expected values:
  - Bottle 500ml, Bottle 660ml
  - Can 330ml
  - Keg 50L, Mini Keg 5L
  - BIB 20L, BIB 10L, BIB 3L
  - Gift Box
- [ ] Category codes are consistent (bottle500, can330, etc.)

### Product Mappings CSV (`data/seed/product_mappings.csv`)
- [ ] All `source_sku` values are unique (NO DUPLICATES)
- [ ] All `internal_product_code` values exist in products.csv
- [ ] `mapping_confidence` is 1.00 for all manual overrides
- [ ] Distributor is "Inn Express" for all rows

### Inn Express Test File (`data/raw/*.xlsx`)
- [ ] File is Excel format (.xlsx or .xls)
- [ ] Has columns: Customer Name, SKU, Product Description, DUOI, Quantity
- [ ] SKU codes match those in product_mappings.csv
- [ ] No password protection
- [ ] Dates are in consistent format

---

## How to Use These Files

### 1. Load Products into Supabase
```sql
COPY dim_product_internal (product_code, product_name, brand_family, pack_format, duoi, category, is_active)
FROM '/path/to/data/seed/products.csv'
DELIMITER ','
CSV HEADER;
```

### 2. Load Product Mappings into Supabase
```sql
COPY map_product_source_to_internal (distributor, source_sku, internal_product_code, mapping_method, mapping_confidence, mapping_note)
FROM '/path/to/data/seed/product_mappings.csv'
DELIMITER ','
CSV HEADER;
```

### 3. Verify Loaded Data
```sql
-- Check products
SELECT COUNT(*) FROM dim_product_internal;  -- Should be 26

-- Check mappings
SELECT COUNT(*) FROM map_product_source_to_internal;  -- Should be 10

-- Check for missing brand_family or pack_format (should be 0)
SELECT product_code, product_name 
FROM dim_product_internal 
WHERE brand_family IS NULL OR pack_format IS NULL;
```

---

## Expected Import Results

With this seed data, when you import your first Inn Express file:

**Best Case** (if no data quality issues):
- Products with Inn Express codes: **100% confidence match**
- Products without codes: **85% confidence match** (via family+pack fallback)
- Overall mapping coverage: **≥95%** (volume-based)

**Actual Case** (with duplicate SKU codes):
- 7 products: **100% confidence match** (unique Inn Express codes)
- 3 products: **0% confidence** due to duplicate codes (FPBF050, FPBFCAN33, FPDRY50)
- Remaining products: **85% confidence** (family+pack fallback)
- Overall coverage: Depends on volume distribution

**After fixing duplicates**:
- 10 products: **100% confidence match**
- Remaining products: **85% confidence** (family+pack fallback)
- Overall coverage: **≥95%** ✅

---

## Next Steps

1. **Review the duplicate SKU issue** and decide on Option A, B, or C above
2. **Obtain Inn Express test file** (one month of data)
3. **Load seed data** into Supabase (products and mappings)
4. **Run import script** with test file
5. **Review import report** for unmapped SKUs
6. **Adjust mappings** as needed based on results

---

## Questions?

If you need help with:
- Fixing the duplicate SKU codes
- Understanding the import process
- Interpreting the import reports
- Adding new products or mappings

Refer to the MASTER_HANDOFF.md document or ask for assistance.
