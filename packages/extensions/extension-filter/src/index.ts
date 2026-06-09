export {
  FilterExtension,
  getFilterExtensionStorage,
  getFilterSession,
  isFilterActive,
  hasFilterSession,
  getFilterMarkerRow,
  isFilterHeaderCell,
  prepareFilterScope,
  clearFilter,
  dismissPendingFilter,
  applyFilterSession,
  resolveFilterScopeFromSelection,
} from './extension'
export { FILTER_EXTENSION_NAME } from './types'
export type { FilterExtensionStorage } from './types'
export {
  FILTER_EMPTY_VALUE,
  FILTER_COLOR_NONE,
  emptyFilterSession,
  type FilterSession,
  type FilterColumnRule,
  type FilterContentRule,
  type FilterColorRule,
  type FilterColorStat,
  type FilterColorDimension,
  type FilterConditionRule,
  type FilterConditionClause,
  type FilterConditionTypeTab,
  type FilterConditionConnector,
  type CommonConditionOp,
  type TextConditionOp,
  type NumberConditionOp,
  type DateConditionPreset,
  type FilterMode,
  type FilterValueStat,
  type FilterSortOrder,
  type FilterTab,
} from './types'
export { resolveFilterScope, filterScopeToSelection, type ResolvedFilterScope } from './range'
export {
  collectColumnValueStats,
  computeHiddenRows,
  buildInitialColumnRules,
  defaultSelectedValues,
} from './evaluate'
export { cellValueText, filterValueKey, filterValueLabel, isCellEmpty } from './cell-value'
export {
  collectColumnColorStats,
  detectColumnColorAvailability,
  colorStatDisplay,
  defaultSelectedColor,
  type ColumnColorAvailability,
} from './color'
export {
  TEXT_CONDITION_OPS,
  NUMBER_CONDITION_OPS,
  DATE_CONDITION_PRESETS,
  COMMON_CONDITION_OPS,
  CONDITION_TYPE_OPTIONS,
  defaultOperatorForType,
  needsRightValue,
  needsValueInput,
  operatorsForType,
} from './condition-meta'
export {
  buildInitialConditionRule,
  createDefaultConditionClause,
  datePresetRange,
} from './condition'
export type { GetFilterUserId } from './user-id'
export { FILTER_YDOC_KEY, FILTER_PRIVATE_YDOC_KEY } from './persist'
