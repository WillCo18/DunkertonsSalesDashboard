# Dunkertons Sales System - User Guide

> **Status**: Living Document  
> **Last Updated**: 2026-01-24  
> **Maintainer**: Engineering Team

## 1. System Overview

The **Dunkertons Sales Dashboard** is a bespoke analytics platform designing to process monthly sales reports from wholealsers (primarily Inn Express) and provide actionable insights for the Telesales and Marketing teams.

### Core Components
1.  **Data Pipeline**: Python-based tools to ingest, clean, and normalize raw Excel/CSV reports.
2.  **Database**: Supabase (PostgreSQL) hosting a Star Schema (`fact_shipments`, `dim_customer`, etc.).
3.  **Dashboard**: A Next.js web application providing interactive KPIs, charts, and gap analysis tools.
4.  **Normalization Agent**: A smart CLI tool to assist in mapping external product codes to internal Dunkertons SKUs.

---

## 2. End-to-End Workflow

The standard monthly operating rhythm involves three main stages:

### Stage 1: Data Ingestion
**Goal**: Load the latest supplier report into the database.

1.  **Receive Report**: Get the Excel file from Inn Express (e.g., `Inn Express Usage Report Dec 25.xlsx`).
2.  **Prepare File**: Save it to the `data/raw/` directory.
3.  **Run Import Tool**:
    ```bash
    python tools/import_inn_express.py --file data/raw/"Inn Express Usage Report Dec 25.xlsx"
    ```
    *This script handles basic cleaning, date parsing, and updating the `fact_shipments` table.*

### Stage 2: Data Integrity & Normalization
**Goal**: Ensure all imported products and customers are correctly identified.

1.  **Check for Unmapped Products**:
    Run the normalization agent to see if any new products appeared in this month's report.
    ```bash
    python tools/normalization_agent.py --source data/raw/"Inn Express Usage Report Dec 25.xlsx" --analyze
    ```
2.  **Resolve Mappings**:
    If the dashboard shows "Unmapped" products or you see anomalies:
    - Use the agent to propose mappings.
    - Update `data/seed/product_mappings.csv` (or the database directly via Supabase UI) to link `source_sku` to `internal_product_code`.

### Stage 3: Dashboard & Reporting
**Goal**: Sales team uses the data for campaigns.

1.  **Access Dashboard**: Open `http://localhost:3000` (or production URL).
2.  **Review Performance**: Check KPIs for the new month against previous months.
3.  **Gap Analysis**:
    - Navigate to the "Enhanced Gap Analysis" section.
    - Filter by "Brand Family" (e.g., "Black Fox").
    - Toggle "Not Stocked" to generate a call list of customers who should be buying this range.
4.  **Export Lists**: Use the export features to generate CSVs for email marketing or call sheets.

---

## 3. Feature Guides

### 3.1 Data Normalization Agent
*Added Jan 2026*

The **Normalization Agent** is your primary tool for data quality.

- **Analyze a file**:
  `python tools/normalization_agent.py --source <file> --analyze`
  *Outputs column statistics, uniqueness, and proposes primary keys.*

- **Map Columns**:
  `python tools/normalization_agent.py --source <file> --target-schema schema.json --map-columns`
  *Suggests how source columns map to our database schema.*

- **Value Mapping (Fuzzy Match)**:
  `python tools/normalization_agent.py --map-values "Description" "tools/internal_product_names.json"`
  *Helps match messy descriptions (e.g., "Aplpe Cider") to canonical names ("Apple Cider").*

### 3.2 Dashboard Widgets

- **KPI Deck**: Top-level metrics (Sales, Units, Customers). Click tiles to drill down.
- **Trend Chart**: Visual history of sales performance.
- **Top Customers**: Ranked table of accounts by volume.
- **Format Mix**: Pie chart showing breakdown by Keg/Bottle/Can.
- **Gap Analysis**:
    - **Single Product**: "Who buys X?" or "Who doesn't buy X?"
    - **Cross-Product**: "Who buys X but NOT Y?" (Upsell opportunities).

### 3.3 Geo Enrichment & Map Data
*Added Jan 2026*

The **Geo Enrichment Tool** uses customer postcodes to find their precise location and standardized city/town names.

- **Run Enrichment**:
  ```bash
  python tools/enrich_geo.py
  ```
  *This will:*
  1. Scan for customers without coordinates.
  2. Lookup postcodes via the `postcodes.io` API (free).
  3. Update `dim_customer` with `latitude`, `longitude`, and `delivery_city`.
  4. Fix missing city names in the process.

- **Usage**: Run this after importing a new monthly report to ensure new customers are geocoded.

---

## 4. Maintenance & Updates

### Updating this Guide
This is a living document located at `docs/USER_GUIDE.md`.
- **When adding features**: Append a new subsection to "Feature Guides".
- **When changing workflows**: Update Section 2 "End-to-End Workflow".

### Technical Troubleshooting
- **Import Fails**: Check column headers in the raw Excel file. They must match the expected format (see `architecture/data_contract.md`).
- **Dashboard Empty**: Ensure the correct `report_month` is selected in the global filter.
- **Fuzzy Match Missing**: Ensure `thefuzz` is installed (`pip install -r requirements.txt`).

---

## 5. Quick Reference Commands

| Task | Command |
|------|---------|
| **Import Data** | `python tools/import_tools.py ...` |
| **Check Quality** | `python tools/normalization_agent.py --analyze ...` |
| **Start Dashboard** | `npm run dev` (in `dashboard/` folder) |
