# Design: Tournament Experience v1.2

## Technical Approach

Add an additive Drizzle/Fastify/Next.js presentation slice. PostgreSQL remains authoritative; public pages consume narrow DTOs, SSE only invalidates them, storage stays private, and browser traffic remains same-origin.

## Architecture Decisions

| Area | Decision, alternative, rationale |
|---|---|
| Appearance | One-to-one `tournamentAppearances`: validated colors and nullable logo/banner media FKs. Reject `tournaments.settings`; it cannot enforce media integrity. |
| Profiles | `publicPlayerProfiles`: unique `userId`/`slug`, `gamertag`, nullable `realName`, `showRealName=false`, avatar FK, `isPublished=false`. Reject `users`; publication must be revocable and isolated from auth data. |
| Media | `publicMedia`: opaque ID/key, kind, detected MIME, bytes, dimensions, checksum, state/timestamps, and exactly one owner (`userId` XOR `tournamentId`). Reject raw keys/URLs because they bypass policy. |
| Read model | `buildTournamentPresentation` in `apps/api/src/services/overlay-presentation.ts` joins authoritative presentation data into DTOs. Reject client joins because they duplicate policy and lose snapshot consistency. |
| Match choice | Rank `in_progress`, then ready `scheduled` matches; tie-break by non-null `scheduledAt`, stage position, bracket rank `winners`/`losers`/`final`, round number, match position, UUID. Scoreboard uses rank 1; Up Next uses the first ready match excluding it; champion requires finalized state. Reject mutable update time and manual selection. |
| Realtime | Extend `sseReply` without replay/state. One API instance is required because `channels` in `apps/api/src/services/realtime.ts` is process-local. Polling/WebSockets and replica fan-out are out of scope. |

For Smash Ultimate, profiles resolve only through `tournamentParticipants.teamId -> teams.captainId -> publicPlayerProfiles.userId`. Missing/unpublished links retain the team label; other adapters infer no individual identity. Before real-name opt-in, profile UI explains public exposure and provides correction, hide, and delete controls.

## API and UI Boundaries

- Authenticated owner: `PUT/DELETE /profile/public`, `POST/DELETE /profile/public/avatar`.
- Tournament admin via `isTournamentAdmin`: `PATCH /tournaments/:id/appearance`, `POST/DELETE /tournaments/:id/appearance/:slot`.
- Public: `GET /players/:slug`, `/media/:id`, and `/tournaments/by-slug/:slug/overlay`; return 404 unless publication is active. Presentation/SSE also require public visibility, `publishedAt`, and no `deletedAt`.
- Next routes are `/players/[slug]` and `/t/[slug]/overlay/[view]`, where `view` is `scoreboard`, `up-next`, or `champion`. Shared `OverlayLive` renders transparent 1920x1080 layouts without interaction or scrolling. `apps/web/app/t/[slug]/page.tsx` consumes appearance and optional profile links.

## Media Lifecycle

```mermaid
sequenceDiagram
  Browser->>API: same-origin multipart upload
  API->>API: authorize; enforce 2 MB and decoded dimension/pixel caps; Sharp decode/re-encode
  API->>S3: PUT generated public/{kind}/{owner}/{uuid}.ext
  API->>DB: transaction: media row, swap owner FK, audit, cleanup job
  Browser->>API: GET /media/{id}
  API->>DB: verify active reference and current publication
  API->>S3: bounded streamed GET
```

Prefix-restricted S3 credentials and bounded request timeouts limit storage access. Failed validation or DB swap deletes new bytes. Replacement commits before retirement; ownership removal also retires media, `apps/api/src/worker.ts` retries orphan/retired deletion. Responses set detected type, length, ETag, `nosniff`, and immutable caching; storage failure is 503. Mutations use 400/413, 403, or 409; public denial is 404.

## Live Refresh

```mermaid
sequenceDiagram
  Overlay->>API: no-cache bootstrap
  Overlay->>SSE: connect
  SSE-->>Overlay: open or relevant invalidation
  Overlay->>Overlay: mark dirty; keep one fetch in flight
  Overlay->>API: authoritative refetch
  API-->>Overlay: snapshot
  Overlay->>Overlay: accept only current route/generation; repeat if dirty
```

`OverlayLive` fetches on mount, every EventSource `open`, and relevant events. A dirty bit coalesces bursts; generation plus route key rejects stale responses; unmount aborts fetch and closes SSE. A 404 closes SSE. `sseReply` keeps 15-second comments, bounded `retry`, no buffering/cache, and no durable replay claim.

## File Changes

| Files | Action |
|---|---|
| `packages/database/src/schema.ts`, generated migration; `packages/shared-types/src/index.ts`; `packages/validation/src/index.ts` | Modify: tables, DTOs, schemas. |
| `apps/api/src/app.ts`, `apps/api/package.json`, `apps/api/src/routes/tournaments.ts`, `apps/api/src/routes/events.ts`, `apps/api/src/services/storage.ts`, `apps/api/src/services/realtime.ts`, `apps/api/src/worker.ts`, `docs/DEPLOYMENT.md` | Modify: registration, Sharp/multipart, gates, streaming, cleanup, single-instance boundary. |
| `apps/api/src/routes/profiles.ts`, `apps/api/src/routes/public-media.ts`, `apps/api/src/routes/overlays.ts`, `apps/api/src/services/public-media.ts`, `apps/api/src/services/overlay-presentation.ts` | Create: API slice. |
| `apps/web/app/players/[slug]/page.tsx`, `apps/web/app/t/[slug]/overlay/[view]/page.tsx`, `apps/web/components/overlay-live.tsx` | Create: public surfaces. |
| `apps/web/app/t/[slug]/page.tsx`, `apps/web/app/tournaments/[id]/page.tsx`, `apps/web/app/dashboard/page.tsx` | Modify: branding, links, management. |

## Testing Strategy

Strict TDD requires RED, GREEN, REFACTOR per work unit; `pnpm test` is primary. Unit RED tests cover schemas, ordering, privacy, coalescing, and stale rejection. Named `apps/api/src/app.integration.test.ts` cases verify admin appearance publication and branded reads, IDOR/publication 404s, decode/dimension/replacement/removal cleanup, headers, result-update convergence, and reconnect-bootstrap convergence. Playwright verifies branded rendering, three transparent 1920x1080 views, and profile revocation. A distinct real OBS Browser Source smoke matrix on supported OBS/CEF builds verifies URL load, transparency, refresh, and reconnect; Playwright is not a substitute. Then run `pnpm test:integration` and `pnpm test:e2e`.

## Threat Matrix

| Boundary | Applicability |
|---|---|
| Documentation-like paths | N/A: no executable-file classification. |
| Git repository selection | N/A: no VCS operation. |
| Commit state | N/A: no VCS operation. |
| Push state | N/A: no VCS operation. |
| PR commands | N/A: no PR automation. |

HTTP routes are covered by authorization/IDOR RED tests above; no shell, subprocess, or process-integration boundary is introduced.

## Migration / Rollback

Apply the additive Drizzle migration before application rollout; do not backfill legacy `avatarUrl`/`logoUrl`, because publication requires consent and validated objects. Roll back routes/UI first while retaining tables and objects; remove FKs/tables only after reference inspection, then garbage-collect objects separately.

## Open Questions

None.
