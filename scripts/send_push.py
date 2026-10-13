"""Invia notifiche per modifiche recenti al calendario, usando Firebase Spark."""
import datetime as dt
import json
import os
import sys
import uuid
import urllib.error
import urllib.request

from google.cloud import firestore

PROJECT = "gestione-personale-e2fd0"
APP_ID = "953e1a96-b316-4555-a4df-da41c25880a3"
URL = "https://api.onesignal.com/notifications?c=push"
SITE = "https://ferieregione-star.github.io/gestione-personale/"


def send_one(api_key, change_id, uid, message):
    payload = {
        "app_id": APP_ID,
        "include_aliases": {"external_id": [uid]},
        "target_channel": "push",
        "headings": {"it": "Gestione Personale"},
        "contents": {"it": message},
        "url": SITE,
        "idempotency_key": str(uuid.uuid5(uuid.NAMESPACE_URL, APP_ID + ":" + change_id + ":" + uid)),
    }
    request = urllib.request.Request(
        URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": "Key " + api_key, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:800]
        raise RuntimeError("OneSignal HTTP {}: {}".format(exc.code, detail)) from exc
    if result.get("errors"):
        errors = result["errors"]
        # External ID senza sottoscrizione: non bloccare altri destinatari.
        if isinstance(errors, dict) and "invalid_aliases" in errors:
            print("Destinatario non riconosciuto da OneSignal; salto un utente.")
            return False
        raise RuntimeError("OneSignal: " + str(errors))
    print("Richiesta OneSignal accettata per un destinatario.")
    return True


def main():
    api_key = os.environ["ONESIGNAL_API_KEY"]
    db = firestore.Client(project=PROJECT)
    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=12)
    changes = list(db.collection("eventChanges").where("at", ">=", since).stream())
    print("Modifiche recenti:", len(changes))
    if not changes:
        return
    users = {d.id: d.to_dict() for d in db.collection("users").stream()}
    sent = 0
    skipped = 0
    errors = 0
    for doc in changes:
        change = doc.to_dict()
        area = change.get("areaId")
        if not area:
            continue
        recipients = sorted({uid for uid, user in users.items()
                             if user.get("approved") is True
                             and (user.get("role") == "admin" or user.get("areaId") == area)})
        action = {"created": "inserita", "updated": "modificata", "deleted": "cancellata"}.get(
            change.get("action"), "aggiornata")
        message = "Un'assenza è stata " + action + " nella tua Area. Apri l'app per i dettagli."
        for uid in recipients:
            try:
                if send_one(api_key, doc.id, uid, message):
                    sent += 1
                else:
                    skipped += 1
            except (RuntimeError, urllib.error.URLError) as exc:
                errors += 1
                print("Invio fallito per una modifica: {}".format(exc), file=sys.stderr)
    print("Invii accettati:", sent)
    print("Destinatari non riconosciuti:", skipped)
    print("Errori:", errors)
    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
