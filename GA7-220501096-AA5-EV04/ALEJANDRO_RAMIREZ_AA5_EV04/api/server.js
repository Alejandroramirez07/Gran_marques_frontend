'use strict';

/**
 * Hotel Gran Marques — API REST para la gestión hotelera.
 * Evidencia GA7-220501096-AA5-EV04.
 *
 * Se utilizan únicamente módulos nativos de Node.js. Los datos de demostración
 * se persisten en archivos JSON dentro de api/data. Para producción se debe
 * reemplazar este almacenamiento por una base de datos transaccional.
 */
const http = require('http');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const HOTEL_FILE = path.join(DATA_DIR, 'hotel.json');
let PORT = Number(process.env.PORT || 3000);
let JWT_SECRET = process.env.JWT_SECRET || 'solo-desarrollo-cambiar-en-produccion';
const TOKEN_SECONDS = 60 * 60;

// Carga variables sencillas desde .env sin agregar dependencias externas.
function loadEnvFile() {
  const file = path.join(ROOT, '.env');
  if (!fsSync.existsSync(file)) return;
  for (const line of fsSync.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !Object.prototype.hasOwnProperty.call(process.env, match[1])) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  PORT = Number(process.env.PORT || PORT);
  JWT_SECRET = process.env.JWT_SECRET || JWT_SECRET;
}
loadEnvFile();

function sendJson(res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}
function ok(data, message = 'Operación realizada correctamente.') { return { success: true, message, data }; }
function fail(message, details) { return { success: false, message, ...(details ? { details } : {}) }; }
function newId() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }
function slug(value) { return String(value || '').trim().toLowerCase(); }
function toNumber(value) { const n = Number(value); return Number.isFinite(n) ? n : NaN; }

async function writeJsonAtomic(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(temp, file);
}
async function readUsers() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { return JSON.parse(await fs.readFile(USERS_FILE, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function saveUsers(users) { await writeJsonAtomic(USERS_FILE, users); }

const EMPTY_DB = { guests: [], rooms: [], reservations: [], services: [], invoices: [], maintenance: [] };
async function readDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { return { ...EMPTY_DB, ...JSON.parse(await fs.readFile(HOTEL_FILE, 'utf8')) }; }
  catch (error) { if (error.code === 'ENOENT') return structuredClone(EMPTY_DB); throw error; }
}
async function saveDb(db) { await writeJsonAtomic(HOTEL_FILE, db); }

// scrypt conserva un hash derivado con sal aleatoria en lugar de texto plano.
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, 64, (error, derived) => {
      if (error) return reject(error);
      resolve(`scrypt$${salt.toString('hex')}$${derived.toString('hex')}`);
    });
  });
}
function checkPassword(password, stored) {
  return new Promise((resolve, reject) => {
    try {
      const [algo, saltHex, keyHex] = stored.split('$');
      if (algo !== 'scrypt' || !saltHex || !keyHex) return resolve(false);
      const original = Buffer.from(keyHex, 'hex');
      crypto.scrypt(password, Buffer.from(saltHex, 'hex'), original.length, (error, derived) => {
        if (error) return reject(error);
        resolve(original.length === derived.length && crypto.timingSafeEqual(original, derived));
      });
    } catch { resolve(false); }
  });
}
function b64(value) { return Buffer.from(value).toString('base64url'); }
function issueToken(user) {
  const iat = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64(JSON.stringify({ sub: user.id, username: user.username, role: user.role, iat, exp: iat + TOKEN_SECONDS }));
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}
function readToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('JWT inválido');
  const [header, payload, signature] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest();
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) throw new Error('Firma inválida');
  const h = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (h.alg !== 'HS256' || !claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) throw new Error('Token vencido');
  return claims;
}
function safeUser(user) {
  return { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt };
}
async function ensureSeedData() {
  const users = await readUsers();
  const demos = [
    { name: 'Recepcionista Demo', username: 'recepcion', email: 'recepcion@hotel.test', role: 'Recepción' },
    { name: 'Administrador Demo', username: 'admin', email: 'admin@hotel.test', role: 'Administración' }
  ];
  let changed = false;
  for (const demo of demos) {
    if (!users.some(u => slug(u.username) === demo.username)) {
      users.push({ id: newId(), ...demo, passwordHash: await hashPassword('123456'), createdAt: now(), demoAccount: true });
      changed = true;
    }
  }
  if (changed || !fsSync.existsSync(USERS_FILE)) await saveUsers(users);

  const db = await readDb();
  let dbChanged = false;
  if (db.rooms.length === 0) {
    db.rooms = [
      { id: newId(), number: '101', type: 'Sencilla', capacity: 1, rate: 120000, status: 'Disponible', description: 'Habitación sencilla', createdAt: now() },
      { id: newId(), number: '102', type: 'Doble', capacity: 2, rate: 180000, status: 'Disponible', description: 'Habitación doble', createdAt: now() },
      { id: newId(), number: '201', type: 'Suite', capacity: 3, rate: 280000, status: 'Disponible', description: 'Suite familiar', createdAt: now() },
      { id: newId(), number: '202', type: 'Doble', capacity: 2, rate: 185000, status: 'Mantenimiento', description: 'Habitación en revisión', createdAt: now() }
    ]; dbChanged = true;
  }
  if (db.services.length === 0) {
    db.services = [
      { id: newId(), name: 'Restaurante', description: 'Servicio de restaurante', price: 45000, active: true, createdAt: now() },
      { id: newId(), name: 'Spa', description: 'Acceso al spa', price: 80000, active: true, createdAt: now() },
      { id: newId(), name: 'Lavandería', description: 'Servicio de lavandería', price: 25000, active: true, createdAt: now() },
      { id: newId(), name: 'Room service', description: 'Servicio a la habitación', price: 35000, active: true, createdAt: now() }
    ]; dbChanged = true;
  }
  if (dbChanged || !fsSync.existsSync(HOTEL_FILE)) await saveDb(db);
}

function readBody(req, maxBytes = 50000) {
  return new Promise((resolve, reject) => {
    let raw = ''; let tooLarge = false;
    req.on('data', chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw) > maxBytes) tooLarge = true;
    });
    req.on('end', () => {
      if (tooLarge) { const e = new Error('El cuerpo de la solicitud supera el límite permitido.'); e.statusCode = 413; return reject(e); }
      if (!raw.trim()) return resolve({});
      try {
        const obj = JSON.parse(raw);
        if (!obj || Array.isArray(obj) || typeof obj !== 'object') throw new Error();
        resolve(obj);
      } catch { const e = new Error('JSON inválido. Envíe un objeto JSON.'); e.statusCode = 400; reject(e); }
    });
    req.on('error', reject);
  });
}
function authClaims(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return { error: 'Se requiere Authorization: Bearer <token>.' };
  try { return { claims: readToken(match[1]) }; }
  catch { return { error: 'Token inválido o expirado.' }; }
}
function isAdmin(claims) { return ['administración', 'administrador', 'admin'].includes(slug(claims.role)); }
function validateRequired(body, fields) { return fields.filter(k => !(typeof body[k] === 'string' && body[k].trim()) && !(typeof body[k] === 'number' && Number.isFinite(body[k]))); }
function dateValid(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)); }
function nightsBetween(start, end) { return Math.ceil((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000); }
function reservationOverlaps(db, roomId, checkIn, checkOut, ignoreId = null) {
  return db.reservations.some(r => r.roomId === roomId && r.id !== ignoreId && !['Cancelada', 'Finalizada'].includes(r.status) && checkIn < r.checkOut && checkOut > r.checkIn);
}
function findById(list, id) { return list.find(item => item.id === id); }
function filterText(list, query, fields) {
  if (!query) return list;
  const q = slug(query);
  return list.filter(item => fields.some(field => slug(item[field]).includes(q)));
}
function routeId(pathname, prefix) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = pathname.match(new RegExp(`^${escaped}/([^/]+)$`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function handle(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = url.pathname;
  const method = req.method;

  // Salud y documentación de la API.
  if (method === 'GET' && route === '/api/health') return sendJson(res, 200, ok({ service: 'Hotel Gran Marques API', status: 'ok', version: '2.0.0' }, 'Servicio disponible.'));
  if (method === 'GET' && route === '/api') return sendJson(res, 200, ok({ documentation: '/docs/API_REFERENCE.md', openapi: '/docs/openapi.json', endpoints: 'Consultar docs/ENDPOINTS_API.txt' }, 'API REST de Hotel Gran Marques.'));

  // Autenticación. El hash de la contraseña nunca se devuelve al cliente.
  if (method === 'POST' && route === '/api/auth/register') {
    const body = await readBody(req);
    const missing = validateRequired(body, ['name', 'username', 'email', 'password']);
    if (missing.length) return sendJson(res, 400, fail('Faltan campos obligatorios.', { fields: missing }));
    if (body.name.trim().length > 100 || body.username.trim().length < 3 || body.username.trim().length > 30) return sendJson(res, 400, fail('Nombre o usuario fuera de los límites permitidos.'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) return sendJson(res, 400, fail('El correo no tiene un formato válido.'));
    if (body.password.length < 8 || body.password.length > 72) return sendJson(res, 400, fail('La contraseña debe tener entre 8 y 72 caracteres.'));
    const users = await readUsers();
    const username = slug(body.username); const email = slug(body.email);
    if (users.some(u => slug(u.username) === username || slug(u.email) === email)) return sendJson(res, 409, fail('El usuario o correo ya está registrado.'));
    // El registro público no permite que una persona se asigne rol de administrador.
    const user = { id: newId(), name: body.name.trim(), username, email, passwordHash: await hashPassword(body.password), role: 'Recepción', createdAt: now() };
    users.push(user); await saveUsers(users);
    return sendJson(res, 201, ok({ user: safeUser(user) }, 'Usuario registrado satisfactoriamente.'));
  }
  if (method === 'POST' && route === '/api/auth/login') {
    const body = await readBody(req);
    if (typeof body.username !== 'string' || !body.username.trim() || typeof body.password !== 'string' || !body.password) return sendJson(res, 400, fail('Debe enviar username y password.'));
    const users = await readUsers(); const key = slug(body.username);
    const user = users.find(u => slug(u.username) === key || slug(u.email) === key);
    const valid = user ? await checkPassword(body.password, user.passwordHash) : false;
    if (!valid) return sendJson(res, 401, fail('Error en la autenticación.'));
    return sendJson(res, 200, ok({ token: issueToken(user), tokenType: 'Bearer', expiresIn: TOKEN_SECONDS, user: safeUser(user) }, 'Autenticación satisfactoria.'));
  }
  if (method === 'GET' && route === '/api/auth/me') {
    const auth = authClaims(req); if (auth.error) return sendJson(res, 401, fail(auth.error));
    const users = await readUsers(); const user = users.find(u => u.id === auth.claims.sub);
    if (!user) return sendJson(res, 404, fail('Usuario no encontrado.'));
    return sendJson(res, 200, ok({ user: safeUser(user) }, 'Perfil consultado.'));
  }

  // Toda operación de negocio requiere un token válido.
  if (route.startsWith('/api/') && !['/api/health', '/api', '/api/auth/register', '/api/auth/login'].includes(route)) {
    const auth = authClaims(req); if (auth.error) return sendJson(res, 401, fail(auth.error));
    req.auth = auth.claims;
  }

  const db = await readDb();

  // HUÉSPEDES: consulta, búsqueda, registro, actualización y eliminación.
  if (route === '/api/guests' && method === 'GET') {
    let items = filterText(db.guests, url.searchParams.get('q'), ['name', 'document', 'email', 'phone']);
    return sendJson(res, 200, ok({ items, count: items.length }, 'Huéspedes consultados.'));
  }
  if (route === '/api/guests' && method === 'POST') {
    const body = await readBody(req); const missing = validateRequired(body, ['name', 'document']);
    if (missing.length) return sendJson(res, 400, fail('Nombre y documento son obligatorios.', { fields: missing }));
    if (db.guests.some(g => slug(g.document) === slug(body.document))) return sendJson(res, 409, fail('Ya existe un huésped con ese documento.'));
    const guest = { id: newId(), name: body.name.trim(), document: String(body.document).trim(), email: String(body.email || '').trim(), phone: String(body.phone || '').trim(), nationality: String(body.nationality || '').trim(), createdAt: now() };
    db.guests.push(guest); await saveDb(db); return sendJson(res, 201, ok({ guest }, 'Huésped creado.'));
  }
  const guestId = routeId(route, '/api/guests');
  if (guestId && method === 'GET') {
    const guest = findById(db.guests, guestId); return guest ? sendJson(res, 200, ok({ guest })) : sendJson(res, 404, fail('Huésped no encontrado.'));
  }
  if (guestId && ['PATCH', 'PUT'].includes(method)) {
    const guest = findById(db.guests, guestId); if (!guest) return sendJson(res, 404, fail('Huésped no encontrado.'));
    const body = await readBody(req);
    for (const key of ['name', 'document', 'email', 'phone', 'nationality']) if (body[key] !== undefined) guest[key] = String(body[key]).trim();
    if (!guest.name || !guest.document) return sendJson(res, 400, fail('Nombre y documento son obligatorios.'));
    if (db.guests.some(g => g.id !== guest.id && slug(g.document) === slug(guest.document))) return sendJson(res, 409, fail('El documento ya pertenece a otro huésped.'));
    await saveDb(db); return sendJson(res, 200, ok({ guest }, 'Huésped actualizado.'));
  }
  if (guestId && method === 'DELETE') {
    if (!isAdmin(req.auth)) return sendJson(res, 403, fail('Solo administración puede eliminar huéspedes.'));
    if (!findById(db.guests, guestId)) return sendJson(res, 404, fail('Huésped no encontrado.'));
    if (db.reservations.some(r => r.guestId === guestId)) return sendJson(res, 409, fail('No se puede eliminar un huésped con reservas asociadas.'));
    db.guests = db.guests.filter(g => g.id !== guestId); await saveDb(db); return sendJson(res, 200, ok({}, 'Huésped eliminado.'));
  }

  // HABITACIONES: las escrituras de catálogo son solo para administración.
  if (route === '/api/rooms' && method === 'GET') {
    let rooms = db.rooms;
    if (url.searchParams.get('status')) rooms = rooms.filter(r => slug(r.status) === slug(url.searchParams.get('status')));
    if (url.searchParams.get('type')) rooms = rooms.filter(r => slug(r.type) === slug(url.searchParams.get('type')));
    return sendJson(res, 200, ok({ items: rooms, count: rooms.length }, 'Habitaciones consultadas.'));
  }
  if (route === '/api/rooms' && method === 'POST') {
    if (!isAdmin(req.auth)) return sendJson(res, 403, fail('Solo administración puede crear habitaciones.'));
    const b = await readBody(req); const missing = validateRequired(b, ['number', 'type', 'capacity', 'rate']);
    if (missing.length) return sendJson(res, 400, fail('Complete número, tipo, capacidad y tarifa.', { fields: missing }));
    if (db.rooms.some(r => slug(r.number) === slug(b.number))) return sendJson(res, 409, fail('El número de habitación ya existe.'));
    const capacity = toNumber(b.capacity); const rate = toNumber(b.rate);
    if (!Number.isInteger(capacity) || capacity < 1 || !Number.isFinite(rate) || rate < 0) return sendJson(res, 400, fail('Capacidad o tarifa inválida.'));
    const room = { id: newId(), number: String(b.number).trim(), type: String(b.type).trim(), capacity, rate, status: b.status || 'Disponible', description: String(b.description || '').trim(), createdAt: now() };
    if (!['Disponible', 'Ocupada', 'Mantenimiento'].includes(room.status)) return sendJson(res, 400, fail('Estado de habitación inválido.'));
    db.rooms.push(room); await saveDb(db); return sendJson(res, 201, ok({ room }, 'Habitación creada.'));
  }
  const roomId = routeId(route, '/api/rooms');
  if (roomId && method === 'GET') {
    const room = findById(db.rooms, roomId); return room ? sendJson(res, 200, ok({ room })) : sendJson(res, 404, fail('Habitación no encontrada.'));
  }
  if (roomId && ['PATCH', 'PUT'].includes(method)) {
    if (!isAdmin(req.auth)) return sendJson(res, 403, fail('Solo administración puede actualizar habitaciones.'));
    const room = findById(db.rooms, roomId); if (!room) return sendJson(res, 404, fail('Habitación no encontrada.'));
    const b = await readBody(req);
    for (const key of ['number', 'type', 'description', 'status']) if (b[key] !== undefined) room[key] = String(b[key]).trim();
    if (b.capacity !== undefined) room.capacity = toNumber(b.capacity);
    if (b.rate !== undefined) room.rate = toNumber(b.rate);
    if (!room.number || !room.type || !Number.isInteger(room.capacity) || room.capacity < 1 || !Number.isFinite(room.rate) || room.rate < 0 || !['Disponible', 'Ocupada', 'Mantenimiento'].includes(room.status)) return sendJson(res, 400, fail('Los datos de habitación no son válidos.'));
    if (db.rooms.some(r => r.id !== room.id && slug(r.number) === slug(room.number))) return sendJson(res, 409, fail('El número de habitación ya existe.'));
    await saveDb(db); return sendJson(res, 200, ok({ room }, 'Habitación actualizada.'));
  }
  if (roomId && method === 'DELETE') {
    if (!isAdmin(req.auth)) return sendJson(res, 403, fail('Solo administración puede eliminar habitaciones.'));
    if (!findById(db.rooms, roomId)) return sendJson(res, 404, fail('Habitación no encontrada.'));
    if (db.reservations.some(r => r.roomId === roomId && !['Cancelada', 'Finalizada'].includes(r.status))) return sendJson(res, 409, fail('No se puede eliminar una habitación con reservas activas.'));
    db.rooms = db.rooms.filter(r => r.id !== roomId); await saveDb(db); return sendJson(res, 200, ok({}, 'Habitación eliminada.'));
  }

  // RESERVAS: comprueba huésped, habitación, fechas y cruce de estancias.
  if (route === '/api/reservations' && method === 'GET') {
    let items = db.reservations;
    if (url.searchParams.get('status')) items = items.filter(r => slug(r.status) === slug(url.searchParams.get('status')));
    if (url.searchParams.get('guestId')) items = items.filter(r => r.guestId === url.searchParams.get('guestId'));
    if (url.searchParams.get('roomId')) items = items.filter(r => r.roomId === url.searchParams.get('roomId'));
    return sendJson(res, 200, ok({ items, count: items.length }, 'Reservas consultadas.'));
  }
  if (route === '/api/reservations' && method === 'POST') {
    const b = await readBody(req); const missing = validateRequired(b, ['guestId', 'roomId', 'checkIn', 'checkOut', 'guestsCount']);
    if (missing.length) return sendJson(res, 400, fail('Complete los datos obligatorios de reserva.', { fields: missing }));
    const guest = findById(db.guests, String(b.guestId)); const room = findById(db.rooms, String(b.roomId));
    if (!guest) return sendJson(res, 404, fail('Huésped no encontrado.'));
    if (!room) return sendJson(res, 404, fail('Habitación no encontrada.'));
    if (room.status !== 'Disponible') return sendJson(res, 409, fail('La habitación no está disponible para reservar.'));
    if (!dateValid(b.checkIn) || !dateValid(b.checkOut) || b.checkOut <= b.checkIn) return sendJson(res, 400, fail('Las fechas deben ser válidas y la salida posterior al ingreso.'));
    const guestsCount = toNumber(b.guestsCount);
    if (!Number.isInteger(guestsCount) || guestsCount < 1 || guestsCount > room.capacity) return sendJson(res, 400, fail('El número de huéspedes supera la capacidad de la habitación o no es válido.'));
    if (reservationOverlaps(db, room.id, b.checkIn, b.checkOut)) return sendJson(res, 409, fail('La habitación ya tiene una reserva para ese rango de fechas.'));
    const reservation = { id: newId(), guestId: guest.id, guestName: guest.name, roomId: room.id, roomNumber: room.number, checkIn: b.checkIn, checkOut: b.checkOut, nights: nightsBetween(b.checkIn, b.checkOut), guestsCount, status: b.status || 'Confirmada', notes: String(b.notes || '').trim(), services: [], createdAt: now(), createdBy: req.auth.sub };
    if (!['Pendiente', 'Confirmada'].includes(reservation.status)) return sendJson(res, 400, fail('El estado inicial debe ser Pendiente o Confirmada.'));
    db.reservations.push(reservation); await saveDb(db); return sendJson(res, 201, ok({ reservation }, 'Reserva creada.'));
  }
  const reservationId = routeId(route, '/api/reservations');
  if (reservationId && method === 'GET') {
    const r = findById(db.reservations, reservationId); return r ? sendJson(res, 200, ok({ reservation: r })) : sendJson(res, 404, fail('Reserva no encontrada.'));
  }
  if (reservationId && ['PATCH', 'PUT'].includes(method)) {
    const r = findById(db.reservations, reservationId); if (!r) return sendJson(res, 404, fail('Reserva no encontrada.'));
    const b = await readBody(req);
    if (b.status !== undefined) {
      if (!['Pendiente', 'Confirmada', 'Cancelada', 'Finalizada'].includes(b.status)) return sendJson(res, 400, fail('Estado de reserva inválido.'));
      r.status = b.status;
    }
    if (b.notes !== undefined) r.notes = String(b.notes).trim();
    if (b.checkIn !== undefined || b.checkOut !== undefined) {
      const start = b.checkIn || r.checkIn; const end = b.checkOut || r.checkOut;
      if (!dateValid(start) || !dateValid(end) || end <= start) return sendJson(res, 400, fail('Rango de fechas inválido.'));
      if (reservationOverlaps(db, r.roomId, start, end, r.id)) return sendJson(res, 409, fail('El nuevo rango cruza otra reserva.'));
      r.checkIn = start; r.checkOut = end; r.nights = nightsBetween(start, end);
    }
    r.updatedAt = now(); await saveDb(db); return sendJson(res, 200, ok({ reservation: r }, 'Reserva actualizada.'));
  }
  if (reservationId && method === 'DELETE') {
    const r = findById(db.reservations, reservationId); if (!r) return sendJson(res, 404, fail('Reserva no encontrada.'));
    if (db.invoices.some(i => i.reservationId === reservationId)) return sendJson(res, 409, fail('La reserva tiene factura asociada; cambie su estado a Cancelada en lugar de eliminarla.'));
    db.reservations = db.reservations.filter(x => x.id !== reservationId); await saveDb(db); return sendJson(res, 200, ok({}, 'Reserva eliminada.'));
  }
  // Registra un consumo adicional ligado a la reserva.
  const reservationServiceMatch = route.match(/^\/api\/reservations\/([^/]+)\/services$/);
  if (reservationServiceMatch && method === 'POST') {
    const id = decodeURIComponent(reservationServiceMatch[1]); const r = findById(db.reservations, id);
    if (!r) return sendJson(res, 404, fail('Reserva no encontrada.'));
    if (r.status === 'Cancelada' || r.status === 'Finalizada') return sendJson(res, 409, fail('No se pueden agregar servicios a una reserva cancelada o finalizada.'));
    const b = await readBody(req); const service = findById(db.services, String(b.serviceId || ''));
    if (!service || !service.active) return sendJson(res, 404, fail('Servicio activo no encontrado.'));
    const quantity = toNumber(b.quantity === undefined ? 1 : b.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) return sendJson(res, 400, fail('La cantidad debe ser un entero entre 1 y 50.'));
    const item = { id: newId(), serviceId: service.id, name: service.name, quantity, unitPrice: service.price, total: quantity * service.price, addedAt: now() };
    r.services.push(item); await saveDb(db); return sendJson(res, 201, ok({ reservation: r, item }, 'Servicio agregado a la reserva.'));
  }

  // SERVICIOS adicionales del hotel.
  if (route === '/api/services' && method === 'GET') {
    let items = db.services;
    if (url.searchParams.get('active') !== null) items = items.filter(s => String(s.active) === url.searchParams.get('active'));
    return sendJson(res, 200, ok({ items, count: items.length }, 'Servicios consultados.'));
  }
  if (route === '/api/services' && method === 'POST') {
    if (!isAdmin(req.auth)) return sendJson(res, 403, fail('Solo administración puede crear servicios.'));
    const b = await readBody(req); const missing = validateRequired(b, ['name', 'price']);
    if (missing.length) return sendJson(res, 400, fail('Nombre y precio son obligatorios.', { fields: missing }));
    const price = toNumber(b.price); if (!Number.isFinite(price) || price < 0) return sendJson(res, 400, fail('El precio debe ser un número igual o mayor que cero.'));
    const service = { id: newId(), name: String(b.name).trim(), description: String(b.description || '').trim(), price, active: b.active !== false, createdAt: now() };
    db.services.push(service); await saveDb(db); return sendJson(res, 201, ok({ service }, 'Servicio creado.'));
  }
  const serviceId = routeId(route, '/api/services');
  if (serviceId && method === 'GET') {
    const service = findById(db.services, serviceId); return service ? sendJson(res, 200, ok({ service })) : sendJson(res, 404, fail('Servicio no encontrado.'));
  }
  if (serviceId && ['PATCH', 'PUT'].includes(method)) {
    if (!isAdmin(req.auth)) return sendJson(res, 403, fail('Solo administración puede actualizar servicios.'));
    const service = findById(db.services, serviceId); if (!service) return sendJson(res, 404, fail('Servicio no encontrado.'));
    const b = await readBody(req);
    if (b.name !== undefined) service.name = String(b.name).trim();
    if (b.description !== undefined) service.description = String(b.description).trim();
    if (b.price !== undefined) service.price = toNumber(b.price);
    if (b.active !== undefined) service.active = Boolean(b.active);
    if (!service.name || !Number.isFinite(service.price) || service.price < 0) return sendJson(res, 400, fail('Datos del servicio inválidos.'));
    await saveDb(db); return sendJson(res, 200, ok({ service }, 'Servicio actualizado.'));
  }
  if (serviceId && method === 'DELETE') {
    if (!isAdmin(req.auth)) return sendJson(res, 403, fail('Solo administración puede eliminar servicios.'));
    const service = findById(db.services, serviceId); if (!service) return sendJson(res, 404, fail('Servicio no encontrado.'));
    if (db.reservations.some(r => r.services.some(s => s.serviceId === serviceId))) return sendJson(res, 409, fail('El servicio ya está asociado a consumos; desactívelo en vez de eliminarlo.'));
    db.services = db.services.filter(s => s.id !== serviceId); await saveDb(db); return sendJson(res, 200, ok({}, 'Servicio eliminado.'));
  }

  // FACTURACIÓN: crea factura desde la reserva y los consumos asociados.
  if (route === '/api/invoices' && method === 'GET') {
    let items = db.invoices;
    if (url.searchParams.get('paymentStatus')) items = items.filter(i => slug(i.paymentStatus) === slug(url.searchParams.get('paymentStatus')));
    if (url.searchParams.get('reservationId')) items = items.filter(i => i.reservationId === url.searchParams.get('reservationId'));
    return sendJson(res, 200, ok({ items, count: items.length }, 'Facturas consultadas.'));
  }
  if (route === '/api/invoices' && method === 'POST') {
    const b = await readBody(req); if (typeof b.reservationId !== 'string' || !b.reservationId) return sendJson(res, 400, fail('reservationId es obligatorio.'));
    const r = findById(db.reservations, b.reservationId); if (!r) return sendJson(res, 404, fail('Reserva no encontrada.'));
    if (db.invoices.some(i => i.reservationId === r.id)) return sendJson(res, 409, fail('La reserva ya tiene una factura.'));
    const room = findById(db.rooms, r.roomId); const guest = findById(db.guests, r.guestId);
    const items = [{ description: `Hospedaje habitación ${r.roomNumber} (${r.nights} noches)`, quantity: r.nights, unitPrice: room.rate, total: r.nights * room.rate }, ...r.services.map(s => ({ description: s.name, quantity: s.quantity, unitPrice: s.unitPrice, total: s.total }))];
    const subtotal = items.reduce((sum, item) => sum + item.total, 0); const invoice = { id: newId(), number: `GM-${Date.now().toString().slice(-8)}`, reservationId: r.id, guestId: r.guestId, guestName: guest.name, items, subtotal, tax: 0, total: subtotal, paymentStatus: 'Pendiente', payments: [], createdAt: now() };
    db.invoices.push(invoice); await saveDb(db); return sendJson(res, 201, ok({ invoice }, 'Factura generada desde la reserva.'));
  }
  const invoiceId = routeId(route, '/api/invoices');
  if (invoiceId && method === 'GET') {
    const invoice = findById(db.invoices, invoiceId); return invoice ? sendJson(res, 200, ok({ invoice })) : sendJson(res, 404, fail('Factura no encontrada.'));
  }
  const paymentMatch = route.match(/^\/api\/invoices\/([^/]+)\/payments$/);
  if (paymentMatch && method === 'POST') {
    const id = decodeURIComponent(paymentMatch[1]); const invoice = findById(db.invoices, id);
    if (!invoice) return sendJson(res, 404, fail('Factura no encontrada.'));
    const b = await readBody(req); const amount = toNumber(b.amount);
    if (!Number.isFinite(amount) || amount <= 0) return sendJson(res, 400, fail('amount debe ser un número mayor que cero.'));
    const paidBefore = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    if (paidBefore + amount > invoice.total) return sendJson(res, 409, fail('El pago supera el saldo pendiente.'));
    const methodName = String(b.method || 'Efectivo').trim();
    if (!['Efectivo', 'Tarjeta', 'Transferencia', 'Otro'].includes(methodName)) return sendJson(res, 400, fail('Método de pago inválido.'));
    const payment = { id: newId(), amount, method: methodName, reference: String(b.reference || '').trim(), paidAt: now(), receivedBy: req.auth.sub };
    invoice.payments.push(payment);
    const paid = paidBefore + amount; invoice.paymentStatus = paid >= invoice.total ? 'Pagada' : paid > 0 ? 'Parcial' : 'Pendiente';
    await saveDb(db); return sendJson(res, 201, ok({ invoice, payment, balance: invoice.total - paid }, 'Pago registrado.'));
  }

  // MANTENIMIENTO: tickets y actualización de sus estados.
  if (route === '/api/maintenance' && method === 'GET') {
    let items = db.maintenance;
    if (url.searchParams.get('status')) items = items.filter(m => slug(m.status) === slug(url.searchParams.get('status')));
    return sendJson(res, 200, ok({ items, count: items.length }, 'Solicitudes de mantenimiento consultadas.'));
  }
  if (route === '/api/maintenance' && method === 'POST') {
    const b = await readBody(req); const missing = validateRequired(b, ['area', 'description']);
    if (missing.length) return sendJson(res, 400, fail('Área y descripción son obligatorias.', { fields: missing }));
    if (b.roomId && !findById(db.rooms, String(b.roomId))) return sendJson(res, 404, fail('Habitación asociada no encontrada.'));
    const priority = b.priority || 'Media'; if (!['Baja', 'Media', 'Alta', 'Urgente'].includes(priority)) return sendJson(res, 400, fail('Prioridad inválida.'));
    const item = { id: newId(), roomId: b.roomId || null, area: String(b.area).trim(), description: String(b.description).trim(), priority, status: 'Abierta', notes: '', createdBy: req.auth.sub, createdAt: now(), updatedAt: now() };
    db.maintenance.push(item); await saveDb(db); return sendJson(res, 201, ok({ item }, 'Solicitud de mantenimiento creada.'));
  }
  const maintenanceId = routeId(route, '/api/maintenance');
  if (maintenanceId && method === 'GET') {
    const item = findById(db.maintenance, maintenanceId); return item ? sendJson(res, 200, ok({ item })) : sendJson(res, 404, fail('Solicitud de mantenimiento no encontrada.'));
  }
  if (maintenanceId && ['PATCH', 'PUT'].includes(method)) {
    const item = findById(db.maintenance, maintenanceId); if (!item) return sendJson(res, 404, fail('Solicitud de mantenimiento no encontrada.'));
    const b = await readBody(req);
    if (b.status !== undefined) { if (!['Abierta', 'En proceso', 'Resuelta', 'Cancelada'].includes(b.status)) return sendJson(res, 400, fail('Estado de mantenimiento inválido.')); item.status = b.status; }
    if (b.priority !== undefined) { if (!['Baja', 'Media', 'Alta', 'Urgente'].includes(b.priority)) return sendJson(res, 400, fail('Prioridad inválida.')); item.priority = b.priority; }
    if (b.notes !== undefined) item.notes = String(b.notes).trim(); item.updatedAt = now(); await saveDb(db);
    return sendJson(res, 200, ok({ item }, 'Solicitud de mantenimiento actualizada.'));
  }

  // REPORTES agregados para el panel de administración y gerencia.
  if (method === 'GET' && route === '/api/reports/summary') {
    const activeReservations = db.reservations.filter(r => ['Pendiente', 'Confirmada'].includes(r.status));
    const occupancy = db.rooms.length ? Math.round((db.rooms.filter(r => r.status === 'Ocupada').length / db.rooms.length) * 100) : 0;
    const revenue = db.invoices.reduce((sum, i) => sum + i.payments.reduce((pSum, p) => pSum + p.amount, 0), 0);
    const pendingInvoices = db.invoices.filter(i => i.paymentStatus !== 'Pagada').length;
    const maintenanceOpen = db.maintenance.filter(m => ['Abierta', 'En proceso'].includes(m.status)).length;
    return sendJson(res, 200, ok({ guests: db.guests.length, rooms: db.rooms.length, reservationsActive: activeReservations.length, reservationsTotal: db.reservations.length, occupancyPercent: occupancy, invoices: db.invoices.length, invoicesPending: pendingInvoices, collectedRevenue: revenue, maintenanceOpen, generatedAt: now() }, 'Resumen gerencial generado.'));
  }

  if (route.startsWith('/api/')) return sendJson(res, 404, fail('Endpoint API no encontrado.'));

  // El servidor continúa sirviendo el frontend original de HTML/CSS/JavaScript.
  const staticFiles = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/index.html': ['index.html', 'text/html; charset=utf-8'],
    '/css/styles.css': [path.join('css', 'styles.css'), 'text/css; charset=utf-8'],
    '/js/app.js': [path.join('js', 'app.js'), 'text/javascript; charset=utf-8']
  };
  if (method === 'GET' && staticFiles[route]) {
    const [relative, contentType] = staticFiles[route]; const file = path.join(ROOT, relative); const content = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': content.length, 'X-Content-Type-Options': 'nosniff' }); return res.end(content);
  }
  return sendJson(res, 404, fail('Recurso no encontrado.'));
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(error => {
    console.error('[API error]', error.stack || error.message);
    if (!res.headersSent) sendJson(res, error.statusCode || 500, fail(error.statusCode ? error.message : 'Error interno del servicio.'));
    else res.end();
  });
});

ensureSeedData().then(() => {
  server.listen(PORT, () => {
    console.log(`Hotel Gran Marques API disponible en http://localhost:${PORT}`);
    console.log('Documentación: docs/API_REFERENCE.md | OpenAPI: docs/openapi.json');
    console.log('Cuentas locales de demostración: recepcion/123456 y admin/123456 (solo desarrollo).');
  });
}).catch(error => { console.error('No se pudo inicializar la API:', error); process.exit(1); });

module.exports = { server };
