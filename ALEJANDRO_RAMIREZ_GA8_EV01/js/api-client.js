/* Cliente HTTP común de la aplicación. Centraliza encabezados, token y manejo de errores. */
(function (global) {
  'use strict';

  const API_BASE_URL = '';
  const TOKEN_KEY = 'gm_token';

  class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.payload = payload;
    }
  }

  function getToken() {
    return global.localStorage ? global.localStorage.getItem(TOKEN_KEY) : null;
  }

  function setToken(token) {
    if (global.localStorage) global.localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    if (global.localStorage) global.localStorage.removeItem(TOKEN_KEY);
  }

  async function request(method, path, body, options = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.auth !== false) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
      response = await global.fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
    } catch (error) {
      throw new ApiError('No fue posible conectar con el servidor. Verifique que la API esté activa.', 0, { cause: error.message });
    }

    const raw = await response.text();
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; }
    catch { payload = { success: false, message: 'El servidor devolvió una respuesta no JSON.' }; }

    if (!response.ok || payload.success === false) {
      throw new ApiError(payload.message || `Error HTTP ${response.status}.`, response.status, payload);
    }
    return payload;
  }

  global.HGMApi = { request, getToken, setToken, clearToken, ApiError };
})(window);
