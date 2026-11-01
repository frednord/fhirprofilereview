/**
 * Describes exactly which version of an implementation guide the profiles and
 * test fixtures come from. Results are only reproducible against a fixed
 * version, so "current" or "latest" are never accepted as pinned.
 */
export interface ProfileRef {
  name: string
}

export interface IgManifest {
  title: string
  publisher: string
  packageId: string
  version: string
  fhirVersion: string
  sourceUrl: string
  profiles: readonly ProfileRef[]
}

// Exact semantic version, optionally with a pre-release tag such as 1.0.0-ballot.
const PINNED_VERSION_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/

export function isPinnedVersion(version: string): boolean {
  return PINNED_VERSION_PATTERN.test(version)
}

export function describeIgVersion(manifest: IgManifest): string {
  const label = `${manifest.packageId}@${manifest.version}`
  return isPinnedVersion(manifest.version) ? label : `${label} (ej låst version)`
}
