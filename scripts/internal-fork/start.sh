#!/usr/bin/env sh
set -eu

repository_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$repository_root"

node_major=$(node -p "process.versions.node.split('.')[0]")
if [ "$node_major" -lt "22" ]; then
  echo "Node.js 22 or newer is required." >&2
  exit 1
fi

if [ -f .env.internal ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.internal
  set +a
fi

export NC_INTERNAL_EXTENSIONS_ENABLED=${NC_INTERNAL_EXTENSIONS_ENABLED:-true}
export NC_INTERNAL_ADMIN_ENABLED=${NC_INTERNAL_ADMIN_ENABLED:-true}
export NC_INTERNAL_FINE_GRAINED_API_TOKENS_ENABLED=${NC_INTERNAL_FINE_GRAINED_API_TOKENS_ENABLED:-true}
export NC_INTERNAL_BASE_PERMISSIONS_ENABLED=${NC_INTERNAL_BASE_PERMISSIONS_ENABLED:-true}
export NC_INTERNAL_INPUT_VALIDATION_ENABLED=${NC_INTERNAL_INPUT_VALIDATION_ENABLED:-true}
export NC_INTERNAL_DOCUMENT_PERMISSIONS_ENABLED=${NC_INTERNAL_DOCUMENT_PERMISSIONS_ENABLED:-true}
export NC_INTERNAL_FILE_PREVIEW_MODE_ENABLED=${NC_INTERNAL_FILE_PREVIEW_MODE_ENABLED:-true}
export NC_INTERNAL_DISCUSSION_MODE_ENABLED=${NC_INTERNAL_DISCUSSION_MODE_ENABLED:-true}
export NC_SECURE_ATTACHMENTS=${NC_SECURE_ATTACHMENTS:-true}
export NC_DISABLE_TELE=${NC_DISABLE_TELE:-true}

if [ "${1:-}" = "--bootstrap" ] || [ ! -d node_modules ]; then
  corepack pnpm run bootstrap
fi
node scripts/internal-fork/dev.mjs
