const CACHE = "life-tracker-v4-phase1d";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=4",
  "./migration-v4.js?v=4",
  "./legacy-carryover-v4.js?v=4",
  "./general-guard-v4.js?v=4",
  "./metric-visibility-v4.js?v=4",
  "./app-v4.js?v=4",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith("life-tracker-") && key !== CACHE)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
