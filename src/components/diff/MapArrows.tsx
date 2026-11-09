import { useId } from 'react'
import type { ChangeKind } from '../../core/diff'
import { CHANGE_KINDS, type MapLink } from '../../core/reporting'
import type { MapGeometry } from '../../hooks/useRowPositions'
import { KIND_FILL_CLASSES, KIND_STROKE_CLASSES } from './kindStyles'

interface MapArrowsProps {
  links: readonly MapLink[]
  geometry: MapGeometry
  active: string | undefined
  onHover: (linkId: string | undefined) => void
  onSelect: (linkId: string) => void
}

/** Radius of the ✕ and + markers in the gap between the trees. */
const MARKER_RADIUS = 9
/** Keeps the arrow head clear of the row it points at. */
const HEAD_GAP = 3

interface Shape {
  path: string
  /** A ✕ for a removed field, a + for an added one, drawn in the gap. */
  marker?: { x: number; y: number; symbol: string }
}

/**
 * A moved or changed field gets a curve from its row in Före to its row in
 * Efter. A removed field gets a line that ends at a ✕ in the gap, and an
 * added field a line that starts at a + there, since they have only one end.
 */
function shapeOf(link: MapLink, g: MapGeometry): Shape | undefined {
  const mid = (g.leftX + g.rightX) / 2
  const fromY = link.from === undefined ? undefined : g.rows.get(link.from)
  const toY = link.to === undefined ? undefined : g.rows.get(link.to)
  const endX = g.rightX - HEAD_GAP
  if (link.kind === 'removed') {
    if (fromY === undefined) return undefined
    return { path: `M ${g.leftX} ${fromY} H ${mid - MARKER_RADIUS}`, marker: { x: mid, y: fromY, symbol: '✕' } }
  }
  if (link.kind === 'added') {
    if (toY === undefined) return undefined
    return { path: `M ${mid + MARKER_RADIUS} ${toY} H ${endX}`, marker: { x: mid, y: toY, symbol: '+' } }
  }
  if (fromY === undefined || toY === undefined) return undefined
  return { path: `M ${g.leftX} ${fromY} C ${mid} ${fromY}, ${mid} ${toY}, ${endX} ${toY}` }
}

function ArrowHeads({ prefix }: { prefix: string }) {
  return (
    <defs>
      {CHANGE_KINDS.map((kind) => (
        <marker key={kind} id={`${prefix}-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" className={KIND_FILL_CLASSES[kind]} />
        </marker>
      ))}
    </defs>
  )
}

function hasHead(kind: ChangeKind): boolean {
  return kind !== 'removed'
}

/** The arrows of the change map, drawn over both trees. Hidden on narrow screens, where the notes in each row say the same. */
export function MapArrows({ links, geometry, active, onHover, onSelect }: MapArrowsProps) {
  const prefix = useId().replace(/:/g, '')
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden sm:block"
      width={geometry.width}
      height={geometry.height}
    >
      <ArrowHeads prefix={prefix} />
      {links.map((link) => {
        const shape = shapeOf(link, geometry)
        if (shape === undefined) return null
        const dimmed = active !== undefined && active !== link.id
        return (
          <g
            key={link.id}
            data-link-id={link.id}
            className={`transition-opacity ${dimmed ? 'opacity-15' : 'opacity-100'}`}
            onMouseEnter={() => onHover(link.id)}
            onMouseLeave={() => onHover(undefined)}
            onClick={() => onSelect(link.id)}
          >
            {/* A wide invisible stroke makes the thin arrow easy to point at. */}
            <path d={shape.path} fill="none" stroke="transparent" strokeWidth={12} className="pointer-events-auto cursor-pointer" />
            <path
              d={shape.path}
              fill="none"
              strokeWidth={active === link.id ? 2.5 : 1.75}
              className={KIND_STROKE_CLASSES[link.kind]}
              markerEnd={hasHead(link.kind) ? `url(#${prefix}-${link.kind})` : undefined}
            />
            {shape.marker !== undefined && (
              <g className="pointer-events-auto cursor-pointer">
                <circle cx={shape.marker.x} cy={shape.marker.y} r={MARKER_RADIUS} className={`${KIND_FILL_CLASSES[link.kind]}`} />
                <text
                  x={shape.marker.x}
                  y={shape.marker.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white text-[11px] font-bold"
                >
                  {shape.marker.symbol}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
