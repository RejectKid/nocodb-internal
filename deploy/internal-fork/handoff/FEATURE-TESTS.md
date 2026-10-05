# Trial acceptance examples

Use disposable test data. Never run denial/deactivation experiments against a
production owner account. This checks specific independent features, NOT every
NocoDB Business feature. Record actual results instead of assuming parity.

## 1. Confirm the new build and admin area

1. Start this bundle and create the first administrator account.
2. Create a base named `Team trial` and a table with a text field and attachment.
3. Avatar menu -> Internal capabilities: Teams, Admin and Documents are enabled.
4. Avatar menu -> Internal admin (or `/internal/admin`): overview and user list
   load. Inspect the test user's memberships. No configuration secrets should
   be shown. Community configuration links still use Community authorization.
5. If the admin page is absent, check the image tag before changing permissions.

## 2. Create/import documents in the UI

1. Use the base's create menu -> Internal documents, or open
   `/internal/documents` and select Team trial.
2. Click New document, edit its title/content, save, reload, and reopen it.
3. Import `example-document.md` supplied here. Its text should be editable.
4. Export JSON while signed in, then import that downloaded JSON as a copy.
5. Export PDF and inspect the downloaded output. Read alone does not imply
   export permission for ordinary members.
6. Add a comment, resolve it, and inspect History after a saved change.

Expected: persistence survives reload; import does not transfer privileged
ownership/permission fields. PDF/Office originals belong in Attachment fields;
this is not a Word/PDF-to-editable-document converter. Legacy commercial
documents do not automatically appear in this separate document store.

## 3. Teams and team-only document access (two sessions)

1. Keep the admin signed in. In a separate private browser, register a second
   disposable user (or provision one through your existing onboarding flow).
2. As admin add that existing user to the workspace and Team trial base as a
   Community viewer. Registration alone is NOT workspace/base membership.
   SMTP-dependent invitation flows require configured mail delivery.
3. Avatar -> Internal teams (`/internal/teams`), select the same workspace,
   create `Reviewers`, tick the second user and Save team.
4. Open a ROOT internal document -> Permissions. Remove ordinary role and
   individual grants that would independently give the second user access.
   Do not use a child with permissive inherited parent grants for this test.
5. Choose Internal team -> Reviewers -> read -> Add grant. Add discover if
   needed for navigation. Do NOT give edit, manage, or export for this example.
6. As the second user, reopen the documents page. Read the document, inspect
   Your access sources, and confirm no edit/manage/export rights are granted.
   Owner/admin emergency access is intentionally different; test with the
   ordinary second user, not the admin session.
7. As admin, remove the second user from Reviewers and save. Reload in their
   existing session: the document should no longer be readable, including by
   its direct API/URL. Previously downloaded content cannot be remotely erased.
8. Re-add them, confirm access returns; archive Reviewers and confirm its grants
   stop contributing. Archiving does not delete users or documents.

Expected: changing membership affects subsequent authorization requests without
requiring logout. If access remains, inspect independent role/user/parent grants
first. Disabling the Teams feature removes both team allows AND team denies.

## 4. Base team permissions

1. Create another team `Readers` with the second user. They must still have a
   Community base role; teams do not automatically provision that role.
2. Base settings -> Internal permissions. Review owner emergency access and
   enable internal permissions on this disposable base only.
3. Assignment source Internal team -> Readers. Allow intended read permissions
   (e.g. base:view, records:read, documents:read). Save, then inspect effective
   permissions for the second user. Unmatched actions default to deny.
4. Verify a read succeeds and an ungranted write fails for that user. A viewer
   remains a viewer even if an internal rule says allow; Community ACLs still
   constrain access. Test direct API denial too if your team uses API clients.
5. Add conflicting team rules on the same operation: team deny should win.
   Explicit individual assignments precede teams; owners retain emergency access.

## 5. Admin document toggle and user security

1. As admin disable internal extensions/documents for the disposable base in
   Internal admin. Reload its document UI and try a direct document request:
   access should be rejected. Re-enable and verify existing documents remain.
2. Disable the SECOND disposable user, not your sole administrator. Check that
   their existing session can no longer use protected APIs. Re-enable afterward.
3. Inspect internal audit events for team creation/membership/archive and admin
   changes. Logs must not contain passwords, token secrets or JWT values.

## Record your results

- Image tag / BUILD-INFO commit:
- Docker host OS / architecture:
- Fresh install or upgrade:
- Admin overview:
- Document create/import/save/export:
- Team grant / removal / archive:
- Base allow and deny:
- Disabled-user denial:
- Issues (steps, expected/actual behavior, redacted screenshot/log):

Before sharing logs, remove tokens, cookies, passwords, private document content
and connection strings. See the parity ledger for unimplemented/partial areas.
