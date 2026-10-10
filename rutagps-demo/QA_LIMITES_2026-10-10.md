# RutaGPS — QA límites de licencias — 2026-10-10

Alcance: copia local de `rutagps-demo/shared-demo.js`, prueba de reglas Node.js. No son pruebas E2E en navegador ni con backend.

## Resultado
- 5/12/15/30 cupos: PASS — el siguiente excedente es rechazado.
- Asignación duplicada dentro de la misma licencia: PASS — rechazada.
- Suspensión/vencimiento: PASS — asignaciones rechazadas.
- Ampliación 5→12→15→30: PASS.
- Renovación y persistencia `localStorage`: PASS.
- Total de comprobaciones agrupadas: 10 PASS.

## Limitaciones confirmadas
1. Un mismo `GPS-001` se puede asignar a dos empresas (sin bloqueo global de dispositivo entre empresas).
2. `GPS-999` pasa validación de formato aunque no exista en el catálogo de 30 dispositivos de la demo.
3. `localStorage` no es seguridad comercial: sus valores pueden manipularse.
4. La concurrencia, el aislamiento real de empresas y las autorizaciones en backend no se han probado.

## Decisión
QA de reglas de capacidad: APROBADA en demo local. Seguridad para comercialización: NO APROBADA.

## Próxima corrección
Validar dispositivo contra catálogo real, definir unicidad por empresa/licencia, y mover autorización, cuotas y vigencias a un backend transaccional antes de rastrear personas o cobrar.
