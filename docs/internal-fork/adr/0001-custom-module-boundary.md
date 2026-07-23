# ADR 0001: Custom module boundary

## Status

Accepted

## Context

Internal capabilities must remain independently implemented, distinguishable
from upstream commercial modules, and easy to carry across upstream updates.
The upstream `NocoModule` is large and frequently changed.

## Decision

Create `modules/internal-extensions` as the backend root, with one conditional
top-level registration hook. Use `/api/internal/v1`, `NC_INTERNAL_*`,
`nc_internal_*`, a separate migration source/history table, and corresponding
frontend `internal` namespaces. The master switch is
`NC_INTERNAL_EXTENSIONS_ENABLED`.

## Alternatives considered

- Add controllers/services directly to `NocoModule`: rejected due to coupling.
- Patch existing gated modules: prohibited and unsafe.
- Separate process immediately: deferred because it would duplicate identity,
  tenant context, and deployment operations.

## Consequences

Most changes are additive. Some Community adapters may later need small hooks.
Custom API/types are not automatically included in the upstream generated SDK.

## Security implications

Disabled mode registers no custom module. Internal routes require their own
server-side guards. The boundary does not imply trust.

## Upgrade implications

Upstream merges normally touch only the top-level import hook. The custom-code
manifest identifies every exception.
