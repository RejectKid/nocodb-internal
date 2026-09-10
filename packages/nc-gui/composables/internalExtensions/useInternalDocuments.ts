export type InternalDocumentPermission = 'discover' | 'read' | 'comment' | 'edit' | 'manage' | 'export'

export interface InternalDocumentSummary {
  id: string
  parentId: string | null
  title: string
  order: number
  version: number
  updatedAt: string
}

export interface InternalDocument extends InternalDocumentSummary {
  workspaceId: string
  baseId: string
  content: Record<string, unknown>
  metadata: Record<string, unknown> | null
  permissions: InternalDocumentPermission[]
  permissionSources?: Array<{ subjectType: string; subjectId: string; permission: string; inherited: boolean }>
  createdBy: string
  updatedBy: string
  createdAt: string
}

export interface InternalDocumentComment {
  id: string
  documentId: string
  parentId: string | null
  anchor: Record<string, unknown> | null
  body: string
  mentions: string[]
  author: { id: string; displayName: string | null }
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface InternalDocumentRevision {
  id: string
  revision: number
  authorId: string
  summary: string | null
  createdAt: string
}

export interface InternalDocumentGrant {
  id?: string
  subjectType: 'user' | 'role' | 'team'
  subjectId: string
  permission: InternalDocumentPermission
  createdBy?: string
  createdAt?: string
}

export const internalDocumentsPath = (workspaceId: string, baseId: string) =>
  `/api/internal/v1/workspaces/${encodeURIComponent(workspaceId)}/bases/${encodeURIComponent(baseId)}/documents`

export function documentContentToText(content: Record<string, unknown>) {
  const read = (value: unknown): string => {
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.map(read).join('\n')
    if (value && typeof value === 'object') {
      const item = value as Record<string, unknown>
      if (typeof item.text === 'string') return item.text
      if ('content' in item) return read(item.content)
      return Object.values(item).map(read).filter(Boolean).join('\n')
    }
    return ''
  }
  return read(content)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function textToDocumentContent(text: string): Record<string, unknown> {
  return {
    type: 'doc',
    content: text.split(/\r?\n/).map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  }
}

export function useInternalDocuments(workspaceId: Ref<string>, baseId: Ref<string>) {
  const { api } = useApi({ useGlobalInstance: true })
  const documents = ref<InternalDocumentSummary[]>([])
  const activeDocument = ref<InternalDocument>()
  const comments = ref<InternalDocumentComment[]>([])
  const revisions = ref<InternalDocumentRevision[]>([])
  const grants = ref<InternalDocumentGrant[]>([])
  const isLoading = ref(false)
  const basePath = computed(() => internalDocumentsPath(workspaceId.value, baseId.value))

  async function refresh(query = '') {
    if (!workspaceId.value || !baseId.value) return
    isLoading.value = true
    try {
      documents.value = (
        await api.instance.get<InternalDocumentSummary[]>(`${basePath.value}?query=${encodeURIComponent(query)}`)
      ).data
    } finally {
      isLoading.value = false
    }
  }

  async function open(documentId: string) {
    activeDocument.value = (await api.instance.get<InternalDocument>(`${basePath.value}/${encodeURIComponent(documentId)}`)).data
    await Promise.all([refreshComments(documentId), refreshRevisions(documentId)])
    if (activeDocument.value.permissions.includes('manage')) await refreshGrants(documentId)
    else grants.value = []
    return activeDocument.value
  }

  async function create(title: string, parentId?: string | null, content = textToDocumentContent('')) {
    const created = (
      await api.instance.post<InternalDocument>(basePath.value, {
        title,
        parentId,
        content,
      })
    ).data
    await refresh()
    await open(created.id)
    return created
  }

  async function save(input: { title: string; text: string; summary?: string }) {
    if (!activeDocument.value) return
    const saved = (
      await api.instance.patch<InternalDocument>(`${basePath.value}/${encodeURIComponent(activeDocument.value.id)}`, {
        title: input.title,
        content: textToDocumentContent(input.text),
        expectedVersion: activeDocument.value.version,
        summary: input.summary,
      })
    ).data
    activeDocument.value = saved
    await Promise.all([refresh(), refreshRevisions(saved.id)])
  }

  async function remove(documentId: string) {
    await api.instance.delete(`${basePath.value}/${encodeURIComponent(documentId)}`)
    if (activeDocument.value?.id === documentId) activeDocument.value = undefined
    await refresh()
  }

  async function refreshComments(documentId = activeDocument.value?.id) {
    if (!documentId) return
    comments.value = (
      await api.instance.get<InternalDocumentComment[]>(`${basePath.value}/${encodeURIComponent(documentId)}/comments`)
    ).data
  }

  async function createComment(body: string, parentId?: string | null) {
    if (!activeDocument.value) return
    await api.instance.post(`${basePath.value}/${encodeURIComponent(activeDocument.value.id)}/comments`, {
      body,
      parentId,
    })
    await refreshComments()
  }

  async function resolveComment(commentId: string, resolved: boolean) {
    if (!activeDocument.value) return
    await api.instance.patch(
      `${basePath.value}/${encodeURIComponent(activeDocument.value.id)}/comments/${encodeURIComponent(commentId)}/resolution`,
      { resolved },
    )
    await refreshComments()
  }

  async function refreshRevisions(documentId = activeDocument.value?.id) {
    if (!documentId) return
    revisions.value = (
      await api.instance.get<InternalDocumentRevision[]>(`${basePath.value}/${encodeURIComponent(documentId)}/revisions`)
    ).data
  }

  async function restore(revisionId: string) {
    if (!activeDocument.value) return
    const restored = (
      await api.instance.post<InternalDocument>(
        `${basePath.value}/${encodeURIComponent(activeDocument.value.id)}/revisions/${encodeURIComponent(revisionId)}/restore`,
        { expectedVersion: activeDocument.value.version },
      )
    ).data
    activeDocument.value = restored
    await Promise.all([refresh(), refreshRevisions()])
  }

  async function refreshGrants(documentId = activeDocument.value?.id) {
    if (!documentId) return
    grants.value = (
      await api.instance.get<InternalDocumentGrant[]>(`${basePath.value}/${encodeURIComponent(documentId)}/permissions`)
    ).data
  }

  async function replaceGrants(nextGrants: InternalDocumentGrant[]) {
    if (!activeDocument.value) return
    grants.value = (
      await api.instance.put<InternalDocumentGrant[]>(
        `${basePath.value}/${encodeURIComponent(activeDocument.value.id)}/permissions`,
        {
          grants: nextGrants.map(({ subjectType, subjectId, permission }) => ({
            subjectType,
            subjectId,
            permission,
          })),
        },
      )
    ).data
  }

  async function download(format: 'pdf' | 'json') {
    if (!activeDocument.value) return
    const result = await api.instance.get(`${basePath.value}/${encodeURIComponent(activeDocument.value.id)}/export.${format}`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(result.data)
    const link = document.createElement('a')
    link.href = url
    link.download = `${activeDocument.value.title.replace(/[^a-z0-9_-]+/gi, '_') || 'document'}.${format}`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return {
    documents: readonly(documents),
    activeDocument,
    comments: readonly(comments),
    revisions: readonly(revisions),
    grants: readonly(grants),
    isLoading: readonly(isLoading),
    refresh,
    open,
    create,
    save,
    remove,
    createComment,
    resolveComment,
    restore,
    replaceGrants,
    download,
  }
}
