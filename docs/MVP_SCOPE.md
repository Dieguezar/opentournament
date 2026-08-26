# MVP scope

A feature is inside the MVP only when this document or an accepted ADR includes it. New scope requires an issue and an update to [DECISIONS.md](DECISIONS.md).

## Included

### Identity and organizations

- Email/password accounts with verification when SMTP is configured.
- Revocable private participant passes that do not require a permanent account.
- Optional Discord OAuth per instance.
- Owner, admin, and member organization roles.
- First-use wizard for the first account and organization.
- No global platform role in self-hosted instances.

### Teams and participants

- Permanent and tournament-specific teams.
- Captains, members, and substitutes.
- Individual competitors represented as one-player teams.
- Adapter-based roster validation.
- No free-agent marketplace.

### Tournaments

- Public or unlisted tournaments.
- Single and double elimination.
- BO1, BO3, BO5, and adapter-valid series configuration.
- Random pairing, manual seeds, and automatic BYEs.
- Configurable capacity, registration approval, check-in, timing, and reporting mode.
- Optional grand-final reset.
- Match scheduling, optional lobby URL, registered maps, rescheduling, walkovers, and disqualification.
- Final result publication.

### Game-aware behavior

- Generic, Valorant, CS2, League of Legends, and Super Smash Bros. Ultimate adapters.
- Versioned editable LoL and Smash tournament templates.
- Structured per-game LoL and Smash result detail.
- Server-side validation of template and result invariants.
- No required external game API.

### Results and disputes

- Bilateral, winner-only, and staff-only reporting modes.
- Automatic confirmation under the selected policy.
- Private screenshot and external-link evidence.
- Open, review, and resolved dispute states.
- Messages, referee assignment, final ruling, and audit trail.

### Public experience

- Public rules, participants, bracket, results, standings, and streams.
- SSR and SSE updates.
- Spanish and English interfaces.
- Installable PWA with read caching and no offline writes.

### Optional Discord integration

Core flows work without Discord. An instance may enable OAuth, notifications, and slash commands through environment configuration.

### Operations

- pnpm and Turborepo monorepo.
- Next.js web and Fastify API.
- PostgreSQL, Drizzle migrations, and PostgreSQL-backed jobs.
- S3-compatible storage with MinIO for local operation.
- Docker Compose with production-safe defaults.
- CI, CodeQL, Dependabot, demo seeds, and versioned GHCR images.

## Excluded from the MVP

- Payments, entry fees, and prize management.
- Round robin, Swiss, groups plus playoffs, seasons, and qualifiers.
- Interactive vetoes.
- Per-match check-in and captain-negotiated rescheduling.
- Internal chat.
- Appeals and formal penalty history.
- Required Riot, Steam, or other game integrations.
- Desktop application.
- Managed cloud hosting.
- Global moderation and platform bans.
- Offline mutations and synchronization.
- Web push notifications.
- General-purpose outgoing webhooks.

## Design limits

| Parameter                                | Target                   |
| ---------------------------------------- | ------------------------ |
| Normal tournament size                   | 8–128 participants       |
| Supported without architectural redesign | 512+ participants        |
| Evidence file                            | At most 10 MB            |
| Evidence count                           | At most five per result  |
| Default delay tolerance                  | 10 minutes, configurable |
| Default result confirmation              | 30 minutes, configurable |
| Default dispute window                   | 60 minutes, configurable |
| Concurrency smoke                        | 256 users                |

## Scope acceptance

A proposed feature is in scope only when it:

1. Appears here or in an accepted ADR.
2. Has testable acceptance criteria.
3. Has a testing strategy.
4. Preserves a simple self-hosted installation.
5. Does not add distributed infrastructure without measured need.
6. Documents Spanish and English user behavior when user-facing.
