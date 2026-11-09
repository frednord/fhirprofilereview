import type { ChangeKind } from '../../core/diff'
import {
  buildReviewReport,
  renderReportHtml,
  renderReportMarkdown,
  reportFileName,
  type Comparison,
} from '../../core/reporting'
import { downloadTextFile } from '../../utils/downloadTextFile'
import { printHtmlDocument } from '../../utils/printHtmlDocument'

interface ReportExportProps {
  comparison: Comparison
  hiddenPath: string
  shownKinds: ReadonlySet<ChangeKind>
}

const BUTTON = 'rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100'

/** Exports what the page shows: the report is built from the same comparison and filter. */
export function ReportExport({ comparison, hiddenPath, shownKinds }: ReportExportProps) {
  const build = () => buildReviewReport(comparison, { kinds: shownKinds, hiddenPath, createdAt: new Date() })

  const downloadMarkdown = (): void => {
    const report = build()
    downloadTextFile(`${reportFileName(report)}.md`, renderReportMarkdown(report), 'text/markdown')
  }

  const printPdf = (): void => {
    const report = build()
    // The document title becomes the suggested file name when saving as PDF.
    printHtmlDocument(renderReportHtml(report, reportFileName(report)))
  }

  return (
    <div role="group" aria-label="Exportera granskningsrapport" className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
      <span className="font-medium">Exportera rapport:</span>
      <button type="button" onClick={downloadMarkdown} className={BUTTON}>
        Markdown
      </button>
      <button type="button" onClick={printPdf} className={BUTTON} title="Öppnar utskrift, välj Spara som PDF">
        PDF
      </button>
    </div>
  )
}
