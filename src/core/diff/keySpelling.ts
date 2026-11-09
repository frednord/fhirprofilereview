/**
 * Keys shorter than this are only paired when they differ in case. Short FHIR
 * names such as "use", "code" and "text" are one letter from other real names.
 */
const MIN_LENGTH_FOR_TYPOS = 5

export interface KeyPair {
  beforeKey: string
  afterKey: string
  /** True when the keys only differ in upper and lower case, e.g. valuePeriod and ValuePeriod. */
  caseOnly: boolean
}

/**
 * Edit distance where swapping two neighbouring letters counts as one edit,
 * so "adress", "addres" and "adrdess" are all one edit from "address".
 * Stops early, since only distance 0 or 1 matters here.
 */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1
  const restA = a.slice(i)
  const restB = b.slice(i)
  if (restA === restB) return true
  if (restA.slice(1) === restB.slice(1)) return true // one letter replaced
  if (restA.slice(1) === restB || restA === restB.slice(1)) return true // one letter added or left out
  return restA.length >= 2 && restA[0] === restB[1] && restA[1] === restB[0] && restA.slice(2) === restB.slice(2)
}

/**
 * "_birthDate" holds extensions for "birthDate" in FHIR JSON, so the two are
 * different elements, not a misspelling of each other.
 */
function isPrimitiveExtensionPair(a: string, b: string): boolean {
  return a === `_${b}` || b === `_${a}`
}

function caseOnly(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

function looksMisspelt(a: string, b: string): boolean {
  if (isPrimitiveExtensionPair(a, b)) return false
  if (Math.min(a.length, b.length) < MIN_LENGTH_FOR_TYPOS) return false
  return withinOneEdit(a.toLowerCase(), b.toLowerCase())
}

function pairBy(
  beforeOnly: readonly string[],
  afterOnly: readonly string[],
  taken: Set<string>,
  pairs: KeyPair[],
  matches: (a: string, b: string) => boolean,
): void {
  for (const afterKey of afterOnly) {
    if (pairs.some((p) => p.afterKey === afterKey)) continue
    const beforeKey = beforeOnly.find((key) => !taken.has(key) && matches(key, afterKey))
    if (beforeKey === undefined) continue
    taken.add(beforeKey)
    pairs.push({ beforeKey, afterKey, caseOnly: caseOnly(beforeKey, afterKey) })
  }
}

/**
 * Pairs keys that exist on only one side of an object but are spelt almost the
 * same, e.g. "valuePeriod" before and "ValuePeriod" after. JSON keys are case
 * sensitive, so without this the field would show up as removed and added,
 * which hides that the real problem is the spelling.
 *
 * Keys that only differ in case are paired first, then keys one typo apart.
 * Each key is paired at most once, in after-order, so the result is the same
 * for the same input.
 */
export function pairMisspelledKeys(beforeOnly: readonly string[], afterOnly: readonly string[]): KeyPair[] {
  const pairs: KeyPair[] = []
  const taken = new Set<string>()
  pairBy(beforeOnly, afterOnly, taken, pairs, caseOnly)
  pairBy(beforeOnly, afterOnly, taken, pairs, looksMisspelt)
  return pairs
}
