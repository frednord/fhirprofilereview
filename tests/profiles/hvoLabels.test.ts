import { describe, expect, it } from 'vitest'
import { getArray, getString, isJsonObject } from '../../src/core/parser/narrowing'
import { HVO_IG_MANIFEST } from '../../src/core/profiles/hvoManifest'
import { HVO_LABELS } from '../../src/core/profiles/hvo/0.5.1'
import type { JsonObject } from '../../src/types/json'
import { loadFixture } from '../helpers/hvoFixtures'

const STRUCTURE_DEFINITIONS = [
  'structuredefinition-hvoorganization.json',
  'structuredefinition-hvoorganizationalunit.json',
  'structuredefinition-hvobusiness.json',
  'structuredefinition-hvolocation.json',
].map(loadFixture)

const VALUE_SETS = [
  'valueset-hvo-contact-purpose.json',
  'valueset-hvo-organization-type.json',
  'valueset-hvo-organizational-unit-type.json',
  'valueset-hvo-counties-scb.json',
].map(loadFixture)

function differential(url: string): JsonObject[] {
  const sd = STRUCTURE_DEFINITIONS.find((s) => s['url'] === url)
  if (sd === undefined || !isJsonObject(sd['differential'])) throw new Error(`StructureDefinition saknas: ${url}`)
  return getArray(sd['differential'], 'element').filter(isJsonObject)
}

function element(elements: readonly JsonObject[], id: string): JsonObject | undefined {
  return elements.find((e) => e['id'] === id)
}

function pattern(el: JsonObject | undefined): string | undefined {
  if (el === undefined) return undefined
  const key = Object.keys(el).find((k) => k.startsWith('pattern') || k.startsWith('fixed'))
  const value = key === undefined ? undefined : el[key]
  return typeof value === 'string' ? value : undefined
}

function extensionProfiles(el: JsonObject | undefined): string[] {
  if (el === undefined) return []
  return getArray(el, 'type')
    .filter(isJsonObject)
    .flatMap((t) => getArray(t, 'profile'))
    .filter((p): p is string => typeof p === 'string')
}

/** Every label rule paired with its profile, for it.each. */
const SLICES = HVO_LABELS.profiles.flatMap((profile) =>
  profile.slices.map((slice) => ({ name: `${profile.profile} ${slice.element}:${slice.sliceName}`, url: profile.url, slice })),
)

const ELEMENTS = HVO_LABELS.profiles.flatMap((profile) =>
  Object.keys(profile.elements).map((path) => ({ name: `${profile.profile} ${path}`, url: profile.url, path })),
)

describe('HVO label data matches the IG (se.electronichealth.fhir.hvo.r5@0.5.1)', () => {
  it('has labels for exactly the profiles in the IG manifest', () => {
    expect(HVO_LABELS.profiles.map((p) => p.profile).sort()).toEqual(HVO_IG_MANIFEST.profiles.map((p) => p.name).sort())
  })

  it.each(HVO_LABELS.profiles)('$profile names its StructureDefinition and resource type', (profile) => {
    const sd = STRUCTURE_DEFINITIONS.find((s) => s['url'] === profile.url)
    expect(sd?.['name']).toBe(profile.profile)
    expect(sd?.['type']).toBe(profile.resourceType)
  })

  it.each(SLICES)('$name is a slice in the profile, recognised by its pattern', ({ url, slice }) => {
    const elements = differential(url)
    const sliceId = `${slice.element}:${slice.sliceName}`
    expect(element(elements, sliceId), `${sliceId} finns inte i profilen`).toBeDefined()
    for (const [path, expected] of Object.entries(slice.when)) {
      // Patterns (regular expressions) describe discriminators the profile does not fix, such as "telecom exists".
      if (typeof expected !== 'string') continue
      if (path === 'url') expect(extensionProfiles(element(elements, sliceId))).toContain(expected)
      else expect(pattern(element(elements, `${sliceId}.${path}`))).toBe(expected)
    }
  })

  it.each(ELEMENTS)('$name is constrained by the profile', ({ url, path }) => {
    // Labels may name a child (partOf.reference); the profile only has to constrain the top-level element.
    const topLevel = path.split('.').slice(0, 2).join('.')
    expect(differential(url).some((e) => e['path'] === topLevel)).toBe(true)
  })

  it.each(VALUE_SETS.map((vs) => ({ name: getString(vs, 'name'), vs })))('code labels agree with ValueSet $name', ({ vs }) => {
    const compose = vs['compose']
    const includes = isJsonObject(compose) ? getArray(compose, 'include').filter(isJsonObject) : []
    const concepts = includes.flatMap((inc) =>
      getArray(inc, 'concept')
        .filter(isJsonObject)
        .map((c) => ({ key: `${getString(inc, 'system') ?? ''}|${getString(c, 'code') ?? ''}`, display: getString(c, 'display') })),
    )
    expect(concepts.length).toBeGreaterThan(0)
    for (const { key, display } of concepts) expect(HVO_LABELS.codes[key], key).toBe(display)
  })
})
