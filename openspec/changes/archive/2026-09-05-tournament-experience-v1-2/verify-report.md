```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:0ba85ec50b989f0b1848db70c3a3679f1e0aa7cc0a3a428bf1c77c6d314058f7
verdict: pass
blockers: 0
critical_findings: 0
requirements: 12/12
scenarios: 24/24
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:3f38f0494b0139729a069aaf4cc5d443750041c2de8cb8616496e03adea63cd7
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:bccab9415f1e2b5f3976d0b3b88adc1d200c011222b5f81a1df40cadcbf8abd4
```

## Verification Report

**Change**: tournament-experience-v1-2
**Version**: v1.2
**Mode**: Strict TDD
**Candidate HEAD**: `c11606aa61160b13810d890110c7899a0f6f08ca`

### Completeness

| Metric | Value |
|---|---:|
| Tasks total | 19 |
| Tasks complete | 19 |
| Tasks incomplete | 0 |
| Requirements | 12/12 |
| Scenarios | 24/24 |

### Build & Tests Execution

**Build**: ✅ Passed

```text
pnpm build
exit: 0
output SHA-256: bccab9415f1e2b5f3976d0b3b88adc1d200c011222b5f81a1df40cadcbf8abd4
2/2 build tasks passed; Next.js 16.3.2 compiled the web application and emitted the dynamic public profile, tournament, and overlay routes.
```

**Tests**: ✅ 328 passed, 14 skipped

```text
pnpm test
exit: 0
output SHA-256: 3f38f0494b0139729a069aaf4cc5d443750041c2de8cb8616496e03adea63cd7
10/10 Turbo test tasks succeeded; 297 package tests and 31 configuration tests passed. The 14 conditional skips are 13 PostgreSQL integration cases and one MinIO harness case.
```

The exact workspace run replayed source-keyed local Turbo cache entries. Scenario compliance therefore also uses the retained focused PostgreSQL/MinIO, isolated Chromium, and OBS/CEF executions whose current source identity was checked. WU6a2 manifest SHA-256 is `5d40e96c37a4752a70126556718134b53b381f71c9c6fb65cfa55bed25bd4a6d`. All listed WU6a2 source SHA-256 values still match HEAD except `apps/web/components/overlay-live.tsx`, whose corrective successor is covered by the current 6-test suite and the WU6c OBS/CEF manifest. WU6c manifest SHA-256 is `52bbb346477e11190905f0b0d85d0c2ac9d948fae04abe055046a41142736937`; every listed Git blob matches HEAD. The retained reconnect evidence SHA-256 is `2363b898f0c34d254824f20660d0a26ae2e32b30a00bbd3272a170f90cd461c8`.

**Coverage**: ➖ Skipped — no installed Vitest coverage provider was available.

### Spec Compliance Matrix

| Requirement | Scenario | Passing runtime evidence | Result |
|---|---|---|---|
| Authorized validated media publication | Valid logo upload | `tests/e2e/tournament-experience.spec.ts` > branded public media; retained WU6a2 Chromium run | ✅ COMPLIANT |
| Authorized validated media publication | Invalid media upload | `apps/api/src/services/public-media.test.ts` > decode/limit rejection; retained avatar integration SVG rejection | ✅ COMPLIANT |
| Private ID-addressed same-origin retrieval | Published media retrieval | retained WU6a2 Chromium branded-media case verifies opaque same-origin ID, exact bytes, and 200 | ✅ COMPLIANT |
| Private ID-addressed same-origin retrieval | Withdrawn media retrieval | retained WU6a2 Chromium profile revocation and draft tournament checks return 404 | ✅ COMPLIANT |
| Safe cacheable media response | Versioned media cache policy | retained WU6a2 Chromium case verifies immutable cache, MIME, length, ETag, and nosniff | ✅ COMPLIANT |
| Media lifecycle cleanup | Replacement cleanup | retained tournament/profile lifecycle integration proves new reference before prior retirement; Chromium proves latest ID convergence | ✅ COMPLIANT |
| Media lifecycle cleanup | Failed publication cleanup | `apps/api/src/app.integration.test.ts` > staged MinIO avatar failure; retained focused PostgreSQL/MinIO execution | ✅ COMPLIANT |
| Media lifecycle cleanup | Ownership removal cleanup | retained profile lifecycle integration proves deleted DB state and absent private object after owner deletion | ✅ COMPLIANT |
| Exact transparent broadcast views | Scoreboard bootstrap | `public-obs-overlay.test.tsx`, retained WU6a2 Chromium, and retained WU6c OBS/CEF bootstrap | ✅ COMPLIANT |
| Exact transparent broadcast views | Up Next and Champion dimensions | retained WU6a2 Chromium three-view loop and WU6c OBS/CEF screenshots at 1920×1080 | ✅ COMPLIANT |
| Exact transparent broadcast views | Non-public overlay request | retained `overlays.integration.test.ts` private/unlisted 404 coverage and current 404 controller test | ✅ COMPLIANT |
| Deterministic automatic match selection | Active match has precedence | `overlay-presentation.test.ts` > active scoreboard and ready Up Next; current suite passed | ✅ COMPLIANT |
| Deterministic automatic match selection | Stable ready-match selection | `overlay-presentation.test.ts` > schedule, bracket, round, position, and stable-ID ordering; current suite passed | ✅ COMPLIANT |
| Invalidation-safe live state | SSE reconnection | current `overlay-live.test.tsx` explicit EventSource replacement plus retained same-port OBS/CEF reopen and authoritative refresh | ✅ COMPLIANT |
| Invalidation-safe live state | Out-of-order refreshes | current `overlay-live.test.tsx` stale-response and route-supersession cases | ✅ COMPLIANT |
| Explicit profile publication and revocation | Account owner publishes a profile | retained profile integration and WU6a2 Chromium public player page | ✅ COMPLIANT |
| Explicit profile publication and revocation | Account owner revokes publication | retained WU6a2 Chromium API/media/page 404 assertions | ✅ COMPLIANT |
| Finite independent public fields | Default optional-field privacy | retained `app.integration.test.ts` exact public DTO omission; current profile presenter tests | ✅ COMPLIANT |
| Finite independent public fields | Independently enabled fields | retained biography-only integration response omits avatar and real name | ✅ COMPLIANT |
| Unlinked participant identity | Unlinked participant | retained linked/unlinked Smash integration and current registration/profile presenter tests | ✅ COMPLIANT |
| Organizer-managed appearance | Administrator publishes branding | retained appearance integration and WU6a2 Chromium branding render | ✅ COMPLIANT |
| Organizer-managed appearance | Unauthorized appearance update | retained API integration and Chromium outsider 403 | ✅ COMPLIANT |
| Visibility-safe public appearance | Public tournament appearance | retained Chromium public tournament logo/color assertions | ✅ COMPLIANT |
| Visibility-safe public appearance | Non-public tournament appearance | retained draft/private/unlisted 404 integration and Chromium checks | ✅ COMPLIANT |

**Compliance summary**: 24/24 scenarios compliant.

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|---|---|---|
| Authorized validated media publication | ✅ Implemented | Sharp decoding/re-encoding, bounded raster validation, owner/admin authorization, and detected MIME publication are present. |
| Private ID-addressed same-origin retrieval | ✅ Implemented | Public routes accept opaque UUIDs and re-check active references plus owner visibility. |
| Safe cacheable media response | ✅ Implemented | Successful responses set immutable cache, validated type/length, ETag, and nosniff. |
| Media lifecycle cleanup | ✅ Implemented | CAS swaps publish first; retirement and retry worker paths remove prior or failed objects. |
| Exact transparent broadcast views | ✅ Implemented | The route accepts exactly three views and renders a fixed transparent 1920×1080 overflow-hidden shell. |
| Deterministic automatic match selection | ✅ Implemented | The server read model applies active precedence and deterministic schedule/bracket/round/position/ID ordering. |
| Invalidation-safe live state | ✅ Implemented | SSE is invalidation-only; controller coalesces refreshes, rejects stale responses, and explicitly replaces errored sources. |
| Explicit profile publication and revocation | ✅ Implemented | Stable slug and gamertag updates remain owner-scoped; publication can be disabled or the profile deleted without changing participant labels. |
| Finite independent public fields | ✅ Implemented | Public projection includes only slug/gamertag and independently opted-in avatar, real name, or biography. |
| Unlinked participant identity | ✅ Implemented | Only published captain profiles linked through the Smash team relationship receive public profile data. |
| Organizer-managed appearance | ✅ Implemented | Tournament-admin patch/upload routes validate colors and slot ownership. |
| Visibility-safe public appearance | ✅ Implemented | Public tournament, overlay, and media reads enforce visibility and publication gates. |

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Dedicated appearance/profile/media tables | ✅ Yes | Additive Drizzle schema with one-to-one appearance/profile ownership and media XOR constraint. |
| Narrow server-side presentation read model | ✅ Yes | `buildTournamentPresentation` remains the authoritative DTO projection. |
| Deterministic server-side match choice | ✅ Yes | Comparator follows scheduled time, bracket, round, position, and ID ordering. |
| Private object storage with same-origin proxy | ✅ Yes | Browser-visible values are opaque `/api/v1/media/:id` paths. |
| SSE invalidation with authoritative refetch | ✅ Yes | No event payload is treated as state; open/invalidation/replacement trigger refetch. |
| Single-instance V1 boundary | ✅ Yes | Realtime remains process-local and deployment documentation states the limitation. |

### TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD evidence reported | ✅ | Full `apply-progress.md` contains cumulative RED/GREEN/REFACTOR evidence for every work unit and explicit proportional treatment for documentation/runtime-only work. |
| All tasks have evidence | ✅ | 19/19 task entries have executable tests or an explicitly applicable structural/runtime proof. |
| RED confirmed | ✅ | All 18 change-related test files exist; recorded RED failures identify missing behavior or a proven regression rather than fabricated failures. |
| GREEN confirmed | ✅ | 120 change-related cases passed in the current workspace command; conditional integration/E2E cases have retained passing runtime evidence bound to current source identity. |
| Triangulation adequate | ✅ | 24/24 scenarios map to distinct positive, negative, privacy, ordering, concurrency, or reconnect behaviors. |
| Safety net | ✅ | Modified-behavior work units record a prior suite/focused baseline; new-only, documentation-only, and runtime-only slices explicitly state why a synthetic baseline is inapplicable. |

**TDD Compliance**: 6/6 checks passed.

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|---|---:|---:|---|
| Unit | 79 | 7 | Vitest |
| Integration | 55 | 10 | Vitest, Fastify inject, React renderer, PostgreSQL/MinIO when enabled |
| E2E | 2 | 1 | Playwright Chromium |
| **Total** | **136** | **18** | |

### Changed File Coverage

Coverage analysis skipped — no installed coverage provider was detected.

### Assertion Quality

All 18 change-related test files were scanned for tautologies, orphan empty checks, type-only-only assertions, ghost loops, smoke-only assertions, and mock-heavy tests. Fixed-list loops have non-empty deterministic inputs, and structural assertions are paired with behavioral/value assertions.

**Assertion quality**: ✅ All change-related assertions verify real behavior.

### Quality Metrics

**Linter**: ❌ `pnpm lint` exited 1; output SHA-256 `81e6324241d03f5e30edd4702beb7f1ff451e0600a3ab11f0472e538344c4949`.

- `apps/api/src/services/profile-media.ts:4:10`: unused `deletePrivateObject` import.
- `apps/api/src/services/tournament-media.ts:7:8`: unused `Db` type import.

**Type Checker**: ❌ `pnpm typecheck` exited 2; output SHA-256 `716d590eeb790c88a0b5b48600a20c8b1a04016554c55b45702c722cc3ea8d6a`.

- `packages/database/src/schema.test.ts:26:63`: TS18048, `chunk` is possibly `undefined`.
- `packages/database/src/schema.test.ts:30:37`: TS18048, `chunk` is possibly `undefined`.

These quality findings are WARNING-level under the Strict TDD verification contract: the current behavioral suite and production build pass, and the errors do not contradict a specification scenario. They should be remediated before ordinary delivery.

### Issues Found

**CRITICAL**: None.

**WARNING**:

1. Root typecheck fails with two TS18048 errors in the new schema contract test.
2. Root lint fails with two unused-import errors in media service files.

**SUGGESTION**: None.

### Primary Failure Evidence

1. **Primary failure:** `pnpm typecheck` completed with exit code 2; bounded evidence is the two TS18048 diagnostics above. **Verification consequence:** quality verification did not fully pass, but specification/runtime verification remains passing with warnings.
2. **Primary failure:** `pnpm lint` completed with exit code 1; bounded evidence is the two unused-import diagnostics above. **Verification consequence:** quality verification did not fully pass, but specification/runtime verification remains passing with warnings.

### Verdict

PASS WITH WARNINGS

All 12 requirements and 24 scenarios have passing current or source-bound retained runtime evidence, all 19 tasks are complete, the exact test command and production build pass, and no critical finding exists. Typecheck and lint failures remain non-blocking verification warnings but should be corrected before delivery.