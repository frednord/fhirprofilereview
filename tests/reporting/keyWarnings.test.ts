import { describe, expect, it } from 'vitest'
import { HVO_LABELS } from '../../src/core/profiles/hvo/0.5.1'
import { CHANGE_KINDS, compareResources, flattenMap, type Comparison } from '../../src/core/reporting'

const BEFORE = {
  resourceType: 'Organization',
  id: 'a',
  name: 'Avdelning',
  extension: [{ url: 'http://example.org/period', valuePeriod: { start: '2024-01-01' } }],
}
const AFTER = {
  resourceType: 'Organization',
  id: 'a',
  name: 'Avdelning',
  extension: [{ url: 'http://example.org/period', ValuePeriod: { start: '2024-01-01' } }],
}

function compare(before: object, after: object): Comparison {
  const outcome = compareResources(JSON.stringify(before), JSON.stringify(after), { labels: HVO_LABELS, ignorePaths: [] })
  if (!outcome.ok) throw new Error('Förväntade en jämförelse')
  return outcome.comparison
}

describe('key warnings in the comparison', () => {
  it('describes the two spellings in Swedish', () => {
    const { keyWarnings, descriptions } = compare(BEFORE, AFTER)
    expect(descriptions).toEqual([])
    expect(keyWarnings.map(({ text, path }) => [text, path])).toEqual([
      [
        'Nyckeln skrivs "valuePeriod" i Före men "ValuePeriod" i Efter. Bara stora och små bokstäver skiljer. ' +
          'Värdena jämförs som samma fält, men kontrollera vilken stavning profilen kräver.',
        'extension[url=http://example.org/period].ValuePeriod',
      ],
    ])
  })

  it('joins the two spellings in the change map', () => {
    const { map } = compare(BEFORE, AFTER)
    expect(map.keyWarnings.map((w) => [w.from, w.to, w.beforeNote, w.afterNote])).toEqual([
      ['before:/extension/0/valuePeriod', 'after:/extension/0/ValuePeriod', 'Stavas "ValuePeriod" i Efter', 'Stavas "valuePeriod" i Före'],
    ])
  })

  it('opens the branch down to the key even with no changes and every kind hidden', () => {
    const { map } = compare(BEFORE, AFTER)
    for (const kinds of [new Set(CHANGE_KINDS), new Set<never>()]) {
      const ids = flattenMap(map.after, kinds).flatMap((row) => (row.type === 'node' ? [row.id] : []))
      expect(ids).toContain('after:/extension/0/ValuePeriod')
    }
  })

  it('points a change below a misspelt key at the right field on each side', () => {
    const changed = { ...AFTER, extension: [{ url: 'http://example.org/period', ValuePeriod: { start: '2025-01-01' } }] }
    const { map } = compare(BEFORE, changed)
    expect(map.links.map((l) => [l.kind, l.from, l.to])).toEqual([
      ['changed', 'before:/extension/0/valuePeriod/start', 'after:/extension/0/ValuePeriod/start'],
    ])
  })
})

describe('labels under a misspelt key', () => {
  it('uses the spelling the profile knows, on either side', () => {
    for (const [beforeKey, afterKey] of [['name', 'Name'], ['Name', 'name']]) {
      const before = { resourceType: 'Organization', id: 'a', [beforeKey as string]: 'A' }
      const after = { resourceType: 'Organization', id: 'a', [afterKey as string]: 'B' }
      const [description] = compare(before, after).descriptions
      expect(description?.source).toBe('rule')
      expect(description?.text).toBe('Namn ändrades från ”A” till ”B”')
    }
  })
})
