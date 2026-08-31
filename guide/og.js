// Social preview art. Renders the same dark palette the app uses, through
// headless Chrome, so the card looks like the product rather than a stock
// gradient. Writes into ../app/public/ like the other generators here.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'public');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const C = {
  bg: '#0c0f13', panel: '#12161c', line: '#222b36',
  text: '#e7ecf1', muted: '#8b97a3', accent: '#e0a52b',
  up: '#4bbf73', down: '#e5534b',
};

/** A short deterministic candle series, so the art is a real chart shape. */
function candles(n, seed = 11) {
  let s = seed, price = 100;
  const out = [];
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5);
  for (let i = 0; i < n; i++) {
    // A leg up, a pullback, then a stronger leg — the art should show
    // structure, not a straight line.
    const phase = i / n;
    const drift = phase < 0.34 ? 1.5 : phase < 0.56 ? -1.85 : 2.05;
    const open = price;
    price = price + drift + rnd() * 3.1;
    const high = Math.max(open, price) + Math.abs(rnd()) * 1.7;
    const low = Math.min(open, price) - Math.abs(rnd()) * 1.7;
    out.push({ open, close: price, high, low });
  }
  return out;
}

function chartSvg(w, h, n = 34) {
  const bars = candles(n);
  const lo = Math.min(...bars.map((b) => b.low));
  const hi = Math.max(...bars.map((b) => b.high));
  const y = (v) => h - ((v - lo) / (hi - lo)) * h;
  const step = w / bars.length;
  const bw = step * (n <= 16 ? 0.66 : 0.56);
  let out = '';
  bars.forEach((b, i) => {
    const cx = i * step + step / 2;
    const up = b.close >= b.open;
    const col = up ? C.up : C.down;
    const top = y(Math.max(b.open, b.close));
    const bot = y(Math.min(b.open, b.close));
    out += `<line x1="${cx.toFixed(1)}" y1="${y(b.high).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${y(b.low).toFixed(1)}" stroke="${col}" stroke-width="1.6" opacity=".85"/>`;
    out += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1.5, bot - top).toFixed(1)}" fill="${col}" opacity=".85" rx="1"/>`;
  });
  // EMA line over the same series — the thing the app actually measures.
  let ema = bars[0].close; const k = 2 / (9 + 1); const pts = [];
  bars.forEach((b, i) => { ema = b.close * k + ema * (1 - k); pts.push(`${(i * step + step / 2).toFixed(1)},${y(ema).toFixed(1)}`); });
  out += `<polyline points="${pts.join(' ')}" fill="none" stroke="${C.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  return out;
}

const ogHtml = `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:${C.bg};width:1200px;height:630px;overflow:hidden}
  .wrap{width:1200px;height:630px;position:relative;
    font:400 15px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:${C.text};
    background:radial-gradient(1100px 560px at 78% 12%, #18202b 0%, ${C.bg} 62%)}
  .chart{position:absolute;left:0;right:0;bottom:0;height:268px;opacity:.62}
  .fade{position:absolute;left:0;right:0;bottom:268px;height:120px;
    background:linear-gradient(to bottom, rgba(12,15,19,0) 0%, ${C.bg} 100%);opacity:.0}
  .pad{position:absolute;inset:0;padding:74px 78px;display:flex;flex-direction:column}
  h1{margin:0;font-size:92px;line-height:1;letter-spacing:-.035em;font-weight:650}
  h1 span{color:${C.accent}}
  p{margin:26px 0 0;font-size:31px;line-height:1.42;color:${C.text};max-width:20ch;font-weight:400}
  .sub{margin-top:14px;font-size:21px;color:${C.muted};max-width:34ch}
  .rule{position:absolute;right:78px;top:78px;display:flex;gap:11px;align-items:center;
    font:500 19px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:${C.muted};letter-spacing:.04em;
    border:1px solid ${C.line};background:${C.panel};border-radius:999px;padding:11px 19px}
  .dot{width:9px;height:9px;border-radius:50%;background:${C.up}}
</style><div class="wrap">
  <svg class="chart" viewBox="0 0 1200 268" preserveAspectRatio="none">${chartSvg(1200, 252)}</svg>
  <div class="pad">
    <h1>Trend<span>Lens</span></h1>
    <p>The structure of a price series, measured.</p>
    <div class="sub">EMA slope, swing highs and lows, break of structure &mdash; stated plainly, never as advice.</div>
  </div>
  <div class="rule"><span class="dot"></span> 1m &middot; 5m &middot; 1h &middot; 1d &middot; 1wk</div>
</div>`;

const iconHtml = `<!doctype html><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;width:180px;height:180px;overflow:hidden;background:${C.bg}}
  .b{width:180px;height:180px;background:${C.bg};display:flex;align-items:flex-end;justify-content:center;padding:0}
</style><div class="b">
  <svg width="180" height="180" viewBox="0 0 180 180">
    <rect width="180" height="180" fill="${C.bg}"/>
    <g transform="translate(20,46)">${chartSvg(140, 88, 13)}</g>
  </svg>
</div>`;

function shot(html, w, h, name) {
  const dir = mkdtempSync(join(tmpdir(), 'tl-og-'));
  const src = join(dir, 'p.html');
  writeFileSync(src, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${w},${h}`, `--screenshot=${join(dir, name)}`, `file://${src}`,
  ], { stdio: 'pipe' });
  copyFileSync(join(dir, name), join(OUT, name));
  rmSync(dir, { recursive: true, force: true });
  console.log(`  wrote app/public/${name} (${w}x${h})`);
}

shot(ogHtml, 1200, 630, 'og.png');
shot(iconHtml, 180, 180, 'apple-touch-icon.png');
