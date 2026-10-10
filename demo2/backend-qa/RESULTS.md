# Resultado QA backend — 2026-10-10

| Estado | Evidencia |
|---|---|
| Implementado | Tres migraciones candidatas, 9 tablas públicas con RLS, FK tenant, licencias y cuatro RPC; sin enlace remoto |
| Probado | 23 pruebas SQL embebidas, 23 en PostgreSQL 17.11 nativo y 2 de concurrencia entre conexiones independientes; dos empresas, roles, cuota, licencias, rollback y baja |
| Pendiente | Adaptador frontend, Edge/Auth, Storage, RPC restantes, JWT y REST reales, auditoría externa y campo |
| Bloqueado | Stack completo de Supabase/Auth ausente en el entorno local. El bloqueo de PostgreSQL nativo se resolvió mediante GitHub Actions |
| Listo para demo | Sólo laboratorio SQL reproducible; la interfaz publicada conserva backend anterior |
| Listo para comercialización | NO |

Pruebas SQL: 23 aprobadas en cada motor, 0 fallidas. Concurrencia nativa: 2 aprobadas, 0 omitidas. Evidencia: [GitHub Actions run 38090566121](https://github.com/Pgamenox/RutaSales/actions/runs/38090566121), commit af15eb4afe603912c3b7334820ed720f677a4338. El motor ejecuta políticas RLS reales usando un contexto auth de prueba; no valida tokens ni infraestructura Supabase.

Se detectó y corrigió durante QA una referencia a customer_id en el trigger compartido de incidencias/visitas: ahora se evalúa sólo para la tabla correspondiente. También se comprobó la relación Supervisor→Ruta/Vendedor y la derivación del objetivo de la visita desde el cliente en servidor.

La rollback test provoca deliberadamente un error antes del historial; no queda ninguna visita movida ni incidencia resuelta. La siguiente prueba reasigna 26 pendientes, registra historial y resuelve la incidencia en la misma transacción. La carrera de cuota se ejecutó cinco veces: dos conexiones esperaron el bloqueo de empresa y exactamente una ocupó la última plaza en cada ronda. Completar/reasignar simultáneamente terminó en una sola decisión coherente. Esto cubre esas dos carreras, no carga general, Auth ni operaciones de Edge Functions.

Dependencias de laboratorio: Node 24.19.0, @electric-sql/pglite 0.3.14, pg 8.16.3. CLI usado para crear los nombres de migración: 2.54.11. No se publicaron claves, datos reales ni binarios. No se activó GPS real, cobros o fotografías automáticas.

Documentación consultada: changelog de Supabase (incluida actualización Postgres 15.19/17.11 y cambios de exposición API), RLS oficial y guías de bloqueo/tenant. El laboratorio nativo descargado 17.10 no se inició y no debe convertirse en runtime productivo; el entorno externo debe usar versión parchada y repetir QA.

El workflow .github/workflows/rutasales-backend-qa.yml sólo prueba en contenedores temporales; usa permisos contents:read, acciones fijadas por SHA e imagen PostgreSQL 17.11 fijada por digest. No tiene pasos de publicación ni secretos productivos. La contraseña de servicio es ficticia y sólo corresponde al contenedor efímero.
