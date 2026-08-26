# OpenTournament

[English](README.md) · [Español](README.es.md)

Open-source platform for creating, managing, and publishing esports tournaments.

OpenTournament gives communities, gaming cafés, universities, streamers, and independent organizers one place to manage the full tournament lifecycle: setup, public rules, registration, teams, check-in, brackets, match coordination, result reporting, evidence, disputes, arbitration, and final standings.

> **Current status:** `v1.0.0` is available. The technical foundation, tournament management, results, arbitration, and open-source release phases are operational; Discord remains optional. See the [release](https://github.com/Dieguezar/opentournament/releases/tag/v1.0.0), [release checklist](docs/RELEASE_CHECKLIST.md), [roadmap](docs/ROADMAP.md), and [decision log](docs/DECISIONS.md).

## Quick start with demo data

The idempotent demo seed creates a ready-to-explore environment:

- **Copa Nexo 2026**, an active public Valorant tournament.
- **Liga Nexo LoL**, a completed eight-team 5v5 tournament with Tournament Draft, Fearless Draft, and per-game details.
- **Smash Random Showdown**, a completed eight-player double-elimination tournament with per-game details.
- Four registered teams with confirmed check-in.
- Two completed semifinals and one scheduled grand final.
- Result reports and one resolved dispute with its conversation and ruling.

Run it locally:

```bash
cp .env.example .env
# Change SEED_DEMO_DATA=false to SEED_DEMO_DATA=true in .env
pnpm install
docker compose up -d postgres minio
pnpm dev
```

Open `http://localhost:3000` and sign in with:

- Email: `admin@opentournament.local`
- Password: `demo-password-123`
- Public tournament: `http://localhost:3000/t/copa-nexo-demo`
- LoL demo: `http://localhost:3000/t/liga-nexo-lol`
- Smash demo: `http://localhost:3000/t/smash-random-showdown`

With `SEED_DEMO_DATA=true`, the API applies migrations and creates the demo automatically on startup. You can also run it explicitly with `pnpm db:seed`.

## MVP features

- Single- and double-elimination tournaments for 8 to 128 participants, with an architecture designed to scale beyond 512 without a redesign.
- Open registration with a waiting list and optional manual approval.
- Permanent and tournament-specific teams; individual tournaments use a one-player team model internally.
- Configurable check-in windows and automatic walkovers.
- Configurable BO1, BO3, and BO5 series, with game-specific draw support.
- Configurable reporting: bilateral confirmation, winner-only reporting, or staff-only reporting.
- Private-by-default evidence through screenshots and external links.
- Referee dispute panel with recorded rulings and an audit trail.
- Public tournament pages with live brackets, results, and standings through SSE.
- Installable PWA with read caching; actions remain online-only.
- Progressive identity: public viewing without an account, revocable private participant passes, and optional permanent accounts through email or Discord.
- Optional Discord bot with notifications and slash commands.
- Generic, Valorant, CS2, League of Legends, and Super Smash Bros. Ultimate adapters. LoL and Smash include versioned competitive templates and guided reporting flows.
- Self-hosted installation through Docker Compose.
- Spanish and English user interfaces with a persistent language selector.

For a production instance, follow the [self-hosting guide](docs/SELF_HOSTING.md). Docker requires a unique `SESSION_SECRET`, does not load demo data by default, and waits for each service to become healthy before starting its dependents.

## Technology

| Layer             | Technology                                                         |
| ----------------- | ------------------------------------------------------------------ |
| Frontend          | Next.js + TypeScript                                               |
| Backend / API     | Fastify + TypeScript                                               |
| Database          | PostgreSQL + Drizzle ORM                                           |
| Storage           | S3-compatible storage; MinIO for development, R2/S3 for production |
| Real-time updates | Server-Sent Events (SSE)                                           |
| Monorepo          | pnpm + Turborepo                                                   |
| Tests             | Vitest + Playwright                                                |
| License           | MIT                                                                |

## Documentation

The extended design documentation is currently written in Spanish. The application and this setup guide are available in both languages.

- [Product vision](docs/PRODUCT_VISION.md)
- [Product requirements](docs/PRD.md)
- [MVP scope](docs/MVP_SCOPE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [API design](docs/API_DESIGN.md)
- [Authorization model](docs/AUTHORIZATION_MODEL.md)
- [Tournament engine](docs/TOURNAMENT_ENGINE.md)
- [Game adapters](docs/GAME_ADAPTERS.md)
- [Discord integration](docs/DISCORD_INTEGRATION.md)
- [Roadmap](docs/ROADMAP.md)
- [Backlog](docs/BACKLOG.md)
- [Decision log](docs/DECISIONS.md)
- [Risks](docs/RISKS.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)

## Repository status

| Phase                             | Status                        |
| --------------------------------- | ----------------------------- |
| 0 — Definition and documentation  | Complete                      |
| 1 — Technical foundation          | Complete                      |
| 2 — Tournament MVP                | Complete                      |
| 3 — Results and arbitration       | Complete                      |
| 4 — Discord and real-time updates | Partial — SSE/PWA operational |
| 5 — Open-source readiness         | Complete — v1.0.0 released    |
| 6 — Expansion                     | Pending                       |

## License

MIT. See [LICENSE](LICENSE).
