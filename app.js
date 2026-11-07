/* Agente Moni — guida passo passo per i giri a piedi e schede delle case */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const LS = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  const cfg = Object.assign({ url: '', key: '', comune: 'Cazzago San Martino', giorni: 5 }, LS.get('cfg', {}));
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
    calendario: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    foglio: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
    ingranaggio: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
    voce: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
    salta: svg('<path d="M5 5l8 7-8 7zM15 5v14"/>'),
    festa: '<svg class="grande" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#2e7d4f"/><path d="M14 25l7 7 14-15" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  // frecce delle indicazioni (bianche, grandi)
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
  const TIPI = ['Villa', 'Villetta a schiera', 'Appartamento', 'Rustico o cascina', 'Terreno', 'Altro'];

  // ---------- utilità ----------
  const dist = (a, b) => { const R = 6371000, t = Math.PI / 180, dl = (b[0] - a[0]) * t, dn = (b[1] - a[1]) * t; const x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const bearing = (a, b) => { const t = Math.PI / 180, y = Math.sin((b[1] - a[1]) * t) * Math.cos(b[0] * t), x = Math.cos(a[0] * t) * Math.sin(b[0] * t) - Math.sin(a[0] * t) * Math.cos(b[0] * t) * Math.cos((b[1] - a[1]) * t); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; };
  const angolo = (b2, b1) => ((b2 - b1 + 540) % 360) - 180;
  const kmTesto = m => (m / 1000).toFixed(1).replace('.', ',') + ' km';
  const metriTesto = m => m < 25 ? 'Adesso' : m < 100 ? 'Tra ' + Math.round(m / 10) * 10 + ' m' : m < 1000 ? 'Tra ' + Math.round(m / 50) * 50 + ' m' : 'Tra ' + kmTesto(m);
  function oreTesto(h) {
    if (h < 0.1) return 'pochi minuti';
    const m = Math.max(15, Math.round(h * 60 / 15) * 15), H = Math.floor(m / 60), M = m % 60;
    if (!H) return M + ' minuti';
    const ore = H === 1 ? '1 ora' : H + ' ore';
    return M === 0 ? ore : M === 30 ? ore + ' e mezza' : ore + ' e ' + M + ' minuti';
  }
  function toast(msg, tipo = '', ms = 3200) { const t = $('toast'); t.textContent = msg; t.className = tipo; t.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(() => t.style.display = 'none', ms); }
  function parla(testo) { if (!S.voce || !('speechSynthesis' in window)) return; try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(testo); u.lang = 'it-IT'; speechSynthesis.speak(u); } catch (e) { } }

  async function api(action, payload = {}) {
    if (!cfg.url || !cfg.key) throw new Error('Mancano le impostazioni');
    const r = await fetch(cfg.url, { method: 'POST', body: JSON.stringify({ key: cfg.key, action, ...payload }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error);
    return j.data;
  }

  // ---------- coda delle case da inviare (IndexedDB: resiste a chiusure e rete assente) ----------
  const DB = (() => {
    let p;
    const open = () => p || (p = new Promise((ok, ko) => { const r = indexedDB.open('agente-moni', 1); r.onupgradeneeded = () => r.result.createObjectStore('coda', { keyPath: 'id' }); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }));
    const run = async (mode, fn) => { const db = await open(); return new Promise((ok, ko) => { const t = db.transaction('coda', mode), req = fn(t.objectStore('coda')); t.oncomplete = () => ok(req && req.result); t.onerror = () => ko(t.error); }); };
    return { put: h => run('readwrite', s => s.put(h)), del: id => run('readwrite', s => s.delete(id)), all: () => run('readonly', s => s.getAll()) };
  })();

  // ---------- stato ----------
  let plan = LS.get('plan_' + cfg.comune, null);
  let S = caricaStato();
  function caricaStato() { return Object.assign({ giorno: 0, fase: 'inizio', giro: 0, prog: {}, fatti: {}, voce: false }, LS.get('stato_' + cfg.comune, {})); }
  const salvaStato = () => LS.set('stato_' + cfg.comune, S);
  const pianoOk = () => plan && plan.v === 2 && plan.plan && plan.plan.length;
  const oggi = () => pianoOk() ? plan.plan[Math.min(S.giorno, plan.plan.length - 1)] : null;
  const giroAttivo = () => { const g = oggi(); return g ? g.loops[Math.min(S.giro, g.loops.length - 1)] : null; };
  const chiave = (g, l) => g + '-' + l;
  const progDi = (g, l) => S.prog[chiave(g, l)] || 0;
  const giroFatto = (g, l, loop) => progDi(g, l) >= loop.coords.length - 3;

  // dati derivati per ogni giro: distanze cumulate, tempi, passi
  const cache = new WeakMap();
  function info(loop) {
    if (cache.has(loop)) return cache.get(loop);
    const c = loop.coords, cc = [0], tt = [0];
    for (let i = 1; i < c.length; i++) { const d = dist(c[i - 1], c[i]); cc.push(cc[i - 1] + d); tt.push(tt[i - 1] + d / ((loop.lk && loop.lk[i - 1] === '1') ? 3000 : 4500)); }
    const n = loop.n || [], steps = [];
    let cur = { i0: 0, nome: n[0], svolta: 0 };
    for (let i = 1; i < c.length - 1; i++) {
      const d = angolo(bearing(c[i], c[i + 1]), bearing(c[i - 1], c[i]));
      if (n[i] !== cur.nome || Math.abs(d) > 150) { cur.i1 = i; steps.push(cur); cur = { i0: i, nome: n[i], svolta: d }; }
    }
    cur.i1 = c.length - 1; steps.push(cur);
    // attraversamenti cortissimi di un'altra via: li ignoro
    for (let k = steps.length - 2; k > 0; k--) {
      const s = steps[k], a = steps[k - 1], b = steps[k + 1];
      if (cc[s.i1] - cc[s.i0] < 15 && Math.abs(s.svolta) <= 150 && Math.abs(b.svolta) <= 150 && a.nome === b.nome) { a.i1 = b.i1; steps.splice(k, 2); }
    }
    const v = { cc, tt, steps };
    cache.set(loop, v);
    return v;
  }
  const nomeVia = (loop, idx) => (loop.names && loop.names[idx]) || 'strada senza nome';
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

  // ---------- mappa ----------
  const map = L.map('map', { zoomControl: false }).setView([45.583, 10.03], 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  map.createPane('fatto').style.zIndex = 410; map.createPane('dafare').style.zIndex = 420; map.createPane('prossimo').style.zIndex = 430;
  const lFatto = L.layerGroup().addTo(map), lGiorno = L.layerGroup().addTo(map), lAttivo = L.layerGroup().addTo(map), lCase = L.layerGroup().addTo(map), lIo = L.layerGroup().addTo(map);
  let segui = true;
  map.on('dragstart', () => { segui = false; });
  map.on('popupopen', () => { $('tondi').style.visibility = 'hidden'; });
  map.on('popupclose', () => { $('tondi').style.visibility = ''; });
  const VERDE = '#2e7d4f', BLU = '#1d5fd1', OCRA = '#f2a900';
  const pEtichetta = (testo, altro) => L.divIcon({ className: '', html: `<div class="etichetta-p${altro ? ' altro' : ''}">${testo}</div>`, iconSize: altro ? [34, 34] : [40, 40], iconAnchor: altro ? [17, 17] : [20, 20] });

  function disegna(centra) {
    lFatto.clearLayers(); lGiorno.clearLayers(); lAttivo.clearLayers();
    if (!pianoOk()) return;
    // tutto ciò che è già stato fatto, in tutti i giorni: verde
    plan.plan.forEach((g, gi) => g.loops.forEach((loop, li) => {
      const p = progDi(gi, li); if (p < 1) return;
      L.polyline(loop.coords.slice(0, p + 1), { pane: 'fatto', color: '#fff', weight: 11, opacity: .9 }).addTo(lFatto);
      L.polyline(loop.coords.slice(0, p + 1), { pane: 'fatto', color: VERDE, weight: 7, opacity: .95 }).addTo(lFatto);
    }));
    const g = oggi(), gi = S.giorno;
    // gli altri giri di oggi: grigio tratteggiato
    g.loops.forEach((loop, li) => {
      if (li === S.giro && S.fase !== 'inizio') return;
      const p = progDi(gi, li);
      if (p < loop.coords.length - 3) L.polyline(loop.coords.slice(p), { pane: 'dafare', color: '#4a5a60', weight: 4, opacity: .55, dashArray: '2 9', lineCap: 'round' }).addTo(lGiorno);
      L.marker([loop.start.lat, loop.start.lon], { icon: pEtichetta('P' + (g.loops.length > 1 ? li + 1 : ''), true), keyboard: false }).addTo(lGiorno);
    });
    (g.carStops || []).forEach(s => L.marker([s.lat, s.lon], { icon: L.divIcon({ className: '', html: `<div class="etichetta-p altro" style="width:36px;height:36px">${ICO.auto.replace('<svg', '<svg width="22" height="22"')}</div>`, iconSize: [36, 36], iconAnchor: [18, 18] }) })
      .bindPopup('<div class="pop"><b>Case isolate</b>Guardale passando in macchina.<br><a target="_blank" href="https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lon + '">Portami qui</a></div>').addTo(lGiorno));
    let bounds = L.latLngBounds(g.loops.flatMap(l => [[l.start.lat, l.start.lon]]));
    if (S.fase === 'parcheggio' || S.fase === 'cammino') {
      const loop = giroAttivo(), c = loop.coords, p = progDi(gi, S.giro), I = info(loop);
      // da fare: blu pieno dove si guardano le case, blu tratteggiato dove si passa e basta
      L.polyline(c.slice(p), { pane: 'dafare', color: '#fff', weight: 11, opacity: .9 }).addTo(lAttivo);
      let i = p;
      while (i < c.length - 1) {
        const tipo = loop.lk ? loop.lk[i] : '1'; let j = i;
        while (j < c.length - 1 && (loop.lk ? loop.lk[j] : '1') === tipo) j++;
        L.polyline(c.slice(i, j + 1), tipo === '1' ? { pane: 'dafare', color: BLU, weight: 7, opacity: .9 } : { pane: 'dafare', color: BLU, weight: 5, opacity: .7, dashArray: '1 10', lineCap: 'round' }).addTo(lAttivo);
        i = j;
      }
      if (S.fase === 'cammino') {
        // i prossimi 300 m: ocra, con frecce
        let j = p; while (j < c.length - 1 && I.cc[j] - I.cc[p] < 300) j++;
        L.polyline(c.slice(p, j + 1), { pane: 'prossimo', color: OCRA, weight: 9, opacity: 1 }).addTo(lAttivo);
        let ultimo = -1e9;
        for (let k = p + 1; k < c.length && I.cc[k] - I.cc[p] < 1200; k++) {
          if (I.cc[k] - ultimo < 90) continue; ultimo = I.cc[k];
          const ang = bearing(c[k - 1], c[k]);
          L.marker(c[k], { interactive: false, keyboard: false, pane: 'prossimo', icon: L.divIcon({ className: '', html: `<svg class="freccia" viewBox="0 0 18 18" style="transform:rotate(${ang}deg)"><path d="M4 12l5-6 5 6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`, iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(lAttivo);
        }
      }
      L.marker([loop.start.lat, loop.start.lon], { icon: pEtichetta('P'), zIndexOffset: 500 }).addTo(lAttivo);
      bounds = S.fase === 'parcheggio' ? L.latLngBounds(c) : L.latLngBounds(c.slice(p, Math.min(c.length, p + 40)));
    } else if (S.fase === 'inizio') {
      bounds = L.latLngBounds(g.loops.flatMap(l => l.coords));
      g.loops.forEach(l => L.polyline(l.coords, { pane: 'dafare', color: BLU, weight: 4, opacity: .5 }).addTo(lGiorno));
    }
    if (centra && bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], paddingTopLeft: [20, 150], paddingBottomRight: [20, 260], maxZoom: 18 });
  }

  // ---------- indicazione in alto ----------
  let fuori = 0, giaDetto = {};
  function guida() {
    const box = $('guida');
    if (!pianoOk() || S.fase === 'inizio' || S.fase === 'fine') { box.className = ''; box.innerHTML = ''; return; }
    const loop = giroAttivo();
    if (S.fase === 'parcheggio') {
      const ind = indirizzoP(loop);
      box.className = 'visibile';
      box.innerHTML = `<div class="guida-card parcheggio"><div class="guida-icona">${FRECCIA.arrivo}</div><div class="guida-testi"><div class="guida-azione">Parcheggia ${ind ? 'in ' + esc(ind.via) : 'al punto P'}</div><div class="guida-sotto">${ind && ind.paese ? esc(ind.paese) + '. ' : ''}${loop.start.name === 'Lascia la macchina qui' ? 'Lascia la macchina dove trovi posto.' : 'C\'è un parcheggio.'}</div></div></div>`;
      return;
    }
    if (S.fase === 'macchina') {
      box.className = 'visibile';
      box.innerHTML = `<div class="guida-card fatto"><div class="guida-icona">${ICO.auto.replace('<svg', '<svg style="color:#fff"')}</div><div class="guida-testi"><div class="guida-azione">Giri a piedi finiti</div><div class="guida-sotto">Restano le case isolate da vedere in macchina.</div></div></div>`;
      return;
    }
    const c = loop.coords, p = progDi(S.giorno, S.giro), I = info(loop);
    if (fuori >= 3) {
      let d = Infinity; for (let i = p; i < Math.min(c.length, p + 40); i++) d = Math.min(d, posizione ? dist([posizione.lat, posizione.lng], c[i]) : Infinity);
      box.className = 'visibile';
      box.innerHTML = `<div class="guida-card fuori"><div class="guida-icona">${FRECCIA.fuori}</div><div class="guida-testi"><div class="guida-azione">Sei fuori dal percorso</div><div class="guida-sotto">Torna sulla linea gialla${isFinite(d) ? ', è a ' + Math.round(d / 10) * 10 + ' m' : ''}.</div></div></div>`;
      return;
    }
    const k = Math.max(0, I.steps.findIndex(s => p >= s.i0 && p < s.i1));
    const s = I.steps[k], dopo = I.steps[k + 1], d = I.cc[s.i1] - I.cc[p];
    const qui = nomeVia(loop, loop.n ? loop.n[Math.min(p, loop.n.length - 1)] : -1);
    let icona, azione;
    if (!dopo) { icona = FRECCIA.arrivo; azione = 'sei di nuovo alla macchina'; }
    else { const nome = nomeVia(loop, dopo.nome); icona = FRECCIA[tipoSvolta(dopo.svolta)]; azione = testoSvolta(dopo.svolta, nome, dopo.nome === s.nome); }
    const guarda = !loop.lk || loop.lk[Math.min(p, loop.lk.length - 1)] === '1';
    box.className = 'visibile';
    box.innerHTML = `<div class="guida-card"><div class="guida-icona">${icona}</div><div class="guida-testi"><div class="guida-dist">${metriTesto(d)}</div><div class="guida-azione">${esc(azione)}</div><div class="guida-sotto">${guarda ? '<span class="badge guarda">Guarda le case</span>' : '<span class="badge passa">Solo passaggio</span>'}<span>${esc(qui === 'strada senza nome' ? 'Strada senza nome' : qui)}</span></div></div></div>`;
    // voce e vibrazione vicino alla svolta
    const id = S.giorno + '-' + S.giro + '-' + k;
    if (dopo && d < 60 && d >= 20 && !giaDetto[id + 'a']) { giaDetto[id + 'a'] = 1; parla(metriTesto(d) + ', ' + azione); }
    if (dopo && d < 20 && !giaDetto[id + 'b']) { giaDetto[id + 'b'] = 1; parla('Adesso ' + azione); try { navigator.vibrate && navigator.vibrate([120, 80, 120]); } catch (e) { } }
  }

  // ---------- indirizzi dei parcheggi ----------
  const indirizzi = LS.get('indirizzi', {});
  function accorcia(addr) {
    const parti = addr.split(',').map(s => s.trim());
    const iCap = parti.findIndex(s => /^\d{5}\b/.test(s));
    const via = (iCap > 0 ? parti.slice(0, iCap) : parti.slice(0, 2)).join(' ');
    const paese = iCap >= 0 ? parti[iCap].replace(/^\d{5}\s*/, '').replace(/\s+[A-Z]{2}$/, '') : '';
    return { via, paese };
  }
  function indirizzoP(loop) {
    const k = loop.start.lat + ',' + loop.start.lon;
    if (indirizzi[k]) return indirizzi[k];
    if (!indirizzoP.inCorso) {
      indirizzoP.inCorso = true;
      api('geocode', { lat: loop.start.lat, lng: loop.start.lon }).then(r => { if (r.address) { indirizzi[k] = accorcia(r.address); LS.set('indirizzi', indirizzi); guida(); pannello(); } }).catch(() => { }).finally(() => { indirizzoP.inCorso = false; });
    }
    return null;
  }

  // ---------- pannello in basso ----------
  function puntini() {
    return '<div class="giorni" aria-label="Giorni">' + plan.plan.map((g, i) => `<span class="${S.fatti[i] ? 'fatto' : ''}${i === S.giorno ? ' oggi' : ''}" aria-label="Giorno ${i + 1}${S.fatti[i] ? ' fatto' : ''}">${S.fatti[i] ? '✓' : i + 1}</span>`).join('') + '</div>';
  }
  const nomeBreve = g => g.name.split(',')[0];
  function pannello() {
    const box = $('pannelloCorpo');
    if (!cfg.url || !cfg.key) {
      box.innerHTML = `<h1>Benvenuta in Agente Moni</h1><p>Prima di iniziare servono le impostazioni. Le prepara Niccolò una volta sola.</p><button class="tasto primario" id="bImpost">${ICO.ingranaggio}Apri le impostazioni</button>`;
      $('bImpost').onclick = () => apri('fImpost');
      return;
    }
    if (!pianoOk()) {
      box.innerHTML = `<h1>Prepariamo i percorsi</h1><p>Calcolo i giri a piedi di ${esc(cfg.comune)}. Serve una volta sola, ci vogliono 1-3 minuti.</p><button class="tasto primario" id="bCalcola">${ICO.mappa}Calcola i percorsi</button><div id="regPannello" class="aiuto"></div>`;
      $('bCalcola').onclick = () => calcolaPercorsi($('regPannello'), $('bCalcola'));
      return;
    }
    const g = oggi(), n = S.giorno + 1, loops = g.loops;
    if (S.fase === 'inizio') {
      const tutti = plan.plan.every((_, i) => S.fatti[i]);
      if (tutti) { box.innerHTML = `${puntini()}<h1>Hai girato tutto ${esc(cfg.comune)}</h1><p>Tutti i ${plan.plan.length} giorni sono fatti. Puoi rivedere le case salvate o passare a un altro comune dal menu.</p><button class="tasto primario" id="bCase">${ICO.casa}Le mie case</button>`; $('bCase').onclick = apriCase; return; }
      const giri = loops.length > 1 ? ` Sono ${loops.length} giri: tra un giro e l'altro sposti la macchina.` : '';
      const auto = g.carStops && g.carStops.length ? ` Alla fine passi in macchina da ${g.carStops.length === 1 ? 'una casa isolata' : g.carStops.length + ' gruppi di case isolate'}.` : '';
      const ripresa = loops.some((l, li) => progDi(S.giorno, li) > 0);
      box.innerHTML = `${puntini()}<h1>Giorno ${n}: ${esc(nomeBreve(g))}</h1><p>${kmTesto(g.km * 1000)} a piedi, circa ${oreTesto(g.ore)}.${giri}${auto}</p><button class="tasto primario" id="bInizia">${ripresa ? 'Riprendi il giorno ' + n : 'Inizia il giorno ' + n}</button><button class="link" id="bAltro">Scegli un altro giorno</button>`;
      $('bInizia').onclick = () => { const primo = loops.findIndex((l, li) => !giroFatto(S.giorno, li, l)); S.giro = primo < 0 ? 0 : primo; S.fase = 'parcheggio'; salvaStato(); aggiorna(true); };
      $('bAltro').onclick = apriGiorni;
      return;
    }
    if (S.fase === 'parcheggio') {
      const loop = giroAttivo(), vicino = posizione && dist([posizione.lat, posizione.lng], [loop.start.lat, loop.start.lon]) < 80;
      const maps = `https://www.google.com/maps/dir/?api=1&destination=${loop.start.lat},${loop.start.lon}&travelmode=driving`;
      box.innerHTML = `<h1>${vicino ? 'Sei arrivata' : 'Vai a parcheggiare'}</h1><p>Giro ${S.giro + 1} di ${loops.length}: ${kmTesto(loop.km * 1000)} a piedi, circa ${oreTesto(loop.ore)}.</p>
        ${vicino ? '' : `<a class="tasto ocra" href="${maps}" target="_blank" rel="noopener">${ICO.auto}Portami lì con Google Maps</a>`}
        <button class="tasto ${vicino ? 'verde' : 'primario'}" id="bCammina">${vicino ? 'Inizia a camminare' : 'Sono arrivata, inizio'}</button>`;
      $('bCammina').onclick = () => { S.fase = 'cammino'; fuori = 0; salvaStato(); segui = true; aggiorna(true); if (posizione) map.setView([posizione.lat, posizione.lng], 18); parla('Si parte. Segui la linea gialla.'); };
      return;
    }
    if (S.fase === 'cammino') {
      const loop = giroAttivo(), I = info(loop), p = progDi(S.giorno, S.giro), tot = I.cc[I.cc.length - 1];
      const perc = Math.round(100 * I.cc[p] / tot), resto = I.tt[I.tt.length - 1] - I.tt[p];
      box.innerHTML = `<div class="avanz-testo"><span>Giro <b>${S.giro + 1}</b> di ${loops.length}</span><span>Mancano <b>${kmTesto(tot - I.cc[p])}</b>, circa ${oreTesto(resto)}</span></div>
        <div class="avanz" role="progressbar" aria-valuenow="${perc}" aria-valuemin="0" aria-valuemax="100"><div style="width:${perc}%"></div></div>
        <button class="tasto verde" id="bNuova">${ICO.piu}Nuova casa</button>`;
      $('bNuova').onclick = apriNuovaCasa;
      return;
    }
    if (S.fase === 'macchina') {
      box.innerHTML = `<h1>Ultimo passaggio in macchina</h1><p>${g.carStops.length === 1 ? 'C\'è una casa isolata' : 'Ci sono ' + g.carStops.length + ' gruppi di case isolate'}: guardale passando in macchina.</p>` +
        g.carStops.map((s, i) => `<a class="tasto piccolo" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}&travelmode=driving">${ICO.auto}Portami alle case isolate ${g.carStops.length > 1 ? i + 1 : ''}</a>`).join('') +
        `<button class="tasto primario" id="bFine">Ho finito il giorno ${n}</button>`;
      $('bFine').onclick = finisciGiorno;
      return;
    }
    if (S.fase === 'fine') {
      const quante = [...case_.values()].filter(h => h.comune === cfg.comune && h.day === n).length;
      const prossimo = plan.plan.findIndex((_, i) => !S.fatti[i]);
      box.innerHTML = `${puntini()}<h1>Giorno ${n} finito</h1><p>${quante === 0 ? 'Oggi non hai salvato case.' : quante === 1 ? 'Oggi hai salvato 1 casa.' : 'Oggi hai salvato ' + quante + ' case.'}</p>
        ${prossimo >= 0 ? `<button class="tasto primario" id="bProssimo">Prepara il giorno ${prossimo + 1}</button>` : ''}<button class="tasto" id="bCase">${ICO.casa}Le mie case</button>`;
      if (prossimo >= 0) $('bProssimo').onclick = () => { S.giorno = prossimo; S.giro = 0; S.fase = 'inizio'; salvaStato(); aggiorna(true); };
      $('bCase').onclick = apriCase;
    }
  }
  function finisciGiorno() { S.fatti[S.giorno] = true; S.fase = 'fine'; salvaStato(); aggiorna(true); }

  function aggiorna(centra) { disegna(centra); guida(); pannello(); posizionaTondi(); }
  function posizionaTondi() { requestAnimationFrame(() => { const h = $('pannello').offsetHeight; $('tondi').style.bottom = (h + 12) + 'px'; $('invio').style.bottom = (h + 12) + 'px'; $('toast').style.bottom = (h + 12) + 'px'; }); }

  // ---------- fine di un giro ----------
  function festa(titolo, testo, bottone, azione) {
    $('festaScheda').innerHTML = `${ICO.festa}<h2>${titolo}</h2><p>${testo}</p><button class="tasto primario" id="bFesta">${bottone}</button>`;
    $('festa').classList.add('aperto');
    $('bFesta').onclick = () => { $('festa').classList.remove('aperto'); azione(); };
    parla(titolo + '. ' + testo);
  }
  function giroCompletato() {
    const g = oggi(), resto = g.loops.findIndex((l, li) => li !== S.giro && !giroFatto(S.giorno, li, l));
    if (resto >= 0) festa(`Giro ${S.giro + 1} fatto`, `Ora sposta la macchina per il giro ${resto + 1}.`, 'Avanti', () => { S.giro = resto; S.fase = 'parcheggio'; salvaStato(); aggiorna(true); });
    else if (g.carStops && g.carStops.length) festa('Giri a piedi finiti', 'Manca solo un passaggio in macchina dalle case isolate.', 'Avanti', () => { S.fase = 'macchina'; salvaStato(); aggiorna(true); });
    else festa(`Giorno ${S.giorno + 1} finito`, 'Hai fatto tutti i giri di oggi.', 'Avanti', finisciGiorno);
  }

  // ---------- avanzamento lungo il percorso ----------
  function avanza(pt) {
    const loop = giroAttivo(); if (!loop) return;
    const c = loop.coords, k = chiave(S.giorno, S.giro), p = S.prog[k] || 0;
    let vicinoMin = Infinity; for (let i = p; i < Math.min(c.length, p + 40); i++) vicinoMin = Math.min(vicinoMin, dist(pt, c[i]));
    const eraFuori = fuori >= 3;
    if (vicinoMin > 45) fuori++; else if (vicinoMin < 25) fuori = 0;
    let best = -1;
    // il primo punto davanti entro 22 m (nei vicoli ciechi andata e ritorno passano dallo stesso posto)
    for (let i = p + 1; i < Math.min(c.length, p + 40); i++) if (dist(pt, c[i]) < 22) { best = i; break; }
    if (best > 0) { while (best + 1 < c.length && best < p + 40 && dist(pt, c[best + 1]) < 22) best++; avanza.salto = 0; }
    else if (dist(pt, c[p]) >= 35) {
      // molto più avanti sul percorso: dopo 3 posizioni di fila, salto lì
      const j = c.findIndex((q, i) => i >= p + 40 && i < Math.min(p + 300, c.length - 5) && dist(pt, q) < 22);
      if (j >= 0 && ++avanza.salto >= 3) { best = j; avanza.salto = 0; fuori = 0; }
    }
    if (best > p) {
      S.prog[k] = best; salvaStato();
      if (best >= c.length - 3) { disegna(false); guida(); pannello(); giroCompletato(); return; }
      disegna(false); pannello();
    }
    if (eraFuori !== (fuori >= 3) && fuori >= 3) { parla('Sei fuori dal percorso. Torna sulla linea gialla.'); try { navigator.vibrate && navigator.vibrate(400); } catch (e) { } }
    guida();
  }
  avanza.salto = 0;

  // ---------- GPS ----------
  let posizione = null, ultimoPunto = null, bufferTraccia = LS.get('buffer_traccia', []);
  const io = L.marker([0, 0], { icon: L.divIcon({ className: '', html: '<div class="io"></div>', iconSize: [26, 26], iconAnchor: [13, 13] }), interactive: false, zIndexOffset: 1000 });
  const cerchio = L.circle([0, 0], { radius: 10, color: BLU, weight: 1, fillOpacity: .08, interactive: false });
  function suPosizione(p) {
    const { latitude: lat, longitude: lng, accuracy: acc } = p.coords;
    const primaVolta = !posizione;
    posizione = { lat, lng, acc, ts: p.timestamp || Date.now() };
    io.setLatLng([lat, lng]); cerchio.setLatLng([lat, lng]).setRadius(acc);
    if (primaVolta) { lIo.addLayer(cerchio); lIo.addLayer(io); if (S.fase === 'cammino') map.setView([lat, lng], 18); }
    else if (segui && S.fase === 'cammino') map.panTo([lat, lng], { animate: true });
    if (S.fase === 'parcheggio') { const v = dist([lat, lng], [giroAttivo().start.lat, giroAttivo().start.lon]) < 80; if (v !== suPosizione.vicino) { suPosizione.vicino = v; pannello(); posizionaTondi(); } }
    if (acc > 35) return;
    const pt = [lat, lng];
    if (!ultimoPunto || dist(ultimoPunto, pt) >= 8) {
      ultimoPunto = pt;
      bufferTraccia.push([posizione.ts, +lat.toFixed(6), +lng.toFixed(6), Math.round(acc)]); LS.set('buffer_traccia', bufferTraccia);
    }
    if (S.fase === 'cammino') avanza(pt);
  }
  if (navigator.geolocation) navigator.geolocation.watchPosition(suPosizione, e => { if (e.code === 1) toast('Serve il permesso della posizione: attivalo per Chrome nelle impostazioni del telefono.', 'errore', 7000); }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
  $('tCentra').onclick = () => { segui = true; if (posizione) map.setView([posizione.lat, posizione.lng], Math.max(map.getZoom(), 17)); else toast('Sto cercando la posizione GPS…'); };

  // schermo sempre acceso mentre l'app è aperta (altrimenti il GPS si ferma)
  async function tieniAcceso() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') await navigator.wakeLock.request('screen'); } catch (e) { } }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tieniAcceso(); else inviaTraccia(); });
  tieniAcceso();
  async function inviaTraccia() {
    if (!bufferTraccia.length || !cfg.url) return;
    const pezzo = bufferTraccia.slice(0, 300);
    try { await api('saveTrack', { comune: cfg.comune, day: S.giorno + 1, points: pezzo }); bufferTraccia = bufferTraccia.slice(pezzo.length); LS.set('buffer_traccia', bufferTraccia); } catch (e) { }
  }
  setInterval(inviaTraccia, 60000);

  // ---------- fogli ----------
  function apri(id) { $(id).classList.add('aperto'); }
  function chiudi(id) { $(id).classList.remove('aperto'); }
  document.querySelectorAll('[data-chiudi]').forEach(b => b.onclick = () => {
    const f = b.closest('.foglio');
    if (f.id === 'fCasa' && casaModificata() && !confirm('Vuoi uscire senza salvare questa casa?')) return;
    if (f.id === 'fCasa') fermaRegistrazione(true);
    f.classList.remove('aperto');
  });

  // ---------- case ----------
  const case_ = new Map(), marcatori = new Map();
  function marcatore(h, nuovo) {
    if (h.lat === '' || h.lat == null) return;
    if (marcatori.has(h.id)) lCase.removeLayer(marcatori.get(h.id));
    const m = L.marker([h.lat, h.lng], { icon: L.divIcon({ className: 'pin' + (h.inInvio ? ' in-invio' : '') + (nuovo ? ' nuovo' : ''), html: pinSVG(h.stato), iconSize: [30, 38], iconAnchor: [15, 37], popupAnchor: [0, -34] }), title: h.address || 'Casa' });
    m.bindPopup(() => popupCasa(h), { maxWidth: 290, autoPanPaddingTopLeft: [10, 190], autoPanPaddingBottomRight: [10, 230] });
    m.addTo(lCase); marcatori.set(h.id, m);
  }
  function popupCasa(h) {
    const div = document.createElement('div'); div.className = 'pop';
    const data = h.ts ? new Date(h.ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }) : '';
    div.innerHTML = `<b>${esc(h.address || 'Casa senza indirizzo')}</b>${esc(h.tipo || '')}${data ? ', ' + data : ''}${h.inInvio ? '<br><i>In invio…</i>' : ''}
      ${h.foto0 ? `<img src="${h.foto0}" alt="">` : ''}${h.note ? `<p style="margin:8px 0 0">${esc(h.note)}</p>` : ''}
      <div style="margin-top:8px">${(h.photos || []).length ? `<a target="_blank" rel="noopener" href="${esc(h.photos[0])}">Apri le foto</a>` : ''}${h.audio ? `${(h.photos || []).length ? ' &nbsp; ' : ''}<a target="_blank" rel="noopener" href="${esc(h.audio)}">Ascolta la nota</a>` : ''}</div>
      <div class="cambia">Cambia stato</div><div class="scelte griglia"></div>`;
    const sc = div.querySelector('.scelte');
    STATI.forEach(s => { const b = document.createElement('button'); b.className = 'scelta'; b.setAttribute('aria-pressed', h.stato === s.k); b.innerHTML = pinSVG(s.k) + esc(s.k); b.onclick = () => cambiaStato(h, s.k); sc.appendChild(b); });
    return div;
  }
  async function cambiaStato(h, stato) {
    const prima = h.stato; h.stato = stato; marcatore(h); map.closePopup();
    try {
      if (h.inInvio) { const tutte = await DB.all(), r = tutte.find(x => x.id === h.id); if (r) { r.stato = stato; await DB.put(r); } }
      else await api('updateHouse', { id: h.id, stato });
      toast('Stato cambiato: ' + stato, 'ok');
    } catch (e) { h.stato = prima; marcatore(h); toast(/sconosciuta/.test(e.message) ? 'Per cambiare lo stato va aggiornato lo script Google (vedi istruzioni).' : 'Non riesco a cambiare lo stato: ' + e.message, 'errore', 6000); }
    contaCase();
  }
  function contaCase() { const n = [...case_.values()].filter(h => h.comune === cfg.comune).length; $('numCase').textContent = n; $('numCase').hidden = !n; }
  async function caricaCase() {
    try { (await api('listHouses', { comune: cfg.comune })).forEach(h => { const old = case_.get(h.id); if (old && old.foto0) h.foto0 = old.foto0; case_.set(h.id, h); marcatore(h); }); } catch (e) { }
    try { (await DB.all()).forEach(r => { const h = { ...r, inInvio: true, photos: [], foto0: (r.fotoLocali || [])[0] }; case_.set(h.id, h); marcatore(h); }); } catch (e) { }
    contaCase(); statoCoda();
  }

  // lista
  let filtro = '';
  function apriCase() { disegnaLista(); apri('fCase'); }
  $('tCase').onclick = apriCase;
  function disegnaLista() {
    const tutte = [...case_.values()].filter(h => h.comune === cfg.comune).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const f = $('filtri'); f.innerHTML = '';
    [{ k: '', n: 'Tutte' }, ...STATI.map(s => ({ k: s.k, n: s.k }))].forEach(o => {
      const n = o.k ? tutte.filter(h => h.stato === o.k).length : tutte.length; if (o.k && !n) return;
      const b = document.createElement('button'); b.className = 'scelta' + (o.k ? '' : ' senza-icona'); b.setAttribute('aria-pressed', filtro === o.k);
      b.innerHTML = (o.k ? pinSVG(o.k) : '') + esc(o.n) + ' (' + n + ')'; b.onclick = () => { filtro = o.k; disegnaLista(); }; f.appendChild(b);
    });
    const l = $('listaCase'), vis = tutte.filter(h => !filtro || h.stato === filtro);
    l.innerHTML = vis.length ? '' : `<div class="vuoto">${tutte.length ? 'Nessuna casa con questo stato.' : 'Non hai ancora salvato case. Quando ne vedi una, premi "Nuova casa".'}</div>`;
    vis.forEach(h => {
      const b = document.createElement('button'); b.className = 'casa-riga';
      const data = h.ts ? new Date(h.ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : '';
      b.innerHTML = `${pinSVG(h.stato)}<div><b>${esc(h.address || 'Casa senza indirizzo')}</b><span>${esc(h.stato || '')}${h.tipo ? ', ' + esc(h.tipo.toLowerCase()) : ''}${data ? ', ' + data : ''}${h.inInvio ? ', in invio' : ''}</span></div>${h.foto0 ? `<img src="${h.foto0}" alt="">` : ''}`;
      b.onclick = () => { chiudi('fCase'); if (h.lat !== '' && h.lat != null) { map.setView([h.lat, h.lng], 18); setTimeout(() => marcatori.get(h.id) && marcatori.get(h.id).openPopup(), 300); } };
      l.appendChild(b);
    });
  }

  // ---------- nuova casa ----------
  let nc = null; // dati della casa che si sta compilando
  const casaModificata = () => nc && (nc.foto.length || nc.audio || $('note').value.trim());
  function apriNuovaCasa() {
    nc = { pos: posizione ? { ...posizione } : null, foto: [], audio: null, stato: 'Da valutare', tipo: '' };
    $('note').value = ''; $('indirizzo').value = '';
    disegnaFoto(); disegnaVoce(); disegnaScelte();
    apri('fCasa'); cercaIndirizzo();
  }
  async function cercaIndirizzo() {
    const t = $('indirizzo'), a = $('aiutoIndirizzo');
    t.value = ''; t.placeholder = 'Cerco l\'indirizzo…';
    if (!nc.pos) { t.placeholder = 'Scrivi l\'indirizzo'; a.textContent = 'Il GPS non è ancora pronto: scrivi l\'indirizzo a mano.'; return; }
    a.textContent = `Trovato con il GPS (precisione ${Math.round(nc.pos.acc)} m): controlla il numero civico.`;
    try { const r = await api('geocode', { lat: nc.pos.lat, lng: nc.pos.lng }); const s = accorcia(r.address || ''); t.value = s.via + (s.paese ? ', ' + s.paese : ''); allarga(); if (!r.exact) a.textContent = 'Numero civico non trovato: aggiungilo tu se lo vedi.'; }
    catch (e) { t.placeholder = 'Scrivi l\'indirizzo'; a.textContent = 'Non riesco a trovare l\'indirizzo: scrivilo a mano.'; }
  }
  const allarga = () => { const t = $('indirizzo'); t.style.height = 'auto'; t.style.height = t.scrollHeight + 4 + 'px'; };
  $('indirizzo').addEventListener('input', allarga);
  $('riprovaIndirizzo').onclick = () => { if (posizione) nc.pos = { ...posizione }; cercaIndirizzo(); };

  function disegnaFoto() {
    const g = $('fotoGriglia'); g.innerHTML = '';
    const add = document.createElement('div'); add.className = 'cella';
    add.innerHTML = `<button class="aggiungi-foto">${ICO.foto}${nc.foto.length ? 'Un\'altra' : 'Scatta foto'}</button>`;
    add.firstChild.onclick = () => $('inputFoto').click();
    if (nc.foto.length < 6) g.appendChild(add);
    nc.foto.forEach((u, i) => { const d = document.createElement('div'); d.className = 'cella'; d.innerHTML = `<img src="${u}" alt="Foto ${i + 1}"><button class="togli" aria-label="Togli questa foto">${ICO.x}</button>`; d.querySelector('.togli').onclick = () => { nc.foto.splice(i, 1); disegnaFoto(); }; g.appendChild(d); });
  }
  $('inputFoto').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const img = await createImageBitmap(f), s = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      nc.foto.push(cv.toDataURL('image/jpeg', 0.75)); disegnaFoto();
    } catch (err) { toast('Non riesco a leggere la foto, riprova.', 'errore'); }
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
      v.innerHTML = `<div class="voce" style="display:block"><div class="ascolta"><button class="play" id="bPlay" aria-label="Ascolta">${ICO.play}</button><div class="voce-testi"><div class="voce-titolo">Nota registrata</div><div class="barra-audio"><div id="barraAudio"></div></div><div class="voce-sotto" id="tempoAudio">${Math.floor(durata / 60)}:${String(durata % 60).padStart(2, '0')}</div></div></div>
        <div class="voce-azioni"><button class="tasto piccolo" id="bRifai">${ICO.rifai}Rifai</button><button class="tasto piccolo" id="bElimina">${ICO.cestino}Elimina</button></div></div>`;
      const a = new Audio(URL.createObjectURL(nc.audio));
      a.ontimeupdate = () => { const d = isFinite(a.duration) ? a.duration : durata; $('barraAudio').style.width = (100 * a.currentTime / (d || 1)) + '%'; };
      a.onended = () => { $('bPlay').innerHTML = ICO.play; $('barraAudio').style.width = '0'; };
      $('bPlay').onclick = () => { if (a.paused) { a.play(); $('bPlay').innerHTML = ICO.pausa; } else { a.pause(); $('bPlay').innerHTML = ICO.play; } };
      $('bRifai').onclick = () => { a.pause(); iniziaRegistrazione(); };
      $('bElimina').onclick = () => { a.pause(); nc.audio = null; disegnaVoce(); };
      return;
    }
    v.innerHTML = `<div class="voce"><button class="mic" id="bMic" aria-label="Registra una nota vocale">${ICO.mic}</button><div class="voce-testi"><div class="voce-titolo">Tocca e parla</div><div class="voce-sotto">Racconta cosa vedi: stato della casa, cartello, numero dell'agenzia.</div></div></div>`;
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
      nc.audioSec = Math.round((Date.now() - (rec ? rec.t0 : Date.now())) / 1000);
      rec = null;
      if (!annulla) { nc.audio = new Blob(pezzi, { type: mr.mimeType || 'audio/webm' }); try { navigator.vibrate && navigator.vibrate(60); } catch (e) { } }
      if (!annulla) disegnaVoce();
    };
    mr.start(250);
    try { navigator.vibrate && navigator.vibrate(60); } catch (e) { }
    disegnaVoce();
    // livello della voce e timer
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
      if (s >= 180) { fermaRegistrazione(false); toast('Nota fermata dopo 3 minuti.', ''); }
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
    if (rec) fermaRegistrazione(false);
    await new Promise(r => setTimeout(r, rec ? 400 : 0));
    const p = nc.pos || posizione, address = $('indirizzo').value.trim();
    if (!p && !address) { toast('Scrivi almeno l\'indirizzo.', 'errore'); return; }
    const h = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), comune: cfg.comune, day: S.giorno + 1, address,
      lat: p ? +p.lat.toFixed(6) : '', lng: p ? +p.lng.toFixed(6) : '', acc: p ? p.acc : null,
      stato: nc.stato, tipo: nc.tipo, note: $('note').value.trim(), fotoLocali: nc.foto.slice(), audioBlob: nc.audio
    };
    try { await DB.put(h); } catch (e) { toast('Memoria del telefono piena: libera spazio e riprova.', 'errore', 6000); return; }
    const vista = { ...h, inInvio: true, photos: [], foto0: h.fotoLocali[0] };
    case_.set(h.id, vista); marcatore(vista, true); contaCase();
    nc = null; chiudi('fCasa');
    toast('Casa salvata', 'ok');
    svuotaCoda();
  };

  // invio in sottofondo
  let invioInCorso = false;
  const b64 = blob => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = ko; r.readAsDataURL(blob); });
  async function statoCoda() { try { const n = (await DB.all()).length; const el = $('invio'); el.style.display = n ? 'block' : 'none'; el.textContent = n === 1 ? '1 casa in invio…' : n + ' case in invio…'; } catch (e) { } }
  async function svuotaCoda() {
    if (invioInCorso || !cfg.url) return; invioInCorso = true; statoCoda();
    try {
      for (const r of await DB.all()) {
        const house = { id: r.id, ts: r.ts, comune: r.comune, day: r.day, address: r.address, lat: r.lat, lng: r.lng, acc: r.acc, stato: r.stato, tipo: r.tipo, note: r.note,
          photos: (r.fotoLocali || []).map(u => ({ b64: u.split(',')[1], mime: 'image/jpeg' })), audio: r.audioBlob ? { b64: await b64(r.audioBlob), mime: r.audioBlob.type } : null };
        const res = await api('saveHouse', { house });
        await DB.del(r.id);
        const v = { ...house, photos: res.photoUrls || [], audio: res.audioUrl || '', foto0: (r.fotoLocali || [])[0], inInvio: false };
        delete v.acc; case_.set(r.id, v); marcatore(v);
      }
    } catch (e) { /* niente rete: riprovo più tardi */ }
    invioInCorso = false; statoCoda();
  }
  setInterval(svuotaCoda, 20000);
  window.addEventListener('online', svuotaCoda);

  // ---------- menu ----------
  function apriMenu() {
    const c = $('menuCorpo'), voci = [];
    if (pianoOk()) voci.push({ i: ICO.calendario, t: 'Scegli il giorno', s: 'Giorno ' + (S.giorno + 1) + ' di ' + plan.plan.length, f: () => { chiudi('fMenu'); apriGiorni(); } });
    if (pianoOk() && (S.fase === 'cammino' || S.fase === 'parcheggio')) {
      voci.push({ i: ICO.rifai, t: 'Ricomincia questo giro', s: 'Il giro torna tutto da fare', f: () => { if (!confirm('Ricominciare da capo il giro ' + (S.giro + 1) + '? Le case salvate restano.')) return; S.prog[chiave(S.giorno, S.giro)] = 0; S.fase = 'parcheggio'; salvaStato(); chiudi('fMenu'); aggiorna(true); } });
      voci.push({ i: ICO.salta, t: 'Salta questo giro', s: 'Passa al giro successivo', f: () => { chiudi('fMenu'); const loop = giroAttivo(); S.prog[chiave(S.giorno, S.giro)] = loop.coords.length - 1; salvaStato(); aggiorna(false); giroCompletato(); } });
    }
    voci.push({ i: ICO.voce, t: 'Indicazioni a voce: ' + (S.voce ? 'sì' : 'no'), s: S.voce ? 'Tocca per spegnerle' : 'Il telefono ti dice dove girare', f: () => { S.voce = !S.voce; salvaStato(); if (S.voce) parla('Indicazioni a voce accese.'); apriMenu(); } });
    voci.push({ i: ICO.foglio, t: 'Apri il foglio delle case', s: 'Tutte le case in Google Fogli', f: () => { const u = LS.get('sheetUrl', ''); if (u) window.open(u, '_blank'); else toast('Prima vanno salvate le impostazioni.', 'errore'); } });
    voci.push({ i: ICO.ingranaggio, t: 'Impostazioni', s: 'Collegamento, comune, calcolo percorsi', f: () => { chiudi('fMenu'); riempiCfg(); apri('fImpost'); } });
    c.innerHTML = '';
    voci.forEach(v => { const b = document.createElement('button'); b.className = 'voce-menu'; b.innerHTML = `${v.i}<span>${esc(v.t)}<small>${esc(v.s)}</small></span>`; b.onclick = v.f; c.appendChild(b); });
    const ver = document.createElement('p'); ver.className = 'aiuto'; ver.textContent = 'Agente Moni, ' + cfg.comune; c.appendChild(ver);
    apri('fMenu');
  }
  $('tMenu').onclick = apriMenu;

  function apriGiorni() {
    const c = $('giorniCorpo'); c.innerHTML = '';
    if (!pianoOk()) { c.innerHTML = '<p class="vuoto">Prima vanno calcolati i percorsi.</p>'; apri('fGiorni'); return; }
    plan.plan.forEach((g, i) => {
      const b = document.createElement('button'); b.className = 'giorno-scelta' + (i === S.giorno ? ' oggi' : '') + (S.fatti[i] ? ' fatto' : '');
      b.innerHTML = `<b>Giorno ${i + 1}: ${esc(g.name)}</b><span>${kmTesto(g.km * 1000)} a piedi, circa ${oreTesto(g.ore)}. ${g.loops.length === 1 ? '1 giro' : g.loops.length + ' giri'}.</span>`;
      b.onclick = () => { S.giorno = i; S.giro = 0; S.fase = 'inizio'; salvaStato(); chiudi('fGiorni'); aggiorna(true); };
      c.appendChild(b);
    });
    apri('fGiorni');
  }

  // ---------- impostazioni e calcolo ----------
  function riempiCfg() { $('cfgUrl').value = cfg.url; $('cfgKey').value = cfg.key; $('cfgComune').value = cfg.comune; $('cfgGiorni').value = cfg.giorni; }
  function leggiCfg() {
    const comune = $('cfgComune').value.trim() || 'Cazzago San Martino';
    Object.assign(cfg, { url: $('cfgUrl').value.trim(), key: $('cfgKey').value.trim(), giorni: Math.max(1, Math.min(15, +$('cfgGiorni').value || 5)) });
    if (comune !== cfg.comune) { cfg.comune = comune; plan = LS.get('plan_' + comune, null); S = caricaStato(); case_.clear(); marcatori.clear(); lCase.clearLayers(); }
    LS.set('cfg', cfg);
  }
  $('salvaCfg').onclick = async () => {
    leggiCfg();
    try { const r = await api('ping'); LS.set('sheetUrl', r.sheet); toast('Collegamento riuscito', 'ok'); avvia(); }
    catch (e) { toast('Collegamento non riuscito: ' + e.message, 'errore', 7000); }
  };
  $('calcola').onclick = () => { leggiCfg(); calcolaPercorsi($('registro'), $('calcola')); };
  async function calcolaPercorsi(reg, btn) {
    reg.style.display = 'block'; reg.textContent = ''; btn.disabled = true;
    const log = m => { reg.textContent += m + '\n'; reg.scrollTop = 1e9; };
    try {
      const p = await Planner.plan(cfg.comune, cfg.giorni, log);
      plan = p; LS.set('plan_' + cfg.comune, plan);
      S = Object.assign(caricaStato(), { giorno: 0, fase: 'inizio', giro: 0, prog: {}, fatti: {} }); salvaStato();
      p.plan.forEach(g => log(`Giorno ${g.day}, ${g.name}: ${kmTesto(g.km * 1000)}, circa ${oreTesto(g.ore)}`));
      try { await api('saveRoutes', { comune: cfg.comune, plan: p }); log('Percorsi salvati anche su Google Drive.'); } catch (e) { log('Percorsi salvati solo su questo telefono.'); }
      chiudi('fImpost'); aggiorna(true); toast('Percorsi pronti', 'ok');
    } catch (e) { log('Errore: ' + e.message + '. Riprova tra qualche minuto.'); }
    finally { btn.disabled = false; }
  }

  // ---------- avvio ----------
  async function avvia() {
    if (!pianoOk() && cfg.url) { try { const p = await api('getRoutes', { comune: cfg.comune }); if (p && p.v === 2) { plan = p; LS.set('plan_' + cfg.comune, plan); } } catch (e) { } }
    aggiorna(true); caricaCase(); svuotaCoda(); inviaTraccia();
  }
  aggiorna(true);
  window.addEventListener('resize', posizionaTondi);
  if (!cfg.url || !cfg.key) { riempiCfg(); } else avvia();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
