# Project Status

**Last updated:** 2025-01-20 (Session handover)

## Purpose

Build a volume-led sales analytics dashboard for Dunkerton Cider that:
- Imports Inn Express distribution data (Excel)
- Maps distributor SKUs to internal products
- Tracks customer behavior (new, active, at-risk)
- Provides product performance insights
- Enables CSV exports for reporting

---

## PHASES Progress

### Phase 1: Database Foundation
| Component | Status | Notes |
|-----------|--------|-------|
| Core tables (6) | ✅ Written | `database/migrations/001_create_core_tables.sql` |
| Analytics views (11) | ✅ Written | `database/migrations/002_create_views.sql` |
| Seed data (26 products, 10 mappings) | ✅ Written | `database/migrations/003_seed_products.sql` |
| **Execute migrations on Supabase** | 🚧 BLOCKED | Need service_role key for MCP |

### Phase 2: Python Import Pipeline
| Component | Status | Notes |
|-----------|--------|-------|
| Config & DB helpers | ✅ Done | `tools/config.py`, `tools/db.py` |
| Detection logic | ✅ Done | `tools/detection.py` |
| Import script | ✅ Done | `tools/import_inn_express.py` |
| Virtual environment | ✅ Done | `.venv/` with dependencies |
| **Test with real data** | 🚧 Blocked | Waiting on database setup |

### Phase 3: Next.js Dashboard
| Component | Status | Notes |
|-----------|--------|-------|
| Project scaffold | ✅ Done | Next.js 14, TypeScript, Tailwind |
| Night Ops theme | ✅ Done | `tailwind.config.ts`, `globals.css` |
| Layout components | ✅ Done | AppShell, Header, Sidebar |
| KPI components | ✅ Done | KPICard, KPIDeck |
| Chart components | ✅ Done | VolumeTrendChart, BrandDistChart |
| Table components | ✅ Done | TopCustomersTable, TopProductsTable |
| Insight components | ✅ Done | NewCustomers, AtRisk, GapAnalysis |
| Export component | ✅ Done | ExportPanel |
| Supabase client | ✅ Done | `lib/supabase.ts`, `lib/queries.ts` |
| **Build & test** | 🚧 Blocked | Waiting on database setup |

### Phase 4: Deployment
| Component | Status | Notes |
|-----------|--------|-------|
| Vercel deployment | ⬜ Not started | After dashboard tested |
| Environment config | ⬜ Not started | |

---

## What Changed Since Last Update

- Created project structure from scratch
- Built all database migrations (tables, views, seed data)
- Built complete Python import pipeline
- Built complete Next.js dashboard with Night Ops theme
- Created `.env` files with Supabase credentials
- Attempted database migration - **blocked on MCP/credentials**
- User has anon key but needs service_role key for full access
- Cleaned up duplicate/junk config files

---

## Current Blocker

**MCP not connected** - Supabase MCP needs the `service_role` key (not `anon` key).

User keeps providing anon key. The service_role key:
- Is in Supabase Dashboard → Settings → API
- Has a "Reveal" button next to it
- Contains `"role":"service_role"` in the JWT (not `"role":"anon"`)

Without this, cannot:
- Run migrations via MCP
- Create tables programmatically
- Full database access

**Workaround:** User can manually run SQL in Supabase SQL Editor:
https://supabase.com/dashboard/project/qmqaegwhxtgosxibzdnx/sql/new

---

## Next 10 Actions

1. [ ] Get service_role key from Supabase (or run SQL manually)
2. [ ] Run `database/migrations/RUN_ALL_MIGRATIONS.sql` on Supabase
3. [ ] Verify tables created: `SELECT COUNT(*) FROM dim_product_internal;`
4. [ ] Test Python import: `python tools/import_inn_express.py --file data/raw/inn_express_2025_12.xlsx --month 2025-12-01`
5. [ ] Check mapping coverage (target ≥95%)
6. [ ] Install dashboard dependencies: `cd dashboard && npm install`
7. [ ] Run dashboard dev server: `npm run dev`
8. [ ] Verify KPIs display correctly
9. [ ] Test CSV export functionality
10. [ ] Deploy to Vercel

---

## Key Links

| Resource | Link |
|----------|------|
| Supabase Project | https://supabase.com/dashboard/project/qmqaegwhxtgosxibzdnx |
| Supabase SQL Editor | https://supabase.com/dashboard/project/qmqaegwhxtgosxibzdnx/sql/new |
| Supabase API Keys | https://supabase.com/dashboard/project/qmqaegwhxtgosxibzdnx/settings/api |
| Migration SQL | `database/migrations/RUN_ALL_MIGRATIONS.sql` |
| Test data | `data/raw/inn_express_2025_12.xlsx` |

---

## Files to Provide (User)

| What | Status |
|------|--------|
| Products CSV | ✅ Provided (26 products) |
| SKU Mappings CSV | ✅ Provided (10 mappings) |
| Inn Express test file | ✅ Provided (December 2025) |
| Supabase anon key | ✅ Provided |
| Supabase service_role key | ❌ Not yet provided |
| Database password | ✅ Provided |
