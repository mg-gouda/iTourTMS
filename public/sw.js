// iTourTMS service worker: makes the app installable and shows an offline page
// when a page can't load. It never caches data or API responses — those are
// per user and must stay fresh.
const CACHE = "itms-shell-v2";
const OFFLINE = "/offline.html";
const SHELL = [OFFLINE, "/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
  } else if (SHELL.includes(new URL(e.request.url).pathname)) {
    // The offline page's own assets, so it renders without a network.
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
  }
  // Everything else goes straight to the network.
});
