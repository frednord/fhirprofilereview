import { useEffect, useMemo, useState } from 'react'
import { HVO_LABELS } from '../core/profiles/hvo/0.5.1'
import { HVO_IG_MANIFEST } from '../core/profiles/hvoManifest'
import type { ChangeKind } from '../core/diff'
import {
  CHANGE_KINDS,
  compareResources,
  HIDE_LAST_UPDATED_BY_DEFAULT,
  inspectInput,
  LAST_UPDATED_PATH,
  type CompareOutcome,
  type InputStatus,
} from '../core/reporting'

interface Snapshot {
  before: string
  after: string
}

export interface ComparisonState {
  beforeText: string
  afterText: string
  beforeStatus: InputStatus
  afterStatus: InputStatus
  hideLastUpdated: boolean
  canCompare: boolean
  outcome: CompareOutcome | undefined
  /** Change kinds shown in the summary. Kept across comparisons, since it is the user's own choice. */
  shownKinds: ReadonlySet<ChangeKind>
  /** True when an input was edited after the shown result was made. */
  stale: boolean
  setBeforeText: (text: string) => void
  setAfterText: (text: string) => void
  setHideLastUpdated: (hide: boolean) => void
  toggleKind: (kind: ChangeKind) => void
  compare: () => void
  swap: () => void
  load: (before: string, after: string) => void
}

/**
 * Page state for the comparison. The comparison only runs on compare(), not on
 * every keystroke, so the result does not jump while the user is typing.
 * Toggling the hide setting re-runs on the inputs that were compared.
 */
export function useComparison(): ComparisonState {
  const [beforeText, setBeforeText] = useState('')
  const [afterText, setAfterText] = useState('')
  const [hideLastUpdated, setHideLastUpdated] = useState(HIDE_LAST_UPDATED_BY_DEFAULT)
  const [snapshot, setSnapshot] = useState<Snapshot | undefined>(undefined)
  const [shownKinds, setShownKinds] = useState<ReadonlySet<ChangeKind>>(() => new Set(CHANGE_KINDS))

  const beforeStatus = useMemo(() => inspectInput(beforeText), [beforeText])
  const afterStatus = useMemo(() => inspectInput(afterText), [afterText])

  const outcome = useMemo(() => {
    if (snapshot === undefined) return undefined
    return compareResources(snapshot.before, snapshot.after, {
      labels: HVO_LABELS,
      ig: HVO_IG_MANIFEST,
      ignorePaths: hideLastUpdated ? [LAST_UPDATED_PATH] : [],
    })
  }, [snapshot, hideLastUpdated])

  useEffect(() => {
    // Only the error message is logged, never the pasted resources.
    if (outcome?.ok === false && outcome.reason === 'internal-error') console.error(outcome.detail)
  }, [outcome])

  const run = (before: string, after: string): void => {
    setSnapshot({ before, after })
  }

  const toggleKind = (kind: ChangeKind): void => {
    setShownKinds((current) => {
      const next = new Set(current)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  return {
    beforeText,
    afterText,
    beforeStatus,
    afterStatus,
    hideLastUpdated,
    canCompare: beforeStatus.ok && afterStatus.ok,
    outcome,
    shownKinds,
    stale: snapshot !== undefined && (snapshot.before !== beforeText || snapshot.after !== afterText),
    setBeforeText,
    setAfterText,
    setHideLastUpdated,
    toggleKind,
    compare: () => run(beforeText, afterText),
    swap: () => {
      setBeforeText(afterText)
      setAfterText(beforeText)
    },
    load: (before, after) => {
      setBeforeText(before)
      setAfterText(after)
      run(before, after)
    },
  }
}
