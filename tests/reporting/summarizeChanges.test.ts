import { describe, expect, it } from 'vitest'
import type { ChangeKind } from '../../src/core/diff'
import { countChanges, filterByKind, formatCounts, type ChangeDescription } from '../../src/core/reporting'

function description(kind: ChangeKind, text: string): ChangeDescription {
  return { change: { kind, path: [], elementPath: 'Organization' }, profiles: [], label: text, text, source: 'rule' }
}

const DESCRIPTIONS = [
  description('changed', 'a'),
  description('added', 'b'),
  description('changed', 'c'),
  description('removed', 'd'),
]

describe('summarizeChanges', () => {
  it('counts each kind', () => {
    expect(countChanges(DESCRIPTIONS)).toEqual({ added: 1, removed: 1, changed: 2 })
  })

  it('writes the counts in Swedish with singular and plural', () => {
    expect(formatCounts({ added: 1, removed: 2, changed: 0 })).toBe('1 tillagd, 2 borttagna, 0 ändrade')
    expect(formatCounts({ added: 0, removed: 0, changed: 0 })).toBe('Inga skillnader')
  })

  it('filters by kind and keeps the order', () => {
    expect(filterByKind(DESCRIPTIONS, new Set<ChangeKind>(['changed', 'removed'])).map((d) => d.text)).toEqual(['a', 'c', 'd'])
  })
})
