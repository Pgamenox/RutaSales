# RutaSales — BETA 2.0 / Roles y Acceso Seguro

Estado canónico de esta fase: 2026-10-06  
Repositorio: Pgamenox/RutaSales  
Frontend nuevo: /demo2  
Backend: Supabase RutaSales-DEMO (ezfqvhoprfstcmdiflcm)

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

## Seguridad
- Autenticación con Supabase Auth.
- Contraseñas gestionadas por Supabase, no guardadas en tablas propias.
- RLS añadido sin retirar las políticas de la Beta 1.4.
- Funciones privadas de autorización para evitar recursión en RLS.
- Función de alta de usuarios protegida y disponible solo para CENTRAL.
- Bootstrap de Central de un solo uso.
- Security Advisor: sin lints al cierre de esta fase.

## Pendiente antes de declarar 2.0 como reemplazo de 1.4
1. Crear y probar la primera cuenta Central.
2. Crear un Supervisor real y un Vendedor real desde Central.
3. Probar aislamiento de datos entre dos Supervisores.
4. Migrar al Supervisor 2.0 las funciones completas de contingencias, aprobación de nuevos clientes y reasignación.
5. Migrar al Vendedor 2.0 el flujo completo de contingencias y alta de negocio nuevo.
6. Activar actualización Realtime después de cerrar la migración.
7. Sustituir fotos base64 por Storage antes de producción.
8. Definir recuperación/cambio de contraseña y reglas de contraseña para producción.

## Regla
No retirar /demo ni la Beta Muestra 1.4 hasta que las pruebas de roles y migración funcional de /demo2 hayan pasado.
