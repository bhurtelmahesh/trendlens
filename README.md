# TrendLens

Type a ticker. Get a mechanical read of its current trend structure — the slope of an
exponential moving average, the sequence of swing highs and lows, and whether the latest close
has broken the most recent swing — stated plainly, plus the zones where each side (long/short)
would be structurally consistent and the levels where that structure ends. **Not advice.**

A from-scratch rebuild of ChartLens. It ships one thing and ships it honestly: the chart, the
numbers, and the words all come from the same calculation.

- **App:** https://trendlens.web.app  ·  https://trendlens.pages.dev  ·  https://bhurtelmahesh.github.io/trendlens
- **API:** https://trendlens-api.chartlens101.workers.dev

## Layout

```
app/     Vite + React + TypeScript SPA
  src/analysis/   pure, framework-free, unit-tested — the actual analysis
    analyze.ts        direction, confidence, structure, break-of-structure
    zones.ts          long/short structural zones + their invalidation and objective
    brief.ts          the numbers turned into plain, non-advice language
  src/components/ TickerForm, PriceChart (lightweight-charts), Brief, EntryZones,
                  HonestyPanel, Legal
worker/  one Cloudflare Worker — the only market-data source of truth
  src/providers/yahoo.ts       fetch + defensive parse (rejects any bar with an OHLC value <= 0)
  src/providers/merolagani.ts  NEPSE daily bars (unofficial)
  src/validate.ts              the input boundary — symbol/market/interval whitelists
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
npm test                # Vitest — analysis modules (app) + validation/CORS (worker)
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
- **Frontend, Firebase Hosting:** `firebase deploy --only hosting:trendlens --project chartlens101`.
  The `chartlens101` project holds two hosting sites; this repo pins `hosting.site = "trendlens"`
  and serves only `trendlens.web.app`. `chartlens101.web.app` is the separate `chartlens` repo —
  don't cross them.

## Data

- **US / global / crypto:** Yahoo Finance chart API (`BTC` → `BTC-USD`; bare "other global"
  symbols are retried against `.T .HK .L .DE …` suffixes).
- **NEPSE:** merolagani's public TradingView feed — unofficial, daily bars only, so the interval
  selector is forced to `1d`. Autocomplete uses a bundled symbol list (`app/src/lib/nepse.ts`),
  since neither Yahoo search nor merolagani covers it.

The Worker holds responses in the Cloudflare edge cache with an interval-aware TTL, plus a 24h
backup copy served if the upstream rate-limits.

Screenshot mode and accounts are deliberately later. See `DECISIONS.md`.

## Zones

The "where each side has structure behind it" section cuts the current swing range into thirds
and reports, for a long and for a short: the zone that side sits in, the level whose breach ends
the structure it depends on, and the far side of the range it runs to.

It is geometry, not a signal. There is deliberately **no reward:risk ratio** — measured from the
midpoint of a third-of-range zone it is always 5:1 by construction, so reporting it would dress a
constant of the geometry up as a per-symbol finding.
