"""Scheduled Firestore change log -> OneSignal; no Firebase Cloud Functions."""
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
API_KEY = os.environ["ONESIGNAL_API_KEY"]


def main():
    db = firestore.Client(project=PROJECT)
    # 12-minute overlapping window compensates for normal GitHub scheduler jitter.
    # Deterministic idempotency_key prevents repeated sends during the overlap.
    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=12)
    changes = list(db.collection("eventChanges").where("at", ">=", since).stream())
    print("Modifiche recenti:", len(changes))
    users = {d.id: d.to_dict() for d in db.collection("users").stream()}
    sent = 0
    for doc in changes:
        change = doc.to_dict()
        area = change.get("areaId")
        if not area:
            continue
        recipients = sorted({uid for uid, user in users.items()
                             if user.get("approved") is True and
                             (user.get("role") == "admin" or user.get("areaId") == area)})
        if not recipients:
            continue
        action = {"created": "inserita", "updated": "modificata", "deleted": "cancellata"}.get(change.get("action"), "aggiornata")
        payload = {
            "app_id": APP_ID,
            "include_aliases": {"external_id": recipients},
            "target_channel": "push",
            "headings": {"it": "Gestione Personale", "en": "Gestione Personale"},
            "contents": {"it": "Un'assenza è stata " + action + " nella tua Area. Apri l'app per i dettagli.",
                         "en": "An absence was updated in your area. Open the app for details."},
            "url": "https://ferieregione-star.github.io/gestione-personale/",
            "idempotency_key": str(uuid.uuid5(uuid.NAMESPACE_URL, APP_ID + ":" + doc.id)),
        }
        request = urllib.request.Request(
            "https://api.onesignal.com/notifications?c=push",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": "Key " + API_KEY,
                     "Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=25) as response:
                body = json.loads(response.read().decode("utf-8"))
                if body.get("errors"):
                    raise RuntimeError(str(body["errors"]))
                print("Notifica elaborata:", doc.id, "destinatari:", len(recipients))
                sent += 1
        except (urllib.error.HTTPError, urllib.error.URLError, RuntimeError) as error:
            print("Errore invio per modifica", doc.id, ":", error, file=sys.stderr)
            raise
    print("Notifiche elaborate:", sent)


if __name__ == "__main__":
    main()
