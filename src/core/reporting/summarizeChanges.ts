import type { ChangeKind } from '../diff/types'
import type { ChangeDescription } from './types'

export type ChangeCounts = Readonly<Record<ChangeKind, number>>

/** Display order of change kinds, also used by the filter buttons. */
export const CHANGE_KINDS: readonly ChangeKind[] = ['added', 'removed', 'changed']

export function countChanges(descriptions: readonly ChangeDescription[]): ChangeCounts {
  const counts: Record<ChangeKind, number> = { added: 0, removed: 0, changed: 0 }
  for (const description of descriptions) counts[description.change.kind] += 1
  return counts
}

/** Keeps the order of the input, so filtering never reshuffles the list. */
export function filterByKind(
  descriptions: readonly ChangeDescription[],
  kinds: ReadonlySet<ChangeKind>,
): ChangeDescription[] {
  return descriptions.filter((description) => kinds.has(description.change.kind))
}

const KIND_WORDS: Readonly<Record<ChangeKind, readonly [singular: string, plural: string]>> = {
  added: ['tillagd', 'tillagda'],
  removed: ['borttagen', 'borttagna'],
  changed: ['ändrad', 'ändrade'],
}

/** "1 tillagd", "3 ändrade". */
export function formatKindCount(kind: ChangeKind, count: number): string {
  const [singular, plural] = KIND_WORDS[kind]
  return `${count} ${count === 1 ? singular : plural}`
}

/** "2 tillagda, 1 borttagen, 4 ändrade", or "Inga skillnader" when nothing changed. */
export function formatCounts(counts: ChangeCounts): string {
  const total = CHANGE_KINDS.reduce((sum, kind) => sum + counts[kind], 0)
  if (total === 0) return 'Inga skillnader'
  return CHANGE_KINDS.map((kind) => formatKindCount(kind, counts[kind])).join(', ')
}
