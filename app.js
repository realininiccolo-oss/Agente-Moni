/* app.js — Giri case: mappa, percorso del giorno, traccia GPS, schede delle case */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const LS = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  const cfg = LS.get('cfg', { url: '', key: '', comune: 'Cazzago San Martino', giorni: 5 });

  // ---------- utilità ----------
  function toast(msg, ms = 3000) { const t = $('toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(() => t.style.display = 'none', ms); }
  function apri(id) { $(id).classList.add('aperta'); }
  function chiudi(id) { $(id).classList.remove('aperta'); }
  document.querySelectorAll('[data-chiudi]').forEach(b => b.onclick = () => b.closest('.modale').classList.remove('aperta'));
  const dist = (a, b) => { const R = 6371000, t = Math.PI / 180, dl = (b[0] - a[0]) * t, dn = (b[1] - a[1]) * t; const x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const km = m => (m / 1000).toFixed(1).replace('.', ',');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  async function api(action, payload = {}) {
    if (!cfg.url || !cfg.key) throw new Error('Manca il collegamento: apri ⚙ Impostazioni');
    const r = await fetch(cfg.url, { method: 'POST', body: JSON.stringify({ key: cfg.key, action, ...payload }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error);
    return j.data;
  }

  // ---------- mappa ----------
  const map = L.map('map', { zoomControl: false, attributionControl: true }).setView([45.583, 10.03], 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  const strati = { percorso: L.layerGroup().addTo(map), traccia: L.layerGroup().addTo(map), case: L.layerGroup().addTo(map), io: L.layerGroup().addTo(map) };
  let segui = true;
  map.on('dragstart', () => { segui = false; });

  // ---------- stato ----------
  let plan = LS.get('plan_' + cfg.comune, null);
  let giorno = LS.get('giorno_' + cfg.comune, 0);
  let prog = LS.get('prog_' + cfg.comune, {});           // { "g-l": indice punto raggiunto }
  let giroAttivo = LS.get('giro_' + cfg.comune, {});     // { g: indice giro attivo }
  let posizione = null;                                  // ultimo fix GPS {lat,lng,acc,ts}
  let bufferTraccia = LS.get('buffer_traccia', []);
  let lineaOggi = null, ultimoPunto = null;

  // ---------- percorso del giorno ----------
  function cumul(coords) { const c = [0]; for (let i = 1; i < coords.length; i++) c.push(c[i - 1] + dist(coords[i - 1], coords[i])); return c; }
  function giri() { return plan && plan.plan[giorno] ? plan.plan[giorno].loops : []; }
  function attivo() { return giroAttivo[giorno] || 0; }
  function chiaveProg(l) { return giorno + '-' + l; }

  function disegnaPercorso(centra) {
    strati.percorso.clearLayers();
    if (!plan || !plan.plan[giorno]) { $('titoloGiorno').textContent = 'Nessun percorso'; $('sottotitolo').textContent = 'Apri ⚙ e calcola i percorsi'; $('avanzamento').style.display = 'none'; return; }
    const g = plan.plan[giorno], L0 = giri(), a = attivo();
    $('titoloGiorno').textContent = 'Giorno ' + g.day + ' · ' + g.name.split(',')[0];
    let bounds = null;
    L0.forEach((loop, li) => {
      const p = prog[chiaveProg(li)] || 0, isA = li === a, c = loop.coords;
      if (isA) {
        L.polyline(c.slice(0, p + 1), { color: '#1d9e75', weight: 7, opacity: .8 }).addTo(strati.percorso);
        L.polyline(c.slice(p), { color: '#185fa5', weight: 5, opacity: .75 }).addTo(strati.percorso);
        // prossimi 300 m in evidenza
        const cc = cumul(c); let j = p; while (j < c.length - 1 && cc[j] - cc[p] < 300) j++;
        L.polyline(c.slice(p, j + 1), { color: '#0c447c', weight: 10, opacity: .9 }).addTo(strati.percorso);
        // frecce di direzione ogni ~120 m
        let ultimo = -1e9;
        for (let i = p + 1; i < c.length; i++) {
          if (cc[i] - ultimo < 120) continue; ultimo = cc[i];
          const ang = Math.atan2((c[i][1] - c[i - 1][1]) * Math.cos(c[i][0] * Math.PI / 180), c[i][0] - c[i - 1][0]) * 180 / Math.PI;
          L.marker(c[i], { interactive: false, icon: L.divIcon({ className: '', html: `<div class="freccia" style="transform:rotate(${ang}deg)">▲</div>`, iconSize: [14, 14], iconAnchor: [7, 7] }) }).addTo(strati.percorso);
        }
        bounds = L.latLngBounds(c);
      } else {
        L.polyline(c, { color: p >= c.length - 3 ? '#1d9e75' : '#888', weight: 4, opacity: .55, dashArray: '6 6' }).addTo(strati.percorso);
      }
      L.marker([loop.start.lat, loop.start.lon], { icon: L.divIcon({ className: '', html: `<div class="etichetta-p">P${L0.length > 1 ? ' ' + (li + 1) : ''}</div>`, iconAnchor: [14, 12] }) })
        .bindPopup(`<b>Giro ${li + 1} di ${L0.length}</b><br>${esc(loop.start.name)}<br>${km(loop.km * 1000)} km · circa ${String(loop.ore).replace('.', ',')} ore<br><a href="https://www.google.com/maps/dir/?api=1&destination=${loop.start.lat},${loop.start.lon}" target="_blank">Portami qui in macchina</a><br><a href="#" data-giro="${li}">Fai questo giro</a>`)
        .addTo(strati.percorso);
    });
    (g.carStops || []).forEach(s => L.marker([s.lat, s.lon], { icon: L.divIcon({ className: '', html: '<div style="font-size:22px">🚗</div>', iconSize: [24, 24], iconAnchor: [12, 12] }) })
      .bindPopup('Case isolate: guardale passando in macchina<br><a href="https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lon + '" target="_blank">Portami qui</a>').addTo(strati.percorso));
    aggiornaAvanzamento();
    if (centra && bounds) map.fitBounds(bounds, { padding: [30, 30] });
  }
  map.on('popupopen', e => { const a = e.popup.getElement().querySelector('[data-giro]'); if (a) a.onclick = ev => { ev.preventDefault(); giroAttivo[giorno] = +a.dataset.giro; LS.set('giro_' + cfg.comune, giroAttivo); map.closePopup(); disegnaPercorso(true); }; });

  function aggiornaAvanzamento() {
    const L0 = giri(); if (!L0.length) return;
    const a = attivo(), c = L0[a].coords, cc = cumul(c), p = prog[chiaveProg(a)] || 0;
    const fatti = L0.filter((l, i) => (prog[chiaveProg(i)] || 0) >= l.coords.length - 3).length;
    $('sottotitolo').textContent = `Giro ${a + 1} di ${L0.length} · mancano ${km(cc[cc.length - 1] - cc[p])} km`;
    const box = $('avanzamento');
    box.style.display = 'block';
    box.textContent = `Fatto ${Math.round(100 * cc[p] / cc[cc.length - 1])}% di questo giro · giri completati oggi: ${fatti}/${L0.length}`;
  }

  // avanza lungo il percorso quando il GPS è vicino ai prossimi punti
  function avanzaSuPercorso(pt) {
    const L0 = giri(); if (!L0.length) return;
    const a = attivo(), c = L0[a].coords, k = chiaveProg(a), p = prog[k] || 0;
    // primo punto davanti entro 22 m (non il più lontano: nei vicoli ciechi andata e ritorno passano dallo stesso posto)
    let best = -1;
    for (let i = p + 1; i < Math.min(c.length, p + 40); i++) if (dist(pt, c[i]) < 22) { best = i; break; }
    if (best > 0) { while (best + 1 < c.length && best < p + 40 && dist(pt, c[best + 1]) < 22) best++; avanzaSuPercorso.fuori = 0; }
    else {
      // ancora vicino al punto attuale (es. al parcheggio, che è anche l'arrivo): non salto
      if (dist(pt, c[p]) < 35) { avanzaSuPercorso.fuori = 0; return; }
      // molto più avanti sul percorso: dopo 3 posizioni di fila vicine a un punto successivo, salto lì
      const j = c.findIndex((q, i) => i >= p + 40 && i < Math.min(p + 300, c.length - 5) && dist(pt, q) < 22);
      if (j < 0) { avanzaSuPercorso.fuori = 0; return; }
      if (++avanzaSuPercorso.fuori < 3) return;
      best = j; avanzaSuPercorso.fuori = 0;
    }
    {
      prog[k] = best; LS.set('prog_' + cfg.comune, prog);
      if (best >= c.length - 3) {
        toast('Giro ' + (a + 1) + ' completato! 👏', 5000);
        if (a + 1 < L0.length) { giroAttivo[giorno] = a + 1; LS.set('giro_' + cfg.comune, giroAttivo); }
      }
      disegnaPercorso(false);
    }
  }

  // ---------- scelta del giorno ----------
  $('btnGiorno').onclick = () => {
    const box = $('listaGiorni'); box.innerHTML = '';
    if (!plan) { box.innerHTML = '<p>Nessun percorso calcolato. Apri ⚙ Impostazioni e premi "Calcola i percorsi".</p>'; apri('mGiorni'); return; }
    plan.plan.forEach((g, i) => {
      const d = document.createElement('div'); d.className = 'giorno' + (i === giorno ? ' attivo' : '');
      d.innerHTML = `<b>Giorno ${g.day}: ${esc(g.name)}</b><div class="nota">${km(g.km * 1000)} km a piedi · circa ${String(g.ore).replace('.', ',')} ore · ${g.loops.length} ${g.loops.length > 1 ? 'giri (sposti la macchina tra un giro e l\'altro)' : 'giro'}${g.carStops && g.carStops.length ? ' · ' + g.carStops.length + ' case isolate da vedere in macchina 🚗' : ''}</div>`;
      d.onclick = () => { giorno = i; LS.set('giorno_' + cfg.comune, giorno); chiudi('mGiorni'); disegnaPercorso(true); };
      box.appendChild(d);
    });
    const r = document.createElement('button'); r.className = 'btn'; r.textContent = 'Ricomincia da zero il giorno selezionato';
    r.onclick = () => { if (!confirm('Azzero l\'avanzamento del giorno ' + (giorno + 1) + '? (le case salvate restano)')) return; Object.keys(prog).filter(k => k.startsWith(giorno + '-')).forEach(k => delete prog[k]); giroAttivo[giorno] = 0; LS.set('prog_' + cfg.comune, prog); LS.set('giro_' + cfg.comune, giroAttivo); chiudi('mGiorni'); disegnaPercorso(true); };
    box.appendChild(r);
    apri('mGiorni');
  };

  // ---------- GPS ----------
  const marcatoreIo = L.circleMarker([0, 0], { radius: 9, color: '#fff', weight: 3, fillColor: '#185fa5', fillOpacity: 1 });
  const cerchioIo = L.circle([0, 0], { radius: 10, color: '#185fa5', weight: 1, fillOpacity: .1 });
  function suPosizione(p) {
    const { latitude: lat, longitude: lng, accuracy: acc } = p.coords;
    posizione = { lat, lng, acc, ts: p.timestamp || Date.now() };
    $('gps').className = acc <= 25 ? 'ok' : 'debole';
    marcatoreIo.setLatLng([lat, lng]); cerchioIo.setLatLng([lat, lng]).setRadius(acc);
    if (!strati.io.hasLayer(marcatoreIo)) { strati.io.addLayer(cerchioIo); strati.io.addLayer(marcatoreIo); map.setView([lat, lng], 17); }
    else if (segui) map.panTo([lat, lng]);
    if (acc > 35) return;
    const pt = [lat, lng];
    if (!ultimoPunto || dist(ultimoPunto, pt) >= 10) {
      ultimoPunto = pt;
      bufferTraccia.push([posizione.ts, +lat.toFixed(6), +lng.toFixed(6), Math.round(acc)]); LS.set('buffer_traccia', bufferTraccia);
      if (!lineaOggi) lineaOggi = L.polyline([], { color: '#1d9e75', weight: 6, opacity: .45 }).addTo(strati.traccia);
      lineaOggi.addLatLng(pt);
      avanzaSuPercorso(pt);
    }
  }
  function avviaGps() {
    if (!navigator.geolocation) { toast('Questo telefono non dà la posizione'); return; }
    navigator.geolocation.watchPosition(suPosizione, e => { $('gps').className = ''; if (e.code === 1) toast('Permesso posizione negato: attivalo nelle impostazioni di Chrome', 6000); }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
  }
  $('btnCentra').onclick = () => { segui = true; if (posizione) map.setView([posizione.lat, posizione.lng], Math.max(map.getZoom(), 17)); else toast('Sto cercando il GPS…'); };

  // schermo sempre acceso mentre l'app è aperta (altrimenti il GPS si ferma)
  let wakeLock = null;
  async function tieniAcceso() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { } }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tieniAcceso(); else inviaTraccia(); });

  async function inviaTraccia() {
    if (!bufferTraccia.length || !cfg.url) return;
    const pezzo = bufferTraccia.slice(0, 300);
    try { await api('saveTrack', { comune: cfg.comune, day: plan ? giorno + 1 : '', points: pezzo }); bufferTraccia = bufferTraccia.slice(pezzo.length); LS.set('buffer_traccia', bufferTraccia); } catch (e) { /* riprovo dopo */ }
  }
  setInterval(inviaTraccia, 60000);

  async function caricaTraccia() {
    try {
      const pts = await api('getTrack', { comune: cfg.comune });
      strati.traccia.clearLayers(); lineaOggi = null;
      let seg = [], prev = null;
      const chiudiSeg = () => { if (seg.length > 1) L.polyline(seg, { color: '#1d9e75', weight: 6, opacity: .45 }).addTo(strati.traccia); seg = []; };
      for (const [ts, lat, lng] of pts.concat(bufferTraccia.map(b => [b[0], b[1], b[2]]))) {
        if (prev && (ts - prev[0] > 180000 || dist([prev[1], prev[2]], [lat, lng]) > 120)) chiudiSeg();
        seg.push([lat, lng]); prev = [ts, lat, lng];
      }
      chiudiSeg();
    } catch (e) { }
  }

  // ---------- case ----------
  function aggiungiSegnaposto(h) {
    const colore = { 'Interessante': '#0f6e56', 'Cartello vendita': '#a32d2d', 'Cartello affitto': '#854f0b', 'Scartata': '#888' }[h.stato] || '#185fa5';
    const foto = (h.photos || [])[0];
    L.circleMarker([h.lat, h.lng], { radius: 9, color: '#fff', weight: 2, fillColor: colore, fillOpacity: 1 })
      .bindPopup(`<b>${esc(h.address || 'Casa')}</b><br>${esc(h.tipo || '')} · ${esc(h.stato || '')}<br>${esc(h.note || '')}${h.localPhoto ? `<img src="${h.localPhoto}">` : ''}${foto ? `<br><a href="${esc(foto)}" target="_blank">Apri foto</a>` : ''}${h.audio ? ` · <a href="${esc(h.audio)}" target="_blank">Ascolta nota</a>` : ''}`)
      .addTo(strati.case);
  }
  async function caricaCase() { try { const hs = await api('listHouses', { comune: cfg.comune }); strati.case.clearLayers(); hs.forEach(aggiungiSegnaposto); } catch (e) { } }

  // modulo nuova casa
  let foto = [], audio = null, registratore = null, pezziAudio = [], posCasa = null;
  async function cercaIndirizzo() {
    $('indirizzo').value = ''; $('indirizzo').placeholder = 'Sto cercando l\'indirizzo…';
    if (!posCasa) { $('indirizzo').placeholder = 'Scrivi l\'indirizzo (GPS non disponibile)'; return; }
    try { const r = await api('geocode', { lat: posCasa.lat, lng: posCasa.lng }); $('indirizzo').value = r.address || ''; if (!r.exact) $('notaGps').textContent += ' · Numero civico da controllare'; }
    catch (e) { $('indirizzo').placeholder = 'Scrivi l\'indirizzo'; }
  }
  $('btnCasa').onclick = () => {
    foto = []; audio = null; pezziAudio = []; $('miniature').innerHTML = ''; $('note').value = ''; $('playerAudio').style.display = 'none'; $('btnAudio').textContent = '🎙 Registra nota vocale';
    posCasa = posizione ? { ...posizione } : null;
    $('notaGps').textContent = posCasa ? `Posizione GPS precisa entro ${Math.round(posCasa.acc)} m: controlla il numero civico` : 'GPS non ancora pronto';
    apri('mCasa'); cercaIndirizzo();
  };
  $('btnRicarica').onclick = () => { posCasa = posizione ? { ...posizione } : posCasa; cercaIndirizzo(); };

  $('btnFoto').onclick = () => $('inputFoto').click();
  $('inputFoto').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const img = await createImageBitmap(f);
      const s = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const url = cv.toDataURL('image/jpeg', 0.75);
      foto.push(url);
      const d = document.createElement('div'); d.innerHTML = `<img src="${url}"><button aria-label="Togli">✕</button>`;
      d.querySelector('button').onclick = () => { foto.splice(foto.indexOf(url), 1); d.remove(); };
      $('miniature').appendChild(d);
    } catch (err) { toast('Non riesco a leggere la foto'); }
  };

  $('btnAudio').onclick = async () => {
    if (registratore && registratore.state === 'recording') { registratore.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
      registratore = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); pezziAudio = [];
      registratore.ondataavailable = ev => pezziAudio.push(ev.data);
      const t0 = Date.now(), tick = setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); $('btnAudio').textContent = `⏹ Ferma (${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')})`; }, 500);
      registratore.onstop = () => {
        clearInterval(tick); stream.getTracks().forEach(t => t.stop());
        audio = new Blob(pezziAudio, { type: registratore.mimeType || 'audio/webm' });
        $('playerAudio').src = URL.createObjectURL(audio); $('playerAudio').style.display = 'block';
        $('btnAudio').textContent = '🎙 Registra di nuovo';
      };
      registratore.start(); $('btnAudio').textContent = '⏹ Ferma (0:00)';
    } catch (e) { toast('Microfono non disponibile: dai il permesso a Chrome', 5000); }
  };

  const blobB64 = b => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = ko; r.readAsDataURL(b); });
  $('btnSalva').onclick = async () => {
    if (registratore && registratore.state === 'recording') { toast('Prima ferma la registrazione'); return; }
    const p = posCasa || posizione;
    if (!p && !$('indirizzo').value) { toast('Serve almeno l\'indirizzo o il GPS'); return; }
    const btn = $('btnSalva'); btn.disabled = true; btn.textContent = 'Salvataggio in corso…';
    try {
      const house = {
        ts: Date.now(), comune: cfg.comune, day: plan ? giorno + 1 : '', address: $('indirizzo').value.trim(),
        lat: p ? +p.lat.toFixed(6) : '', lng: p ? +p.lng.toFixed(6) : '', acc: p ? p.acc : null,
        stato: $('stato').value, tipo: $('tipo').value, note: $('note').value.trim(),
        photos: foto.map(u => ({ b64: u.split(',')[1], mime: 'image/jpeg' })),
        audio: audio ? { b64: await blobB64(audio), mime: audio.type } : null
      };
      const r = await api('saveHouse', { house });
      if (p) aggiungiSegnaposto({ ...house, photos: r.photoUrls, audio: r.audioUrl, localPhoto: foto[0] });
      chiudi('mCasa'); toast('Casa salvata ✓');
    } catch (e) { toast('Non salvata: ' + e.message + ' — riprova', 6000); }
    finally { btn.disabled = false; btn.textContent = 'Salva casa'; }
  };

  // ---------- impostazioni e calcolo percorsi ----------
  function riempiCfg() { $('cfgUrl').value = cfg.url; $('cfgKey').value = cfg.key; $('cfgComune').value = cfg.comune; $('cfgGiorni').value = cfg.giorni; }
  function leggiCfg() {
    const nuovoComune = $('cfgComune').value.trim() || 'Cazzago San Martino';
    Object.assign(cfg, { url: $('cfgUrl').value.trim(), key: $('cfgKey').value.trim(), giorni: Math.max(1, +$('cfgGiorni').value || 5) });
    if (nuovoComune !== cfg.comune) { cfg.comune = nuovoComune; plan = LS.get('plan_' + cfg.comune, null); giorno = LS.get('giorno_' + cfg.comune, 0); prog = LS.get('prog_' + cfg.comune, {}); giroAttivo = LS.get('giro_' + cfg.comune, {}); }
    LS.set('cfg', cfg);
  }
  $('btnMenu').onclick = () => { riempiCfg(); apri('mImpostazioni'); };
  $('btnSalvaCfg').onclick = async () => {
    leggiCfg();
    try { const r = await api('ping'); LS.set('sheetUrl', r.sheet); toast('Collegamento riuscito ✓'); avviaDati(); }
    catch (e) { toast('Collegamento non riuscito: ' + e.message, 6000); }
  };
  $('btnFoglio').onclick = () => { const u = LS.get('sheetUrl', ''); if (u) window.open(u, '_blank'); else toast('Prima salva il collegamento'); };
  $('btnCalcola').onclick = async () => {
    leggiCfg();
    const reg = $('registro'), btn = $('btnCalcola'); reg.style.display = 'block'; reg.textContent = ''; btn.disabled = true;
    const log = m => { reg.textContent += m + '\n'; reg.scrollTop = 1e9; };
    try {
      const p = await Planner.plan(cfg.comune, cfg.giorni, log);
      plan = p; giorno = 0; prog = {}; giroAttivo = {};
      LS.set('plan_' + cfg.comune, plan); LS.set('giorno_' + cfg.comune, 0); LS.set('prog_' + cfg.comune, {}); LS.set('giro_' + cfg.comune, {});
      p.plan.forEach(g => log(`Giorno ${g.day} – ${g.name}: ${km(g.km * 1000)} km, ~${g.ore} ore, ${g.loops.length} giri, ${g.carStops.length} soste in macchina`));
      try { await api('saveRoutes', { comune: cfg.comune, plan: p }); log('Percorsi salvati anche su Google Drive ✓'); } catch (e) { log('Percorsi salvati solo su questo telefono (' + e.message + ')'); }
      disegnaPercorso(true);
    } catch (e) { log('ERRORE: ' + e.message); }
    finally { btn.disabled = false; }
  };

  // ---------- avvio ----------
  async function avviaDati() {
    if (!plan && cfg.url) { try { plan = await api('getRoutes', { comune: cfg.comune }); if (plan) LS.set('plan_' + cfg.comune, plan); } catch (e) { } }
    disegnaPercorso(true); caricaTraccia(); caricaCase(); inviaTraccia();
  }
  disegnaPercorso(true);
  avviaGps(); tieniAcceso();
  if (!cfg.url || !cfg.key) { riempiCfg(); apri('mImpostazioni'); } else avviaDati();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
