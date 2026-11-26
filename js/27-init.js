// ── INIT ──────────────────────────────────────────────────────────────────────
renderEmojiPicker();
renderColorPicker();

// Land on the Weekend Planner the first time the app opens on a Saturday/Sunday;
// otherwise restore the last tab the person used.
(function () {
  let start = localStorage.getItem('ht3_tab') || 'habits';
  if (start === 'planner') start = 'workout';
  if (prefs.autoWeekend && isWeekend(today)) {
    routineMode = 'weekend';
    if (localStorage.getItem('ht3_wkAuto') !== todayStr) {
      localStorage.setItem('ht3_wkAuto', todayStr);
    }
  }
  showTab(start, { instant: true });   // no slide animation on first paint
})();