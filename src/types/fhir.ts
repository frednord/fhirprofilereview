import type { JsonObject } from './json'

/**
 * The only shape the app relies on before profile-aware processing: a JSON
 * object with a resourceType. Everything else is read through the narrowing
 * helpers in src/core/parser so that partial or non-conformant resources can
 * still be compared and validated.
 */
export interface FhirResource extends JsonObject {
  resourceType: string
}
