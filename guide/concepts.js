const { C } = require('./lib.js');

// Compact candle notation: [open, high, low, close]
const K = (o, h, l, c, dim) => ({ o, h, l, c, dim });

// ---- reusable synthetic series -------------------------------------------

// A clean uptrend that pulls back then breaks its prior high.
const UPTREND_BOS = [
  K(10,12,9,11), K(11,13,10,12.5), K(12.5,15,12,14.5), K(14.5,16,14,15.5),
  K(15.5,16.2,13,13.5), K(13.5,14,12.4,12.8), K(12.8,14,12.6,13.8),
  K(13.8,15.5,13.6,15.2), K(15.2,17.4,15,17.1), K(17.1,18,16.6,17.6),
];
// An uptrend that fails: breaks its last higher low.
const UPTREND_CHOCH = [
  K(10,12,9.5,11.6), K(11.6,13.4,11.2,13), K(13,13.8,12.2,12.6),
  K(12.6,14.6,12.4,14.3), K(14.3,15.4,13.9,15), K(15,15.2,13.4,13.6),
  K(13.6,14,12.1,12.3), K(12.3,12.6,10.6,10.9), K(10.9,11.4,10.1,10.4),
  K(10.4,10.8,9.4,9.7),
];

// ---- the 15 concepts ------------------------------------------------------

const CONCEPTS = [
  // ===== STRUCTURE =====
  {
    num: 1, family: 'structure', name: 'Break of Structure', abbr: 'BOS',
    oneLiner: 'Price closes beyond a prior swing point, confirming the trend continues.',
    means: [
      'In an uptrend, a BOS is a close above the last swing high.',
      'It confirms the existing trend is intact and likely to continue.',
      'The opposite — breaking a swing low in an uptrend — warns of a reversal instead.',
    ],
    keyIdea: 'BOS is trend confirmation. It says the dominant direction is still in control.',
    caption: 'The prior swing high is taken with a close, not just a wick.',
    draw(g, b) {
      const s = g.chart(b, UPTREND_BOS);
      const priorHigh = 16;
      g.level(b.x, b.x + b.w, s.yOf(priorHigh), { color: C.muted, label: 'prior high' });
      g.chip(s.xOf(8) - 14, s.yOf(17.6) - 26, 'BOS', { fill: C.up });
      g.arrow(s.xOf(7), s.yOf(15.8), s.xOf(8) - 2, s.yOf(17.0), C.up);
    },
  },
  {
    num: 2, family: 'structure', name: 'Change of Character', abbr: 'CHoCH',
    oneLiner: 'The first break that signals a possible trend reversal.',
    means: [
      'In an uptrend, price stops making higher lows and breaks the most recent one.',
      'It is the earliest structural clue that momentum may be shifting.',
      'Often followed by a deeper move as the new trend develops.',
    ],
    keyIdea: "The market's first character change — the earliest warning that control has flipped.",
    caption: 'The last higher low fails; the sequence that defined the uptrend is broken.',
    draw(g, b) {
      const s = g.chart(b, UPTREND_CHOCH);
      const hl = 12.2;
      g.level(b.x, b.x + b.w, s.yOf(hl), { color: C.muted, label: 'higher low' });
      g.chip(s.xOf(6) - 18, s.yOf(11.4) + 6, 'CHoCH', { fill: C.down });
      g.arrow(s.xOf(5), s.yOf(13.4), s.xOf(6.4), s.yOf(12.0), C.down);
    },
  },
  {
    num: 3, family: 'structure', name: 'Market Structure Shift', abbr: 'MSS',
    oneLiner: 'A decisive break of internal structure that confirms a new directional bias.',
    means: [
      'Closely related to CHoCH; usually the confirming break on a lower timeframe.',
      'Price breaks a key internal swing point with a strong, decisive candle.',
      'The MSS candle becomes the anchor many traders use for entries.',
    ],
    keyIdea: 'MSS is the trigger many ICT traders wait for — structure has officially flipped.',
    caption: 'The break is carried by one displacement candle, not a slow drift through.',
    draw(g, b) {
      const s = g.chart(b, [
        K(14,14.4,13.2,13.4), K(13.4,13.8,12.4,12.6), K(12.6,13,11.8,12.2),
        K(12.2,12.6,11.4,11.7), K(11.7,12,11.1,11.9), K(11.9,12.4,11.6,12.2),
        K(12.2,12.5,11.9,12.3), K(12.3,15.2,12.2,15.0), K(15.0,15.6,14.6,15.3),
        K(15.3,15.9,15.0,15.7),
      ]);
      g.level(b.x, b.x + b.w, s.yOf(13.0), { color: C.muted, label: 'internal high' });
      g.chip(s.xOf(7) - 16, s.yOf(15.2) - 26, 'MSS', { fill: C.blue });
      g.band(s.xOf(7) - s.cw, s.yOf(15.2), s.cw * 2, s.yOf(12.2) - s.yOf(15.2), C.blue,
           { label: 'displacement', labelColor: C.blue });
    },
  },

  // ===== LIQUIDITY =====
  {
    num: 4, family: 'liquidity', name: 'Buy-Side Liquidity', abbr: 'BSL',
    oneLiner: 'Resting buy-stop orders parked above swing highs.',
    means: [
      'Stop-losses from shorts and breakout buy-stops cluster above equal highs.',
      'That pool is a target — price is often drawn upward to trigger it.',
      'Once swept, BSL frequently marks a short-term top before a reversal.',
    ],
    keyIdea: "Think of BSL as fuel sitting above the market — price reaches for it before turning.",
    caption: 'Orders pool where the highs line up, because that is where stops get placed.',
    draw(g, b) {
      const s = g.chart(b, [
        K(10,12.9,9.6,12.6), K(12.6,13,11.4,11.7), K(11.7,12.95,11.5,12.7),
        K(12.7,13.02,11.9,12.1), K(12.1,12.6,11.2,11.5), K(11.5,12.4,11.3,12.2),
        K(12.2,13.0,12.0,12.8), K(12.8,13.05,12.2,12.4), K(12.4,12.9,11.8,12.0),
      ], { include: [14.2] });
      const y = s.yOf(13.05);
      g.level(b.x, b.x + b.w, y, { color: C.accent, dashed: true, width: 1.2 });
      g.band(b.x, y - 22, b.w, 22, C.accent, { label: 'BSL  — buy stops resting here', labelColor: C.accent });
    },
  },
  {
    num: 5, family: 'liquidity', name: 'Sell-Side Liquidity', abbr: 'SSL',
    oneLiner: 'Resting sell-stop orders parked below swing lows.',
    means: [
      'Stop-losses from longs and breakdown sell-stops cluster below equal lows.',
      'The pool acts as a magnet — price dips into it before reversing higher.',
      'Once swept, SSL frequently marks a short-term bottom.',
    ],
    keyIdea: 'SSL is the mirror of BSL — fuel below the market that price dips into before turning up.',
    caption: 'The same mechanic, inverted: equal lows advertise where the stops are.',
    draw(g, b) {
      const s = g.chart(b, [
        K(13,13.4,10.1,10.4), K(10.4,11.6,10.05,11.4), K(11.4,11.8,10.12,10.3),
        K(10.3,11.4,10.08,11.2), K(11.2,11.9,10.9,11.7), K(11.7,12,10.15,10.35),
        K(10.35,11.5,10.1,11.3), K(11.3,12.2,11.1,12.0),
      ], { include: [9.0] });
      const y = s.yOf(10.05);
      g.level(b.x, b.x + b.w, y, { color: C.accent, dashed: true, width: 1.2 });
      g.band(b.x, y, b.w, 22, C.accent, { label: 'SSL  — sell stops resting here', labelColor: C.accent });
    },
  },
  {
    num: 6, family: 'liquidity', name: 'Equal Highs / Equal Lows', abbr: 'EQH / EQL',
    oneLiner: 'Repeated highs or lows sitting at nearly the same price.',
    means: [
      'EQH: two or more swing highs line up at a similar level.',
      'EQL: two or more swing lows line up at a similar level.',
      'Both flag obvious liquidity pools that price is drawn to sweep.',
    ],
    keyIdea: 'The more often a level is tested, the more stops pile up — and the bigger the eventual sweep.',
    caption: 'Equal levels are not strong support or resistance. They are advertised liquidity.',
    draw(g, b) {
      const s = g.chart(b, [
        K(11,13.0,10.6,12.6), K(12.6,12.9,11.1,11.3), K(11.3,12.98,11.05,12.8),
        K(12.8,13.01,11.6,11.8), K(11.8,12.4,11.02,11.2), K(11.2,12.6,11.08,12.5),
        K(12.5,12.95,11.9,12.1), K(12.1,12.5,11.04,11.25),
      ]);
      g.level(b.x, b.x + b.w, s.yOf(13.0), { color: C.down, label: 'EQH' });
      g.level(b.x, b.x + b.w, s.yOf(11.05), { color: C.up, label: 'EQL' });
    },
  },
  {
    num: 7, family: 'liquidity', name: 'Liquidity Sweep', abbr: 'Sweep',
    oneLiner: 'A stop-hunt beyond a prior high or low, then a sharp reversal.',
    means: [
      'Resting stops sit just beyond obvious swing highs and lows.',
      'Price wicks through the level to trigger them, then quickly reverses.',
      'The sweep fuels the real move in the opposite direction.',
    ],
    keyIdea: 'A sweep is a trap: the breakout looks real for one candle, then price snaps back.',
    caption: 'The long wick through the level — not a close beyond it — is the tell.',
    draw(g, b) {
      const s = g.chart(b, [
        K(11,11.6,10.4,11.4), K(11.4,12.5,11.2,12.3), K(12.3,12.55,11.5,11.7),
        K(11.7,12.52,11.6,12.4), K(12.4,13.6,12.2,12.35), K(12.35,12.5,11.2,11.4),
        K(11.4,11.7,10.4,10.6), K(10.6,10.9,9.7,9.9),
      ]);
      g.level(b.x, b.x + b.w, s.yOf(12.55), { color: C.accent, label: 'liquidity' });
      g.chip(s.xOf(4) - 16, s.yOf(13.6) - 24, 'SWEEP', { fill: C.down });
      g.arrow(s.xOf(4.6), s.yOf(13.2), s.xOf(6), s.yOf(11.0), C.down);
    },
  },
  {
    num: 8, family: 'liquidity', name: 'Inducement', abbr: 'IDM',
    oneLiner: 'A small, obvious swing that lures traders in before the real move.',
    means: [
      'A minor liquidity pool placed before the true Order Block.',
      'Retail traders enter against the real move using it as confirmation.',
      'Smart money sweeps the inducement first, then makes the genuine move.',
    ],
    keyIdea: 'The obvious, easy-to-see swing point is often bait — not the real signal.',
    caption: 'The shallow swing gets taken first; the deeper zone is where the move begins.',
    draw(g, b) {
      const s = g.chart(b, [
        K(14,14.3,13.4,13.6), K(13.6,13.9,12.9,13.1), K(13.1,13.5,12.7,13.3),
        K(13.3,13.6,12.6,12.75), K(12.75,13,11.4,11.6), K(11.6,12,11.1,11.9),
        K(11.9,13.4,11.8,13.2), K(13.2,14.4,13.0,14.2),
      ]);
      g.level(b.x, s.xOf(5), s.yOf(12.7), { color: C.accent, label: 'IDM', labelSide: 'left' });
      // Label sits below the band: the zone is only ~36pt wide, too narrow to
      // hold the text inside without spilling over its own border.
      g.band(s.xOf(4) - s.cw, s.yOf(11.9), s.cw * 2.6, s.yOf(11.1) - s.yOf(11.9), C.purple);
      g.chip(s.xOf(4) - 30, s.yOf(11.1) + 8, 'true OB', { fill: C.purple });
      g.arrow(s.xOf(6), s.yOf(12.6), s.xOf(7.2), s.yOf(13.9), C.up);
    },
  },

  // ===== ZONES & IMBALANCE =====
  {
    num: 9, family: 'zones', name: 'Fair Value Gap', abbr: 'FVG',
    oneLiner: 'A price imbalance left behind by a fast move.',
    means: [
      "A three-candle pattern where candle 1's wick and candle 3's wick do not overlap.",
      'Created by a strong, fast candle that skips price levels.',
      'Price often returns later to rebalance the gap before continuing.',
    ],
    keyIdea: 'The gap acts as a magnet — price is likely to revisit it before the next major move.',
    caption: 'The gap is the untouched space between candle 1 and candle 3.',
    draw(g, b) {
      const s = g.chart(b, [
        K(10.2,10.9,9.9,10.6), K(10.6,11.2,10.3,11.0), K(11.0,13.9,10.9,13.7),
        K(13.9,14.6,13.4,14.3), K(14.3,14.8,13.9,14.1),
      ], { maxWidth: 26 });
      const top = s.yOf(13.4), bot = s.yOf(11.2);
      g.band(s.xOf(1) - 6, top, s.xOf(3) - s.xOf(1) + 12, bot - top, C.purple,
           { label: 'FVG', labelColor: C.purple });
      ['1', '2 impulse', '3'].forEach((t, i) => {
        g.label(s.xOf(i + 1), b.y + b.h + 4, t, { anchor: 'middle' });
      });
    },
  },
  {
    num: 10, family: 'zones', name: 'Inverted Fair Value Gap', abbr: 'IFVG',
    oneLiner: 'An FVG that gets fully broken and flips its role.',
    means: [
      'An FVG normally acts as support (bullish) or resistance (bearish).',
      'When price closes all the way through it, the gap inverts.',
      'It then acts as the opposite: former support becomes resistance.',
    ],
    keyIdea: 'An IFVG shows a genuine shift in control — the zone that once held price now rejects it.',
    caption: 'Same zone, opposite job, once price has closed decisively through it.',
    draw(g, b) {
      const s = g.chart(b, [
        K(10,10.6,9.7,10.4), K(10.4,13.0,10.3,12.8), K(12.8,13.4,12.4,13.1),
        K(13.1,13.5,12.0,12.2), K(12.2,12.4,10.2,10.4), K(10.4,11.9,10.2,11.7),
        K(11.7,11.95,10.6,10.8), K(10.8,11.1,9.9,10.1),
      ]);
      const top = s.yOf(12.0), bot = s.yOf(10.6);
      g.band(s.xOf(0.6), top, s.xOf(4.4) - s.xOf(0.6), bot - top, C.up, { label: 'FVG (support)', labelColor: C.up });
      g.band(s.xOf(4.6), top, s.xOf(7.6) - s.xOf(4.6), bot - top, C.down, { label: 'now resistance', labelColor: C.down, align: 'right' });
      g.arrow(s.xOf(6), s.yOf(11.9), s.xOf(7), s.yOf(10.3), C.down);
    },
  },
  {
    num: 11, family: 'zones', name: 'Order Block', abbr: 'OB',
    oneLiner: 'The last opposing candle before a strong, structural move.',
    means: [
      'The final down-candle right before a sharp rally is a bullish Order Block.',
      'It marks the footprint of large institutional buying or selling.',
      'Traders watch for price to return to the zone as a high-probability area.',
    ],
    keyIdea: "Order Blocks mark where smart money entered — they originate an impulsive break of structure.",
    caption: 'The origin candle of the impulse, not just any red candle in a pullback.',
    draw(g, b) {
      const s = g.chart(b, [
        K(13,13.3,12.5,12.7), K(12.7,12.9,11.9,12.1), K(12.1,12.3,11.3,11.45),
        K(11.45,11.6,10.9,11.0), K(11.0,13.6,10.95,13.4), K(13.4,14.6,13.3,14.4),
        K(14.4,15.2,14.1,15.0), K(15.0,15.6,14.7,15.4),
      ]);
      g.band(s.xOf(3) - s.cw * 1.3, s.yOf(11.6), s.cw * 2.6, s.yOf(10.9) - s.yOf(11.6), C.purple);
      g.chip(s.xOf(3) - 44, s.yOf(10.9) + 8, 'bullish OB', { fill: C.purple });
      g.arrow(s.xOf(4.3), s.yOf(12.4), s.xOf(5.6), s.yOf(14.4), C.up);
    },
  },
  {
    num: 12, family: 'zones', name: 'Mitigation', abbr: 'Mitigation',
    oneLiner: "Price returns to an Order Block to fill orders that were left behind.",
    means: [
      'After an impulsive move, price often pulls back into the origin Order Block.',
      'The retest lets large orders that were not fully filled get executed.',
      'Once mitigated, price frequently resumes in the original direction.',
    ],
    keyIdea: 'Mitigation is not a reversal. It is usually a pause that lets big orders fill.',
    caption: 'A touch and a rejection — the zone does its job and the trend continues.',
    draw(g, b) {
      const s = g.chart(b, [
        K(11,11.3,10.6,10.8), K(10.8,13.4,10.7,13.2), K(13.2,13.9,12.9,13.6),
        K(13.6,13.8,12.3,12.5), K(12.5,12.7,11.2,11.35), K(11.35,12.2,11.1,12.0),
        K(12.0,13.4,11.9,13.2), K(13.2,14.4,13.0,14.2),
      ]);
      g.band(b.x, s.yOf(11.4), b.w, s.yOf(10.7) - s.yOf(11.4), C.purple,
           { label: 'OB zone', labelColor: C.purple });
      g.chip(s.xOf(4) - 22, s.yOf(11.1) + 8, 'touch', { fill: C.accent });
      g.arrow(s.xOf(5.2), s.yOf(11.9), s.xOf(6.6), s.yOf(13.6), C.up);
    },
  },
  {
    num: 13, family: 'zones', name: 'Breaker Block', abbr: 'Breaker',
    oneLiner: 'A failed Order Block that flips polarity once structure breaks through it.',
    means: [
      'Starts as a normal Order Block that should hold — but price breaks straight through.',
      'The broken OB is relabelled a Breaker: former support now expected to resist.',
      'Price often returns to retest the breaker before continuing.',
    ],
    keyIdea: 'A Breaker is proof the level failed — trade the retest, not the old bias.',
    caption: 'The zone did not hold, so its role inverts. The retest is the readable event.',
    draw(g, b) {
      const s = g.chart(b, [
        K(12.6,12.9,12.2,12.35), K(12.35,13.6,12.3,13.4), K(13.4,13.7,12.8,13.0),
        K(13.0,13.2,11.6,11.8), K(11.8,12.0,10.6,10.75), K(10.75,12.35,10.7,12.2),
        K(12.2,12.4,11.3,11.45), K(11.45,11.7,10.4,10.6),
      ]);
      g.band(b.x, s.yOf(12.9), b.w, s.yOf(12.2) - s.yOf(12.9), C.down,
           { label: 'breaker (former bullish OB)', labelColor: C.down });
      g.chip(s.xOf(5.4), s.yOf(12.35) - 24, 'rejected', { fill: C.down });
      g.arrow(s.xOf(5.6), s.yOf(12.1), s.xOf(7), s.yOf(10.9), C.down);
    },
  },
  {
    num: 14, family: 'zones', name: 'Mitigation Block', abbr: 'Mit. Block',
    oneLiner: 'The last opposing candle before a move that fails to reach new liquidity.',
    means: [
      'Similar to an Order Block, but the leg it precedes fails to break prior structure.',
      'Because the leg is weak, price is expected to return and mitigate it more precisely.',
      'Used as a tighter, more conservative entry zone than a standard Order Block.',
    ],
    keyIdea: 'Order Block = origin of a strong break. Mitigation Block = origin of a weak, failed leg.',
    caption: 'The distinction is the leg that follows, not the candle itself.',
    draw(g, b) {
      const s = g.chart(b, [
        K(13.4,13.6,12.8,13.0), K(13.0,13.2,12.2,12.35), K(12.35,12.5,11.6,11.75),
        K(11.75,11.9,11.3,11.4), K(11.4,12.9,11.35,12.75), K(12.75,13.05,12.4,12.55),
        K(12.55,12.7,11.7,11.85), K(11.85,12.0,11.2,11.35),
      ]);
      g.level(b.x, b.x + b.w, s.yOf(13.2), { color: C.muted, label: 'prior high' });
      g.band(s.xOf(3) - s.cw * 1.3, s.yOf(11.9), s.cw * 2.6, s.yOf(11.3) - s.yOf(11.9), C.purple);
      g.chip(s.xOf(3) - 46, s.yOf(11.3) + 8, 'mit. block', { fill: C.purple });
      g.chip(s.xOf(5) - 4, s.yOf(13.05) - 26, 'failed to break', { fill: C.down });
    },
  },

  // ===== CONTEXT =====
  {
    num: 15, family: 'context', name: 'Premium vs. Discount', abbr: 'PD',
    oneLiner: 'Splitting a trading range at its 50% equilibrium point.',
    means: [
      'Draw a range from a major swing low to a major swing high.',
      'Above the 50% midpoint (equilibrium) is Premium — the expensive half.',
      'Below the midpoint is Discount — the cheap half.',
    ],
    keyIdea: 'Smart money tends to sell in premium and buy in discount, relative to equilibrium.',
    caption: 'Everything else is read in this context: where in the range is price right now?',
    draw(g, b) {
      const s = g.chart(b, [
        K(10.2,10.6,10.0,10.5), K(10.5,12.0,10.4,11.8), K(11.8,13.6,11.7,13.4),
        K(13.4,14.0,13.1,13.8), K(13.8,14.05,12.6,12.8), K(12.8,13.0,11.6,11.75),
        K(11.75,12.4,11.5,12.3), K(12.3,13.2,12.1,13.0),
      ]);
      const hi = s.yOf(14.05), lo = s.yOf(10.0), mid = (hi + lo) / 2;
      g.band(b.x, hi, b.w, mid - hi, C.down, { label: 'PREMIUM', labelColor: C.down });
      g.band(b.x, mid, b.w, lo - mid, C.up, { label: 'DISCOUNT', labelColor: C.up });
      g.level(b.x, b.x + b.w, mid, { color: C.accent, dashed: true, width: 1.2, label: 'equilibrium' });
    },
  },
];

module.exports = { CONCEPTS };
