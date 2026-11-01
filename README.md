# FHIR Profile Review Assistant

Webbaserat verktyg för att jämföra, validera och granska FHIR R5-resurser mot
E-hälsomyndighetens HVO-profiler (Swedish Provider Directory).

Publiceras på https://frednord.github.io/fhirprofilereview/

## Kom igång

Kräver Node 22.

```sh
npm install
npm run dev        # utvecklingsserver
npm run check      # lint, typecheck, test och build (motsvarar Definition of Done)
```

Övriga skript: `lint`, `typecheck`, `test`, `test:watch`, `build`, `preview`.

## Struktur

Se `CLAUDE.md` för arkitekturen. Det viktigaste:

- `src/core` innehåller all affärslogik som ren TypeScript utan React. ESLint
  stoppar importer från `components`, `pages`, `hooks`, `integrations` och React.
- `src/components` och `src/pages` innehåller UI.
- `tests/` speglar `src/core`.

## Designbeslut

- **Inmatning är okänd JSON.** `parseResource` kräver bara ett objekt med
  `resourceType`. Resten läses med hjälpfunktionerna i `src/core/parser/narrowing.ts`,
  så att även felaktiga resurser kan jämföras och valideras.
- **IG-versionen är låst.** `src/core/profiles/hvoManifest.ts` anger vilken
  paketversion profiler och testdata kommer från. Versioner som `current`
  räknas inte som låsta och markeras i UI:t.
- **Listor matchas på identitet, inte index.** `src/core/diff/listMatchKeys.ts`
  anger vilka fält som identifierar ett listelement (t.ex. `identifier.system`).
  Ordningsändringar ger därför ingen falsk diff.

## Publicering

`.github/workflows/deploy.yml` bygger och publicerar vid push till `main`.
I repots inställningar måste **Settings → Pages → Source** vara satt till
**GitHub Actions**.
