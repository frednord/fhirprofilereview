import { describe, expect, it, vi } from 'vitest'
import { inspectInput } from '../../src/core/reporting'

// The error locator is the only part of inspectInput that can throw on its own,
// since it rethrows anything it does not recognise.
vi.mock('../../src/core/parser/jsonErrorLocation', () => ({
  locateJsonError: () => {
    throw new Error('boom')
  },
}))

describe('inspectInput when reading fails unexpectedly', () => {
  it('returns a status instead of throwing, so the page keeps the text', () => {
    expect(inspectInput('{')).toEqual({
      ok: false,
      empty: false,
      message: 'Texten kunde inte läsas på grund av ett internt fel. Den finns kvar i fältet.',
    })
  })
})
