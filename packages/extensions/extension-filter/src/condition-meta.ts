import type {
  CommonConditionOp,
  DateConditionPreset,
  FilterConditionTypeTab,
  NumberConditionOp,
  TextConditionOp,
} from './types'

export const COMMON_CONDITION_OPS: { value: CommonConditionOp; label: string }[] = [
  { value: 'duplicate', label: '重复值' },
  { value: 'unique', label: '唯一值' },
  { value: 'empty', label: '空值' },
  { value: 'nonEmpty', label: '非空值' },
]

export const TEXT_CONDITION_OPS: { value: TextConditionOp; label: string }[] = [
  { value: 'startsWith', label: '开头是' },
  { value: 'notStartsWith', label: '开头不是' },
  { value: 'endsWith', label: '结尾是' },
  { value: 'notEndsWith', label: '结尾不是' },
  { value: 'contains', label: '包含' },
  { value: 'notContains', label: '不包含' },
]

export const NUMBER_CONDITION_OPS: { value: NumberConditionOp; label: string }[] = [
  { value: 'eq', label: '等于' },
  { value: 'ne', label: '不等于' },
  { value: 'gt', label: '大于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lt', label: '小于' },
  { value: 'lte', label: '小于等于' },
  { value: 'between', label: '介于' },
]

export const DATE_CONDITION_PRESETS: { value: DateConditionPreset; label: string }[] = [
  { value: 'yesterday', label: '昨天' },
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'last7', label: '最近7天' },
  { value: 'lastWeek', label: '上周' },
  { value: 'thisWeek', label: '本周' },
  { value: 'nextWeek', label: '下周' },
  { value: 'lastMonth', label: '上月' },
  { value: 'thisMonth', label: '本月' },
  { value: 'nextMonth', label: '下月' },
]

/** 条件「字段类型」选项（面板 a-select，便于后续扩展） */
export const CONDITION_TYPE_OPTIONS: { value: FilterConditionTypeTab; label: string }[] = [
  { value: 'text', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'common', label: '值' },
]

export function defaultOperatorForType(type: FilterConditionTypeTab): string {
  if (type === 'text') return 'contains'
  if (type === 'number') return 'eq'
  if (type === 'date') return 'today'
  return 'duplicate'
}

export function needsRightValue(type: FilterConditionTypeTab, operator: string): boolean {
  return type === 'number' && operator === 'between'
}

/** 当前条件是否需要用户输入比较值 */
export function needsValueInput(type: FilterConditionTypeTab): boolean {
  return type !== 'common' && type !== 'date'
}

export function operatorsForType(type: FilterConditionTypeTab) {
  if (type === 'text') return TEXT_CONDITION_OPS
  if (type === 'number') return NUMBER_CONDITION_OPS
  if (type === 'date') return DATE_CONDITION_PRESETS
  return COMMON_CONDITION_OPS
}
