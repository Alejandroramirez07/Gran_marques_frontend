/* Servicios de aplicación para los módulos de negocio del hotel. */
(function (global) {
  'use strict';
  const api = global.HGMApi;
  const data = response => response.data || {};
  global.HGMHotelService = {
    async guests(query = '') { return data(await api.request('GET', `/api/guests${query ? `?q=${encodeURIComponent(query)}` : ''}`)).items || []; },
    async createGuest(payload) { return data(await api.request('POST', '/api/guests', payload)).guest; },
    async rooms() { return data(await api.request('GET', '/api/rooms')).items || []; },
    async createRoom(payload) { return data(await api.request('POST', '/api/rooms', payload)).room; },
    async updateRoom(id, payload) { return data(await api.request('PATCH', `/api/rooms/${encodeURIComponent(id)}`, payload)).room; },
    async reservations() { return data(await api.request('GET', '/api/reservations')).items || []; },
    async createReservation(payload) { return data(await api.request('POST', '/api/reservations', payload)).reservation; },
    async updateReservation(id, payload) { return data(await api.request('PATCH', `/api/reservations/${encodeURIComponent(id)}`, payload)).reservation; },
    async services(activeOnly = false) { return data(await api.request('GET', `/api/services${activeOnly ? '?active=true' : ''}`)).items || []; },
    async createService(payload) { return data(await api.request('POST', '/api/services', payload)).service; },
    async addReservationService(reservationId, payload) { return data(await api.request('POST', `/api/reservations/${encodeURIComponent(reservationId)}/services`, payload)); },
    async invoices() { return data(await api.request('GET', '/api/invoices')).items || []; },
    async createInvoice(reservationId) { return data(await api.request('POST', '/api/invoices', { reservationId })).invoice; },
    async registerPayment(invoiceId, payload) { return data(await api.request('POST', `/api/invoices/${encodeURIComponent(invoiceId)}/payments`, payload)).invoice; },
    async maintenance() { return data(await api.request('GET', '/api/maintenance')).items || []; },
    async createMaintenance(payload) { return data(await api.request('POST', '/api/maintenance', payload)).item; },
    async updateMaintenance(id, payload) { return data(await api.request('PATCH', `/api/maintenance/${encodeURIComponent(id)}`, payload)).item; },
    async summary() { return data(await api.request('GET', '/api/reports/summary')); }
  };
})(window);
