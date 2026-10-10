# RutaGPS — Beta GitHub (sin Supabase)

## Estado
Prototipo independiente en la carpeta `rutagps-beta/`. Esta rama no está fusionada a `main` y no activa seguimiento de personas.

## Archivos
- `index.html`: simulador visual de 30 dispositivos ficticios y pasos de 5 minutos.
- `admin.html`: superadministrador demostrativo; datos solo en memoria durante la sesión.
- `license-core.mjs`: reglas puras de capacidad y vencimiento.
- `license-core.test.mjs`: pruebas de reglas (ejecutar `node --test rutagps-beta/license-core.test.mjs`).
- `schema-draft.sql`: esquema de datos y lectura restringida.
- `licencias-draft.sql`: modelo de licencias.
- `license-enforcement-draft.sql`: borrador de bloqueo de cupos con transacciones.
- `QA_LICENCIAS.md`: criterios de aceptación que requieren servidor de pruebas.

## Demostración local
1. Descargar esta rama del repositorio.
2. Abrir `rutagps-beta/index.html` para simular 30 GPS ficticios.
3. Abrir `rutagps-beta/admin.html` para crear licencias de demostración de 5, 12, 15 y 30 usuarios.
4. En la raíz del repositorio, ejecutar `node --test rutagps-beta/license-core.test.mjs` (requiere Node.js moderno).

## Limitaciones explícitas
GitHub Pages es alojamiento estático, **no una base de datos segura**. Ningún archivo HTML debe administrar claves de activación reales, contraseñas, cobros o posiciones laborales. No se puede garantizar que una PWA rastree con pantalla bloqueada. El sistema productivo requerirá autenticación, backend, base persistente, RLS, aislamiento entre empresas, auditoría y pruebas de dispositivos.

## Próxima puerta de calidad
Preparar adaptadores de API con interfaces testeables y datos ficticios; después, al disponer de backend aislado, implementar y comprobar licencias persistentes y rastreo informado durante jornada. No tocar RutaSales o RutaGuard en producción.
