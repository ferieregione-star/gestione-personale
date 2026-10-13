
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
