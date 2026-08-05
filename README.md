# OpenTournament

Plataforma open source para crear, administrar y publicar torneos de esports.

OpenTournament permite a comunidades, cibercafés, universidades, streamers y organizadores independientes gestionar el ciclo completo de un torneo: creación, publicación de reglas, inscripción de participantes, formación de equipos, check-in, generación de brackets, coordinación de partidas, reporte de resultados, evidencias, disputas, arbitraje y publicación de resultados finales.

> **Estado actual:** Fase 0 (definición) completada. Toda la documentación de producto y técnica vive en [`docs/`](docs/). El código de producto comienza en la Fase 1 (base técnica). Ver el [roadmap](docs/ROADMAP.md) y las [decisiones registradas](docs/DECISIONS.md).

## Características planificadas (MVP)

- Torneos de eliminación sencilla y doble eliminación, de 8 a 128 participantes (arquitectura preparada para 512+ sin rediseño).
- Inscripción abierta con lista de espera y aprobación manual opcional.
- Equipos permanentes y equipos efímeros por torneo; torneos individuales modelados como "equipo de 1".
- Check-in general con tolerancia configurable y walkover automático.
- Series BO1/BO3/BO5 configurables, con empates permitidos según el juego.
- Reporte bilateral de resultados con confirmación automática.
- Evidencias (capturas y enlaces externos) privadas por defecto.
- Disputas con panel de árbitros, resolución registrada y auditoría.
- Página pública del torneo con bracket, resultados y clasificación en tiempo real (SSE).
- PWA instalable con caché de lectura (sin acciones offline).
- Autenticación con correo + contraseña y Discord OAuth.
- Bot de Discord con notificaciones y comandos slash.
- Adaptador genérico + adaptadores oficiales de Valorant, CS2 y League of Legends.
- Instalación autoalojable con `docker compose up -d`.

## Stack previsto

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js (TypeScript) |
| Backend / API | Fastify (TypeScript) |
| Base de datos | PostgreSQL + Drizzle ORM |
| Almacenamiento | S3-compatible (MinIO en desarrollo; R2/S3 en producción) |
| Tiempo real | Server-Sent Events (SSE) |
| Monorepo | pnpm + Turborepo |
| Pruebas | Vitest + Playwright |
| Licencia | MIT |

## Documentación

- [Visión de producto](docs/PRODUCT_VISION.md)
- [PRD](docs/PRD.md)
- [Alcance del MVP](docs/MVP_SCOPE.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Modelo de datos](docs/DATA_MODEL.md)
- [Diseño de API](docs/API_DESIGN.md)
- [Modelo de autorización](docs/AUTHORIZATION_MODEL.md)
- [Motor de torneos](docs/TOURNAMENT_ENGINE.md)
- [Adaptadores de juegos](docs/GAME_ADAPTERS.md)
- [Integración con Discord](docs/DISCORD_INTEGRATION.md)
- [Roadmap](docs/ROADMAP.md)
- [Backlog](docs/BACKLOG.md)
- [Decisiones](docs/DECISIONS.md)
- [Riesgos](docs/RISKS.md)

## Estado del repositorio

| Fase | Estado |
| --- | --- |
| 0 — Definición y documentación | Completada |
| 1 — Base técnica | Completada (pendiente smoke en CI) |
| 2 — MVP de torneos | En progreso |
| 3 — Resultados y arbitraje | Pendiente |
| 4 — Discord y tiempo real | Pendiente |
| 5 — Preparación open source | Pendiente |
| 6 — Expansión | Pendiente |

## Licencia

MIT. Ver [LICENSE](LICENSE).
