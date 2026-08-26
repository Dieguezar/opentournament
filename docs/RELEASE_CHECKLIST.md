# Checklist de OpenTournament v1.0.0

Este documento concentra las puertas que debe superar el primer release. El tag se publica solamente cuando todas las verificaciones bloqueantes estén verdes sobre el mismo commit.

## Estado del candidato

| Puerta                          | Estado               | Evidencia                                                            |
| ------------------------------- | -------------------- | -------------------------------------------------------------------- |
| Versionado                      | Aprobada             | Todos los paquetes y OpenAPI declaran `1.0.0`                        |
| Lint y tipos                    | Aprobada             | `pnpm lint` y `pnpm typecheck`                                       |
| Pruebas unitarias/configuración | Aprobada             | `pnpm test` y 20 comprobaciones de Compose/release                   |
| Integración de datos demo       | Aprobada             | Seed idempotente validado en una base temporal limpia                |
| E2E y WCAG automatizado         | Aprobada             | 9 escenarios Playwright; axe A/AA para LoL y Smash                   |
| Dependencias                    | Aprobada             | `pnpm audit` sin vulnerabilidades conocidas                          |
| PWA y rutas públicas            | Aprobada             | Manifest, service worker, LoL, Smash y health checks responden `200` |
| Cabeceras del navegador         | Aprobada             | CSP, `DENY`, `nosniff` y política de referencia verificadas          |
| CI y CodeQL del commit final    | Pendiente            | Ejecutar en GitHub Actions después del commit del candidato          |
| Instalación limpia con Compose  | Pendiente            | Ejecutar `Compose clean-install smoke` sobre el commit final         |
| Baseline OWASP ZAP              | Pendiente            | Ejecutar `OWASP ZAP baseline` sobre el commit final                  |
| Revisión con lector de pantalla | Manual no bloqueante | Recorrido recomendado con NVDA o VoiceOver                           |
| Imágenes y release              | Pendiente            | Tag `v1.0.0`, imágenes públicas en GHCR y GitHub Release             |

## Orden de publicación

1. Confirmar CI, CodeQL, Compose smoke y ZAP en verde sobre el commit candidato.
2. Crear y subir el tag anotado `v1.0.0`.
3. Esperar la publicación y atestación de las imágenes API y web.
4. Marcar ambos paquetes GHCR como públicos y probar `docker compose up -d --no-build` con `1.0.0`.
5. Confirmar que el GitHub Release y sus notas estén disponibles.

## Criterio de bloqueo

No se publica el tag con fallos de seguridad, instalación, migraciones, autenticación, resultados, arbitraje o integridad del bracket. Los detalles exclusivamente cosméticos pueden registrarse para una versión posterior.
