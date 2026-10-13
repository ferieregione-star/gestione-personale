# Installazione notifiche (Firebase Spark, OneSignal, GitHub Actions)

1. Pubblica prima **firestore.rules** nella console Firebase → Firestore Database → Regole → Pubblica. Le regole NON vengono pubblicate caricando lo ZIP su GitHub.
2. Sostituisci sul repository GitHub i file dello ZIP, mantenendo la stessa struttura delle cartelle, inclusa `.github/workflows/` e `scripts/`.
3. Controlla i tre GitHub Actions Secrets già configurati: `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `ONESIGNAL_API_KEY`. Non scrivere mai il valore delle chiavi nei file pubblici.
4. Fai un test di inserimento e cancellazione con un utente autorizzato. Verifica nella console Firestore la raccolta `eventChanges`.
5. In GitHub → Actions → **Notifiche push automatiche** → Run workflow avvia il test. Il controllo programmato avviene ogni ~5 minuti (GitHub può ritardarlo).
6. Tutti i destinatari devono aver effettuato accesso e attivato le notifiche sul proprio dispositivo.

## Limiti importanti

- Non è una consegna istantanea o garantita: GitHub Actions può ritardare o saltare esecuzioni; la finestra di 12 minuti mitiga ma non elimina il rischio. Non viene mantenuto un cursore persistente.
- OneSignal usa l'`external_id` Firebase associato dal browser: senza verifica dell'identità OneSignal tramite server, un client malevolo potrebbe impersonare un ID. Per ridurre l'esposizione, i messaggi push non contengono nomi, date o causali delle assenze. Per informazioni sensibili serve un backend di verifica.
- Le modifiche anteriori all'installazione non vengono notificate.
- La cancellazione massiva di un utente può produrre molte notifiche.
- Le regole limitano accessi e modifiche ma la sicurezza completa richiede anche test dei ruoli e delle query con Firebase Emulator prima dell'uso su dati reali.
- I referenti con più aree ricevono notifiche relative alla loro `areaId` personale, non automaticamente a tutte le aree gestite: scelta coerente con la richiesta 'stessa Area'.
