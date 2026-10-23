# Evidencia GA7-220501096-AA5-EV04 — Pruebas en Postman

## Antes de empezar
1. Instala/abre Postman Desktop o Postman Web y, si usas Web, habilita el Desktop Agent.
2. Abre Git Bash en la carpeta raíz del proyecto.
3. Ejecuta `npm start` y deja esa terminal abierta. El servidor local queda en `http://localhost:3000`.
4. En Postman, usa **Import** e importa los dos archivos de la carpeta `postman/`: la colección `Hotel_Gran_Marques_API_EV04.postman_collection.json` y el ambiente `Hotel_Gran_Marques_Local_EV04.postman_environment.json`.
5. Selecciona el ambiente **Hotel Gran Marques API Local EV04** y confirma que `baseUrl` sea `http://localhost:3000`.
6. Abre la colección y elige **Run collection**. Ejecuta en el orden incluido. Los códigos 401, 403 y 409 son resultados esperados para las solicitudes de prueba negativas; deben mostrar aserciones aprobadas.

## Qué verifica la colección
- Salud de API y login.
- Registro, autenticación, token y perfil.
- Creación/búsqueda de huéspedes y consulta de habitaciones/servicios.
- Reserva válida y conflicto de disponibilidad.
- Servicio adicional, factura, prevención de factura duplicada y pago parcial.
- Solicitud/actualización de mantenimiento y reporte gerencial.
- Permisos por rol y rechazo de petición sin token.

## Capturas reales requeridas para completar la entrega
Guarda capturas en `evidencias_postman/` con estos nombres:
1. `01_postman_coleccion_importada.png` — colección y ambiente visibles.
2. `02_postman_health.png` — `GET /api/health`, status 200 y respuesta JSON.
3. `03_postman_login.png` — login válido, status 200 y token (oculta el valor del token en la captura).
4. `04_postman_login_invalido.png` — credenciales incorrectas, status 401 esperado.
5. `05_postman_reserva_factura.png` — reserva/factura con status de creación 201.
6. `06_postman_runner.png` — resumen final de **Run collection** con assertions.

**Importante:** `registro_pruebas_automatizadas.png` es una representación del registro real de `npm test`; no se debe presentar como una captura de Postman. Las capturas anteriores deben obtenerse al ejecutar Postman en el computador de la aprendiz.
