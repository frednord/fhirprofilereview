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
  Ordningsändringar ger därför ingen falsk diff. Nycklar slås upp på full
  elementsökväg först (`Group.characteristic`) och sedan på elementnamn
  (`identifier`).

## Diff-motorn

`diffResources(before, after, options)` i `src/core/diff` jämför två versioner
av en resurs och returnerar en deterministisk lista med `added`, `removed` och
`changed`, ordnad efter positionen i den nya versionen. Den är ren TypeScript och
kan användas från UI, CLI och tester.

- Varje ändring har en `path` (med listposternas matchnyckel) och en
  `elementPath` utan index, t.ex. `Organization.identifier.value`. Resurser i
  `contained` och `Bundle.entry` får sökvägar från sin egen typ.
- `formatPath` gör sökvägen läsbar: `identifier[system=urn:oid:1.2.752.29.4.19].value`.
- Ett värde som bara finns på ena sidan rapporteras en gång, som helhet.
- Olika `resourceType` eller `id` ger varningar, men jämförelsen görs ändå.
- `options.matchKeys` kompletterar standardnycklarna, `options.ignorePaths`
  döljer element (`meta.lastUpdated` gäller alla resurser,
  `Organization.meta` bara Organization) och `options.ig` lägger IG-versionen i
  resultatet.
- Känd begränsning: `JSON.parse` tappar decimalprecision, så `1.0` och `1.00`
  räknas som lika.

## Testdata

`tests/fixtures/se.electronichealth.fhir.hvo.r5@0.5.1/` innehåller oförändrade
exempel från IG-paketet, med källa och checksumma i `fixtures.manifest.json`.
Se README-filen i mappen.

## Publicering

`.github/workflows/deploy.yml` bygger och publicerar vid push till `main`.
I repots inställningar måste **Settings → Pages → Source** vara satt till
**GitHub Actions**.
