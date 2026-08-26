# Contribution backlog

This backlog lists work that is useful **after v1.0.0**. It is not an issue tracker replacement: before implementing a story, search GitHub and open or claim one issue. Requirements link to [FUNCTIONAL_REQUIREMENTS.md](FUNCTIONAL_REQUIREMENTS.md), and architecture changes require an ADR.

## How to pick work

1. Choose one story with no active issue or assignee.
2. Reproduce or inspect the current behavior.
3. Open an issue with a narrow acceptance boundary.
4. Discuss database, API contract, authorization, or architecture changes first.
5. Add tests and documentation in the same pull request.

Priorities:

- **P0:** release/security/correctness blocker.
- **P1:** important hardening or contributor experience.
- **P2:** expansion candidate.

## Delivered baseline

The codebase already provides these broad capabilities:

| Area          | Delivered baseline                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------- |
| Identity      | Email accounts, sessions, CSRF, verification tokens, optional Discord OAuth, participant passes |
| Organizations | Organization membership, dashboard, teams/players, tournament ownership                         |
| Tournaments   | Single/double elimination, registration, check-in, seeds, BYEs, public pages                    |
| Games         | Generic, Valorant, CS2, LoL, and Smash adapters; LoL/Smash templates                            |
| Results       | Configurable reporting modes and structured LoL/Smash game detail                               |
| Arbitration   | Evidence model, disputes, messages, rulings, and audit data                                     |
| Experience    | Spanish/English interface, light/dark/system themes, SSE, PWA                                   |
| Operations    | Compose, migrations, seeds, CI/security workflows, release images                               |

A “delivered” row does not guarantee every original product wish is complete. Verify the specific route, UI, and test before opening a change.

## Current hardening stories

### I18N-API-01 — Stable localized API errors

- **Priority:** P1
- **Related:** NFR-I18N-04, NFR-MAINT-05
- **Problem:** many API error messages are Spanish strings. English clients need stable codes and localized presentation.
- **Acceptance criteria:**
  - Every public API error has a documented stable `error.code`.
  - Web clients map known codes to Spanish/English copy.
  - Unknown codes use a safe locale-aware fallback.
  - Tests assert codes, not fragile human-message text.
  - OpenAPI documents the envelope and representative codes.
- **Out of scope:** translating structured operational logs.

### TEST-INT-01 — Make API integration tests independently runnable

- **Priority:** P1
- **Related:** TESTING_STRATEGY
- **Problem:** the integration suite may be skipped when its isolated database environment is unavailable.
- **Acceptance criteria:**
  - One documented command provisions dependencies and runs the suite.
  - Tests do not mutate a developer’s normal database.
  - CI reports integration tests separately from unit tests.
  - Failure output explains missing prerequisites.
  - Result/reporting and participant-pass flows are included.

### A11Y-01 — Manual screen-reader verification

- **Priority:** P1
- **Related:** NFR-A11Y-01 through NFR-A11Y-04
- **Problem:** axe and keyboard checks cannot validate real announcement quality.
- **Acceptance criteria:**
  - Run representative visitor, participant-pass, and organizer flows with NVDA.
  - Run at least the public tournament flow with VoiceOver.
  - Record browser, reader version, route, expected announcement, and result.
  - Fix P0/P1 findings or create scoped issues.
  - Update [ACCESSIBILITY.md](ACCESSIBILITY.md) with verified behavior.

### DOC-01 — Keep English contributor documentation canonical

- **Priority:** P1
- **Related:** NFR-I18N-05, NFR-MAINT-03
- **Problem:** documentation can silently diverge from code or return to Spanish-only contributor guidance.
- **Acceptance criteria:**
  - Root community files and `docs/` are English.
  - Links, Mermaid blocks, commands, IDs, and ADR references validate.
  - Schema/API changes update their corresponding documents.
  - Spanish README remains available.
  - PR template asks for bilingual user-facing behavior.

### OPS-01 — Automated backup/restore smoke

- **Priority:** P1
- **Related:** NFR-OPS-04, NFR-OPS-05
- **Problem:** backup commands are documented but restoration is not continuously verified.
- **Acceptance criteria:**
  - Create tournament, participant, match, result, and evidence metadata.
  - Back up PostgreSQL and object storage.
  - Restore into an isolated empty environment.
  - Verify relational counts and one private object.
  - Leave production and developer volumes untouched.

### DISC-01 — Configured Discord contract test

- **Priority:** P1
- **Related:** FR-DISCD-01 through FR-DISCD-04
- **Problem:** disabled-state behavior is testable locally, but enabled OAuth/interactions need a repeatable verification path.
- **Acceptance criteria:**
  - Document a maintainer-owned test application setup.
  - Verify OAuth state, callback, identity linking, and signed interactions.
  - Verify invalid signatures fail.
  - Verify missing credentials leave core routes healthy.
  - Never commit credentials or real user data.

### OBS-01 — Bounded operational metrics

- **Priority:** P2
- **Related:** NFR-OPS-02
- **Problem:** health and logs exist, but operators lack aggregate request/job/SSE metrics.
- **Acceptance criteria:**
  - Add protected metrics with bounded-cardinality labels.
  - Cover HTTP latency/errors, job state, SSE connections, and database pool state.
  - Keep metrics optional and dependency-light.
  - Document Prometheus scraping and sensitive-route protection.

## Game and competition expansion

### SMASH-01 — Interactive stage veto and DSR assistance

- **Priority:** P2
- **Related:** ADR-025, ADR-039
- **Acceptance criteria:**
  - Model a deterministic veto state separate from the bracket engine.
  - Enforce the selected template’s starter/counterpick pools and DSR policy.
  - Support reconnect and audit history.
  - Preserve external-veto reporting for existing tournaments.
  - Provide Spanish/English keyboard-accessible UI.

### LOL-01 — Optional Riot verification boundary

- **Priority:** P2
- **Related:** ADR-024, ADR-040
- **Acceptance criteria:**
  - Keep manual reports fully functional without Riot credentials.
  - Define explicit authorization, rate-limit, and failure behavior.
  - Verify only data allowed by Riot policy.
  - Store provenance without making the external API the bracket source of truth.

### FORMAT-01 — Round-robin proposal

- **Priority:** P2
- **Related:** MVP_SCOPE excluded formats
- **Acceptance criteria before implementation:**
  - Add an ADR comparing engine extension versus a separate format module.
  - Define standings, ties, forfeits, incomplete groups, and advancement.
  - Specify migration and public-bracket implications.
  - Add property-test invariants and a review workload forecast.

### FORMAT-02 — Swiss proposal

- **Priority:** P2
- **Acceptance criteria before implementation:**
  - Define pairing, rematches, byes, tiebreakers, drops, and late registration.
  - Prove deterministic pairing from explicit state and injected randomness.
  - Keep organizer correction auditable.

## Contributor experience

### DX-01 — Documentation link and terminology validation

- **Priority:** P2
- **Acceptance criteria:**
  - CI validates internal Markdown links and duplicate heading anchors.
  - A small allowlist covers intentionally external or generated references.
  - Validation reports the source file and broken target.
  - The check does not require network access for ordinary pull requests.

### DX-02 — Windows development quick path

- **Priority:** P2
- **Acceptance criteria:**
  - Document PowerShell equivalents for environment setup.
  - Cover Docker port collisions and configurable host ports.
  - Verify on a clean Windows host with Docker Desktop.
  - Keep POSIX commands as the primary CI/self-hosting contract.

## Story template

```markdown
### AREA-NN — Outcome-oriented title

- **Priority:** P0 | P1 | P2
- **Related:** requirement IDs or ADRs
- **Problem:** current user or maintainer pain
- **Acceptance criteria:**
  - Observable result
  - Required failure/edge case
  - Required tests
  - Required documentation
- **Out of scope:** explicit exclusions
```

## Definition of done

A backlog story is complete only when:

- Acceptance criteria are demonstrated.
- Authorization and security boundaries are tested.
- Relevant lint, type, test, browser, and build gates pass.
- User-facing behavior works in Spanish and English.
- Documentation and changelog are updated.
- The pull request is small enough to review confidently.
