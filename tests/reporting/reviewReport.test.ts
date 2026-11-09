import { describe, expect, it } from 'vitest'
import type { ChangeKind } from '../../src/core/diff'
import { HVO_LABELS } from '../../src/core/profiles/hvo/0.5.1'
import { HVO_IG_MANIFEST } from '../../src/core/profiles/hvoManifest'
import {
  buildReviewReport,
  CHANGE_KINDS,
  compareResources,
  escapeHtml,
  escapeMarkdown,
  formatReportTime,
  renderReportHtml,
  renderReportMarkdown,
  reportFileName,
  type Comparison,
  type ReportOptions,
} from '../../src/core/reporting'
import { DEMO_AFTER, DEMO_BEFORE, demoText } from '../../src/pages/demoExample'
import { loadFixture, rawFixture } from '../helpers/hvoFixtures'

const UNIT = 'organization-11aa1f8f-b5df-4e2d-97b8-15320352ac85.json'
const ALL: ReadonlySet<ChangeKind> = new Set(CHANGE_KINDS)
const CREATED = new Date(2026, 10, 9, 12, 5)

function compare(before: string, after: string): Comparison {
  const outcome = compareResources(before, after, { labels: HVO_LABELS, ig: HVO_IG_MANIFEST, ignorePaths: ['meta.lastUpdated'] })
  if (!outcome.ok) throw new Error('Jämförelsen misslyckades')
  return outcome.comparison
}

function options(kinds: ReadonlySet<ChangeKind> = ALL): ReportOptions {
  return { kinds, hiddenPath: 'meta.lastUpdated', createdAt: CREATED }
}

const demo = compare(demoText(DEMO_BEFORE), demoText(DEMO_AFTER))

describe('buildReviewReport', () => {
  it('includes every change of the comparison, numbered in page order', () => {
    const report = buildReviewReport(demo, options())
    expect(report.entries).toHaveLength(demo.descriptions.length)
    expect(report.entries.map((entry) => entry.number)).toEqual(demo.descriptions.map((_, i) => i + 1))
    expect(report.entries.map((entry) => entry.text)).toEqual(demo.descriptions.map((d) => d.text))
    expect(report.selection).toBe('Alla ändringstyper')
    expect(report.selectionNote).toBeUndefined()
  })

  it('names both resources, the IG and the profiles used', () => {
    const report = buildReviewReport(demo, options())
    expect(report.before).toEqual({ resourceType: 'Organization', id: '11aa1f8f-b5df-4e2d-97b8-15320352ac85' })
    expect(report.ig).toBe('se.electronichealth.fhir.hvo.r5@0.5.1')
    expect(report.profiles.length).toBeGreaterThan(0)
    expect(report.createdAt).toBe('2026-11-09 12:05')
  })

  it('follows the kind filter and says that changes were left out', () => {
    const report = buildReviewReport(demo, options(new Set<ChangeKind>(['changed'])))
    expect(report.entries.every((entry) => entry.kind === 'changed')).toBe(true)
    expect(report.entries[0]?.number).toBe(1)
    expect(report.selection).toBe('Ändrade')
    expect(report.selectionNote).toMatch(/^Visar \d+ av \d+ ändringar\.$/)
  })

  it('gives every entry an id that is unique and the same on a new run', () => {
    const ids = buildReviewReport(demo, options()).entries.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(buildReviewReport(demo, options()).entries.map((entry) => entry.id)).toEqual(ids)
  })

  it('says when the resources are equal', () => {
    const report = buildReviewReport(compare(rawFixture(UNIT), rawFixture(UNIT)), options())
    expect(report.entries).toEqual([])
    expect(report.summary).toBe('Inga skillnader')
    expect(report.equalNote).toBe('Resurserna är lika.')
  })
})

describe('formatReportTime and reportFileName', () => {
  it('pads the local date and time', () => {
    expect(formatReportTime(new Date(2026, 0, 2, 3, 4))).toBe('2026-01-02 03:04')
  })

  it('builds a safe file name from the resource', () => {
    expect(reportFileName(buildReviewReport(demo, options()))).toBe(
      'granskningsrapport-Organization-11aa1f8f-b5df-4e2d-97b8-15320352ac85-2026-11-09',
    )
    const hostile = compare(
      JSON.stringify({ resourceType: 'Organization', id: '../../etc/passwd' }),
      JSON.stringify({ resourceType: 'Organization', id: '../../etc/passwd', name: 'x' }),
    )
    expect(reportFileName(buildReviewReport(hostile, options()))).toBe('granskningsrapport-Organization-.._.._etc_passwd-2026-11-09')
  })
})

describe('escapeMarkdown', () => {
  it('keeps formatting and HTML in values from turning into markup', () => {
    expect(escapeMarkdown('Namn ändrades till ”*x* <b>|</b>”')).toBe('Namn ändrades till ”\\*x\\* \\<b\\>\\|\\</b\\>”')
  })

  it('escapes a block marker at the start but leaves dates readable', () => {
    expect(escapeMarkdown('# rubrik')).toBe('\\# rubrik')
    expect(escapeMarkdown('1. punkt')).toBe('1\\. punkt')
    expect(escapeMarkdown('Från 2026-11-09')).toBe('Från 2026-11-09')
  })

  it('keeps everything on one line', () => {
    expect(escapeMarkdown('a\nb\r\nc')).toBe('a b c')
  })
})

describe('renderReportMarkdown', () => {
  it('has the facts, summary and a table row per change', () => {
    const report = buildReviewReport(demo, options())
    const markdown = renderReportMarkdown(report)
    expect(markdown).toMatch(/^# Granskningsrapport\n/)
    expect(markdown).toContain('| Före | Organization/11aa1f8f-b5df-4e2d-97b8-15320352ac85 |')
    expect(markdown).toContain('| Implementationsguide | se.electronichealth.fhir.hvo.r5@0.5.1 |')
    expect(markdown).toContain('## Sammanfattning')
    expect(markdown).toContain('| Nr | Typ | Ändring | Sökväg |')
    const rows = markdown.split('\n').filter((line) => /^\| \d+ \|/.test(line))
    expect(rows).toHaveLength(report.entries.length)
  })

  it('keeps hostile values inside their table cell', () => {
    const hostile = compare(
      JSON.stringify({ ...loadFixture(UNIT), name: 'a' }),
      JSON.stringify({ ...loadFixture(UNIT), name: 'b | c\n<script>' }),
    )
    const markdown = renderReportMarkdown(buildReviewReport(hostile, options()))
    const row = markdown.split('\n').find((line) => line.startsWith('| 1 |'))
    expect(row).toBe('| 1 | Ändrad | Namn ändrades från ”a” till ”b \\| c \\<script\\>” | `name` |')
  })

  it('lists key warnings whatever the filter', () => {
    const before = JSON.stringify({ ...loadFixture(UNIT), extension: [{ url: 'x', valuePeriod: { start: '2020' } }] })
    const after = JSON.stringify({ ...loadFixture(UNIT), extension: [{ url: 'x', ValuePeriod: { start: '2020' } }] })
    const markdown = renderReportMarkdown(buildReviewReport(compare(before, after), options(new Set())))
    expect(markdown).toContain('## Nycklar som stavas olika')
    expect(markdown).toContain('Nyckeln skrivs "valuePeriod" i Före men "ValuePeriod" i Efter.')
  })

  it('is the same for the same input', () => {
    const report = buildReviewReport(demo, options())
    expect(renderReportMarkdown(report)).toBe(renderReportMarkdown(buildReviewReport(demo, options())))
  })
})

describe('renderReportHtml', () => {
  it('escapes every value from the resources', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe('&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;')
    const hostile = compare(
      JSON.stringify({ ...loadFixture(UNIT), name: 'a' }),
      JSON.stringify({ ...loadFixture(UNIT), name: '<script>alert(1)</script>' }),
    )
    const html = renderReportHtml(buildReviewReport(hostile, options()))
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('is a complete Swedish document with one row per change', () => {
    const report = buildReviewReport(demo, options())
    const html = renderReportHtml(report, 'filnamn')
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain('<html lang="sv">')
    expect(html).toContain('<title>filnamn</title>')
    const doc = new DOMParser().parseFromString(html, 'text/html')
    expect(doc.querySelectorAll('table.changes tbody tr')).toHaveLength(report.entries.length)
  })
})
