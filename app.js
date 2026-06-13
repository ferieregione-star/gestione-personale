/* =========================================================
   LOGIN / REGISTRAZIONE / PASSWORD
   ========================================================= */
function applyTheme(){
  document.body.classList.remove("theme-admin","theme-referente","theme-employee","theme-dirigente");
  if(!currentUser) return;
  if(currentUser.role==="admin") document.body.classList.add("theme-admin");
  else if(currentUser.role==="sector_manager") document.body.classList.add("theme-referente");
  else if(currentUser.role==="viewer") document.body.classList.add("theme-dirigente");
  else document.body.classList.add("theme-employee");
}

function login(){
  var email=document.getElementById("loginEmail").value.trim().toLowerCase();
  var password=document.getElementById("loginPassword").value;
  var u=db.users.find(function(x){return x.email.toLowerCase()===email && x.password===password;});
  var errEl=document.getElementById("loginError");
  if(!u){ errEl.textContent="Email o password non valide."; return; }
  if(!u.approved){
    errEl.textContent="Utenza in attesa di approvazione dal super admin.";
    return;
  }
  currentUser=u;
  saveSession();
  selectedSectorId = u.role==="admin" ? "prevenzione" : u.sectorId;
  selectedAreaFilter="all";
  selectedPlanArea="all";
  page="calendar";
  render();
}
function logout(){ currentUser=null; adminUser=null; clearSession(); renderLogin(); }

function renderLogin(message){
  message = message || "";
  document.body.classList.remove("theme-admin","theme-referente","theme-employee","theme-dirigente");
  app.innerHTML =
    '<div class="login-page"><div class="login-box"><div class="logo">📅</div><div class="card">'+
    '<div class="top"><h1>Gestione Personale</h1></div>'+
    (message ? ('<div class="notice">'+message+'</div>') : '')+
    '<label>Email</label><input id="loginEmail" autocomplete="username" placeholder="Email">'+
    '<label>Password</label><input id="loginPassword" type="password" autocomplete="current-password" placeholder="Password">'+
    '<button class="btn primary full" onclick="login()">Entra</button>'+
    '<button class="btn secondary full" onclick="renderRegister()">Registrati</button>'+
    '<button class="forgot-link" onclick="renderForgotPassword()">Password dimenticata?</button>'+
    '<p id="loginError" class="error"></p>'+
    '</div></div></div>';
  document.getElementById("loginEmail").addEventListener("keydown", function(e){ if(e.key==="Enter") login(); });
  document.getElementById("loginPassword").addEventListener("keydown", function(e){ if(e.key==="Enter") login(); });
}

function renderRegister(){
  page="register";
  var sectorOptions=db.sectors.map(function(s){return '<option value="'+s.id+'">'+s.name+'</option>';}).join("");
  app.innerHTML =
    '<div class="login-page"><div class="login-box"><div class="logo">👤</div><div class="card">'+
    '<div class="top"><h1>Registrazione</h1><span class="pill">Registrazione</span></div>'+
    '<div class="form-grid"><div><label>Nome</label><input id="regName"></div><div><label>Cognome</label><input id="regSurname"></div></div>'+
    '<label>Email</label><input id="regEmail">'+
    '<label>Password</label><input id="regPassword" type="password" autocomplete="new-password" placeholder="Password">'+
    '<div class="form-grid"><div><label>Settore</label><select id="regSector" onchange="refreshRegisterAreas()">'+sectorOptions+'</select></div>'+
    '<div id="regAreaWrap"><label>Area</label><select id="regArea"></select></div></div>'+
    '<div class="form-grid"><div><label>C01 ferie anno attuale</label><input id="regC01" type="number" value="0"></div>'+
    '<div><label>C02 ferie anno precedente</label><input id="regC02" type="number" value="0"></div>'+
    '<div><label>F14 festività soppresse residue</label><input id="regF14" type="number" value="0"></div></div>'+
    '<button type="button" class="btn primary full" onclick="registerUser()">Invia registrazione</button>'+
    '<button class="btn secondary full" onclick="page=null;renderLogin()">Torna al login</button>'+
    '<p id="regError" class="error"></p>'+
    '</div></div></div>';
  refreshRegisterAreas();
}
function refreshRegisterAreas(){
  var sec=document.getElementById("regSector").value;
  var sector=sectorById(sec);
  var wrap=document.getElementById("regAreaWrap");
  var sel=document.getElementById("regArea");
  if(sector && sector.hasAreas){
    wrap.style.display="block";
    sel.innerHTML=areasOfSector(sec).map(function(a){return '<option value="'+a.id+'">'+a.name+'</option>';}).join("");
  }else{
    wrap.style.display="none";
    var a=areasOfSector(sec)[0];
    sel.innerHTML = a ? ('<option value="'+a.id+'">'+a.name+'</option>') : "";
  }
}
async function registerUser(){
  var name=document.getElementById("regName").value.trim();
  var surname=document.getElementById("regSurname").value.trim();
  var email=document.getElementById("regEmail").value.trim().toLowerCase();
  var password=document.getElementById("regPassword").value;
  var sectorId=document.getElementById("regSector").value;
  var areaId=document.getElementById("regArea").value;
  var c02=Number(document.getElementById("regC02").value||0);
  var c01=Number(document.getElementById("regC01").value||0);
  var f14=Number(document.getElementById("regF14").value||0);

  if(!name||!surname||!email||!password||!areaId){
    document.getElementById("regError").textContent="Compila tutti i dati.";
    return;
  }
  var existing=db.users.find(function(u){return (u.email||"").toLowerCase()===email;});
  if(existing){
    if(!existing.approved){
      page=null;
      renderLogin("Registrazione già inviata. Utenza in attesa di approvazione dal super admin.");
      return;
    }
    document.getElementById("regError").textContent="Email già registrata.";
    return;
  }

  var newUser={
    id:uid("user"), email:email, password:password, name:name, surname:surname,
    role:"employee", sectorId:sectorId, areaId:areaId,
    visibleSectorIds:[sectorId], editableAreaIds:[],
    c01:c01, c02:c02, f14:f14, approved:false,
    initials:createInitialsForUser(name,surname), color:"#0ea5e9"
  };

  var btn=document.querySelector("button[onclick='registerUser()']");
  if(btn){ btn.disabled=true; btn.textContent="Invio in corso..."; }

  try{
    await writeUser(newUser);
    db.users.push(newUser);
    pushNotification({
      text:"Nuova utenza da abilitare: "+name+" "+surname+" - "+sectorName(sectorId)+" / "+areaName(areaId),
      scope:"admin", type:"registration", actorId:"system", sectorId:sectorId, areaId:areaId
    });
    addAudit("Nuova registrazione: "+name+" "+surname);
    page=null;
    renderLogin("Registrazione inviata. Utenza in attesa di approvazione dal super admin.");
  }catch(e){
    var err=document.getElementById("regError");
    if(err) err.textContent="Errore durante l'invio della registrazione. Controlla la connessione e riprova.";
    if(btn){ btn.disabled=false; btn.textContent="Invia registrazione"; }
  }
}

function renderForgotPassword(){
  page="forgot";
  app.innerHTML =
    '<div class="login-page"><div class="login-box"><div class="logo">🔐</div><div class="card">'+
    '<div class="top"><h1>Password dimenticata</h1><span class="pill">richiesta admin</span></div>'+
    '<label>Email</label><input id="forgotEmail">'+
    '<button class="btn primary full" onclick="sendForgotPassword()">Invia richiesta</button>'+
    '<button class="btn secondary full" onclick="page=null;renderLogin()">Torna al login</button>'+
    '<p id="forgotMsg" class="small"></p>'+
    '</div></div></div>';
}
async function sendForgotPassword(){
  var email=document.getElementById("forgotEmail").value.trim().toLowerCase();
  var u=db.users.find(function(x){return x.email.toLowerCase()===email;});
  var msgEl=document.getElementById("forgotMsg");
  if(!u){ msgEl.textContent="Utente non trovato."; return; }
  var req={id:uid("req"), type:"forgot_password", userId:u.id, newPassword:"", status:"pending", at:new Date().toLocaleString("it-IT"), createdAt:Date.now()};
  try{
    await writeRequest(req);
    db.requests.unshift(req);
    pushNotification({text:"Password dimenticata: "+fullName(u)+" chiede reset", scope:"admin", actorId:"system", type:"password", sectorId:u.sectorId, areaId:u.areaId});
    msgEl.textContent="Richiesta inviata.";
  }catch(e){
    msgEl.textContent="Errore di connessione, riprova.";
  }
}

/* =========================================================
   NAVIGAZIONE / LAYOUT
   ========================================================= */
function pageTitleLabel(){
  var labels={calendar:"Calendario", plan:"Piano ferie", profile:"Dati personali", people:"Dipendenti", registercolleague:"Registra collega", reports:"Riepilogo", admin:"Admin", notifications:"Notifiche"};
  return labels[page]||"Gestione Personale";
}
function goBack(){
  if(modalOpen){ modalOpen=false; render(); return; }
  if(planModalOpen){ closePlanDay(); return; }
  var prev=navStack.pop();
  page=prev||"calendar";
  render();
}
function backButton(){
  if(page==="calendar" && !modalOpen && !planModalOpen) return "";
  return '<button class="back-btn no-print" onclick="goBack()">← Indietro</button>';
}
function nav(id){
  if(page!==id) navStack.push(page);
  page=id; modalOpen=false; planModalOpen=false; mobileMenuOpen=false;
  if(id==="plan") loadEventsForPlanPeriod();
  render();
}
function loadEventsForPlanPeriod(){
  var periods=planPeriods();
  var months=periods[selectedPlanPeriod]||periods.estate;
  months.forEach(loadEventsForMonth);
}

function startImpersonation(userId){
  if(currentUser.role!=="admin" && !adminUser) return;
  if(!adminUser) adminUser=currentUser;
  var u=db.users.find(function(x){return x.id===userId;});
  if(!u||u.role==="admin") return;
  currentUser=u;
  selectedSectorId=u.sectorId;
  selectedAreaFilter="all";
  selectedPlanArea="all";
  page="calendar";
  mobileMenuOpen=false;
  render();
}
function stopImpersonation(){
  if(!adminUser) return;
  currentUser=adminUser;
  adminUser=null;
  selectedSectorId="prevenzione";
  selectedAreaFilter="all";
  selectedPlanArea="all";
  page="admin";
  render();
}
function renderSwitchUserPanel(){
  if(currentUser.role!=="admin" && !adminUser) return "";
  var list=db.users.filter(function(u){return u.approved && u.role!=="admin";}).map(function(u){
    return '<button class="switch-user-row" onclick="startImpersonation(\''+u.id+'\')"><span>'+fullName(u)+'</span><small>'+roleLabel(u.role)+' · '+sectorName(u.sectorId)+' / '+areaName(u.areaId)+'</small></button>';
  }).join("");
  var banner = adminUser ? ('<div class="warning">Stai visualizzando come '+fullName(currentUser)+'. <button class="btn secondary" onclick="stopImpersonation()">Torna super admin</button></div>') : "";
  return '<div class="card switch-card"><h3 class="section-title">Cambio utente</h3>'+banner+'<div class="switch-list">'+list+'</div></div>';
}
function toggleMobileMenu(){ mobileMenuOpen=!mobileMenuOpen; render(); }

function userContextLabel(u){
  if(!u) return "";
  if(u.role==="employee"){
    var area=(u.areaId && u.areaId!=="*" && areasOfSector(u.sectorId).length) ? ("/"+areaName(u.areaId)) : "";
    return sectorName(u.sectorId)+area;
  }
  if(u.role==="viewer"){
    var sectors=(u.visibleSectorIds||[]).map(sectorName).join(" e ");
    return "Dirigente "+(sectors||sectorName(u.sectorId));
  }
  if(u.role==="sector_manager"){
    var editable=u.editableAreaIds||[];
    var sectorsSet=Array.from(new Set(editable.map(function(aid){var a=db.areas.find(function(x){return x.id===aid;}); return a?a.sectorId:null;}).filter(Boolean)));
    if(sectorsSet.length===1){
      var allAreas=areasOfSector(sectorsSet[0]).map(function(a){return a.id;});
      var all=allAreas.length && allAreas.every(function(a){return editable.indexOf(a)>=0;});
      if(all) return "Referente "+sectorName(sectorsSet[0]);
      return "Referente "+editable.map(areaName).join(" e ");
    }
    return "Referente "+(sectorsSet.map(sectorName).join(" e ")||sectorName(u.sectorId));
  }
  if(u.role==="admin") return "Super admin";
  return roleLabel(u.role);
}

function navButton(id,label){
  var b="";
  if(id==="admin" && pendingAdminCount()>0) b='<span class="nav-badge">'+pendingAdminCount()+'</span>';
  return '<button class="'+(page===id?'active':'')+'" onclick="nav(\''+id+'\')">'+label+b+'</button>';
}
function bellButton(){
  if(!currentUser||(currentUser.role!=="sector_manager"&&currentUser.role!=="employee")) return "";
  var n=unreadCount();
  return '<button class="icon-bell global-bell-btn" onclick="nav(\'notifications\')" title="Notifiche">🔔'+(n?('<span class="num">'+n+'</span>'):'')+'</button>';
}
function contextTitle(){
  return "GESTIONALE - "+sectorName(selectedSectorId)+(selectedAreaFilter!=="all" ? (" / "+areaName(selectedAreaFilter)) : "");
}
function selectorControls(){
  if(currentUser.role==="admin"){
    var sectorOpts=db.sectors.map(function(s){return '<option value="'+s.id+'" '+(selectedSectorId===s.id?'selected':'')+'>'+s.name+'</option>';}).join("");
    var areaOpts='<option value="all" '+(selectedAreaFilter==="all"?'selected':'')+'>Tutte</option>'+areasOfSector(selectedSectorId).map(function(a){return '<option value="'+a.id+'" '+(selectedAreaFilter===a.id?'selected':'')+'>'+a.name+'</option>';}).join("");
    return '<div class="sector-filter"><label>Settore</label><select onchange="selectedSectorId=this.value;selectedAreaFilter=\'all\';selectedPlanArea=\'all\';render()">'+sectorOpts+'</select><label>Area</label><select onchange="selectedAreaFilter=this.value;selectedPlanArea=this.value;render()">'+areaOpts+'</select></div>';
  }
  if(currentUser.role==="viewer"){
    var sectors=db.sectors.filter(function(s){return (currentUser.visibleSectorIds||[]).indexOf(s.id)>=0;});
    var opts=sectors.map(function(s){return '<option value="'+s.id+'" '+(selectedSectorId===s.id?'selected':'')+'>'+s.name+'</option>';}).join("");
    return '<div class="sector-filter"><label>Settore</label><select onchange="selectedSectorId=this.value;selectedAreaFilter=\'all\';selectedPlanArea=\'all\';render()">'+opts+'</select></div>';
  }
  return "";
}
function layout(content){
  if(typeof currentUser==="undefined" || !currentUser) return renderLogin();
  applyTheme();
  document.body.classList.remove("page-calendar","page-plan","page-profile","page-people","page-registercolleague","page-reports","page-admin","page-notifications");
  document.body.classList.add("page-"+page);
  var navHtml='<div class="brand"><div class="brand-icon">📅</div><div><strong>Gestione Personale</strong></div></div><div class="nav">'+
    navButton("calendar","📅 Calendario")+navButton("plan","🗓️ Piano ferie")+navButton("profile","👤 Dati personali")+
    (canManageUsers()?navButton("people","👥 Dipendenti"):"")+
    (canRegisterColleagues()?navButton("registercolleague","➕ Registra collega"):"")+
    navButton("reports","📊 Riepilogo")+
    (canManageUsers()?navButton("admin","⚙️ Admin"):"")+
    '</div><div class="userbox small"><b>'+fullName(currentUser)+'</b><br>'+userContextLabel(currentUser)+
    (adminUser?'<br><button class="btn secondary full" onclick="stopImpersonation()">Torna super admin</button>':'')+
    '<button class="btn secondary full" onclick="logout()">Esci</button></div>';
  var impBanner = adminUser ? ('<div class="impersonation-banner no-print">Modalità super admin: stai visualizzando come <b>'+fullName(currentUser)+'</b></div>') : "";
  var bottomNav =
    '<nav class="bottom-tabbar no-print">'+
    '<button class="'+(page==="plan"?"active":"")+'" onclick="nav(\'plan\')"><span class="tab-icon">🏖️</span><span>Ferie</span></button>'+
    '<button class="tab-center '+(page==="calendar"?"active":"")+'" onclick="nav(\'calendar\')"><span class="tab-icon">📅</span></button>'+
    '<button class="'+(page==="reports"?"active":"")+'" onclick="nav(\'reports\')"><span class="tab-icon">📊</span><span>Riepilogo</span></button>'+
    '</nav>';
  app.innerHTML =
    '<div class="mobile-appbar no-print">'+
    '<button class="mobile-avatar-btn" style="background:'+currentUser.color+'" onclick="nav(\'profile\')">'+currentUser.initials+'</button>'+
    '<strong>'+pageTitleLabel()+'</strong><div>'+bellButton()+'</div></div>'+
    (mobileMenuOpen ? '<div class="mobile-overlay" onclick="toggleMobileMenu()"></div>' : '')+
    '<div class="app '+(mobileMenuOpen?'menu-open':'')+'"><aside class="sidebar">'+navHtml+'</aside><main class="main">'+
    '<div class="global-bell-wrap no-print desktop-bell">'+bellButton()+'</div>'+backButton()+impBanner+content+
    '</main></div>'+bottomNav;
}
function avatarClass(u){ return u.role==="viewer"?"viewer":u.role==="sector_manager"?"referente":""; }
function nameClass(u){ return u.role==="viewer"?"name-viewer":u.role==="sector_manager"?"name-referente":""; }
function personRow(u,date,editable){
  var st=eventFor(date,u.id);
  return '<div class="person"><div class="avatar '+avatarClass(u)+'" style="background:'+u.color+'">'+u.initials+'</div>'+
    '<div class="meta"><b class="'+nameClass(u)+'">'+fullName(u)+'</b><small>'+sectorName(u.sectorId)+' / '+areaName(u.areaId)+'</small></div>'+
    statusTag(st)+
    ((editable && isAbsent(st)) ? ('<button class="btn danger" onclick="removeEvent(\''+date+'\',\''+u.id+'\')">Rimuovi</button>') : "")+
    '</div>';
}

/* =========================================================
   CALENDARIO
   ========================================================= */
function changeMonth(delta){
  viewMonth+=delta;
  if(viewMonth<0){ viewMonth=11; viewYear--; }
  if(viewMonth>11){ viewMonth=0; viewYear++; }
  selectedDate=viewYear+"-"+String(viewMonth+1).padStart(2,"0")+"-01";
  modalOpen=false;
  loadEventsForMonth(monthKeyOf(selectedDate));
  render();
}
function openDay(date){ selectedDate=date; modalOpen=true; render(); }
function closeModal(){ modalOpen=false; render(); }

function renderCalendar(){
  loadEventsForMonth(monthKeyOf(dateKey(1)));
  var days="";
  var hmap=holidaysFor(viewYear);
  var blanks=(new Date(viewYear,viewMonth,1).getDay()+6)%7;
  for(var i=0;i<Math.min(blanks,5);i++) days+='<div class="day blank"><div class="empty-day">—</div></div>';
  for(var d=1;d<=daysInMonth();d++){
    var date=dateKey(d);
    var dow=new Date(date+"T00:00:00").getDay();
    if(dow===0||dow===6) continue;
    var hol=hmap[date];
    var errs=smartRuleErrorsForDay(date);
    var abs = hol ? [] : visibleUsers().filter(function(u){return isAbsent(eventFor(date,u.id));});
    var dots=abs.map(function(u){
      var st=eventFor(date,u.id), s=STATUS[st];
      return '<span class="person-dot" title="'+fullName(u)+' - '+s.label+'" style="background:'+s.color+'">'+s.short+'</span>';
    }).join("");
    days += '<button class="day '+(selectedDate===date?'selected':'')+' '+(hol?'holiday':'')+' '+(errs.length?'rule-error':'')+'" onclick="openDay(\''+date+'\')">'+
      '<div class="day-num">'+d+'</div>'+
      (errs.length?'<div class="danger-mark">!</div>':"")+
      (hol?('<div class="holiday-name">'+hol+'</div>'):"")+
      '<div class="dot-row">'+(dots || ('<span class="empty-day">'+(hol?"Festivo":"Tutti presenti")+'</span>'))+'</div>'+
      '</button>';
  }
  var modal = modalOpen ? renderDayModal() : "";
  layout(
    '<div class="top"><h1>'+contextTitle()+'</h1><div class="sector-filter">'+selectorControls()+'</div></div>'+
    '<div class="calendar-wrap"><div class="calendar-toolbar"><button class="btn secondary" onclick="changeMonth(-1)">← Mese precedente</button>'+
    '<div class="month-title">'+monthName()+'</div><button class="btn secondary" onclick="changeMonth(1)">Mese successivo →</button></div>'+
    '<div class="calendar-head"><div>LUN</div><div>MAR</div><div>MER</div><div>GIO</div><div>VEN</div></div>'+
    '<div class="calendar">'+days+'</div></div>'+
    '<div class="card" style="margin-top:16px"><div class="top"><h3 class="section-title">Riepilogo '+fmt(selectedDate)+'</h3><span class="pill">'+(isHoliday(selectedDate)||"Giorno lavorativo")+'</span></div>'+
    (isBlockedDay(selectedDate) ? '<p class="small">Giorno non lavorativo.</p>' : visibleUsers().map(function(u){return personRow(u,selectedDate,canModifyUserEvents(u.id));}).join(""))+
    '</div>'+modal
  );
}
function renderDayModal(){
  var hol=isHoliday(selectedDate)||isWeekend(selectedDate);
  var errs=smartRuleErrorsForDay(selectedDate);
  var people=isBlockedDay(selectedDate)?[]:visibleUsers();
  var canAdd=!isBlockedDay(selectedDate) && people.some(function(u){return canModifyUserEvents(u.id);});
  return '<div class="modal-backdrop" onclick="if(event.target.className===\'modal-backdrop\')closeModal()">'+
    '<div class="modal ios-sheet"><div class="modal-grabber"></div>'+
    '<div class="modal-head"><div><h2>'+fmt(selectedDate)+'</h2><p class="small modal-subtitle">'+(hol?"Giorno non lavorativo":"Chi è assente oggi")+'</p></div>'+
    '<button class="close" onclick="closeModal()">Chiudi</button></div>'+
    (hol?'<div class="warning">Giorno non lavorativo. Non puoi inserire nulla.</div>':"")+
    (errs.length?('<div class="warning">⚠️ '+(errs.length>1?errs.map(function(e,i){return (i+1)+". "+e;}).join("<br>"):errs[0])+'</div>'):"")+
    (canAdd?('<div class="quick-action">'+renderInlineEventForm()+'</div>'):"")+
    '<div class="card day-list-card"><h3 class="section-title">Assenze del giorno</h3>'+
    (people.length ? people.map(function(u){return personRow(u,selectedDate,canModifyUserEvents(u.id));}).join("") : '<p class="small">Tutti presenti, nessuna assenza registrata.</p>')+
    '</div></div></div>';
}
function statusOptionsHtml(){
  return '<option value="c01">C01 - Ferie anno attuale</option>'+
    '<option value="c02">C02 - Ferie anno precedente</option>'+
    '<option value="f14">F14 - Festività soppresse</option>'+
    '<option value="smart">SW - Smart working</option>'+
    '<option value="a01">A01 - Malattia</option>'+
    '<option value="altro">ALTRO</option>'+
    '<option value="present">In servizio / rimuovi assenza</option>';
}
function renderInlineEventForm(){
  var people=visibleUsers().filter(function(u){return canModifyUserEvents(u.id);});
  if(currentUser.role==="employee"){
    return '<div class="card insert-card"><h3 class="section-title">Inserisci / modifica</h3><div class="quick-form">'+
      '<select id="eventStatus">'+statusOptionsHtml()+'</select>'+
      '<button class="btn primary" onclick="saveEventFromPopup()">Salva</button></div><p id="eventError" class="error"></p></div>';
  }
  var opts=people.map(function(u){return '<option value="'+u.id+'">'+fullName(u)+' - '+areaName(u.areaId)+'</option>';}).join("");
  return '<div class="card insert-card"><h3 class="section-title">Inserisci / modifica</h3><div class="quick-form manager">'+
    '<select id="eventUser">'+opts+'</select>'+
    '<select id="eventStatus">'+statusOptionsHtml()+'</select>'+
    '<button class="btn primary" onclick="saveEventFromPopup()">Salva</button></div><p id="eventError" class="error"></p></div>';
}
async function saveEventFromPopup(){
  var userEl=document.getElementById("eventUser");
  var userId = userEl ? userEl.value : currentUser.id;
  var st=normalizeEventCode(document.getElementById("eventStatus").value);
  var date=selectedDate;
  var u=db.users.find(function(x){return x.id===userId;});
  var errEl=document.getElementById("eventError");
  if(st==="smart"){
    var v=validateSmartRule(date,userId);
    if(!v.ok){ errEl.textContent=v.message; return; }
  }
  if(isBlockedDay(date)){ errEl.textContent="Non puoi inserire su sabato, domenica o giorno festivo."; return; }
  if(!canModifyUserEvents(userId)){ errEl.textContent="Non puoi modificare questo utente."; return; }
  if(!db.events[date]) db.events[date]={};
  if(st==="present") delete db.events[date][userId];
  else db.events[date][userId]=st;
  refreshRuleViolations(date);
  addAudit(STATUS[st].label+" per "+fullName(u)+" il "+fmt(date));
  pushNotification({text:notificationText(currentUser,u,st,date), scope:"sector", sectorId:u.sectorId, actorId:currentUser.id, type:"event"});
  try{ await writeEventDay(date, db.events[date]); }catch(e){}
  render();
}
async function removeEvent(date,userId){
  if(isBlockedDay(date)||!canModifyUserEvents(userId)) return;
  var u=db.users.find(function(x){return x.id===userId;});
  if(db.events[date]) delete db.events[date][userId];
  refreshRuleViolations(date);
  pushNotification({text:notificationText(currentUser,u,"present",date), scope:"sector", sectorId:u.sectorId, actorId:currentUser.id, type:"event"});
  addAudit("Rimossa assenza di "+fullName(u)+" il "+fmt(date));
  try{ await writeEventDay(date, db.events[date]||{}); }catch(e){}
  render();
}

/* =========================================================
   PROFILO / RICHIESTA PASSWORD
   ========================================================= */
function renderProfile(){
  var u=currentUser;
  var managementLinks="";
  if(canManageUsers()) managementLinks+='<button class="btn secondary full" onclick="nav(\'people\')">👥 Dipendenti</button>';
  if(canRegisterColleagues()) managementLinks+='<button class="btn secondary full" onclick="nav(\'registercolleague\')">➕ Registra collega</button>';
  if(canManageUsers()) managementLinks+='<button class="btn secondary full" onclick="nav(\'admin\')">⚙️ Admin</button>';
  layout(
    '<div class="top"><h1>DATI PERSONALI</h1><span class="pill">'+roleLabel(u.role)+'</span></div>'+
    '<div class="grid two">'+
    '<div class="card"><h3 class="section-title">I miei dati</h3><div class="form-grid">'+
    '<div><label>Nome</label><input id="profileName" value="'+u.name+'"></div>'+
    '<div><label>Cognome</label><input id="profileSurname" value="'+(u.surname||"")+'"></div>'+
    '<div><label>Email</label><input value="'+u.email+'" disabled></div>'+
    '<div><label>Settore</label><input value="'+sectorName(u.sectorId)+'" disabled></div>'+
    '<div><label>Area</label><input value="'+areaName(u.areaId)+'" disabled></div>'+
    '<div><label>Ruolo</label><input value="'+roleLabel(u.role)+'" disabled></div>'+
    '</div><button class="btn primary" onclick="saveProfile()">Salva nome e cognome</button></div>'+
    '<div class="card"><h3 class="section-title">Richiesta cambio password</h3>'+
    '<label>Nuova password richiesta</label><input id="requestedPassword" type="password">'+
    '<button class="btn secondary" onclick="requestPasswordChange()">Invia richiesta</button>'+
    '<p id="profileMsg" class="small"></p></div>'+
    '</div>'+
    (managementLinks ? ('<div class="card"><h3 class="section-title">Gestione</h3>'+managementLinks+'</div>') : "")+
    '<div class="card">'+
    (adminUser?'<button class="btn secondary full" onclick="stopImpersonation()">Torna super admin</button>':'')+
    '<button class="btn danger full" onclick="logout()">Esci</button></div>'
  );
}
async function saveProfile(){
  currentUser.name=document.getElementById("profileName").value.trim();
  currentUser.surname=document.getElementById("profileSurname").value.trim();
  currentUser.initials=createInitialsForUser(currentUser.name,currentUser.surname);
  var u=db.users.find(function(x){return x.id===currentUser.id;});
  Object.assign(u,currentUser);
  addAudit(fullName(currentUser)+" ha aggiornato nome/cognome");
  try{ await writeUser(u); }catch(e){}
  render();
}
async function requestPasswordChange(){
  var pwd=document.getElementById("requestedPassword").value;
  var msgEl=document.getElementById("profileMsg");
  if(!pwd){ msgEl.textContent="Inserisci la nuova password richiesta."; return; }
  var req={id:uid("req"), type:"password", userId:currentUser.id, newPassword:pwd, status:"pending", at:new Date().toLocaleString("it-IT"), createdAt:Date.now()};
  try{
    await writeRequest(req);
    db.requests.unshift(req);
    pushNotification({text:fullName(currentUser)+" ha richiesto cambio password", scope:"admin", actorId:"system", type:"password", sectorId:currentUser.sectorId, areaId:currentUser.areaId});
    msgEl.textContent="Richiesta inviata.";
  }catch(e){
    msgEl.textContent="Errore di connessione, riprova.";
  }
}

/* =========================================================
   REGISTRA COLLEGA
   ========================================================= */
function renderRegisterColleague(){
  var sectors = currentUser.role==="admin" ? db.sectors : db.sectors.filter(function(s){return s.id===currentUser.sectorId;});
  var sectorOpts=sectors.map(function(s){return '<option value="'+s.id+'">'+s.name+'</option>';}).join("");
  layout(
    '<div class="top"><h1>REGISTRA COLLEGA</h1><span class="pill">'+roleLabel(currentUser.role)+'</span></div>'+
    '<div class="card"><div class="form-grid">'+
    '<div><label>Nome</label><input id="colName"></div>'+
    '<div><label>Cognome</label><input id="colSurname"></div>'+
    '<div><label>Email</label><input id="colEmail"></div>'+
    '<div><label>Password provvisoria</label><input id="colPassword" placeholder="Password provvisoria"></div>'+
    '<div><label>Settore</label><select id="colSector" onchange="refreshColAreas()">'+sectorOpts+'</select></div>'+
    '<div><label>Area</label><select id="colArea"></select></div>'+
    '<div><label>C01 ferie anno attuale</label><input id="colC01" type="number" value="0"></div>'+
    '<div><label>C02 ferie anno precedente</label><input id="colC02" type="number" value="0"></div>'+
    '<div><label>F14 festività soppresse residue</label><input id="colF14" type="number" value="0"></div>'+
    '</div><button class="btn primary" onclick="saveColleague()">Registra collega</button><p id="colMsg" class="small"></p></div>'
  );
  refreshColAreas();
}
function refreshColAreas(){
  var sec=document.getElementById("colSector").value;
  var sel=document.getElementById("colArea");
  var areas=areasOfSector(sec);
  if(currentUser.role==="sector_manager") areas=areas.filter(function(a){return (currentUser.editableAreaIds||[]).indexOf(a.id)>=0;});
  sel.innerHTML=areas.map(function(a){return '<option value="'+a.id+'">'+a.name+'</option>';}).join("");
}
async function saveColleague(){
  var name=document.getElementById("colName").value.trim();
  var surname=document.getElementById("colSurname").value.trim();
  var email=document.getElementById("colEmail").value.trim().toLowerCase();
  var password=document.getElementById("colPassword").value||"1234";
  var sectorId=document.getElementById("colSector").value;
  var areaId=document.getElementById("colArea").value;
  var c02=Number(document.getElementById("colC02").value||0);
  var c01=Number(document.getElementById("colC01").value||0);
  var f14=Number(document.getElementById("colF14").value||0);
  var msgEl=document.getElementById("colMsg");
  if(!name||!surname||!email||!areaId){ msgEl.textContent="Compila tutti i dati."; return; }
  if(currentUser.role==="sector_manager" && (currentUser.editableAreaIds||[]).indexOf(areaId)<0){ msgEl.textContent="Non puoi registrare colleghi in questa area."; return; }
  if(db.users.some(function(u){return u.email.toLowerCase()===email;})){ msgEl.textContent="Email già presente."; return; }
  var newUser={id:uid("user"), email:email, password:password, name:name, surname:surname, role:"employee", sectorId:sectorId, areaId:areaId, visibleSectorIds:[sectorId], editableAreaIds:[], c01:c01, c02:c02, f14:f14, approved:true, initials:createInitialsForUser(name,surname), color:"#0ea5e9"};
  try{
    await writeUser(newUser);
    db.users.push(newUser);
    db.lastRead[newUser.id]=Date.now();
    queueMetaWrite();
    addAudit("Registrato collega "+fullName(newUser));
    msgEl.textContent="Collega registrato.";
  }catch(e){
    msgEl.textContent="Errore di connessione, riprova.";
  }
}

/* =========================================================
   DIPENDENTI (gestione utenti)
   ========================================================= */
function usersForAdminPeople(){
  if(currentUser.role!=="admin") return visibleUsers(true);
  return db.users.filter(function(u){
    if(u.role==="admin") return false;
    return (selectedSectorId==="all"||u.sectorId===selectedSectorId) && (selectedAreaFilter==="all"||u.areaId===selectedAreaFilter);
  });
}
function renderPeople(){
  var rows=usersForAdminPeople().map(function(u){
    return '<div class="person clickable" onclick="selectedEmployeeId=\''+u.id+'\';render()">'+
      '<div class="avatar '+avatarClass(u)+'" style="background:'+u.color+'">'+u.initials+'</div>'+
      '<div class="meta"><b class="'+nameClass(u)+'">'+fullName(u)+'</b><small>'+u.email+' · '+sectorName(u.sectorId)+' / '+areaName(u.areaId)+' · '+roleLabel(u.role)+'</small></div>'+
      '<span class="tag '+(u.approved?'approved':'pending')+'">'+(u.approved?'Attivo':'In attesa')+'</span></div>';
  }).join("");
  var detail = selectedEmployeeId ? renderEmployeeDetail(db.users.find(function(u){return u.id===selectedEmployeeId;})) : '<div class="card"><p class="small">Seleziona un utente per modificare i dati consentiti.</p></div>';
  layout(
    '<div class="top"><h1>DIPENDENTI</h1><div>'+selectorControls()+'</div></div>'+
    '<div class="notice">'+(currentUser.role==="admin"?"Super admin: puoi modificare tutto tranne la matricola, che è stata rimossa per privacy.":"Referente: vedi il settore intero, ma modifichi solo le aree abilitate.")+'</div>'+
    '<div class="grid two"><div class="card"><h3 class="section-title">Elenco</h3>'+(rows||"<p class='small'>Nessun utente.</p>")+'</div>'+detail+'</div>'
  );
}
function renderEmployeeDetail(u){
  if(!u) return "";
  var protectedDisabled = !canEditProtectedData() ? "disabled" : "";
  var canEdit=canEditEmployeeData(u.id);
  if(!canEdit) return '<div class="card"><p class="small">Puoi visualizzare questo utente, ma non modificarlo.</p>'+personRow(u,selectedDate,false)+'</div>';
  var sectorOpts=db.sectors.map(function(s){return '<option value="'+s.id+'" '+(u.sectorId===s.id?'selected':'')+'>'+s.name+'</option>';}).join("");
  var extra="";
  if(canEditProtectedData()){
    extra='<label>Aree modificabili se referente</label><div class="check-list">'+
      db.areas.map(function(a){return '<label class="check-row"><input type="checkbox" class="d_edit_area" value="'+a.id+'" '+((u.editableAreaIds||[]).indexOf(a.id)>=0?'checked':'')+'> '+sectorName(a.sectorId)+' / '+a.name+'</label>';}).join("")+
      '</div><label>Settori visibili se dirigente</label><div class="check-list">'+
      db.sectors.map(function(s){return '<label class="check-row"><input type="checkbox" class="d_visible_sector" value="'+s.id+'" '+((u.visibleSectorIds||[]).indexOf(s.id)>=0?'checked':'')+'> '+s.name+'</label>';}).join("")+
      '</div>';
  }
  return '<div class="card"><h3 class="section-title">Scheda utente</h3><div class="form-grid">'+
    '<div><label>Nome</label><input id="d_name" value="'+u.name+'"></div>'+
    '<div><label>Cognome</label><input id="d_surname" value="'+(u.surname||"")+'"></div>'+
    '<div><label>Email</label><input id="d_email" value="'+u.email+'" '+protectedDisabled+'></div>'+
    '<div><label>Password</label><input id="d_password" value="'+u.password+'" '+protectedDisabled+'></div>'+
    '<div><label>Settore</label><select id="d_sector" onchange="refreshDetailAreas()" '+protectedDisabled+'>'+sectorOpts+'</select></div>'+
    '<div><label>Area</label><select id="d_area" '+protectedDisabled+'></select></div>'+
    '<div><label>Ruolo</label><select id="d_role" '+protectedDisabled+'>'+
      '<option value="employee" '+(u.role==="employee"?'selected':'')+'>Dipendente</option>'+
      '<option value="viewer" '+(u.role==="viewer"?'selected':'')+'>Dirigente</option>'+
      '<option value="sector_manager" '+(u.role==="sector_manager"?'selected':'')+'>Referente</option>'+
      '</select></div>'+
    '<div><label>Stato</label><select id="d_approved" '+protectedDisabled+'>'+
      '<option value="true" '+(u.approved?'selected':'')+'>Abilitato</option>'+
      '<option value="false" '+(!u.approved?'selected':'')+'>Non abilitato</option></select></div>'+
    '<div><label>C01 ferie anno attuale</label><input id="d_c01" type="number" value="'+(u.c01||0)+'" '+protectedDisabled+'></div>'+
    '<div><label>C02 ferie anno precedente</label><input id="d_c02" type="number" value="'+(u.c02||0)+'" '+protectedDisabled+'></div>'+
    '<div><label>F14 festività soppresse</label><input id="d_f14" type="number" value="'+(u.f14||0)+'" '+protectedDisabled+'></div>'+
    '</div>'+extra+
    '<div class="actions"><button class="btn primary" onclick="saveEmployeeDetail(\''+u.id+'\')">Salva modifiche</button>'+
    (canEditProtectedData()?('<button class="btn danger" onclick="deleteUser(\''+u.id+'\')">Elimina</button>'):"")+
    '</div></div>';
}
function refreshDetailAreas(){
  var sec=document.getElementById("d_sector").value;
  var area=document.getElementById("d_area");
  var u=db.users.find(function(x){return x.id===selectedEmployeeId;});
  area.innerHTML=areasOfSector(sec).map(function(a){return '<option value="'+a.id+'" '+(u && u.areaId===a.id?'selected':'')+'>'+a.name+'</option>';}).join("");
}
async function saveEmployeeDetail(id){
  var u=db.users.find(function(x){return x.id===id;});
  if(!u||!canEditEmployeeData(id)) return;
  u.name=document.getElementById("d_name").value;
  u.surname=document.getElementById("d_surname").value;
  u.initials=createInitialsForUser(u.name,u.surname);
  if(canEditProtectedData()){
    u.email=document.getElementById("d_email").value;
    u.password=document.getElementById("d_password").value;
    u.sectorId=document.getElementById("d_sector").value;
    u.areaId=document.getElementById("d_area").value;
    u.role=document.getElementById("d_role").value;
    u.approved=document.getElementById("d_approved").value==="true";
    u.c02=Number(document.getElementById("d_c02").value||0);
    u.c01=Number(document.getElementById("d_c01").value||0);
    u.f14=Number(document.getElementById("d_f14").value||0);
    u.editableAreaIds=Array.prototype.slice.call(document.querySelectorAll(".d_edit_area:checked")).map(function(x){return x.value;});
    u.visibleSectorIds=Array.prototype.slice.call(document.querySelectorAll(".d_visible_sector:checked")).map(function(x){return x.value;});
    if(u.role==="employee"){ u.visibleSectorIds=[u.sectorId]; u.editableAreaIds=[]; }
    if(u.role==="sector_manager" && u.editableAreaIds.length===0) u.editableAreaIds=[u.areaId];
    if(u.role==="viewer" && u.visibleSectorIds.length===0) u.visibleSectorIds=[u.sectorId];
    if(u.role==="viewer") u.color="#dc2626";
    if(u.role==="sector_manager") u.color="#7c3aed";
  }
  addAudit("Aggiornata scheda di "+fullName(u));
  try{ await writeUser(u); }catch(e){}
  render();
}
async function deleteUser(id){
  if(!confirm("Eliminare utente?")) return;
  var u=db.users.find(function(x){return x.id===id;});
  db.users=db.users.filter(function(x){return x.id!==id;});
  Object.keys(db.events).forEach(function(d){
    if(db.events[d] && db.events[d][id]!==undefined){
      delete db.events[d][id];
      writeEventDay(d, db.events[d]).catch(function(){});
    }
  });
  addAudit("Eliminato "+fullName(u));
  try{ await deleteUserRemote(id); }catch(e){}
  selectedEmployeeId=null;
  render();
}

/* =========================================================
   REPORT / NOTIFICHE
   ========================================================= */
function userReport(u){
  var r={c01:0,c02:0,f14:0,smart:0,a01:0,altro:0};
  Object.keys(db.events).forEach(function(d){
    if(isBlockedDay(d)) return;
    var st=normalizeEventCode(db.events[d][u.id]);
    if(r[st]!==undefined) r[st]++;
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
  var people = currentUser.role==="employee" ? [currentUser] : visibleUsers();
  var cards=people.map(function(u){
    var r=userReport(u);
    var usedPct = r.totaleDisponibile ? Math.min(100,Math.round((r.ferieUsate/r.totaleDisponibile)*100)) : 0;
    return '<div class="summary-card"><div class="person" style="border-bottom:0;padding-top:0">'+
      '<div class="avatar '+avatarClass(u)+'" style="background:'+u.color+'">'+u.initials+'</div>'+
      '<div class="meta"><b class="'+nameClass(u)+'">'+fullName(u)+'</b><small>'+sectorName(u.sectorId)+' / '+areaName(u.areaId)+'</small></div></div>'+
      '<div class="summary-bar"><span style="width:'+usedPct+'%"></span></div>'+
      '<div class="summary-grid">'+
      '<div><strong>'+r.c01Residue+'</strong><span>C01 residue</span></div>'+
      '<div><strong>'+r.c02Residue+'</strong><span>C02 residue</span></div>'+
      '<div><strong>'+r.f14Residue+'</strong><span>F14 residue</span></div>'+
      '<div><strong>'+r.smart+'</strong><span>SW usati</span></div>'+
      '<div><strong>'+r.a01+'</strong><span>A01 malattia</span></div>'+
      '<div><strong>'+r.altro+'</strong><span>ALTRO</span></div>'+
      '</div><p class="small">Usate: C01 '+r.c01+' · C02 '+r.c02+' · F14 '+r.f14+'. Totale residuo ferie/festività: '+r.ferieResidue+' giorni.</p></div>';
  }).join("");
  layout('<div class="top"><h1>RIEPILOGO</h1><div>'+selectorControls()+'</div></div><div class="summary-wrap">'+cards+'</div>');
}
function renderNotifications(){
  markNotificationsRead();
  var notes=visibleNotifications();
  var list = notes.length ? notes.map(function(n){return '<div class="toast-note"><b>'+n.text+'</b><br><span class="small">'+n.displayAt+'</span></div>';}).join("") : '<p class="small">Nessuna notifica.</p>';
  layout('<div class="top"><h1>NOTIFICHE</h1><span class="pill">'+notes.length+' totali</span></div><div class="card">'+list+'</div>');
}

/* =========================================================
   ADMIN
   ========================================================= */
function renderAdmin(){
  var pending=pendingRegistrations();
  var newUsers=pending.map(function(u){
    return '<div class="person"><div class="avatar '+avatarClass(u)+'" style="background:'+u.color+'">'+u.initials+'</div>'+
      '<div class="meta"><b class="'+nameClass(u)+'">Richiesta registrazione: '+fullName(u)+'</b><small>'+u.email+' · '+sectorName(u.sectorId)+' / '+areaName(u.areaId)+'</small></div>'+
      '<div class="actions"><button class="btn primary" onclick="approveRegistration(\''+u.id+'\')">Approva</button>'+
      '<button class="btn secondary" onclick="page=\'people\';selectedEmployeeId=\''+u.id+'\';selectedSectorId=\''+u.sectorId+'\';selectedAreaFilter=\''+u.areaId+'\';render()">Modifica</button>'+
      '<button class="btn danger" onclick="deleteUser(\''+u.id+'\')">Elimina</button></div></div>';
  }).join("");

  var pwdReqs=db.requests.filter(function(r){return r.status==="pending";}).map(function(r){
    var u=db.users.find(function(x){return x.id===r.userId;});
    if(!u) return "";
    if(r.type==="forgot_password"){
      return '<div class="person"><div class="meta"><b>'+fullName(u)+' ha dimenticato la password</b><small>'+r.at+'</small>'+
        '<input id="reset_'+r.id+'" placeholder="Nuova password"></div>'+
        '<button class="btn primary" onclick="approveForgotPassword(\''+r.id+'\')">Imposta password</button>'+
        '<button class="btn danger" onclick="rejectPasswordRequest(\''+r.id+'\')">Rifiuta</button></div>';
    }
    return '<div class="person"><div class="meta"><b>'+fullName(u)+' richiede cambio password</b><small>'+r.at+'</small></div>'+
      '<button class="btn primary" onclick="approvePasswordRequest(\''+r.id+'\')">Approva</button>'+
      '<button class="btn danger" onclick="rejectPasswordRequest(\''+r.id+'\')">Rifiuta</button></div>';
  }).join("");

  var adminNotes=visibleNotifications().slice(0,10).map(function(n){return '<div class="toast-note"><b>'+n.text+'</b><br><span class="small">'+n.displayAt+'</span></div>';}).join("");
  var audit = db.audit.slice(0,12).map(function(a){return '<div class="person"><div class="meta"><b>'+a.text+'</b><small>'+a.at+' · '+a.by+'</small></div></div>';}).join("") || '<p class="small">Nessuna modifica.</p>';

  layout(
    '<div class="top"><h1>ADMIN</h1><span class="pill">'+pendingAdminCount()+' richieste</span></div>'+
    '<div class="grid two">'+
    '<div class="card"><h3 class="section-title">Registrazioni da approvare</h3>'+(newUsers||'<p class="small">Nessuna registrazione in attesa.</p>')+'</div>'+
    '<div class="card"><h3 class="section-title">Password e notifiche</h3>'+pwdReqs+(adminNotes||'<p class="small">Nessuna richiesta password o notifica.</p>')+'</div>'+
    '</div>'+
    renderSwitchUserPanel()+
    renderSectorAdminPanel()+
    '<div class="card"><h3 class="section-title">Backup dati</h3><div class="actions"><button class="btn primary" onclick="exportData()">Esporta backup JSON</button></div><p class="small">Esegui un backup periodico per sicurezza.</p></div>'+
    '<div class="card"><h3 class="section-title">Storico</h3>'+audit+'</div>'
  );
}
function slugifyId(text){
  return (text||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || uid("settore");
}
function renderSectorAdminPanel(){
  if(currentUser.role!=="admin") return "";
  var sectors=db.sectors.map(function(s){
    var areas=areasOfSector(s.id).map(function(a){return '<span class="tag smart">'+a.name+'</span>';}).join(" ");
    return '<div class="person"><div class="meta"><b>'+s.name+'</b><small>'+(areas||"Nessuna area")+'</small></div>'+
      '<div class="actions"><input id="area_'+s.id+'" placeholder="Nuova area"><button class="btn secondary" onclick="addAreaToSector(\''+s.id+'\')">Aggiungi area</button></div></div>';
  }).join("");
  return '<div class="card"><h3 class="section-title">Settori e aree</h3>'+sectors+
    '<div class="form-grid"><div><label>Nuovo settore</label><input id="newSectorName" placeholder="Es. Settore 5"></div>'+
    '<div><label>Prima area opzionale</label><input id="newSectorArea" placeholder="Es. Area unica"></div></div>'+
    '<button class="btn primary" onclick="addSector()">Crea settore</button>'+
    '<p class="small">Dopo la creazione compare in registrazione, ruoli e piano ferie.</p></div>';
}
async function addSector(){
  var name=document.getElementById("newSectorName").value.trim();
  var areaNameValue=document.getElementById("newSectorArea").value.trim();
  if(!name){ alert("Inserisci il nome del settore."); return; }
  var id=slugifyId(name), base=id, n=2;
  while(db.sectors.some(function(s){return s.id===id;})) id=base+"-"+(n++);
  var sector={id:id, name:name, hasAreas: !!areaNameValue};
  db.sectors.push(sector);
  try{ await writeSector(sector); }catch(e){}
  if(areaNameValue){
    var area={id:slugifyId(id+"-"+areaNameValue), sectorId:id, name:areaNameValue, color:"#64748b"};
    db.areas.push(area);
    try{ await writeArea(area); }catch(e){}
  }
  addAudit("Creato settore "+name);
  render();
}
async function addAreaToSector(sectorId){
  var input=document.getElementById("area_"+sectorId);
  var name=input.value.trim();
  if(!name){ alert("Inserisci il nome dell'area."); return; }
  var id=slugifyId(sectorId+"-"+name), base=id, n=2;
  while(db.areas.some(function(a){return a.id===id;})) id=base+"-"+(n++);
  var area={id:id, sectorId:sectorId, name:name, color:"#64748b"};
  db.areas.push(area);
  var s=db.sectors.find(function(x){return x.id===sectorId;});
  if(s && !s.hasAreas){ s.hasAreas=true; try{ await writeSector(s); }catch(e){} }
  try{ await writeArea(area); }catch(e){}
  addAudit("Creata area "+name+" in "+sectorName(sectorId));
  render();
}
async function approveRegistration(userId){
  var u=db.users.find(function(x){return x.id===userId;});
  if(!u) return;
  u.approved=true;
  if(!u.visibleSectorIds||!u.visibleSectorIds.length) u.visibleSectorIds=[u.sectorId];
  if(!u.editableAreaIds) u.editableAreaIds=[];
  db.lastRead[u.id]=Date.now();
  queueMetaWrite();
  addAudit("Approvata registrazione di "+fullName(u));
  try{ await writeUser(u); }catch(e){}
  render();
}
async function approvePasswordRequest(id){
  var r=db.requests.find(function(x){return x.id===id;});
  var u=r && db.users.find(function(x){return x.id===r.userId;});
  if(!r||!u) return;
  u.password=r.newPassword;
  r.status="approved";
  addAudit("Approvato cambio password per "+fullName(u));
  try{ await writeUser(u); await writeRequest(r); }catch(e){}
  render();
}
async function approveForgotPassword(id){
  var r=db.requests.find(function(x){return x.id===id;});
  var u=r && db.users.find(function(x){return x.id===r.userId;});
  if(!r||!u) return;
  var input=document.getElementById("reset_"+id);
  var pwd=(input && input.value.trim()) || "1234";
  u.password=pwd;
  r.status="approved";
  addAudit("Reset password per "+fullName(u));
  try{ await writeUser(u); await writeRequest(r); }catch(e){}
  render();
}
async function rejectPasswordRequest(id){
  var r=db.requests.find(function(x){return x.id===id;});
  if(!r) return;
  r.status="rejected";
  addAudit("Rifiutata richiesta password");
  try{ await writeRequest(r); }catch(e){}
  render();
}
function exportData(){
  var blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"});
  var a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="gestione-personale-backup-"+new Date().toISOString().slice(0,10)+".json";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* =========================================================
   PIANO FERIE
   ========================================================= */
function openPlanDayFromCard(el){
  if(!el) return;
  openPlanDay(el.getAttribute("data-date"), el.getAttribute("data-sector"), el.getAttribute("data-area"));
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
  if(!planModalOpen || !selectedPlanDate) return "";
  var sectorId=selectedPlanSectorId || selectedSectorId || currentUser.sectorId;
  var areaId=selectedPlanAreaForModal || selectedPlanArea || "all";
  var people=planPeople(sectorId,areaId).sort(sortByName);
  var holidays=people.filter(function(u){return isFerieCode(eventFor(selectedPlanDate,u.id));}).sort(sortByName);
  var present=people.filter(function(u){return !isFerieCode(eventFor(selectedPlanDate,u.id));}).sort(sortByName);
  return '<div class="modal-backdrop plan-day-backdrop" onclick="if(event.target.classList.contains(\'plan-day-backdrop\'))closePlanDay()">'+
    '<div class="modal ios-sheet"><div class="modal-grabber"></div>'+
    '<div class="modal-head"><div><h2>'+fmt(selectedPlanDate)+'</h2><p class="small">Piano ferie - '+(areaId==="all"?sectorName(sectorId):areaName(areaId))+'</p></div>'+
    '<button class="close" onclick="closePlanDay()">Chiudi</button></div>'+
    '<div class="card day-list-card"><h3 class="section-title">In ferie</h3>'+(holidays.length?holidays.map(function(u){return personRow(u,selectedPlanDate,false);}).join(""):'<p class="small">Nessuno in ferie.</p>')+'</div>'+
    '<div class="card day-list-card"><h3 class="section-title">In servizio</h3>'+(present.length?present.map(function(u){return personRow(u,selectedPlanDate,false);}).join(""):'<p class="small">Nessuno in servizio.</p>')+'</div>'+
    '</div></div>';
}
function planSectorSelect(){
  if(currentUser.role!=="admin") return "";
  var opts=db.sectors.map(function(s){return '<option value="'+s.id+'" '+(selectedSectorId===s.id?'selected':'')+'>'+s.name+'</option>';}).join("");
  return '<select onchange="selectedSectorId=this.value;selectedPlanArea=\'all\';render()">'+opts+'</select>';
}
function planPrintAreaLabel(sectorId,areaId){ return areaId==="all" ? sectorName(sectorId).toUpperCase() : areaName(areaId).toUpperCase(); }
function renderPlan(){
  var periods=planPeriods();
  var months=periods[selectedPlanPeriod]||periods.estate;
  var sectorId = currentUser.role==="admin" ? selectedSectorId : currentUser.sectorId;
  if(!sectorId||sectorId==="all"||sectorId==="*") sectorId="prevenzione";
  var areas=areasOfSector(sectorId);
  if(!areas.length) areas=[{id:sectorId,sectorId:sectorId,name:sectorName(sectorId),color:"#64748b"}];
  if(!selectedPlanArea) selectedPlanArea="all";
  var areaOptions='<option value="all" '+(selectedPlanArea==="all"?'selected':'')+'>'+sectorName(sectorId)+'</option>'+
    areas.map(function(a){return '<option value="'+a.id+'" '+(selectedPlanArea===a.id?'selected':'')+'>SOLO '+a.name+'</option>';}).join("");
  var settoreStampa = (sectorId==="prevenzione" && selectedPlanArea==="all") ? "SETTORE PREVENZIONE (PREV + VET)" : ("SETTORE "+sectorName(sectorId).toUpperCase());
  var printTitle="PIANO FERIE - "+settoreStampa+" - "+planPrintAreaLabel(sectorId,selectedPlanArea);
  var content=months.map(function(m){return renderPlanMonthLayout(m,sectorId,selectedPlanArea);}).join("");
  var modal = planModalOpen ? renderPlanDayModal() : "";
  layout(
    '<div class="plan-shell"><div class="plan-top no-print"><h1>PIANO FERIE</h1><div class="plan-controls">'+
    planSectorSelect()+
    '<label>VISUALIZZAZIONE:</label><select onchange="selectedPlanArea=this.value;render()">'+areaOptions+'</select>'+
    '<select onchange="selectedPlanPeriod=this.value;loadEventsForPlanPeriod();render()">'+
    '<option value="estate" '+(selectedPlanPeriod==="estate"?'selected':'')+'>Estate: giugno-settembre</option>'+
    '<option value="natale" '+(selectedPlanPeriod==="natale"?'selected':'')+'>Natale: dicembre-gennaio</option>'+
    '<option value="pasqua" '+(selectedPlanPeriod==="pasqua"?'selected':'')+'>Settimana di Pasqua</option>'+
    '</select><button class="btn primary print-btn" onclick="window.print()">ESPORTA PDF</button></div></div>'+
    '<div class="print-title">'+printTitle+'</div><div class="plan-blue-line no-print"></div>'+
    '<div class="print-area">'+content+'</div>'+
    '<div class="plan-legend no-print"><div><b>LEGENDA PERCENTUALI</b></div>'+
    '<span><i style="background:#22c55e"></i>0%</span>'+
    '<span><i style="background:#84cc16"></i>1%-20%</span>'+
    '<span><i style="background:#facc15"></i>21%-50%</span>'+
    '<span><i style="background:#f97316"></i>51%-80%</span>'+
    '<span><i style="background:#ef4444"></i>81%-100%</span>'+
    '<span class="legend-area"><i style="background:#2563eb"></i>Prevenzione</span>'+
    '<span class="legend-area"><i style="background:#dc2626"></i>Veterinaria</span>'+
    '</div></div>'+modal
  );
}
function planPeople(sectorId,areaId){
  return db.users.filter(function(u){return u.approved && isWorker(u) && u.sectorId===sectorId && (areaId==="all"||u.areaId===areaId);});
}
function pctColor(pct){
  if(pct<=0) return "#fff";
  if(pct<=20) return "#86efac";
  if(pct<=50) return "#fde047";
  if(pct<=80) return "#fb923c";
  return "#f87171";
}
function monthLabel(month){
  var parts=month.split("-").map(Number);
  return new Date(parts[0],parts[1]-1,1).toLocaleDateString("it-IT",{month:"long",year:"numeric"}).replace(/^./,function(c){return c.toUpperCase();});
}
function workingDaysOfMonth(month){
  var parts=month.split("-").map(Number), y=parts[0], m=parts[1];
  var days=new Date(y,m,0).getDate(), out=[];
  for(var d=1;d<=days;d++){
    var date=y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    if(!isWeekend(date)) out.push({date:date, day:d});
  }
  return out;
}
function renderPlanMonthLayout(month,sectorId,areaId){
  var title=monthLabel(month);
  var label = areaId==="all" ? (sectorName(sectorId)+" - Insieme") : areaName(areaId);
  return '<div class="plan-month-card"><h2>'+title+'</h2><h3 class="area-title blue">'+label+'</h3>'+renderPlanGrid(month,sectorId,areaId)+'</div>';
}
function renderPlanGrid(month,sectorId,areaId){
  var people=planPeople(sectorId,areaId);
  var total=people.length||1;
  return '<div class="plan-grid">'+workingDaysOfMonth(month).map(function(item){
    var date=item.date, day=item.day;
    var onHoliday=people.filter(function(u){return isFerieCode(eventFor(date,u.id));}).sort(sortByName);
    var pct=Math.round((onHoliday.length/total)*100);
    var fill = pct ? ('<div class="plan-fill" style="width:'+pct+'%;background:'+pctColor(pct)+'"></div>') : "";
    var names="";
    if(areaId==="all"){
      var areaOrder=areasOfSector(sectorId).map(function(a){return a.id;});
      names=areaOrder.map(function(aid){
        var group=onHoliday.filter(function(u){return u.areaId===aid;}).sort(sortByName);
        return group.map(function(u){return '<div class="plan-person" style="color:'+areaColor(u.areaId)+'">'+shortPersonName(u)+'</div>';}).join("");
      }).join("");
    }else{
      names=onHoliday.map(function(u){return '<div class="plan-person" style="color:'+areaColor(u.areaId)+'">'+shortPersonName(u)+'</div>';}).join("");
    }
    return '<div role="button" tabindex="0" class="plan-card-white plan-clickable" data-date="'+date+'" data-sector="'+sectorId+'" data-area="'+areaId+'">'+
      '<div class="plan-fill-wrap">'+fill+'</div><div class="plan-day-num">'+day+'</div><div class="plan-names">'+names+'</div>'+
      (pct?('<div class="plan-percent">'+pct+'%</div>'):"")+'</div>';
  }).join("")+'</div>';
}

/* =========================================================
   RENDER PRINCIPALE / AVVIO
   ========================================================= */
function render(){
  if(!currentUser) return renderLogin();
  if(page==="calendar") return renderCalendar();
  if(page==="plan") return renderPlan();
  if(page==="profile") return renderProfile();
  if(page==="notifications") return renderNotifications();
  if(page==="people") return renderPeople();
  if(page==="registercolleague") return renderRegisterColleague();
  if(page==="reports") return renderReports();
  if(page==="admin") return renderAdmin();
}

function handlePlanCardActivation(target){
  var card = target.closest ? target.closest(".plan-clickable") : null;
  if(!card) return false;
  openPlanDay(card.dataset.date, card.dataset.sector, card.dataset.area);
  return true;
}
document.addEventListener("click", function(e){
  if(handlePlanCardActivation(e.target)){ e.preventDefault(); e.stopPropagation(); }
}, true);
document.addEventListener("touchend", function(e){
  if(handlePlanCardActivation(e.target)){ e.preventDefault(); e.stopPropagation(); }
}, {capture:true, passive:false});
document.addEventListener("keydown", function(e){
  var card = e.target.closest ? e.target.closest(".plan-clickable") : null;
  if(card && (e.key==="Enter" || e.key===" ")){
    e.preventDefault();
    openPlanDay(card.dataset.date, card.dataset.sector, card.dataset.area);
  }
}, true);

/* ---------- Avvio ---------- */
loadLocalCache();
initFirebaseSync();
if(restoreSession()) render(); else renderLogin();
