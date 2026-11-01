import { describe, expect, it } from 'vitest'
import { getArray, getPrimitiveAtPath, getString } from '../../src/core/parser/narrowing'

describe('narrowing helpers', () => {
  const item = { system: 'urn:oid:2.5.4.97', coding: [{ code: 'abc' }], active: true }

  it('reads nested paths through objects and array indices', () => {
    expect(getPrimitiveAtPath(item, 'system')).toBe('urn:oid:2.5.4.97')
    expect(getPrimitiveAtPath(item, 'coding.0.code')).toBe('abc')
    expect(getPrimitiveAtPath(item, 'active')).toBe(true)
  })

  it('returns undefined for missing or non-primitive targets', () => {
    expect(getPrimitiveAtPath(item, 'coding.1.code')).toBeUndefined()
    expect(getPrimitiveAtPath(item, 'coding')).toBeUndefined()
    expect(getPrimitiveAtPath(item, 'coding.code')).toBeUndefined()
    expect(getPrimitiveAtPath('text', 'system')).toBeUndefined()
  })

  it('treats wrongly typed elements as absent', () => {
    const obj = { name: 42, identifier: 'not-an-array' }
    expect(getString(obj, 'name')).toBeUndefined()
    expect(getArray(obj, 'identifier')).toEqual([])
  })
})
