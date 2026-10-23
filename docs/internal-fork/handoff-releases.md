# Downloadable Docker handoff releases

The same Linux build/test script is used by GitHub and GitLab. It runs backend,
frontend and browser regressions, production builds, then the existing real
Compose/API/compiled-GUI/persistence smoke before packaging. A failed step stops
publication. The publisher verifies the ZIP checksum and run identity again.
No secrets, QA database or existing deployment data are shipped.

## GitHub: generate and download

After merging this workflow into the repository's default branch:

1. Actions -> **Build Docker handoff ZIP** -> **Run workflow**.
2. Select the default branch (currently `develop`). Leave **publish_release** checked.
3. Wait for both `bundle` and `release` jobs to succeed.
4. Open the repository's **Releases** page. Download `nocodb-handoff-....zip`
   and its `.zip.sha256` file from the newest **Docker handoff** release.
   Do not select GitHub's automatically generated source-code archives.

Direct page for the current GitHub repository:
https://github.com/RejectKid/nocodb-internal/releases/latest

Release assets are not subject to the workflow artifact's 14-day expiration.
Repository administrators can still delete releases/assets. Private repository
access is required; no visibility or access controls are relaxed. An authorized
user can transfer the ZIP to a colleague through an approved internal channel.

PR builds and manual builds on non-default branches produce workflow artifacts
only. Unchecking publish_release also creates only artifacts. Only the separate
release job gets contents:write; build/test jobs retain contents:read. Each run
attempt creates a unique `handoff-RUN.ATTEMPT` tag at the exact built commit.
A GitHub draft holds partial uploads; it is published and marked Latest only
after the upload command succeeds. A retry uses a new run-attempt version, not
an overwrite. Failed drafts may be inspected/deleted by maintainers.

## GitLab: one-time runner setup

The root `.gitlab-ci.yml` transfers with a normal clone/push. No GitHub credentials
or hard-coded GitHub repository names are used by its publisher.

Configure a **dedicated Linux x86-64 shell executor** tagged `handoff-linux`,
restricted to this trusted project/protected default branch. It needs:

- Node **22.12.0** and pnpm **10.28.0** available on PATH.
- Git, zip, unzip, Docker Engine and Docker Compose v2.
- Playwright Linux system libraries (the script runs `playwright install
  --with-deps chromium`; preinstall dependencies or arrange approved sudo access).
- Docker access for the runner account. This is effectively host-admin access:
  do not use a shared personal/production host or run untrusted contributions.
- Suggested build capacity: 4+ CPUs, 16 GB RAM and 30+ GB free disk; allow 90 minutes.
- Network access to dependencies, pinned container images and your GitLab HTTPS API.
- Port **18086** free on the runner host for disposable Compose smoke tests.
- Project Package Registry enabled. Permit the GitLab CI job token to upload
  generic packages and create releases under your instance's policies; the
  initiating user must have appropriate project/tag permissions. No personal
  token is embedded or required by the implementation.

Shell executor is intentional: the existing smoke test uses 127.0.0.1 to reach
the real Docker host. Dropping this job unchanged into a Docker-in-Docker runner
will not preserve that network arrangement. If your organization requires DinD,
adapt and validate smoke networking first.

The runner should clean ignored outputs between jobs (GitLab's normal git clean
behavior); the builder refuses to overwrite an existing version directory and
the publisher refuses ambiguous ZIP sets. Do not disable checkout cleaning.

## GitLab: generate and download

1. Push this code to your private GitLab project, and set its default branch.
2. Build -> Pipelines -> **New pipeline** (called Run pipeline on some versions),
   select the default branch, and create it.
3. Press Play on the manual **handoff-release** job.
4. After success, open Deploy -> **Releases** (or the project's Releases page).
5. Download the ZIP and checksum from the release's asset links.

Only manually created web pipelines on the default branch offer this job. It
does not publish on pushes, merge requests, schedules, or arbitrary branches.
The shared script pins the tested Node runtime and removes `use-node-version`
from `.npmrc` in the disposable CI checkout only.

GitLab stores the large files in the **Generic Package Registry**, then creates
a release with direct links only after both uploads succeed. This avoids the
small job-artifact limit and artifact expiration. Ensure your instance's package
file/proxy request limits accommodate the ZIP (previous build approximately
500 MB; allow growth, e.g. 2 GB). Package cleanup/retention rules must preserve
released `docker-handoff` packages, or links will break. Private package/release
permissions still apply. Each execution uses `handoff-PIPELINE.JOB`; a retry gets
a new job ID. Failed uploads can leave unreferenced packages; maintainers can
remove those, not packages linked by published releases.

References: [Generic packages](https://docs.gitlab.com/user/packages/generic_packages/),
[Release API](https://docs.gitlab.com/api/releases/),
[Runner security](https://docs.gitlab.com/runner/security/).

## Coworker installation (unchanged)

After downloading/extracting the actual handoff ZIP, with Docker running:

```powershell
.\load-images.ps1
.\setup.ps1
.\start.ps1
```

Linux/macOS: `sh load-images.sh`, `sh setup.sh`, `sh start.sh`.
Open http://localhost:8080 and register the first administrator. There is no
shared default password. README.md and FEATURE-TESTS.md inside the ZIP cover
LAN access, testing and upgrades. For upgrades, preserve the existing project,
volumes and secrets; never use `down -v` on an existing deployment.

## Local build (no publishing)

With the same prerequisites and Node/pnpm versions, from the repository root:

```sh
sh scripts/internal-fork/ci-handoff.sh
```

Outputs remain in `.handoff-output/`. This is the full tested pipeline, not just
the final packaging command. It edits `.npmrc` locally to honor the tested Node
version; review that local change rather than committing it accidentally.
Publishing scripts require CI run identity and credentials and should normally
only be invoked by the supplied workflows. Checksum detects corruption, not
publisher authenticity; use trusted release access/distribution.

## Validation boundary

Publisher tests use fixture files and mocked GitHub CLI/GitLab HTTP calls; they
check checksums, run identity, failure ordering, private token handling and
release asset links without making remote releases. A real GitLab run still
requires your runner, instance limits and permissions to be validated there.
No GitLab host/project credentials are available in this GitHub checkout.
