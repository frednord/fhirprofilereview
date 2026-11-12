import { describe, expect, it } from 'vitest'
import { locateJsonError, type JsonProblemKind } from '../../src/core/parser/jsonErrorLocation'
import { describeCharacter, describeJsonProblem } from '../../src/core/parser/jsonProblems'

function problemText(text: string): string {
  const error = locateJsonError(text)
  if (error === undefined) throw new Error('Förväntade ett fel')
  return describeJsonProblem(error.problem)
}

describe('describeJsonProblem', () => {
  it.each([
    ['{"a": 1,}', 'kommatecken före ”}”. JSON tillåter inget kommatecken efter sista värdet'],
    ['{"a": }', 'ett värde saknas före ”}”'],
    ["{'a': 1}", 'enkla citattecken. JSON kräver dubbla citattecken (") runt text och nycklar'],
    ['{"a": [1}', 'fel sorts klammer: ”}” stänger, men ”]” väntades'],
    ['{"a": True}', 'okänt ord ”True”. JSON känner bara till true, false och null, och text skrivs inom dubbla citattecken'],
    ['{"a": "x\ny"}', 'radbrytning inne i en text. Skriv \\n i stället för att bryta raden'],
    ['{"a": 1}', 'oväntat tecken: ett hårt mellanslag (U+00A0)'],
    ['{"a": “x”}', 'typografiskt citattecken (“). Använd raka dubbla citattecken ("). De byts ofta ut när text kopieras från Word eller e-post'],
  ])('describes %j', (text, expected) => {
    expect(problemText(text)).toBe(expected)
  })

  it('has a text for every kind', () => {
    const kinds: JsonProblemKind[] = [
      'trailing-comma', 'missing-value', 'single-quote', 'typographic-quote', 'comment', 'unquoted-key',
      'missing-colon', 'missing-comma', 'mismatched-bracket', 'unexpected-end', 'unterminated-string',
      'control-character-in-string', 'invalid-escape', 'unknown-word', 'invalid-number', 'extra-content',
      'unexpected-character',
    ]
    for (const kind of kinds) expect(describeJsonProblem({ kind, found: 'x' })).toMatch(/^\S/)
  })
})

describe('describeCharacter', () => {
  it('quotes visible characters and names invisible ones', () => {
    expect(describeCharacter('}')).toBe('”}”')
    expect(describeCharacter('﻿')).toBe('ett osynligt BOM-tecken (U+FEFF)')
    expect(describeCharacter('\u0001')).toBe('ett styrtecken (U+0001)')
  })
})
