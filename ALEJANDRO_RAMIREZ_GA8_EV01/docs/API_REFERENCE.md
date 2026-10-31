# Referencia técnica de la API REST — Hotel Gran Marques

**Evidencia:** GA7-220501096-AA5-EV03 — Diseño y desarrollo de servicios web – proyecto  
**Aprendiz:** Leidy Johana Alvarez Valencia  
**Programa:** Tecnología en Análisis y Desarrollo de Software (ADSO) · Ficha 3336187  
**Base URL local:** `http://localhost:3000`  
**Versión de API:** 2.0.0

## 1. Propósito y alcance

La API amplía el sistema web del Hotel Gran Marques. Centraliza servicios HTTP/JSON para autenticar usuarios y gestionar huéspedes, habitaciones, reservas, consumos adicionales, facturas, pagos, solicitudes de mantenimiento e indicadores gerenciales. Los endpoints de negocio se protegen con token Bearer. La interfaz existente (`index.html`, `css/` y `js/`) continúa dentro del proyecto.

## 2. Tecnologías y ejecución

- Node.js 18 o superior; únicamente módulos nativos (`http`, `fs`, `crypto`, `path`).
- Estilo REST y mensajes JSON.
- Token firmado con HMAC-SHA256 para autenticación.
- Contraseñas almacenadas mediante hash `scrypt` con sal aleatoria.
- Archivos JSON locales para persistencia académica: `api/data/users.json` y `api/data/hotel.json`.
- Postman para probar los endpoints; `scripts/api-test.js` automatiza pruebas de integración.

En Git Bash, desde la carpeta raíz del proyecto:

```bash
cp .env.example .env
npm start
```

El servicio queda disponible en `http://localhost:3000`. En otra terminal:

```bash
npm test
```

Cuentas locales de demostración: `admin / 123456` y `recepcion / 123456`. **Son exclusivamente para el entorno académico local.** La contraseña mínima exigida al registrar nuevos usuarios es de ocho caracteres. No publicar `.env`, secretos ni archivos generados de datos.

## 3. Convención de respuestas

Respuesta de éxito, cuando aplica:

```json
{
  "success": true,
  "message": "Operación realizada correctamente.",
  "data": { }
}
```

Respuesta de error:

```json
{
  "success": false,
  "message": "Descripción del error."
}
```

Códigos utilizados:

- `200 OK`: consulta o actualización correcta.
- `201 Created`: recurso creado.
- `400 Bad Request`: JSON, campo, fecha o valor inválido.
- `401 Unauthorized`: token ausente/incorrecto o credenciales incorrectas.
- `403 Forbidden`: autenticado sin permiso para una acción administrativa.
- `404 Not Found`: recurso o endpoint no encontrado.
- `409 Conflict`: duplicado, cruce de fechas, operación que viola una regla del negocio.
- `413 Payload Too Large`: cuerpo de solicitud demasiado grande.
- `500 Internal Server Error`: error no previsto en el servidor.

## 4. Autenticación

Las rutas de negocio requieren encabezado:

```http
Authorization: Bearer <token>
```

El token se obtiene con `POST /api/auth/login`, caduca en una hora y debe enviarse en cada consulta protegida. El registro público crea cuentas con rol `Recepción`; no acepta roles privilegiados desde el cuerpo de la petición. Las escrituras del catálogo de habitaciones y servicios, así como la eliminación de huéspedes, requieren rol administrativo.

## 5. Catálogo de endpoints

### Sistema y autenticación

| Método | Ruta | Auth | Función |
|---|---|---|---|
| GET | `/api/health` | No | Comprueba disponibilidad y versión. |
| GET | `/api` | No | Información general y ubicación de documentación. |
| POST | `/api/auth/register` | No | Registra usuario. |
| POST | `/api/auth/login` | No | Valida credenciales y entrega token. |
| GET | `/api/auth/me` | Bearer | Devuelve perfil del usuario autenticado. |

**Registro** — `POST /api/auth/register`

```json
{
  "name": "Leidy Demo",
  "username": "leidy_demo",
  "email": "leidy@example.test",
  "password": "ClaveSegura2026!"
}
```

`name`, `username`, `email` y `password` son obligatorios. La contraseña debe tener entre 8 y 72 caracteres. Devuelve `201`; usuario o correo duplicado devuelve `409`.

**Inicio de sesión** — `POST /api/auth/login`

```json
{ "username": "admin", "password": "123456" }
```

`username` también acepta el correo registrado. Si la autenticación se completa, devuelve `200` con `data.token`, `data.tokenType` y `data.user`. Credenciales no válidas devuelven `401`.

### Huéspedes

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/guests?q=texto` | Lista huéspedes; `q` filtra por nombre, documento, correo o teléfono. |
| POST | `/api/guests` | Crea huésped. |
| GET | `/api/guests/{id}` | Consulta un huésped. |
| PATCH / PUT | `/api/guests/{id}` | Actualiza datos suministrados. |
| DELETE | `/api/guests/{id}` | Elimina huésped solo para administración y solo si no tiene reservas. |

Ejemplo `POST /api/guests`:

```json
{
  "name": "Andrea Torres",
  "document": "CC-123456789",
  "email": "andrea@example.test",
  "phone": "3001234567",
  "nationality": "Colombiana"
}
```

`name` y `document` son obligatorios. El documento no se puede duplicar (`409`).

### Habitaciones

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/rooms?status=Disponible&type=Doble` | Lista habitaciones con filtros opcionales. |
| POST | `/api/rooms` | Crea habitación; solo administración. |
| GET | `/api/rooms/{id}` | Consulta habitación. |
| PATCH / PUT | `/api/rooms/{id}` | Actualiza habitación; solo administración. |
| DELETE | `/api/rooms/{id}` | Elimina habitación si no tiene reservas activas; solo administración. |

Ejemplo de creación:

```json
{
  "number": "305",
  "type": "Doble",
  "capacity": 2,
  "rate": 185000,
  "status": "Disponible",
  "description": "Habitación doble con vista exterior"
}
```

Estados admitidos: `Disponible`, `Ocupada`, `Mantenimiento`. Capacidad: entero mayor que cero. Tarifa: número mayor o igual a cero. Los números de habitación son únicos.

### Reservas

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/reservations?status=Confirmada` | Lista reservas; filtros `status`, `guestId` y `roomId`. |
| POST | `/api/reservations` | Crea reserva. |
| GET | `/api/reservations/{id}` | Consulta reserva. |
| PATCH / PUT | `/api/reservations/{id}` | Cambia estado, notas o fechas. |
| DELETE | `/api/reservations/{id}` | Elimina si no tiene factura; si no, debe cancelarse. |
| POST | `/api/reservations/{id}/services` | Agrega un consumo adicional a la reserva. |

Ejemplo de creación:

```json
{
  "guestId": "ID_DEL_HUESPED",
  "roomId": "ID_DE_HABITACION",
  "checkIn": "2026-12-10",
  "checkOut": "2026-12-12",
  "guestsCount": 2,
  "notes": "Llegada en la tarde"
}
```

Las fechas usan `AAAA-MM-DD`, la salida debe ser posterior al ingreso, el número de personas no puede superar la capacidad y no se permite cruzar otra reserva activa de la misma habitación. Estados admitidos: `Pendiente`, `Confirmada`, `Cancelada`, `Finalizada`.

Para añadir un servicio: `POST /api/reservations/{id}/services` con `{"serviceId":"ID_SERVICIO","quantity":1}`. La cantidad debe ser un entero entre 1 y 50. Las reservas canceladas o finalizadas no aceptan consumos nuevos.

### Servicios adicionales

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/services?active=true` | Lista servicios; filtro opcional `active=true/false`. |
| POST | `/api/services` | Crea servicio; solo administración. |
| GET | `/api/services/{id}` | Consulta servicio. |
| PATCH / PUT | `/api/services/{id}` | Actualiza servicio; solo administración. |
| DELETE | `/api/services/{id}` | Elimina solo si no se ha usado; administración. |

Ejemplo:

```json
{ "name": "Desayuno", "description": "Desayuno por persona", "price": 28000, "active": true }
```

### Facturación y pagos

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/invoices?paymentStatus=Pendiente` | Lista facturas, con filtros opcionales. |
| POST | `/api/invoices` | Genera una factura a partir de una reserva y sus consumos. |
| GET | `/api/invoices/{id}` | Consulta detalle de factura. |
| POST | `/api/invoices/{id}/payments` | Registra un pago o abono. |

Crear factura: `POST /api/invoices` con `{"reservationId":"ID_RESERVA"}`. Se calcula el hospedaje (tarifa por noche por número de noches) más los servicios registrados en la reserva. La versión académica usa impuesto cero; el cálculo tributario real debe definirse según las reglas contables del negocio.

Registrar pago:

```json
{ "amount": 10000, "method": "Transferencia", "reference": "TRX-2026-001" }
```

Los métodos permitidos son `Efectivo`, `Tarjeta`, `Transferencia` u `Otro`. Los pagos deben ser positivos y no pueden superar el saldo. La factura queda `Pendiente`, `Parcial` o `Pagada`.

### Mantenimiento y reportes

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/maintenance?status=Abierta` | Lista tickets de mantenimiento. |
| POST | `/api/maintenance` | Crea solicitud. |
| GET | `/api/maintenance/{id}` | Consulta solicitud. |
| PATCH / PUT | `/api/maintenance/{id}` | Actualiza estado, prioridad o notas. |
| GET | `/api/reports/summary` | Devuelve indicadores para panel y gerencia. |

Ejemplo de mantenimiento:

```json
{
  "roomId": "ID_DE_HABITACION",
  "area": "Habitación",
  "description": "Revisar aire acondicionado",
  "priority": "Alta"
}
```

`roomId` es opcional. Prioridades: `Baja`, `Media`, `Alta`, `Urgente`. Estados: `Abierta`, `En proceso`, `Resuelta`, `Cancelada`.

`GET /api/reports/summary` devuelve cantidad de huéspedes, habitaciones, reservas activas y totales, porcentaje de ocupación operativa, facturas pendientes, ingresos recaudados y tickets de mantenimiento abiertos/en proceso.

## 6. Reglas e integridad del negocio

1. Los identificadores de recursos se generan con UUID.
2. Un huésped debe existir antes de crear una reserva.
3. Una reserva debe apuntar a una habitación existente y disponible, con fechas válidas y sin cruces de reservas activas.
4. La capacidad de la habitación debe cubrir el número de huéspedes.
5. Una reserva solo puede tener una factura dentro de esta versión.
6. La suma pagada no puede superar el valor de la factura.
7. La eliminación se restringe cuando existen relaciones que afectarían la integridad.
8. Los endpoints de negocio necesitan token; las operaciones administrativas de catálogo comprueban rol.

## 7. Pruebas

Ejecutar servidor con `npm start` y en una segunda terminal `npm test`. El script guarda los resultados en `docs/resultado_pruebas_api.json` y `docs/resultado_pruebas_api.txt`. Para evaluación manual, importar la colección y el ambiente de la carpeta `postman/` y ejecutar las solicitudes. Las capturas y el video deben tomarse en el Postman real del aprendiz.

## 8. Limitaciones académicas y recomendaciones

La persistencia en JSON, las cuentas de demostración y el secreto predeterminado son para aprendizaje local, no producción. Antes de desplegar debe utilizarse base de datos, secreto seguro fuera del repositorio, HTTPS, autorización más granular, límite de intentos, auditoría, validación reforzada y política de copias de seguridad. La documentación describe lo implementado en esta versión y no pretende afirmar que ya existe un despliegue productivo.
