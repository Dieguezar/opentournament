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
| Rollback boundary | Revert the snapshot transaction/no-store policy, compatible event lookup and dual public event delivery, realtime cleanup observability, adjudicated dispute-score persistence, finalized-match scoreboard fallback, focused integration assertions, and this correction evidence. Legacy named events and WU4.3 web scope remain otherwise untouched.                                                                               |

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

| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4.3 | `apps/web/components/overlay-live.test.tsx` | Client-state unit | N/A (new component/test boundary) | `pnpm --filter @opentournament/web exec vitest run components/overlay-live.test.tsx` exited 1 because `./overlay-live` did not exist. | Same focused command passed 3/3 after the minimum controller/component implementation. | Coalesced burst/reconnect, superseded stale response with abort, and 404 private/unavailable paths exercise distinct state transitions. | Removed the throwing network-error path so EventSource reconnect/open is the retry mechanism; focused test and typecheck remained green. |

### Work Unit Evidence

| Evidence | Result |
| --- | --- |
| Focused test command | `pnpm --filter @opentournament/web exec vitest run components/overlay-live.test.tsx` passed 1 file and 3 tests. |
| Web typecheck | `pnpm --filter @opentournament/web typecheck` passed. |
| Workspace proof | Exact `pnpm test` passed 10 Turbo tasks; web passed 17 files/93 tests and configuration checks passed 31/31. |
| Runtime harness | N/A: this isolated client state machine uses mocked `fetch`, `EventSource`, and `AbortController`; Phase 6 explicitly owns browser/OBS E2E smoke coverage. The controller tests cover requests, reconnect invalidations, aborts, listener cleanup, and 404 stream closure without launching unrelated services. |
| Formatting/diff | `pnpm exec prettier --check apps/web/components/overlay-live.tsx apps/web/components/overlay-live.test.tsx` and `git diff --check` passed. |
| Rollback boundary | Revert `apps/web/components/overlay-live.tsx`, `apps/web/components/overlay-live.test.tsx`, task 4.3, and this evidence. API routes/SSE, overlay pages, and public UI remain untouched. |

### Workload / Delivery Boundary

- Delivery strategy: `auto-chain`; chain strategy: `feature-branch-chain`.
- Current slice: `wu4b-overlay-live-client`, based exactly on `39ea4d1f4b20db7940ceaf2268c50b2df800f35e`.
- The slice contains only the reusable web client convergence state machine, its tests, and OpenSpec evidence; exact authored line count is recorded with the commit.

### Remaining Tasks

Tasks 5.1 through 6.3 remain pending. Phase 5 owns rendering the three transparent overlay pages around this shared live client.
