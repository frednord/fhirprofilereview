interface DiffWarningsProps {
  warnings: readonly string[]
}

export function DiffWarnings({ warnings }: DiffWarningsProps) {
  if (warnings.length === 0) return null
  return (
    <ul className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      {warnings.map((warning) => (
        <li key={warning}>{warning}</li>
      ))}
    </ul>
  )
}
