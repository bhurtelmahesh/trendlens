# Decisions

Short record of why v1 looks the way it does. Written up front, on purpose.

## The claim is load-bearing

The one risk with this kind of tool is the gap between what it *says* and what it *does*. So the
analysis is deliberately simple and fully described: EMA slope, fractal swing highs/lows,
higher-high/higher-low vs lower-high/lower-low structure, break of structure, and an R² on the
recent closes. The "confidence" number is an **agreement score** across those inputs — it is not
a probability, and the UI says so where it appears. "No clean trend" is capped so it can never
read as *High* confidence.

If the honest version of the output isn't useful, the fix is a better analysis — never nicer
copy.

## One data source in v1

Yahoo's chart API only. It works from a server, covers US + global equities and crypto, and has
one well-known failure mode (it pads the still-forming bar with nulls → `Number(null)` → `0`),
which the parser handles by requiring every OHLC value to be `> 0`. Binance 403s datacenter IPs,
so crypto goes through Yahoo `-USD`. Other providers get added to `worker/src/providers/` once
each is proven the same way — not before.

Symbol entry: an `/api/search` endpoint proxies Yahoo's symbol search for autocomplete, and is
best-effort — it returns `[]` on any failure and the form still works with an exact symbol.
For the "other global" market, a bare ticker also tries the big exchange suffixes
(`.T .HK .L .DE …`) and reports which one matched.

## One backend

A single Cloudflare Worker. No second implementation to drift out of sync. CORS is an allowlist
(plus `*.trendlens.pages.dev` preview deploys), there's a 60/60s per-IP rate limit, inputs are
whitelisted, and the upstream fetch has a timeout — all from the first commit.

## Deliberately not in v1

Screenshot / computer-vision mode, user accounts + cloud sync, watchlists / favorites /
trackers, multi-provider fallback, a desktop wrapper. Each is a real feature that earns its own
version once the core loop is solid and deployed.

## Stack

Vite + React + TypeScript with a build step (the user asked for a real framework). All analysis
lives in framework-free modules with Vitest tests, so the framework barely touches the part that
has to be correct. `lightweight-charts` draws the chart — its `createPriceLine({ price })` places
level lines by value, so the swing lines are at the right price by construction.
