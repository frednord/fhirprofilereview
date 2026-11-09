import type { ChangeKind } from '../../diff/types'
import type { ResourceRef } from '../compareResources'

/**
 * One change in a review report.
 *
 * The id is stable for the same pair of resources, so review status and
 * comments can later be stored per id and attached here as optional fields
 * without changing how the report is built from a comparison.
 */
export interface ReportEntry {
  id: string
  /** Position in the report, from 1, so a reader can refer to "ändring 3". */
  number: number
  kind: ChangeKind
  /** "Tillagd", "Ändrad" … */
  kindLabel: string
  text: string
  path: string
  /** True when part of the text is the raw path because a Swedish label is missing. */
  missingLabel: boolean
}

export interface ReportKeyWarning {
  text: string
  path: string
}

/**
 * Everything a review report says, independent of the output format, so
 * Markdown, HTML for print and later formats show exactly the same content.
 */
export interface ReviewReport {
  title: string
  /** When the report was made, "2026-11-09 12:30" in local time. */
  createdAt: string
  before: ResourceRef
  after: ResourceRef
  /** "se.electronichealth.fhir.hvo.r5@0.5.1", when the comparison used an IG. */
  ig: string | undefined
  /** Profiles whose labels described the changes, in the order first used. */
  profiles: string[]
  /** "0 tillagda, 1 borttagen, 3 ändrade", limited to the kinds in the report. */
  summary: string
  /** Which change kinds the report includes, e.g. "Tillagda, Ändrade". */
  selection: string
  /** "Visar 3 av 5 ändringar." when the selection leaves changes out. */
  selectionNote: string | undefined
  /** "1 ändring av meta.lastUpdated är dold." when a setting hid changes. */
  hiddenNote: string | undefined
  /** "Resurserna är lika." and similar, when there are no changes at all. */
  equalNote: string | undefined
  warnings: string[]
  keyWarnings: ReportKeyWarning[]
  entries: ReportEntry[]
}
