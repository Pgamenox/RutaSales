# RutaGPS — Auditoría e integración Beta 1.4

Fecha: 2026-10-10. Base auditada: `9c2de7887b886272990cf449fb402b821d5adce3` de Pgamenox/RutaSales, rama main.
Rama de correcciones: `work/rutagps-beta-1.4-audit`. Alcance exclusivo: `/rutagps-demo/`. Sin fusión, publicación en Pages ni cambios en módulos RutaSales/RutaGuard.

Actualización de cierre QA: ver `QA_CIERRE_BETA_1_4.md`. Se resolvió el bloqueo Chromium y se aprobaron las pruebas de navegador/escritorio/móvil. El registro inicial de bloqueo se conserva más abajo como historial de esta auditoría; ya no es un bloqueo vigente.

## Dictamen

Demo local con correcciones, pruebas de lógica y QA de navegador aprobados. NO lista para comercialización. No existe backend RutaGPS, autenticación efectiva, aislamiento seguro en servidor ni GPS real probado. Los cupos independientes por empresa son una función de simulación; no garantizan seguridad. Todos los visitantes de la demo pueden gestionar las empresas ficticias guardadas en su navegador.

## Entrega por estado

| Estado | Evidencia / alcance |
| --- | --- |
| Implementado | Superadministrador demo, empresas, cupos 5/12/15/30, asignar/liberar, ampliar, renovar/suspender; Central esquemática y jornadas simuladas; historial ficticio/CSV. Correcciones en esta rama: historial limitado a empresa seleccionada/licencia vigente, selección persistida, validación de almacenamiento, renovación con fin de mes, botones de jornada acordes al estado, sincronización de cambios entre pestañas y reinicio de coordenadas. |
| Probado | 12 pruebas Node pasan: capacidades, exceso, duplicados, liberación, independencia local, selección/persistencia, suspensión/vencimiento, ampliaciones, renovaciones, fin de mes/bisiesto, datos corruptos, contratos de rol/empresa/dispositivo y jornada/intervalo. Sintaxis de scripts y diff sin errores. |
| Pendiente | Backend independiente, esquema/migraciones, proveedor de identidad, middleware, autorización en base/API, transacciones y concurrencia, adaptadores RutaSales/RutaGuard, carga, observabilidad, piloto real Android/iOS, batería y segundo plano. |
| Bloqueado | Ningún bloqueo vigente para publicar la demo tras autorización. Pruebas end-to-end comerciales requieren backend QA independiente y dispositivos reales; no se conectó a bases productivas. |
| Listo para demo | Sí: lógica, navegador y revisión visual en 1440×1000 y 390×844 aprobadas. Publicación de 1.4 pendiente de autorización expresa; la demo pública sigue en 1.2. Sólo datos ficticios. |
| Listo para comercialización | **No**. Sin evidencia de autenticación real, aislamiento por empresa en servidor, concurrencia de licencias, seguridad ni seguimiento en teléfonos reales. |

## Hallazgos y correcciones

| Hallazgo | Severidad | Resolución |
| --- | --- | --- |
| Historial enumeraba los 30 GPS sin empresa/asignación/licencia | Alta para flujo; demo sin datos reales | Usa dispositivos de empresa seleccionada; bloquea lista, generación y CSV con licencia inactiva. Revalida al generar/exportar y ante cambios de otra pestaña. |
| Selección Central no persistía; historial no compartía contexto | Media | Guarda selección en estado común del navegador. |
| Datos locales aceptados sin validar campos; riesgo de render roto o atributos manipulados | Media | Valida empresas, ID seguro, nombres, cupos, fecha, estados, duplicados/asignaciones y selección; corrupción devuelve demo vacía. No convierte localStorage en seguridad. |
| Meses arbitrarios y fechas desbordadas en fin de mes/bisiesto | Media | Sólo 1/6/12 meses; suma UTC con último día válido; renovación inválida rechazada. |
| Controles permitían iniciar simulación sin dispositivos/licencia | Baja | Deshabilita inicio sin asignaciones vigentes y avance/cierre sin jornadas activas. |
| Licencia suspendida/liberación en otra pestaña no refrescaba Central | Media | Evento storage recarga empresas y detiene jornadas; revalidación periódica del vencimiento. |
| Reiniciar/cambiar empresa conservaba desplazamientos anteriores | Baja | Reinicia latitud/longitud ficticias, precisión y jornada. |
| Avisos de persistencia incorrectos | Baja | Explican guardado local del navegador y ausencia de sincronización entre equipos. |
| Sin autenticación/servidor; permisos modificables por visitante | Bloqueador comercial | No se presenta como resuelto. Diseño independiente, contrato ejecutable y puertas de aceptación en backend-design/. |

El mismo external_id GPS-001 puede existir en empresas diferentes; su identidad comercial debe ser `(company_id, external_id)` con UUID interno distinto. La independencia local está probada; la exclusividad de administración real **no está garantizada** hasta implementar y probar servidor.

## Preparación comercial entregada

`backend-design/README.md`: arquitectura independiente, modelo de datos, roles, aislamiento, transacciones de cupos, renovaciones, jornada informada, API propuesta, integración desacoplada, carga teórica y puertas comerciales.
`backend-design/api-contract.json`: contrato estructurado propuesto, sin despliegue.
`backend-design/policy.mjs`: decisiones ejecutables de permiso y ventana de ingestión; asume identidad ya autenticada, no implementa JWT ni servidor. Ninguno está conectado a la demo o activa GPS.

Con 30 dispositivos y una muestra cada 5 minutos: 360 reportes/hora, 2,880 por jornada de 8 horas. Eso estima volumen, no acredita capacidad de un servidor. No se probó concurrencia ni batería. Una PWA suspendida no garantiza intervalos de 5 minutos.

## Reproducción

Desde raíz del repositorio, Node 24:

```bash
node --test rutagps-demo/beta14.test.mjs rutagps-demo/license-limits.test.mjs
git diff --check
```

Resultado observado: 12 pass, 0 fail. El archivo de pruebas anterior conserva sus aserciones y se ejecuta como un caso; los 11 casos nuevos reportan resultados individuales.

Prueba de navegador aprobada en cierre QA (ver informe de cierre):

```bash
npm install --no-save playwright
npx playwright install chromium
PLAYWRIGHT_MODULE=playwright node rutagps-demo/browser.test.mjs
```

El script cubre alta/asignación de dos empresas, selección compartida, inicio/avance/cierre de jornada, CSV, suspensión/renovación, liberación entre pestañas, render 5/12/15/30 y viewport móvil. `CHROMIUM_EXECUTABLE_PATH` permite usar un navegador ya instalado. No confundir viewport emulado con pruebas en teléfonos.

## Siguiente puerta de aceptación

1. QA de navegador y revisión visual aprobados; obtener autorización de fusión/publicación y ejecutar smoke test posterior.
2. Revisar diseño, desplegar backend sólo en QA independiente y cubrir aislamiento y carreras de cupos.
3. Implementar adaptadores y probar integración con entornos de prueba de RutaSales/RutaGuard.
4. Validar piloto informado en Android/iOS y cierre fuera de jornada.
5. Sólo después evaluar preparación comercial; no activar cobros/rastreo/fotografías automáticas en esta entrega.
