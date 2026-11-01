import { describe, expect, it } from 'vitest'
import { diffResources } from '../../src/core/diff/diffResources'
import { formatPath } from '../../src/core/diff/formatPath'
import { resource } from '../helpers/resource'

function summary(before: ReturnType<typeof resource>, after: ReturnType<typeof resource>) {
  return diffResources(before, after).changes.map((c) => ({
    kind: c.kind,
    path: formatPath(c.path),
    elementPath: c.elementPath,
    before: c.before,
    after: c.after,
  }))
}

describe('diff of values', () => {
  it('reports nothing for identical resources, regardless of key order', () => {
    const a = resource('Organization', { name: 'A', active: true })
    const b = { active: true, name: 'A', resourceType: 'Organization' }
    expect(diffResources(a, b).changes).toEqual([])
  })

  it('reports changed, added and removed primitives', () => {
    expect(
      summary(resource('Organization', { name: 'A', active: true }), resource('Organization', { name: 'B', alias: ['X'] })),
    ).toEqual([
      { kind: 'changed', path: 'name', elementPath: 'Organization.name', before: 'A', after: 'B' },
      { kind: 'added', path: 'alias', elementPath: 'Organization.alias', before: undefined, after: ['X'] },
      { kind: 'removed', path: 'active', elementPath: 'Organization.active', before: true, after: undefined },
    ])
  })

  it('reports an added object once, not once per leaf', () => {
    const changes = diffResources(resource('Location'), resource('Location', { address: { city: 'Enskede', line: ['A'] } })).changes
    expect(changes).toHaveLength(1)
    expect(changes[0]).toMatchObject({ kind: 'added', elementPath: 'Location.address' })
  })

  it('descends into nested objects', () => {
    expect(
      summary(resource('Location', { address: { city: 'Enskede' } }), resource('Location', { address: { city: 'Stockholm' } })),
    ).toEqual([{ kind: 'changed', path: 'address.city', elementPath: 'Location.address.city', before: 'Enskede', after: 'Stockholm' }])
  })

  it('reports a change of JSON type as a single change', () => {
    expect(summary(resource('Organization', { active: 'true' }), resource('Organization', { active: true }))).toEqual([
      { kind: 'changed', path: 'active', elementPath: 'Organization.active', before: 'true', after: true },
    ])
    expect(summary(resource('Organization', { partOf: 'x' }), resource('Organization', { partOf: { reference: 'x' } }))).toHaveLength(1)
  })

  it('treats null as a value', () => {
    expect(summary(resource('Organization', { name: null }), resource('Organization', { name: 'A' }))).toEqual([
      { kind: 'changed', path: 'name', elementPath: 'Organization.name', before: null, after: 'A' },
    ])
  })

  it('treats primitive extensions (_element) as ordinary properties', () => {
    const ext = { extension: [{ url: 'http://example.org/x', valueString: 'y' }] }
    expect(summary(resource('Organization', { name: 'A' }), resource('Organization', { name: 'A', _name: ext }))).toEqual([
      { kind: 'added', path: '_name', elementPath: 'Organization._name', before: undefined, after: ext },
    ])
  })

  it('pairs list items by key and diffs inside them', () => {
    const before = resource('Organization', {
      telecom: [
        { system: 'phone', value: '1', use: 'work' },
        { system: 'email', value: 'a@b.se' },
      ],
    })
    const after = resource('Organization', {
      telecom: [
        { system: 'email', value: 'a@b.se' },
        { system: 'phone', value: '1', use: 'home' },
      ],
    })
    expect(summary(before, after)).toEqual([
      {
        kind: 'changed',
        path: 'telecom[system=phone,value=1].use',
        elementPath: 'Organization.telecom.use',
        before: 'work',
        after: 'home',
      },
    ])
  })

  it('reports a whole list item as added or removed', () => {
    const before = resource('Organization', { alias: ['A', 'B'] })
    const after = resource('Organization', { alias: ['A'] })
    expect(summary(before, after)).toEqual([
      { kind: 'removed', path: 'alias[1]', elementPath: 'Organization.alias', before: 'B', after: undefined },
    ])
  })

  it('reports a changed keyless primitive list item as a change at its position', () => {
    expect(summary(resource('Organization', { alias: ['A'] }), resource('Organization', { alias: ['B'] }))).toEqual([
      { kind: 'changed', path: 'alias[0]', elementPath: 'Organization.alias', before: 'A', after: 'B' },
    ])
  })
})
