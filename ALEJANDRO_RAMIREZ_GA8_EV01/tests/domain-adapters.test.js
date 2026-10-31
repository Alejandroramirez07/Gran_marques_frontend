'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const adapters = require('../js/domain-adapters.js');

test('mapRoom conserva identificador, número, capacidad y tarifa', () => {
  const room = adapters.mapRoom({ id: 'r-1', number: '101', type: 'Sencilla', capacity: 1, rate: 120000, status: 'Disponible', description: 'Piso 1, vista interior' });
  assert.equal(room.id, 'r-1');
  assert.equal(room.number, '101');
  assert.equal(room.capacity, 1);
  assert.equal(room.rate, 120000);
  assert.equal(room.floor, '1');
});

test('mapGuest convierte datos de huésped a modelo de interfaz', () => {
  const guest = adapters.mapGuest({ id: 'g-1', name: 'Ana Pérez', document: '123', email: 'ana@test.co' });
  assert.equal(guest.name, 'Ana Pérez');
  assert.equal(guest.document, '123');
  assert.equal(guest.phone, '');
});

test('mapReservation relaciona habitación, huésped, noches y consumos', () => {
  const rooms = [{ id: 'r-1', rate: 100000 }];
  const reservation = adapters.mapReservation({ id: 'abc12345', guestId: 'g-1', guestName: 'Ana', roomId: 'r-1', roomNumber: '101', checkIn: '2026-11-01', checkOut: '2026-11-03', nights: 2, guestsCount: 1, status: 'Confirmada', services: [{ total: 25000 }] }, rooms);
  assert.equal(reservation.code, 'RS-ABC123');
  assert.equal(reservation.guest, 'Ana');
  assert.equal(reservation.total, 225000);
  assert.equal(reservation.nights, 2);
});

test('mapService normaliza precio y descripción', () => {
  const service = adapters.mapService({ id: 's-1', name: 'Spa', price: '80000', description: 'Bienestar', active: true });
  assert.equal(service.price, 80000);
  assert.equal(service.icon, '🧖');
  assert.equal(service.active, true);
});

test('mapInvoice calcula alojamiento, servicios y saldo', () => {
  const invoice = adapters.mapInvoice({ id: 'i-1', number: 'GM-123', reservationId: 'res-1', guestName: 'Ana', items: [{ total: 200000 }, { total: 30000 }], total: 230000, paymentStatus: 'Parcial', payments: [{ amount: 100000, method: 'Tarjeta' }] }, [{ id: 'res-1', room: '101' }]);
  assert.equal(invoice.lodging, 200000);
  assert.equal(invoice.services, 30000);
  assert.equal(invoice.paid, 100000);
  assert.equal(invoice.balance, 130000);
  assert.equal(invoice.status, 'Parcial');
});

test('mapMaintenance resuelve ubicación a partir de la habitación relacionada', () => {
  const item = adapters.mapMaintenance({ id: 'm-1', roomId: 'r-1', area: 'Habitación', description: 'Aire acondicionado', priority: 'Alta', status: 'Abierta' }, [{ id: 'r-1', number: '205' }]);
  assert.equal(item.room, 'Habitación 205');
  assert.equal(item.issue, 'Aire acondicionado');
  assert.equal(item.status, 'Abierta');
});
