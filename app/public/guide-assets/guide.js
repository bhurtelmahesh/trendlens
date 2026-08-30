// Family filter
const fams = [...document.querySelectorAll('.fam')];
for (const b of document.querySelectorAll('.filter button')) {
  b.addEventListener('click', () => {
    for (const o of document.querySelectorAll('.filter button')) o.setAttribute('aria-pressed', String(o === b));
    const f = b.dataset.f;
    for (const fam of fams) fam.hidden = f !== 'all' && fam.dataset.fam !== f;
  });
}
