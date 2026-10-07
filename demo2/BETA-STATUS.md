# RutaSales — BETA 2.0 / Roles y Acceso Seguro

Estado canónico: 2026-10-06  
Repositorio: Pgamenox/RutaSales  
Rama: main  
Frontend: /demo2  
Backend: Supabase RutaSales-DEMO (ezfqvhoprfstcmdiflcm)

## Modelo comercial vigente
- RutaSales Equipo.
- $38,000 MXN + IVA por 12 meses.
- 2 pagos semestrales de $19,000 MXN + IVA.
- Hasta 12 vendedores activos.
- Estructura: 1 Central + Supervisores + hasta 12 Vendedores.
- Piloto recomendado: hasta 14 días.

## Implementado en RutaSales 2.0
- Login real con Supabase Auth.
- Roles: CENTRAL, SUPERVISOR, VENDEDOR.
- Redirección automática por rol.
- Contraseñas administradas por Supabase Auth.
- RLS por rol y pertenencia.
- Central puede crear Supervisores y Vendedores.
- Límite técnico de 12 vendedores activos en el alta desde Central.
- Central puede asignar rutas a Supervisores.
- Supervisor ve únicamente sus vendedores, rutas, visitas e incidencias.
- Vendedor ve únicamente sus propias visitas/incidencias.
- Vendedor conserva GPS + cámara en vivo para completar visita.
- Vendedor 2.0 ya incluye contingencias con GPS + foto.
- Vendedor 2.0 ya incluye alta de negocio nuevo con GPS + foto.
- Supervisor 2.0 ya incluye asignación de visitas.
- Supervisor 2.0 ya incluye geocerca comercial y filtros.
- Supervisor 2.0 ya incluye aprobación/rechazo de negocios nuevos.
- Supervisor 2.0 ya incluye contingencias y resolución.
- Supervisor 2.0 ya incluye reasignación de pendientes.
- La reasignación preserva el primer vendedor original si ya existía.
- Supervisor 2.0 ya incluye historial de reasignaciones.
- Beta Muestra 1.4 permanece intacta como respaldo.

## Verificaciones completadas
- Migración complete_role_permissions_for_operations aplicada.
- vendedor.js: sintaxis validada.
- supervisor.js: sintaxis validada.
- central.html: script validado.
- Supabase Security Advisor: 0 lints.
- Estado actual de cuentas Auth/RutaSales: 0 Central, 0 Supervisor, 0 Vendedor.
- Datos demo existentes preservados: 3 rutas y 8 visitas.

## Siguiente punto exacto
1. Crear la primera cuenta CENTRAL con correo y contraseña elegidos por el propietario.
2. Iniciar sesión como Central.
3. Crear un Supervisor QA.
4. Crear un Vendedor QA.
5. Asignar ruta al Supervisor.
6. Crear/asignar una visita al Vendedor.
7. Probar en teléfono GPS + cámara + contingencia + negocio nuevo.
8. Probar aprobación y reasignación desde Supervisor.
9. Crear un segundo Supervisor QA y comprobar aislamiento entre equipos.
10. Si todo pasa: activar Realtime.
11. Antes de producción: mover fotos base64 a Storage y habilitar recuperación/cambio de contraseña.

## Regla de protección
No retirar /demo ni Beta Muestra 1.4 hasta que la prueba E2E de cuentas reales pase.


---

# RutaSales — Beta de Estrés / Demo Comercial 1.0
Estado: 2026-10-07
Objetivo: validar escalabilidad y estabilidad del recorrido comercial sin modificar los datos reales de la demo.

## Correcciones aplicadas
- Supervisor: filtro por fecha para historial de visitas.
- Supervisor: paginación de 25 visitas por página.
- Supervisor: evidencia fotográfica de visitas bajo demanda.
- Supervisor: evidencia fotográfica de incidencias bajo demanda.
- Supervisor: límite de 50 incidencias y 50 reasignaciones en carga inicial.
- Vendedor: compresión adaptativa de fotografía antes de enviar.
- Vendedor: objetivo de compresión aproximado de 600 KB.
- Vendedor: tope estricto aproximado de 800 KB por evidencia.
- Base de datos: índices agregados para visita por fecha, vendedor+fecha, ruta+fecha y estado+fecha.
- Base de datos: índice agregado para approved_customer_id en incidencias.
- Base de datos: índices agregados para incidencias por estado/fecha y reasignaciones por fecha.

## Prueba sintética de volumen
Se creó una tabla temporal, sin tocar registros reales, con 500,000 visitas sintéticas.

Resultados observados:
- Consulta del día con filtro por fecha y límite de 25: aproximadamente 6.1 ms en base de datos.
- Consulta vendedor+fecha con índice compuesto: respuesta prácticamente inmediata en la prueba.
- Conteo de pendientes por fecha sobre 500,000 registros: aproximadamente 4.8 ms.

Conclusión de rendimiento inicial:
- El patrón fecha + paginación + índices es viable para una demo y para escalar mucho más allá de 30 vendedores.
- El cuello de botella principal ya no debe ser la lista de visitas, siempre que las fotografías no viajen en la consulta inicial.

## Hallazgos del auditor
Seguridad:
- RLS está habilitado en las tablas principales.
- Advertencia vigente: protección de contraseñas filtradas de Supabase Auth desactivada.

Rendimiento:
- Se corrigió el índice faltante de approved_customer_id en rs_incidents.
- Persisten advertencias de optimización RLS: varias políticas reevalúan auth/current_setting por fila.
- Persisten políticas permisivas múltiples por rol/acción.
- Estas optimizaciones NO se tocarán antes de la demo comercial para no arriesgar el aislamiento de Central/Supervisor/Vendedor; se consideran trabajo previo a producción masiva.

## Estado de los 7 puntos

1. Congelamiento de Demo Comercial 1.0: DEFINIDO.
2. Desactivar vendedor y reasignar pendientes: PARCIAL. Existe campo active y reasignación, falta interfaz específica de desactivación con flujo guiado.
3. Cliente no disponible / reprogramación por intentos: PENDIENTE.
4. Compresión automática de fotografías: IMPLEMENTADA en frontend; pendiente migración definitiva de Base64 a Storage antes de producción.
5. Historial ágil + PDF diario: HISTORIAL MEJORADO; PDF diario PENDIENTE.
6. Incidencias y reasignación: IMPLEMENTADO y previamente probado en QA.
7. Recorrido final GO/NO-GO: NO-GO todavía.

## Bloqueadores actuales para declarar GO
- Falta flujo de reprogramación con intentos separados y nueva evidencia obligatoria.
- Falta PDF diario por vendedor.
- Falta flujo guiado de desactivación de vendedor desde Central.
- Falta repetir recorrido completo dos veces seguidas después de esas correcciones.

## Regla de cierre
No agregar nuevas funciones.
Solo corregir los tres bloqueadores anteriores y ejecutar dos recorridos E2E consecutivos.
