# Hotel Gran Marques — Evidencia GA7-220501096-AA5-EV04

Proyecto de sistema de gestión hotelera con API REST para probar mediante Postman. Incluye código, colección y ambiente Postman, inventario de endpoints, resultados de pruebas automatizadas y guion para el video.

## Requisitos
- Node.js 18 o superior.
- Postman Desktop o Postman Web con Desktop Agent.

## Ejecutar el servicio
```bash
npm start
```
La API queda disponible en `http://localhost:3000`. En otra terminal, las pruebas automatizadas se ejecutan con:
```bash
npm test
```

## Probar desde Postman
Importa ambos archivos de `postman/` y sigue `docs/POSTMAN_Como_Probar_EV04.md`.

## Archivos relevantes
- `postman/Hotel_Gran_Marques_API_EV04.postman_collection.json`
- `postman/Hotel_Gran_Marques_Local_EV04.postman_environment.json`
- `docs/ENDPOINTS_API_EV04.txt`
- `docs/Documentacion_Pruebas_API_GA7-220501096-AA5-EV04.docx`
- `docs/resultado_pruebas_api_EV04.log`
- `video/GUIA_GRABACION_VIDEO_POSTMAN.txt`
- `ENLACE_REPOSITORIO.txt`

## Importante para el envío
La suite automatizada pasó 36/36 comprobaciones. La ejecución en Postman, sus capturas y el video deben efectuarse desde el equipo de la aprendiz; el paquete identifica claramente esta tarea pendiente para no simular evidencia.
