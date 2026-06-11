# Gestione Personale v31 - COMPLETA

Versione corretta pronta per GitHub Pages + Firebase Live.

## File da caricare su GitHub

Carica TUTTO il contenuto della cartella, non lo ZIP:

- index.html
- app.js
- styles.css
- manifest.json
- sw.js
- README.md
- FIREBASE_PROSSIMO_STEP.md
- cartella icons
  - icons/icon-192.png
  - icons/icon-512.png

## Correzioni v31

- Corretto errore `adminUser is not defined`.
- Corretta cartella PWA `icons`.
- Pulita pagina Admin da duplicati.
- Aggiornata cache service worker.
- Mantenuto Firebase Live su `gestionePersonale/main`.

## Dopo il caricamento

1. Fai commit su GitHub.
2. Aspetta 2 minuti.
3. Apri `https://ferieregione-star.github.io/gestione-personale/`.
4. Da PC premi CTRL+F5.
5. Da cellulare elimina la vecchia app dalla schermata Home e reinstallala.

## Firestore

Per ora le regole di test sono:

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
