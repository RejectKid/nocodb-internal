# Standing up the internal NocoDB fork

## Fastest local or internal evaluation

Requirements:

- Node.js 22 or newer (the repository currently pins Node 24.14 through
  `.npmrc`)
- Corepack (included with supported Node releases)
- Git
- About 8 GB free memory for the first workspace build

Windows PowerShell:

```powershell
git clone <your-private-repository-url> E:\Projects\nocodb-internal
Set-Location E:\Projects\nocodb-internal
Copy-Item deploy\internal-fork\.env.example .env.internal
.\scripts\internal-fork\start.ps1 -Bootstrap
```

macOS or Linux:

```sh
git clone <your-private-repository-url> /opt/nocodb-internal
cd /opt/nocodb-internal
cp deploy/internal-fork/.env.example .env.internal
./scripts/internal-fork/start.sh --bootstrap
```

The first run installs the exact `pnpm` version and builds workspace
dependencies. Later runs omit `-Bootstrap` or `--bootstrap`.

The launcher keeps Vite dependency optimization enabled on every platform.
This is required for CommonJS dependencies such as Babel's runtime to be
prebundled correctly; disabling it can leave the browser on a blank page.

If a Windows endpoint-security product blocks esbuild from reading dependencies
on a secondary drive, allow the repository and Node.js processes in that
product rather than setting `NC_INTERNAL_DISABLE_VITE_OPTIMIZE_DEPS=true`.

- UI: <http://localhost:3000>
- Backend: <http://localhost:8080>
- Capabilities: <http://localhost:3000/internal/settings/capabilities>
- Documents: <http://localhost:3000/internal/documents>
- Administration: <http://localhost:3000/internal/admin> (super admins only)
- Internal OpenAPI: <http://localhost:8080/api/internal/v1/openapi.json>

Stop both processes with Ctrl+C.

## Configuration

`.env.internal` is intentionally gitignored. The supplied example enables all
independent extensions. `NC_INTERNAL_EXTENSIONS_ENABLED=false` disables the
entire boundary, routes, migrations, and UI capabilities without changing
NocoDB commercial entitlement state.

File Preview requires both:

```text
NC_INTERNAL_FILE_PREVIEW_MODE_ENABLED=true
NC_SECURE_ATTACHMENTS=true
```

Use `NC_INTERNAL_DOCUMENT_REVISION_RETENTION` to control snapshots retained per
document. The default is 100.

## Persistent shared deployment

The one-command scripts use NocoDB's local SQLite default when `NC_DB` is not
set. That is appropriate for evaluation and a single-node, backed-up internal
deployment. For multiple users or multiple application processes:

1. Provision PostgreSQL.
2. Set `NC_DB` using NocoDB's supported connection-string format.
3. Set a long random `NC_AUTH_JWT_SECRET` through a secrets manager.
4. Configure `NC_REDIS_URL` when workers or multiple application processes are
   used.
5. Put ports 3000 and 8080 behind one TLS reverse proxy; expose only HTTPS.
6. Persist and back up the database and attachment storage.
7. Run migrations in a staging copy before each upgrade.
8. Restrict `/internal/admin` to trusted super administrators and monitor
   internal audit events.

Production frontend builds require an 8 GB Node heap in this repository:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
corepack pnpm --filter nc-gui exec nuxi build
```

Do not bake `.env.internal`, token values, database passwords, or JWT secrets
into an image. Fine-grained token plaintext is returned only once.

## Upgrade procedure

1. Back up the database and attachments.
2. Fetch the upstream NocoDB branch into an integration branch.
3. Rebase or merge the internal branch according to ADR 0005.
4. Review every upstream registration-hook conflict; never resolve a conflict
   by changing license or entitlement enforcement.
5. Run the internal Jest suite, browser suite, migration test, type checks, and
   builds.
6. Deploy to staging, verify `/api/internal/v1/capabilities`, then promote.

The internal migrations are additive and use `nc_internal_*` tables. Rollback
removes only those tables, but any rollback that drops tables destroys their
data and therefore requires a verified backup.
