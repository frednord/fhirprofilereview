import { describe, expect, it } from 'vitest'
import { detectMoves } from '../../src/core/diff/detectMoves'
import { diffResources } from '../../src/core/diff/diffResources'
import { formatPath } from '../../src/core/diff/formatPath'
import type { DiffChange } from '../../src/core/diff/types'
import { asArray, asObject, loadFixture } from '../helpers/hvoFixtures'
import { resource } from '../helpers/resource'

const PHONE = { system: 'phone', value: '+46812345' }
const PROF = { coding: [{ system: 'http://electronichealth.se/CodeSystem/fhir/hvo-extended-contact-entity-type', code: 'PROF' }] }

/** kind, from → to, so a test reads like the list on the page. */
function summary(changes: readonly DiffChange[]): string[] {
  return changes.map((c) => (c.from === undefined ? `${c.kind} ${formatPath(c.path)}` : `${c.kind} ${formatPath(c.from.path)} → ${formatPath(c.path)}`))
}

describe('detectMoves', () => {
  it('joins a value removed in one place and added unchanged in another', () => {
    const before = resource('Organization', { telecom: [PHONE], contact: [{ purpose: PROF }] })
    const after = resource('Organization', { contact: [{ purpose: PROF, telecom: [PHONE] }] })
    const { changes } = diffResources(before, after)
    expect(summary(changes)).toEqual(['moved telecom → contact[purpose.coding.0.code=PROF].telecom'])
    expect(changes[0]).toMatchObject({
      elementPath: 'Organization.contact.telecom',
      from: { elementPath: 'Organization.telecom' },
      before: [PHONE],
      after: [PHONE],
    })
  })

  it('finds a removed value inside a new parent and keeps the parent as added', () => {
    const before = resource('Organization', { telecom: [PHONE] })
    const after = resource('Organization', { contact: [{ purpose: PROF, telecom: [PHONE] }] })
    expect(summary(diffResources(before, after).changes)).toEqual([
      'added contact',
      'moved telecom → contact[purpose.coding.0.code=PROF,telecom.0.system=phone].telecom',
    ])
  })

  it('finds an added value inside a removed parent and keeps the parent as removed', () => {
    const before = resource('Organization', { contact: [{ purpose: PROF, telecom: [PHONE] }] })
    const after = resource('Organization', { telecom: [PHONE] })
    expect(summary(diffResources(before, after).changes)).toEqual([
      'moved contact[purpose.coding.0.code=PROF,telecom.0.system=phone].telecom → telecom',
      'removed contact',
    ])
  })

  it('names list items inside a new parent by their match key', () => {
    const before = resource('Organization', { telecom: [PHONE] })
    const after = resource('Organization', { contact: [{ purpose: PROF, telecom: [{ ...PHONE }] }, { name: { text: 'x' } }] })
    const moved = diffResources(before, after).changes.find((c) => c.kind === 'moved')
    expect(moved?.path).toEqual([
      { kind: 'property', name: 'contact' },
      {
        kind: 'item',
        beforeIndex: undefined,
        afterIndex: 0,
        matchedBy: 'unmatched',
        key: { 'purpose.coding.0.code': 'PROF', 'telecom.0.system': 'phone' },
      },
      { kind: 'property', name: 'telecom' },
    ])
  })

  it('moves a value between two items of the same list', () => {
    const before = resource('Location', { address: [{ use: 'work', line: ['Gatan 1'], city: 'A' }, { use: 'home', city: 'B' }] })
    const after = resource('Location', { address: [{ use: 'work', city: 'A' }, { use: 'home', city: 'B', line: ['Gatan 1'] }] })
    expect(summary(diffResources(before, after).changes)).toEqual(['moved address[use=work].line → address[use=home].line'])
  })

  it('matches a list of one with a single item elsewhere, both ways', () => {
    const before = resource('Organization', { telecom: [PHONE], contact: [{ purpose: PROF, telecom: [{ system: 'fax', value: '1' }] }] })
    const after = resource('Organization', { contact: [{ purpose: PROF, telecom: [{ system: 'fax', value: '1' }, PHONE] }] })
    expect(summary(diffResources(before, after).changes)).toEqual([
      'moved telecom[system=phone,value=+46812345] → contact[purpose.coding.0.code=PROF,telecom.0.system=fax].telecom[system=phone,value=+46812345]',
    ])
    expect(summary(diffResources(after, before).changes)).toEqual([
      'moved contact[purpose.coding.0.code=PROF,telecom.0.system=fax].telecom[system=phone,value=+46812345] → telecom[system=phone,value=+46812345]',
    ])
  })

  it('moves a text that keeps its element name', () => {
    const before = resource('Organization', { name: 'Avd', contact: [{ purpose: PROF }] })
    const after = resource('Organization', { contact: [{ purpose: PROF, name: 'Avd' }] })
    expect(summary(diffResources(before, after).changes)).toEqual([
      'moved name → contact[purpose.coding.0.code=PROF].name',
    ])
  })

  it('does not call a shared true, number or text under another name a move', () => {
    const before = resource('Organization', { active: true, alias: ['x'], language: 'sv', count: 1 })
    const after = resource('Organization', { extension: [{ url: 'u', valueBoolean: true, valueString: 'sv', valueInteger: 1 }] })
    expect(diffResources(before, after).changes.map((c) => c.kind)).toEqual(['added', 'removed', 'removed', 'removed', 'removed'])
  })

  it('does not call empty objects or lists a move', () => {
    const before = resource('Organization', { a: {}, b: [] })
    const after = resource('Organization', { c: {}, d: [] })
    expect(diffResources(before, after).changes.map((c) => c.kind)).toEqual(['added', 'added', 'removed', 'removed'])
  })

  it('leaves a value that was moved and edited as removed plus added', () => {
    const before = resource('Organization', { telecom: [PHONE], contact: [{ purpose: PROF }] })
    const after = resource('Organization', { contact: [{ purpose: PROF, telecom: [{ ...PHONE, value: '+46899999' }] }] })
    expect(diffResources(before, after).changes.map((c) => c.kind)).toEqual(['added', 'removed'])
  })

  it('does not report a new list order as a move', () => {
    const before = resource('Organization', { identifier: [{ system: 'a', value: '1' }, { system: 'b', value: '2' }] })
    const after = resource('Organization', { identifier: [{ system: 'b', value: '2' }, { system: 'a', value: '1' }] })
    expect(diffResources(before, after).changes).toEqual([])
  })

  it('lets each value move only once', () => {
    const before = resource('Organization', { telecom: [PHONE] })
    const after = resource('Organization', { contact: [{ telecom: [PHONE] }, { telecom: [PHONE] }] })
    expect(summary(diffResources(before, after).changes)).toEqual(['added contact', 'moved telecom → contact[0].telecom'])
  })

  it('does not let one move claim a part of another', () => {
    const before = resource('Organization', { telecom: [PHONE], extra: PHONE })
    const after = resource('Organization', { contact: [{ telecom: [PHONE] }] })
    const moves = diffResources(before, after).changes.filter((c) => c.kind === 'moved')
    expect(summary(moves)).toEqual(['moved telecom → contact[0].telecom'])
  })

  it('can be turned off', () => {
    const before = resource('Organization', { telecom: [PHONE] })
    const after = resource('Organization', { contact: [{ telecom: [PHONE] }] })
    expect(diffResources(before, after, { detectMoves: false }).changes.map((c) => c.kind)).toEqual(['added', 'removed'])
  })

  it('returns the changes unchanged when nothing can have moved', () => {
    const changes: DiffChange[] = [{ kind: 'changed', path: [], elementPath: 'Organization.name', before: 'a', after: 'b' }]
    expect(detectMoves(changes)).toEqual(changes)
  })

  it('gives the mirror image when the versions are swapped', () => {
    const before = resource('Organization', { telecom: [PHONE], contact: [{ purpose: PROF }] })
    const after = resource('Organization', { contact: [{ purpose: PROF, telecom: [PHONE] }] })
    const [forward] = diffResources(before, after).changes
    const [backward] = diffResources(after, before).changes
    expect(backward?.elementPath).toBe(forward?.from?.elementPath)
    expect(backward?.from?.elementPath).toBe(forward?.elementPath)
  })

  it('finds a contained resource moved into a Bundle entry and gives each its own element path', () => {
    const unit = loadFixture('organization-ff585a36-aa0d-4cba-acbd-12cedcf370b6.json')
    const business = asObject(asArray(unit['contained'])[0])
    const after = structuredClone(unit)
    delete after['contained']
    const bundle = { resourceType: 'Bundle', entry: [{ resource: after }, { resource: business }] }
    const changes = diffResources(resource('Bundle', { entry: [{ resource: unit }] }), resource('Bundle', bundle)).changes
    const moved = changes.find((c) => c.kind === 'moved')
    expect(moved).toMatchObject({ elementPath: 'Bundle.entry.resource', from: { elementPath: 'Organization.contained' } })
  })
})
