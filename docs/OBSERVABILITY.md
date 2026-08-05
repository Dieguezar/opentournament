# Observabilidad

## 1. Principios

- Logs estructurados (pino) con `requestId` en toda la cadena web → API → jobs.
- Métricas básicas exportadas para salud del servicio.
- Health checks públicos para operación.
- Auditoría de dominio separada del logging operativo.

## 2. Logs

- Formato JSON, nivel configurable (`LOG_LEVEL`).
- Campos estándar: `time`, `level`, `msg`, `requestId`, `route`, `userId`, `orgId`, `tournamentId` (cuando aplique).
- Redacción automática de secretos, contraseñas y tokens.
- Sin datos personales innecesarios (correos solo cuando el contexto lo exige y redactados en error).

## 3. Métricas (fase 1)

Con prom-client en la API:

- HTTP: requests, latencia (histograma), errores por ruta.
- Jobs: pendientes, en ejecución, fallidos, duración.
- SSE: conexiones activas, eventos emitidos, reconexiones.
- DB: pool activo/esperando, duración de queries (slow queries).
- Storage: presign generados, fallos de subida.

Exposición en `GET /metrics` (protegida en producción).

## 4. Health checks

- `GET /healthz`: estado de la API (DB, MinIO, scheduler).
- `GET /readyz`: listo para recibir tráfico.
- Compose healthchecks para cada servicio.

## 5. Auditoría vs. logs

- **AuditLog (base de datos):** acciones de dominio críticas, append-only, para trazabilidad legal/competitiva.
- **Logs (pino):** operación, depuración y errores, con retención corta.

## 6. Trazas

- OpenTelemetry diferido (AF-16): se documenta la interfaz (contexto `requestId` + headers `traceparent`) para adoptarlo sin refactor en fase 5/6.

## 7. Alertas (futuro)

- Reglas sugeridas para fase 5: rate de errores 5xx > 1%, jobs fallidos acumulados, disco/bucket, health down.

## 8. Dashboards

- Grafana con los paneles básicos (HTTP, jobs, SSE, DB) documentado como plantilla en `infrastructure/` (fase 5).
