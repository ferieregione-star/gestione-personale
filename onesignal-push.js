(function () {
  "use strict";

  const APP_ID = "953e1a96-b316-4555-a4df-da41c25880a3";
  let sdk = null;
  let approvedUid = null;
  let loginVersion = 0;
  let resolveReady;
  const sdkReady = new Promise(function (resolve) { resolveReady = resolve; });

  function updateButton() {
    const btn = document.getElementById("gp-push-button");
    if (!btn) return;
    btn.style.display = approvedUid ? "flex" : "none";
    const granted = typeof Notification !== "undefined" && Notification.permission === "granted";
    btn.textContent = granted ? "🔔" : "🔔";
    btn.title = granted ? "Notifiche autorizzate" : "Attiva notifiche";
    btn.setAttribute("aria-label", btn.title);
    btn.style.background = "transparent";
    btn.style.color = "#1d4ed8";
    btn.style.border = granted ? "1px solid #86cfa0" : "1px solid #cbd5e1";
    btn.style.boxShadow = "0 1px 4px #00000014";
    btn.style.position = "fixed";
    btn.style.top = "12px";
    btn.style.right = "12px";
    btn.style.width = "38px";
    btn.style.height = "38px";
    btn.style.padding = "0";
    btn.style.borderRadius = "50%";
    btn.style.fontSize = "19px";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";
    btn.style.cursor = "pointer";
    btn.style.zIndex = "9999";
  }

  function createButton() {
    if (document.getElementById("gp-push-button")) return;
    const btn = document.createElement("button");
    btn.id = "gp-push-button";
    btn.type = "button";
    btn.style.display = "none";
    btn.addEventListener("click", async function () {
      btn.disabled = true;
      try {
        const ok = await window.gpPushRequestPermission();
        if (!ok) alert("Le notifiche non sono ancora pronte. Attendi qualche secondo e riprova.");
        else if (Notification.permission !== "granted") alert("Consenti le notifiche nelle impostazioni del browser.");
      } catch (error) {
        console.error("Errore notifiche:", error);
        alert("Impossibile attivare le notifiche. Controlla le impostazioni del browser.");
      } finally {
        btn.disabled = false;
        updateButton();
      }
    });
    document.body.appendChild(btn);
    updateButton();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", createButton);
  else createButton();

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      await OneSignal.init({
        appId: APP_ID,
        serviceWorkerPath: "onesignal/OneSignalSDKWorker.js",
        serviceWorkerParam: { scope: "/gestione-personale/onesignal/" },
        promptOptions: { autoPrompt: false }
      });
      sdk = OneSignal;
      resolveReady(true);
      if (approvedUid) await sdk.login(approvedUid);
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
    if (ready && sdk && approvedUid === uid && loginVersion === version) await sdk.login(uid);
  };

  window.gpPushLogout = async function () {
    ++loginVersion;
    approvedUid = null;
    updateButton();
    if (sdk) await sdk.logout();
  };

  window.gpPushRequestPermission = async function () {
    if (!approvedUid && typeof firebaseAuth !== "undefined" && firebaseAuth && firebaseAuth.currentUser) {
      const uid = firebaseAuth.currentUser.uid;
      const profile = typeof db !== "undefined" && db.users && db.users.find(function (user) { return user.id === uid; });
      if (profile && profile.approved === true) { approvedUid = uid; updateButton(); }
    }
    if (!approvedUid) return false;
    const ready = await sdkReady;
    if (!ready || !sdk || !approvedUid) return false;
    await sdk.login(approvedUid);
    await sdk.Notifications.requestPermission();
    updateButton();
    return true;
  };
})();
