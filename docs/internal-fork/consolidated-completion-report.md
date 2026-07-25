# Consolidated internal product-suite completion report

Date: 2026-07-25

## Outcome

All remaining feature-pipeline items have an independent implementation and
have advanced to Security Review. Nothing in license or commercial entitlement
enforcement was modified.

## Repository architecture summary

The completion uses one NestJS composition root under
`packages/nocodb/src/modules/internal-extensions`, additive Knex migrations,
Community services through narrow adapters, global server-side validation and
permission interceptors, and isolated Nuxt components/composables under
`internalExtensions`. The only new upstream service export is
`WorkspaceUsersService`, needed by the independent collaboration adapter.

## Database migration

`nc_internal_004_product_suite` adds:

- `nc_internal_base_features`
- `nc_internal_validation_rules`
- `nc_internal_record_comments`
- `nc_internal_documents`
- `nc_internal_document_grants`
- `nc_internal_document_revisions`
- `nc_internal_document_comments`
- `nc_internal_notifications`

Rollback drops only these internal tables in dependency order. Rollback is
destructive to internal feature data and requires a backup.

## Tests added

- Migration create/rollback and upstream-table sentinel.
- Validation response identity, partial updates, attachments, and regex safety.
- Feature guard global/per-base enablement.
- PDF structure and active-resource isolation.
- OpenAPI authentication and route-shape checks.
- Four additional machine-readable authorization cases.
- Frontend path encoding, validation preview, document snapshot conversion, and
  SFC compilation.

## Commands and results

| Command | Result |
| --- | --- |
| `pnpm --filter nocodb-sdk run build:main` | Passed |
| `pnpm --filter nocodb-sdk run build:module` | Passed |
| Internal backend Jest suite | Passed: 44 suites, 232 tests |
| Targeted internal frontend Vitest suite | Passed: 4 files, 14 tests |
| Vue SFC parser/compiler check for all changed/new screens | Passed |
| Backend `tsc --noEmit` | Repository baseline failed; no `internal-extensions` errors remained |
| Frontend `vue-tsc --noEmit` | Repository baseline failed with thousands of existing errors; new isolated components have no remaining reported errors |
| Frontend production build | Repository baseline failed resolving the SDK `./lib` directory (`EISDIR`) |
| Backend production Rspack build | Repository baseline failed with 72 upstream SDK/type/Oracle errors; no internal-extension error was reported |
| Internal Playwright browser suite | Passed: 8 tests |
| ESLint | Repository baseline crashed in `@eslint/eslintrc`/Ajv before linting files |

The exact final reruns and totals are included in the pull request description.

## Known failures and risks

- The upstream checkout does not currently have a clean repository-wide
  TypeScript/lint/build baseline.
- Collaboration mutations call Community services and then append an internal
  audit event; they cannot share one database transaction across both systems.
- Snapshot documents are safe and reliable but are not realtime co-editing.
- PDF rendering is deliberately minimal and does not reproduce rich layout.
- Full PostgreSQL/MySQL migration rehearsals and load tests remain release
  gates.
- Frontend navigation is intentionally isolated, so administrators enter
  internal pages from the capability page or direct route.

## Recommended next action

Review this consolidated PR as one product-suite change, then deploy it to a
private staging environment using `docs/internal-fork/self-hosting.md`. The
next acceptance gate is a tenant-isolation and usability exercise with:

1. two workspaces;
2. two bases in each workspace;
3. owner, editor, viewer, blocked, and deleted users;
4. scoped, expired, and revoked tokens;
5. validation writes through UI, API, form, and bulk paths;
6. direct URL/search/export attempts against unauthorized documents;
7. record attachment and discussion tests;
8. backup plus migration rollback rehearsal.
