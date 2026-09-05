# Public Player Profiles Specification

## Purpose
Define a reusable, account-owned public identity within one self-hosted instance.

## Requirements

### Requirement: Explicit profile publication and revocation
The system MUST provide one global public profile per account within the instance, identified by a stable public slug and its owner-selected gamertag. The gamertag MUST be the profile's public display identity, MAY be changed by its owner, and MUST NOT alter the stable profile URL. A profile MUST remain unpublished until its account owner explicitly enables publication, and the owner MUST be able to revoke publication without deleting tournament history.

#### Scenario: Account owner publishes a profile
- GIVEN an account owner with a gamertag, configured profile, and publication enabled
- WHEN a visitor requests the profile by its public slug
- THEN the system returns the public profile with the gamertag

#### Scenario: Account owner revokes publication
- GIVEN a previously published profile linked to historical tournament participation
- WHEN the owner disables publication
- THEN the public profile and profile links are unavailable while participant labels remain unchanged

### Requirement: Finite independent public fields
A published profile MUST expose its public slug and gamertag, plus only these optional V1 fields: avatar, real name, and biography. Avatar, real name, and biography MUST each be unpublished by default and MUST require an independent public-visibility choice. The system MUST NOT expose email, credentials, provider identifiers, roles, audit data, internal identifiers, or any other profile field.

#### Scenario: Default optional-field privacy
- GIVEN a published profile with avatar, real name, and biography but no optional-field opt-ins
- WHEN a visitor reads the profile
- THEN the response contains the slug and gamertag but omits every optional and private field

#### Scenario: Independently enabled fields
- GIVEN a published profile whose owner enables only biography visibility
- WHEN a visitor reads the profile
- THEN the response includes biography but omits avatar and real name

### Requirement: Unlinked participant identity
The system MUST keep tournament participation identity distinct from account identity. It MUST show an unlinked participant's tournament label but MUST NOT create, infer, or link a global profile, gamertag, real name, or account avatar for that participant. A public profile link MUST appear only for a linked account with publication enabled.

#### Scenario: Unlinked participant
- GIVEN a tournament participant without a linked published account
- WHEN a visitor views public bracket or overlay data
- THEN the visitor sees the tournament label without a profile URL