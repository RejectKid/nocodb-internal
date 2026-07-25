# Stage 10 V3 record-permission enforcement report

## Delivered

- Full typed permission metadata for Community `Datav3Controller`.
- Compound internal permission requirements.
- One-read-set compound policy evaluation.
- Conjunctive create-and-update authorization for V3 upsert.
- V3 production-controller metadata tests.
- HTTP denial coverage for compound operations.

## Permission mapping

| V3 operations                                 | Internal permission                   |
| --------------------------------------------- | ------------------------------------- |
| List, read, count, nested list                | `records:read`                        |
| Insert                                        | `records:create`                      |
| Upsert                                        | `records:create` and `records:update` |
| Update, nested link/unlink, attachment upload | `records:update`                      |
| Delete                                        | `records:delete`                      |

Every required permission must allow. Upsert is intentionally conjunctive
because one payload can contain both inserts and updates, and authorization
must not depend on predicting database outcomes from client input.

## Security boundary

The V3 controller uses the same independently registered interceptor as V2.
Instance capability disablement and base-level non-opt-in preserve Community
behavior. For opted-in bases, identity and tenant context remain authoritative,
internal denial stops before controller logic, and downstream Community ACL can
still deny an internal allow.

Base64 attachment upload now requires `records:update`. This does not complete
future file-security work: type, size, content, storage, direct delivery, and
preview authorization still require their dedicated controls.

## Validation

The focused V2/V3 enforcement suites pass 37 tests. Coverage includes the
complete V2 and V3 production metadata matrices, compound allow/deny behavior,
authoritative tenant context, base opt-in fallback, 401 versus 403, and
downstream Community denial.

The complete isolated internal-extension suite also passes: 28 suites and 159
tests.

The complete internal-extension suite and repository-wide TypeScript check are
recorded in the pull-request validation summary.

## Remaining work

V1/alias record routes are the next direct-API family. MCP, imports/exports,
other attachment paths, jobs, and realtime operations remain separate,
reviewable enforcement slices.
