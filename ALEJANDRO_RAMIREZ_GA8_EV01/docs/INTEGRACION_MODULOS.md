# Integración de módulos - Hotel Gran Marques

## Propósito

Este documento identifica cómo se conectan los módulos de presentación, autenticación, negocio, persistencia y calidad del Sistema de Gestión Hotelera.

## Módulos integrados

| Módulo | Componente del cliente | Endpoint principal | Datos persistidos |
|---|---|---|---|
| Autenticación | `js/services/auth-service.js` | `POST /api/auth/login`, `GET /api/auth/me` | `api/data/users.json` |
| Huéspedes | `js/services/hotel-service.js` | `GET/POST /api/guests` | `api/data/hotel.json` |
| Habitaciones | `js/services/hotel-service.js` | `GET/POST/PATCH /api/rooms` | `api/data/hotel.json` |
| Reservas | `js/services/hotel-service.js` | `GET/POST/PATCH /api/reservations` | `api/data/hotel.json` |
| Servicios adicionales | `js/services/hotel-service.js` | `GET/POST /api/services`, `POST /api/reservations/{id}/services` | `api/data/hotel.json` |
| Facturación | `js/services/hotel-service.js` | `GET/POST /api/invoices` | `api/data/hotel.json` |
| Pagos | `js/services/hotel-service.js` | `POST /api/invoices/{id}/payments` | `api/data/hotel.json` |
| Mantenimiento | `js/services/hotel-service.js` | `GET/POST/PATCH /api/maintenance` | `api/data/hotel.json` |
| Reportes | `js/services/hotel-service.js` | `GET /api/reports/summary` | Cálculo sobre `hotel.json` |

## Flujo de integración

1. El usuario ingresa sus credenciales desde `index.html`.
2. `auth-service.js` envía `username` y `password` a la API a través de `api-client.js`.
3. El backend verifica la contraseña, emite un JWT y devuelve el perfil público.
4. El controlador `app.js` conserva el token y solicita al API el perfil antes de mostrar los módulos protegidos.
5. Cada módulo de negocio invoca las funciones de `hotel-service.js`.
6. `api-client.js` añade el encabezado `Authorization: Bearer ...`, transforma el cuerpo a JSON y centraliza los errores HTTP.
7. `api/server.js` valida la solicitud, ejecuta las reglas del módulo, actualiza el almacén JSON y devuelve una respuesta estructurada.
8. `domain-adapters.js` adapta los modelos API al formato que necesitan las tablas, tarjetas y formularios.

## Responsabilidades de los componentes del cliente

- `api-client.js`: transporte HTTP, token Bearer y manejo uniforme de errores.
- `auth-service.js`: inicio de sesión, consulta del perfil y cierre de sesión.
- `hotel-service.js`: operaciones de huéspedes, habitaciones, reservas, servicios, facturas, pagos, mantenimiento y reportes.
- `domain-adapters.js`: adaptación sin efectos secundarios de entidades API a modelos de presentación.
- `app.js`: navegación, renderizado, formularios, eventos y coordinación de los servicios.

## Reglas de integridad implementadas en el servidor

- El documento del huésped no se puede duplicar.
- El número de habitación no se puede repetir.
- La reserva exige huésped, habitación, fechas y cantidad de huéspedes válidos.
- No se permite reservar una habitación que no esté disponible ni crear reservas cruzadas para el mismo rango.
- Una reserva no puede generar más de una factura.
- Los pagos no pueden superar el saldo de una factura.
- Los cambios de catálogo de habitaciones y servicios requieren rol administrativo.
- Las rutas de negocio requieren un JWT válido.

## Persistencia

El entorno académico guarda usuarios en `api/data/users.json` y los datos del hotel en `api/data/hotel.json`. El servidor crea las carpetas/archivos y los datos de demostración al inicializarse. Estos datos se excluyen del versionamiento para evitar subir registros locales.

El almacenamiento JSON permite reproducir el proyecto sin configurar un motor externo, pero no ofrece transacciones, bloqueo concurrente ni administración multiusuario de nivel productivo. Para una implementación real se recomienda PostgreSQL o MySQL y una capa de repositorios con transacciones.
