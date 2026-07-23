# Initial internal-extension completion report

Date: 2026-07-23

Branch: `feature/internal-extension-foundation`
Upstream baseline: `nocodb/nocodb` commit `2c232680a0`

This report covers repository orientation, the feature pipeline, Vertical Slice
A (internal feature registry), and the design/storage skeleton requested in
Vertical Slice B. It does not claim production readiness.

## 1. Repository architecture summary

NocoDB is a pnpm workspace. The primary backend is the Nest application in
`packages/nocodb`; the primary frontend is the Nuxt 3/Vue 3 application in
`packages/nc-gui`; shared contracts and generated API clients live in
`packages/nocodb-sdk`.

Backend requests enter through the Nest application assembled by
`src/app.module.ts`, pass global authentication and metadata/rate-limit guards,
reach controllers and services, and use models plus `MetaService`/Knex for
metadata persistence. Community authorization combines authenticated request
identity, route ACL metadata, role checks, and resource identifiers extracted
from requests. The frontend uses Nuxt file routing, global authentication
middleware, auto-imported composables, and the shared API client.

The chosen custom boundary is:

- backend: `packages/nocodb/src/modules/internal-extensions`
- frontend: `composables/internalExtensions` and `/internal/...` routes
- API: `/api/internal/v1`
- environment: `NC_INTERNAL_*`
- database: `nc_internal_*` tables and `xc_internal_knex_migrations`
- upstream hook: one conditional import/registration in `src/app.module.ts`

Commercial license, entitlement, paid-feature activation, EE overlay, and
existing API-token implementations remain outside this boundary and unchanged.
See `architecture-report.md` for the complete module and risk inventory.

## 2. Feature pipeline summary

The complete requested feature backlog is represented in
`feature-pipeline.md`, using Proposed, Architecture, Backend, Frontend, Testing,
Security Review, Documentation, Ready, Released, and Blocked.

Current initial-slice state:

| Feature | State        | Delivered in this slice                                   |
| ------- | ------------ | --------------------------------------------------------- |
| FND-001 | Testing      | Isolated module boundary, master switch, manifest, ADR    |
| FND-002 | Testing      | Registry, authenticated API, frontend service/page, tests |
| FND-003 | Proposed     | ADR and test direction only                               |
| TOK-001 | Backend      | Model/hash/migration skeleton and focused tests           |
| TOK-002 | Architecture | Scope enum and centralized policy interface               |
| TOK-003 | Proposed     | Pipeline definition only                                  |

For corresponding NocoDB capabilities, the design target is near-identical
documented and observable workflow/UX behavior. Implementations, routes,
storage, policies, and tests remain independent. Differences must be captured
in a behavioral-compatibility matrix.

## 3. Files created

The authoritative per-file inventory is `custom-code-manifest.md`. The created
artifacts are grouped below.

- Foundation and security documentation:
  `MODIFICATIONS.md`, `docs/internal-fork/custom-code-manifest.md`,
  `docs/internal-fork/internal-feature-registry.md`,
  `docs/internal-fork/fine-grained-api-token-design.md`, and this report.
- Architecture decisions:
  `docs/internal-fork/adr/0001-custom-module-boundary.md` through
  `0005-upstream-merge-strategy.md`.
- Backend module boundary, registry, guard, controller, migration source,
  internal token skeleton, and their specs under
  `packages/nocodb/src/modules/internal-extensions`.
- Stable isolated-module test configuration:
  `packages/nocodb/jest.internal-extensions.config.js`.
- Frontend capability composable, page, and contract test under
  `packages/nc-gui/composables/internalExtensions`,
  `packages/nc-gui/pages/internal`, and
  `packages/nc-gui/test/internal-capabilities.test.ts`.

The architecture report, feature pipeline, ADRs, and security checklist were
created in earlier documentation commits on this branch.

## 4. Files modified

- `packages/nocodb/src/app.module.ts`: adds a prominently marked conditional
  custom-module registration hook.
- `docs/internal-fork/architecture-report.md`: records near-identical
  behavioral compatibility as a clean-room design goal.
- `docs/internal-fork/feature-pipeline.md`: records the compatibility matrix
  requirement and current feature states.
- `docs/internal-fork/adr/0001-custom-module-boundary.md`: records the same
  compatibility decision at the boundary level.

No commercial implementation, license controller/service, entitlement loader,
paid migration, EE overlay, existing API-token strategy/model, `useEeConfig`,
or license UI file is modified.

## 5. Database migrations added

`nc_internal_001_api_tokens.ts` creates `nc_internal_api_tokens` with token
identity, versioned hash, public prefix, owner/creator/revoker, lifecycle
timestamps, workspace/base allowlists, typed-scope storage, scope version, and
non-secret metadata.

The migration:

- has no plaintext token column;
- uses the independent migration history table
  `xc_internal_knex_migrations`;
- does not alter upstream token tables or migrations;
- provides a down migration that drops only `nc_internal_api_tokens`.

The SQLite up/down test passed. PostgreSQL and MySQL execution remain required
before release.

## 6. Tests added

Backend focused coverage includes:

- master and per-feature enablement/disablement;
- worker-container exclusion;
- exact response shape;
- anonymous, guest, blocked, and deleted-user denial;
- authenticated active-user success;
- controller projection and HTTP route behavior;
- token generation, salted hashing, verification, and malformed hash denial;
- token expiration and revocation;
- SQLite migration columns, absence of plaintext storage, and rollback.

Frontend focused coverage verifies the endpoint used by the capability service
and the complete response-key contract.

Focused result: 8 backend suites/22 tests passed; 1 frontend file/2 tests
passed.

## 7. Commands run

Commands were derived from repository scripts/configuration rather than
guessed. pnpm 10.28.0 was used because the repository tooling expects pnpm 10;
the machine-wide pnpm 11.9.0 is incompatible with this checkout.

| Purpose                   | Command                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------- |
| Dependency bootstrap      | `CI=true npx -y pnpm@10.28.0 run bootstrap`                                             |
| SDK compile fallback      | `npx -y pnpm@10.28.0 --filter nocodb-sdk run build:main`                                |
| Integration packages      | repository `integrations:build` and `registerIntegrations` scripts                      |
| Backend formatting        | repo Prettier over custom backend files and `src/app.module.ts`                         |
| Frontend formatting       | repo Prettier over custom frontend files                                                |
| Backend targeted tests    | `npx -y pnpm@10.28.0 exec jest --config jest.internal-extensions.config.js --runInBand` |
| Backend default tests     | `npx -y pnpm@10.28.0 test`                                                              |
| Backend E2E               | `npx -y pnpm@10.28.0 exec jest --config ./test/jest-e2e.json --runInBand`               |
| Frontend targeted tests   | `npx -y pnpm@10.28.0 exec vitest run test/internal-capabilities.test.ts`                |
| Frontend broader tests    | `npx -y pnpm@10.28.0 exec vitest run`                                                   |
| Backend lint              | repository ESLint against the targeted custom files                                     |
| Backend type check        | `npx -y pnpm@10.28.0 exec tsc --noEmit -p tsconfig.json`                                |
| Frontend type check       | repository Nuxt/Nuxi type-check entry point                                             |
| Backend production build  | `npx -y pnpm@10.28.0 exec rspack --config rspack.config.js`                             |
| Frontend production build | `npx -y pnpm@10.28.0 exec nuxi build`                                                   |
| Migration validation      | focused Jest SQLite up/down migration spec                                              |

Generated files touched by bootstrap, integration registration, or Nuxt build
were restored and are not part of the change.

## 8. Results of each command

| Check                          | Result                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Root bootstrap                 | Failed in the upstream SDK generation/build step on Windows; component dependency installation completed                                       |
| SDK `build:main`               | Passed after restoring the generator-produced inconsistent API file                                                                            |
| Integration build/registration | Passed; generated registration output was restored                                                                                             |
| Backend formatting             | Passed                                                                                                                                         |
| Frontend formatting            | Passed                                                                                                                                         |
| Backend targeted tests         | Passed: 8 suites, 22 tests; final cache-independent run used isolated-module transpilation                                                     |
| Frontend targeted tests        | Passed: 1 file, 2 tests                                                                                                                        |
| Backend default tests          | Failed before tests ran in `ts-jest`/TypeScript document registry; reproduced after clearing cache                                             |
| Backend E2E                    | Failed before tests ran with the same `ts-jest`/TypeScript document-registry error                                                             |
| Frontend broader tests         | Custom test passed; 7 upstream suites failed to resolve existing `~/...` aliases                                                               |
| Backend lint                   | ESLint failed during dependency initialization in the upstream AJV/default-meta stack                                                          |
| Backend type check             | Failed with 70 upstream/SDK/integration diagnostics; zero diagnostics referenced `internal-extensions`                                         |
| Frontend type check            | Failed during tool startup because the installed Vue TypeScript tooling requested a non-exported TypeScript `./lib/tsc` path                   |
| Backend production build       | Failed with 73 upstream SDK/model/dependency errors and 1 warning; zero errors referenced `internal-extensions` after the migration-source fix |
| Frontend production build      | Failed because the SDK bundle exports `~/lib`, which Vite resolved to the GUI `lib` directory                                                  |
| SQLite migration up/down       | Passed as part of the 22 backend tests                                                                                                         |

## 9. Known failures

The checkout cannot currently complete its full bootstrap, type-check, default
Jest, E2E, or production builds on this Windows environment. The observed
failures are in upstream SDK generation/output, module aliases, `oracledb`
availability, SDK/model type drift, `ts-jest` with TypeScript 5.8.3, Vue
type-check tooling, and ESLint/AJV initialization.

These failures were not repaired because doing so would require broad unrelated
changes. They prevent claiming application-level startup/build acceptance even
though all focused custom tests pass.

The standalone internal settings page is implemented and contract-tested, but
the upstream frontend build failure prevented production-bundle verification.

## 10. Security risks

- Full application boot with the module enabled and disabled still needs a
  stable upstream build/test environment.
- PostgreSQL and MySQL migration behavior is unverified.
- The token skeleton has no issuance API, repository, authentication strategy,
  rate limiter, or audit event; it must not be exposed yet.
- Token prefix collisions need a retry policy when persistence is implemented.
- JSON-text scope and boundary fields require strict parse-time validation.
- The capability endpoint relies on the existing `GlobalGuard` identity
  contract plus an explicit active-user guard; future upstream identity changes
  require regression tests.
- Compatibility research must remain limited to public documentation and
  black-box observable behavior, with no gated-source reuse.

## 11. Upstream merge risks

The only non-additive code change is the conditional registration hook in
`packages/nocodb/src/app.module.ts`, assessed Medium risk because application
module composition changes upstream. The internal module imports `NocoModule`
exports and `MetaService`, so provider/export refactors are another Medium-risk
coupling point.

Frontend routes/composables, internal API routes, internal tables, migration
history, documentation, and tests are additive and Low risk. No upstream file
was renamed, moved, broadly reformatted, or duplicated.

## 12. Recommended next feature

Implement FND-003, the reusable authorization regression harness, before
exposing token creation or integrating internal tokens into any route. This
provides the denial matrix needed by every later near-identical feature and
reduces the chance that UI parity masks a server-side authorization gap.

## 13. Exact acceptance criteria for the next vertical slice

FND-003 is accepted only when:

1. Reusable helpers create anonymous, active, unauthorized, authorized,
   blocked, deleted, and disabled-user request identities.
2. Reusable helpers create valid, expired, revoked, insufficient-scope, and
   cross-tenant internal-token cases without storing plaintext secrets.
3. The harness makes authentication failures (`401`) distinct from
   authenticated authorization failures (`403`).
4. A machine-readable case definition includes actor, operation, workspace,
   base, resource, token scope, and expected status.
5. At least one unchanged Community endpoint is executed through the harness,
   with no production behavior change.
6. Direct API requests prove that frontend-hidden actions remain denied.
7. Cross-base and cross-workspace cases fail even when resource identifiers are
   supplied directly.
8. Blocked, deleted, or disabled owning users invalidate otherwise valid
   sessions/tokens.
9. The harness has self-tests that fail when an expected-denial case
   accidentally returns success.
10. Targeted CI commands pass on SQLite, and PostgreSQL coverage is configured
    or the absence is explicitly blocking.
11. Usage documentation and fixture cleanup rules are added.
12. No commercial entitlement, paid authorization, or gated token code is
    modified or invoked.
