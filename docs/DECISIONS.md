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
