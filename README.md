# Gestione Personale — v106 no malattia

Versione aggiornata della web app PWA per gestione personale, ferie, smart working, riepiloghi e piano ferie.

## Modifiche v106

- Rimosso completamente il codice relativo alla malattia dall'app.
- Codici disponibili: `SW`, `C01`, `C02`, `F14`, `ALTRO`.
- Riepiloghi aggiornati senza conteggio malattia.
- Legende aggiornate senza voce malattia.
- Eventuali vecchi eventi `a01`/`malattia` vengono letti come `ALTRO`, così l'app non si rompe con dati precedenti.
- Versione, cache e riferimenti aggiornati a `v106`.

## File da caricare nella root GitHub Pages

Carica direttamente questi file nella root del repository:

- `index.html`
- `styles.css`
- `core.js`
- `firestore-sync.js`
- `app.js`
- `manifest.json`
- `sw.js`
- `firestore.rules`
- cartella `icons/`

Dopo il deploy fai refresh forzato o reinstalla la PWA se continua a mostrare file vecchi.
