# Dunkerton Sales Dashboard - Project Rules

## Project Overview
Volume-led sales dashboard + soft CRM for Dunkerton Cider using Inn Express distribution data.

## Tech Stack
- **Database**: Supabase Postgres
- **Import Pipeline**: Python 3.10+
- **Dashboard**: Next.js 14 + React + Tailwind + shadcn/ui
- **Charts**: Recharts
- **Data Fetching**: SWR

## Code Style

### TypeScript/React
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use `'use client'` directive for client components
- Import types from `@/types`
- Use path aliases (`@/components`, `@/lib`, etc.)

### Python
- Python 3.10+ with type hints
- Use pathlib for file paths
- Follow PEP 8 style guide
- Keep functions focused and documented

### SQL
- Use lowercase for SQL keywords
- Prefix views with `v_`
- Use descriptive column names
- Add indexes for frequently queried columns

## UI Guidelines

### Night Ops Theme
- Background: `#1D1D1D`
- Surface: `#2A2A2A`
- Accent: `#44D1B8` (teal)
- Text: `#EEEEEE`

### Design Principles
- Dark ops cockpit aesthetic
- Dense, clean, fast to scan
- High contrast typography
- Subtle borders and shadows
- Teal accent for highlights and selected states

### Component Patterns
- KPI tiles: Label, value, delta, optional sparkline
- Tables: Sticky header, tight rows, hover states
- Charts: Subtle gridlines, crisp tooltips
- Filters: Multi-select checkboxes, month picker

## Commit Conventions
Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `docs:` Documentation
- `style:` Formatting, no code change
- `test:` Tests

Example: `feat: add at-risk customer filtering`

## File Organization

```
/database/migrations/     # SQL migrations (numbered)
/data/seed/              # CSV seed files
/data/raw/               # Source data files (gitignored)
/tools/                  # Python import pipeline
/dashboard/              # Next.js application
/.agent/                 # Agent configuration
```

## Data Conventions

### Date Formats
- Report month: Always first of month (`YYYY-MM-01`)
- Timestamps: ISO 8601 with timezone

### Customer Identification
- Use `del_account` as primary key
- Generate from `MD5(name + postcode)` if not provided

### Product Matching
1. SKU code match (confidence 1.00)
2. Family + Pack fallback (confidence 0.85)
3. Unmapped (confidence 0.00)

## Quality Targets
- Mapping coverage: >= 95% by volume
- Import idempotency: Safe to re-run
- Dashboard load time: < 2 seconds

## Environment Variables
Never commit credentials. Use `.env` files:
- `.env.example` - Template with placeholder values
- `.env` - Local development (gitignored)
- Vercel/hosting platform for production
