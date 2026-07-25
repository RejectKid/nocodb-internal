# Internal product suite implementation

Status: Security review

This release completes the implementation pass for the remaining internal-fork
pipeline. It does not enable, call, patch, or reproduce NocoDB commercial
modules. Similar user workflows are implemented with separate
`internal-extensions` services, `nc_internal_*` tables, `/api/internal/v1`
contracts, and `internalExtensions` frontend components.

## Delivered capabilities

### Administration

- Instance overview with versions, configuration status, health signals, and
  redacted resource counts.
- Super-admin-only user search, membership inspection, disable/re-enable, token
  revocation, and security-event inspection.
- Workspace/base search, ownership and membership summaries, orphan signals,
  and per-base internal feature switches.

Disabling a user rotates the Community token version, clears refresh tokens and
cache state, and revokes independent tokens. Self-disable and disabling any
super administrator are rejected.

### Independent API

- OpenAPI 3.1 contract at `GET /api/internal/v1/openapi.json`.
- Separate collaboration endpoints for workspace/base membership.
- Community-compatible view list/create/update/delete/reorder endpoints.
- Standard authenticated session or fine-grained token security declaration.
- Audit events for internal mutations.

Only Grid, Form, Gallery, Kanban, and Calendar view types are accepted. Unknown
or gated view types fail closed.

### Input validation

- Typed server rules for required, string length, regex, number ranges,
  integers, decimal precision, dates, allowed values, file type/size, and
  attachment count.
- An authoritative interceptor for supported Community create, update, bulk,
  form, public-form, and import request shapes.
- Stable 422 failures identifying field, rule, and message.
- A base settings editor with field-type compatibility and client preview.
- Revision checks prevent two administrators from silently overwriting rules.

The server remains authoritative. The frontend preview is convenience only.

### Record modes

- A Community-only independent selector for Fields, Files, and Discussion in
  both expanded-record surfaces.
- File preview obtains short-lived URLs only after workspace, base, model,
  record, column, and attachment authorization.
- Images, PDF, and text are previewed; active content is sandboxed and other
  formats show metadata/download.
- Threaded record comments support own-edit, own-delete, moderator delete,
  mentions, notifications, and audit events.

The implementation does not render or import NocoDB's gated presenters.

### Documents

- Nested documents with `discover`, `read`, `comment`, `edit`, `manage`, and
  `export` permissions assigned to users or existing base roles.
- Permission-aware navigation/search and non-enumerating direct URL behavior.
- Snapshot revisions, optimistic concurrency, configurable retention, and
  audited restore.
- General or anchored threaded comments, resolution, author edit, moderator
  delete, mentions, and notifications.
- A trusted local PDF renderer that performs no local-file or remote-resource
  fetches.
- An independent document workspace UI with editor, history, permissions,
  comments, nested creation, and PDF export.

No document realtime namespace is registered in this release. Consequently an
unauthorized realtime connection has no route and cannot disclose document
metadata. Live co-editing is intentionally deferred; snapshot concurrency
prevents silent overwrites.

### Auditing and hardening

- Audit coverage for administration, membership, validation, views, record
  discussion, document, permission, revision, comment, and notification
  mutations.
- Machine-readable authorization cases for document scope/tenant isolation,
  direct hidden admin access, and discussion access.
- Per-base feature guard in addition to the independent environment registry.
- Additive migration with an isolated rollback and SQLite migration rehearsal.

## Public-workflow compatibility

| Workflow | Compatibility target | Independent implementation difference |
| --- | --- | --- |
| Instance administration | Search, inspect, disable/re-enable, revoke | No impersonation; intentionally excluded |
| Fine-grained tokens | One-time secret, scopes, boundaries, expiry/revoke | `/api/internal/v1`, separate token format/storage |
| Base permissions | Direct/inherited effective permissions | Enabled per base; Community behavior is unchanged until enabled |
| Collaboration APIs | List/invite/change/remove/effective permissions | Independent contract; does not clone paid API semantics |
| Validation | Matching client feedback with authoritative server rejection | Initial rules are intentionally bounded and typed |
| File mode | Attachment-first record browsing | Uses secure Community attachment adapter; no gated presenter |
| Discussion mode | Threaded record conversation | Basic notifications; reactions/rich embeds deferred |
| Documents | Nested permissions, revisions, comments, export | Snapshot editor; no live co-editing in this release |
| View APIs | CRUD/reorder supported view types | Rejects gated/unknown view types |

## Remaining release gates

Pipeline items are at Security Review, not Released. Before production:

- Exercise the full stack against PostgreSQL with representative tenant data.
- Complete browser tests for the new administration, validation, record-mode,
  and document screens.
- Load-test validation bulk writes, document search, mentions, and PDF export.
- Resolve or baseline the upstream repository's existing TypeScript, ESLint,
  and frontend-build failures.
- Perform manual accessibility and threat-model review.

These are release-validation gates, not missing backend feature modules.
