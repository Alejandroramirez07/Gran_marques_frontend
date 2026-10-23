'use strict';
// Pruebas de integración de la API. Arranque primero `npm start` en otra terminal.
const fs = require('fs');
const path = require('path');
const base = process.env.API_BASE_URL || 'http://localhost:3000';
const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
const password = 'HotelTest2026!';
const checks = [];
let tokenAdmin = '';
let tokenReception = '';
let guestId = '';
let roomId = '';
let reservationId = '';
let serviceId = '';
let invoiceId = '';
let maintenanceId = '';
let createdRoomId = '';

async function call(name, method, route, expectedStatus, body, token = tokenAdmin) {
  let response;
  try {
    response = await fetch(`${base}${route}`, {
      method,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    const passed = response.status === expectedStatus;
    checks.push({ name, method, route, expectedStatus, actualStatus: response.status, passed, message: data.message || '' });
    console.log(`${passed ? 'PASS' : 'FAIL'} ${method} ${route} — esperado ${expectedStatus}, recibido ${response.status}`);
    if (!passed) console.error(JSON.stringify(data));
    return { response, data };
  } catch (error) {
    checks.push({ name, method, route, expectedStatus, actualStatus: 0, passed: false, message: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
    return { response: null, data: {} };
  }
}
function assert(name, condition, message) {
  checks.push({ name, expectedStatus: 'validación', actualStatus: condition ? 'OK' : 'FAIL', passed: Boolean(condition), message: message || '' });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}`);
}
function datePlus(days) { const d = new Date(); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }

(async () => {
  const health = await call('Estado de API', 'GET', '/api/health', 200, undefined, '');
  assert('Respuesta de salud incluye success=true', health.data.success === true);

  const adminLogin = await call('Login administración demo', 'POST', '/api/auth/login', 200, { username: 'admin', password: '123456' }, '');
  tokenAdmin = adminLogin.data.data?.token || '';
  assert('El login de administración devuelve token', Boolean(tokenAdmin));

  const profile = await call('Consultar perfil con token', 'GET', '/api/auth/me', 200, undefined, tokenAdmin);
  assert('El perfil tiene rol administrativo', profile.data.data?.user?.role === 'Administración');

  const register = await call('Registrar usuario API', 'POST', '/api/auth/register', 201, {
    name: 'Usuario de prueba EV04', username: `ev03_${suffix}`, email: `ev03_${suffix}@hotel.test`, password
  }, '');
  const login = await call('Iniciar sesión usuario recién registrado', 'POST', '/api/auth/login', 200, { username: `ev03_${suffix}`, password }, '');
  tokenReception = login.data.data?.token || '';
  assert('El usuario registrado obtiene token', Boolean(tokenReception));
  await call('Rechazar contraseña incorrecta', 'POST', '/api/auth/login', 401, { username: `ev03_${suffix}`, password: 'ClaveIncorrecta99' }, '');

  const guest = await call('Crear huésped', 'POST', '/api/guests', 201, {
    name: 'Huésped Prueba EV04', document: `CC-${suffix}`, email: `guest_${suffix}@hotel.test`, phone: '3000000000', nationality: 'Colombiana'
  });
  guestId = guest.data.data?.guest?.id || '';
  assert('El huésped creado tiene identificador', Boolean(guestId));
  const guestSearch = await call('Buscar huésped por documento', 'GET', `/api/guests?q=${encodeURIComponent(suffix)}`, 200);
  assert('La búsqueda devuelve el huésped nuevo', (guestSearch.data.data?.count || 0) >= 1);

  const rooms = await call('Consultar catálogo de habitaciones', 'GET', '/api/rooms', 200);
  roomId = rooms.data.data?.items?.find(r => r.status === 'Disponible')?.id || '';
  assert('El catálogo contiene habitación disponible', Boolean(roomId));

  const start = datePlus(60 + (Date.now() % 700));
  const endDate = new Date(`${start}T00:00:00Z`); endDate.setUTCDate(endDate.getUTCDate() + 2);
  const checkOut = endDate.toISOString().slice(0, 10);
  const reservation = await call('Crear reserva', 'POST', '/api/reservations', 201, {
    guestId, roomId, checkIn: start, checkOut, guestsCount: 1, notes: 'Reserva automatizada de integración'
  });
  reservationId = reservation.data.data?.reservation?.id || '';
  assert('La reserva calcula las noches', reservation.data.data?.reservation?.nights === 2);
  await call('Evitar reserva duplicada en mismo rango', 'POST', '/api/reservations', 409, {
    guestId, roomId, checkIn: start, checkOut, guestsCount: 1
  });
  await call('Consultar reserva por identificador', 'GET', `/api/reservations/${reservationId}`, 200);

  const services = await call('Consultar servicios adicionales', 'GET', '/api/services?active=true', 200);
  serviceId = services.data.data?.items?.[0]?.id || '';
  assert('Existe servicio adicional activo', Boolean(serviceId));
  const attachedService = await call('Agregar consumo a reserva', 'POST', `/api/reservations/${reservationId}/services`, 201, { serviceId, quantity: 1 });
  assert('El consumo queda vinculado a la reserva', attachedService.data.data?.reservation?.services?.length === 1);

  const invoice = await call('Generar factura desde reserva', 'POST', '/api/invoices', 201, { reservationId });
  invoiceId = invoice.data.data?.invoice?.id || '';
  assert('La factura tiene total positivo', Number(invoice.data.data?.invoice?.total) > 0);
  await call('Evitar dos facturas para la misma reserva', 'POST', '/api/invoices', 409, { reservationId });
  const payment = await call('Registrar abono parcial', 'POST', `/api/invoices/${invoiceId}/payments`, 201, { amount: 10000, method: 'Transferencia', reference: `TEST-${suffix}` });
  assert('El abono deja estado parcial cuando corresponde', ['Parcial', 'Pagada'].includes(payment.data.data?.invoice?.paymentStatus));

  const maintenance = await call('Crear solicitud de mantenimiento', 'POST', '/api/maintenance', 201, { roomId, area: 'Habitación', description: 'Revisión preventiva de prueba', priority: 'Media' });
  maintenanceId = maintenance.data.data?.item?.id || '';
  await call('Actualizar estado de mantenimiento', 'PATCH', `/api/maintenance/${maintenanceId}`, 200, { status: 'En proceso', notes: 'Asignado en prueba automática' });
  const reports = await call('Consultar resumen gerencial', 'GET', '/api/reports/summary', 200);
  assert('El reporte contiene indicadores', Number.isFinite(reports.data.data?.rooms) && Number.isFinite(reports.data.data?.reservationsTotal));

  // La recepción puede operar, pero no modificar el catálogo administrativo.
  await call('Bloquear creación de habitaciones a recepción', 'POST', '/api/rooms', 403, { number: `T${suffix.slice(-5)}`, type: 'Sencilla', capacity: 1, rate: 90000 }, tokenReception);
  const createRoom = await call('Crear habitación con administración', 'POST', '/api/rooms', 201, { number: `T${suffix.slice(-5)}`, type: 'Sencilla', capacity: 1, rate: 90000 }, tokenAdmin);
  createdRoomId = createRoom.data.data?.room?.id || '';
  await call('Rechazar acceso sin token', 'GET', '/api/guests', 401, undefined, '');

  const failed = checks.filter(item => !item.passed);
  const summary = {
    generatedAt: new Date().toISOString(), baseUrl: base,
    total: checks.length, passed: checks.length - failed.length, failed: failed.length,
    results: checks
  };
  const docsDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'resultado_pruebas_api_EV04.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(docsDir, 'resultado_pruebas_api_EV04.txt'), `Pruebas de integración API — Hotel Gran Marques\nFecha: ${summary.generatedAt}\nTotal: ${summary.total}\nAprobadas: ${summary.passed}\nFallidas: ${summary.failed}\n\n${checks.map(c => `${c.passed ? 'PASS' : 'FAIL'} | ${c.name} | ${c.method || ''} ${c.route || ''} | ${c.message || ''}`).join('\n')}\n`);
  console.log(`\nResultado final: ${summary.passed}/${summary.total} aprobadas; ${summary.failed} fallidas.`);
  if (failed.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
