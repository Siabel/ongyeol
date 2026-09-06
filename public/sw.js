const CACHE_VERSION = "ongyeol-shell-v1";
const CORE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/apple-touch-icon.png",
];

async function precacheAppShell() {
  const cache = await caches.open(CACHE_VERSION);
  await Promise.allSettled(CORE_ASSETS.map((url) => cache.add(new Request(url, { cache: "reload" }))));

  try {
    const response = await fetch(new Request("/", { cache: "reload" }));
    if (!response.ok) return;
    const html = await response.clone().text();
    await cache.put("/", response);
    const assets = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
      .map((match) => match[1])
      .filter((url) => url.startsWith("/") && !url.startsWith("/api/"));
    await Promise.allSettled([...new Set(assets)].map((url) => cache.add(url)));
  } catch {
    // The core assets already provide a safe offline shell.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("ongyeol-") && key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put("/", response.clone()));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  const cacheable = ["style", "script", "font", "image"].includes(request.destination)
    || url.pathname === "/manifest.webmanifest";
  if (!cacheable) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => cached || Response.error());
      return cached || network;
    }),
  );
});
