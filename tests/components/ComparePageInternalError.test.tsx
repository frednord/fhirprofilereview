import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../../src/components/layout/ErrorBoundary'
import { INTERNAL_ERROR_MESSAGE } from '../../src/core/reporting'
import { ComparePage } from '../../src/pages/ComparePage'
import { rawFixture } from '../helpers/hvoFixtures'

// Stands in for any unforeseen bug in the analysis of a resource.
vi.mock('../../src/core/reporting/describeChanges', () => ({
  describeChanges: () => {
    throw new Error('boom')
  },
}))

const UNIT = 'organization-11aa1f8f-b5df-4e2d-97b8-15320352ac85.json'

describe('ComparePage when the comparison fails', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the error and keeps both inputs instead of resetting the page', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <ErrorBoundary>
        <ComparePage />
      </ErrorBoundary>,
    )
    const before = rawFixture(UNIT).replace(/\r\n/g, '\n')
    const after = before.replace('Akut- stroke', 'Ny')
    fireEvent.change(screen.getByLabelText('Före'), { target: { value: before } })
    fireEvent.change(screen.getByLabelText('Efter'), { target: { value: after } })
    fireEvent.click(screen.getByRole('button', { name: 'Jämför' }))

    const result = screen.getByRole('region', { name: 'Resultat' })
    expect(within(result).getByRole('alert')).toHaveTextContent(INTERNAL_ERROR_MESSAGE)
    expect(screen.queryByText('Något gick fel')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Före')).toHaveValue(before)
    expect(screen.getByLabelText('Efter')).toHaveValue(after)
    expect(log).toHaveBeenCalledWith('boom')
  })
})
