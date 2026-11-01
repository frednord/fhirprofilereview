import type { FhirResource } from '../../types/fhir'
import type { JsonValue } from '../../types/json'
import { isJsonObject } from './narrowing'

export type ParseErrorKind = 'empty-input' | 'invalid-json' | 'too-deep' | 'not-an-object' | 'missing-resource-type'

/**
 * The diff, the descriptions and the JSON error locator walk values recursively.
 * Unbounded nesting would overflow the call stack and take the whole page down,
 * so input is capped well above what any FHIR resource needs (a Bundle with
 * contained resources and nested extensions stays far below 30 levels).
 */
export const MAX_JSON_DEPTH = 100

export interface ParseError {
  kind: ParseErrorKind
  message: string
}

export type ParseResult = { ok: true; resource: FhirResource } | { ok: false; error: ParseError }

const ERROR_MESSAGES: Record<ParseErrorKind, string> = {
  'empty-input': 'Ingen resurs angiven.',
  'invalid-json': 'Texten är inte giltig JSON.',
  'too-deep': `JSON-strukturen är djupare än ${MAX_JSON_DEPTH} nivåer och kan inte vara en FHIR-resurs.`,
  'not-an-object': 'En FHIR-resurs måste vara ett JSON-objekt.',
  'missing-resource-type': 'Resursen saknar resourceType.',
}

function failure(kind: ParseErrorKind, detail?: string): ParseResult {
  const message = detail ? `${ERROR_MESSAGES[kind]} ${detail}` : ERROR_MESSAGES[kind]
  return { ok: false, error: { kind, message } }
}

/** Iterative on purpose: a recursive check would overflow on the very input it guards against. */
export function exceedsDepth(value: JsonValue, maxDepth: number): boolean {
  const pending: { value: JsonValue; depth: number }[] = [{ value, depth: 0 }]
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    if (typeof next.value !== 'object' || next.value === null) continue
    const depth = next.depth + 1
    if (depth > maxDepth) return true
    for (const child of Object.values(next.value)) pending.push({ value: child, depth })
  }
  return false
}

/**
 * Parses user input into a FhirResource without assuming anything beyond
 * resourceType. Deliberately lenient: non-conformant resources must still be
 * accepted so that the diff and validation steps can report what is wrong.
 */
export function parseResource(text: string): ParseResult {
  if (text.trim() === '') return failure('empty-input')

  let parsed: JsonValue
  try {
    parsed = JSON.parse(text) as JsonValue
  } catch (error) {
    return failure('invalid-json', error instanceof Error ? error.message : undefined)
  }

  if (exceedsDepth(parsed, MAX_JSON_DEPTH)) return failure('too-deep')
  if (!isJsonObject(parsed)) return failure('not-an-object')

  const resourceType = parsed['resourceType']
  if (typeof resourceType !== 'string' || resourceType === '') return failure('missing-resource-type')

  return { ok: true, resource: { ...parsed, resourceType } }
}
