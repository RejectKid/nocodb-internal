import { describe, expect, it } from 'vitest'
import { parseInternalDocumentImport } from '../helpers/internalDocumentImport'

describe('internal document import', () => {
  it('imports Markdown with its source text intact', () => {
    const result = parseInternalDocumentImport('Notes.md', '# Heading\n\n**Bold**')
    expect(result.title).toBe('Notes')
    expect(JSON.stringify(result.content)).toContain('**Bold**')
  })
  it('imports portable JSON content without foreign grants or ownership', () => {
    const content = { type: 'doc', content: [{ type: 'text', text: 'Hello' }] }
    expect(
      parseInternalDocumentImport(
        'export.json',
        JSON.stringify({
          format: 'nc-internal-document',
          version: 1,
          title: 'Imported',
          content,
          createdBy: 'other-user',
          baseId: 'other-base',
          grants: ['manage'],
        }),
      ),
    ).toEqual({ title: 'Imported', content })
  })
  it('rejects unsupported, malformed, and oversized imports', () => {
    expect(() => parseInternalDocumentImport('legacy.json', '{"documents":[]}')).toThrow('migration adapter')
    expect(() => parseInternalDocumentImport('file.pdf', '%PDF')).toThrow('Attachment field')
    expect(() => parseInternalDocumentImport('file.txt', 'x'.repeat(4 * 1024 * 1024 + 1))).toThrow('4 MB')
  })
})
