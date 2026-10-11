# Resultado QA backend — actualizado 2026-10-11

> Evidencia vigente al final de este documento. Las secciones anteriores conservan resultados históricos.

| Estado | Evidencia vigente |
|---|---|
| Implementado | Cinco migraciones candidatas, RLS/tenant/licencias, RPC operativas y dos Edge Functions de alta/reset |
| Probado | Ejecución vigente documentada al final: SQL en dos motores, carreras con conexiones independientes y Auth/API/interfaz real local |
| Pendiente | Reconciliación de altas/reset inciertos, Storage privado e imagen íntegra, onboarding, operaciones restantes, abuso/MFA, carga, recuperación y campo |
| Bloqueado | Despliegue comercial requiere entorno independiente y autorización; QA físico requiere dispositivos/operador |
| Listo para demo | Laboratorio integrado reproducible; frontend publicado conserva backend anterior |
| Listo para comercialización | NO |

## Evidencia histórica

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

## Cierre de operaciones e interfaz QA — evidencia vigente

[Run 38096174864](https://github.com/Pgamenox/RutaSales/actions/runs/38096174864), commit `8f913176f60aa2da8d8745ab4b8291678f8a8f5c`. Ambos jobs: SUCCESS. **32 + 32 pruebas SQL, 4 de concurrencia y 15 Auth/API/interfaz; cero fallidas u omitidas en CI.** Las cifras de las secciones anteriores corresponden a ejecuciones históricas y no sustituyen este resultado.

Se añadieron cuatro RPC: rs_submit_incident (vendedor y empresa derivados del servidor), rs_resolve_incident (aprobar/rechazar/atender), rs_reprogram_visit (evidencia original y nuevo intento pendiente) y rs_assign_route (Central y supervisor de la misma empresa). Todas usan autorización explícita, operaciones privadas y wrappers públicos invoker sin acceso anon. Cambiar el supervisor de una ruta con historia/asignaciones está rechazado para conservar pertenencia y evidencia; no se implementó traslado de historia entre supervisores.

Las pruebas forzaron fallos al cerrar una propuesta y al crear el nuevo intento: cliente/cierre o estado/evidencia se revirtieron íntegramente. Dos conexiones que reprogramaron el mismo pendiente produjeron un solo hijo. Dos conexiones que aprobaron la misma propuesta produjeron un cliente y una auditoría. Ambas tuvieron barrera de bloqueo observable, además de las carreras de cuota y completar/reasignar existentes.

La prueba número 15 usa la interfaz existente, SDK Supabase local y JWT/REST/RPC reales. Un Supervisor asigna una visita; Vendedor captura GPS/cámara ficticios y completa; reporta incidencia; Supervisor reasigna más de 25 pendientes en una transacción y descarga un PDF real; Central da de baja al vendedor con reemplazo y se comprueba estado/preservación en SQL. Viewports 390×844 y 1280×900 sin desbordamiento horizontal; sin errores de scripts ni solicitudes a servicios externos. Usuarios creados por bootstrap de QA, **no por Edge de alta**. Las propuestas y reprogramación se probaron por API y SQL, no mediante sus pantallas en este recorrido.

El adaptador demo2/backend-operations.js y las ramas de operación se habilitan únicamente al servir common.js en memoria desde el servidor QA loopback. candidateBackend=false permanece en el producto; URL/key publicadas no se sustituyeron. El frontend publicado y las bases existentes siguen intactos. No se rediseñó ninguna pantalla ni se modificó CSS.

El asesor CLI de seguridad local ejecutó --type security --level warn --fail-on error: exit 0 y “No issues found”. Esto cubre ese asesor SQL local y ese filtro; no acredita todos los niveles INFO, configuración productiva de Auth/Storage, revisión externa ni seguridad física. CLI 2.120.0, Node 24.21.0, Playwright 1.62.1 y SDK 2.117.3 fijados; stack eliminado al terminar.

Dos intentos del navegador fallaron por selectores de QA ambiguos: nombre de cliente repetido entre intentos y nombre de vendedor presente en opciones de reemplazo. Se corrigieron usando IDs exactos; no se alteró la interfaz por estos fallos. Las 7 unitarias, 2 ciclos con backend simulado y 12 Node RutaGPS también se repitieron y aprobaron. Captura móvil de la regresión sintética revisada visualmente.

| Entrega | Estado actual |
|---|---|
| Implementado | Ocho RPC candidatas y adaptador QA para completar, enviar incidencia/propuesta, resolver, reasignar, baja y asignación de ruta; reprogramación mantiene firma existente |
| Probado | SQL en dos motores, cuatro carreras, JWT/REST reales y recorrido de interfaz acotado indicado arriba |
| Pendiente | Edge alta/reset por empresa, Storage privado e imagen íntegra, sesión/reintentos, onboarding/Superadmin, operaciones restantes, carga y recuperación |
| Bloqueado | Publicación sin entorno independiente y autorización; prueba física sin dispositivo/operador |
| Listo para demo | Laboratorio QA integrado; sin nueva publicación |
| Listo para comercialización | NO |

Siguiente trabajo detallado: [NEXT-BACKEND.md](NEXT-BACKEND.md). El próximo bloque implementable es alta/reset con reserva de cupo, idempotencia, compensación y permisos por empresa; después, evidencia privada. Ningún código de esos dos bloques se declara implementado aquí.

Archivos añadidos/modificados en esta continuación: migration 20261010233413_operational_rpcs.sql; tests database, concurrency, auth-api, frontend-api y run-local-stack; package.json/lock; workflow; demo2/backend-operations.js, common.js, central.html, supervisor.js y vendedor.js; README, RESULTS, NEXT-BACKEND y estado/auditoría. Todos pertenecen a RutaSales y su QA. ClickOnMe/MockuPro no se usaron ni modificaron; RutaGPS/RutaGuard sin cambios; main intacto y PR #2 borrador.

## Alta/reset por empresa y concurrencia — 2026-10-11

Evidencia del alta/reset integrado: [run 38096900468](https://github.com/Pgamenox/RutaSales/actions/runs/38096900468), commit `3f93e02e47040b24df68d3e5ed41151fd778dec6`: 37 + 37 SQL, 4 carreras y 20 Auth/API/interfaz, cero fallidas u omitidas. Incluye Edge Runtime local y creación de un Vendedor desde la pantalla Central; las empresas/Central/Supervisor iniciales siguen siendo bootstrap de QA.

La quinta migración añade reserva privada de cupo, idempotencia de alta, finalización SQL atómica y auditoría. Las dos Edge Functions validan JWT con GoTrue y autorizan al Central por empresa/rol en SQL. Nunca aceptan company_id del formulario ni exponen service_role. Una reserva ocupa plaza para todos los escritores y las reducciones de licencia. Replay de alta devuelve el usuario original; conflictos no duplican cuentas.

Se probó compensación tras fallo del vínculo vendedor: se eliminó exclusivamente el Auth creado por esa solicitud y se conservó el Auth preexistente al intentar usar su correo. Estados inciertos conservan reserva privada para reconciliación; no existe aún un reconciliador operativo. CORS sólo acepta localhost/127.0.0.1 en este candidato de QA y requiere configuración explícita para otro destino.

Reset real: Supervisor, Central ajeno y destino Central rechazados. Se cambió contraseña del Vendedor propio; contraseña anterior rechazó login, nueva sesión obtuvo datos y JWT anterior perdió acceso. Si GoTrue admite renovar el refresh anterior, ese token tampoco obtiene datos. Esto acredita bloqueo RLS por session_id y fecha de creación de auth.sessions, no revocación global de JWT/Auth. El código sólo lee auth.sessions; no modifica tablas internas de Auth.

La revisión posterior detectó resets solapados que podían sustituir nonce durante el cambio de contraseña en Auth. Commit `926719d33715050ff1c25505750f3cd19e9dd969` rechaza un nuevo reset mientras el anterior sigue bloqueado y evita finalizarlo dos veces. Un reset interrumpido queda cerrado al acceso hasta reconciliación administrativa; esa recuperación y su interfaz siguen pendientes y bloquean comercialización.

Pruebas ampliadas: 38 SQL embebidas locales aprobaron; [run 38121806810](https://github.com/Pgamenox/RutaSales/actions/runs/38121806810) confirmó 38 + 38 SQL, 6 carreras nativas y 20 Auth/API/interfaz, cero fallidas/omitidas. Ambos jobs SUCCESS. Asesor local WARN/ERROR: exit 0, No issues found; no sustituye revisión externa ni del entorno productivo. Dos conexiones con barrera observable comprobaron un solo ganador para reset y para reserva de última plaza; una inserción directa no pudo eludir la reserva.

Regresión local: 7 unitarias RutaSales y 12 pruebas Node RutaGPS aprobaron, incluyendo el archivo adicional de límites de licencia. La repetición de navegador local quedó bloqueada por ausencia del binario por defecto; usando el binario disponible falló el arranque con SIGSEGV antes de probar pantallas. No se atribuye ese fallo al producto ni se declara aprobada esa repetición local. La prueba real de interfaz se ejecuta en Chromium del runner compatible.

Archivos de esta ampliación: config.toml; migration account_provisioning; funciones _shared/accounts.js, rutasales-admin-users/index.ts y rutasales-reset-password/index.ts; tests database/concurrency/auth-api/frontend-api/run-local-stack; central.html y cinco documentos de estado. No hubo rediseño ni cambios de estilos. ClickOnMe/MockuPro, RutaGPS/RutaGuard y bases remotas sin modificaciones; main verificado en `495862d2297b55fe76650dd55ab6ca8137a66bab`.

Estado: candidato integrado para demo de laboratorio; sin merge ni nueva publicación. NO listo para comercialización. Próximo trabajo: reconciliación verificable de Auth/SQL inciertos, después Storage privado con decodificación completa de imagen y QA de accesos; continuar con onboarding, operaciones restantes, carga, respaldo/recuperación y prueba física.
