import type { ChangeKind } from '../../core/diff'
import { formatCounts, type ChangeCounts } from '../../core/reporting'

interface ChangeSummaryProps {
  counts: ChangeCounts
  shown: ReadonlySet<ChangeKind>
}

export function ChangeSummary({ counts, shown }: ChangeSummaryProps) {
  return <h2 className="text-lg font-semibold text-slate-900">{formatCounts(counts, shown)}</h2>
}
