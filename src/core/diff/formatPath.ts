import type { PathSegment } from './types'

function formatItem(segment: Extract<PathSegment, { kind: 'item' }>): string {
  if (segment.key !== undefined) {
    const parts = Object.entries(segment.key).map(([path, value]) => `${path}=${value}`)
    return `[${parts.join(',')}]`
  }
  return `[${String(segment.afterIndex ?? segment.beforeIndex)}]`
}

/**
 * Renders a change path for people, e.g. "identifier[system=urn:oid:1.2.752.29.4.19].value".
 * List items are shown by their match key when they have one, because an index
 * says little and differs between the two versions.
 */
export function formatPath(path: readonly PathSegment[]): string {
  let text = ''
  for (const segment of path) {
    if (segment.kind === 'property') text += text === '' ? segment.name : `.${segment.name}`
    else text += formatItem(segment)
  }
  return text
}
