# Gestione Personale v28 - Firebase Live

Questa versione è collegata a Firebase Firestore e sincronizza i dati tra più dispositivi.

## Cosa fa

- PWA installabile su iPhone e Android
- Dati condivisi tra utenti
- Ferie / smart working sincronizzati
- Notifiche e piano ferie condivisi
- Backup JSON ancora disponibile

## Prima configurazione Firestore

Per testare subito, nelle regole Firestore incolla TEMPORANEAMENTE queste regole:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /gestionePersonale/main {
      allow read, write: if true;
    }
  }
}
```

Queste regole sono aperte: servono solo per testare il collegamento.

## Regole definitive

Dopo il test si passa a Firebase Authentication e regole sicure per:
- super admin
- referente
- dirigente
- dipendente

## Pubblicazione GitHub Pages

Carica tutti questi file nel repository:

- index.html
- app.js
- styles.css
- manifest.json
- sw.js
- icons/
- README.md

Poi GitHub Pages pubblicherà l'app come prima.

## Nota importante

Questa v28 usa Firestore come documento unico condiviso:
`gestionePersonale/main`

È il modo più veloce per trasformare il prototipo locale in multiutente live.
Quando confermi che funziona, conviene passare alla v29 con collezioni separate e regole di sicurezza più precise.
