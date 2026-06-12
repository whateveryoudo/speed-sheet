import type { CfRule } from './types'
import { formatRangeA1 } from './range'

const OP_LABEL: Record<string, string> = {
  greaterThan: '大于',
  lessThan: '小于',
  equal: '等于',
  between: '介于',
  textContains: '文本包含',
}

export function formatCfRuleLabel(rule: CfRule): string {
  if (rule.type === 'dataBar') return '数据条'
  const op = OP_LABEL[rule.conditionOp ?? 'equal'] ?? rule.conditionOp ?? ''
  const v = rule.conditionValue ?? ''
  if (rule.conditionOp === 'between') {
    return `数值 ${op} ${v} 和 ${rule.conditionValue2 ?? ''}`
  }
  return `数值 ${op} ${v}`
}

export function formatCfRuleRange(rule: CfRule): string {
  return formatRangeA1(rule.row, rule.column)
}
