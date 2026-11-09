import type { JsonValue } from '../../types/json'
import type { IgManifest } from '../profiles/igManifest'
import type { ListMatchKeyConfig } from './listMatchKeys'
import type { MatchReason } from './matchListItems'

export type ChangeKind = 'added' | 'removed' | 'changed' | 'moved'

/**
 * One step in the path to a change. List items carry both indexes and the key
 * they were identified by, so later layers can say "the identifier with system X"
 * instead of "identifier[0]".
 */
export type PathSegment =
  | {
      kind: 'property'
      name: string
      /**
       * The key in the before version, when it is spelt differently there,
       * e.g. "valuePeriod" when name is "ValuePeriod". See KeySpellingWarning.
       */
      beforeName?: string
    }
  | {
      kind: 'item'
      beforeIndex: number | undefined
      afterIndex: number | undefined
      matchedBy: MatchReason
      /** Match-key path to value, e.g. { system: 'urn:oid:1.2.752.29.4.19' }. Absent when no key applied. */
      key?: Readonly<Record<string, string>>
    }

export interface DiffChange {
  kind: ChangeKind
  path: readonly PathSegment[]
  /**
   * FHIR element path without list positions, e.g. "Organization.identifier.value".
   * Resources inside contained or Bundle.entry start over from their own type,
   * so the path can be looked up in that resource's profile.
   */
  elementPath: string
  /** For 'moved', the same value on both sides. */
  before?: JsonValue
  after?: JsonValue
  /** Where a moved value used to be. Path and elementPath above say where it is now. */
  from?: { path: readonly PathSegment[]; elementPath: string }
}

export type DiffWarningKind = 'resource-type-mismatch' | 'id-mismatch'

export interface DiffWarning {
  kind: DiffWarningKind
  before: string | undefined
  after: string | undefined
}

/**
 * A key spelt differently in the two versions, e.g. "valuePeriod" before and
 * "ValuePeriod" after. The values are still compared as the same field, but a
 * FHIR reader would not see the misspelt key as that element at all.
 */
export interface KeySpellingWarning {
  /** Where the key is, with the after spelling; the last segment carries the before spelling. */
  path: readonly PathSegment[]
  elementPath: string
  beforeKey: string
  afterKey: string
  /** True when the keys only differ in upper and lower case. */
  caseOnly: boolean
}

export interface DiffIgContext {
  packageId: string
  version: string
  pinned: boolean
}

export interface DiffResult {
  resourceType: string
  changes: DiffChange[]
  warnings: DiffWarning[]
  /** Keys spelt differently in the two versions, in after-order. */
  keyWarnings: KeySpellingWarning[]
  ig?: DiffIgContext
}

export interface DiffOptions {
  /** Merged over DEFAULT_LIST_MATCH_KEYS; an entry here replaces the default for that element. */
  matchKeys?: ListMatchKeyConfig
  /**
   * Element paths whose changes are left out, including everything below them.
   * "Organization.meta" applies to Organization only; "meta.lastUpdated" applies
   * to every resource, including contained ones.
   */
  ignorePaths?: readonly string[]
  /**
   * Reports a value removed in one place and added unchanged in another as one
   * 'moved' change. On by default; see detectMoves.
   */
  detectMoves?: boolean
  /** The IG the comparison is made against, echoed in the result so reports state their version. */
  ig?: IgManifest
}
