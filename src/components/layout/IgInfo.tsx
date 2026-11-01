import { describeIgVersion, isPinnedVersion, type IgManifest } from '../../core/profiles/igManifest'

interface IgInfoProps {
  manifest: IgManifest
}

/** One line, so the inputs stay above the fold. */
export function IgInfo({ manifest }: IgInfoProps) {
  const pinned = isPinnedVersion(manifest.version)
  return (
    <section
      aria-label="Implementationsguide"
      className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
    >
      <span className="font-medium text-slate-900">
        {manifest.title}, {manifest.publisher}
      </span>
      <span className={pinned ? undefined : 'text-amber-700'}>
        {describeIgVersion(manifest)} · FHIR {manifest.fhirVersion}
      </span>
      <span>Profiler: {manifest.profiles.map((profile) => profile.name).join(', ')}</span>
    </section>
  )
}
