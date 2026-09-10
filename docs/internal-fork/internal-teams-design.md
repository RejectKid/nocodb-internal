# Internal teams (TEAM-001)

Status: Security Review (implemented and locally tested; not released).

Workspace-scoped independent teams provide group subjects for internal base and
document permissions. They do not activate upstream Teams or provision upstream
workspace/base roles. Users must already have Community resource access; internal
base rules constrain that access. This distinction is part of the parity audit.

New tables: nc_internal_teams and nc_internal_team_members. Team changes use
optimistic revisions and transactional audit records. Workspace managers may
create, rename, archive, and replace membership. Only active workspace members
may be added. Archived teams and removed/disabled/deleted members contribute no
permissions. Membership is resolved from storage on every authorization request,
not copied into JWTs or cached in user sessions.

Base precedence: owner emergency access; explicit user; matching team grants
(deny wins between teams); matching role grants (deny wins); default deny.
Existing user/role decisions are unchanged when no team grant matches.
Document team grants are additive and inherit through document ancestors, just
like existing grants. Owner/creator emergency access remains unchanged.

The registry uses NC_INTERNAL_TEAMS_ENABLED. Turning it off removes all team
contributions immediately (including team denies); disablement must be treated
as a permission-policy change, not as a harmless UI switch.

No nested teams, organization-wide teams, SSO/SCIM group sync, or workspace-role
assignment in this slice. Those remain explicit parity gaps, not implied support.

Migration rollback removes team-subject grants before dropping team tables;
back up first because rollback loses team membership and assignments. Existing
user/role assignments, documents, and Community tables are untouched.
