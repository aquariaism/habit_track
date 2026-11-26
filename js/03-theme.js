// ── THEME (System / Light / Dark) ──────────────────────────────────────────────
let themePref = localStorage.getItem('ht3_theme') || 'system';
if (themePref !== 'light' && themePref !== 'dark' && themePref !== 'system') {
  themePref = 'system';
  try { localStorage.setItem('ht3_theme', 'system'); } catch (e) { }
}
const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const resolved = themePref === 'system' ? (darkMQ.matches ? 'dark' : 'light') : themePref;
  document.documentElement.setAttribute('data-theme', resolved);
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#141218');
  document.querySelectorAll('.seg-btn[data-theme]').forEach(b => b.classList.toggle('sel', b.dataset.theme === themePref));
}
darkMQ.addEventListener?.('change', () => { if (themePref === 'system') applyTheme(); });
document.querySelectorAll('.seg-btn[data-theme]').forEach(b => {
  b.addEventListener('click', () => {
    if (!b.dataset.theme) return;
    themePref = b.dataset.theme;
    localStorage.setItem('ht3_theme', themePref);
    applyTheme();
  });
});
applyTheme();

