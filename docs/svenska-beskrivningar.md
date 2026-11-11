# Svenska ändringsbeskrivningar

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
