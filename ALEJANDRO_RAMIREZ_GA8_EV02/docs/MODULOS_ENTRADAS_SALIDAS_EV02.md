# Catálogo de módulos: entradas y salidas

| Módulo/componente | Entradas principales | Salidas principales | Validaciones y respuestas |
|---|---|---|---|
| Autenticación | `username`, `password`; en registro además `name`, `email` | perfil público, rol y JWT | 200 login correcto; 201 registro; 400 datos inválidos; 401 credenciales incorrectas; 409 duplicado |
| Huéspedes | `name`, `document`, `email`, `phone`, `nationality`; filtros de búsqueda | identificador, ficha del huésped y listado | documento no duplicado; 401 sin sesión; 404 no encontrado |
| Habitaciones | `number`, `type`, `capacity`, `rate`, `status`, `description`; filtros `status`, `type` | ficha de habitación, disponibilidad y catálogo | número no duplicado; administración para alta/cambios; 403 rol insuficiente |
| Reservas | `guestId`, `roomId`, `checkIn`, `checkOut`, `guestsCount`, `notes` | código e identificador de reserva, noches, valor y estado | huésped/habitación existentes, fechas válidas, capacidad y disponibilidad; 409 cruce de fechas |
| Servicios | nombre, descripción, precio, estado; asociación `serviceId`, `quantity` a reserva | catálogo y consumo vinculado a reserva | servicio activo; cantidad válida; no alterar catálogo sin rol admin |
| Facturación | `reservationId` | número de factura, conceptos, impuestos/total y estado de pago | una factura por reserva; 409 si ya existe |
| Pagos | `amount`, `method`, `reference` | pago registrado, acumulado y saldo pendiente | importe positivo y no superior al saldo; 404 factura no encontrada |
| Mantenimiento | `roomId`, `area`, `description`, `priority` | solicitud, identificador, estado y prioridad | habitación/área válida; estados definidos; acceso autenticado |
| Reportes | filtros opcionales de consulta | conteos, ocupación, reservas e ingresos consolidados | acceso protegido; respuesta 200 cuando se procesa |
| Adaptadores de dominio | entidades del API: habitaciones, huéspedes, reservas, servicios, facturas y mantenimiento | modelos listos para tarjetas, tablas y formularios | normalización de tipos, números, etiquetas e identificadores |

Los nombres y tipos de atributos corresponden al contrato implementado en `docs/API_REFERENCE.md` y las rutas en `docs/ENDPOINTS_API.txt`. Para valores completos y ejemplos JSON, consultar esos documentos y `docs/openapi.json`.
