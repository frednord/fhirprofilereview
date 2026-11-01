import { describe, expect, it } from 'vitest'
import { HVO_LABELS } from '../../src/core/profiles/hvo/0.5.1'
import { HVO_IG_MANIFEST } from '../../src/core/profiles/hvoManifest'
import { compareResources, inspectInput, type CompareSettings } from '../../src/core/reporting'
import { DEMO_AFTER, DEMO_BEFORE, demoText } from '../../src/pages/demoExample'
import { loadFixture, rawFixture } from '../helpers/hvoFixtures'

const UNIT = 'organization-11aa1f8f-b5df-4e2d-97b8-15320352ac85.json'
const SETTINGS: CompareSettings = { labels: HVO_LABELS, ig: HVO_IG_MANIFEST, ignorePaths: ['meta.lastUpdated'] }

function withMeta(lastUpdated: string, edit: (r: Record<string, unknown>) => void = () => undefined): string {
  const resource: Record<string, unknown> = { ...loadFixture(UNIT), meta: { lastUpdated } }
  edit(resource)
  return JSON.stringify(resource)
}

describe('inspectInput', () => {
  it('names the resource type and id', () => {
    expect(inspectInput(rawFixture(UNIT))).toMatchObject({ ok: true, resourceType: 'Organization', id: '11aa1f8f-b5df-4e2d-97b8-15320352ac85' })
  })

  it('tells empty input apart from an error', () => {
    expect(inspectInput('  ')).toMatchObject({ ok: false, empty: true })
    expect(inspectInput('{"name":"x"}')).toEqual({ ok: false, empty: false, message: 'Resursen saknar resourceType.' })
  })

  it('gives the line and column of invalid JSON in Swedish', () => {
    expect(inspectInput('{\n  "resourceType": "Organization",\n  "name": \n}')).toEqual({
      ok: false,
      empty: false,
      message: 'Texten är inte giltig JSON (rad 4, kolumn 1).',
    })
  })
})

describe('compareResources', () => {
  it('reports both inputs when one cannot be read', () => {
    const outcome = compareResources('{', rawFixture(UNIT), SETTINGS)
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) {
      expect(outcome.before.ok).toBe(false)
      expect(outcome.after.ok).toBe(true)
    }
  })

  it('hides meta.lastUpdated and counts what it hid', () => {
    const before = withMeta('2026-10-01T08:00:00+02:00')
    const after = withMeta('2026-10-02T08:00:00+02:00', (r) => {
      r['name'] = 'Ny avdelning'
    })
    const outcome = compareResources(before, after, SETTINGS)
    if (!outcome.ok) throw new Error('Förväntade en jämförelse')
    expect(outcome.comparison.descriptions.map((d) => d.text)).toEqual(['Namn ändrades från ”Akut- stroke och neurologiavdelningen” till ”Ny avdelning”'])
    expect(outcome.comparison.hiddenCount).toBe(1)

    const shown = compareResources(before, after, { ...SETTINGS, ignorePaths: [] })
    if (!shown.ok) throw new Error('Förväntade en jämförelse')
    expect(shown.comparison.counts).toEqual({ added: 0, removed: 0, changed: 2 })
    expect(shown.comparison.hiddenCount).toBe(0)
  })

  it('states the IG version the comparison was made against', () => {
    const outcome = compareResources(rawFixture(UNIT), rawFixture(UNIT), SETTINGS)
    if (!outcome.ok) throw new Error('Förväntade en jämförelse')
    expect(outcome.comparison.diff.ig).toEqual({ packageId: 'se.electronichealth.fhir.hvo.r5', version: '0.5.1', pinned: true })
    expect(outcome.comparison.descriptions).toEqual([])
  })

  it('warns in Swedish when the ids differ', () => {
    const after = withMeta('x', (r) => {
      r['id'] = 'annan'
    })
    const outcome = compareResources(withMeta('x'), after, SETTINGS)
    if (!outcome.ok) throw new Error('Förväntade en jämförelse')
    expect(outcome.comparison.warnings).toEqual([
      'Resurserna har olika id: 11aa1f8f-b5df-4e2d-97b8-15320352ac85 före och annan efter. Kontrollera att det är samma resurs.',
    ])
  })

  it('gives the same result every time', () => {
    const run = () => compareResources(demoText(DEMO_BEFORE), demoText(DEMO_AFTER), SETTINGS)
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()))
  })
})

describe('demo example', () => {
  it('starts from the unchanged IG example', () => {
    const { meta, ...rest } = DEMO_BEFORE
    expect(meta).toEqual({ lastUpdated: '2026-10-01T08:00:00+02:00' })
    expect(rest).toEqual(loadFixture(UNIT))
  })

  it('shows every kind of change, all with Swedish labels', () => {
    const outcome = compareResources(demoText(DEMO_BEFORE), demoText(DEMO_AFTER), SETTINGS)
    if (!outcome.ok) throw new Error('Förväntade en jämförelse')
    const { counts, descriptions, hiddenCount } = outcome.comparison
    expect(counts.added).toBeGreaterThan(0)
    expect(counts.removed).toBeGreaterThan(0)
    expect(counts.changed).toBeGreaterThan(0)
    expect(hiddenCount).toBe(1)
    expect(descriptions.filter((d) => d.source === 'fallback')).toEqual([])
  })
})
