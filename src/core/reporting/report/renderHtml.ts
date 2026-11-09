import type { ChangeKind } from '../../diff/types'
import { formatResourceRef } from './buildReport'
import type { ReportEntry, ReviewReport } from './types'

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Every value comes from the user's JSON, so all text goes through this. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}

/** Same colours as the badges on the page, written out since the print document has no Tailwind. */
const KIND_COLOURS: Readonly<Record<ChangeKind, string>> = {
  added: 'background:#dcfce7;color:#166534;border-color:#bbf7d0',
  removed: 'background:#fee2e2;color:#991b1b;border-color:#fecaca',
  changed: 'background:#fef3c7;color:#78350f;border-color:#fde68a',
  moved: 'background:#e0f2fe;color:#0c4a6e;border-color:#bae6fd',
}

const STYLE = `
  @page { margin: 18mm 15mm; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a; font-size: 11pt; line-height: 1.4; margin: 0; }
  h1 { font-size: 18pt; margin: 0 0 12pt; }
  h2 { font-size: 13pt; margin: 18pt 0 6pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #cbd5e1; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; }
  .facts { width: auto; }
  .facts th { font-weight: 600; }
  tr { break-inside: avoid; }
  code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 9pt; word-break: break-all; color: #475569; }
  .badge { display: inline-block; border: 1px solid; border-radius: 3pt; padding: 0 4pt; font-size: 9pt; font-weight: 600; white-space: nowrap; }
  .missing { color: #475569; font-size: 9pt; }
  .warning { color: #9a3412; }
  footer { margin-top: 18pt; color: #64748b; font-size: 9pt; }
`

function factsTable(report: ReviewReport): string {
  const facts: [string, string][] = [
    ['Före', formatResourceRef(report.before)],
    ['Efter', formatResourceRef(report.after)],
  ]
  if (report.ig !== undefined) facts.push(['Implementationsguide', report.ig])
  if (report.profiles.length > 0) facts.push(['Profiler', report.profiles.join(', ')])
  facts.push(['Urval', report.selection], ['Skapad', report.createdAt])
  const rows = facts.map(([name, value]) => `<tr><th scope="row">${escapeHtml(name)}</th><td>${escapeHtml(value)}</td></tr>`)
  return `<table class="facts">${rows.join('')}</table>`
}

function summary(report: ReviewReport): string {
  const notes = [report.equalNote, report.selectionNote, report.hiddenNote].filter((note) => note !== undefined)
  const noteHtml = notes.length === 0 ? '' : `<p>${escapeHtml(notes.join(' '))}</p>`
  return `<h2>Sammanfattning</h2><p><strong>${escapeHtml(report.summary)}</strong></p>${noteHtml}`
}

function list(heading: string, items: readonly string[]): string {
  if (items.length === 0) return ''
  return `<h2>${escapeHtml(heading)}</h2><ul>${items.map((item) => `<li class="warning">${item}</li>`).join('')}</ul>`
}

function entryRow(entry: ReportEntry): string {
  const missing = entry.missingLabel ? ' <span class="missing">(saknar svensk etikett)</span>' : ''
  return (
    `<tr><td>${entry.number}</td>` +
    `<td><span class="badge" style="${KIND_COLOURS[entry.kind]}">${escapeHtml(entry.kindLabel)}</span></td>` +
    `<td>${escapeHtml(entry.text)}${missing}</td>` +
    `<td><code>${escapeHtml(entry.path)}</code></td></tr>`
  )
}

function changes(report: ReviewReport): string {
  if (report.entries.length === 0) return ''
  const head = '<tr><th>Nr</th><th>Typ</th><th>Ändring</th><th>Sökväg</th></tr>'
  return `<h2>Ändringar</h2><table class="changes"><thead>${head}</thead><tbody>${report.entries.map(entryRow).join('')}</tbody></table>`
}

/**
 * The report as a standalone HTML document with its own print styles. The
 * page prints it, and the browser's "Spara som PDF" turns it into a PDF, so no
 * PDF library is needed.
 */
export function renderReportHtml(report: ReviewReport, documentTitle: string = report.title): string {
  const warnings = report.warnings.map(escapeHtml)
  const keyWarnings = report.keyWarnings.map((w) => `${escapeHtml(w.text)} <code>${escapeHtml(w.path)}</code>`)
  return [
    '<!doctype html>',
    '<html lang="sv"><head><meta charset="utf-8">',
    `<title>${escapeHtml(documentTitle)}</title>`,
    `<style>${STYLE}</style>`,
    '</head><body>',
    `<h1>${escapeHtml(report.title)}</h1>`,
    factsTable(report),
    summary(report),
    list('Varningar', warnings),
    list('Nycklar som stavas olika', keyWarnings),
    changes(report),
    '<footer>Skapad med FHIR Profile Review Assistant. Ändringarna är framtagna deterministiskt, utan AI.</footer>',
    '</body></html>',
  ].join('\n')
}
