const CACHE="gestione-personale-v100";
const SHELL=["./","./index.html","./styles.css","./core.js","./firestore-sync.js","./app.js","./manifest.json","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{const c=r.clone();caches.open(CACHE).then(ch=>ch.put(e.request,c)).catch(()=>{});return r;}).catch(()=>caches.match(e.request).then(c=>c||caches.match("./index.html"))));});
