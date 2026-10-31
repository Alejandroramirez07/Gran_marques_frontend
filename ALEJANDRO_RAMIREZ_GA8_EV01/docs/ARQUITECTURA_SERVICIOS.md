# Arquitectura del Sistema de Gestión Hotelera - Hotel Gran Marques

## 1. Vista por capas

1. **Presentación:** `index.html` y `css/styles.css` contienen la estructura y los estilos de la interfaz.
2. **Controlador de interfaz:** `js/app.js` coordina navegación, renderizado, formularios y eventos de usuario.
3. **Integración cliente:** `js/api-client.js` concentra solicitudes HTTP, token Bearer y errores; `js/services/auth-service.js` administra autenticación; `js/services/hotel-service.js` centraliza operaciones de negocio; `js/domain-adapters.js` normaliza las entidades REST para las vistas.
4. **Servicios de aplicación/API:** `api/server.js` recibe las peticiones REST, valida entradas, aplica autenticación/autorización y atiende los dominios del hotel.
5. **Persistencia:** `api/data/users.json` y `api/data/hotel.json` se generan localmente. Los archivos de datos se excluyen de Git.
6. **Calidad:** `tests/domain-adapters.test.js` prueba los adaptadores; `scripts/api-test.js` ejecuta pruebas de integración HTTP; `postman/` contiene colección y ambiente para pruebas manuales.

## 2. Diagrama de paquetes y componentes

Los diagramas editables y sus imágenes se encuentran en `docs/diagrams/`:

- `arquitectura_capas.dot/.png`: flujo desde el actor hasta la persistencia.
- `diagrama_paquetes.dot/.png`: organización física de paquetes del cliente, servidor, persistencia y calidad.
- `diagrama_componentes.dot/.png`: componentes de interfaz, autenticación, cliente API, servicios hoteleros y almacenamiento.
- `diagrama_dominio.dot/.png`: entidades de negocio y sus relaciones principales.

## 3. Módulos de dominio

- Autenticación y perfiles: registro, inicio de sesión, JWT y consulta de perfil.
- Huéspedes: creación, consulta, búsqueda, actualización y eliminación condicionada.
- Habitaciones: consulta de catálogo y operaciones administrativas.
- Reservas: creación, consulta, actualización, cancelación y prevención de solapamientos.
- Servicios: catálogo y consumos agregados a las reservas.
- Facturación: generación de factura a partir de la reserva y sus consumos.
- Pagos: abonos y actualización del saldo pendiente.
- Mantenimiento: solicitudes vinculadas a habitaciones o áreas y seguimiento de estado.
- Reportes: indicadores consolidados para gerencia.

## 4. Relaciones de dominio

Un huésped puede tener varias reservas; cada reserva corresponde a un huésped y una habitación. Una reserva puede acumular consumos de servicios y generar como máximo una factura. Una factura admite varios pagos parciales. Las habitaciones pueden tener solicitudes de mantenimiento. Los reportes consolidan información de reservas, facturación y mantenimiento.

## 5. Seguridad

- Las rutas de negocio requieren un token Bearer válido.
- Los perfiles y las credenciales se manejan por separado; la respuesta pública no expone el hash de la contraseña.
- Las contraseñas se procesan con `crypto.scrypt` y sal aleatoria.
- La firma JWT se valida en el servidor y el token tiene expiración.
- Los cambios al catálogo de habitaciones y servicios se restringen a administración.
- En producción se debe exigir HTTPS, limitar el origen CORS, almacenar secretos fuera del repositorio, incorporar limitación de intentos y usar una base de datos transaccional.

## 6. Persistencia y ambientes

El ambiente de desarrollo usa Node.js y archivos JSON locales; no requiere motor de base de datos externo ni librerías npm de terceros. El servidor crea `api/data` al iniciar. La carpeta `dist/` contiene la distribución ensamblada para ejecutar el mismo sistema en otro entorno Node.js. En esta evidencia no se genera un ejecutable binario porque no hay transpilación ni compilador; JavaScript se ejecuta directamente en el navegador y en Node.js.

## 7. Validación

- Unitarias: seis pruebas sobre la normalización de las entidades usadas por la interfaz.
- Integración: treinta y seis comprobaciones HTTP que recorren autenticación y los módulos de negocio.
- Manuales: colección Postman en `postman/` para inspección individual de solicitudes y respuestas.
