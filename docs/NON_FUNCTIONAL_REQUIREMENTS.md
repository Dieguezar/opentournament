# Non-functional requirements

IDs use `NFR-<category>-<number>` and are verified through [TESTING_STRATEGY.md](TESTING_STRATEGY.md).

## Performance

| ID          | Requirement                                   | Target                                                          |
| ----------- | --------------------------------------------- | --------------------------------------------------------------- |
| NFR-PERF-01 | Common API latency                            | p95 below 200 ms under normal load                              |
| NFR-PERF-02 | SSE propagation                               | Below one second from committed state to connected client       |
| NFR-PERF-03 | 128-participant double-elimination generation | Below one second                                                |
| NFR-PERF-04 | Concurrency smoke                             | 256 participants without errors and with acceptable degradation |
| NFR-PERF-05 | Public SSR page                               | TTFB p95 below 500 ms on a modest instance                      |

## Availability and resilience

| ID           | Requirement                                                            |
| ------------ | ---------------------------------------------------------------------- |
| NFR-AVAIL-01 | Operate correctly on one node without unnecessary runtime dependencies |
| NFR-AVAIL-02 | Scheduled jobs survive process restarts through PostgreSQL             |
| NFR-AVAIL-03 | Web, API, PostgreSQL, and MinIO expose Compose health checks           |
| NFR-AVAIL-04 | Core features continue without SMTP or Discord                         |

## Security

| ID         | Requirement                                                                        |
| ---------- | ---------------------------------------------------------------------------------- |
| NFR-SEC-01 | Hash passwords with Argon2id and never store plaintext                             |
| NFR-SEC-02 | Use HTTP-only SameSite cookies and CSRF tokens                                     |
| NFR-SEC-03 | Authorize every resource in the API                                                |
| NFR-SEC-04 | Rate-limit sensitive routes by IP and actor                                        |
| NFR-SEC-05 | Validate and sanitize input and prevent injection or stored XSS                    |
| NFR-SEC-06 | Keep evidence private with expiring signed URLs                                    |
| NFR-SEC-07 | Read secrets only from environment/secret storage                                  |
| NFR-SEC-08 | Run dependency and static analysis in CI                                           |
| NFR-SEC-09 | Apply CSP, content-type, referrer, frame, permissions, and related browser headers |
| NFR-SEC-10 | Store access-pass and session secrets only as hashes                               |

See [SECURITY_MODEL.md](SECURITY_MODEL.md).

## Scalability

| ID           | Requirement                                                                             |
| ------------ | --------------------------------------------------------------------------------------- |
| NFR-SCALE-01 | Support 512-participant tournaments without a schema or engine redesign                 |
| NFR-SCALE-02 | Keep the engine deterministic and free of shared request state                          |
| NFR-SCALE-03 | Preserve documented seams for extracting worker/bot and adding Redis only when measured |

## Accessibility and compatibility

| ID          | Requirement                                                               |
| ----------- | ------------------------------------------------------------------------- |
| NFR-A11Y-01 | Meet WCAG 2.1 AA across the web interface                                 |
| NFR-A11Y-02 | Support complete keyboard navigation and visible focus                    |
| NFR-A11Y-03 | Announce meaningful live tournament updates appropriately                 |
| NFR-A11Y-04 | Provide AA contrast, alternative text, labels, and accessible form errors |

See [ACCESSIBILITY.md](ACCESSIBILITY.md).

| ID          | Requirement                                                              |
| ----------- | ------------------------------------------------------------------------ |
| NFR-COMP-01 | Support the latest two stable Chrome, Edge, Firefox, and Safari versions |
| NFR-COMP-02 | Remain usable from 360 px viewport width                                 |
| NFR-COMP-03 | Install as a PWA where the browser supports installation                 |
| NFR-COMP-04 | Avoid page-level horizontal overflow except explicit bracket/tab regions |

## Internationalization

| ID          | Requirement                                                            |
| ----------- | ---------------------------------------------------------------------- |
| NFR-I18N-01 | Provide Spanish and English, with Spanish as the current default       |
| NFR-I18N-02 | Keep visible copy in typed dictionaries instead of component literals  |
| NFR-I18N-03 | Persist explicit language selection and otherwise use browser language |
| NFR-I18N-04 | Render the correct HTML `lang` and localize dates, times, and statuses |
| NFR-I18N-05 | Keep contributor documentation canonical in English                    |

## Operations

| ID         | Requirement                                                                    |
| ---------- | ------------------------------------------------------------------------------ |
| NFR-OPS-01 | Start a clean production-safe instance through documented Docker Compose steps |
| NFR-OPS-02 | Emit structured Pino logs with request IDs and redaction                       |
| NFR-OPS-03 | Apply database migrations safely before serving traffic                        |
| NFR-OPS-04 | Document and test PostgreSQL and object-storage backup/restore                 |
| NFR-OPS-05 | Support explicit version upgrades and rollback without data loss               |
| NFR-OPS-06 | Expose no default demo credentials on a production configuration               |

## Data and privacy

| ID          | Requirement                                                                           |
| ----------- | ------------------------------------------------------------------------------------- |
| NFR-DATA-01 | Encrypt traffic with HTTPS and rely on operator infrastructure for storage encryption |
| NFR-DATA-02 | Keep evidence private and document retention                                          |
| NFR-DATA-03 | Document account and organization data lifecycle                                      |
| NFR-DATA-04 | Keep critical audit records append-only                                               |
| NFR-DATA-05 | Prevent participant-pass tokens from reaching HTTP logs or referrer headers           |

## Maintainability

| ID           | Requirement                                                                      |
| ------------ | -------------------------------------------------------------------------------- |
| NFR-MAINT-01 | Use strict TypeScript throughout the monorepo                                    |
| NFR-MAINT-02 | Maintain at least 95% engine coverage and 80% coverage of critical API lines     |
| NFR-MAINT-03 | Update behavior documentation in the same pull request                           |
| NFR-MAINT-04 | Keep modules focused and dependencies directional                                |
| NFR-MAINT-05 | Require stable API error codes so clients can localize messages                  |
| NFR-MAINT-06 | Keep migrations, schema documentation, shared types, and validation synchronized |
