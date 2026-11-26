// ── SETTINGS ──────────────────────────────────────────────────────────────────
document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('settingsPanel').classList.add('open');
  document.getElementById('settingsOverlay').classList.add('open');
});
function closeSettings() {
  document.getElementById('settingsPanel').classList.remove('open');
  document.getElementById('settingsOverlay').classList.remove('open');
}
document.getElementById('settingsClose').addEventListener('click', closeSettings);
document.getElementById('settingsOverlay').addEventListener('click', closeSettings);

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.innerHTML = ic(type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info') + `<span>${esc(msg)}</span>`;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

