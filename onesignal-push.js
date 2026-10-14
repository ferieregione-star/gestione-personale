(function () {
  "use strict";

  const APP_ID = "953e1a96-b316-4555-a4df-da41c25880a3";
  let sdk = null;
  let approvedUid = null;
  let loginVersion = 0;
  let resolveReady;
  const sdkReady = new Promise(function (resolve) { resolveReady = resolve; });

  const BELL_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10 21h4"/></svg>';
  let button = null;
  function isSubscribed(){
    try { return !!(sdk && sdk.User && sdk.User.PushSubscription && sdk.User.PushSubscription.optedIn && sdk.User.PushSubscription.id && typeof Notification!=="undefined" && Notification.permission==="granted"); }
    catch(e){return false;}
  }
  function updateButton(){
    if(!button)return;
    button.hidden=!approvedUid;
    const active=isSubscribed();
    button.innerHTML=BELL_SVG+'<span class="gp-push-status '+(active?'gp-push-on':'gp-push-off')+'" aria-hidden="true">'+(active?'✓':'×')+'</span>';
    button.title=active?"Push OneSignal attive":"Push OneSignal non attive: premi per attivarle";
    button.setAttribute("aria-label",button.title);
    button.setAttribute("aria-pressed",String(active));
  }
  function positionButton(){
    if(!button)return;
    var isMobile=window.matchMedia("(max-width: 760px)").matches;
    var selector=isMobile?'[data-gp-push-anchor="mobile"]':'[data-gp-push-anchor="desktop"]';
    var target=document.querySelector(selector);
    if(target&&button.parentNode!==target)target.appendChild(button);
    else if(!target&&button.parentNode!==document.body)document.body.appendChild(button);
    button.classList.toggle("gp-push-floating",!target);
    updateButton();
  }
  function createButton(){
    if(button)return;
    button=document.createElement("button");
    button.id="gp-push-button";
    button.type="button";
    button.className="gp-push-btn";
    button.hidden=true;
    button.addEventListener("click",async function(){
      if(isSubscribed()){
        alert("Le notifiche push OneSignal sono attive su questo dispositivo.");
        return;
      }
      button.disabled=true;
      try{
        var ok=await window.gpPushRequestPermission();
        if(!ok)alert("OneSignal non è ancora pronto. Riprova fra qualche secondo.");
        else if(!isSubscribed())alert("Le notifiche non risultano ancora attive. Controlla i permessi del browser e riprova.");
      }catch(error){console.error("Errore notifiche:",error);alert("Impossibile attivare le notifiche.");}
      finally{button.disabled=false;updateButton();}
    });
    positionButton();
    window.addEventListener("resize",positionButton);
  }
  window.gpPushRefresh=function(){if(!button)createButton();positionButton();};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",createButton);
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
      try{OneSignal.User.PushSubscription.addEventListener("change",updateButton);}catch(e){}
      try{OneSignal.Notifications.addEventListener("permissionChange",updateButton);}catch(e){}
      updateButton();
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
    if (ready && sdk && approvedUid === uid && loginVersion === version) { await sdk.login(uid); updateButton(); }
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
