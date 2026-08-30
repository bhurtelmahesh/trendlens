// SVG backend for the concept diagrams — same interface as lib.js's pdfGfx,
// so concepts.js draws identically to a PDF page and to an inline <svg>.
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// Helvetica advance widths are close enough to the web stack for centring.
const APPROX_CHAR_W = 0.55;
const textW = (t, size) => t.length * size * APPROX_CHAR_W;

function svgGfx(theme) {
  const out = [];
  const T = theme;
  const push = s => out.push(s);

  const api = {
    chart(b, series, opts = {}) {
      const { x, y, w, h } = b;
      const pad = opts.pad ?? 0.10;
      let lo = Math.min(...series.map(c => c.l));
      let hi = Math.max(...series.map(c => c.h));
      if (opts.include) for (const p of opts.include) { lo = Math.min(lo, p); hi = Math.max(hi, p); }
      const span = (hi - lo) || 1;
      lo -= span * pad; hi += span * pad;
      const n = series.length, slot = w / n;
      const cw = Math.min(opts.maxWidth ?? 14, slot * 0.62);
      const xOf = i => x + slot * (i + 0.5);
      const yOf = p => y + h - ((p - lo) / (hi - lo)) * h;
      series.forEach((c, i) => {
        const cx = xOf(i), bull = c.c >= c.o;
        const col = c.dim ? T.dim : bull ? T.up : T.down;
        push(`<line x1="${cx.toFixed(1)}" y1="${yOf(c.h).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${yOf(c.l).toFixed(1)}" stroke="${col}" stroke-width="1.2"/>`);
        const top = yOf(Math.max(c.o, c.c));
        const bh = Math.max(1.6, Math.abs(yOf(c.o) - yOf(c.c)));
        push(`<rect x="${(cx - cw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${cw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${col}"/>`);
      });
      return { xOf, yOf, cw, slot };
    },
    level(x1, x2, y, o = {}) {
      const color = o.color ?? T.muted;
      const dash = (o.dashed ?? true) ? ' stroke-dasharray="3 3"' : '';
      push(`<line x1="${x1.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${color}" stroke-width="${o.width ?? 1}"${dash}/>`);
      if (o.label) {
        const side = o.labelSide ?? 'right';
        const lx = side === 'right' ? x2 + 5 : x1 - 5;
        const anchor = side === 'right' ? 'start' : 'end';
        push(`<text x="${lx.toFixed(1)}" y="${(y + 3).toFixed(1)}" fill="${color}" font-size="8" font-weight="700" text-anchor="${anchor}" font-family="var(--mono)">${esc(o.label)}</text>`);
      }
    },
    band(x, y, w, h, color, o = {}) {
      push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.abs(h).toFixed(1)}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="0.8"/>`);
      if (o.label) {
        const c = o.labelColor || color;
        const right = o.align === 'right';
        const lx = right ? x + w - 6 : x + 6;
        push(`<text x="${lx.toFixed(1)}" y="${(y + Math.abs(h) / 2 + 3).toFixed(1)}" fill="${c}" font-size="8" font-weight="700" text-anchor="${right ? 'end' : 'start'}" font-family="var(--mono)">${esc(o.label)}</text>`);
      }
    },
    arrow(x1, y1, x2, y2, color = T.blue, width = 1.6) {
      const a = Math.atan2(y2 - y1, x2 - x1), s = 6;
      push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${width}"/>`);
      const p = [[x2, y2],
                 [x2 - s * Math.cos(a - Math.PI / 7), y2 - s * Math.sin(a - Math.PI / 7)],
                 [x2 - s * Math.cos(a + Math.PI / 7), y2 - s * Math.sin(a + Math.PI / 7)]]
                .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
      push(`<polygon points="${p}" fill="${color}"/>`);
    },
    chip(x, y, text, o = {}) {
      const size = o.size ?? 9, padX = o.padX ?? 7, h = o.h ?? 17;
      const w = textW(text, size) + padX * 2;
      push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h}" rx="${h / 2}" fill="${o.fill ?? T.accent}"/>`);
      push(`<text x="${(x + w / 2).toFixed(1)}" y="${(y + h / 2 + 3).toFixed(1)}" fill="${o.fg ?? T.chipFg}" font-size="${size}" font-weight="700" text-anchor="middle" font-family="var(--mono)">${esc(text)}</text>`);
      return w;
    },
    label(x, y, text, o = {}) {
      const size = o.size ?? 8;
      const anchor = o.anchor === 'middle' ? 'middle' : o.anchor === 'end' ? 'end' : 'start';
      push(`<text x="${x.toFixed(1)}" y="${(y + size).toFixed(1)}" fill="${o.color ?? T.dim}" font-size="${size}" text-anchor="${anchor}" font-family="var(--mono)">${esc(text)}</text>`);
    },
    toString: () => out.join(''),
  };
  return api;
}
module.exports = { svgGfx };
