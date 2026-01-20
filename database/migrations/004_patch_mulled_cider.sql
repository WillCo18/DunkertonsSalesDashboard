-- Dunkerton Sales Dashboard - Mulled Cider Data Patch
-- Fixes detected_family and detected_format for records mapped to FPMULLED

UPDATE fact_shipments
SET 
  detected_family = 'Mulled',
  detected_format = 'BIB 10L',
  detected_category = 'bib10'
WHERE internal_product_code = 'FPMULLED';

-- Audit check: verify the patch
SELECT count(*) as fixed_records 
FROM fact_shipments 
WHERE internal_product_code = 'FPMULLED' 
AND detected_family = 'Mulled';
