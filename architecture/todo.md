# Master Checklist — Dunkerton Sales Dashboard

## Milestone 7: In-Dashboard Data Import Feature

**Goal:** Enable self-service monthly data imports via dashboard UI (no CLI required)

**Status:** 🟡 Planning Complete, Ready for Build

**Green Gate Definition:** Build passes + Browser visual check + Import test with `inn_express_2026_1.xls` + Evidence logged

---

### Phase 1: Dependencies & Types
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Install `xlsx` package | ⬜ | `npm install` succeeds | | |
| Add TypeScript types to `types/index.ts` | ⬜ | Build ✅ | | ImportRun, ImportResult, ParsedPreview |

---

### Phase 2: Core Import Logic (lib/import/)
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Port `detection.ts` from Python | ⬜ | Build ✅ Unit test ✅ | | Brand/format/category detection |
| Create `parse-excel.ts` | ⬜ | Build ✅ Parse test file ✅ | | Header detection, column mapping |
| Create `product-matching.ts` | ⬜ | Build ✅ | | Two-tier matching logic |
| Create `import-pipeline.ts` | ⬜ | Build ✅ | | Main orchestrator |

---

### Phase 3: API Route
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Create `/api/import/route.ts` | ⬜ | Build ✅ API test ✅ | | FormData handling, calls pipeline |
| Test with actual .xls file | ⬜ | Import succeeds ✅ Metrics match Python ✅ | | Use `inn_express_2026_1.xls` |

---

### Phase 4: UI Components
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Create `FileDropZone.tsx` | ⬜ | Build ✅ Visual check ✅ | | Drag-drop + file picker |
| Create `ImportForm.tsx` | ⬜ | Build ✅ Visual check ✅ | | Month selector, preview, import button |
| Create `ImportResults.tsx` | ⬜ | Build ✅ Visual check ✅ | | Metrics display, unmapped SKUs |
| Create `ImportHistory.tsx` | ⬜ | Build ✅ Visual check ✅ | | Past imports table |

---

### Phase 5: Page & Navigation
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Create `/import/page.tsx` | ⬜ | Build ✅ Visual check ✅ | | Full page layout |
| Update `AppShell.tsx` nav | ⬜ | Build ✅ Visual check ✅ | | Add Upload icon + link |

---

### Phase 6: End-to-End Verification
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Import `inn_express_2026_1.xls` via UI | ⬜ | Import succeeds ✅ | | |
| Verify metrics match Python import | ⬜ | Coverage ≥95% ✅ | | 32 lines, 97% coverage |
| Verify idempotency (re-import same file) | ⬜ | 0 duplicates ✅ | | |
| Verify dashboard shows Jan 2026 data | ⬜ | Visual check ✅ | | Filter to Jan 2026, see 3 new customers |
| Test error handling (bad file) | ⬜ | Error message shown ✅ | | Upload .txt file, see clear error |

---

### Phase 7: Documentation
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Update `docs/STATUS.md` | ⬜ | File updated ✅ | | Add Phase 7 section |
| Update `docs/DECISIONS.md` | ⬜ | File updated ✅ | | Add ADR for TypeScript port decision |
| Update `docs/USER_GUIDE.md` | ⬜ | File updated ✅ | | Add import feature guide |
| Update `CLAUDE.md` | ⬜ | File updated ✅ | | Add /import to structure |

---

## Milestone 8: Customer Card with Notes

**Goal:** Add notes/call log section to customer drawer for tracking sales interactions

**Status:** ✅ **COMPLETE** (2026-02-10)

**Green Gate Definition:** Build passes + Browser visual check + Add/edit/delete note test + Database verification + Evidence logged

---

### Phase 1: Server Actions
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Create `customer-notes.ts` actions file | ✅ | Build ✅ | ✅ | addCustomerNote, updateCustomerNote, deleteCustomerNote |
| Implement `addCustomerNote` | ✅ | Build ✅ Function test ✅ | ✅ Browser test | Append to enrichment.notes array |
| Implement `updateCustomerNote` | ✅ | Build ✅ Function test ✅ | ✅ Browser test | Update note by ID |
| Implement `deleteCustomerNote` | ✅ | Build ✅ Function test ✅ | ✅ Browser test | Remove note by ID |

---

### Phase 2: UI Components
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Create `CustomerNotes.tsx` | ✅ | Build ✅ Visual check ✅ | ✅ Screenshot | Display notes list, add button |
| Create `NoteForm.tsx` | ✅ | Build ✅ Visual check ✅ | ✅ Screenshot | Type, content, tags inputs |
| Add note type badges | ✅ | Build ✅ Visual check ✅ | ✅ Screenshot | Call, Email, Meeting, Note |
| Add timestamp formatting | ✅ | Build ✅ Visual check ✅ | ✅ Screenshot | Relative time (e.g., "4m ago") |

---

### Phase 3: Integration
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Add "Notes" tab to CustomerDrawer | ✅ | Build ✅ Visual check ✅ | ✅ Screenshot | Alongside Details, Enrichment, History |
| Wire up CustomerNotes component | ✅ | Build ✅ Visual check ✅ | ✅ Screenshot | Pass customer data as props |

---

### Phase 4: End-to-End Verification
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Test add note | ✅ | Note appears ✅ DB updated ✅ | ✅ Browser test | Add call log, verify in UI and DB |
| Test edit note | ✅ | Note updates ✅ DB updated ✅ | ✅ Browser test | Edit content, verify changes |
| Test delete note | ✅ | Note removed ✅ DB updated ✅ | ✅ Browser test | Delete note, verify removal |
| Test persistence | ✅ | Notes persist ✅ | ✅ Browser test | Close/reopen drawer, notes still visible |
| Test empty state | ✅ | Empty state shown ✅ | ✅ Screenshot | Customer with no notes shows prompt |

---

## Milestone 9: Customer Map View

**Goal:** Create map page showing customers plotted by postcode coordinates

**Status:** 🟡 Planning Complete, Ready for Build

**Green Gate Definition:** Build passes + Browser visual check + Map renders + Markers clickable + Filter test + Evidence logged

**Pre-requisite:** Run `python3 tools/enrich_geo.py` to populate coordinates

---

### Phase 1: Dependencies
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Install leaflet packages | ⬜ | `npm install` succeeds | | leaflet, react-leaflet, @types/leaflet |
| Run geo enrichment script | ⬜ | Coordinates populated ✅ | | `python3 tools/enrich_geo.py` |
| Verify coordinates in DB | ⬜ | >0 customers with lat/long ✅ | | `SELECT COUNT(*) FROM dim_customer WHERE latitude IS NOT NULL` |

---

### Phase 2: Map Components
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Create `CustomerMap.tsx` | ⬜ | Build ✅ Visual check ✅ | | Leaflet map, dark mode tiles |
| Create `CustomerMarker.tsx` | ⬜ | Build ✅ Visual check ✅ | | Custom icons, popup with customer info |
| Add marker clustering (optional) | ⬜ | Build ✅ Visual check ✅ | | For dense areas (e.g., London) |

---

### Phase 3: Map Page
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Create `/map/page.tsx` | ⬜ | Build ✅ Visual check ✅ | | Server component, fetches customers |
| Add map to page layout | ⬜ | Build ✅ Visual check ✅ | | Full-height map, sidebar filters |
| Wire up filter state | ⬜ | Build ✅ Filter test ✅ | | Brand, format, date filters update markers |

---

### Phase 4: Navigation
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Add "Map" nav item to AppShell | ⬜ | Build ✅ Visual check ✅ | | MapPin icon, route to /dunkertons/map |

---

### Phase 5: End-to-End Verification
| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Map renders on page load | ⬜ | Map visible ✅ | | Navigate to /dunkertons/map |
| Markers plotted correctly | ⬜ | Marker count matches DB ✅ | | Count markers vs `SELECT COUNT(*)` |
| Marker popup works | ⬜ | Popup shows customer info ✅ | | Click marker, see name/city/postcode |
| Marker click opens drawer | ⬜ | Drawer opens ✅ | | Click "View Details" in popup |
| Filters update map | ⬜ | Markers filter ✅ | | Select "Black Fox", only BF customers shown |
| Responsive on mobile | ⬜ | Map usable at 375px ✅ | | Test on mobile viewport |

---

## Milestone 10: Customer Actions & Follow-ups

**Goal:** Add action items/follow-ups tracking for customers (e.g., "Call back next week", "Send samples", "Schedule tasting")

**Status:** 🟡 Planning

**Green Gate Definition:** Build passes + Browser visual check + Add/complete/delete action test + Due date filtering + Evidence logged

---

### Phase 1: Data Model

| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Design action schema | ⬜ | Schema documented ✅ | | id, customer_id, type, description, due_date, status, created_by |
| Decide storage location | ⬜ | Decision documented ✅ | | enrichment.actions array vs separate table |

---

### Phase 2: Server Actions

| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Create `customer-actions.ts` | ⬜ | Build ✅ | | addAction, updateAction, deleteAction, completeAction |
| Implement action CRUD | ⬜ | Build ✅ Function test ✅ | | Full create, read, update, delete |

---

### Phase 3: UI Components

| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Create `CustomerActions.tsx` | ⬜ | Build ✅ Visual check ✅ | | Display actions list, add button |
| Create `ActionForm.tsx` | ⬜ | Build ✅ Visual check ✅ | | Type, description, due date inputs |
| Add action type badges | ⬜ | Build ✅ Visual check ✅ | | Callback, Sample, Tasting, Meeting, Follow-up |
| Add due date indicator | ⬜ | Build ✅ Visual check ✅ | | Overdue (red), Due soon (yellow), Future (gray) |
| Add complete/uncomplete toggle | ⬜ | Build ✅ Visual check ✅ | | Checkbox to mark done |

---

### Phase 4: Integration

| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Add "Actions" tab to CustomerDrawer | ⬜ | Build ✅ Visual check ✅ | | Alongside Notes, Details, etc. |
| Wire up CustomerActions component | ⬜ | Build ✅ Visual check ✅ | | Pass customer data as props |

---

### Phase 5: Dashboard Integration (Optional)

| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Create "My Actions" widget | ⬜ | Build ✅ Visual check ✅ | | Show all pending actions across customers |
| Add due date filtering | ⬜ | Build ✅ Filter test ✅ | | Overdue, Today, This Week, All |
| Add action count badge | ⬜ | Build ✅ Visual check ✅ | | Show pending count in nav/header |

---

### Phase 6: End-to-End Verification

| Task | Status | Green Gate | Evidence | Notes |
|---|---|---|---|---|
| Test add action | ⬜ | Action appears ✅ DB updated ✅ | | Add "Call back next week", verify in UI and DB |
| Test complete action | ⬜ | Action marked done ✅ DB updated ✅ | | Check action, verify status change |
| Test delete action | ⬜ | Action removed ✅ DB updated ✅ | | Delete action, verify removal |
| Test due date sorting | ⬜ | Actions sorted ✅ | | Overdue first, then by due date |
| Test empty state | ⬜ | Empty state shown ✅ | | Customer with no actions shows prompt |

---

## Previous Milestones (Completed)

### Milestone 1: Database Foundation ✅
- Core tables, analytics views, seed data

### Milestone 2: Python Import Pipeline ✅
- CLI import script, detection logic, idempotent imports

### Milestone 3: Next.js Dashboard ✅
- Night Ops theme, KPI tiles, charts, tables, insights

### Milestone 4: Soft CRM ✅
- Customer drawer, enrichment (Google Maps + Instagram), manual edit

### Milestone 5: AI Agent (Agent D) ✅
- Chat widget, GPT-4o integration, 8 tools, voice input

### Milestone 6: Deployment ✅
- Vercel deployment, GitHub integration, production URL

---

## Green Gate Evidence Archive

### January 2026 Data Import (Python CLI)
- **Date:** 2026-02-10
- **Command:** `python3 tools/import_inn_express.py --file data/raw/inn_express_2026_1.xls --month 2026-01-01`
- **Result:** ✅ SUCCESS
- **Metrics:**
  - Lines imported: 32
  - Lines mapped: 30
  - Lines unmapped: 2
  - Coverage: 97.0% (exceeds 95% target)
  - New customers: 3
  - New SKUs: 1
- **Unmapped:** `CDCOBIB` (Craft, BIB 20L, 2 units)
- **Dashboard Verification:** ✅ Jan 2026 visible at http://localhost:3000/dunkertons

### Milestone 8: Customer Card with Notes
- **Date:** 2026-02-10
- **Result:** ✅ SUCCESS
- **Files Created:**
  - `dashboard/src/app/actions/customer-notes.ts` (236 lines)
  - `dashboard/src/components/crm/CustomerNotes.tsx` (204 lines)
  - `dashboard/src/components/crm/NoteForm.tsx` (106 lines)
- **Files Modified:**
  - `dashboard/src/components/crm/CustomerDetailsDrawer.tsx` (added Notes tab)
- **Browser Test:** ✅ PASSED
  - Empty state displayed correctly
  - Add note form works (type selector, content, tags)
  - Note persists after page reload
  - Note displays with type badge, timestamp, tags, author
  - Edit/delete functionality verified
- **Screenshots:**
  - Empty state: `empty_notes_state_1770735577377.png`
  - Added note: `added_note_state_1770735879993.png`
  - Recording: `testing_customer_notes_1770735536044.webp`
- **Database:** Notes stored in `dim_customer.enrichment.notes` JSONB array
