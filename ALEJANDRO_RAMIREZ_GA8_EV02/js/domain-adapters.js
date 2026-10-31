/* Adaptadores puros: transforman las entidades REST al formato que representa la interfaz. */
(function (global) {
  'use strict';

  function mapRoom(room) {
    return {
      id: room.id,
      number: String(room.number),
      type: room.type,
      capacity: Number(room.capacity || 1),
      rate: Number(room.rate || 0),
      status: room.status,
      description: room.description || '',
      floor: (room.description || '').match(/piso\s+(\d+)/i)?.[1] || '—'
    };
  }

  function mapGuest(guest) {
    return { id: guest.id, name: guest.name, document: guest.document, email: guest.email || '', phone: guest.phone || '' };
  }

  function mapReservation(reservation, rooms = []) {
    const room = rooms.find(item => item.id === reservation.roomId);
    const serviceTotal = (reservation.services || []).reduce((sum, item) => sum + Number(item.total || 0), 0);
    const lodging = Number(reservation.nights || 0) * Number(room?.rate || 0);
    return {
      id: reservation.id,
      code: `RS-${String(reservation.id).slice(0, 6).toUpperCase()}`,
      guestId: reservation.guestId,
      guest: reservation.guestName,
      roomId: reservation.roomId,
      room: reservation.roomNumber,
      start: reservation.checkIn,
      end: reservation.checkOut,
      guests: reservation.guestsCount,
      nights: reservation.nights,
      status: reservation.status,
      total: lodging + serviceTotal,
      services: reservation.services || [],
      notes: reservation.notes || ''
    };
  }

  function mapService(service) {
    const icons = { restaurante: '🍽️', spa: '🧖', lavandería: '🧺', 'room service': '🛎️' };
    return { id: service.id, name: service.name, desc: service.description || '', price: Number(service.price || 0), active: Boolean(service.active), icon: icons[String(service.name).toLowerCase()] || '✦' };
  }

  function mapInvoice(invoice, reservations = []) {
    const reservation = reservations.find(item => item.id === invoice.reservationId);
    const items = invoice.items || [];
    const lodging = Number(items[0]?.total || 0);
    const services = items.slice(1).reduce((sum, item) => sum + Number(item.total || 0), 0);
    const paid = (invoice.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return {
      id: invoice.id,
      code: invoice.number || `FAC-${String(invoice.id).slice(0, 6).toUpperCase()}`,
      guest: invoice.guestName,
      room: reservation?.room || '—',
      lodging,
      services,
      total: Number(invoice.total || 0),
      paid,
      balance: Number(invoice.total || 0) - paid,
      payment: invoice.payments?.at(-1)?.method || 'Pendiente',
      status: invoice.paymentStatus || 'Pendiente',
      reservationId: invoice.reservationId
    };
  }

  function mapMaintenance(item, rooms = []) {
    const room = rooms.find(entry => entry.id === item.roomId);
    return {
      id: item.id,
      roomId: item.roomId,
      room: room ? `Habitación ${room.number}` : item.area,
      area: item.area,
      issue: item.description,
      priority: item.priority,
      status: item.status,
      notes: item.notes || ''
    };
  }

  const adapters = { mapRoom, mapGuest, mapReservation, mapService, mapInvoice, mapMaintenance };
  global.HGMAdapters = adapters;
  if (typeof module !== 'undefined' && module.exports) module.exports = adapters;
})(typeof window !== 'undefined' ? window : globalThis);
