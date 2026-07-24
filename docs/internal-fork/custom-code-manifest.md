# Custom code manifest

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
