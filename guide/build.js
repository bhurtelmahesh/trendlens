const PDFDocument = require('pdfkit');
const fs = require('fs');
const L = require('./lib.js');
const { CONCEPTS } = require('./concepts.js');
const WT = require('./walkthrough.js');
const { W, H, C, FAM, page, chip, eyebrow, body, bullets, panel, footer, chart, level, band, arrow, caption, pdfGfx } = L;

const FOOT_L = 'Smart Money Concepts — a visual field guide';

const OUT = '../app/public/guide-assets';
fs.mkdirSync(OUT, { recursive: true });

const BUILDS = {
  "SMC_ICT_Field_Guide": [
    "cover",
    "howto",
    "p1div",
    "concepts",
    "p2div",
    "chart",
    "steps",
    "outcome",
    "glossary",
    "mistakes",
    "source"
  ],
  "SMC_ICT_Part1_Concepts": [
    "cover",
    "howto",
    "p1div",
    "concepts",
    "glossary",
    "mistakes",
    "source"
  ],
  "SMC_ICT_Part2_RealChart": [
    "cover",
    "p2div",
    "chart",
    "steps",
    "outcome",
    "glossary",
    "mistakes",
    "source"
  ]
};
const TITLES = {
  "SMC_ICT_Field_Guide": [
    "Smart Money Concepts",
    "The vocabulary, and one real trade that uses it",
    "FIELD GUIDE"
  ],
  "SMC_ICT_Part1_Concepts": [
    "Smart Money Concepts",
    "Part one \u2014 the fifteen terms, defined and drawn",
    "PART ONE"
  ],
  "SMC_ICT_Part2_RealChart": [
    "One trade, step by step",
    "Part two \u2014 the sequence on a real BTCUSD chart",
    "PART TWO"
  ]
};

function build(name) {
  const warn = [];
  const fit = (label, got, avail) => { if (got > avail) warn.push(`OVERFLOW ${name} ${label}: ${got.toFixed(0)} > ${avail}`); };
  const [TITLE, SUB, KICKER] = TITLES[name];
  let _p = 0; const pageNo = () => `Page ${_p}`;
  const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: false,
    info: { Title: TITLE + ' — ' + SUB, Author: 'Compiled for study',
            Subject: 'ICT / SMC concepts and one annotated real-chart trade sequence',
            // Pinned so rebuilding is byte-identical. Without it pdfkit stamps
            // the current time and every regeneration shows a phantom diff
            // against the copy committed in app/public.
            CreationDate: new Date(Date.UTC(2026, 7, 30)) } });
  const stream = fs.createWriteStream(OUT + '/' + name + '.pdf');
  doc.pipe(stream);
  // Count every page as it is added so footers stay correct per build.
  const _page = doc.addPage.bind(doc);
  doc.addPage = (...a) => { _p++; return _page(...a); };

  const S = {};
  S['cover'] = () => {
page(doc);
doc.rect(0, 0, W, 5).fill(C.accent);
chip(doc, 54, 66, KICKER, { fill: C.panel2, fg: C.accent, size: 9 });
doc.font('Helvetica-Bold').fontSize(52).fillColor(C.text)
   .text(TITLE, 54, 104, { width: 620, lineGap: -4 });
doc.font('Helvetica').fontSize(19).fillColor(C.muted)
   .text(SUB, 54, 214, { width: 620 });

doc.moveTo(54, 272).lineTo(W - 54, 272).lineWidth(1).stroke(C.line);

const has = k => BUILDS[name].includes(k);
const cols = [
  has('concepts') && ['THE TERMS', '15 concepts', 'Each one defined, with a diagram of what it looks like on a chart.'],
  has('steps') && ['THE SEQUENCE', 'One BTCUSD trade', 'The same ideas applied in order on a real 1-hour chart.'],
  ['THROUGHOUT', 'What would break it', 'Every step names the thing that would invalidate it.'],
].filter(Boolean);
cols.forEach(([e, t, d], i) => {
  const x = 54 + i * 290;
  eyebrow(doc, x, 296, e, C.accent);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(C.text).text(t, x, 314, { width: 250 });
  doc.font('Helvetica').fontSize(10).fillColor(C.muted).text(d, x, 338, { width: 250, lineGap: 3 });
});

panel(doc, 54, 414, W - 108, 62, { fill: C.panel2 });
doc.font('Helvetica-Bold').fontSize(10).fillColor(C.accent)
   .text('Educational reference — not financial advice.', 72, 430, { lineBreak: false });
doc.font('Helvetica').fontSize(9.5).fillColor(C.muted)
   .text('These are widely-taught chart-reading conventions, not verified descriptions of institutional order flow. Nothing here is a signal, a recommendation, or evidence that any particular label is objectively correct.',
         72, 446, { width: W - 144, lineGap: 2 });


  };
  S['howto'] = () => {
page(doc);
doc.font('Helvetica-Bold').fontSize(30).fillColor(C.text).text('How to read this guide', 54, 54);
doc.font('Helvetica').fontSize(12.5).fillColor(C.muted)
   .text('The labels are only useful in a sequence. Learning them as isolated flashcards is the common failure mode — Part Two exists to show the order they actually appear in.',
         54, 100, { width: 520, lineGap: 4 });

const steps = [
  ['1', 'Learn the four families', 'Structure, liquidity, zones, and context. Every term belongs to one of them.'],
  ['2', 'Read the sequence', 'Liquidity event, then structure shift, then a zone, then the entry. Order matters.'],
  ['3', 'Define invalidation first', 'If you cannot say what would prove the read wrong, it is not a read.'],
];
steps.forEach(([n, t, d], i) => {
  const y = 178 + i * 92;
  doc.circle(72, y + 14, 15).fill(C.panel2);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(C.accent);
  const nw = doc.widthOfString(n);
  doc.text(n, 72 - nw / 2, y + 8, { lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(14).fillColor(C.text).text(t, 104, y + 2, { width: 430 });
  doc.font('Helvetica').fontSize(10.5).fillColor(C.muted).text(d, 104, y + 24, { width: 430, lineGap: 3 });
});

panel(doc, 588, 150, 318, 300, { fill: C.panel });
eyebrow(doc, 612, 174, 'The honest caveat', C.accent);
doc.font('Helvetica').fontSize(10.5).fillColor(C.text)
   .text('Every concept here is a way of describing a chart after the fact. The descriptions are consistent and teachable, which is what makes them useful for building rules.',
         612, 194, { width: 270, lineGap: 4 });
doc.font('Helvetica').fontSize(10.5).fillColor(C.muted)
   .text('What they are not is proof. Nobody reading a retail chart can see institutional order books. When a label seems to explain a move perfectly, that is often hindsight doing the work.',
         612, 268, { width: 270, lineGap: 4 });
doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.accent)
   .text('Treat every setup here as a hypothesis to test on your own data — never as a signal to follow.',
         612, 360, { width: 270, lineGap: 4 });
footer(doc, FOOT_L, pageNo());


  };
  S['p1div'] = () => {
page(doc);
chip(doc, 54, 54, 'PART ONE', { fill: C.accent });
doc.font('Helvetica-Bold').fontSize(34).fillColor(C.text).text('The vocabulary', 54, 84);
doc.font('Helvetica').fontSize(12).fillColor(C.muted)
   .text('Fifteen terms, grouped into the four families they belong to. The original order these are usually taught in is arbitrary; this grouping is not.',
         54, 128, { width: 560, lineGap: 4 });

const famOrder = ['structure', 'liquidity', 'zones', 'context'];
const famBlurb = {
  structure: 'What the trend is doing, and when it changes.',
  liquidity: 'Where the stop orders sit, and why price goes to get them.',
  zones: 'The specific areas a move originates from or returns to.',
  context: 'Where in the wider range this is all happening.',
};
famOrder.forEach((f, i) => {
  const x = 54, y = 196 + i * 78;
  const items = CONCEPTS.filter(c => c.family === f);
  doc.roundedRect(x, y, W - 108, 66, 8).fill(C.panel);
  doc.rect(x, y, 4, 66).fill(FAM[f].color);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(FAM[f].color).text(FAM[f].name, x + 22, y + 13, { lineBreak: false });
  doc.font('Helvetica').fontSize(9.5).fillColor(C.muted).text(famBlurb[f], x + 22, y + 32, { width: 230, lineGap: 2 });
  let cx = x + 286;
  items.forEach(c => {
    const w = chip(doc, cx, y + 24, `${c.num}. ${c.abbr}`, { fill: C.panel2, fg: FAM[f].color, size: 9.5 });
    cx += w + 8;
  });
});
footer(doc, FOOT_L, pageNo());


  };
  S['concepts'] = () => {
CONCEPTS.forEach((c, idx) => {
  page(doc);
  const fam = FAM[c.family];
  const LX = 54, LW = 396;
  const RX = 496, RW = 410;

  chip(doc, LX, 46, `${String(c.num).padStart(2, '0')}  ·  ${fam.name.toUpperCase()}`, { fill: C.panel2, fg: fam.color });
  doc.font('Helvetica-Bold').fontSize(27).fillColor(C.text).text(c.name, LX, 74, { width: LW, lineGap: -2 });
  const nameH = doc.y;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(fam.color).text(c.abbr, LX, nameH + 4, { width: LW });
  doc.font('Helvetica').fontSize(12).fillColor(C.muted).text(c.oneLiner, LX, doc.y + 6, { width: LW, lineGap: 4 });

  eyebrow(doc, LX, 208, 'What it means');
  const endY = bullets(doc, LX, 226, c.means, LW, { size: 10.8 });
  fit(`concept ${c.num} bullets`, endY, 376);

  panel(doc, LX, 386, LW, 92, { fill: C.panel2 });
  eyebrow(doc, LX + 18, 402, 'Key idea', fam.color);
  doc.font('Helvetica').fontSize(10.8).fillColor(C.text)
     .text(c.keyIdea, LX + 18, 420, { width: LW - 36, lineGap: 3.5 });
  fit(`concept ${c.num} keyIdea`, doc.y, 474);

  // Diagram
  panel(doc, RX, 46, RW, 432, { fill: C.panel });
  // Box stops well short of the panel edge so level labels have a gutter.
  const box = { x: RX + 34, y: 88, w: 296, h: 280 };
  c.draw(pdfGfx(doc), box);
  doc.undash().opacity(1);
  caption(doc, RX + 24, 400, RW - 48, c.caption);

  footer(doc, FOOT_L, `Concept ${c.num} of 15  ·  ` + pageNo());
});


  };
  S['p2div'] = () => {
page(doc);
chip(doc, 54, 54, 'PART TWO', { fill: C.blue });
doc.font('Helvetica-Bold').fontSize(34).fillColor(C.text).text('The sequence, on a real chart', 54, 84);
doc.font('Helvetica').fontSize(12).fillColor(C.muted)
   .text('One BTCUSD 1-hour setup, annotated step by step. No synthetic candles — every screenshot that follows is the same real chart.',
         54, 128, { width: 620, lineGap: 4 });

const seq = [
  ['1', 'Sell-side liquidity sweep', 'Price takes the obvious low, then rejects.', C.accent],
  ['2', 'MSS / displacement', 'A decisive break of short-term structure upward.', C.blue],
  ['3', 'Order Block + FVG', 'The impulse leaves a zone and an imbalance behind.', C.purple],
  ['4', 'Retracement and entry', 'Price returns to the zone; the trigger fires there.', C.up],
  ['5', 'Stop loss', 'Placed beyond the structural invalidation, for a reason.', C.down],
  ['6', 'Take profit', 'Toward the opposing liquidity, also for a reason.', C.up],
];
seq.forEach(([n, t, d, col], i) => {
  const x = 54 + (i % 3) * 290, y = 210 + Math.floor(i / 3) * 130;
  panel(doc, x, y, 268, 108, { fill: C.panel });
  chip(doc, x + 18, y + 16, n, { fill: col, padX: 8 });
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(C.text).text(t, x + 18, y + 44, { width: 232 });
  doc.font('Helvetica').fontSize(9.5).fillColor(C.muted).text(d, x + 18, y + 66, { width: 232, lineGap: 2.5 });
});
footer(doc, FOOT_L, pageNo());


  };
  S['chart'] = () => {
page(doc);
doc.font('Helvetica-Bold').fontSize(24).fillColor(C.text).text('The chart, before any labels', 54, 44);
doc.font('Helvetica').fontSize(10.5).fillColor(C.muted)
   .text('BTCUSD, 1-hour bars, 28 Aug \u2013 3 Sep 2025 \u2014 real prices, redrawn. Worth one look with fresh eyes before the annotations tell you what to see.',
         54, 78, { width: 620, lineGap: 3 });
panel(doc, 54, 118, W - 108, 348, { fill: C.panel, radius: 6 });
WT.CONTEXT_DRAW(pdfGfx(doc), { x: 96, y: 150, w: W - 210, h: 286 });
doc.undash().opacity(1);
footer(doc, 'Price data: Yahoo Finance \u2014 BTC-USD 1h', pageNo());
  };

  S['steps'] = () => {
const STEPS = WT.STEPS;

STEPS.forEach((s, i) => {
  page(doc);
  const LX = 54, LW = 320;
  chip(doc, LX, 44, `STEP ${s.n} OF 6`, { fill: s.color, fg: '#0d1117' });
  doc.font('Helvetica-Bold').fontSize(25).fillColor(C.text).text(s.title, LX, 72, { width: LW, lineGap: -1 });
  doc.font('Helvetica').fontSize(11).fillColor(C.muted).text(s.lead, LX, doc.y + 6, { width: LW, lineGap: 4 });

  eyebrow(doc, LX, 186, 'What to look for');
  const by = bullets(doc, LX, 204, s.look, LW, { size: 10.3, gap: 8 });
  fit(`step ${s.n} bullets`, by, 352);

  panel(doc, LX, 360, LW, 120, { fill: C.panel2 });
  eyebrow(doc, LX + 16, 376, 'The trap', C.down);
  doc.font('Helvetica').fontSize(10.2).fillColor(C.text).text(s.trap, LX + 16, 394, { width: LW - 32, lineGap: 3.5 });
  fit(`step ${s.n} trap`, doc.y, 476);

  panel(doc, 400, 44, 506, 436, { fill: C.panel, radius: 6 });
  s.draw(pdfGfx(doc), { x: 436, y: 84, w: 400, h: 330 });
  doc.undash().opacity(1);
  footer(doc, 'BTCUSD 1h · real bars via Yahoo Finance', pageNo());
});


  };
  S['glossary'] = () => {
page(doc);
doc.font('Helvetica-Bold').fontSize(28).fillColor(C.text).text('Glossary', 54, 44);
doc.font('Helvetica').fontSize(11).fillColor(C.muted).text('All fifteen, at a glance.', 54, 82);
CONCEPTS.forEach((c, i) => {
  const col = i % 2, row = Math.floor(i / 2);
  const x = 54 + col * 430, y = 118 + row * 47;
  const fam = FAM[c.family];
  doc.circle(x + 9, y + 10, 9).fill(C.panel2);
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(fam.color);
  const nw = doc.widthOfString(String(c.num));
  doc.text(String(c.num), x + 9 - nw / 2, y + 6.5, { lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.text).text(c.name, x + 28, y, { width: 380, lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor(C.muted).text(c.oneLiner, x + 28, y + 15, { width: 372, lineGap: 1.5 });
});
footer(doc, FOOT_L, pageNo());


  };
  S['outcome'] = () => {
page(doc);
doc.font('Helvetica-Bold').fontSize(28).fillColor(C.text).text('What happened next', 54, 44);
doc.font('Helvetica').fontSize(11).fillColor(C.muted)
   .text('The setup is read at the displacement candle on 2 September, so the entry, stop and target are forward-looking from that moment \u2014 not history. Here is how it actually resolved, from the same price data.',
         54, 84, { width: 700, lineGap: 3.5 });
const OC = [
  ['Retrace into the gap', 'Filled', '2 Sep, 15:00 \u2014 two hours after the impulse.', C.up],
  ['Objective 111,686', 'Reached', '3 Sep, 00:00 \u2014 about eleven hours later.', C.up],
  ['Stop 108,400', 'Never touched', 'The low held; price ran to 113,284 that week.', C.text],
];
OC.forEach(([k, v, d, col], i) => {
  const x = 54 + i * 290;
  panel(doc, x, 156, 268, 132, { fill: C.panel });
  eyebrow(doc, x + 20, 176, k);
  doc.font('Helvetica-Bold').fontSize(20).fillColor(col).text(v, x + 20, 196, { width: 228 });
  doc.font('Helvetica').fontSize(9.8).fillColor(C.muted).text(d, x + 20, 228, { width: 228, lineGap: 2.5 });
});
panel(doc, 54, 316, W - 108, 116, { fill: C.panel2 });
eyebrow(doc, 76, 336, 'And that proves nothing', C.accent);
doc.font('Helvetica').fontSize(10.5).fillColor(C.text)
   .text('One setup resolving as anticipated is a single observation. It does not measure how often the pattern works, what it costs when it fails, or whether the labels would have been drawn the same way before the move rather than after it. That is the whole reason this guide keeps saying: test it on your own data.',
         76, 356, { width: W - 152, lineGap: 4 });
footer(doc, FOOT_L, pageNo());
  };

  S['mistakes'] = () => {
page(doc);
doc.font('Helvetica-Bold').fontSize(28).fillColor(C.text).text('Five ways this goes wrong', 54, 44);
doc.font('Helvetica').fontSize(11).fillColor(C.muted)
   .text('Each of these is a failure of method, not of the concepts themselves.', 54, 84, { width: 620 });
const MIST = [
  ['Labelling after the move', 'Any chart can be annotated perfectly in hindsight. The test is whether you marked the zone before price reached it.'],
  ['Finding a zone anywhere', 'FVGs and order blocks exist on every chart at every scale. Without the sequence — liquidity, then structure — they are just rectangles.'],
  ['Skipping invalidation', 'If a setup has no level that would prove it wrong, it cannot be tested, and it cannot be traded with defined risk.'],
  ['Treating one example as evidence', 'The walkthrough in Part Two is a single trade. One example shows what the pattern looks like; it says nothing about how often it works.'],
  ['Confusing vocabulary with edge', 'Knowing the terms makes charts easier to discuss. It does not by itself make anyone profitable.'],
];
MIST.forEach(([t, d], i) => {
  const y = 128 + i * 72;
  doc.roundedRect(54, y, W - 108, 62, 8).fill(C.panel);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.down).text(String(i + 1), 74, y + 22, { lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.text).text(t, 96, y + 12, { width: 300 });
  doc.font('Helvetica').fontSize(9.8).fillColor(C.muted).text(d, 96, y + 30, { width: 730, lineGap: 2.5 });
});
footer(doc, FOOT_L, pageNo());


  };
  S['source'] = () => {
page(doc);
doc.font('Helvetica-Bold').fontSize(28).fillColor(C.text).text('Source and caveats', 54, 44);
panel(doc, 54, 100, 400, 180, { fill: C.panel });
eyebrow(doc, 76, 122, 'Where this comes from', C.blue);
[['Instrument', 'BTC-USD · 1 hour'], ['Price data', 'Yahoo Finance'],
 ['Window', '28 Aug – 3 Sep 2025'], ['Compiled by', 'bhurtelmahesh']]
  .forEach(([k, v], i) => {
    const y = 148 + i * 30;
    doc.font('Helvetica').fontSize(10).fillColor(C.muted).text(k, 76, y, { width: 110, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text).text(v, 190, y, { width: 240, lineBreak: false });
  });

panel(doc, 480, 100, 426, 180, { fill: C.panel });
eyebrow(doc, 502, 122, 'What the annotations are', C.accent);
doc.font('Helvetica').fontSize(10.2).fillColor(C.text)
   .text('Every candle in Part Two is real BTC-USD hourly data, drawn from the price series rather than traced from a screenshot. The labels explain the SMC / ICT reading of what the chart did; they are not proof those labels correspond to real institutional orders.',
         502, 144, { width: 382, lineGap: 3.5 });
doc.font('Helvetica').fontSize(10.2).fillColor(C.muted)
   .text('Use the setup as a framework to test against your own data, not as a signal.', 502, 232, { width: 382, lineGap: 3.5 });

panel(doc, 54, 306, W - 108, 116, { fill: C.panel2 });
eyebrow(doc, 76, 326, 'Disclaimer', C.down);
doc.font('Helvetica').fontSize(10.2).fillColor(C.text)
   .text('This document is educational material about chart-reading conventions. It is not financial, investment, or trading advice, and nothing in it is a recommendation or a prediction. Markets carry risk of loss. Any decision you make is your own responsibility.',
         76, 346, { width: W - 152, lineGap: 4 });
footer(doc, FOOT_L, pageNo());


  };

  for (const k of BUILDS[name]) S[k]();
  doc.end();
  return new Promise(res => stream.on('finish', () => res(warn)));
}

(async () => {
  for (const name of Object.keys(BUILDS)) {
    const warn = await build(name);
    const kb = (fs.statSync(OUT + '/' + name + '.pdf').size / 1024).toFixed(0);
    console.log(`  ${name}.pdf  ${kb} KB` + (warn.length ? '\n   ' + warn.join('\n   ') : ''));
  }
})();