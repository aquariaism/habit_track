const CACHE_NAME = 'habit-tracker-v11';
const RUNTIME_CACHE = 'habit-tracker-runtime-v11';

const PRECACHE_URLS = [
  './index.html',
  './css/01-theme.css',
  './css/02-header.css',
  './css/03-banner-week.css',
  './css/04-habits.css',
  './css/05-dropdown-modal.css',
  './css/06-settings-confirm.css',
  './css/07-feedback-toast.css',
  './css/08-views-nav.css',
  './css/09-shared-timeline.css',
  './css/10-attendance.css',
  './css/11-mind-game.css',
  './css/12-zip-games.css',
  './css/13-habit-calendar.css',
  './css/14-material-icons.css',
  './css/15-motion.css',
  './css/16-icon-colours.css',
  './css/17-attendance-calendar.css',
  './css/18-nav-routine-tabs.css',
  './css/19-workout-timer.css',
  './css/20-workout-exercises.css',
  './css/21-workout-mobile.css',
  './css/22-v6-tokens.css',
  './css/23-v6-components.css',
  './css/24-v6-fixes.css',
  './js/01-icons.js',
  './js/02-constants-state.js',
  './js/03-theme.js',
  './js/04-habits-overview.js',
  './js/05-habit-tracker-grid.js',
  './js/06-habit-list.js',
  './js/07-habit-modal-pickers.js',
  './js/08-settings-toast.js',
  './js/09-shared-helpers.js',
  './js/10-routine-timetables.js',
  './js/11-attendance.js',
  './js/12-mind-game.js',
  './js/13-zip-game.js',
  './js/14-games-tab.js',
  './js/15-workout-audio.js',
  './js/16-workout-data.js',
  './js/17-workout-timer.js',
  './js/18-workout-log-modals.js',
  './js/19-workout-view.js',
  './js/20-tabs-prefs.js',
  './js/21-data-safety.js',
  './js/22-pwa-back-button.js',
  './js/23-motion-helpers.js',
  './js/24-habit-calendar.js',
  './js/25-attendance-calendar.js',
  './js/26-calendar-events.js',
  './js/27-init.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// ── INSTALL 
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(n => n !== CACHE_NAME && n !== RUNTIME_CACHE)
          .map(n => caches.delete(n))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH 
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  // Leaderboard / API calls must always hit the network — only cache our own files and Google Fonts
  if (url.origin !== self.location.origin && !/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;

  const isShell =
    url.origin === self.location.origin &&
    (request.mode === 'navigate' ||
      /\/(index\.html|css\/[^/]+\.css|js\/[^/]+\.js)$/.test(url.pathname) ||
      url.pathname.endsWith('/'));

  event.respondWith(isShell ? networkFirst(request) : cacheFirst(request));
});

// ── STRATEGIES 
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await caches.match('./index.html');
      if (shell) return shell;
    }
    return new Response('You are offline. Open the app once while connected to enable offline mode.',
      { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408 });
  }
}

// ── MESSAGE HANDLER (for update reload)
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── BACKGROUND SYNC (future-ready)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-habits') {
    console.log('[SW] Background sync triggered');
  }
});

// ── PUSH NOTIFICATIONS (future-ready)
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Habit Tracker', {
      body: data.body || "Don't forget your habits today! 🔥",
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'habit-reminder',
      renotify: true,
      data: { url: './index.html' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('index') && 'focus' in client)
          return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});