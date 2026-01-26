
from db import select

def verify():
    customers = select("dim_customer", "*")
    enriched = [c for c in customers if c.get("latitude") is not None]
    cities = [c for c in customers if c.get("delivery_city")]
    
    print(f"Total Customers: {len(customers)}")
    print(f"Enriched with Lat/Long: {len(enriched)}")
    print(f"Have City: {len(cities)}")
    
    
    # Check fact_shipments coverage
    shipments = select("fact_shipments", "delivery_city")
    shipment_cities = [s for s in shipments if s.get("delivery_city")]
    
    print("-" * 20)
    print(f"Total Shipments: {len(shipments)}")
    print(f"Shipments with City: {len(shipment_cities)}")
    print(f"Coverage: {len(shipment_cities)/len(shipments):.1%}" if shipments else "Coverage: 0%")

if __name__ == "__main__":
    verify()
