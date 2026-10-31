# Hotel Gran Marques - Sistema de Gestión Hotelera

**Evidencia GA8-220501096-AA1-EV02 - Módulos integrados**

## Datos del aprendiz
- Aprendiz: Alejandro Ramírez Herrera
- Identificación: C.C. 1036966567
- Programa: Tecnología en Análisis y Desarrollo de Software (ADSO)
- Ficha: 3235881
- Proyecto: Sistema de Gestión Hotelera - Hotel Gran Marques
- Fecha: 30 de octubre de 2026

## Arquitectura y módulos
- Presentación web: HTML5, CSS3 y JavaScript.
- Cliente de integración: `js/api-client.js`, `js/services/` y `js/domain-adapters.js`.
- API REST: `api/server.js`, sobre Node.js nativo.
- Persistencia académica local: archivos JSON en `api/data/`.
- Pruebas unitarias: `tests/domain-adapters.test.js`.
- Pruebas de integración: `scripts/api-test.js`.
- Distribución ejecutable: `dist/`, generada desde `scripts/build.js`.
- Documentación: `docs/`.

## Requisitos del entorno
- Node.js 18 o superior (el aprendiz confirmó Node.js v24.22.1 en su equipo; la ejecución de verificación reproducible de esta entrega se realizó con Node.js v22.16.0).
- Git.
- Navegador moderno.
- Postman opcional para pruebas manuales HTTP.

El proyecto no requiere dependencias npm de terceros. `npm install` termina sin paquetes externos.

## Instalación y ejecución
Desde la raíz de esta carpeta:

```bash
cp .env.example .env
```

Edite `.env` y defina `JWT_SECRET` con un secreto privado de al menos 32 caracteres. No publique el archivo `.env`.

En Windows/Git Bash puede iniciar el servicio directamente:

```bash
node api/server.js
```

El servidor presenta la interfaz en `http://localhost:3000/` y la API en `http://localhost:3000/api`. Salud: `http://localhost:3000/api/health`.

Si `npm start` falla por PATH de procesos secundarios, use `node api/server.js`. Esta alternativa ya fue comprobada en el entorno del aprendiz.

## Pruebas
Con el servidor detenido, ejecutar pruebas unitarias:

```bash
node --test tests/*.test.js
```

Para pruebas de integración, primero iniciar el servidor en otra terminal y después ejecutar:

```bash
node scripts/api-test.js
```

Resultados de referencia incluidos en `docs/RESULTADOS_GA8_EV02.txt`.

## Construcción de distribución

```bash
node scripts/build.js
```

Se genera `dist/` con los archivos de aplicación y API necesarios para ejecutar la distribución. No se genera un ejecutable nativo `.exe`: el proyecto es una aplicación web JavaScript que se ejecuta con Node.js y navegador.

## Repositorio
https://github.com/Alejandroramirez07/Gran_marques_frontend

La dirección del repositorio corresponde al proyecto fuente. La URL pública de alojamiento no ha sido suministrada ni se declara como desplegada. Las URL `localhost` funcionan solamente en el equipo que inicia el servidor.
