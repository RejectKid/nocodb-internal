export type InternalValidationRule =
  | { type: 'required'; message?: string }
  | { type: 'minLength' | 'maxLength' | 'decimalPrecision' | 'maxAttachmentCount'; value: number; message?: string }
  | { type: 'regex'; value: string; flags?: '' | 'i' | 'm' | 'im'; message?: string }
  | { type: 'min' | 'max'; value: number; message?: string }
  | { type: 'integer'; message?: string }
  | { type: 'earliestDate' | 'latestDate'; value: string; message?: string }
  | { type: 'allowedValues' | 'fileType'; value: Array<string | number | boolean>; message?: string }
  | { type: 'fileSize'; value: number; message?: string }

export interface InternalFieldValidationConfiguration {
  id: string
  workspaceId: string
  baseId: string
  modelId: string
  fieldKey: string
  rules: InternalValidationRule[]
  revision: number
  updatedAt: string
}

export interface InternalValidationClient {
  get<T>(url: string): Promise<{ data: T }>
  put<T>(url: string, body: unknown): Promise<{ data: T }>
}

export const internalValidationPath = (workspaceId: string, baseId: string, modelId: string) =>
  `/api/internal/v1/workspaces/${encodeURIComponent(workspaceId)}/bases/${encodeURIComponent(baseId)}/models/${encodeURIComponent(
    modelId,
  )}/validation-rules`

export async function fetchInternalValidationRules(
  client: InternalValidationClient,
  workspaceId: string,
  baseId: string,
  modelId: string,
) {
  return (await client.get<InternalFieldValidationConfiguration[]>(internalValidationPath(workspaceId, baseId, modelId))).data
}

export async function replaceInternalValidationRules(
  client: InternalValidationClient,
  workspaceId: string,
  baseId: string,
  modelId: string,
  input: { fieldKey: string; rules: InternalValidationRule[]; expectedRevision?: number },
) {
  return (await client.put<InternalFieldValidationConfiguration>(internalValidationPath(workspaceId, baseId, modelId), input))
    .data
}

export function previewInternalValidation(value: unknown, rules: InternalValidationRule[]) {
  const errors: string[] = []
  const empty = value === undefined || value === null || value === ''
  for (const rule of rules) {
    if (rule.type === 'required' && empty) errors.push(rule.message || 'A value is required')
    if (empty) continue
    if (rule.type === 'minLength' && String(value).length < rule.value) errors.push(rule.message || 'Too short')
    if (rule.type === 'maxLength' && String(value).length > rule.value) errors.push(rule.message || 'Too long')
    if (rule.type === 'min' && Number(value) < rule.value) errors.push(rule.message || 'Below minimum')
    if (rule.type === 'max' && Number(value) > rule.value) errors.push(rule.message || 'Above maximum')
    if (rule.type === 'integer' && !Number.isInteger(Number(value))) errors.push(rule.message || 'Must be an integer')
    if (rule.type === 'regex') {
      try {
        if (!new RegExp(rule.value, rule.flags).test(String(value))) errors.push(rule.message || 'Pattern does not match')
      } catch {
        errors.push('Pattern is invalid')
      }
    }
  }
  return errors
}
