# API design

## Conventions

- REST API under `/api/v1`, served by Fastify in `apps/api`.
- JSON uses `Content-Type: application/json`; file uploads use multipart requests or presigned S3 URLs.
- Authentication uses an HTTP-only `session` cookie. Mutating requests require a CSRF token in `X-CSRF-Token`.
- Errors use a stable machine-readable envelope:

```json
{
  "error": {
    "code": "MATCH_RESULT_CONFLICT",
    "message": "The submitted reports do not match",
    "details": { "reportedBy": ["team-a", "team-b"] }
  }
}
```

- Pagination uses opaque `cursor` values and a `limit` no greater than 100, returning `{ items, nextCursor }`.
- Resource-creating mutations accept `Idempotency-Key`; it is required for result reports and uploads.
- Breaking changes require `/api/v2` or a new major release.
- Code-generated OpenAPI documentation is available at `/docs` in development.

The error `code`, not the human-readable `message`, is the stable client contract. Stable codes are declared in `packages/shared-types/src/index.ts`; browser translations live in `apps/web/lib/api-error-messages.ts`. The API keeps its fallback messages in English, while clients localize known codes and only use the server message as an English fallback.

## Authentication

| Method | Route                    | Purpose                                          |
| ------ | ------------------------ | ------------------------------------------------ |
| POST   | `/auth/register`         | Register with email and password                 |
| POST   | `/auth/login`            | Sign in with email                               |
| POST   | `/auth/participant-pass` | Exchange a private pass for a restricted session |
| POST   | `/auth/logout`           | End the current session                          |
| POST   | `/auth/forgot-password`  | Request password recovery                        |
| POST   | `/auth/reset-password`   | Reset a password with a token                    |
| GET    | `/auth/discord`          | Start optional Discord OAuth                     |
| GET    | `/auth/discord/callback` | Complete Discord OAuth                           |
| GET    | `/auth/me`               | Read the current profile and session             |
| PATCH  | `/auth/me`               | Update the profile                               |
| GET    | `/auth/me/notifications` | List notifications                               |

## Organizations

| Method       | Route                                   | Required access                       |
| ------------ | --------------------------------------- | ------------------------------------- |
| POST         | `/organizations`                        | Authenticated user                    |
| GET          | `/organizations`                        | Authenticated user; own organizations |
| GET          | `/organizations/:orgId`                 | Organization member                   |
| PATCH        | `/organizations/:orgId`                 | Organization admin                    |
| DELETE       | `/organizations/:orgId`                 | Organization owner; soft delete       |
| GET/POST     | `/organizations/:orgId/members`         | Member to read, admin to write        |
| PATCH/DELETE | `/organizations/:orgId/members/:userId` | Organization admin                    |
| GET          | `/organizations/:orgId/tournaments`     | Public tournaments are public         |

## Teams and players

| Method | Route                            | Required access                    |
| ------ | -------------------------------- | ---------------------------------- |
| POST   | `/teams`                         | Authenticated user                 |
| GET    | `/teams/:teamId`                 | Member or public profile access    |
| PATCH  | `/teams/:teamId`                 | Captain                            |
| POST   | `/teams/:teamId/members`         | Captain                            |
| DELETE | `/teams/:teamId/members/:userId` | Captain                            |
| POST   | `/teams/:teamId/join`            | Authenticated user with invitation |

Individual competitors use the same participant model with a one-player team internally.

## Tournaments

| Method   | Route                                              | Required access                             |
| -------- | -------------------------------------------------- | ------------------------------------------- |
| POST     | `/tournaments`                                     | Organization member or admin                |
| GET      | `/tournaments/:tournamentId`                       | Public when the tournament is public        |
| PATCH    | `/tournaments/:tournamentId`                       | Tournament admin                            |
| DELETE   | `/tournaments/:tournamentId`                       | Tournament admin; soft delete               |
| POST     | `/tournaments/:tournamentId/publish`               | Tournament admin                            |
| POST     | `/tournaments/:tournamentId/cancel`                | Tournament admin                            |
| GET      | `/tournaments/:tournamentId/staff`                 | Public visible roles                        |
| POST     | `/tournaments/:tournamentId/staff`                 | Organization or tournament admin            |
| DELETE   | `/tournaments/:tournamentId/staff/:userId`         | Organization or tournament admin            |
| GET/POST | `/tournaments/:tournamentId/access-passes`         | Tournament admin                            |
| DELETE   | `/tournaments/:tournamentId/access-passes/:passId` | Tournament admin; revokes pass and sessions |

### Registration

| Method | Route                                   | Required access             |
| ------ | --------------------------------------- | --------------------------- |
| POST   | `/tournaments/:id/registrations`        | Captain                     |
| GET    | `/tournaments/:id/registrations`        | Staff                       |
| PATCH  | `/tournaments/:id/registrations/:regId` | Staff approval or rejection |
| DELETE | `/tournaments/:id/registrations/:regId` | Captain or staff            |

### Check-in and bracket

| Method | Route                               | Required access             |
| ------ | ----------------------------------- | --------------------------- |
| POST   | `/tournaments/:id/check-in`         | Captain for own participant |
| GET    | `/tournaments/:id/check-in/status`  | Staff                       |
| POST   | `/tournaments/:id/bracket/generate` | Tournament admin            |
| GET    | `/tournaments/:id/bracket`          | Public                      |
| POST   | `/tournaments/:id/finalize`         | Tournament admin            |

### Matches

| Method | Route                          | Required access                         |
| ------ | ------------------------------ | --------------------------------------- |
| GET    | `/matches/:matchId`            | Public state and confirmed result       |
| PATCH  | `/matches/:matchId`            | Tournament admin                        |
| POST   | `/matches/:matchId/reschedule` | Tournament admin                        |
| POST   | `/matches/:matchId/walkover`   | Tournament admin                        |
| POST   | `/matches/:matchId/disqualify` | Tournament admin                        |
| POST   | `/matches/:matchId/void`       | Tournament admin; void confirmed result |

### Results and evidence

| Method | Route                         | Required access                                                           |
| ------ | ----------------------------- | ------------------------------------------------------------------------- |
| POST   | `/matches/:matchId/results`   | Captain, participant pass, or staff according to `settings.reportingMode` |
| GET    | `/matches/:matchId/results`   | Staff and match parties                                                   |
| POST   | `/results/:resultId/evidence` | Captain or eligible party                                                 |
| GET    | `/results/:resultId/evidence` | Staff and match parties                                                   |
| POST   | `/files/presign`              | Authenticated actor                                                       |

### Disputes

| Method | Route                           | Required access                               |
| ------ | ------------------------------- | --------------------------------------------- |
| POST   | `/disputes`                     | Captain, participant pass, or system conflict |
| GET    | `/disputes/:disputeId`          | Staff, assigned referee, and parties          |
| POST   | `/disputes/:disputeId/messages` | Parties and staff                             |
| PATCH  | `/disputes/:disputeId/assignee` | Tournament admin                              |
| POST   | `/disputes/:disputeId/resolve`  | Assigned referee or admin                     |

## Server-Sent Events

- `GET /events`: authenticated channels such as `user:<id>`, `org:<id>`, and `tournament:<id>`.
- `GET /events/public?tournament=<id>`: public tournament events without a session.
- Wire format: `event: <type>`, `id: <event-id>`, and `data: <json>`.
- Event types include `tournament.updated`, `bracket.updated`, `match.updated`, `result.confirmed`, `dispute.updated`, and `notification.created`.
- `Last-Event-ID` supports short-gap recovery followed by a state refresh.

## Discord and webhooks

- `POST /discord/interactions` verifies Discord signatures.
- `POST /discord/notify` is an internal bot-module endpoint.
- The bot connects to the Discord gateway from the API process (ADR-030).
- General-purpose webhooks are outside the MVP; a future data model may add them.

## Consistency rules

- Bracket, result, and dispute mutations run inside database transactions with optimistic versioning.
- A report applies once per `matchId` and reporting actor.
- Administrative corrections require a reason and append an audit event.
- Public endpoints never expose private evidence, session material, or access-pass secrets.
