const fs = require('fs');
const { CONCEPTS } = require('./concepts.js');
const DIA = JSON.parse(fs.readFileSync('diagrams.json', 'utf8'));
const WTD = JSON.parse(fs.readFileSync('walkthrough.json', 'utf8'));
const WT = require('./walkthrough.js');
const b64 = f => fs.readFileSync('../app/public/guide-assets/' + f).toString('base64');
// Two targets from one template: the Claude artifact (downloads capability,
// head supplied by the host) and a self-hosted copy served from TrendLens
// itself (plain <a download>, own <head>, local fonts, external script).
const HOSTED = process.argv.includes('--hosted');
const FONT_CSS = HOSTED ? fs.readFileSync('fonts/local.css', 'utf8') : '';
const FILTER_JS = `// Family filter
const fams = [...document.querySelectorAll('.fam')];
for (const b of document.querySelectorAll('.filter button')) {
  b.addEventListener('click', () => {
    for (const o of document.querySelectorAll('.filter button')) o.setAttribute('aria-pressed', String(o === b));
    const f = b.dataset.f;
    for (const fam of fams) fam.hidden = f !== 'all' && fam.dataset.fam !== f;
  });
}
`;

const FAMILIES = [
  ['structure', 'Structure',         'What the trend is doing, and when it changes.'],
  ['liquidity', 'Liquidity',         'Where the stop orders sit, and why price goes to get them.'],
  ['zones',     'Zones & imbalance', 'The specific areas a move originates from or returns to.'],
  ['context',   'Context',           'Where in the wider range this is all happening.'],
];

const STEPS = WT.STEPS;

const MISTAKES = [
  ['Labelling after the move', 'Any chart can be annotated perfectly in hindsight. The test is whether you marked the zone before price reached it.'],
  ['Finding a zone anywhere', 'FVGs and order blocks exist on every chart at every scale. Without the sequence — liquidity, then structure — they are just rectangles.'],
  ['Skipping invalidation', 'If a setup has no level that would prove it wrong, it cannot be tested, and it cannot be traded with defined risk.'],
  ['Treating one example as evidence', 'The walkthrough below is a single trade. One example shows what the pattern looks like; it says nothing about how often it works.'],
  ['Confusing vocabulary with edge', 'Knowing the terms makes charts easier to discuss. It does not by itself make anyone profitable.'],
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const li = a => a.map(x => `<li>${esc(x)}</li>`).join('');

const conceptCard = c => `
<article class="plate" id="c${c.num}" data-fam="${c.family}">
  <div class="plate-fig">${DIA[c.num]}</div>
  <div class="plate-body">
    <p class="plate-no"><span>Plate ${String(c.num).padStart(2, '0')}</span><b>${esc(c.abbr)}</b></p>
    <h3>${esc(c.name)}</h3>
    <p class="lede">${esc(c.oneLiner)}</p>
    <ul class="means">${li(c.means)}</ul>
    <p class="key"><span>Key idea</span>${esc(c.keyIdea)}</p>
  </div>
</article>`;

const stepCard = s => `
<article class="step" id="s${s.n}">
  <figure class="step-fig">${WTD[s.n]}</figure>
  <div class="step-body">
    <p class="step-no"><span class="num">${s.n}</span> of 6</p>
    <h3>${esc(s.title)}</h3>
    <p class="lede">${esc(s.lead)}</p>
    <p class="eyebrow">What to look for</p>
    <ul class="means">${li(s.look)}</ul>
    <p class="trap"><span>The trap</span>${esc(s.trap)}</p>
  </div>
</article>`;

const HEAD = HOSTED
  ? `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Smart Money Concepts &mdash; TrendLens</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Fifteen ICT / Smart Money Concepts terms drawn as diagrams, plus one real BTCUSD trade worked through step by step.">
<link rel="icon" type="image/svg+xml" href="./favicon.svg">
<style>${FONT_CSS}</style>
<style>`
  : `<title>Smart Money Concepts</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600;6..72,700&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>`;

const html = `${HEAD}
:root{
  --paper:#edf0f3; --surface:#ffffff; --sunk:#e3e8ed;
  --ink:#10171e; --muted:#5c6773; --rule:#d3dae1;
  --accent:#1f5c8b; --blue:#1f5c8b; --ochre:#a8761b;
  --up:#157f5f; --down:#a8382b; --purple:#6b4e9b;
  --chip-fg:#ffffff; --shadow:0 1px 2px rgba(16,23,30,.06),0 8px 24px rgba(16,23,30,.06);
  --display:"Newsreader",Georgia,"Times New Roman",serif;
  --body:"Public Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,"SFMono-Regular",Menlo,monospace;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --paper:#0e1317; --surface:#161d24; --sunk:#11171d;
    --ink:#e4eaf0; --muted:#93a0ac; --rule:#26313b;
    --accent:#6fb2e8; --blue:#6fb2e8; --ochre:#d8a54a;
    --up:#46b98a; --down:#e0705f; --purple:#a98bd8;
    --chip-fg:#0e1317; --shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.35);
  }
}
:root[data-theme="dark"]{
  --paper:#0e1317; --surface:#161d24; --sunk:#11171d;
  --ink:#e4eaf0; --muted:#93a0ac; --rule:#26313b;
  --accent:#6fb2e8; --blue:#6fb2e8; --ochre:#d8a54a;
  --up:#46b98a; --down:#e0705f; --purple:#a98bd8;
  --chip-fg:#0e1317; --shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px rgba(0,0,0,.35);
}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.65 var(--body);-webkit-font-smoothing:antialiased}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
h1,h2,h3{font-family:var(--display);font-weight:600;text-wrap:balance;margin:0}
a{color:var(--accent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:3px}

/* ---- masthead ---- */
.mast{padding:72px 0 40px;border-bottom:1px solid var(--rule)}
.kicker{font:600 11px/1 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--ochre);margin:0 0 20px}
h1{font-size:clamp(40px,7vw,68px);line-height:1.02;letter-spacing:-.02em}
.sub{font-size:clamp(17px,2.2vw,21px);color:var(--muted);margin:18px 0 0;max-width:34em;font-family:var(--display)}
.mast-grid{display:grid;grid-template-columns:1.35fr .9fr;gap:48px;align-items:end;margin-top:40px}
@media(max-width:820px){.mast-grid{grid-template-columns:1fr;gap:32px;align-items:start}}

/* ---- download ---- */
.dl{background:var(--surface);border:1px solid var(--rule);border-radius:4px;padding:24px;box-shadow:var(--shadow)}
.dl h2{font-size:19px}
.dl p{font-size:13.5px;color:var(--muted);margin:8px 0 18px}
.btn{display:inline-flex;align-items:center;gap:10px;background:var(--ink);color:var(--paper);border:0;
  border-radius:3px;padding:13px 20px;font:600 14px/1 var(--body);cursor:pointer;width:100%;justify-content:center}
.btn{text-decoration:none}
.btn:hover{opacity:.88}
.dl-note a{color:var(--accent)}
.btn[disabled]{opacity:.5;cursor:not-allowed}
.dl-meta{font:500 11px/1.5 var(--mono);color:var(--muted);margin:12px 0 0;text-align:center;letter-spacing:.02em}
.dl-note{font-size:12.5px;color:var(--muted);margin:14px 0 0;padding-top:14px;border-top:1px solid var(--rule)}
.dl-note button{background:none;border:0;color:var(--accent);font:inherit;text-decoration:underline;cursor:pointer;padding:0}

/* ---- shared ---- */
section{padding:64px 0;border-bottom:1px solid var(--rule)}
.eyebrow{font:600 11px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
.sec-head{max-width:38em;margin-bottom:44px}
.sec-head h2{font-size:clamp(28px,4vw,40px);letter-spacing:-.015em}
.sec-head p{color:var(--muted);margin:14px 0 0;font-size:17px}
.lede{color:var(--muted);margin:10px 0 0}
.means{margin:18px 0 0;padding:0;list-style:none;display:grid;gap:9px}
.means li{position:relative;padding-left:18px;font-size:14.5px;line-height:1.6}
.means li::before{content:"";position:absolute;left:0;top:.6em;width:6px;height:1px;background:var(--muted)}

/* ---- caveat ---- */
.caveat{background:var(--sunk);border:1px solid var(--rule);border-radius:4px;padding:22px 24px}
.caveat p{margin:0;font-size:14.5px;color:var(--muted)}
.caveat p+p{margin-top:12px}
.caveat strong{color:var(--ink)}

/* ---- how to read ---- */
.howto{display:grid;grid-template-columns:repeat(3,1fr);gap:28px}
@media(max-width:820px){.howto{grid-template-columns:1fr}}
.howto .n{font:600 12px/1 var(--mono);color:var(--ochre);letter-spacing:.1em}
.howto h3{font-size:19px;margin:12px 0 8px}
.howto p{margin:0;color:var(--muted);font-size:14.5px}

/* ---- family filter ---- */
.filter{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:36px}
.filter button{font:500 12.5px/1 var(--body);padding:9px 15px;border-radius:999px;cursor:pointer;
  border:1px solid var(--rule);background:var(--surface);color:var(--muted)}
.filter button[aria-pressed="true"]{background:var(--ink);color:var(--paper);border-color:var(--ink)}

/* ---- plates ---- */
.fam{margin-bottom:56px}
.fam-head{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;padding-bottom:12px;border-bottom:1px solid var(--rule);margin-bottom:28px}
.fam-head h3{font-size:24px}
.fam-head span{font-size:14px;color:var(--muted)}
.plates{display:grid;gap:20px}
.plate{display:grid;grid-template-columns:300px 1fr;gap:28px;background:var(--surface);
  border:1px solid var(--rule);border-radius:4px;padding:22px;box-shadow:var(--shadow)}
@media(max-width:820px){.plate{grid-template-columns:1fr;gap:16px}}
.plate-fig{background:var(--sunk);border-radius:3px;padding:6px;display:flex;align-items:center}
.plate-fig svg{width:100%;height:auto;display:block}
.plate-no{display:flex;align-items:center;gap:10px;margin:0 0 8px;font:500 11px/1 var(--mono);
  letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.plate-no b{color:var(--ochre);letter-spacing:.04em}
.plate h3{font-size:23px;letter-spacing:-.01em}
.key{margin:20px 0 0;padding-top:16px;border-top:1px solid var(--rule);font-size:14.5px}
.key span{display:block;font:600 10.5px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ochre);margin-bottom:7px}

/* ---- part two ---- */
.chartbox{background:var(--sunk);border:1px solid var(--rule);border-radius:4px;padding:16px;box-shadow:var(--shadow);overflow-x:auto}
.chartbox svg{width:100%;min-width:620px;height:auto;display:block}
.cap{font-size:12.5px;color:var(--muted);margin:12px 0 0;font-family:var(--mono);letter-spacing:.01em}
.steps{display:grid;gap:24px;margin-top:44px}
.step{display:grid;grid-template-columns:1fr 1fr;gap:30px;background:var(--surface);
  border:1px solid var(--rule);border-radius:4px;padding:22px;box-shadow:var(--shadow);align-items:start}
@media(max-width:900px){.step{grid-template-columns:1fr}}
.step-fig{margin:0;background:var(--sunk);border-radius:3px;padding:10px}
.step-fig svg{width:100%;height:auto;display:block}
.step-no{margin:0 0 10px;font:500 11px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:9px}
.step-no .num{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--ochre);color:var(--chip-fg);font-weight:600;font-size:12px;letter-spacing:0}
.step h3{font-size:23px}
.step-body .eyebrow{margin-top:22px}
.trap{margin:20px 0 0;padding:16px;border-radius:3px;background:var(--sunk);font-size:14px;color:var(--muted)}
.trap span{display:block;font:600 10.5px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--down);margin-bottom:7px}

/* ---- mistakes ---- */
.outcome{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:var(--rule);border:1px solid var(--rule);border-radius:4px;overflow:hidden}
@media(max-width:760px){.outcome{grid-template-columns:1fr}}
.oc{background:var(--surface);padding:20px 22px}
.oc-k{margin:0;font:500 11px/1.4 var(--mono);letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}
.oc-v{margin:8px 0 0;font-family:var(--display);font-size:26px;font-weight:600;letter-spacing:-.01em}
.oc-v.good{color:var(--up)}
.oc-d{margin:8px 0 0;font-size:13px;color:var(--muted)}
.mistakes{display:grid;gap:2px;background:var(--rule);border:1px solid var(--rule);border-radius:4px;overflow:hidden}
.mistake{display:grid;grid-template-columns:44px 1fr;gap:18px;background:var(--surface);padding:20px 22px;align-items:start}
@media(max-width:640px){.mistake{grid-template-columns:1fr;gap:6px}}
.mistake .n{font:600 13px/1 var(--mono);color:var(--down);padding-top:3px}
.mistake h3{font-size:17px;margin-bottom:5px}
.mistake p{margin:0;color:var(--muted);font-size:14.5px}

/* ---- glossary ---- */
.gloss{display:grid;grid-template-columns:1fr 1fr;gap:0 40px}
@media(max-width:820px){.gloss{grid-template-columns:1fr}}
.gloss a{display:grid;grid-template-columns:26px 1fr;gap:12px;padding:13px 0;border-bottom:1px solid var(--rule);
  text-decoration:none;color:inherit;align-items:baseline}
.gloss a:hover b{color:var(--accent)}
.gloss .n{font:500 11px/1.4 var(--mono);color:var(--muted)}
.gloss b{font-weight:600;font-size:14.5px}
.gloss i{display:block;font-style:normal;color:var(--muted);font-size:13px;margin-top:2px}

/* ---- source ---- */
.src{display:grid;grid-template-columns:1fr 1fr;gap:40px}
@media(max-width:820px){.src{grid-template-columns:1fr}}
.src dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:9px 20px;font-size:14.5px}
.src dt{color:var(--muted)}
.src dd{margin:0;font-family:var(--mono);font-size:13.5px}
footer{padding:44px 0 72px;color:var(--muted);font-size:13px}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>

<div class="wrap">
  <header class="mast">
    <p class="kicker">Field guide · ICT / Smart Money Concepts</p>
    <div class="mast-grid">
      <div>
        <h1>Smart Money Concepts</h1>
        <p class="sub">Fifteen chart-reading terms, and the one sequence that makes them mean something — worked through on a real BTCUSD chart.</p>
      </div>
      <div class="dl">
        <h2>The complete guide</h2>
        <p>Everything on this page as a 30-page PDF: all fifteen plates, the full walkthrough, the outcome, glossary and caveats.</p>
        ${HOSTED ? `
        <a class="btn" href="./guide-assets/SMC_ICT_Field_Guide.pdf" download>Download the PDF</a>
        <p class="dl-meta">30 pages · 76 KB · PDF</p>
        <p class="dl-note">Only need one half? Grab <a href="./guide-assets/SMC_ICT_Part1_Concepts.pdf" download>Part One: the concepts</a> or <a href="./guide-assets/SMC_ICT_Part2_RealChart.pdf" download>Part Two: the real chart</a>.</p>
        ` : `
        <button class="btn" id="dl-main">Download the PDF</button>
        <p class="dl-meta" id="dl-meta">30 pages · 76 KB · PDF</p>
        <p class="dl-note">Only need one half? Grab <button id="dl-p1">Part One: the concepts</button> or <button id="dl-p2">Part Two: the real chart</button>.</p>
        `}
      </div>
    </div>
  </header>

  <section>
    <div class="sec-head">
      <p class="eyebrow">Before you start</p>
      <h2>The labels only mean something in order</h2>
      <p>Learning these as isolated flashcards is the common failure mode. Part Two exists because the sequence is the actual skill.</p>
    </div>
    <div class="howto">
      <div><p class="n">01</p><h3>Learn the four families</h3><p>Structure, liquidity, zones, and context. Every term below belongs to exactly one of them.</p></div>
      <div><p class="n">02</p><h3>Read the sequence</h3><p>Liquidity event, then structure shift, then a zone, then the entry. The order is the point.</p></div>
      <div><p class="n">03</p><h3>Define invalidation first</h3><p>If you cannot say what would prove the read wrong, it is not a read — it is a hope.</p></div>
    </div>
    <div class="caveat" style="margin-top:40px">
      <p><strong>What this is.</strong> A consistent, teachable vocabulary for describing what a chart did. That consistency is what makes it useful for building and testing rules.</p>
      <p><strong>What it is not.</strong> Proof. Nobody reading a retail chart can see institutional order books. When a label seems to explain a move perfectly, that is usually hindsight doing the work. Nothing here is financial advice, a signal, or a prediction — treat every setup as a hypothesis to test on your own data.</p>
    </div>
  </section>

  <section>
    <div class="sec-head">
      <p class="eyebrow">Part one</p>
      <h2>The vocabulary</h2>
      <p>Fifteen terms, grouped by the job they do. The diagrams are schematic — idealised shapes, so you know what you are looking for before you meet the messy version.</p>
    </div>
    <div class="filter" role="group" aria-label="Filter concepts by family">
      <button aria-pressed="true" data-f="all">All fifteen</button>
      ${FAMILIES.map(([k, n]) => `<button aria-pressed="false" data-f="${k}">${n}</button>`).join('')}
    </div>
    ${FAMILIES.map(([key, name, blurb]) => `
    <div class="fam" data-fam="${key}">
      <div class="fam-head"><h3>${name}</h3><span>${blurb}</span></div>
      <div class="plates">${CONCEPTS.filter(c => c.family === key).map(conceptCard).join('')}</div>
    </div>`).join('')}
  </section>

  <section>
    <div class="sec-head">
      <p class="eyebrow">Part two</p>
      <h2>One trade, step by step</h2>
      <p>The same ideas on a real chart. No synthetic candles — every screenshot below is the same BTCUSD 1-hour snapshot, annotated one step at a time.</p>
    </div>
    <div class="chartbox">${WTD.context}</div>
    <p class="cap">BTC-USD · 1-hour bars · 28 Aug – 3 Sep 2025. Real prices, redrawn. Worth one look with fresh eyes before the annotations tell you what to see.</p>
    <div class="steps">${STEPS.map(stepCard).join('')}</div>
  </section>

  <section>
    <div class="sec-head">
      <p class="eyebrow">The part most walkthroughs skip</p>
      <h2>What happened next</h2>
      <p>The setup is read at the displacement candle on 2 September, so the entry, stop and target are forward-looking from that moment &mdash; not history. Here is how it actually resolved, from the same price data.</p>
    </div>
    <div class="outcome">
      <div class="oc"><p class="oc-k">Retrace into the gap</p><p class="oc-v good">Filled</p><p class="oc-d">2 Sep, 15:00 &mdash; two hours after the impulse.</p></div>
      <div class="oc"><p class="oc-k">Objective 111,686</p><p class="oc-v good">Reached</p><p class="oc-d">3 Sep, 00:00 &mdash; about eleven hours later.</p></div>
      <div class="oc"><p class="oc-k">Stop 108,400</p><p class="oc-v">Never touched</p><p class="oc-d">The low held; price ran to 113,284 that week.</p></div>
    </div>
    <div class="caveat" style="margin-top:26px">
      <p><strong>And that proves nothing.</strong> One setup resolving as anticipated is a single observation. It does not measure how often the pattern works, what it costs when it fails, or whether the labels would have been drawn the same way before the move rather than after it. That is the whole reason this page keeps saying <em>test it on your own data</em>.</p>
    </div>
  </section>

  <section>
    <div class="sec-head">
      <p class="eyebrow">Failure modes</p>
      <h2>Five ways this goes wrong</h2>
      <p>Each of these is a failure of method, not of the concepts themselves.</p>
    </div>
    <div class="mistakes">
      ${MISTAKES.map(([t, d], i) => `<div class="mistake"><span class="n">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></div>`).join('')}
    </div>
  </section>

  <section>
    <div class="sec-head"><p class="eyebrow">Quick reference</p><h2>Glossary</h2></div>
    <div class="gloss">
      ${CONCEPTS.map(c => `<a href="#c${c.num}"><span class="n">${String(c.num).padStart(2, '0')}</span><span><b>${esc(c.name)}</b><i>${esc(c.oneLiner)}</i></span></a>`).join('')}
    </div>
  </section>

  <section style="border-bottom:0">
    <div class="sec-head"><p class="eyebrow">Provenance</p><h2>Source and caveats</h2></div>
    <div class="src">
      <div>
        <dl>
          <dt>Instrument</dt><dd>BTC-USD · 1 hour</dd>
          <dt>Price data</dt><dd>Yahoo Finance</dd>
          <dt>Window</dt><dd>28 Aug – 3 Sep 2025</dd>
          <dt>Compiled by</dt><dd>bhurtelmahesh</dd>
        </dl>
      </div>
      <div class="caveat">
        <p>Every candle in Part Two is real BTC-USD hourly data, drawn from the price series rather than traced from a screenshot. The levels were derived from those bars, so anything here can be checked against the data.</p>
        <p>The annotations explain the SMC / ICT reading of what the chart did. They are <strong>not</strong> evidence that those labels correspond to real institutional orders — no retail chart can show that.</p>
        <p>This is educational material about chart-reading conventions. It is not financial, investment, or trading advice. Markets carry risk of loss, and any decision you make is your own.</p>
      </div>
    </div>
  </section>

  <footer>${HOSTED ? '<a href="./">&larr; Back to TrendLens</a>' : ''}</footer>
</div>

${HOSTED ? '<script src="./guide-assets/guide.js"></script>' : `<script>
const FILES = {
  main: { name: 'Smart-Money-Concepts-Field-Guide.pdf', b64: "__PDF_MAIN__" },
  p1:   { name: 'SMC-Part-1-The-Concepts.pdf',          b64: "__PDF_P1__" },
  p2:   { name: 'SMC-Part-2-Real-Chart-Walkthrough.pdf', b64: "__PDF_P2__" },
};

function bytes(s){ const bin = atob(s); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }

let downloads = null;
const buttons = [['dl-main','main'],['dl-p1','p1'],['dl-p2','p2']];
const meta = document.getElementById('dl-meta');

(async () => {
  downloads = await window.claude?.use?.('downloads') ?? null;
  if (!downloads) {
    // Saving is unavailable in this view — say so rather than offering a dead button.
    document.getElementById('dl-main').disabled = true;
    document.getElementById('dl-main').textContent = 'Download unavailable here';
    meta.textContent = 'Open this page on claude.ai to save the PDF.';
    document.querySelector('.dl-note').hidden = true;
  }
})();

for (const [id, key] of buttons) {
  document.getElementById(id).addEventListener('click', async () => {
    if (!downloads) return;
    const el = document.getElementById(id);
    const was = el.textContent;
    if (id === 'dl-main') { el.disabled = true; el.textContent = 'Preparing…'; }
    try {
      await downloads.save({ filename: FILES[key].name, data: bytes(FILES[key].b64) });
      if (id === 'dl-main') el.textContent = 'Saved';
    } catch (e) {
      const code = e && e.code;
      if (id === 'dl-main') el.textContent = code === 'declined' ? was : 'Could not save — try again';
      if (code && code !== 'declined') meta.textContent = 'Save failed (' + code + ').';
    } finally {
      if (id === 'dl-main') { el.disabled = false; setTimeout(() => { el.textContent = was; }, 2400); }
    }
  });
}

// Family filter
const fams = [...document.querySelectorAll('.fam')];
for (const b of document.querySelectorAll('.filter button')) {
  b.addEventListener('click', () => {
    for (const o of document.querySelectorAll('.filter button')) o.setAttribute('aria-pressed', String(o === b));
    const f = b.dataset.f;
    for (const fam of fams) fam.hidden = f !== 'all' && fam.dataset.fam !== f;
  });
}
</script>`}`;

const withPdfs = HOSTED
  ? html // hosted links to the PDFs as static files; no base64 payload needed
  : html
      .replace('__PDF_MAIN__', b64('SMC_ICT_Field_Guide.pdf'))
      .replace('__PDF_P1__', b64('SMC_ICT_Part1_Concepts.pdf'))
      .replace('__PDF_P2__', b64('SMC_ICT_Part2_RealChart.pdf'));

// Escape every non-ASCII character as a numeric entity. The page renders
// correctly whatever charset the host declares, instead of depending on it.
const asciiSafe = withPdfs.replace(/[\u0080-\uFFFF]/g, ch => '&#' + ch.codePointAt(0) + ';');
if (HOSTED) {
  // Straight into the app's public dir; vite copies it verbatim into dist/.
  const PUB = '../app/public';
  fs.mkdirSync(PUB + '/guide-assets/fonts', { recursive: true });
  fs.writeFileSync(PUB + '/guide.html', asciiSafe + '\n</body>\n</html>\n');
  fs.writeFileSync(PUB + '/guide-assets/guide.js', FILTER_JS);
  for (const f of fs.readdirSync('fonts/files')) {
    fs.copyFileSync('fonts/files/' + f, PUB + '/guide-assets/fonts/' + f);
  }
  console.log('  ../app/public/guide.html —', (fs.statSync(PUB + '/guide.html').size / 1024).toFixed(0), 'KB');
} else {
  // The claude.ai artifact copy is not shipped with the app.
  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/tutorial.html', asciiSafe);
  console.log('  dist/tutorial.html —', (fs.statSync('dist/tutorial.html').size / 1024 / 1024).toFixed(2), 'MB');
}

