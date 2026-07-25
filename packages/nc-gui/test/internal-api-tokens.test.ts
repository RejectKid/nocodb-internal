import { describe, expect, it, vi } from 'vitest'
import {
  createInternalApiToken,
  fetchInternalApiTokenState,
  internalApiTokenPath,
  revokeInternalApiToken,
  setInternalApiTokenEnabled,
  tokenLifecycle,
  updateInternalApiToken,
} from '../composables/internalExtensions/useInternalApiTokens'

describe('internal API token client', () => {
  it('uses encoded, isolated internal v1 routes', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({ data: { tokens: [] } }),
      post: vi.fn().mockResolvedValue({ data: { token: { id: 'token-1' }, value: 'shown-once' } }),
      patch: vi.fn().mockResolvedValue({ data: { id: 'token-1' } }),
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
    const draft = {
      displayName: 'Renamed',
      expiresAt: null,
      allowedWorkspaceIds: ['workspace-1'],
      allowedBaseIds: ['base-1'],
      scopes: ['documents:read'],
    }
    await updateInternalApiToken(client, 'workspace-1', 'base-1', 'token/1', draft)
    await setInternalApiTokenEnabled(client, 'workspace-1', 'base-1', 'token/1', false)

    expect(client.get).toHaveBeenCalledWith('/api/internal/v1/workspaces/workspace-1/bases/base-1/tokens')
    expect(client.post).toHaveBeenCalledWith(
      '/api/internal/v1/workspaces/workspace-1/bases/base-1/tokens',
      expect.objectContaining({ allowedBaseIds: ['base-1'] }),
    )
    expect(client.delete).toHaveBeenCalledWith('/api/internal/v1/workspaces/workspace-1/bases/base-1/tokens/token%2F1')
    expect(client.patch).toHaveBeenCalledWith('/api/internal/v1/workspaces/workspace-1/bases/base-1/tokens/token%2F1', draft)
    expect(client.patch).toHaveBeenCalledWith('/api/internal/v1/workspaces/workspace-1/bases/base-1/tokens/token%2F1/status', {
      enabled: false,
    })
  })

  it('classifies active, expired, and revoked tokens deterministically', () => {
    const token = {
      revoked_at: null,
      disabled_at: null,
      expires_at: '2026-08-01T00:00:00.000Z',
    } as any
    expect(tokenLifecycle(token, new Date('2026-07-24').getTime())).toBe('active')
    expect(tokenLifecycle(token, new Date('2026-08-02').getTime())).toBe('expired')
    expect(tokenLifecycle({ ...token, revoked_at: '2026-07-25T00:00:00.000Z' }, Date.now())).toBe('revoked')
    expect(tokenLifecycle({ ...token, disabled_at: '2026-07-25T00:00:00.000Z' }, Date.now())).toBe('disabled')
  })
})
