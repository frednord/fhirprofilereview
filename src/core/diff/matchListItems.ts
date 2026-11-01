import type { JsonValue } from '../../types/json'
import { getOwn, getPrimitiveAtPath } from '../parser/narrowing'
import { jsonEqual } from './jsonEqual'
import { DEFAULT_LIST_MATCH_KEYS, type ListMatchKeyConfig, type MatchKey } from './listMatchKeys'

export type MatchReason = 'key' | 'equal' | 'position' | 'unmatched'

export interface ListItemPair {
  beforeIndex: number | undefined
  afterIndex: number | undefined
  reason: MatchReason
}

interface Indexed {
  index: number
  value: JsonValue
}

function keyValue(item: JsonValue, key: MatchKey): string | undefined {
  const parts: string[] = []
  for (const path of key) {
    const value = getPrimitiveAtPath(item, path)
    if (value === undefined) return undefined
    parts.push(String(value))
  }
  // A control character as separator keeps composite keys such as system|value unambiguous in practice.
  return parts.join('\u0000')
}

function readKey(item: JsonValue, key: MatchKey): Record<string, string> | undefined {
  const record: Record<string, string> = {}
  for (const path of key) {
    const value = getPrimitiveAtPath(item, path)
    if (value === undefined) return undefined
    record[path] = String(value)
  }
  return record
}

/**
 * Describes which key identifies a list item, for display. For a matched pair
 * this is the first key both sides agree on (so an identifier whose value
 * changed is described by its system, not by its new value); for an added or
 * removed item it is the first key the item has.
 */
export function describeMatchKey(
  keys: readonly MatchKey[],
  before: JsonValue | undefined,
  after: JsonValue | undefined,
): Record<string, string> | undefined {
  for (const key of keys) {
    const beforeKey = before === undefined ? undefined : readKey(before, key)
    const afterKey = after === undefined ? undefined : readKey(after, key)
    if (before !== undefined && after !== undefined) {
      if (beforeKey !== undefined && afterKey !== undefined && keyValue(before, key) === keyValue(after, key)) {
        return afterKey
      }
    } else if (beforeKey ?? afterKey) {
      return beforeKey ?? afterKey
    }
  }
  return undefined
}

/** Removes and returns the first item matching the predicate, preserving order of the rest. */
function takeFirst(items: Indexed[], predicate: (item: Indexed) => boolean): Indexed | undefined {
  const position = items.findIndex(predicate)
  if (position === -1) return undefined
  const [taken] = items.splice(position, 1)
  return taken
}

function matchByKeys(before: Indexed[], after: Indexed[], keys: readonly MatchKey[], pairs: ListItemPair[]): void {
  for (const key of keys) {
    for (const item of [...before]) {
      const value = keyValue(item.value, key)
      if (value === undefined) continue
      const partner = takeFirst(after, (candidate) => keyValue(candidate.value, key) === value)
      if (partner === undefined) continue
      takeFirst(before, (candidate) => candidate.index === item.index)
      pairs.push({ beforeIndex: item.index, afterIndex: partner.index, reason: 'key' })
    }
  }
}

function matchByEquality(before: Indexed[], after: Indexed[], pairs: ListItemPair[]): void {
  for (const item of [...before]) {
    const partner = takeFirst(after, (candidate) => jsonEqual(candidate.value, item.value))
    if (partner === undefined) continue
    takeFirst(before, (candidate) => candidate.index === item.index)
    pairs.push({ beforeIndex: item.index, afterIndex: partner.index, reason: 'equal' })
  }
}

/**
 * Items without a usable key fall back to position so that a lone edited item
 * is reported as changed rather than as one removal plus one addition.
 * Items that do have a key are never paired by position: a different key means
 * a different item, e.g. a replaced organisation number.
 */
function matchByPosition(before: Indexed[], after: Indexed[], keys: readonly MatchKey[], pairs: ListItemPair[]): void {
  const hasKey = (item: Indexed): boolean => keys.some((key) => keyValue(item.value, key) !== undefined)
  const keylessBefore = before.filter((item) => !hasKey(item))
  const keylessAfter = after.filter((item) => !hasKey(item))
  const count = Math.min(keylessBefore.length, keylessAfter.length)
  for (let i = 0; i < count; i++) {
    const b = keylessBefore[i]
    const a = keylessAfter[i]
    if (b === undefined || a === undefined) continue
    takeFirst(before, (candidate) => candidate.index === b.index)
    takeFirst(after, (candidate) => candidate.index === a.index)
    pairs.push({ beforeIndex: b.index, afterIndex: a.index, reason: 'position' })
  }
}

function sortPairs(pairs: ListItemPair[]): ListItemPair[] {
  // Ordered by position in the new version; a removal is listed before an item added at the same position.
  const sortIndex = (pair: ListItemPair): number => pair.afterIndex ?? pair.beforeIndex ?? 0
  const removedFirst = (pair: ListItemPair): number => (pair.afterIndex === undefined ? 0 : 1)
  return pairs.sort((x, y) => sortIndex(x) - sortIndex(y) || removedFirst(x) - removedFirst(y))
}

/**
 * Pairs the items of two versions of a repeating element.
 *
 * Order of precedence: configured identity keys, then exact equality, then
 * position for keyless items. Whatever is left is reported as added or removed.
 */
export function matchListItems(
  elementName: string,
  before: readonly JsonValue[],
  after: readonly JsonValue[],
  config: ListMatchKeyConfig = DEFAULT_LIST_MATCH_KEYS,
): ListItemPair[] {
  return matchListItemsByKeys(getOwn(config, elementName) ?? [], before, after)
}

/** Same as matchListItems, with the keys already resolved by the caller. */
export function matchListItemsByKeys(
  keys: readonly MatchKey[],
  before: readonly JsonValue[],
  after: readonly JsonValue[],
): ListItemPair[] {
  const remainingBefore: Indexed[] = before.map((value, index) => ({ index, value }))
  const remainingAfter: Indexed[] = after.map((value, index) => ({ index, value }))
  const pairs: ListItemPair[] = []

  matchByKeys(remainingBefore, remainingAfter, keys, pairs)
  matchByEquality(remainingBefore, remainingAfter, pairs)
  matchByPosition(remainingBefore, remainingAfter, keys, pairs)

  for (const item of remainingBefore) pairs.push({ beforeIndex: item.index, afterIndex: undefined, reason: 'unmatched' })
  for (const item of remainingAfter) pairs.push({ beforeIndex: undefined, afterIndex: item.index, reason: 'unmatched' })

  return sortPairs(pairs)
}
