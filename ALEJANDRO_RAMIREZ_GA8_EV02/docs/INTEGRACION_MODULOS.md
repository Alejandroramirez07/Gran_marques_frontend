# Integración de módulos - GA8-220501096-AA1-EV02

## Propósito

Esta evidencia entrega el conjunto de módulos integrados del Sistema de Gestión Hotelera del Hotel Gran Marques, con su código fuente, salida de distribución, documentación, resultados de pruebas y configuración de los ambientes.

## Módulos integrados

| Módulo | Componente de presentación | Servicio de cliente | Recursos API | Persistencia |
|---|---|---|---|---|
| Autenticación y perfiles | Login, sesión y navegación protegida | `js/services/auth-service.js` | `/api/auth/login`, `/api/auth/me`, `/api/auth/register` | `api/data/users.json` |
| Huéspedes | Listado, búsqueda, alta y edición | `js/services/hotel-service.js` | `/api/guests` | `api/data/hotel.json` |
| Habitaciones | Catálogo, disponibilidad, estado y tarifa | `js/services/hotel-service.js` | `/api/rooms` | `api/data/hotel.json` |
| Reservas | Creación, consulta y cambio de estado | `js/services/hotel-service.js` | `/api/reservations` | `api/data/hotel.json` |
| Servicios adicionales | Catálogo y consumos vinculados a reserva | `js/services/hotel-service.js` | `/api/services`, `/api/reservations/{id}/services` | `api/data/hotel.json` |
| Facturación | Emisión y consulta de factura | `js/services/hotel-service.js` | `/api/invoices` | `api/data/hotel.json` |
| Pagos | Registro de abonos y consulta de saldo | `js/services/hotel-service.js` | `/api/invoices/{id}/payments` | `api/data/hotel.json` |
| Mantenimiento | Solicitudes, prioridad y estado | `js/services/hotel-service.js` | `/api/maintenance` | `api/data/hotel.json` |
| Reportes | Indicadores de ocupación y gestión | `js/services/hotel-service.js` | `/api/reports/summary` | Cálculo sobre `hotel.json` |

## Flujo de integración

1. El usuario ingresa desde `index.html`.
2. `js/app.js` controla eventos, navegación y renderizado.
3. `auth-service.js` envía las credenciales al backend mediante `api-client.js`.
4. `api/server.js` valida los datos, comprueba el hash de contraseña y emite un JWT cuando procede.
5. El cliente almacena el token de sesión y lo incluye como `Authorization: Bearer` en rutas privadas.
6. `hotel-service.js` agrupa las operaciones del dominio hotelero.
7. El backend valida rol, datos e integridad; actualiza el almacenamiento JSON y responde con JSON.
8. `domain-adapters.js` transforma los datos del dominio al modelo consumido por componentes visuales.

## Responsabilidades técnicas

- `index.html`: estructura semántica de la interfaz.
- `css/styles.css`: diseño visual y adaptación de pantalla.
- `js/app.js`: presentación, eventos, navegación y coordinación.
- `js/api-client.js`: transporte HTTP, token y tratamiento de errores.
- `js/services/auth-service.js`: autenticación y perfil.
- `js/services/hotel-service.js`: operaciones de módulos hoteleros.
- `js/domain-adapters.js`: adaptación de entidades para la interfaz.
- `api/server.js`: servidor, rutas, validaciones, autorización y persistencia.
- `tests/domain-adapters.test.js`: pruebas unitarias del mapeo de entidades.
- `scripts/api-test.js`: pruebas de integración de las rutas y reglas de negocio.

## Reglas de integridad y autorización

- No duplicar documento de huésped ni número de habitación.
- Las reservas requieren fechas coherentes, huésped existente y habitación disponible.
- Se impiden cruces de fechas de reservas para una misma habitación.
- Una reserva no puede tener facturas duplicadas.
- Los pagos no pueden superar el saldo de la factura.
- Las operaciones administrativas de catálogo requieren rol administrativo.
- Las rutas protegidas requieren token válido.

## Persistencia y alcance

El entorno académico utiliza `api/data/users.json` y `api/data/hotel.json`, creados al iniciar el servidor. Estos archivos se excluyen del repositorio. JSON local permite demostrar la integración, pero no sustituye una base de datos transaccional en producción. Para un despliegue real se recomienda PostgreSQL o MySQL y transacciones.
