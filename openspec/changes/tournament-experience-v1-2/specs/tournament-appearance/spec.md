# Tournament Appearance Specification

## Purpose
Define public tournament branding that organizers control without exposing non-public tournaments.

## Requirements

### Requirement: Organizer-managed appearance
The system MUST allow an authorized tournament administrator to set or replace one logo, one banner, and a color palette for that tournament. The system MUST reject an unauthorized mutation and MUST validate every submitted color value before publication.

#### Scenario: Administrator publishes branding
- GIVEN an authorized administrator and a valid appearance payload
- WHEN the administrator saves the appearance
- THEN public reads for a visible tournament include the saved appearance

#### Scenario: Unauthorized appearance update
- GIVEN a user without tournament-administrator authority
- WHEN the user submits an appearance update
- THEN the system rejects the update and retains the current appearance

### Requirement: Visibility-safe public appearance
The system MUST expose appearance only through public tournament reads whose tournament is publicly visible. The system MUST NOT expose an appearance for a private or unlisted tournament through public tournament, overlay, or media reads.

#### Scenario: Public tournament appearance
- GIVEN a publicly visible tournament with published appearance
- WHEN an unauthenticated visitor reads its public tournament data
- THEN the visitor receives its appearance values and public media references

#### Scenario: Non-public tournament appearance
- GIVEN a private or unlisted tournament with an appearance
- WHEN an unauthenticated visitor uses a public read
- THEN the system returns no appearance or media data for that tournament