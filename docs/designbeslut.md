# Designbeslut

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
