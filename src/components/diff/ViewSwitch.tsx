export type ResultView = 'list' | 'map'

const VIEWS: readonly { view: ResultView; label: string }[] = [
  { view: 'list', label: 'Lista' },
  { view: 'map', label: 'Karta' },
]

interface ViewSwitchProps {
  view: ResultView
  onChange: (view: ResultView) => void
}

export function ViewSwitch({ view, onChange }: ViewSwitchProps) {
  return (
    <div role="group" aria-label="Visa resultatet som" className="inline-flex overflow-hidden rounded-md border border-slate-300 text-sm">
      {VIEWS.map((item) => (
        <button
          key={item.view}
          type="button"
          aria-pressed={view === item.view}
          onClick={() => onChange(item.view)}
          className={view === item.view ? 'bg-sky-700 px-3 py-1 font-medium text-white' : 'bg-white px-3 py-1 text-slate-700 hover:bg-slate-100'}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
