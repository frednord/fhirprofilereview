import { useState } from 'react'
import type { ChangeKind } from '../../core/diff'
import { filterByKind, formatHiddenNote, formatShownNote, type Comparison } from '../../core/reporting'
import { ChangeList } from './ChangeList'
import { ChangeMap } from './ChangeMap'
import { ChangeSummary } from './ChangeSummary'
import { DiffWarnings } from './DiffWarnings'
import { KeyWarnings } from './KeyWarnings'
import { KindFilter } from './KindFilter'
import { ReportExport } from './ReportExport'
import { ViewSwitch, type ResultView } from './ViewSwitch'

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
  // The list stays the default; the map is a second way to look at the same changes.
  const [view, setView] = useState<ResultView>('list')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <KindFilter counts={comparison.counts} shown={shownKinds} onToggle={onToggleKind} />
        <ViewSwitch view={view} onChange={setView} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChangeSummary counts={comparison.counts} shown={shownKinds} />
        <ReportExport comparison={comparison} hiddenPath={hiddenPath} shownKinds={shownKinds} />
      </div>
      <p className="text-sm text-slate-600">
        {comparison.descriptions.length === 0 && (comparison.keyWarnings.length === 0 ? 'Resurserna är lika. ' : 'Värdena är lika. ')}
        {shownNote !== undefined && `${shownNote} `}
        {hiddenNote !== undefined && `${hiddenNote} `}
        {ig !== undefined && `Jämfört med etiketter från ${ig.packageId}@${ig.version}.`}
      </p>
      <DiffWarnings warnings={comparison.warnings} />
      <KeyWarnings warnings={comparison.keyWarnings} />
      {view === 'list' && visible.length > 0 && <ChangeList descriptions={visible} />}
      {view === 'map' && <ChangeMap map={comparison.map} shownKinds={shownKinds} />}
    </div>
  )
}
