/* planner.js — divide un comune in N giorni e calcola un giro a piedi per giorno.
   Dati: OpenStreetMap (Overpass). Modello: problema del postino rurale
   (percorrere ogni strada con case almeno una volta, partendo e tornando al parcheggio). */
(function (global) {
  'use strict';
  const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
  const ROAD_RE = '^(primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street|pedestrian|service|track|footway|path|steps|cycleway)$';
  const CONNECTOR_ONLY = /^(footway|path|steps|cycleway)$/; // percorribili ma non "da vedere"
  const HOUSE_DIST = 40;   // m: una strada "ha case" se c'è un edificio entro questa distanza
  const WALK_KMH = 3.0;    // km/h sulle strade con case (si guarda)
  const FAST_KMH = 4.5;    // km/h su collegamenti e tratti già visti
  const CLUSTER_GAP = 200; // m: gruppi di case più lontani di così = giri separati (si sposta la macchina)
  const SEG = 25;          // m: lunghezza dei pezzi di strada
  const NOT_HOME = /^(industrial|warehouse|commercial|retail|office|shed|roof|church|chapel|cathedral|ruins|school|kindergarten|university|train_station|carport|garage|garages|barn|stable|cowshed|greenhouse|farm_auxiliary|service|transformer_tower|tower|clock_tower|hangar|supermarket|construction|silo|storage_tank|bunker|toilets|hospital|sports_hall|grandstand|cemetery|parking)$/;
  const MAX_HOUSE_BBOX = 2500; // m²: ingombri più grandi = quasi sempre capannoni
  const STUB = 50;         // m: vicoli ciechi più corti si guardano dall'imbocco
  const MAX_LINK = 400;    // m: se un gruppo di case dista di più a piedi, ci si va in macchina
  const MIN_CLUSTER = 300; // m di strade con case: sotto questa soglia = cascina isolata, da vedere in macchina

  async function overpass(q, log) {
    let lastErr;
    for (let round = 0; round < 4; round++) {
      for (const url of OVERPASS) {
        try {
          const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q) });
          if (r.ok) return await r.json();
          lastErr = new Error('Server mappe: errore ' + r.status);
        } catch (e) { lastErr = e; }
      }
      const wait = 15 * Math.pow(2, round);
      log('Server mappe occupati, riprovo tra ' + wait + ' secondi…');
      await new Promise(r => setTimeout(r, wait * 1000));
    }
    throw lastErr;
  }

  async function fetchOSM(comune, log) {
    const area = `area["boundary"="administrative"]["admin_level"="8"]["name"="${comune}"]->.a;`;
    log('Scarico le strade di ' + comune + '…');
    const roads = await overpass(`[out:json][timeout:180];${area}way(area.a)["highway"~"${ROAD_RE}"];out body;>;out skel qt;`, log);
    log('Scarico edifici, frazioni e parcheggi…');
    const extra = await overpass(`[out:json][timeout:180];${area}(way(area.a)["building"];relation(area.a)["building"];node(area.a)["place"~"^(town|village|suburb|hamlet)$"];nwr(area.a)["amenity"="parking"];);out bb;`, log);
    if (!roads.elements.length) throw new Error('Comune "' + comune + '" non trovato su OpenStreetMap');
    return { roads, extra };
  }

  // ---------- grafo ----------
  function build(osm) {
    const idx = new Map(), LAT = [], LON = [];
    for (const el of osm.roads.elements) if (el.type === 'node') { idx.set(el.id, LAT.length); LAT.push(el.lat); LON.push(el.lon); }
    const lat0 = LAT.reduce((a, b) => a + b, 0) / LAT.length;
    const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
    const Xa = LON.map(v => v * kx), Ya = LAT.map(v => v * ky);

    const grid = new Map(), cs = 50, gk = (x, y) => Math.floor(x / cs) + ',' + Math.floor(y / cs);
    const places = [], parkings = [];
    for (const el of osm.extra.elements) {
      const b = el.bounds;
      const lat = el.lat != null ? el.lat : b ? (b.minlat + b.maxlat) / 2 : el.center && el.center.lat;
      const lon = el.lon != null ? el.lon : b ? (b.minlon + b.maxlon) / 2 : el.center && el.center.lon;
      if (lat == null) continue;
      const t = el.tags || {}, x = lon * kx, y = lat * ky;
      if (t.building) {
        // solo edifici che possono essere abitazioni: niente capannoni, chiese, tettoie, né ingombri enormi
        if (NOT_HOME.test(t.building) || t.amenity || t.shop || t.industrial) continue;
        if (b && (b.maxlon - b.minlon) * kx * (b.maxlat - b.minlat) * ky > MAX_HOUSE_BBOX) continue;
        const k = gk(x, y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(x, y);
      }
      else if (t.place) places.push({ name: t.name || t.place, hamlet: t.place === 'hamlet', x, y });
      else if (t.amenity === 'parking' && t.access !== 'private') parkings.push({ x, y, lat, lon, name: t.name || '' });
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

    // ogni tratto OSM viene spezzato in pezzi da ~25 m: così "con case" vale solo dove le case ci sono davvero
    const EU = [], EV = [], EL = [], ER = [], EN = [], NAMES = [''], nameIdx = new Map([['', 0]]);
    const GENERIC = { footway: 'sentiero', path: 'sentiero', steps: 'scalinata', cycleway: 'pista ciclabile', track: 'strada sterrata', service: 'stradina', pedestrian: 'zona pedonale', living_street: 'strada senza nome' };
    for (const w of osm.roads.elements) {
      if (w.type !== 'way') continue;
      const t = w.tags || {}, hw = t.highway;
      if (hw === 'service' && t.service && t.service !== 'alley') continue;
      if (t.access === 'private' || t.access === 'no' || t.foot === 'no') continue;
      const conn = CONNECTOR_ONLY.test(hw);
      const nm = t.name || (t.ref ? 'strada ' + t.ref : '') || GENERIC[hw] || 'strada senza nome';
      if (!nameIdx.has(nm)) { nameIdx.set(nm, NAMES.length); NAMES.push(nm); }
      const ni = nameIdx.get(nm);
      for (let i = 1; i < w.nodes.length; i++) {
        const a = idx.get(w.nodes[i - 1]), b = idx.get(w.nodes[i]);
        if (a == null || b == null || a === b) continue;
        const len = Math.hypot(Xa[b] - Xa[a], Ya[b] - Ya[a]), s = Math.max(1, Math.ceil(len / SEG));
        let prev = a;
        for (let q = 1; q <= s; q++) {
          let cur = b;
          if (q < s) { const f = q / s; cur = Xa.length; Xa.push(Xa[a] + (Xa[b] - Xa[a]) * f); Ya.push(Ya[a] + (Ya[b] - Ya[a]) * f); LAT.push(LAT[a] + (LAT[b] - LAT[a]) * f); LON.push(LON[a] + (LON[b] - LON[a]) * f); }
          const req = !conn && nearHouse((Xa[prev] + Xa[cur]) / 2, (Ya[prev] + Ya[cur]) / 2);
          EU.push(prev); EV.push(cur); EL.push(len / s); ER.push(req); EN.push(ni);
          prev = cur;
        }
      }
    }
    const n = Xa.length, X = Float64Array.from(Xa), Y = Float64Array.from(Ya);
    const m = EU.length;
    const deg = new Int32Array(n); for (let e = 0; e < m; e++) { deg[EU[e]]++; deg[EV[e]]++; }
    const start = new Int32Array(n + 1); for (let i = 0; i < n; i++) start[i + 1] = start[i] + deg[i];
    const fill = start.slice(0, n), adj = new Int32Array(2 * m);
    for (let e = 0; e < m; e++) { adj[fill[EU[e]]++] = e; adj[fill[EV[e]]++] = e; }

    // componente connessa principale
    const comp = new Int32Array(n).fill(-1); let best = -1, bestSize = 0, c = 0;
    for (let s = 0; s < n; s++) {
      if (comp[s] !== -1 || deg[s] === 0) continue;
      let size = 0; const st = [s]; comp[s] = c;
      while (st.length) { const v = st.pop(); size++; for (let p = start[v]; p < start[v + 1]; p++) { const e = adj[p], u = EU[e] === v ? EV[e] : EU[e]; if (comp[u] === -1) { comp[u] = c; st.push(u); } } }
      if (size > bestSize) { bestSize = size; best = c; }
      c++;
    }
    // rami ad albero (vicoli ciechi): si percorrono due volte
    const tree = new Uint8Array(m), d2 = deg.slice(), removed = new Uint8Array(m), q = [];
    for (let i = 0; i < n; i++) if (d2[i] === 1) q.push(i);
    while (q.length) {
      const v = q.pop(); if (d2[v] !== 1) continue;
      for (let p = start[v]; p < start[v + 1]; p++) { const e = adj[p]; if (removed[e]) continue; removed[e] = 1; tree[e] = 1; d2[v]--; const u = EU[e] === v ? EV[e] : EU[e]; d2[u]--; if (d2[u] === 1) q.push(u); break; }
    }
    // vicoli ciechi corti (fino a STUB m dall'incrocio): si guardano dall'imbocco, non serve entrarci
    const depth = new Float64Array(n).fill(Infinity), dq = [];
    for (let i = 0; i < n; i++) if (d2[i] >= 2) { depth[i] = 0; dq.push(i); }
    for (let qi = 0; qi < dq.length; qi++) { const v = dq[qi]; for (let p = start[v]; p < start[v + 1]; p++) { const e = adj[p]; if (!tree[e]) continue; const u = EU[e] === v ? EV[e] : EU[e]; if (depth[u] === Infinity) { depth[u] = depth[v] + EL[e]; dq.push(u); } } }
    for (let e = 0; e < m; e++) if (ER[e] && tree[e] && Math.max(depth[EU[e]], depth[EV[e]]) <= STUB) ER[e] = false;
    // gruppi di case: componenti delle strade richieste unite se distano meno di CLUSTER_GAP.
    // I gruppi piccoli (cascine isolate) diventano "fermate in macchina".
    const uf = new Int32Array(n); for (let i = 0; i < n; i++) uf[i] = i;
    const f2 = a => { while (uf[a] !== a) { uf[a] = uf[uf[a]]; a = uf[a]; } return a; };
    const un = (a, b) => { a = f2(a); b = f2(b); if (a !== b) uf[a] = b; };
    const reqNodes = new Set();
    for (let e = 0; e < m; e++) if (ER[e] && comp[EU[e]] === best) { un(EU[e], EV[e]); reqNodes.add(EU[e]); reqNodes.add(EV[e]); }
    const g2 = new Map(), cs2 = CLUSTER_GAP, k2 = (x, y) => Math.floor(x / cs2) + ',' + Math.floor(y / cs2);
    for (const v of reqNodes) { const k = k2(X[v], Y[v]); if (!g2.has(k)) g2.set(k, []); g2.get(k).push(v); }
    for (const v of reqNodes) {
      const cx = Math.floor(X[v] / cs2), cy = Math.floor(Y[v] / cs2);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const u of (g2.get((cx + i) + ',' + (cy + j)) || []))
        if (u !== v && (X[u] - X[v]) ** 2 + (Y[u] - Y[v]) ** 2 < cs2 * cs2) un(u, v);
    }
    const clLen = new Map();
    for (let e = 0; e < m; e++) if (ER[e] && comp[EU[e]] === best) { const r = f2(EU[e]); clLen.set(r, (clLen.get(r) || 0) + EL[e]); }
    const cluster = new Int32Array(m).fill(-1), carStops = [], small = new Map();
    for (let e = 0; e < m; e++) {
      if (!ER[e]) continue;
      if (comp[EU[e]] !== best) { ER[e] = false; continue; }
      const r = f2(EU[e]);
      if (clLen.get(r) < MIN_CLUSTER) { ER[e] = false; if (!small.has(r)) small.set(r, []); small.get(r).push(e); }
      else cluster[e] = r;
    }
    for (const es of small.values()) {
      let sx = 0, sy = 0, sl = 0; for (const e of es) { sx += (X[EU[e]] + X[EV[e]]) / 2 * EL[e]; sy += (Y[EU[e]] + Y[EV[e]]) / 2 * EL[e]; sl += EL[e]; }
      carStops.push({ x: sx / sl, y: sy / sl, lat: +(sy / sl / ky).toFixed(5), lon: +(sx / sl / kx).toFixed(5), m: Math.round(sl) });
    }
    return { n, m, X, Y, LAT, LON, kx, ky, EU, EV, EL, ER, EN, NAMES, tree, start, adj, comp, main: best, places, parkings, cluster, carStops };
  }

  // ---------- Dijkstra (heap binario) ----------
  function dijkstra(G, sources, stopFn, maxDist) {
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

  // ---------- zone bilanciate (diagramma di potenza) ----------
  function makeZones(G, k, comune) {
    const R = [];
    for (let e = 0; e < G.m; e++) if (G.ER[e] && G.comp[G.EU[e]] === G.main)
      R.push({ e, x: (G.X[G.EU[e]] + G.X[G.EV[e]]) / 2, y: (G.Y[G.EU[e]] + G.Y[G.EV[e]]) / 2, w: G.EL[e] * (G.tree[e] ? 2 : 1) });
    const total = R.reduce((a, r) => a + r.w, 0), target = total / k;
    // semi: frazioni (paesi prima dei borghi) con più strade attorno
    const pl = G.places.map(p => ({ ...p, local: R.reduce((a, r) => a + ((r.x - p.x) ** 2 + (r.y - p.y) ** 2 < 6e5 ? r.w : 0), 0) }))
      .sort((a, b) => (a.hamlet - b.hamlet) || (b.local - a.local));
    const seeds = [];
    for (const p of pl) { if (seeds.length >= k) break; if (seeds.every(s => (s.x - p.x) ** 2 + (s.y - p.y) ** 2 > 4e5)) seeds.push({ x: p.x, y: p.y }); }
    while (seeds.length < k) { let bx = 0, by = 0, bd = -1; for (const r of R) { const d = Math.min(...seeds.map(s => (s.x - r.x) ** 2 + (s.y - r.y) ** 2)) * r.w; if (d > bd) { bd = d; bx = r.x; by = r.y; } } seeds.push({ x: bx, y: by }); }
    const wk = new Float64Array(k), z = new Int32Array(R.length);
    const assign = () => { const load = new Float64Array(k); R.forEach((r, i) => { let b = 0, bv = Infinity; for (let j = 0; j < k; j++) { const v = (seeds[j].x - r.x) ** 2 + (seeds[j].y - r.y) ** 2 - wk[j]; if (v < bv) { bv = v; b = j; } } z[i] = b; load[b] += r.w; }); return load; };
    let load;
    for (let it = 0; it < 400; it++) {
      load = assign();
      if (it < 15) { const sx = new Float64Array(k), sy = new Float64Array(k); R.forEach((r, i) => { sx[z[i]] += r.x * r.w; sy[z[i]] += r.y * r.w; }); for (let j = 0; j < k; j++) if (load[j] > 0) { seeds[j].x = sx[j] / load[j]; seeds[j].y = sy[j] / load[j]; } continue; }
      const dev = Math.max(...Array.from(load, l => Math.abs(l - target) / target)); if (dev < 0.04) break;
      const step = 4e5 * Math.pow(0.992, it - 15);
      for (let j = 0; j < k; j++) wk[j] += step * (target - load[j]) / target;
    }
    const zones = seeds.map((s, j) => ({ j, cx: s.x, cy: s.y, edges: [], names: [] }));
    R.forEach((r, i) => zones[z[i]].edges.push(r.e));
    const zoneOf = (x, y) => { let b = 0, bv = Infinity; for (let j = 0; j < k; j++) { const v = (seeds[j].x - x) ** 2 + (seeds[j].y - y) ** 2 - wk[j]; if (v < bv) { bv = v; b = j; } } return b; };
    for (const p of pl) zones[zoneOf(p.x, p.y)].names.push(p.name);
    for (const zz of zones) { zz.name = zz.names.length ? zz.names.join(', ') : ''; zz.carStops = []; }
    for (const c of G.carStops) zones[zoneOf(c.x, c.y)].carStops.push({ lat: c.lat, lon: c.lon, m: c.m });
    // ordine dei giorni: prima la zona del capoluogo, poi la più vicina
    let cur = zones.find(zz => zz.names.includes(comune)) || zones[0]; const order = [cur]; const left = new Set(zones.filter(zz => zz !== cur));
    while (left.size) { let b = null, bd = Infinity; for (const zz of left) { const d = (zz.cx - cur.cx) ** 2 + (zz.cy - cur.cy) ** 2; if (d < bd) { bd = d; b = zz; } } order.push(b); left.delete(b); cur = b; }
    order.forEach((zz, i) => { if (!zz.name) zz.name = 'Zona ' + (i + 1); });
    return order;
  }

  // ---------- giro di una zona (postino rurale euristico) ----------
  function routeLoop(G, edges, startNode, maxLink = Infinity) {
    const MU = [], MV = [], ML = [];
    const MI = [];
    const addEdge = e => { MU.push(G.EU[e]); MV.push(G.EV[e]); ML.push(G.EL[e]); MI.push(e); };
    let reqLen = 0, connLen = 0;
    // 1) componenti delle strade richieste
    const parent = new Map(), find = a => { while (parent.get(a) !== a) { parent.set(a, parent.get(parent.get(a))); a = parent.get(a); } return a; };
    const touch = a => { if (!parent.has(a)) parent.set(a, a); };
    touch(startNode);
    for (const e of edges) { touch(G.EU[e]); touch(G.EV[e]); const a = find(G.EU[e]), b = find(G.EV[e]); if (a !== b) parent.set(a, b); }
    const members = new Map();
    for (const v of parent.keys()) { const r = find(v); if (!members.has(r)) members.set(r, []); members.get(r).push(v); }
    // 2) collego le componenti con l'albero minimo (Prim con Dijkstra multi-sorgente)
    const inTree = new Set(members.get(find(startNode)));
    const remaining = new Set([...members.keys()].filter(r => r !== find(startNode)));
    while (remaining.size) {
      const res = dijkstra(G, inTree, v => !inTree.has(v) && parent.has(v) && remaining.has(find(v)), maxLink);
      if (res.last === -1) break; // il resto è troppo lontano a piedi: diventa un altro giro
      for (const e of pathEdges(G, res.pred, res.last)) { addEdge(e); connLen += G.EL[e]; inTree.add(G.EU[e]); inTree.add(G.EV[e]); }
      const r = find(res.last); remaining.delete(r); for (const v of members.get(r)) inTree.add(v);
    }
    const leftover = [];
    for (const e of edges) { if (remaining.has(find(G.EU[e]))) leftover.push(e); else { addEdge(e); reqLen += G.EL[e]; } }
    // 3) nodi dispari -> abbinamento con percorsi minimi (greedy + 2-opt)
    const deg = new Map(); for (let i = 0; i < MU.length; i++) { deg.set(MU[i], (deg.get(MU[i]) || 0) + 1); deg.set(MV[i], (deg.get(MV[i]) || 0) + 1); }
    const odd = [...deg.keys()].filter(v => deg.get(v) % 2 === 1), oddSet = new Set(odd), oi = new Map(odd.map((v, i) => [v, i]));
    const D = [], P = [];
    odd.forEach(s => { let found = 0; const res = dijkstra(G, [s], v => oddSet.has(v) && ++found >= odd.length, 3000); D.push(odd.map(t => res.dist[t])); P.push(res.pred); });
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
    // 4) circuito euleriano (Hierholzer) dal parcheggio
    const nbr = new Map(); for (let i = 0; i < MU.length; i++) { for (const v of [MU[i], MV[i]]) { if (!nbr.has(v)) nbr.set(v, []); nbr.get(v).push(i); } }
    const used = new Uint8Array(MU.length), ptr = new Map(), stack = [startNode], estack = [-1], path = [], pathE = [];
    while (stack.length) {
      const v = stack[stack.length - 1], list = nbr.get(v) || []; let p = ptr.get(v) || 0;
      while (p < list.length && used[list[p]]) p++;
      ptr.set(v, p);
      if (p === list.length) { path.push(v); pathE.push(estack[estack.length - 1]); stack.pop(); estack.pop(); }
      else { const e = list[p]; used[e] = 1; stack.push(MU[e] === v ? MV[e] : MU[e]); estack.push(e); }
    }
    path.reverse(); pathE.reverse();
    // per ogni tratto: nome della via e se è la prima volta su una strada con case ("guarda") o solo passaggio
    const localNames = [], li = new Map(), seen = new Set(), segName = [], look = [];
    for (let k = 1; k < path.length; k++) {
      const e = MI[pathE[k]], g = G.EN[e];
      if (!li.has(g)) { li.set(g, localNames.length); localNames.push(G.NAMES[g]); }
      segName.push(li.get(g));
      look.push(G.ER[e] && !seen.has(e) ? '1' : '0'); seen.add(e);
    }
    const total = ML.reduce((a, b) => a + b, 0);
    const missed = used.reduce((a, u) => a + (u ? 0 : 1), 0);
    return {
      coords: path.map(v => [+G.LAT[v].toFixed(5), +G.LON[v].toFixed(5)]),
      names: localNames, n: segName, lk: look.join(''),
      km: +(total / 1000).toFixed(1), reqKm: +(reqLen / 1000).toFixed(1),
      ore: +(reqLen / 1000 / WALK_KMH + (total - reqLen) / 1000 / FAST_KMH).toFixed(1), missedEdges: missed,
      connKm: +(connLen / 1000).toFixed(1), leftover
    };
  }

  // nodo della rete principale più vicino a (x,y)
  function nearestNode(G, x, y, pool) {
    let sn = -1, sd = Infinity;
    const it = pool || G.X.keys();
    for (const i of it) { if (G.comp[i] !== G.main) continue; const d = (G.X[i] - x) ** 2 + (G.Y[i] - y) ** 2; if (d < sd) { sd = d; sn = i; } }
    return sn;
  }

  function groupOf(G, es) {
    let sx = 0, sy = 0, sl = 0; for (const e of es) { const l = G.EL[e]; sx += (G.X[G.EU[e]] + G.X[G.EV[e]]) / 2 * l; sy += (G.Y[G.EU[e]] + G.Y[G.EV[e]]) / 2 * l; sl += l; }
    return { edges: es, x: sx / sl, y: sy / sl, len: sl };
  }

  // una giornata = uno o più giri ad anello, uno per gruppo di case (tra un giro e l'altro si sposta la macchina)
  function routeDay(G, zone) {
    const groups = new Map();
    for (const e of zone.edges) { const c = G.cluster[e]; if (!groups.has(c)) groups.set(c, []); groups.get(c).push(e); }
    const gs = [...groups.values()].map(es => groupOf(G, es)).sort((a, b) => b.len - a.len);
    // pezzi minuscoli (gruppo tagliato dal confine di zona) -> uniti al gruppo più vicino
    const queue = gs.filter(g => g.len >= 150 || g === gs[0]);
    for (const g of gs) if (!queue.includes(g)) { let b = queue[0], bd = Infinity; for (const k of queue) { const d = (k.x - g.x) ** 2 + (k.y - g.y) ** 2; if (d < bd) { bd = d; b = k; } } b.edges.push(...g.edges); }
    const loops = [], carStops = [];
    while (queue.length) {
      const g = queue.shift();
      if (g.len < MIN_CLUSTER && loops.length) { carStops.push({ lat: +(g.y / G.ky).toFixed(5), lon: +(g.x / G.kx).toFixed(5), m: Math.round(g.len) }); continue; }
      const pool = new Set(); for (const e of g.edges) { pool.add(G.EU[e]); pool.add(G.EV[e]); }
      // partenza: parcheggio entro 300 m dal centro del gruppo, altrimenti la strada con case più vicina al centro
      let park = null, pd = 300 * 300;
      for (const p of G.parkings) { const d = (p.x - g.x) ** 2 + (p.y - g.y) ** 2; if (d < pd) { pd = d; park = p; } }
      let s = park ? nearestNode(G, park.x, park.y) : nearestNode(G, g.x, g.y, pool);
      let r = routeLoop(G, g.edges, s, MAX_LINK);
      if (r.reqKm === 0) { park = null; s = nearestNode(G, g.x, g.y, pool); r = routeLoop(G, g.edges, s, MAX_LINK); }
      if (r.reqKm > 0) loops.push({ start: { name: park ? (park.name || 'Parcheggio') : 'Lascia la macchina qui', lat: +G.LAT[s].toFixed(5), lon: +G.LON[s].toFixed(5) }, ...r, leftover: undefined });
      if (r.leftover.length) queue.push(groupOf(G, r.leftover));
    }
    // ordine dei giri: dal più grande, poi il più vicino
    loops.sort((a, b) => b.reqKm - a.reqKm);
    const ord = [loops[0]], left = new Set(loops.slice(1));
    while (left.size) { const c = ord[ord.length - 1].start; let b = null, bd = Infinity; for (const l of left) { const d = (l.start.lat - c.lat) ** 2 + (l.start.lon - c.lon) ** 2; if (d < bd) { bd = d; b = l; } } ord.push(b); left.delete(b); }
    return { loops: loops.length ? ord : [], carStops };
  }

  async function plan(comune, days, log = () => {}) {
    const osm = await fetchOSM(comune, log);
    log('Costruisco la rete stradale…');
    const G = build(osm);
    log('Divido il comune in ' + days + ' giorni…');
    const zones = makeZones(G, days, comune);
    const out = [];
    for (let i = 0; i < zones.length; i++) {
      log('Calcolo il giro del giorno ' + (i + 1) + ' (' + zones[i].name + ')…');
      await new Promise(r => setTimeout(r, 0));
      const { loops, carStops } = routeDay(G, zones[i]);
      const km = loops.reduce((a, l) => a + l.km, 0), reqKm = loops.reduce((a, l) => a + l.reqKm, 0);
      out.push({ day: i + 1, name: zones[i].name, km: +km.toFixed(1), reqKm: +reqKm.toFixed(1), ore: +loops.reduce((a, l) => a + l.ore, 0).toFixed(1), loops, carStops: zones[i].carStops.concat(carStops) });
    }
    return { v: 2, comune, days, created: new Date().toISOString(), walkKmh: WALK_KMH, fastKmh: FAST_KMH, plan: out };
  }

  global.Planner = { plan, fetchOSM, build, makeZones, routeLoop, routeDay };
})(typeof window !== 'undefined' ? window : globalThis);
