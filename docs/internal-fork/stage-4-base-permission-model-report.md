# Stage 4 PERM-001 completion report

Date: 2026-07-24

Branch: `feature/base-permission-model`

## Outcome

The independent base-permission storage model, catalog, repository contract,
deterministic policy, effective-permission service, migration, and Nest
registration are implemented. PERM-001 advances to Backend. Production
Community-membership adapters and route enforcement remain intentionally
pending.

## Security behavior

- Community decisions are unchanged unless a base explicitly opts in.
- Enabled bases default deny when no assignment matches.
- Anonymous, blocked, disabled, and deleted users fail before permission
  evaluation.
- Workspace/base context mismatches fail closed.
- Direct user assignments override role assignments.
- Conflicting role assignments use deny precedence.
- Current owners retain emergency access.
- Unknown stored permission values fail repository validation.

## Validation

| Check                               | Result                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| Prettier over changed source/docs   | Passed                                                                             |
| Internal backend Jest               | Passed: 19 suites, 95 tests                                                        |
| Internal TypeScript diagnostic scan | Passed: zero diagnostics under `modules/internal-extensions`                       |
| Repository-wide TypeScript          | Failed with 227 lines of existing SDK/type diagnostics                             |
| Backend production Rspack           | Failed with 73 existing errors and 1 warning; none reference `internal-extensions` |
| Targeted ESLint                     | Failed before file analysis in the existing ESLint/AJV initialization path         |

One initial Jest invocation was launched from the repository root with a
package-relative configuration and could not resolve the config. The supported
invocation from `packages/nocodb` is the 19-suite, 95-test passing result above.
An initial `pnpm exec prettier` also reached the known narrowed-workspace
bootstrap failure; the installed repository Prettier binary completed
successfully without dependency changes.

## Deferred work

- Read-only adapter for current Community base/workspace membership facts.
- Route metadata, guards, and controller integration.
- Audited atomic administration endpoints (depends on SEC-001).
- Base permission editor (PERM-002).
- Token-owner effective-permission adapter used by TOK-002 HTTP integration.

No commercial permission, entitlement, feature flag, or license file is
modified.
