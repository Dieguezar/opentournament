# Risk register

Impact and probability use High, Medium, and Low. Status is open, mitigated, or accepted.

| ID   | Risk                                                               | Impact | Probability | Mitigation                                                                          | Status    |
| ---- | ------------------------------------------------------------------ | ------ | ----------- | ----------------------------------------------------------------------------------- | --------- |
| R-01 | Broad MVP delays release                                           | High   | Medium      | Explicit scope, phased exit criteria, documented exclusions                         | Mitigated |
| R-02 | BYEs, seeds, or double elimination require engine rewrites         | High   | Medium      | Pure deterministic engine, invariants, property tests                               | Mitigated |
| R-03 | Concurrent reports corrupt match state                             | High   | Medium      | Optimistic locking, reporting policy, transactions, concurrency tests               | Mitigated |
| R-04 | Self-hosting friction prevents adoption                            | High   | Medium      | Compose quick path, safe defaults, wizard, troubleshooting, release images          | Mitigated |
| R-05 | Impersonation, result tampering, or evidence leakage damages trust | High   | Medium      | API authorization, passes, private evidence, audit, threat model                    | Mitigated |
| R-06 | Official adapter maintenance becomes stale                         | Medium | Medium      | Typed/versioned adapters, proposal sources, tests, named maintenance                | Open      |
| R-07 | Discord API/rate-limit changes break optional automation           | Medium | Medium      | Small isolated module, signed interactions, clean disabled state                    | Open      |
| R-08 | Self-hosted instance has no SMTP                                   | Medium | High        | Log development messages, explicit private fallback, clear production guidance      | Mitigated |
| R-09 | Growth requires earlier distribution                               | Medium | Low         | 512+ data/engine design and documented worker/Redis seams                           | Mitigated |
| R-10 | MIT permits competing commercial forks                             | Medium | Medium      | Compete through quality, openness, and governance                                   | Accepted  |
| R-11 | Documentation diverges from implementation                         | High   | Medium      | English canonical docs, same-PR rule, schema/API source links, review checklist     | Open      |
| R-12 | Complex brackets remain difficult for assistive technology         | Medium | Medium      | Text semantics, focusable regions, axe E2E, manual NVDA/VoiceOver review            | Open      |
| R-13 | Dependency vulnerability reaches releases                          | High   | Medium      | Audit, Dependabot, CodeQL, dependency review                                        | Mitigated |
| R-14 | Operator failure causes data loss                                  | High   | Low         | Backup/restore documentation, durable jobs, health checks                           | Mitigated |
| R-15 | Spanish and English UI behavior diverges                           | Medium | Medium      | Typed dictionary parity tests and bilingual acceptance criteria                     | Mitigated |
| R-16 | API human messages remain Spanish-only                             | Medium | Medium      | Stable error codes and client localization; add locale-aware server responses later | Open      |

## Review process

- Review risks at each release milestone.
- Accept a risk only through a recorded maintainer decision.
- Add a new risk with an owner and next review date.
- Convert a failed mitigation into an issue with testable closure criteria.
