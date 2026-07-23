# Internal feature registry

The registry is independent of NocoDB licenses, entitlements, plans, and paid
feature flags. It is disabled by default.

## Configuration

Enable the module boundary:

```text
NC_INTERNAL_EXTENSIONS_ENABLED=true
```

Enable individual capabilities:

```text
NC_INTERNAL_ADMIN_ENABLED=true
NC_INTERNAL_FINE_GRAINED_API_TOKENS_ENABLED=true
NC_INTERNAL_BASE_PERMISSIONS_ENABLED=true
NC_INTERNAL_INPUT_VALIDATION_ENABLED=true
NC_INTERNAL_DOCUMENT_PERMISSIONS_ENABLED=true
NC_INTERNAL_FILE_PREVIEW_MODE_ENABLED=true
NC_INTERNAL_DISCUSSION_MODE_ENABLED=true
```

Accepted true values are `true`, `1`, `yes`, and `on`, case-insensitively.
Missing, false, or unrecognized values disable the capability. Individual
values have no effect unless the module boundary is enabled. The HTTP module is
not registered in worker containers.

## Endpoint

`GET /api/internal/v1/capabilities`

The route requires an authenticated active user. Anonymous, guest, blocked, and
deleted identities receive an authentication failure. The response contains no
configuration values:

```json
{
  "schemaVersion": 1,
  "features": {
    "internalAdmin": false,
    "fineGrainedApiTokens": false,
    "basePermissions": false,
    "inputValidation": false,
    "documentPermissions": false,
    "filePreviewMode": false,
    "discussionMode": false
  }
}
```

The frontend view is `/internal/settings/capabilities`. Nuxt's global
authentication middleware protects the page; the backend remains authoritative.

## Disabled behavior

When `NC_INTERNAL_EXTENSIONS_ENABLED` is not true, the Nest module, custom
routes, and internal migrations are not registered. Normal Community startup
continues.
