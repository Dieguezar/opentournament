# Modelo de autorización

## 1. Principios

1. La autorización se evalúa siempre en el backend, para cada recurso, antes de cualquier operación.
2. El alcance de datos es por organización: ningún query cruza organizaciones sin permiso explícito.
3. Los roles son la fuente de permisos; no se confía en campos enviados por el cliente.
4. Las decisiones de autorización relevantes se registran en el audit log.
5. Fail-closed: ante un rol desconocido o falta de permiso, la operación se rechaza.

## 2. Autenticación (quién eres)

- Sesión: cookie httpOnly con token opaco; en base de datos sólo se conserva su hash, actor, alcance opcional y expiración.
- Pase de participante: token aleatorio mostrado una sola vez, almacenado como hash y limitado a un torneo/equipo. Crea un actor seudónimo para auditoría, puede expirar o revocarse y nunca hereda membresías de organización ni permisos del capitán real.
- CSRF: token por sesión en cabecera `X-CSRF-Token` para métodos mutantes.
- Contraseñas: Argon2id (memoria 19 MiB, iteraciones 2, paralelismo 1).
- Discord OAuth: intercambio `authorization_code`; la identidad se vincula por correo verificado coincidente (si el correo de Discord no coincide con una cuenta existente, se crea una nueva).
- Rate limiting: por IP (global) y por cuenta (login, registro, recuperación).

## 3. Catálogo de permisos

Permisos granulares asignados a roles:

| Permiso | Efecto |
| --- | --- |
| `org.manage` | Editar organización, gestionar miembros |
| `org.delete` | Soft delete de organización |
| `tournament.create` | Crear torneo en la organización |
| `tournament.manage` | Editar/cancelar torneo, staff |
| `tournament.registrations.manage` | Aprobar/rechazar inscripciones |
| `tournament.checkin.manage` | Gestionar check-in |
| `tournament.bracket.generate` | Generar/regenerar bracket |
| `tournament.finalize` | Publicar resultados finales |
| `match.manage` | Reprogramar, walkover, DQ, anular |
| `match.report` | Reportar resultado (capitán o pase restringido de la partida) |
| `match.results.confirm` | Confirmar/escalar resultados (staff) |
| `evidence.view` | Ver evidencias (staff/árbitro/partes) |
| `dispute.manage` | Asignar árbitros, gestionar disputas |
| `dispute.resolve` | Resolver disputas |
| `team.manage` | Gestionar roster del equipo (capitán) |

## 4. Mapeo rol → permisos

| Rol | Permisos |
| --- | --- |
| Org owner | Todos los `org.*` + `tournament.create` + cualquier rol de torneo |
| Org admin | `org.manage`, `tournament.create`, `tournament.manage` en torneos de la org |
| Org miembro | `tournament.create` (si la org lo permite) |
| Torneo admin | `tournament.manage`, `registrations.manage`, `checkin.manage`, `bracket.generate`, `finalize`, `match.manage`, `match.results.confirm`, `dispute.manage`, `dispute.resolve`, `evidence.view` |
| Árbitro | `dispute.resolve`, `dispute.manage` (asignado), `evidence.view`, `match.results.confirm` |
| Moderador | `registrations.manage`, `checkin.manage`, mensajes de disputas |
| Capitán | `match.report` (solo en sus partidas), `team.manage`, ver evidencias propias |
| Participante con pase | `match.report` y disputas sólo para su torneo/equipo; sin permisos de organización o roster |

## 5. Reglas de alcance de datos

- `organization_id` en todas las tablas de la organización; consultas siempre filtradas por membresía.
- Partidas: el capitán solo opera sobre partidas donde su equipo participa.
- Pases: cada request vuelve a comprobar torneo, equipo, expiración y revocación; el token viaja inicialmente en el fragmento `#token=` para no quedar en logs HTTP ni cabeceras `Referer`.
- Evidencias: privadas; acceso a staff del torneo, árbitro asignado y equipos de la partida.
- Disputas: acceso a staff, árbitro asignado y partes.
- Perfiles públicos: solo datos marcados públicos.
- Bracket público: lectura sin sesión; mutaciones solo con `tournament.manage`/`bracket.generate`.

## 6. Enforcement

- Middleware Fastify por ruta: `requireAuth`, `requireOrgRole(orgId, 'admin')`, `requireTournamentRole(tournamentId, ['admin','referee'])`, `requireMatchParticipant(matchId)`.
- Chequeo de permisos con un helper central (`can(actor, permiso, recurso)`) alimentado por el rol efectivo.
- El rol efectivo se resuelve como: rol de torneo (si existe) + rol de organización (base). El rol de torneo no puede elevarse por encima del rol de organización (un miembro no puede ser admin de torneo sin permiso del org admin).

## 7. Casos de abuso cubiertos

| Ataque | Control |
| --- | --- |
| IDOR (acceder a recurso de otra org) | Filtro por `organization_id` + membresía |
| Escalamiento de privilegios | Roles otorgados solo por owner/admin; validación de rol efectivo |
| Reporte de resultado de partida ajena | `requireMatchParticipant` |
| Resolver disputa sin ser árbitro | `dispute.resolve` + asignación |
| Ver evidencias privadas | `evidence.view` + alcance |
| Regenerar bracket después de partidas jugadas | Regla de negocio del motor (solo antes de la primera partida) |
| Autopromoción | Las rutas de roles exigen actor con permiso y nunca al propio actor como objetivo |

## 8. Auditoría de autorización

- Eventos auditados: login/registro, cambios de rol, invitaciones, cambios de configuración sensible, reportes/confirmaciones, correcciones, asignaciones de árbitros, resoluciones.
- El audit log es append-only (sin endpoints de edición).

Detalle de amenazas y controles completos: [docs/SECURITY_MODEL.md](SECURITY_MODEL.md).
