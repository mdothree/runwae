/*
 * Runwae Service Worker
 * Enhanced PWA with caching strategies
 */
'use strict';

const CACHE_NAME = 'runwae-cache-v12'; // v12: labelled nav icons + real shop link, Terms link outside the signup label (RUNWAE-NEW-UNLABELLED-NAV / -TERMS-CLICK-SUBMITS). v11-hf2: profile website/social link + gig history/download XSS fixes (drops cached util/display/accountHQ/gigHQ JS). v11-hf1: feed escaping hotfix (2026-10-14; drops cached util/feed/timeline JS). v11: HID-004 offline shell (clean /offline URL, never cache redirected/failed responses); jQuery 3.7.1 + Bootstrap 4.6.2 JS (SURF-007); AdSense/ManyChat removed. v10: 14-day marketer refund window (R-runwae-2). v9: fee copy. v8: honest-claims copy. v7: policy pages (L-RWE-03). v6: / is the landing (SEO-003). v5: theme toggle
const RUNTIME_CACHE = 'runwae-runtime-v3'; // v3: drops pages cached as redirects by v2 (HID-004)

// Core assets to precache on install
const PRECACHE_ASSETS = [
    '/',
    '/offline', // cleanUrls serves offline.html as a 308 to /offline; a cached redirect cannot answer a navigation (HID-004)
    // CSS
    'css/main.css',
    'css/runwae.css',
    'css/fonts.min.css',
    'css/ext.css',
    'css/theme.css',
    'Bootstrap/dist/css/bootstrap.css',
    'Bootstrap/dist/css/bootstrap-reboot.css',
    'Bootstrap/dist/css/bootstrap-grid.css',
    // Core JS
    'js/console-toggle.js',
    'js/consent.js',
    'js/theme-init.js',
    'js/main.js',
    'js/base-init.js',
    'js/webfontloader.min.js',
    // Images
    'img/500.png',
    'img/logo.png',
    'img/logo-colored.png',
    'img/background.png',
    // Manifest
    'manifest.json'
];

// HID-004: only plain, successful same-origin responses may be cached. A redirected response
// (for example a 308 from cleanUrls) is rejected by the browser when it answers a navigation,
// which is why the offline reload used to render an empty page.
function cacheable(response) {
    return response && response.ok && !response.redirected && response.type === 'basic';
}

// Install: precache core assets
self.addEventListener('install', (evt) => {
    evt.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                // Cache what we can, don't fail if some assets are missing
                return Promise.allSettled(
                    PRECACHE_ASSETS.map(url =>
                        cache.add(url).catch(err => {
                            console.warn('[SW] Failed to cache:', url);
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', (evt) => {
    evt.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
                    return caches.delete(key);
                }
            }));
        }).then(() => self.clients.claim())
    );
});

// Fetch: stale-while-revalidate for most, network-first for API
self.addEventListener('fetch', (evt) => {
    const url = new URL(evt.request.url);

    // Skip non-GET requests
    if (evt.request.method !== 'GET') return;

    // Skip cross-origin requests (let them go to network)
    if (url.origin !== location.origin) {
        // For external resources, try network with cache fallback
        if (url.hostname.includes('unpkg.com') ||
            url.hostname.includes('cdnjs.') ||
            url.hostname.includes('googleapis.com')) {
            evt.respondWith(
                fetch(evt.request)
                    .then(response => {
                        // Cache external resources for offline use
                        const clone = response.clone();
                        caches.open(RUNTIME_CACHE).then(cache => {
                            cache.put(evt.request, clone);
                        });
                        return response;
                    })
                    .catch(() => caches.match(evt.request))
            );
        }
        return;
    }

    // API calls: network-first
    if (url.pathname.startsWith('/api/')) {
        evt.respondWith(
            fetch(evt.request)
                .catch(() => caches.match(evt.request))
        );
        return;
    }

    // Static assets: cache-first
    if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
        evt.respondWith(
            caches.match(evt.request).then((cached) => {
                if (cached) {
                    // Return cached, but update in background
                    fetch(evt.request).then(response => {
                        caches.open(CACHE_NAME).then(cache => {
                            if (cacheable(response)) cache.put(evt.request, response);
                        });
                    }).catch(() => {});
                    return cached;
                }
                // Not cached, fetch and cache
                return fetch(evt.request).then(response => {
                    if (cacheable(response)) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(evt.request, clone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // HTML pages: network-first with offline fallback
    if (evt.request.mode === 'navigate') {
        evt.respondWith(
            fetch(evt.request)
                .then(response => {
                    // Cache successful page loads (never redirects or errors)
                    if (cacheable(response)) {
                        const clone = response.clone();
                        caches.open(RUNTIME_CACHE).then(cache => {
                            cache.put(evt.request, clone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(evt.request, { ignoreSearch: true })
                        .then(cached => (cached && !cached.redirected) ? cached : caches.match('/offline'))
                        .then(r => r || new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | Runwae</title><body style="font:16px/1.5 Arial,sans-serif;padding:24px"><h1>You are offline</h1><p>Runwae needs a connection for sign-in, gigs and messages. Reconnect and reload this page.</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
                })
        );
        return;
    }

    // Default: network with cache fallback
    evt.respondWith(
        fetch(evt.request)
            .catch(() => caches.match(evt.request))
    );
});
