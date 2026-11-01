import type { ProfileLabels } from '../../../reporting/types'

export const HVO_BUSINESS_LABELS: ProfileLabels = {
  profile: 'HVOBusiness',
  url: 'http://electronichealth.se/fhir/hvo/StructureDefinition/HVOBusiness',
  resourceType: 'HealthcareService',
  resourceLabel: 'Verksamhet',
  elements: {
    'HealthcareService.providedBy': 'Utförande organisation',
    'HealthcareService.providedBy.reference': 'Utförande organisation',
    'HealthcareService.category': 'Verksamhetstyp',
    'HealthcareService.location': 'Plats',
    'HealthcareService.location.reference': 'Plats',
    'HealthcareService.availability': 'Tillgänglighet',
    'HealthcareService.availability.availableTime': 'Öppettider',
    'HealthcareService.availability.notAvailableTime': 'Stängt',
  },
  // Category slices sit on category.coding, below the list item the diff pairs, so there is nothing to name here.
  slices: [],
}
