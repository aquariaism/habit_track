// ══════════════════════════════════════════════════════════════════════════════
//  HABIT CALENDAR — month view for a single habit (opened from the habit's ··· menu)
// ══════════════════════════════════════════════════════════════════════════════
const MON_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW_M = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];                       // Monday-first, like the tracker grid
const DOW_L = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const CAL = { mode: 'habit', id: null, y: 0, m: 0, picking: false, pickY: 0, opener: null, sel: null };

const calEl = () => document.getElementById('calOverlay');
const calSheet = () => document.getElementById('calSheet');
const calHabit = () => habits.find(h => h.id === CAL.id);
const ymKey = (y, m) => y * 12 + m;
const nowKey = () => ymKey(today.getFullYear(), today.getMonth());

// readable text colour on top of a habit colour (yellow/lime need dark text)
function inkOn(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#1d1b20' : '#ffffff';
}

// All numbers for one month of one habit.
function calMonthData(h, y, m) {
  const dim = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;                // empty cells before the 1st (Mon = 0)
  const days = [];
  let done = 0, elapsed = 0, run = 0, longest = 0;
  const perDow = [0, 0, 0, 0, 0, 0, 0], possibleDow = [0, 0, 0, 0, 0, 0, 0];
  for (let d = 1; d <= dim; d++) {
    const ds = fmt(new Date(y, m, d));
    const future = ds > todayStr;
    const on = !!h.log?.[ds];
    const col = (lead + d - 1) % 7;
    if (!future) { elapsed++; possibleDow[col]++; }
    if (on) { done++; perDow[col]++; run++; longest = Math.max(longest, run); } else run = 0;
    days.push({ d, ds, future, on, col, today: ds === todayStr });
  }
  days.forEach((c, i) => {                                           // ribbon links between consecutive done days
    c.linkL = c.on && c.col > 0 && i > 0 && days[i - 1].on;
    c.linkR = c.on && c.col < 6 && i < dim - 1 && days[i + 1].on;
  });
  const rate = elapsed ? Math.round(done / elapsed * 100) : 0;
  let bestCol = -1, bestN = 0;
  perDow.forEach((n, i) => { if (n > bestN) { bestN = n; bestCol = i; } });
  return { dim, lead, days, done, elapsed, rate, longest, perDow, possibleDow, bestCol };
}

function calMonthRate(h, y, m) {                                      // quick rate for the previous-month comparison
  const dim = new Date(y, m + 1, 0).getDate();
  let done = 0, elapsed = 0;
  for (let d = 1; d <= dim; d++) {
    const ds = fmt(new Date(y, m, d));
    if (ds > todayStr) break;
    elapsed++; if (h.log?.[ds]) done++;
  }
  return elapsed ? Math.round(done / elapsed * 100) : null;
}

function openHabitCal(id, opener) {
  const h = habits.find(x => x.id === id); if (!h) return;
  CAL.mode = 'habit'; CAL.id = id; CAL.y = today.getFullYear(); CAL.m = today.getMonth(); CAL.picking = false; CAL.opener = opener || null;
  renderHabitCal();
  document.body.classList.add('cal-lock');
  calEl().classList.add('open');
  buzz(HAPTIC.tick);
  calSheet().focus({ preventScroll: true });
}

function closeHabitCal() {
  const el = calEl(); if (!el.classList.contains('open')) return;
  el.classList.remove('open');
  document.body.classList.remove('cal-lock');
  const sheet = calSheet(); sheet.style.transform = ''; sheet.style.transition = '';
  CAL.picking = false;
  try { CAL.opener?.isConnected && CAL.opener.focus?.({ preventScroll: true }); } catch (e) { }
}

function calGo(delta, dir) {
  const k = ymKey(CAL.y, CAL.m) + delta;
  if (k > nowKey()) { buzz(HAPTIC.warn); return; }                   // nothing to track in the future
  CAL.y = Math.floor(k / 12); CAL.m = k % 12;
  buzz(HAPTIC.tick);
  renderHabitCal(dir ?? (delta > 0 ? 'next' : 'prev'));
}

function renderHabitCal(anim, soft) {
  if (CAL.mode === 'att') return renderAttCal(anim, soft);   // soft = a day was just toggled: no cascade, ring/numbers glide from the old values
  const h = calHabit(); if (!h) return;
  const color = h.color || '#a07cc0';
  const D = calMonthData(h, CAL.y, CAL.m);
  const st = getStats(h);
  const atNow = ymKey(CAL.y, CAL.m) === nowKey();
  const prevRate = calMonthRate(h, CAL.m === 0 ? CAL.y - 1 : CAL.y, CAL.m === 0 ? 11 : CAL.m - 1);
  const pm = (CAL.m + 11) % 12;
  const key = ymKey(CAL.y, CAL.m), prev = (soft && CAL.last && CAL.last.key === key) ? CAL.last : null;
  CAL.last = { key, rate: D.rate, done: D.done, longest: D.longest, missed: D.elapsed - D.done };
  const sheet = calSheet();
  sheet.style.setProperty('--hc', color);
  sheet.style.setProperty('--hc-soft', hexA(color, .16));
  sheet.style.setProperty('--hc-glow', hexA(color, .45));
  sheet.style.setProperty('--hc-ink', inkOn(color));

  // progress ring
  const R = 30, C = 2 * Math.PI * R;
  const ring = `<svg class="cal-ring" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r="${R}" class="cal-ring-bg"/>
      <circle cx="36" cy="36" r="${R}" class="cal-ring-fg" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - D.rate / 100)).toFixed(1)}" style="--from:${(prev ? C * (1 - prev.rate / 100) : C).toFixed(1)}" transform="rotate(-90 36 36)"/>
    </svg>`;

  // delta vs previous month
  let delta = '';
  if (prevRate !== null && D.elapsed) {
    const diff = D.rate - prevRate;
    delta = diff === 0
      ? `<span class="cal-delta flat">${ic('check')}Same as ${MON_S[pm]}</span>`
      : `<span class="cal-delta ${diff > 0 ? 'up' : 'down'}">${ic(diff > 0 ? 'trending_up' : 'trending_down')}${Math.abs(diff)}% vs ${MON_S[pm]}</span>`;
  }

  // grid
  let cells = '';
  for (let i = 0; i < D.lead; i++) cells += '<div class="cal-cell blank" aria-hidden="true"></div>';
  D.days.forEach(c => {
    const cls = ['cal-cell', c.on ? 'on' : '', c.linkL ? 'lk-l' : '', c.linkR ? 'lk-r' : '', c.today ? 'today' : '', c.future ? 'future' : ''].filter(Boolean).join(' ');
    const label = `${DOW_L[c.col]}, ${MON_L[CAL.m]} ${c.d}${c.today ? ' (today)' : ''}: ${c.on ? 'done' : c.future ? 'upcoming' : 'not done'}`;
    cells += `<button type="button" class="${cls}" style="--i:${c.d}" data-ds="${c.ds}" ${c.future ? 'aria-disabled="true"' : ''} aria-pressed="${c.on}" aria-label="${label}"><span class="cal-day">${c.d}</span></button>`;
  });

  // weekday bars
  const maxN = Math.max(1, ...D.perDow);
  const bars = D.perDow.map((n, i) => `
      <div class="cal-bar${i === D.bestCol ? ' best' : ''}" title="${DOW_L[i]}: ${n} done">
        <div class="cal-bar-track"><div class="cal-bar-fill" style="--d:${i * 45}ms;height:${n ? Math.max(10, Math.round(n / maxN * 100)) : 0}%"></div></div>
        <span>${DOW_M[i][0]}</span>
      </div>`).join('');
  const insight = D.done === 0
    ? (D.elapsed ? 'No check-ins this month yet.' : 'This month hasn’t started yet.')
    : D.rate === 100 && D.elapsed > 1 ? `Perfect so far — ${D.done} for ${D.done}!`
      : `You’re strongest on <b>${DOW_L[D.bestCol]}s</b>${D.perDow[D.bestCol] > 1 ? ` (${D.perDow[D.bestCol]}× this month)` : ''}.`;

  // month picker
  const picker = CAL.picking ? `
    <div class="cal-picker" role="group" aria-label="Choose month">
      <div class="cal-pick-head">
        <button type="button" class="cal-nav" data-act="py-" aria-label="Previous year">${ic('chevron_left')}</button>
        <b>${CAL.pickY}</b>
        <button type="button" class="cal-nav" data-act="py+" aria-label="Next year" ${CAL.pickY >= today.getFullYear() ? 'disabled' : ''}>${ic('chevron_right')}</button>
      </div>
      <div class="cal-pick-grid">
        ${MON_S.map((n, i) => {
    const k = ymKey(CAL.pickY, i), dis = k > nowKey(), sel = k === ymKey(CAL.y, CAL.m);
    return `<button type="button" class="cal-pm${sel ? ' sel' : ''}${k === nowKey() ? ' now' : ''}" data-act="pm" data-m="${i}" ${dis ? 'disabled' : ''}>${n}</button>`;
  }).join('')}
      </div>
    </div>` : '';

  sheet.innerHTML = `
    <div class="cal-grab" aria-hidden="true"><i></i></div>
    <div class="cal-top">
      <div class="cal-ico">${habitIconHTML(h.emoji || 'favorite')}</div>
      <div class="cal-ttl"><b>${esc(h.name)}</b><span>${ic('local_fire_department', null, 'fire')}${st.streak} day streak · Best ${st.best}</span></div>
      <button type="button" class="cal-close" data-act="close" aria-label="Close calendar">${ic('close')}</button>
    </div>
    <div class="cal-scroll">
      <div class="cal-nav-row">
        <button type="button" class="cal-nav" data-act="prev" aria-label="Previous month">${ic('chevron_left')}</button>
        <button type="button" class="cal-month" data-act="pick" aria-expanded="${CAL.picking}" aria-label="Pick month and year">
          <b>${MON_L[CAL.m]}</b> <span>${CAL.y}</span> <i>${ic('expand_more')}</i>
        </button>
        <button type="button" class="cal-nav" data-act="next" aria-label="Next month" ${atNow ? 'disabled' : ''}>${ic('chevron_right')}</button>
      </div>
      <div class="cal-stage">
        ${picker}
        <div class="cal-body ${anim ? 'slide-' + anim : ''}${soft ? '' : ' cascade'}">
          <div class="cal-dow">${DOW_M.map((d, i) => `<span class="${i > 4 ? 'we' : ''}">${d}</span>`).join('')}</div>
          <div class="cal-grid" id="calGrid">${cells}</div>
          <div class="cal-hint">Tap a day to mark or unmark it</div>
        </div>
      </div>
      <div class="cal-summary">
        <div class="cal-ring-wrap">${ring}<div class="cal-ring-txt"><b><em data-count="${D.rate}" data-from="${prev ? prev.rate : 0}">${D.rate}</em>%</b><span>done</span></div></div>
        <div class="cal-kpis">
          <div class="cal-kpi"><b><em data-count="${D.done}" data-from="${prev ? prev.done : 0}">${D.done}</em><small>/${D.elapsed}</small></b><span>Days done</span></div>
          <div class="cal-kpi"><b data-count="${D.longest}" data-from="${prev ? prev.longest : 0}">${D.longest}</b><span>Longest run</span></div>
          <div class="cal-kpi"><b data-count="${D.elapsed - D.done}" data-from="${prev ? prev.missed : 0}">${D.elapsed - D.done}</b><span>Missed</span></div>
        </div>
        ${delta ? `<div class="cal-delta-row">${delta}</div>` : ''}
      </div>
      <div class="cal-card">
        <div class="cal-card-h">By weekday</div>
        <div class="cal-bars${soft ? '' : ' grow'}">${bars}</div>
        <div class="cal-insight">${insight}</div>
      </div>
      <div class="cal-foot">
        ${atNow ? '' : '<button type="button" class="cal-today" data-act="today">Jump to today</button>'}
      </div>
    </div>`;
  countUps(sheet);
}

