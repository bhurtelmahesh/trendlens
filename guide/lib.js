// Shared drawing helpers for the SMC/ICT deck.
const W = 960, H = 540;

const C = {
  bg:      '#0d1117',
  panel:   '#161b22',
  panel2:  '#1c2430',
  line:    '#2a3441',
  text:    '#e6edf3',
  muted:   '#8b949e',
  dim:     '#6e7681',
  up:      '#3fb950',
  down:    '#f85149',
  accent:  '#d29922',
  blue:    '#58a6ff',
  purple:  '#bc8cff',
};

// Family colours — used consistently for the concept chips and the map.
const FAM = {
  structure: { name: 'Structure',        color: '#58a6ff' },
  liquidity: { name: 'Liquidity',        color: '#d29922' },
  zones:     { name: 'Zones & imbalance',color: '#bc8cff' },
  context:   { name: 'Context',          color: '#3fb950' },
};

function page(doc, { bg = C.bg } = {}) {
  doc.addPage();
  doc.rect(0, 0, W, H).fill(bg);
  return doc;
}

/** Small rounded pill — the deck's one repeated motif, echoing the chart labels. */
function chip(doc, x, y, text, { fill = C.accent, fg = '#0d1117', size = 9, padX = 7, h = 17 } = {}) {
  doc.font('Helvetica-Bold').fontSize(size);
  const w = doc.widthOfString(text) + padX * 2;
  doc.roundedRect(x, y, w, h, h / 2).fill(fill);
  doc.fillColor(fg).text(text, x + padX, y + (h - size) / 2 - 0.5, { lineBreak: false });
  return w;
}

/** Section label in caps — used above blocks of body copy. */
function eyebrow(doc, x, y, text, color = C.dim) {
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(color)
     .text(text.toUpperCase(), x, y, { characterSpacing: 1.1, lineBreak: false });
}

function body(doc, x, y, text, w, { size = 11.5, color = C.text, gap = 4.5, font = 'Helvetica' } = {}) {
  doc.font(font).fontSize(size).fillColor(color).text(text, x, y, { width: w, lineGap: gap });
  return doc.y;
}

/** Bulleted list with a small square marker. Returns the y after the list. */
function bullets(doc, x, y, items, w, { size = 11, color = C.text, gap = 9, dot = C.dim } = {}) {
  let cy = y;
  for (const it of items) {
    doc.rect(x, cy + size * 0.42, 3.5, 3.5).fill(dot);
    doc.font('Helvetica').fontSize(size).fillColor(color)
       .text(it, x + 13, cy, { width: w - 13, lineGap: 3.5 });
    cy = doc.y + gap;
  }
  return cy;
}

function panel(doc, x, y, w, h, { fill = C.panel, radius = 10, stroke = null } = {}) {
  doc.roundedRect(x, y, w, h, radius).fill(fill);
  if (stroke) doc.roundedRect(x, y, w, h, radius).lineWidth(1).stroke(stroke);
}

/** Footer rule + text, identical on every content page. */
function footer(doc, left, right) {
  doc.font('Helvetica').fontSize(8).fillColor(C.dim)
     .text(left, 54, H - 30, { width: 600, lineBreak: false });
  if (right) {
    doc.font('Helvetica').fontSize(8).fillColor(C.dim)
       .text(right, W - 354, H - 30, { width: 300, align: 'right', lineBreak: false });
  }
}

// ---------------------------------------------------------------------------
// Candle diagram engine
// ---------------------------------------------------------------------------

/**
 * Draw an OHLC series inside `box`, auto-scaled with padding.
 * Returns { xOf(i), yOf(price), cw } so callers can position annotations
 * against the same scale the candles were drawn on.
 */
function chart(doc, box, series, opts = {}) {
  const { x, y, w, h } = box;
  const pad = opts.pad ?? 0.10;
  let lo = Math.min(...series.map(c => c.l));
  let hi = Math.max(...series.map(c => c.h));
  if (opts.include) for (const p of opts.include) { lo = Math.min(lo, p); hi = Math.max(hi, p); }
  const span = (hi - lo) || 1;
  lo -= span * pad; hi += span * pad;

  const n = series.length;
  const slot = w / n;
  const cw = Math.min(opts.maxWidth ?? 14, slot * 0.62);
  const xOf = i => x + slot * (i + 0.5);
  const yOf = p => y + h - ((p - lo) / (hi - lo)) * h;

  series.forEach((c, i) => {
    const cx = xOf(i);
    const bull = c.c >= c.o;
    const col = c.dim ? C.dim : bull ? C.up : C.down;
    doc.lineWidth(1.2).strokeColor(col)
       .moveTo(cx, yOf(c.h)).lineTo(cx, yOf(c.l)).stroke();
    const top = yOf(Math.max(c.o, c.c));
    const bh = Math.max(1.6, Math.abs(yOf(c.o) - yOf(c.c)));
    doc.rect(cx - cw / 2, top, cw, bh).fill(col);
  });

  return { xOf, yOf, cw, slot };
}

/** Horizontal price level with an optional right-hand label. */
function level(doc, x1, x2, y, { color = C.muted, dashed = true, label = null, width = 1, labelSide = 'right' } = {}) {
  doc.lineWidth(width).strokeColor(color);
  if (dashed) doc.dash(3, { space: 3 }); else doc.undash();
  doc.moveTo(x1, y).lineTo(x2, y).stroke();
  doc.undash();
  if (label) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(color);
    const tw = doc.widthOfString(label);
    const lx = labelSide === 'right' ? x2 + 5 : x1 - tw - 5;
    doc.text(label, lx, y - 4.5, { lineBreak: false });
  }
}

/** Translucent-looking zone band (flat tint — PDF alpha kept simple). */
function band(doc, x, y, w, h, color, { label = null, labelColor = null, align = 'left' } = {}) {
  doc.save().fillColor(color).opacity(0.20).rect(x, y, w, h).fill().restore();
  doc.lineWidth(0.8).strokeColor(color).rect(x, y, w, h).stroke();
  if (label) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(labelColor || color);
    if (align === 'left') doc.text(label, x + 6, y + h / 2 - 4, { lineBreak: false });
    else {
      const tw = doc.widthOfString(label);
      doc.text(label, x + w - tw - 6, y + h / 2 - 4, { lineBreak: false });
    }
  }
}

function arrow(doc, x1, y1, x2, y2, color = C.blue, width = 1.6) {
  doc.lineWidth(width).strokeColor(color).moveTo(x1, y1).lineTo(x2, y2).stroke();
  const a = Math.atan2(y2 - y1, x2 - x1), s = 6;
  doc.moveTo(x2, y2)
     .lineTo(x2 - s * Math.cos(a - Math.PI / 7), y2 - s * Math.sin(a - Math.PI / 7))
     .lineTo(x2 - s * Math.cos(a + Math.PI / 7), y2 - s * Math.sin(a + Math.PI / 7))
     .closePath().fill(color);
}

/** Caption pinned under a diagram. */
function caption(doc, x, y, w, text) {
  doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(C.dim)
     .text(text, x, y, { width: w, lineGap: 2 });
}

module.exports = { W, H, C, FAM, page, chip, eyebrow, body, bullets, panel, footer, chart, level, band, arrow, caption };

/** PDF-backed graphics object handed to each concept's draw(). */
function pdfGfx(doc) {
  return {
    chart: (b, series, opts)          => chart(doc, b, series, opts),
    level: (x1, x2, y, o)             => level(doc, x1, x2, y, o),
    band:  (x, y, w, h, c, o)         => band(doc, x, y, w, h, c, o),
    arrow: (x1, y1, x2, y2, c, w)     => arrow(doc, x1, y1, x2, y2, c, w),
    chip:  (x, y, t, o)               => chip(doc, x, y, t, o),
    label: (x, y, t, o = {})          => {
      const size = o.size ?? 8;
      doc.font('Helvetica').fontSize(size).fillColor(o.color ?? C.dim);
      const w = doc.widthOfString(t);
      const dx = o.anchor === 'middle' ? -w / 2 : o.anchor === 'end' ? -w : 0;
      doc.text(t, x + dx, y, { lineBreak: false });
    },
  };
}
module.exports.pdfGfx = pdfGfx;
