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

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/** Badge text for one change, e.g. "Tillagd". */
export const KIND_LABELS: Readonly<Record<ChangeKind, string>> = {
  added: capitalize(KIND_WORDS.added[0]),
  removed: capitalize(KIND_WORDS.removed[0]),
  changed: capitalize(KIND_WORDS.changed[0]),
}

/** Plural labels for the filter, which picks whole groups of changes, e.g. "Tillagda". */
export const KIND_FILTER_LABELS: Readonly<Record<ChangeKind, string>> = {
  added: capitalize(KIND_WORDS.added[1]),
  removed: capitalize(KIND_WORDS.removed[1]),
  changed: capitalize(KIND_WORDS.changed[1]),
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

/**
 * "2 ändringar av meta.lastUpdated är dolda." when ignorePaths hid something,
 * so the user knows the list is not the whole diff. Undefined when nothing was hidden.
 */
export function formatHiddenNote(count: number, path: string): string | undefined {
  if (count <= 0) return undefined
  return count === 1 ? `1 ändring av ${path} är dold.` : `${count} ändringar av ${path} är dolda.`
}
