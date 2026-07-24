# Stage 2 TOK-001 completion report

Date: 2026-07-23

Branch: `feature/fine-grained-api-token-model`

## Outcome

TOK-001 is implemented and ready for security review. The independent token
table now has a production repository and one-time issuance service. No HTTP
route or authentication strategy accepts these tokens yet.

## Delivered

- Knex-backed repository over `nc_internal_api_tokens`.
- Strict JSON and timestamp decoding that fails closed on malformed storage.
- Typed prefix-collision error across SQLite, PostgreSQL, and MySQL error codes.
- One-time issuance with secure generation, versioned scrypt hashing, bounded
  collision retries, and hash-free public summaries.
- Input normalization for owners, creators, names, expiry, tenant boundaries,
  scopes, and metadata.
- Idempotent repository revocation that preserves the original revoker and
  timestamp.
- Nest provider registration isolated inside `InternalExtensionsModule`.

## Security properties

- No plaintext token column, repository field, list result, or model summary
  exists.
- The full secret is returned only from the in-memory issuance result.
- Prefix lookup is bounded by a unique database constraint.
- Expired issuance requests and unknown scope values are rejected before any
  insert.
- Storage corruption in scopes, boundaries, metadata, or timestamps is denied
  instead of coerced.
- Revocation is immutable after its first successful write.

## Tests added

- SQLite repository round-trip for arrays, scopes, metadata, and timestamps.
- Prefix lookup and per-user listing.
- Immediate, idempotent revocation.
- Duplicate-prefix error mapping.
- Malformed stored-scope denial.
- One-time issuance and database plaintext non-disclosure.
- Hash verification of the issued secret.
- Prefix-collision retry.
- Expired issuance and unsupported-scope denial before persistence.
- Hash-free public summary.
- Expanded migration column and non-null checks.

## Acceptance review

| TOK-001 criterion               | Evidence                                                                  |
| ------------------------------- | ------------------------------------------------------------------------- |
| Migration exists and rolls back | `nc_internal_001_api_tokens` SQLite up/down test                          |
| Only a secure hash is stored    | Issuance integration reads the raw row and verifies no plaintext          |
| Prefix identifies tokens        | Unique prefix migration plus repository lookup                            |
| Secret is displayed only once   | Issuance result includes value; repository and summary cannot retrieve it |
| Expiration is enforced          | Issuance rejects past expiry; entity denies at the exact boundary         |
| Revocation is enforced          | Entity denial plus idempotent persisted revocation                        |
| Prefix collision is safe        | Bounded retry and unique-conflict mapping                                 |
| Portable JSON is validated      | Zod-backed repository codec fails closed                                  |

## Validation

| Check                               | Result                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Prettier over changed source/docs   | Passed                                                                                         |
| Internal backend Jest               | Passed: 13 suites, 39 tests                                                                    |
| Existing frontend capability Vitest | Passed: 1 file, 2 tests                                                                        |
| SQLite migration up/down            | Passed inside the internal Jest suite                                                          |
| Backend TypeScript                  | Repository failed with 70 existing diagnostics; zero referenced `internal-extensions`          |
| Backend production Rspack           | Repository failed with 73 existing errors and 1 warning; zero referenced `internal-extensions` |
| Targeted ESLint                     | Failed before file analysis in the existing ESLint/AJV initialization path                     |

The installed repository binaries were used after the machine-wide pnpm
workspace resolver failed to locate the checked-out `nocodb-sdk` workspace.
PostgreSQL and MySQL migration execution remain required before route
authentication is released.

## Explicit non-goals

- No token controller or route.
- No integration with global authentication.
- No use of existing NocoDB API-token tables or services.
- No modification of paid fine-grained-token code, commercial entitlements, or
  license enforcement.

## Next stage

Proceed to TOK-002 only with the centralized authorization boundary from ADR
0003:

1. implement default-deny typed scope evaluation;
2. intersect token scopes with workspace/base allowlists;
3. reject unsupported scope versions, missing tenant context, expired/revoked
   tokens, and disabled/deleted owners;
4. execute the shared FND-003 authorization matrix against the production
   policy;
5. defer HTTP route authentication until PostgreSQL coverage and rate limiting
   are in place.
