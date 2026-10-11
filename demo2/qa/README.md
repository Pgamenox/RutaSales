# QA aislado de RutaSales

Desde la raíz del repositorio:

```sh
node --test demo2/qa/operations.test.mjs
PLAYWRIGHT_MODULE=/ruta/node_modules/playwright \
CHROMIUM_EXECUTABLE_PATH=/ruta/chromium \
JSPDF_QA_BUNDLE=/ruta/jspdf-bundle.js \
QA_OUTPUT_DIR=/tmp/rutasales-qa \
node demo2/qa/browser.test.mjs
```

Requisitos externos: Node 24, Playwright, Chromium compatible y bundle ESM de jsPDF 2.5.1. El bundle se produce con esbuild a partir de `export {jsPDF} from 'jspdf'`, usando `--bundle --format=esm --platform=browser`. Se puede usar Chromium de Playwright; en este entorno se extrajo chromium.br de @sparticuz/chromium 153 con Brotli por bloqueo del descargador habitual.

El servidor local reemplaza sólo la importación de Supabase por `client-fixture.js`. Datos en memoria, Auth simulado y GPS/cámara ficticios; todas las solicitudes externas se rechazan salvo jsPDF local y la Edge Function simulada. No iniciar este servidor como demo pública ni utilizar el fixture para certificar permisos de Supabase. El producto sigue importando Supabase real.

Ejecuta dos ciclos, genera screenshots de tres roles móviles y Supervisor escritorio, y dos PDFs. El catálogo/RLS real se auditó en lectura; ver COMMERCIAL-AUDIT-2.0.md para límites y bloqueadores. No hay pruebas reales de multiempresa ni concurrencia del servidor todavía.
