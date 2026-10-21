# Sidebar documents and independent cell coloring

## Deployment

Rebuild the application image; these are source changes, not settings that can
be applied to an older image. Set `NC_INTERNAL_EXTENSIONS_ENABLED=true`,
`NC_INTERNAL_DOCUMENT_PERMISSIONS_ENABLED=true`, and
`NC_INTERNAL_CELL_COLORING_ENABLED=true`. The handoff Compose template enables
all three. Existing deployments must add the new coloring flag before recreating
the app container. No database migration is required.

## Try it

1. Sign in and open a workspace. The left sidebar has a **Documents** section,
   grouped by accessible base. Use **New / import**, create a document, return
   to the workspace and refresh the section. Click its title: the exact document
   opens, retaining workspace navigation. Refresh the browser on that URL too.
2. Sign in as a different user with Community base access but no document
   discovery/read grant. The document must not appear. Direct document APIs
   still enforce the existing independent document permissions. After changing
   grants, refocus the window or use the sidebar refresh control.
3. Open an authenticated grid view. Click **Cell coloring**, **Add rule**, pick
   a field, condition, comparison and color. Choose **Cell** or **Entire row**.
   Save. Matching cells change color without altering record data. Reload the
   page and verify the rule persists. Remove all rules and save to clear colors.
4. Test equals, notEquals, contains (case-insensitive), empty, notEmpty,
   greaterThan and lessThan. First matching rule wins; rearrange by removing
   and re-adding rules. Numeric comparisons reject empty/non-numeric values.
5. A viewer must not be able to update view metadata through a direct API
   request. An editor must not change a locked view or another user's personal
   view. Owner/creator behavior remains the existing Community policy.
6. The **Try NocoDB Cloud** sidebar promotion is removed. Other branding,
   copyright notices and entitlement logic are unchanged.

## Boundary and limitations

Coloring is independently implemented under `internalCellColorsV1` in the
existing Community view metadata, saved through the normal `viewUpdate` API.
That API's authentication, base authorization, lock/ownership checks, and
schema-lock behavior remain authoritative. Other view metadata is preserved.
Disabling the internal capability hides the editor and stops rendering its
colors; stored rules remain available if it is enabled again.

This initial implementation supports scalar fields in authenticated canvas
grid views. Public/shared grids and gallery/kanban/list coloring are not part
of this slice. Rules use column IDs, survive field renames and ignore deleted
or missing fields. Complex object/attachment/link comparisons are not coerced.
Only six-digit hexadecimal colors are rendered; at most 100 rules are read.
No commercial coloring implementation, format, module or entitlement is used.

Document summaries come from the server's permission-filtered list endpoints;
they are never synthesized from unrestricted metadata. Sidebar requests are
invalidated on workspace/navigation changes and inaccessible bases are omitted.
