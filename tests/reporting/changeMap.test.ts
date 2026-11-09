import { describe, expect, it } from 'vitest'
import { HVO_LABELS } from '../../src/core/profiles/hvo/0.5.1'
import {
  CHANGE_KINDS,
  compareResources,
  flattenMap,
  formatGroupLabel,
  shownLinks,
  type ChangeMap,
  type MapNode,
  type MapRow,
} from '../../src/core/reporting'
import { DEMO_AFTER, DEMO_BEFORE, demoText } from '../../src/pages/demoExample'

const ALL = new Set(CHANGE_KINDS)

function demoMap(): ChangeMap {
  const outcome = compareResources(demoText(DEMO_BEFORE), demoText(DEMO_AFTER), { labels: HVO_LABELS, ignorePaths: ['meta.lastUpdated'] })
  if (!outcome.ok) throw new Error('Förväntade en jämförelse')
  return outcome.comparison.map
}

function find(root: MapNode, id: string): MapNode {
  if (root.id === id) return root
  for (const child of root.children) {
    const found = child.id === id || id.startsWith(`${child.id}/`) ? find(child, id) : undefined
    if (found !== undefined) return found
  }
  throw new Error(`Hittade inte ${id}`)
}

function nodeIds(rows: readonly MapRow[]): string[] {
  return rows.flatMap((row) => (row.type === 'node' ? [row.id] : []))
}

describe('buildChangeMap', () => {
  it('links every change to where it starts in Före and ends in Efter', () => {
    const ends = demoMap().links.map((link) => [link.kind, link.from, link.to])
    expect(ends).toEqual([
      ['removed', 'before:/contained/0/category/1', undefined],
      ['removed', 'before:/extension/1', undefined],
      ['changed', 'before:/contact/0/telecom/0/value', 'after:/contact/0/telecom/0/value'],
      ['added', undefined, 'after:/contact/1'],
      ['moved', 'before:/contact/0/period', 'after:/contact/1/period'],
      ['changed', 'before:/name', 'after:/name'],
    ])
  })

  it('writes a short Swedish note for each end', () => {
    const notes = demoMap().links.map((link) => [link.beforeNote, link.afterNote])
    expect(notes).toEqual([
      ['Borttagen (var 1123)', undefined],
      ['Borttagen (var 1970-01-01 – tills vidare)', undefined],
      ['Ändrad till ”+46730748600”', 'Ändrad från ”+46730748674”'],
      [undefined, 'Ny: fax +46812345678'],
      ['Flyttad till Kontakt för fax (Professionell), period', 'Flyttad hit från Kontakt för telefon (Professionell), period'],
      ['Ändrad till ”Akut-, stroke- och neurologiavdelningen”', 'Ändrad från ”Akut- stroke och neurologiavdelningen”'],
    ])
  })

  it('names fields with the profile labels and list items with their slice', () => {
    const map = demoMap()
    expect(map.before.label).toBe('Organisation')
    expect(find(map.before, 'before:/name')).toMatchObject({ name: 'name', label: 'Namn', value: '”Akut- stroke och neurologiavdelningen”' })
    expect(find(map.after, 'after:/contact/1')).toMatchObject({ name: '[1]', label: 'Kontakt för fax (Professionell)' })
    expect(find(map.before, 'before:/contained/0').label).toBe('Verksamhet NeurologyAndInternalMedicineBusiness')
  })

  it('marks the inside of an added value without making it a change of its own', () => {
    const map = demoMap()
    expect(find(map.after, 'after:/contact/1')).toMatchObject({ status: 'added', own: true, linkId: 'link:3' })
    expect(find(map.after, 'after:/contact/1/telecom')).toMatchObject({ status: 'added', own: false })
    // A move into the new contact is its own change, not part of the addition.
    expect(find(map.after, 'after:/contact/1/period')).toMatchObject({ status: 'moved', own: true, linkId: 'link:4' })
    expect(find(map.after, 'after:/contact').changesBelow).toEqual(expect.arrayContaining(['changed', 'added', 'moved']))
  })
})

describe('flattenMap', () => {
  it('opens branches down to every change and folds unchanged neighbours', () => {
    const rows = flattenMap(demoMap().after, ALL)
    expect(nodeIds(rows)).toEqual([
      'after:',
      'after:/contact',
      'after:/contact/0',
      'after:/contact/0/telecom',
      'after:/contact/0/telecom/0',
      'after:/contact/0/telecom/0/value',
      'after:/contact/1',
      'after:/contact/1/period',
      'after:/name',
    ])
    expect(rows[1]).toEqual({ type: 'group', id: 'after:#0', depth: 1, count: 6 })
  })

  it('treats a field whose kind is not chosen as unchanged', () => {
    const rows = flattenMap(demoMap().after, new Set(['changed'] as const))
    expect(nodeIds(rows)).not.toContain('after:/contact/1')
    expect(nodeIds(rows)).toContain('after:/name')
  })

  it('opens a folded group and closes an open branch when toggled', () => {
    const map = demoMap()
    const opened = flattenMap(map.after, ALL, new Set(['after:#0']))
    expect(nodeIds(opened)).toContain('after:/resourceType')
    const closed = flattenMap(map.after, ALL, new Set(['after:/contact']))
    expect(nodeIds(closed)).not.toContain('after:/contact/0')
    expect(closed.find((row) => row.id === 'after:/contact')).toMatchObject({ expandable: true, expanded: false })
  })

  it('shows every child of a branch the user opened', () => {
    const rows = flattenMap(demoMap().after, ALL, new Set(['after:#0', 'after:/identifier']))
    expect(nodeIds(rows)).toEqual(expect.arrayContaining(['after:/identifier/0', 'after:/identifier/1']))
  })
})

describe('flattenMap with showAll', () => {
  function countNodes(node: MapNode): number {
    return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0)
  }

  it('opens every branch and folds nothing', () => {
    const map = demoMap()
    const rows = flattenMap(map.after, ALL, new Set(), true)
    expect(rows.some((row) => row.type === 'group')).toBe(false)
    expect(rows).toHaveLength(countNodes(map.after))
    expect(rows.every((row) => row.type === 'node' && (row.expanded || !row.expandable))).toBe(true)
  })

  it('still lets a single branch be closed', () => {
    const rows = flattenMap(demoMap().after, ALL, new Set(['after:/identifier']), true)
    expect(nodeIds(rows)).toContain('after:/identifier')
    expect(nodeIds(rows)).not.toContain('after:/identifier/0')
  })
})

describe('shownLinks and formatGroupLabel', () => {
  it('keeps the links of the chosen kinds', () => {
    expect(shownLinks(demoMap().links, new Set(['moved'] as const)).map((link) => link.id)).toEqual(['link:4'])
  })

  it('counts unchanged fields in Swedish', () => {
    expect(formatGroupLabel(1)).toBe('1 oförändrat fält')
    expect(formatGroupLabel(3)).toBe('3 oförändrade fält')
  })
})
