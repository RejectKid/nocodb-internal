# Internal security audit events

Status: Backend foundation implemented (SEC-001)

## Boundary

The internal audit ledger is independently implemented under
`modules/internal-extensions/audit` and stored in
`nc_internal_audit_events`. It does not reuse or modify NocoDB commercial audit
features, entitlement checks, or existing audit tables.

Application code has append and bounded read operations only. No update or
general delete method is exposed. Reads require an explicit workspace boundary;
base filters are applied inside that workspace.

## Event catalog

The typed catalog contains:

- `token.created` and `token.revoked`
- `base.permission.changed`
- `user.disabled` and `user.enabled`
- `membership.invited`, `membership.changed`, and `membership.removed`
- `admin.configuration.changed`
- `document.permission.changed`
- `document.revision.restored`
- `validation.rule.changed`

Each event records its actor, action, resource type and ID, workspace/base
context, timestamp, request ID, IP address and user agent when available, plus
safe before/after summaries.

## Secret handling

Before/after summaries and metadata pass through recursive redaction. Keys
associated with passwords, tokens, authorization, cookies, credentials, API
keys, private keys, hashes, salts, and secrets are replaced with
`[REDACTED]`. Full internal token values, bearer credentials, and scrypt hashes
are also redacted based on value shape even when stored under an unexpected
key.

`token_id` and `token_prefix` are safe identifiers and may be retained. Event
callers must not supply request bodies wholesale.

## Atomicity

`InternalAuditService.execute` runs the domain mutation and audit append in one
metadata-database transaction. If the mutation fails, no audit event is
written. If the audit append fails, the domain mutation is rolled back.

Mutation services must use this helper or provide equivalent transaction
coordination. Emitting an event after an already-committed mutation is not an
approved integration pattern.

## Retention and privacy

The foundation does not automatically purge events. Until an organization
selects a retention policy, events are retained with the metadata database and
covered by its backup policy. Before production use, operators must document:

- retention duration and legal requirements;
- who can read IP addresses and user agents;
- backup and restore retention;
- approved maintenance procedure for retention deletion;
- SIEM export requirements, if any.

The future retention job must be separately authorized, operate in bounded
batches, and record aggregate deletion evidence without copying deleted event
contents.

## Integration checklist

Every mutation integration must test successful emission, secret redaction,
actor/resource/tenant context, failed-mutation behavior, failed-audit rollback,
and unauthorized/cross-tenant read denial. Read APIs are deferred until their
permission and pagination contract is reviewed.
