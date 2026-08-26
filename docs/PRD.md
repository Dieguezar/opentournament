# Product requirements document

## Executive summary

OpenTournament is an MIT-licensed web platform for managing the full esports tournament lifecycle. It is self-hosted through Docker Compose, installable as a PWA, and built as a TypeScript modular monolith with Next.js, Fastify, PostgreSQL/Drizzle, and S3-compatible storage.

The initial product targets communities, gaming cafés, and independent organizers running free online-first competitions with optional in-person support. It covers setup, registration, check-in, brackets, scheduling, reporting, evidence, disputes, arbitration, live public pages, and final standings.

This PRD describes product intent. Use the [release checklist](RELEASE_CHECKLIST.md) and codebase for current implementation status.

## Problem and opportunity

Communities lack one open, self-hosted tool for the complete tournament flow. Existing workflows are fragmented across registration forms, spreadsheets, bracket sites, and chat. This creates duplicated work, uncertain results, and weak dispute handling.

A self-hosted MIT project with predictable installation and strong organizer UX can become common infrastructure while leaving room for optional managed hosting.

## Audience and personas

- **Lucia, community organizer:** runs weekly events and needs a fast, low-friction control center.
- **Carlos, gaming café operator:** runs online and LAN events and needs dependable check-in and brackets.
- **Diego, captain:** registers a roster, checks in, reports results, and attaches evidence.
- **Maria, referee:** reviews private evidence and records an auditable ruling.
- **Andres, spectator:** follows a live bracket on mobile without creating an account.

## Product promise

- One workflow from tournament creation to final publication.
- Configurable trust through bilateral, winner-only, or staff-only reporting.
- Game-specific templates without game-specific engine forks.
- Public reading without authentication and private participant access without mandatory permanent accounts.
- Optional email and Discord identity/automation.
- Spanish and English interfaces.
- Data and infrastructure controlled by the instance operator.

## Primary use cases

1. Create an organization and tournament with a game template and public rules.
2. Register teams or individual players with optional approval and waiting lists.
3. Check in participants, seed them, and generate a single- or double-elimination bracket.
4. Schedule and administer matches, lobbies, walkovers, and disqualifications.
5. Submit game-aware results under the configured reporting policy.
6. Attach private evidence and resolve conflicts through audited disputes.
7. Publish a live tournament page and final standings.

## MVP scope

See [MVP_SCOPE.md](MVP_SCOPE.md). The baseline includes:

- Single and double elimination.
- Permanent and tournament-specific teams, including one-player teams.
- Registration, check-in, seeds, BYEs, match administration, and finalization.
- Configurable result reporting, evidence, disputes, and rulings.
- Public SSR pages and SSE updates.
- Read-cache PWA.
- Email accounts, private participant passes, and optional Discord.
- Generic, Valorant, CS2, LoL, and Smash Ultimate adapters.
- Docker Compose self-hosting.

## Explicitly out of scope

- Payments, paid entry, and prize distribution.
- Round robin, Swiss, groups plus playoffs, seasons, and qualifiers.
- Internal chat.
- Appeals and formal sanctions.
- Mandatory Riot, Steam, or other game APIs.
- Full offline writes and synchronization.
- Global platform moderation in self-hosted instances.
- Managed cloud hosting as a requirement for core functionality.

## Requirements and flows

- Functional requirements: [FUNCTIONAL_REQUIREMENTS.md](FUNCTIONAL_REQUIREMENTS.md)
- Non-functional requirements: [NON_FUNCTIONAL_REQUIREMENTS.md](NON_FUNCTIONAL_REQUIREMENTS.md)
- User roles: [USER_ROLES.md](USER_ROLES.md)
- User flows: [USER_FLOWS.md](USER_FLOWS.md)
- Architecture decisions: [DECISIONS.md](DECISIONS.md)

## Success metrics

| Area        | Target                                                             |
| ----------- | ------------------------------------------------------------------ |
| Activation  | Publish a demo tournament with a bracket in under 15 minutes       |
| Completion  | At least 70% of started tournaments publish final results          |
| Trust       | At least 90% of reports confirm without a dispute                  |
| Resolution  | At least 95% of disputes resolve within 72 hours                   |
| Adoption    | Self-hosted installations, GitHub stars, issues, and contributions |
| Quality     | No open critical defects for a stable release                      |
| Engine      | At least 95% test coverage                                         |
| Performance | Common API p95 under 200 ms and SSE propagation under one second   |

## Dependencies

- Docker and Docker Compose for production installation.
- PostgreSQL 16 and S3-compatible object storage.
- Node.js 22 and pnpm for source development.
- Optional SMTP for delivered account email.
- Optional Discord application for OAuth and bot features.

## Constraints

- Modular monolith; no microservices without measured need.
- PostgreSQL is the primary database.
- Authorization always runs in the API.
- Strict TypeScript and boundary validation.
- Secrets stay outside the repository.
- A clean installation follows the README.
- Contributor-facing documentation is canonical in English.
- User-facing changes must work in Spanish and English.

## Definition of a complete stable release

1. A clean Compose instance supports organization and tournament creation through final publication.
2. Public tournament pages are indexable and update through SSE.
3. API authorization protects organization, tournament, participant, evidence, and dispute scope.
4. Core tournament flows work without Discord.
5. Optional integrations fail closed and degrade cleanly.
6. CI gates lint, types, tests, build, security scanning, and critical browser flows.
7. Documentation matches current behavior and provides an English contribution path.
8. A semantic release publishes source and versioned self-hosting artifacts.
