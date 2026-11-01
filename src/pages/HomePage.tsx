import { AppHeader } from '../components/layout/AppHeader'
import { IgInfo } from '../components/layout/IgInfo'
import { HVO_IG_MANIFEST } from '../core/profiles/hvoManifest'

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <IgInfo manifest={HVO_IG_MANIFEST} />
        <section className="rounded-lg border border-dashed border-slate-300 p-4 text-slate-600">
          Jämförelse av två resurser med semantisk diff kommer i nästa version.
        </section>
      </main>
    </div>
  )
}
