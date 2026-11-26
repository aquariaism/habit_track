// ── Progress & Log Tracking ───────────────────────────────────────────────────
function isExerciseDone(exId) {
  return !!(workoutData.log[todayStr]?.completed?.includes(exId));
}

function getCompletedSets(exId) {
  return workoutData.log[todayStr]?.sets?.[exId] || [];
}

function logExerciseSet(dayKey, exId, setNum) {
  if (!exId) return;
  if (!workoutData.log[todayStr]) workoutData.log[todayStr] = { sets: {}, completed: [] };
  const log = workoutData.log[todayStr];
  log.sets = log.sets || {};
  log.completed = log.completed || [];
  if (!log.sets[exId]) log.sets[exId] = [];
  if (!log.sets[exId].includes(setNum)) log.sets[exId].push(setNum);

  const plan = workoutData.plans[dayKey];
  const ex = plan?.exercises?.find(x => x.id === exId);
  if (ex && log.sets[exId].length >= ex.sets) {
    if (!log.completed.includes(exId)) log.completed.push(exId);
  }
  saveWorkout();
  renderWorkout();
}

function toggleExerciseSet(dayKey, exId, setNum) {
  buzz(HAPTIC.tick);
  if (!workoutData.log[todayStr]) workoutData.log[todayStr] = { sets: {}, completed: [] };
  const log = workoutData.log[todayStr];
  log.sets = log.sets || {};
  log.completed = log.completed || [];
  if (!log.sets[exId]) log.sets[exId] = [];

  const idx = log.sets[exId].indexOf(setNum);
  if (idx >= 0) {
    log.sets[exId].splice(idx, 1);
    log.completed = log.completed.filter(x => x !== exId);
  } else {
    log.sets[exId].push(setNum);
    const plan = workoutData.plans[dayKey];
    const ex = plan?.exercises?.find(x => x.id === exId);
    if (ex && log.sets[exId].length >= ex.sets && !log.completed.includes(exId)) {
      log.completed.push(exId);
      buzz(HAPTIC.success);
    }
  }
  saveWorkout();
  renderWorkout();
}

function toggleExerciseCompletion(dayKey, exId) {
  if (!workoutData.log[todayStr]) workoutData.log[todayStr] = { sets: {}, completed: [] };
  const log = workoutData.log[todayStr];
  log.sets = log.sets || {};
  log.completed = log.completed || [];

  const plan = workoutData.plans[dayKey];
  const ex = plan?.exercises?.find(x => x.id === exId);
  const isDone = log.completed.includes(exId);

  if (isDone) {
    log.completed = log.completed.filter(x => x !== exId);
    delete log.sets[exId];
    buzz(HAPTIC.undo);
  } else {
    log.completed.push(exId);
    if (ex) {
      log.sets[exId] = Array.from({ length: ex.sets }, (_, i) => i + 1);
    }
    buzz(HAPTIC.check);
    if (plan && plan.exercises.every(x => log.completed.includes(x.id))) {
      showToast("All of today's exercises completed! Beast mode! 🔥");
      buzz(HAPTIC.success);
    }
  }
  saveWorkout();
  renderWorkout();
}

// ── Modals: Add / Edit Exercise & Day Focus ────────────────────────────────────
let exModalCtx = { dayKey: 'mon', exId: null };
let exSelectedCat = 'chest';

function renderExCategoryChips() {
  const container = document.getElementById('exCategories');
  if (!container) return;
  container.innerHTML = Object.entries(EX_CATEGORIES).map(([k, cat]) =>
    `<button type="button" class="type-chip${k === exSelectedCat ? ' sel' : ''}" data-cat="${k}" style="--tc:${cat.c}">${ic(cat.e)}${cat.l}</button>`
  ).join('');
}

document.getElementById('exCategories')?.addEventListener('click', e => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  exSelectedCat = b.dataset.cat;
  renderExCategoryChips();
});

function openExModal(dayKey, exId = null) {
  exModalCtx = { dayKey, exId };
  const ov = document.getElementById('exerciseOverlay');
  const plan = workoutData.plans[dayKey];
  const ex = exId ? plan?.exercises?.find(x => x.id === exId) : null;
  document.getElementById('exModalTitle').textContent = ex ? 'Edit Exercise' : 'New Exercise';
  document.getElementById('exName').value = ex ? ex.name : '';
  document.getElementById('exSets').value = ex ? ex.sets : 3;
  document.getElementById('exDuration').value = ex ? ex.duration : 40;
  document.getElementById('exRest').value = ex ? (ex.rest ?? 20) : 20;
  document.getElementById('exReps').value = ex ? (ex.reps || '') : '';
  exSelectedCat = ex ? ex.category : 'chest';
  document.getElementById('exErr').textContent = '';
  renderExCategoryChips();
  ov.classList.add('open');
  setTimeout(() => document.getElementById('exName').focus(), 300);
}

function closeExModal() {
  document.getElementById('exerciseOverlay')?.classList.remove('open');
}

document.getElementById('exCancel')?.addEventListener('click', closeExModal);
document.getElementById('exerciseOverlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('exerciseOverlay')) closeExModal();
});
document.getElementById('exName')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('exSave').click();
});

document.getElementById('exSave')?.addEventListener('click', () => {
  const name = document.getElementById('exName').value.trim();
  const sets = parseInt(document.getElementById('exSets').value, 10);
  const duration = parseInt(document.getElementById('exDuration').value, 10);
  const rest = parseInt(document.getElementById('exRest').value, 10);
  const reps = document.getElementById('exReps').value.trim();
  const err = document.getElementById('exErr');

  if (!name) { err.textContent = 'Give this exercise a name.'; document.getElementById('exName').focus(); return; }
  if (isNaN(sets) || sets < 1 || sets > 30) { err.textContent = 'Sets must be between 1 and 30.'; return; }
  if (isNaN(duration) || duration < 5 || duration > 600) { err.textContent = 'Duration must be between 5s and 600s.'; return; }

  const dayKey = exModalCtx.dayKey;
  if (!workoutData.plans[dayKey]) workoutData.plans[dayKey] = { focus: 'Workout', exercises: [] };
  const exercises = workoutData.plans[dayKey].exercises;

  if (exModalCtx.exId) {
    const existing = exercises.find(x => x.id === exModalCtx.exId);
    if (existing) {
      existing.name = name;
      existing.sets = sets;
      existing.duration = duration;
      existing.rest = isNaN(rest) ? 20 : rest;
      existing.reps = reps;
      existing.category = exSelectedCat;
    }
  } else {
    exercises.push({
      id: uid(),
      name,
      sets,
      duration,
      rest: isNaN(rest) ? 20 : rest,
      reps,
      category: exSelectedCat
    });
  }

  saveWorkout();
  renderWorkout();
  closeExModal();
  showToast(exModalCtx.exId ? 'Exercise updated' : 'Exercise added');
});

// Day Focus modal
let dfDayKey = 'mon';
function openDfModal(dayKey) {
  dfDayKey = dayKey;
  const ov = document.getElementById('dayFocusOverlay');
  const plan = workoutData.plans[dayKey];
  document.getElementById('dfInput').value = plan?.focus || '';
  ov.classList.add('open');
  setTimeout(() => document.getElementById('dfInput').focus(), 300);
}
function closeDfModal() {
  document.getElementById('dayFocusOverlay')?.classList.remove('open');
}
document.getElementById('dfCancel')?.addEventListener('click', closeDfModal);
document.getElementById('dayFocusOverlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('dayFocusOverlay')) closeDfModal();
});
document.getElementById('dfInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('dfSave').click();
});
document.getElementById('dfSave')?.addEventListener('click', () => {
  const v = document.getElementById('dfInput').value.trim();
  if (v && workoutData.plans[dfDayKey]) {
    workoutData.plans[dfDayKey].focus = v;
    saveWorkout();
    renderWorkout();
  }
  closeDfModal();
});

