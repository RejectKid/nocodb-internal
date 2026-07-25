import { describe, expect, it, vi } from 'vitest'
import {
  createInternalApiToken,
  fetchInternalApiTokenState,
  internalApiTokenPath,
  revokeInternalApiToken,
  tokenLifecycle,
} from '../composables/internalExtensions/useInternalApiTokens'

describe('internal API token client', () => {
  it('uses encoded, isolated internal v1 routes', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({ data: { tokens: [] } }),
      post: vi.fn().mockResolvedValue({ data: { token: { id: 'token-1' }, value: 'shown-once' } }),
      delete: vi.fn().mockResolvedValue({ data: { id: 'token-1', revoked_at: 'now' } }),
    }
    const path = internalApiTokenPath('workspace/1', 'base/1')
    expect(path).toBe('/api/internal/v1/workspaces/workspace%2F1/bases/base%2F1/tokens')

    await fetchInternalApiTokenState(client, 'workspace-1', 'base-1')
    await createInternalApiToken(client, 'workspace-1', 'base-1', {
      displayName: 'Automation',
      expiresAt: null,
      allowedWorkspaceIds: ['workspace-1'],
      allowedBaseIds: ['base-1'],
      scopes: ['data:read'],
    })
    await revokeInternalApiToken(client, 'workspace-1', 'base-1', 'token/1')

    expect(client.get).toHaveBeenCalledWith('/api/internal/v1/workspaces/workspace-1/bases/base-1/tokens')
    expect(client.post).toHaveBeenCalledWith(
      '/api/internal/v1/workspaces/workspace-1/bases/base-1/tokens',
      expect.objectContaining({ allowedBaseIds: ['base-1'] }),
    )
    expect(client.delete).toHaveBeenCalledWith('/api/internal/v1/workspaces/workspace-1/bases/base-1/tokens/token%2F1')
  })

  it('classifies active, expired, and revoked tokens deterministically', () => {
    const token = {
      revoked_at: null,
      expires_at: '2026-08-01T00:00:00.000Z',
    } as any
    expect(tokenLifecycle(token, new Date('2026-07-24').getTime())).toBe('active')
    expect(tokenLifecycle(token, new Date('2026-08-02').getTime())).toBe('expired')
    expect(tokenLifecycle({ ...token, revoked_at: '2026-07-25T00:00:00.000Z' }, Date.now())).toBe('revoked')
  })
})
