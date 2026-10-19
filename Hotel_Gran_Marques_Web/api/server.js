'use strict';

// API REST para registro e inicio de sesión de Hotel Gran Marques.
// Solo utiliza módulos nativos de Node.js: no necesita paquetes externos.
// Las contraseñas se almacenan con scrypt y los tokens usan firma HS256.
const http = require('http');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
let PORT = Number(process.env.PORT || 3000);
const TOKEN_EXPIRES_SECONDS = 60 * 60;
let JWT_SECRET = process.env.JWT_SECRET || 'solo-desarrollo-cambiar-en-produccion';

// Carga opcional de variables desde .env sin requerir librerías adicionales.
function loadEnvFile() {
  const file = path.join(PROJECT_ROOT, '.env');
  if (!fsSync.existsSync(file)) return;
  for (const line of fsSync.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !Object.prototype.hasOwnProperty.call(process.env, match[1])) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  JWT_SECRET = process.env.JWT_SECRET || JWT_SECRET;
  PORT = Number(process.env.PORT || PORT);
}
loadEnvFile();

function json(res, statusCode, data) {
  const payload = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(payload);
}

function publicUser(user) {
  // Devuelve solo los campos públicos; nunca incluye el hash de la contraseña.
  return { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt };
}

async function readUsers() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { return JSON.parse(await fs.readFile(USERS_FILE, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

async function writeUsers(users) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${USERS_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(users, null, 2), 'utf8');
  await fs.rename(tmp, USERS_FILE);
}

function hashPassword(password) {
  // scrypt es una función de derivación de clave disponible en Node.js.
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    try {
      const [algorithm, saltHex, keyHex] = storedHash.split('$');
      if (algorithm !== 'scrypt' || !saltHex || !keyHex) return resolve(false);
      const salt = Buffer.from(saltHex, 'hex');
      const originalKey = Buffer.from(keyHex, 'hex');
      crypto.scrypt(password, salt, originalKey.length, (error, derivedKey) => {
        if (error) return reject(error);
        resolve(originalKey.length === derivedKey.length && crypto.timingSafeEqual(originalKey, derivedKey));
      });
    } catch { resolve(false); }
  });
}

function base64url(value) { return Buffer.from(value).toString('base64url'); }
function createToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ sub: user.id, username: user.username, role: user.role, iat: now, exp: now + TOKEN_EXPIRES_SECONDS }));
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Formato JWT inválido');
  const [header, payload, signature] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest();
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) throw new Error('Firma no válida');
  const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (decodedHeader.alg !== 'HS256' || !data.exp || data.exp <= Math.floor(Date.now() / 1000)) throw new Error('Token vencido o algoritmo no permitido');
  return data;
}

async function ensureDemoUsers() {
  const users = await readUsers();
  const demos = [
    { name: 'Recepcionista Demo', username: 'recepcion', email: 'recepcion@hotel.test', role: 'Recepción' },
    { name: 'Administrador Demo', username: 'admin', email: 'admin@hotel.test', role: 'Administración' }
  ];
  let changed = false;
  for (const demo of demos) {
    if (!users.some(u => u.username.toLowerCase() === demo.username)) {
      users.push({ id: crypto.randomUUID(), ...demo, passwordHash: await hashPassword('123456'), createdAt: new Date().toISOString(), demoAccount: true });
      changed = true;
    }
  }
  if (changed || !fsSync.existsSync(USERS_FILE)) await writeUsers(users);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw) > 20_000) {
        const error = new Error('Cuerpo de solicitud demasiado grande'); error.statusCode = 413;
        reject(error); req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        const parsed = JSON.parse(raw);
        if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('El JSON debe ser un objeto');
        resolve(parsed);
      } catch { const error = new Error('Cuerpo JSON inválido'); error.statusCode = 400; reject(error); }
    });
    req.on('error', reject);
  });
}

async function handle(req, res) {
  // CORS permite probar desde Postman y usar clientes locales autorizados.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = parsedUrl.pathname;

  if (req.method === 'GET' && route === '/api/health') {
    return json(res, 200, { success: true, service: 'Hotel Gran Marques Auth API', status: 'ok' });
  }

  if (req.method === 'POST' && route === '/api/auth/register') {
    const body = await parseBody(req);
    const { name, username, email, password } = body;
    if (![name, username, email, password].every(v => typeof v === 'string' && v.trim())) {
      return json(res, 400, { success: false, message: 'Los campos name, username, email y password son obligatorios.' });
    }
    if (name.trim().length > 100 || username.trim().length < 3 || username.trim().length > 30) {
      return json(res, 400, { success: false, message: 'Nombre o usuario fuera de los límites permitidos.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return json(res, 400, { success: false, message: 'El correo electrónico no tiene un formato válido.' });
    }
    if (password.length < 8 || password.length > 72) {
      return json(res, 400, { success: false, message: 'La contraseña debe tener entre 8 y 72 caracteres.' });
    }
    const users = await readUsers();
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    if (users.some(u => u.username.toLowerCase() === normalizedUsername || u.email.toLowerCase() === normalizedEmail)) {
      return json(res, 409, { success: false, message: 'El usuario o correo ya está registrado.' });
    }
    const user = {
      id: crypto.randomUUID(), name: name.trim(), username: normalizedUsername, email: normalizedEmail,
      passwordHash: await hashPassword(password), role: 'Recepción', createdAt: new Date().toISOString()
    };
    users.push(user);
    await writeUsers(users);
    return json(res, 201, { success: true, message: 'Registro creado satisfactoriamente.', user: publicUser(user) });
  }

  if (req.method === 'POST' && route === '/api/auth/login') {
    const body = await parseBody(req);
    const { username, password } = body;
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return json(res, 400, { success: false, message: 'Debe enviar username y password.' });
    }
    const users = await readUsers();
    const key = username.trim().toLowerCase();
    const user = users.find(u => u.username.toLowerCase() === key || u.email.toLowerCase() === key);
    const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !passwordOk) return json(res, 401, { success: false, message: 'Error en la autenticación.' });
    const token = createToken(user);
    return json(res, 200, { success: true, message: 'Autenticación satisfactoria.', token, tokenType: 'Bearer', expiresIn: '1h', user: publicUser(user) });
  }

  if (req.method === 'GET' && route === '/api/auth/me') {
    const authorization = req.headers.authorization || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return json(res, 401, { success: false, message: 'Se requiere un token Bearer.' });
    let claims;
    try { claims = verifyToken(match[1]); }
    catch { return json(res, 401, { success: false, message: 'Token inválido o expirado.' }); }
    const users = await readUsers();
    const user = users.find(u => u.id === claims.sub);
    if (!user) return json(res, 404, { success: false, message: 'Usuario no encontrado.' });
    return json(res, 200, { success: true, user: publicUser(user) });
  }

  if (route.startsWith('/api/')) return json(res, 404, { success: false, message: 'Endpoint API no encontrado.' });

  // Lista explícita de recursos del frontend para no publicar archivos internos del servidor.
  const staticFiles = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/index.html': ['index.html', 'text/html; charset=utf-8'],
    '/css/styles.css': [path.join('css', 'styles.css'), 'text/css; charset=utf-8'],
    '/js/app.js': [path.join('js', 'app.js'), 'text/javascript; charset=utf-8']
  };
  if (req.method === 'GET' && staticFiles[route]) {
    const [relativePath, contentType] = staticFiles[route];
    const file = path.join(PROJECT_ROOT, relativePath);
    const content = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': content.length, 'X-Content-Type-Options': 'nosniff' });
    return res.end(content);
  }
  return json(res, 404, { success: false, message: 'Recurso no encontrado.' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(error => {
    console.error('[API Error]', error.message);
    if (!res.headersSent) json(res, error.statusCode || 500, { success: false, message: error.statusCode ? error.message : 'Error interno del servicio.' });
    else res.end();
  });
});

ensureDemoUsers().then(() => {
  server.listen(PORT, () => {
    console.log(`Hotel Gran Marques API disponible en http://localhost:${PORT}`);
    console.log('Endpoints: GET /api/health, POST /api/auth/register, POST /api/auth/login, GET /api/auth/me');
    console.log('Cuentas de demostración locales: recepcion / 123456 y admin / 123456. Cambiarlas fuera de desarrollo.');
  });
}).catch(error => { console.error('No se pudo inicializar el almacén de usuarios:', error); process.exit(1); });

module.exports = { server };
