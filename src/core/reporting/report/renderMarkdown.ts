import { formatResourceRef } from './buildReport'
import type { ReportEntry, ReviewReport } from './types'

/**
 * Escapes text from the resources for Markdown, so a value like "*" or
 * "<script>" is shown as written and never becomes formatting or HTML. Only
 * characters that mean something mid-line are escaped, plus a block marker at
 * the start, so dates and sentences stay readable in the raw file.
 */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/\r?\n|\r/g, ' ')
    .replace(/[\\`*_[\]<>|~&]/g, '\\$&')
    .replace(/^(\s*)([#+\-=]|\d+(?=[.)]))/, (_match, space: string, marker: string) =>
      /\d/.test(marker) ? `${space}${marker}\\` : `${space}\\${marker}`,
    )
}

/**
 * A path in a code span. Inside a code span only "|" needs escaping, for the
 * table; a path with a backtick cannot be a code span and is escaped as text.
 */
function codeSpan(text: string): string {
  const flat = text.replace(/\r?\n|\r/g, ' ')
  return flat.includes('`') ? escapeMarkdown(flat) : `\`${flat.replace(/\|/g, '\\|')}\``
}

function row(cells: readonly string[]): string {
  return `| ${cells.join(' | ')} |`
}

function table(header: readonly string[], rows: readonly (readonly string[])[]): string[] {
  return [row(header), row(header.map(() => '---')), ...rows.map(row)]
}

function factsTable(report: ReviewReport): string[] {
  const facts: [string, string][] = [
    ['Före', escapeMarkdown(formatResourceRef(report.before))],
    ['Efter', escapeMarkdown(formatResourceRef(report.after))],
  ]
  if (report.ig !== undefined) facts.push(['Implementationsguide', escapeMarkdown(report.ig)])
  if (report.profiles.length > 0) facts.push(['Profiler', escapeMarkdown(report.profiles.join(', '))])
  facts.push(['Urval', escapeMarkdown(report.selection)])
  facts.push(['Skapad', escapeMarkdown(report.createdAt)])
  return table(['Uppgift', 'Värde'], facts)
}

function notes(report: ReviewReport): string[] {
  const shown = [report.equalNote, report.selectionNote, report.hiddenNote].filter((note) => note !== undefined)
  return shown.length === 0 ? [] : ['', escapeMarkdown(shown.join(' '))]
}

function entryText(entry: ReportEntry): string {
  const text = escapeMarkdown(entry.text)
  return entry.missingLabel ? `${text} *(saknar svensk etikett)*` : text
}

function changesSection(report: ReviewReport): string[] {
  if (report.entries.length === 0) return []
  const rows = report.entries.map((entry) => [String(entry.number), entry.kindLabel, entryText(entry), codeSpan(entry.path)])
  return ['', '## Ändringar', '', ...table(['Nr', 'Typ', 'Ändring', 'Sökväg'], rows)]
}

function warningsSection(report: ReviewReport): string[] {
  if (report.warnings.length === 0) return []
  return ['', '## Varningar', '', ...report.warnings.map((warning) => `- ${escapeMarkdown(warning)}`)]
}

function keyWarningsSection(report: ReviewReport): string[] {
  if (report.keyWarnings.length === 0) return []
  const items = report.keyWarnings.map((warning) => `- ${escapeMarkdown(warning.text)} (${codeSpan(warning.path)})`)
  return ['', '## Nycklar som stavas olika', '', ...items]
}

/** The report as GitHub-flavoured Markdown, which also reads well as plain text. */
export function renderReportMarkdown(report: ReviewReport): string {
  const lines = [
    `# ${escapeMarkdown(report.title)}`,
    '',
    ...factsTable(report),
    '',
    '## Sammanfattning',
    '',
    escapeMarkdown(report.summary),
    ...notes(report),
    ...warningsSection(report),
    ...keyWarningsSection(report),
    ...changesSection(report),
    '',
    '---',
    '',
    'Skapad med FHIR Profile Review Assistant. Ändringarna är framtagna deterministiskt, utan AI.',
    '',
  ]
  return lines.join('\n')
}
