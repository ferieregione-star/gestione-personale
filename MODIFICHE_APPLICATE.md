# Modifiche applicate — v103

## 1. Calendario dirigente

Il calendario dirigente è stato allineato alla logica del Piano ferie.

Prima il calendario usava una logica mista:

- settore da menu;
- area da chip;
- `calendarView`;
- `selectedAreaFilter`.

Questa combinazione poteva mostrare dati del settore sbagliato o tutte le aree insieme.

Ora il dirigente usa solo:

- `selectedSectorId` per il settore;
- `selectedAreaFilter` per l'area.

Le chip area sono state rimosse solo per il dirigente.

## 2. Notifiche

Le notifiche sono state mantenute solo per il Super Admin.

Sono state eliminate le scritture Firestore per le notifiche di settore create quando qualcuno inserisce o rimuove assenze.

Restano notifiche admin per:

- nuova registrazione utente;
- richiesta reset/cambio password.

## 3. Versione

Tutti i riferimenti sono stati aggiornati a `v103`.

- Cache service worker: `gestione-personale-v103`
- Query string asset: `?v=103`
- Local storage: `gestione_personale_v103`
