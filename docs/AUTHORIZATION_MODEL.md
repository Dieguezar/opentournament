# Authorization model

## Principles

1. The API authorizes every operation against the requested resource.
2. Organization data never crosses organization boundaries without explicit permission.
3. Server-resolved roles grant permissions; client-provided role fields are never trusted.
4. Important authorization decisions append audit events.
5. Unknown roles and missing permissions fail closed.

## Authentication actors

- **Account session:** opaque token in an HTTP-only cookie; the database stores only its hash, actor, optional scope, and expiration.
- **Participant pass:** random secret shown once and stored as a hash. It is restricted to one tournament and participant, creates a pseudonymous audit actor, may expire or be revoked, and never inherits organization membership.
- **CSRF:** mutating methods require the session token through `X-CSRF-Token`.
- **Password:** Argon2id with 19 MiB memory, two iterations, and parallelism 1.
- **Discord OAuth:** authorization-code exchange. A verified matching email may link an identity; otherwise a separate account is created.
- **Rate limits:** global by IP and stricter by account and IP for authentication routes.

## Permission catalog

| Permission                        | Effect                                       |
| --------------------------------- | -------------------------------------------- |
| `org.manage`                      | Edit the organization and manage members     |
| `org.delete`                      | Soft-delete the organization                 |
| `tournament.create`               | Create a tournament in the organization      |
| `tournament.manage`               | Edit or cancel a tournament and manage staff |
| `tournament.registrations.manage` | Approve or reject registrations              |
| `tournament.checkin.manage`       | Manage check-in                              |
| `tournament.bracket.generate`     | Generate or regenerate a bracket             |
| `tournament.finalize`             | Publish final results                        |
| `match.manage`                    | Reschedule, walk over, disqualify, or void   |
| `match.report`                    | Report a result for an eligible match        |
| `match.results.confirm`           | Confirm or escalate results                  |
| `evidence.view`                   | View evidence within scope                   |
| `dispute.manage`                  | Assign referees and manage disputes          |
| `dispute.resolve`                 | Resolve an assigned dispute                  |
| `team.manage`                     | Manage a team roster                         |

## Role mapping

| Role                | Effective permissions                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| Organization owner  | Every `org.*` permission, tournament creation, and authority to assign tournament roles      |
| Organization admin  | `org.manage`, `tournament.create`, and tournament management within the organization         |
| Organization member | `tournament.create` only when organization policy allows it                                  |
| Tournament admin    | Tournament, registration, check-in, bracket, match, result, evidence, and dispute management |
| Referee             | Assigned dispute management and resolution, evidence view, and result confirmation           |
| Moderator           | Registration and check-in management plus dispute messages                                   |
| Captain             | Own-match reporting, own roster management, and own evidence                                 |
| Participant pass    | Reporting and disputes only for its tournament and participant                               |

## Data-scope rules

- Organization-owned tables carry `organization_id`; queries filter by organization membership.
- Captains operate only on matches containing their participant.
- Every participant-pass request rechecks tournament, participant, expiration, and revocation.
- A pass begins in the URL fragment `#token=`, keeping it out of HTTP logs and `Referer` headers.
- Evidence is private to tournament staff, the assigned referee, and match parties.
- Disputes are visible to staff, the assigned referee, and parties.
- Public profiles expose only explicitly public fields.
- Public brackets are readable without a session; mutations require management permissions.

## Enforcement

Fastify routes use helpers such as `requireAuth`, `requireOrgRole`, `requireTournamentRole`, and `requireMatchParticipant`. A central `can(actor, permission, resource)` helper evaluates the effective role.

The effective role combines organization and tournament assignments. A tournament role cannot silently exceed organization policy; an organization admin must grant elevated tournament authority.

## Covered abuse cases

| Attack                                | Control                                                          |
| ------------------------------------- | ---------------------------------------------------------------- |
| Cross-organization IDOR               | `organization_id` filter plus membership                         |
| Privilege escalation                  | Protected role assignment and effective-role checks              |
| Reporting another participant’s match | Match-participant scope check                                    |
| Resolving an unassigned dispute       | `dispute.resolve` plus assignment                                |
| Reading private evidence              | `evidence.view` plus resource scope                              |
| Regenerating an active bracket        | Engine rule blocks regeneration after play begins                |
| Self-promotion                        | Role routes require a privileged actor and reject unsafe targets |

## Authorization audit

The append-only audit log records authentication events, role changes, invitations, sensitive configuration changes, reports, confirmations, corrections, referee assignments, and rulings.

See [SECURITY_MODEL.md](SECURITY_MODEL.md) for the complete threat model.
