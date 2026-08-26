# Architecture decision record

This log captures accepted product, architecture, and process decisions for OpenTournament. Contributors must discuss a change that conflicts with an ADR before implementing it and update this file when the project accepts a new direction.

- Original discovery date: 2026-08-05
- Accepted decisions: ADR-001 through ADR-043
- Proposed defaults: AF-01 through AF-16
- Governance: ADR-038

## How to add a decision

Add the next ADR with:

```markdown
## ADR-NNN — Short title

- **Context:** What problem or constraint requires a decision?
- **Options:** What meaningful alternatives were considered?
- **Decision:** What did the project choose?
- **Reason:** Why is this the best current tradeoff?
- **Consequences:** What becomes easier, harder, or intentionally deferred?
- **Status:** proposed | accepted | superseded
```

Do not silently rewrite an accepted ADR. Add a new ADR and mark the old one as superseded when the direction changes.

## Product and community decisions

| ADR | Decision                                                                | Reason and consequence                                                                                                                              |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001 | MIT license                                                             | Maximizes adoption and permits commercial use. Forks may compete commercially; the project competes through quality and community.                  |
| 003 | Primary audience: communities, gaming cafés, and independent organizers | This broad self-hosting audience requires fast onboarding and simple operations; universities and streamers remain supported secondary audiences.   |
| 004 | Optimize for 8–128 participants and design for 512+                     | Covers the normal use case without premature distribution while requiring pagination, indexes, and concurrency discipline.                          |
| 005 | Support online and in-person tournaments with online-first flows        | In-person matches use optional lobby data and alternate check-in behavior rather than a separate engine.                                            |
| 007 | Free tournaments only in the MVP                                        | Avoids payment, refund, banking, and compliance scope. Entry fees remain a future migration.                                                        |
| 011 | Basic public competitive profiles                                       | Public name, avatar, game identifiers, and tournament results improve discoverability and reduce impersonation; rankings are deferred.              |
| 012 | No global platform-administrator role in self-hosted instances          | Every instance governs itself. Global moderation belongs only in a future managed service.                                                          |
| 026 | Public live tournament experience                                       | Public SSR pages expose brackets, results, standings, participants, and streams through SSE. Embeds and OBS overlays are deferred.                  |
| 027 | Installable PWA with read caching only                                  | Offline writes and conflict resolution are intentionally excluded.                                                                                  |
| 038 | Initial BDFL governance with named maintainers                          | Early decisions stay fast and transparent; maintainers record architecture changes by consensus and may evolve to a committee.                      |
| 042 | Discord is opt-in                                                       | Public pages, email accounts, and participant passes cover core flows. Missing `DISCORD_*` configuration must not degrade tournaments or reporting. |

## Identity, roles, and teams

| ADR | Decision                                          | Reason and consequence                                                                                                                   |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 008 | Organization roles plus tournament-specific roles | Owners/admins/members govern organizations; admins/referees/moderators govern individual events. API authorization resolves both scopes. |
| 009 | Permanent and tournament-specific teams           | Supports stable communities and casual rosters. An ephemeral team may be promoted later.                                                 |
| 010 | Individual competitors use one-player teams       | The engine keeps one participant abstraction and adapters enforce roster size.                                                           |
| 013 | Email/password plus optional Discord OAuth        | Self-hosting cannot depend on an external provider. SMTP is configurable and Discord identity linking uses verified email rules.         |

## Tournament and reporting decisions

| ADR | Decision                                                               | Reason and consequence                                                                                                                              |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 014 | Single and double elimination                                          | They provide the highest esports value for the MVP. Round robin and Swiss remain future formats.                                                    |
| 015 | Random pairing, manual seeds, and automatic BYEs                       | Avoids dependency on a ranking system while covering common organizer needs.                                                                        |
| 016 | Configurable best-of series; draws controlled by adapter               | Supports game culture without adding game-specific branches to the engine.                                                                          |
| 017 | Open registration, waiting list, and optional approval                 | One model covers public and curated tournaments through explicit registration states.                                                               |
| 018 | Tournament-level check-in with automatic walkovers                     | A scheduled job closes check-in and handles absences; per-match check-in is deferred.                                                               |
| 019 | Configurable delay tolerance and admin rescheduling                    | Balances tournament discipline with staff judgment and requires audited reasons.                                                                    |
| 020 | Configurable result reporting with bilateral confirmation as default   | Bilateral matching auto-confirms and conflicts open disputes. Winner-only and staff-only modes support communities with different trust models.     |
| 021 | Screenshots and links as private evidence                              | Avoids video-storage cost. Size/count limits and signed URLs protect the instance.                                                                  |
| 022 | Full dispute workflow without appeals                                  | Open, review, messages, assignment, ruling, and audit are included; formal sanctions and appeals are deferred.                                      |
| 025 | External map/stage veto with recorded outcome                          | Avoids complex synchronous veto UX. Interactive vetoes remain future adapter work.                                                                  |
| 037 | Explicit state machine with transactional operations and domain events | Full event sourcing is unnecessary. Events support audit and possible future reconstruction.                                                        |
| 039 | Versioned editable tournament templates inside adapters                | Game culture changes defaults and rules without duplicating the engine. Smash `standard_v1` introduced the contract; LoL `standard_v1` extended it. |
| 040 | Adapter-specific details inside `matches.result` JSONB                 | Brackets read one atomic result while adapters validate Smash games and LoL games. Future analytics may require JSONB indexes or projections.       |

## Game adapter decisions

| ADR | Decision                                                      | Reason and consequence                                                                                                                                      |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 006 | Generic adapter plus official Valorant, CS2, and LoL adapters | Validates FPS and MOBA requirements while generic configuration supports other games. ADR-039 later added official Smash support through the same contract. |
| 024 | Adapters are typed configuration                              | Team sizes, formats, scoring, maps, draws, and fields stay validated without relying on unstable external APIs.                                             |
| 023 | Optional Discord bot for notifications and slash commands     | Match, result, dispute, check-in, and status automation are useful, but role/channel management and Discord-native reporting remain deferred.               |

## Technical architecture decisions

| ADR | Decision                                 | Reason and consequence                                                                                                                             |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 002 | Modular monolith in a monorepo           | One deployment lowers self-hosting cost while package boundaries allow later extraction.                                                           |
| 028 | Next.js frontend                         | App Router SSR supports public SEO, PWA behavior, and reusable web UI.                                                                             |
| 029 | Fastify API                              | Lightweight typed REST, OpenAPI, SSE, and testable plugins fit the project.                                                                        |
| 030 | Worker and Discord bot are API modules   | Current jobs are lightweight. Package boundaries allow later process extraction.                                                                   |
| 031 | Drizzle on PostgreSQL                    | Typed SQL, no binary query engine, and predictable Docker behavior.                                                                                |
| 032 | S3-compatible storage with MinIO locally | One API supports private evidence and public media across MinIO, R2, and S3.                                                                       |
| 033 | Server-Sent Events                       | Current real-time traffic is server-to-client; SSE provides HTTP semantics and browser reconnection.                                               |
| 034 | Vitest and Playwright                    | Native TypeScript unit/integration tests plus browser E2E coverage.                                                                                |
| 035 | PostgreSQL-backed job queue              | Jobs survive restarts without adding Redis. BullMQ is an explicit scaling option.                                                                  |
| 036 | pnpm workspaces and Turborepo            | Shared TypeScript packages, task caching, and consistent monorepo commands.                                                                        |
| 041 | Secure self-hosting defaults             | Compose requires a nontrivial session secret, disables demo and unverified accounts, forwards supported configuration, and chains health checks.   |
| 043 | Versioned verifiable GHCR images         | Each `vX.Y.Z` publishes API and web images for AMD64/ARM64 with semantic tags, SBOM, and provenance. Production pins exact versions, not `latest`. |

## Proposed operating defaults

These defaults were established during discovery. A contributor may propose changes with evidence and a new ADR.

| ID    | Topic         | Default                                                                                                      |
| ----- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| AF-01 | Languages     | Spanish and English; Latin America first without excluding other regions                                     |
| AF-02 | Email         | Configurable SMTP; without SMTP, messages are logged and private instances may explicitly relax verification |
| AF-03 | Communication | Captains coordinate outside the product; each match may have an optional `lobbyUrl`                          |
| AF-04 | Check-in      | Configurable window, nominally opening 24 hours and closing one hour before start                            |
| AF-05 | Time windows  | 10-minute delay tolerance, 30-minute result confirmation, and 60-minute dispute window                       |
| AF-06 | Evidence      | At most 10 MB per file and five files per result                                                             |
| AF-07 | Seeds         | Manual seeds; highest seeds receive BYEs                                                                     |
| AF-08 | Grand final   | No reset by default; configurable per tournament/template                                                    |
| AF-09 | Roster        | Locks when check-in closes                                                                                   |
| AF-10 | Quality       | Conventional Commits, semantic versioning, Dependabot, structured Pino logs, and critical-action audit       |
| AF-11 | IDs           | PostgreSQL random UUIDs                                                                                      |
| AF-12 | Sessions      | HTTP-only cookie, CSRF token, Argon2id passwords, and global/route rate limits                               |
| AF-13 | Free agents   | No free-agent registration in team tournaments during the MVP                                                |
| AF-14 | Chat          | No internal chat during the MVP                                                                              |
| AF-15 | Future cloud  | Managed hosting may add infrastructure conveniences; core open-source features never become private          |
| AF-16 | Observability | Structured logs, health checks, and basic metrics first; OpenTelemetry and dashboards later                  |

## Decision conflicts to watch

- ADR-020 allows reporting modes while preserving bilateral as the default; documentation must not describe bilateral as the only mode.
- ADR-039 extends ADR-006 with Smash Ultimate; adapter lists must include all currently shipped adapters.
- ADR-041 overrides older demo-first installation assumptions; public Compose defaults must remain production-safe.
- ADR-042 makes Discord optional even though ADR-023 defines useful bot functionality.
- The schema and implementation are authoritative for current mechanics; an ADR explains intent but does not replace migration and API documentation.
