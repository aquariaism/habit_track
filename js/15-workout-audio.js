// ══════════════════════════════════════════════════════════════════════════════
//  WORKOUT / EXERCISE PLANNER & STOPWATCH MODULE
// ══════════════════════════════════════════════════════════════════════════════

// ── Web Audio API Synthesizer (Beeps for last 5s & completion chime) ──────────
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) audioCtx = new AudioCtx();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => { });
  }
  return audioCtx;
}

function playBeep(freq = 880, duration = 0.12, type = 'sine', volume = 0.45) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) { }
}

function playWarningBeep() {
  // Beep for each of the last 5 seconds (5, 4, 3, 2, 1)
  playBeep(850, 0.12, 'sine', 0.4);
  buzz(HAPTIC.tick);
}

function playCompletionBeep() {
  // Dual-tone victory chime when timer hits 0
  try {
    const ctx = getAudioContext();
    if (!ctx) { buzz(HAPTIC.success); return; }
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator(), g1 = ctx.createGain();
    osc1.frequency.setValueAtTime(1046.5, now);
    g1.gain.setValueAtTime(0.001, now);
    g1.gain.exponentialRampToValueAtTime(0.5, now + 0.02);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(g1); g1.connect(ctx.destination);
    osc1.start(now); osc1.stop(now + 0.18);

    const osc2 = ctx.createOscillator(), g2 = ctx.createGain();
    osc2.frequency.setValueAtTime(1318.5, now + 0.15);
    g2.gain.setValueAtTime(0.001, now + 0.15);
    g2.gain.exponentialRampToValueAtTime(0.55, now + 0.17);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.start(now + 0.15); osc2.stop(now + 0.45);
    buzz(HAPTIC.success);
  } catch (e) {
    playBeep(1200, 0.4, 'sine', 0.5);
    buzz(HAPTIC.success);
  }
}

