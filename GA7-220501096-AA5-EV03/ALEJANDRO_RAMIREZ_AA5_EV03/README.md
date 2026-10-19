# Hotel Gran Marques — API REST del proyecto

**Evidencia GA7-220501096-AA5-EV03 — Diseño y desarrollo de servicios web – proyecto**

API que amplía el Sistema de Gestión Hotelera desarrollado en las evidencias anteriores. Conserva el frontend `index.html`, `css/` y `js/` e incluye servicios REST para usuarios/autenticación, huéspedes, habitaciones, reservas, consumos de servicios, facturación/pagos, mantenimiento y reportes.

## Requisitos
- Node.js 18 o superior.
- Git para versionamiento.
- Postman para validación manual (opcional, se incluye colección importable).
- No requiere instalar dependencias npm de terceros.

## Ejecutar en Windows Git Bash

```bash
cp .env.example .env
npm start
```

Abrir `http://localhost:3000`. En una segunda terminal, desde la misma carpeta, ejecutar:

```bash
npm test
```

Las pruebas guardan resultados en `docs/resultado_pruebas_api.json` y `.txt`.

## Cuentas de demostración locales
- Administración: `admin` / `123456`
- Recepción: `recepcion` / `123456`

No utilizar estas contraseñas en producción. El registro público crea usuarios con rol `Recepción`. Cambiar `JWT_SECRET` en `.env` antes de cualquier despliegue y no publicar este archivo.

## Documentación
- `docs/API_REFERENCE.md`: documentación funcional/técnica por servicio y ejemplos de uso.
- `docs/ENDPOINTS_API.txt`: catálogo breve de endpoints.
- `docs/openapi.json`: definición OpenAPI para herramientas compatibles.
- `postman/`: colección y ambiente para probar la API local.
- `scripts/api-test.js`: pruebas automatizadas de integración.

## Versionamiento con Git

Si el proyecto ya está dentro de un repositorio Git, conserva el historial que ya tienes. Para revisar estado y registrar la EV03:

```bash
git status
git add .
git commit -m "GA7-AA5-EV03: ampliar API REST del sistema hotelero"
git push
```

Si aún no existe repositorio remoto, créalo en GitHub bajo tu cuenta y utiliza la URL que GitHub entrega. Verifica con `git remote -v` antes de compartir el enlace. Anota la URL real en `ENLACE_REPOSITORIO.txt`; no debe dejarse un enlace inventado.

## Estructura

```text
Hotel_Gran_Marques_Web/
├── api/server.js
├── api/data/                  # se genera localmente y está excluida de Git
├── css/styles.css
├── js/app.js
├── index.html
├── docs/API_REFERENCE.md
├── docs/ENDPOINTS_API.txt
├── docs/openapi.json
├── postman/
├── scripts/api-test.js
├── .env.example
└── package.json
```

## Persistencia y alcance académico
Los recursos se persisten en archivos JSON locales para hacer demostrable el servicio sin instalar una base de datos. Es una implementación educativa y no un despliegue de producción. Para producción se recomienda una base de datos transaccional, HTTPS, manejo de secretos, controles de autorización más granulares, auditoría y copias de seguridad.
