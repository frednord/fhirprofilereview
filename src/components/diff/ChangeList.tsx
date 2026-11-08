import { formatMovePaths, formatPath } from '../../core/diff'
import { KIND_LABELS, type ChangeDescription } from '../../core/reporting'
import { KIND_BADGE_CLASSES } from './kindStyles'

interface ChangeListProps {
  descriptions: readonly ChangeDescription[]
}

export function ChangeList({ descriptions }: ChangeListProps) {
  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {descriptions.map((description) => {
        const { change } = description
        const path = formatPath(change.path)
        const shownPath = change.from === undefined ? path : formatMovePaths(change.from.path, change.path).join(' → ')
        return (
          <li key={`${change.kind}:${path}`} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:gap-3">
            <span
              className={`w-fit shrink-0 rounded border px-2 py-0.5 text-center text-xs font-medium sm:w-20 ${KIND_BADGE_CLASSES[change.kind]}`}
            >
              {KIND_LABELS[change.kind]}
            </span>
            <div className="min-w-0">
              <p className="break-words text-slate-900">{description.text}</p>
              <p className="break-all font-mono text-xs text-slate-500">
                {shownPath}
                {description.source === 'fallback' && (
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-sans text-slate-600">
                    saknar svensk etikett
                  </span>
                )}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
