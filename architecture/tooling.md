# Tooling Decisions — Dunkerton Sales Dashboard

**Last Updated:** 2026-02-10

---

## Tech Stack

| Layer | Choice | Reasoning |
|---|---|---|
| **Database** | Supabase (Postgres) | Zero infrastructure, built-in REST API, free tier sufficient, easy auth if needed later |
| **Import Pipeline** | Python 3.11+ (pandas, openpyxl, supabase-py) | Excel parsing, data transformation, existing team familiarity |
| **Dashboard Framework** | Next.js 14 (App Router, TypeScript) | Modern standard, server components, simpler data fetching, shadcn/ui compatibility |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first, component library, Night Ops theme support |
| **Charts** | Recharts | React-native, composable, good TypeScript support |
| **UI Theme** | Night Ops (custom dark theme) | Brand aesthetic, reduces eye strain, professional B2B appearance |
| **Enrichment** | Apify (Google Maps + Instagram scrapers) | Reliable data sources, managed infrastructure, pay-per-use |
| **AI Agent** | OpenAI GPT-4o via Vercel AI SDK | Tool calling, streaming, voice transcription, integrated with Next.js |
| **Hosting** | Vercel | Serverless, auto-deploy from GitHub, optimized for Next.js, free tier |
| **Version Control** | GitHub | Standard, integrates with Vercel auto-deploy |
| **Environment** | `.env` (Python), `.env.local` (Next.js) | Standard practice, gitignored |

---

## Skills Installed

| Skill | Scope | Purpose |
|---|---|---|
| **Vercel Optimization** | Project (`.agent/skills/vercel-optimization/`) | Standards for architecting Python/Next.js for Vercel deployment |
| **customer-enrichment** | Project (`.agent/skills/customer-enrichment/`) | Google Maps + Instagram data via Apify Actors |
| **dashboard-ui** | Project (`.agent/skills/dashboard-ui/`) | Night Ops dark mode dashboard design patterns |
| **data-import** | Project (`.agent/skills/data-import/`) | Inn Express data import workflow and debugging |
| **supabase-db** | Project (`.agent/skills/supabase-db/`) | Supabase database management, migrations, queries |

---

## MCP Servers

| Server | Connection Status | Verified Date | Purpose |
|---|---|---|---|
| **supabase-mcp-server** | ✅ Connected | 2026-01-19 | Database operations, migrations, schema management |
| **actors-mcp-server** | ✅ Connected | 2026-01-26 | Apify Actor integration for enrichment |
| **airtable** | ✅ Available | N/A | Not actively used, but configured |
| **firecrawl-mcp** | ✅ Available | N/A | Web scraping fallback (not actively used) |

**MCP Config Location:** `~/.gemini/antigravity/mcp_config.json`

---

## Agent Architecture

**Type:** Standard (Single Agent)

**Reasoning:** 
- Project complexity is medium (6 phases, ~10 milestones)
- Single agent can handle full-stack (Python + Next.js + DB)
- No need for parallel agents (frontend/backend split)
- Planning done via chat/planning mode, execution via terminal agent

**Agent Capabilities:**
- Terminal command execution
- File editing (TypeScript, Python, SQL, Markdown)
- Browser automation (visual verification)
- MCP tool access (Supabase, Apify)

---

## Verification Strategy

**Project Type:** Web app with UI + Data pipeline

**Green Gate Definition:**

For **Dashboard Features:**
```
✅ Build passes (npm run build)
✅ Browser agent visual check at /dunkertons route
✅ Functional test (e.g., filter to specific month, verify KPIs update)
✅ Evidence logged (screenshot + timestamp)
```

For **Data Pipeline (Python):**
```
✅ Script executes without error
✅ Output matches expected (e.g., import metrics, coverage %)
✅ Database state verified (e.g., row counts, no duplicates)
✅ Evidence logged (terminal output + metrics)
```

For **Import Feature (Hybrid):**
```
✅ Build passes
✅ API route test (upload file, verify response)
✅ Browser visual check (upload UI, results display)
✅ End-to-end test (import actual file, verify dashboard updates)
✅ Idempotency test (re-import same file, 0 duplicates)
✅ Evidence logged (screenshots + metrics comparison)
```

---

## Browser Verification Level

**Level:** Visual + Functional

**Tools:**
- Antigravity Browser Extension (visual checks, interaction testing)
- Playwright (installed but not actively used for E2E yet)

**Typical Verification Flow:**
1. Start dev server (`npm run dev`)
2. Navigate to feature route (e.g., `/dunkertons`, `/dunkertons/import`)
3. Visual check: layout, theme, responsiveness
4. Functional check: interact with filters, buttons, forms
5. Verify data updates (e.g., KPIs change when filters applied)
6. Screenshot evidence

---

## Environment Variables

### Python (`.env`)
```
SUPABASE_URL=https://qmqaegwhxtgosxibzdnx.supabase.co
SUPABASE_KEY=<anon_key>
SUPABASE_SERVICE_KEY=<service_role_key>
SUPABASE_DB_PASSWORD=<db_password>
```

### Next.js (`dashboard/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://qmqaegwhxtgosxibzdnx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
OPENAI_API_KEY=<openai_key>
APIFY_API_TOKEN=<apify_token>
```

**Security:**
- All `.env` files are gitignored
- Service role keys never exposed to client
- Vercel environment variables configured for production

---

## Connection Verification Log

### Supabase
- **Test Date:** 2026-01-19
- **Method:** `supabase-py` client connection test
- **Result:** ✅ SUCCESS
- **Tables Verified:** `fact_shipments`, `dim_customer`, `dim_product_internal`, `import_runs`

### Apify
- **Test Date:** 2026-01-26
- **Method:** `actors-mcp-server` search and fetch-actor-details
- **Result:** ✅ SUCCESS
- **Actors Verified:** `compass/crawler-google-places`, `apify/instagram-scraper`

### Vercel Deployment
- **Test Date:** 2026-01-27
- **Method:** GitHub push → auto-deploy
- **Result:** ✅ SUCCESS
- **Production URL:** https://dunkertons-sales-dashboard.vercel.app/

---

## Development Workflow

### Local Development
1. **Python:** Virtual environment (`venv/`) with `requirements.txt`
2. **Next.js:** `npm run dev` in `dashboard/`
3. **Database:** Supabase hosted (no local Postgres needed)

### Deployment
1. **Push to GitHub:** `git push origin main`
2. **Auto-deploy:** Vercel detects push, builds, deploys
3. **Verification:** Visit production URL, run smoke test

### Data Import (Current - CLI)
1. Receive Excel file from Inn Express
2. Save to `data/raw/`
3. Run `python3 tools/import_inn_express.py --file <path> --month YYYY-MM-01`
4. Verify metrics (coverage ≥95%)
5. Check dashboard for new data

### Data Import (Future - UI)
1. Navigate to `/dunkertons/import`
2. Upload file via drag-drop or file picker
3. Select month from dropdown
4. Preview parsed data
5. Click "Import Data"
6. Review results (metrics, unmapped SKUs)
7. Verify dashboard updates

---

## Known Constraints

### Vercel
- **Function Timeout:** 10s (Hobby) / 60s (Pro) - set `maxDuration = 60` for import route
- **Body Size Limit:** 4.5MB default (Inn Express files ~25-33KB, well within limit)
- **Serverless:** No persistent file system, no Python runtime (hence TypeScript port needed)

### Supabase
- **Free Tier Limits:** 500MB database, 2GB bandwidth/month (currently well within)
- **Connection Pooling:** Use connection pooler for serverless (already configured)

### Apify
- **Free Tier:** $5/month credit (sufficient for current enrichment volume)
- **Rate Limits:** Managed by Apify, no issues encountered

---

## Future Considerations

### Potential Upgrades
- **Playwright E2E Tests:** Automate full user flow testing
- **Custom Domain:** `sales.imagine-if.ai` (DNS on Cloudflare, domain on Namecheap)
- **Scheduled Imports:** Cron job to auto-import when new files appear in cloud storage
- **Multi-distributor Support:** Extend beyond Inn Express to other wholesalers

### Monitoring
- **Error Tracking:** Consider Sentry for production error monitoring
- **Analytics:** Consider Vercel Analytics or Plausible for usage tracking
- **Uptime:** Vercel provides basic uptime monitoring
