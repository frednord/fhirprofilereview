export {
  compareResources,
  describeWarning,
  HIDE_LAST_UPDATED_BY_DEFAULT,
  LAST_UPDATED_PATH,
  inspectInput,
  type CompareOutcome,
  type CompareSettings,
  type Comparison,
  type InputStatus,
} from './compareResources'
export { describeChange, describeChanges, selectProfiles } from './describeChanges'
export { formatValue } from './formatValue'
export {
  CHANGE_KINDS,
  countChanges,
  filterByKind,
  formatCounts,
  formatHiddenNote,
  formatKindCount,
  formatShownNote,
  KIND_FILTER_LABELS,
  KIND_LABELS,
  type ChangeCounts,
} from './summarizeChanges'
export type { ChangeDescription, DescriptionSource, ItemCondition, LabelSet, ProfileLabels, SliceLabel } from './types'
