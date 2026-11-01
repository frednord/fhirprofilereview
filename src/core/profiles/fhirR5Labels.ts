/**
 * Swedish names for children of FHIR R5 data types, shared by every profile.
 * Keys are paths relative to the labelled element; choice types are written as
 * value[x]. Profile label data can override them per slice.
 */
export const FHIR_R5_CHILD_LABELS: Readonly<Record<string, string>> = {
  value: 'värde',
  'value[x]': 'värde',
  system: 'system',
  use: 'användning',
  type: 'typ',
  start: 'startdatum',
  end: 'slutdatum',
  period: 'period',
  'period.start': 'giltig från',
  'period.end': 'giltig till',
  reference: 'referens',
  display: 'visningsnamn',
  text: 'text',
  // Address
  line: 'adressrad',
  city: 'postort',
  district: 'kommun',
  postalCode: 'postnummer',
  country: 'land',
  'address.line': 'adressrad',
  'address.city': 'postort',
  'address.postalCode': 'postnummer',
  'address.country': 'land',
  // ExtendedContactDetail
  'name.text': 'namn',
  'telecom.value': 'kontaktuppgift',
  'telecom.system': 'kontaktsätt',
  purpose: 'syfte',
}
