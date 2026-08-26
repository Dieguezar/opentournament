# Checklist de OpenTournament v1.0.0

Este documento registra las puertas superadas por el primer release. El tag se publicó únicamente después de validar todas las verificaciones bloqueantes sobre el mismo commit candidato.

## Estado del candidato

| Puerta                          | Estado               | Evidencia                                                                                                                                                                            |
| ------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Versionado                      | Aprobada             | Todos los paquetes y OpenAPI declaran `1.0.0`                                                                                                                                        |
| Lint y tipos                    | Aprobada             | `pnpm lint` y `pnpm typecheck`                                                                                                                                                       |
| Pruebas unitarias/configuración | Aprobada             | `pnpm test` y 21 comprobaciones de Compose/release                                                                                                                                   |
| Integración de datos demo       | Aprobada             | Seed idempotente validado en una base temporal limpia                                                                                                                                |
| E2E y WCAG automatizado         | Aprobada             | 9 escenarios Playwright; axe A/AA para LoL y Smash                                                                                                                                   |
| Dependencias                    | Aprobada             | `pnpm audit` sin vulnerabilidades conocidas                                                                                                                                          |
| PWA y rutas públicas            | Aprobada             | Manifest, service worker, LoL, Smash y health checks responden `200`                                                                                                                 |
| Cabeceras del navegador         | Aprobada             | CSP, `DENY`, `nosniff` y política de referencia verificadas                                                                                                                          |
| CI y CodeQL del commit final    | Aprobada             | [CI](https://github.com/Dieguezar/opentournament/actions/runs/32986802569) y [CodeQL](https://github.com/Dieguezar/opentournament/actions/runs/32986803658) en verde sobre `b4b65a6` |
| Instalación limpia con Compose  | Aprobada             | [Compose clean-install smoke](https://github.com/Dieguezar/opentournament/actions/runs/32986804973) y prueba externa con imágenes públicas                                           |
| Baseline OWASP ZAP              | Aprobada             | [OWASP ZAP baseline](https://github.com/Dieguezar/opentournament/actions/runs/32986806315) sin fallos bloqueantes                                                                    |
| Revisión con lector de pantalla | Manual no bloqueante | Recorrido recomendado con NVDA o VoiceOver                                                                                                                                           |
| Imágenes y release              | Aprobada             | [Release `v1.0.0`](https://github.com/Dieguezar/opentournament/releases/tag/v1.0.0), API/web públicas y multi-arquitectura en GHCR                                                   |

## Publicación completada

1. CI, CodeQL, Compose smoke y ZAP quedaron verdes sobre `b4b65a6`.
2. El tag anotado `v1.0.0` apunta exactamente a ese commit.
3. Las imágenes API y web se publicaron con soporte AMD64/ARM64 y atestaciones.
4. Una instalación temporal descargó ambas imágenes anónimamente y respondió `200` en API y web usando `docker compose up -d --no-build`.
5. El GitHub Release y sus notas están disponibles públicamente.

## Criterio de bloqueo

No se publica el tag con fallos de seguridad, instalación, migraciones, autenticación, resultados, arbitraje o integridad del bracket. Los detalles exclusivamente cosméticos pueden registrarse para una versión posterior.
