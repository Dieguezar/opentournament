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
