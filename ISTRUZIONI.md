# Agente Moni

## Aggiornare dalla versione "Giri case" (se l'hai già installata)
Tempo: circa 10 minuti. Le case e le tracce già salvate restano.

1. **Script Google**: apri il progetto su script.google.com, sostituisci tutto il contenuto di `Codice.gs` con il nuovo `apps-script/Code.gs` e salva. **Non** rieseguire `setup`: foglio, cartella e chiave restano gli stessi.
   Poi **Esegui il deployment**, **Gestisci deployment**, matita ✏️, Versione: **Nuova versione**, **Esegui il deployment**. L'URL `/exec` non cambia.
2. **GitHub**: nel repository premi **Add file**, poi **Upload files**, trascina i 7 file nuovi (index.html, app.js, planner.js, sw.js, manifest.webmanifest, icon-192.png, icon-512.png) e premi **Commit changes**. Il nome del repository può restare `giri-case`.
3. **Telefono**: dopo 2 minuti apri l'app, chiudila e riaprila. Così si carica la nuova versione.
4. L'app chiede di **calcolare di nuovo i percorsi**: serve perché ora contengono anche i nomi delle vie. Premi il pulsante e aspetta 1-3 minuti.
5. Se l'icona sulla schermata Home ha ancora il nome vecchio, cancellala e reinstallala: menu ⋮ di Chrome, **Aggiungi a schermata Home**.

## Come la usa tua madre
1. Apre l'app e vede **Giorno 1**: km e tempo. Preme **Inizia il giorno 1**.
2. In alto compare **Parcheggia in Via …**. Il pulsante giallo apre Google Maps per arrivarci in macchina. Quando è lì, l'app se ne accorge e mostra **Inizia a camminare**.
3. Mentre cammina, il riquadro in alto dice cosa fare, per esempio **Tra 80 m gira a destra in Via Garibaldi**:
   - **Guarda le case** (etichetta gialla): strada con case, da guardare con calma
   - **Solo passaggio**: tratto già visto o senza case, da fare spedita
4. Sulla mappa:
   - **verde**: già fatto, anche nei giorni passati
   - **giallo con frecce**: i prossimi 300 m
   - **blu pieno**: case ancora da vedere
   - **blu a puntini**: solo passaggio
5. Se esce dal percorso, il riquadro diventa rosso e dice quanto è lontana la linea gialla.
6. **Nuova casa**: l'indirizzo si compila da solo. Poi si fanno le foto, si tocca il microfono per la nota vocale (si tocca di nuovo per fermarla), si sceglie lo stato e si salva. Se manca la rete, la casa resta in attesa sul telefono e parte da sola appena la rete torna ("1 casa in invio…").
7. Ogni stato ha un segnaposto diverso sulla mappa:
   - **?** grigio: da valutare
   - **€** rosso: cartello vendita
   - **chiave** viola: cartello affitto
   - **stella** verde: interessante
   - **telefono** ocra: da ricontattare
   - **✕** grigio chiaro: scartata

   Toccando un segnaposto si può cambiare lo stato. Il tasto con la **casetta** apre l'elenco delle case.
8. Finito un giro, l'app dice dove spostare la macchina per il successivo. A fine giornata ricorda le case isolate da vedere in macchina, poi prepara il giorno dopo.
9. Nel menu ☰ ci sono **Indicazioni a voce** (il telefono dice dove girare), **Scegli il giorno**, **Ricomincia** o **Salta questo giro**.

---

## Prima installazione (da zero)

Tempo totale: circa 30-40 minuti, una volta sola.

## Contenuto della cartella
- `index.html`, `app.js`, `planner.js`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`: l'app, da mettere su GitHub Pages
- `apps-script/Code.gs`: il "backend", da incollare su script.google.com

---

## Passo 1: backend Google (sul tuo account, 10 minuti)

1. Vai su **script.google.com** con il tuo account e clicca **Nuovo progetto**.
2. Rinomina il progetto in `Agente Moni` (clicca su "Progetto senza titolo" in alto).
3. Cancella tutto il contenuto di `Codice.gs` e incolla il contenuto di `apps-script/Code.gs`. Salva con Ctrl+S.
4. In alto scegli la funzione **setup** e premi **Esegui**.
   - Google chiede l'autorizzazione: *Rivedi le autorizzazioni*, scegli il tuo account, poi *Avanzate*, poi *Vai a Agente Moni (non sicuro)*, infine *Consenti*. È normale: lo script è tuo e Google non lo ha verificato.
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
2. Clicca **New repository**, nome `agente-moni`, **Public**, poi **Create repository**.
3. Clicca **uploading an existing file** e trascina i 7 file dell'app (non la cartella `apps-script`). Poi **Commit changes**.
4. Apri **Settings**, poi **Pages**. In *Branch* scegli `main` e `/ (root)`, poi **Save**.
5. Dopo 1-2 minuti l'app è online su: `https://TUONOME.github.io/agente-moni/`

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
