import type { ProfileLabels } from '../../../reporting/types'

const SD = 'http://electronichealth.se/fhir/hvo/StructureDefinition'
const RLK = 'http://metadata.scb.se/classifications/RLK'

export const HVO_LOCATION_LABELS: ProfileLabels = {
  profile: 'HVOLocation',
  url: `${SD}/HVOLocation`,
  resourceType: 'Location',
  resourceLabel: 'Plats',
  elements: {
    'Location.identifier': 'Identifierare',
    'Location.extension': 'Tillägg',
    'Location.status': 'Status',
    'Location.name': 'Namn',
    'Location.description': 'Beskrivning',
    'Location.address': 'Adress',
    'Location.address.line': 'Adressrad',
    'Location.address.city': 'Postort',
    'Location.address.district': 'Kommun',
    'Location.address.postalCode': 'Postnummer',
    'Location.address.type': 'Adresstyp',
    'Location.form': 'Platstyp',
    'Location.position': 'Position',
    'Location.position.longitude': 'Longitud',
    'Location.position.latitude': 'Latitud',
    'Location.partOf': 'Del av plats',
    'Location.partOf.reference': 'Del av plats',
  },
  slices: [
    // Municipality and county share a system; the profile slices on the value, and the codes differ in length.
    {
      element: 'Location.identifier',
      sliceName: 'municipality',
      when: { system: RLK, value: /^\d{4}$/ },
      label: 'Kommunkod',
      valueElement: 'value',
    },
    {
      element: 'Location.identifier',
      sliceName: 'county',
      when: { system: RLK, value: /^\d{2}$/ },
      label: 'Länskod',
      valueElement: 'value',
    },
    {
      element: 'Location.identifier',
      sliceName: 'locationAddress',
      when: { system: 'https://electronichealth.se/identifier/locationAddressLm' },
      label: 'Adress-id (Lantmäteriet)',
      valueElement: 'value',
    },
    {
      element: 'Location.extension',
      sliceName: 'period',
      when: { url: `${SD}/HVOLocationPeriodExtension` },
      label: 'Giltighetsperiod',
      valueElement: 'value[x]',
    },
    {
      element: 'Location.extension',
      sliceName: 'positionSweref',
      when: { url: `${SD}/HVOSweref99PositionExtension` },
      label: 'Position (SWEREF 99)',
      children: { 'extension.valueDecimal': 'koordinat' },
    },
    {
      element: 'Location.address.extension',
      sliceName: 'precinct',
      when: { url: 'http://hl7.org/fhir/StructureDefinition/iso21090-ADXP-precinct' },
      label: 'Kommundel',
      valueElement: 'value[x]',
    },
  ],
}
