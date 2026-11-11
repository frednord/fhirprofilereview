# Jämförelsesidan

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
- **Karta** (växlaren Lista | Karta, Lista är förvald) visar båda versionerna
  som träd sida vid sida med pilar: flyttade fält får en blå pil från gamla till
  nya platsen, ändrade en gul pil mellan fältet i Före och Efter, borttagna en
  röd linje till ett ✕ och tillagda en grön pil från ett +. Grenar med ändringar
  är utfällda och oförändrade fält hopfällda till "N oförändrade fält".
  **Expandera alla** visar hela resursen och **Minimera alla** går tillbaka till
  att bara visa grenar med ändringar. Kartan
  följer kryssrutorna, och den som pekar eller klickar på ett fält eller en pil
  ser paret framhävt. På smala skärmar visas träden under varandra, och varje
  ändrat fält får en text som "Flyttad till …" i stället för pilar.
  Nycklar som stavas olika står i en orange ruta ovanför listan och märks
  "⚠ Stavning" i kartan, med en streckad orange linje mellan de två
  stavningarna och en text som "Stavas "ValuePeriod" i Efter" under fältet.
  Varningarna visas oavsett kryssrutorna, eftersom de inte är ändringar.
  Träden och kopplingarna byggs av `buildChangeMap` och `flattenMap` i
  `src/core/reporting`; komponenten mäter bara var raderna hamnade och ritar
  pilarna som SVG.
