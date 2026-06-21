# Gestione Personale — v103

Versione aggiornata con due modifiche richieste:

## Calendario dirigente

Il calendario del ruolo **Dirigente** ora usa la stessa logica del **Piano ferie**:

- menu a tendina per il settore;
- menu a tendina per l'area;
- opzione "Tutto il settore";
- filtro coerente su `selectedSectorId` e `selectedAreaFilter`;
- rimosse le chip area dal calendario del dirigente per evitare conflitti.

Esempi:

- se il dirigente seleziona **Settore 4**, vede solo il Settore 4;
- se seleziona **Veterinaria**, vede solo Veterinaria;
- se seleziona **Settore 7 → Convenzionata**, vede solo Convenzionata.

## Notifiche

Le notifiche sono state limitate al solo **Super Admin**.

- Dipendenti: nessuna campanella, nessuna notifica.
- Referenti: nessuna campanella, nessuna notifica.
- Dirigenti: nessuna campanella, nessuna notifica.
- Super Admin: mantiene le notifiche admin, per esempio nuove registrazioni e richieste password.

Le notifiche di settore generate da inserimento/rimozione assenze non vengono più salvate su Firestore.

## Versione e cache

- `core.js`: `v103`
- `app.js`: `v103`
- `firestore-sync.js`: `v103`
- `sw.js`: cache `gestione-personale-v103`
- `index.html`: riferimenti aggiornati con `?v=103`

## Deploy GitHub Pages

Carica tutto il contenuto di questa cartella nella root del repository GitHub Pages.

La root deve contenere direttamente:

- `index.html`
- `styles.css`
- `core.js`
- `firestore-sync.js`
- `app.js`
- `manifest.json`
- `sw.js`
- `firestore.rules`
- cartella `icons/`

Dopo il caricamento, fai refresh forzato. Se usi la PWA installata sul telefono, chiudila e riaprila; se continua a caricare la vecchia versione, disinstalla e reinstalla la PWA.
