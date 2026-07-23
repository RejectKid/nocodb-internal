# ADR 0004: Fine-grained token storage

## Status

Accepted for skeleton; authentication integration pending security review

## Context

Internal tokens require one-time display, secure verification, revocation,
expiration, scope versioning, and tenant allowlists. Existing NocoDB API-token
storage and gated fine-grained-token code are out of scope.

## Decision

Store tokens in `nc_internal_api_tokens` with a random public prefix and a
versioned secure hash of the full secret. Never store plaintext after creation.
Use a hashing-service interface so the selected implementation and cost can be
upgraded. Store workspace/base allowlists and scopes as versioned JSON in the
initial skeleton; normalize only if query or integrity evidence requires it.
Revocation and expiry are evaluated before scope policy.

## Alternatives considered

- Reuse `nc_api_tokens`: rejected because it mixes contracts and legacy
  semantics.
- Encrypt recoverable plaintext: rejected because retrieval is not required.
- Store a fast unsalted digest: rejected due to offline guessing risk if the
  database leaks.
- Copy the gated migration/model: prohibited.

## Consequences

Creation must return the secret exactly once. Lookup first uses a bounded prefix
candidate set, then secure hash verification. Hash upgrades can occur after a
successful verification.

## Security implications

Secrets require cryptographic randomness, constant-time library verification,
rate limiting, log redaction, and immediate revocation. Prefixes are identifiers
and are not secrets. Metadata must never contain token material.

## Upgrade implications

Hash and scope versions are explicit. Schema changes use the independent
internal migration history and must preserve verification of older versions
during a documented transition.
