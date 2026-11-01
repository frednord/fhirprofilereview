import { describe, expect, it } from 'vitest'
import { diffResources } from '../../src/core/diff'
import { HVO_LABELS } from '../../src/core/profiles/hvo/0.5.1'
import { describeChanges, selectProfiles, type LabelSet } from '../../src/core/reporting'
import type { FhirResource } from '../../src/types/fhir'
import { asArray, asObject, loadFixture } from '../helpers/hvoFixtures'
import { resource } from '../helpers/resource'

const UNIT_WITH_TWO_IDS = 'organization-11aa1f8f-b5df-4e2d-97b8-15320352ac85.json'
const UNIT = 'organization-ff585a36-aa0d-4cba-acbd-12cedcf370b6.json'
const LOCATION = 'location-253e11a2-4f15-41a6-abc9-59cc80867540.json'
const PROVIDER_BUNDLE = 'bundle-58e286ab-601c-401a-bd2f-48b1a66bb889.json'
const SD = 'http://electronichealth.se/fhir/hvo/StructureDefinition'
const PROF = { coding: [{ system: 'http://electronichealth.se/CodeSystem/fhir/hvo-extended-contact-entity-type', code: 'PROF' }] }

function texts(before: FhirResource, after: FhirResource, labels: LabelSet = HVO_LABELS): string[] {
  return describeChanges(before, after, diffResources(before, after), labels).map((d) => d.text)
}

/** Loads a fixture twice and lets the test edit the second copy. */
function edited(file: string, edit: (after: FhirResource) => void): [FhirResource, FhirResource] {
  const after = loadFixture(file)
  edit(after)
  return [loadFixture(file), after]
}

describe('describeChanges on HVO examples', () => {
  it('names identifiers by their profile slice', () => {
    const [before, after] = edited(UNIT_WITH_TWO_IDS, (a) => {
      asObject(asArray(a['identifier'])[0])['value'] = 'SE2324679125-24C1'
    })
    expect(texts(before, after)).toEqual(['HSA-id ändrades från ”SE2324679125-23B7” till ”SE2324679125-24C1”'])
  })

  it('names the organisation number of an HVOOrganization in a Bundle and prefixes the resource', () => {
    const [before, after] = edited(PROVIDER_BUNDLE, (bundle) => {
      const provider = asArray(bundle['entry']).map((e) => asObject(asObject(e)['resource'])).find((r) => r['id'] === '50efe090-0948-4a41-9f5e-254ac69e3a7b')
      const orgNr = asArray(provider?.['identifier']).map(asObject).find((id) => id['system'] === 'urn:oid:2.5.4.97')
      if (orgNr) orgNr['value'] = '5500000000'
    })
    const [text] = texts(before, after)
    expect(text).toMatch(/^Organisation 50efe090-0948-4a41-9f5e-254ac69e3a7b: Organisationsnummer ändrades från ”\d+” till ”5500000000”$/)
  })

  it('describes an added contact by telecom system and purpose', () => {
    const [before, after] = edited(UNIT_WITH_TWO_IDS, (a) => {
      asArray(a['contact']).push({ purpose: PROF, telecom: [{ system: 'fax', value: '+46812345' }] })
    })
    expect(texts(before, after)).toEqual(['Kontakt för fax (Professionell) lades till: fax +46812345'])
  })

  it('names a changed phone number inside a contact', () => {
    const [before, after] = edited(UNIT_WITH_TWO_IDS, (a) => {
      asObject(asArray(asObject(asArray(a['contact'])[0])['telecom'])[0])['value'] = '+46700000000'
    })
    expect(texts(before, after)).toEqual([
      'Kontakt för telefon (Professionell), kontaktuppgift ändrades från ”+46730748674” till ”+46700000000”',
    ])
  })

  it('describes extensions by their value', () => {
    const [before, after] = edited(UNIT_WITH_TWO_IDS, (a) => {
      const [active, period] = asArray(a['extension']).map(asObject)
      if (active) active['valueBoolean'] = false
      if (period) asObject(period['valuePeriod'])['end'] = '2026-12-31'
    })
    expect(texts(before, after)).toEqual([
      'Aktiv i Företagsregistret ändrades från ja till nej',
      'Verksamhetsperiod, slutdatum lades till: ”2026-12-31”',
    ])
  })

  it('prefixes changes in a contained HVOBusiness with the business', () => {
    const [before, after] = edited(UNIT, (a) => {
      asArray(asObject(asArray(a['contained'])[0])['category']).splice(1, 1)
    })
    expect(texts(before, after)).toEqual(['Verksamhet OrganizationTransactionBusiness1: Verksamhetstyp togs bort (var 1140)'])
  })

  it('names municipality and county codes, which share a system, by their length', () => {
    const rlk = 'http://metadata.scb.se/classifications/RLK'
    const [before, after] = edited(LOCATION, (a) => {
      asArray(a['identifier']).push({ system: rlk, value: '0180' }, { system: rlk, value: '01' })
      asObject(a['address'])['city'] = 'Stockholm'
    })
    expect(texts(before, after)).toEqual([
      'Kommunkod lades till: ”0180”',
      'Länskod lades till: ”01”',
      'Postort ändrades från ”Enskede” till ”Stockholm”',
    ])
  })

  it('names a precinct extension inside the address', () => {
    const [before, after] = edited(LOCATION, (a) => {
      asObject(asArray(asObject(a['address'])['extension'])[0])['valueString'] = 'Hökarängen'
    })
    expect(texts(before, after)).toEqual(['Kommundel ändrades från ”Stureby” till ”Hökarängen”'])
  })

  it('shows a code with its Swedish name from the IG', () => {
    const before = resource('Organization', { type: [{ coding: [{ system: 'http://snomed.info/sct', code: '43741000' }] }] })
    const after = resource('Organization')
    expect(texts(before, after)).toEqual(['Organisationstyp togs bort (var vårdenhet (43741000))'])
  })
})

describe('describeChanges fallback', () => {
  it('describes an element without a rule by its path and marks it', () => {
    const before = resource('Organization')
    const after = resource('Organization', { language: 'sv' })
    const [description] = describeChanges(before, after, diffResources(before, after), HVO_LABELS)
    expect(description).toMatchObject({ text: 'Fältet language lades till: ”sv”', source: 'fallback' })
  })

  it('keeps the named part of the path and shows the rest raw', () => {
    const before = resource('Organization', { partOf: { reference: 'Organization/a' } })
    const after = resource('Organization', { partOf: { reference: 'Organization/a', type: 'Organization' } })
    const [description] = describeChanges(before, after, diffResources(before, after), HVO_LABELS)
    expect(description).toMatchObject({ text: 'Överordnad organisation, typ lades till: ”Organization”', source: 'rule' })
  })

  it('shows the match key of a list item that fits no slice', () => {
    const before = resource('Organization', { identifier: [{ system: 'urn:example', value: 'a' }] })
    const after = resource('Organization', { identifier: [{ system: 'urn:example', value: 'a', use: 'old' }] })
    expect(texts(before, after)).toEqual(['Identifierare (urn:example a), användning lades till: ”old”'])
  })

  it('works for resource types without labels', () => {
    const empty: LabelSet = { profiles: [], codes: {}, childLabels: {} }
    expect(texts(resource('Patient', { gender: 'male' }), resource('Patient', { gender: 'female' }), empty)).toEqual([
      'Fältet gender ändrades från ”male” till ”female”',
    ])
  })

  it('gives the same output for the same input', () => {
    const [before, after] = edited(UNIT, (a) => {
      a['name'] = 'Ny'
      asArray(a['contact']).reverse().pop()
    })
    expect(texts(before, after)).toEqual(texts(before, after))
  })
})

describe('selectProfiles', () => {
  it('uses meta.profile when it names a known profile, ignoring the version', () => {
    const unit = resource('Organization', { meta: { profile: [`${SD}/HVOOrganizationalUnit|0.5.1`] } })
    expect(selectProfiles(HVO_LABELS, [unit]).map((p) => p.profile)).toEqual(['HVOOrganizationalUnit'])
  })

  it('falls back to every profile for the resource type, in priority order', () => {
    expect(selectProfiles(HVO_LABELS, [resource('Organization')]).map((p) => p.profile)).toEqual([
      'HVOOrganization',
      'HVOOrganizationalUnit',
    ])
    expect(selectProfiles(HVO_LABELS, [resource('HealthcareService')]).map((p) => p.profile)).toEqual(['HVOBusiness'])
  })

  it('labels a resource by its declared profile', () => {
    const meta = { profile: [`${SD}/HVOOrganizationalUnit`] }
    const before = resource('Organization', { meta, type: [{ coding: [{ system: 'http://snomed.info/sct', code: '43741000' }] }] })
    const after = resource('Organization', { meta })
    expect(texts(before, after)).toEqual(['Enhetstyp togs bort (var vårdenhet (43741000))'])
  })
})
