import { useEffect, useRef, useState, type RefObject } from 'react'

/** Where the arrows can attach, in pixels relative to the map container. */
export interface MapGeometry {
  width: number
  height: number
  /** Right edge of the Före column. */
  leftX: number
  /** Left edge of the Efter column. */
  rightX: number
  /** Vertical middle of each row, by node id. */
  rows: ReadonlyMap<string, number>
}

export interface RowPositions {
  container: RefObject<HTMLDivElement | null>
  left: RefObject<HTMLDivElement | null>
  right: RefObject<HTMLDivElement | null>
  geometry: MapGeometry | undefined
}

function measure(container: HTMLElement, left: HTMLElement, right: HTMLElement): MapGeometry {
  const box = container.getBoundingClientRect()
  const rows = new Map<string, number>()
  for (const row of container.querySelectorAll<HTMLElement>('[data-node-id]')) {
    const id = row.dataset['nodeId']
    if (id === undefined) continue
    const rect = row.getBoundingClientRect()
    rows.set(id, rect.top - box.top + rect.height / 2)
  }
  return {
    width: box.width,
    height: box.height,
    leftX: left.getBoundingClientRect().right - box.left,
    rightX: right.getBoundingClientRect().left - box.left,
    rows,
  }
}

/**
 * Measures where the rows of the change map ended up, so the arrows can be
 * drawn between them. Runs after each render that changes `layoutKey` and
 * whenever the container changes size, since wrapping text moves rows.
 */
export function useRowPositions(layoutKey: unknown): RowPositions {
  const container = useRef<HTMLDivElement | null>(null)
  const left = useRef<HTMLDivElement | null>(null)
  const right = useRef<HTMLDivElement | null>(null)
  const [geometry, setGeometry] = useState<MapGeometry | undefined>(undefined)

  useEffect(() => {
    const box = container.current
    if (box === null) return undefined
    const update = (): void => {
      if (left.current !== null && right.current !== null) setGeometry(measure(box, left.current, right.current))
    }
    // Measured on the next frame so the browser has laid out the new rows first.
    const frame = requestAnimationFrame(update)
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(update)
    observer?.observe(box)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [layoutKey])

  return { container, left, right, geometry }
}
