import type { LabelSet } from '../../../reporting/types'
import { FHIR_R5_CHILD_LABELS } from '../../fhirR5Labels'
import { HVO_BUSINESS_LABELS } from './business'
import { HVO_CODE_LABELS } from './codes'
import { HVO_LOCATION_LABELS } from './location'
import { HVO_ORGANIZATIONAL_UNIT_LABELS, HVO_ORGANIZATION_LABELS } from './organization'

/**
 * Swedish labels for se.electronichealth.fhir.hvo.r5@0.5.1. Kept per package
 * version, like the fixtures, so a new IG version gets its own folder and the
 * label tests show what no longer fits.
 *
 * HVOOrganization comes before HVOOrganizationalUnit: an Organization without
 * meta.profile is described with both, and the first label found wins.
 */
export const HVO_LABELS: LabelSet = {
  profiles: [HVO_ORGANIZATION_LABELS, HVO_ORGANIZATIONAL_UNIT_LABELS, HVO_BUSINESS_LABELS, HVO_LOCATION_LABELS],
  codes: HVO_CODE_LABELS,
  childLabels: FHIR_R5_CHILD_LABELS,
}
