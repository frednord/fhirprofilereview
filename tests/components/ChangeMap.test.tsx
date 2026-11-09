import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ComparePage } from '../../src/pages/ComparePage'

function openMap(): HTMLElement {
  const { container } = render(<ComparePage />)
  fireEvent.click(screen.getByRole('button', { name: 'Visa exempel' }))
  fireEvent.click(screen.getByRole('button', { name: 'Karta' }))
  return container
}

describe('ChangeMap', () => {
  it('keeps the list as the default view', () => {
    render(<ComparePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Visa exempel' }))
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('region', { name: 'Karta före' })).not.toBeInTheDocument()
  })

  it('shows both versions with a note at each end of a move', () => {
    openMap()
    const before = screen.getByRole('region', { name: 'Karta före' })
    const after = screen.getByRole('region', { name: 'Karta efter' })
    expect(within(before).getByText('Flyttad till Kontakt för fax (Professionell), period')).toBeInTheDocument()
    expect(within(after).getByText('Flyttad hit från Kontakt för telefon (Professionell), period')).toBeInTheDocument()
    expect(within(before).getByText('Borttagen (var 1123)')).toBeInTheDocument()
    expect(within(after).getByText('Ny: fax +46812345678')).toBeInTheDocument()
  })

  it('draws one arrow per change', async () => {
    const container = openMap()
    await waitFor(() => expect(container.querySelectorAll('[data-link-id]')).toHaveLength(6))
  })

  it('follows the kind filter', async () => {
    const container = openMap()
    fireEvent.click(screen.getByRole('checkbox', { name: /Flyttade/ }))
    expect(screen.queryByText('Flyttad till Kontakt för fax (Professionell), period')).not.toBeInTheDocument()
    await waitFor(() => expect(container.querySelectorAll('[data-link-id]')).toHaveLength(5))
  })

  it('opens folded unchanged fields', () => {
    openMap()
    const after = screen.getByRole('region', { name: 'Karta efter' })
    expect(within(after).queryByText('resourceType')).not.toBeInTheDocument()
    fireEvent.click(within(after).getByRole('button', { name: '▸ 6 oförändrade fält' }))
    expect(within(after).getByText('resourceType')).toBeInTheDocument()
  })
})
