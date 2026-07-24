# Internal authorization test harness

Status: Implemented; Stage 1 security review.

## Purpose

The harness makes authentication and authorization denial cases reusable across
independently implemented internal features. It is test infrastructure, not a
production authorization policy.

Production features must continue to enforce access through server-side guards
and centralized policy services. Frontend visibility is only a presentation
decision.

## Components

The harness lives under:

`packages/nocodb/src/modules/internal-extensions/testing/authorization`

It provides:

- typed matrix documents, cases, expectations, and execution results;
- deterministic active, unauthorized, blocked, deleted, disabled, and
  API-token identities;
- deterministic token model fixtures with expiration, revocation, typed
  scopes, and workspace/base allowlists;
- a machine-readable JSON regression matrix;
- a matrix loader that rejects unsupported schemas and duplicate IDs;
- a framework-neutral runner that distinguishes `401` authentication failures,
  `403` authorization failures, and successful `2xx` results;
- case selection for smaller feature-specific suites;
- a Stage 3 executor that maps shared token cases into the production
  `DefaultInternalTokenAuthorizationPolicy`;
- an HTTP test against the unchanged Community cache-delete controller route.

No fixture contains or returns a plaintext token value.

## Required usage for new features

Each security-sensitive feature should create an executor that performs a real
HTTP request against its controller or calls the same centralized policy used
by that controller:

```ts
import {
  loadAuthorizationRegressionMatrix,
  runAuthorizationMatrix,
  selectAuthorizationCases,
} from "../testing/authorization";

const matrix = selectAuthorizationCases(loadAuthorizationRegressionMatrix(), [
  "anonymous-denied",
  "authenticated-unauthorized-denied",
  "authorized-user-succeeds",
  "frontend-hidden-direct-api-denied",
]);

await runAuthorizationMatrix(matrix, async (testCase) => {
  const response = await callFeatureRoute(testCase);
  return { status: response.status };
});
```

Token-enabled routes must additionally execute the scope, expiration,
revocation, cross-base, cross-workspace, and disabled-owner cases.

Do not use the reference executor as evidence that a production route is
secure. It exists only to self-test the matrix and runner.

`internal-token-policy.matrix.executor.ts` is valid evidence for the centralized
policy itself because it invokes the production policy implementation. It is
not route evidence; token-enabled controllers must still supply an executor
that makes direct HTTP requests.

## Shared case catalog

The version 1 matrix covers:

- anonymous denial;
- authenticated unauthorized denial;
- authorized success;
- direct API denial for frontend-hidden actions;
- token scope allow and deny;
- expired and revoked tokens;
- cross-base and cross-workspace denial;
- blocked, deleted, and disabled users;
- disabled token owners.

Features may add resource-specific cases without changing shared IDs. Breaking
schema changes require a new `schemaVersion`.

## Community endpoint regression

`community-cache-authorization.Integration.spec.ts` imports the unchanged
Community `CachesController` and executes its `DELETE /api/v2/meta/cache`
route. A lightweight test adapter reads the endpoint's declared `@Acl`
metadata, avoiding the unrelated full application dependency graph while
preserving the route contract:

- anonymous: `401`;
- authenticated org viewer: `403`;
- API token: `403`;
- super administrator: `200`.

The controller and Community ACL implementation are not modified. This focused
test complements rather than replaces the repository's full application and
E2E suites.

## Fixture lifecycle and cleanup

The current fixtures are immutable in-memory objects and isolated Nest test
applications. Suites must close Nest applications in `afterAll` and reset
spies/mocks when they add mutable behavior.

Future database-backed fixtures must:

1. use a unique workspace and base per suite;
2. track every created user, membership, token, and resource;
3. revoke tokens before deleting owners;
4. delete child resources before bases and workspaces;
5. run cleanup in `finally`/`afterAll`, including after assertion failures;
6. never log or persist plaintext token values;
7. fail the suite when cleanup leaves cross-tenant resources behind.

## Command

From `packages/nocodb`:

```text
npx -y pnpm@10.28.0 exec jest --config jest.internal-extensions.config.js --runInBand
```

The runner includes all internal-extension suites, including the shared matrix
and Community endpoint regression.
