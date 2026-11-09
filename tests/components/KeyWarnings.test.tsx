import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ComparePage } from '../../src/pages/ComparePage'

const BEFORE = JSON.stringify({ resourceType: 'Organization', id: 'a', extension: [{ url: 'http://example.org/p', valuePeriod: { start: '2024-01-01' } }] })
const AFTER = JSON.stringify({ resourceType: 'Organization', id: 'a', extension: [{ url: 'http://example.org/p', ValuePeriod: { start: '2024-01-01' } }] })

function compare(): void {
  render(<ComparePage />)
  fireEvent.change(screen.getByLabelText('Före'), { target: { value: BEFORE } })
  fireEvent.change(screen.getByLabelText('Efter'), { target: { value: AFTER } })
  fireEvent.click(screen.getByRole('button', { name: 'Jämför' }))
}

describe('Keys spelt differently', () => {
  it('are shown as a warning in the list, not as removed and added', () => {
    compare()
    const warnings = screen.getByRole('region', { name: 'Nycklar som stavas olika' })
    expect(within(warnings).getByText('⚠ 1 nyckel stavas olika i Före och Efter')).toBeInTheDocument()
    expect(within(warnings).getByText(/Nyckeln skrivs "valuePeriod" i Före men "ValuePeriod" i Efter/)).toBeInTheDocument()
    expect(screen.getByText(/Värdena är lika/)).toBeInTheDocument()
    expect(screen.queryByText('Borttagen')).not.toBeInTheDocument()
  })

  it('are marked on both sides of the map', () => {
    compare()
    fireEvent.click(screen.getByRole('button', { name: 'Karta' }))
    const before = screen.getByRole('region', { name: 'Karta före' })
    const after = screen.getByRole('region', { name: 'Karta efter' })
    expect(within(before).getByText('valuePeriod')).toBeInTheDocument()
    expect(within(after).getByText('ValuePeriod')).toBeInTheDocument()
    expect(within(before).getByText('⚠ Stavas "ValuePeriod" i Efter')).toBeInTheDocument()
    expect(within(after).getByText('⚠ Stavas "valuePeriod" i Före')).toBeInTheDocument()
    expect(within(after).getByText('⚠ Stavning')).toBeInTheDocument()
  })
})
