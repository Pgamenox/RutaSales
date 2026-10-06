# RutaSales — BETA 2.0 / Roles y Acceso Seguro

Estado canónico de esta fase: 2026-10-06  
Repositorio: Pgamenox/RutaSales  
Rama: main  
Frontend nuevo: /demo2  
Backend: Supabase RutaSales-DEMO (ezfqvhoprfstcmdiflcm)

## Modelo comercial vigente
- Marca: Collector Labs.
- Plan principal: RutaSales Equipo.
- Licencia anual: $38,000 MXN + IVA.
- Forma de pago: 2 pagos semestrales de $19,000 MXN + IVA.
- Capacidad comercial objetivo: hasta 12 vendedores activos.
- Estructura prevista: 1 Central + Supervisores + hasta 12 Vendedores.
- Piloto recomendado: hasta 14 días con un grupo pequeño de vendedores.

## Estructura implementada
- Login real con Supabase Auth.
- Roles: CENTRAL, SUPERVISOR y VENDEDOR.
- Cada usuario inicia sesión con correo y contraseña.
- Redirección automática según rol.
- Central puede crear Supervisores y Vendedores.
- Central puede asignar rutas a Supervisores.
- Vendedores creados desde Central quedan vinculados a su propio registro de vendedor.
- Supervisor consulta únicamente vendedores y visitas de su equipo mediante RLS.
- Vendedor consulta únicamente sus propias visitas mediante RLS.
- Vendedor Beta 2.0 conserva captura GPS + cámara en vivo para completar visitas.
- Beta Muestra 1.4 permanece intacta como respaldo mientras termina la migración funcional.

## Seguridad confirmada en la última revisión válida
- Autenticación con Supabase Auth.
- Contraseñas gestionadas por Supabase, no guardadas en tablas propias.
- RLS añadido sin retirar las políticas de la Beta 1.4.
- Funciones privadas de autorización para evitar recursión en RLS.
- Función de alta de usuarios protegida y disponible solo para CENTRAL.
- Bootstrap de Central de un solo uso.
- Security Advisor: sin lints en la última revisión completada.

## Punto exacto de reanudación
1. Restablecer conexión del conector de Supabase.
2. Aplicar permisos pendientes para:
   - rutas visibles para el vendedor según su Supervisor;
   - alta/actualización de clientes por Supervisor;
   - historial de reasignaciones por Supervisor.
3. Migrar al Vendedor 2.0:
   - contingencias con GPS + foto;
   - alta de negocio nuevo con GPS + foto.
4. Migrar al Supervisor 2.0:
   - asignación de visitas;
   - aprobación/rechazo de negocios nuevos;
   - contingencias;
   - reasignación de pendientes;
   - historial de reasignaciones;
   - geocerca y filtros.
5. Crear y probar la primera cuenta Central.
6. Crear Supervisor QA y Vendedor QA.
7. Probar aislamiento entre al menos dos Supervisores.
8. Después activar Realtime.
9. Antes de producción: Storage para fotos y recuperación/cambio de contraseña.

## Regla de protección
No retirar /demo ni la Beta Muestra 1.4 hasta que las pruebas de roles y la migración funcional de /demo2 hayan pasado.

## Nota técnica actual
El conector de Supabase devolvió FGA Authentication Error / Unauthorized al intentar la siguiente migración. No se aplicó parcialmente. GitHub y la Beta 1.4 permanecen sin daño.
