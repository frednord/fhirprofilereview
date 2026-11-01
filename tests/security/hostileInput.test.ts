import { describe, expect, it } from 'vitest'
import { locateJsonError } from '../../src/core/parser/jsonErrorLocation'
import { getOwn } from '../../src/core/parser/narrowing'
import { exceedsDepth, MAX_JSON_DEPTH, parseResource } from '../../src/core/parser/parseResource'
import { HVO_LABELS } from '../../src/core/profiles/hvo/0.5.1'
import { compareResources, inspectInput } from '../../src/core/reporting'

const SETTINGS = { labels: HVO_LABELS, ignorePaths: [] }
const HSA_ID = 'urn:oid:1.2.752.29.4.19'

function nested(depth: number, inner = '1'): string {
  return `{"resourceType":"Organization","x":${'['.repeat(depth)}${inner}${']'.repeat(depth)}}`
}

// Names of Object.prototype members: a plain table[key] returns these for any key from user input.
const PROTOTYPE_KEYS = ['constructor', 'toString', 'hasOwnProperty', 'valueOf', '__proto__']

describe('getOwn', () => {
  it('ignores inherited members', () => {
    const table: Record<string, string> = { a: 'A' }
    expect(getOwn(table, 'a')).toBe('A')
    for (const key of PROTOTYPE_KEYS) expect(getOwn(table, key)).toBeUndefined()
  })
})

describe('field names that match Object.prototype members', () => {
  it.each(PROTOTYPE_KEYS)('compares a list under %s without throwing', (key) => {
    const before = `{"resourceType":"Organization","${key}":[1]}`
    const after = `{"resourceType":"Organization","${key}":[2]}`
    const outcome = compareResources(before, after, SETTINGS)
    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.comparison.descriptions).toHaveLength(1)
  })

  // valueOf is left out: it looks like a value[x] choice element and is named as one, which is intended.
  it.each(['constructor', 'toString', 'hasOwnProperty'])('does not put a function into the label for %s', (key) => {
    const resource = (value: string) =>
      JSON.stringify({ resourceType: 'Organization', identifier: [{ system: HSA_ID, value: 'a', [key]: value }] })
    const outcome = compareResources(resource('x'), resource('y'), SETTINGS)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    const [description] = outcome.comparison.descriptions
    expect(description?.text).not.toMatch(/function|native code/)
    expect(description?.text).toContain(key)
  })
})

describe('deeply nested input', () => {
  it('measures depth without recursion', () => {
    expect(exceedsDepth(JSON.parse(nested(5)), 10)).toBe(false)
    expect(exceedsDepth(JSON.parse(nested(10)), 10)).toBe(true)
    expect(exceedsDepth(JSON.parse(nested(100_000)), MAX_JSON_DEPTH)).toBe(true)
  })

  it('accepts nesting up to the limit', () => {
    // The resource object itself is one level, so the array may be one level shallower.
    expect(parseResource(nested(MAX_JSON_DEPTH - 1)).ok).toBe(true)
  })

  it('rejects valid JSON nested too deeply instead of overflowing the stack', () => {
    const result = parseResource(nested(100_000))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('too-deep')
    const outcome = compareResources(nested(100_000), nested(100_000, '2'), SETTINGS)
    expect(outcome.ok).toBe(false)
  })

  it('reports invalid, deeply nested JSON as invalid without a location', () => {
    const text = `{"resourceType":"Organization","x":${'['.repeat(100_000)}`
    expect(locateJsonError(text)).toBeUndefined()
    const status = inspectInput(text)
    expect(status).toEqual({ ok: false, empty: false, message: 'Texten är inte giltig JSON.' })
  })

  it('still locates errors in invalid JSON within the limit', () => {
    expect(locateJsonError(`${'['.repeat(10)}1,]`)).toEqual({ line: 1, column: 13 })
  })
})
