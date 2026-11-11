# FHIR Profile Review Assistant

Jämför två versioner av en FHIR R5-resurs och visa vad som ändrats, på svenska
och i FHIR-termer, i stället för som en rå JSON-diff. Byggt för
E-hälsomyndighetens HVO-profiler (Swedish Provider Directory).

**Prova:** https://frednord.github.io/fhirprofilereview/ (klicka **Visa exempel** och sedan **Jämför**)

## Problemet

Den som granskar FHIR-resurser mellan två system, två releaser eller två
profilversioner får i dag läsa JSON-diffar för hand. En vanlig diff säger
`identifier[0].value changed` och larmar när en lista bara bytt ordning. Den
som granskar måste själv veta att det är organisationsnumret som ändrats, att
en uppgift bara flyttats eller att `ValuePeriod` är en felstavning av
`valuePeriod`.

## Vad verktyget gör

| Före och efter | Exempel |
| --- | --- |
| Rå diff | `identifier[0].value changed` |
| Det här verktyget | Organisationsnummer ändrades från ”X” till ”Y” |

- **Semantisk diff.** Listor matchas på identitet (t.ex. `identifier.system`),
  inte på index, så en ny ordning ger ingen falsk ändring.
- **Svenska beskrivningar** av varje ändring utifrån HVO-profilernas element
  och slices (HVOOrganization, HVOOrganizationalUnit, HVOBusiness, HVOLocation).
- **Flyttade fält** känns igen, t.ex. när en äldre och en nyare profilversion
  lägger samma uppgift på olika ställen.
- **Stavningsvarningar** för nycklar som nästan heter samma sak på båda sidor.
- **Lista eller Karta.** Kartan visar båda versionerna som träd med pilar
  mellan fälten. Filter för tillagda, borttagna, ändrade och flyttade fält.
- **Granskningsrapport** som Markdown eller PDF att dela med förvaltningen.

Allt körs i webbläsaren och inget skickas till någon server. Resultaten är
deterministiska och tas inte fram med AI.

## Status

| Område | Status |
| --- | --- |
| Jämförelse och semantisk diff av HVO-resurser | Klar |
| Profilvalidering (kardinalitet, bindningar, constraints) | Planerad |
| AI-sammanfattning och riskanalys (valfri, komplement) | Planerad |

## Kom igång

Kräver Node 22 (se `.nvmrc`).

```sh
npm install
npm run dev        # utvecklingsserver
npm run check      # lint, typecheck, test och build (Definition of Done)
```

Övriga skript: `lint`, `typecheck`, `test`, `test:watch`, `build`, `preview`.

## Så hänger koden ihop

```
src/core          affärslogik i ren TypeScript, utan React
  parser/         läser okänd JSON säkert
  diff/           diff-motorn: diffResources()
  profiles/hvo/   svenska etiketter per HVO-profil och IG-version
  reporting/      compareResources(), beskrivningar, karta, rapport
src/components    React-komponenter som bara ritar upp resultatet
src/pages         jämförelsesidan
tests/            speglar src/core, plus oförändrade exempel ur IG-paketet
```

Flödet är `parseResource` → `diffResources` → `describeChanges` →
`compareResources`, som sidan anropar. ESLint stoppar importer från `core` till
UI, så diff-motorn kan användas från UI, CLI och tester.

Börja läsa i `src/core/reporting/compareResources.ts`. Regler för kod och
arkitektur står i [CLAUDE.md](CLAUDE.md), och designbeslut och detaljer i
[docs/](docs/README.md).

## Publicering

Push till `main` bygger och publicerar via `.github/workflows/deploy.yml`.
**Settings → Pages → Source** måste vara satt till **GitHub Actions**.
