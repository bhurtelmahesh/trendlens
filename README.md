# ChartLens

Type a ticker. Get a mechanical read of its current trend structure — the slope of an
exponential moving average, the sequence of swing highs and lows, and whether the latest close
has broken the most recent swing — stated plainly. **Not advice.**

This is a from-scratch rebuild. It ships one thing and ships it honestly: the chart, the
numbers, and the words all come from the same calculation.

## Layout

```
app/     Vite + React + TypeScript SPA
  src/analysis/   pure, framework-free, unit-tested — the actual analysis
  src/components/ TickerForm, PriceChart (lightweight-charts), Brief, HonestyPanel
worker/  one Cloudflare Worker — the only market-data source of truth
  src/providers/yahoo.ts   fetch + defensive parse (rejects any bar with an OHLC value <= 0)
shared/  types imported by both sides
```

## Develop

```bash
npm install
npm run dev:worker      # local market-data proxy on :8787  (Node server; wrangler dev needs macOS 13.5+)
npm run dev             # app on :5173
```

## Check

```bash
npm test                # Vitest — the analysis modules
npm run typecheck       # tsc --noEmit, app + worker
npm run lint
npm run build           # tsc -b && vite build -> app/dist
```

## Deploy

Frontend → Cloudflare Pages (`app/dist`). API → the Worker (`npm --workspace worker run deploy`).
Set `VITE_API_BASE` to the deployed Worker URL when building the app for production.

## Data

Yahoo Finance chart API only, in v1 — covers US + global equities and crypto (`BTC` → `BTC-USD`).
More providers (and screenshot mode, and accounts) are deliberately later. See `DECISIONS.md`.
