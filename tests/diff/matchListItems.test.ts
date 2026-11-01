import { describe, expect, it } from 'vitest'
import { describeMatchKey, matchListItems } from '../../src/core/diff/matchListItems'

const ORG_NR = 'urn:oid:2.5.4.97'
const HSA = 'urn:oid:1.2.752.29.4.19'

describe('matchListItems', () => {
  it('pairs identifiers by system and value regardless of order', () => {
    const before = [
      { system: ORG_NR, value: '1' },
      { system: HSA, value: 'SE1' },
    ]
    const after = [
      { system: HSA, value: 'SE1' },
      { system: ORG_NR, value: '1' },
    ]
    expect(matchListItems('identifier', before, after)).toEqual([
      { beforeIndex: 1, afterIndex: 0, reason: 'key' },
      { beforeIndex: 0, afterIndex: 1, reason: 'key' },
    ])
  })

  it('pairs an identifier whose value changed by its system, so it is reported as a change', () => {
    const before = [{ system: ORG_NR, value: '1' }]
    const after = [{ system: ORG_NR, value: '2' }]
    expect(matchListItems('identifier', before, after)).toEqual([{ beforeIndex: 0, afterIndex: 0, reason: 'key' }])
  })

  it('reports identifiers with different systems as removed and added', () => {
    const before = [{ system: ORG_NR, value: '1' }]
    const after = [{ system: HSA, value: '1' }]
    expect(matchListItems('identifier', before, after)).toEqual([
      { beforeIndex: 0, afterIndex: undefined, reason: 'unmatched' },
      { beforeIndex: undefined, afterIndex: 0, reason: 'unmatched' },
    ])
  })

  it('pairs extensions by url', () => {
    const before = [{ url: 'a', valueString: 'x' }, { url: 'b' }]
    const after = [{ url: 'b' }, { url: 'a', valueString: 'y' }]
    expect(matchListItems('extension', before, after)).toEqual([
      { beforeIndex: 1, afterIndex: 0, reason: 'key' },
      { beforeIndex: 0, afterIndex: 1, reason: 'key' },
    ])
  })

  it('uses array-indexed key paths', () => {
    const before = [{ coding: [{ system: 's', code: 'a' }] }, { coding: [{ system: 's', code: 'b' }] }]
    const after = [{ coding: [{ system: 's', code: 'b' }] }, { coding: [{ system: 's', code: 'a' }] }]
    expect(matchListItems('type', before, after).map((p) => [p.beforeIndex, p.afterIndex])).toEqual([
      [1, 0],
      [0, 1],
    ])
  })

  it('pairs elements without configured keys by equality before position', () => {
    const before = ['a', 'b', 'c']
    const after = ['c', 'a', 'x']
    expect(matchListItems('alias', before, after)).toEqual([
      { beforeIndex: 2, afterIndex: 0, reason: 'equal' },
      { beforeIndex: 0, afterIndex: 1, reason: 'equal' },
      { beforeIndex: 1, afterIndex: 2, reason: 'position' },
    ])
  })

  it('handles duplicate keys by pairing them in order', () => {
    const before = [{ url: 'a', v: 1 }, { url: 'a', v: 2 }]
    const after = [{ url: 'a', v: 1 }, { url: 'a', v: 3 }]
    expect(matchListItems('extension', before, after).map((p) => [p.beforeIndex, p.afterIndex])).toEqual([
      [0, 0],
      [1, 1],
    ])
  })

  it('reports additions and removals for empty lists', () => {
    expect(matchListItems('identifier', [], [{ system: ORG_NR, value: '1' }])).toEqual([
      { beforeIndex: undefined, afterIndex: 0, reason: 'unmatched' },
    ])
    expect(matchListItems('identifier', [{ system: ORG_NR, value: '1' }], [])).toEqual([
      { beforeIndex: 0, afterIndex: undefined, reason: 'unmatched' },
    ])
  })

  it('accepts profile-specific key overrides', () => {
    const before = [{ code: 'a', label: 'x' }]
    const after = [{ code: 'a', label: 'y' }, { code: 'b', label: 'x' }]
    expect(matchListItems('custom', before, after, { custom: [['code']] })).toEqual([
      { beforeIndex: 0, afterIndex: 0, reason: 'key' },
      { beforeIndex: undefined, afterIndex: 1, reason: 'unmatched' },
    ])
  })
})

describe('describeMatchKey', () => {
  const keys = [['system', 'value'], ['system']]

  it('describes a pair by the first key both sides agree on', () => {
    expect(describeMatchKey(keys, { system: ORG_NR, value: '1' }, { system: ORG_NR, value: '2' })).toEqual({ system: ORG_NR })
    expect(describeMatchKey(keys, { system: ORG_NR, value: '1' }, { system: ORG_NR, value: '1' })).toEqual({
      system: ORG_NR,
      value: '1',
    })
  })

  it('describes an added or removed item by the first key it has', () => {
    expect(describeMatchKey(keys, undefined, { system: HSA, value: 'SE1' })).toEqual({ system: HSA, value: 'SE1' })
    expect(describeMatchKey(keys, { system: HSA }, undefined)).toEqual({ system: HSA })
  })

  it('returns undefined when no key applies', () => {
    expect(describeMatchKey(keys, { value: '1' }, undefined)).toBeUndefined()
    expect(describeMatchKey([], 'a', 'a')).toBeUndefined()
  })
})
