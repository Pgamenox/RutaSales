# RutaGPS Beta 1.2 — cierre de QA documentado
Fecha: 2026-10-10
Alcance: demo ficticia alojada en GitHub Pages, SIN rastreo real.

## Evidencias visuales aportadas por usuario
- GitHub Pages publicó y cargó el Superadministrador después del 404 inicial: APROBADO.
- Empresa QA RutaGPS visible y licencia de 5 GPS: APROBADO.
- Central detecta 1 asignado de 5 y GPS-001: APROBADO.
- Jornada activa y posicionamiento ficticio hasta minuto 25: APROBADO.
- Último registro minuto 25, precisión simulada ±13 m, estado actualizado: APROBADO.

## Revisión estática del código de Central
- El botón Finalizar jornadas ejecuta `devices.forEach(d=>d.working=false)`.
- Deshabilita el botón de avanzar 5 minutos y vuelve a renderizar.
- Evidencia visual del cierre aportada el 2026-10-10: APROBADO. En jornada 0, ubicaciones recientes 0, GPS-001 fuera de jornada, último reporte minuto 25, botón +5 deshabilitado.
- Cambio de paquete de 5 a 15/30 y reglas de límite concurrente: NO PROBADO.
- Persistencia multi-dispositivo real: NO EXISTE; solo localStorage para la demo.

## Resultado del ciclo
**QA DEMOSTRATIVA PARCIAL APROBADA. NO APROBADA COMO BETA GPS REAL O COMERCIAL.**
La prueba visual del cierre de jornada simulada está aprobada. No se puede certificar la seguridad de licencias ni el seguimiento GPS real a partir de esta demo.

## Siguiente lote (Beta 1.3)
1. Capturar evidencia del cierre: contador 0; fuera de jornada; botón +5 deshabilitado.
2. Probar límite de 5 y ampliación 5→12→15→30 con asignaciones.
3. Añadir pruebas automatizadas de interfaz en un navegador real.
4. Mantener sin GPS físico, fotografías secretas, cobros, contraseñas reales ni datos personales hasta backend seguro.
