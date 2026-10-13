
(function () {
  "use strict";

  const APP_ID = "953e1a96-b316-4555-a4df-da41c25880a3";
  let sdk = null;
  let approvedUid = null;
  let resolveReady;
  let loginVersion = 0;

  const sdkReady = new Promise(function (resolve) {
    resolveReady = resolve;
  });

  function updateButton() {
    const btn = document.getElementById("gp-push-button");
    if (!btn) return;

    btn.style.display = approvedUid ? "block" : "none";
    btn.textContent =
      Notification.permission === "granted"
        ? "✓ Notifiche autorizzate"
        : "🔔 Attiva notifiche";
  }

  function createButton() {
    if (document.getElementById("gp-push-button")) return;

    const btn = document.createElement("button");
    btn.id = "gp-push-button";
    btn.type = "button";
    btn.textContent = "🔔 Attiva notifiche";

    btn.style.cssText =
      "position:fixed;top:12px;right:12px;z-index:9999;" +
      "padding:10px 14px;background:#2563eb;color:white;" +
      "border:0;border-radius:12px;font-size:13px;" +
      "font-weight:bold;box-shadow:0 3px 12px #0003;" +
      "cursor:pointer;display:none;";

    btn.addEventListener("click", async function () {
      btn.disabled = true;

      try {
        const ok = await window.gpPushRequestPermission();

        if (!ok) {
          alert(
            "Le notifiche non sono ancora pronte. " +
            "Attendi qualche secondo e riprova."
          );
        } else if (Notification.permission !== "granted") {
          alert(
            "Consenti le notifiche nelle impostazioni del browser."
          );
        }
      } catch (error) {
        console.error("Errore notifiche:", error);
        alert(
          "Impossibile attivare le notifiche. " +
          "Controlla le impostazioni del browser."
        );
      } finally {
        btn.disabled = false;
        updateButton();
      }
    });

    document.body.appendChild(btn);
    updateButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createButton);
  } else {
    createButton();
  }

  window.OneSignalDeferred = window.OneSignalDeferred || [];

  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.init({
        appId: APP_ID,
        serviceWorkerPath: "onesignal/OneSignalSDKWorker.js",
        serviceWorkerParam: {
          scope: "/gestione-personale/onesignal/"
        },
        promptOptions: {
          autoPrompt: false
        }
      });

      sdk = OneSignal;
      resolveReady(true);

      if (approvedUid) {
        await sdk.login(approvedUid);
      }
    } catch (error) {
      console.warn("OneSignal:", error);
      resolveReady(false);
    }
  });

  window.gpPushLogin = async function (uid) {
    if (!uid) return;

    const version = ++loginVersion;
    approvedUid = uid;
    updateButton();

    const ready = await sdkReady;

    if (
      ready &&
      sdk &&
      approvedUid === uid &&
      loginVersion === version
    ) {
      await sdk.login(uid);
    }
  };

  window.gpPushLogout = async function () {
    ++loginVersion;
    approvedUid = null;
    updateButton();

    if (sdk) {
      await sdk.logout();
    }
  };

  window.gpPushRequestPermission = async function () {
    if (
      !approvedUid &&
      typeof firebaseAuth !== "undefined" &&
      firebaseAuth &&
      firebaseAuth.currentUser
    ) {
      const uid = firebaseAuth.currentUser.uid;

      const profile =
        typeof db !== "undefined" &&
        db.users &&
        db.users.find(function (user) {
          return user.id === uid;
        });

      if (profile && profile.approved === true) {
        approvedUid = uid;
        updateButton();
      }
    }

    if (!approvedUid) return false;

    const ready = await sdkReady;

    if (!ready || !sdk || !approvedUid) {
      return false;
    }

    await sdk.login(approvedUid);
    await sdk.Notifications.requestPermission();

    updateButton();
    return true;
  };
})();
