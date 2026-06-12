
let lastDbSnapshot="";

// ===== Firebase live sync v28 =====
// Prima versione multiutente: sincronizza l'intero gestionale in un documento Firestore.
// Documento: gestionePersonale/main
let cloudDb=null;
let cloudDocRef=null;
let cloudReady=false;
let cloudSaving=false;
let cloudSaveTimer=null;
let cloudApplying=false;

function initFirebaseSync(){
  try{
    if(!window.firebase || !window.GESTIONE_FIREBASE_CONFIG){
      console.warn("Firebase non configurato: uso dati locali.");
      return;
    }
    if(!firebase.apps.length)firebase.initializeApp(window.GESTIONE_FIREBASE_CONFIG);
    cloudDb=firebase.firestore();
    cloudDocRef=cloudDb.collection("gestionePersonale").doc("main");

    cloudDocRef.onSnapshot(async snap=>{
      if(!snap.exists){
        await cloudDocRef.set({db:migrateDb(db),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
        cloudReady=true;
        return;
      }
      const data=snap.data();
      if(!data || !data.db)return;
      cloudApplying=true;
      db=migrateDb(data.db);
      const raw=JSON.stringify(db);
      localStorage.setItem(STORE,raw);
      lastDbSnapshot=raw;
      if(currentUser){syncCurrentUserAfterDbUpdate();render();}else{restoreSession();if(currentUser)render();}
      cloudApplying=false;
      cloudReady=true;
    },err=>{
      console.error("Errore Firestore:",err);
      alert("Errore collegamento Firestore. Controlla le regole Firebase.");
    });
  }catch(e){
    console.error("Firebase init error:",e);
  }
}
function scheduleCloudSave(){
  if(cloudApplying || !cloudDocRef)return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer=setTimeout(async()=>{
    try{
      cloudSaving=true;
      await cloudDocRef.set({db:migrateDb(db),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
    }catch(e){
      console.error("Salvataggio cloud fallito:",e);
    }finally{
      setTimeout(()=>cloudSaving=false,300);
    }
  },250);
}

let liveChannel=null;
try{
  liveChannel=new BroadcastChannel("gestione_personale_v51_live");
  liveChannel.onmessage=()=>reloadFromStorage();
}catch(e){}
function reloadFromStorage(){
  try{
    const raw=localStorage.getItem(STORE)||"";
    if(!raw || raw===lastDbSnapshot)return;
    lastDbSnapshot=raw;
    const fresh=JSON.parse(raw);
    db=fresh;
    if(currentUser){syncCurrentUserAfterDbUpdate();render();}else{restoreSession();if(currentUser)render();}
  }catch(e){}
}
window.addEventListener("storage",reloadFromStorage);
window.addEventListener("focus",reloadFromStorage);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)reloadFromStorage()});
setInterval(()=>{if(currentUser)reloadFromStorage()},1000);

const VERSION="v51";
const STORE="gestione_personale_v51";
const SESSION_STORE="gestione_personale_session_v51";
const LEGACY_STORES=["gestione_personale_v26","ufficioflex_gestionale_v25","ufficioflex_gestionale_v24","ufficioflex_gestionale_v23"];
const DATA_SCHEMA_VERSION=51;
const STATUS={
present:{label:"In servizio",short:"S",cls:"present",color:"#16a34a"},
smart:{label:"SW - Smart working",short:"SW",cls:"smart",color:"#2563eb"},
c01:{label:"C01 - Ferie anno attuale",short:"C01",cls:"ferie",color:"#f97316"},
c02:{label:"C02 - Ferie anno precedente",short:"C02",cls:"ferie",color:"#fb923c"},
f14:{label:"F14 - Festività soppresse",short:"F14",cls:"permesso",color:"#7c3aed"},
a01:{label:"A01 - Malattia",short:"A01",cls:"malattia",color:"#ef4444"},
altro:{label:"ALTRO",short:"ALT",cls:"altro",color:"#64748b"},
ferie:{label:"C01 - Ferie anno attuale",short:"C01",cls:"ferie",color:"#f97316"},
malattia:{label:"A01 - Malattia",short:"A01",cls:"malattia",color:"#ef4444"},
permesso:{label:"F14 - Festività soppresse",short:"F14",cls:"permesso",color:"#7c3aed"}
};
const ROLE_LABELS={admin:"Super admin",employee:"Dipendente",viewer:"Dirigente",sector_manager:"Referente"};
const INITIAL_SECTORS=[{id:"prevenzione",name:"Settore 4",hasAreas:true},{id:"territorio",name:"Settore 7",hasAreas:true}];
const INITIAL_AREAS=[{id:"prev",sectorId:"prevenzione",name:"Prevenzione",color:"#2563eb"},{id:"vet",sectorId:"prevenzione",name:"Veterinaria",color:"#dc2626"},{id:"terr",sectorId:"territorio",name:"Territorio",color:"#2563eb"},{id:"conv",sectorId:"territorio",name:"Convenzionata",color:"#dc2626"}];
const seedUsers=[
{id:"admin",email:"jackfrosties@hotmail.it",password:"admin",name:"Amministratore",surname:"Gestore",role:"admin",sectorId:"*",areaId:"*",visibleSectorIds:["prevenzione","territorio"],editableAreaIds:["prev","vet","terr","conv"],c01:0,c02:0,f14:4,approved:true,initials:"AG",color:"#0b1f3a"},
{id:"dir-pre",email:"dirigente.prevenzione@demo.it",password:"1234",name:"Dirigente",surname:"Prevenzione",role:"viewer",sectorId:"prevenzione",areaId:"*",visibleSectorIds:["prevenzione"],editableAreaIds:[],c01:0,c02:0,f14:4,approved:true,initials:"DP",color:"#dc2626"},
{id:"ref-prev",email:"roberta.rogliano@demo.it",password:"1234",name:"Roberta",surname:"Rogliano",role:"sector_manager",sectorId:"prevenzione",areaId:"prev",visibleSectorIds:["prevenzione"],editableAreaIds:["prev"],c01:24,c02:4,f14:4,approved:true,initials:"RR",color:"#7c3aed"},
{id:"ref-vet",email:"francesca.tavella@demo.it",password:"1234",name:"Francesca",surname:"Tavella",role:"sector_manager",sectorId:"prevenzione",areaId:"vet",visibleSectorIds:["prevenzione"],editableAreaIds:["vet"],c01:24,c02:4,f14:4,approved:true,initials:"FT",color:"#7c3aed"},
{id:"pre-1",email:"pre1@demo.it",password:"1234",name:"Mario",surname:"Rossi",role:"employee",sectorId:"prevenzione",areaId:"prev",visibleSectorIds:["prevenzione"],editableAreaIds:[],c01:24,c02:8,f14:4,approved:true,initials:"MR",color:"#0ea5e9"},
{id:"pre-2",email:"pre2@demo.it",password:"1234",name:"Andrea",surname:"Bianchi",role:"employee",sectorId:"prevenzione",areaId:"vet",visibleSectorIds:["prevenzione"],editableAreaIds:[],c01:22,c02:5,f14:4,approved:true,initials:"AB",color:"#16a34a"},
{id:"pre-3",email:"pre3@demo.it",password:"1234",name:"Paolo",surname:"Greco",role:"employee",sectorId:"prevenzione",areaId:"prev",visibleSectorIds:["prevenzione"],editableAreaIds:[],c01:25,c02:2,f14:4,approved:true,initials:"PG",color:"#f97316"},
{id:"pre-4",email:"pre4@demo.it",password:"1234",name:"Elena",surname:"Lombardi",role:"employee",sectorId:"prevenzione",areaId:"vet",visibleSectorIds:["prevenzione"],editableAreaIds:[],c01:23,c02:6,f14:4,approved:true,initials:"EL",color:"#7c3aed"},
{id:"pre-5",email:"pre5@demo.it",password:"1234",name:"Carlo",surname:"Moretti",role:"employee",sectorId:"prevenzione",areaId:"prev",visibleSectorIds:["prevenzione"],editableAreaIds:[],c01:26,c02:1,f14:4,approved:true,initials:"CM",color:"#64748b"},
{id:"pre-6",email:"pre6@demo.it",password:"1234",name:"Sara",surname:"Conti",role:"employee",sectorId:"prevenzione",areaId:"vet",visibleSectorIds:["prevenzione"],editableAreaIds:[],c01:24,c02:3,f14:4,approved:true,initials:"SC",color:"#ef4444"},
{id:"dir-ter",email:"dirigente.territorio@demo.it",password:"1234",name:"Dirigente",surname:"Territorio",role:"viewer",sectorId:"territorio",areaId:"terr",visibleSectorIds:["territorio"],editableAreaIds:[],c01:0,c02:0,f14:4,approved:true,initials:"DT",color:"#dc2626"},
{id:"ref-ter",email:"referente.territorio@demo.it",password:"1234",name:"Referente",surname:"Territorio",role:"sector_manager",sectorId:"territorio",areaId:"terr",visibleSectorIds:["territorio"],editableAreaIds:["terr"],c01:0,c02:0,f14:4,approved:true,initials:"RT",color:"#7c3aed"},
{id:"ter-1",email:"ter1@demo.it",password:"1234",name:"Andrea",surname:"Verdi",role:"employee",sectorId:"territorio",areaId:"terr",visibleSectorIds:["territorio"],editableAreaIds:[],c01:26,c02:4,f14:4,approved:true,initials:"AV",color:"#f97316"},
];
const seedEvents={"2025-06-10":{"pre-1":"ferie","pre-3":"ferie","pre-2":"ferie"},"2025-06-11":{"pre-4":"ferie"},"2025-07-01":{"pre-1":"smart","pre-2":"ferie"},"2025-07-02":{"pre-4":"smart"},"2025-07-15":{"pre-1":"smart","pre-3":"smart","pre-2":"smart"},"2025-08-04":{"pre-4":"ferie","pre-6":"ferie"},"2025-09-02":{"pre-1":"ferie"},"2025-12-22":{"pre-2":"ferie","pre-3":"ferie"},"2026-01-05":{"pre-4":"ferie"},"2026-04-02":{"pre-1":"ferie","pre-6":"ferie"}};
let db=loadDb();
normalizeSectorsAndAreas();
let currentUser=null;
let adminUser=null;
let mobileMenuOpen=false;
let navStack=[];
let planModalOpen=false;
let selectedPlanDate=null;
let selectedPlanSectorId=null;
let selectedPlanAreaForModal=null;
let page="calendar",selectedDate="2025-07-15",viewYear=2025,viewMonth=6,modalOpen=false,selectedSectorId="prevenzione",selectedAreaFilter="all",selectedEmployeeId=null,selectedPlanPeriod="estate",selectedPlanArea="all",app=document.getElementById("app");
function freshDb(){return{meta:{version:VERSION,schema:DATA_SCHEMA_VERSION},sectors:INITIAL_SECTORS,areas:INITIAL_AREAS,users:seedUsers,events:seedEvents,requests:[],notifications:[],audit:[],lastRead:{},ruleViolations:{}}}
function loadDb(){
  try{
    let raw=localStorage.getItem(STORE);
    if(!raw){
      for(const oldStore of LEGACY_STORES){
        raw=localStorage.getItem(oldStore);
        if(raw)break;
      }
    }
    if(!raw)return freshDb();
    let parsed=JSON.parse(raw);
    return migrateDb(parsed);
  }catch(e){
    return freshDb();
  }
}
function migrateDb(data){
  let fresh=freshDb();
  data=data||fresh;
  data.meta=data.meta||{};
  data.meta.version=VERSION;
  data.meta.schema=DATA_SCHEMA_VERSION;
  data.sectors=data.sectors||fresh.sectors;
  data.areas=data.areas||fresh.areas;
  data.users=data.users||fresh.users;
  data.events=data.events||fresh.events;
  data.requests=data.requests||[];
  data.notifications=data.notifications||[];
  data.audit=data.audit||[];
  data.lastRead=data.lastRead||{};
  data.ruleViolations=data.ruleViolations||{};

  data.users.forEach(u=>{if(u.f14===undefined)u.f14=0;});
  Object.keys(data.events||{}).forEach(d=>{
    Object.keys(data.events[d]||{}).forEach(uid=>{
      data.events[d][uid]=normalizeEventCode(data.events[d][uid]);
    });
  });

  db=data; normalizeSectorsAndAreas(); data=db;
  return data;
}

function normalizeSectorsAndAreas(){
  db.sectors=(db.sectors||[]).filter(s=>s.id!=="accreditamento");
  let s4=db.sectors.find(s=>s.id==="prevenzione"); if(!s4)db.sectors.push({id:"prevenzione",name:"Settore 4",hasAreas:true}); else {s4.name="Settore 4";s4.hasAreas=true;}
  let s7=db.sectors.find(s=>s.id==="territorio"); if(!s7)db.sectors.push({id:"territorio",name:"Settore 7",hasAreas:true}); else {s7.name="Settore 7";s7.hasAreas=true;}
  db.areas=(db.areas||[]).filter(a=>a.sectorId!=="accreditamento");
  const ea=(id,sectorId,name,color)=>{let a=db.areas.find(x=>x.id===id); if(!a)db.areas.push({id,sectorId,name,color}); else {a.sectorId=sectorId;a.name=name;a.color=color;}};
  ea("prev","prevenzione","Prevenzione","#2563eb"); ea("vet","prevenzione","Veterinaria","#dc2626"); ea("terr","territorio","Territorio","#2563eb"); ea("conv","territorio","Convenzionata","#dc2626");
  db.users=(db.users||[]).filter(u=>u.sectorId!=="accreditamento");
  db.users.forEach(u=>{if(u.sectorId==="territorio"&&(u.areaId==="territorio"||u.areaId==="*"))u.areaId="terr"; if(Array.isArray(u.editableAreaIds))u.editableAreaIds=u.editableAreaIds.map(x=>x==="territorio"?"terr":x).filter(x=>x!=="accreditamento"); if(Array.isArray(u.visibleSectorIds))u.visibleSectorIds=u.visibleSectorIds.filter(x=>x!=="accreditamento");});
}

function saveDb(){const raw=JSON.stringify(db);localStorage.setItem(STORE,raw);lastDbSnapshot=raw;try{if(liveChannel)liveChannel.postMessage({type:"update",t:Date.now()})}catch(e){}; scheduleCloudSave();}
function resetDemo(){localStorage.removeItem(STORE);db=freshDb();currentUser=null;renderLogin("Demo resettata.")}
function sectorName(id){return id==="*"?"Tutti":(db.sectors.find(s=>s.id===id)?.name||id)}
function areaName(id){return id==="all"?"Tutte":id==="*"?"Tutte":(db.areas.find(a=>a.id===id)?.name||id)}
function areaColor(id){return db.areas.find(a=>a.id===id)?.color||"#64748b"}
function sectorById(id){return db.sectors.find(s=>s.id===id)}
function areasOfSector(sectorId){return db.areas.filter(a=>a.sectorId===sectorId)}
function fullName(u){return `${u.name} ${u.surname||""}`.trim()}
function abbreviatePart(part){
  part=(part||"").trim();
  if(!part)return "";
  if(part.length>8)return part.slice(0,8)+".";
  return part;
}
function sortByName(a,b){return fullName(a).localeCompare(fullName(b),"it",{sensitivity:"base"});}
function shortPersonName(u){
  let names=(u.name||"").trim().split(/\s+/).filter(Boolean);
  let surnames=(u.surname||"").trim().split(/\s+/).filter(Boolean);
  let first=abbreviatePart(names[0]||"");
  let otherNames=names.slice(1).map(x=>(x[0]||"").toLowerCase()+".").join(" ");
  let firstSurname=abbreviatePart(surnames[0]||"");
  let otherSurnames=surnames.slice(1).map(x=>(x[0]||"").toLowerCase()+".").join(" ");
  return [first,otherNames,firstSurname,otherSurnames].filter(Boolean).join(" ");
}
function uid(prefix="id"){return prefix+"-"+Date.now()+"-"+Math.floor(Math.random()*9999)}
function fmt(date){return date.split("-").reverse().join("/")}
function dateKey(day){return`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`}
function monthName(){return new Date(viewYear,viewMonth,1).toLocaleDateString("it-IT",{month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase())}
function daysInMonth(){return new Date(viewYear,viewMonth+1,0).getDate()}
function roleLabel(r){return ROLE_LABELS[r]||r}
function holidaysFor(y){let h={};[["01-01","Capodanno"],["01-06","Epifania"],["04-25","Festa della Liberazione"],["05-01","Festa dei Lavoratori"],["06-02","Festa della Repubblica"],["08-15","Ferragosto"],["11-01","Tutti i Santi"],["12-08","Immacolata"],["12-25","Natale"],["12-26","Santo Stefano"]].forEach(([md,n])=>h[`${y}-${md}`]=n);h[`${y}-07-16`]="Festa patronale San Vitaliano";return h}
function isWeekend(date){let d=new Date(date+"T00:00:00").getDay();return d===0||d===6}
function isHoliday(date){return holidaysFor(Number(date.slice(0,4)))[date]}
function isBlockedDay(date){return isWeekend(date)||isHoliday(date)}
function weekDates(date){let d=new Date(date+"T00:00:00"),day=(d.getDay()+6)%7,monday=new Date(d);monday.setDate(d.getDate()-day);let out=[];for(let i=0;i<5;i++){let x=new Date(monday);x.setDate(monday.getDate()+i);out.push(x.toISOString().slice(0,10))}return out}
function isWorker(u){return u.role==="employee"||u.role==="sector_manager"}
function canManageUsers(){return currentUser?.role==="admin"}
function canRegisterColleagues(){return currentUser?.role==="admin"||currentUser?.role==="sector_manager"}
function eventFor(date,userId){if(isBlockedDay(date))return"blocked";return db.events?.[date]?.[userId]||"present"}
function isAbsent(st){return st!=="present"&&st!=="blocked"}
function statusTag(st){if(st==="blocked")return`<span class="tag danger-tag">Non lavorativo</span>`;let s=STATUS[st]||STATUS.present;return`<span class="tag ${s.cls}">${s.label}</span>`}
function addAudit(text){db.audit.unshift({id:uid("audit"),at:new Date().toLocaleString("it-IT"),by:currentUser?fullName(currentUser):"Sistema",text});db.audit=db.audit.slice(0,80)}
function pushNotification({text,scope,actorId=currentUser?.id||"system",sectorId=null,areaId=null,type="info"}){db.notifications.unshift({id:uid("note"),text,scope,sectorId,areaId,type,actorId,at:Date.now(),displayAt:new Date().toLocaleString("it-IT")});db.notifications=db.notifications.slice(0,120)}
function visibleNotifications(){
  if(!currentUser)return[];
  return db.notifications.filter(n=>{
    if(currentUser.role==="admin")return n.scope==="admin";
    if(currentUser.role==="viewer")return false;
    if(currentUser.role==="sector_manager"||currentUser.role==="employee"){
      return n.scope==="sector"&&currentUser.sectorId===n.sectorId&&n.actorId!==currentUser.id;
    }
    return false;
  });
}
function unreadCount(){if(!currentUser||(currentUser.role!=="sector_manager"&&currentUser.role!=="employee"))return 0;let last=db.lastRead[currentUser.id]||0;return visibleNotifications().filter(n=>n.at>last).length}
function pendingAdminCount(){if(!currentUser||currentUser.role!=="admin")return 0;return pendingRegistrations().length+db.requests.filter(r=>r.status==="pending").length}
function pendingRegistrations(){return db.users.filter(u=>!u.approved)}
function markNotificationsRead(){if(currentUser){db.lastRead[currentUser.id]=Date.now();saveDb()}}
function visibleUsers(includeViewers=false){return db.users.filter(u=>{if(!u.approved||u.role==="admin")return false;if(!includeViewers&&!isWorker(u))return false;if(currentUser.role==="admin")return(selectedSectorId==="all"||u.sectorId===selectedSectorId)&&(selectedAreaFilter==="all"||u.areaId===selectedAreaFilter||u.areaId==="*");if(currentUser.role==="viewer")return(currentUser.visibleSectorIds||[]).includes(u.sectorId);return u.sectorId===currentUser.sectorId})}
function canModifyUserEvents(userId){let u=db.users.find(x=>x.id===userId);if(!u||!isWorker(u))return false;if(currentUser.role==="admin")return true;if(currentUser.role==="sector_manager")return(currentUser.editableAreaIds||[]).includes(u.areaId);if(currentUser.role==="employee")return currentUser.id===u.id;return false}
function canEditEmployeeData(userId){let u=db.users.find(x=>x.id===userId);if(!u)return false;if(currentUser.role==="admin")return true;if(currentUser.role==="sector_manager")return(currentUser.editableAreaIds||[]).includes(u.areaId);return false}
function canEditProtectedData(){return currentUser.role==="admin"}


function ferieCodes(){return ["c01","c02","f14","ferie"];}
function isFerieCode(st){return ferieCodes().includes(st);}
function normalizeEventCode(st){
  if(st==="ferie")return "c01";
  if(st==="malattia")return "a01";
  if(st==="permesso")return "f14";
  return st;
}

function notificationText(actor,target,status,date){
  const action=status==="present"?"ha cancellato l’assenza":`ha inserito/modificato ${STATUS[status]?.label||status}`;
  if(actor.id===target.id)return `${fullName(actor)} ${action} per il giorno ${fmt(date)}`;
  return `${fullName(actor)} ${action} di ${fullName(target)} per il giorno ${fmt(date)}`;
}

function smartRuleWarnings(date,userId){
  let warnings=[];
  if(isBlockedDay(date))return warnings;
  let u=db.users.find(x=>x.id===userId);
  if(!u)return warnings;
  let wk=weekDates(date);

  let employeeSmart=wk.filter(d=>eventFor(d,userId)==="smart"&&d!==date);
  if(employeeSmart.length)warnings.push(`${fullName(u)} ha già uno smart working nella settimana (${fmt(employeeSmart[0])}).`);

  let sectorSmart=db.users.filter(x=>x.approved&&isWorker(x)&&x.sectorId===u.sectorId&&x.id!==userId&&eventFor(date,x.id)==="smart").length;
  if(sectorSmart>=3)warnings.push("Limite settore superato: più di 3 smart working complessivi nello stesso giorno.");

  let areaSmartSameDay=db.users.filter(x=>x.approved&&isWorker(x)&&x.areaId===u.areaId&&x.id!==userId&&eventFor(date,x.id)==="smart").length;
  if(areaSmartSameDay>=2)warnings.push("Limite area superato: più di 2 smart working della stessa area nello stesso giorno.");

  let hasDouble=wk.some(d=>d!==date&&db.users.filter(x=>x.approved&&isWorker(x)&&x.areaId===u.areaId&&eventFor(d,x.id)==="smart").length>=2);
  if(hasDouble&&areaSmartSameDay>=1)warnings.push("Questa area ha già usato il giorno settimanale con 2 persone in smart working.");
  return warnings;
}
function validateSmartRule(date,userId){
  if(isBlockedDay(date))return{ok:false,message:"Non puoi inserire smart working su sabato, domenica o festivo."};
  let warnings=smartRuleWarnings(date,userId);
  if(warnings.length)return{ok:true,warning:warnings.join(" ")};
  return{ok:true,message:"OK"};
}
function computedSmartRuleErrors(date){
  if(isBlockedDay(date))return[];
  let errors=[];
  for(let s of db.sectors){
    let c=db.users.filter(u=>u.approved&&isWorker(u)&&u.sectorId===s.id&&eventFor(date,u.id)==="smart").length;
    if(c>3)errors.push(`Settore ${s.name}: ${c} smart working, massimo consigliato 3`);
  }
  for(let a of db.areas){
    let c=db.users.filter(u=>u.approved&&isWorker(u)&&u.areaId===a.id&&eventFor(date,u.id)==="smart").length;
    if(c>2)errors.push(`Area ${a.name}: ${c} smart working, massimo consigliato 2`);
  }
  for(let a of db.areas){
    let doubles=weekDates(date).filter(d=>db.users.filter(u=>u.approved&&isWorker(u)&&u.areaId===a.id&&eventFor(d,u.id)==="smart").length>=2);
    if(doubles.length>1)errors.push(`Area ${a.name}: più di un giorno nella settimana con 2 persone in smart working`);
  }
  return errors;
}
function smartRuleErrorsForDay(date){
  return computedSmartRuleErrors(date).map((e,i)=>`Errore ${i+1}: ${e}`);
}
function refreshRuleViolations(date){
  if(!db.ruleViolations)db.ruleViolations={};
  const errs=smartRuleErrorsForDay(date);
  if(errs.length)db.ruleViolations[date]=errs;
  else delete db.ruleViolations[date];
}
function applyTheme(){
  document.body.classList.remove("theme-admin","theme-referente","theme-employee","theme-dirigente");
  if(!currentUser)return;
  if(currentUser.role==="admin")document.body.classList.add("theme-admin");
  else if(currentUser.role==="sector_manager")document.body.classList.add("theme-referente");
  else if(currentUser.role==="viewer")document.body.classList.add("theme-dirigente");
  else document.body.classList.add("theme-employee");
}

function saveSession(){
  if(!currentUser)return;
  try{
    localStorage.setItem(SESSION_STORE, JSON.stringify({
      userId: currentUser.id,
      at: Date.now()
    }));
  }catch(e){}
}
function clearSession(){
  try{localStorage.removeItem(SESSION_STORE)}catch(e){}
}
function restoreSession(){
  try{
    const raw=localStorage.getItem(SESSION_STORE);
    if(!raw)return false;
    const session=JSON.parse(raw);
    const u=db.users.find(x=>x.id===session.userId && x.approved);
    if(!u)return false;
    currentUser=u;
    selectedSectorId=u.role==="admin" ? "prevenzione" : u.sectorId;
    selectedAreaFilter="all";
    selectedPlanArea="all";
    if(!page)page="calendar";
    return true;
  }catch(e){
    return false;
  }
}
function syncCurrentUserAfterDbUpdate(){
  if(!currentUser)return;
  const fresh=db.users.find(u=>u.id===currentUser.id && u.approved);
  if(fresh){
    currentUser=fresh;
    saveSession();
  }else{
    currentUser=null;
    clearSession();
  }
}

function login(){let email=document.getElementById("loginEmail").value.trim().toLowerCase(),password=document.getElementById("loginPassword").value,u=db.users.find(x=>x.email.toLowerCase()===email&&x.password===password);if(!u){document.getElementById("loginError").textContent="Email o password non valide.";return}if(!u.approved){
    pushNotification({text:`Promemoria: ${fullName(u)} è ancora in attesa di approvazione`,scope:"admin",type:"registration",actorId:"system",sectorId:u.sectorId,areaId:u.areaId});
    saveDb();
    document.getElementById("loginError").textContent="Utenza in attesa di approvazione dal super admin.";
    return
  }currentUser=u;saveSession();selectedSectorId=u.role==="admin"?"prevenzione":u.sectorId;selectedAreaFilter="all";selectedPlanArea="all";page="calendar";render()}
function logout(){currentUser=null;adminUser=null;clearSession();renderLogin()}
function renderLogin(message=""){document.body.classList.remove("theme-admin","theme-referente","theme-employee","theme-dirigente");app.innerHTML=`<div class="login-page"><div class="login-box"><div class="logo">📅</div><div class="card"><div class="top"><h1>Gestione Personale</h1></div>${message?`<div class="notice">${message}</div>`:""}<label>Email</label><input id="loginEmail" placeholder="Email"><label>Password</label><input id="loginPassword" value="admin" type="password"><button class="btn primary full" onclick="login()">Entra</button><button class="btn secondary full" onclick="renderRegister()">Registrati</button><button class="forgot-link" onclick="renderForgotPassword()">Password dimenticata?</button><p id="loginError" class="error"></p></div></div></div>`}
function renderRegister(){app.innerHTML=`<div class="login-page"><div class="login-box"><div class="logo">👤</div><div class="card"><div class="top"><h1>Registrazione</h1><span class="pill">Registrazione</span></div><div class="form-grid"><div><label>Nome</label><input id="regName"></div><div><label>Cognome</label><input id="regSurname"></div></div><label>Email</label><input id="regEmail"><label>Password</label><input id="loginPassword" type="password" placeholder="Password"><div class="form-grid"><div><label>Settore</label><select id="regSector" onchange="refreshRegisterAreas()">${db.sectors.map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}</select></div><div id="regAreaWrap"><label>Area</label><select id="regArea"></select></div></div><div class="form-grid"><div><label>C01 ferie anno attuale</label><input id="regC01" type="number" value="0"></div><div><label>C02 ferie anno precedente</label><input id="regC02" type="number" value="0"></div><div><label>F14 festività soppresse residue</label><input id="regF14" type="number" value="0"></div></div><button class="btn primary full" onclick="registerUser()">Invia registrazione</button><button class="btn secondary full" onclick="renderLogin()">Torna al login</button><p id="regError" class="error"></p></div></div></div>`;refreshRegisterAreas()}
function refreshRegisterAreas(){let sec=document.getElementById("regSector").value,sector=sectorById(sec),wrap=document.getElementById("regAreaWrap"),sel=document.getElementById("regArea");if(sector&&sector.hasAreas){wrap.style.display="block";sel.innerHTML=areasOfSector(sec).map(a=>`<option value="${a.id}">${a.name}</option>`).join("")}else{wrap.style.display="none";let a=areasOfSector(sec)[0];sel.innerHTML=a?`<option value="${a.id}">${a.name}</option>`:""}}
function registerUser(){let name=document.getElementById("regName").value.trim(),surname=document.getElementById("regSurname").value.trim(),email=document.getElementById("regEmail").value.trim().toLowerCase(),password=document.getElementById("regPassword").value,sectorId=document.getElementById("regSector").value,areaId=document.getElementById("regArea").value,c02=Number(document.getElementById("regC02").value||0),c01=Number(document.getElementById("regC01").value||0),f14=Number(document.getElementById("regF14").value||0);if(!name||!surname||!email||!password||!areaId){document.getElementById("regError").textContent="Compila tutti i dati.";return}let existing=db.users.find(u=>u.email.toLowerCase()===email);
  if(existing){
    if(!existing.approved){
      document.getElementById("regError").textContent="Registrazione già inviata: utenza in attesa di approvazione dal super admin.";
      return;
    }
    document.getElementById("regError").textContent="Email già registrata.";
    return;
  }db.users.push({id:uid("user"),email,password,name,surname,role:"employee",sectorId,areaId,visibleSectorIds:[sectorId],editableAreaIds:[],c01,c02,f14,approved:false,initials:createInitialsForUser(name,surname),color:"#0ea5e9"});pushNotification({text:`Nuova utenza da abilitare: ${name} ${surname} - ${sectorName(sectorId)} / ${areaName(areaId)}`,scope:"admin",type:"registration",actorId:"system",sectorId,areaId});addAudit(`Nuova registrazione: ${name} ${surname}`);saveDb();renderLogin("Registrazione inviata. Il super admin deciderà ruolo e permessi.")}
function renderForgotPassword(){
  app.innerHTML=`<div class="login-page"><div class="login-box"><div class="logo">🔐</div><div class="card"><div class="top"><h1>Password dimenticata</h1><span class="pill">richiesta admin</span></div><label>Email</label><input id="forgotEmail"><button class="btn primary full" onclick="sendForgotPassword()">Invia richiesta</button><button class="btn secondary full" onclick="renderLogin()">Torna al login</button><p id="forgotMsg" class="small"></p></div></div></div>`;
}
function sendForgotPassword(){
  let email=document.getElementById("forgotEmail").value.trim().toLowerCase();
  let u=db.users.find(x=>x.email.toLowerCase()===email);
  if(!u){document.getElementById("forgotMsg").textContent="Utente non trovato.";return}
  db.requests.unshift({id:uid("req"),type:"forgot_password",userId:u.id,newPassword:"",status:"pending",at:new Date().toLocaleString("it-IT")});
  pushNotification({text:`Password dimenticata: ${fullName(u)} chiede reset`,scope:"admin",type:"password",actorId:"system",sectorId:u.sectorId,areaId:u.areaId});
  saveDb();
  document.getElementById("forgotMsg").textContent="Richiesta inviata.";
}
function pageTitleLabel(){
  const labels={calendar:"Calendario",plan:"Piano ferie",profile:"Dati personali",people:"Dipendenti",registercolleague:"Registra collega",reports:"Riepilogo",admin:"Admin",notifications:"Notifiche"};
  return labels[page]||"Gestione Personale";
}
function goBack(){
  if(modalOpen){modalOpen=false;render();return}
  if(planModalOpen){closePlanDay();return}
  let prev=navStack.pop();
  page=prev||"calendar";
  render();
}
function backButton(){
  if(page==="calendar"&&!modalOpen&&!planModalOpen)return "";
  return `<button class="back-btn no-print" onclick="goBack()">← Indietro</button>`;
}

function nav(id){if(page!==id)navStack.push(page);page=id;modalOpen=false;planModalOpen=false;mobileMenuOpen=false;render()}

function startImpersonation(userId){
  if(currentUser.role!=="admin"&&!adminUser)return;
  if(!adminUser)adminUser=currentUser;
  const u=db.users.find(x=>x.id===userId);
  if(!u||u.role==="admin")return;
  currentUser=u;
  selectedSectorId=u.sectorId;
  selectedAreaFilter="all";
  selectedPlanArea="all";
  page="calendar";
  mobileMenuOpen=false;
  render();
}
function stopImpersonation(){
  if(!adminUser)return;
  currentUser=adminUser;
  adminUser=null;
  selectedSectorId="prevenzione";
  selectedAreaFilter="all";
  selectedPlanArea="all";
  page="admin";
  render();
}
function renderSwitchUserPanel(){
  if(currentUser.role!=="admin"&&!adminUser)return "";
  const list=db.users.filter(u=>u.approved&&u.role!=="admin").map(u=>`<button class="switch-user-row" onclick="startImpersonation('${u.id}')"><span>${fullName(u)}</span><small>${roleLabel(u.role)} · ${sectorName(u.sectorId)} / ${areaName(u.areaId)}</small></button>`).join("");
  return `<div class="card switch-card"><h3 class="section-title">Cambio utente</h3>${adminUser?`<div class="warning">Stai visualizzando come ${fullName(currentUser)}. <button class="btn secondary" onclick="stopImpersonation()">Torna super admin</button></div>`:""}<div class="switch-list">${list}</div></div>`;
}
function toggleMobileMenu(){mobileMenuOpen=!mobileMenuOpen;render();}

function userContextLabel(u){
  if(!u)return "";
  if(u.role==="employee"){let area=(u.areaId&&u.areaId!=="*"&&areasOfSector(u.sectorId).length)?`/${areaName(u.areaId)}`:"";return `${sectorName(u.sectorId)}${area}`;}
  if(u.role==="viewer"){let sectors=(u.visibleSectorIds||[]).map(sectorName).join(" e ");return `Dirigente ${sectors||sectorName(u.sectorId)}`;}
  if(u.role==="sector_manager"){let editable=u.editableAreaIds||[];let sectors=[...new Set(editable.map(aid=>db.areas.find(a=>a.id===aid)?.sectorId).filter(Boolean))];if(sectors.length===1){let allAreas=areasOfSector(sectors[0]).map(a=>a.id);let all=allAreas.length&&allAreas.every(a=>editable.includes(a));if(all)return `Referente ${sectorName(sectors[0])}`;return `Referente ${editable.map(areaName).join(" e ")}`;}return `Referente ${sectors.map(sectorName).join(" e ")||sectorName(u.sectorId)}`;}
  if(u.role==="admin")return "Super admin"; return roleLabel(u.role);
}

function navButton(id,label){let b="";if(id==="admin"&&pendingAdminCount()>0)b=`<span class="nav-badge">${pendingAdminCount()}</span>`;return`<button class="${page===id?'active':''}" onclick="nav('${id}')">${label}${b}</button>`}
function bellButton(){
  if(!currentUser||(currentUser.role!=="sector_manager"&&currentUser.role!=="employee"))return "";
  let n=unreadCount();
  return `<button class="icon-bell global-bell-btn" onclick="nav('notifications')" title="Notifiche">🔔${n?`<span class="num">${n}</span>`:""}</button>`;
}
function contextTitle(){return`GESTIONALE - ${sectorName(selectedSectorId)}${selectedAreaFilter!=="all"?" / "+areaName(selectedAreaFilter):""}`}
function selectorControls(){if(currentUser.role==="admin")return`<div class="sector-filter"><label>Settore</label><select onchange="selectedSectorId=this.value;selectedAreaFilter='all';selectedPlanArea='all';render()">${db.sectors.map(s=>`<option value="${s.id}" ${selectedSectorId===s.id?'selected':''}>${s.name}</option>`).join("")}</select><label>Area</label><select onchange="selectedAreaFilter=this.value;selectedPlanArea=this.value;render()"><option value="all" ${selectedAreaFilter==="all"?'selected':''}>Tutte</option>${areasOfSector(selectedSectorId).map(a=>`<option value="${a.id}" ${selectedAreaFilter===a.id?'selected':''}>${a.name}</option>`).join("")}</select></div>`;if(currentUser.role==="viewer"){let sectors=db.sectors.filter(s=>(currentUser.visibleSectorIds||[]).includes(s.id));return`<div class="sector-filter"><label>Settore</label><select onchange="selectedSectorId=this.value;selectedAreaFilter='all';selectedPlanArea='all';render()">${sectors.map(s=>`<option value="${s.id}" ${selectedSectorId===s.id?'selected':''}>${s.name}</option>`).join("")}</select></div>`}return""}
function layout(content){
  if(typeof currentUser==="undefined"||!currentUser){return renderLogin();}
  applyTheme();
  document.body.classList.remove("page-calendar","page-plan","page-profile","page-people","page-registercolleague","page-reports","page-admin","page-notifications");
  document.body.classList.add("page-"+page);
  const navHtml=`<div class="brand"><div class="brand-icon">📅</div><div><strong>Gestione Personale</strong></div></div><div class="nav">${navButton("calendar","📅 Calendario")}${navButton("plan","🗓️ Piano ferie")}${navButton("profile","👤 Dati personali")}${canManageUsers()?navButton("people","👥 Dipendenti"):""}${canRegisterColleagues()?navButton("registercolleague","➕ Registra collega"):""}${navButton("reports","📊 Riepilogo")}${canManageUsers()?navButton("admin","⚙️ Admin"):""}</div><div class="userbox small"><b>${fullName(currentUser)}</b><br>${userContextLabel(currentUser)}${adminUser?`<br><button class="btn secondary full" onclick="stopImpersonation()">Torna super admin</button>`:""}<button class="btn secondary full" onclick="logout()">Esci</button></div>`;
  app.innerHTML=`<div class="mobile-appbar no-print"><button class="mobile-menu-btn" onclick="toggleMobileMenu()">☰</button><strong>${pageTitleLabel()}</strong><div>${bellButton()}</div></div>${mobileMenuOpen?`<div class="mobile-overlay" onclick="toggleMobileMenu()"></div>`:""}<div class="app ${mobileMenuOpen?'menu-open':''}"><aside class="sidebar">${navHtml}</aside><main class="main"><div class="global-bell-wrap no-print desktop-bell">${bellButton()}</div>${backButton()}${adminUser?`<div class="impersonation-banner no-print">Modalità super admin: stai visualizzando come <b>${fullName(currentUser)}</b></div>`:""}${content}</main></div>`;
}
function avatarClass(u){return u.role==="viewer"?"viewer":u.role==="sector_manager"?"referente":""}
function nameClass(u){return u.role==="viewer"?"name-viewer":u.role==="sector_manager"?"name-referente":""}
function personRow(u,date,editable=false){let st=eventFor(date,u.id);return`<div class="person"><div class="avatar ${avatarClass(u)}" style="background:${u.color}">${u.initials}</div><div class="meta"><b class="${nameClass(u)}">${fullName(u)}</b><small>${sectorName(u.sectorId)} / ${areaName(u.areaId)}</small></div>${statusTag(st)}${editable&&isAbsent(st)?`<button class="btn danger" onclick="removeEvent('${date}','${u.id}')">Rimuovi</button>`:""}</div>`}
function changeMonth(delta){viewMonth+=delta;if(viewMonth<0){viewMonth=11;viewYear--}if(viewMonth>11){viewMonth=0;viewYear++}selectedDate=`${viewYear}-${String(viewMonth+1).padStart(2,"0")}-01`;modalOpen=false;render()}
function openDay(date){selectedDate=date;modalOpen=true;render()}
function closeModal(){modalOpen=false;render()}
function renderCalendar(){let days="",hmap=holidaysFor(viewYear),blanks=(new Date(viewYear,viewMonth,1).getDay()+6)%7;for(let i=0;i<Math.min(blanks,5);i++)days+=`<div class="day blank"><div class="empty-day">—</div></div>`;for(let d=1;d<=daysInMonth();d++){let date=dateKey(d),dow=new Date(date+"T00:00:00").getDay();if(dow===0||dow===6)continue;let hol=hmap[date],errs=smartRuleErrorsForDay(date),abs=hol?[]:visibleUsers().filter(u=>isAbsent(eventFor(date,u.id))),dots=abs.map(u=>{let st=eventFor(date,u.id),s=STATUS[st];return`<span class="person-dot" title="${fullName(u)} - ${s.label}" style="background:${s.color}">${s.short}</span>`}).join("");days+=`<button class="day ${selectedDate===date?'selected':''} ${hol?'holiday':''} ${errs.length?'rule-error':''}" onclick="openDay('${date}')"><div class="day-num">${d}</div>${errs.length?`<div class="danger-mark">!</div>`:""}${hol?`<div class="holiday-name">${hol}</div>`:""}<div class="dot-row">${dots||`<span class="empty-day">${hol?"Festivo":"Nessun assente"}</span>`}</div></button>`}let errs=smartRuleErrorsForDay(selectedDate),modal=modalOpen?renderDayModal():"";layout(`<div class="top"><h1>${contextTitle()}</h1><div class="sector-filter">${selectorControls()}</div></div><div class="calendar-wrap"><div class="calendar-toolbar"><button class="btn secondary" onclick="changeMonth(-1)">← Mese precedente</button><div class="month-title">${monthName()}</div><button class="btn secondary" onclick="changeMonth(1)">Mese successivo →</button></div><div class="calendar-head"><div>LUN</div><div>MAR</div><div>MER</div><div>GIO</div><div>VEN</div></div><div class="calendar">${days}</div></div><div class="card" style="margin-top:16px"><div class="top"><h3 class="section-title">Riepilogo ${fmt(selectedDate)}</h3><span class="pill">${isHoliday(selectedDate)||"Giorno lavorativo"}</span></div>${isBlockedDay(selectedDate)?`<p class="small">Giorno non lavorativo.</p>`:visibleUsers().map(u=>personRow(u,selectedDate,canModifyUserEvents(u.id))).join("")}</div>${modal}`)}
function renderDayModal(){
  let hol=isHoliday(selectedDate)||isWeekend(selectedDate),
      errs=smartRuleErrorsForDay(selectedDate),
      people=isBlockedDay(selectedDate)?[]:visibleUsers(),
      canAdd=!isBlockedDay(selectedDate)&&people.some(u=>canModifyUserEvents(u.id));
  return `<div class="modal-backdrop" onclick="if(event.target.className==='modal-backdrop')closeModal()">
    <div class="modal ios-sheet">
      <div class="modal-grabber"></div>
      <div class="modal-head">
        <div>
          <h2>${fmt(selectedDate)}</h2>
          <p class="small modal-subtitle">${hol?"Giorno non lavorativo":"Riepilogo presenze e assenze"}</p>
        </div>
        <button class="close" onclick="closeModal()">Chiudi</button>
      </div>
      ${hol?`<div class="warning">Giorno non lavorativo. Non puoi inserire nulla.</div>`:""}
      ${errs.length?`<div class="warning">⚠️ ${errs.join("<br>")}</div>`:""}
      ${canAdd?`<div class="quick-action">${renderInlineEventForm()}</div>`:""}
      <div class="card day-list-card">
        <h3 class="section-title">Chi c'è e chi no</h3>
        ${people.length?people.map(u=>personRow(u,selectedDate,canModifyUserEvents(u.id))).join(""):`<p class="small">Nessun riepilogo.</p>`}
      </div>
    </div>
  </div>`;
}
function renderInlineEventForm(){
  let people=visibleUsers().filter(u=>canModifyUserEvents(u.id));
  if(currentUser.role==="employee"){
    return `<div class="card insert-card"><h3 class="section-title">Inserisci / modifica</h3><div class="quick-form"><select id="eventStatus"><option value="c01">C01 - Ferie anno attuale</option><option value="c02">C02 - Ferie anno precedente</option><option value="f14">F14 - Festività soppresse</option><option value="smart">SW - Smart working</option><option value="a01">A01 - Malattia</option><option value="altro">ALTRO</option><option value="present">In servizio / rimuovi assenza</option></select><button class="btn primary" onclick="saveEventFromPopup()">Salva</button></div><p id="eventError" class="error"></p></div>`;
  }
  return `<div class="card insert-card"><h3 class="section-title">Inserisci / modifica</h3><div class="quick-form manager"><select id="eventUser">${people.map(u=>`<option value="${u.id}">${fullName(u)} - ${areaName(u.areaId)}</option>`).join("")}</select><select id="eventStatus"><option value="c01">C01 - Ferie anno attuale</option><option value="c02">C02 - Ferie anno precedente</option><option value="f14">F14 - Festività soppresse</option><option value="smart">SW - Smart working</option><option value="a01">A01 - Malattia</option><option value="altro">ALTRO</option><option value="present">In servizio / rimuovi assenza</option></select><button class="btn primary" onclick="saveEventFromPopup()">Salva</button></div><p id="eventError" class="error"></p></div>`;
}
function saveEventFromPopup(){
  let userId=document.getElementById("eventUser")?document.getElementById("eventUser").value:currentUser.id;
  let st=normalizeEventCode(document.getElementById("eventStatus").value),date=selectedDate,u=db.users.find(x=>x.id===userId);
  if(st==="smart"){
    let v=validateSmartRule(date,userId);
    if(!v.ok){document.getElementById("eventError").textContent=v.message;return}
  }
  if(isBlockedDay(date)){document.getElementById("eventError").textContent="Non puoi inserire su sabato, domenica o giorno festivo.";return}
  if(!canModifyUserEvents(userId)){document.getElementById("eventError").textContent="Non puoi modificare questo utente.";return}
  if(!db.events[date])db.events[date]={};
  if(st==="present")delete db.events[date][userId];
  else db.events[date][userId]=st;
  refreshRuleViolations(date);
  addAudit(`${STATUS[st].label} per ${fullName(u)} il ${fmt(date)}`);
  pushNotification({text:notificationText(currentUser,u,st,date),scope:"sector",sectorId:u.sectorId,actorId:currentUser.id,type:"event"});
  saveDb();render();
}
function removeEvent(date,userId){
  if(isBlockedDay(date)||!canModifyUserEvents(userId))return;
  let u=db.users.find(x=>x.id===userId);
  if(db.events[date])delete db.events[date][userId];
  refreshRuleViolations(date);
  pushNotification({text:notificationText(currentUser,u,"present",date),scope:"sector",sectorId:u.sectorId,actorId:currentUser.id,type:"event"});
  addAudit(`Rimossa assenza di ${fullName(u)} il ${fmt(date)}`);
  saveDb();render();
}
function renderProfile(){let u=currentUser;layout(`<div class="top"><h1>DATI PERSONALI</h1><span class="pill">${roleLabel(u.role)}</span></div><div class="grid two"><div class="card"><h3 class="section-title">I miei dati</h3><div class="form-grid"><div><label>Nome</label><input id="profileName" value="${u.name}"></div><div><label>Cognome</label><input id="profileSurname" value="${u.surname||""}"></div><div><label>Email</label><input value="${u.email}" disabled></div><div><label>Settore</label><input value="${sectorName(u.sectorId)}" disabled></div><div><label>Area</label><input value="${areaName(u.areaId)}" disabled></div><div><label>Ruolo</label><input value="${roleLabel(u.role)}" disabled></div></div><button class="btn primary" onclick="saveProfile()">Salva nome e cognome</button></div><div class="card"><h3 class="section-title">Richiesta cambio password</h3><label>Nuova password richiesta</label><input id="requestedPassword" type="password"><button class="btn secondary" onclick="requestPasswordChange()">Invia richiesta</button><p id="profileMsg" class="small"></p></div></div>`)}
function saveProfile(){currentUser.name=document.getElementById("profileName").value.trim();currentUser.surname=document.getElementById("profileSurname").value.trim();currentUser.initials=createInitialsForUser(currentUser.name,currentUser.surname,currentUser.id);let u=db.users.find(x=>x.id===currentUser.id);Object.assign(u,currentUser);addAudit(`${fullName(currentUser)} ha aggiornato nome/cognome`);saveDb();render()}
function requestPasswordChange(){let pwd=document.getElementById("requestedPassword").value;if(!pwd){document.getElementById("profileMsg").textContent="Inserisci la nuova password richiesta.";return}db.requests.unshift({id:uid("req"),type:"password",userId:currentUser.id,newPassword:pwd,status:"pending",at:new Date().toLocaleString("it-IT")});pushNotification({text:`${fullName(currentUser)} ha richiesto cambio password`,scope:"admin",actorId:"system",type:"password",sectorId:currentUser.sectorId,areaId:currentUser.areaId});saveDb();document.getElementById("profileMsg").textContent="Richiesta inviata."}
function renderRegisterColleague(){let sectors=currentUser.role==="admin"?db.sectors:db.sectors.filter(s=>s.id===currentUser.sectorId);layout(`<div class="top"><h1>REGISTRA COLLEGA</h1><span class="pill">${roleLabel(currentUser.role)}</span></div><div class="card"><div class="form-grid"><div><label>Nome</label><input id="colName"></div><div><label>Cognome</label><input id="colSurname"></div><div><label>Email</label><input id="colEmail"></div><div><label>Password provvisoria</label><input id="colPassword" value="1234"></div><div><label>Settore</label><select id="colSector" onchange="refreshColAreas()">${sectors.map(s=>`<option value="${s.id}">${s.name}</option>`).join("")}</select></div><div><label>Area</label><select id="colArea"></select></div><div><label>C01 ferie anno attuale</label><input id="colC01" type="number" value="0"></div><div><label>C02 ferie anno precedente</label><input id="colC02" type="number" value="0"></div><div><label>F14 festività soppresse residue</label><input id="colF14" type="number" value="0"></div></div><button class="btn primary" onclick="saveColleague()">Registra collega</button><p id="colMsg" class="small"></p></div>`);refreshColAreas()}
function refreshColAreas(){let sec=document.getElementById("colSector").value,sel=document.getElementById("colArea"),areas=areasOfSector(sec);if(currentUser.role==="sector_manager")areas=areas.filter(a=>(currentUser.editableAreaIds||[]).includes(a.id));sel.innerHTML=areas.map(a=>`<option value="${a.id}">${a.name}</option>`).join("")}
function saveColleague(){let name=document.getElementById("colName").value.trim(),surname=document.getElementById("colSurname").value.trim(),email=document.getElementById("colEmail").value.trim().toLowerCase(),password=document.getElementById("colPassword").value||"1234",sectorId=document.getElementById("colSector").value,areaId=document.getElementById("colArea").value,c02=Number(document.getElementById("colC02").value||0),c01=Number(document.getElementById("colC01").value||0),f14=Number(document.getElementById("colF14").value||0);if(!name||!surname||!email||!areaId){document.getElementById("colMsg").textContent="Compila tutti i dati.";return}if(currentUser.role==="sector_manager"&&!(currentUser.editableAreaIds||[]).includes(areaId)){document.getElementById("colMsg").textContent="Non puoi registrare colleghi in questa area.";return}if(db.users.some(u=>u.email.toLowerCase()===email)){document.getElementById("colMsg").textContent="Email già presente.";return}db.users.push({id:uid("user"),email,password,name,surname,role:"employee",sectorId,areaId,visibleSectorIds:[sectorId],editableAreaIds:[],c01,c02,f14,approved:true,initials:createInitialsForUser(name,surname),color:"#0ea5e9"});saveDb();document.getElementById("colMsg").textContent="Collega registrato."}

function usersForAdminPeople(){
  if(currentUser.role!=="admin")return visibleUsers(true);
  return db.users.filter(u=>{
    if(u.role==="admin")return false;
    return (selectedSectorId==="all"||u.sectorId===selectedSectorId)&&(selectedAreaFilter==="all"||u.areaId===selectedAreaFilter);
  });
}
function renderPeople(){
  let rows=usersForAdminPeople().map(u=>`<div class="person clickable" onclick="selectedEmployeeId='${u.id}';render()"><div class="avatar ${avatarClass(u)}" style="background:${u.color}">${u.initials}</div><div class="meta"><b class="${nameClass(u)}">${fullName(u)}</b><small>${u.email} · ${sectorName(u.sectorId)} / ${areaName(u.areaId)} · ${roleLabel(u.role)}</small></div><span class="tag ${u.approved?'approved':'pending'}">${u.approved?'Attivo':'In attesa'}</span></div>`).join("");
  let detail=selectedEmployeeId?renderEmployeeDetail(db.users.find(u=>u.id===selectedEmployeeId)):`<div class="card"><p class="small">Seleziona un utente per modificare i dati consentiti.</p></div>`;
  layout(`<div class="top"><h1>DIPENDENTI</h1><div>${selectorControls()}</div></div><div class="notice">${currentUser.role==="admin"?"Super admin: puoi modificare tutto tranne la matricola, che è stata rimossa per privacy.":"Referente: vedi il settore intero, ma modifichi solo le aree abilitate."}</div><div class="grid two"><div class="card"><h3 class="section-title">Elenco</h3>${rows||"<p class='small'>Nessun utente.</p>"}</div>${detail}</div>`);
}

function renderEmployeeDetail(u){if(!u)return"";let protectedDisabled=!canEditProtectedData()?"disabled":"",canEdit=canEditEmployeeData(u.id);if(!canEdit)return`<div class="card"><p class="small">Puoi visualizzare questo utente, ma non modificarlo.</p>${personRow(u,selectedDate,false)}</div>`;return`<div class="card"><h3 class="section-title">Scheda utente</h3><div class="form-grid"><div><label>Nome</label><input id="d_name" value="${u.name}"></div><div><label>Cognome</label><input id="d_surname" value="${u.surname||""}"></div><div><label>Email</label><input id="d_email" value="${u.email}" ${protectedDisabled}></div><div><label>Password</label><input id="d_password" value="${u.password}" ${protectedDisabled}></div><div><label>Settore</label><select id="d_sector" onchange="refreshDetailAreas()" ${protectedDisabled}>${db.sectors.map(s=>`<option value="${s.id}" ${u.sectorId===s.id?'selected':''}>${s.name}</option>`).join("")}</select></div><div><label>Area</label><select id="d_area" ${protectedDisabled}></select></div><div><label>Ruolo</label><select id="d_role" ${protectedDisabled}><option value="employee" ${u.role==="employee"?'selected':''}>Dipendente</option><option value="viewer" ${u.role==="viewer"?'selected':''}>Dirigente</option><option value="sector_manager" ${u.role==="sector_manager"?'selected':''}>Referente</option></select></div><div><label>Stato</label><select id="d_approved" ${protectedDisabled}><option value="true" ${u.approved?'selected':''}>Abilitato</option><option value="false" ${!u.approved?'selected':''}>Non abilitato</option></select></div><div><label>C01 ferie anno attuale</label><input id="d_c01" type="number" value="${u.c01||0}" ${protectedDisabled}></div><div><label>C02 ferie anno precedente</label><input id="d_c02" type="number" value="${u.c02||0}" ${protectedDisabled}></div><div><label>F14 festività soppresse</label><input id="d_f14" type="number" value="${u.f14||0}" ${protectedDisabled}></div></div>${canEditProtectedData()?`<label>Aree modificabili se referente</label><div class="check-list">${db.areas.map(a=>`<label class="check-row"><input type="checkbox" class="d_edit_area" value="${a.id}" ${(u.editableAreaIds||[]).includes(a.id)?'checked':''}> ${sectorName(a.sectorId)} / ${a.name}</label>`).join("")}</div><label>Settori visibili se dirigente</label><div class="check-list">${db.sectors.map(s=>`<label class="check-row"><input type="checkbox" class="d_visible_sector" value="${s.id}" ${(u.visibleSectorIds||[]).includes(s.id)?'checked':''}> ${s.name}</label>`).join("")}</div>`:""}<div class="actions"><button class="btn primary" onclick="saveEmployeeDetail('${u.id}')">Salva modifiche</button>${canEditProtectedData()?`<button class="btn danger" onclick="deleteUser('${u.id}')">Elimina</button>`:""}</div></div>`}
function refreshDetailAreas(){let sec=document.getElementById("d_sector").value,area=document.getElementById("d_area"),u=db.users.find(x=>x.id===selectedEmployeeId);area.innerHTML=areasOfSector(sec).map(a=>`<option value="${a.id}" ${u&&u.areaId===a.id?'selected':''}>${a.name}</option>`).join("")}
function saveEmployeeDetail(id){let u=db.users.find(x=>x.id===id);if(!u||!canEditEmployeeData(id))return;u.name=document.getElementById("d_name").value;u.surname=document.getElementById("d_surname").value;u.initials=createInitialsForUser(u.name,u.surname,u.id);if(canEditProtectedData()){u.email=document.getElementById("d_email").value;u.password=document.getElementById("d_password").value;u.sectorId=document.getElementById("d_sector").value;u.areaId=document.getElementById("d_area").value;u.role=document.getElementById("d_role").value;u.approved=document.getElementById("d_approved").value==="true";u.c02=Number(document.getElementById("d_c02").value||0);u.c01=Number(document.getElementById("d_c01").value||0);u.f14=Number(document.getElementById("d_f14").value||0);u.editableAreaIds=[...document.querySelectorAll(".d_edit_area:checked")].map(x=>x.value);u.visibleSectorIds=[...document.querySelectorAll(".d_visible_sector:checked")].map(x=>x.value);if(u.role==="employee"){u.visibleSectorIds=[u.sectorId];u.editableAreaIds=[]}if(u.role==="sector_manager"&&u.editableAreaIds.length===0)u.editableAreaIds=[u.areaId];if(u.role==="viewer"&&u.visibleSectorIds.length===0)u.visibleSectorIds=[u.sectorId];if(u.role==="viewer")u.color="#dc2626";if(u.role==="sector_manager")u.color="#7c3aed"}addAudit(`Aggiornata scheda di ${fullName(u)}`);saveDb();render()}
function deleteUser(id){if(!confirm("Eliminare utente?"))return;let u=db.users.find(x=>x.id===id);db.users=db.users.filter(x=>x.id!==id);Object.keys(db.events).forEach(d=>delete db.events[d][id]);addAudit(`Eliminato ${fullName(u)}`);saveDb();selectedEmployeeId=null;render()}

function userReport(u){
  let r={c01:0,c02:0,f14:0,smart:0,a01:0,altro:0};
  Object.keys(db.events).forEach(d=>{
    if(isBlockedDay(d))return;
    let st=normalizeEventCode(db.events[d][u.id]);
    if(r[st]!==undefined)r[st]++;
  });
  r.c01Total=Number(u.c01||0);
  r.c02Total=Number(u.c02||0);
  r.f14Total=Number(u.f14||0);
  r.c01Residue=r.c01Total-r.c01;
  r.c02Residue=r.c02Total-r.c02;
  r.f14Residue=r.f14Total-r.f14;
  r.ferieUsate=r.c01+r.c02+r.f14;
  r.ferieResidue=r.c01Residue+r.c02Residue+r.f14Residue;
  r.totaleDisponibile=r.c01Total+r.c02Total+r.f14Total;
  return r;
}
function renderReports(){
  let people=currentUser.role==="employee"?[currentUser]:visibleUsers();
  let cards=people.map(u=>{
    let r=userReport(u);
    let usedPct=r.totaleDisponibile?Math.min(100,Math.round((r.ferieUsate/r.totaleDisponibile)*100)):0;
    return `<div class="summary-card">
      <div class="person" style="border-bottom:0;padding-top:0">
        <div class="avatar ${avatarClass(u)}" style="background:${u.color}">${u.initials}</div>
        <div class="meta"><b class="${nameClass(u)}">${fullName(u)}</b><small>${sectorName(u.sectorId)} / ${areaName(u.areaId)}</small></div>
      </div>
      <div class="summary-bar"><span style="width:${usedPct}%"></span></div>
      <div class="summary-grid">
        <div><strong>${r.c01Residue}</strong><span>C01 residue</span></div>
        <div><strong>${r.c02Residue}</strong><span>C02 residue</span></div>
        <div><strong>${r.f14Residue}</strong><span>F14 residue</span></div>
        <div><strong>${r.smart}</strong><span>SW usati</span></div>
        <div><strong>${r.a01}</strong><span>A01 malattia</span></div>
        <div><strong>${r.altro}</strong><span>ALTRO</span></div>
      </div>
      <p class="small">Usate: C01 ${r.c01} · C02 ${r.c02} · F14 ${r.f14}. Totale residuo ferie/festività: ${r.ferieResidue} giorni.</p>
    </div>`;
  }).join("");
  layout(`<div class="top"><h1>RIEPILOGO</h1><div>${selectorControls()}</div></div><div class="summary-wrap">${cards}</div>`);
}
function renderNotifications(){markNotificationsRead();let notes=visibleNotifications(),list=notes.length?notes.map(n=>`<div class="toast-note"><b>${n.text}</b><br><span class="small">${n.displayAt}</span></div>`).join(""):`<p class="small">Nessuna notifica.</p>`;layout(`<div class="top"><h1>NOTIFICHE</h1><span class="pill">${notes.length} totali</span></div><div class="card">${list}</div>`)}





function renderAdmin(){
  const pending=pendingRegistrations();
  let newUsers=pending.map(u=>`<div class="person">
    <div class="avatar ${avatarClass(u)}" style="background:${u.color}">${u.initials}</div>
    <div class="meta">
      <b class="${nameClass(u)}">Richiesta registrazione: ${fullName(u)}</b>
      <small>${u.email} · ${sectorName(u.sectorId)} / ${areaName(u.areaId)}</small>
    </div>
    <div class="actions">
      <button class="btn primary" onclick="approveRegistration('${u.id}')">Approva</button>
      <button class="btn secondary" onclick="page='people';selectedEmployeeId='${u.id}';selectedSectorId='${u.sectorId}';selectedAreaFilter='${u.areaId}';render()">Modifica</button>
      <button class="btn danger" onclick="deleteUser('${u.id}')">Elimina</button>
    </div>
  </div>`).join("");

  let pwdReqs=db.requests.filter(r=>r.status==="pending").map(r=>{
    let u=db.users.find(x=>x.id===r.userId);
    if(!u)return "";
    if(r.type==="forgot_password"){
      return `<div class="person"><div class="meta"><b>${fullName(u)} ha dimenticato la password</b><small>${r.at}</small><input id="reset_${r.id}" placeholder="Nuova password"></div><button class="btn primary" onclick="approveForgotPassword('${r.id}')">Imposta password</button><button class="btn danger" onclick="rejectPasswordRequest('${r.id}')">Rifiuta</button></div>`;
    }
    return `<div class="person"><div class="meta"><b>${fullName(u)} richiede cambio password</b><small>${r.at}</small></div><button class="btn primary" onclick="approvePasswordRequest('${r.id}')">Approva</button><button class="btn danger" onclick="rejectPasswordRequest('${r.id}')">Rifiuta</button></div>`;
  }).join("");

  let adminNotes=visibleNotifications().slice(0,10).map(n=>`<div class="toast-note"><b>${n.text}</b><br><span class="small">${n.displayAt}</span></div>`).join("");
  let audit=db.audit.slice(0,12).map(a=>`<div class="person"><div class="meta"><b>${a.text}</b><small>${a.at} · ${a.by}</small></div></div>`).join("")||`<p class="small">Nessuna modifica.</p>`;

  layout(`<div class="top"><h1>ADMIN</h1><span class="pill">${pendingAdminCount()} richieste</span></div>
    <div class="grid two">
      <div class="card"><h3 class="section-title">Registrazioni da approvare</h3>${newUsers||`<p class="small">Nessuna registrazione in attesa.</p>`}</div>
      <div class="card"><h3 class="section-title">Password e notifiche</h3>${pwdReqs||""}${adminNotes||`<p class="small">Nessuna richiesta password o notifica.</p>`}</div>
    </div>
    ${renderSwitchUserPanel()}
    ${renderSectorAdminPanel()}
    <div class="card"><h3 class="section-title">Backup dati</h3><div class="actions"><button class="btn primary" onclick="exportData()">Esporta backup JSON</button><button class="btn secondary" onclick="triggerImportData()">Importa backup JSON</button></div><p class="small">Usalo prima di pubblicare nuove versioni o modificare logiche/CSS.</p></div>
    <div class="card"><h3 class="section-title">Storico</h3>${audit}<button class="btn danger" onclick="resetDemo()">Reset demo</button></div>`);
}

function slugifyId(text){return (text||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||uid("settore");}
function renderSectorAdminPanel(){if(currentUser.role!=="admin")return "";let sectors=db.sectors.map(s=>{let areas=areasOfSector(s.id).map(a=>`<span class="tag smart">${a.name}</span>`).join(" ");return `<div class="person"><div class="meta"><b>${s.name}</b><small>${areas||"Nessuna area"}</small></div><div class="actions"><input id="area_${s.id}" placeholder="Nuova area"><button class="btn secondary" onclick="addAreaToSector('${s.id}')">Aggiungi area</button></div></div>`}).join("");return `<div class="card"><h3 class="section-title">Settori e aree</h3>${sectors}<div class="form-grid"><div><label>Nuovo settore</label><input id="newSectorName" placeholder="Es. Settore 5"></div><div><label>Prima area opzionale</label><input id="newSectorArea" placeholder="Es. Area unica"></div></div><button class="btn primary" onclick="addSector()">Crea settore</button><p class="small">Dopo la creazione compare in registrazione, ruoli e piano ferie.</p></div>`;}
function addSector(){let name=document.getElementById("newSectorName").value.trim(),areaNameValue=document.getElementById("newSectorArea").value.trim();if(!name){alert("Inserisci il nome del settore.");return}let id=slugifyId(name),base=id,n=2;while(db.sectors.some(s=>s.id===id))id=base+"-"+n++;db.sectors.push({id,name,hasAreas:!!areaNameValue});if(areaNameValue)db.areas.push({id:slugifyId(id+"-"+areaNameValue),sectorId:id,name:areaNameValue,color:"#64748b"});addAudit(`Creato settore ${name}`);saveDb();render();}
function addAreaToSector(sectorId){let input=document.getElementById(`area_${sectorId}`),name=input.value.trim();if(!name){alert("Inserisci il nome dell'area.");return}let id=slugifyId(sectorId+"-"+name),base=id,n=2;while(db.areas.some(a=>a.id===id))id=base+"-"+n++;db.areas.push({id,sectorId,name,color:"#64748b"});let s=db.sectors.find(x=>x.id===sectorId);if(s)s.hasAreas=true;addAudit(`Creata area ${name} in ${sectorName(sectorId)}`);saveDb();render();}

function approveRegistration(userId){
  let u=db.users.find(x=>x.id===userId);
  if(!u)return;
  u.approved=true;
  if(!u.visibleSectorIds||!u.visibleSectorIds.length)u.visibleSectorIds=[u.sectorId];
  if(!u.editableAreaIds)u.editableAreaIds=[];
  addAudit(`Approvata registrazione di ${fullName(u)}`);
  saveDb();
  render();
}

function approvePasswordRequest(id){let r=db.requests.find(x=>x.id===id),u=db.users.find(x=>x.id===r.userId);if(!r||!u)return;u.password=r.newPassword;r.status="approved";addAudit(`Approvato cambio password per ${fullName(u)}`);saveDb();render()}
function approveForgotPassword(id){let r=db.requests.find(x=>x.id===id),u=db.users.find(x=>x.id===r.userId);if(!r||!u)return;let pwd=(document.getElementById(`reset_${id}`).value.trim())||"1234";u.password=pwd;r.status="approved";addAudit(`Reset password per ${fullName(u)}`);saveDb();render()}
function rejectPasswordRequest(id){let r=db.requests.find(x=>x.id===id);if(!r)return;r.status="rejected";addAudit("Rifiutata richiesta password");saveDb();render()}





function openPlanDayFromCard(el){
  if(!el)return;
  openPlanDay(el.getAttribute("data-date"),el.getAttribute("data-sector"),el.getAttribute("data-area"));
}
function openPlanDay(date,sectorId,areaId){
  selectedPlanDate=date;
  selectedPlanSectorId=sectorId;
  selectedPlanAreaForModal=areaId;
  planModalOpen=true;
  render();
}
function closePlanDay(){
  planModalOpen=false;
  selectedPlanDate=null;
  render();
}
function renderPlanDayModal(){
  if(!planModalOpen || !selectedPlanDate)return "";
  let sectorId=selectedPlanSectorId || selectedSectorId || currentUser.sectorId;
  let areaId=selectedPlanAreaForModal || selectedPlanArea || "all";
  let people=planPeople(sectorId,areaId).sort(sortByName);
  let holidays=people.filter(u=>isFerieCode(eventFor(selectedPlanDate,u.id))).sort(sortByName);
  let present=people.filter(u=>!isFerieCode(eventFor(selectedPlanDate,u.id))).sort(sortByName);
  return `<div class="modal-backdrop plan-day-backdrop" onclick="if(event.target.classList.contains('plan-day-backdrop'))closePlanDay()">
    <div class="modal ios-sheet">
      <div class="modal-grabber"></div>
      <div class="modal-head">
        <div>
          <h2>${fmt(selectedPlanDate)}</h2>
          <p class="small">Piano ferie - ${areaId==="all"?sectorName(sectorId):areaName(areaId)}</p>
        </div>
        <button class="close" onclick="closePlanDay()">Chiudi</button>
      </div>
      <div class="card day-list-card"><h3 class="section-title">In ferie</h3>${holidays.length?holidays.map(u=>personRow(u,selectedPlanDate,false)).join(""):`<p class="small">Nessuno in ferie.</p>`}</div>
      <div class="card day-list-card"><h3 class="section-title">In servizio</h3>${present.length?present.map(u=>personRow(u,selectedPlanDate,false)).join(""):`<p class="small">Nessuno in servizio.</p>`}</div>
    </div>
  </div>`;
}
function planSectorSelect(){
  if(currentUser.role!=="admin")return "";
  return `<select onchange="selectedSectorId=this.value;selectedPlanArea='all';render()">${db.sectors.map(s=>`<option value="${s.id}" ${selectedSectorId===s.id?'selected':''}>${s.name}</option>`).join("")}</select>`;
}
function planPrintAreaLabel(sectorId,areaId){return areaId==="all"?sectorName(sectorId).toUpperCase():areaName(areaId).toUpperCase();}
function renderPlan(){
  let periods={estate:["2025-06","2025-07","2025-08","2025-09"],natale:["2025-12","2026-01"],pasqua:["2026-04"]};
  let months=periods[selectedPlanPeriod]||periods.estate;
  let sectorId=currentUser.role==="admin"?selectedSectorId:currentUser.sectorId;
  if(!sectorId||sectorId==="all"||sectorId==="*")sectorId="prevenzione";
  let areas=areasOfSector(sectorId);
  if(!areas.length)areas=[{id:sectorId,sectorId,name:sectorName(sectorId),color:"#64748b"}];
  if(!selectedPlanArea)selectedPlanArea="all";
  let areaOptions=`<option value="all" ${selectedPlanArea==="all"?'selected':''}>${sectorName(sectorId)}</option>`+
    areas.map(a=>`<option value="${a.id}" ${selectedPlanArea===a.id?'selected':''}>SOLO ${a.name}</option>`).join("");
  let settoreStampa =
    (sectorId==="prevenzione" && selectedPlanArea==="all")
      ? "SETTORE PREVENZIONE (PREV + VET)"
      : `SETTORE ${sectorName(sectorId).toUpperCase()}`;
  let printTitle=`PIANO FERIE - ${settoreStampa} - ${planPrintAreaLabel(sectorId,selectedPlanArea)}`;
  let content=months.map(m=>renderPlanMonthLayout(m,sectorId,selectedPlanArea)).join("");
  layout(`<div class="plan-shell">
    <div class="plan-top no-print">
      <h1>PIANO FERIE</h1>
      <div class="plan-controls">
        ${planSectorSelect()}
        <label>VISUALIZZAZIONE:</label>
        <select onchange="selectedPlanArea=this.value;render()">${areaOptions}</select>
        <select onchange="selectedPlanPeriod=this.value;render()">
          <option value="estate" ${selectedPlanPeriod==="estate"?'selected':''}>Estate: giugno-settembre</option>
          <option value="natale" ${selectedPlanPeriod==="natale"?'selected':''}>Natale: dicembre-gennaio</option>
          <option value="pasqua" ${selectedPlanPeriod==="pasqua"?'selected':''}>Settimana di Pasqua</option>
        </select>
        <button class="btn primary print-btn" onclick="window.print()">ESPORTA PDF</button>
      </div>
    </div>
    <div class="print-title">${printTitle}</div>
    <div class="plan-blue-line no-print"></div>
    <div class="print-area">${content}</div>
    <div class="plan-legend no-print">
      <div><b>LEGENDA PERCENTUALI</b></div>
      <span><i style="background:#22c55e"></i>0%</span>
      <span><i style="background:#84cc16"></i>1%-20%</span>
      <span><i style="background:#facc15"></i>21%-50%</span>
      <span><i style="background:#f97316"></i>51%-80%</span>
      <span><i style="background:#ef4444"></i>81%-100%</span>
      <span class="legend-area"><i style="background:#2563eb"></i>Prevenzione</span>
      <span class="legend-area"><i style="background:#dc2626"></i>Veterinaria</span>
    </div>
  </div>`);
}
function planPeople(sectorId,areaId){
  return db.users.filter(u=>u.approved&&isWorker(u)&&u.sectorId===sectorId&&(areaId==="all"||u.areaId===areaId));
}
function pctColor(pct){
  if(pct<=0)return "#fff";
  if(pct<=20)return "#86efac";
  if(pct<=50)return "#fde047";
  if(pct<=80)return "#fb923c";
  return "#f87171";
}
function monthLabel(month){
  let [y,m]=month.split("-").map(Number);
  return new Date(y,m-1,1).toLocaleDateString("it-IT",{month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase());
}
function workingDaysOfMonth(month){
  let [y,m]=month.split("-").map(Number),days=new Date(y,m,0).getDate(),out=[];
  for(let d=1;d<=days;d++){
    let date=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if(!isWeekend(date))out.push({date,day:d});
  }
  return out;
}
function renderPlanMonthLayout(month,sectorId,areaId){
  const title=monthLabel(month);
  const label=areaId==="all" ? `${sectorName(sectorId)} - Insieme` : areaName(areaId);
  return `<div class="plan-month-card"><h2>${title}</h2><h3 class="area-title blue">${label}</h3>${renderPlanGrid(month,sectorId,areaId)}</div>`;
}
function renderPlanGrid(month,sectorId,areaId){
  const people=planPeople(sectorId,areaId);
  const total=people.length||1;
  return `<div class="plan-grid">${workingDaysOfMonth(month).map(({date,day})=>{
    let onHoliday=people.filter(u=>isFerieCode(eventFor(date,u.id))).sort(sortByName);
    let pct=Math.round((onHoliday.length/total)*100);
    let fill=pct?`<div class="plan-fill" style="width:${pct}%;background:${pctColor(pct)}"></div>`:"";
    let names="";
    if(areaId==="all"){
      let areaOrder=areasOfSector(sectorId).map(a=>a.id);
      names=areaOrder.map(aid=>{
        let group=onHoliday.filter(u=>u.areaId===aid).sort(sortByName);
        return group.map(u=>`<div class="plan-person" style="color:${areaColor(u.areaId)}">${shortPersonName(u)}</div>`).join("");
      }).join("");
    }else{
      names=onHoliday.map(u=>`<div class="plan-person" style="color:${areaColor(u.areaId)}">${shortPersonName(u)}</div>`).join("");
    }
    return `<div role="button" tabindex="0" class="plan-card-white plan-clickable" data-date="${date}" data-sector="${sectorId}" data-area="${areaId}"><div class="plan-fill-wrap">${fill}</div><div class="plan-day-num">${day}</div><div class="plan-names">${names}</div>${pct?`<div class="plan-percent">${pct}%</div>`:""}</div>`;
  }).join("")}</div>`;
}

function exportData(){
  const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`gestione-personale-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function triggerImportData(){
  const input=document.createElement("input");
  input.type="file";
  input.accept="application/json";
  input.onchange=async()=>{
    const file=input.files[0];
    if(!file)return;
    const text=await file.text();
    try{
      const imported=migrateDb(JSON.parse(text));
      if(!confirm("Importare questo backup? Sovrascriverà i dati locali di questo dispositivo."))return;
      db=imported;
      saveDb();
      render();
    }catch(e){
      alert("File backup non valido.");
    }
  };
  input.click();
}
function render(){if(!currentUser)return renderLogin();if(page==="calendar")return renderCalendar();if(page==="plan")return renderPlan();if(page==="profile")return renderProfile();if(page==="notifications")return renderNotifications();if(page==="people")return renderPeople();if(page==="registercolleague")return renderRegisterColleague();if(page==="reports")return renderReports();if(page==="admin")return renderAdmin()}
document.addEventListener("keydown",function(e){
  const card=e.target.closest(".plan-clickable");
  if(card&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openPlanDay(card.dataset.date,card.dataset.sector,card.dataset.area);}
});


function handlePlanCardActivation(target){
  const card=target.closest ? target.closest(".plan-clickable") : null;
  if(!card)return false;
  openPlanDay(card.dataset.date,card.dataset.sector,card.dataset.area);
  return true;
}
document.addEventListener("click",function(e){
  if(handlePlanCardActivation(e.target)){
    e.preventDefault();
    e.stopPropagation();
  }
},true);
document.addEventListener("touchend",function(e){
  if(handlePlanCardActivation(e.target)){
    e.preventDefault();
    e.stopPropagation();
  }
},{capture:true,passive:false});
document.addEventListener("keydown",function(e){
  const card=e.target.closest ? e.target.closest(".plan-clickable") : null;
  if(card && (e.key==="Enter" || e.key===" ")){
    e.preventDefault();
    openPlanDay(card.dataset.date,card.dataset.sector,card.dataset.area);
  }
},true);

initFirebaseSync();
if(restoreSession()) render(); else renderLogin();