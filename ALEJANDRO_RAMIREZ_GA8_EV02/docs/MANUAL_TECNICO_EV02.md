# Manual técnico - Hotel Gran Marques - GA8 EV02

## 1. Requisitos previos

- Windows 10/11, macOS o Linux.
- Node.js 18 o superior.
- Navegador moderno.
- Git para control de versiones.
- Postman opcional para pruebas manuales de la API.

## 2. Preparación

1. Descomprima el paquete.
2. Abra una terminal en la carpeta raíz `ALEJANDRO_RAMIREZ_GA8_EV02`.
3. Copie `.env.example` como `.env`.
4. En `.env`, configure `PORT=3000`, `NODE_ENV=development` y un `JWT_SECRET` propio de 32 caracteres o más.
5. No suba `.env` a Git.

## 3. Inicio del sistema

En Git Bash:

```bash
node api/server.js
```

Mensaje de referencia: `Hotel Gran Marques API disponible en http://localhost:3000`.

En algunos equipos Windows, si el PATH de Node no se propaga al proceso secundario que ejecuta `npm start`, utilice el comando directo anterior. El aprendiz confirmó que `node api/server.js` inicia el servidor en su equipo.

## 4. URLs locales

- Aplicación: `http://localhost:3000/`
- Raíz API: `http://localhost:3000/api`
- Salud: `http://localhost:3000/api/health`
- OpenAPI: archivo local `docs/openapi.json`.

Las direcciones localhost solo son accesibles desde el equipo que ejecuta el servidor.

## 5. Pruebas

Pruebas unitarias:

```bash
node --test tests/*.test.js
```

Pruebas de integración, con servidor iniciado en otra terminal:

```bash
node scripts/api-test.js
```

## 6. Construcción de distribución

```bash
node scripts/build.js
```

El comando genera `dist/`, que contiene HTML, CSS, JavaScript, API y documentación técnica esencial. No se compila un archivo `.exe` porque la aplicación se ejecuta como aplicación web sobre Node.js.

## 7. Persistencia

Los archivos `api/data/users.json` y `api/data/hotel.json` se generan automáticamente. Se excluyen de Git para no versionar usuarios locales ni datos de prueba. Antes de reiniciar pruebas destructivas, se recomienda respaldar los JSON o usar una copia limpia de la carpeta.

## 8. Seguridad

- Secreto JWT definido por entorno y no versionado.
- Contraseñas procesadas con scrypt y sal aleatoria.
- Rutas privadas protegidas por Bearer token.
- Roles para separar funciones de recepción y administración.
- Cuentas de demostración solo para pruebas académicas; deben cambiarse antes de cualquier uso real.

## 9. Solución de problemas

- `node no se reconoce`: comprobar Node.js en PATH y abrir una terminal nueva; en Git Bash validar `node -v`.
- `npm start` no encuentra node: ejecutar `node api/server.js` directamente.
- Puerto ocupado: cambiar PORT en `.env` y usar la nueva URL.
- `401`: volver a iniciar sesión y usar el token vigente.
- `403`: verificar que el usuario tenga el rol requerido.
- `409`: revisar duplicidad de documento, habitación, cruce de fechas o factura asociada.
