const fs = require('fs');
const j = JSON.parse(fs.readFileSync('btc.json', 'utf8'));
const r = j.chart.result[0], t = r.timestamp, q = r.indicators.quote[0];
const bars = t.map((ts, i) => ({ t: ts, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i] }))
  .filter(b => [b.o, b.h, b.l, b.c].every(v => Number.isFinite(v) && v > 0));
fs.writeFileSync('btc-bars.json', JSON.stringify(bars));
const iso = ts => new Date(ts * 1000).toISOString().slice(0, 16).replace('T', ' ');
console.log('  usable bars:', bars.length, '|', iso(bars[0].t), '->', iso(bars.at(-1).t));

// The screenshot's action is 1–2 Sep. Find the structure there from real data.
const from = Date.UTC(2025, 7, 31) / 1000;
const win = bars.filter(b => b.t >= from);
console.log('\n  --- window from 31 Aug:', win.length, 'bars');

// Swept low: the lowest low, and the bar that made it
let lowBar = win[0]; for (const b of win) if (b.l < lowBar.l) lowBar = b;
console.log('  lowest low        ', lowBar.l.toFixed(2), 'at', iso(lowBar.t));

// The biggest single-bar up move after that low = the displacement candle
const after = win.filter(b => b.t > lowBar.t);
let disp = after[0]; for (const b of after) if ((b.c - b.o) > (disp.c - disp.o)) disp = b;
console.log('  displacement bar  ', iso(disp.t), 'open', disp.o.toFixed(2), 'close', disp.c.toFixed(2),
            '(+' + (disp.c - disp.o).toFixed(0) + ')');

// Order block = last down-close bar before the displacement
const before = win.filter(b => b.t < disp.t);
let ob = null; for (const b of before) if (b.c < b.o) ob = b;
console.log('  order block bar   ', iso(ob.t), 'high', ob.h.toFixed(2), 'low', ob.l.toFixed(2));

// FVG around the displacement: gap between the bar before's high and the bar after's low
const di = win.findIndex(b => b.t === disp.t);
const fvgLo = win[di - 1].h, fvgHi = win[di + 1] ? win[di + 1].l : disp.c;
console.log('  FVG               ', fvgLo.toFixed(2), '->', fvgHi.toFixed(2),
            fvgHi > fvgLo ? '(valid gap)' : '(no gap — wicks overlap)');

// Prior high before the low = the buy-side liquidity the move targets
const pre = win.filter(b => b.t < lowBar.t);
const priorHigh = Math.max(...pre.map(b => b.h));
const runHigh = Math.max(...after.map(b => b.h));
console.log('  prior high (BSL)  ', priorHigh.toFixed(2));
console.log('  high after entry  ', runHigh.toFixed(2));
console.log('\n  screenshot levels for comparison: 108,457.62 / 109,373.41 / 110,891.73');
