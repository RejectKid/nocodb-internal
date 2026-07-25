# Stage 12 token administration report

## Outcome

TOK-003 advances from Proposed to Security Review. The independent base
settings now provide one-time token creation, typed scope and tenant selection,
active/expired/revoked display, last-used display, and immediate revocation.
No commercial token, entitlement, feature-flag, or license implementation is
imported or modified.

## Backend

- Authenticated internal v1 list, create, and revoke routes.
- `base:manage_tokens` evaluation for the current and every selected base.
- Current-user ownership enforcement for list and revoke.
- Current-workspace restriction and current-base inclusion validation.
- Atomic token mutation plus SEC-001 audit append.
- Audit summaries exclude plaintext and hashes.
- Repository methods accept caller transactions.

## Frontend

- Capability-gated API Tokens entry in General base settings.
- Name, expiration, workspace, base, and typed-scope controls.
- One-time secret card with explicit secure-storage guidance.
- Active, expired, and revoked lifecycle labels.
- Public prefix, scopes, and last-used display.
- Immediate revoke action and refresh.
- Unauthorized state contains no mutation controls.

## Validation

- `pnpm --filter nocodb exec jest --config
  jest.internal-extensions.config.js --runInBand --forceExit`: 32 suites and
  191 tests passed.
- `pnpm --filter nc-gui exec vitest run test/internal-api-tokens.test.ts
  test/internal-base-permissions.test.ts`: 2 files and 8 tests passed.
- `pnpm --filter nc-gui test:internal-browser`: 8 browser tests passed.
- Targeted Prettier check: all changed backend and frontend source files
  passed; the repository's existing Markdown set is not uniformly formatted.
- `git diff --check`: passed.
- Backend `tsc --noEmit`: blocked by existing SDK, `oracledb`, model, and event
  typing failures outside `internal-extensions`; no changed file was reported.
- Targeted ESLint: blocked before file analysis by the repository's existing
  ESLint/Ajv `defaultMeta` crash.
- Production Nuxt build: transformed 1,754 modules, then stopped on the
  existing generated SDK import resolving `packages/nc-gui/lib` as a
  directory (`EISDIR`). Rebuilding the SDK would rewrite generated files and
  is intentionally outside this slice.

## Residual risks

- The browser clipboard cannot be reliably cleared after copy.
- The base-settings surface supports the current workspace; a global
  cross-workspace selector needs a separate account-level design.
- Authentication integration must update `last_used_at`; until then the UI
  correctly reports `never`.
- TOK-002 still needs production authentication/route integration and rate
  limiting before internally issued tokens can call the custom API surface.
- ADM-002 is responsible for authorized cross-user token revocation.
