# RutaGPS — Plan de integración con RutaSales y RutaGuard
Fecha: 2026-10-09
Estado: diseño, no desplegado.

## Objetivo
Servicio separado RutaGPS, con integración desacoplada para RutaSales y RutaGuard; muestra última ubicación autorizada cada cinco minutos durante jornada laboral y conserva historial según política de retención. 30 dispositivos piloto.

## Reglas
- Consentimiento/información transparente sobre el tratamiento de ubicación y finalidad laboral; interfaz discreta sin mapa de vigilancia para vendedores.
- Sin fotografías ocultas ni capturas automáticas.
- Supervisor y Central autorizados por roles y pertenencia a empresa; RLS, bitácora de consultas y separación estricta entre empresas.
- Detener muestreo al finalizar jornada; no prometer seguimiento con aplicación cerrada o pantalla bloqueada en PWA.
- Registrar `recorded_at`, `received_at`, precisión, fuente y estado; mapa distingue datos recientes de caducados.
- No reemplazar GPS y evidencia transaccional de cada visita en RutaSales.

## Contrato mínimo
`POST /v1/locations`: tenant_id (desde sesión), actor_id, shift_id, latitude, longitude, accuracy_m, recorded_at, idempotency_key.
`GET /v1/locations/latest`: limitado a personal autorizado del tenant.
`GET /v1/locations/history`: sujeto a permisos, paginado y retención.
Esquema sujeto a ajustes después de auditar RutaGuard y reglas de privacidad.

## Secuencia
1. Auditar claves de usuario/empresa de RutaSales y RutaGuard sin cambiar datos.
2. Crear servicio independiente, credenciales y aislamiento multiempresa.
3. Añadir emisor opt-in durante turno abierto cada 5 minutos; tratar offline, pérdida de permisos y suspensión.
4. Crear panel Supervisor/Central con última posición, precisión y tiempo desde actualización.
5. Probar 30 sesiones simuladas y teléfonos reales Android/iPhone; ensayar desconexiones, límites de acceso y fin de turno.
6. Lanzar piloto consentido, medir batería, exactitud, costo y tasa de entregas; decidir si se necesita app nativa.

## No hacer sin validación
No activar seguimiento en producción; no hacer tracking oculto; no guardar fotografías secretas; no tocar credenciales productivas; no afirmar seguimiento constante garantizado.
