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


## v32
- Layout mobile calendario rifatto stile app: 5 card quadrate per settimana.
- Cambio mese sulla stessa riga.
- Inserimento ferie/SW in cima al popup sia mobile che desktop.
- Desktop lasciato invariato nella logica.


## v33
- Piano ferie mobile come calendario: 5 card per riga, barra e percentuale; dettaglio al tap.
- Settore 4: aree Prevenzione/Veterinaria.
- Settore 7: aree Territorio/Convenzionata.
- Accreditamento rimosso dai predefiniti.
- Super admin può creare nuovi settori e aree.
- Etichetta utente aggiornata.


## v34
- Corretto popup al tap sulle card del piano ferie mobile.
- Nomi abbreviati nelle card piano ferie.
- Evitata sovrapposizione percentuale/data/barra in mobile.
- Aumentata altezza card desktop piano ferie.


## v35
- Corretto definitivamente popup piano ferie al tap da mobile.
- Uniformati nomi Prevenzione/Veterinaria su una riga.
- Card piano ferie desktop più alte e testo ridotto/ellissi.


## v36
- Piano ferie: popup mobile reso stabile tramite data attribute.
- Desktop: nomi ferie impilati, prima area blu poi area rossa, in ordine alfabetico.
- Rimossa divisione destra/sinistra nelle card del piano ferie.


## v37
- Versione completa aggiornata.
- Piano ferie mobile: popup al tap sulla card.
- Piano ferie desktop: nomi uno sotto l'altro, prima area blu poi area rossa, ordine alfabetico.
- Rimossa visualizzazione destra/sinistra nelle card del piano ferie.
- Cache PWA aggiornata a v37.


## v40 STRUTTURA STABILE
- Sessione persistente dopo refresh.
- Tasto Indietro globale.
- Popup piano ferie rifatto.
- Piano ferie desktop con nomi impilati per area e ordinati.
- Cache PWA v40.


## v41
- Avvisi SW solo nel popup card.
- Tap piano ferie robusto mobile/desktop.
- PDF piano ferie un mese per foglio, senza pagina iniziale vuota, titolo senza INSIEME.


## v50 STABILE
Questa versione blocca le nuove funzioni e consolida:
- sessione persistente dopo refresh;
- popup piano ferie mobile/desktop con listener robusto;
- tasto indietro;
- cache PWA aggiornata;
- export PDF piano ferie più pulito;
- avvisi SW visibili solo entrando nel giorno/card.


## v51 CODICI ASSENZE
- Registrazione: C01, C02, F14 residue.
- Inserimenti: C01, C02, F14, SW, A01, ALTRO.
- Riepilogo: residui e usati separati per C01/C02/F14, conteggi SW/A01/ALTRO.
- Piano ferie considera C01/C02/F14 come ferie.
- Migrazione automatica: vecchie ferie=C01, malattia=A01, permesso=F14.
