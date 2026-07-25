# Internal API token administration

Status: Security Review (TOK-003)

## Access and boundary

The independent token editor is available in General base settings only when
the `fineGrainedApiTokens` internal capability is enabled. Its API is isolated
under:

`/api/internal/v1/workspaces/:workspaceId/bases/:baseId/tokens`

Every request is authenticated. The backend resolves current Community
membership and the independent base policy, then requires
`base:manage_tokens`. Frontend visibility is not authorization.

The base-settings editor fixes the token to the current workspace. It can
select multiple bases in that workspace, but creation succeeds only if the
current base is included and the actor has `base:manage_tokens` for every
selected base. This prevents a client-modified request from expanding token
reach.

The initial administration surface manages only tokens owned by the current
user. Cross-user revocation belongs to ADM-002.

## Create and copy once

Administrators select:

- display name;
- optional expiration;
- allowed workspace (the current workspace in this view);
- one or more allowed bases;
- typed scopes from the independent scope catalog.

The complete secret is returned only by the create response. The editor stores
it only in component memory and clears it when dismissed or unmounted. List and
revoke responses contain the public prefix, never the plaintext or hash.

Copying uses the browser clipboard and warns the administrator to move the
secret into an approved secret manager. Clipboard contents cannot be recalled
or remotely cleared reliably; operators should follow organizational
clipboard and endpoint-security policy.

## Listing and revocation

The list shows name, public prefix, scopes, lifecycle state, expiration, and
last-use information. `Never` is displayed until the token completes its first
authorized internal API request.

Revocation writes `revoked_at` and `revoked_by` once. The token model rejects
authentication immediately after revocation or expiration. Repeated revocation
returns a conflict instead of replacing the original revoker.

## Calling internal APIs

Internal tokens are accepted only on explicitly scoped `/api/internal/v1`
routes. Send the one-time value through either:

```text
xc-token: nci_...
Authorization: Bearer nci_...
```

The server requires the owning user to remain active and authorized, then
intersects the route's typed scope and workspace/base boundary. A valid secret
therefore does not preserve access after the owner's permission is removed.

Repeated failed verification returns HTTP 429. The per-process threshold is
configured with `NC_INTERNAL_TOKEN_AUTH_FAILURES_PER_MINUTE`; multi-replica
deployments must also configure a shared edge/gateway limit.

## Audit and transaction safety

Creation and revocation append `token.created` and `token.revoked` events.
The token mutation and audit append share one metadata transaction.

Audit summaries contain only:

- token ID and display name;
- public prefix;
- expiration and revocation timestamps;
- workspace/base boundaries;
- scopes.

Plaintext secrets and token hashes are never included.

## Incident response

If a token may be exposed:

1. Revoke it from the base-settings token page.
2. Confirm the token shows `revoked`.
3. Review recent security events when ADM-002 is available.
4. Replace the secret in consuming systems with a newly scoped token.
5. Narrow scopes and base boundaries during replacement.

Do not attempt to recover or reuse the old secret.
