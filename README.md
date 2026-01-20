# Dunkerton Sales Dashboard

Volume-led sales analytics and customer segmentation for Dunkerton Cider.

## Overview

This project provides a complete sales analytics solution built from Inn Express distribution data:

- **Import Pipeline**: Python scripts for processing monthly Excel reports
- **Database**: Supabase Postgres with optimized schema for analytics
- **Dashboard**: Next.js web application with Night Ops dark theme

## Tech Stack

| Component | Technology |
|-----------|------------|
| Database | Supabase Postgres |
| Import Pipeline | Python 3.10+ |
| Dashboard | Next.js 14, React, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Charts | Recharts |
| Data Fetching | SWR |

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Python 3.10+
- Supabase account

### 2. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Note your Project URL and API keys
3. Copy `.env.example` to `.env` and fill in credentials:

```bash
cp .env.example .env
```

### 3. Database Setup

Run migrations in the Supabase SQL Editor (in order):

```sql
-- Run each file in database/migrations/
-- 001_create_core_tables.sql
-- 002_create_views.sql
-- 003_seed_products.sql (edit with your actual products first)
```

### 4. Python Pipeline Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Test the import
python tools/import_inn_express.py --file data/raw/test.xlsx --month 2024-07-01
```

### 5. Dashboard Setup

```bash
cd dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 to view the dashboard.

## Project Structure

```
├── database/
│   └── migrations/          # SQL migrations
├── data/
│   ├── raw/                 # Source Excel files (gitignored)
│   └── seed/                # Product and mapping CSVs
├── tools/
│   ├── import_inn_express.py    # Main import script
│   ├── config.py            # Configuration
│   ├── db.py                # Database helpers
│   └── detection.py         # Brand/format detection
├── dashboard/
│   └── src/
│       ├── app/             # Next.js pages
│       ├── components/      # React components
│       ├── hooks/           # Custom hooks
│       ├── lib/             # Utilities
│       └── types/           # TypeScript types
├── .agent/
│   ├── skills/              # Agent skills
│   └── rules/               # Project rules
└── resources/
    └── ui-references/       # Design references
```

## Usage

### Importing Data

```bash
# Import a month's data
python tools/import_inn_express.py --file data/raw/inn_express_2024_07.xlsx --month 2024-07-01

# Re-running is safe (idempotent)
```

### Dashboard Features

- **6 KPI Tiles**: Total units, active customers, new customers, at-risk, top brand, top SKU
- **Volume Trend Chart**: Monthly volume by brand family
- **Top Performers**: Customer and product rankings
- **Insights**: New customers, at-risk alerts, gap opportunities
- **Filters**: Month, brand, format, salesperson
- **CSV Export**: Download filtered data

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (for imports) |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as SUPABASE_URL (for dashboard) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as SUPABASE_KEY (for dashboard) |

### Seed Data

Before importing, populate seed files:

1. `data/seed/products.csv` - Your 28 product SKUs
2. `data/seed/product_mappings.csv` - Known Inn Express to Dunkerton mappings

## Quality Targets

- **Mapping Coverage**: >= 95% of volume mapped to internal SKUs
- **Idempotency**: Safe to re-run imports
- **Performance**: Dashboard loads in < 2 seconds

## Development

### Adding New Products

1. Add to `data/seed/products.csv`
2. Run seed migration or direct INSERT
3. Add mapping if known Inn Express SKU exists

### Debugging Low Coverage

```sql
-- Find unmapped SKUs
SELECT * FROM v_unmapped_skus ORDER BY total_volume_unmapped DESC;

-- Add manual mapping
INSERT INTO map_product_source_to_internal
(distributor, source_sku, internal_product_code, mapping_method, mapping_confidence)
VALUES ('Inn Express', 'NEWSKU', 'FPCRAFT50', 'manual_override', 1.00);
```

## Deployment

### Dashboard (Vercel)

1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Import Pipeline

Run locally or on a scheduled job (cron, GitHub Actions).

## License

Private - Dunkerton Cider internal use only.
