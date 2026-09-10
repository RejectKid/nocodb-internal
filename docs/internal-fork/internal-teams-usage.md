# Using and testing internal teams

## Deploy

Build the updated fork frontend and backend, preserving the current database
and attachment volumes. Old image bundles do not include Teams. Set on the app:

```text
NC_INTERNAL_EXTENSIONS_ENABLED=true
NC_INTERNAL_TEAMS_ENABLED=true
NC_INTERNAL_BASE_PERMISSIONS_ENABLED=true
NC_INTERNAL_DOCUMENT_PERMISSIONS_ENABLED=true
```

Restart/recreate the application. The internal migration runner applies
`nc_internal_006_teams` before serving requests. Verify **Internal capabilities**
shows Teams enabled. Back up first; rollback deletes team assignments and team
membership, not Community users or documents. Do not delete Compose volumes.

## Create a group

1. Invite users to the workspace through the existing membership UI. They must
   be active users in the same workspace. Add appropriate Community base roles
   too; this team slice does not provision those roles automatically.
2. Avatar menu → **Internal teams**, or open `/internal/teams`.
3. Select the workspace. The selector derives workspace IDs from accessible
   bases, so create/join a base first if it is empty.
4. A workspace owner/creator or instance super-admin can enter a name and click
   **Create team**. Select member checkboxes and click **Save team**.
5. Rename with the name field. **Archive team and revoke team access** disables
   that group's contributions without deleting any users. Archival is final in
   this UI. The current edit limit is 500 members per team.

Ordinary workspace members can see team membership but cannot change it. Failed
or stale updates show an error; reload before retrying. Changes produce internal
audit events in the same transaction.

## Base permissions

Open the base's settings → **Internal permissions**. Enable internal permissions
for that base, choose assignment source **Internal team**, choose the team, then
set Allow/Deny/Unset and save. Existing Community guards still apply: an internal
allow does not promote a viewer to editor or grant access to an unshared base.

Enabling internal permissions starts default-deny for unmatched operations.
Configure the intended role/team grants before handing the base to users. Owners
retain emergency access. Resolution order is owner → explicit individual →
matching teams → base roles → deny. Deny wins among conflicting team assignments.
The editor's effective display identifies direct, team, and role sources.

## Document permissions

Open a document → **Permissions** → **Internal team** → select the group and
permission → **Add grant**. **Your access sources** explains your own effective
grant sources, including parent-document inheritance.

New documents start with existing base-role grants. To make a document team-only,
remove unwanted role/individual grants as well as checking the parent document's
inherited grants. Adding a team grant alone does NOT remove other access. Owners,
creators, document authors, and super-admins retain the existing emergency access;
test denial using a regular viewer/editor, not one of those privileged users.

Document grants are additive. Read does not imply export; edit implies read and
comment; manage includes all document actions. Grant on a parent applies to its
descendants. There are no team deny rules inside the document grant model.

## Acceptance test with two accounts

1. Use a disposable test base and manager account A plus regular member B.
2. Create a team containing B and save; reload to verify persistence.
3. Give that team document read access; remove the document's default role grants
   for this isolated test. Verify B can read, but cannot export or edit.
4. Remove B from the team. With B's SAME session, repeat the read: it must fail
   or disappear from the list. Re-add B and verify the intended access returns.
5. Repeat with a child document inheriting the parent's grant.
6. Enable internal base policies, configure team `documents:read`, and repeat
   removal. Distinguish internal base denial (403) from a hidden document (404).
7. Archive the team and confirm its contributions disappear. Other independent
   grants can still allow access; removal is not an explicit deny.
8. B must not be able to POST/PATCH team administration APIs. Anonymous calls
   fail authentication. Workspace IDs in URLs must not permit cross-tenant changes.
9. A stale `expectedRevision` update must return 409, not overwrite newer members.
10. Check audit events, back up, and repeat persistence after a restart on the
    actual deployment database. Local verification used SQLite; PostgreSQL needs
    deployment acceptance testing.

Endpoints:

```text
GET/POST /api/internal/v1/workspaces/{workspaceId}/teams
PATCH    /api/internal/v1/workspaces/{workspaceId}/teams/{teamId}
```

PATCH accepts `expectedRevision` plus `name`, `memberIds`, and/or `archived:true`.
API tokens require `members:read` or `members:write`, the allowed workspace, and
an authorized token owner. Token scope never replaces manager authorization.

## Limits and release status

Flat, workspace-local permission groups only: no organization-wide groups,
nesting, SCIM/SSO synchronization, or automatic workspace/base-role provisioning.
Membership changes are read live; they do not disconnect an already-open document
or erase data already delivered to a browser. Subsequent protected requests use
the new membership. Turning Teams off removes team ALLOW and DENY contributions,
so review fallback role access before toggling the feature.

See [Business parity audit](self-hosted-business-parity.md) for the complete gap
ledger. This is not a production-readiness or full Business-parity certification.
