# ADR 0002: Independent feature registry

## Status

Accepted

## Context

Internal modules need capability discovery without changing or consuming
commercial entitlement results.

## Decision

Use a typed, read-only registry sourced only from `NC_INTERNAL_*` configuration.
It records key, enabled state, backend/frontend capability, required
configuration, and minimum internal schema version. Expose the public-safe
projection only to authenticated users at
`GET /api/internal/v1/capabilities`.

## Alternatives considered

- Reuse upstream feature flags/entitlements: rejected because it crosses the
  required boundary.
- Frontend-only environment flags: rejected because the backend must remain
  authoritative.
- Database-only registry: deferred until per-base rollout is required.

## Consequences

Configuration changes require a process restart in the first implementation.
Backend and frontend share a versioned response shape rather than generated
commercial feature types.

## Security implications

Responses contain booleans and schema version only. Required configuration
names and values are not returned. Unknown or malformed values fail closed.

## Upgrade implications

The registry lives entirely in additive internal files. Response schema changes
require a schema-version increment and compatibility review.
