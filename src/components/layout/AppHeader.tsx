export function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-4">
        <h1 className="text-xl font-semibold text-slate-900">FHIR Profile Review Assistant</h1>
        <p className="text-sm text-slate-600">Jämför och granska FHIR-resurser mot HVO-profiler</p>
      </div>
    </header>
  )
}
