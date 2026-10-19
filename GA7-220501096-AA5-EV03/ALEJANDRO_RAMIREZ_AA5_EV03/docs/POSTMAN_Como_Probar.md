# Cómo probar Hotel Gran Marques API con Postman

1. Abrir Git Bash desde la carpeta del proyecto.
2. Ejecutar `npm start` y conservar la terminal abierta.
3. Abrir Postman y seleccionar **Import**.
4. Importar `postman/Hotel_Gran_Marques_API_EV03.postman_collection.json`.
5. Importar `postman/Hotel_Gran_Marques_Local_EV03.postman_environment.json`.
6. Seleccionar la colección **Hotel Gran Marques — API EV03** y el ambiente **Hotel Gran Marques API Local EV03**.
7. Ejecutar las solicitudes en orden con **Run collection**. La solicitud de salud prepara un sufijo único y fechas futuras para que los datos de prueba no choquen entre ejecuciones.
8. Verificar las pestañas **Test Results** y **Response**. Algunas solicitudes comprueban a propósito códigos de error como `401`, `403` y `409`; esos códigos son resultados esperados y la prueba debe aparecer como aprobada.
9. Para guardar evidencia visual, tomar capturas reales en Postman de: login con token, consulta de habitaciones, creación de huésped, creación de reserva, factura/pago y reporte. Las capturas deben proceder de la ejecución de la aprendiz.

## Credenciales locales de demostración

- Administración: `admin` / `123456`
- Recepción: `recepcion` / `123456`

Son cuentas de desarrollo local, no de producción.

## Variables que maneja la colección

`baseUrl`, `token`, `tokenReception`, `runSuffix`, `testUsername`, `testEmail`, `testPassword`, `guestId`, `roomId`, `serviceId`, `checkIn`, `checkOut`, `reservationId`, `invoiceId`, `maintenanceId`, `newRoomId`.

La colección guarda IDs y tokens a partir de las respuestas para que las llamadas siguientes reutilicen los identificadores sin tener que copiarlos manualmente.
