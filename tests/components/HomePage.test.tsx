import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomePage } from '../../src/pages/HomePage'

describe('HomePage', () => {
  it('shows the IG and its profiles', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { name: 'FHIR Profile Review Assistant' })).toBeInTheDocument()
    expect(screen.getByText(/HVOOrganization, HVOOrganizationalUnit, HVOBusiness, HVOLocation/)).toBeInTheDocument()
    expect(screen.getByText(/ej låst version/)).toBeInTheDocument()
  })
})
