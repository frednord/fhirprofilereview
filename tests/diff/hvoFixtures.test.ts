import { describe, expect, it } from 'vitest'
import { diffResources } from '../../src/core/diff/diffResources'
import { formatPath } from '../../src/core/diff/formatPath'
import type { DiffChange } from '../../src/core/diff/types'
import { HVO_IG_MANIFEST } from '../../src/core/profiles/hvoManifest'
import { asArray, asObject, loadBundleEntry, loadFixture } from '../helpers/hvoFixtures'

const HSA_ID = 'urn:oid:1.2.752.29.4.19'
const ORG_NR = 'urn:oid:2.5.4.97'
const UNIT = 'organization-ff585a36-aa0d-4cba-acbd-12cedcf370b6.json'
const UNIT_WITH_TWO_IDS = 'organization-11aa1f8f-b5df-4e2d-97b8-15320352ac85.json'
const BUSINESS = 'healthcareservice-0621be80-e786-4b5d-beb5-c20faadf9a25.json'
const LOCATION = 'location-253e11a2-4f15-41a6-abc9-59cc80867540.json'
const PROVIDER_BUNDLE = 'bundle-58e286ab-601c-401a-bd2f-48b1a66bb889.json'
const PROVIDER_ID = '50efe090-0948-4a41-9f5e-254ac69e3a7b'

const describeChanges = (changes: DiffChange[]) => changes.map((c) => `${c.kind} ${formatPath(c.path)}`)

describe('diff of HVO IG examples (se.electronichealth.fhir.hvo.r5@0.5.1)', () => {
  it.each([UNIT, UNIT_WITH_TWO_IDS, BUSINESS, LOCATION, PROVIDER_BUNDLE])('finds no changes when %s is compared with itself', (file) => {
    expect(diffResources(loadFixture(file), loadFixture(file)).changes).toEqual([])
  })

  it('finds no changes when every list in a resource is reversed', () => {
    const after = loadFixture(UNIT)
    asArray(after['extension']).reverse()
    asArray(after['contact']).reverse()
    asArray(asObject(asArray(after['contained'])[0])['location']).reverse()
    expect(diffResources(loadFixture(UNIT), after).changes).toEqual([])
  })

  it('reports a new HSA-id as one change of identifier value', () => {
    const after = loadFixture(UNIT_WITH_TWO_IDS)
    asArray(after['identifier']).reverse()
    asObject(asArray(after['identifier'])[1])['value'] = 'SE2324679125-NEW'
    const changes = diffResources(loadFixture(UNIT_WITH_TWO_IDS), after).changes
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({
      kind: 'changed',
      elementPath: 'Organization.identifier.value',
      before: 'SE2324679125-23B7',
      after: 'SE2324679125-NEW',
    })
    expect(formatPath(changes[0]?.path ?? [])).toBe(`identifier[system=${HSA_ID}].value`)
  })

  it('reports a new organisation number on an HVOOrganization taken from a Bundle', () => {
    const before = loadBundleEntry(PROVIDER_BUNDLE, PROVIDER_ID)
    const after = loadBundleEntry(PROVIDER_BUNDLE, PROVIDER_ID)
    const orgNr = asArray(after['identifier']).map(asObject).find((id) => id['system'] === ORG_NR)
    expect(orgNr).toBeDefined()
    if (orgNr) orgNr['value'] = '5500000000'
    expect(describeChanges(diffResources(before, after).changes)).toEqual([`changed identifier[system=${ORG_NR}].value`])
  })

  it('reports an added contact as a whole item', () => {
    const after = loadFixture(UNIT_WITH_TWO_IDS)
    asArray(after['contact']).push({
      purpose: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/contactentity-type', code: 'ADMIN' }] },
      telecom: [{ system: 'email', value: 'admin@example.se' }],
    })
    const changes = diffResources(loadFixture(UNIT_WITH_TWO_IDS), after).changes
    expect(describeChanges(changes)).toEqual(['added contact[purpose.coding.0.code=ADMIN,telecom.0.system=email]'])
    expect(changes[0]?.elementPath).toBe('Organization.contact')
  })

  it('tells contacts with the same purpose apart by telecom system', () => {
    const after = loadFixture(UNIT)
    const fax = asArray(after['contact'])
      .map(asObject)
      .find((c) => JSON.stringify(c['telecom'] ?? []).includes('"fax"'))
    asObject(asArray(fax?.['telecom'])[0])['value'] = '+460000000'
    expect(describeChanges(diffResources(loadFixture(UNIT), after).changes)).toEqual([
      'changed contact[purpose.coding.0.code=PROF,telecom.0.system=fax].telecom[system=fax].value',
    ])
  })

  it('finds changes inside a contained HealthcareService and names them by its own type', () => {
    const after = loadFixture(UNIT)
    const business = asObject(asArray(after['contained'])[0])
    asArray(business['category']).splice(1, 1)
    asArray(business['location']).push({ reference: 'Location/new' })
    const changes = diffResources(loadFixture(UNIT), after).changes
    const prefix = 'contained[resourceType=HealthcareService,id=OrganizationTransactionBusiness1]'
    expect(describeChanges(changes)).toEqual([
      `removed ${prefix}.category[coding.0.system=urn:oid:1.2.752.129.2.2.1.3,coding.0.code=1140]`,
      `added ${prefix}.location[reference=Location/new]`,
    ])
    expect(changes.map((c) => c.elementPath)).toEqual(['HealthcareService.category', 'HealthcareService.location'])
  })

  it('reports a changed eligibility age limit in a contained Group', () => {
    const after = loadFixture(BUSINESS)
    const group = asObject(asArray(after['contained'])[0])
    const range = asObject(asObject(asArray(group['characteristic'])[0])['valueRange'])
    asObject(range['high'])['value'] = 18
    const changes = diffResources(loadFixture(BUSINESS), after).changes
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ kind: 'changed', elementPath: 'Group.characteristic.valueRange.high.value', before: 17, after: 18 })
  })

  it('reports a moved SWEREF 99 position as changes to nested extensions', () => {
    const after = loadFixture(LOCATION)
    const position = asObject(asArray(after['extension'])[0])
    asObject(asArray(position['extension'])[0])['valueDecimal'] = 6473600
    const changes = diffResources(loadFixture(LOCATION), after).changes
    expect(describeChanges(changes)).toEqual([
      'changed extension[url=http://electronichealth.se/fhir/hvo/StructureDefinition/HVOSweref99PositionExtension].extension[url=latitude].valueDecimal',
    ])
  })

  it('reports an ended organisation period', () => {
    const after = loadFixture(UNIT)
    const period = asArray(after['extension'])
      .map(asObject)
      .find((e) => e['url'] === 'http://hl7.org/fhir/StructureDefinition/organization-period')
    asObject(period?.['valuePeriod'])['end'] = '2026-12-31'
    const changes = diffResources(loadFixture(UNIT), after, { ig: HVO_IG_MANIFEST })
    expect(changes.changes).toMatchObject([{ kind: 'added', elementPath: 'Organization.extension.valuePeriod.end', after: '2026-12-31' }])
    expect(changes.ig).toEqual({ packageId: 'se.electronichealth.fhir.hvo.r5', version: '0.5.1', pinned: true })
  })

  it('pairs Bundle entries by fullUrl', () => {
    const after = loadFixture(PROVIDER_BUNDLE)
    asArray(after['entry']).reverse()
    expect(diffResources(loadFixture(PROVIDER_BUNDLE), after).changes).toEqual([])
  })
})
