# Paid-feature behavioral parity and test matrix

Status: **Hardening complete; documented gaps remain**

This matrix compares the independently implemented internal extensions with
NocoDB's publicly documented paid-feature behavior as of 2026-07-25. It is a
workflow-compatibility target, not a claim that private source, commercial
routes, entitlement state, or undocumented wire contracts are reproduced.

Legend:

- **Verified** — exercised through an automated test or a running self-hosted
  instance in this branch.
- **Implemented** — code exists and has targeted coverage, but the complete
  production topology has not been rehearsed.
- **Partial** — the principal workflow works; listed parity gaps remain.
- **Gap** — not implemented and must not be represented as equivalent.

## Fine-grained API tokens

Public reference: <https://nocodb.com/docs/product-docs/account-settings/api-tokens>

| Workflow or security property                 | Status      | Evidence / difference                                                                      |
| --------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| Create with a 1–255 character name            | Verified    | Service, HTTP, browser, and live-instance tests                                            |
| Secret displayed once; hash only at rest      | Verified    | Scrypt hash tests, repository inspection, browser one-time dialog                          |
| Identify by non-secret prefix                 | Verified    | Independent `nci_` prefix; intentionally not NocoDB's `nc_pat_` format                     |
| Typed read/write permission families          | Verified    | Central scope enum and route guard                                                         |
| Workspace/base resource restrictions          | Verified    | Cross-boundary policy tests and selected-base authorization                                |
| Expiration, last-used time, revocation        | Verified    | Model, repository, HTTP, and live-instance tests                                           |
| `xc-token` and Bearer authentication          | Verified    | Live-instance allow/deny sweep                                                             |
| Edit name, expiration, resources, and scopes  | Implemented | `PATCH .../tokens/:id`, isolated editor, unit/HTTP/browser tests                           |
| Reversible active toggle                      | Implemented | Separate `disabled_at`; disable denies authentication without making revocation reversible |
| Delete/revoke takes effect immediately        | Verified    | Live token was revoked and rejected on the next request                                    |
| All-current-and-future-bases wildcard         | Gap         | Current UI deliberately uses explicit base allowlists                                      |
| Effective access is user access ∩ token scope | Verified    | Central owner lifecycle, base-permission, scope, and boundary policy                       |

## Base roles and permissions

Public reference:
<https://product-feed.nocodb.com/docs/product-docs/roles-and-permissions>

| Workflow or security property                          | Status   | Evidence / difference                                                                      |
| ------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------ |
| Base permission catalog and direct user assignments    | Verified | Repository/service tests and browser editor                                                |
| Existing base-role assignments                         | Verified | Deterministic resolver tests                                                               |
| Inherited versus direct explanation                    | Verified | Effective-permission response and editor display                                           |
| Server enforcement across V1/V2/V3 record APIs         | Verified | Authorization regression suites                                                            |
| Cross-workspace/base denial                            | Verified | Reusable authorization harness                                                             |
| Owner recovery access                                  | Verified | Resolver tests                                                                             |
| Permission mutation audit events                       | Verified | Atomic audit/repository tests                                                              |
| Exact commercial role matrix and every precedence edge | Partial  | Internal permissions are opt-in and additive; intentional model differences are documented |
| Team subjects                                          | Gap      | Reserved for a later schema version                                                        |

## Instance administration and advanced APIs

Public references:

- <https://product-feed.nocodb.com/docs/product-docs/cloud-enterprise-edition/admin-panel>
- <https://product-feed.nocodb.com/docs/product-docs/workspaces/workspace-audit>

| Workflow or security property                                      | Status      | Evidence / difference                                                    |
| ------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------ |
| Redacted instance health and counts                                | Implemented | Super-admin service/controller tests                                     |
| User search, disable/enable, memberships, token revocation         | Implemented | Admin API and UI coverage                                                |
| Workspace/base search and ownership inspection                     | Implemented | Admin API and UI coverage                                                |
| Separate internal OpenAPI document and error contract              | Implemented | `/api/internal/v1/openapi.json`                                          |
| Collaboration member and supported view APIs                       | Implemented | Guarded controllers and targeted tests                                   |
| Security audit event querying                                      | Implemented | Independent append-only event model                                      |
| Exact commercial dashboard presentation and all commercial filters | Partial     | Operational workflow is similar; presentation and several filters differ |

## Field and form validation

| Workflow or security property                              | Status      | Evidence / difference                                            |
| ---------------------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| Required, length, regex, number, date, allowed-value rules | Verified    | Rule-engine tests                                                |
| File type, size, and attachment-count rules                | Verified    | Rule-engine tests                                                |
| Backend-authoritative direct API enforcement               | Verified    | Running server returned 422 for invalid V2 record creation       |
| Rule persistence on SQLite                                 | Verified    | Live test plus SQLite repository regression                      |
| Matching frontend configuration/feedback                   | Implemented | Isolated validation editor and composable tests                  |
| Standard create/update and shared form paths               | Implemented | Route interceptor coverage                                       |
| Every bulk/import path and every supported database        | Partial     | PostgreSQL/MySQL rehearsal and the complete import matrix remain |

## Expanded record modes

Public reference: <https://nocodb.com/docs/product-docs/records/expand-record>

| Workflow or security property                             | Status      | Evidence / difference                                       |
| --------------------------------------------------------- | ----------- | ----------------------------------------------------------- |
| Field, file, and discussion mode selector                 | Implemented | Independent selector integrated into expanded records       |
| Permission-aware field mode                               | Implemented | Central record/base authorization                           |
| Authorized image, PDF, and text preview                   | Verified    | Secure attachment proxy and denial tests                    |
| Audio and video preview                                   | Implemented | Native media controls using authorized proxy URLs           |
| Attachment-field selector, previous/next, thumbnail strip | Implemented | Independent file-preview component                          |
| Download and read-only record sidebar                     | Implemented | File-preview component                                      |
| Attachment upload from preview mode                       | Gap         | Users must currently use the normal attachment field editor |
| Threaded record comments, author edit, moderator delete   | Implemented | Service/controller/UI                                       |
| Resolve/reopen and one-level thread behavior              | Implemented | Migration, audited service, UI                              |
| Mentions and basic notifications                          | Implemented | Membership-filtered notification writes                     |
| Rich comment attachments and image annotations            | Gap         | Not implemented                                             |

## NocoDocs-like documents

Public references:

- <https://nocodb.com/docs/noco-docs>
- <https://nocodb.com/docs/noco-docs/permissions>
- <https://product-feed.nocodb.com/docs/noco-docs/version-history>
- <https://nocodb.com/docs/noco-docs/comments>
- <https://nocodb.com/docs/noco-docs/collaboration>
- <https://nocodb.com/docs/noco-docs/export-document>

| Workflow or security property                            | Status      | Evidence / difference                                                                                    |
| -------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| Hierarchical document tree, search, create child         | Verified    | Live server and component implementation                                                                 |
| Rich block-style editing controls                        | Implemented | Reuses the Community TipTap rich-text component inside the isolated document module                      |
| Autosave with visible saved/unsaved/error state          | Implemented | Debounced editor save with optimistic versions                                                           |
| Concurrent stale-write rejection                         | Implemented | Version predicate is checked in the mutation transaction                                                 |
| Viewer+/Editor+ style defaults                           | Implemented | New documents grant Viewer read/export, Commenter comment/export, Editor edit/export, and Creator manage |
| Owner/Creator permission management                      | Implemented | Server-side role bypass plus grant editor                                                                |
| Hidden navigation/search and nondisclosing direct denial | Implemented | Authorized query filtering and not-found response                                                        |
| Nested permission inheritance                            | Implemented | Ancestor grant resolution                                                                                |
| Snapshot history, restore, retention                     | Verified    | Live create/update/history test and service coverage                                                     |
| Anchored/general comments, replies, resolve              | Partial     | Backend anchors and single-level threads exist; selection-to-anchor UI is not complete                   |
| Revision diff presentation                               | Gap         | History lists snapshots but does not yet render a visual diff                                            |
| Comment filters, reactions, rich attachments             | Gap         | Not implemented                                                                                          |
| Real-time cursors/presence and offline reconcile         | Gap         | Not implemented; no claim of collaboration parity                                                        |
| Markdown and HTML export                                 | Gap         | PDF is implemented; Markdown/HTML are not                                                                |
| PDF export authorization and safe rendering              | Verified    | Live authenticated export and service security tests                                                     |
| Public share                                             | Gap         | Intentionally not implemented in the internal document surface                                           |

## Security and deployment

| Property                                   | Status                         | Evidence / difference                                                           |
| ------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------- |
| Anonymous versus unauthorized distinction  | Verified                       | 401/403 route matrix                                                            |
| Disabled/deleted actor denial              | Verified                       | Authorization harness                                                           |
| Token expiration/revocation/disable denial | Verified                       | Model/HTTP/live tests                                                           |
| Audit events contain no plaintext token    | Verified                       | Audit assertions                                                                |
| Cross-tenant denials                       | Verified                       | Policy matrix                                                                   |
| Commercial entitlement code unchanged      | Verified by scoped diff review | Custom registrations and modules only                                           |
| Windows one-command launcher               | Implemented                    | `.cmd` subprocess handling and Node >=22 compatibility fixed                    |
| SQLite startup and migrations              | Verified                       | Running local backend plus migration tests                                      |
| PostgreSQL/MySQL migration rehearsal       | Gap                            | Required before broad production rollout                                        |
| Full upstream GUI production build         | Verified                       | `nuxi build` completed; upstream warnings are recorded in the completion report |

## Release gate

The branch may be described as a substantial independent reimplementation, but
not as fully equivalent to every paid feature while any **Gap** row remains.
Before an internal production release, all security rows must be Verified, the
complete targeted suite and production builds must pass, and the chosen
production database migration must be rehearsed against a backup.
