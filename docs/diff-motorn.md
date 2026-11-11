# Diff-motorn

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
- **Nycklar som stavas olika** (`keyWarnings`, `src/core/diff/keySpelling.ts`):
  en nyckel som bara finns på ena sidan och nästan har samma namn som en nyckel
  som bara finns på andra, t.ex. `valuePeriod` före och `ValuePeriod` efter,
  rapporteras som en varning i stället för borttagen plus tillagd. Värdena
  jämförs som samma fält, så ändringar under nyckeln syns ändå. Nycklar som bara
  skiljer i stora och små bokstäver paras först, sedan nycklar med ett
  stavfel (en bokstav för mycket, för lite, utbytt eller två bokstäver som bytt
  plats). Stavfel räknas bara för namn med minst fem tecken, eftersom korta
  FHIR-namn som `code` och `mode` ligger en bokstav ifrån varandra, och
  `_birthDate` räknas aldrig som en felstavning av `birthDate`. Sökvägens sista
  steg har `name` (stavningen efter) och `beforeName` (stavningen före).
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
