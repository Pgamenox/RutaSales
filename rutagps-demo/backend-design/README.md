# RutaGPS: diseño independiente de backend (Beta 1.4)

Estado: especificación y contrato ejecutable, NO backend desplegado. No contiene credenciales, no conecta a bases existentes y no inicia rastreo ni cobros.

## Separación

Nuevo servicio RutaGPS API v1 y base exclusiva, con entornos desarrollo/QA/producción separados, identidades de servicio y secretos independientes. RutaSales y RutaGuard conservarán sus datos y funciones. Adaptadores futuros usarán HTTPS y tokens específicos por integración, nunca credenciales productivas compartidas. No importar localStorage a producción automáticamente.

## Autenticación y permisos

Proveedor de identidad independiente; sesiones cortas, revocación, MFA obligatorio para Superadministrador, contraseñas con hash en servidor/proveedor. Central y Supervisor se obtienen de membresías verificadas; no se acepta un rol o companyId declarado por navegador. Tokens de dispositivo únicos, revocables y vinculados a empresa + dispositivo. Superadministrador administra empresas y licencias sin acceso ordinario a recorridos. Central administra dispositivos y jornadas de su empresa. Supervisor consulta y opera sólo dispositivos asignados. `policy.mjs` modela decisiones usando un actor ya autenticado; NO valida JWT ni sustituye middleware.

## Modelo de datos propuesto

| Entidad | Campos y restricciones principales |
| --- | --- |
| companies | UUID, nombre, estado, fecha de creación |
| memberships | usuario, company_id, rol; unicidad usuario/empresa |
| licenses | company_id único, capacity (5/12/15/30), estado, expires_at UTC, versión |
| devices | UUID interno, company_id, external_id, estado, token_hash; unicidad company_id/external_id |
| supervisor_devices | company_id, supervisor_id, device_id; pertenencia validada en ambos extremos |
| shifts | UUID, company_id, device_id, inicio/fin UTC, zona IANA, informado, cierre; fin mayor que inicio, sin solapamiento activo |
| positions | company_id, device_id, shift_id, captured_at, received_at servidor, lat/lng, precisión, event_id; unicidad empresa/dispositivo/evento |
| audit_events | actor, empresa, acción, resultado, hora servidor, request_id; sólo anexar, sin ubicación en logs generales |

Claves foráneas compuestas con company_id evitan referencias entre empresas. Aislamiento adicional en base y autorización en cada endpoint. Índices empresa/dispositivo/captured_at para consultas paginadas y empresa/shift para jornada. Política inicial propuesta: posiciones 90 días, auditoría 12 meses; validar con cliente y requisitos aplicables antes de despliegue. Backups cifrados, restauración ensayada y borrado verificable.

## Licencias transaccionales

Al asignar, bloquear la fila de licencia, verificar estado/vencimiento con hora servidor, contar dispositivos activos de esa empresa e insertar dentro de la misma transacción. Reintentos con idempotency key; límites también en API y base. Prueba obligatoria de 31 altas concurrentes para cupo 30: exactamente 30 admitidas. Ampliaciones sólo Superadministrador; conservan vencimiento/asignaciones. Renovación añade 12 meses desde mayor de ahora/vencimiento, ajustando fin de mes; conserva trazabilidad. Suspensión y vencimiento bloquean ingestión y acceso operativo; la API debe decidir explícitamente si concede consulta histórica administrativa. La demo bloquea todo historial inactivo.

## Jornada y GPS

Captura a intervalos mínimos de 300 segundos sólo después de información visible y jornada explícita activa. Al cerrar, vencer o suspender se cancela el temporizador y se rechazan nuevas posiciones en servidor. Jornada UTC con zona IANA para presentación; admite turnos que cruzan medianoche. Propuesta estricta: no aceptar carga retrasada después del cierre ni posiciones de más de 5 minutos; evita rastreo tardío pero descarta datos offline. Cambiar esa política requerirá diseño y pruebas adicionales.

`canIngest` prueba límites de jornada y tiempo, pero el servidor todavía debe validar asignación activa, revocación, coordenadas, precisión, event_id y deduplicación transaccional. No confiar en captured_at del cliente como evidencia cierta; received_at lo fija servidor. Un teléfono puede falsificar GPS; registrar precisión y riesgo, no prometer evidencia antifraude.

Una PWA no garantiza captura cada 5 minutos con pantalla bloqueada o aplicación suspendida. Para vender seguimiento continuo se requiere validar Android/iOS reales y posiblemente aplicación nativa con servicio en segundo plano. Sin permiso, sin GPS o sin red: mostrar estado explícito; nunca completar posiciones inventadas. Cámara y fotografías automáticas fuera de alcance.

## API v1 propuesta

Todas las operaciones autentican y autorizan en servidor. company_id se deriva de membresía/token; filtros nunca amplían permisos. Especificación estructurada en `api-contract.json`.

| Endpoint | Permiso | Resultado |
| --- | --- | --- |
| POST /v1/companies | Superadministrador | Alta empresa |
| PATCH /v1/companies/{id}/license | Superadministrador | Ampliar, suspender, renovar con versión esperada |
| POST /v1/devices | Central | Alta dentro del cupo; idempotency key |
| DELETE /v1/devices/{id} | Central | Revocación y liberación transaccional |
| POST /v1/devices/{id}/shifts | Central/Supervisor asignado | Jornada informada con límites UTC |
| POST /v1/shifts/{id}/close | Central/Supervisor asignado | Cierre inmediato |
| POST /v1/positions | Dispositivo vinculado | Ingestión validada durante jornada |
| GET /v1/devices/locations | Central/Supervisor asignado | Últimas posiciones autorizadas |
| GET /v1/devices/{id}/positions | Central/Supervisor asignado | Historial paginado por período |

Errores: 401 sin autenticación, 403 sin permiso, 404 recurso ajeno/inexistente, 409 cupo/concurrencia/duplicado, 422 datos inválidos, 429 límite de solicitudes. TLS, validación estricta, rate limits por identidad/empresa, límites de tamaño, CORS allowlist, CSRF para cookies. Nunca exponer claves en GitHub Pages.

Adaptadores RutaSales/RutaGuard enviarán external_id, source y event_id; dispositivo interno ligado a empresa evita colisiones. No se afirma compatibilidad probada: faltan adaptadores y ensayos end-to-end.

## Capacidad y criterios de aceptación

| Dispositivos | Reportes/hora | Reportes/8 horas | Reportes/22 jornadas |
| --- | ---: | ---: | ---: |
| 5 | 60 | 480 | 10,560 |
| 12 | 144 | 1,152 | 25,344 |
| 15 | 180 | 1,440 | 31,680 |
| 30 | 360 | 2,880 | 63,360 |

Cálculo a 12 reportes/hora, sin muestra inicial ni reintentos. Es volumen teórico, NO prueba de carga. Para N empresas multiplicar por N; suavizar ráfagas de dispositivos sincronizados. Medir API + base a 30 y 300 dispositivos sintéticos, latencia p95 propuesta <500 ms, errores <1%, cupos correctos bajo concurrencia; establecer presupuesto y retención antes de producción.

Puertas comerciales: pruebas de aislamiento por todos los endpoints, JWT falsos/expirados, revocación inmediata, carrera de cupos, cierre/vencimiento en ingestión, restauración, retención/borrado, observabilidad, pruebas reales de batería/segundo plano y piloto informado. Sin esas evidencias no está listo para comercialización.
