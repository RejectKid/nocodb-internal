# Stage 8 base-permission browser security report

## Delivered

- An isolated Playwright harness for internal-extension browser security tests.
- Real production mounts of the internal base-permission editor and the
  Community base-settings shell.
- Unauthorized-control visibility and direct-request denial coverage.
- Authorized optimistic-revision write coverage.
- Capability-disabled navigation coverage.
- Stale-write reload and administrator-warning coverage.
- A path-filtered GitHub Actions workflow for the browser suite.

## Test boundary

The harness supplies deterministic Community composables and an HTTP middleware
so the real Vue components can be exercised without starting the complete
NocoDB stack. The middleware validates the browser's request and error-handling
contract. It does not replace the backend controller, service, tenant-isolation,
and audit tests delivered in earlier stages.

Production styles are stripped only by the test harness because standalone
Vite does not run the application's Windi preprocessing pipeline. Component
logic, templates, composables, and request behavior remain production code.

## Security assertions

- Frontend visibility is never treated as authorization.
- Direct unauthorized mutations receive HTTP 403.
- Capability disablement is independent of commercial feature flags.
- Authorized mutations carry the currently loaded revision.
- Conflict recovery performs a reload and never silently retries a mutation.
- Test fixtures contain no credentials, secrets, or plaintext tokens.

## Remaining work

PERM-002 requires formal reviewer sign-off before it can move from Security
Review to Ready. PERM-001 route-family enforcement remains the next functional
authorization slice.
