# RutaGPS — QA licencias (para ejecutar en staging independiente)

Estado: pruebas documentadas, **no ejecutadas** en Supabase.

## Criterios bloqueantes

- Crear 5 trabajadores afiliados y asignarlos a licencia activa de 5: 5 operaciones correctas.
- Intentar sexto trabajador: rechazo `LICENSE_CAPACITY_REACHED`.
- Dos asignaciones concurrentes al cupo final: exactamente una exitosa.
- Intentar asignar trabajador de otra empresa: rechazo.
- Intentar asignar trabajador inactivo: rechazo.
- Licencia suspendida, pendiente o vencida: rechazo.
- Reducir capacidad por debajo de asignaciones activas: rechazo.
- Ampliar de 5 a 12, 15 y 30 sin pérdida de información ni doble conteo.
- Liberar un asiento y asignar otro: funciona y conserva historial de liberación.
- Usuario Vendedor intenta acceder a posiciones de otro empleado: ninguna fila.
- Supervisor de empresa A intenta ver posiciones de empresa B: ninguna fila.
- Usuario no autorizado intenta cambiar vencimiento o capacidad: rechazo.
- Identificar duplicados en condiciones de reintento/reconexión.

## Antes de habilitar producción

1. Crear instancia RutaGPS independiente.
2. Ejecutar borradores como migración revisada, con roles y políticas más restrictivas.
3. Añadir backend de activación y auditoría (no usar contraseña estática compartida).
4. Probar permisos como usuarios reales no privilegiados; no solo con postgres/service_role.
5. Registrar resultados y pruebas de carga de 5, 15 y 30 usuarios.
6. Revisar aviso de privacidad, consentimiento/información laboral y retención de ubicación.
