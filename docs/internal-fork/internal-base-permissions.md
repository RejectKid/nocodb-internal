# Internal base permissions

Status: Backend model implemented (PERM-001)

## Boundary

This subsystem is independently implemented under
`modules/internal-extensions/permissions`. It does not import, modify, or
activate NocoDB commercial permission, entitlement, license, or paid-feature
code. Existing Community membership and role data will be consumed through a
future read-only adapter.

The subsystem owns two metadata tables:

- `nc_internal_base_permission_configs` opts a base into internal resolution.
- `nc_internal_base_permission_grants` assigns an allow or deny to a user or
  an existing Community base-role identifier.

There are deliberately no foreign keys into upstream tables. Tenant context is
stored on every row and checked by the repository and policy. This avoids
coupling internal migration order and deletion behavior to upstream schemas.

## Permission catalog

The catalog contains `base:view`, `base:edit`, `base:manage_schema`,
`base:manage_views`, `base:manage_members`, `base:manage_tokens`, `base:export`,
`base:import`, `records:read`, `records:create`, `records:update`,
`records:delete`, `documents:read`, `documents:create`, `documents:update`, and
`documents:delete`.

Unknown permission values fail storage validation and cannot enter the typed
policy interface.

## Resolution

Resolution is deterministic and evaluated server-side:

1. Anonymous and inactive users are denied.
2. A missing or disabled base configuration returns the unchanged Community
   authorization decision.
3. Configuration or grant tenant-context mismatches are denied.
4. The current base owner receives emergency access.
5. A direct user assignment overrides role assignments.
6. If assigned roles conflict, deny overrides allow.
7. No matching assignment is denied.

The effective-permission read model evaluates the full catalog from one
configuration/grant snapshot and reports the decision mode, source, and reason
for each permission.

## Owner emergency access

The policy accepts an explicit `isOwner` fact. The Community membership adapter
derives it from the effective `base_roles` produced by Community
`User.getWithRoles`, including workspace-role inheritance handled there. Route
integration must supply a current authoritative lookup and must not trust a
client-supplied role. Owner access is evaluated only after active-user and
tenant-context checks.

## Mutation and rollout safety

No HTTP mutation endpoint is included in PERM-001. Configuration and grant
writes remain repository-only until SEC-001 supplies audit events and atomic
administration APIs are reviewed. New configurations default to disabled, so
installing the migration cannot change Community behavior.

Before route enforcement is added, each protected route must supply:

- current actor and membership facts;
- the existing Community allow/deny decision;
- authoritative workspace and base identifiers;
- the one typed internal permission required by the operation.

Direct API denial, cross-tenant, disabled-user, and owner recovery tests are
required for each route family.
