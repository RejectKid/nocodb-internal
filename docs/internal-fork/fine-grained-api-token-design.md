# Fine-grained internal API token design

Status: TOK-001 persistence/issuance and TOK-002 authentication/scope
enforcement implemented for the independent `/api/internal/v1` surface;
security review pending.

## Boundary

This design is independent of NocoDB's existing `ApiToken` model, token table,
paid fine-grained-token migration, strategies, controllers, and entitlements.
It uses the `InternalApiToken` name, `/api/internal/v1` future routes,
`nc_internal_api_tokens`, and internal policy interfaces.

Behavioral and administrative UX should be near-identical to documented and
observable NocoDB token workflows where independently reproducible. Storage,
authorization, API contracts, and code remain separate.

## Token format and creation

The hashing service creates:

```text
nci_<12-character-public-id>_<43-character-random-secret>
```

The `nci_...` prefix is stored and displayed for identification.
`InternalApiTokenIssuanceService` returns the full value once to its caller.
The future create endpoint may project that one-time result but must not provide
any retrieval path. The full value must never be written to logs, telemetry,
audit events, browser storage, job payloads, or database columns.

The skeleton uses Node's cryptographic random generator and versioned scrypt
hashes with a unique 16-byte salt, N=16384, r=8, p=1, and a 32-byte derived key.
Parameters are encoded in the stored hash and strictly allowlisted during
verification to prevent unbounded database-controlled work. A later security
review may raise cost or select Argon2id behind the same interface after
deployment benchmarks.

## Storage model

`nc_internal_api_tokens` contains:

- identity: `id`, `user_id`, `display_name`
- secret verification: `token_hash`, `token_prefix`, `hash_version`
- lifecycle: `created_at`, `created_by`, `expires_at`, `last_used_at`,
  `revoked_at`, `revoked_by`
- boundaries: `allowed_workspace_ids`, `allowed_base_ids`
- permissions: `scopes`, `scope_version`
- non-secret extension data: `metadata`

Allowlists, scopes, and metadata use JSON text in the initial schema for
database portability. `KnexInternalApiTokenRepository` serializes writes and
validates every read against bounded typed schemas. Malformed scope, boundary,
metadata, or timestamp data fails closed. Normalization is preferred later if
query or referential-integrity requirements justify it.

No plaintext token column exists. The migration intentionally does not reuse or
alter upstream token tables.

## Issuance flow

`InternalApiTokenIssuanceService` validates and normalizes identity, display
name, expiry, boundary, scope, and metadata input before generating a secret.
It then:

1. generates an `nci_` token and public prefix;
2. checks the bounded prefix lookup;
3. hashes the complete token with the versioned hashing service;
4. inserts only the hash, prefix, and non-secret token record;
5. retries up to five times if the unique prefix constraint reports a
   collision;
6. returns a public summary without hash material plus the plaintext value.

The repository has no plaintext argument or retrieval method. Token summaries
omit both `token_hash` and the internal hash-version field.

## Hash lookup and verification

Internal v1 authentication now:

1. Parse and validate the `nci_` format with strict length limits.
2. Select a bounded candidate by the unique public prefix.
3. Verify the complete token with the versioned hashing service.
4. Reject revoked or expired tokens.
5. Reload the owning user and reject missing, disabled, or deleted users.
6. Reject unsupported scope versions.
7. Evaluate required typed scope and workspace/base allowlists through the
   centralized internal policy.
8. Update `last_used_at` after successful route authorization, with writes
   bounded to once per five minutes.

All failures use a generic authentication response. Internal logs may reference
the token ID/prefix but never the supplied value.

`InternalTokenVerificationRateLimiter` bounds failed verification by client and
client-plus-prefix. It defaults to 20 failures per minute and a maximum of
10,000 in-memory buckets. Operators may set
`NC_INTERNAL_TOKEN_AUTH_FAILURES_PER_MINUTE`. This protects each process from
repeated scrypt work; multi-replica deployments must also enforce a shared
limit at the reverse proxy, gateway, or WAF.

## Scope model

The internal scope enum and catalog define data, schema, views, members,
documents, tokens, webhooks, and administration capabilities.
`DefaultInternalTokenAuthorizationPolicy` is the only production component that
compares required scope, current owner permission, and tenant boundaries.
Controllers will use future typed decorators and resource adapters; they must
not contain raw scope-string comparisons.

Effective authorization is the intersection of:

- current owning-user access;
- internal base permission policy when enabled;
- token scope;
- workspace allowlist;
- base allowlist;
- resource state.

Missing context or an unknown operation denies.

The policy target is a discriminated instance, workspace, or base context.
Workspace targets require an explicit workspace ID present in the token
allowlist. Base targets require explicit workspace and base IDs present in both
allowlists. Empty allowlists never mean unrestricted access. Instance targets
do not reinterpret empty tenant lists as global tenant access.

Policy lifecycle, owner, failure classification, and evaluation order are
documented in `internal-api-token-authorization.md`.

## Migration and rollback

The internal module owns `InternalMigrationSource` and the migration-history
table `xc_internal_knex_migrations`. Migration
`nc_internal_001_api_tokens` creates the token table and indexes. Its `down`
operation drops only that independent table.

Production rollback must first revoke/export identifiers as required, stop
token-auth traffic, back up the metadata database, and then run the reviewed
down migration. Rolling application code back while issued internal tokens
remain active is not supported.

## Components delivered

- `InternalTokenHashingService`: generate, hash, verify
- `InternalTokenAuthorizationPolicy`: centralized decision contract
- `DefaultInternalTokenAuthorizationPolicy`: default-deny scope, owner, and
  tenant-boundary implementation
- `InternalApiTokenScope`: typed scope enum
- `INTERNAL_API_TOKEN_SCOPE_CATALOG`: complete labels/families for future API
  and UI projection
- `InternalApiToken`: expiration/revocation model and hash-free summary
- `InternalApiTokenRepository`: persistence and lifecycle contract
- `KnexInternalApiTokenRepository`: portable storage codec, prefix lookup,
  listing, and idempotent revocation
- `InternalApiTokenIssuanceService`: validated one-time issuance and bounded
  prefix-collision retry
- `InternalApiTokenAdminService`: base-permission authorization, selected-base
  validation, current-user ownership, and atomic audit mutations
- `InternalApiTokensController`: authenticated internal v1 list/create/revoke
  contract
- isolated base-settings editor: typed scopes, expiration, tenant boundaries,
  copy-once secret handling, lifecycle display, and revocation

TOK-003 delivers the controller and administration UI. TOK-002 adds an
independent guard chain only to internal v1 controllers. It does not replace or
modify NocoDB's Community API-token or OAuth strategies.

## Required next tests

- PostgreSQL and MySQL migration up/down in CI
- malformed token and malformed stored-hash fuzz tests
- PostgreSQL and MySQL repository/migration rehearsal
- log, error, audit, telemetry, and browser-storage redaction
- multi-process/shared rate limiting
- concurrency stress coverage for `last_used_at`
