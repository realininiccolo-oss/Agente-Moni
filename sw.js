// Service worker di Zona: rende l'app installabile e utilizzabile anche con poca rete.
// File dell'app: prima la rete (versione più recente), la copia salvata solo senza rete.
// Leaflet e caratteri: dalla copia salvata, aggiornata in sottofondo.
const CACHE = 'zona-v14';
const APP = ['./', 'stile.css?v=14', 'planner.js?v=14', 'app.js?v=14', 'manifest.webmanifest', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'badge-96.png'];
const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/';
const FONT = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(APP.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => { })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); } return r; })
      .catch(() => caches.match(req).then(r => r || caches.match(req, { ignoreSearch: true })).then(r => r || (req.mode === 'navigate' ? caches.match('./') : undefined))));
    return;
  }
  if (req.url.startsWith(LEAFLET) || FONT.test(req.url)) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(salvata => {
      const rete = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => salvata);
      return salvata || rete;
    })));
  }
  // mappe, Overpass, catasto, script Google: solo rete
});
// tocco su una notifica: riporta all'app già aperta, o la apre
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.startsWith(self.registration.scope));
    return c ? c.focus() : self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});
