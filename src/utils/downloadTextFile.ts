/** Lets the browser save text as a file, without sending it anywhere. */
export function downloadTextFile(fileName: string, text: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mimeType};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  // Revoked on the next task, since some browsers start the download only after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
