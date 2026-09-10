# Teams and Business comparison: local validation

Date: 2026-09-10. Branch: `feature/internal-admin-document-access`.
Status: Security Review, not Released. This report records local validation
before the repository handoff; no new image or deployment is represented here.

## Scope delivered

Independent workspace-scoped teams, lifecycle/membership UI, base/document team
subjects, inherited document grants and access-source display, live revocation,
transactional audits, migration 006 and rollback tests. Existing Community
membership and role checks remain authoritative. No license or entitlement
enforcement files were changed. See the custom-code manifest for affected files.

The preceding admin/document navigation, create/import/export improvements were
preserved and retested. The original pipeline is not the complete current
Business feature catalog: see `self-hosted-business-parity.md` for the explicit
Inherited/Partial/Missing assessment and official sources.

## Commands and outcomes

Commands ran from the relevant package unless otherwise noted. Dependencies
already existed; no new dependency installation was required for Teams.

| Command/check | Result |
| --- | --- |
| Backend: `corepack pnpm exec jest --config jest.internal-extensions.config.js --runInBand --forceExit` | PASS: 50 suites, 256 tests. Includes SQLite migration/rollback, team lookup/invalidation, document inheritance, policy precedence and route metadata. Force-exit is used by this local run; open handles are not certified absent. |
| Backend: `corepack pnpm exec tsc --noEmit --pretty false` | PASS |
| Backend: `corepack pnpm exec rspack --config E:/Projects/nocodb-internal/.tmp/internal-handoff-src/rspack.docker.config.cjs` | PASS, existing require-in-the-middle warning. Local wrapper builds the Docker entry point using upstream Rspack config; this is not a Docker image build. |
| GUI: `corepack pnpm exec vitest run --config test/vite.config.ts test/internal-teams.test.ts test/internal-base-permissions.test.ts test/internal-capabilities.test.ts test/internal-product-suite.test.ts test/internal-document-import.test.ts` | PASS: 5 files, 17 tests |
| GUI: `corepack pnpm run test:internal-browser` | PASS: 9 browser-harness tests |
| GUI: `corepack pnpm exec nuxi generate` (production, 8 GB heap) | PASS: 21 routes, including internal Teams. Expected SPA/ssr:false warning. |
| GUI: `corepack pnpm exec vue-tsc --noEmit --pretty false` (12 GB heap) | FAIL: 4,438 diagnostics in the full project. Final log contains no diagnostics matching internalExtensions or pages/internal. Whole-project type safety is NOT passing. |
| Backend: `corepack pnpm exec eslint src/modules/internal-extensions/teams/*.ts` | BLOCKED/FAIL: ESLint 8 crashes in @eslint/eslintrc Ajv initialization (`defaultMeta`). Root Ajv override conflicts with its expected dependency. No lint-pass claim. |
| Prettier on changed/new implementation files; explicit final check of `teams/*.ts` and migration 006 | PASS for final team/migration check. An earlier bulk invocation had incorrect paths; explicit retries succeeded. |
| Root: `git diff --check` | PASS (line-ending warnings only) |
| Real app: `node E:/Projects/nocodb-teams-qa.mjs` with disposable QA credentials | PASS after correcting test locators/unique fixture names; see flows below |
| Root: `node scripts/internal-fork/test-admin-documents.mjs` with disposable QA credentials and NC_QA_URL | PASS; see flows below |

## Rendered validation

Environment: Windows, headless Chrome via existing Playwright, production-built
SPA and backend at `http://localhost:8095`, isolated SQLite under `.tmp`.
Browser plugin not available; used regular Playwright per frontend testing skill.
Desktop 1440x1000 and mobile 390x844. Meaningful page content rendered without
framework overlay; mobile team screen had no horizontal overflow. Screenshots
are outside the repository at `E:/Projects/nocodb-teams-qa.png` and
`E:/Projects/nocodb-teams-qa-mobile.png`.

Team interaction loop: sign in -> Internal teams -> create -> select membership
-> save -> rename -> reload document page -> Permissions -> Internal team ->
select group -> Add grant -> verify successful persistence. Then test a
team-only document with a separate member session, base team grant, UI membership
removal and immediate denial, and archive. Anonymous, unauthorized mutation,
stale revision and foreign-workspace requests were rejected. No page errors.
The base grant was assigned via API; the base-settings team picker was not
exercised in this real-app loop.

Admin/document regression: overview/user inspection; create, edit, save,
Markdown import, reload/reopen; authenticated PDF and JSON download; JSON
reimport; comments/resolution; anonymous denial; base-menu navigation; admin
disable/re-enable with direct API enforcement. No page or console errors; two
existing `Source reference not found tableCreate` warnings were observed.

## Remaining risks and release checks

- Not Business-complete. SSO/MFA, granular table/field security, independent
  multi-workspace provisioning, workflows/scripts/dashboards/interfaces,
  advanced form/display options and other entries remain in the gap ledger.
- Flat internal teams do not provision Community roles, synchronize identity
  groups, support hierarchy, or provide organization-wide team administration.
- Individual/role grants and owner emergency access are independent of team
  grants. Team-only documents require removal of other applicable grants.
- Disabling Teams removes both allow and deny contributions. Review policy
  consequences before changing the environment flag.
- New migration was exercised with SQLite, not PostgreSQL/MySQL metadata stores.
  Back up and test upgrade/rollback with the coworker's actual database engine.
- Realtime channels, all browser engines, concurrency/load at scale and token
  scopes on new team routes end-to-end need further release coverage; existing
  token-scope guards and unit tests are not full deployed certification.
- Existing unavailable workspace members may remain displayed as stored team
  IDs. Authorization filters them out live; administrative cleanup UX could be
  improved. Existing grants must be reviewed if a removed user later rejoins.
- Coworker legacy document import requires a redacted export and source version;
  there is no automatic migration of unknown upstream commercial document data.
- Fix the lint toolchain and frontend type backlog before claiming green full
  CI. No coworker deployment or bundled image was changed in this task.

Recommended next bounded security slice: table/field permissions, with one
central server policy covering list/read/write, import, export, attachment and
direct API access, plus denial tests and a permission editor. Keep SSO/MFA and
other major systems as separately designed/tested slices, not entitlement edits.
