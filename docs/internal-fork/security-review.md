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
