/* =========================================================
   Gestione Personale v100
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
function statusTag(st){
  var map={present:'tag-present',smart:'tag-smart',c01:'tag-ferie',c02:'tag-ferie',f14:'tag-permesso',a01:'tag-malattia',altro:'tag-altro',blocked:'tag-blocked'};
  var s=STATUS[st]||STATUS.present;
  return '<span class="tag '+(map[st]||'tag-altro')+'">'+s.label+'</span>';
}
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
function login(){
  var email=document.getElementById("lEmail").value.trim().toLowerCase();
  var pw=document.getElementById("lPw").value;
  var u=db.users.find(x=>x.email.toLowerCase()===email&&x.password===pw);
  var err=document.getElementById("lErr");
  if(!u){err.textContent="Email o password non valide.";return;}
  if(!u.approved){err.textContent="Utenza in attesa di approvazione.";return;}
  currentUser=u; saveSession();
  selectedSectorId=u.role==="admin"?"prevenzione":u.sectorId;
  selectedAreaFilter="all"; selectedPlanArea="all"; page="calendar"; render();
}
function logout(){currentUser=null;adminUser=null;clearSession();renderLogin();}

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
  var sOpts=db.sectors.map(s=>'<option value="'+s.id+'">'+s.name+'</option>').join("");
  app.innerHTML=
    '<div class="login-wrap"><div class="login-box"><div class="login-card">'+
    '<div class="login-title">Registrazione</div>'+
    '<div class="form-grid-2"><div class="form-row"><label>Nome</label><input id="rName"></div><div class="form-row"><label>Cognome</label><input id="rSurname"></div></div>'+
    '<div class="form-row"><label>Email</label><input id="rEmail" type="email"></div>'+
    '<div class="form-row"><label>Password</label><input id="rPw" type="password" autocomplete="new-password"></div>'+
    '<div class="form-grid-2"><div class="form-row"><label>Settore</label><select id="rSector" onchange="refreshRegAreas()">'+sOpts+'</select></div>'+
    '<div class="form-row" id="rAreaWrap"><label>Area</label><select id="rArea"></select></div></div>'+
    '<div class="form-grid-3">'+
    '<div class="form-row"><label>C01</label><input id="rC01" type="number" value="0"></div>'+
    '<div class="form-row"><label>C02</label><input id="rC02" type="number" value="0"></div>'+
    '<div class="form-row"><label>F14</label><input id="rF14" type="number" value="0"></div></div>'+
    '<button class="btn btn-primary btn-full" onclick="registerUser()">Invia registrazione</button>'+
    '<button class="btn btn-secondary btn-full" style="margin-top:8px" onclick="page=null;renderLogin()">Torna al login</button>'+
    '<p id="rErr" class="error-msg"></p>'+
    '</div></div></div>';
  refreshRegAreas();
}
function refreshRegAreas(){
  var sec=document.getElementById("rSector").value;
  var wrap=document.getElementById("rAreaWrap");
  var sel=document.getElementById("rArea");
  var s=sectorById(sec);
  if(s&&s.hasAreas){wrap.style.display="";sel.innerHTML=areasOfSector(sec).map(a=>'<option value="'+a.id+'">'+a.name+'</option>').join("");}
  else{wrap.style.display="none";var a=areasOfSector(sec)[0];sel.innerHTML=a?'<option value="'+a.id+'">'+a.name+'</option>':"";}
}
async function registerUser(){
  var name=document.getElementById("rName").value.trim();
  var surname=document.getElementById("rSurname").value.trim();
  var email=document.getElementById("rEmail").value.trim().toLowerCase();
  var pw=document.getElementById("rPw").value;
  var sectorId=document.getElementById("rSector").value;
  var areaId=document.getElementById("rArea").value;
  var c01=Number(document.getElementById("rC01").value||0);
  var c02=Number(document.getElementById("rC02").value||0);
  var f14=Number(document.getElementById("rF14").value||0);
  if(!name||!surname||!email||!pw||!areaId){document.getElementById("rErr").textContent="Compila tutti i campi.";return;}
  var ex=db.users.find(u=>(u.email||"").toLowerCase()===email);
  if(ex){if(!ex.approved){page=null;renderLogin("Registrazione già inviata, in attesa di approvazione.");return;}document.getElementById("rErr").textContent="Email già registrata.";return;}
  var nu={id:uid("user"),email,password:pw,name,surname,role:"employee",sectorId,areaId,visibleSectorIds:[sectorId],editableAreaIds:[],c01,c02,f14,approved:false,initials:createInitialsForUser(name,surname),color:userColorByArea(areaId)};
  var btn=document.querySelector("[onclick='registerUser()']");
  if(btn){btn.disabled=true;btn.textContent="Invio...";}
  try{
    await writeUser(nu);addIfAbsent(db.users,nu);
    pushNotification({text:"Nuova utenza da abilitare: "+name+" "+surname,scope:"admin",type:"registration",actorId:"system",sectorId,areaId});
    addAudit("Nuova registrazione: "+name+" "+surname);
    page=null;renderLogin("Registrazione inviata. In attesa di approvazione.");
  }catch(e){var el=document.getElementById("rErr");if(el)el.textContent="Errore di connessione, riprova.";if(btn){btn.disabled=false;btn.textContent="Invia registrazione";}}
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
  var u=db.users.find(x=>x.email.toLowerCase()===email);
  var msg=document.getElementById("fMsg");
  if(!u){msg.textContent="Utente non trovato.";return;}
  var req={id:uid("req"),type:"forgot_password",userId:u.id,newPassword:"",status:"pending",at:new Date().toLocaleString("it-IT"),createdAt:Date.now()};
  try{await writeRequest(req);addIfAbsent(db.requests,req,true);pushNotification({text:"Reset password richiesto da "+fullName(u),scope:"admin",actorId:"system",type:"password",sectorId:u.sectorId,areaId:u.areaId});msg.textContent="Richiesta inviata.";}
  catch(e){msg.textContent="Errore di connessione, riprova.";}
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
  render();
}
function loadEventsForPlanPeriod(){planPeriods()[selectedPlanPeriod]&&planPeriods()[selectedPlanPeriod].forEach(loadEventsForMonth);}
function goBack(){if(modalOpen){modalOpen=false;render();return;}if(planModalOpen){closePlanDay();return;}page=navStack.pop()||"calendar";render();}
function startImpersonation(userId){
  if(!adminUser)adminUser=currentUser;
  var u=db.users.find(x=>x.id===userId);if(!u||u.role==="admin")return;
  currentUser=u;selectedSectorId=u.sectorId;selectedAreaFilter="all";selectedPlanArea="all";page="calendar";render();
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
    var sOpts=db.sectors.map(s=>'<option value="'+s.id+'"'+(selectedSectorId===s.id?" selected":"")+'>'+s.name+'</option>').join("");
    var aOpts='<option value="all"'+(selectedAreaFilter==="all"?" selected":"")+'>Tutte</option>'+areasOfSector(selectedSectorId).map(a=>'<option value="'+a.id+'"'+(selectedAreaFilter===a.id?" selected":"")+'>'+a.name+'</option>').join("");
    return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label style="margin:0">Settore</label><select style="width:auto;min-width:110px;margin:0" onchange="selectedSectorId=this.value;selectedAreaFilter=\'all\';selectedPlanArea=\'all\';render()">'+sOpts+'</select><label style="margin:0">Area</label><select style="width:auto;min-width:110px;margin:0" onchange="selectedAreaFilter=this.value;selectedPlanArea=this.value;render()">'+aOpts+'</select></div>';
  }
  if(currentUser.role==="viewer"){var ss=db.sectors.filter(s=>(currentUser.visibleSectorIds||[]).includes(s.id));var o=ss.map(s=>'<option value="'+s.id+'"'+(selectedSectorId===s.id?" selected":"")+'>'+s.name+'</option>').join("");return '<div style="display:flex;gap:8px;align-items:center"><label style="margin:0">Settore</label><select style="width:auto;min-width:110px;margin:0" onchange="selectedSectorId=this.value;selectedAreaFilter=\'all\';selectedPlanArea=\'all\';render()">'+o+'</select></div>';}
  return "";
}

function bellBtn(){
  if(!currentUser||(currentUser.role!=="sector_manager"&&currentUser.role!=="employee"))return"";
  var n=unreadCount();
  return '<button class="bell-btn" onclick="nav(\'notifications\')" title="Notifiche">'+ico("bell")+(n?'<span class="bell-badge">'+n+'</span>':'')+' </button>';
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
    '<div class="topbar-right">'+bellBtn()+'</div>'+
  '</div>';

  /* Mobile bottom nav */
  var bottomNav='<nav class="bottom-nav no-print">'+
    '<button class="bottom-nav-btn'+(page==="plan"?" active":"")+'" onclick="nav(\'plan\')">'+ico("beach")+'<span>Ferie</span></button>'+
    '<div class="bottom-nav-center"><button class="bottom-nav-center-btn'+(page==="calendar"?" active":"")+'" onclick="nav(\'calendar\')">'+ico("calendar","ico-lg")+'</button></div>'+
    '<button class="bottom-nav-btn'+(page==="reports"?" active":"")+'" onclick="nav(\'reports\')">'+ico("chart")+'<span>Riepilogo</span></button>'+
  '</nav>';

  var impBar=adminUser?'<div class="impersonation-bar no-print">Visualizzando come <strong>'+fullName(currentUser)+'</strong> <button class="btn btn-secondary btn-sm" onclick="stopImpersonation()">Torna admin</button></div>':"";

  var globalBell=(currentUser.role==="sector_manager"||currentUser.role==="employee")?
    '<div class="global-bell no-print"><button class="global-bell-btn" onclick="nav(\'notifications\')" title="Notifiche">'+ico("bell")+(unreadCount()?'<span class="global-bell-badge">'+unreadCount()+'</span>':'')+' </button></div>':"";

  app.innerHTML=topbar+
    '<div class="app-shell">'+sidebar+
    '<div class="main-content">'+impBar+globalBell+content+'</div>'+
    '</div>'+bottomNav;
}

/* =========================================================
   CALENDARIO
   ========================================================= */
function visibleUsersForCalendar(){
  if(calendarView==="personale"&&currentUser&&(currentUser.role==="employee"||currentUser.role==="sector_manager"))
    return [currentUser].filter(u=>u.approved&&isWorker(u));
  if(calendarView==="area"&&currentUser){
    var aid=currentUser.role==="admin"?selectedAreaFilter:currentUser.areaId;
    if(aid&&aid!=="all"&&aid!=="*")return visibleUsers().filter(u=>u.areaId===aid);
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
      (errs.length?'<div class="day-err-dot"></div>':"")+
      (hol?'<div class="day-hol-name">'+hol+'</div>':"")+
      '<div class="dot-row">'+dots+'</div>'+
    '</button>';
  }
  var modal=insertOpen?renderInsertSheet():(modalOpen?renderDayModal():"");
  var showFilter=currentUser.role==="employee"||currentUser.role==="sector_manager"||currentUser.role==="admin";
  var chips="";
  if(showFilter){
    var isSm=currentUser.role==="sector_manager";
    var isEmp=currentUser.role==="employee";
    chips='<div class="cal-chips">'+
      '<button class="cal-chip'+(calendarView==="settore"?" active":"")+'" onclick="calendarView=\'settore\';render()">Settore</button>'+
      (isSm||currentUser.role==="admin"?'<button class="cal-chip'+(calendarView==="area"?" active":"")+'" onclick="calendarView=\'area\';render()">Area</button>':"")+
      '<button class="cal-chip'+(calendarView==="personale"?" active":"")+'" onclick="calendarView=\'personale\';render()">'+(isEmp?"Solo io":"Personale")+'</button>'+
    '</div>';
  }
  var selectorHtml=selectorControls();
  layout(
    '<div class="page-header no-print"><h1>'+contextTitle()+'</h1>'+selectorHtml+'</div>'+
    '<div class="cal-wrap">'+
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
    renderDaySummary()+modal
  );
}
function contextTitle(){return "GESTIONALE — "+sectorName(selectedSectorId)+(selectedAreaFilter!=="all"?" / "+areaName(selectedAreaFilter):"");}

function renderDaySummary(){
  if(!selectedDate)return"";
  var people=isBlockedDay(selectedDate)?[]:visibleUsersForCalendar().filter(u=>isAbsent(eventFor(selectedDate,u.id)));
  var inner="";
  if(people.length){
    inner=people.map(u=>{
      var st=eventFor(selectedDate,u.id);
      return '<div class="day-summary-row">'+
        '<div class="day-summary-info"><strong>'+fullName(u)+'</strong><span>'+areaName(u.areaId)+'</span></div>'+
        statusTag(st)+'</div>';
    }).join("");
  }else if(isBlockedDay(selectedDate)){inner='<p style="color:var(--c-muted);font-size:13px;padding:8px 0">Giorno non lavorativo</p>';}
  else{inner='<div class="all-present">'+ico("users","ico-lg")+' Tutti in servizio</div>';}
  return '<div class="day-summary"><div class="day-summary-header"><span class="day-summary-date">'+fmt(selectedDate)+'</span></div>'+inner+'</div>';
}

function renderDayModal(){
  var hol=isHoliday(selectedDate)||isWeekend(selectedDate);
  var errs=smartRuleErrorsForDay(selectedDate);
  var displayP=isBlockedDay(selectedDate)?[]:visibleUsersForCalendar();
  var allP=isBlockedDay(selectedDate)?[]:visibleUsers();
  var absent=displayP.filter(u=>isAbsent(eventFor(selectedDate,u.id)));
  var canAdd=!isBlockedDay(selectedDate)&&allP.some(u=>canModifyUserEvents(u.id));
  var body="";
  if(hol){body='<div class="warning">Giorno non lavorativo. Non puoi inserire nulla.</div>';}
  else if(!absent.length){body='<div class="all-present">'+ico("users","ico-lg")+' Tutti in servizio</div>';}
  else{body=absent.map(u=>{var st=eventFor(selectedDate,u.id);var ce=canModifyUserEvents(u.id);
    var rb=ce&&isAbsent(st)?'<div class="person-action-row"><button class="btn btn-danger btn-sm" onclick="removeEvent(\''+selectedDate+'\',\''+u.id+'\')">Rimuovi</button></div>':'';
    return '<div class="person-row">'+avatarEl(u)+'<div class="person-meta"><strong>'+fullName(u)+'</strong><small>'+areaName(u.areaId)+'</small><div class="person-badge-row">'+statusTag(st)+'</div>'+rb+'</div></div>';
  }).join("");}
  return '<div class="modal-backdrop" onclick="if(event.target.className===\'modal-backdrop\')closeModal()">'+
    '<div class="modal-sheet">'+
    '<div class="modal-handle no-print"></div>'+
    '<div class="modal-head">'+
    '<div><div style="font-size:17px;font-weight:800">'+fmt(selectedDate)+'</div><div style="font-size:12px;color:var(--c-muted)">'+(hol?"Non lavorativo":"Presenze")+'</div></div>'+
    '<button class="modal-close" onclick="closeModal()">−</button>'+
    '</div>'+
    '<div class="modal-body">'+
    (errs.length?'<div class="warning">'+ico("warning")+'  '+errs[0]+'</div>':"")+
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
        avatarEl(u,true)+'<span style="font-size:11px">'+u.name+'</span></button>').join("")+
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
  pushNotification({text:notificationText(currentUser,u,st,date),scope:"sector",sectorId:u.sectorId,areaId:u.areaId,actorId:currentUser.id,type:"event"});
  try{await writeEventDay(date,db.events[date]);}catch(e){}
  closeInsertSheet();
}
async function removeEvent(date,userId){
  if(isBlockedDay(date)||!canModifyUserEvents(userId))return;
  var u=db.users.find(x=>x.id===userId);
  if(db.events[date])delete db.events[date][userId];
  refreshRuleViolations(date);
  pushNotification({text:notificationText(currentUser,u,"present",date),scope:"sector",sectorId:u.sectorId,areaId:u.areaId,actorId:currentUser.id,type:"event"});
  addAudit("Rimossa assenza di "+fullName(u)+" il "+fmt(date));
  try{await writeEventDay(date,db.events[date]||{});}catch(e){}
  modalOpen=false;render();
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
    '<div class="card"><div class="sec-title">Cambio password</div>'+
    '<div class="form-row"><label>Nuova password</label><input id="reqPw" type="password"></div>'+
    '<button class="btn btn-primary btn-full" onclick="requestPasswordChange()">Richiedi cambio</button>'+
    '<p id="profileMsg" class="error-msg"></p></div>'+
    (mgmt?'<div class="card"><div class="sec-title">Gestione</div>'+mgmt+'</div>':"")+
    '<div class="card">'+
    (adminUser?'<button class="btn btn-secondary btn-full" style="margin-bottom:8px" onclick="stopImpersonation()">Torna super admin</button>':'')+
    '<button class="btn btn-danger btn-full" onclick="logout()">Esci</button></div>'+
    '</div></div>'
  );
}
async function requestPasswordChange(){
  var pw=document.getElementById("reqPw").value;
  var el=document.getElementById("profileMsg");
  if(!pw){el.textContent="Inserisci la nuova password.";return;}
  var req={id:uid("req"),type:"password",userId:currentUser.id,newPassword:pw,status:"pending",at:new Date().toLocaleString("it-IT"),createdAt:Date.now()};
  try{await writeRequest(req);addIfAbsent(db.requests,req,true);pushNotification({text:fullName(currentUser)+" ha richiesto cambio password",scope:"admin",actorId:"system",type:"password",sectorId:currentUser.sectorId,areaId:currentUser.areaId});el.textContent="Richiesta inviata.";}
  catch(e){el.textContent="Errore di connessione, riprova.";}
}

/* =========================================================
   REGISTRA COLLEGA
   ========================================================= */
function renderRegisterColleague(){
  var secs=currentUser.role==="admin"?db.sectors:db.sectors.filter(s=>s.id===currentUser.sectorId);
  var sOpts=secs.map(s=>'<option value="'+s.id+'">'+s.name+'</option>').join("");
  layout(
    '<div class="page-header"><h1>Registra collega</h1></div>'+
    '<div class="card" style="max-width:600px">'+
    '<div class="form-grid-2">'+
    '<div class="form-row"><label>Nome</label><input id="cName"></div>'+
    '<div class="form-row"><label>Cognome</label><input id="cSurname"></div>'+
    '<div class="form-row"><label>Email</label><input id="cEmail" type="email"></div>'+
    '<div class="form-row"><label>Password provvisoria</label><input id="cPw" placeholder="1234"></div>'+
    '<div class="form-row"><label>Settore</label><select id="cSector" onchange="refreshColAreas()">'+sOpts+'</select></div>'+
    '<div class="form-row"><label>Area</label><select id="cArea"></select></div>'+
    '<div class="form-row"><label>C01</label><input id="cC01" type="number" value="0"></div>'+
    '<div class="form-row"><label>C02</label><input id="cC02" type="number" value="0"></div>'+
    '<div class="form-row"><label>F14</label><input id="cF14" type="number" value="0"></div>'+
    '</div>'+
    '<button class="btn btn-primary" onclick="saveColleague()">Registra</button>'+
    '<p id="cMsg" class="error-msg"></p>'+
    '</div>'
  );
  refreshColAreas();
}
function refreshColAreas(){
  var sec=document.getElementById("cSector").value;
  var areas=areasOfSector(sec);
  if(currentUser.role==="sector_manager")areas=areas.filter(a=>(currentUser.editableAreaIds||[]).includes(a.id));
  document.getElementById("cArea").innerHTML=areas.map(a=>'<option value="'+a.id+'">'+a.name+'</option>').join("");
}
async function saveColleague(){
  var name=document.getElementById("cName").value.trim();
  var surname=document.getElementById("cSurname").value.trim();
  var email=document.getElementById("cEmail").value.trim().toLowerCase();
  var pw=document.getElementById("cPw").value||"1234";
  var sectorId=document.getElementById("cSector").value;
  var areaId=document.getElementById("cArea").value;
  var c01=+document.getElementById("cC01").value||0;
  var c02=+document.getElementById("cC02").value||0;
  var f14=+document.getElementById("cF14").value||0;
  var msg=document.getElementById("cMsg");
  if(!name||!surname||!email||!areaId){msg.textContent="Compila tutti i campi.";return;}
  if(currentUser.role==="sector_manager"&&!(currentUser.editableAreaIds||[]).includes(areaId)){msg.textContent="Non puoi registrare in questa area.";return;}
  if(db.users.some(u=>u.email.toLowerCase()===email)){msg.textContent="Email già presente.";return;}
  var btn=document.querySelector("[onclick='saveColleague()']");
  if(btn){if(btn.disabled)return;btn.disabled=true;btn.textContent="Registrazione...";}
  var nu={id:uid("user"),email,password:pw,name,surname,role:"employee",sectorId,areaId,visibleSectorIds:[sectorId],editableAreaIds:[],c01,c02,f14,approved:true,initials:createInitialsForUser(name,surname),color:userColorByArea(areaId)};
  try{await writeUser(nu);addIfAbsent(db.users,nu);db.lastRead[nu.id]=Date.now();queueMetaWrite();addAudit("Registrato collega "+fullName(nu));msg.textContent="Collega registrato.";}
  catch(e){msg.textContent="Errore di connessione, riprova.";}
  if(btn){btn.disabled=false;btn.textContent="Registra";}
}

/* =========================================================
   DIPENDENTI
   ========================================================= */
function usersForPeople(){
  if(currentUser.role!=="admin")return visibleUsers(true);
  return db.users.filter(u=>u.role!=="admin"&&(selectedSectorId==="all"||u.sectorId===selectedSectorId)&&(selectedAreaFilter==="all"||u.areaId===selectedAreaFilter));
}
function renderPeople(){
  var rows=usersForPeople().map(u=>'<div class="person-row clickable" onclick="selectedEmployeeId=\''+u.id+'\';render()">'+
    avatarEl(u)+'<div class="person-meta"><strong>'+fullName(u)+'</strong><small>'+u.email+' · '+personSectorAreaLabel(u)+' · '+roleLabel(u.role)+'</small></div>'+
    '<span class="tag '+(u.approved?"tag-approved":"tag-pending")+'">'+(u.approved?"Attivo":"In attesa")+'</span></div>').join("");
  var detail=selectedEmployeeId?renderEmployeeDetail(db.users.find(u=>u.id===selectedEmployeeId)):'<div class="card"><p style="color:var(--c-muted);font-size:13px">Seleziona un dipendente per modificarlo.</p></div>';
  layout(
    '<div class="page-header"><h1>Dipendenti</h1>'+selectorControls()+'</div>'+
    '<div class="notice">'+(currentUser.role==="admin"?"Super admin: modifica completa.":"Referente: vedi il settore, modifichi solo le tue aree.")+'</div>'+
    '<div class="grid-2"><div class="card"><div class="sec-title">Elenco</div>'+(rows||"<p style='color:var(--c-muted);font-size:13px'>Nessun dipendente.</p>")+'</div>'+detail+'</div>'
  );
}
function renderEmployeeDetail(u){
  if(!u)return"";
  var prot=!canEditProtectedData()?"disabled":"";
  if(!canEditEmployeeData(u.id))return'<div class="card"><p style="color:var(--c-muted);font-size:13px;margin-bottom:10px">Non puoi modificare questo utente.</p>'+personRowEl(u,selectedDate||todayStr(),false)+'</div>';
  var sOpts=db.sectors.map(s=>'<option value="'+s.id+'"'+(u.sectorId===s.id?" selected":"")+'>'+s.name+'</option>').join("");
  var aOpts=areasOfSector(u.sectorId).map(a=>'<option value="'+a.id+'"'+(u.areaId===a.id?" selected":"")+'>'+a.name+'</option>').join("");
  var extra="";
  if(canEditProtectedData()){
    extra='<div class="form-row"><label>Aree modificabili (referente)</label><div class="check-list">'+db.areas.map(a=>'<label class="check-row"><input type="checkbox" class="d_ea" value="'+a.id+'"'+((u.editableAreaIds||[]).includes(a.id)?" checked":"")+'>'+sectorName(a.sectorId)+' / '+a.name+'</label>').join("")+'</div></div>'+
      '<div class="form-row"><label>Settori visibili (dirigente)</label><div class="check-list">'+db.sectors.map(s=>'<label class="check-row"><input type="checkbox" class="d_vs" value="'+s.id+'"'+((u.visibleSectorIds||[]).includes(s.id)?" checked":"")+'>'+s.name+'</label>').join("")+'</div></div>';
  }
  return '<div class="card"><div class="sec-title">Scheda utente</div>'+
    '<div class="form-grid-2">'+
    '<div class="form-row"><label>Nome</label><input id="dn" value="'+u.name+'"></div>'+
    '<div class="form-row"><label>Cognome</label><input id="ds" value="'+(u.surname||"")+'"></div>'+
    '<div class="form-row"><label>Email</label><input id="de" value="'+u.email+'" '+prot+'></div>'+
    '<div class="form-row"><label>Password</label><input id="dp" value="'+u.password+'" '+prot+'></div>'+
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
    '</div>'+extra+
    '<div style="display:flex;gap:8px;margin-top:8px">'+
    '<button class="btn btn-primary" onclick="saveEmployeeDetail(\''+u.id+'\')">Salva</button>'+
    (canEditProtectedData()?'<button class="btn btn-danger" onclick="deleteUser(\''+u.id+'\')">Elimina</button>':"")+
    '</div></div>';
}
function refreshDetailAreas(){
  var sec=document.getElementById("dd").value;
  var u=db.users.find(x=>x.id===selectedEmployeeId);
  document.getElementById("da").innerHTML=areasOfSector(sec).map(a=>'<option value="'+a.id+'"'+(u&&u.areaId===a.id?" selected":"")+'>'+a.name+'</option>').join("");
}
async function saveEmployeeDetail(id){
  var u=db.users.find(x=>x.id===id);if(!u||!canEditEmployeeData(id))return;
  u.name=document.getElementById("dn").value;u.surname=document.getElementById("ds").value;
  u.initials=createInitialsForUser(u.name,u.surname);
  if(canEditProtectedData()){
    u.email=document.getElementById("de").value;u.password=document.getElementById("dp").value;
    u.sectorId=document.getElementById("dd").value;u.areaId=document.getElementById("da").value;
    u.role=document.getElementById("dr").value;u.approved=document.getElementById("dap").value==="true";
    u.c01=+document.getElementById("dc1").value||0;u.c02=+document.getElementById("dc2").value||0;u.f14=+document.getElementById("df14").value||0;
    u.editableAreaIds=[...document.querySelectorAll(".d_ea:checked")].map(x=>x.value);
    u.visibleSectorIds=[...document.querySelectorAll(".d_vs:checked")].map(x=>x.value);
    if(u.role==="employee"){u.visibleSectorIds=[u.sectorId];u.editableAreaIds=[];}
    if(u.role==="sector_manager"&&!u.editableAreaIds.length)u.editableAreaIds=[u.areaId];
    if(u.role==="viewer"&&!u.visibleSectorIds.length)u.visibleSectorIds=[u.sectorId];
    if(u.role==="viewer")u.color="#DC2626";else if(u.role==="sector_manager")u.color="#F59E0B";else u.color=userColorByArea(u.areaId);
  }
  addAudit("Aggiornata scheda di "+fullName(u));try{await writeUser(u);}catch(e){}render();
}
async function deleteUser(id){
  if(!confirm("Eliminare utente?"))return;
  var u=db.users.find(x=>x.id===id);db.users=db.users.filter(x=>x.id!==id);
  Object.keys(db.events).forEach(d=>{if(db.events[d]&&db.events[d][id]!==undefined){delete db.events[d][id];writeEventDay(d,db.events[d]).catch(()=>{});}});
  addAudit("Eliminato "+fullName(u));try{await deleteUserRemote(id);}catch(e){}selectedEmployeeId=null;render();
}

/* =========================================================
   RIEPILOGO
   ========================================================= */
function userReport(u){
  var r={c01:0,c02:0,f14:0,smart:0,a01:0,altro:0};
  Object.keys(db.events).forEach(d=>{if(!isBlockedDay(d)){var st=normalizeEventCode(db.events[d][u.id]);if(r[st]!==undefined)r[st]++;}});
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
      '<div class="report-stat"><strong>'+r.a01+'</strong><span>A01 malattia</span></div>'+
      '<div class="report-stat"><strong>'+r.smart+'</strong><span>Smart working</span></div>'+
      '<div class="report-stat"><strong>'+r.altro+'</strong><span>Altro</span></div>'+
      '</div></div>';
  }).join("");
  layout('<div class="page-header"><h1>Riepilogo</h1>'+selectorControls()+'</div><div class="report-grid">'+cards+'</div>');
}

/* =========================================================
   NOTIFICHE
   ========================================================= */
function renderNotifications(){
  markNotificationsRead();
  var notes=visibleNotifications();
  var list=notes.length?notes.map(n=>'<div class="notif-item"><strong>'+n.text+'</strong><time>'+n.displayAt+'</time></div>').join(""):'<p style="color:var(--c-muted);font-size:13px">Nessuna notifica.</p>';
  layout('<div class="page-header"><h1>Notifiche</h1><span class="pill">'+notes.length+'</span></div><div class="card">'+list+'</div>');
}

/* =========================================================
   ADMIN
   ========================================================= */
function renderAdmin(){
  var pending=pendingRegistrations();
  var newUsers=pending.map(u=>'<div class="person-row">'+avatarEl(u)+'<div class="person-meta"><strong>'+fullName(u)+'</strong><small>'+u.email+' · '+personSectorAreaLabel(u)+'</small></div>'+
    '<div style="display:flex;gap:6px">'+
    '<button class="btn btn-primary btn-sm" onclick="approveRegistration(\''+u.id+'\')">Approva</button>'+
    '<button class="btn btn-secondary btn-sm" onclick="page=\'people\';selectedEmployeeId=\''+u.id+'\';render()">Modifica</button>'+
    '<button class="btn btn-danger btn-sm" onclick="deleteUser(\''+u.id+'\')">Elimina</button>'+
    '</div></div>').join("");
  var pwds=db.requests.filter(r=>r.status==="pending").map(r=>{
    var u=db.users.find(x=>x.id===r.userId);if(!u)return"";
    if(r.type==="forgot_password")return'<div class="person-row"><div class="person-meta"><strong>'+fullName(u)+' — password dimenticata</strong><small>'+r.at+'</small><input id="rs_'+r.id+'" placeholder="Nuova password" style="margin-top:6px"></div><div style="display:flex;gap:6px"><button class="btn btn-primary btn-sm" onclick="approveForgotPassword(\''+r.id+'\')">Imposta</button><button class="btn btn-danger btn-sm" onclick="rejectPwdRequest(\''+r.id+'\')">Rifiuta</button></div></div>';
    return'<div class="person-row"><div class="person-meta"><strong>'+fullName(u)+' — cambio password</strong><small>'+r.at+'</small></div><div style="display:flex;gap:6px"><button class="btn btn-primary btn-sm" onclick="approvePasswordRequest(\''+r.id+'\')">Approva</button><button class="btn btn-danger btn-sm" onclick="rejectPwdRequest(\''+r.id+'\')">Rifiuta</button></div></div>';
  }).join("");
  var adminNotes=visibleNotifications().slice(0,10).map(n=>'<div class="notif-item"><strong>'+n.text+'</strong><time>'+n.displayAt+'</time></div>').join("");
  var audit=db.audit.slice(0,15).map(a=>'<div class="person-row"><div class="person-meta"><strong>'+a.text+'</strong><small>'+a.at+' · '+a.by+'</small></div></div>').join()||'<p style="color:var(--c-muted);font-size:13px">Nessuna modifica.</p>';
  layout(
    '<div class="page-header"><h1>Admin</h1><span class="pill">'+pendingAdminCount()+'</span></div>'+
    '<div class="grid-2">'+
    '<div class="card"><div class="sec-title">Registrazioni in attesa</div>'+(newUsers||'<p style="color:var(--c-muted);font-size:13px">Nessuna.</p>')+'</div>'+
    '<div class="card"><div class="sec-title">Password & notifiche</div>'+pwds+(adminNotes||'<p style="color:var(--c-muted);font-size:13px">Nessuna richiesta.</p>')+'</div>'+
    '</div>'+
    renderSwitchUserPanel()+renderSectorAdminPanel()+
    '<div class="card"><div class="sec-title">Backup</div><button class="btn btn-secondary" onclick="exportData()">'+ico("chart")+'  Esporta JSON</button></div>'+
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
  var s=db.sectors.map(s=>{var areas=areasOfSector(s.id).map(a=>'<span class="tag tag-smart" style="margin-right:4px">'+a.name+'</span>').join("");return'<div class="person-row"><div class="person-meta"><strong>'+s.name+'</strong><small>'+(areas||"Nessuna area")+'</small></div><div style="display:flex;gap:6px"><input id="ar_'+s.id+'" placeholder="Nuova area" style="width:130px;margin:0"><button class="btn btn-secondary btn-sm" onclick="addAreaToSector(\''+s.id+'\')">Aggiungi</button></div></div>';}).join("");
  return'<div class="card"><div class="sec-title">Settori e aree</div>'+s+'<div class="form-grid-2" style="margin-top:14px"><div class="form-row"><label>Nuovo settore</label><input id="nSec"></div><div class="form-row"><label>Prima area</label><input id="nSecA"></div></div><button class="btn btn-primary btn-sm" onclick="addSector()">Crea settore</button></div>';
}
async function addSector(){var nm=document.getElementById("nSec").value.trim(),an=document.getElementById("nSecA").value.trim();if(!nm){alert("Inserisci il nome.");return;}var id=slugifyId(nm),b=id,n=2;while(db.sectors.some(s=>s.id===id))id=b+"-"+(n++);var s={id,name:nm,hasAreas:!!an};db.sectors.push(s);try{await writeSector(s);}catch(e){}if(an){var a={id:slugifyId(id+"-"+an),sectorId:id,name:an,color:"#64748B"};db.areas.push(a);try{await writeArea(a);}catch(e){}}addAudit("Creato settore "+nm);render();}
async function addAreaToSector(sId){var inp=document.getElementById("ar_"+sId),nm=inp.value.trim();if(!nm){alert("Inserisci il nome.");return;}var id=slugifyId(sId+"-"+nm),b=id,n=2;while(db.areas.some(a=>a.id===id))id=b+"-"+(n++);var a={id,sectorId:sId,name:nm,color:"#64748B"};db.areas.push(a);var s=db.sectors.find(x=>x.id===sId);if(s&&!s.hasAreas){s.hasAreas=true;try{await writeSector(s);}catch(e){}}try{await writeArea(a);}catch(e){}addAudit("Creata area "+nm);render();}
async function approveRegistration(uId){var u=db.users.find(x=>x.id===uId);if(!u)return;u.approved=true;if(!u.visibleSectorIds?.length)u.visibleSectorIds=[u.sectorId];if(!u.editableAreaIds)u.editableAreaIds=[];db.lastRead[u.id]=Date.now();queueMetaWrite();addAudit("Approvata registrazione di "+fullName(u));try{await writeUser(u);}catch(e){}render();}
async function approvePasswordRequest(id){var r=db.requests.find(x=>x.id===id);var u=r&&db.users.find(x=>x.id===r.userId);if(!r||!u)return;u.password=r.newPassword;r.status="approved";addAudit("Cambio password per "+fullName(u));try{await writeUser(u);await writeRequest(r);}catch(e){}render();}
async function approveForgotPassword(id){var r=db.requests.find(x=>x.id===id);var u=r&&db.users.find(x=>x.id===r.userId);if(!r||!u)return;var inp=document.getElementById("rs_"+id);var pw=(inp&&inp.value.trim())||"1234";u.password=pw;r.status="approved";addAudit("Reset password per "+fullName(u));try{await writeUser(u);await writeRequest(r);}catch(e){}render();}
async function rejectPwdRequest(id){var r=db.requests.find(x=>x.id===id);if(!r)return;r.status="rejected";addAudit("Rifiutata richiesta password");try{await writeRequest(r);}catch(e){}render();}
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
function planSectorSelect(){if(currentUser.role!=="admin")return"";return'<select style="width:auto;min-width:140px;margin:0" onchange="selectedSectorId=this.value;selectedPlanArea=\'all\';render()">'+db.sectors.map(s=>'<option value="'+s.id+'"'+(selectedSectorId===s.id?" selected":"")+'>'+s.name+'</option>').join("")+'</select>';}
function pctColor(p){if(p<=0)return"transparent";if(p<=20)return"#86EFAC";if(p<=50)return"#FDE047";if(p<=80)return"#FB923C";return"#F87171";}
function monthLabel(m){var p=m.split("-").map(Number);return new Date(p[0],p[1]-1,1).toLocaleDateString("it-IT",{month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase());}
function workingDaysOfMonth(m){var p=m.split("-").map(Number),y=p[0],mo=p[1],days=new Date(y,mo,0).getDate(),out=[];for(var d=1;d<=days;d++){var date=y+"-"+String(mo).padStart(2,"0")+"-"+String(d).padStart(2,"0");if(!isWeekend(date))out.push({date,day:d});}return out;}
function planPeople(sId,aId){return db.users.filter(u=>u.approved&&isWorker(u)&&u.sectorId===sId&&(aId==="all"||u.areaId===aId));}

function renderPlan(){
  var periods=planPeriods();var months=periods[selectedPlanPeriod]||periods.estate;
  var sId=currentUser.role==="admin"?selectedSectorId:currentUser.sectorId;
  if(!sId||sId==="all"||sId==="*")sId="prevenzione";
  var areas=areasOfSector(sId);if(!areas.length)areas=[{id:sId,sectorId:sId,name:sectorName(sId),color:"#64748B"}];
  if(!selectedPlanArea)selectedPlanArea="all";
  var aOpts='<option value="all"'+(selectedPlanArea==="all"?" selected":"")+'>'+sectorName(sId)+'</option>'+areas.map(a=>'<option value="'+a.id+'"'+(selectedPlanArea===a.id?" selected":"")+'>Solo '+a.name+'</option>').join("");
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
    '<option value="estate"'+(selectedPlanPeriod==="estate"?" selected":"")+'>Estate (giu–set)</option>'+
    '<option value="natale"'+(selectedPlanPeriod==="natale"?" selected":"")+'>Natale (dic–gen)</option>'+
    '<option value="pasqua"'+(selectedPlanPeriod==="pasqua"?" selected":"")+'>Pasqua (apr)</option>'+
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
if(restoreSession())render();else renderLogin();
