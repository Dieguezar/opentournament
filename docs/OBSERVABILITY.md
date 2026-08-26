# Observability

## Current baseline

- Structured Fastify/Pino request logs.
- Request IDs across API handling.
- Public liveness and readiness routes.
- Compose health checks.
- Domain audit data stored separately from operational logs.

## Logging contract

Logs use JSON in production and a configurable `LOG_LEVEL`. Prefer these fields when available:

- `requestId`
- `route`
- `userId`
- `organizationId`
- `tournamentId`
- `jobId`
- `error.code`

Redact passwords, cookies, authorization headers, CSRF tokens, pass tokens, and OAuth secrets. Include email only when operationally necessary and ensure error serialization does not leak it.

## Health endpoints

- `GET /healthz`: liveness plus required dependency health.
- `GET /readyz`: readiness to accept traffic.
- Compose probes web, API, PostgreSQL, and MinIO.

Health responses must not expose credentials or internal stack traces.

## Audit versus logs

- **Audit log:** append-only business actions needed for tournament and security traceability.
- **Operational logs:** short-retention diagnostics, request handling, jobs, and failures.

A log entry does not replace an audit event.

## Planned metrics

A future protected `GET /metrics` may expose:

- HTTP volume, latency, and errors by bounded route label.
- Pending, active, failed, and duration job metrics.
- SSE connections, events, and reconnects.
- Database pool and slow-query metrics.
- Presign count and upload failures.

Do not document metrics as operational until the route and collector exist.

## Tracing and alerts

OpenTelemetry is deferred. Preserve `requestId` and `traceparent` forwarding so tracing can be added without changing domain contracts.

Suggested future alerts include sustained 5xx above 1%, accumulated failed jobs, unhealthy dependencies, storage capacity, and repeated authentication abuse.
