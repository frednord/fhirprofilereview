// Input is user-provided, so it is modelled as plain JSON and narrowed at runtime
// instead of being trusted as a complete FHIR type.
export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonArray
export type JsonArray = JsonValue[]
export interface JsonObject {
  [key: string]: JsonValue
}
