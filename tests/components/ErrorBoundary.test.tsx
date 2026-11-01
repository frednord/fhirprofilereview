import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../../src/components/layout/ErrorBoundary'

let shouldThrow = true

function Fragile() {
  const [text] = useState('fält')
  if (shouldThrow) throw new Error('boom')
  return <p>{text}</p>
}

describe('ErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows a message instead of a blank page and starts over on request', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <ErrorBoundary>
        <Fragile />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Något gick fel')

    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Börja om med tomma fält' }))
    expect(screen.getByText('fält')).toBeInTheDocument()
  })
})
