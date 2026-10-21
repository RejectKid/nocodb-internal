import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Mutates only the fresh, local Compose project created by build-handoff.mjs.
export async function smokeHandoff(origin) {
  assert.equal(new URL(origin).hostname, '127.0.0.1');
  async function api(path, token, method = 'GET', body, expected = 200) {
    const response = await fetch(origin + path, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { 'xc-auth': token } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(30000),
    });
    assert.ok(response.status === expected || (expected === 200 && method === 'POST' && response.status === 201),
      `${method} ${path}: expected ${expected}, got ${response.status}`);
    return response.json();
  }
  const page = await fetch(origin, { headers: { accept: 'text/html' }, signal: AbortSignal.timeout(30000) });
  assert.equal(page.status, 200);
  const html = await page.text();
  const scriptPath = html.match(/<script[^>]+src="([^"]+)"/)?.[1];
  assert.ok(scriptPath, 'Frontend index must reference a JavaScript asset');
  assert.equal((await fetch(new URL(scriptPath, origin))).status, 200);
  const password = `Trial!${randomUUID()}9`;
  const admin = await api('/api/v1/auth/user/signup', null, 'POST', { email: 'handoff-admin@example.test', password });
  const memberEmail = 'handoff-member@example.test';
  const member = await api('/api/v1/auth/user/signup', null, 'POST', { email: memberEmail, password });
  const memberId = JSON.parse(Buffer.from(member.token.split('.')[1], 'base64url').toString()).id;
  await api('/api/internal/v1/capabilities', null, 'GET', undefined, 401);
  const capabilities = await api('/api/internal/v1/capabilities', admin.token);
  for (const key of ['internalAdmin', 'teams', 'basePermissions', 'documentPermissions', 'cellColoring']) assert.equal(capabilities.features[key], true);
  await api('/api/internal/v1/admin/overview', admin.token);
  await api('/api/internal/v1/admin/overview', member.token, 'GET', undefined, 403);
  const base = await api('/api/v2/meta/bases', admin.token, 'POST', { title: 'Handoff smoke' });
  const w = base.fk_workspace_id;
  await api(`/api/internal/v1/workspaces/${w}/members`, admin.token, 'POST', { email: memberEmail, roles: 'workspace-level-viewer' });
  await api(`/api/internal/v1/workspaces/${w}/bases/${base.id}/members`, admin.token, 'POST', { email: memberEmail, roles: 'viewer' });
  const table = await api(`/api/v2/meta/bases/${base.id}/tables`, admin.token, 'POST', {
    title: 'Color checks', table_name: 'color_checks',
    columns: [{ title: 'Status', column_name: 'Status', uidt: 'SingleLineText', dt: 'text' }],
  });
  const viewListPath = `/api/v2/meta/tables/${table.id}/views`;
  const view = (await api(viewListPath, admin.token)).list[0];
  const field = table.columns.find((column) => column.title === 'Status');
  assert.ok(field?.id && view?.id);
  await api(`/api/v2/tables/${table.id}/records`, admin.token, 'POST', [{ Status: 'Done' }, { Status: 'Pending' }]);
  const colorMeta = { icon: 'star', internalCellColorsV1: [{ fieldId: field.id, operator: 'equals', value: 'Done', color: '#fef3c7', target: 'cell' }] };
  const viewPath = `/api/v2/meta/views/${view.id}`;
  await api(viewPath, null, 'PATCH', { meta: colorMeta }, 401);
  await api(viewPath, member.token, 'PATCH', { meta: colorMeta }, 403);
  await api(viewPath, admin.token, 'PATCH', { meta: colorMeta });
  const persistedView = (await api(viewListPath, admin.token)).list.find((item) => item.id === view.id);
  assert.deepEqual(typeof persistedView.meta === 'string' ? JSON.parse(persistedView.meta) : persistedView.meta, colorMeta);
  const teams = `/api/internal/v1/workspaces/${w}/teams`;
  const team = await api(teams, admin.token, 'POST', { name: 'Reviewers' });
  await api(`${teams}/${team.id}`, admin.token, 'PATCH', { expectedRevision: team.revision, memberIds: [memberId] });
  await api(teams, member.token, 'POST', { name: 'Forbidden' }, 403);
  const docs = `/api/internal/v1/workspaces/${w}/bases/${base.id}/documents`;
  const doc = await api(docs, admin.token, 'POST', { title: 'Team-only document', content: { type: 'doc', content: [] } });
  await api(`${docs}/${doc.id}/permissions`, admin.token, 'PUT', { grants: [{ subjectType: 'team', subjectId: team.id, permission: 'read' }] });
  const read = await api(`${docs}/${doc.id}`, member.token);
  assert.ok(read.permissionSources.some((s) => s.subjectType === 'team'));
  await api(`${docs}/${doc.id}/export.json`, admin.token);
  await api(`${docs}/${doc.id}/export.json`, member.token, 'GET', undefined, 404);
  const live = (await api(teams, admin.token)).find((t) => t.id === team.id);
  await api(`${teams}/${team.id}`, admin.token, 'PATCH', { expectedRevision: live.revision, memberIds: [] });
  await api(`${docs}/${doc.id}`, member.token, 'GET', undefined, 404);
  assert.ok(!(await api(docs, member.token)).some((item) => item.id === doc.id), 'Denied document must not leak in sidebar listing');
  return { baseId: base.id, workspaceId: w, documentId: doc.id, tableId: table.id, viewId: view.id, token: admin.token };
}
