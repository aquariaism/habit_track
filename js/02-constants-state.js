// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const EMOJIS = ['favorite', 'directions_run', 'menu_book', 'water_drop', 'self_improvement', 'draw', 'piano', 'restaurant', 'fitness_center', 'grass', 'palette', 'cleaning_services', 'medication', 'wb_sunny', 'ads_click', 'bedtime', 'psychology', 'directions_bike', 'headphones', 'sports_gymnastics'];   // Material icon names
const COLORS = ['#5b84b1', '#6aa6d6', '#4fa3a5', '#6fae8a', '#a3b86a', '#d6b04c', '#e0975a', '#d9776a', '#c9738f', '#a07cc0', '#7f86c8', '#8c7a6b'];
const CNAMES = ['Slate', 'Sky', 'Teal', 'Sage', 'Moss', 'Butter', 'Peach', 'Coral', 'Rose', 'Lilac', 'Periwinkle', 'Mocha'];
const DAY_S = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── STATE ──────────────────────────────────────────────────────────────────────
let habits = JSON.parse(localStorage.getItem('ht3_habits') || '[]');
const LEGACY_COLORS = {"#f43f5e": "#c9738f", "#ef4444": "#d9776a", "#f97316": "#e0975a", "#f59e0b": "#d6b04c", "#eab308": "#d6b04c", "#84cc16": "#a3b86a", "#22c55e": "#6fae8a", "#14b8a6": "#4fa3a5", "#06b6d4": "#6aa6d6", "#3b82f6": "#5b84b1", "#6366f1": "#7f86c8", "#a855f7": "#a07cc0", "#8b5cf6": "#a07cc0", "#ec4899": "#c9738f"};
habits.forEach(h => { if (h && h.color && LEGACY_COLORS[h.color.toLowerCase()]) h.color = LEGACY_COLORS[h.color.toLowerCase()]; });
let editId = null;
let deleteId = null;
let openMenuId = null;
let selEmoji = 'favorite';
let selColor = COLORS[0];

// drag state
let dragSrcIdx = null;

let today = new Date();
let todayStr = fmt(today);

function fmt(d) { return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function p(n) { return String(n).padStart(2, '0'); }
function uid() { return Math.random().toString(36).slice(2, 9); }
function save() { localStorage.setItem('ht3_habits', JSON.stringify(habits)); }
function hexA(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

