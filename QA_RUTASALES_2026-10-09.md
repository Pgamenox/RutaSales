# RutaSales 2.0 — revisión QA (2026-10-09)

Esta rama no altera producción.

## Hallazgos por verificar

1. `demo2/supervisor.js`, función `zone(v)`: `Number(null)` resulta `0`; cuando `distance_m` es nulo se puede mostrar incorrectamente como VISITA VÁLIDA. Verificar `null`/cadena vacía antes de convertir, exigir distancia finita no negativa y respetar `allowed_radius_m`.
2. Los contadores de visitas pendientes, completadas y validación por zona se derivan de `visits`, colección paginada de 25 registros. Mostrar denominadores de página o consultar totales del día mediante consultas seguras.
3. La prevención de duplicados del botón `saveVisit` usa solamente el arreglo local `visits` (también paginado). Dos supervisores o páginas distintas podrían intentar insertar la misma combinación cliente/ruta/fecha. Probar y aplicar constraint o RPC transaccional en backend, tras verificar reglas de reprogramación.
4. Validar que ningún rol pueda leer o modificar visitas de otro usuario salvo los permisos explícitos de supervisor/central mediante RLS.
5. PDF diario: comparar totales y excepciones con visitas reales y controlar distancias sin datos.

## Pruebas pendientes

- Sin GPS: no marcar visita válida.
- Distancia 0 con medición presente: válida solo cuando se acredita GPS.
- Radios 50 y 200 metros: evaluar a ambos lados del límite.
- 26 o más visitas en un día: contadores y duplicados correctos.
- Dos sesiones concurrentes intentando reservar mismo cliente/ruta/fecha: como máximo una asignación activa, salvo reglas permitidas para reprogramación.
- Supervisor y vendedor simultáneos: evidencias y autorizaciones correctas.

**Estado:** hallazgos de revisión estática; requieren pruebas. No describirlos como fallos explotados ni QA de producción aprobado.
