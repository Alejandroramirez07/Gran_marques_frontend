/* Servicio de autenticación: concentra login, perfil y cierre de sesión. */
(function (global) {
  'use strict';
  const api = global.HGMApi;
  global.HGMAuthService = {
    async login(username, password) {
      const response = await api.request('POST', '/api/auth/login', { username, password }, { auth: false });
      const data = response.data || {};
      if (!data.token || !data.user) throw new api.ApiError('La API no devolvió una sesión válida.', 502, response);
      api.setToken(data.token);
      return data.user;
    },
    async profile() {
      const response = await api.request('GET', '/api/auth/me');
      return response.data?.user;
    },
    logout() { api.clearToken(); }
  };
})(window);
