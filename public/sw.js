// GAS Admin service worker — minimal. Network-first for everything,
// falls back to a cached copy of the shell when offline so the admin
// at least opens to a familiar screen on a flaky connection.
// Cache version: bump the integer to force every installed PWA to
// throw away its old cache on next visit.
const CACHE_VERSION = 'gas-admin-v30-20260622';
const SHELL_ASSETS = [
    '/gas-admin.html',
    '/gas-compass-color.png',
    '/gas-logo.png',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_ASSETS).catch(() => {}))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Wipe any previous version's cache.
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    // Only intercept GETs — POST/PUT/etc. must always hit the network
    // (booking creation, settings saves, etc.). Skip cross-origin too.
    if (req.method !== 'GET') return;
    if (new URL(req.url).origin !== self.location.origin) return;
    // Never cache API responses — always fresh. Stale settings/booking
    // data would be worse than an offline error.
    if (req.url.includes('/api/')) return;

    event.respondWith(
        fetch(req)
            .then((resp) => {
                // Cache successful shell-asset responses opportunistically.
                if (resp && resp.ok && SHELL_ASSETS.some((p) => req.url.endsWith(p))) {
                    const clone = resp.clone();
                    caches.open(CACHE_VERSION).then((c) => c.put(req, clone)).catch(() => {});
                }
                return resp;
            })
            .catch(() => caches.match(req))
    );
});
