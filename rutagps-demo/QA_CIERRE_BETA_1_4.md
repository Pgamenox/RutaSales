# RutaGPS Beta 1.4 — Cierre QA y publicación controlada

2026-10-10. Continuación de `work/rutagps-beta-1.4-audit`, base `adb217732eab0dfcf0ac340e58e386449bc47f33`. PR #1. No se fusionó ni publicó. Alcance exclusivo `/rutagps-demo/`.

## Resultado

**Lista para demo; no lista para comercialización.** QA de navegador y 12 pruebas Node aprobados. Permisos/aislamiento son simulación local; no se garantiza aislamiento de seguridad real ni seguimiento continuo de teléfonos. Sin GPS real, cobros, fotos automáticas ni conexión a bases productivas.

| Prueba | Resultado y evidencia |
| --- | --- |
| Superadministrador | Alta de empresas A/B, asignar/liberar y selección de empresa aprobados |
| Mismo GPS-001 en dos empresas | A=[GPS-001], B=[GPS-001,GPS-002]; cada selector/listado respeta sus asignaciones; quitar GPS-001 de A conserva ambos GPS en B |
| Paquetes 5/12/15/30 | Central muestra exactamente su cantidad asignada; historial enumera la misma cantidad; lógica Node verifica exceso, duplicados, liberación y reasignación |
| Ampliaciones | UI de A pasa 5→12→15→30; B conserva 12; máximo 30 informa error sin modificar cupo |
| Suspensión y renovación | Suspender bloquea asignación, Central e historial/CSV; renovar restaura consulta; probado por UI |
| Vencimiento | Licencia vence mientras Central está abierta; se deshabilitan inicio/avance; historial vacío y CSV bloqueado; renovación en Admin restaura licencia |
| Jornadas | Inicio, avances 5/10 minutos, posiciones ficticias con minuto 10, finalización y temporizador detenido; cambio empresa reinicia datos simulados |
| Historial | 12/96 intervalos: 13/97 posiciones ficticias, listado por empresa vigente |
| CSV | Descarga real del navegador RutaGPS_DEMO_1.csv; encabezado verificado, 13 filas de posiciones, primera muestra minuto 0 y última minuto 60 |
| Entre pestañas | Liberación en Admin invalida selector/historial de otra pestaña sin recarga |
| Móvil | 390×844: inicio/avance con 30 dispositivos, sin desbordamiento horizontal global; tablas tienen desplazamiento interno |
| Escritorio | 1440×1000: Superadministrador, Central e Historial revisados visualmente, identidad azul marino/naranja/cian conservada |
| Errores JavaScript | Cero pageerror en recorrido automatizado |
| Regresión Node | 12 aprobadas / 0 fallidas; diff sin errores de espacios |

Los recorridos son generados por fórmula: dos empresas con el mismo GPS-001 pueden obtener coordenadas ficticias iguales. El caso verifica independencia de asignaciones y estado de simulación; no prueba aislamiento de una base inexistente. El historial ficticio no es persistencia del recorrido de Central.

## Bloqueo resuelto y errores corregidos

La descarga estándar de Chromium seguía devolviendo contenido inválido. Se obtuvo Chromium 153 mediante `@sparticuz/chromium@153.0.0` en un directorio temporal fuera del repositorio; se extrajo su binario Brotli y se ejecutó con Playwright del runtime. No se añade esta dependencia al producto ni a RutaSales.

1. Script de navegador: `browser.newPage()` creaba un contexto de una sola página y fallaba al abrir la segunda pestaña. Corregido con `browser.newContext()` y páginas compartidas.
2. Admin: botón Asignar cupo habilitado cuando licencia llena/suspendida o sin candidatos; ahora se deshabilita. Se mantiene la validación existente en lógica.
3. Script ampliado para verificar CSV descargado, independencia de asignaciones, ampliaciones UI, vencimiento abierto, fin de jornada, móvil y capturas internas para revisión visual.

No se encontraron fallas adicionales que justificaran rediseño.

## Reproducción

Desde raíz del repositorio, con Node 24, Playwright y Chromium disponibles:

```bash
node --test rutagps-demo/beta14.test.mjs rutagps-demo/license-limits.test.mjs
PLAYWRIGHT_MODULE=/ruta/al/modulo/playwright CHROMIUM_EXECUTABLE_PATH=/ruta/al/chromium node rutagps-demo/browser.test.mjs
git diff --check
```

`QA_SCREENSHOTS_DIR` opcional guarda imágenes internas de escritorio/móvil para inspección. Las capturas del cierre se inspeccionaron localmente y no se publican con datos ficticios de QA. No usar glob de todas las pruebas porque browser.test.mjs requiere navegador explícito.

## Archivos de este cierre

- `rutagps-demo/admin.html`: deshabilitar asignación no disponible.
- `rutagps-demo/browser.test.mjs`: corregir contexto y ampliar QA.
- `rutagps-demo/AUDITORIA_BETA_1_4.md`: actualizar bloqueo y estado demo.
- `rutagps-demo/QA_CIERRE_BETA_1_4.md`: este informe y plan de publicación.

El PR completo también incluye central.html, historial.html, index.html, shared-demo.js, beta14.test.mjs y backend-design/{README.md,api-contract.json,policy.mjs}, auditados en la primera entrega. Ningún archivo externo a rutagps-demo se modifica.

## Publicación preparada; autorización pendiente

Destino de demo existente, verificado en navegador: https://pgamenox.github.io/RutaSales/rutagps-demo/ — muestra Beta 1.2 en este cierre. NO es todavía la Beta 1.4.

Después de autorización expresa:

1. Releer main y PR #1; si cambió main, comparar y repetir pruebas sobre el resultado candidato. Confirmar que el diff completo contiene sólo rutagps-demo/.
2. Fusionar PR #1 conservando la base/commit de rollback. No habilitar auto-merge ni crear una publicación adicional ahora.
3. Esperar el despliegue existente GitHub Pages; verificar su resultado. Si no despliega automáticamente, inspeccionar configuración antes de actuar, sin tocar módulos del producto.
4. Smoke test público: index muestra 1.4; enlaces Admin/Central/Historial; dos empresas ficticias y asignaciones, jornada y CSV. Publicar confirmación sólo con evidencia de URL y versión.
5. Ante regresión, revertir únicamente commits/archivos de rutagps-demo a la base anterior, con autorización de reversión previamente acordada. No reset forzado de main ni reversión de cambios ajenos.

## Pendientes y riesgos

- Chrome/Chromium escritorio y viewport emulado aprobados; Safari, Firefox, Android/iOS físicos pendientes.
- LocalStorage no es autorización; demo pública sin autenticación. No ingresar personas o posiciones reales.
- Simulación determinista con pérdida de posiciones al recargar y sin sincronización entre equipos; CSV sin empresa en nombre/header, limitar uso a ejemplo y conservar contexto de origen.
- No se midió carga, concurrencia en servidor, batería ni segundo plano. PWA suspendida no garantiza GPS cada 5 minutos.
- Falta verificar despliegue público de 1.4 después de autorización; smoke test público pendiente por ese motivo.

## Próximo paso backend independiente

Implementar API y almacenamiento sólo en entorno QA RutaGPS separado: identidad verificada y roles, empresa derivada de sesión/token, claves compuestas y autorización por empresa, licencia con asignación transaccional, revocación y jornadas en hora servidor. Antes de conectarlo, pruebas de cruces de empresa y 31 altas concurrentes para cupo 30. Usar adaptadores RutaSales/RutaGuard aislados de sus bases productivas. Mantener GPS real/cobros/fotos desactivados hasta fase autorizada y piloto informado.
