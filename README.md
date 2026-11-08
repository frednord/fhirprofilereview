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
- **Indata behandlas som fientlig.** Nycklar från användarens JSON slås upp med
  `getOwn` i `src/core/parser/narrowing.ts`, så att fältnamn som `constructor`
  eller `toString` inte träffar `Object.prototype`. `parseResource` avvisar JSON
  som är djupare än `MAX_JSON_DEPTH` (100 nivåer), eftersom diffen och
  beskrivningarna är rekursiva och annars kan spränga anropsstacken. Testerna
  ligger i `tests/security/`.
- **Ett internt fel tömmer aldrig fälten.** `inspectInput` och
  `compareResources` i `src/core/reporting/compareResources.ts` kastar inte.
  Ett oväntat fel blir ett utfall med `reason: 'internal-error'`, som sidan
  visar i resultatytan medan båda resurserna ligger kvar. Felets meddelande
  loggas i konsolen, men aldrig resurserna. `ErrorBoundary` runt sidan är
  sista skyddet för fel i själva renderingen, och den börjar om med tomma fält.
- **IG-versionen är låst.** `src/core/profiles/hvoManifest.ts` anger vilken
  paketversion profiler och testdata kommer från. Versioner som `current`
  räknas inte som låsta och markeras i UI:t.
- **Listor matchas på identitet, inte index.** `src/core/diff/listMatchKeys.ts`
  anger vilka fält som identifierar ett listelement (t.ex. `identifier.system`).
  Ordningsändringar ger därför ingen falsk diff. Nycklar slås upp på full
  elementsökväg först (`Group.characteristic`) och sedan på elementnamn
  (`identifier`). Av samma skäl rapporteras en ny ordning i en lista inte som
  en flytt.
- **Flyttade värden känns igen.** `detectMoves` i `src/core/diff/detectMoves.ts`
  gör om ett värde som tagits bort på ett ställe och lagts till oförändrat på
  ett annat till en enda ändring av typen `moved`. Det är användbart när en
  äldre och en nyare profilversion placerar samma uppgift på olika ställen.

## Diff-motorn

`diffResources(before, after, options)` i `src/core/diff` jämför två versioner
av en resurs och returnerar en deterministisk lista med `added`, `removed`,
`changed` och `moved`, ordnad efter positionen i den nya versionen. Den är ren TypeScript och
kan användas från UI, CLI och tester.

- Varje ändring har en `path` (med listposternas matchnyckel) och en
  `elementPath` utan index, t.ex. `Organization.identifier.value`. Resurser i
  `contained` och `Bundle.entry` får sökvägar från sin egen typ.
- `formatPath` gör sökvägen läsbar: `identifier[system=urn:oid:1.2.752.29.4.19].value`.
- Ett värde som bara finns på ena sidan rapporteras en gång, som helhet.
- Olika `resourceType` eller `id` ger varningar, men jämförelsen görs ändå.
- **Flyttar** (`moved`) har både `path` (var värdet finns nu) och `from` (var det
  fanns förut). Bara exakta kopior räknas, så resultatet är deterministiskt; ett
  värde som både flyttats och ändrats blir fortfarande borttaget plus tillagt.
  Tre fall känns igen:
  1. Ett värde tas bort på ett ställe och läggs till på ett annat, t.ex.
     `telecom` till en befintlig `contact.telecom`.
  2. Ett borttaget värde finns inuti något nytt. Den nya föräldern rapporteras
     fortfarande som tillagd, och flytten listas direkt efter den.
  3. Ett tillagt värde fanns inuti något som tagits bort. Den gamla föräldern
     rapporteras fortfarande som borttagen.

  En lista med ett enda element jämförs också som det elementet, så att t.ex. en
  `contained`-resurs som blivit en `Bundle.entry` känns igen. Ensamma
  primitiva värden räknas bara som flyttade om de behåller sitt elementnamn,
  eftersom ett `true` eller en siffra på två ställen inte säger något. Tomma
  objekt och listor räknas aldrig. `options.detectMoves: false` stänger av
  igenkänningen.
- `options.matchKeys` kompletterar standardnycklarna, `options.ignorePaths`
  döljer element (`meta.lastUpdated` gäller alla resurser,
  `Organization.meta` bara Organization) och `options.ig` lägger IG-versionen i
  resultatet.
- Känd begränsning: `JSON.parse` tappar decimalprecision, så `1.0` och `1.00`
  räknas som lika.

## Svenska ändringsbeskrivningar

`describeChanges(before, after, diffResult, HVO_LABELS)` i `src/core/reporting`
gör om diffens ändringar till svenska meningar, t.ex. "HSA-id ändrades från ”X”
till ”Y”" eller "Kontakt för fax (Professionell) lades till: fax +46812345".
Det är deterministiskt och utan AI.

- **Etiketterna är data per profil**, i `src/core/profiles/hvo/0.5.1/`. Koden i
  `src/core/reporting` känner inte till HVO. Varje profil har etiketter för
  element (`Organization.name` → "Namn") och för slices, som känns igen på samma
  villkor som profilens discriminator (`identifier:hsaid` på
  `system = urn:oid:1.2.752.29.4.19`).
- **Etiketterna är skrivna för hand**, eftersom profilernas `short` är på
  engelska och oftast saknas på slices. `tests/profiles/hvoLabels.test.ts`
  kontrollerar att varje slice, villkor och element finns i profilernas
  StructureDefinitions, och att kodnamnen stämmer med IG:ns ValueSets. Vid byte
  av IG-version visar testet vilka etiketter som inte längre passar.
- **Profilen väljs** från `meta.profile` om resursen anger den, annars efter
  resurstyp. En Organization utan `meta.profile` beskrivs med både
  HVOOrganization och HVOOrganizationalUnit, där den första etiketten som finns
  används.
- **Resurser i `contained` och `Bundle.entry`** beskrivs med sin egen profil och
  får resursen som prefix: "Verksamhet X: Verksamhetstyp togs bort (var 1123)".
- **Flyttar** beskrivs med båda platsernas etiketter: "Kontakt för telefon
  (Professionell), period flyttades till Kontakt för fax (Professionell),
  period: 1970-01-01 – tills vidare". Har båda platserna samma etikett visas
  sökvägarna med listpositioner i stället, t.ex. `contact[0].period` till
  `contact[1].period`.
- **Reserv:** en ändring utan regel beskrivs med sin sökväg ("Fältet language
  lades till: ”sv”") och markeras med `source: 'fallback'`, så att det syns
  vilka regler som saknas.
- Kända begränsningar: koder visas med svenskt namn bara för de kodverk som finns
  i etikettdatan (kontaktsyfte, organisations- och enhetstyp, län, kontaktsätt);
  övriga koder, t.ex. verksamhetskoder, visas som rå kod. Kommun- och länskod har
  samma `system` och skiljs åt på värdets längd.

## Jämförelsesidan

Sidan på GitHub Pages jämför två versioner av en resurs. Klistra in JSON eller
ladda upp filer i fälten Före och Efter och klicka på **Jämför**. **Visa
exempel** fyller fälten med ett HVO-exempel ur IG:n och en redigerad kopia.
Allt körs i webbläsaren; inget skickas till någon server.

- **All logik ligger i `compareResources`** i `src/core/reporting`. Den läser
  båda texterna, kör diff-motorn och de svenska beskrivningarna och returnerar
  antal per typ, varningar på svenska och hur många ändringar som doldes.
  Sidan (`src/pages/ComparePage.tsx`, `src/hooks/useComparison.ts`) ritar bara
  upp resultatet.
- **`meta.lastUpdated` döljs** från start, eftersom den ändras vid varje
  sparning. Sidan säger hur många ändringar som doldes. Sökvägen, standardvalet
  och texterna (`LAST_UPDATED_PATH`, `formatHiddenNote`, `KIND_LABELS`) ligger i
  `src/core/reporting`, så att UI:t bara ritar upp dem.
- **Ogiltig JSON** får rad och kolumn på svenska. Chrome och Node säger inte
  längre var `JSON.parse` stannade, så `src/core/parser/jsonErrorLocation.ts`
  hittar platsen själv.
- **Kryssrutorna Tillagda, Borttagna, Ändrade och Flyttade** väljer vilka ändringstyper
  som visas i rubriken och listan. Alla är ikryssade från början, och valet
  ligger kvar mellan jämförelser. När valet döljer ändringar står det t.ex.
  "Visar 3 av 5 ändringar".
- **Jämförelsen körs bara vid klick**, så resultatet hoppar inte medan man
  skriver. Ändras en text efteråt visas en påminnelse.
- En flyttad ändring visar båda sökvägarna under texten, t.ex.
  `contact[…phone].period → contact[…fax].period`. Exemplet innehåller en flytt.
- Ändringar utan svensk etikett märks "saknar svensk etikett", så att luckor i
  etikettdatan syns.

## Testdata

`tests/fixtures/se.electronichealth.fhir.hvo.r5@0.5.1/` innehåller oförändrade
exempel från IG-paketet, med källa och checksumma i `fixtures.manifest.json`.
Se README-filen i mappen.

## Publicering

`.github/workflows/deploy.yml` bygger och publicerar vid push till `main`.
I repots inställningar måste **Settings → Pages → Source** vara satt till
**GitHub Actions**.
