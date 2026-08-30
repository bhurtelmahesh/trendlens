const { C } = require('./lib.js');
const ALL = require('./btc-bars.json');

const U = (...a) => Date.UTC(...a) / 1000;
const slice = (from, to) => ALL.filter(b => b.t >= from && b.t <= to)
  .map(b => ({ o: b.o, h: b.h, l: b.l, c: b.c, t: b.t }));

// What was on screen when the snapshot was taken (2 Sep 13:49 UTC), and the
// same window carried forward so the outcome can be shown honestly.
const SETUP   = slice(U(2025, 8, 1, 12), U(2025, 8, 2, 14));
const OUTCOME = slice(U(2025, 8, 1, 12), U(2025, 8, 3, 12));
const CONTEXT = slice(U(2025, 7, 28, 0), U(2025, 8, 3, 12));

// Levels, all read off the real bars — see README-DATA.md for the derivation.
const L = {
  sslLine:   108904.44,  // 2 Sep 00:00 low — the higher low that got taken
  sweepLow:  108533.30,  // 2 Sep 12:00 low — how far the wick went
  mss:       110668.74,  // 2 Sep 09:00 high — the structure the impulse broke
  obLow:     108533.30,
  obHigh:    109751.43,  // the 2 Sep 12:00 candle: last opposing bar
  fvgLow:    109751.43,
  fvgHigh:   110894.07,  // 2 Sep 14:00 low — top of the imbalance
  sl:        108400.00,
  tp:        111685.98,
};

const money = n => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

/** Zone band with its label parked in the right-hand gutter, clear of candles. */
function zone(g, b, s, top, bottom, color, text, x0) {
  const yT = s.yOf(top), yB = s.yOf(bottom);
  g.band(x0, yT, b.x + b.w - x0, yB - yT, color);
  g.label(b.x + b.w + 5, (yT + yB) / 2 - 4, text, { color, size: 8 });
}

// Bars are located by timestamp, never by matching a float price — equality
// on a parsed double silently returns -1 and throws the annotation off-canvas.
const at = (s, ...t) => s.findIndex(b => b.t === U(...t));
const dispIndex = s => at(s, 2025, 8, 2, 13);
const SWEEP_AT = [2025, 8, 2, 12];

function baseChart(g, b, series, extra = []) {
  return g.chart(b, series, { include: [L.sl, L.tp, ...extra], maxWidth: 9 });
}

const STEPS = [
  {
    n: 1, title: 'Liquidity sweep',
    lead: 'Price breaks the higher low that the whole morning rally was built on, wicks well below it, and immediately rejects.',
    look: [
      `The higher low at ${money(L.sslLine)} — obvious, and full of stops.`,
      `A wick down to ${money(L.sweepLow)}, then a close back above.`,
      'The break is not held: it is taken and given straight back.',
    ],
    trap: 'Do not buy simply because liquidity was swept. A sweep on its own is context, not a trade — you still need a structural response afterwards.',
    draw(g, b) {
      const s = baseChart(g, b, SETUP);
      g.level(b.x, b.x + b.w, s.yOf(L.sslLine), { color: C.accent, label: 'SSL', width: 1.2 });
      g.band(b.x, s.yOf(L.sslLine), b.w, s.yOf(L.sweepLow) - s.yOf(L.sslLine), C.accent);
      const i = at(SETUP, ...SWEEP_AT);
      // Ring the bar that did the sweeping, then label it clear of the candles.
      g.band(s.xOf(i) - s.cw * 1.4, s.yOf(SETUP[i].h), s.cw * 2.8,
             s.yOf(SETUP[i].l) - s.yOf(SETUP[i].h), C.down);
      g.chip(s.xOf(i) - 46, s.yOf(SETUP[i].l) + 12, 'SWEEP', { fill: C.accent });
    },
  },
  {
    n: 2, title: 'MSS / displacement',
    lead: 'One hourly candle adds $2,269 and closes above the structure high — the break is carried by a single decisive bar.',
    look: [
      `The 13:00 candle opens at ${money(108859)} and closes at ${money(111128)}.`,
      `It closes above the ${money(L.mss)} structure high in one move.`,
      'It happens after the sweep, not before it.',
    ],
    trap: 'A tiny random break is not an MSS. If you have to squint to find the structure that broke, it did not break.',
    draw(g, b) {
      const s = baseChart(g, b, SETUP);
      const i = dispIndex(SETUP);
      g.level(b.x, b.x + b.w, s.yOf(L.mss), { color: C.muted, label: 'structure' });
      g.band(s.xOf(i) - s.cw * 1.5, s.yOf(SETUP[i].h), s.cw * 3, s.yOf(SETUP[i].l) - s.yOf(SETUP[i].h), C.blue);
      g.chip(s.xOf(i) - 16, s.yOf(SETUP[i].h) - 24, 'MSS', { fill: C.blue });
    },
  },
  {
    n: 3, title: 'Order Block + FVG',
    lead: 'The impulse leaves two things behind: the candle it came from, and a gap it never traded through.',
    look: [
      `Order Block — the last down candle, ${money(L.obLow)}–${money(L.obHigh)}.`,
      `Fair Value Gap — ${money(L.fvgLow)}–${money(L.fvgHigh)}, skipped entirely.`,
      'Both formed after the sweep and after the structure break, in that order.',
    ],
    trap: 'The useful question is not "can I find an FVG?" — you almost always can. It is whether the FVG formed after the liquidity event and the structure shift.',
    draw(g, b) {
      const s = baseChart(g, b, SETUP);
      const x0 = s.xOf(at(SETUP, ...SWEEP_AT)) - s.cw;
      zone(g, b, s, L.fvgHigh, L.fvgLow, C.purple, 'FVG', x0);
      zone(g, b, s, L.obHigh, L.obLow, C.blue, 'OB', x0);
    },
  },
  {
    n: 4, title: 'Retracement and entry',
    lead: 'Price turns back down into the gap within two hours. That retrace — not the impulse — is where the trade is taken.',
    look: [
      `The next candles trade back to ${money(L.fvgHigh)}, the top of the gap.`,
      'The zone is reached, so a predefined trigger can fire there.',
      'Entry is at the zone, not on the candle that created it.',
    ],
    trap: 'Entering on the impulse itself is the most common way this setup is lost. The whole point of the zone is that it gives you a defined place to act.',
    draw(g, b) {
      const s = baseChart(g, b, OUTCOME);
      const x0 = s.xOf(at(OUTCOME, ...SWEEP_AT)) - s.cw;
      zone(g, b, s, L.fvgHigh, L.fvgLow, C.purple, 'FVG', x0);
      const i = at(OUTCOME, 2025, 8, 2, 15);
      g.arrow(s.xOf(i) + 26, s.yOf(L.fvgHigh) - 34, s.xOf(i) + 4, s.yOf(L.fvgHigh) - 6, C.up);
      g.chip(s.xOf(i) + 12, s.yOf(L.fvgHigh) - 52, 'ENTRY', { fill: C.up });
    },
  },
  {
    n: 5, title: 'Stop loss and target',
    lead: 'Risk goes below the wick that started it all; the objective is the liquidity resting above.',
    look: [
      `Stop at ${money(L.sl)} — under the sweep low, where the read is wrong.`,
      `Objective at ${money(L.tp)} — the buy-side liquidity overhead.`,
      'Both levels are defined by structure, not by a round number of dollars.',
    ],
    trap: 'A stop needs a reason and so does a target. "Below the sweep" and "at the opposing liquidity" are reasons. A fixed number of points is not.',
    draw(g, b) {
      const s = baseChart(g, b, OUTCOME);
      g.level(b.x, b.x + b.w, s.yOf(L.tp), { color: C.up, label: 'TP', width: 1.4, dashed: false });
      g.level(b.x, b.x + b.w, s.yOf(L.sl), { color: C.down, label: 'SL', width: 1.4, dashed: false });
      const x0 = s.xOf(at(OUTCOME, ...SWEEP_AT)) - s.cw;
      g.band(x0, s.yOf(L.fvgHigh), b.x + b.w - x0, s.yOf(L.fvgLow) - s.yOf(L.fvgHigh), C.purple);
    },
  },
  {
    n: 6, title: 'The whole sequence',
    lead: 'Every piece on one chart, in the order it actually happened — each step conditional on the one before it.',
    look: [
      'Sweep, then structure break, then zone, then retrace, then entry.',
      'Remove any step and the one after it has no reason to exist.',
      'The order is the method; the labels on their own are not.',
    ],
    trap: 'The sequence is the lesson. Memorising the labels in isolation gives you the vocabulary without the grammar.',
    draw(g, b) {
      const s = baseChart(g, b, OUTCOME);
      g.level(b.x, b.x + b.w, s.yOf(L.tp), { color: C.up, label: 'TP', width: 1.3, dashed: false });
      g.level(b.x, b.x + b.w, s.yOf(L.sl), { color: C.down, label: 'SL', width: 1.3, dashed: false });
      g.level(b.x, b.x + b.w, s.yOf(L.sslLine), { color: C.accent, label: 'SSL' });
      const x0 = s.xOf(at(OUTCOME, ...SWEEP_AT)) - s.cw;
      zone(g, b, s, L.fvgHigh, L.fvgLow, C.purple, 'FVG', x0);
      zone(g, b, s, L.obHigh, L.obLow, C.blue, 'OB', x0);
      const i = dispIndex(OUTCOME);
      g.chip(s.xOf(i) - 16, s.yOf(OUTCOME[i].h) - 24, 'MSS', { fill: C.blue });
    },
  },
];

const CONTEXT_DRAW = (g, b) => {
  const s = g.chart(b, CONTEXT, { include: [L.sl, L.tp], maxWidth: 5 });
  g.level(b.x, b.x + b.w, s.yOf(L.sslLine), { color: C.accent, label: 'the setup' });
};

module.exports = { STEPS, L, SETUP, OUTCOME, CONTEXT, CONTEXT_DRAW, money };
