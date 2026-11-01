import { useState } from 'react'
import type { ChangeKind } from '../../core/diff'
import { CHANGE_KINDS, filterByKind, type Comparison } from '../../core/reporting'
import { ChangeList } from './ChangeList'
import { ChangeSummary } from './ChangeSummary'
import { DiffWarnings } from './DiffWarnings'

interface ComparisonResultProps {
  comparison: Comparison
  hiddenPath: string
}

function hiddenNote(count: number, path: string): string {
  return count === 1 ? `1 ändring av ${path} är dold.` : `${count} ändringar av ${path} är dolda.`
}

export function ComparisonResult({ comparison, hiddenPath }: ComparisonResultProps) {
  const [shown, setShown] = useState<ReadonlySet<ChangeKind>>(() => new Set(CHANGE_KINDS))
  const toggle = (kind: ChangeKind): void => {
    const next = new Set(shown)
    if (next.has(kind)) next.delete(kind)
    else next.add(kind)
    setShown(next)
  }
  const visible = filterByKind(comparison.descriptions, shown)
  const ig = comparison.diff.ig

  return (
    <div className="space-y-3">
      <ChangeSummary counts={comparison.counts} shown={shown} onToggle={toggle} />
      <p className="text-sm text-slate-600">
        {comparison.descriptions.length === 0 && 'Resurserna är lika. '}
        {comparison.hiddenCount > 0 && `${hiddenNote(comparison.hiddenCount, hiddenPath)} `}
        {ig !== undefined && `Jämfört med etiketter från ${ig.packageId}@${ig.version}.`}
      </p>
      <DiffWarnings warnings={comparison.warnings} />
      {visible.length > 0 && <ChangeList descriptions={visible} />}
    </div>
  )
}
