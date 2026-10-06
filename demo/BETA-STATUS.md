# RutaSales — BETA MUESTRA 1.1

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

## No regresar a
- Beta 6.1 localStorage para nuevas funciones.
- Edge Functions como hosting de interfaz.
- supervisor-gps.html experimental.
- app.js antiguo para Supervisor.

## Pendientes prioritarios de la muestra
1. Catálogo simple de clientes con GPS guardado para no capturar coordenadas manualmente cada vez.
2. Evitar duplicados de cliente/dirección en una misma jornada/ruta.
3. Reporte diario de Supervisor y PDF/compartir.
4. Mejorar autenticación antes de producción; los tokens demo no son seguridad final.
5. Mover fotos de base64 en Postgres a Supabase Storage antes de producción.

Regla: toda mejora nueva debe partir de BETA MUESTRA 1.1 en main/demo y conservar las funciones ya probadas.
