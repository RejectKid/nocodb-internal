// Independently implemented internal extension; not the commercial coloring format.
export const INTERNAL_CELL_COLORS_KEY = 'internalCellColorsV1'
export const INTERNAL_COLOR_OPERATORS = [
  'equals',
  'notEquals',
  'contains',
  'empty',
  'notEmpty',
  'greaterThan',
  'lessThan',
] as const
export interface InternalCellColorRule {
  fieldId: string
  operator: (typeof INTERNAL_COLOR_OPERATORS)[number]
  value: string
  color: string
  target: 'cell' | 'row'
}

export function readInternalColorRules(meta: unknown): InternalCellColorRule[] {
  try {
    const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta
    const rules = (parsed as Record<string, unknown>)?.[INTERNAL_CELL_COLORS_KEY]
    if (!Array.isArray(rules)) return []
    return rules
      .slice(0, 100)
      .filter((rule): rule is InternalCellColorRule =>
        Boolean(
          rule &&
            typeof rule === 'object' &&
            typeof rule.fieldId === 'string' &&
            rule.fieldId.length &&
            INTERNAL_COLOR_OPERATORS.includes(rule.operator) &&
            typeof rule.value === 'string' &&
            typeof rule.color === 'string' &&
            /^#[a-f0-9]{6}$/i.test(rule.color) &&
            ['cell', 'row'].includes(rule.target),
        ),
      )
  } catch {
    return []
  }
}

export function internalColorMatches(value: unknown, rule: InternalCellColorRule): boolean {
  const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)
  if (rule.operator === 'empty') return empty
  if (rule.operator === 'notEmpty') return !empty
  if (empty || !['string', 'number', 'boolean'].includes(typeof value)) return false
  const text = String(value)
  switch (rule.operator) {
    case 'equals':
      return text === rule.value
    case 'notEquals':
      return text !== rule.value
    case 'contains':
      return text.toLocaleLowerCase().includes(rule.value.toLocaleLowerCase())
    case 'greaterThan':
    case 'lessThan': {
      if (!text.trim() || !rule.value.trim()) return false
      const a = Number(text)
      const b = Number(rule.value)
      return Number.isFinite(a) && Number.isFinite(b) && (rule.operator === 'greaterThan' ? a > b : a < b)
    }
    default:
      return false
  }
}

export function evaluateInternalCellColor(
  rules: InternalCellColorRule[],
  columns: Array<{ id?: string; title?: string }>,
  row: Record<string, unknown> | undefined,
  columnId: string,
): string | null {
  if (!row) return null
  // First matching rule wins. Deleted/inaccessible fields never match.
  for (const rule of rules) {
    if (rule.target === 'cell' && rule.fieldId !== columnId) continue
    const field = columns.find((column) => column.id === rule.fieldId)
    if (field?.title && Object.prototype.hasOwnProperty.call(row, field.title) && internalColorMatches(row[field.title], rule)) {
      return rule.color
    }
  }
  return null
}
