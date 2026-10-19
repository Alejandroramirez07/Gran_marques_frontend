# Hotel Gran Marques — API de autenticación

Proyecto preparado para la evidencia **GA7-220501096-AA5-EV02. API**. Conserva el frontend HTML/CSS/JavaScript del sistema hotelero y agrega un servicio REST para registro e inicio de sesión con contraseñas hash y tokens JWT.

## Requisitos
- Node.js 18 o superior. No se necesitan paquetes externos; todos los módulos usados por el backend pertenecen a Node.js.
- Postman Desktop para ejecutar la colección y tomar las capturas solicitadas.

## Instalar y ejecutar
Desde esta carpeta (`Hotel_Gran_Marques_Web`):

```bash
cp .env.example .env
npm start
```

En Windows Git Bash, `cp .env.example .env` también funciona. El servidor queda en `http://localhost:3000`, y la interfaz se abre en `http://localhost:3000`.

## Acceso de demostración (solo local)
- Recepción: `recepcion` / `123456`
- Administración: `admin` / `123456`

Las cuentas se crean automáticamente la primera vez. No utilizar estas claves en producción.

## Endpoints
| Método | Ruta | Finalidad | Éxito |
|---|---|---|---|
| GET | `/api/health` | Estado del servicio | `200 OK` |
| POST | `/api/auth/register` | Registrar usuario | `201 Created` |
| POST | `/api/auth/login` | Autenticar usuario y emitir JWT | `200 OK` |
| GET | `/api/auth/me` | Validar token y consultar perfil | `200 OK` |

Los errores principales incluyen `400 Bad Request`, `401 Unauthorized` y `409 Conflict`. Los detalles de body y respuestas están en `docs/ENDPOINTS_API.txt`.

## Probar en Postman
1. Iniciar el servidor con `npm start`.
2. Importar `postman/Hotel_Gran_Marques_API.postman_collection.json`.
3. Importar `postman/Hotel_Gran_Marques_Local.postman_environment.json` y activarlo.
4. Ejecutar las solicitudes de la colección en orden; las pruebas usan variables dinámicas para evitar conflictos de usuarios repetidos.
5. Tomar capturas reales en Postman y grabar el video siguiendo `docs/GUIA_VIDEO_POSTMAN.md`.

## Pruebas automatizadas locales
Con la API activa, abrir otra terminal y ejecutar:

```bash
npm test
```

Esto prueba salud, registro, login correcto e incorrecto, usuario duplicado, ruta protegida con token y ruta protegida sin token. Guarda el resumen en `docs/resultado_pruebas.json`.

## Estructura
- `index.html`, `css/`, `js/`: interfaz del sistema hotelero.
- `api/server.js`: servicio REST.
- `api/data/users.json`: almacén local generado en la primera ejecución (ignorado por Git).
- `postman/`: colección y ambiente importables.
- `docs/ENDPOINTS_API.txt`: referencia de rutas.
- `docs/GUIA_VIDEO_POSTMAN.md`: guion para grabar la demostración real.
- `ENLACE_REPOSITORIO.txt`: instrucciones para registrar la URL remota verdadera.

## Notas académicas y de seguridad
La persistencia JSON y las cuentas iniciales solo tienen fines de demostración académica. Para un entorno real se recomienda base de datos, política de contraseñas robusta, HTTPS, limitación de intentos, rotación de claves, control de acceso por rol y gestión de secretos fuera del código. El archivo `.env` no debe publicarse.
