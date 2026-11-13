// Service worker: rende l'app installabile e utilizzabile anche con poca rete.
// File dell'app e Leaflet: prima la rete (versione più recente), la copia salvata solo senza rete.
const CACHE = 'agente-moni-v10';
const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin !== location.origin && !e.request.url.startsWith(LEAFLET)) return; // script Google, mappe, Overpass: solo rete
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request)));
});
// tocco su una notifica: riporta all'app già aperta, o la apre
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => x.url.startsWith(self.registration.scope));
    return c ? c.focus() : self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});
