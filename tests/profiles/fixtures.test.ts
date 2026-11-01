import { describe, expect, it } from 'vitest'
import { HVO_IG_MANIFEST } from '../../src/core/profiles/hvoManifest'
import { isPinnedVersion } from '../../src/core/profiles/igManifest'
import manifest from '../fixtures/se.electronichealth.fhir.hvo.r5@0.5.1/fixtures.manifest.json'
import { HVO_FIXTURE_DIR, loadFixture, rawFixture } from '../helpers/hvoFixtures'

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

describe('HVO fixtures', () => {
  it('come from a pinned package version that matches the app manifest and folder name', () => {
    expect(isPinnedVersion(manifest.version)).toBe(true)
    expect(manifest.packageId).toBe(HVO_IG_MANIFEST.packageId)
    expect(manifest.version).toBe(HVO_IG_MANIFEST.version)
    expect(HVO_FIXTURE_DIR).toBe(`${manifest.packageId}@${manifest.version}`)
  })

  it.each(manifest.files)('$file is unchanged from the package', async ({ file, sha256: expected }) => {
    expect(await sha256(rawFixture(file))).toBe(expected)
  })

  it.each(manifest.files)('$file parses as a FHIR resource', ({ file }) => {
    expect(loadFixture(file).resourceType).toMatch(/^(Bundle|Organization|HealthcareService|Location)$/)
  })
})
