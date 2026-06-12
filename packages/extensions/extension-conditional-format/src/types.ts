import type { CellAttributes } from '@speed-sheet/shared'

export const CF_EXTENSION_NAME = 'conditionalFormat'

export type CfRuleType = 'cell' | 'dataBar'

export type CfCellConditionOp =
  | 'greaterThan'
  | 'lessThan'
  | 'equal'
  | 'between'
  | 'textContains'

export type CfCellStyle = Partial<Pick<CellAttributes, 'bg' | 'fc' | 'bl' | 'it' | 'un'>>

export type CfDataBarBoundType = 'min' | 'max' | 'num' | 'percent'

export type CfDataBarStyle = {
  color: string
  gradient?: boolean
  minType: CfDataBarBoundType
  maxType: CfDataBarBoundType
  minValue?: string
  maxValue?: string
}

export type CfRule = {
  id: string
  type: CfRuleType
  row: [number, number]
  column: [number, number]
  conditionOp?: CfCellConditionOp
  conditionValue?: string
  conditionValue2?: string
  style?: CfCellStyle
  dataBar?: CfDataBarStyle
}

export type ConditionalFormatExtensionStorage = {
  rules: CfRule[]
  _activeSheetId: string
  _sheet: import('@speed-sheet/core').Sheet | null
  _unbindYdoc: (() => void) | null
}

export type CfCellRenderStyle = CfCellStyle

export type CfDataBarRender = {
  ratio: number
  color: string
  gradient?: boolean
}
