import type { JsonObject } from '../types/json'

/**
 * Example for the "Visa exempel" button, so the page can be shown without
 * hunting for files. The before version is the IG example
 * organization-11aa1f8f-b5df-4e2d-97b8-15320352ac85 from
 * se.electronichealth.fhir.hvo.r5@0.5.1 with meta.lastUpdated added; a test
 * checks that it still matches the fixture.
 */
export const DEMO_BEFORE: JsonObject = {
  "resourceType": "Organization",
  "id": "11aa1f8f-b5df-4e2d-97b8-15320352ac85",
  "meta": {
    "lastUpdated": "2026-10-01T08:00:00+02:00"
  },
  "contained": [
    {
      "resourceType": "HealthcareService",
      "id": "NeurologyAndInternalMedicineBusiness",
      "providedBy": {
        "reference": "#"
      },
      "category": [
        {
          "coding": [
            {
              "code": "1114",
              "system": "urn:oid:1.2.752.129.2.2.1.3"
            }
          ]
        },
        {
          "coding": [
            {
              "code": "1123",
              "system": "urn:oid:1.2.752.129.2.2.1.3"
            }
          ]
        }
      ],
      "location": [
        {
          "reference": "Location/72fffafe-c487-4a70-8749-5621afa3c0d3"
        }
      ]
    }
  ],
  "extension": [
    {
      "url": "http://electronichealth.se/fhir/hvo/StructureDefinition/HVOOrganizationActiveStatusExtension",
      "valueBoolean": true
    },
    {
      "valuePeriod": {
        "start": "1970-01-01"
      },
      "url": "http://hl7.org/fhir/StructureDefinition/organization-period"
    }
  ],
  "identifier": [
    {
      "system": "urn:oid:1.2.752.29.4.19",
      "value": "SE2324679125-23B7"
    },
    {
      "system": "http://electronichealth.se/identifier/organizationalUnit",
      "value": "11aa1f8f-b5df-4e2d-97b8-15320352ac85"
    }
  ],
  "contact": [
    {
      "purpose": {
        "coding": [
          {
            "code": "PROF",
            "system": "http://electronichealth.se/CodeSystem/fhir/hvo-extended-contact-entity-type"
          }
        ]
      },
      "telecom": [
        {
          "system": "phone",
          "value": "+46730748674"
        }
      ],
      "period": {
        "start": "1970-01-01"
      }
    }
  ],
  "name": "Akut- stroke och neurologiavdelningen",
  "partOf": {
    "reference": "Organization/507247c1-a1b2-4844-b781-754493f08670"
  }
}

/**
 * A typical update: new name and phone number, a fax contact added, a business
 * code and the start date removed, and the contact period moved to the fax contact.
 */
function editDemo(resource: JsonObject): JsonObject {
  const after = structuredClone(resource)
  after['meta'] = { lastUpdated: '2026-10-28T14:30:00+01:00' }
  after['name'] = 'Akut-, stroke- och neurologiavdelningen'
  after['contact'] = [
    {
      purpose: { coding: [{ code: 'PROF', system: 'http://electronichealth.se/CodeSystem/fhir/hvo-extended-contact-entity-type' }] },
      telecom: [{ system: 'phone', value: '+46730748600' }],
    },
    {
      purpose: { coding: [{ code: 'PROF', system: 'http://electronichealth.se/CodeSystem/fhir/hvo-extended-contact-entity-type' }] },
      telecom: [{ system: 'fax', value: '+46812345678' }],
      period: { start: '1970-01-01' },
    },
  ]
  after['extension'] = [
    { url: 'http://electronichealth.se/fhir/hvo/StructureDefinition/HVOOrganizationActiveStatusExtension', valueBoolean: true },
  ]
  after['contained'] = [
    {
      resourceType: 'HealthcareService',
      id: 'NeurologyAndInternalMedicineBusiness',
      providedBy: { reference: '#' },
      category: [{ coding: [{ code: '1114', system: 'urn:oid:1.2.752.129.2.2.1.3' }] }],
      location: [{ reference: 'Location/72fffafe-c487-4a70-8749-5621afa3c0d3' }],
    },
  ]
  return after
}

export const DEMO_AFTER: JsonObject = editDemo(DEMO_BEFORE)

export function demoText(resource: JsonObject): string {
  return JSON.stringify(resource, null, 2)
}
