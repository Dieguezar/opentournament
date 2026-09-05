# Public OBS Overlays Specification

## Purpose
Define public, transparent, read-only broadcast views derived from tournament state.

## Requirements

### Requirement: Exact transparent broadcast views
The system MUST provide credential-free, public-only Scoreboard, Up Next, and Champion overlay views for publicly visible tournaments. Each named view MUST render an exact 1920×1080 transparent canvas with no opaque page background or scrollable overflow, MUST bootstrap from an authoritative current snapshot on page load, and MUST NOT expose private or unlisted tournament data.

#### Scenario: Scoreboard bootstrap
- GIVEN OBS loads a public Scoreboard overlay URL for a visible tournament
- WHEN the page initializes
- THEN it renders an exact 1920×1080 transparent canvas from an authoritative current snapshot

#### Scenario: Up Next and Champion dimensions
- GIVEN OBS loads public Up Next and Champion overlay URLs for a visible tournament
- WHEN each page initializes
- THEN each renders its named authoritative state in an exact 1920×1080 transparent canvas without scrolling

#### Scenario: Non-public overlay request
- GIVEN a private or unlisted tournament
- WHEN an unauthenticated client requests any overlay view
- THEN the system returns no tournament overlay state

### Requirement: Deterministic automatic match selection
The Scoreboard MUST select an active match when one exists; otherwise, it MUST select the next ready match. If multiple candidates exist, selection MUST use persisted scheduled start ascending, then bracket round and position ascending, then stable match identifier ascending. Up Next MUST present the next ready match using the same ordering; Champion MUST present the persisted champion only after finalization.

#### Scenario: Active match has precedence
- GIVEN one active match and a different ready match
- WHEN the Scoreboard snapshot is derived
- THEN it selects the active match

#### Scenario: Stable ready-match selection
- GIVEN no active match and multiple ready matches with identical schedule and round
- WHEN the overlay snapshot is derived repeatedly
- THEN it selects the candidate with the lowest position, then stable identifier

### Requirement: Invalidation-safe live state
The overlay MUST treat SSE events only as invalidations and MUST refetch authoritative state on initial load, each relevant invalidation, and every SSE open after a disconnect. It MUST coalesce concurrent refreshes and MUST NOT let an older response replace a newer accepted snapshot. Overlay and live read responses MUST require revalidation rather than serving unchecked stale state. V1 live invalidation MUST operate with one API instance.

#### Scenario: SSE reconnection
- GIVEN an overlay reconnects after a lost SSE connection
- WHEN the EventSource opens
- THEN the overlay refetches and renders the current authoritative state

#### Scenario: Out-of-order refreshes
- GIVEN two refreshes complete out of order
- WHEN the newer snapshot was accepted first
- THEN the older response does not alter rendered overlay state