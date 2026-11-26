// ── Exercise Categories & Weekdays ─────────────────────────────────────────────
const EX_CATEGORIES = {
  chest: { l: 'Chest', e: 'fitness_center', c: '#e0975a' },
  back: { l: 'Back', e: 'fitness_center', c: '#5b84b1' },
  legs: { l: 'Legs', e: 'directions_run', c: '#6fae8a' },
  shoulders: { l: 'Shoulders', e: 'fitness_center', c: '#a07cc0' },
  arms: { l: 'Arms', e: 'fitness_center', c: '#c9738f' },
  core: { l: 'Core', e: 'self_improvement', c: '#6aa6d6' },
  cardio: { l: 'Cardio', e: 'directions_bike', c: '#d9776a' },
  recovery: { l: 'Mobility / Rest', e: 'grass', c: '#4fa3a5' }
};

const WEEK_DAYS = [
  { key: 'mon', name: 'Monday', short: 'Mon' },
  { key: 'tue', name: 'Tuesday', short: 'Tue' },
  { key: 'wed', name: 'Wednesday', short: 'Wed' },
  { key: 'thu', name: 'Thursday', short: 'Thu' },
  { key: 'fri', name: 'Friday', short: 'Fri' },
  { key: 'sat', name: 'Saturday', short: 'Sat' },
  { key: 'sun', name: 'Sunday', short: 'Sun' }
];
const DAY_INDEX_MAP = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };
const getTodayDayKey = () => DAY_INDEX_MAP[today.getDay()] || 'mon';
const minToSecStr = s => `${p(Math.floor(s / 60))}:${p(s % 60)}`;

// Starter 7-Day Workout Plans (5 exercises each, 3 sets each, 40s duration)
const DEFAULT_WORKOUT_DATA = {
  plans: {
    mon: {
      focus: 'Chest & Triceps',
      exercises: [
        { id: 'ex_m1', name: 'Standard Push-ups', sets: 3, duration: 40, reps: '12-15 reps', rest: 20, category: 'chest' }
      ]
    },
    tue: {
      focus: 'Back & Biceps',
      exercises: [
        { id: 'ex_t1', name: 'Pull-ups / Inverted Rows', sets: 3, duration: 40, reps: '8-10 reps', rest: 20, category: 'back' }
      ]
    },
    wed: {
      focus: 'Legs & Calves',
      exercises: [
        { id: 'ex_w1', name: 'Bodyweight Squats', sets: 3, duration: 40, reps: '15-20 reps', rest: 20, category: 'legs' }
      ]
    },
    thu: {
      focus: 'Shoulders & Core',
      exercises: [
        { id: 'ex_th1', name: 'Pike Push-ups / Overhead Press', sets: 3, duration: 40, reps: '10-12 reps', rest: 20, category: 'shoulders' }
      ]
    },
    fri: {
      focus: 'Full Body HIIT',
      exercises: [
        { id: 'ex_f1', name: 'Jumping Jacks', sets: 3, duration: 40, reps: 'Fast pace', rest: 20, category: 'cardio' }
      ]
    },
    sat: {
      focus: 'Mobility & Recovery',
      exercises: [
        { id: 'ex_s1', name: 'Dynamic Arm & Leg Swings', sets: 3, duration: 40, reps: 'Smooth', rest: 15, category: 'recovery' }
      ]
    },
    sun: {
      focus: 'Rest & Core Tune-up',
      exercises: [
        { id: 'ex_su1', name: 'Bird Dog', sets: 3, duration: 40, reps: '10 each side', rest: 20, category: 'core' }
      ]
    }
  },
  log: {}
};

function cleanWorkoutData(raw) {
  if (!raw || typeof raw !== 'object') raw = {};
  const plans = {};
  WEEK_DAYS.forEach(d => {
    const p = raw.plans && raw.plans[d.key];
    const def = DEFAULT_WORKOUT_DATA.plans[d.key];
    plans[d.key] = {
      focus: (p && typeof p.focus === 'string') ? p.focus : def.focus,
      exercises: (p && Array.isArray(p.exercises))
        ? p.exercises.map(e => ({
          id: e.id || uid(),
          name: String(e.name || 'Exercise').slice(0, 50),
          sets: Math.max(1, Math.min(20, Number(e.sets) || 3)),
          duration: Math.max(5, Math.min(600, Number(e.duration) || 40)),
          rest: Math.max(0, Math.min(300, Number(e.rest) ?? 20)),
          reps: String(e.reps || ''),
          category: EX_CATEGORIES[e.category] ? e.category : 'chest'
        }))
        : def.exercises.map(e => ({ ...e }))
    };
  });
  const log = (raw.log && typeof raw.log === 'object') ? raw.log : {};
  return { plans, log };
}

let workoutData = cleanWorkoutData(load('ht5_workout', null));
const saveWorkout = () => store('ht5_workout', workoutData);
let selectedWorkoutDay = getTodayDayKey();
// Routine list open/closed (remembered between visits)
let exListOpen = (() => { try { return localStorage.getItem('ht_ex_list_open') !== '0'; } catch (e) { return true; } })();

