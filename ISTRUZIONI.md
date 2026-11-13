# Zona — versione 15

L'app per il **farming immobiliare**: l'agente lavora sempre la stessa zona (alcuni comuni, oppure un quartiere in città), la gira a piedi, conosce le case e raccoglie notizie dalle persone del posto. Zona tiene tutto in ordine. Funziona in qualsiasi zona italiana presente su OpenStreetMap; i dati restano sul telefono.

## Cosa c'è di nuovo nella 15
- **Carattere IBM Plex Sans** al posto di Inter: più sobrio e "da ufficio".
- **Niente più verde**: conferme, interruttori, barre e tasti usano il blu notte; le strade percorse negli ultimi 3 mesi sono blu notte, quelle viste da più di 3 mesi grigio chiaro; "Interessante" è ambra (stella), "Da ricontattare" blu (telefono). Restano i colori ufficiali delle classi energetiche (A verde → G rosso).
- **Testata sottile** in alto con il logo e il nome della zona; il profilo è nella testata.
- **Barra delle icone attaccata al pannello**: si muove insieme a lui quando lo trascini, larga quanto lo schermo. Con il pannello tutto alzato le icone salgono nella testata, accanto al profilo, e la riempiono.
- **Confini precisi e sottili**: i confini dei comuni sono scaricati con 2 m di tolleranza (prima fino a decine di metri), tutti con una sola richiesta e subito dopo aver aggiunto l'area; se due comuni hanno lo stesso nome si prende quello giusto. Contorno sottile, niente più etichette con i nomi dei paesi (ci sono già sulla mappa): per aprire un'area in "Tutta la zona" si tocca dentro il suo confine.
- **"Tutta la zona" veloce**: si apre subito, le altre aree arrivano da sole in sottofondo (rete leggera, senza calcolare i percorsi).
- **Fuori zona sbarrato e nebbia** (accesi di serie, si spengono da Legenda e strati): fuori dalla zona la mappa è coperta da barre parallele; dentro, la nebbia copre la parte non ancora vista e si dirada dove passi.
- **La mappa non va oltre il doppio della zona**: non si può allontanare la vista né spostarsi oltre.
- **Vista inclinata** (Legenda e strati): la mappa leggermente in prospettiva. È un effetto grafico (la libreria della mappa disegna solo dall'alto): per scegliere un punto o disegnare una zona la mappa torna dall'alto da sola.

## Cosa c'era nella 14
- **Nuovo aspetto, più professionale**: una sola palette in tutta l'app (blu notte del marchio, ambra per il percorso e le cose da guardare, verde per il già visto), ombre, angoli e caratteri coerenti, mappa di fondo più tenue così risaltano strade e case.
- **Marchio Zona**: logo nuovo (una Z disegnata come un percorso, dal punto di partenza all'arrivo ambra), icone dell'app nuove (anche "maskable" per Android), icona piccola per le notifiche, schermata di avvio.
- **Finestre dell'app al posto di quelle del browser**: conferme, eliminazioni, PIN, nome della zona disegnata, modifica delle cose da fare; "Esporta in Excel" chiede con tre tasti cosa esportare (case dell'area, case di tutta la zona, notizie).
- **Caricamenti**: rotelle e barre "fantasma" al posto delle scritte "Cerco…": scaricamento della mappa a tappe (strade → case → rete) con l'avviso quando i server sono occupati, dati della casa, indirizzo, collegamento a Google, backup, "Tutta la zona".
- **Dettagli**: avvisi con icona che non coprono più i tasti dei fogli, liste vuote con spiegazione, menu con icone e frecce, pallino della posizione che pulsa, stato della casa in evidenza nella scheda, legenda della mappa che non esce più dallo schermo (il pannello si abbassa da solo).
- **Più veloce e leggera**: lista delle case calcolata una volta sola, foto caricate solo quando servono, audio liberato dalla memoria quando chiudi la scheda; l'app si apre anche senza rete fin dalla prima volta (file salvati all'installazione, carattere e Leaflet tenuti in copia).

## Cosa c'era nella 13
- **Dati della casa** nella scheda, cercati da soli la prima volta che si apre (e ricontrollabili con "Cerca di nuovo"):
  - **Catasto**: foglio e particella dal punto della casa, dalla mappa catastale dell'Agenzia delle Entrate (servizio libero); link a Visura catastale e Geoportale.
  - **Edificio**: tipo, piani, anno di costruzione se presenti su OpenStreetMap.
  - **Certificati energetici (APE)** dello stesso indirizzo e civico, dall'open data di Regione Lombardia (CENED+2): classe, piano, anno, m² riscaldati, consumo; "stessa particella" se combaciano col catasto. Solo Lombardia.
  - **Valore catastale** (prima casa e altre abitazioni) e **base IMU** quando si scrivono categoria e rendita della visura.
  - **Valore di mercato indicativo**: superficie × quotazioni OMI (min-max €/m², da scrivere), confrontato col prezzo richiesto.
- **Mappa catastale** come strato della mappa (strati → "Mappa catastale"), visibile da vicino.
- **Carattere Inter** al posto di Atkinson Hyperlegible: aspetto più professionale, numeri in colonna.
- Rendita e categoria non si leggono in automatico: servono la visura (gratis per il proprietario, a pagamento per gli altri) o i documenti del cliente.

## Cosa c'era nella 12
- **Obiettivi con i selettori**: cursore con + e − al posto dei bottoni (ore a piedi da 30 minuti a 40 ore, case 1-100, notizie 1-60, ripasso dalle persone da "mai" a 120 giorni). Tenendo premuto + o − il valore scorre.
- **Tutta la zona sulla mappa**: confine esterno di tutta la zona spesso e scuro (i confini tra un comune e l'altro restano sottili e tratteggiati); dentro, verde chiaro la parte già vista e ocra chiaro quella da vedere. I confini veri dei comuni arrivano da OpenStreetMap la prima volta che si apre la vista; senza rete si usa un contorno approssimato.
- **È già in vendita?** Nella scheda della casa e nel modulo "Nuova casa": ricerca dell'indirizzo su Immobiliare.it, Idealista, Casa.it e su tutti i siti (ricerca Google), poi agenzia, prezzo e link dell'annuncio. Una casa con annuncio passa da "Da valutare" a "Cartello vendita". Prezzo e annuncio vanno anche nell'Excel e nella condivisione.
- **Barra degli strumenti** orizzontale sopra il pannello (case, posizione, strati, menu), icone più fini.
- **Profilo in alto a destra** (le iniziali): dati, obiettivi, PIN, agenti, più le indicazioni (tutorial, come si usa, pannello, impostazioni).
- **Tutorial** all'apertura (una volta, anche a chi aggiorna dalla 11): evidenzia pannello, barra, profilo e "Tutta la zona". Si rivede da Profilo o Menu → Tutorial.

## Cosa c'era nella 11 (prima "Agente Moni")
- **Profilo dell'agente**: al primo avvio nome, agenzia, telefono, zona e obiettivi della settimana. "Buongiorno, Laura" in apertura; il telefono e l'agenzia finiscono in fondo alle schede condivise.
- **La zona**: uno o più comuni, un **quartiere** di una città (dai confini di OpenStreetMap) oppure una **zona disegnata** a mano sulla mappa. "Tutta la zona" mostra tutte le aree insieme. Se si è in un'altra area della zona, l'app propone di aprirla.
- **Il mio pannello**: cose da fare oggi (richiami, notizie da verificare, persone da risentire, promemoria propri), la settimana rispetto agli obiettivi, km a piedi delle ultime 8 settimane, calendario delle uscite (12 settimane), copertura di ogni area, case per stato, cartelli delle altre agenzie in zona.
- **Taccuino**: notizie raccolte al bar, nei negozi, dai vicini (chi vende, eredita, trasloca…), con fonte, luogo, casa collegata, data di verifica e stato. **Persone della zona** con telefono e promemoria per ripassare a trovarle (ogni 15/30/60 giorni). Esportazione in Excel.
- **Navigazione più chiara**: durante il giro la rete è sbiadita; il percorso da fare è blu con frecce, i prossimi 300 m gialli con frecce scure, il tratto già fatto grigio tratteggiato, la freccia blu sul pallino indica dove si sta andando. Legenda con il tasto "strati".
- **Segno delle strade percorse**: ogni strada fatta a piedi (anche senza case) resta verde scuro per 3 mesi, poi verde chiaro.
- **Volantini**: interruttore durante il giro; le strade volantinate si vedono sulla mappa (strato "Strade con volantini") e nel pannello.
- **Uscite**: "Basta per oggi" salva l'uscita (durata, km, case, volantini) nel pannello.
- **Più agenti sullo stesso telefono** e **PIN** facoltativo (Profilo).
- **Agenzia sul cartello** nella scheda casa.

## Aggiornare il telefono (da Agente Moni 8, 9, 10 o Zona 11-14)
Niente da fare: l'app si aggiorna da sola dal collegamento di GitHub Pages. Aprila, chiudila del tutto e riaprila. Le case, le mappe e le strade viste restano; le strade viste diventano subito il "segno" dei 3 mesi. Al primo avvio compare il benvenuto con la zona già pronta: basta scrivere il nome e premere Avanti.

Il collegamento sulla schermata Home continua a funzionare; per vedere il nome e l'icona nuovi bisogna toglierlo e rimetterlo (Chrome ⋮ → Aggiungi a schermata Home).

## Installarla a un collega
1. Mandagli il link dell'app (quello di GitHub Pages).
2. Lo apre con **Chrome** su Android, menu ⋮ → **Aggiungi a schermata Home**.
3. Segue il benvenuto: nome, zona (comune, quartiere o disegnata), obiettivi.
4. Consente posizione, fotocamera e microfono quando li chiede.

## Colori sulla mappa
- **blu**: strade con case da vedere
- **blu notte**: percorse a piedi negli ultimi 3 mesi
- **grigio chiaro**: viste più di 3 mesi fa
- **ambra con frecce**: i prossimi 300 m del giro; **blu con frecce**: il resto del giro
- **grigio tratteggiato**: il pezzo di giro già fatto oggi
- **arancione a puntini**: volantini (se lo strato è acceso)
- **fumetto ambra**: notizia del taccuino; **P**: la macchina
- **linea sottile scura**: confine della zona; **nebbia**: parte della zona da vedere; **barre parallele**: fuori dalla zona

## Problemi comuni
| Problema | Soluzione |
|---|---|
| "Mappa non scaricata" | server delle mappe occupati: riprova tra qualche minuto, oppure scaricala dal computer (con Google collegato) |
| "Comune non trovato" | scrivi il nome ufficiale completo (per esempio "Paderno Franciacorta") |
| Quartiere non trovato | non tutte le città hanno i quartieri sulle mappe: disegna la zona |
| Le strade non diventano verdi | si segnano solo a piedi, durante un giro, con un buon segnale GPS |
| PIN dimenticato | senza backup i dati di quel profilo non si recuperano: fai ogni tanto Impostazioni → Salva backup |
| Non arrivano le notifiche | Chrome ⋮ → Impostazioni → Impostazioni sito → Notifiche: consenti |

## Note tecniche
- File: `index.html` (struttura), `stile.css` (aspetto), `app.js` (app), `planner.js` (mappe, strade, percorsi, quartieri e zone disegnate), `sw.js`, `manifest.webmanifest`, icone (`favicon.svg`, `icon-*.png`, `icon-maskable-*.png`, `apple-touch-icon.png`, `badge-96.png`).
- A ogni modifica alzare `?v=N` in index.html (anche per `stile.css`) e `zona-vN` e la lista `APP` in sw.js, e caricare tutti i file insieme.
- Palette: variabili in cima a `stile.css` e oggetto `C` in `app.js` (stessi valori).
- Profili in `localStorage.zona_profili`. Il primo profilo usa i dati di prima (IndexedDB `agente-moni`, ora versione 3); gli altri `zona-<id>` e chiavi con prefisso `<id>_`.
- Archivio: `reti`, `visti` (`v` strade con case viste, `p` tutte le strade percorse, `f` volantini: giorno dell'ultimo passaggio), `case`, `note`, `persone`, `agenda`, `uscite`.
- Case: campi nuovi `prezzo` (numero), `annuncio` (link), `annuncioTs`. Aree: `confine` (anelli del comune da OSM, semplificati).
- Vista zona: griglia (circa 300 mila celle) in cui ogni cella prende lo stato della strada con case più vicina; disegnata su un canvas tagliato sull'unione delle aree. Il bordo esterno si ottiene disegnando i contorni e cancellando l'interno.
- Annunci dei portali: nessuna lettura automatica (i portali non la permettono a terzi e i loro termini vietano lo sfruttamento commerciale dei contenuti); l'app apre una ricerca Google limitata al sito.
- Dati casa: `dati` (ts, catasto {codice, foglio, allegato, particella, rif}, ape {civico, via, n, righe}, osm), `categoria`, `rendita`, `sub`, `catMan` (foglio/particella scritti a mano), `superficie`, `superficieDa` (dal certificato), `omiMin`, `omiMax`. Ricerca automatica al massimo ogni 30 giorni.
- Fonti: WMS `wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php` (GetFeatureInfo su CP.CadastralParcel, EPSG:4258 poi 4326; strato GetMap in EPSG:4326), Socrata `dati.lombardia.it/resource/bbky-sde5.json` ($where su comune e via, riserva $q), Overpass (edificio entro 25 m). Se una fonte non risponde all'app (rete o blocco CORS) la scheda lo dice e restano i link.
- Il PIN è salvato come impronta SHA-256: tiene lontani i curiosi, non è una cifratura dei dati.
- Script Google invariato: taccuino, persone e uscite non vanno nel foglio; stanno nel backup.
- Mappe © OpenStreetMap (licenza ODbL): l'attribuzione resta visibile sulla mappa.
