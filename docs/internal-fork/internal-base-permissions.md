# Internal base permissions

Status: Backend model, administration API, and V2 record enforcement implemented
(PERM-001, PERM-002)

## Boundary

This subsystem is independently implemented under
`modules/internal-extensions/permissions`. It does not import, modify, or
activate NocoDB commercial permission, entitlement, license, or paid-feature
code. Existing Community membership and role data is consumed through a
read-only adapter backed by the authoritative server-side membership lookup.

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

## Administration API and rollout safety

Authenticated administration routes are isolated under
`/api/internal/v1/workspaces/:workspaceId/bases/:baseId/permissions`.
Community owners and creators can inspect and bootstrap an unconfigured base.
After opt-in, the centralized policy requires `base:manage_members`; owner
emergency access remains available. Cross-workspace and unknown-base requests
return not found without disclosing resource existence.

Configuration writes include `expectedUpdatedAt`. Subject replacement writes
include `expectedRevision`, using the revision returned by the state endpoint.
Stale values fail with HTTP 409 and perform neither the domain mutation nor its
audit append. Successful writes replace one subject's assignment set and append
the SEC-001 event in the same metadata transaction.

New configurations still default to disabled, so installing the migration
cannot change Community behavior.

## Base-settings editor

When the independent `basePermissions` capability is enabled, General base
settings contains an isolated internal permission editor. It groups existing
assignments into inherited Community base roles and direct users, shows the
effective assignment source for the selected subject, and offers allow, deny,
or unset for every typed catalog entry.

The editor sends the configuration timestamp or subject revision returned by
the administration API. A 409 response reloads current state and requires the
administrator to review before saving again. Mutation controls are absent
unless the API reports that the current actor has `base:manage_members`.
Frontend visibility is explanatory only; the backend remains authoritative.

## V2 record-route enforcement

The Community `DataTableController` carries inert typed metadata for its full
V2 route family. An interceptor registered only by `InternalExtensionsModule`
maps operations as follows:

- list, read, count, aggregate, bulk list, and nested list require
  `records:read`;
- insert requires `records:create`;
- update, move, nested link/unlink, and nested copy/paste require
  `records:update`;
- delete requires `records:delete`.

The nested copy/paste endpoint receives `records:update` for every operation
because its shared contract can mutate links. This is intentionally more
restrictive than trying to infer authorization from an untrusted request body.

Community guards run before the internal interceptor, and the existing
method-level Community ACL remains downstream. Therefore an internal allow
cannot grant around a Community denial. When the independent capability is
disabled, the metadata is inert. When a base has no enabled internal
configuration, the centralized policy falls back and the Community ACL remains
authoritative.

Workspace and base identifiers come only from the authoritative request context
populated by Community extraction middleware. URL parameters and request bodies
are not used as tenant facts. Missing context, missing authentication, missing
base membership, and internal denials fail closed before controller logic.

Each additional route family must likewise supply:

- current actor and membership facts;
- the existing Community allow/deny decision;
- authoritative workspace and base identifiers;
- the one typed internal permission required by the operation.

Direct API denial, cross-tenant, disabled-user, and owner recovery tests are
required for each route family. V1/alias APIs, V3 APIs, MCP, imports/exports,
attachments, jobs, and realtime paths remain outside this completed V2 slice.
