# Correzioni v210

- Campanella notifiche interne Super Admin: invariata nella funzione, ora senza cerchio.
- Campanella OneSignal separata, vettoriale, con ✓ verde soltanto se la sottoscrizione SDK risulta attiva e permesso concesso, × rossa altrimenti.
- Profilo: invio richiesta di cambio password al Super Admin, senza inserire o salvare password in Firestore.
- Admin: elenco richieste, approvazione e rifiuto.

## LIMITAZIONE IMPORTANTE

La scelta e l'impostazione diretta della nuova password da parte del Super Admin NON è implementata: Firebase Authentication impedisce a un browser amministrativo di cambiare la password di un altro utente. Occorre un servizio backend privilegiato (Firebase Admin SDK) con credenziali custodite lato server. Premere Approva NON modifica la password. Non inserire password in Firestore o nelle richieste.

Per rendere effettiva una reimpostazione nell'attesa, l'utente può usare «Password dimenticata?» nella schermata di accesso e scegliere la password dal collegamento email.

Caricare i file della cartella nella radice del repository, conservando le cartelle .github, onesignal, scripts e icons.
