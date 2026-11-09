import { useMemo, useState } from 'react'
import type { ChangeKind } from '../../core/diff'
import { CHANGE_KINDS, flattenMap, KIND_LABELS, shownLinks, type ChangeMap as ChangeMapData } from '../../core/reporting'
import { useRowPositions } from '../../hooks/useRowPositions'
import { KIND_STROKE_CLASSES } from './kindStyles'
import { MapArrows } from './MapArrows'
import { MapTree } from './MapTree'

interface ChangeMapProps {
  map: ChangeMapData
  shownKinds: ReadonlySet<ChangeKind>
}

const SMALL_BUTTON = 'rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100'

function Legend() {
  return (
    <ul aria-label="Förklaring" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
      {CHANGE_KINDS.map((kind) => (
        <li key={kind} className="flex items-center gap-1.5">
          <svg aria-hidden="true" width="22" height="6">
            <line x1="0" y1="3" x2="22" y2="3" strokeWidth="2.5" className={KIND_STROKE_CLASSES[kind]} />
          </svg>
          {KIND_LABELS[kind]}
        </li>
      ))}
      <li className="hidden sm:block">Peka på ett fält eller en pil för att se vad som hör ihop. Klicka för att låsa.</li>
    </ul>
  )
}

function toggledWith(current: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(current)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/**
 * Both versions of the resource side by side, with arrows from where each
 * field was to where it is now. The trees and links come from core; this
 * component only lays them out and keeps track of what is open and pointed at.
 */
export function ChangeMap({ map, shownKinds }: ChangeMapProps) {
  const [toggled, setToggled] = useState<ReadonlySet<string>>(() => new Set())
  const [hovered, setHovered] = useState<string | undefined>(undefined)
  const [pinned, setPinned] = useState<string | undefined>(undefined)
  const [showAll, setShowAll] = useState(false)

  const beforeRows = useMemo(() => flattenMap(map.before, shownKinds, toggled, showAll), [map, shownKinds, toggled, showAll])
  const afterRows = useMemo(() => flattenMap(map.after, shownKinds, toggled, showAll), [map, shownKinds, toggled, showAll])
  const links = useMemo(() => shownLinks(map.links, shownKinds), [map, shownKinds])
  // One key per layout, so the rows are measured again only when they change.
  const layoutKey = useMemo(() => [beforeRows, afterRows], [beforeRows, afterRows])
  const linkById = useMemo(() => new Map(links.map((link) => [link.id, link])), [links])
  const { container, left, right, geometry } = useRowPositions(layoutKey)

  const active = pinned ?? hovered
  const onToggle = (id: string): void => setToggled((current) => toggledWith(current, id))
  const onSelect = (id: string): void => setPinned((current) => (current === id ? undefined : id))
  // Both buttons start over from a clean state, so earlier single toggles do not linger.
  const expandAll = (all: boolean): void => {
    setShowAll(all)
    setToggled(new Set())
  }
  const treeProps = { links: linkById, active, onHover: setHovered, onSelect, onToggle }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legend />
        <div className="flex gap-2">
          <button type="button" onClick={() => expandAll(true)} className={SMALL_BUTTON}>
            Expandera alla
          </button>
          <button type="button" onClick={() => expandAll(false)} className={SMALL_BUTTON}>
            Minimera alla
          </button>
        </div>
      </div>
      <div
        ref={container}
        className="relative grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] sm:gap-0"
      >
        <section ref={left} aria-label="Karta före" className="min-w-0">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Före</h3>
          <MapTree side="before" rows={beforeRows} {...treeProps} />
        </section>
        <div aria-hidden="true" className="hidden sm:block" />
        <section ref={right} aria-label="Karta efter" className="min-w-0">
          <h3 className="mb-1 text-sm font-semibold text-slate-700">Efter</h3>
          <MapTree side="after" rows={afterRows} {...treeProps} />
        </section>
        {geometry !== undefined && (
          <MapArrows links={links} geometry={geometry} active={active} onHover={setHovered} onSelect={onSelect} />
        )}
      </div>
    </div>
  )
}
