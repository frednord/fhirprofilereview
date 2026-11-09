import type { ChangeKind } from '../../diff/types'
import { formatChangePath } from '../changePath'
import type { Comparison, ResourceRef } from '../compareResources'
import {
  CHANGE_KINDS,
  filterByKind,
  formatCounts,
  formatHiddenNote,
  formatShownNote,
  KIND_FILTER_LABELS,
  KIND_LABELS,
} from '../summarizeChanges'
import type { ChangeDescription } from '../types'
import type { ReportEntry, ReviewReport } from './types'

export const REPORT_TITLE = 'Granskningsrapport'

export interface ReportOptions {
  /** Change kinds to include, as chosen in the filter on the page. */
  kinds: ReadonlySet<ChangeKind>
  /** The path hidden by the page setting, for the note on hidden changes. */
  hiddenPath: string
  /** Passed in rather than read from the clock, so the same input always gives the same report. */
  createdAt: Date
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** "2026-11-09 12:30" in local time, which is what a Swedish reader expects on a printout. */
export function formatReportTime(date: Date): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  return `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** "Organization/abc", or "Organization (utan id)". */
export function formatResourceRef(ref: ResourceRef): string {
  return ref.id === undefined ? `${ref.resourceType} (utan id)` : `${ref.resourceType}/${ref.id}`
}

function toEntry(description: ChangeDescription, index: number): ReportEntry {
  const { change } = description
  const path = formatChangePath(change)
  return {
    id: `${change.kind}:${path}`,
    number: index + 1,
    kind: change.kind,
    kindLabel: KIND_LABELS[change.kind],
    text: description.text,
    path,
    missingLabel: description.source === 'fallback',
  }
}

function usedProfiles(descriptions: readonly ChangeDescription[]): string[] {
  const seen = new Set<string>()
  for (const description of descriptions) for (const profile of description.profiles) seen.add(profile)
  return [...seen]
}

function equalNote(comparison: Comparison): string | undefined {
  if (comparison.descriptions.length > 0) return undefined
  return comparison.keyWarnings.length === 0 ? 'Resurserna är lika.' : 'Värdena är lika.'
}

function formatSelection(kinds: ReadonlySet<ChangeKind>): string {
  const chosen = CHANGE_KINDS.filter((kind) => kinds.has(kind))
  if (chosen.length === 0) return 'Inga ändringstyper'
  if (chosen.length === CHANGE_KINDS.length) return 'Alla ändringstyper'
  return chosen.map((kind) => KIND_FILTER_LABELS[kind]).join(', ')
}

/**
 * Builds the review report from a comparison, limited to the change kinds the
 * user has chosen, so the export says the same as the page. Warnings are
 * always included, since the page shows them whatever the filter.
 */
export function buildReviewReport(comparison: Comparison, options: ReportOptions): ReviewReport {
  const { kinds } = options
  const ig = comparison.diff.ig
  return {
    title: REPORT_TITLE,
    createdAt: formatReportTime(options.createdAt),
    before: comparison.before,
    after: comparison.after,
    ig: ig === undefined ? undefined : `${ig.packageId}@${ig.version}`,
    profiles: usedProfiles(comparison.descriptions),
    summary: formatCounts(comparison.counts, kinds),
    selection: formatSelection(kinds),
    selectionNote: formatShownNote(comparison.counts, kinds),
    hiddenNote: formatHiddenNote(comparison.hiddenCount, options.hiddenPath),
    equalNote: equalNote(comparison),
    warnings: [...comparison.warnings],
    keyWarnings: comparison.keyWarnings.map(({ text, path }) => ({ text, path })),
    entries: filterByKind(comparison.descriptions, kinds).map(toEntry),
  }
}

const FILE_NAME_UNSAFE = /[^A-Za-z0-9.-]+/g
const MAX_ID_LENGTH = 64

/**
 * "granskningsrapport-Organization-abc-2026-11-09", without extension. The id
 * comes from the user's JSON, so anything that is not safe in a file name is
 * replaced and the length is capped.
 */
export function reportFileName(report: ReviewReport): string {
  const { resourceType, id } = report.after
  const parts = [REPORT_TITLE.toLowerCase(), resourceType, id?.slice(0, MAX_ID_LENGTH), report.createdAt.slice(0, 10)]
  return parts
    .filter((part): part is string => part !== undefined && part !== '')
    .map((part) => part.replace(FILE_NAME_UNSAFE, '_'))
    .join('-')
}
