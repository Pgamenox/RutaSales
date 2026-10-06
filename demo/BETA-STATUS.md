# RutaSales — BETA MUESTRA 1.2

Estado canónico: 2026-10-05
Repositorio: Pgamenox/RutaSales
Rama oficial: main
Frontend de muestra: /demo
Backend de muestra: Supabase RutaSales-DEMO (ezfqvhoprfstcmdiflcm)

## Ya probado
- Supervisor y Vendedor separados.
- Asignación de visitas.
- Vendedor ve solo sus visitas demo mediante RLS.
- Captura GPS explícita antes de la foto.
- Foto solo desde cámara en vivo.
- Evidencia con GPS, precisión y hora servidor.
- Apertura del punto capturado en Google Maps.
- Punto esperado del negocio.
- Cálculo de distancia entre negocio y evidencia.
- Clasificación comercial: 0–100 m válida; 101–250 m revisar; >250 m fuera de zona.
- Filtros de Supervisor para visitas válidas, revisar y fuera de zona.
- Prueba real de fuera de zona validada con OXXO Universidad.
- Reporte de imprevistos desde Vendedor con tipo, comentario, GPS y foto en vivo.
- Atención de contingencias desde Supervisor.
- Reasignación de visitas pendientes a otro vendedor.
- Historial persistente de reasignaciones con origen, destino, cantidad, motivo y hora.
- Catálogo de clientes con dirección, GPS real y radio permitido.
- Al asignar una visita desde catálogo, hereda automáticamente nombre, dirección, GPS esperado y radio.

## No regresar a
- Beta 6.1 localStorage para nuevas funciones.
- Edge Functions como hosting de interfaz.
- supervisor-gps.html experimental.
- app.js antiguo para Supervisor.

## Pendientes prioritarios de la muestra
1. Evitar duplicados de cliente/dirección en una misma jornada/ruta.
2. Reporte diario de Supervisor y PDF/compartir.
3. Mejorar autenticación antes de producción; los tokens demo no son seguridad final.
4. Mover fotos de base64 en Postgres a Supabase Storage antes de producción.

Regla: toda mejora nueva debe partir de BETA MUESTRA 1.2 en main/demo y conservar las funciones ya probadas.
