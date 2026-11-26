// ══ TIMETABLES (Routine + Weekend Planner share one engine) ═══════════════════
const SLOT_TYPES = {
  class: { l: 'Class', e: 'school', c: '#5b84b1' },
  study: { l: 'Study', e: 'menu_book', c: '#7f86c8' },
  deep: { l: 'Deep work', e: 'psychology', c: '#a07cc0' },
  skill: { l: 'Skill', e: 'build', c: '#6aa6d6' },
  project: { l: 'Project', e: 'rocket_launch', c: '#c9738f' },
  workout: { l: 'Workout', e: 'fitness_center', c: '#e0975a' },
  meal: { l: 'Meal', e: 'restaurant', c: '#6fae8a' },
  break: { l: 'Break', e: 'coffee', c: '#4fa3a5' },
  rest: { l: 'Wind down', e: 'dark_mode', c: '#a07cc0' },
  other: { l: 'Other', e: 'star', c: '#d6b04c' }
};
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const minToT = m => `${p(Math.floor(m / 60))}:${p(m % 60)}`;
const fmtTime = t => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${p(m)} ${h >= 12 ? 'PM' : 'AM'}`; };
const durText = (a, b) => { const m = toMin(b) - toMin(a), h = Math.floor(m / 60), r = m % 60; return (h ? `${h}h` : '') + (h && r ? ' ' : '') + (r ? `${r}m` : ''); };

const WEEKDAY_SEED = [
  ['06:00', '07:00', 'Workout', 'workout'], ['07:00', '08:00', 'Breakfast & get ready', 'meal'],
  ['08:00', '09:00', 'Commute & quick revision', 'study'], ['09:00', '13:00', 'Lectures', 'class'],
  ['13:00', '14:00', 'Lunch & break', 'meal'], ['14:00', '16:00', 'Labs / tutorials', 'class'],
  ['16:00', '17:00', 'Rest', 'break'], ['17:00', '19:00', 'Self study', 'study'],
  ['19:00', '20:00', 'Dinner', 'meal'], ['20:00', '22:00', 'Assignments & revision', 'study'],
  ['22:00', '23:00', 'Plan tomorrow & wind down', 'rest']
];
const WEEKEND_SEED = [
  ['06:30', '07:30', 'Workout', 'workout'], ['07:30', '08:30', 'Breakfast', 'meal'],
  ['08:30', '11:30', 'Deep work block', 'deep'], ['11:30', '12:00', 'Break', 'break'],
  ['12:00', '14:00', 'Skill development', 'skill'], ['14:00', '15:00', 'Lunch & rest', 'meal'],
  ['15:00', '18:00', 'Side project', 'project'], ['18:00', '19:00', 'Walk & free time', 'break'],
  ['19:00', '20:30', 'Weekly review & planning', 'deep'], ['21:00', '22:00', 'Reading', 'study']
];

const TIME_RE = /^\d{1,2}:\d{2}$/;
function cleanSlots(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(s => s && typeof s === 'object' && s.id && typeof s.title === 'string'
    && TIME_RE.test(s.start || '') && TIME_RE.test(s.end || ''))
    .map(s => ({
      ...s, start: s.start.padStart(5, '0'), end: s.end.padStart(5, '0'),
      type: SLOT_TYPES[s.type] ? s.type : 'other', log: (s.log && typeof s.log === 'object') ? s.log : {}
    }));
}
function makeTimetable(cfg) {
  const T = { cfg, slots: cleanSlots(load(cfg.key, [])), editId: null };
  const root = document.getElementById(cfg.view);
  const persist = () => store(cfg.key, T.slots);
  T.persist = persist;

  T.nextStart = () => {
    const last = T.slots.reduce((m, s) => Math.max(m, toMin(s.end)), 0);
    return minToT(last && last < 23 * 60 ? last : toMin(cfg.firstStart));
  };

  T.render = function () {
    const canCheck = cfg.canCheck();
    const sorted = [...T.slots].sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end));
    const total = sorted.length;
    const done = sorted.filter(s => s.log && s.log[todayStr]).length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const planned = sorted.reduce((m, s) => m + toMin(s.end) - toMin(s.start), 0);
    const plannedT = `${Math.floor(planned / 60)}h${planned % 60 ? ` ${planned % 60}m` : ''}`;
    const n = new Date(), nowMin = n.getHours() * 60 + n.getMinutes();
    const plural = total !== 1 ? 's' : '';

    const items = sorted.map(s => {
      const t = SLOT_TYPES[s.type] || SLOT_TYPES.other;
      const isDone = !!(s.log && s.log[todayStr]);
      const isNow = cfg.canCheck() && nowMin >= toMin(s.start) && nowMin < toMin(s.end);
      const bp = isDone ? 100 : isNow ? Math.round((nowMin - toMin(s.start)) / Math.max(1, toMin(s.end) - toMin(s.start)) * 100) : 0;
      return `<div class="tl-item${isDone ? ' done' : ''}${isNow ? ' now' : ''}" data-id="${s.id}" style="--tc:${t.c}">
        <div class="tl-time"><b>${fmtTime(s.start)}</b><span>${fmtTime(s.end)}</span></div>
        <div class="tl-rail"><i class="tl-dot"></i></div>
        <div class="tl-card">
          <span class="hc-tab" aria-hidden="true"></span>
          <div class="hc-prog"><i><u style="width:${bp}%"></u></i><b>${bp}%</b></div>
          <div class="habit-icon tl-ico" style="background:${hexA(t.c, .22)};color:${t.c}">${ic(t.e)}</div>
          <div class="tl-mid">
            <div class="tl-name">${esc(s.title)}</div>
            <div class="tl-meta">${durText(s.start, s.end)} · ${t.l}${isNow ? '<em class="now-chip">Now</em>' : ''}</div>
          </div>
          <div class="habit-check-btn tl-chk${isDone ? ' checked' : ''}${canCheck ? '' : ' locked'}" data-act="chk" role="button" aria-label="Mark complete" style="${isDone ? `background:${hexA(t.c, .9)}` : ''}">${CHECK_SVG}</div>
          <div class="habit-menu-btn" data-act="menu" role="button" aria-label="More">${ic('more_horiz')}</div>
        </div>
      </div>`;
    }).join('');

    root.innerHTML = `
      <div class="today-banner">
        <div class="tb-left">
          <div class="tb-label">${canCheck ? cfg.bannerLabel : cfg.bannerLabelIdle}</div>
          <div class="tb-count">${canCheck ? `${done} <span>/ ${total} block${plural}</span>` : `${total} <span>block${plural} planned</span>`}</div>
          <div class="tb-bar-wrap"><div class="tb-bar" style="width:${canCheck ? pct : 0}%;background:var(--primary)"></div></div>
        </div>
        <div class="tb-pct" style="color:${canCheck && pct === 100 && total ? 'var(--success)' : 'inherit'}">${canCheck ? pct + '%' : plannedT}</div>
      </div>
      ${cfg.hint()}
      <div class="add-wrap"><button class="add-btn" data-act="add"><span class="add-plus">+</span> Add Time Block</button></div>
      <div class="timeline">${items || `<div class="empty"><div class="empty-icon">${cfg.emptyIcon}</div><p>${cfg.emptyText}</p><button class="chip-btn" data-act="seed">Load a starter template</button></div>`}</div>`;
  };

  T.toggle = id => {
    if (!cfg.canCheck()) { showToast(cfg.lockMsg, 'info'); return; }
    const s = T.slots.find(x => x.id === id); if (!s) return;
    s.log = s.log || {};
    const nowDone = !s.log[todayStr];
    if (nowDone) s.log[todayStr] = true; else delete s.log[todayStr];
    persist(); T.render();
    buzz(nowDone ? HAPTIC.check : HAPTIC.undo);
    if (nowDone) {
      root.querySelector(`.tl-item[data-id="${id}"] .tl-chk`)?.classList.add('pop');
      if (T.slots.every(x => x.log && x.log[todayStr])) { showToast('Every block done — great day!'); buzz(HAPTIC.success); }
    }
  };

  root.addEventListener('click', e => {
    const sw = e.target.closest('[data-switch-mode]'); if (sw) { switchRoutineMode(sw.dataset.switchMode); return; }
    const go = e.target.closest('[data-go]');
    if (go) {
      if (go.dataset.go === 'planner') switchRoutineMode('weekend');
      else showTab(go.dataset.go);
      return;
    }
    const el = e.target.closest('[data-act]'); if (!el) return;
    const id = el.closest('.tl-item')?.dataset.id;
    switch (el.dataset.act) {
      case 'add': openSlot(T, null); break;
      case 'chk': T.toggle(id); break;
      case 'seed':
        T.slots = cfg.seed.map(([start, end, title, type]) => ({ id: uid(), start, end, title, type, log: {} }));
        persist(); T.render(); showToast('Starter template loaded'); break;
      case 'menu':
        e.stopPropagation();
        popMenu(el, [
          { label: `${ic('edit')}Edit`, fn: () => openSlot(T, id) },
          {
            label: `${ic('delete')}Delete`, danger: true, fn: () => askConfirm({
              title: 'Delete time block?', text: 'This block will be removed from your timetable.',
              onYes: () => { T.slots = T.slots.filter(s => s.id !== id); persist(); T.render(); }
            })
          }
        ]);
        break;
    }
  });
  return T;
}

let routineMode = (prefs.autoWeekend && isWeekend(today)) ? 'weekend' : 'weekday';

const RT = makeTimetable({
  key: 'ht5_routine', view: 'rt-pane-weekday', firstStart: '06:00', defaultType: 'study', seed: WEEKDAY_SEED,
  bannerLabel: "Today's routine", bannerLabelIdle: 'Daily routine',
  emptyIcon: ic('calendar_month'), emptyText: 'No time blocks yet.<br>Map out your day from 6 AM to 11 PM.',
  canCheck: () => true, lockMsg: '',
  hint: () => isWeekend(today)
    ? `<div class="hint-chip" data-switch-mode="weekend" role="button"><span class="hc-ico">${ic('grass')}</span><div><b>It's the weekend</b><small>Classes are off — switch to your Weekend Plan</small></div></div>`
    : ''
});
const WK = makeTimetable({
  key: 'ht5_weekend', view: 'rt-pane-weekend', firstStart: '07:00', defaultType: 'deep', seed: WEEKEND_SEED,
  bannerLabel: "Weekend plan", bannerLabelIdle: 'Weekend plan',
  emptyIcon: ic('grass'), emptyText: 'Design your Saturday &amp; Sunday.<br>Deep work, skills and side projects.',
  canCheck: () => isWeekend(today), lockMsg: 'Check-offs unlock on Saturday & Sunday',
  hint: () => {
    if (isWeekend(today)) return `<div class="hint-chip on"><span class="hc-ico">${ic('auto_awesome')}</span><div><b>Weekend mode is on</b><small>One plan, tracked separately for Saturday and Sunday</small></div></div>`;
    const d = (6 - today.getDay() + 7) % 7;
    return `<div class="hint-chip"><span class="hc-ico">${ic('hourglass_top')}</span><div><b>Weekend starts in ${d} day${d !== 1 ? 's' : ''}</b><small>Edit your plan now — check-offs unlock on Saturday</small></div></div>`;
  }
});

function switchRoutineMode(m) {
  routineMode = m;
  const seg = document.getElementById('routineModeSeg');
  if (seg) {
    seg.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('sel', b.dataset.rmode === m));
  }
  const pw = document.getElementById('rt-pane-weekday');
  const pe = document.getElementById('rt-pane-weekend');
  if (pw) pw.style.display = m === 'weekday' ? '' : 'none';
  if (pe) pe.style.display = m === 'weekend' ? '' : 'none';
  if (m === 'weekday') RT.render(); else WK.render();
}

document.getElementById('routineModeSeg')?.addEventListener('click', e => {
  const b = e.target.closest('[data-rmode]');
  if (!b) return;
  buzz(HAPTIC.tick);
  switchRoutineMode(b.dataset.rmode);
});

function renderRoutine() {
  const pw = document.getElementById('rt-pane-weekday');
  const pe = document.getElementById('rt-pane-weekend');
  if (pw) pw.style.display = routineMode === 'weekday' ? '' : 'none';
  if (pe) pe.style.display = routineMode === 'weekend' ? '' : 'none';
  const seg = document.getElementById('routineModeSeg');
  if (seg) {
    seg.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('sel', b.dataset.rmode === routineMode));
  }
  if (routineMode === 'weekday') RT.render(); else WK.render();
}

// ── time-block sheet ──────────────────────────────────────────────────────────
const slotOv = document.getElementById('slotOverlay');
const slotName = document.getElementById('slotName'), slotStart = document.getElementById('slotStart'),
  slotEnd = document.getElementById('slotEnd'), slotErr = document.getElementById('slotErr');
let slotCtx = null, slotType = 'other';

function renderSlotTypes() {
  document.getElementById('slotTypes').innerHTML = Object.entries(SLOT_TYPES).map(([k, t]) =>
    `<button type="button" class="type-chip${k === slotType ? ' sel' : ''}" data-k="${k}" style="--tc:${t.c}">${ic(t.e)}${t.l}</button>`).join('');
}
document.getElementById('slotTypes').addEventListener('click', e => {
  const b = e.target.closest('[data-k]'); if (!b) return; slotType = b.dataset.k; renderSlotTypes();
});
function openSlot(T, id) {
  slotCtx = T; T.editId = id;
  const s = id ? T.slots.find(x => x.id === id) : null;
  document.getElementById('slotTitle').textContent = s ? 'Edit Time Block' : (T === WK ? 'New Weekend Block' : 'New Time Block');
  slotName.value = s?.title || '';
  slotStart.value = s?.start || T.nextStart();
  slotEnd.value = s?.end || minToT(Math.min(toMin(slotStart.value) + 60, 23 * 60 + 59));
  slotType = s?.type || T.cfg.defaultType;
  slotErr.textContent = ''; renderSlotTypes();
  slotOv.classList.add('open'); setTimeout(() => slotName.focus(), 300);
}
function closeSlot() { slotOv.classList.remove('open'); slotCtx = null; }
document.getElementById('slotCancel').addEventListener('click', closeSlot);
slotOv.addEventListener('click', e => { if (e.target === slotOv) closeSlot(); });
slotName.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('slotSave').click(); });
document.getElementById('slotSave').addEventListener('click', () => {
  const T = slotCtx; if (!T) return;
  const title = slotName.value.trim(), start = slotStart.value, end = slotEnd.value;
  if (!title) { slotErr.textContent = 'Give this block a name.'; slotName.focus(); return; }
  if (!start || !end) { slotErr.textContent = 'Pick a start and end time.'; return; }
  if (toMin(end) <= toMin(start)) { slotErr.textContent = 'End time must be after the start time.'; return; }
  const clash = T.slots.find(o => o.id !== T.editId && toMin(o.start) < toMin(end) && toMin(start) < toMin(o.end));
  if (T.editId) {
    const s = T.slots.find(x => x.id === T.editId);
    if (s) { s.title = title; s.start = start; s.end = end; s.type = slotType; }
  } else {
    T.slots.push({ id: uid(), title, start, end, type: slotType, log: {} });
  }
  T.persist(); T.render(); closeSlot();
  if (clash) showToast(`Overlaps with “${clash.title}”`, 'info');
});

