// ══ ZIP — daily path puzzle + online leaderboard ═══════════════════════════════
// Draw ONE line that starts at 1, visits the numbers in order, and fills every square.
const ZIP_CONFIG = {
  supabaseUrl: 'https://pitlhetodizqnvtucfsk.supabase.co',   // e.g. 'https://abcdxyz.supabase.co'   (leave empty = leaderboard off)
  supabaseAnonKey: 'sb_publishable_KvhzU0SEhBEf8md0x_90gQ_NVmlhgGk',   // the PUBLIC anon / publishable key — safe to keep in this file
  size: 6,               // 6 → 6×6 board
  checkpoints: 7,        // how many numbers appear on the board
  tzOffsetMin: 330       // clock that decides "today" for everyone: 330 = India (UTC+5:30)
};
const zipOnlineReady = () => !!(ZIP_CONFIG.supabaseUrl && ZIP_CONFIG.supabaseAnonKey);

const zipFresh = (deviceId) => ({ deviceId: deviceId || zipNewId(), name: '', days: {}, streak: 0, best: 0, lastWon: null });
function zipNewId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
}
let zip = Object.assign(zipFresh(''), load('ht5_zip', {}));
if (typeof zip.days !== 'object' || !zip.days) zip.days = {};
Object.keys(zip.days).forEach(d => { const r = zip.days[d]; if (!r || !Number.isFinite(r.ms)) delete zip.days[d]; });
if (typeof zip.name !== 'string') zip.name = '';
['streak', 'best'].forEach(k => { if (!Number.isFinite(zip[k])) zip[k] = 0; });
if (!zip.deviceId) zip.deviceId = zipNewId();
const saveZip = () => store('ht5_zip', zip);
saveZip();

// ── dates (one shared clock for everyone) ─────────────────────────────────────
const zipDay = () => new Date(Date.now() + ZIP_CONFIG.tzOffsetMin * 60000).toISOString().slice(0, 10);
const dayShift = (ds, n) => { const [y, m, d] = ds.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const zFmt = ms => `${Math.floor(ms / 60000)}:${p(Math.floor(ms / 1000) % 60)}.${Math.floor(ms % 1000 / 100)}`;

// ── puzzle generator: random Hamiltonian path ("backbite"), same for everyone on a given day ──
function zipPuzzle(ds) {
  const N = ZIP_CONFIG.size, T = N * N, K = ZIP_CONFIG.checkpoints;
  const rnd = mulberry32(dayNumOf(ds) * 104729 + 7);
  let path = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) path.push(r * N + (r % 2 ? N - 1 - c : c));   // start from a snake
  const nbrs = i => {
    const r = Math.floor(i / N), c = i % N, o = [];
    if (r > 0) o.push(i - N); if (r < N - 1) o.push(i + N); if (c > 0) o.push(i - 1); if (c < N - 1) o.push(i + 1); return o;
  };
  for (let it = 0; it < 1500; it++) {
    if (it % 2) path.reverse();
    const end = path[T - 1], prev = path[T - 2], opts = nbrs(end).filter(x => x !== prev);
    const k = path.indexOf(opts[Math.floor(rnd() * opts.length)]);
    path = path.slice(0, k + 1).concat(path.slice(k + 1).reverse());
    if (it % 2) path.reverse();
  }
  const idx = [0];
  for (let i = 1; i < K - 1; i++) {
    const base = Math.round(i * (T - 1) / (K - 1)) + Math.floor(rnd() * 5) - 2;
    idx.push(Math.max(idx[i - 1] + 2, Math.min(base, T - 1 - 2 * (K - 1 - i))));
  }
  idx.push(T - 1);
  const nums = {}; idx.forEach((pi, i) => { nums[path[pi]] = i + 1; });
  return { N, T, nums, max: K, sol: path };
}

// ── game state ────────────────────────────────────────────────────────────────
let Z = { day: null, pz: null, path: [], t0: 0, ms: 0, running: false, playing: false, finished: false, practice: false, dragging: false, editName: false, last: null, finishTimer: null, lb: { state: 'idle', rows: [] } };
function zipInit() {
  const d = zipDay();
  if (Z.day === d && Z.pz) return;
  Z.day = d; Z.pz = zipPuzzle(d); Z.path = []; Z.t0 = 0; Z.ms = 0;
  Z.running = false; Z.playing = false; Z.finished = false; Z.practice = false; Z.dragging = false; Z.last = null;
  Z.lb = { state: 'idle', rows: [] };
}
const zHead = () => Z.path[Z.path.length - 1];
const zNeeded = () => Z.path.filter(c => Z.pz.nums[c]).length + 1;
const zAdj = (a, b) => { const N = Z.pz.N; return Math.abs(Math.floor(a / N) - Math.floor(b / N)) + Math.abs(a % N - b % N) === 1; };

function zCanEnter(c) {
  if (Z.path.includes(c) || !zAdj(zHead(), c)) return false;
  const v = Z.pz.nums[c];
  if (v) { if (v !== zNeeded()) return false; if (v === Z.pz.max && Z.path.length !== Z.pz.T - 1) return false; }
  return true;
}
function zStep(c) {
  const L = Z.path.length;
  if (L >= 2 && c === Z.path[L - 2]) { Z.path.pop(); return true; }   // dragging backwards erases
  if (zCanEnter(c)) { Z.path.push(c); return true; }
  return false;
}
function zMoveTo(target) {            // walks cell-by-cell so fast swipes don't skip squares
  const N = Z.pz.N;
  for (let guard = 0; guard < N && zHead() !== target; guard++) {
    const h = zHead(), hr = Math.floor(h / N), hc = h % N, tr = Math.floor(target / N), tc = target % N;
    let next;
    if (hr === tr) next = h + (tc > hc ? 1 : -1);
    else if (hc === tc) next = h + (tr > hr ? N : -N);
    else break;
    if (!zStep(next)) break;
  }
}
function zDown(c) {
  if (Z.finished) return;
  if (!Z.path.length) { if (Z.pz.nums[c] === 1) Z.path = [c]; return; }   // the line can only start on 1
  const i = Z.path.indexOf(c);
  if (i >= 0) Z.path.length = i + 1;                                       // press an earlier square to rewind to it
}
const zWon = () => Z.path.length === Z.pz.T && Z.pz.nums[zHead()] === Z.pz.max;

// ── play screen: open → timer runs → solved → timer stops, score saved, screen closes ──
function zipPlay(practice) {
  zipInit();
  Z.practice = !!practice; Z.path = []; Z.finished = false; Z.dragging = false; Z.ms = 0;
  Z.t0 = performance.now(); Z.running = true; Z.playing = true;     // the clock starts the moment Play is pressed
  renderZipPlay();
  document.getElementById('zipOverlay').classList.add('open');
  document.documentElement.classList.add('no-scroll');
}
function zipClose() {
  clearTimeout(Z.finishTimer);
  Z.running = false; Z.playing = false; Z.dragging = false;
  document.getElementById('zipOverlay').classList.remove('open');
  document.documentElement.classList.remove('no-scroll');
}
function zFinish() {
  Z.running = false; Z.finished = true; Z.dragging = false;
  Z.ms = Math.round(performance.now() - Z.t0);
  const first = !Z.practice && !zip.days[Z.day];
  if (first) {
    zip.days[Z.day] = { ms: Z.ms, sent: false };
    zip.streak = zip.lastWon === dayShift(Z.day, -1) ? zip.streak + 1 : 1;
    zip.lastWon = Z.day; zip.best = Math.max(zip.best, zip.streak);
    game.points += 30; saveGame(); saveZip();
    showToast(`Solved in ${zFmt(Z.ms)} · +30 points`);
  } else showToast(Z.practice ? `Practice run: ${zFmt(Z.ms)}` : `Solved in ${zFmt(Z.ms)}`, 'info');
  Z.last = { ms: Z.ms, practice: Z.practice, counted: first };
  buzz(HAPTIC.success);
  zDraw();
  Z.finishTimer = setTimeout(() => {                                  // brief pause so the finished line is visible
    zipClose(); renderZip();
    if (first) zipSubmitPending();
  }, 800);
}

// ── online leaderboard (Supabase REST) ────────────────────────────────────────
function zHeaders(extra) {
  const k = ZIP_CONFIG.supabaseAnonKey, h = { apikey: k, 'Content-Type': 'application/json' };
  if (k.startsWith('eyJ')) h.Authorization = 'Bearer ' + k;     // legacy JWT keys; new "publishable" keys go in apikey only
  return Object.assign(h, extra);
}
let zipSending = false;
async function zipSubmitPending() {
  if (zipSending || !zipOnlineReady() || !zip.name || !navigator.onLine) return;
  zipSending = true;
  try {
    for (const [day, r] of Object.entries(zip.days)) {
      if (r.sent) continue;
      if (day < dayShift(zipDay(), -1)) { r.sent = true; continue; }          // too old to be accepted
      try {
        const res = await fetch(`${ZIP_CONFIG.supabaseUrl}/rest/v1/zip_scores`, {
          method: 'POST', headers: zHeaders({ Prefer: 'return=minimal' }),
          body: JSON.stringify({ day, device_id: zip.deviceId, name: zip.name, ms: r.ms })
        });
        if (res.ok || (res.status >= 400 && res.status < 500)) r.sent = true;   // 409 = already there; other 4xx = rejected, don't retry forever
      } catch (e) { break; }                                                    // offline — try again later
    }
    saveZip();
  } finally { zipSending = false; }
  if (curTab === 'games' && gameSub === 'zip') { renderZipExtras(); zipLoadBoard(); }
}
async function zipLoadBoard() {
  if (!zipOnlineReady()) { Z.lb.state = 'off'; renderZipLb(); return; }
  Z.lb.state = 'loading'; renderZipLb();
  try {
    const res = await fetch(`${ZIP_CONFIG.supabaseUrl}/rest/v1/zip_scores?day=eq.${Z.day}&select=name,ms&order=ms.asc,created_at.asc&limit=25`,
      { headers: zHeaders(), cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    Z.lb.rows = await res.json(); Z.lb.state = 'ok';
  } catch (e) { Z.lb.state = navigator.onLine ? 'error' : 'offline'; }
  renderZipLb(); renderZipHero();
}
window.addEventListener('online', () => zipSubmitPending());

// ── rendering ─────────────────────────────────────────────────────────────────
function zipRank() {
  const mine = zip.days[Z.day]; if (!mine || Z.lb.state !== 'ok') return null;
  const i = Z.lb.rows.findIndex(r => r.name === zip.name && r.ms === mine.ms);
  return i >= 0 ? i + 1 : null;
}
function renderZipHero() {
  const el = document.getElementById('zipHero'); if (!el) return;
  const mine = zip.days[Z.day], rk = zipRank();
  const st = (zip.lastWon === Z.day || zip.lastWon === dayShift(Z.day, -1)) ? zip.streak : 0;
  el.innerHTML = `
    ${ghStat('bolt', 'gold', mine ? zFmt(mine.ms) : '—', 'Today')}
    ${ghStat('local_fire_department', 'fire', st, 'Zip streak')}
    ${ghStat('workspace_premium', 'amber', rk ? '#' + rk : '—', 'Rank')}`;
  countUps(el);
}

// Zip tab: stats, Play button, leaderboard
function renderZip() {
  zipInit();
  const root = document.getElementById('gZip'), N = Z.pz.N, mine = zip.days[Z.day];
  root.innerHTML = `
    <div class="game-hero" id="zipHero"></div>
    <div class="game-card zip-card${mine ? ' solved' : ''}">
      <div class="gc-top"><span class="gc-chip">Zip · ${N}×${N}</span><span class="gc-chip">${mine ? ic('check') + 'Solved today' : 'Daily puzzle'}</span></div>
      <p class="gc-q">${mine ? 'Nice work today!' : 'Connect the numbers in order'}</p>
      <p class="gc-sub">Draw one line from 1 through every number, filling every square. The timer starts when you press Play and stops the moment you finish.</p>
      <div class="zip-actions"><button class="btn-save zip-play" data-z="${mine ? 'practice' : 'play'}">${mine ? 'Practice (not scored)' : '▶  Play'}</button></div>
      <div id="zipExtras"></div>
    </div>
    <div class="sec-lbl hist-lbl">Today’s leaderboard</div>
    <div class="zip-lb" id="zipLb"></div>`;
  renderZipHero(); renderZipExtras(); renderZipLb();
  if (zipOnlineReady() && Z.lb.state === 'idle') { zipSubmitPending(); zipLoadBoard(); }
}
function renderZipExtras() {
  const el = document.getElementById('zipExtras'); if (!el) return;
  const mine = zip.days[Z.day];
  let h = '';
  if (mine) h += `<div class="gc-result win"><b>Solved in ${zFmt(mine.ms)}</b><span>Your time for today is locked in</span></div>
                 <div class="gc-next">New puzzle in <b id="zipCount">--:--:--</b></div>`;
  if (Z.last && Z.last.practice) h += `<p class="gc-sub">Last practice run: ${zFmt(Z.last.ms)}</p>`;
  if (zipOnlineReady()) {
    if ((!zip.name && mine) || Z.editName) {
      h += `<div class="zip-name"><p class="gc-sub">${zip.name ? 'Change your display name' : 'Pick a name for the leaderboard'}</p>
        <div class="game-form"><input class="modal-input" id="zipNameIn" maxlength="16" autocomplete="off" placeholder="2–16 letters or numbers" value="${esc(zip.name)}"><button class="btn-save" data-z="name">Save</button></div>
        <div class="modal-err" id="zipNameErr"></div></div>`;
    } else if (zip.name) {
      h += `<p class="gc-sub zip-who">Playing as <b>${esc(zip.name)}</b> · <a href="#" data-z="rename">change</a></p>`;
    }
    if (mine && !mine.sent) h += `<p class="gc-sub">${zip.name ? 'Score saved on this phone — it uploads as soon as you’re online.' : 'Score saved on this phone — add a name to post it.'}</p>`;
  }
  el.innerHTML = h;
  zipTick();
}
function renderZipLb() {
  const el = document.getElementById('zipLb'); if (!el) return;
  const s = Z.lb.state, mine = zip.days[Z.day];
  let h;
  if (!zipOnlineReady()) h = `<div class="zip-lb-msg">The online leaderboard isn’t switched on yet.</div>`;
  else if (s === 'idle' || s === 'loading') h = `<div class="zip-lb-msg">Loading scores…</div>`;
  else if (s === 'offline') h = `<div class="zip-lb-msg">You’re offline — the leaderboard needs internet.<br><button class="chip-btn" data-z="refresh">Try again</button></div>`;
  else if (s === 'error') h = `<div class="zip-lb-msg">Couldn’t load scores right now.<br><button class="chip-btn" data-z="refresh">Try again</button></div>`;
  else if (!Z.lb.rows.length) h = `<div class="zip-lb-msg">No scores yet today — be the first!</div>`;
  else h = Z.lb.rows.map((r, i) => {
    const me = mine && r.name === zip.name && r.ms === mine.ms;
    return `<div class="lb-row${me ? ' me' : ''}"><span class="lb-rk">${(i < 3 ? ic('workspace_premium', null, 'medal m' + (i + 1)) : '') || i + 1}</span><span class="lb-nm"><span class="lb-name">${esc(r.name)}</span>${me ? '<em>you</em>' : ''}</span><span class="lb-ms">${zFmt(r.ms)}</span></div>`;
  }).join('') + `<div class="zip-lb-foot"><button class="chip-btn" data-z="refresh">Refresh</button></div>`;
  el.innerHTML = h;
}

// Full-screen play screen
function renderZipPlay() {
  const ov = document.getElementById('zipOverlay'), pz = Z.pz, N = pz.N;
  const cells = Array.from({ length: pz.T }, (_, i) => `<div class="zc" data-i="${i}">${pz.nums[i] ? `<span class="zn">${pz.nums[i]}</span>` : ''}</div>`).join('');
  ov.innerHTML = `
    <div class="zp-top">
      <button class="zp-close" data-z="close" aria-label="Quit this run"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <span class="gc-chip">Zip · ${N}×${N}${Z.practice ? ' · practice' : ''}</span>
      <span class="zip-timer" id="zipTimer">0:00.0</span>
    </div>
    <p class="zip-help" id="zipHelp"></p>
    <div class="zp-stage"><div class="zip-board" id="zipBoard" style="--n:${N}">${cells}<svg viewBox="0 0 ${N} ${N}" aria-hidden="true"><polyline points="" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>
    <div class="zip-actions">
      <button class="btn-cancel" data-z="restart">Restart line</button>
      <button class="btn-cancel" data-z="undo">Undo step</button>
    </div>`;
  zDraw();
}
function zDraw() {
  Z.nHit = Z.path.filter(c => Z.pz.nums[c]).length;
  const board = document.getElementById('zipBoard'); if (!board) return;
  const N = Z.pz.N, inPath = new Set(Z.path), h = zHead();
  board.querySelectorAll('.zc').forEach(el => {
    const i = +el.dataset.i;
    el.classList.toggle('on', inPath.has(i));
    el.classList.toggle('head', i === h && !Z.finished);
    el.querySelector('.zn')?.classList.toggle('hit', inPath.has(i));
  });
  board.querySelector('polyline').setAttribute('points', Z.path.map(i => `${i % N + .5},${Math.floor(i / N) + .5}`).join(' '));
  const help = document.getElementById('zipHelp');
  if (help) help.textContent = Z.finished ? `✓ Solved in ${zFmt(Z.ms)}`
    : !Z.path.length ? 'Press on 1, then drag through the numbers in order. Fill every square.'
      : `Next: ${zNeeded()} · ${Z.pz.T - Z.path.length} squares left`;
  const t = document.getElementById('zipTimer'); if (t && Z.finished) t.textContent = zFmt(Z.ms);
}

// countdown to the next puzzle (uses the shared clock, not the phone's midnight)
function zipTick() {
  const now = Date.now(), off = ZIP_CONFIG.tzOffsetMin * 60000;
  if (Z.day && zipDay() !== Z.day && curTab === 'games' && gameSub === 'zip' && !Z.playing) { renderZip(); return; }
  const el = document.getElementById('zipCount'); if (!el) return;
  const s = Math.max(0, Math.floor(((Math.floor((now + off) / 864e5) + 1) * 864e5 - off - now) / 1000));
  el.textContent = `${p(Math.floor(s / 3600))}:${p(Math.floor(s % 3600 / 60))}:${p(s % 60)}`;
}
setInterval(zipTick, 1000);

// live timer
setInterval(() => {
  if (!Z.running) return;
  const t = document.getElementById('zipTimer'); if (t) t.textContent = zFmt(performance.now() - Z.t0);
}, 100);

// ── input ─────────────────────────────────────────────────────────────────────
function zCellAt(board, e) {
  const r = board.getBoundingClientRect(), N = Z.pz.N;
  const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
  if (!(x >= 0 && y >= 0 && x < 1 && y < 1)) return -1;
  return Math.floor(y * N) * N + Math.floor(x * N);
}
function zAfter() {
  const k = Z.path.filter(c => Z.pz.nums[c]).length;
  if (k > (Z.nHit || 0)) buzz(HAPTIC.tick);          // light tick each time you reach a number
  zDraw(); if (!Z.finished && zWon()) zFinish();
}

// play screen: draw with finger / mouse (the screen can't scroll, so touches are never "stolen")
function zipBindPlay() {
  const ov = document.getElementById('zipOverlay');
  ov.addEventListener('pointerdown', e => {
    const b = e.target.closest('#zipBoard'); if (!b || Z.finished) return;
    const c = zCellAt(b, e); if (c < 0) return;
    e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId);
    Z.dragging = true; zDown(c); zAfter();
  });
  ov.addEventListener('pointermove', e => {
    if (!Z.dragging || Z.finished || !Z.path.length) return;
    const b = document.getElementById('zipBoard'); if (!b) return;
    const c = zCellAt(b, e); if (c < 0) return;
    zMoveTo(c); zAfter();
  });
  const stop = () => { Z.dragging = false; };
  ov.addEventListener('pointerup', stop); ov.addEventListener('pointercancel', stop);
  ov.addEventListener('click', e => {
    const b = e.target.closest('[data-z]'); if (!b) return;
    if (b.dataset.z === 'close') zipClose();
    else if (b.dataset.z === 'restart' && !Z.finished) { Z.path = []; zDraw(); }     // the clock keeps running
    else if (b.dataset.z === 'undo' && !Z.finished && Z.path.length > 1) { Z.path.pop(); zDraw(); }
  });
}
zipBindPlay();

// Zip tab buttons
function zipBind() {
  const g = document.getElementById('gZip');
  g.addEventListener('click', e => {
    const b = e.target.closest('[data-z]'); if (!b) return;
    e.preventDefault();
    switch (b.dataset.z) {
      case 'play': zipPlay(false); break;
      case 'practice': zipPlay(true); break;
      case 'refresh': zipLoadBoard(); break;
      case 'rename': Z.editName = true; renderZipExtras(); document.getElementById('zipNameIn')?.focus(); break;
      case 'name': {
        const v = document.getElementById('zipNameIn').value.trim(), err = document.getElementById('zipNameErr');
        if (!/^[\p{L}\p{N} _.-]{2,16}$/u.test(v)) { err.textContent = 'Use 2–16 letters, numbers, spaces, _ . or -'; return; }
        zip.name = v; saveZip(); Z.editName = false; renderZipExtras(); zipSubmitPending(); break;
      }
    }
  });
  g.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'zipNameIn') g.querySelector('[data-z=name]').click(); });
}

