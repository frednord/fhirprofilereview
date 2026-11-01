import { ComparisonResult } from '../components/diff/ComparisonResult'
import { ResourceInput } from '../components/editor/ResourceInput'
import { AppHeader } from '../components/layout/AppHeader'
import { IgInfo } from '../components/layout/IgInfo'
import { HVO_IG_MANIFEST } from '../core/profiles/hvoManifest'
import { LAST_UPDATED_PATH, useComparison } from '../hooks/useComparison'
import { DEMO_AFTER, DEMO_BEFORE, demoText } from './demoExample'

const SECONDARY_BUTTON = 'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100'

export function ComparePage() {
  const state = useComparison()
  const { outcome } = state

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <IgInfo manifest={HVO_IG_MANIFEST} />
        <p className="text-sm text-slate-600">
          Jämförelsen körs helt i webbläsaren. Inget du klistrar in skickas vidare.
        </p>

        <section aria-label="Resurser att jämföra" className="grid gap-4 md:grid-cols-2">
          <ResourceInput label="Före" value={state.beforeText} status={state.beforeStatus} onChange={state.setBeforeText} />
          <ResourceInput label="Efter" value={state.afterText} status={state.afterStatus} onChange={state.setAfterText} />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={state.compare}
            disabled={!state.canCompare}
            className="rounded-md bg-sky-700 px-5 py-2 font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Jämför
          </button>
          <button type="button" onClick={state.swap} className={SECONDARY_BUTTON}>
            Byt plats
          </button>
          <button
            type="button"
            onClick={() => state.load(demoText(DEMO_BEFORE), demoText(DEMO_AFTER))}
            className={SECONDARY_BUTTON}
          >
            Visa exempel
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={state.hideLastUpdated}
              onChange={(event) => state.setHideLastUpdated(event.target.checked)}
            />
            Dölj {LAST_UPDATED_PATH}
          </label>
        </div>

        <section aria-label="Resultat" aria-live="polite" className="space-y-3">
          {state.stale && (
            <p className="text-sm text-amber-800">Resurserna har ändrats sedan jämförelsen. Klicka på Jämför igen.</p>
          )}
          {outcome?.ok === true && (
            <ComparisonResult key={state.runId} comparison={outcome.comparison} hiddenPath={LAST_UPDATED_PATH} />
          )}
        </section>
      </main>
    </div>
  )
}
