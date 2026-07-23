# Fine-grained internal API token design

Status: Design and storage skeleton; not yet exposed or accepted for route
authentication.

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

The `nci_...` prefix is stored and displayed for identification. The full value
is returned exactly once by a future create endpoint. It must never be written
to logs, telemetry, audit events, browser storage, job payloads, or database
columns.

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
database portability and a small skeleton. Repository code must parse and
validate them against typed schemas. Normalization is preferred later if query
or referential-integrity requirements justify it.

No plaintext token column exists. The migration intentionally does not reuse or
alter upstream token tables.

## Hash lookup and verification

Future authentication will:

1. Parse and validate the `nci_` format with strict length limits.
2. Select a bounded candidate by the unique public prefix.
3. Verify the complete token with the versioned hashing service.
4. Reject revoked or expired tokens.
5. Reload the owning user and reject missing, disabled, or deleted users.
6. Reject unsupported scope versions.
7. Evaluate required typed scope and workspace/base allowlists through the
   centralized internal policy.
8. Update `last_used_at` asynchronously with bounded write frequency.

All failures use a generic authentication response. Internal logs may reference
the token ID/prefix but never the supplied value.

## Scope model

The skeleton defines typed scope values for data, schema, views, members,
documents, tokens, webhooks, and administration. Controllers will use typed
decorators or policy requests. They must not contain raw scope-string
comparisons.

Effective authorization is the intersection of:

- current owning-user access;
- internal base permission policy when enabled;
- token scope;
- workspace allowlist;
- base allowlist;
- resource state.

Missing context or an unknown operation denies.

## Migration and rollback

The internal module owns `InternalMigrationSource` and the migration-history
table `xc_internal_knex_migrations`. Migration
`nc_internal_001_api_tokens` creates the token table and indexes. Its `down`
operation drops only that independent table.

Production rollback must first revoke/export identifiers as required, stop
token-auth traffic, back up the metadata database, and then run the reviewed
down migration. Rolling application code back while issued internal tokens
remain active is not supported.

## Interfaces delivered

- `InternalTokenHashingService`: generate, hash, verify
- `InternalTokenAuthorizationPolicy`: centralized decision contract
- `InternalApiTokenScope`: typed scope enum
- `InternalApiToken`: expiration/revocation model

No controller, create/list/revoke API, frontend administration UI, or global
authentication strategy is delivered in this skeleton.

## Required next tests

- PostgreSQL and MySQL migration up/down in CI
- one-time create response and database non-disclosure
- prefix collision retry
- verification rate limiting
- malformed token and malformed stored-hash fuzz tests
- current-user disabled/deleted denial
- immediate revocation and expiration boundary
- scope/boundary allow-deny route matrix
- log, error, audit, telemetry, and browser-storage redaction
- concurrent `last_used_at` throttling
