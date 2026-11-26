// ── Workout Timer & Stopwatch State ────────────────────────────────────────────
let workoutTimer = {
  mode: 'timer',              // 'timer' (exercise countdown) or 'stopwatch' (count up)
  status: 'idle',             // 'idle', 'running', 'paused', 'rest'
  exerciseId: '',             // filled by syncTimerToDay() with the first exercise of the selected day
  exerciseName: '',
  currentSet: 1,
  totalSets: 3,
  targetDuration: 40,
  timeLeft: 40,
  restDuration: 20,
  restLeft: 20,
  sound: true,
  timerInterval: null,
  // Alternating / Superset mode
  isAlternating: false,
  altExA: '',
  altExB: '',
  altActive: 'A',             // 'A' or 'B'
  // Stopwatch
  swStart: 0,
  swElapsed: 0,
  swRunning: false,
  swInterval: null,
  swLaps: []
};

function getAltExercise(slot) {
  const plan = workoutData.plans[selectedWorkoutDay];
  if (!plan || !plan.exercises) return null;
  const id = slot === 'A' ? workoutTimer.altExA : workoutTimer.altExB;
  return plan.exercises.find(x => x.id === id) || null;
}

// Point the timer at the selected day's first exercise.
// force=true  -> always jump to the first exercise (used when the user switches day)
// force=false -> only if the timer's current exercise isn't part of that day's plan
// A timer that is running / paused / resting is never interrupted.
function syncTimerToDay(force = false) {
  if (workoutTimer.status !== 'idle') return;
  const exs = workoutData.plans[selectedWorkoutDay]?.exercises || [];
  if (!exs.length) return;
  const current = exs.find(x => x.id === workoutTimer.exerciseId);
  if (current && !force) return;
  const ex = exs[0];
  workoutTimer.exerciseId = ex.id;
  workoutTimer.exerciseName = ex.name;
  workoutTimer.totalSets = ex.sets || 3;
  workoutTimer.targetDuration = ex.duration || 40;
  workoutTimer.timeLeft = ex.duration || 40;
  workoutTimer.restDuration = ex.rest ?? 20;
  workoutTimer.restLeft = ex.rest ?? 20;
  workoutTimer.currentSet = 1;
  if (workoutTimer.isAlternating) setupAlternatingMode(ex.id, exs[1]?.id);
}

function setupAlternatingMode(exIdA, exIdB) {
  workoutTimer.isAlternating = true;
  const plan = workoutData.plans[selectedWorkoutDay];
  const exercises = plan?.exercises || [];
  workoutTimer.altExA = exIdA || (exercises[0] ? exercises[0].id : '');
  workoutTimer.altExB = exIdB || (exercises.find(x => x.id !== workoutTimer.altExA)?.id || (exercises[1] ? exercises[1].id : workoutTimer.altExA));
  workoutTimer.altActive = 'A';
  const exA = exercises.find(x => x.id === workoutTimer.altExA);
  if (exA) {
    workoutTimer.exerciseId = exA.id;
    workoutTimer.exerciseName = exA.name;
    workoutTimer.totalSets = exA.sets || 3;
    workoutTimer.targetDuration = exA.duration || 40;
    workoutTimer.timeLeft = exA.duration || 40;
    workoutTimer.restDuration = exA.rest ?? 20;
    workoutTimer.restLeft = exA.rest ?? 20;
  }
  workoutTimer.currentSet = 1;
  workoutTimer.status = 'idle';
  clearInterval(workoutTimer.timerInterval);
  workoutTimer.timerInterval = null;
}

function adjustExerciseSets(exId, delta) {
  const plan = workoutData.plans[selectedWorkoutDay];
  if (!plan || !plan.exercises) return;
  const ex = plan.exercises.find(x => x.id === exId);
  if (!ex) return;
  const newSets = Math.max(1, Math.min(20, (ex.sets || 3) + delta));
  if (newSets === ex.sets) return;
  ex.sets = newSets;
  if (workoutTimer.exerciseId === exId || workoutTimer.altExA === exId || workoutTimer.altExB === exId) {
    workoutTimer.totalSets = newSets;
    if (workoutTimer.currentSet > newSets) workoutTimer.currentSet = newSets;
  }
  buzz(HAPTIC.tick);
  saveWorkout();
  renderWorkout();
}

function adjustTimerSets(delta) {
  const newSets = Math.max(1, Math.min(20, (workoutTimer.totalSets || 3) + delta));
  setTimerTotalSets(newSets);
}

function setTimerTotalSets(count) {
  workoutTimer.totalSets = Math.max(1, Math.min(20, count));
  if (workoutTimer.currentSet > workoutTimer.totalSets) {
    workoutTimer.currentSet = workoutTimer.totalSets;
  }
  const plan = workoutData.plans[selectedWorkoutDay];
  if (plan && plan.exercises) {
    if (workoutTimer.isAlternating) {
      const exA = plan.exercises.find(x => x.id === workoutTimer.altExA);
      const exB = plan.exercises.find(x => x.id === workoutTimer.altExB);
      if (exA) exA.sets = workoutTimer.totalSets;
      if (exB) exB.sets = workoutTimer.totalSets;
    } else {
      const ex = plan.exercises.find(x => x.id === workoutTimer.exerciseId);
      if (ex) ex.sets = workoutTimer.totalSets;
    }
    saveWorkout();
  }
  buzz(HAPTIC.tick);
  renderWorkout();
}

function formatStopwatch(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const d = Math.floor((ms % 1000) / 100);
  return `${p(m)}:${p(s)}.${d}`;
}

function updateTimerDisplayOnly() {
  const digitsEl = document.getElementById('wtDigits');
  const chipEl = document.getElementById('wtStatusChip');
  const mainBtn = document.getElementById('wtBtnMain');
  const setEl = document.getElementById('wtExSet');
  const nameEl = document.getElementById('wtExName');

  if (digitsEl) {
    if (workoutTimer.mode === 'stopwatch') {
      digitsEl.textContent = formatStopwatch(workoutTimer.swElapsed);
      digitsEl.classList.remove('pulse-warn');
    } else {
      const isRest = workoutTimer.status === 'rest';
      const displaySec = isRest ? workoutTimer.restLeft : workoutTimer.timeLeft;
      digitsEl.textContent = minToSecStr(displaySec);
      if (!isRest && workoutTimer.status === 'running' && workoutTimer.timeLeft <= 5 && workoutTimer.timeLeft > 0) {
        digitsEl.classList.add('pulse-warn');
      } else {
        digitsEl.classList.remove('pulse-warn');
      }
    }
  }

  if (chipEl) {
    if (workoutTimer.mode === 'stopwatch') {
      chipEl.textContent = workoutTimer.swRunning ? 'RUNNING' : 'STOPWATCH';
      chipEl.className = `wt-status-chip ${workoutTimer.swRunning ? 'work' : 'ready'}`;
    } else {
      if (workoutTimer.status === 'rest') {
        chipEl.textContent = 'REST TIME';
        chipEl.className = 'wt-status-chip rest';
      } else if (workoutTimer.status === 'running') {
        chipEl.textContent = 'WORK';
        chipEl.className = 'wt-status-chip work';
      } else if (workoutTimer.status === 'paused') {
        chipEl.textContent = 'PAUSED';
        chipEl.className = 'wt-status-chip ready';
      } else {
        chipEl.textContent = 'READY';
        chipEl.className = 'wt-status-chip ready';
      }
    }
  }

  if (mainBtn) {
    const isRunning = (workoutTimer.mode === 'timer')
      ? (workoutTimer.status === 'running' || workoutTimer.status === 'rest')
      : workoutTimer.swRunning;
    mainBtn.classList.toggle('running', isRunning);
    mainBtn.innerHTML = isRunning
      ? `${ic('pause')} Pause`
      : `${ic('play_arrow')} Start`;
  }

  if (workoutTimer.mode === 'timer') {
    const dots = Array.from({ length: workoutTimer.totalSets }, (_, i) =>
      `<span style="color:${i + 1 <= workoutTimer.currentSet ? 'var(--primary)' : 'var(--sub)'}">${i + 1 === workoutTimer.currentSet ? '●' : '○'}</span>`
    ).join(' ');

    const setsDisplayEl = document.getElementById('wtSetsDisplay');
    if (setsDisplayEl) setsDisplayEl.textContent = workoutTimer.totalSets;

    if (workoutTimer.isAlternating) {
      const curEx = getAltExercise(workoutTimer.altActive);
      const nextEx = getAltExercise(workoutTimer.altActive === 'A' ? 'B' : 'A');
      const curTag = workoutTimer.altActive === 'A' ? 'tag-a' : 'tag-b';
      const curSlot = workoutTimer.altActive === 'A' ? 'Ex 1' : 'Ex 2';
      const nextSlot = workoutTimer.altActive === 'A' ? 'Ex 2' : 'Ex 1';

      if (setEl) {
        setEl.innerHTML = `Round ${workoutTimer.currentSet} of ${workoutTimer.totalSets} &nbsp; ${dots} <span style="font-size:.74rem;opacity:.85;font-weight:700">(${curSlot}: ${esc(curEx?.name || '')})</span>`;
      }
      if (nameEl) {
        nameEl.textContent = `${curSlot}: ${curEx?.name || 'Exercise'}`;
      }
      const altBannerEl = document.getElementById('wtAltBanner');
      if (altBannerEl) {
        altBannerEl.innerHTML = `
          <div class="wt-alt-active-tag ${curTag}">
            <span class="wt-pill-tag ${curTag}">${curSlot}</span>
            ${esc(curEx?.name || 'Exercise')}
          </div>
          <div class="wt-alt-next-tag">Next up: ${esc(nextEx?.name || 'None')} (${nextSlot})</div>
        `;
      }
    } else {
      if (setEl) {
        setEl.innerHTML = `Set ${workoutTimer.currentSet} of ${workoutTimer.totalSets} &nbsp; ${dots}`;
      }
      if (nameEl) {
        nameEl.textContent = workoutTimer.exerciseName || 'Daily Exercise';
      }
    }
  }
}

function tickWorkoutTimer() {
  if (workoutTimer.status === 'running') {
    workoutTimer.timeLeft--;

    // Warning beep on the last 5 seconds (5, 4, 3, 2, 1)
    if (workoutTimer.timeLeft <= 5 && workoutTimer.timeLeft > 0) {
      if (workoutTimer.sound) playWarningBeep();
    }

    if (workoutTimer.timeLeft <= 0) {
      workoutTimer.timeLeft = 0;
      if (workoutTimer.sound) playCompletionBeep();

      if (workoutTimer.isAlternating) {
        const plan = workoutData.plans[selectedWorkoutDay];
        const exA = plan?.exercises?.find(x => x.id === workoutTimer.altExA);
        const exB = plan?.exercises?.find(x => x.id === workoutTimer.altExB);
        const isCurrentA = workoutTimer.altActive === 'A';
        const curEx = isCurrentA ? exA : exB;
        const curExId = isCurrentA ? workoutTimer.altExA : workoutTimer.altExB;
        const nextEx = isCurrentA ? exB : exA;

        // Log current set completed for active exercise
        if (curExId) {
          logExerciseSet(selectedWorkoutDay, curExId, workoutTimer.currentSet);
        }

        if (isCurrentA && exB) {
          // Switch to Ex B after rest
          workoutTimer.status = 'rest';
          workoutTimer.restDuration = curEx?.rest ?? 20;
          workoutTimer.restLeft = workoutTimer.restDuration;
          showToast(`${curEx?.name || 'Ex 1'} set done! Rest, then ${nextEx?.name || 'Ex 2'}.`);
        } else {
          // Completed round (Ex B finished)
          if (workoutTimer.currentSet < workoutTimer.totalSets) {
            workoutTimer.status = 'rest';
            workoutTimer.restDuration = curEx?.rest ?? 20;
            workoutTimer.restLeft = workoutTimer.restDuration;
            showToast(`Round ${workoutTimer.currentSet} completed! Rest time.`);
          } else {
            // Exercise pair completely finished
            workoutTimer.status = 'idle';
            clearInterval(workoutTimer.timerInterval);
            workoutTimer.timerInterval = null;
            workoutTimer.timeLeft = curEx?.duration || 40;
            showToast(`All ${workoutTimer.totalSets} alternating sets completed! Beast mode! 💪🔥`);
            renderWorkout();
            return;
          }
        }
      } else {
        // Single Exercise mode
        logExerciseSet(selectedWorkoutDay, workoutTimer.exerciseId, workoutTimer.currentSet);

        if (workoutTimer.currentSet < workoutTimer.totalSets) {
          workoutTimer.status = 'rest';
          workoutTimer.restLeft = workoutTimer.restDuration;
          showToast(`Set ${workoutTimer.currentSet} completed! Rest time.`);
        } else {
          // Exercise finished!
          workoutTimer.status = 'idle';
          clearInterval(workoutTimer.timerInterval);
          workoutTimer.timerInterval = null;
          workoutTimer.timeLeft = workoutTimer.targetDuration;
          showToast(`Exercise completed! Great work! 💪`);

          // Check if there is another exercise in current day's plan
          const dayPlan = workoutData.plans[selectedWorkoutDay];
          if (dayPlan && dayPlan.exercises) {
            const curIdx = dayPlan.exercises.findIndex(x => x.id === workoutTimer.exerciseId);
            if (curIdx >= 0 && curIdx + 1 < dayPlan.exercises.length) {
              const nextEx = dayPlan.exercises[curIdx + 1];
              loadExerciseIntoTimer(nextEx, false);
            }
          }
        }
      }
    }
  } else if (workoutTimer.status === 'rest') {
    workoutTimer.restLeft--;
    if (workoutTimer.restLeft <= 3 && workoutTimer.restLeft > 0) {
      if (workoutTimer.sound) playWarningBeep();
    }
    if (workoutTimer.restLeft <= 0) {
      if (workoutTimer.isAlternating) {
        const plan = workoutData.plans[selectedWorkoutDay];
        const exA = plan?.exercises?.find(x => x.id === workoutTimer.altExA);
        const exB = plan?.exercises?.find(x => x.id === workoutTimer.altExB);
        if (workoutTimer.altActive === 'A' && exB) {
          workoutTimer.altActive = 'B';
          workoutTimer.exerciseId = exB.id;
          workoutTimer.exerciseName = exB.name;
          workoutTimer.targetDuration = exB.duration || 40;
          workoutTimer.timeLeft = exB.duration || 40;
          workoutTimer.restDuration = exB.rest ?? 20;
          workoutTimer.status = 'running';
          if (workoutTimer.sound) playBeep(980, 0.2, 'sine', 0.45);
          showToast(`Set ${workoutTimer.currentSet}: ${exB.name}! Let's go!`);
        } else {
          workoutTimer.altActive = 'A';
          workoutTimer.currentSet++;
          if (exA) {
            workoutTimer.exerciseId = exA.id;
            workoutTimer.exerciseName = exA.name;
            workoutTimer.targetDuration = exA.duration || 40;
            workoutTimer.timeLeft = exA.duration || 40;
            workoutTimer.restDuration = exA.rest ?? 20;
          }
          workoutTimer.status = 'running';
          if (workoutTimer.sound) playBeep(980, 0.2, 'sine', 0.45);
          showToast(`Round ${workoutTimer.currentSet}: ${exA?.name || 'Ex 1'}! Let's go!`);
        }
      } else {
        workoutTimer.currentSet++;
        workoutTimer.timeLeft = workoutTimer.targetDuration;
        workoutTimer.status = 'running';
        if (workoutTimer.sound) playBeep(980, 0.2, 'sine', 0.45);
        showToast(`Set ${workoutTimer.currentSet} begins! Let's go!`);
      }
    }
  }
  updateTimerDisplayOnly();
}

function startWorkoutTimer() {
  getAudioContext();
  if (workoutTimer.status === 'running') return;

  if (workoutTimer.status === 'idle' && workoutTimer.timeLeft <= 0) {
    workoutTimer.timeLeft = workoutTimer.targetDuration;
  }
  workoutTimer.status = 'running';
  clearInterval(workoutTimer.timerInterval);
  workoutTimer.timerInterval = setInterval(tickWorkoutTimer, 1000);
  buzz(HAPTIC.check);
  updateTimerDisplayOnly();
}

function pauseWorkoutTimer() {
  if (workoutTimer.status === 'running' || workoutTimer.status === 'rest') {
    workoutTimer.status = 'paused';
    clearInterval(workoutTimer.timerInterval);
    workoutTimer.timerInterval = null;
    buzz(HAPTIC.tick);
    updateTimerDisplayOnly();
  }
}

function resetWorkoutTimer() {
  clearInterval(workoutTimer.timerInterval);
  workoutTimer.timerInterval = null;
  workoutTimer.status = 'idle';
  workoutTimer.timeLeft = workoutTimer.targetDuration;
  workoutTimer.restLeft = workoutTimer.restDuration;
  buzz(HAPTIC.undo);
  updateTimerDisplayOnly();
}

function skipOrNextSet() {
  if (workoutTimer.isAlternating) {
    const plan = workoutData.plans[selectedWorkoutDay];
    const exA = plan?.exercises?.find(x => x.id === workoutTimer.altExA);
    const exB = plan?.exercises?.find(x => x.id === workoutTimer.altExB);
    if (workoutTimer.altActive === 'A' && exB) {
      workoutTimer.altActive = 'B';
      workoutTimer.exerciseId = exB.id;
      workoutTimer.exerciseName = exB.name;
      workoutTimer.targetDuration = exB.duration || 40;
      workoutTimer.timeLeft = exB.duration || 40;
      workoutTimer.status = 'idle';
      clearInterval(workoutTimer.timerInterval);
      workoutTimer.timerInterval = null;
      buzz(HAPTIC.tick);
      showToast(`Jumped to Ex 2: ${exB.name} (Round ${workoutTimer.currentSet})`);
    } else {
      if (workoutTimer.currentSet < workoutTimer.totalSets) {
        workoutTimer.currentSet++;
        workoutTimer.altActive = 'A';
        if (exA) {
          workoutTimer.exerciseId = exA.id;
          workoutTimer.exerciseName = exA.name;
          workoutTimer.targetDuration = exA.duration || 40;
          workoutTimer.timeLeft = exA.duration || 40;
        }
        workoutTimer.status = 'idle';
        clearInterval(workoutTimer.timerInterval);
        workoutTimer.timerInterval = null;
        buzz(HAPTIC.tick);
        showToast(`Jumped to Round ${workoutTimer.currentSet}: ${exA?.name || 'Ex 1'}`);
      } else {
        showToast('All alternating sets completed!');
      }
    }
  } else {
    if (workoutTimer.currentSet < workoutTimer.totalSets) {
      workoutTimer.currentSet++;
      workoutTimer.timeLeft = workoutTimer.targetDuration;
      workoutTimer.status = 'idle';
      clearInterval(workoutTimer.timerInterval);
      workoutTimer.timerInterval = null;
      buzz(HAPTIC.tick);
      showToast(`Jumped to Set ${workoutTimer.currentSet}`);
    } else {
      // Jump to next exercise
      const dayPlan = workoutData.plans[selectedWorkoutDay];
      if (dayPlan && dayPlan.exercises) {
        const curIdx = dayPlan.exercises.findIndex(x => x.id === workoutTimer.exerciseId);
        if (curIdx >= 0 && curIdx + 1 < dayPlan.exercises.length) {
          loadExerciseIntoTimer(dayPlan.exercises[curIdx + 1], false);
          showToast(`Next exercise: ${dayPlan.exercises[curIdx + 1].name}`);
          return;
        }
      }
      showToast('All sets completed for this exercise');
    }
  }
  updateTimerDisplayOnly();
}

function loadExerciseIntoTimer(ex, autoStart = false) {
  workoutTimer.exerciseId = ex.id;
  workoutTimer.exerciseName = ex.name;
  workoutTimer.totalSets = ex.sets || 3;
  workoutTimer.currentSet = 1;
  workoutTimer.targetDuration = ex.duration || 40;
  workoutTimer.timeLeft = ex.duration || 40;
  workoutTimer.restDuration = ex.rest ?? 20;
  workoutTimer.restLeft = ex.rest ?? 20;
  workoutTimer.status = 'idle';
  clearInterval(workoutTimer.timerInterval);
  workoutTimer.timerInterval = null;
  workoutTimer.mode = 'timer';

  if (workoutTimer.isAlternating) {
    workoutTimer.altExA = ex.id;
    workoutTimer.altActive = 'A';
    const plan = workoutData.plans[selectedWorkoutDay];
    if (plan && plan.exercises) {
      if (!workoutTimer.altExB || workoutTimer.altExB === ex.id) {
        const other = plan.exercises.find(x => x.id !== ex.id);
        if (other) workoutTimer.altExB = other.id;
      }
    }
  }

  if (autoStart) startWorkoutTimer();
  renderWorkout();
  document.getElementById('workoutTimerCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── Stopwatch controls ────────────────────────────────────────────────────────
function startStopwatch() {
  if (workoutTimer.swRunning) return;
  workoutTimer.swRunning = true;
  workoutTimer.swStart = Date.now() - workoutTimer.swElapsed;
  clearInterval(workoutTimer.swInterval);
  workoutTimer.swInterval = setInterval(() => {
    workoutTimer.swElapsed = Date.now() - workoutTimer.swStart;
    updateTimerDisplayOnly();
  }, 100);
  buzz(HAPTIC.tick);
  updateTimerDisplayOnly();
}

function pauseStopwatch() {
  if (!workoutTimer.swRunning) return;
  workoutTimer.swRunning = false;
  clearInterval(workoutTimer.swInterval);
  workoutTimer.swInterval = null;
  buzz(HAPTIC.tick);
  updateTimerDisplayOnly();
}

function resetStopwatch() {
  workoutTimer.swRunning = false;
  clearInterval(workoutTimer.swInterval);
  workoutTimer.swInterval = null;
  workoutTimer.swElapsed = 0;
  workoutTimer.swLaps = [];
  buzz(HAPTIC.undo);
  renderWorkout();
}

function lapStopwatch() {
  if (!workoutTimer.swRunning && workoutTimer.swElapsed === 0) return;
  workoutTimer.swLaps.unshift(workoutTimer.swElapsed);
  buzz(HAPTIC.tick);
  renderWorkout();
}

