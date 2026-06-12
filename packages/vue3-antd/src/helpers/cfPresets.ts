import type { CfCellConditionOp, CfCellStyle } from '@speed-sheet/extension-conditional-format'

export const DEFAULT_CF_CELL_STYLE: CfCellStyle = {
  bg: '#ffc7ce',
  fc: '#9c0006',
}

export const CF_CELL_OP_OPTIONS: { key: CfCellConditionOp; labelKey: string }[] = [
  { key: 'greaterThan', labelKey: 'conditionalFormat.op.greaterThan' },
  { key: 'lessThan', labelKey: 'conditionalFormat.op.lessThan' },
  { key: 'between', labelKey: 'conditionalFormat.op.between' },
  { key: 'equal', labelKey: 'conditionalFormat.op.equal' },
  { key: 'textContains', labelKey: 'conditionalFormat.op.textContains' },
]

export type CfDataBarPreset = {
  id: string
  color: string
  gradient: boolean
  labelKey: string
}

export const CF_DATA_BAR_GRADIENT_PRESETS: CfDataBarPreset[] = [
  { id: 'g-blue', color: '#5b9bd5', gradient: true, labelKey: 'conditionalFormat.color.blue' },
  { id: 'g-green', color: '#63c384', gradient: true, labelKey: 'conditionalFormat.color.green' },
  { id: 'g-orange', color: '#f4b084', gradient: true, labelKey: 'conditionalFormat.color.orange' },
  { id: 'g-yellow', color: '#ffd966', gradient: true, labelKey: 'conditionalFormat.color.yellow' },
  { id: 'g-red', color: '#f8696b', gradient: true, labelKey: 'conditionalFormat.color.red' },
  { id: 'g-cyan', color: '#4bacc6', gradient: true, labelKey: 'conditionalFormat.color.cyan' },
]

export const CF_DATA_BAR_SOLID_PRESETS: CfDataBarPreset[] = [
  { id: 's-blue', color: '#5b9bd5', gradient: false, labelKey: 'conditionalFormat.color.blue' },
  { id: 's-green', color: '#63c384', gradient: false, labelKey: 'conditionalFormat.color.green' },
  { id: 's-orange', color: '#f4b084', gradient: false, labelKey: 'conditionalFormat.color.orange' },
  { id: 's-yellow', color: '#ffd966', gradient: false, labelKey: 'conditionalFormat.color.yellow' },
  { id: 's-red', color: '#f8696b', gradient: false, labelKey: 'conditionalFormat.color.red' },
  { id: 's-cyan', color: '#4bacc6', gradient: false, labelKey: 'conditionalFormat.color.cyan' },
]
