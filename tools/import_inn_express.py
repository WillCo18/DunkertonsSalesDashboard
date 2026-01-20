#!/usr/bin/env python3
"""
Inn Express Import Pipeline

Main entry point for importing Inn Express distribution data into Supabase.

Usage:
    python import_inn_express.py --file data/raw/test.xlsx --month 2024-07-01

Features:
    - Idempotent imports (safe to re-run)
    - Two-tier product matching (SKU code -> family+pack fallback)
    - Automatic customer deduplication
    - Quality metrics tracking
    - Detailed import reports
"""
import argparse
import hashlib
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import pandas as pd

# Add tools directory to path
sys.path.insert(0, str(Path(__file__).parent))

from config import config
from db import (
    Database,
    insert,
    upsert,
    select,
    update,
    load_internal_products,
    load_product_mappings,
)
from detection import (
    detect_all,
    parse_quantity,
    clean_text,
    normalize_postcode,
)


def generate_line_key(
    report_month: str,
    del_account: str,
    source_sku: str,
    quantity: float,
    salesperson: Optional[str],
) -> str:
    """Generate unique line key for idempotency."""
    key_str = f"{report_month}|{del_account}|{source_sku}|{quantity}|{salesperson or ''}"
    return hashlib.md5(key_str.encode()).hexdigest()


def generate_del_account(customer_name: str, postcode: str) -> str:
    """Generate customer account ID from name and postcode."""
    name = clean_text(customer_name) or ""
    pc = normalize_postcode(postcode) or ""
    key_str = f"{name.upper()}|{pc.upper()}"
    return hashlib.md5(key_str.encode()).hexdigest()[:16]


def parse_report_month(month_str: str) -> datetime:
    """Parse and validate report month string."""
    try:
        dt = datetime.strptime(month_str, "%Y-%m-%d")
        if dt.day != 1:
            raise ValueError(f"Report month must be first of month, got day={dt.day}")
        return dt
    except ValueError as e:
        raise ValueError(f"Invalid month format '{month_str}'. Use YYYY-MM-01") from e


def create_import_run(report_month: datetime, source_filename: str) -> str:
    """Create import_runs record and return ID."""
    run_id = str(uuid.uuid4())
    insert(
        "import_runs",
        {
            "id": run_id,
            "report_month": report_month.strftime("%Y-%m-%d"),
            "source_filename": source_filename,
            "status": "running",
        },
    )
    return run_id


def parse_inn_express_file(file_path: Path) -> pd.DataFrame:
    """
    Parse Inn Express XLS/XLSX file.

    Handles:
    - Header row detection
    - Summary row filtering
    - Column mapping

    Returns:
        DataFrame with standardized columns
    """
    print(f"Reading file: {file_path}")

    # Read Excel file
    df = pd.read_excel(file_path, header=None)

    # Find header row (look for specific column headers)
    header_row_idx = None
    for idx, row in df.iterrows():
        row_str = " ".join([str(v).lower() for v in row.values if pd.notna(v)])
        # strict check for multiple known columns
        matches = 0
        for keyword in ["account", "delivery address", "qty", "sku", "salesperson"]:
            if keyword in row_str:
                matches += 1
        
        if matches >= 2:  # at least 2 matches to be sure
            header_row_idx = idx
            break

    if header_row_idx is None:
        # Try first row as header if no match found (fallback)
        header_row_idx = 0

    # Re-read with correct header
    df = pd.read_excel(file_path, header=header_row_idx)

    # Standardize column names
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

    # Common column name mappings
    column_mappings = {
        "customer_name": ["customer_name", "customer", "name", "delivery_name", "delivery_address_name"],
        "del_account": ["del_account", "account", "account_id", "customer_id", "acc", "inv_account"],
        "delivery_address": ["delivery_address", "address", "addr", "del_address", "address_1"],
        "delivery_city": ["delivery_city", "city", "town", "address_4"],  # Assuming address 4 is often city/county
        "delivery_postcode": ["delivery_postcode", "postcode", "post_code", "postal_code", "zip", "post_code"],
        "source_sku": ["source_sku", "sku", "product_code", "item_code", "prod_code"],
        "source_description": ["source_description", "description", "product_description", "product_name", "item_description"],
        "duoi": ["duoi", "unit_of_issue", "uoi", "pack_size"],
        "quantity": ["quantity", "qty", "units", "amount"],
        "salesperson": ["salesperson", "sales_person", "rep", "sales_rep", "account_manager"],
    }

    # Apply column mappings
    renamed_columns = {}
    for standard_name, alternatives in column_mappings.items():
        for alt in alternatives:
            if alt in df.columns and standard_name not in renamed_columns.values():
                renamed_columns[alt] = standard_name
                break

    df = df.rename(columns=renamed_columns)

    # Filter out summary rows
    if "customer_name" in df.columns:
        df = df[
            ~df["customer_name"]
            .astype(str)
            .str.contains("total|grand total|subtotal", case=False, na=False)
        ]

    # Filter out rows with no customer name
    if "customer_name" in df.columns:
        df = df[df["customer_name"].notna() & (df["customer_name"].astype(str).str.strip() != "")]

    print(f"Parsed {len(df)} data rows")
    return df


def transform_row(row: pd.Series, report_month: datetime) -> Optional[dict[str, Any]]:
    """Transform a single row from the source file."""
    # Extract fields with fallbacks
    customer_name = clean_text(row.get("customer_name"))
    if not customer_name:
        return None

    postcode = normalize_postcode(row.get("delivery_postcode"))
    source_sku = clean_text(row.get("source_sku"))
    source_description = clean_text(row.get("source_description"))
    duoi = clean_text(row.get("duoi"))
    salesperson = clean_text(row.get("salesperson"))

    # Parse quantity
    quantity = parse_quantity(row.get("quantity"))
    if quantity is None or quantity <= 0:
        return None

    if not source_sku or not source_description:
        return None

    # Generate or use del_account
    del_account = clean_text(row.get("del_account"))
    if not del_account:
        del_account = generate_del_account(customer_name, postcode or "")

    # Detect brand family, format, category
    detection = detect_all(source_description, duoi)

    # Generate line key for idempotency
    report_month_str = report_month.strftime("%Y-%m-%d")
    line_key = generate_line_key(
        report_month_str, del_account, source_sku, quantity, salesperson
    )

    return {
        "line_key": line_key,
        "report_month": report_month_str,
        "del_account": del_account,
        "customer_name": customer_name,
        "delivery_address": clean_text(row.get("delivery_address")),
        "delivery_city": clean_text(row.get("delivery_city")),
        "delivery_postcode": postcode,
        "source_sku": source_sku,
        "source_description": source_description,
        "duoi": duoi,
        "quantity": quantity,
        "salesperson": salesperson,
        "distributor": config.DEFAULT_DISTRIBUTOR,
        "detected_family": detection["detected_family"],
        "detected_format": detection["detected_format"],
        "detected_category": detection["detected_category"],
    }


def match_products(rows: list[dict], internal_products: list[dict], mappings: dict) -> list[dict]:
    """
    Apply two-tier product matching:
    1. SKU code match (from pre-seeded mappings)
    2. Family + Pack fallback
    """
    # Build lookup by family+format
    family_format_lookup = {}
    for product in internal_products:
        key = (product["brand_family"], product["pack_format"])
        if key not in family_format_lookup:
            family_format_lookup[key] = product

    new_mappings = []

    for row in rows:
        source_sku = row["source_sku"]

        # Tier 1: SKU code match
        if source_sku in mappings:
            mapping = mappings[source_sku]
            row["internal_product_code"] = mapping.get("internal_product_code")
            row["mapping_method"] = mapping.get("mapping_method", "sku_code_match")
            row["mapping_confidence"] = mapping.get("mapping_confidence", 1.0)
        else:
            # Tier 2: Family + Pack fallback
            family = row["detected_family"]
            format_ = row["detected_format"]
            matched = False

            if family and format_:
                key = (family, format_)
                if key in family_format_lookup:
                    product = family_format_lookup[key]
                    row["internal_product_code"] = product["product_code"]
                    row["mapping_method"] = "family_pack_fallback"
                    row["mapping_confidence"] = 0.85
                    matched = True

                    # Record new mapping
                    new_mappings.append({
                        "distributor": config.DEFAULT_DISTRIBUTOR,
                        "source_sku": source_sku,
                        "internal_product_code": product["product_code"],
                        "mapping_method": "family_pack_fallback",
                        "mapping_confidence": 0.85,
                        "mapping_note": f"Auto-matched: {family} + {format_}",
                    })

            if not matched:
                row["internal_product_code"] = None
                row["mapping_method"] = "unmapped"
                row["mapping_confidence"] = 0.0

                # Record unmapped
                new_mappings.append({
                    "distributor": config.DEFAULT_DISTRIBUTOR,
                    "source_sku": source_sku,
                    "internal_product_code": None,
                    "mapping_method": "unmapped",
                    "mapping_confidence": 0.0,
                    "mapping_note": f"No match found. Family={family}, Format={format_}",
                })

    # Save new mappings
    if new_mappings:
        for mapping in new_mappings:
            try:
                upsert(
                    "map_product_source_to_internal",
                    mapping,
                    "distributor,source_sku",
                )
            except Exception as e:
                print(f"Warning: Could not save mapping for {mapping['source_sku']}: {e}")

    return rows


def upsert_customers(rows: list[dict], report_month: datetime) -> tuple[int, int]:
    """Create or update customer records. Returns (new_count, existing_count)."""
    unique_customers = {}
    report_month_str = report_month.strftime("%Y-%m-%d")

    for row in rows:
        del_account = row["del_account"]
        if del_account not in unique_customers:
            unique_customers[del_account] = {
                "del_account": del_account,
                "customer_name": row["customer_name"],
                "delivery_address": row["delivery_address"],
                "delivery_city": row["delivery_city"],
                "delivery_postcode": row["delivery_postcode"],
                "first_seen": report_month_str,
                "last_seen": report_month_str,
            }

    # Check existing customers
    existing = select("dim_customer", "del_account")
    existing_accounts = {c["del_account"] for c in existing}

    new_count = 0
    existing_count = 0

    for customer in unique_customers.values():
        is_new = customer["del_account"] not in existing_accounts

        if is_new:
            try:
                insert("dim_customer", customer)
                new_count += 1
            except Exception:
                # Might already exist from concurrent run
                existing_count += 1
        else:
            # Update last_seen
            try:
                update(
                    "dim_customer",
                    {"last_seen": report_month_str},
                    {"del_account": customer["del_account"]},
                )
                existing_count += 1
            except Exception as e:
                print(f"Warning: Could not update customer {customer['del_account']}: {e}")

    return new_count, existing_count


def upsert_product_source(rows: list[dict], report_month: datetime) -> tuple[int, int]:
    """Create or update source product records. Returns (new_count, existing_count)."""
    unique_skus = {}
    report_month_str = report_month.strftime("%Y-%m-%d")

    for row in rows:
        sku = row["source_sku"]
        if sku not in unique_skus:
            unique_skus[sku] = {
                "source_sku": sku,
                "distributor": config.DEFAULT_DISTRIBUTOR,
                "source_description": row["source_description"],
                "sample_duoi": row["duoi"],
                "detected_family": row["detected_family"],
                "detected_format": row["detected_format"],
                "first_seen": report_month_str,
                "last_seen": report_month_str,
                "times_seen": 1,
            }

    # Check existing SKUs
    existing = select("dim_product_source", "source_sku")
    existing_skus = {s["source_sku"] for s in existing}

    new_count = 0
    existing_count = 0

    for sku_data in unique_skus.values():
        is_new = sku_data["source_sku"] not in existing_skus

        if is_new:
            try:
                insert("dim_product_source", sku_data)
                new_count += 1
            except Exception:
                existing_count += 1
        else:
            existing_count += 1

    return new_count, existing_count


def insert_fact_shipments(rows: list[dict], import_run_id: str) -> tuple[int, int]:
    """Insert shipment facts. Returns (inserted_count, skipped_count)."""
    inserted = 0
    skipped = 0

    for row in rows:
        shipment = {
            "line_key": row["line_key"],
            "report_month": row["report_month"],
            "del_account": row["del_account"],
            "customer_name": row["customer_name"],
            "delivery_address": row["delivery_address"],
            "delivery_city": row["delivery_city"],
            "delivery_postcode": row["delivery_postcode"],
            "source_sku": row["source_sku"],
            "source_description": row["source_description"],
            "duoi": row["duoi"],
            "internal_product_code": row["internal_product_code"],
            "quantity": row["quantity"],
            "salesperson": row["salesperson"],
            "distributor": row["distributor"],
            "detected_family": row["detected_family"],
            "detected_format": row["detected_format"],
            "detected_category": row["detected_category"],
            "mapping_method": row["mapping_method"],
            "mapping_confidence": row["mapping_confidence"],
            "import_run_id": import_run_id,
        }

        try:
            insert("fact_shipments", shipment)
            inserted += 1
        except Exception as e:
            # Duplicate key (idempotency)
            if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                skipped += 1
            else:
                print(f"Warning: Could not insert shipment: {e}")
                skipped += 1

    return inserted, skipped


def calculate_metrics(import_run_id: str, report_month: datetime) -> dict[str, Any]:
    """Calculate import metrics and update import_runs."""
    report_month_str = report_month.strftime("%Y-%m-%d")

    # Get shipment stats
    shipments = select("fact_shipments", "*", {"import_run_id": import_run_id})

    lines_imported = len(shipments)
    lines_mapped = sum(1 for s in shipments if s.get("internal_product_code"))
    lines_unmapped = lines_imported - lines_mapped
    volume_mapped = sum(s["quantity"] for s in shipments if s.get("internal_product_code"))
    volume_unmapped = sum(s["quantity"] for s in shipments if not s.get("internal_product_code"))

    total_volume = volume_mapped + volume_unmapped
    coverage_pct = (volume_mapped / total_volume * 100) if total_volume > 0 else 0

    # Count new customers
    new_customers = select("dim_customer", "del_account", {"first_seen": report_month_str})
    new_customer_count = len(new_customers)

    metrics = {
        "lines_imported": lines_imported,
        "lines_mapped": lines_mapped,
        "lines_unmapped": lines_unmapped,
        "volume_mapped": float(volume_mapped),
        "volume_unmapped": float(volume_unmapped),
        "mapping_coverage_pct": round(coverage_pct, 2),
        "new_customers": new_customer_count,
        "status": "completed",
        "completed_at": datetime.now().isoformat(),
    }

    # Update import_runs
    update("import_runs", metrics, {"id": import_run_id})

    return metrics


def print_unmapped_report(rows: list[dict]) -> list[dict]:
    """Print report of unmapped SKUs."""
    unmapped = [r for r in rows if not r.get("internal_product_code")]

    if not unmapped:
        return []

    # Aggregate by SKU
    sku_volumes = {}
    for row in unmapped:
        sku = row["source_sku"]
        if sku not in sku_volumes:
            sku_volumes[sku] = {
                "source_sku": sku,
                "source_description": row["source_description"],
                "detected_family": row["detected_family"],
                "detected_format": row["detected_format"],
                "volume": 0,
            }
        sku_volumes[sku]["volume"] += row["quantity"]

    # Sort by volume
    sorted_skus = sorted(sku_volumes.values(), key=lambda x: x["volume"], reverse=True)

    print("\n" + "=" * 100)
    print("UNMAPPED SKUs REPORT")
    print("=" * 100)
    print(f"{'SKU':<20} {'Description':<40} {'Family':<15} {'Format':<15} {'Volume':>10}")
    print("-" * 100)

    for sku in sorted_skus[:20]:  # Top 20
        desc = (sku["source_description"] or "")[:38]
        family = sku["detected_family"] or "N/A"
        format_ = sku["detected_format"] or "N/A"
        print(f"{sku['source_sku']:<20} {desc:<40} {family:<15} {format_:<15} {sku['volume']:>10.0f}")

    if len(sorted_skus) > 20:
        print(f"\n... and {len(sorted_skus) - 20} more unmapped SKUs")

    return sorted_skus


def run_import(file_path: str, report_month_str: str) -> dict[str, Any]:
    """
    Main import orchestration.

    Args:
        file_path: Path to Inn Express Excel file
        report_month_str: Report month in YYYY-MM-01 format

    Returns:
        Import results dictionary
    """
    file_path = Path(file_path)
    report_month = parse_report_month(report_month_str)

    print(f"\n{'=' * 60}")
    print(f"INN EXPRESS IMPORT")
    print(f"{'=' * 60}")
    print(f"File: {file_path}")
    print(f"Month: {report_month.strftime('%B %Y')}")
    print(f"{'=' * 60}\n")

    # Validate config
    if not config.validate():
        raise RuntimeError("Invalid configuration. Check .env file.")

    # Create import run
    import_run_id = create_import_run(report_month, file_path.name)
    print(f"Import run ID: {import_run_id}")

    try:
        # Parse source file
        df = parse_inn_express_file(file_path)
        total_lines = len(df)

        # Transform rows
        print("Transforming data...")
        transformed_rows = []
        for _, row in df.iterrows():
            transformed = transform_row(row, report_month)
            if transformed:
                transformed_rows.append(transformed)

        print(f"Transformed {len(transformed_rows)} valid rows from {total_lines} total")

        # Load product data for matching
        print("Loading product data...")
        internal_products = load_internal_products()
        mappings = load_product_mappings()
        print(f"Loaded {len(internal_products)} internal products, {len(mappings)} existing mappings")

        # Match products
        print("Matching products...")
        transformed_rows = match_products(transformed_rows, internal_products, mappings)

        # Upsert customers
        print("Updating customers...")
        new_cust, existing_cust = upsert_customers(transformed_rows, report_month)
        print(f"  New customers: {new_cust}, Existing: {existing_cust}")

        # Upsert source products
        print("Updating source products...")
        new_sku, existing_sku = upsert_product_source(transformed_rows, report_month)
        print(f"  New SKUs: {new_sku}, Existing: {existing_sku}")

        # Insert facts
        print("Inserting shipment facts...")
        inserted, skipped = insert_fact_shipments(transformed_rows, import_run_id)
        print(f"  Inserted: {inserted}, Skipped (duplicates): {skipped}")

        # Calculate metrics
        print("Calculating metrics...")
        metrics = calculate_metrics(import_run_id, report_month)

        # Print unmapped report
        unmapped = print_unmapped_report(transformed_rows)

        # Summary
        print(f"\n{'=' * 60}")
        print("IMPORT COMPLETE")
        print(f"{'=' * 60}")
        print(f"Lines imported:     {metrics['lines_imported']}")
        print(f"Lines mapped:       {metrics['lines_mapped']}")
        print(f"Lines unmapped:     {metrics['lines_unmapped']}")
        print(f"Mapping coverage:   {metrics['mapping_coverage_pct']:.1f}%")
        print(f"New customers:      {metrics['new_customers']}")

        if metrics["mapping_coverage_pct"] < config.MAPPING_COVERAGE_TARGET:
            print(f"\n⚠️  WARNING: Coverage {metrics['mapping_coverage_pct']:.1f}% is below target {config.MAPPING_COVERAGE_TARGET}%")
        else:
            print(f"\n✅ Coverage meets target ({config.MAPPING_COVERAGE_TARGET}%)")

        return {
            "import_run_id": import_run_id,
            "metrics": metrics,
            "unmapped_skus": unmapped,
        }

    except Exception as e:
        # Mark import as failed
        update(
            "import_runs",
            {
                "status": "failed",
                "error_message": str(e),
                "completed_at": datetime.now().isoformat(),
            },
            {"id": import_run_id},
        )
        raise


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Import Inn Express distribution data into Supabase"
    )
    parser.add_argument(
        "--file",
        "-f",
        required=True,
        help="Path to Inn Express Excel file (.xlsx or .xls)",
    )
    parser.add_argument(
        "--month",
        "-m",
        required=True,
        help="Report month in YYYY-MM-01 format (e.g., 2024-07-01)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and validate without inserting data",
    )

    args = parser.parse_args()

    if args.dry_run:
        print("DRY RUN MODE - No data will be inserted")
        # TODO: Implement dry run
        return

    try:
        result = run_import(args.file, args.month)
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ IMPORT FAILED: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
