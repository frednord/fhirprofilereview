import type { ChangeKind } from '../../core/diff'
import { CHANGE_KINDS, formatCounts, formatKindCount, type ChangeCounts } from '../../core/reporting'
import { KIND_BADGE_CLASSES } from './kindStyles'

interface ChangeSummaryProps {
  counts: ChangeCounts
  shown: ReadonlySet<ChangeKind>
  onToggle: (kind: ChangeKind) => void
}

export function ChangeSummary({ counts, shown, onToggle }: ChangeSummaryProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="text-lg font-semibold text-slate-900">{formatCounts(counts)}</h2>
      <div role="group" aria-label="Visa ändringar av typ" className="flex flex-wrap gap-2">
        {CHANGE_KINDS.filter((kind) => counts[kind] > 0).map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={shown.has(kind)}
            onClick={() => onToggle(kind)}
            className={`rounded-full border px-3 py-0.5 text-sm ${
              shown.has(kind) ? KIND_BADGE_CLASSES[kind] : 'border-slate-300 bg-white text-slate-500 line-through'
            }`}
          >
            {formatKindCount(kind, counts[kind])}
          </button>
        ))}
      </div>
    </div>
  )
}
