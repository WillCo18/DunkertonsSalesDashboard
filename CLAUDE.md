# Dunkerton Sales Dashboard - Project Memory

> **Start every task by reading `docs/STATUS.md` and `docs/DECISIONS.md`.**
> **If `docs/STATUS.md` conflicts with chat history, `docs/STATUS.md` wins.**

## What We're Building

A volume-led sales dashboard + soft CRM for Dunkerton Cider using Inn Express distribution data. The system imports Excel sales reports, maps products to internal SKUs, and provides analytics on customer behavior, product performance, and sales trends.

## Stack (Non-Negotiable)

| Layer | Technology |
|-------|------------|
| Database | Supabase Postgres |
| Import Pipeline | Python 3.11+ (pandas, openpyxl, supabase-py) |
| Dashboard | Next.js 14 (App Router, TypeScript, Tailwind CSS) |
| UI Components | shadcn/ui + Recharts |
| Theme | Night Ops dark theme (bg: #1D1D1D, surface: #2A2A2A, accent: #44D1B8) |

## Folder Structure

```
DunkertonsSales/
├── CLAUDE.md                 # This file (stable memory)
├── docs/
│   ├── STATUS.md             # Living status (read first!)
│   └── DECISIONS.md          # Decision log
├── database/
│   └── migrations/           # SQL migrations (001_, 002_, 003_)
├── tools/                    # Python import pipeline
├── dashboard/                # Next.js app
│   └── src/
│       ├── app/              # Pages
│       ├── components/       # UI components
│       ├── lib/              # Supabase client, queries
│       └── hooks/            # React hooks
├── data/
│   ├── raw/                  # Source Excel files
│   └── seed/                 # Product/mapping CSVs
└── .agent/                   # AI skills and rules
```

## Key Conventions

- **Idempotent imports**: Re-running same file creates no duplicates (MD5 line_key)
- **Two-tier product matching**: SKU code match → family+pack fallback
- **Target**: ≥95% mapping coverage by volume
- **6 KPIs**: Total volume, active customers, new customers, at-risk, top product, unmapped %

## Critical Files

| File | Purpose |
|------|---------|
| `database/migrations/RUN_ALL_MIGRATIONS.sql` | Combined DDL for all tables/views |
| `tools/import_inn_express.py` | Main import script |
| `data/seed/products.csv` | 26 internal products |
| `data/seed/product_mappings.csv` | 10 SKU mappings |

## Environment Setup

- `.env` - Python tools (SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY, SUPABASE_DB_PASSWORD)
- `dashboard/.env.local` - Next.js (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- MCP: `claude mcp add supabase -- npx -y @supabase/mcp-server --supabase-url URL --supabase-key SERVICE_ROLE_KEY`
