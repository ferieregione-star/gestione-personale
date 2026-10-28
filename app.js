/* =========================================================
   Gestione Personale v202
   ========================================================= */

let calendarView = "settore";

/* ---- Tema ---- */
function applyTheme(){
  document.body.classList.remove("theme-admin","theme-referente","theme-employee","theme-dirigente");
  if(!currentUser) return;
  if(currentUser.role==="admin") document.body.classList.add("theme-admin");
  else if(currentUser.role==="sector_manager") document.body.classList.add("theme-referente");
  else if(currentUser.role==="viewer") document.body.classList.add("theme-dirigente");
  else document.body.classList.add("theme-employee");
}

/* ---- Helpers UI ---- */
function ico(name,cls){ return '<svg class="ico'+(cls?' '+cls:'')+'" viewBox="0 0 24 24">'+(ICONS[name]||'')+'</svg>'; }
function userColorByArea(areaId){
  var a=db.areas.find(function(x){return x.id===areaId;});
  if(!a) return "#2563eb";
  var name=(a.name||"").toLowerCase();
  // verde: territorio, veterinaria
  if(name.indexOf("territ")!==-1||name.indexOf("veterin")!==-1) return "#16a34a";
  // blu: prevenzione, convenzionata e default
  return "#2563eb";
}
function avatarEl(u,sm){
  var cls='avatar'+(sm?' avatar-sm':'')+' '+(u.role==='viewer'?'':u.role==='sector_manager'?'':'');
  return '<div class="'+cls+'" style="background:'+u.color+'">'+u.initials+'</div>';
}
function personRowEl(u,date,canEdit){
  var st=eventFor(date,u.id);
  var removeBtn=canEdit&&isAbsent(st)?'<div class="person-action-row"><button class="btn btn-danger btn-sm" onclick="removeEvent(\''+date+'\',\''+u.id+'\')">Rimuovi</button></div>':'';
  return '<div class="person-row">'+
    avatarEl(u)+
    '<div class="person-meta">'+
      '<strong>'+fullName(u)+'</strong>'+
      '<small>'+areaName(u.areaId)+'</small>'+
      '<div class="person-badge-row">'+statusTag(st)+'</div>'+
      removeBtn+
    '</div>'+
  '</div>';
}

/* =========================================================
   LOGIN
   ========================================================= */
async function login(){
  var email=document.getElementById("lEmail").value.trim().toLowerCase();
  var pw=document.getElementById("lPw").value;
  var err=document.getElementById("lErr");
  try{if(firebaseAuth.currentUser)await firebaseAuth.signOut();await firebaseAuth.signInWithEmailAndPassword(email,pw);}catch(e){err.textContent=authErrorMessage(e);}
}
async function logout(){currentUser=null;adminUser=null;await firebaseAuth.signOut();window.location.reload();}

function renderLogin(msg){
  msg=msg||"";
  document.body.className="";
  app.innerHTML=
    '<div class="login-wrap"><div class="login-box">'+
    '<div class="login-logo"><img src="icons/icon-192.png" alt=""></div>'+
    '<div class="login-card">'+
    '<div class="login-title">Gestione Personale</div>'+
    (msg?'<div class="notice">'+msg+'</div>':'')+
    '<div class="form-row"><label>Email</label><input id="lEmail" type="email" autocomplete="username" placeholder="nome@esempio.it"></div>'+
    '<div class="form-row"><label>Password</label><input id="lPw" type="password" autocomplete="current-password" placeholder="••••••••"></div>'+
    '<button class="btn btn-primary btn-full" onclick="login()">Accedi</button>'+
    '<button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="renderRegister()">Registrati</button>'+
    '<button class="forgot-link" onclick="renderForgotPassword()">Password dimenticata?</button>'+
    '<p id="lErr" class="error-msg"></p>'+
    '</div></div></div>';
  document.getElementById("lEmail").addEventListener("keydown",e=>{if(e.key==="Enter")login();});
  document.getElementById("lPw").addEventListener("keydown",e=>{if(e.key==="Enter")login();});
}

function renderRegister(){
  page="register";
  app.innerHTML=
    '<div class="login-wrap"><div class="login-box"><div class="login-card">'+
    '<div class="login-title">Registrazione</div>'+
    '<div class="form-grid-2"><div class="form-row"><label>Nome</label><input id="rName"></div><div class="form-row"><label>Cognome</label><input id="rSurname"></div></div>'+
    '<div class="form-row"><label>Email</label><input id="rEmail" type="email"></div>'+
    '<div class="form-row"><label>Password</label><input id="rPw" type="password" autocomplete="new-password"></div>'+
    '<div class="form-row"><label>Ruolo richiesto</label><select id="rRole" onchange="refreshRegRole()">'+
      '<option value="employee">Dipendente</option>'+
      '<option value="sector_manager">Referente</option>'+
      '<option value="viewer">Dirigente</option>'+
    '</select></div>'+
    '<div id="rRoleFields"></div>'+
    '<button class="btn btn-primary btn-full" onclick="registerUser()">Invia registrazione</button>'+
    '<button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="page=null;renderLogin()">Torna al login</button>'+
    '<p id="rErr" class="error-msg"></p>'+
    '</div></div></div>';
  refreshRegRole();
}
function refreshRegRole(){
  var role=document.getElementById("rRole").value;
  var html="";
  if(role==="employee"){
    // Settore: select singola. Area: select singola
    var sOpts=db.sectors.map(s=>'<option value="'+s.id+'">'+htmlEscape(s.name)+'</option>').join("");
    html='<div class="form-row"><label>Settore</label><select id="rSector" onchange="refreshRegAreas()">'+sOpts+'</select></div>'+
         '<div class="form-row"><label>Area</label><select id="rArea"></select></div>';
  } else if(role==="sector_manager"){
    // Settore: radio (uno solo). Poi aree del settore come checkbox
    html='<div class="form-row"><label>Settore <small style="color:var(--c-muted)">(uno solo)</small></label><div class="check-list">'+
      db.sectors.map((s,i)=>'<label class="check-row"><input type="radio" name="r_sector_radio" class="r_sec_radio" value="'+s.id+'"'+(i===0?' checked':'')+' onchange="refreshRegAreas()">'+htmlEscape(s.name)+'</label>').join("")+'</div></div>'+
      '<div class="form-row" id="rAreaWrap"><label>Aree gestite <small style="color:var(--c-muted)">(una o più)</small></label><div class="check-list" id="rAreaChecks"></div></div>';
  } else if(role==="viewer"){
    // Settori: checkbox multipli
    html='<div class="form-row"><label>Settori visibili <small style="color:var(--c-muted)">(uno o più)</small></label><div class="check-list">'+
      db.sectors.map(s=>'<label class="check-row"><input type="checkbox" class="r_vs" value="'+s.id+'">'+htmlEscape(s.name)+'</label>').join("")+'</div></div>';
  }
  document.getElementById("rRoleFields").innerHTML=html;
  refreshRegAreas();
}
function refreshRegAreas(){
  var roleEl=document.getElementById("rRole");
  if(!roleEl) return;
  var role=roleEl.value;
  if(role==="employee"){
    var secEl=document.getElementById("rSector");
    if(!secEl) return;
    var areas=areasOfSector(secEl.value);
    var sel=document.getElementById("rArea");
    if(sel) sel.innerHTML=areas.map(a=>'<option value="'+a.id+'">'+htmlEscape(a.name)+'</option>').join("");
  } else if(role==="sector_manager"){
    var radios=document.querySelectorAll(".r_sec_radio");
    var checked=[...radios].find(r=>r.checked);
    if(!checked&&radios.length) checked=radios[0];
    var secId=checked?checked.value:"";
    var areas=areasOfSector(secId);
    var checks=document.getElementById("rAreaChecks");
    if(checks) checks.innerHTML=areas.map(a=>'<label class="check-row"><input type="checkbox" class="r_ea" value="'+a.id+'">'+htmlEscape(a.name)+'</label>').join("");
  }
}
async function registerUser(){
  var name=document.getElementById("rName").value.trim();
  var surname=document.getElementById("rSurname").value.trim();
  var email=document.getElementById("rEmail").value.trim().toLowerCase();
  var pw=document.getElementById("rPw").value;
  var role=document.getElementById("rRole").value;
  var sectorId="",areaId="",visibleSectorIds=[],editableAreaIds=[];
  if(role==="employee"){
    sectorId=document.getElementById("rSector").value;
    areaId=document.getElementById("rArea").value;
    visibleSectorIds=[sectorId];
  } else if(role==="sector_manager"){
    var radioChecked=document.querySelector(".r_sec_radio:checked");
    sectorId=radioChecked?radioChecked.value:(db.sectors[0]?db.sectors[0].id:"");
    editableAreaIds=[...document.querySelectorAll(".r_ea:checked")].map(x=>x.value);
    areaId=editableAreaIds[0]||(areasOfSector(sectorId)[0]?areasOfSector(sectorId)[0].id:"");
    visibleSectorIds=[sectorId];
    if(!editableAreaIds.length){document.getElementById("rErr").textContent="Seleziona almeno un'area da gestire.";return;}
  } else if(role==="viewer"){
    visibleSectorIds=[...document.querySelectorAll(".r_vs:checked")].map(x=>x.value);
    sectorId=visibleSectorIds[0]||db.sectors[0]?.id||"";
    areaId=areasOfSector(sectorId)[0]?.id||"";
    if(!visibleSectorIds.length){document.getElementById("rErr").textContent="Seleziona almeno un settore da visualizzare.";return;}
  }
  if(!name||!surname||!email||!pw){document.getElementById("rErr").textContent="Compila tutti i campi.";return;}
  if(pw.length<6){document.getElementById("rErr").textContent="La password deve avere almeno 6 caratteri.";return;}
  var color=role==="viewer"?"#DC2626":role==="sector_manager"?"#F59E0B":userColorByArea(areaId);
  var btn=document.querySelector("[onclick='registerUser()']");
  if(btn){btn.disabled=true;btn.textContent="Invio...";}
  try{
    registrationInProgress=true;
    var credential=await firebaseAuth.createUserWithEmailAndPassword(email,pw);
    var nu={id:credential.user.uid,email,name,surname,role,sectorId,areaId,visibleSectorIds,editableAreaIds,c01:0,c02:0,f14:0,approved:false,initials:createInitialsForUser(name,surname),color};
    await writeUser(nu);registrationInProgress=false;await firebaseAuth.signOut();
    page=null;renderLogin("Registrazione inviata. In attesa di approvazione.");
  }catch(e){registrationInProgress=false;var el=document.getElementById("rErr");if(el)el.textContent=authErrorMessage(e);if(btn){btn.disabled=false;btn.textContent="Invia registrazione";}}
}
function renderForgotPassword(){
  page="forgot";
  app.innerHTML='<div class="login-wrap"><div class="login-box"><div class="login-card">'+
    '<div class="login-title">Password dimenticata</div>'+
    '<div class="form-row"><label>Email</label><input id="fEmail" type="email"></div>'+
    '<button class="btn btn-primary btn-full" onclick="sendForgot()">Invia richiesta</button>'+
    '<button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="page=null;renderLogin()">Torna al login</button>'+
    '<p id="fMsg" class="error-msg"></p>'+
    '</div></div></div>';
}
async function sendForgot(){
  var email=document.getElementById("fEmail").value.trim().toLowerCase();
  var msg=document.getElementById("fMsg");
  try{await firebaseAuth.sendPasswordResetEmail(email);msg.textContent="Se l’indirizzo è registrato, riceverai un’email per reimpostare la password.";}
  catch(e){msg.textContent=e.code==="auth/invalid-email"?"Indirizzo email non valido.":"Se l’indirizzo è registrato, riceverai un’email per reimpostare la password.";}
}

/* =========================================================
   LAYOUT / NAVIGAZIONE
   ========================================================= */
function pageTitleLabel(){
  return {calendar:"Calendario",plan:"Piano ferie",profile:"Profilo",people:"Dipendenti",registercolleague:"Registra collega",reports:"Riepilogo",admin:"Admin",notifications:"Notifiche"}[page]||"";
}
function nav(id){
  if(page!==id)navStack.push(page);
  page=id;modalOpen=false;planModalOpen=false;mobileMenuOpen=false;
  insertOpen=false;insertUserId=null;insertCode=null;insertError="";
  if(id==="plan")loadEventsForPlanPeriod();
  if(id==="reports")loadEventsForReportYear();
  render();
}
function loadEventsForPlanPeriod(){planPeriods()[selectedPlanPeriod]&&planPeriods()[selectedPlanPeriod].forEach(loadEventsForMonth);}
function loadEventsForReportYear(){var y=String(new Date().getFullYear());for(var m=1;m<=12;m++)loadEventsForMonth(y+"-"+String(m).padStart(2,"0"));}
function goBack(){if(modalOpen){modalOpen=false;render();return;}if(planModalOpen){closePlanDay();return;}page=navStack.pop()||"calendar";render();}
function startImpersonation(userId){
  if(!adminUser)adminUser=currentUser;
  var u=db.users.find(x=>x.id===userId);if(!u||u.role==="admin")return;
  currentUser=u;
  if(u.role==="viewer"){selectedSectorId=(u.visibleSectorIds||[])[0]||u.sectorId;}
  else if(u.role==="sector_manager"){var smAreas=u.editableAreaIds||[];var smSecs=Array.from(new Set(smAreas.map(aid=>{var a=db.areas.find(x=>x.id===aid);return a?a.sectorId:null;}).filter(Boolean)));selectedSectorId=smSecs[0]||u.sectorId;}
  else{selectedSectorId=u.sectorId;}
  selectedAreaFilter="all";selectedPlanArea="all";
  selectedDate=todayStr();
  page="calendar";render();
}
function stopImpersonation(){if(!adminUser)return;currentUser=adminUser;adminUser=null;selectedSectorId="prevenzione";selectedAreaFilter="all";selectedPlanArea="all";page="admin";render();}
function toggleMobileMenu(){mobileMenuOpen=!mobileMenuOpen;render();}

function userContextLabel(u){
  if(!u)return"";
  if(u.role==="employee"){var a=(u.areaId&&u.areaId!=="*")?"/"+areaName(u.areaId):"";return sectorName(u.sectorId)+a;}
  if(u.role==="viewer")return"Dirigente "+((u.visibleSectorIds||[]).map(sectorName).join(" e ")||sectorName(u.sectorId));
  if(u.role==="sector_manager"){var ed=u.editableAreaIds||[];var ss=Array.from(new Set(ed.map(aid=>{var a=db.areas.find(x=>x.id===aid);return a?a.sectorId:null;}).filter(Boolean)));if(ss.length===1){var aa=areasOfSector(ss[0]).map(a=>a.id);if(aa.length&&aa.every(a=>ed.includes(a)))return"Referente "+sectorName(ss[0]);return"Referente "+ed.map(areaName).join(" e ");}return"Referente "+(ss.map(sectorName).join(" e ")||sectorName(u.sectorId));}
  if(u.role==="admin")return"Super admin";return roleLabel(u.role);
}
function selectorControls(){
  if(currentUser.role==="admin"){
    var sOpts=db.sectors.map(s=>'<option value="'+s.id+'"'+(selectedSectorId===s.id?" selected":"")+'>'+htmlEscape(s.name)+'</option>').join("");
    var aOpts='<option value="all"'+(selectedAreaFilter==="all"?" selected":"")+'>Tutte</option>'+areasOfSector(selectedSectorId).map(a=>'<option value="'+a.id+'"'+(selectedAreaFilter===a.id?" selected":"")+'>'+htmlEscape(a.name)+'</option>').join("");
    return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label style="margin:0">Settore</label><select style="width:auto;min-width:110px;margin:0" onchange="selectedSectorId=this.value;selectedAreaFilter=\'all\';selectedPlanArea=\'all\';calendarView=\'settore\';render()">'+sOpts+'</select><label style="margin:0">Area</label><select style="width:auto;min-width:110px;margin:0" onchange="selectedAreaFilter=this.value;selectedPlanArea=this.value;calendarView=\'settore\';render()">'+aOpts+'</select></div>';
  }
  if(currentUser.role==="viewer"){
    return viewerCalendarControls();
  }
  if(currentUser.role==="sector_manager"){
    // Referente: solo selettore settore se gestisce aree in più settori. Le aree restano tramite chip.
    var eas=currentUser.editableAreaIds||[];
    var mySmSecs=Array.from(new Set(eas.map(function(aid){var a=db.areas.find(function(x){return x.id===aid;});return a?a.sectorId:null;}).filter(Boolean)));
    if(mySmSecs.length>1){
      var sOpts=mySmSecs.map(function(sid){return'<option value="'+sid+'"'+(selectedSectorId===sid?" selected":"")+'>'+sectorName(sid)+'</option>';}).join("");
      return '<div style="display:flex;gap:8px;align-items:center"><label style="margin:0">Settore</label><select style="width:auto;min-width:110px;margin:0" onchange="selectedSectorId=this.value;calendarView=\'settore\';render()">'+sOpts+'</select></div>';
    }
    return "";
  }
  return "";
}

function viewerCalendarControls(){
  var mySecIds=currentUser.visibleSectorIds||[];
  var currentSec=selectedSectorId;
  if(!currentSec || currentSec==="*" || currentSec==="all" || mySecIds.indexOf(currentSec)<0){
    currentSec=mySecIds[0]||currentUser.sectorId||"prevenzione";
    selectedSectorId=currentSec;
  }
  var sSelect="";
  if(mySecIds.length>1){
    var sOpts=db.sectors.filter(function(s){return mySecIds.includes(s.id);}).map(function(s){return'<option value="'+s.id+'"'+(selectedSectorId===s.id?" selected":"")+'>'+htmlEscape(s.name)+'</option>';}).join("");
    sSelect='<label style="margin:0">Settore</label><select style="width:auto;min-width:130px;margin:0" onchange="selectedSectorId=this.value;selectedAreaFilter=\'all\';selectedPlanArea=\'all\';calendarView=\'settore\';render()">'+sOpts+'</select>';
  }
  var areas=areasOfSector(selectedSectorId);
  if(selectedAreaFilter!=="all" && !areas.some(function(a){return a.id===selectedAreaFilter;})) selectedAreaFilter="all";
  var aOpts='<option value="all"'+(selectedAreaFilter==="all"?" selected":"")+'>Tutto il settore</option>'+areas.map(function(a){return'<option value="'+a.id+'"'+(selectedAreaFilter===a.id?" selected":"")+'>'+htmlEscape(a.name)+'</option>';}).join("");
  return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+sSelect+'<label style="margin:0">Area</label><select style="width:auto;min-width:150px;margin:0" onchange="selectedAreaFilter=this.value;selectedPlanArea=this.value;calendarView=\'settore\';render()">'+aOpts+'</select></div>';
}

function calendarInlineControls(){
  // Mobile: la page-header è nascosta, quindi per il dirigente mostriamo
  // gli stessi filtri Settore/Area del Piano ferie direttamente nel calendario.
  if(!currentUser || currentUser.role!=="viewer") return "";
  return '<div class="calendar-inline-controls no-print">'+viewerCalendarControls()+'</div>';
}

function bellBtn(){
  if(!currentUser||currentUser.role!=="admin")return"";
  var n=unreadCount();
  return '<button class="bell-btn" onclick="nav(\'notifications\')" title="Notifiche admin">'+ico("bell")+(n?'<span class="bell-badge">'+n+'</span>':'')+' </button>';
}

function layout(content){
  if(!currentUser)return renderLogin();
  applyTheme();
  document.body.classList.remove("page-calendar","page-plan","page-profile","page-people","page-registercolleague","page-reports","page-admin","page-notifications");
  document.body.classList.add("page-"+page);

  /* Desktop sidebar */
  var navItems=[
    {id:"calendar",label:"Calendario",icon:"calendar"},
    {id:"plan",label:"Piano ferie",icon:"beach"},
    {id:"profile",label:"Profilo",icon:"user"},
    ...(canManageUsers()?[{id:"people",label:"Dipendenti",icon:"users"}]:[]),
    ...(canRegisterColleagues()?[{id:"registercolleague",label:"Registra collega",icon:"plus"}]:[]),
    {id:"reports",label:"Riepilogo",icon:"chart"},
    ...(currentUser.role==="admin"?[{id:"notifications",label:"Notifiche",icon:"bell"}]:[]),
    ...(canManageUsers()?[{id:"admin",label:"Admin",icon:"settings"}]:[]),
  ];
  var navHtml=navItems.map(item=>{
    var badge=item.id==="admin"&&pendingAdminCount()>0?'<span class="nav-badge">'+pendingAdminCount()+'</span>':'';
    return '<button class="nav-btn'+(page===item.id?' active':'')+'" onclick="nav(\''+item.id+'\')">'+ico(item.icon)+'<span>'+item.label+'</span>'+badge+'</button>';
  }).join("");

  var sidebar='<div class="sidebar no-print">'+
    '<div class="sidebar-brand">'+
    '<div class="sidebar-brand-icon">'+ico("calendar","ico-sm")+'</div>'+
    '<span class="sidebar-brand-name">Gestione Personale</span>'+
    '</div>'+
    '<nav class="sidebar-nav">'+navHtml+'</nav>'+
    '<div class="sidebar-user">'+
    '<div class="sidebar-user-name">'+fullName(currentUser)+'</div>'+
    '<div class="sidebar-user-role">'+userContextLabel(currentUser)+'</div>'+
    (adminUser?'<button class="btn btn-secondary btn-sm btn-full" style="margin-bottom:6px" onclick="stopImpersonation()">Torna super admin</button>':'')+
    '<button class="btn btn-danger btn-sm btn-full" onclick="logout()">Esci</button>'+
    '</div></div>';

  /* Mobile topbar */
  var topbar='<div class="topbar no-print">'+
    '<div class="topbar-left"><button class="topbar-avatar" style="background:'+currentUser.color+'" onclick="nav(\'profile\')">'+currentUser.initials+'</button></div>'+
    '<span class="topbar-title">'+pageTitleLabel()+'</span>'+
    '<div class="topbar-right">'+bellBtn()+'<span class="gp-push-anchor" data-gp-push-anchor="mobile"></span></div>'+
  '</div>';

  /* Mobile bottom nav */
  var bottomNav='<nav class="bottom-nav no-print">'+
    '<button class="bottom-nav-btn'+(page==="plan"?" active":"")+'" onclick="nav(\'plan\')">'+ico("beach")+'<span>Ferie</span></button>'+
    '<div class="bottom-nav-center"><button class="bottom-nav-center-btn'+(page==="calendar"?" active":"")+'" onclick="nav(\'calendar\')">'+ico("calendar","ico-lg")+'</button></div>'+
    '<button class="bottom-nav-btn'+(page==="reports"?" active":"")+'" onclick="nav(\'reports\')">'+ico("chart")+'<span>Riepilogo</span></button>'+
  '</nav>';

  var impBar=adminUser?'<div class="impersonation-bar no-print">Visualizzando come <strong>'+fullName(currentUser)+'</strong> <button class="btn btn-secondary btn-sm" onclick="stopImpersonation()">Torna admin</button></div>':"";

  var globalBell=(currentUser.role==="admin")?
    '<div class="global-bell no-print"><button class="global-bell-btn" onclick="nav(\'notifications\')" title="Notifiche interne">'+ico("bell")+(unreadCount()?'<span class="global-bell-badge">'+unreadCount()+'</span>':'')+' </button><span class="gp-push-anchor" data-gp-push-anchor="desktop"></span></div>':"";

  app.innerHTML=topbar+
    '<div class="app-shell">'+sidebar+
    '<div class="main-content">'+impBar+globalBell+content+'</div>'+
    '</div>'+bottomNav;
  if(window.gpPushRefresh) window.gpPushRefresh();
}


function renderStatusLegend(extraClass){
  extraClass=extraClass||"";

  // v202 — Legenda contestuale al settore selezionato, senza codice malattia.
  // Le voci Smart Working non mischiano più aree di settori diversi:
  // Settore 4 -> Prevenzione/Veterinaria; Settore 7 -> Territorio/Convenzionata.
  var sectorId=selectedSectorId||currentUser?.sectorId||"prevenzione";
  var swAreas=areasOfSector(sectorId);
  if(!swAreas.length) swAreas=(db.areas||[]).filter(function(a){return isAreaVisible(a.id);});

  var items=swAreas.map(function(a){
    var cls=smartColorForArea(a.id)==="#16a34a"?"legend-dot-sw-green":"legend-dot-sw-blue";
    return {dot:'<span class="legend-dot '+cls+'">SW</span>', label:'Smart working — '+htmlEscape(a.name)};
  }).concat([
    {dot:'<span class="legend-dot legend-dot-c01">C01</span>', label:'Ferie anno attuale'},
    {dot:'<span class="legend-dot legend-dot-c02">C02</span>', label:'Ferie anno precedente'},
    {dot:'<span class="legend-dot legend-dot-f14">F14</span>', label:'Festività soppresse'},
    {dot:'<span class="legend-dot legend-dot-a14">A14</span>', label:'Missione'},
    {dot:'<span class="legend-dot legend-dot-altro">ALT</span>', label:'Altro'}
  ]);

  return '<div class="status-legend no-print '+extraClass+'">'+
    '<div class="status-legend-title">Legenda</div>'+ 
    '<div class="status-legend-items">'+items.map(function(it){return '<div class="status-legend-item">'+it.dot+'<span>'+it.label+'</span></div>';}).join('')+'</div>'+ 
  '</div>';
}

/* =========================================================
   CALENDARIO
   ========================================================= */
function visibleUsersForCalendar(){
  // Personale (solo io)
  if(calendarView==="personale"&&currentUser&&(currentUser.role==="employee"||currentUser.role==="sector_manager"))
    return [currentUser].filter(function(u){return u.approved&&isWorker(u);});

  // v202 — Dirigente: stessa logica del piano ferie.
  // Usa selectedSectorId + selectedAreaFilter, cioè i due menu a tendina.
  // Niente chip area per il dirigente, così calendario e piano ferie restano coerenti.
  if(currentUser.role==="viewer"){
    return visibleUsers(true).filter(function(u){return isWorker(u);});
  }

  // calendarView è un areaId (chip area specifica per dipendente/referente)
  if(calendarView!=="settore"&&calendarView!=="area"&&calendarView!=="personale"){
    return visibleUsers().filter(function(u){return u.areaId===calendarView;});
  }
  // Area chip legacy (admin)
  if(calendarView==="area"&&currentUser){
    var aid=currentUser.role==="admin"?selectedAreaFilter:currentUser.areaId;
    if(aid&&aid!=="all"&&aid!=="*")return visibleUsers().filter(function(u){return u.areaId===aid;});
  }
  return visibleUsers();
}
function changeMonth(delta){
  viewMonth+=delta;
  if(viewMonth<0){viewMonth=11;viewYear--;}
  if(viewMonth>11){viewMonth=0;viewYear++;}
  selectedDate=viewYear+"-"+String(viewMonth+1).padStart(2,"0")+"-01";
  modalOpen=false;loadEventsForMonth(monthKeyOf(selectedDate));render();
}
function openDay(date){
  selectedDate=date;
  if(!isBlockedDay(date)){modalOpen=true;insertOpen=false;insertUserId=null;insertCode=null;insertError="";}
  render();
}
function goToToday(){selectedDate=todayStr();viewYear=+selectedDate.slice(0,4);viewMonth=+selectedDate.slice(5,7)-1;loadEventsForMonth(monthKeyOf(selectedDate));render();}
function closeModal(){
  modalOpen=false;insertOpen=false;insertUserId=null;insertCode=null;insertError="";
  render();
}

function renderCalendar(){
  loadEventsForMonth(monthKeyOf(dateKey(1)));
  // Le settimane a cavallo del mese richiedono anche i mesi adiacenti.
  var firstWeek=weekDates(dateKey(1)),lastWeek=weekDates(dateKey(daysInMonth()));
  [firstWeek[0],lastWeek[4]].forEach(function(d){loadEventsForMonth(monthKeyOf(d));});
  var hmap=holidaysFor(viewYear);
  var blanks=(new Date(viewYear,viewMonth,1).getDay()+6)%7;
  var days="";
  for(var i=0;i<Math.min(blanks,5);i++)days+='<div class="day-cell day-blank"></div>';
  for(var d=1;d<=daysInMonth();d++){
    var date=dateKey(d);
    var dow=new Date(date+"T00:00:00").getDay();
    if(dow===0||dow===6)continue;
    var hol=hmap[date];
    var errs=smartRuleErrorsForDay(date);
    var calP=visibleUsersForCalendar();
    var abs=hol?[]:calP.filter(u=>isAbsent(eventFor(date,u.id)));
    var dots=abs.map(u=>{
      var st=eventFor(date,u.id),s=STATUS[st];
      var color=st==="smart"?smartColorForArea(u.areaId):s.color;
      var wh=color==="#ffffff"?" dot-white":"";
      return '<div class="dot'+wh+'" title="'+fullName(u)+'" style="background:'+(wh?'#fff':color)+'">'+s.short+'</div>';
    }).join("");
    var isMob=window.innerWidth<=760;
    var isToday=date===todayStr();
    var isSel=selectedDate===date;
    var selCls=isSel?(isMob?"day-selected-mob":"day-selected-desk"):"";
    days+='<button class="day-cell'+(hol?" day-holiday":"")+(errs.length?" day-rule-err":"")+(isToday?" day-today":"")+(selCls?" "+selCls:"")+ '" onclick="openDay(\''+date+'\')">'+
      '<div class="day-num">'+d+'</div>'+
      (errs.length?'<span class="day-err-symbol" title="Anomalia smart working" aria-label="Anomalia smart working">❗</span>':"")+
      (hol?'<div class="day-hol-name">'+hol+'</div>':"")+
      '<div class="dot-row">'+dots+'</div>'+
    '</button>';
  }
  var modal=insertOpen?renderInsertSheet():(modalOpen?renderDayModal():"");
  var chips="";
  if(currentUser.role!=="admin" && currentUser.role!=="viewer"){
    var isEmp=currentUser.role==="employee";
    var isSm=currentUser.role==="sector_manager";
    var isViewer=currentUser.role==="viewer";
    // Aree visibili per chip
    var chipAreas=[];
    if(isSm){
      var eas=currentUser.editableAreaIds||[];
      chipAreas=areasOfSector(selectedSectorId).filter(function(a){return eas.includes(a.id);});
    } else {
      // viewer, employee: tutte le aree del settore selezionato
      chipAreas=areasOfSector(selectedSectorId);
    }
    var areaChips=chipAreas.map(function(a){
      return '<button class="cal-chip'+(calendarView===a.id?" active":"")+'" onclick="calendarView=\''+a.id+'\';render()">'+htmlEscape(a.name)+'</button>';
    }).join("");
    chips='<div class="cal-chips">'+
      '<button class="cal-chip'+(calendarView==="settore"?" active":"")+'" onclick="calendarView=\'settore\';render()">Settore</button>'+
      areaChips+
      (!isViewer?'<button class="cal-chip'+(calendarView==="personale"?" active":"")+'" onclick="calendarView=\'personale\';render()">'+(isEmp?"Solo io":"Personale")+'</button>':"")+
    '</div>';
  }
  var selectorHtml=selectorControls();
  layout(
    '<div class="page-header no-print"><h1>'+contextTitle()+'</h1>'+selectorHtml+'</div>'+
    '<div class="cal-wrap">'+
    calendarInlineControls()+
    '<div class="cal-toolbar">'+
    '<div class="cal-month-nav">'+
    '<button class="cal-nav-btn month-nav prev" onclick="changeMonth(-1)">←</button>'+
    '<div class="cal-month-label">'+monthName()+'</div>'+
    '<button class="cal-nav-btn month-nav next" onclick="changeMonth(1)">→</button>'+
    '</div></div>'+
    chips+
    '<div class="cal-head"><div class="cal-head-cell">LUN</div><div class="cal-head-cell">MAR</div><div class="cal-head-cell">MER</div><div class="cal-head-cell">GIO</div><div class="cal-head-cell">VEN</div></div>'+
    '<div class="cal-grid">'+days+'</div>'+
    '</div>'+
    renderStatusLegend('calendar-legend')+
    renderDaySummary()+modal
  );
}
function contextTitle(){return "GESTIONALE — "+sectorName(selectedSectorId)+(selectedAreaFilter!=="all"?" / "+areaName(selectedAreaFilter):"");}

function renderPresenceSections(date, people, allowRemove){
  var sorted=(people||[]).slice().sort(sortByName);
  var present=sorted.filter(function(u){return eventFor(date,u.id)==="present";});
  var smart=sorted.filter(function(u){return eventFor(date,u.id)==="smart";});
  var otherAbsent=sorted.filter(function(u){var st=eventFor(date,u.id);return isAbsent(st)&&st!=="smart";});
  var absent=smart.concat(otherAbsent);
  function row(u,isAway){
    var st=eventFor(date,u.id);
    var meta=db.eventMeta&&db.eventMeta[date]&&db.eventMeta[date][u.id];
    var stamp=meta&&(meta.createdAt||meta.updatedAt);
    var when=stamp&&(typeof stamp.toDate==="function"?stamp.toDate():stamp.seconds?new Date(stamp.seconds*1000):new Date(stamp));
    var timeLabel=when&&!isNaN(when.getTime())?when.toLocaleString("it-IT",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}):"";
    var smartTime=st==="smart"&&timeLabel?'<span class="presence-sw-time" title="'+(meta.legacy?'Ultima modifica registrata (dato storico)':'Data e ora di inserimento SW')+'">'+(meta.legacy?'Registrato/modificato: ':'Inserito: ')+timeLabel+'</span>':"";
    var reason=isAway?'<span class="presence-reason">'+((STATUS[st]||{}).short||htmlEscape(st))+'</span>':"";
    var remove=allowRemove&&isAway&&canModifyUserEvents(u.id)?'<button class="presence-remove" onclick="removeEvent(\''+date+'\',\''+u.id+'\')">Rimuovi</button>':"";
    var awayClass=isAway?(st==="smart"?' absence-smart':st==="a14"?' absence-mission':' absence-other'):"";
    return '<div class="presence-row '+(isAway?'presence-absent':'presence-present')+awayClass+'">'+
      '<span class="presence-dot" aria-hidden="true"></span><div class="presence-person"><span class="presence-name">'+fullName(u)+'</span>'+reason+smartTime+'</div>'+remove+'</div>';
  }
  return '<div class="presence-columns"><div class="presence-section presence-column-present">'+
    '<div class="presence-heading presence-heading-present">Presenti <span>'+present.length+'</span></div>'+
    (present.length?present.map(function(u){return row(u,false);}).join(""):'<div class="presence-empty">Nessun presente</div>')+
    '</div><div class="presence-section presence-column-absent">'+
    '<div class="presence-heading presence-heading-absent">Assenti <span>'+absent.length+'</span></div>'+
    (absent.length?absent.map(function(u){return row(u,true);}).join(""):'<div class="presence-empty">Nessun assente</div>')+
    '</div></div>';
}

function renderDaySummary(){
  if(!selectedDate)return"";
  var people=isBlockedDay(selectedDate)?[]:visibleUsersForCalendar();
  var inner=isBlockedDay(selectedDate)?'<p style="color:var(--c-muted);font-size:13px;padding:8px 0">Giorno non lavorativo</p>':renderPresenceSections(selectedDate,people,false);
  return '<div class="day-summary"><div class="day-summary-header"><span class="day-summary-date">'+fmt(selectedDate)+'</span></div>'+inner+'</div>';
}

function renderDayModal(){
  var hol=isHoliday(selectedDate)||isWeekend(selectedDate);
  var errs=smartRuleErrorsForDay(selectedDate);
  var displayP=isBlockedDay(selectedDate)?[]:visibleUsersForCalendar();
  var allP=isBlockedDay(selectedDate)?[]:visibleUsers();
  var canAdd=!isBlockedDay(selectedDate)&&allP.some(u=>canModifyUserEvents(u.id));
  var body="";
  if(hol){body='<div class="warning">Giorno non lavorativo. Non puoi inserire nulla.</div>';}
  else{body=renderPresenceSections(selectedDate,displayP,true);}
  return '<div class="modal-backdrop" onclick="if(event.target.className===\'modal-backdrop\')closeModal()">'+
    '<div class="modal-sheet day-presence-sheet">'+
    '<div class="modal-handle no-print"></div>'+
    '<div class="modal-head">'+
    '<div><div style="font-size:17px;font-weight:800">'+fmt(selectedDate)+'</div><div style="font-size:12px;color:var(--c-muted)">'+(hol?"Non lavorativo":"Presenze")+'</div></div>'+
    '<button class="modal-close" onclick="closeModal()">−</button>'+
    '</div>'+
    '<div class="modal-body">'+
    (errs.length?'<div class="warning">'+ico("warning")+'  '+errs.map(htmlEscape).join('<br>')+'</div>':"")+
    body+
    '</div>'+
    (canAdd?'<div class="modal-footer"><button class="btn btn-primary btn-full" onclick="openInsertSheet()">'+ico("plus")+'  Inserisci assenza</button></div>':"")+
    '</div></div>';
}

function openInsertSheet(){
  var ed=visibleUsers().filter(u=>canModifyUserEvents(u.id));
  insertUserId=currentUser.role==="employee"?currentUser.id:(ed.length===1?ed[0].id:null);
  insertCode=null;insertError="";insertOpen=true;render();
}
function closeInsertSheet(){
  insertOpen=false;insertUserId=null;insertCode=null;insertError="";modalOpen=false;
  render();
}
function selectInsertUser(uid){insertUserId=uid;insertError="";render();}
function selectInsertCode(code){insertCode=code;insertError="";render();}

function renderInsertSheet(){
  var people=visibleUsers().filter(u=>canModifyUserEvents(u.id));
  var showPicker=currentUser.role!=="employee"&&people.length>1;
  var pickerHtml="";
  if(showPicker){
    pickerHtml='<div class="insert-section">Per chi</div><div class="insert-people">'+
      people.map(u=>'<button class="insert-person-btn'+(insertUserId===u.id?" sel":"")+'" onclick="selectInsertUser(\''+u.id+'\')">'+
        avatarEl(u,true)+'<span style="font-size:11px">'+htmlEscape(u.name)+'</span></button>').join("")+
    '</div>';
  }
  var codeHtml='<div class="insert-section">Tipo assenza</div><div class="insert-codes">'+
    INSERT_CODES.map(code=>{
      var s=STATUS[code];var sel=insertCode===code;
      var col=s.color==="#ffffff"?"#64748B":s.color;
      return '<button class="code-card'+(sel?" sel":"")+'" style="--c-code:'+col+'" onclick="selectInsertCode(\''+code+'\')">'+
        '<span class="code-badge">'+s.short+'</span>'+
        '<span class="code-label">'+s.label.replace(/^[A-Z0-9]+\s*-\s*/,"")+'</span></button>';
    }).join("")+
  '</div>';
  return '<div class="modal-backdrop insert-backdrop" onclick="if(event.target.classList.contains(\'insert-backdrop\'))closeInsertSheet()">'+
    '<div class="modal-sheet">'+
    '<div class="modal-handle no-print"></div>'+
    '<div class="modal-head">'+
    '<div><div style="font-size:17px;font-weight:800">Inserisci assenza</div><div style="font-size:12px;color:var(--c-muted)">'+fmt(selectedDate)+'</div></div>'+
    '<button class="modal-close" onclick="closeInsertSheet()">−</button>'+
    '</div>'+
    '<div class="modal-body">'+pickerHtml+codeHtml+
    (insertError?'<p class="error-msg">'+insertError+'</p>':"")+
    '<button class="btn btn-primary btn-full" style="margin-top:16px" onclick="saveInsertedEvent()">Salva</button>'+
    '</div></div></div>';
}

async function saveInsertedEvent(){
  if(!insertUserId){insertError="Seleziona la persona.";render();return;}
  if(!insertCode){insertError="Seleziona il tipo di assenza.";render();return;}
  var date=selectedDate,userId=insertUserId,st=insertCode;
  var u=db.users.find(x=>x.id===userId);
  if(st==="smart"){var v=validateSmartRule(date,userId);if(!v.ok){insertError=v.message;render();return;}}
  if(isBlockedDay(date)){insertError="Giorno non lavorativo.";render();return;}
  if(!canModifyUserEvents(userId)){insertError="Non puoi modificare questo utente.";render();return;}
  if(!db.events[date])db.events[date]={};
  db.events[date][userId]=st;refreshRuleViolations(date);
  addAudit(STATUS[st].label+" per "+fullName(u)+" il "+fmt(date));
  try{await writeEvent(date,userId,st);closeInsertSheet();}catch(e){insertError="Salvataggio non riuscito. Controlla la connessione e i permessi.";render();}
}
async function removeEvent(date,userId){
  if(isBlockedDay(date)||!canModifyUserEvents(userId))return;
  var u=db.users.find(x=>x.id===userId);
  if(db.events[date])delete db.events[date][userId];
  refreshRuleViolations(date);
  addAudit("Rimossa assenza di "+fullName(u)+" il "+fmt(date));
  try{await deleteEvent(date,userId);modalOpen=false;render();}catch(e){alert("Rimozione non riuscita.");}
}

/* =========================================================
   PROFILO
   ========================================================= */
function renderProfile(){
  var u=currentUser;
  var mgmt="";
  if(canManageUsers())mgmt+='<button class="btn btn-secondary btn-full" style="margin-bottom:8px" onclick="nav(\'people\')">'+ico("users")+'  Dipendenti</button>';
  if(canRegisterColleagues())mgmt+='<button class="btn btn-secondary btn-full" style="margin-bottom:8px" onclick="nav(\'registercolleague\')">'+ico("plus")+'  Registra collega</button>';
  if(canManageUsers())mgmt+='<button class="btn btn-secondary btn-full" style="margin-bottom:8px" onclick="nav(\'admin\')">'+ico("settings")+'  Admin</button>';
  layout(
    '<div class="page-header"><h1>Profilo</h1></div>'+
    '<div class="grid-2">'+
    '<div class="card">'+
    '<div class="sec-title">I miei dati</div>'+
    ['Nome','Cognome','Email','Settore','Area','Ruolo'].map((l,i)=>{
      var vals=[u.name,u.surname||"",u.email,sectorName(u.sectorId),areaName(u.areaId),roleLabel(u.role)];
      return '<div class="profile-field"><label>'+l+'</label><div class="profile-value">'+vals[i]+'</div></div>';
    }).join("")+
    '</div>'+
    '<div>'+
    '<div class="card"><div class="sec-title">Richiesta cambio password</div>'+
    '<p style="font-size:13px;color:var(--c-muted)">Invia una richiesta al Super Admin. Non inserire qui la nuova password.</p>'+
    '<button class="btn btn-primary btn-full" onclick="requestPasswordChange()">Richiedi cambio password</button>'+
    '<p id="profileMsg" class="error-msg"></p></div>'+
    (mgmt?'<div class="card"><div class="sec-title">Gestione</div>'+mgmt+'</div>':"")+
    '<div class="card">'+
    (adminUser?'<button class="btn btn-secondary btn-full" style="margin-bottom:8px" onclick="stopImpersonation()">Torna super admin</button>':'')+
    '<button class="btn btn-danger btn-full" onclick="logout()">Esci</button></div>'+
    '</div></div>'
  );
}
async function requestPasswordChange(){
  var el=document.getElementById("profileMsg");
  if(!currentUser||!currentUser.approved){el.textContent="Utente non autorizzato.";return;}
  if(db.requests.some(function(r){return r.userId===currentUser.id&&r.type==="password"&&r.status==="pending";})){
    el.textContent="Hai già una richiesta in attesa.";return;
  }
  var r={id:uid("request"),type:"password",userId:currentUser.id,userName:fullName(currentUser),email:currentUser.email,status:"pending",createdAt:Date.now()};
  try{await writeRequest(r);el.textContent="Richiesta inviata al Super Admin.";}
  catch(e){el.textContent="Invio non riuscito. Controlla la connessione.";}
}
async function decidePasswordRequest(id,approve){
  if(!currentUser||currentUser.role!=="admin")return;
  var r=db.requests.find(function(x){return x.id===id&&x.type==="password";});
  if(!r||r.status!=="pending")return;
  if(!confirm(approve?"Approvare la richiesta? La password NON verrà modificata automaticamente.":"Rifiutare la richiesta?"))return;
  try{
    await cloudDb.collection("requests").doc(id).update({status:approve?"approved":"rejected",decidedAt:Date.now(),decidedBy:currentUser.id});
    if(approve)alert("Richiesta approvata. Per assegnare una password scelta dal Super Admin occorre configurare un servizio amministrativo Firebase sicuro. La password non è stata cambiata.");
  }catch(e){alert("Impossibile aggiornare la richiesta.");}
}
function renderPasswordRequests(){
  if(!currentUser||currentUser.role!=="admin")return"";
  var req=db.requests.filter(function(r){return r.type==="password";}).sort(function(a,b){return (b.createdAt||0)-(a.createdAt||0);});
  return '<div class="card"><div class="sec-title">Richieste cambio password</div>'+(
    req.length?req.map(function(r){
      var u=db.users.find(function(x){return x.id===r.userId;});
      var name=u?fullName(u):(r.userName||r.email||"Utente");
      var stato=r.status==="pending"?"In attesa":r.status==="approved"?"Approvata (password da impostare)":"Rifiutata";
      return '<div class="person-row"><div class="person-meta"><strong>'+htmlEscape(name)+'</strong><small>'+htmlEscape(stato)+'</small></div>'+
      (r.status==="pending"?'<div style="display:flex;gap:6px"><button class="btn btn-primary btn-sm" onclick="decidePasswordRequest(\''+r.id+'\',true)">Approva</button><button class="btn btn-secondary btn-sm" onclick="decidePasswordRequest(\''+r.id+'\',false)">Rifiuta</button></div>':'')+'</div>';
    }).join(""):'<p style="color:var(--c-muted);font-size:13px">Nessuna richiesta.</p>')+
    '<p style="font-size:12px;color:var(--c-muted)">L’approvazione non cambia la password Firebase. Per assegnarne una scelta dall’amministratore è necessario un backend privilegiato, non incluso in questa versione.</p></div>';
}

/* =========================================================
   REGISTRA COLLEGA
   ========================================================= */
function renderRegisterColleague(){
  layout('<div class="card"><p>Per creare un account, il collega deve usare il pulsante <strong>Registrati</strong> nella schermata di accesso.</p></div>');
}

/* =========================================================
   DIPENDENTI
   ========================================================= */
function usersForPeople(){
  if(currentUser.role!=="admin")return visibleUsers(true);
  return db.users.filter(u=>u.role!=="admin"&&isAreaVisible(u.areaId)&&(selectedSectorId==="all"||u.sectorId===selectedSectorId||(u.visibleSectorIds||[]).includes(selectedSectorId)||(u.editableAreaIds||[]).some(aid=>{var a=db.areas.find(x=>x.id===aid);return a&&a.sectorId===selectedSectorId;})));
}
function personRowClickable(u){
  var sel=selectedEmployeeId===u.id;
  return '<div class="person-row clickable'+(sel?' selected-row':'')+'" onclick="selectedEmployeeId=\''+u.id+'\';render()">'+
    avatarEl(u)+'<div class="person-meta"><strong>'+fullName(u)+'</strong><small>'+htmlEscape(u.email)+'</small></div>'+
    '<span class="tag '+(u.approved?"tag-approved":"tag-pending")+'">'+(u.approved?"Attivo":"In attesa")+'</span></div>';
}
function renderPeopleList(){
  if(currentUser.role!=="admin")return usersForPeople().sort(sortByName).map(personRowClickable).join("");
  var sId=selectedSectorId;
  var areas=areasOfSector(sId);
  var sectorUsers=db.users.filter(u=>u.role!=="admin"&&u.approved&&isAreaVisible(u.areaId));
  // Dirigenti: hanno sId nei visibleSectorIds
  var viewers=sectorUsers.filter(u=>u.role==="viewer"&&(u.visibleSectorIds||[]).includes(sId)).sort(sortByName);
  // Referenti: hanno almeno un'area del settore sId in editableAreaIds
  var managers=sectorUsers.filter(u=>u.role==="sector_manager"&&(u.editableAreaIds||[]).some(aid=>{var a=db.areas.find(x=>x.id===aid);return a&&a.sectorId===sId;})).sort(sortByName);
  // Dipendenti per area
  var html="";
  // -- Dirigenti
  if(viewers.length){
    html+='<div class="people-section-title">Dirigenti</div>';
    html+=viewers.map(u=>{
      var ss=(u.visibleSectorIds||[]).map(sectorName).join(" e ")||sectorName(u.sectorId);
      return '<div class="person-row clickable'+(selectedEmployeeId===u.id?' selected-row':'')+'" onclick="selectedEmployeeId=\''+u.id+'\';render()">'+
        avatarEl(u)+'<div class="person-meta"><strong>'+fullName(u)+'</strong><small>'+ss+'</small></div>'+
        '<span class="tag tag-approved">Attivo</span></div>';
    }).join("");
  }
  // -- Referenti
  if(managers.length){
    html+='<div class="people-section-title">Referenti</div>';
    html+=managers.map(u=>{
      var eas=u.editableAreaIds||[];
      var sectorAreas=areas.map(a=>a.id);
      var managedHere=eas.filter(aid=>sectorAreas.includes(aid));
      var label=managedHere.length===sectorAreas.length&&sectorAreas.length>0?"Referente "+sectorName(sId):"Referente "+managedHere.map(areaName).join(" e ");
      return '<div class="person-row clickable'+(selectedEmployeeId===u.id?' selected-row':'')+'" onclick="selectedEmployeeId=\''+u.id+'\';render()">'+
        avatarEl(u)+'<div class="person-meta"><strong>'+fullName(u)+'</strong><small>'+label+'</small></div>'+
        '<span class="tag tag-approved">Attivo</span></div>';
    }).join("");
  }
  // -- Dipendenti per area
  areas.forEach(function(a){
    var emps=sectorUsers.filter(u=>u.role==="employee"&&u.areaId===a.id).sort(sortByName);
    if(!emps.length)return;
    html+='<div class="people-section-title">'+htmlEscape(a.name)+'</div>';
    html+=emps.map(personRowClickable).join("");
  });
  // Dipendenti senza area del settore
  var withoutArea=sectorUsers.filter(u=>u.role==="employee"&&u.sectorId===sId&&!areas.some(a=>a.id===u.areaId)).sort(sortByName);
  if(withoutArea.length){html+='<div class="people-section-title">Senza area</div>';html+=withoutArea.map(personRowClickable).join("");}
  return html||'<p style="color:var(--c-muted);font-size:13px">Nessun utente in questo settore.</p>';
}
function renderPeople(){
  var listHtml=renderPeopleList();
  var detail=selectedEmployeeId?renderEmployeeDetail(db.users.find(u=>u.id===selectedEmployeeId)):'<div class="card"><p style="color:var(--c-muted);font-size:13px">Seleziona un dipendente per modificarlo.</p></div>';
  layout(
    '<div class="page-header"><h1>Dipendenti</h1>'+selectorControls()+'</div>'+
    '<div class="grid-2"><div class="card"><div class="sec-title">Elenco</div>'+listHtml+'</div>'+detail+'</div>'
  );
}

function buildDetailPerms(u){
  // u=null means read current form values
  var role=document.getElementById("dr")?document.getElementById("dr").value:(u?u.role:"employee");
  var eas=u?u.editableAreaIds||[]:[];
  var vss=u?u.visibleSectorIds||[]:[];
  if(role==="employee"){
    return '<p style="color:var(--c-muted);font-size:13px;margin:4px 0">Dipendente: nessuna autorizzazione aggiuntiva.</p>';
  }
  if(role==="sector_manager"){
    return '<div class="form-row"><label>Aree gestibili (Referente)</label><div class="check-list">'+
      db.areas.map(a=>'<label class="check-row"><input type="checkbox" class="d_ea" value="'+a.id+'"'+(eas.includes(a.id)?" checked":"")+'>'+
      '<span style="font-size:11px;color:var(--c-muted)">'+sectorName(a.sectorId)+'</span> '+htmlEscape(a.name)+'</label>').join("")+'</div></div>';
  }
  if(role==="viewer"){
    return '<div class="form-row"><label>Settori visibili (Dirigente)</label><div class="check-list">'+
      db.sectors.map(s=>'<label class="check-row"><input type="checkbox" class="d_vs" value="'+s.id+'"'+(vss.includes(s.id)?" checked":"")+'>'+htmlEscape(s.name)+'</label>').join("")+'</div></div>';
  }
  return "";
}

function renderEmployeeDetail(u){
  if(!u)return"";
  var prot=!canEditProtectedData()?"disabled":"";
  if(!canEditEmployeeData(u.id))return'<div class="card"><p style="color:var(--c-muted);font-size:13px;margin-bottom:10px">Non puoi modificare questo utente.</p>'+personRowEl(u,selectedDate||todayStr(),false)+'</div>';
  var sOpts=db.sectors.map(s=>'<option value="'+s.id+'"'+(u.sectorId===s.id?" selected":"")+'>'+htmlEscape(s.name)+'</option>').join("");
  var aOpts=areasOfSector(u.sectorId).map(a=>'<option value="'+a.id+'"'+(u.areaId===a.id?" selected":"")+'>'+htmlEscape(a.name)+'</option>').join("");
  var extra="";
  if(canEditProtectedData()){
    extra='<div id="detail-perms">'+buildDetailPerms(u)+'</div>'+
      '<script>document.getElementById("dr").addEventListener("change",function(){document.getElementById("detail-perms").innerHTML=buildDetailPerms(null);});<\/script>';
  }
  return '<div class="card"><div class="sec-title">Scheda utente</div>'+
    '<div class="form-grid-2">'+
    '<div class="form-row"><label>Nome</label><input id="dn" value="'+htmlEscape(u.name)+'"></div>'+
    '<div class="form-row"><label>Cognome</label><input id="ds" value="'+(u.surname||"")+'"></div>'+
    '<div class="form-row"><label>Email</label><input id="de" value="'+htmlEscape(u.email)+'" disabled></div>'+ 
    '<div class="form-row"><label>Settore</label><select id="dd" onchange="refreshDetailAreas()" '+prot+'>'+sOpts+'</select></div>'+
    '<div class="form-row"><label>Area</label><select id="da" '+prot+'>'+aOpts+'</select></div>'+
    '<div class="form-row"><label>Ruolo</label><select id="dr" '+prot+'>'+
      '<option value="employee"'+(u.role==="employee"?" selected":"")+'>Dipendente</option>'+
      '<option value="viewer"'+(u.role==="viewer"?" selected":"")+'>Dirigente</option>'+
      '<option value="sector_manager"'+(u.role==="sector_manager"?" selected":"")+'>Referente</option>'+
    '</select></div>'+
    '<div class="form-row"><label>Stato</label><select id="dap" '+prot+'>'+
      '<option value="true"'+(u.approved?" selected":"")+'>Abilitato</option>'+
      '<option value="false"'+(!u.approved?" selected":"")+'>Non abilitato</option>'+
    '</select></div>'+
    '<div class="form-row"><label>C01</label><input id="dc1" type="number" value="'+(u.c01||0)+'" '+prot+'></div>'+
    '<div class="form-row"><label>C02</label><input id="dc2" type="number" value="'+(u.c02||0)+'" '+prot+'></div>'+
    '<div class="form-row"><label>F14</label><input id="df14" type="number" value="'+(u.f14||0)+'" '+prot+'></div>'+
    (canEditProtectedData()&&isWorker(u)?'<div class="form-row"><label>Smart working consentito (giorni a settimana)</label><select id="dswlimit">'+[1,2,3,4,5].map(function(n){return '<option value="'+n+'"'+(smartWeeklyLimit(u)===n?' selected':'')+'>'+n+' giorn'+(n===1?'o':'i')+'</option>';}).join('')+'</select><small>Solo il Super Admin può modificare questo limite. Predefinito: 1 giorno.</small></div>':'')+
    '</div>'+extra+
    '<div style="display:flex;gap:8px;margin-top:8px">'+
    '<button class="btn btn-primary" onclick="saveEmployeeDetail(\''+u.id+'\')">Salva</button>'+
    (canEditProtectedData()?'<button class="btn btn-danger" onclick="deleteUser(\''+u.id+'\')">Elimina</button>':"")+
    '</div></div>';
}
function refreshDetailAreas(){
  var sec=document.getElementById("dd").value;
  var u=db.users.find(x=>x.id===selectedEmployeeId);
  document.getElementById("da").innerHTML=areasOfSector(sec).map(a=>'<option value="'+a.id+'"'+(u&&u.areaId===a.id?" selected":"")+'>'+htmlEscape(a.name)+'</option>').join("");
}
async function saveEmployeeDetail(id){
  var u=db.users.find(x=>x.id===id);if(!u||!canEditEmployeeData(id))return;
  u.name=document.getElementById("dn").value;u.surname=document.getElementById("ds").value;
  u.initials=createInitialsForUser(u.name,u.surname);
  if(canEditProtectedData()){
    u.sectorId=document.getElementById("dd").value;u.areaId=document.getElementById("da").value;
    u.role=document.getElementById("dr").value;u.approved=document.getElementById("dap").value==="true";
    u.c01=+document.getElementById("dc1").value||0;u.c02=+document.getElementById("dc2").value||0;u.f14=+document.getElementById("df14").value||0;
    var swSelect=document.getElementById("dswlimit");if(swSelect)u.swDaysPerWeek=Number(swSelect.value);
    u.editableAreaIds=[...document.querySelectorAll(".d_ea:checked")].map(x=>x.value);
    u.visibleSectorIds=[...document.querySelectorAll(".d_vs:checked")].map(x=>x.value);
    if(u.role==="employee"){u.visibleSectorIds=[u.sectorId];u.editableAreaIds=[];}
    if(u.role==="sector_manager"&&!u.editableAreaIds.length)u.editableAreaIds=[u.areaId];
    if(u.role==="viewer"&&!u.visibleSectorIds.length)u.visibleSectorIds=[u.sectorId];
    if(u.role==="viewer")u.color="#DC2626";else if(u.role==="sector_manager")u.color="#F59E0B";else u.color=userColorByArea(u.areaId);
  }
  addAudit("Aggiornata scheda di "+fullName(u));try{await writeUser(u);}catch(e){alert("Errore salvataggio.");return;}alert("Modifiche salvate.");render();
}
async function deleteUser(id){
  if(!confirm("Rimuovere il profilo e tutti i suoi eventi? L’account Authentication dovrà essere eliminato separatamente dalla Console Firebase."))return;
  var u=db.users.find(x=>x.id===id);db.users=db.users.filter(x=>x.id!==id);
  addAudit("Eliminato profilo di "+fullName(u));try{await deleteAllUserEvents(id);await deleteUserRemote(id);alert("Profilo eliminato. Elimina anche l’account in Firebase Authentication → Users.");}catch(e){alert("Eliminazione incompleta: "+e.message);}selectedEmployeeId=null;render();
}

/* =========================================================
   RIEPILOGO
   ========================================================= */
function userReport(u){
  var r={c01:0,c02:0,f14:0,smart:0,altro:0};
  var reportYear=String(new Date().getFullYear())+"-";
  Object.keys(db.events).forEach(d=>{if(d.indexOf(reportYear)===0&&!isBlockedDay(d)){var st=normalizeEventCode(db.events[d][u.id]);if(r[st]!==undefined)r[st]++;}});
  r.c01T=+u.c01||0;r.c02T=+u.c02||0;r.f14T=+u.f14||0;
  r.c01R=r.c01T-r.c01;r.c02R=r.c02T-r.c02;r.f14R=r.f14T-r.f14;
  r.used=r.c01+r.c02+r.f14;r.residual=r.c01R+r.c02R+r.f14R;r.total=r.c01T+r.c02T+r.f14T;
  return r;
}
function renderReports(){
  var people=currentUser.role==="employee"?[currentUser]:visibleUsers();
  var cards=people.map(u=>{
    var r=userReport(u);var pct=r.total?Math.min(100,Math.round(r.used/r.total*100)):0;
    return '<div class="report-card">'+
      '<div class="person-row" style="border:none;padding:0 0 10px">'+avatarEl(u)+'<div class="person-meta"><strong>'+fullName(u)+'</strong><small>'+personSectorAreaLabel(u)+'</small></div></div>'+
      '<div class="report-bar"><div class="report-bar-fill" style="width:'+pct+'%"></div></div>'+
      '<div class="report-stats">'+
      '<div class="report-stat"><strong>'+r.c01R+'</strong><span>C01 residue</span></div>'+
      '<div class="report-stat"><strong>'+r.c02R+'</strong><span>C02 residue</span></div>'+
      '<div class="report-stat"><strong>'+r.f14R+'</strong><span>F14 residue</span></div>'+
      '<div class="report-stat"><strong>'+r.smart+'</strong><span>Smart working</span></div>'+
      '<div class="report-stat"><strong>'+r.altro+'</strong><span>Altro</span></div>'+
      '</div></div>';
  }).join("");
  layout('<div class="page-header"><h1>Riepilogo</h1>'+selectorControls()+'</div>'+renderStatusLegend('report-legend')+'<div class="report-grid">'+cards+'</div>');
}

/* =========================================================
   NOTIFICHE
   ========================================================= */
function renderNotifications(){
  if(!currentUser || currentUser.role!=="admin"){ page="calendar"; return renderCalendar(); }
  markNotificationsRead();
  var notes=visibleNotifications();
  var list=notes.length?notes.map(n=>'<div class="notif-item"><strong>'+htmlEscape(n.text)+'</strong><time>'+htmlEscape(n.displayAt)+'</time></div>').join(""):'<p style="color:var(--c-muted);font-size:13px">Nessuna notifica.</p>';
  layout('<div class="page-header"><h1>Notifiche</h1><span class="pill">'+notes.length+'</span></div><div class="card">'+list+'</div>');
}

/* =========================================================
   ADMIN
   ========================================================= */

async function clearAllNotifications(){
  if(!confirm("Eliminare tutte le notifiche? L'operazione non è reversibile.")) return;
  var ids=db.notifications.map(n=>n.id);
  db.notifications=[];
  persistLocal();
  if(cloudEnabled&&cloudDb){
    for(var i=0;i<ids.length;i++){
      try{ await cloudDb.collection("notifications").doc(ids[i]).delete(); }catch(e){}
    }
  }
  addAudit("Azzerate "+ids.length+" notifiche");
  alert("Notifiche eliminate: "+ids.length+".");
  render();
}
function renderAdmin(){
  var pending=pendingRegistrations();
  var newUsers=pending.map(u=>'<div class="person-row">'+avatarEl(u)+'<div class="person-meta"><strong>'+fullName(u)+'</strong><small>'+htmlEscape(u.email)+' · '+personSectorAreaLabel(u)+'</small></div>'+
    '<div style="display:flex;gap:6px">'+
    '<button class="btn btn-primary btn-sm" onclick="approveRegistration(\''+u.id+'\')">Approva</button>'+
    '<button class="btn btn-secondary btn-sm" onclick="page=\'people\';selectedEmployeeId=\''+u.id+'\';render()">Modifica</button>'+
    '<button class="btn btn-danger btn-sm" onclick="deleteUser(\''+u.id+'\')">Elimina</button>'+
    '</div></div>').join("");
  var adminNotes=visibleNotifications().slice(0,10).map(n=>'<div class="notif-item"><strong>'+htmlEscape(n.text)+'</strong><time>'+htmlEscape(n.displayAt)+'</time></div>').join("");
  var audit=db.audit.slice(0,15).map(a=>'<div class="person-row"><div class="person-meta"><strong>'+htmlEscape(a.text)+'</strong><small>'+htmlEscape(a.at)+' · '+htmlEscape(a.by)+'</small></div></div>').join()||'<p style="color:var(--c-muted);font-size:13px">Nessuna modifica.</p>';
  layout(
    '<div class="page-header"><h1>Admin</h1><span class="pill">'+pendingAdminCount()+'</span></div>'+
    '<div class="grid-2">'+
    '<div class="card"><div class="sec-title">Registrazioni in attesa</div>'+(newUsers||'<p style="color:var(--c-muted);font-size:13px">Nessuna.</p>')+'</div>'+
    '<div class="card"><div class="sec-title">Notifiche</div>'+(adminNotes||'<p style="color:var(--c-muted);font-size:13px">Nessuna notifica.</p>')+'</div>'+ 
    '</div>'+
    renderPasswordRequests()+renderSwitchUserPanel()+renderSectorAdminPanel()+
    '<div class="card"><div class="sec-title">Backup</div><button class="btn btn-secondary" onclick="exportData()">'+ico("chart")+'  Esporta JSON</button></div>'+
    '<div class="card"><div class="sec-title">Manutenzione</div>'+
    '<p style="font-size:13px;color:var(--c-muted);margin-bottom:10px">Le notifiche si accumulano nel tempo. Azzerandole liberi spazio su Firestore senza perdere dati importanti.</p>'+
    '<button class="btn btn-danger" onclick="clearAllNotifications()">🗑️  Azzera tutte le notifiche</button>'+
    '</div>'+
    '<div class="card"><div class="sec-title">Storico</div>'+audit+'</div>'
  );
}
function renderSwitchUserPanel(){
  if(currentUser.role!=="admin"&&!adminUser)return"";
  var list=db.users.filter(u=>u.approved&&u.role!=="admin").map(u=>'<button class="switch-btn" onclick="startImpersonation(\''+u.id+'\')"><strong>'+fullName(u)+'</strong><small>'+roleLabel(u.role)+' · '+personSectorAreaLabel(u)+'</small></button>').join("");
  var banner=adminUser?'<div class="warning">Stai visualizzando come '+fullName(currentUser)+'. <button class="btn btn-secondary btn-sm" onclick="stopImpersonation()">Torna super admin</button></div>':"";
  return'<div class="card"><div class="sec-title">Cambio utente</div>'+banner+'<div class="switch-grid">'+list+'</div></div>';
}
function slugifyId(t){return(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||uid("s");}
function renderSectorAdminPanel(){
  if(currentUser.role!=="admin")return"";
  var sectors=db.sectors.map(function(sec){
    var areaRows=db.areas.filter(function(a){return a.sectorId===sec.id;}).map(function(a){
      var hidden=a.hidden===true;
      return '<div class="person-row" style="align-items:center;gap:10px"><div class="person-meta"><strong>'+htmlEscape(a.name)+'</strong><small>'+(hidden?'Nascosta ai colleghi':'Visibile ai colleghi')+'</small></div>'+
        '<button class="btn '+(hidden?'btn-primary':'btn-secondary')+' btn-sm" onclick="toggleAreaVisibility(\''+a.id+'\')">'+(hidden?'Riattiva':'Nascondi')+'</button></div>';
    }).join('');
    return '<div class="card"><div class="sec-title">'+htmlEscape(sec.name)+'</div>'+areaRows+
      '<div style="display:flex;gap:6px;margin-top:10px"><input id="ar_'+sec.id+'" placeholder="Nuova area" style="width:160px;margin:0"><button class="btn btn-secondary btn-sm" onclick="addAreaToSector(\''+sec.id+'\')">Aggiungi</button></div></div>';
  }).join('');
  return '<div class="card"><div class="sec-title">Visibilità aree — solo Super Gestore</div><p style="font-size:13px;color:var(--c-muted)">Le aree nascoste scompaiono da calendari, riepiloghi e filtri degli altri utenti. I dati non vengono cancellati.</p></div>'+
    sectors+'<div class="card"><div class="sec-title">Nuovo settore</div><div class="form-grid-2"><div class="form-row"><label>Nome settore</label><input id="nSec"></div><div class="form-row"><label>Prima area</label><input id="nSecA"></div></div><button class="btn btn-primary btn-sm" onclick="addSector()">Crea settore</button></div>';
}
async function toggleAreaVisibility(areaId){
  if(!currentUser||currentUser.role!=="admin"||adminUser){alert('Operazione riservata al Super Gestore.');return;}
  var a=db.areas.find(function(x){return x.id===areaId;});if(!a)return;
  var nextHidden=a.hidden!==true;
  if(!confirm((nextHidden?'Nascondere':'Riattivare')+' l’area '+a.name+'? Nessun dato verrà cancellato.'))return;
  if(!cloudEnabled||!cloudDb){alert('Connessione Firebase non disponibile.');return;}
  var previous=a.hidden;
  a.hidden=nextHidden;
  try{await writeArea(a);addAudit((nextHidden?'Nascosta':'Riattivata')+' area '+a.name);render();}
  catch(e){a.hidden=previous;render();alert('Salvataggio non riuscito: '+(e.message||e));}
}

async function addSector(){var nm=document.getElementById("nSec").value.trim(),an=document.getElementById("nSecA").value.trim();if(!nm){alert("Inserisci il nome.");return;}var id=slugifyId(nm),b=id,n=2;while(db.sectors.some(s=>s.id===id))id=b+"-"+(n++);var s={id,name:nm,hasAreas:!!an};db.sectors.push(s);try{await writeSector(s);}catch(e){}if(an){var a={id:slugifyId(id+"-"+an),sectorId:id,name:an,color:"#64748B"};db.areas.push(a);try{await writeArea(a);}catch(e){}}addAudit("Creato settore "+nm);render();}
async function addAreaToSector(sId){var inp=document.getElementById("ar_"+sId),nm=inp.value.trim();if(!nm){alert("Inserisci il nome.");return;}var id=slugifyId(sId+"-"+nm),b=id,n=2;while(db.areas.some(a=>a.id===id))id=b+"-"+(n++);var a={id,sectorId:sId,name:nm,color:"#64748B"};db.areas.push(a);var s=db.sectors.find(x=>x.id===sId);if(s&&!s.hasAreas){s.hasAreas=true;try{await writeSector(s);}catch(e){}}try{await writeArea(a);}catch(e){}addAudit("Creata area "+nm);render();}
async function approveRegistration(uId){var u=db.users.find(x=>x.id===uId);if(!u)return;u.approved=true;if(!u.visibleSectorIds?.length)u.visibleSectorIds=[u.sectorId];if(!u.editableAreaIds)u.editableAreaIds=[];var now=Date.now();db.lastRead[u.id]=now;db.lastRead[u.id+'_joined']=now;queueMetaWrite();addAudit("Approvata registrazione di "+fullName(u));try{await writeUser(u);}catch(e){}render();}
function exportData(){var b=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href);}

/* =========================================================
   PIANO FERIE
   ========================================================= */
function openPlanDay(date,sId,aId){selectedPlanDate=date;selectedPlanSectorId=sId;selectedPlanAreaForModal=aId;planModalOpen=true;render();}
function closePlanDay(){planModalOpen=false;selectedPlanDate=null;render();}
function renderPlanDayModal(){
  if(!planModalOpen||!selectedPlanDate)return"";
  var sId=selectedPlanSectorId||selectedSectorId||currentUser.sectorId;
  var aId=selectedPlanAreaForModal||selectedPlanArea||"all";
  var people=planPeople(sId,aId).sort(sortByName);
  var hols=people.filter(u=>isFerieCode(eventFor(selectedPlanDate,u.id))).sort(sortByName);
  var pres=people.filter(u=>!isFerieCode(eventFor(selectedPlanDate,u.id))).sort(sortByName);
  var rowFn=u=>'<div class="person-row">'+avatarEl(u)+'<div class="person-meta"><strong>'+fullName(u)+'</strong><small>'+areaName(u.areaId)+'</small></div></div>';
  return'<div class="modal-backdrop plan-day-backdrop" onclick="if(event.target.classList.contains(\'plan-day-backdrop\'))closePlanDay()">'+
    '<div class="modal-sheet"><div class="modal-handle"></div>'+
    '<div class="modal-head"><div><div style="font-size:17px;font-weight:800">'+fmt(selectedPlanDate)+'</div><div style="font-size:12px;color:var(--c-muted)">'+(aId==="all"?sectorName(sId):areaName(aId))+'</div></div><button class="modal-close" onclick="closePlanDay()">−</button></div>'+
    '<div class="modal-body">'+
    (hols.length?hols.map(rowFn).join(""):'<div class="all-present">'+ico("users","ico-lg")+' Tutti in servizio</div>')+
    '</div></div></div>';
}
function planSectorSelect(){
  var mySecIds=[];
  if(currentUser.role==="admin") mySecIds=db.sectors.map(function(s){return s.id;});
  else if(currentUser.role==="viewer") mySecIds=currentUser.visibleSectorIds||[];
  else if(currentUser.role==="sector_manager"){
    var eas=currentUser.editableAreaIds||[];
    mySecIds=Array.from(new Set(eas.map(function(aid){var a=db.areas.find(function(x){return x.id===aid;});return a?a.sectorId:null;}).filter(Boolean)));
  }
  if(mySecIds.length<=1) return "";
  return'<select style="width:auto;min-width:140px;margin:0" onchange="selectedSectorId=this.value;selectedPlanArea=\'all\';render()">'+
    db.sectors.filter(function(s){return mySecIds.includes(s.id);}).map(function(s){return'<option value="'+s.id+'"'+(selectedSectorId===s.id?" selected":"")+'>'+htmlEscape(s.name)+'</option>';}).join("")+
  '</select>';
}
function pctColor(p){if(p<=0)return"transparent";if(p<=20)return"#86EFAC";if(p<=50)return"#FDE047";if(p<=80)return"#FB923C";return"#F87171";}
function monthLabel(m){var p=m.split("-").map(Number);return new Date(p[0],p[1]-1,1).toLocaleDateString("it-IT",{month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase());}
function workingDaysOfMonth(m){var p=m.split("-").map(Number),y=p[0],mo=p[1],days=new Date(y,mo,0).getDate(),out=[];for(var d=1;d<=days;d++){var date=y+"-"+String(mo).padStart(2,"0")+"-"+String(d).padStart(2,"0");if(!isBlockedDay(date))out.push({date,day:d});}return out;}
function planPeople(sId,aId){
  var eas=currentUser.role==="sector_manager"?(currentUser.editableAreaIds||[]):null;
  return db.users.filter(function(u){
    if(!u.approved||!isWorker(u)) return false;
    if(u.sectorId!==sId) return false;
    if(aId!=="all") return u.areaId===aId;
    if(eas) return eas.includes(u.areaId);
    return true;
  });
}

function renderPlan(){
  var periods=planPeriods();var months=periods[selectedPlanPeriod]||periods.estate;
  var sId=(currentUser.role==="admin"||currentUser.role==="viewer"||currentUser.role==="sector_manager")?selectedSectorId:currentUser.sectorId;
  if(!sId||sId==="all"||sId==="*")sId=db.sectors[0]?db.sectors[0].id:"prevenzione";
  var areas=areasOfSector(sId);if(!areas.length)areas=[{id:sId,sectorId:sId,name:sectorName(sId),color:"#64748B"}];
  if(!selectedPlanArea)selectedPlanArea="all";
  var visibleAreas=(currentUser.role==="sector_manager")?areas.filter(function(a){return(currentUser.editableAreaIds||[]).includes(a.id);}):areas;
  var aOpts='<option value="all"'+(selectedPlanArea==="all"?" selected":"")+'>Tutto il settore</option>'+visibleAreas.map(function(a){return'<option value="'+a.id+'"'+(selectedPlanArea===a.id?" selected":"")+'>'+htmlEscape(a.name)+'</option>';}).join("");
  var pTitle="PIANO FERIE — "+(sId==="prevenzione"&&selectedPlanArea==="all"?"SETTORE PREVENZIONE (PREV+VET)":"SETTORE "+sectorName(sId).toUpperCase());
  var content=months.map(m=>renderPlanMonth(m,sId,selectedPlanArea)).join("");
  var modal=planModalOpen?renderPlanDayModal():"";
  layout(
    '<div class="plan-shell">'+
    '<div class="plan-topbar no-print">'+
    '<h1>'+ico("beach","ico-lg")+'  Piano ferie</h1>'+
    '<div class="plan-controls">'+
    planSectorSelect()+
    '<select style="width:auto;min-width:150px;margin:0" onchange="selectedPlanArea=this.value;render()">'+aOpts+'</select>'+
    '<select style="width:auto;min-width:180px;margin:0" onchange="selectedPlanPeriod=this.value;loadEventsForPlanPeriod();render()">'+
    (function(){var p=planPeriods();var yE=p.estate[0].slice(0,4);var yN=p.natale[0].slice(0,4);var yP=p.pasqua[0].slice(0,4);return'<option value="estate"'+(selectedPlanPeriod==="estate"?" selected":"")+'>Estate '+yE+' (giu–set)</option>'+
    '<option value="natale"'+(selectedPlanPeriod==="natale"?" selected":"")+'>Natale '+yN+' (dic–gen)</option>'+
    '<option value="pasqua"'+(selectedPlanPeriod==="pasqua"?" selected":"")+'>Pasqua '+yP+' (apr)</option>';})()+ 
    '</select>'+
    '<button class="btn btn-secondary print-btn" onclick="window.print()">'+ico("chart")+'  PDF</button>'+
    '</div></div>'+
    '<div class="plan-stripe"></div>'+
    '<div class="print-title">'+pTitle+'</div>'+
    content+
    '<div class="plan-legend no-print">'+
    ['0%','1-20%','21-50%','51-80%','81-100%'].map((l,i)=>{var colors=["transparent","#86EFAC","#FDE047","#FB923C","#F87171"];return'<div class="plan-legend-item"><div class="plan-legend-dot" style="background:'+colors[i]+'"></div>'+l+'</div>';}).join("")+
    '<div class="plan-legend-item"><div class="plan-legend-dot" style="background:#2563EB"></div>Prevenzione</div>'+
    '<div class="plan-legend-item"><div class="plan-legend-dot" style="background:#DC2626"></div>Veterinaria</div>'+
    '</div>'+
    '</div>'+modal
  );
}
function renderPlanMonth(month,sId,aId){
  var areas=areasOfSector(sId);var isAll=aId==="all"&&areas.length>=2;
  var people=planPeople(sId,aId);var total=people.length||1;
  var days=workingDaysOfMonth(month).map(item=>{
    var date=item.date,day=item.day;
    var onHol=people.filter(u=>isFerieCode(eventFor(date,u.id))).sort(sortByName);
    var pct=Math.round(onHol.length/total*100);
    var fill=pct?'<div class="plan-bar-fill" style="width:'+pct+'%;background:'+pctColor(pct)+'"></div>':"";
    var names="";
    if(isAll){
      var lA=areas[0],rA=areas[1];
      var lP=onHol.filter(u=>u.areaId===lA.id);var rP=onHol.filter(u=>u.areaId===rA.id);
      names='<div class="plan-split">'+
        '<div>'+lP.map(u=>'<div class="plan-person" style="color:'+areaColor(u.areaId)+'">'+shortPersonName(u)+'</div>').join("")+'</div>'+
        '<div>'+rP.map(u=>'<div class="plan-person" style="color:'+areaColor(u.areaId)+'">'+shortPersonName(u)+'</div>').join("")+'</div>'+
      '</div>';
    }else{names='<div class="plan-names">'+onHol.map(u=>'<div class="plan-person" style="color:'+areaColor(u.areaId)+'">'+shortPersonName(u)+'</div>').join("")+'</div>';}
    return'<div role="button" tabindex="0" class="plan-card plan-clickable'+(isHoliday(date)?" is-holiday":"")+'" data-date="'+date+'" data-sector="'+sId+'" data-area="'+aId+'">'+
      '<div class="plan-bar-wrap">'+fill+'</div>'+
      '<div class="plan-day-n">'+day+'</div>'+names+
      (pct?'<div class="plan-pct">'+pct+'%</div>':"")+
    '</div>';
  }).join("");
  return'<div class="plan-month-block"><h2>'+monthLabel(month)+'</h2><div class="plan-grid">'+days+'</div></div>';
}

/* =========================================================
   RENDER / AVVIO
   ========================================================= */
function render(){
  if(!currentUser)return renderLogin();
  if(page==="calendar")return renderCalendar();
  if(page==="plan")return renderPlan();
  if(page==="profile")return renderProfile();
  if(page==="notifications")return renderNotifications();
  if(page==="people")return renderPeople();
  if(page==="registercolleague")return renderRegisterColleague();
  if(page==="reports")return renderReports();
  if(page==="admin")return renderAdmin();
}
function handlePlanClick(target){var c=target.closest?.(".plan-clickable");if(!c)return false;openPlanDay(c.dataset.date,c.dataset.sector,c.dataset.area);return true;}
document.addEventListener("click",e=>{if(handlePlanClick(e.target)){e.preventDefault();e.stopPropagation();}},true);
document.addEventListener("touchend",e=>{if(handlePlanClick(e.target)){e.preventDefault();e.stopPropagation();}},{capture:true,passive:false});
document.addEventListener("keydown",e=>{var c=e.target.closest?.(".plan-clickable");if(c&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openPlanDay(c.dataset.date,c.dataset.sector,c.dataset.area);}},true);

loadLocalCache();
initFirebaseSync();
initFirebaseAuth();
renderLogin();
