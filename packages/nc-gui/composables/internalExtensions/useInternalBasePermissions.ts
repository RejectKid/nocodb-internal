export const INTERNAL_BASE_PERMISSION_EFFECTS = ['allow', 'deny'] as const
export const INTERNAL_BASE_PERMISSION_SUBJECT_TYPES = ['user', 'role', 'team'] as const

export type InternalBasePermissionEffect = (typeof INTERNAL_BASE_PERMISSION_EFFECTS)[number]
export type InternalBasePermissionSubjectType = (typeof INTERNAL_BASE_PERMISSION_SUBJECT_TYPES)[number]

export interface InternalBasePermissionAssignment {
  permission: string
  effect: InternalBasePermissionEffect
}

export interface InternalBasePermissionGrantSet {
  subjectType: InternalBasePermissionSubjectType
  subjectId: string
  assignments: InternalBasePermissionAssignment[]
  revision: string
}

export interface InternalEffectiveBasePermission {
  permission: string
  allowed: boolean
  mode: 'community' | 'internal'
  source?: string
  reason?: string
}

export interface InternalBasePermissionState {
  configuration: {
    enabled: boolean
    updated_at: string
  } | null
  grantSets: InternalBasePermissionGrantSet[]
  emptyGrantRevision: string
  catalog: string[]
  currentActorEffectivePermissions: InternalEffectiveBasePermission[]
}

export interface InternalBasePermissionClient {
  get<T>(url: string): Promise<{ data: T }>
  patch<T>(url: string, body: unknown): Promise<{ data: T }>
  put<T>(url: string, body: unknown): Promise<{ data: T }>
}

export type InternalBasePermissionDraft = Record<string, InternalBasePermissionEffect | undefined>

export interface InternalBasePermissionDisplay {
  effect?: InternalBasePermissionEffect
  source: 'direct' | 'role' | 'team' | 'unset'
  sourceId?: string
}

export function internalBasePermissionPath(workspaceId: string, baseId: string) {
  return `/api/internal/v1/workspaces/${encodeURIComponent(workspaceId)}/bases/${encodeURIComponent(baseId)}/permissions`
}

export async function fetchInternalBasePermissionState(
  client: InternalBasePermissionClient,
  workspaceId: string,
  baseId: string,
) {
  const response = await client.get<InternalBasePermissionState>(internalBasePermissionPath(workspaceId, baseId))
  return response.data
}

export async function updateInternalBasePermissionConfiguration(
  client: InternalBasePermissionClient,
  workspaceId: string,
  baseId: string,
  state: InternalBasePermissionState,
  enabled: boolean,
) {
  const response = await client.patch<InternalBasePermissionState['configuration']>(
    `${internalBasePermissionPath(workspaceId, baseId)}/configuration`,
    {
      enabled,
      expectedUpdatedAt: state.configuration?.updated_at ?? null,
    },
  )
  return response.data
}

export async function replaceInternalBasePermissionAssignments(
  client: InternalBasePermissionClient,
  workspaceId: string,
  baseId: string,
  state: InternalBasePermissionState,
  subjectType: InternalBasePermissionSubjectType,
  subjectId: string,
  draft: InternalBasePermissionDraft,
) {
  const current = state.grantSets.find((grantSet) => grantSet.subjectType === subjectType && grantSet.subjectId === subjectId)
  const assignments = state.catalog.flatMap((permission) => {
    const effect = draft[permission]
    return effect ? [{ permission, effect }] : []
  })
  const response = await client.put<InternalBasePermissionAssignment[]>(
    `${internalBasePermissionPath(workspaceId, baseId)}/subjects/${encodeURIComponent(subjectType)}/${encodeURIComponent(
      subjectId,
    )}`,
    {
      assignments,
      expectedRevision: current?.revision ?? state.emptyGrantRevision,
    },
  )
  return response.data
}

export function createInternalBasePermissionDraft(
  grantSet?: Pick<InternalBasePermissionGrantSet, 'assignments'>,
): InternalBasePermissionDraft {
  return Object.fromEntries(grantSet?.assignments.map(({ permission, effect }) => [permission, effect]) ?? [])
}

export function canManageInternalBasePermissions(state?: InternalBasePermissionState) {
  return Boolean(
    state?.currentActorEffectivePermissions.some(({ permission, allowed }) => permission === 'base:manage_members' && allowed),
  )
}

export function resolveInternalBasePermissionDisplay(
  state: InternalBasePermissionState,
  subjectType: InternalBasePermissionSubjectType,
  subjectId: string,
  roleIds: readonly string[] = [],
  teamIds: readonly string[] = [],
) {
  const display: Record<string, InternalBasePermissionDisplay> = {}
  const relevantRoles = subjectType === 'role' ? [subjectId] : roleIds

  for (const permission of state.catalog) {
    if (relevantRoles.includes('owner')) {
      display[permission] = {
        effect: 'allow',
        source: 'role',
        sourceId: 'owner',
      }
      continue
    }
    const direct =
      subjectType === 'user'
        ? state.grantSets
            .find(({ subjectType: type, subjectId: id }) => type === 'user' && id === subjectId)
            ?.assignments.find((assignment) => assignment.permission === permission)
        : undefined
    if (direct) {
      display[permission] = { effect: direct.effect, source: 'direct' }
      continue
    }

    const teamAssignments = state.grantSets
      .filter(
        (s) =>
          s.subjectType === 'team' &&
          (subjectType === 'team' ? s.subjectId === subjectId : subjectType === 'user' && teamIds.includes(s.subjectId)),
      )
      .flatMap((s) => s.assignments.filter((a) => a.permission === permission).map((a) => ({ ...a, teamId: s.subjectId })))
    const team = teamAssignments.find((a) => a.effect === 'deny') ?? teamAssignments.find((a) => a.effect === 'allow')
    if (team) {
      display[permission] = { effect: team.effect, source: 'team', sourceId: team.teamId }
      continue
    }

    const roleAssignments = relevantRoles.flatMap((roleId) => {
      const assignment = state.grantSets
        .find(({ subjectType: type, subjectId: id }) => type === 'role' && id === roleId)
        ?.assignments.find((candidate) => candidate.permission === permission)
      return assignment ? [{ ...assignment, roleId }] : []
    })
    const inherited =
      roleAssignments.find(({ effect }) => effect === 'deny') ?? roleAssignments.find(({ effect }) => effect === 'allow')
    display[permission] = inherited
      ? {
          effect: inherited.effect,
          source: 'role',
          sourceId: inherited.roleId,
        }
      : { source: 'unset' }
  }
  return display
}

export function normalizeInternalBasePermissionRoles(roles: unknown): string[] {
  if (typeof roles === 'string') {
    return roles
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean)
  }
  if (roles && typeof roles === 'object') {
    return Object.entries(roles)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([role]) => role)
  }
  return []
}

export function internalBasePermissionErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object') return
  const response = (error as { response?: { status?: unknown } }).response
  return typeof response?.status === 'number' ? response.status : undefined
}
