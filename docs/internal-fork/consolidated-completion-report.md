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

`nc_internal_005_parity_hardening` adds reversible token-disable state and
discussion resolution metadata without changing upstream tables. Its rollback
removes only those internal columns.

## Tests added

- Migration create/rollback and upstream-table sentinel.
- Validation response identity, partial updates, attachments, and regex safety.
- Feature guard global/per-base enablement.
- PDF structure and active-resource isolation.
- OpenAPI authentication and route-shape checks.
- Four additional machine-readable authorization cases.
- Frontend path encoding, validation preview, document snapshot conversion, and
  SFC compilation.
- Editable and reversible token lifecycle, one-level discussion threads,
  resolve/reopen behavior, document stale-write protection, and SQLite
  validation persistence.
- Paid-workflow parity matrix and explicit unsupported-workflow release gates.

## Commands and results

| Command                                                               | Result                                                                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `corepack pnpm --filter nocodb-sdk run build`                         | Passed                                                                                                |
| Internal backend Jest suite with `jest.internal-extensions.config.js` | Passed: 46 suites, 240 tests                                                                          |
| Targeted internal frontend Vitest suite                               | Passed: 4 files, 14 tests                                                                             |
| Internal Playwright browser suite                                     | Passed: 9 tests                                                                                       |
| Backend `tsc --noEmit`                                                | Passed                                                                                                |
| Frontend `nuxi typecheck` with 8 GB heap                              | Upstream repository baseline failed; no `internalExtensions` component/composable/page error remained |
| Frontend production `nuxi build` with 8 GB heap                       | Passed; upstream chunk-size and deprecation warnings remain                                           |
| Backend production Rspack build                                       | Passed; one upstream dynamic-require warning remains                                                  |
| Windows `start.ps1` source launcher                                   | Passed: UI HTTP 200, backend live, Nuxt checker reported no errors                                    |
| Anonymous internal-capabilities request                               | Passed: HTTP 401                                                                                      |
| SQLite migration and live validation exercise                         | Passed                                                                                                |

The browser harness and Windows launcher disable Vite's eager dependency
prebundle to avoid an endpoint-security/esbuild file-access conflict on the
secondary drive. Production optimization is unchanged.

## Known failures and risks

- The upstream GUI does not currently have a clean repository-wide TypeScript
  baseline; the production GUI and backend bundles nevertheless pass.
- Collaboration mutations call Community services and then append an internal
  audit event; they cannot share one database transaction across both systems.
- Snapshot documents are safe and reliable but are not realtime co-editing.
- PDF rendering is deliberately minimal and does not reproduce rich layout.
- Full PostgreSQL/MySQL migration rehearsals and load tests remain release
  gates.
- The all-future-bases token wildcard, team permission subjects, preview-mode
  upload, rich comment attachments/image annotations, visual document revision
  diffs, realtime presence/offline reconciliation, Markdown/HTML export, and
  public document sharing remain explicit parity gaps.
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
