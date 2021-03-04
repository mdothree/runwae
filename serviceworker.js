/*
 * @license
 * Your First PWA Codelab (https://g.co/codelabs/pwa)
 * Copyright 2019 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License
 */
'use strict';
// CODELAB: Update cache names any time any of the cached files change.
const CACHE_NAME = 'static-cache-v1';
// CODELAB: Add list of files to cache here.
const FILES_TO_CACHE = [
    'offline.html', 'img/500.png',
];
self.addEventListener('install', (evt) => {
    // console.log('[ServiceWorker] Install');
    // CODELAB: Precache static resources here.
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // console.log('[ServiceWorker] Pre-caching offline page');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting();
});
self.addEventListener('activate', (evt) => {
    // console.log('[ServiceWorker] Activate');
    // CODELAB: Remove previous cached data from disk.
    evt.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    // console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    )
    self.clients.claim();
});
//if offline
//if navigation
//send to offline
//or check if in cache
self.addEventListener('fetch', (evt) => {
    // console.log('[ServiceWorker] Fetch', evt.request.url);
    // CODELAB: Add fetch event handler here.
///we can't enter respond with unless we plan to pass an actual response
    evt.respondWith(
        fetch(evt.request).then(
            function (response) {
                // console.log( evt.request.url);
                return response;
            }).catch(() => {
                // console.log( evt.request.url);
                                //if not relocation
                if (evt.request.mode !== 'navigate') {
                    // console.log( evt.request.url);
                    cache.match(evt.request.url.split(".com")[1])
                    // caches.match(evt.request)
                        .then(function (response) {
                            // Cache hit - return response
                            if (response) {
                                return response;
                            }
                        });
                }
            return caches.open(CACHE_NAME)
                .then((cache) => {
                    // console.log( cache.match('offline.html'));
                    return cache.match('offline.html');
                });
        })
    );
});
// self.addEventListener('fetch', (evt) => {
//     console.log("fetch");
//     console.log('[ServiceWorker] Fetch', evt.request.url);
//     // CODELAB: Add fetch event handler here.
//     // CODELAB: Add fetch event handler here.
//     if (evt.request.mode !== 'navigate') {
//         // Not a page navigation, bail.
//         return;
//     }
//     evt.respondWith(
//         fetch(evt.request)
//         .catch(() => {
//             return caches.open(CACHE_NAME)
//                 .then((cache) => {
//                     return cache.match('offline.html');
//                 });
//         })
//     );
// });
// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     caches.match(event.request)
//       .then(function(response) {
//           console.log('[ServiceWorker] Fetch', event.request.url);
//         // Cache hit - return response
//         if (response) {
//           return response;
//         }
//         return fetch(event.request).then(
//           function(response) {
//             // Check if we received a valid response
//             if(!response || response.status !== 200 || response.type !== 'basic') {
//               return response;
//             }
//             // IMPORTANT: Clone the response. A response is a stream
//             // and because we want the browser to consume the response
//             // as well as the cache consuming the response, we need
//             // to clone it so we have two streams.
//             var responseToCache = response.clone();
//             caches.open(CACHE_NAME)
//               .then(function(cache) {
//                 cache.put(event.request, responseToCache);
//               });
//             return response;
//           }
//         );
//       })
//     );
// });
