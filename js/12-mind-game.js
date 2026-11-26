// ══ DAILY MIND GAME ═══════════════════════════════════════════════════════════
let game = Object.assign({ points: 0, best: 0, streak: 0, lastWon: null, days: {} }, load('ht5_game', {}));
if (typeof game.days !== 'object' || !game.days) game.days = {};
['points', 'best', 'streak'].forEach(k => { if (!Number.isFinite(game[k])) game[k] = 0; });
const saveGame = () => store('ht5_game', game);

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function dayNumOf(ds) { const [y, m, d] = ds.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 864e5); }

const TECH_WORDS = [
  ['COMPILER', 'Translates source code into machine code'], ['VARIABLE', 'A named container for a value'],
  ['FUNCTION', 'A reusable block of code you can call'], ['RECURSION', 'When a function calls itself'],
  ['ALGORITHM', 'A step-by-step procedure to solve a problem'], ['DATABASE', 'An organised collection of stored data'],
  ['BOOLEAN', 'A value that is only true or false'], ['POINTER', 'Holds the memory address of another value'],
  ['ITERATOR', 'Walks through the items of a collection'], ['INTERFACE', 'A contract describing what a type can do'],
  ['FRAMEWORK', 'Reusable scaffolding for building apps'], ['REPOSITORY', 'Where a project’s code and history live'],
  ['ENCRYPTION', 'Scrambling data so only key holders can read it'], ['BANDWIDTH', 'Maximum data a connection can carry per second'],
  ['CACHE', 'Fast storage for recently used data'], ['DEBUGGER', 'A tool for stepping through code to find bugs'],
  ['SYNTAX', 'The grammar rules of a programming language'], ['PROTOCOL', 'Agreed rules for how systems communicate'],
  ['KERNEL', 'The core of an operating system'], ['LATENCY', 'The delay before a data transfer begins'],
  ['MIDDLEWARE', 'Software that sits between other layers'], ['OVERFLOW', 'A value too big for its storage'],
  ['INHERITANCE', 'A class gaining traits from a parent class'], ['THREAD', 'Smallest unit of execution in a process'],
  ['SOCKET', 'Endpoint for network communication'], ['QUEUE', 'First in, first out data structure'],
  ['COMPONENT', 'A self-contained, reusable piece of a UI'], ['BINARY', 'The base-2 number system'],
  ['HASHMAP', 'Key-value store with near-instant lookups'], ['DEPLOYMENT', 'Releasing software to its users']
];
const CODE_BANK = [
  { q: 'What does this print?', code: 'console.log(0.1 + 0.2 === 0.3)', o: ['true', 'false', 'undefined', 'NaN'], a: 1, why: 'Floating-point rounding makes 0.1 + 0.2 equal 0.30000000000000004.' },
  { q: 'What does this print?', code: 'console.log(typeof null)', o: ['"null"', '"undefined"', '"object"', '"number"'], a: 2, why: 'A famous JavaScript quirk: typeof null is "object".' },
  { q: 'What does this print?', code: 'print(len(set([1, 2, 2, 3, 3, 3])))', o: ['6', '3', '2', '1'], a: 1, why: 'A set keeps only unique values: {1, 2, 3}.' },
  { q: 'What does this print?', code: 'console.log([1,2,3].map(x => x*2).filter(x => x>2).length)', o: ['1', '2', '3', '6'], a: 1, why: 'map gives [2,4,6]; filter keeps [4,6]; length is 2.' },
  { q: 'What is binary 1011 in decimal?', code: '1011₂ = ?', o: ['9', '10', '11', '13'], a: 2, why: '8 + 0 + 2 + 1 = 11.' },
  { q: 'What does this print?', code: 'print("ab" * 3)', o: ['ab3', 'ababab', 'abbbb', 'Error'], a: 1, why: 'Python repeats a string when you multiply it by an integer.' },
  { q: 'What does this print?', code: 'console.log("5" + 3, "5" - 3)', o: ['8 2', '53 2', '53 53', '8 8'], a: 1, why: '+ concatenates with a string ("53"), while − forces numbers (2).' },
  { q: 'Binary search on a sorted list of 1024 items needs about how many steps?', code: 'n = 1024', o: ['10', '32', '512', '1024'], a: 0, why: 'Each step halves the range, and log₂(1024) = 10.' },
  { q: 'What does this print?', code: 'a = [1, 2, 3]\nb = a\nb.append(4)\nprint(len(a))', o: ['3', '4', '7', 'Error'], a: 1, why: 'b and a point to the same list, so appending through b changes a.' },
  { q: 'Which item is on top of the stack at the end?', code: 'push 1, push 2, push 3\npop\npush 4\npop', o: ['1', '2', '3', '4'], a: 1, why: '[1,2,3] → pop → [1,2] → push 4 → [1,2,4] → pop → [1,2]. Top is 2.' },
  { q: 'What does this print?', code: 'console.log([] + [])', o: ['0', '"[]"', '"" (empty string)', 'undefined'], a: 2, why: 'Both arrays convert to empty strings, and "" + "" is "".' },
  { q: 'Which item is at the front of the queue at the end?', code: 'enqueue A, B, C\ndequeue\nenqueue D\ndequeue', o: ['A', 'B', 'C', 'D'], a: 2, why: '[A,B,C] → [B,C] → [B,C,D] → [C,D]. Front is C.' },
  { q: 'What does this print?', code: 'print(10 // 3, 10 % 3)', o: ['3 1', '3.33 1', '3 3', '1 3'], a: 0, why: '// is integer division (3) and % is the remainder (1).' },
  { q: 'What does this print?', code: 'console.log(Boolean("false"))', o: ['true', 'false', '"false"', 'Error'], a: 0, why: 'Any non-empty string is truthy, even the text "false".' }
];

function getPuzzle(ds) {
  const n = dayNumOf(ds), rnd = mulberry32(n * 7919 + 13), kind = n % 3, cyc = Math.floor(n / 3);
  const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

  if (kind === 0) {
    const gens = [
      () => { const a = ri(1, 15), d = ri(2, 9); return { s: Array.from({ length: 7 }, (_, i) => a + d * i), hint: 'Look at the gap between neighbouring numbers.', why: `Add ${d} each time.` }; },
      () => { const a = ri(1, 4), r = ri(2, 3); return { s: Array.from({ length: 6 }, (_, i) => a * r ** i), hint: 'Each term is a multiple of the one before it.', why: `Multiply by ${r} each time.` }; },
      () => { const k = ri(0, 8); return { s: Array.from({ length: 7 }, (_, i) => (i + 1) ** 2 + k), hint: 'Think about perfect squares.', why: k ? `Each term is n² + ${k}.` : 'Each term is a perfect square.' }; },
      () => { const a = ri(1, 3), b = ri(2, 5), s = [a, b]; while (s.length < 7) s.push(s[s.length - 1] + s[s.length - 2]); return { s, hint: 'Each number depends on the two before it.', why: 'Each term is the sum of the previous two.' }; },
      () => { const a = ri(2, 6), b = a + ri(1, 3), s = [ri(1, 5)]; while (s.length < 7) s.push(s[s.length - 1] + (s.length % 2 ? a : b)); return { s, hint: 'The gap alternates between two values.', why: `Alternately add ${a} and ${b}.` }; },
      () => { const s0 = ri(1, 5), k = ri(1, 3); return { s: Array.from({ length: 7 }, (_, i) => s0 + k * i * (i + 1) / 2), hint: 'The gaps themselves follow a pattern.', why: `The gap grows by ${k} each step.` }; }
    ];
    const g = gens[ri(0, gens.length - 1)]();
    return { kind: 'seq', label: 'Number sequence', max: 3, terms: g.s.slice(0, -1), answer: String(g.s[g.s.length - 1]), hint: g.hint, why: g.why };
  }
  if (kind === 1) {
    const [w, c] = TECH_WORDS[cyc % TECH_WORDS.length];
    let letters, tries = 0;
    do { letters = w.split(''); for (let i = letters.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));[letters[i], letters[j]] = [letters[j], letters[i]]; } } while (letters.join('') === w && ++tries < 10);
    return { kind: 'word', label: 'Tech word scramble', max: 3, letters, clue: c, answer: w, hint: `It starts with “${w[0]}”.`, why: `${w[0] + w.slice(1).toLowerCase()} — ${c.charAt(0).toLowerCase() + c.slice(1)}.` };
  }
  const b = CODE_BANK[cyc % CODE_BANK.length];
  const order = b.o.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));[order[i], order[j]] = [order[j], order[i]]; }
  return { kind: 'mc', label: 'Code & logic', max: 2, q: b.q, code: b.code, options: order.map(i => b.o[i]), answer: String(order.indexOf(b.a)), hint: 'Trace it one line at a time.', why: b.why };
}

const gameStreak = () => (game.lastWon === todayStr || game.lastWon === fmt(addDays(today, -1))) ? game.streak : 0;

function renderGame() {
  const root = document.getElementById('gMind'), pz = getPuzzle(todayStr);
  const rec = game.days[todayStr] || { t: 0, s: false, o: false, g: [], p: 0 };
  const st = gameStreak();
  const miss = rec.t > 0 && !rec.o;

  let body = '';
  if (pz.kind === 'seq') {
    body = `<p class="gc-q">What number comes next?</p><div class="tiles">${pz.terms.map(n => `<div class="tile">${n}</div>`).join('')}<div class="tile q">?</div></div>`;
  } else if (pz.kind === 'word') {
    body = `<p class="gc-q">Unscramble this tech term</p><div class="tiles">${pz.letters.map(l => `<div class="tile">${l}</div>`).join('')}</div>
            <p class="gc-sub">${pz.letters.length} letters · ${esc(pz.clue)}</p>`;
  } else {
    body = `<p class="gc-q">${esc(pz.q)}</p><pre class="code">${esc(pz.code)}</pre>`;
  }

  const wrongTxt = rec.g.filter(g => g !== pz.answer);
  let play = '';
  if (pz.kind === 'mc') {
    play = `<div class="mc-list">${pz.options.map((o, i) => {
      const tried = rec.g.includes(String(i)), right = rec.o && String(i) === pz.answer;
      return `<button class="mc-opt${tried && String(i) !== pz.answer ? ' wrong' : ''}${right ? ' right' : ''}" data-i="${i}" ${rec.o || tried ? 'disabled' : ''}>${esc(o)}</button>`;
    }).join('')}</div>`;
  } else if (!rec.o) {
    play = `${wrongTxt.length ? `<div class="guess-chips">${wrongTxt.map(g => `<span>${esc(g)}</span>`).join('')}</div>` : ''}
      <div class="game-form">
        <input class="modal-input" id="gIn" autocomplete="off" autocapitalize="characters" spellcheck="false" ${pz.kind === 'seq' ? 'inputmode="numeric"' : ''} placeholder="${pz.kind === 'seq' ? 'Your answer' : 'Type the word'}">
        <button class="btn-save" id="gGo">Check</button>
      </div>`;
  }

  const ansTxt = pz.kind === 'mc' ? pz.options[+pz.answer] : pz.answer;
  let result = '';
  if (rec.o) {
    result = rec.s
      ? `<div class="gc-result win"><b>Solved in ${rec.t} ${rec.t > 1 ? 'tries' : 'try'}</b><span>+${rec.p} discipline points</span></div>`
      : `<div class="gc-result lose"><b>Out of tries</b><span>The answer was ${esc(ansTxt)}</span></div>`;
    result += `<p class="gc-why">${esc(pz.why)}</p><div class="gc-next">Next puzzle in <b id="gcCount">--:--:--</b></div>`;
  } else if (miss) {
    result = `<div class="gc-hint">${ic('lightbulb')}${esc(pz.hint)}</div>`;
  }

  const hist = Array.from({ length: 14 }, (_, i) => {
    const ds = fmt(addDays(today, i - 13)), r = game.days[ds];
    return `<i class="gh-dot${r?.s ? ' won' : r?.o ? ' lost' : ''}${ds === todayStr ? ' now' : ''}" title="${ds}"></i>`;
  }).join('');

  root.innerHTML = `
    <div class="game-hero">
      ${ghStat('local_fire_department', 'fire', st, 'Day streak')}
      ${ghStat('star', 'gold', game.points, 'Discipline points')}
      ${ghStat('emoji_events', 'amber', game.best, 'Best streak')}
    </div>
    ${st > 0 && !rec.s ? `<div class="hint-chip"><span class="hc-ico">${ic('local_fire_department', null, 'fire')}</span><div><b>Keep your ${st}-day streak alive</b><small>Solve today’s puzzle before midnight</small></div></div>` : ''}
    <div class="game-card${rec.s ? ' solved' : ''}">
      <div class="gc-top"><span class="gc-chip">${pz.label}</span>
        <div class="gc-tries" aria-label="${pz.max - rec.t} tries left">${Array.from({ length: pz.max }, (_, i) => `<i class="${i < rec.t ? (rec.s && i === rec.t - 1 ? 'win' : 'used') : ''}"></i>`).join('')}</div></div>
      ${body}${play}${result}
    </div>
    <div class="sec-lbl hist-lbl">Last 14 days</div>
    <div class="game-hist">${hist}</div>`;
  countUps(root);
  tickCountdown();
}

function tickCountdown() {
  const el = document.getElementById('gcCount'); if (!el) return;
  const n = new Date(), mid = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  const s = Math.max(0, Math.floor((mid - n) / 1000));
  el.textContent = `${p(Math.floor(s / 3600))}:${p(Math.floor(s % 3600 / 60))}:${p(s % 60)}`;
}
setInterval(tickCountdown, 1000);

function submitGuess(raw) {
  const pz = getPuzzle(todayStr);
  const rec = game.days[todayStr] || (game.days[todayStr] = { t: 0, s: false, o: false, g: [], p: 0 });
  if (rec.o) return;
  let guess = String(raw).trim();
  if (pz.kind === 'seq') { if (guess === '' || isNaN(Number(guess))) { showToast('Enter a number', 'error'); return; } guess = String(Number(guess)); }
  else if (pz.kind === 'word') { guess = guess.toUpperCase().replace(/[^A-Z]/g, ''); if (!guess) { showToast('Type a word', 'error'); return; } }
  if (rec.g.includes(guess)) { showToast('You already tried that', 'info'); return; }

  rec.g.push(guess); rec.t++;
  const ok = guess === pz.answer;
  if (ok) {
    rec.s = true; rec.o = true; rec.p = ({ 1: 30, 2: 20, 3: 10 })[rec.t] || 10;
    game.points += rec.p;
    if (game.lastWon !== todayStr) {
      game.streak = game.lastWon === fmt(addDays(today, -1)) ? game.streak + 1 : 1;
      game.lastWon = todayStr;
    }
    game.best = Math.max(game.best, game.streak);
  } else if (rec.t >= pz.max) { rec.o = true; }
  saveGame(); renderGame();

  const card = document.querySelector('#view-games .game-card');
  if (ok) { showToast(`Correct! +${rec.p} points`); buzz(HAPTIC.success); }
  else {
    buzz(HAPTIC.warn);
    card?.classList.add('shake'); setTimeout(() => card?.classList.remove('shake'), 450);
    if (!rec.o) document.getElementById('gIn')?.focus();
  }
}
document.getElementById('view-games').addEventListener('click', e => {
  if (e.target.closest('#gGo')) submitGuess(document.getElementById('gIn').value);
  const o = e.target.closest('.mc-opt'); if (o && !o.disabled) submitGuess(o.dataset.i);
});
document.getElementById('view-games').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'gIn') submitGuess(e.target.value);
});


