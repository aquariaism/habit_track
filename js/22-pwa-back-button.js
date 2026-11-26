// ── SERVICE WORKER REGISTRATION ──────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      setInterval(() => reg.update(), 60_000);   // new versions download quietly and apply on the next open
      console.log('[PWA] Service worker registered ✓');
    } catch (err) {
      console.warn('[PWA] SW registration failed:', err);
    }
  });
}

// Offline / online indicator
window.addEventListener('offline', () => { document.getElementById('offlineBar').style.display = 'block'; });
window.addEventListener('online', () => { document.getElementById('offlineBar').style.display = 'none'; });

// ── BACK BUTTON CLOSES SHEETS / SETTINGS (instead of leaving the app) ───────────
// Every open layer owns one history entry. The phone's back button/gesture pops that entry,
// which closes the topmost layer. Closing a layer by hand (Cancel, tap outside) removes its entry.
(function () {
  const layers = [   // topmost first
    ['calOverlay', () => closeHabitCal()],
    ['zipOverlay', () => zipClose()],
    ['confirmOverlay', () => document.getElementById('confirmNo').click()],
    ['exerciseOverlay', () => closeExModal()],
    ['dayFocusOverlay', () => closeDfModal()],
    ['slotOverlay', () => closeSlot()],
    ['subjOverlay', () => closeSubj()],
    ['modalOverlay', () => closeModal()],
    ['settingsPanel', () => closeSettings()]
  ].map(([id, close]) => ({ el: document.getElementById(id), close }));

  // A reload can leave a stale layer entry behind — clear it so the first Back isn't "dead".
  if (history.state && history.state.htLayer) history.replaceState(null, '');

  let depth = 0;            // history entries we have pushed
  const skip = [];          // timers for popstate events we caused ourselves (history.go)
  const openCount = () => layers.filter(l => l.el.classList.contains('open')).length;

  function reconcile() {
    const want = openCount();
    while (depth < want) { history.pushState({ htLayer: true }, ''); depth++; }
    if (depth > want) {
      const n = depth - want; depth = want;
      skip.push(setTimeout(() => skip.shift(), 1500));   // safety: forget it if no popstate arrives
      history.go(-n);
    }
  }
  // MutationObserver callbacks run right after the tap, so the history entry is created
  // inside the user gesture (mobile Chrome ignores entries created outside one).
  const mo = new MutationObserver(reconcile);
  layers.forEach(l => mo.observe(l.el, { attributes: true, attributeFilter: ['class'] }));

  window.addEventListener('popstate', () => {
    if (skip.length) { clearTimeout(skip.shift()); return; }   // our own cleanup, not the user's Back
    const top = layers.find(l => l.el.classList.contains('open'));
    if (top && depth > 0) { depth--; top.close(); }
  });
})();

