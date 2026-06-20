# Gestione Personale — v101

Web app PWA per gestione personale, ferie, smart working, malattia, notifiche e piano ferie.

## File da pubblicare su GitHub Pages

Carica nella root del repository:

- `index.html`
- `styles.css`
- `core.js`
- `firestore-sync.js`
- `app.js`
- `manifest.json`
- `sw.js`
- cartella `icons/` con `icon-192.png` e `icon-512.png`
- `firestore.rules` se usi Firebase CLI

Non caricare una cartella contenitore tipo `gp-work/`: `index.html` deve stare direttamente nella root.

## Login iniziale

Super admin iniziale:

- email: `jackfrosties@hotmail.it`
- password: `admin`

Cambia subito la password dopo il primo accesso.

## Correzioni applicate

- Versione aggiornata a `v101` in core, cache e localStorage.
- Service worker reso più robusto: se un asset manca, l'installazione non blocca tutta l'app.
- Rimosso il fallback password `1234` per reset e creazione collega.
- Aggiunti controlli minimi password da 6 caratteri.
- Input password mascherati dove modificabili.
- File rinominati in modo pulito per GitHub Pages.


## Correzione v101

- Corretto il calendario del ruolo `Dirigente`: ora il filtro `Settore` viene rispettato.
- Corretto il filtro per area del dirigente: i chip area (`Prevenzione`, `Veterinaria`, `Territorio`, `Convenzionata`) mostrano solo l’area selezionata.
- Aggiornata la cache del service worker a `gestione-personale-v101` per forzare l’aggiornamento sui dispositivi.

## Nota sicurezza

Questa versione mantiene il login legacy interno all'app e non usa Firebase Authentication. Per questo motivo le regole Firestore incluse sono ancora compatibili con l'app ma non sono adatte a dati sensibili in produzione. La prossima modifica importante dovrebbe essere la migrazione a Firebase Authentication con password non salvate nella collezione `users`.
