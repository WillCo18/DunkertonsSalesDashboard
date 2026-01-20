# Project Map

> Source of truth for this repository

## Directory Structure

- `.agent/rules/` - Workspace rules
- `.agent/skills/` - Project skills
- `architecture/` - SOPs and architecture documentation
- `tools/` - Deterministic scripts
- `.tmp/` - Intermediate files (gitignored)
 # Dunkerton Sales Dashboard — PROJECT_MAP
# Dunkerton Sales Dashboard — PROJECT_MAP

## 1) Outcome
Build a sales dashboard plus soft CRM from Inn Express monthly supplier reports.
Primary users: telesales team and marketing team.

## 2) MVP scope
- Import monthly Inn Express XLS/XLSX (historic plus ongoing)
- Normalise Inn Express product codes to Dunkerton internal SKUs via a mapping table
- Dashboard:
  - totals this month
  - totals last month
  - trend over time
  - top customers by volume
  - top SKUs
  - brand family performance
- New customers this month
- Customers at risk
- Export lists for campaigns (CSV)

## 3) Non-goals for MVP
- Full CRM replacement
- Automated Instagram scraping without manual review
- Multi wholesaler ingestion (unless confirmed later)

## 4) Success criteria
- Monthly import completes with under 2 minutes of manual effort
- SKU mapping coverage: at least 95% of total volume mapped to internal SKUs
- New customer and at risk lists pass spot checks (10 sampled accounts)
- Exports can be used directly for telesales lists and campaign targeting

## 5) Users and primary journeys
### Telesales
1. Log in
2. See this month summary and top changes
3. Find new customers and at risk customers
4. Drill into an account and see buying history and gaps
5. Export a call list

### Marketing
1. Log in
2. See brand family and SKU performance
3. Pull segments for campaigns (gaps, outlet types, new customers)
4. Export lists for email and direct mail targeting

## 6) Data sources
- Inn Express monthly supplier report (XLS/XLSX)
- Dunkerton internal SKU master list (Product Code and Description)

## 7) Decisions
- Stack: TBD (BI first vs web app first)
- Database: TBD (recommend Postgres as source of truth)
- Authentication: TBD
- Hosting: TBD

## 8) Build segments
### Segment 1: Ingestion plus canonical tables plus data quality checks
Status: Completed / Operational  
Definition of done:
- Can load months consistently (December 2025 loaded)
- Totals by month and by SKU match the report totals
- Data quality report (Raw Data View) implemented

### Segment 2: Metric definitions (new, at risk, gap analysis)
Status: Completed / Operational  
Definition of done:
- Metrics implemented in `lib/queries.ts`
- Reactive filters for Brand and Salesperson
- Customizable Gap Analysis (Keg vs Bottle, etc.)

### Segment 3: Dashboard UI
Status: Completed / Operational  
Definition of done:
- Night Ops theme functional
- Filters for month, brand family, format, salesperson
- KPI deck, Trend charts, and Top Customers tables operational
- Raw Data View toggle implemented

### Segment 4: Enrichment (soft CRM fields)
Status: Not started  
Definition of done:
- Customer record view supports manual enrichment fields
- Enrichment does not break core reporting if incomplete

### Segment 5: Campaign exports plus automation hooks
Status: Not started  
Definition of done:
- Export views exist for key segments
- Exports can be scheduled later (n8n optional)

## 9) Running change log
- 2026-01-19: Project parity with previous Airtable system reached.
- 2026-01-20: Implemented filter reactivity, Raw Data View, and Custom Gap Analysis.
- 2026-01-20: Fixed Dashboard UI styling and branding ("Night Ops" theme).

## 10) Open questions
- Confirm spelling: Inn Express or InExpress in official naming
- Confirm how report month is represented in the file for every month
- Confirm the master source for internal SKU list (file location and update cadence)
- Confirm whether the dashboard must support more than one wholesaler later

---

# Data contracts

## 11) Data contract (Inn Express supplier report)

### Source file
- Monthly XLS/XLSX report from Inn Express
- Note: the report includes a header row with print date and title
- Real column headers start on the next row

### Raw columns (as seen in the sample report)
We will map the spreadsheet columns to these canonical raw fields:

- inv_account (string)
- delivery_name (string)      # Delivery Address Name
- address_1 (string)
- address_2 (string, nullable)
- address_3 (string, nullable)
- address_4 (string, nullable)
- post_code (string)
- source_sku (string)         # Inn Express SKU
- source_description (string)
- duoi (string)               # Unit of issue, as provided
- qty (number)                # Quantity of units
- salesperson (string)
- del_account (string)
- distributor (string)        # e.g. Inn Express
- report_month (date)         # stored as first day of month, YYYY-MM-01

### Normalisation rules
- Trim whitespace on all strings
- Uppercase post_code and collapse multiple spaces
- Parse report_month into YYYY-MM and store as first day of month
- qty must be numeric and >= 0 (flag negatives if they appear)
- Treat inv_account vs del_account inconsistencies as a data quality issue and flag

### Uniqueness and dedupe
We will create a deterministic line key so imports are idempotent:

line_key = hash(distributor, report_month, del_account, source_sku, qty, delivery_name, post_code)

Rules:
- If the same line_key appears twice in the same import, treat as duplicate
- If the same line_key appears in a later import for the same month, ignore or update based on an explicit import mode (TBD)

---

## 12) Internal product master (Dunkerton)

### Source
Dunkerton master list provided by Will (Product Code and Description).

We will store as:
- internal_product_code (string, unique)  # e.g. FPBF050
- internal_product_name (string)

Optional derived attributes (can be added later):
- brand_family (e.g. Black Fox, Craft, Premium, Session)
- format (Bottle, Can, Keg, BiB, Mini Keg)
- pack_size (e.g. 50cl x 12, 330ml x 12, 50L, 20L, 10L, 5L)
- abv (if present in name, e.g. 5%)

---

## 13) Mapping rule (no ambiguity)

Inn Express report uses source_sku.
Dunkerton uses internal_product_code.
We will never treat them as the same field.

We will create a mapping table:
- distributor (string, e.g. Inn Express)
- source_sku (string)
- internal_product_code (string, nullable)
- mapping_method (manual | rule | fuzzy)
- mapping_confidence (number, 0 to 1)
- mapping_note (string, nullable)
- updated_at (datetime)

Mapping coverage target:
- At least 95% of total volume mapped to internal_product_code

---

# Metric definitions (draft)

## 14) Definitions we will implement deterministically (Segment 2)

### New customer
A customer (del_account) that appears in the current report_month but did not appear in the previous report_month.

### Customer at risk
A customer (del_account) that bought any product within the last N months but has not bought in the most recent month.
Default N: 3 months, configurable.

### Gap analysis
Identify customers who are buying some categories but not others, such as:
- format gaps: draught vs packaged
- brand family gaps: buys Craft but not Black Fox
- SKU breadth: high volume, low variety

Exact category and brand family definitions will be derived from internal SKU attributes.

---

# Security and testing baselines (to confirm at stack decision)

## 15) Security baseline
- Secrets stored in `.env`, never committed to git
- Input validation at each boundary (file import, API endpoints, exports)
- Timeouts and retries for external calls (if any)
- Logs must not include secrets or personal data beyond what is required for the business use case
- Role based access control for internal users (telesales vs marketing vs admin)

## 16) Testing baseline
- Unit tests for pure logic (parsing, mapping, metric rules)
- Contract tests for import column expectations and data types
- One end to end smoke test per major user journey:
  - import works
  - dashboard query returns expected totals for a known month
  - exports generate expected row counts for a known segment

---

# Changelog

## 2026-01-20: Data Quality Fix - Brand Family Detection

### Issue
Historical data had incorrect `detected_family` values due to pattern matching order issues in `tools/detection.py`:
- "Mulled Cider" products: `detected_family` was `null` instead of `Mulled`
- "Dry Organic" products: `detected_family` was `Premium` instead of `Dry`
- "Dabinett" products: `detected_family` was `null` instead of `Dabinett`

This caused filtering issues in the dashboard where customers weren't appearing when filtering by these brand families.

### Root Cause
1. Generic pattern `\bdry\b` was mapped to "Premium" and checked before specific "Dry" patterns
2. Data was imported before detection logic improvements were made
3. No `internal_product_code` linking for affected products

### Solution
1. **Updated `tools/detection.py`**:
   - Reordered `BRAND_FAMILY_PATTERNS` to check specific "Dry" patterns before generic patterns
   - Changed `\bdry\b` mapping from "Premium" to "Dry"
   - Ensured "Mulled" and "Dabinett" patterns are properly prioritized

2. **Created data fix pipeline**:
   - `dashboard/fetch_all_descriptions.js` - Fetches unique product descriptions
   - `tools/generate_fix_sql.py` - Generates SQL updates based on current detection logic
   - Applied migration `005_fix_all_detections.sql` to update 14 product descriptions

3. **Updated dashboard queries** (`dashboard/src/lib/queries.ts`):
   - Modified `getTopCustomers` to use `internal_product_code` lookup from `dim_product_internal`
   - Ensures filtering works even if `detected_family` has inconsistencies
   - Falls back to `detected_family` for unmapped products

### Impact
- ✅ All brand family filters now work correctly in dashboard
- ✅ "Top Customers" list properly filters by Mulled, Dry, and Dabinett
- ✅ Future imports will use corrected detection logic automatically
- ✅ Historical data corrected for all existing product descriptions

### Files Modified
- `tools/detection.py` - Fixed pattern matching order
- `dashboard/src/lib/queries.ts` - Enhanced filtering logic
- `database/migrations/005_fix_all_detections.sql` - Data correction migration
- `tools/generate_fix_sql.py` - Reusable data fix generator (new)
- `dashboard/fetch_all_descriptions.js` - Description fetcher (new)

## 2026-01-20: Dashboard Filter & Widget Improvements

### Issues Fixed
1. **Month Filter**: Changed default behavior from auto-selecting most recent month to showing all months aggregate data
2. **At-Risk Customers**: Extended window from 3 to 5 months and added severity levels (warning/at-risk/critical)
3. **Top Products Widget**: Now respects month filter - shows month-specific data when filtered, all-time when not

### Changes Made
1. **`useFilters.ts`**: Removed auto-selection of first month, allowing "All Months" view by default
2. **`queries.ts` - `getTopProducts`**: Added dynamic aggregation when month filter is active
3. **Database Migration `006_update_at_risk_view.sql`**: 
   - Extended at-risk window to 5 months
   - Added `risk_level` field: 'warning' (1-2 months), 'at-risk' (3-4 months), 'critical' (5+ months)

### Impact
- ✅ Dashboard now shows aggregate data across all months by default
- ✅ DEYA BREWING CO now appears in at-risk customers (4 months since last order)
- ✅ Top Products widget correctly filters by selected month
- ✅ Better visibility into customer churn risk with severity levels
- ✅ New customers split into two widgets: "New This Month" and "New Last 2 Months"

### Still To Do
- Add clickable KPI tiles for drill-down functionality
- Add year-based filtering option

## 2026-01-20: New Customer Widgets Split

### Changes Made
1. **`queries.ts`**: Added `getNewCustomersRecent()` function to fetch customers from last N months
2. **`useDashboardData.ts`**: Added hook to fetch and expose `newCustomersRecent` data
3. **`NewCustomersRecentList.tsx`**: New component for "New Last 2 Months" widget
4. **`NewCustomersList.tsx`**: Updated title to "New This Month" for clarity
5. **`page.tsx`**: Updated insights row to display 5 widgets (was 4)

### Impact
- ✅ "New This Month" widget shows customers who joined in the selected month
- ✅ "New Last 2 Months" widget shows customers who joined in last 2 months (always)
- ✅ Better visibility into customer acquisition trends

## 2026-01-20: Dashboard Aesthetic Improvements

### Changes Made
1. **Header.tsx**: Fixed company name from "Dunkerton" to "Dunkertons" (plural)
2. **KPICard.tsx**: 
   - Added `truncate` class to fix text overflow in KPI values
   - Added `onClick` handler prop for clickable tiles
   - Added hover state for clickable tiles
3. **KPIDeck.tsx**:
   - Removed delta comparison from "Total Units" KPI
   - Added click handlers for "New Customers" and "At-Risk" tiles
   - Removed manual text truncation from Top SKU (now handled by KPICard)
4. **page.tsx**:
   - Added scroll-to-section functionality
   - Added section IDs to New Customers and At-Risk widgets
   - Wired up KPI tile click handlers

### Impact
- ✅ Company name correctly displays as "Dunkertons Sales Dashboard"
- ✅ Top SKU text no longer overflows - truncates with ellipsis and shows full text on hover
- ✅ Total Units KPI shows clean number without "vs previous month"
- ✅ New Customers and At-Risk KPI tiles are clickable and scroll to their respective sections
- ✅ Improved user experience with smooth scroll animations

### Still To Do
- Add multi-month date range picker (checkbox selection for December, November, etc.)

## 2026-01-20: Format Mix Chart Implementation

### Changes Made
1. **FormatMixChart.tsx**: New component displaying Can/Bottle/BIB/Keg distribution as a pie chart
2. **queries.ts**: Added `getFormatMix()` function to aggregate shipments by pack format
3. **useDashboardData.ts**: Added hook to fetch and expose format mix data
4. **KPIDeck.tsx**: Replaced "Top Brand" KPI tile with FormatMixChart component
5. **page.tsx**: Passed formatMix data to KPIDeck

### Impact
- ✅ "Top Brand" KPI replaced with interactive "Format Mix" pie chart
- ✅ Shows distribution of Can, Bottle, BIB, and Keg formats
- ✅ Respects month and brand family filters
- ✅ Displays percentages and unit counts on hover
- ✅ Color-coded legend for easy identification

---

## 2026-01-20: Pack Format Filter Fix

### Problem Identified
Pack format filtering was not working correctly. When users selected a pack format like "Keg 50L" from the filter dropdown, the dashboard showed zero results even though products with that format existed in `dim_product_internal`. This was due to a mismatch between:
- **Filter options**: Sourced from `dim_product_internal.pack_format` (canonical formats)
- **Filtering logic**: Used `fact_shipments.detected_format` (often incorrect/different)

### Root Cause
The `detected_format` column in `fact_shipments` contained incorrectly detected formats that didn't match the canonical `pack_format` values in `dim_product_internal`. For example:
- Canonical: "Keg 50L" (in dim_product_internal)
- Detected: "Keg 30L" (in fact_shipments)

### Solution Implemented
Modified `getMonthlySummary()` in `queries.ts` to use a **two-step lookup** for pack format filtering:
1. Query `dim_product_internal` to get `product_code` values where `pack_format` matches the filter
2. Filter `fact_shipments` by those `internal_product_code` values instead of using `detected_format`

### Changes Made
1. **queries.ts - getMonthlySummary()**: 
   - Added product code lookup when `packFormat` filter is active
   - Changed from filtering by `detected_format` to filtering by `internal_product_code`
   - Returns null if no products match the selected format

### Impact
- ✅ Pack format filtering now works correctly
- ✅ Selecting "Keg 50L" shows accurate results
- ✅ All KPIs and widgets update properly when pack format filter is applied
- ✅ Uses canonical product data instead of potentially incorrect detected values

---

## 2026-01-20: Enhanced Gap Analysis Implementation

### Overview
Completely redesigned the Gap Analysis feature as a standalone, full-width widget with intuitive filtering and comprehensive customer insights.

### New Component: EnhancedGapAnalysis.tsx
A powerful, user-friendly gap analysis tool that identifies which customers are/aren't stocking specific products.

### Key Features
1. **Intuitive Filter System**:
   - Brand Family (required) - Select which product line to analyze
   - Pack Format (optional) - Filter by specific formats
   - Salesperson (optional) - Filter by sales rep
   - Stocked/Not Stocked toggle - Switch between views

2. **Smart Customer List**:
   - Customer name, location, account number
   - Total units purchased (for context)
   - Assigned salesperson
   - "Opportunity" badge for gap customers
   - Search functionality
   - Sorted by purchase volume

3. **Date Filtering**:
   - Respects the dashboard's month filter
   - Shows only customers active in the selected period
   - Filters product purchases by selected month

4. **Unmapped Product Support**:
   - Works with both mapped products (in `dim_product_internal`)
   - Also works with unmapped products (using `detected_family`)
   - Dual approach ensures all products are captured

### New Query: getEnhancedGapAnalysis()
Intelligent query function that:
- Gets product codes from `dim_product_internal` for mapped products
- Falls back to `detected_family`/`detected_format` for unmapped products
- Filters by selected time period (month)
- Returns either customers who stock OR don't stock the product
- Includes total purchase volume for context

### Changes Made
1. **EnhancedGapAnalysis.tsx**: New full-width standalone component
2. **queries.ts**: Added `getEnhancedGapAnalysis()` function
3. **insights/index.ts**: Exported new component
4. **page.tsx**: Added EnhancedGapAnalysis section with filter options and currentMonth

### Impact
- ✅ Powerful gap analysis tool for identifying sales opportunities
- ✅ Works correctly with both mapped and unmapped products
- ✅ Respects month filter for accurate period-specific analysis
- ✅ Intuitive UI with clear visual feedback
- ✅ Helps identify which customers aren't stocking specific products

### Bug Fixes
- Fixed issue where "DRY ORGANIC" products weren't showing because they weren't mapped to `dim_product_internal`
- Added fallback logic to use `detected_family` when `internal_product_code` is null
- Ensured date filtering works correctly (only shows customers active in selected period)

---

## 2026-01-20: Cross-Product Gap Analysis Implementation

### Overview
Created a second gap analysis widget for identifying cross-selling opportunities by finding customers who stock one product but not another.

### New Component: CrossProductGapAnalysis.tsx
A sophisticated two-condition analysis tool for cross-product gap identification.

### Key Features
1. **Two-Condition System**:
   - **Condition 1 (Green)**: STOCKS - Brand Family + optional Format
   - **Condition 2 (Red)**: MISSING - Brand Family + optional Format
   - Visual separator showing "But Not" between conditions

2. **Use Cases**:
   - "Stocks Craft but not Black Fox" - upsell opportunities
   - "Stocks Premium Kegs but not Premium Bottles" - format expansion
   - "Stocks Vintage but not Dabinett" - product line expansion

3. **Customer Cards**:
   - Shows units of product they stock (green)
   - Shows zero units of missing product (red)
   - "Upsell Opportunity" badge
   - Customer details and salesperson

4. **Smart Filtering**:
   - Optional salesperson filter
   - Customer search
   - Respects month filter
   - Works with mapped and unmapped products

### New Query: getCrossProductGapAnalysis()
Advanced query that:
- Gets product codes for both "stocks" and "missing" brands
- Categorizes all shipments into two groups
- Identifies customers who bought X but not Y
- Supports format-specific filtering for both conditions
- Returns sorted list by purchase volume

### Changes Made
1. **CrossProductGapAnalysis.tsx**: New full-width component with two-condition UI
2. **queries.ts**: Added `getCrossProductGapAnalysis()` function
3. **insights/index.ts**: Exported new component
4. **page.tsx**: Added CrossProductGapAnalysis section below EnhancedGapAnalysis

### Impact
- ✅ Powerful cross-selling opportunity identification
- ✅ Intuitive two-row filter design (stocks vs missing)
- ✅ Visual color coding (green = stocks, red = missing)
- ✅ Enables complex queries like "Craft but not Black Fox"
- ✅ Helps sales team identify upsell opportunities
- ✅ Works with both brand families and specific formats

### Visual Design
- Green section for "STOCKS" condition (success/positive)
- Red section for "MISSING" condition (opportunity/gap)
- Clear "But Not" separator between conditions
- Customer cards show both metrics side-by-side

---

## Roadmap & Future Features

### Immediate Priorities (In Progress)
1. **Multi-Month Date Range Picker** 🚧
   - Replace single month dropdown with checkbox-based multi-select
   - Allow selection of multiple months (e.g., December + November + October)
   - Aggregate data across selected months
   - Update all KPIs, charts, and widgets to handle multi-month data
   - Show selected months in filter summary

### Short-Term Features (Next Sprint)
2. **Export Functionality for Gap Analysis**
   - Add CSV export to EnhancedGapAnalysis widget
   - Add CSV export to CrossProductGapAnalysis widget
   - Include customer details, contact info, purchase volumes
   - Format for easy import into CRM or email tools
   - Optional: PDF export with formatted lists

3. **Customer Detail Cards/Modal**
   - Clickable customer cards in gap analysis
   - Modal showing full customer profile
   - Purchase history by brand/format
   - Contact information
   - Salesperson notes/history
   - Quick actions (email, call, add to campaign)

### Long-Term Features (Future Roadmap)

4. **LLM Integration - Gap Opportunity Analysis** 🤖
   - **Purpose**: Intelligent analysis and presentation of sales opportunities
   - **Features**:
     - Analyze gap analysis results using LLM
     - Identify patterns and trends in customer behavior
     - Prioritize opportunities based on customer value, purchase history
     - Generate natural language insights (e.g., "5 high-value customers buying Craft could be upsold to Black Fox")
     - Suggest optimal product recommendations per customer
     - Create actionable sales strategies
   - **Implementation Options**:
     - Local LLM (Ollama, LLaMA) for privacy/cost
     - Cloud LLM (OpenAI, Anthropic) for advanced reasoning
     - Hybrid approach based on data sensitivity
   - **Data Requirements**:
     - Brand information and positioning
     - Product descriptions and benefits
     - Customer purchase patterns
     - Sales history and trends

5. **LLM Integration - Sales Email Generation** 📧
   - **Purpose**: AI-powered personalized sales outreach
   - **Features**:
     - Generate personalized sales emails for gap opportunities
     - Customize tone and style per customer/salesperson
     - Include relevant product information and benefits
     - Reference customer's purchase history
     - Suggest optimal timing for outreach
     - A/B testing variations
   - **Email Types**:
     - Upsell emails (stocks X, suggest Y)
     - Cross-sell emails (format expansion)
     - Re-engagement emails (at-risk customers)
     - New product introductions
     - Seasonal promotions
   - **Personalization Inputs**:
     - Customer name, business type, location
     - Current products they stock
     - Purchase volume and frequency
     - Salesperson relationship
     - Brand voice and messaging guidelines
   - **Implementation**:
     - Template system with LLM enhancement
     - Brand voice training data
     - Product catalog integration
     - Review/approval workflow before sending
     - Track email performance metrics

6. **Brand & Product Knowledge Base**
   - **Required for LLM Features**:
     - Brand positioning documents
     - Product descriptions and benefits
     - Target customer profiles
     - Pricing and packaging information
     - Sales talking points
     - Competitor information
     - Seasonal/promotional calendars
   - **Format**: Structured markdown or JSON for LLM context
   - **Storage**: Vector database for semantic search
   - **Updates**: Version controlled, easily updatable

### Technical Considerations for LLM Integration
- **Privacy**: Customer data handling and compliance
- **Cost**: Token usage optimization, caching strategies
- **Latency**: Response time for real-time features
- **Accuracy**: Human review loop for critical communications
- **Customization**: Fine-tuning vs. prompt engineering
- **Monitoring**: Track LLM performance and quality

### Current Status
- ✅ Core dashboard functionality complete
- ✅ Gap analysis tools operational
- ✅ Filter system working correctly
- 🚧 Multi-month date picker (in progress)
- 📋 Export functionality (planned)
- 📋 LLM integration (long-term roadmap)

