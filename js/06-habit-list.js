// ── RENDER HABITS ─────────────────────────────────────────────────────────────
function renderHabits() {
  const list = document.getElementById('habitsList');
  list.innerHTML = '';

  if (!habits.length) {
    list.innerHTML = `<div class="empty"><div class="empty-icon">${ic('grass')}</div><p>No habits yet.<br>Tap "Add New Habit" to begin!</p></div>`;
    updateBanner(); renderWeek(); return;
  }

  habits.forEach((habit, idx) => {
    const done = !!(habit.log?.[todayStr]);
    const { monthDone, monthTotal, pct, streak, best } = getStats(habit);
    const color = habit.color || '#a07cc0';

    const card = document.createElement('div');
    card.className = 'habit-card' + (done ? ' done' : '');
    card.dataset.id = habit.id;
    card.dataset.idx = idx;
    card.style.setProperty('--hc', color);   // card tint follows the habit's own colour

    // ── DRAG & DROP (gap #3) ──────────────────────────────────────────────────
    card.setAttribute('draggable', 'true');

    card.addEventListener('dragstart', e => {
      dragSrcIdx = idx;
      setTimeout(() => card.classList.add('dragging'), 0);
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.habit-card').forEach(c => c.classList.remove('drag-over'));
      dragSrcIdx = null;
    });
    card.addEventListener('dragover', e => {
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.habit-card').forEach(c => c.classList.remove('drag-over'));
      if (dragSrcIdx !== null && dragSrcIdx !== idx) card.classList.add('drag-over');
    });
    card.addEventListener('drop', e => {
      e.preventDefault();
      if (dragSrcIdx === null || dragSrcIdx === idx) return;
      const moved = habits.splice(dragSrcIdx, 1)[0];
      habits.splice(idx, 0, moved);
      save(); renderHabits();
    });

    // Touch drag support
    let touchStartY = 0, touchClone = null, touchOrigIdx = null;
    card.addEventListener('touchstart', e => {
      if (!e.target.closest('.drag-handle')) return;
      touchOrigIdx = idx;
      touchStartY = e.touches[0].clientY;
      card.classList.add('dragging');
    }, { passive: true });
    card.addEventListener('touchmove', e => {
      if (touchOrigIdx === null) return;
      e.preventDefault();
      const y = e.touches[0].clientY;
      const cards = [...document.querySelectorAll('.habit-card')];
      cards.forEach(c => c.classList.remove('drag-over'));
      const target = document.elementFromPoint(e.touches[0].clientX, y)?.closest('.habit-card');
      if (target && target !== card) target.classList.add('drag-over');
    }, { passive: false });
    card.addEventListener('touchend', e => {
      if (touchOrigIdx === null) return;
      card.classList.remove('dragging');
      const cards = [...document.querySelectorAll('.habit-card')];
      cards.forEach(c => c.classList.remove('drag-over'));
      const y = e.changedTouches[0].clientY;
      const target = document.elementFromPoint(e.changedTouches[0].clientX, y)?.closest('.habit-card');
      if (target && target !== card) {
        const targetIdx = parseInt(target.dataset.idx);
        const moved = habits.splice(touchOrigIdx, 1)[0];
        habits.splice(targetIdx, 0, moved);
        save(); renderHabits();
      }
      touchOrigIdx = null;
    });

    // ── HEAD ──
    const head = document.createElement('div'); head.className = 'habit-head';

    // drag handle
    const dh = document.createElement('div'); dh.className = 'drag-handle';
    dh.innerHTML = '<div class="dh-line"></div><div class="dh-line"></div><div class="dh-line"></div>';

    const icon = document.createElement('div'); icon.className = 'habit-icon';
    icon.style.background = hexA(color, .22); icon.style.color = color; icon.innerHTML = habitIconHTML(habit.emoji || 'favorite');

    const mid = document.createElement('div'); mid.className = 'habit-mid';
    mid.innerHTML = `<div class="habit-name"></div>
      <div class="habit-streak">${streakHTML(streak)}</div>`;
    mid.querySelector('.habit-name').textContent = habit.name;

    const chk = document.createElement('div');
    chk.className = 'habit-check-btn' + (done ? ' checked' : '');
    chk.style.background = done ? hexA(color, .9) : 'transparent';
    chk.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3.5 10l4.5 4.5 8.5-8.5" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    chk.addEventListener('click', () => {
      chk.classList.add('pop');
      chk.addEventListener('animationend', () => chk.classList.remove('pop'), { once: true });
      toggleDay(habit.id, todayStr, null, color);
    });

    const menu = document.createElement('div'); menu.className = 'habit-menu-btn';
    menu.innerHTML = ic('more_horiz');
    menu.addEventListener('click', e => { e.stopPropagation(); openMenu(habit.id, menu); });

    head.appendChild(dh); head.appendChild(icon); head.appendChild(mid); head.appendChild(chk); head.appendChild(menu);

    // ── TRACKER ──
    const tw = document.createElement('div'); tw.className = 'tracker-wrap';
    tw.appendChild(buildTracker(habit));

    // ── STATS ROW (gap #2) ────────────────────────────────────────────────────
    const sr = document.createElement('div'); sr.className = 'stats-row';

    function makeBox(val, lbl, barPct) {
      const b = document.createElement('div'); b.className = 'stat-box';
      b.innerHTML = `<div class="stat-val">${val}</div><div class="stat-lbl">${lbl}</div>
        ${barPct !== undefined ? `<div class="stat-bar-wrap"><div class="stat-bar" style="width:${barPct}%;background:${color}"></div></div>` : ''}`;
      return b;
    }
    sr.appendChild(makeBox(`${monthDone}/${monthTotal}`, 'This month', pct));
    sr.appendChild(makeBox(`${pct}%`, 'Completion'));
    sr.appendChild(makeBox(best, 'Best streak'));

    // Status tab (label comes from CSS: "To do" / "Completed") + month progress
    const tab = document.createElement('span'); tab.className = 'hc-tab'; tab.setAttribute('aria-hidden', 'true');
    const prog = document.createElement('div'); prog.className = 'hc-prog';
    prog.innerHTML = `<i><u style="width:${pct}%"></u></i><b>${pct}%</b>`;

    card.appendChild(tab);
    card.appendChild(prog);
    card.appendChild(head);
    card.appendChild(tw);
    card.appendChild(sr);
    list.appendChild(card);
  });

  updateBanner();
  renderWeek();
}

// ── TOGGLE TODAY (main checkbox) ──────────────────────────────────────────────
function toggleHabit(id) {
  const h = habits.find(h => h.id === id);
  if (!h) return;
  if (!h.log) h.log = {};
  if (h.log[todayStr]) { delete h.log[todayStr]; buzz(HAPTIC.undo); } else { h.log[todayStr] = true; buzz(HAPTIC.check); }
  save(); renderHabits();
}

// ── MENU ──────────────────────────────────────────────────────────────────────
function openMenu(id, btn) {
  closeMenu();
  if (openMenuId === id) { openMenuId = null; return; }
  openMenuId = id;
  const dd = document.createElement('div'); dd.className = 'dropdown'; dd.id = 'openDD';
  dd.innerHTML = `<div class="dd-item" data-a="cal">${ic('calendar_month')}Calendar</div>
    <div class="dd-item" data-a="edit">${ic('edit')}Edit</div>
    <div class="dd-item danger" data-a="del">${ic('delete')}Delete</div>`;
  dd.addEventListener('click', e => {
    e.stopPropagation();
    const a = e.target.closest('[data-a]')?.dataset.a; closeMenu();
    if (a === 'cal') openHabitCal(id, btn);
    if (a === 'edit') doEdit(id);
    if (a === 'del') doConfirm(id);
  });
  btn.appendChild(dd);
}
function closeMenu() { document.getElementById('openDD')?.remove(); openMenuId = null; }
document.addEventListener('click', closeMenu);

