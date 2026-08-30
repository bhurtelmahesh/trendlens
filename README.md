# TrendLens

Type a ticker. Get a mechanical read of its current trend structure — the slope of an
exponential moving average, the sequence of swing highs and lows, and whether the latest close
has broken the most recent swing — stated plainly. **Not advice.**

A from-scratch rebuild of ChartLens. It ships one thing and ships it honestly: the chart, the
numbers, and the words all come from the same calculation.

- **App:** https://trendlens.web.app  ·  https://trendlens.pages.dev  ·  https://bhurtelmahesh.github.io/trendlens
- **API:** https://trendlens-api.chartlens101.workers.dev

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

- **API:** `npm --workspace worker run deploy` (Cloudflare Worker).
- **Frontend, Cloudflare Pages:** `VITE_API_BASE=<worker-url> npm --workspace app run build`, then
  `wrangler pages deploy app/dist --project-name=trendlens`.
- **Frontend, GitHub Pages:** `.github/workflows/pages.yml` builds and deploys on every push to
  `main` (base path = repo name; API base baked in).
- **Frontend, Firebase Hosting:** `firebase deploy --only hosting --project chartlens101` — one
  config, two sites (`trendlens.web.app`, `chartlens101.web.app`).

## Data

Yahoo Finance chart API only, in v1 — covers US + global equities and crypto (`BTC` → `BTC-USD`).
More providers (and screenshot mode, and accounts) are deliberately later. See `DECISIONS.md`.
