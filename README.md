# habit_track

Habit Tracker PWA (habits, routine, attendance, workout, games). No build step: open `index.html`.

## Structure

```
index.html          page markup; loads css/ then js/ in numbered order
manifest.json       PWA manifest
sw.js               service worker (precache list includes every css/ and js/ file)
css/                styles, numbered in cascade order (later files override earlier ones)
js/                 scripts, numbered in load order (all share one global scope)
```

### js/ — where to look when debugging

| File | What lives there |
|---|---|
| 01-icons.js | Material icon paths, `ic()` helper |
| 02-constants-state.js | colours, habit state, date helpers, `save()` |
| 03-theme.js | light / dark / system theme |
| 04-habits-overview.js | header date, today banner, week strip |
| 05-habit-tracker-grid.js | per-habit stats, activity grid, toggling past days |
| 06-habit-list.js | `renderHabits()`, check-off, ⋯ menu |
| 07-habit-modal-pickers.js | add/edit modal, delete confirm, icon/colour pickers |
| 08-settings-toast.js | settings panel open/close, toast |
| 09-shared-helpers.js | `esc`, `load`/`store`, prefs, haptics, `popMenu` |
| 10-routine-timetables.js | Routine + Weekend planner, time-block sheet |
| 11-attendance.js | Attendance tab + subject sheet |
| 12-mind-game.js | Daily mind game |
| 13-zip-game.js | Zip puzzle, leaderboard (Supabase) |
| 14-games-tab.js | Games tab switcher (Mind / Zip) |
| 15-workout-audio.js | Web Audio beeps |
| 16-workout-data.js | exercise categories, default plans, saved workout data |
| 17-workout-timer.js | workout timer + stopwatch |
| 18-workout-log-modals.js | set logging, add/edit exercise + day-focus modals |
| 19-workout-view.js | `renderWorkout()` and its click/change handlers |
| 20-tabs-prefs.js | tab switching, swipe, settings toggles, midnight rollover |
| 21-data-safety.js | export / import / clear data |
| 22-pwa-back-button.js | service worker registration, offline bar, back-button handling |
| 23-motion-helpers.js | stat tiles, count-up, confetti |
| 24-habit-calendar.js | per-habit month calendar |
| 25-attendance-calendar.js | per-subject attendance calendar |
| 26-calendar-events.js | calendar sheet click handling |
| 27-init.js | start-up (runs last) |

**Order matters.** These are plain scripts, not modules: a file may only run top-level code that uses things defined in earlier files. Functions called later (from clicks, timers) can live anywhere.

### css/
Numbered in the same spirit: `01-theme` (tokens) → components → feature areas (attendance, games, calendar, workout) → `22-v6-*` redesign overrides → `24-v6-fixes` (last word). Rules are unchanged, so if one style overrides another, the higher-numbered file wins.

## Notes
`extra` holds Supabase credentials for the Zip leaderboard.

### Header behaviour
The title bar collapses on scroll (`js/20-tabs-prefs.js` toggles `.compact` on `.header`; styles in `css/24-v6-fixes.css`). The wavy bottom edge is a filled SVG (`--wave` in `css/22-v6-tokens.css`) so scrolled content is hidden behind it.
