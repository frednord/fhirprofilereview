import type { FhirResource } from '../../types/fhir'
import type { JsonValue } from '../../types/json'
import { isJsonObject } from './narrowing'

export type ParseErrorKind = 'empty-input' | 'invalid-json' | 'not-an-object' | 'missing-resource-type'

export interface ParseError {
  kind: ParseErrorKind
  message: string
}

export type ParseResult = { ok: true; resource: FhirResource } | { ok: false; error: ParseError }

const ERROR_MESSAGES: Record<ParseErrorKind, string> = {
  'empty-input': 'Ingen resurs angiven.',
  'invalid-json': 'Texten är inte giltig JSON.',
  'not-an-object': 'En FHIR-resurs måste vara ett JSON-objekt.',
  'missing-resource-type': 'Resursen saknar resourceType.',
}

function failure(kind: ParseErrorKind, detail?: string): ParseResult {
  const message = detail ? `${ERROR_MESSAGES[kind]} ${detail}` : ERROR_MESSAGES[kind]
  return { ok: false, error: { kind, message } }
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

  if (!isJsonObject(parsed)) return failure('not-an-object')

  const resourceType = parsed['resourceType']
  if (typeof resourceType !== 'string' || resourceType === '') return failure('missing-resource-type')

  return { ok: true, resource: { ...parsed, resourceType } }
}
