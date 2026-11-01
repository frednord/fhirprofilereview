import { describeIgVersion, isPinnedVersion, type IgManifest } from '../../core/profiles/igManifest'

interface IgInfoProps {
  manifest: IgManifest
}

export function IgInfo({ manifest }: IgInfoProps) {
  const pinned = isPinnedVersion(manifest.version)
  return (
    <section aria-labelledby="ig-info-heading" className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 id="ig-info-heading" className="font-medium text-slate-900">
        Implementationsguide
      </h2>
      <p className="text-slate-700">
        {manifest.title}, {manifest.publisher}
      </p>
      <p className={pinned ? 'text-sm text-slate-600' : 'text-sm text-amber-700'}>
        Version: {describeIgVersion(manifest)} · FHIR {manifest.fhirVersion}
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Profiler: {manifest.profiles.map((profile) => profile.name).join(', ')}
      </p>
    </section>
  )
}
