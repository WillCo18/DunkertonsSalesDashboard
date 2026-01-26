# Dunkertons Sales Dashboard - Project Map (gemini.md)

## 📍 Core Objectives
- **North Star**: Create a premium, "Night Ops" style sales dashboard for Dunkertons Cider.
- **Source of Truth**: Supabase PostgreSQL (`fact_shipments`, `dim_customer`).
- **Tech Stack**: Next.js 14, Tailwind CSS, Supabase, Recharts, Playwright.

## 🚦 Verification Protocol (MANDATORY)
**NO FEATURE IS COMPLETE WITHOUT A GREEN GATE.**

### 1. The Smoke Test Rule
After **ANY** code change (feature added, bug fixed, refactor):
1.  **Run the Build**: `npm run build` (Ensures type safety and compilation).
2.  **Run Playwright**: `npx playwright test` (Runs all E2E tests).
    - If a specific component was touched, create/run a targeted test file (e.g., `e2e/matrix-debug.spec.ts`).
3.  **Visual Verification**: Screenshot the result if UI related.

### 2. The "Green Gate" Checklist
Before marking a task as `[x]` in `task.md` or notifying the user:
- [ ] Build passes (`npm run build`)
- [ ] Relevant E2E test passes (`npx playwright test ...`)
- [ ] Console logs checked for errors
- [ ] "Works on my machine" is NOT acceptable. PROVE IT.

## 📂 Architecture & State
- **Frontend**: `dashboard/src/app` (App Router)
- **Components**: `dashboard/src/components` (Functional, Tailwind)
- **State**: server-side `useSWR` for fetching, URL params for filters.
- **Blueprint**: [AI Features Plan](architecture/plan.md)

## 🛠 Active Workstream
- **Current Focus**: Planning "Agent D" (AI Chat + Upsell).
- **Status**: Blueprinting.
- **Next Step**: User Approval of Architecture -> Phase 1 Implementation.

## 📝 Change Log
- **[2026-01-24]**: Fixed Stocking Matrix data mapping (added normalization).
- **[2026-01-24]**: Implemented `handleCustomerClick` across all Insight widgets.
- **[2026-01-24]**: Instituted strict Playwright Verification Protocol.
