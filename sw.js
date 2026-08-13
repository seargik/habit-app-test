const CACHE = "habit-app-test-daybook-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=7",
  "./daybook-v4.css?v=7",
  "./migration-v4.js?v=7",
  "./daybook-v4.js?v=7",
  "./app-v4.js?v=7",
  "./continuity-v4.js?v=7",
  "./ux-fixes-v7.js?v=7",
  "./manifest.webmanifest?v=7",
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

  const request = event.request;
  const url = new URL(request.url);
  const appCode = url.origin === self.location.origin &&
    (request.mode === "navigate" || ["document", "script", "style"].includes(request.destination));

  if (appCode) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        } catch (_) {
          return (await cache.match(request)) || (await cache.match("./index.html"));
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});