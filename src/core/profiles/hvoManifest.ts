import type { IgManifest } from './igManifest'

/**
 * The IG the HVO profiles and test fixtures are taken from.
 *
 * The guide published as "current" on Simplifier (OrganizationContractOffering
 * 0.5.0) is built on package version 0.5.1, which is the version pinned here.
 * Profile names follow the StructureDefinition names in the package.
 */
export const HVO_IG_MANIFEST: IgManifest = {
  title: 'Swedish Provider Directory (HVO)',
  publisher: 'E-hälsomyndigheten',
  packageId: 'se.electronichealth.fhir.hvo.r5',
  version: '0.5.1',
  fhirVersion: '5.0.0',
  sourceUrl: 'https://simplifier.net/packages/se.electronichealth.fhir.hvo.r5/0.5.1',
  profiles: [
    { name: 'HVOOrganization' },
    { name: 'HVOOrganizationalUnit' },
    { name: 'HVOBusiness' },
    { name: 'HVOLocation' },
  ],
}
