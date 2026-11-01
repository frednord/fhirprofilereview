import type { DiffChange } from '../diff/types'

/**
 * Recognises a list item: each dotted path (as in list match keys, e.g.
 * "coding.0.code") must hold a primitive that equals the string or matches the
 * pattern. Mirrors a slice discriminator in the profile.
 */
export type ItemCondition = Readonly<Record<string, string | RegExp>>

/**
 * A named slice of a repeating element, e.g. identifier:hsaid.
 *
 * The label may contain placeholders: "{telecom.0.system|<system>}" reads a
 * code from the item and shows its Swedish name from the code labels, and
 * "{purpose.coding.0}" shows the name of a Coding.
 */
export interface SliceLabel {
  /** Element path of the list, e.g. "Organization.identifier". */
  element: string
  /** Slice name in the profile's StructureDefinition; checked by tests against the IG. */
  sliceName: string
  when: ItemCondition
  label: string
  /**
   * Child element that carries the slice's value, so a change there is described
   * by the slice label alone ("HSA-id", not "HSA-id, värde"). "value[x]" covers
   * every choice type such as valueBoolean or valuePeriod.
   */
  valueElement?: string
  /** Labels for child elements relative to the item, overriding the shared child labels. */
  children?: Readonly<Record<string, string>>
}

/** Swedish labels for one profile. Pure data; the describing code knows nothing of HVO. */
export interface ProfileLabels {
  /** Profile name as in the IG, e.g. "HVOOrganization". */
  profile: string
  /** Canonical URL, used to pick the profile from meta.profile. */
  url: string
  resourceType: string
  /** What the resource is called in a sentence, e.g. "Verksamhet". */
  resourceLabel: string
  /** Element path to label, e.g. "Organization.name" → "Namn". */
  elements: Readonly<Record<string, string>>
  slices: readonly SliceLabel[]
}

export interface LabelSet {
  /** In priority order: when several profiles fit a resource, the first label found wins. */
  profiles: readonly ProfileLabels[]
  /** Swedish names of codes, keyed "system|code". */
  codes: Readonly<Record<string, string>>
  /** Labels for data type children shared by all profiles, e.g. "period.start" → "giltig från". */
  childLabels: Readonly<Record<string, string>>
}

/** "rule" when every part of the label came from label data, "fallback" when part of the raw path is shown. */
export type DescriptionSource = 'rule' | 'fallback'

export interface ChangeDescription {
  change: DiffChange
  /** Profiles whose labels were used for the resource the change is in. */
  profiles: readonly string[]
  label: string
  text: string
  source: DescriptionSource
}
