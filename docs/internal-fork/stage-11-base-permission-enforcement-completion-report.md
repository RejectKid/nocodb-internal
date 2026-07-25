# Stage 11 base-permission enforcement completion report

## Outcome

PERM-001 advances from Backend to Security Review. The independent policy now
protects supported base-scoped Community HTTP routes and MCP tools through one
central adapter. No commercial entitlement, license, paid feature flag, or
commercial permission implementation is imported or modified.

## Enforcement flow

1. Existing Community guards authenticate the request.
2. Explicit internal metadata wins for compound or exceptional routes.
3. Otherwise, a typed adapter maps base-scoped Community ACL operation metadata
   to internal permissions.
4. Internal API and MCP routes use bounded request resolvers because their
   operation is selected inside a shared route.
5. Capability-disabled and base-unconfigured requests continue unchanged.
6. Opted-in bases resolve the authoritative actor and evaluate all required
   permissions from one configuration/grant snapshot.
7. Any internal denial stops dispatch; downstream Community ACL remains
   authoritative and can still deny.

## Coverage

- V1, old-data, alias, bulk-alias, calendar, nested, V2, and V3 records.
- Base, schema, view, filter, sort, member, and base-token controllers with
  base-scoped Community ACL metadata.
- Import and migration job triggers.
- Export enqueue, requiring `base:export` plus `records:read`.
- Authenticated attachment-download routes with record context.
- Internal API single and batch operations.
- MCP base/schema reads and record read/create/update/delete tools.

Public share sessions remain in the Community share flow. Unknown ACL
operations are intentionally unmapped instead of guessing at authorization.

## Security decisions

- MCP token validation moved from controller body to a guard so authorization
  interceptors receive the authenticated actor before controller dispatch.
- Internal batches evaluate the union of mapped sub-operation permissions
  before dispatch. A denied internal permission rejects the whole envelope;
  Community ACL still evaluates each dispatched sub-operation.
- Export jobs are checked at enqueue. A worker-time authorization recheck is a
  documented SEC-002 hardening item.
- Generic/raw attachment routes without model and record context are not given
  a misleading base check; MODE-002 must provide signed, record-aware delivery.
- Realtime is broadcast-only for Community record changes and has no separate
  inbound record mutation handler.

## Validation

- Dependency install with repository-compatible pnpm 10.28.0 and the frozen
  lockfile: passed.
- Focused permission and MCP tests: 61 permission tests and 3 MCP guard tests
  passed.
- Complete internal-extension backend suite: 30 suites and 183 tests passed.
- Base-permission frontend unit suite: 6 tests passed.
- Base-permission browser security suite: 4 Playwright tests passed.
- Prettier on every changed TypeScript file: passed.
- Backend TypeScript check: attempted; blocked by existing SDK/generated-type
  drift and the optional `oracledb` declaration. No error referenced a file
  changed by this stage.
- ESLint: attempted; the repository's forced AJV override is incompatible with
  ESLint 8's `@eslint/eslintrc` (`defaultMeta` initialization failure), before
  file linting begins.

## Residual risks

- New upstream base-scoped ACL operation names must be deliberately added to
  the adapter; unknown operations retain Community-only authorization.
- Permission revocation after a job is queued is not yet rechecked by the
  worker before delivery.
- Raw/temporary attachment URLs await record-aware signed delivery controls.
- Formal security-review sign-off is required before PERM-001 or PERM-002 moves
  to Ready.
