import { detectMoves } from '../diff/detectMoves'
import { diffResources } from '../diff/diffResources'
import type { DiffResult, DiffWarning } from '../diff/types'
import { locateJsonError } from '../parser/jsonErrorLocation'
import { getString } from '../parser/narrowing'
import { parseResource } from '../parser/parseResource'
import type { IgManifest } from '../profiles/igManifest'
import type { FhirResource } from '../../types/fhir'
import { buildChangeMap, type ChangeMap } from './changeMap'
import { describeChanges } from './describeChanges'
import { describeKeyWarning, type KeyWarningDescription } from './keyWarnings'
import { countChanges, type ChangeCounts } from './summarizeChanges'
import type { ChangeDescription, LabelSet } from './types'

/** Changes on every save, so it hides the changes a reviewer is looking for. */
export const LAST_UPDATED_PATH = 'meta.lastUpdated'

/** meta.lastUpdated is hidden unless the user asks for it, for the reason above. */
export const HIDE_LAST_UPDATED_BY_DEFAULT = true

/** What the page says about one input before anything is compared. */
export type InputStatus =
  | { ok: true; resource: FhirResource; resourceType: string; id: string | undefined }
  | { ok: false; empty: boolean; message: string }

export interface CompareSettings {
  labels: LabelSet
  /** Element paths left out of the result, as in DiffOptions.ignorePaths. */
  ignorePaths: readonly string[]
  ig?: IgManifest
}

export interface Comparison {
  diff: DiffResult
  descriptions: ChangeDescription[]
  counts: ChangeCounts
  warnings: string[]
  /** Keys spelt differently in the two versions, e.g. valuePeriod and ValuePeriod. */
  keyWarnings: KeyWarningDescription[]
  /** Changes left out because of ignorePaths, so the page can say that something was hidden. */
  hiddenCount: number
  /** Both versions as trees with one link per change, for the change map. */
  map: ChangeMap
}

/** Shown when the analysis itself fails, so the user knows the input is kept and nothing was sent. */
export const INTERNAL_ERROR_MESSAGE =
  'Jämförelsen kunde inte genomföras på grund av ett internt fel. Resurserna finns kvar i fälten och inget har skickats någonstans.'

const INPUT_INTERNAL_ERROR_MESSAGE = 'Texten kunde inte läsas på grund av ett internt fel. Den finns kvar i fältet.'

export type CompareOutcome =
  | { ok: true; comparison: Comparison }
  | { ok: false; reason: 'invalid-input'; before: InputStatus; after: InputStatus }
  /** detail is the error's own message, for the console only; it is never shown on the page. */
  | { ok: false; reason: 'internal-error'; message: string; detail: string }

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Reads one input and says, in Swedish, what it is or why it cannot be used.
 * Invalid JSON gets the line and column where parsing stopped, since the
 * browser's own message is in English and often says nothing about where.
 */
export function inspectInput(text: string): InputStatus {
  // Runs on every keystroke. An unexpected error here would reach the error
  // boundary, which resets the page and throws away what the user pasted.
  try {
    return readInput(text)
  } catch {
    return { ok: false, empty: false, message: INPUT_INTERNAL_ERROR_MESSAGE }
  }
}

function readInput(text: string): InputStatus {
  const parsed = parseResource(text)
  if (parsed.ok) {
    const { resource } = parsed
    return { ok: true, resource, resourceType: resource.resourceType, id: getString(resource, 'id') }
  }
  const { error } = parsed
  if (error.kind !== 'invalid-json') return { ok: false, empty: error.kind === 'empty-input', message: error.message }
  const location = locateJsonError(text)
  const where = location === undefined ? '' : ` (rad ${location.line}, kolumn ${location.column})`
  return { ok: false, empty: false, message: `Texten är inte giltig JSON${where}.` }
}

export function describeWarning(warning: DiffWarning): string {
  const before = warning.before ?? '(saknas)'
  const after = warning.after ?? '(saknas)'
  if (warning.kind === 'resource-type-mismatch') {
    return `Resurserna är av olika typ: ${before} före och ${after} efter.`
  }
  return `Resurserna har olika id: ${before} före och ${after} efter. Kontrollera att det är samma resurs.`
}

/**
 * The whole comparison behind the page: parse both inputs, diff them and
 * describe each change in Swedish. Kept here rather than in the UI so that it
 * can be tested without a browser and reused from a CLI.
 */
export function compareResources(beforeText: string, afterText: string, settings: CompareSettings): CompareOutcome {
  const before = inspectInput(beforeText)
  const after = inspectInput(afterText)
  if (!before.ok || !after.ok) return { ok: false, reason: 'invalid-input', before, after }

  // The diff and the descriptions run on arbitrary user input. An error is
  // returned instead of thrown, so the page keeps both inputs instead of
  // falling back to the error boundary, which starts over with empty fields.
  try {
    return { ok: true, comparison: compare(before.resource, after.resource, settings) }
  } catch (error) {
    return { ok: false, reason: 'internal-error', message: INTERNAL_ERROR_MESSAGE, detail: errorDetail(error) }
  }
}

function compare(before: FhirResource, after: FhirResource, settings: CompareSettings): Comparison {
  const options = { detectMoves: false, ...(settings.ig === undefined ? {} : { ig: settings.ig }) }
  const raw = diffResources(before, after, { ...options, ignorePaths: settings.ignorePaths })
  // Diffing again without ignorePaths is the simplest way to count exactly what the setting hid.
  // Both counts are taken before moves are joined, since a move turns two changes into one.
  const hiddenCount =
    settings.ignorePaths.length === 0
      ? 0
      : diffResources(before, after, options).changes.length - raw.changes.length
  const diff = { ...raw, changes: detectMoves(raw.changes) }
  const descriptions = describeChanges(before, after, diff, settings.labels)

  return {
    diff,
    descriptions,
    counts: countChanges(descriptions),
    warnings: diff.warnings.map(describeWarning),
    keyWarnings: diff.keyWarnings.map(describeKeyWarning),
    hiddenCount,
    map: buildChangeMap(before, after, descriptions, settings.labels, diff.keyWarnings),
  }
}
