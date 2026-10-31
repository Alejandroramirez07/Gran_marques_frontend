/* Controlador de interfaz. Las operaciones de negocio se ejecutan mediante HGMHotelService. */
'use strict';

const state = {
  user: null,
  currentRoute: 'dashboard',
  rooms: [],
  guests: [],
  reservations: [],
  services: [],
  invoices: [],
  maintenance: [],
  summary: {}
};

const titles = {
  dashboard: ['Inicio', 'Panel de control'],
  reservas: ['Reservas', 'Gestión de reservas'],
  habitaciones: ['Habitaciones', 'Disponibilidad y tarifas'],
  servicios: ['Servicios', 'Servicios adicionales'],
  facturacion: ['Facturación', 'Facturación y pagos'],
  reportes: ['Reportes', 'Indicadores gerenciales'],
  mantenimiento: ['Mantenimiento', 'Alertas y mantenimiento'],
  configuracion: ['Configuración', 'Preferencias del sistema']
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const money = value => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const isAdmin = () => ['administración', 'administrador', 'admin'].includes(String(state.user?.role || '').toLowerCase());
const plusDays = days => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function statusClass(status) {
  const map = {
    Disponible: 'available', Confirmada: 'confirmed', Pagada: 'paid', Parcial: 'medium',
    'En proceso': 'medium', Programado: 'low', Pendiente: 'pending', Ocupada: 'occupied',
    Mantenimiento: 'high', Cancelada: 'cancelled', Abierto: 'high', Abierta: 'high',
    Resuelta: 'available', Urgente: 'high', Alta: 'high', Media: 'medium', Baja: 'low'
  };
  return map[status] || 'pending';
}

async function loadAllData() {
  const [rooms, guests, reservations, services, invoices, maintenance, summary] = await Promise.all([
    HGMHotelService.rooms(),
    HGMHotelService.guests(),
    HGMHotelService.reservations(),
    HGMHotelService.services(true),
    HGMHotelService.invoices(),
    HGMHotelService.maintenance(),
    HGMHotelService.summary()
  ]);
  state.rooms = rooms.map(HGMAdapters.mapRoom);
  state.guests = guests.map(HGMAdapters.mapGuest);
  state.reservations = reservations.map(item => HGMAdapters.mapReservation(item, state.rooms));
  state.services = services.map(HGMAdapters.mapService);
  state.invoices = invoices.map(item => HGMAdapters.mapInvoice(item, state.reservations));
  state.maintenance = maintenance.map(item => HGMAdapters.mapMaintenance(item, state.rooms));
  state.summary = summary;
}

function setUser(user) {
  state.user = { ...user, initials: user.role === 'Administración' ? 'AD' : 'RC' };
  localStorage.setItem('gm_user', JSON.stringify(state.user));
  updateUserUI();
  $('#loginView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
}

function updateUserUI() {
  if (!state.user) return;
  $('#userName').textContent = state.user.name;
  $('#userRole').textContent = state.user.role;
  $('#avatar').textContent = state.user.initials;
}

function logout() {
  HGMAuthService.logout();
  state.user = null;
  localStorage.removeItem('gm_user');
  $('#appView').classList.add('hidden');
  $('#loginView').classList.remove('hidden');
  $('#loginForm').reset();
  showToast('Sesión cerrada correctamente.');
}

function layoutPage(content) {
  $('#pageContent').innerHTML = content;
  bindPageActions();
}

async function navigate(route) {
  state.currentRoute = titles[route] ? route : 'dashboard';
  $$('.nav-item[data-route]').forEach(button => button.classList.toggle('active', button.dataset.route === state.currentRoute));
  $('#breadcrumb').textContent = titles[state.currentRoute][0];
  $('#pageTitle').textContent = titles[state.currentRoute][1];
  $('#pageContent').innerHTML = '<div class="notice">Consultando información del Hotel Gran Marques...</div>';
  $('#sidebar').classList.remove('open');
  try {
    await loadAllData();
    const pages = {
      dashboard: renderDashboard,
      reservas: renderReservations,
      habitaciones: renderRooms,
      servicios: renderServices,
      facturacion: renderBilling,
      reportes: renderReports,
      mantenimiento: renderMaintenance,
      configuracion: renderSettings
    };
    layoutPage(pages[state.currentRoute]());
  } catch (error) {
    layoutPage(`<div class="notice"><strong>No fue posible cargar el módulo.</strong><p>${escapeHtml(error.message)}</p><button class="btn secondary" data-action="retry">Reintentar</button></div>`);
    if (error.status === 401) logout();
    else showToast(error.message);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderDashboard() {
  const rooms = state.rooms;
  const pending = state.reservations.filter(item => item.status === 'Pendiente').length;
  const confirmed = state.reservations.filter(item => item.status === 'Confirmada').length;
  const occupied = rooms.filter(item => item.status === 'Ocupada').length;
  const available = rooms.filter(item => item.status === 'Disponible').length;
  const paid = state.summary.collectedRevenue || 0;
  return `
    <div class="page-header"><div><span class="eyebrow">Operación conectada a la API</span><h2>Buenos días, ${escapeHtml(state.user?.name || 'equipo')}.</h2><p>Información consultada desde el servidor del Hotel Gran Marques.</p></div><div class="header-actions"><button class="btn secondary" data-route-go="reportes">Ver reportes</button><button class="btn primary" data-action="new-reservation">+ Nueva reserva</button></div></div>
    <div class="grid grid-4">
      <div class="card kpi"><span class="label">Habitaciones disponibles</span><span class="value">${available}</span><span class="meta positive">de ${rooms.length} habitaciones</span></div>
      <div class="card kpi"><span class="label">Reservas confirmadas</span><span class="value">${confirmed}</span><span class="meta">${pending} pendientes</span></div>
      <div class="card kpi"><span class="label">Mantenimientos abiertos</span><span class="value">${state.summary.maintenanceOpen || 0}</span><span class="meta">Solicitudes por atender</span></div>
      <div class="card kpi"><span class="label">Recaudo registrado</span><span class="value">${money(paid)}</span><span class="meta">Pagos recibidos</span></div>
    </div>
    <div style="height:18px"></div>
    <div class="grid dashboard-grid">
      <div class="grid" style="gap:18px">
        <div class="card"><div class="card-header"><div><h3>Accesos rápidos</h3><p>Funciones principales integradas</p></div></div><div class="card-body"><div class="quick-actions">
          <button class="quick-action" data-route-go="reservas"><strong>▣ Reservas</strong><span>Crear y consultar reservas</span></button>
          <button class="quick-action" data-route-go="habitaciones"><strong>▤ Habitaciones</strong><span>Disponibilidad y tarifas</span></button>
          <button class="quick-action" data-route-go="facturacion"><strong>$ Facturación</strong><span>Registrar pagos</span></button>
          <button class="quick-action" data-route-go="mantenimiento"><strong>⚙ Mantenimiento</strong><span>Alertas pendientes</span></button>
        </div></div></div>
        <div class="card"><div class="card-header"><div><h3>Reservas recientes</h3><p>Datos guardados en el servidor</p></div><button class="link-button" data-route-go="reservas">Ver todas</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Reserva</th><th>Huésped</th><th>Habitación</th><th>Entrada</th><th>Estado</th></tr></thead><tbody>${state.reservations.slice(0, 6).map(item => `<tr><td><strong>${escapeHtml(item.code)}</strong></td><td>${escapeHtml(item.guest)}</td><td>${escapeHtml(item.room)}</td><td>${escapeHtml(item.start)}</td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td></tr>`).join('') || '<tr><td colspan="5" class="empty">No hay reservas registradas.</td></tr>'}</tbody></table></div></div>
      </div>
      <div class="grid" style="gap:18px">
        <div class="card"><div class="card-header"><div><h3>Estado de habitaciones</h3><p>Vista rápida</p></div></div><div class="card-body"><div class="room-status-grid">${rooms.slice(0, 8).map(room => `<div class="room-pill"><strong>${escapeHtml(room.number)}</strong><span class="status ${statusClass(room.status)}">${escapeHtml(room.status)}</span></div>`).join('') || '<span class="empty">Sin habitaciones.</span>'}</div></div></div>
        <div class="card"><div class="card-header"><div><h3>Alertas activas</h3><p>Mantenimiento</p></div><button class="link-button" data-route-go="mantenimiento">Gestionar</button></div><div class="card-body"><div class="summary-list">${state.maintenance.filter(item => ['Abierta', 'En proceso'].includes(item.status)).slice(0, 4).map(item => `<div class="summary-row"><span>${escapeHtml(item.room)}</span><strong class="status ${statusClass(item.priority)}">${escapeHtml(item.priority)}</strong></div>`).join('') || '<span class="empty">No hay alertas activas.</span>'}</div></div></div>
      </div>
    </div>`;
}

function renderReservations() {
  return `
    <div class="page-header"><div><span class="eyebrow">Módulo integrado RF-02</span><h2>Reservas</h2><p>Huéspedes, habitaciones, fechas y estados almacenados en la API.</p></div><button class="btn primary" data-action="new-reservation">+ Nueva reserva</button></div>
    <div class="card"><div class="card-body"><div class="search-row"><div class="field"><span>Buscar huésped o código</span><input id="reservationSearch" type="search" placeholder="Nombre o código"></div><div class="field" style="max-width:180px"><span>Estado</span><select id="reservationStatus"><option value="">Todos</option><option>Confirmada</option><option>Pendiente</option><option>Cancelada</option><option>Finalizada</option></select></div></div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th>Reserva</th><th>Huésped</th><th>Habitación</th><th>Estancia</th><th>Huéspedes</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody id="reservationsBody">${reservationRows(state.reservations)}</tbody></table></div></div></div>`;
}

function reservationRows(items) {
  return items.length ? items.map(item => `<tr><td><strong>${escapeHtml(item.code)}</strong></td><td>${escapeHtml(item.guest)}</td><td>${escapeHtml(item.room)}</td><td>${escapeHtml(item.start)} → ${escapeHtml(item.end)}</td><td>${item.guests}</td><td>${money(item.total)}</td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td><div class="table-actions"><button class="icon-action" data-action="view-reservation" data-id="${item.id}" title="Ver detalle">↗</button>${['Pendiente', 'Confirmada'].includes(item.status) ? `<button class="icon-action" data-action="cancel-reservation" data-id="${item.id}" title="Cancelar">×</button>` : ''}</div></td></tr>`).join('') : '<tr><td colspan="8" class="empty">No se encontraron reservas.</td></tr>';
}

function renderRooms() {
  return `
    <div class="page-header"><div><span class="eyebrow">Módulo integrado RF-04</span><h2>Habitaciones</h2><p>Disponibilidad, capacidad, tipo, tarifa y estado desde el servidor.</p></div>${isAdmin() ? '<button class="btn secondary" data-action="new-room">+ Agregar habitación</button>' : ''}</div>
    <div class="notice">Las habitaciones se consultan desde la API. Las operaciones de creación y actualización requieren rol de administración.</div>
    <div class="room-grid">${state.rooms.map(room => `<article class="room-card"><div class="room-card-top"><div><div class="room-number">${escapeHtml(room.number)}</div><div class="room-meta"><span>${escapeHtml(room.type)} · Capacidad ${room.capacity}</span><span>${escapeHtml(room.description)}</span></div></div><span class="status ${statusClass(room.status)}">${escapeHtml(room.status)}</span></div><div class="room-price">${money(room.rate)} <small style="font-size:10px;font-weight:700;color:var(--muted)">/ noche</small></div><div class="room-actions">${isAdmin() ? `<button class="btn secondary" data-action="edit-room" data-id="${room.id}">Editar</button>` : ''}<button class="btn primary" data-action="reserve-room" data-id="${room.id}" ${room.status !== 'Disponible' ? 'disabled' : ''}>Reservar</button></div></article>`).join('') || '<div class="notice">No hay habitaciones registradas.</div>'}</div>`;
}

function renderServices() {
  return `
    <div class="page-header"><div><span class="eyebrow">Módulo integrado RF-06</span><h2>Servicios adicionales</h2><p>Catálogo y consumos asociados a las reservas.</p></div>${isAdmin() ? '<button class="btn primary" data-action="new-service">+ Nuevo servicio</button>' : ''}</div>
    <div class="grid grid-2">${state.services.map(service => `<div class="card"><div class="card-body" style="display:flex;justify-content:space-between;align-items:center;gap:16px"><div style="display:flex;gap:14px;align-items:center"><div style="width:48px;height:48px;border-radius:12px;background:var(--gold-soft);display:grid;place-items:center;font-size:22px">${service.icon}</div><div><h3 style="margin:0 0 4px;color:var(--navy)">${escapeHtml(service.name)}</h3><p style="margin:0;color:var(--muted);font-size:12px">${escapeHtml(service.desc)}</p></div></div><div style="text-align:right"><strong style="display:block;color:var(--navy)">${money(service.price)}</strong><button class="btn secondary" style="margin-top:8px" data-action="add-service" data-id="${service.id}">Agregar a reserva</button></div></div></div>`).join('') || '<div class="notice">No hay servicios activos.</div>'}</div>`;
}

function renderBilling() {
  const total = state.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const paid = state.invoices.reduce((sum, invoice) => sum + invoice.paid, 0);
  return `
    <div class="page-header"><div><span class="eyebrow">Módulo integrado RF-05</span><h2>Facturación y pagos</h2><p>Facturas generadas desde reservas y pagos registrados mediante la API.</p></div><button class="btn primary" data-action="new-invoice">+ Generar factura</button></div>
    <div class="grid grid-3"><div class="card kpi"><span class="label">Facturación registrada</span><span class="value">${money(total)}</span><span class="meta">${state.invoices.length} facturas</span></div><div class="card kpi"><span class="label">Pagado</span><span class="value">${money(paid)}</span><span class="meta positive">Recaudo confirmado</span></div><div class="card kpi"><span class="label">Pendiente</span><span class="value">${money(total - paid)}</span><span class="meta">Saldo por cobrar</span></div></div>
    <div style="height:18px"></div><div class="card"><div class="card-header"><div><h3>Facturas recientes</h3><p>Historial del hotel</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Factura</th><th>Huésped</th><th>Habitación</th><th>Alojamiento</th><th>Servicios</th><th>Total</th><th>Pagado</th><th>Estado</th><th></th></tr></thead><tbody>${state.invoices.map(invoice => `<tr><td><strong>${escapeHtml(invoice.code)}</strong></td><td>${escapeHtml(invoice.guest)}</td><td>${escapeHtml(invoice.room)}</td><td>${money(invoice.lodging)}</td><td>${money(invoice.services)}</td><td><strong>${money(invoice.total)}</strong></td><td>${money(invoice.paid)}</td><td><span class="status ${statusClass(invoice.status)}">${escapeHtml(invoice.status)}</span></td><td>${invoice.balance > 0 ? `<button class="icon-action" data-action="pay-invoice" data-id="${invoice.id}" title="Registrar abono">$</button>` : '—'}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">Todavía no hay facturas.</td></tr>'}</tbody></table></div></div>`;
}

function renderReports() {
  const summary = state.summary;
  const distribution = ['Sencilla', 'Doble', 'Suite'].map(type => {
    const count = state.rooms.filter(room => room.type === type).length;
    return `<div class="summary-row"><span>${type}</span><strong>${count} habitaciones</strong></div>`;
  }).join('');
  return `
    <div class="page-header"><div><span class="eyebrow">Módulo integrado RF-07</span><h2>Reportes gerenciales</h2><p>Indicadores calculados por el servicio /api/reports/summary.</p></div><button class="btn secondary" data-action="export-report">⇩ Exportar reporte</button></div>
    <div class="grid grid-3"><div class="card kpi"><span class="label">Ocupación</span><span class="value">${summary.occupancyPercent || 0}%</span><span class="meta">Habitaciones ocupadas</span></div><div class="card kpi"><span class="label">Reservas activas</span><span class="value">${summary.reservationsActive || 0}</span><span class="meta">De ${summary.reservationsTotal || 0} registradas</span></div><div class="card kpi"><span class="label">Ingresos recaudados</span><span class="value">${money(summary.collectedRevenue || 0)}</span><span class="meta">Pagos registrados</span></div></div>
    <div style="height:18px"></div><div class="grid grid-2"><div class="card"><div class="card-header"><div><h3>Composición del inventario</h3><p>Distribución por tipo de habitación</p></div></div><div class="card-body"><div class="summary-list">${distribution}</div></div></div><div class="card"><div class="card-header"><div><h3>Estado de operación</h3><p>Indicadores del sistema</p></div></div><div class="card-body"><div class="summary-list"><div class="summary-row"><span>Huéspedes</span><strong>${summary.guests || 0}</strong></div><div class="summary-row"><span>Facturas</span><strong>${summary.invoices || 0}</strong></div><div class="summary-row"><span>Facturas pendientes</span><strong>${summary.invoicesPending || 0}</strong></div><div class="summary-row"><span>Mantenimientos abiertos</span><strong>${summary.maintenanceOpen || 0}</strong></div></div></div></div></div>
    <p class="meta">Actualizado: ${summary.generatedAt ? new Date(summary.generatedAt).toLocaleString('es-CO') : '—'}</p>`;
}

function renderMaintenance() {
  return `
    <div class="page-header"><div><span class="eyebrow">Módulo integrado</span><h2>Mantenimiento</h2><p>Alertas asociadas a habitaciones y áreas sociales.</p></div><button class="btn primary" data-action="new-maintenance">+ Nueva alerta</button></div>
    <div class="card"><div class="card-header"><div><h3>Solicitudes de mantenimiento</h3><p>Estados administrados en el backend</p></div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Alerta</th><th>Ubicación</th><th>Detalle</th><th>Prioridad</th><th>Estado</th><th></th></tr></thead><tbody>${state.maintenance.map(item => `<tr><td><strong>${escapeHtml(String(item.id).slice(0, 8))}</strong></td><td>${escapeHtml(item.room)}<br><small style="color:var(--muted)">${escapeHtml(item.area)}</small></td><td>${escapeHtml(item.issue)}</td><td><span class="status ${statusClass(item.priority)}">${escapeHtml(item.priority)}</span></td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${['Abierta', 'En proceso'].includes(item.status) ? `<button class="icon-action" data-action="update-maintenance" data-id="${item.id}" title="Actualizar">✓</button>` : '—'}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No hay alertas registradas.</td></tr>'}</tbody></table></div></div>`;
}

function renderSettings() {
  return `
    <div class="page-header"><div><span class="eyebrow">Administración</span><h2>Configuración</h2><p>Perfil autenticado y datos del entorno.</p></div></div>
    <div class="grid grid-2"><div class="card"><div class="card-header"><div><h3>Integración de módulos</h3><p>Conexión actual</p></div></div><div class="card-body settings"><div class="setting-row"><div><strong>API REST</strong><p>Servidor HTTP local en puerto 3000.</p></div><span class="status available">Conectada</span></div><div class="setting-row"><div><strong>Persistencia</strong><p>Archivos JSON dentro de api/data.</p></div><span class="status confirmed">Activa</span></div><div class="setting-row"><div><strong>Autenticación</strong><p>Token Bearer JWT.</p></div><span class="status available">Activa</span></div></div></div>
    <div class="card"><div class="card-header"><div><h3>Perfil actual</h3><p>Cuenta utilizada en esta sesión</p></div></div><div class="card-body"><div class="summary-list"><div class="summary-row"><span>Nombre</span><strong>${escapeHtml(state.user?.name || '')}</strong></div><div class="summary-row"><span>Rol</span><strong>${escapeHtml(state.user?.role || '')}</strong></div><div class="summary-row"><span>Usuario</span><strong>${escapeHtml(state.user?.username || '')}</strong></div><div class="summary-row"><span>Autenticación</span><strong>JWT validado</strong></div></div></div></div></div>`;
}

function openModal(title, body, eyebrow = 'Hotel Gran Marques') {
  $('#modalEyebrow').textContent = eyebrow;
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = body;
  $('#modal').classList.remove('hidden');
}
function closeModal() { $('#modal').classList.add('hidden'); }

function reservationForm(prefillRoom = '') {
  const available = state.rooms.filter(room => room.status === 'Disponible');
  const rooms = available.map(room => `<option value="${room.id}" ${room.id === prefillRoom ? 'selected' : ''}>${escapeHtml(room.number)} · ${escapeHtml(room.type)} · ${money(room.rate)}/noche</option>`).join('');
  return `<form id="reservationForm"><div class="form-grid"><div class="field"><span>Nombre del huésped *</span><input name="guestName" required maxlength="100" placeholder="Nombre completo"></div><div class="field"><span>Documento *</span><input name="document" required placeholder="Cédula o pasaporte"></div><div class="field"><span>Correo</span><input name="email" type="email" placeholder="correo@ejemplo.com"></div><div class="field"><span>Habitación *</span><select name="roomId" required><option value="">Seleccionar</option>${rooms}</select></div><div class="field"><span>Fecha de ingreso *</span><input name="checkIn" type="date" value="${plusDays(1)}" required></div><div class="field"><span>Fecha de salida *</span><input name="checkOut" type="date" value="${plusDays(3)}" required></div><div class="field"><span>Número de huéspedes *</span><input name="guestsCount" type="number" min="1" value="1" required></div><div class="field"><span>Estado</span><select name="status"><option>Confirmada</option><option>Pendiente</option></select></div><div class="field full-span"><span>Observaciones</span><textarea name="notes" rows="3" placeholder="Preferencias o comentarios"></textarea></div></div><div class="modal-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Guardar reserva</button></div></form>`;
}

function roomForm(room = null) {
  return `<form id="roomForm">${room ? `<input type="hidden" name="roomId" value="${room.id}">` : ''}<div class="form-grid"><div class="field"><span>Número *</span><input name="number" required value="${escapeHtml(room?.number || '')}" ${room ? 'readonly' : ''}></div><div class="field"><span>Tipo</span><select name="type"><option ${room?.type === 'Sencilla' ? 'selected' : ''}>Sencilla</option><option ${room?.type === 'Doble' ? 'selected' : ''}>Doble</option><option ${room?.type === 'Suite' ? 'selected' : ''}>Suite</option></select></div><div class="field"><span>Capacidad *</span><input name="capacity" type="number" min="1" value="${room?.capacity || 2}" required></div><div class="field"><span>Tarifa por noche *</span><input name="rate" type="number" min="0" value="${room?.rate || ''}" required></div><div class="field"><span>Estado</span><select name="status">${['Disponible', 'Ocupada', 'Mantenimiento'].map(status => `<option ${room?.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div><div class="field full-span"><span>Descripción</span><input name="description" value="${escapeHtml(room?.description || '')}" placeholder="Piso, vista u observaciones"></div></div><div class="modal-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary" type="submit">${room ? 'Guardar cambios' : 'Crear habitación'}</button></div></form>`;
}

function addServiceForm(serviceId) {
  const reservations = state.reservations.filter(item => ['Confirmada', 'Pendiente'].includes(item.status));
  return `<form id="serviceForm"><div class="notice">Servicio seleccionado: ${escapeHtml(state.services.find(item => item.id === serviceId)?.name || '')}</div><div class="form-grid"><div class="field full-span"><span>Reserva *</span><select name="reservationId" required>${reservations.map(item => `<option value="${item.id}">${escapeHtml(item.code)} · ${escapeHtml(item.guest)}</option>`).join('')}</select></div><div class="field"><span>Cantidad *</span><input name="quantity" type="number" min="1" max="50" value="1" required></div><input type="hidden" name="serviceId" value="${serviceId}"></div><div class="modal-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Agregar consumo</button></div></form>`;
}

function invoiceForm() {
  const reservations = state.reservations.filter(item => ['Confirmada', 'Pendiente', 'Finalizada'].includes(item.status) && !state.invoices.some(invoice => invoice.reservationId === item.id));
  return `<form id="invoiceForm"><div class="field"><span>Reserva sin factura *</span><select name="reservationId" required>${reservations.map(item => `<option value="${item.id}">${escapeHtml(item.code)} · ${escapeHtml(item.guest)} · Hab. ${escapeHtml(item.room)}</option>`).join('')}</select></div><div class="modal-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Generar factura</button></div></form>`;
}

function paymentForm(invoice) {
  return `<form id="paymentForm" data-invoice-id="${invoice.id}"><div class="notice">Factura ${escapeHtml(invoice.code)} · Saldo: ${money(invoice.balance)}</div><div class="form-grid"><div class="field"><span>Valor del pago *</span><input name="amount" type="number" min="1" max="${invoice.balance}" step="1" value="${invoice.balance}" required></div><div class="field"><span>Método *</span><select name="method"><option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option><option>Otro</option></select></div><div class="field full-span"><span>Referencia</span><input name="reference" placeholder="Número de comprobante"></div></div><div class="modal-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Registrar pago</button></div></form>`;
}

function maintenanceForm() {
  return `<form id="maintenanceForm"><div class="form-grid"><div class="field"><span>Área *</span><select name="area"><option>Habitación</option><option>Área social</option><option>Instalaciones</option></select></div><div class="field"><span>Habitación (opcional)</span><select name="roomId"><option value="">No asociar</option>${state.rooms.map(room => `<option value="${room.id}">Habitación ${escapeHtml(room.number)}</option>`).join('')}</select></div><div class="field full-span"><span>Descripción *</span><input name="description" required placeholder="Describe la incidencia"></div><div class="field"><span>Prioridad</span><select name="priority"><option>Alta</option><option selected>Media</option><option>Baja</option><option>Urgente</option></select></div></div><div class="modal-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Crear alerta</button></div></form>`;
}

function serviceCatalogForm() {
  return `<form id="catalogServiceForm"><div class="form-grid"><div class="field"><span>Nombre *</span><input name="name" required></div><div class="field"><span>Precio *</span><input name="price" type="number" min="0" required></div><div class="field full-span"><span>Descripción</span><input name="description"></div></div><div class="modal-actions"><button type="button" class="btn secondary" data-close-modal>Cancelar</button><button class="btn primary" type="submit">Crear servicio</button></div></form>`;
}

function bindPageActions() {
  $$('#pageContent [data-route-go]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.routeGo)));
  $$('#pageContent [data-action]').forEach(button => button.addEventListener('click', () => handleAction(button.dataset.action, button.dataset.id)));
  $('#reservationSearch')?.addEventListener('input', filterReservationTable);
  $('#reservationStatus')?.addEventListener('change', filterReservationTable);
}

function filterReservationTable() {
  const query = ($('#reservationSearch')?.value || '').toLowerCase();
  const status = $('#reservationStatus')?.value || '';
  const rows = state.reservations.filter(item => (!query || `${item.code} ${item.guest} ${item.room}`.toLowerCase().includes(query)) && (!status || item.status === status));
  const body = $('#reservationsBody');
  if (body) body.innerHTML = reservationRows(rows);
  if (body) $$('#reservationsBody [data-action]').forEach(button => button.addEventListener('click', () => handleAction(button.dataset.action, button.dataset.id)));
}

async function handleAction(action, id) {
  try {
    if (action === 'retry') return navigate(state.currentRoute);
    if (action === 'new-reservation') return openModal('Nueva reserva', reservationForm(), 'RF-02 · Reservas');
    if (action === 'reserve-room') return openModal(`Reservar habitación ${state.rooms.find(room => room.id === id)?.number || ''}`, reservationForm(id), 'RF-02 · Reservas');
    if (action === 'view-reservation') {
      const item = state.reservations.find(reservation => reservation.id === id);
      if (item) openModal(`Reserva ${item.code}`, `<div class="summary-list"><div class="summary-row"><span>Huésped</span><strong>${escapeHtml(item.guest)}</strong></div><div class="summary-row"><span>Habitación</span><strong>${escapeHtml(item.room)}</strong></div><div class="summary-row"><span>Estancia</span><strong>${item.start} → ${item.end}</strong></div><div class="summary-row"><span>Noches</span><strong>${item.nights}</strong></div><div class="summary-row"><span>Total estimado</span><strong>${money(item.total)}</strong></div><div class="summary-row"><span>Estado</span><strong>${escapeHtml(item.status)}</strong></div></div><div class="modal-actions"><button class="btn secondary" data-close-modal>Cerrar</button></div>`, 'Consulta desde API');
      return;
    }
    if (action === 'cancel-reservation') {
      if (!confirm('¿Desea cancelar esta reserva?')) return;
      await HGMHotelService.updateReservation(id, { status: 'Cancelada' });
      showToast('Reserva cancelada en el servidor.');
      return navigate('reservas');
    }
    if (action === 'new-room') return openModal('Agregar habitación', roomForm(), 'RF-04 · Habitaciones');
    if (action === 'edit-room') {
      const room = state.rooms.find(item => item.id === id);
      if (room) openModal(`Editar habitación ${room.number}`, roomForm(room), 'RF-04 · Habitaciones');
      return;
    }
    if (action === 'add-service') return openModal('Agregar consumo a reserva', addServiceForm(id), 'RF-06 · Servicios');
    if (action === 'new-service') return openModal('Crear servicio del catálogo', serviceCatalogForm(), 'Administración · Servicios');
    if (action === 'new-invoice') return openModal('Generar factura desde reserva', invoiceForm(), 'RF-05 · Facturación');
    if (action === 'pay-invoice') {
      const invoice = state.invoices.find(item => item.id === id);
      if (invoice) openModal('Registrar pago o abono', paymentForm(invoice), 'RF-05 · Facturación');
      return;
    }
    if (action === 'new-maintenance') return openModal('Nueva solicitud de mantenimiento', maintenanceForm(), 'Mantenimiento');
    if (action === 'update-maintenance') {
      const item = state.maintenance.find(entry => entry.id === id);
      if (!item) return;
      const next = item.status === 'Abierta' ? 'En proceso' : 'Resuelta';
      await HGMHotelService.updateMaintenance(id, { status: next, notes: `Actualizada desde la interfaz: ${next}` });
      showToast(`Solicitud actualizada: ${next}.`);
      return navigate('mantenimiento');
    }
    if (action === 'export-report') {
      const blob = new Blob([JSON.stringify(state.summary, null, 2)], { type: 'application/json' });
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'hotel-gran-marques-reporte.json'; link.click(); URL.revokeObjectURL(link.href);
      return showToast('Reporte JSON descargado.');
    }
  } catch (error) {
    showToast(error.message);
  }
}

async function submitBusinessForm(form, values) {
  if (form.id === 'reservationForm') {
    if (values.checkOut <= values.checkIn) throw new Error('La fecha de salida debe ser posterior al ingreso.');
    let guest = state.guests.find(item => item.document.toLowerCase() === values.document.trim().toLowerCase());
    if (!guest) {
      const existing = await HGMHotelService.guests(values.document.trim());
      const match = existing.find(item => item.document.toLowerCase() === values.document.trim().toLowerCase());
      guest = match || await HGMHotelService.createGuest({ name: values.guestName, document: values.document, email: values.email || '' });
    }
    await HGMHotelService.createReservation({
      guestId: guest.id,
      roomId: values.roomId,
      checkIn: values.checkIn,
      checkOut: values.checkOut,
      guestsCount: Number(values.guestsCount),
      status: values.status,
      notes: values.notes || ''
    });
    closeModal(); showToast('Reserva guardada correctamente en la API.'); return navigate('reservas');
  }

  if (form.id === 'roomForm') {
    const payload = { number: values.number, type: values.type, capacity: Number(values.capacity), rate: Number(values.rate), status: values.status, description: values.description || '' };
    if (values.roomId) await HGMHotelService.updateRoom(values.roomId, payload);
    else await HGMHotelService.createRoom(payload);
    closeModal(); showToast('Habitación guardada en el servidor.'); return navigate('habitaciones');
  }

  if (form.id === 'serviceForm') {
    await HGMHotelService.addReservationService(values.reservationId, { serviceId: values.serviceId, quantity: Number(values.quantity) });
    closeModal(); showToast('Consumo asociado a la reserva.'); return navigate('servicios');
  }

  if (form.id === 'catalogServiceForm') {
    await HGMHotelService.createService({ name: values.name, description: values.description || '', price: Number(values.price), active: true });
    closeModal(); showToast('Servicio creado en el catálogo.'); return navigate('servicios');
  }

  if (form.id === 'invoiceForm') {
    await HGMHotelService.createInvoice(values.reservationId);
    closeModal(); showToast('Factura generada desde la reserva.'); return navigate('facturacion');
  }

  if (form.id === 'paymentForm') {
    const invoiceId = form.dataset.invoiceId;
    await HGMHotelService.registerPayment(invoiceId, { amount: Number(values.amount), method: values.method, reference: values.reference || '' });
    closeModal(); showToast('Pago registrado correctamente.'); return navigate('facturacion');
  }

  if (form.id === 'maintenanceForm') {
    await HGMHotelService.createMaintenance({ area: values.area, roomId: values.roomId || null, description: values.description, priority: values.priority });
    closeModal(); showToast('Solicitud de mantenimiento creada.'); return navigate('mantenimiento');
  }
}

function initModalDelegation() {
  $('#modal').addEventListener('click', event => {
    if (event.target.matches('[data-close-modal]') || event.target.matches('.modal-backdrop')) closeModal();
  });
  $('#modal').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target;
    const values = Object.fromEntries(new FormData(form).entries());
    const submit = form.querySelector('button[type="submit"], button.primary');
    if (submit) submit.disabled = true;
    try { await submitBusinessForm(form, values); }
    catch (error) { showToast(error.message); }
    finally { if (submit) submit.disabled = false; }
  });
}

function init() {
  $('#togglePassword').addEventListener('click', () => {
    const input = $('#loginPassword'); input.type = input.type === 'password' ? 'text' : 'password';
  });
  $('#forgotPassword').addEventListener('click', () => showToast('Contacta al administrador para restablecer tu contraseña.'));
  $('#notificationBtn').addEventListener('click', () => navigate('mantenimiento'));
  $('#logoutBtn').addEventListener('click', logout);
  $('#openSidebar').addEventListener('click', () => $('#sidebar').classList.add('open'));
  $('#closeSidebar').addEventListener('click', () => $('#sidebar').classList.remove('open'));
  $$('.nav-item[data-route]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.route)));
  initModalDelegation();

  $('#loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const username = $('#loginUser').value.trim();
    const password = $('#loginPassword').value;
    const submit = $('#loginForm').querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const user = await HGMAuthService.login(username, password);
      setUser(user);
      showToast('Autenticación satisfactoria.');
      await navigate('dashboard');
    } catch (error) {
      showToast(error.message || 'Error en la autenticación.');
    } finally { submit.disabled = false; }
  });

  const savedToken = HGMApi.getToken();
  if (savedToken) {
    HGMAuthService.profile()
      .then(async user => {
        if (!user) throw new Error('No fue posible validar la sesión.');
        setUser(user);
        await navigate('dashboard');
      })
      .catch(() => {
        HGMAuthService.logout();
        localStorage.removeItem('gm_user');
        $('#appView').classList.add('hidden');
        $('#loginView').classList.remove('hidden');
      });
  }
}

document.addEventListener('DOMContentLoaded', init);
