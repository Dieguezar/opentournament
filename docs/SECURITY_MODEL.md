# Security model

## Principles

- Threat modeling during design.
- Authorization in the API and validation on both client and server.
- Least privilege and fail-closed behavior.
- Secrets outside the repository.
- Explicit classification and handling of sensitive data.

## Threat model

Impact and probability use High, Medium, and Low.

| Threat                      | Impact | Probability | Primary controls                                                                  |
| --------------------------- | ------ | ----------- | --------------------------------------------------------------------------------- |
| Privilege escalation        | High   | Medium      | RBAC, effective-role checks, protected role routes, audit log                     |
| Cross-organization IDOR     | High   | Medium      | `organization_id` and membership filters plus authorization tests                 |
| Result tampering            | High   | Medium      | Reporting policy, bilateral confirmation, optimistic locking, audited corrections |
| Player impersonation        | High   | Medium      | Verified accounts, adapter identifiers, public profiles, roster audit             |
| Bracket manipulation        | High   | Low         | Deterministic engine and admin-only generation                                    |
| Spam and bots               | Medium | High        | IP/account rate limits, email validation, future CAPTCHA                          |
| Malicious files             | High   | Low         | Presigned uploads, MIME and size validation, attachment serving                   |
| Private evidence disclosure | High   | Medium      | Private bucket, signed URLs, permission and scope checks                          |
| Session theft               | High   | Medium      | HTTP-only SameSite cookies, expiration, revocation, CSRF, rate limits             |
| CSRF                        | Medium | Medium      | CSRF token on mutations and `SameSite=Lax`                                        |
| XSS                         | High   | Medium      | React escaping, rich-text sanitization, CSP                                       |
| SQL injection               | High   | Low         | Parameterized Drizzle queries; interpolated SQL is prohibited                     |
| Public endpoint abuse       | Medium | Medium      | Global and route rate limits, bounded pagination, SSR caching                     |
| Secret leakage              | High   | Medium      | Git exclusion, CI scanning, and documented rotation                               |
| Unsafe self-hosting         | High   | Medium      | Secure defaults and the self-hosting hardening checklist                          |

General-purpose webhooks are deferred. A future implementation must use HMAC signatures and replay protection.

## Controls by layer

### Transport and browser headers

- Production requires HTTPS through a reverse proxy.
- Next.js applies Content Security Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and cross-origin isolation headers.
- HSTS belongs at the production proxy.
- `.zap/rules.tsv` documents expected dynamic non-cacheable responses and the inline behavior required by the static Next.js CSP.

### Authentication

- Argon2id password hashes use 19 MiB memory, two iterations, and one thread.
- Email verification is enforced by default. SMTP delivers the link when configured; otherwise the link is written to private API logs and the UI explains the operator step. `ALLOW_UNVERIFIED_EMAILS` must remain an explicit private-instance choice.
- Verification resend responses do not reveal whether an account exists. Requests are rate-limited, replacement tokens expire after 24 hours, older unused tokens are invalidated, and successful reissues are audited.
- Session cookies use `HttpOnly`, `Secure` in production, and `SameSite=Lax`; database sessions store token hashes and expire after seven days by default.
- Discord OAuth uses `state` and verified-email rules.

### Authorization

The central permission catalog and resource-scope rules are defined in [AUTHORIZATION_MODEL.md](AUTHORIZATION_MODEL.md). Integration tests must cover IDOR on every organization-owned resource.

### Validation

- Zod validates API boundaries and UI forms.
- The API returns stable error codes without stack traces or internal details.
- Rich-text rules use a server-side HTML allowlist.
- Request-body sizes and pagination are bounded.

### Rate limiting

- Global default: 300 requests per minute per IP.
- Authentication routes: approximately 5–10 attempts per minute per account and IP.
- Sensitive writes also apply authenticated-user limits.

### Files

- Presigned URLs expire quickly.
- Type and size are checked before and after upload.
- Evidence remains private.
- Public avatars and logos reject HTML and SVG.

### Dependencies and CI

- `pnpm audit` and CodeQL run in CI.
- Dependabot tracks compatible and security updates.
- Pull requests justify and review every new dependency.

## Sensitive data

| Data                 | Treatment                                                 |
| -------------------- | --------------------------------------------------------- |
| Passwords            | Argon2id hash; never logged                               |
| Sessions             | Token hash in PostgreSQL; secure cookie in browser        |
| Discord OAuth tokens | Encrypted with an instance key                            |
| Evidence             | Private bucket and short-lived signed URLs                |
| Email addresses      | Stored only when needed and redacted from structured logs |

## Audit and incident response

Critical actions append immutable audit events. Follow [SECURITY.md](../SECURITY.md) for private reporting, response targets, and coordinated disclosure.

## Security verification

- Integration tests for IDOR and privilege escalation.
- Static analysis and dependency audit in CI.
- Manual pre-release checks for sessions, CSRF, uploads, signed URLs, and headers.
- An isolated passive OWASP ZAP baseline before releases.
- Manual penetration testing before major releases or sensitive authentication and authorization changes.
