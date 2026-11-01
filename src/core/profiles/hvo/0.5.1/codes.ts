import { CONTACT_POINT_SYSTEM } from '../../../reporting/formatValue'

const CONTACT_PURPOSE_HVO = 'http://electronichealth.se/CodeSystem/fhir/hvo-extended-contact-entity-type'
const CONTACT_PURPOSE_HL7 = 'http://terminology.hl7.org/CodeSystem/contactentity-type'
const SNOMED = 'http://snomed.info/sct'
const RLK = 'http://metadata.scb.se/classifications/RLK'

/**
 * Swedish names of codes, keyed "system|code". Displays are copied from the
 * IG's ValueSets, and tests/profiles/hvoLabels.test.ts checks them against the
 * ValueSet fixtures. ContactPoint.system has no Swedish display in the IG, so
 * those names are written here.
 */
export const HVO_CODE_LABELS: Readonly<Record<string, string>> = {
  // ValueSet hvo-contact-purpose
  [`${CONTACT_PURPOSE_HVO}|CATADMIN`]: 'Katalogadministratör',
  [`${CONTACT_PURPOSE_HVO}|PROF`]: 'Professionell',
  [`${CONTACT_PURPOSE_HL7}|ADMIN`]: 'Administrativt',
  [`${CONTACT_PURPOSE_HL7}|PATINF`]: 'Patient',

  // ValueSets hvo-organization-type and hvo-organizational-unit-type
  [`${SNOMED}|143591000052106`]: 'vårdgivare',
  [`${SNOMED}|654081000052102`]: 'utförare av socialtjänst',
  [`${SNOMED}|43741000`]: 'vårdenhet',

  // ValueSet hvo-counties-scb
  [`${RLK}|01`]: 'Stockholms län',
  [`${RLK}|03`]: 'Uppsala län',
  [`${RLK}|04`]: 'Södermanlands län',
  [`${RLK}|05`]: 'Östergötlands län',
  [`${RLK}|06`]: 'Jönköpings län',
  [`${RLK}|07`]: 'Kronobergs län',
  [`${RLK}|08`]: 'Kalmar län',
  [`${RLK}|09`]: 'Gotlands län',
  [`${RLK}|10`]: 'Blekinge län',
  [`${RLK}|12`]: 'Skåne län',
  [`${RLK}|13`]: 'Hallands län',
  [`${RLK}|14`]: 'Västra Götalands län',
  [`${RLK}|17`]: 'Värmlands län',
  [`${RLK}|18`]: 'Örebro län',
  [`${RLK}|19`]: 'Västmanlands län',
  [`${RLK}|20`]: 'Dalarnas län',
  [`${RLK}|21`]: 'Gävleborgs län',
  [`${RLK}|22`]: 'Västernorrlands län',
  [`${RLK}|23`]: 'Jämtlands län',
  [`${RLK}|24`]: 'Västerbottens län',
  [`${RLK}|25`]: 'Norrbottens län',

  // FHIR R5 contact-point-system, not translated in the IG
  [`${CONTACT_POINT_SYSTEM}|phone`]: 'telefon',
  [`${CONTACT_POINT_SYSTEM}|fax`]: 'fax',
  [`${CONTACT_POINT_SYSTEM}|email`]: 'e-post',
  [`${CONTACT_POINT_SYSTEM}|pager`]: 'personsökare',
  [`${CONTACT_POINT_SYSTEM}|url`]: 'webbadress',
  [`${CONTACT_POINT_SYSTEM}|sms`]: 'sms',
  [`${CONTACT_POINT_SYSTEM}|other`]: 'annat',
}
