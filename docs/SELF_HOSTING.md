# Self-hosting OpenTournament

## Requirements

- Docker with Docker Compose v2.
- At least 2 vCPU, 2 GB RAM, and 20 GB of disk.
- A domain and TLS through a reverse proxy for production.
- Node.js 22+ and pnpm only when developing from source; release-image installations do not require them.

## Quick installation

### Build from source

```bash
git clone https://github.com/Dieguezar/opentournament.git
cd opentournament
cp .env.example .env
openssl rand -hex 32
# Put the generated value in SESSION_SECRET inside .env
docker compose up -d
```

The default `.env.example` uses `IMAGE_PULL_POLICY=build`, so Compose builds the local checkout.

If OpenSSL is unavailable, generate a 32-byte hexadecimal secret with Docker:

```bash
docker run --rm alpine:3.22 sh -c "head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'"
```

### Use release images

Pin both the repository checkout and images to the same exact release. For `v1.0.0`:

```bash
git checkout v1.0.0
```

Set:

```dotenv
API_IMAGE=ghcr.io/dieguezar/opentournament-api:1.0.0
WEB_IMAGE=ghcr.io/dieguezar/opentournament-web:1.0.0
IMAGE_PULL_POLICY=always
```

Then start without local builds:

```bash
docker compose up -d --no-build
```

Pin `X.Y.Z`, not `latest`, so updates remain explicit and reversible.

## First start

`SESSION_SECRET` is required in Compose, and the API rejects the example value in production. Containers use `COMPOSE_NODE_ENV=production`. Demo data and unverified accounts are disabled by default; enable `SEED_DEMO_DATA=true` and `ALLOW_UNVERIFIED_EMAILS=true` only for a deliberate private evaluation.

`DATABASE_URL` and `S3_ENDPOINT` are used by host-side development tools. `DATABASE_URL_DOCKER` and `S3_ENDPOINT_DOCKER` are used inside Compose, where the service names are `postgres` and `minio`. When changing the internal PostgreSQL password, update `DATABASE_URL_DOCKER` too. A hexadecimal password avoids URL-escaping problems.

1. Open `http://localhost:3000` or the configured domain.
2. Complete the first-use wizard to create the account and first organization.
3. Check the API at `GET /healthz`.

Without SMTP, the API writes verification links to its logs. Read them with `docker compose logs api`; do not enable unverified accounts on a public instance just to avoid configuring email.

## Occupied ports

Compose binds host ports to `127.0.0.1`. Every host port can be changed in `.env` without changing the internal container ports.

If PostgreSQL already uses `5432`:

```dotenv
POSTGRES_HOST_PORT=15432
```

The other overrides are `MINIO_API_HOST_PORT`, `MINIO_CONSOLE_HOST_PORT`, `API_HOST_PORT`, and `WEB_HOST_PORT`. When changing web or API ports, update `APP_URL` or `API_URL`. Host-side development tools also require the matching `DATABASE_URL`.

## Optional services

### Email through SMTP

- With SMTP, OpenTournament sends verification and password-recovery email.
- Compose forwards every `SMTP_*` variable to the API.
- Without SMTP, messages are logged.
- A private instance may explicitly use `ALLOW_UNVERIFIED_EMAILS=true`; production should keep it false.

### Discord

1. Create an application in the Discord Developer Portal.
2. Add `${API_URL}/api/v1/auth/discord/callback` as the OAuth2 redirect URI with `identify email` scopes.
3. Create a bot token with only the required message permissions.
4. Configure `DISCORD_*` in `.env` and restart the stack.

Discord is optional. Participant passes and email accounts continue to work without it.

### Object storage

- Development uses MinIO with local defaults.
- `S3_ACCESS_KEY` and `S3_SECRET_KEY` configure both MinIO and the API client; change them together before exposing an instance.
- Production may point `S3_*` to Cloudflare R2, Amazon S3, or another compatible provider.
- The `S3_BUCKET` stores public and private objects under separate prefixes.

## Production hardening checklist

- [ ] HTTPS enabled through Caddy, Traefik, or Nginx with HTTP redirects.
- [ ] Every `.env` secret is unique and sufficiently long.
- [ ] `COMPOSE_NODE_ENV=production` and `SEED_DEMO_DATA=false`.
- [ ] MinIO and PostgreSQL credentials changed.
- [ ] PostgreSQL and MinIO are not exposed outside the private network.
- [ ] `ALLOW_UNVERIFIED_EMAILS=false`, unless a documented private-instance decision says otherwise.
- [ ] PostgreSQL and object-storage backups configured and restoration tested.
- [ ] Logs reviewed regularly.
- [ ] Security releases applied promptly.

## Backup and restore

```bash
# PostgreSQL
docker compose exec postgres pg_dump -U opentournament opentournament > backup.sql

# MinIO
docker compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker compose exec minio mc mirror --overwrite local/opentournament ./backup-bucket
```

To restore, stop dependent services, restore the PostgreSQL dump with `psql`, restore the bucket, and restart the stack. Test this process outside production.

### Update a release-image installation

1. Read the changelog and back up PostgreSQL and MinIO.
2. Change `API_IMAGE` and `WEB_IMAGE` to the new exact version.
3. Run `docker compose pull api web`.
4. Run `docker compose up -d --no-build`.
5. Verify `/healthz`, login, and one public tournament.

## Troubleshooting

| Symptom                       | Likely cause                                    | Action                                      |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------- |
| Compose cannot publish a port | The host port is already occupied               | Change the matching `*_HOST_PORT` in `.env` |
| API does not start            | Invalid database URL or PostgreSQL is not ready | Inspect Compose health and API logs         |
| API rejects `SESSION_SECRET`  | The example value is still configured           | Generate a 32-byte hexadecimal secret       |
| Discord login fails           | Incorrect redirect URI                          | Verify `DISCORD_REDIRECT_URI`               |
| Uploads fail                  | Missing bucket or invalid S3 credentials        | Create the bucket and verify `S3_*`         |
| Email does not arrive         | SMTP is not configured                          | Inspect API logs for the generated message  |
| Public page is slow           | SSR or cache configuration                      | Review NFR-PERF-05 and cache settings       |

## Support

- Use GitHub issues for reproducible bugs and installation questions.
- Report vulnerabilities through [SECURITY.md](../SECURITY.md).
- Community-maintained platform guides may cover VPS, NAS, and other Docker hosts.
