/**
 * Keys used to pair up items in repeating FHIR elements before diffing them.
 *
 * Matching by array index would report every item as changed when the order
 * shifts, so items are paired by the fields that identify them instead. Each
 * entry is a list of alternative keys tried in order; a key is one or more
 * dotted paths that must all be present on an item for it to be used.
 *
 * Keys are looked up by full element path first (e.g. "Group.characteristic")
 * and then by element name (e.g. "identifier"), so a general rule covers
 * identifier on every resource while a single element can still be overridden.
 * The defaults are chosen from what occurs in the HVO IG examples.
 */
export type MatchKey = readonly string[]
export type ListMatchKeyConfig = Readonly<Record<string, readonly MatchKey[]>>

const FIRST_CODING: MatchKey = ['coding.0.system', 'coding.0.code']

export const DEFAULT_LIST_MATCH_KEYS: ListMatchKeyConfig = {
  // By element name
  identifier: [['system', 'value'], ['system']],
  extension: [['url']],
  modifierExtension: [['url']],
  coding: [['system', 'code']],
  // The bare system is a last resort so that a new phone number reads as a change, not as remove + add.
  telecom: [['system', 'value'], ['system', 'use'], ['system']],
  address: [['use', 'type'], ['use']],
  name: [['use']],
  // HVO contacts often share a purpose (several PROF contacts), so the telecom system is tried first to tell them apart.
  contact: [['purpose.coding.0.code', 'telecom.0.system'], ['purpose.coding.0.code']],
  type: [FIRST_CODING],
  category: [FIRST_CODING],
  specialty: [FIRST_CODING],
  characteristic: [FIRST_CODING],
  contained: [['resourceType', 'id']],
  entry: [['fullUrl'], ['resource.resourceType', 'resource.id']],
  endpoint: [['reference']],
  partOf: [['reference']],
  location: [['reference']],

  // By element path, where the same name has a different shape
  'Group.characteristic': [['code.coding.0.system', 'code.coding.0.code']],
}

/** Resolves the keys for a list, preferring an exact element path over the element name. */
export function resolveMatchKeys(config: ListMatchKeyConfig, elementPath: string, elementName: string): readonly MatchKey[] {
  if (Object.hasOwn(config, elementPath)) return config[elementPath] ?? []
  return config[elementName] ?? []
}
