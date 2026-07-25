export interface InternalDiscussionComment {
  id: string
  parentId: string | null
  body: string
  mentions: string[]
  author: { id: string; displayName: string | null }
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  resolvedBy: string | null
}

export interface InternalDiscussionClient {
  get<T>(url: string): Promise<{ data: T }>
  post<T>(url: string, body: unknown): Promise<{ data: T }>
  patch<T>(url: string, body: unknown): Promise<{ data: T }>
  delete<T>(url: string): Promise<{ data: T }>
}

export const internalDiscussionPath = (workspaceId: string, baseId: string, modelId: string, recordId: string) =>
  `/api/internal/v1/workspaces/${encodeURIComponent(workspaceId)}/bases/${encodeURIComponent(baseId)}/models/${encodeURIComponent(
    modelId,
  )}/records/${encodeURIComponent(recordId)}/discussion`

export function useInternalDiscussions(
  workspaceId: Ref<string>,
  baseId: Ref<string>,
  modelId: Ref<string>,
  recordId: Ref<string>,
) {
  const { api } = useApi({ useGlobalInstance: true })
  const comments = ref<InternalDiscussionComment[]>([])
  const isLoading = ref(false)

  const path = computed(() => internalDiscussionPath(workspaceId.value, baseId.value, modelId.value, recordId.value))

  async function refresh() {
    if (![workspaceId.value, baseId.value, modelId.value, recordId.value].every(Boolean)) return
    isLoading.value = true
    try {
      comments.value = (await api.instance.get<InternalDiscussionComment[]>(path.value)).data
    } finally {
      isLoading.value = false
    }
  }

  async function create(body: string, parentId?: string | null, mentions: string[] = []) {
    await api.instance.post(path.value, { body, parentId, mentions })
    await refresh()
  }

  async function update(commentId: string, body: string) {
    await api.instance.patch(`${path.value}/${encodeURIComponent(commentId)}`, { body })
    await refresh()
  }

  async function remove(commentId: string) {
    await api.instance.delete(`${path.value}/${encodeURIComponent(commentId)}`)
    await refresh()
  }

  async function resolve(commentId: string, resolved: boolean) {
    await api.instance.patch(`${path.value}/${encodeURIComponent(commentId)}/resolution`, { resolved })
    await refresh()
  }

  return { comments: readonly(comments), isLoading: readonly(isLoading), refresh, create, update, remove, resolve }
}
