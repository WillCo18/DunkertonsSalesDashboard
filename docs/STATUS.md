# Project Status

**Last updated:** 2026-01-27

## Purpose

Volume-led sales analytics dashboard + soft CRM for Dunkerton Cider using Inn Express distribution data. Imports Excel sales reports, maps products to internal SKUs, and provides analytics on customer behavior, product performance, and sales trends.

---

## PHASES Progress

### Phase 1: Database Foundation -- COMPLETE
| Component | Status | Notes |
|-----------|--------|-------|
| Core tables (6) | ✅ Done | fact_shipments, dim_customer, dim_product_internal, etc. |
| Analytics views (11) | ✅ Done | v_top_customers, v_at_risk_customers, v_brand_family_trend, etc. |
| Seed data | ✅ Done | 26 products, 10+ SKU mappings |

### Phase 2: Python Import Pipeline -- COMPLETE
| Component | Status | Notes |
|-----------|--------|-------|
| Import script | ✅ Done | `tools/import_inn_express.py` |
| Detection logic | ✅ Done | Brand family + pack format detection |
| Idempotent imports | ✅ Done | MD5 line_key deduplication |
| Data imported | ✅ Done | July 2025 - January 2026 |

### Phase 3: Next.js Dashboard -- COMPLETE
| Component | Status | Notes |
|-----------|--------|-------|
| Night Ops theme | ✅ Done | Dark theme with #44D1B8 accent |
| KPI tiles | ✅ Done | Volume, active customers, new, at-risk, top brand, top SKU |
| Charts | ✅ Done | Volume trend (Recharts), brand distribution |
| Tables | ✅ Done | Top customers, top products |
| Insights | ✅ Done | New customers, returning, at-risk, lapsed, gap analysis |
| Enhanced gap analysis | ✅ Done | "Who stocks X but not Y" with brand/format filters |
| Cross-product gap analysis | ✅ Done | Compare any two brand/format combos |
| Multi-month filtering | ✅ Done | Select multiple months, brand, format, salesperson |
| Raw data view | ✅ Done | Toggle to see granular shipment records |
| Customer list | ✅ Done | Full list at bottom, sorted by last order date, searchable |
| Export panel | ✅ Done | CSV export for various datasets |

### Phase 4: Soft CRM -- COMPLETE
| Component | Status | Notes |
|-----------|--------|-------|
| Customer details drawer | ✅ Done | Slides in from right, 700px |
| Overview tab | ✅ Done | Social snapshot, address, coordinates |
| Stocking matrix | ✅ Done | Visual grid of what customer stocks |
| Order history tab | ✅ Done | Filterable by brand, shows all shipments |
| Contacts & info tab | ✅ Done | Phone, website, email, Instagram, contacts |
| Auto-enrich (Google Maps) | ✅ Done | Apify crawler for phone, website, socials |
| Auto-enrich (Instagram) | ✅ Done | Followers, bio, latest posts via Apify |
| Website scrape fallback | ✅ Done | Scrapes venue website for Instagram if not on Google Maps |
| Manual edit mode | ✅ Done | Edit contacts, phone, email, socials inline |
| Save to database | ✅ Done | Enrichment data persisted to dim_customer.enrichment |

### Phase 5: AI Agent (Agent D) -- COMPLETE
| Component | Status | Notes |
|-----------|--------|-------|
| Chat widget | ✅ Done | Floating bottom-right, Night Ops themed |
| GPT-4o integration | ✅ Done | Via Vercel AI SDK (streamText) |
| Voice input | ✅ Done | Transcription via /api/transcribe |
| Tool: search_customers | ✅ Done | Find specific pubs/venues |
| Tool: get_customer_details | ✅ Done | Full customer profile |
| Tool: get_customer_history | ✅ Done | Past orders |
| Tool: find_product_stockists | ✅ Done | Who stocks / doesn't stock a product |
| Tool: check_product_gaps | ✅ Done | Who stocks X but not Y |
| Tool: get_monthly_kpis | ✅ Done | Company/brand level metrics |
| Tool: find_venue_contact | ✅ Done | Google Maps enrichment |
| Tool: enrich_instagram | ✅ Done | Instagram deep dive |

### Phase 6: Deployment -- COMPLETE
| Component | Status | Notes |
|-----------|--------|-------|
| Vercel deployment | ✅ Done | Auto-deploys from GitHub master |
| GitHub repo | ✅ Done | WillCo18/DunkertonsSalesDashboard |
| Production URL | ✅ Done | https://dunkertons-sales-dashboard.vercel.app/ |
| Environment variables | ✅ Done | Supabase + OpenAI + Apify keys in Vercel |

---

## What Changed This Session (2026-01-27)

- Fixed Vercel build: excluded `scripts/` from tsconfig.json, added dotenv devDep
- Added full customer list at bottom of dashboard (sorted by last order, searchable, filter-aware)
- Fixed pack format filtering in customer list query (product_code vs internal_product_code)
- Added `find_product_stockists` tool to Agent D (was incorrectly using gap analysis for "who stocks X" queries)
- Fixed website links missing `https://` prefix in CRM drawer
- Added website scrape fallback for Instagram handle discovery during enrichment
- Improved social_profiles parsing to handle both array and object formats from Google Maps
- Temporarily added then reverted basePath config (domain setup deferred)

---

## Pending / Future Work

- [ ] Custom domain setup: `sales.imagine-if.ai` or `imagine-if.ai/salesdunkertons` (DNS on Cloudflare, domain on Namecheap)
- [ ] Accounts page (`/accounts`) - exists but needs review
- [ ] Additional data imports (new months as they become available)
- [ ] Playwright E2E tests (framework installed, tests written)

---

## Key Links

| Resource | Link |
|----------|------|
| Production | https://dunkertons-sales-dashboard.vercel.app/ |
| GitHub | https://github.com/WillCo18/DunkertonsSalesDashboard |
| Supabase Project | https://supabase.com/dashboard/project/qmqaegwhxtgosxibzdnx |
| Vercel Project | Vercel Dashboard (dunkertons-sales-dashboard) |

---

## Data Range

Database contains sales data from **July 2025 to January 2026** (7 months).
