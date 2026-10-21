import { describe, expect, it, vi } from 'vitest'
import {
  fetchInternalCapabilities,
  INTERNAL_CAPABILITY_KEYS,
  type InternalCapabilitiesResponse,
} from '../composables/internalExtensions/useInternalCapabilities'

describe('internal capability service', () => {
  it('requests the independent authenticated capability endpoint', async () => {
    const payload: InternalCapabilitiesResponse = {
      schemaVersion: 1,
      features: Object.fromEntries(
        INTERNAL_CAPABILITY_KEYS.map((key) => [key, false]),
      ) as InternalCapabilitiesResponse['features'],
    }
    const get = vi.fn().mockResolvedValue({ data: payload })

    await expect(fetchInternalCapabilities({ get })).resolves.toEqual(payload)
    expect(get).toHaveBeenCalledWith('/api/internal/v1/capabilities')
  })

  it('keeps the frontend response shape aligned with the backend schema', () => {
    expect(INTERNAL_CAPABILITY_KEYS).toEqual([
      'internalAdmin',
      'fineGrainedApiTokens',
      'basePermissions',
      'inputValidation',
      'documentPermissions',
      'filePreviewMode',
      'discussionMode',
      'teams',
      'cellColoring',
    ])
  })
})
