# Tasks: Tournament Experience v1.2

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 2,000–2,600 |
| Delivery strategy | ask-on-risk |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Schema/contracts | 1 | `pnpm test:unit` | `pnpm db:migrate` | migration/contracts |
| 2 | Profile/appearance API | 2 | `pnpm --filter @opentournament/api test` | owner/admin flow | routes |
| 3 | Private media | 3 | `pnpm --filter @opentournament/api test` | MinIO lifecycle | proxy |
| 4 | Overlay/SSE | 4 | `pnpm --filter @opentournament/api test` | result refresh | live state |
| 5 | Web surfaces | 5 | `pnpm --filter @opentournament/web test` | browser flow | pages |
| 6 | Acceptance/docs | 6 | `pnpm test:integration` + `pnpm test:e2e` | OBS smoke | E2E/docs |

## Phase 1: Foundation

- [x] 1.1 **RED**: Test appearance, profile opt-ins/private DTO, media XOR, colors, and ordering in `packages/database/src/schema.test.ts`, `packages/shared-types/src/index.test.ts`, and `packages/validation/src/index.test.ts`.
- [x] 1.2 **GREEN**: Add schema/migration in `packages/database/src/schema.ts` and `packages/database/migrations/`; add DTO/validation in `packages/shared-types/src/index.ts` and `packages/validation/src/index.ts`.
- [x] 1.3 **REFACTOR**: Run database commands/tests; retain legacy URLs without backfill.

## Phase 2: Profiles/Appearance

- [x] 2.1 **RED**: Test `apps/api/src/app.integration.test.ts` for publication, opt-ins, stable IDs, unlinked Smash labels, branding, and denial.
- [x] 2.2 **GREEN**: Add owner profile route in `apps/api/src/routes/profiles.ts` and `apps/api/src/app.ts`; omit private/unpublished data.
- [x] 2.3 **GREEN**: Add admin appearance patch in `apps/api/src/routes/tournaments.ts` and `apps/api/src/services/permissions.ts`.
- [x] 2.4 **REFACTOR**: Refactor guards; rerun integration tests.

## Phase 3: Media Lifecycle

- [x] 3.1 **RED**: Test `apps/api/src/app.integration.test.ts` for image limits, SVG, opaque keys, 404, headers/cache, and lifecycle cleanup.
- [x] 3.2 **GREEN**: Add Sharp/multipart; implement private-S3 upload/delete, proxy, replacement, audit, cleanup in `apps/api/package.json`, `apps/api/src/app.ts`, `apps/api/src/services/public-media.ts`, `apps/api/src/routes/public-media.ts`, and `apps/api/src/worker.ts`.
- [x] 3.3 **REFACTOR**: Add timeout/backpressure, detected headers/cache, 503, and MinIO lifecycle testing.

## Phase 4: Presentation and Convergence

- [x] 4.1 **RED**: Test `apps/api/src/services/overlay-presentation.ts` for public state, ranking/ties, Up Next, champion.
- [x] 4.2 **GREEN**: Add `apps/api/src/routes/overlays.ts`; extend `apps/api/src/routes/events.ts` and `apps/api/src/services/realtime.ts` for gates, no-cache SSE, comments, retry, invalidations.
- [x] 4.3 **RED/GREEN/REFACTOR**: Create `apps/web/components/overlay-live.test.tsx` and `apps/web/components/overlay-live.tsx` for refetch, coalescing, stale rejection, abort, 404.

## Phase 5: Web Surfaces

- [x] 5.1 **RED**: Test branding, profile/privacy/links, canvas in `apps/web/app/t/[slug]/page.tsx`, `apps/web/app/players/[slug]/page.tsx`, and forms.
- [x] 5.2 **GREEN**: Add public pages, correction/hide/delete in `apps/web/app/dashboard/page.tsx`, appearance controls in `apps/web/app/tournaments/[id]/page.tsx`.
- [x] 5.3 **GREEN/REFACTOR**: Add `apps/web/app/t/[slug]/overlay/[view]/page.tsx` with three 1920×1080 transparent no-scroll views; use same-origin media.

## Phase 6: Acceptance

- [ ] 6.1 **RED/GREEN**: Add `tests/e2e/tournament-experience.spec.ts` for branding, overlays, revocation, denial, headers, convergence, reconnect; run tests.
- [ ] 6.2 **REFACTOR/DOCS**: Document storage/proxy lifecycle, SSE cache/proxy, and one API instance in `docs/DEPLOYMENT.md`.
- [ ] 6.3 **Smoke**: On supported OBS/CEF builds, record transparency, bootstrap, refresh, reconnect, reload in `docs/DEPLOYMENT.md`.

## Deferred Scope

No multi-replica fan-out, unlisted tokens, manual featured-match controls, advanced appearance, statistics, social/team ecosystems, or overlays beyond Scoreboard, Up Next, and Champion.
