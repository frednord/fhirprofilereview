import { describe, expect, it } from 'vitest'
import { describeIgVersion, isPinnedVersion, type IgManifest } from '../../src/core/profiles/igManifest'

const manifest: IgManifest = {
  title: 't',
  publisher: 'p',
  packageId: 'se.example.ig',
  version: '1.2.0',
  fhirVersion: '5.0.0',
  sourceUrl: 'https://example.org',
  profiles: [],
}

describe('IG version pinning', () => {
  it.each(['1.0.0', '0.2.13', '1.0.0-ballot', '2.1.0-rc.1'])('accepts %s as pinned', (version) => {
    expect(isPinnedVersion(version)).toBe(true)
  })

  it.each(['current', 'latest', 'dev', '1.0', '1.x', '', 'unconfirmed'])('rejects %j as not pinned', (version) => {
    expect(isPinnedVersion(version)).toBe(false)
  })

  it('labels unpinned versions so reports never look reproducible when they are not', () => {
    expect(describeIgVersion(manifest)).toBe('se.example.ig@1.2.0')
    expect(describeIgVersion({ ...manifest, version: 'current' })).toBe('se.example.ig@current (ej låst version)')
  })
})
