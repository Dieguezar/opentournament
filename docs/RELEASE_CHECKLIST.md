# OpenTournament release checklist

## v1.2.0 — published release (2026-09-05)

[OpenTournament v1.2.0](https://github.com/Dieguezar/opentournament/releases/tag/v1.2.0) is published from `3abb913875f58a1d79e3f5a2c6e130c1fe6affb2`. The annotated tag preserves the validated application; subsequent documentation updates do not move it. API and web images are publicly available for AMD64 and ARM64.

### Hosted release evidence

| Gate | Evidence |
| --- | --- |
| CI on the released commit | [Passed](https://github.com/Dieguezar/opentournament/actions/runs/34002464103): lint, types, unit/config tests, build, dependency audit, integration, and browser E2E. |
| CodeQL on main | [Passed](https://github.com/Dieguezar/opentournament/actions/runs/34002464106). |
| Clean Compose installation | [Passed](https://github.com/Dieguezar/opentournament/actions/runs/34001969819) on the same released commit. |
| OWASP ZAP baseline | [Passed](https://github.com/Dieguezar/opentournament/actions/runs/34001970636) on the same released commit. |
| Container and release publication | [Passed](https://github.com/Dieguezar/opentournament/actions/runs/34002463843): native AMD64/ARM64 builds, multi-architecture manifests, provenance attestations, and stable GitHub release. |
| Public availability | Anonymous requests returned the stable non-draft release and both image manifests with AMD64/ARM64 entries. |
| Installation from published images | Using an empty Docker credential configuration, pulled the public `1.2.0` images and started a new isolated Compose project without builds. All four services became healthy; API health, web, and the same-origin CSRF endpoint returned HTTP 200. Production mode, demo data disabled, and unverified accounts disabled. Temporary containers and volumes were removed afterward. |

Immutable `1.2.0` image-index digests:

- API: `sha256:68f594a6455b3ecec689dd6f1fb1ff7e3c2a348db521a4d942c9db6e10350690`
- Web: `sha256:ebaf713f2fe203aa53fba3e0695cca259d5d2df05ca0e155542d934b83bb70c0`

### Included scope

- Full-page tournament themes, palette preview/reset, logos and banners.
- Private-by-default account profiles, explicit publication controls, bounded avatars, and public Smash participant links.
- Validated same-origin media with immediate access revocation.
- Public-only OBS scoreboard, up-next, and champion routes, automatic match selection, live snapshot updates, and OpenTournament branding.
- Custom overlay uploads/editors are intentionally deferred.

### Local verification

| Gate | Evidence |
| --- | --- |
| Version consistency | All 11 workspace manifests declare `1.2.0`; OpenAPI reads the API package version. |
| Unit/configuration tests | `pnpm test`: 310 package tests and 32 configuration tests passed; 14 conditional integration/storage cases skipped in this command. |
| PostgreSQL integration | `pnpm test:integration`: 76 passed, 1 conditional MinIO case skipped; ephemeral PostgreSQL cleaned afterward. Includes profile/media revocation and real HTTP/SSE overlay correction. |
| Object storage | Separate `RUN_MINIO_HARNESS=true` public-media suite: 6 passed, including the skipped storage case, against a temporary MinIO container cleaned afterward. |
| Static checks and build | `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed. |
| Interactive checks | Tournament theme/media, profile creation/avatar size, and the transparent 1920×1080 OBS browser view were checked locally during implementation; see [design QA](../design-qa.md). |
| Full browser suite | 13/13 Chromium E2E tests passed in 32.4 seconds against the isolated production images, including two Playwright/axe WCAG A/AA checks, participant permissions, profile/media revocation, and overlay invalidation/reconnection/reload. |
| Docker images and fresh install | API/web images built successfully from a clean archive of `78fe6a8`. A new Compose project with fresh PostgreSQL/MinIO volumes reached four healthy services. |
| Upgrade from 1.1.0 | Started the published 1.1.0 images, backed up the disposable database, then upgraded the same volumes to 1.2.0. Counts and selected identity/state fingerprints remained unchanged for 5 users, 3 tournaments, 20 teams, and 25 matches; new profile/media tables were present. |
| Dependency audit | `pnpm audit`: zero reported vulnerabilities across 480 dependencies. |
| Passive security baseline | ZAP: 65 PASS, 0 WARN, 0 FAIL. Existing repository rules retain non-storable responses (10049) as IGNORE and inline-script CSP (10055) as INFO; this is not a claim of zero findings or a full penetration test. |
| Native OBS and website acceptance | User reports both manual tests passed after their corrections, with no remaining problems. This is user-reported acceptance, separate from automated evidence. |

The Docker test configuration used production images with seeded disposable fixtures and unverified-email access enabled for automated account flows. The isolated web origin used a separate loopback port; no tests were pointed at the user's running application. Browser harness fixes honor `PLAYWRIGHT_BASE_URL` in all API fixtures, select the tournament logo independently of the new brand mark, and exercise desktop identity chips at an explicit 1440px viewport. The initial browser run stopped at a stale 1280px visibility assertion (9 passed); the corrected full suite passed all 13 tests without removing permission assertions or changing production code.

The integration runner serializes test files because they share a database. Profile retirement accepts either queued deletion (`retired`) or completed deletion (`deleted`), while always asserting that public media is inaccessible. No production data reset or migration rollback was performed.

### Quick manual acceptance

1. In the organizer tournament page, open **Personalization**, change a palette and save. Open the public tournament page and confirm backgrounds, cards, text, buttons, and brackets use that palette.
2. Open `/profile`, save a profile before uploading its avatar, then publish only the desired fields. Check `/players/<slug>` and verify unpublishing removes public access.
3. Add an OBS Browser Source for `/t/<public-slug>/overlay/scoreboard`, width **1920**, height **1080**. The background should be transparent. Report or correct a match result and verify the score refreshes. The compatible `/up-next` and `/champion` routes display between-match/final states.

### Before public publication

- [x] Explicitly authorize push/tag/release and run hosted CI/security checks on the exact candidate.
- [x] Replay the full Playwright/axe suite in an isolated environment.
- [x] Obtain native OBS and website manual acceptance (confirmed by the user).
- [x] Validate local release image builds and clean self-hosted installation/upgrade on disposable data.
- [x] Publish matching versioned API/web images and update the self-hosting guide's published-version examples.

Historical evidence below applies only to v1.0.0 and does not substitute for v1.2.0 publication gates.

## v1.0.0 — published release evidence

This document records the gates used for the first stable release. The tag was published only after blocking checks passed on the candidate commit.

## Candidate evidence

| Gate                       | Status                       | Evidence                                                                                                                                                                   |
| -------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Versioning                 | Passed                       | Every package and OpenAPI document declared `1.0.0`                                                                                                                        |
| Lint and types             | Passed                       | `pnpm lint` and `pnpm typecheck`                                                                                                                                           |
| Unit/configuration tests   | Passed                       | `pnpm test` plus 21 Compose/release checks                                                                                                                                 |
| Demo-data integration      | Passed                       | Idempotent seed on a clean temporary database                                                                                                                              |
| Browser and automated WCAG | Passed                       | Nine Playwright scenarios and axe checks for LoL and Smash                                                                                                                 |
| Dependencies               | Passed                       | `pnpm audit` reported no known vulnerabilities                                                                                                                             |
| PWA and public routes      | Passed                       | Manifest, service worker, LoL, Smash, and health routes returned 200                                                                                                       |
| Browser security headers   | Passed                       | CSP, frame denial, `nosniff`, and referrer policy                                                                                                                          |
| CI and CodeQL              | Passed                       | [CI](https://github.com/Dieguezar/opentournament/actions/runs/32986802569) and [CodeQL](https://github.com/Dieguezar/opentournament/actions/runs/32986803658) on `b4b65a6` |
| Clean Compose install      | Passed                       | [Compose smoke](https://github.com/Dieguezar/opentournament/actions/runs/32986804973) plus an external public-image install                                                |
| OWASP ZAP baseline         | Passed                       | [ZAP baseline](https://github.com/Dieguezar/opentournament/actions/runs/32986806315) without blocking findings                                                             |
| Screen-reader review       | Recommended manual follow-up | NVDA or VoiceOver representative flow                                                                                                                                      |
| Images and release         | Passed                       | Public [v1.0.0 release](https://github.com/Dieguezar/opentournament/releases/tag/v1.0.0) and multi-architecture API/web images                                             |

## Published release

1. CI, CodeQL, Compose smoke, and ZAP passed on `b4b65a6`.
2. The annotated `v1.0.0` tag points to that candidate.
3. API and web images were published for AMD64 and ARM64 with attestations.
4. A temporary installation pulled both images anonymously and returned 200 for API and web.
5. GitHub Release notes are public.

## Blocking policy

Do not publish a stable tag with a known blocking failure in security, clean installation, migrations, authentication, authorization, reporting, arbitration, or bracket integrity. Cosmetic-only differences may be scheduled for a later patch release.
