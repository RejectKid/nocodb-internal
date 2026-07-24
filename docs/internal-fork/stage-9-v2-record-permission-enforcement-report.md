# Stage 9 V2 record-permission enforcement report

## Delivered

- An inert typed route decorator under the internal-extension boundary.
- A global interceptor registered only with the independent internal module.
- Full permission mapping for Community `DataTableController`.
- Authoritative membership resolution using existing Community membership
  facts.
- HTTP authorization tests and exact production-controller metadata tests.

## Request flow

1. Existing Community authentication guards populate the request identity.
2. Existing extraction middleware supplies authoritative workspace and base
   context from the model.
3. The internal interceptor reads typed route metadata.
4. If the independent capability is disabled, it immediately continues.
5. If the base has no enabled internal configuration, it immediately continues
   without requiring an internal identity.
6. Otherwise it resolves current base membership and the centralized internal
   policy decision.
7. Denials stop before controller logic.
8. Allows continue to the existing method-level Community ACL, which can still
   deny the request.

This ordering means the internal policy only narrows Community access. It does
not replace or grant around upstream authorization.

## Permission mapping

| Operations                                           | Internal permission |
| ---------------------------------------------------- | ------------------- |
| List, read, count, aggregate, bulk list, nested list | `records:read`      |
| Insert                                               | `records:create`    |
| Update, move, nested link/unlink, nested copy/paste  | `records:update`    |
| Delete                                               | `records:delete`    |

## Validation

The focused Jest integration suite exercises 24 cases. It covers all four
permission families, all production controller mappings, independent
capability disablement, per-base opt-in fallback, authentication versus
authorization errors, authoritative tenant context, missing membership,
missing context, and a downstream Community ACL denial.

The complete isolated internal-extension suite also passes: 27 suites and 146
tests.

The repository-wide TypeScript command was also run. It remains blocked by
pre-existing SDK drift, missing optional Oracle types, and unrelated model and
event typing failures; no reported error referenced a file changed by this
slice.

## Remaining work

This slice intentionally covers only Community V2 `DataTableController`.
Equivalent enforcement remains required for V1/alias routes, V3 routes, MCP,
attachments, imports/exports, jobs, and realtime operations. Those families
should be delivered independently so their resource extraction and denial
matrices remain reviewable.
