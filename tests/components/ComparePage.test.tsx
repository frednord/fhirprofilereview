import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ComparePage } from '../../src/pages/ComparePage'
import { loadFixture, rawFixture } from '../helpers/hvoFixtures'

const UNIT = 'organization-11aa1f8f-b5df-4e2d-97b8-15320352ac85.json'

function renamed(name: string): string {
  return JSON.stringify({ ...loadFixture(UNIT), name })
}

function result(): HTMLElement {
  return screen.getByRole('region', { name: 'Resultat' })
}

function paste(label: 'Före' | 'Efter', value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('ComparePage', () => {
  it('shows the IG and its profiles', () => {
    render(<ComparePage />)
    expect(screen.getByRole('heading', { name: 'FHIR Profile Review Assistant' })).toBeInTheDocument()
    expect(screen.getByText(/HVOOrganization, HVOOrganizationalUnit, HVOBusiness, HVOLocation/)).toBeInTheDocument()
    expect(screen.getByText(/se\.electronichealth\.fhir\.hvo\.r5@0\.5\.1/)).toBeInTheDocument()
  })

  it('compares two pasted resources and describes the change in Swedish', () => {
    render(<ComparePage />)
    const compare = screen.getByRole('button', { name: 'Jämför' })
    expect(compare).toBeDisabled()

    paste('Före', rawFixture(UNIT))
    paste('Efter', renamed('Ny avdelning'))
    fireEvent.click(compare)

    expect(within(result()).getByRole('heading', { name: '0 tillagda, 0 borttagna, 1 ändrad' })).toBeInTheDocument()
    expect(within(result()).getByText('Namn ändrades från ”Akut- stroke och neurologiavdelningen” till ”Ny avdelning”')).toBeInTheDocument()
    expect(within(result()).getByText('name')).toBeInTheDocument()
  })

  it('says when the resources are equal', () => {
    render(<ComparePage />)
    paste('Före', rawFixture(UNIT))
    paste('Efter', rawFixture(UNIT))
    fireEvent.click(screen.getByRole('button', { name: 'Jämför' }))
    expect(within(result()).getByRole('heading', { name: 'Inga skillnader' })).toBeInTheDocument()
    expect(within(result()).getByText(/Resurserna är lika/)).toBeInTheDocument()
  })

  it('shows a Swedish error for invalid JSON and keeps Jämför disabled', () => {
    render(<ComparePage />)
    paste('Före', '{"resourceType": ')
    paste('Efter', rawFixture(UNIT))
    expect(screen.getByRole('alert')).toHaveTextContent('Texten är inte giltig JSON (rad 1, kolumn 18).')
    expect(screen.getByRole('button', { name: 'Jämför' })).toBeDisabled()
  })

  it('reads an uploaded file', async () => {
    render(<ComparePage />)
    const file = new File([rawFixture(UNIT)], 'enhet.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('Ladda upp fil: Före'), { target: { files: [file] } })
    // A textarea normalises line breaks, and the IG files use CRLF.
    await waitFor(() => expect(screen.getByLabelText('Före')).toHaveValue(rawFixture(UNIT).replace(/\r\n/g, '\n')))
    expect(screen.getByText('Organization 11aa1f8f-b5df-4e2d-97b8-15320352ac85')).toBeInTheDocument()
  })

  it('swaps before and after', () => {
    render(<ComparePage />)
    paste('Före', rawFixture(UNIT))
    paste('Efter', renamed('Ny avdelning'))
    fireEvent.click(screen.getByRole('button', { name: 'Byt plats' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jämför' }))
    expect(within(result()).getByText('Namn ändrades från ”Ny avdelning” till ”Akut- stroke och neurologiavdelningen”')).toBeInTheDocument()
  })

  it('loads the example, hides meta.lastUpdated and can show it again', () => {
    render(<ComparePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Visa exempel' }))
    expect(within(result()).getByRole('heading', { name: '1 tillagd, 2 borttagna, 2 ändrade' })).toBeInTheDocument()
    expect(within(result()).getByText(/1 ändring av meta\.lastUpdated är dold/)).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Dölj meta.lastUpdated'))
    expect(within(result()).getByRole('heading', { name: '1 tillagd, 2 borttagna, 3 ändrade' })).toBeInTheDocument()
  })

  it('filters the summary by kind with checkboxes, all checked from the start', () => {
    render(<ComparePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Visa exempel' }))
    const filter = within(result()).getByRole('group', { name: 'Visa i sammanfattningen:' })
    for (const name of [/Tillagda/, /Borttagna/, /Ändrade/]) {
      expect(within(filter).getByRole('checkbox', { name })).toBeChecked()
    }
    expect(within(result()).getAllByRole('listitem')).toHaveLength(5)

    fireEvent.click(within(filter).getByRole('checkbox', { name: /Ändrade/ }))
    expect(within(result()).getByRole('heading', { name: '1 tillagd, 2 borttagna' })).toBeInTheDocument()
    expect(within(result()).getByText(/Visar 3 av 5 ändringar\./)).toBeInTheDocument()
    expect(within(result()).getAllByRole('listitem')).toHaveLength(3)
    expect(within(result()).queryByText(/^Namn ändrades/)).not.toBeInTheDocument()

    fireEvent.click(within(filter).getByRole('checkbox', { name: /Tillagda/ }))
    fireEvent.click(within(filter).getByRole('checkbox', { name: /Borttagna/ }))
    expect(within(result()).getByRole('heading', { name: 'Inga ändringstyper valda' })).toBeInTheDocument()
    expect(within(result()).queryAllByRole('listitem')).toHaveLength(0)
  })

  it('keeps the chosen kinds when comparing again', () => {
    render(<ComparePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Visa exempel' }))
    fireEvent.click(within(result()).getByRole('checkbox', { name: /Ändrade/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Jämför' }))
    expect(within(result()).getByRole('checkbox', { name: /Ändrade/ })).not.toBeChecked()
    expect(within(result()).getAllByRole('listitem')).toHaveLength(3)
  })

  it('notes when an input changed after the comparison', () => {
    render(<ComparePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Visa exempel' }))
    paste('Efter', rawFixture(UNIT))
    expect(within(result()).getByText(/har ändrats sedan jämförelsen/)).toBeInTheDocument()
  })
})
