# Dashboard Specification (Volume-Led MVP)

> **Context**: Dunkerton sales volume from Inn Express reports.
> **Constraint**: No price/revenue data. Volume (qty) only.
> **Style**: Night Ops (Dark Mode).
> **UI Styling**: Follows `resources/ui-references/style-brief.md`.

## 1. Layout Skeleton

**Grid Structure (CSS Grid / Flex)**
- **Sidebar (Fixed Left, 250px)**: Filters.
- **Header (Top, Sticky)**: Global actions, User profile, Last updated timestamp.
- **Main Content (Fluid)**:
    - **Row 1**: KPI Tiles (Grid of 6).
    - **Row 2**: Main Trends (2/3 width) + Insights (1/3 width).
    - **Row 3**: Top Performers (Split view: Brand Family vs SKUs).
    - **Row 4**: Data Table (Detailed granular view).

### Section Details

#### A. Sidebar Filter Rail
*Always visible to encourage exploration.*
- **Period**: `report_month` (Month Picker / Dropdown)
- **Distributor**: `distributor` (Multi-select)
- **Customer**: `del_account` / `delivery_name` (Searchable Select)
- **Product**: `brand_family` (Multi-select), `format` (Checkboxes), `internal_product_code` (Searchable)
- **Team**: `salesperson` (Dropdown)
- **Actions**: "Apply", "Reset Filters"

#### B. KPI Tiles (Row 1)
*Visual: Dark cards, large white numbers, teal accents.*
1.  **Total Units**: Sum of `qty`. (Sparkline: qty over time)
2.  **Active Customers**: Count of unique `del_account` with `qty > 0` in period.
3.  **New Customers**: Count of `del_account` first seen in this period.
4.  **At-Risk**: Count of `del_account` that ordered in the last N months but NOT in the most recent month. Default N=3, configurable.
5.  **Top Brand Family**: Name of #1 Brand Family by qty (e.g., "Organic Cider").
6.  **Top SKU**: Name of #1 SKU by qty (e.g., "Black Fox 500ml").

#### C. Main Area
- **Trend Chart**: Line chart showing Total Units (`qty`) over `report_month`. Breakdown by `brand_family` (stacked or multi-line).
- **Insights Panel**:
    - List of "New Customers" this month.
    - List of "At-Risk" customers (ordered in last N months but not in most recent month).

#### D. Top Performers
- **Bar Chart**: Quantity by `brand_family`.
- **Table**: Top 10 SKUs by `qty` (Columns: `internal_product_code` e.g. FPBF050, `internal_product_name`, `qty`).

## 2. Component List

### Base Components (Shadcn/Tailwind)
- `AppShell`: Sidebar + Main content wrapper.
- `FilterSidebar`: Container for filter inputs.
- `KPICard`: Reusable component with slots for Label, Value, Sparkline, Trend.
    - Props: `title`, `value`, `trendValue` (optional), `sparklineData` (optional).
- `ChartContainer`: Responsive wrapper for Recharts with Night Ops styling (custom tooltips, dark grid lines).
- `DataTable`: Sortable, paginated table for the details view.

### Specific Widgets
- `VolumeTrendChart`: Line/Area chart for `qty`.
- `BrandDistChart`: Bar chart for `brand_family`.
- `InsightList`: Simple list component for "New/At-risk" customers.

## 3. Placeholder Data JSON

```json
[
  {
    "report_month": "2023-10-01",
    "del_account": "ACC001",
    "delivery_name": "The Crown Inn",
    "post_code": "GL50 1AA",
    "distributor": "Inn Express",
    "internal_product_code": "FPBF050",
    "internal_product_name": "Black Fox Organic 500ml",
    "brand_family": "Black Fox",
    "format": "Bottle",
    "qty": 240,
    "duoi": "Each",
    "salesperson": "James Smith"
  },
  {
    "report_month": "2023-10-01",
    "del_account": "ACC002",
    "delivery_name": "Dunkerton Taproom",
    "post_code": "GL52 6NH",
    "distributor": "Direct",
    "internal_product_code": "FPPC033",
    "internal_product_name": "Premium Craft 330ml Can",
    "brand_family": "Craft",
    "format": "Can",
    "qty": 1200,
    "duoi": "Case",
    "salesperson": "Sarah Jones"
  },
  {
    "report_month": "2023-11-01",
    "del_account": "ACC001",
    "delivery_name": "The Crown Inn",
    "post_code": "GL50 1AA",
    "distributor": "Inn Express",
    "internal_product_code": "FPBF050",
    "internal_product_name": "Black Fox Organic 500ml",
    "brand_family": "Black Fox",
    "format": "Bottle",
    "qty": 360,
    "duoi": "Each",
    "salesperson": "James Smith"
  },
  {
    "report_month": "2023-11-01",
    "del_account": "ACC003",
    "delivery_name": "Bristol Cider House",
    "post_code": "BS1 5TY",
    "distributor": "Inn Express",
    "internal_product_code": "KGDR050",
    "internal_product_name": "Dunkertons Dry Keg 50L",
    "brand_family": "Dry",
    "format": "Keg",
    "qty": 5,
    "duoi": "Keg",
    "salesperson": "James Smith"
  },
  {
    "report_month": "2023-12-01",
    "del_account": "ACC004",
    "delivery_name": "New Venue London",
    "post_code": "SW1A 1AA",
    "distributor": "Inn Express",
    "internal_product_code": "FPBF050",
    "internal_product_name": "Black Fox Organic 500ml",
    "brand_family": "Black Fox",
    "format": "Bottle",
    "qty": 100,
    "duoi": "Each",
    "salesperson": "Sarah Jones"
  }
]
```
