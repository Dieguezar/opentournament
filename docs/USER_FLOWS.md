# User flows

These flows describe the intended user experience. Optional channels such as Discord appear only when configured. Detailed acceptance work lives in [BACKLOG.md](BACKLOG.md).

## Organizer onboarding

```mermaid
flowchart LR
  A[Create account] --> B[Verify email when required]
  B --> C{Has organization?}
  C -->|No| D[Create organization]
  C -->|Yes| E[Dashboard]
  D --> E
```

A first-time account creates its first organization. Existing users may belong to more than one organization.

## Create and publish a tournament

```mermaid
flowchart TD
  A[Choose organization] --> B[Choose game adapter]
  B --> C[Apply/edit game template]
  C --> D[Set format, series, capacity, and schedule]
  D --> E[Set registration and reporting policy]
  E --> F[Add public description and rules]
  F --> G[Create tournament workspace]
  G --> H[Open registration]
  H --> I[Public tournament page]
```

The adapter controls participant terminology and valid roster/result rules. Smash and LoL expose game-specific templates. Public pages are readable without an account.

## Register a participant

```mermaid
stateDiagram-v2
  [*] --> Pending: Submit participant
  Pending --> Approved: Staff approval or automatic policy
  Pending --> Waitlisted: Capacity reached
  Waitlisted --> Approved: Capacity becomes available
  Pending --> Rejected: Staff rejects
  Approved --> Cancelled: Participant or staff cancels
```

A team tournament validates the roster. An individual Smash entry uses a one-player participant. Approved participants may receive a private pass for restricted access.

## Participant-pass access

```mermaid
sequenceDiagram
  participant S as Staff
  participant P as Participant
  participant A as OpenTournament
  S->>A: Generate or regenerate pass
  A-->>S: Show one-time URL and QR
  S-->>P: Transfer privately
  P->>A: Open URL fragment
  A->>A: Exchange token and clear fragment
  A-->>P: Restricted tournament session
```

The token begins in the URL fragment so it is not sent in the initial HTTP request. Exchanging a pass replaces the current browser session and limits the actor to one tournament and participant.

## Check-in and bracket generation

```mermaid
flowchart LR
  A[Approved participants] --> B[Open check-in]
  B --> C[Eligible participant checks in]
  C --> D[Staff verifies attendance]
  D --> E[Assign or review seeds]
  E --> F[Generate bracket]
  F --> G[Finalize BYEs]
  G --> H[Publish playable matches]
```

Staff may generate only after the tournament has enough eligible participants. The engine determines BYEs and bracket destinations.

## Play and report a match

```mermaid
flowchart TD
  A[Open eligible match] --> B[Choose valid final score]
  B --> C{Game adapter}
  C -->|Smash| D[Enter stage, characters, winner, stocks per game]
  C -->|LoL| E[Enter winner, blue side, duration, optional Riot ID]
  C -->|Generic/other| F[Submit aggregate score]
  D --> G[Submit report]
  E --> G
  F --> G
  G --> H{Reporting policy satisfied?}
  H -->|Yes| I[Confirm and advance bracket]
  H -->|Conflict| J[Open dispute]
  H -->|Waiting| K[Wait for another report or staff]
```

Bilateral mode requires matching eligible reports. Winner-only mode confirms one valid winner report. Staff-only mode prevents participant submission.

## Dispute and ruling

```mermaid
stateDiagram-v2
  [*] --> Open: Report conflict or eligible request
  Open --> InReview: Referee assigned
  InReview --> Open: More information requested
  InReview --> Resolved: Ruling recorded
  Resolved --> [*]
```

Staff and match parties may add messages according to authorization. A ruling records score/draw, rationale, actor, and considered evidence, then applies the authoritative result.

## Live public experience

```mermaid
flowchart LR
  A[Confirmed result] --> B[Persist bracket state]
  B --> C[Publish SSE event]
  C --> D[Public page refetches]
  D --> E[Bracket and standings update]
```

The page shows honest connecting/live/reconnecting state. The PWA caches public read content but does not submit offline actions.

## Language and theme

- The browser language selects Spanish or English when no preference exists.
- The header selector persists an explicit language.
- System, light, and dark theme selection is independent of language.
- User-facing validations and statuses follow the selected locale.
- The document `lang` attribute matches rendered copy.

## Notification channels

| Event                           | In-app/SSE                    | Email                        | Discord         |
| ------------------------------- | ----------------------------- | ---------------------------- | --------------- |
| Registration or check-in window | Supported/planned by workflow | When SMTP and template exist | When configured |
| Match reminder                  | Planned durable job           | When SMTP exists             | When configured |
| Result confirmed                | Live tournament update        | Optional                     | When configured |
| Dispute update                  | Authorized actor update       | Optional                     | When configured |
| Final standings                 | Public update                 | Optional                     | When configured |

A channel must fail independently. Missing SMTP or Discord must never block the domain operation.
