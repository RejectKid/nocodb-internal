#!/usr/bin/env sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
[ -f .env ] || { echo 'Run setup.sh first.' >&2; exit 1; }
docker compose up -d --wait --wait-timeout 240
echo 'Services ready: http://localhost:8080 (or NC_SITE_URL in .env). Create the first administrator.'
