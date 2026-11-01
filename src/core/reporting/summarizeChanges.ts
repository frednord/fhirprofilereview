import type { ChangeKind } from '../diff/types'
import type { ChangeDescription } from './types'

export type ChangeCounts = Readonly<Record<ChangeKind, number>>

/** Display order of change kinds, also used by the filter checkboxes. */
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

function sumCounts(counts: ChangeCounts, kinds: ReadonlySet<ChangeKind>): number {
  return CHANGE_KINDS.reduce((sum, kind) => (kinds.has(kind) ? sum + counts[kind] : sum), 0)
}

const ALL_KINDS: ReadonlySet<ChangeKind> = new Set(CHANGE_KINDS)

/**
 * "2 tillagda, 1 borttagen, 4 ändrade", limited to the chosen kinds.
 * "Inga skillnader" wins over an empty choice, because then there is nothing to choose from.
 */
export function formatCounts(counts: ChangeCounts, kinds: ReadonlySet<ChangeKind> = ALL_KINDS): string {
  if (sumCounts(counts, ALL_KINDS) === 0) return 'Inga skillnader'
  const chosen = CHANGE_KINDS.filter((kind) => kinds.has(kind))
  if (chosen.length === 0) return 'Inga ändringstyper valda'
  return chosen.map((kind) => formatKindCount(kind, counts[kind])).join(', ')
}

/**
 * "Visar 3 av 5 ändringar." when the choice hides changes, so a filtered
 * summary is never mistaken for the whole comparison. Undefined when nothing is hidden.
 */
export function formatShownNote(counts: ChangeCounts, kinds: ReadonlySet<ChangeKind>): string | undefined {
  const total = sumCounts(counts, ALL_KINDS)
  const shown = sumCounts(counts, kinds)
  if (shown === total) return undefined
  return `Visar ${shown} av ${total} ${total === 1 ? 'ändring' : 'ändringar'}.`
}
