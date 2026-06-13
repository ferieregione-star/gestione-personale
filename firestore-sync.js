/* =========================================================
   FIRESTORE SYNC - v63
   Collezioni:
     sectors/{id}, areas/{id}            -> piccoli, ascoltati per intero
     users/{id}                          -> ascoltati per intero (poche decine)
     events/{YYYY-MM-DD}                 -> ascoltati: mese corrente + mese visualizzato
     notifications/{id}                  -> ultimi 80, ordinati per "at" desc
     requests/{id}                       -> ultimi 50
     audit/{id}                          -> ultimi 40
     meta/config                         -> {schema, lastRead:{}}
   Ogni scrittura riguarda SOLO il documento cambiato: niente
   blob unico, niente conflitti tra utenti su dati non correlati.
   ========================================================= */

let cloudDb=null;
let cloudReady=false;
let cloudEnabled=false;
const unsubscribers=[];
const loadedEventMonths=new Set();

function initFirebaseSync(){
  try{
    if(!window.firebase || !window.GESTIONE_FIREBASE_CONFIG){
      console.warn("Firebase non configurato: uso solo dati locali.");
      return;
    }
    if(!firebase.apps.length) firebase.initializeApp(window.GESTIONE_FIREBASE_CONFIG);
    cloudDb=firebase.firestore();
    cloudEnabled=true;
    attachListeners();
  }catch(e){
    console.error("Firebase init error:",e);
  }
}

function attachListeners(){
  // Sectors
  unsubscribers.push(cloudDb.collection("sectors").onSnapshot(function(snap){
    if(snap.empty && !cloudReady){
      INITIAL_SECTORS.forEach(function(s){ cloudDb.collection("sectors").doc(s.id).set(s).catch(function(){}); });
      return;
    }
    var arr=[];
    snap.forEach(function(doc){ arr.push(Object.assign({id:doc.id}, doc.data())); });
    if(arr.length) db.sectors=arr;
    afterRemoteChange();
  }, handleSnapError("sectors")));

  // Areas
  unsubscribers.push(cloudDb.collection("areas").onSnapshot(function(snap){
    if(snap.empty && !cloudReady){
      INITIAL_AREAS.forEach(function(a){ cloudDb.collection("areas").doc(a.id).set(a).catch(function(){}); });
      return;
    }
    var arr=[];
    snap.forEach(function(doc){ arr.push(Object.assign({id:doc.id}, doc.data())); });
    if(arr.length) db.areas=arr;
    afterRemoteChange();
  }, handleSnapError("areas")));

  // Users
  unsubscribers.push(cloudDb.collection("users").onSnapshot(function(snap){
    if(snap.empty && !cloudReady){
      cloudDb.collection("users").doc(SEED_ADMIN.id).set(SEED_ADMIN).catch(function(){});
      return;
    }
    var arr=[];
    snap.forEach(function(doc){ arr.push(Object.assign({id:doc.id}, doc.data())); });
    if(arr.length){
      db.users=arr;
      var admin=db.users.find(function(u){return u.id==="admin";});
      if(!admin) db.users.unshift(SEED_ADMIN);
    }
    cloudReady=true;
    afterRemoteChange();
  }, handleSnapError("users")));

  // Notifications (ultimi 80)
  unsubscribers.push(cloudDb.collection("notifications").orderBy("at","desc").limit(80).onSnapshot(function(snap){
    var arr=[];
    snap.forEach(function(doc){ arr.push(Object.assign({id:doc.id}, doc.data())); });
    db.notifications=arr;
    afterRemoteChange();
  }, handleSnapError("notifications")));

  // Requests (ultimi 50)
  unsubscribers.push(cloudDb.collection("requests").orderBy("createdAt","desc").limit(50).onSnapshot(function(snap){
    var arr=[];
    snap.forEach(function(doc){ arr.push(Object.assign({id:doc.id}, doc.data())); });
    db.requests=arr;
    afterRemoteChange();
  }, handleSnapError("requests")));

  // Audit (ultimi 40)
  unsubscribers.push(cloudDb.collection("audit").orderBy("atTs","desc").limit(40).onSnapshot(function(snap){
    var arr=[];
    snap.forEach(function(doc){ arr.push(Object.assign({id:doc.id}, doc.data())); });
    db.audit=arr;
    afterRemoteChange();
  }, handleSnapError("audit")));

  // Meta (lastRead)
  unsubscribers.push(cloudDb.collection("meta").doc("config").onSnapshot(function(doc){
    if(doc.exists){
      var data=doc.data();
      db.lastRead=data.lastRead||{};
    }
    afterRemoteChange();
  }, handleSnapError("meta")));

  // Eventi: mese corrente al caricamento
  loadEventsForMonth(monthKeyOf(todayStr()));
}

function handleSnapError(name){
  return function(err){
    console.error("Errore Firestore ("+name+"):", err);
  };
}

/* Carica/ascolta gli eventi di un mese (YYYY-MM). Idempotente. */
function loadEventsForMonth(monthKey){
  if(!cloudEnabled||!cloudDb) return;
  if(loadedEventMonths.has(monthKey)) return;
  loadedEventMonths.add(monthKey);
  var start=monthKey+"-01";
  var startD=new Date(start+"T00:00:00");
  var endD=new Date(startD.getFullYear(), startD.getMonth()+1, 1);
  var end=endD.toISOString().slice(0,10);
  unsubscribers.push(cloudDb.collection("events").where("__name__",">=",start).where("__name__","<",end).onSnapshot(function(snap){
    snap.forEach(function(doc){
      var data=doc.data()||{};
      var map={};
      Object.keys(data).forEach(function(uidKey){ map[uidKey]=normalizeEventCode(data[uidKey]); });
      db.events[doc.id]=map;
    });
    afterRemoteChange();
  }, handleSnapError("events:"+monthKey)));
}

function isUserEditingForm(){
  var el=document.activeElement;
  if(!el) return false;
  var tag=(el.tagName||"").toUpperCase();
  return tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||el.isContentEditable;
}

var afterRemoteChangeTimer=null;
function afterRemoteChange(){
  persistLocal();
  // Evita di interrompere l'utente mentre digita: rimanda il render.
  if(isUserEditingForm()){
    clearTimeout(afterRemoteChangeTimer);
    afterRemoteChangeTimer=setTimeout(afterRemoteChange, 1500);
    return;
  }
  if(currentUser) syncCurrentUserAfterRemote();
  if(currentUser) render();
  else if(!modalOpen && page!=="register" && page!=="forgot"){
    if(restoreSession()) render();
  }
}

function syncCurrentUserAfterRemote(){
  var fresh=db.users.find(function(u){return u.id===currentUser.id && u.approved;});
  if(fresh){
    currentUser=fresh;
  }else{
    currentUser=null;
    clearSession();
  }
}

/* ---------- Scritture puntuali ---------- */
async function writeUser(user){
  persistLocal();
  if(!cloudEnabled) return;
  try{
    await cloudDb.collection("users").doc(user.id).set(user);
  }catch(e){
    console.error("Errore scrittura utente:",e);
    throw e;
  }
}
async function deleteUserRemote(userId){
  if(!cloudEnabled) return;
  try{ await cloudDb.collection("users").doc(userId).delete(); }catch(e){ console.error("Errore eliminazione utente:",e); }
}
async function writeSector(sector){
  persistLocal();
  if(!cloudEnabled) return;
  try{ await cloudDb.collection("sectors").doc(sector.id).set(sector); }catch(e){ console.error("Errore scrittura settore:",e); }
}
async function writeArea(area){
  persistLocal();
  if(!cloudEnabled) return;
  try{ await cloudDb.collection("areas").doc(area.id).set(area); }catch(e){ console.error("Errore scrittura area:",e); }
}
async function writeEventDay(date, dayMap){
  persistLocal();
  if(!cloudEnabled) return;
  try{
    if(Object.keys(dayMap).length===0){
      await cloudDb.collection("events").doc(date).delete();
    }else{
      await cloudDb.collection("events").doc(date).set(dayMap);
    }
  }catch(e){ console.error("Errore scrittura eventi giorno:",e); }
}
function queueNotificationWrite(entry){
  persistLocal();
  if(!cloudEnabled) return;
  cloudDb.collection("notifications").doc(entry.id).set(entry).catch(function(e){ console.error("Errore notifica:",e); });
}
function queueAuditWrite(entry){
  persistLocal();
  if(!cloudEnabled) return;
  cloudDb.collection("audit").doc(entry.id).set(entry).catch(function(e){ console.error("Errore audit:",e); });
}
async function writeRequest(req){
  persistLocal();
  if(!cloudEnabled) return;
  try{ await cloudDb.collection("requests").doc(req.id).set(req); }catch(e){ console.error("Errore richiesta:",e); }
}
var metaWriteTimer=null;
function queueMetaWrite(){
  persistLocal();
  if(!cloudEnabled) return;
  clearTimeout(metaWriteTimer);
  metaWriteTimer=setTimeout(function(){
    cloudDb.collection("meta").doc("config").set({lastRead:db.lastRead, schema:DATA_SCHEMA_VERSION}, {merge:true}).catch(function(e){ console.error("Errore meta:",e); });
  }, 800);
}

/* ---------- Cache locale (solo per avvio rapido / offline) ---------- */
function persistLocal(){
  try{
    localStorage.setItem(STORE, JSON.stringify(db));
  }catch(e){}
}
function loadLocalCache(){
  try{
    var raw=localStorage.getItem(STORE);
    if(!raw) return;
    var parsed=JSON.parse(raw);
    if(parsed && parsed.users && parsed.users.length){
      db=parsed;
      db.meta={version:VERSION, schema:DATA_SCHEMA_VERSION};
      if(!db.events) db.events={};
      if(!db.notifications) db.notifications=[];
      if(!db.requests) db.requests=[];
      if(!db.audit) db.audit=[];
      if(!db.lastRead) db.lastRead={};
      if(!db.ruleViolations) db.ruleViolations={};
    }
  }catch(e){}
}

/* ---------- Sessione ---------- */
function saveSession(){
  if(!currentUser) return;
  try{
    localStorage.setItem(SESSION_STORE, JSON.stringify({userId:currentUser.id, at:Date.now()}));
  }catch(e){}
}
function clearSession(){
  try{ localStorage.removeItem(SESSION_STORE); }catch(e){}
}
function restoreSession(){
  try{
    var raw=localStorage.getItem(SESSION_STORE);
    if(!raw) return false;
    var session=JSON.parse(raw);
    var u=db.users.find(function(x){return x.id===session.userId && x.approved;});
    if(!u) return false;
    currentUser=u;
    selectedSectorId = u.role==="admin" ? "prevenzione" : u.sectorId;
    selectedAreaFilter="all";
    selectedPlanArea="all";
    if(!page) page="calendar";
    return true;
  }catch(e){
    return false;
  }
}
