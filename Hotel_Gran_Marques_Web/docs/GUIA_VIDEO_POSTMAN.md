# Guion para grabar el video de la evidencia EV02

**Importante:** este archivo es una guía para grabar el video real solicitado por el SENA; no es una grabación ya realizada en el computador del aprendiz.

## Preparación
1. Abrir la carpeta del proyecto en VS Code.
2. Abrir una terminal en la carpeta del proyecto. No hace falta `npm install` porque el backend utiliza módulos nativos de Node.js.
3. Ejecutar `npm start` y esperar el mensaje `Hotel Gran Marques API disponible en http://localhost:3000`.
4. Abrir Postman e importar `postman/Hotel_Gran_Marques_API.postman_collection.json`.
5. Importar también `postman/Hotel_Gran_Marques_Local.postman_environment.json` y seleccionar el ambiente local.

## Secuencia sugerida para el video (2–4 minutos)
1. Mostrar brevemente la carpeta y mencionar que contiene frontend, API, colección Postman y documentación.
2. Mostrar `GET http://localhost:3000/api/health`; enviar y explicar el HTTP 200.
3. Enviar `POST /api/auth/register` y mostrar el HTTP 201.
4. Enviar `POST /api/auth/login` con el usuario registrado y mostrar “Autenticación satisfactoria” y el token.
5. Enviar `POST /api/auth/login` con contraseña incorrecta y mostrar HTTP 401.
6. Ejecutar `GET /api/auth/me` con `Authorization: Bearer <token>` y mostrar HTTP 200.
7. Ejecutar `GET /api/auth/me` sin token y mostrar HTTP 401.
8. Mostrar el test result de Postman en cada request y cerrar el video indicando los endpoints incluidos.

## Cómo grabar en Windows
- Usar `Win + Alt + R` para iniciar/detener una captura con Xbox Game Bar, si está habilitada; o utilizar OBS Studio.
- Guardar el archivo como `evidencias/Video_Pruebas_Postman_EV02.mp4`.
- Antes de entregar, confirmar que se vean claramente URL, método HTTP, body cuando corresponda, status code y respuesta. No mostrar contraseñas personales ni tokens de uso real.
