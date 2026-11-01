import type { ChangeKind } from '../../core/diff'
import { filterByKind, formatHiddenNote, formatShownNote, type Comparison } from '../../core/reporting'
import { ChangeList } from './ChangeList'
import { ChangeSummary } from './ChangeSummary'
import { DiffWarnings } from './DiffWarnings'
import { KindFilter } from './KindFilter'

interface ComparisonResultProps {
  comparison: Comparison
  hiddenPath: string
  shownKinds: ReadonlySet<ChangeKind>
  onToggleKind: (kind: ChangeKind) => void
}

export function ComparisonResult({ comparison, hiddenPath, shownKinds, onToggleKind }: ComparisonResultProps) {
  const visible = filterByKind(comparison.descriptions, shownKinds)
  const shownNote = formatShownNote(comparison.counts, shownKinds)
  const hiddenNote = formatHiddenNote(comparison.hiddenCount, hiddenPath)
  const ig = comparison.diff.ig

  return (
    <div className="space-y-3">
      <KindFilter counts={comparison.counts} shown={shownKinds} onToggle={onToggleKind} />
      <ChangeSummary counts={comparison.counts} shown={shownKinds} />
      <p className="text-sm text-slate-600">
        {comparison.descriptions.length === 0 && 'Resurserna är lika. '}
        {shownNote !== undefined && `${shownNote} `}
        {hiddenNote !== undefined && `${hiddenNote} `}
        {ig !== undefined && `Jämfört med etiketter från ${ig.packageId}@${ig.version}.`}
      </p>
      <DiffWarnings warnings={comparison.warnings} />
      {visible.length > 0 && <ChangeList descriptions={visible} />}
    </div>
  )
}
