import { isJsonArray, isJsonObject } from '../../src/core/parser/narrowing'
import { parseResource } from '../../src/core/parser/parseResource'
import type { FhirResource } from '../../src/types/fhir'
import type { JsonValue } from '../../src/types/json'

export const HVO_FIXTURE_DIR = 'se.electronichealth.fhir.hvo.r5@0.5.1'

// Loaded as raw text so the checksum test sees the exact bytes and the parser is exercised as in the app.
const RAW_FILES = import.meta.glob<string>('../fixtures/se.electronichealth.fhir.hvo.r5@0.5.1/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
})

export function rawFixture(file: string): string {
  const text = RAW_FILES[`../fixtures/${HVO_FIXTURE_DIR}/${file}`]
  if (text === undefined) throw new Error(`Fixture saknas: ${file}`)
  return text
}

/** Parses a fixture afresh on every call, so tests can modify their copy freely. */
export function loadFixture(file: string): FhirResource {
  const result = parseResource(rawFixture(file))
  if (!result.ok) throw new Error(`${file}: ${result.error.message}`)
  return result.resource
}

/** Takes one resource out of a Bundle fixture, by resource id. */
export function loadBundleEntry(file: string, id: string): FhirResource {
  const entries = loadFixture(file)['entry']
  const found = isJsonArray(entries)
    ? entries.map((entry) => (isJsonObject(entry) ? entry['resource'] : undefined)).find((r) => isJsonObject(r) && r['id'] === id)
    : undefined
  const result = parseResource(JSON.stringify(found ?? null))
  if (!result.ok) throw new Error(`${file}#${id}: ${result.error.message}`)
  return result.resource
}

/** Narrowing for test edits on nested parts of a fixture. */
export function asObject(value: JsonValue | undefined): Record<string, JsonValue> {
  if (!isJsonObject(value)) throw new Error('Förväntade ett objekt')
  return value
}

export function asArray(value: JsonValue | undefined): JsonValue[] {
  if (!isJsonArray(value)) throw new Error('Förväntade en lista')
  return value
}
