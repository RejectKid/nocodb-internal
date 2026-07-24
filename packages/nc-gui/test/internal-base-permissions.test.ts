import { describe, expect, it, vi } from 'vitest'
import {
  canManageInternalBasePermissions,
  createInternalBasePermissionDraft,
  fetchInternalBasePermissionState,
  internalBasePermissionErrorStatus,
  normalizeInternalBasePermissionRoles,
  replaceInternalBasePermissionAssignments,
  resolveInternalBasePermissionDisplay,
  updateInternalBasePermissionConfiguration,
  type InternalBasePermissionClient,
  type InternalBasePermissionState,
} from '../composables/internalExtensions/useInternalBasePermissions'

const state: InternalBasePermissionState = {
  configuration: {
    enabled: true,
    updated_at: '2026-07-24T12:00:00.000Z',
  },
  grantSets: [
    {
      subjectType: 'role',
      subjectId: 'editor',
      revision: 'role-revision',
      assignments: [{ permission: 'records:read', effect: 'allow' }],
    },
  ],
  emptyGrantRevision: 'empty-revision',
  catalog: ['records:read', 'records:update', 'records:delete'],
  currentActorEffectivePermissions: [
    {
      permission: 'base:manage_members',
      allowed: true,
      mode: 'internal',
    },
  ],
}

function client() {
  return {
    get: vi.fn().mockResolvedValue({ data: state }),
    patch: vi.fn().mockResolvedValue({ data: state.configuration }),
    put: vi.fn().mockResolvedValue({ data: [] }),
  } satisfies InternalBasePermissionClient
}

describe('internal base-permission frontend contract', () => {
  it('loads state from the isolated internal v1 route', async () => {
    const api = client()

    await expect(fetchInternalBasePermissionState(api, 'workspace/1', 'base 1')).resolves.toBe(state)
    expect(api.get).toHaveBeenCalledWith('/api/internal/v1/workspaces/workspace%2F1/bases/base%201/permissions')
  })

  it('echoes the configuration timestamp for optimistic updates', async () => {
    const api = client()

    await updateInternalBasePermissionConfiguration(api, 'workspace-1', 'base-1', state, false)
    expect(api.patch).toHaveBeenCalledWith('/api/internal/v1/workspaces/workspace-1/bases/base-1/permissions/configuration', {
      enabled: false,
      expectedUpdatedAt: '2026-07-24T12:00:00.000Z',
    })
  })

  it('sends catalog-ordered assignments and the current subject revision', async () => {
    const api = client()

    await replaceInternalBasePermissionAssignments(api, 'workspace-1', 'base-1', state, 'role', 'editor', {
      'records:delete': 'deny',
      'records:read': 'allow',
    })
    expect(api.put).toHaveBeenCalledWith(
      '/api/internal/v1/workspaces/workspace-1/bases/base-1/permissions/subjects/role/editor',
      {
        assignments: [
          { permission: 'records:read', effect: 'allow' },
          { permission: 'records:delete', effect: 'deny' },
        ],
        expectedRevision: 'role-revision',
      },
    )
  })

  it('uses the empty revision for a new direct-user assignment', async () => {
    const api = client()

    await replaceInternalBasePermissionAssignments(api, 'workspace-1', 'base-1', state, 'user', 'user-2', {
      'records:update': 'allow',
    })
    expect(api.put).toHaveBeenCalledWith(
      expect.stringContaining('/subjects/user/user-2'),
      expect.objectContaining({ expectedRevision: 'empty-revision' }),
    )
  })

  it('distinguishes manageable state, assignment drafts, and stale errors', () => {
    expect(canManageInternalBasePermissions(state)).toBe(true)
    expect(
      canManageInternalBasePermissions({
        ...state,
        currentActorEffectivePermissions: [],
      }),
    ).toBe(false)
    expect(createInternalBasePermissionDraft(state.grantSets[0])).toEqual({
      'records:read': 'allow',
    })
    expect(internalBasePermissionErrorStatus({ response: { status: 409 } })).toBe(409)
    expect(internalBasePermissionErrorStatus(new Error('offline'))).toBeUndefined()
  })

  it('explains direct and inherited effective assignments deterministically', () => {
    const directAndInherited: InternalBasePermissionState = {
      ...state,
      grantSets: [
        ...state.grantSets,
        {
          subjectType: 'role',
          subjectId: 'viewer',
          revision: 'viewer-revision',
          assignments: [{ permission: 'records:update', effect: 'deny' }],
        },
        {
          subjectType: 'user',
          subjectId: 'user-2',
          revision: 'user-revision',
          assignments: [{ permission: 'records:read', effect: 'deny' }],
        },
      ],
    }

    expect(resolveInternalBasePermissionDisplay(directAndInherited, 'user', 'user-2', ['editor', 'viewer'])).toMatchObject({
      'records:read': { effect: 'deny', source: 'direct' },
      'records:update': { effect: 'deny', source: 'role', sourceId: 'viewer' },
      'records:delete': { source: 'unset' },
    })
    expect(normalizeInternalBasePermissionRoles('editor, viewer')).toEqual(['editor', 'viewer'])
    expect(normalizeInternalBasePermissionRoles({ editor: true, viewer: false })).toEqual(['editor'])
    expect(resolveInternalBasePermissionDisplay(directAndInherited, 'role', 'owner')).toMatchObject({
      'records:read': { effect: 'allow', source: 'role', sourceId: 'owner' },
      'records:update': { effect: 'allow', source: 'role', sourceId: 'owner' },
    })
  })
})
