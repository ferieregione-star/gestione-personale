/* Gestione Personale v200 - Firestore sicuro e sincronizzazione puntuale */
let cloudDb=null,cloudReady=false,cloudEnabled=false,privateListenersAttached=false,accessProfile=null;
const unsubscribers=[],loadedEventMonths=new Set();

function initFirebaseSync(){try{if(!window.firebase||!window.GESTIONE_FIREBASE_CONFIG)return;if(!firebase.apps.length)firebase.initializeApp(window.GESTIONE_FIREBASE_CONFIG);cloudDb=firebase.firestore();cloudEnabled=true;attachPublicListeners();}catch(e){console.error("Firebase init error",e);}}
function attachPublicListeners(){
  unsubscribers.push(cloudDb.collection("sectors").onSnapshot(function(s){var a=[];s.forEach(function(d){a.push(Object.assign({id:d.id},d.data()));});db.sectors=a.length?a:INITIAL_SECTORS;afterRemoteChange();},handleSnapError("sectors")));
  unsubscribers.push(cloudDb.collection("areas").onSnapshot(function(s){var a=[];s.forEach(function(d){a.push(Object.assign({id:d.id},d.data()));});db.areas=a.length?a:INITIAL_AREAS;afterRemoteChange();},handleSnapError("areas")));
}
function attachPrivateListeners(){
  if(privateListenersAttached||!firebaseAuth||!firebaseAuth.currentUser)return;privateListenersAttached=true;
  var me=firebaseAuth.currentUser.uid;
  cloudDb.collection("users").doc(me).get().then(function(profile){
    if(!profile.exists)return;accessProfile=Object.assign({id:me},profile.data());db.users=[accessProfile];cloudReady=true;afterRemoteChange();
    if(accessProfile.approved!==true)return;
    var isAdmin=accessProfile.role==="admin"&&accessProfile.approved===true;
    var uq=cloudDb.collection("users");
    if(!isAdmin)uq=uq.where("approved","==",true);
    if(!isAdmin&&accessProfile.role==="viewer")uq=uq.where("sectorId","in",(accessProfile.visibleSectorIds||[accessProfile.sectorId]).slice(0,10));
    else if(!isAdmin&&accessProfile.role==="sector_manager")uq=uq.where("areaId","in",(accessProfile.editableAreaIds||[accessProfile.areaId]).slice(0,10));
    else if(!isAdmin)uq=uq.where("sectorId","==",accessProfile.sectorId);
    unsubscribers.push(uq.onSnapshot(function(s){var a=[];s.forEach(function(d){a.push(Object.assign({id:d.id},d.data()));});if(!a.some(function(u){return u.id===me;}))a.push(accessProfile);db.users=a;cloudReady=true;afterRemoteChange();},handleSnapError("users")));
    var q=isAdmin?cloudDb.collection("requests").orderBy("createdAt","desc").limit(100):cloudDb.collection("requests").where("userId","==",me).limit(20);
    unsubscribers.push(q.onSnapshot(function(s){var a=[];s.forEach(function(d){a.push(Object.assign({id:d.id},d.data()));});db.requests=a;afterRemoteChange();},handleSnapError("requests")));
    if(isAdmin){
      unsubscribers.push(cloudDb.collection("notifications").orderBy("at","desc").limit(100).onSnapshot(function(s){var a=[];s.forEach(function(d){a.push(Object.assign({id:d.id},d.data()));});db.notifications=a;afterRemoteChange();},handleSnapError("notifications")));
      unsubscribers.push(cloudDb.collection("audit").orderBy("atTs","desc").limit(80).onSnapshot(function(s){var a=[];s.forEach(function(d){a.push(Object.assign({id:d.id},d.data()));});db.audit=a;afterRemoteChange();},handleSnapError("audit")));
      unsubscribers.push(cloudDb.collection("meta").doc("config").onSnapshot(function(d){if(d.exists)db.lastRead=d.data().lastRead||{};afterRemoteChange();},handleSnapError("meta")));
    }
    loadEventsForMonth(monthKeyOf(todayStr()));
  });
}
function handleSnapError(n){return function(e){console.error("Errore Firestore ("+n+")",e);};}
function loadEventsForMonth(m){
  if(!cloudEnabled||!firebaseAuth||!firebaseAuth.currentUser||!accessProfile||loadedEventMonths.has(m))return;loadedEventMonths.add(m);
  var p=m.split("-").map(Number),start=m+"-01",end=(p[1]===12?p[0]+1:p[0])+"-"+String(p[1]===12?1:p[1]+1).padStart(2,"0")+"-01";
  var q=cloudDb.collection("events");
  if(accessProfile.role==="viewer")q=q.where("sectorId","in",(accessProfile.visibleSectorIds||[accessProfile.sectorId]).slice(0,10));
  else if(accessProfile.role==="sector_manager")q=q.where("areaId","in",(accessProfile.editableAreaIds||[accessProfile.areaId]).slice(0,10));
  else if(accessProfile.role!=="admin")q=q.where("sectorId","==",accessProfile.sectorId);
  q=q.where("date",">=",start).where("date","<",end);
  unsubscribers.push(q.onSnapshot(function(s){Object.keys(db.events).forEach(function(k){if(k>=start&&k<end)delete db.events[k];});
    if(!db.eventMeta)db.eventMeta={};
    Object.keys(db.eventMeta).forEach(function(k){if(k>=start&&k<end)delete db.eventMeta[k];});
    s.forEach(function(d){var e=d.data();if(!db.events[e.date])db.events[e.date]={};db.events[e.date][e.userId]=normalizeEventCode(e.type);
      if(!db.eventMeta[e.date])db.eventMeta[e.date]={};
      db.eventMeta[e.date][e.userId]={createdAt:e.createdAt||null,updatedAt:e.updatedAt||null,legacy:!e.createdAt};
    });afterRemoteChange();},function(e){loadedEventMonths.delete(m);handleSnapError("events:"+m)(e);}));
}
function isUserEditingForm(){var e=document.activeElement,t=e&&(e.tagName||"").toUpperCase();return !!e&&(t==="INPUT"||t==="TEXTAREA"||t==="SELECT"||e.isContentEditable);}
var afterRemoteChangeTimer=null;
function afterRemoteChange(){persistLocal();if(isUserEditingForm()){clearTimeout(afterRemoteChangeTimer);afterRemoteChangeTimer=setTimeout(afterRemoteChange,1200);return;}if(currentUser){var f=db.users.find(function(u){return u.id===currentUser.id&&u.approved;});if(f)currentUser=f;else if(cloudReady)currentUser=null;}if(currentUser)render();}
async function writeUser(u){if(!cloudEnabled)throw new Error("Connessione assente");var x=Object.assign({},u);delete x.password;delete x.id;await cloudDb.collection("users").doc(u.id).set(x,{merge:true});}
async function deleteUserRemote(id){await cloudDb.collection("users").doc(id).delete();}
async function writeSector(s){var x=Object.assign({},s);delete x.id;await cloudDb.collection("sectors").doc(s.id).set(x);}
async function writeArea(a){var x=Object.assign({},a);delete x.id;await cloudDb.collection("areas").doc(a.id).set(x);}
function eventDocId(date,userId){return date+"_"+userId;}
function smartWeekId(date,userId){return userId+"_"+weekDates(date)[0];}
async function writeEvent(date,userId,type){
  var u=db.users.find(function(x){return x.id===userId;});if(!u)throw new Error("Utente non trovato");
  var ref=cloudDb.collection("events").doc(eventDocId(date,userId));
  await cloudDb.runTransaction(async function(tx){
    var old=await tx.get(ref),oldData=old.exists?old.data():null;
    if(oldData&&oldData.type==="smart"&&type!=="smart")tx.delete(cloudDb.collection("smartWeeks").doc(smartWeekId(oldData.date,userId)));
    if(type==="smart"){
      var lockRef=cloudDb.collection("smartWeeks").doc(smartWeekId(date,userId)),lock=await tx.get(lockRef);
      if(lock.exists&&lock.data().date!==date)throw new Error("È già presente uno smart working nella stessa settimana.");
      tx.set(lockRef,{userId:userId,date:date,week:weekDates(date)[0],sectorId:u.sectorId,areaId:u.areaId,updatedBy:firebaseAuth.currentUser.uid});
    }
    var fields={date:date,userId:userId,type:type,sectorId:u.sectorId,areaId:u.areaId,updatedBy:firebaseAuth.currentUser.uid,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    // La prima selezione SW conserva la sua data anche in caso di successiva modifica.
    if(type==="smart")fields.createdAt=oldData&&oldData.type==="smart"?(oldData.createdAt||oldData.updatedAt||firebase.firestore.FieldValue.serverTimestamp()):firebase.firestore.FieldValue.serverTimestamp();
    else if(oldData&&oldData.createdAt)fields.createdAt=oldData.createdAt;
    tx.set(ref,fields);
  });
}
async function deleteEvent(date,userId){
  var ref=cloudDb.collection("events").doc(eventDocId(date,userId));
  await cloudDb.runTransaction(async function(tx){var old=await tx.get(ref);if(old.exists&&old.data().type==="smart")tx.delete(cloudDb.collection("smartWeeks").doc(smartWeekId(date,userId)));tx.delete(ref);});
}
async function deleteAllUserEvents(userId){
  for(var c of ["events","smartWeeks"]){var s=await cloudDb.collection(c).where("userId","==",userId).get();while(!s.empty){var b=cloudDb.batch();s.docs.slice(0,450).forEach(function(d){b.delete(d.ref);});await b.commit();if(s.size<=450)break;s=await cloudDb.collection(c).where("userId","==",userId).get();}}
}
function queueNotificationWrite(e){if(currentUser&&currentUser.role==="admin")cloudDb.collection("notifications").doc(e.id).set(e).catch(console.error);}
function queueAuditWrite(e){if(firebaseAuth&&firebaseAuth.currentUser){e.byUid=firebaseAuth.currentUser.uid;cloudDb.collection("audit").doc(e.id).set(e).catch(console.error);}}
async function writeRequest(r){var x=Object.assign({},r);delete x.id;await cloudDb.collection("requests").doc(r.id).set(x);}
var metaWriteTimer=null;
function queueMetaWrite(){if(!currentUser||currentUser.role!=="admin")return;clearTimeout(metaWriteTimer);metaWriteTimer=setTimeout(function(){cloudDb.collection("meta").doc("config").set({lastRead:db.lastRead,schema:DATA_SCHEMA_VERSION},{merge:true});},500);}
function persistLocal(){try{var safe=Object.assign({},db,{users:(db.users||[]).map(function(u){var x=Object.assign({},u);delete x.password;return x;})});localStorage.setItem(STORE,JSON.stringify(safe));}catch(e){}}
function loadLocalCache(){try{var x=JSON.parse(localStorage.getItem(STORE)||"null");if(x){db=Object.assign(db,x);db.users=(db.users||[]).map(function(u){delete u.password;return u;});}}catch(e){}}
function saveSession(){} function clearSession(){} function restoreSession(){return false;}
