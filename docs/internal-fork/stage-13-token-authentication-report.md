# Stage 13 internal token authentication report

## Outcome

TOK-002 advances from Backend to Security Review. Independently issued `nci_`
tokens can now authenticate to explicitly decorated `/api/internal/v1`
routes. NocoDB's Community token, OAuth, license, entitlement, and commercial
feature implementations are unchanged.

## Request flow

1. The existing Community global guard retains its current behavior.
2. The internal authentication guard ignores every credential that does not
   begin with `nci_`.
3. Internal candidates pass a strict fixed-length parser, bounded public-prefix
   lookup, scrypt verification, and fresh owner-state lookup.
4. The internal authenticated guard rejects missing or ineligible identities.
5. The scope guard requires typed route metadata and intersects:
   current owner permission, token scope, workspace allowlist, and base
   allowlist.
6. Successful requests update `last_used_at` no more often than once per five
   minutes.

## Routes enabled

| Route family | Read scope | Mutation scope | Target |
| --- | --- | --- | --- |
| Capabilities | `admin:read` | Not applicable | Instance |
| Token administration | `tokens:read` | `tokens:write` | Base |
| Base-permission administration | `admin:read` | `admin:write` | Base |

Session users continue through the existing authorization path. An internal
token presented to an internal route without scope metadata is denied.

## Abuse controls

Failed verification is counted per client and per client-plus-public-prefix.
The default threshold is 20 failures per minute. Bucket state is bounded to
10,000 entries and expired each minute. The threshold can be configured with
`NC_INTERNAL_TOKEN_AUTH_FAILURES_PER_MINUTE`.

This limiter is deliberately independent and process-local. It bounds scrypt
work in a single process but is not a substitute for a shared reverse-proxy,
gateway, or WAF limit in multi-replica deployments.

## Validation

- Internal extension Jest suite: 39 suites and 221 tests passed.
- Direct HTTP tests cover `xc-token`, Bearer, missing/malformed credentials,
  disabled owner, scope denial, current-owner permission denial, cross-base
  denial, last-use updates, and 429 throttling.
- Targeted Prettier check and `git diff --check`: passed.
- Backend `tsc --noEmit` reports only existing SDK, `oracledb`, model, and event
  typing failures outside `internal-extensions`.
- Targeted ESLint is blocked before file analysis by the repository's existing
  ESLint/Ajv `defaultMeta` crash.

## Residual risks

- Shared/distributed rate limiting is an operator responsibility.
- PostgreSQL and MySQL migration/repository rehearsal remains.
- Future internal route families must add explicit typed scope metadata and
  direct allow/deny tests before becoming token-callable.
- JavaScript strings cannot be zeroized; plaintext is kept only in the incoming
  request and the bounded verification call and is never logged or persisted.
