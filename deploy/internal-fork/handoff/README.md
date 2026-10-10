# NocoDB internal fork: Docker trial handoff

Image version and source revision are recorded in BUILD-INFO.txt.
This is an internal testing bundle, not a claim of full NocoDB Business parity
or production security certification. See self-hosted-business-parity.md.

## Requirements

- Docker Desktop running Linux containers (Windows/macOS), or Docker Engine
  with Docker Compose v2 on Linux. This archive does not include Docker itself.
- Images target linux/amd64. ARM hosts require emulation and were not tested.
- Suggested trial resources: 4 CPUs, 8 GB RAM, 15 GB free disk plus your data.
- No Node, pnpm, Git, source checkout, or registry login is required to run it.
- Once Docker is installed and image archives are loaded, the core app can run
  without image downloads. External integrations/email need their own network
  access and configuration; public fonts/assets may also require connectivity.

## Fresh installation on Windows

Extract the ZIP into a normal local folder. Open PowerShell there:

```powershell
.\load-images.ps1
.\setup.ps1
.\start.ps1
```

If downloaded scripts are blocked, inspect them and use `Unblock-File` on the
reviewed scripts, or follow your organization's execution-policy procedure.
Do not disable your organization's security policy globally.

## Fresh installation on Linux/macOS

```sh
sh load-images.sh
sh setup.sh
sh start.sh
```

Setup requires OpenSSL on this path. It creates .env with unique random
database/JWT secrets and preserves an existing .env. Keep .env private and
backed up; do not send it back or commit it to Git.

Open **http://localhost:8080**. Register the first account; it becomes the
instance administrator on a fresh database. There is NO shared default login.
Complete initial registration before enabling remote access.

The raw equivalent after setup and image loading is:

```sh
docker compose up -d --wait --wait-timeout 240
docker compose ps
```

## Access from another computer

Default binding is localhost only. After creating the administrator, edit .env:

```text
NC_BIND_IP=0.0.0.0
NC_PORT=8080
NC_SITE_URL=http://YOUR-SERVER-LAN-IP:8080
```

Run `docker compose up -d` again. Permit the port only on your trusted LAN.
For Internet/untrusted networks, use an HTTPS reverse proxy and appropriate
firewall/access controls. Do not send passwords over untrusted plain HTTP.
PostgreSQL and Redis have no published host ports.

This Community-based build runs background jobs inside the main NocoDB
container. Redis is retained for application coordination/cache; it does not
turn the Community in-process job queue into a distributed queue. No separate
worker container is needed.

## Test the changes

Start with **FEATURE-TESTS.md** and **example-document.md**. Detailed guides:

- admin-documents-usage.md
- internal-teams-usage.md
- self-hosted-business-parity.md (what is still missing/partial)
- teams-validation-report.md (source-level testing and known CI limitations)
- BUILD-INFO.txt (exact image/source identity and bundle smoke result)

All independent feature flags, including NC_INTERNAL_TEAMS_ENABLED, are set
in compose.yaml. Capabilities: avatar menu -> Internal capabilities. Team and
document links are independent screens, not unlocked upstream commercial menus.

## Stop, start, and preserve data

`docker compose down` stops/removes containers but preserves named volumes.
`docker compose up -d` starts again with the same data. Helpers are provided.
NEVER use `docker compose down -v` unless you deliberately want to erase data.
Keep the project name and .env stable. Back up PostgreSQL and nocodb_data
attachments together before upgrades; a database-only backup is incomplete.

## Existing installation: read before upgrading

This bundle defaults to a NEW project, `nocodb-internal-trial-v2`, so it does
not silently migrate the previous trial's volumes. To test side-by-side, use
another NC_PORT/NC_SITE_URL (e.g. 8081). Existing data will not appear in the new
project automatically. Do not mistake that for data loss.

For an in-place upgrade, stop the old stack without `-v`, make verified backups
of its database and attachment volume plus .env, load the new images, and update
the OLD Compose file's app image tag to
the application image tag in BUILD-INFO.txt. Add `NC_INTERNAL_TEAMS_ENABLED: "true"`
alongside the other internal environment flags. Preserve old project name,
volume names, database/JWT secrets and all other deployment-specific settings.
Remove the old `worker` service if present, then recreate the old stack with
`docker compose up -d --remove-orphans` to remove its obsolete container without
deleting volumes. Migration 006 adds team tables automatically.
Do not run fresh setup over an existing deployment's secrets.

Reverting only the image is not a tested database rollback. For recovery,
restore the matching verified backup and previous image/settings together.
This bundle does not copy any previous trial users, documents or attachments.

## Troubleshooting

```sh
docker compose ps
docker compose logs --tail 100 nocodb
docker compose logs --tail 100 db redis
```

- Engine not running: start Docker Desktop/Engine in Linux-container mode.
- Image not found: rerun load-images; pull_policy is deliberately `never`.
- Port in use: change NC_PORT and NC_SITE_URL consistently, then recreate.
- Missing menus: sign in with the correct admin role, inspect Internal
  capabilities, and verify the new image tag (old images do not contain Teams).
- Team cannot be assigned: create a team in the SAME workspace, reload the
  permission screen, and ensure the user already has Community base access.
- SMTP is not preconfigured. Do not expect invitations/reset emails to deliver
  until configured in Community setup or your deployment settings.
- No legacy commercial document database converter is included; import supports
  text/Markdown and this fork's portable JSON, not arbitrary old database dumps.

Image and file hashes are in MANIFEST.sha256. The load scripts verify them
before loading. SHA256 detects corruption; distribute the ZIP/checksum through
a trusted channel. Copyright/license notices in the source/runtime are retained.
