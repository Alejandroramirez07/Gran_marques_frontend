# Ambientes y configuración - GA8 EV02

| Ambiente | Uso | Configuración | Acceso |
|---|---|---|---|
| Desarrollo local | Codificación y ajustes | Node.js >=18; `NODE_ENV=development`; `PORT=3000`; JSON local | `http://localhost:3000` |
| Pruebas local | Pruebas unitarias e integración | Copia controlada de los archivos JSON; servidor local; scripts Node.js | `http://localhost:3000/api` |
| Distribución | Artefactos listos para ejecutar | carpeta `dist/` generada con `node scripts/build.js` | Iniciar Node en la raíz de `dist/` |
| Producción | No habilitado en esta entrega | Requiere hosting, HTTPS, secreto gestionado y base de datos transaccional | URL pública pendiente |

## Variables de entorno

- `PORT`: puerto HTTP, por defecto 3000.
- `NODE_ENV`: perfil de ejecución, `development` para práctica.
- `JWT_SECRET`: secreto local para firma/verificación JWT; mínimo 32 caracteres y no debe publicarse.

## Base de datos / almacenamiento

La versión académica utiliza dos archivos JSON locales: `api/data/users.json` para cuentas y `api/data/hotel.json` para los datos operativos. No hay motor SQL externo configurado en esta versión. Los archivos son creados por el servidor cuando se ejecuta.

## Nota de despliegue

No se dispone de URL pública suministrada o verificable. No se presenta `localhost` como URL de internet. Para pasar a producción se requiere elegir hosting Node.js, configurar variables seguras, HTTPS, persistencia administrada y realizar pruebas de humo tras el despliegue.
