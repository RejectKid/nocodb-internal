# Internal fork architecture report

Status: Initial orientation complete  
Upstream baseline: `nocodb/nocodb` commit `2c232680a0` on `develop`  
Review date: 2026-07-23

## Scope and safety boundary

This report identifies Community-edition extension points for independently
implemented internal capabilities. The implementation must not alter or depend
on NocoDB commercial entitlement decisions. Existing Business, Scale,
Enterprise, cloud, and EE-aware implementations are architectural context only.

Behavioral compatibility is a design goal: internal features should match the
documented and observable workflows, terminology, ergonomics, and response
behavior of the corresponding NocoDB capabilities as closely as independent
implementation permits. Public documentation and black-box behavior may inform
requirements. Gated source code, private implementation details, and commercial
activation paths may not inform or supply the implementation.

## Repository structure

The repository is a pnpm monorepo. `pnpm-workspace.yaml` includes:

- `packages/nocodb`: NestJS backend, metadata database, controllers, services,
  models, migrations, workers, sockets, and server bundling.
- `packages/nc-gui`: Nuxt 3 single-page application using Vue 3, Pinia,
  auto-imported composables/components, Windi CSS, and Vitest.
- `packages/nocodb-sdk`: shared API client, schemas, types, roles, and helpers.
- `packages/nocodb-sdk-v2`: newer generated SDK work.
- `packages/nc-mail-templates`: mail templates.
- `packages/nc-secret-mgr`: separate secret-manager package.
- `packages/noco-integrations`: integration packages built outside the main
  workspace list by the root bootstrap script.

The root package requires pnpm and exposes bootstrap plus frontend/backend
development commands. Node 22 or newer satisfies the backend engine constraint.

## Backend architecture

### Entry points and composition

- `packages/nocodb/src/main.ts` creates the Express server.
- `packages/nocodb/src/Noco.ts` initializes Nest and shared runtime services.
- `packages/nocodb/src/app.module.ts` composes top-level Nest modules and global
  middleware.
- `packages/nocodb/src/modules/noco.module.ts` is the large Community module
  registering most controllers and services.
- `packages/nocodb/src/modules/auth/auth.module.ts` and
  `packages/nocodb/src/modules/oauth/oauth.module.ts` register authentication
  endpoints and strategies.

`NocoModule` is intentionally broad and therefore a conflict-prone place for
custom work. The selected extension point is one conditional import in
`app.module.ts` that loads a new `InternalExtensionsModule`. All other custom
controllers and providers remain under that isolated module.

### Relevant backend modules

- Authentication: `modules/auth`, `modules/oauth`, `strategies`, and `guards`.
- Authorization and request context:
  `middlewares/extract-ids/extract-ids.middleware.ts`,
  `guards/global/global.guard.ts`, and SDK role/permission definitions.
- Metadata access: `meta/meta.service.ts`, `models`, `cache`, and
  `utils/globals.ts`.
- Forms: `controllers/forms.controller.ts`,
  `controllers/form-columns.controller.ts`, `services/forms.service.ts`,
  `services/form-columns.service.ts`, `models/FormView.ts`, and
  `models/FormViewColumn.ts`.
- Record detail: data controllers/services plus frontend expanded-form stores
  and components.
- Attachments: attachment controllers/services, storage plugins, signed URLs,
  and file-reference metadata.
- Documents: Community type-compatible stubs and shared service surfaces exist,
  while runtime document capability is EE-aware. Internal document work must
  use separately named models, tables, routes, and UI.
- Auditing: `meta/audit.service.ts`, `services/audits.service.ts`, audit
  migrations, and operation-log infrastructure.

## Frontend architecture

### Entry points and routing

`packages/nc-gui` is a client-rendered Nuxt 3 application. `nuxt.config.ts`
enables file-based pages and auto-imports composables, stores, helpers, and
components. `app.vue`, layouts, route middleware, and plugins initialize global
state, API access, telemetry, i18n, and sockets.

The primary authenticated application routes are below `pages/index`. Account
settings are below `pages/account`, and upstream instance administration is
`pages/admin/index.vue`. The custom capability view will use a new isolated
`pages/internal/settings/capabilities.vue` route and will not modify upstream
commercially aware admin navigation.

### API and state access

`plugins/api.ts` provides a generated SDK client. `composables/useApi` adds
Axios interceptors, authentication headers, response/error handling, and global
loading state. A custom capability composable can call the new route through
the existing Axios instance without modifying or regenerating upstream SDK
files.

### Record and view architecture

- Expanded record state: `composables/useExpandedFormStore.ts`.
- Expanded record UI: `components/smartsheet/expanded-form` and related grid
  panel/detail components.
- View state: stores/composables by view type, including grid, gallery,
  kanban, calendar, map, timeline, list, and form.
- View selection/rendering: routes under
  `pages/index/[typeOrId]` and smartsheet wrapper components.
- Attachments: `components/cell/attachment` and attachment composables.

These are later adapter points. Existing EE-aware mode selectors or gated
components must not be exposed or copied.

## Authentication flow

1. Global middleware creates request metadata and tenant context.
2. `GlobalGuard` attempts JWT authentication from `xc-auth` or the `nc_token`
   cookie.
3. It may alternatively authenticate existing API tokens, OAuth bearer tokens,
   or shared-base sessions.
4. `JwtStrategy.validate` reloads the user, verifies token version, and resolves
   organization, workspace, and base roles.
5. Successful identities receive `isAuthorized: true`; fallback guest identity
   is intentionally not authorized.
6. A custom `InternalAuthenticatedGuard` will require an authenticated,
   non-disabled user identity for internal endpoints. Later internal-token
   authentication will be a distinct strategy.

## Authorization flow

1. `ExtractIdsMiddleware` resolves workspace, base, source, table, view, and
   other resource identifiers and places them in `req.context`.
2. The `Acl` decorator attaches permission metadata and invokes
   `AclMiddleware`.
3. `AclMiddleware` ensures the request is authenticated, blocks prohibited
   token/public access, resolves roles by scope, and checks the SDK permission
   map.
4. Services perform additional resource-specific checks where required.

Internal permissions will use a separate centralized policy service and
decorator/guard chain. It may consume Community membership facts but will not
alter the upstream permission map or commercial entitlement resolution.

## API request flow

Express -> global body/URL/context middleware -> Nest route -> rate-limit guard
-> identity guard -> authorization interceptor/guard -> controller -> service
-> model/metadata access -> global exception filter -> response.

The internal API prefix is `/api/internal/v1`. It has an independent response
contract and will not change existing `/api/v1`, `/api/v2`, `/api/v3`, or the
unrelated `/api/v2/internal` operation-dispatch API.

## Data-access flow

Most metadata models call `MetaService` helpers backed by Knex, then update or
invalidate `NocoCache`. Tenant-aware methods accept `NcContext`. Direct Knex is
used for joins, counts, and special cases.

Internal features will use:

- tables prefixed `nc_internal_`;
- repository classes inside `modules/internal-extensions`;
- explicit workspace/base predicates on every tenant-scoped query;
- no additions to upstream `MetaTable` unless a later design proves necessary;
- no cache until correctness tests justify it.

## Membership and current data models

- Instance users: `models/User.ts`.
- Workspace membership: `models/WorkspaceUser.ts`, including soft deletion.
- Base membership: `models/BaseUser.ts`; effective access can combine explicit
  base roles and workspace roles.
- Existing API tokens: `models/ApiToken.ts` and its controller/service. This is
  not the storage surface for internal fine-grained tokens.
- Forms/fields: `FormView`, `FormViewColumn`, `Column`, and view metadata.
- Documents: a Community stub `models/Document.ts` and shared services/types are
  present, but runtime capability is EE-aware. Internal documents require a new
  independent namespace and schema.

## Migration workflow

`MetaService.init` runs explicit Knex migration sources. The current metadata
database uses migration history tables such as `xc_knex_migrationsv0`.

The internal extension module will run its own `InternalMigrationSource`
against `xc_internal_knex_migrations`, through a provider that depends on the
initialized `MetaService`. This avoids registering custom schema in upstream or
commercial migration sources. Each internal migration exports `up` and `down`;
production rollback remains a deliberate operational procedure rather than an
automatic startup action.

## Testing workflow

- Backend unit/integration tests: Jest/ts-jest. The current `jest.config.js`
  selects files ending in `Integration.spec.ts` or `Source.spec.ts`; targeted
  tests may pass an explicit path with `--runTestsByPath`.
- Backend end-to-end: Jest using `test/jest-e2e.json`.
- Frontend unit tests: Vitest test files under `packages/nc-gui/test`.
- Frontend lint/type/build: ESLint and Nuxt commands.
- CI examples: `.github/workflows/jest-unit-test.yml` bootstraps the workspace
  and builds the SDK before backend tests.

Security-sensitive test suites must include authentication failure,
authorization failure, tenant-boundary, disabled-user, expiration, and
revocation cases as applicable.

## Build and development commands

Repository-defined commands:

- Install/bootstrap: `pnpm bootstrap`
- Frontend dev: `pnpm start:frontend`
- Backend dev: `pnpm start:backend`
- Backend format: `pnpm --filter nocodb format`
- Backend lint: `pnpm --filter nocodb lint`
- Backend tests: `pnpm --filter nocodb test`
- Backend e2e: `pnpm --filter nocodb test:e2e`
- Frontend lint: `pnpm --filter nc-gui lint`
- SDK build: `pnpm --filter nocodb-sdk build`

Nuxt and rspack production/type-check commands must be invoked through their
installed CLIs because the current package manifests do not define explicit
frontend/backend production-build or type-check scripts.

## Docker and self-hosting

The repo contains a backend Docker build and deployment examples under
`docker-compose`. Examples include bundled PostgreSQL/Redis and external
service configurations. Normal self-hosting uses `docker compose up -d` after
reviewing environment and secret values. Internal extensions must default off
unless explicitly enabled with `NC_INTERNAL_*` variables.

## Recommended extension points

1. Conditional `InternalExtensionsModule` import in `app.module.ts`.
2. Independent controllers under `/api/internal/v1`.
3. Custom guards, decorators, policy services, and repositories within the
   internal module.
4. Separate Knex migration source/history table and `nc_internal_*` tables.
5. File-based Nuxt routes under `pages/internal`.
6. Auto-imported custom composables under
   `composables/internalExtensions`.
7. Later, small adapter hooks around Community service operations only after
   authorization and regression tests exist.

## High-risk coupling areas

- `NocoModule` controller/provider arrays are large and conflict frequently.
- `MetaService.init` and upstream migration-source lists are upgrade-sensitive.
- `ExtractIdsMiddleware` is central to all tenant resolution.
- SDK-generated API files produce large diffs and should not be hand-edited.
- Global role/permission maps affect all Community routes.
- Existing document, fine-grained-token, advanced-view, and admin surfaces may
  be EE-aware even when a Community stub exists.
- Frontend admin and settings navigation mixes Community and gated state.

## Commercial entitlement files: do not modify

The protected set includes, at minimum:

- `packages/nocodb/src/services/org-license.service.ts`
- `packages/nocodb/src/controllers/org-license.controller.ts`
- `packages/nocodb/src/Noco.ts` EE/license state-loading paths
- `packages/nocodb/src/providers/init-meta-service.provider.ts` license/cloud
  branches
- `packages/nocodb/src/meta/migrations/v0/nc_008_license_server.ts`
- `packages/nocodb/src/meta/migrations/v0/nc_202606260000_plans_license_type.ts`
- `packages/nocodb/src/meta/migrations/v0/nc_202603301109_fine_grained_api_tokens.ts`
- existing EE overlays, `src/ee` paths when present, and enterprise model
  resolvers
- `packages/nc-gui/composables/useEeConfig.ts`
- `packages/nc-gui/components/account/License.vue`
- existing frontend upgrade prompts and EE feature checks

Files containing incidental license-aware branches are not automatically safe
extension points. Any proposed edit to such a file requires a separate review.

## Custom module naming convention

- Backend root: `modules/internal-extensions`
- Subdomains: `feature-registry`, `authorization`, `api-tokens`, `documents`,
  `record-modes`, `validation`, `admin`, and `audit`
- Classes: `InternalFeatureRegistryService`,
  `InternalAuthorizationPolicy`, and similar explicit names
- Routes: `/api/internal/v1/...`
- Environment: `NC_INTERNAL_*`
- Tables: `nc_internal_*`
- Frontend: `pages/internal`, `components/internalExtensions`, and
  `composables/internalExtensions`

Names deliberately avoid NocoDB commercial product tier terminology.

## Proposed upstream merge strategy

1. Keep `upstream` pointed at `nocodb/nocodb`; keep the private repository as
   `origin`.
2. Rebase or merge upstream `develop` into a short-lived integration branch,
   then run the authorization matrix before advancing the internal release
   branch.
3. Keep custom work in new files. Limit upstream-file changes to small,
   documented registration hooks.
4. Maintain `custom-code-manifest.md` and update it in the same commit as each
   custom file.
5. Commit by vertical slice: documentation, backend boundary, endpoint,
   frontend, tests, then token skeleton.
6. Never resolve upstream conflicts by accepting changes wholesale in security,
   migration, auth, license, or entitlement files.
7. Compare every upstream merge against the protected-file list and rerun
   authentication, denial, cross-tenant, migration, and disabled-mode tests.
