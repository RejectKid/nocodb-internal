#!/usr/bin/env sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f .env ]; then echo '.env already exists; preserved.'; exit 0; fi
command -v openssl >/dev/null 2>&1 || { echo 'Install openssl to generate unique secrets.' >&2; exit 1; }
umask 077
printf 'NC_PORT=8080\nNC_BIND_IP=127.0.0.1\nNC_SITE_URL=http://localhost:8080\nPOSTGRES_PASSWORD=%s\nNC_AUTH_JWT_SECRET=%s\n' "$(openssl rand -hex 32)" "$(openssl rand -hex 32)" > .env
echo 'Created private .env. Keep it backed up. Create the first administrator in the browser.'
