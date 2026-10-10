# Resultado QA backend — 2026-10-10

| Estado | Evidencia |
|---|---|
| Implementado | Tres migraciones candidatas, 9 tablas públicas con RLS, FK tenant, licencias y cuatro RPC; sin enlace remoto |
| Probado | 23 pruebas SQL embebidas, 23 en PostgreSQL 17.11 nativo, 2 de concurrencia y 10 de GoTrue/JWT + PostgREST reales; dos empresas, roles, cuota, licencias, rollback y baja |
| Pendiente | Adaptador frontend, Edge de alta/reset, revocación de sesiones, Storage, RPC restantes, auditoría externa, carga general y campo |
| Bloqueado | Bloqueos locales de PostgreSQL y Auth/API resueltos con contenedores efímeros en GitHub Actions; integración comercial todavía pendiente |
| Listo para demo | Sólo laboratorio SQL reproducible; la interfaz publicada conserva backend anterior |
| Listo para comercialización | NO |

Pruebas SQL: 23 aprobadas en cada motor, 0 fallidas. Concurrencia nativa: 2 aprobadas, 0 omitidas. Evidencia: [GitHub Actions run 38090566121](https://github.com/Pgamenox/RutaSales/actions/runs/38090566121), commit af15eb4afe603912c3b7334820ed720f677a4338. El motor ejecuta políticas RLS reales usando un contexto auth de prueba; no valida tokens ni infraestructura Supabase.

Se detectó y corrigió durante QA una referencia a customer_id en el trigger compartido de incidencias/visitas: ahora se evalúa sólo para la tabla correspondiente. También se comprobó la relación Supervisor→Ruta/Vendedor y la derivación del objetivo de la visita desde el cliente en servidor.

La rollback test provoca deliberadamente un error antes del historial; no queda ninguna visita movida ni incidencia resuelta. La siguiente prueba reasigna 26 pendientes, registra historial y resuelve la incidencia en la misma transacción. La carrera de cuota se ejecutó cinco veces: dos conexiones esperaron el bloqueo de empresa y exactamente una ocupó la última plaza en cada ronda. Completar/reasignar simultáneamente terminó en una sola decisión coherente. Esto cubre esas dos carreras, no carga general, Auth ni operaciones de Edge Functions.

Dependencias de laboratorio: Node 24.19.0, @electric-sql/pglite 0.3.14, pg 8.16.3. CLI usado para crear los nombres de migración: 2.54.11. No se publicaron claves, datos reales ni binarios. No se activó GPS real, cobros o fotografías automáticas.

Documentación consultada: changelog de Supabase (incluida actualización Postgres 15.19/17.11 y cambios de exposición API), RLS oficial y guías de bloqueo/tenant. El laboratorio nativo descargado 17.10 no se inició y no debe convertirse en runtime productivo; el entorno externo debe usar versión parchada y repetir QA.

El workflow .github/workflows/rutasales-backend-qa.yml sólo prueba en contenedores temporales; usa permisos contents:read, acciones fijadas por SHA e imagen PostgreSQL 17.11 fijada por digest. No tiene pasos de publicación ni secretos productivos. La contraseña de servicio es ficticia y sólo corresponde al contenedor efímero.

## Auth/API reales — evidencia adicional

[Run 38095163411](https://github.com/Pgamenox/RutaSales/actions/runs/38095163411), commit `100f7a080486d5b47a021750e8352f4cac60868d`: ambos jobs aprobaron. Totales de CI: 23 + 23 SQL, 2 concurrencia y **10 Auth/API, cero fallidas**. CLI 2.120.0 fijado en lockfile; Node 24.21.0 en runner. Las imágenes del stack Supabase son seleccionadas por esa versión de CLI; no tienen fijación adicional por digest en el workflow.

Ocho usuarios ficticios se crearon mediante GoTrue local y obtuvieron JWT firmados reales. Se verificaron contraseña incorrecta, registro público cerrado, rechazo de JWT alterado, falta de acceso anon, dos empresas con nombres repetidos y consultas por ID ajeno, permisos del Supervisor, finalización mediante RPC, Superadministrador, vencimiento/renovación y baja/reasignación. Un JWT nuevo con user_metadata adulterado conservó únicamente los permisos del registro de cuenta en servidor. Una cuenta desactivada mantuvo un JWT válido para Auth, pero perdió acceso a los datos y RPC: esto prueba bloqueo de datos, **no revocación de sesión Auth**.

El primer intento falló porque el proveedor email/password estaba deshabilitado en la configuración de QA. Se habilitó ese proveedor manteniendo auth.enable_signup=false; la prueba comprobó que el registro público seguía rechazado. No se cambió ninguna configuración remota.

El launcher exige runner GitHub hospedado y proyecto local sin enlace remoto, rechaza endpoints que no sean localhost y elimina los volúmenes al finalizar. Se excluyeron Storage, Edge, Realtime y otros servicios ajenos a esta comprobación. No se usaron proyectos Supabase existentes, claves productivas, correos reales, datos reales ni cobros.

Regresión local sobre el mismo commit: 7 pruebas unitarias RutaSales, 2 ciclos de navegador móvil/escritorio con datos, GPS y cámara sintéticos, PDF real, y 12 pruebas Node RutaGPS: aprobadas. El navegador todavía usa un backend simulado; no demuestra integración de la interfaz con este candidato.

Estado: backend candidato verificado en este alcance; **NO listo para comercialización**. Falta conectar y probar el frontend contra las RPC, completar las operaciones faltantes y Edge de alta/reset, evidencias en Storage privado, revocación/recuperación Auth, carga, recuperación y QA de campo. Rama independiente y PR #2 borrador; sin merge ni despliegue.
