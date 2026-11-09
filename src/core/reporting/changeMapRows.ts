import type { ChangeKind } from '../diff/types'
import type { MapLink, MapNode, NodeStatus } from './changeMap'

export interface NodeRow {
  type: 'node'
  /** Same as node.id. */
  id: string
  node: MapNode
  depth: number
  /** The status after the kind filter: a field whose kind is hidden reads as unchanged. */
  status: NodeStatus
  /** Whether this row is where a shown change is reported, i.e. where an arrow starts or ends. */
  own: boolean
  expandable: boolean
  expanded: boolean
}

/** Unchanged fields next to each other, folded into one row such as "3 oförändrade fält". */
export interface GroupRow {
  type: 'group'
  id: string
  depth: number
  count: number
}

export type MapRow = NodeRow | GroupRow

interface FlattenContext {
  kinds: ReadonlySet<ChangeKind>
  /** Node and group ids the user has opened or closed, the opposite of their default. */
  toggled: ReadonlySet<string>
  rows: MapRow[]
}

function isShownOwn(node: MapNode, kinds: ReadonlySet<ChangeKind>): boolean {
  return node.own && node.status !== 'unchanged' && kinds.has(node.status)
}

function hasShownBelow(node: MapNode, kinds: ReadonlySet<ChangeKind>): boolean {
  return node.changesBelow.some((kind) => kinds.has(kind))
}

/** Rows that matter for the comparison: a shown change, or a branch leading to one. */
function isInteresting(node: MapNode, kinds: ReadonlySet<ChangeKind>): boolean {
  return isShownOwn(node, kinds) || hasShownBelow(node, kinds)
}

function addChildren(node: MapNode, depth: number, inherited: NodeStatus, openedByUser: boolean, ctx: FlattenContext): void {
  // Grouping only applies to branches that open by themselves; a branch the
  // user opened shows everything, since that is what they asked to see.
  if (openedByUser) {
    for (const child of node.children) addNode(child, depth, inherited, ctx)
    return
  }
  let start = 0
  while (start < node.children.length) {
    const first = node.children[start]
    if (first === undefined) break
    if (isInteresting(first, ctx.kinds)) {
      addNode(first, depth, inherited, ctx)
      start += 1
      continue
    }
    let end = start
    while (end < node.children.length && !isInteresting(node.children[end] as MapNode, ctx.kinds)) end += 1
    const groupId = `${node.id}#${String(start)}`
    if (ctx.toggled.has(groupId)) {
      for (const child of node.children.slice(start, end)) addNode(child, depth, inherited, ctx)
    } else {
      ctx.rows.push({ type: 'group', id: groupId, depth, count: end - start })
    }
    start = end
  }
}

function addNode(node: MapNode, depth: number, inherited: NodeStatus, ctx: FlattenContext): void {
  const own = isShownOwn(node, ctx.kinds)
  const status = own ? node.status : inherited
  const opensByItself = hasShownBelow(node, ctx.kinds)
  const toggled = ctx.toggled.has(node.id)
  const expandable = node.children.length > 0
  const expanded = expandable && opensByItself !== toggled
  ctx.rows.push({ type: 'node', id: node.id, node, depth, status, own, expandable, expanded })
  if (expanded) addChildren(node, depth + 1, status, !opensByItself, ctx)
}

/**
 * Turns one tree into the rows the change map shows, top to bottom.
 *
 * Branches with shown changes open by themselves, so every arrow has both its
 * ends on screen. Unchanged neighbours are folded into one group row, and the
 * inside of an added or removed value stays closed, since its own row already
 * shows the whole value. `toggled` flips the default for the ids it holds.
 */
export function flattenMap(root: MapNode, kinds: ReadonlySet<ChangeKind>, toggled: ReadonlySet<string> = new Set()): MapRow[] {
  const ctx: FlattenContext = { kinds, toggled, rows: [] }
  addNode(root, 0, 'unchanged', ctx)
  return ctx.rows
}

/** The links to draw for the chosen kinds. */
export function shownLinks(links: readonly MapLink[], kinds: ReadonlySet<ChangeKind>): MapLink[] {
  return links.filter((link) => kinds.has(link.kind))
}

/** "3 oförändrade fält", "1 oförändrat fält". */
export function formatGroupLabel(count: number): string {
  return count === 1 ? '1 oförändrat fält' : `${String(count)} oförändrade fält`
}
