/* =========================================================
   Gestione Personale v63 - riscrittura
   Architettura: Firestore con collezioni separate
     sectors/{id}, areas/{id}, users/{id}, events/{YYYY-MM-DD},
     notifications/{id}, requests/{id}, audit/{id}, meta/config
   Ogni "Salva" scrive SOLO il documento interessato.
   Local cache in localStorage per avvio offline/veloce.
   ========================================================= */

const VERSION = "v63";
const STORE = "gestione_personale_v63";
const SESSION_STORE = "gestione_personale_session_v63";
const DATA_SCHEMA_VERSION = 63;

const STATUS = {
  present:{label:"", short:"", cls:"present", color:"#16a34a"},
  smart:{label:"SV – Smart working", short:"SV", cls:"smart", color:"#2563eb"},
  c01:{label:"C01 - Ferie anno attuale", short:"C01", cls:"ferie", color:"#f97316"},
  c02:{label:"C02 - Ferie anno precedente", short:"C02", cls:"ferie", color:"#fb923c"},
  f14:{label:"F14 - Festività soppresse", short:"F14", cls:"permesso", color:"#7c3aed"},
  a01:{label:"A01 - Malattia", short:"A01", cls:"malattia", color:"#ef4444"},
  altro:{label:"ALTRO", short:"ALT", cls:"altro", color:"#64748b"}
};
const ROLE_LABELS = {admin:"Super admin", employee:"Dipendente", viewer:"Dirigente", sector_manager:"Referente"};

const INITIAL_SECTORS = [
  {id:"prevenzione", name:"Settore 4", hasAreas:true},
  {id:"territorio", name:"Settore 7", hasAreas:true}
];
const INITIAL_AREAS = [
  {id:"prev", sectorId:"prevenzione", name:"Prevenzione", color:"#2563eb"},
  {id:"vet", sectorId:"prevenzione", name:"Veterinaria", color:"#dc2626"},
  {id:"terr", sectorId:"territorio", name:"Territorio", color:"#2563eb"},
  {id:"conv", sectorId:"territorio", name:"Convenzionata", color:"#dc2626"}
];
const SEED_ADMIN = {
  id:"admin", email:"jackfrosties@hotmail.it", password:"admin",
  name:"Super", surname:"Admin", role:"admin",
  sectorId:"*", areaId:"*",
  visibleSectorIds:["prevenzione","territorio"],
  editableAreaIds:["prev","vet","terr","conv"],
  c01:0, c02:0, f14:0, approved:true, initials:"SA", color:"#0b1f3a"
};

/* ---------- Stato applicativo in memoria ---------- */
let db = {
  meta:{version:VERSION, schema:DATA_SCHEMA_VERSION},
  sectors:[...INITIAL_SECTORS],
  areas:[...INITIAL_AREAS],
  users:[SEED_ADMIN],
  events:{},
  notifications:[],
  requests:[],
  audit:[],
  lastRead:{},
  ruleViolations:{}
};

let currentUser = null;
let adminUser = null;
let mobileMenuOpen = false;
let navStack = [];
let planModalOpen = false;
let selectedPlanDate = null;
let selectedPlanSectorId = null;
let selectedPlanAreaForModal = null;
let page = "calendar";
let selectedDate = todayStr();
let viewYear = Number(selectedDate.slice(0,4));
let viewMonth = Number(selectedDate.slice(5,7)) - 1;
let modalOpen = false;
let selectedSectorId = "prevenzione";
let selectedAreaFilter = "all";
let selectedEmployeeId = null;
let selectedPlanPeriod = "estate";
let selectedPlanArea = "all";
const app = document.getElementById("app");

function todayStr(){ return new Date().toISOString().slice(0,10); }

/* ---------- Helper generici ---------- */
function uid(prefix){ prefix = prefix || "id"; return prefix+"-"+Date.now()+"-"+Math.floor(Math.random()*9999); }
function fmt(date){ return date.split("-").reverse().join("/"); }
function fullName(u){ return (u.name + " " + (u.surname||"")).trim(); }
function sortByName(a,b){ return fullName(a).localeCompare(fullName(b),"it",{sensitivity:"base"}); }
function roleLabel(r){ return ROLE_LABELS[r]||r; }
function sectorName(id){ return id==="*" ? "Tutti" : ((db.sectors.find(function(s){return s.id===id;})||{}).name || id); }
function areaName(id){ return (id==="all"||id==="*") ? "Tutte" : ((db.areas.find(function(a){return a.id===id;})||{}).name || id); }
function areaColor(id){ var a=db.areas.find(function(x){return x.id===id;}); return a ? a.color : "#64748b"; }
function sectorById(id){ return db.sectors.find(function(s){return s.id===id;}); }
function areasOfSector(sectorId){ return db.areas.filter(function(a){return a.sectorId===sectorId;}); }

function abbreviatePart(part){
  part=(part||"").trim();
  if(!part) return "";
  if(part.length>8) return part.slice(0,8)+".";
  return part;
}
function shortPersonName(u){
  var names=(u.name||"").trim().split(/\s+/).filter(Boolean);
  var surnames=(u.surname||"").trim().split(/\s+/).filter(Boolean);
  var initials=names.map(function(x){return x[0].toUpperCase()+".";}).join(" ");
  return [initials, surnames.join(" ")].filter(Boolean).join(" ");
}
function createInitialsForUser(name,surname){
  var a=(name||"").trim()[0]||"", b=(surname||"").trim()[0]||"";
  return (a+b).toUpperCase() || "??";
}

/* ---------- Date / calendario ---------- */
function dateKey(day){ return viewYear+"-"+String(viewMonth+1).padStart(2,"0")+"-"+String(day).padStart(2,"0"); }
function monthName(){ return new Date(viewYear,viewMonth,1).toLocaleDateString("it-IT",{month:"long",year:"numeric"}).replace(/^./,function(c){return c.toUpperCase();}); }
function daysInMonth(){ return new Date(viewYear,viewMonth+1,0).getDate(); }
function monthKeyOf(date){ return date.slice(0,7); }
function holidaysFor(y){
  var h={};
  [["01-01","Capodanno"],["01-06","Epifania"],["04-25","Festa della Liberazione"],
   ["05-01","Festa dei Lavoratori"],["06-02","Festa della Repubblica"],["08-15","Ferragosto"],
   ["11-01","Tutti i Santi"],["12-08","Immacolata"],["12-25","Natale"],["12-26","Santo Stefano"]
  ].forEach(function(pair){h[y+"-"+pair[0]]=pair[1];});
  h[y+"-07-16"]="Festa patronale San Vitaliano";
  return h;
}
function isWeekend(date){ var d=new Date(date+"T00:00:00").getDay(); return d===0||d===6; }
function isHoliday(date){ return holidaysFor(Number(date.slice(0,4)))[date]; }
function isBlockedDay(date){ return isWeekend(date)||isHoliday(date); }
function weekDates(date){
  var d=new Date(date+"T00:00:00"), day=(d.getDay()+6)%7, monday=new Date(d);
  monday.setDate(d.getDate()-day);
  var out=[];
  for(var i=0;i<5;i++){ var x=new Date(monday); x.setDate(monday.getDate()+i); out.push(x.toISOString().slice(0,10)); }
  return out;
}

/* ---------- Codici evento ---------- */
function ferieCodes(){ return ["c01","c02","f14"]; }
function isFerieCode(st){ return ferieCodes().indexOf(st)>=0; }
function normalizeEventCode(st){
  if(st==="ferie") return "c01";
  if(st==="malattia") return "a01";
  if(st==="permesso") return "f14";
  return st;
}
function eventFor(date,userId){
  if(isBlockedDay(date)) return "blocked";
  return (db.events[date] && db.events[date][userId]) || "present";
}
function isAbsent(st){ return st!=="present" && st!=="blocked"; }
function statusTag(st){
  if(st==="blocked") return '<span class="tag danger-tag">Non lavorativo</span>';
  var s=STATUS[st]||STATUS.present;
  return '<span class="tag '+s.cls+'">'+s.label+'</span>';
}

/* ---------- Permessi ---------- */
function isWorker(u){ return u.role==="employee" || u.role==="sector_manager"; }
function canManageUsers(){ return currentUser && currentUser.role==="admin"; }
function canRegisterColleagues(){ return currentUser && (currentUser.role==="admin" || currentUser.role==="sector_manager"); }
function canModifyUserEvents(userId){
  var u=db.users.find(function(x){return x.id===userId;});
  if(!u||!isWorker(u)) return false;
  if(currentUser.role==="admin") return true;
  if(currentUser.role==="sector_manager") return (currentUser.editableAreaIds||[]).indexOf(u.areaId)>=0;
  if(currentUser.role==="employee") return currentUser.id===u.id;
  return false;
}
function canEditEmployeeData(userId){
  var u=db.users.find(function(x){return x.id===userId;});
  if(!u) return false;
  if(currentUser.role==="admin") return true;
  if(currentUser.role==="sector_manager") return (currentUser.editableAreaIds||[]).indexOf(u.areaId)>=0;
  return false;
}
function canEditProtectedData(){ return currentUser.role==="admin"; }

function visibleUsers(includeViewers){
  return db.users.filter(function(u){
    if(!u.approved||u.role==="admin") return false;
    if(!includeViewers && !isWorker(u)) return false;
    if(currentUser.role==="admin") return (selectedSectorId==="all"||u.sectorId===selectedSectorId) && (selectedAreaFilter==="all"||u.areaId===selectedAreaFilter||u.areaId==="*");
    if(currentUser.role==="viewer") return (currentUser.visibleSectorIds||[]).indexOf(u.sectorId)>=0;
    return u.sectorId===currentUser.sectorId;
  });
}

/* ---------- Audit / notifiche ---------- */
function addAudit(text){
  var entry={id:uid("audit"), at:new Date().toLocaleString("it-IT"), atTs:Date.now(), by:currentUser?fullName(currentUser):"Sistema", text:text};
  db.audit.unshift(entry);
  db.audit=db.audit.slice(0,80);
  queueAuditWrite(entry);
}
function pushNotification(opts){
  var entry={id:uid("note"), text:opts.text, scope:opts.scope, sectorId:opts.sectorId||null, areaId:opts.areaId||null, type:opts.type||"info", actorId:opts.actorId||(currentUser?currentUser.id:"system"), at:Date.now(), displayAt:new Date().toLocaleString("it-IT")};
  db.notifications.unshift(entry);
  db.notifications=db.notifications.slice(0,120);
  queueNotificationWrite(entry);
}
function visibleNotifications(){
  if(!currentUser) return [];
  return db.notifications.filter(function(n){
    if(currentUser.role==="admin") return n.scope==="admin";
    if(currentUser.role==="viewer") return false;
    if(currentUser.role==="sector_manager"||currentUser.role==="employee"){
      return n.scope==="sector" && currentUser.sectorId===n.sectorId && n.actorId!==currentUser.id;
    }
    return false;
  });
}
function unreadCount(){
  if(!currentUser||(currentUser.role!=="sector_manager"&&currentUser.role!=="employee")) return 0;
  var last=db.lastRead[currentUser.id]||0;
  return visibleNotifications().filter(function(n){return n.at>last;}).length;
}
function pendingAdminCount(){
  if(!currentUser||currentUser.role!=="admin") return 0;
  return pendingRegistrations().length + db.requests.filter(function(r){return r.status==="pending";}).length;
}
function pendingRegistrations(){ return db.users.filter(function(u){return !u.approved;}); }
function markNotificationsRead(){
  if(!currentUser) return;
  db.lastRead[currentUser.id]=Date.now();
  queueMetaWrite();
}

function notificationText(actor,target,status,date){
  var action = status==="present" ? "ha cancellato l'assenza" : ("ha inserito/modificato "+((STATUS[status]||{}).label||status));
  if(actor.id===target.id) return fullName(actor)+" "+action+" per il giorno "+fmt(date);
  return fullName(actor)+" "+action+" di "+fullName(target)+" per il giorno "+fmt(date);
}

/* ---------- Regole smart working ----------
   1) Ogni dipendente: massimo 1 giorno di SW a settimana (bloccante)
   2) Stessa area: massimo 2 persone in SW lo stesso giorno
   3) Stesso settore: massimo 3 persone in SW lo stesso giorno (totale)
   Le regole 2 e 3 vengono segnalate con un triangolo di avviso sul
   giorno e un elenco di errori nel popup, ma non bloccano il salvataggio
   (può essere comunque necessario per urgenze); la regola 1 blocca.
---------------------------------------------- */
function validateSmartRule(date,userId){
  if(isBlockedDay(date)) return {ok:false, message:"Non puoi inserire smart working su sabato, domenica o festivo."};
  var u=db.users.find(function(x){return x.id===userId;});
  if(!u) return {ok:false, message:"Utente non trovato."};
  var wk=weekDates(date);
  var already=wk.filter(function(d){return d!==date && eventFor(d,userId)==="smart";});
  if(already.length) return {ok:false, message:fullName(u)+" ha già uno smart working questa settimana ("+fmt(already[0])+"). Massimo 1 a settimana per persona."};
  return {ok:true};
}
function countSmartArea(date,areaId,excludeUserId){
  return db.users.filter(function(x){return x.approved&&isWorker(x)&&x.areaId===areaId&&x.id!==excludeUserId&&eventFor(date,x.id)==="smart";}).length;
}
function countSmartSector(date,sectorId,excludeUserId){
  return db.users.filter(function(x){return x.approved&&isWorker(x)&&x.sectorId===sectorId&&x.id!==excludeUserId&&eventFor(date,x.id)==="smart";}).length;
}
function computedSmartRuleErrors(date){
  if(isBlockedDay(date)) return [];
  var errors=[];
  db.areas.forEach(function(a){
    var c=countSmartArea(date,a.id,null);
    if(c>2) errors.push("Area "+a.name+": "+c+" persone in smart working lo stesso giorno (massimo 2).");
  });
  db.sectors.forEach(function(s){
    var c=countSmartSector(date,s.id,null);
    if(c>3) errors.push("Settore "+s.name+": "+c+" persone in smart working lo stesso giorno (massimo 3 in totale).");
  });
  return errors;
}
function smartRuleErrorsForDay(date){
  return computedSmartRuleErrors(date);
}
function refreshRuleViolations(date){
  if(!db.ruleViolations) db.ruleViolations={};
  var errs=smartRuleErrorsForDay(date);
  if(errs.length) db.ruleViolations[date]=errs;
  else delete db.ruleViolations[date];
}

function planPeriods(){
  var y=Number(todayStr().slice(0,4));
  return {
    estate:[y+"-06",y+"-07",y+"-08",y+"-09"],
    natale:[y+"-12",(y+1)+"-01"],
    pasqua:[y+"-04"]
  };
}
