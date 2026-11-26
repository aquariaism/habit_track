// One stat tile for the Games banners: tonal icon badge, big number (counts up if numeric), label.
const ghLast = {};   // last shown value per stat, so a re-render only animates real changes
function ghStat(icon, tone, val, label) {
  const num = typeof val === 'number', from = num ? (ghLast[label] ?? 0) : 0;
  if (num) ghLast[label] = val;
  return `<div class="gh-stat">${''}<b>${ic(icon)} <em${num ? ` data-count="${val}" data-from="${from}"` : ''}>${val}</em></b><span>${label}</span></div>`;
}

// ── MOTION HELPERS ────────────────────────────────────────────────────────────
// Animate every [data-count] inside root from data-from → data-count (final text is already in the DOM).
function countUps(root, ms = 750) {
  if (reducedMotion()) return;
  root.querySelectorAll('[data-count]').forEach(el => {
    const to = +el.dataset.count, from = +(el.dataset.from || 0);
    if (!isFinite(to) || from === to) return;
    const t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 4);
      const node = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild : null;
      const txt = String(Math.round(from + (to - from) * e)) + (el.dataset.suf || '');
      if (node) node.nodeValue = txt; else el.textContent = txt;
      if (k < 1 && el.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
// Little celebration: coloured specks fly out of (x, y). `big` = fuller burst.
function burst(x, y, color, big) {
  if (reducedMotion()) return;
  const n = big ? 26 : 12, wrap = document.createElement('div');
  wrap.className = 'burst'; wrap.style.cssText = `left:${x}px;top:${y}px`;
  const cols = [color, '#fbbf24', '#f472b6', '#60a5fa', '#34d399'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'), a = (i / n) * Math.PI * 2 + Math.random() * .5, d = (big ? 70 : 38) + Math.random() * (big ? 90 : 34);
    p.style.cssText = `--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d - (big ? 30 : 8)}px;--r:${Math.random() * 360}deg;background:${big ? cols[i % cols.length] : color};animation-delay:${Math.random() * 60}ms`;
    if (i % 3 === 0) p.className = 'sq';
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 1100);
}

