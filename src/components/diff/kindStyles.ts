import type { ChangeKind } from '../../core/diff'

export const KIND_BADGE_CLASSES: Readonly<Record<ChangeKind, string>> = {
  added: 'bg-green-100 text-green-800 border-green-200',
  removed: 'bg-red-100 text-red-800 border-red-200',
  changed: 'bg-amber-100 text-amber-900 border-amber-200',
  moved: 'bg-sky-100 text-sky-900 border-sky-200',
}

/** Arrow colours in the change map, matching the badges. */
export const KIND_STROKE_CLASSES: Readonly<Record<ChangeKind, string>> = {
  added: 'stroke-green-600',
  removed: 'stroke-red-600',
  changed: 'stroke-amber-500',
  moved: 'stroke-sky-600',
}

export const KIND_FILL_CLASSES: Readonly<Record<ChangeKind, string>> = {
  added: 'fill-green-600',
  removed: 'fill-red-600',
  changed: 'fill-amber-500',
  moved: 'fill-sky-600',
}

/** Background of a row in the change map: strong where the change is reported, faint inside it. */
export const KIND_ROW_CLASSES: Readonly<Record<ChangeKind, { own: string; inside: string }>> = {
  added: { own: 'bg-green-100 ring-1 ring-green-300', inside: 'bg-green-50' },
  removed: { own: 'bg-red-100 ring-1 ring-red-300', inside: 'bg-red-50' },
  changed: { own: 'bg-amber-100 ring-1 ring-amber-300', inside: 'bg-amber-50' },
  moved: { own: 'bg-sky-100 ring-1 ring-sky-300', inside: 'bg-sky-50' },
}
