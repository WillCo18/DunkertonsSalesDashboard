# Feature Plan: In-Dashboard Data Import

**Created:** 2026-02-10
**Status:** Ready for implementation
**Priority:** High — blocks ongoing monthly data updates

---

## 1. WHY

The system currently imports Inn Express Excel files via a Python CLI script (`tools/import_inn_express.py`). This means:

- Only someone with terminal access and Python installed can import data
- The Vercel-deployed dashboard has no way to receive new data
- Every month when a new Inn Express report arrives, someone must manually run a command

We need a self-service import feature inside the dashboard so the user can upload a new Excel file, pick the month, and import it — all from the browser.

---

## 2. WHAT

A new `/import` page in the dashboard with:

1. **File picker** — drag-and-drop zone or file browser button (accepts `.xls`, `.xlsx`)
2. **Month selector** — dropdown or date picker for the report month (auto-suggests next month after latest data)
3. **Preview step** — shows parsed row count and detected columns before committing
4. **Import button** — runs the import pipeline server-side
5. **Results panel** — shows lines imported, mapping coverage %, new customers, new SKUs, unmapped SKUs list
6. **Import history** — table showing past imports from `import_runs` table

---

## 3. HOW — Architecture

### 3.1 Approach: TypeScript Port (not Python subprocess)

The Python import logic must be ported to TypeScript. Reasons:

- Vercel serverless functions cannot run Python
- Keeps the entire stack in one language (TypeScript)
- The Python logic is straightforward (~300 lines of parsing, regex matching, and Supabase inserts)
- The existing Python code serves as the exact specification

### 3.2 New Dependency

Install `xlsx` (SheetJS) for Excel parsing in the Next.js app:

```bash
cd dashboard && npm install xlsx
```

This replaces Python's `pandas` + `openpyxl` + `xlrd`. The `xlsx` package handles both `.xls` and `.xlsx` formats in the browser/Node.js.

### 3.3 File Structure — New Files

```
dashboard/src/
├── app/
│   ├── import/
│   │   └── page.tsx                    # Import page UI
│   └── api/
│       └── import/
│           └── route.ts                # API route: receives file, runs import
├── lib/
│   └── import/
│       ├── parse-excel.ts              # Excel parsing + column mapping
│       ├── detection.ts                # Brand family / pack format / category detection
│       ├── product-matching.ts         # Two-tier product matching
│       └── import-pipeline.ts          # Main orchestrator (ties it all together)
├── components/
│   └── import/
│       ├── FileDropZone.tsx            # Drag-and-drop file upload area
│       ├── ImportForm.tsx              # Month selector + import button + preview
│       ├── ImportResults.tsx           # Results summary after import
│       └── ImportHistory.tsx           # Table of past import_runs
└── types/
    └── index.ts                        # Add ImportRun, ImportResult types
```

### 3.4 Files to Modify

```
dashboard/src/
├── components/layout/AppShell.tsx      # Add "Import" nav item
├── types/index.ts                      # Add new types
├── package.json                        # Add xlsx dependency
└── next.config.js                      # May need to increase API body size limit
```

---

## 4. HOW — Detailed Implementation

### Step 1: Install dependency

```bash
cd dashboard && npm install xlsx
```

### Step 2: Create `src/lib/import/detection.ts`

Direct port of `tools/detection.py`. This is a 1:1 translation.

**Port from:** `tools/detection.py` (lines 1-197)

**What to port:**
- `BRAND_FAMILY_PATTERNS` array — 15 regex patterns mapping descriptions to brand families (Black Fox, Vintage, Craft, Premium, Dabinett, Browns, Breakwell, Kingston Black, Mulled, Perry, Dry, etc.)
- `PACK_FORMAT_PATTERNS` array — 12 regex patterns mapping descriptions/DUOI to pack formats (Mini Keg, Keg 30L, Keg 50L, BIB 10L/3L/20L, Bottle 660/500/375ml, Can 330ml)
- `FORMAT_TO_CATEGORY` map — maps pack format strings to category codes
- `detectFamily(description: string): string | null` — iterates patterns, returns first match
- `detectFormat(description: string, duoi?: string): string | null` — combines description + DUOI, iterates patterns
- `deriveCategory(packFormat: string | null): string` — lookup from FORMAT_TO_CATEGORY
- `detectAll(description: string, duoi?: string)` — returns `{ detectedFamily, detectedFormat, detectedCategory }`
- `parseQuantity(qty: any): number | null` — strip commas, parse float
- `cleanText(text: any): string | null` — trim whitespace
- `normalizePostcode(postcode: any): string | null` — uppercase, ensure space before last 3 chars

**Critical:** The regex patterns and their ORDER must be identical to the Python version. Order matters because more specific patterns (e.g. "black fox") must match before generic ones (e.g. "dry").

### Step 3: Create `src/lib/import/parse-excel.ts`

Port of the Excel parsing logic from `tools/import_inn_express.py` (lines 94-172).

**What to implement:**
- `parseInnExpressFile(buffer: ArrayBuffer): ParsedRow[]`
- Uses `xlsx` package to read the workbook from buffer
- **Header detection**: Iterate rows looking for one containing at least 2 of: "account", "delivery address", "qty", "sku", "salesperson" (case-insensitive). Same logic as Python line 116-123.
- **Column mapping**: Map found columns to standard names using the same mapping table (Python lines 136-147):
  - `customer_name` ← customer_name, customer, name, delivery_name, delivery_address_name
  - `del_account` ← del_account, account, account_id, customer_id, acc, inv_account
  - `delivery_address` ← delivery_address, address, addr, del_address, address_1
  - `delivery_city` ← delivery_city, city, town, address_4
  - `delivery_postcode` ← delivery_postcode, postcode, post_code, postal_code, zip
  - `source_sku` ← source_sku, sku, product_code, item_code, prod_code
  - `source_description` ← source_description, description, product_description, product_name, item_description
  - `duoi` ← duoi, unit_of_issue, uoi, pack_size
  - `quantity` ← quantity, qty, units, amount
  - `salesperson` ← salesperson, sales_person, rep, sales_rep, account_manager
- **Row filtering**: Remove rows where customer_name contains "total", "grand total", "subtotal" (case-insensitive). Remove rows with blank customer_name.
- Return array of typed row objects

### Step 4: Create `src/lib/import/product-matching.ts`

Port of `match_products()` from `tools/import_inn_express.py` (lines 230-306).

**What to implement:**
- `matchProducts(rows, internalProducts, existingMappings)` — returns rows with `internalProductCode`, `mappingMethod`, `mappingConfidence` added
- **Tier 1: SKU code match** — look up `source_sku` in the existing `map_product_source_to_internal` table. If found, use that mapping.
- **Tier 2: Family+pack fallback** — build a lookup of `{ [brandFamily+packFormat]: product }` from `dim_product_internal`. If the row's `detectedFamily` + `detectedFormat` matches a key, use that product. Set confidence to 0.85. Save the new mapping to `map_product_source_to_internal`.
- If neither matches, mark as `unmapped` with confidence 0.

### Step 5: Create `src/lib/import/import-pipeline.ts`

Main orchestrator. Port of `run_import()` from `tools/import_inn_express.py` (lines 524-632).

**What to implement:**

```typescript
async function runImport(
  fileBuffer: ArrayBuffer,
  fileName: string,
  reportMonth: string  // "YYYY-MM-01" format
): Promise<ImportResult>
```

**Pipeline steps (in order):**

1. **Validate month** — must be YYYY-MM-01 format, day must be 1
2. **Create import run** — insert into `import_runs` table with status "running", get back UUID
3. **Parse file** — call `parseInnExpressFile(fileBuffer)` → array of raw rows
4. **Transform rows** — for each row:
   - `cleanText()` all string fields
   - `normalizePostcode()` the postcode
   - `parseQuantity()` the quantity (skip row if null or ≤ 0)
   - Skip rows missing customer_name, source_sku, or source_description
   - `detectAll(description, duoi)` for brand family / format / category
   - Generate `del_account` if not present: MD5 of `"${name.toUpperCase()}|${postcode.toUpperCase()}"`, take first 16 chars
   - Generate `line_key`: MD5 of `"${reportMonth}|${delAccount}|${sourceSku}|${quantity}|${salesperson || ''}"`
5. **Load product data from Supabase** — fetch `dim_product_internal` (where is_active = true) and `map_product_source_to_internal`
6. **Match products** — run two-tier matching, save new mappings
7. **Upsert customers** — for each unique `del_account`:
   - Check if exists in `dim_customer`
   - If new: insert with first_seen = last_seen = reportMonth
   - If existing: update `last_seen` to reportMonth
8. **Upsert source products** — for each unique `source_sku`:
   - Check if exists in `dim_product_source`
   - If new: insert
   - If existing: skip (or update last_seen)
9. **Insert fact_shipments** — for each row, insert. If duplicate key error (line_key already exists), skip silently. This is the idempotency mechanism.
10. **Calculate metrics** — count lines imported, mapped, unmapped, coverage %, new customers
11. **Update import_runs** — set status "completed", write metrics
12. **Return results** — `ImportResult` object with all metrics + list of unmapped SKUs

**Supabase client for writes:** Use `SUPABASE_SERVICE_ROLE_KEY` (same pattern as `save-customer-enrichment.ts`). Create the admin client per-request inside the pipeline, not at module level.

**MD5 hashing:** Use Node.js `crypto` module: `crypto.createHash('md5').update(str).digest('hex')`

### Step 6: Create API route `src/app/api/import/route.ts`

**What to implement:**
- `POST` handler accepting `FormData` with:
  - `file` — the Excel file (File object)
  - `month` — the report month string ("YYYY-MM-01")
- Validate file exists and is .xls/.xlsx
- Validate month format
- Convert File to ArrayBuffer
- Call `runImport(buffer, fileName, month)`
- Return JSON response with import results
- Wrap in try/catch, return 500 on failure

**Follow the exact pattern from:** `src/app/api/transcribe/route.ts` — same FormData extraction approach.

**Important:** Vercel has a 4.5MB body limit on serverless functions by default. Inn Express files are ~25-33KB, so this is fine. But add to `next.config.js` just in case for future files:

```js
api: {
  bodyParser: {
    sizeLimit: '10mb',
  },
},
```

Actually, with App Router (not Pages Router), body parsing is handled natively. The default limit for Next.js App Router is 1MB for the body. Override it in the route file:

```typescript
export const config = {
  api: { bodyParser: false }  // Not needed for App Router
}
```

For App Router, set `maxDuration` if needed:

```typescript
export const maxDuration = 60  // seconds (Vercel Pro allows up to 300)
```

### Step 7: Create `src/components/import/FileDropZone.tsx`

**UI component — client component (`'use client'`)**

- Drag-and-drop zone with dashed border (Night Ops theme: border-border, bg-surface on hover)
- Also includes a hidden `<input type="file" accept=".xls,.xlsx">` triggered by click
- Shows file name and size once selected
- Uses `Upload` icon from lucide-react
- Visual states: empty, file-selected, dragging-over
- Props: `onFileSelect: (file: File) => void`

### Step 8: Create `src/components/import/ImportForm.tsx`

**UI component — client component**

- Contains `<FileDropZone />`
- Month selector: dropdown populated by fetching `getAvailableMonths()` and calculating the next month after the latest. Pre-selects the next expected month.
- Format: shows month as "January 2026" but stores as "2026-01-01"
- Preview section: once file is selected, immediately parses client-side (using xlsx in browser) to show row count and detected column names. This gives the user confidence before importing.
- "Import Data" button — calls `/api/import` with FormData
- Loading state with spinner during import
- Disables button if no file or no month selected
- On success: shows `<ImportResults />`
- On error: shows error message in red

### Step 9: Create `src/components/import/ImportResults.tsx`

**UI component — shows after successful import**

- Night Ops themed card/panel
- Metrics grid (similar to KPIDeck style):
  - Lines imported
  - Lines mapped / Lines unmapped
  - Mapping coverage % (with color: green ≥95%, amber 80-95%, red <80%)
  - New customers found
  - New SKUs found
- Unmapped SKUs table (if any): source_sku, description, detected family, detected format, volume
- "Import Another" button to reset the form
- Success message with green accent

### Step 10: Create `src/components/import/ImportHistory.tsx`

**UI component — shows past imports**

- Fetches from `import_runs` table (ordered by started_at desc)
- Table columns: Month, Filename, Status, Lines, Coverage %, Date
- Status badges: "completed" (green), "failed" (red), "running" (amber)
- Shows at bottom of the import page

### Step 11: Create `src/app/import/page.tsx`

**Page component — uses existing layout**

- Wrapped in `<AppShell>` (no sidebar needed for this page)
- Title: "Import Data" with subtitle "Upload Inn Express distribution files"
- Layout:
  1. `<ImportForm />` (top)
  2. `<ImportHistory />` (bottom)
- Dark theme, consistent with rest of dashboard

### Step 12: Update `src/components/layout/AppShell.tsx`

Add Import to the nav rail:

```typescript
import { LayoutDashboard, Users, Map, Settings, Menu, X, Upload } from 'lucide-react'

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { name: 'Accounts', icon: Users, href: '/accounts' },
  { name: 'Import', icon: Upload, href: '/import' },     // NEW
  { name: 'Map', icon: Map, href: '/map' },
]
```

### Step 13: Update `src/types/index.ts`

Add these types:

```typescript
export interface ImportRun {
  id: string
  report_month: string
  source_filename: string
  started_at: string
  completed_at: string | null
  status: 'running' | 'completed' | 'failed'
  lines_imported: number | null
  lines_mapped: number | null
  lines_unmapped: number | null
  volume_mapped: number | null
  volume_unmapped: number | null
  mapping_coverage_pct: number | null
  new_customers: number | null
  error_message: string | null
}

export interface ImportResult {
  importRunId: string
  linesImported: number
  linesMapped: number
  linesUnmapped: number
  mappingCoveragePct: number
  newCustomers: number
  newSkus: number
  unmappedSkus: Array<{
    sourceSku: string
    sourceDescription: string
    detectedFamily: string | null
    detectedFormat: string | null
    volume: number
  }>
}

export interface ParsedPreview {
  rowCount: number
  columns: string[]
  sampleRows: Record<string, any>[]
}
```

---

## 5. KEY IMPLEMENTATION DETAILS

### 5.1 MD5 Line Key (Idempotency)

The line_key is the PRIMARY KEY of fact_shipments. It MUST be generated identically to the Python version:

```
MD5("${reportMonth}|${delAccount}|${sourceSku}|${quantity}|${salesperson || ''}")
```

Example: `MD5("2026-01-01|a1b2c3d4e5f6g7h8|PDPR500|12|John Smith")` → `"f47ac10b..."``

If the line_key already exists in the database, the insert will fail with a duplicate key error. This is expected and should be silently skipped (counted as "skipped").

### 5.2 Del Account Generation

When the source file doesn't have a `del_account` column (or it's blank), generate one:

```
MD5("${customerName.toUpperCase()}|${postcode.toUpperCase()}").substring(0, 16)
```

### 5.3 Supabase Write Access

Use `SUPABASE_SERVICE_ROLE_KEY` environment variable (server-side only, never exposed to client). This is the same key used by the existing enrichment actions. It must be set in:
- `dashboard/.env.local` for local dev
- Vercel environment variables for production

The env var name in the codebase is `SUPABASE_SERVICE_ROLE_KEY` (check `save-customer-enrichment.ts` for the pattern).

### 5.4 Vercel Function Timeout

Default Vercel serverless function timeout is 10 seconds (Hobby) or 60 seconds (Pro). The import of a typical file (~200-400 rows) should complete in under 30 seconds. Set `maxDuration = 60` in the API route.

If the import is too slow due to row-by-row Supabase inserts, batch the inserts. Supabase supports batch inserts:

```typescript
// Instead of inserting one at a time:
supabase.from('fact_shipments').insert(singleRow)

// Batch in chunks of 100:
supabase.from('fact_shipments').insert(batchOf100Rows)
```

**Important:** For fact_shipments, individual inserts are needed because we want to catch and skip duplicates per-row. Alternative: use `upsert` with `onConflict: 'line_key'` and `ignoreDuplicates: true` to batch-insert while skipping duplicates:

```typescript
supabase.from('fact_shipments')
  .upsert(batch, { onConflict: 'line_key', ignoreDuplicates: true })
```

This is the preferred approach — it's much faster than individual inserts.

### 5.5 Client-Side Preview

The `xlsx` library can run in the browser. When the user picks a file, parse it client-side to show a quick preview (row count, column names, first 3 rows). This happens BEFORE hitting the API, giving instant feedback.

```typescript
import * as XLSX from 'xlsx'

const workbook = XLSX.read(arrayBuffer, { type: 'array' })
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const data = XLSX.utils.sheet_to_json(sheet)
```

Then on the server (API route), parse again with full validation and import.

---

## 6. ENVIRONMENT VARIABLES

No new env vars needed. The import uses:

| Variable | Where | Already exists? |
|----------|-------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client (read) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (writes) | Yes (used by enrichment actions) |

---

## 7. DOCUMENTATION UPDATES

After implementation, update:

### 7.1 `docs/STATUS.md`
- Add new section under phases or pending work: "Phase 7: Data Import UI — COMPLETE"
- Update "Data Range" to include January 2026
- Add to "What Changed This Session"

### 7.2 `docs/DECISIONS.md`
Add new ADR:
```
## 2026-02-XX: In-Dashboard Import Feature

**Decision:** Port Python import pipeline to TypeScript and add /import page with file upload + month selector.

**Why:**
- Eliminates need for CLI access to import new data
- Works on Vercel (no Python dependency)
- Self-service for non-technical users
- Reuses existing idempotency and matching logic

**Alternatives considered:**
- Python subprocess from API route — rejected: doesn't work on Vercel serverless
- Separate Python microservice — rejected: extra infrastructure to manage
```

### 7.3 `CLAUDE.md`
- Add `/import` to the folder structure description
- Add `src/lib/import/` to critical files
- Add `xlsx` to the stack table under "Import Pipeline"
- Update "Key Conventions" if anything changes

---

## 8. TESTING CHECKLIST

After building, verify with the actual file `data/raw/inn_express_2026_1.xls`:

- [ ] File upload accepts .xls format
- [ ] Header row is detected correctly
- [ ] Column mapping works (check all 10 column types)
- [ ] Row count matches expected (compare with Python: `python3 tools/import_inn_express.py --file data/raw/inn_express_2026_1.xls --month 2026-01-01` in dry-run mode if available, or just count rows in Excel)
- [ ] Brand family detection matches Python output for same descriptions
- [ ] Pack format detection matches Python output
- [ ] Line keys generated identically to Python (test with a known row)
- [ ] Idempotency: importing same file twice doesn't create duplicates
- [ ] New customers are created in dim_customer
- [ ] Existing customers get last_seen updated
- [ ] fact_shipments rows are inserted correctly
- [ ] import_runs record shows correct metrics
- [ ] Mapping coverage % is ≥95%
- [ ] Unmapped SKUs report is accurate
- [ ] Dashboard KPIs update after import (January 2026 data appears)
- [ ] Month filters include January 2026
- [ ] Import history table shows the run
- [ ] Error handling: upload a non-Excel file, get a clear error
- [ ] Error handling: select a month that already has data, see skipped count

---

## 9. IMPLEMENTATION ORDER

Build in this sequence to ensure each piece can be tested before moving on:

1. `npm install xlsx`
2. Types (`types/index.ts` additions)
3. `lib/import/detection.ts` — can unit test standalone
4. `lib/import/parse-excel.ts` — can test by parsing the actual .xls file
5. `lib/import/product-matching.ts`
6. `lib/import/import-pipeline.ts` — the orchestrator
7. `api/import/route.ts` — API endpoint
8. `components/import/FileDropZone.tsx`
9. `components/import/ImportForm.tsx`
10. `components/import/ImportResults.tsx`
11. `components/import/ImportHistory.tsx`
12. `app/import/page.tsx` — the page
13. `AppShell.tsx` — add nav link
14. Test end-to-end with `inn_express_2026_1.xls`
15. Documentation updates

---

## 10. REFERENCE: SOURCE FILES TO PORT FROM

| TypeScript target | Python source | Lines |
|---|---|---|
| `lib/import/detection.ts` | `tools/detection.py` | All (1-197) |
| `lib/import/parse-excel.ts` | `tools/import_inn_express.py` | 94-172 (parse_inn_express_file) |
| `lib/import/product-matching.ts` | `tools/import_inn_express.py` | 230-306 (match_products) |
| `lib/import/import-pipeline.ts` | `tools/import_inn_express.py` | 48-66 (generate_line_key, generate_del_account), 175-228 (transform_row), 309-441 (upsert_customers, upsert_product_source, insert_fact_shipments), 444-479 (calculate_metrics), 524-632 (run_import) |

---

## 11. PATTERNS TO FOLLOW

| Pattern | Example file | Notes |
|---|---|---|
| API route with FormData | `src/app/api/transcribe/route.ts` | Same file upload approach |
| Server-side Supabase writes | `src/app/actions/save-customer-enrichment.ts` | SERVICE_ROLE_KEY pattern |
| Page with AppShell | `src/app/accounts/page.tsx` | Layout wrapping |
| Night Ops themed components | Any component in `src/components/` | Use bg-surface, border-border, text-accent classes |
| Client component pattern | `src/components/insights/EnhancedGapAnalysis.tsx` | 'use client' + hooks + async calls |
