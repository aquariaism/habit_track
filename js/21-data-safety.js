// ── DATA SAFETY ────────────────────────────────────────────────────────────────

// EXPORT (v2 — habits + routine + weekend + workout + attendance + game)
document.getElementById('exportBtn').addEventListener('click', () => {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    habits,
    routine: RT.slots,
    weekend: WK.slots,
    workout: workoutData,
    attendance: att,
    game,
    zip: { ...zip, deviceId: undefined },
    prefs
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `habit-tracker-backup-${fmt(today)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Backup saved — ${habits.length} habits, ${RT.slots.length + WK.slots.length} routine blocks, workout plans, ${att.subjects.length} subjects`);
  closeSettings();
});

// IMPORT (accepts v1 habit backups and v2 full backups)
document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

function mergeSlots(target, incoming) {
  let added = 0;
  incoming.forEach(s => {
    if (!s || !s.id || !s.title || !/^\d\d:\d\d$/.test(s.start || '') || !/^\d\d:\d\d$/.test(s.end || '')) return;
    const ex = target.find(x => x.id === s.id);
    if (ex) ex.log = { ...ex.log, ...s.log };
    else { target.push({ ...s, log: s.log || {} }); added++; }
  });
  return added;
}

document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      const incoming = Array.isArray(data) ? data : data.habits;
      if (incoming !== undefined && !Array.isArray(incoming)) throw new Error('Invalid format');
      if (incoming === undefined && !data.routine && !data.weekend && !data.attendance && !data.game && !data.zip) throw new Error('Invalid format');

      let added = 0, updated = 0;
      (incoming || []).forEach(ih => {
        if (!ih.id || !ih.name) throw new Error('Malformed habit entry');
      });
      (incoming || []).forEach(ih => {
        const existing = habits.find(h => h.id === ih.id);
        if (existing) { existing.log = { ...existing.log, ...ih.log }; updated++; }
        else { habits.push(ih); added++; }
      });

      if (!Array.isArray(data)) {
        if (Array.isArray(data.routine)) added += mergeSlots(RT.slots, data.routine);
        if (Array.isArray(data.weekend)) added += mergeSlots(WK.slots, data.weekend);
        if (data.workout && typeof data.workout === 'object') {
          workoutData = cleanWorkoutData(data.workout);
          saveWorkout();
          added++;
        }

        const ia = data.attendance;
        if (ia && Array.isArray(ia.subjects)) {
          if (Number.isFinite(ia.threshold)) att.threshold = Math.min(95, Math.max(50, ia.threshold));
          ia.subjects.forEach(s => {
            if (!s || !s.id || !s.name || !Number.isInteger(s.a) || !Number.isInteger(s.t) || s.a > s.t) return;
            const ex = att.subjects.find(x => x.id === s.id);
            if (!ex) { att.subjects.push({ id: s.id, name: s.name, a: s.a, t: s.t, h: s.h || '', hd: Array.isArray(s.hd) ? s.hd : [], d: (s.d && typeof s.d === 'object') ? s.d : {} }); added++; }
            else if (s.t > ex.t) { ex.a = s.a; ex.t = s.t; ex.h = s.h || ''; ex.hd = Array.isArray(s.hd) ? s.hd : []; ex.d = (s.d && typeof s.d === 'object') ? s.d : ex.d; updated++; }
          });
        }
        const ig = data.game;
        if (ig && typeof ig === 'object') {
          game.points = Math.max(game.points, ig.points || 0);
          game.best = Math.max(game.best, ig.best || 0);
          game.days = { ...(ig.days || {}), ...game.days };
          if (ig.lastWon && (!game.lastWon || ig.lastWon > game.lastWon)) { game.lastWon = ig.lastWon; game.streak = ig.streak || 0; }
        }
        const iz = data.zip;
        if (iz && typeof iz === 'object' && iz.days && typeof iz.days === 'object') {
          Object.entries(iz.days).forEach(([d, r]) => {
            if (r && Number.isFinite(r.ms) && (!zip.days[d] || r.ms < zip.days[d].ms)) { zip.days[d] = { ms: r.ms, sent: !!r.sent }; added++; }
          });
          if (!zip.name && typeof iz.name === 'string' && /^[\p{L}\p{N} _.-]{2,16}$/u.test(iz.name)) zip.name = iz.name;
          if (iz.lastWon && (!zip.lastWon || iz.lastWon > zip.lastWon)) { zip.lastWon = iz.lastWon; zip.streak = iz.streak || 0; }
          zip.best = Math.max(zip.best, iz.best || 0);
          Z.day = null;
        }
      }

      save(); RT.persist(); WK.persist(); saveAtt(); saveGame(); saveZip();
      renderTab(curTab);
      closeSettings();
      showToast(`Import complete — ${added} added, ${updated} updated`);
    } catch (err) {
      showToast('Import failed: invalid backup file', 'error');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

// CLEAR ALL DATA
document.getElementById('clearDataBtn').addEventListener('click', () => {
  closeSettings();
  askConfirm({
    title: 'Clear All Data?',
    text: 'This permanently deletes ALL habits, routines, attendance records, workout plans and game progress. Export a backup first.',
    yes: 'Clear Everything',
    onYes: () => {
      habits = []; RT.slots = []; WK.slots = [];
      workoutData = cleanWorkoutData(null);
      att = { threshold: 75, subjects: [] };
      game = { points: 0, best: 0, streak: 0, lastWon: null, days: {} };
      zip = zipFresh(zip.deviceId); Z.day = null;
      save(); RT.persist(); WK.persist(); saveWorkout(); saveAtt(); saveGame(); saveZip();
      renderTab(curTab);
      showToast('All data cleared');
    }
  });
});


