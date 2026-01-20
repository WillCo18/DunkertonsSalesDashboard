
from db import select
import json

def debug_match():
    # Load internal
    internal_products = select("dim_product_internal", "*", {"is_active": True})
    print(f"Loaded {len(internal_products)} internal products")
    
    # Target
    detected_family = "Dry"
    detected_format = "BIB 20L"
    
    print(f"Looking for Family='{detected_family}', Format='{detected_format}'")
    
    matches = [
        p for p in internal_products
        if p["brand_family"].lower() == detected_family.lower()
        and p["pack_format"].lower() == detected_format.lower()
    ]
    
    print(f"Found {len(matches)} matches:")
    for m in matches:
        print(f"  {m['product_code']}: {m['product_name']} ({m['brand_family']} - {m['pack_format']})")

if __name__ == "__main__":
    debug_match()
