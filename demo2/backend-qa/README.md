# RutaSales — backend QA, candidato 0.1

**Preparado y probado parcialmente. Con adaptador de frontend sólo para QA local, no aplicado al proyecto existente, no apto para producción.** Mantiene nombres y columnas de las siete tablas actuales; agrega tenant, licencias, RLS y operaciones transaccionales. No reconstruye la interfaz ni altera RutaGPS/RutaGuard.

## Ejecutar pruebas sin servicios externos

Node 24. Desde esta carpeta:

```sh
npm ci --ignore-scripts
npm test
npm run test:concurrency
```

El primer comando de pruebas ejecuta PostgreSQL embebido (PGlite 0.3.14), las migraciones SQL y datos ficticios en memoria. **38 pruebas SQL locales aprobadas; evidencia nativa vigente en RESULTS.md.** El segundo omite explícitamente seis pruebas cuando falta NATIVE_PG_URL. Eso no constituye aprobación de concurrencia.

Auth en esta suite es una función de prueba `auth.uid()` con el UUID de sesión y roles SQL anon/authenticated. Las políticas RLS sí son ejecutadas por el motor PostgreSQL; no hay firmas JWT, servidor Auth, PostgREST, Storage ni Edge Functions reales. No usar este stub en Supabase. El esquema auth del servicio real lo administra Supabase.

Resultados: `RESULTS.md`. Las dependencias están fijadas y se incluye lockfile. Binarios de navegador/Postgres no forman parte de esta entrega.

## Probar conexiones independientes

En una máquina con PostgreSQL, crear una base **vacía** `rutasales_qa` en localhost, y un propietario de QA con privilegios para crear roles. Usar un secreto de QA por variable de entorno; nunca credenciales productivas. El runner rechaza hosts remotos y nombres de base distintos, y database.test rechaza tablas RutaSales preexistentes.

```sh
export NATIVE_PG_URL='postgresql://usuario_qa@127.0.0.1:5432/rutasales_qa'
node --test tests/database.test.mjs
node --test tests/concurrency.test.mjs
```

Los comandos se ejecutan en ese orden; no paralelizar los archivos. La suite nativa crea la misma fixture de 38 pruebas. La suite de concurrencia espera ese estado y utiliza varias conexiones, barrera de bloqueo observable en pg_stat_activity y timeouts. Compite por una única plaza cinco veces, compite por completar/reasignar una visita, por reprogramarla dos veces y por aprobar la misma propuesta dos veces. No reutilizar otra base ni un usuario de producción.

El intento local quedó bloqueado por permisos del entorno. Se resolvió ejecutando el mismo candidato en GitHub Actions con PostgreSQL 17.11 temporal: 32 pruebas nativas y 4 de concurrencia aprobadas. Ver RESULTS.md para run/commit. Las omisiones al ejecutar sin NATIVE_PG_URL siguen siendo explícitas; sólo la ejecución CI con conexiones reales acredita estas carreras.

## Supabase local o proyecto QA dedicado

El proyecto CLI de `supabase/` fue inicializado y los nombres de migración fueron generados por CLI. Generación con CLI 2.54.11 y 2.120.0; el runner usa CLI 2.120.0 fijado en package-lock. `supabase --help` y `supabase start --help` deben consultarse antes de ejecutar en otro entorno. Requiere Docker para el stack local completo.

No hay enlace a un proyecto remoto, credenciales ni automatización de deploy. El seed está vacío; signup público deshabilitado. Las migraciones requieren una base vacía y fallan si ya hay tablas/filas RutaSales. **No son una migración de la base actual**: la primera sólo materializa el contrato de columnas observado en lectura, sin sus políticas ni triggers heredados.

La futura migración de datos necesita un mapa empresa→filas validado, claves originales, comparación completa de constraints/triggers y ensayo de respaldo/restauración. No inferir empresas a partir del nombre de vendedor. No borrar políticas existentes con este candidato ni ejecutar PENDING_ROLE_PERMISSIONS.sql en producción.

## Contrato candidato

- Una cuenta operativa pertenece a una empresa; conserva user_id como PK. Central/Supervisor/Vendedor mantienen roles actuales. Membresía de una persona en varias empresas requiere un diseño posterior.
- Superadmin se registra exclusivamente por operación administrativa en esquema privado. Gestiona licencias y lista empresas, pero no obtiene evidencia/visitas automáticamente. No hay código de activación fijo.
- Toda tabla operativa tiene company_id obligatorio, default derivado de cuenta activa; clientes y nombres pueden repetirse en empresas distintas. Las relaciones usan FK compuestas por tenant. No se confía en user_metadata ni en company_id enviado por el navegador.
- Una licencia por empresa: límite configurable, inicio, vencimiento y ACTIVE/SUSPENDED. Vencimiento se evalúa por hora de servidor; historia sigue legible para cuentas activas, pero se bloquean operaciones nuevas. Sin cobros.
- Cuota de vendedores aplicada por trigger, incluso para escritores privilegiados, con bloqueo por empresa. Ese bloqueo también ordena operaciones sensibles; se prioriza integridad a costa de contención por empresa, que debe medirse.
- UPDATE/DELETE directo del cliente a visitas, cuentas, vendedores e historial está revocado. No hay políticas anon ni permisos heredados por cabecera. Insertar visitas/clientes requiere licencia y rol; el servidor comprueba supervisor de vendedor/ruta y obtiene destino GPS del cliente.
- RPC: rs_complete_visit, rs_reassign_incident, rs_deactivate_seller, rs_set_license, rs_submit_incident, rs_resolve_incident, rs_reprogram_visit y rs_assign_route. Wrappers públicos SECURITY INVOKER; implementaciones privadas con autorización explícita, search_path vacío y EXECUTE acotado. No se exponen esquemas privados en la API.
- Baja con pendientes exige reemplazo, conserva visitas y bloquea la identidad por estado activo en cada consulta. Sesiones Auth deben revocarse adicionalmente al incorporar el flujo de alta/reset y recuperación.
- Evidencia: coordenadas/acierto temporal, precisión hasta 150m, foto base64 acotada y firma JPEG/PNG; fecha y distancia calculadas por servidor. **Esto no acredita procedencia física ni imagen completa válida**. La cámara real, decodificación íntegra y almacenamiento privado son pendientes.

## Integración y cierre pendientes

El frontend continúa usando su backend actual y operaciones antiguas. No activar estas migraciones detrás del frontend publicado. El adaptador RPC sólo se habilita en la respuesta del servidor QA loopback; candidateBackend=false permanece en el código de producto. Alta/reset tienen dos Edge Functions candidatas con autorización tenant, reserva/idempotencia/compensación. Falta bootstrap administrado y reconciliación; no copiar las Edge Functions heredadas sin tenant.

Incidencias/propuestas, resolución/aprobación, reprogramación y asignación de rutas ya tienen RPC candidatas. Faltan alta/edición de rutas, permisos de cambios de clientes; onboarding de empresas y UI Superadmin; trazabilidad de licencias con políticas de retención; carga/índices de todas las FK y plan de recuperación. No se habilita todavía escritura amplia para sustituir esas operaciones ausentes.

Auth/JWT de los cuatro roles, dos empresas, REST/RPC, cuentas inactivas y vigencias ya se comprobaron en CI (RESULTS.md); límites y cuatro carreras también aprobaron. Antes de fusionar siguen pendientes: asesores del entorno de destino, prueba física de GPS/cámara y ciclo completo incluyendo alta/reset mediante Edge nuevas. Configurar recuperación/MFA/rate limits, analizar logs sin evidencia sensible y medir contención del bloqueo por empresa.

Compatibilidad futura con RutaGPS/RutaGuard: tenant e identificadores externos en contratos versionados; no otorgar acceso directo a bases ajenas. Sin rastreo periódico, cobros ni fotos automáticas.

## Auth y API reales en CI (comprobación independiente)

`tests/run-local-stack.mjs` está restringido a un runner GitHub hospedado y efímero. CLI Supabase 2.120.0 fijado en el lockfile; arranca PostgreSQL, GoTrue, PostgREST, gateway y Edge Runtime locales. Aplica migraciones con `db reset --local`, comprueba URLs loopback, rechaza un proyecto enlazado y elimina contenedores/volúmenes al terminar. No crea proyectos en la cuenta Supabase ni utiliza sus credenciales.

`tests/auth-api.test.mjs` crea ocho usuarios ficticios mediante Auth admin local, inicia sesiones con contraseña y utiliza JWT firmados por GoTrue para REST/RPC. Incluye sesiones de Central/Supervisor/Vendedor/Superadmin, credenciales incorrectas, JWT adulterado, signup deshabilitado, anon, dos empresas, user_metadata alterado con JWT nuevo, asignación, finalización, vencimiento/renovación y baja con un JWT todavía válido. Las claves y contraseñas temporales no se imprimen ni se guardan en Git.

tests/frontend-api.mjs conecta la interfaz existente con Auth/API local y RPC reales; bloquea solicitudes externas y sirve bundles locales de SDK y PDF. GPS/cámara son sintéticos, mientras que sesiones, RLS, SQL y PDF son reales. El reemplazo Vendedor del recorrido se crea desde Central mediante Edge real. Empresa/Central/Supervisor iniciales son bootstrap de QA; reset se prueba por API.

Estado y evidencia de ejecución: RESULTS.md.

Siguiente backend y gates: [NEXT-BACKEND.md](NEXT-BACKEND.md). No confundir estas pruebas con una validación del frontend publicado, Storage, Edge Functions de alta/reset, protección contra abuso o pruebas físicas. El backend remoto actual sigue intacto.
