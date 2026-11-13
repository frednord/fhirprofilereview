# FHIR Profile Review Assistant

Jämför två versioner av en FHIR R5-resurs och visa vad som ändrats, på svenska
och i FHIR-termer, i stället för som en rå JSON-diff. Där en vanlig diff säger
`identifier[0].value changed` säger verktyget ”HSA-id ändrades från ”X” till
”Y””. Byggt för E-hälsomyndighetens HVO-profiler (Swedish Provider Directory).

**Prova:** https://frednord.github.io/fhirprofilereview/ (klicka **Visa exempel** och sedan **Jämför**)

## Krav

- Node.js 22 (versionen står i `.nvmrc`) och npm
- En modern webbläsare (Chrome, Edge, Firefox eller Safari)

Inga externa tjänster, API-nycklar eller tokens behövs. Allt körs i
webbläsaren och inget skickas till någon server.

## Installation

```sh
git clone https://github.com/frednord/fhirprofilereview
cd fhirprofilereview
npm install
```

## Konfiguration

Ingen konfiguration krävs, och projektet använder ingen `.env`-fil. Det enda
inställbara värdet är sökvägen som sidan publiceras under på GitHub Pages,
`GITHUB_PAGES_BASE` i `vite.config.ts` (i dag `/fhirprofilereview/`). Den
behöver bara ändras om repot byter namn eller publiceras någon annanstans.

## Kör projektet

```sh
npm run dev        # utvecklingsserver, adressen skrivs ut i terminalen
npm run check      # lint, typecheck, alla tester och build
```

Övriga skript: `lint`, `typecheck`, `test`, `test:watch`, `build` och
`preview`. En push till `main` bygger och publicerar sidan på GitHub Pages via
`.github/workflows/deploy.yml` (**Settings → Pages → Source** ska vara
**GitHub Actions**).

## Arkitektur

All affärslogik ligger i `src/core` som ren TypeScript utan React, så att den
kan testas utan webbläsare och återanvändas från ett CLI. Flödet är
`parseResource` (läser okänd JSON säkert) → `diffResources` (semantisk diff där
listor matchas på identitet, inte index) → `describeChanges` (svenska meningar
från etikettdata per HVO-profil) → `compareResources`, som sidan anropar.
React-komponenterna i `src/components` ritar bara upp resultatet, och ESLint
stoppar importer från `core` till UI. Profilkunskapen är data, inte kod: varje
IG-version har en egen mapp med etiketter, och testerna kontrollerar dem mot
oförändrade exempel ur IG-paketet.

```
fhirprofilereview/
├── src/
│   ├── core/
│   │   ├── parser/       # läser och kontrollerar indata, hittar JSON-fel
│   │   ├── diff/         # diff-motorn: matchning av listor, flyttar, stavning
│   │   ├── profiles/     # IG-manifest och svenska etiketter per HVO-version
│   │   └── reporting/    # beskrivningar, ändringskarta och granskningsrapport
│   ├── components/       # React-komponenter för inmatning, lista och karta
│   ├── hooks/            # sidans tillstånd och mätning av kartans rader
│   ├── pages/            # jämförelsesidan och exemplet bakom Visa exempel
│   └── utils/            # filinläsning, nedladdning och utskrift i webbläsaren
├── tests/                # speglar src/core, plus fixtures ur IG-paketet
├── docs/                 # designbeslut och detaljer per del
├── CLAUDE.md             # regler för kod, arkitektur och avgränsning
└── vite.config.ts        # bygge, testmiljö och sökväg för GitHub Pages
```

Börja läsa i `src/core/reporting/compareResources.ts`. Mer om designbeslut och
varje del finns i [docs/](docs/README.md).

## Teknisk stack

| Komponent | Val | Anledning |
| --- | --- | --- |
| Gränssnitt | React 19 | Etablerat, och logiken kan hållas utanför komponenterna |
| Språk | TypeScript (strict) | Indata är okänd JSON som måste smalnas av säkert; strikta inställningar fångar saknade fält |
| Bygge | Vite | Snabb utvecklingsserver och statiskt bygge som passar GitHub Pages |
| Stil | Tailwind CSS | Ingen separat CSS att underhålla för ett litet gränssnitt |
| FHIR-hantering | Egen kod, inget FHIR-bibliotek | Resurser läses som okänd JSON så att även felaktiga resurser kan jämföras; diffen ska vara deterministisk |
| Test | Vitest och React Testing Library | Samma konfiguration som Vite; core testas utan webbläsare |
| Kodkontroll | ESLint (0 varningar) | Upprätthåller beroenderiktningen från CLAUDE.md |
| Drift | GitHub Pages och GitHub Actions | Ingen server eller databas behövs, och inget lämnar webbläsaren |

## Begränsningar

- **Ingen profilvalidering än.** Verktyget jämför två versioner men kontrollerar
  inte kardinalitet, bindningar eller constraints mot profilen. Det är planerat.
- **Ingen AI-sammanfattning än.** Den är planerad som valfritt komplement; alla
  resultat i dag är deterministiska.
- **Bara HVO 0.5.1 har svenska etiketter.** Andra resurser och profiler jämförs
  korrekt, men fälten visas med sin FHIR-sökväg i stället för ett svenskt namn.
- **Stora listor är långsamma.** Matchningen av listor växer kvadratiskt: 3 000
  utbytta identifierare tar cirka 6,6 sekunder, och sidan svarar inte under
  tiden. Vanliga enskilda resurser jämförs på under en sekund.
- **Flyttar känns bara igen när värdet är oförändrat.** Ett fält som både
  flyttats och ändrats visas som borttaget och tillagt.
- **Bara `meta.lastUpdated` kan döljas.** Andra fält som ändras vid varje
  sparning, t.ex. `meta.versionId`, syns alltid.
- **Filer är begränsade till 5 MB.** Inklistrad text har ingen gräns.
- **PDF skapas via webbläsarens utskrift** (Spara som PDF), inte som en fil direkt.
- **Kartvyn kräver mus för att låsa en markering**, och gränssnittet finns bara
  på svenska.
- **Inget sparas.** Det finns ingen inloggning, historik eller databas, med
  avsikt: verktyget är till för granskning, inte lagring.

## Utvecklat med

Claude Code (agentdriven utveckling) som del av kursen Next-Generation Software
Development with AI.
