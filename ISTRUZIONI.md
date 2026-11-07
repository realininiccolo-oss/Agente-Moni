# Giri case: come metterla in funzione

Tempo totale: circa 30-40 minuti, una volta sola.

## Contenuto della cartella
- `index.html`, `app.js`, `planner.js`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`: l'app, da mettere su GitHub Pages
- `apps-script/Code.gs`: il "backend", da incollare su script.google.com

---

## Passo 1: backend Google (sul tuo account, 10 minuti)

1. Vai su **script.google.com** con il tuo account e clicca **Nuovo progetto**.
2. Rinomina il progetto in `Giri case` (clicca su "Progetto senza titolo" in alto).
3. Cancella tutto il contenuto di `Codice.gs` e incolla il contenuto di `apps-script/Code.gs`. Salva con Ctrl+S.
4. In alto scegli la funzione **setup** e premi **Esegui**.
   - Google chiede l'autorizzazione: *Rivedi le autorizzazioni*, scegli il tuo account, poi *Avanzate*, poi *Vai a Giri case (non sicuro)*, infine *Consenti*. È normale: lo script è tuo e Google non lo ha verificato.
5. In basso compare il **Registro di esecuzione**. Copia e tieni da parte:
   - la **CHIAVE SEGRETA**
   - il link al **Foglio dati** e quello alla **Cartella foto/audio**
6. Pubblica lo script: **Esegui il deployment**, poi **Nuovo deployment**, ingranaggio, **App web**.
   - Descrizione: `v1`
   - Esegui come: **Me**
   - Chi ha accesso: **Chiunque**
   - Premi **Esegui il deployment** e copia l'**URL dell'app web** (finisce con `/exec`).

> "Chiunque" serve perché l'app sta su GitHub e non su Google. Senza la chiave segreta però lo script non legge e non scrive niente.

> Se in futuro modifichi `Code.gs`: **Esegui il deployment**, **Gestisci deployment**, matita, Versione **Nuova versione**. In questo modo l'URL resta lo stesso.

## Passo 2: condividi i dati con tua madre (2 minuti)
- Apri il **Foglio dati** e premi **Condividi**: aggiungi la sua email come *Editor*, così può cambiare stato e note dal PC.
- Fai lo stesso con la **Cartella foto/audio**, così da lei funzionano i link "Apri foto" e "Ascolta nota".

## Passo 3: metti online l'app su GitHub Pages (10 minuti)
1. Crea un account su **github.com** (gratis), se non l'hai già.
2. Clicca **New repository**, nome `giri-case`, **Public**, poi **Create repository**.
3. Clicca **uploading an existing file** e trascina i 7 file dell'app (non la cartella `apps-script`). Poi **Commit changes**.
4. Apri **Settings**, poi **Pages**. In *Branch* scegli `main` e `/ (root)`, poi **Save**.
5. Dopo 1-2 minuti l'app è online su: `https://TUONOME.github.io/giri-case/`

> Il repository pubblico contiene solo il codice. Dati, foto e chiave segreta non ci sono.

## Passo 4: installa sul telefono di tua madre (5 minuti)
1. Sul suo Android apri il link con **Chrome**.
2. Al primo avvio si apre **Impostazioni**:
   - incolla l'**URL dello script** (`…/exec`) e la **chiave segreta**
   - Comune: `Cazzago San Martino`, Giorni: `5`
   - premi **Salva e prova il collegamento**: deve comparire "Collegamento riuscito ✓"
3. Premi **Calcola i percorsi del comune**. Ci vogliono 1-3 minuti; se i server delle mappe sono occupati l'app riprova da sola. Alla fine vedi il riepilogo dei 5 giorni.
4. Menu di Chrome ⋮, poi **Aggiungi a schermata Home** (o "Installa app"). Da ora si apre come un'app normale.
5. Quando lo chiede, consenti **posizione**, **fotocamera** e **microfono**.
6. Prova in casa: premi **Casa trovata**, fai una foto, registra 3 secondi di audio, salva. Controlla che la riga compaia nel Foglio dati.

## Come si usa (da spiegare a tua madre)
- **In alto**: il giorno di oggi e quanti km mancano. Toccalo per cambiare giorno.
- **Linea blu**: il percorso da fare. Le frecce indicano la direzione, il tratto blu scuro sono i prossimi 300 m.
- **Linea verde**: dove è già passata. La traccia viene salvata e resta anche nei giorni successivi.
- **P**: dove lasciare la macchina. Toccalo e "Portami qui in macchina" apre Google Maps. Se il giorno ha più giri (P 1, P 2…), finito un giro si sposta in macchina al successivo.
- **🚗**: case isolate da guardare passando in macchina.
- **Casa trovata**: indirizzo automatico (il numero civico va controllato), foto, nota vocale, note, stato e tipo.
- **Puntino colorato**: le case salvate. Toccane uno per rivederlo.
- **Lo schermo resta acceso mentre l'app è aperta**. Se si spegne o si cambia app, il GPS si ferma e la linea verde ha un buco (il percorso non si perde). Conviene una batteria esterna.

## Monticelli Brusati (dopo)
Si apre ⚙, si scrive `Monticelli Brusati` nel campo Comune e si preme **Calcola i percorsi del comune**. Dati e avanzamento di Cazzago restano salvati.

## Problemi comuni
| Problema | Soluzione |
|---|---|
| "Chiave segreta non valida" | ricopia la chiave dal registro di `setup` |
| "Collegamento non riuscito" | l'URL deve finire con `/exec`; il deployment deve avere "Chiunque" |
| Il GPS non si muove | Impostazioni di Android, Posizione attiva e in "precisione elevata"; permesso posizione a Chrome |
| Il calcolo dei percorsi fallisce | server delle mappe occupati: riprova tra qualche minuto |
| Il microfono non funziona | Chrome, ⋮, Impostazioni, Impostazioni sito, Microfono: consenti per il sito |
