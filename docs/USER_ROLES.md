# User roles

## Actors

- **Visitor:** no session; may read public tournaments, brackets, results, and public profiles.
- **Account user:** permanent email or Discord-linked account.
- **Participant-pass actor:** pseudonymous restricted session for one tournament and team.
- **Organization member:** account user with an organization role.
- **Tournament staff:** account user with a tournament-specific assignment.
- **Team member:** account user associated with a roster.

## Organization roles

| Role   | Authority                                                                            |
| ------ | ------------------------------------------------------------------------------------ |
| Owner  | Admin authority plus ownership transfer, organization deletion, and admin management |
| Admin  | Organization settings, members, teams, and tournaments                               |
| Member | Organization access and tournament creation only when policy permits                 |

A user may belong to multiple organizations. Organization deletion is soft. Organization roles do not bypass resource checks for another organization.

## Tournament roles

| Role             | Authority                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Tournament admin | Configuration, registrations, bracket, matches, staff, participant passes, disputes, and finalization |
| Referee          | Assigned disputes, private evidence, administrative result review, and rulings                        |
| Moderator        | Registration, check-in, and dispute-message support without configuration or ruling authority         |

Organization owners/admins assign tournament staff. The API evaluates the role on every resource request.

## Team roles

| Role       | Authority                                                             |
| ---------- | --------------------------------------------------------------------- |
| Captain    | Roster, registration, check-in, eligible result reports, and disputes |
| Member     | Team visibility and any explicitly delegated participant actions      |
| Substitute | Roster eligibility before roster lock                                 |

A team has one captain in the MVP. A one-player competitor is both captain and sole member of its internal team.

## Participant passes

A pass grants only the actions allowed for its tournament and participant. It does not grant organization membership, captain-level roster authority, or access to other tournaments. Staff can regenerate or revoke it, and linked sessions become invalid after revocation.

## Permission matrix

| Action                 | Visitor                | Org member       | Org admin          | Tournament admin | Captain/pass          | Referee               |
| ---------------------- | ---------------------- | ---------------- | ------------------ | ---------------- | --------------------- | --------------------- |
| Read public tournament | Yes                    | Yes              | Yes                | Yes              | Yes                   | Yes                   |
| Create organization    | First-use/account flow | Yes              | Yes                | Yes              | No                    | No                    |
| Create tournament      | No                     | Policy-dependent | Yes                | Yes within org   | No                    | No                    |
| Edit tournament        | No                     | No               | Organization scope | Yes              | No                    | No                    |
| Manage registration    | No                     | No               | Organization scope | Yes/moderator    | Own registration only | No                    |
| Check in               | No                     | Participant only | Staff override     | Yes              | Own participant       | No                    |
| Generate bracket       | No                     | No               | Organization scope | Yes              | No                    | No                    |
| Report result          | No                     | No               | Staff policy       | Staff policy     | Eligible match        | Administrative policy |
| Read evidence          | No                     | No               | Tournament scope   | Yes              | Own match only        | Assigned scope        |
| Resolve dispute        | No                     | No               | Tournament scope   | Yes              | No                    | Assigned dispute      |
| Reschedule match       | No                     | No               | Tournament scope   | Yes              | No                    | No                    |

See [AUTHORIZATION_MODEL.md](AUTHORIZATION_MODEL.md) for exact permission names and enforcement.

## Audit rules

- Membership, role, pass, result, correction, assignment, and ruling changes append audit events.
- Users cannot promote themselves.
- Unknown or conflicting roles fail closed.
