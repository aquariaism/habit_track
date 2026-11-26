// ── HEADER DATE ────────────────────────────────────────────────────────────────
function renderHeaderDate() {
  document.getElementById('hDate').textContent =
    `${DAY_S[today.getDay()]}, ${MON_S[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
}
renderHeaderDate();

// ── TODAY BANNER (gap #4) ─────────────────────────────────────────────────────
function updateBanner() {
  const total = habits.length;
  const done = habits.filter(h => h.log?.[todayStr]).length;
  const pct = total ? Math.round(done / total * 100) : 0;
  const accent = habits.find(h => h.color)?.color || '#a07cc0';

  document.getElementById('tbCount').innerHTML = `${done} <span>/ ${total} habit${total !== 1 ? 's' : ''}</span>`;
  document.getElementById('tbBar').style.width = `${pct}%`;
  document.getElementById('tbBar').style.background = accent;
  const tp = document.getElementById('tbPct');
  tp.textContent = `${pct}%`; tp.dataset.suf = '%'; tp.dataset.count = pct; tp.dataset.from = tp._v ?? 0; tp._v = pct; countUps(tp.parentElement, 600);
  document.getElementById('tbPct').style.color = pct === 100 ? '#34d399' : 'var(--text)';
}

// ── WEEK STRIP ─────────────────────────────────────────────────────────────────
function renderWeek() {
  const el = document.getElementById('weekStrip');
  el.innerHTML = '';
  const accent = habits.find(h => h.color)?.color || '#a07cc0';
  document.documentElement.style.setProperty('--t-accent', accent);
  document.documentElement.style.setProperty('--t-accent-bg', hexA(accent, .12));

  const dow = today.getDay();
  const mon = new Date(today); mon.setDate(today.getDate() - ((dow + 6) % 7));

  for (let i = 0; i < 7; i++) {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    const ds = fmt(d);
    const pill = document.createElement('div');
    pill.className = 'day-pill' + (ds === todayStr ? ' today' : '') + (habits.some(h => h.log?.[ds]) ? ' has-dot' : '');
    pill.innerHTML = `<div class="dp-name">${DAY_S[d.getDay()]}</div><div class="dp-num">${d.getDate()}</div><div class="dp-dot"></div>`;
    el.appendChild(pill);
  }
}

const streakHTML = n => `<span class="flame${n > 0 ? ' on' : ''}">${ic(n > 0 ? 'local_fire_department' : 'radio_button_unchecked')}</span>Streak: ${n}`;

