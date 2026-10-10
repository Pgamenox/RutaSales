# Resultado QA backend — 2026-10-10

| Estado | Evidencia |
|---|---|
| Implementado | Tres migraciones candidatas, 9 tablas públicas con RLS, FK tenant, licencias y cuatro RPC; sin enlace remoto |
| Probado | 23 pruebas SQL en PGlite/PostgreSQL embebido; dos empresas, nombres repetidos, roles, cuota, vigencia, suspensión/renovación, evidencia, rollback y baja |
| Pendiente | Adaptador frontend, Edge/Auth, Storage, RPC restantes, JWT y REST reales, auditoría externa y campo |
| Bloqueado | Dos pruebas de conexiones concurrentes: servidor nativo no arranca por permisos del entorno; Docker/stack Supabase ausentes |
| Listo para demo | Sólo laboratorio SQL reproducible; la interfaz publicada conserva backend anterior |
| Listo para comercialización | NO |

Pruebas SQL ejecutadas tras la última corrección: 23 aprobadas, 0 fallidas. Concurrencia: 0 aprobadas, 2 omitidas; scripts preparados. El motor ejecuta políticas RLS reales usando un contexto auth de prueba; no valida tokens ni infraestructura Supabase.

Se detectó y corrigió durante QA una referencia a customer_id en el trigger compartido de incidencias/visitas: ahora se evalúa sólo para la tabla correspondiente. También se comprobó la relación Supervisor→Ruta/Vendedor y la derivación del objetivo de la visita desde el cliente en servidor.

La rollback test provoca deliberadamente un error antes del historial; no queda ninguna visita movida ni incidencia resuelta. La siguiente prueba reasigna 26 pendientes, registra historial y resuelve la incidencia en la misma transacción. El test de cuota actual es secuencial: no se declara protegida la carrera hasta ejecutar el script de conexiones independientes.

Dependencias de laboratorio: Node 24.19.0, @electric-sql/pglite 0.3.14, pg 8.16.3. CLI usado para crear los nombres de migración: 2.54.11. No se publicaron claves, datos reales ni binarios. No se activó GPS real, cobros o fotografías automáticas.

Documentación consultada: changelog de Supabase (incluida actualización Postgres 15.19/17.11 y cambios de exposición API), RLS oficial y guías de bloqueo/tenant. El laboratorio nativo descargado 17.10 no se inició y no debe convertirse en runtime productivo; el entorno externo debe usar versión parchada y repetir QA.
