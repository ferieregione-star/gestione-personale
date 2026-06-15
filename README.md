# Gestione Personale — v63

## Cosa è cambiato rispetto a v62

La v62 teneva **tutti** i dati in un unico documento Firestore (`gestionePersonale/main`).
Ogni salvataggio riscriveva l'intero documento, e ogni client scaricava tutto il blob ad ogni
minima modifica. Questo causava: perdita di dati con scritture concorrenti, consumo rapido
delle quote gratuite di letture Firestore, notifiche/registrazioni che non arrivavano, e
instabilità generale.

La v63 divide i dati in **collezioni separate**:

- `sectors/{id}`, `areas/{id}` — settori e aree
- `users/{id}` — un documento per utente
- `events/{YYYY-MM-DD}` — un documento per giorno (mappa utente -> codice evento)
- `notifications/{id}` — ultime 80 notifiche
- `requests/{id}` — richieste password (ultime 50)
- `audit/{id}` — storico modifiche (ultime 40)
- `meta/config` — stato letture notifiche

Ogni "Salva" scrive **solo** il documento interessato. Gli eventi del calendario vengono
caricati/ascoltati solo per il mese visualizzato (più il mese corrente e i mesi del piano
ferie selezionato), non per tutto l'archivio.

## Passi per pubblicare la v63

### 1. Applica le nuove regole Firestore

Apri la console Firebase (console.firebase.google.com) -> progetto
**gestione-personale-e2fd0** -> Firestore Database -> Regole, e incolla il contenuto di
`firestore.rules` (incluso in questa cartella). Pubblica le regole.

Nota: come nella v62, non è attivo Firebase Authentication, quindi le regole sono aperte
("if true"). La sicurezza si basa sul fatto che l'URL/configurazione dell'app non è pubblica.

### 2. Esegui la migrazione dei dati (UNA SOLA VOLTA)

Prima di sostituire i file su GitHub Pages:

1. Apri `migrate-v62-to-v63.html` direttamente nel browser (basta una connessione internet,
   usa la stessa configurazione Firebase dell'app).
2. Premi "Avvia migrazione".
3. Attendi il messaggio "MIGRAZIONE COMPLETATA".

Questo copia tutti i dati esistenti (settori, aree, utenti, eventi, notifiche, richieste,
storico) dal vecchio documento unico alle nuove collezioni. **Il vecchio documento
`gestionePersonale/main` non viene cancellato** (puoi eliminarlo manualmente dalla console
Firebase dopo aver verificato che la v63 funziona correttamente).

### 3. Sostituisci i file su GitHub Pages

Carica tutti i file di questa cartella (`index.html`, `core.js`, `firestore-sync.js`,
`app.js`, `styles.css`, `sw.js`, `manifest.json`, `icons/`) nel repository GitHub Pages,
sostituendo i file esistenti. Non serve caricare `firestore.rules` e
`migrate-v62-to-v63.html` (servono solo per la configurazione iniziale), ma non è un
problema se restano nel repo.

### 4. Verifica

- Apri l'app, fai login con il super admin: `jackfrosties@hotmail.it` / `admin`
- Apri una finestra in incognito e registra un nuovo utente: deve apparire una notifica
  "Nuova utenza da abilitare" nella pagina Admin del super admin.
- Inserisci un evento (es. ferie) per un dipendente e verifica che gli altri utenti dello
  stesso settore vedano la notifica corrispondente.
- Naviga tra i mesi del calendario e del piano ferie: i dati si caricano correttamente.

## Note tecniche

- La cache locale del browser (localStorage) usa la nuova chiave `gestione_personale_v63`.
  Le vecchie chiavi `gestione_personale_v61`/`v62` non vengono più lette: dopo la migrazione,
  la fonte di verità è Firestore.
- La sessione utente è salvata in `gestione_personale_session_v63`.
- Login iniziale super admin: `jackfrosties@hotmail.it` / `admin` (cambiabile dalla pagina
  Dati personali -> richiesta cambio password, approvata dall'admin stesso).
- Limite ~16-30 utenti/dispositivi contemporanei: l'architettura a collezioni separate
  riduce drasticamente le letture Firestore rispetto al blob unico, restando ben dentro
  la quota gratuita giornaliera per questo numero di utenti.
