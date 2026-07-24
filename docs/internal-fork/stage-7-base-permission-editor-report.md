# Stage 7 base-permission editor report

## Delivered

- Capability-gated General base-settings menu entry.
- Isolated internal role and direct-user permission matrix.
- Effective assignment and source explanation.
- Enable/disable control using the audited backend API.
- Optimistic subject replacement and stale-write reload warning.
- Mutation-control visibility based on `base:manage_members`.
- Pure frontend API contract and authorization helper tests.

## Upstream impact

One existing Community component,
`components/dashboard/settings/base/index.vue`, receives a small registration
hook. No commercial permission, entitlement, license, or paid-feature component
is imported or modified.

## Validation record

The pull-request description records exact commands and results. The targeted
Vitest suite covers the internal capability contract and permission editor
contract. Production build and type-check limitations are recorded separately
when caused by the repository toolchain.

## Remaining PERM-002 work

Complete formal security-review sign-off for base-permission administration.
Enforcement on Community route families remains separate PERM-001 work.
