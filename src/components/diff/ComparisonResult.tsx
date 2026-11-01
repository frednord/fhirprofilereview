import type { ChangeKind } from '../../core/diff'
import { filterByKind, formatShownNote, type Comparison } from '../../core/reporting'
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

function hiddenNote(count: number, path: string): string {
  return count === 1 ? `1 ändring av ${path} är dold.` : `${count} ändringar av ${path} är dolda.`
}

export function ComparisonResult({ comparison, hiddenPath, shownKinds, onToggleKind }: ComparisonResultProps) {
  const visible = filterByKind(comparison.descriptions, shownKinds)
  const shownNote = formatShownNote(comparison.counts, shownKinds)
  const ig = comparison.diff.ig

  return (
    <div className="space-y-3">
      <KindFilter counts={comparison.counts} shown={shownKinds} onToggle={onToggleKind} />
      <ChangeSummary counts={comparison.counts} shown={shownKinds} />
      <p className="text-sm text-slate-600">
        {comparison.descriptions.length === 0 && 'Resurserna är lika. '}
        {shownNote !== undefined && `${shownNote} `}
        {comparison.hiddenCount > 0 && `${hiddenNote(comparison.hiddenCount, hiddenPath)} `}
        {ig !== undefined && `Jämfört med etiketter från ${ig.packageId}@${ig.version}.`}
      </p>
      <DiffWarnings warnings={comparison.warnings} />
      {visible.length > 0 && <ChangeList descriptions={visible} />}
    </div>
  )
}
