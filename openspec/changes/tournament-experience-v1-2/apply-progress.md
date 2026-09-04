# Apply Progress: Tournament Experience v1.2

## Work Unit 1: Schema/contracts

**Status:** Complete

### Completed Tasks

- [x] 1.1 RED: Add appearance, profile privacy, media ownership, color, and ordering contract tests.
- [x] 1.2 GREEN: Add additive Drizzle schema/migration, DTOs, and validation schemas.
- [x] 1.3 REFACTOR: Format code and verify database migration plus focused and workspace tests.

### TDD Cycle Evidence

| Task | Test file                                                                                                                  | Layer | Safety net                                                                                                                                             | RED                                                                                                                                                                                                                                                                                                                                                                                                         | GREEN                                                                           | Triangulate                                                                                                                                                                           | Refactor                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1.1  | `packages/database/src/schema.test.ts`, `packages/shared-types/src/index.test.ts`, `packages/validation/src/index.test.ts` | Unit  | Database/shared-types test files were new (0 baseline tests); RED validation run retained 51 pre-existing passing cases while the new assertion failed | With only `packages/database/src/schema.ts` temporarily restored from the pre-WU1 tracker, the executable database test command exited 1 with two failures. The direct XOR test ran and failed when the absent baseline `publicMedia` export could not supply a Drizzle table configuration; this is test-first evidence of the missing table, not a claim that an existing XOR expression evaluated false. | Database 2/2, shared-types 1/1, validation 52/52 passed                         | Media owner XOR checks both owner columns and the `IS NOT NULL) <> (` operator; colors cover valid/invalid input; opt-ins and ordered constants cover distinct outputs                | Prettier completed; focused tests stayed green |
| 1.2  | Same contract tests                                                                                                        | Unit  | Same exact pre-change safety-net evidence as 1.1                                                                                                       | Tests referenced absent production contracts before implementation                                                                                                                                                                                                                                                                                                                                          | Same focused package results passed after schema, DTO, and validation additions | Structural triangulation skipped only for static table/type exports because each has one deterministic declaration; their complete observable shape is asserted by the contract tests | No behavior change after formatting            |
| 1.3  | Same contract tests                                                                                                        | Unit  | Final focused package run passed 55 tests                                                                                                              | N/A: verification/refactor task has no new production behavior                                                                                                                                                                                                                                                                                                                                              | `pnpm db:migrate` and `pnpm test` passed                                        | Structural triangulation not applicable because this task only verifies/cleans existing behavior                                                                                      | Legacy URL columns retained without backfill   |

### Test Summary

- **Total tests written:** 4 (two database contract tests, one shared-types contract test, and one validation contract test).
- **Total focused tests passing:** 55 (database 2/2, shared-types 1/1, validation 52/52).
- **Layers used:** Unit (4 authored behaviors; 55 focused test executions).
- **Approval tests:** None — WU1 adds contracts rather than refactoring existing behavior.
- **Pure functions created:** None — WU1 is schema and contract declaration work.

### Work Unit Evidence

| Evidence           | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Direct XOR test    | RED executable command: after temporarily restoring only `packages/database/src/schema.ts` from `codex/tournament-experience-v1-2`, `pnpm --filter @opentournament/database test` exited 1 with 2/2 failures. The direct test reached `getTableConfig(publicMedia)` and failed because the baseline export was undefined; the file was restored byte-for-byte from HEAD in `finally`. GREEN command: `pnpm --filter @opentournament/database test` passed 2/2, including direct inspection of the named check, both owner columns, and the XOR SQL operator. |
| Focused tests      | `pnpm --filter @opentournament/database test` passed (2/2); `pnpm --filter @opentournament/shared-types test` passed (1/1); `pnpm --filter @opentournament/validation test` passed (52/52).                                                                                                                                                                                                                                                                                                                                                                  |
| Runtime harness    | `$env:POSTGRES_HOST_PORT='55432'; docker compose up -d postgres` succeeded. `docker inspect -f '{{.State.Health.Status}}' opentournament-postgres-1` returned `healthy`. With a process-only, redacted localhost:55432 `DATABASE_URL`, `pnpm db:migrate` succeeded. `$env:POSTGRES_HOST_PORT='55432'; docker compose stop postgres` succeeded; no volume was deleted.                                                                                                                                                                                        |
| Workspace evidence | Exact command `pnpm test` passed: 10 workspace test tasks and 31 configuration tests; 8 pre-existing API integration tests remained skipped.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Rollback boundary  | Revert the WU1 schema, generated migration and metadata, DTO/validation contracts, contract tests, and this progress/task state without touching API routes, media behavior, overlays, or web UI.                                                                                                                                                                                                                                                                                                                                                            |

### Workload / Delivery Boundary

- Delivery strategy: `auto-chain`.
- Chain strategy: `feature-branch-chain`.
- Current slice: WU1 schema/contracts, targeting the tracker branch.
- Initial authored code/tests: 216 additions, within the 400-line review budget.
- Generated-output exception: maintainer approved inclusion of the Drizzle SQL, journal, and 3,932-line snapshot. Before this gatekeeper correction, the committed WU1 diff was 4,272 additions plus 4 deletions, or 4,276 changed lines.

### Files Included

- `packages/database/src/schema.ts`
- `packages/database/src/schema.test.ts`
- `packages/database/migrations/0008_superb_otto_octavius.sql`
- `packages/database/migrations/meta/0008_snapshot.json`
- `packages/database/migrations/meta/_journal.json`
- `packages/shared-types/src/index.ts`
- `packages/shared-types/src/index.test.ts`
- `packages/validation/src/index.ts`
- `packages/validation/src/index.test.ts`
- `openspec/changes/tournament-experience-v1-2/tasks.md`
- `openspec/changes/tournament-experience-v1-2/apply-progress.md`

### Remaining Tasks

Tasks 2.1 through 6.3 remain pending.

## Work Unit 2: Profile/appearance API

**Status:** Complete.

### Completed Tasks

- [x] 2.1 RED: Add integration coverage for profile publication/opt-ins/stable slugs, unlinked Smash labels, appearance branding, validation, and denial.
- [x] 2.2 GREEN: Register public profile owner and read routes with an explicit publication gate and private-field omission.
- [x] 2.3 GREEN: Add an administrator-only appearance patch with validated colors and visibility-safe public reads.
- [x] 2.4 REFACTOR: Centralize tournament-admin lookup and rerun focused integration and workspace tests.

### TDD Cycle Evidence

| Task | Safety net                                                    | RED                                                                                                                                                                                                 | GREEN / triangulation                                                                                                                                                                                                                      | Refactor                                                                                                |
| ---- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| 2.1  | `pnpm --filter @opentournament/api test` passed 49, skipped 8 | Fresh transient-PostgreSQL `pnpm --filter @opentournament/api test -- app.integration.test.ts` exited 1: new profile flow expected 200 but received 404 before routes existed (57 passed, 1 failed) | Final focused run passed 58/58; cases cover unpublished 404, biography-only opt-in, immutable slug through gamertag update, invalid color 400, 403 admin denial, draft 404, public branding, and unlinked Smash label without profile data | Prettier and typecheck retained behavior                                                                |
| 2.2  | Same API baseline                                             | New route was absent; later focused RED exited 1 because an omitted publication flag made the stable-slug gamertag update return public 404                                                         | Owner PUT/DELETE and public GET pass; omitted flags preserve existing settings and profile response includes only opted-in fields                                                                                                          | Shared projection omits private fields by construction                                                  |
| 2.3  | Same API baseline                                             | New appearance mutation/read behavior was absent                                                                                                                                                    | Authorized patch persists colors, unauthorized patch is 403, public read gates draft/unlisted data                                                                                                                                         | Shared admin lookup backs authorization                                                                 |
| 2.4  | Focused suite green before cleanup                            | N/A: refactor-only task                                                                                                                                                                             | Focused suite green after cleanup                                                                                                                                                                                                          | `pnpm exec prettier --write ...`, `pnpm --filter @opentournament/api typecheck`, and `pnpm test` passed |

### Work Unit Evidence

| Evidence              | Result                                                                                                                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command  | Fresh isolated database on the process-only Compose PostgreSQL host: `pnpm --filter @opentournament/api test -- app.integration.test.ts` passed 10 files and 58/58 tests.                                                                 |
| Runtime harness       | The same Fastify injection flow ran against a fresh migrated database: owner profile create/publish/revoke, public reads, administrator appearance patch, outsider 403, draft 404, publication, and unlinked Smash team label all passed. |
| Environment lifecycle | `POSTGRES_HOST_PORT=55432; docker compose up -d postgres` reached healthy. Temporary per-run databases were dropped; `docker compose stop postgres` succeeded without deleting the Compose volume.                                        |
| Workspace proof       | `pnpm test` passed 10 workspace tasks and 31 configuration tests; integration tests were skipped only because the transient test URL was intentionally unset for that workspace command.                                                  |
| Rollback boundary     | Revert `apps/api/src/routes/profiles.ts`, profile registration, appearance/public-read route changes, permission lookup refactor, integration coverage, and this WU2 progress/task state. WU1 schema/contracts remain intact.             |

### Workload / Delivery Boundary

- Delivery strategy: `auto-chain`; chain strategy: `feature-branch-chain`.
- Current slice: WU2 Profile/appearance API; intended target is `codex/tournament-experience-v1-2-wu1-schema-contracts`, never `main`.
- Maintainer approved `size:exception` for this cohesive WU2 slice: 492 changed lines total (427 code/tests + 65 required OpenSpec evidence); no test, style, or documentation evidence was removed to meet the review budget.

### Files Included

- `apps/api/src/app.integration.test.ts`
- `apps/api/src/app.ts`
- `apps/api/src/routes/profiles.ts`
- `apps/api/src/routes/tournaments.ts`
- `apps/api/src/services/permissions.ts`
- `openspec/changes/tournament-experience-v1-2/tasks.md`
- `openspec/changes/tournament-experience-v1-2/apply-progress.md`

### Remaining Tasks

Tasks 3.1 through 6.3 remain pending.

### Gatekeeper Correction: Public tournament response compatibility

- **RED:** Added regression assertions for `organization`, `gameAdapterKey`, `capacity`, `seriesConfig`, `settings`, and `rules` alongside WU2 appearance. On fresh transient PostgreSQL, `pnpm --filter @opentournament/api test -- app.integration.test.ts` exited 1 with 57 passed and 1 failed because the narrowed response omitted those established public fields.
- **GREEN:** Restored the prior `{ tournament, organization }` public contract and extended it with `appearance`; retained the public visibility and `publishedAt` 404 gate.
- **REFACTOR/verification:** Focused integration rerun passed 58/58; `pnpm --filter @opentournament/api typecheck` and `pnpm test` passed. The owner/admin flow ran on a fresh database at port 55432; Compose PostgreSQL was stopped without volume deletion.
- **Rollback addition:** Revert the restored by-slug response shape and its regression assertions together with the WU2 route slice; WU1 remains untouched.

## Work Unit 3a: Private image ingest

**Status:** Complete interim prerequisite. This slice deliberately leaves Media Lifecycle tasks 3.1–3.3 unchecked because multipart authorization, database attachment/publication, same-origin retrieval, replacement, retirement, and worker cleanup remain WU3b/WU3c scope.

### TDD Cycle Evidence

| Scope                                | Safety net                                                                                           | RED                                                                                                                                                                                                                             | GREEN / triangulation                                                                                                                                                                                                                                | Refactor                                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Private image validation and staging | `pnpm --filter @opentournament/api test` passed 49 tests, 9 skipped before the new test file existed | `pnpm --filter @opentournament/api test -- src/services/public-media.test.ts` exited 1 because the new Sharp-backed test could not resolve the absent `sharp` package; no production media module existed on the clean WU2 base | Added Sharp and minimal private-bucket helpers; focused run passed 54 tests, 10 skipped. Cases cover JPEG detected MIME/re-encoding metadata removal, SVG/document and corrupt-byte rejection, byte/dimension/pixel limits, and opaque private keys. | Prettier completed; focused run remained green, API typecheck passed, `pnpm test` passed, and `git diff --check` passed. |

### Work Unit Evidence

| Evidence             | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command | `pnpm --filter @opentournament/api test -- src/services/public-media.test.ts` passed: 54 tests, 10 skipped across the API suite; the new service file contributes five unit tests and a MinIO harness test when enabled.                                                                                                                                                                                                                                                                                                                            |
| Runtime harness      | With transient `MINIO_API_HOST_PORT=59000` and `MINIO_CONSOLE_HOST_PORT=59001`, `docker compose up -d minio` reached `healthy`. With `S3_ENDPOINT=http://127.0.0.1:59000`, `S3_BUCKET=wu3a-private-media-harness`, and `RUN_MINIO_HARNESS=true`, the focused command passed 55 tests, 9 skipped: it staged a generated PNG under `private/public-media/`, verified private bytes and content, deleted it and verified absence, then confirmed invalid SVG did not add an object. `docker compose stop minio` succeeded without deleting the volume. |
| API typecheck        | `pnpm --filter @opentournament/api typecheck` passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Workspace proof      | Exact `pnpm test` passed: 10 Turbo test tasks and 31 configuration tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Rollback boundary    | Revert Sharp/package lock additions, bounded private storage primitives, `public-media` validation/stage/discard helpers, focused tests, and this WU3a evidence. No route, database, publication, proxy, replacement, retirement, or worker behavior is included.                                                                                                                                                                                                                                                                                   |

### Workload / Delivery Boundary

- Delivery strategy: `auto-chain`; chain strategy: `feature-branch-chain`.
- Current slice: `wu3a-private-image-ingest`, based exactly on WU2 commit `a77835989ac2aa98e1488f4cdeaa60990152179d`.
- Authored code, tests, and OpenSpec evidence are within the 400-line review budget; generated `pnpm-lock.yaml` changes use the maintainer-approved Sharp-only `size:exception`.
- The preserved WU3b/WU3c candidate remains unstaged after this slice; it is not part of this commit.

### Remaining Tasks

Tasks 3.1 through 6.3 remain pending. WU3b/WU3c must add the HTTP boundary and lifecycle ownership behavior before any 3.x task is checked.

## Work Unit 3b: Profile media proxy

**Status:** Complete interim prerequisite. Media Lifecycle tasks 3.1–3.3 remain unchecked because replacement, deletion, tournament media, retirement, and worker cleanup remain WU3c scope.

### TDD Cycle Evidence

| Scope                                | Safety net                                                      | RED                                                                                                                                                                                                                                                                                                                            | GREEN / triangulation                                                                                                                                                                                                                                                                                                                                   | Refactor                                                                    |
| ------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Initial avatar upload and read proxy | Existing WU3a focused service suite passed 54 tests, 11 skipped | On a fresh PostgreSQL database, `pnpm --filter @opentournament/api test -- app.integration.test.ts` reached the new avatar flow and failed 404 instead of expected 201 because no multipart/media route was registered. Two unrelated legacy cases also failed in a reused database; later runs used a newly created database. | Fresh PostgreSQL + MinIO focused integration passed 64 tests, 1 skipped. The real compensation case uploads a valid PNG, uses a PostgreSQL trigger to force the subsequent `avatar_media_id` publication transaction to fail, then proves the `private/public-media/` MinIO `ListObjectsV2` state is unchanged and no `public_media` row was committed. | Prettier, API typecheck, workspace tests, and diff check retained behavior. |

### Work Unit Evidence

| Evidence                    | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused integration command | With fresh `wu3b_compensation` PostgreSQL at 55432 and MinIO at 59000/59001, `pnpm --filter @opentournament/api exec vitest run src/app.integration.test.ts -t "removes a staged MinIO avatar"` passed: 1 test, 10 skipped.                                                                                                                                                                                                                                                     |
| Runtime harness             | Fresh migrations, owner/profile publication, and a valid multipart PNG upload were exercised against real PostgreSQL and MinIO. A test-only PostgreSQL `BEFORE UPDATE OF avatar_media_id` trigger forced the subsequent publication transaction to fail; the endpoint rejected it with 500, `public_media` retained no owner row, and MinIO `private/public-media/` object keys were exactly unchanged before/after. PostgreSQL and MinIO were stopped without volume deletion. |
| Rollback boundary           | Revert multipart registration/dependency, profile-only initial avatar publication and same-origin proxy, focused integration assertions, and this WU3b evidence. WU3a storage/image validation remains; no replacement, deletion, tournament, queue, worker, or owner-lifecycle behavior is included.                                                                                                                                                                           |

### Workload / Delivery Boundary

- Delivery strategy: `auto-chain`; chain strategy: `feature-branch-chain`.
- Primary slice: `wu3b-profile-media-proxy` ends exactly at `bcdccc857413d328b655bdee56d3d5a2e1ecf7cb`, based on WU3a commit `05d11bc2b8460e6a61761fa6b6e51689b92e1d18`.
- Primary authored code, tests, lockfile, and evidence total 361 additions, within the 400-line review budget; no size exception is used.
- Dependent compensation-proof child: commit `1fce7c7d6427affa08ccff1c8134e0b1050b9cd6` adds 121 changed lines and retains the real PostgreSQL + MinIO compensation evidence as its own review slice.
- Future WU3c work must branch from the compensation-proof child tip, not the primary WU3b branch, so it retains the proof dependency.

### Remaining Tasks

Tasks 3.1 through 6.3 remain pending. WU3c owns replacement, deletion, tournament media, retirement, and worker lifecycle work.

## Work Unit 3c: Profile lifecycle and retirement executor

**Status:** Complete partial slice. Tasks 3.1–3.3 remain unchecked: authorized tournament logo/banner lifecycle is deferred to WU3d.

### TDD Cycle Evidence

| Scope                          | Safety net                                                                                                             | RED                                                                                                                                                                                                        | GREEN / triangulation                                                                                                  | Refactor                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Avatar replacement and cleanup | Existing initial-avatar and staged-publication-compensation integration cases passed 2/2 against PostgreSQL and MinIO. | `pnpm --filter @opentournament/api exec vitest run src/app.integration.test.ts -t "publishes an initial profile avatar"` failed with `expected 409 to be 201` after the replacement assertion was written. | `pnpm --filter @opentournament/api exec vitest run src/app.integration.test.ts -t "publishes an initial profile avatar | removes a staged MinIO avatar"`passed 2/2. It proves CAS contention gives one 201 and one 409, replacement exposes the new ID before the old ID is unavailable, explicit DELETE retires media, successful revocation makes current`concurrentId`404 with a`deleted`row and absent MinIO object, and forced deletion queues a pending job that the scheduler completes to`deleted` with bytes absent. | Shared retirement service; API typecheck and workspace tests passed. |

### Work Unit Evidence

| Evidence                    | Result                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused integration/runtime | Fresh `wu3c_profile_lifecycle_final` PostgreSQL on 55432 plus MinIO on 59000/59001: avatar/retry and preserved DB-publication-compensation cases passed 2/2 using real multipart, S3, database, trigger, and scheduler paths.              |
| API typecheck               | `pnpm --filter @opentournament/api typecheck` passed.                                                                                                                                                                                      |
| Workspace proof             | Exact `pnpm test` passed: 10 Turbo tasks and 31 configuration tests.                                                                                                                                                                       |
| Rollback boundary           | Revert profile replacement/removal/revocation cleanup, `media-retirement` service and worker handler, focused tests, and this WU3c evidence. WU3a ingest and WU3b initial attach/compensation proof remain; tournament media is untouched. |

### Remaining Tasks

Tasks 3.1–3.3 remain unchecked until WU3d implements and verifies tournament logo/banner upload, replacement, deletion, and visibility behavior.

### Gatekeeper Correction

- Revocation now detaches only when the captured avatar reference still matches; a concurrent winning replacement remains published and is not retired.
- Publication compensation now ends at transaction commit: a later retirement/retry-enqueue failure cannot discard the newly attached object. Focused regression coverage proves both cases.

## Work Unit 3d: Tournament media lifecycle

**Status:** Complete. Tasks 3.1–3.3 are complete; logo/banner now reuse the WU3c staged image, CAS retirement, and retry worker path.

### TDD Cycle Evidence

| Task    | RED                                                                                                                    | GREEN / refactor                                                                                                                                                                                                                                                                              |
| ------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1–3.3 | Fresh PostgreSQL + MinIO focused integration exited 1 with `404` for the new tournament-media route before it existed. | Focused avatar/tournament lifecycle integration passed 1/1: admin logo/banner upload, outsider 403, invalid slot 404, draft/private 404, replacement new-before-old retirement, explicit banner removal, and object/row terminal deletion. Prettier, API typecheck, and workspace tests pass. |

### Work Unit Evidence

| Evidence          | Result                                                                                                                                                                                                                                                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused/runtime   | Fresh `wu3d_tournament_media_green` PostgreSQL on 55432 and MinIO on 59000/59001; real multipart, private S3, DB, public proxy, and retirement flows passed. WU3b's trigger-forced staged-byte compensation proof remains shared evidence because WU3d calls the same `stagePublicImage` discard path on transaction failure. |
| Rollback boundary | Revert tournament-media service/routes and appended integration coverage; WU3a–WU3c profile ingest, proxy, replacement, retirement worker, and compensation remain intact.                                                                                                                                                    |

### Gatekeeper Correction: Tournament post-commit retirement boundary

- **RED:** On fresh PostgreSQL `wu3d_post_commit_boundary` plus MinIO, the tournament logo replacement test forced the prior-object delete and retry-job insert to fail after commit. Current code discarded the active replacement; the exact focused command exited 1 at `expect(objectExists(newObjectKey)).toBe(true)` with received `false`.
- **GREEN:** The transaction remains the only staged-upload compensation boundary. Post-commit retirement failures are contained, so the replacement returns 201, its exact response ID matches the active database row, its MinIO object remains present, and its public proxy returns 200; the old logo remains `retired` with bytes present because forced cleanup did not succeed.
- **Runtime/verification:** Fresh real PostgreSQL + MinIO focused command passed 1/1 (10 skipped); API typecheck and Prettier passed. The shared worker, slot/delete behavior, authorization, visibility, CAS, and entity retention are unchanged.

## Work Unit 4a1: Overlay presentation service

**Status:** Complete.

### Completed Tasks

- [x] 4.1 RED: Add focused unit coverage for public presentation gating, labels, automatic selection, deterministic ties, Up Next, and persisted champions.

### TDD Cycle Evidence

| Task | Safety net                                             | RED                                                                                                                                                                       | GREEN / triangulation                                                                                                                                                                                                                                                         | Refactor                                                                                               |
| ---- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 4.1  | New service and focused test had no existing baseline. | `pnpm --filter @opentournament/api test -- src/services/overlay-presentation.test.ts` exited 1 because the test referenced the absent `./overlay-presentation.js` module. | The original focused cases covered public gating, unavailable participants, active-match precedence, Up Next exclusion, and finalized champions. Ordering coverage was corrected below with independently varied scheduled/null, bracket, round, position, and ID assertions. | Prettier completed; focused test, API typecheck, workspace `pnpm test`, and `git diff --check` passed. |

### Work Unit Evidence

| Evidence             | Result                                                                                                                                                                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command | `pnpm --filter @opentournament/api exec vitest run src/services/overlay-presentation.test.ts` passed: 1 test file and 9 tests. This is the isolated file command; the prior `test --` invocation ran the broader API suite and is not retained as focused proof. |
| Runtime harness      | N/A: this work unit is a pure deterministic projection with no database, HTTP, SSE, process, storage, or external runtime boundary. WU4a2 owns the route/SSE integration harness.                                                                                |
| API typecheck        | `pnpm --filter @opentournament/api typecheck` passed.                                                                                                                                                                                                            |
| Workspace proof      | Exact `pnpm test` passed: 10 Turbo tasks and 31 configuration tests.                                                                                                                                                                                             |
| Formatting/diff      | Touched API source/test files passed Prettier check; `git diff --check` passed.                                                                                                                                                                                  |
| Workspace proof      | Exact `pnpm test` passed: 10 Turbo test tasks and 31 configuration tests.                                                                                                                                                                                        |
| Rollback boundary    | Revert `overlay-presentation.ts`, its focused tests, task checkbox, and this WU4a1 evidence. No routes, SSE, realtime, media, web, or database behavior is included.                                                                                             |

### Gatekeeper Correction: Ordering and label proof

- **Coverage correction:** Added isolated assertions for scheduled-time precedence over null schedules, winners/losers/final bracket ranking, round-number ordering, persisted position plus stable-ID ties, and whitespace-only labels mapping to `TBD`.
- **RED classification:** The assertions were added before any production edit. The isolated run passed 9/9 because `compareMatches` and `trim() || 'TBD'` already implement the required behavior; this is a missing-coverage correction, not a fabricated production-defect RED.
- **GREEN/refactor:** No production files changed. `pnpm exec prettier --check apps/api/src/services/overlay-presentation.test.ts`, `pnpm --filter @opentournament/api typecheck`, exact `pnpm test` (10 Turbo tasks and 31 configuration checks), and `git diff --check` all passed after the test/evidence update.

### Workload / Delivery Boundary

- Delivery strategy: `auto-chain`; chain strategy: `feature-branch-chain`.
- Current slice: `wu4a1-overlay-presentation`, based exactly on `cf042e1f4e83f5c8ec6d6f8b7695704df8586fc5`.
- Authored code, tests, and OpenSpec evidence total 361 changed lines from the parent, within the 400-line review budget.

### Remaining Tasks

Tasks 4.2 through 6.3 remain pending. WU4a2 owns public overlay routes and SSE invalidation; WU4b owns client convergence.

## Work Unit 4a2: Public overlay routes and SSE invalidation

**Status:** Complete.

### Completed Tasks

- [x] 4.2 GREEN: Add the public presentation route and visibility-gated SSE invalidations.

### TDD Cycle Evidence

| Task | Safety net                                                        | RED                                                                                                                                                                         | GREEN / triangulation                                                                                                                                         | Refactor                                                                                                                             |
| ---- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 4.2  | Focused correction coverage was extended before production edits. | Fresh PostgreSQL ran the new bilateral conflict/dispute path and failed because a resolved correction produced `scoreboard: null` rather than the authoritative 2–1 result. | The real-PostgreSQL focused command passed 1/1 after dispute resolution persisted the ruling score and the projection retained the finalized corrected match. | Prettier was rerun; the correction remains limited to result persistence, final-score projection, and executable route/SSE evidence. |

### Work Unit Evidence

| Evidence          | Result                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused runtime   | Fresh PostgreSQL real Fastify/SSE proof passed 1/1: a home captain reported 2–0, the opposing captain reported 2–1 to open the production conflict workflow, and an admin resolved the dispute at 2–1. The refetched authoritative snapshot asserted `homeScore: 2` and `awayScore: 1`; data-bearing legacy dispute events remained separate from payload-free `overlay.invalidated`. Containers are stopped without deleting volumes. |
| API typecheck     | `pnpm --filter @opentournament/api typecheck` passed.                                                                                                                                                                                                                                                                                                                                                                                  |
| Workspace proof   | Exact `pnpm test` passed: 10 Turbo tasks and 31 configuration tests.                                                                                                                                                                                                                                                                                                                                                                   |
| Formatting/diff   | Touched API source/test files passed Prettier check; `git diff --check` passed.                                                                                                                                                                                                                                                                                                                                                        |
| Rollback boundary | Revert the snapshot transaction/no-store policy, compatible event lookup and dual public event delivery, realtime cleanup observability, adjudicated dispute-score persistence, finalized-match scoreboard fallback, focused integration assertions, and this correction evidence. Legacy named events and WU4.3 web scope remain otherwise untouched.                                                                                 |

### Gatekeeper Correction: Route and SSE contract

- **Snapshot correctness:** The visibility gate and all appearance/participant/match reads now execute in one read-only `REPEATABLE READ` transaction, so a concurrent privacy change cannot combine an old public gate with later private-state reads.
- **Compatibility and caching:** `/events/public` accepts either the established tournament UUID or slug; it preserves data-bearing legacy named events (including `result.confirmed`) and additionally emits payload-free `overlay.invalidated`. The correction harness asserts its data-bearing `dispute.opened`/`dispute.resolved` events separately from invalidation. Snapshot, SSE, and private/unlisted 404 responses require revalidation with `no-store`.
- **Runtime proof:** Fresh PostgreSQL integration uses bracket generation, two authorized result submissions, and the production dispute-resolution endpoint—never a direct match update or synthetic event. It proves the resolved 2–1 score persists, refetches as the finalized scoreboard, observes data-bearing legacy events plus additive payload-free invalidation, and retains retry/bootstrap/heartbeat, 404-gate, and cleanup assertions.
- **Final correction proof:** pnpm --filter @opentournament/api exec vitest run src/routes/overlays.integration.test.ts passed 1/1 against fresh PostgreSQL after the test-first correction; it verified the production 2–0 → disputed 2–1 → resolved 2–1 path.

### Workload / Delivery Boundary

- Delivery strategy: `auto-chain`; chain strategy: `feature-branch-chain`.
- Current slice: `wu4a2-overlay-routes-sse`, based exactly on `bfab47fc3ec8e0ceccc9ffd030939ee072d57d47`.
- The WU4a2 chain contains the public HTTP/SSE boundary, adjudicated dispute-score persistence, finalized-match scoreboard fallback, and runtime proof; WU4.3 web convergence remains out of scope.

### Remaining Tasks

Tasks 4.3 through 6.3 remain pending. WU4.3 owns the web client refetch/coalescing/stale-response behavior.

## Work Unit 4b: Overlay live client convergence

**Status:** Complete.

### Completed Tasks

- [x] 4.3 RED/GREEN/REFACTOR: Add a route-scoped overlay client controller that coalesces invalidations, refetches authoritative snapshots, rejects disposed-route responses, and closes unavailable streams.

### TDD Cycle Evidence

| Task | Test file                                   | Layer             | Safety net                        | RED                                                                                                                                   | GREEN                                                                                  | Triangulate                                                                                                                             | Refactor                                                                                                                                 |
| ---- | ------------------------------------------- | ----------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 4.3  | `apps/web/components/overlay-live.test.tsx` | Client-state unit | N/A (new component/test boundary) | `pnpm --filter @opentournament/web exec vitest run components/overlay-live.test.tsx` exited 1 because `./overlay-live` did not exist. | Same focused command passed 3/3 after the minimum controller/component implementation. | Coalesced burst/reconnect, superseded stale response with abort, and 404 private/unavailable paths exercise distinct state transitions. | Removed the throwing network-error path so EventSource reconnect/open is the retry mechanism; focused test and typecheck remained green. |

### Work Unit Evidence

| Evidence             | Result                                                                                                                                                                                                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command | `pnpm --filter @opentournament/web exec vitest run components/overlay-live.test.tsx` passed 1 file and 3 tests.                                                                                                                                                                                                 |
| Web typecheck        | `pnpm --filter @opentournament/web typecheck` passed.                                                                                                                                                                                                                                                           |
| Workspace proof      | Exact `pnpm test` passed 10 Turbo tasks; web passed 17 files/93 tests and configuration checks passed 31/31.                                                                                                                                                                                                    |
| Runtime harness      | N/A: this isolated client state machine uses mocked `fetch`, `EventSource`, and `AbortController`; Phase 6 explicitly owns browser/OBS E2E smoke coverage. The controller tests cover requests, reconnect invalidations, aborts, listener cleanup, and 404 stream closure without launching unrelated services. |
| Formatting/diff      | `pnpm exec prettier --check apps/web/components/overlay-live.tsx apps/web/components/overlay-live.test.tsx` and `git diff --check` passed.                                                                                                                                                                      |
| Rollback boundary    | Revert `apps/web/components/overlay-live.tsx`, `apps/web/components/overlay-live.test.tsx`, task 4.3, and this evidence. API routes/SSE, overlay pages, and public UI remain untouched.                                                                                                                         |

### Workload / Delivery Boundary

- Delivery strategy: `auto-chain`; chain strategy: `feature-branch-chain`.
- Current slice: `wu4b-overlay-live-client`, based exactly on `39ea4d1f4b20db7940ceaf2268c50b2df800f35e`.
- The slice contains only the reusable web client convergence state machine, its tests, and OpenSpec evidence; exact authored line count is recorded with the commit.

### Remaining Tasks

Tasks 5.1 through 6.3 remain pending. Phase 5 owns rendering the three transparent overlay pages around this shared live client.

### Gatekeeper Correction: Route supersession

- **RED:** After the 3/3 safety-net pass, `pnpm --filter @opentournament/web exec vitest run components/overlay-live.test.tsx` exited 1 with two component-level failures: a slug rerender rendered the accepted `old-state`, and a same-slug view rerender left its prior request active.
- **GREEN:** The same focused command passed 1 file and 5 tests after route-tagging accepted snapshots and keying the lifecycle by `slug + view`. The mounted/rerendered harness proves synchronous old-state suppression, abort/listener cleanup, a non-404 replacement failure staying empty, and newer-view protection from an old late response.
- **REFACTOR:** Kept controller coalescing, reconnect, and 404 behavior unchanged; the wrapper now only owns route identity and lifecycle scope.

### Correction Work Unit Evidence

| Evidence             | Result                                                                                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command | `pnpm --filter @opentournament/web exec vitest run components/overlay-live.test.tsx` passed: 1 file, 5 tests.                                                          |
| Rollback boundary    | Revert the route-keyed wrapper, component rerender coverage, and this correction evidence. Controller behavior, API/SSE contracts, and Phase 5 pages remain unchanged. |

## Work Unit 5a: Profile read contracts

**Status:** Partial slice complete; Tasks 5.1 and 5.2 remain unchecked because their web surfaces and controls are out of scope.

### TDD Cycle Evidence

| Slice         | Safety net                                                                                                                 | RED                                                                                                                      | GREEN / triangulation                                                                                                                                                                                                                 | Refactor                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Profile reads | Pre-slice `pnpm test:integration` exited nonzero with four failures; the isolated profile contract had no prior assertion. | Fresh PostgreSQL test exited 1 before implementation: unauthenticated `GET /profile/public` returned 404 instead of 401. | Fresh PostgreSQL focused API test passed 1/1 after adding owner settings, publication-gated avatars, and linked/unlinked Smash response coverage. Private, published, revoked, linked, and unlinked paths exercise distinct branches. | Avoided a duplicate media projection when building public DTOs; no behavior changed. |

### Work Unit Evidence

| Evidence          | Result                                                                                                                                                                                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused/runtime   | Fresh PostgreSQL `opentournament-wu5a-final` passed `pnpm --filter @opentournament/api exec vitest run src/app.integration.test.ts -t "returns owner settings and published Smash profile links without leaking private participants"` (1/1; 11 skipped). Container stopped without deleting volumes. |
| API/typecheck     | `pnpm --filter @opentournament/api typecheck` passed.                                                                                                                                                                                                                                                 |
| Workspace proof   | Exact `pnpm test` passed: 10 Turbo tasks plus 31 configuration tests.                                                                                                                                                                                                                                 |
| Formatting/diff   | Prettier check/write completed on touched files; `git diff --check` passed.                                                                                                                                                                                                                           |
| Rollback boundary | Revert the profile/tournament read projections, focused integration case, and this WU5a evidence; profile mutations, media lifecycle, overlays, and Phase 5 UI remain intact.                                                                                                                         |

### Remaining Tasks

- [ ] 5.1 RED remains pending for web branding, profile/privacy links, canvas, and forms.
- [ ] 5.2 GREEN remains pending for public pages and management controls.
- [ ] 5.3 GREEN/REFACTOR and all Phase 6 work remain pending.

## Work Unit 5b: Public tournament branding

**Status:** Partial slice complete; Tasks 5.1 and 5.2 remain unchecked because profile pages, privacy links, owner/admin forms, uploads, and overlay views are outside this work unit.

### Completed Slice

- Added a synchronous `TournamentBranding` presenter to render API-provided tournament branding on `/t/[slug]`.
- Confined primary and accent CSS custom properties to the presenter, and accepted only six-digit hex colors.
- Mapped logo and banner media IDs exclusively to same-origin `/api/v1/media/:id` paths through `next/image` with `unoptimized`, preserving proxy caching and the existing CSP.

### TDD Cycle Evidence

| Slice                      | Safety net                                             | RED                                                                                                                                                 | GREEN / triangulation                                                                                                                                                              | Refactor                                                                                                      |
| -------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Public tournament branding | No existing presenter test covered this page boundary. | `pnpm --filter @opentournament/web exec vitest run components/tournament-branding.test.tsx` exited 1 because `./tournament-branding` did not exist. | The focused test passed 3/3 after the presenter was added: branded logo/banner/color rendering, default no-media rendering, and malformed-color rejection cover distinct branches. | Typed scoped CSS variables as custom properties, then reran focused tests and typecheck; no behavior changed. |

### Work Unit Evidence

| Evidence             | Result                                                                                                                                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test         | `pnpm --filter @opentournament/web exec vitest run components/tournament-branding.test.tsx` passed (1 file, 3 tests).                                                                                                                                                             |
| Typecheck            | `pnpm --filter @opentournament/web typecheck` passed.                                                                                                                                                                                                                             |
| Workspace proof      | Exact `pnpm test` passed: 10 Turbo tasks; web reported 18 files and 98 tests; configuration suite reported 31 tests.                                                                                                                                                              |
| Route/runtime wiring | `pnpm --filter @opentournament/web build` passed; Next.js 16.3.2 compiled and listed `/t/[slug]` as a dynamic route. No API-backed browser smoke was run because this bounded component consumes the existing public response and does not add a runtime route or API dependency. |
| Formatting/diff      | Prettier ran on all touched source/test/style files; `git diff --check` passed before commit.                                                                                                                                                                                     |
| Rollback boundary    | Revert the public page import, branding presenter, local CSS module, its test, and this WU5b evidence. Existing data fetches, 404 behavior, media API, profile work, and overlays remain unchanged.                                                                               |

### Remaining Tasks

- [ ] 5.1 remains pending for the unsliced profile/privacy/links and canvas RED coverage.
- [ ] 5.2 remains pending for owner/admin appearance controls and remaining public surfaces.
- [ ] 5.3 and all Phase 6 work remain pending.

## Work Unit 5c: Public player page and navigation

**Status:** Partial slice complete; Tasks 5.1, 5.2, and 5.3 remain unchecked because their broader web/form/overlay scope is unfinished.

### TDD Cycle Evidence

| Slice                       | Safety net                                                                          | RED                                                                                                                                                     | GREEN / triangulation                                                                                                                                                                                                                    | Refactor                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Public profile presentation | `pnpm --filter @opentournament/web test` passed 18 files and 98 tests before edits. | `pnpm --filter @opentournament/web exec vitest run components/public-player-profile.test.tsx` exited 1 because `./public-player-profile` did not exist. | Focused test passed 3/3 after adding the presenter and route: opted-in avatar/name/biography rendering, absent/private omission with a rejected external URL, and valid/invalid/unlinked participant navigation cover separate branches. | Added explicit participant DTO typing after typecheck caught fallback inference; reran focused tests, typecheck, workspace proof, and build. |

### Work Unit Evidence

| Evidence             | Result                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test         | `pnpm --filter @opentournament/web exec vitest run components/public-player-profile.test.tsx` passed (1 file, 3 tests).                                                                                             |
| Typecheck            | `pnpm --filter @opentournament/web typecheck` passed.                                                                                                                                                               |
| Workspace proof      | Exact `pnpm test` passed: 10 Turbo tasks; web passed 19 files and 101 tests; configuration suite passed 31 tests.                                                                                                   |
| Route/runtime wiring | `pnpm --filter @opentournament/web build` passed; Next.js 16.3.2 listed `/players/[slug]` and `/t/[slug]` as dynamic routes.                                                                                        |
| Formatting/diff      | Prettier check passed on touched files; `git diff --check` passed.                                                                                                                                                  |
| Rollback boundary    | Revert the public profile presenter/style/test, `/players/[slug]`, tournament participant projection, and this WU5c evidence. Existing API publication gates, branding, forms, uploads, and overlays remain intact. |

### Remaining Tasks

- [ ] 5.1 remains pending for the unsliced branding/privacy/forms/canvas coverage.
- [ ] 5.2 remains pending for owner/admin profile and appearance controls.
- [ ] 5.3 and all Phase 6 work remain pending.

## Work Unit WU5c-registration-preservation-correction

**Status:** Complete partial correction; umbrella tasks 5.1, 5.2, and 5.3 remain unchecked.

### Correction Scope

- Restored `/t/[slug]` to render the complete existing registrations response and its original count, team tag, registration-status, and check-in presentation.
- Added the existing public team registration identity to the narrow published participant projection, then joined player links only by that exact `teamId`; labels, positions, and duplicate-sensitive values are never used for linking.
- Localized public-player presentation and unavailable-state copy through the Spanish/English dictionary convention without broadening localization scope.

### TDD Cycle Evidence

- **RED:** New synchronous `public-tournament-registration-list.test.tsx` failed with `Cannot find module './public-tournament-registration-list'`; the presenter did not exist before the correction.
- **GREEN:** `pnpm --filter @opentournament/web test -- public-tournament-registration-list.test.tsx public-player-profile.test.tsx` passed: 20 files, 102 tests. The new regression proves one stable-ID link with four duplicate labels, plain unlinked/private/revoked labels, tags, pending/waitlisted status, approved checked-in/out badges, and all four list entries.
- **API proof:** Fresh isolated PostgreSQL container `opentournament-wu5c-correction-pg3` ran the targeted `returns owner settings and published Smash profile links without leaking private participants` integration test: 1 passed, 11 skipped. It asserts `teamId` for linked and unlinked public participants and stops the container without removing it or volumes.
- **REFACTOR:** Extracted the registration presenter so the page retains its original registration source/metadata while the identity map is isolated and directly testable.

### Verification Evidence

- `pnpm --filter @opentournament/web typecheck` — passed.
- `pnpm --filter @opentournament/api typecheck` — passed.
- Exact workspace command `pnpm test` — passed (web 102 tests; API 63 passed / 14 expected integration-dependent skips; config 31 passed).
- `pnpm --filter @opentournament/web build` — passed; Next.js 16.3.2 emitted dynamic `/players/[slug]` and `/t/[slug]` routes.
- Initial package-script API attempt passed `-t` as a positional argument and ran the file concurrently; its unrelated migration races/MinIO failures were not used as proof. The corrected `pnpm exec vitest ... --testNamePattern` isolated the target and passed.
- Prettier check passed for source/test files and `git diff --check` passed. The cumulative progress file retains pre-existing Markdown formatting and was appended without reformatting prior evidence.

### Work Unit Evidence

- **Rollback boundary:** revert the correction commit to restore the immediately preceding WU5c player-page implementation; no migration or persistent-data change was introduced.
- **Protected state:** `.gitignore` and `artifacts/a11y-audit/` remain unstaged/unmodified by this work; all three pre-existing stashes remain, including `e269057a0ab90f7efb533f5195e15d0ec3dfa96a`.
- **Final owned diff:** `268` changed lines, within the 400-line correction cap.

## Work Unit WU5d: Owner profile controls

**Status:** Partial Phase 5 slice complete; tasks 5.1, 5.2, and 5.3 remain unchecked.

### TDD Cycle Evidence

- **Safety net:** `pnpm --filter @opentournament/web test -- participant-experience.test.ts` passed 20 files / 102 tests before edits.
- **RED:** the new settings-contract module was absent and navigation expectations failed (2 failures).
- **GREEN:** focused web tests passed 21 files / 105 tests: projection, correction/hide payloads, independent flags, delete confirmation, unauthorized/error, no-success state, and navigation.
- **REFACTOR:** converged mutations by reloading owner GET settings after PUT; success follows that refresh only.

### Work Unit Evidence

- Focused tests and web typecheck passed; exact `pnpm test` and Next production build passed.
- Runtime wiring: `/profile` is dynamic and uses the shared JSON API client only; no FormData/upload path was added.
- Prettier check and `git diff --check` passed for source/test files.
- Rollback: revert this commit to remove the `/profile` route, owner controls, and navigation link without changing API/data.
- Protected state: `.gitignore`, `artifacts/a11y-audit/`, and all three stashes (including `e269057a0ab90f7efb533f5195e15d0ec3dfa96a`) remain untouched.
- Final owned diff: `394` changed lines, within the 400-line cap.

## Work Unit WU5d-delete-convergence-correction

**Status:** Corrective partial slice complete; tasks 5.1, 5.2, and 5.3 remain unchecked.

### Correction Scope

- Replaced profile revocation with an owner-scoped transaction that deletes the profile row, then retires its attached avatar media; no owner GET profile row or its PII remains after DELETE.
- Moved the live owner-settings workflow behind the shared JSON-client boundary. DELETE now requires a follow-up owner GET to reject with 404 before the UI clears private fields, reports deletion, or refreshes. An unexpected 200 clears the local projection and shows an error without success.
- Replaced component-adjacent pure helper tests with injected client workflow tests that exercise actual GET, PUT→GET, hide, failure, and DELETE→GET ordering used by `PublicProfileSettings`.

### TDD Cycle Evidence

- **RED:** the owner deletion integration assertion was added against the prior revoke implementation; its expected owner GET 404 was not satisfied while the profile row was only unpublished. The new web workflow test initially failed because `public-profile-workflow` did not exist.
- **GREEN:** `pnpm --filter @opentournament/web test -- public-profile-settings.test.tsx` passed 21 files / 106 tests. It covers owner GET form projection, PUT then authoritative GET ordering, independent visibility flags and hide payload, 401/validation propagation, plus DELETE followed by GET 404 versus unexpected GET 200.
- **PostgreSQL API proof:** fresh isolated PostgreSQL container `opentournament-wu5d-correction-pg` ran `returns owner settings and published Smash profile links without leaking private participants`: 1 passed / 11 skipped. It proves DELETE returns owner GET 404 and the former avatar becomes `retired` after profile removal. The original profile-publication target also passed (1 passed / 11 skipped) with the owner GET 404 assertion.
- **REFACTOR:** removed test-only exports from the component and retained the production workflow boundary used by the client component.

### Verification Evidence

- `pnpm --filter @opentournament/api typecheck` and `pnpm --filter @opentournament/web typecheck` passed.
- Exact workspace command `pnpm test` passed: 10 Turbo tasks; web 107 tests; API 63 passed / 14 integration-dependent skips; configuration 31 passed.
- `pnpm --filter @opentournament/web build` passed; Next.js 16.3.2 emitted dynamic `/profile` and `/players/[slug]` routes.
- Prettier was run and then `prettier --check` plus `git diff --check` passed on all correction files.

### Work Unit Evidence

- **Rollback boundary:** revert this correction commit to restore the previous WU5d profile revocation and client behavior; server changes are limited to `profile-media.ts` and its API integration coverage, while web changes are limited to the settings component/workflow/test.
- **Protected state:** `.gitignore` and `artifacts/a11y-audit/` remain unstaged and untouched; all three pre-existing stashes remain, including `e269057a0ab90f7efb533f5195e15d0ec3dfa96a`.
- **Container cleanup:** stopped `opentournament-wu5d-correction-pg` without removing its container or volumes.
- **Final owned diff:** recorded after commit; stays within the 400-line correction cap.
- **Final measured owned diff:** 358 changed lines (244 additions, 114 deletions) across six files, within the 400-line correction cap.

### Correction Follow-up Evidence

- The production workflow now requires the same explicit confirmation boolean used by the destructive button; its regression proves an unconfirmed attempt performs no DELETE call. Focused web workflow proof now passes 21 files / 107 tests.
- The final line-count and rerun verification evidence supersede the preliminary count above.

## Work Unit WU5d-concurrency-safe-delete-correction

**Status:** Code correction complete with an external PostgreSQL-runtime verification blocker; tasks 5.1, 5.2, and 5.3 remain unchecked.

### Correction Scope

- Bound profile deletion to the captured avatar version in the owner-scoped transaction, using `avatar_media_id = captured` or `IS NULL` as appropriate. A changed row yields no deletion and no retirement; a retry captures the replacement and retires only that replacement after deletion.
- Strengthened the existing avatar replacement/delete integration scenario to retain the replacement after the lost race, then prove owner and public profile 404 after the successful retry.
- Changed the live owner workflow to return explicit delete outcomes. Any rejected DELETE or non-404 verification error clears the form immediately, preserves the specific API message (including 401 signed-out state), and never announces success.

### TDD Cycle Evidence

- **RED:** `pnpm --filter @opentournament/web test -- public-profile-settings.test.tsx` failed 3 new assertions against the previous string outcomes and propagated DELETE/verification exceptions.
- **GREEN:** the same focused command passed 21 files / 108 tests after explicit failure outcomes were implemented. It covers unconfirmed deletion, DELETE rejection, GET 500 verification failure, GET 200 ambiguity, and GET 404 success ordering.
- **PostgreSQL regression:** the existing deterministic replacement/delete integration scenario now asserts replacement retention before the lost-race 404 and durable owner/public 404 after retry. Runtime execution was attempted through `pnpm test:integration` but Docker Desktop's Linux-engine pipe was unavailable (`npipe:////./pipe/dockerDesktopLinuxEngine`), so no PostgreSQL container was started and this evidence remains unverified in this attempt.
- **REFACTOR:** preserved the shared JSON client and bilingual component copy while moving destructive mutation failures into a typed production workflow result.

### Verification Evidence

- API and web typechecks passed.
- Exact `pnpm test` passed: web 108 tests; API 63 passed / 14 integration-dependent skips; configuration 31 passed.
- `pnpm --filter @opentournament/web build` passed; Next.js 16.3.2 emitted `/profile` as a dynamic route.
- Prettier/check and `git diff --check` are recorded before commit.

### Work Unit Evidence

- **Rollback boundary:** revert this correction commit to restore the prior delete predicate and client failure behavior; affected files are the profile-media service, avatar integration test, profile workflow/component test, and this appended evidence.
- **Protected state:** `.gitignore`, `artifacts/a11y-audit/`, and all three pre-existing stashes remain untouched.
- **Runtime blocker:** Docker daemon was unavailable; no containers or volumes were created, stopped, or removed by this attempt.
- **Final measured owned diff:** 132 changed lines (117 additions, 15 deletions) across six files, within the 400-line cap.

## Work Unit WU5d-profile-recreation-runtime-remediation

**Status:** Runtime remediation complete; tasks 5.1, 5.2, and 5.3 remain unchecked.

### Diagnosis and TDD Evidence

- **Observed response:** the focused PostgreSQL/MinIO regression returned `400` with `{ error: { code: 'PROFILE_SLUG_REQUIRED' } }`. The hard-delete and CAS paths were correct; the test attempted to create a new profile without its required stable slug.
- **RED:** refined the focused assertion to capture that response contract and retain the intended `200` expectation; the fresh PostgreSQL/MinIO run failed at the recreation PUT exactly as expected.
- **GREEN:** the recreation request now supplies the previously stable `profileSlug`, then asserts the returned stable slug/gamertag. The exact focused command passed from a fresh PostgreSQL database with MinIO: 1 passed / 11 skipped.
- **REFACTOR:** kept the production `PROFILE_SLUG_REQUIRED` guard unchanged. This preserves immutable stable slug semantics while allowing the authenticated owner to create a new profile after hard deletion by explicitly selecting the stable slug; the following owner update without a slug remains covered by the existing test.

### Verification Evidence

- `pnpm --filter @opentournament/api exec vitest run src/app.integration.test.ts --testNamePattern "publishes an initial profile avatar and serves it by opaque media ID"` passed against fresh `opentournament-wu5d-remed-pg-green` and MinIO containers.
- `pnpm --filter @opentournament/api typecheck` passed.
- Exact `pnpm test` passed: API 63 passed / 14 integration-dependent skips; web 108 tests; configuration 31 passed.
- Prettier check and `git diff --check` passed.

### Work Unit Evidence

- **Rollback boundary:** revert this evidence correction commit to restore the invalid slugless recreation fixture; production hard-delete, CAS, privacy, and client failure behavior are unchanged.
- **Protected state:** `.gitignore`, `artifacts/a11y-audit/`, and all three existing stashes remain untouched.
- **Container cleanup:** stopped `opentournament-wu5d-remed-pg`, `opentournament-wu5d-remed-pg-green`, and `opentournament-wu5d-remed-minio` without removing volumes.
- **Final measured owned diff:** 50 changed lines (40 additions, 10 deletions) across two files, within the 400-line cap.

## Work Unit 5e: Owner avatar management

**Status:** Partial Phase 5 slice complete; umbrella tasks 5.1–5.3 remain unchecked.

### TDD Cycle Evidence

| Slice                 | RED                                                                           | GREEN / triangulation                                                                                                                                                                                     | Refactor                                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Owner avatar controls | Focused workflow test failed first because `uploadOwnerAvatar` did not exist. | Focused Vitest passed 7/7 after multipart upload/clear wiring; its assertions cover FormData, authoritative reload after both mutations, same-origin owner avatar data, and errors via the shared client. | The shared client now recognizes `FormData` and does not attach JSON content type, preserving CSRF/session behavior for multipart without a parallel client. |

### Work Unit Evidence

| Evidence          | Result                                                                                                                                                                                                                                                                                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test      | `pnpm --filter @opentournament/web exec vitest run components/public-profile-settings.test.tsx` passed: 1 file, 7 tests.                                                                                                                                                                                             |
| Typecheck         | `pnpm --filter @opentournament/web typecheck` passed.                                                                                                                                                                                                                                                                |
| Workspace proof   | Exact `pnpm test` passed: 10 Turbo tasks; web passed 21 files and 109 tests; configuration checks passed 31 tests.                                                                                                                                                                                                   |
| Build             | `pnpm --filter @opentournament/web build` passed; Next.js emitted dynamic `/profile`.                                                                                                                                                                                                                                |
| Runtime harness   | N/A: this slice changes only the authenticated browser client boundary over pre-existing multipart/API routes. The focused production workflow asserts the actual `FormData` request body, routes, and authoritative reloads; Phase 6 owns browser E2E and the existing API/media runtime coverage remains separate. |
| Formatting/diff   | Prettier ran on each touched source/test file; `git diff --check` passed.                                                                                                                                                                                                                                            |
| Rollback boundary | Revert the avatar client control/workflow, FormData header guard, translations, focused test, and this evidence. Existing hard-delete, API media lifecycle, publication flags, and public profile pages remain unchanged.                                                                                            |

### Delivery and Protected State

- Branch: `codex/tournament-experience-v1-2-wu5e-avatar-management`, from `c19f23faac907658499b1b417751f3e4f3e64cd0`.
- Owned source/test diff before this evidence: 114 additions and 2 deletions; within the 400-line slice cap.
- `.gitignore`, `artifacts/a11y-audit/`, and all three existing stashes were preserved.
- Evidence content SHA-256: $sha256:6ab3a7eb2631eb65ba456a44ce0fb0fd67aff35c93189d3ee3adb46e3b0d5514.

## Gatekeeper Correction: WU5e owner avatar management

**Status:** Corrective rerun complete; tasks 5.1–5.3 remain unchecked.

### Corrected TDD Evidence

- **RED:** with the explicit production-client `same-origin` credential default temporarily removed, `pnpm --filter @opentournament/web exec vitest run lib/api.test.ts` failed 2/2 assertions because the multipart and JSON requests exposed `credentials: undefined`.
- **GREEN:** restoring the default and running `pnpm --filter @opentournament/web exec vitest run components/public-profile-settings.test.tsx lib/api.test.ts` passed 2 files / 11 tests. The direct `apiClient` fetch mock proves CSRF is included, multipart omits an explicit `Content-Type`, JSON retains `application/json`, and both use same-origin credentials.
- **Workflow failures:** focused upload and clear failure cases reject before their authoritative GET reloads. They make no local avatar projection or success result; the client component only announces success after those workflow promises resolve.
- **Accessible pending state:** the rendered `AvatarManagementControls` production presenter exposes a visible polite `role=status` upload message, relates it to the file input, disables mutations during upload, and renders only `/api/v1/media/:id` even when the DTO carries an external storage URL.
- **REFACTOR:** extracted the synchronous avatar controls presenter so Node Vitest can test the rendered accessibility/media boundary while the async settings page remains the production owner of state transitions.

### Corrected Verification and Delivery Evidence

- The earlier WU5e statement that its 7 workflow tests covered production-client transport and mutation-error UI behavior was incomplete; this correction adds focused transport/failure/pending assertions. Runtime harness remains N/A for this client-only slice: direct fetch transport is covered in-process, existing API/media runtime coverage is unchanged, and Phase 6 owns browser E2E.
- Final checks passed: focused 2 files/11 tests, web typecheck, exact `pnpm test` (10 Turbo tasks; web 22 files/113 tests; API 63 passed/14 skipped; configuration 31 tests), and Next.js 16.3.2 production build (dynamic `/profile`). Prettier write/check and `git diff --check` passed.
- Final owned diff: 400 changed lines across six implementation/test files plus cumulative evidence, at the 400-line cap.
- Fresh evidence revision: `sha256:1bcaff454f9b0ae5b92151a75575c6ff1b718e1e3ad2039c616f07d07d304462` (SHA-256 of the standalone final verification manifest, excluding this pointer).
- **Rollback boundary:** revert the final WU5e commit to remove the avatar controls, workflow, transport guard, tests, translations, and this correction evidence without affecting the existing hard-delete or API media lifecycle.
- **Protected state:** `.gitignore`, `artifacts/a11y-audit/`, and all three pre-existing stashes remain untouched.

## Work Unit WU5f-admin-appearance-palette

**Status:** Partial Phase 5 slice complete; tasks 5.1, 5.2, and 5.3 remain unchecked.

### TDD Cycle Evidence

- **RED:** `pnpm --filter @opentournament/web exec vitest run components/tournament-appearance-controls.test.tsx` failed 3 rendered-state tests because the production form presenter did not exist.
- **GREEN:** the same focused command passed 1 file / 6 tests after the live controls rendered the extracted presenter.
- **TRIANGULATION:** executable markup assertions cover invalid six-digit hex feedback, saving status with both color inputs and submit disabled, API error without success, authoritative PATCH response convergence before success, bilingual labels, and locally scoped CSS variables.
- **REFACTOR:** the interactive owner component retains loading, PATCH authorization, and state transitions; its rendered presenter isolates accessible form markup without changing API routes or page scope.

### Verification Evidence

- Focused: `pnpm --filter @opentournament/web exec vitest run components/tournament-appearance-controls.test.tsx` passed (1 file, 6 tests).
- Typechecks: `pnpm --filter @opentournament/api typecheck` and `pnpm --filter @opentournament/web typecheck` passed.
- Workspace: exact `pnpm test` passed (10 Turbo tasks; web 23 files / 119 tests; API 63 passed / 14 skipped; configuration 31 tests).
- Build: `pnpm --filter @opentournament/web build` passed with Next.js 16.3.2; `/tournaments/[id]` remains dynamic.
- Formatting and safety: Prettier normalization/check, control-byte/placeholder scan, and `git diff --check` are recorded after the final evidence manifest is generated.
- Verification manifest: `openspec/changes/tournament-experience-v1-2/wu5f-verification-manifest.txt` is canonical UTF-8/LF input of the exact outcomes and five relevant file digests; `sha256:0774ea5c4891e1f5dd1a94aa3e5d329cfa929af3adcef2d91af376d58b30c5c7` excludes this pointer.

### Work Unit Evidence

- Runtime harness: N/A. This is a client presentation seam over existing authorized GET/PATCH routes; executable rendered component tests and the production build cover the bounded UI behavior, while Phase 6 owns browser E2E.
- Rollback/protected state: revert the amended WU5f commit to remove palette controls, translations, appearance projection, manifest, and evidence; existing authorization, server validation, logo/banner media, overlays, and other Phase 5 controls remain unchanged. `.gitignore`, `artifacts/a11y-audit/`, and all three pre-existing stashes remain untouched.
- Final amended WU5f diff: 400 changed lines against `1c492fc78c010b8ea8c87f4984c8943df7ec12f5`, within the cap.

## Work Unit WU5g-admin-logo-banner-controls

**Status:** Partial Phase 5 slice complete; tasks 5.1, 5.2, and 5.3 remain unchecked.

### TDD Cycle Evidence

| RED                                                                                                     | GREEN                                                                                                                                           | REFACTOR                                                                                                                             |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| New production workflow/presenter tests first failed because `tournament-media-controls` did not exist. | `pnpm --filter @opentournament/web exec vitest run components/tournament-media-controls.test.tsx` passed 1 file / 5 tests after implementation. | Kept media state local to each slot, reusing the shared CSRF/session-aware JSON client and its browser-managed multipart boundaries. |

### Work Unit Evidence

- Both `logo` and `banner` use the existing authorized `POST`/`DELETE /tournaments/:id/appearance/:slot` routes, followed by authoritative `GET /tournaments/:id` convergence. The management read exposes only opaque `logoMediaId`/`bannerMediaId` values.
- Workflow/presenter coverage asserts multipart `FormData`, endpoint methods, reload ordering, independent slot state, bilingual labels, live/error feedback, pending-slot-only disabling, and `/api/v1/media/:id` previews while rejecting an external URL.
- API and web typechecks passed. Exact `pnpm test` passed: 10 Turbo tasks; web 24 files / 124 tests; API 63 passed / 14 integration-dependent skips; configuration 31 tests. Next.js 16.3.2 production build passed with dynamic `/tournaments/[id]`.
- Runtime harness: N/A. This slice is an authenticated browser client boundary over existing WU3d media routes; production component/workflow tests and build cover it proportionally, and Phase 6 owns browser E2E.
- Prettier normalization/check and `git diff --check` passed.
- **Verification manifest:** `openspec/changes/tournament-experience-v1-2/wu5g-verification-manifest.txt`; `sha256:84ffcb5c1fc2faba32b339a00a4c169d6671249acaf089888ab863be7a1fb808` is its standalone digest and excludes this pointer.
- **Rollback boundary:** revert this work-unit commit to remove tournament media controls, the additive opaque management projection, translations, test, manifest, and this evidence; existing palette, profile, overlay, and media API behavior remains intact.
- **Protected state:** `.gitignore`, `artifacts/a11y-audit/`, and all three pre-existing stashes remain untouched.
- **Final measured owned diff:** 400 changed lines against `e29d95a04aaca81f2744346e5836a5a7a2c32562`, at the work-unit cap.

## Work Unit WU5g2-cross-slot-concurrency-evidence-correction

**Status:** Maintainer-authorized successor correction; tasks 5.1–5.3 remain unchecked.

- **Split:** WU5g part 1 remains commit `a38452c` at its original 400-line boundary. This narrower successor is a separate commit on top; the combined change is not represented as one <=400-line work unit.
- **RED/GREEN/REFACTOR:** controlled overlapping logo/banner proof initially failed without a queue; focused `tournament-media-controls` passed 1 file / 6 tests after one shared mutation queue serialized POST/DELETE plus authoritative GET. All controls remain disabled until convergence, so no stale projection can overwrite a later operation.
- **Both slots:** workflow coverage executes logo and banner multipart endpoints, authoritative reloads, API failure/no success, bilingual/safe preview accessibility, and the overlap rejection.
- **Verification:** API/web typechecks, exact `pnpm test` (web 24 files / 125 tests; API 63 passed / 14 skipped), Next 16.3.2 build, Prettier, and `git diff --check` passed. Runtime is N/A: existing routes are unchanged and Phase 6 owns browser E2E.
- **Canonical correction manifest:** `wu5g2-verification-manifest.txt`; `sha256:14158227b75cf974e1d4ee0b5d1be7dd318774c403162fee8d1cf2340cc4de2e` is reproducible, covers listed source digests, excludes itself, and is the native evidence revision.
- **Rollback/protected state:** revert this successor commit to restore the part-1 behavior; `.gitignore`, `artifacts/a11y-audit/`, and all three stashes are untouched.

## Work Unit WU5g3-true-queue-production-overlap-correction

**Status:** Maintainer-authorized successor correction; tasks 5.1–5.3 remain unchecked.

- **Supersedes WU5g2:** WU5g2 rejected the second queued request. WU5g3 uses a true promise tail: every logo/banner request runs in FIFO order through mutation, authoritative GET, and state application; controls stay disabled until the queue drains.
- **RED/GREEN:** a production-workflow overlap test failed when the banner request resolved `null`; it now proves `logo POST -> logo GET -> banner POST -> banner GET` and final `{ logoMediaId: 'logo', bannerMediaId: 'banner' }` state.
- **Verification:** focused 1 file / 6 tests, API/web typechecks, exact `pnpm test`, Next build, Prettier, and diff check passed; runtime N/A because Phase 6 owns browser E2E.
- **Manifest:** `wu5g3-verification-manifest.txt`, `sha256:1852a78d733209440a4b06fc3e0975a79b3e07ead02feec29eac60cde5acfa06`; standalone, LF/UTF-8, excludes itself, and is the native evidence revision. Rollback is this successor commit; protected state remains untouched.

## Work Unit WU5g4-semantic-queue-state-proof

**Status:** Semantic test/evidence correction; tasks 5.1–5.3 remain unchecked. Gate baseline showed the former banner assertion could pass from attribute order. The presenter proof now finds each input/button tag and verifies all four controls are disabled while busy. Queue workflow tests retain successful logo→GET→banner→GET ordering and add failure continuation: a failed logo does not poison the banner mutation→GET path. Focused 1 file / 7 tests, typechecks, exact `pnpm test`, build, Prettier, and diff check passed. Next bounded Phase 5 slice: WU5h. Manifest `wu5g4-verification-manifest.txt` sha256:99733a5921f13bdfa362e95eafe8bbc165b014c881a5d6debf0dfe759b70f936; rollback this test/evidence commit; protected state untouched.

## Work Unit WU5g5-production-media-controller-proof

**Status:** Maintainer-authorized successor correction complete; tasks 5.1–5.3 remain unchecked.

### TDD Cycle Evidence

- **RED:** `pnpm --filter @opentournament/web exec vitest run components/tournament-media-controls.test.tsx` failed on parent `9b32c096` because `createTournamentMediaController` was unavailable and the exact remove controls had no stable IDs for semantic disabled assertions.
- **GREEN:** the focused command passed 1 file / 8 tests. The live component now consumes the tested controller, which owns the FIFO queue, pending count, request → authoritative GET → state application, and errors.
- **REFACTOR:** controller state is observable through one production seam and subscribed by `TournamentMediaControls`; no parallel test-only queue or UI workflow was added.

### Work Unit Evidence

- Controlled success proves `logo POST → logo GET → banner POST → banner GET`, the first completed operation leaves `busy` true while the second awaits, and the final authoritative state is `{ logoMediaId: 'logo', bannerMediaId: 'banner' }` with `busy: false`.
- Controlled failure proves a failed first mutation is caught without an unhandled rejection; the queued banner mutation still performs POST → GET, applies its authoritative projection, and drains `busy`.
- The presenter test resolves the exact `logo-file`, `banner-file`, `logo-remove`, and `banner-remove` native tags and requires their boolean `disabled` token while rejecting `aria-disabled`/`data-disabled` substitutes and attribute-order artifacts.
- Passed: focused media test (1 file / 8 tests); API and web typechecks; exact `pnpm test` (10 Turbo tasks; web 24 files / 127 tests; API 63 passed / 14 skipped; configuration 31 tests); Next.js 16.3.2 production build; source Prettier write/check.
- Runtime harness: N/A. The correction refactors the existing authenticated client workflow without changing routes; controller tests execute the actual production workflow and Phase 6 owns browser E2E.
- **Rollback boundary:** revert the WU5g5 successor commit to restore the prior component-local controller state while retaining all WU5g1–WU5g4 changes.
- **Protected state:** `.gitignore`, `artifacts/a11y-audit/`, and all three existing stashes remain untouched.
- **Verification manifest:** `wu5g5-verification-manifest.txt`, `sha256:45b8f9f177fea85b01bd1de108ae1b1079b9af2bbfc96621c50ee50650d26d35`; standalone UTF-8/LF, excludes self-reference, and lists reproducible source digests.
- **Next:** WU5h is eligible only after this commit's final Prettier, control-byte/placeholder, and diff checks pass.

## Work Unit WU5h-public-obs-overlay-views

**Status:** Complete. The accumulated Phase 5 acceptance is satisfied; tasks 5.1, 5.2, and 5.3 are checked in `tasks.md`.

### TDD Cycle Evidence

- **RED:** the focused OBS overlay test first failed because neither the production presenter nor the route layout existed. A second focused RED established the required route-level document chrome/no-scroll contract before its layout was added.
- **GREEN:** `pnpm --filter @opentournament/web exec vitest run components/public-obs-overlay.test.tsx components/overlay-live.test.tsx` passed 2 files / 9 tests. It proves exactly `scoreboard`, `up-next`, and `champion`; a 1920×1080 transparent overflow-hidden canvas; safe same-origin opaque logo media; named match/champion projections; route chrome removal; and the existing SSE authoritative-refresh controller.
- **REFACTOR:** the public client presenter delegates all bootstrap, coalescing, stale-response rejection, 404 shutdown, and SSE invalidation handling to the existing `OverlayLive` contract. It adds no parallel read model or realtime transport.

### Work Unit Evidence

- `/t/[slug]/overlay/[view]` rejects any view outside `scoreboard`, `up-next`, and `champion` through `notFound()`. Public visibility stays API-authoritative: a private/unlisted/not-found overlay snapshot causes `OverlayLive` to clear state and close its EventSource.
- The route layout makes the OBS document transparent, hides normal application chrome, and prevents document/main overflow before client hydration. The canvas remains fixed at 1920×1080 and only derives media from a validated opaque ID as `/api/v1/media/:id`.
- **Phase 5 completion assessment:** WU5a–WU5g5 collectively provide the required public branding, profile privacy/links, owner correction/hide/delete/avatar controls, appearance palette/logo/banner controls, and their focused RED/GREEN coverage. This WU5h completes the remaining canvas/views requirement, so 5.1–5.3 are now checked; Phase 6 browser/OBS acceptance and deployment documentation remain pending.
- Passed: focused overlay tests, API/web typechecks, exact `pnpm test` (10 Turbo tasks; web 25 files / 131 tests; API 63 passed / 14 skipped; configuration 31 tests), Next.js 16.3.2 production build, Prettier, and `git diff --check`.
- Runtime harness: static server render validates the route's canvas and document CSS contract. Browser/OBS smoke and Playwright are intentionally deferred to Phase 6.
- **Rollback boundary:** revert this WU5h child commit to remove the OBS route, transparent document layout, overlay presenter/tests, task completion update, manifest, and this evidence without altering the API overlay contract.
- **Protected state:** `.gitignore`, `artifacts/a11y-audit/`, and all three existing stashes remain untouched; no Docker process or volume was used.
- **Verification manifest:** `wu5h-verification-manifest.txt`, `sha256:5645619f5f969d8e487bda6c9bb9c5cfbf3ef5ed5ad7fb01c9cb798960716a6c`; standalone UTF-8/LF, excludes self-reference, and lists reproducible source digests.

## Work Unit WU5h-pre-hydration-canvas-correction

**Status:** Corrective successor complete. Tasks 5.1–5.3 remain checked.

### TDD Cycle Evidence

- **RED:** actual page/layout SSR for a valid `scoreboard` route produced only the document style wrapper because `OverlayLive` correctly has no snapshot before hydration. The focused production route test failed because no `data-overlay-view` canvas shell existed.
- **GREEN:** `PublicObsOverlay` now renders one fixed transparent 1920×1080 shell before delegating live content to `OverlayLive`. The focused overlay/live suite passed 2 files / 11 tests, including the actual page + layout composition and invalid-route boundary.
- **REFACTOR:** `OverlayCanvasShell` owns the stable document canvas; `OverlayLive` still solely owns bootstrap fetch, SSE invalidation, coalescing, stale rejection, 404 closure, and snapshot content. No duplicate live state machine was introduced.

### Work Unit Evidence

- The prior WU5h isolated-canvas proof is superseded. The route-level SSR test renders `PublicObsOverlayPage` nested in `PublicObsOverlayLayout`, verifies the shell before hydration, verifies no fetched tournament content is invented, and retains deterministic valid/invalid view handling.
- Valid public snapshots continue to render named scoreboard, up-next, and champion content only inside that shell. The UUID-only logo projection remains `/api/v1/media/:id`; arbitrary storage URLs never render.
- Passed: focused production overlay/live tests; API and web typechecks; exact `pnpm test` (10 Turbo tasks; web 25 files / 133 tests; API 63 passed / 14 skipped; configuration 31 tests); Next.js 16.3.2 build with dynamic `/t/[slug]/overlay/[view]`; Prettier and `git diff --check`.
- Runtime harness: server render is applicable and executed. Browser/OBS E2E and smoke remain Phase 6, with no Docker started.
- **Rollback boundary:** revert this correction commit to remove the pre-hydration shell and direct route-test seam while retaining the original WU5h live overlay implementation.
- **Protected state:** `.gitignore`, `artifacts/a11y-audit/`, and all three pre-existing stashes remain untouched.
- **Verification manifest:** `wu5h-correction-verification-manifest.txt`, `sha256:7127a3941f7480d6ad574559e9c9b036ea0bd1156c241b01d76d6c4a05d25c6c`; standalone UTF-8/LF, excludes self-reference, and lists reproducible source digests.

## Work Unit WU6a1-e2e-runtime-branding-media

**Status:** Complete bounded successor. Task 6.1 remains unchecked because WU6a2 must cover overlay convergence and reconnect; tasks 6.2–6.3 remain unchecked.

### TDD Cycle Evidence

- **RED:** the inherited WU6a focused Playwright listing found no `tournament-experience.spec.ts`; after adding the real scenario, direct `pnpm exec playwright test tests/e2e/tournament-experience.spec.ts --project=chromium` failed before execution because its default shared PostgreSQL connection returned `28P01`. This demonstrated the missing isolated runtime fixture rather than a product assertion failure.
- **GREEN:** `node scripts/test-e2e-runtime.mjs` created isolated loopback PostgreSQL and MinIO containers, passed 1 Chromium scenario, and stopped both containers. The scenario performs real browser, web-proxy, API, PostgreSQL, and S3-compatible paths.
- **REFACTOR:** Playwright config forwards only the isolated S3 endpoint and credentials to the API process; the runtime script owns random container names, ephemeral loopback ports, readiness, and cleanup without altering product behavior.

### Work Unit Evidence

- The E2E scenario creates isolated users, organization, and public tournament; persists branding/logo; verifies public logo/color, non-admin denial, and media headers; then renders a published avatar profile and confirms unpublishing makes its player and media routes 404.
- Passed: focused runtime E2E (1 Chromium test), API/web typechecks, exact `pnpm test` (10 workspace tasks; web 25 files / 133 tests; API 63 passed / 14 skipped; configuration 31 tests), and Next.js 16.3.2 production build. Prettier/check and `git diff --check` are recorded after final evidence normalization.
- **Runtime cleanup:** no user service, named volume, or Docker volume was deleted; `docker ps` was empty after the focused run. The script only stops its randomly named temporary containers.
- **Rollback boundary:** revert the WU6a1 commit to remove the E2E runtime harness, configuration forwarding, test, manifest, and this evidence while retaining WU5h.
- **Protected state:** `.gitignore`, `artifacts/a11y-audit/`, and all three stashes remain untouched.
- **Original manifest superseded:** WU6a1 correction relocates and replaces the root manifest with the canonical OpenSpec manifest below.

## Work Unit WU6a1-publication-cleanup-provenance-correction

**Status:** Corrective successor complete. Task 6.1 remains unchecked pending WU6a2; tasks 6.2–6.3 remain unchecked.

### TDD Cycle Evidence

- **RED:** a focused acceptance scan failed on `852e128` because canonical-manifest provenance, `--pull=never`, local pinned-image preflight, cleanup-result propagation, and the new draft/byte/browser assertions were absent.
- **GREEN:** the isolated Chromium run passed after adding draft API/route/media 404 assertions, exact media bytes/length verification, and browser-route 404 after revocation.
- **REFACTOR:** the harness owns immutable image verification, random loopback services, awaited cleanup, and before/after named-volume inventory equality; temporary `--rm` containers use no mounted volume.

### Work Unit Evidence

- Before publication the E2E test verifies public tournament API, real `/t/:slug`, and opaque logo media return 404. After publication it verifies immutable/nosniff headers, exact Content-Length, and Sharp-normalized PNG bytes.
- After unpublication it revisits `/players/:slug` in the browser and verifies 404/not-found UI as well as public player/media API 404 responses.
- PostgreSQL and MinIO are pinned to locally verified immutable digests and launched with `--pull=never`; a missing local image produces an actionable prerequisite error without network fetch.
- Cleanup awaits and propagates `docker stop` outcomes. The harness records before/after named-volume inventory equality (13 entries in this run), while `--rm` may remove only anonymous temporary container storage.
- Passed: focused runtime E2E, API/web typechecks, exact `pnpm test`, Next production build, Prettier/check, digest/control scan, and diff check.
- **Rollback boundary:** revert this correction commit to restore the prior WU6a1 runtime/test behavior and root-manifest location.
- **Protected state:** `.gitignore`, `artifacts/a11y-audit/`, and all three stashes remain untouched.
- **Canonical verification manifest:** `openspec/changes/tournament-experience-v1-2/wu6a1-publication-cleanup-verification-manifest.txt`, `sha256:25b565f08c1fe01e95a01a78a2815d6cac4f268cd24b8c238990fc47d63fb5ab`; standalone UTF-8/LF and self-excluding.

## Work Unit WU6a2-overlay-convergence-reconnect-e2e

**Status:** Complete. WU6a1 plus this real-browser overlay slice satisfy task 6.1, which is now checked; tasks 6.2–6.3 remain unchecked.

### TDD Cycle Evidence

- **RED:** `pnpm exec playwright test tests/e2e/tournament-experience.spec.ts --list --grep "public OBS overlay"` found no overlay scenario. The new Chromium scenario then failed against the parent because appearance-media mutation did not emit a public overlay invalidation and the rendered logo stayed stale.
- **GREEN:** `node scripts/test-e2e-runtime.mjs` passed both isolated Chromium scenarios after tournament media routes emit the existing tournament event, the real live controller binds browser fetch correctly, and online reconnection requests an authoritative refresh.
- **REFACTOR:** valid overlay views moved to a server-safe shared module; the client presenter re-exports the existing contract. The WU6a2 correction changed its import to the relative style supported by this Vitest boundary after the first workspace-suite run exposed the unresolved alias.

### Work Unit Evidence

- Chromium executes the public `scoreboard`, `up-next`, and `champion` routes, confirms the fixed transparent 1920×1080 no-scroll canvas, validates same-origin opaque logo media, and verifies reload bootstrap.
- Sequential logo replacement proves SSE invalidation/refetch convergence to the latest authoritative media ID. Existing `OverlayLiveController` tests retain executable coalescing and stale-response protection.
- A browser offline/online transition while an owner mutation occurs refreshes the rendered public overlay to the authoritative replacement ID; no private endpoint or storage URL is used.
- Passed: focused overlay tests (2 files / 11 tests); API and web typechecks; exact `pnpm test` (10 workspace tasks; web 25 files / 133 tests; API 63 passed / 14 skipped; configuration 31 tests); isolated runtime (2 Chromium scenarios); Next.js 16.3.2 production build; Prettier check; and `git diff --check`.
- **Runtime cleanup:** WU6a1's reused harness starts only randomly named `--rm` loopback containers from local immutable images with `--pull=never`, awaits `docker stop`, and confirms named-volume inventory equality. No named/user volume was mounted or deleted.
- **Rollback boundary:** revert this WU6a2 commit to remove the browser overlay scenario, media invalidation emission, reconnect refresh, and server-safe view module while retaining WU6a1 branding/media E2E coverage.
- **Protected state:** `.gitignore`, `artifacts/a11y-audit/`, and all three stashes remain untouched.
- **Verification manifest:** `wu6a2-overlay-convergence-reconnect-verification-manifest.txt`, `sha256:2625ab8a9abafed70e6f7f8091e5fe8d44322e8044c4b07ad0737b0de053e6b5`; standalone UTF-8/LF and self-excluding.
- **Next:** WU6b (task 6.2 deployment documentation) is the next bounded Phase 6 slice.
