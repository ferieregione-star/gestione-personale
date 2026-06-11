# Gestione Personale - PWA GitHub Ready

Questa cartella è pronta per essere pubblicata su GitHub Pages come PWA installabile su iPhone e Android.

## Importante sui dati condivisi

GitHub Pages pubblica solo file statici. Quindi:

- con questa versione i dati sono salvati nel browser del dispositivo tramite `localStorage`;
- se Mario entra dal suo telefono e Roberta dal suo PC, senza database esterno non vedono gli stessi dati;
- per uso reale multiutente serve un database online, ad esempio Firebase, Supabase o un backend dedicato.

Questa versione è pronta per GitHub e installabile come PWA, ma per dati condivisi in tempo reale bisogna aggiungere un backend.

## Come pubblicarla su GitHub Pages

1. Vai su https://github.com
2. Crea un nuovo repository, ad esempio `gestione-personale`
3. Carica tutti i file di questa cartella:
   - `index.html`
   - `app.js`
   - `styles.css`
   - `manifest.json`
   - `sw.js`
   - cartella `icons`
4. Vai in **Settings**
5. Vai in **Pages**
6. In **Build and deployment** scegli:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
7. Salva.
8. Dopo qualche minuto GitHub ti darà il link pubblico.

## Come installarla su iPhone

1. Apri il link GitHub Pages da Safari.
2. Premi il pulsante Condividi.
3. Premi **Aggiungi alla schermata Home**.
4. Apri l’app dall’icona.

## Come installarla su Android

1. Apri il link con Chrome.
2. Premi i tre puntini.
3. Premi **Installa app** oppure **Aggiungi a schermata Home**.

## Come non perdere i dati quando aggiorni l’app

Prima di caricare una nuova versione:

1. Entra come super admin.
2. Vai in **Admin**.
3. Premi **Esporta backup JSON**.
4. Conserva il file.

Dopo aver pubblicato una nuova versione:

1. Entra come super admin.
2. Vai in **Admin**.
3. Premi **Importa backup JSON**.
4. Seleziona il file salvato.

La nuova versione contiene una piccola migrazione dati per recuperare dati dalle versioni precedenti se sono nello stesso browser.

## Per uso reale multiutente

Per far usare l’app contemporaneamente a più persone, serve collegarla a un database online.

Soluzione consigliata:
- Firebase Authentication per login reale
- Firebase Firestore per dati condivisi
- Firebase Hosting oppure GitHub Pages per i file statici

Da fare nella prossima fase:
1. Creare progetto Firebase.
2. Creare Firestore.
3. Spostare `db` da `localStorage` a Firestore.
4. Usare regole di sicurezza per admin/referente/dipendente/dirigente.
5. Mantenere export/import backup.

## File principali

- `index.html`: pagina principale
- `app.js`: logica gestionale
- `styles.css`: grafica responsive
- `manifest.json`: configurazione PWA
- `sw.js`: funzionamento offline/installabile
- `icons`: icone app
