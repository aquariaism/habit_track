// ── Render Main Workout View ──────────────────────────────────────────────────
function renderWorkout() {
  const root = document.getElementById('view-workout');
  if (!root) return;

  const todayKey = getTodayDayKey();
  const plan = workoutData.plans[selectedWorkoutDay] || { focus: 'Workout', exercises: [] };
  const exercises = plan.exercises || [];
  const totalEx = exercises.length;
  const completedEx = exercises.filter(x => isExerciseDone(x.id)).length;
  const pct = totalEx ? Math.round((completedEx / totalEx) * 100) : 0;
  const totalSets = exercises.reduce((sum, x) => sum + (x.sets || 3), 0);
  const estMins = Math.round(exercises.reduce((sum, x) => sum + ((x.sets || 3) * ((x.duration || 40) + (x.rest ?? 20))), 0) / 60);

  // Make sure the timer shows an exercise from the selected day (first one by default)
  syncTimerToDay();

  // 1. Weekly Day Selector Strip
  const dayStripHTML = `
    <div class="workout-day-strip">
      ${WEEK_DAYS.map(d => {
    const isSel = d.key === selectedWorkoutDay;
    const isTod = d.key === todayKey;
    const p = workoutData.plans[d.key];
    const doneCount = (p && p.exercises) ? p.exercises.filter(x => isExerciseDone(x.id)).length : 0;
    const allDone = p && p.exercises && p.exercises.length && doneCount === p.exercises.length;
    return `<button type="button" class="w-day-btn${isSel ? ' sel' : ''}${isTod ? ' is-today' : ''}" data-wday="${d.key}">
          <span class="w-day-name">${d.short}</span>
          <span class="w-day-sub">${p?.exercises?.length || 0} ex</span>
          ${allDone ? '<span class="w-day-dot"></span>' : ''}
        </button>`;
  }).join('')}
    </div>
  `;

  // 2. Day Focus & Progress Banner
  const bannerHTML = `
    <div class="workout-banner">
      <div class="wb-left">
        <div class="wb-focus-row">
          <div class="wb-focus-title">${esc(plan.focus || 'Workout Plan')}</div>
          <button type="button" class="wb-edit-btn" data-act="edit-focus" title="Rename Focus">${ic('edit')}</button>
        </div>
        <div class="wb-stats">
          <span>${totalEx} exercises</span> · 
          <span>${totalSets} sets</span> · 
          <span>~${estMins} mins</span>
        </div>
        <div class="wb-bar-wrap">
          <div class="wb-bar" style="width:${pct}%;background:${pct === 100 ? 'var(--success)' : 'var(--primary)'}"></div>
        </div>
      </div>
      <div class="wb-pct" style="color:${pct === 100 ? 'var(--success)' : 'var(--primary)'}">
        ${pct}%
      </div>
    </div>
  `;

  // 3. Timer & Stopwatch Card
  let timerCardInner = '';
  if (workoutTimer.mode === 'timer') {
    const isRest = workoutTimer.status === 'rest';
    const displaySec = isRest ? workoutTimer.restLeft : workoutTimer.timeLeft;
    const dots = Array.from({ length: workoutTimer.totalSets }, (_, i) =>
      `<span style="color:${i + 1 <= workoutTimer.currentSet ? 'var(--primary)' : 'var(--sub)'}">${i + 1 === workoutTimer.currentSet ? '●' : '○'}</span>`
    ).join(' ');

    // Ensure alternating exercises are valid if alternating is on
    if (workoutTimer.isAlternating) {
      if (!workoutTimer.altExA || !exercises.some(x => x.id === workoutTimer.altExA)) {
        workoutTimer.altExA = exercises[0] ? exercises[0].id : '';
      }
      if (!workoutTimer.altExB || !exercises.some(x => x.id === workoutTimer.altExB)) {
        const other = exercises.find(x => x.id !== workoutTimer.altExA);
        workoutTimer.altExB = other ? other.id : (exercises[1] ? exercises[1].id : workoutTimer.altExA);
      }
    }

    const curAltEx = workoutTimer.altActive === 'A'
      ? (exercises.find(x => x.id === workoutTimer.altExA) || exercises[0])
      : (exercises.find(x => x.id === workoutTimer.altExB) || exercises[0]);
    const nextAltEx = workoutTimer.altActive === 'A'
      ? (exercises.find(x => x.id === workoutTimer.altExB) || exercises[0])
      : (exercises.find(x => x.id === workoutTimer.altExA) || exercises[0]);
    const curTag = workoutTimer.altActive === 'A' ? 'tag-a' : 'tag-b';
    const curSlot = workoutTimer.altActive === 'A' ? 'Ex 1' : 'Ex 2';
    const nextSlot = workoutTimer.altActive === 'A' ? 'Ex 2' : 'Ex 1';

    const subSegHTML = `
      <div class="wt-sub-seg">
        <button type="button" class="wt-sub-btn ${!workoutTimer.isAlternating ? 'sel' : ''}" data-wtalt="single">
          ${ic('fitness_center')} Single Exercise
        </button>
        <button type="button" class="wt-sub-btn ${workoutTimer.isAlternating ? 'sel' : ''}" data-wtalt="alternate">
          ${ic('sync_alt')} Alternate 2
        </button>
      </div>
    `;

    const altPickerHTML = workoutTimer.isAlternating ? `
      <div class="wt-alt-picker-box">
        <div class="wt-alt-row">
          <span class="wt-alt-label"><span class="wt-pill-tag tag-a">Ex 1</span> First Exercise</span>
          <select class="wt-select" id="wtSelectA">
            ${exercises.map(x => `<option value="${x.id}" ${x.id === workoutTimer.altExA ? 'selected' : ''}>${esc(x.name)} (${x.sets} sets × ${x.duration}s)</option>`).join('')}
          </select>
        </div>
        <div class="wt-alt-swap-row">
          <button type="button" class="wt-swap-btn" data-wtact="swap-alt">${ic('swap_vert')} Swap Order</button>
        </div>
        <div class="wt-alt-row">
          <span class="wt-alt-label"><span class="wt-pill-tag tag-b">Ex 2</span> Second Exercise</span>
          <select class="wt-select" id="wtSelectB">
            ${exercises.map(x => `<option value="${x.id}" ${x.id === workoutTimer.altExB ? 'selected' : ''}>${esc(x.name)} (${x.sets} sets × ${x.duration}s)</option>`).join('')}
          </select>
        </div>
      </div>
    ` : '';

    const altBannerHTML = workoutTimer.isAlternating ? `
      <div class="wt-alt-banner" id="wtAltBanner">
        <div class="wt-alt-active-tag ${curTag}">
          <span class="wt-pill-tag ${curTag}">${curSlot}</span>
          ${esc(curAltEx?.name || 'Exercise')}
        </div>
        <div class="wt-alt-next-tag">Next up: ${esc(nextAltEx?.name || 'Next')} (${nextSlot})</div>
      </div>
    ` : '';

    const setsRowHTML = `
      <div class="wt-sets-row">
        <span class="wt-sets-lbl">Sets:</span>
        <div class="ex-stepper wt-stepper">
          <button type="button" class="ex-step-btn" data-wtact="step-timer-sets" data-delta="-1" title="Decrease sets">−</button>
          <span class="ex-step-val" id="wtSetsDisplay">${workoutTimer.totalSets}</span>
          <button type="button" class="ex-step-btn" data-wtact="step-timer-sets" data-delta="1" title="Increase sets">+</button>
        </div>
        <div class="wt-quick-sets">
          <button type="button" class="wt-qset-btn${workoutTimer.totalSets === 2 ? ' sel' : ''}" data-wtqsets="2">2</button>
          <button type="button" class="wt-qset-btn${workoutTimer.totalSets === 3 ? ' sel' : ''}" data-wtqsets="3">3</button>
          <button type="button" class="wt-qset-btn${workoutTimer.totalSets === 4 ? ' sel' : ''}" data-wtqsets="4">4</button>
          <button type="button" class="wt-qset-btn${workoutTimer.totalSets === 5 ? ' sel' : ''}" data-wtqsets="5">5</button>
        </div>
      </div>
    `;

    timerCardInner = `
      ${subSegHTML}
      ${altPickerHTML}
      ${altBannerHTML}
      <div class="wt-ex-info">
        <div class="wt-ex-name" id="wtExName">${esc(workoutTimer.isAlternating ? `${curSlot}: ${curAltEx?.name || 'Exercise'}` : (workoutTimer.exerciseName || 'Daily Exercise'))}</div>
        <div class="wt-ex-set" id="wtExSet">${workoutTimer.isAlternating ? `Round ${workoutTimer.currentSet} of ${workoutTimer.totalSets} &nbsp; ${dots} <span style="font-size:.74rem;opacity:.85;font-weight:700">(${curSlot})</span>` : `Set ${workoutTimer.currentSet} of ${workoutTimer.totalSets} &nbsp; ${dots}`}</div>
      </div>
      ${setsRowHTML}
      <div class="wt-display-wrap">
        <div class="wt-status-chip ${isRest ? 'rest' : workoutTimer.status === 'running' ? 'work' : 'ready'}" id="wtStatusChip">
          ${isRest ? 'REST TIME' : workoutTimer.status === 'running' ? 'WORK' : workoutTimer.status === 'paused' ? 'PAUSED' : 'READY'}
        </div><br>
        <div class="wt-digits${workoutTimer.status === 'running' && workoutTimer.timeLeft <= 5 && !isRest ? ' pulse-warn' : ''}" id="wtDigits">
          ${minToSecStr(displaySec)}
        </div>
      </div>
      <div class="wt-presets">
        <button type="button" class="wt-preset-chip${workoutTimer.targetDuration === 20 ? ' sel' : ''}" data-wtdur="20">20s</button>
        <button type="button" class="wt-preset-chip${workoutTimer.targetDuration === 30 ? ' sel' : ''}" data-wtdur="30">30s</button>
        <button type="button" class="wt-preset-chip${workoutTimer.targetDuration === 40 ? ' sel' : ''}" data-wtdur="40">40s</button>
        <button type="button" class="wt-preset-chip${workoutTimer.targetDuration === 45 ? ' sel' : ''}" data-wtdur="45">45s</button>
        <button type="button" class="wt-preset-chip${workoutTimer.targetDuration === 60 ? ' sel' : ''}" data-wtdur="60">60s</button>
        <button type="button" class="wt-preset-chip" data-wtadj="-5">-5s</button>
        <button type="button" class="wt-preset-chip" data-wtadj="+5">+5s</button>
      </div>
      <div class="wt-actions">
        <button type="button" class="wt-btn-circle" data-wtact="reset" title="Reset">${ic('replay')}</button>
        <button type="button" class="wt-btn-main ${workoutTimer.status === 'running' || workoutTimer.status === 'rest' ? 'running' : ''}" id="wtBtnMain" data-wtact="play-pause">
          ${workoutTimer.status === 'running' || workoutTimer.status === 'rest' ? `${ic('pause')} Pause` : `${ic('play_arrow')} Start`}
        </button>
        <button type="button" class="wt-btn-circle" data-wtact="next-set" title="Next Set">${ic('skip_next')}</button>
        <button type="button" class="wt-btn-circle ${workoutTimer.sound ? 'active-sound' : ''}" data-wtact="sound" title="Toggle Sound">
          ${ic(workoutTimer.sound ? 'volume_up' : 'volume_off')}
        </button>
      </div>
    `;
  } else {
    // Stopwatch Mode
    const lapsHTML = workoutTimer.swLaps.length ? `
      <div class="wt-laps-wrap">
        ${workoutTimer.swLaps.map((lap, idx) => `
          <div class="wt-lap-row">
            <span>Lap ${workoutTimer.swLaps.length - idx}</span>
            <b>${formatStopwatch(lap)}</b>
          </div>
        `).join('')}
      </div>
    ` : '';

    timerCardInner = `
      <div class="wt-ex-info">
        <div class="wt-ex-name">Stopwatch</div>
        <div class="wt-ex-set">Track workout duration</div>
      </div>
      <div class="wt-display-wrap">
        <div class="wt-status-chip ${workoutTimer.swRunning ? 'work' : 'ready'}" id="wtStatusChip">
          ${workoutTimer.swRunning ? 'RUNNING' : 'STOPPED'}
        </div><br>
        <div class="wt-digits" id="wtDigits">${formatStopwatch(workoutTimer.swElapsed)}</div>
      </div>
      <div class="wt-actions">
        <button type="button" class="wt-btn-circle" data-wtact="sw-reset" title="Reset">${ic('replay')}</button>
        <button type="button" class="wt-btn-main ${workoutTimer.swRunning ? 'running' : ''}" id="wtBtnMain" data-wtact="sw-play-pause">
          ${workoutTimer.swRunning ? `${ic('pause')} Pause` : `${ic('play_arrow')} Start`}
        </button>
        <button type="button" class="wt-btn-circle" data-wtact="sw-lap" title="Lap">${ic('timer')}</button>
      </div>
      ${lapsHTML}
    `;
  }

  const timerCardHTML = `
    <div class="workout-timer-card" id="workoutTimerCard">
      <div class="wt-mode-seg">
        <button type="button" class="wt-mode-btn ${workoutTimer.mode === 'timer' ? 'sel' : ''}" data-wtmode="timer">
          ${ic('timer')} Exercise Timer
        </button>
        <button type="button" class="wt-mode-btn ${workoutTimer.mode === 'stopwatch' ? 'sel' : ''}" data-wtmode="stopwatch">
          ${ic('hourglass_top')} Stopwatch
        </button>
      </div>
      ${timerCardInner}
    </div>
  `;

  // 4. Exercise List
  const doneEx = exercises.filter(x => isExerciseDone(x.id)).length;
  const exercisesHTML = exercises.map(ex => {
    const cat = EX_CATEGORIES[ex.category] || EX_CATEGORIES.chest;
    const isDone = isExerciseDone(ex.id);
    const completedSets = getCompletedSets(ex.id);

    const setBubbles = Array.from({ length: ex.sets }, (_, i) => {
      const setNum = i + 1;
      const setDone = completedSets.includes(setNum);
      return `<button type="button" class="ex-set-bubble${setDone ? ' done' : ''}" data-act="toggle-set" data-id="${ex.id}" data-set="${setNum}" title="Set ${setNum}">${setNum}</button>`;
    }).join('');

    return `
      <div class="ex-card${isDone ? ' done' : ''}" data-id="${ex.id}">
        <div class="ex-card-top">
          <div class="ex-icon-box" style="background:${hexA(cat.c, .18)};color:${cat.c}">
            ${ic(cat.e)}
          </div>
          <div class="ex-mid">
            <div class="ex-name-text">${esc(ex.name)}</div>
            <div class="ex-sub-meta">
              ${ex.sets} sets × ${ex.duration}s · ${ex.rest || 20}s rest${ex.reps ? ` · ${esc(ex.reps)}` : ''}
            </div>
          </div>
          <div class="habit-menu-btn ex-menu-btn" data-act="ex-menu" data-id="${ex.id}" role="button" aria-label="More">${ic('more_horiz')}</div>
        </div>
        <div class="ex-sets-tracker">
          <div class="ex-bubbles-row">
            ${setBubbles}
          </div>
          <div class="ex-right-actions">
            <button type="button" class="ex-timer-launch" data-act="load-timer" data-id="${ex.id}" title="Load in Timer" aria-label="Load in Timer">${ic('play_arrow')}</button>
            <div class="habit-check-btn ex-chk${isDone ? ' checked' : ''}" data-act="toggle-ex" data-id="${ex.id}" role="button" aria-label="Mark exercise complete">${CHECK_SVG}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <div class="workout-wrap">
      ${dayStripHTML}
      ${bannerHTML}
      ${timerCardHTML}
      <button type="button" class="ex-collapse-head" data-act="toggle-exlist" aria-expanded="${exListOpen}">
        <span class="ex-sec-title">Today's Routine</span>
        <span class="ex-count-chip">${doneEx}/${totalEx} done</span>
        <span class="ex-chev">${ic('expand_more', '20px')}</span>
      </button>
      ${exListOpen ? `
        <div class="ex-actions-row">
          <button type="button" class="ex-pill-btn" data-act="add-ex">${ic('add')} Add Exercise</button>
        </div>
        <div class="ex-list">
          ${exercisesHTML || `<div class="empty"><div class="empty-icon">${ic('fitness_center')}</div><p>No exercises planned for this day yet.<br>Tap “Add Exercise” to get started.</p></div>`}
        </div>
      ` : ''}
    </div>
  `;
}

// ── Event Handlers for Workout View (Event Delegation) ─────────────────────────
document.getElementById('view-workout')?.addEventListener('click', e => {
  // Day Selector
  const dayBtn = e.target.closest('[data-wday]');
  if (dayBtn) {
    buzz(HAPTIC.tick);
    selectedWorkoutDay = dayBtn.dataset.wday;
    syncTimerToDay(true);
    renderWorkout();
    return;
  }

  // Timer Mode Switcher
  const modeBtn = e.target.closest('[data-wtmode]');
  if (modeBtn) {
    buzz(HAPTIC.tick);
    workoutTimer.mode = modeBtn.dataset.wtmode;
    renderWorkout();
    return;
  }

  // Alternating Mode Switcher
  const altBtn = e.target.closest('[data-wtalt]');
  if (altBtn) {
    buzz(HAPTIC.tick);
    const isAlt = altBtn.dataset.wtalt === 'alternate';
    if (isAlt) {
      setupAlternatingMode(workoutTimer.altExA || workoutTimer.exerciseId, workoutTimer.altExB);
    } else {
      workoutTimer.isAlternating = false;
    }
    renderWorkout();
    return;
  }

  // Quick Sets Chips (Timer)
  const qsetBtn = e.target.closest('[data-wtqsets]');
  if (qsetBtn) {
    const s = parseInt(qsetBtn.dataset.wtqsets, 10);
    setTimerTotalSets(s);
    return;
  }

  // Duration Presets & Adjustments
  const durBtn = e.target.closest('[data-wtdur]');
  if (durBtn) {
    buzz(HAPTIC.tick);
    const d = parseInt(durBtn.dataset.wtdur, 10);
    workoutTimer.targetDuration = d;
    if (workoutTimer.status === 'idle' || workoutTimer.status === 'paused') {
      workoutTimer.timeLeft = d;
    }
    renderWorkout();
    return;
  }
  const adjBtn = e.target.closest('[data-wtadj]');
  if (adjBtn) {
    buzz(HAPTIC.tick);
    const delta = adjBtn.dataset.wtadj === '+5' ? 5 : -5;
    workoutTimer.targetDuration = Math.max(5, Math.min(600, workoutTimer.targetDuration + delta));
    if (workoutTimer.status === 'idle' || workoutTimer.status === 'paused') {
      workoutTimer.timeLeft = workoutTimer.targetDuration;
    }
    updateTimerDisplayOnly();
    return;
  }

  // Timer Actions
  const wtAct = e.target.closest('[data-wtact]')?.dataset.wtact;
  if (wtAct) {
    switch (wtAct) {
      case 'play-pause':
        if (workoutTimer.status === 'running' || workoutTimer.status === 'rest') {
          pauseWorkoutTimer();
        } else {
          startWorkoutTimer();
        }
        break;
      case 'reset':
        resetWorkoutTimer();
        break;
      case 'next-set':
        skipOrNextSet();
        break;
      case 'swap-alt': {
        const tmp = workoutTimer.altExA;
        workoutTimer.altExA = workoutTimer.altExB;
        workoutTimer.altExB = tmp;
        const plan = workoutData.plans[selectedWorkoutDay];
        const curId = workoutTimer.altActive === 'A' ? workoutTimer.altExA : workoutTimer.altExB;
        const curEx = plan?.exercises?.find(x => x.id === curId);
        if (curEx) {
          workoutTimer.exerciseId = curEx.id;
          workoutTimer.exerciseName = curEx.name;
          workoutTimer.targetDuration = curEx.duration || 40;
          if (workoutTimer.status === 'idle') workoutTimer.timeLeft = curEx.duration || 40;
        }
        buzz(HAPTIC.tick);
        renderWorkout();
        break;
      }
      case 'step-timer-sets': {
        const delta = parseInt(e.target.closest('[data-delta]')?.dataset.delta || '1', 10);
        adjustTimerSets(delta);
        break;
      }
      case 'sound':
        workoutTimer.sound = !workoutTimer.sound;
        buzz(HAPTIC.tick);
        showToast(workoutTimer.sound ? 'Sound & beeps enabled' : 'Sound muted');
        renderWorkout();
        break;
      case 'sw-play-pause':
        if (workoutTimer.swRunning) {
          pauseStopwatch();
        } else {
          startStopwatch();
        }
        break;
      case 'sw-reset':
        resetStopwatch();
        break;
      case 'sw-lap':
        lapStopwatch();
        break;
    }
    return;
  }

  // General Actions
  const actBtn = e.target.closest('[data-act]');
  if (!actBtn) return;
  const act = actBtn.dataset.act;
  const id = actBtn.dataset.id || actBtn.closest('.ex-card')?.dataset.id;

  switch (act) {
    case 'toggle-exlist':
      exListOpen = !exListOpen;
      try { localStorage.setItem('ht_ex_list_open', exListOpen ? '1' : '0'); } catch (e) { }
      buzz(HAPTIC.tick);
      renderWorkout();
      break;
    case 'edit-focus':
      openDfModal(selectedWorkoutDay);
      break;
    case 'add-ex':
      openExModal(selectedWorkoutDay, null);
      break;
    case 'load-timer': {
      const plan = workoutData.plans[selectedWorkoutDay];
      const ex = plan?.exercises?.find(x => x.id === id);
      if (ex) loadExerciseIntoTimer(ex, true);
      break;
    }
    case 'toggle-ex':
      toggleExerciseCompletion(selectedWorkoutDay, id);
      break;
    case 'toggle-set': {
      const setNum = parseInt(actBtn.dataset.set, 10);
      toggleExerciseSet(selectedWorkoutDay, id, setNum);
      break;
    }
    case 'ex-menu': {
      e.stopPropagation();
      const plan = workoutData.plans[selectedWorkoutDay];
      const ex = plan?.exercises?.find(x => x.id === id);
      popMenu(actBtn, [
        { label: `${ic('play_arrow')}Start in Timer`, fn: () => { if (ex) loadExerciseIntoTimer(ex, true); } },
        { label: `${ic('edit')}Edit Exercise`, fn: () => openExModal(selectedWorkoutDay, id) },
        {
          label: `${ic('delete')}Delete`, danger: true, fn: () => askConfirm({
            title: 'Delete Exercise?',
            text: `“${ex?.name || 'This exercise'}” will be removed from your ${WEEK_DAYS.find(d => d.key === selectedWorkoutDay)?.name || ''} plan.`,
            onYes: () => {
              if (plan) {
                plan.exercises = plan.exercises.filter(x => x.id !== id);
                saveWorkout(); renderWorkout();
              }
            }
          })
        }
      ]);
      break;
    }
  }
});

// Dropdown change events for Alternating Selects
document.getElementById('view-workout')?.addEventListener('change', e => {
  if (e.target.id === 'wtSelectA') {
    workoutTimer.altExA = e.target.value;
    if (workoutTimer.altActive === 'A') {
      const plan = workoutData.plans[selectedWorkoutDay];
      const ex = plan?.exercises?.find(x => x.id === workoutTimer.altExA);
      if (ex) {
        workoutTimer.exerciseId = ex.id;
        workoutTimer.exerciseName = ex.name;
        workoutTimer.targetDuration = ex.duration || 40;
        if (workoutTimer.status === 'idle') workoutTimer.timeLeft = ex.duration || 40;
      }
    }
    renderWorkout();
  } else if (e.target.id === 'wtSelectB') {
    workoutTimer.altExB = e.target.value;
    if (workoutTimer.altActive === 'B') {
      const plan = workoutData.plans[selectedWorkoutDay];
      const ex = plan?.exercises?.find(x => x.id === workoutTimer.altExB);
      if (ex) {
        workoutTimer.exerciseId = ex.id;
        workoutTimer.exerciseName = ex.name;
        workoutTimer.targetDuration = ex.duration || 40;
        if (workoutTimer.status === 'idle') workoutTimer.timeLeft = ex.duration || 40;
      }
    }
    renderWorkout();
  }
});


