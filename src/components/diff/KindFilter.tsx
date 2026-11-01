import type { ChangeKind } from '../../core/diff'
import { CHANGE_KINDS, KIND_FILTER_LABELS, type ChangeCounts } from '../../core/reporting'

interface KindFilterProps {
  counts: ChangeCounts
  shown: ReadonlySet<ChangeKind>
  onToggle: (kind: ChangeKind) => void
}

const LABEL_ID = 'kind-filter-label'

/** Every kind is always listed, also at zero, so the choice looks the same between comparisons. */
export function KindFilter({ counts, shown, onToggle }: KindFilterProps) {
  return (
    <div role="group" aria-labelledby={LABEL_ID} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
      <span id={LABEL_ID} className="font-medium">
        Visa i sammanfattningen:
      </span>
      {CHANGE_KINDS.map((kind) => (
        <label key={kind} className="flex items-center gap-2">
          <input type="checkbox" checked={shown.has(kind)} onChange={() => onToggle(kind)} />
          {KIND_FILTER_LABELS[kind]}
          <span className="text-slate-500">({counts[kind]})</span>
        </label>
      ))}
    </div>
  )
}
