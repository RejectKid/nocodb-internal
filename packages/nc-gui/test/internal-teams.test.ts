import { describe, expect, it } from 'vitest'
import { internalTeamsPath } from '../composables/internalExtensions/useInternalTeams'
import {
  resolveInternalBasePermissionDisplay,
  type InternalBasePermissionState,
} from '../composables/internalExtensions/useInternalBasePermissions'

describe('internal team permission UI contracts', () => {
  it('encodes workspace paths', () => expect(internalTeamsPath('w/1')).toContain('w%2F1/teams'))
  it('shows user > team deny/allow > role precedence', () => {
    const state = {
      catalog: ['records:read'],
      grantSets: [
        { subjectType: 'team', subjectId: 'a', assignments: [{ permission: 'records:read', effect: 'allow' }] },
        { subjectType: 'team', subjectId: 'b', assignments: [{ permission: 'records:read', effect: 'deny' }] },
        { subjectType: 'role', subjectId: 'viewer', assignments: [{ permission: 'records:read', effect: 'allow' }] },
      ],
    } as InternalBasePermissionState
    expect(resolveInternalBasePermissionDisplay(state, 'user', 'u', ['viewer'], ['a', 'b'])['records:read']).toMatchObject({
      effect: 'deny',
      source: 'team',
    })
    expect(resolveInternalBasePermissionDisplay(state, 'team', 'a')['records:read']).toMatchObject({
      effect: 'allow',
      source: 'team',
    })
    state.grantSets.push({
      subjectType: 'user',
      subjectId: 'u',
      revision: '',
      assignments: [{ permission: 'records:read', effect: 'allow' }],
    })
    expect(resolveInternalBasePermissionDisplay(state, 'user', 'u', ['viewer'], ['a', 'b'])['records:read']).toMatchObject({
      effect: 'allow',
      source: 'direct',
    })
  })
})
