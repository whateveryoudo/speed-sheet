/** 筛选扩展名（与 vue3-antd SheetFilter 一致） */
export const FILTER_EXTENSION_NAME = 'sheetFilter'

/** 空值在按内容筛选中的键 */
export const FILTER_EMPTY_VALUE = '__empty__'

export type FilterSortOrder = 'asc' | 'desc' | null

export type FilterTab = 'content' | 'color' | 'condition'

/** 无填充 / 默认色在按颜色筛选中的键 */
export const FILTER_COLOR_NONE = '__color_none__'

export type FilterColorDimension = 'bg' | 'fc'

/** 单列按内容筛选 */
export interface FilterContentRule {
  mode: 'content'
  /** 允许通过的值；含 FILTER_EMPTY_VALUE 表示允许空单元格 */
  selectedValues: string[]
}

/** 单列按颜色筛选 */
export interface FilterColorRule {
  mode: 'color'
  /** 当前面板选中的维度（背景 / 文字） */
  dimension: FilterColorDimension
  selectedBg: string[]
  selectedFc: string[]
}

export type FilterMode = 'content' | 'color' | 'condition'

export type FilterConditionTypeTab = 'text' | 'number' | 'date' | 'common'

/** 通用值条件（重复 / 唯一 / 空 / 非空） */
export type CommonConditionOp = 'duplicate' | 'unique' | 'empty' | 'nonEmpty'

export type FilterConditionConnector = 'and' | 'or'

export type TextConditionOp =
  | 'startsWith'
  | 'notStartsWith'
  | 'endsWith'
  | 'notEndsWith'
  | 'contains'
  | 'notContains'

export type NumberConditionOp = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'between'

export type DateConditionPreset =
  | 'yesterday'
  | 'today'
  | 'tomorrow'
  | 'last7'
  | 'lastWeek'
  | 'thisWeek'
  | 'nextWeek'
  | 'lastMonth'
  | 'thisMonth'
  | 'nextMonth'

export interface FilterConditionClause {
  type: FilterConditionTypeTab
  operator: string
  value: string
  /** 数值「介于」时的右边界 */
  valueRight?: string
  /** 与下一条条件的连接符 */
  connector?: FilterConditionConnector
}

export interface FilterConditionRule {
  mode: 'condition'
  typeTab: FilterConditionTypeTab
  clauses: FilterConditionClause[]
}

export interface FilterColumnRule {
  column: number
  /** 确定后生效的筛选方式 */
  filterMode: FilterMode
  content?: FilterContentRule
  color?: FilterColorRule
  condition?: FilterConditionRule
  sort?: FilterSortOrder
}

export interface FilterColorStat {
  value: string
  label: string
  /** CSS 颜色，无填充为 transparent */
  color: string
  count: number
}

/** 一次筛选会话（全局只允许一份） */
export interface FilterSession {
  active: boolean
  /** 参与筛选的列（有序） */
  columns: number[]
  /** 数据区起始行（0-based，含） */
  dataStartRow: number
  /** 数据区结束行（0-based，含） */
  dataEndRow: number
  /** 表头行；单格截断时为 null（不含第 0 行表头） */
  headerRow: number | null
  /** 展示用，如 "2:16" */
  rangeLabel: string
  /** 是否为单格点选（非框选） */
  singleCell?: boolean
  columnRules: FilterColumnRule[]
  /** 筛选对所有人可见（预留协作；默认 false = 仅当前用户视图） */
  visibleToAll: boolean
}

export interface FilterValueStat {
  value: string
  label: string
  count: number
}

export interface FilterExtensionStorage {
  session: FilterSession | null
  hiddenRows: Set<number>
  _activeSheetId: string
  _sheet: import('@speed-sheet/core').Sheet | null
  _unbindYdoc: (() => void) | null
  _getUserId?: () => string
}

export function emptyFilterSession(): FilterSession {
  return {
    active: false,
    columns: [],
    dataStartRow: 1,
    dataEndRow: 0,
    headerRow: null,
    rangeLabel: '',
    columnRules: [],
    visibleToAll: false,
  }
}
