# Prossimo step: dati condivisi online

Per rendere i dati condivisi tra più persone, GitHub Pages non basta.

Serve collegare l'app a un database, per esempio Firebase Firestore.

Schema dati consigliato:

- `users`
- `events`
- `notifications`
- `requests`
- `audit`
- `settings/sectors`
- `settings/areas`
- `ruleViolations`

Regole:
- super admin: legge/scrive tutto
- referente: legge il settore, modifica solo aree abilitate
- dipendente: legge settore, modifica solo se stesso
- dirigente: sola lettura, nessuna notifica

Questa parte va fatta quando avrai deciso di passare dal prototipo statico al gestionale online reale.
