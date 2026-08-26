# Roadmap

OpenTournament v1.0.0 is published. Phases 0–3 and the original release-readiness work are complete. Live SSE and PWA support are operational; Discord remains optional and may receive further hardening. Roadmap items are direction, not a promise of delivery.

## Completed foundation

### Phase 0 — Product definition

- Product vision, PRD, scope, requirements, roles, flows, architecture, and ADRs.
- MIT license, community governance, and security policy.

### Phase 1 — Technical foundation

- pnpm/Turborepo strict-TypeScript monorepo.
- Next.js web and Fastify API.
- PostgreSQL/Drizzle migrations and demo seeds.
- Authentication, organizations, roles, Docker Compose, health checks, and CI.

### Phase 2 — Tournament MVP

- Tournament setup and public rules.
- Registration, approval, check-in, participants, seeds, and BYEs.
- Single- and double-elimination engine.
- Match scheduling, administration, public brackets, and results.

### Phase 3 — Trust and arbitration

- Configurable reporting modes.
- Private participant passes.
- LoL and Smash structured reporting.
- Evidence, disputes, messages, referee rulings, and audit.

### Phase 4 — Live and optional community integrations

- SSE live bracket and result updates.
- Installable read-cache PWA.
- Optional Discord OAuth, webhooks, and slash-command infrastructure.

### Phase 5 — Open-source release

- Clean-install Compose smoke.
- CI, CodeQL, Dependabot, ZAP baseline, and accessibility automation.
- Versioned multi-architecture GHCR images with SBOM/provenance.
- Published `v1.0.0`.
- English canonical contribution path and bilingual user interface.

## Current hardening priorities

1. Locale-aware API errors built on stable error codes.
2. Manual NVDA and VoiceOver verification of representative organizer and participant flows.
3. Expand integration/E2E coverage for participant passes and bilingual flows.
4. Keep schema, API, and architecture documentation synchronized.
5. Validate optional Discord behavior against a configured test application.
6. Improve operational metrics without adding mandatory infrastructure.

## Expansion candidates

Each initiative requires its own issue, acceptance criteria, and ADR when it changes architecture.

- Round robin, Swiss, groups plus playoffs.
- Seasons, qualifiers, rankings, and statistics.
- Interactive map/stage vetoes and DSR assistance.
- Embeddable brackets and OBS overlays.
- Per-match check-in and captain-negotiated rescheduling.
- Appeals and formal sanctions.
- Authorized Riot/Steam integrations.
- Outgoing webhooks.
- Tauri desktop packaging.
- Managed hosting that adds infrastructure convenience without withholding core open-source features.

## Product priorities

1. Installation and upgrade reliability.
2. Result trust and arbitration.
3. Organizer efficiency.
4. Participant accessibility.
5. Game-aware depth.
6. Sustainable contributions and documentation.
