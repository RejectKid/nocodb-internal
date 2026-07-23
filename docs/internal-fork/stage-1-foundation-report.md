# Stage 1 foundation completion report

Date: 2026-07-23

Branch: `feature/foundation-authorization-harness`

## Outcome

Stage 1 implementation is complete and ready for security review:

- FND-001 custom module boundary: Security Review
- FND-002 internal feature registry: Security Review
- FND-003 authorization test harness: Security Review

The new work completes FND-003 without modifying Community endpoint behavior or
commercial license/entitlement code.

## Delivered

- Versioned, machine-readable authorization regression matrix.
- Typed matrix, actor, token, target, expectation, and result contracts.
- Framework-neutral validation and execution runner.
- Duplicate-case and expected-status/failure-class validation.
- Deterministic active, unauthorized, blocked, deleted, disabled, and
  API-token identities.
- Deterministic internal token fixtures with scopes, expiration, revocation,
  workspace/base allowlists, and no plaintext secret.
- Self-test-only reference executor for the shared denial contract.
- HTTP integration against the unchanged Community
  `DELETE /api/v2/meta/cache` controller route.
- Usage, extension, and fixture cleanup documentation.
- Security checklist, ADR, feature pipeline, and custom-code manifest updates.

## Matrix coverage

The shared version 1 matrix covers 14 cases:

1. anonymous denial;
2. authenticated unauthorized denial;
3. authorized success;
4. frontend-hidden direct API denial;
5. API-token scope success;
6. insufficient token scope;
7. expired token;
8. revoked token;
9. cross-base token access;
10. cross-workspace token access;
11. blocked user;
12. deleted user;
13. disabled user;
14. disabled token owner.

Authentication failures are asserted as `401`. Authenticated permission, scope,
and boundary failures are asserted as `403`.

## Community regression

The unchanged Community `CachesController` route is loaded into an isolated Nest
application. A test adapter applies the route's declared `@Acl` metadata without
loading the unrelated full application graph.

Observed cases:

- anonymous: `401`;
- org viewer: `403`;
- API token, even with super-administrator roles: `403`;
- super administrator: `200`.

Only the successful request reaches `CachesService.cacheDelete`.

## Validation

| Check                               | Result                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Prettier on changed source/docs     | Passed                                                                                                        |
| Internal backend Jest               | Passed: 11 suites, 31 tests                                                                                   |
| Existing frontend capability Vitest | Passed: 1 file, 2 tests                                                                                       |
| Backend TypeScript                  | Repository failed with 70 existing SDK/integration diagnostics; zero referenced `internal-extensions`         |
| Backend production Rspack           | Repository failed with 73 existing SDK/dependency errors and 1 warning; zero referenced `internal-extensions` |
| Targeted ESLint                     | Failed before file analysis in the existing ESLint/AJV initialization path                                    |

No database migration is added in Stage 1.

## Acceptance review

| FND-003 criterion                                         | Evidence                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------ |
| Anonymous, unauthorized, and authorized helpers           | Deterministic identity fixtures and shared matrix            |
| Frontend-hidden actions remain inaccessible by direct API | Dedicated matrix case plus accidental-success self-test      |
| API tokens obey scopes                                    | Scope allow/deny cases                                       |
| Expired API tokens fail                                   | Expiration case and model fixture                            |
| Cross-base/workspace denied                               | Dedicated boundary cases                                     |
| Deleted/disabled users denied                             | User and token-owner cases                                   |
| Authentication and authorization failures differ          | Status classifier and explicit `401`/`403` assertions        |
| Reusable by later features                                | Public test barrel, case selector, generic executor contract |
| Existing Community endpoint tested unchanged              | Community cache-delete HTTP integration                      |
| Cleanup documented                                        | In-memory and future database fixture lifecycle rules        |

## Remaining risks

- The isolated Community regression validates declared route metadata through a
  lightweight adapter. Full application/E2E execution remains required when the
  upstream `ts-jest` and SDK build baseline is repaired.
- Database-backed cross-tenant fixtures are deferred until a token repository
  or permission data model exists.
- Later feature suites must execute real routes or centralized production
  policies. The reference executor alone is never release evidence.
- PostgreSQL coverage is required before token route integration is released.

## Next stage

Proceed to Stage 2 in this order:

1. complete TOK-001 persistence and one-time token issuance;
2. implement TOK-002 centralized token authorization policy;
3. expose create/list/revoke APIs with audit events;
4. implement TOK-003 administration UI;
5. execute the shared authorization matrix against every token route.
