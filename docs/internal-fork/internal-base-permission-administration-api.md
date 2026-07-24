# Internal base-permission administration API

Status: Backend contract implemented

## Purpose and boundary

This API administers the independently implemented internal base-permission
model. It does not call or alter NocoDB commercial entitlement or permission
features. All routes require an authenticated Community user and resolve the
current base membership on the server.

## Routes

All routes use:

`/api/internal/v1/workspaces/:workspaceId/bases/:baseId/permissions`

- `GET /` returns configuration, raw grants, grouped grant sets with revisions,
  the typed permission catalog, and the caller's effective permissions.
- `PATCH /configuration` accepts `enabled` and `expectedUpdatedAt`.
- `PUT /subjects/:subjectType/:subjectId` atomically replaces that subject's
  assignments and accepts `assignments` plus `expectedRevision`.

The initial write uses `expectedUpdatedAt: null`. A new subject uses
`emptyGrantRevision` from the state response. Later writes must echo the
current configuration timestamp or grant-set revision. A stale write returns
409 and the client must reload before retrying.

## Authorization

An unconfigured or disabled base retains Community behavior. Community owners
and creators may bootstrap administration. Once internal permissions are
enabled, the caller must resolve to `base:manage_members`; a direct internal
assignment may delegate this permission. Owners retain emergency access.

Authentication, authorization, tenant identity, and lifecycle state are
enforced on the backend. The client must not supply roles, ownership, workspace
identity, or base identity in the request body.

## Validation and atomicity

- Subject types are restricted to the internal subject enum.
- Role subjects are restricted to existing Community project roles.
- Permission and effect values must be in their typed catalogs.
- A subject cannot receive two effects for the same permission.
- Subject identifiers are bounded.
- Each successful write and its redacted SEC-001 audit event share one
  transaction.
- Rejected, stale, and unauthorized writes emit no audit event.

The current API returns assignment identifiers only where already present in
the persistence model. It never exposes secrets or commercial feature state.

## Frontend handoff

The next slice should build the base-settings matrix against this API. It must
show direct user and inherited role sources separately, submit the returned
revision on save, reload after a 409, and hide write controls when the effective
permission response denies `base:manage_members`. Backend checks remain
authoritative.
