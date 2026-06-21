# Gestione Personale — v105

Versione aggiornata della web app PWA per gestione personale, ferie, smart working, malattia, riepiloghi e piano ferie.

## Modifiche v105

- Legenda di Calendario e Riepilogo resa contestuale al settore selezionato.
- Se è selezionato **Settore 4**, la legenda mostra solo:
  - Smart working — Prevenzione
  - Smart working — Veterinaria
- Se è selezionato **Settore 7**, la legenda mostra solo:
  - Smart working — Territorio
  - Smart working — Convenzionata
- Le icone della legenda sono state rese tonde, compatte e con testo più piccolo.
- Nessuna modifica alla logica dati principale rispetto alla v104.
- Aggiornati cache, localStorage e riferimenti asset a `v105`.

## File da pubblicare su GitHub Pages

Carica nella root del repository:

- `index.html`
- `styles.css`
- `core.js`
- `firestore-sync.js`
- `app.js`
- `manifest.json`
- `sw.js`
- `firestore.rules`
- cartella `icons/` con `icon-192.png` e `icon-512.png`

Non caricare una cartella contenitore: `index.html` deve stare direttamente nella root.

## Dopo il deploy

Se vedi ancora la vecchia versione, fai refresh forzato o reinstalla la PWA.
