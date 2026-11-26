// ══════════════════════════════════════════════════════════════════════════════
//  ATTENDANCE CALENDAR — which days you attended / missed a subject (reuses the calendar sheet)
// ══════════════════════════════════════════════════════════════════════════════
const attSubj = () => att.subjects.find(s => s.id === CAL.id);
const attColor = s => COLORS[[...s.name].reduce((h, c) => h + c.charCodeAt(0), 0) % COLORS.length];

function openAttCal(id, opener) {
  const s = att.subjects.find(x => x.id === id); if (!s) return;
  CAL.mode = 'att'; CAL.id = id; CAL.y = today.getFullYear(); CAL.m = today.getMonth(); CAL.picking = false; CAL.opener = opener || null; CAL.sel = todayStr; CAL.last = null;
  renderHabitCal();
  document.body.classList.add('cal-lock');
  calEl().classList.add('open');
  buzz(HAPTIC.tick);
  calSheet().focus({ preventScroll: true });
}

function attMonthData(s, y, m) {
  const dim = new Date(y, m + 1, 0).getDate(), lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = [], pDow = [0, 0, 0, 0, 0, 0, 0], aDow = [0, 0, 0, 0, 0, 0, 0];
  let P = 0, A = 0;
  for (let d = 1; d <= dim; d++) {
    const ds = fmt(new Date(y, m, d)), r = s.d[ds] || { p: 0, a: 0 }, col = (lead + d - 1) % 7;
    P += r.p; A += r.a; pDow[col] += r.p; aDow[col] += r.a;
    days.push({ d, ds, col, p: r.p, a: r.a, future: ds > todayStr, today: ds === todayStr });
  }
  let worst = -1, wn = 0; aDow.forEach((n, i) => { if (n > wn) { wn = n; worst = i; } });
  return { dim, lead, days, P, A, pDow, aDow, worst, wn };
}

function renderAttCal(anim, soft) {
  const s = attSubj(); if (!s) return;
  const T = att.threshold, color = attColor(s), ok = attOk(s.a, s.t, T);
  const D = attMonthData(s, CAL.y, CAL.m);
  const atNow = ymKey(CAL.y, CAL.m) === nowKey();
  const mPrefix = `${CAL.y}-${p(CAL.m + 1)}`;
  if (CAL.sel && CAL.sel.slice(0, 7) !== mPrefix) CAL.sel = null;     // the editor only shows for a day in the visible month
  const overall = s.t ? Math.round(s.a / s.t * 100) : 0;
  const monthPct = (D.P + D.A) ? Math.round(D.P / (D.P + D.A) * 100) : null;
  const key = `${CAL.id}:${ymKey(CAL.y, CAL.m)}`, prev = (soft && CAL.last && CAL.last.key === key) ? CAL.last : null;
  CAL.last = { key, overall, P: D.P, A: D.A };

  const sheet = calSheet();
  sheet.style.setProperty('--hc', color);
  sheet.style.setProperty('--hc-soft', hexA(color, .16));
  sheet.style.setProperty('--hc-glow', hexA(color, .45));
  sheet.style.setProperty('--hc-ink', inkOn(color));

  const R = 30, C = 2 * Math.PI * R;
  const ring = `<svg class="cal-ring" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="${R}" class="cal-ring-bg"/><circle cx="36" cy="36" r="${R}" class="cal-ring-fg" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - Math.min(100, overall) / 100)).toFixed(1)}" style="--from:${(prev ? C * (1 - Math.min(100, prev.overall) / 100) : C).toFixed(1)}" transform="rotate(-90 36 36)"/></svg>`;

  let cells = '';
  for (let i = 0; i < D.lead; i++) cells += '<div class="cal-cell blank" aria-hidden="true"></div>';
  D.days.forEach(c => {
    const st = c.p && c.a ? 'am' : c.p ? 'ap' : c.a ? 'aa' : '';
    const cls = ['cal-cell', st, c.today ? 'today' : '', c.future ? 'future' : '', c.ds === CAL.sel ? 'sel' : ''].filter(Boolean).join(' ');
    const label = `${DOW_L[c.col]}, ${MON_L[CAL.m]} ${c.d}: ${c.future ? 'upcoming' : (c.p || c.a) ? `${c.p} present, ${c.a} absent` : 'no class logged'}`;
    cells += `<button type="button" class="${cls}" style="--i:${c.d}" data-ds="${c.ds}" ${c.future ? 'aria-disabled="true"' : ''} aria-label="${label}"><span class="cal-day">${c.d}</span>${c.p + c.a > 1 ? `<i class="cal-n">${c.p + c.a}</i>` : ''}</button>`;
  });

  // editor for the selected day
  let editor = `<div class="att-day hint">${ic('info')}<span>Tap a day to log or edit classes for it</span></div>`;
  if (CAL.sel && CAL.sel <= todayStr) {
    const r = s.d[CAL.sel] || { p: 0, a: 0 }, dt = new Date(CAL.sel + 'T00:00:00');
    const row = (k, lbl, n, cls) => `<div class="att-step ${cls}"><span>${lbl}</span><div>
        <button type="button" data-act="day${k}-" data-k="${CAL.sel}" aria-label="Remove one ${lbl.toLowerCase()}" ${n ? '' : 'disabled'}>${ic('remove')}</button>
        <b>${n}</b>
        <button type="button" data-act="day${k}+" data-k="${CAL.sel}" aria-label="Add one ${lbl.toLowerCase()}">${ic('add')}</button></div></div>`;
    editor = `<div class="att-day"><div class="att-day-h">${DOW_L[(dt.getDay() + 6) % 7]}, ${dt.getDate()} ${MON_L[dt.getMonth()]}${CAL.sel === todayStr ? ' · Today' : ''}</div>${row('p', 'Present', r.p, 'ok')}${row('a', 'Absent', r.a, 'bad')}</div>`;
  }

  const maxN = Math.max(1, ...D.pDow);
  const bars = D.pDow.map((n, i) => `<div class="cal-bar${D.aDow[i] ? ' miss' : ''}" title="${DOW_L[i]}: ${n} present, ${D.aDow[i]} absent"><div class="cal-bar-track"><div class="cal-bar-fill" style="--d:${i * 45}ms;height:${n ? Math.max(10, Math.round(n / maxN * 100)) : 0}%"></div></div><span>${DOW_M[i][0]}</span></div>`).join('');
  const insight = (D.P + D.A) === 0 ? 'No classes logged this month.'
    : D.A === 0 ? `Perfect attendance this month — ${D.P} for ${D.P}!`
      : `You miss most on <b>${DOW_L[D.worst]}s</b> (${D.wn}× this month).`;
  const dated = Object.values(s.d).reduce((m, r) => m + r.p + r.a, 0), undated = s.t - dated;

  const picker = CAL.picking ? `
    <div class="cal-picker" role="group" aria-label="Choose month">
      <div class="cal-pick-head">
        <button type="button" class="cal-nav" data-act="py-" aria-label="Previous year">${ic('chevron_left')}</button>
        <b>${CAL.pickY}</b>
        <button type="button" class="cal-nav" data-act="py+" aria-label="Next year" ${CAL.pickY >= today.getFullYear() ? 'disabled' : ''}>${ic('chevron_right')}</button>
      </div>
      <div class="cal-pick-grid">${MON_S.map((n, i) => {
    const k = ymKey(CAL.pickY, i), dis = k > nowKey(), sel = k === ymKey(CAL.y, CAL.m);
    return `<button type="button" class="cal-pm${sel ? ' sel' : ''}${k === nowKey() ? ' now' : ''}" data-act="pm" data-m="${i}" ${dis ? 'disabled' : ''}>${n}</button>`;
  }).join('')}</div>
    </div>` : '';

  sheet.innerHTML = `
    <div class="cal-grab" aria-hidden="true"><i></i></div>
    <div class="cal-top">
      <div class="cal-ico att-letter">${esc(s.name.trim().charAt(0).toUpperCase())}</div>
      <div class="cal-ttl"><b>${esc(s.name)}</b><span>${s.a} / ${s.t} attended · safe level ${T}%</span></div>
      <button type="button" class="cal-close" data-act="close" aria-label="Close calendar">${ic('close')}</button>
    </div>
    <div class="cal-scroll">
      <div class="cal-nav-row">
        <button type="button" class="cal-nav" data-act="prev" aria-label="Previous month">${ic('chevron_left')}</button>
        <button type="button" class="cal-month" data-act="pick" aria-expanded="${CAL.picking}" aria-label="Pick month and year"><b>${MON_L[CAL.m]}</b> <span>${CAL.y}</span> <i>${ic('expand_more')}</i></button>
        <button type="button" class="cal-nav" data-act="next" aria-label="Next month" ${atNow ? 'disabled' : ''}>${ic('chevron_right')}</button>
      </div>
      <div class="cal-stage">
        ${picker}
        <div class="cal-body ${anim ? 'slide-' + anim : ''}${soft ? '' : ' cascade'}">
          <div class="cal-dow">${DOW_M.map((d, i) => `<span class="${i > 4 ? 'we' : ''}">${d}</span>`).join('')}</div>
          <div class="cal-grid" id="calGrid">${cells}</div>
          <div class="cal-legend"><span><i class="lg ap"></i>Attended</span><span><i class="lg aa"></i>Absent</span><span><i class="lg am"></i>Both</span></div>
        </div>
      </div>
      ${editor}
      <div class="cal-summary">
        <div class="cal-ring-wrap${ok || !s.t ? '' : ' bad'}">${ring}<div class="cal-ring-txt"><b>${s.t ? `<em data-count="${overall}" data-from="${prev ? prev.overall : 0}">${overall}</em>%` : '—'}</b><span>overall</span></div></div>
        <div class="cal-kpis">
          <div class="cal-kpi"><b data-count="${D.P}" data-from="${prev ? prev.P : 0}">${D.P}</b><span>Attended</span></div>
          <div class="cal-kpi"><b data-count="${D.A}" data-from="${prev ? prev.A : 0}">${D.A}</b><span>Absent</span></div>
          <div class="cal-kpi"><b>${monthPct === null ? '—' : monthPct + '%'}</b><span>This month</span></div>
        </div>
        <div class="cal-delta-row"><span class="cal-delta ${!s.t ? 'flat' : ok ? 'up' : 'down'}">${ic(!s.t ? 'info' : ok ? 'check' : 'warning')}${esc(attTip(s, T))}</span></div>
      </div>
      <div class="cal-card">
        <div class="cal-card-h">Attended by weekday</div>
        <div class="cal-bars${soft ? '' : ' grow'}">${bars}</div>
        <div class="cal-insight">${insight}</div>
      </div>
      ${undated > 0 ? `<div class="cal-note">${undated} earlier class${undated !== 1 ? 'es were' : ' was'} logged before dates were tracked, so ${undated !== 1 ? 'they don’t' : 'it doesn’t'} show on the calendar.</div>` : ''}
      <div class="cal-foot">${atNow ? '' : '<button type="button" class="cal-today" data-act="today">Jump to today</button>'}</div>
    </div>`;
  countUps(sheet);
}

// +/− for one day's Present / Absent count (keeps the subject's totals in step)
function attCalDay(act, ds) {
  const s = attSubj(); if (!s || !ds || ds > todayStr) return;
  const k = act.charAt(3) === 'p' ? 'p' : 'a', delta = act.endsWith('+') ? 1 : -1;
  const r = s.d[ds] || { p: 0, a: 0 };
  if (delta < 0 && r[k] <= 0) { buzz(HAPTIC.warn); return; }
  r[k] += delta; s.t += delta; if (k === 'p') s.a += delta;
  if (!r.p && !r.a) delete s.d[ds]; else s.d[ds] = r;
  s.h = ''; s.hd = [];                                        // quick-undo history no longer lines up
  saveAtt(); buzz(k === 'p' ? HAPTIC.check : HAPTIC.warn);
  const sc = calSheet().querySelector('.cal-scroll'), top = sc ? sc.scrollTop : 0;
  renderAttCal(undefined, true);
  const sc2 = calSheet().querySelector('.cal-scroll'); if (sc2) sc2.scrollTop = top;
  renderAttendance();
}

