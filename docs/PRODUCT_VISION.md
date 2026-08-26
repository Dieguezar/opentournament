# Product vision

## Vision

**OpenTournament enables any community or independent organizer to create, manage, and publish professional esports tournaments without depending on closed, expensive, or difficult-to-operate platforms.** It is open source, self-hosted, and designed to be as approachable to use as it is to operate.

## Mission

Democratize esports tournament operations so a gaming café, university, community server, or streamer can launch a complete competition in minutes with reliable brackets, verifiable results, and transparent arbitration on infrastructure they control.

## Problem

Esports communities, especially in Latin America, often combine spreadsheets, closed registration products, third-party brackets, and chat platforms. Organizers duplicate work, participants lack one trustworthy source of truth, and disputed results have weak evidence or auditability.

## Opportunity

- Amateur and semi-professional esports communities continue to grow.
- Existing products are closed, fragmented, expensive, or focused only on brackets.
- An MIT-licensed project with `docker compose up -d`, strong organizer UX, and complete workflows can become shared community infrastructure.
- A future managed service may simplify infrastructure without removing core features from the open-source edition.

## Audience

1. Communities, gaming cafés, and independent organizers.
2. Universities and schools.
3. Streamers and Discord-based communities.
4. Participants and spectators using the public tournament experience.

See [USER_ROLES.md](USER_ROLES.md) and [PRD.md](PRD.md).

## Value proposition

- **Complete workflow:** registration, check-in, competition, reporting, evidence, disputes, and final standings.
- **Trust:** configurable reporting, private evidence, and audited rulings.
- **Control:** MIT-licensed, self-hosted, and organizer-owned data.
- **Low operating cost:** a small instance runs on modest hardware.
- **Game-aware:** a generic adapter plus official Valorant, CS2, League of Legends, and Smash Ultimate adapters.
- **Optional community automation:** Discord OAuth and bot capabilities when an instance enables them.
- **Public experience:** indexable tournament pages, live updates, and an installable PWA.
- **Inclusive access:** Spanish and English interfaces plus keyboard and screen-reader support.

## Product principles

1. Make installation and upgrades predictable.
2. Optimize the organizer’s critical path.
3. Keep game rules outside the tournament core.
4. Prefer a modular architecture over premature distribution.
5. Keep contributor documentation accurate and English-accessible.
6. Design security and authorization into every boundary.
7. Treat accessibility and responsive behavior as requirements.
8. Optimize for 8–128 participants and avoid redesign before 512.
9. Govern the open-source project transparently.
10. Keep optional integrations from becoming core dependencies.

## Not a current goal

- General social networking or matchmaking.
- Payments, paid registration, or prize distribution.
- Replacing community chat platforms.
- Mandatory external game APIs.
- A managed cloud service as the primary product.
- Complex competition formats before the elimination engine is mature.

## Future directions

- Embeddable widgets and OBS overlays.
- Round robin, Swiss, seasons, qualifiers, and rankings.
- Interactive map and stage vetoes.
- A Tauri desktop application.
- Managed hosting with domains, storage, and analytics.
- Authorized game API integrations.

See [ROADMAP.md](ROADMAP.md).
