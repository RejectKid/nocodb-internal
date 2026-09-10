# Admin and documents: deployment, use, and acceptance testing

## What was missing

The fork already had independent admin/document services and pages, but the
normal NocoDB menus did not link to them. The documents page required route
context that was lost outside a base, had no base picker or import action, and
used a record editor without providing its required base metadata. PDF links
also did not send the session authentication header.

This change adds menu entry points, a base picker, user inspection and links to
Community setup screens, per-base document enablement, editable file import,
portable JSON export, and authenticated PDF/JSON downloads. It does not unlock
upstream commercial pages. This is an independent implementation, not a claim
of full paid-edition UI or document-format parity.

## Deploy the updated code

An old image or the earlier handoff tar does NOT contain these changes. Build
and deploy the updated fork frontend AND backend using your existing private
image pipeline. Do not substitute the public `nocodb/nocodb` image. Use a new,
immutable image tag for both the app and worker.

Keep these settings on the app and worker:

```yaml
NC_INTERNAL_EXTENSIONS_ENABLED: "true"
NC_INTERNAL_ADMIN_ENABLED: "true"
NC_INTERNAL_DOCUMENT_PERMISSIONS_ENABLED: "true"
NC_INTERNAL_FILE_PREVIEW_MODE_ENABLED: "true"
NC_SECURE_ATTACHMENTS: "true"
```

Back up the metadata database and attachment volume/object store before the
upgrade. After loading your new image tar with `docker load -i <new-image.tar>`,
update both image references in your existing Compose file, then run:

```sh
docker compose up -d --force-recreate nocodb worker
docker compose logs --tail=100 nocodb worker
```

These service names match the earlier handoff bundle. Preserve its database
connection, JWT secret, and volume names. Do NOT run `docker compose down -v`.
No new schema migration is required by this change; it uses the existing
independent document, revision, grant, and comment tables. Rollback is an image
rollback with the same metadata database; imported documents remain stored.

For source-based local evaluation, use the existing instructions in
[self-hosting.md](self-hosting.md). Local development uses UI port 3000; the
container handoff normally serves the combined application on port 8080.

## Find the administration screens

1. Sign in with an instance super-admin account. Being a base owner alone does
   not grant instance administration.
2. Open the user/avatar menu and select **Internal administration**, or visit
   `/internal/admin` on the UI host.
3. Overview shows redacted health, configuration status, counts, and features.
4. Users supports search, inspect memberships/recent security events, and
   disable/re-enable. Backend protections prevent unsafe administrative changes.
5. Workspaces shows ownership/counts and an **Open workspace** link. Bases shows
   memberships, orphan status, **Open documents**, and a document enable/disable
   control. The collections are paginated APIs; the current UI shows the first
   page of search results. Search to narrow larger installations.
6. **Instance users and invitations** opens Community `/account/users`.
   **Email and integrations setup** opens Community `/account/setup`.
   Configure email/storage using those existing Community integration screens;
   the internal overview is a status display, not a second secret editor.

If links are absent, check `/internal/settings/capabilities` while signed in.
Both the master switch and the individual feature switches must be enabled.
Restart/recreate containers after changing environment variables. A base-level
disabled setting can still deny documents when the instance flag is enabled.

## Create, store, and view documents

1. Create or open a normal base.
2. Its **Create new** menu now includes **Documents — create or import**.
   Alternatively use **Documents** in the avatar menu or `/internal/documents`.
3. Choose the base in the selector, then **New document**.
4. Edit the title/body. Wait for **Saved** or press **Save** before leaving the
   page or changing bases. **New child** creates a nested document.
5. Reopen documents from the left-hand list; search filters accessible titles.
6. Comments supports adding and resolving threads. History lists snapshots and
   Restore creates a new revision. Permissions accepts user IDs or base roles.
7. **Export PDF** downloads a rendered document. **Export JSON** downloads the
   portable title/content format for reimport.

Document content, revisions, comments, and grants live in the configured NocoDB
metadata database, not in the browser. Keep PostgreSQL's data volume (or the
SQLite metadata file for a SQLite deployment). Attachment binaries are separate:
keep the configured attachment volume/object store too. These are not the same
thing as editable internal documents.

## Import existing content

**Import document** accepts a single UTF-8 `.txt`, `.md`, `.markdown`, or portable
Internal documents `.json` file up to 4 MB. It creates a new document in the
selected base, owned by the current user. Server-side authorization/content
validation still applies. It never imports foreign user IDs, grants, ownership,
history, or workspace/base IDs.

Portable format example:

```json
{
  "format": "nc-internal-document",
  "version": 1,
  "title": "Team notes",
  "content": {
    "type": "doc",
    "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Hello"}]}]
  }
}
```

PDF/DOCX/XLSX originals belong in a normal table's **Attachment** field. Open an
attachment for supported preview/download; enable the independent File Preview
capability and secure attachments. This import is NOT a PDF/Word text extractor
or Office editor. It does not promise lossless conversion of arbitrary rich-text
JSON, embedded objects, or another vendor's document format.

Documents from a previous NocoDB database do not automatically populate these
independent tables. A read-only sample export/schema and the old version are
needed to build and test a migration adapter, including ownership mapping and
attachments. Do not point a guessed SQL copy at production or activate commercial
document code to read it. Exporting the old content to Markdown/text is the
available manual path; full historical migration remains separate work.

## Coworker acceptance checklist

- [ ] Super-admin can open the admin menu and all three collections.
- [ ] Non-admin is denied direct `/api/internal/v1/admin/overview` access.
- [ ] Existing Community email/storage/user configuration pages still work.
- [ ] Base Create new menu opens documents with the correct base selected.
- [ ] Create/edit/save a document, reload, and reopen with the content intact.
- [ ] Import Markdown and a JSON export; reopen after restart.
- [ ] Export PDF and JSON while signed in; no plaintext session/token in URLs.
- [ ] Add/resolve a comment and restore a previous revision.
- [ ] With a second regular base member, verify ungranted documents do not
      appear in search/list or direct requests. Add read, then edit/export grants
      and check their distinct behavior. Creators/owners/super-admins have the
      documented emergency access and are not suitable denial-test accounts.
- [ ] Disable documents for a test base in admin: direct document requests fail.
      Re-enable and confirm the stored documents return.
- [ ] Upload an image/PDF to an Attachment field and check authorized viewing;
      an anonymous browser must not fetch the protected file directly.
- [ ] Restart the app/worker with the same volumes and confirm persistence.

## Reproducible local smoke test

Use a disposable database and an English-language super-admin test account.
The script creates a new `Document QA ...` base and leaves its records for
inspection. It does not clean or modify existing bases.

Install repository dependencies as in self-hosting.md. Chrome is used by default
through the GUI package's existing Playwright dependency. Then from repo root:

```powershell
$env:NC_QA_URL = 'http://localhost:8080'
$env:NC_QA_EMAIL = '<test-super-admin-email>'
$env:NC_QA_PASSWORD = '<test-super-admin-password>'
node scripts/internal-fork/test-admin-documents.mjs
```

The script prints the temporary artifact directory for screenshots, PDF, and
JSON exports. Do not commit credentials or use a real-production account.
The automated smoke test is a subset of the checklist above; unchecked steps
must not be represented as verified.
