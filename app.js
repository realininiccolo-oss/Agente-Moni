/* Agente Moni v9 — giri a piedi guidati dal vivo e schede delle case.
   Funziona da solo sul telefono: mappe del comune, strade viste, case con foto e note vocali restano sul telefono.
   Il collegamento a Google (foglio e cartella Drive) è facoltativo. */
(() => {
  'use strict';
  const VERSIONE = 10;
  const $ = id => document.getElementById(id);
  const LS = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  const cfg = Object.assign({ url: '', key: '', comune: '', comuni: [], rivedi: 0, minuti: 60, tornaAuto: true }, LS.get('cfg', {}));
  if (cfg.comune && !cfg.comuni.includes(cfg.comune)) cfg.comuni.push(cfg.comune);
  const salvaCfg = () => LS.set('cfg', cfg);
  if (cfg.voce == null) { cfg.voce = LS.get('voce', false); salvaCfg(); }
  const conGoogle = () => !!(cfg.url && cfg.key);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- icone ----------
  const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  const ICO = {
    piu: svg('<path d="M12 5v14M5 12h14"/>'),
    casa: svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    auto: svg('<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="16" r="1.6"/><circle cx="16.5" cy="16" r="1.6"/>'),
    mappa: svg('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
    foto: svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
    mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
    pausa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
    cestino: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    rifai: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
    x: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
    ok: svg('<path d="M5 12.5 10 17 19 7"/>', 'stroke-width="3"'),
    foglio: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
    ingranaggio: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
    voce: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
    condividi: svg('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>'),
    telefono: svg('<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>'),
    matita: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
    cammina: svg('<circle cx="13" cy="4" r="2"/><path d="M10 21l2-6 3 3v3M8 12l3-4 4 2 2 3M11 8l-1 6"/>'),
    posizione: svg('<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>'),
    aiuto: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17v.5"/>'),
    salva: svg('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>'),
    festa: '<svg class="grande" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#2e7d4f"/><path d="M14 25l7 7 14-15" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  const FRECCIA = {
    dritto: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 42V10M12 21 24 8l12 13" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    destra: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 42V24a6 6 0 0 1 6-6h18M30 9l9 9-9 9" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sinistra: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M34 42V24a6 6 0 0 0-6-6H10M18 9l-9 9 9 9" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    indietro: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M30 42V18a8 8 0 0 0-16 0v10M7 22l7 7 7-7" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrivo: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="8" width="32" height="32" rx="9" fill="none" stroke="currentColor" stroke-width="4.5"/><path d="M19 34V14h7a6 6 0 0 1 0 12h-7" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fuori: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" stroke-width="4.5"/><path d="M24 14v12M24 32v1" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>'
  };

  // stati delle case: colore e simbolo del segnaposto
  const STATI = [
    { k: 'Da valutare', c: '#4a5a60', g: '<text x="15" y="19" text-anchor="middle" font-size="13" font-weight="700" fill="#4a5a60" font-family="Atkinson Hyperlegible, sans-serif">?</text>' },
    { k: 'Cartello vendita', c: '#d23a2e', g: '<text x="15" y="19" text-anchor="middle" font-size="13" font-weight="700" fill="#d23a2e" font-family="Atkinson Hyperlegible, sans-serif">€</text>' },
    { k: 'Cartello affitto', c: '#7b3fb0', g: '<g transform="translate(8 7) scale(.58)" fill="none" stroke="#7b3fb0" stroke-width="3" stroke-linecap="round"><circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/></g>' },
    { k: 'Interessante', c: '#2e7d4f', g: '<g transform="translate(8 7) scale(.58)"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" fill="#2e7d4f"/></g>' },
    { k: 'Da ricontattare', c: '#c27c00', g: '<g transform="translate(8.5 7.5) scale(.55)"><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" fill="#c27c00"/></g>' },
    { k: 'Scartata', c: '#9aa5a8', g: '<g transform="translate(8 7) scale(.58)" fill="none" stroke="#9aa5a8" stroke-width="3.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></g>' }
  ];
  const statoInfo = k => STATI.find(s => s.k === k) || STATI[0];
  const pinSVG = k => { const s = statoInfo(k); return `<svg viewBox="0 0 30 38" width="30" height="38" aria-hidden="true"><path d="M15 37S2 22.5 2 14a13 13 0 0 1 26 0c0 8.5-13 23-13 23z" fill="${s.c}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14" r="9" fill="#fff"/>${s.g}</svg>`; };
  const TIPI = ['Villa', 'Villetta a schiera', 'Appartamento', 'Rustico o cascina', 'Terreno', 'Negozio o ufficio', 'Altro'];

  // ---------- utilità ----------
  const dist = (a, b) => { const R = 6371000, t = Math.PI / 180, dl = (b[0] - a[0]) * t, dn = (b[1] - a[1]) * t; const x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const bearing = (a, b) => { const t = Math.PI / 180, y = Math.sin((b[1] - a[1]) * t) * Math.cos(b[0] * t), x = Math.cos(a[0] * t) * Math.sin(b[0] * t) - Math.sin(a[0] * t) * Math.cos(b[0] * t) * Math.cos((b[1] - a[1]) * t); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; };
  const angolo = (b2, b1) => ((b2 - b1 + 540) % 360) - 180;
  const kmTesto = m => m < 5 ? '0 km' : m < 1000 ? Math.max(10, Math.round(m / 10) * 10) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
  const metriTesto = m => m < 25 ? 'Adesso' : m < 100 ? 'Tra ' + Math.round(m / 10) * 10 + ' m' : m < 1000 ? 'Tra ' + Math.round(m / 50) * 50 + ' m' : 'Tra ' + kmTesto(m);
  const orario = ts => new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  function oreTesto(h) {
    if (h < 0.1) return 'pochi minuti';
    const m = Math.max(5, Math.round(h * 60 / 5) * 5), H = Math.floor(m / 60), M = m % 60;
    if (!H) return M + ' minuti';
    const ore = H === 1 ? '1 ora' : H + ' ore';
    return M === 0 ? ore : M === 30 ? ore + ' e mezza' : ore + ' e ' + M;
  }
  function toast(msg, tipo = '', ms = 3200) { const t = $('toast'); t.textContent = msg; t.className = tipo; t.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(() => t.style.display = 'none', ms); }
  function parla(testo) { if (!cfg.voce || !('speechSynthesis' in window)) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(testo); u.lang = 'it-IT'; speechSynthesis.speak(u); } catch (e) { } }
  const vibra = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };
  // notifiche del telefono: arrivano anche con lo schermo spento o con un'altra app davanti
  const notificheOk = () => 'Notification' in window && Notification.permission === 'granted' && cfg.notifiche !== false;
  async function chiediNotifiche() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (e) { } }
    cfg.notifiche = Notification.permission === 'granted'; salvaCfg();
    return cfg.notifiche;
  }
  async function notifica(titolo, testo, tag = 'giro', sempre = false) {
    vibra([200, 100, 200]);
    if (!notificheOk() || (!sempre && document.visibilityState === 'visible')) return false; // con l'app davanti basta l'avviso nell'app
    const o = { body: testo, tag, renotify: true, icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [200, 100, 200], data: { url: location.href.split('#')[0] } };
    try {
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if (reg) await reg.showNotification(titolo, o); else new Notification(titolo, o);
      return true;
    } catch (e) { return false; }
  }
  const pausa = ms => new Promise(r => setTimeout(r, ms));
  const mapsAuto = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
  const mapsPiedi = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;

  async function api(action, payload = {}) {
    if (!conGoogle()) throw new Error('Google non collegato');
    const r = await fetch(cfg.url, { method: 'POST', body: JSON.stringify({ key: cfg.key, action, ...payload }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error);
    return j.data;
  }

  // ---------- archivio sul telefono (IndexedDB) ----------
  const DB = (() => {
    let p;
    const open = () => p || (p = new Promise((ok, ko) => {
      const r = indexedDB.open('agente-moni', 2);
      r.onupgradeneeded = () => {
        const db = r.result;
        for (const n of ['coda', 'case']) if (!db.objectStoreNames.contains(n)) db.createObjectStore(n, { keyPath: 'id' });
        for (const n of ['reti', 'visti']) if (!db.objectStoreNames.contains(n)) db.createObjectStore(n);
      };
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
    }));
    const run = async (store, mode, fn) => { const db = await open(); return new Promise((ok, ko) => { const t = db.transaction(store, mode), req = fn(t.objectStore(store)); t.oncomplete = () => ok(req && req.result); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error); }); };
    return {
      put: (s, v, k) => run(s, 'readwrite', o => k === undefined ? o.put(v) : o.put(v, k)),
      get: (s, k) => run(s, 'readonly', o => o.get(k)),
      del: (s, k) => run(s, 'readwrite', o => o.delete(k)),
      all: s => run(s, 'readonly', o => o.getAll()),
      chiavi: s => run(s, 'readonly', o => o.getAllKeys())
    };
  })();
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }

  // ---------- comune attivo: rete stradale, strade viste, stato del giro ----------
  let R = null, G = null, visti = null, S = null, caricamento = null;
  const statoVuoto = () => ({ fase: 'home', meta: null, auto: null, fine: null, minuti: 60, torna: true, rotta: null, prog: 0, sessione: null, ultima: null, isolateViste: {}, migrato: false, calcolo: 0 });
  function caricaStato() { S = Object.assign(statoVuoto(), LS.get('stato4_' + cfg.comune, {})); }
  const salvaStato = () => { if (cfg.comune) LS.set('stato4_' + cfg.comune, S); };
  caricaStato();
  const dv = () => Planner.daVedereFn(G, visti, cfg.rivedi);
  const avanzamento = () => G ? Planner.avanzamento(G, visti, cfg.rivedi) : { kmFatti: 0, kmTot: 0, perc: 0 };
  let tVisti = null;
  function salvaVisti() {
    if (!G) return; const nome = cfg.comune, rec = { id: R.id, v: visti };
    clearTimeout(tVisti); tVisti = setTimeout(() => DB.put('visti', rec, nome).catch(() => { }), 1200);
  }

  async function preparaComune(scarica = true) {
    R = G = visti = null; pulisciMappa();
    if (!cfg.comune) { aggiorna(true); return; }
    caricaStato(); anteprima = null; zone = null;
    const nome = cfg.comune;
    aggiorna(false);
    try {
      let r = await DB.get('reti', nome);
      if (!r && conGoogle()) { try { const d = await api('getRoutes', { comune: nome + ' (rete v4)' }); if (d && d.v === 4) { r = d; await DB.put('reti', r, nome); } } catch (e) { } }
      if (!r && scarica) r = await scaricaComune(nome);
      if (nome !== cfg.comune) return;
      if (r) attivaRete(r, await DB.get('visti', nome));
    } catch (e) { caricamento = { nome, errore: e.message, log: [] }; }
    aggiorna(true); caricaCase();
    if (G && !LS.get('aiutoVisto', false)) { LS.set('aiutoVisto', true); apriAiuto(); }
  }
  async function scaricaComune(nome) {
    caricamento = { nome, log: [] }; pannello();
    const log = m => { caricamento.log.push(m); const el = $('logCarica'); if (el) el.textContent = caricamento.log.slice(-3).join('\n'); };
    const r = await Planner.scaricaRete(nome, log);
    await DB.put('reti', r, nome);
    if (conGoogle()) api('saveRoutes', { comune: nome + ' (rete v4)', plan: r }).catch(() => { });
    caricamento = null;
    return r;
  }
  function attivaRete(r, v) {
    R = r; G = Planner.prepara(r);
    { let a = 90, b = 180, c = -90, d = -180; for (let i = 0; i < r.lat.length; i++) { const la = r.lat[i], lo = r.lon[i]; if (la < a) a = la; if (la > c) c = la; if (lo < b) b = lo; if (lo > d) d = lo; } G.confini = L.latLngBounds([[a, b], [c, d]]); }
    visti = v && v.id === r.id && v.v && v.v.length === G.m ? v.v : new Uint16Array(G.m);
    if (S.rotta && S.rotta.rete !== R.id) { S.rotta = null; if (S.fase === 'cammino') S.fase = 'home'; }
    if (!S.migrato) {
      // progressi della versione precedente (giri v3)
      const p3 = LS.get('plan_' + cfg.comune, null), s3 = LS.get('stato3_' + cfg.comune, null);
      let n = 0;
      if (p3 && p3.v === 3 && s3) {
        n = Planner.daV3(G, visti, p3, s3);
        (p3.auto || []).forEach((a, i) => { if (s3.autoViste && s3.autoViste[i]) (R.isolate || []).forEach((b, j) => { if (dist([a.lat, a.lon], [b.lat, b.lon]) < 80) S.isolateViste[j] = true; }); });
      }
      S.migrato = true; salvaStato(); salvaVisti();
      if (n) setTimeout(() => toast('Le strade dei giri già fatti sono segnate come viste.', 'ok', 5000), 800);
    }
    primaVista = true; disegnaRete();
    sincronizzaCopertura(false);
  }

  // copertura condivisa tra telefono e computer (solo con Google collegato)
  const b64da = u16 => { const b = new Uint8Array(u16.buffer, u16.byteOffset, u16.byteLength); let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, i + 8192)); return btoa(s); };
  const u16da = s => { const bin = atob(s), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return new Uint16Array(b.buffer); };
  async function sincronizzaCopertura(soloInvio) {
    if (!conGoogle() || !G) return;
    const nome = cfg.comune, id = R.id;
    try {
      if (!soloInvio) {
        const d = await api('getRoutes', { comune: nome + ' (copertura)' });
        if (d && d.id === id && nome === cfg.comune) {
          const altri = u16da(d.b64); let cambi = 0;
          if (altri.length === visti.length) for (let i = 0; i < visti.length; i++) if (altri[i] > visti[i]) { visti[i] = altri[i]; cambi++; }
          if (cambi) { salvaVisti(); disegnaRete(); pannello(); }
        }
      }
      if (nome === cfg.comune) await api('saveRoutes', { comune: nome + ' (copertura)', plan: { id, b64: b64da(visti), ts: Date.now() } });
    } catch (e) { }
  }

  // ---------- mappa ----------
  const map = L.map('map', { zoomControl: false }).setView([42.6, 12.4], 6);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  map.createPane('rete').style.zIndex = 405;
  const tela = L.canvas({ padding: 0.4, pane: 'rete' });
  map.createPane('dafare').style.zIndex = 420; map.createPane('prossimo').style.zIndex = 430;
  const lRete = L.layerGroup().addTo(map), lRotta = L.layerGroup().addTo(map), lExtra = L.layerGroup().addTo(map), lCase = L.layerGroup().addTo(map), lIo = L.layerGroup().addTo(map);
  let segui = true, primaVista = true;
  map.on('dragstart', () => { segui = false; });
  const VERDE = '#2e7d4f', BLU = '#1d5fd1', OCRA = '#f2a900';
  const pEtichetta = (testo, altro) => L.divIcon({ className: '', html: `<div class="etichetta-p${altro ? ' altro' : ''}">${testo}</div>`, iconSize: altro ? [34, 34] : [40, 40], iconAnchor: altro ? [17, 17] : [20, 20] });
  const iconaAuto = () => L.divIcon({ className: '', html: `<div class="etichetta-p altro" style="width:36px;height:36px">${ICO.auto.replace('<svg', '<svg width="22" height="22"')}</div>`, iconSize: [36, 36], iconAnchor: [18, 18] });
  function pulisciMappa() { lRete.clearLayers(); lRotta.clearLayers(); lExtra.clearLayers(); lCase.clearLayers(); marcatori.clear(); }

  // strade con case: blu da vedere, verdi già viste (pezzi uniti in linee lunghe per disegnare veloce)
  function catene(sel) {
    const usato = new Uint8Array(G.m), out = [];
    const altro = (v, e0) => { let n = 0, f = -1; for (let p = G.start[v]; p < G.start[v + 1]; p++) { const e = G.adj[p]; if (e !== e0 && sel(e)) { n++; f = e; } } return n === 1 ? f : -1; };
    for (let e = 0; e < G.m; e++) {
      if (usato[e] || !sel(e)) continue;
      usato[e] = 1; const nodi = [G.EU[e], G.EV[e]];
      for (const verso of [1, 0]) {
        let ultimoE = e;
        for (;;) {
          const v = verso ? nodi[nodi.length - 1] : nodi[0], f = altro(v, ultimoE);
          if (f < 0 || usato[f]) break;
          usato[f] = 1; ultimoE = f; const u = G.EU[f] === v ? G.EV[f] : G.EU[f];
          if (verso) nodi.push(u); else nodi.unshift(u);
        }
      }
      out.push(nodi.map(v => [R.lat[v], R.lon[v]]));
    }
    return out;
  }
  function disegnaRete() {
    lRete.clearLayers(); if (!G) return;
    const da = dv();
    const fatte = catene(e => G.ER[e] && !da(e)), dafare = catene(e => da(e));
    if (dafare.length) L.polyline(dafare, { renderer: tela, pane: 'rete', color: BLU, weight: 4, opacity: S.fase === 'cammino' ? .35 : .55, interactive: false }).addTo(lRete);
    if (fatte.length) L.polyline(fatte, { renderer: tela, pane: 'rete', color: VERDE, weight: 6, opacity: .85, interactive: false }).addTo(lRete);
  }
  let tRete = null;
  const ridisegnaRete = () => { if (tRete) return; tRete = setTimeout(() => { tRete = null; disegnaRete(); }, 2500); };

  function disegna(centra) {
    lRotta.clearLayers(); lExtra.clearLayers();
    if (!G) { if (centra && posizione) map.setView([posizione.lat, posizione.lng], 14); return; }
    let bounds = null;
    if (S.fase === 'home') {
      if (anteprima) {
        const c = anteprima.rotta.coords;
        L.polyline(c, { pane: 'dafare', color: '#fff', weight: 9, opacity: .9 }).addTo(lRotta);
        L.polyline(c, { pane: 'dafare', color: BLU, weight: 5, opacity: .95 }).addTo(lRotta);
        frecce(anteprima.rotta, 0, 99999, 160);
        L.marker(c[0], { icon: pEtichetta('P'), zIndexOffset: 500 }).addTo(lExtra);
        bounds = L.latLngBounds(c);
      } else if (zone) {
        zone.forEach((z, i) => L.marker([z.lat, z.lon], { icon: pEtichetta(i + 1), zIndexOffset: 400 }).on('click', () => sceltaZona(z)).addTo(lExtra));
        const pts = zone.map(z => [z.lat, z.lon]); if (posizione) pts.push([posizione.lat, posizione.lng]);
        bounds = L.latLngBounds(pts);
      } else if (primaVista || centra) bounds = G.confini;
    } else if (S.fase === 'verso' && S.meta) {
      L.marker([S.meta.lat, S.meta.lon], { icon: pEtichetta('P'), zIndexOffset: 500 }).addTo(lExtra);
      if (anteprima) L.polyline(anteprima.rotta.coords, { pane: 'dafare', color: BLU, weight: 5, opacity: .8 }).addTo(lRotta);
      const pts = [[S.meta.lat, S.meta.lon]]; if (posizione) pts.push([posizione.lat, posizione.lng]);
      bounds = L.latLngBounds(pts);
    } else if (S.fase === 'macchina') {
      (R.isolate || []).forEach((s, i) => { if (!S.isolateViste[i]) L.marker([s.lat, s.lon], { icon: iconaAuto() }).addTo(lExtra); });
      const pts = (R.isolate || []).filter((_, i) => !S.isolateViste[i]).map(s => [s.lat, s.lon]);
      if (pts.length) bounds = L.latLngBounds(pts);
    } else if (S.fase === 'cammino' && S.rotta) {
      const r = S.rotta, c = r.coords, p = S.prog, I = info(r), da = dv();
      if (S.auto) L.marker([S.auto.lat, S.auto.lon], { icon: pEtichetta('P'), zIndexOffset: 500 }).addTo(lExtra);
      if (c.length > 1) {
        L.polyline(c.slice(p), { pane: 'dafare', color: '#fff', weight: 11, opacity: .9, interactive: false }).addTo(lRotta);
        const guarda = k => r.lk[k] === '1' && da(r.pezzi[k]);
        let i = p;
        while (i < c.length - 1) {
          const tipo = guarda(i); let j = i;
          while (j < c.length - 1 && guarda(j) === tipo) j++;
          L.polyline(c.slice(i, j + 1), tipo ? { pane: 'dafare', color: BLU, weight: 7, opacity: .95, interactive: false } : { pane: 'dafare', color: BLU, weight: 5, opacity: .7, dashArray: '1 10', lineCap: 'round', interactive: false }).addTo(lRotta);
          i = j;
        }
        let j = p; while (j < c.length - 1 && I.cc[j] - I.cc[p] < 300) j++;
        L.polyline(c.slice(p, j + 1), { pane: 'prossimo', color: OCRA, weight: 9, opacity: 1, interactive: false }).addTo(lRotta);
        frecce(r, p, 1200, 90);
      }
      bounds = L.latLngBounds(c.slice(p, Math.min(c.length, p + 40)));
    }
    if (centra && bounds && bounds.isValid()) { map.fitBounds(bounds, { paddingTopLeft: [20, S.fase === 'home' ? 30 : 150], paddingBottomRight: [70, Math.min(440, altezzaPannello() + 20)], maxZoom: 18 }); primaVista = false; }
  }
  function frecce(r, p, quanto, passo) {
    const c = r.coords, I = info(r); let ultimo = -1e9;
    for (let k = p + 1; k < c.length && I.cc[k] - I.cc[p] < quanto; k++) {
      if (I.cc[k] - ultimo < passo) continue; ultimo = I.cc[k];
      const ang = bearing(c[k - 1], c[k]);
      L.marker(c[k], { interactive: false, keyboard: false, pane: 'prossimo', icon: L.divIcon({ className: '', html: `<svg class="freccia" viewBox="0 0 18 18" style="transform:rotate(${ang}deg)"><path d="M4 12l5-6 5 6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`, iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(lRotta);
    }
  }

  // ---------- percorso: distanze, tempi, svolte ----------
  const cache = new WeakMap();
  function info(r) {
    if (cache.has(r)) return cache.get(r);
    const c = r.coords, cc = [0], tt = [0];
    for (let i = 1; i < c.length; i++) { const d = dist(c[i - 1], c[i]); cc.push(cc[i - 1] + d); tt.push(tt[i - 1] + d / ((r.lk && r.lk[i - 1] === '1') ? Planner.WALK_KMH * 1000 : Planner.FAST_KMH * 1000)); }
    const n = r.n || [], steps = [];
    let cur = { i0: 0, nome: n[0], svolta: 0 };
    for (let i = 1; i < c.length - 1; i++) {
      const d = angolo(bearing(c[i], c[i + 1]), bearing(c[i - 1], c[i]));
      if (n[i] !== cur.nome || Math.abs(d) > 150) { cur.i1 = i; steps.push(cur); cur = { i0: i, nome: n[i], svolta: d }; }
    }
    cur.i1 = Math.max(0, c.length - 1); steps.push(cur);
    for (let k = steps.length - 2; k > 0; k--) {
      const s = steps[k], a = steps[k - 1], b = steps[k + 1];
      if (cc[s.i1] - cc[s.i0] < 15 && Math.abs(s.svolta) <= 150 && Math.abs(b.svolta) <= 150 && a.nome === b.nome) { a.i1 = b.i1; steps.splice(k, 2); }
    }
    const v = { cc, tt, steps };
    cache.set(r, v);
    return v;
  }
  const restoOre = r => { const I = info(r); return I.tt[I.tt.length - 1] - I.tt[Math.min(S.prog, I.tt.length - 1)]; };
  const restoM = r => { const I = info(r); return I.cc[I.cc.length - 1] - I.cc[Math.min(S.prog, I.cc.length - 1)]; };
  const nomeVia = (r, idx) => (r.names && r.names[idx]) || 'strada senza nome';
  const GENERICI = { 'sentiero': 'nel sentiero', 'scalinata': 'nella scalinata', 'pista ciclabile': 'nella pista ciclabile', 'strada sterrata': 'nella strada sterrata', 'stradina': 'nella stradina', 'zona pedonale': 'nella zona pedonale', 'strada senza nome': 'nella strada senza nome' };
  const inVia = nome => GENERICI[nome] || 'in ' + nome;
  function tipoSvolta(d) { const a = Math.abs(d); return a < 30 ? 'dritto' : a > 150 ? 'indietro' : d > 0 ? 'destra' : 'sinistra'; }
  function testoSvolta(d, nome, stessaVia) {
    const a = Math.abs(d), lato = d > 0 ? 'destra' : 'sinistra';
    if (a > 150) return stessaVia ? 'in fondo torna indietro' : 'torna indietro ' + inVia(nome);
    if (a < 30) return 'prosegui dritto ' + inVia(nome);
    if (a < 60) return 'tieni la ' + lato + ' ' + inVia(nome);
    return 'gira a ' + lato + ' ' + inVia(nome);
  }
  const snella = r => ({ coords: r.coords, n: r.n, names: r.names, lk: r.lk, pezzi: Array.from(r.pezzi), km: r.km, kmNuovi: r.kmNuovi, ore: r.ore, via: r.via, ritorno: !!r.ritorno, libero: !!r.libero, rete: R.id });

  // ---------- indicazione in alto ----------
  let fuori = 0, giaDetto = {};
  function guida() {
    const box = $('guida');
    const mostra = html => { box.className = 'visibile'; box.innerHTML = html; };
    if (!G || S.fase === 'home') { box.className = ''; box.innerHTML = ''; return; }
    if (S.fase === 'macchina') return mostra(`<div class="guida-card fatto"><div class="guida-icona">${ICO.auto.replace('<svg', '<svg style="color:#fff"')}</div><div class="guida-testi"><div class="guida-azione">Case isolate</div><div class="guida-sotto">Guardale passando in macchina.</div></div></div>`);
    if (S.fase === 'verso') return mostra(`<div class="guida-card parcheggio"><div class="guida-icona">${FRECCIA.arrivo}</div><div class="guida-testi"><div class="guida-azione">Parcheggia ${S.meta.via ? 'in ' + esc(S.meta.via) : 'al punto P'}</div><div class="guida-sotto">${esc(S.meta.frazione || '')}${S.meta.nome ? ', ' + esc(S.meta.nome) : ''}</div></div></div>`);
    const r = S.rotta; if (!r) { box.className = ''; return; }
    const c = r.coords, p = S.prog, I = info(r);
    if (fuori >= 3) {
      let d = Infinity; if (posizione) for (let i = p; i < Math.min(c.length, p + 40); i++) d = Math.min(d, dist([posizione.lat, posizione.lng], c[i]));
      return mostra(`<div class="guida-card fuori"><div class="guida-icona">${FRECCIA.fuori}</div><div class="guida-testi"><div class="guida-azione">Strada diversa</div><div class="guida-sotto">Aggiorno il percorso da dove sei…</div></div></div>`);
    }
    const k = Math.max(0, I.steps.findIndex(s => p >= s.i0 && p < s.i1));
    const s = I.steps[k], dopo = I.steps[k + 1], d = I.cc[s.i1] - I.cc[p];
    const qui = nomeVia(r, r.n[Math.min(p, r.n.length - 1)]);
    let icona, azione;
    if (!dopo) { icona = FRECCIA.arrivo; azione = r.ritorno || (S.auto && !r.libero) ? 'sei alla macchina' : 'fine di questo tratto'; }
    else { const nome = nomeVia(r, dopo.nome); icona = FRECCIA[tipoSvolta(dopo.svolta)]; azione = testoSvolta(dopo.svolta, nome, dopo.nome === s.nome); }
    const pz = r.pezzi[Math.min(p, r.pezzi.length - 1)], guarda = r.lk[Math.min(p, r.lk.length - 1)] === '1' && dv()(pz);
    const badge = r.ritorno ? '<span class="badge passa">Verso la macchina</span>' : guarda ? '<span class="badge guarda">Guarda le case</span>' : '<span class="badge passa">Solo passaggio</span>';
    mostra(`<div class="guida-card"><div class="guida-icona">${icona}</div><div class="guida-testi"><div class="guida-dist">${metriTesto(d)}</div><div class="guida-azione">${esc(azione)}</div><div class="guida-sotto">${badge}<span>${esc(qui === 'strada senza nome' ? 'Strada senza nome' : qui)}</span></div></div></div>`);
    const id = r.coords.length + '-' + r.km.toFixed(3) + '-' + k;
    if (dopo && d < 60 && d >= 20 && !giaDetto[id + 'a']) { giaDetto[id + 'a'] = 1; parla(metriTesto(d) + ', ' + azione); }
    if (dopo && d < 20 && !giaDetto[id + 'b']) { giaDetto[id + 'b'] = 1; parla('Adesso ' + azione); vibra([120, 80, 120]); }
  }

  // ---------- pannello in basso ----------
  const TEMPI = [{ m: 30, t: '30 min' }, { m: 60, t: '1 ora' }, { m: 120, t: '2 ore' }, { m: 180, t: '3 ore' }, { m: 240, t: '4 ore' }, { m: 360, t: '6 ore' }, { m: 0, t: 'Senza limite' }];
  let anteprima = null, zone = null, avvisoZone = '', scegliendo = false;
  const pos4 = () => posizione ? { lat: posizione.lat, lon: posizione.lng } : null;
  const vicinoAllaRete = (p, m = 300) => p && G && Planner.nodoVicino(G, p.lat, p.lon, m) >= 0;

  function pannello() {
    const box = $('pannelloCorpo');
    if (S.fase !== ultimaFase) { if (ultimaFase !== null && panChiuso) chiudiPannello(false); const cambiaRete = (S.fase === 'cammino') !== (ultimaFase === 'cammino'); ultimaFase = S.fase; if (cambiaRete && G) disegnaRete(); }
    const comuneChip = `<button class="chip-comune" id="bComune">${ICO.mappa}<span>${esc(cfg.comune || 'Scegli il comune')}</span><span aria-hidden="true">▾</span></button>`;
    const on = (id, f) => { const el = $(id); if (el) el.onclick = f; };
    if (!cfg.comune) {
      box.innerHTML = `<h1>Ciao, questo è Agente Moni</h1><div class="intro"><p>Ti guida a piedi strada per strada, si ricorda le strade che hai già fatto e ti fa salvare le case con foto e nota vocale.</p></div>
        <button class="tasto primario" id="bQui">${ICO.posizione}Usa il comune dove sono</button>
        <label class="campo" for="nomeComune">Oppure scrivi il nome del comune</label><input class="campo" id="nomeComune" placeholder="Per esempio Cazzago San Martino" autocomplete="off">
        <button class="tasto" id="bNome">Scarica questo comune</button><div class="log" id="logQui"></div>`;
      on('bQui', comuneDaPosizione);
      on('bNome', () => { const n = $('nomeComune').value.trim(); if (n) aggiungiComune(n); });
      return;
    }
    if (caricamento) {
      if (caricamento.errore) {
        box.innerHTML = `${comuneChip}<h1>Mappa non scaricata</h1><p>${esc(caricamento.errore)}</p><button class="tasto primario" id="bRiprova">${ICO.rifai}Riprova</button><button class="tasto" id="bAltro">Scegli un altro comune</button>`;
        on('bRiprova', () => { caricamento = null; preparaComune(true); }); on('bAltro', apriComuni); on('bComune', apriComuni);
      } else {
        box.innerHTML = `<h1>Preparo la mappa di ${esc(caricamento.nome)}</h1><p>Si fa una volta sola per ogni comune e ci vogliono 1-3 minuti. Lascia l'app aperta.</p><div class="avanz"><div style="width:100%;opacity:.35"></div></div><div class="log" id="logCarica">${esc(caricamento.log.slice(-3).join('\n'))}</div>`;
      }
      return;
    }
    if (!G) { box.innerHTML = `${comuneChip}<h1>Un momento…</h1><p>Apro la mappa di ${esc(cfg.comune)}.</p>`; on('bComune', apriComuni); return; }
    const av = avanzamento(), perc = Math.round(av.perc * 100);
    const testa = `${comuneChip}<div class="avanz-testo" style="margin-top:8px"><span><b>${perc}%</b> delle strade con case viste</span><span>${kmTesto(av.kmFatti * 1000)} su ${kmTesto(av.kmTot * 1000)}</span></div><div class="avanz"><div style="width:${perc}%"></div></div>`;

    if (S.fase === 'home') {
      let html = testa;
      const rich = daRichiamare(); if (rich.length) html += `<button class="vicina" id="bRichiami" style="width:100%;border:0;text-align:left">${ICO.telefono.replace('<svg', '<svg width="26" height="26"')}<span><b>${rich.length === 1 ? '1 casa da richiamare' : rich.length + ' case da richiamare'}</b><br>${esc(rich[0].address || 'Casa')}${rich.length > 1 ? ' e altre' : ''}</span></button>`;
      if (S.ultima && Date.now() - S.ultima.quando < 14 * 3600e3) html += `<p class="nota-ok">Ultima uscita: ${kmTesto(S.ultima.kmNuovi * 1000)} di strade nuove, ${S.ultima.case === 1 ? '1 casa salvata' : S.ultima.case + ' case salvate'}.</p>`;
      if (anteprima) {
        const a = anteprima, r = a.rotta, lontano = a.meta && !(posizione && dist([posizione.lat, posizione.lng], [a.meta.lat, a.meta.lon]) < 200);
        html += `<h1>Giro di ${oreTesto(r.ore)}</h1><p>${kmTesto(r.km * 1000)} a piedi, di cui <b>${kmTesto(r.kmNuovi * 1000)}</b> di case da vedere${r.via ? ', soprattutto ' + esc(inVia(r.via)) : ''}. ${a.torna ? 'Finisci dove hai lasciato la macchina.' : 'Finisci dove capita: poi ti riporto alla macchina quando vuoi.'}</p>
          <button class="tasto primario" id="bVia">${lontano ? ICO.auto + 'Andiamo' : ICO.cammina + 'Inizia a camminare'}</button>
          ${a.minuti ? `<button class="interruttore" id="bTorna" role="switch" aria-checked="${a.torna}"><span>Torna alla macchina alla fine<small>${a.torna ? 'Il giro finisce dove parti' : 'Il giro finisce sull\'ultima strada nuova'}</small></span><span class="leva"></span></button>` : ''}
          <div class="riga"><button class="link" id="bCambiaTempo">Cambia tempo</button><button class="link" id="bAnnulla">Indietro</button></div>`;
        box.innerHTML = html;
        on('bVia', iniziaGiro); on('bAnnulla', () => { anteprima = null; zone = null; aggiorna(true); });
        on('bCambiaTempo', () => { const m = a.meta; anteprima = null; scegliTempoPoi = m || a.da; aggiorna(false); });
        on('bTorna', () => { cfg.tornaAuto = !a.torna; salvaCfg(); calcolaAnteprima(a.da, a.minuti, cfg.tornaAuto, a.meta); });
      } else if (zone) {
        html += `<h1>Dove vuoi andare?</h1>${avvisoZone ? `<p>${esc(avvisoZone)}</p>` : ''}` + (zone.length ? zone.map((z, i) => `<button class="zona" data-z="${i}"><span class="num-giro">${i + 1}</span><div><b>${esc(z.frazione)}${z.via ? ', ' + esc(z.via) : ''}</b><span>${kmTesto(z.km * 1000)} di case da vedere</span></div>${z.distanza != null ? `<span class="dist">${kmTesto(z.distanza)}</span>` : ''}</button>`).join('') : '<p>Hai visto tutte le strade con case del comune.</p>') +
          `<div class="riga"><button class="link" id="bMappa">Scegli sulla mappa</button><button class="link" id="bAnnulla">Indietro</button></div>`;
        box.innerHTML = html;
        box.querySelectorAll('[data-z]').forEach(b => b.onclick = () => sceltaZona(zone[+b.dataset.z]));
        on('bMappa', iniziaSceltaMappa); on('bAnnulla', () => { zone = null; aggiorna(true); });
      } else {
        const nIso = (R.isolate || []).filter((_, i) => !S.isolateViste[i]).length;
        if (av.perc >= 0.995) html += `<h1>Hai visto tutto ${esc(cfg.comune)}</h1><p>Puoi passare a un altro comune toccando il nome qui sopra${cfg.rivedi ? '' : ', oppure nelle impostazioni scegli dopo quanto tempo ripassare'}.</p>`;
        else html += `<h1>Quanto tempo hai?</h1><div class="tempi">${TEMPI.map(t => `<button class="tempo${t.m === cfg.minuti ? ' scelto' : ''}" data-min="${t.m}">${t.t}</button>`).join('')}</div>`;
        html += `<div class="riga"><button class="link" id="bMappa">Scegli sulla mappa</button>${nIso ? `<button class="link" id="bAuto">Case isolate (${nIso})</button>` : ''}</div><button class="tasto piccolo" id="bCasaQui">${ICO.piu}Salva una casa qui</button>`;
        box.innerHTML = html;
        box.querySelectorAll('.tempo').forEach(b => b.onclick = () => scegliTempo(+b.dataset.min));
        on('bMappa', iniziaSceltaMappa); on('bAuto', () => { S.fase = 'macchina'; salvaStato(); aggiorna(true); }); on('bCasaQui', () => apriNuovaCasa());
      }
      on('bComune', apriComuni); on('bRichiami', () => { filtro = '__richiamo'; apriCase(); });
      return;
    }
    if (S.fase === 'verso') {
      const m = S.meta, arrivata = posizione && dist([posizione.lat, posizione.lng], [m.lat, m.lon]) < 180;
      box.innerHTML = `<h1>${arrivata ? 'Sei al parcheggio' : 'Vai a parcheggiare'}</h1><p>${esc(m.frazione || '')}${m.via ? ', ' + esc(m.via) : ''}. Poi il giro parte da dove lasci la macchina.</p>
        ${arrivata ? '' : `<a class="tasto ocra" href="${mapsAuto(m.lat, m.lon)}" target="_blank" rel="noopener">${ICO.auto}Portami lì con Google Maps</a>`}
        <button class="tasto ${arrivata ? 'verde' : 'primario'}" id="bCammina">${ICO.cammina}${arrivata ? 'Inizia a camminare' : 'Sono qui, inizio'}</button>
        <div class="riga"><button class="link" id="bCambia">Cambia zona</button><button class="link" id="bStop">Basta per oggi</button></div>`;
      on('bCammina', () => iniziaCammino(S.minuti, S.torna, null));
      on('bCambia', () => { S.fase = 'home'; S.meta = null; salvaStato(); anteprima = null; scegliTempo(S.minuti || cfg.minuti, true); });
      on('bStop', bastaPerOggi);
      return;
    }
    if (S.fase === 'cammino') {
      const r = S.rotta, ses = S.sessione || { km0: av.kmFatti };
      const nuovi = Math.max(0, av.kmFatti - ses.km0) * 1000;
      const resto = r ? restoOre(r) : 0, rM = r ? restoM(r) : 0;
      const fineTxt = S.fine ? (r && (r.ritorno || !r.libero) && S.auto ? 'Alla macchina' : 'Finisci') + ' verso le <b>' + orario(Math.max(Date.now() + resto * 3600e3, 0)) + '</b>' : 'Senza limite di tempo';
      const perc = r ? Math.round(100 * (1 - rM / Math.max(1, info(r).cc[info(r).cc.length - 1]))) : 0;
      box.innerHTML = `<div class="stats"><div class="stat"><b>${kmTesto(nuovi)}</b><span>viste oggi</span></div><div class="stat"><b>${kmTesto(rM)}</b><span>mancano</span></div><div class="stat"><b>${oreTesto(resto).replace(' minuti', ' min')}</b><span>ancora</span></div></div>
        <div class="avanz" role="progressbar" aria-valuenow="${perc}" aria-valuemin="0" aria-valuemax="100"><div style="width:${perc}%"></div></div>
        <p style="margin:0">${fineTxt}${S.fine && Date.now() > S.fine ? ' · il tempo che avevi è finito' : ''}</p>
        <button class="tasto verde" id="bNuova">${ICO.piu}Nuova casa</button>
        <div class="riga">${S.auto && !(r && r.ritorno) ? `<button class="tasto piccolo" id="bTornaAuto">${ICO.auto}Torno alla macchina</button>` : ''}<button class="tasto piccolo" id="bRicalcola">${ICO.rifai}Ricalcola</button></div>
        <button class="link" id="bStop">Basta per oggi</button>`;
      on('bNuova', () => apriNuovaCasa());
      on('bTornaAuto', () => { const rr = Planner.versoPunto(G, visti, pos4() || (r ? { lat: r.coords[S.prog][0], lon: r.coords[S.prog][1] } : S.auto), S.auto, cfg.rivedi); if (rr) { impostaRotta(rr); toast('Ti porto alla macchina: ' + kmTesto(rr.km * 1000), 'ok'); } });
      on('bRicalcola', () => ricalcola('mano'));
      on('bStop', () => { if (confirm('Finisci per oggi? Le strade viste restano segnate.')) bastaPerOggi(); });
      return;
    }
    if (S.fase === 'macchina') {
      const lista = (R.isolate || []).map((s, i) => ({ s, i })).filter(o => !S.isolateViste[o.i]);
      const da = posizione ? [posizione.lat, posizione.lng] : [lista[0] ? lista[0].s.lat : 0, lista[0] ? lista[0].s.lon : 0];
      lista.sort((a, b) => dist(da, [a.s.lat, a.s.lon]) - dist(da, [b.s.lat, b.s.lon]));
      box.innerHTML = `<h1>Case isolate</h1><p>${lista.length ? 'Cascine e case lontane dal paese: guardale passando in macchina. Quando ci passi vicino si segnano da sole.' : 'Le hai viste tutte.'}</p><div class="lista-auto">` +
        lista.slice(0, 40).map(o => `<div class="giro-riga"><span class="num-giro">${ICO.auto}</span><div><b>${esc(Planner.frazione(G, o.s.lat, o.s.lon))}</b><span>${posizione ? kmTesto(dist(da, [o.s.lat, o.s.lon])) + ' da qui' : ''}</span></div><a class="tasto piccolo" style="width:auto;margin:0" target="_blank" rel="noopener" href="${mapsAuto(o.s.lat, o.s.lon)}">Portami</a><button class="togli-giro" data-vista="${o.i}" aria-label="Segna come vista">${ICO.ok}</button></div>`).join('') +
        `</div><button class="tasto primario" id="bFineAuto">Ho finito</button>`;
      box.querySelectorAll('[data-vista]').forEach(b => b.onclick = () => { S.isolateViste[b.dataset.vista] = true; salvaStato(); aggiorna(false); });
      on('bFineAuto', () => { S.fase = 'home'; salvaStato(); aggiorna(true); });
    }
  }

  // ---------- scelta del giro ----------
  let scegliTempoPoi = null; // dopo "cambia tempo": riparto dallo stesso punto
  function scegliTempo(min, forzaZone) {
    cfg.minuti = min; salvaCfg();
    const p = pos4();
    if (scegliTempoPoi) { const da = scegliTempoPoi; scegliTempoPoi = null; return calcolaAnteprima(da.lat != null ? { lat: da.lat, lon: da.lon } : da, min, cfg.tornaAuto, da.frazione ? da : null); }
    if (!forzaZone && vicinoAllaRete(p, 250)) {
      const r = Planner.percorso(G, visti, p, { minuti: min || 60, a: min && cfg.tornaAuto ? p : null, rivedi: cfg.rivedi });
      if (r && r.kmNuovi >= 0.15) { anteprima = { rotta: r, da: p, minuti: min, torna: !!(min && cfg.tornaAuto), meta: null }; zone = null; aggiorna(true); return; }
      avvisoZone = 'Qui intorno hai già visto quasi tutto. Ecco le zone più vicine con case da vedere:';
    } else avvisoZone = p ? 'Ecco le zone con case da vedere, la più vicina per prima:' : 'Ecco le zone con case da vedere (il GPS non ha ancora trovato la tua posizione):';
    zone = Planner.zoneDaFare(G, visti, p, cfg.rivedi);
    anteprima = null; aggiorna(true);
  }
  function sceltaZona(z) { calcolaAnteprima({ lat: z.parcheggio.lat, lon: z.parcheggio.lon }, cfg.minuti, cfg.tornaAuto, { lat: z.parcheggio.lat, lon: z.parcheggio.lon, via: z.via, frazione: z.frazione, nome: z.parcheggio.nome }); }
  function calcolaAnteprima(da, min, torna, meta) {
    const r = Planner.percorso(G, visti, da, { minuti: min || 60, a: min && torna ? da : null, rivedi: cfg.rivedi });
    if (!r) { toast('Da lì non ci sono strade da vedere: scegli un altro punto.', 'errore'); zone = Planner.zoneDaFare(G, visti, pos4(), cfg.rivedi); anteprima = null; aggiorna(true); return; }
    anteprima = { rotta: r, da, minuti: min, torna: !!(min && torna), meta }; zone = null;
    aggiorna(true);
  }
  function iniziaSceltaMappa() {
    scegliendo = true; $('scegliMappa').classList.add('visibile'); chiudiPannello(true);
    toast('Tocca la mappa nel punto da cui vuoi partire.');
  }
  $('annullaScelta').onclick = () => { scegliendo = false; $('scegliMappa').classList.remove('visibile'); chiudiPannello(false); };
  map.on('click', e => {
    if (!scegliendo || !G) return;
    scegliendo = false; $('scegliMappa').classList.remove('visibile'); chiudiPannello(false);
    const { lat, lng } = e.latlng, v = Planner.nodoVicino(G, lat, lng, 400);
    if (v < 0) { toast('Lì non ci sono strade del comune: tocca più vicino al paese.', 'errore'); return; }
    const ind = Planner.indirizzoVicino(G, R.lat[v], R.lon[v]);
    calcolaAnteprima({ lat: R.lat[v], lon: R.lon[v] }, cfg.minuti, cfg.tornaAuto, { lat: R.lat[v], lon: R.lon[v], via: ind.via, frazione: ind.paese, nome: '' });
  });

  function iniziaGiro() {
    const a = anteprima; if (!a) return;
    S.minuti = a.minuti; S.torna = a.torna;
    if (a.meta && !(posizione && dist([posizione.lat, posizione.lng], [a.meta.lat, a.meta.lon]) < 200)) {
      S.fase = 'verso'; S.meta = a.meta; salvaStato(); aggiorna(true); return;
    }
    anteprima = null;
    iniziaCammino(a.minuti, a.torna, a.rotta);
  }
  function iniziaCammino(minuti, torna, rotta) {
    const p = pos4() || (S.meta ? { lat: S.meta.lat, lon: S.meta.lon } : null);
    if (!p) { toast('Aspetto il GPS: esci all\'aperto e riprova.', 'errore'); return; }
    anteprima = null; zone = null;
    S.fase = 'cammino'; S.meta = null; S.minuti = minuti; S.torna = torna;
    S.auto = { lat: p.lat, lon: p.lon }; S.rotta = null; // la macchina resta qui: serve anche per "Torno alla macchina"
    S.fine = minuti ? Date.now() + minuti * 60e3 : null;
    S.sessione = { inizio: Date.now(), km0: avanzamento().kmFatti, metri: 0 }; S.avvisi = {};
    salvaStato();
    if (cfg.notifiche == null) chiediNotifiche();
    if (rotta && rotta.coords.length && dist(rotta.coords[0], [p.lat, p.lon]) < 80) impostaRotta(rotta, true); else ricalcola('inizio');
    segui = true; if (posizione) map.setView([posizione.lat, posizione.lng], 18);
    parla('Si parte. Segui la linea gialla.');
  }
  function impostaRotta(r, silenzioso) {
    S.rotta = snella(r); S.prog = 0; S.calcolo = Date.now(); fuori = 0; giaDetto = {}; avanza.salto = 0;
    salvaStato(); aggiorna(true);
  }
  // percorso nuovo dalla posizione attuale, con il tempo che resta
  function ricalcola(motivo) {
    if (!G) return;
    const p = pos4() || (S.rotta ? { lat: S.rotta.coords[S.prog][0], lon: S.rotta.coords[S.prog][1] } : null); if (!p) return;
    const resto = S.fine ? (S.fine - Date.now()) / 60e3 : 60;
    let r = null;
    if (S.rotta && S.rotta.ritorno && S.auto) r = Planner.versoPunto(G, visti, p, S.auto, cfg.rivedi);
    else if (S.fine && resto < 10 && S.auto && S.torna) r = Planner.versoPunto(G, visti, p, S.auto, cfg.rivedi);
    else r = Planner.percorso(G, visti, p, { minuti: Math.max(10, resto), a: S.fine && S.torna ? S.auto : null, rivedi: cfg.rivedi });
    if (!r || (r.kmNuovi < 0.03 && !r.ritorno)) {
      if (S.auto && S.torna && S.fine) { r = Planner.versoPunto(G, visti, p, S.auto, cfg.rivedi); if (r && r.km > 0.05) { impostaRotta(r); toast('Qui intorno hai visto tutto: ti riporto alla macchina.', 'ok', 5000); return; } }
      S.rotta = null; salvaStato(); finito(true); return;
    }
    const prima = S.rotta;
    impostaRotta(r);
    if (motivo === 'fuori') { toast('Percorso aggiornato da dove sei', 'ok'); parla('Percorso aggiornato.'); notifica('Percorso aggiornato', 'Hai preso un\'altra strada: il giro riparte da dove sei.'); }
    else if (motivo === 'corto') { toast('Ho accorciato il giro per farti tornare in tempo.', 'ok', 5000); parla('Ho accorciato il giro per farti tornare in tempo.'); notifica('Giro accorciato', 'Così torni alla macchina in tempo.'); }
    else if (motivo === 'lungo') { toast('Hai tempo in più: ho aggiunto altre strade.', 'ok', 5000); notifica('Hai tempo in più', 'Ho aggiunto altre strade al giro.'); }
    else if (motivo === 'mano') toast('Percorso ricalcolato: ' + kmTesto(r.kmNuovi * 1000) + ' di case nuove.', 'ok');
    void prima;
  }
  // ogni mezzo minuto: il giro sta nel tempo che resta?
  function controllaTempo() {
    if (!G || S.fase !== 'cammino' || !S.fine) return;
    const av = S.avvisi || (S.avvisi = {}), mancano = (S.fine - Date.now()) / 60e3;
    if (S.minuti >= 30 && mancano <= 10 && mancano > 0 && !av.dieci) { av.dieci = 1; salvaStato(); notifica('Mancano 10 minuti', S.torna ? 'Il giro ti sta già riportando alla macchina.' : 'Tra poco finisce il tempo che avevi.'); if (document.visibilityState === 'visible') toast('Mancano 10 minuti.', 'ok'); }
    if (mancano <= 0 && !av.fine) { av.fine = 1; salvaStato(); notifica('Tempo finito', S.auto ? 'Apri l\'app: ti porto alla macchina.' : 'Il tempo che avevi è finito.'); parla('Il tempo che avevi è finito.'); pannello(); }
    if (!S.rotta || S.rotta.ritorno) return;
    if (Date.now() - S.calcolo < 3 * 60e3) return;
    const restaGiro = restoOre(S.rotta) * 60, restaTempo = (S.fine - Date.now()) / 60e3;
    if (restaGiro > restaTempo + 6) ricalcola('corto');
    else if (restaTempo - restaGiro > 20 && restaTempo > 25) ricalcola('lungo');
  }
  setInterval(controllaTempo, 30000);

  function finito(nienteIntorno) {
    const av = avanzamento(), ses = S.sessione || { km0: av.kmFatti }, nuovi = Math.max(0, av.kmFatti - ses.km0);
    const restoMin = S.fine ? (S.fine - Date.now()) / 60e3 : 60;
    const continua = { t: 'Continua da qui', f: () => { if (S.fine && restoMin < 15) S.fine = Date.now() + 45 * 60e3; ricalcola('continua'); } };
    const zoneF = { t: 'Cerca un\'altra zona', f: () => { S.fase = 'home'; S.rotta = null; salvaStato(); scegliTempo(cfg.minuti, true); } };
    if (nienteIntorno) {
      festa('Qui intorno hai visto tutto', `Oggi: ${kmTesto(nuovi * 1000)} di strade nuove.` + (S.auto ? ' Se vuoi, ti riporto alla macchina.' : ''), [
        ...(S.auto ? [{ t: 'Riportami alla macchina', f: () => { const r = Planner.versoPunto(G, visti, pos4() || S.auto, S.auto, cfg.rivedi); if (r && r.km > 0.05) impostaRotta(r); else bastaPerOggi(); } }] : []),
        zoneF, { t: 'Basta per oggi', f: bastaPerOggi }]);
      return;
    }
    const r = S.rotta;
    if (r && r.libero && !r.ritorno && (!S.fine || restoMin > 10)) { toast('Continuo con le strade qui vicino.', 'ok'); ricalcola('continua'); return; }
    S.rotta = null; salvaStato();
    const allaMacchina = r && (r.ritorno || !r.libero);
    festa(allaMacchina ? 'Sei alla macchina' : 'Giro finito', `Oggi: ${kmTesto(nuovi * 1000)} di strade nuove, ${caseOggi()} ${caseOggi() === 1 ? 'casa salvata' : 'case salvate'}.` + (S.fine && restoMin > 15 ? ` Hai ancora circa ${oreTesto(restoMin / 60)}.` : ''),
      S.fine && restoMin < 15 ? [{ t: 'Basta per oggi', f: bastaPerOggi }, continua] : [continua, { t: 'Basta per oggi', f: bastaPerOggi }]);
  }
  // promemoria: case da richiamare oggi o in ritardo (tutte, di ogni comune)
  const oggiISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const daRichiamare = () => [...case_.values()].filter(h => h.richiamo && h.richiamo <= oggiISO()).sort((a, b) => a.richiamo < b.richiamo ? -1 : 1);
  const dataTesto = iso => new Date(iso + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  function controllaRichiami() {
    const lista = daRichiamare(); if (!lista.length) return;
    const chiave = oggiISO(); if (LS.get('richiamiAvvisati', '') === chiave) return;
    LS.set('richiamiAvvisati', chiave);
    notifica(lista.length === 1 ? 'Da richiamare oggi' : lista.length + ' case da richiamare', lista.slice(0, 3).map(h => (h.address || 'Casa') + (h.telefono ? ' – ' + h.telefono : '')).join('\n'), 'richiami', true);
  }
  setInterval(controllaRichiami, 30 * 60e3);
  const caseOggi = () => { const da = S.sessione ? S.sessione.inizio : Date.now(); return [...case_.values()].filter(h => h.comune === cfg.comune && h.ts >= da).length; };
  function bastaPerOggi() {
    const av = avanzamento();
    if (S.sessione) S.ultima = { quando: Date.now(), kmNuovi: Math.max(0, av.kmFatti - S.sessione.km0), case: caseOggi() };
    Object.assign(S, { fase: 'home', meta: null, auto: null, fine: null, rotta: null, prog: 0, sessione: null });
    anteprima = null; zone = null;
    salvaStato(); salvaVisti(); aggiorna(true); sincronizzaCopertura(true); inviaTraccia();
  }

  function aggiorna(centra) { pannello(); guida(); posizionaTondi(); disegna(centra); }
  function altezzaPannello() { return Math.max(0, Math.round(window.innerHeight - $('pannello').getBoundingClientRect().top)); }
  function posizionaTondi() { const h = altezzaPannello(); $('tondi').style.bottom = (h + 12) + 'px'; $('invio').style.bottom = (h + 12) + 'px'; $('toast').style.bottom = (h + 12) + 'px'; }

  // ---------- pannello trascinabile ----------
  const PAN = $('pannello'), ZONA = $('maniglia'), CORPO = $('pannelloCorpo'), SBIRCIA = 58;
  let panChiuso = false, ultimaFase = null, tr = null, bloccaClick = 0;
  const margineSotto = () => Math.max(0, (parseFloat(getComputedStyle(PAN).paddingBottom) || 16) - 16);
  const corsaChiuso = () => Math.max(0, PAN.offsetHeight - SBIRCIA - margineSotto());
  function seguiPannello() { const fine = performance.now() + 380; const passo = () => { posizionaTondi(); if (performance.now() < fine) requestAnimationFrame(passo); }; requestAnimationFrame(passo); }
  function chiudiPannello(v) { panChiuso = v; PAN.classList.toggle('chiuso', v); ZONA.setAttribute('aria-expanded', String(!v)); CORPO.setAttribute('aria-hidden', String(v)); seguiPannello(); }
  function trInizio(y, target) { tr = { y0: y, yUlt: y, tUlt: performance.now(), v: 0, daZona: panChiuso || ZONA.contains(target), attivo: false, scorre: false }; }
  function trMuovi(y, ev) {
    if (!tr || tr.scorre) return;
    const dy = y - tr.y0;
    if (!tr.attivo) {
      if (Math.abs(dy) < 3) return;
      if (!tr.daZona) {
        const scorribile = CORPO.scrollHeight > CORPO.clientHeight + 1;
        if ((dy < 0 && scorribile) || (dy > 0 && CORPO.scrollTop > 0)) { tr.scorre = true; return; }
        if (dy < 0) { if (ev && ev.cancelable) ev.preventDefault(); return; }
      }
      if (Math.abs(dy) < 8) { if (ev && ev.cancelable) ev.preventDefault(); return; }
      tr.attivo = true; tr.max = corsaChiuso(); tr.base = panChiuso ? tr.max : 0; PAN.classList.add('trascina');
    }
    if (ev && ev.cancelable) ev.preventDefault();
    let off = tr.base + dy;
    if (off < 0) off = off / 4;
    off = Math.min(tr.max, Math.max(-20, off));
    PAN.style.transform = `translateY(${off}px)`;
    const ora = performance.now(); if (ora > tr.tUlt) { tr.v = (y - tr.yUlt) / (ora - tr.tUlt); tr.yUlt = y; tr.tUlt = ora; }
    tr.off = off; posizionaTondi();
  }
  function trFine() {
    if (!tr) return;
    const t = tr; tr = null;
    if (!t.attivo) return;
    bloccaClick = Date.now();
    const chiudi = t.v > 0.35 ? true : t.v < -0.35 ? false : t.off > t.max / 2;
    PAN.classList.remove('trascina'); PAN.style.transform = '';
    chiudiPannello(chiudi);
  }
  PAN.addEventListener('touchstart', e => { if (e.touches.length === 1) trInizio(e.touches[0].clientY, e.target); else tr = null; }, { passive: true });
  PAN.addEventListener('touchmove', e => { if (e.touches.length === 1) trMuovi(e.touches[0].clientY, e); }, { passive: false });
  PAN.addEventListener('touchend', trFine); PAN.addEventListener('touchcancel', trFine);
  ZONA.addEventListener('mousedown', e => { trInizio(e.clientY, e.target); e.preventDefault(); });
  window.addEventListener('mousemove', e => { if (tr) trMuovi(e.clientY, null); });
  window.addEventListener('mouseup', trFine);
  PAN.addEventListener('click', e => {
    if (Date.now() - bloccaClick < 450) { e.preventDefault(); e.stopPropagation(); return; }
    if (panChiuso) { e.preventDefault(); e.stopPropagation(); chiudiPannello(false); return; }
    if (ZONA.contains(e.target)) chiudiPannello(true);
  }, true);
  ZONA.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chiudiPannello(!panChiuso); } });
  PAN.addEventListener('transitionend', e => { if (e.target === PAN) posizionaTondi(); });

  function festa(titolo, testo, bottoni) {
    $('festaScheda').innerHTML = `${ICO.festa}<h2>${esc(titolo)}</h2><p>${esc(testo)}</p>` + bottoni.map((b, i) => `<button class="tasto ${i === 0 ? 'primario' : ''}" data-i="${i}">${esc(b.t)}</button>`).join('');
    $('festa').classList.add('aperto');
    $('festaScheda').querySelectorAll('[data-i]').forEach(el => el.onclick = () => { $('festa').classList.remove('aperto'); bottoni[+el.dataset.i].f(); });
    parla(titolo + '. ' + testo); vibra([80, 60, 80]);
    notifica(titolo, testo, 'fine');
  }

  // ---------- avanzamento lungo il percorso ----------
  let ultimoRicalcoloFuori = 0;
  function avanza(pt) {
    const r = S.rotta; if (!r || r.coords.length < 2) { if (r && r.coords.length < 2) finito(false); return; }
    const c = r.coords, p = S.prog;
    let vicinoMin = Infinity; for (let i = p; i < Math.min(c.length, p + 40); i++) vicinoMin = Math.min(vicinoMin, dist(pt, c[i]));
    if (vicinoMin > 45) fuori++; else if (vicinoMin < 25) fuori = 0;
    // si cerca solo poco più avanti sul percorso (70 m): nei vicoli ciechi andata e ritorno passano dagli stessi punti
    const I = info(r); let best = -1;
    for (let i = p + 1; i < c.length && I.cc[i] - I.cc[p] <= 70; i++) if (dist(pt, c[i]) < 22) { best = i; break; }
    if (best > 0) { while (best + 1 < c.length && I.cc[best + 1] - I.cc[p] <= 70 && dist(pt, c[best + 1]) < 22) best++; avanza.salto = 0; }
    else if (dist(pt, c[p]) >= 35) {
      const j = c.findIndex((q, i) => i >= p + 40 && i < Math.min(p + 300, c.length - 3) && dist(pt, q) < 22);
      if (j >= 0 && ++avanza.salto >= 3) { best = j; avanza.salto = 0; fuori = 0; }
    }
    if (best > p) {
      S.prog = best; salvaStato();
      if (best >= c.length - 3) { finito(false); return; }
      disegna(false); pannello();
    }
    // fuori dal percorso: ricalcolo da dove è adesso (le strade che ha fatto sono già segnate)
    if (fuori >= 3 && Date.now() - ultimoRicalcoloFuori > 20000) { ultimoRicalcoloFuori = Date.now(); guida(); vibra(300); ricalcola('fuori'); return; }
    guida();
  }
  avanza.salto = 0;

  // ---------- GPS ----------
  let posizione = null, ultimaCopertura = null, bufferTraccia = LS.get('buffer_traccia', []), ultimoPunto = null;
  const io = L.marker([0, 0], { icon: L.divIcon({ className: '', html: '<div class="io"></div>', iconSize: [26, 26], iconAnchor: [13, 13] }), interactive: false, zIndexOffset: 1000 });
  const cerchio = L.circle([0, 0], { radius: 10, color: BLU, weight: 1, fillOpacity: .08, interactive: false });
  function suPosizione(p) {
    const { latitude: lat, longitude: lng, accuracy: acc } = p.coords, ts = p.timestamp || Date.now();
    const primaVolta = !posizione;
    posizione = { lat, lng, acc, ts };
    io.setLatLng([lat, lng]); cerchio.setLatLng([lat, lng]).setRadius(acc);
    if (primaVolta) { lIo.addLayer(cerchio); lIo.addLayer(io); if (S.fase === 'cammino') map.setView([lat, lng], 18); else if (!G) map.setView([lat, lng], 13); pannello(); }
    else if (segui && S.fase === 'cammino') map.panTo([lat, lng], { animate: true });
    if (S.fase === 'verso' && S.meta) { const v = dist([lat, lng], [S.meta.lat, S.meta.lon]) < 180; if (v !== suPosizione.arrivata) { suPosizione.arrivata = v; pannello(); if (v) { vibra([150, 80, 150]); parla('Sei al parcheggio.'); notifica('Sei al parcheggio', 'Apri l\'app e inizia a camminare.', 'parcheggio'); } } }
    if (S.fase === 'macchina' && G) (R.isolate || []).forEach((s, i) => { if (!S.isolateViste[i] && dist([lat, lng], [s.lat, s.lon]) < 70) { S.isolateViste[i] = true; salvaStato(); toast('Casa isolata vista', 'ok'); aggiorna(false); } });
    if (acc > 30) return;
    const pt = [lat, lng];
    // strade viste: solo a piedi (sotto i 10 km/h), così in macchina non si segna niente
    if (S.fase === 'cammino' && G) {
      let n = 0;
      if (ultimaCopertura) {
        const d = dist(ultimaCopertura.pt, pt), dt = Math.max(1, (ts - ultimaCopertura.ts) / 1000), v = d / dt;
        if (v < 2.8 && d < 150) { n = Planner.copriTratto(G, visti, ultimaCopertura.pt, pt, 20); if (S.sessione) S.sessione.metri += d; }
      } else n = Planner.copri(G, visti, lat, lng, 20);
      ultimaCopertura = { pt, ts };
      if (n) { salvaVisti(); ridisegnaRete(); }
    } else ultimaCopertura = null;
    if (conGoogle() && (!ultimoPunto || dist(ultimoPunto, pt) >= 8)) {
      ultimoPunto = pt;
      bufferTraccia.push([ts, +lat.toFixed(6), +lng.toFixed(6), Math.round(acc)]);
      if (bufferTraccia.length > 5000) bufferTraccia = bufferTraccia.slice(-5000);
      LS.set('buffer_traccia', bufferTraccia);
    }
    if (S.fase === 'cammino') avanza(pt);
  }
  if (navigator.geolocation) navigator.geolocation.watchPosition(suPosizione, e => { if (e.code === 1) toast('Serve il permesso della posizione: attivalo per Chrome nelle impostazioni del telefono.', 'errore', 7000); }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
  $('tCentra').onclick = () => { segui = true; if (posizione) map.setView([posizione.lat, posizione.lng], Math.max(map.getZoom(), 17)); else toast('Sto cercando la posizione GPS…'); };
  const aspettaGPS = (ms = 20000) => new Promise(ok => { if (posizione) return ok(pos4()); const t0 = Date.now(), i = setInterval(() => { if (posizione || Date.now() - t0 > ms) { clearInterval(i); ok(pos4()); } }, 400); });

  async function tieniAcceso() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') await navigator.wakeLock.request('screen'); } catch (e) { } }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tieniAcceso(); else { inviaTraccia(); if (G) DB.put('visti', { id: R.id, v: visti }, cfg.comune).catch(() => { }); } });
  tieniAcceso();
  async function inviaTraccia() {
    if (!bufferTraccia.length || !conGoogle()) return;
    const pezzo = bufferTraccia.slice(0, 300);
    try { await api('saveTrack', { comune: cfg.comune, day: new Date().toLocaleDateString('it-IT'), points: pezzo }); bufferTraccia = bufferTraccia.slice(pezzo.length); LS.set('buffer_traccia', bufferTraccia); } catch (e) { }
  }
  setInterval(inviaTraccia, 60000);
  setInterval(() => { if (S.fase === 'cammino') sincronizzaCopertura(true); }, 10 * 60000);

  // ---------- fogli ----------
  function apri(id) { $(id).classList.add('aperto'); }
  function chiudi(id) { $(id).classList.remove('aperto'); }
  document.querySelectorAll('[data-chiudi]').forEach(b => b.onclick = () => {
    const f = b.closest('.foglio');
    if (f.id === 'fCasa' && casaModificata() && !confirm('Vuoi uscire senza salvare questa casa?')) return;
    if (f.id === 'fCasa') fermaRegistrazione(true);
    if (f.id === 'fScheda') fermaAudioScheda();
    f.classList.remove('aperto');
  });

  // ---------- case ----------
  // locali: tutto sul telefono (foto, audio). Remote: solo nel foglio Google (case salvate con le versioni vecchie da altri dispositivi).
  const case_ = new Map(), marcatori = new Map();
  const fotoDi = h => h.foto && h.foto.length ? h.foto : [];
  function marcatore(h, nuovo) {
    if (h.lat === '' || h.lat == null) return;
    if (marcatori.has(h.id)) lCase.removeLayer(marcatori.get(h.id));
    if (h.comune !== cfg.comune) return;
    const m = L.marker([h.lat, h.lng], { icon: L.divIcon({ className: 'pin' + (nuovo ? ' nuovo' : ''), html: pinSVG(h.stato), iconSize: [30, 38], iconAnchor: [15, 37] }), title: h.address || 'Casa', zIndexOffset: 600 });
    m.on('click', () => apriScheda(h.id));
    m.addTo(lCase); marcatori.set(h.id, m);
  }
  function contaCase() { const n = [...case_.values()].filter(h => h.comune === cfg.comune).length; $('numCase').textContent = n; $('numCase').hidden = !n; }
  async function migraCoda() {
    try {
      for (const r of await DB.all('coda')) {
        await DB.put('case', { id: r.id, ts: r.ts, comune: r.comune, address: r.address, lat: r.lat, lng: r.lng, acc: r.acc, stato: r.stato, tipo: r.tipo, note: r.note, telefono: '', foto: r.fotoLocali || [], audio: r.audioBlob || null, audioSec: 0, sync: 'attesa' });
        await DB.del('coda', r.id);
      }
    } catch (e) { }
  }
  async function caricaCase() {
    lCase.clearLayers(); marcatori.clear(); case_.clear();
    try { (await DB.all('case')).forEach(h => case_.set(h.id, h)); } catch (e) { }
    [...case_.values()].forEach(h => marcatore(h));
    contaCase(); statoInvio(); pannello(); controllaRichiami();
    if (conGoogle() && cfg.comune) {
      const nome = cfg.comune;
      try { (await api('listHouses', { comune: nome })).forEach(h => { if (case_.has(h.id) || nome !== cfg.comune) return; const v = { ...h, remota: true, comune: h.comune || nome }; case_.set(h.id, v); marcatore(v); }); } catch (e) { }
      contaCase();
    }
  }

  // lista
  let filtro = '';
  function apriCase() { disegnaLista(); apri('fCase'); }
  $('tCase').onclick = apriCase;
  const casePerComune = () => [...case_.values()].filter(h => h.comune === cfg.comune).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  function disegnaLista() {
    const tutte = filtro === '__richiamo' ? daRichiamare() : casePerComune();
    $('tfCase').textContent = 'Le mie case' + (cfg.comune ? ' a ' + cfg.comune : '');
    const f = $('filtri'); f.innerHTML = '';
    const nRich = daRichiamare().length;
    if (nRich) { const b = document.createElement('button'); b.className = 'scelta senza-icona'; b.setAttribute('aria-pressed', filtro === '__richiamo'); b.textContent = 'Da richiamare (' + nRich + ')'; b.onclick = () => { filtro = '__richiamo'; disegnaLista(); }; f.appendChild(b); }
    else if (filtro === '__richiamo') filtro = '';
    [{ k: '', n: 'Tutte' }, ...STATI.map(s => ({ k: s.k, n: s.k }))].forEach(o => {
      const n = o.k ? casePerComune().filter(h => h.stato === o.k).length : casePerComune().length; if (o.k && !n) return;
      const b = document.createElement('button'); b.className = 'scelta' + (o.k ? '' : ' senza-icona'); b.setAttribute('aria-pressed', filtro === o.k);
      b.innerHTML = (o.k ? pinSVG(o.k) : '') + esc(o.n) + ' (' + n + ')'; b.onclick = () => { filtro = o.k; disegnaLista(); }; f.appendChild(b);
    });
    const l = $('listaCase'), vis = tutte.filter(h => !filtro || filtro === '__richiamo' || h.stato === filtro);
    l.innerHTML = vis.length ? '' : `<div class="vuoto">${tutte.length ? 'Nessuna casa con questo stato.' : 'Non hai ancora salvato case qui. Mentre cammini, premi "Nuova casa".'}</div>`;
    vis.forEach(h => {
      const b = document.createElement('button'); b.className = 'casa-riga';
      const data = h.ts ? new Date(h.ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : '';
      const img = h.mini || fotoDi(h)[0];
      b.innerHTML = `${pinSVG(h.stato)}<div><b>${esc(h.address || 'Casa senza indirizzo')}</b><span>${esc(h.stato || '')}${h.tipo ? ', ' + esc(h.tipo.toLowerCase()) : ''}${data ? ', ' + data : ''}${h.sync === 'attesa' && conGoogle() ? ', in invio' : ''}${h.richiamo ? ', richiamare ' + new Date(h.richiamo + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : ''}</span></div>${img ? `<img src="${img}" alt="">` : ''}`;
      b.onclick = () => apriScheda(h.id);
      l.appendChild(b);
    });
  }
  $('bEsportaLista').onclick = () => esportaCSV(casePerComune(), cfg.comune);

  // scheda di una casa
  let audioScheda = null;
  const fermaAudioScheda = () => { if (audioScheda) { audioScheda.pause(); audioScheda = null; } };
  function apriScheda(id) {
    const h = case_.get(id); if (!h) return;
    fermaAudioScheda();
    const c = $('schedaCorpo'), foto = fotoDi(h);
    const data = h.ts ? new Date(h.ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    c.innerHTML = `${foto.length ? `<div class="galleria">${foto.map((u, i) => `<img src="${u}" alt="Foto ${i + 1}">`).join('')}</div>` : ''}
      <div class="scheda-ind">${esc(h.address || 'Casa senza indirizzo')}</div>
      <div class="scheda-sotto">${esc([h.tipo, data, h.comune].filter(Boolean).join(' · '))}</div>
      ${h.remota && (h.photos || []).length ? `<p><a class="link" target="_blank" rel="noopener" href="${esc(h.photos[0])}">Apri le foto</a></p>` : ''}
      ${h.telefono ? `<a class="tasto verde" href="tel:${esc(h.telefono.replace(/[^\d+]/g, ''))}">${ICO.telefono}Chiama ${esc(h.telefono)}</a>` : ''}
      ${h.richiamo ? `<div class="vicina" style="margin-top:12px"><span>Da richiamare <b>${esc(dataTesto(h.richiamo))}</b></span><button class="tasto ocra" id="sRichiamato">Fatto</button></div>
        <a class="tasto piccolo" target="_blank" rel="noopener" href="${calendario(h)}">Metti il promemoria nel calendario</a>` : ''}
      ${h.audio ? `<div class="sezione"><h3>Nota vocale</h3><div class="voce"><div class="ascolta" style="flex:1"><button class="play" id="sPlay" aria-label="Ascolta">${ICO.play}</button><div class="barra-audio"><div id="sBarra"></div></div></div></div></div>` : ''}
      ${h.note ? `<div class="sezione"><h3>Note</h3><p style="white-space:pre-wrap;margin:0">${esc(h.note)}</p></div>` : ''}
      <div class="sezione"><h3>Stato</h3><div class="scelte griglia" id="sStati"></div></div>
      <div class="azioni">
        <button class="tasto" id="sCondividi">${ICO.condividi}Condividi</button>
        <a class="tasto" href="${mapsPiedi(h.lat, h.lng)}" target="_blank" rel="noopener">${ICO.posizione}Portami qui</a>
        ${h.remota ? '' : `<button class="tasto" id="sModifica">${ICO.matita}Modifica</button><button class="tasto pericolo" id="sElimina">${ICO.cestino}Elimina</button>`}
      </div>`;
    const sc = $('sStati');
    STATI.forEach(s => { const b = document.createElement('button'); b.className = 'scelta'; b.setAttribute('aria-pressed', h.stato === s.k); b.innerHTML = pinSVG(s.k) + esc(s.k); b.onclick = () => cambiaStato(h, s.k); sc.appendChild(b); });
    if (h.audio) {
      const src = h.audio instanceof Blob ? URL.createObjectURL(h.audio) : h.audio;
      if (typeof src === 'string' && !/^blob:/.test(src) && !/\.(webm|mp4|m4a|ogg|mp3)(\?|$)/i.test(src)) { $('sPlay').onclick = () => window.open(src, '_blank'); }
      else {
        const a = new Audio(src);
        a.ontimeupdate = () => { if (isFinite(a.duration)) $('sBarra').style.width = (100 * a.currentTime / a.duration) + '%'; };
        a.onended = () => { $('sPlay').innerHTML = ICO.play; };
        $('sPlay').onclick = () => { audioScheda = a; if (a.paused) { a.play().catch(() => window.open(src, '_blank')); $('sPlay').innerHTML = ICO.pausa; } else { a.pause(); $('sPlay').innerHTML = ICO.play; } };
      }
    }
    $('sCondividi').onclick = () => condividiCasa(h);
    if ($('sRichiamato')) $('sRichiamato').onclick = async () => { h.richiamo = ''; await DB.put('case', h); toast('Promemoria tolto', 'ok'); apriScheda(h.id); pannello(); if ($('fCase').classList.contains('aperto')) disegnaLista(); };
    if (!h.remota) {
      $('sModifica').onclick = () => { chiudi('fScheda'); apriNuovaCasa(h); };
      $('sElimina').onclick = async () => { if (!confirm('Eliminare questa casa dal telefono?' + (h.sync === 'ok' ? ' Nel foglio Google resta.' : ''))) return; await DB.del('case', h.id); case_.delete(h.id); if (marcatori.has(h.id)) lCase.removeLayer(marcatori.get(h.id)); marcatori.delete(h.id); contaCase(); chiudi('fScheda'); toast('Casa eliminata'); if ($('fCase').classList.contains('aperto')) disegnaLista(); };
    }
    $('tfScheda').textContent = h.stato || 'Casa';
    apri('fScheda');
  }
  async function cambiaStato(h, stato) {
    const prima = h.stato; h.stato = stato; marcatore(h);
    try {
      if (!h.remota) { await DB.put('case', h); if (h.sync === 'ok' && conGoogle()) api('updateHouse', { id: h.id, stato }).catch(() => { }); }
      else await api('updateHouse', { id: h.id, stato });
      toast('Stato: ' + stato, 'ok');
    } catch (e) { h.stato = prima; marcatore(h); toast('Non riesco a cambiare lo stato: ' + e.message, 'errore', 6000); }
    apriScheda(h.id); if ($('fCase').classList.contains('aperto')) disegnaLista();
  }
  // evento nel calendario Google: avvisa anche con l'app chiusa
  function calendario(h) {
    const d = h.richiamo.replace(/-/g, ''), d2 = new Date(h.richiamo + 'T12:00'); d2.setDate(d2.getDate() + 1);
    const fine = d2.getFullYear() + String(d2.getMonth() + 1).padStart(2, '0') + String(d2.getDate()).padStart(2, '0');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('Richiamare: ' + (h.address || 'casa')) + '&dates=' + d + '/' + fine + '&details=' + encodeURIComponent(testoCasa(h));
  }
  const fileDa = (dataUrl, nome) => { const [t, b] = dataUrl.split(','), mime = (t.match(/data:(.*?);/) || [])[1] || 'image/jpeg', bin = atob(b), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new File([u], nome, { type: mime }); };
  const testoCasa = h => [h.address || 'Casa', [h.stato, h.tipo].filter(Boolean).join(' · '), h.telefono ? 'Tel. ' + h.telefono : '', h.note || '', h.lat !== '' && h.lat != null ? 'Mappa: https://maps.google.com/?q=' + h.lat + ',' + h.lng : ''].filter(Boolean).join('\n');
  async function condividiCasa(h) {
    const testo = testoCasa(h);
    try {
      const files = fotoDi(h).slice(0, 5).map((u, i) => fileDa(u, `casa-${i + 1}.jpg`));
      if (files.length && navigator.canShare && navigator.canShare({ files })) await navigator.share({ files, text: testo, title: h.address || 'Casa' });
      else if (navigator.share) await navigator.share({ text: testo, title: h.address || 'Casa' });
      else { await navigator.clipboard.writeText(testo); toast('Scheda copiata: incollala dove vuoi.', 'ok'); }
    } catch (e) { if (e && e.name !== 'AbortError') { try { await navigator.clipboard.writeText(testo); toast('Scheda copiata: incollala dove vuoi.', 'ok'); } catch (e2) { toast('Non riesco a condividere.', 'errore'); } } }
  }
  async function condividiFile(blob, nome) {
    const f = new File([blob], nome, { type: blob.type });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: nome }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  function esportaCSV(lista, comune) {
    if (!lista.length) { toast('Non ci sono case da esportare.', 'errore'); return; }
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
    const righe = [['Data', 'Comune', 'Indirizzo', 'Stato', 'Tipo', 'Telefono', 'Richiamare il', 'Note', 'Foto', 'Mappa'].map(q).join(';')];
    lista.forEach(h => righe.push([h.ts ? new Date(h.ts).toLocaleDateString('it-IT') : '', h.comune, h.address, h.stato, h.tipo, h.telefono, h.richiamo ? new Date(h.richiamo + 'T12:00').toLocaleDateString('it-IT') : '', h.note, fotoDi(h).length || (h.photos || []).length, h.lat !== '' && h.lat != null ? 'https://maps.google.com/?q=' + h.lat + ',' + h.lng : ''].map(q).join(';')));
    condividiFile(new Blob(['﻿' + righe.join('\r\n')], { type: 'text/csv' }), 'case-' + (comune || 'tutte').replace(/\s+/g, '-') + '-' + new Date().toISOString().slice(0, 10) + '.csv');
  }

  // ---------- nuova casa / modifica ----------
  let nc = null;
  const casaModificata = () => nc && !nc.id && (nc.foto.length || nc.audio || $('note').value.trim() || $('telefono').value.trim() || $('richiamo').value);
  function apriNuovaCasa(esistente) {
    if (esistente) nc = { id: esistente.id, pos: esistente.lat !== '' && esistente.lat != null ? { lat: esistente.lat, lng: esistente.lng, acc: esistente.acc || 0 } : null, foto: (esistente.foto || []).slice(), audio: esistente.audio || null, audioSec: esistente.audioSec || 0, stato: esistente.stato || 'Da valutare', tipo: esistente.tipo || '', ts: esistente.ts, sync: esistente.sync };
    else nc = { pos: posizione ? { ...posizione } : null, foto: [], audio: null, stato: 'Da valutare', tipo: '' };
    $('tCasaTitolo').textContent = esistente ? 'Modifica casa' : 'Nuova casa';
    $('note').value = esistente ? esistente.note || '' : ''; $('telefono').value = esistente ? esistente.telefono || '' : ''; $('richiamo').value = esistente ? esistente.richiamo || '' : ''; $('richiamo').min = oggiISO();
    $('indirizzo').value = esistente ? esistente.address || '' : '';
    disegnaFoto(); disegnaVoce(); disegnaScelte(); casaVicina();
    apri('fCasa');
    if (!esistente) cercaIndirizzo(); else { allarga(); $('aiutoIndirizzo').textContent = ''; }
  }
  function casaVicina() {
    const box = $('casaVicina'); box.innerHTML = '';
    if (nc.id || !nc.pos) return;
    let b = null, bd = 15;
    for (const h of case_.values()) { if (h.comune !== cfg.comune || h.lat === '' || h.lat == null) continue; const d = dist([nc.pos.lat, nc.pos.lng], [h.lat, h.lng]); if (d < bd) { bd = d; b = h; } }
    if (!b) return;
    box.innerHTML = `<div class="vicina"><span>Qui hai già salvato <b>${esc(b.address || 'una casa')}</b> (${esc(b.stato)}).</span><button class="tasto ocra" id="apriVicina">Apri quella</button></div>`;
    $('apriVicina').onclick = () => { nc = null; chiudi('fCasa'); apriScheda(b.id); };
  }
  async function cercaIndirizzo() {
    const t = $('indirizzo'), a = $('aiutoIndirizzo');
    t.value = ''; t.placeholder = 'Cerco l\'indirizzo…';
    if (!nc.pos) { t.placeholder = 'Scrivi l\'indirizzo'; a.textContent = 'Il GPS non è ancora pronto: scrivi l\'indirizzo a mano.'; return; }
    a.textContent = `Trovato con il GPS (precisione ${Math.round(nc.pos.acc)} m): controlla il numero civico.`;
    const offline = () => { if (!G) return false; const s = Planner.indirizzoVicino(G, nc.pos.lat, nc.pos.lng); if (!s.via) return false; t.value = s.via + (s.paese ? ', ' + s.paese : ''); allarga(); if (!s.esatto) a.textContent = 'Via trovata con il GPS: aggiungi il numero civico se lo vedi.'; return true; };
    if (conGoogle()) {
      try { const r = await api('geocode', { lat: nc.pos.lat, lng: nc.pos.lng }); const s = accorcia(r.address || ''); if (s.via) { t.value = s.via + (s.paese ? ', ' + s.paese : ''); allarga(); if (!r.exact) a.textContent = 'Numero civico non trovato: aggiungilo tu se lo vedi.'; return; } } catch (e) { }
    }
    if (!offline()) { t.placeholder = 'Scrivi l\'indirizzo'; a.textContent = 'Non trovo l\'indirizzo: scrivilo a mano.'; }
  }
  function accorcia(addr) {
    const parti = addr.split(',').map(s => s.trim());
    const iCap = parti.findIndex(s => /^\d{5}\b/.test(s));
    const via = (iCap > 0 ? parti.slice(0, iCap) : parti.slice(0, 2)).join(' ');
    const paese = iCap >= 0 ? parti[iCap].replace(/^\d{5}\s*/, '').replace(/\s+[A-Z]{2}$/, '') : '';
    return { via, paese };
  }
  const allarga = () => { const t = $('indirizzo'); t.style.height = 'auto'; t.style.height = t.scrollHeight + 4 + 'px'; };
  $('indirizzo').addEventListener('input', allarga);
  $('riprovaIndirizzo').onclick = () => { if (posizione) nc.pos = { ...posizione }; cercaIndirizzo(); casaVicina(); };

  function disegnaFoto() {
    const g = $('fotoGriglia'); g.innerHTML = '';
    const add = document.createElement('div'); add.className = 'cella';
    add.innerHTML = `<button class="aggiungi-foto">${ICO.foto}${nc.foto.length ? 'Un\'altra' : 'Scatta foto'}</button>`;
    add.firstChild.onclick = () => $('inputFoto').click();
    if (nc.foto.length < 8) g.appendChild(add);
    nc.foto.forEach((u, i) => { const d = document.createElement('div'); d.className = 'cella'; d.innerHTML = `<img src="${u}" alt="Foto ${i + 1}"><button class="togli" aria-label="Togli questa foto">${ICO.x}</button>`; d.querySelector('.togli').onclick = () => { nc.foto.splice(i, 1); disegnaFoto(); }; g.appendChild(d); });
  }
  const riduci = async (src, lato, q) => { const img = src instanceof Blob ? await createImageBitmap(src) : await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; }); const s = Math.min(1, lato / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); return cv.toDataURL('image/jpeg', q); };
  $('inputFoto').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { nc.foto.push(await riduci(f, 1600, 0.75)); disegnaFoto(); } catch (err) { toast('Non riesco a leggere la foto, riprova.', 'errore'); }
  };

  // nota vocale
  let rec = null;
  function disegnaVoce() {
    const v = $('voce');
    if (rec) {
      v.innerHTML = `<div class="voce"><button class="mic rec" id="bMic" aria-label="Ferma la registrazione">${ICO.stop}</button><div class="voce-testi"><div class="voce-titolo" id="tempoRec">Registro… 0:00</div><div class="livelli" id="livelli">${'<i></i>'.repeat(18)}</div><div class="voce-sotto">Tocca il quadrato rosso per fermare.</div></div></div>`;
      $('bMic').onclick = () => fermaRegistrazione(false);
      return;
    }
    if (nc.audio) {
      const durata = nc.audioSec || 0;
      v.innerHTML = `<div class="voce" style="display:block"><div class="ascolta"><button class="play" id="bPlay" aria-label="Ascolta">${ICO.play}</button><div class="voce-testi"><div class="voce-titolo">Nota registrata</div><div class="barra-audio"><div id="barraAudio"></div></div><div class="voce-sotto" id="tempoAudio">${durata ? Math.floor(durata / 60) + ':' + String(durata % 60).padStart(2, '0') : ''}</div></div></div>
        <div class="voce-azioni"><button class="tasto piccolo" id="bRifai">${ICO.rifai}Rifai</button><button class="tasto piccolo" id="bElimina">${ICO.cestino}Elimina</button></div></div>`;
      const a = new Audio(nc.audio instanceof Blob ? URL.createObjectURL(nc.audio) : nc.audio);
      a.ontimeupdate = () => { const d = isFinite(a.duration) ? a.duration : durata; $('barraAudio').style.width = (100 * a.currentTime / (d || 1)) + '%'; };
      a.onended = () => { $('bPlay').innerHTML = ICO.play; $('barraAudio').style.width = '0'; };
      $('bPlay').onclick = () => { if (a.paused) { a.play(); $('bPlay').innerHTML = ICO.pausa; } else { a.pause(); $('bPlay').innerHTML = ICO.play; } };
      $('bRifai').onclick = () => { a.pause(); iniziaRegistrazione(); };
      $('bElimina').onclick = () => { a.pause(); nc.audio = null; disegnaVoce(); };
      return;
    }
    v.innerHTML = `<div class="voce"><button class="mic" id="bMic" aria-label="Registra una nota vocale">${ICO.mic}</button><div class="voce-testi"><div class="voce-titolo">Tocca e parla</div><div class="voce-sotto">Racconta cosa vedi: stato della casa, cartello, agenzia.</div></div></div>`;
    $('bMic').onclick = iniziaRegistrazione;
  }
  async function iniziaRegistrazione() {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { toast('Serve il permesso del microfono: consentilo a Chrome.', 'errore', 6000); return; }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined), pezzi = [];
    rec = { mr, stream, t0: Date.now(), storia: new Array(18).fill(0) };
    mr.ondataavailable = ev => pezzi.push(ev.data);
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      if (rec && rec.ctx) rec.ctx.close();
      const annulla = rec && rec.annulla;
      const sec = Math.round((Date.now() - (rec ? rec.t0 : Date.now())) / 1000);
      rec = null;
      if (!annulla && nc) { nc.audio = new Blob(pezzi, { type: mr.mimeType || 'audio/webm' }); nc.audioSec = sec; vibra(60); disegnaVoce(); }
    };
    mr.start(250); vibra(60); disegnaVoce();
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)(), an = ctx.createAnalyser(); an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an); rec.ctx = ctx;
      const buf = new Uint8Array(an.fftSize); let ultimo = 0;
      const giro = t => {
        if (!rec || rec.mr !== mr) return;
        an.getByteTimeDomainData(buf); let s = 0; for (const x of buf) s += (x - 128) ** 2;
        if (t - ultimo > 90) { ultimo = t; rec.storia.shift(); rec.storia.push(Math.min(1, Math.sqrt(s / buf.length) / 40)); const bars = $('livelli'); if (bars) [...bars.children].forEach((b, i) => b.style.height = (4 + rec.storia[i] * 30) + 'px'); }
        requestAnimationFrame(giro);
      };
      requestAnimationFrame(giro);
    } catch (e) { }
    const tick = setInterval(() => {
      if (!rec || rec.mr !== mr) { clearInterval(tick); return; }
      const s = Math.round((Date.now() - rec.t0) / 1000), el = $('tempoRec');
      if (el) el.textContent = `Registro… ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      if (s >= 180) { fermaRegistrazione(false); toast('Nota fermata dopo 3 minuti.'); }
    }, 250);
  }
  function fermaRegistrazione(annulla) { if (rec && rec.mr.state === 'recording') { rec.annulla = annulla; rec.mr.stop(); } }

  function disegnaScelte() {
    const s = $('sceltaStato'); s.innerHTML = '';
    STATI.forEach(o => { const b = document.createElement('button'); b.className = 'scelta'; b.setAttribute('aria-pressed', nc.stato === o.k); b.innerHTML = pinSVG(o.k) + esc(o.k); b.onclick = () => { nc.stato = o.k; disegnaScelte(); }; s.appendChild(b); });
    const t = $('sceltaTipo'); t.innerHTML = '';
    TIPI.forEach(k => { const b = document.createElement('button'); b.className = 'scelta senza-icona'; b.setAttribute('aria-pressed', nc.tipo === k); b.textContent = k; b.onclick = () => { nc.tipo = nc.tipo === k ? '' : k; disegnaScelte(); }; t.appendChild(b); });
  }

  $('salvaCasa').onclick = async () => {
    if (rec) { fermaRegistrazione(false); await pausa(400); }
    const p = nc.pos || posizione, address = $('indirizzo').value.trim();
    if (!p && !address) { toast('Scrivi almeno l\'indirizzo.', 'errore'); return; }
    const vecchia = nc.id ? case_.get(nc.id) : null;
    const h = {
      id: nc.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: nc.ts || Date.now(), comune: vecchia ? vecchia.comune : cfg.comune, address,
      lat: p ? +(+p.lat).toFixed(6) : '', lng: p ? +(+p.lng).toFixed(6) : '', acc: p ? p.acc : null,
      stato: nc.stato === 'Da valutare' && $('richiamo').value ? 'Da ricontattare' : nc.stato, tipo: nc.tipo, note: $('note').value.trim(), telefono: $('telefono').value.trim(), richiamo: $('richiamo').value,
      foto: nc.foto.slice(), audio: nc.audio, audioSec: nc.audioSec || 0,
      sync: vecchia && vecchia.sync === 'ok' ? 'ok' : conGoogle() ? 'attesa' : 'locale', remote: vecchia ? vecchia.remote : null
    };
    try { h.mini = h.foto[0] ? await riduci(h.foto[0], 200, 0.7) : ''; } catch (e) { h.mini = ''; }
    try { await DB.put('case', h); } catch (e) { toast('Memoria del telefono piena: libera spazio e riprova.', 'errore', 6000); return; }
    case_.set(h.id, h); marcatore(h, !vecchia); contaCase();
    if (vecchia && h.sync === 'ok' && conGoogle()) api('updateHouse', { id: h.id, stato: h.stato }).catch(() => { });
    nc = null; chiudi('fCasa');
    toast(vecchia ? 'Casa aggiornata' : 'Casa salvata', 'ok');
    if (vecchia) { if ($('fCase').classList.contains('aperto')) disegnaLista(); }
    svuotaCoda();
  };

  // invio al foglio Google (se collegato)
  let invioInCorso = false;
  const b64 = blob => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = ko; r.readAsDataURL(blob); });
  function statoInvio() { const n = conGoogle() ? [...case_.values()].filter(h => h.sync === 'attesa').length : 0; const el = $('invio'); el.style.display = n ? 'block' : 'none'; el.textContent = n === 1 ? '1 casa in invio…' : n + ' case in invio…'; }
  async function svuotaCoda() {
    statoInvio();
    if (invioInCorso || !conGoogle()) return; invioInCorso = true;
    try {
      for (const r of [...case_.values()].filter(h => h.sync === 'attesa')) {
        const house = { id: r.id, ts: r.ts, comune: r.comune, day: '', address: r.address, lat: r.lat, lng: r.lng, acc: r.acc, stato: r.stato, tipo: r.tipo, note: [r.note, r.telefono ? 'Tel. ' + r.telefono : '', r.richiamo ? 'Richiamare il ' + new Date(r.richiamo + 'T12:00').toLocaleDateString('it-IT') : ''].filter(Boolean).join(' – '),
          photos: (r.foto || []).map(u => ({ b64: u.split(',')[1], mime: 'image/jpeg' })), audio: r.audio instanceof Blob ? { b64: await b64(r.audio), mime: r.audio.type } : null };
        const res = await api('saveHouse', { house });
        r.sync = 'ok'; r.remote = { photos: res.photoUrls || [], audio: res.audioUrl || '' };
        await DB.put('case', r); statoInvio();
      }
    } catch (e) { /* niente rete: riprovo più tardi */ }
    invioInCorso = false; statoInvio();
  }
  setInterval(svuotaCoda, 30000);
  window.addEventListener('online', svuotaCoda);

  // ---------- backup ----------
  async function salvaBackup() {
    toast('Preparo il backup…');
    const case2 = [];
    for (const h of await DB.all('case')) case2.push({ ...h, audio: h.audio instanceof Blob ? { b64: await b64(h.audio), mime: h.audio.type } : null });
    const reti = {}, copertura = {};
    for (const k of await DB.chiavi('reti')) reti[k] = await DB.get('reti', k);
    for (const k of await DB.chiavi('visti')) { const v = await DB.get('visti', k); if (v) copertura[k] = { id: v.id, b64: b64da(v.v) }; }
    const dati = { app: 'Agente Moni', versione: VERSIONE, creato: new Date().toISOString(), cfg: { comuni: cfg.comuni, rivedi: cfg.rivedi }, case: case2, reti, copertura };
    condividiFile(new Blob([JSON.stringify(dati)], { type: 'application/json' }), 'agente-moni-backup-' + new Date().toISOString().slice(0, 10) + '.json');
  }
  $('inputBackup').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); if (d.app !== 'Agente Moni') throw new Error('non è un backup di Agente Moni');
      let nCase = 0;
      for (const h of d.case || []) { if (await DB.get('case', h.id)) continue; if (h.audio && h.audio.b64) { const bin = atob(h.audio.b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); h.audio = new Blob([u], { type: h.audio.mime }); } else h.audio = null; await DB.put('case', h); nCase++; }
      for (const [k, r] of Object.entries(d.reti || {})) { if (!(await DB.get('reti', k))) await DB.put('reti', r, k); if (!cfg.comuni.includes(k)) cfg.comuni.push(k); }
      for (const [k, c] of Object.entries(d.copertura || {})) {
        const r = await DB.get('reti', k); if (!r || r.id !== c.id) continue;
        const loro = u16da(c.b64), mio = await DB.get('visti', k), v = mio && mio.id === c.id ? mio.v : new Uint16Array(loro.length);
        for (let i = 0; i < v.length; i++) if (loro[i] > v[i]) v[i] = loro[i];
        await DB.put('visti', { id: c.id, v }, k);
      }
      salvaCfg(); toast(`Backup ripristinato: ${nCase} case nuove.`, 'ok', 5000);
      chiudi('fImpost'); preparaComune(false);
    } catch (err) { toast('Backup non valido: ' + err.message, 'errore', 6000); }
  };

  // ---------- menu ----------
  function apriMenu() {
    const c = $('menuCorpo'), voci = [];
    if (S.fase === 'cammino') {
      voci.push({ i: ICO.rifai, t: 'Ricalcola il percorso da qui', s: 'Con il tempo che ti resta', f: () => { chiudi('fMenu'); ricalcola('mano'); } });
      if (S.auto) voci.push({ i: ICO.auto, t: 'Riportami alla macchina', s: 'La strada più breve', f: () => { chiudi('fMenu'); const r = Planner.versoPunto(G, visti, pos4() || S.auto, S.auto, cfg.rivedi); if (r && r.km > 0.03) impostaRotta(r); else toast('Sei già alla macchina.'); } });
      voci.push({ i: ICO.ok, t: 'Basta per oggi', s: 'Le strade viste restano segnate', f: () => { chiudi('fMenu'); bastaPerOggi(); } });
    }
    voci.push({ i: ICO.casa, t: 'Le mie case', s: casePerComune().length + ' a ' + (cfg.comune || '—'), f: () => { chiudi('fMenu'); apriCase(); } });
    if (G && (R.isolate || []).length) voci.push({ i: ICO.auto, t: 'Case isolate in macchina', s: (R.isolate.length - Object.keys(S.isolateViste).length) + ' da vedere', f: () => { chiudi('fMenu'); if (S.fase === 'cammino' && !confirm('Interrompo il giro a piedi?')) return; if (S.fase === 'cammino') bastaPerOggi(); S.fase = 'macchina'; salvaStato(); aggiorna(true); } });
    voci.push({ i: ICO.mappa, t: 'Comuni', s: (cfg.comune || 'Nessuno') + ' · cambia o aggiungi', f: () => { chiudi('fMenu'); apriComuni(); } });
    voci.push({ i: ICO.voce, t: 'Indicazioni a voce: ' + (cfg.voce ? 'sì' : 'no'), s: cfg.voce ? 'Tocca per spegnerle' : 'Il telefono ti dice dove girare', f: () => { cfg.voce = !cfg.voce; salvaCfg(); if (cfg.voce) parla('Indicazioni a voce accese.'); apriMenu(); } });
    voci.push({ i: ICO.foglio, t: 'Esporta le case (Excel)', s: 'Elenco da mandare o stampare', f: () => esportaCSV(casePerComune(), cfg.comune) });
    if (conGoogle()) voci.push({ i: ICO.foglio, t: 'Apri il foglio Google', s: 'Tutte le case nel foglio condiviso', f: () => { const u = LS.get('sheetUrl', ''); if (u) window.open(u, '_blank'); else toast('Prova prima il collegamento nelle impostazioni.', 'errore'); } });
    voci.push({ i: ICO.ingranaggio, t: 'Impostazioni', s: 'Ripasso delle strade, backup, Google', f: () => { chiudi('fMenu'); apriImpost(); } });
    voci.push({ i: ICO.aiuto, t: 'Come si usa', s: 'Spiegazione in 1 minuto', f: () => { chiudi('fMenu'); apriAiuto(); } });
    c.innerHTML = '';
    voci.forEach(v => { const b = document.createElement('button'); b.className = 'voce-menu'; b.innerHTML = `${v.i}<span>${esc(v.t)}<small>${esc(v.s)}</small></span>`; b.onclick = v.f; c.appendChild(b); });
    apri('fMenu');
  }
  $('tMenu').onclick = apriMenu;

  // ---------- comuni ----------
  async function apriComuni() {
    const c = $('comuniCorpo'); c.innerHTML = '';
    let scaricati = []; try { scaricati = await DB.chiavi('reti'); } catch (e) { }
    for (const nome of cfg.comuni) {
      const b = document.createElement('button'); b.className = 'giorno-scelta' + (nome === cfg.comune ? ' oggi' : '');
      let sotto = 'Mappa da scaricare (1-3 minuti)';
      if (scaricati.includes(nome)) {
        sotto = 'Mappa sul telefono';
        try { if (nome === cfg.comune && G) sotto = Math.round(avanzamento().perc * 100) + '% delle strade viste'; else { const r = await DB.get('reti', nome), v = await DB.get('visti', nome); if (r && v && v.id === r.id) { const g = Planner.prepara(r); sotto = Math.round(Planner.avanzamento(g, v.v, cfg.rivedi).perc * 100) + '% delle strade viste'; } } } catch (e) { }
      }
      b.innerHTML = `<b>${esc(nome)}</b><span>${sotto}</span>`;
      b.onclick = () => { chiudi('fComuni'); cambiaComune(nome); };
      c.appendChild(b);
    }
    const add = document.createElement('div');
    add.innerHTML = `<h3 class="gruppo">Aggiungi un comune</h3><button class="tasto" id="bQuiC">${ICO.posizione}Il comune dove sono adesso</button>
      <label class="campo" for="nuovoComune">Oppure scrivi il nome</label><input class="campo" id="nuovoComune" placeholder="Nome ufficiale, per esempio Provaglio d'Iseo" autocomplete="off"><button class="tasto" id="bAggiungi">${ICO.piu}Aggiungi</button><div class="log" id="logQuiC"></div>`;
    c.appendChild(add);
    $('bAggiungi').onclick = () => { const nome = $('nuovoComune').value.trim(); if (!nome) return; chiudi('fComuni'); aggiungiComune(nome); };
    $('bQuiC').onclick = () => comuneDaPosizione('logQuiC');
    apri('fComuni');
  }
  async function comuneDaPosizione(idLog = 'logQui') {
    const log = m => { const el = $(typeof idLog === 'string' ? idLog : 'logQui'); if (el) el.textContent = m; };
    log('Cerco la tua posizione…');
    const p = await aspettaGPS(25000);
    if (!p) { log('Il GPS non trova la posizione: scrivi il nome del comune.'); return; }
    log('Cerco il comune…');
    try {
      const nome = await Planner.trovaComune(p.lat, p.lon);
      if (!nome) { log('Non trovo il comune qui: scrivi il nome.'); return; }
      if (!confirm('Sei a ' + nome + '. Scarico la mappa di ' + nome + '?')) { log(''); return; }
      chiudi('fComuni'); aggiungiComune(nome);
    } catch (e) { log('Server delle mappe occupati: riprova tra poco o scrivi il nome.'); }
  }
  function aggiungiComune(nome) {
    nome = nome.replace(/\s+/g, ' ').trim();
    if (!cfg.comuni.includes(nome)) cfg.comuni.push(nome);
    salvaCfg(); cambiaComune(nome);
  }
  async function cambiaComune(nome) {
    if (S.fase === 'cammino' && !confirm('Interrompo il giro in corso? Le strade viste restano segnate.')) return;
    if (S.fase !== 'home') bastaPerOggi();
    if (G) await DB.put('visti', { id: R.id, v: visti }, cfg.comune).catch(() => { });
    cfg.comune = nome; salvaCfg();
    caricamento = null; anteprima = null; zone = null;
    await preparaComune(true);
  }

  // ---------- impostazioni ----------
  function apriImpost() {
    const c = $('impostCorpo');
    const RIV = [{ g: 0, t: 'Mai' }, { g: 182, t: 'Dopo 6 mesi' }, { g: 365, t: 'Dopo 1 anno' }];
    c.innerHTML = `<div class="sezione" style="margin-top:8px"><h3>Ripassare le strade già viste</h3><div class="scelte" id="iRiv">${RIV.map(r => `<button class="scelta senza-icona" data-g="${r.g}" aria-pressed="${cfg.rivedi === r.g}">${r.t}</button>`).join('')}</div><p class="aiuto">Con "Dopo 6 mesi" le strade viste da più di 6 mesi tornano blu, da rivedere.</p></div>
      <div class="sezione"><h3>Mappa di ${esc(cfg.comune || '—')}</h3>
        <button class="tasto" id="iAggiorna" ${cfg.comune ? '' : 'disabled'}>${ICO.rifai}Aggiorna la mappa</button><p class="aiuto">Scarica di nuovo strade e case (nuove costruzioni). Le strade già viste restano segnate.</p>
        <button class="tasto pericolo" id="iTogli" ${cfg.comune ? '' : 'disabled'}>${ICO.cestino}Togli questo comune dal telefono</button><p class="aiuto">Le case salvate restano.</p><div class="log" id="iLog"></div></div>
      <div class="sezione"><h3>Avvisi</h3><button class="interruttore" id="iNotifiche" role="switch" aria-checked="${notificheOk()}"><span>Notifiche sul telefono<small>Tempo che finisce, giro cambiato, arrivo al parcheggio, case da richiamare</small></span><span class="leva"></span></button>
        <button class="interruttore" id="iVoce" role="switch" aria-checked="${!!cfg.voce}"><span>Indicazioni a voce<small>Il telefono dice dove girare</small></span><span class="leva"></span></button></div>
      <div class="sezione"><h3>Backup</h3><div class="riga"><button class="tasto" id="iBackup">${ICO.salva}Salva backup</button><button class="tasto" id="iRipristina">${ICO.rifai}Ripristina</button></div><p class="aiuto">Un file con tutte le case, le foto, le note e le strade viste. Utile per cambiare telefono.</p></div>
      <div class="sezione"><h3>Collegamento a Google (facoltativo)</h3><p class="aiuto">Serve solo se vuoi le case anche in un foglio Google condiviso. Senza, l'app funziona lo stesso.</p>
        <label class="campo" for="cfgUrl">Indirizzo dello script (finisce con /exec)</label><input class="campo" type="url" id="cfgUrl" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(cfg.url)}">
        <label class="campo" for="cfgKey">Chiave segreta</label><input class="campo" type="password" id="cfgKey" value="${esc(cfg.key)}">
        <button class="tasto primario" id="iSalvaG">Salva e prova il collegamento</button>${conGoogle() ? '<button class="link" id="iScollega">Scollega Google</button>' : ''}</div>
      <p class="versione">Agente Moni · versione ${VERSIONE}</p>`;
    c.querySelectorAll('#iRiv [data-g]').forEach(b => b.onclick = () => { cfg.rivedi = +b.dataset.g; salvaCfg(); apriImpost(); disegnaRete(); pannello(); });
    $('iAggiorna').onclick = aggiornaMappa;
    $('iNotifiche').onclick = async () => {
      if (notificheOk()) { cfg.notifiche = false; salvaCfg(); apriImpost(); return; }
      if (!('Notification' in window)) { toast('Questo telefono non permette le notifiche dal browser.', 'errore', 6000); return; }
      if (Notification.permission === 'denied') { toast('Le notifiche sono bloccate: Chrome ⋮ → Impostazioni → Impostazioni sito → Notifiche → consenti.', 'errore', 9000); return; }
      if (await chiediNotifiche()) { notifica('Notifiche attive', 'Ti avviso qui quando serve.', 'prova', true); toast('Notifiche attive', 'ok'); }
      apriImpost();
    };
    $('iVoce').onclick = () => { cfg.voce = !cfg.voce; salvaCfg(); if (cfg.voce) parla('Indicazioni a voce accese.'); apriImpost(); };
    $('iTogli').onclick = async () => {
      if (!confirm('Togliere ' + cfg.comune + ' dal telefono? Le strade viste si perdono, le case restano.')) return;
      const n = cfg.comune; await DB.del('reti', n).catch(() => { }); await DB.del('visti', n).catch(() => { }); localStorage.removeItem('stato4_' + n);
      cfg.comuni = cfg.comuni.filter(x => x !== n); cfg.comune = cfg.comuni[0] || ''; salvaCfg(); chiudi('fImpost'); preparaComune(false);
    };
    $('iBackup').onclick = salvaBackup;
    $('iRipristina').onclick = () => $('inputBackup').click();
    $('iSalvaG').onclick = async () => {
      cfg.url = $('cfgUrl').value.trim(); cfg.key = $('cfgKey').value.trim(); salvaCfg();
      if (!conGoogle()) { toast('Collegamento tolto.', 'ok'); apriImpost(); return; }
      try { const r = await api('ping'); LS.set('sheetUrl', r.sheet); toast('Collegamento riuscito', 'ok'); [...case_.values()].forEach(h => { if (h.sync === 'locale') { h.sync = 'attesa'; DB.put('case', h); } }); svuotaCoda(); caricaCase(); sincronizzaCopertura(false); }
      catch (e) { toast('Collegamento non riuscito: ' + e.message, 'errore', 7000); }
    };
    if ($('iScollega')) $('iScollega').onclick = () => { if (!confirm('Scollegare Google? Le case restano sul telefono.')) return; cfg.url = ''; cfg.key = ''; salvaCfg(); apriImpost(); caricaCase(); };
    apri('fImpost');
  }
  async function aggiornaMappa() {
    if (!G) { chiudi('fImpost'); preparaComune(true); return; }
    const nome = cfg.comune, Gv = G, vv = visti, el = $('iLog'), b = $('iAggiorna');
    b.disabled = true;
    try {
      const r = await Planner.scaricaRete(nome, m => { el.textContent = m; });
      const Gn = Planner.prepara(r), vn = new Uint16Array(Gn.m);
      Planner.rimappa(Gv, vv, Gn, vn);
      await DB.put('reti', r, nome); await DB.put('visti', { id: r.id, v: vn }, nome);
      if (conGoogle()) api('saveRoutes', { comune: nome + ' (rete v4)', plan: r }).catch(() => { });
      el.textContent = 'Mappa aggiornata.';
      if (nome === cfg.comune) { S.rotta = null; if (S.fase === 'cammino') S.fase = 'home'; salvaStato(); attivaRete(r, { id: r.id, v: vn }); aggiorna(true); sincronizzaCopertura(true); }
    } catch (e) { el.textContent = 'Non riesco: ' + e.message; }
    b.disabled = false;
  }

  function apriAiuto() {
    $('aiutoCorpo').innerHTML = `<p><b>1. Scegli quanto tempo hai.</b> L'app prepara un giro a piedi dalle strade con case che non hai ancora visto, partendo da dove sei.</p>
      <p><b>2. Se sei lontano dalle strade da vedere</b>, ti propone le zone più vicine e ti porta a parcheggiare con Google Maps.</p>
      <p><b>3. Cammina seguendo la linea gialla.</b> In alto c'è dove girare. Se prendi un'altra strada, il percorso si aggiorna da solo da dove sei.</p>
      <p><b>4. Le strade diventano verdi</b> quando ci passi a piedi, anche fuori dal percorso. In macchina non si segna niente.</p>
      <p><b>5. Nuova casa:</b> indirizzo automatico, foto, nota vocale, stato e telefono del cartello. Dalla scheda puoi condividerla su WhatsApp o chiamare.</p>
      <p><b>6. Il tempo:</b> se rallenti, l'app accorcia il giro per farti tornare alla macchina in orario. Se vai veloce, aggiunge strade.</p>
      <p><b>7. Avvisi:</b> con le notifiche attive il telefono ti avvisa anche in tasca: 10 minuti alla fine, giro cambiato, arrivo al parcheggio. Nella scheda casa puoi mettere il giorno in cui richiamare: quel giorno te lo ricorda.</p>
      <p><b>Colori:</b> blu = da vedere, verde = già vista, giallo = i prossimi 300 m, puntini = solo passaggio.</p>
      <p><b>Consiglio:</b> tieni lo schermo acceso (l'app lo fa da sola) e porta una batteria esterna.</p>`;
    apri('fAiuto');
  }

  // ---------- avvio ----------
  window.addEventListener('resize', posizionaTondi);
  (async () => {
    await migraCoda();
    aggiorna(true);
    if (cfg.comune) await preparaComune(true); else caricaCase();
    svuotaCoda(); inviaTraccia();
  })();
  if ('serviceWorker' in navigator && !/[?&]test=1/.test(location.search)) navigator.serviceWorker.register('sw.js').catch(() => { });
  // solo per le prove automatiche
  if (/[?&]test=1/.test(location.search)) window.__am = { get S() { return S; }, get fuori() { return fuori; }, get G() { return G; }, get visti() { return visti; }, ricalcola, controllaTempo, avanzamento, controllaRichiami };
})();
