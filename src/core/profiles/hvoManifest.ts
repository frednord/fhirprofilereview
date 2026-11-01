import type { IgManifest } from './igManifest'

/**
 * The IG the HVO profiles are taken from.
 *
 * packageId and version are not confirmed yet: the Simplifier package registry
 * could not be reached when this was set up. Until they are filled in from the
 * package, describeIgVersion marks the version as not pinned in the UI.
 */
export const HVO_IG_MANIFEST: IgManifest = {
  title: 'Swedish Provider Directory (HVO)',
  publisher: 'E-hälsomyndigheten',
  packageId: 'unconfirmed',
  version: 'unconfirmed',
  fhirVersion: '5.0.0',
  sourceUrl: 'https://simplifier.net/guide/organizationcontractoffering',
  profiles: [
    { name: 'HVOOrganization' },
    { name: 'HVOOrganizationalUnit' },
    { name: 'HVOBusiness' },
    { name: 'HVOLocation' },
  ],
}
