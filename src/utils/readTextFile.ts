/** Larger files are almost certainly not a single resource and would make the page sluggish. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024

export type ReadFileResult = { ok: true; text: string } | { ok: false; message: string }

const KILOBYTE = 1024
const MEGABYTE = 1024 * KILOBYTE

const SIZE_FORMAT = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 })

/** "7,2 MB", "512 kB" or "300 byte", the way a Swedish reader expects it. */
export function formatFileSize(bytes: number): string {
  if (bytes >= MEGABYTE) return `${SIZE_FORMAT.format(bytes / MEGABYTE)} MB`
  if (bytes >= KILOBYTE) return `${SIZE_FORMAT.format(bytes / KILOBYTE)} kB`
  return `${SIZE_FORMAT.format(bytes)} byte`
}

/**
 * Says why the browser could not read the file and what the user can do. The
 * reasons are the DOMException names File.text() rejects with; anything else
 * keeps its name so it can still be reported.
 */
function readFailureMessage(name: string, error: unknown): string {
  const reason = error instanceof DOMException || error instanceof Error ? error.name : undefined
  if (reason === 'NotFoundError') {
    return `Filen ${name} hittades inte. Den kan ha flyttats eller tagits bort efter att den valdes. Välj filen igen.`
  }
  if (reason === 'NotReadableError') {
    return `Filen ${name} kunde inte läsas. Den kan vara låst av ett annat program eller sakna läsbehörighet. Stäng programmet eller kontrollera behörigheten och försök igen.`
  }
  if (reason === 'SecurityError') {
    return `Webbläsaren tillät inte att filen ${name} lästes. Försök igen, eller öppna filen och klistra in innehållet i fältet.`
  }
  const detail = reason === undefined ? '' : ` (${reason})`
  return `Filen ${name} kunde inte läsas${detail}. Försök igen, eller öppna filen och klistra in innehållet i fältet.`
}

export async function readTextFile(file: File): Promise<ReadFileResult> {
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      message:
        `Filen ${file.name} är ${formatFileSize(file.size)} och läses inte in, eftersom gränsen är ${formatFileSize(MAX_FILE_BYTES)}. ` +
        'En enskild FHIR-resurs är nästan alltid mindre. Kontrollera att det är rätt fil, eller klistra in den resurs du vill jämföra.',
    }
  }
  // Without this, an empty file looks like nothing was chosen at all.
  if (file.size === 0) return { ok: false, message: `Filen ${file.name} är tom.` }
  try {
    return { ok: true, text: await file.text() }
  } catch (error) {
    return { ok: false, message: readFailureMessage(file.name, error) }
  }
}
