## Exploration: tournament-experience-v1-2

### Current State
OpenTournament v1.1 has a server-rendered public tournament page at `/t/[slug]` that reads tournament, participant, and bracket data from the Fastify API. Public pages already subscribe to `/api/v1/events/public?tournament=<id>` through `EventSource`; received events refresh the authoritative server-rendered data.

Tournament participants are represented by `tournament_participants` records that reference `teams`. For Smash Ultimate, the UI creates a one-player team and presents it as a player. Users already have `displayName` and `avatarUrl` columns, while teams have `name`, `tag`, and optional `logoUrl`; no public player-profile entity or public player-profile route exists.

Confirmed results advance the persisted bracket inside a database transaction. The result route emits a public `result.confirmed` event after successful confirmation, and a finalized champion updates tournament status and the winning participant. S3-compatible storage and MinIO are available, but the implemented presigned upload flow currently stores only private result evidence. The storage documentation reserves `public/` prefixes for logos and avatars, but no public-media route or upload workflow is implemented.

### Affected Areas
- `packages/database/src/schema.ts` — owns user, team, tournament, participant, match, and result persistence; requires additive appearance/profile media metadata.
- `packages/shared-types/src/index.ts` — exports public model contracts and tournament settings types.
- `packages/validation/src/index.ts` — owns boundary validation; includes an unused `updateProfileSchema` for account display name, avatar URL, and locale.
- `apps/api/src/routes/tournaments.ts` — serves public tournament reads and organizer-only tournament updates; is the natural authorization boundary for appearance settings.
- `apps/api/src/routes/bracket.ts` — provides public bracket data with participant/team labels and result summaries.
- `apps/api/src/routes/matches.ts` — provides public match data with round metadata, scores, and participants.
- `apps/api/src/routes/results.ts` — confirms results, advances brackets, finalizes champions, and emits tournament result events.
- `apps/api/src/routes/events.ts` — exposes the existing public tournament SSE endpoint.
- `apps/api/src/services/realtime.ts` — contains the current in-process SSE channel and keep-alive behavior.
- `apps/api/src/routes/evidence.ts` and `apps/api/src/services/storage.ts` — define the existing S3-compatible presigned-upload seam, currently for private evidence only.
- `apps/api/src/services/permissions.ts` — enforces tournament-admin authority for tournament mutations.
- `apps/api/src/services/tournaments.ts` — maps deterministic engine results into persisted match and champion state.
- `apps/web/app/t/[slug]/page.tsx` — existing public microsite surface for appearance, player profile links, and tournament presentation data.
- `apps/web/components/live-tournament.tsx` — existing SSE client pattern to reuse for overlays.
- `apps/web/next.config.ts` — strict CSP currently permits same-origin images only, constraining external public media URLs.
- `docs/REALTIME_ARCHITECTURE.md`, `docs/STORAGE_STRATEGY.md`, `docs/AUTHORIZATION_MODEL.md`, and `docs/TESTING_STRATEGY.md` — declared architecture, security, and verification constraints.

### Approaches
1. **Extend the current public read model and SSE invalidation pattern**
   - Add small public presentation endpoints for overlays and have the page/overlay refetch authoritative state after existing tournament SSE events.
   - Pros: preserves current REST plus SSE architecture; avoids a second state store and a new realtime protocol; leverages result propagation already implemented.
   - Cons: the current realtime broker is process-local, so updates do not cross API replicas without a shared/durable broadcaster.
   - Effort: Medium.

2. **Use polling for overlay presentation data**
   - Overlay browser sources poll a read-only endpoint on an interval.
   - Pros: immediately replica-safe; simpler deployment behavior.
   - Cons: delayed screen updates and repeated requests during long broadcasts; duplicates an existing live-update capability.
   - Effort: Low.

3. **Introduce WebSockets for overlays**
   - Maintain a dedicated bidirectional overlay connection.
   - Pros: future-ready for interactive producer controls.
   - Cons: adds connection lifecycle and deployment complexity while OBS V1 only needs server-to-client updates; duplicates existing SSE capability.
   - Effort: High.

### Recommendation
Adopt Approach 1 for the bounded MVP: a tournament-owned appearance document, a minimal account-owned public player profile, and three public read-only overlay pages (Scoreboard, Up Next, Champion). Overlays should use deterministic derived state from persisted tournament, match, and bracket data and refresh through the current public SSE invalidation pattern. Do not add WebSockets, a separate overlay state store, typography controls, background customization, player statistics, social graphs, or manual broadcast controls in V1.

The MVP should retain generic tournament data flow while first being verified against Smash Ultimate. For Smash, resolve public player presentation through the existing one-player team and its captain/user relationship rather than replacing `teams` or `tournament_participants`.

### Risks
- `apps/api/src/services/realtime.ts` uses an in-memory `Map`; multi-replica API deployments will not share events. The proposal must either establish a single-instance operational boundary or define a shared/durable publication mechanism.
- Result events are emitted after the database transaction. Persisted state remains authoritative and reloadable, but a process failure can miss a transient live notification.
- Implemented S3 storage supports private evidence only. Public media needs its own key namespace, upload authorization, MIME/size checks, object verification, and deletion/retention behavior.
- `apps/web/next.config.ts` has `img-src 'self'`; direct external object-storage image URLs will be blocked unless media is delivered from the same origin or CSP configuration is safely extended.
- Public overlay reads must honor tournament visibility. The current public event route subscribes by tournament ID and does not independently validate visibility.
- A participant pass may represent a tournament-scoped actor; a global account profile cannot be assumed for every participant.

### Product Decisions Required Before Proposal
1. **Profile ownership**
   - Global account profile: reusable across tournaments and aligned with the intended player ecosystem; needs explicit behavior for participant-pass actors and missing account links.
   - Tournament-scoped profile: simpler association; duplicates identity and does not support a durable global player identity.
   - Recommended decision: global account profile, with profile links omitted when a public account profile cannot be resolved.

2. **Featured match selection for Scoreboard and Up Next**
   - Automatic selection: choose an active match, otherwise the deterministically next ready scheduled match; no stream-runner operation, but may not match the broadcast.
   - Organizer-selected match: accurately follows production intent; requires a managed selection operation and reset behavior.
   - Recommended decision: automatic selection for V1 only if its deterministic ordering rule is accepted.

3. **Overlay access for unlisted tournaments**
   - Public-only overlays: works directly as OBS Browser Sources and avoids credentials.
   - Secret overlay URLs: supports unlisted events but introduces secret generation, revocation, leakage, and cache-control requirements.
   - Recommended decision: public tournaments only in V1; treat unlisted overlays as a separately authorized security feature.

4. **Public-media delivery**
   - Same-origin API/proxy route: compatible with current CSP and operator-managed storage without exposing storage origin policy.
   - Direct object-storage URLs: reduces application bandwidth but needs configurable CSP and verified public bucket policy.
   - Recommended decision: same-origin public-media delivery for V1.

### Testing Seams
- API integration tests in `apps/api/src/app.integration.test.ts` cover end-to-end tournament lifecycle, visibility behavior, result confirmation, storage, and SSE.
- `apps/web/components/live-tournament.tsx` is an isolated client seam for SSE refresh behavior.
- `packages/tournament-engine/src/index.ts` has deterministic bracket advancement functions suitable for presentation-state unit tests.
- Existing repository commands are `pnpm test`, `pnpm test:integration`, and `pnpm test:e2e`; project initialization requires Strict TDD using `pnpm test`.

### Ready for Proposal
No. Product decisions for profile ownership, featured-match selection, unlisted overlay access, and public-media delivery must be confirmed before a proposal can define durable requirements. Research is not required for the current decision set because the architecture evidence is local and sufficient; external research should be selected only if product or deployment constraints change.
