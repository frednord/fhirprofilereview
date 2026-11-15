import { describe, expect, it } from 'vitest'
import { formatFileSize, MAX_FILE_BYTES, readTextFile } from '../../src/utils/readTextFile'

function fileOfSize(size: number): File {
  const file = new File(['{}'], 'stor.json')
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function failingFile(error: unknown): File {
  const file = new File(['{}'], 'resurs.json')
  Object.defineProperty(file, 'text', { value: () => Promise.reject(error) })
  return file
}

describe('formatFileSize', () => {
  it.each([
    [300, '300 byte'],
    [512 * 1024, '512 kB'],
    [5 * 1024 * 1024, '5 MB'],
    [7.25 * 1024 * 1024, '7,3 MB'],
  ])('shows %i bytes as %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected)
  })
})

describe('readTextFile', () => {
  it('reads a file within the limit', async () => {
    expect(await readTextFile(new File(['{"a":1}'], 'resurs.json'))).toEqual({ ok: true, text: '{"a":1}' })
  })

  it('states the size of a file over the limit, and the limit itself', async () => {
    const result = await readTextFile(fileOfSize(7.2 * 1024 * 1024))
    expect(result).toEqual({
      ok: false,
      message:
        'Filen stor.json är 7,2 MB och läses inte in, eftersom gränsen är 5 MB. ' +
        'En enskild FHIR-resurs är nästan alltid mindre. Kontrollera att det är rätt fil, eller klistra in den resurs du vill jämföra.',
    })
  })

  it('accepts a file of exactly the limit', async () => {
    expect((await readTextFile(fileOfSize(MAX_FILE_BYTES))).ok).toBe(true)
  })

  it('says that an empty file is empty', async () => {
    expect(await readTextFile(new File([], 'tom.json'))).toEqual({ ok: false, message: 'Filen tom.json är tom.' })
  })

  it.each([
    ['NotFoundError', 'Filen resurs.json hittades inte. Den kan ha flyttats eller tagits bort efter att den valdes. Välj filen igen.'],
    [
      'NotReadableError',
      'Filen resurs.json kunde inte läsas. Den kan vara låst av ett annat program eller sakna läsbehörighet. Stäng programmet eller kontrollera behörigheten och försök igen.',
    ],
    ['SecurityError', 'Webbläsaren tillät inte att filen resurs.json lästes. Försök igen, eller öppna filen och klistra in innehållet i fältet.'],
    ['AbortError', 'Filen resurs.json kunde inte läsas (AbortError). Försök igen, eller öppna filen och klistra in innehållet i fältet.'],
  ])('explains a %s and what to do', async (name, message) => {
    expect(await readTextFile(failingFile(new DOMException('x', name)))).toEqual({ ok: false, message })
  })

  it('still gives a message when the error is not an Error', async () => {
    expect(await readTextFile(failingFile('trasig'))).toEqual({
      ok: false,
      message: 'Filen resurs.json kunde inte läsas. Försök igen, eller öppna filen och klistra in innehållet i fältet.',
    })
  })
})
