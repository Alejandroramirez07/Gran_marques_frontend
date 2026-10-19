const state = {
  user: null,
  currentRoute: 'dashboard',
  rooms: [
    {id:101,type:'Sencilla',status:'Disponible',rate:120000,floor:1,view:'Interior'},
    {id:102,type:'Doble',status:'Ocupada',rate:180000,floor:1,view:'Ciudad'},
    {id:103,type:'Suite',status:'Disponible',rate:250000,floor:1,view:'Ciudad'},
    {id:104,type:'Sencilla',status:'Mantenimiento',rate:120000,floor:1,view:'Interior'},
    {id:201,type:'Doble',status:'Disponible',rate:180000,floor:2,view:'Piscina'},
    {id:202,type:'Doble',status:'Disponible',rate:180000,floor:2,view:'Ciudad'},
    {id:203,type:'Suite',status:'Ocupada',rate:250000,floor:2,view:'Piscina'},
    {id:204,type:'Sencilla',status:'Disponible',rate:120000,floor:2,view:'Interior'}
  ],
  reservations: [
    {id:'RS-001',guest:'María Fernanda López',room:103,start:'2026-10-03',end:'2026-10-06',guests:2,status:'Confirmada',total:750000},
    {id:'RS-002',guest:'Carlos Andrés Gómez',room:201,start:'2026-10-03',end:'2026-10-05',guests:2,status:'Pendiente',total:360000},
    {id:'RS-003',guest:'Laura Sánchez',room:102,start:'2026-10-04',end:'2026-10-07',guests:1,status:'Confirmada',total:540000}
  ],
  services: [
    {id:'SV-01',name:'Restaurante',desc:'Consumo de alimentos y bebidas',price:45000,icon:'🍽️'},
    {id:'SV-02',name:'Spa',desc:'Masaje relajante y bienestar',price:90000,icon:'🧖'},
    {id:'SV-03',name:'Lavandería',desc:'Servicio de lavado y planchado',price:30000,icon:'🧺'},
    {id:'SV-04',name:'Room Service',desc:'Servicio de alimentos en habitación',price:55000,icon:'🛎️'}
  ],
  invoices: [
    {id:'FAC-0001',guest:'Miguel López Gómez',room:101,nights:3,lodging:360000,services:80000,total:440000,payment:'Tarjeta',status:'Pagada'},
    {id:'FAC-0002',guest:'María Fernanda López',room:103,nights:1,lodging:250000,services:45000,total:295000,payment:'Pendiente',status:'Pendiente'}
  ],
  maintenance: [
    {id:'MT-01',room:'Habitación 104',area:'Habitación',issue:'Aire acondicionado',priority:'Alta',status:'Abierto'},
    {id:'MT-02',room:'Habitación 203',area:'Habitación',issue:'Televisor sin señal',priority:'Media',status:'En proceso'},
    {id:'MT-03',room:'Piscina',area:'Área social',issue:'Limpieza profunda',priority:'Baja',status:'Programado'}
  ]
};

const titles = {
  dashboard:['Inicio','Panel de control'], reservas:['Reservas','Gestión de reservas'], habitaciones:['Habitaciones','Disponibilidad y tarifas'], servicios:['Servicios','Servicios adicionales'], facturacion:['Facturación','Facturación y pagos'], reportes:['Reportes','Indicadores gerenciales'], mantenimiento:['Mantenimiento','Alertas y mantenimiento'], configuracion:['Configuración','Preferencias del sistema']
};

const $ = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
const money = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
const escapeHtml = s => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));

function showToast(msg){
  const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(showToast._t); showToast._t=setTimeout(()=>t.classList.remove('show'),2800);
}
function statusClass(s){
  const map={Disponible:'available',Confirmada:'confirmed',Pagada:'paid','En proceso':'medium',Programado:'low',Pendiente:'pending',Ocupada:'occupied',Mantenimiento:'high',Cancelada:'cancelled',Abierto:'high'};
  return map[s]||'pending';
}
function persist(){
  localStorage.setItem('gm_rooms',JSON.stringify(state.rooms));
  localStorage.setItem('gm_reservations',JSON.stringify(state.reservations));
  localStorage.setItem('gm_invoices',JSON.stringify(state.invoices));
  localStorage.setItem('gm_maintenance',JSON.stringify(state.maintenance));
}
function hydrate(){
  ['rooms','reservations','invoices','maintenance'].forEach(k=>{const raw=localStorage.getItem('gm_'+k); if(raw){try{state[k]=JSON.parse(raw)}catch{}}});
}
function setUser(user){
  // Conserva el perfil para actualizar la interfaz y el token que devuelve la API.
  state.user=user; localStorage.setItem('gm_user',JSON.stringify(user)); updateUserUI(); $('#loginView').classList.add('hidden'); $('#appView').classList.remove('hidden'); navigate('dashboard');
}
function updateUserUI(){
  if(!state.user)return;
  $('#userName').textContent=state.user.name; $('#userRole').textContent=state.user.role; $('#avatar').textContent=state.user.initials;
}
function logout(){
  state.user=null; localStorage.removeItem('gm_user'); localStorage.removeItem('gm_token'); $('#appView').classList.add('hidden'); $('#loginView').classList.remove('hidden'); $('#loginForm').reset(); showToast('Sesión cerrada correctamente.');
}

function layoutPage(content){ $('#pageContent').innerHTML=content; bindPageActions(); }
function navigate(route){
  state.currentRoute=route;
  $$('.nav-item[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===route));
  $('#breadcrumb').textContent=titles[route]?.[0]||'Hotel Gran Marques'; $('#pageTitle').textContent=titles[route]?.[1]||'Sistema';
  const pages={dashboard:renderDashboard,reservas:renderReservations,habitaciones:renderRooms,servicios:renderServices,facturacion:renderBilling,reportes:renderReports,mantenimiento:renderMaintenance,configuracion:renderSettings};
  layoutPage((pages[route]||renderDashboard)());
  $('#sidebar').classList.remove('open'); window.scrollTo({top:0,behavior:'smooth'});
}

function renderDashboard(){
  const today=new Date().toISOString().slice(0,10);
  const pending=state.reservations.filter(r=>r.status==='Pendiente').length;
  const occupied=state.rooms.filter(r=>r.status==='Ocupada').length;
  const available=state.rooms.filter(r=>r.status==='Disponible').length;
  const checkouts=state.reservations.filter(r=>r.end===today).length;
  return `
  <div class="page-header"><div><span class="eyebrow">Operación del día</span><h2>Buenos días, ${escapeHtml(state.user?.name||'equipo')}.</h2><p>Resumen operativo del Hotel Gran Marques.</p></div><div class="header-actions"><button class="btn secondary" data-route-go="reportes">Ver reportes</button><button class="btn primary" data-action="new-reservation">+ Nueva reserva</button></div></div>
  <div class="grid grid-4">
    <div class="card kpi"><span class="label">Habitaciones disponibles</span><span class="value">${available}</span><span class="meta positive">de ${state.rooms.length} habitaciones</span></div>
    <div class="card kpi"><span class="label">Reservas confirmadas</span><span class="value">${state.reservations.filter(r=>r.status==='Confirmada').length}</span><span class="meta">${pending} pendientes</span></div>
    <div class="card kpi"><span class="label">Check-out hoy</span><span class="value">${checkouts}</span><span class="meta">Revisar salidas</span></div>
    <div class="card kpi"><span class="label">Ocupación</span><span class="value">${Math.round((occupied/state.rooms.length)*100)}%</span><span class="meta">${occupied} habitaciones ocupadas</span></div>
  </div>
  <div style="height:18px"></div>
  <div class="grid dashboard-grid">
    <div class="grid" style="gap:18px">
      <div class="card"><div class="card-header"><div><h3>Accesos rápidos</h3><p>Funciones principales de recepción</p></div></div><div class="card-body"><div class="quick-actions">
        <button class="quick-action" data-route-go="reservas"><strong>▣ Reservas</strong><span>Crear y consultar reservas</span></button>
        <button class="quick-action" data-route-go="habitaciones"><strong>▤ Habitaciones</strong><span>Disponibilidad y tarifas</span></button>
        <button class="quick-action" data-route-go="facturacion"><strong>$ Facturación</strong><span>Registrar pagos</span></button>
        <button class="quick-action" data-route-go="mantenimiento"><strong>⚙ Mantenimiento</strong><span>Alertas pendientes</span></button>
      </div></div></div>
      <div class="card"><div class="card-header"><div><h3>Reservas próximas</h3><p>Ingresos programados</p></div><button class="link-button" data-route-go="reservas">Ver todas</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Reserva</th><th>Huésped</th><th>Habitación</th><th>Entrada</th><th>Estado</th></tr></thead><tbody>${state.reservations.map(r=>`<tr><td><strong>${r.id}</strong></td><td>${escapeHtml(r.guest)}</td><td>${r.room}</td><td>${r.start}</td><td><span class="status ${statusClass(r.status)}">${r.status}</span></td></tr>`).join('')}</tbody></table></div></div>
    </div>
    <div class="grid" style="gap:18px">
      <div class="card"><div class="card-header"><div><h3>Estado de habitaciones</h3><p>Vista rápida</p></div></div><div class="card-body"><div class="room-status-grid">${state.rooms.slice(0,8).map(r=>`<div class="room-pill"><strong>${r.id}</strong><span class="status ${statusClass(r.status)}">${r.status}</span></div>`).join('')}</div></div></div>
      <div class="card"><div class="card-header"><div><h3>Alertas</h3><p>Mantenimiento</p></div><button class="link-button" data-route-go="mantenimiento">Gestionar</button></div><div class="card-body"><div class="summary-list">${state.maintenance.slice(0,4).map(m=>`<div class="summary-row"><span>${escapeHtml(m.room)}</span><strong class="status ${statusClass(m.priority)}">${m.priority}</strong></div>`).join('')}</div></div></div>
    </div>
  </div>`;
}

function renderReservations(){
  return `
  <div class="page-header"><div><span class="eyebrow">RF-02</span><h2>Reservas</h2><p>Gestiona huéspedes, habitaciones, fechas y estados de reserva.</p></div><button class="btn primary" data-action="new-reservation">+ Nueva reserva</button></div>
  <div class="card"><div class="card-body"><div class="search-row"><div class="field"><span>Buscar huésped o código</span><input id="reservationSearch" type="search" placeholder="Ej. María o RS-001"></div><div class="field" style="max-width:180px"><span>Estado</span><select id="reservationStatus"><option value="">Todos</option><option>Confirmada</option><option>Pendiente</option><option>Cancelada</option></select></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Reserva</th><th>Huésped</th><th>Habitación</th><th>Estancia</th><th>Huéspedes</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody id="reservationsBody"></tbody></table></div></div></div>`;
}
function refreshReservationsTable(){
  const body=$('#reservationsBody'); if(!body)return;
  const q=($('#reservationSearch')?.value||'').toLowerCase(); const status=$('#reservationStatus')?.value||'';
  const rows=state.reservations.filter(r=>(!q||(`${r.id} ${r.guest}`).toLowerCase().includes(q))&&(!status||r.status===status));
  body.innerHTML=rows.length?rows.map(r=>`<tr><td><strong>${r.id}</strong></td><td>${escapeHtml(r.guest)}</td><td>${r.room}</td><td>${r.start} → ${r.end}</td><td>${r.guests}</td><td>${money(r.total)}</td><td><span class="status ${statusClass(r.status)}">${r.status}</span></td><td><div class="table-actions"><button class="icon-action" data-action="view-reservation" data-id="${r.id}" title="Ver">↗</button><button class="icon-action" data-action="cancel-reservation" data-id="${r.id}" title="Cancelar">×</button></div></td></tr>`).join(''):`<tr><td colspan="8" class="empty">No se encontraron reservas.</td></tr>`;
}

function renderRooms(){
  return `
  <div class="page-header"><div><span class="eyebrow">RF-04</span><h2>Habitaciones</h2><p>Consulta disponibilidad, tipo, tarifa y estado operativo.</p></div><button class="btn secondary" data-action="new-room">+ Agregar habitación</button></div>
  <div class="notice">La disponibilidad se actualiza automáticamente cuando una reserva se confirma o cuando se marca una habitación en mantenimiento.</div>
  <div class="room-grid">${state.rooms.map(r=>`<article class="room-card"><div class="room-card-top"><div><div class="room-number">${r.id}</div><div class="room-meta"><span>${r.type} · Piso ${r.floor}</span><span>Vista ${r.view}</span></div></div><span class="status ${statusClass(r.status)}">${r.status}</span></div><div class="room-price">${money(r.rate)} <small style="font-size:10px;font-weight:700;color:var(--muted)">/ noche</small></div><div class="room-actions"><button class="btn secondary" data-action="edit-room" data-id="${r.id}">Editar</button><button class="btn primary" data-action="reserve-room" data-id="${r.id}" ${r.status!=='Disponible'?'disabled':''}>Reservar</button></div></article>`).join('')}</div>`;
}

function renderServices(){
  return `
  <div class="page-header"><div><span class="eyebrow">RF-06</span><h2>Servicios adicionales</h2><p>Agrega consumos a una reserva activa y controla el valor cobrado.</p></div><button class="btn primary" data-action="new-service">+ Nuevo servicio</button></div>
  <div class="grid grid-2">${state.services.map(s=>`<div class="card"><div class="card-body" style="display:flex;justify-content:space-between;align-items:center;gap:16px"><div style="display:flex;gap:14px;align-items:center"><div style="width:48px;height:48px;border-radius:12px;background:var(--gold-soft);display:grid;place-items:center;font-size:22px">${s.icon}</div><div><h3 style="margin:0 0 4px;color:var(--navy)">${escapeHtml(s.name)}</h3><p style="margin:0;color:var(--muted);font-size:12px">${escapeHtml(s.desc)}</p></div></div><div style="text-align:right"><strong style="display:block;color:var(--navy)">${money(s.price)}</strong><button class="btn secondary" style="margin-top:8px" data-action="add-service" data-id="${s.id}">Agregar</button></div></div></div>`).join('')}</div>
  <div style="height:18px"></div><div class="card"><div class="card-header"><div><h3>Consumos recientes</h3><p>Últimos servicios cargados</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Reserva</th><th>Servicio</th><th>Cantidad</th><th>Valor</th><th>Estado</th></tr></thead><tbody><tr><td>RS-001</td><td>Restaurante</td><td>1</td><td>${money(45000)}</td><td><span class="status paid">Cargado</span></td></tr><tr><td>RS-003</td><td>Lavandería</td><td>2</td><td>${money(60000)}</td><td><span class="status paid">Cargado</span></td></tr></tbody></table></div></div>`;
}

function renderBilling(){
  const total=state.invoices.reduce((a,b)=>a+b.total,0), paid=state.invoices.filter(x=>x.status==='Pagada').reduce((a,b)=>a+b.total,0);
  return `
  <div class="page-header"><div><span class="eyebrow">RF-05</span><h2>Facturación y pagos</h2><p>Consulta facturas, registra pagos y controla saldos.</p></div><button class="btn primary" data-action="new-invoice">+ Generar factura</button></div>
  <div class="grid grid-3"><div class="card kpi"><span class="label">Facturación registrada</span><span class="value">${money(total)}</span><span class="meta">${state.invoices.length} facturas</span></div><div class="card kpi"><span class="label">Pagado</span><span class="value">${money(paid)}</span><span class="meta positive">Recaudo confirmado</span></div><div class="card kpi"><span class="label">Pendiente</span><span class="value">${money(total-paid)}</span><span class="meta">Por cobrar</span></div></div>
  <div style="height:18px"></div><div class="card"><div class="card-header"><div><h3>Facturas recientes</h3><p>Historial de facturación del hotel</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Factura</th><th>Huésped</th><th>Habitación</th><th>Alojamiento</th><th>Servicios</th><th>Total</th><th>Pago</th><th>Estado</th><th></th></tr></thead><tbody>${state.invoices.map(f=>`<tr><td><strong>${f.id}</strong></td><td>${escapeHtml(f.guest)}</td><td>${f.room}</td><td>${money(f.lodging)}</td><td>${money(f.services)}</td><td><strong>${money(f.total)}</strong></td><td>${f.payment}</td><td><span class="status ${statusClass(f.status)}">${f.status}</span></td><td><button class="icon-action" data-action="pay-invoice" data-id="${f.id}" title="Registrar pago">$</button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function renderReports(){
  const data=[38,52,46,68,60,78,72]; const labels=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  return `
  <div class="page-header"><div><span class="eyebrow">RF-07</span><h2>Reportes</h2><p>Indicadores de ocupación y resultados para la gerencia.</p></div><button class="btn secondary" data-action="export-report">⇩ Exportar reporte</button></div>
  <div class="grid grid-3"><div class="card kpi"><span class="label">Ocupación promedio</span><span class="value">62%</span><span class="meta positive">+8% vs. semana anterior</span></div><div class="card kpi"><span class="label">Ingresos de la semana</span><span class="value">$4,8M</span><span class="meta positive">+12,4%</span></div><div class="card kpi"><span class="label">Estancia promedio</span><span class="value">2,7</span><span class="meta">Noches por reserva</span></div></div>
  <div style="height:18px"></div><div class="grid grid-2"><div class="card"><div class="card-header"><div><h3>Ocupación semanal</h3><p>Porcentaje de habitaciones ocupadas</p></div></div><div class="chart">${data.map((v,i)=>`<div class="bar-wrap"><span class="bar-value">${v}%</span><div class="bar" style="height:${v*1.9}px"></div><span class="bar-label">${labels[i]}</span></div>`).join('')}</div></div><div class="card"><div class="card-header"><div><h3>Distribución por tipo</h3><p>Ocupación actual</p></div></div><div class="card-body"><div class="summary-list"><div class="summary-row"><span>Sencilla</span><strong>58%</strong></div><div class="summary-row"><span>Doble</span><strong>67%</strong></div><div class="summary-row"><span>Suite</span><strong>50%</strong></div><div class="summary-row"><span>Habitaciones disponibles</span><strong>${state.rooms.filter(r=>r.status==='Disponible').length}</strong></div></div></div></div></div>`;
}

function renderMaintenance(){
  return `
  <div class="page-header"><div><span class="eyebrow">Operación interna</span><h2>Mantenimiento</h2><p>Gestiona alertas relacionadas con habitaciones y áreas sociales.</p></div><button class="btn primary" data-action="new-maintenance">+ Nueva alerta</button></div>
  <div class="card"><div class="card-header"><div><h3>Alertas activas</h3><p>Prioridad y seguimiento de cada incidencia</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Alerta</th><th>Ubicación</th><th>Detalle</th><th>Prioridad</th><th>Estado</th><th></th></tr></thead><tbody>${state.maintenance.map(m=>`<tr><td><strong>${m.id}</strong></td><td>${escapeHtml(m.room)}<br><small style="color:var(--muted)">${escapeHtml(m.area)}</small></td><td>${escapeHtml(m.issue)}</td><td><span class="status ${statusClass(m.priority)}">${m.priority}</span></td><td><span class="status ${statusClass(m.status)}">${m.status}</span></td><td><button class="icon-action" data-action="update-maintenance" data-id="${m.id}">✓</button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function renderSettings(){
  return `
  <div class="page-header"><div><span class="eyebrow">Administración</span><h2>Configuración</h2><p>Preferencias de la aplicación y perfil del usuario.</p></div></div>
  <div class="grid grid-2"><div class="card"><div class="card-header"><div><h3>Preferencias</h3><p>Comportamiento de la interfaz</p></div></div><div class="card-body settings"><div class="setting-row"><div><strong>Notificaciones</strong><p>Recibir alertas de reservas y mantenimiento.</p></div><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div><div class="setting-row"><div><strong>Confirmar antes de cancelar</strong><p>Solicitar confirmación en acciones críticas.</p></div><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div><div class="setting-row"><div><strong>Modo compacto</strong><p>Reducir espaciado en tablas y tarjetas.</p></div><label class="switch"><input type="checkbox"><span class="slider"></span></label></div></div></div>
  <div class="card"><div class="card-header"><div><h3>Perfil actual</h3><p>Cuenta utilizada en esta sesión</p></div></div><div class="card-body"><div class="summary-list"><div class="summary-row"><span>Nombre</span><strong>${escapeHtml(state.user?.name||'')}</strong></div><div class="summary-row"><span>Rol</span><strong>${escapeHtml(state.user?.role||'')}</strong></div><div class="summary-row"><span>Usuario</span><strong>${escapeHtml(state.user?.username||'')}</strong></div><div class="summary-row"><span>Acceso</span><strong>Autenticado</strong></div></div></div></div></div>`;
}

function openModal(title,body,eyebrow='Hotel Gran Marques'){
  $('#modalEyebrow').textContent=eyebrow; $('#modalTitle').textContent=title; $('#modalBody').innerHTML=body; $('#modal').classList.remove('hidden');
}
function closeModal(){ $('#modal').classList.add('hidden'); }

function reservationForm(prefillRoom=''){
  const available=state.rooms.filter(r=>r.status==='Disponible');
  return `<form id="reservationForm"><div class="form-grid"><div class="field"><span>Huésped *</span><input name="guest" required placeholder="Nombre completo"></div><div class="field"><span>Habitación *</span><select name="room" required><option value="">Seleccionar</option>${available.map(r=>`<option value="${r.id}" ${String(r.id)===String(prefillRoom)?'selected':''}>${r.id} · ${r.type} · ${money(r.rate)}/noche</option>`).join('')}</select></div><div class="field"><span>Fecha de ingreso *</span><input name="start" type="date" value="2026-10-03" required></div><div class="field"><span>Fecha de salida *</span><input name="end" type="date" value="2026-10-05" required></div><div class="field"><span>Número de huéspedes *</span><input name="guests" type="number" min="1" value="2" required></div><div class="field"><span>Estado</span><select name="status"><option>Confirmada</option><option>Pendiente</option></select></div><div class="field full-span"><span>Observaciones</span><textarea name="notes" rows="3" placeholder="Preferencias o comentarios"></textarea></div></div><div class="modal-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Guardar reserva</button></div></form>`;
}

function bindPageActions(){
  $$('#pageContent [data-route-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.routeGo)));
  $$('#pageContent [data-action]').forEach(b=>b.addEventListener('click',()=>handleAction(b.dataset.action,b.dataset.id)));
  $('#reservationSearch')?.addEventListener('input',refreshReservationsTable);
  $('#reservationStatus')?.addEventListener('change',refreshReservationsTable);
  refreshReservationsTable();
}

function handleAction(action,id){
  if(action==='new-reservation') openModal('Nueva reserva',reservationForm(),'RF-02 · Gestión de reservas');
  if(action==='reserve-room') openModal(`Reservar habitación ${id}`,reservationForm(id),'RF-02 · Gestión de reservas');
  if(action==='view-reservation'){const r=state.reservations.find(x=>x.id===id); if(r) openModal(`Reserva ${r.id}`,`<div class="summary-list"><div class="summary-row"><span>Huésped</span><strong>${escapeHtml(r.guest)}</strong></div><div class="summary-row"><span>Habitación</span><strong>${r.room}</strong></div><div class="summary-row"><span>Estancia</span><strong>${r.start} → ${r.end}</strong></div><div class="summary-row"><span>Total</span><strong>${money(r.total)}</strong></div><div class="summary-row"><span>Estado</span><strong><span class="status ${statusClass(r.status)}">${r.status}</span></strong></div></div><div class="modal-actions"><button class="btn secondary" data-close-modal>Cerrar</button></div>`,'Detalle de reserva');}
  if(action==='cancel-reservation'){const r=state.reservations.find(x=>x.id===id); if(r){r.status='Cancelada'; persist(); navigate('reservas'); showToast(`Reserva ${id} cancelada.`)}}
  if(action==='edit-room'){const r=state.rooms.find(x=>String(x.id)===String(id)); if(r) openModal(`Editar habitación ${r.id}`,`<form id="roomForm"><div class="form-grid"><div class="field"><span>Tipo</span><select name="type"><option ${r.type==='Sencilla'?'selected':''}>Sencilla</option><option ${r.type==='Doble'?'selected':''}>Doble</option><option ${r.type==='Suite'?'selected':''}>Suite</option></select></div><div class="field"><span>Tarifa por noche</span><input name="rate" type="number" value="${r.rate}" min="0"></div><div class="field"><span>Estado</span><select name="status">${['Disponible','Ocupada','Mantenimiento'].map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="field"><span>Vista</span><input name="view" value="${escapeHtml(r.view)}"></div></div><div class="modal-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary">Guardar cambios</button></div></form>`,'RF-04 · Habitaciones');}
  if(action==='new-room') openModal('Agregar habitación',`<form id="roomForm"><div class="form-grid"><div class="field"><span>Número *</span><input name="id" type="number" required></div><div class="field"><span>Tipo</span><select name="type"><option>Sencilla</option><option>Doble</option><option>Suite</option></select></div><div class="field"><span>Tarifa por noche *</span><input name="rate" type="number" required min="0"></div><div class="field"><span>Piso</span><input name="floor" type="number" min="1" value="1"></div><div class="field"><span>Vista</span><input name="view" value="Ciudad"></div><div class="field"><span>Estado</span><select name="status"><option>Disponible</option><option>Ocupada</option><option>Mantenimiento</option></select></div></div><div class="modal-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary">Crear habitación</button></div></form>`,'RF-04 · Habitaciones');
  if(action==='add-service'){const s=state.services.find(x=>x.id===id); openModal('Agregar servicio',`<form id="serviceForm"><div class="notice">${s.icon} ${escapeHtml(s.name)} · ${money(s.price)} por consumo</div><div class="form-grid"><div class="field"><span>Reserva *</span><select name="reservation">${state.reservations.filter(r=>r.status!=='Cancelada').map(r=>`<option>${r.id} · ${escapeHtml(r.guest)}</option>`).join('')}</select></div><div class="field"><span>Cantidad *</span><input name="qty" type="number" value="1" min="1"></div></div><div class="modal-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary">Agregar consumo</button></div></form>`,'RF-06 · Servicios');}
  if(action==='new-service') handleAction('add-service','SV-01');
  if(action==='new-invoice') openModal('Generar factura',`<form id="invoiceForm"><div class="form-grid"><div class="field"><span>Reserva *</span><select name="reservation">${state.reservations.filter(r=>r.status!=='Cancelada').map(r=>`<option>${r.id} · ${escapeHtml(r.guest)}</option>`).join('')}</select></div><div class="field"><span>Método de pago</span><select name="payment"><option>Tarjeta</option><option>Transferencia</option><option>Efectivo</option></select></div></div><div class="modal-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary">Generar factura</button></div></form>`,'RF-05 · Facturación');
  if(action==='pay-invoice'){const f=state.invoices.find(x=>x.id===id); if(f){f.status='Pagada';f.payment=f.payment==='Pendiente'?'Tarjeta':f.payment;persist();navigate('facturacion');showToast(`Pago registrado para ${id}.`)}}
  if(action==='export-report'){showToast('Reporte preparado para exportación (demo).')}
  if(action==='new-maintenance') openModal('Nueva alerta de mantenimiento',`<form id="maintenanceForm"><div class="form-grid"><div class="field"><span>Ubicación</span><input name="room" required placeholder="Ej. Habitación 205"></div><div class="field"><span>Área</span><select name="area"><option>Habitación</option><option>Área social</option></select></div><div class="field full-span"><span>Detalle</span><input name="issue" required placeholder="Describe la incidencia"></div><div class="field"><span>Prioridad</span><select name="priority"><option>Alta</option><option>Media</option><option>Baja</option></select></div></div><div class="modal-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary">Crear alerta</button></div></form>`,'Mantenimiento');
  if(action==='update-maintenance'){const m=state.maintenance.find(x=>x.id===id); if(m){m.status=m.status==='Abierto'?'En proceso':'Programado';persist();navigate('mantenimiento');showToast(`Alerta ${id} actualizada.`)}}
}

function initModalDelegation(){
  $('#modal').addEventListener('click',e=>{if(e.target.matches('[data-close-modal]')||e.target.matches('.modal-backdrop')) closeModal();});
  $('#modal').addEventListener('submit',e=>{
    e.preventDefault(); const form=e.target; const data=Object.fromEntries(new FormData(form).entries());
    if(form.id==='reservationForm'){
      if(new Date(data.end)<=new Date(data.start)){showToast('La fecha de salida debe ser posterior.');return}
      const room=state.rooms.find(r=>String(r.id)===String(data.room)); if(!room){showToast('Selecciona una habitación.');return}
      const nights=Math.max(1,Math.round((new Date(data.end)-new Date(data.start))/86400000)); const total=nights*room.rate; const id='RS-'+String(state.reservations.length+1).padStart(3,'0');
      state.reservations.unshift({id,guest:data.guest,room:room.id,start:data.start,end:data.end,guests:Number(data.guests),status:data.status,total}); if(data.status==='Confirmada')room.status='Ocupada'; persist(); closeModal(); navigate('reservas'); showToast(`Reserva ${id} creada correctamente.`);
    }
    if(form.id==='roomForm'){
      const existing=state.rooms.find(r=>String(r.id)===String(data.id));
      if(existing){Object.assign(existing,{type:data.type,rate:Number(data.rate),status:data.status,view:data.view});showToast('Habitación actualizada.')} else {state.rooms.push({id:Number(data.id),type:data.type,status:data.status,rate:Number(data.rate),floor:Number(data.floor),view:data.view});showToast('Habitación creada.')}
      persist(); closeModal(); navigate('habitaciones');
    }
    if(form.id==='serviceForm'){showToast(`Consumo agregado a ${data.reservation}.`);closeModal();}
    if(form.id==='invoiceForm'){const id='FAC-'+String(state.invoices.length+1).padStart(4,'0'); const r=state.reservations.find(x=>data.reservation.startsWith(x.id)); const lodging=r?.total||0; state.invoices.unshift({id,guest:r?.guest||'Nuevo huésped',room:r?.room||'',nights:1,lodging,services:0,total:lodging,payment:data.payment,status:'Pendiente'});persist();closeModal();navigate('facturacion');showToast(`Factura ${id} generada.`)}
    if(form.id==='maintenanceForm'){const id='MT-'+String(state.maintenance.length+1).padStart(2,'0');state.maintenance.unshift({id,room:data.room,area:data.area,issue:data.issue,priority:data.priority,status:'Abierto'});persist();closeModal();navigate('mantenimiento');showToast(`Alerta ${id} creada.`)}
  });
}

function init(){
  hydrate();
  const saved=localStorage.getItem('gm_user');
  if(saved && localStorage.getItem('gm_token')){try{state.user=JSON.parse(saved)}catch{state.user=null}}
  else { state.user=null; localStorage.removeItem('gm_user'); }
  $('#togglePassword').addEventListener('click',()=>{const i=$('#loginPassword');i.type=i.type==='password'?'text':'password'});
  $('#forgotPassword').addEventListener('click',()=>showToast('Contacta al administrador del hotel para restablecer tu contraseña.'));
  $('#notificationBtn').addEventListener('click',()=>showToast('Tienes 3 alertas de mantenimiento pendientes.'));
  $('#logoutBtn').addEventListener('click',logout);
  $('#openSidebar').addEventListener('click',()=>$('#sidebar').classList.add('open'));
  $('#closeSidebar').addEventListener('click',()=>$('#sidebar').classList.remove('open'));
  $$('.nav-item[data-route]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.route)));
  $('#loginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const u=$('#loginUser').value.trim(), p=$('#loginPassword').value;
    const submitButton=e.submitter || $('#loginForm').querySelector('button[type=submit]');
    if(submitButton) submitButton.disabled=true;
    try{
      // El acceso se valida en la API REST; no se compara la contraseña en el navegador.
      const response=await fetch('/api/auth/login',{
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:u,password:p})
      });
      const result=await response.json();
      if(!response.ok || !result.success){showToast(result.message || 'Error en la autenticación.');return}
      localStorage.setItem('gm_token',result.token);
      const profile=result.user;
      const mapped={...profile, initials:profile.role==='Administración'?'AD':'RC'};
      setUser(mapped);
      showToast(result.message || 'Autenticación satisfactoria.');
    }catch(error){
      showToast('No fue posible conectar con la API. Verifica que el servidor esté ejecutándose.');
    }finally{if(submitButton)submitButton.disabled=false;}
  });
  document.addEventListener('click',e=>{const b=e.target.closest('#pageContent [data-route-go]'); if(b) navigate(b.dataset.routeGo)});
  initModalDelegation();
  if(state.user && localStorage.getItem('gm_token')){
    // Revalida la sesión contra la API antes de mostrar los módulos protegidos.
    fetch('/api/auth/me',{headers:{Authorization:`Bearer ${localStorage.getItem('gm_token')}`}})
      .then(async response=>{if(!response.ok) throw new Error('Sesión inválida'); const data=await response.json(); state.user={...data.user,initials:data.user.role==='Administración'?'AD':'RC'}; localStorage.setItem('gm_user',JSON.stringify(state.user)); updateUserUI(); $('#loginView').classList.add('hidden'); $('#appView').classList.remove('hidden'); navigate('dashboard');})
      .catch(()=>{state.user=null;localStorage.removeItem('gm_user');localStorage.removeItem('gm_token');$('#appView').classList.add('hidden');$('#loginView').classList.remove('hidden');});
  }
}

document.addEventListener('DOMContentLoaded',init);
