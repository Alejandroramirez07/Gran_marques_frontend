# Hotel Gran Marques - Sistema de Gestión Hotelera integrado

Evidencia **GA8-220501096-AA1-EV01 - Desarrollar software a partir de la integración de sus módulos componentes**.

## Datos del proyecto

- Aprendiz: Alejandro Ramirez
- Identificación: C.C. 1036966567
- Programa: Tecnología en Análisis y Desarrollo de Software (ADSO)
- Proyecto: Sistema de Gestión Hotelera - Hotel Gran Marques

## Arquitectura

- Presentación: HTML5, CSS3 y JavaScript.
- Integración cliente: `js/api-client.js`, `js/services/` y `js/domain-adapters.js`.
- API REST: `api/server.js` sobre Node.js nativo.
- Persistencia académica: JSON local en `api/data/`.
- Pruebas: `tests/` (unitarias de adaptadores) y `scripts/api-test.js` (integración de API).
- Documentación: `docs/` con endpoints, OpenAPI, arquitectura, integración y diagramas.

## Requisitos

- Node.js 18 o superior (la ejecución de referencia se comprobó con Node.js 22 en el entorno de construcción; la aprendiz indicó Node.js 24.22.1 en su equipo).
- Git para versionamiento.
- Navegador moderno.
- Postman opcional para pruebas manuales de endpoints.

No se requieren paquetes npm externos. `npm install` debe terminar sin instalar dependencias de terceros.

## Configurar y ejecutar

Desde la raíz de esta carpeta:

```bash
cp .env.example .env
```

Cambie `JWT_SECRET` por una cadena aleatoria y privada de al menos 32 caracteres. No publique `.env`.

Inicie el servidor:

```bash
node api/server.js
```

La aplicación estará disponible en `http://localhost:3000` y la API en `http://localhost:3000/api`.

En Windows/Git Bash también se puede usar `npm start`, siempre que la ruta de Node.js esté disponible en el `PATH` de los procesos secundarios. Si `npm start` muestra que `node` no se reconoce, ejecute `node api/server.js` desde Git Bash.

## Pruebas

Pruebas unitarias de modelos/adaptadores (no requieren el servidor):

```bash
node --test tests/*.test.js
```

Pruebas de integración HTTP (inicie el servidor en otra terminal primero):

```bash
node scripts/api-test.js
```

En entornos donde los comandos npm y el PATH de Node.js están configurados también se puede usar `npm run test:unit`, `npm run test:integration` y `npm test`. En Windows/Git Bash, si npm ejecuta scripts mediante cmd.exe y muestra que node no se reconoce, use los comandos directos de Node.js anteriores.

## Distribución

```bash
npm run build
```

El comando crea `dist/` con la distribución ejecutable. No genera un binario nativo porque el proyecto utiliza JavaScript interpretado por Node.js; la carpeta `dist/` es el artefacto de despliegue de HTML, CSS, JS y API.

## Documentos importantes

- `docs/INTEGRACION_MODULOS.md`: relación entre componentes y módulos.
- `docs/ARQUITECTURA_SERVICIOS.md`: arquitectura y decisiones técnicas.
- `docs/API_REFERENCE.md`: contrato técnico de API.
- `docs/ENDPOINTS_API.txt`: catálogo de rutas.
- `docs/openapi.json`: contrato OpenAPI.
- `docs/diagrams/`: diagramas de capas, paquetes y componentes.
- `docs/RESULTADOS_GA8.txt`: ejecución registrada de pruebas unitarias e integración.

## Versionamiento

Repositorio remoto indicado en el historial de trabajo: https://github.com/Alejandroramirez07/Gran_marques_frontend

Ver `VERSIONAMIENTO_GIT.md` para agregar y publicar esta evidencia en el repositorio.
