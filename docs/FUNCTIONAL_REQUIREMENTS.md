# Functional requirements

IDs use `FR-<module>-<number>`. **P0** blocks a stable core release, **P1** is important, and **P2** is desirable. Priority expresses product intent, not implementation status. Detailed acceptance scenarios belong in [BACKLOG.md](BACKLOG.md).

## FR-AUTH — Accounts and access

| ID         | Requirement                                                                               | Priority |
| ---------- | ----------------------------------------------------------------------------------------- | -------- |
| FR-AUTH-01 | Register with email/password using Argon2id and verify email when SMTP is configured      | P0       |
| FR-AUTH-02 | Optionally sign in with Discord OAuth and link identities through verified matching email | P1       |
| FR-AUTH-03 | Recover a password by delivered email or logged development token                         | P0       |
| FR-AUTH-04 | Use an HTTP-only session cookie and CSRF token with configurable expiration               | P0       |
| FR-AUTH-05 | Sign out and revoke sessions                                                              | P0       |
| FR-AUTH-06 | Rate-limit authentication by IP and account                                               | P0       |
| FR-AUTH-07 | Edit display name and avatar                                                              | P1       |
| FR-AUTH-08 | Exchange a revocable private participant pass for a restricted tournament/team session    | P0       |
| FR-AUTH-09 | Select Spanish or English and persist the preference                                      | P0       |

## FR-ORG — Organizations and roles

| ID        | Requirement                                                        | Priority |
| --------- | ------------------------------------------------------------------ | -------- |
| FR-ORG-01 | First-use flow creates an account and first owner organization     | P0       |
| FR-ORG-02 | Manage organization members with owner, admin, and member roles    | P0       |
| FR-ORG-03 | Assign tournament admins, referees, and moderators                 | P0       |
| FR-ORG-04 | Edit organization name, logo, description, and settings            | P1       |
| FR-ORG-05 | Soft-delete an organization through an owner-only confirmed action | P2       |
| FR-ORG-06 | Audit membership and role changes                                  | P0       |

## FR-TEAM — Teams and individual players

| ID         | Requirement                                                         | Priority |
| ---------- | ------------------------------------------------------------------- | -------- |
| FR-TEAM-01 | Create a permanent team with captain, members, and substitutes      | P0       |
| FR-TEAM-02 | Create a tournament-specific team or one-player profile             | P0       |
| FR-TEAM-03 | Validate roster limits and identifiers against the adapter          | P0       |
| FR-TEAM-04 | Add or invite account users to a roster                             | P1       |
| FR-TEAM-05 | Prevent unsafe roster changes after competition lock                | P0       |
| FR-TEAM-06 | Represent an individual tournament participant as a one-player team | P0       |

## FR-TOUR — Tournament setup

| ID         | Requirement                                                                                       | Priority |
| ---------- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-TOUR-01 | Create a tournament with organization, adapter, format, schedule, rules, capacity, and visibility | P0       |
| FR-TOUR-02 | Configure adapter-valid series, draws, and externally agreed maps/stages                          | P0       |
| FR-TOUR-03 | Configure registration approval and window                                                        | P0       |
| FR-TOUR-04 | Configure check-in window and delay tolerance                                                     | P0       |
| FR-TOUR-05 | Configure result-confirmation and dispute windows                                                 | P1       |
| FR-TOUR-06 | Publish a tournament through an SSR public page                                                   | P0       |
| FR-TOUR-07 | Edit safe configuration before matches begin                                                      | P1       |
| FR-TOUR-08 | Cancel a tournament and notify affected participants                                              | P1       |
| FR-TOUR-09 | Apply and restore a versioned game template without overwriting tournament identity               | P0       |

## FR-REG — Registration

| ID        | Requirement                                                       | Priority |
| --------- | ----------------------------------------------------------------- | -------- |
| FR-REG-01 | Register a participant with automatic or manual approval          | P0       |
| FR-REG-02 | Maintain a FIFO waiting list when capacity is full                | P1       |
| FR-REG-03 | Allow staff to approve, reject, waitlist, or cancel registrations | P0       |
| FR-REG-04 | Reject duplicate participants and invalid rosters                 | P0       |
| FR-REG-05 | Show registration state to participants and staff                 | P0       |

## FR-CHK — Check-in

| ID        | Requirement                                                   | Priority |
| --------- | ------------------------------------------------------------- | -------- |
| FR-CHK-01 | Check in an eligible participant during the configured window | P0       |
| FR-CHK-02 | Close check-in through a durable job and apply absence policy | P0       |
| FR-CHK-03 | Apply configurable delay tolerance                            | P0       |
| FR-CHK-04 | Show check-in state to staff                                  | P1       |

## FR-BRK — Brackets and engine

| ID        | Requirement                                                                   | Priority |
| --------- | ----------------------------------------------------------------------------- | -------- |
| FR-BRK-01 | Generate single-elimination brackets with seeds and BYEs                      | P0       |
| FR-BRK-02 | Generate double-elimination winners/losers/final brackets with optional reset | P0       |
| FR-BRK-03 | Support random ordering and manual seeds                                      | P0       |
| FR-BRK-04 | Advance the bracket after a confirmed result                                  | P0       |
| FR-BRK-05 | Audit void, disqualification, walkover, and other administrative corrections  | P0       |
| FR-BRK-06 | Publish final podium and standings                                            | P1       |

## FR-MCH — Matches

| ID        | Requirement                                                                   | Priority |
| --------- | ----------------------------------------------------------------------------- | -------- |
| FR-MCH-01 | Schedule a match with date/time and optional lobby URL                        | P0       |
| FR-MCH-02 | Record externally agreed map or stage order                                   | P1       |
| FR-MCH-03 | Allow staff to reschedule with a reason                                       | P0       |
| FR-MCH-04 | Apply a walkover or disqualification                                          | P0       |
| FR-MCH-05 | Represent scheduled, active, finalized, disputed, voided, and walkover states | P0       |

## FR-RES — Results

| ID        | Requirement                                                                  | Priority |
| --------- | ---------------------------------------------------------------------------- | -------- |
| FR-RES-01 | Enforce bilateral, winner-only, or staff-only reporting per tournament       | P0       |
| FR-RES-02 | Confirm a valid result automatically when the configured policy is satisfied | P0       |
| FR-RES-03 | Escalate an expired or conflicting report to staff                           | P1       |
| FR-RES-04 | Keep confirmed results immutable except through audited correction           | P0       |
| FR-RES-05 | Allow draws only when the adapter permits them                               | P0       |
| FR-RES-06 | Validate and store typed LoL or Smash per-game detail when provided          | P0       |

## FR-EV — Evidence

| ID       | Requirement                                                                   | Priority |
| -------- | ----------------------------------------------------------------------------- | -------- |
| FR-EV-01 | Upload screenshots within configured size/count limits through presigned URLs | P0       |
| FR-EV-02 | Attach validated external links                                               | P1       |
| FR-EV-03 | Keep evidence private to eligible staff and match parties                     | P0       |
| FR-EV-04 | List evidence within match and dispute scope                                  | P1       |

## FR-DIS — Disputes and arbitration

| ID        | Requirement                                                                    | Priority |
| --------- | ------------------------------------------------------------------------------ | -------- |
| FR-DIS-01 | Open a dispute from conflicting reports, participant request, or system action | P0       |
| FR-DIS-02 | Support open, in-review, and resolved states with messages and history         | P0       |
| FR-DIS-03 | Assign and notify a referee                                                    | P0       |
| FR-DIS-04 | Record a final score/draw, rationale, and considered evidence                  | P0       |
| FR-DIS-05 | Apply the ruling to the engine in an audited transaction                       | P0       |
| FR-DIS-06 | Preserve actors, timestamps, messages, and changes                             | P0       |

## FR-PUB — Public experience

| ID        | Requirement                                                                                   | Priority |
| --------- | --------------------------------------------------------------------------------------------- | -------- |
| FR-PUB-01 | SSR public tournament page with rules, participants, bracket, results, standings, and streams | P0       |
| FR-PUB-02 | Live public updates through SSE                                                               | P0       |
| FR-PUB-03 | Installable PWA with read caching                                                             | P0       |
| FR-PUB-04 | Public participant/team summaries                                                             | P1       |
| FR-PUB-05 | Spanish and English rendering for public and authenticated flows                              | P0       |

## FR-DISCD — Optional Discord

| ID          | Requirement                                                        | Priority |
| ----------- | ------------------------------------------------------------------ | -------- |
| FR-DISCD-01 | Enable Discord OAuth only when configured                          | P1       |
| FR-DISCD-02 | Send configured match, result, dispute, and check-in notifications | P1       |
| FR-DISCD-03 | Provide `/checkin` and `/status` commands when the bot is enabled  | P2       |
| FR-DISCD-04 | Disable cleanly when `DISCORD_*` variables are absent              | P0       |

## FR-NTF — Notifications

| ID        | Requirement                                          | Priority |
| --------- | ---------------------------------------------------- | -------- |
| FR-NTF-01 | Show an in-app notification inbox and unread state   | P1       |
| FR-NTF-02 | Deliver through available email and Discord channels | P1       |
| FR-NTF-03 | Store user notification preferences                  | P2       |

## FR-JOB — Durable jobs

| ID        | Requirement                                            | Priority |
| --------- | ------------------------------------------------------ | -------- |
| FR-JOB-01 | Close check-in and apply walkovers                     | P0       |
| FR-JOB-02 | Send check-in and match reminders                      | P1       |
| FR-JOB-03 | Escalate result confirmation timeouts                  | P1       |
| FR-JOB-04 | Notify referees of assigned disputes                   | P1       |
| FR-JOB-05 | Send verification and recovery messages asynchronously | P0       |
| FR-JOB-06 | Activate or finish scheduled tournament stages         | P2       |

## FR-AUD — Audit

| ID        | Requirement                                                                                               | Priority |
| --------- | --------------------------------------------------------------------------------------------------------- | -------- |
| FR-AUD-01 | Append critical authentication, role, registration, result, dispute, correction, and configuration events | P0       |
| FR-AUD-02 | Preserve engine domain events required for traceability                                                   | P0       |
| FR-AUD-03 | Expose no API for editing audit history                                                                   | P0       |
