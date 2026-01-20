-- Dunkerton Sales Dashboard - Seed Products Migration
-- Version: 1.1
-- Description: Seeds dim_product_internal and map_product_source_to_internal with actual Airtable data
-- Source: data/seed/products.csv and data/seed/product_mappings.csv

-- ============================================================================
-- Seed: dim_product_internal (26 products from Airtable)
-- ============================================================================

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

-- ============================================================================
-- Seed: map_product_source_to_internal (10 mappings from Airtable)
-- Note: Some SKUs have duplicate mappings in Airtable - using first match
-- ============================================================================

INSERT INTO map_product_source_to_internal (distributor, source_sku, internal_product_code, mapping_method, mapping_confidence, mapping_note)
VALUES
  ('Inn Express', 'PDPR500', 'FPPER50', 'manual_override', 1.00, 'Seeded from Airtable - Perry'),
  ('Inn Express', 'PDBR500', 'FPBRO50', 'manual_override', 1.00, 'Seeded from Airtable - Browns (NOTE: Duplicate SKU in Airtable)'),
  ('Inn Express', 'PDCPR330', 'FPPREMCAN33', 'manual_override', 1.00, 'Seeded from Airtable - Premium Can'),
  ('Inn Express', 'PDVN500', 'FPVIN66', 'manual_override', 1.00, 'Seeded from Airtable - Vintage'),
  ('Inn Express', 'PDDRYSPARK', 'FPCRAFT50', 'manual_override', 1.00, 'Seeded from Airtable - Craft (NOTE: Duplicate SKU in Airtable)'),
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

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check product count (should be 26)
-- SELECT COUNT(*) AS product_count FROM dim_product_internal;

-- Check mappings count (should be 10)
-- SELECT COUNT(*) AS mapping_count FROM map_product_source_to_internal WHERE mapping_method = 'manual_override';

-- Check brand family distribution
-- SELECT brand_family, COUNT(*) as count FROM dim_product_internal GROUP BY brand_family ORDER BY count DESC;

-- Check format distribution
-- SELECT pack_format, COUNT(*) as count FROM dim_product_internal GROUP BY pack_format ORDER BY count DESC;
