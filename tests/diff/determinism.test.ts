import { describe, expect, it } from 'vitest'
import { diffResources } from '../../src/core/diff/diffResources'
import type { ChangeKind, DiffChange } from '../../src/core/diff/types'
import { asArray, asObject, loadFixture } from '../helpers/hvoFixtures'

const UNIT = 'organization-ff585a36-aa0d-4cba-acbd-12cedcf370b6.json'

function modifiedUnit() {
  const after = loadFixture(UNIT)
  after['name'] = 'Avdelning Kardiologi 2'
  asArray(after['contact']).splice(0, 1)
  asArray(after['identifier']).push({ system: 'http://electronichealth.se/identifier/organizationalUnit', value: 'x' })
  asObject(asArray(after['contained'])[0])['comment'] = 'Ny'
  asArray(after['extension']).reverse()
  return after
}

const FLIPPED: Record<ChangeKind, ChangeKind> = { added: 'removed', removed: 'added', changed: 'changed', moved: 'moved' }
const signature = (c: DiffChange, flip = false) =>
  JSON.stringify([flip ? FLIPPED[c.kind] : c.kind, c.elementPath, flip ? c.after : c.before, flip ? c.before : c.after])

describe('determinism', () => {
  it('gives identical output for identical input', () => {
    const first = diffResources(loadFixture(UNIT), modifiedUnit())
    const second = diffResources(loadFixture(UNIT), modifiedUnit())
    expect(first).toEqual(second)
    expect(first.changes).toHaveLength(4)
  })

  it('gives the mirror image when the versions are swapped', () => {
    const forward = diffResources(loadFixture(UNIT), modifiedUnit()).changes.map((c) => signature(c)).sort()
    const backward = diffResources(modifiedUnit(), loadFixture(UNIT)).changes.map((c) => signature(c, true)).sort()
    expect(backward).toEqual(forward)
  })

  it('orders changes by position in the after version', () => {
    const paths = diffResources(loadFixture(UNIT), modifiedUnit()).changes.map((c) => c.elementPath)
    expect(paths).toEqual(['Organization.identifier', 'HealthcareService.comment', 'Organization.contact', 'Organization.name'])
  })
})
