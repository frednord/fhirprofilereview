import { describe, expect, it } from 'vitest'
import type { ChangeKind } from '../../src/core/diff'
import {
  countChanges,
  filterByKind,
  formatCounts,
  formatHiddenNote,
  formatShownNote,
  KIND_FILTER_LABELS,
  KIND_LABELS,
  type ChangeDescription,
} from '../../src/core/reporting'

function description(kind: ChangeKind, text: string): ChangeDescription {
  return { change: { kind, path: [], elementPath: 'Organization' }, profiles: [], label: text, text, source: 'rule' }
}

const DESCRIPTIONS = [
  description('changed', 'a'),
  description('added', 'b'),
  description('changed', 'c'),
  description('removed', 'd'),
  description('moved', 'e'),
]

describe('summarizeChanges', () => {
  it('counts each kind', () => {
    expect(countChanges(DESCRIPTIONS)).toEqual({ added: 1, removed: 1, changed: 2, moved: 1 })
  })

  it('writes the counts in Swedish with singular and plural', () => {
    expect(formatCounts({ added: 1, removed: 2, changed: 0, moved: 1 })).toBe('1 tillagd, 2 borttagna, 0 ändrade, 1 flyttad')
    expect(formatCounts({ added: 0, removed: 0, changed: 0, moved: 2 })).toBe('0 tillagda, 0 borttagna, 0 ändrade, 2 flyttade')
    expect(formatCounts({ added: 0, removed: 0, changed: 0, moved: 0 })).toBe('Inga skillnader')
  })

  it('filters by kind and keeps the order', () => {
    expect(filterByKind(DESCRIPTIONS, new Set<ChangeKind>(['changed', 'removed'])).map((d) => d.text)).toEqual(['a', 'c', 'd'])
  })

  it('limits the counts to the chosen kinds', () => {
    const counts = { added: 1, removed: 2, changed: 0, moved: 0 }
    expect(formatCounts(counts, new Set<ChangeKind>(['added', 'changed']))).toBe('1 tillagd, 0 ändrade')
    expect(formatCounts(counts, new Set<ChangeKind>())).toBe('Inga ändringstyper valda')
    expect(formatCounts({ added: 0, removed: 0, changed: 0, moved: 0 }, new Set<ChangeKind>())).toBe('Inga skillnader')
  })

  it('notes how many changes the choice shows', () => {
    const counts = { added: 1, removed: 2, changed: 2, moved: 1 }
    expect(formatShownNote(counts, new Set<ChangeKind>(['added', 'removed', 'changed', 'moved']))).toBeUndefined()
    expect(formatShownNote(counts, new Set<ChangeKind>(['removed']))).toBe('Visar 2 av 6 ändringar.')
    expect(formatShownNote(counts, new Set<ChangeKind>(['added', 'removed', 'changed']))).toBe('Visar 5 av 6 ändringar.')
    expect(formatShownNote({ added: 1, removed: 0, changed: 0, moved: 0 }, new Set<ChangeKind>())).toBe('Visar 0 av 1 ändring.')
    // Hiding a kind with no changes hides nothing.
    expect(formatShownNote({ added: 0, removed: 1, changed: 0, moved: 0 }, new Set<ChangeKind>(['removed']))).toBeUndefined()
  })

  it('notes how many changes the ignored path hid', () => {
    expect(formatHiddenNote(0, 'meta.lastUpdated')).toBeUndefined()
    expect(formatHiddenNote(1, 'meta.lastUpdated')).toBe('1 ändring av meta.lastUpdated är dold.')
    expect(formatHiddenNote(3, 'meta.lastUpdated')).toBe('3 ändringar av meta.lastUpdated är dolda.')
  })

  it('names the kinds in the same words as the counts', () => {
    expect(KIND_LABELS).toEqual({ added: 'Tillagd', removed: 'Borttagen', changed: 'Ändrad', moved: 'Flyttad' })
    expect(KIND_FILTER_LABELS).toEqual({ added: 'Tillagda', removed: 'Borttagna', changed: 'Ändrade', moved: 'Flyttade' })
  })
})
