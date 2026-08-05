# Roadmap

Estado: la Fase 0 está completada. Las fases 1–5 corresponden al MVP; la fase 6 es expansión.

## Fase 0 — Definición (completada)

- **Objetivo:** especificación profesional y decisiones registradas.
- **Entregables:** este árbol de `docs/`, README, plantillas, DECISIONS.md, PRD, arquitectura, modelo de datos, backlog.
- **Dependencias:** entrevista de descubrimiento (completada).
- **Riesgos:** decisiones ambiguas (mitigado con ADRs).
- **Pruebas:** revisión de la especificación por el producto.
- **Criterio de finalización:** documentación completa y aprobación para iniciar la Fase 1.

## Fase 1 — Base técnica

- **Objetivo:** monorepo funcional, calidad, base de datos, auth, organizaciones/roles, Docker y CI.
- **Entregables:** estructura pnpm + Turborepo; TS estricto; ESLint/Prettier; Vitest/Playwright; Drizzle + migraciones + seeds; auth (correo + Discord); organizaciones y roles; wizard; Docker Compose (web, api, postgres, minio); GitHub Actions (lint, typecheck, tests, build, CodeQL, Dependabot); health checks; logs pino.
- **Dependencias:** Fase 0.
- **Riesgos:** fricción de instalación; configuración de Discord OAuth.
- **Pruebas:** integración de auth y roles; E2E de onboarding.
- **Criterio de finalización:** `docker compose up -d` levanta la instancia, el wizard crea la primera organización y el pipeline CI está verde.

## Fase 2 — MVP de torneos

- **Objetivo:** crear y administrar torneos completos con brackets.
- **Entregables:** CRUD de torneo y reglas; inscripciones (espera, aprobación); check-in general con walkover; motor de sencilla y doble eliminación; sorteo/seeds/BYEs; partidas (programación, lobby, mapas, reprogramación); página pública del torneo; bracket público.
- **Dependencias:** Fase 1.
- **Riesgos:** complejidad del motor (BYEs, seeds, doble eliminación).
- **Pruebas:** propiedades del motor; integración del flujo de torneo; E2E crear→inscribir→check-in→bracket.
- **Criterio de finalización:** un torneo real (demo seed) recorre inscripción, check-in y bracket hasta resultados sin intervención manual del staff más allá de lo previsto.

## Fase 3 — Resultados y arbitraje

- **Objetivo:** verificación de resultados, evidencias y disputas.
- **Entregables:** reporte bilateral y confirmación; timeouts; evidencias (presign, límites, privacidad); disputas con panel de árbitros; resoluciones; auditoría.
- **Dependencias:** Fase 2.
- **Riesgos:** concurrencia de reportes; privacidad de evidencias.
- **Pruebas:** tests de concurrencia; integración de disputas; E2E de conflicto→disputa→resolución.
- **Criterio de finalización:** cualquier resultado disputado se resuelve con trazabilidad completa y el bracket avanza correctamente.

## Fase 4 — Discord y tiempo real

- **Objetivo:** integración comunitaria y actualizaciones en vivo.
- **Entregables:** Discord OAuth completo; bot de notificaciones y slash (`/checkin`, `/status`); SSE para bracket/resultados/notificaciones; PWA instalable con caché de lectura.
- **Dependencias:** Fase 2 (bot requiere check-in) y Fase 3 (resultados).
- **Riesgos:** rate limits de Discord; complejidad de reconexión SSE.
- **Pruebas:** integración del bot (mock gateway); SSE con reconexión; E2E de notificaciones.
- **Criterio de finalización:** los participantes reciben notificaciones, hacen check-in con `/checkin` y el bracket público se actualiza en vivo.

## Fase 5 — Preparación open source

- **Objetivo:** primer release y comunidad.
- **Entregables:** documentación final verificada; instalación probada desde cero; datos demo; plantillas y política de seguridad; escaneo de seguridad (ZAP); release 1.0.0 (semver) con imágenes en GHCR; observabilidad (Grafana opcional).
- **Dependencias:** Fases 1–4.
- **Riesgos:** bugs de integración; documentación desactualizada.
- **Pruebas:** smoke completo en entorno limpio; pentest básico; E2E completo en CI.
- **Criterio de finalización:** un recién llegado instala y publica un torneo siguiendo solo el README, y el release está publicado con changelog.

## Fase 6 — Expansión

- **Objetivo:** ampliar formatos y audiencias.
- **Entregables (propuestos):** round-robin, suizo, grupos + playoffs; temporadas y rankings; widgets embebibles; overlay OBS; veto interactivo; check-in por partida; chat interno (evalúa WebSockets); apelaciones y sanciones; integraciones con APIs de juegos; app Tauri; servicio cloud administrado (extras de infraestructura, nunca funciones core); webhooks salientes.
- **Dependencias:** MVP completo (Fases 1–5).
- **Riesgos:** sobrearquitectura; alcance descontrolado.
- **Pruebas:** según la funcionalidad, siguiendo esta estrategia.
- **Criterio de finalización:** cada iniciativa define su propio criterio con un ADR previo.

## Prioridad transversal

1. Instalación trivial y documentación.
2. Confianza (resultados y arbitraje).
3. Experiencia del organizador.
4. Comunidad (Discord, público, contribuciones).
