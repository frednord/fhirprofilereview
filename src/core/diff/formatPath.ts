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

/**
 * Renders a path with list positions instead of match keys, as seen from one
 * version. Used where two places share a key, e.g. two contacts with the same
 * purpose, so the key alone cannot tell them apart.
 */
export function formatPathAt(path: readonly PathSegment[], side: 'before' | 'after'): string {
  let text = ''
  for (const segment of path) {
    if (segment.kind === 'property') text += text === '' ? segment.name : `.${segment.name}`
    else {
      const index = side === 'before' ? (segment.beforeIndex ?? segment.afterIndex) : (segment.afterIndex ?? segment.beforeIndex)
      text += `[${String(index)}]`
    }
  }
  return text
}

/**
 * "telecom → contact[purpose.coding.0.code=PROF].telecom" for a moved value.
 * Falls back to list positions when both places read the same with keys.
 */
export function formatMovePaths(from: readonly PathSegment[], to: readonly PathSegment[]): [string, string] {
  const keyed: [string, string] = [formatPath(from), formatPath(to)]
  return keyed[0] === keyed[1] ? [formatPathAt(from, 'before'), formatPathAt(to, 'after')] : keyed
}
