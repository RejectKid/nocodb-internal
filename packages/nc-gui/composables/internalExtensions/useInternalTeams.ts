export interface InternalTeam {
  id: string
  name: string
  revision: number
  memberIds: string[]
}

export const internalTeamsPath = (workspaceId: string) => `/api/internal/v1/workspaces/${encodeURIComponent(workspaceId)}/teams`

export async function fetchInternalTeams(client: { get<T>(url: string): Promise<{ data: T }> }, workspaceId: string) {
  return (await client.get<InternalTeam[]>(internalTeamsPath(workspaceId))).data
}
