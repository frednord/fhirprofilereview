import { describe, expect, it } from 'vitest'
import { diffResources } from '../../src/core/diff/diffResources'
import { formatPath } from '../../src/core/diff/formatPath'
import { HVO_IG_MANIFEST } from '../../src/core/profiles/hvoManifest'
import { resource } from '../helpers/resource'

describe('diffResources', () => {
  it('warns about different resource types but still compares', () => {
    const result = diffResources(resource('Organization', { name: 'A' }), resource('Location', { name: 'A' }))
    expect(result.warnings).toEqual([{ kind: 'resource-type-mismatch', before: 'Organization', after: 'Location' }])
    expect(result.resourceType).toBe('Location')
    expect(result.changes.map((c) => c.elementPath)).toEqual(['Location.resourceType'])
  })

  it('warns about different ids, but not when one side has none', () => {
    expect(diffResources(resource('Location', { id: 'a' }), resource('Location', { id: 'b' })).warnings).toEqual([
      { kind: 'id-mismatch', before: 'a', after: 'b' },
    ])
    expect(diffResources(resource('Location', { id: 'a' }), resource('Location')).warnings).toEqual([])
  })

  it('includes the IG version when one is given', () => {
    expect(diffResources(resource('Location'), resource('Location')).ig).toBeUndefined()
    expect(diffResources(resource('Location'), resource('Location'), { ig: HVO_IG_MANIFEST }).ig).toEqual({
      packageId: 'se.electronichealth.fhir.hvo.r5',
      version: '0.5.1',
      pinned: true,
    })
    expect(
      diffResources(resource('Location'), resource('Location'), { ig: { ...HVO_IG_MANIFEST, version: 'current' } }).ig?.pinned,
    ).toBe(false)
  })

  describe('ignorePaths', () => {
    const meta = (lastUpdated: string) => ({ meta: { lastUpdated, versionId: lastUpdated } })
    const before = resource('Organization', {
      ...meta('1'),
      contained: [{ resourceType: 'HealthcareService', id: 'b', ...meta('1') }],
    })
    const after = resource('Organization', {
      ...meta('2'),
      contained: [{ resourceType: 'HealthcareService', id: 'b', ...meta('2') }],
    })
    const paths = (ignorePaths: string[]) => diffResources(before, after, { ignorePaths }).changes.map((c) => c.elementPath)

    it('reports everything by default', () => {
      expect(paths([])).toHaveLength(4)
    })

    it('applies a relative path to every resource, including contained ones', () => {
      expect(paths(['meta.lastUpdated'])).toEqual(['Organization.meta.versionId', 'HealthcareService.meta.versionId'])
    })

    it('applies a path starting with a resource type to that type only, including descendants', () => {
      expect(paths(['Organization.meta'])).toEqual(['HealthcareService.meta.lastUpdated', 'HealthcareService.meta.versionId'])
    })

    it('does not match on a partial element name', () => {
      expect(paths(['met'])).toHaveLength(4)
    })
  })

  describe('matchKeys', () => {
    it('lets an element path override the default for that element only', () => {
      const before = resource('Organization', { identifier: [{ system: 's', value: '1', use: 'old' }] })
      const after = resource('Organization', { identifier: [{ system: 's', value: '2', use: 'old' }] })
      // With the default (system), the item is paired and its value changes.
      expect(diffResources(before, after).changes.map((c) => c.kind)).toEqual(['changed'])
      // Keyed on value alone, a new value means a different identifier.
      const changes = diffResources(before, after, { matchKeys: { 'Organization.identifier': [['value']] } }).changes
      expect(changes.map((c) => [c.kind, formatPath(c.path)])).toEqual([
        ['removed', 'identifier[value=1]'],
        ['added', 'identifier[value=2]'],
      ])
    })

    it('prefers an element path over an element name in the defaults', () => {
      const characteristic = (code: string, high: number) => ({
        code: { coding: [{ system: 'http://snomed.info/sct', code }] },
        valueRange: { high: { value: high } },
      })
      const before = resource('Group', { characteristic: [characteristic('a', 17), characteristic('b', 1)] })
      const after = resource('Group', { characteristic: [characteristic('b', 1), characteristic('a', 18)] })
      expect(diffResources(before, after).changes.map((c) => formatPath(c.path))).toEqual([
        'characteristic[code.coding.0.system=http://snomed.info/sct,code.coding.0.code=a].valueRange.high.value',
      ])
    })
  })
})
