# Changelog

All notable OpenTournament changes are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Spanish and English application interfaces with persisted language selection.
- English canonical contributor documentation and a documentation index.

### Changed

- Contributor, security, issue, and pull request guidance is now written in English.
- Data-model, engine, backlog, and architecture documentation now distinguish implemented behavior from future design.

## [1.0.0] - 2026-08-26

First stable self-hosted OpenTournament release.

### Added

- Organization, participant, and single- or double-elimination tournament management.
- Registration, check-in, seeds, BYEs, brackets, scheduling, and automatic match advancement.
- Bilateral reporting through revocable private participant passes, evidence, disputes, and audited rulings.
- Public reading without an account, organizer and participant workspaces, SSE updates, and PWA support.
- Generic, Valorant, Counter-Strike 2, League of Legends, and Super Smash Bros. Ultimate adapters.
- LoL and Smash templates, guided structured reports, and complete eight-participant demos.
- Light, dark, and system themes, responsive navigation, and automated WCAG A/AA checks.
- Docker Compose for PostgreSQL, MinIO, API, and web with optional demo data.
- CI, CodeQL, Dependabot, clean-install smoke, OWASP ZAP baseline, and semantic GHCR publishing.
- Architecture, operations, contribution, security, and governance documentation.

### Fixed

- Global browser headers for CSP, clickjacking, MIME sniffing, permissions, and cross-origin isolation.
- API and web health checks using IPv4 loopback to avoid Alpine false negatives.
- Visible public-bracket connectors and consistent tournament-status presentation.
- Serial isolation for E2E scenarios sharing servers and a database.

### Changed

- Repository security now includes private vulnerability reporting, dependency graph monitoring, and Dependabot alerts/updates.
- Self-hosting requires a session secret, keeps demo data opt-in, enforces safe verification defaults, and chains health checks.
- Compose forwards SMTP, evidence limits, rate limits, and shared MinIO credentials to the actual API configuration.
- The authenticated home page shows organizer or participant actions instead of registration prompts.
