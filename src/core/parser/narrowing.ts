import type { JsonArray, JsonObject, JsonValue } from '../../types/json'

export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isJsonArray(value: JsonValue | undefined): value is JsonArray {
  return Array.isArray(value)
}

export function getString(obj: JsonObject, key: string): string | undefined {
  const value = obj[key]
  return typeof value === 'string' ? value : undefined
}

export function getObject(obj: JsonObject, key: string): JsonObject | undefined {
  const value = obj[key]
  return isJsonObject(value) ? value : undefined
}

/** FHIR repeating elements are arrays; a missing element is treated as empty. */
export function getArray(obj: JsonObject, key: string): JsonArray {
  const value = obj[key]
  return isJsonArray(value) ? value : []
}

function step(value: JsonValue | undefined, segment: string): JsonValue | undefined {
  if (isJsonArray(value)) return /^\d+$/.test(segment) ? value[Number(segment)] : undefined
  if (isJsonObject(value)) return value[segment]
  return undefined
}

/**
 * Reads a dotted path such as "coding.0.code" and returns the primitive at the
 * end, or undefined if any step is missing. Numeric segments index into arrays.
 * Used for list match keys.
 */
export function getPrimitiveAtPath(value: JsonValue, path: string): string | number | boolean | undefined {
  let current: JsonValue | undefined = value
  for (const segment of path.split('.')) {
    current = step(current, segment)
  }
  if (typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean') {
    return current
  }
  return undefined
}

/**
 * Looks up a key that may come from user input in a plain lookup table.
 * A bare table[key] would return inherited members such as Object.prototype.constructor
 * for keys like "constructor" or "toString", which crashes or garbles the caller.
 */
export function getOwn<T>(table: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined
}
