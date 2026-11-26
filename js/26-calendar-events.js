// ── interactions (one delegated listener) ─────────────────────────────────────
(function () {
  const ov = calEl(), sheet = calSheet();

  ov.addEventListener('click', e => {
    if (e.target === ov) { closeHabitCal(); return; }                 // tap the dim area
    const cell = e.target.closest('.cal-cell[data-ds]');
    if (cell) {
      if (cell.classList.contains('future')) { showToast('That day hasn’t happened yet', 'info'); buzz(HAPTIC.warn); return; }
      if (CAL.mode === 'att') { CAL.sel = cell.dataset.ds; buzz(HAPTIC.tick); renderAttCal(undefined, true); return; }
      const h = calHabit(); if (!h) return;
      const ds = cell.dataset.ds, wasOn = !!h.log?.[ds];
      toggleDay(h.id, ds, null, h.color || '#a07cc0');                // updates the card behind, banner, week strip, saves
      const scroller = sheet.querySelector('.cal-scroll'), top = scroller ? scroller.scrollTop : 0;
      renderHabitCal(undefined, true);
      if (scroller) sheet.querySelector('.cal-scroll').scrollTop = top;
      const again = sheet.querySelector(`.cal-cell[data-ds="${ds}"]`);
      if (again) { again.classList.add(wasOn ? 'unpop' : 'pop'); again.focus({ preventScroll: true }); }
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (act.startsWith('day')) { attCalDay(act, e.target.closest('[data-act]').dataset.k); return; }
    if (act === 'close') closeHabitCal();
    else if (act === 'prev') calGo(-1);
    else if (act === 'next') calGo(1);
    else if (act === 'today') {
      const dir = ymKey(CAL.y, CAL.m) < nowKey() ? 'next' : 'prev';
      CAL.y = today.getFullYear(); CAL.m = today.getMonth(); CAL.picking = false; buzz(HAPTIC.tick); renderHabitCal(dir);
    }
    else if (act === 'pick') { CAL.picking = !CAL.picking; CAL.pickY = CAL.y; renderHabitCal(); }
    else if (act === 'py-') { CAL.pickY--; renderHabitCal(); }
    else if (act === 'py+') { if (CAL.pickY < today.getFullYear()) { CAL.pickY++; renderHabitCal(); } }
    else if (act === 'pm') {
      const m = +e.target.closest('[data-m]').dataset.m;
      if (ymKey(CAL.pickY, m) <= nowKey()) {
        const dir = ymKey(CAL.pickY, m) < ymKey(CAL.y, CAL.m) ? 'prev' : 'next';
        CAL.y = CAL.pickY; CAL.m = m; CAL.picking = false; buzz(HAPTIC.tick); renderHabitCal(dir);
      }
    }
  });

  // keyboard: Esc closes (or closes the picker first), ←/→ change month, T = today
  document.addEventListener('keydown', e => {
    if (!ov.classList.contains('open')) return;
    if (e.key === 'Escape') { e.stopPropagation(); CAL.picking ? (CAL.picking = false, renderHabitCal()) : closeHabitCal(); }
    else if (e.key === 'ArrowLeft' && !e.target.closest?.('.cal-cell')) calGo(-1);
    else if (e.key === 'ArrowRight' && !e.target.closest?.('.cal-cell')) calGo(1);
    else if (e.key === 't' || e.key === 'T') { sheet.querySelector('[data-act="today"]')?.click(); }
    else if (e.key === 'Tab') {                                       // keep focus inside the dialog
      const f = [...sheet.querySelectorAll('button:not([disabled])')];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!sheet.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });

  // swipe left/right on the calendar = change month
  let sx = 0, sy = 0, swiping = false;
  sheet.addEventListener('touchstart', e => {
    if (e.target.closest('.cal-grab, .cal-top')) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiping = !!e.target.closest('.cal-stage');
  }, { passive: true });
  sheet.addEventListener('touchend', e => {
    if (!swiping) return; swiping = false;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 54 && Math.abs(dx) > Math.abs(dy) * 1.6) calGo(dx < 0 ? 1 : -1);
  }, { passive: true });

  // drag the top of the sheet down to dismiss (mobile)
  let dy0 = null, dragY = 0;
  sheet.addEventListener('touchstart', e => {
    if (!e.target.closest('.cal-grab, .cal-top') || e.target.closest('.cal-close')) return;
    dy0 = e.touches[0].clientY; dragY = 0; sheet.style.transition = 'none';
  }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (dy0 === null) return;
    dragY = Math.max(0, e.touches[0].clientY - dy0);
    sheet.style.transform = `translateY(${dragY}px)`;
  }, { passive: true });
  sheet.addEventListener('touchend', () => {
    if (dy0 === null) return;
    dy0 = null; sheet.style.transition = '';
    if (dragY > 90) closeHabitCal(); else sheet.style.transform = '';
  });
})();

