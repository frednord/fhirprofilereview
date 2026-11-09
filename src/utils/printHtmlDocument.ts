const FRAME_ATTRIBUTE = 'data-print-frame'

/**
 * Opens the print dialog for a separate HTML document, where the user can
 * choose "Spara som PDF". A hidden iframe is used instead of a new window, so
 * popup blockers do not stop it and the page itself is printed unchanged.
 */
export function printHtmlDocument(html: string): void {
  // A frame is removed after printing; one left behind by a browser without afterprint goes here.
  for (const old of document.querySelectorAll(`iframe[${FRAME_ATTRIBUTE}]`)) old.remove()

  const frame = document.createElement('iframe')
  frame.setAttribute(FRAME_ATTRIBUTE, '')
  // The document holds text from the user's JSON. It is escaped, but the frame
  // still may not run scripts; same-origin lets the page call print() on it.
  frame.setAttribute('sandbox', 'allow-modals allow-same-origin')
  frame.setAttribute('aria-hidden', 'true')
  frame.tabIndex = -1
  Object.assign(frame.style, { position: 'fixed', width: '0', height: '0', border: '0', visibility: 'hidden' })

  frame.addEventListener('load', () => {
    const view = frame.contentWindow
    if (view === null) return
    view.addEventListener('afterprint', () => frame.remove())
    view.focus()
    view.print()
  })
  frame.srcdoc = html
  document.body.append(frame)
}
