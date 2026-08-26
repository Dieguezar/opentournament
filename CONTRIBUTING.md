# Contributing to OpenTournament

Thank you for helping improve OpenTournament. This guide is the shortest path from an idea or bug report to a reviewable contribution. By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Quick contribution path

1. Search existing issues before opening a new one.
2. Use the matching issue template and discuss large or architectural changes first.
3. Fork the repository and create a focused branch.
4. Add tests and update the documentation affected by your change.
5. Run the required checks and open a small, focused pull request.

## Ways to contribute

- Report bugs or privately disclose security vulnerabilities through [SECURITY.md](SECURITY.md).
- Propose product improvements through issues.
- Improve code, tests, accessibility, translations, or documentation.
- Implement a scoped item from the [backlog](docs/BACKLOG.md).
- Create or improve a [game adapter](docs/GAME_ADAPTERS.md).
- Review open pull requests.

## Reporting bugs

1. Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).
2. Include reproducible steps, expected and actual behavior, the OpenTournament version, and your environment.
3. Search existing issues first using `is:issue` and relevant keywords.
4. Attach useful logs or screenshots without exposing secrets or another person’s private data.

## Proposing features

1. Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).
2. Explain the real problem, not only the preferred solution.
3. Discuss changes that affect architecture, the data model, the API, or product scope before opening a pull request.
4. Record accepted architectural decisions in [docs/DECISIONS.md](docs/DECISIONS.md).

## Development setup

Requirements:

- Node.js 22 or newer
- pnpm 11.9.0 through Corepack
- Docker with Docker Compose

Start the development environment:

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d postgres minio
pnpm dev
```

For demo data, set `SEED_DEMO_DATA=true` in `.env` before starting the API. See [deployment](docs/DEPLOYMENT.md) and [self-hosting](docs/SELF_HOSTING.md) for the complete setup.

## Pull request workflow

1. Create a branch named `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, or another descriptive equivalent.
2. Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), for example:
   - `feat(scope): add tournament setting`
   - `fix(scope): prevent duplicate report`
   - `docs(scope): clarify self-hosting`
   - `test(scope): cover bracket reset`
   - `refactor(scope): simplify registration policy`
   - `chore(scope): update tooling`
3. Keep one pull request focused on one deliverable.
4. Complete the [pull request template](.github/PULL_REQUEST_TEMPLATE.md).
5. Link the relevant issue when one exists.

## Required checks

Run the checks relevant to your change before requesting review:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run `pnpm test:e2e` when the change affects a user flow. Add or update tests with the implementation and keep demo data working.

## Implementation rules

- Prefer small changes that can be reviewed and reverted independently.
- Explain the affected modules in the issue or pull request before making a broad change.
- Do not add a dependency without documenting why it is needed.
- Do not change architecture silently; update [docs/DECISIONS.md](docs/DECISIONS.md).
- Use database migrations for schema changes.
- Keep TypeScript strict and validate untrusted data at system boundaries.
- Enforce authorization in the API; UI restrictions are never sufficient.
- Keep secrets out of the repository and document configuration through `.env.example`.
- Ensure a clean installation still works by following the README.

## Game adapters

Read [docs/GAME_ADAPTERS.md](docs/GAME_ADAPTERS.md) and use the [game adapter proposal template](.github/ISSUE_TEMPLATE/game_adapter_proposal.md) before proposing an official adapter. Adapters are typed configuration; integrations with unauthorized third-party APIs are not accepted.

## Review expectations

Maintainers review correctness, scope, tests, documentation, security, accessibility, and consistency with recorded decisions. Constructive questions are encouraged. Large pull requests without context or tests may be returned for a smaller design discussion first.

## Documentation language policy

English is the canonical language for contributor-facing documentation, issues, pull requests, code identifiers, and new code comments. Spanish contributions are welcome: maintainers or contributors may translate them during review. The application itself supports both Spanish and English.

When behavior changes, update the affected documentation in the same pull request. A translation must preserve commands, identifiers, links, requirement IDs, ADR numbers, and technical meaning.

## Governance

See ADR-038 in [docs/DECISIONS.md](docs/DECISIONS.md). Maintainers make architectural decisions by consensus and record them in the decision log.
