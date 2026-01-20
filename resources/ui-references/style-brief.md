# Dashboard UI Style Brief (Night Ops)

## Style
Dark mode "ops cockpit".
Dense, clean, fast to scan.

## Layout skeleton (not fixed grid)
- Left filter rail always visible
- Top row KPI tiles (5–7)
- Main area: trend + top customers + top SKUs
- Insights: new customers, at-risk, gaps
- Exports: segment builder + CSV download

## Tokens
- bg: #1D1D1D
- surface: #2A2A2A
- border: rgba(238,238,238,0.10)
- text: #EEEEEE, secondary rgba(238,238,238,0.65)
- accent: #44D1B8 (primary)

## Components
- KPI tile: label, value, tiny sparkline, delta
- Chart cards: compact titles, subtle gridlines, crisp tooltips
- Tables: sticky header, tight rows, conditional formatting
- Selected state: subtle teal glow

## Avoid
- Default unstyled tables
- Big empty space
- Rainbow colours
- Heavy shadows
