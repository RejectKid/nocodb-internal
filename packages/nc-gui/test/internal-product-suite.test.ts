import { describe, expect, it } from 'vitest'
import {
  documentContentToText,
  internalDocumentsPath,
  textToDocumentContent,
} from '../composables/internalExtensions/useInternalDocuments'
import { internalDiscussionPath } from '../composables/internalExtensions/useInternalDiscussions'
import { internalFilePreviewPath } from '../composables/internalExtensions/useInternalFilePreview'
import { internalValidationPath, previewInternalValidation } from '../composables/internalExtensions/useInternalValidation'
import DocumentEditor from '../components/internalExtensions/documents/Editor.vue'
import DiscussionMode from '../components/internalExtensions/recordModes/Discussion.vue'
import FilePreviewMode from '../components/internalExtensions/recordModes/FilePreview.vue'
import ValidationEditor from '../components/internalExtensions/validation/Editor.vue'

describe('internal product-suite frontend contracts', () => {
  it('encodes all tenant and resource path segments', () => {
    expect(internalValidationPath('workspace/1', 'base/1', 'model/1')).toContain('workspace%2F1/bases/base%2F1/models/model%2F1')
    expect(internalDiscussionPath('w/1', 'b/1', 'm/1', 'r/1')).toContain('records/r%2F1/discussion')
    expect(internalFilePreviewPath('w/1', 'b/1', 'm/1', 'r/1')).toContain('records/r%2F1/file-preview/authorize')
    expect(internalDocumentsPath('w/1', 'b/1')).toBe('/api/internal/v1/workspaces/w%2F1/bases/b%2F1/documents')
  })

  it('keeps validation preview messages compatible with configured rules', () => {
    expect(
      previewInternalValidation('abc', [
        { type: 'minLength', value: 5, message: 'Use at least five characters' },
        { type: 'regex', value: '^z' },
      ]),
    ).toEqual(['Use at least five characters', 'Pattern does not match'])
  })

  it('round-trips the independent snapshot editor representation', () => {
    const text = 'First paragraph\nSecond paragraph'
    expect(documentContentToText(textToDocumentContent(text))).toBe(text)
  })

  it('compiles the independent product-suite components', () => {
    for (const component of [DocumentEditor, DiscussionMode, FilePreviewMode, ValidationEditor]) {
      expect(component).toEqual(expect.objectContaining({ setup: expect.any(Function) }))
    }
  })
})
