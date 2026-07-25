export interface InternalAttachmentPreview {
  title?: string
  name?: string
  path?: string
  url?: string
  mimetype?: string
  type?: string
  size?: number
  columnId: string
}

export function internalFilePreviewPath(workspaceId: string, baseId: string, modelId: string, recordId: string) {
  return `/api/internal/v1/workspaces/${encodeURIComponent(workspaceId)}/bases/${encodeURIComponent(
    baseId,
  )}/models/${encodeURIComponent(modelId)}/records/${encodeURIComponent(recordId)}/file-preview/authorize`
}

export async function authorizeInternalFilePreview(
  client: { post<T>(url: string, body: unknown): Promise<{ data: T }> },
  boundary: { workspaceId: string; baseId: string; modelId: string; recordId: string },
  attachment: InternalAttachmentPreview,
) {
  return (
    await client.post<{ path?: string; url?: string }>(
      internalFilePreviewPath(boundary.workspaceId, boundary.baseId, boundary.modelId, boundary.recordId),
      { columnId: attachment.columnId, urlOrPath: attachment.path || attachment.url },
    )
  ).data
}
