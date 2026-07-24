# Stage 3 TOK-002 policy completion report

Date: 2026-07-24

Branch: `feature/fine-grained-api-token-policy`

## Outcome

The centralized TOK-002 policy slice is implemented. TOK-002 advances to
Backend while its HTTP strategy, owner-permission adapter, decorators, and
audit integration remain pending.

## Delivered

- Default-deny production token policy registered in the internal Nest module.
- Explicit current-owner identity, lifecycle, and permission facts.
- Explicit instance/workspace/base target contract.
- Authentication-versus-authorization decision classification.
- Complete typed scope catalog with family, label, and mutation metadata.
- Production-policy executor for the shared authorization matrix.

## Security behavior

- Revoked and expired tokens fail authentication before authorization checks.
- Unsupported scope versions and invalid stored scope sets fail closed.
- Missing, mismatched, blocked, deleted, and disabled owners fail
  authentication.
- Current owner permission and token scope are intersected.
- Missing target context, cross-workspace, and cross-base requests fail
  authorization.
- Empty allowlists never grant unrestricted tenant access.
- Unknown required scopes deny.

## Tests

- Every typed scope is evaluated through production policy.
- Scope catalog completeness and uniqueness.
- Missing scope and owner permission denial.
- Unknown stored/required scope and version denial.
- Owner lifecycle and identity mismatch denial.
- Workspace/base allowlist and missing-context denial.
- Instance target behavior.
- Lifecycle evaluation precedence.
- All seven shared FND-003 API-token cases through production policy.

## Validation

| Check                               | Result                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Prettier over changed source/docs   | Passed                                                                                         |
| Internal backend Jest               | Passed: 15 suites, 75 tests                                                                    |
| Existing frontend capability Vitest | Passed: 1 file, 2 tests                                                                        |
| Backend TypeScript                  | Repository failed with 70 existing diagnostics; zero referenced `internal-extensions`          |
| Backend production Rspack           | Repository failed with 73 existing errors and 1 warning; zero referenced `internal-extensions` |
| Targeted ESLint                     | Failed before file analysis in the existing ESLint/AJV initialization path                     |

The first Jest attempt was launched from the repository root with a
package-relative configuration and therefore resolved the configuration's
`rootDir` incorrectly. The supported invocation from `packages/nocodb` is the
15-suite, 75-test passing result above.

## Explicit non-goals

- No HTTP token strategy or parsing.
- No global authentication registration.
- No route decorator/guard or resource extraction.
- No API mutation or audit event.
- No modification of existing API tokens, commercial authorization,
  entitlements, or license checks.

## Next stage

PERM-001 should now define the effective base-permission model and production
owner-permission adapter. After that dependency is stable, finish TOK-002 with
rate-limited secret verification, typed route metadata, resource extraction,
and direct HTTP authorization tests.
