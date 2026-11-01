import { describe, expect, it } from 'vitest'
import { formatPath } from '../../src/core/diff/formatPath'

describe('formatPath', () => {
  it('joins properties with dots', () => {
    expect(formatPath([{ kind: 'property', name: 'address' }, { kind: 'property', name: 'city' }])).toBe('address.city')
  })

  it('shows list items by key when they have one', () => {
    expect(
      formatPath([
        { kind: 'property', name: 'identifier' },
        { kind: 'item', beforeIndex: 0, afterIndex: 1, matchedBy: 'key', key: { system: 'urn:oid:1.2.752.29.4.19' } },
        { kind: 'property', name: 'value' },
      ]),
    ).toBe('identifier[system=urn:oid:1.2.752.29.4.19].value')
  })

  it('falls back to the index in the after version, or before for removed items', () => {
    const item = (beforeIndex: number | undefined, afterIndex: number | undefined) => [
      { kind: 'property' as const, name: 'alias' },
      { kind: 'item' as const, beforeIndex, afterIndex, matchedBy: 'position' as const },
    ]
    expect(formatPath(item(0, 2))).toBe('alias[2]')
    expect(formatPath(item(3, undefined))).toBe('alias[3]')
  })

  it('returns an empty string for the resource itself', () => {
    expect(formatPath([])).toBe('')
  })
})
