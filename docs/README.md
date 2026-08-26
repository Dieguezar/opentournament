# OpenTournament documentation

Use this index to find the shortest path from product context to an implementation change. Contributor-facing documentation is canonical in English; the user interface remains available in Spanish and English.

## Start here

| Goal                         | Read first                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Run or contribute locally    | [Contribution guide](../CONTRIBUTING.md), [deployment](DEPLOYMENT.md)              |
| Operate an instance          | [Self-hosting](SELF_HOSTING.md), [security policy](../SECURITY.md)                 |
| Understand system boundaries | [Architecture](ARCHITECTURE.md), [decisions](DECISIONS.md)                         |
| Change a database table      | [Data model](DATA_MODEL.md), then `packages/database/src/schema.ts`                |
| Change an API route          | [API design](API_DESIGN.md), [authorization](AUTHORIZATION_MODEL.md)               |
| Change bracket logic         | [Tournament engine](TOURNAMENT_ENGINE.md), [testing strategy](TESTING_STRATEGY.md) |
| Add game-specific behavior   | [Game adapters](GAME_ADAPTERS.md)                                                  |
| Change a user journey        | [User flows](USER_FLOWS.md), [functional requirements](FUNCTIONAL_REQUIREMENTS.md) |
| Pick a contribution          | [Current backlog](BACKLOG.md), [roadmap](ROADMAP.md)                               |

## Product

- [Product vision](PRODUCT_VISION.md)
- [Product requirements](PRD.md)
- [MVP scope](MVP_SCOPE.md)
- [Functional requirements](FUNCTIONAL_REQUIREMENTS.md)
- [Non-functional requirements](NON_FUNCTIONAL_REQUIREMENTS.md)
- [User roles](USER_ROLES.md)
- [User flows](USER_FLOWS.md)
- [Glossary](GLOSSARY.md)
- [Roadmap](ROADMAP.md)
- [Risk register](RISKS.md)
- [Contribution backlog](BACKLOG.md)

## Architecture and implementation

- [Architecture](ARCHITECTURE.md)
- [Architecture decisions](DECISIONS.md)
- [API design](API_DESIGN.md)
- [Data model](DATA_MODEL.md)
- [Authorization model](AUTHORIZATION_MODEL.md)
- [Tournament engine](TOURNAMENT_ENGINE.md)
- [Game adapters](GAME_ADAPTERS.md)
- [Real-time architecture](REALTIME_ARCHITECTURE.md)
- [Storage strategy](STORAGE_STRATEGY.md)
- [Optional Discord integration](DISCORD_INTEGRATION.md)

## Quality, security, and operations

- [Testing strategy](TESTING_STRATEGY.md)
- [Accessibility](ACCESSIBILITY.md)
- [Security model](SECURITY_MODEL.md)
- [Observability](OBSERVABILITY.md)
- [Deployment](DEPLOYMENT.md)
- [Self-hosting](SELF_HOSTING.md)
- [v1.0.0 release checklist](RELEASE_CHECKLIST.md)

## Documentation rules

1. Update documentation in the same pull request as behavior.
2. Treat code, migrations, tests, and generated OpenAPI as evidence; correct a stale document instead of copying it.
3. Preserve requirement IDs and ADR numbers so issues remain traceable.
4. Use English for new contributor-facing documentation and code comments.
5. Update both Spanish and English dictionaries for user-facing copy.
6. Record a new ADR instead of silently reversing an accepted decision.

## Review checklist

- [ ] Commands and paths exist.
- [ ] Internal links resolve.
- [ ] Mermaid blocks keep valid syntax.
- [ ] Security and authorization claims match enforcement.
- [ ] Schema claims match `packages/database/src/schema.ts`.
- [ ] User-facing behavior describes both supported languages.
