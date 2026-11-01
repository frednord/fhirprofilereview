export {
  compareResources,
  describeWarning,
  inspectInput,
  type CompareOutcome,
  type CompareSettings,
  type Comparison,
  type InputStatus,
} from './compareResources'
export { describeChange, describeChanges, selectProfiles } from './describeChanges'
export { formatValue } from './formatValue'
export { CHANGE_KINDS, countChanges, filterByKind, formatCounts, formatKindCount, type ChangeCounts } from './summarizeChanges'
export type { ChangeDescription, DescriptionSource, ItemCondition, LabelSet, ProfileLabels, SliceLabel } from './types'
