# Proposal: Tournament Experience v1.2

## Intent

Deliver branded public tournaments, reusable public player identities, and reliable read-only OBS overlays without replacing existing tournament flows.

## Scope

### In Scope
- Admin-managed tournament logo, colors, and banner.
- Global public profiles with avatar, gamertag, and basic optional information; unlinked participants retain tournament labels only.
- Public OBS pages for Scoreboard, Up Next, and Champion with automatic match selection.
- Same-origin public media backed by private S3-compatible storage.

### Out of Scope
- Multi-replica realtime, unlisted-overlay tokens, and manual featured-match controls.
- Advanced appearance, player statistics, social/team ecosystems, and overlays beyond the three named views.

## Capabilities

### New Capabilities
- `tournament-appearance`: Public logo, colors, and banner management.
- `public-player-profiles`: Account-owned, revocable, privacy-controlled identity.
- `public-obs-overlays`: Transparent broadcast views derived from authoritative state.
- `public-media-delivery`: Validated uploads and ID-addressed same-origin images.

### Modified Capabilities
None.

## Approach

Extend existing persistence, validation, and public reads. Overlays bootstrap from authoritative data, treat SSE only as invalidation, and refetch after relevant events or reconnection; concurrent refreshes are coalesced and stale responses rejected. Automatically select an active match, otherwise the next ready match. Keep objects private and serve validated raster media through visibility-aware same-origin routes. Limit live operation to one API instance.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/database/src/schema.ts` | Modified | Appearance, profile, media metadata. |
| `packages/shared-types/src/index.ts` | Modified | Public contracts. |
| `packages/validation/src/index.ts` | Modified | Mutation/upload validation. |
| `apps/api/src/routes/` | Modified | Profile, overlay, appearance, media routes. |
| `apps/api/src/services/` | Modified | Storage, permissions, realtime. |
| `apps/web/app/t/[slug]/` | Modified | Branding and profile links. |
| `apps/web/components/` | Modified | Live presentation components. |

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Missed process-local events | Medium | Refetch on load/reconnect; document single-instance operation. |
| Unsafe/stale media | Medium | Decode validation, generated keys, visibility checks, versioning, cleanup. |
| Identity disclosure | Medium | Explicit publication; optional fields private by default. |

## Rollback Plan

Disable new routes/UI, revert additive application changes, and retain tournament/result data. Remove columns only after checking references; garbage-collect new objects separately.

## Dependencies

- Existing REST reads, public SSE, admin authorization, and S3-compatible storage.
- Single API replica for live invalidation correctness in v1.2.

## Success Criteria

- [ ] Admins publish logo, colors, and banner without external-origin CSP changes.
- [ ] Published linked profiles expose only opted-in fields; unlinked participants have no profile URL.
- [ ] All three 1920×1080 transparent overlays converge after result updates or SSE reconnection.
- [ ] Private/unlisted tournaments and unpublished media are unavailable through public overlay/media routes.
