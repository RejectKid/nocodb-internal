# Custom code manifest

## Automated Docker handoff (2026-10-05)

Owner: Internal Platform Team. Feature IDs: FND-001, FND-003. No upstream
application/license files touched. Merge risk: low; runtime dependency/version
compatibility must be checked when upgrading the pinned Community base image.

- `.github/workflows/internal-docker-handoff.yml`: manual/packaging-PR build and
  private artifact upload; reads repo only.
- `scripts/internal-fork/rspack.handoff.cjs`: upstream Docker build adapter.
- `scripts/internal-fork/build-handoff.mjs`: image build/export, isolated smoke
  project, safe template copying, hashes and ZIP packaging.
- `scripts/internal-fork/smoke-handoff.mjs`: fresh-stack admin/teams/documents
  API denial and persistence fixtures.
- `deploy/internal-fork/Dockerfile.handoff`: pinned Community runtime overlay.
- `deploy/internal-fork/handoff/compose.yaml`: isolated trial Compose template.
- `deploy/internal-fork/handoff/{setup,start,stop,load-images}.{ps1,sh}`: local
  unique-secret creation, checksum loading, startup and volume-preserving stop.
- `deploy/internal-fork/handoff/.env.example`: placeholder configuration only.
- `deploy/internal-fork/handoff/README.md`, `FEATURE-TESTS.md`,
  `example-document.md`: coworker instructions and acceptance examples.
- `docs/internal-fork/docker-handoff-workflow.md`: workflow operation guide.
- `.gitignore`: excludes generated contexts, QA secrets and bundles.

Owner used below: Internal Platform Team. “Upstream files touched” names the
non-custom registration or adapter surface required by the file. Merge risk is
Low unless an upstream conflict or security-sensitive integration is expected.

| Path                                                                                                                    | Purpose                                                                               | Upstream files touched                   | Merge risk | Owner                  | Feature IDs                |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- | ---------- | ---------------------- | -------------------------- |
| `MODIFICATIONS.md`                                                                                                      | Prominent derivative notice                                                           | None                                     | Low        | Internal Platform Team | FND-001                    |
| `docs/internal-fork/architecture-report.md`                                                                             | Repository and extension-point report                                                 | None                                     | Low        | Internal Platform Team | FND-001                    |
| `docs/internal-fork/feature-pipeline.md`                                                                                | Feature delivery pipeline                                                             | None                                     | Low        | Internal Platform Team | All                        |
| `docs/internal-fork/security-review.md`                                                                                 | Release security checklist                                                            | None                                     | Low        | Internal Platform Team | SEC-003                    |
| `docs/internal-fork/internal-feature-registry.md`                                                                       | Registry configuration and API guide                                                  | None                                     | Low        | Internal Platform Team | FND-002                    |
| `docs/internal-fork/fine-grained-api-token-design.md`                                                                   | Token storage/security design                                                         | None                                     | Low        | Internal Platform Team | TOK-001, TOK-002           |
| `docs/internal-fork/internal-api-token-authorization.md`                                                                | Scope catalog, policy algorithm, and HTTP blockers                                    | None                                     | Low        | Internal Platform Team | TOK-002                    |
| `docs/internal-fork/initial-completion-report.md`                                                                       | Initial slice results and validation record                                           | None                                     | Low        | Internal Platform Team | FND-001, FND-002, TOK-001  |
| `docs/internal-fork/stage-2-token-model-report.md`                                                                      | TOK-001 delivery, validation, and risk record                                         | None                                     | Low        | Internal Platform Team | TOK-001                    |
| `docs/internal-fork/stage-3-token-policy-report.md`                                                                     | TOK-002 policy delivery, validation, and risk record                                  | None                                     | Low        | Internal Platform Team | TOK-002                    |
| `docs/internal-fork/custom-code-manifest.md`                                                                            | Custom-file inventory                                                                 | None                                     | Low        | Internal Platform Team | FND-001                    |
| `docs/internal-fork/adr/0001-custom-module-boundary.md`                                                                 | Boundary decision                                                                     | None                                     | Low        | Internal Platform Team | FND-001                    |
| `docs/internal-fork/adr/0002-independent-feature-registry.md`                                                           | Registry independence decision                                                        | None                                     | Low        | Internal Platform Team | FND-002                    |
| `docs/internal-fork/adr/0003-centralized-authorization.md`                                                              | Authorization architecture                                                            | None                                     | Low        | Internal Platform Team | FND-003, PERM-001, TOK-002 |
| `docs/internal-fork/adr/0004-fine-grained-token-storage.md`                                                             | Token storage decision                                                                | None                                     | Low        | Internal Platform Team | TOK-001                    |
| `docs/internal-fork/adr/0005-upstream-merge-strategy.md`                                                                | Upstream integration decision                                                         | None                                     | Low        | Internal Platform Team | FND-001                    |
| `packages/nocodb/src/app.module.ts`                                                                                     | Conditional internal-module registration hook; upstream file with modification notice | Self                                     | Medium     | Internal Platform Team | FND-001                    |
| `packages/nocodb/jest.internal-extensions.config.js`                                                                    | Stable isolated-module Jest runner for custom tests                                   | Existing Jest/ts-jest packages only      | Low        | Internal Platform Team | FND-002, TOK-001           |
| `packages/nocodb/src/modules/internal-extensions/index.ts`                                                              | Disabled-mode module selector                                                         | `packages/nocodb/src/app.module.ts`      | Medium     | Internal Platform Team | FND-001                    |
| `packages/nocodb/src/modules/internal-extensions/internal-extensions.module.ts`                                         | Isolated Nest composition root                                                        | NocoModule exports only                  | Medium     | Internal Platform Team | FND-001, FND-002, TOK-001, TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/internal-extensions.module.spec.ts`                                    | Enabled/disabled/worker boundary tests                                                | None                                     | Low        | Internal Platform Team | FND-001                    |
| `packages/nocodb/src/modules/internal-extensions/authorization/internal-authenticated.guard.ts`                         | Active authenticated-user gate                                                        | Existing resolved request identity       | Medium     | Internal Platform Team | FND-002, FND-003           |
| `packages/nocodb/src/modules/internal-extensions/authorization/internal-authenticated.guard.spec.ts`                    | Authentication denial/success tests                                                   | None                                     | Low        | Internal Platform Team | FND-002, FND-003           |
| `packages/nocodb/src/modules/internal-extensions/feature-registry/internal-feature.types.ts`                            | Registry keys and response types                                                      | None                                     | Low        | Internal Platform Team | FND-002                    |
| `packages/nocodb/src/modules/internal-extensions/feature-registry/internal-feature.config.ts`                           | Fail-closed `NC_INTERNAL_*` parser                                                    | None                                     | Low        | Internal Platform Team | FND-001, FND-002           |
| `packages/nocodb/src/modules/internal-extensions/feature-registry/internal-feature-registry.service.ts`                 | Authoritative registry service                                                        | None                                     | Low        | Internal Platform Team | FND-002                    |
| `packages/nocodb/src/modules/internal-extensions/feature-registry/internal-feature-registry.service.spec.ts`            | Registry enable/disable/shape tests                                                   | None                                     | Low        | Internal Platform Team | FND-002                    |
| `packages/nocodb/src/modules/internal-extensions/feature-registry/internal-capabilities.controller.ts`                  | Authenticated read-only capability endpoint                                           | Global identity and limiter guards       | Medium     | Internal Platform Team | FND-002, API-001           |
| `packages/nocodb/src/modules/internal-extensions/feature-registry/internal-capabilities.controller.spec.ts`             | Endpoint projection test                                                              | None                                     | Low        | Internal Platform Team | FND-002                    |
| `packages/nocodb/src/modules/internal-extensions/feature-registry/internal-capabilities.controller.Integration.spec.ts` | HTTP authentication and response integration tests                                    | Nest test application                    | Low        | Internal Platform Team | FND-002                    |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-token-scope.ts`                                | Typed independent token scopes                                                        | None                                     | Low        | Internal Platform Team | TOK-002                    |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-token.model.ts`                                | Independent token lifecycle entity                                                    | None                                     | Low        | Internal Platform Team | TOK-001                    |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-token.model.spec.ts`                           | Expiration/revocation tests                                                           | None                                     | Low        | Internal Platform Team | TOK-001                    |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-token.repository.ts`                           | Independent persistence and revocation contract                                       | None                                     | Low        | Internal Platform Team | TOK-001                    |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/knex-internal-api-token.repository.ts`                      | Portable validated token persistence                                                  | Metadata database connection             | Medium     | Internal Platform Team | TOK-001                    |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/knex-internal-api-token.repository.spec.ts`                 | Repository round-trip, revocation, collision, and corruption tests                    | SQLite test connection                   | Low        | Internal Platform Team | TOK-001                    |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-token-issuance.service.ts`                     | Validated one-time token issuance and prefix-collision retry                          | None                                     | Medium     | Internal Platform Team | TOK-001                    |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-token-issuance.service.spec.ts`                | One-time response and plaintext non-persistence tests                                 | SQLite test connection                   | Low        | Internal Platform Team | TOK-001                    |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-hashing.service.ts`                          | Hashing/generation abstraction                                                        | None                                     | Low        | Internal Platform Team | TOK-001                    |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/scrypt-internal-token-hashing.service.ts`                   | Versioned secure hashing implementation                                               | Node crypto only                         | Medium     | Internal Platform Team | TOK-001                    |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/scrypt-internal-token-hashing.service.spec.ts`              | Hash/generate/verify tests                                                            | None                                     | Low        | Internal Platform Team | TOK-001                    |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-authorization.policy.ts`                     | Centralized token policy interface                                                    | None                                     | Low        | Internal Platform Team | TOK-002, FND-003           |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/default-internal-token-authorization.policy.ts`             | Default-deny owner, scope, lifecycle, and tenant policy                               | None                                     | Medium     | Internal Platform Team | TOK-002, FND-003           |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/default-internal-token-authorization.policy.spec.ts`        | Complete scope and policy denial tests                                                | None                                     | Low        | Internal Platform Team | TOK-002, FND-003           |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-token-scope.catalog.ts`                        | Canonical internal scope family and label catalog                                     | None                                     | Low        | Internal Platform Team | TOK-002, TOK-003           |
| `packages/nocodb/src/modules/internal-extensions/migrations/internal-migration-source.ts`                               | Independent Knex migration registry                                                   | None                                     | Medium     | Internal Platform Team | FND-001, TOK-001           |
| `packages/nocodb/src/modules/internal-extensions/migrations/internal-extensions-migration.service.ts`                   | Runs internal migrations after MetaService init                                       | NocoModule `MetaService` export          | Medium     | Internal Platform Team | FND-001, TOK-001           |
| `packages/nocodb/src/modules/internal-extensions/migrations/nc_internal_001_api_tokens.ts`                              | Creates/drops internal token table                                                    | Metadata database connection only        | Medium     | Internal Platform Team | TOK-001                    |
| `packages/nocodb/src/modules/internal-extensions/migrations/nc_internal_001_api_tokens.spec.ts`                         | SQLite migration up/down test                                                         | None                                     | Low        | Internal Platform Team | TOK-001                    |
| `packages/nc-gui/composables/internalExtensions/useInternalCapabilities.ts`                                             | Frontend capability service/state                                                     | Existing Axios API instance              | Low        | Internal Platform Team | FND-002                    |
| `packages/nc-gui/pages/internal/settings/capabilities.vue`                                                              | Authenticated capability settings page                                                | Nuxt file routing/global auth middleware | Low        | Internal Platform Team | FND-002                    |
| `packages/nc-gui/test/internal-capabilities.test.ts`                                                                    | Frontend endpoint/response-contract tests                                             | None                                     | Low        | Internal Platform Team | FND-002                    |

## Stage 1 authorization harness files

Owner for every file below: Internal Platform Team. Upstream files touched:
None, except the Community endpoint regression imports `CachesController`
without modifying it.

| Path | Purpose | Merge risk | Feature IDs |
| --- | --- | --- | --- |
| `docs/internal-fork/authorization-test-harness.md` | Usage, cases, and cleanup rules | Low | FND-003 |
| `docs/internal-fork/stage-1-foundation-report.md` | Stage 1 validation and acceptance record | Low | FND-001, FND-002, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/testing/authorization/index.ts` | Public test exports | Low | FND-003 |
| `packages/nocodb/src/modules/internal-extensions/testing/authorization/internal-authorization-harness.types.ts` | Typed matrix contracts | Low | FND-003 |
| `packages/nocodb/src/modules/internal-extensions/testing/authorization/internal-authorization-matrix.runner.ts` | Matrix validation and execution | Low | FND-003, SEC-002 |
| `packages/nocodb/src/modules/internal-extensions/testing/authorization/internal-authorization-fixtures.ts` | Identity and token fixtures | Low | FND-003 |
| `packages/nocodb/src/modules/internal-extensions/testing/authorization/internal-authorization-reference.executor.ts` | Self-test executor | Low | FND-003 |
| `packages/nocodb/src/modules/internal-extensions/testing/authorization/authorization-regression.matrix.json` | Machine-readable denial matrix | Low | FND-003, SEC-002 |
| `packages/nocodb/src/modules/internal-extensions/testing/authorization/authorization-regression-matrix.loader.ts` | Versioned matrix loader | Low | FND-003, SEC-002 |
| `packages/nocodb/src/modules/internal-extensions/testing/authorization/internal-authorization-matrix.runner.spec.ts` | Harness self-tests | Low | FND-003 |
| `packages/nocodb/src/modules/internal-extensions/testing/authorization/internal-authorization-fixtures.spec.ts` | Fixture and redaction tests | Low | FND-003 |
| `packages/nocodb/src/modules/internal-extensions/testing/authorization/community-cache-authorization.Integration.spec.ts` | Unchanged Community route regression | Low | FND-003 |
| `packages/nocodb/src/modules/internal-extensions/testing/authorization/internal-token-policy.matrix.executor.ts` | Shared matrix adapter for production token policy | Low | FND-003, TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/testing/authorization/internal-token-policy.matrix.spec.ts` | Production token-policy matrix regression | Low | FND-003, TOK-002 |

## Explicitly untouched commercial surfaces

No license controller/service, entitlement loader, paid feature flag, EE
overlay, existing API-token model/table/strategy, existing gated
fine-grained-token migration, `useEeConfig`, or license UI file is modified by
this manifest.

## Stage 5 internal security audit files

Owner for every file below: Internal Platform Team. No upstream commercial file
is touched.

| Path | Purpose | Upstream files touched | Merge risk | Feature IDs |
| --- | --- | --- | --- | --- |
| `docs/internal-fork/internal-security-audit-events.md` | Event, redaction, atomicity, and retention design | None | Low | SEC-001 |
| `docs/internal-fork/stage-5-security-audit-foundation-report.md` | Delivery and validation record | None | Low | SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/audit/internal-audit-event.ts` | Typed action, actor, and resource catalog | None | Low | SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/audit/internal-audit-event.model.ts` | Event and context contracts | None | Low | SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/audit/internal-audit-redaction.service.ts` | Recursive secret redaction | None | Medium | SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/audit/internal-audit-request-context.adapter.ts` | Bounded request-context extraction | Community request context | Medium | SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/audit/internal-audit.repository.ts` | Append, bounded-read, and transaction contract | None | Low | SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/audit/knex-internal-audit.repository.ts` | Validated metadata persistence | Metadata connection | Medium | SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/audit/internal-audit.service.ts` | Event preparation and atomic mutation helper | None | Medium | SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/audit/*.spec.ts` | Redaction, context, persistence, isolation, and atomicity tests | SQLite test connection | Low | SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/migrations/nc_internal_003_audit_events.ts` | Independent audit table and indexes | None | Medium | SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/migrations/nc_internal_003_audit_events.spec.ts` | Migration and rollback tests | None | Low | SEC-001 |

## Stage 4 base-permission model files

Owner for every file below: Internal Platform Team. No upstream commercial file
is touched.

| Path | Purpose | Upstream files touched | Merge risk | Feature IDs |
| --- | --- | --- | --- | --- |
| `docs/internal-fork/internal-base-permissions.md` | Resolution and rollout design | None | Low | PERM-001 |
| `docs/internal-fork/stage-4-base-permission-model-report.md` | Delivery and validation record | None | Low | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission.ts` | Typed permission catalog | None | Low | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/community-base-membership.adapter.ts` | Community effective-role fact adapter | Community `User.getWithRoles` result | Medium | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/community-base-membership.adapter.spec.ts` | Effective-role, owner, and lifecycle mapping tests | None | Low | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission.model.ts` | Configuration and assignment models | None | Low | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission.repository.ts` | Persistence contract | None | Low | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/knex-internal-base-permission.repository.ts` | Validated metadata persistence | Metadata connection | Medium | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/knex-internal-base-permission.repository.spec.ts` | Persistence, isolation, update, and corruption tests | SQLite test connection | Low | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission.policy.ts` | Central policy contract | None | Low | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/default-internal-base-permission.policy.ts` | Deterministic default policy | None | Low | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/default-internal-base-permission.policy.spec.ts` | Resolution and denial tests | None | Low | PERM-001, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission.service.ts` | Effective-permission read model | None | Low | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/migrations/nc_internal_002_base_permissions.ts` | Independent permission tables | None | Medium | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/migrations/nc_internal_002_base_permissions.spec.ts` | Migration and uniqueness tests | None | Low | PERM-001 |

## Stage 6 base-permission administration API files

Owner for every file below: Internal Platform Team. No commercial entitlement
or permission implementation is touched.

| Path | Purpose | Upstream files touched | Merge risk | Feature IDs |
| --- | --- | --- | --- | --- |
| `docs/internal-fork/internal-base-permission-administration-api.md` | Administration contract, authorization, and concurrency guide | None | Low | PERM-002, SEC-001 |
| `docs/internal-fork/stage-6-base-permission-admin-api-report.md` | Delivery and validation record | None | Low | PERM-002 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission-identity.provider.ts` | Authoritative identity-provider contract | None | Low | PERM-002 |
| `packages/nocodb/src/modules/internal-extensions/permissions/community-base-permission-identity.provider.ts` | Community base and membership lookup adapter | Community `Base` and `User` models | Medium | PERM-002 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission-admin.types.ts` | Read and optimistic-write API contracts | None | Low | PERM-002 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission-admin.service.ts` | Central administration authorization and audited mutations | SEC-001 service | Medium | PERM-002, SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permissions.controller.ts` | Authenticated internal v1 HTTP routes | Existing Community guards | Medium | PERM-002 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission-admin.service.spec.ts` | Authorization, audit, isolation, and concurrency tests | None | Low | PERM-002, FND-003, SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permissions.controller.Integration.spec.ts` | Direct HTTP authentication and route-contract tests | None | Low | PERM-002, FND-003 |

## Stage 7 base-permission editor files

Owner for every file below: Internal Platform Team. No commercial entitlement
or permission component is touched.

| Path | Purpose | Upstream files touched | Merge risk | Feature IDs |
| --- | --- | --- | --- | --- |
| `docs/internal-fork/internal-base-permission-editor.md` | Administrator workflow and security behavior | None | Low | PERM-002 |
| `docs/internal-fork/stage-7-base-permission-editor-report.md` | Delivery and validation record | None | Low | PERM-002 |
| `packages/nc-gui/composables/internalExtensions/useInternalBasePermissions.ts` | Typed API contract, revision writes, and effective-source explanation | Existing Axios instance only | Low | PERM-002 |
| `packages/nc-gui/components/internalExtensions/basePermissions/Editor.vue` | Isolated capability-gated permission matrix | Community base-member store | Medium | PERM-002 |
| `packages/nc-gui/test/internal-base-permissions.test.ts` | API, concurrency, and authorization helper tests | None | Low | PERM-002, FND-003 |
| `packages/nc-gui/components/dashboard/settings/base/index.vue` | Small General-settings registration hook | Community base-settings shell | Medium | PERM-002 |

## Stage 8 base-permission browser security files

Owner for every file below: Internal Platform Team. No commercial entitlement
or permission component is touched.

| Path | Purpose | Upstream files touched | Merge risk | Feature IDs |
| --- | --- | --- | --- | --- |
| `.github/workflows/internal-extension-browser-security.yml` | Path-filtered Playwright security regression workflow | None | Low | PERM-002 |
| `.gitignore` | Excludes Playwright reports and result artifacts | Root ignore list | Low | PERM-002 |
| `packages/nc-gui/package.json` | Adds the isolated browser-test command and pinned Playwright dependency | GUI workspace manifest | Low | PERM-002 |
| `pnpm-lock.yaml` | Records the direct GUI Playwright development dependency | Root lockfile | Low | PERM-002 |
| `packages/nc-gui/test/internal-extensions-browser/playwright.config.ts` | Isolated browser runner and local Chrome selection | None | Low | PERM-002 |
| `packages/nc-gui/test/internal-extensions-browser/vite.config.ts` | Vue harness, HTTP scenarios, and test-only style transform | None | Low | PERM-002 |
| `packages/nc-gui/test/internal-extensions-browser/harness/index.html` | Browser harness document | None | Low | PERM-002 |
| `packages/nc-gui/test/internal-extensions-browser/harness/main.ts` | Community-compatible adapters and real component mounts | None | Low | PERM-002 |
| `packages/nc-gui/test/internal-extensions-browser/harness/nocodb-sdk.ts` | Minimal SDK values required by the isolated mounts | None | Low | PERM-002 |
| `packages/nc-gui/test/internal-extensions-browser/internal-base-permissions.spec.ts` | Browser authorization and concurrency regressions | None | Low | PERM-002, FND-003 |
| `docs/internal-fork/stage-8-base-permission-browser-security-report.md` | Delivery, test-boundary, and residual-risk record | None | Low | PERM-002 |

## Stage 9 V2 record-permission enforcement files

Owner for every file below: Internal Platform Team. No commercial entitlement
or permission implementation is touched.

| Path | Purpose | Upstream files touched | Merge risk | Feature IDs |
| --- | --- | --- | --- | --- |
| `docs/internal-fork/stage-9-v2-record-permission-enforcement-report.md` | Delivery, request-flow, validation, and residual-risk record | None | Low | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission-enforcement.decorator.ts` | Inert typed Community-route metadata | None | Low | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission-enforcement.interceptor.ts` | Capability-gated centralized route enforcement | Community request context and ACL ordering | Medium | PERM-001, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission-enforcement.interceptor.spec.ts` | HTTP authorization and production metadata matrix | Community `DataTableController` import only | Low | PERM-001, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/internal-extensions.module.ts` | Conditional global-interceptor registration | Existing internal composition root | Low | PERM-001 |
| `packages/nocodb/src/controllers/data-table.controller.ts` | Small typed metadata hooks for the full V2 record family | Self | Medium | PERM-001 |

## Stage 10 V3 record-permission enforcement files

Owner for every file below: Internal Platform Team. No commercial entitlement
or permission implementation is touched.

| Path | Purpose | Upstream files touched | Merge risk | Feature IDs |
| --- | --- | --- | --- | --- |
| `docs/internal-fork/stage-10-v3-record-permission-enforcement-report.md` | V3 mapping, security boundary, validation, and residual-risk record | None | Low | PERM-001 |
| `packages/nocodb/src/controllers/v3/data-v3.controller.ts` | Typed metadata hooks for the full V3 record family | Self | Medium | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission-v3-enforcement.spec.ts` | V3 production metadata and compound-resolution tests | Community `Datav3Controller` import only | Low | PERM-001, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission-enforcement.decorator.ts` | Supports one or more typed permission requirements | None | Low | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission-enforcement.interceptor.ts` | Denies when any required permission fails | Community request context and ACL ordering | Medium | PERM-001, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission-enforcement.interceptor.spec.ts` | Compound HTTP allow/deny regression | None | Low | PERM-001, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permission.service.ts` | Evaluates multiple permissions from one fetched read set | None | Low | PERM-001 |

## Stage 11 base-permission enforcement completion files

Owner for every file below: Internal Platform Team. No commercial entitlement
or permission implementation is touched.

| Path | Purpose | Upstream files touched | Merge risk | Feature IDs |
| --- | --- | --- | --- | --- |
| `docs/internal-fork/stage-11-base-permission-enforcement-completion-report.md` | Full enforcement coverage, validation, and residual-risk record | None | Low | PERM-001, SEC-002 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-community-acl-permission-map.ts` | Central typed adapter for base-scoped Community ACL names | Community ACL metadata contract | Medium | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-community-acl-permission-map.spec.ts` | Permission-family and commercial-operation isolation tests | None | Low | PERM-001, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-request-permission-resolver.ts` | Bounded internal API and MCP operation resolver | Shared-route request contracts | Medium | PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-request-permission-resolver.spec.ts` | Single, batch, protocol, and MCP mapping tests | None | Low | PERM-001, FND-003 |
| `packages/nocodb/src/controllers/internal.controller.ts` | Small request-derived authorization metadata hooks | Self | Medium | PERM-001 |
| `packages/nocodb/src/mcp/mcp.controller.ts` | MCP request-derived permission hook and pre-dispatch guard | Self | Medium | PERM-001 |
| `packages/nocodb/src/mcp/mcp-token.guard.ts` | Pre-interceptor MCP actor authentication | Community MCP token and user models | Medium | PERM-001, FND-003 |
| `packages/nocodb/src/mcp/mcp-token.guard.spec.ts` | MCP authentication and disabled-user denial tests | None | Low | PERM-001, FND-003 |
| `packages/nocodb/src/modules/jobs/jobs/data-export/data-export.controller.ts` | Explicit export plus record-read requirement | Self | Medium | PERM-001 |
| `packages/nocodb/src/modules/noco.module.ts` | Registers the MCP authentication guard | Existing MCP provider list | Low | PERM-001 |

## Stage 12 token administration files

Owner for every file below: Internal Platform Team. No commercial token,
entitlement, or permission implementation is touched.

| Path | Purpose | Upstream files touched | Merge risk | Feature IDs |
| --- | --- | --- | --- | --- |
| `docs/internal-fork/internal-api-token-administration.md` | Administrator and incident-response guide | None | Low | TOK-003 |
| `docs/internal-fork/stage-12-token-administration-report.md` | Delivery, validation, and residual-risk record | None | Low | TOK-003 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-token-admin.types.ts` | Independent administration contracts | None | Low | TOK-003 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-token-admin.service.ts` | Boundary validation, authorization, and audited mutations | Internal permission and audit services | Medium | TOK-003, PERM-001, SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-tokens.controller.ts` | Authenticated internal v1 administration routes | Existing Community guards | Medium | TOK-003 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-token-admin.service.spec.ts` | Authorization, boundary, secret, audit, and revoke tests | None | Low | TOK-003, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-tokens.controller.Integration.spec.ts` | Direct HTTP authentication and contract tests | None | Low | TOK-003, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-token.repository.ts` | Adds caller-transaction support | None | Low | TOK-003, SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/knex-internal-api-token.repository.ts` | Atomic token persistence in audit transactions | Metadata connection | Medium | TOK-003, SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/knex-internal-api-token.repository.spec.ts` | Caller-transaction rollback regression | None | Low | TOK-003, SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-token-issuance.service.ts` | Transaction-aware one-time issuance | None | Low | TOK-003 |
| `packages/nocodb/src/modules/internal-extensions/internal-extensions.module.ts` | Registers isolated token controller and service | Existing internal composition root | Low | TOK-003 |
| `packages/nc-gui/composables/internalExtensions/useInternalApiTokens.ts` | Typed token administration client and lifecycle helpers | Existing Axios instance | Low | TOK-003 |
| `packages/nc-gui/components/internalExtensions/apiTokens/Editor.vue` | Capability-gated token editor and one-time secret flow | Existing base/settings stores | Medium | TOK-003 |
| `packages/nc-gui/components/dashboard/settings/base/index.vue` | Small API Tokens navigation and component hook | Community base-settings shell | Medium | TOK-003 |
| `packages/nc-gui/test/internal-api-tokens.test.ts` | Client path and lifecycle tests | None | Low | TOK-003 |
| `packages/nc-gui/test/internal-extensions-browser/internal-api-tokens.spec.ts` | Browser denial, copy-once, revoke, and gating tests | Existing isolated browser harness | Low | TOK-003, FND-003 |
| `packages/nc-gui/test/internal-extensions-browser/harness/main.ts` | Adds real token-editor mounting and client adapters | Existing browser harness | Low | TOK-003 |
| `packages/nc-gui/test/internal-extensions-browser/vite.config.ts` | Deterministic token administration HTTP scenarios | Existing browser harness | Low | TOK-003, FND-003 |

## Stage 13 internal-token authentication files

Owner for every file below: Internal Platform Team. No Community/commercial
token strategy, entitlement, feature flag, or license implementation is
modified.

| Path | Purpose | Upstream files touched | Merge risk | Feature IDs |
| --- | --- | --- | --- | --- |
| `docs/internal-fork/stage-13-token-authentication-report.md` | Request flow, validation, and residual-risk record | None | Low | TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-authentication.service.ts` | Strict parsing, lookup, verification, and owner authentication | Independent token repository and hash service | Medium | TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-authentication.guard.ts` | Internal credential projection into request identity | Community request contract and header helper | Medium | TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-owner.provider.ts` | Fresh-owner adapter contract and minimal identity projection | None | Low | TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/community-internal-token-owner.provider.ts` | Community user-state adapter | Community `User.get` only | Medium | TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-scope.decorator.ts` | Typed scope, target, and owner-permission route metadata | None | Low | TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-scope.guard.ts` | Central scope, tenant, owner-permission, and last-use enforcement | Internal base-permission services | Medium | TOK-002, PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-verification-rate-limiter.ts` | Bounded failed-verification limiter | None | Low | TOK-002, SEC-003 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-authorization.policy.ts` | Adds authentication preflight to the central policy contract | None | Low | TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/default-internal-token-authorization.policy.ts` | Reuses one lifecycle/owner authentication decision in route authorization | None | Low | TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-token.repository.ts` | Adds throttled last-use persistence contract | None | Low | TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/knex-internal-api-token.repository.ts` | Atomic conditional last-use update | Metadata connection | Medium | TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/scrypt-internal-token-hashing.service.ts` | Strict canonical token/hash bounds before scrypt | None | Low | TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/feature-registry/internal-capabilities.controller.ts` | Explicit `admin:read` internal-token metadata | Existing internal controller | Low | TOK-002, FND-002 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-api-tokens.controller.ts` | Explicit token read/write metadata | Existing internal controller | Low | TOK-002, TOK-003 |
| `packages/nocodb/src/modules/internal-extensions/permissions/internal-base-permissions.controller.ts` | Explicit admin read/write metadata | Existing internal controller | Low | TOK-002, PERM-001 |
| `packages/nocodb/src/modules/internal-extensions/internal-extensions.module.ts` | Registers independent authentication providers and guards | Existing internal composition root | Low | TOK-002 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-authentication.service.spec.ts` | Parsing, lookup, verification, owner, and generic-failure tests | None | Low | TOK-002, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-authentication.guard.spec.ts` | Header, request projection, generic 401, and 429 tests | None | Low | TOK-002, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/community-internal-token-owner.provider.spec.ts` | Active, blocked, deleted, disabled, and missing-owner adapter tests | None | Low | TOK-002, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-http-authentication.Integration.spec.ts` | Direct HTTP credential, scope, owner, tenant, last-use, and limiter matrix | None | Low | TOK-002, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-scope.guard.spec.ts` | Scope, permission, tenant, lifecycle, and last-use tests | None | Low | TOK-002, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-route-metadata.spec.ts` | Exact production route scope/target/owner-permission metadata tests | None | Low | TOK-002, FND-003 |
| `packages/nocodb/src/modules/internal-extensions/api-tokens/internal-token-verification-rate-limiter.spec.ts` | Threshold, expiry, and bounded-state tests | None | Low | TOK-002, SEC-003 |

## Consolidated product-suite files

Owner for every file below: Internal Platform Team.

| Path | Purpose | Upstream files touched | Merge risk | Feature IDs |
| --- | --- | --- | --- | --- |
| `packages/nocodb/src/modules/internal-extensions/admin/internal-admin.controller.ts` | Internal v1 administration routes | Community guards | Medium | ADM-001–003 |
| `packages/nocodb/src/modules/internal-extensions/admin/internal-admin.service.ts` | Redacted overview and audited administration | Community user/cache tables | Medium | ADM-001–003, SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/authorization/internal-super-admin.guard.ts` | Fresh super-admin authorization | Community user model | Low | ADM-001–003 |
| `packages/nocodb/src/modules/internal-extensions/authorization/internal-workspace-manager.guard.ts` | Fresh workspace-manager authorization | Community workspace membership | Low | API-002 |
| `packages/nocodb/src/modules/internal-extensions/collaboration/internal-collaboration.controller.ts` | Separate collaboration API | Community guards | Medium | API-002 |
| `packages/nocodb/src/modules/internal-extensions/collaboration/internal-collaboration.service.ts` | Community membership adapters and audit | Community membership services | Medium | API-002, SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/discussions/internal-discussion.controller.ts` | Record-discussion API | Community guards | Low | MODE-003 |
| `packages/nocodb/src/modules/internal-extensions/discussions/internal-discussion.service.ts` | Tenant-bound threads, mentions, moderation | Community model/membership reads | Medium | MODE-003, SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/documents/internal-document-permission.service.ts` | Nested document permission policy | Community role reads | Medium | DOC-001 |
| `packages/nocodb/src/modules/internal-extensions/documents/internal-document.service.ts` | Documents, snapshots, comments, export orchestration | Metadata connection | Medium | DOC-001–004 |
| `packages/nocodb/src/modules/internal-extensions/documents/internal-document.types.ts` | Independent document contracts | None | Low | DOC-001 |
| `packages/nocodb/src/modules/internal-extensions/documents/internal-documents.controller.ts` | Internal v1 document API | Community guards | Medium | DOC-001–004 |
| `packages/nocodb/src/modules/internal-extensions/documents/internal-pdf.service.ts` | No-network trusted PDF renderer | None | Low | DOC-004 |
| `packages/nocodb/src/modules/internal-extensions/documents/internal-pdf.service.spec.ts` | PDF safety/structure tests | None | Low | DOC-004 |
| `packages/nocodb/src/modules/internal-extensions/feature-registry/internal-feature.guard.ts` | Global and per-base feature guard | Metadata connection | Low | FND-002, ADM-003 |
| `packages/nocodb/src/modules/internal-extensions/feature-registry/internal-feature.guard.spec.ts` | Feature guard allow/deny tests | None | Low | FND-003 |
| `packages/nocodb/src/modules/internal-extensions/internal-extension.constants.ts` | Independent extension version | None | Low | FND-001 |
| `packages/nocodb/src/modules/internal-extensions/migrations/nc_internal_004_product_suite.ts` | Additive product-suite schema | Internal migration runner | Medium | ADM, VAL, MODE, DOC |
| `packages/nocodb/src/modules/internal-extensions/migrations/nc_internal_004_product_suite.spec.ts` | Up/down isolation tests | None | Low | FND-003 |
| `packages/nocodb/src/modules/internal-extensions/notifications/internal-notification.service.ts` | Independent mention notifications | Metadata connection | Low | MODE-003, DOC-003 |
| `packages/nocodb/src/modules/internal-extensions/notifications/internal-notifications.controller.ts` | Notification list/read API | Community guards | Low | MODE-003, DOC-003 |
| `packages/nocodb/src/modules/internal-extensions/openapi/internal-openapi.controller.ts` | Authenticated OpenAPI endpoint | Community guards | Low | API-001 |
| `packages/nocodb/src/modules/internal-extensions/openapi/internal-openapi.service.ts` | Independent OpenAPI 3.1 contract | None | Low | API-001 |
| `packages/nocodb/src/modules/internal-extensions/openapi/internal-openapi.service.spec.ts` | Contract isolation/auth tests | None | Low | API-001 |
| `packages/nocodb/src/modules/internal-extensions/record-modes/internal-file-preview.controller.ts` | Record-bound attachment URL authorization | Community attachment service | Medium | MODE-002 |
| `packages/nocodb/src/modules/internal-extensions/validation/internal-validation.controller.ts` | Validation-rule API | Community guards | Low | VAL-001 |
| `packages/nocodb/src/modules/internal-extensions/validation/internal-validation.engine.ts` | Authoritative typed validation engine | None | Low | VAL-001 |
| `packages/nocodb/src/modules/internal-extensions/validation/internal-validation.engine.spec.ts` | Rule and safe-regex tests | None | Low | VAL-001 |
| `packages/nocodb/src/modules/internal-extensions/validation/internal-validation.interceptor.ts` | Community write-path enforcement | Community route metadata | High | VAL-001 |
| `packages/nocodb/src/modules/internal-extensions/validation/internal-validation.repository.ts` | Rule persistence | Metadata connection | Low | VAL-001 |
| `packages/nocodb/src/modules/internal-extensions/validation/internal-validation.service.ts` | Audited rule administration | Internal audit service | Low | VAL-001, SEC-001 |
| `packages/nocodb/src/modules/internal-extensions/validation/internal-validation.types.ts` | Zod rule contracts | None | Low | VAL-001 |
| `packages/nocodb/src/modules/internal-extensions/views/internal-view-management.controller.ts` | Separate view-management API | Community guards | Medium | API-003 |
| `packages/nocodb/src/modules/internal-extensions/views/internal-view-management.service.ts` | Supported Community view adapters | Community view services | Medium | API-003 |
| `packages/nc-gui/components/internalExtensions/documents/Editor.vue` | Documents, history, permissions, comments UI | Community UI primitives | Medium | DOC-001–004 |
| `packages/nc-gui/components/internalExtensions/recordModes/Discussion.vue` | Independent record discussion mode | Expanded-form store | Medium | MODE-003 |
| `packages/nc-gui/components/internalExtensions/recordModes/FilePreview.vue` | Independent authorized file mode | Expanded-form store | Medium | MODE-002 |
| `packages/nc-gui/components/internalExtensions/recordModes/Selector.vue` | Community internal mode selector | Expanded-form shell | Low | MODE-001–003 |
| `packages/nc-gui/components/internalExtensions/validation/Editor.vue` | Field-compatible validation editor | Community base settings | Medium | VAL-002 |
| `packages/nc-gui/composables/internalExtensions/useInternalAdmin.ts` | Administration client | Axios instance | Low | ADM-001–003 |
| `packages/nc-gui/composables/internalExtensions/useInternalDiscussions.ts` | Record-discussion client | Axios instance | Low | MODE-003 |
| `packages/nc-gui/composables/internalExtensions/useInternalDocuments.ts` | Document client and snapshot conversion | Axios instance | Low | DOC-001–004 |
| `packages/nc-gui/composables/internalExtensions/useInternalFilePreview.ts` | Attachment authorization client | Axios instance | Low | MODE-002 |
| `packages/nc-gui/composables/internalExtensions/useInternalValidation.ts` | Validation client/preview | Axios instance | Low | VAL-001–002 |
| `packages/nc-gui/pages/internal/admin.vue` | Isolated administration page | Internal client only | Low | ADM-001–003 |
| `packages/nc-gui/pages/internal/documents.vue` | Isolated documents page | Internal client only | Low | DOC-001–004 |
| `packages/nc-gui/test/internal-product-suite.test.ts` | Product-suite frontend contract tests | None | Low | VAL, MODE, DOC |
| `scripts/internal-fork/dev.mjs` | Combined backend/frontend source runner | Root scripts | Low | FND-001 |
| `scripts/internal-fork/start.ps1` | Windows one-command startup | Root bootstrap | Low | FND-001 |
| `scripts/internal-fork/start.sh` | POSIX one-command startup | Root bootstrap | Low | FND-001 |
| `deploy/internal-fork/.env.example` | Safe feature configuration template | None | Low | FND-002 |
| `docs/internal-fork/self-hosting.md` | Deployment and upgrade runbook | None | Low | FND-001 |
| `docs/internal-fork/product-suite-implementation.md` | Architecture and compatibility note | None | Low | All |
| `docs/internal-fork/consolidated-completion-report.md` | Validation and risk report | None | Low | All |

## Parity hardening files

Owner for every file below: Internal Platform Team.

| Path | Purpose | Upstream files touched | Merge risk | Feature IDs |
| --- | --- | --- | --- | --- |
| `docs/internal-fork/parity-test-matrix.md` | Evidence-based paid-workflow parity and gap matrix | None | Low | All |
| `packages/nocodb/src/modules/internal-extensions/migrations/nc_internal_005_parity_hardening.ts` | Additive token disable and discussion-resolution columns | Internal migration runner | Low | TOK-003, MODE-003 |
| `packages/nocodb/src/modules/internal-extensions/migrations/nc_internal_005_parity_hardening.spec.ts` | SQLite migration/rollback isolation regression | None | Low | FND-003 |
| `packages/nocodb/src/modules/internal-extensions/validation/internal-validation.repository.spec.ts` | SQLite query-builder reuse regression | None | Low | VAL-001 |
| `packages/nocodb/src/modules/internal-extensions/openapi/internal-openapi.service.ts` | Token lifecycle and thread-resolution API contract | None | Low | API-001, TOK-003, MODE-003, DOC-003 |
| `pnpm-workspace.yaml` | pnpm 10 override and build-script policy | Root dependency install | Medium | FND-001 |
| `packages/noco-integrations/pnpm-workspace.yaml` | Matching nested-workspace pnpm 10 policy | Integrations bootstrap | Medium | FND-001 |
| `packages/nocodb-sdk/package.json` | Cross-platform SDK generation cleanup | SDK build script | Low | FND-001 |
| `packages/nc-gui/nuxt.config.ts` | Opt-in development prebundle compatibility switch for the internal launcher | Community Nuxt development config | Low | FND-001 |
| `packages/nc-gui/package.json` | Pins a Nuxt-compatible Vue type-checker version | GUI development dependencies | Low | FND-001 |
| `packages/nc-gui/test/internal-extensions-browser/vite.config.ts` | Disables eager prebundling in the isolated browser harness | Internal test harness only | Low | FND-003 |
| `scripts/internal-fork/dev.mjs` | Cross-platform Corepack launch and Windows endpoint-security compatibility environment | Internal launcher only | Low | FND-001 |

The existing registration hooks modified by this suite are
`internal-extensions.module.ts`, `internal-feature.config.ts`,
`internal-migration-source.ts`, `noco.module.ts`, the two Community expanded
form shells, base settings, capability settings, audit enums, and the
authorization matrix. No commercial entitlement or license file is in the
manifest.

## Admin/document discoverability and portable import (2026-09-10)

Owner for every entry below: Internal Platform Team. Existing independent
document and admin files keep their earlier entries; these rows record the
additional behavior and the two new Community navigation hooks.

| Path | Purpose | Upstream files touched | Merge risk | Feature IDs |
| --- | --- | --- | --- | --- |
| `packages/nc-gui/components/internalExtensions/Navigation.vue` | Capability-aware user menu links | UserInfoMenu.vue | Low | ADM-001, DOC-001 |
| `packages/nc-gui/components/dashboard/Sidebar/UserInfoMenu.vue` | Register independent menu fragment | This file | Medium | ADM-001, DOC-001 |
| `packages/nc-gui/components/dashboard/TreeView/Project/CreateNewMenu.vue` | Base-scoped create/import entry point | This file | Medium | DOC-001 |
| `packages/nc-gui/pages/internal/admin.vue` | User inspection, Community setup links, document toggles | None | Low | ADM-001, ADM-002, ADM-003 |
| `packages/nc-gui/pages/internal/documents.vue` | Accessible-base picker and disabled/error states | None | Low | DOC-001 |
| `packages/nc-gui/components/internalExtensions/documents/Editor.vue` | Editor context, import, save-safe switching, authenticated export UI | None | Low | DOC-001, DOC-002, DOC-004 |
| `packages/nc-gui/composables/internalExtensions/useInternalDocuments.ts` | Create from content and authenticated downloads | None | Low | DOC-001, DOC-004 |
| `packages/nc-gui/helpers/internalDocumentImport.ts` | Size/format validation and portable imports without ownership transfer | None | Low | DOC-001 |
| `packages/nc-gui/test/internal-document-import.test.ts` | Import format, size, and privilege-field regression tests | None | Low | DOC-001, SEC-002 |
| `packages/nocodb/src/modules/internal-extensions/documents/internal-document.service.ts` | Permission-checked portable JSON export | None | Low | DOC-001 |
| `packages/nocodb/src/modules/internal-extensions/documents/internal-documents.controller.ts` | Export route under existing tenant/token/base guards | None | Low | DOC-001, API-001 |
| `packages/nocodb/src/modules/internal-extensions/documents/internal-document-export.spec.ts` | Read-vs-export and cross-tenant denial tests | None | Low | DOC-001, SEC-002 |
| `packages/nocodb/src/modules/internal-extensions/openapi/internal-openapi.service.ts` | JSON export contract entry | None | Low | API-001 |
| `scripts/internal-fork/test-admin-documents.mjs` | Opt-in real-app smoke test with disposable fixtures | None | Low | ADM-001, DOC-001, SEC-002 |
| `docs/internal-fork/admin-documents-usage.md` | Deployment, import limitations, and coworker test checklist | None | Low | ADM-001, DOC-001, DOC-004 |

## Team permission subjects (2026-09-10)

Owner for every entry: Internal Platform Team. Feature ID: TEAM-001 (also
PERM-001, PERM-002, DOC-001, SEC-001/002). All changes below are confined to the
independent extension boundary; no additional Community registration hook or
commercial entitlement file is changed for Teams.

| Path | Purpose | Upstream files touched | Merge risk |
| --- | --- | --- | --- |
| `packages/nocodb/src/modules/internal-extensions/teams/internal-team-directory.ts` | Narrow permission lookup interface | None | Low |
| `packages/nocodb/src/modules/internal-extensions/teams/internal-team.service.ts` | Tenant-scoped membership, lifecycle, revisions and audit | None | Low |
| `packages/nocodb/src/modules/internal-extensions/teams/internal-teams.controller.ts` | Independently authenticated/scoped team routes | None | Low |
| `packages/nocodb/src/modules/internal-extensions/teams/internal-team.service.spec.ts` | Membership, inheritance, invalidation and SQLite rollback tests | None | Low |
| `packages/nocodb/src/modules/internal-extensions/teams/internal-teams.controller.spec.ts` | Guard and token-scope registration tests | None | Low |
| `packages/nocodb/src/modules/internal-extensions/migrations/nc_internal_006_teams.ts` | Independent team and membership tables | None | Low |
| `packages/nc-gui/composables/internalExtensions/useInternalTeams.ts` | Typed team API client | None | Low |
| `packages/nc-gui/pages/internal/teams.vue` | Team lifecycle and membership UI | None | Low |
| `packages/nc-gui/test/internal-teams.test.ts` | URL encoding and permission precedence regression | None | Low |
| `docs/internal-fork/internal-teams-design.md` | Security boundary and rollback design | None | Low |
| `docs/internal-fork/internal-teams-usage.md` | Coworker deployment and acceptance checklist | None | Low |
| `docs/internal-fork/self-hosted-business-parity.md` | Official-feature comparison and explicit remaining gaps | None | Low |
| `docs/internal-fork/teams-validation-report.md` | Local command outcomes and known limitations | None | Low |

Existing custom files extended: backend `internal-extensions.module.ts`,
`migrations/internal-migration-source.ts`, feature registry types/config/tests,
`audit/internal-audit-event.ts`, base permission model/policy/services/tests,
document permission service/types/service, and internal OpenAPI service.
Frontend extensions: `Navigation.vue`, base/document permission editors,
base/document/capability composables, capability settings and existing test
fixtures. Configuration: `deploy/internal-fork/.env.example`. These have low
upstream merge risk, but **high authorization regression sensitivity**: review
precedence, tenant isolation, and disablement semantics on upgrades. The pipeline
now records TEAM-001 and links the broader Business gap ledger.
