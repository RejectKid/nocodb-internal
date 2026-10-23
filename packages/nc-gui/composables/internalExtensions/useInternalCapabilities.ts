export const INTERNAL_CAPABILITY_KEYS = [
  'internalAdmin',
  'fineGrainedApiTokens',
  'basePermissions',
  'inputValidation',
  'documentPermissions',
  'filePreviewMode',
  'discussionMode',
  'teams',
  'cellColoring',
] as const

export type InternalCapabilityKey = (typeof INTERNAL_CAPABILITY_KEYS)[number]

export interface InternalCapabilitiesResponse {
  schemaVersion: 1
  features: Record<InternalCapabilityKey, boolean>
}

export async function fetchInternalCapabilities(client: {
  get: <T>(url: string) => Promise<{ data: T }>
}): Promise<InternalCapabilitiesResponse> {
  const response = await client.get<InternalCapabilitiesResponse>('/api/internal/v1/capabilities')
  return response.data
}

export function useInternalCapabilities() {
  const capabilities = ref<InternalCapabilitiesResponse>()
  const error = ref<unknown>()
  const isLoading = ref(false)
  const { api } = useApi({ useGlobalInstance: true })

  async function refresh() {
    isLoading.value = true
    error.value = undefined

    try {
      const response = await fetchInternalCapabilities(api.instance)
      capabilities.value = response
      return response
    } catch (requestError) {
      error.value = requestError
      throw requestError
    } finally {
      isLoading.value = false
    }
  }

  return {
    capabilities: readonly(capabilities),
    error: readonly(error),
    isLoading: readonly(isLoading),
    refresh,
  }
}
