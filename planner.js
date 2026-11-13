/* planner.js v5 — rete stradale di un comune, di un quartiere o di una zona disegnata, e percorsi a piedi calcolati dal vivo.
   Dati: OpenStreetMap (Overpass), scaricati una volta per comune e salvati sul telefono.
   Ogni strada con case è divisa in pezzi da 25 m: un pezzo diventa "visto" quando ci si passa a piedi.
   Il percorso parte sempre dalla posizione attuale e copre le strade non ancora viste più vicine,
   nel tempo disponibile, tornando alla macchina (problema del postino rurale, euristico). */
(function (global) {
  'use strict';
  const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
  const ROAD_RE = '^(primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|pedestrian|service|track|footway|path|steps|cycleway)$';
  const CONNECTOR_ONLY = /^(footway|path|steps|cycleway)$/; // percorribili ma non "da vedere"
  const HOUSE_DIST = 40;   // m: una strada "ha case" se c'è un edificio entro questa distanza
  const WALK_KMH = 3.0;    // km/h sulle strade da guardare
  const FAST_KMH = 4.5;    // km/h su collegamenti e tratti già visti
  const SEG = 25;          // m: lunghezza dei pezzi di strada
  const NOT_HOME = /^(industrial|warehouse|commercial|retail|office|shed|roof|church|chapel|cathedral|ruins|school|kindergarten|university|train_station|carport|garage|garages|barn|stable|cowshed|greenhouse|farm_auxiliary|service|transformer_tower|tower|clock_tower|hangar|supermarket|construction|silo|storage_tank|bunker|toilets|hospital|sports_hall|grandstand|cemetery|parking)$/;
  const MAX_HOUSE_BBOX = 2500; // m²: ingombri più grandi = quasi sempre capannoni
  const STUB = 50;         // m: vicoli ciechi più corti si guardano dall'imbocco
  const CLUSTER_GAP = 200; // m: case più vicine di così fanno parte dello stesso gruppo
  const MIN_CLUSTER = 300; // m di strade con case: sotto = casa isolata, da vedere in macchina
  const MAX_LINK = 400;    // m: oltre questa distanza a piedi tra due gruppi conviene spostare la macchina
  const GIORNO0 = 19000;   // i giorni si contano da qui (1/1/2022), 0 = mai visto

  const oggi = () => Math.floor(Date.now() / 864e5) - GIORNO0;

  // ---------- scaricamento ----------
  async function overpass(q, log, giri = 4) {
    let lastErr;
    for (let round = 0; round < giri; round++) {
      for (const url of OVERPASS) {
        try {
          const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 150000);
          const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), signal: ctl.signal }).finally(() => clearTimeout(timer));
          if (r.ok) {
            const j = await r.json();
            if (!j.remark || !/error|timeout|out of memory|runtime/i.test(j.remark)) return j;
            lastErr = new Error('Server mappe sovraccarico');
          } else lastErr = new Error('Server mappe: errore ' + r.status);
        } catch (e) { lastErr = e; }
      }
      if (round === giri - 1) break;
      const wait = 15 * Math.pow(2, round);
      log('Server mappe occupati, riprovo tra ' + wait + ' secondi…');
      await new Promise(r => setTimeout(r, wait * 1000));
    }
    throw lastErr || new Error('Server mappe non raggiungibili');
  }

  // nome del comune in cui si trova un punto
  async function trovaComune(lat, lon) {
    const j = await overpass(`[out:json][timeout:25];is_in(${(+lat).toFixed(6)},${(+lon).toFixed(6)})->.a;area.a["boundary"="administrative"]["admin_level"="8"];out tags;`, () => { }, 2);
    const a = (j.elements || []).find(e => e.tags && e.tags.name);
    return a ? a.tags.name : null;
  }

  // comune e (se c'è sulle mappe) quartiere in cui si trova un punto
  async function trovaAree(lat, lon) {
    const j = await overpass(`[out:json][timeout:25];is_in(${(+lat).toFixed(6)},${(+lon).toFixed(6)})->.a;(area.a["boundary"="administrative"]["admin_level"~"^(8|9|10)$"];area.a["place"~"^(suburb|quarter|neighbourhood)$"];);out tags;`, () => { }, 2);
    const el = (j.elements || []).filter(e => e.tags && e.tags.name);
    const com = el.find(e => e.tags.admin_level === '8');
    const sub = el.filter(e => e.tags.admin_level !== '8').sort((a, b) => (+a.tags.admin_level || 11) - (+b.tags.admin_level || 11))[0];
    return { comune: com ? com.tags.name : null, quartiere: sub ? sub.tags.name : null };
  }
  // nomi dei quartieri di una città (confini amministrativi o zone "place" disegnate sulle mappe)
  async function quartieri(citta) {
    const c = citta.replace(/"/g, '\\"');
    const j = await overpass(`[out:json][timeout:60];area["boundary"="administrative"]["admin_level"="8"]["name"="${c}"]->.c;(rel(area.c)["boundary"="administrative"]["admin_level"~"^(9|10)$"];rel(area.c)["place"~"^(suburb|quarter|neighbourhood)$"];way(area.c)["place"~"^(suburb|quarter|neighbourhood)$"];);out tags;`, () => { }, 2);
    return [...new Set((j.elements || []).map(e => e.tags && e.tags.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
  }
  // confine di un quartiere come poligono [[lat, lon], ...]
  async function confineQuartiere(citta, nome, log = () => { }) {
    const c = citta.replace(/"/g, '\\"'), n = nome.replace(/"/g, '\\"');
    log('Cerco il confine di ' + nome + '…');
    const j = await overpass(`[out:json][timeout:90];area["boundary"="administrative"]["admin_level"="8"]["name"="${c}"]->.c;(rel(area.c)["name"="${n}"]["boundary"="administrative"];rel(area.c)["name"="${n}"]["place"];way(area.c)["name"="${n}"]["place"];);out geom;`, log);
    let best = null;
    for (const e of j.elements || []) {
      let anelli = [];
      if (e.type === 'way' && e.geometry) anelli = [e.geometry.map(p => [p.lat, p.lon])];
      else if (e.type === 'relation') anelli = unisciAnelli((e.members || []).filter(m => m.type === 'way' && m.geometry && m.role !== 'inner').map(m => m.geometry.map(p => [p.lat, p.lon])));
      for (const a of anelli) if (a.length >= 4 && (!best || areaKm2(a) > areaKm2(best))) best = a;
    }
    if (!best) throw new Error('Quartiere "' + nome + '" non trovato sulle mappe di ' + citta + ': disegnalo tu sulla mappa');
    return semplifica(best, 8);
  }
  // confine di un comune: uno o più anelli [[lat, lon], ...] (alcuni comuni hanno pezzi staccati)
  async function confineComune(nome, log = () => { }) {
    const c = nome.replace(/"/g, '\\"');
    const j = await overpass(`[out:json][timeout:90];rel["boundary"="administrative"]["admin_level"="8"]["name"="${c}"];out geom;`, log, 2);
    return anelliDa(j.elements || []);
  }
  function anelliDa(elementi) {
    let anelli = [];
    for (const e of elementi) {
      if (e.type !== 'relation') continue;
      anelli = anelli.concat(unisciAnelli((e.members || []).filter(m => m.type === 'way' && m.geometry && m.role !== 'inner').map(m => m.geometry.map(p => [p.lat, p.lon]))));
    }
    anelli = anelli.filter(a => a.length >= 4).sort((a, b) => areaKm2(b) - areaKm2(a));
    if (!anelli.length) throw new Error('Confine non trovato');
    const grande = areaKm2(anelli[0]);
    return anelli.filter((a, i) => i === 0 || areaKm2(a) > Math.max(0.02, grande * 0.002)).slice(0, 8).map(a => semplifica(a, 10));
  }
  // involucro convesso dei punti: confine di riserva finché non arriva quello vero
  function involucro(pts) {
    const p = pts.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    if (p.length < 3) return p;
    const cross = (o, a, b) => (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1]);
    const lo = [], hi = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  // unisce i pezzi di confine in anelli chiusi
  function unisciAnelli(pezzi) {
    const ug = (a, b) => Math.abs(a[0] - b[0]) < 1e-7 && Math.abs(a[1] - b[1]) < 1e-7;
    const resto = pezzi.filter(p => p.length > 1).map(p => p.slice()), out = [];
    while (resto.length) {
      let a = resto.shift(), cambiato = true;
      while (cambiato && !(a.length > 3 && ug(a[0], a[a.length - 1]))) {
        cambiato = false;
        for (let i = 0; i < resto.length; i++) {
          const s = resto[i], fine = a[a.length - 1];
          if (ug(fine, s[0])) a = a.concat(s.slice(1));
          else if (ug(fine, s[s.length - 1])) a = a.concat(s.slice().reverse().slice(1));
          else if (ug(a[0], s[s.length - 1])) a = s.slice(0, -1).concat(a);
          else if (ug(a[0], s[0])) a = s.slice().reverse().slice(0, -1).concat(a);
          else continue;
          resto.splice(i, 1); cambiato = true; break;
        }
      }
      out.push(a);
    }
    return out;
  }
  // geometria dei poligoni (in gradi, con conversione locale in metri)
  const kxDi = lat => 111320 * Math.cos(lat * Math.PI / 180);
  function areaKm2(poly) {
    const k = kxDi(poly[0][0]); let s = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) s += (poly[j][1] * k) * (poly[i][0] * 110540) - (poly[i][1] * k) * (poly[j][0] * 110540);
    return Math.abs(s / 2) / 1e6;
  }
  function dentroPoligono(poly, lat, lon) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[0] > lat) !== (b[0] > lat) && lon < (b[1] - a[1]) * (lat - a[0]) / (b[0] - a[0]) + a[1]) c = !c; }
    return c;
  }
  // Douglas-Peucker: meno punti, stessa forma (toll in metri)
  function semplifica(poly, toll = 8) {
    const k = kxDi(poly[0][0]), P = poly.map(p => [p[1] * k, p[0] * 110540]);
    if (P.length < 5) return poly.map(p => [+p[0].toFixed(6), +p[1].toFixed(6)]);
    const tieni = new Uint8Array(P.length); tieni[0] = tieni[P.length - 1] = 1;
    const st = [[0, P.length - 1]];
    while (st.length) {
      const [i, j] = st.pop(); let md = 0, mi = -1;
      for (let q = i + 1; q < j; q++) { const d = distSeg(P[q][0], P[q][1], P[i][0], P[i][1], P[j][0], P[j][1]); if (d > md) { md = d; mi = q; } }
      if (md > toll && mi > 0) { tieni[mi] = 1; st.push([i, mi], [mi, j]); }
    }
    let out = poly.filter((_, i) => tieni[i]).map(p => [+p[0].toFixed(6), +p[1].toFixed(6)]);
    if (out.length > 400) return semplifica(poly, toll * 2);
    return out;
  }
  const polyOSM = poly => poly.map(p => p[0].toFixed(5) + ' ' + p[1].toFixed(5)).join(' ');

  // spec: { poly: [[lat, lon], ...] } per un quartiere o una zona disegnata; altrimenti il comune con quel nome
  async function scaricaOSM(comune, log, spec) {
    const extraQ = sel => `[out:json][timeout:180];${sel}(way${'%'}["building"];relation${'%'}["building"];node${'%'}["place"~"^(town|village|suburb|hamlet|neighbourhood)$"];nwr${'%'}["amenity"="parking"];node${'%'}["addr:housenumber"];);out bb;`;
    if (spec && spec.poly && spec.poly.length >= 3) {
      const f = `(poly:"${polyOSM(spec.poly)}")`;
      log('Scarico le strade di ' + comune + '…');
      const roads = await overpass(`[out:json][timeout:180];way${f}["highway"~"${ROAD_RE}"];out body;>;out skel qt;`, log);
      if (!roads.elements.length) throw new Error('Nessuna strada dentro la zona: allargala un po\'');
      log('Scarico case, frazioni e parcheggi…');
      const extra = await overpass(extraQ('').split('%').join(f), log);
      return { roads, extra };
    }
    const nome = comune.replace(/"/g, '\\"');
    const area = `area["boundary"="administrative"]["admin_level"="8"]["name"="${nome}"]->.a;`;
    log('Scarico le strade di ' + comune + '…');
    let roads = await overpass(`[out:json][timeout:180];${area}way(area.a)["highway"~"${ROAD_RE}"];out body;>;out skel qt;`, log);
    if (roads.elements.length) {
      log('Scarico case, frazioni e parcheggi…');
      const extra = await overpass(extraQ(area).replace(/%/g, '(area.a)'), log);
      return { roads, extra };
    }
    // Piano B: la "zona" del comune a volte manca nell'archivio del server anche se il confine esiste.
    log('Cerco il confine del comune in un altro modo…');
    const rel = await overpass(`[out:json][timeout:120];rel["boundary"="administrative"]["admin_level"="8"]["name"="${nome}"];out geom;`, log);
    const r = rel.elements.find(e => e.type === 'relation' && e.bounds);
    if (!r) throw new Error('Comune "' + comune + '" non trovato sulle mappe: controlla che il nome sia scritto come quello ufficiale');
    const segs = [];
    for (const mb of r.members || []) if (mb.type === 'way' && mb.geometry) for (let i = 1; i < mb.geometry.length; i++) segs.push([mb.geometry[i - 1], mb.geometry[i]]);
    const dentro = (lat, lon) => { let c = false; for (const [p, q] of segs) if ((p.lat > lat) !== (q.lat > lat) && lon < (q.lon - p.lon) * (lat - p.lat) / (q.lat - p.lat) + p.lon) c = !c; return c; };
    const B = r.bounds, bb = `(${B.minlat},${B.minlon},${B.maxlat},${B.maxlon})`;
    log('Scarico le strade di ' + comune + '…');
    roads = await overpass(`[out:json][timeout:180];way["highway"~"${ROAD_RE}"]${bb};out body;>;out skel qt;`, log);
    log('Scarico case, frazioni e parcheggi…');
    const extra = await overpass(extraQ('').replace(/%/g, bb), log);
    const nodi = new Map(); for (const e of roads.elements) if (e.type === 'node') nodi.set(e.id, e);
    const vie = roads.elements.filter(e => e.type === 'way' && e.nodes.some(id => { const n = nodi.get(id); return n && dentro(n.lat, n.lon); }));
    const usati = new Set(vie.flatMap(w => w.nodes));
    roads = { elements: [...vie, ...roads.elements.filter(e => e.type === 'node' && usati.has(e.id))] };
    extra.elements = extra.elements.filter(e => { const lat = e.lat != null ? e.lat : e.bounds && (e.bounds.minlat + e.bounds.maxlat) / 2, lon = e.lon != null ? e.lon : e.bounds && (e.bounds.minlon + e.bounds.maxlon) / 2; return lat != null && dentro(lat, lon); });
    if (!vie.length) throw new Error('Le mappe sono arrivate vuote: i server sono probabilmente occupati. Riprova tra qualche minuto');
    return { roads, extra };
  }

  // ---------- costruzione della rete (da OSM a dati compatti da salvare) ----------
  function costruisciRete(osm, comune, poly) {
    const idx = new Map(), LAT = [], LON = [];
    for (const el of osm.roads.elements) if (el.type === 'node') { idx.set(el.id, LAT.length); LAT.push(el.lat); LON.push(el.lon); }
    if (!LAT.length) throw new Error('Nessuna strada trovata');
    const lat0 = LAT.reduce((a, b) => a + b, 0) / LAT.length;
    const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
    const X = LON.map(v => v * kx), Y = LAT.map(v => v * ky);

    const grid = new Map(), cs = 50, gk = (x, y) => Math.floor(x / cs) + ',' + Math.floor(y / cs);
    const luoghi = [], parcheggi = [], civici = [];
    for (const el of osm.extra.elements) {
      const b = el.bounds;
      const lat = el.lat != null ? el.lat : b ? (b.minlat + b.maxlat) / 2 : el.center && el.center.lat;
      const lon = el.lon != null ? el.lon : b ? (b.minlon + b.maxlon) / 2 : el.center && el.center.lon;
      if (lat == null) continue;
      const t = el.tags || {}, x = lon * kx, y = lat * ky;
      if (t['addr:housenumber'] && t['addr:street']) civici.push([+lat.toFixed(6), +lon.toFixed(6), t['addr:street'], t['addr:housenumber']]);
      if (t.building) {
        if (NOT_HOME.test(t.building) || t.amenity || t.shop || t.industrial) continue;
        if (b && (b.maxlon - b.minlon) * kx * (b.maxlat - b.minlat) * ky > MAX_HOUSE_BBOX) continue;
        const k = gk(x, y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(x, y);
      }
      else if (t.place) luoghi.push({ nome: t.name || t.place, borgo: t.place === 'hamlet' || t.place === 'neighbourhood', lat: +lat.toFixed(5), lon: +lon.toFixed(5) });
      else if (t.amenity === 'parking' && t.access !== 'private' && t.access !== 'customers') parcheggi.push({ lat: +lat.toFixed(5), lon: +lon.toFixed(5), nome: t.name || '' });
    }
    const r2 = HOUSE_DIST * HOUSE_DIST;
    function nearHouse(x, y) {
      const cx = Math.floor(x / cs), cy = Math.floor(y / cs);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const a = grid.get((cx + i) + ',' + (cy + j)); if (!a) continue;
        for (let q = 0; q < a.length; q += 2) if ((a[q] - x) ** 2 + (a[q + 1] - y) ** 2 < r2) return true;
      }
      return false;
    }

    // pezzi da ~25 m
    const EU = [], EV = [], EL = [], ER = [], EN = [], NOMI = [''], nameIdx = new Map([['', 0]]);
    const GENERIC = { footway: 'sentiero', path: 'sentiero', steps: 'scalinata', cycleway: 'pista ciclabile', track: 'strada sterrata', service: 'stradina', pedestrian: 'zona pedonale' };
    for (const w of osm.roads.elements) {
      if (w.type !== 'way') continue;
      const t = w.tags || {}, hw = t.highway;
      if (hw === 'service' && t.service && t.service !== 'alley') continue;
      if (t.access === 'private' || t.access === 'no' || t.foot === 'no') continue;
      const conn = CONNECTOR_ONLY.test(hw);
      const nm = t.name || (t.ref ? 'strada ' + t.ref : '') || GENERIC[hw] || 'strada senza nome';
      if (!nameIdx.has(nm)) { nameIdx.set(nm, NOMI.length); NOMI.push(nm); }
      const ni = nameIdx.get(nm);
      for (let i = 1; i < w.nodes.length; i++) {
        const a = idx.get(w.nodes[i - 1]), b = idx.get(w.nodes[i]);
        if (a == null || b == null || a === b) continue;
        const len = Math.hypot(X[b] - X[a], Y[b] - Y[a]), s = Math.max(1, Math.ceil(len / SEG));
        let prev = a;
        for (let q = 1; q <= s; q++) {
          let cur = b;
          if (q < s) { const f = q / s; cur = X.length; X.push(X[a] + (X[b] - X[a]) * f); Y.push(Y[a] + (Y[b] - Y[a]) * f); LAT.push(LAT[a] + (LAT[b] - LAT[a]) * f); LON.push(LON[a] + (LON[b] - LON[a]) * f); }
          // in una zona disegnata o in un quartiere, le strade appena fuori servono solo per passare
          const dentro = !poly || dentroPoligono(poly, (LAT[prev] + LAT[cur]) / 2, (LON[prev] + LON[cur]) / 2);
          EU.push(prev); EV.push(cur); EL.push(len / s); ER.push(!conn && dentro && nearHouse((X[prev] + X[cur]) / 2, (Y[prev] + Y[cur]) / 2)); EN.push(ni);
          prev = cur;
        }
      }
    }
    let n = X.length, m = EU.length;
    const csr = (n, m, EU, EV) => {
      const deg = new Int32Array(n); for (let e = 0; e < m; e++) { deg[EU[e]]++; deg[EV[e]]++; }
      const start = new Int32Array(n + 1); for (let i = 0; i < n; i++) start[i + 1] = start[i] + deg[i];
      const fill = start.slice(0, n), adj = new Int32Array(2 * m);
      for (let e = 0; e < m; e++) { adj[fill[EU[e]]++] = e; adj[fill[EV[e]]++] = e; }
      return { deg, start, adj };
    };
    let { deg, start, adj } = csr(n, m, EU, EV);
    // componente connessa principale
    const comp = new Int32Array(n).fill(-1); let best = -1, bestSize = 0, c = 0;
    for (let s = 0; s < n; s++) {
      if (comp[s] !== -1 || deg[s] === 0) continue;
      let size = 0; const st = [s]; comp[s] = c;
      while (st.length) { const v = st.pop(); size++; for (let p = start[v]; p < start[v + 1]; p++) { const e = adj[p], u = EU[e] === v ? EV[e] : EU[e]; if (comp[u] === -1) { comp[u] = c; st.push(u); } } }
      if (size > bestSize) { bestSize = size; best = c; }
      c++;
    }
    // rami ad albero (vicoli ciechi)
    const tree = new Uint8Array(m), d2 = deg.slice(), removed = new Uint8Array(m), q = [];
    for (let i = 0; i < n; i++) if (d2[i] === 1) q.push(i);
    while (q.length) {
      const v = q.pop(); if (d2[v] !== 1) continue;
      for (let p = start[v]; p < start[v + 1]; p++) { const e = adj[p]; if (removed[e]) continue; removed[e] = 1; tree[e] = 1; d2[v]--; const u = EU[e] === v ? EV[e] : EU[e]; d2[u]--; if (d2[u] === 1) q.push(u); break; }
    }
    // vicoli ciechi corti: si guardano dall'imbocco
    const depth = new Float64Array(n).fill(Infinity), dq = [];
    for (let i = 0; i < n; i++) if (d2[i] >= 2) { depth[i] = 0; dq.push(i); }
    for (let qi = 0; qi < dq.length; qi++) { const v = dq[qi]; for (let p = start[v]; p < start[v + 1]; p++) { const e = adj[p]; if (!tree[e]) continue; const u = EU[e] === v ? EV[e] : EU[e]; if (depth[u] === Infinity) { depth[u] = depth[v] + EL[e]; dq.push(u); } } }
    for (let e = 0; e < m; e++) if (ER[e] && tree[e] && Math.max(depth[EU[e]], depth[EV[e]]) <= STUB) ER[e] = false;
    // gruppi di case: i gruppi piccoli (cascine isolate) si vedono in macchina
    const uf = new Int32Array(n); for (let i = 0; i < n; i++) uf[i] = i;
    const f2 = a => { while (uf[a] !== a) { uf[a] = uf[uf[a]]; a = uf[a]; } return a; };
    const un = (a, b) => { a = f2(a); b = f2(b); if (a !== b) uf[a] = b; };
    const reqNodes = new Set();
    for (let e = 0; e < m; e++) if (ER[e] && comp[EU[e]] === best) { un(EU[e], EV[e]); reqNodes.add(EU[e]); reqNodes.add(EV[e]); }
    const g2 = new Map(), k2 = (x, y) => Math.floor(x / CLUSTER_GAP) + ',' + Math.floor(y / CLUSTER_GAP);
    for (const v of reqNodes) { const k = k2(X[v], Y[v]); if (!g2.has(k)) g2.set(k, []); g2.get(k).push(v); }
    for (const v of reqNodes) {
      const cx = Math.floor(X[v] / CLUSTER_GAP), cy = Math.floor(Y[v] / CLUSTER_GAP);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const u of (g2.get((cx + i) + ',' + (cy + j)) || []))
        if (u !== v && (X[u] - X[v]) ** 2 + (Y[u] - Y[v]) ** 2 < CLUSTER_GAP * CLUSTER_GAP) un(u, v);
    }
    const clLen = new Map();
    for (let e = 0; e < m; e++) if (ER[e] && comp[EU[e]] === best) { const r = f2(EU[e]); clLen.set(r, (clLen.get(r) || 0) + EL[e]); }
    const small = new Map();
    for (let e = 0; e < m; e++) {
      if (!ER[e]) continue;
      if (comp[EU[e]] !== best) { ER[e] = false; continue; }
      const r = f2(EU[e]);
      if (clLen.get(r) < MIN_CLUSTER) { ER[e] = false; if (!small.has(r)) small.set(r, []); small.get(r).push(e); }
    }
    const isolate = [];
    for (const es of small.values()) {
      let sx = 0, sy = 0, sl = 0; for (const e of es) { sx += (X[EU[e]] + X[EV[e]]) / 2 * EL[e]; sy += (Y[EU[e]] + Y[EV[e]]) / 2 * EL[e]; sl += EL[e]; }
      isolate.push({ lat: +(sy / sl / ky).toFixed(5), lon: +(sx / sl / kx).toFixed(5), m: Math.round(sl) });
    }
    // potatura: solo la rete principale, senza i rami ciechi che non portano a case
    const keepE = new Uint8Array(m); for (let e = 0; e < m; e++) keepE[e] = comp[EU[e]] === best ? 1 : 0;
    const d3 = new Int32Array(n); for (let e = 0; e < m; e++) if (keepE[e]) { d3[EU[e]]++; d3[EV[e]]++; }
    const pq = []; for (let i = 0; i < n; i++) if (d3[i] === 1) pq.push(i);
    while (pq.length) {
      const v = pq.pop(); if (d3[v] !== 1) continue;
      for (let p = start[v]; p < start[v + 1]; p++) {
        const e = adj[p]; if (!keepE[e]) continue;
        if (ER[e]) break; // ramo con case: resta
        keepE[e] = 0; d3[v]--; const u = EU[e] === v ? EV[e] : EU[e]; d3[u]--; if (d3[u] === 1) pq.push(u); break;
      }
    }
    const nuovo = new Int32Array(n).fill(-1), lat = [], lon = [];
    const eu = [], ev = [], el = [], er = [], en = [];
    for (let e = 0; e < m; e++) {
      if (!keepE[e]) continue;
      for (const v of [EU[e], EV[e]]) if (nuovo[v] < 0) { nuovo[v] = lat.length; lat.push(+LAT[v].toFixed(6)); lon.push(+LON[v].toFixed(6)); }
      eu.push(nuovo[EU[e]]); ev.push(nuovo[EV[e]]); el.push(Math.round(EL[e] * 10) / 10); er.push(ER[e] ? '1' : '0'); en.push(EN[e]);
    }
    if (!er.includes('1')) throw new Error('Le mappe sono arrivate incomplete (nessuna casa trovata). Riprova tra qualche minuto');
    return { v: 4, id: Date.now().toString(36), comune, creata: new Date().toISOString(), lat, lon, eu, ev, el, er: er.join(''), en, nomi: NOMI, luoghi, parcheggi, isolate, civici, poly: poly || null };
  }

  // ---------- rete pronta per i calcoli ----------
  function prepara(R) {
    const n = R.lat.length, m = R.eu.length;
    const lat0 = R.lat.reduce((a, b) => a + b, 0) / n;
    const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
    const X = new Float64Array(n), Y = new Float64Array(n);
    for (let i = 0; i < n; i++) { X[i] = R.lon[i] * kx; Y[i] = R.lat[i] * ky; }
    const EU = Int32Array.from(R.eu), EV = Int32Array.from(R.ev), EL = Float64Array.from(R.el), EN = Int32Array.from(R.en);
    const ER = new Uint8Array(m); for (let e = 0; e < m; e++) ER[e] = R.er.charCodeAt(e) === 49 ? 1 : 0;
    const deg = new Int32Array(n); for (let e = 0; e < m; e++) { deg[EU[e]]++; deg[EV[e]]++; }
    const start = new Int32Array(n + 1); for (let i = 0; i < n; i++) start[i + 1] = start[i] + deg[i];
    const fill = start.slice(0, n), adj = new Int32Array(2 * m);
    for (let e = 0; e < m; e++) { adj[fill[EU[e]]++] = e; adj[fill[EV[e]]++] = e; }
    // griglie: nodi (per agganciare una posizione) e pezzi con case (per segnarli visti)
    const CS = 60, gN = new Map(), gE = new Map(), key = (x, y) => Math.floor(x / CS) + ',' + Math.floor(y / CS);
    for (let i = 0; i < n; i++) { const k = key(X[i], Y[i]); let a = gN.get(k); if (!a) gN.set(k, a = []); a.push(i); }
    const gA = new Map(); // tutti i pezzi (anche senza case): per il segno delle strade percorse
    for (let e = 0; e < m; e++) {
      const k = key((X[EU[e]] + X[EV[e]]) / 2, (Y[EU[e]] + Y[EV[e]]) / 2);
      let b = gA.get(k); if (!b) gA.set(k, b = []); b.push(e);
      if (ER[e]) { let a = gE.get(k); if (!a) gE.set(k, a = []); a.push(e); }
    }
    let reqTot = 0; for (let e = 0; e < m; e++) if (ER[e]) reqTot += EL[e];
    // tratti: pezzi di strada tra due incroci (si sceglie sempre un tratto intero, così non si torna indietro a metà via)
    const tp = new Int32Array(m); for (let e = 0; e < m; e++) tp[e] = e;
    const tf = a => { while (tp[a] !== a) { tp[a] = tp[tp[a]]; a = tp[a]; } return a; };
    for (let v = 0; v < n; v++) if (deg[v] === 2) { const a = tf(adj[start[v]]), b = tf(adj[start[v] + 1]); if (a !== b) tp[a] = b; }
    const T = new Int32Array(m), tid = new Map(); for (let e = 0; e < m; e++) { const r = tf(e); if (!tid.has(r)) tid.set(r, tid.size); T[e] = tid.get(r); }
    const nt = tid.size, tStart = new Int32Array(nt + 1); for (let e = 0; e < m; e++) tStart[T[e] + 1]++;
    for (let i = 0; i < nt; i++) tStart[i + 1] += tStart[i];
    const tFill = tStart.slice(0, nt), tEdges = new Int32Array(m); for (let e = 0; e < m; e++) tEdges[tFill[T[e]]++] = e;
    const luoghi = (R.luoghi || []).map(p => ({ ...p, x: p.lon * kx, y: p.lat * ky }));
    return { R, id: R.id, comune: R.comune, n, m, X, Y, kx, ky, EU, EV, EL, ER, EN, NOMI: R.nomi, start, adj, CS, gN, gE, gA, reqTot, luoghi, T, nt, tStart, tEdges };
  }

  const xy = (G, lat, lon) => [lon * G.kx, lat * G.ky];
  function nodoVicino(G, lat, lon, maxM = Infinity) {
    const [x, y] = xy(G, lat, lon), cx = Math.floor(x / G.CS), cy = Math.floor(y / G.CS);
    let best = -1, bd = Infinity;
    const cella = (i, j) => { for (const v of (G.gN.get((cx + i) + ',' + (cy + j)) || [])) { const d = (G.X[v] - x) ** 2 + (G.Y[v] - y) ** 2; if (d < bd) { bd = d; best = v; } } };
    for (let r = 0; r <= 40; r++) {
      if (r === 0) cella(0, 0);
      else for (let i = -r; i <= r; i++) { cella(i, -r); cella(i, r); if (i > -r && i < r) { cella(-r, i); cella(r, i); } }
      if (best >= 0 && Math.sqrt(bd) <= r * G.CS) break;
      if (r * G.CS > maxM) break;
    }
    if (best < 0 && maxM === Infinity) for (let v = 0; v < G.n; v++) { const d = (G.X[v] - x) ** 2 + (G.Y[v] - y) ** 2; if (d < bd) { bd = d; best = v; } }
    return Math.sqrt(bd) <= maxM ? best : -1;
  }
  const distNodo = (G, v, lat, lon) => { const [x, y] = xy(G, lat, lon); return Math.hypot(G.X[v] - x, G.Y[v] - y); };
  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  }

  // un pezzo è "da vedere" se ha case e non è mai stato visto (o è stato visto più di `rivedi` giorni fa)
  const daVedereFn = (G, visti, rivedi) => { const o = oggi(); return e => G.ER[e] === 1 && (visti[e] === 0 || (rivedi > 0 && o - visti[e] > rivedi)); };

  // segna come visti i pezzi con case entro `raggio` metri dal punto; restituisce quanti ne ha segnati
  function copri(G, visti, lat, lon, raggio = 20, giorno = oggi()) {
    const [x, y] = xy(G, lat, lon), cx = Math.floor(x / G.CS), cy = Math.floor(y / G.CS), o = giorno;
    let nuovi = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const e of (G.gE.get((cx + i) + ',' + (cy + j)) || [])) {
      if (visti[e] >= o) continue;
      const a = G.EU[e], b = G.EV[e];
      if (distSeg(x, y, G.X[a], G.Y[a], G.X[b], G.Y[b]) <= raggio) { if (visti[e] === 0) nuovi++; visti[e] = o; }
    }
    return nuovi;
  }
  // stessa cosa lungo il tratto tra due posizioni (riempie i buchi tra un segnale GPS e l'altro)
  function copriTratto(G, visti, a, b, raggio = 20, tutti = false) {
    const d = Math.hypot((b[1] - a[1]) * G.kx, (b[0] - a[0]) * G.ky), passi = Math.max(1, Math.ceil(d / 10)), f0 = tutti ? segna : copri;
    let nuovi = 0;
    for (let i = 1; i <= passi; i++) { const f = i / passi; nuovi += f0(G, visti, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, raggio); }
    return nuovi;
  }
  // segno delle strade percorse (tutte, anche senza case): giorno dell'ultimo passaggio. Restituisce quanti pezzi sono cambiati
  function segna(G, arr, lat, lon, raggio = 15, giorno = oggi()) {
    const [x, y] = xy(G, lat, lon), cx = Math.floor(x / G.CS), cy = Math.floor(y / G.CS);
    let n = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const e of (G.gA.get((cx + i) + ',' + (cy + j)) || [])) {
      if (arr[e] >= giorno) continue;
      const a = G.EU[e], b = G.EV[e];
      if (distSeg(x, y, G.X[a], G.Y[a], G.X[b], G.Y[b]) <= raggio) { arr[e] = giorno; n++; }
    }
    return n;
  }
  const segnaTratto = (G, arr, a, b, raggio = 15) => copriTratto(G, arr, a, b, raggio, true);

  // ---------- Dijkstra (heap binario) ----------
  function dijkstra(G, sources, stopFn, maxDist = Infinity) {
    const dist = new Float64Array(G.n).fill(Infinity), pred = new Int32Array(G.n).fill(-1), done = new Uint8Array(G.n);
    const hk = [], hv = [];
    const push = (k, v) => { let i = hk.length; hk.push(k); hv.push(v); while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= hk[i]) break; [hk[p], hk[i]] = [hk[i], hk[p]]; [hv[p], hv[i]] = [hv[i], hv[p]]; i = p; } };
    const pop = () => { const v = hv[0], k = hk[0], lk = hk.pop(), lv = hv.pop(); if (hk.length) { hk[0] = lk; hv[0] = lv; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < hk.length && hk[l] < hk[s]) s = l; if (r < hk.length && hk[r] < hk[s]) s = r; if (s === i) break; [hk[s], hk[i]] = [hk[i], hk[s]]; [hv[s], hv[i]] = [hv[i], hv[s]]; i = s; } } return [k, v]; };
    for (const s of sources) { dist[s] = 0; push(0, s); }
    while (hk.length) {
      const [k, v] = pop(); if (done[v]) continue; done[v] = 1;
      if (k > maxDist) break;
      if (stopFn && stopFn(v)) return { dist, pred, last: v };
      for (let p = G.start[v]; p < G.start[v + 1]; p++) {
        const e = G.adj[p], u = G.EU[e] === v ? G.EV[e] : G.EU[e], nd = k + G.EL[e];
        if (nd < dist[u]) { dist[u] = nd; pred[u] = e; push(nd, u); }
      }
    }
    return { dist, pred, last: -1 };
  }
  function pathEdges(G, pred, to) { const out = []; let v = to; while (pred[v] !== -1) { const e = pred[v]; out.push(e); v = G.EU[e] === v ? G.EV[e] : G.EU[e]; } return out; }

  // ---------- giro (postino rurale) da s a t che percorre tutti i pezzi in `edges` ----------
  function giroSu(G, edges, s, t, daVedere) {
    const MU = [], MV = [], ML = [], MI = [];
    const addEdge = e => { MU.push(G.EU[e]); MV.push(G.EV[e]); ML.push(G.EL[e]); MI.push(e); };
    // 1) componenti delle strade scelte
    const parent = new Map(), find = a => { while (parent.get(a) !== a) { parent.set(a, parent.get(parent.get(a))); a = parent.get(a); } return a; };
    const touch = a => { if (!parent.has(a)) parent.set(a, a); };
    touch(s); touch(t);
    for (const e of edges) { touch(G.EU[e]); touch(G.EV[e]); const a = find(G.EU[e]), b = find(G.EV[e]); if (a !== b) parent.set(a, b); }
    const members = new Map();
    for (const v of parent.keys()) { const r = find(v); if (!members.has(r)) members.set(r, []); members.get(r).push(v); }
    // 2) albero minimo che le collega; il primo collegamento (da dove sei) e l'arrivo non hanno limiti
    const inTree = new Set(members.get(find(s)));
    const remaining = new Set([...members.keys()].filter(r => r !== find(s)));
    const rT = find(t);
    let primo = true;
    const collega = (stop, limite) => {
      const res = dijkstra(G, inTree, stop, limite);
      if (res.last === -1) return false;
      for (const e of pathEdges(G, res.pred, res.last)) { addEdge(e); inTree.add(G.EU[e]); inTree.add(G.EV[e]); }
      const r = find(res.last); remaining.delete(r); for (const v of members.get(r)) inTree.add(v);
      return true;
    };
    while (remaining.size) {
      if (!collega(v => !inTree.has(v) && parent.has(v) && remaining.has(find(v)), primo ? Infinity : MAX_LINK)) break;
      primo = false;
    }
    if (remaining.has(rT)) collega(v => !inTree.has(v) && parent.has(v) && find(v) === rT, Infinity);
    const usati = [];
    for (const e of edges) { if (!remaining.has(find(G.EU[e]))) { addEdge(e); usati.push(e); } }
    // 3) nodi da pareggiare: dispari, con s e t scambiati se il giro non torna al punto di partenza
    const deg = new Map(); for (let i = 0; i < MU.length; i++) { deg.set(MU[i], (deg.get(MU[i]) || 0) + 1); deg.set(MV[i], (deg.get(MV[i]) || 0) + 1); }
    if (s !== t) { deg.set(s, (deg.get(s) || 0) + 1); deg.set(t, (deg.get(t) || 0) + 1); }
    const odd = [...deg.keys()].filter(v => deg.get(v) % 2 === 1), oddSet = new Set(odd);
    const D = [], P = [];
    odd.forEach(src => { let found = 0; const res = dijkstra(G, [src], v => oddSet.has(v) && ++found >= odd.length, 3000); D.push(odd.map(x => res.dist[x])); P.push(res.pred); });
    const pairs = []; for (let i = 0; i < odd.length; i++) for (let j = i + 1; j < odd.length; j++) if (isFinite(D[i][j])) pairs.push([D[i][j], i, j]);
    pairs.sort((a, b) => a[0] - b[0]);
    const mate = new Int32Array(odd.length).fill(-1);
    for (const [, i, j] of pairs) if (mate[i] === -1 && mate[j] === -1) { mate[i] = j; mate[j] = i; }
    const lone = [...mate.keys()].filter(i => mate[i] === -1);
    for (const i of lone) { if (mate[i] !== -1) continue; const res = dijkstra(G, [odd[i]], null, Infinity); P[i] = res.pred; for (let j = 0; j < odd.length; j++) D[i][j] = res.dist[odd[j]]; let b = -1, bd = Infinity; for (const j of lone) if (j !== i && mate[j] === -1 && D[i][j] < bd) { bd = D[i][j]; b = j; } if (b >= 0) { mate[i] = b; mate[b] = i; } }
    const dd = (i, j) => Math.min(D[i][j], D[j][i]);
    for (let pass = 0, improved = true; pass < 20 && improved; pass++) {
      improved = false;
      for (let a = 0; a < odd.length; a++) for (let c = a + 1; c < odd.length; c++) {
        const b = mate[a], d = mate[c]; if (b === c || b < 0 || d < 0) continue;
        const now = dd(a, b) + dd(c, d);
        if (dd(a, c) + dd(b, d) < now - 1) { mate[a] = c; mate[c] = a; mate[b] = d; mate[d] = b; improved = true; }
        else if (dd(a, d) + dd(b, c) < now - 1) { mate[a] = d; mate[d] = a; mate[b] = c; mate[c] = b; improved = true; }
      }
    }
    for (let i = 0; i < odd.length; i++) {
      const j = mate[i]; if (j < i) continue;
      let src = i, dst = j; if (!isFinite(D[i][j])) { src = j; dst = i; }
      if (!isFinite(D[src][dst])) { const res = dijkstra(G, [odd[src]], null, Infinity); P[src] = res.pred; }
      for (const e of pathEdges(G, P[src], odd[dst])) addEdge(e);
    }
    // 4) percorso euleriano (Hierholzer) da s
    const nbr = new Map(); for (let i = 0; i < MU.length; i++) { for (const v of [MU[i], MV[i]]) { if (!nbr.has(v)) nbr.set(v, []); nbr.get(v).push(i); } }
    const used = new Uint8Array(MU.length), ptr = new Map(), stack = [s], estack = [-1], path = [], pathE = [];
    while (stack.length) {
      const v = stack[stack.length - 1], list = nbr.get(v) || []; let p = ptr.get(v) || 0;
      while (p < list.length && used[list[p]]) p++;
      ptr.set(v, p);
      if (p === list.length) { path.push(v); pathE.push(estack[estack.length - 1]); stack.pop(); estack.pop(); }
      else { const e = list[p]; used[e] = 1; stack.push(MU[e] === v ? MV[e] : MU[e]); estack.push(e); }
    }
    path.reverse(); pathE.reverse();
    const edgesSeq = []; for (let k = 1; k < path.length; k++) edgesSeq.push(MI[pathE[k]]);
    return { path, edges: edgesSeq, usati };
  }

  // trasforma una sequenza di nodi/pezzi nel formato usato dall'app (coordinate, nomi, tratti da guardare)
  function confeziona(G, path, edges, daVedere) {
    const localNames = [], li = new Map(), seen = new Set(), n = [], lk = [];
    let tot = 0, look = 0;
    for (let k = 0; k < edges.length; k++) {
      const e = edges[k], g = G.EN[e];
      if (!li.has(g)) { li.set(g, localNames.length); localNames.push(G.NOMI[g] || 'strada senza nome'); }
      n.push(li.get(g));
      const guarda = daVedere(e) && !seen.has(e); seen.add(e);
      lk.push(guarda ? '1' : '0'); tot += G.EL[e]; if (guarda) look += G.EL[e];
    }
    const perVia = new Map();
    for (let k = 0; k < edges.length; k++) if (lk[k] === '1') { const nm = localNames[n[k]]; perVia.set(nm, (perVia.get(nm) || 0) + G.EL[edges[k]]); }
    const vie = [...perVia.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
    const via = vie.find(v => !/^(strada senza nome|stradina|sentiero|strada sterrata|scalinata|pista ciclabile|zona pedonale|strada [A-Z]+ ?\d*)$/.test(v)) || vie[0] || '';
    const ore = look / 1000 / WALK_KMH + (tot - look) / 1000 / FAST_KMH;
    return { coords: path.map(v => [G.R.lat[v], G.R.lon[v]]), nodi: path, pezzi: edges, names: localNames, n, lk: lk.join(''), via, km: tot / 1000, kmNuovi: look / 1000, ore };
  }

  const NOVE = 1e9;
  // Percorso dal vivo: parte dal nodo più vicino a `da`, copre le strade da vedere più vicine nel tempo `minuti`,
  // finisce in `a` (la macchina) oppure, se `a` manca, dove capita dopo l'ultima strada da guardare.
  function percorso(G, visti, da, opts = {}) {
    const minuti = opts.minuti || 60, rivedi = opts.rivedi || 0, daVedere = daVedereFn(G, visti, rivedi);
    const s = nodoVicino(G, da.lat, da.lon);
    const t = opts.a ? nodoVicino(G, opts.a.lat, opts.a.lon) : s;
    const libero = !opts.a;
    const budgetM = minuti / 60 * FAST_KMH * 1000; // metri percorribili al massimo
    const dS = dijkstra(G, [s], null, budgetM).dist, dT = t === s ? dS : dijkstra(G, [t], null, budgetM).dist;
    // tratti (da incrocio a incrocio) con case da vedere, dal più vicino
    const chiave = new Float64Array(G.nt).fill(Infinity);
    for (let e = 0; e < G.m; e++) {
      if (!daVedere(e)) continue;
      const a = G.EU[e], b = G.EV[e];
      const ds = Math.min(dS[a], dS[b]), dt = Math.min(dT[a], dT[b]);
      const k = libero ? ds : ds + dt;
      if (isFinite(k) && k < budgetM && k < chiave[G.T[e]]) chiave[G.T[e]] = k;
    }
    const cand = [];
    for (let t = 0; t < G.nt; t++) if (isFinite(chiave[t])) { let len = 0; for (let i = G.tStart[t]; i < G.tStart[t + 1]; i++) if (daVedere(G.tEdges[i])) len += G.EL[G.tEdges[i]]; cand.push([chiave[t], t, len]); }
    cand.sort((a, b) => a[0] - b[0]);
    if (!cand.length) return null;
    const prova = k => {
      const sel = [];
      for (let q = 0; q < k; q++) { const t = cand[q][1]; for (let i = G.tStart[t]; i < G.tStart[t + 1]; i++) if (daVedere(G.tEdges[i])) sel.push(G.tEdges[i]); }
      const g = giroSu(G, sel, s, t, daVedere);
      let path = g.path, edges = g.edges;
      if (libero) { // niente ritorno: tolgo il tratto finale dopo l'ultima strada nuova
        const viste = new Set(); let ultimo = -1;
        for (let i = 0; i < edges.length; i++) { if (daVedere(edges[i]) && !viste.has(edges[i])) ultimo = i; viste.add(edges[i]); }
        if (ultimo >= 0) { edges = edges.slice(0, ultimo + 1); path = path.slice(0, ultimo + 2); }
      }
      return confeziona(G, path, edges, daVedere);
    };
    // quante strade riesco a fare nel tempo: stima iniziale e poi aggiusto
    let acc = 0, k0 = 0;
    for (; k0 < cand.length; k0++) { acc += cand[k0][2]; if (acc / 1000 / WALK_KMH > minuti / 60 * 0.55) break; }
    k0 = Math.max(1, Math.min(cand.length, k0));
    let lo = 0, hi = cand.length + 1, best = null, k = k0;
    for (let it = 0; it < 9 && hi - lo > 1; it++) {
      const r = prova(k);
      if (r.ore * 60 <= minuti) { best = !best || r.kmNuovi >= best.kmNuovi ? r : best; lo = k; }
      else hi = k;
      if (hi > cand.length) k = Math.min(cand.length, Math.ceil(k * 1.4) + 2);
      else k = Math.floor((lo + hi) / 2);
      if (k === lo || k >= hi) break;
    }
    if (!best) best = prova(1); // anche la strada più vicina sfora: la propongo comunque
    best.minuti = minuti; best.libero = libero;
    best.inizio = s; best.fine = t;
    return best;
  }

  // strada più breve fino a un punto (per tornare alla macchina)
  function versoPunto(G, visti, da, a, rivedi = 0) {
    const s = nodoVicino(G, da.lat, da.lon), t = nodoVicino(G, a.lat, a.lon), daVedere = daVedereFn(G, visti, rivedi);
    const res = dijkstra(G, [s], v => v === t);
    if (res.last === -1 && s !== t) return null;
    const edges = pathEdges(G, res.pred, t).reverse(), path = [s];
    for (const e of edges) { const v = path[path.length - 1]; path.push(G.EU[e] === v ? G.EV[e] : G.EU[e]); }
    const r = confeziona(G, path, edges, daVedere); r.ritorno = true; r.inizio = s; r.fine = t;
    return r;
  }

  // zone con strade ancora da vedere, le più vicine prima (se la posizione è nota)
  function zoneDaFare(G, visti, pos, rivedi = 0) {
    const daVedere = daVedereFn(G, visti, rivedi), C = 350, celle = new Map();
    for (let e = 0; e < G.m; e++) {
      if (!daVedere(e)) continue;
      const x = (G.X[G.EU[e]] + G.X[G.EV[e]]) / 2, y = (G.Y[G.EU[e]] + G.Y[G.EV[e]]) / 2, k = Math.floor(x / C) + ',' + Math.floor(y / C);
      let c = celle.get(k); if (!c) celle.set(k, c = { len: 0, sx: 0, sy: 0, vie: new Map() });
      c.len += G.EL[e]; c.sx += x * G.EL[e]; c.sy += y * G.EL[e]; c.vie.set(G.EN[e], (c.vie.get(G.EN[e]) || 0) + G.EL[e]);
    }
    let lista = [...celle.values()].filter(c => c.len >= 120).map(c => {
      const x = c.sx / c.len, y = c.sy / c.len;
      const nomeVia = [...c.vie.entries()].sort((a, b) => b[1] - a[1]).map(v => G.NOMI[v[0]]).find(v => v && !/^(strada senza nome|stradina|sentiero|strada sterrata|scalinata|pista ciclabile|zona pedonale)$/.test(v)) || '';
      return { lat: y / G.ky, lon: x / G.kx, x, y, km: c.len / 1000, via: nomeVia, frazione: frazione(G, y / G.ky, x / G.kx) };
    });
    const dPos = z => pos ? Math.hypot(z.x - pos.lon * G.kx, z.y - pos.lat * G.ky) : 0;
    lista.forEach(z => { z.distanza = pos ? dPos(z) : null; });
    lista.sort((a, b) => pos ? a.distanza - b.distanza : b.km - a.km);
    const scelte = [];
    for (const z of lista) { if (scelte.every(o => Math.hypot(o.x - z.x, o.y - z.y) > 700)) scelte.push(z); if (scelte.length >= 6) break; }
    // punto in cui lasciare la macchina: parcheggio vicino, altrimenti la strada da vedere più vicina al centro
    for (const z of scelte) {
      let park = null, pd = 300;
      for (const p of (G.R.parcheggi || [])) { const d = Math.hypot(p.lon * G.kx - z.x, p.lat * G.ky - z.y); if (d < pd) { pd = d; park = p; } }
      if (park) { z.parcheggio = { lat: park.lat, lon: park.lon, nome: park.nome || 'Parcheggio' }; }
      else { const v = nodoVicino(G, z.lat, z.lon); z.parcheggio = { lat: G.R.lat[v], lon: G.R.lon[v], nome: '' }; }
      delete z.x; delete z.y;
    }
    return scelte;
  }

  function frazione(G, lat, lon) {
    const x = lon * G.kx, y = lat * G.ky; let b = null, bd = Infinity;
    for (const p of G.luoghi) { const d = Math.hypot(p.x - x, p.y - y) + (p.borgo ? 300 : 0); if (d < bd) { bd = d; b = p.nome; } }
    return b || G.comune;
  }

  // indirizzo senza internet: civico più vicino (se c'è nelle mappe) o almeno la via
  function indirizzoVicino(G, lat, lon) {
    const [x, y] = xy(G, lat, lon);
    let civ = null, cd = 30;
    for (const c of (G.R.civici || [])) { const d = Math.hypot(c[1] * G.kx - x, c[0] * G.ky - y); if (d < cd) { cd = d; civ = c; } }
    const paese = frazione(G, lat, lon);
    if (civ) return { via: civ[2] + ' ' + civ[3], paese, esatto: true };
    let bv = null, bd = 60; const cx = Math.floor(x / G.CS), cy = Math.floor(y / G.CS);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const v of (G.gN.get((cx + i) + ',' + (cy + j)) || []))
      for (let p = G.start[v]; p < G.start[v + 1]; p++) { const e = G.adj[p], nm = G.NOMI[G.EN[e]]; if (!nm || /^(strada senza nome|stradina|sentiero|strada sterrata|scalinata|pista ciclabile|zona pedonale)$/.test(nm)) continue; const d = distSeg(x, y, G.X[G.EU[e]], G.Y[G.EU[e]], G.X[G.EV[e]], G.Y[G.EV[e]]); if (d < bd) { bd = d; bv = nm; } }
    return { via: bv || '', paese, esatto: false };
  }

  // quanto del comune è stato visto
  function avanzamento(G, visti, rivedi = 0) {
    const daVedere = daVedereFn(G, visti, rivedi); let fatto = 0;
    const o = oggi(); let recenti = 0, vecchi = 0;
    for (let e = 0; e < G.m; e++) if (G.ER[e] && !daVedere(e)) { fatto += G.EL[e]; if (o - visti[e] <= 90) recenti += G.EL[e]; else if (o - visti[e] > 180) vecchi += G.EL[e]; }
    // recenti: viste negli ultimi 3 mesi; vecchi: viste da più di 6 mesi (da ripassare presto)
    return { kmFatti: fatto / 1000, kmTot: G.reqTot / 1000, perc: G.reqTot ? fatto / G.reqTot : 0, kmRecenti: recenti / 1000, kmVecchi: vecchi / 1000 };
  }

  // progressi della versione precedente (giri v3) riportati sulla nuova rete
  function daV3(G, visti, plan3, stato3) {
    if (!plan3 || plan3.v !== 3 || !stato3) return 0;
    let nuovi = 0;
    for (const g of plan3.giri || []) {
      const fino = (stato3.fatti || {})[g.id] ? g.coords.length - 1 : Math.min(g.coords.length - 1, (stato3.prog || {})[g.id] || 0);
      for (let i = 0; i < fino; i++) {
        if (g.lk && g.lk[i] !== '1') continue;
        nuovi += copriTratto(G, visti, g.coords[i], g.coords[i + 1], 12);
      }
    }
    return nuovi;
  }
  // copertura da una rete vecchia a una nuova (quando le mappe vengono riscaricate)
  function rimappa(Gv, vistiV, Gn, vistiN) {
    let n = 0;
    for (let e = 0; e < Gv.m; e++) if (vistiV[e]) {
      const a = Gv.EU[e], b = Gv.EV[e], lat = (Gv.R.lat[a] + Gv.R.lat[b]) / 2, lon = (Gv.R.lon[a] + Gv.R.lon[b]) / 2;
      n += copri(Gn, vistiN, lat, lon, 10, vistiV[e]);
    }
    return n;
  }

  async function scaricaRete(comune, log = () => { }, spec) {
    const osm = await scaricaOSM(comune, log, spec);
    log('Preparo la rete stradale…');
    await new Promise(r => setTimeout(r, 0));
    return costruisciRete(osm, comune, spec && spec.poly && spec.poly.length >= 3 ? spec.poly : null);
  }
  // segno delle strade percorse da una rete vecchia a una nuova
  function rimappaSegno(Gv, av, Gn, an) {
    for (let e = 0; e < Gv.m; e++) if (av[e]) { const a = Gv.EU[e], b = Gv.EV[e]; segna(Gn, an, (Gv.R.lat[a] + Gv.R.lat[b]) / 2, (Gv.R.lon[a] + Gv.R.lon[b]) / 2, 8, av[e]); }
  }

  global.Planner = { versione: 7, overpass, WALK_KMH, FAST_KMH, GIORNO0, oggi, trovaComune, trovaAree, quartieri, confineQuartiere, confineComune, anelliDa, involucro, areaKm2, dentroPoligono, semplifica, segna, segnaTratto, rimappaSegno, scaricaOSM, scaricaRete, costruisciRete, prepara, nodoVicino, distNodo, copri, copriTratto, percorso, versoPunto, zoneDaFare, frazione, indirizzoVicino, avanzamento, daV3, rimappa, daVedereFn };
})(typeof window !== 'undefined' ? window : globalThis);
