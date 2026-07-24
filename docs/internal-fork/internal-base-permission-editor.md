# Internal base-permission editor

Status: Frontend implemented; browser security regression pending

## Location and boundary

The editor appears under General base settings only when the independent
`basePermissions` capability is enabled. Its implementation lives under
`components/internalExtensions/basePermissions` and does not import, render, or
activate the gated table/field-permissions interface.

The only upstream UI hook adds the capability-gated menu item and mounts the
isolated editor. Disabling the internal capability removes that entry without
changing Community settings behavior.

## Administrator workflow

1. Enable internal permission enforcement for the base.
2. Select an existing base role or a direct base member.
3. Review each permission's effective value and source.
4. Choose allow, deny, or unset.
5. Save the subject's complete assignment set.

Direct user assignments are displayed separately from inherited role
assignments. For explanation only, the client applies the documented owner
emergency access, direct-over-role, and deny-over-allow rules to show the
selected subject's effective source. The server independently resolves and
enforces all decisions.

## Concurrency and failures

Every configuration write echoes `updated_at`. Every subject write echoes its
grant-set revision, or the server-provided empty revision for a new subject. If
another administrator saves first, HTTP 409 causes an automatic reload and a
visible review warning. The editor never automatically retries a mutation.

HTTP 403 renders a no-access state and no mutation controls. Other load errors
render a generic failure state. API error details pass through the existing
safe frontend error extractor.

## Testing

The frontend contract suite verifies:

- isolated and URL-encoded API paths;
- configuration revision echoing;
- subject revision echoing;
- deterministic catalog ordering;
- direct versus inherited effective-source explanation;
- permission-gated mutation state;
- 409 detection.

A browser-level test covering a direct API denial despite hidden controls is
still required before moving PERM-002 to Security Review.
