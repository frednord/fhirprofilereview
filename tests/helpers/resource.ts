import type { FhirResource } from '../../src/types/fhir'
import type { JsonValue } from '../../src/types/json'

export function resource(resourceType: string, fields: Record<string, JsonValue> = {}): FhirResource {
  return { resourceType, ...fields }
}
