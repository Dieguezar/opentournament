# Diseño de API

## 1. Convenciones

- API REST bajo `/api/v1`, servida por Fastify (`apps/api`).
- JSON; `Content-Type: application/json`. Las subidas de archivos usan multipart o URLs firmadas (S3 presign).
- Autenticación: cookie de sesión httpOnly (`session`); token CSRF en cabecera `X-CSRF-Token` para mutaciones.
- Errores: envelope consistente:

```json
{
  "error": {
    "code": "MATCH_RESULT_CONFLICT",
    "message": "Los reportes no coinciden",
    "details": { "reportedBy": ["team-a", "team-b"] }
  }
}
```

- Paginación: `?cursor=` (cursor opaque) + `limit` (máx. 100); respuesta `{ items, nextCursor }`.
- Idempotencia: mutaciones que generan recursos aceptan `Idempotency-Key` (defecto: no requerido, excepto reportes de resultados y subidas).
- Versión en la URL; cambios breaking requieren `/api/v2` o nueva versión de release.
- Documentación OpenAPI generada desde el código (`@fastify/swagger`), disponible en `/docs` en desarrollo.

## 2. Autenticación

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/register` | Registro con correo + contraseña |
| POST | `/auth/login` | Inicio de sesión (correo) |
| POST | `/auth/logout` | Cierre de sesión |
| POST | `/auth/forgot-password` | Solicita recuperación |
| POST | `/auth/reset-password` | Resetea contraseña con token |
| GET | `/auth/discord` | Inicia flujo OAuth Discord |
| GET | `/auth/discord/callback` | Callback OAuth Discord |
| GET | `/auth/me` | Perfil y sesión actual |
| PATCH | `/auth/me` | Editar perfil |
| GET | `/auth/me/notifications` | Bandeja de notificaciones |

## 3. Organizaciones

| Método | Ruta | Roles |
| --- | --- | --- |
| POST | `/organizations` | Autenticado (crea la primera vía wizard si no existe) |
| GET | `/organizations` | Autenticado (las suyas) |
| GET | `/organizations/:orgId` | Miembro |
| PATCH | `/organizations/:orgId` | Org admin |
| DELETE | `/organizations/:orgId` | Org owner (soft delete) |
| GET/POST | `/organizations/:orgId/members` | Miembro / admin |
| PATCH/DELETE | `/organizations/:orgId/members/:userId` | Org admin |
| GET | `/organizations/:orgId/tournaments` | Público (solo públicos) |

## 4. Equipos

| Método | Ruta | Roles |
| --- | --- | --- |
| POST | `/teams` | Autenticado (crea equipo permanente) |
| GET | `/teams/:teamId` | Miembro o público (perfil de equipo) |
| PATCH | `/teams/:teamId` | Capitán |
| POST | `/teams/:teamId/members` | Capitán (invita) |
| DELETE | `/teams/:teamId/members/:userId` | Capitán |
| POST | `/teams/:teamId/join` | Autenticado (por invitación o link) |

## 5. Torneos

| Método | Ruta | Roles |
| --- | --- | --- |
| POST | `/tournaments` | Org member/admin |
| GET | `/tournaments/:tournamentId` | Público (si es público) |
| PATCH | `/tournaments/:tournamentId` | Torneo admin |
| DELETE | `/tournaments/:tournamentId` | Torneo admin (soft delete) |
| POST | `/tournaments/:tournamentId/publish` | Torneo admin |
| POST | `/tournaments/:tournamentId/cancel` | Torneo admin |
| GET | `/tournaments/:tournamentId/staff` | Público (roles visibles) |
| POST | `/tournaments/:tournamentId/staff` | Org admin / torneo admin |
| DELETE | `/tournaments/:tournamentId/staff/:userId` | Org admin / torneo admin |

### Inscripciones

| Método | Ruta | Roles |
| --- | --- | --- |
| POST | `/tournaments/:id/registrations` | Capitán |
| GET | `/tournaments/:id/registrations` | Staff |
| PATCH | `/tournaments/:id/registrations/:regId` | Staff (aprobar/rechazar) |
| DELETE | `/tournaments/:id/registrations/:regId` | Capitán o staff |

### Check-in y bracket

| Método | Ruta | Roles |
| --- | --- | --- |
| POST | `/tournaments/:id/check-in` | Capitán (por equipo) |
| GET | `/tournaments/:id/check-in/status` | Staff |
| POST | `/tournaments/:id/bracket/generate` | Torneo admin |
| GET | `/tournaments/:id/bracket` | Público |
| POST | `/tournaments/:id/finalize` | Torneo admin (publica resultados finales) |

### Partidas

| Método | Ruta | Roles |
| --- | --- | --- |
| GET | `/matches/:matchId` | Público (estado y resultado) |
| PATCH | `/matches/:matchId` | Torneo admin (horario, lobby, maps, reprogramación) |
| POST | `/matches/:matchId/reschedule` | Torneo admin |
| POST | `/matches/:matchId/walkover` | Torneo admin |
| POST | `/matches/:matchId/disqualify` | Torneo admin |
| POST | `/matches/:matchId/void` | Torneo admin (anular resultado) |

### Resultados y evidencias

| Método | Ruta | Roles |
| --- | --- | --- |
| POST | `/matches/:matchId/results` | Capitán de equipo participante |
| GET | `/matches/:matchId/results` | Staff y partes |
| POST | `/results/:resultId/evidence` | Capitán (sube captura/link) |
| GET | `/results/:resultId/evidence` | Staff y partes |
| POST | `/files/presign` | Autenticado (genera URL firmada) |

### Disputas

| Método | Ruta | Roles |
| --- | --- | --- |
| POST | `/disputes` | Capitán o sistema (diferencia de reportes) |
| GET | `/disputes/:disputeId` | Staff, árbitros y partes |
| POST | `/disputes/:disputeId/messages` | Partes y staff |
| PATCH | `/disputes/:disputeId/assignee` | Torneo admin (asigna árbitro) |
| POST | `/disputes/:disputeId/resolve` | Árbitro/admin (resolución) |

## 6. Eventos en tiempo real (SSE)

- `GET /events` con cookie de sesión; eventos autenticados por canal (`user:<id>`, `org:<id>`, `tournament:<id>`).
- `GET /events/public?tournament=<id>` para eventos públicos del torneo (sin sesión).
- Formato: `event: <tipo>` + `id: <event-id>` + `data: <json>`.
- Tipos de evento: `tournament.updated`, `bracket.updated`, `match.updated`, `result.confirmed`, `dispute.updated`, `notification.created`.
- Reconexión con `Last-Event-ID` para recuperar eventos perdidos (cola corta en memoria + recarga de estado).

## 7. Discord

- `POST /discord/interactions` (interacciones del bot, verificación de firma).
- `POST /discord/notify` (interno, usado por el módulo del bot).
- El bot se conecta al gateway de Discord dentro del proceso de la API (módulo, ADR-030).

## 8. Webhooks

- Diferidos a fases posteriores (fuera del MVP). El modelo de datos prevé `Webhook` sin exponer API todavía.

## 9. Reglas de consistencia

- Todas las mutaciones del motor (bracket, resultados, disputas) ocurren en una transacción de base de datos con versionado optimista.
- Los resultados solo se aplican una vez (idempotencia por `matchId` + `reportedBy`).
- Las correcciones administrativas exigen `reason` obligatorio y generan evento de auditoría.
