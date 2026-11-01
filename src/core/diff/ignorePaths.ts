/**
 * Builds the predicate for DiffOptions.ignorePaths.
 *
 * A pattern starting with a resource type ("Organization.meta") is matched from
 * the start of the element path. Any other pattern ("meta.lastUpdated") is
 * matched relative to whichever resource the element belongs to, so it also
 * covers contained resources. A pattern covers everything below it.
 */
export function createIgnoreMatcher(patterns: readonly string[]): (elementPath: string) => boolean {
  if (patterns.length === 0) return () => false
  const covers = (path: string, pattern: string): boolean => path === pattern || path.startsWith(`${pattern}.`)
  const isAbsolute = (pattern: string): boolean => /^[A-Z]/.test(pattern)
  return (elementPath) => {
    const relative = elementPath.slice(elementPath.indexOf('.') + 1)
    return patterns.some((pattern) => covers(isAbsolute(pattern) ? elementPath : relative, pattern))
  }
}
