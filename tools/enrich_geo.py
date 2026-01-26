#!/usr/bin/env python3
"""
Geo Enrichment Tool

Enriches customer data with latitude, longitude, and cleaned city names
using the postcodes.io API.

Usage:
    python tools/enrich_geo.py
"""
import requests
import time
import logging
from typing import List, Dict, Any, Optional
from db import get_client, update

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

POSTCODES_API_BASE = "https://api.postcodes.io"

def get_customers_without_geo() -> List[Dict[str, Any]]:
    """Fetch customers that haven't been geocoded yet."""
    client = get_client()
    # Fetch customers where latitude is NULL
    response = client.table("dim_customer").select("*").is_("latitude", "null").execute()
    return response.data

def batch_lookup_postcodes(postcodes: List[str]) -> Dict[str, Any]:
    """
    Lookup multiple postcodes (max 100 per request).
    Returns a dict of postcode -> result.
    """
    if not postcodes:
        return {}
    
    unique_postcodes = list(set(postcodes))
    results = {}
    
    # Chunk into batches of 100
    for i in range(0, len(unique_postcodes), 100):
        batch = unique_postcodes[i:i+100]
        try:
            response = requests.post(f"{POSTCODES_API_BASE}/postcodes", json={"postcodes": batch})
            if response.status_code == 200:
                data = response.json()
                for item in data.get("result", []):
                    query = item.get("query")
                    res = item.get("result")
                    if query and res:
                        results[query] = res
            else:
                logger.error(f"Postcodes API Error: {response.status_code}")
        except Exception as e:
            logger.error(f"Network error: {e}")
        
        # Be nice to the API
        time.sleep(0.1)
            
    return results

def enrich_customers():
    """Main enrichment workflow."""
    customers = get_customers_without_geo()
    logger.info(f"Found {len(customers)} customers pending enrichment.")
    
    if not customers:
        return

    # Extract clean postcodes
    # dim_customer.delivery_postcode should already be cleaned by import logic, 
    # but let's be safe.
    postcode_map = {} # postcode -> [customer_ids]
    
    for cust in customers:
        pc = cust.get("delivery_postcode")
        if pc:
            if pc not in postcode_map:
                postcode_map[pc] = []
            postcode_map[pc].append(cust["del_account"])
            
    postcodes = list(postcode_map.keys())
    logger.info(f"Looking up {len(postcodes)} unique postcodes...")
    
    geo_data = batch_lookup_postcodes(postcodes)
    
    updated_count = 0
    
    for postcode, data in geo_data.items():
        # Extract useful fields
        lat = data.get("latitude")
        long = data.get("longitude")
        # City fallback: parish -> admin_district -> region
        city = data.get("parish") or data.get("admin_district") or data.get("region")
        
        if lat and long:
            customers_to_update = postcode_map.get(postcode, [])
            for customer_id in customers_to_update:
                update_data = {
                    "latitude": lat,
                    "longitude": long,
                    "geo_accuracy": "postcode_centroid"
                }
                
                # Update city if provided and currently likely generic/empty
                # We assume the API data corrects generic cities
                if city:
                    update_data["delivery_city"] = city
                
                # Execute Update
                try:
                    update("dim_customer", update_data, {"del_account": customer_id})
                    updated_count += 1
                except Exception as e:
                    logger.error(f"Failed to update {customer_id}: {e}")
                    
    logger.info(f"Successfully enriched {updated_count} customers.")
    
    # Step 2: Sync cities to fact_shipments via RPC
    logger.info("Syncing normalized cities to fact_shipments...")
    try:
        get_client().rpc("sync_customer_cities", {}).execute()
        logger.info("Sync complete.")
    except Exception as e:
        logger.error(f"Failed to sync cities: {e}")

if __name__ == "__main__":
    enrich_customers()
