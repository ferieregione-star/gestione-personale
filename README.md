# Gestione Personale v60 - Produzione pulita

Versione pronta per GitHub Pages + Firebase.

## Contiene solo

- `index.html`
- `app.js`
- `styles.css`
- `manifest.json`
- `sw.js`
- `icons/icon-192.png`
- `icons/icon-512.png`

## Utenti iniziali

Rimane solo il super admin:

- email: `jackfrosties@hotmail.it`
- password iniziale: `admin`

Il login NON mostra più credenziali precompilate.

## Settori iniziali

- Settore 4
  - Prevenzione
  - Veterinaria

- Settore 7
  - Territorio
  - Convenzionata

Il super admin può creare nuovi settori e nuove aree.

## Ruoli

- Super admin: modifica tutto, crea settori/aree, abilita utenti.
- Dirigente: può vedere uno o più settori.
- Referente: può gestire una o più aree.
- Dipendente: modifica solo le proprie assenze.

## Codici assenze

- C01 ferie anno attuale
- C02 ferie anno precedente
- F14 festività soppresse
- SW smart working
- A01 malattia
- ALTRO

## Nota importante

Questa versione rimuove automaticamente gli utenti demo storici salvati nel database Firestore o nella memoria locale.


## v61 FIX REGISTRAZIONE
- Corretto campo password registrazione: `regPassword`.
- Registrazione ora salva immediatamente su Firestore.
- Dopo "Invia registrazione" torna al login con messaggio "in attesa di approvazione".
- Il super admin vede la richiesta tra le registrazioni da approvare.
- Cache PWA aggiornata a v61.
