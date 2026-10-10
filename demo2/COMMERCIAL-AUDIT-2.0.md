# RutaSales Beta 2.0 — auditoría y cierre de QA parcial

Fecha: 2026-10-10. Rama: `work/rutasales-commercial-2.0`. Base: `495862d2297b55fe76650dd55ab6ca8137a66bab`.

**Decisión comercial: NO APTO todavía.** Hay correcciones de interfaz probadas y un ciclo demostrativo completo; no hay evidencia suficiente de seguridad multiempresa, concurrencia transaccional ni pruebas de campo. No se fusionó ni publicó esta entrega. RutaGPS, RutaGuard, la demo antigua, estilos y bases existentes permanecen sin cambios.

## Alcance y evidencia

Inspección de `demo2/` (entrada canónica de Beta 2.0), `demo/BETA-STATUS.md`, `docs/COMMERCIAL-PLAN.md`, catálogo de Supabase y código de tres Edge Functions. El backend RutaSales-DEMO se consultó exclusivamente en lectura: columnas, políticas, índices, funciones, asesores y conteos. No se crearon usuarios ni se actualizaron filas reales. Los metadatos observados corresponden a esa fecha y no certifican el comportamiento futuro.

RLS está habilitado en las siete tablas rs_*. Conteos observados: 7 cuentas, 5 vendedores, 3 rutas, 12 visitas, 1 cliente, 1 incidencia, 1 reasignación. No se exportaron registros personales, contraseñas ni tokens al informe. Las pruebas de navegador utilizan una base sintética en memoria y prohíben las solicitudes al backend real.

## Estado por componente

| Componente | Implementado | Probado en esta entrega | Pendiente / bloqueado |
|---|---|---|---|
| Central | Alta, asignación de rutas, reset de contraseña, desactivación y límite visual de 12 vendedores | Alta sintética, ruta, desactivación con nombre que contiene apóstrofe; escritorio/móvil parcial | Auth real, reset real, cuota atómica y revocación de acceso |
| Supervisor | Clientes, rutas, asignaciones, historial paginado, propuestas, incidencias y reasignación | 27 visitas, métricas del día completo, reasignación de 26 pendientes, historial y PDF | Aprobación/rechazo de propuestas real; transacciones y autorización del vínculo ruta-vendedor |
| Vendedor | Visitas, GPS puntual, cámara, incidencias, propuestas, reprogramación | Visita completa con GPS/cámara simulados, evidencia e incidencia; móvil | GPS/cámara físicos, permisos denegados, interrupciones y reprogramación RPC real |
| Autenticación | Supabase Auth y cuentas con roles | Guardas unitarias para activo/rol; login sintético de tres roles | RLS con JWT reales, sesiones revocadas, fuerza bruta y recuperación |
| Datos e historial | FK, unicidad por cliente/ruta/fecha/intento, registro de reasignaciones | Conservación del vendedor original en 26 filas sintéticas | Atomicidad, inmutabilidad de evidencia y recuperación de fallos parciales |
| PDF | jsPDF diario por vendedor | Dos descargas reales de 26 filas; extracción y render; ajustes de líneas largos probados en unidad | Impresión física, caracteres especiales/font completo y reportes muy grandes reales |
| Multiempresa / Superadministrador | Sin soporte de empresa en esquema actual | Inspección de columnas y políticas | No hay company_id, rol Superadmin ni licencias independientes |
| Comercial | Documento de Plan Equipo de 12 vendedores | Inspección de documento y validación de código | Vencimientos, renovaciones, paquetes superiores y pruebas simultáneas reales |

## Errores corregidos

1. `Number(null)` clasificaba ausencia de distancia como válida. Ahora se distingue ausencia/invalidez tanto en indicadores como en PDF.
2. Indicadores del Supervisor dependían de las 25 filas visibles. Ahora se obtienen conteos exactos del día; 27 pendientes se mostraron correctamente.
3. Reasignación por incidencia movía sólo pendientes visibles. Ahora consulta todas las páginas de la ruta/vendedor y valida vendedor/estado antes de cada actualización.
4. Varias actualizaciones anunciaban éxito sin confirmar una fila afectada. Se exige una fila devuelta para completar visita, asignar ruta, reasignar y desactivar; cero filas produce error.
5. Nombre de vendedor interpolado en JavaScript inline rompía nombres con apóstrofes. El manejador obtiene el nombre desde las cuentas usando identificadores.
6. PDF truncaba consultas grandes y podía salir de márgenes con líneas largas. Se pagina la consulta y se envuelven líneas con salto de página.
7. Roles desconocidos/inactivos podían redirigirse como vendedores. Ahora se rechazan explícitamente y se cierra la sesión inválida en la entrada.
8. Se evita doble envío simultáneo de fotografía mediante desactivación del botón mientras se envía. Se validan coordenadas/precisión y formatos JPEG/PNG de evidencias mostradas.

Estas guardas de cliente no reemplazan controles del servidor. Los rangos de zona existentes (100/250 metros) se conservaron; la política por radio configurado requiere especificación y prueba adicional.

## Pruebas aprobadas

- 7 pruebas Node: distancia, roles, GPS, fecha/formato de evidencia, cero filas/error, paginación de más de 1.000 registros y diseño de PDF con líneas largas.
- 2 ciclos Playwright completos con backend sintético: Central → Supervisor → Vendedor → visita → GPS simulado → cámara ficticia → incidencia → 26 reasignaciones → historial → PDF → desactivación.
- Chromium 153 disponible mediante paquete de runtime, sin omitir verificaciones TLS. Supabase sustituido sólo por el servidor QA; jsPDF 2.5.1 real empaquetado localmente.
- Viewport 390×844 para los tres roles; Supervisor también 1280×900. Sin desbordamiento horizontal ni errores JavaScript del producto en los ciclos.
- Dos PDFs con 26 visitas y 26 menciones de «sin distancia», sin truncar la fila 26. Render visual de la primera página inspeccionado.
- Regresión de RutaGPS: sus 12 pruebas Node siguen aprobadas, sin modificar el módulo.
- Sintaxis de módulos/scripts y `git diff --check`.
- Registro de resultados y hashes de capturas/PDF: `qa/results-2026-10-10.json`; las capturas se regeneran con el harness.

**No aprobadas ni ejecutadas:** seguridad real mediante JWT, dos empresas en Supabase, carga de usuarios concurrentes, licencias/vencimientos/renovaciones, GPS o fotos físicos, offline, reinicio durante envío, reprogramación real y recuperación transaccional. Un mock de permisos no demuestra RLS.

## Bloqueadores y riesgos

**Críticos**

- Persisten políticas heredadas de acceso anon con cabecera estática publicada en la demo antigua. RLS habilitado no basta: esas políticas constituyen una vía de acceso alternativa. Retirarlas requiere migración y QA de los consumidores antiguos antes de tocar el backend existente.
- No hay separación por empresa. Central tiene alcance global y los clientes son compartidos por roles. No se puede vender una instalación compartida como multiempresa segura.
- Cuota de 12 vendedores en `rutasales-admin-users` usa contar y luego crear; dos peticiones pueden superar la cuota. Bootstrap Central tiene un patrón parecido y un código fijo. Falta operación atómica/idempotente y control de abuso.

**Altos**

- Reasignar, registrar historial, resolver incidencia y desactivar cuenta son operaciones sucesivas, no una transacción. Un fallo intermedio puede dejar estados parciales, aunque ahora se informan.
- UPDATE directo de visitas no restringe suficientemente columnas/transiciones ni exige evidencia verificable en servidor. Un cliente modificado puede evadir guardas de interfaz.
- `rs_reprogram_visit` es SECURITY DEFINER y exige usuario autenticado, propietario y visita pendiente, pero sólo comprueba longitud de la fotografía y no valida suficientemente GPS/evidencia. El aviso de ejecución anon no prueba acceso sin autenticación: la función comprueba auth.uid().
- Políticas de Supervisor requieren validar además actividad de cuenta, propietario de ruta y coherencia del vendedor en operaciones completas.
- Asesor Auth señala protección contra contraseñas filtradas desactivada. No se activó en el proyecto existente.
- Fotos base64 en filas y consultas amplias del Vendedor, incidencias/propuestas limitadas a 50 y operaciones por fila dificultan escalar. Paginación estable bajo escrituras concurrentes y almacenamiento privado requieren QA.

## Condiciones para cierre comercial y siguiente backend

1. Crear un proyecto de QA independiente con esquema/versiones reproducibles y datos ficticios; no usar bases productivas para probar modificaciones.
2. Preparar migración aditiva revisable: empresas y membresías, tenant obligatorio en tablas, permisos de Central/Supervisor/Vendedor, Superadmin separado, índices/unicidad por empresa y licencias por empresa con fechas/estados. Alternativa inicial a evaluar: instalación aislada por empresa, sin afirmar multiempresa compartida.
3. Incorporar RPC transaccionales para cuota, reasignación y desactivación; proteger transición/evidencia; sustituir el acceso heredado con un plan compatible. No ejecutar el SQL antiguo sin contrastarlo con el catálogo actual.
4. Pruebas de dos empresas con identificadores repetidos, JWT de todos los roles, consultas y escrituras prohibidas, cuentas inactivas y renovación/vencimiento. Probar simultáneamente la última plaza del plan y completar/reasignar la misma visita.
5. Pruebas físicas Android/iOS del ciclo completo, GPS puntual y fotografía voluntaria, redes inestables, impresión PDF y recuperación de fallos; medir latencia y consumo de memoria.
6. Contrato de API futuro con RutaGPS/RutaGuard mediante tenant, IDs externos, permisos y eventos versionados. Mantener RutaGPS opcional: sin rastreo periódico, cobros ni fotografía automática en esta fase.

**Listo para demo:** ciclo local controlado con datos sintéticos y las correcciones propuestas. **Listo para comercialización:** no. **Publicación:** rama de trabajo y revisión; fusión y despliegue requieren autorización específica y resolver los bloqueadores correspondientes.

## Archivos

Modificados: `demo2/central.html`, `common.js`, `index.html`, `supervisor.js`, `vendedor.js` y referencia de estado en `BETA-STATUS.md`. Nuevos: `operations.js`, `daily-report.js`, este informe y `qa/` (pruebas y guía). No hay cambios fuera de demo2.

## Continuación: candidato backend QA

Se añadió [backend-qa/README.md](backend-qa/README.md) con migraciones exclusivas para base vacía, RLS por empresa, licencias, cuota y RPC transaccionales. Se aprobaron 23 pruebas SQL embebidas, 23 en PostgreSQL 17.11 nativo y 2 de concurrencia en GitHub Actions ([evidencia](https://github.com/Pgamenox/RutaSales/actions/runs/38090566121)). El bloqueo nativo local se resolvió mediante contenedor temporal de CI. No se aplicó a Supabase existente ni se conectó al frontend. El dictamen NO APTO permanece; [resultados y límites](backend-qa/RESULTS.md).

### Comprobación Auth/API del candidato (2026-10-10)

El candidato aislado aprobó 10 pruebas adicionales con GoTrue, JWT firmados y PostgREST reales en [CI 38095163411](https://github.com/Pgamenox/RutaSales/actions/runs/38095163411): aislamiento de dos empresas, permisos, metadatos adulterados, vencimiento/renovación y bloqueo de datos de cuenta desactivada. También se repitieron y aprobaron las 7 pruebas unitarias, 2 ciclos sintéticos de navegador y 12 pruebas RutaGPS. Los pendientes de seguridad real indicados arriba describen el backend publicado: no se migró ni conectó el candidato al frontend. Revocación Auth, Edge de alta/reset, Storage, integración E2E real y QA de campo siguen pendientes. Ver [RESULTS.md](backend-qa/RESULTS.md) para alcance y límites. ClickOnMe y MockuPro no se usaron ni modificaron; no se fusionó ni publicó.

### Operaciones atómicas y ciclo con interfaz/API reales (2026-10-10)

El candidato añadió RPC de incidencias/propuestas, aprobación/rechazo/resolución, reprogramación y asignación segura de rutas. El adaptador de la interfaz se activa sólo en el servidor QA loopback; no se desplegó. [CI 38096174864](https://github.com/Pgamenox/RutaSales/actions/runs/38096174864), commit 8f913176f60aa2da8d8745ab4b8291678f8a8f5c: 32+32 SQL, 4 carreras y 15 Auth/API/interfaz, sin fallos. La interfaz existente completó visita con GPS/cámara simulados, incidencia, reasignación de más de 25 pendientes, PDF y baja contra Auth/PostgREST reales. Propuestas/reprogramación verificadas por API/SQL; alta/reset todavía usan bootstrap, no Edge candidatas. Asesor SQL local: sin hallazgos WARN/ERROR. Esto no certifica el frontend publicado, Storage ni campo. El dictamen comercial continúa NO APTO. [Resultado completo](backend-qa/RESULTS.md) y [condiciones del próximo backend](backend-qa/NEXT-BACKEND.md).
