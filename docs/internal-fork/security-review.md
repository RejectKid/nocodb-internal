# Internal extensions security review

Complete this checklist for every release. Link code review, threat model, test
run, migration rehearsal, and dependency-scan evidence. “Not applicable”
requires a reason.

## Authentication

- Are all non-public routes protected by an identity guard?
- Are anonymous, malformed, expired, revoked, deleted, and disabled identities
  tested separately?
- Are authentication failures returned as 401 without sensitive detail?

## Authorization

- Is every action enforced server-side through the centralized policy?
- Are direct API, cross-base, cross-workspace, deleted-resource, and stale-role
  cases tested?
- Do list/search/count/realtime/export paths enforce the same policy?
- Are unknown actions and incomplete resource contexts denied?

## Token handling and secret storage

- Is the token created with cryptographic randomness and shown once?
- Is only a versioned secure hash stored?
- Are token values redacted from logs, errors, audit events, telemetry, traces,
  browser storage, and analytics?
- Are revocation, expiration, scope version, actor status, and tenant allowlists
  checked before access?

## Input validation

- Is the backend authoritative for every write path?
- Are regex execution, numeric/date normalization, bulk atomicity, and import
  behavior bounded and tested?
- Are error messages precise without leaking inaccessible schema?

## File handling

- Are file reads authorized at request time, including signed/direct URLs?
- Are type, size, count, content disposition, range requests, and active content
  handled safely?
- Can parsers or previews access local files or unrestricted remote resources?

## Realtime channels

- Is authorization checked at connection and rechecked when permissions or
  resource state change?
- Can channel names, presence, errors, or reconnect behavior leak resources?

## Exports

- Is permission checked before enqueue and before final delivery?
- Does output contain only currently visible content?
- Are SSRF, local-file reads, active content, and renderer resource limits
  tested?

## Audit logging

- Are actor, action, resource, tenant, timestamp, request ID, and safe context
  recorded for all required mutations?
- Are secrets, credentials, full request bodies, and sensitive before/after
  values excluded?
- Is audit access restricted and retention documented?

## Injection and error leakage

- Are SQL identifiers/values parameterized?
- Is HTML/Markdown/comment content sanitized at the correct trust boundary?
- Are command, template, path, header, log, and formula injection considered?
- Do 4xx/5xx responses avoid stack traces, secrets, and resource enumeration?

## Cross-tenant access

- Does every tenant query include explicit workspace/base predicates?
- Are cache keys tenant-qualified?
- Are background jobs, notifications, search indexes, files, and audit records
  covered by cross-tenant tests?

## Rate limiting and abuse

- Are token verification, login-like routes, search, mentions, exports,
  previews, and bulk operations bounded?
- Are concurrency, payload, pagination, timeout, and retry limits explicit?

## Dependencies

- Were lockfile changes reviewed and vulnerability/provenance checks run?
- Are parsers, renderers, cryptography, and realtime dependencies supported and
  pinned according to repository policy?

## Upgrade regression

- Was the protected commercial-file diff checked?
- Were custom registration hooks and the manifest reviewed?
- Were migration up/down rehearsed on supported databases?
- Did the authorization regression matrix and disabled-mode startup pass?

## Release evidence

### Consolidated product-suite implementation

- Internal Jest: migration, feature guard, validation, PDF, OpenAPI, token,
  permission, and authorization matrix suites.
- Frontend Vitest: internal capability, token, permission, validation, record
  mode path, and document conversion contracts.
- SFC compilation: all new and modified internal screens plus both expanded
  record shells parsed and compiled successfully.
- Commercial diff check: no license or entitlement enforcement file changed.
- Realtime: no internal document channel is registered; live co-editing remains
  a documented release limitation.
- Full repository typecheck/lint/build: blocked by upstream baseline failures
  recorded in `consolidated-completion-report.md`; this must be resolved or
  formally baselined before Release.

- Reviewer:
- Date:
- Commit:
- Threat model:
- Test report:
- Migration rehearsal:
- Dependency scan:
- Exceptions with owner and expiry:

## Stage 1 evidence

- [x] Shared matrix distinguishes `401` authentication from `403`
      authorization failures.
- [x] Anonymous, unauthorized, authorized, blocked, deleted, and disabled
      identities are deterministic fixtures.
- [x] Token fixtures cover scopes, expiration, revocation, workspace/base
      boundaries, and disabled owners without plaintext secrets.
- [x] A frontend-hidden direct mutation is represented and fails if an
      executor accidentally returns success.
- [x] The unchanged Community cache-delete route is exercised through the
      harness for anonymous, viewer, API-token, and super-administrator cases.
- [x] Fixture lifecycle and future database cleanup rules are documented.
- [ ] PostgreSQL-backed cross-tenant fixtures are required before token route
      integration is released.

## Stage 3 token-policy evidence

- [x] Every typed token scope is covered through the production centralized
      policy and a duplicate-free catalog.
- [x] Policy decisions distinguish authentication failures from authorization
      failures without exposing secrets.
- [x] Revoked, expired, unsupported-version, malformed-scope, missing,
      mismatched, blocked, deleted, and disabled owners fail closed.
- [x] Current owner permission and token scope must both authorize the action.
- [x] Workspace/base targets require complete context and explicit allowlist
      membership; empty allowlists are not wildcards.
- [x] All seven shared API-token matrix cases execute through production policy.
- [ ] Production owner-permission lookup, route resource extraction, token
      verification rate limiting, and HTTP denial tests remain release blockers.

## PERM-002 base-permission administration evidence

- [x] Existing Community authentication guards protect every administration
      route; authorization is independently enforced by the centralized
      internal base-permission service.
- [x] Backend tests distinguish anonymous authentication failure from
      authenticated authorization denial and cover authorized success.
- [x] Cross-workspace and cross-base identities fail closed without disclosing
      permission state.
- [x] Administration mutations and their SEC-001 audit events commit
      atomically, and audit summaries exclude secrets and request bodies.
- [x] Optimistic revisions prevent silent lost updates.
- [x] The browser suite mounts the production editor and verifies that
      unauthorized controls remain hidden while a direct mutation is denied.
- [x] The browser suite verifies independent capability disablement removes the
      settings entry without consulting commercial entitlements.
- [x] The browser suite verifies stale writes reload state, warn the
      administrator, and are not automatically retried.
- [x] Playwright is pinned in the GUI workspace and its lockfile change is
      isolated to the existing package version.
- [x] No migration, commercial entitlement file, or commercial permission
      component is changed by the browser-security slice.
- [ ] A reviewer must record formal sign-off in Release evidence before
      PERM-002 is marked Ready.

## PERM-001 V2 record-route enforcement evidence

- [x] Every route in Community `DataTableController` has an explicit typed
      read, create, update, or delete permission mapping.
- [x] The enforcement interceptor is registered only by the independently
      enabled internal module; disabled capability mode performs no identity or
      policy lookup.
- [x] A missing or disabled base configuration bypasses internal identity and
      policy lookup so Community behavior remains unchanged until base opt-in.
- [x] Existing Community guards and method-level ACL remain authoritative, and
      an internal allow cannot grant around a Community denial.
- [x] Tenant facts come from extracted request context rather than URL
      parameters or request bodies.
- [x] Missing authentication returns 401; missing membership, missing tenant
      context, and policy denial return 403.
- [x] HTTP tests cover all four record permission families, authoritative
      tenant context, disabled capability fallback, direct denial, and
      downstream Community denial.
- [x] No commercial permission, feature flag, entitlement, or license
      implementation is imported or modified.
- [ ] V1/alias, MCP, attachment, import/export, background-job, and realtime
      record paths require equivalent enforcement before PERM-001 is Ready.

## PERM-001 V3 record-route enforcement evidence

- [x] Every route in Community `Datav3Controller` has explicit typed permission
      metadata.
- [x] Upsert requires both `records:create` and `records:update`; one denial
      denies the complete operation.
- [x] Compound decisions reuse one fetched configuration and grant set.
- [x] V3 attachment upload requires `records:update` and does not bypass the
      centralized record policy.
- [x] Production metadata tests cover list, read, count, insert, upsert, update,
      delete, nested link/list/unlink, and attachment upload.
- [x] HTTP tests prove compound permission denial stops before controller logic.
- [x] Capability-disabled and base-unconfigured Community fallbacks continue
      through the same interceptor regressions.
- [x] No commercial permission, entitlement, feature-flag, or license
      implementation is imported or modified.
- [ ] File-specific controls remain required for attachment handling.
- [x] V1, old-data, alias, bulk, calendar, relation, and nested record routes
      are covered by the centralized Community ACL adapter.
- [x] Internal API operations and batches derive typed permissions from the
      operation contract before dispatch.
- [x] MCP authentication resolves the actor before policy interception and MCP
      record tools map to read/create/update/delete permissions.
- [x] Import triggers require `base:import`; export enqueue requires
      `base:export` and `records:read`.
- [x] Base-scoped schema, view, member, base-token, and base operations map to
      the corresponding typed permission families.
- [x] Public share sessions remain governed by Community share authorization.
- [x] Community realtime exposes broadcasts but no independent record mutation
      entry point.
- [ ] Raw attachment routes without authoritative record context require the
      signed-delivery design in MODE-002.
- [ ] Job workers should recheck authorization before final delivery so a
      permission revoked after enqueue cannot release an export (SEC-002).
- [ ] A reviewer must record formal sign-off before PERM-001 is marked Ready.

## TOK-003 token administration evidence

- [x] Routes require authentication and server-side `base:manage_tokens`.
- [x] Creation verifies every selected base and cannot expand beyond the
      current workspace through a modified request.
- [x] Listing and revocation are restricted to the current user's tokens and
      the authoritative workspace/base boundary.
- [x] The plaintext secret appears only in the create response and component
      memory; list, revoke, persistence, and audit records exclude it.
- [x] Token mutation and audit append share one metadata transaction.
- [x] Revocation is write-once and immediately changes the token model's
      authentication decision.
- [x] Capability-disabled navigation and unauthorized mutation controls are
      absent, while direct requests still receive denial.
- [x] Browser tests cover copy-once dismissal, tenant-bound creation, direct
      denial, revocation propagation, and capability gating.
- [ ] Reviewer sign-off is required before TOK-003 is marked Ready.
- [ ] Clipboard clearing and endpoint handling remain operator responsibilities.
- [x] TOK-002 production authentication uses strict format/prefix lookup,
      versioned scrypt verification, generic 401 responses, and fresh owner
      lifecycle checks.
- [x] Internal v1 route metadata centrally intersects current owner permission,
      typed scope, and explicit tenant allowlists; missing metadata fails closed.
- [x] Successful internal-token calls update `last_used_at` with a five-minute
      write throttle.
- [x] Failed verification is bounded by client and client-plus-prefix, with
      bounded in-memory state and explicit 429 coverage.
- [ ] Multi-replica deployments require a shared edge/gateway limiter because
      the application limiter is intentionally process-local.
- [ ] PostgreSQL/MySQL migration and repository rehearsal remains required.
