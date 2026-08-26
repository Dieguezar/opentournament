# Tournament engine

The authoritative implementation is [`packages/tournament-engine/src/index.ts`](../packages/tournament-engine/src/index.ts). The engine currently owns bracket generation, deterministic advancement pointers, BYE finalization, participant resolution, and champion detection. API services own reporting policy, persistence, disputes, and audit.

## Design constraints

- Pure and deterministic for the same ordered participants and options.
- Strict TypeScript with no HTTP, database, storage, time, or Discord dependency.
- Participant IDs are opaque strings.
- Bracket matches expose explicit winner/loser destination pointers.
- Functions return new bracket objects instead of mutating the input.

```text
participants + options → bracket structure
bracket + match winner → advanced bracket + optional champion
```

## Core types

- `EngineParticipant`: participant ID plus optional seed.
- `SeatRef`: direct participant or winner/loser of an earlier match.
- `EngineBracketMatch`: bracket, round, position, seats, pointers, status, and winner.
- `EngineBracket`: matches plus the participant IDs that received first-round BYEs.
- `AdvanceResult`: updated bracket plus a champion when the completed match decides one.

## Public operations

| Function                         | Responsibility                                                           |
| -------------------------------- | ------------------------------------------------------------------------ |
| `isPowerOfTwo`                   | Validate bracket sizes                                                   |
| `nextPowerOfTwo`                 | Calculate effective bracket size                                         |
| `countByes`                      | Calculate missing first-round seats                                      |
| `roundCountForSingleElimination` | Calculate winners-bracket depth                                          |
| `seedOrder`                      | Produce standard seed positions for a power-of-two size                  |
| `orderParticipants`              | Stable ascending seed order with unseeded entries last                   |
| `generateSingleElimination`      | Build winners matches and destination pointers                           |
| `generateDoubleElimination`      | Build winners, losers, and grand-final matches                           |
| `finalizeByes`                   | Mark first-round BYE matches finalized and advance their participant     |
| `advanceMatch`                   | Validate and finalize one match, route winner/loser, and detect champion |
| `resolveMatchParticipants`       | Resolve a match’s participants from prior finalized matches              |
| `isChampionMatch`                | Identify a final match with no winner destination                        |

## Single elimination

1. Require at least two participants.
2. Expand to the next power of two.
3. Place seeded participants with standard recursive `seedOrder`.
4. Represent a first-round BYE as a match with `isBye`, one participant, and one empty seat.
5. Call `finalizeByes` before persisting playable state.
6. Route each winner to the next winners-bracket match.
7. The final match has no `winnerNext`; its winner is champion.

The engine does not randomize unseeded participants. The caller must shuffle them before generation when random seeding is desired.

## Double elimination

- Winners-bracket matches use the single-elimination structure.
- Real first-round losers are paired into the first losers round.
- Later winners-round losers enter against surviving loser-bracket seats.
- Odd loser pools carry one seat forward without creating an artificial match.
- `GF-1` receives the winners finalist and losers survivor.
- With `grandFinalReset=false`, the winner of `GF-1` is champion.
- With `grandFinalReset=true`, `GF-2` becomes playable only when the losers-side participant wins `GF-1`; the undefeated winners-side participant becomes champion immediately when winning `GF-1`.

The current `gfReset` convention treats the `home` seat in `GF-1` as the losers-side participant and `away` as the winners-side participant.

## Advancement invariants

`advanceMatch` rejects:

- An unknown match ID.
- A match that is already finalized.
- A winner who is not in either resolved seat.

On success it:

1. Finalizes the match and records its winner.
2. Calculates the loser from the two seats.
3. Writes winner and loser into configured destinations.
4. Handles grand-final reset semantics.
5. Returns a champion only when the format is complete.

The API must resolve dynamic seats and persist the updated bracket within its own transaction and concurrency controls.

## Responsibilities outside the engine

The following do **not** belong to `packages/tournament-engine` today:

- Registration and check-in authorization.
- Result-report reconciliation.
- Adapter-specific score/game validation.
- Evidence and disputes.
- Database transactions and optimistic locking.
- Audit logs, SSE, jobs, and notifications.
- Administrative rollback of already propagated results.

Contributors must not add framework or storage dependencies to the engine to implement these concerns. Add orchestration in API services and extend pure engine operations only when the bracket model itself needs a transition.

## Required tests

- Participant counts 2, 3, 5, 8, 16, 33, 64, and 128.
- Seed ordering and stable placement.
- BYE representation and finalization.
- Winner and loser pointer correctness.
- Single- and double-elimination champion detection.
- Grand-final reset winner-side and loser-side behavior.
- Unknown match, invalid winner, and duplicate finalization rejection.
- Input immutability.
- No orphaned playable match and no participant in two simultaneous resolved seats.

See [TESTING_STRATEGY.md](TESTING_STRATEGY.md).
