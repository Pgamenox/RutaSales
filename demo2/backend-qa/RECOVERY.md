# Recuperación de cuentas — candidato aislado

Estado: diagnóstico implementado; reconciliación administrativa y automatización pendientes. Este documento no autoriza operaciones sobre bases existentes. Sólo el laboratorio efímero usa usuarios ficticios.

## Diagnóstico disponible

`rs_account_request_status(p_id)` exige Central activo y devuelve únicamente la solicitud de su empresa iniciada por esa misma cuenta. Un UUID de otra empresa o actor devuelve NOT_FOUND, igual que uno inexistente. No expone correo, contraseña, worker_id ni metadatos Auth. Una licencia vencida no impide consultar el diagnóstico; una empresa/cuenta desactivada sí.

`rs_reset_status(p_target)` exige Central activo y un Supervisor/Vendedor activo de su empresa. Estados NORMAL, BLOCKED y REQUIRE_NEW_LOGIN. No devuelve nonce, contraseñas ni información de sesiones. La consulta no altera el bloqueo ni ejecuta cambios de Auth.

Central consulta automáticamente el estado de su request_id cuando falla la respuesta de alta. Si SQL confirma COMPLETE con user_id, muestra Usuario creado y recarga las cuentas; no vuelve a crear Auth. Si el resultado exige reconciliación, conserva el formulario e informa el identificador de solicitud. No recupera claves tras recargar la página.

| Alta | Acción segura actual | Recuperación pendiente |
|---|---|---|
| COMPLETE | Consultar resultado o repetir el mismo alta con la misma clave; se devuelve user_id original | Persistencia de clave tras recarga sin almacenar contraseñas; la misma pantalla ya recupera COMPLETE tras pérdida de respuesta |
| PENDING vigente | Esperar; no lanzar otra creación | Seguimiento de operación con timeout y trabajador único |
| PENDING vencido | Diagnóstico marca reconciliación; no supone que Auth falló | Recuperar identidad etiquetada y probar toma de control ante trabajadores lentos |
| RECONCILE | Conservar reserva, identidad y auditoría; no borrar automáticamente | Verificar actor/empresa/tag/vínculo y decidir finalizar o compensar de forma exclusiva |
| FAILED | No asumir una cuenta creada; revisar el resultado | Reintento con política definida y nuevo identificador cuando corresponda |
| NOT_FOUND | No inferir existencia ajena ni crear por intuición | Recuperar identificador original o revisión administrativa |

## Reset interrumpido

1. Consultar estado con Central autorizado. BLOCKED exige reconciliación; reintentar el cambio de contraseña está rechazado para impedir resets solapados.
2. Verificar en el backend independiente que el trabajador original terminó y si Auth confirmó el cambio. Una respuesta perdida, el transcurso de cinco minutos o un nonce almacenado no prueban ese resultado.
3. Mantener bloqueo si el resultado es incierto. No desbloquear por reloj, no sustituir nonce y no modificar directamente tablas internas de Auth.
4. El recuperador futuro debe tener prueba durable del resultado Auth, autorización actual del actor/destino y exclusión mutua antes de invocar la finalización SQL del nonce original. Resolver también el caso de actor dado de baja o licencia vencida.
5. Tras finalización se exige nuevo login. Los JWT/sesiones anteriores continúan sin datos por RLS. Esto no es una revocación global de JWT ni demuestra cierre de todos los servicios futuros.

La finalización existente está reservada a service_role en servidor, valida actor/empresa/nonce y sólo acepta un bloqueo pendiente. No hay endpoint público de desbloqueo ni interfaz de reconciliación. El cliente nunca recibe service_role.

## Evidencia y límites

Ocho pruebas `account-failures.test.mjs` inyectan fallos en reserva, creación Auth, finalización SQL, compensación, pérdida de respuesta tras COMMIT, recuperación de identidad etiquetada, trabajador no autorizado y reset interrumpido. Son dobles del SDK que verifican decisiones del handler; no son cortes de red reales ni certifican recuperación distribuida.

Las pruebas SQL/REST adicionales verifican autorización y diagnóstico. Las pruebas anteriores de GoTrue/Edge reales siguen cubriendo alta, replay, compensación exitosa, preservación de Auth preexistente, reset y bloqueo de JWT anteriores. Resultados y commit exacto en RESULTS.md.

Antes de comercializar: implementar reconciliador operativo, pruebas con cortes en cada frontera Auth/SQL, compensación realmente fallida y lease vencido con trabajador lento; no marcar este bloque como terminado sólo por contar pruebas aprobadas.
