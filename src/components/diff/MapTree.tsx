import { formatGroupLabel, KIND_LABELS, type MapKeyWarning, type MapLink, type MapRow, type MapSide, type NodeRow } from '../../core/reporting'
import { KEY_WARNING_BADGE_CLASSES, KEY_WARNING_ROW_CLASSES, KIND_BADGE_CLASSES, KIND_ROW_CLASSES } from './kindStyles'

interface MapTreeProps {
  side: MapSide
  rows: readonly MapRow[]
  links: ReadonlyMap<string, MapLink>
  keyWarnings: ReadonlyMap<string, MapKeyWarning>
  active: string | undefined
  onHover: (linkId: string | undefined) => void
  onSelect: (linkId: string) => void
  onToggle: (id: string) => void
}

const INDENT_REM = 0.85

function indent(depth: number): { paddingLeft: string } {
  return { paddingLeft: `${String(depth * INDENT_REM + 0.25)}rem` }
}

function isActive(row: NodeRow, active: string | undefined): boolean {
  return active !== undefined && ((row.own && row.node.linkId === active) || row.node.keyWarningId === active)
}

function rowClasses(row: NodeRow, active: string | undefined): string {
  const warned = row.node.keyWarningId !== undefined
  if (row.status === 'unchanged' && !warned) return active === undefined ? '' : 'opacity-60'
  const colour =
    row.status === 'unchanged'
      ? KEY_WARNING_ROW_CLASSES
      : row.own
        ? KIND_ROW_CLASSES[row.status].own
        : KIND_ROW_CLASSES[row.status].inside
  if (active === undefined) return colour
  return isActive(row, active) ? `${colour} outline-2 outline-solid outline-slate-800` : `${colour} opacity-40`
}

function ToggleButton({ row, onToggle }: { row: NodeRow; onToggle: (id: string) => void }) {
  if (!row.expandable) return <span aria-hidden="true" className="w-4 shrink-0" />
  return (
    <button
      type="button"
      aria-expanded={row.expanded}
      aria-label={`${row.expanded ? 'Fäll ihop' : 'Fäll ut'} ${row.node.name}`}
      onClick={(event) => {
        event.stopPropagation()
        onToggle(row.id)
      }}
      className="w-4 shrink-0 text-slate-500 hover:text-slate-900"
    >
      {row.expanded ? '▾' : '▸'}
    </button>
  )
}

interface NodeLineProps extends Omit<MapTreeProps, 'rows' | 'links' | 'keyWarnings'> {
  row: NodeRow
  link: MapLink | undefined
  keyWarning: MapKeyWarning | undefined
}

function KeyWarningBadge({ warning }: { warning: MapKeyWarning }) {
  return (
    <span title={warning.text} className={`shrink-0 rounded border px-1.5 text-[11px] font-medium ${KEY_WARNING_BADGE_CLASSES}`}>
      ⚠ Stavning
    </span>
  )
}

function NodeLine({ row, link, keyWarning, side, active, onHover, onSelect, onToggle }: NodeLineProps) {
  const { node } = row
  const showValue = !node.container || !row.expanded
  const linkNote = link === undefined ? undefined : side === 'before' ? link.beforeNote : link.afterNote
  const warningNote = keyWarning === undefined ? undefined : side === 'before' ? keyWarning.beforeNote : keyWarning.afterNote
  const strike = row.status === 'removed' && side === 'before'
  // A change on the same field wins the pointer, since its arrow says more than the spelling.
  const target = link?.id ?? keyWarning?.id
  const interactive = target !== undefined
  return (
    <li>
      <div
        data-node-id={node.id}
        style={indent(row.depth)}
        tabIndex={interactive ? 0 : undefined}
        onMouseEnter={interactive ? () => onHover(target) : undefined}
        onMouseLeave={interactive ? () => onHover(undefined) : undefined}
        onFocus={interactive ? () => onHover(target) : undefined}
        onBlur={interactive ? () => onHover(undefined) : undefined}
        onClick={interactive ? () => onSelect(target) : undefined}
        className={`flex min-w-0 items-center gap-1.5 rounded py-0.5 pr-1 text-sm transition-opacity ${interactive ? 'cursor-pointer' : ''} ${rowClasses(row, active)}`}
      >
        <ToggleButton row={row} onToggle={onToggle} />
        <span className="shrink-0 font-mono text-xs text-slate-500">{node.name}</span>
        {node.label !== undefined && <span className="max-w-[55%] shrink-0 truncate text-slate-900 sm:max-w-[45%]">{node.label}</span>}
        {showValue && (
          <span title={node.value} className={`min-w-0 shrink-[4] truncate text-slate-600 ${strike ? 'line-through' : ''}`}>
            {node.value}
          </span>
        )}
        {keyWarning !== undefined && <span className="ml-auto" />}
        {keyWarning !== undefined && <KeyWarningBadge warning={keyWarning} />}
        {link !== undefined && row.status !== 'unchanged' && (
          <span className={`${keyWarning === undefined ? 'ml-auto' : ''} shrink-0 rounded border px-1.5 text-[11px] font-medium ${KIND_BADGE_CLASSES[row.status]}`}>
            {KIND_LABELS[row.status]}
          </span>
        )}
      </div>
      {/* Narrow screens have no arrows, so the note says where the field went; on wide screens it is for screen readers. */}
      {linkNote !== undefined && (
        <p style={indent(row.depth + 1)} className="pb-1 text-xs text-slate-700 sm:sr-only">
          {linkNote}
        </p>
      )}
      {/* The other spelling is easy to miss, so it is shown on every screen. */}
      {warningNote !== undefined && (
        <p style={indent(row.depth + 1)} className="pb-1 text-xs text-orange-900">
          ⚠ {warningNote}
        </p>
      )}
    </li>
  )
}

/** One version of the resource as an indented tree, Före or Efter. */
export function MapTree(props: MapTreeProps) {
  const { rows, links, keyWarnings, active, onToggle } = props
  return (
    <ul className="space-y-0.5">
      {rows.map((row) => {
        if (row.type === 'group') {
          return (
            <li key={row.id} style={indent(row.depth)}>
              <button type="button" onClick={() => onToggle(row.id)} className="py-0.5 text-xs text-slate-500 hover:text-slate-900 hover:underline">
                ▸ {formatGroupLabel(row.count)}
              </button>
            </li>
          )
        }
        const link = row.own && row.node.linkId !== undefined ? links.get(row.node.linkId) : undefined
        const keyWarning = row.node.keyWarningId === undefined ? undefined : keyWarnings.get(row.node.keyWarningId)
        return <NodeLine key={row.id} {...props} row={row} link={link} keyWarning={keyWarning} active={active} onToggle={onToggle} />
      })}
    </ul>
  )
}
