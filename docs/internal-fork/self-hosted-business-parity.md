# Self-hosted Business parity audit

Checked: 2026-09-10. Local fork baseline: NocoDB 0.301.3 plus internal extensions.

**Conclusion: this fork is NOT Business-feature complete.** The original pipeline
covered a subset, and several implementations remain partial. A registry flag,
an upstream gated component, or a passing compilation does not establish parity.
No entitlement checks were changed for this audit or the Teams implementation.

Sources: [current pricing cards and self-hosted comparison](https://nocodb.com/pricing.html),
[Teams documentation](https://nocodb.com/docs/product/collaboration/teams), and
[roles documentation](https://nocodb.com/docs/product/collaboration/roles-and-permissions).
The pricing cards include Teams under Business; the comparison table and Teams
documentation put it above Business. The cards and table also disagree on some
Community inclusions. This audit uses their union conservatively, not Cloud
quotas or a claim that the vendor has resolved those inconsistencies.

## Coverage ledger

Rows group closely related comparison entries. “Inherited” means existing
Community behavior, not a newly reimplemented commercial feature. “Partial”
means code exists but is not a substitute for the entire advertised workflow.
“Missing” means no independent implementation was found in our extension
namespace; commercial source elsewhere in the tree is deliberately not counted.

| Area checked | Fork assessment | Evidence and remaining acceptance work |
| --- | --- | --- |
| Seats, records, bases, storage, one workspace | Inherited | Community resource models are retained. No capacity/performance certification. Workspace management is not independent multi-workspace provisioning. |
| Row history | Inherited, unverified in this audit | Existing Community audit/history paths. Test retention and restore separately; document revisions are not record history. |
| Whole-base backups | Missing | Internal document snapshots do not back up base schema, rows, views, and files together. Need restore tests against isolated databases. |
| Field types, summaries, ordinary views | Inherited | Existing Community models/view components. Test the coworker's actual schema and external databases after upgrades. |
| Record detail, discussion, file-focused presentation | Partial independent | `record-modes/`, `discussions/`, GUI `recordModes/`, Community expanded-form hooks. Supported preview formats and collaboration differ from upstream; not all formats/end-user flows retested here. |
| Form theme, email, prefilling, conditional display | Inherited or unverified | Community form implementation; no claim that every current upstream option is present in this pinned version. Requires explicit browser tests with mail delivery. |
| Form branding, post-submit navigation | Missing independent alternatives | No internal form-publishing adapter for these functions. Do not expose paid toggles or remove required notices. |
| Validation | Partial independent | `validation/` and GUI validation editor. Rule engine/denials exist; full import and all field-type paths still need acceptance coverage. |
| Webhook triggers and payloads | Inherited | Community hooks remain intact; internal audit events are not webhook delivery-history retention. |
| Delivery logs | Missing independent retention/UI | Requires redacted execution log storage, retention, replay policy, and delivery tests. |
| Workflow engine and connector tiers | Missing independent implementation | No internal workflow runner, scheduler, retry model, or advanced connector/node suite. Existing gated nodes are not activated. |
| Context-sensitive relationships | Missing independent implementation | Must cover selection UI and API write validation; a frontend filter alone is insufficient. |
| Group summaries | Not verified | No independent implementation identified; validate Community behavior before deciding whether an adapter is needed. |
| Extensions, scripting, charts | Missing independent suite | No isolated script sandbox, chart/dashboard builder, or associated permissions. The admin health screen is not a data dashboard. |
| Conditional row/cell styling | Missing independent implementation | No internal persisted formatting rules/editor. |
| Reusable record presets | Missing independent implementation | Needs template persistence, field compatibility, and authorization on application. |
| Saved/toggleable filters; conditional buttons | Missing independent alternatives | Any upstream UI presence is not evidence that gated behavior can be used. Requires separate adapters and server-side action checks. |
| Folders, live presence | Inherited or unverified | Not newly implemented. Existing sidebar/realtime surfaces need a dedicated regression pass. |
| Sharing passwords | Inherited | Existing Community sharing authentication retained; team grants do not authorize public links. |
| Named share links | Missing independent implementation | Requires collision, revocation, and resource-authorization tests. |
| REST, schemas, examples | Inherited plus partial internal API | Community SDK/API remains. Internal OpenAPI lists custom routes; it is not a complete drop-in contract for paid APIs. |
| Administrative/collaboration APIs | Partial independent | `admin/`, `collaboration/`, `views/`, `openapi/`; scripts and independent workspace lifecycle endpoints remain absent. |
| Roles, notifications, comments | Inherited plus partial internal collaboration | `notifications/`, `discussions/`, `documents/` supplement Community features. Cross-channel behavior and upstream realtime editing are not equivalent. |
| Teams | Partial independent, added here | `teams/` plus base/document policy adapters. Flat workspace groups; no automatic Community workspace/base role assignment, nested/org groups, or identity-provider synchronization. |
| Table/field/dashboard policies | Missing | Current `permissions/` is BASE-scoped. Do not describe it as table/field security. Need discovery/read/write/export/bulk/form/attachment enforcement. |
| Provider-key AI and generators | Missing independent implementation | No separate provider configuration, execution, prompt generator, or protected credential storage for this suite. |
| External database connectivity | Inherited | Community PostgreSQL/MySQL paths preserved; neither connector was exercised by this SQLite test run. |
| External SaaS synchronization | Missing independent implementation | Requires separate connectors, incremental sync state, retry/idempotency, and credential handling. |
| Federated login; second factor | Missing independent implementation | No internal SAML/OIDC login or MFA enrollment/recovery service. Existing commercial authentication code is not activated. |
| Administration | Partial independent | `/internal/admin` plus Community account links. Operational inspection/user controls exist; this is not every upstream administrative capability. |
| Restricted API credentials | Partial independent | `api-tokens/`, centralized route scopes, expiry/revocation tests. Not a promise of identical upstream token semantics on every endpoint. |
| Documents and formatting | Partial independent | `documents/`, editor, 5 MB backend content ceiling, 4 MB portable-import UI. No legacy database migration or lossless arbitrary rich-text conversion. |
| Embedded content | Missing independent implementation | No unrestricted embedding added; requires a safe allowlist and export/realtime authorization design. |
| Document feedback and anchors | Partial independent | General comments and resolution work; text anchoring/reactions are not equivalent to the upstream editor experience. |
| Text/web/PDF export | Partial independent | Authenticated PDF and portable JSON work. Dedicated Markdown/HTML output is not implemented. |
| Document history | Independent extra | Snapshot/restore exists, but count-based retention is not a vendor retention guarantee or full collaborative versioning. |
| Interface pages and publication | Missing independent suite | No internal interface builder, draft/publish lifecycle, reviewer pages, or isolated interface-only collaborators. |
| Vendor assistance | Not software parity | A private fork cannot supply NocoDB's support entitlement. The organization must assign its own maintenance/support owner. |

Features outside the Business table such as multi-workspace expansion, private
bases, row security, team nesting, identity provisioning, audit-retention tiers,
visibility policies, extra database engines, and page ACLs are not silently
claimed here. Internal audit storage exists, but does not establish that every
upstream event is captured. Newly discovered gaps belong in the pipeline before
they can be marked delivered.

## Evidence standard and next work

Inspected `packages/nocodb/src/modules/internal-extensions`, corresponding GUI
components/composables/pages, migration registration, feature definitions,
permission policies, and existing tests. This is a source inventory plus targeted
runtime validation, not access to a licensed reference deployment. Pixel-level
and complete behavioral equivalence have not been measured.

Recommended order:

1. Finish team role/access provisioning design and document legacy migration.
2. Table/field policies with a denial matrix over every data path.
3. Independent SSO/MFA with identity lifecycle and recovery tests.
4. Safe document embeds, anchored feedback, and remaining export formats.
5. Workflow/script isolation and execution logs.
6. Interfaces/dashboards, then UI conveniences and integration/AI suites.

Each requires its own architecture note, threat model, migrations, tests, and
reviewable delivery. Do not mark this audit's Missing/Partial rows Ready merely
because Teams is enabled or because all current tests pass.
