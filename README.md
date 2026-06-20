# Gestione Personale — v100 clean

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

- Versione resa coerente a `v100` in core, cache e localStorage.
- Service worker reso più robusto: se un asset manca, l'installazione non blocca tutta l'app.
- Rimosso il fallback password `1234` per reset e creazione collega.
- Aggiunti controlli minimi password da 6 caratteri.
- Input password mascherati dove modificabili.
- File rinominati in modo pulito per GitHub Pages.

## Nota sicurezza

Questa versione mantiene il login legacy interno all'app e non usa Firebase Authentication. Per questo motivo le regole Firestore incluse sono ancora compatibili con l'app ma non sono adatte a dati sensibili in produzione. La prossima modifica importante dovrebbe essere la migrazione a Firebase Authentication con password non salvate nella collezione `users`.
