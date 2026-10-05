# Repeatable Docker handoff ZIP

The `Build Docker handoff ZIP` workflow builds the checked-out fork, packages
Linux/AMD64 images and the versioned Compose/setup templates, and uploads a ZIP
plus SHA256 checksum. No local E: drive paths or prebuilt personal artifacts
are needed on GitHub. Runtime data and local secrets never enter the bundle.

## Run and download

After this workflow is merged into the default `develop` branch:

1. Open this private repository on GitHub -> Actions -> **Build Docker handoff ZIP**.
2. Click **Run workflow**, choose `develop` (or an intended source branch), and run.
3. Wait for the `bundle` job to succeed. Download its `docker-handoff-...` artifact
   from the run's summary. GitHub wraps the ZIP/checksum in an artifact archive:
   extract that outer archive, then extract the handoff ZIP inside it.
4. Send the handoff ZIP through your organization's approved transfer process.
   The colleague only needs Docker/Compose; repository access is not required
   once they have the ZIP. GitHub artifact downloads themselves require access
   to this private repository. Downloads expire after 14 days; run it again
   to make a fresh bundle. Storage and runner usage count against your plan.

CLI equivalent:

```sh
gh workflow run internal-docker-handoff.yml --repo RejectKid/nocodb-internal --ref develop
gh run list --repo RejectKid/nocodb-internal --workflow internal-docker-handoff.yml
gh run download RUN_ID --repo RejectKid/nocodb-internal
```

This is deliberately manual, rather than a large image export on every code
push. Pull requests changing the packaging workflow/templates also build it
for validation. There is no registry push, deployment, release publication,
or custom credential secret needed; the workflow token has contents:read.

## What happens

- Installs/builds workspace dependencies using the existing bootstrap script.
- Runs backend internal extension tests and targeted GUI unit tests.
- Builds the production backend with the upstream Docker entry/config and
  generates the production GUI.
- Builds a new image using the pinned Community runtime digest plus those
  application artifacts. License enforcement/build behavior is preserved.
- Pulls pinned PostgreSQL/Redis digests, starts a fresh isolated Compose project,
  checks admin/registry/document/team APIs and permission denials, then restarts
  to verify document persistence.
- Removes only this newly generated disposable QA project's volumes in cleanup.
- Saves/loads all three images, generates file hashes and build/test records,
  creates and verifies the ZIP, then uploads it only on success.

The smoke uses HTTP/API checks, not a full rendered-browser run. Full GUI type
checking/linting remains a separate documented backlog. SMTP, ARM emulation,
production backup/restore and every advertised Business feature are not
certified by a green packaging job. Read BUNDLE-TEST-RESULTS.txt for the actual
scope; the earlier local browser validation report is also bundled.

## Coworker steps included in every ZIP

```powershell
.\load-images.ps1
.\setup.ps1
.\start.ps1
```

Then open http://localhost:8080 and create the first administrator. The Unix
equivalents use `sh`. Setup generates unique secrets and preserves existing
.env files. Default access binds localhost. README.md includes LAN and upgrade
steps; FEATURE-TESTS.md and example-document.md cover team membership/access
revocation, document imports/exports, and the internal admin area.

The default project is a fresh trial. Existing installations must preserve
their project/volumes/secrets and change BOTH app and worker image tags using
BUILD-INFO.txt. Do not use `down -v` on an existing deployment.

## Rebuild locally

On Linux with Node/pnpm, Docker/Compose, zip and unzip:

```sh
pnpm bootstrap
cd packages/nocodb
pnpm exec rspack --config ../../scripts/internal-fork/rspack.handoff.cjs
cd ../nc-gui
NODE_OPTIONS=--max-old-space-size=6144 NODE_ENV=production pnpm exec nuxi generate
cd ../..
node scripts/internal-fork/build-handoff.mjs
```

Output is under ignored `.handoff-output/`. Builds use unique image/run names
and refuse to overwrite an existing output directory. Fresh smoke testing uses
host port 18086; it must be available. Keep template instructions up to date
when adding features. Only edit the source templates in deploy/internal-fork/handoff;
generated bundles are disposable artifacts.
