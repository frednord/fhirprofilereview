import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ComparePage } from '../../src/pages/ComparePage'

function exportGroup(): HTMLElement {
  return screen.getByRole('group', { name: 'Exportera granskningsrapport' })
}

function loadExample(): void {
  render(<ComparePage />)
  fireEvent.click(screen.getByRole('button', { name: 'Visa exempel' }))
}

/** Captures the Markdown handed to the browser instead of starting a download. */
function captureDownload(): { text: () => Promise<string>; fileName: () => string } {
  let blob: Blob | undefined
  let fileName = ''
  URL.createObjectURL = vi.fn((value: Blob) => {
    blob = value
    return 'blob:report'
  })
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    fileName = this.download
  })
  return {
    text: async () => {
      if (blob === undefined) throw new Error('Ingen fil skapades')
      return blob.text()
    },
    fileName: () => fileName,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  document.querySelectorAll('iframe').forEach((frame) => frame.remove())
})

describe('Report export', () => {
  it('downloads the report as Markdown, named after the resource', async () => {
    const download = captureDownload()
    loadExample()
    fireEvent.click(within(exportGroup()).getByRole('button', { name: 'Markdown' }))

    expect(download.fileName()).toMatch(/^granskningsrapport-Organization-11aa1f8f-b5df-4e2d-97b8-15320352ac85-\d{4}-\d{2}-\d{2}\.md$/)
    const markdown = await download.text()
    expect(markdown).toContain('# Granskningsrapport')
    expect(markdown).toContain('| Urval | Alla ändringstyper |')
    expect(markdown).toContain('| Flyttad |')
  })

  it('follows the kind filter on the page', async () => {
    const download = captureDownload()
    loadExample()
    fireEvent.click(screen.getByRole('checkbox', { name: /Flyttade/ }))
    fireEvent.click(within(exportGroup()).getByRole('button', { name: 'Markdown' }))

    const markdown = await download.text()
    expect(markdown).toContain('| Urval | Tillagda, Borttagna, Ändrade |')
    expect(markdown).not.toContain('| Flyttad |')
    expect(markdown).toMatch(/Visar \d+ av \d+ ändringar\./)
  })

  it('prints the report from a sandboxed frame for saving as PDF', () => {
    loadExample()
    fireEvent.click(within(exportGroup()).getByRole('button', { name: 'PDF' }))

    const frame = document.querySelector('iframe')
    expect(frame).not.toBeNull()
    expect(frame?.getAttribute('sandbox')).toBe('allow-modals allow-same-origin')
    expect(frame?.srcdoc).toContain('<h1>Granskningsrapport</h1>')
    expect(frame?.srcdoc).toMatch(/<title>granskningsrapport-Organization-/)
  })

  it('replaces an earlier print frame instead of piling them up', () => {
    loadExample()
    const pdf = within(exportGroup()).getByRole('button', { name: 'PDF' })
    fireEvent.click(pdf)
    fireEvent.click(pdf)
    expect(document.querySelectorAll('iframe')).toHaveLength(1)
  })
})
