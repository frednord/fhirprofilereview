# HVO-exempel som testdata

Exempelfiler från E-hälsomyndighetens paket `se.electronichealth.fhir.hvo.r5@0.5.1`
(FHIR 5.0.0), som är paketet bakom guiden
[OrganizationContractOffering 0.5.0](https://simplifier.net/guide/organizationcontractoffering?version=0.5.0).

Filerna är oförändrade kopior. `fixtures.manifest.json` anger varifrån varje fil
kommer och dess SHA-256, och `tests/profiles/fixtures.test.ts` kontrollerar att
de inte har ändrats. Tester som behöver en ändrad version gör ändringen i koden
utifrån originalet, så att det syns i testet vad som ändrats.

Byte av IG-version görs genom att lägga en ny mapp bredvid denna med det nya
paketnamnet och versionen, inte genom att skriva över filerna här.
