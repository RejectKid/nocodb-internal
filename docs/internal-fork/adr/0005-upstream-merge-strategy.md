# ADR 0005: Upstream merge strategy

## Status

Accepted

## Context

The derivative must receive upstream NocoDB fixes while preserving a strict
commercial-code boundary and minimizing recurring conflicts.

## Decision

Keep `upstream` as `nocodb/nocodb` and private `origin` as the internal
repository. Prefer additive files, isolated routes/stores/localization, new
tables, dependency injection, and small registration hooks. Maintain a
custom-code manifest and protected-file list. Integrate upstream on a temporary
branch, review sensitive diffs, run migrations and the authorization matrix,
then advance the internal release branch.

## Alternatives considered

- Long-lived unmerged fork: rejected due to security and maintenance risk.
- Large periodic code drops: rejected because they hide conflicts.
- Patch existing commercial modules: prohibited.

## Consequences

Changes are split into small vertical-slice commits. Some upstream refactors may
require adapter updates. Generated and unrelated files are left untouched.

## Security implications

Every merge explicitly audits auth, authorization, license/entitlement, tenant
context, migrations, files, and realtime changes. Conflict resolution in these
areas requires human review and denial-path tests.

## Upgrade implications

The manifest records expected risk and touched upstream files. An upstream
upgrade is incomplete until targeted and broad validation results are recorded.
