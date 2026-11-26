// ── MODAL ─────────────────────────────────────────────────────────────────────
const overlay = document.getElementById('modalOverlay');
const habitInput = document.getElementById('habitInput');

function openModal(title) {
  document.getElementById('modalTitle').textContent = title;
  renderEmojiPicker(); renderColorPicker();
  overlay.classList.add('open');
  setTimeout(() => habitInput.focus(), 300);
}
function closeModal() {
  overlay.classList.remove('open');
  habitInput.value = ''; editId = null; selEmoji = 'favorite'; selColor = COLORS[0];
}

document.getElementById('addBtn').addEventListener('click', () => { editId = null; openModal('New Habit'); });
document.getElementById('btnCancel').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

document.getElementById('btnSave').addEventListener('click', () => {
  const name = habitInput.value.trim();
  if (!name) { habitInput.style.borderColor = '#f87171'; setTimeout(() => habitInput.style.borderColor = '', 1200); return; }
  if (editId) {
    const h = habits.find(h => h.id === editId);
    if (h) { h.name = name; h.emoji = selEmoji; h.color = selColor; }
  } else {
    habits.push({ id: uid(), name, emoji: selEmoji, color: selColor, log: {} });
  }
  save(); renderHabits(); closeModal();
});
habitInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btnSave').click(); });

function doEdit(id) {
  const h = habits.find(h => h.id === id); if (!h) return;
  editId = id; habitInput.value = h.name; selEmoji = iconKey(h.emoji) || 'favorite'; selColor = h.color || COLORS[0];
  openModal('Edit Habit');
}
// ── CONFIRM DIALOG (generic) ──────────────────────────────────────────────────
let confirmCb = null;
function askConfirm({ title, text, yes = 'Delete', onYes }) {
  const box = document.getElementById('confirmOverlay');
  box.querySelector('h3').textContent = title;
  box.querySelector('p').textContent = text;
  box.querySelector('.btn-yes').textContent = yes;
  confirmCb = onYes;
  box.classList.add('open');
}
function doConfirm(id) {
  askConfirm({
    title: 'Delete Habit?', text: 'All tracking data will be permanently removed.',
    onYes: () => { habits = habits.filter(h => h.id !== id); save(); renderHabits(); }
  });
}
document.getElementById('confirmNo').addEventListener('click', () => {
  document.getElementById('confirmOverlay').classList.remove('open'); confirmCb = null;
});
document.getElementById('confirmYes').addEventListener('click', () => {
  const cb = confirmCb; confirmCb = null;
  document.getElementById('confirmOverlay').classList.remove('open');
  if (cb) cb();
});

// ── PICKERS ───────────────────────────────────────────────────────────────────
function renderEmojiPicker() {
  const p = document.getElementById('emojiPicker'); p.innerHTML = '';
  document.documentElement.style.setProperty('--sel-color', selColor);
  EMOJIS.forEach(em => {
    const b = document.createElement('div');
    b.className = 'emoji-opt' + (em === selEmoji ? ' sel' : ''); b.innerHTML = ic(em);
    b.addEventListener('click', () => { selEmoji = em; renderEmojiPicker(); });
    p.appendChild(b);
  });
}
function renderColorPicker() {
  const p = document.getElementById('colorPicker'); p.innerHTML = '';
  document.documentElement.style.setProperty('--sel-color', selColor);
  COLORS.forEach((c, i) => {
    const s = document.createElement('div');
    s.className = 'color-sw' + (c === selColor ? ' sel' : '');
    s.style.background = c; s.style.setProperty('--sw-col', c); s.title = CNAMES[i] || c;
    s.addEventListener('click', () => {
      selColor = c;
      document.documentElement.style.setProperty('--sel-color', c);
      renderColorPicker(); renderEmojiPicker();
    });
    p.appendChild(s);
  });
}

