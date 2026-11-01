import { describe, expect, it } from 'vitest'
import { parseResource } from '../../src/core/parser/parseResource'

describe('parseResource', () => {
  it('accepts an object with a resourceType', () => {
    const result = parseResource('{"resourceType":"Organization","name":"Region X"}')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.resource.resourceType).toBe('Organization')
      expect(result.resource['name']).toBe('Region X')
    }
  })

  it('accepts non-conformant content so later steps can report on it', () => {
    const result = parseResource('{"resourceType":"Organization","identifier":"should be an array"}')
    expect(result.ok).toBe(true)
  })

  it.each([
    ['', 'empty-input'],
    ['   ', 'empty-input'],
    ['{not json', 'invalid-json'],
    ['[]', 'not-an-object'],
    ['"Organization"', 'not-an-object'],
    ['null', 'not-an-object'],
    ['{"name":"x"}', 'missing-resource-type'],
    ['{"resourceType":42}', 'missing-resource-type'],
    ['{"resourceType":""}', 'missing-resource-type'],
  ])('rejects %j as %s', (input, kind) => {
    const result = parseResource(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe(kind)
  })
})
