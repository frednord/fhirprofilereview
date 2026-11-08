import type { JsonValue } from '../../types/json'
import { isJsonArray, isJsonObject } from '../parser/narrowing'
import { jsonEqual } from './jsonEqual'
import { DEFAULT_LIST_MATCH_KEYS, resolveMatchKeys, type ListMatchKeyConfig } from './listMatchKeys'
import { describeMatchKey } from './matchListItems'
import type { DiffChange, PathSegment } from './types'

type Side = 'before' | 'after'

/** A value somewhere inside a removed or added change, or the change's own value. */
interface Node {
  owner: number
  value: JsonValue
  path: readonly PathSegment[]
  elementPath: string
  /** Last property name on the path; list items carry the name of their list. */
  name: string | undefined
  /** Position inside the owner's value, used to stop two moves from claiming nested parts. */
  relative: string
}

function lastName(path: readonly PathSegment[]): string | undefined {
  for (let i = path.length - 1; i >= 0; i--) {
    const segment = path[i]
    if (segment?.kind === 'property') return segment.name
  }
  return undefined
}

function changeValue(change: DiffChange): JsonValue | undefined {
  return change.kind === 'removed' ? change.before : change.after
}

function rootNode(change: DiffChange, owner: number): Node | undefined {
  const value = changeValue(change)
  if (value === undefined) return undefined
  return { owner, value, path: change.path, elementPath: change.elementPath, name: lastName(change.path), relative: '' }
}

/** Same rule as the diff: an object with a resourceType starts its own element paths. */
function childBase(value: JsonValue, elementPath: string): string {
  if (!isJsonObject(value)) return elementPath
  const type = value['resourceType']
  return typeof type === 'string' && type !== '' ? type : elementPath
}

/** Every value below a node, parents before children, in document order. */
function descendants(node: Node, side: Side, matchKeys: ListMatchKeyConfig, out: Node[]): void {
  const { value } = node
  if (isJsonObject(value)) {
    const base = childBase(value, node.elementPath)
    for (const key of Object.keys(value)) {
      const child: Node = {
        owner: node.owner,
        value: value[key] ?? null,
        path: [...node.path, { kind: 'property', name: key }],
        elementPath: `${base}.${key}`,
        name: key,
        relative: `${node.relative}/${encodeURIComponent(key)}`,
      }
      out.push(child)
      descendants(child, side, matchKeys, out)
    }
  } else if (isJsonArray(value)) {
    value.forEach((_, index) => {
      const child = itemNode(node, index, side, matchKeys)
      out.push(child)
      descendants(child, side, matchKeys, out)
    })
  }
}

function itemNode(list: Node, index: number, side: Side, matchKeys: ListMatchKeyConfig): Node {
  const item = isJsonArray(list.value) ? (list.value[index] ?? null) : null
  const keys = resolveMatchKeys(matchKeys, list.elementPath, list.name ?? '')
  const key = side === 'before' ? describeMatchKey(keys, item, undefined) : describeMatchKey(keys, undefined, item)
  const segment: PathSegment = {
    kind: 'item',
    beforeIndex: side === 'before' ? index : undefined,
    afterIndex: side === 'after' ? index : undefined,
    matchedBy: 'unmatched',
  }
  if (key !== undefined) segment.key = key
  return { ...list, value: item, path: [...list.path, segment], relative: `${list.relative}/${index}` }
}

/**
 * The node itself and, for a list of one, its only item. A list that held a
 * single value often becomes one item in another list, or the other way round
 * (e.g. contained with one resource that becomes a Bundle entry).
 */
function variants(node: Node, side: Side, matchKeys: ListMatchKeyConfig): Node[] {
  return isJsonArray(node.value) && node.value.length === 1 ? [node, itemNode(node, 0, side, matchKeys)] : [node]
}

function firstPartner(
  sources: readonly Node[],
  buckets: Map<string, Node[]>,
  isAvailable: (candidate: Node) => boolean,
  sourceIsFrom: boolean,
): [Node, Node] | undefined {
  for (const source of sources) {
    const partner = findPartner(source, buckets, isAvailable, sourceIsFrom)
    if (partner !== undefined) return [source, partner]
  }
  return undefined
}

/** Cheap bucket key so that only plausible candidates are compared in full. */
function fingerprint(value: JsonValue): string {
  if (isJsonArray(value)) return `a${value.length}`
  if (isJsonObject(value)) return `o:${Object.keys(value).sort().join('\u0000')}`
  return `${typeof value}:${String(value)}`
}

/**
 * Whether two equal values in different places are worth calling a move.
 * A shared true, 0 or "" says nothing about where data went, so primitives
 * only count when they also keep their element name (e.g. a "name" that moved
 * into a contact). Non-empty objects and lists are specific enough on their own.
 */
function isMeaningful(value: JsonValue, fromName: string | undefined, toName: string | undefined): boolean {
  if (isJsonArray(value)) return value.length > 0
  if (isJsonObject(value)) return Object.keys(value).length > 0
  return typeof value === 'string' && value !== '' && fromName !== undefined && fromName === toName
}

function overlaps(a: string, b: string): boolean {
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)
}

/** Remembers which parts of each change are already explained by a move. */
class Claims {
  private readonly byOwner = new Map<number, string[]>()

  isFree(node: Node): boolean {
    return !(this.byOwner.get(node.owner) ?? []).some((claimed) => overlaps(claimed, node.relative))
  }

  hasAny(owner: number): boolean {
    return (this.byOwner.get(owner)?.length ?? 0) > 0
  }

  claim(node: Node): void {
    const list = this.byOwner.get(node.owner) ?? []
    list.push(node.relative)
    this.byOwner.set(node.owner, list)
  }
}

function moved(from: Node, to: Node): DiffChange {
  return {
    kind: 'moved',
    path: to.path,
    elementPath: to.elementPath,
    before: from.value,
    after: to.value,
    from: { path: from.path, elementPath: from.elementPath },
  }
}

function bucketed(nodes: readonly Node[]): Map<string, Node[]> {
  const buckets = new Map<string, Node[]>()
  for (const node of nodes) {
    const key = fingerprint(node.value)
    const bucket = buckets.get(key)
    if (bucket === undefined) buckets.set(key, [node])
    else bucket.push(node)
  }
  return buckets
}

function findPartner(
  source: Node,
  buckets: Map<string, Node[]>,
  isAvailable: (candidate: Node) => boolean,
  sourceIsFrom: boolean,
): Node | undefined {
  return (buckets.get(fingerprint(source.value)) ?? []).find((candidate) => {
    if (!isAvailable(candidate)) return false
    const [from, to] = sourceIsFrom ? [source, candidate] : [candidate, source]
    return isMeaningful(source.value, from.name, to.name) && jsonEqual(source.value, candidate.value)
  })
}

interface MoveState {
  changes: readonly DiffChange[]
  removed: Node[]
  added: Node[]
  /** Changes fully replaced by a move: removals that vanish, additions that become the move. */
  consumed: Set<number>
  replacement: Map<number, DiffChange>
  /** Moves into part of an addition, listed right after that addition. */
  after: Map<number, DiffChange[]>
  claims: Claims
}

/** A whole value removed in one place and added unchanged in another. */
function pairWholeValues(state: MoveState, matchKeys: ListMatchKeyConfig): void {
  const buckets = bucketed(state.added.flatMap((node) => variants(node, 'after', matchKeys)))
  for (const removed of state.removed) {
    const found = firstPartner(variants(removed, 'before', matchKeys), buckets, (c) => !state.consumed.has(c.owner), true)
    if (found === undefined) continue
    const [from, to] = found
    state.consumed.add(from.owner)
    state.consumed.add(to.owner)
    state.replacement.set(to.owner, moved(from, to))
  }
}

/** A removed value that turns up inside a new parent, e.g. telecom moved into a new contact. */
function findRemovedInsideAdded(state: MoveState, matchKeys: ListMatchKeyConfig): void {
  const inside: Node[] = []
  for (const node of state.added) if (!state.consumed.has(node.owner)) descendants(node, 'after', matchKeys, inside)
  const buckets = bucketed(inside)
  for (const removed of state.removed) {
    if (state.consumed.has(removed.owner)) continue
    const found = firstPartner(variants(removed, 'before', matchKeys), buckets, (c) => state.claims.isFree(c), true)
    if (found === undefined) continue
    const [from, to] = found
    state.consumed.add(from.owner)
    state.claims.claim(to)
    const list = state.after.get(to.owner) ?? []
    list.push(moved(from, to))
    state.after.set(to.owner, list)
  }
}

/** An added value that used to sit inside a parent that is now gone, e.g. telecom lifted out of a removed contact. */
function findAddedInsideRemoved(state: MoveState, matchKeys: ListMatchKeyConfig): void {
  const inside: Node[] = []
  for (const node of state.removed) if (!state.consumed.has(node.owner)) descendants(node, 'before', matchKeys, inside)
  const buckets = bucketed(inside)
  for (const added of state.added) {
    if (state.consumed.has(added.owner) || state.claims.hasAny(added.owner)) continue
    const found = firstPartner(variants(added, 'after', matchKeys), buckets, (c) => state.claims.isFree(c), false)
    if (found === undefined) continue
    const [to, from] = found
    state.consumed.add(to.owner)
    state.claims.claim(from)
    state.replacement.set(to.owner, moved(from, to))
  }
}

function assemble(state: MoveState): DiffChange[] {
  const result: DiffChange[] = []
  state.changes.forEach((change, index) => {
    const replacement = state.replacement.get(index)
    if (replacement !== undefined) result.push(replacement)
    else if (!state.consumed.has(index)) result.push(change)
    result.push(...(state.after.get(index) ?? []))
  })
  return result
}

/**
 * Finds values that moved to another place in the structure and reports each
 * as one "moved" change instead of a removal plus an addition.
 *
 * Only exact copies count, so the result stays deterministic: a value that
 * moved and was edited at the same time is still a removal plus an addition.
 * Three cases are recognised, in this order:
 *
 * 1. A value removed in one place and added in another, e.g. Organization.telecom
 *    to Organization.contact.telecom when the contact already existed.
 * 2. A removed value found inside something new; the new parent is still
 *    reported as added, and the move is listed right after it.
 * 3. An added value found inside something removed; the old parent is still
 *    reported as removed.
 *
 * A change in list order is not a move: list items are matched by identity,
 * and order carries no meaning in most FHIR lists.
 */
export function detectMoves(changes: readonly DiffChange[], matchKeys: ListMatchKeyConfig = DEFAULT_LIST_MATCH_KEYS): DiffChange[] {
  const removed: Node[] = []
  const added: Node[] = []
  changes.forEach((change, index) => {
    const node = change.kind === 'removed' || change.kind === 'added' ? rootNode(change, index) : undefined
    if (node === undefined) return
    if (change.kind === 'removed') removed.push(node)
    else added.push(node)
  })
  if (removed.length === 0 || added.length === 0) return [...changes]

  const state: MoveState = {
    changes,
    removed,
    added,
    consumed: new Set(),
    replacement: new Map(),
    after: new Map(),
    claims: new Claims(),
  }
  pairWholeValues(state, matchKeys)
  findRemovedInsideAdded(state, matchKeys)
  findAddedInsideRemoved(state, matchKeys)
  return assemble(state)
}
