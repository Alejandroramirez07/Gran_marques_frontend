# API REST - Hotel Gran Marques

Servidor HTTP implementado con módulos nativos de Node.js. Las rutas se encuentran organizadas por módulos de dominio dentro de `server.js`: autenticación, huéspedes, habitaciones, reservas/consumos, servicios, facturas/pagos, mantenimiento y reportes.

Las solicitudes de negocio requieren `Authorization: Bearer <token>`. Las rutas públicas son `GET /api/health`, `GET /api`, `POST /api/auth/register` y `POST /api/auth/login`.

Los datos académicos se guardan en `api/data/users.json` y `api/data/hotel.json`. Se crean automáticamente y no se incluyen en Git.

Consulte `../docs/API_REFERENCE.md`, `../docs/ENDPOINTS_API.txt` y `../docs/openapi.json`.
