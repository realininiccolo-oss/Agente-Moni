# Zona — versione 11

L'app per il **farming immobiliare**: l'agente lavora sempre la stessa zona (alcuni comuni, oppure un quartiere in città), la gira a piedi, conosce le case e raccoglie notizie dalle persone del posto. Zona tiene tutto in ordine. Funziona in qualsiasi zona italiana presente su OpenStreetMap; i dati restano sul telefono.

## Cosa c'è di nuovo nella 11 (prima "Agente Moni")
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

## Aggiornare il telefono (da Agente Moni 8, 9 o 10)
Niente da fare: l'app si aggiorna da sola dal collegamento di GitHub Pages. Aprila, chiudila del tutto e riaprila. Le case, le mappe e le strade viste restano; le strade viste diventano subito il "segno" dei 3 mesi. Al primo avvio compare il benvenuto con la zona già pronta: basta scrivere il nome e premere Avanti.

Il collegamento sulla schermata Home continua a funzionare; per vedere il nome e l'icona nuovi bisogna toglierlo e rimetterlo (Chrome ⋮ → Aggiungi a schermata Home).

## Installarla a un collega
1. Mandagli il link dell'app (quello di GitHub Pages).
2. Lo apre con **Chrome** su Android, menu ⋮ → **Aggiungi a schermata Home**.
3. Segue il benvenuto: nome, zona (comune, quartiere o disegnata), obiettivi.
4. Consente posizione, fotocamera e microfono quando li chiede.

## Colori sulla mappa
- **blu**: strade con case da vedere
- **verde scuro**: percorse a piedi negli ultimi 3 mesi
- **verde chiaro**: viste più di 3 mesi fa
- **giallo con frecce**: i prossimi 300 m del giro; **blu con frecce**: il resto del giro
- **grigio tratteggiato**: il pezzo di giro già fatto oggi
- **arancione a puntini**: volantini (se lo strato è acceso)
- **fumetto giallo**: notizia del taccuino; **P**: la macchina

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
- File: `index.html` (interfaccia), `app.js` (app), `planner.js` (mappe, strade, percorsi, quartieri e zone disegnate), `sw.js`.
- A ogni modifica alzare `?v=N` in index.html e `zona-vN` in sw.js, e caricare tutti i file insieme.
- Profili in `localStorage.zona_profili`. Il primo profilo usa i dati di prima (IndexedDB `agente-moni`, ora versione 3); gli altri `zona-<id>` e chiavi con prefisso `<id>_`.
- Archivio: `reti`, `visti` (`v` strade con case viste, `p` tutte le strade percorse, `f` volantini: giorno dell'ultimo passaggio), `case`, `note`, `persone`, `agenda`, `uscite`.
- Il PIN è salvato come impronta SHA-256: tiene lontani i curiosi, non è una cifratura dei dati.
- Script Google invariato: taccuino, persone e uscite non vanno nel foglio; stanno nel backup.
- Mappe © OpenStreetMap (licenza ODbL): l'attribuzione resta visibile sulla mappa.
