# Stage 6 base-permission administration API report

## Delivered

- Authoritative Community base-identity provider.
- Authenticated internal permission state endpoint.
- Audited configuration enable/disable endpoint.
- Audited atomic subject-assignment replacement endpoint.
- Owner bootstrap and emergency recovery behavior.
- Delegated `base:manage_members` administration after opt-in.
- Cross-workspace non-disclosure and direct anonymous denial.
- Optimistic concurrency for configuration and assignment writes.

## Security properties

Roles and tenant identifiers are resolved server-side. Unknown or cross-tenant
bases return 404. Unauthorized users receive 403, unauthenticated users receive
401, and stale writes receive 409. Domain mutations and redacted audit events
commit or roll back together.

## Validation record

The final pull-request description records the exact commands and outcomes.
Targeted service and HTTP integration suites cover authorization, validation,
tenant isolation, delegation, audit generation, response routing, and stale
write rejection.

## Remaining work

PERM-002 is not complete until the isolated base-settings permission editor is
implemented and its browser-level authorization and stale-write behavior are
tested. Permission enforcement on Community record and schema route families is
also intentionally deferred to later reviewable slices.
