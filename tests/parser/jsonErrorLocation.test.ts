import { describe, expect, it } from 'vitest'
import { locateJsonError, locationOfOffset } from '../../src/core/parser/jsonErrorLocation'
import { rawFixture } from '../helpers/hvoFixtures'

describe('locateJsonError', () => {
  it('counts lines and columns from 1', () => {
    expect(locationOfOffset('ab\ncd', 4)).toEqual({ line: 2, column: 2 })
  })

  it.each([
    ['{\n  "a": 1,\n  "b": }\n', 3, 8],
    ['{"a": 1,}', 1, 9],
    ['{"a" 1}', 1, 6],
    ["{'a': 1}", 1, 2],
    ['{"a": [1, 2', 1, 12],
    ['{"a": tru}', 1, 7],
    ['{"a": 01}', 1, 8],
    ['{} x', 1, 4],
    ['', 1, 1],
  ])('finds the error in %j at line %i column %i', (text, line, column) => {
    expect(locateJsonError(text)).toEqual({ line, column })
  })

  it('accepts everything JSON.parse accepts', () => {
    for (const text of ['{"a": [1, -2.5e3, true, false, null, "x\\u00e5\\n"], "b": {}}', ' [] ', rawFixture('bundle-58e286ab-601c-401a-bd2f-48b1a66bb889.json')]) {
      expect(() => JSON.parse(text)).not.toThrow()
      expect(locateJsonError(text)).toBeUndefined()
    }
  })
})
