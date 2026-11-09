import { formatMovePaths, formatPath } from '../diff/formatPath'
import type { DiffChange } from '../diff/types'

/** The path shown under a change: where it is, or "from → to" for a moved value. */
export function formatChangePath(change: DiffChange): string {
  if (change.from === undefined) return formatPath(change.path)
  return formatMovePaths(change.from.path, change.path).join(' → ')
}
