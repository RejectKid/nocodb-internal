#!/usr/bin/env sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
docker compose down
echo 'Stopped. Persistent volumes were preserved.'
