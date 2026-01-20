---
name: dashboard-ui
description: Designs and builds a slick modern dark-mode dashboard UI in the "Night Ops" style. Use when creating dashboard pages, KPI tiles, charts, tables, filters, or any UI layout for the Dunkerton Sales project.
---

# Dashboard UI Skill (Night Ops)

## Goal
Produce a slick, modern dashboard UI that is dense, readable, and fast to scan, matching the references in `resources/ui-references/`.

## When to use
Use this skill when the user asks for any of:
- dashboard layout, grid, tiles, cards
- KPI tiles, sparklines, charts, tables
- filters, search, segment builders, export panels
- styling, component system, design tokens
- polishing UI to look modern and non-clunky

Do not use this skill for:
- database schema design
- ingestion scripts
- metric logic definitions (those belong in architecture and tools)

## Source of truth for style
- `resources/ui-references/style-brief.md`
- Any images in `resources/ui-references/`

If there is a conflict, prefer `style-brief.md`.

## Design principles
- Dark ops cockpit. Dense, clean, fast to scan.
- Modular cards with consistent padding and subtle borders.
- High contrast typography. Small labels, big numbers, clear hierarchy.
- Teal accent for highlights and selected states.
- Avoid noisy colour palettes and heavy shadows.
- Every view should answer: "What changed?", "Who matters?", "What action next?"

## Layout skeleton (not a fixed grid)
Default structure:
1. Left filter rail (always visible)
2. Top row KPI tiles (5 to 7)
3. Main area: trend chart + top customers + top SKUs
4. Insights: new customers, at-risk customers, gap opportunities
5. Exports: segment builder + CSV download actions

The exact tile arrangement can change, but keep the structure recognisable.

## Components to use
Prefer:
- shadcn/ui components
- Tailwind for styling
- Recharts for charts

Component patterns:
- KPI Tile: label, value, delta, tiny sparkline
- Chart Card: compact title, subtle gridlines, crisp tooltip, clear legend
- Table: sticky header, tight rows, conditional formatting
- Filter Rail: month picker, multi-selects, quick chips, clear "Reset" action
- Insight List: action-first lists with counts and quick drill-down links
- Export Panel: saved segments, build segment, download CSV

## Tokens (apply consistently)
Use tokens from `resources/ui-references/style-brief.md`. Default:
- bg: #1D1D1D
- surface: #2A2A2A
- border: rgba(238,238,238,0.10)
- text primary: #EEEEEE
- text secondary: rgba(238,238,238,0.65)
- accent: #44D1B8

Do not introduce new colours unless required for a specific status state.

## Interaction rules
- Hover states are subtle.
- Selected states use a teal outline or glow effect.
- Click-to-filter is allowed where it makes sense.
- Tooltips: compact, high contrast, not oversized.
- Empty states: show what to do next.

## Quality checklist (must pass before presenting)
- [ ] Looks modern and consistent with `resources/ui-references/`
- [ ] Spacing is even, no cramped sections
- [ ] Typography hierarchy is clear
- [ ] Tables are styled, not raw defaults
- [ ] Charts are readable with subtle gridlines
- [ ] Filters are usable and do not overwhelm
- [ ] UI supports quick scanning in under 5 seconds
- [ ] No unnecessary colours or heavy shadows

## Output expectations
When generating UI:
- Provide the page layout structure first.
- Then provide the component list.
- Then implement the UI using the chosen stack conventions.
- If data is not available yet, use realistic placeholder data shapes that match our planned schema.
