const CACHE = "habit-app-test-daybook-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=5",
  "./daybook-v4.css?v=5",
  "./migration-v4.js?v=5",
  "./daybook-v4.js?v=5",
  "./app-v4.js?v=5",
  "./manifest.webmanifest?v=5",
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
        .filter((key) => key.startsWith("habit-app-test-") && key !== CACHE)
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
