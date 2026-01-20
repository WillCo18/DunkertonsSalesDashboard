
from db import upsert, select

mapping = {
    "distributor": "Inn Express",
    "source_sku": "CDDOBIB",
    "internal_product_code": "FPDRYBIB",
    "mapping_method": "manual_override",
    "mapping_confidence": 1.0,
    "mapping_note": "Fixed by agent"
}

print("Upserting mapping...")
upsert("map_product_source_to_internal", mapping)
print("Done.")

# Check result
m = select("map_product_source_to_internal", "*", {"source_sku": "CDDOBIB"})
print("Mapping after fix:", m)
