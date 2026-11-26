// ══ TABS ══════════════════════════════════════════════════════════════════════
const TAB_TITLES = { habits: 'Habit Tracker', routine: 'Daily Routine', attendance: 'Attendance', workout: 'Exercise Planner', games: 'Games' };
let curTab = 'habits';
function renderTab(n) {
  if (n === 'planner') n = 'workout';
  ({ habits: renderHabits, routine: renderRoutine, attendance: renderAttendance, workout: renderWorkout, games: renderGames })[n]();
}
const TAB_ORDER = ['habits', 'routine', 'attendance', 'workout', 'games'];
let tabTimer = null;
const reducedMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// Slide + fade between tabs: the old view slides out toward the side you're leaving to,
// then the new one slides in from the side it lives on (direction follows the tab order).
function showTab(name, opts) {
  if (name === 'planner') name = 'workout';
  if (!TAB_TITLES[name]) name = 'habits';
  const prevEl = document.querySelector('.view.active');
  const prevName = prevEl ? prevEl.id.replace('view-', '') : null;
  clearTimeout(tabTimer);
  document.querySelectorAll('.view').forEach(v => v.classList.remove('leaving', 'entering'));

  curTab = name; closeMenu();
  document.querySelectorAll('.nav-item').forEach(b => {
    const on = b.dataset.tab === name; b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  document.getElementById('hTitle').textContent = TAB_TITLES[name];
  try { localStorage.setItem('ht3_tab', name); } catch (e) { }

  const nextEl = document.getElementById('view-' + name);

  if (!prevEl || prevName === name || reducedMotion() || (opts && opts.instant)) {
    renderTab(name);
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v === nextEl));
    if (window.scrollY) window.scrollTo({ top: 0 });
    return;
  }
  const dir = TAB_ORDER.indexOf(name) > TAB_ORDER.indexOf(prevName) ? 1 : -1;
  prevEl.style.setProperty('--dir', dir);
  prevEl.classList.add('leaving');
  // render AFTER the nav highlight has painted (the leave animation gives it time), so heavy tabs never delay the nav
  tabTimer = setTimeout(() => {
    renderTab(name);
    prevEl.classList.remove('leaving', 'active');
    nextEl.style.setProperty('--dir', dir);
    nextEl.classList.add('active', 'entering');
    if (window.scrollY) window.scrollTo({ top: 0 });
    // stagger: each block (and each card inside the lists) rises in a beat after the one before
    let i = 0;
    nextEl.querySelectorAll(':scope > *, .habits-wrap > *, .att-list > *, .timeline > *')
      .forEach(el => el.style.setProperty('--i', Math.min(i++, 9)));
    setTimeout(() => nextEl.classList.remove('entering'), 900);
  }, 130);
}
document.getElementById('bottomNav').addEventListener('click', e => {
  const b = e.target.closest('.nav-item'); if (!b) return;
  if (b.dataset.tab !== curTab) buzz(HAPTIC.tick);
  showTab(b.dataset.tab);
});

// ── Swipe left / right to move between tabs ──────────────────────────────────
(function () {
  let sx = 0, sy = 0, st = 0, tracking = false;
  const NO_SWIPE = 'input, textarea, select, [contenteditable], .dropdown, .drag-handle, .zip-overlay, .bottom-nav, .settings-panel, .modal-overlay, .confirm-overlay, .workout-timer-card';
  const scrollsX = el => {                          // don't hijack a horizontally scrollable area
    for (; el && el !== document.body; el = el.parentElement) {
      const ox = getComputedStyle(el).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1) return true;
    }
    return false;
  };
  const overlayOpen = () => document.querySelector('.modal-overlay.open, .confirm-overlay.open, .settings-panel.open, .zip-overlay.open');

  document.addEventListener('touchstart', e => {
    tracking = false;
    if (e.touches.length !== 1 || overlayOpen()) return;
    const t = e.touches[0];
    if (t.clientX < 24 || t.clientX > window.innerWidth - 24) return;     // leave the phone's edge-back gesture alone
    if (e.target.closest && (e.target.closest(NO_SWIPE) || scrollsX(e.target))) return;
    sx = t.clientX; sy = t.clientY; st = Date.now(); tracking = true;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!tracking) return; tracking = false;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Date.now() - st < 650 && Math.abs(dx) >= 64 && Math.abs(dx) > Math.abs(dy) * 1.8) swipeTab(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('touchcancel', () => { tracking = false; }, { passive: true });
})();
function swipeTab(step) {
  const i = TAB_ORDER.indexOf(curTab) + step;
  if (i < 0 || i >= TAB_ORDER.length) {                // first/last tab: a little rubber-band nudge instead
    const v = document.getElementById('view-' + curTab);
    if (v && v.animate && !reducedMotion()) v.animate([{ transform: 'none' }, { transform: `translateX(${step * -14}px)` }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
    return;
  }
  buzz(HAPTIC.tick);
  showTab(TAB_ORDER[i]);
}

// weekend auto-open toggle (Settings)
const awT = document.getElementById('autoWkToggle');
awT.classList.toggle('on', prefs.autoWeekend);
awT.addEventListener('click', () => { prefs.autoWeekend = !prefs.autoWeekend; awT.classList.toggle('on', prefs.autoWeekend); savePrefs(); });

// haptic feedback toggle (Settings)
const hpT = document.getElementById('hapticToggle');
hpT.classList.toggle('on', prefs.haptics !== false);
hpT.addEventListener('click', () => { prefs.haptics = !(prefs.haptics !== false); hpT.classList.toggle('on', prefs.haptics); savePrefs(); if (prefs.haptics) buzz(HAPTIC.check); });

// midnight rollover + live "now" marker
function checkDay() {
  const n = new Date();
  if (fmt(n) === todayStr) return;
  today = n; todayStr = fmt(n);
  renderHeaderDate(); renderTab(curTab);
  showToast('New day — fresh start!', 'info');
}
setInterval(checkDay, 20000);
setInterval(() => { if (curTab === 'routine' && !document.getElementById('openDD') && !document.querySelector('.modal-overlay.open')) renderTab(curTab); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });

