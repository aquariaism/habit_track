// ══════════════════════════════════════════════════════════════════════════════
//  v5 MODULES — Tabs · Routine · Attendance · Weekend Planner · Daily Mind Game
// ══════════════════════════════════════════════════════════════════════════════

// ── shared helpers ────────────────────────────────────────────────────────────
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } };
const store = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
const CHECK_SVG = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3.5 10l4.5 4.5 8.5-8.5" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

let prefs = Object.assign({ autoWeekend: true, haptics: true }, load('ht5_prefs', {}));

// Haptics: tiny vibrations (10–20 ms) for taps, short patterns for wins/misses.
// Works on Android (Chrome/Edge/Firefox); iOS Safari doesn't expose the Vibration API, so it's silently skipped there.
const HAPTIC = { tick: 8, undo: 10, check: 15, warn: [12, 45, 12], success: [18, 40, 30] };
function buzz(pattern = HAPTIC.check) {
  try { if (prefs.haptics !== false && navigator.vibrate) navigator.vibrate(pattern); } catch (e) { }
}
const savePrefs = () => store('ht5_prefs', prefs);

// Generic ⋯ popup menu (re-uses the .dropdown look)
function popMenu(btn, items) {
  closeMenu();
  const dd = document.createElement('div'); dd.className = 'dropdown'; dd.id = 'openDD';
  dd.innerHTML = items.map((it, i) => `<div class="dd-item${it.danger ? ' danger' : ''}" data-i="${i}">${it.label}</div>`).join('');
  dd.addEventListener('click', e => {
    e.stopPropagation();
    const i = e.target.closest('[data-i]')?.dataset.i;
    closeMenu();
    if (i !== undefined) items[i].fn();
  });
  btn.appendChild(dd);
}

