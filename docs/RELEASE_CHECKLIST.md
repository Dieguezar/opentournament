# OpenTournament v1.0.0 release checklist

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
