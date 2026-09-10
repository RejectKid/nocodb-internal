/** Independent document import; ownership and permissions are never imported. */
export function parseInternalDocumentImport(filename: string, source: string) {
  if (new TextEncoder().encode(source).byteLength > 4 * 1024 * 1024) throw new Error('Import files must be 4 MB or smaller.')
  const extension = filename.split('.').pop()?.toLowerCase()
  if (extension === 'json') {
    const value = JSON.parse(source)
    if (
      value?.format !== 'nc-internal-document' ||
      value.version !== 1 ||
      typeof value.title !== 'string' ||
      !value.content ||
      typeof value.content !== 'object' ||
      Array.isArray(value.content)
    ) {
      throw new Error('Use a JSON file exported by Internal documents. Other database exports require a migration adapter.')
    }
    if (!value.title.trim() || value.title.trim().length > 255) throw new Error('Document title must be 1–255 characters.')
    return { title: value.title.trim(), content: value.content as Record<string, unknown> }
  }
  if (!['txt', 'md', 'markdown'].includes(extension ?? '')) {
    throw new Error(
      'Supported editable imports: .txt, .md, .markdown, and Internal documents .json. Store PDF and Office originals in an Attachment field.',
    )
  }
  const title =
    filename
      .replace(/\.[^.]+$/, '')
      .trim()
      .slice(0, 255) || 'Imported document'
  return {
    title,
    content: {
      type: 'doc',
      content: source.split(/\r?\n/).map((text) => ({ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] })),
    },
  }
}
