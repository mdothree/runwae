/*
 * Runwae Service Worker
 * Enhanced PWA with caching strategies
 */
'use strict';

const CACHE_NAME = 'runwae-cache-v3';
const RUNTIME_CACHE = 'runwae-runtime-v1';

// Core assets to precache on install
const PRECACHE_ASSETS = [
    '/',
    'offline.html',
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
                            cache.put(evt.request, response);
                        });
                    }).catch(() => {});
                    return cached;
                }
                // Not cached, fetch and cache
                return fetch(evt.request).then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(evt.request, clone);
                    });
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
                    // Cache successful page loads
                    const clone = response.clone();
                    caches.open(RUNTIME_CACHE).then(cache => {
                        cache.put(evt.request, clone);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(evt.request)
                        .then(cached => cached || caches.match('offline.html'));
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
