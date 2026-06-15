# Modifiche applicate

Questa versione contiene le modifiche richieste per UI/UX mobile e logiche di visualizzazione.

## Calendario
- Rimossa la card riepilogo sempre visibile sotto al calendario.
- Il riepilogo appare solo quando viene selezionato un giorno.
- Rimossa la scritta "Tutti presenti" / "Tutti in servizio".
- Nel popup del giorno vengono mostrate solo persone con assenza/stato speciale.
- Se non ci sono assenze viene mostrato: "Nessuna assenza inserita per questo giorno".

## Inserimento assenza
- Eliminato il menu a tendina per i codici assenza.
- Aggiunto pulsante "+ Inserisci".
- Aggiunta bottom sheet stile iOS con card selezionabili per i codici.
- Il salvataggio avviene solo dopo aver premuto "Salva".
- Mantenuta la rimozione assenza dalla card del giorno.

## Riepilogo
- Rimosso il conteggio Smart Working dal riepilogo.
- Descrizioni rese estese: C01, C02, F14, A01, ALTRO.

## Area personale
- Resa consultiva/read-only.
- Rimossa modifica nome/cognome dalla UI.
- Lasciata solo richiesta cambio password.

## Mobile design
- Nuovo stile mobile iOS/Facebook.
- Card arrotondate, sfondo chiaro, ombre leggere.
- Calendario mobile più arioso stile Apple Calendar.
- Bottom navigation a 5 voci.
- Modali/bottom sheet con blur e animazione.

## Note
- Non sono stati modificati database, Firestore, login, ruoli o struttura dati.
- Il service worker ha nuovo cache name per forzare aggiornamento asset.
