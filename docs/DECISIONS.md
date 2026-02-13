# Decision Log

Architecture Decision Records (ADRs) for Dunkerton Sales Dashboard.

---

## 2025-01-19: Database Schema Design

**Decision:** Use star schema with fact_shipments as central table, dimension tables for products/customers, and mapping table for SKU resolution.

**Why:**
- Star schema optimizes for analytical queries (aggregations, filters)
- Mapping table allows flexible SKU resolution without touching fact data
- Separate source vs internal product tables preserve raw data while normalizing

**Tables created:** import_runs, dim_product_internal, dim_product_source, map_product_source_to_internal, dim_customer, fact_shipments

---

## 2025-01-19: Two-Tier Product Matching

**Decision:** Match products using: (1) exact SKU code match, then (2) family+pack format fallback.

**Why:**
- Some distributor SKUs don't have exact mappings
- Family+pack fallback catches ~95% of remaining cases
- Preserves audit trail via mapping_method and mapping_confidence fields

---

## 2025-01-19: Idempotent Imports via MD5 Line Key

**Decision:** Generate MD5 hash of (report_month + del_account + source_sku + quantity) as line_key for deduplication.

**Why:**
- Safe to re-run imports without creating duplicates
- Handles partial imports gracefully
- Enables incremental updates

---

## 2025-01-19: Night Ops Theme

**Decision:** Use dark theme with specific color palette:
- Background: #1D1D1D
- Surface: #2A2A2A
- Accent: #44D1B8 (teal)
- Text: #EEEEEE

**Why:**
- Matches brand aesthetic from style-brief.md
- Reduces eye strain for dashboard users
- Professional appearance for B2B tool

---

## 2025-01-19: Next.js 14 with App Router

**Decision:** Use Next.js 14 App Router (not Pages Router) with TypeScript.

**Why:**
- App Router is the modern standard
- Better server component support
- Simpler data fetching patterns
- shadcn/ui works well with App Router

---

## 2025-01-19: Supabase for Backend

**Decision:** Use Supabase (hosted Postgres) instead of self-hosted database.

**Why:**
- Zero infrastructure management
- Built-in REST API (PostgREST)
- Easy auth if needed later
- Free tier sufficient for this use case

---

## 2025-01-20: Context Continuity System

**Decision:** Implement CLAUDE.md + docs/STATUS.md + docs/DECISIONS.md pattern.

**Why:**
- Maintains context across session windows
- STATUS.md is living document updated with progress
- DECISIONS.md provides architectural rationale
- Bootstrap prompt keeps new sessions aligned

---

## 2025-01-26: Soft CRM with Enrichment

**Decision:** Build CRM as a slide-out drawer within the dashboard (not a separate page). Enrichment via Apify (Google Maps + Instagram scrapers).

**Why:**
- Drawer keeps context (user can see dashboard while viewing customer)
- Apify provides reliable Google Maps and Instagram data
- Enrichment stored in dim_customer.enrichment JSONB column for flexibility
- Manual edit mode allows overrides and additions

---

## 2025-01-26: AI Agent (Agent D) with Tool Use

**Decision:** Embed GPT-4o chat agent with database tools using Vercel AI SDK.

**Why:**
- Natural language queries for sales team (non-technical users)
- Tool-calling pattern keeps data accurate (no hallucination of numbers)
- Voice input via transcription for mobile/hands-free use
- Streaming responses for good UX

**Tools:** search_customers, get_customer_details, get_customer_history, find_product_stockists, check_product_gaps, get_monthly_kpis, find_venue_contact, enrich_instagram

---

## 2026-01-27: Customer List Component

**Decision:** Add full customer list at bottom of dashboard, sorted by last order date (desc) then alphabetically.

**Why:**
- Provides complete customer overview (other widgets show subsets)
- Searchable and filter-aware (respects sidebar filters)
- Clickable rows open customer drawer for quick access
- Scrollable with sticky header to handle large lists

---

## 2026-01-27: Separate Stockist Tool from Gap Analysis

**Decision:** Added `find_product_stockists` tool separate from `check_product_gaps` for Agent D.

**Why:**
- "Who stocks Black Fox bottles" was incorrectly routed to gap analysis tool (which finds who stocks X but NOT Y)
- New tool uses getEnhancedGapAnalysis with showStocked=true/false
- Clear separation: stockist lookup (one product) vs gap analysis (two products)

---

## 2026-01-27: Website Scrape Fallback for Instagram

**Decision:** When Google Maps enrichment doesn't return Instagram, scrape the venue's website HTML for Instagram links.

**Why:**
- Google Maps often lacks social profile data
- Most venues link to their Instagram from their website
- Lightweight fallback (simple fetch + regex) with 5s timeout
- Non-blocking: failure doesn't affect rest of enrichment

---

## 2026-01-27: Deployment on Vercel (Root Path)

**Decision:** Deploy at root path on dunkertons-sales-dashboard.vercel.app. Custom domain (imagine-if.ai/salesdunkertons) deferred.

**Why:**
- Simpler deployment without basePath configuration
- Custom domain requires Cloudflare DNS + Vercel rewrite setup
- Domain on Namecheap with DNS on Cloudflare (subdomain approach recommended: sales.imagine-if.ai)

---

## Template for New Decisions

```
## YYYY-MM-DD: [Title]

**Decision:** [What was decided]

**Why:**
- [Reason 1]
- [Reason 2]

**Alternatives considered:**
- [Alternative 1] - rejected because [reason]
```
