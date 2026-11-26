// ══ ATTENDANCE ════════════════════════════════════════════════════════════════
let att = (() => {
  const a = load('ht5_attendance', null);
  if (!a || !Array.isArray(a.subjects)) return { threshold: 75, subjects: [] };
  a.subjects = a.subjects.filter(s => s && s.id && typeof s.name === 'string' && Number.isInteger(s.a) && Number.isInteger(s.t) && s.a >= 0 && s.a <= s.t)
    .map(s => {
      const h = typeof s.h === 'string' ? s.h : '';
      let hd = Array.isArray(s.hd) ? s.hd.slice(-h.length || 0) : [];
      if (hd.length < h.length) hd = Array(h.length - hd.length).fill(null).concat(hd);   // keep dates aligned with the P/A history
      const d = {};
      if (s.d && typeof s.d === 'object') Object.keys(s.d).forEach(k => {
        const r = s.d[k], pp = r && r.p | 0, aa = r && r.a | 0;
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && pp >= 0 && aa >= 0 && pp + aa > 0) d[k] = { p: pp, a: aa };
      });
      return { ...s, h, hd, d };
    });
  a.threshold = Number.isFinite(a.threshold) ? Math.min(95, Math.max(50, a.threshold)) : 75;
  return a;
})();
const saveAtt = () => store('ht5_attendance', att);
const pctTxt = v => { const f = Math.floor(v * 10) / 10; return (Number.isInteger(f) ? f : f.toFixed(1)) + '%'; };
const attOk = (a, t, T) => t > 0 && a * 100 >= T * t;
let attJustAdded = null, attBump = null;

function attTip(s, T) {
  if (!s.t) return 'Log your first class to start tracking.';
  if (attOk(s.a, s.t, T)) {
    const m = Math.floor((s.a * 100 - T * s.t) / T);
    return m > 0 ? `You can miss ${m} more class${m > 1 ? 'es' : ''} and stay above ${T}%.` : `Right at the line — don’t miss the next class.`;
  }
  const n = Math.ceil((T * s.t - 100 * s.a) / (100 - T));
  return `Attend the next ${n} class${n > 1 ? 'es' : ''} in a row to reach ${T}%.`;
}

function renderAttendance() {
  const root = document.getElementById('view-attendance'), T = att.threshold;
  const A = att.subjects.reduce((m, s) => m + s.a, 0), TT = att.subjects.reduce((m, s) => m + s.t, 0);
  const overall = TT ? A / TT * 100 : 0;
  const safe = att.subjects.filter(s => attOk(s.a, s.t, T)).length;
  const risk = att.subjects.filter(s => s.t > 0 && !attOk(s.a, s.t, T)).length;

  const cards = att.subjects.map(s => {
    const has = s.t > 0, ok = attOk(s.a, s.t, T), v = has ? s.a / s.t * 100 : 0;
    const col = COLORS[[...s.name].reduce((h, c) => h + c.charCodeAt(0), 0) % COLORS.length];
    return `<div class="att-card${has && !ok ? ' low' : ''}${s.id === attJustAdded ? ' enter' : ''}" data-id="${s.id}" style="--hc:${col}">
      <div class="att-top">
        <div class="habit-icon att-ico" style="background:${hexA(col, .22)};color:${col}">${esc(s.name.trim().charAt(0).toUpperCase())}</div>
        <div class="att-mid"><div class="att-name">${esc(s.name)}</div><div class="att-count">${s.a} / ${s.t} classes attended</div></div>
        <span class="att-badge ${!has ? 'na' : ok ? 'ok' : 'bad'}${s.id === attBump ? ' bump' : ''}">${has ? pctTxt(v) : '—'}</span>
        <div class="habit-menu-btn" data-act="menu" role="button" aria-label="More">${ic('more_horiz')}</div>
      </div>
      <div class="att-bar"><div class="att-fill" style="width:${Math.min(100, v)}%"></div><i class="att-mark" style="left:${T}%"></i></div>
      <div class="att-tip">${attTip(s, T)}</div>
      <div class="att-actions">
        <button class="att-btn present" data-act="p">+ Present</button>
        <button class="att-btn absent"  data-act="a">+ Absent</button>
        <button class="att-undo" data-act="u" aria-label="Undo last entry" ${s.h ? '' : 'disabled'}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg></button>
      </div>
    </div>`;
  }).join('');

  root.innerHTML = `
    <div class="today-banner att-banner">
      <div class="tb-left">
        <div class="tb-label">Overall attendance</div>
        <div class="tb-count">${TT ? pctTxt(overall) : '—'} <span>${A} / ${TT} classes</span></div>
        <div class="tb-bar-wrap att-bar-wrap"><div class="tb-bar" style="width:${Math.min(100, overall)}%;background:${TT && !attOk(A, TT, T) ? 'var(--danger)' : 'var(--success)'}"></div><i class="att-mark" style="left:${T}%"></i></div>
      </div>
      <div class="thr">
        <div class="tb-label">Safe level</div>
        <div class="thr-ctl"><button data-act="thr-" aria-label="Lower safe level">−</button><b>${T}%</b><button data-act="thr+" aria-label="Raise safe level">+</button></div>
      </div>
    </div>
    ${att.subjects.length ? `<div class="stat-chips"><span class="s-chip ok">${ic('check')}${safe} on track</span><span class="s-chip ${risk ? 'bad' : ''}">${ic('warning')}${risk} below ${T}%</span></div>` : ''}
    <div class="add-wrap"><button class="add-btn" data-act="add"><span class="add-plus">+</span> Add Subject</button></div>
    <div class="att-list">${cards || `<div class="empty"><div class="empty-icon">${ic('school')}</div><p>No subjects yet.<br>Add your courses to track attendance.</p></div>`}</div>`;
  attJustAdded = null; attBump = null;
}

document.getElementById('view-attendance').addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const id = el.closest('.att-card')?.dataset.id, s = att.subjects.find(x => x.id === id);
  switch (el.dataset.act) {
    case 'add': openSubj(null); break;
    case 'thr-': buzz(HAPTIC.tick); att.threshold = Math.max(50, att.threshold - 5); saveAtt(); renderAttendance(); break;
    case 'thr+': buzz(HAPTIC.tick); att.threshold = Math.min(95, att.threshold + 5); saveAtt(); renderAttendance(); break;
    case 'p': case 'a':
      if (!s) break;
      s.t++; if (el.dataset.act === 'p') s.a++;
      buzz(el.dataset.act === 'p' ? HAPTIC.check : HAPTIC.warn);
      s.h = ((s.h || '') + (el.dataset.act === 'p' ? 'P' : 'A')).slice(-50);
      s.hd = [...(s.hd || []), todayStr].slice(-50);
      { const r = s.d[todayStr] || (s.d[todayStr] = { p: 0, a: 0 }); r[el.dataset.act === 'p' ? 'p' : 'a']++; }   // remember the day for the calendar
      saveAtt(); attBump = id; renderAttendance(); break;
    case 'u':
      if (!s || !s.h) break;
      {
        const wasP = s.h.slice(-1) === 'P', ds = (s.hd || []).slice(-1)[0], r = ds && s.d[ds];
        if (r) { r[wasP ? 'p' : 'a'] = Math.max(0, r[wasP ? 'p' : 'a'] - 1); if (!r.p && !r.a) delete s.d[ds]; }
        s.hd = (s.hd || []).slice(0, -1);
      }
      if (s.h.slice(-1) === 'P') s.a--; s.t--; s.h = s.h.slice(0, -1);
      saveAtt(); attBump = id; renderAttendance(); showToast('Last entry undone', 'info'); buzz(HAPTIC.undo); break;
    case 'menu':
      e.stopPropagation();
      popMenu(el, [
        { label: `${ic('calendar_month')}Calendar`, fn: () => openAttCal(id, el) },
        { label: `${ic('edit')}Edit`, fn: () => openSubj(id) },
        {
          label: `${ic('delete')}Delete`, danger: true, fn: () => askConfirm({
            title: 'Delete subject?', text: `“${s.name}” and its attendance record will be removed.`,
            onYes: () => { att.subjects = att.subjects.filter(x => x.id !== id); saveAtt(); renderAttendance(); }
          })
        }
      ]);
      break;
  }
});

// subject sheet
const subjOv = document.getElementById('subjOverlay'), subjName = document.getElementById('subjName'),
  subjA = document.getElementById('subjA'), subjT = document.getElementById('subjT'), subjErr = document.getElementById('subjErr');
let subjEditId = null;
function openSubj(id) {
  subjEditId = id;
  const s = id ? att.subjects.find(x => x.id === id) : null;
  document.getElementById('subjTitle').textContent = s ? 'Edit Subject' : 'New Subject';
  subjName.value = s?.name || ''; subjA.value = s ? s.a : 0; subjT.value = s ? s.t : 0; subjErr.textContent = '';
  subjOv.classList.add('open'); setTimeout(() => subjName.focus(), 300);
}
function closeSubj() { subjOv.classList.remove('open'); subjEditId = null; }
document.getElementById('subjCancel').addEventListener('click', closeSubj);
subjOv.addEventListener('click', e => { if (e.target === subjOv) closeSubj(); });
document.getElementById('subjSave').addEventListener('click', () => {
  const name = subjName.value.trim(), a = parseInt(subjA.value, 10), t = parseInt(subjT.value, 10);
  if (!name) { subjErr.textContent = 'Enter a subject name.'; return; }
  if (!Number.isInteger(a) || !Number.isInteger(t) || a < 0 || t < 0) { subjErr.textContent = 'Class counts must be whole numbers, 0 or more.'; return; }
  if (a > t) { subjErr.textContent = 'Attended classes can’t exceed total classes.'; return; }
  if (subjEditId) {
    const s = att.subjects.find(x => x.id === subjEditId);
    if (s) {
      if (s.a !== a || s.t !== t) {
        s.h = ''; s.hd = [];
        const dd = Object.values(s.d || {}), sp = dd.reduce((m, r) => m + r.p, 0), st = dd.reduce((m, r) => m + r.p + r.a, 0);
        if (a < sp || t < st) s.d = {};                         // totals dropped below the dated records → they'd contradict
      }
      s.name = name; s.a = a; s.t = t;
    }
  } else {
    const id = uid(); att.subjects.push({ id, name, a, t, h: '', hd: [], d: {} }); attJustAdded = id;
  }
  saveAtt(); renderAttendance(); closeSubj();
});
subjName.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('subjSave').click(); });

