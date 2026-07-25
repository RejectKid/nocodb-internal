export interface InternalApiTokenScopeDefinition {
  scope: string
  family: string
  label: string
  mutation: boolean
}

export interface InternalApiTokenSummary {
  id: string
  user_id: string
  display_name: string
  token_prefix: string
  created_at: string
  expires_at: string | null
  last_used_at: string | null
  disabled_at: string | null
  revoked_at: string | null
  allowed_workspace_ids: string[]
  allowed_base_ids: string[]
  scopes: string[]
}

export interface InternalApiTokenState {
  tokens: InternalApiTokenSummary[]
  scopeCatalog: InternalApiTokenScopeDefinition[]
  boundary: {
    workspaceId: string
    baseId: string
  }
}

export interface InternalApiTokenDraft {
  displayName: string
  expiresAt: string | null
  allowedWorkspaceIds: string[]
  allowedBaseIds: string[]
  scopes: string[]
}

export interface IssuedInternalApiToken {
  token: InternalApiTokenSummary
  value: string
}

export interface InternalApiTokenClient {
  get<T>(url: string): Promise<{ data: T }>
  post<T>(url: string, body: unknown): Promise<{ data: T }>
  patch<T>(url: string, body: unknown): Promise<{ data: T }>
  delete<T>(url: string): Promise<{ data: T }>
}

export function internalApiTokenPath(workspaceId: string, baseId: string) {
  return `/api/internal/v1/workspaces/${encodeURIComponent(workspaceId)}/bases/${encodeURIComponent(baseId)}/tokens`
}

export async function fetchInternalApiTokenState(client: InternalApiTokenClient, workspaceId: string, baseId: string) {
  const response = await client.get<InternalApiTokenState>(internalApiTokenPath(workspaceId, baseId))
  return response.data
}

export async function createInternalApiToken(
  client: InternalApiTokenClient,
  workspaceId: string,
  baseId: string,
  draft: InternalApiTokenDraft,
) {
  const response = await client.post<IssuedInternalApiToken>(internalApiTokenPath(workspaceId, baseId), draft)
  return response.data
}

export async function revokeInternalApiToken(
  client: InternalApiTokenClient,
  workspaceId: string,
  baseId: string,
  tokenId: string,
) {
  const response = await client.delete<InternalApiTokenSummary>(
    `${internalApiTokenPath(workspaceId, baseId)}/${encodeURIComponent(tokenId)}`,
  )
  return response.data
}

export async function updateInternalApiToken(
  client: InternalApiTokenClient,
  workspaceId: string,
  baseId: string,
  tokenId: string,
  draft: InternalApiTokenDraft,
) {
  const response = await client.patch<InternalApiTokenSummary>(
    `${internalApiTokenPath(workspaceId, baseId)}/${encodeURIComponent(tokenId)}`,
    draft,
  )
  return response.data
}

export async function setInternalApiTokenEnabled(
  client: InternalApiTokenClient,
  workspaceId: string,
  baseId: string,
  tokenId: string,
  enabled: boolean,
) {
  const response = await client.patch<InternalApiTokenSummary>(
    `${internalApiTokenPath(workspaceId, baseId)}/${encodeURIComponent(tokenId)}/status`,
    { enabled },
  )
  return response.data
}

export function internalApiTokenErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object') return
  const response = (error as { response?: { status?: unknown } }).response
  return typeof response?.status === 'number' ? response.status : undefined
}

export function tokenLifecycle(token: InternalApiTokenSummary, now = Date.now()) {
  if (token.revoked_at) return 'revoked'
  if (token.disabled_at) return 'disabled'
  if (token.expires_at && new Date(token.expires_at).getTime() <= now) return 'expired'
  return 'active'
}
