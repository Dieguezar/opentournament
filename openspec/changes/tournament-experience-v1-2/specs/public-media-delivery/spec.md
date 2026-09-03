# Public Media Delivery Specification

## Purpose
Define validated, same-origin delivery of public logos, banners, and profile avatars from private object storage.

## Requirements

### Requirement: Authorized validated media publication
The system MUST allow an account owner to manage only that account's avatar and a tournament administrator to manage only that tournament's logo or banner. It MUST accept only PNG, JPEG, or WebP raster images; MUST reject active or document formats; and MUST enforce byte-size and decoded-dimension limits. The system MUST verify file signature, claimed type, and successful image decoding before publishing the server-detected media type.

#### Scenario: Valid logo upload
- GIVEN an authorized tournament administrator and a valid PNG within all limits
- WHEN the administrator publishes a logo
- THEN the system records validated public media for that tournament

#### Scenario: Invalid media upload
- GIVEN an authorized uploader submits SVG or an image exceeding a configured limit
- WHEN validation runs
- THEN the system rejects the upload and publishes no media reference

### Requirement: Private ID-addressed same-origin retrieval
The object store MUST remain private. Public retrieval MUST use a same-origin route addressed by an application media identifier, resolve only configured storage, and MUST NOT accept arbitrary URLs, storage endpoints, buckets, redirects, or caller-supplied object keys. The route MUST return media only while its owning profile is published or owning tournament is public; otherwise it MUST return a non-enumerating not-found response.

#### Scenario: Published media retrieval
- GIVEN a public tournament with a published banner
- WHEN a visitor requests its media identifier through the same-origin route
- THEN the route returns the validated image

#### Scenario: Withdrawn media retrieval
- GIVEN media whose owner becomes unpublished or non-public
- WHEN a visitor requests its media identifier
- THEN the route returns a not-found response

### Requirement: Safe cacheable media response
The system MUST use generated opaque media identifiers and replacement versions. A successful response MUST set validated Content-Type, bounded Content-Length, nosniff protection, and a validator. Versioned immutable media MUST use long-lived public immutable caching; a mutable alias, if present, MUST require revalidation.

#### Scenario: Versioned media cache policy
- GIVEN a request for a published versioned media identifier
- WHEN the response is returned
- THEN it includes immutable public caching and the validated safety headers

### Requirement: Media lifecycle cleanup
The system MUST remove a replaced media object only after the replacement reference is published, MUST remove an uploaded object that cannot be published, and MUST remove all owned public media when its profile or tournament is removed.

#### Scenario: Replacement cleanup
- GIVEN a published banner and a validated replacement banner
- WHEN the replacement is published
- THEN the new reference is public and the prior object is removed

#### Scenario: Failed publication cleanup
- GIVEN an uploaded media object whose publication cannot complete
- WHEN the failure is finalized
- THEN no media reference is published and the uploaded object is removed

#### Scenario: Ownership removal cleanup
- GIVEN public media owned by a profile or tournament
- WHEN the owning profile or tournament is removed
- THEN its owned public media objects and references are removed