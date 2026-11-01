import type { JsonValue } from '../../types/json'
import { isJsonArray, isJsonObject } from '../parser/narrowing'

/**
 * Structural equality for JSON. Object key order is ignored because it carries
 * no meaning in FHIR JSON; array order is kept because lists are matched separately.
 */
export function jsonEqual(a: JsonValue, b: JsonValue): boolean {
  if (isJsonArray(a)) {
    return isJsonArray(b) && a.length === b.length && a.every((item, index) => jsonEqual(item, b[index] ?? null))
  }
  if (isJsonObject(a)) {
    if (!isJsonObject(b)) return false
    const keys = Object.keys(a)
    if (keys.length !== Object.keys(b).length) return false
    return keys.every((key) => Object.hasOwn(b, key) && jsonEqual(a[key] ?? null, b[key] ?? null))
  }
  return a === b
}
