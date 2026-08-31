// Name the chart being returned to. The app stores its last query in
// sessionStorage, which is shared with this page on the same origin and tab.
try {
  var lastRaw = sessionStorage.getItem('trendlens:last-query');
  if (lastRaw) {
    var lastQ = JSON.parse(lastRaw);
    if (lastQ && lastQ.symbol && lastQ.interval) {
      var fabText = document.getElementById('backfab-text');
      if (fabText) fabText.textContent = 'Back to ' + lastQ.symbol + ' · ' + lastQ.interval;
    }
  }
} catch {
  // Storage blocked; the default label is already correct.
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
