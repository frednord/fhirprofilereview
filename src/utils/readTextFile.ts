/** Larger files are almost certainly not a single resource and would make the page sluggish. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024

export type ReadFileResult = { ok: true; text: string } | { ok: false; message: string }

export async function readTextFile(file: File): Promise<ReadFileResult> {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: `Filen ${file.name} är större än 5 MB och läses inte in.` }
  }
  try {
    return { ok: true, text: await file.text() }
  } catch {
    return { ok: false, message: `Filen ${file.name} kunde inte läsas.` }
  }
}
