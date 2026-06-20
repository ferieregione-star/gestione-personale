# Gestione Personale — v102 dirigente fix reale

Questa versione contiene una modifica effettiva al calendario del ruolo **Dirigente**.

## Fix applicato

- In `core.js`, `visibleUsers()` ora filtra il dirigente anche per `selectedSectorId`.
- In `app.js`, `visibleUsersForCalendar()` ora usa le chip area per filtrare davvero una sola area.
- Se il dirigente seleziona **Settore 4**, non vede più i dati del **Settore 7**.
- Se il dirigente seleziona **Convenzionata**, vede solo Convenzionata.
- Cache service worker aggiornata a `gestione-personale-v102`.
- `index.html` carica `core.js`, `firestore-sync.js`, `app.js`, `styles.css` con `?v=102` per evitare vecchia cache GitHub/browser.

## File da caricare nella root GitHub Pages

Carica direttamente questi file nella root del repository, non dentro una sottocartella:

- `index.html`
- `styles.css`
- `core.js`
- `firestore-sync.js`
- `app.js`
- `manifest.json`
- `sw.js`
- `firestore.rules`
- cartella `icons/`

## Dopo il caricamento

Sul telefono/computer fai un refresh forzato. Se usi PWA installata, chiudila e riaprila. Se continua a mostrare la vecchia versione, rimuovi la PWA e reinstallala.
