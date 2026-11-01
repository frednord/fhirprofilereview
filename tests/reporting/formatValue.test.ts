import { describe, expect, it } from 'vitest'
import { HVO_CODE_LABELS } from '../../src/core/profiles/hvo/0.5.1/codes'
import { formatValue } from '../../src/core/reporting'

const show = (value: Parameters<typeof formatValue>[0]) => formatValue(value, HVO_CODE_LABELS)

describe('formatValue', () => {
  it.each([
    ['text', '”text”'],
    [true, 'ja'],
    [false, 'nej'],
    [17, '17'],
    [null, 'null'],
  ] as const)('shows %j as %s', (value, expected) => {
    expect(show(value)).toBe(expected)
  })

  it('shows a Coding by its Swedish name and code, or the code alone', () => {
    expect(show({ system: 'http://snomed.info/sct', code: '143591000052106' })).toBe('vårdgivare (143591000052106)')
    expect(show({ system: 'urn:oid:1.2.752.129.2.2.1.3', code: '1123' })).toBe('1123')
    expect(show({ system: 'urn:x', code: 'a', display: 'Ett A' })).toBe('Ett A (a)')
  })

  it('shows a CodeableConcept by its codings', () => {
    expect(show({ coding: [{ system: 'http://metadata.scb.se/classifications/RLK', code: '01' }] })).toBe('Stockholms län (01)')
  })

  it('shows a Period, an open end as "tills vidare"', () => {
    expect(show({ start: '2020-01-01', end: '2026-12-31' })).toBe('2020-01-01 – 2026-12-31')
    expect(show({ start: '2020-01-01' })).toBe('2020-01-01 – tills vidare')
  })

  it('shows references, identifiers, contact points and addresses compactly', () => {
    expect(show({ reference: 'Location/1' })).toBe('Location/1')
    expect(show({ system: 'urn:oid:1.2.752.29.4.19', value: 'SE1' })).toBe('”SE1”')
    expect(show({ system: 'email', value: 'a@b.se' })).toBe('e-post a@b.se')
    expect(show({ line: ['Gatan', '1'], postalCode: '12264', city: 'Enskede' })).toBe('Gatan, 1, 12264 Enskede')
  })

  it('shows an extension by its value and a resource by type and id', () => {
    expect(show({ url: 'http://x', valueBoolean: true })).toBe('ja')
    expect(show({ resourceType: 'HealthcareService', id: 'b1' })).toBe('HealthcareService/b1')
  })

  it('shows unknown objects as shortened JSON', () => {
    expect(show({ a: 1 })).toBe('{"a":1}')
    expect(show({ a: 'x'.repeat(200) })).toHaveLength(120)
  })
})
