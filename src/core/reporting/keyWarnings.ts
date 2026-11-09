import { formatPath } from '../diff/formatPath'
import type { KeySpellingWarning } from '../diff/types'

export interface KeyWarningDescription {
  warning: KeySpellingWarning
  /** One Swedish sentence, e.g. 'Nyckeln skrivs "valuePeriod" i Före men "ValuePeriod" i Efter.' */
  text: string
  /** Where the key is, as in the change list, with the after spelling. */
  path: string
}

/** The note shown next to the key in the change map, on the side given. */
export function keyWarningNote(warning: KeySpellingWarning, side: 'before' | 'after'): string {
  const other = side === 'before' ? `"${warning.afterKey}" i Efter` : `"${warning.beforeKey}" i Före`
  return `Stavas ${other}`
}

/**
 * Says in Swedish that a key is spelt differently in the two versions. The
 * reader is told whether only the case differs, since that is easy to miss
 * when reading the JSON, and that the values were compared as one field.
 */
export function describeKeyWarning(warning: KeySpellingWarning): KeyWarningDescription {
  const how = warning.caseOnly ? 'Bara stora och små bokstäver skiljer.' : 'Stavningen skiljer sig.'
  const text =
    `Nyckeln skrivs "${warning.beforeKey}" i Före men "${warning.afterKey}" i Efter. ${how} ` +
    'Värdena jämförs som samma fält, men kontrollera vilken stavning profilen kräver.'
  return { warning, text, path: formatPath(warning.path) }
}
