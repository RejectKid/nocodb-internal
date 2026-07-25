export interface InternalAdminOverview {
  applicationVersion: string
  internalExtensionVersion: string
  nodeVersion: string
  database: { status: string; latencyMs: number }
  queue: { status: string; pendingJobs: number }
  storage: { configured: boolean; provider: string }
  email: { configured: boolean }
  secureAttachments: boolean
  features: Record<string, boolean>
  counts: { users: number; workspaces: number; bases: number }
  checkedAt: string
}

export interface InternalAdminClient {
  get<T>(url: string): Promise<{ data: T }>
  patch<T>(url: string, body: unknown): Promise<{ data: T }>
}

export const internalAdminPath = '/api/internal/v1/admin'

export async function fetchInternalAdminOverview(client: InternalAdminClient) {
  return (await client.get<InternalAdminOverview>(`${internalAdminPath}/overview`)).data
}

export async function fetchInternalAdminCollection<T>(
  client: InternalAdminClient,
  collection: 'users' | 'workspaces' | 'bases',
  query = '',
) {
  return (
    await client.get<{ list: T[]; pageInfo: { limit: number; offset: number; total: number } }>(
      `${internalAdminPath}/${collection}?query=${encodeURIComponent(query)}`,
    )
  ).data
}

export async function setInternalUserEnabled(client: InternalAdminClient, userId: string, enabled: boolean) {
  return (await client.patch<unknown>(`${internalAdminPath}/users/${encodeURIComponent(userId)}/status`, { enabled })).data
}

export async function setInternalBaseFeature(
  client: InternalAdminClient,
  workspaceId: string,
  baseId: string,
  featureKey: string,
  enabled: boolean,
  expectedRevision?: number,
) {
  return (
    await client.patch<unknown>(
      `${internalAdminPath}/workspaces/${encodeURIComponent(workspaceId)}/bases/${encodeURIComponent(
        baseId,
      )}/features/${encodeURIComponent(featureKey)}`,
      { enabled, expectedRevision },
    )
  ).data
}
