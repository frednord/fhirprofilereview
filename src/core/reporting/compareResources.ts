import { diffResources } from '../diff/diffResources'
import type { DiffResult, DiffWarning } from '../diff/types'
import { locateJsonError } from '../parser/jsonErrorLocation'
import { getString } from '../parser/narrowing'
import { parseResource } from '../parser/parseResource'
import type { IgManifest } from '../profiles/igManifest'
import type { FhirResource } from '../../types/fhir'
import { describeChanges } from './describeChanges'
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
  /** Changes left out because of ignorePaths, so the page can say that something was hidden. */
  hiddenCount: number
}

export type CompareOutcome =
  | { ok: true; comparison: Comparison }
  | { ok: false; before: InputStatus; after: InputStatus }

/**
 * Reads one input and says, in Swedish, what it is or why it cannot be used.
 * Invalid JSON gets the line and column where parsing stopped, since the
 * browser's own message is in English and often says nothing about where.
 */
export function inspectInput(text: string): InputStatus {
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
  if (!before.ok || !after.ok) return { ok: false, before, after }

  const options = settings.ig === undefined ? {} : { ig: settings.ig }
  const diff = diffResources(before.resource, after.resource, { ...options, ignorePaths: settings.ignorePaths })
  // Diffing again without ignorePaths is the simplest way to count exactly what the setting hid.
  const hiddenCount =
    settings.ignorePaths.length === 0
      ? 0
      : diffResources(before.resource, after.resource, options).changes.length - diff.changes.length
  const descriptions = describeChanges(before.resource, after.resource, diff, settings.labels)

  return {
    ok: true,
    comparison: {
      diff,
      descriptions,
      counts: countChanges(descriptions),
      warnings: diff.warnings.map(describeWarning),
      hiddenCount,
    },
  }
}
