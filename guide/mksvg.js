const { CONCEPTS } = require('./concepts.js');
const { svgGfx } = require('./svg.js');
const fs = require('fs');

// Diagram colours are referenced as CSS custom properties so each SVG follows
// the page's light/dark tokens instead of baking one theme in.
const THEME = { up:'var(--up)', down:'var(--down)', dim:'var(--muted)', muted:'var(--muted)',
                accent:'var(--accent)', blue:'var(--blue)', purple:'var(--purple)', chipFg:'var(--chip-fg)' };

const VB = { w: 300, h: 250 };
const out = {};
for (const c of CONCEPTS) {
  const g = svgGfx(THEME);
  // Inset leaves room for level labels in the right-hand gutter.
  c.draw(g, { x: 4, y: 26, w: VB.w - 74, h: VB.h - 62 });
  out[c.num] = `<svg viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-label="${c.name} diagram" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
}
fs.writeFileSync('diagrams.json', JSON.stringify(out));
console.log('  wrote diagrams.json —', Object.keys(out).length, 'diagrams,',
            (fs.statSync('diagrams.json').size / 1024).toFixed(0), 'KB');

// --- Part Two: the walkthrough, same renderer, real BTCUSD bars -----------
const WT = require('./walkthrough.js');
const wt = {};
for (const s of WT.STEPS) {
  const g = svgGfx(THEME);
  s.draw(g, { x: 6, y: 20, w: 440 - 64, h: 250 - 46 });
  wt[s.n] = `<svg viewBox="0 0 440 250" role="img" aria-label="Step ${s.n}: ${s.title}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
}
{
  const g = svgGfx(THEME);
  WT.CONTEXT_DRAW(g, { x: 8, y: 16, w: 900 - 70, h: 330 - 40 });
  wt.context = `<svg viewBox="0 0 900 330" role="img" aria-label="BTCUSD 1-hour bars, 28 August to 3 September 2025" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
}
fs.writeFileSync('walkthrough.json', JSON.stringify(wt));
console.log('  wrote walkthrough.json —', Object.keys(wt).length, 'diagrams,',
            (fs.statSync('walkthrough.json').size / 1024).toFixed(0), 'KB');
