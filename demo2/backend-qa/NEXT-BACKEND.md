# Próximo backend independiente — condiciones de implementación

Este documento es diseño pendiente, no código operativo ni evidencia de seguridad. No enlazar el laboratorio a un proyecto existente ni aplicar el baseline sobre datos reales. ClickOnMe y MockuPro quedan fuera; RutaGPS y RutaGuard sólo tendrán contratos versionados futuros, sin acceso directo a datos.

## Alta y reset de cuentas

- Edge Functions nuevas, autenticadas: validar JWT con Auth y volver a consultar cuenta activa/empresa/rol en servidor; sólo Central administra Supervisor/Vendedor de su empresa. No confiar en user_metadata, role enviado por cliente ni company_id del formulario.
- Alta: idempotency key, reserva de cupo bajo bloqueo de empresa, expiración/reconciliación de reservas, creación Auth fuera de transacción SQL y finalización atómica de cuenta/vendedor. La misma clave debe recuperar el resultado, no crear una segunda cuenta.
- Cada escritor de cupo debe contar vendedores activos y reservas vigentes. Si se agota la última plaza, exactamente una solicitud debe ganar. Renovar/reducir licencia debe considerar reservas.
- Fallo después de crear Auth: compensar únicamente el usuario recién creado por esa solicitud; nunca borrar usuarios preexistentes o de otra empresa. Si falla la compensación, conservar registro privado para reconciliación y no devolver éxito.
- Reset: comprobar que el usuario destino pertenece a la misma empresa y tiene un rol administrable, registrar auditoría sin contraseñas, revocar sesiones según política y probar JWT previos. El bloqueo de datos por cuenta inactiva ya existe; no sustituye revocación Auth.
- Bootstrap de empresa y Central: operación administrativa explícita del backend independiente; no dar a Central acceso a service_role ni a Superadministrador lectura de evidencias por defecto.

## Evidencias privadas

- Storage privado, rutas company_id/actor_id/event_id con identificadores generados por servidor. RLS exige cuenta activa y alcance por empresa/supervisor/vendedor, también en descargas y URLs firmadas.
- No permitir overwrite/upsert de evidencia finalizada. Aceptar sólo tamaños y tipos previstos, decodificar la imagen completa y verificar formato real; la firma inicial JPEG/PNG de SQL no demuestra una imagen íntegra ni captura física.
- Vincular el objeto confirmado con el evento en servidor; limpiar cargas huérfanas sin borrar objetos referenciados. Probar acceso cruzado por ID, ruta manipulada, URLs vencidas, sesión desactivada y reintentos.
- Definir retención/borrado y autorización de exportaciones antes de operar con datos reales. Cámara y GPS de visita requieren prueba física; no implementar rastreo periódico ni fotos automáticas.

## Gates de publicación

1. Completar las dos áreas anteriores y probarlas en el stack efímero sin credenciales productivas.
2. Resolver paquetes/licencias y UI Central/Superadmin, edición/alta de rutas/clientes y onboarding. El adaptador actual conecta sólo las operaciones explícitamente documentadas en RESULTS.md.
3. Añadir idempotencia durable a creación de incidencias y recuperación del resultado de RPC tras pérdida de respuesta. Probar recuperación tras cortes/reintentos, carga simultánea, índices y respaldo/restauración. Las cuatro carreras específicas de QA no certifican capacidad comercial general.
4. Repetir el ciclo de la interfaz contra el backend real candidato con usuarios creados por Edge, no bootstrap de pruebas.
5. Realizar QA físico móvil GPS/cámara/PDF y revisión de permisos en el entorno de destino independiente.
6. Preparar release y rollback revisables. La rama y PR permanecen sin merge/publicación hasta autorización específica.

## Límites actuales

El candidato tiene baseline exclusivo para DB vacía. Falta un mapa de datos y políticas heredadas para cualquier migración futura desde RutaSales-DEMO. No debe conectarse el frontend publicado simplemente cambiando URL/key. El modo candidateBackend permanece false en el repositorio y sólo el servidor QA local lo sustituye en memoria para su prueba.
