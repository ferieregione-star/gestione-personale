
(function () {
  const APP_ID = "953e1a96-b316-4555-a4df-da41c25880a3";
  let approvedUid = null;
  let sdk = null;

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

      if (approvedUid) {
        await sdk.login(approvedUid);
      }
    } catch (error) {
      console.warn("OneSignal:", error);
    }
  });

  window.gpPushLogin = async function (uid) {
    approvedUid = uid;

    if (sdk && uid) {
      await sdk.login(uid);
    }
  };

  window.gpPushLogout = async function () {
    approvedUid = null;

    if (sdk) {
      await sdk.logout();
    }
  };

  window.gpPushRequestPermission = async function () {
    if (!approvedUid || !sdk) return false;

    await sdk.Notifications.requestPermission();
    return true;
  };
})();


/* Pulsante per attivare le notifiche */
(function () {
  function createPushButton() {
    if (document.getElementById("gp-push-button")) return;

    var button = document.createElement("button");
    button.id = "gp-push-button";
    button.type = "button";
    button.textContent = "🔔 Attiva notifiche";

    button.style.cssText =
      "position:fixed;bottom:20px;right:16px;" +
      "z-index:9999;padding:12px 16px;" +
      "background:#2563eb;color:white;" +
      "border:0;border-radius:12px;" +
      "font-size:14px;font-weight:bold;" +
      "box-shadow:0 3px 12px #0003;cursor:pointer;";

    button.addEventListener("click", async function () {
      if (!window.gpPushRequestPermission) {
        alert("Le notifiche non sono ancora disponibili.");
        return;
      }

      try {
        var result = await window.gpPushRequestPermission();

        if (!result) {
          alert(
            "Accedi all'app e riprova ad attivare le notifiche."
          );
          return;
        }

        if (Notification.permission === "granted") {
          button.textContent = "✓ Notifiche autorizzate";
        } else {
          alert(
            "Per ricevere gli avvisi devi consentire le notifiche nel browser."
          );
        }
      } catch (error) {
        console.error("Errore notifiche:", error);
        alert("Impossibile attivare le notifiche.");
      }
    });

    document.body.appendChild(button);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createPushButton);
  } else {
    createPushButton();
  }
})();
