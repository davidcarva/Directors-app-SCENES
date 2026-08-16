const CACHE = "diretor-v27";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./data.js",
  "./diagrams.js",
  "./app.js",
  "./firebase-config.js",
  "./cloud.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-maskable.svg",
  "./vendor/tabler-icons.min.css",
  "./vendor/fonts/tabler-icons.woff2"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Rede primeiro para o "miolo" do app (HTML/JS/CSS/manifest) => atualiza na hora online.
// Cache primeiro para fontes/imagens (pesadas e que não mudam).
function isShell(url, req) {
  if (req.mode === "navigate") return true;
  if (url.origin !== self.location.origin) return false;
  return /\.(html|js|css|webmanifest)$/.test(url.pathname);
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  if (isShell(url, e.request)) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(e.request).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
    })
  );
});
