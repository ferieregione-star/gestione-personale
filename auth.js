/* Gestione Personale v200 - Firebase Authentication */
let firebaseAuth = null;
let authReady = false;
let registrationInProgress = false;

function initFirebaseAuth(){
  if(!window.firebase || !window.GESTIONE_FIREBASE_CONFIG) throw new Error("Firebase non configurato");
  if(!firebase.apps.length) firebase.initializeApp(window.GESTIONE_FIREBASE_CONFIG);
  firebaseAuth = firebase.auth();
  firebaseAuth.useDeviceLanguage();
  firebaseAuth.onAuthStateChanged(async function(authUser){
    authReady = true;
    if(!authUser){
      currentUser=null; adminUser=null;
      privateListenersAttached=false; accessProfile=null;
      if(page!=="register" && page!=="forgot") renderLogin();
      return;
    }
    if(registrationInProgress)return;
    attachPrivateListeners();
    await waitForCloudProfile(authUser.uid);
    var profile=db.users.find(function(u){ return u.id===authUser.uid; });
    if(!profile){
      await firebaseAuth.signOut();
      renderLogin("Profilo non disponibile. Contatta l’amministratore.");
      return;
    }
    if(!profile.approved){
      currentUser=null;
      renderLogin("Utenza in attesa di approvazione.");
      return;
    }
    currentUser=profile;
    if(profile.role==="admin")await seedConfigurationIfNeeded();
    selectInitialContext(profile);
    page="calendar";
    render();
  });
}

async function seedConfigurationIfNeeded(){
  var ss=await cloudDb.collection("sectors").limit(1).get();
  if(ss.empty)for(var i=0;i<INITIAL_SECTORS.length;i++)await writeSector(INITIAL_SECTORS[i]);
  var aa=await cloudDb.collection("areas").limit(1).get();
  if(aa.empty)for(var j=0;j<INITIAL_AREAS.length;j++)await writeArea(INITIAL_AREAS[j]);
}

function waitForCloudProfile(uidValue){
  if(db.users.some(function(u){return u.id===uidValue;})) return Promise.resolve();
  return new Promise(function(resolve){
    var elapsed=0;
    var timer=setInterval(function(){
      elapsed+=100;
      if(db.users.some(function(u){return u.id===uidValue;}) || elapsed>=5000){clearInterval(timer);resolve();}
    },100);
  });
}

function selectInitialContext(u){
  if(u.role==="viewer") selectedSectorId=(u.visibleSectorIds||[])[0]||u.sectorId;
  else if(u.role==="sector_manager"){
    var secs=Array.from(new Set((u.editableAreaIds||[]).map(function(aid){var a=db.areas.find(function(x){return x.id===aid;});return a&&a.sectorId;}).filter(Boolean)));
    selectedSectorId=secs[0]||u.sectorId;
  }else selectedSectorId=u.role==="admin"?"prevenzione":u.sectorId;
  selectedAreaFilter="all"; selectedPlanArea="all";
}

function authErrorMessage(error){
  var code=error&&error.code;
  if(code==="auth/invalid-credential"||code==="auth/wrong-password"||code==="auth/user-not-found") return "Email o password non valide.";
  if(code==="auth/email-already-in-use") return "Email già registrata.";
  if(code==="auth/invalid-email") return "Indirizzo email non valido.";
  if(code==="auth/weak-password") return "La password deve avere almeno 6 caratteri.";
  if(code==="auth/too-many-requests") return "Troppi tentativi. Riprova più tardi.";
  return "Operazione non riuscita. Riprova.";
}
