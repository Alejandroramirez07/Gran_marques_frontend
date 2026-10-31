'use strict';
// Prueba de integración de la API. Primero ejecute `npm start` en otra terminal.
const base = process.env.API_BASE_URL || 'http://localhost:3000';
const runId = Date.now();
const checks = [];

async function request(name, path, options = {}, expectedStatus) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  let body;
  try { body = await response.json(); } catch { body = {}; }
  const ok = response.status === expectedStatus;
  checks.push({ name, expectedStatus, actualStatus: response.status, ok, body });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name} | esperado=${expectedStatus} recibido=${response.status}`);
  if (!ok) console.log(JSON.stringify(body));
  return { response, body };
}

(async () => {
  try {
    await request('Salud de API', '/api/health', {}, 200);
    const username = `ev02_${runId}`;
    const email = `ev02_${runId}@hotel.test`;
    const password = 'PruebaSegura2026!';
    await request('Registro de nuevo usuario', '/api/auth/register', {
      method: 'POST', body: JSON.stringify({ name: 'Usuario de prueba EV02', username, email, password })
    }, 201);
    const login = await request('Login con credenciales correctas', '/api/auth/login', {
      method: 'POST', body: JSON.stringify({ username, password })
    }, 200);
    const token = login.body.token;
    await request('Login con contraseña incorrecta', '/api/auth/login', {
      method: 'POST', body: JSON.stringify({ username, password: 'Incorrecta999!' })
    }, 401);
    await request('Rechazo de usuario duplicado', '/api/auth/register', {
      method: 'POST', body: JSON.stringify({ name: 'Duplicado', username, email: `otro_${email}`, password })
    }, 409);
    await request('Ruta privada con token válido', '/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    }, 200);
    await request('Ruta privada sin token', '/api/auth/me', {}, 401);
    const failed = checks.filter(c => !c.ok);
    console.log(`\nResultado: ${checks.length - failed.length}/${checks.length} pruebas aprobadas.`);
    if (failed.length) process.exitCode = 1;
    else console.log('Todas las pruebas terminaron con los códigos HTTP esperados.');
    require('fs').writeFileSync(require('path').join(__dirname, '..', 'docs', 'resultado_pruebas.json'), JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: base, total: checks.length, passed: checks.length - failed.length, failed: failed.length, checks: checks.map(({body, ...rest}) => ({...rest, message: body.message || body.status || ''})) }, null, 2));
  } catch (error) {
    console.error('No fue posible completar las pruebas. Confirme que la API esté en ejecución.', error.message);
    process.exitCode = 1;
  }
})();
