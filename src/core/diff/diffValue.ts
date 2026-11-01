import type { JsonArray, JsonObject, JsonValue } from '../../types/json'
import { isJsonArray, isJsonObject } from '../parser/narrowing'
import { resolveMatchKeys, type ListMatchKeyConfig } from './listMatchKeys'
import { describeMatchKey, matchListItemsByKeys, type ListItemPair } from './matchListItems'
import type { ChangeKind, DiffChange, PathSegment } from './types'

export interface DiffContext {
  path: readonly PathSegment[]
  elementPath: string
  matchKeys: ListMatchKeyConfig
  isIgnored: (elementPath: string) => boolean
  changes: DiffChange[]
}

function record(ctx: DiffContext, kind: ChangeKind, before: JsonValue | undefined, after: JsonValue | undefined): void {
  const change: DiffChange = { kind, path: ctx.path, elementPath: ctx.elementPath }
  if (before !== undefined) change.before = before
  if (after !== undefined) change.after = after
  ctx.changes.push(change)
}

function lastSegment(elementPath: string): string {
  return elementPath.slice(elementPath.lastIndexOf('.') + 1)
}

/**
 * A nested object with a resourceType (contained, Bundle.entry.resource) is a
 * resource of its own, so its element paths start over from that type.
 */
function resourceTypeOf(before: JsonObject, after: JsonObject): string | undefined {
  const type = after['resourceType'] ?? before['resourceType']
  return typeof type === 'string' && type !== '' ? type : undefined
}

/** Keys in after-order first, then keys only present before, so output follows the new version. */
function orderedKeys(before: JsonObject, after: JsonObject): string[] {
  const keys = Object.keys(after)
  for (const key of Object.keys(before)) {
    if (!Object.hasOwn(after, key)) keys.push(key)
  }
  return keys
}

function diffObjects(before: JsonObject, after: JsonObject, ctx: DiffContext): void {
  const base = resourceTypeOf(before, after) ?? ctx.elementPath
  for (const key of orderedKeys(before, after)) {
    const elementPath = `${base}.${key}`
    if (ctx.isIgnored(elementPath)) continue
    const child: DiffContext = { ...ctx, elementPath, path: [...ctx.path, { kind: 'property', name: key }] }
    const hasBefore = Object.hasOwn(before, key)
    const hasAfter = Object.hasOwn(after, key)
    if (hasBefore && hasAfter) diffValue(before[key] ?? null, after[key] ?? null, child)
    else if (hasAfter) record(child, 'added', undefined, after[key])
    else record(child, 'removed', before[key], undefined)
  }
}

function itemSegment(pair: ListItemPair, key: Record<string, string> | undefined): PathSegment {
  const segment: PathSegment = {
    kind: 'item',
    beforeIndex: pair.beforeIndex,
    afterIndex: pair.afterIndex,
    matchedBy: pair.reason,
  }
  if (key !== undefined) segment.key = key
  return segment
}

function diffArrays(before: JsonArray, after: JsonArray, ctx: DiffContext): void {
  const keys = resolveMatchKeys(ctx.matchKeys, ctx.elementPath, lastSegment(ctx.elementPath))
  for (const pair of matchListItemsByKeys(keys, before, after)) {
    const beforeItem = pair.beforeIndex === undefined ? undefined : before[pair.beforeIndex]
    const afterItem = pair.afterIndex === undefined ? undefined : after[pair.afterIndex]
    const key = describeMatchKey(keys, beforeItem, afterItem)
    const child: DiffContext = { ...ctx, path: [...ctx.path, itemSegment(pair, key)] }
    if (beforeItem !== undefined && afterItem !== undefined) diffValue(beforeItem, afterItem, child)
    else if (afterItem !== undefined) record(child, 'added', undefined, afterItem)
    else if (beforeItem !== undefined) record(child, 'removed', beforeItem, undefined)
  }
}

/**
 * Recursively compares two JSON values and appends the differences to ctx.changes.
 *
 * A value present on only one side is reported once, as a whole, rather than as
 * one change per leaf below it. Values of different JSON kinds (e.g. a string
 * replaced by an object) are reported as a single change.
 */
export function diffValue(before: JsonValue, after: JsonValue, ctx: DiffContext): void {
  if (isJsonObject(before) && isJsonObject(after)) {
    diffObjects(before, after, ctx)
  } else if (isJsonArray(before) && isJsonArray(after)) {
    diffArrays(before, after, ctx)
  } else if (before !== after) {
    record(ctx, 'changed', before, after)
  }
}
