# Internal feature pipeline

Status values: Proposed, Architecture, Backend, Frontend, Testing, Security
Review, Documentation, Ready, Released, Blocked.

Complexity uses S, M, L, and XL. No item is production-ready until its security
review, documentation, migrations, rollback notes, and required tests pass.

For features corresponding to NocoDB paid capabilities, acceptance review also
includes a behavioral-compatibility matrix based on public documentation and
observable product behavior. The target is near-identical workflow and API
ergonomics without copying gated source, using gated runtime modules, or
changing entitlements. Any intentional difference must be documented.

## Pipeline 1: Foundation

### FND-001 — Custom module boundary

- Business purpose: Keep independent organizational features maintainable and
  visibly separate from upstream commercial code.
- Scope: Backend module, frontend namespace, environment master switch,
  migration namespace, naming rules, and ADR.
- Non-goals: Licensing changes, enabling upstream gated features, or a general
  plugin framework.
- Dependencies: Repository orientation.
- Data-model changes: Separate internal migration-history table only.
- Backend work: Conditional module registration and isolated providers.
- Frontend work: `internal` route/composable/component namespaces.
- Security considerations: Disabled mode must register no custom routes or
  migrations; no entitlement dependency.
- Tests required: Import enabled/disabled and application-module compilation.
- Documentation required: ADR 0001, manifest, environment variables.
- Estimated complexity: M
- Status: Security Review
- Acceptance criteria: Boundary is distinct; commercial entitlement code is
  untouched; `NC_INTERNAL_EXTENSIONS_ENABLED` disables it; the app still starts.
- Known risks: One top-level registration hook may conflict during upstream
  merges.

### FND-002 — Internal feature registry

- Business purpose: Publish authoritative internal capability availability.
- Scope: Typed keys, configuration requirements, backend/frontend capability,
  internal schema version, authenticated read-only endpoint, and UI page.
- Non-goals: Commercial entitlements, per-user permissions, or remote rollout.
- Dependencies: FND-001.
- Data-model changes: None.
- Backend work: Pure environment parser, registry service, controller, and
  authenticated-user guard.
- Frontend work: Capability composable and isolated settings page.
- Security considerations: Do not expose environment values or secrets; reject
  anonymous/disabled users.
- Tests required: Enablement, disablement, response shape, authentication, and
  unknown/invalid values.
- Documentation required: ADR 0002 and endpoint/environment docs.
- Estimated complexity: M
- Status: Security Review
- Acceptance criteria: Registry is independent, per-feature configurable,
  read-only at `GET /api/internal/v1/capabilities`, and unit-tested.
- Known risks: Frontend/backend key drift; prevented with response-shape tests.

### FND-003 — Authorization test harness

- Business purpose: Make authorization-denial coverage reusable and mandatory.
- Scope: Helpers for anonymous, unauthorized, authorized, direct API,
  scoped/expired token, cross-base/workspace, and disabled-user cases.
- Non-goals: Replacing Jest or exhaustive testing of every upstream endpoint.
- Dependencies: FND-001, ADR 0003.
- Data-model changes: None.
- Backend work: Test fixtures, identity builders, route matrix runner.
- Frontend work: Optional route-visibility assertions.
- Security considerations: Distinguish 401 authentication from 403
  authorization and avoid false-positive 404 assertions.
- Tests required: Harness self-tests and one unchanged Community endpoint.
- Documentation required: Usage guide and fixture lifecycle.
- Estimated complexity: L
- Status: Security Review
- Acceptance criteria: All named cases are reusable; Community behavior is
  unchanged; error classes remain distinguishable.
- Known risks: Brittle full-app fixtures and test runtime.

## Pipeline 2: Fine-grained API tokens

### TOK-001 — Token data model

- Business purpose: Issue revocable, expiring, least-privilege internal tokens.
- Scope: Separate entity/table, one-time secret, hash/prefix, creator/revoker,
  workspace/base allowlists, metadata, and timestamps.
- Non-goals: Authenticating against all routes or modifying existing API tokens.
- Dependencies: FND-001, FND-003.
- Data-model changes: `nc_internal_api_tokens` plus indexes and foreign-key
  strategy documented in ADR 0004.
- Backend work: Model, Knex repository, one-time issuance service, hashing
  interface, expiration/revocation helpers, and migration.
- Frontend work: None in this item.
- Security considerations: Plaintext exists only in the create response; use a
  versioned password-hash/KDF strategy; constant-time verification.
- Tests required: Hash/verify, no plaintext persistence, expiration, revocation,
  prefix format, migration up/down.
- Documentation required: Token design and ADR 0004.
- Estimated complexity: L
- Status: Security Review
- Acceptance criteria: Migration exists; only hash is stored; prefix identifies
  tokens; issuance retries prefix collisions; persisted JSON is validated;
  expiration and revocation are representable/enforceable.
- Known risks: Hash cost and database portability.

### TOK-002 — Token scopes

- Business purpose: Bound token actions and tenant reach.
- Scope: Typed scopes, centralized policy service, workspace/base allowlists,
  route decorator/guard, and policy decisions.
- Non-goals: Reusing NocoDB paid token contracts or guaranteeing undocumented
  wire-level compatibility. Documented and observable workflows remain a
  compatibility target.
- Dependencies: TOK-001, PERM-001, FND-003.
- Data-model changes: Normalized scope and boundary tables or a versioned JSON
  representation, selected during architecture review.
- Backend work: Central policy and scope catalog complete; token strategy,
  production owner-permission adapter, scope decorators, and audit hooks remain.
- Frontend work: Shared labels for administration UI.
- Security considerations: Default deny; intersection of actor permissions,
  token scopes, and tenant allowlists.
- Tests required: Allow/deny for every scope family, cross-tenant, expired,
  revoked, disabled user, direct route, and scope-version mismatch.
- Documentation required: Scope catalog and policy algorithm.
- Estimated complexity: XL
- Status: Backend
- Acceptance criteria: Typed centralized scopes; boundaries enforced; route
  tests cover success and denial.
- Known risks: Scope explosion, stale owner-permission facts, and inconsistent
  resource extraction. HTTP integration remains blocked on PERM-001, rate
  limiting, and PostgreSQL migration coverage.

### TOK-003 — Token administration UI

- Business purpose: Let authorized users safely manage internal tokens.
- Scope: Create, select scope/tenant, expire, copy once, list, last use, revoke.
- Non-goals: Secret recovery or automatic token rotation.
- Dependencies: TOK-001, TOK-002, PERM-001, SEC-001.
- Data-model changes: None beyond TOK-001/002.
- Backend work: CRUD API with audit events.
- Frontend work: Isolated internal token settings route and dialogs.
- Security considerations: Never persist secret client-side; clear clipboard
  guidance; immediate revocation; server authorization is authoritative.
- Tests required: Component state, copy-once behavior, permission-hidden UI,
  direct API denial, and revoke propagation.
- Documentation required: User guide and incident-response steps.
- Estimated complexity: L
- Status: Proposed
- Acceptance criteria: All requested operations work; secret is not retrievable;
  UI and backend restrictions match.
- Known risks: Browser clipboard leakage and stale list state.

## Pipeline 3: Base permissions

### PERM-001 — Permission model

- Business purpose: Grant explicit base capabilities without relying only on
  coarse roles.
- Scope: Listed base/record/document permissions assigned to users and existing
  base roles; future team subject reserved.
- Non-goals: Field/row-level rules in the first release.
- Dependencies: FND-003, SEC-001, ADR 0003.
- Data-model changes: Internal permission grants and base opt-in/config tables.
- Backend work: Resolver, policy interfaces, owner emergency access, adapters.
- Frontend work: Effective-permission read model.
- Security considerations: Server-only authority; deterministic default deny
  when enabled; no behavior change for bases not opted in.
- Tests required: Role/direct precedence, owner access, cross-base/workspace,
  disabled user, and Community fallback.
- Documentation required: Resolution algorithm and emergency-access policy.
- Estimated complexity: XL
- Status: Backend
- Acceptance criteria: All listed permissions are enforced; Community behavior
  remains unchanged until base opt-in; resolution is deterministic.
- Known risks: Conflicts with upstream role evolution.

Backend progress: The independent tables, typed catalog, validated repository,
deterministic resolver, owner emergency access, and effective-permission read
model are implemented. Production Community-membership adapters, route
enforcement, audited mutations, and UI remain pending.

### PERM-002 — Base permission UI

- Business purpose: Administer and explain effective base permissions.
- Scope: Base-settings editor, inherited/direct distinction, validation, audit.
- Non-goals: Team assignment or row/field rules.
- Dependencies: PERM-001, SEC-001.
- Data-model changes: None.
- Backend work: Read-effective and atomic update endpoints.
- Frontend work: Permission matrix/editor.
- Security considerations: Prevent privilege escalation and stale-write loss.
- Tests required: Visibility, validation, optimistic concurrency, direct API
  denial, and audit generation.
- Documentation required: Administrator guide.
- Estimated complexity: L
- Status: Proposed
- Acceptance criteria: Effective sources are visible; changes validate and
  audit; only authorized administrators can save.
- Known risks: Matrix usability and inherited-role ambiguity.

## Pipeline 4: Admin panel

### ADM-001 — Instance overview

- Business purpose: Provide safe operational visibility for self-hosting.
- Scope: Versions, dependency health, redacted configuration status, counts,
  health checks, and enabled internal features.
- Non-goals: Secret display, shell access, or arbitrary diagnostics.
- Dependencies: FND-002, PERM-001.
- Data-model changes: Optional cached health results only.
- Backend work: Super-admin read endpoints and bounded health adapters.
- Frontend work: Internal admin overview.
- Security considerations: Redaction, timeout limits, and anti-enumeration.
- Tests required: Super-admin allow, other-user deny, redaction, dependency
  failure, and timeout.
- Documentation required: Metric definitions.
- Estimated complexity: L
- Status: Proposed
- Acceptance criteria: All requested safe statuses/counts display; no secret
  values are returned.
- Known risks: Health checks causing load or leaking infrastructure details.

### ADM-002 — User administration

- Business purpose: Manage access and investigate security events.
- Scope: Search/status, disable/re-enable, membership view, token revocation,
  recent security events.
- Non-goals: User impersonation.
- Dependencies: TOK-002, SEC-001, PERM-001.
- Data-model changes: Internal administrative event metadata if needed.
- Backend work: Transactional user state and revocation APIs.
- Frontend work: User list/detail.
- Security considerations: Prevent self-lockout/last-admin removal; revoke
  sessions and internal tokens.
- Tests required: Role denial, last-admin safeguards, disabled-user rejection,
  revocation, and audit.
- Documentation required: Disable/re-enable runbook.
- Estimated complexity: XL
- Status: Proposed
- Acceptance criteria: Requested actions work without impersonation and are
  audited.
- Known risks: Upstream token/session invalidation semantics.

### ADM-003 — Workspace and base administration

- Business purpose: Inspect tenant ownership, membership, and extension state.
- Scope: Search, ownership/counts, permission config, orphan checks, per-base
  internal-extension disable.
- Non-goals: Moving resources between tenants.
- Dependencies: ADM-001, PERM-001.
- Data-model changes: Per-base internal-feature settings.
- Backend work: Read models and safe disable mutation.
- Frontend work: Workspace/base detail pages.
- Security considerations: Cross-tenant metadata is super-admin only.
- Tests required: Search boundaries, orphan detection, disable behavior, audit.
- Documentation required: Orphan definitions and recovery steps.
- Estimated complexity: L
- Status: Proposed
- Acceptance criteria: All requested inspection fields and extension disable
  action are present and authorized.
- Known risks: Expensive aggregate queries.

## Pipeline 5: Advanced APIs

### API-001 — Internal OpenAPI contract

- Business purpose: Stabilize and document custom APIs independently.
- Scope: `/api/internal/v1`, consistent errors/pagination/auth docs, mutation
  audit requirement, and listed resource families.
- Non-goals: Changing existing API semantics or reproducing paid APIs.
- Dependencies: FND-002, SEC-001.
- Data-model changes: None.
- Backend work: Dedicated OpenAPI generation and DTOs.
- Frontend work: Optional generated internal client package.
- Security considerations: Document required permissions without revealing
  inaccessible resource existence.
- Tests required: Schema validation, examples, auth annotations, and error
  contract.
- Documentation required: Published internal OpenAPI file and version policy.
- Estimated complexity: L
- Status: Proposed
- Acceptance criteria: Generated docs cover all custom endpoints with standard
  pagination/errors/auth and mutation audit.
- Known risks: Contract drift without CI checks.

### API-002 — Collaboration APIs

- Business purpose: Automate membership collaboration safely.
- Scope: List/invite/change/remove members and effective permissions.
- Non-goals: Full paid-API parity.
- Dependencies: TOK-002, PERM-001, API-001, SEC-001.
- Data-model changes: Invite/audit data only if upstream models cannot be safely
  adapted.
- Backend work: Independent contract and membership adapters.
- Frontend work: None required.
- Security considerations: Invite abuse, last-owner safeguards, tenant
  boundaries, and least-privilege tokens.
- Tests required: Every mutation allow/deny, token scopes, cross-tenant, and
  audit.
- Documentation required: API examples and lifecycle.
- Estimated complexity: XL
- Status: Proposed
- Acceptance criteria: Defined independent operations work only after token and
  permission foundations are stable.
- Known risks: Upstream membership side effects.

### API-003 — View management APIs

- Business purpose: Automate supported Community view management.
- Scope: List/read/create/update/delete/reorder Community-compatible views.
- Non-goals: Creating gated view types.
- Dependencies: TOK-002, PERM-001, API-001.
- Data-model changes: None unless ordering adapter requires internal metadata.
- Backend work: View service adapter and schema authorization.
- Frontend work: None required.
- Security considerations: Validate type allowlist and base/schema boundaries.
- Tests required: Supported types, gated-type rejection, token scopes,
  cross-base denial, and reorder consistency.
- Documentation required: Supported-type matrix.
- Estimated complexity: L
- Status: Proposed
- Acceptance criteria: Operations and authorization match the stated scope.
- Known risks: Upstream view metadata changes.

## Pipeline 6: Input validation

### VAL-001 — Validation rule model

- Business purpose: Prevent invalid records across all supported write paths.
- Scope: Listed string, number, date, allowed-value, and attachment rules;
  create/update/form/bulk/API/import adapters where feasible.
- Non-goals: Mutating existing invalid data or arbitrary executable validators.
- Dependencies: PERM-001, SEC-001.
- Data-model changes: Versioned internal field-validation rules.
- Backend work: Typed rule engine and authoritative write-path adapters.
- Frontend work: Shared rule types and error mapping.
- Security considerations: Regex denial of service, attachment trust, locale and
  numeric/date ambiguity, bulk atomicity.
- Tests required: Each rule, each write path, direct API invalid data, malformed
  config, and legacy-record behavior.
- Documentation required: Rule semantics and import limitations.
- Estimated complexity: XL
- Status: Proposed
- Acceptance criteria: Backend rejects invalid data with field/rule errors;
  existing rows are untouched.
- Known risks: Achieving complete write-path coverage.

### VAL-002 — Form validation UI

- Business purpose: Configure and preview validation without code.
- Scope: Field-compatible rules, custom messages, preview, client feedback.
- Non-goals: Client-only enforcement.
- Dependencies: VAL-001.
- Data-model changes: Custom messages in VAL-001 rule records.
- Backend work: Configuration APIs and compatibility validation.
- Frontend work: Field-settings editor and preview.
- Security considerations: Sanitize messages and keep definitions compatible
  with the server.
- Tests required: Type compatibility, preview, localization, direct API denial.
- Documentation required: Form-builder guide.
- Estimated complexity: L
- Status: Proposed
- Acceptance criteria: Incompatible rules are hidden/rejected; preview and
  server behavior agree.
- Known risks: Client/server validation drift.

## Pipeline 7: Record modes

### MODE-001 — Field mode enhancement

- Business purpose: Improve expanded-record usability and extension readiness.
- Scope: Grouping, read-only sections, permission-aware visibility, validation
  summary, previews, and activity extension point after architecture review.
- Non-goals: Exposing an existing gated mode.
- Dependencies: PERM-001, VAL-001.
- Data-model changes: Optional internal layout metadata.
- Backend work: Permission-aware record-detail DTO.
- Frontend work: Independent adapters/components around Community expanded form.
- Security considerations: Hidden fields must be removed server-side, not only
  hidden visually.
- Tests required: Field denial/direct API, grouping, read-only, regression.
- Documentation required: Mode architecture note.
- Estimated complexity: XL
- Status: Proposed
- Acceptance criteria: Enhancements are independent and permission-correct.
- Known risks: Tight coupling to expanded-form internals.

### MODE-002 — File preview mode

- Business purpose: Review record attachments efficiently.
- Scope: Images, PDF, plain text, office metadata, download/navigation, sidebar.
- Non-goals: Executing office documents or arbitrary active content.
- Dependencies: PERM-001, MODE-001.
- Data-model changes: Optional preview metadata/cache.
- Backend work: Authorized file gateway and safe content-disposition/type rules.
- Frontend work: Independent attachment-focused mode.
- Security considerations: No authorization-bypassing URLs, active-content
  isolation, range-request checks, and size limits.
- Tests required: File type matrix, direct URL denial, cross-tenant, unsupported
  content, and download permission.
- Documentation required: Supported files and security model.
- Estimated complexity: XL
- Status: Proposed
- Acceptance criteria: Supported previews/navigation work and every attachment
  fetch is authorized.
- Known risks: Browser/PDF parser vulnerabilities and storage URL leakage.

### MODE-003 — Discussion mode

- Business purpose: Support record-linked asynchronous collaboration.
- Scope: Threads, author/time, own edit/delete, moderator delete, mentions,
  basic notifications, and audits.
- Non-goals: Reactions, rich embeds, or external notifications.
- Dependencies: PERM-001, SEC-001.
- Data-model changes: Internal discussions, comments, mentions, and thread
  state.
- Backend work: APIs, authorization, notification adapter, audit.
- Frontend work: Independent discussion mode.
- Security considerations: Mention abuse, HTML sanitization, edit/delete
  ownership, tenant boundaries.
- Tests required: Ownership/moderation, cross-record/base, XSS, notification,
  and audit.
- Documentation required: Collaboration guide.
- Estimated complexity: XL
- Status: Proposed
- Acceptance criteria: Initial scope works with enforced ownership and audits.
- Known risks: Realtime consistency and notification volume.

## Pipeline 8: Documents

### DOC-001 — Document permissions

- Business purpose: Protect internal documents across every discovery/access
  path.
- Scope: Discover/read/comment/edit/manage/export for navigation, search, URLs,
  APIs, realtime, export, and nesting.
- Non-goals: Reusing EE document permissions.
- Dependencies: PERM-001, FND-003.
- Data-model changes: Independently named internal documents and grants.
- Backend work: Document repository/policy/search/realtime adapters.
- Frontend work: Permission-aware internal document UI.
- Security considerations: No title/metadata leaks; ancestor and child
  inheritance must be explicit; realtime handshake reauthorization.
- Tests required: Every channel/path, nested inheritance, cross-tenant, direct
  URL, and search non-disclosure.
- Documentation required: Permission resolution and threat model.
- Estimated complexity: XL
- Status: Proposed
- Acceptance criteria: All six permissions apply consistently to all listed
  paths and unauthorized metadata is absent.
- Known risks: Realtime and search-index leakage.

### DOC-002 — Document revisions

- Business purpose: Recover and audit document changes.
- Scope: Revision ID, author/time/summary, snapshots initially, restore, and
  retention.
- Non-goals: Delta compression until evidence justifies it.
- Dependencies: DOC-001, SEC-001.
- Data-model changes: Internal revision/snapshot table and retention config.
- Backend work: Snapshot creation, listing, authorized restore, pruning.
- Frontend work: Revision history and restore confirmation.
- Security considerations: Revision access follows current document
  permissions; restore is audited; retained snapshots do not bypass deletion.
- Tests required: Create/list/restore, permission changes, retention, races,
  audit.
- Documentation required: Retention/restore operations.
- Estimated complexity: L
- Status: Proposed
- Acceptance criteria: Reliable snapshots and audited restore work.
- Known risks: Storage growth and concurrent edits.

### DOC-003 — Document comments

- Business purpose: Discuss documents in context.
- Scope: Anchored comments when stable, general fallback, resolve, own edit,
  moderator delete, and permissions.
- Non-goals: Rich reactions and external federation.
- Dependencies: DOC-001, SEC-001.
- Data-model changes: Internal document comment/thread/anchor tables.
- Backend work: Thread APIs and anchor validation.
- Frontend work: Comment sidebar and anchors.
- Security considerations: Content sanitization, stale anchors, and deleted
  document/permission handling.
- Tests required: Own/moderator actions, anchor fallback, cross-tenant, XSS.
- Documentation required: Anchor limitations.
- Estimated complexity: XL
- Status: Proposed
- Acceptance criteria: Permission-correct threads work with a reliable general
  comment fallback.
- Known risks: Anchor stability after collaborative edits.

### DOC-004 — PDF export

- Business purpose: Export authorized document views for sharing/archival.
- Scope: Server-side or trusted renderer, permission-filtered content.
- Non-goals: Arbitrary URL-to-PDF or local filesystem rendering.
- Dependencies: DOC-001.
- Data-model changes: Optional bounded export-job metadata.
- Backend work: Authorized renderer with resource allowlist and limits.
- Frontend work: Export action/status.
- Security considerations: SSRF, local-file access, active content, time/memory
  limits, and permission changes during jobs.
- Tests required: Authorization, SSRF/local-file denial, resource allowlist,
  timeout, and visible-content parity.
- Documentation required: Renderer hardening/runbook.
- Estimated complexity: XL
- Status: Proposed
- Acceptance criteria: Export is authorized and matches visible permissions
  without unrestricted resource access.
- Known risks: Renderer supply-chain and sandbox escapes.

## Pipeline 9: Auditing and hardening

### SEC-001 — Audit events

- Business purpose: Create accountable security and administrative history.
- Scope: All listed token, permission, user, membership, config, document,
  revision, and validation events with safe before/after summaries.
- Non-goals: Storing secrets, request bodies wholesale, or full SIEM.
- Dependencies: FND-001.
- Data-model changes: Independent internal audit-event table and indexes.
- Backend work: Typed event service and mutation hooks.
- Frontend work: Read-only event views where required.
- Security considerations: Append-oriented access, secret redaction, retention,
  IP/user-agent privacy, and request-ID correlation.
- Tests required: Event generation, redaction, actor/resource/tenant fields,
  failure atomicity, and access control.
- Documentation required: Event catalog and retention.
- Estimated complexity: L
- Status: Backend
- Acceptance criteria: Every named mutation emits the required safe fields and
  never records plaintext tokens.
- Known risks: Partial audit on failed transactions.

Backend progress: The independent table, typed catalog, recursive redaction,
tenant-bounded repository, request-context adapter, and atomic mutation/audit
helper are implemented. Feature-owned mutation hooks, authorized read APIs,
retention automation, and frontend views remain pending.

### SEC-002 — Authorization regression matrix

- Business purpose: Detect cross-tenant and privilege regressions in CI.
- Scope: Machine-readable role, scope, workspace, base, resource, operation,
  expected-result matrix.
- Non-goals: Replacing focused unit/property tests.
- Dependencies: FND-003, TOK-002, PERM-001.
- Data-model changes: None.
- Backend work: Matrix runner and fixtures.
- Frontend work: Optional visibility subset.
- Security considerations: Fail closed on unknown operation/scope and ensure
  negative cases execute real requests.
- Tests required: Matrix schema self-test and CI execution.
- Documentation required: Adding cases and interpreting failures.
- Estimated complexity: L
- Status: Proposed
- Acceptance criteria: CI runs the checked-in matrix and reports precise
  mismatches.
- Known risks: Runtime and fixture combinatorics.

### SEC-003 — Security review checklist

- Business purpose: Standardize release review for internal extensions.
- Scope: Authentication, authorization, tokens, secrets, validation, files,
  realtime, exports, audit, injection, tenant isolation, errors, rate limits,
  dependencies, and upgrades.
- Non-goals: Claiming external certification.
- Dependencies: Architecture report.
- Data-model changes: None.
- Backend work: None.
- Frontend work: None.
- Security considerations: Checklist evidence must reference executed tests and
  reviewed diffs.
- Tests required: Not applicable; checklist verifies required evidence.
- Documentation required: `security-review.md`.
- Estimated complexity: S
- Status: Documentation
- Acceptance criteria: Every requested topic has explicit review questions and
  release evidence fields.
- Known risks: Checklist becoming ceremonial; release owners must sign and link
  evidence.

## Initial delivery gates

Vertical Slice A advances FND-001 and FND-002 through Documentation after
targeted backend and frontend validation. Vertical Slice B advances TOK-001
through Architecture/Backend skeleton only. FND-003 remains the recommended
next feature because all later authorization-sensitive work depends on it.
