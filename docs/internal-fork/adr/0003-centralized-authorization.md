# ADR 0003: Centralized authorization

## Status

Accepted

## Context

Fine-grained permissions and tokens cannot be enforced consistently through
controller-local string comparisons or frontend visibility.

## Decision

All internal authorization decisions flow through typed policy interfaces.
Guards/decorators collect action and resource context; policy services evaluate
authenticated actor status, Community membership facts, internal grants, token
scope, tenant boundary, resource state, and owner emergency access in that
order. The default is deny.

## Alternatives considered

- Extend the upstream role map for every internal permission: rejected because
  it increases coupling and could change Community behavior.
- Controller-local checks: rejected as inconsistent and difficult to audit.
- Frontend gating: rejected as non-authoritative.

## Consequences

Policy calls are explicit and testable. Resource adapters must supply complete
tenant context. The authorization harness becomes a release dependency.

## Security implications

Authentication failures remain 401, authorization failures 403, and
cross-tenant resources may deliberately map to 404 to avoid disclosure.
Unknown actions, missing tenant context, disabled users, expired/revoked
tokens, and unsupported scope versions deny.

## Upgrade implications

Community membership adapters need regression review when upstream role or
membership behavior changes; internal policy contracts remain stable.

## Implementation evidence

Stage 1 provides a typed, versioned authorization matrix runner and deterministic
identity/token fixtures under
`modules/internal-extensions/testing/authorization`. The shared JSON matrix
covers authentication, permission, token scope/lifecycle, tenant boundary, and
disabled-owner cases. Feature suites must supply a real route or centralized
policy executor; the reference executor is limited to harness self-tests.
