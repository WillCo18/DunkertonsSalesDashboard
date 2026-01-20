
from db import select, Database
import json

print("\n--- DIM PRODUCT INTERNAL (Dry BIB 20L) ---")
products = select("dim_product_internal")
dry_bib = [p for p in products if p['brand_family'] == 'Dry' and p['pack_format'] == 'BIB 20L']
for p in dry_bib:
    print(f"{p['product_code']}: {p['product_name']}")
    
print("\n--- DIM PRODUCT INTERNAL (All) ---")
for p in products[:10]:
    print(f"{p['product_code']}: {p['product_name']} ({p['brand_family']} - {p['pack_format']})")

print("\n--- MAPPINGS ---")
mappings = select("map_product_source_to_internal")
for m in mappings:
    print(f"{m['source_sku']} -> {m['internal_product_code']} ({m['mapping_method']})")

print("\n--- UNMAPPED VIEW ---")
unmapped = select("v_unmapped_skus")
for u in unmapped:
    print(u)

print("\n--- MONTHLY SUMMARY ---")
summary = select("v_monthly_summary")
print(summary)
