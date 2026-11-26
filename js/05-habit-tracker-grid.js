// ── STATS for one habit (gap #2) ───────────────────────────────────────────────
function getStats(habit) {
  // Current month: days 1 → today
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  let monthTotal = 0, monthDone = 0;
  const cursor = new Date(monthStart);
  while (cursor <= today) { monthTotal++; if (habit.log?.[fmt(cursor)]) monthDone++; cursor.setDate(cursor.getDate() + 1); }

  // Current streak (consecutive days ending today going back)
  let streak = 0;
  const sc = new Date(today);
  while (habit.log?.[fmt(sc)]) { streak++; sc.setDate(sc.getDate() - 1); }

  // Best streak ever
  const allDates = Object.keys(habit.log || {}).sort();
  let best = 0, cur = 0, prev = null;
  allDates.forEach(ds => {
    if (!habit.log[ds]) { cur = 0; prev = null; return; }
    if (!prev) { cur = 1; }
    else {
      const pd = new Date(prev), cd = new Date(ds);
      const diff = (cd - pd) / (1000 * 60 * 60 * 24);
      cur = diff === 1 ? cur + 1 : 1;
    }
    if (cur > best) best = cur;
    prev = ds;
  });

  const pct = monthTotal ? Math.round(monthDone / monthTotal * 100) : 0;
  return { monthDone, monthTotal, pct, streak, best };
}

// ── TRACKER GRID (gap #1: past cells are clickable) ───────────────────────────
function buildTracker(habit) {
  const WEEKS = 18;
  const CELL = 11;
  const GAP = 3;
  const STRIDE = CELL + GAP;
  const color = habit.color || '#a07cc0';

  const todayDow = today.getDay();
  const thisMonday = new Date(today); thisMonday.setDate(today.getDate() - ((todayDow + 6) % 7));
  const firstMon = new Date(thisMonday); firstMon.setDate(thisMonday.getDate() - (WEEKS - 1) * 7);

  const weeks = [];
  for (let w = 0; w < WEEKS; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(firstMon); day.setDate(firstMon.getDate() + w * 7 + d);
      const ds = fmt(day);
      const isFuture = day.getTime() > today.getTime();
      week.push({ ds, day, isFuture, done: !!(habit.log?.[ds]) });
    }
    weeks.push(week);
  }

  const wrap = document.createElement('div'); wrap.className = 'tracker-inner';

  // Day labels
  const lbls = document.createElement('div'); lbls.className = 'tracker-day-labels';
  ['M', '', 'W', '', 'F', '', 'S'].forEach(t => {
    const el = document.createElement('div'); el.className = 'day-label-txt'; el.textContent = t; lbls.appendChild(el);
  });

  const area = document.createElement('div'); area.className = 'tracker-cols-area';

  // Month labels — placed on the column containing the 1st of each month.
  // A leading label for the oldest (partial) month is only shown if there is
  // enough room before the next label, so labels never overlap.
  const mrow = document.createElement('div'); mrow.className = 'tracker-months';
  const labels = [];
  weeks.forEach((week, wi) => {
    const first = week.find(d => d.day.getDate() === 1);
    if (first) labels.push({ wi, day: first.day });
  });
  if (!labels.length || labels[0].wi >= 3) labels.unshift({ wi: 0, day: weeks[0][0].day });
  labels.forEach(l => {
    const lbl = document.createElement('div'); lbl.className = 'month-lbl';
    lbl.style.left = `${l.wi * STRIDE}px`;
    lbl.textContent = `${MON_S[l.day.getMonth()]} '${String(l.day.getFullYear()).slice(2)}`;
    mrow.appendChild(lbl);
  });

  // Cells
  const cols = document.createElement('div'); cols.className = 'tracker-cols';
  const tip = document.getElementById('cellTip');

  weeks.forEach(week => {
    const col = document.createElement('div'); col.className = 'tracker-week';
    week.forEach(day => {
      const cell = document.createElement('div'); cell.className = 't-cell';
      cell.dataset.ds = day.ds;

      if (day.isFuture) {
        cell.classList.add('invisible');
      } else {
        // ALL past cells (including today) are clickable
        cell.classList.add('past-cell');

        if (day.done) {
          cell.style.background = color;
          cell.style.boxShadow = `0 0 4px ${color}66`;
        } else if (day.ds === todayStr) {
          cell.style.background = 'transparent';
          cell.style.border = `1.5px solid ${color}`;
          cell.style.borderRadius = '2px';
          cell.style.boxSizing = 'border-box';
        }

        // Click to toggle any past day
        cell.addEventListener('click', e => {
          e.stopPropagation();
          toggleDay(habit.id, day.ds, cell, color);
        });

        // Tooltip
        cell.addEventListener('mouseenter', e => {
          tip.textContent = `${day.ds}${day.done ? ' · ✓ done' : ''}`;
          tip.classList.add('show');
        });
        cell.addEventListener('mousemove', e => {
          tip.style.left = `${e.clientX + 12}px`;
          tip.style.top = `${e.clientY - 28}px`;
        });
        cell.addEventListener('mouseleave', () => tip.classList.remove('show'));
      }

      col.appendChild(cell);
    });
    cols.appendChild(col);
  });

  area.appendChild(mrow); area.appendChild(cols);
  wrap.appendChild(lbls); wrap.appendChild(area);
  return wrap;
}

// Toggle any past day in-place (no full re-render needed for the grid)
function toggleDay(habitId, ds, cellEl, color) {
  const h = habits.find(h => h.id === habitId);
  if (!h) return;
  if (!h.log) h.log = {};

  // Always resolve the grid cell by date, so the big tick button updates it too
  const cardEl = document.querySelector(`.habit-card[data-id="${habitId}"]`);
  cellEl = cardEl?.querySelector(`.t-cell[data-ds="${ds}"]`) || cellEl || document.createElement('div');

  if (h.log[ds]) {
    delete h.log[ds]; buzz(HAPTIC.undo);
    // revert cell
    cellEl.style.background = '';
    cellEl.style.boxShadow = '';
    if (ds === todayStr) {
      cellEl.style.background = 'transparent';
      cellEl.style.border = `1.5px solid ${color}`;
      cellEl.style.borderRadius = '2px';
      cellEl.style.boxSizing = 'border-box';
    } else {
      cellEl.style.border = '';
    }
  } else {
    h.log[ds] = true; buzz(HAPTIC.check);
    if (ds === todayStr) {
      const cb = cardEl?.querySelector('.habit-check-btn');
      if (cb) { const r = cb.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, color); }
      if (habits.length && habits.every(x => x.log?.[todayStr])) {
        setTimeout(() => {
          const b = document.getElementById('todayBanner'), r = b.getBoundingClientRect();
          burst(r.left + r.width / 2, r.top + r.height / 2, color, true); buzz(HAPTIC.success);
          b.classList.remove('celebrate'); void b.offsetWidth; b.classList.add('celebrate');
          showToast('All habits done today — amazing!');
        }, 260);
      }
    }
    cellEl.style.background = color;
    cellEl.style.boxShadow = `0 0 4px ${color}66`;
    cellEl.style.border = '';
    // pop animation
    cellEl.style.transform = 'scale(1.4)';
    setTimeout(() => { cellEl.style.transform = ''; }, 150);
  }

  save();

  // Update streak label on the card without full re-render
  const card = document.querySelector(`.habit-card[data-id="${habitId}"]`);
  if (card) {
    const { streak } = getStats(h);
    const sl = card.querySelector('.habit-streak');
    if (sl) sl.innerHTML = streakHTML(streak);
    // today's check button + done class
    if (ds === todayStr) {
      const done = !!(h.log[todayStr]);
      const chk = card.querySelector('.habit-check-btn');
      if (chk) {
        chk.classList.toggle('checked', done);
        chk.style.background = done ? hexA(color, .9) : 'transparent';
      }
      card.classList.toggle('done', done);
    }
  }

  // Update stats boxes
  const sb = document.querySelector(`.habit-card[data-id="${habitId}"] .stats-row`);
  if (sb) updateStatsBoxes(h, sb);

  updateBanner();
  renderWeek();
}

function updateStatsBoxes(habit, container) {
  const { monthDone, monthTotal, pct, streak, best } = getStats(habit);
  const color = habit.color || '#a07cc0';
  const boxes = container.querySelectorAll('.stat-box');
  if (boxes[0]) {
    boxes[0].querySelector('.stat-val').textContent = `${monthDone}/${monthTotal}`;
    boxes[0].querySelector('.stat-bar').style.width = `${pct}%`;
  }
  if (boxes[1]) boxes[1].querySelector('.stat-val').textContent = `${pct}%`;
  if (boxes[2]) boxes[2].querySelector('.stat-val').textContent = best;
  const hp = container.closest('.habit-card')?.querySelector('.hc-prog');
  if (hp) { hp.querySelector('u').style.width = `${pct}%`; hp.querySelector('b').textContent = `${pct}%`; }
}

