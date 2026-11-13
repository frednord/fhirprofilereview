import { describe, expect, it } from 'vitest'
import { locateJsonError, locationOfOffset, type JsonProblemKind } from '../../src/core/parser/jsonErrorLocation'
import { rawFixture } from '../helpers/hvoFixtures'

describe('locateJsonError', () => {
  it('counts lines and columns from 1', () => {
    expect(locationOfOffset('ab\ncd', 4)).toEqual({ line: 2, column: 2 })
  })

  it.each<[string, number, number, JsonProblemKind]>([
    ['{\n  "a": 1,\n  "b": }\n', 3, 8, 'missing-value'],
    ['{"a": 1,}', 1, 9, 'trailing-comma'],
    ['[1, 2,\n]', 2, 1, 'trailing-comma'],
    ['{"a" 1}', 1, 6, 'missing-colon'],
    ["{'a': 1}", 1, 2, 'single-quote'],
    ["{\"a\": 'x'}", 1, 7, 'single-quote'],
    ['{"a": “x”}', 1, 7, 'typographic-quote'],
    ['{"a": 1 // kommentar\n}', 1, 9, 'comment'],
    ['{/* x */ "a": 1}', 1, 2, 'comment'],
    ['{a: 1}', 1, 2, 'unquoted-key'],
    ['{"a": 1 "b": 2}', 1, 9, 'missing-comma'],
    ['[{"a": 1} {"b": 2}]', 1, 11, 'missing-comma'],
    ['{"a": [1, 2}', 1, 12, 'mismatched-bracket'],
    ['{"a": [1, 2', 1, 12, 'unexpected-end'],
    ['{"a": ', 1, 7, 'unexpected-end'],
    ['{"a": "x\ny"}', 1, 9, 'control-character-in-string'],
    ['{"a": "x\\qy"}', 1, 9, 'invalid-escape'],
    ['{"a": "\\u12G4"}', 1, 8, 'invalid-escape'],
    ['{"a": "abc}', 1, 7, 'unterminated-string'],
    ['{"a": tru}', 1, 7, 'unknown-word'],
    ['{"a": True}', 1, 7, 'unknown-word'],
    ['{"a": undefined}', 1, 7, 'unknown-word'],
    ['{"a": 01}', 1, 8, 'invalid-number'],
    ['{"a": 1.}', 1, 8, 'invalid-number'],
    ['{"a": +1}', 1, 7, 'invalid-number'],
    ['{"a": -}', 1, 7, 'invalid-number'],
    ['{} x', 1, 4, 'extra-content'],
    ['{}\n{}', 2, 1, 'extra-content'],
    ['{"a": 1}', 1, 6, 'unexpected-character'],
    ['', 1, 1, 'unexpected-end'],
  ])('finds the error in %j at line %i column %i: %s', (text, line, column, kind) => {
    expect(() => JSON.parse(text)).toThrow()
    expect(locateJsonError(text)).toMatchObject({ line, column, problem: { kind } })
  })

  it('says what was found and what was expected', () => {
    expect(locateJsonError('{"a": 1,}')?.problem).toEqual({ kind: 'trailing-comma', found: '}' })
    expect(locateJsonError('{"a": [1}')?.problem).toEqual({ kind: 'mismatched-bracket', found: '}', expected: ']' })
    expect(locateJsonError('{"a": True}')?.problem).toEqual({ kind: 'unknown-word', found: 'True' })
    expect(locateJsonError('{"a": "\\x"}')?.problem).toEqual({ kind: 'invalid-escape', found: '\\x' })
  })

  it('accepts everything JSON.parse accepts', () => {
    for (const text of [
      '{"a": [1, -2.5e3, 0, 0.5, 1E+2, true, false, null, "x\\u00e5\\n\\"\\\\\\/"], "b": {}, "": ""}',
      ' [] ',
      '"text"',
      rawFixture('bundle-58e286ab-601c-401a-bd2f-48b1a66bb889.json'),
    ]) {
      expect(() => JSON.parse(text)).not.toThrow()
      expect(locateJsonError(text)).toBeUndefined()
    }
  })
})
