import type { ProfileLabels, SliceLabel } from '../../../reporting/types'
import { CONTACT_POINT_SYSTEM } from '../../../reporting/formatValue'

const SD = 'http://electronichealth.se/fhir/hvo/StructureDefinition'

const ORGANIZATION_ELEMENTS: Readonly<Record<string, string>> = {
  'Organization.identifier': 'Identifierare',
  'Organization.type': 'Organisationstyp',
  'Organization.name': 'Namn',
  'Organization.alias': 'Alternativt namn',
  'Organization.contact': 'Kontakt',
  'Organization.partOf': 'Överordnad organisation',
  'Organization.partOf.reference': 'Överordnad organisation',
  'Organization.qualification': 'Kvalifikation',
  'Organization.extension': 'Tillägg',
}

const HSA_ID: SliceLabel = {
  element: 'Organization.identifier',
  sliceName: 'hsaid',
  when: { system: 'urn:oid:1.2.752.29.4.19' },
  label: 'HSA-id',
  valueElement: 'value',
}

const ACTIVE: SliceLabel = {
  element: 'Organization.extension',
  sliceName: 'organizationActive',
  when: { url: `${SD}/HVOOrganizationActiveStatusExtension` },
  label: 'Aktiv i Företagsregistret',
  valueElement: 'value[x]',
}

const PERIOD: SliceLabel = {
  element: 'Organization.extension',
  sliceName: 'period',
  when: { url: 'http://hl7.org/fhir/StructureDefinition/organization-period' },
  label: 'Verksamhetsperiod',
  valueElement: 'value[x]',
}

// The profile tells the two contact slices apart by whether telecom exists.
const TELECOM_CONTACT: SliceLabel = {
  element: 'Organization.contact',
  sliceName: 'telecomContact',
  when: { 'telecom.0.system': /./ },
  label: `Kontakt för {telecom.0.system|${CONTACT_POINT_SYSTEM}} ({purpose.coding.0})`,
  children: { 'telecom.value': 'kontaktuppgift', 'name.text': 'namn' },
}

const ADDRESS_CONTACT: SliceLabel = {
  element: 'Organization.contact',
  sliceName: 'addressContact',
  when: { 'purpose.coding.0.code': /./ },
  label: 'Adresskontakt ({purpose.coding.0})',
}

const CONTACTS = [TELECOM_CONTACT, ADDRESS_CONTACT]

export const HVO_ORGANIZATION_LABELS: ProfileLabels = {
  profile: 'HVOOrganization',
  url: `${SD}/HVOOrganization`,
  resourceType: 'Organization',
  resourceLabel: 'Organisation',
  elements: ORGANIZATION_ELEMENTS,
  slices: [
    HSA_ID,
    {
      element: 'Organization.identifier',
      sliceName: 'organizationIdentifier',
      when: { system: 'urn:oid:2.5.4.97' },
      label: 'Organisationsnummer',
      valueElement: 'value',
    },
    {
      element: 'Organization.identifier',
      sliceName: 'personalIdentityNumber',
      when: { system: 'http://electronichealth.se/identifier/personnummer' },
      label: 'Personnummer',
      valueElement: 'value',
    },
    ACTIVE,
    {
      element: 'Organization.extension',
      sliceName: 'legalForm',
      when: { url: `${SD}/HVOOrganizationLegalFormExtension` },
      label: 'Juridisk form',
      valueElement: 'value[x]',
    },
    {
      element: 'Organization.extension',
      sliceName: 'ownershipType',
      when: { url: `${SD}/HVOOrganizationOwnershipExtension` },
      label: 'Ägarform',
      valueElement: 'value[x]',
    },
    PERIOD,
    {
      element: 'Organization.extension',
      sliceName: 'additionalRelationship',
      when: { url: `${SD}/HVOOrganizationAdditionalRelationshipExtension` },
      label: 'Ytterligare relation',
    },
    ...CONTACTS,
  ],
}

export const HVO_ORGANIZATIONAL_UNIT_LABELS: ProfileLabels = {
  profile: 'HVOOrganizationalUnit',
  url: `${SD}/HVOOrganizationalUnit`,
  resourceType: 'Organization',
  resourceLabel: 'Organisationsenhet',
  elements: { ...ORGANIZATION_ELEMENTS, 'Organization.type': 'Enhetstyp', 'Organization.contained': 'Inbäddad resurs' },
  slices: [
    HSA_ID,
    {
      element: 'Organization.identifier',
      sliceName: 'organizationalUnitId',
      when: { system: 'http://electronichealth.se/identifier/organizationalUnit' },
      label: 'Enhets-id',
      valueElement: 'value',
    },
    ACTIVE,
    PERIOD,
    ...CONTACTS,
  ],
}
