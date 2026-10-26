# CLAUDE.md

# Project

FHIR Profile Review Assistant

Ett webbaserat verktyg för att analysera, validera och jämföra FHIR-resurser mot specifika FHIR-profiler och implementationsguider.

Projektet fokuserar initialt på E-hälsomyndighetens implementationguide för Swedish Provider Directory (HVO), med t.ex. profiler så som:

- HVOOrganization
- HVOOrganizationalUnit
- HVOBusiness
- HVOLocation

Verktyget ska hjälpa utvecklare och testare att:

- Jämföra två versioner av samma FHIR-resurs
- Visa semantiska skillnader istället för enbart ren JSON-diff
- Validera resurser mot valda profiler
- Identifiera profilöverträdelser
- Generera AI-baserade sammanfattningar av ändringar och risker

Målet är att minska den manuella analys som idag krävs vid granskning av FHIR-resurser och olika implementationer.

---

# Tech stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

## FHIR Processing

- FHIR R5
- JSON Schema validation
- Profile-aware validation

## Testing

- Vitest
- React Testing Library

## Deployment

- GitHub Pages

## AI Support

- Claude Code används som utvecklingsagent
- AI-funktioner ska vara valfria och fungera som ett komplement till den deterministiska analysen

---

# Core Features

## Resource Comparison

Användaren ska kunna:

- Klistra in två FHIR-resurser
- Ladda upp två JSON-filer
- Jämföra resurserna
- Se tillagda, borttagna och ändrade fält

## Semantic Diff

Systemet ska presentera skillnader utifrån FHIR-begrepp.

Exempel:

Istället för:

identifier[0].value changed

ska systemet kunna visa:

Organisationsnummer ändrades från X till Y

## Profile Validation

Systemet ska kunna kontrollera:

- Obligatoriska fält
- Cardinality
- Terminologibindningar
- Constraints som definieras i den valda profilen

## AI Summary

Systemet ska kunna generera:

- Kort sammanfattning
- Riskanalys
- Förslag på områden som bör granskas manuellt

---

# Code Conventions

## General

- TypeScript strict mode ska användas.
- ESLint warnings ska åtgärdas.
- Inga any-typer utan motivering.
- Funktioner ska vara små och fokuserade.
- Föredra rena funktioner där det är möjligt.

## Naming

- PascalCase för komponenter.
- camelCase för funktioner och variabler.
- UPPER_SNAKE_CASE för konstanter.

## Comments

- Kommentera varför något görs.
- Kommentera inte självklar kod.
- Komplex logik ska dokumenteras.

---

# Architecture

## Layer Separation

Frontend får inte innehålla affärslogik.

Affärslogik ska ligga i:

src/core

Externa integrationer ska ligga i:

src/integrations

UI-relaterad kod ska ligga i:

src/components

## Dependency Direction

Tillåtna beroenden:

components -> core

integrations -> core

Förbjudet:

core -> components

core -> integrations

## Validation

Valideringslogik ska vara frikopplad från UI.

All validering ska kunna testas utan webbläsare.

## Diff Engine

Diff-motorn ska vara oberoende av React.

Den ska kunna återanvändas från:

- Web UI
- CLI
- Tester

---

# Rules

## Dependency Management

Lägg inte till nya beroenden utan att först motivera varför de behövs.

Föredra små och väletablerade bibliotek.

## Scope Protection

Implementera endast funktioner som stödjer:

- FHIR-analys
- FHIR-jämförelse
- FHIR-validering

Lägg inte till användarhantering, inloggning eller databaser utan uttryckligt beslut.

## Profile Support

Prioritera stöd för:

1. E-hälsomyndighetens HVO-profiler
2. Generiska FHIR R5-profiler

Optimera inte för andra implementationguider innan HVO-stödet fungerar.

## AI Usage

AI får aldrig vara den enda källan till valideringsresultat.

Valideringar och diffar ska vara deterministiska.

AI används endast för:

- Summering
- Förklaringar
- Riskbedömningar

---

# Project Structure

src/

├── components/
│   ├── editor/
│   ├── diff/
│   ├── validation/
│   └── summary/
│
├── core/
│   ├── parser/
│   ├── diff/
│   ├── validation/
│   ├── profiles/
│   └── reporting/
│
├── integrations/
│   └── ai/
│
├── pages/
│
├── hooks/
│
├── types/
│
└── utils/

tests/

├── diff/
├── validation/
├── profiles/
└── reporting/

---

# Definition of Done

En feature anses färdig när:

- Funktionaliteten fungerar
- Tester finns
- Tester passerar
- ESLint passerar
- TypeScript compile passerar
- Dokumentation är uppdaterad
- Ingen känd regression har introducerats

---

# Non Goals

Projektet ska inte innehålla:

- Patientdatahantering
- Journalfunktioner
- FHIR-server
- Databaslagring
- Autentisering
- Behörighetsstyrning

Målet är analys och granskning av FHIR-resurser, inte lagring eller publicering av dem.
