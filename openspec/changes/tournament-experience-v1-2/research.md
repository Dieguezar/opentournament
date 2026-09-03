---
schema: gentle-ai.sdd-research/v1
revision: 1
change: tournament-experience-v1-2
outcome: done
admission:
  schema: gentle-ai.sdd-research-capability/v1
  requested_classes:
    - documentation
    - open-web
  observed_grants:
    - documentation
    - open-web
  result: admitted
accessed_at: 2026-09-02
---

# Research: Tournament Experience v1.2

## Questions

1. What constraints and supported behavior of OBS Browser Source matter for transparent HTML/CSS overlays, automatic page updates, and local/self-hosted URLs?
2. Is the existing SSE invalidation plus authoritative refetch pattern appropriate for one-way live tournament overlays, and what reconnection/caching behavior should the proposal require?
3. What security and operational controls should a same-origin public-media proxy use for self-hosted S3/MinIO-backed logos, banners, and avatars?
4. What privacy and identity boundaries should a public account profile use in a self-hosted deployment, especially for optional real names and participants without linked accounts?

## Sources

### S1 — OBS Browser Source

- class: documentation
- title: Browser Source
- publisher: OBS Project
- url: https://obsproject.com/kb/browser-source
- accessed_at: 2026-09-02
- excerpt: Browser Source accepts either a local file or URL, provides a transparent default stylesheet, and exposes viewport, frame-rate, unloading, and activation-refresh controls.

### S2 — MDN Server-Sent Events

- class: documentation
- title: Using server-sent events
- publisher: MDN Web Docs
- url: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- accessed_at: 2026-09-02
- excerpt: EventSource automatically reconnects closed connections; streams support retry delays, event IDs, named events, and comment-based keep-alives.

### S3 — HTML Living Standard: Server-Sent Events

- class: documentation
- title: Server-sent events
- publisher: WHATWG
- url: https://html.spec.whatwg.org/dev/server-sent-events.html
- accessed_at: 2026-09-02
- excerpt: Reconnecting clients can send Last-Event-ID, while an HTTP 204 response tells a client to stop reconnecting.

### S4 — MDN HTTP Caching

- class: documentation
- title: HTTP caching
- publisher: MDN Web Docs
- url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching
- accessed_at: 2026-09-02
- excerpt: No-cache forces revalidation, validators permit 304 responses, and versioned immutable resources can use long public cache lifetimes.

### S5 — OWASP File Upload Cheat Sheet

- class: documentation
- title: File Upload Cheat Sheet
- publisher: OWASP Foundation
- url: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- accessed_at: 2026-09-02
- excerpt: Secure uploads use allowlisted formats, independent type and signature checks, generated filenames, size limits, authorization, and mapped public retrieval handlers.

### S6 — OWASP SSRF Prevention Cheat Sheet

- class: documentation
- title: Server Side Request Forgery Prevention Cheat Sheet
- publisher: OWASP Foundation
- url: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- accessed_at: 2026-09-02
- excerpt: Server-side network destinations should be allowlisted where possible, and redirects should not bypass destination validation.

### S7 — Amazon S3 Object Keys

- class: documentation
- title: Naming Amazon S3 objects
- publisher: Amazon Web Services
- url: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html
- accessed_at: 2026-09-02
- excerpt: Object keys are flat, case-sensitive identifiers; prefixes provide logical grouping, and conservative characters maximize interoperability.

### S8 — Amazon S3 Object Metadata

- class: documentation
- title: Working with object metadata
- publisher: Amazon Web Services
- url: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingMetadata.html
- accessed_at: 2026-09-02
- excerpt: S3 objects carry controllable Content-Type and Cache-Control metadata plus validators and checksums that can support proxy responses and integrity checks.

### S9 — MinIO S3 Compatibility

- class: documentation
- title: MinIO AIStor Developers
- publisher: MinIO
- url: https://docs.min.io/aistor/developers/
- accessed_at: 2026-09-02
- excerpt: MinIO exposes objects through an S3 API subset and supports S3-compatible SDKs after endpoint and credential configuration.

### S10 — GDPR Principles

- class: open-web
- title: Regulation (EU) 2016/679, Article 5
- publisher: European Union, EUR-Lex
- url: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679
- accessed_at: 2026-09-02
- excerpt: Personal-data processing should be transparent, purpose-limited, minimized, accurate, retention-limited, secure, and accountable.

### S11 — NIST Digital Identity Privacy Requirements

- class: documentation
- title: NIST Special Publication 800-63A
- publisher: National Institute of Standards and Technology
- url: https://pages.nist.gov/800-63-4/sp800-63a.html
- accessed_at: 2026-09-02
- excerpt: Identity services should minimize personal information and disclose collection purpose, voluntariness, consequences, retention, deletion, and redress.

## Validated Claims

### Q1 — OBS Browser Source constraints and behavior

1. OBS Browser Source is suitable for HTML/CSS overlays because it renders a web page from either a URL or a local file and supplies transparent-background CSS by default. The overlay should nevertheless set its own transparent `html` and `body` backgrounds, remove margins and overflow, and render responsively within the operator-configured viewport. [S1]
2. Width, height, and optional custom FPS are OBS source properties rather than application-controlled guarantees. Overlay layouts must be deterministic at common broadcast dimensions and must not depend on browser chrome, scrolling, pointer interaction, or an exact frame rate. [S1]
3. OBS can unload a hidden Browser Source and can reload it when a scene becomes active. Those controls reset page and connection state, so every overlay page must bootstrap from an authoritative read on load and reconnect without relying on in-memory continuity. Application-driven SSE updates should be the normal update mechanism; the OBS activation-refresh option is an operator recovery/lifecycle control, not the consistency mechanism. [S1, S2]
4. Self-hosted HTTP(S) URLs are supported through the URL mode as long as the OBS host can resolve and reach them. Local-file mode is a separate operator choice and is not appropriate for a server-rendered overlay that needs same-origin API and media access. Exact Chromium/CEF capabilities vary with the OBS build, so the proposal should require standards-based HTML/CSS and EventSource rather than a browser-version-specific feature. [S1]

### Q2 — SSE invalidation and authoritative refetch

5. SSE is appropriate for this one-way use case: the server only needs to tell an overlay that tournament state may have changed, while the existing REST/read model remains authoritative. EventSource has native reconnection semantics, retry control, typed events, and keep-alive comments. [S2, S3]
6. The proposal should require an authoritative fetch on initial page load, after every relevant invalidation, and after every EventSource `open` following a disconnect. Refetches should be coalesced while one is in flight, and stale or out-of-order responses must not replace a newer accepted snapshot. This makes a missed notification harmless once connectivity returns. [S2, S3]
7. The SSE endpoint should return `text/event-stream`, disable response caching, emit periodic comment keep-alives, and avoid reverse-proxy buffering. The server may provide a bounded `retry` value. A normal transient failure must allow native EventSource reconnection; a deliberate terminal condition may use HTTP 204. [S2, S3]
8. Because events are invalidations rather than the authoritative state, durable replay is not required for correctness if reconnect/open always triggers a refetch. Event IDs and Last-Event-ID remain useful only if the implementation later adds replay or diagnostic ordering; the proposal must not claim replay from the current process-local broker. [S2, S3]
9. Overlay HTML and live JSON/read-model responses should use explicit `Cache-Control: no-cache` with ETag or Last-Modified where practical, so a refetch revalidates rather than accepting an unverified stale response. Versioned static assets and versioned media object URLs may use long-lived public immutable caching. [S4]
10. The existing process-local publisher is acceptable only under a documented single-API-instance operational boundary. Multi-replica deployment requires a shared broadcaster or another cross-replica invalidation mechanism; authoritative refetch repairs missed events after reconnect but cannot notify a client connected to a different isolated replica. [S2]

### Q3 — Same-origin public-media proxy controls

11. Upload authorization must be resource-specific: account owners manage their avatar, and tournament administrators manage tournament logos and banners. The object store should remain non-public; the same-origin route should authorize publication from application records rather than treating possession of an object key or a `public/` prefix as sufficient visibility. [S5, S7]
12. V1 should allow only required raster image formats, such as PNG, JPEG, and WebP. It should reject SVG and other active/document formats, enforce byte and decoded-dimension limits, compare the claimed MIME type with file signature and successful image decoding, and store the server-detected media type rather than trusting the upload header. [S5]
13. The application must generate object keys from opaque identifiers, not original filenames or caller-supplied paths. A safe pattern is `public/{kind}/{owner-id}/{uuid}.{validated-extension}` using a conservative character set; replacement creates a new key and atomically updates the database reference. [S5, S7]
14. The public-media route should accept an application media identifier, resolve its stored key and owning resource, enforce the owner's current public visibility, and retrieve only from the configured bucket through the S3-compatible SDK. It must not accept or fetch arbitrary URLs, endpoints, buckets, redirects, or raw traversal-capable keys. This design removes the proxy's user-controlled network destination and key-space traversal surface. [S6, S7, S9]
15. Successful responses should set the validated `Content-Type`, `X-Content-Type-Options: nosniff`, a bounded `Content-Length`, and validators such as ETag or Last-Modified. Versioned immutable URLs can use `Cache-Control: public, max-age=31536000, immutable`; mutable aliases, if any, should use `no-cache`. Missing, unpublished, or unauthorized media should return a non-enumerating 404-style response. [S4, S8]
16. Operational requirements should include least-privilege S3 credentials restricted to the configured bucket/prefix, upload verification before database publication, orphan cleanup after replacement or failed transactions, deletion when ownership is removed, bounded request timeouts, streamed responses with backpressure, and audit records for media mutation. [S5, S8, S9]

### Q4 — Public profile privacy and identity boundaries

17. A public account profile must be an explicit publication surface, separate from authentication and private account data. The minimum public contract should expose a stable public slug, display name, optional avatar, and only intentionally public fields; it must never expose email addresses, provider identifiers, credentials, roles, audit data, or internal database IDs. [S10, S11]
18. A real name should be optional and unpublished by default, with a separate, informed visibility choice. The UI should explain that enabling it makes the value publicly accessible, identify the self-hosted operator responsible for the deployment, and provide a way to correct, hide, or delete the value. Applicable legal duties remain deployment- and jurisdiction-specific. [S10, S11]
19. Tournament participation identity and account identity must remain distinct. A participant without a verified linked account keeps its tournament-scoped display label and may use tournament-owned team media, but it receives no fabricated global profile, profile URL, inferred real name, or account avatar. A profile link appears only when a linked account exists and that account has enabled public-profile publication. [S10, S11]
20. Profile publication should be revocable without deleting tournament history: withdrawing publication removes the global profile route and links while preserving the participant label needed for bracket integrity. Operators should document retention and deletion behavior and take additional care where participants may be minors. [S10, S11]

## Proposal Requirements Derived from Evidence

- Treat OBS Browser Source as a standards-based transparent web viewport; require authoritative bootstrap and reconnection-safe page behavior.
- Reuse SSE strictly as invalidation, with refetch on initial load, relevant events, and reconnect/open; document single-instance operation until a shared broadcaster exists.
- Set explicit caching policies: revalidated overlay/read-model responses and versioned immutable public media.
- Keep storage private behind a same-origin, ID-addressed proxy with strict upload validation, generated keys, visibility checks, safe response headers, and lifecycle cleanup.
- Keep the confirmed global-account-profile decision while separating public profile publication, optional real-name consent, and tournament-only identities for unlinked participants.

## Contradictions

- No material contradiction was found among the consulted sources.
- OBS exposes manual/scene lifecycle reload controls, but these do not conflict with application-driven updates; they reinforce the need for reload-safe bootstrap rather than replacing SSE.

## Uncertainty

- OBS ships CEF and exact web-platform behavior can vary by OBS version and platform; compatibility should be verified against the project's supported OBS versions during implementation testing.
- Reverse-proxy buffering and idle timeout settings are deployment-specific, so the proposal can require observable keep-alives and no buffering without prescribing one proxy product's configuration.
- Privacy law varies by operator jurisdiction. GDPR and NIST are used as defensible design baselines, not as a determination that a particular self-hosted deployment has satisfied legal obligations.
- MinIO implements a subset of S3 operations; the implementation should confirm compatibility for the exact metadata, conditional request, and streaming operations it uses.

## Freshness

- All sources were retrieved and inspected on 2026-09-02.
- OBS, MDN, WHATWG, OWASP, AWS, MinIO, EUR-Lex, and NIST are primary or authoritative maintainers for the cited product, standards, security, storage, privacy, and identity guidance.
- The proposal should re-check OBS Browser Source behavior and MinIO S3 compatibility if the supported deployment versions materially change.

## Product Choices (Non-Authoritative)

The following choices were supplied as already confirmed. This research does not reopen, replace, or independently authorize them:

- profile ownership: `global_account_profile`
- featured match selection: `automatic_match_selection`
- unlisted overlay access: `public_only_overlays`
- public media delivery: `same_origin_media_proxy`
