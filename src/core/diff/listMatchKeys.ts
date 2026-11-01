/**
 * Keys used to pair up items in repeating FHIR elements before diffing them.
 *
 * Matching by array index would report every item as changed when the order
 * shifts, so items are paired by the fields that identify them instead. Each
 * entry is a list of alternative keys tried in order; a key is one or more
 * dotted paths that must all be present on an item for it to be used.
 *
 * Keys are looked up by element name (the last path segment), so the same rule
 * applies to identifier on Organization, Location and HealthcareService alike.
 * Profile-specific overrides can be passed to matchListItems.
 */
export type MatchKey = readonly string[]
export type ListMatchKeyConfig = Readonly<Record<string, readonly MatchKey[]>>

export const DEFAULT_LIST_MATCH_KEYS: ListMatchKeyConfig = {
  identifier: [['system', 'value'], ['system']],
  extension: [['url']],
  modifierExtension: [['url']],
  coding: [['system', 'code']],
  telecom: [['system', 'value'], ['system', 'use']],
  address: [['use', 'type'], ['use']],
  name: [['use']],
  contact: [['purpose.coding.0.code']],
  type: [['coding.0.system', 'coding.0.code']],
  endpoint: [['reference']],
  partOf: [['reference']],
}
