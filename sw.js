// Service worker Mata Penjaga.
// Ganti VERSION setiap kali file aplikasi diubah supaya cache lama dibuang.
const VERSION = "v5";
const SHELL = `mata-shell-${VERSION}`;
const LIBS = "mata-libs-v1";

const SHELL_FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

// Library & model dari CDN: disimpan sekali, lalu dipakai dari cache (cepat & bisa offline)
const LIB_HOSTS = ["cdn.jsdelivr.net", "storage.googleapis.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== LIBS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;               // panggilan AI (POST) tidak pernah di-cache
  const url = new URL(req.url);

  // File aplikasi sendiri: coba internet dulu (supaya update langsung masuk), cadangan dari cache
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Library & model: dari cache dulu, ambil dari internet kalau belum ada
  if (LIB_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(LIBS).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })
    );
  }
  // Selain itu (Gemini, Claude, cuaca, daftar model) langsung ke internet tanpa cache
});
