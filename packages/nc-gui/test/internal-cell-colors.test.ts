import { describe, expect, it } from 'vitest'
import {
  evaluateInternalCellColor,
  internalColorMatches,
  readInternalColorRules,
  type InternalCellColorRule,
} from '../helpers/internalCellColors'

const rule: InternalCellColorRule = { fieldId: 'status', operator: 'equals', value: 'Done', color: '#aabbcc', target: 'cell' }
const columns = [
  { id: 'status', title: 'Status' },
  { id: 'total', title: 'Total' },
]
describe('independent cell coloring', () => {
  it('reads only our namespace and accepts JSON or object metadata', () => {
    expect(readInternalColorRules({ rowColoringInfo: [rule] })).toEqual([])
    const meta = { internalCellColorsV1: [rule], icon: 'star' }
    expect(readInternalColorRules(meta)).toEqual([rule])
    expect(readInternalColorRules(JSON.stringify(meta))).toEqual([rule])
  })
  it('fails closed for malformed rules and unsafe CSS values', () => {
    for (const meta of [null, '{', [], { internalCellColorsV1: {} }]) expect(readInternalColorRules(meta)).toEqual([])
    for (const patch of [
      { color: 'url(https://evil.test)' },
      { color: '#fff' },
      { operator: 'script' },
      { target: 'all' },
      { fieldId: '' },
    ]) {
      expect(readInternalColorRules({ internalCellColorsV1: [{ ...rule, ...patch }] })).toEqual([])
    }
    expect(readInternalColorRules({ internalCellColorsV1: Array(200).fill(rule) })).toHaveLength(100)
  })
  it('colors only matching cells, not missing/deleted fields', () => {
    expect(evaluateInternalCellColor([rule], columns, { Status: 'Done' }, 'status')).toBe('#aabbcc')
    expect(evaluateInternalCellColor([rule], columns, { Status: 'Done' }, 'total')).toBeNull()
    expect(evaluateInternalCellColor([rule], [], { Status: 'Done' }, 'status')).toBeNull()
    expect(evaluateInternalCellColor([rule], columns, {}, 'status')).toBeNull()
    expect(evaluateInternalCellColor([rule], columns, undefined, 'status')).toBeNull()
    expect(evaluateInternalCellColor([rule], columns, { Status: 'Other' }, 'status')).toBeNull()
  })
  it('supports first-match priority and entire-row coloring', () => {
    const rowRule = { ...rule, target: 'row' as const }
    expect(evaluateInternalCellColor([rowRule], columns, { Status: 'Done' }, 'total')).toBe('#aabbcc')
    expect(evaluateInternalCellColor([rule, { ...rule, color: '#ffffff' }], columns, { Status: 'Done' }, 'status')).toBe(
      '#aabbcc',
    )
  })
  it('matches primitive values without executing regex/code or coercing objects', () => {
    expect(internalColorMatches('DONE now', { ...rule, operator: 'contains', value: 'done' })).toBe(true)
    expect(internalColorMatches(12, { ...rule, operator: 'greaterThan', value: '10' })).toBe(true)
    expect(internalColorMatches(2, { ...rule, operator: 'lessThan', value: '10' })).toBe(true)
    expect(internalColorMatches(null, { ...rule, operator: 'greaterThan', value: '-1' })).toBe(false)
    expect(internalColorMatches(' ', { ...rule, operator: 'lessThan', value: '1' })).toBe(false)
    expect(internalColorMatches(Infinity, { ...rule, operator: 'greaterThan', value: '1' })).toBe(false)
    expect(internalColorMatches({}, { ...rule, operator: 'notEquals' })).toBe(false)
    expect(internalColorMatches(false, { ...rule, value: 'false' })).toBe(true)
    for (const value of [null, undefined, '', []]) expect(internalColorMatches(value, { ...rule, operator: 'empty' })).toBe(true)
    expect(internalColorMatches(0, { ...rule, operator: 'notEmpty' })).toBe(true)
  })
})
