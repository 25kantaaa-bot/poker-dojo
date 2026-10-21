/* Poker Dojo service worker
   network-first for index.html (so updates show immediately when online),
   falling back to cache when offline. Icons/manifest are precached. */
const VERSION = "pd-v1";
const SHELL = `${VERSION}-shell`;
const SHELL_FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirstNavigate(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res.ok) await cache.put(new URL("index.html", self.registration.scope).href, res.clone());
    return res;
  } catch (err) {
    return (
      (await cache.match(new URL("index.html", self.registration.scope).href)) ||
      (await cache.match(new URL("./", self.registration.scope).href)) ||
      Response.error()
    );
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(SHELL);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) await cache.put(req, res.clone());
    return res;
  } catch (err) {
    return Response.error();
  }
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (e.request.mode === "navigate") {
    e.respondWith(networkFirstNavigate(e.request));
    return;
  }
  e.respondWith(cacheFirst(e.request));
});
