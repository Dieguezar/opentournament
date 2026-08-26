# Security policy

OpenTournament takes security seriously. Responsible disclosure helps protect every self-hosted instance and the wider community.

## Report a vulnerability

**Do not open a public issue for a vulnerability.**

1. Use [Report a vulnerability](https://github.com/Dieguezar/opentournament/security/advisories/new) to send a private GitHub Security Advisory to the maintainers.
2. Include:
   - A description of the vulnerability and its expected impact.
   - Reproduction steps that do not expose another person’s real data.
   - The affected version and environment, such as self-hosted, Docker, and Node.js versions.
   - A proof of concept when it can be shared safely.
3. Keep the details private until the maintainers acknowledge the report and coordinate disclosure.

## Disclosure process

1. The security team acknowledges the report within 72 hours.
2. Maintainers assess severity, exploitability, and affected scope.
3. A fix and regression test are prepared.
4. The fix is published in a security release.
5. The vulnerability is disclosed afterward, with reporter credit when requested.

## Supported versions

| Version               | Supported                                             |
| --------------------- | ----------------------------------------------------- |
| Latest stable release | Yes                                                   |
| Earlier releases      | Critical vulnerabilities only, until the next release |
| Development branches  | No                                                    |

## Project security practices

- Threats and controls are documented in [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md).
- Authorization is enforced in the API, never only in the interface.
- Secrets stay outside the repository; `.env.example` contains documentation only.
- Dependabot monitors the dependency graph for vulnerabilities, malware, and compatible updates.
- Private vulnerability reporting is enabled through GitHub Security Advisories.
- Pull requests touching authentication, authorization, file uploads, or payments require a security-focused review.

## Self-hosting checklist

- Terminate HTTPS through a reverse proxy such as Caddy, Traefik, or Nginx.
- Replace every default password and secret.
- Restrict MinIO and internal service ports.
- Keep OpenTournament and its dependencies updated.
- Back up PostgreSQL and object storage.
- Review logs regularly.

See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for operational details.
