# v204 — visibilità aree

Solo il Super Gestore può nascondere o riattivare le aree dalla schermata Admin.
La proprietà `hidden` viene salvata sul documento esistente `areas/{id}` in Firestore.
Le aree senza questa proprietà restano visibili. I dati non vengono cancellati.

## Pubblicazione
Caricare i file della cartella sul repository GitHub Pages, mantenendo la struttura. Non importare o cancellare dati Firestore.
Verificare prima con un account non amministratore che l’area nascosta non appaia in calendario, riepiloghi e filtri.

## Attenzione
La visibilità è applicata nell’interfaccia: non equivale a un blocco di accesso ai dati Firestore. Per impedire letture dirette sono necessarie regole di sicurezza server adeguate. Le regole incluse nello ZIP originale sono permissive: NON pubblicarle come regole di produzione.
Le notifiche push non fanno parte di questa versione.
