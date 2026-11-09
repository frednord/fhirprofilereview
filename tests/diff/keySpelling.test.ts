import { describe, expect, it } from 'vitest'
import { diffResources, pairMisspelledKeys } from '../../src/core/diff'
import { resource } from '../helpers/resource'

const PERIOD = { start: '2024-01-01' }

function extension(key: string, value: Record<string, string>) {
  return { extension: [{ url: 'http://example.org/period', [key]: value }] }
}

describe('pairMisspelledKeys', () => {
  it('pairs keys that only differ in case', () => {
    expect(pairMisspelledKeys(['valuePeriod'], ['ValuePeriod'])).toEqual([
      { beforeKey: 'valuePeriod', afterKey: 'ValuePeriod', caseOnly: true },
    ])
  })

  it('pairs keys one typo apart: a letter added, left out, replaced or swapped', () => {
    for (const typo of ['adress', 'addresss', 'adtress', 'adrdess']) {
      expect(pairMisspelledKeys(['address'], [typo])).toEqual([{ beforeKey: 'address', afterKey: typo, caseOnly: false }])
    }
  })

  it('leaves different elements alone', () => {
    expect(pairMisspelledKeys(['valueString'], ['valueBoolean'])).toEqual([])
    expect(pairMisspelledKeys(['valueCode'], ['valueCoding'])).toEqual([])
    // Short names are one letter from other real names, e.g. code and mode.
    expect(pairMisspelledKeys(['code'], ['mode'])).toEqual([])
  })

  it('does not take a primitive extension for a misspelling', () => {
    expect(pairMisspelledKeys(['_birthDate'], ['birthDate'])).toEqual([])
  })

  it('prefers a pair that only differs in case and pairs each key once', () => {
    expect(pairMisspelledKeys(['telecom', 'Telecom'], ['TELECOM', 'telcom'])).toEqual([
      { beforeKey: 'telecom', afterKey: 'TELECOM', caseOnly: true },
      { beforeKey: 'Telecom', afterKey: 'telcom', caseOnly: false },
    ])
  })
})

describe('diffResources with keys spelt differently', () => {
  it('warns instead of reporting a removed and an added field', () => {
    const result = diffResources(
      resource('Organization', extension('valuePeriod', PERIOD)),
      resource('Organization', extension('ValuePeriod', PERIOD)),
    )
    expect(result.changes).toEqual([])
    expect(result.keyWarnings).toEqual([
      {
        path: [
          { kind: 'property', name: 'extension' },
          { kind: 'item', beforeIndex: 0, afterIndex: 0, matchedBy: 'key', key: { url: 'http://example.org/period' } },
          { kind: 'property', name: 'ValuePeriod', beforeName: 'valuePeriod' },
        ],
        elementPath: 'Organization.extension.ValuePeriod',
        beforeKey: 'valuePeriod',
        afterKey: 'ValuePeriod',
        caseOnly: true,
      },
    ])
  })

  it('still compares the values under the two spellings', () => {
    const result = diffResources(
      resource('Organization', extension('valuePeriod', PERIOD)),
      resource('Organization', extension('ValuePeriod', { start: '2025-01-01' })),
    )
    expect(result.changes.map((c) => [c.kind, c.elementPath, c.before, c.after])).toEqual([
      ['changed', 'Organization.extension.ValuePeriod.start', '2024-01-01', '2025-01-01'],
    ])
    expect(result.keyWarnings).toHaveLength(1)
  })

  it('reports a key that exists on both sides as usual', () => {
    const result = diffResources(resource('Organization', { name: 'A' }), resource('Organization', { name: 'A', Name: 'A' }))
    expect(result.keyWarnings).toEqual([])
    expect(result.changes.map((c) => c.kind)).toEqual(['added'])
  })
})
