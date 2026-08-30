# Guide generator

Builds the Smart Money Concepts tutorial served at `/guide.html`.

Deliberately **outside** the npm workspaces (`app`, `worker`). The app builds
from the committed output in `app/public/`, so `npm ci` at the repo root never
installs pdfkit and CI is unaffected. Only run this when the guide changes.

```bash
cd guide && npm install
npm run build          # svg -> pdf -> page
```

Output, written straight into the app so the two cannot drift:

| Path | What |
|---|---|
| `../app/public/guide.html` | the page, served at `/guide.html` |
| `../app/public/guide-assets/guide.js` | its behaviour script (CSP is `script-src 'self'`) |
| `../app/public/guide-assets/fonts/*.woff2` | self-hosted fonts (CSP is `font-src 'self'`) |
| `../app/public/guide-assets/*.pdf` | the three downloads |
| `dist/tutorial.html` | the claude.ai artifact variant (not shipped with the app) |

Both page variants come from one template in `page.js`; `--hosted` switches
between plain `<a download>` links and the claude.ai downloads capability.

Diagrams are described once in `concepts.js` / `walkthrough.js` against a small
graphics interface, then rendered through `lib.js` (pdfkit) for the PDF and
`svg.js` for the page, so a concept is authored once and looks identical in both.

`npm run data` re-derives `btc-bars.json` from `btc.json` and prints the
structure it finds, so the levels in `walkthrough.js` can be checked against the
price data rather than taken on trust.

Builds are reproducible: the PDF `CreationDate` is pinned, so rebuilding without
changing anything leaves `git status` clean.
