import type { FhirResource } from '../../types/fhir'
import { getString } from '../parser/narrowing'
import { isPinnedVersion, type IgManifest } from '../profiles/igManifest'
import { detectMoves } from './detectMoves'
import { diffValue } from './diffValue'
import { createIgnoreMatcher } from './ignorePaths'
import { DEFAULT_LIST_MATCH_KEYS } from './listMatchKeys'
import type { DiffChange, DiffIgContext, DiffOptions, DiffResult, DiffWarning, KeySpellingWarning } from './types'

function igContext(manifest: IgManifest): DiffIgContext {
  return { packageId: manifest.packageId, version: manifest.version, pinned: isPinnedVersion(manifest.version) }
}

function collectWarnings(before: FhirResource, after: FhirResource): DiffWarning[] {
  const warnings: DiffWarning[] = []
  if (before.resourceType !== after.resourceType) {
    warnings.push({ kind: 'resource-type-mismatch', before: before.resourceType, after: after.resourceType })
  }
  const beforeId = getString(before, 'id')
  const afterId = getString(after, 'id')
  // Comparing a resource with a new, id-less version is common, so only two different ids are flagged.
  if (beforeId !== undefined && afterId !== undefined && beforeId !== afterId) {
    warnings.push({ kind: 'id-mismatch', before: beforeId, after: afterId })
  }
  return warnings
}

/**
 * Compares two versions of a FHIR resource and lists what was added, removed,
 * changed and moved. Deterministic: the same input always gives the same output,
 * ordered by position in the after version.
 *
 * Different resource types or ids are reported as warnings, not errors, so the
 * user still sees the full comparison and can judge for themselves. So are keys
 * spelt differently in the two versions, e.g. valuePeriod and ValuePeriod:
 * their values are compared as one field, and the spelling is a key warning.
 */
export function diffResources(before: FhirResource, after: FhirResource, options: DiffOptions = {}): DiffResult {
  const changes: DiffChange[] = []
  const keyWarnings: KeySpellingWarning[] = []
  const matchKeys = { ...DEFAULT_LIST_MATCH_KEYS, ...options.matchKeys }
  diffValue(before, after, {
    path: [],
    elementPath: after.resourceType,
    matchKeys,
    isIgnored: createIgnoreMatcher(options.ignorePaths ?? []),
    changes,
    keyWarnings,
  })

  const result: DiffResult = {
    resourceType: after.resourceType,
    changes: options.detectMoves === false ? changes : detectMoves(changes, matchKeys),
    warnings: collectWarnings(before, after),
    keyWarnings,
  }
  if (options.ig !== undefined) result.ig = igContext(options.ig)
  return result
}
