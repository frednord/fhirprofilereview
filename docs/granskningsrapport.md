# Granskningsrapport

**Exportera rapport: Markdown | PDF** ovanför resultatet sparar jämförelsen
som en rapport att dela med förvaltningen. Rapporten följer kryssrutorna för
ändringstyper, precis som listan, och säger då t.ex. "Visar 3 av 5 ändringar".
Varningar och nycklar som stavas olika kommer alltid med.

- **Innehåll:** vilka resurser som jämförts (Före och Efter), IG-version,
  profiler som gav etiketterna, urval, tidpunkt, sammanfattning, varningar och
  en numrerad tabell med typ, svensk beskrivning och sökväg för varje ändring.
- **Ett format-oberoende underlag.** `buildReviewReport` i
  `src/core/reporting/report` bygger en `ReviewReport` av en `Comparison`.
  `renderReportMarkdown` och `renderReportHtml` gör om den till text, så båda
  formaten säger samma sak och kan testas utan webbläsare.
- **Granskningsstatus och kommentarer** kan läggas till senare. Varje
  `ReportEntry` har ett `id` som är detsamma för samma par av resurser, så
  status och kommentarer kan sparas per id och läggas in som nya fält och
  kolumner utan att resten ändras.
- **PDF utan nytt beroende.** PDF-knappen skriver ut ett fristående
  HTML-dokument med egna utskriftsstilar från en dold iframe, och
  webbläsarens **Spara som PDF** gör PDF:en. Dokumentets titel blir förslaget
  på filnamn. Iframen får inte köra skript.
- **Värden från resurserna escapas** i båda formaten, så en text som
  `<script>` eller `|` visas som den står och inte bryter tabellen.
- Filnamnet blir `granskningsrapport-<resurstyp>-<id>-<datum>`, där tecken som
  inte passar i ett filnamn byts mot `_`.
