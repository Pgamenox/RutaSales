# RutaSales — BETA 2.0 / Roles y Acceso Seguro

Estado canónico: 2026-10-06  
Repositorio: Pgamenox/RutaSales  
Rama: main  
Frontend: /demo2  
Backend: Supabase RutaSales-DEMO (ezfqvhoprfstcmdiflcm)

## Modelo comercial vigente
- RutaSales Equipo.
- $38,000 MXN + IVA por 12 meses.
- 2 pagos semestrales de $19,000 MXN + IVA.
- Hasta 12 vendedores activos.
- Estructura: 1 Central + Supervisores + hasta 12 Vendedores.
- Piloto recomendado: hasta 14 días.

## Implementado en RutaSales 2.0
- Login real con Supabase Auth.
- Roles: CENTRAL, SUPERVISOR, VENDEDOR.
- Redirección automática por rol.
- Contraseñas administradas por Supabase Auth.
- RLS por rol y pertenencia.
- Central puede crear Supervisores y Vendedores.
- Límite técnico de 12 vendedores activos en el alta desde Central.
- Central puede asignar rutas a Supervisores.
- Supervisor ve únicamente sus vendedores, rutas, visitas e incidencias.
- Vendedor ve únicamente sus propias visitas/incidencias.
- Vendedor conserva GPS + cámara en vivo para completar visita.
- Vendedor 2.0 ya incluye contingencias con GPS + foto.
- Vendedor 2.0 ya incluye alta de negocio nuevo con GPS + foto.
- Supervisor 2.0 ya incluye asignación de visitas.
- Supervisor 2.0 ya incluye geocerca comercial y filtros.
- Supervisor 2.0 ya incluye aprobación/rechazo de negocios nuevos.
- Supervisor 2.0 ya incluye contingencias y resolución.
- Supervisor 2.0 ya incluye reasignación de pendientes.
- La reasignación preserva el primer vendedor original si ya existía.
- Supervisor 2.0 ya incluye historial de reasignaciones.
- Beta Muestra 1.4 permanece intacta como respaldo.

## Verificaciones completadas
- Migración complete_role_permissions_for_operations aplicada.
- vendedor.js: sintaxis validada.
- supervisor.js: sintaxis validada.
- central.html: script validado.
- Supabase Security Advisor: 0 lints.
- Estado actual de cuentas Auth/RutaSales: 0 Central, 0 Supervisor, 0 Vendedor.
- Datos demo existentes preservados: 3 rutas y 8 visitas.

## Siguiente punto exacto
1. Crear la primera cuenta CENTRAL con correo y contraseña elegidos por el propietario.
2. Iniciar sesión como Central.
3. Crear un Supervisor QA.
4. Crear un Vendedor QA.
5. Asignar ruta al Supervisor.
6. Crear/asignar una visita al Vendedor.
7. Probar en teléfono GPS + cámara + contingencia + negocio nuevo.
8. Probar aprobación y reasignación desde Supervisor.
9. Crear un segundo Supervisor QA y comprobar aislamiento entre equipos.
10. Si todo pasa: activar Realtime.
11. Antes de producción: mover fotos base64 a Storage y habilitar recuperación/cambio de contraseña.

## Regla de protección
No retirar /demo ni Beta Muestra 1.4 hasta que la prueba E2E de cuentas reales pase.
