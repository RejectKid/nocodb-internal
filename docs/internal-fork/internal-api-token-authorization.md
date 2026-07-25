# Internal API token authorization

Status: TOK-002 centralized policy and internal v1 HTTP integration
implemented; security review pending.

## Boundary

`DefaultInternalTokenAuthorizationPolicy` is independent of existing NocoDB
API-token strategies, paid fine-grained-token authorization, entitlements, and
license state. It accepts explicit facts and returns a typed decision. It does
not load users, infer resources from URLs, or authenticate HTTP requests.

## Scope catalog

Scope version 1 contains:

| Family         | Read scopes      | Mutation scopes                                   |
| -------------- | ---------------- | ------------------------------------------------- |
| Data           | `data:read`      | `data:create`, `data:update`, `data:delete`       |
| Schema         | `schema:read`    | `schema:create`, `schema:update`, `schema:delete` |
| Views          | `views:read`     | `views:write`                                     |
| Members        | `members:read`   | `members:write`                                   |
| Documents      | `documents:read` | `documents:write`                                 |
| Tokens         | `tokens:read`    | `tokens:write`                                    |
| Webhooks       | `webhooks:read`  | `webhooks:write`                                  |
| Administration | `admin:read`     | `admin:write`                                     |

`INTERNAL_API_TOKEN_SCOPE_CATALOG` is the canonical label/family projection for
future internal APIs and UI. Unknown stored or required scopes deny.

## Required policy facts

Every decision supplies:

- the persisted internal token entity;
- current owner identity, lifecycle state, and effective permissions;
- one typed required token scope;
- one required current-owner permission;
- current time;
- an explicit target of `instance`, `workspace`, or `base`.

The future owner adapter must reload current state. Creation-time roles or
permissions must not be cached into the policy request.

## Evaluation order

The policy evaluates:

1. revocation;
2. expiration;
3. supported scope version;
4. validity of the stored and required scope set;
5. owner existence and token-owner identity match;
6. blocked, deleted, or disabled owner state;
7. current owner permission;
8. required token scope;
9. required workspace context and allowlist;
10. required base context and allowlist.

The first denial is returned. Lifecycle, version, stored-scope, and owner
eligibility failures are classified as authentication failures. Missing current
permission, required scope, resource context, or tenant membership are
authorization failures.

## Target semantics

- `instance` does not require tenant context.
- `workspace` requires a non-empty workspace ID in
  `allowed_workspace_ids`.
- `base` requires both a workspace match and a base ID in
  `allowed_base_ids`.
- Empty allowlists deny tenant access and are never wildcards.
- Missing workspace/base context denies instead of inferring from request
  defaults.

## Test evidence

- All 20 typed scopes pass through the policy only when owner permission, scope,
  lifecycle, and target facts intersect.
- Owner and context denial reasons have focused unit coverage.
- All seven token cases in the shared FND-003 matrix execute through the
  production policy, including lifecycle, scope, cross-tenant, and disabled
  owner cases.

## HTTP integration

The independent guard chain runs after the existing Community global guard and
before `InternalAuthenticatedGuard` on `/api/internal/v1` controllers:

1. Non-`nci_` credentials retain existing session, Community token, and OAuth
   behavior.
2. `nci_` credentials are strictly parsed, prefix-looked-up, scrypt-verified,
   and checked against a freshly loaded owner.
3. A typed decorator supplies scope, target kind, and current-owner
   permission. Internal-token requests to an undecorated route fail closed.
4. The scope guard extracts explicit tenant parameters and calls the central
   policy. It returns generic 401 for authentication failures and 403 for
   authorization failures.
5. A successful call records bounded `last_used_at`.

The attached internal routes are capabilities (`admin:read`), token
administration (`tokens:read`/`tokens:write`), and base-permission
administration (`admin:read`/`admin:write`).

Remaining release work is PostgreSQL/MySQL migration rehearsal, shared
multi-replica throttling, and reviewer sign-off.
