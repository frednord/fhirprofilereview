import type { KeyWarningDescription } from '../../core/reporting'

interface KeyWarningsProps {
  warnings: readonly KeyWarningDescription[]
}

/** Keys spelt differently in the two versions, e.g. valuePeriod and ValuePeriod. */
export function KeyWarnings({ warnings }: KeyWarningsProps) {
  if (warnings.length === 0) return null
  return (
    <section aria-label="Nycklar som stavas olika" className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-950">
      <h3 className="mb-1 font-semibold">
        ⚠ {warnings.length === 1 ? '1 nyckel stavas olika' : `${String(warnings.length)} nycklar stavas olika`} i Före och Efter
      </h3>
      <ul className="space-y-2">
        {warnings.map(({ text, path }) => (
          <li key={path}>
            <p className="break-words">{text}</p>
            <p className="break-all font-mono text-xs text-orange-800">{path}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
