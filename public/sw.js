// Millie AI service worker: network-first, with an offline fallback for the app shell.
const CACHE = "millie-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/favicon.svg", "/icons/icon-192.png"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/~oauth") || url.pathname.startsWith("/_serverFn")) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && e.request.mode === "navigate") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("/")))
  );
});
