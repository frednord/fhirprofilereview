import type { ChangeKind } from '../../core/diff'

export const KIND_BADGE_CLASSES: Readonly<Record<ChangeKind, string>> = {
  added: 'bg-green-100 text-green-800 border-green-200',
  removed: 'bg-red-100 text-red-800 border-red-200',
  changed: 'bg-amber-100 text-amber-900 border-amber-200',
  moved: 'bg-sky-100 text-sky-900 border-sky-200',
}
