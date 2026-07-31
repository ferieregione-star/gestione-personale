const CACHE = "gestione-personale-v112";

const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./core.js",
  "./firestore-sync.js",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  /*
   * Non intercettare Firebase, Firestore o altre risorse esterne.
   * La sincronizzazione deve essere gestita direttamente da Firebase.
   */
  if (requestUrl.origin !== self.location.origin) return;

  // Richieste di navigazione: rete, con index.html come riserva offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE)
              .then(cache => cache.put("./index.html", copy))
              .catch(() => {});
          }

          return response;
        })
        .catch(() => caches.match("./index.html"))
    );

    return;
  }

  // File statici dell'app: prima la rete, poi la cache.
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then(response => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();

          caches.open(CACHE)
            .then(cache => cache.put(event.request, copy))
            .catch(() => {});
        }

        return response;
      })
      .catch(() =>
        caches.match(event.request, { ignoreSearch: true })
      )
  );
});
