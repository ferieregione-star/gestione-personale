# Gestione Personale — v100

## Come pubblicare su GitHub Pages

### 1. Carica i file nel repository

Sostituisci tutti i file esistenti con quelli di questa cartella:
- `index.html`
- `app.js`
- `core.js`
- `firestore-sync.js`
- `styles.css`
- `sw.js`
- `manifest.json`
- cartella `icons/` (icon-192.png, icon-512.png)

I file `firestore.rules` e `migrate-v62-to-v63.html` sono inclusi per riferimento ma non servono su GitHub Pages.

### 2. Regole Firestore

Se non le hai già applicate dalla v63, incolla il contenuto di `firestore.rules` nella console Firebase → Firestore Database → Regole.

### 3. Verifica

- Login super admin: `jackfrosties@hotmail.it` / `admin`
- Il service worker usa la cache `gestione-personale-v100`, quindi tutti i dispositivi scaricheranno automaticamente i nuovi file alla prima visita.

---

## Novità v100

### Calendario
- **Click su un giorno** → apre subito il popup centrato a schermo (su PC e mobile)
- **Popup giorno**: mostra **TUTTI IN SERVIZIO** (banner verde) se non ci sono assenti, altrimenti lista con nome cognome + area + stato. Il pulsante **Rimuovi** è nel popup direttamente.
- **Pulsante inserimento**: icona + "Inserisci assenza" nel popup → secondo popup con griglia codici (nessun menu a tendina)
- **Riepilogo giorno** (sotto il calendario): mostra nome cognome + area per ogni assente, senza legenda in fondo
- **Filtri vista**: pulsanti **Settore / Area / Personale** per filtrare chi vedere nel calendario. La vista "Personale" (o "Solo io" per i dipendenti) mostra solo i propri eventi
- **Pulsante "Torna a oggi"**: piccolo cerchio ↺ nella toolbar, affiancato al mese, non più a tutta larghezza

### Piano ferie
- **Due colonne di nomi** per giorno: sinistra = prima area (es. Prevenzione), destra = seconda area (es. Veterinaria)
- **Numero del giorno più grande** e centrato in alto nella card
- **Rimossa la parola "Insieme"** — il titolo mostra solo il nome del settore

### Riepilogo
- Rimossa la riga con le note piccole in fondo a ogni scheda

### Mobile
- **Giorno selezionato**: evidenziato in verde chiaro, senza bordo grosso blu
- **Dopo chiusura popup / inserimento / rimozione**: il giorno si deseleziona automaticamente, il calendario torna allo stato neutro
- CSS completamente riscritto da zero: un solo blocco coerente, nessun override accumulato da versioni precedenti
