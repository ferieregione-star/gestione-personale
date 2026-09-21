# Aggiornamento SW v203

Basato sul repository v202, commit 58f2f66187fed7c327a65062afac5b699e3a4575.

- Per dipendente: un solo giorno SW per settimana, con blocco già esistente.
- Per AREA: al massimo due SW nello stesso giorno e al massimo una giornata con due o più SW nella settimana. Le due anomalie sono segnalate, ma il salvataggio è consentito.
- Aree diverse sono indipendenti, anche nello stesso settore.
- Nel riepilogo giornaliero compare l'ora di inserimento solo per SW. Per eventi storici senza createdAt viene indicato esplicitamente l'orario di registrazione/ultima modifica disponibile (updatedAt), che potrebbe non coincidere con l'inserimento originale.
- Gli SW futuri registrano createdAt in Firestore; l'aggiornamento successivo dello stesso SW non lo sovrascrive.
- Le settimane a cavallo di due mesi caricano entrambi i mesi necessari al controllo.
- Versione risorse PWA aggiornata a v203, chiave localStorage invariata, database e identificativi Firestore invariati.

## Pubblicazione

Caricare nella radice del repository i file del pacchetto, mantenendo le stesse cartelle. Non cancellare il database Firebase e non modificare la configurazione del progetto Firebase. Gli utenti online ricevono i nuovi file al ricaricamento; per le PWA installate può essere necessario chiudere e riaprire l'app o ricaricare la pagina per attivare il nuovo service worker.

Nota: le regole Firestore contenute nel repository sono quelle preesistenti e NON sono state distribuite automaticamente nel progetto Firebase. Verificare le regole effettivamente pubblicate prima di usare l'app con dati personali.
