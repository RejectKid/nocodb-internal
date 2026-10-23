#!/bin/sh
# Shared Linux build/test pipeline. Run from the repository root.
set -eu
export CI=true
export NODE_OPTIONS=--max-old-space-size=6144
export NC_HANDOFF_BROWSER_SMOKE=true
node -e 'if (process.version !== "v22.12.0") throw new Error("Use Node 22.12.0 for the tested handoff build")'
test "$(pnpm --version)" = '10.28.0'
docker compose version
# CI's pinned Node takes precedence over pnpm's automatic runtime download.
sed -i '/^use-node-version/d' .npmrc
node --test scripts/internal-fork/release-handoff.test.mjs
pnpm bootstrap
(
  cd packages/nocodb
  pnpm exec jest --config jest.internal-extensions.config.js --runInBand --forceExit
  pnpm exec rspack --config ../../scripts/internal-fork/rspack.handoff.cjs
)
(
  cd packages/nc-gui
  pnpm exec vitest run --config test/vite.config.ts test/internal-teams.test.ts test/internal-base-permissions.test.ts test/internal-capabilities.test.ts test/internal-product-suite.test.ts test/internal-document-import.test.ts test/internal-cell-colors.test.ts
  pnpm exec playwright install --with-deps chromium
  pnpm exec playwright test --config test/internal-extensions-browser/playwright.config.ts sidebar-colors.spec.ts
  NODE_ENV=production pnpm exec nuxi generate
)
node scripts/internal-fork/build-handoff.mjs
