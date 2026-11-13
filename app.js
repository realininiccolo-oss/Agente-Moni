/* Zona v12 — l'app per il farming immobiliare: la propria zona (comuni o quartieri), giri a piedi guidati dal vivo,
   case con foto e note vocali, taccuino delle notizie raccolte in zona, pannello dell'attività.
   Tutto resta sul telefono, un profilo per ogni agente. Il collegamento a Google (foglio e cartella Drive) è facoltativo. */
(() => {
  'use strict';
  const VERSIONE = 12;
  const $ = id => document.getElementById(id);
  // profili: ogni agente ha i suoi dati. Il primo profilo usa i dati delle versioni precedenti (nessun prefisso).
  const PROFILI = (() => { try { const p = JSON.parse(localStorage.getItem('zona_profili')); if (p && p.lista && p.lista.length) return p; } catch (e) { } return { attivo: 'p0', lista: [{ id: 'p0', nome: '' }] }; })();
  if (!PROFILI.lista.some(p => p.id === PROFILI.attivo)) PROFILI.attivo = PROFILI.lista[0].id;
  const PID = PROFILI.attivo, PFX = PID === 'p0' ? '' : PID + '_';
  const salvaProfili = () => { try { localStorage.setItem('zona_profili', JSON.stringify(PROFILI)); } catch (e) { } };
  const LS = {
    get: (k, d) => { try { const v = localStorage.getItem(PFX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) { } },
    del: k => { try { localStorage.removeItem(PFX + k); } catch (e) { } }
  };
  const cfg = Object.assign({ url: '', key: '', comune: '', comuni: [], rivedi: 0, minuti: 60, tornaAuto: true, aree: {}, zonaNome: '', profilo: null }, LS.get('cfg', {}));
  if (!cfg.aree || typeof cfg.aree !== 'object') cfg.aree = {};
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
    grafico: svg('<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'),
    nota: svg('<path d="M5 4h14v12H9l-4 4z"/><path d="M9 9h6M9 12h4"/>'),
    lista: svg('<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'),
    persona: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    strati: svg('<path d="M12 3 2 8l10 5 10-5z"/><path d="M2 13l10 5 10-5"/>'),
    festa: '<svg class="grande" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#2e7d4f"/><path d="M14 25l7 7 14-15" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  const LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#17262b"/><path d="M14 46 22 18l14 6 14-8-6 30-14-4z" fill="#2e7d4f" opacity=".9"/><path d="M14 46 22 18l14 6 14-8-6 30-14-4z" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round" stroke-dasharray="5 4"/><circle cx="33" cy="33" r="7" fill="#f2a900" stroke="#fff" stroke-width="3"/></svg>';
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
  function toast(msg, tipo = '', ms = 3200) { const t = $('toast'); t.textContent = msg; t.className = tipo; t.style.display = 'block'; if (document.querySelector('.foglio.aperto')) t.style.bottom = 'calc(env(safe-area-inset-bottom) + 96px)'; else if (typeof posizionaTondi === 'function') try { posizionaTondi(); } catch (e) { } clearTimeout(toast._t); toast._t = setTimeout(() => t.style.display = 'none', ms); }
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
      const r = indexedDB.open(PID === 'p0' ? 'agente-moni' : 'zona-' + PID, 3);
      r.onupgradeneeded = () => {
        const db = r.result;
        for (const n of ['coda', 'case', 'note', 'persone', 'uscite', 'agenda']) if (!db.objectStoreNames.contains(n)) db.createObjectStore(n, { keyPath: 'id' });
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
  let R = null, G = null, visti = null, passi = null, volant = null, S = null, caricamento = null, vistaZona = false;
  const zonaCache = new Map(); // altre aree della zona, aperte per la vista d'insieme
  const statoVuoto = () => ({ fase: 'home', meta: null, auto: null, fine: null, minuti: 60, torna: true, rotta: null, prog: 0, sessione: null, ultima: null, isolateViste: {}, migrato: false, calcolo: 0 });
  function caricaStato() { S = Object.assign(statoVuoto(), LS.get('stato4_' + cfg.comune, {})); }
  const salvaStato = () => { if (cfg.comune) LS.set('stato4_' + cfg.comune, S); };
  caricaStato();
  const dv = () => Planner.daVedereFn(G, visti, cfg.rivedi);
  const avanzamento = () => G ? Planner.avanzamento(G, visti, cfg.rivedi) : { kmFatti: 0, kmTot: 0, perc: 0 };
  let tVisti = null;
  // visti: pezzi con case (giorno in cui sono stati visti); passi: tutte le strade percorse a piedi; volant: strade con volantini
  const recVisti = () => ({ id: R.id, v: visti, p: passi, f: volant });
  function salvaVisti() {
    if (!G) return; const nome = cfg.comune, rec = recVisti();
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
    if (G && !LS.get('aiutoVisto', false) && !$('fBenvenuto').classList.contains('aperto')) { LS.set('aiutoVisto', true); apriAiuto(); }
  }
  async function scaricaComune(nome) {
    caricamento = { nome, log: [] }; pannello();
    const log = m => { caricamento.log.push(m); const el = $('logCarica'); if (el) el.textContent = caricamento.log.slice(-3).join('\n'); };
    const r = await Planner.scaricaRete(nome, log, cfg.aree[nome]);
    await DB.put('reti', r, nome);
    if (conGoogle()) api('saveRoutes', { comune: nome + ' (rete v4)', plan: r }).catch(() => { });
    caricamento = null;
    return r;
  }
  function attivaRete(r, v) {
    R = r; G = Planner.prepara(r);
    { let a = 90, b = 180, c = -90, d = -180; for (let i = 0; i < r.lat.length; i++) { const la = r.lat[i], lo = r.lon[i]; if (la < a) a = la; if (la > c) c = la; if (lo < b) b = lo; if (lo > d) d = lo; } G.confini = L.latLngBounds([[a, b], [c, d]]); }
    visti = v && v.id === r.id && v.v && v.v.length === G.m ? v.v : new Uint16Array(G.m);
    passi = v && v.id === r.id && v.p && v.p.length === G.m ? v.p : null;
    volant = v && v.id === r.id && v.f && v.f.length === G.m ? v.f : new Uint16Array(G.m);
    if (!passi) { passi = new Uint16Array(G.m); for (let e = 0; e < G.m; e++) passi[e] = visti[e]; } // dalle versioni precedenti: il segno parte dalle strade viste
    { const a = cfg.aree[cfg.comune] || (cfg.aree[cfg.comune] = { tipo: r.poly ? 'zona' : 'comune' }); const b = G.confini; a.bbox = [+b.getSouth().toFixed(5), +b.getWest().toFixed(5), +b.getNorth().toFixed(5), +b.getEast().toFixed(5)]; salvaCfg(); }
    if (S.rotta && S.rotta.rete !== R.id) { S.rotta = null; if (S.fase === 'cammino') S.fase = 'home'; }
    // giro lasciato aperto (app chiusa senza "Basta per oggi"): lo chiudo e lo metto nelle uscite
    if (S.fase === 'cammino' && S.sessione && Date.now() - (S.sessione.ultimo || S.sessione.inizio) > 6 * 3600e3) setTimeout(() => { if (S.fase === 'cammino') bastaPerOggi(); }, 0);
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
    primaVista = true; disegnaRete(); aggiornaStatArea(); disegnaNote();
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
          let cambi = 0;
          const unisci = (b, mio) => { if (!b) return; const altri = u16da(b); if (altri.length === mio.length) for (let i = 0; i < mio.length; i++) if (altri[i] > mio[i]) { mio[i] = altri[i]; cambi++; } };
          unisci(d.b64, visti); unisci(d.p, passi); unisci(d.f, volant);
          if (cambi) { salvaVisti(); disegnaRete(); pannello(); }
        }
      }
      if (nome === cfg.comune) await api('saveRoutes', { comune: nome + ' (copertura)', plan: { id, b64: b64da(visti), p: b64da(passi), f: b64da(volant), ts: Date.now() } });
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
  const VERDE = '#2e7d4f', VERDE_SC = '#1f6b42', VERDE_CH = '#9fd3b0', BLU = '#1d5fd1', OCRA = '#f2a900', GRIGIO = '#6b7a80', ARANCIO = '#e8590c';
  const GG = () => G;
  const pEtichetta = (testo, altro) => L.divIcon({ className: '', html: `<div class="etichetta-p${altro ? ' altro' : ''}">${testo}</div>`, iconSize: altro ? [34, 34] : [40, 40], iconAnchor: altro ? [17, 17] : [20, 20] });
  const iconaAuto = () => L.divIcon({ className: '', html: `<div class="etichetta-p altro" style="width:36px;height:36px">${ICO.auto.replace('<svg', '<svg width="22" height="22"')}</div>`, iconSize: [36, 36], iconAnchor: [18, 18] });
  function pulisciMappa() { lRete.clearLayers(); lRotta.clearLayers(); lExtra.clearLayers(); lCase.clearLayers(); marcatori.clear(); }

  // strade con case: blu da vedere, verdi già viste (pezzi uniti in linee lunghe per disegnare veloce)
  function catene(sel, G = GG()) {
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
      out.push(nodi.map(v => [G.R.lat[v], G.R.lon[v]]));
    }
    return out;
  }
  // colori delle strade: blu = case da vedere; verde scuro = percorse negli ultimi 3 mesi (il "segno");
  // verde chiaro = viste più di 3 mesi fa. Durante il giro la rete resta sbiadita e risalta solo il percorso.
  function disegnaReteDi(Gx, vx, px, fx, layer, cammino) {
    const da = Planner.daVedereFn(Gx, vx, cfg.rivedi), o = Planner.oggi();
    const recente = e => px[e] > 0 && o - px[e] <= 90;
    const dafare = catene(e => da(e) && !recente(e), Gx), vecchie = catene(e => Gx.ER[e] && !da(e) && !recente(e), Gx);
    const segnoCase = catene(e => recente(e) && Gx.ER[e], Gx), segnoAltre = catene(e => recente(e) && !Gx.ER[e], Gx);
    const f = cammino ? .45 : 1;
    if (dafare.length) L.polyline(dafare, { renderer: tela, pane: 'rete', color: BLU, weight: cammino ? 3 : 4, opacity: .6 * f, interactive: false }).addTo(layer);
    if (vecchie.length) L.polyline(vecchie, { renderer: tela, pane: 'rete', color: VERDE_CH, weight: cammino ? 4 : 6, opacity: .9 * f, interactive: false }).addTo(layer);
    if (segnoAltre.length) L.polyline(segnoAltre, { renderer: tela, pane: 'rete', color: VERDE_SC, weight: 3, opacity: .75 * f, interactive: false }).addTo(layer);
    if (segnoCase.length) L.polyline(segnoCase, { renderer: tela, pane: 'rete', color: VERDE_SC, weight: cammino ? 4 : 6, opacity: .9 * f, interactive: false }).addTo(layer);
    if (cfg.mostraVolantini && fx) { const vol = catene(e => fx[e] > 0 && o - fx[e] <= 90, Gx); if (vol.length) L.polyline(vol, { renderer: tela, pane: 'rete', color: ARANCIO, weight: 3, opacity: .95 * f, dashArray: '2 7', lineCap: 'round', interactive: false }).addTo(layer); }
  }
  function disegnaRete() {
    lRete.clearLayers();
    if (vistaZona) { disegnaZona(); return; }
    if (!G) return;
    disegnaReteDi(G, visti, passi, volant, lRete, S.fase === 'cammino');
  }
  let tRete = null;
  const ridisegnaRete = () => { if (tRete) return; tRete = setTimeout(() => { tRete = null; disegnaRete(); }, 2500); };

  function disegna(centra) {
    lRotta.clearLayers(); lExtra.clearLayers();
    if (vistaZona) {
      let b = null;
      for (const n of cfg.comuni) {
        const a = cfg.aree[n]; if (!a || !a.bbox) continue;
        const bb = L.latLngBounds([[a.bbox[0], a.bbox[1]], [a.bbox[2], a.bbox[3]]]); (confiniDi(n) || []).forEach(r => bb.extend(L.latLngBounds(r))); b = b ? b.extend(bb) : bb;
        L.marker(bb.getCenter(), { icon: L.divIcon({ className: '', html: `<div class="etichetta-area">${esc(n)}</div>`, iconSize: [10, 10], iconAnchor: [5, 5] }), zIndexOffset: 300 }).on('click', () => { if (n !== cfg.comune) cambiaComune(n); else mostraZona(false); }).addTo(lExtra);
      }
      if (centra && b && b.isValid()) map.fitBounds(b, { paddingTopLeft: [20, 30], paddingBottomRight: [70, Math.min(440, altezzaPannello() + 20)] });
      return;
    }
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
        // già fatto oggi su questo percorso: grigio, sotto
        if (p > 0) L.polyline(c.slice(0, p + 1), { pane: 'dafare', color: GRIGIO, weight: 5, opacity: .7, dashArray: '8 6', interactive: false }).addTo(lRotta);
        L.polyline(c.slice(p), { pane: 'dafare', color: '#fff', weight: 12, opacity: .95, interactive: false }).addTo(lRotta);
        const guarda = k => r.lk[k] === '1' && da(r.pezzi[k]);
        let i = p;
        while (i < c.length - 1) {
          const tipo = guarda(i); let j = i;
          while (j < c.length - 1 && guarda(j) === tipo) j++;
          L.polyline(c.slice(i, j + 1), tipo ? { pane: 'dafare', color: BLU, weight: 8, opacity: 1, interactive: false } : { pane: 'dafare', color: BLU, weight: 6, opacity: .75, dashArray: '1 11', lineCap: 'round', interactive: false }).addTo(lRotta);
          i = j;
        }
        let j = p; while (j < c.length - 1 && I.cc[j] - I.cc[p] < 300) j++;
        L.polyline(c.slice(p, j + 1), { pane: 'prossimo', color: OCRA, weight: 10, opacity: 1, interactive: false }).addTo(lRotta);
        frecce(r, p, I.cc[j] - I.cc[p], 32, '#17262b');      // frecce scure fitte sul tratto giallo
        frecce(r, j, 2500, 70);                               // poi frecce bianche più rade sul resto
        if (c.length - 1 > p) L.marker(c[c.length - 1], { interactive: false, keyboard: false, pane: 'prossimo', icon: L.divIcon({ className: '', html: '<div class="arrivo-giro">Fine</div>', iconSize: [46, 26], iconAnchor: [23, 13] }) }).addTo(lRotta);
      }
      bounds = L.latLngBounds(c.slice(p, Math.min(c.length, p + 40)));
    }
    if (centra && bounds && bounds.isValid()) { map.fitBounds(bounds, { paddingTopLeft: [20, S.fase === 'home' ? 30 : 150], paddingBottomRight: [70, Math.min(440, altezzaPannello() + 20)], maxZoom: 18 }); primaVista = false; }
  }
  // frecce di direzione lungo il percorso, a metà dei pezzi (così non coprono gli incroci)
  function frecce(r, p, quanto, passo, colore = '#fff') {
    const c = r.coords, I = info(r); let ultimo = I.cc[p] - passo / 2;
    for (let k = p + 1; k < c.length && I.cc[k] - I.cc[p] < quanto; k++) {
      if (I.cc[k] - ultimo < passo || I.cc[k] - I.cc[k - 1] < 4) continue; ultimo = I.cc[k];
      const ang = bearing(c[k - 1], c[k]), m = [(c[k - 1][0] + c[k][0]) / 2, (c[k - 1][1] + c[k][1]) / 2];
      L.marker(m, { interactive: false, keyboard: false, pane: 'prossimo', icon: L.divIcon({ className: '', html: `<svg class="freccia" viewBox="0 0 18 18" style="transform:rotate(${ang}deg)"><path d="M4 12l5-6 5 6" fill="none" stroke="${colore}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`, iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(lRotta);
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
    if (vistaZona) { pannelloZona(box, on); return; }
    if (!cfg.comune) {
      box.innerHTML = `<p class="ciao">${esc(saluto())}${nomeAgente() ? ', ' + esc(nomeAgente()) : ''}</p><h1>Aggiungi la tua zona</h1><div class="intro"><p>La zona è l'insieme dei comuni o dei quartieri che lavori. Inizia dal primo: poi ne aggiungi altri da "La mia zona".</p></div>
        <button class="tasto primario" id="bQui">${ICO.posizione}Usa il posto dove sono</button>
        <label class="campo" for="nomeComune">Oppure scrivi il nome del comune</label><input class="campo" id="nomeComune" placeholder="Per esempio Cazzago San Martino" autocomplete="off">
        <button class="tasto" id="bNome">Scarica questo comune</button>
        <div class="riga"><button class="link" id="bQuart">Un quartiere di una città</button><button class="link" id="bDisegna">Disegna sulla mappa</button></div><div class="log" id="logQui"></div>`;
      on('bQui', () => comuneDaPosizione('logQui'));
      on('bNome', () => { const n = $('nomeComune').value.trim(); if (n) aggiungiComune(n); });
      on('bQuart', () => apriComuni('quartiere')); on('bDisegna', () => iniziaDisegno());
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
    const testa = `${S.fase === 'home' ? `<p class="ciao">${esc(saluto())}${nomeAgente() ? ', ' + esc(nomeAgente()) : ''}</p>` : ''}${comuneChip}<div class="avanz-testo" style="margin-top:8px"><span><b>${perc}%</b> delle strade con case viste</span><span>${kmTesto(av.kmFatti * 1000)} su ${kmTesto(av.kmTot * 1000)}</span></div><div class="avanz"><div style="width:${perc}%"></div></div>`;

    if (S.fase === 'home') {
      let html = testa;
      if (!anteprima && !zone) html += `<div class="scorciatoie"><button id="bPan">${ICO.grafico}<span>Pannello</span></button><button id="bTacc">${ICO.nota}<span>Taccuino</span></button><button id="bZona">${ICO.mappa}<span>Tutta la zona</span></button></div>`;
      const altra = areaQui(); if (altra && !anteprima) html += `<button class="vicina" id="bAltraArea" style="width:100%;border:0;text-align:left">${ICO.posizione.replace('<svg', '<svg width="26" height="26"')}<span>Sei a <b>${esc(altra)}</b>, nella tua zona.<br>Tocca per aprire la sua mappa.</span></button>`;
      const oggiN = cosePerOggi().length; if (oggiN && !anteprima && !zone) html += `<button class="vicina" id="bOggi" style="width:100%;border:0;text-align:left;background:var(--lago-chiaro);color:var(--lago-scuro)">${ICO.lista.replace('<svg', '<svg width="26" height="26"')}<span><b>${oggiN === 1 ? '1 cosa da fare oggi' : oggiN + ' cose da fare oggi'}</b><br>${esc(taglia(cosePerOggi()[0].titolo, 48))}</span></button>`;
      const rich = oggiN ? [] : daRichiamare(); if (rich.length) html += `<button class="vicina" id="bRichiami" style="width:100%;border:0;text-align:left">${ICO.telefono.replace('<svg', '<svg width="26" height="26"')}<span><b>${rich.length === 1 ? '1 casa da richiamare' : rich.length + ' case da richiamare'}</b><br>${esc(rich[0].address || 'Casa')}${rich.length > 1 ? ' e altre' : ''}</span></button>`;
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
        html += `<div class="riga"><button class="link" id="bMappa">Scegli sulla mappa</button><button class="link" id="bCasaQui">Salva una casa qui</button></div>${nIso ? `<button class="link" id="bAuto" style="width:100%">Case isolate da vedere in macchina (${nIso})</button>` : ''}`;
        box.innerHTML = html;
        box.querySelectorAll('.tempo').forEach(b => b.onclick = () => scegliTempo(+b.dataset.min));
        on('bMappa', iniziaSceltaMappa); on('bAuto', () => { S.fase = 'macchina'; salvaStato(); aggiorna(true); }); on('bCasaQui', () => apriNuovaCasa());
      }
      on('bComune', apriComuni); on('bRichiami', () => { filtro = '__richiamo'; apriCase(); });
      on('bPan', apriPannello); on('bTacc', () => apriTaccuino()); on('bZona', () => mostraZona(true)); on('bOggi', apriPannello);
      on('bAltraArea', () => { const a = areaQui(); if (a) cambiaComune(a); });
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
        <div class="riga"><button class="tasto verde" id="bNuova">${ICO.piu}Nuova casa</button><button class="tasto" id="bNotaG" style="flex:.7">${ICO.nota}Notizia</button></div>
        <button class="interruttore" id="bVol" role="switch" aria-checked="${!!(S.sessione && S.sessione.volantini)}" style="padding:6px 12px"><span>Sto lasciando volantini</span><span class="leva"></span></button>
        <div class="riga">${S.auto && !(r && r.ritorno) ? `<button class="tasto piccolo" id="bTornaAuto">${ICO.auto}Torno alla macchina</button>` : ''}<button class="tasto piccolo" id="bRicalcola">${ICO.rifai}Ricalcola</button></div>
        <button class="link" id="bStop">Basta per oggi</button>`;
      on('bNuova', () => apriNuovaCasa());
      on('bNotaG', () => apriNota());
      on('bVol', () => { if (!S.sessione) return; S.sessione.volantini = !S.sessione.volantini; salvaStato(); toast(S.sessione.volantini ? 'Volantinaggio: segno le strade dove passi' : 'Volantinaggio spento', 'ok'); pannello(); });
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
    if (disegno) { disegno.punti.push([e.latlng.lat, e.latlng.lng]); aggiornaDisegno(); vibra(30); return; }
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
    S.sessione = { inizio: Date.now(), ultimo: Date.now(), km0: avanzamento().kmFatti, metri: 0, volantini: false, metriVol: 0 }; S.avvisi = {};
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
    const lista = cosePerOggi(0); if (!lista.length) return;
    const chiave = oggiISO(); if (LS.get('richiamiAvvisati', '') === chiave) return;
    LS.set('richiamiAvvisati', chiave);
    notifica(lista.length === 1 ? 'Una cosa da fare oggi' : lista.length + ' cose da fare oggi', lista.slice(0, 3).map(x => x.titolo).join('\n'), 'richiami', true);
  }
  setInterval(controllaRichiami, 30 * 60e3);
  const caseOggi = () => { const da = S.sessione ? S.sessione.inizio : Date.now(); return [...case_.values()].filter(h => h.comune === cfg.comune && h.ts >= da).length; };
  function bastaPerOggi() {
    const av = avanzamento();
    if (S.sessione) {
      S.ultima = { quando: Date.now(), kmNuovi: Math.max(0, av.kmFatti - S.sessione.km0), case: caseOggi() };
      registraUscita(S.sessione, S.ultima);
    }
    Object.assign(S, { fase: 'home', meta: null, auto: null, fine: null, rotta: null, prog: 0, sessione: null });
    anteprima = null; zone = null;
    salvaStato(); salvaVisti(); aggiorna(true); sincronizzaCopertura(true); inviaTraccia();
  }

  function aggiorna(centra) { pannello(); guida(); posizionaTondi(); aggiornaAvatar(); disegna(centra); }
  function altezzaPannello() { return Math.max(0, Math.round(window.innerHeight - $('pannello').getBoundingClientRect().top)); }
  // barra delle icone: in fila sopra il pannello; se il pannello è tutto aperto, in alto a sinistra del profilo
  function posizionaTondi() {
    const h = altezzaPannello(), T = $('tondi'), gu = $('guida'), guidaOn = gu.classList.contains('visibile');
    const alto = h + 10 + 54 > window.innerHeight - 76;
    const sottoGuida = guidaOn ? Math.round(gu.getBoundingClientRect().bottom) + 10 : 0;
    T.classList.toggle('in-alto', alto);
    T.style.bottom = alto ? '' : (h + 10) + 'px';
    T.style.top = alto ? (guidaOn ? sottoGuida + 'px' : 'calc(env(safe-area-inset-top) + 12px)') : '';
    T.style.right = alto && !guidaOn ? '72px' : '';
    const st = $('strati');
    st.style.bottom = alto ? 'auto' : (h + 72) + 'px';
    st.style.top = alto ? (Math.round(T.getBoundingClientRect().bottom) + 8) + 'px' : '';
    $('invio').style.bottom = (h + 72) + 'px'; $('toast').style.bottom = (alto ? h + 12 : h + 74) + 'px';
  }
  function aggiornaAvatar() {
    const n = ((cfg.profilo && cfg.profilo.nome) || '').trim(), b = $('tProfilo');
    const ini = n ? n.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() : '';
    b.innerHTML = ini ? `<span>${esc(ini)}</span>` : svg('<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>', 'stroke-width="1.7"');
    b.setAttribute('aria-label', 'Il mio profilo' + (n ? ': ' + n : ''));
  }

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
  const io = L.marker([0, 0], { icon: L.divIcon({ className: '', html: '<div class="io-box"><svg class="io-dir" viewBox="0 0 60 60" aria-hidden="true"><path d="M30 2 41 22a13 13 0 0 0-22 0z" fill="#1d5fd1" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg><div class="io"></div></div>', iconSize: [60, 60], iconAnchor: [30, 30] }), interactive: false, zIndexOffset: 1000 });
  // direzione di marcia: dalla bussola del GPS se c'è, altrimenti dagli ultimi spostamenti
  let rotta0 = null, direzione = null;
  function aggiornaDirezione(p, lat, lng) {
    let h = p.coords.heading;
    if (!(h != null && !isNaN(h) && (p.coords.speed || 0) > 0.4)) {
      h = null;
      if (rotta0 && dist(rotta0, [lat, lng]) >= 6) h = bearing(rotta0, [lat, lng]);
    }
    if (!rotta0 || dist(rotta0, [lat, lng]) >= 6) rotta0 = [lat, lng];
    if (h == null) return;
    direzione = h;
    const el = io.getElement && io.getElement(), d = el && el.querySelector('.io-dir');
    if (d) { d.style.transform = `rotate(${h}deg)`; d.style.opacity = '1'; }
  }
  const cerchio = L.circle([0, 0], { radius: 10, color: BLU, weight: 1, fillOpacity: .08, interactive: false });
  function suPosizione(p) {
    const { latitude: lat, longitude: lng, accuracy: acc } = p.coords, ts = p.timestamp || Date.now();
    const primaVolta = !posizione;
    posizione = { lat, lng, acc, ts };
    io.setLatLng([lat, lng]); cerchio.setLatLng([lat, lng]).setRadius(acc);
    if (acc <= 40) aggiornaDirezione(p, lat, lng);
    if (primaVolta) { lIo.addLayer(cerchio); lIo.addLayer(io); if (S.fase === 'cammino') map.setView([lat, lng], 18); else if (!G) map.setView([lat, lng], 13); pannello(); }
    else if (segui && S.fase === 'cammino') map.panTo([lat, lng], { animate: true });
    if (S.fase === 'verso' && S.meta) { const v = dist([lat, lng], [S.meta.lat, S.meta.lon]) < 180; if (v !== suPosizione.arrivata) { suPosizione.arrivata = v; pannello(); if (v) { vibra([150, 80, 150]); parla('Sei al parcheggio.'); notifica('Sei al parcheggio', 'Apri l\'app e inizia a camminare.', 'parcheggio'); } } }
    if (S.fase === 'home' && !primaVolta) { const q = areaQui(); if (q !== suPosizione.area) { suPosizione.area = q; pannello(); } }
    if (S.fase === 'macchina' && G) (R.isolate || []).forEach((s, i) => { if (!S.isolateViste[i] && dist([lat, lng], [s.lat, s.lon]) < 70) { S.isolateViste[i] = true; salvaStato(); toast('Casa isolata vista', 'ok'); aggiorna(false); } });
    if (acc > 30) return;
    const pt = [lat, lng];
    // strade viste: solo a piedi (sotto i 10 km/h), così in macchina non si segna niente
    if (S.fase === 'cammino' && G) {
      let n = 0;
      if (ultimaCopertura) {
        const d = dist(ultimaCopertura.pt, pt), dt = Math.max(1, (ts - ultimaCopertura.ts) / 1000), v = d / dt;
        if (v < 2.8 && d < 150) {
          n = Planner.copriTratto(G, visti, ultimaCopertura.pt, pt, 20);
          n += Planner.segnaTratto(G, passi, ultimaCopertura.pt, pt, 15);
          if (S.sessione) { S.sessione.metri += d; S.sessione.ultimo = ts; if (S.sessione.volantini) { Planner.segnaTratto(G, volant, ultimaCopertura.pt, pt, 15); S.sessione.metriVol = (S.sessione.metriVol || 0) + d; } }
        }
      } else n = Planner.copri(G, visti, lat, lng, 20) + Planner.segna(G, passi, lat, lng, 15);
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
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tieniAcceso(); else { inviaTraccia(); if (G) DB.put('visti', recVisti(), cfg.comune).catch(() => { }); } });
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
    if (h.comune !== cfg.comune && !vistaZona) return;
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
      <div class="sezione"><h3 class="gruppo" style="margin-top:0">In vendita?<span>${h.annuncioTs ? 'segnato ' + esc(giorniFa(h.annuncioTs)) : ''}</span></h3>
        ${h.prezzo || h.annuncio || h.agenzia ? `<div class="annuncio"><div><b>${h.prezzo ? esc(prezzoTesto(h.prezzo)) : h.annuncio ? 'Annuncio trovato' : 'Cartello'}</b><span>${esc(h.agenzia || 'Agenzia non segnata')}</span></div>${h.annuncio ? `<a class="tasto piccolo" target="_blank" rel="noopener" href="${esc(/^https?:/i.test(h.annuncio) ? h.annuncio : 'https://' + h.annuncio)}">Apri l'annuncio</a>` : ''}</div>` : '<p class="aiuto" style="margin-top:0">Non ancora controllato. Cerca l\'indirizzo sui portali:</p>'}
        <div class="portali">${portaliHTML(h.address, h.comune)}</div>
        ${h.remota ? '' : `<button class="link" id="sAnnApri">${h.prezzo || h.annuncio ? 'Cambia prezzo o annuncio' : 'Segna agenzia, prezzo e annuncio'}</button>
        <div id="sAnnForm" hidden><label class="campo" for="sAnnAg">Agenzia</label><input class="campo" id="sAnnAg" list="listaAgenzie" value="${esc(h.agenzia || '')}" autocomplete="off">
          <label class="campo" for="sAnnPr">Prezzo richiesto</label><input class="campo" id="sAnnPr" inputmode="numeric" placeholder="€" value="${h.prezzo ? esc(Number(h.prezzo).toLocaleString('it-IT')) : ''}" autocomplete="off">
          <label class="campo" for="sAnnLink">Link dell'annuncio</label><input class="campo" type="url" id="sAnnLink" value="${esc(h.annuncio || '')}" placeholder="Incolla il link" autocomplete="off">
          <button class="tasto verde piccolo" id="sAnnSalva">${ICO.ok}Salva</button></div>`}
      </div>
      ${notizieCasa(h).length ? `<div class="sezione"><h3>Notizie su questa casa</h3>${notizieCasa(h).map(n => `<button class="nota-riga" data-nota="${n.id}"><span class="nota-tipo">${esc(n.tipoInfo || 'Notizia')}</span><b>${esc(taglia(n.testo, 120))}</b><span>${esc([n.chi, dataBreve(n.ts), n.stato].filter(Boolean).join(' · '))}</span></button>`).join('')}</div>` : ''}
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
        <button class="tasto" id="sNotizia" style="grid-column:span 2">${ICO.nota}Aggiungi una notizia</button>
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
    if ($('sAnnApri')) $('sAnnApri').onclick = () => { $('sAnnForm').hidden = !$('sAnnForm').hidden; $('listaAgenzie').innerHTML = [...new Set(['Privato', ...[...case_.values()].map(x => x.agenzia).filter(Boolean)])].map(a => `<option value="${esc(a)}">`).join(''); if (!$('sAnnForm').hidden) $('sAnnAg').focus(); };
    if ($('sAnnSalva')) $('sAnnSalva').onclick = async () => {
      const ag = $('sAnnAg').value.trim(), pr = leggiPrezzo($('sAnnPr').value), li = $('sAnnLink').value.trim();
      const cambiato = ag !== (h.agenzia || '') || pr !== (h.prezzo || '') || li !== (h.annuncio || '');
      h.agenzia = ag; h.prezzo = pr; h.annuncio = li; if (cambiato) h.annuncioTs = pr || li ? Date.now() : '';
      if ((pr || li) && (h.stato === 'Da valutare' || !h.stato)) { h.stato = 'Cartello vendita'; marcatore(h); }
      try { await DB.put('case', h); toast('Annuncio segnato', 'ok'); } catch (e) { toast('Non riesco a salvare: ' + e.message, 'errore'); }
      apriScheda(h.id); if ($('fCase').classList.contains('aperto')) disegnaLista();
    };
    c.querySelectorAll('[data-nota]').forEach(b => b.onclick = () => apriNota(b.dataset.nota));
    $('sNotizia').onclick = () => { apriNota(); nn.casaId = h.id; if (h.lat !== '' && h.lat != null) { nn.lat = h.lat; nn.lng = h.lng; } if (!$('nDove').value) $('nDove').value = h.address || ''; };
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
  const notizieCasa = h => [...note.values()].filter(n => n.casaId === h.id).sort((a, b) => b.ts - a.ts);
  const firma = () => { const p = cfg.profilo || {}; return p.nome ? '— ' + [p.nome, p.agenzia, p.telefono].filter(Boolean).join(' · ') : ''; };
  const testoCasa = h => [h.address || 'Casa', [h.stato, h.tipo].filter(Boolean).join(' · '), h.agenzia ? 'Agenzia: ' + h.agenzia : '', h.prezzo ? 'In vendita a ' + prezzoTesto(h.prezzo) : '', h.annuncio || '', h.telefono ? 'Tel. ' + h.telefono : '', h.note || '', h.lat !== '' && h.lat != null ? 'Mappa: https://maps.google.com/?q=' + h.lat + ',' + h.lng : '', firma()].filter(Boolean).join('\n');
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
    const righe = [['Data', 'Comune', 'Indirizzo', 'Stato', 'Tipo', 'Agenzia', 'Prezzo annuncio', 'Annuncio', 'Telefono', 'Richiamare il', 'Note', 'Foto', 'Mappa'].map(q).join(';')];
    lista.forEach(h => righe.push([h.ts ? new Date(h.ts).toLocaleDateString('it-IT') : '', h.comune, h.address, h.stato, h.tipo, h.agenzia, h.prezzo || '', h.annuncio || '', h.telefono, h.richiamo ? new Date(h.richiamo + 'T12:00').toLocaleDateString('it-IT') : '', h.note, fotoDi(h).length || (h.photos || []).length, h.lat !== '' && h.lat != null ? 'https://maps.google.com/?q=' + h.lat + ',' + h.lng : ''].map(q).join(';')));
    condividiFile(new Blob(['﻿' + righe.join('\r\n')], { type: 'text/csv' }), 'case-' + (comune || 'tutte').replace(/\s+/g, '-') + '-' + new Date().toISOString().slice(0, 10) + '.csv');
  }

  // ---------- è già in vendita? ricerca sui portali dall'indirizzo ----------
  // I portali non danno i loro annunci ad altre app: l'app apre la ricerca giusta e l'agente segna quello che trova.
  const PORTALI = [{ n: 'Immobiliare.it', s: 'immobiliare.it' }, { n: 'Idealista', s: 'idealista.it' }, { n: 'Casa.it', s: 'casa.it' }, { n: 'Tutti i siti', s: '' }];
  function viaDi(address, comune) {
    const parti = String(address || '').split(',').map(x => x.trim()).filter(Boolean);
    const via = (parti[0] || '').replace(/\s+\d+\s*[a-z]?(\/\d+)?$/i, '').trim();
    const paese = parti.length > 1 ? parti[parti.length - 1].replace(/^\d{5}\s*/, '') : (comune || '');
    return { via, paese: paese || comune || '' };
  }
  function linkPortale(p, address, comune) {
    const { via, paese } = viaDi(address, comune);
    const q = [p.s ? 'site:' + p.s : '', via ? '"' + via + '"' : '', paese, p.s ? 'vendita' : 'casa in vendita'].filter(Boolean).join(' ');
    return 'https://www.google.com/search?q=' + encodeURIComponent(q);
  }
  const portaliHTML = (address, comune) => PORTALI.map(p => `<a class="portale" target="_blank" rel="noopener" href="${esc(linkPortale(p, address, comune))}">${svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>')}${esc(p.n)}</a>`).join('');
  const leggiPrezzo = t => { t = String(t || '').trim(); if (!t) return ''; let n = +t.replace(/[^\d]/g, ''); if (!n) return ''; if (/k\b|mila/i.test(t) && n < 10000) n *= 1000; return n; };
  const prezzoTesto = n => n ? '€ ' + Number(n).toLocaleString('it-IT') : '';

  // ---------- nuova casa / modifica ----------
  let nc = null;
  const casaModificata = () => nc && !nc.id && (nc.foto.length || nc.audio || $('note').value.trim() || $('telefono').value.trim() || $('richiamo').value || $('agenzia').value.trim() || $('prezzo').value.trim() || $('annuncio').value.trim());
  function apriNuovaCasa(esistente) {
    if (esistente) nc = { id: esistente.id, pos: esistente.lat !== '' && esistente.lat != null ? { lat: esistente.lat, lng: esistente.lng, acc: esistente.acc || 0 } : null, foto: (esistente.foto || []).slice(), audio: esistente.audio || null, audioSec: esistente.audioSec || 0, stato: esistente.stato || 'Da valutare', tipo: esistente.tipo || '', ts: esistente.ts, sync: esistente.sync };
    else nc = { pos: posizione ? { ...posizione } : null, foto: [], audio: null, stato: 'Da valutare', tipo: '' };
    $('tCasaTitolo').textContent = esistente ? 'Modifica casa' : 'Nuova casa';
    $('note').value = esistente ? esistente.note || '' : ''; $('telefono').value = esistente ? esistente.telefono || '' : ''; $('richiamo').value = esistente ? esistente.richiamo || '' : ''; $('richiamo').min = oggiISO();
    $('indirizzo').value = esistente ? esistente.address || '' : '';
    $('agenzia').value = esistente ? esistente.agenzia || '' : '';
    $('prezzo').value = esistente && esistente.prezzo ? Number(esistente.prezzo).toLocaleString('it-IT') : ''; $('annuncio').value = esistente ? esistente.annuncio || '' : '';
    aggiornaPortali();
    $('listaAgenzie').innerHTML = [...new Set(['Privato', ...[...case_.values()].map(h => h.agenzia).filter(Boolean)])].map(a => `<option value="${esc(a)}">`).join('');
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
  const allarga = () => { const t = $('indirizzo'); t.style.height = 'auto'; t.style.height = t.scrollHeight + 4 + 'px'; if (nc) aggiornaPortali(); };
  $('indirizzo').addEventListener('input', () => { allarga(); aggiornaPortali(); });
  function aggiornaPortali() { const v = nc && nc.id ? case_.get(nc.id) : null; $('portaliCasa').innerHTML = portaliHTML($('indirizzo').value, v ? v.comune : cfg.comune); }
  $('prezzo').addEventListener('change', () => { const n = leggiPrezzo($('prezzo').value); $('prezzo').value = n ? Number(n).toLocaleString('it-IT') : ''; });
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
      stato: nc.stato === 'Da valutare' && (leggiPrezzo($('prezzo').value) || $('annuncio').value.trim()) ? 'Cartello vendita' : nc.stato === 'Da valutare' && $('richiamo').value ? 'Da ricontattare' : nc.stato, tipo: nc.tipo, note: $('note').value.trim(), telefono: $('telefono').value.trim(), richiamo: $('richiamo').value, agenzia: $('agenzia').value.trim(), prezzo: leggiPrezzo($('prezzo').value), annuncio: $('annuncio').value.trim(),
      foto: nc.foto.slice(), audio: nc.audio, audioSec: nc.audioSec || 0,
      sync: vecchia && vecchia.sync === 'ok' ? 'ok' : conGoogle() ? 'attesa' : 'locale', remote: vecchia ? vecchia.remote : null
    };
    h.annuncioTs = vecchia && vecchia.prezzo === h.prezzo && (vecchia.annuncio || '') === h.annuncio ? vecchia.annuncioTs || '' : (h.prezzo || h.annuncio ? Date.now() : '');
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
        const house = { id: r.id, ts: r.ts, comune: r.comune, day: '', address: r.address, lat: r.lat, lng: r.lng, acc: r.acc, stato: r.stato, tipo: r.tipo, note: [r.note, r.agenzia ? 'Cartello: ' + r.agenzia : '', r.telefono ? 'Tel. ' + r.telefono : '', r.richiamo ? 'Richiamare il ' + new Date(r.richiamo + 'T12:00').toLocaleDateString('it-IT') : ''].filter(Boolean).join(' – '),
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
    for (const k of await DB.chiavi('visti')) { const v = await DB.get('visti', k); if (v) copertura[k] = { id: v.id, b64: b64da(v.v), p: v.p ? b64da(v.p) : '', f: v.f ? b64da(v.f) : '' }; }
    const dati = { app: 'Zona', versione: VERSIONE, creato: new Date().toISOString(), cfg: { comuni: cfg.comuni, rivedi: cfg.rivedi, aree: cfg.aree, zonaNome: cfg.zonaNome, profilo: cfg.profilo }, case: case2, reti, copertura,
      note: [...note.values()], persone: [...persone.values()], agenda: [...agenda.values()], uscite };
    condividiFile(new Blob([JSON.stringify(dati)], { type: 'application/json' }), 'zona-backup-' + (nomeAgente() ? nomeAgente().toLowerCase() + '-' : '') + new Date().toISOString().slice(0, 10) + '.json');
  }
  $('inputBackup').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const d = JSON.parse(await f.text()); if (d.app !== 'Zona' && d.app !== 'Agente Moni') throw new Error('non è un backup di Zona');
      const dc = d.cfg || {};
      if (dc.aree) for (const [k, v] of Object.entries(dc.aree)) if (!cfg.aree[k]) cfg.aree[k] = v;
      if (dc.zonaNome && !cfg.zonaNome) cfg.zonaNome = dc.zonaNome;
      if (dc.profilo && !(cfg.profilo && cfg.profilo.nome)) salvaProfilo(dc.profilo);
      for (const [store, mappa] of [['note', note], ['persone', persone], ['agenda', agenda]]) for (const x of d[store] || []) if (x && x.id && !mappa.has(x.id)) { mappa.set(x.id, x); await DB.put(store, x); }
      for (const u of d.uscite || []) if (u && u.id && !uscite.some(x => x.id === u.id)) { uscite.push(u); await DB.put('uscite', u); }
      uscite.sort((a, b) => a.inizio - b.inizio);
      let nCase = 0;
      for (const h of d.case || []) { if (await DB.get('case', h.id)) continue; if (h.audio && h.audio.b64) { const bin = atob(h.audio.b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); h.audio = new Blob([u], { type: h.audio.mime }); } else h.audio = null; await DB.put('case', h); nCase++; }
      for (const [k, r] of Object.entries(d.reti || {})) { if (!(await DB.get('reti', k))) await DB.put('reti', r, k); if (!cfg.comuni.includes(k)) cfg.comuni.push(k); }
      for (const [k, c] of Object.entries(d.copertura || {})) {
        const r = await DB.get('reti', k); if (!r || r.id !== c.id) continue;
        const mio = await DB.get('visti', k), stessa = mio && mio.id === c.id, out = { id: c.id };
        for (const [campo, b] of [['v', c.b64], ['p', c.p], ['f', c.f]]) {
          const loro = b ? u16da(b) : null, v = stessa && mio[campo] ? mio[campo] : loro ? new Uint16Array(loro.length) : null;
          if (v && loro && loro.length === v.length) for (let i = 0; i < v.length; i++) if (loro[i] > v[i]) v[i] = loro[i];
          if (v) out[campo] = v;
        }
        if (out.v) await DB.put('visti', out, k);
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
    voci.push({ i: ICO.grafico, t: 'Il mio pannello', s: 'Da fare oggi, settimana, zona, uscite', f: apriPannello });
    voci.push({ i: ICO.nota, t: 'Taccuino', s: note.size + ' notizie · ' + persone.size + ' persone della zona', f: () => apriTaccuino() });
    voci.push({ i: ICO.casa, t: 'Le mie case', s: casePerComune().length + ' a ' + (cfg.comune || '—'), f: () => { chiudi('fMenu'); apriCase(); } });
    voci.push({ i: ICO.mappa, t: cfg.zonaNome ? 'La mia zona: ' + cfg.zonaNome : 'La mia zona', s: (cfg.comuni.length === 1 ? '1 area' : cfg.comuni.length + ' aree') + ' · cambia o aggiungi', f: () => { chiudi('fMenu'); apriComuni(); } });
    if (G && (R.isolate || []).length) voci.push({ i: ICO.auto, t: 'Case isolate in macchina', s: (R.isolate.length - Object.keys(S.isolateViste).length) + ' da vedere', f: () => { chiudi('fMenu'); if (S.fase === 'cammino' && !confirm('Interrompo il giro a piedi?')) return; if (S.fase === 'cammino') bastaPerOggi(); S.fase = 'macchina'; salvaStato(); aggiorna(true); } });
    voci.push({ i: ICO.foglio, t: 'Esporta in Excel', s: 'Case di ' + (cfg.comune || '—') + ' o tutte le notizie', f: () => { if (confirm('Esporto le case di ' + (cfg.comune || 'questa area') + '? (Annulla = esporta le notizie del taccuino)')) esportaCSV(casePerComune(), cfg.comune); else esportaNote(); } });
    if (conGoogle()) voci.push({ i: ICO.foglio, t: 'Apri il foglio Google', s: 'Tutte le case nel foglio condiviso', f: () => { const u = LS.get('sheetUrl', ''); if (u) window.open(u, '_blank'); else toast('Prova prima il collegamento nelle impostazioni.', 'errore'); } });
    voci.push({ i: ICO.persona, t: 'Profilo' + (nomeAgente() ? ': ' + nomeAgente() : ''), s: 'Dati, obiettivi, PIN, altri agenti', f: apriProfilo });
    voci.push({ i: ICO.ingranaggio, t: 'Impostazioni', s: 'Ripasso delle strade, avvisi, backup, Google', f: () => { chiudi('fMenu'); apriImpost(); } });
    voci.push({ i: ICO.aiuto, t: 'Tutorial', s: 'Dove sono le cose, in un minuto', f: () => { chiudi('fMenu'); setTimeout(avviaTutorial, 300); } });
    voci.push({ i: ICO.lista, t: 'Come si usa', s: 'Spiegazione in 2 minuti', f: () => { chiudi('fMenu'); apriAiuto(); } });
    c.innerHTML = '';
    voci.forEach(v => { const b = document.createElement('button'); b.className = 'voce-menu'; b.innerHTML = `${v.i}<span>${esc(v.t)}<small>${esc(v.s)}</small></span>`; b.onclick = v.f; c.appendChild(b); });
    apri('fMenu');
  }
  $('tMenu').onclick = apriMenu;

  // ---------- comuni e quartieri della zona ----------
  function aggiungiComune(nome) {
    nome = nome.replace(/\s+/g, ' ').trim();
    if (!cfg.comuni.includes(nome)) cfg.comuni.push(nome);
    salvaCfg(); cambiaComune(nome);
  }
  async function cambiaComune(nome) {
    if (S.fase === 'cammino' && !confirm('Interrompo il giro in corso? Le strade viste restano segnate.')) return;
    if (S.fase !== 'home') bastaPerOggi();
    if (G) { aggiornaStatArea(); await DB.put('visti', recVisti(), cfg.comune).catch(() => { }); }
    zonaCache.delete(cfg.comune); zonaCache.delete(nome); vistaZona = false; grigliaZona = null; riservaConfini.clear(); if (map.hasLayer(stratoZona)) map.removeLayer(stratoZona);
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
      <p class="versione">Zona · versione ${VERSIONE}</p>`;
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
      const n = cfg.comune; await DB.del('reti', n).catch(() => { }); await DB.del('visti', n).catch(() => { }); LS.del('stato4_' + n);
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
      const r = await Planner.scaricaRete(nome, m => { el.textContent = m; }, cfg.aree[nome]);
      const Gn = Planner.prepara(r), vn = new Uint16Array(Gn.m), pn = new Uint16Array(Gn.m), fn = new Uint16Array(Gn.m);
      Planner.rimappa(Gv, vv, Gn, vn); Planner.rimappaSegno(Gv, passi, Gn, pn); Planner.rimappaSegno(Gv, volant, Gn, fn);
      await DB.put('reti', r, nome); await DB.put('visti', { id: r.id, v: vn, p: pn, f: fn }, nome);
      if (conGoogle()) api('saveRoutes', { comune: nome + ' (rete v4)', plan: r }).catch(() => { });
      el.textContent = 'Mappa aggiornata.';
      if (nome === cfg.comune) { S.rotta = null; if (S.fase === 'cammino') S.fase = 'home'; salvaStato(); attivaRete(r, { id: r.id, v: vn, p: pn, f: fn }); aggiorna(true); sincronizzaCopertura(true); }
    } catch (e) { el.textContent = 'Non riesco: ' + e.message; }
    b.disabled = false;
  }

  function apriAiuto() {
    $('aiutoCorpo').innerHTML = `<p><b>La tua zona.</b> È il territorio che lavori: uno o più comuni, un quartiere o una zona disegnata sulla mappa. La aggiungi e la cambi da Menu → La mia zona. Con "Tutta la zona" la vedi intera: il bordo scuro è il confine, dentro il verde è la parte già vista e l'ocra quella da vedere.</p>
      <p><b>Gli strumenti</b> sono nella barra sopra il pannello: le tue case, torna dove sei, legenda e strati, menu. In alto a destra c'è il tuo profilo, con obiettivi, PIN e questo aiuto.</p>
      <p><b>1. Scegli quanto tempo hai.</b> L'app prepara un giro a piedi sulle strade con case che non hai ancora visto, partendo da dove sei. Se sei lontano, ti propone le zone più vicine e ti porta a parcheggiare.</p>
      <p><b>2. Segui la linea gialla.</b> Le frecce indicano il verso; in alto c'è dove girare. Il pezzo già fatto diventa grigio tratteggiato; la freccia blu sul tuo pallino è la direzione in cui cammini. Se prendi un'altra strada, il giro si aggiorna da solo.</p>
      <p><b>3. Il segno delle strade.</b> Le strade dove passi a piedi restano verde scuro per 3 mesi; poi diventano verde chiaro. Le blu hanno case da vedere. In macchina non si segna niente. Il tasto con i fogli sovrapposti sulla mappa mostra la legenda.</p>
      <p><b>4. Case:</b> "Nuova casa" salva indirizzo, foto, nota vocale, stato, telefono e agenzia. Dalla scheda chiami, condividi su WhatsApp o metti il giorno in cui richiamare.</p>
      <p><b>È già in vendita?</b> Nella scheda della casa i tasti Immobiliare.it, Idealista, Casa.it e "Tutti i siti" cercano quell'indirizzo sui portali. Se trovi l'annuncio, segna agenzia, prezzo e link: restano nella scheda, nell'Excel e nella condivisione. I portali non permettono ad altre app di leggere i loro annunci, per questo il controllo lo fai tu con un tocco.</p>
      <p><b>5. Taccuino:</b> quello che senti al bar, dai negozianti, dai vicini (chi vende, chi eredita, chi si trasferisce) va in "Notizia". Le persone che te le danno finiscono nella rubrica della zona e l'app ti ricorda di ripassare da loro.</p>
      <p><b>6. Volantini:</b> durante il giro accendi "Sto lasciando volantini": le strade si segnano e le vedi sulla mappa (strato "Strade con volantini").</p>
      <p><b>7. Il pannello:</b> cose da fare oggi (richiami, notizie da verificare, persone da risentire, promemoria tuoi), la settimana rispetto ai tuoi obiettivi, i chilometri delle ultime settimane, quanto hai visto di ogni area.</p>
      <p><b>8. Alla fine premi "Basta per oggi":</b> così l'uscita finisce nel pannello.</p>
      <p><b>Consiglio:</b> tieni lo schermo acceso (l'app lo fa da sola) e porta una batteria esterna. Ogni tanto fai Impostazioni → Salva backup.</p>`;
    apri('fAiuto');
  }

  // =====================================================================================
  // ZONA: profilo dell'agente, zona sulla mappa, pannello dell'attività, taccuino, agenda
  // =====================================================================================
  const saluto = () => { const h = new Date().getHours(); return h >= 5 && h < 13 ? 'Buongiorno' : h >= 13 && h < 18 ? 'Buon pomeriggio' : 'Buonasera'; };
  const nomeAgente = () => ((cfg.profilo && cfg.profilo.nome) || '').trim().split(/\s+/)[0] || '';
  const OB = () => Object.assign({ ore: 6, case: 10, notizie: 5, risentire: 30 }, (cfg.profilo && cfg.profilo.obiettivi) || {});
  // selettori degli obiettivi: cursore con meno/più, valori da min a max
  const SEL_OB = {
    ore: { nome: 'Ore a piedi', min: 0.5, max: 40, step: 0.5, fmt: v => oreTesto(v) },
    case: { nome: 'Case da segnare', min: 1, max: 100, step: 1, fmt: v => v === 1 ? '1 casa' : v + ' case' },
    notizie: { nome: 'Notizie da raccogliere', min: 1, max: 60, step: 1, fmt: v => v === 1 ? '1 notizia' : v + ' notizie' },
    risentire: { nome: 'Ripassare dalle persone della zona', min: 0, max: 120, step: 1, fmt: v => v ? (v === 1 ? 'ogni giorno' : 'ogni ' + v + ' giorni') : 'mai' }
  };
  function selettore(campo, valore, nome) {
    const d = SEL_OB[campo], v = Math.min(d.max, Math.max(d.min, valore));
    return `<div class="selettore" data-campo="${campo}"><div class="sel-testa"><span>${esc(nome || d.nome)}</span><output>${esc(d.fmt(v))}</output></div>
      <div class="sel-corpo"><button type="button" class="sel-passo" data-d="-1" aria-label="Meno">${svg('<path d="M6 12h12"/>')}</button>
      <input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${v}" aria-label="${esc(nome || d.nome)}">
      <button type="button" class="sel-passo" data-d="1" aria-label="Più">${svg('<path d="M12 6v12M6 12h12"/>')}</button></div>
      <div class="sel-scala"><span>${esc(d.fmt(d.min))}</span><span>${esc(d.fmt(d.max))}</span></div></div>`;
  }
  function collegaSelettori(box) {
    box.querySelectorAll('.selettore').forEach(el => {
      const campo = el.dataset.campo, d = SEL_OB[campo], r = el.querySelector('input'), out = el.querySelector('output');
      const pieno = () => r.style.setProperty('--pieno', (100 * (r.value - d.min) / (d.max - d.min)) + '%');
      const mostra = () => { out.textContent = d.fmt(+r.value); pieno(); };
      const salva = () => salvaProfilo({ obiettivi: Object.assign({}, OB(), { [campo]: +r.value }) });
      r.oninput = mostra; r.onchange = salva; pieno();
      el.querySelectorAll('.sel-passo').forEach(b => {
        let t = null, n = 0;
        const passo = () => { const v = Math.min(d.max, Math.max(d.min, Math.round((+r.value + d.step * +b.dataset.d) / d.step) * d.step)); r.value = v; mostra(); };
        const ferma = () => { if (t) { clearTimeout(t); t = null; salva(); } };
        b.onpointerdown = e => { e.preventDefault(); n = 0; passo(); const ripeti = () => { n++; passo(); t = setTimeout(ripeti, n > 6 ? 60 : 140); }; t = setTimeout(ripeti, 420); };
        b.onpointerup = b.onpointerleave = b.onpointercancel = ferma;
        b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); passo(); salva(); } };
      });
    });
  }
  const nuovoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const giornoISO = ts => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const inizioSettimana = (ts = Date.now()) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
  const settimanaPrima = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate() - 7 * n); return d.getTime(); };
  const dataBreve = ts => new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  const giorniFa = ts => { const g = Math.floor((inizioGiorno(Date.now()) - inizioGiorno(ts)) / 864e5); return g <= 0 ? 'oggi' : g === 1 ? 'ieri' : g + ' giorni fa'; };
  const inizioGiorno = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const taglia = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  const tipoArea = n => { const a = cfg.aree[n]; return !a || a.tipo === 'comune' || !a.tipo ? 'Comune' : a.tipo === 'quartiere' ? 'Quartiere' : 'Zona disegnata'; };
  const nCaseArea = n => [...case_.values()].filter(h => h.comune === n).length;
  const kmBreve = km => km < 1 ? Math.round(km * 1000 / 10) * 10 + ' m' : km.toFixed(1).replace('.', ',') + ' km';

  // ---------- dati del taccuino e delle uscite ----------
  const note = new Map(), persone = new Map(), agenda = new Map(); let uscite = [];
  async function caricaTaccuino() {
    try { (await DB.all('note')).forEach(n => note.set(n.id, n)); } catch (e) { }
    try { (await DB.all('persone')).forEach(n => persone.set(n.id, n)); } catch (e) { }
    try { (await DB.all('agenda')).forEach(n => agenda.set(n.id, n)); } catch (e) { }
    try { uscite = (await DB.all('uscite')).sort((a, b) => a.inizio - b.inizio); } catch (e) { uscite = []; }
    disegnaNote();
  }
  function registraUscita(ses, ult) {
    const fine = Math.max(ses.inizio, ses.ultimo || ses.inizio);
    const u = { id: nuovoId(), inizio: ses.inizio, fine, minuti: Math.round((fine - ses.inizio) / 60e3), area: cfg.comune, metri: Math.round(ses.metri || 0), kmNuovi: +(ult.kmNuovi || 0).toFixed(3), case: ult.case || 0, metriVol: Math.round(ses.metriVol || 0) };
    if (u.metri < 30 && !u.case) return;
    uscite.push(u); DB.put('uscite', u).catch(() => { });
    aggiornaStatArea();
  }
  function aggiornaStatArea() {
    if (!G || !cfg.comune) return;
    const a = cfg.aree[cfg.comune] || (cfg.aree[cfg.comune] = { tipo: 'comune' });
    a.stat = Object.assign(avanzamento(), { ts: Date.now() }); salvaCfg();
  }
  const statArea = n => n === cfg.comune && G ? avanzamento() : cfg.aree[n] && cfg.aree[n].stat;
  // statistiche delle altre aree (si calcolano dalla mappa salvata sul telefono)
  async function statTutte(forza) {
    let cambi = 0;
    for (const n of cfg.comuni) {
      if (n === cfg.comune) continue;
      const a = cfg.aree[n] || (cfg.aree[n] = { tipo: 'comune' });
      if (!forza && a.stat && Date.now() - a.stat.ts < 6 * 3600e3) continue;
      try {
        const z = await apriArea(n); if (!z) continue;
        a.stat = Object.assign(Planner.avanzamento(z.G, z.v, cfg.rivedi), { ts: Date.now() }); cambi++;
        if (!a.bbox) { let s = 90, w = 180, nn = -90, e = -180; for (let i = 0; i < z.G.n; i++) { const la = z.G.R.lat[i], lo = z.G.R.lon[i]; if (la < s) s = la; if (la > nn) nn = la; if (lo < w) w = lo; if (lo > e) e = lo; } a.bbox = [s, w, nn, e]; }
      } catch (e) { }
    }
    if (cambi) salvaCfg();
    return cambi;
  }
  async function apriArea(n) {
    if (zonaCache.has(n)) return zonaCache.get(n);
    const r = await DB.get('reti', n); if (!r) return null;
    const v = await DB.get('visti', n), g = Planner.prepara(r), ok = v && v.id === r.id;
    const z = { G: g, v: ok && v.v ? v.v : new Uint16Array(g.m), p: ok && v.p ? v.p : ok && v.v ? v.v : new Uint16Array(g.m), f: ok && v.f ? v.f : null };
    zonaCache.set(n, z);
    return z;
  }

  // ---------- agenda: cose da fare oggi ----------
  function cosePerOggi(giorniAvanti = 0) {
    const lim = giornoISO(Date.now() + giorniAvanti * 864e5), out = [];
    for (const h of case_.values()) if (h.richiamo && h.richiamo <= lim) out.push({ tipo: 'casa', quando: h.richiamo, titolo: 'Richiama: ' + (h.address || 'casa'), sotto: [h.telefono, h.comune].filter(Boolean).join(' · '), id: h.id });
    for (const n of note.values()) if (n.verifica && n.verifica <= lim && n.stato === 'Da verificare') out.push({ tipo: 'nota', quando: n.verifica, titolo: 'Verifica: ' + taglia(n.testo, 70), sotto: [n.tipoInfo, n.chi].filter(Boolean).join(' · '), id: n.id });
    for (const a of agenda.values()) if (!a.fatto && (!a.giorno || a.giorno <= lim)) out.push({ tipo: 'compito', quando: a.giorno || giornoISO(a.ts), titolo: a.testo, sotto: a.giorno ? dataTesto(a.giorno) : 'Senza data', id: a.id });
    const ris = OB().risentire;
    if (ris) for (const p of persone.values()) { const u = p.ultimo || p.ts; const quando = giornoISO(u + ris * 864e5); if (quando <= lim) out.push({ tipo: 'persona', quando, titolo: 'Passa a trovare ' + p.nome, sotto: [p.ruolo, 'sentita ' + giorniFa(u)].filter(Boolean).join(' · '), id: p.id }); }
    return out.sort((a, b) => a.quando < b.quando ? -1 : a.quando > b.quando ? 1 : 0);
  }
  const ICO_AGENDA = { casa: () => ICO.telefono, nota: () => ICO.nota, compito: () => ICO.lista, persona: () => ICO.persona };
  function rigaAgenda(x) {
    const ritardo = x.quando < oggiISO() ? ' ritardo' : '';
    return `<div class="agenda-riga${ritardo}"><button class="agenda-ico" data-ag="${x.tipo}:${x.id}" aria-label="${x.tipo === 'compito' ? 'Segna come fatto' : 'Apri'}">${x.tipo === 'compito' ? '<span class="spunta-vuota"></span>' : ICO_AGENDA[x.tipo]()}</button><button class="agenda-testo" data-apri="${x.tipo}:${x.id}"><b>${esc(x.titolo)}</b><span>${esc(x.sotto)}${ritardo ? ' · in ritardo' : ''}</span></button></div>`;
  }
  function collegaAgenda(box, ridisegna) {
    const fai = async (k, apriSolo) => {
      const [tipo, id] = k.split(':');
      if (tipo === 'casa') apriScheda(id);
      else if (tipo === 'nota') apriNota(id);
      else if (tipo === 'persona') apriPersona(id);
      else if (tipo === 'compito' && !apriSolo) { const a = agenda.get(id); if (a) { a.fatto = Date.now(); await DB.put('agenda', a); toast('Fatto', 'ok'); ridisegna(); pannello(); } }
      else if (tipo === 'compito') { const a = agenda.get(id); if (a) { const t = prompt('Cosa devi fare?', a.testo); if (t != null) { if (!t.trim()) { await DB.del('agenda', id); agenda.delete(id); } else { a.testo = t.trim(); await DB.put('agenda', a); } ridisegna(); pannello(); } } }
    };
    box.querySelectorAll('[data-ag]').forEach(b => b.onclick = () => fai(b.dataset.ag, false));
    box.querySelectorAll('[data-apri]').forEach(b => b.onclick = () => fai(b.dataset.apri, true));
  }

  // ---------- area in cui mi trovo (se è un'altra della mia zona) ----------
  function areaQui() {
    if (!posizione || S.fase !== 'home' || cfg.comuni.length < 2 || vistaZona) return null;
    const la = posizione.lat, lo = posizione.lng, m = 0.0005;
    if (G && Planner.nodoVicino(G, la, lo, 120) >= 0) return null;
    for (const n of cfg.comuni) {
      if (n === cfg.comune) continue;
      const a = cfg.aree[n]; if (!a || !a.bbox) continue;
      const b = a.bbox; if (la < b[0] - m || la > b[2] + m || lo < b[1] - m || lo > b[3] + m) continue;
      if (a.poly && !Planner.dentroPoligono(a.poly, la, lo)) continue;
      return n;
    }
    return null;
  }

  // ---------- vista di tutta la zona ----------
  async function mostraZona(on) {
    if (on && S.fase !== 'home') { toast('Finisci prima il giro in corso.', 'errore'); return; }
    if (on) { toast('Apro tutta la zona…', '', 1800); for (const n of cfg.comuni) if (n !== cfg.comune) { try { await apriArea(n); } catch (e) { } } await statTutte(); }
    vistaZona = on; anteprima = null; zone = null;
    if (!on) { grigliaZona = null; if (map.hasLayer(stratoZona)) map.removeLayer(stratoZona); }
    caricaMarcatori(); disegnaNote(); disegnaRete(); aggiorna(true);
    if (!on) disegna(true); else caricaConfini();
  }
  function disegnaZona() {
    for (const n of cfg.comuni) {
      if (n === cfg.comune && G) disegnaReteDi(G, visti, passi, volant, lRete, false);
      else { const z = zonaCache.get(n); if (z) disegnaReteDi(z.G, z.v, z.p, z.f, lRete, false); }
    }
    grigliaZona = calcolaGriglia();
    if (!map.hasLayer(stratoZona)) stratoZona.addTo(map); else stratoZona.ridisegna();
  }

  // ---------- tutta la zona: confine esterno marcato, dentro due colori (già vista / da vedere) ----------
  // Ogni punto della zona prende il colore della strada con case più vicina: verde se vista, ocra se da vedere.
  map.createPane('zonaFondo').style.zIndex = 380;
  const COL_VISTA = [46, 125, 79], COL_DAFARE = [242, 169, 0], ALFA_ZONA = 0.27;
  const riservaConfini = new Map();   // involucro dei nodi, finché il confine vero non è scaricato
  let grigliaZona = null;
  const reteArea = n => n === cfg.comune && G ? { G, v: visti } : zonaCache.get(n) || null;
  function confiniDi(n) {
    const a = cfg.aree[n]; if (!a) return null;
    if (a.poly && a.poly.length >= 3) return [a.poly];
    if (a.confine && a.confine.length) return a.confine;
    if (riservaConfini.has(n)) return riservaConfini.get(n);
    const z = reteArea(n); if (!z) return null;
    const pts = [], passo = Math.max(1, Math.floor(z.G.n / 5000));
    for (let i = 0; i < z.G.n; i += passo) pts.push([z.G.R.lat[i], z.G.R.lon[i]]);
    const h = Planner.involucro(pts); if (h.length < 3) return null;
    riservaConfini.set(n, [h]); return [h];
  }
  const anelliZona = () => cfg.comuni.flatMap(n => (confiniDi(n) || []).map(a => ({ n, a })));
  function calcolaGriglia() {
    const anelli = anelliZona(); if (!anelli.length) return null;
    let s = 90, w = 180, nn = -90, e = -180;
    anelli.forEach(({ a }) => a.forEach(p => { if (p[0] < s) s = p[0]; if (p[0] > nn) nn = p[0]; if (p[1] < w) w = p[1]; if (p[1] > e) e = p[1]; }));
    const kx = 111320 * Math.cos((s + nn) / 2 * Math.PI / 180), ky = 110540;
    const cs = Math.max(20, Math.sqrt((e - w) * kx * (nn - s) * ky / 300000));
    const dLon = cs / kx, dLat = cs / ky, W = Math.max(1, Math.ceil((e - w) / dLon) + 2), H = Math.max(1, Math.ceil((nn - s) / dLat) + 2);
    const w0 = w - dLon, n0 = nn + dLat;
    const vista = new Float32Array(W * H), fare = new Float32Array(W * H);
    let mVista = 0, mFare = 0;
    for (const nome of cfg.comuni) {
      const z = reteArea(nome); if (!z) continue;
      const Gx = z.G, da = Planner.daVedereFn(Gx, z.v, cfg.rivedi);
      for (let ed = 0; ed < Gx.m; ed++) {
        if (!Gx.ER[ed]) continue;
        const a = Gx.EU[ed], b = Gx.EV[ed], la1 = Gx.R.lat[a], lo1 = Gx.R.lon[a], la2 = Gx.R.lat[b], lo2 = Gx.R.lon[b];
        const lung = Gx.EL[ed], k = Math.max(1, Math.ceil(lung / (cs * 0.5))), dafare = da(ed), arr = dafare ? fare : vista, peso = lung / (k + 1);
        if (dafare) mFare += lung; else mVista += lung;
        for (let t = 0; t <= k; t++) {
          const f = t / k, x = Math.floor((lo1 + (lo2 - lo1) * f - w0) / dLon), y = Math.floor((n0 - (la1 + (la2 - la1) * f)) / dLat);
          if (x >= 0 && x < W && y >= 0 && y < H) arr[y * W + x] += peso;
        }
      }
    }
    const lab = new Uint8Array(W * H), q = new Int32Array(W * H); let qh = 0, qt = 0;
    for (let i = 0; i < W * H; i++) if (vista[i] || fare[i]) { lab[i] = vista[i] >= fare[i] ? 1 : 2; q[qt++] = i; }
    while (qh < qt) {
      const i = q[qh++], x = i % W, y = (i / W) | 0, l = lab[i];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const j = Y * W + X; if (!lab[j]) { lab[j] = l; q[qt++] = j; }
      }
    }
    const img = document.createElement('canvas'); img.width = W; img.height = H;
    const ctx = img.getContext('2d'), id = ctx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { const c = lab[i] === 1 ? COL_VISTA : lab[i] === 2 ? COL_DAFARE : null; if (!c) continue; id.data[i * 4] = c[0]; id.data[i * 4 + 1] = c[1]; id.data[i * 4 + 2] = c[2]; id.data[i * 4 + 3] = 255; }
    ctx.putImageData(id, 0, 0);
    return { anelli, img, nord: n0, ovest: w0, sud: n0 - H * dLat, est: w0 + W * dLon, kmVista: mVista / 1000, kmFare: mFare / 1000, semi: qt > 0 && (mVista + mFare) > 0 };
  }
  const StratoZona = L.Layer.extend({
    onAdd(m) {
      this._c = L.DomUtil.create('canvas', 'strato-zona'); this._c.style.pointerEvents = 'none';
      this._f = document.createElement('canvas'); this._b = document.createElement('canvas');
      m.getPane('zonaFondo').appendChild(this._c);
      m.on('moveend zoomend resize viewreset', this.ridisegna, this); m.on('zoomstart', this._nascondi, this);
      this.ridisegna();
    },
    onRemove(m) { m.off('moveend zoomend resize viewreset', this.ridisegna, this); m.off('zoomstart', this._nascondi, this); this._c.remove(); },
    _nascondi() { this._c.style.visibility = 'hidden'; },
    ridisegna() {
      if (!this._map) return;
      const m = this._map, sz = m.getSize(), r = window.devicePixelRatio || 1, c = this._c, g = grigliaZona;
      [c, this._f, this._b].forEach(k => { k.width = Math.round(sz.x * r); k.height = Math.round(sz.y * r); });
      c.style.width = sz.x + 'px'; c.style.height = sz.y + 'px'; c.style.visibility = 'visible';
      L.DomUtil.setPosition(c, m.containerPointToLayerPoint([0, 0]));
      if (!g) return;
      const percorsi = g.anelli.map(({ a }) => a.map(p => m.latLngToContainerPoint(p)));
      const anello = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); };
      const ctx = c.getContext('2d'); ctx.setTransform(r, 0, 0, r, 0, 0);
      // 1. colori dentro la zona (l'unione delle aree fa da maschera)
      if (g.semi) {
        const f = this._f.getContext('2d'); f.setTransform(r, 0, 0, r, 0, 0); f.fillStyle = '#000';
        percorsi.forEach(p => { anello(f, p); f.fill(); });
        f.globalCompositeOperation = 'source-in'; f.imageSmoothingEnabled = true; f.imageSmoothingQuality = 'high';
        const no = m.latLngToContainerPoint([g.nord, g.ovest]), se = m.latLngToContainerPoint([g.sud, g.est]);
        f.drawImage(g.img, no.x, no.y, se.x - no.x, se.y - no.y);
        f.globalCompositeOperation = 'source-over';
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = ALFA_ZONA; ctx.drawImage(this._f, 0, 0); ctx.restore();
      }
      // 2. confini tra un'area e l'altra: sottili, tratteggiati
      if (percorsi.length > 1) { ctx.save(); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(23,38,43,.5)'; percorsi.forEach(p => { anello(ctx, p); ctx.stroke(); }); ctx.restore(); }
      // 3. confine esterno di tutta la zona: si tolgono le parti interne, restano solo i bordi verso fuori
      const b = this._b.getContext('2d'); b.setTransform(r, 0, 0, r, 0, 0); b.lineJoin = 'round';
      b.strokeStyle = 'rgba(255,255,255,.95)'; b.lineWidth = 2 * 7.5; percorsi.forEach(p => { anello(b, p); b.stroke(); });
      b.strokeStyle = '#17262b'; b.lineWidth = 2 * 5; percorsi.forEach(p => { anello(b, p); b.stroke(); });
      b.globalCompositeOperation = 'destination-out'; b.fillStyle = '#000'; percorsi.forEach(p => { anello(b, p); b.fill(); }); b.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this._b, 0, 0); ctx.restore();
      ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(23,38,43,.9)'; percorsi.forEach(p => { anello(ctx, p); ctx.stroke(); }); ctx.restore();
    }
  });
  const stratoZona = new StratoZona();
  // confini veri dei comuni (OpenStreetMap), scaricati una volta e tenuti nelle impostazioni
  let confiniInCorso = false;
  async function caricaConfini() {
    if (confiniInCorso) return; confiniInCorso = true;
    try {
      for (const n of cfg.comuni.slice()) {
        const a = cfg.aree[n] || (cfg.aree[n] = { tipo: 'comune' });
        if ((a.tipo && a.tipo !== 'comune') || a.poly || (a.confine && a.confine.length)) continue;
        if (a.confineProvato && Date.now() - a.confineProvato < 6 * 3600e3) continue;
        try { a.confine = await Planner.confineComune(n); delete a.confineProvato; riservaConfini.delete(n); salvaCfg(); if (vistaZona) { grigliaZona = calcolaGriglia(); stratoZona.ridisegna(); } }
        catch (e) { a.confineProvato = Date.now(); salvaCfg(); }
      }
    } finally { confiniInCorso = false; }
  }
  function caricaMarcatori() { lCase.clearLayers(); marcatori.clear(); [...case_.values()].forEach(h => marcatore(h)); }
  function riepilogoZona() {
    let fatti = 0, tot = 0, recenti = 0; const aree = cfg.comuni.map(n => statArea(n)).filter(Boolean);
    aree.forEach(s => { fatti += s.kmFatti; tot += s.kmTot; recenti += s.kmRecenti || 0; });
    return { fatti, tot, recenti, perc: tot ? fatti / tot : 0, nAree: cfg.comuni.length, nCase: [...case_.values()].filter(h => cfg.comuni.includes(h.comune)).length };
  }
  function pannelloZona(box, on) {
    const z = riepilogoZona(), perc = Math.round(z.perc * 100);
    const righe = cfg.comuni.map(n => { const st = statArea(n); return `<button class="zona" data-a="${esc(n)}"><span class="num-giro">${ICO.mappa}</span><div><b>${esc(n)}</b><span>${st ? Math.round(st.perc * 100) + '% viste · ' + nCaseArea(n) + ' case' : tipoArea(n) + ' · mappa da scaricare'}</span></div>${n === cfg.comune ? '<span class="dist">aperta</span>' : ''}</button>`; }).join('');
    box.innerHTML = `<p class="ciao">${esc(cfg.zonaNome || 'La mia zona')}</p><h1>Tutta la zona</h1>
      <div class="avanz-testo"><span><b>${perc}%</b> delle strade con case viste</span><span>${kmBreve(z.fatti)} su ${kmBreve(z.tot)}</span></div><div class="avanz"><div style="width:${perc}%"></div></div>
      <div class="legenda-zona"><span><i style="background:rgba(${COL_VISTA},.5)"></i>Già vista</span><span><i style="background:rgba(${COL_DAFARE},.55)"></i>Da vedere</span><span><i class="bordo"></i>Confine</span></div>
      ${righe || '<p>Nessuna area nella zona.</p>'}
      <button class="tasto primario" id="bChiudiZona">Torna a ${esc(cfg.comune || 'la mappa')}</button>
      <div class="riga"><button class="link" id="bGestZona">Aggiungi un'area</button><button class="link" id="bPanZ">Pannello</button></div>`;
    box.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const n = b.dataset.a; if (n === cfg.comune) mostraZona(false); else cambiaComune(n); });
    on('bChiudiZona', () => mostraZona(false)); on('bGestZona', apriComuni); on('bPanZ', apriPannello);
  }

  // ---------- disegnare una zona sulla mappa ----------
  let disegno = null;
  const lDisegno = L.layerGroup().addTo(map);
  function iniziaDisegno(dopo) {
    if (S.fase === 'cammino') { toast('Finisci prima il giro in corso.', 'errore'); return; }
    ['fComuni', 'fBenvenuto', 'fMenu', 'fPannello'].forEach(chiudi);
    disegno = { punti: [], dopo }; chiudiPannello(true); $('disegna').classList.add('visibile'); aggiornaDisegno();
    if (posizione) map.setView([posizione.lat, posizione.lng], Math.max(map.getZoom(), 15));
    toast('Tocca la mappa lungo il confine della zona, un punto alla volta.', '', 5000);
  }
  function aggiornaDisegno() {
    lDisegno.clearLayers(); if (!disegno) return;
    const pts = disegno.punti;
    if (pts.length >= 3) L.polygon(pts, { color: '#17262b', weight: 3, fillColor: OCRA, fillOpacity: .2, interactive: false }).addTo(lDisegno);
    else if (pts.length === 2) L.polyline(pts, { color: '#17262b', weight: 3, interactive: false }).addTo(lDisegno);
    pts.forEach(p => L.circleMarker(p, { radius: 8, color: '#fff', weight: 3, fillColor: '#17262b', fillOpacity: 1, interactive: false }).addTo(lDisegno));
    $('disegnaTesto').textContent = pts.length < 3 ? `Tocca il confine: ${pts.length} di almeno 3 punti` : `${pts.length} punti · ${Planner.areaKm2(pts).toFixed(1).replace('.', ',')} km²`;
    $('disegnaFatto').disabled = pts.length < 3; $('disegnaTogli').disabled = !pts.length;
  }
  function fineDisegno(ok) {
    const d = disegno; disegno = null; lDisegno.clearLayers(); $('disegna').classList.remove('visibile'); chiudiPannello(false);
    const esci = nome => { if (d && d.dopo) d.dopo(nome); else if (nome) aggiungiComune(nome); };
    if (!ok || !d) return esci(null);
    const poly = d.punti.map(p => [+p[0].toFixed(6), +p[1].toFixed(6)]), km2 = Planner.areaKm2(poly);
    if (km2 > 30) { toast('Zona troppo grande (' + Math.round(km2) + ' km²): disegnane una più piccola o aggiungi il comune intero.', 'errore', 8000); return esci(null); }
    let nome = prompt('Come chiami questa zona?', 'Zona ' + (cfg.comuni.length + 1));
    if (!nome || !nome.trim()) return esci(null);
    nome = nome.replace(/\s+/g, ' ').trim(); while (cfg.comuni.includes(nome)) nome += ' bis';
    cfg.aree[nome] = { tipo: 'zona', poly }; salvaCfg();
    esci(nome);
  }
  $('disegnaTogli').onclick = () => { if (disegno) { disegno.punti.pop(); aggiornaDisegno(); } };
  $('disegnaAnnulla').onclick = () => fineDisegno(false);
  $('disegnaFatto').onclick = () => fineDisegno(true);

  // ---------- aggiungere aree: posizione, comune, quartiere ----------
  async function comuneDaPosizione(idLog = 'logQui', fatto) {
    const el = () => $(typeof idLog === 'string' ? idLog : 'logQui');
    const log = m => { if (el()) el().textContent = m; };
    log('Cerco la tua posizione…');
    const p = await aspettaGPS(25000);
    if (!p) { log('Il GPS non trova la posizione: scrivi il nome del comune.'); return; }
    log('Cerco dove sei…');
    let a; try { a = await Planner.trovaAree(p.lat, p.lon); } catch (e) { log('Server delle mappe occupati: riprova tra poco o scrivi il nome.'); return; }
    if (!a.comune) { log('Non trovo il comune qui: scrivi il nome.'); return; }
    const fine = fatto || (nome => { chiudi('fComuni'); aggiungiComune(nome); });
    const box = el(); if (!box) return;
    box.innerHTML = `<p style="margin:10px 0 0;color:var(--ardesia)">Sei a <b>${esc(a.quartiere ? a.quartiere + ', ' : '')}${esc(a.comune)}</b>.</p><button class="tasto primario" id="pcCom">${ICO.piu}Aggiungi tutto ${esc(a.comune)}</button>${a.quartiere ? `<button class="tasto" id="pcQ">Solo il quartiere ${esc(a.quartiere)}</button>` : ''}`;
    $('pcCom').onclick = () => { if (cfg.comuni.includes(a.comune)) { toast(a.comune + ' è già nella tua zona.'); return; } fine(a.comune); };
    if ($('pcQ')) $('pcQ').onclick = () => prendiQuartiere(a.comune, a.quartiere, box, fine);
  }
  async function prendiQuartiere(citta, q, box, fine) {
    box.innerHTML = '<p class="log">Scarico il confine di ' + esc(q) + '…</p>';
    try {
      const poly = await Planner.confineQuartiere(citta, q), nome = q + ' (' + citta + ')';
      if (cfg.comuni.includes(nome)) { toast(nome + ' è già nella tua zona.'); box.innerHTML = ''; return; }
      cfg.aree[nome] = { tipo: 'quartiere', citta, nome: q, poly }; salvaCfg(); fine(nome);
    } catch (e) { box.innerHTML = '<p class="log">' + esc(e.message) + '</p>'; }
  }
  async function cercaQuartieri(citta, box, fine) {
    if (!citta) { toast('Scrivi prima il nome della città.', 'errore'); return; }
    box.innerHTML = '<p class="log">Cerco i quartieri di ' + esc(citta) + '…</p>';
    let nomi = [];
    try { nomi = await Planner.quartieri(citta); } catch (e) { box.innerHTML = '<p class="log">Server delle mappe occupati: riprova tra poco, oppure disegna la zona sulla mappa.</p>'; return; }
    box.innerHTML = nomi.length ? `<p class="aiuto">Tocca il quartiere che lavori:</p><div class="scelte" style="margin-top:8px">${nomi.slice(0, 120).map((n, i) => `<button class="scelta senza-icona" data-q="${i}">${esc(n)}</button>`).join('')}</div>` : `<p class="log">Non trovo quartieri di ${esc(citta)} sulle mappe (controlla il nome ufficiale). Puoi disegnare la zona sulla mappa.</p>`;
    box.querySelectorAll('[data-q]').forEach(b => b.onclick = () => prendiQuartiere(citta, nomi[+b.dataset.q], box, fine));
  }
  async function apriComuni(modo) {
    const c = $('comuniCorpo');
    $('tfComuni').textContent = cfg.zonaNome || 'La mia zona';
    c.innerHTML = `<label class="campo" for="nomeZona" style="margin-top:8px">Nome della zona</label><input class="campo" id="nomeZona" placeholder="Per esempio Franciacorta" value="${esc(cfg.zonaNome || '')}">
      <h3 class="gruppo">Comuni e quartieri<span>${cfg.comuni.length}</span></h3><div id="listaAree"></div>
      <h3 class="gruppo">Aggiungi alla zona</h3>
      <button class="tasto" id="bQuiC">${ICO.posizione}Il posto dove sono adesso</button><div class="log" id="logQuiC"></div>
      <label class="campo" for="nuovoComune">Un comune intero</label><input class="campo" id="nuovoComune" placeholder="Nome ufficiale, per esempio Provaglio d'Iseo" autocomplete="off"><button class="tasto" id="bAggiungi">${ICO.piu}Aggiungi il comune</button>
      <label class="campo" for="cittaQ">Un quartiere di una città</label><input class="campo" id="cittaQ" placeholder="La città, per esempio Brescia" autocomplete="off"><button class="tasto" id="bCercaQ">Cerca i quartieri</button><div id="listaQ"></div>
      <button class="tasto" id="bDisegnaC">${ICO.matita}Disegna la zona sulla mappa</button><p class="aiuto">Per una zona fatta a mano: alcune vie, un pezzo di città, più frazioni insieme.</p>`;
    $('nomeZona').onchange = () => { cfg.zonaNome = $('nomeZona').value.trim(); salvaCfg(); $('tfComuni').textContent = cfg.zonaNome || 'La mia zona'; pannello(); };
    const la = $('listaAree');
    let scaricati = []; try { scaricati = await DB.chiavi('reti'); } catch (e) { }
    if (!cfg.comuni.length) la.innerHTML = '<p class="aiuto">Ancora niente: aggiungi la prima area qui sotto.</p>';
    for (const nome of cfg.comuni) {
      const b = document.createElement('button'); b.className = 'giorno-scelta' + (nome === cfg.comune ? ' oggi' : '');
      const st = statArea(nome);
      const sotto = !scaricati.includes(nome) ? 'Mappa da scaricare (1-3 minuti)' : st ? Math.round(st.perc * 100) + '% delle strade viste · ' + nCaseArea(nome) + ' case' : 'Mappa sul telefono';
      b.innerHTML = `<b>${esc(nome)}</b><span>${tipoArea(nome)} · ${sotto}${nome === cfg.comune ? ' · aperta adesso' : ''}</span>`;
      b.onclick = () => { chiudi('fComuni'); cambiaComune(nome); };
      la.appendChild(b);
    }
    $('bAggiungi').onclick = () => { const nome = $('nuovoComune').value.trim(); if (!nome) return; chiudi('fComuni'); aggiungiComune(nome); };
    $('bQuiC').onclick = () => comuneDaPosizione('logQuiC');
    $('bCercaQ').onclick = () => cercaQuartieri($('cittaQ').value.trim(), $('listaQ'), nome => { chiudi('fComuni'); aggiungiComune(nome); });
    $('bDisegnaC').onclick = () => iniziaDisegno();
    apri('fComuni');
    if (modo === 'quartiere') setTimeout(() => { const i = $('cittaQ'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } }, 350);
  }

  // ---------- pannello dell'agente ----------
  async function apriPannello() {
    chiudi('fMenu'); disegnaPannello(); apri('fPannello');
    if (await statTutte()) { if ($('fPannello').classList.contains('aperto')) disegnaPannello(); }
  }
  function settimanaDati(a, b) {
    const us = uscite.filter(u => u.inizio >= a && u.inizio < b);
    const inCorso = S.sessione && S.sessione.inizio >= a && S.sessione.inizio < b ? S.sessione : null;
    return {
      ore: us.reduce((x, u) => x + u.minuti, 0) / 60 + (inCorso ? Math.max(0, (inCorso.ultimo || inCorso.inizio) - inCorso.inizio) / 36e5 : 0),
      km: us.reduce((x, u) => x + u.metri, 0) / 1000 + (inCorso ? (inCorso.metri || 0) / 1000 : 0),
      kmNuovi: us.reduce((x, u) => x + (u.kmNuovi || 0), 0) + (inCorso && G ? Math.max(0, avanzamento().kmFatti - inCorso.km0) : 0),
      vol: us.reduce((x, u) => x + (u.metriVol || 0), 0) / 1000 + (inCorso ? (inCorso.metriVol || 0) / 1000 : 0),
      uscite: us.length + (inCorso ? 1 : 0),
      case: [...case_.values()].filter(h => h.ts >= a && h.ts < b).length,
      notizie: [...note.values()].filter(n => n.ts >= a && n.ts < b).length
    };
  }
  function tile(valore, etichetta, obiettivo, attuale) {
    const p = obiettivo ? Math.min(1, attuale / obiettivo) : 0;
    return `<div class="tile"><b>${valore}</b><span>${etichetta}</span>${obiettivo ? `<div class="mini-barra${p >= 1 ? ' fatto' : ''}"><div style="width:${Math.round(p * 100)}%"></div></div><small>${p >= 1 ? 'Obiettivo raggiunto' : 'obiettivo ' + obiettivo}</small>` : ''}</div>`;
  }
  function graficoSettimane() {
    const s0 = inizioSettimana(), dati = [];
    for (let i = 7; i >= 0; i--) { const a = settimanaPrima(s0, i), b = settimanaPrima(s0, i - 1); dati.push({ a, km: settimanaDati(a, b).km }); }
    const max = Math.max(1, ...dati.map(d => d.km)), W = 320, H = 128, base = 104, bw = 26, gap = (W - 16 - bw * 8) / 7;
    let barre = '', etich = '';
    dati.forEach((d, i) => {
      const x = 8 + i * (bw + gap), h = d.km > 0 ? Math.max(4, (base - 14) * d.km / max) : 0, ora = i === 7;
      barre += `<g class="barra" data-i="${i}"><rect x="${x - gap / 2}" y="0" width="${bw + gap}" height="${H}" fill="transparent"/>${h ? `<rect x="${x}" y="${base - h}" width="${bw}" height="${h}" rx="4" fill="${ora ? VERDE : '#8cc7a1'}"/>` : `<rect x="${x}" y="${base - 2}" width="${bw}" height="2" rx="1" fill="#d5dcda"/>`}</g>`;
      if (i % 2 === 1 || ora) etich += `<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="12" fill="#4a5a60">${ora ? 'questa' : esc(dataBreve(d.a))}</text>`;
      if (ora && d.km > 0) etich += `<text x="${x + bw / 2}" y="${base - h - 5}" text-anchor="middle" font-size="13" font-weight="700" fill="#17262b">${esc(kmBreve(d.km))}</text>`;
    });
    return { svg: `<svg class="grafico" viewBox="0 0 ${W} ${H}" role="img" aria-label="Chilometri a piedi nelle ultime 8 settimane"><line x1="0" x2="${W}" y1="${base}" y2="${base}" stroke="#d5dcda"/>${barre}${etich}</svg>`, dati };
  }
  function calendarioAttivita() {
    const perGiorno = new Map();
    uscite.forEach(u => { const k = giornoISO(u.inizio); perGiorno.set(k, (perGiorno.get(k) || 0) + u.minuti); });
    if (S.sessione) { const k = giornoISO(S.sessione.inizio); perGiorno.set(k, (perGiorno.get(k) || 0) + Math.round(((S.sessione.ultimo || S.sessione.inizio) - S.sessione.inizio) / 60e3)); }
    const s0 = settimanaPrima(inizioSettimana(), 11), C = 22, oggi = giornoISO(Date.now());
    const colore = m => !m ? '#eef2f1' : m < 30 ? '#cfe8d7' : m < 60 ? '#8cc7a1' : m < 120 ? '#4fa572' : '#1f6b42';
    let celle = '';
    for (let w = 0; w < 12; w++) for (let d = 0; d < 7; d++) {
      const g = new Date(s0); g.setDate(g.getDate() + w * 7 + d); const k = giornoISO(g.getTime()); if (k > oggi) continue;
      const m = perGiorno.get(k) || 0;
      celle += `<rect class="cella-cal" data-g="${k}" data-m="${m}" x="${24 + w * C}" y="${d * C}" width="${C - 4}" height="${C - 4}" rx="4" fill="${colore(m)}"${k === oggi ? ' stroke="#17262b" stroke-width="2"' : ''}/>`;
    }
    const gg = ['L', '', 'M', '', 'V', '', 'D'].map((t, d) => t ? `<text x="0" y="${d * C + 14}" font-size="12" fill="#4a5a60">${t}</text>` : '').join('');
    const legenda = [0, 20, 45, 90, 150].map((m, i) => `<rect x="${170 + i * 20}" y="${7 * C + 6}" width="16" height="16" rx="4" fill="${colore(m)}"/>`).join('');
    return `<svg class="grafico" viewBox="0 0 290 ${7 * C + 28}" role="img" aria-label="Giorni con uscite nelle ultime 12 settimane">${gg}${celle}<text x="164" y="${7 * C + 19}" text-anchor="end" font-size="12" fill="#4a5a60">meno</text>${legenda}<text x="274" y="${7 * C + 19}" font-size="12" fill="#4a5a60">più</text></svg>`;
  }
  function disegnaPannello() {
    const c = $('pannelloAgente'), ob = OB(), pr = cfg.profilo || {};
    const set0 = inizioSettimana(), W = settimanaDati(set0, Date.now() + 864e5);
    const oggiL = cosePerOggi(0), prossimi = cosePerOggi(7).filter(x => x.quando > oggiISO());
    const z = riepilogoZona();
    const iniziali = (pr.nome || 'Z').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const graf = graficoSettimane();
    const casePerStato = STATI.map(s => ({ s, n: [...case_.values()].filter(h => cfg.comuni.includes(h.comune) && h.stato === s.k).length })).filter(o => o.n);
    const agenzie = new Map(); [...case_.values()].forEach(h => { if (h.agenzia && /Cartello/.test(h.stato || '')) agenzie.set(h.agenzia, (agenzie.get(h.agenzia) || 0) + 1); });
    const agTop = [...agenzie.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const nDaVer = [...note.values()].filter(n => n.stato === 'Da verificare').length;
    const ult = uscite.slice(-5).reverse();
    c.innerHTML = `
      <div class="profilo-testa"><div class="avatar">${esc(iniziali)}</div><div><b>${esc(saluto())}${nomeAgente() ? ', ' + esc(nomeAgente()) : ''}</b><span>${esc([pr.agenzia, cfg.zonaNome ? 'Zona ' + cfg.zonaNome : ''].filter(Boolean).join(' · ') || 'Il tuo pannello')}</span></div><button class="tondo piccolo" id="pProfilo" aria-label="Profilo">${ICO.persona}</button></div>

      <div class="sezione"><h3 class="gruppo" style="margin-top:0">Da fare oggi<span>${oggiL.length || 'niente'}</span></h3>
        <div id="pAgenda">${oggiL.length ? oggiL.map(rigaAgenda).join('') : '<p class="aiuto">Niente in scadenza. Buon giro!</p>'}</div>
        ${prossimi.length ? `<details class="piega"><summary>Prossimi 7 giorni (${prossimi.length})</summary><div id="pProssimi">${prossimi.map(rigaAgenda).join('')}</div></details>` : ''}
        <div class="aggiungi-compito"><input class="campo" id="pCompito" placeholder="Aggiungi una cosa da fare…" autocomplete="off"><input class="campo" type="date" id="pCompitoData" aria-label="Per quando"><button class="tasto piccolo" id="pCompitoOk" aria-label="Aggiungi">${ICO.piu}</button></div>
      </div>

      <div class="sezione"><h3 class="gruppo">Questa settimana<span>${W.uscite === 1 ? '1 uscita' : W.uscite + ' uscite'}</span></h3>
        <div class="tiles">
          ${tile(oreTesto(W.ore).replace(' minuti', ' min'), 'a piedi', ob.ore, W.ore)}
          ${tile(String(W.case), W.case === 1 ? 'casa segnata' : 'case segnate', ob.case, W.case)}
          ${tile(String(W.notizie), W.notizie === 1 ? 'notizia raccolta' : 'notizie raccolte', ob.notizie, W.notizie)}
          ${tile(kmBreve(W.kmNuovi), 'di strade nuove', 0, 0)}
        </div>
        ${W.vol > 0.05 ? `<p class="aiuto">Volantini: ${kmBreve(W.vol)} di strade questa settimana.</p>` : ''}
      </div>

      <div class="sezione"><h3 class="gruppo">Chilometri a piedi<span>ultime 8 settimane</span></h3>${graf.svg}<p class="aiuto" id="pGrafSel">Tocca una barra per vedere la settimana.</p></div>

      <div class="sezione"><h3 class="gruppo">Le tue uscite<span>ultime 12 settimane</span></h3>${calendarioAttivita()}<p class="aiuto" id="pCalSel">Ogni quadratino è un giorno: più è scuro, più hai camminato.</p>
        ${ult.length ? ult.map(u => `<div class="uscita"><b>${esc(new Date(u.inizio).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }))}</b><span>${esc(u.area || '')} · ${oreTesto(u.minuti / 60).replace(' minuti', ' min')} · ${kmBreve(u.metri / 1000)}${u.case ? ' · ' + (u.case === 1 ? '1 casa' : u.case + ' case') : ''}${u.metriVol > 50 ? ' · volantini' : ''}</span></div>`).join('') : '<p class="aiuto">Le uscite compaiono qui quando premi "Basta per oggi" alla fine di un giro.</p>'}
      </div>

      <div class="sezione"><h3 class="gruppo">La tua zona${cfg.zonaNome ? ': ' + esc(cfg.zonaNome) : ''}<span>${Math.round(z.perc * 100)}% vista</span></h3>
        ${cfg.comuni.map(n => { const st = statArea(n), p = st ? Math.round(st.perc * 100) : 0; return `<button class="area-riga" data-area="${esc(n)}"><div class="area-nome"><b>${esc(n)}</b><span>${st ? p + '%' : 'da scaricare'}</span></div><div class="avanz" style="margin:4px 0"><div style="width:${p}%"></div></div><span class="area-sotto">${st ? kmBreve(Math.max(0, st.kmTot - st.kmFatti)) + ' da vedere · ' + nCaseArea(n) + ' case' + (st.kmVecchi > 0.3 ? ' · ' + kmBreve(st.kmVecchi) + ' viste più di 6 mesi fa' : '') : tipoArea(n)}</span></button>`; }).join('') || '<p class="aiuto">Nessuna area: aggiungila da "La mia zona".</p>'}
        <div class="riga"><button class="tasto piccolo" id="pVediZona">${ICO.mappa}Vedi sulla mappa</button><button class="tasto piccolo" id="pGestZona">${ICO.piu}Aggiungi area</button></div>
      </div>

      <div class="sezione"><h3 class="gruppo">Le tue case<span>${z.nCase}</span></h3>
        ${casePerStato.length ? `<div class="scelte">${casePerStato.map(o => `<span class="scelta conteggio">${pinSVG(o.s.k)}${esc(o.s.k)} <b>${o.n}</b></span>`).join('')}</div>` : '<p class="aiuto">Ancora nessuna casa segnata.</p>'}
        ${agTop.length ? `<p class="aiuto" style="margin-top:12px"><b>Cartelli delle agenzie in zona:</b> ${agTop.map(([a, n]) => esc(a) + ' ' + n).join(' · ')}</p>` : ''}
      </div>

      <div class="sezione"><h3 class="gruppo">Taccuino<span>${note.size} notizie · ${persone.size} persone</span></h3>
        <p class="aiuto">${nDaVer ? (nDaVer === 1 ? '1 notizia da verificare.' : nDaVer + ' notizie da verificare.') : 'Nessuna notizia da verificare.'}</p>
        <div class="riga"><button class="tasto piccolo" id="pNota">${ICO.piu}Notizia</button><button class="tasto piccolo" id="pTacc">${ICO.nota}Apri il taccuino</button></div>
      </div>
      <p class="versione">Zona · versione ${VERSIONE}</p>`;
    collegaAgenda(c, disegnaPannello);
    $('pProfilo').onclick = apriProfilo;
    $('pCompitoOk').onclick = async () => {
      const t = $('pCompito').value.trim(); if (!t) { $('pCompito').focus(); return; }
      const a = { id: nuovoId(), ts: Date.now(), testo: t, giorno: $('pCompitoData').value || '', fatto: 0 };
      agenda.set(a.id, a); await DB.put('agenda', a); toast('Aggiunto', 'ok'); disegnaPannello(); pannello();
    };
    $('pCompito').onkeydown = e => { if (e.key === 'Enter') $('pCompitoOk').click(); };
    c.querySelectorAll('.barra').forEach(g => g.onclick = () => { const d = graf.dati[+g.dataset.i]; $('pGrafSel').textContent = `Settimana dal ${dataBreve(d.a)}: ${kmBreve(d.km)} a piedi.`; });
    c.querySelectorAll('.cella-cal').forEach(r => r.onclick = () => { const m = +r.dataset.m; $('pCalSel').textContent = `${dataTesto(r.dataset.g)}: ${m ? oreTesto(m / 60) + ' a piedi' : 'nessuna uscita'}.`; });
    c.querySelectorAll('[data-area]').forEach(b => b.onclick = () => { chiudi('fPannello'); const n = b.dataset.area; if (n !== cfg.comune) cambiaComune(n); else { mostraZona(false); } });
    $('pVediZona').onclick = () => { chiudi('fPannello'); mostraZona(true); };
    $('pGestZona').onclick = () => { chiudi('fPannello'); apriComuni(); };
    $('pNota').onclick = () => apriNota();
    $('pTacc').onclick = () => { chiudi('fPannello'); apriTaccuino(); };
  }

  // ---------- taccuino: notizie raccolte in zona e persone che le danno ----------
  const TIPI_INFO = ['Vuole vendere', 'Vuole comprare', 'Vuole affittare', 'Eredità o successione', 'Trasloco o separazione', 'Casa vuota', 'Lavori in corso', 'Nuova costruzione', 'Prezzi e mercato', 'Altro'];
  const FONTI = ['Bar o ristorante', 'Negozio', 'Vicino di casa', 'Amministratore', 'Artigiano', 'Parrocchia o associazione', 'Cliente', 'Collega', 'Altro'];
  const STATI_NOTA = ['Da verificare', 'Verificata', 'Non vera', 'Diventata incarico'];
  let tabTacc = 'note', cercaTacc = '', filtroTacc = '';
  function apriTaccuino(tab) { if (tab) tabTacc = tab; chiudi('fMenu'); disegnaTaccuino(); apri('fTaccuino'); }
  function disegnaTaccuino() {
    const c = $('taccCorpo'), q = cercaTacc.toLowerCase();
    $('taccTabNote').setAttribute('aria-pressed', tabTacc === 'note'); $('taccTabPersone').setAttribute('aria-pressed', tabTacc === 'persone');
    $('taccNuovo').innerHTML = ICO.piu + (tabTacc === 'note' ? 'Nuova notizia' : 'Nuova persona');
    if (tabTacc === 'note') {
      let lista = [...note.values()].sort((a, b) => b.ts - a.ts);
      const conta = k => lista.filter(n => n.stato === k).length;
      const filtri = [{ k: '', t: 'Tutte (' + lista.length + ')' }, ...STATI_NOTA.map(k => ({ k, t: k + ' (' + conta(k) + ')' })).filter(o => conta(o.k))];
      if (filtroTacc && !STATI_NOTA.includes(filtroTacc)) filtroTacc = '';
      if (filtroTacc) lista = lista.filter(n => n.stato === filtroTacc);
      if (q) lista = lista.filter(n => [n.testo, n.chi, n.indirizzo, n.tipoInfo, n.fonte, n.area].join(' ').toLowerCase().includes(q));
      c.innerHTML = `<div class="filtri">${filtri.map(f => `<button class="scelta senza-icona" data-f="${esc(f.k)}" aria-pressed="${filtroTacc === f.k}">${esc(f.t)}</button>`).join('')}</div>` +
        (lista.length ? lista.map(n => `<button class="nota-riga" data-n="${n.id}"><span class="nota-tipo">${esc(n.tipoInfo || 'Notizia')}</span><b>${esc(taglia(n.testo, 140) || '(senza testo)')}</b><span>${esc([n.chi || n.fonte, n.indirizzo || n.area, dataBreve(n.ts)].filter(Boolean).join(' · '))}</span>${n.stato !== 'Da verificare' ? `<span class="nota-stato">${esc(n.stato)}</span>` : n.verifica ? `<span class="nota-stato attesa">verifica entro ${esc(dataBreve(new Date(n.verifica + 'T12:00')))}</span>` : ''}</button>`).join('')
          : `<div class="vuoto">${note.size ? 'Nessuna notizia trovata.' : 'Qui segni quello che senti in zona: al bar, dal parrucchiere, dai vicini. Chi vende, chi eredita, chi si trasferisce.'}</div>`);
      c.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filtroTacc = b.dataset.f; disegnaTaccuino(); });
      c.querySelectorAll('[data-n]').forEach(b => b.onclick = () => apriNota(b.dataset.n));
    } else {
      let lista = [...persone.values()].sort((a, b) => (b.ultimo || b.ts) - (a.ultimo || a.ts));
      if (q) lista = lista.filter(p => [p.nome, p.ruolo, p.luogo, p.note].join(' ').toLowerCase().includes(q));
      const ris = OB().risentire;
      c.innerHTML = lista.length ? lista.map(p => { const u = p.ultimo || p.ts, tardi = ris && Date.now() - u > ris * 864e5, n = [...note.values()].filter(x => x.personaId === p.id).length; return `<button class="nota-riga" data-p="${p.id}"><b>${esc(p.nome)}</b><span>${esc([p.ruolo, p.luogo].filter(Boolean).join(' · '))}</span><span>${n === 1 ? '1 notizia' : n + ' notizie'} · sentita ${esc(giorniFa(u))}</span>${tardi ? '<span class="nota-stato attesa">da risentire</span>' : ''}</button>`; }).join('')
        : `<div class="vuoto">${persone.size ? 'Nessuna persona trovata.' : 'Le persone che ti danno notizie: la barista, il giornalaio, l\'amministratore di condominio. L\'app ti ricorda di passare a trovarle.'}</div>`;
      c.querySelectorAll('[data-p]').forEach(b => b.onclick = () => apriPersona(b.dataset.p));
    }
  }
  $('taccTabNote').onclick = () => { tabTacc = 'note'; disegnaTaccuino(); };
  $('taccTabPersone').onclick = () => { tabTacc = 'persone'; disegnaTaccuino(); };
  $('taccCerca').oninput = () => { cercaTacc = $('taccCerca').value; disegnaTaccuino(); };
  $('taccNuovo').onclick = () => tabTacc === 'note' ? apriNota() : apriPersona();
  $('taccEsporta').onclick = () => esportaNote();

  // editor di una notizia
  let nn = null;
  function apriNota(id) {
    const v = id ? note.get(id) : null;
    const pos = v ? (v.lat != null && v.lat !== '' ? { lat: v.lat, lng: v.lng } : null) : posizione ? { lat: posizione.lat, lng: posizione.lng } : null;
    nn = v ? { ...v } : { id: '', ts: Date.now(), testo: '', tipoInfo: '', fonte: '', chi: '', personaId: '', area: cfg.comune, lat: pos ? +pos.lat.toFixed(6) : '', lng: pos ? +pos.lng.toFixed(6) : '', indirizzo: '', casaId: '', verifica: '', stato: 'Da verificare' };
    if (!v && pos && G) { const s = Planner.indirizzoVicino(G, pos.lat, pos.lng); if (s.via) nn.indirizzo = s.via + (s.paese ? ', ' + s.paese : ''); }
    $('tfNota').textContent = v ? 'Notizia' : 'Nuova notizia';
    const vicine = pos ? [...case_.values()].filter(h => h.lat !== '' && h.lat != null && dist([pos.lat, pos.lng], [h.lat, h.lng]) < 120).sort((a, b) => dist([pos.lat, pos.lng], [a.lat, a.lng]) - dist([pos.lat, pos.lng], [b.lat, b.lng])).slice(0, 4) : [];
    if (nn.casaId && !vicine.some(h => h.id === nn.casaId) && case_.get(nn.casaId)) vicine.unshift(case_.get(nn.casaId));
    const ppl = [...persone.values()].sort((a, b) => (b.ultimo || b.ts) - (a.ultimo || a.ts)).slice(0, 10);
    $('notaCorpo').innerHTML = `
      <div class="sezione" style="margin-top:10px"><h3>Cosa hai saputo?</h3><textarea class="note" id="nTesto" rows="4" placeholder="Per esempio: al bar dicono che i Rossi di via Garibaldi vogliono vendere e trasferirsi dalla figlia.">${esc(nn.testo)}</textarea><p class="aiuto">Puoi dettare con il microfono della tastiera.</p></div>
      <div class="sezione"><h3>Che notizia è?</h3><div class="scelte" id="nTipi">${TIPI_INFO.map(t => `<button class="scelta senza-icona" data-v="${esc(t)}" aria-pressed="${nn.tipoInfo === t}">${esc(t)}</button>`).join('')}</div></div>
      <div class="sezione"><h3>Chi te l'ha detta?</h3>
        ${ppl.length ? `<div class="scelte" id="nPersone">${ppl.map(p => `<button class="scelta senza-icona" data-p="${p.id}" aria-pressed="${nn.personaId === p.id}">${esc(p.nome)}</button>`).join('')}</div><p class="aiuto">Oppure scrivi qui sotto una persona nuova.</p>` : ''}
        <input class="campo" id="nChi" placeholder="Nome o posto, per esempio Giulia del Bar Sport" value="${esc(nn.personaId ? '' : nn.chi)}" autocomplete="off" style="margin-top:8px">
        <div class="scelte" id="nFonti" style="margin-top:10px">${FONTI.map(t => `<button class="scelta senza-icona" data-v="${esc(t)}" aria-pressed="${nn.fonte === t}">${esc(t)}</button>`).join('')}</div>
        <button class="interruttore" id="nRubrica" role="switch" aria-checked="false" ${nn.personaId ? 'hidden' : ''}><span>Aggiungi alle persone della zona<small>Così l'app ti ricorda di ripassare a trovarla</small></span><span class="leva"></span></button>
      </div>
      <div class="sezione"><h3>Dove?</h3><input class="campo" id="nDove" placeholder="Via, piazza o casa di cui si parla" value="${esc(nn.indirizzo)}" autocomplete="off">
        <p class="aiuto">${nn.lat !== '' ? 'Segnata sulla mappa nel punto in cui sei.' : 'Senza posizione GPS: non compare sulla mappa.'}</p>
        ${vicine.length ? `<p class="aiuto" style="margin-top:10px">Riguarda una casa che hai salvato?</p><div class="scelte" id="nCase">${vicine.map(h => `<button class="scelta" data-c="${h.id}" aria-pressed="${nn.casaId === h.id}">${pinSVG(h.stato)}${esc(taglia(h.address || 'Casa', 34))}</button>`).join('')}</div>` : ''}
      </div>
      <div class="sezione"><h3>Da verificare entro</h3><input class="campo" type="date" id="nVerifica" value="${esc(nn.verifica)}"><p class="aiuto">Facoltativo. Quel giorno la trovi in "Da fare oggi".</p></div>
      <div class="sezione"><h3>Com'è andata?</h3><div class="scelte" id="nStati">${STATI_NOTA.map(t => `<button class="scelta senza-icona" data-v="${esc(t)}" aria-pressed="${nn.stato === t}">${esc(t)}</button>`).join('')}</div></div>
      ${v ? `<div class="azioni" style="margin-top:22px">${v.lat !== '' && v.lat != null ? `<a class="tasto" href="${mapsPiedi(v.lat, v.lng)}" target="_blank" rel="noopener">${ICO.posizione}Portami qui</a>` : ''}<button class="tasto pericolo" id="nElimina">${ICO.cestino}Elimina</button></div>` : ''}`;
    const scelta = (idBox, campo, toggle) => $(idBox).querySelectorAll('[data-v]').forEach(b => b.onclick = () => { nn[campo] = toggle && nn[campo] === b.dataset.v ? '' : b.dataset.v; $(idBox).querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', nn[campo] === x.dataset.v)); });
    scelta('nTipi', 'tipoInfo', true); scelta('nFonti', 'fonte', true); scelta('nStati', 'stato', false);
    if ($('nPersone')) $('nPersone').querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
      nn.personaId = nn.personaId === b.dataset.p ? '' : b.dataset.p;
      const p = persone.get(nn.personaId); if (p) { $('nChi').value = ''; if (!nn.fonte && p.fonte) nn.fonte = p.fonte; }
      $('nPersone').querySelectorAll('[data-p]').forEach(x => x.setAttribute('aria-pressed', nn.personaId === x.dataset.p));
      $('nRubrica').hidden = !!nn.personaId;
      $('nFonti').querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', nn.fonte === x.dataset.v));
    });
    $('nChi').oninput = () => { if ($('nChi').value.trim() && nn.personaId) { nn.personaId = ''; if ($('nPersone')) $('nPersone').querySelectorAll('[data-p]').forEach(x => x.setAttribute('aria-pressed', 'false')); $('nRubrica').hidden = false; } };
    $('nRubrica').onclick = () => $('nRubrica').setAttribute('aria-checked', $('nRubrica').getAttribute('aria-checked') !== 'true');
    if ($('nCase')) $('nCase').querySelectorAll('[data-c]').forEach(b => b.onclick = () => { nn.casaId = nn.casaId === b.dataset.c ? '' : b.dataset.c; $('nCase').querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-pressed', nn.casaId === x.dataset.c)); });
    if ($('nElimina')) $('nElimina').onclick = async () => { if (!confirm('Eliminare questa notizia?')) return; await DB.del('note', v.id); note.delete(v.id); chiudi('fNota'); disegnaNote(); dopoTaccuino(); toast('Notizia eliminata'); };
    apri('fNota');
    if (!v) setTimeout(() => $('nTesto').focus(), 350);
  }
  $('salvaNota').onclick = async () => {
    const testo = $('nTesto').value.trim(); if (!testo) { toast('Scrivi cosa hai saputo.', 'errore'); $('nTesto').focus(); return; }
    const n = { ...nn, testo, indirizzo: $('nDove').value.trim(), verifica: $('nVerifica').value, id: nn.id || nuovoId() };
    const chi = $('nChi').value.trim();
    if (n.personaId) { const p = persone.get(n.personaId); if (p) { n.chi = p.nome; p.ultimo = Date.now(); await DB.put('persone', p); } }
    else {
      n.chi = chi;
      if (chi && $('nRubrica').getAttribute('aria-checked') === 'true') {
        const p = { id: nuovoId(), ts: Date.now(), ultimo: Date.now(), nome: chi, ruolo: n.fonte || '', fonte: n.fonte || '', luogo: n.indirizzo || '', telefono: '', note: '', area: cfg.comune };
        persone.set(p.id, p); await DB.put('persone', p); n.personaId = p.id;
      }
    }
    try { await DB.put('note', n); } catch (e) { toast('Memoria del telefono piena.', 'errore'); return; }
    note.set(n.id, n); chiudi('fNota'); disegnaNote(); dopoTaccuino();
    toast(nn.id ? 'Notizia aggiornata' : 'Notizia salvata nel taccuino', 'ok');
    nn = null;
  };
  function dopoTaccuino() { if ($('fTaccuino').classList.contains('aperto')) disegnaTaccuino(); if ($('fPannello').classList.contains('aperto')) disegnaPannello(); if ($('fPersona').classList.contains('aperto') && pp) apriPersona(pp.id); pannello(); }

  // scheda di una persona della zona
  let pp = null;
  function apriPersona(id) {
    const v = id ? persone.get(id) : null;
    pp = v ? { ...v } : { id: '', ts: Date.now(), ultimo: Date.now(), nome: '', ruolo: '', fonte: '', luogo: '', telefono: '', note: '', area: cfg.comune };
    $('tfPersona').textContent = v ? v.nome : 'Nuova persona';
    const sue = v ? [...note.values()].filter(n => n.personaId === v.id).sort((a, b) => b.ts - a.ts) : [];
    $('personaCorpo').innerHTML = `
      ${v ? `<div class="vicina" style="margin-top:12px"><span>Sentita <b>${esc(giorniFa(v.ultimo || v.ts))}</b>${OB().risentire ? ', l\'app te la ricorda dopo ' + OB().risentire + ' giorni' : ''}.</span><button class="tasto ocra" id="psOggi">Sentita oggi</button></div>` : ''}
      ${v && v.telefono ? `<a class="tasto verde" href="tel:${esc(v.telefono.replace(/[^\d+]/g, ''))}">${ICO.telefono}Chiama ${esc(v.telefono)}</a>` : ''}
      <label class="campo" for="psNome">Nome</label><input class="campo" id="psNome" value="${esc(pp.nome)}" placeholder="Per esempio Giulia" autocomplete="off">
      <label class="campo" for="psRuolo">Chi è</label><input class="campo" id="psRuolo" value="${esc(pp.ruolo)}" placeholder="Per esempio barista del Bar Sport" autocomplete="off">
      <label class="campo" for="psLuogo">Dove la trovi</label><input class="campo" id="psLuogo" value="${esc(pp.luogo)}" placeholder="Piazza Garibaldi, la mattina" autocomplete="off">
      <label class="campo" for="psTel">Telefono</label><input class="campo" type="tel" id="psTel" value="${esc(pp.telefono)}" placeholder="Facoltativo" autocomplete="off">
      <label class="campo" for="psNote">Note</label><textarea class="note" id="psNote" placeholder="Cosa sa, chi conosce, quando passare">${esc(pp.note)}</textarea>
      ${v ? `<h3 class="gruppo">Notizie da ${esc(v.nome)}<span>${sue.length}</span></h3>${sue.map(n => `<button class="nota-riga" data-n="${n.id}"><span class="nota-tipo">${esc(n.tipoInfo || 'Notizia')}</span><b>${esc(taglia(n.testo, 120))}</b><span>${esc(dataBreve(n.ts))} · ${esc(n.stato)}</span></button>`).join('') || '<p class="aiuto">Ancora nessuna.</p>'}
        <button class="tasto" id="psNota">${ICO.piu}Nuova notizia da ${esc(v.nome)}</button><button class="link pericolo" id="psElimina">Elimina questa persona</button>` : ''}`;
    if ($('psOggi')) $('psOggi').onclick = async () => { v.ultimo = Date.now(); await DB.put('persone', v); toast('Segnato', 'ok'); apriPersona(v.id); dopoTaccuino(); };
    if ($('psNota')) $('psNota').onclick = () => { apriNota(); nn.personaId = v.id; nn.chi = v.nome; nn.fonte = v.fonte || ''; const b = $('nPersone') && $('nPersone').querySelector(`[data-p="${v.id}"]`); if (b) b.setAttribute('aria-pressed', 'true'); $('nRubrica').hidden = true; $('nFonti').querySelectorAll('[data-v]').forEach(x => x.setAttribute('aria-pressed', nn.fonte === x.dataset.v)); };
    if ($('psElimina')) $('psElimina').onclick = async () => { if (!confirm('Eliminare ' + v.nome + '? Le sue notizie restano.')) return; await DB.del('persone', v.id); persone.delete(v.id); chiudi('fPersona'); pp = null; dopoTaccuino(); };
    $('personaCorpo').querySelectorAll('[data-n]').forEach(b => b.onclick = () => apriNota(b.dataset.n));
    apri('fPersona');
  }
  $('salvaPersona').onclick = async () => {
    const nome = $('psNome').value.trim(); if (!nome) { toast('Scrivi almeno il nome.', 'errore'); return; }
    const p = { ...pp, id: pp.id || nuovoId(), nome, ruolo: $('psRuolo').value.trim(), luogo: $('psLuogo').value.trim(), telefono: $('psTel').value.trim(), note: $('psNote').value.trim() };
    await DB.put('persone', p); persone.set(p.id, p);
    for (const n of note.values()) if (n.personaId === p.id && n.chi !== p.nome) { n.chi = p.nome; DB.put('note', n); }
    chiudi('fPersona'); pp = null; dopoTaccuino(); toast('Persona salvata', 'ok');
  };

  // notizie sulla mappa
  const lNote = L.layerGroup().addTo(map);
  const iconaNota = n => L.divIcon({ className: '', html: `<div class="pin-nota${n.stato === 'Da verificare' ? '' : ' chiusa'}">${ICO.nota}</div>`, iconSize: [30, 30], iconAnchor: [15, 28] });
  function disegnaNote() {
    lNote.clearLayers(); if (cfg.mostraNote === false) return;
    for (const n of note.values()) {
      if (n.lat === '' || n.lat == null) continue;
      if (!vistaZona && n.area !== cfg.comune) continue;
      L.marker([n.lat, n.lng], { icon: iconaNota(n), title: taglia(n.testo, 60), zIndexOffset: 550 }).on('click', () => apriNota(n.id)).addTo(lNote);
    }
  }
  function esportaNote() {
    if (!note.size) { toast('Non ci sono notizie da esportare.', 'errore'); return; }
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
    const righe = [['Data', 'Area', 'Notizia', 'Tipo', 'Chi', 'Fonte', 'Dove', 'Verificare entro', 'Stato', 'Mappa'].map(q).join(';')];
    [...note.values()].sort((a, b) => a.ts - b.ts).forEach(n => righe.push([new Date(n.ts).toLocaleDateString('it-IT'), n.area, n.testo, n.tipoInfo, n.chi, n.fonte, n.indirizzo, n.verifica ? new Date(n.verifica + 'T12:00').toLocaleDateString('it-IT') : '', n.stato, n.lat !== '' && n.lat != null ? 'https://maps.google.com/?q=' + n.lat + ',' + n.lng : ''].map(q).join(';')));
    condividiFile(new Blob(['﻿' + righe.join('\r\n')], { type: 'text/csv' }), 'notizie-zona-' + new Date().toISOString().slice(0, 10) + '.csv');
  }

  // ---------- strati della mappa e legenda ----------
  function apriStrati() {
    const box = $('strati');
    if (box.classList.contains('aperto')) { box.classList.remove('aperto'); $('tStrati').classList.remove('attivo'); return; }
    $('tStrati').classList.add('attivo');
    const voce = (id, t, on) => `<button class="interruttore" id="${id}" role="switch" aria-checked="${on}"><span>${t}</span><span class="leva"></span></button>`;
    box.innerHTML = `<div class="legenda">
        <div><i style="background:${BLU}"></i>Case da vedere</div>
        <div><i style="background:${VERDE_SC}"></i>Percorse negli ultimi 3 mesi</div>
        <div><i style="background:${VERDE_CH}"></i>Viste più di 3 mesi fa</div>
        ${S.fase === 'cammino' ? `<div><i style="background:${OCRA}"></i>Prossimi 300 m, con le frecce</div><div><i class="tratteggio" style="border-color:${GRIGIO}"></i>Già fatto oggi</div>` : ''}
        ${cfg.mostraVolantini ? `<div><i class="tratteggio" style="border-color:${ARANCIO}"></i>Volantini (3 mesi)</div>` : ''}
        ${vistaZona ? `<div><i class="campitura" style="background:rgba(${COL_VISTA},.45)"></i>Parte della zona già vista</div><div><i class="campitura" style="background:rgba(${COL_DAFARE},.45)"></i>Parte della zona da vedere</div><div><i style="background:#17262b;height:5px"></i>Confine della zona</div>` : ''}
      </div>
      ${voce('sNote', 'Notizie sulla mappa', cfg.mostraNote !== false)}${voce('sVol', 'Strade con volantini', !!cfg.mostraVolantini)}${S.fase === 'home' ? voce('sZona', 'Tutta la zona', vistaZona) : ''}`;
    box.classList.add('aperto');
    $('sNote').onclick = () => { cfg.mostraNote = cfg.mostraNote === false; salvaCfg(); disegnaNote(); box.classList.remove('aperto'); apriStrati(); };
    $('sVol').onclick = () => { cfg.mostraVolantini = !cfg.mostraVolantini; salvaCfg(); disegnaRete(); box.classList.remove('aperto'); apriStrati(); };
    if ($('sZona')) $('sZona').onclick = () => { box.classList.remove('aperto'); mostraZona(!vistaZona); };
  }
  $('tStrati').onclick = apriStrati;
  $('tProfilo').onclick = apriProfilo;
  map.on('movestart', () => { $('strati').classList.remove('aperto'); $('tStrati').classList.remove('attivo'); });

  // ---------- profilo dell'agente ----------
  const hashPin = async (id, pin) => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('zona:' + id + ':' + pin)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); };
  const mioProfilo = () => PROFILI.lista.find(p => p.id === PID);
  function salvaProfilo(campi) {
    cfg.profilo = Object.assign({ nome: '', agenzia: '', telefono: '', email: '', obiettivi: {} }, cfg.profilo, campi);
    salvaCfg(); const p = mioProfilo(); if (p) { p.nome = cfg.profilo.nome; salvaProfili(); }
    try { aggiornaAvatar(); } catch (e) { }
  }
  function apriProfilo() {
    chiudi('fMenu');
    const pr = Object.assign({ nome: '', agenzia: '', telefono: '', email: '' }, cfg.profilo), ob = OB(), mio = mioProfilo();
    const iniz = (pr.nome || '').trim() ? pr.nome.trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase() : '?';
    const zR = riepilogoZona(), W = settimanaDati(inizioSettimana(), Date.now() + 864e5);
    $('profiloCorpo').innerHTML = `
      <div class="profilo-testa grande"><div class="avatar">${esc(iniz)}</div><div><b>${esc(pr.nome || 'Il tuo profilo')}</b><span>${esc([pr.agenzia, cfg.zonaNome ? 'Zona ' + cfg.zonaNome : (cfg.comuni.length ? cfg.comuni.length + (cfg.comuni.length === 1 ? ' area' : ' aree') : '')].filter(Boolean).join(' · ') || 'Completa i tuoi dati qui sotto')}</span></div></div>
      <div class="stats" style="margin-top:14px"><div class="stat"><b>${Math.round(zR.perc * 100)}%</b><span>zona vista</span></div><div class="stat"><b>${zR.nCase}</b><span>case</span></div><div class="stat"><b>${W.ore < 1 ? Math.round(W.ore * 60) + ' min' : esc((Math.round(W.ore * 10) / 10).toString().replace('.', ',')) + ' h'}</b><span>a piedi in settimana</span></div></div>
      <div class="sezione"><h3>Indicazioni</h3>
        <button class="voce-menu" id="prTutorial">${ICO.aiuto}<span>Rivedi il tutorial<small>Dove sono le cose, in un minuto</small></span></button>
        <button class="voce-menu" id="prGuida">${ICO.lista}<span>Come si usa<small>Il giro, le case, il taccuino, i colori della mappa</small></span></button>
        <button class="voce-menu" id="prPannello">${ICO.grafico}<span>Il mio pannello<small>Da fare oggi, settimana, obiettivi</small></span></button>
        <button class="voce-menu" id="prImpost">${ICO.ingranaggio}<span>Impostazioni<small>Ripasso delle strade, avvisi, backup, Google</small></span></button>
      </div>
      <div class="sezione"><h3>I tuoi dati</h3><p class="aiuto">Restano sul telefono. Telefono e agenzia vanno in fondo alle schede che condividi.</p></div>
      <label class="campo" for="prNome">Nome e cognome</label><input class="campo" id="prNome" value="${esc(pr.nome)}" autocomplete="name">
      <label class="campo" for="prAg">Agenzia</label><input class="campo" id="prAg" value="${esc(pr.agenzia)}" placeholder="Facoltativo">
      <label class="campo" for="prTel">Telefono</label><input class="campo" type="tel" id="prTel" value="${esc(pr.telefono)}" placeholder="Facoltativo: va in fondo alle schede che condividi">
      <label class="campo" for="prMail">Email</label><input class="campo" type="email" id="prMail" value="${esc(pr.email)}" placeholder="Facoltativo">
      <div class="sezione"><h3>I tuoi obiettivi della settimana</h3><p class="aiuto">Trascina il cursore o tieni premuto + e −. Il pannello ti mostra a che punto sei.</p>
        ${selettore('ore', ob.ore, 'Ore a piedi')}${selettore('case', ob.case)}${selettore('notizie', ob.notizie)}${selettore('risentire', ob.risentire)}
      </div>
      <div class="sezione"><h3>Blocco con PIN</h3><p class="aiuto">${mio && mio.pin ? 'L\'app chiede il PIN ogni volta che la apri.' : 'Facoltativo: chi prende il telefono non vede le tue case e le tue notizie.'}</p>
        <button class="tasto piccolo" id="prPin">${mio && mio.pin ? 'Togli il PIN' : 'Metti un PIN'}</button></div>
      <div class="sezione"><h3>Agenti su questo telefono</h3><p class="aiuto">Ognuno ha la sua zona, le sue case e il suo taccuino.</p>
        ${PROFILI.lista.map(p => `<div class="giro-riga"><span class="num-giro">${esc(((p.nome || '?').trim()[0] || '?').toUpperCase())}</span><div><b>${esc(p.nome || 'Senza nome')}</b><span>${p.id === PID ? 'sei tu, adesso' : p.pin ? 'con PIN' : ''}</span></div>${p.id !== PID ? `<button class="tasto piccolo" style="width:auto;margin:0" data-entra="${p.id}">Entra</button>` : ''}${p.id !== PID && p.id !== 'p0' ? `<button class="togli-giro" data-togli="${p.id}" aria-label="Elimina questo agente">${ICO.cestino}</button>` : ''}</div>`).join('')}
        <button class="tasto" id="prNuovo">${ICO.piu}Aggiungi un agente</button></div>`;
    const testo = (id, campo) => $(id).onchange = () => salvaProfilo({ [campo]: $(id).value.trim() });
    testo('prNome', 'nome'); testo('prAg', 'agenzia'); testo('prTel', 'telefono'); testo('prMail', 'email');
    collegaSelettori($('profiloCorpo'));
    $('prTutorial').onclick = () => { chiudi('fProfilo'); setTimeout(() => avviaTutorial(), 300); };
    $('prGuida').onclick = () => apriAiuto();
    $('prPannello').onclick = () => { chiudi('fProfilo'); apriPannello(); };
    $('prImpost').onclick = () => apriImpost();
    $('prPin').onclick = async () => {
      if (mio.pin) { if (!confirm('Togliere il PIN?')) return; delete mio.pin; salvaProfili(); apriProfilo(); return; }
      const a = prompt('Scegli un PIN di 4-8 cifre'); if (!a) return;
      if (!/^\d{4,8}$/.test(a)) { toast('Il PIN deve avere da 4 a 8 cifre.', 'errore'); return; }
      if (prompt('Riscrivi il PIN per conferma') !== a) { toast('I due PIN non sono uguali.', 'errore'); return; }
      mio.pin = await hashPin(PID, a); salvaProfili(); sessionStorage.setItem('zona_sbloccato', PID); toast('PIN impostato', 'ok'); apriProfilo();
    };
    $('profiloCorpo').querySelectorAll('[data-entra]').forEach(b => b.onclick = () => mostraBlocco(b.dataset.entra));
    $('profiloCorpo').querySelectorAll('[data-togli]').forEach(b => b.onclick = () => togliProfilo(b.dataset.togli));
    $('prNuovo').onclick = () => {
      if (S.fase === 'cammino') { toast('Finisci prima il giro in corso.', 'errore'); return; }
      if (!confirm('Aggiungo un nuovo agente su questo telefono? L\'app si riapre vuota per lui; i tuoi dati restano qui.')) return;
      const id = 'p' + Date.now().toString(36); PROFILI.lista.push({ id, nome: '' }); PROFILI.attivo = id; salvaProfili();
      sessionStorage.setItem('zona_sbloccato', id); location.reload();
    };
    apri('fProfilo');
  }
  async function togliProfilo(id) {
    const p = PROFILI.lista.find(x => x.id === id); if (!p || id === PID || id === 'p0') return;
    if (!confirm('Eliminare ' + (p.nome || 'questo agente') + ' e tutti i suoi dati (case, notizie, strade viste)? Non si può annullare.')) return;
    if (p.pin) { const x = prompt('PIN di ' + (p.nome || 'questo agente')); if (!x || await hashPin(id, x) !== p.pin) { toast('PIN sbagliato.', 'errore'); return; } }
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith(id + '_')) localStorage.removeItem(k); }
    try { indexedDB.deleteDatabase('zona-' + id); } catch (e) { }
    PROFILI.lista = PROFILI.lista.filter(x => x.id !== id); salvaProfili(); toast('Agente eliminato'); apriProfilo();
  }

  // ---------- blocco: scelta dell'agente e PIN ----------
  const vaBloccata = () => { const m = mioProfilo(); return (PROFILI.lista.length > 1 || (m && m.pin)) && sessionStorage.getItem('zona_sbloccato') !== PID; };
  function mostraBlocco(scelto) {
    const box = $('blocco'); box.classList.add('aperto');
    const lista = PROFILI.lista, disegnaScelta = () => {
      box.innerHTML = `<div class="blocco-scheda"><div class="logo-zona">${LOGO}</div><h2>Chi sei?</h2>${lista.map(p => `<button class="tasto${p.id === PID ? ' primario' : ''}" data-chi="${p.id}">${esc(p.nome || 'Agente senza nome')}${p.pin ? ' 🔒' : ''}</button>`).join('')}${scelto ? '<button class="link" id="bloccoAnn">Annulla</button>' : ''}</div>`;
      box.querySelectorAll('[data-chi]').forEach(b => b.onclick = () => chiediPin(b.dataset.chi));
      if ($('bloccoAnn')) $('bloccoAnn').onclick = () => box.classList.remove('aperto');
    };
    const entra = id => { sessionStorage.setItem('zona_sbloccato', id); if (id === PID) { box.classList.remove('aperto'); return; } PROFILI.attivo = id; salvaProfili(); location.reload(); };
    const chiediPin = id => {
      const p = lista.find(x => x.id === id); if (!p) return;
      if (!p.pin) return entra(id);
      box.innerHTML = `<div class="blocco-scheda"><div class="logo-zona">${LOGO}</div><h2>${esc(p.nome || 'Agente')}</h2><p>Scrivi il tuo PIN</p><input class="campo pin" id="pinIn" type="password" inputmode="numeric" autocomplete="off" maxlength="8"><button class="tasto primario" id="pinOk">Entra</button>${lista.length > 1 ? '<button class="link" id="pinAltro">Sono un altro agente</button>' : ''}<p class="aiuto">PIN dimenticato? Serve il backup: reinstallando l'app i dati si perdono.</p></div>`;
      const prova = async () => { if (await hashPin(id, $('pinIn').value) === p.pin) entra(id); else { $('pinIn').value = ''; toast('PIN sbagliato', 'errore'); vibra(200); } };
      $('pinOk').onclick = prova; $('pinIn').onkeydown = e => { if (e.key === 'Enter') prova(); };
      if ($('pinAltro')) $('pinAltro').onclick = disegnaScelta;
      setTimeout(() => $('pinIn').focus(), 100);
    };
    if (scelto) chiediPin(scelto); else if (lista.length === 1) chiediPin(lista[0].id); else disegnaScelta();
  }

  // ---------- benvenuto: profilo, zona, obiettivi ----------
  let passoB = 1;
  function apriBenvenuto(passo = 1) {
    passoB = passo; const c = $('benvCorpo'), pr = Object.assign({ nome: '', agenzia: '', telefono: '' }, cfg.profilo), ob = OB();
    const punti = `<div class="passi">${[1, 2, 3].map(i => `<span class="${i === passo ? 'ora' : i < passo ? 'fatto' : ''}"></span>`).join('')}</div>`;
    if (passo === 1) {
      c.innerHTML = `${punti}<div class="logo-zona grande">${LOGO}</div><h2 class="benv-titolo">Benvenuto in Zona</h2>
        <p class="intro">L'app per lavorare la tua zona a piedi, strada per strada: ti guida nei giri, si ricorda dove sei passato, tiene le case che vedi e le notizie che raccogli in giro.</p>
        <label class="campo" for="bvNome">Come ti chiami?</label><input class="campo" id="bvNome" value="${esc(pr.nome)}" placeholder="Nome e cognome" autocomplete="name">
        <label class="campo" for="bvAg">Agenzia</label><input class="campo" id="bvAg" value="${esc(pr.agenzia)}" placeholder="Facoltativo">
        <label class="campo" for="bvTel">Il tuo telefono</label><input class="campo" type="tel" id="bvTel" value="${esc(pr.telefono)}" placeholder="Facoltativo: va in fondo alle schede che condividi">`;
      $('benvAvanti').textContent = 'Avanti';
      $('benvAvanti').onclick = () => { const n = $('bvNome').value.trim(); if (!n) { toast('Scrivi il tuo nome.', 'errore'); $('bvNome').focus(); return; } salvaProfilo({ nome: n, agenzia: $('bvAg').value.trim(), telefono: $('bvTel').value.trim() }); apriBenvenuto(2); };
    } else if (passo === 2) {
      c.innerHTML = `${punti}<h2 class="benv-titolo">La tua zona</h2>
        <p class="intro">La zona è il territorio che lavori: uno o più comuni, oppure un quartiere se lavori in città. Puoi aggiungere altre aree quando vuoi.</p>
        <label class="campo" for="bvZona">Nome della zona</label><input class="campo" id="bvZona" value="${esc(cfg.zonaNome)}" placeholder="Per esempio Franciacorta">
        <h3 class="gruppo">Le aree della zona<span>${cfg.comuni.length}</span></h3>
        <div id="bvAree">${cfg.comuni.map(n => `<div class="giro-riga"><span class="num-giro">${ICO.ok}</span><div><b>${esc(n)}</b><span>${tipoArea(n)}</span></div><button class="togli-giro" data-tolgo="${esc(n)}" aria-label="Togli ${esc(n)}">${ICO.x}</button></div>`).join('') || '<p class="aiuto">Ancora nessuna: aggiungi la prima qui sotto.</p>'}</div>
        <button class="tasto" id="bvQui">${ICO.posizione}Il posto dove sono adesso</button><div class="log" id="bvLog"></div>
        <label class="campo" for="bvComune">Un comune</label><div class="riga"><input class="campo" id="bvComune" placeholder="Nome ufficiale del comune" autocomplete="off" style="flex:2"><button class="tasto piccolo" id="bvAggiungi" style="margin-top:0">${ICO.piu}</button></div>
        <label class="campo" for="bvCitta">Un quartiere di una città</label><div class="riga"><input class="campo" id="bvCitta" placeholder="La città" autocomplete="off" style="flex:2"><button class="tasto piccolo" id="bvCercaQ" style="margin-top:0">Cerca</button></div><div id="bvQuart"></div>
        <button class="link" id="bvDisegna">Oppure disegnala sulla mappa</button>`;
      const aggiunta = nome => { if (!cfg.comuni.includes(nome)) cfg.comuni.push(nome); if (!cfg.aree[nome]) cfg.aree[nome] = { tipo: 'comune' }; salvaCfg(); apriBenvenuto(2); };
      $('bvZona').onchange = () => { cfg.zonaNome = $('bvZona').value.trim(); salvaCfg(); };
      c.querySelectorAll('[data-tolgo]').forEach(b => b.onclick = () => { const n = b.dataset.tolgo; if (n === cfg.comune && G) { toast('È l\'area aperta adesso: la togli dalle impostazioni.', 'errore'); return; } cfg.comuni = cfg.comuni.filter(x => x !== n); salvaCfg(); apriBenvenuto(2); });
      $('bvQui').onclick = () => comuneDaPosizione('bvLog', aggiunta);
      $('bvAggiungi').onclick = () => { const n = $('bvComune').value.replace(/\s+/g, ' ').trim(); if (n) aggiunta(n); };
      $('bvCercaQ').onclick = () => cercaQuartieri($('bvCitta').value.trim(), $('bvQuart'), aggiunta);
      $('bvDisegna').onclick = () => { cfg.zonaNome = $('bvZona').value.trim(); salvaCfg(); iniziaDisegno(nome => { if (nome) { if (!cfg.comuni.includes(nome)) cfg.comuni.push(nome); salvaCfg(); } apri('fBenvenuto'); apriBenvenuto(2); }); };
      $('benvAvanti').textContent = 'Avanti';
      $('benvAvanti').onclick = () => { cfg.zonaNome = $('bvZona').value.trim(); salvaCfg(); if (!cfg.comuni.length && !confirm('Non hai ancora aggiunto nessuna area. Vai avanti lo stesso?')) return; apriBenvenuto(3); };
    } else {
      c.innerHTML = `${punti}<h2 class="benv-titolo">I tuoi obiettivi</h2><p class="intro">Ogni settimana il pannello ti mostra a che punto sei. Trascina il cursore o usa + e −; puoi cambiarli quando vuoi nel profilo.</p>
        <div class="sezione">${selettore('ore', ob.ore, 'Ore a piedi alla settimana')}${selettore('case', ob.case)}${selettore('notizie', ob.notizie)}${selettore('risentire', ob.risentire)}</div>`;
      collegaSelettori(c);
      $('benvAvanti').textContent = 'Inizia';
      $('benvAvanti').onclick = () => {
        salvaProfilo({ benvenuto: Date.now(), obiettivi: OB() });
        chiudi('fBenvenuto'); toast('Ciao ' + nomeAgente() + ', la tua zona è pronta.', 'ok', 4000);
        LS.set('aiutoVisto11', true); LS.set('aiutoVisto', true);
        if (!LS.get('tutorial12', false)) setTimeout(avviaTutorial, 900);
        if (!cfg.comune && cfg.comuni.length) cambiaComune(cfg.comuni[0]); else aggiorna(true);
      };
    }
    $('benvIndietro').hidden = passo === 1;
    $('benvIndietro').onclick = () => apriBenvenuto(passo - 1);
    $('benvCorpo').scrollTop = 0;
    apri('fBenvenuto');
  }

  // ---------- tutorial all'apertura: evidenzia le parti vere dell'app, un passo alla volta ----------
  const PASSI_TUT = [
    { t: 'Zona in un minuto', d: 'Ti mostro dove sono le cose. Puoi rivedere questo tutorial quando vuoi dal tuo profilo.' },
    { sel: '#pannello', apri: true, t: 'Il pannello in basso', d: 'Qui scegli quanto tempo hai: l\'app prepara un giro a piedi sulle strade con case che non hai ancora visto. Trascinalo in giù per vedere più mappa, in su per riaprirlo.' },
    { t: 'I colori della mappa', d: `<span class="tut-leg"><i style="background:${BLU}"></i>case da vedere</span><span class="tut-leg"><i style="background:${VERDE_SC}"></i>percorse negli ultimi 3 mesi</span><span class="tut-leg"><i style="background:${VERDE_CH}"></i>viste più di 3 mesi fa</span>Durante il giro segui la linea gialla con le frecce.` },
    { sel: '#tondi', t: 'La barra degli strumenti', d: `<span class="tut-ico">${ICO.casa}Le tue case</span><span class="tut-ico">${svg('<path d="M20.5 3.5 3.8 10.4a.5.5 0 0 0 .05.94l6.65 1.96 1.96 6.65a.5.5 0 0 0 .94.05z"/>', 'stroke-width="1.8"')}Torna dove sei</span><span class="tut-ico">${ICO.strati}Legenda e strati, anche "Tutta la zona"</span><span class="tut-ico">${svg('<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="3.25"/>', 'stroke-width="1.8"')}Menu: pannello, taccuino, esporta</span>` },
    { sel: '#tProfilo', t: 'Il tuo profilo', d: 'In alto a destra: i tuoi dati, gli obiettivi della settimana, il PIN, gli altri agenti e queste indicazioni.' },
    { sel: '#bZona', apri: true, t: 'Tutta la zona', d: `Mostra tutte le tue aree insieme: il confine scuro è quello della zona; dentro, <b style="color:#1f6b42">verde</b> la parte già vista e <b style="color:#8a5d00">ocra</b> quella da vedere.` },
    { t: 'Durante il giro', d: '"Nuova casa" salva indirizzo, foto, nota vocale e stato. Nella scheda della casa "In vendita?" cerca l\'indirizzo su Immobiliare.it, Idealista e Casa.it, e lì segni agenzia e prezzo. Alla fine premi "Basta per oggi".' }
  ];
  let tut = null;
  function avviaTutorial() {
    if (S.fase === 'cammino') { toast('Il tutorial si apre quando finisci il giro.'); return; }
    document.querySelectorAll('.foglio.aperto').forEach(f => { if (f.id !== 'fBenvenuto') f.classList.remove('aperto'); });
    $('strati').classList.remove('aperto');
    let el = $('tutorial'); if (!el) { el = document.createElement('div'); el.id = 'tutorial'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Tutorial'); document.body.appendChild(el); }
    tut = { i: 0, el }; LS.set('tutorial12', true); passoTutorial();
  }
  function passoTutorial() {
    if (!tut) return;
    const passi = PASSI_TUT.filter(p => !p.sel || document.querySelector(p.sel));
    const i = Math.min(tut.i, passi.length - 1), p = passi[i], el = tut.el, ultimo = i === passi.length - 1;
    if (p.apri && panChiuso) chiudiPannello(false);
    el.innerHTML = `<div class="tut-buco"></div><div class="tut-scheda"><div class="tut-passi">${passi.map((_, k) => `<span class="${k === i ? 'ora' : k < i ? 'fatto' : ''}"></span>`).join('')}</div><h2>${esc(p.t)}</h2><div class="tut-testo">${p.d}</div>
      <div class="tut-tasti">${ultimo ? '' : '<button class="link" id="tutSalta">Salta</button>'}${i ? '<button class="tasto" id="tutIndietro">Indietro</button>' : ''}<button class="tasto primario" id="tutAvanti">${ultimo ? 'Inizia' : 'Avanti'}</button></div></div>`;
    el.classList.add('aperto');
    const posiziona = () => {
      const buco = el.querySelector('.tut-buco'), scheda = el.querySelector('.tut-scheda'); if (!buco) return;
      const t = p.sel && document.querySelector(p.sel), H = window.innerHeight;
      if (!t) { buco.style.cssText = 'left:50%;top:42%;width:0;height:0'; scheda.style.cssText = 'top:50%;transform:translateY(-50%)'; return; }
      const r = t.getBoundingClientRect(), m = 8, top = Math.max(4, r.top - m), bottom = Math.min(H - 4, r.bottom + m);
      buco.style.cssText = `left:${Math.max(4, r.left - m)}px;top:${top}px;width:${Math.min(window.innerWidth - 8, r.width + 2 * m)}px;height:${bottom - top}px`;
      if (top > H - bottom) scheda.style.cssText = `bottom:${Math.round(H - top + 12)}px`;
      else scheda.style.cssText = `top:${Math.round(bottom + 12)}px`;
    };
    posiziona(); setTimeout(posiziona, 320); tut.posiziona = posiziona;
    const fine = () => { el.classList.remove('aperto'); el.innerHTML = ''; tut = null; };
    $('tutAvanti').onclick = () => { if (ultimo) return fine(); tut.i = i + 1; passoTutorial(); };
    if ($('tutIndietro')) $('tutIndietro').onclick = () => { tut.i = i - 1; passoTutorial(); };
    if ($('tutSalta')) $('tutSalta').onclick = fine;
    $('tutAvanti').focus();
  }
  window.addEventListener('resize', () => { if (tut && tut.posiziona) tut.posiziona(); });

  // ---------- avvio ----------
  window.addEventListener('resize', posizionaTondi);
  try { new ResizeObserver(() => posizionaTondi()).observe($('pannello')); } catch (e) { }
  if (vaBloccata()) mostraBlocco();
  (async () => {
    await migraCoda();
    await caricaTaccuino();
    aggiorna(true);
    aggiornaAvatar();
    if (!cfg.profilo || !cfg.profilo.benvenuto) apriBenvenuto(1);
    else if (!LS.get('tutorial12', false)) { const via = () => { if ($('blocco').classList.contains('aperto')) return setTimeout(via, 800); avviaTutorial(); }; setTimeout(via, 1200); }
    if (cfg.comune) await preparaComune(true); else caricaCase();
    svuotaCoda(); inviaTraccia();
  })();
  if ('serviceWorker' in navigator && !/[?&]test=1/.test(location.search)) navigator.serviceWorker.register('sw.js').catch(() => { });
  // solo per le prove automatiche
  if (/[?&]test=1/.test(location.search)) window.__am = { get S() { return S; }, get fuori() { return fuori; }, get G() { return G; }, get visti() { return visti; }, get passi() { return passi; }, get volant() { return volant; }, get cfg() { return cfg; }, get note() { return note; }, get persone() { return persone; }, get uscite() { return uscite; }, get vistaZona() { return vistaZona; }, get map() { return map; }, ricalcola, controllaTempo, avanzamento, controllaRichiami, cosePerOggi, bastaPerOggi, mostraZona };
})();
