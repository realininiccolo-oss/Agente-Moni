# Agente Moni — versione 9

App per agenti immobiliari che girano i paesi a piedi. Funziona in qualsiasi comune italiano presente su OpenStreetMap, senza account e senza configurazione.

## Cosa fa
- **Percorso dal vivo**: si sceglie quanto tempo si ha (30 min … 6 ore, o senza limite) e l'app calcola un giro a piedi, partendo da dove si è, sulle strade con case non ancora viste. Si torna alla macchina in orario.
- **Si aggiorna da solo**: se si prende un'altra strada, il percorso viene ricalcolato dalla posizione attuale. Se si va piano lo accorcia, se si va veloce aggiunge strade.
- **Strade viste**: ogni strada diventa verde quando ci si passa a piedi, anche fuori dal percorso. In macchina (sopra i 10 km/h) non si segna niente. Facoltativo: dopo 6 mesi o 1 anno le strade tornano "da rivedere".
- **Da lontano**: propone le zone più vicine con case da vedere e porta al parcheggio con Google Maps.
- **Schede casa**: indirizzo automatico (anche senza internet), foto, nota vocale, stato, tipo, telefono del cartello con tasto Chiama, note. Avvisa se in quel punto c'è già una casa salvata.
- **Condivisione**: una casa si manda su WhatsApp con foto e posizione; l'elenco si esporta in Excel; il backup completo serve per cambiare telefono.
- **Case isolate**: cascine e case lontane dal paese, da vedere in macchina; si segnano da sole passandoci vicino.
- **Google (facoltativo)**: con lo script Google già fatto, le case vanno anche nel foglio condiviso e mappa e strade viste passano da un dispositivo all'altro.

## Aggiornare il telefono di mamma (dalla versione 8)
Tempo: 5 minuti. Lo script Google **non** va toccato.

1. Su GitHub, nel repository: **Add file → Upload files**, trascina tutti i file dello zip (index.html, app.js, planner.js, sw.js, manifest.webmanifest, icon-192.png, icon-512.png, ISTRUZIONI.md) e premi **Commit changes**. Vanno caricati tutti insieme.
2. Dopo 2 minuti, sul telefono apri l'app, chiudila del tutto e riaprila.
3. Al primo avvio l'app scarica la mappa del comune (1-3 minuti, una volta sola per comune). Le strade dei giri già fatti con la versione 8 vengono segnate come viste e compare la spiegazione "Come si usa".
4. Se i server delle mappe sono occupati, apri l'app dal computer con lo stesso collegamento Google e scegli il comune: la mappa finisce su Drive e il telefono la prende da lì.

## Installarla a un collega (senza Google)
1. Mandagli il link dell'app (quello di GitHub Pages).
2. Lo apre con **Chrome** su Android, menu ⋮ → **Aggiungi a schermata Home**.
3. Tocca **Usa il comune dove sono** (oppure scrive il nome) e aspetta che la mappa sia pronta.
4. Consente posizione, fotocamera e microfono quando li chiede.

I suoi dati restano sul suo telefono. Per non perderli conviene fare ogni tanto **Menu → Impostazioni → Salva backup**.

## Colori sulla mappa
- **blu**: strade con case da vedere
- **verde**: già viste
- **giallo con frecce**: i prossimi 300 m del percorso
- **blu a puntini**: solo passaggio (già visto o senza case)
- **P**: dove è la macchina

## Problemi comuni
| Problema | Soluzione |
|---|---|
| "Mappa non scaricata" | server delle mappe occupati: riprova tra qualche minuto, oppure scaricala dal computer (con Google collegato) |
| "Comune non trovato" | scrivi il nome ufficiale completo (per esempio "Paderno Franciacorta", non "Paderno") |
| Il GPS non si muove | Android: Posizione attiva e precisione elevata; permesso posizione a Chrome |
| Le strade non diventano verdi | si segnano solo a piedi e con un buon segnale GPS (sotto i 30 m di errore) |
| Il microfono non funziona | Chrome ⋮ → Impostazioni → Impostazioni sito → Microfono: consenti |

## Note tecniche
- File: `index.html` (interfaccia), `app.js` (app), `planner.js` (mappe, strade viste, calcolo dei percorsi), `sw.js` (funzionamento con poca rete).
- A ogni modifica alzare `?v=N` in index.html e `agente-moni-vN` in sw.js, e caricare sempre tutti i file insieme.
- Dati sul telefono (IndexedDB `agente-moni`): `reti` (mappa del comune), `visti` (giorno in cui ogni pezzo di strada è stato visto), `case` (case con foto e audio).
- Su Drive (solo con Google): `percorsi_<comune> (rete v4).json` e `percorsi_<comune> (copertura).json`, salvati con le azioni già esistenti dello script.
- Mappe © OpenStreetMap (licenza ODbL): l'attribuzione resta visibile sulla mappa.
