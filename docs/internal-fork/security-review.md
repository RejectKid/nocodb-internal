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
